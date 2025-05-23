from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Register route blueprints
from routes.idea import idea_bp
from routes.packaging import packaging_bp
from routes.content import content_bp

app.register_blueprint(idea_bp, url_prefix="/api/idea")
app.register_blueprint(packaging_bp, url_prefix="/api/packaging")
app.register_blueprint(content_bp, url_prefix="/api/content")

# Health check
@app.route("/")
def home():
    return "Streamline backend is running."

if __name__ == "__main__":
    app.run(debug=True)