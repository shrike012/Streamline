FROM python:3.10-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && \
    apt-get install -y cron && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK punkt tokenizer (for sentence splitting)
RUN python -m nltk.downloader punkt

COPY . .

EXPOSE 8080

CMD ["python", "app.py"]