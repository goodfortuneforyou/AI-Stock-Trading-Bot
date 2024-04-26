# from apscheduler.schedulers.background import BackgroundScheduler
# from backend.tradingbot import BotStrategy
# from datetime import datetime, timedelta
# from lumibot.backtesting import YahooDataBacktesting
# from alpaca_trade_api import REST
# lumibot is a trading library that allows you to backtest and trade stocks using a variety of strategies.
# Alpaca is a brokerage that allows you to trade stocks using an API and provides a paper trading environment.
# YahooDataBacktesting is a class that allows you to backtest a strategy using historical stock data from Yahoo Finance.
# This strategy uses finbert_utils to estimate the sentiment of news articles and uses that to determine if it should buy or sell a stock.
import sys
sys.path.append('./backend')
from flask import send_file
from flask import Flask, jsonify, session, request
from flask_cors import CORS
from flask_pymongo import PyMongo
from bson import ObjectId
from dotenv import load_dotenv
import bcrypt
from subprocess import PIPE
from flask_session import Session
from lumibot.backtesting import YahooDataBacktesting
from datetime import datetime
from flask import abort
import os
from tradingbot import BotStrategy, BENCHMARK_ASSET
import traceback
from lumibot.backtesting import YahooDataBacktesting
from datetime import timedelta
import threading
from multiprocessing import Process
import glob
import random

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI')
SECRET_KEY = os.getenv('SECRET_KEY')

API_KEY = os.getenv('API_KEY')
API_SECRET = os.getenv('API_SECRET')
BASE_URL = os.getenv('BASE_URL')

SYMBOLS =[]
AMOUNT = 0


app = Flask(__name__)

# initialize the database, session, and CORS
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
app.config["MONGO_URI"] = MONGO_URI
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY') 
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'None'

mongo = PyMongo(app)
Session(app)


