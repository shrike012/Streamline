from flask import Blueprint, request, jsonify, current_app
from utils.security import token_required

saved_bp = Blueprint("saved", __name__, url_prefix="/api/saved")


@saved_bp.route("/lists", methods=["GET"])
@token_required
def get_lists():
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    user = users.find_one({"email": request.user_email}, {"savedLists": 1})
    return jsonify({"lists": user.get("savedLists", [])})

@saved_bp.route("/lists", methods=["POST"])
@token_required
def save_lists():
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    lists = request.get_json().get("lists", [])
    users.update_one(
        {"email": request.user_email},
        {"$set": {"savedLists": lists}}
    )

    return jsonify({"message": "Saved lists updated"}), 200


@saved_bp.route("/notes", methods=["GET"])
@token_required
def get_notes():
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    user = users.find_one({"email": request.user_email}, {"savedNotes": 1})
    return jsonify(user.get("savedNotes", []))


@saved_bp.route("/notes", methods=["POST"])
@token_required
def save_notes():
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    notes = request.get_json().get("notes", [])
    users.update_one(
        {"email": request.user_email},
        {"$set": {"savedNotes": notes}}
    )

    return jsonify({"message": "Saved notes updated"}), 200