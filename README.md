# AI-Stock-Trading-Bot 

![Screenshot 2024-04-16 at 4 54 12 PM](https://github.com/Anjoliekate/AI-Stock-Trading-Bot/assets/99061657/66e5f295-103f-4a41-8464-4e2a78767805)

## Features
This is an AI stock trading bot that is visualized through a web-application. This web-app displays the users portfolio information on a dashboard and has the following features & functionality:
- Fully implemented login and signup system
- Ability to add preferred symbols to invest in. 
- User can specify the amount to invest in that particular symbol
- Features a chart that displays the user's portfolio progress. As of now displays only the first symbols chart. 
- Displays the bot’s transactions history for all user investment. The transaction includes date, share amount, price, and corresponding symbol. 
- Reports the articles that were flagged by the bot with a  99.9% probability of either a positive and negative sentiment. The user can click on the article to read more about it. 
- Allows the user to add additional symbols and amounts to their portfolio if they want to invest more
- Users can edit their user information such as username, email, and birthday.
  
## Technical Overview 
The Frontend: Vue.js, HTML, and CSS. For the back-end: Flask, MongoDB, and python scripts to run the bot. This web-app includes a full user authentication, authorization, validation, and session store system. 

This trading bot is built on lumibot which is a trading library that allows backtesting of strategies. The financial data fed into the bot is extracted from the Alpaca trading API and news articles are fetched from Yahoo Finance. 

These articles are fed into a pre-trained machine learning model called finBERT, a BERT model specifically made for financial data that uses sentiment analysis to detect whether the article has a positive, neutral, or negative sentiment. The lumibot strategy then buys or sells if the machine learning model is 99.9% certain the headline is positive or negative. 

## Setup
1. clone this repo
2. run app.py server
3. drag dashboard.hmtl into browser
4. sign-up and choose portfolio preferences
5. log-out and back in to start the bot
6. wait for approximately 3 minutes for bot to run and reload the page


<img width="1674" alt="Screenshot 2024-03-31 at 10 02 50 PM" src="https://github.com/Anjoliekate/AI-Stock-Trading-Bot/assets/99061657/6e1a6496-377a-4ae9-9758-4f929d6c02ab">
