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
mongo = PyMongo(app)

app.extensions["pymongo"] = mongo


# Register API blueprints
from routes.idea import idea_bp
from routes.packaging import packaging_bp
from routes.auth import auth_bp

app.register_blueprint(idea_bp, url_prefix="/api/idea")
app.register_blueprint(packaging_bp, url_prefix="/api/packaging")
app.register_blueprint(auth_bp, url_prefix="/api/auth")


@app.route("/")
def index():
    return {"message": "Flask backend is running."}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)