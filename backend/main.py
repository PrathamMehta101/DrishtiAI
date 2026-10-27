from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

import os
import uuid
import shutil
import json
from datetime import date as _date

from yolo_service import process_video
from motion_service import process_motion
from event_builder import build_events
from heatmap_service import generate_heatmap
from groq_service import generate_summary

from celery.result import AsyncResult
from celery_app import celery_app
from tasks import analyze_video_task


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="Drishti Exam Monitoring API",
    description="YOLO11s + motion detection based exam monitoring API",
    version="3.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DIRECTORIES
# ============================================================

BASE_DIR = "data"

ORIGINAL_DIR = os.path.join(BASE_DIR, "original")
ANNOTATED_DIR = os.path.join(BASE_DIR, "annotated")

# YOLO results
RESULTS_DIR = os.path.join(BASE_DIR, "results")

# Motion results
MOTIONS_DIR = os.path.join(BASE_DIR, "motions")

SESSIONS_DIR = os.path.join(BASE_DIR, "sessions")
HEATMAPS_DIR = os.path.join(BASE_DIR, "heatmaps")


for directory in [
    ORIGINAL_DIR,
    ANNOTATED_DIR,
    RESULTS_DIR,
    MOTIONS_DIR,
    SESSIONS_DIR,
    HEATMAPS_DIR,
]:
    os.makedirs(directory, exist_ok=True)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Drishti Exam Monitoring API v3 is running"
    }


# ============================================================
# ANALYZE VIDEO (ASYNC CELERY DISTRIBUTED PIPELINE)
#
# 1. Accepts upload and saves original video to disk
# 2. Enqueues background Celery task to Redis broker
# 3. Immediately returns task_id & video_id (< 1 second)
# ============================================================

@app.post("/api/analyze")
async def analyze_video(
    video: UploadFile = File(...),
    hall_name: str = Form("Unknown Hall"),
    exam_name: str = Form("Untitled Exam"),
    date: str = Form(""),
    camera_id: str = Form("CAM-01"),
):
    if not video.filename:
        raise HTTPException(
            status_code=400,
            detail="No video file provided"
        )

    video_id = str(uuid.uuid4())
    extension = os.path.splitext(video.filename)[1] or ".mp4"

    original_path = os.path.join(
        ORIGINAL_DIR,
        f"{video_id}{extension}"
    )

    annotated_path = os.path.join(
        ANNOTATED_DIR,
        f"{video_id}_annotated.mp4"
    )

    try:
        # 1. Save uploaded file to disk
        with open(original_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)

        # 2. Dispatch background Celery task to Redis broker
        task = analyze_video_task.delay(
            video_id=video_id,
            original_path=original_path,
            annotated_path=annotated_path,
            hall_name=hall_name,
            exam_name=exam_name,
            date_str=date,
            camera_id=camera_id
        )

        return {
            "success": True,
            "task_id": task.id,
            "video_id": video_id,
            "status": "QUEUED",
            "message": "Video queued for distributed background processing"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to queue video analysis: {str(e)}"
        )


# ============================================================
# TASK STATUS POLLING
#
# Polled by frontend to check background worker progress:
# PENDING -> PROCESSING (15%..55%..80%..90%) -> SUCCESS (100%)
# ============================================================

@app.get("/api/task/{task_id}")
def get_task_status(task_id: str):
    task_result = AsyncResult(task_id, app=celery_app)
    state = task_result.state

    if state == "PENDING":
        return {
            "task_id": task_id,
            "state": "PENDING",
            "progress": 0,
            "stage": "Queued (Waiting for worker node...)",
            "success": False
        }

    elif state in ["PROCESSING", "STARTED"]:
        info = task_result.info if isinstance(task_result.info, dict) else {}
        return {
            "task_id": task_id,
            "state": "PROCESSING",
            "progress": info.get("progress", 25),
            "stage": info.get("stage", "Processing video on worker node..."),
            "video_id": info.get("video_id"),
            "success": False
        }

    elif state == "SUCCESS":
        res = task_result.result if isinstance(task_result.result, dict) else {}
        return {
            "task_id": task_id,
            "state": "SUCCESS",
            "progress": 100,
            "stage": "Completed",
            "success": True,
            "video_id": res.get("video_id"),
            "session": res.get("session"),
            "events": res.get("events"),
            "motion": res.get("motion"),
        }

    elif state == "FAILURE":
        info = task_result.info if isinstance(task_result.info, dict) else {}
        return {
            "task_id": task_id,
            "state": "FAILURE",
            "progress": 0,
            "stage": "Failed",
            "success": False,
            "error": str(task_result.result or info.get("error", "Task execution failed"))
        }

    else:
        return {
            "task_id": task_id,
            "state": state,
            "progress": 0,
            "stage": state,
            "success": False
        }


# ============================================================
# SYNCHRONOUS ANALYZE (FALLBACK / DIRECT DEBUGGING)
# ============================================================

