from flask import Blueprint, request, jsonify, current_app
from utils.security import auth_and_csrf_required
from googleapiclient.discovery import build
import statistics

niche_explorer_bp = Blueprint("niche_explorer", __name__)

def compute_channel_score(subs, total_views, num_videos_total, recent_views):
    recent_avg_views = statistics.mean(recent_views) if recent_views else 0
    num_videos_analyzed = len(recent_views)

    views_per_video_total = total_views / (num_videos_total + 1)
    views_per_sub = (recent_avg_views / subs) if subs > 0 else 0

    raw_score = (
        views_per_video_total * 2.0 +
        views_per_sub * 3.0 +
        recent_avg_views * 1.0
    )

    result = {
        "subscriberCount": subs,
        "total_views": total_views,
        "num_videos_total": num_videos_total,
        "recent_avg_views": round(recent_avg_views),
        "num_videos_analyzed": num_videos_analyzed,
        "raw_score": round(raw_score, 2),
        "score": 0
    }

    return result, raw_score

@niche_explorer_bp.route("/search", methods=["POST"])
@auth_and_csrf_required
def niche_search(user_data):
    data = request.get_json()
    keyword = data.get("keyword", "").strip()
    search_type = data.get("type", "channels")

    if not keyword:
        return jsonify({"error": "Missing keyword"}), 400

    yt = build("youtube", "v3", developerKey=current_app.config["GOOGLE_YT_API_KEY"])

    if search_type == "channels":
        video_search = yt.search().list(
            part="snippet",
            q=keyword,
            type="video",
            maxResults=100
        ).execute()

        video_items = video_search.get("items", [])
        channel_view_map = {}

        video_ids = [vid["id"]["videoId"] for vid in video_items if "videoId" in vid["id"]]

        for chunk_start in range(0, len(video_ids), 50):
            chunk_ids = video_ids[chunk_start:chunk_start + 50]
            video_details = yt.videos().list(
                part="snippet,statistics",
                id=",".join(chunk_ids)
            ).execute()

            for vid in video_details.get("items", []):
                ch_id = vid["snippet"]["channelId"]
                views = int(vid.get("statistics", {}).get("viewCount", 0))
                if ch_id not in channel_view_map:
                    channel_view_map[ch_id] = {"views": [], "video_count": 0}
                channel_view_map[ch_id]["views"].append(views)
                channel_view_map[ch_id]["video_count"] += 1

        top_channels = sorted(channel_view_map.items(), key=lambda x: x[1]["video_count"], reverse=True)[:20]
        channel_ids = [ch[0] for ch in top_channels]

        chan_info = yt.channels().list(
            part="snippet,statistics,contentDetails",
            id=",".join(channel_ids)
        ).execute()

        results = []
        scores = []

        for ch in chan_info.get("items", []):
            try:
                ch_id = ch["id"]
                title = ch["snippet"]["title"]
                avatar = ch["snippet"]["thumbnails"]["default"]["url"]
                subs = int(ch["statistics"].get("subscriberCount", 0))
                total_views = int(ch["statistics"].get("viewCount", 0))
                num_videos_total = int(ch["statistics"].get("videoCount", 0))

                # Filter 1 — skip corporate / mass channels
                if num_videos_total > 1000:
                    continue

                uploads_playlist = ch["contentDetails"]["relatedPlaylists"]["uploads"]

                uploads_resp = yt.playlistItems().list(
                    part="contentDetails",
                    playlistId=uploads_playlist,
                    maxResults=20
                ).execute()

                upload_video_ids = [item["contentDetails"]["videoId"] for item in uploads_resp.get("items", [])]

                vid_details = yt.videos().list(
                    part="statistics",
                    id=",".join(upload_video_ids)
                ).execute()

                recent_views = [
                    int(vid.get("statistics", {}).get("viewCount", 0))
                    for vid in vid_details.get("items", [])
                ]

                score_obj, raw_score = compute_channel_score(
                    subs=subs,
                    total_views=total_views,
                    num_videos_total=num_videos_total,
                    recent_views=recent_views
                )

                score_obj.update({
                    "channelId": ch_id,
                    "title": title,
                    "avatar": avatar.replace("http://", "https://"),
                    "url": f"https://www.youtube.com/channel/{ch_id}",
                    "subscriberCount": subs
                })

                # Filter 2 — skip dead channels (recent_avg_views < 5% of subs)
                if subs == 0 or score_obj["recent_avg_views"] < (0.05 * subs):
                    continue

                results.append(score_obj)
                scores.append(raw_score)

            except Exception as e:
                current_app.logger.error(f"Error processing channel {ch['id']}: {e}")

        if scores:
            min_score = min(scores)
            max_score = max(scores)
            score_range = max(max_score - min_score, 1e-6)

            for obj, raw in zip(results, scores):
                norm_score = (raw - min_score) / score_range
                obj["score"] = round(norm_score * 100, 1)

        current_app.logger.info(
            f"User {user_data['email']} ran niche search '{keyword}' and fetched {len(results)} channels."
        )
        return jsonify(results), 200

    else:
        video_search = yt.search().list(
            part="snippet",
            q=keyword,
            type="video",
            maxResults=25
        ).execute()

        video_items = video_search.get("items", [])
        video_results = [
            {
                "videoId": vid["id"]["videoId"],
                "title": vid["snippet"]["title"],
                "thumbnail": vid["snippet"]["thumbnails"]["high"]["url"].replace("http://", "https://"),
                "channelTitle": vid["snippet"]["channelTitle"],
                "publishedAt": vid["snippet"]["publishedAt"]
            }
            for vid in video_items
            if "videoId" in vid["id"]
        ]

        current_app.logger.info(
            f"User {user_data['email']} ran video search '{keyword}' and fetched {len(video_results)} videos."
        )
        return jsonify(video_results), 200