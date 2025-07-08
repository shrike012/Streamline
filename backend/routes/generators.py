from flask import Blueprint, request, jsonify, current_app
from utils.db import find_user_channel
from utils.security import auth_and_csrf_required
from openai import OpenAI
import json

generators_bp = Blueprint("generators", __name__)

@generators_bp.route("/title", methods=["POST"])
@auth_and_csrf_required
def generate_title(data):
    body = request.get_json()
    idea_text = body.get("idea", "").strip()
    channel_id = body.get("channelId")

    if not idea_text or not channel_id:
        return jsonify({"error": "Missing required fields: idea, channelId"}), 400

    mongo = current_app.extensions["pymongo"]
    profile = find_user_channel(mongo, data["user_id"], channel_id)
    if not profile:
        return jsonify({"error": "Could not find your channel profile. Add it first."}), 400

    niche = profile.get("analyzedNiche", "unknown")
    style = profile.get("analyzedStyle", "unknown")
    market = profile.get("analyzedAttentionMarket", "unknown")

    cached_videos_doc = mongo.db.channel_videos.find_one({
        "channelId": channel_id,
        "contentType": "longform"
    })

    recent_titles = []
    if cached_videos_doc and "videos" in cached_videos_doc:
        recent_titles = [v.get("title", "") for v in cached_videos_doc["videos"][:5]]

    prompt = f"""
You are an expert YouTube strategist. Your task is to turn the user’s new video idea into 10 viral, click-worthy YouTube titles. These titles must seamlessly match the user's existing channel content and follow all formatting and tonal rules exactly.

---

**User's Channel Profile**
Niche: '{profile.get("analyzedNiche", "unknown")}'
Content Style: '{profile.get("analyzedStyle", "unknown")}'
Target Audience: '{profile.get("analyzedAttentionMarket", "unknown")}'

---

**User's Recent Video Titles**
{chr(5).join([f"{i+1}. {t}" for i, t in enumerate(recent_titles)])}

---

**New Video Idea**
"{idea_text}"

---

**Rules and Requirements**

1. Respond with **only a raw JSON array** of 10 titles. No explanation, no markdown, no headings. Example:
["Title 1", "Title 2", "Title 3", ..., "Title 10"]

2. At least **3 of the 10 titles must follow the same structural format** as the user's recent titles. Detect common patterns or templates in their titles (e.g. “You Wouldn’t Last…”, “How X Became Y”, “The Most…”, etc.) and replicate those formats.

3. Titles must be:
- **Only one sentence**
- **CONCISE** (under 110 characters recommended)
- **NO COLONS** or subtitles (e.g., avoid: "X: The Story of Y")

4. Do **not** start more than two titles with the same phrase (e.g. "How", "Why", "The Most").

5. Match the tone of the channel's past titles:
- Serious, bold, emotionally charged
- No jokes, sarcasm, or generic phrasing
- Never use casual YouTube language (no "Top 10", "Insane", etc.)

6. Use **emotionally gripping tactics**:
- Pain, death, failure, betrayal, injustice, revenge, fear, survival
- Curiosity and mystery: hidden, forbidden, secret, lost
- Superlatives: most, worst, smartest, deadliest, fastest

---

Stick to these rules exactly. Do not improvise or break format.
"""

    openai_client = OpenAI(api_key=current_app.config["OPENAI_API_KEY"])
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert YouTube strategist. You MUST comply with every instruction given, and respond with pure JSON only."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=600,
            temperature=1.0
        )
        raw_reply = response.choices[0].message.content.strip()

        if raw_reply.startswith("```json"):
            raw_reply = raw_reply[7:].strip()
        elif raw_reply.startswith("```"):
            raw_reply = raw_reply[3:].strip()
        if raw_reply.endswith("```"):
            raw_reply = raw_reply[:-3].strip()

        titles_list = json.loads(raw_reply)
        if not isinstance(titles_list, list):
            raise ValueError("Model response is not a JSON list")

        return jsonify({"titles": titles_list})

    except Exception as e:
        current_app.logger.error(f"Title generation failed: {str(e)}")
        return jsonify({"error": "Failed to generate titles"}), 500