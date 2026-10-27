@echo off
echo ============================================================
echo Starting Drishti Celery Worker (Parallel Threads with GPU)
echo ============================================================
celery -A celery_app.celery_app worker --loglevel=info --pool=threads -c 4
pause
