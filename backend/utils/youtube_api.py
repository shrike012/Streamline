from flask import current_app
from dateutil import parser as date_parser
from datetime import datetime, timezone
import humanize
import isodate
from googleapiclient.discovery import build
from utils.parser import chunkify
import random
import logging

def get_youtube_client():
    try:
        key = random.choice(current_app.config["YT_API_KEYS"])
        return build("youtube", "v3", developerKey=key)
    except Exception as e:
        current_app.logger.error(f"Failed to initialize YouTube client: {e}")
        raise

def fetch_channel_videos(yt_client, uploads_id, max_videos=50, page_token=None):
    all_videos = []
    seen_video_ids = set()

    try:
        while len(all_videos) < max_videos:
            resp = yt_client.playlistItems().list(
                part="contentDetails",
                playlistId=uploads_id,
                maxResults=min(50, max_videos - len(all_videos)),
                pageToken=page_token
            ).execute()

            items = resp.get("items", [])
            video_ids = [
                item["contentDetails"].get("videoId")
                for item in items
                if item.get("contentDetails", {}).get("videoId")
            ]

            # De-duplication
            video_ids = [vid for vid in video_ids if vid not in seen_video_ids]
            seen_video_ids.update(video_ids)

            # Fetch details in chunks
            details = []
            for chunk in chunkify(video_ids, 50):
                try:
                    details_resp = yt_client.videos().list(
                        part="snippet,contentDetails,statistics",
                        id=",".join(chunk)
                    ).execute()
                    details.extend(details_resp.get("items", []))
                except Exception as e:
                    current_app.logger.warning(f"Failed to fetch chunk details: {e}")

            for item in details:
                try:
                    snippet = item["snippet"]
                    stats = item.get("statistics", {})
                    content = item.get("contentDetails", {})

                    iso_duration = content.get("duration", "PT0S")
                    duration = isodate.parse_duration(iso_duration)
                    total_seconds = int(duration.total_seconds())

                    mins, secs = divmod(total_seconds, 60)
                    hrs, mins = divmod(mins, 60)
                    length = f"{hrs}:{mins:02}:{secs:02}" if hrs > 0 else f"{mins}:{secs:02}"

                    published = date_parser.parse(snippet["publishedAt"])
                    time_ago = humanize.naturaltime(datetime.now(timezone.utc) - published)

                    is_short = total_seconds <= 180
                    thumbnail = snippet.get("thumbnails", {}).get("high", {})

                    all_videos.append({
                        "videoId": item["id"],
                        "title": snippet["title"],
                        "description": snippet.get("description", ""),
                        "thumbnail": thumbnail.get("url", ""),
                        "publishedAt": snippet["publishedAt"],
                        "timeAgo": time_ago,
                        "length": length,
                        "totalSeconds": total_seconds,
                        "viewCount": int(stats.get("viewCount", 0)),
                        "channelTitle": snippet.get("channelTitle", ""),
                        "channelId": snippet.get("channelId", ""),
                        "isShort": is_short
                    })
                except Exception as e:
                    current_app.logger.warning(f"Failed to process video item: {e}")

            page_token = resp.get("nextPageToken")
            if not page_token:
                break

    except Exception as e:
        current_app.logger.error(f"Failed to fetch channel videos for {uploads_id}: {e}")
        return {
            "videos": [],
            "nextPageToken": None,
            "error": str(e)
        }

    return {
        "videos": all_videos[:max_videos],
        "nextPageToken": page_token
    }