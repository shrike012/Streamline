from flask import Flask, request, current_app, jsonify
from flask_limiter.errors import RateLimitExceeded
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from redis import Redis
from dotenv import load_dotenv
import os, logging, atexit, sys
from extensions import mongo, limiter

# --- Load and validate environment variables ---
load_dotenv()

required_env_vars = [
    "FRONTEND_ORIGIN", "MONGO_URL", "JWT_KEY", "JWT_REFRESH_KEY",
    "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI",
    "FRONTEND_REDIRECT_URI", "FRONTEND_PASSWORD_RESET_URL",
    "RESEND_API_KEY", "REDIS_URI"
]
for var in required_env_vars:
    if not os.getenv(var):
        raise RuntimeError(f"Missing required environment variable: {var}")

# --- App Initialization ---
app = Flask(__name__)
app.config["ENV"] = os.getenv("FLASK_ENV", "development")
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)

# --- CORS Configuration ---
CORS(app, supports_credentials=True, origins=[os.getenv("FRONTEND_ORIGIN")])

# --- Secure Cookie & Upload Limits ---
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    MAX_CONTENT_LENGTH=2 * 1024 * 1024,  # 2MB max request body
)

# --- App Config ---
app.config.update(
    JWT_KEY=os.getenv("JWT_KEY"),
    JWT_REFRESH_KEY=os.getenv("JWT_REFRESH_KEY"),
    GOOGLE_CLIENT_ID=os.getenv("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET=os.getenv("GOOGLE_CLIENT_SECRET"),
    GOOGLE_REDIRECT_URI=os.getenv("GOOGLE_REDIRECT_URI"),
    FRONTEND_REDIRECT_URI=os.getenv("FRONTEND_REDIRECT_URI"),
    FRONTEND_PASSWORD_RESET_URL=os.getenv("FRONTEND_PASSWORD_RESET_URL"),
    RESEND_API_KEY=os.getenv("RESEND_API_KEY"),
    OPENAI_API_KEY=os.getenv("OPENAI_API_KEY"),
    REDIS_URI=os.getenv("REDIS_URI"),
    YT_API_KEYS=[k.strip() for k in os.getenv("GOOGLE_YT_API_KEYS", "").split(",") if k.strip()],
)

# --- Init MongoDB + Redis + Rate Limiter ---
print("Using Mongo URI:", os.getenv("MONGO_URI"))
mongo.init_app(app)
print("Mongo client created:", mongo.db)
app.extensions["pymongo"] = mongo
redis_client = Redis.from_url(
    app.config["REDIS_URI"],
    decode_responses=True,
    socket_connect_timeout=5,
    socket_timeout=5,
    retry_on_timeout=True
)
app.extensions["redis"] = redis_client
limiter.init_app(app)

# --- Logging Setup ---
app.logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setLevel(logging.INFO)
handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
app.logger.addHandler(handler)

@app.before_request
def log_request_info():
    if request.path.startswith("/static"):
        return
    if request.method != "GET":
        ip = request.headers.get("X-Forwarded-For", request.remote_addr)
        app.logger.info(f"{request.method} {request.path} from {ip}")

# --- Register Blueprints ---
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

# --- Error Handlers ---
@app.errorhandler(Exception)
def handle_exception(e):
    current_app.logger.exception("Unhandled exception")
    return jsonify({"error": "An internal server error occurred."}), 500

@app.errorhandler(RateLimitExceeded)
def handle_rate_limit(e):
    return jsonify({"error": "Too many requests. Please slow down."}), 429

# --- APScheduler Setup ---
def run_in_app_context(func):
    with app.app_context():
        func()

from apscheduler.schedulers.background import BackgroundScheduler
from utils.scheduled_jobs import refresh_all_outliers_for_all_users, check_competitors_for_all_users

scheduler = BackgroundScheduler()
scheduler.add_job(lambda: run_in_app_context(refresh_all_outliers_for_all_users), trigger="cron", hour=3)
scheduler.add_job(lambda: run_in_app_context(check_competitors_for_all_users), trigger="cron", minute=0)
scheduler.start()
atexit.register(lambda: scheduler.shutdown())