from flask import Blueprint, jsonify, request, current_app
from utils.security import auth_and_csrf_required
from extensions import limiter, mongo
import json

notifications_bp = Blueprint("notifications", __name__)

@notifications_bp.route("/list", methods=["GET"])
@auth_and_csrf_required
@limiter.limit("60 per minute")
def get_notifications(user_data):
    channel_id = request.args.get("channelId")
    if not channel_id:
        return jsonify({"error": "channelId query parameter is required"}), 400

    user_id = str(user_data["user_id"])
    owns_channel = mongo.db.users.find_one({
        "_id": user_data["user_id"],
        "channels.channelId": channel_id
    }, {"_id": 1})

    if not owns_channel:
        return jsonify({"error": "You don't have access to this channel"}), 403

    redis = current_app.extensions["redis"]
    redis_key = f"notifs:{user_id}:{channel_id}"

    try:
        raw = redis.lrange(redis_key, 0, -1)
        parsed = [json.loads(entry) for entry in raw]
        return jsonify(parsed), 200
    except Exception as e:
        current_app.logger.error(f"[{user_data['email']}] Redis error: {e}")
        return jsonify({"error": "Failed to fetch notifications"}), 500


@notifications_bp.route("/mark-read", methods=["POST"])
@auth_and_csrf_required
@limiter.limit("60 per minute")
def mark_notifications_read(user_data):
    data = request.get_json()
    channel_id = data.get("channelId")
    if not channel_id:
        return jsonify({"error": "channelId is required"}), 400

    user_id = str(user_data["user_id"])
    owns_channel = mongo.db.users.find_one({
        "_id": user_data["user_id"],
        "channels.channelId": channel_id
    }, {"_id": 1})

    if not owns_channel:
        return jsonify({"error": "You don't have access to this channel"}), 403

    redis = current_app.extensions["redis"]
    redis_key = f"notifs:{user_id}:{channel_id}"

    try:
        notifications = redis.lrange(redis_key, 0, -1)
        if not notifications:
            return jsonify({"success": True, "updatedCount": 0}), 200

        updated_notifications = []
        for raw in notifications:
            parsed = json.loads(raw)
            parsed["read"] = True
            updated_notifications.append(json.dumps(parsed))

        redis.delete(redis_key)
        if updated_notifications:
            redis.rpush(redis_key, *updated_notifications)

        return jsonify({"success": True, "updatedCount": len(updated_notifications)}), 200

    except Exception as e:
        current_app.logger.error(f"Failed to mark notifications read for user {user_id}: {e}")
        return jsonify({"error": "Internal server error"}), 500