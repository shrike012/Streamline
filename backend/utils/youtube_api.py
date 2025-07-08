from flask import current_app
from dateutil import parser as date_parser
from datetime import datetime, timezone
import humanize
import isodate
from googleapiclient.discovery import build
import random
from utils.parser import chunkify

def get_youtube_client():
    key = random.choice(current_app.config["YT_API_KEYS"])
    return build("youtube", "v3", developerKey=key)

def fetch_channel_videos(yt_client, uploads_id, max_videos=50, page_token=None):
    all_videos = []
    seen_video_ids = set()

    while len(all_videos) < max_videos:
        resp = yt_client.playlistItems().list(
            part="contentDetails",
            playlistId=uploads_id,
            maxResults=min(50, max_videos - len(all_videos)),
            pageToken=page_token
        ).execute()

        items = resp.get("items", [])
        video_ids = [
            item["contentDetails"]["videoId"]
            for item in items
            if "videoId" in item["contentDetails"]
        ]

        # Prevent duplicates
        video_ids = [vid for vid in video_ids if vid not in seen_video_ids]
        seen_video_ids.update(video_ids)

        # Fetch video details
        details = []
        for chunk in chunkify(video_ids, 50):
            details_resp = yt_client.videos().list(
                part="snippet,contentDetails,statistics",
                id=",".join(chunk)
            ).execute()
            details.extend(details_resp.get("items", []))

        for item in details:
            snippet = item["snippet"]
            stats = item.get("statistics", {})
            content = item.get("contentDetails", {})

            # Duration parsing
            iso_duration = content.get("duration", "PT0S")
            duration = isodate.parse_duration(iso_duration)
            total_seconds = int(duration.total_seconds())
            mins, secs = divmod(total_seconds, 60)
            hrs, mins = divmod(mins, 60)
            length = f"{hrs}:{mins:02}:{secs:02}" if hrs > 0 else f"{mins}:{secs:02}"

            published = date_parser.parse(snippet["publishedAt"])
            time_ago = humanize.naturaltime(datetime.now(timezone.utc) - published)

            all_videos.append({
                "videoId": item["id"],
                "title": snippet["title"],
                "description": snippet.get("description", ""),
                "thumbnail": snippet["thumbnails"]["high"]["url"],
                "publishedAt": snippet["publishedAt"],
                "timeAgo": time_ago,
                "length": length,
                "totalSeconds": total_seconds,
                "viewCount": int(stats.get("viewCount", 0)),
                "channelTitle": snippet.get("channelTitle", ""),
                "channelId": snippet.get("channelId", ""),
            })

        # Stop if no more pages
        page_token = resp.get("nextPageToken")
        if not page_token:
            break

    return {
        "videos": all_videos[:max_videos],
        "nextPageToken": page_token
    }