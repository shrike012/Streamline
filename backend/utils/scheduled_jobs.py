from flask import current_app
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from utils.youtube_api import get_youtube_client, fetch_channel_videos
from utils.parser import extract_main_topic, chunkify
import statistics, isodate
from dateutil import parser as date_parser

def find_outliers_for_channel(user_id: str, user_email: str, user_channel: dict):
    mongo = current_app.extensions["pymongo"]
    outliers = mongo.db.outliers
    yt = get_youtube_client()

    channel_id = user_channel.get("channelId")

    user_doc = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    user_channel_ids = [ch["channelId"] for ch in user_doc.get("channels", [])]

    search_term = []
    if user_channel.get("analyzedNiche", "").strip():
        search_term.append(user_channel["analyzedNiche"].strip())
    if user_channel.get("analyzedNiche", "").strip():
        main_topic = extract_main_topic(user_channel["analyzedNiche"].strip())
        if main_topic:
            search_term.append(main_topic)

    now = datetime.now(timezone.utc).replace(microsecond=0)
    published_after = (now - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")

    search_results = []
    for kw in search_term:
        try:
            res = yt.search().list(
                q=kw, type="video", part="snippet", maxResults=50,
                videoDuration="medium", publishedAfter=published_after, order="viewCount",
            ).execute()

            videos = res.get("items", [])

            search_results.extend(videos)
        except Exception as e:
            current_app.logger.error(f"[{user_email}] Search failed for '{kw}': {e}")

    seen_ids, deduped = set(), []
    for item in search_results:
        vid = item.get("id", {}).get("videoId")
        if vid and vid not in seen_ids:
            seen_ids.add(vid)
            deduped.append(item)

    video_ids = [item["id"]["videoId"] for item in deduped]
    detailed_videos = []
    for chunk in chunkify(video_ids, 50):
        stats_res = yt.videos().list(id=",".join(chunk), part="snippet,statistics,contentDetails").execute()
        for item in stats_res.get("items", []):
            stats, snippet = item.get("statistics", {}), item["snippet"]
            view_count = int(stats.get("viewCount", 0)) if stats.get("viewCount") else 0
            content = item.get("contentDetails", {})

            iso_duration = content.get("duration") or "PT0S"
            duration = isodate.parse_duration(iso_duration)
            total_seconds = int(duration.total_seconds())
            mins, secs = divmod(total_seconds, 60)
            hrs, mins = divmod(mins, 60)

            length_str = f"{hrs}:{mins:02}:{secs:02}" if hrs > 0 else f"{mins}:{secs:02}"
            detailed_videos.append({
                "videoId": item["id"],
                "title": snippet["title"],
                "publishedAt": snippet["publishedAt"],
                "viewCount": view_count,
                "channelId": snippet["channelId"],
                "channelTitle": snippet["channelTitle"],
                "length": length_str,
            })

    detailed_videos = [v for v in detailed_videos if v["channelId"] not in user_channel_ids]

    found_outliers = []

    for vid in detailed_videos:
        candidate_channel_id = vid["channelId"]

        try:
            chan_info = yt.channels().list(part="contentDetails", id=candidate_channel_id).execute()
            chan_items = chan_info.get("items", [])
            if not chan_items:
                continue

            uploads_id = chan_items[0]["contentDetails"]["relatedPlaylists"]["uploads"]
            playlist_items = yt.playlistItems().list(
                part="contentDetails", playlistId=uploads_id, maxResults=15
            ).execute()
            recent_video_ids = [item["contentDetails"]["videoId"] for item in playlist_items.get("items", [])]

            recent_views = []
            for rchunk in chunkify(recent_video_ids, 50):
                recent_res = yt.videos().list(id=",".join(rchunk), part="statistics").execute()
                for rvid in recent_res.get("items", []):
                    rv = int(rvid.get("statistics", {}).get("viewCount", 0))
                    if rv > 0:
                        recent_views.append(rv)

            median_views = statistics.median(recent_views) if recent_views else 0
            outlierScore = vid["viewCount"] / median_views if median_views > 0 else 0

            if outlierScore >= 2.0 and vid["viewCount"] >= 5000:
                outlier_doc = {
                    "userId": ObjectId(user_id),
                    "videoId": vid["videoId"],
                    "channelId": vid["channelId"],
                    "title": vid["title"],
                    "channelTitle": vid["channelTitle"],
                    "outlierScore": round(outlierScore, 2),
                    "views": vid["viewCount"],
                    "publishedAt": vid["publishedAt"],
                    "createdAt": datetime.now(timezone.utc),
                }
                found_outliers.append(outlier_doc)

        except Exception as e:
            current_app.logger.error(
                f"[{user_email}] Error analyzing candidate channel {candidate_channel_id}: {e}"
            )

    outliers.delete_many({"userId": ObjectId(user_id), "channelId": channel_id})
    outliers.update_one(
        {"userId": ObjectId(user_id), "channelId": channel_id},
        {"$set": {"outliers": found_outliers, "updatedAt": datetime.now(timezone.utc)}},
        upsert=True
    )

def refresh_all_outliers_for_all_users():
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users.find({})
    for user in users:
        user_id = str(user["_id"])
        email = user.get("email", "unknown")
        channels = user.get("channels", [])
        for user_channel in channels:
            try:
                find_outliers_for_channel(user_id, email, user_channel)
            except Exception as e:
                current_app.logger.error(
                    f"Error refreshing outliers for user {email} channel {user_channel.get('channelId')}: {e}"
                )

def check_competitors_for_all_users():
    mongo = current_app.extensions["pymongo"]
    yt = get_youtube_client()

    users = list(mongo.db.users.find({}))

    for user in users:
        user_id = user["_id"]
        email = user.get("email", "unknown")

        if not user.get("channels") or not user.get("notificationsEnabled", True):
            continue

        for channel_profile in user["channels"]:
            selected_channel_id = channel_profile.get("channelId")
            if not selected_channel_id:
                continue

            lists = list(mongo.db.competitor_lists.find({"channelId": selected_channel_id}))
            for comp_list in lists:
                competitors = list(mongo.db.competitors.find({"listId": comp_list["listId"]}))

                for comp in competitors:
                    comp_channel_id = comp["competitorChannelId"]
                    last_checked = comp.get("lastChecked")
                    uploads_since = datetime.min.replace(tzinfo=timezone.utc) if not last_checked else last_checked

                    try:
                        chan_info = yt.channels().list(
                            part="contentDetails",
                            id=comp_channel_id
                        ).execute()

                        items = chan_info.get("items", [])
                        if not items:
                            continue  # skip invalid or deleted channels

                        uploads_id = items[0]["contentDetails"]["relatedPlaylists"]["uploads"]
                        videos_res = fetch_channel_videos(yt, uploads_id, 1)
                        videos = videos_res.get("videos") if videos_res else []
                        latest_video = videos[0] if videos else None

                        if latest_video:
                            published_at = date_parser.parse(latest_video["publishedAt"]).astimezone(timezone.utc)
                            if published_at > uploads_since:

                                # Insert new notification
                                mongo.db.notifications.insert_one({
                                    "userId": user_id,
                                    "channelId": comp_channel_id,
                                    "message": f"New video from {comp.get('title', 'a competitor')}: {latest_video['title']}",
                                    "timestamp": datetime.now(timezone.utc),
                                    "read": False,
                                })

                                # Prune excess notifications: keep only latest 20 for each user-channel
                                excess_notifications = mongo.db.notifications.find(
                                    {"userId": user_id, "channelId": comp_channel_id}
                                ).sort("timestamp", -1).skip(20)

                                excess_ids = [n["_id"] for n in excess_notifications]
                                if excess_ids:
                                    mongo.db.notifications.delete_many({"_id": {"$in": excess_ids}})

                                # Update competitor last checked timestamp
                                mongo.db.competitors.update_one(
                                    {"_id": comp["_id"]},
                                    {"$set": {"lastChecked": datetime.now(timezone.utc)}}
                                )
                    except Exception as e:
                        current_app.logger.error(f"Error checking channel {comp_channel_id} for user {email}: {e}")