users = mongo.db.users
def run_backtest(start, end, symbol, user, user_budget):
    #run the backtest with the parameters and write to the trades and stats file with the user id, dates, and symbol
    print('start in run_backtest:', start)  
    print('end in run_backtest:', end)
    end_str = str(end)
    trade_file = str(f"{user}_{end_str}_{symbol}_trades.csv")
    stat_file = str(f"{user}_{end_str}_{symbol}_stats.csv")
    with open(trade_file, 'w') as file:
        pass
    print('symbol:', symbol)
    with open('file.txt', 'w') as f:
        f.write(symbol)

    # write the symbol we are testing to a random file so the bot can read it in
    random_positive_file_name = ''.join(random.choices('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=10))
    print('Random positive file name:', random_positive_file_name)
    with open("random_positive_file.txt", "w") as f:
        f.write(random_positive_file_name)
        
    BotStrategy.backtest(
    YahooDataBacktesting,
    start,
    end,
    stats_file=stat_file,
    budget=user_budget,
    benchmark_asset=symbol,
    trades_file=trade_file,
    )

@app.route('/run_trading_bot', methods=['POST'])
def run_trading_bot_background():
    try:
        if 'user_id' in session:
            user_id = session['user_id']
            user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        if user:
            user['_id'] = str(user['_id'])
            end = user['most_recent_date']
            start = (datetime.now() - timedelta(days=365)).replace(hour=0, minute=0, second=0, microsecond=0)
            passed_id = user['_id']
            for i in range(len(user['symbols'])):
                #run the backtest with start(1 year from now), end(last user login), symbol, user id, and amount
                #run in a process fashion to run multiple backtests at the same time since the bot is single threaded
                p = Process(target=run_backtest, args=(start, end, user['symbols'][i]['symbol']['symbol'], passed_id, user['symbols'][i]['symbol']['amount']))
                p.start()
            return jsonify({'message': 'Bot is running'}), 200
    except Exception as e:
        print('Error:', e)
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/session', methods=['POST'])
def login_user():
    try:
        data = request.get_json()
        if not data or 'email' not in data or 'password' not in data:
            abort(400, "Missing email or password in request")

        email = data['email']
        password = data['password']
        
        user = mongo.db.users.find_one({'email': email})
        if not user:
            abort(404, "User not found")

        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            abort(401, "Invalid password")

        session['user_id'] = str(user['_id'])
        user_id = session['user_id']
        user['_id'] = str(user['_id'])
        user['most_recent_date'] = datetime.now() - timedelta(days=1)
        #if first login send first login message and update first login to false
        if user['first_login']:
            user['first_login'] = False
            query = {'_id': ObjectId(user['_id'])}
            new_values = {'$set': {'first_login': False, 'most_recent_date': user['most_recent_date']}}
            mongo.db.users.update_one(query, new_values)
            print(session)
            return jsonify({'message': 'First login', 'user': user}), 201
        query = {'_id': ObjectId(user['_id'])}
        new_values = {'$set': {'most_recent_date': user['most_recent_date']}}
        mongo.db.users.update_one(query, new_values)
        return jsonify({'message': 'Authenticated', 'user': user}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/session', methods=['DELETE'])
def logout_user():
    try:
        session['user_id'] = None
        session.clear()
        return jsonify({'message': 'Logged out'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/session', methods=['GET'])
def check_user():
    print(session)
    try:
        if 'user_id' in session:
            user_id = session['user_id']
            user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
            if user:
                user['_id'] = str(user['_id'])
                return jsonify({'user': user}), 200
        return jsonify({'error': 'No user logged in'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/users', methods=['POST'])
def create_user():
    try:
        data = request.get_json()
        name = data.get('name')
        birthday = data.get('birthday')
        email = data.get('email')
        password = data.get('password')
        print(name, birthday, email, password)
        # encrypt the password when creating user
        bcrypt_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        if not name or not email or not password or not birthday:
            return jsonify({'error': 'Missing required field(s)'}), 400
        if users.find_one({'email': email}):
            return jsonify({'error': 'Email already exists'}), 400
        new_user = {
            'name': name,
            'email': email,
            'birthday': birthday,
            'password': bcrypt_password,
            'symbols': [],
            'first_login': True,  
            'start_date': None, 
            'most_recent_date': None,
        }
        inserted_user = mongo.db.users.insert_one(new_user)
        user_id = inserted_user.inserted_id
        new_user['_id'] = str(user_id) 
        return jsonify(new_user), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/symbols', methods=['POST'])
def add_symbol():
    try:
        data = request.get_json()
        print('Received data:', data)  
        symbols = data.get('symbols')
        user_id = session['user_id']
        print('User ID:', user_id)  
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        print('User:', user)  
        if user:
            user['symbols'].append({'symbol': symbols})
            user['start_date'] =  datetime.now()- timedelta(days=365)
            user['most_recent_date'] = datetime.now() - timedelta(days=1)
            query = {'_id': ObjectId(user_id)}
            new_values = {'$set': {'symbols': user['symbols'], 'start_date': user['start_date'], 'most_recent_date': user['most_recent_date']}}
            mongo.db.users.update_one(query, new_values)
            return jsonify({'message': 'Symbol added successfully'}), 201
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        print('Exception:', e)  
        return jsonify({'error': str(e)}), 500
    
def get_csv_by_name(name):
    current_directory = os.getcwd()
    for root, dirs, files in os.walk(current_directory):
        for file in files:
            if file == name:
                return os.path.join(root, file)
    return None

@app.route('/get-positive-news', methods=['GET'])
def get_positive_news():
    print('Session:', session)
    # open the file that the bot wrote the news to and send the information to the user
    try:
        if 'user_id' not in session:
            return jsonify({'error': 'User ID not found in session'}), 404
        
        user_id = session['user_id']
        print('User ID:', user_id)
        
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        if user:
            user['_id'] = str(user['_id'])
            with open('random_positive_file.txt', 'r') as file:
                lines = file.readlines()
                if lines:
                    last_line = lines[-1].strip()
                    stats_file = get_csv_by_name(last_line+".csv")
                    if stats_file is None:
                        print('File not found')
                        return jsonify({'error': 'File not found'}), 404
                    return send_file(stats_file), 200
                else:
                    print('No lines found in file')
                    return jsonify({'error': 'No lines found in file'}), 404
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        print(f"Error while trying to send file: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/get-csv-stats', methods=['GET'])
def get_csv_stats():
    print('Session:', session)
    try:
        if 'user_id' not in session:
            return jsonify({'error': 'User ID not found in session'}), 404
        
        user_id = session['user_id']
        print('User ID:', user_id)
        
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        if user:
            # if the user exists try to find the stats file we wrote to
            user['_id'] = str(user['_id'])
            print('most recent date:', user['most_recent_date'], 'Symbols:', user['symbols'][0]['symbol']['symbol'])

            end_name = f"{user['_id']}_{user['most_recent_date']}_{user['symbols'][0]['symbol']['symbol']}_stats.csv"
            print('End name:', end_name)
            stats_file = get_csv_by_name(end_name)
            if stats_file is None:
                return jsonify({'error': 'File not found'}), 404
            return send_file(stats_file), 200
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        print(f"Error while trying to send file: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

def get_most_recent_trades_file(i):
    folder_path = os.path.join(os.getcwd(), '/Users/anjolie/Desktop/SPRING-2024/AI-Stock-Trading-Bot/logs')
    print('Folder path:', folder_path)
    files = []
    # find the most recent trades file in the logs folder
    for file in glob.glob(os.path.join(folder_path, '*_trades.csv')):
        print('File:', file)
        if file.endswith('trades.csv'):
            files.append(file)
    files.sort(key=os.path.getctime, reverse=True)
    return files[i] if files else None

@app.route('/get-csv-trades', methods=['GET'])
def get_csv_trades():
    print('Session:', session)
    try:
        if 'user_id' not in session:
            return jsonify({'error': 'User ID not found in session'}), 404
        
        user_id = session['user_id']        
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        if user:
            user['_id'] = str(user['_id'])
            stats_files = []
            print('len of symbols:', len(user['symbols']))
            for i in range(len(user['symbols'])):
                stats_file = get_most_recent_trades_file(i)
                if stats_file is not None:
                    stats_files.append(stats_file)
            print('Stats files:', stats_files)
            # send the trades file to the user
            if stats_files:
                csv_data = []
                for file in stats_files:
                    with open(file, 'r') as f:
                        csv_data.append(f.read())
                return jsonify({'csv_data': csv_data}), 200
            else:
                return jsonify({'error': 'File not found'}), 404
        else:
            print('User not found')
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        print(f"Error while trying to send file: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/users', methods=['PUT'])
def update_user():
    try:
        # grab the user information in the request and set it in the database
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        birthday = data.get('birthday')
        user_id = session['user_id']
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        if user:
            query = {'_id': ObjectId(user_id)}
            new_values = {'$set': {'name': name, 'email': email, 'birthday': birthday}}
            mongo.db.users.update_one(query, new_values)
            return jsonify({'message': 'User updated successfully'}), 200
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

  
@app.route('/symbols', methods=['DELETE'])
def delete_symbol():
    try:
        # find the symbol and delete it from the user's symbols
        data = request.get_json()
        symbol = data.get('symbol')
        print('Symbol:', symbol)
        user_id = session['user_id']
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        if user:
            print('user symbols:', user['symbols'])
            for item in user['symbols']:
                if item['symbol'] == symbol:
                    user['symbols'].remove(item)
                    query = {'_id': ObjectId(user_id)}
                    new_values = {'$set': {'symbols': user['symbols']}}
                    mongo.db.users.update_one(query, new_values)
                    return jsonify({'message': 'Symbol deleted successfully'}), 204
            print('Symbol not found')
            return jsonify({'error': 'Symbol not found'}), 404
        else:
            print('User not found')
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        print('Exception:', e)
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, threaded=True)

