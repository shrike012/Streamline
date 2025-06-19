import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, request
from flask_cors import CORS
from flask_pymongo import PyMongo
import os
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)

# Configuration
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
app.config["JWT_KEY"] = os.getenv("JWT_KEY")
app.config["GOOGLE_CLIENT_ID"] = os.getenv("GOOGLE_CLIENT_ID")
app.config["GOOGLE_CLIENT_SECRET"] = os.getenv("GOOGLE_CLIENT_SECRET")
app.config["GOOGLE_REDIRECT_URI"] = os.getenv("GOOGLE_REDIRECT_URI")
app.config["FRONTEND_REDIRECT_URI"] = os.getenv("FRONTEND_REDIRECT_URI")
app.config["FRONTEND_PASSWORD_RESET_URL"] = os.getenv("FRONTEND_PASSWORD_RESET_URL")
app.config["GOOGLE_YT_API_KEY"] = os.getenv("GOOGLE_YT_API_KEY")
app.config["RESEND_API_KEY"] = os.getenv("RESEND_API_KEY")

mongo = PyMongo(app)
app.extensions["pymongo"] = mongo

log_dir = "/logs"
os.makedirs(log_dir, exist_ok=True)
log_path = os.path.join(log_dir, "app.log")

file_handler = RotatingFileHandler(log_path, maxBytes=1_000_000, backupCount=3)
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(logging.Formatter(
    "%(asctime)s [%(levelname)s] %(message)s"
))
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)

@app.before_request
def log_request_info():
    path = request.path
    if path.startswith("/static") or path in ["/api/auth/me", "/api/channel/list"]:
        return

    ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    app.logger.info(f"Request from {ip}: {request.method} {path}")

# Register blueprints
from routes.auth import auth_bp
from routes.saved import saved_bp
from routes.channel import channel_bp
from routes.settings import settings_bp
from routes.niche_explorer import niche_explorer_bp

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(settings_bp, url_prefix="/api/settings")
app.register_blueprint(saved_bp, url_prefix="/api/saved")
app.register_blueprint(channel_bp, url_prefix="/api/channel")
app.register_blueprint(niche_explorer_bp, url_prefix="/api/niche-explorer")

# Run
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8080)