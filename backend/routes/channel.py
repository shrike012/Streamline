from utils.channel import compute_outlier_scores, analyze_channel_insights
from flask import Blueprint, request, jsonify, current_app
from utils.embeddings import embed_text, cosine_similarity
from utils.parser import parse_channel_metadata, extract_main_topic, parse_motives
from utils.security import auth_and_csrf_required
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from utils.youtube_api import get_youtube_client, fetch_channel_videos
from statistics import median
from utils.db import get_redis_cache, set_redis_cache
from dateutil import parser as date_parser
from utils.scheduled_jobs import find_outliers_for_channel
from extensions import limiter, mongo, executor

channel_bp = Blueprint("channel", __name__)

@channel_bp.route("/<channel_id>/stats", methods=["GET"])
@auth_and_csrf_required
@limiter.limit("60 per minute")
def get_channel_stats(data, channel_id):
    redis = current_app.extensions["redis"]
    if not channel_id or not channel_id.startswith("UC"):
        return jsonify({"error": "Invalid channelId"}), 400

    try:
        now = datetime.now(timezone.utc)

        # Serve from cache if available
        redis_key = f"channel_stats:{channel_id}"
        cached = get_redis_cache(redis, redis_key)

        if cached:
            return jsonify(cached)

        yt = get_youtube_client()

        # Get channel metadata and uploads playlist
        chan_info = yt.channels().list(part="statistics,contentDetails,snippet", id=channel_id).execute()
        chan_items = chan_info.get("items", [])
        if not chan_items:
            return jsonify({"error": "Channel not found"}), 404

        stats = chan_items[0].get("statistics", {})
        total_subs = int(stats.get("subscriberCount", 0)) if stats.get("subscriberCount") else 0
        uploads_id = chan_items[0]["contentDetails"]["relatedPlaylists"]["uploads"]

        # Fetch up to 50 recent videos using helper
        videos_res = fetch_channel_videos(yt, uploads_id, max_videos=50)
        videos = videos_res["videos"]

        # Uploads in last 30 days
        last_30_days = now - timedelta(days=30)
        uploads_last_30d = sum(
            1 for video in videos
            if date_parser.parse(video["publishedAt"]).replace(tzinfo=timezone.utc) >= last_30_days
        )

        # Compute median views and outlier scores for last 10 uploads
        recent_10 = videos[:10]
        median_views = 0
        num_recent_outliers = 0
        recent_videos = []

        if recent_10:
            views_list = [v["viewCount"] for v in recent_10]
            median_views = int(round(median(views_list))) if views_list else 0

            outlier_scores = compute_outlier_scores(recent_10)
            for i, score in enumerate(outlier_scores):
                recent_10[i]["score"] = score

            num_recent_outliers = sum(1 for s in outlier_scores if s >= 2.0)

            for video in recent_10:
                is_short = video.get("url", "").startswith("https://youtube.com/shorts/")
                recent_videos.append({
                    "videoId": video["videoId"],
                    "title": video["title"],
                    "thumbnail": video["thumbnail"],
                    "viewCount": video["viewCount"],
                    "publishedAt": video["publishedAt"],
                    "outlierScore": video["score"],
                    "channelId": video["channelId"],
                    "channelTitle": video["channelTitle"],
                    "length": video["length"],
                    "isShort": is_short
                })

        # Final response
        stats_response = {
            "uploadsLast30d": uploads_last_30d,
            "medianViewsRecent10": median_views,
            "totalSubscribers": total_subs,
            "numRecentOutliers": num_recent_outliers,
            "recentVideos": recent_videos,
        }

        # Cache and return
        set_redis_cache(redis, redis_key, stats_response, ttl_seconds=3600)

        return jsonify(stats_response)

    except Exception as e:
        current_app.logger.error(f"Failed to fetch stats for user {data['email']} channelId={channel_id}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@channel_bp.route("/search", methods=["GET"])
@auth_and_csrf_required
@limiter.limit("10 per minute")
def search_channels(data):
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "Missing search query"}), 400

    if len(query) > 100:
        return jsonify({"error": "Query too long"}), 400

    try:
        yt = get_youtube_client()

        res = yt.search().list(
            q=query,
            type="channel",
            part="snippet",
            maxResults=25
        ).execute()

        channel_ids = [item["id"]["channelId"] for item in res.get("items", [])]

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
                "channelTitle": snippet["title"],
                "description": snippet.get("description", ""),
                "avatar": snippet["thumbnails"]["default"]["url"].replace("http://", "https://"),
                "subscriberCount": sub_count or "hidden"
            })

        results.sort(
            key=lambda ch: ch["subscriberCount"] if isinstance(ch["subscriberCount"], int) else 0,
            reverse=True
        )

        return jsonify({"results": results})

    except Exception as e:
        current_app.logger.error(f"Channel search failed for query '{query}': {str(e)}")
        return jsonify({"error": "Failed to search channels"}), 500

