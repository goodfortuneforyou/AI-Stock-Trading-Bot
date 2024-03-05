from flask import Flask, jsonify
from flask_cors import CORS
from flask_pymongo import PyMongo
from bson import ObjectId
from flask import Flask, jsonify, request
from dotenv import load_dotenv
import os

load_dotenv("info.env")

MONGO_URI = os.getenv('MONGO_URI')

app = Flask(__name__)
CORS(app)
app.config["MONGO_URI"] = MONGO_URI
mongo = PyMongo(app)

users = mongo.db.users

@app.route('/users')
def get_users():
    users = mongo.db.users.find()
    user_list = []
    for user in users:
        user_list.append({
            '_id': str(user['_id']),
            'name': user['name'],
            'email': user['email'],
            'password': user['password'],
            'symbols': user.get('symbols', [])        
            })
        
    return jsonify(user_list)


@app.route('/users/<string:id>')
def get_user(id):
    try:
        user = mongo.db.users.find_one({'_id': ObjectId(id)})
        if user:
            user['_id'] = str(user['_id'])
            return jsonify(user), 200
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500




@app.route('/users', methods=['POST'])
def create_user():
    try:
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        if not name or not email or not password:
            return jsonify({'error': 'Missing required field(s)'}), 400
        new_user = {
            'name': name,
            'email': email,
            'password': password,
            'symbols': []
        }
        inserted_user = mongo.db.users.insert_one(new_user)
        user_id = inserted_user.inserted_id
        new_user['_id'] = str(user_id) 
        return jsonify(new_user), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/users/<string:id>', methods=['DELETE'])
def delete_user(id):
    try:
        result = users.delete_one({'_id': ObjectId(id)})
        if result.deleted_count > 0:
            return jsonify({'message': 'User deleted successfully'}), 200
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/users/<string:id>', methods=['PUT'])
def update_user(id):
    try:
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
    

@app.route('/login', methods=['GET'])
def login():
    try:
        email = request.args.get('email')
        user = users.find_one({'email': email})
        if user:
            return jsonify({'message': 'User exists'}), 200
        else:
            return jsonify({'message': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True)
