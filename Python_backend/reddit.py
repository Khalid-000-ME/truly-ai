import requests
import json
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

# Reddit API endpoint
BASE_URL = "https://oauth.reddit.com"
AUTH_URL = "https://www.reddit.com/api/v1/access_token"

# Your Reddit API credentials
USER_AGENT = os.getenv("REDDIT_USER_AGENT")

import requests
import base64
from datetime import datetime

# Reddit API endpoints
TOKEN_URL = "https://www.reddit.com/api/v1/access_token"
OAUTH_BASE = "https://oauth.reddit.com"

# Your Reddit API credentials (from https://www.reddit.com/prefs/apps)
CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
USERNAME = os.getenv("REDDIT_USERNAME")
PASSWORD = os.getenv("REDDIT_PASSWORD")
USER_AGENT = os.getenv("REDDIT_USER_AGENT")

def get_access_token():
    """
    Get OAuth2 access token using password grant (for script apps)
    Token expires after 1 hour
    """
    # Encode client_id and client_secret for basic auth
    auth_string = f"{CLIENT_ID}:{CLIENT_SECRET}"
    auth_bytes = auth_string.encode('ascii')
    auth_base64 = base64.b64encode(auth_bytes).decode('ascii')
    
    headers = {
        'Authorization': f'Basic {auth_base64}',
        'User-Agent': USER_AGENT
    }
    
    data = {
        'grant_type': 'password',
        'username': USERNAME,
        'password': PASSWORD
    }
    
    response = requests.post(TOKEN_URL, headers=headers, data=data)
    
    if response.status_code == 200:
        token_data = response.json()
        return token_data['access_token']
    else:
        print(f"Error getting token: {response.status_code}")
        print(response.text)
        return None

def get_headers(token):
    """Create headers with bearer token for OAuth requests"""
    return {
        'Authorization': f'bearer {token}',
        'User-Agent': USER_AGENT
    }

def get_popular_posts(token, subreddit="all", sort="hot", time_filter="day", limit=25):
    """
    Get posts from a subreddit
    
    Args:
        token: OAuth access token
        subreddit: subreddit name or "all" for r/all
        sort: "hot", "new", "top", "rising", "controversial"
        time_filter: "hour", "day", "week", "month", "year", "all" (for top/controversial)
        limit: number of posts (1-100)
    """
    url = f"{OAUTH_BASE}/r/{subreddit}/{sort}"
    
    params = {'limit': min(limit, 100)}
    
    # Add time filter for top and controversial
    if sort in ['top', 'controversial']:
        params['t'] = time_filter
    
    response = requests.get(url, headers=get_headers(token), params=params)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None

def search_posts(token, query, subreddit=None, sort="relevance", time_filter="all", limit=25):
    """
    Search for posts
    
    Args:
        token: OAuth access token
        query: search query
        subreddit: limit search to specific subreddit (optional)
        sort: "relevance", "hot", "top", "new", "comments"
        time_filter: "hour", "day", "week", "month", "year", "all"
        limit: number of results
    """
    if subreddit:
        url = f"{OAUTH_BASE}/r/{subreddit}/search"
    else:
        url = f"{OAUTH_BASE}/search"
    
    params = {
        'q': query,
        'sort': sort,
        't': time_filter,
        'limit': min(limit, 100),
        'restrict_sr': 'true' if subreddit else 'false',
        'type': 'link'
    }
    
    response = requests.get(url, headers=get_headers(token), params=params)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None

def get_user_info(token):
    """Get information about the authenticated user"""
    url = f"{OAUTH_BASE}/api/v1/me"
    
    response = requests.get(url, headers=get_headers(token))
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        return None

