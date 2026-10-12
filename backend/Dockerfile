FROM python:3.13-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    DATABASE_URL=sqlite:////data/scoreboard.db \
    UPLOAD_DIR=/data/uploads \
    DB_PATH=/data/scoreboard.db \
    VAPID_PRIVATE_KEY_FILE=/data/vapid_private.pem

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY *.py ./

EXPOSE 8000
# Single worker: WebSocket rooms and game heartbeats are held in process memory.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
