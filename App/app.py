from flask import Flask, jsonify, session, request
from flask_cors import CORS
from flask_pymongo import PyMongo
from bson import ObjectId
from flask import Flask, jsonify, request
from dotenv import load_dotenv
import bcrypt
import os
from flask_session import Session


load_dotenv()

MONGO_URI = os.getenv('MONGO_URI')
print(MONGO_URI)

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config["MONGO_URI"] = MONGO_URI
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY') 
app.config['SESSION_TYPE'] = 'filesystem'

mongo = PyMongo(app)
Session(app)

users = mongo.db.users

@app.route('/session', methods=['POST'])
def login_user():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        user = mongo.db.users.find_one({'email': email})
        if user:
            if bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
                # set the session user_id to the user's id and return the user
                session['user_id'] = str(user['_id'])
                user['_id'] = str(user['_id'])
                return jsonify({'message': 'authenticated', 'user': user}), 201
            else:
                return jsonify({'error': 'Invalid password'}), 401
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/session', methods=['GET'])
def get_session():
    try:
        if 'user_id' in session:
            user = users.find_one({'_id': ObjectId(session['user_id'])})
            user['_id'] = str(user['_id'])
            return jsonify(user), 200
        else:
            return jsonify({'error': 'user session does not exist'}), 401
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
    if 'user_id' in session:
        user = mongo.db.users.find_one({'_id': ObjectId(session['user_id'])})
        if user:
            user['_id'] = str(user['_id'])
            return jsonify({'user': user}), 200
    return jsonify({'error': 'No user logged in'}), 401


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
        }
        inserted_user = mongo.db.users.insert_one(new_user)
        user_id = inserted_user.inserted_id
        new_user['_id'] = str(user_id) 
        return jsonify(new_user), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/users/<string:id>', methods=['PUT'])
def update_user(id):
    try:
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        user = users.find_one({'_id': ObjectId(id)})
        if user:
            query = {'_id': ObjectId(id)}
            new_values = {'$set': {
                'name': request.json['name'],
                'email': request.json['email'],
                'password': request.json['password'],
                'symbols': request.json['symbols']
            }}
            users.update_one(query, new_values)
            user = users.find_one({'_id': ObjectId(id)})
            user['_id'] = str(user['_id'])
            return jsonify(user), 200
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/users/<string:id>/investments',)
def get_investments(id):
    try:
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        user = mongo.db.users.find_one({'_id': ObjectId(id)})
        if user:
            user['_id'] = str(user['_id'])
            return jsonify(user['investments']), 200
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    
@app.route('/users/<string:id>/preferences')
def get_preferences(id):
    try:
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        user = mongo.db.users.find_one({'_id': ObjectId(id)})
        if user:
            user['_id'] = str(user['_id'])
            return jsonify(user['preferences']), 200
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
