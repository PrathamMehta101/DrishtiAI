import os
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import date as _date
from celery_app import celery_app

from yolo_service import process_video
from motion_service import process_motion
from event_builder import build_events
from heatmap_service import generate_heatmap
from groq_service import generate_summary

BASE_DIR = "data"
RESULTS_DIR = os.path.join(BASE_DIR, "results")
MOTIONS_DIR = os.path.join(BASE_DIR, "motions")
SESSIONS_DIR = os.path.join(BASE_DIR, "sessions")

for directory in [RESULTS_DIR, MOTIONS_DIR, SESSIONS_DIR]:
    os.makedirs(directory, exist_ok=True)


# ============================================================
# COMPLETE ANALYSIS PIPELINE (BACKGROUND CELERY TASK)
# ============================================================

@celery_app.task(bind=True, name="tasks.analyze_video_task")
def analyze_video_task(
    self,
    video_id: str,
    original_path: str,
    annotated_path: str,
    hall_name: str = "Unknown Hall",
    exam_name: str = "Untitled Exam",
    date_str: str = "",
    camera_id: str = "CAM-01"
):
    """
    High-performance GPU-accelerated video analysis pipeline:
    1. YOLO object detection (on NVIDIA GPU) with live frame progress
    2. OpenCV motion analysis
    3. Event clustering & Heatmaps (<50ms)
    4. Groq AI summary
    5. Complete session persistence
    """
    task_id = self.request.id if (hasattr(self, "request") and self.request and self.request.id) else None

    def safe_update_state(state: str, progress: int, stage: str):
        if task_id:
            try:
                self.update_state(
                    task_id=task_id,
                    state=state,
                    meta={"stage": stage, "progress": progress, "video_id": video_id}
                )
            except Exception:
                pass

    result_path = os.path.join(RESULTS_DIR, f"{video_id}.json")
    motion_result_path = os.path.join(MOTIONS_DIR, f"{video_id}.json")
    session_path = os.path.join(SESSIONS_DIR, f"{video_id}.json")

    try:
        # ----------------------------------------------------
        # 1. RUN YOLO (GPU) & MOTION (CPU) CONCURRENTLY
        # ----------------------------------------------------
        safe_update_state("PROCESSING", 15, "Starting Parallel Analysis: YOLO (GPU) + Motion (CPU)...")

        def on_yolo_frame_progress(pct, current_f, total_f):
            safe_update_state("PROCESSING", pct, f"Parallel Analysis (Frame {current_f}/{total_f})")

        with ThreadPoolExecutor(max_workers=2) as executor:
            future_yolo = executor.submit(
                process_video,
                original_path,
                annotated_path,
                1,
                on_yolo_frame_progress
            )
            future_motion = executor.submit(
                process_motion,
                original_path,
                motion_result_path
            )

            yolo_result = future_yolo.result()
            motion_result = future_motion.result()

        raw_detections = yolo_result.get("detections", [])
        video_meta = yolo_result.get("video", {})

        with open(result_path, "w") as f:
            json.dump(yolo_result, f, indent=2)

        if motion_result is not None:
            with open(motion_result_path, "w") as f:
                json.dump(motion_result, f, indent=2)


        # ----------------------------------------------------
        # 3. DOWNSTREAM: EVENT CLUSTERING & HEATMAP (<50ms)
        # ----------------------------------------------------
        safe_update_state("PROCESSING", 80, "Clustering Events & Heatmap...")
        events = build_events(raw_detections, video_meta)

        generate_heatmap(
            video_id=video_id,
            detections=raw_detections,
            video_width=video_meta.get("width", 1280),
            video_height=video_meta.get("height", 720),
            video_path=original_path
        )


        # ----------------------------------------------------
        # 4. DOWNSTREAM: GROQ AI SUMMARY (~1-2s)
        # ----------------------------------------------------
        safe_update_state("PROCESSING", 90, "Generating Groq AI Summary...")
        session_meta_for_groq = {
            "hallName": hall_name,
            "examName": exam_name,
            "date": date_str or str(_date.today()),
            "cameraId": camera_id,
            "durationSeconds": video_meta.get("duration", 0),
            "totalDetections": yolo_result.get("total_detections", 0),
        }
        ai = generate_summary(session_meta_for_groq, events)

        # ----------------------------------------------------
        # 5. CALCULATE COUNTS & BUILD SESSION OBJECT
        # ----------------------------------------------------
        high_risk_count = sum(
            1 for event in events if event.get("reviewStatus") == "escalated"
        )
        pending_count = sum(
            1 for event in events if event.get("reviewStatus") == "pending"
        )

        motion_event_count = 0
        if isinstance(motion_result, dict):
            if isinstance(motion_result.get("motion_events"), list):
                motion_event_count = len(motion_result["motion_events"])
            elif isinstance(motion_result.get("events"), list):
                motion_event_count = len(motion_result["events"])
            elif "total_motion_events" in motion_result:
                motion_event_count = motion_result["total_motion_events"]

        session = {
            "id": video_id,
            "hallName": hall_name,
            "examName": exam_name,
            "date": date_str or str(_date.today()),
            "cameraId": camera_id,
            "status": "completed",
            "videoUrl": f"http://localhost:8000/api/video/{video_id}/original",
            "annotatedVideoUrl": f"http://localhost:8000/api/video/{video_id}/annotated",
            "heatmapUrl": f"http://localhost:8000/api/heatmap/{video_id}",
            "motionUrl": f"http://localhost:8000/api/motion/{video_id}",
            "durationSeconds": round(video_meta.get("duration", 0), 3),
            "videoWidth": video_meta.get("width", 0),
            "videoHeight": video_meta.get("height", 0),
            "fps": video_meta.get("fps", 0),
            "modelName": yolo_result.get("model", {}).get("name", "YOLO11s"),
            "device": yolo_result.get("model", {}).get("device", "cuda:0"),
            "totalDetections": yolo_result.get("total_detections", 0),
            "eventCount": len(events),
            "highRiskCount": high_risk_count,
            "pendingReview": pending_count,
            "motionEventCount": motion_event_count,
            "aiSummary": ai.get("summary", ""),
            "riskLevel": ai.get("risk_level", "low"),
            "recommendedAction": ai.get("recommended_action", "none"),
        }

        # ----------------------------------------------------
        # 6. SAVE COMPLETE SESSION FILE
        # ----------------------------------------------------
        with open(session_path, "w") as f:
            json.dump(
                {
                    "session": session,
                    "events": events,
                    "motion": motion_result,
                },
                f,
                indent=2
            )

        return {
            "success": True,
            "status": "SUCCESS",
            "progress": 100,
            "video_id": video_id,
            "session": session,
            "events": events,
            "motion": motion_result
        }

    except Exception as exc:
        raise exc

