from flask import Blueprint, request, jsonify
from utils.openai_client import analyze_idea

idea_bp = Blueprint("idea", __name__)

@idea_bp.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    idea_text = data.get("idea")

    if not idea_text:
        return jsonify({"error": "No idea provided"}), 400

    result = analyze_idea(idea_text)
    return jsonify(result), 200