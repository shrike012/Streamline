from flask import Blueprint, request, jsonify
from utils.openai_client import analyze_content

content_bp = Blueprint("content", __name__)

@content_bp.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    script = data.get("script")
    medium = data.get("medium")
    visual_style = data.get("visual_style")

    if not script or not medium or not visual_style:
        return jsonify({"error": "Script, medium, and visual style are required."}), 400

    result = analyze_content(script, medium, visual_style)
    return jsonify(result), 200