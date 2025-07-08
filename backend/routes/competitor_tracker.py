from flask import Blueprint, request, jsonify
from utils.db import find_user_channel, update_user_channel, update_cache_document, get_cached_document
from utils.security import auth_and_csrf_required
from bson.objectid import ObjectId
from flask import current_app
from datetime import datetime, timezone
from utils.youtube_api import get_youtube_client

competitor_tracker_bp = Blueprint("competitor_tracker", __name__)

@competitor_tracker_bp.route("/lists/<channel_id>", methods=["GET"])
@auth_and_csrf_required
def get_competitor_lists(user_data, channel_id):
    mongo = current_app.extensions["pymongo"]
    channel_doc = find_user_channel(mongo, user_data["user_id"], channel_id)
    if not channel_doc:
        return jsonify({"error": "Channel not found"}), 404

    competitor_lists = channel_doc.get("competitorLists", [])
    results = [{
        "listId": str(lst["listId"]),
        "name": lst["name"],
        "createdAt": lst["createdAt"]
    } for lst in competitor_lists]
    return jsonify(results), 200

@competitor_tracker_bp.route("/lists/<channel_id>/create", methods=["POST"])
@auth_and_csrf_required
def create_competitor_list(user_data, channel_id):
    data = request.get_json()
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Missing name"}), 400

    formatted_name = " ".join(name.split()).title()

    if len(formatted_name) > 50:
        return jsonify({"error": "List name too long"}), 400

    mongo = current_app.extensions["pymongo"]
    channel_doc = find_user_channel(mongo, user_data["user_id"], channel_id)
    if not channel_doc:
        return jsonify({"error": "Channel not found"}), 404

    existing_lists = channel_doc.get("competitorLists", [])
    if any(lst["name"].lower() == formatted_name.lower() for lst in existing_lists):
        return jsonify({"error": "List name already exists"}), 400

    new_list = {
        "listId": ObjectId(),
        "name": formatted_name,
        "createdAt": datetime.now(timezone.utc),
        "competitors": []
    }

    result = update_user_channel(
        mongo, user_data["user_id"], channel_id,
        {"$push": {"channels.$.competitorLists": new_list}}
    )
    if result.matched_count == 0:
        return jsonify({"error": "Channel not found"}), 404

    return jsonify({"listId": str(new_list["listId"])}), 200

@competitor_tracker_bp.route("/lists/<channel_id>/<list_id>/rename", methods=["POST"])
@auth_and_csrf_required
def rename_competitor_list(user_data, channel_id, list_id):
    data = request.get_json()
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Missing name"}), 400

    formatted_name = " ".join(name.split()).title()

    if len(formatted_name) > 50:
        return jsonify({"error": "List name too long"}), 400

    mongo = current_app.extensions["pymongo"]
    channel_doc = find_user_channel(mongo, user_data["user_id"], channel_id)
    if not channel_doc:
        return jsonify({"error": "Channel not found"}), 404

    existing_lists = channel_doc.get("competitorLists", [])
    if any(
        lst["name"].lower() == formatted_name.lower() and str(lst["listId"]) != list_id
        for lst in existing_lists
    ):
        return jsonify({"error": "List name already exists"}), 400

    result = mongo.db.users.update_one(
        {
            "_id": ObjectId(user_data["user_id"]),
            "channels.channelId": channel_id
        },
        {
            "$set": {"channels.$[c].competitorLists.$[l].name": formatted_name}
        },
        array_filters=[
            {"c.channelId": channel_id},
            {"l.listId": ObjectId(list_id)}
        ]
    )
    if result.matched_count == 0:
        return jsonify({"error": "List not found"}), 404
    return jsonify({"success": True}), 200

@competitor_tracker_bp.route("/lists/<channel_id>/<list_id>/delete", methods=["POST"])
@auth_and_csrf_required
def delete_competitor_list(user_data, channel_id, list_id):
    mongo = current_app.extensions["pymongo"]
    result = update_user_channel(
        mongo, user_data["user_id"], channel_id,
        {"$pull": {"channels.$.competitorLists": {"listId": ObjectId(list_id)}}}
    )
    if result.matched_count == 0:
        return jsonify({"error": "List not found"}), 404
    return jsonify({"success": True}), 200

