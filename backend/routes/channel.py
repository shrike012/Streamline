from flask import Blueprint, request, jsonify, current_app
from googleapiclient.discovery import build
from utils.security import token_required, auth_and_csrf_required
from datetime import datetime, timezone
from dateutil import parser as date_parser
from bson import ObjectId
import humanize
import isodate
import statistics

channel_bp = Blueprint("channel", __name__)

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
@auth_and_csrf_required
def get_channel_videos(data):
    body = request.get_json()
    channel_id = body.get("channelId")

    if not channel_id or not channel_id.startswith("UC"):
        return jsonify({"error": "Invalid channelId"}), 400

    try:
        yt = build("youtube", "v3", developerKey=current_app.config["GOOGLE_YT_API_KEY"])

        chan_info = yt.channels().list(
            part="snippet,statistics,contentDetails",
            id=channel_id
        ).execute()

        if not chan_info["items"]:
            return jsonify({"error": "Channel not found"}), 404

        item = chan_info["items"][0]
        snippet = item["snippet"]
        stats = item.get("statistics", {})
        uploads_id = item["contentDetails"]["relatedPlaylists"]["uploads"]

        channel_title = snippet["title"]
        avatar = snippet["thumbnails"]["default"]["url"]
        subs = int(stats.get("subscriberCount", 0))
        total_views = int(stats.get("viewCount", 0))
        num_videos_total = int(stats.get("videoCount", 0))

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
                length = f"{hrs}:{mins:02}:{secs:02}" if hrs > 0 else f"{mins}:{secs:02}"

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

        current_app.logger.info(
            f"User {data['email']} fetched videos for channel {channel_id} ({channel_title})"
        )

        return jsonify({
            "channel": {
                "channelId": channel_id,
                "title": channel_title,
                "avatar": avatar.replace("http://", "https://"),
                "subscriberCount": subs,
                "total_views": total_views,
                "num_videos_total": num_videos_total
            },
            "videos": videos
        })

    except Exception as e:
        current_app.logger.error(f"Failed to fetch videos for user {data['email']}: {str(e)}")
        return jsonify({"error": f"Failed to fetch videos: {str(e)}"}), 500


@channel_bp.route("/list", methods=["GET"])
@token_required
def list_user_channels(data):
    try:
        mongo = current_app.extensions["pymongo"]
        users = mongo.db.users
        user_id = ObjectId(data["user_id"])
        result = users.find_one({"_id": user_id})
        raw_channels = result.get("channels", [])

        channels = []
        for ch in raw_channels:
            channels.append({
                "channelId": ch.get("channelId"),
                "title": ch.get("title"),
                "avatar": ch.get("avatar"),
                "handle": ch.get("handle"),
                "category": ch.get("category", ""),
                "format": ch.get("format", "")
            })

        return jsonify({"channels": channels})

    except Exception as e:
        current_app.logger.error(f"Failed to list channels for user {data['email']}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@channel_bp.route("/search", methods=["GET"])
@auth_and_csrf_required
def search_channels(data):
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "Missing search query"}), 400

    try:
        yt = build("youtube", "v3", developerKey=current_app.config["GOOGLE_YT_API_KEY"])

        res = yt.search().list(
            q=query,
            type="channel",
            part="snippet",
            maxResults=25
        ).execute()

        channel_ids = [item["snippet"]["channelId"] for item in res.get("items", [])]

        chan_info = yt.channels().list(
            part="snippet,statistics",
            id=",".join(channel_ids)
        ).execute()

        results = []
        for item in chan_info.get("items", []):
            snippet = item["snippet"]
            stats = item.get("statistics", {})
            sub_count = int(stats.get("subscriberCount", 0))

            results.append({
                "channelId": item["id"],
                "title": snippet["title"],
                "description": snippet.get("description", ""),
                "avatar": snippet["thumbnails"]["default"]["url"].replace("http://", "https://"),
                "subscriberCount": sub_count
            })

        return jsonify({"results": results})

    except Exception as e:
        current_app.logger.error(f"Channel search failed for query '{query}': {str(e)}")
        return jsonify({"error": "Failed to search channels"}), 500

@channel_bp.route("/remove", methods=["POST"])
@auth_and_csrf_required
def remove_channel(data):
    body = request.get_json()
    channel_id = body.get("channelId")

    if not channel_id:
        return jsonify({"error": "Missing channelId"}), 400

    try:
        user_id = ObjectId(data["user_id"])
        mongo = current_app.extensions["pymongo"]
        users = mongo.db.users

        result = users.update_one(
            {"_id": user_id},
            {"$pull": {"channels": {"channelId": channel_id}}}
        )

        if result.modified_count == 0:
            current_app.logger.warning(f"User {data['email']} attempted to remove nonexistent or already-removed channel {channel_id}")
            return jsonify({"error": "Channel not found or not removed"}), 404

        current_app.logger.info(f"User {data['email']} removed channel {channel_id}")
        return jsonify({"message": "Channel removed successfully"}), 200

    except Exception as e:
        current_app.logger.error(f"Error while removing channel for user {data['email']}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@channel_bp.route("/add", methods=["POST"])
@auth_and_csrf_required
def add_channel(data):
    body = request.get_json()
    channel_id = body.get("channelId")
    category = body.get("category", "").strip()
    format_ = body.get("format", "").strip()

    if not channel_id:
        return jsonify({"error": "Missing channelId"}), 400
    if not category or not format_:
        return jsonify({"error": "Missing category or format"}), 400

    try:
        yt = build("youtube", "v3", developerKey=current_app.config["GOOGLE_YT_API_KEY"])
        chan_info = yt.channels().list(part="snippet", id=channel_id).execute()

        if not chan_info["items"]:
            return jsonify({"error": "Channel metadata not found"}), 404

        snippet = chan_info["items"][0]["snippet"]
        title = snippet["title"]
        avatar = snippet["thumbnails"]["default"]["url"]
        handle = snippet.get("customUrl") or f"channel/{channel_id}"

        user_id = ObjectId(data["user_id"])
        mongo = current_app.extensions["pymongo"]
        users = mongo.db.users

        existing = users.find_one({"_id": user_id, "channels.channelId": channel_id})
        if existing:
            current_app.logger.warning(f"User {data['email']} attempted to re-add channel {channel_id}")
            return jsonify({"error": "Channel already added"}), 400

        users.update_one(
            {"_id": user_id},
            {"$addToSet": {"channels": {
                "handle": handle,
                "channelId": channel_id,
                "title": title,
                "avatar": avatar,
                "category": category,
                "format": format_
            }}}
        )

        current_app.logger.info(
            f"User {data['email']} added channel {channel_id} ({title}) category={category} format={format_}"
        )

        return jsonify({
            "channelId": channel_id,
            "title": title,
            "avatar": avatar,
            "category": category,
            "format": format_
        })

    except Exception as e:
        current_app.logger.error(f"Failed to add channel for user {data['email']}: {str(e)}")
        return jsonify({"error": f"Failed to add channel: {str(e)}"}), 500