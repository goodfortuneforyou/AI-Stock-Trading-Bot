#!/bin/bash
# ensure python is updated 
sudo apt update

# activate a virtual environment
python -m venv venv
source venv/bin/activate

# install and upgrade packages
python3.10 -m pip install --upgrade pip  
pip install --upgrade lumibot 
pip install --upgrade alpaca-trade-api     
pip install --upgrade alpaca-py
pip install --upgrade websockets==11.0.3
pip install --upgrade python-dotenv
pip install install torch torchvision torchaudio transformers

# run MLStrategy trading bot
/opt/homebrew/bin/python3.10 /Users/anjolie/Desktop/SPRING-2024/AI-Stock-Trading-Bot/tradingbot.py


