from flask import Blueprint, request, jsonify, current_app, redirect, make_response
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from extensions import limiter, mongo
from utils.security import (
    token_required,
    auth_and_csrf_required,
    generate_tokens,
    generate_csrf_token,
    is_strong_password
)
import logging, jwt, requests, re
from utils.send_email import send_password_reset_email
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from datetime import datetime, timedelta, timezone

auth_bp = Blueprint("auth", __name__)
ph = PasswordHasher()

EMAIL_REGEX = re.compile(r"^[\w.-]+@[\w.-]+\.\w+$")

def is_valid_email(email: str) -> bool:
    return EMAIL_REGEX.match(email) is not None

def obfuscate_email(email: str) -> str:
    return email[:2] + "***" + email[-3:] if len(email) >= 6 else "***"

def set_auth_cookies(resp, access_token, refresh_token, csrf_token):
    secure = current_app.config["ENV"] == "production"
    resp.set_cookie("token", access_token, httponly=True, secure=secure, samesite="Lax", max_age=900, path="/")
    resp.set_cookie("refresh_token", refresh_token, httponly=True, secure=secure, samesite="Lax", max_age=2592000, path="/")
    resp.set_cookie("csrf_token", csrf_token, httponly=False, secure=secure, samesite="None", max_age=900, path="/")
    return resp

@auth_bp.route("/signup", methods=["POST"])
@limiter.limit("3 per minute")
def signup():
    users = mongo.db.users
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password")

    if not is_valid_email(email):
        return jsonify({"error": "Invalid email format"}), 400
    if not is_strong_password(password):
        return jsonify({"error": "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."}), 400
    if users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409

    hashed_pw = ph.hash(password)
    users.insert_one({"email": email, "password": hashed_pw})
    new_user = users.find_one({"email": email})

    access_token, refresh_token = generate_tokens(email, new_user["_id"])
    csrf_token = generate_csrf_token()

    resp = make_response(jsonify({"message": "User registered and logged in"}))
    current_app.logger.info(f"New user signed up: {obfuscate_email(email)}")
    return set_auth_cookies(resp, access_token, refresh_token, csrf_token)

@auth_bp.route("/login", methods=["POST"])
@limiter.limit("20 per minute")
def login():
    users = mongo.db.users
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password")

    if not is_valid_email(email):
        return jsonify({"error": "Invalid credentials"}), 401

    user = users.find_one({"email": email})
    hashed_pw = user["password"] if user else ph.hash("fakepassword123!")

    try:
        ph.verify(hashed_pw, password)
    except VerifyMismatchError:
        return jsonify({"error": "Invalid credentials"}), 401

    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    access_token, refresh_token = generate_tokens(email, user["_id"])
    csrf_token = generate_csrf_token()

    resp = make_response(jsonify({"message": "Login successful"}))
    current_app.logger.info(f"User logged in: {obfuscate_email(email)}")
    return set_auth_cookies(resp, access_token, refresh_token, csrf_token)

@auth_bp.route("/refresh-token", methods=["POST"])
@limiter.limit("30 per minute")
def refresh_token():
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        return jsonify({"error": "No refresh token"}), 401

    try:
        data = jwt.decode(refresh_token, current_app.config["JWT_REFRESH_KEY"], algorithms=["HS256"])
        access_token = jwt.encode(
            {
                "email": data["email"],
                "user_id": str(data["user_id"]),
                "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
            },
            current_app.config["JWT_KEY"],
            algorithm="HS256"
        )
        csrf_token = generate_csrf_token()

        resp = jsonify({"message": "Token refreshed"})
        return set_auth_cookies(resp, access_token, refresh_token, csrf_token)

    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Refresh token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid refresh token"}), 401

@auth_bp.route("/logout", methods=["POST"])
@auth_and_csrf_required
def logout(data):
    current_app.logger.info(f"User logged out: {obfuscate_email(data['email'])}")
    resp = jsonify({"message": "Logged out"})

    secure = current_app.config["ENV"] == "production"

    resp.set_cookie("token", "", httponly=True, secure=secure, samesite="Lax", max_age=0, path="/")
    resp.set_cookie("refresh_token", "", httponly=True, secure=secure, samesite="Lax", max_age=0, path="/")
    resp.set_cookie("csrf_token", "", httponly=False, secure=secure, samesite="None", max_age=0, path="/")

    return resp

