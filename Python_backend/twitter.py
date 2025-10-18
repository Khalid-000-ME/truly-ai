import requests
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os

load_dotenv()

# Twitter API v2 endpoint
BASE_URL = "https://api.twitter.com/2"

# Your Twitter API credentials
BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")

def get_headers():
    """Create headers with bearer token"""
    return {
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "Content-Type": "application/json"
    }

def search_popular_tweets(query, max_results=10):
    """
    Search for popular tweets based on a query
    Sorts by relevancy which tends to show popular tweets first
    """
    url = f"{BASE_URL}/tweets/search/recent"
    
    params = {
        "query": query,
        "max_results": max_results,
        "tweet.fields": "created_at,public_metrics,author_id,lang",
        "user.fields": "name,username,verified",
        "expansions": "author_id",
        "sort_order": "relevancy"  # Gets most relevant/popular tweets
    }
    
    response = requests.get(url, headers=get_headers(), params=params)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None

def get_trending_tweets(location_id=1):
    """
    Get trending topics (requires different endpoint)
    location_id: 1 = Worldwide
    """
    url = f"{BASE_URL}/trends/place"
    
    params = {"id": location_id}
    
    response = requests.get(url, headers=get_headers(), params=params)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        return None

def filter_by_engagement(tweets_data, min_likes=100):
    """
    Filter tweets by engagement metrics
    """
    if not tweets_data or 'data' not in tweets_data:
        return []
    
    popular_tweets = []
    users = {user['id']: user for user in tweets_data.get('includes', {}).get('users', [])}
    
    for tweet in tweets_data['data']:
        metrics = tweet.get('public_metrics', {})
        likes = metrics.get('like_count', 0)
        retweets = metrics.get('retweet_count', 0)
        
        if likes >= min_likes:
            author = users.get(tweet['author_id'], {})
            popular_tweets.append({
                'text': tweet['text'],
                'author': author.get('username', 'Unknown'),
                'author_name': author.get('name', 'Unknown'),
                'likes': likes,
                'retweets': retweets,
                'replies': metrics.get('reply_count', 0),
                'created_at': tweet.get('created_at'),
                'url': f"https://twitter.com/{author.get('username')}/status/{tweet['id']}"
            })
    
    # Sort by likes
    popular_tweets.sort(key=lambda x: x['likes'], reverse=True)
    return popular_tweets

def display_tweets(tweets):
    """Pretty print tweet information"""
    for i, tweet in enumerate(tweets, 1):
        print(f"\n{'='*80}")
        print(f"Tweet #{i}")
        print(f"{'='*80}")
        print(f"Author: {tweet['author_name']} (@{tweet['author']})")
        print(f"Text: {tweet['text'][:200]}{'...' if len(tweet['text']) > 200 else ''}")
        print(f"Likes: {tweet['likes']:,} | Retweets: {tweet['retweets']:,} | Replies: {tweet['replies']:,}")
        print(f"Posted: {tweet['created_at']}")
        print(f"URL: {tweet['url']}")

# Example usage
if __name__ == "__main__":
    # Search for popular tweets about a topic
    query = "python programming -is:retweet"  # Exclude retweets
    
    print(f"Searching for popular tweets about: {query}\n")
    
    results = search_popular_tweets(query, max_results=50)
    
    if results:
        # Filter for highly engaged tweets
        popular = filter_by_engagement(results, min_likes=50)
        
        print(f"Found {len(popular)} popular tweets:\n")
        display_tweets(popular[:10])  # Display top 10
    else:
        print("No results found")