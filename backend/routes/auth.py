from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, timezone
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import jwt
from utils.security import token_required

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

    return jsonify({"message": "User registered successfully"}), 201


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

    token = jwt.encode(
        {
            "email": user["email"],
            "exp": datetime.now(timezone.utc) + timedelta(hours=2)
        },
        current_app.config["JWT_KEY"],
        algorithm="HS256"
    )

    if isinstance(token, bytes):
        token = token.decode("utf-8")

    return jsonify({
        "message": "Login successful",
        "token": token,
    }), 200

@auth_bp.route("/google", methods=["POST"])
def google_login():
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    data = request.get_json()
    token = data.get("credential")

    try:
        # Verify token with Google
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            current_app.config["GOOGLE_CLIENT_ID"]
        )

        email = idinfo["email"]
        name = idinfo.get("name", "")

        # Check if user exists, if not, create them
        user = users.find_one({"email": email})
        if not user:
            users.insert_one({
                "email": email,
                "name": name,
                "auth_provider": "google"
            })

        # Create a JWT for our app
        our_token = jwt.encode(
            {"email": email},
            current_app.config["JWT_KEY"],
            algorithm="HS256"
        )
        if isinstance(our_token, bytes):
            our_token = our_token.decode("utf-8")

        return jsonify({"token": our_token}), 200

    except ValueError:
        return jsonify({"error": "Invalid Google token"}), 401

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_me():
    mongo = current_app.extensions["pymongo"]
    users = mongo.db.users

    user = users.find_one({"email": request.user_email}, {"password": 0})  # exclude password

    if not user:
        return jsonify({"error": "User not found"}), 404

    user["_id"] = str(user["_id"])  # convert ObjectId to string if needed

    return jsonify(user), 200