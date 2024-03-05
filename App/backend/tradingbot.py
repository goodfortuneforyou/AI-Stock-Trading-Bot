# lumibot is a trading library that allows you to backtest and trade stocks using a variety of strategies.
# Alpaca is a brokerage that allows you to trade stocks using an API and provides a paper trading environment.
# YahooDataBacktesting is a class that allows you to backtest a strategy using historical stock data from Yahoo Finance.
# This strategy uses finbert_utils to estimate the sentiment of news articles and uses that to determine if it should buy or sell a stock.

from lumibot.strategies.strategy import Strategy
from lumibot.backtesting import YahooDataBacktesting
from datetime import datetime
from timedelta import Timedelta
from alpaca_trade_api import REST
from App.backend.finbert_model import estimate_sentiment
import os

# Load in environment variables
from dotenv import load_dotenv
load_dotenv("info.env")

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

class BotStrategy(Strategy):
    
    def initialize(self):
        self.sleeptime = "1D"
        self.api = REST(base_url=BASE_URL, key_id=API_KEY, secret_key=API_SECRET)
        self.last_trade = None

    def get_dates(self):
        today = self.get_datetime()
        three_days_prior = today - Timedelta(days=3)
        return today.strftime("%Y-%m-%d"), three_days_prior.strftime("%Y-%m-%d")

    def get_sentiment(self):
        today, three_days_prior = self.get_dates()
        news = self.api.get_news(symbol=self.symbol, start=three_days_prior, end=today)
        news = [ev.__dict__["_raw"]["headline"] for ev in news]
        probability, sentiment = estimate_sentiment(news)
        return probability, sentiment

    def on_trading_iteration(self):
        symbol = "AMZN"  
        last_price = self.get_last_price(symbol)
        quantity = self.cash // last_price
        self.symbol = symbol
        probability, sentiment = self.get_sentiment()

        if self.cash > last_price:
            # if the sentiment is positive and the probability for gain is high, buy the stock
            if sentiment == "positive" and probability > 0.999:
                if self.last_trade == "sell":
                    self.sell_all()
                order = self.create_order(symbol, quantity, "buy")
                self.submit_order(order)
                self.last_trade = "buy"
            
            #if the news indicates a negative sentiment and the probability for loss is high, sell the stock
            elif sentiment == "negative" and probability > 0.999:
                if self.last_trade == "buy":
                    self.sell_all()
                order = self.create_order(symbol, quantity, "sell")
                self.submit_order(order)
                self.last_trade = "sell"

if __name__ == "__main__":
    start_date = datetime(2022, 1, 1)
    end_date = datetime(2024, 1, 31)
    BotStrategy.backtest(
        YahooDataBacktesting,
        start_date,
        end_date,
        benchmark_asset="AMZN",
    )