@competitor_tracker_bp.route("/competitors/<channel_id>/<list_id>", methods=["GET"])
@auth_and_csrf_required
def get_competitors_in_list(user_data, channel_id, list_id):
    mongo = current_app.extensions["pymongo"]
    channel_doc = find_user_channel(mongo, user_data["user_id"], channel_id)
    if not channel_doc:
        return jsonify({"error": "Channel not found"}), 404

    lists = channel_doc.get("competitorLists", [])
    target_list = next((l for l in lists if str(l["listId"]) == list_id), None)
    if not target_list:
        return jsonify({"error": "List not found"}), 404

    results = [{
        "competitorChannelId": comp["competitorChannelId"],
        "channelTitle": comp.get("channelTitle", ""),
        "avatar": comp.get("avatar", ""),
        "subscriberCount": comp.get("subscriberCount", 0),
    } for comp in target_list.get("competitors", [])]
    return jsonify(results), 200

@competitor_tracker_bp.route("/competitors/<channel_id>/<list_id>/add", methods=["POST"])
@auth_and_csrf_required
def add_competitor(user_data, channel_id, list_id):
    data = request.get_json()
    competitor_channel_id = data.get("competitorChannelId", "").strip()
    if not competitor_channel_id:
        return jsonify({"error": "Missing competitor_channel_id"}), 400

    mongo = current_app.extensions["pymongo"]
    channel_doc = find_user_channel(mongo, user_data["user_id"], channel_id)
    if not channel_doc:
        return jsonify({"error": "Channel not found"}), 404

    competitor_lists = channel_doc.get("competitorLists", [])
    target_list = next((l for l in competitor_lists if str(l["listId"]) == list_id), None)
    if not target_list:
        return jsonify({"error": "List not found"}), 404

    already_exists = any(
        c["competitorChannelId"] == competitor_channel_id
        for c in target_list.get("competitors", [])
    )
    if already_exists:
        return jsonify({"error": "Competitor already added to this list"}), 400

    # Try cached metadata first
    cached = get_cached_document(
        mongo=mongo,
        collection_name="channel_metadata",
        query={"channelId": competitor_channel_id},
        ttl_minutes=1440
    )

    if cached:
        channel_title = cached["channelTitle"]
        avatar = cached["avatar"]
        subscriber_count = cached.get("subscriberCount", 0)
    else:
        yt = get_youtube_client()
        chan_info = yt.channels().list(
            part="snippet,statistics",
            id=competitor_channel_id
        ).execute()
        if not chan_info["items"]:
            return jsonify({"error": "Competitor channel not found"}), 404

        snippet = chan_info["items"][0]["snippet"]
        statistics = chan_info["items"][0].get("statistics", {})

        channel_title = snippet["title"]
        avatar = snippet.get("thumbnails", {}).get("default", {}).get("url", "")
        subscriber_count = int(statistics.get("subscriberCount", 0))

        update_cache_document(
            mongo=mongo,
            collection_name="channel_metadata",
            query={"channelId": competitor_channel_id},
            new_data={
                "channelId": competitor_channel_id,
                "channelTitle": channel_title,
                "avatar": avatar,
                "subscriberCount": subscriber_count,
            }
        )

    new_competitor = {
        "competitorChannelId": competitor_channel_id,
        "channelTitle": channel_title,
        "avatar": avatar,
        "subscriberCount": subscriber_count,
        "createdAt": datetime.now(timezone.utc),
    }

    result = update_user_channel(
        mongo, user_data["user_id"], channel_id,
        {
            "$push": {"channels.$[c].competitorLists.$[l].competitors": new_competitor}
        },
        array_filters=[
            {"c.channelId": channel_id},
            {"l.listId": ObjectId(list_id)}
        ]
    )
    if result.matched_count == 0:
        return jsonify({"error": "List not found"}), 404

    return jsonify({"success": True, "competitor": new_competitor}), 200

@competitor_tracker_bp.route("/competitors/<channel_id>/<list_id>/remove", methods=["POST"])
@auth_and_csrf_required
def remove_competitor(user_data, channel_id, list_id):
    data = request.get_json()
    competitor_channel_id = data.get("competitor_channel_id", "").strip()
    if not competitor_channel_id:
        return jsonify({"error": "Missing competitor_channel_id"}), 400

    mongo = current_app.extensions["pymongo"]
    result = update_user_channel(
        mongo, user_data["user_id"], channel_id,
        {
            "$pull": {"channels.$[c].competitorLists.$[l].competitors": {"competitorChannelId": competitor_channel_id}}
        },
        array_filters=[
            {"c.channelId": channel_id},
            {"l.listId": ObjectId(list_id)}
        ]
    )
    if result.matched_count == 0:
        return jsonify({"error": "Competitor or list not found"}), 404
    return jsonify({"success": True}), 200


