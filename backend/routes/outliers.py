from flask import Blueprint, request, jsonify, current_app
from utils.security import auth_and_csrf_required
from bson import ObjectId

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
def list_outliers(data):
    try:
        mongo = current_app.extensions["pymongo"]
        outliers = mongo.db.outliers
        user_id = ObjectId(data["user_id"])

        # Get the channelId from query param
        selected_channel_id = request.args.get("channelId")
        if not selected_channel_id:
            return jsonify({"error": "Missing channelId in query"}), 400

        # Fetch user's own channels to exclude own uploads
        user = mongo.db.users.find_one({"_id": user_id})
        user_channel_ids = [ch["channelId"] for ch in user.get("channels", [])]

        # Fetch outlier docs only for this channel
        docs = list(outliers.find({
            "userId": user_id,
            "channelId": selected_channel_id
        }))

        combined_outliers = []
        for doc in docs:
            for outlier in doc.get("outliers", []):
                video_channel_id = outlier.get("videoChannelId")
                if video_channel_id in user_channel_ids:
                    continue  # skip own uploads
                combined_outliers.append(outlier)

        return jsonify(convert_objectids(combined_outliers))

    except Exception as e:
        current_app.logger.error(f"Failed to fetch outliers for user {data['email']}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500