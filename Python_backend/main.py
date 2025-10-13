import os

from dotenv import load_dotenv
load_dotenv()
import requests
from perplexity import Perplexity
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Enable CORS for all routes


API_KEY = os.getenv("PERPLEXITY_API_KEY")

def call_perplexity_chat(messages, model="sonar-medium-online", temperature=0.7, max_tokens=300):
    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature
    }
    resp = requests.post(url, headers=headers, json=payload)
    resp.raise_for_status()
    return resp.json()

def perplexity_call():

    client = Perplexity()

    search = client.search.create(
        query="Is the claim ‘Drinking 3 liters of water cures COVID-19’ true?",
        max_results=5,
        max_tokens_per_page=1024
    )

    return search.results

@app.route("/perplexity_call", methods=["GET"])
def call_perplexity():
    res = perplexity_call()
    # Assuming perplexity_call returns a list of objects with title and url
    formatted_results = [{"title": result.title, "url": result.url} for result in res]
    return jsonify(formatted_results)

if __name__ == "__main__":
    msgs = [
        {"role": "system", "content": "You are a fact-checker assistant."},
        {"role": "user", "content": "Is the claim ‘Drinking 3 liters of water cures COVID-19’ true?"}
    ]
    res = perplexity_call()
    for result in res:
        print(f"{result.title}: {result.url}")
    app.run(debug=True, port=8000)


