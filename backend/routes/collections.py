from flask import Blueprint, request, jsonify, current_app
from utils.security import auth_and_csrf_required
from bson import ObjectId
import uuid
from extensions import limiter, mongo

collections_bp = Blueprint("collections", __name__)

@collections_bp.route("/list", methods=["GET"])
@auth_and_csrf_required
@limiter.limit("20 per minute")
def get_saved_collections(data):
    users = mongo.db.users

    user = users.find_one({"_id": ObjectId(data["user_id"])}, {"savedCollections": 1})
    collections = user.get("savedCollections", [])
    return jsonify(collections), 200

@collections_bp.route("/create", methods=["POST"])
@auth_and_csrf_required
@limiter.limit("5 per minute")
def create_saved_collection(data):
    users = mongo.db.users

    req = request.get_json()
    name = req.get("name", "").strip()
    if not name:
        return jsonify({"error": "Collection name required"}), 400

    formatted_name = " ".join(word.capitalize() for word in name.split())

    user = users.find_one({"_id": ObjectId(data["user_id"])}, {"savedCollections": 1})
    if user is None:
        return jsonify({"error": "User not found"}), 404

    existing_collections = user.get("savedCollections", [])
    if any(col["name"].lower() == formatted_name.lower() for col in existing_collections):
        return jsonify({"error": "Collection name already exists"}), 400

    new_collection = {
        "collectionId": str(uuid.uuid4()),
        "name": formatted_name,
        "videos": [],
    }

    result = users.update_one(
        {"_id": ObjectId(data["user_id"])},
        {"$push": {"savedCollections": new_collection}}
    )

    if result.modified_count == 0:
        return jsonify({"error": "Failed to add collection"}), 500

    return jsonify(new_collection), 201

@collections_bp.route("/<collection_id>/rename", methods=["POST"])
@auth_and_csrf_required
@limiter.limit("10 per minute")
def rename_saved_collection(data, collection_id):
    users = mongo.db.users

    req = request.get_json()
    new_name = req.get("name", "").strip()
    if not new_name:
        return jsonify({"error": "New name required"}), 400

    formatted_name = " ".join(word.capitalize() for word in new_name.split())

    user = users.find_one({"_id": ObjectId(data["user_id"])}, {"savedCollections": 1})
    if user is None:
        return jsonify({"error": "User not found"}), 404

    existing_collections = user.get("savedCollections", [])
    if any(
        col["name"].lower() == formatted_name.lower()
        and col["collectionId"] != collection_id
        for col in existing_collections
    ):
        return jsonify({"error": "Collection name already exists"}), 400

    result = users.update_one(
        {"_id": ObjectId(data["user_id"]), "savedCollections.collectionId": collection_id},
        {"$set": {"savedCollections.$.name": formatted_name}}
    )

    if result.modified_count == 0:
        return jsonify({"error": "Failed to rename collection"}), 404

    return jsonify({"message": "Collection renamed"}), 200

@collections_bp.route("/<collection_id>/videos/<video_id>", methods=["DELETE"])
@auth_and_csrf_required
@limiter.limit("10 per minute")
def remove_video_from_collection(data, collection_id, video_id):
    users = mongo.db.users

    result = users.update_one(
        {
            "_id": ObjectId(data["user_id"]),
            "savedCollections.collectionId": collection_id,
        },
        {
            "$pull": {"savedCollections.$.videos": {"videoId": video_id}},
        },
    )

    if result.modified_count == 0:
        return jsonify({"error": "Failed to remove video"}), 404

    return jsonify({"message": "Video removed"}), 200

@collections_bp.route("/<collection_id>", methods=["DELETE"])
@auth_and_csrf_required
@limiter.limit("15 per minute")
def delete_saved_collection(data, collection_id):
    users = mongo.db.users

    result = users.update_one(
        {"_id": ObjectId(data["user_id"])},
        {"$pull": {"savedCollections": {"collectionId": collection_id}}}
    )

    if result.modified_count == 0:
        return jsonify({"error": "Failed to delete collection"}), 404

    return jsonify({"message": "Collection deleted"}), 200

@collections_bp.route("/<collection_id>/videos", methods=["GET"])
@auth_and_csrf_required
@limiter.limit("20 per minute")
def get_videos_in_collection(data, collection_id):
    users = mongo.db.users

    user = users.find_one(
        {"_id": ObjectId(data["user_id"]), "savedCollections.collectionId": collection_id},
        {"savedCollections.$": 1}
    )
    if not user or "savedCollections" not in user:
        return jsonify({"error": "Collection not found"}), 404

    collection = user["savedCollections"][0]
    return jsonify({"videos": collection.get("videos", [])}), 200

@collections_bp.route("/<collection_id>/videos", methods=["POST"])
@auth_and_csrf_required
@limiter.limit("20 per minute")
def add_video_to_collection(data, collection_id):
    users = mongo.db.users

    req = request.get_json()
    video = req.get("video")

    if not video or not isinstance(video, dict) or "videoId" not in video:
        return jsonify({"error": "Invalid video object"}), 400

    video_id = video["videoId"]

    user = users.find_one(
        {"_id": ObjectId(data["user_id"])},
        {"savedCollections": 1}
    )

    if not user:
        return jsonify({"error": "User not found"}), 404

    collection = next(
        (c for c in user.get("savedCollections", []) if c["collectionId"] == collection_id),
        None
    )
    if not collection:
        return jsonify({"error": "Collection not found"}), 404

    if any(v["videoId"] == video_id for v in collection.get("videos", [])):
        return jsonify({"error": "Video already exists in this collection"}), 400

    if len(collection.get("videos", [])) >= 1000:
        return jsonify({"error": "Collection has reached the video limit"}), 400

    video_doc = {
        "title": video["title"],
        "thumbnail": video["thumbnail"],
        "videoId": video["videoId"],
        "length": video["length"],
        "channelTitle": video["channelTitle"],
        "channelId": video.get("channelId"),
        "viewCount": video["viewCount"],
        "publishedAt": video["publishedAt"],
    }

    result = users.update_one(
        {"_id": ObjectId(data["user_id"]), "savedCollections.collectionId": collection_id},
        {"$push": {"savedCollections.$.videos": video_doc}}
    )

    if result.modified_count == 0:
        return jsonify({"error": "Failed to add video"}), 500

    return jsonify({"message": "Video added"}), 200