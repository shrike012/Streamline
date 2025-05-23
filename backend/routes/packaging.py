from flask import Blueprint, request, jsonify
from utils.openai_client import analyze_packaging

packaging_bp = Blueprint("packaging", __name__)

@packaging_bp.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    title = data.get("title")
    thumbnail_description = data.get("thumbnail_description")

    if not title or not thumbnail_description:
        return jsonify({"error": "Title and thumbnail description are required."}), 400

    result = analyze_packaging(title, thumbnail_description)
    return jsonify(result), 200