@app.post("/api/analyze/sync")
async def analyze_video_sync(
    video: UploadFile = File(...),
    hall_name: str = Form("Unknown Hall"),
    exam_name: str = Form("Untitled Exam"),
    date: str = Form(""),
    camera_id: str = Form("CAM-01"),
):
    if not video.filename:
        raise HTTPException(
            status_code=400,
            detail="No video file provided"
        )

    video_id = str(uuid.uuid4())
    extension = os.path.splitext(video.filename)[1] or ".mp4"

    original_path = os.path.join(ORIGINAL_DIR, f"{video_id}{extension}")
    annotated_path = os.path.join(ANNOTATED_DIR, f"{video_id}_annotated.mp4")

    with open(original_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    return analyze_video_task(
        video_id=video_id,
        original_path=original_path,
        annotated_path=annotated_path,
        hall_name=hall_name,
        exam_name=exam_name,
        date_str=date,
        camera_id=camera_id
    )



# ============================================================
# GET SESSION
# ============================================================

@app.get("/api/session/{video_id}")
def get_session(video_id: str):

    path = os.path.join(
        SESSIONS_DIR,
        f"{video_id}.json"
    )

    if not os.path.exists(path):

        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )

    with open(path) as f:

        return json.load(f)


# ============================================================
# LIST ALL SESSIONS
# ============================================================

@app.get("/api/sessions")
def list_sessions():

    sessions = []

    if not os.path.exists(SESSIONS_DIR):
        return {"sessions": []}

    for filename in os.listdir(SESSIONS_DIR):

        if not filename.endswith(".json"):
            continue

        path = os.path.join(
            SESSIONS_DIR,
            filename
        )

        try:

            with open(path) as f:

                data = json.load(f)

            sessions.append(
                data.get("session", {})
            )

        except Exception:
            # Ignore corrupted session files
            continue


    sessions.sort(
        key=lambda session: session.get("id", ""),
        reverse=True
    )

    return {
        "sessions": sessions
    }


# ============================================================
# SERVE ANNOTATED VIDEO
# ============================================================

@app.get("/api/video/{video_id}/annotated")
def get_annotated_video(video_id: str):

    path = os.path.join(
        ANNOTATED_DIR,
        f"{video_id}_annotated.mp4"
    )

    if not os.path.exists(path):

        raise HTTPException(
            status_code=404,
            detail="Annotated video not found"
        )

    return FileResponse(
        path,
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes"
        }
    )


# ============================================================
# SERVE ORIGINAL VIDEO
# ============================================================

@app.get("/api/video/{video_id}/original")
def get_original_video(video_id: str):

    if not os.path.exists(ORIGINAL_DIR):

        raise HTTPException(
            status_code=404,
            detail="Original video directory not found"
        )

    # Find original video regardless of extension
    for filename in os.listdir(ORIGINAL_DIR):

        if filename.startswith(video_id):

            path = os.path.join(
                ORIGINAL_DIR,
                filename
            )

            return FileResponse(
                path,
                media_type="video/mp4",
                headers={
                    "Accept-Ranges": "bytes"
                }
            )


    raise HTTPException(
        status_code=404,
        detail="Original video not found"
    )


# ============================================================
# LEGACY VIDEO ENDPOINT
# ============================================================

@app.get("/api/video/{video_id}")
def get_video_legacy(video_id: str):

    return get_annotated_video(video_id)


# ============================================================
# SERVE YOLO HEATMAP
# ============================================================

@app.get("/api/heatmap/{video_id}")
def get_heatmap(video_id: str):

    path = os.path.join(
        HEATMAPS_DIR,
        f"{video_id}_heatmap.png"
    )

    if not os.path.exists(path):

        raise HTTPException(
            status_code=404,
            detail="Heatmap not found"
        )

    return FileResponse(
        path,
        media_type="image/png",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400"
        }
    )



# ============================================================
# RAW YOLO DETECTIONS
# ============================================================

@app.get("/api/detections/{video_id}")
def get_detections(video_id: str):

    path = os.path.join(
        RESULTS_DIR,
        f"{video_id}.json"
    )

    if not os.path.exists(path):

        raise HTTPException(
            status_code=404,
            detail="Detection results not found"
        )

    with open(path) as f:

        result = json.load(f)

    return {
        "success": True,

        "video_id": video_id,

        **result
    }


# ============================================================
# RAW MOTION RESULTS
# ============================================================

@app.get("/api/motion/{video_id}")
def get_motion(video_id: str):

    path = os.path.join(
        MOTIONS_DIR,
        f"{video_id}.json"
    )

    if not os.path.exists(path):

        raise HTTPException(
            status_code=404,
            detail="Motion results not found"
        )

    with open(path) as f:

        result = json.load(f)

    return {
        "success": True,

        "video_id": video_id,

        **result
    }