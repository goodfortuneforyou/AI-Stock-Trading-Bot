# this is a model that uses pytorch that uses sentiment analysis on news articles from specified stocks and
# dates to determine if there is a positive or negative sentiment.
# transformers is an open-source library that provides a variety of pre-trained models for natural language processing.
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
from typing import Tuple 
# use the GPU if available
device = "cuda:0" if torch.cuda.is_available() else "cpu"

# load the model and tokenizer
tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
model = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert").to(device)
labels = ["positive", "negative", "neutral"]

def estimate_sentiment(news):
    if news:
        # break down text into tokens that the model can understand
        tokens = tokenizer(news, return_tensors="pt", padding=True).to(device)
        # get the sentiment of the news
        result = model(tokens["input_ids"], attention_mask=tokens["attention_mask"]).logits
        # sum the results for each label and apply softmax to get the probability of the sentiment
        result = torch.nn.functional.softmax(torch.sum(result, 0), dim=-1)
        # get the sentiment with the highest probability
        probability = result[torch.argmax(result)]
        sentiment = labels[torch.argmax(result)]
        return probability, sentiment
    else:
        # if there is no news, return a neutral sentiment
        return 0, labels[-1]


if __name__ == "__main__":
    tensor, sentiment = estimate_sentiment(['the people had an awfully great time','they had a lot of fun'])
    print(tensor, sentiment)
    print(torch.cuda.is_available())