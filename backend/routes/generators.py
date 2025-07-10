from flask import Blueprint, request, jsonify, current_app
from utils.db import find_user_channel
from utils.security import auth_and_csrf_required
from openai import OpenAI
import json
from extensions import limiter, mongo
from utils.youtube_api import get_youtube_client, fetch_channel_videos
from utils.parser import parse_channel_metadata

generators_bp = Blueprint("generators", __name__)

@generators_bp.route("/title", methods=["POST"])
@auth_and_csrf_required
@limiter.limit("5 per minute")
def generate_title(data):
    body = request.get_json()
    idea_text = body.get("idea", "").strip()
    idea_text = idea_text.replace("\n", " ").strip()
    if len(idea_text) > 200:
        return jsonify({"error": "Idea text is too long (max 200 characters)"}), 400

    channel_id = body.get("channelId")

    if not idea_text or not channel_id:
        return jsonify({"error": "Missing required fields: idea, channelId"}), 400

    profile = find_user_channel(mongo, data["user_id"], channel_id)
    if not profile:
        return jsonify({"error": "Could not find your channel profile. Add it first."}), 400

    yt = get_youtube_client()

    chan_info = yt.channels().list(
        part="snippet,contentDetails",
        id=channel_id
    ).execute()

    if not chan_info.get("items"):
        return jsonify({"error": "Channel not found"}), 404

    meta = parse_channel_metadata(chan_info)

    videos_res = fetch_channel_videos(yt, meta["uploadsId"], max_videos=15)
    videos = videos_res.get("videos", [])

    recent_titles = [
        v.get("title", "")
        for v in videos
        if not v.get("isShort", False)
    ][:5]

    prompt = f"""
You are an expert YouTube strategist. Your task is to turn the user’s new video idea into 10 viral, click-worthy YouTube titles. These titles must closely match the user's existing channel style and follow all formatting and tonal rules below.

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

2. Before writing titles, **carefully analyze the user's recent titles**. Detect the structural formats or templates (e.g. “You Wouldn’t Last…”, “How X Became Y”, “The Most…”, etc.) and replicate these structures precisely. 
- At least **3 of the 10 titles must reuse formats found in the recent titles**.
- If strong patterns are present, **prioritize mimicking them** over inventing new ones.

3. Titles must be:
- **Only one sentence**
- **Concise** (under 110 characters is ideal)
- **No colons or subtitles** (e.g., avoid: "X: The Story of Y")

4. Match the tone of the past titles:
- Serious, bold, emotionally charged
- No sarcasm, jokes, or generic phrasing
- Never use casual YouTube tropes (e.g. “Top 10”, “This Will Shock You”, “Insane”, etc.)

5. Use **emotionally gripping strategies**:
- Highlight pain, death, failure, injustice, betrayal, fear, or survival
- Use curiosity: hidden, secret, forbidden, lost
- Use superlatives: most, worst, greatest, smartest, deadliest

---

You must stick to these instructions exactly. Do not break format or ignore constraints.
"""
    current_app.logger.info(f"[Title Generator Prompt] {prompt}")
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