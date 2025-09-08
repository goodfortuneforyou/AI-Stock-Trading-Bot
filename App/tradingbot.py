# lumibot is a trading library that allows you to backtest and trade stocks using a variety of strategies.
# Alpaca is a brokerage that allows you to trade stocks using an API and provides a paper trading environment.
# YahooDataBacktesting is a class that allows you to backtest a strategy using historical stock data from Yahoo Finance.
# This strategy uses finbert_utils to estimate the sentiment of news articles and uses that to determine if it should buy or sell a stock.

from lumibot.strategies.strategy import Strategy
from lumibot.backtesting import YahooDataBacktesting
from datetime import datetime
from timedelta import Timedelta
from alpaca_trade_api import REST
import sys
from finbert_model import estimate_sentiment
import os
from dotenv import load_dotenv
import pandas as pd

# Load in environment variables
from dotenv import load_dotenv
import random



load_dotenv()
# Get environment variables
API_KEY = os.getenv('API_KEY')
API_SECRET = os.getenv('API_SECRET')
BASE_URL = os.getenv('BASE_URL')

# Alpaca credentials
ALPACA_CREDS = {
    "API_KEY": API_KEY,
    "API_SECRET": API_SECRET,
    "PAPER": True
}
BENCHMARK_ASSET = None
random_positive_file_name = None

class BotStrategy(Strategy): 
    
    # Initialize the strategy and create random file to write the news to
    def initialize(self):
        self.sleeptime = "1D"
        self.api = REST(base_url=BASE_URL, key_id=API_KEY, secret_key=API_SECRET)
        self.last_trade = None
        with open("file.txt", "r") as f:
            lines = f.readlines()
            BENCHMARK_ASSET = lines[-1].strip()
        self.symbol = BENCHMARK_ASSET
        with open("random_positive_file.txt", "r") as f:
            random_positive_file_name = f.readline()
            print("random_positive_file_name", random_positive_file_name)
        self.random_positive_file_name = random_positive_file_name
        print("self.symbol", self.symbol)   


    def get_dates(self):
        today = self.get_datetime()
        three_days_prior = today - Timedelta(days=3)
        return today.strftime("%Y-%m-%d"), three_days_prior.strftime("%Y-%m-%d")
    
    # after you have gotten the dates feed them into the machine learning model and write the articles to a file
    def get_sentiment(self):
        today, three_days_prior = self.get_dates()
        news = self.api.get_news(symbol=self.symbol, start=three_days_prior, end=today)
        news_data = []
        for ev in news:
            headline = ev.__dict__["_raw"]["headline"]
            url = ev.__dict__["_raw"]["url"]
            news_data.append((headline, url))
        news_headlines = [headline for headline, _ in news_data]
        probability, sentiment = estimate_sentiment(news_headlines)
        if probability > 0.999 and sentiment != "neutral":
            with open(str(self.random_positive_file_name +".csv"), "a") as f:
                for headline, url in news_data:
                    formatted_headline = headline.replace(",", "")
                    f.write(f"{formatted_headline},{url},{sentiment}\n")

        return probability, sentiment

    def on_trading_iteration(self):
        # get the last price for the symbol
        last_price = self.get_last_price(self.symbol)
        quantity = self.cash // last_price
        probability, sentiment = self.get_sentiment()
        if self.cash > last_price:
            # if the sentiment is positive and the probability for gain is high, buy the stock and sell all if the last trade was a sell
            if sentiment == "positive" and probability > 0.999:
                if self.last_trade == "sell":
                    self.sell_all()
                order = self.create_order(self.symbol, quantity, "buy")
                self.submit_order(order)
                self.last_trade = "buy"
            
            #if the news indicates a negative sentiment and the probability for loss is high, sell the stock and buy all if the last trade was a buy
            elif sentiment == "negative" and probability > 0.999:
                if self.last_trade == "buy":
                    self.sell_all()
                order = self.create_order(self.symbol, quantity, "sell")
                self.submit_order(order)
                self.last_trade = "sell"


