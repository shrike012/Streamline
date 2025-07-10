from flask import Blueprint, request, jsonify, current_app
from utils.security import auth_and_csrf_required
from bson import ObjectId
from extensions import limiter, mongo
import json

outliers_bp = Blueprint("outliers", __name__)

def convert_objectids(doc):
    if isinstance(doc, dict):
        return {k: convert_objectids(v) for k, v in doc.items()}
    elif isinstance(doc, list):
        return [convert_objectids(item) for item in doc]
    elif isinstance(doc, ObjectId):
        return str(doc)
    else:
        return doc

@outliers_bp.route("/list", methods=["GET"])
@auth_and_csrf_required
@limiter.limit("60 per minute")
def list_outliers(data):
    try:
        user_id = str(data["user_id"])
        channel_id = request.args.get("channelId")
        if not channel_id:
            return jsonify({"error": "Missing channelId in query"}), 400

        user_doc = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        own_channel_ids = [ch["channelId"] for ch in user_doc.get("channels", [])]

        if channel_id not in own_channel_ids:
            return jsonify({"error": "You don't have access to this channel"}), 403

        redis = current_app.extensions["redis"]
        redis_key = f"outliers:{user_id}:{channel_id}"
        raw = redis.get(redis_key)

        if raw is None:
            return jsonify({"status": "pending"}), 200

        outliers = json.loads(raw)

        # Filter out user's own uploads just in case
        filtered = [o for o in outliers if o.get("channelId") not in own_channel_ids]

        return jsonify(filtered), 200

    except Exception as e:
        current_app.logger.error(f"Failed to fetch outliers for user {user_doc.get('email', 'unknown')}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500