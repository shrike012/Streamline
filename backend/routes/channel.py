from flask import Blueprint, request, jsonify, current_app
from googleapiclient.discovery import build
from utils.security import token_required
from datetime import datetime, timezone
from dateutil import parser as date_parser
import humanize
import isodate
import statistics

channel_bp = Blueprint("channel", __name__, url_prefix="/api/channel")

def compute_outlier_scores(videos):
    scores = []
    view_counts = [v["viewCount"] for v in videos]

    for i, vc in enumerate(view_counts):
        if vc == 0:
            scores.append(0.0)
            continue

        neighbors = []
        for offset in range(1, 6):
            if i - offset >= 0 and view_counts[i - offset] > 0:
                neighbors.append(view_counts[i - offset])
            if i + offset < len(view_counts) and view_counts[i + offset] > 0:
                neighbors.append(view_counts[i + offset])

        if not neighbors:
            scores.append(1.0)
            continue

        median_views = statistics.median(neighbors)
        score = vc / median_views if median_views > 0 else 1.0
        scores.append(round(score, 1))

    return scores

@channel_bp.route("/videos", methods=["POST"])
@token_required
def get_channel_videos():
    data = request.get_json()
    url = data.get("url")

    if not url or '@' not in url:
        return jsonify({"error": "Invalid channel URL"}), 400

    try:
        yt = build("youtube", "v3", developerKey=current_app.config["GOOGLE_YT_API_KEY"])

        handle = url.strip().split("@")[1].split("/")[0]
        search_res = yt.search().list(
            q=f"@{handle}", type="channel", part="snippet", maxResults=1
        ).execute()

        if not search_res["items"]:
            return jsonify({"error": "Channel not found"}), 404

        channel_id = search_res["items"][0]["snippet"]["channelId"]
        chan_info = yt.channels().list(part="contentDetails", id=channel_id).execute()
        uploads_id = chan_info["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

        video_ids = []
        next_page_token = None
        while len(video_ids) < 500:
            resp = yt.playlistItems().list(
                part="contentDetails,snippet",
                playlistId=uploads_id,
                maxResults=50,
                pageToken=next_page_token
            ).execute()

            for item in resp.get("items", []):
                video_ids.append(item["contentDetails"]["videoId"])

            next_page_token = resp.get("nextPageToken")
            if not next_page_token:
                break

        def chunkify(lst, size):
            for i in range(0, len(lst), size):
                yield lst[i:i + size]

        videos = []
        for chunk in chunkify(video_ids, 50):
            details = yt.videos().list(
                part="snippet,contentDetails,statistics",
                id=",".join(chunk)
            ).execute()

            for item in details.get("items", []):
                snippet = item["snippet"]
                stats = item.get("statistics", {})
                content = item.get("contentDetails", {})

                published = date_parser.parse(snippet["publishedAt"])
                time_ago = humanize.naturaltime(datetime.now(timezone.utc) - published)

                duration = isodate.parse_duration(content.get("duration", "PT0S"))
                total_seconds = int(duration.total_seconds())
                mins, secs = divmod(total_seconds, 60)
                hrs, mins = divmod(mins, 60)
                if hrs > 0:
                    length = f"{hrs}:{mins:02}:{secs:02}"
                else:
                    length = f"{mins}:{secs:02}"

                videos.append({
                    "videoId": item["id"],
                    "title": snippet["title"],
                    "thumbnail": snippet["thumbnails"]["high"]["url"],
                    "publishedAt": snippet["publishedAt"],
                    "timeAgo": time_ago,
                    "viewCount": int(stats.get("viewCount", 0)),
                    "length": length
                })

        outlier_scores = compute_outlier_scores(videos)
        for idx, score in enumerate(outlier_scores):
            videos[idx]["outlierScore"] = score

        return jsonify({"videos": videos})

    except Exception as e:
        return jsonify({"error": f"Failed to fetch videos: {str(e)}"}), 500