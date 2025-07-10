from flask import current_app
import numpy as np
from openai import OpenAI, OpenAIError

def embed_text(text):
    try:
        openai_client = OpenAI(api_key=current_app.config["OPENAI_API_KEY"])
        if isinstance(text, str):
            text = [text]

        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )

        embeddings = [np.array(item.embedding) for item in response.data]
        return embeddings[0] if len(embeddings) == 1 else embeddings
    except OpenAIError as e:
        current_app.logger.error(f"OpenAI embedding error: {e}")
        return None

def cosine_similarity(vec1, vec2):
    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    return dot_product / (norm1 * norm2) if norm1 != 0 and norm2 != 0 else 0.0