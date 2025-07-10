from flask_pymongo import PyMongo
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from concurrent.futures import ThreadPoolExecutor
import os

mongo = PyMongo()
redis_uri = os.getenv("REDIS_URI")
executor = ThreadPoolExecutor(max_workers=4)

# Initialize limiter with Redis
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=redis_uri,
)