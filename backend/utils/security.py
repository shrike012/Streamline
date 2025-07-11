from flask import request, jsonify, current_app
from functools import wraps
import jwt, re, secrets
from datetime import datetime, timedelta, timezone

def generate_tokens(email, user_id):
    access_token = jwt.encode(
        {
            "email": email,
            "user_id": str(user_id),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        },
        current_app.config["JWT_KEY"],
        algorithm="HS256",
    )

    refresh_token = jwt.encode(
        {
            "email": email,
            "user_id": str(user_id),
            "exp": datetime.now(timezone.utc) + timedelta(days=30),
        },
        current_app.config["JWT_REFRESH_KEY"],
        algorithm="HS256",
    )

    return access_token, refresh_token

def generate_csrf_token():
    return secrets.token_urlsafe(32)

def _verify_token():
    token = request.cookies.get("token")
    if not token:
        return None, {"error": "Missing token"}, 401
    try:
        data = jwt.decode(token, current_app.config["JWT_KEY"], algorithms=["HS256"])
        return data, None, None
    except jwt.ExpiredSignatureError:
        return None, {"error": "Token expired"}, 401
    except jwt.InvalidTokenError:
        return None, {"error": "Invalid token"}, 401
    except Exception:
        return None, {"error": "Token verification failed"}, 401

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        data, error_response, status = _verify_token()
        if error_response:
            return jsonify(error_response), status
        return f(data, *args, **kwargs)
    return decorated

def auth_and_csrf_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        data, error_response, status = _verify_token()
        if error_response:
            return jsonify(error_response), status

        # Only enforce CSRF on unsafe methods
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            csrf_cookie = request.cookies.get("csrf_token")
            csrf_header = request.headers.get("X-CSRF-Token")
            if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
                return jsonify({"error": "CSRF validation failed"}), 403

        return f(data, *args, **kwargs)
    return decorated

def is_strong_password(password):
    return (
        len(password) >= 8 and
        re.search(r"[A-Z]", password) and
        re.search(r"[a-z]", password) and
        re.search(r"\d", password) and
        re.search(r"[!@#$%^&*(),.?\":{}|<>]", password)
    )