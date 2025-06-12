from flask import Blueprint, jsonify
import requests
import os

youtube_bp = Blueprint('youtube', __name__)

GOOGLE_YT_API_KEY = os.getenv("GOOGLE_YT_API_KEY")
YOUTUBE_CHANNEL_ID = "UC_x5XG1OV2P6uZZ5FSM9Ttw"  # Google Developers Channel for demo

@youtube_bp.route("/test")
def test_youtube():
    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "key": GOOGLE_YT_API_KEY,
        "channelId": YOUTUBE_CHANNEL_ID,
        "part": "snippet",
        "order": "date",
        "type": "video",
        "maxResults": 5
    }

    response = requests.get(url, params=params)
    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch from YouTube"}), 500

    data = response.json()
    return jsonify(data)