from flask import current_app
import numpy as np
from openai import OpenAI

def embed_text(text):
    openai_client = OpenAI(api_key=current_app.config["OPENAI_API_KEY"])

    if isinstance(text, str):
        text = [text]

    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )

    # Convert each embedding to a NumPy array
    embeddings = [np.array(item.embedding) for item in response.data]

    # If input was a single string, return first embedding directly
    if len(embeddings) == 1:
        return embeddings[0]
    return embeddings

def cosine_similarity(vec1, vec2):
    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    return dot_product / (norm1 * norm2) if norm1 != 0 and norm2 != 0 else 0.0