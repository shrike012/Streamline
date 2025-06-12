from flask import Blueprint, request, jsonify, current_app, redirect, make_response
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, timezone
from utils.security import token_required, auth_and_csrf_required
import jwt
import logging
import requests
import secrets

auth_bp = Blueprint("auth", __name__)

def generate_token(email):
    return jwt.encode(
        {"email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=2)},
        current_app.config["JWT_KEY"],
        algorithm="HS256"
    )

def generate_csrf_token():
    return secrets.token_urlsafe(32)

@auth_bp.route("/signup", methods=["POST"])
def signup():
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password")

    if users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409

    hashed_pw = generate_password_hash(password)
    users.insert_one({
        "email": email,
        "password": hashed_pw
    })

    token = generate_token(email)
    if isinstance(token, bytes):
        token = token.decode("utf-8")

    csrf_token = generate_csrf_token()

    resp = make_response(jsonify({"message": "User registered and logged in"}))
    resp.set_cookie("token", token, httponly=True, secure=True, samesite="Lax", max_age=7200, path="/")
    resp.set_cookie("csrf_token", csrf_token, httponly=False, secure=True, samesite="Lax", max_age=7200, path="/")
    return resp

@auth_bp.route("/login", methods=["POST"])
def login():
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = users.find_one({"email": email})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = generate_token(email)
    if isinstance(token, bytes):
        token = token.decode("utf-8")

    csrf_token = generate_csrf_token()

    resp = make_response(jsonify({"message": "Login successful"}))
    resp.set_cookie("token", token, httponly=True, secure=True, samesite="Lax", max_age=7200, path="/")
    resp.set_cookie("csrf_token", csrf_token, httponly=False, secure=True, samesite="Lax", max_age=7200, path="/")
    return resp

@auth_bp.route("/logout", methods=["POST"])
@auth_and_csrf_required
def logout():
    resp = jsonify({"message": "Logged out"})
    resp.set_cookie("token", "", max_age=0, path="/")
    resp.set_cookie("csrf_token", "", max_age=0, path="/")
    return resp

@auth_bp.route("/google/callback")
def google_callback():
    code = request.args.get("code")
    if not code:
        return jsonify({"error": "Missing authorization code"}), 400

    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": current_app.config["GOOGLE_CLIENT_ID"],
        "client_secret": current_app.config["GOOGLE_CLIENT_SECRET"],
        "redirect_uri": current_app.config["GOOGLE_REDIRECT_URI"],
        "grant_type": "authorization_code",
    }

    token_res = requests.post(token_url, data=data)
    token_data = token_res.json()

    if "error" in token_data:
        logging.warning("Google token exchange failed: %s", token_data)
        return jsonify({"error": "Token exchange failed", "details": token_data}), 400

    access_token = token_data.get("access_token")

    user_info_res = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    if not user_info_res.ok:
        return jsonify({"error": "Failed to fetch user info"}), 400

    userinfo = user_info_res.json()
    email = userinfo["email"]
    name = userinfo.get("name", "")
    picture = userinfo.get("picture")

    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    user = users.find_one({"email": email})
    if not user:
        users.insert_one({
            "email": email,
            "name": name,
            "auth_provider": "google",
            "profile_picture": picture
        })

    jwt_token = generate_token(email)
    if isinstance(jwt_token, bytes):
        jwt_token = jwt_token.decode("utf-8")

    csrf_token = generate_csrf_token()

    resp = redirect(current_app.config.get("FRONTEND_REDIRECT_URI"))
    resp.set_cookie("token", jwt_token, httponly=True, secure=True, samesite="Lax", max_age=7200, path="/")
    resp.set_cookie("csrf_token", csrf_token, httponly=False, secure=True, samesite="Lax", max_age=7200, path="/")
    return resp

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_me():
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    user = users.find_one({"email": request.user_email}, {"password": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404

    user["_id"] = str(user["_id"])
    return jsonify(user), 200