@auth_bp.route("/google/callback")
@limiter.limit("10 per minute")
def google_callback():
    code = request.args.get("code")
    if not code:
        return jsonify({"error": "Missing authorization code"}), 400

    token_res = requests.post("https://oauth2.googleapis.com/token", data={
        "code": code,
        "client_id": current_app.config["GOOGLE_CLIENT_ID"],
        "client_secret": current_app.config["GOOGLE_CLIENT_SECRET"],
        "redirect_uri": current_app.config["GOOGLE_REDIRECT_URI"],
        "grant_type": "authorization_code",
    })
    token_data = token_res.json()
    if "error" in token_data:
        logging.warning("Google token exchange failed: %s", token_data)
        return jsonify({"error": "Token exchange failed", "details": token_data}), 400

    access_token = token_data.get("access_token")
    user_info_res = requests.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={
        "Authorization": f"Bearer {access_token}"
    })
    if not user_info_res.ok:
        return jsonify({"error": "Failed to fetch user info"}), 400

    user_info = user_info_res.json()
    email = user_info["email"].strip().lower()
    sub = user_info.get("id")
    users = mongo.db.users

    user = users.find_one({"googleId": sub}) or users.find_one({"email": email})
    if not user:
        users.insert_one({
            "email": email,
            "authProvider": "google",
            "googleId": sub
        })
        user = users.find_one({"email": email})
    else:
        users.update_one({"_id": user["_id"]}, {"$set": {
            "email": email, "authProvider": "google", "googleId": sub
        }})

    access_token, refresh_token = generate_tokens(email, user["_id"])
    csrf_token = generate_csrf_token()

    resp = redirect(current_app.config.get("FRONTEND_REDIRECT_URI"))
    current_app.logger.info(f"User logged in via Google: {obfuscate_email(email)}")
    return set_auth_cookies(resp, access_token, refresh_token, csrf_token)

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_me(data):
    users = mongo.db.users
    user = users.find_one({"email": data["email"]}, {"password": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "_id": str(user["_id"]),
        "email": user["email"],
    }), 200

@auth_bp.route("/forgot-password", methods=["POST"])
@limiter.limit("2 per minute")
def forgot_password():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    if not email or not is_valid_email(email):
        return jsonify({"error": "Email is required"}), 400

    users = mongo.db.users
    user = users.find_one({"email": email})
    if not user or "password" not in user:
        return jsonify({"message": "If this email is registered, a reset link was sent."}), 200

    serializer = URLSafeTimedSerializer(current_app.config["JWT_KEY"])
    token = serializer.dumps(email, salt="password-reset-salt")
    reset_link = f"{current_app.config['FRONTEND_PASSWORD_RESET_URL']}?token={token}"

    if send_password_reset_email(email, reset_link) is None:
        return jsonify({"error": "Failed to send email"}), 500

    current_app.logger.info(f"Password reset requested for {obfuscate_email(email)}")
    return jsonify({"message": "Reset link sent if email exists"}), 200

@auth_bp.route("/reset-password", methods=["POST"])
@limiter.limit("2 per minute")
def reset_password():
    data = request.get_json()
    token = data.get("token")
    new_password = data.get("password")

    if not token or not new_password:
        return jsonify({"error": "Missing token or password"}), 400
    if not is_strong_password(new_password):
        return jsonify({"error": "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."}), 400

    try:
        serializer = URLSafeTimedSerializer(current_app.config["JWT_KEY"])
        email = serializer.loads(token, salt="password-reset-salt", max_age=3600)
    except SignatureExpired:
        return jsonify({"error": "Reset token expired"}), 400
    except BadSignature:
        return jsonify({"error": "Invalid reset token"}), 400

    hashed_pw = ph.hash(new_password)
    result = mongo.db.users.update_one({"email": email}, {"$set": {"password": hashed_pw}})
    if result.modified_count == 0:
        return jsonify({"error": "Failed to reset password"}), 500

    current_app.logger.info(f"Password reset for {obfuscate_email(email)}")
    return jsonify({"message": "Password has been reset"}), 200