@channel_bp.route("/list", methods=["GET"])
@auth_and_csrf_required
@limiter.limit("60 per minute")
def list_user_channels(data):
    try:
        users = mongo.db.users
        user_id = ObjectId(data["user_id"])

        result = users.find_one({"_id": user_id})

        if not result:
            return jsonify({"channels": []})

        raw_channels = result.get("channels", [])

        channels = []
        for ch in raw_channels:
            channels.append({
                "channelId": ch.get("channelId"),
                "channelTitle": ch.get("channelTitle"),
                "avatar": ch.get("avatar"),
                "handle": ch.get("handle"),
                "analyzedNiche": ch.get("analyzedNiche", ""),
                "analyzedStyle": ch.get("analyzedStyle", ""),
                "analyzedAttentionMarket": ch.get("analyzedAttentionMarket", ""),
            })

        return jsonify({"channels": channels})

    except Exception as e:
        current_app.logger.error(f"Failed to list channels for user {data['email']}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@channel_bp.route("/add", methods=["POST"])
@auth_and_csrf_required
@limiter.limit("5 per minute")
def add_channel(data):
    body = request.get_json()
    channel_id = body.get("channelId")

    if not channel_id or not channel_id.startswith("UC"):
        return jsonify({"error": "Missing or invalid channelId"}), 400

    try:
        user_id = ObjectId(data["user_id"])
        user_email = data["email"]
        users = mongo.db.users

        existing = users.find_one({"_id": user_id, "channels.channelId": channel_id})
        if existing:
            return jsonify({"error": "Channel already added"}), 400

        yt = get_youtube_client()
        chan_info = yt.channels().list(
            part="snippet,statistics,contentDetails",
            id=channel_id
        ).execute()

        if not chan_info["items"]:
            return jsonify({"error": "Channel metadata not found"}), 404

        meta = parse_channel_metadata(chan_info)
        uploads_id = meta["uploadsId"]

        videos_res = fetch_channel_videos(yt, uploads_id, 20)
        videos = videos_res.get("videos", [])

        insights = analyze_channel_insights(meta["description"], videos)

        if not insights or insights.get("format") == "Unknown":
            return jsonify({"error": "Could not analyze channel — no videos or unknown format"}), 400

        handle = chan_info["items"][0]["snippet"].get("customUrl") or f"channel/{channel_id}"

        user_channel = {
            "handle": handle,
            "channelId": meta["channelId"],
            "channelTitle": meta["channelTitle"],
            "avatar": meta["avatar"],
            "analyzedNiche": insights["analyzedNiche"],
            "analyzedStyle": insights["analyzedStyle"],
            "analyzedAttentionMarket": insights["analyzedAttentionMarket"]
        }

        users.update_one(
            {"_id": user_id},
            {"$addToSet": {"channels": user_channel}}
        )

        app = current_app._get_current_object()

        def run_outlier_job():
            with app.app_context():
                try:
                    find_outliers_for_channel(str(user_id), user_email, user_channel)
                except Exception as e:
                    app.logger.error(f"[{user_email}] Error computing outliers after adding channel {channel_id}: {e}")


        executor.submit(run_outlier_job)

        return jsonify(user_channel)

    except Exception as e:
        current_app.logger.error(f"Failed to add channel for user {data['email']}: {str(e)}")
        return jsonify({"error": f"Failed to add channel: {str(e)}"}), 500

@channel_bp.route("/remove", methods=["POST"])
@auth_and_csrf_required
@limiter.limit("10 per minute")
def remove_channel(data):
    body = request.get_json()
    channel_id = body.get("channelId")

    if not channel_id:
        return jsonify({"error": "Missing channelId"}), 400

    try:
        user_id = ObjectId(data["user_id"])
        users = mongo.db.users

        result = users.update_one(
            {"_id": user_id},
            {"$pull": {"channels": {"channelId": channel_id}}}
        )

        if result.modified_count == 0:
            return jsonify({"error": "Channel not found or not removed"}), 404

        # Redis cleanup
        redis = current_app.extensions["redis"]
        user_id_str = str(user_id)

        patterns = [
            f"outliers:{user_id_str}:{channel_id}",
            f"insights:{channel_id}:*",
            f"channel_stats:{channel_id}",
            f"channel_metadata:{channel_id}",
            f"channel_videos:{channel_id}:*",
            f"notifs:{user_id_str}:{channel_id}",
        ]

        for pattern in patterns:
            for key in redis.scan_iter(match=pattern):
                redis.delete(key)

        return jsonify({"message": "Channel removed successfully"}), 200

    except Exception as e:
        current_app.logger.error(f"Error while removing channel for user {data['email']}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@channel_bp.route("/<channel_id>/metadata", methods=["GET"])
@auth_and_csrf_required
@limiter.limit("60 per minute")
def get_channel_metadata(data, channel_id):
    if not channel_id or not channel_id.startswith("UC"):
        return jsonify({"error": "Invalid channelId"}), 400

    try:
        redis = current_app.extensions["redis"]
        redis_key = f"channel_metadata:{channel_id}"

        # Try to serve from Redis cache
        cached = get_redis_cache(redis, redis_key)
        if cached:
            return jsonify({"channel": cached})

        yt = get_youtube_client()
        chan_info = yt.channels().list(
            part="snippet,statistics,contentDetails",
            id=channel_id
        ).execute()

        if not chan_info["items"]:
            return jsonify({"error": "Channel not found"}), 404

        meta = parse_channel_metadata(chan_info)

        # Save to Redis cache (TTL: 1 day)
        set_redis_cache(redis, redis_key, meta, ttl_seconds=86400)

        return jsonify({"channel": meta})

    except Exception as e:
        current_app.logger.error(
            f"Failed to fetch metadata for user {data['email']} channelId={channel_id}: {str(e)}"
        )
        return jsonify({"error": "Failed to fetch metadata"}), 500

@channel_bp.route("/<channel_id>/videos", methods=["POST"])
@auth_and_csrf_required
@limiter.limit("20 per minute")
def get_channel_videos(data, channel_id):
    body = request.get_json()
    content_type = (body.get("contentType") or "longform").lower()
    page_token = body.get("pageToken")

    if not channel_id or not channel_id.startswith("UC"):
        return jsonify({"error": "Invalid channelId"}), 400

    try:
        redis = current_app.extensions["redis"]
        redis_key = f"channel_videos:{channel_id}:{content_type}"

        if not page_token:
            cached = get_redis_cache(redis, redis_key)
            if cached:
                # Return max 50 videos from cache
                return jsonify({
                    "videos": cached.get("videos", [])[:50],
                    "nextPageToken": cached.get("nextPageToken")
                })

        yt = get_youtube_client()

        chan_info = yt.channels().list(
            part="snippet,statistics,contentDetails",
            id=channel_id
        ).execute()

        if not chan_info["items"]:
            return jsonify({"error": "Channel not found"}), 404

        meta = parse_channel_metadata(chan_info)
        uploads_id = meta["uploadsId"]

        MAX_SCAN_PAGES = 5
        TARGET_COUNT = 10
        page_count = 0
        filtered_videos = []
        next_token = page_token

        while page_count < MAX_SCAN_PAGES:
            videos_res = fetch_channel_videos(yt, uploads_id, 30, next_token)
            raw_videos = videos_res.get("videos", [])
            next_token = videos_res.get("nextPageToken")

            # Filter videos by content type
            for v in raw_videos:
                is_short = v.get("isShort", False)
                if content_type == "shorts" and not is_short:
                    continue
                if content_type == "longform" and is_short:
                    continue
                filtered_videos.append(v)

            if len(filtered_videos) >= TARGET_COUNT or not next_token:
                break

            page_count += 1

        # Compute outlier scores
        outlier_scores = compute_outlier_scores(filtered_videos)
        for idx, video in enumerate(filtered_videos):
            video["outlierScore"] = outlier_scores[idx]

        # If no pageToken, merge with existing cache
        if not page_token:
            existing_cache = get_redis_cache(redis, redis_key) or {}
            existing_videos = existing_cache.get("videos", [])
            existing_ids = {v["videoId"] for v in existing_videos}

            for vid in filtered_videos:
                if vid["videoId"] not in existing_ids:
                    existing_videos.append(vid)

            existing_videos = existing_videos[:50]  # cap size
            set_redis_cache(redis, redis_key, {
                "videos": existing_videos,
                "nextPageToken": next_token
            }, ttl_seconds=600)  # 10 min cache

        return jsonify({
            "videos": filtered_videos,
            "nextPageToken": next_token
        })

    except Exception as e:
        current_app.logger.error(f"[{data['email']}] Error fetching videos for {channel_id}: {e}")
        return jsonify({"error": "Failed to fetch videos"}), 500

@channel_bp.route("/<channel_id>/insights", methods=["POST"])
@auth_and_csrf_required
@limiter.limit("10 per minute")
def get_channel_insights(data, channel_id):
    from utils.db import get_redis_cache, set_redis_cache

    body = request.get_json()
    my_channel_id = body.get("my_channel_id")

    if not channel_id or not channel_id.startswith("UC"):
        return jsonify({"error": "Invalid channelId"}), 400
    if not my_channel_id or not my_channel_id.startswith("UC"):
        return jsonify({"error": "Missing my_channel_id"}), 400

    redis = current_app.extensions["redis"]
    cache_key = f"insights:{channel_id}:{my_channel_id}"

    cached = get_redis_cache(redis, cache_key)
    if cached:
        return jsonify(cached)

    yt = get_youtube_client()
    chan_info = yt.channels().list(
        part="snippet,statistics,contentDetails",
        id=channel_id
    ).execute()

    if not chan_info["items"]:
        return jsonify({"error": "Channel not found"}), 404

    meta = parse_channel_metadata(chan_info)
    uploads_id = meta["uploadsId"]

    videos_res = fetch_channel_videos(yt, uploads_id, 5)
    videos = videos_res.get("videos", [])
    insights = analyze_channel_insights(meta["description"], videos)

    if not insights or any(
        insights.get(k, "Unknown") == "Unknown"
        for k in ["analyzedStyle", "analyzedNiche", "analyzedAttentionMarket"]
    ):
        return jsonify({"error": "Could not analyze channel — no videos or unknown insights"}), 400

    user_doc = mongo.db.users.find_one({"_id": ObjectId(data["user_id"])})
    if not user_doc:
        return jsonify({"error": "User not found"}), 400

    my_profile = next(
        (ch for ch in user_doc.get("channels", []) if ch.get("channelId") == my_channel_id),
        None
    )
    if not my_profile:
        return jsonify({"error": "Could not find your channel profile in your saved channels. Add it first."}), 400

    user_attention_vector = embed_text(my_profile.get("analyzedAttentionMarket", ""))
    comp_attention_vector = embed_text(insights["analyzedAttentionMarket"])
    attention_similarity = cosine_similarity(comp_attention_vector, user_attention_vector)

    user_niche_vector = embed_text(my_profile.get("analyzedNiche", "unknown"))
    comp_niche_vector = embed_text(insights["analyzedNiche"])
    niche_similarity = cosine_similarity(comp_niche_vector, user_niche_vector)

    niche_match = niche_similarity >= 0.995
    style_match = insights["analyzedStyle"].lower() == my_profile.get("analyzedStyle", "").lower()

    my_main_topic = extract_main_topic(my_profile.get("analyzedNiche", "unknown"))
    comp_main_topic = extract_main_topic(insights["analyzedNiche"])
    topic_match = my_main_topic == comp_main_topic

    try:
        user_age, user_gender, user_motive_str = my_profile.get("analyzedAttentionMarket", "unknown, unknown, []").split(", ", 2)
        comp_age, comp_gender, comp_motive_str = insights["analyzedAttentionMarket"].split(", ", 2)

        user_motives = parse_motives(user_motive_str)
        comp_motives = parse_motives(comp_motive_str)

    except Exception:
        user_age, user_gender, user_motives = "unknown", "unknown", []
        comp_age, comp_gender, comp_motives = "unknown", "unknown", []

    diff_count = 0
    if user_age != comp_age:
        diff_count += 1
    if user_gender != comp_gender:
        diff_count += 1
    if len(set(user_motives) & set(comp_motives)) == 0:
        diff_count += 1

    if attention_similarity < 0.55 or diff_count >= 2:
        competitor_type = "Non-Competitor"
    elif attention_similarity < 0.7:
        competitor_type = "Distant"
    elif niche_match and style_match:
        competitor_type = (
            "Direct" if attention_similarity >= 0.85 else
            "Indirect" if attention_similarity >= 0.75 else
            "Adjacent"
        )
    elif topic_match:
        competitor_type = (
            "Indirect" if attention_similarity >= 0.75 else
            "Adjacent" if attention_similarity >= 0.65 else
            "Distant"
        )
    elif niche_match:
        competitor_type = (
            "Indirect" if attention_similarity >= 0.8 else
            "Adjacent" if attention_similarity >= 0.7 else
            "Distant"
        )
    elif style_match:
        competitor_type = (
            "Adjacent" if attention_similarity >= 0.8 else "Distant"
        )
    else:
        competitor_type = "Distant"

    response = {
        "insights": {
            "niche": insights["analyzedNiche"],
            "style": insights["analyzedStyle"],
            "attentionMarket": insights["analyzedAttentionMarket"],
            "competitorType": competitor_type,
            "attentionMarketSimilarity": round(attention_similarity, 3)
        }
    }

    set_redis_cache(redis, cache_key, response, ttl_seconds=86400)  # 24 hours

    current_app.logger.info(
        f"User {data['email']} ran insights on their {channel_id} vs {my_channel_id}"
    )

    return jsonify(response)