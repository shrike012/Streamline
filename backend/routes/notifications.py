from flask import Blueprint, jsonify, current_app, request
from utils.security import auth_and_csrf_required
from bson import ObjectId

notifications_bp = Blueprint("notifications", __name__)

@notifications_bp.route("/list", methods=["GET"])
@auth_and_csrf_required
def get_notifications(user_data):
    mongo = current_app.extensions["pymongo"]
    channel_id = request.args.get("channelId")

    if not channel_id:
        return jsonify({"error": "channelId query parameter is required"}), 400

    notifications = list(
        mongo.db.notifications.find(
            {
                "userId": ObjectId(user_data["user_id"]),
                "channelId": channel_id,
            }
        ).sort("timestamp", -1)
    )

    for n in notifications:
        n["_id"] = str(n["_id"])
        n["userId"] = str(n["userId"])

    return jsonify(notifications), 200

@notifications_bp.route("/mark-read", methods=["POST"])
@auth_and_csrf_required
def mark_notifications_read(user_data):
    mongo = current_app.extensions["pymongo"]
    data = request.get_json()
    channel_id = data.get("channelId")

    if not channel_id:
        return jsonify({"error": "channelId is required"}), 400

    result = mongo.db.notifications.update_many(
        {
            "userId": ObjectId(user_data["user_id"]),
            "channelId": channel_id,
            "read": False,
        },
        {"$set": {"read": True}}
    )
    return jsonify({"success": True, "updatedCount": result.modified_count}), 200