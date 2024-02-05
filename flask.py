from flask import Flask

app = Flask(__name__)

@app.route("/", )
def home():
    return "Hello, World!"

@app.route("/about")
def about():
    return "This is a simple API to demonstrate the use of a machine learning model to trade stocks."