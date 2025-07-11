from flask_pymongo import PyMongo
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from concurrent.futures import ThreadPoolExecutor
import os

# Mongo client (initialized in app.py)
mongo = PyMongo()

# Redis URI used for rate limiter storage
redis_uri = os.getenv("REDIS_URI")

# Thread pool executor
executor = ThreadPoolExecutor(max_workers=4)

# Flask-Limiter (rate limiting middleware)
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=redis_uri,
)