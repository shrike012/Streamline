from datetime import timedelta
from bson import ObjectId
import json

def get_redis_cache(redis, key):
    """
    Get a cached value from Redis and decode it as JSON.
    Returns None if the key is missing or decoding fails.
    """
    try:
        val = redis.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None

def set_redis_cache(redis, key, value, ttl_seconds=600):
    """
    Set a value in Redis with a TTL, encoding as JSON.
    """
    redis.setex(key, timedelta(seconds=ttl_seconds), json.dumps(value))

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