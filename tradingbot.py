from lumibot.traders import Trader
from lumibot.brokers import Alpaca
from lumibot.backtesting import YahooDataBacktesting
from lumibot.strategies.strategy import Strategy
from datetime import datetime
from dotenv import load_dotenv
from alpaca_trade_api import REST
from timedelta import Timedelta
from finbert_utils import estimate_sentiment
import os

# lumibot is a trading library that allows you to backtest and trade stocks using a variety of strategies.
# Alpaca is a brokerage that allows you to trade stocks using an API and provides a paper trading environment.
# YahooDataBacktesting is a class that allows you to backtest a strategy using historical stock data from Yahoo Finance.
# This strategy uses finbert_utils to estimate the sentiment of news articles and uses that to determine if it should buy or sell a stock.

# load in my env variable
load_dotenv("info.env")

# get env variables
API_KEY = os.getenv('API_KEY')
API_SECRET = os.getenv('API_SECRET')
BASE_URL = os.getenv('BASE_URL')

ALPACA_CREDS = {
    "API_KEY": API_KEY,
    "API_SECRET": API_SECRET,
    "PAPER": True
}

class MLTrader(Strategy):

    def initialize(self, symbol:str="SPY", cash_at_risk:float=.5):
        self.symbol = symbol
        self.sleeptime = "24H"
        self.last_trade = None
        self.cash_at_risk = cash_at_risk
        self.api = REST(base_url=BASE_URL, key_id=API_KEY, secret_key=API_SECRET)

    def position_sizing(self):
        cash = self.get_cash()
        last_price = self.get_last_price(self.symbol)
        quantity = round(cash * self.cash_at_risk / last_price, 0)
        return cash, last_price, quantity

    def get_dates(self):
        today = self.get_datetime()
        three_days_prior = today - Timedelta(days=3)
        return today.strftime("%Y-%m-%d"), three_days_prior.strftime("%Y-%m-%d")

    def get_sentiment(self):
        today, three_days_prior = self.get_dates()
        news = self.api.get_news(symbol = self.symbol, start=three_days_prior, end=today)
        news = [ev.__dict__["_raw"]["headline"] for ev in news]
        probablility, sentiment = estimate_sentiment(news)
        return probablility, sentiment

    def on_trading_iteration(self):
        cash, last_price, quantity = self.position_sizing()
        probability, sentiment = self.get_sentiment()
        if cash > last_price:
                if sentiment == "positive" and probability > .999:
                    if self.last_trade == "sell":
                         self.sell_all()
                    order = self.create_order(self.symbol, quantity, "buy", type="bracket", take_profit_price=last_price*1.20, stop_loss_price=last_price*.95)
                    self.submit_order(order)
                    self.last_trade = "buy"
                elif sentiment == "negative" and probability > .999:
                    if self.last_trade == "buy":
                         self.sell_all()
                    order = self.create_order(self.symbol, quantity, "sell", type="bracket", take_profit_price=last_price*.8, stop_loss_price=last_price*1.05)
                    self.submit_order(order)
                    self.last_trade = "sell"

start_date = datetime(2020, 1, 1)
end_date = datetime(2024, 1, 31)

broker = Alpaca(ALPACA_CREDS)

strategy = MLTrader(name="MLTrader", broker=broker, parameters={"symbol": "SPY", "cash_at_risk": .5})
strategy.backtest(
    YahooDataBacktesting, start_date, end_date, parameters={}
)
