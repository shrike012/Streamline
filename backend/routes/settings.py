from flask import Blueprint, request, jsonify, make_response, current_app
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from utils.security import (
    token_required,
    auth_and_csrf_required,
    generate_tokens,
    generate_csrf_token,
    is_strong_password
)
from extensions import limiter, mongo
from datetime import datetime, timezone

settings_bp = Blueprint("settings", __name__)
ph = PasswordHasher()

def secure_cookie():
    return current_app.config.get("ENV") == "production"

@settings_bp.route("/get", methods=["GET"])
@token_required
@limiter.limit("60 per minute")
def get_settings(data):
    user = mongo.db.users.find_one({"email": data["email"]}, {"password": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "email": user["email"],
        "notificationsEnabled": user.get("notificationsEnabled", True),
        "authProvider": user.get("authProvider", "local")
    })

@settings_bp.route("/update/email", methods=["POST"])
@auth_and_csrf_required
@limiter.limit("10 per minute")
def update_email(data):
    users = mongo.db.users
    body = request.get_json()
    new_email = body.get("email", "").strip().lower()
    current_password = body.get("currentPassword", "")

    if not new_email:
        return jsonify({"error": "Email is required"}), 400

    user = users.find_one({"email": data["email"]})
    if not user:
        return jsonify({"error": "User not found"}), 404

    try:
        ph.verify(user["password"], current_password)
    except VerifyMismatchError:
        return jsonify({"error": "Incorrect password"}), 401

    if users.find_one({"email": new_email}):
        return jsonify({"error": "Unable to update email"}), 409

    users.update_one(
        {"email": data["email"]},
        {"$set": {"email": new_email, "lastModified": datetime.now(timezone.utc)}}
    )

    access_token, refresh_token = generate_tokens(new_email, user["_id"])
    csrf_token = generate_csrf_token()

    resp = make_response(jsonify({"message": "Email updated"}))
    resp.set_cookie("token", access_token, httponly=True, secure=secure_cookie(), samesite="Lax", max_age=900, path="/")
    resp.set_cookie("refresh_token", refresh_token, httponly=True, secure=secure_cookie(), samesite="Lax", max_age=30*24*3600, path="/")
    resp.set_cookie("csrf_token", csrf_token, httponly=False, secure=secure_cookie(), samesite="Lax", max_age=900, path="/")
    return resp

@settings_bp.route("/update/password", methods=["POST"])
@auth_and_csrf_required
@limiter.limit("5 per minute")
def update_password(data):
    users = mongo.db.users
    body = request.get_json()
    current_password = body.get("currentPassword", "")
    new_password = body.get("password", "")

    if not is_strong_password(new_password):
        return jsonify({
            "error": "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
        }), 400

    user = users.find_one({"email": data["email"]})
    try:
        ph.verify(user["password"], current_password)
    except VerifyMismatchError:
        return jsonify({"error": "Incorrect password"}), 401

    hashed_pw = ph.hash(new_password)
    users.update_one(
        {"email": data["email"]},
        {"$set": {"password": hashed_pw, "lastModified": datetime.now(timezone.utc)}}
    )

    return jsonify({"message": "Password updated"}), 200

@settings_bp.route("/update/notifications", methods=["POST"])
@auth_and_csrf_required
@limiter.limit("10 per minute")
def update_notifications(data):
    enabled = request.json.get("enabled")

    if not isinstance(enabled, bool):
        return jsonify({"error": "Invalid value"}), 400

    mongo.db.users.update_one(
        {"email": data["email"]},
        {"$set": {"notificationsEnabled": enabled}}
    )

    return jsonify({"message": "Notifications setting updated"}), 200

@settings_bp.route("/delete", methods=["DELETE"])
@auth_and_csrf_required
@limiter.limit("2 per minute")
def delete_account(data):
    mongo.db.users.delete_one({"email": data["email"]})

    resp = make_response(jsonify({"message": "Account deleted"}))
    resp.set_cookie("token", "", max_age=0, path="/")
    resp.set_cookie("refresh_token", "", max_age=0, path="/")
    resp.set_cookie("csrf_token", "", max_age=0, path="/")
    return resp