import re

def chunkify(lst, size):
    for i in range(0, len(lst), size):
        yield lst[i:i + size]

def parse_channel_metadata(chan_info):
    item = chan_info["items"][0]
    snippet = item["snippet"]
    stats = item.get("statistics", {})
    content_details = item.get("contentDetails", {})

    avatar = snippet["thumbnails"]["default"]["url"].replace("http://", "https://")
    uploads_id = content_details.get("relatedPlaylists", {}).get("uploads", "")

    return {
        "channelId": item["id"],
        "channelTitle": snippet["title"],
        "description": snippet.get("description", ""),
        "avatar": avatar,
        "uploadsId": uploads_id,
        "subscriberCount": int(stats.get("subscriberCount", 0)),
        "totalViews": int(stats.get("viewCount", 0)),
        "numVideosTotal": int(stats.get("videoCount", 0)),
    }


def parse_motives(motive_str):
    """
    Given a motive string from the AI output, return a list of main motives matched.
    Example input: '[education, connection]' or '["education", "connection"]'
    """
    main_motives = [
        "entertainment",
        "education",
        "connection"
    ]

    extracted = re.findall(r'"(.*?)"|\'(.*?)\'|\[(.*?)', motive_str)
    motives = []

    for match in extracted:
        for group in match:
            if group:
                parts = [part.strip() for part in group.split(",")]
                motives.extend(parts)

    # Fallback if no matches (raw comma split)
    if not motives:
        motives = [m.strip() for m in motive_str.strip("[]").split(",")]

    # Normalize and filter
    motives = [m.lower() for m in motives]
    matched = [m for m in motives if m in main_motives]

    return matched

def extract_main_topic(niche_str):
    """
    Extract main topic from niche string.
    Example:
      "Valorant gaming" -> "valorant"
      "CS2 frag movies"  -> "cs2"
      "Minecraft building tutorials" -> "minecraft"
    """
    tokens = niche_str.lower().split()
    if tokens:
        return tokens[0]
    else:
        return "unknown"