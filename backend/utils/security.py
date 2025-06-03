from flask import request, jsonify, current_app
from functools import wraps
import jwt

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

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        data, error_response, status = _verify_token()
        if error_response:
            return jsonify(error_response), status
        request.user_email = data["email"]
        return f(*args, **kwargs)
    return decorated

def auth_and_csrf_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        data, error_response, status = _verify_token()
        if error_response:
            return jsonify(error_response), status
        request.user_email = data["email"]

        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("X-CSRF-Token")
        if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
            return jsonify({"error": "CSRF validation failed"}), 403

        return f(*args, **kwargs)
    return decorated