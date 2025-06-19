from flask import Blueprint, request, jsonify, current_app, make_response
from werkzeug.security import generate_password_hash, check_password_hash
from utils.security import token_required, auth_and_csrf_required, generate_token, generate_csrf_token

settings_bp = Blueprint("settings", __name__)

@settings_bp.route("/get", methods=["GET"])
@token_required
def get_settings(data):
    mongo = current_app.extensions["pymongo"]
    user = mongo.db.users.find_one({"email": data["email"]}, {"password": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "email": user["email"],
        "notifications": user.get("notifications_enabled", True),
        "auth_provider": user.get("auth_provider", "local")
    })


@settings_bp.route("/update/email", methods=["POST"])
@auth_and_csrf_required
def update_email(data):
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    body = request.get_json()
    new_email = body.get("email", "").strip().lower()
    current_password = body.get("currentPassword", "")

    if not new_email:
        return jsonify({"error": "Email is required"}), 400

    user = users.find_one({"email": data["email"]})
    if not user or not check_password_hash(user["password"], current_password):
        return jsonify({"error": "Incorrect password"}), 401

    if users.find_one({"email": new_email}):
        return jsonify({"error": "Unable to update email"}), 409

    users.update_one({"email": data["email"]}, {"$set": {"email": new_email}})

    new_token = generate_token(new_email, user["_id"])
    if isinstance(new_token, bytes):
        new_token = new_token.decode("utf-8")
    csrf_token = generate_csrf_token()

    resp = make_response(jsonify({"message": "Email updated"}))
    resp.set_cookie("token", new_token, httponly=True, secure=True, samesite="Lax", max_age=7200, path="/")
    resp.set_cookie("csrf_token", csrf_token, httponly=False, secure=True, samesite="Lax", max_age=7200, path="/")
    return resp


@settings_bp.route("/update/password", methods=["POST"])
@auth_and_csrf_required
def update_password(data):
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    body = request.get_json()
    current_password = body.get("currentPassword", "")
    new_password = body.get("password", "")

    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    user = users.find_one({"email": data["email"]})
    if not user or not check_password_hash(user["password"], current_password):
        return jsonify({"error": "Incorrect password"}), 401

    hashed_pw = generate_password_hash(new_password)
    users.update_one({"email": data["email"]}, {"$set": {"password": hashed_pw}})

    return jsonify({"message": "Password updated"}), 200


@settings_bp.route("/update/notifications", methods=["POST"])
@auth_and_csrf_required
def update_notifications(data):
    mongo = current_app.extensions["pymongo"]
    enabled = request.json.get("enabled")

    if not isinstance(enabled, bool):
        return jsonify({"error": "Invalid value"}), 400

    mongo.db.users.update_one({"email": data["email"]}, {"$set": {"notifications_enabled": enabled}})
    return jsonify({"message": "Notifications setting updated"}), 200


@settings_bp.route("/delete", methods=["DELETE"])
@auth_and_csrf_required
def delete_account(data):
    mongo = current_app.extensions["pymongo"]
    mongo.db.users.delete_one({"email": data["email"]})
    return jsonify({"message": "Account deleted"}), 200