def parse_posts(reddit_data):
    """Extract useful information from Reddit API response"""
    if not reddit_data or 'data' not in reddit_data:
        return []
    
    posts = []
    for post in reddit_data['data']['children']:
        if post['kind'] != 't3':  # t3 is the type prefix for submissions
            continue
            
        data = post['data']
        posts.append({
            'id': data.get('id'),
            'title': data.get('title'),
            'author': data.get('author'),
            'subreddit': data.get('subreddit'),
            'score': data.get('score', 0),
            'upvote_ratio': data.get('upvote_ratio', 0),
            'num_comments': data.get('num_comments', 0),
            'created_utc': datetime.fromtimestamp(data.get('created_utc', 0)),
            'url': data.get('url'),
            'permalink': f"https://reddit.com{data.get('permalink')}",
            'is_video': data.get('is_video', False),
            'is_self': data.get('is_self', False),
            'selftext': data.get('selftext', '')[:300],
            'link_flair_text': data.get('link_flair_text'),
            'over_18': data.get('over_18', False),
            'spoiler': data.get('spoiler', False),
            'total_awards_received': data.get('total_awards_received', 0),
            'thumbnail': data.get('thumbnail'),
            'domain': data.get('domain')
        })
    
    return posts

def display_posts(posts):
    """Pretty print post information"""
    for i, post in enumerate(posts, 1):
        print(f"\n{'='*80}")
        print(f"Post #{i}")
        print(f"{'='*80}")
        print(f"Title: {post['title']}")
        print(f"Subreddit: r/{post['subreddit']}")
        print(f"Author: u/{post['author']}")
        print(f"Score: {post['score']:,} (↑{post['upvote_ratio']*100:.1f}%)")
        print(f"Comments: {post['num_comments']:,} | Awards: {post['total_awards_received']}")
        
        if post['link_flair_text']:
            print(f"Flair: {post['link_flair_text']}")
        
        if post['is_self'] and post['selftext']:
            print(f"Text: {post['selftext']}...")
        elif not post['is_self']:
            print(f"Link: {post['url']}")
        
        print(f"Posted: {post['created_utc'].strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Reddit URL: {post['permalink']}")
        
        tags = []
        if post['over_18']:
            tags.append("NSFW")
        if post['spoiler']:
            tags.append("Spoiler")
        if post['is_video']:
            tags.append("Video")
        if tags:
            print(f"Tags: {', '.join(tags)}")

def filter_by_score(posts, min_score=100):
    """Filter posts by minimum score"""
    return [p for p in posts if p['score'] >= min_score]

# Example usage
if __name__ == "__main__":
    # Get access token (valid for 1 hour)
    print("Getting access token...")
    token = get_access_token()
    
    if not token:
        print("Failed to get access token. Check your credentials.")
        exit(1)
    
    print("✓ Successfully authenticated!\n")
    
    # Example 1: Get hot posts from a specific subreddit
    print("=" * 80)
    print("HOT POSTS FROM r/python")
    print("=" * 80)
    results = get_popular_posts(token, subreddit="python", sort="hot", limit=5)
    if results:
        posts = parse_posts(results)
        display_posts(posts)
    
    print("\n\n")
    
    # Example 2: Get top posts from r/all today
    print("=" * 80)
    print("TOP POSTS FROM r/all TODAY")
    print("=" * 80)
    results = get_popular_posts(token, subreddit="all", sort="top", time_filter="day", limit=10)
    if results:
        posts = parse_posts(results)
        popular = filter_by_score(posts, min_score=5000)
        display_posts(popular[:5])
    
    print("\n\n")
    
    # Example 3: Search for posts
    print("=" * 80)
    print("SEARCH: 'machine learning'")
    print("=" * 80)
    results = search_posts(token, "machine learning", sort="top", time_filter="week", limit=5)
    if results:
        posts = parse_posts(results)
        display_posts(posts)
    
    # Example 4: Get user info
    print("\n\n")
    print("=" * 80)
    print("AUTHENTICATED USER INFO")
    print("=" * 80)
    user_info = get_user_info(token)
    if user_info:
        print(f"Username: {user_info.get('name')}")
        print(f"Karma: {user_info.get('total_karma', 0):,}")
        print(f"Account created: {datetime.fromtimestamp(user_info.get('created_utc', 0))}")