from flask import Flask
from flask_cors import CORS
from flask_pymongo import PyMongo
import os
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)

app.config["MONGO_URI"] = os.getenv("MONGO_URI")
app.config["JWT_KEY"] = os.getenv("JWT_KEY")
app.config["GOOGLE_CLIENT_ID"] = os.getenv("GOOGLE_CLIENT_ID")
app.config["GOOGLE_CLIENT_SECRET"] = os.getenv("GOOGLE_CLIENT_SECRET")
app.config["GOOGLE_REDIRECT_URI"] = os.getenv("GOOGLE_REDIRECT_URI")
app.config["FRONTEND_REDIRECT_URI"] = os.getenv("FRONTEND_REDIRECT_URI")
app.config["GOOGLE_YT_API_KEY"] = os.getenv("GOOGLE_YT_API_KEY")

mongo = PyMongo(app)

app.extensions["pymongo"] = mongo

# Register API blueprints
from routes.idea import idea_bp
from routes.packaging import packaging_bp
from routes.auth import auth_bp
from routes.youtube import youtube_bp
from routes.saved import saved_bp
from routes.channel import channel_bp

app.register_blueprint(idea_bp, url_prefix="/api/idea")
app.register_blueprint(packaging_bp, url_prefix="/api/packaging")
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(youtube_bp, url_prefix="/api/youtube")
app.register_blueprint(saved_bp, url_prefix="/api/saved")
app.register_blueprint(channel_bp, url_prefix="/api/channel")

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8080)