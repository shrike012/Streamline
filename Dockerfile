FROM python:3.10-slim-bullseye

# --- System dependencies ---
RUN apt-get update && apt-get install -y \
    ca-certificates tzdata libssl-dev gcc build-essential curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# --- Set working dir for backend ---
WORKDIR /app

# --- Install backend deps ---
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m nltk.downloader punkt

# --- Copy backend code ---
COPY backend /app/backend

# --- Build frontend ---
COPY frontend /app/frontend
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps && npm run build

# --- Move frontend dist into backend static folder ---
RUN mkdir -p /app/backend/static && cp -r dist/* /app/backend/static/

# --- Final working dir and start command ---
WORKDIR /app/backend
EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "app:app"]