from flask import Blueprint, request, jsonify, current_app
from utils.security import token_required, auth_and_csrf_required

saved_bp = Blueprint("saved", __name__)

@saved_bp.route("/lists", methods=["GET"])
@token_required
def get_lists(data):
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    user = users.find_one({"email": data["email"]}, {"savedLists": 1})
    return jsonify({"lists": user.get("savedLists", [])})

@saved_bp.route("/lists", methods=["POST"])
@auth_and_csrf_required
def save_lists(data):
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    lists = request.get_json().get("lists", [])
    users.update_one(
        {"email": data["email"]},
        {"$set": {"savedLists": lists}}
    )
    current_app.logger.info(f"User {data['email']} updated saved lists: {len(lists)} lists")
    return jsonify({"message": "Saved lists updated"}), 200

@saved_bp.route("/notes", methods=["GET"])
@token_required
def get_notes(data):
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    user = users.find_one({"email": data["email"]}, {"savedNotes": 1})
    return jsonify(user.get("savedNotes", []))

@saved_bp.route("/notes", methods=["POST"])
@auth_and_csrf_required
def save_notes(data):
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    notes = request.get_json().get("notes", [])
    users.update_one(
        {"email": data["email"]},
        {"$set": {"savedNotes": notes}}
    )
    current_app.logger.info(f"User {data['email']} updated saved notes: {len(notes)} notes")
    return jsonify({"message": "Saved notes updated"}), 200