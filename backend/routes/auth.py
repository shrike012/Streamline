from flask import Blueprint, request, jsonify, current_app, redirect, make_response
from werkzeug.security import generate_password_hash, check_password_hash
from utils.security import token_required, auth_and_csrf_required, generate_token, generate_csrf_token
import urllib.parse
import logging
import requests
from utils.send_email import send_password_reset_email
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

auth_bp = Blueprint("auth", __name__)

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

    new_user = users.find_one({"email": email})
    token = generate_token(email, new_user["_id"])
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    encoded_token = urllib.parse.quote(token)

    csrf_token = generate_csrf_token()

    resp = make_response(jsonify({"message": "User registered and logged in"}))
    resp.set_cookie("token", encoded_token, httponly=True, secure=False, samesite="Lax", max_age=86400, path="/")
    resp.set_cookie("csrf_token", csrf_token, httponly=False, secure=False, samesite="Lax", max_age=86400, path="/")

    current_app.logger.info(f"New user signed up: {email}")
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

    token = generate_token(email, user["_id"])
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    encoded_token = urllib.parse.quote(token)

    csrf_token = generate_csrf_token()

    resp = make_response(jsonify({"message": "Login successful"}))
    resp.set_cookie("token", encoded_token, httponly=True, secure=False, samesite="Lax", max_age=7200, path="/")
    resp.set_cookie("csrf_token", csrf_token, httponly=False, secure=False, samesite="Lax", max_age=7200, path="/")

    current_app.logger.info(f"User logged in: {email}")
    return resp

@auth_bp.route("/logout", methods=["POST"])
@auth_and_csrf_required
def logout(data):
    current_app.logger.info(f"User logged out: {data['email']}")
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

    user_info = user_info_res.json()
    email = user_info["email"]
    sub = user_info.get("id")

    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    user = users.find_one({"google_id": sub})
    if not user:
        user = users.find_one({"email": email})

    if not user:
        users.insert_one({
            "email": email,
            "authProvider": "google",
            "googleId": sub
        })
        user = users.find_one({"email": email})
    else:
        users.update_one(
            {"_id": user["_id"]},
            {"$set": {"email": email}}
        )

    jwt_token = generate_token(email, user["_id"])
    if isinstance(jwt_token, bytes):
        jwt_token = jwt_token.decode("utf-8")
    encoded_token = urllib.parse.quote(jwt_token)

    csrf_token = generate_csrf_token()

    resp = redirect(current_app.config.get("FRONTEND_REDIRECT_URI"))
    resp.set_cookie("token", encoded_token, httponly=True, secure=False, samesite="Lax", max_age=7200, path="/")
    resp.set_cookie("csrf_token", csrf_token, httponly=False, secure=False, samesite="Lax", max_age=7200, path="/")

    current_app.logger.info(f"User logged in via Google: {email}")
    return resp

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_me(data):
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    user = users.find_one({"email": data["email"]}, {"password": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404

    response_data = {
        "_id": str(user["_id"]),
        "email": user["email"],
    }
    return jsonify(response_data), 200

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users
    user = users.find_one({"email": email})

    if not user or "password" not in user:
        return jsonify({"message": "If this email is registered, a reset link was sent."}), 200

    serializer = URLSafeTimedSerializer(current_app.config["JWT_KEY"])
    token = serializer.dumps(email, salt="password-reset-salt")
    reset_link = f"{current_app.config['FRONTEND_PASSWORD_RESET_URL']}?token={token}"

    result = send_password_reset_email(email, reset_link)
    if result is None:
        return jsonify({"error": "Failed to send email"}), 500

    current_app.logger.info(f"Password reset requested for {email}")
    return jsonify({"message": "Reset link sent if email exists"}), 200

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    token = data.get("token")
    new_password = data.get("password")

    if not token or not new_password:
        return jsonify({"error": "Missing token or password"}), 400

    try:
        serializer = URLSafeTimedSerializer(current_app.config["JWT_KEY"])
        email = serializer.loads(token, salt="password-reset-salt", max_age=3600)
    except SignatureExpired:
        return jsonify({"error": "Reset token expired"}), 400
    except BadSignature:
        return jsonify({"error": "Invalid reset token"}), 400

    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users
    hashed_pw = generate_password_hash(new_password)

    result = users.update_one({"email": email}, {"$set": {"password": hashed_pw}})
    if result.modified_count == 0:
        return jsonify({"error": "Failed to reset password"}), 500

    current_app.logger.info(f"Password reset for {email}")
    return jsonify({"message": "Password has been reset"}), 200