from logging.handlers import RotatingFileHandler
from flask import Flask, request, current_app, jsonify
from flask_cors import CORS
from flask_pymongo import PyMongo
import os, logging, atexit
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=[
    "http://localhost:5173",
])

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["10000 per day", "5000 per hour"],
    storage_uri=os.getenv("REDIS_URI")
)

# Configuration
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
app.config["JWT_KEY"] = os.getenv("JWT_KEY")
app.config["GOOGLE_CLIENT_ID"] = os.getenv("GOOGLE_CLIENT_ID")
app.config["GOOGLE_CLIENT_SECRET"] = os.getenv("GOOGLE_CLIENT_SECRET")
app.config["GOOGLE_REDIRECT_URI"] = os.getenv("GOOGLE_REDIRECT_URI")
app.config["FRONTEND_REDIRECT_URI"] = os.getenv("FRONTEND_REDIRECT_URI")
app.config["FRONTEND_PASSWORD_RESET_URL"] = os.getenv("FRONTEND_PASSWORD_RESET_URL")
app.config["RESEND_API_KEY"] = os.getenv("RESEND_API_KEY")
app.config["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")

# Load YouTube API keys
yt_keys = os.getenv("GOOGLE_YT_API_KEYS", "").split(",")
yt_keys = [k.strip() for k in yt_keys if k.strip()]
if not yt_keys:
    raise ValueError("Missing GOOGLE_YT_API_KEYS in .env")
app.config["YT_API_KEYS"] = yt_keys

# Mongo
mongo = PyMongo(app)
app.extensions["pymongo"] = mongo

# Logging
log_dir = "/logs"
os.makedirs(log_dir, exist_ok=True)
log_path = os.path.join(log_dir, "app.log")

file_handler = RotatingFileHandler(log_path, maxBytes=1_000_000, backupCount=3)
file_handler.setLevel(logging.ERROR)
file_handler.setFormatter(logging.Formatter(
    "%(asctime)s [%(levelname)s] %(message)s"
))
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)

@app.before_request
def log_request_info():
    path = request.path
    skip_paths = {
        "/api/auth/me",
        "/api/auth/login",
        "/api/auth/google",
        "/api/auth/google/callback",
        "/api/auth/request-reset",
        "/api/auth/reset-password",
        "/api/channel/list",
    }

    if path.startswith("/static") or path in skip_paths:
        return

    ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    app.logger.info(f"Request from {ip}: {request.method} {path}")

# Register blueprints
from routes.auth import auth_bp
from routes.channel import channel_bp
from routes.collections import collections_bp
from routes.settings import settings_bp
from routes.niche_explorer import niche_explorer_bp
from routes.competitor_tracker import competitor_tracker_bp
from routes.generators import generators_bp
from routes.notifications import notifications_bp
from routes.outliers import outliers_bp

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(settings_bp, url_prefix="/api/settings")
app.register_blueprint(channel_bp, url_prefix="/api/channel")
app.register_blueprint(collections_bp, url_prefix="/api/collections")
app.register_blueprint(niche_explorer_bp, url_prefix="/api/niche-explorer")
app.register_blueprint(competitor_tracker_bp, url_prefix="/api/competitor-tracker")
app.register_blueprint(generators_bp, url_prefix="/api/generators")
app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
app.register_blueprint(outliers_bp, url_prefix="/api/outliers")

@app.errorhandler(Exception)
def handle_exception(e):
    current_app.logger.exception("Unhandled exception")
    return jsonify({"error": "An internal server error occurred."}), 500

def run_in_app_context(func):
    with app.app_context():
        func()

# APScheduler for daily outlier refresh and competitor upload notifications
from apscheduler.schedulers.background import BackgroundScheduler
from utils.scheduled_jobs import refresh_all_outliers_for_all_users, check_competitors_for_all_users

scheduler = BackgroundScheduler()
scheduler.add_job(
    lambda: run_in_app_context(refresh_all_outliers_for_all_users),
    trigger="cron",
    hour=3
)
scheduler.add_job(
    lambda: run_in_app_context(check_competitors_for_all_users),
    trigger="cron",
    minute=0
)
scheduler.start()
atexit.register(lambda: scheduler.shutdown())

# Run
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8080)