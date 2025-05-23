# Use a secure base image
FROM python:3.11-slim

# Create a non-root user
RUN adduser --disabled-password appuser

# Set working directory
WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Switch to non-root user
USER appuser

# Set env vars
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_ENV=production

# Expose port
EXPOSE 5000

# Start app
CMD ["flask", "run"]