import statistics
import re
import json
from flask import current_app
from openai import OpenAI

def compute_outlier_scores(videos):
    scores = []
    view_counts = [v.get("viewCount", 0) for v in videos]

    for i, vc in enumerate(view_counts):
        if vc == 0:
            scores.append(0.0)
            continue

        neighbors = []
        for offset in range(1, 6):
            if i - offset >= 0 and view_counts[i - offset] > 0:
                neighbors.append(view_counts[i - offset])
            if i + offset < len(view_counts) and view_counts[i + offset] > 0:
                neighbors.append(view_counts[i + offset])

        if not neighbors:
            scores.append(1.0)
            continue

        median_views = statistics.median(neighbors)
        score = vc / median_views if median_views > 0 else 1.0
        scores.append(round(score, 1))

    return scores

def analyze_channel_insights(channel_description, videos):
    num_videos = len(videos)
    if num_videos == 0:
        return {
            "analyzedNiche": "Unknown",
            "analyzedStyle": "Unknown",
            "analyzedAttentionMarket": "Unknown"
        }

    video_titles = [f"{i+1}. {v.get('title', '')}" for i, v in enumerate(videos[:3])]
    video_descriptions = [f"{i+1}. {v.get('description', '')[:300]}" for i, v in enumerate(videos[:3])]

    prompt = f"""
You are analyzing a YouTube channel to infer the likely attention_market and style.

Here is the channel:

Channel description:
\"\"\"{channel_description}\"\"\"  

Recent video titles:
{chr(5).join(video_titles)}

Recent video descriptions:
{chr(5).join(video_descriptions)}

---

STYLE DEFINITIONS & RULES:

- **documentary** → Edited, factual, or narrated coverage (no personal opinions). Research, explainers, news, or structured storytelling. Use even if occasional informal remarks.

- **commentary** → Personal views, reactions, or informal talk (opinion pieces, reviews, discussions). Only use if this tone dominates.

- **compilation** → Highlight reels, montages, or themed clip collections (minimal added voice or opinion).

- **podcast** → Extended recorded conversations (podcasts, interviews, talk shows). Do NOT use commentary for this.

- **vlog** → Personal life updates or lifestyle content (creator on camera, personality-driven).

- **reaction** → Creator reacting to other media (reaction is the main content).

- **educational** → Explicit teaching content (tutorials, guides, how-to). Do NOT use for storytelling or entertainment.

- **gameplay** → Sandbox, casual play-through, exploration (not goal-focused).

- **challenge** → Content structured around a goal (winning, surviving, completing a task).

- **kids content** → Clearly aimed at children (playful tone, bright visuals).

- **DIY, music, animation, stories** → As labeled.

- **For PRO SPORTS / E-SPORTS**:  
  - Do NOT use commentary for gameplay with casters/announcers → use documentary or compilation.

- **For GAMING**:  
  - Challenge/progress videos → use challenge/gameplay, not commentary.  
  - Commentary = off-topic opinions, not in-game narration.

- **For PODCASTS/INTERVIEWS**:  
  - Use podcast, not commentary.

- **MOTIVATIONS**:  
  - Use connection only if creator personality is the main reason to watch (vlogs, influencers).  
  - Do NOT use connection for content-first channels (documentaries, compilations, tutorials).  
  - If unsure — choose entertainment.  
  - Documentary storytelling = entertainment, not education.

---

Your output:

1. "niche": main topic in a few words  
   Example: "Valorant gaming", "History documentaries"

2. "style": ONE word from this list:  
   Documentary, Commentary, Compilation, Podcast, Vlog, Reaction, Educational, Gameplay, Kids Content, DIY, Music, Animation, Stories, Challenge
3. "attention_market": in this EXACT format:  
   "age_group, gender, [list of 1 or 2 motivations]"

Where:  
- age_group = Kids, Teens, Young Adults, Middle-Aged, Seniors, Mixed Ages  
- gender = M, F, Mix  
- motivations = Entertainment, Education, Connection

---

Examples:

{{
    "attention_market": "Young Adults, M, [Entertainment]"
}}

{{
    "Middle-Aged, Mix, [Education]"
}}

---

Very Important:

- Style MUST match one of the listed options  
- Attention Market MUST use this EXACT format  
- Motivations must be a LIST formatted like [item1, item2]  
- If unsure, say "Unknown"

---

Respond with PURE JSON only — no extra text.  

Format:  
{{
    "niche": "...",
    "style": "...",
    "attention_market": "..."
}}
"""

    openai_client = OpenAI(api_key=current_app.config["OPENAI_API_KEY"])

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a senior YouTube strategist. Always respond with pure JSON only."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=400,
            temperature=0.0
        )
        raw_reply = response.choices[0].message.content

        clean_reply = re.sub(r"^```(?:json)?|```$", "", raw_reply, flags=re.MULTILINE).strip()
        try:
            parsed = json.loads(clean_reply)
        except json.JSONDecodeError:
            current_app.logger.warning("OpenAI returned malformed JSON.")
            return {
                "analyzedNiche": "Unknown",
                "analyzedStyle": "Unknown",
                "analyzedAttentionMarket": "Unknown"
            }

        niche = parsed.get("niche", "Unknown")
        style = parsed.get("style", "Unknown")
        attention_market = parsed.get("attention_market", "Unknown")

        try:
            age_group = attention_market.split(", ")[0]
            if age_group.lower() == "kids":
                style = "Kids Content"
        except Exception:
            pass

    except Exception as e:
        niche = "Unknown"
        style = "Unknown"
        attention_market = "Unknown"
        current_app.logger.error(f"OpenAI analysis failed: {e}")

    return {
        "analyzedNiche": niche,
        "analyzedStyle": style,
        "analyzedAttentionMarket": attention_market
    }