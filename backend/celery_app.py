import os
from celery import Celery

# Redis connection URL (default to localhost:6379 for local/Docker setup)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "drishti_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    result_expires=86400,            # 24 hours
    task_track_started=True,          # Mark state as STARTED when worker picks it up
    task_acks_late=True,              # Acknowledge task only after completion
    worker_prefetch_multiplier=1,      # Process 1 heavy video job at a time per worker
    broker_connection_retry_on_startup=True
)

if __name__ == "__main__":
    celery_app.start()
