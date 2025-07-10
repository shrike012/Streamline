from flask import Blueprint, request, jsonify, current_app
from utils.parser import chunkify
from utils.security import auth_and_csrf_required
from utils.embeddings import embed_text, cosine_similarity
import statistics, datetime, math, isodate
from utils.youtube_api import get_youtube_client
import re
from extensions import limiter

niche_explorer_bp = Blueprint("niche_explorer", __name__)

MAX_CHANNELS = 30
ENGAGEMENT_THRESHOLD = 0.1
RELEVANCE_THRESHOLD = 0.25

@niche_explorer_bp.route("/search", methods=["POST"])
@auth_and_csrf_required
@limiter.limit("5 per minute")
def niche_search(user_data):
    data = request.get_json()
    query = data.get("query", "").strip()
    time_frame = data.get("time_frame", "last_month")
    video_type = data.get("video_type", "longform")

    if not query:
        return jsonify({"error": "Missing query"}), 400

    if len(query) > 100:
        return jsonify({"error": "Query too long (max 100 characters)"}), 400

    if not re.match(r"^[\w\s\-.,!?':()]+$", query):
        return jsonify({"error": "Query contains unsupported characters"}), 400

    timeframes = {
        "last_week": 7,
        "last_month": 30,
        "last_year": 365,
        "last_2_years": 730,
    }

    if time_frame not in timeframes:
        return jsonify({"error": "Invalid time_frame"}), 400

    now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
    published_after = (
        now - datetime.timedelta(days=timeframes[time_frame])
    ).strftime("%Y-%m-%dT%H:%M:%SZ")

    yt = get_youtube_client()

    # Initial video search
    if video_type == "shorts":
        search = yt.search().list(
            part="snippet",
            q=query,
            type="video",
            order="viewCount",
            publishedAfter=published_after,
            videoDuration="short",
            maxResults=50
        ).execute()
        video_items = search.get("items", [])
    elif video_type == "longform":
        medium = yt.search().list(
            part="snippet",
            q=query,
            type="video",
            order="viewCount",
            publishedAfter=published_after,
            videoDuration="medium",
            maxResults=50
        ).execute()
        long = yt.search().list(
            part="snippet",
            q=query,
            type="video",
            order="viewCount",
            publishedAfter=published_after,
            videoDuration="long",
            maxResults=50
        ).execute()
        video_items = medium.get("items", []) + long.get("items", [])
    else:
        return jsonify({"error": "Invalid video_type"}), 400

    query_vector = embed_text(query)

    # Determine relevant videos initially
    video_info = []
    for vid in video_items:
        snippet = vid.get("snippet", {})
        combined = f"{snippet.get('title', 'N/A')} {snippet.get('channelTitle', 'N/A')}"
        video_info.append((vid, combined))

    combined_vectors = embed_text([combined for _, combined in video_info])

    relevant_videos = []
    for idx, (vid, _) in enumerate(video_info):
        sim = cosine_similarity(query_vector, combined_vectors[idx])
        if sim >= RELEVANCE_THRESHOLD:
            relevant_videos.append(vid)

    channel_ids = list({vid["snippet"]["channelId"] for vid in relevant_videos if "videoId" in vid["id"]})
    channel_ids = channel_ids[:MAX_CHANNELS]

    # Fetch channels & recent uploads
    channel_map = {}
    for chunk in chunkify(channel_ids, 20):
        details = yt.channels().list(part="snippet,statistics,contentDetails", id=",".join(chunk)).execute()
        for chan in details.get("items", []):
            ch_id = chan["id"]
            uploads_id = chan["contentDetails"]["relatedPlaylists"]["uploads"]
            channel_map[ch_id] = {
                "channelId": ch_id,
                "channelTitle": chan["snippet"]["title"],
                "avatar": chan["snippet"]["thumbnails"]["default"]["url"].replace("http://", "https://"),
                "subscriberCount": int(chan.get("statistics", {}).get("subscriberCount", 0)),
                "recentTitles": [],
                "recentViews": [],
                "description": chan["snippet"].get("description", "")
            }

            playlist_items = yt.playlistItems().list(
                part="snippet,contentDetails",
                playlistId=uploads_id,
                maxResults=10
            ).execute()
            video_ids = [item["contentDetails"]["videoId"] for item in playlist_items.get("items", [])]

            for vchunk in chunkify(video_ids, 50):
                vids = yt.videos().list(part="snippet,statistics,contentDetails", id=",".join(vchunk)).execute()
                for vid in vids.get("items", []):
                    snippet = vid["snippet"]
                    title = snippet["title"]
                    views = int(vid.get("statistics", {}).get("viewCount", 0))
                    dur = isodate.parse_duration(vid.get("contentDetails", {}).get("duration", "PT0S")).total_seconds()

                    if not ((video_type == "shorts" and dur > 180) or (video_type == "longform" and dur <= 180)):
                        channel_map[ch_id]["recentViews"].append(views)

                    channel_map[ch_id]["recentTitles"].append(title)

    # Engagement filter
    filtered = {}
    for ch_id, ch in channel_map.items():
        subs = ch["subscriberCount"]
        top_views = max(ch["recentViews"], default=0)
        engagement = top_views / (subs + 1)
        if engagement >= ENGAGEMENT_THRESHOLD:
            filtered[ch_id] = ch

    # Embed combined text & determine relevance
    combined_texts, combined_ch_keys = [], []
    for ch_id, ch in filtered.items():
        combined_titles = " ".join(ch["recentTitles"])
        desc = ch.get("description", "").replace("\n", " ")[:500]
        combined_text = f"{combined_titles} {ch['channelTitle']} {desc}"
        combined_texts.append(combined_text)
        combined_ch_keys.append(ch_id)

    final_channel_map = {}
    if combined_texts:
        combined_vectors = embed_text(combined_texts)
        for idx, ch_id in enumerate(combined_ch_keys):
            sim = cosine_similarity(query_vector, combined_vectors[idx])
            if sim >= RELEVANCE_THRESHOLD:
                final_channel_map[ch_id] = filtered[ch_id]

    # Score & sort
    results = []
    for ch in final_channel_map.values():
        subs = ch["subscriberCount"]
        top_views = max(ch["recentViews"], default=0)
        median_views = statistics.median(ch["recentViews"]) if ch["recentViews"] else 0
        upload_activity = len(ch["recentViews"])

        median_vs_subs = median_views / (subs + 1)
        peak_vs_subs = top_views / (subs + 1)
        peak_vs_median = top_views / (median_views + 1)

        raw_score = (median_vs_subs * 6.0) + (peak_vs_subs * 3.0) + (peak_vs_median * 1.0) + math.log10(upload_activity + 1) * 2.0

        ch.update({"score": round(raw_score, 2)})
        results.append(ch)

    results.sort(key=lambda x: x["score"], reverse=True)

    current_app.logger.info(
        f"User {user_data['email']} ran niche search '{query}' time_frame={time_frame} type={video_type} and fetched {len(results)} channels."
    )
    return jsonify(results), 200