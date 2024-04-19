import sys
sys.path.append('./backend')
import json
from flask import send_file
from flask import Flask, jsonify, session, request
from flask_cors import CORS
from flask_pymongo import PyMongo
from bson import ObjectId
from flask import Flask, jsonify, request
from dotenv import load_dotenv
import bcrypt
import os
from subprocess import Popen, PIPE
from flask_session import Session
import logging
# from apscheduler.schedulers.background import BackgroundScheduler
# from backend.tradingbot import BotStrategy
# from datetime import datetime, timedelta
# from lumibot.backtesting import YahooDataBacktesting
# from alpaca_trade_api import REST


load_dotenv()

MONGO_URI = os.getenv('MONGO_URI')
SECRET_KEY = os.getenv('SECRET_KEY')

API_KEY = os.getenv('API_KEY')
API_SECRET = os.getenv('API_SECRET')
BASE_URL = os.getenv('BASE_URL')

SYMBOLS =[]
AMOUNT = 0


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
app.config["MONGO_URI"] = MONGO_URI
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY') 
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'None'

mongo = PyMongo(app)
Session(app)

# bot = BotStrategy()

users = mongo.db.users

from flask import abort

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
        user['_id'] = str(user['_id'])
        #if first login send first login message and update first login to false
        if user['first_login']:
            user['first_login'] = False
            query = {'_id': ObjectId(user['_id'])}
            new_values = {'$set': {'first_login': False}}
            mongo.db.users.update_one(query, new_values)
            print(session)
            return jsonify({'message': 'First login', 'user': user}), 201
        #not first login send authenticated message
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
            'symbols': {},
            'first_login': True,    
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
        cc = data.get('cc')
        user_id = session['user_id']
        print('User ID:', user_id)  
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        print('User:', user)  
        if user:
            if 'symbols' not in user:
                user['symbols'] = {}
            for symbol, amount in symbols.items():
                user['symbols'][symbol] = amount
            query = {'_id': ObjectId(user_id)}
            new_values = {'$set': {'symbols': user['symbols'], 'cc': cc}}
            mongo.db.users.update_one(query, new_values)
            return jsonify({'message': 'Symbol added successfully'}), 201
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        print('Exception:', e)  
        return jsonify({'error': str(e)}), 500
    

@app.route('/get-csv-stats', methods=['GET'])
def get_csv_stats():
    try:
        return send_file('BotStrategy_2024-04-14_19-11-08_stats.csv')
    except Exception as e:
        print(f"Error while trying to send file: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/get-csv-trades', methods=['GET'])
def get_csv_trades():
    try:
        return send_file('BotStrategy_2024-04-14_19-14-56_trades.csv')
    except Exception as e:
        print(f"Error while trying to send file: {e}")
        return jsonify({'error': str(e)}), 500
    
# @app.route('/get_news', methods=['GET'])
# def get_news():
#     data = request.get_json()
#     symbol = data.get('symbol')
#     bot = BotStrategy()
#     probabilities, sentiments, good_news, bad_news = bot.get_sentiment(symbol)
#     return jsonify({'probabilities': probabilities, 'sentiments': sentiments, 'good_news': good_news, 'bad_news': bad_news})

# def scheduled_trade_execution():
#     users = mongo.db.users.find()
#     for user in users:
#         id = str(user['_id'])
#         symbols = user['symbols']
#         amount = user['amount']
#         start_date = user['start_date']
#         today = datetime.now()
#         execute_trade(symbols, amount, start_date, today)

# scheduler = BackgroundScheduler()
# scheduler.add_job(scheduled_trade_execution, 'interval', days=1)
# scheduler.start()

# @app.route('/users/<string:id>/portfolio', methods=['GET'])
# def get_portfolio():
#     data = request.get_json()
#     id = data.get('id')
#     user = mongo.db.users.find_one({'_id': ObjectId(id)})
#     if user:
#         portfolio = user.get('portfolio')
#         return jsonify({'portfolio': portfolio}), 200
#     else:
#         return jsonify({'error': 'User not found'}), 404

# @app.route('/users/<string:id>/transactions', methods=['GET'])
# def get_transactions():
#     data = request.get_json()
#     id = data.get('id')
#     user = mongo.db.users.find_one({'_id': ObjectId(id)})
#     if user:
#         transactions = user.get('transactions')
#         return jsonify({'transactions': transactions}), 200
#     else:
#         return jsonify({'error': 'User not found'}), 404

# @app.route('/users/<string:id>/execute_trade', methods=['POST'])
# def execute_trade():
#     data = request.get_json()
#     id = data.get('id')
#     user = mongo.db.users.find_one({'_id': ObjectId(id)})
#     if user:
#         symbol = data.get('symbol') 
#         amount = data.get('amount')
#         execute_trade_with_bot(id, symbol, amount)
#         return jsonify({'message': 'Trade executed successfully'}), 200
#     else:
#         return jsonify({'error': 'User not found'}), 404

# @app.route('/get_trades', methods=['GET'])
# def get_trades():
#     trades = bot.get_trades()  # Fetch trades from BotStrategy
#     return jsonify({'trades': trades})

# def execute_trade_with_bot(id, symbol, amount):
#     user = mongo.db.users.find_one({'_id': ObjectId(id)})
#     if user:
#         now = datetime.now()
#         user_start_date = user['start_date']
#         execute_trade(symbol, amount, user_start_date,  now)
#         query = {'_id': ObjectId(id)}
#         user['transactions'].append({'symbols': symbol, 'amount': amount, 'date': now, 'action': 'buy'})
#         new_values = {'$set': {'transactions': user['transactions']}}
#         users.update_one(query, new_values)
#     else:
#         return jsonify({'error': 'User not found'}), 404

# def execute_trade(symbol, amount, start_date, today):
#     bot.initialize(API_KEY, API_SECRET, BASE_URL, cash=amount, symbols=symbol, start_date=start_date)
#     bot.backtest(YahooDataBacktesting, start_date=start_date, end_date=today, benchmark_asset=symbol)

if __name__ == '__main__':
    app.run(debug=True)