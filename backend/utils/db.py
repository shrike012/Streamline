from datetime import datetime, timezone
from bson import ObjectId

def get_cached_document(mongo, collection_name, query, ttl_minutes=10):
    """
    Fetch a cached document from MongoDB and check freshness.

    Returns:
        - cached document dict if found & fresh
        - None if missing or stale
    """
    collection = mongo.db[collection_name]
    cached = collection.find_one(query)

    if cached:
        fetched_at = cached.get("fetchedAt")
        if fetched_at:
            if fetched_at.tzinfo is None:
                fetched_at = fetched_at.replace(tzinfo=timezone.utc)
            age_minutes = (datetime.now(timezone.utc) - fetched_at).total_seconds() / 60
            if age_minutes < ttl_minutes:
                return cached
    return None

def update_cache_document(mongo, collection_name, query, new_data):
    """
    Upserts new data with fetchedAt timestamp.
    """
    collection = mongo.db[collection_name]
    collection.update_one(
        query,
        {
            "$set": {
                **new_data,
                "fetchedAt": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )

def find_user_channel(mongo, user_id, channel_id):
    """
    Return the matching channel object from a user's `channels` array.
    """
    doc = mongo.db.users.find_one(
        {"_id": ObjectId(user_id), "channels.channelId": channel_id},
        {"channels.$": 1}
    )
    if not doc or "channels" not in doc or not doc["channels"]:
        return None
    return doc["channels"][0]

def update_user_channel(mongo, user_id, channel_id, update, array_filters=None):
    return mongo.db.users.update_one(
        {"_id": ObjectId(user_id), "channels.channelId": channel_id},
        update,
        array_filters=array_filters or []
    )