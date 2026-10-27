import cv2
import torch
from ultralytics import YOLO

# Auto-detect NVIDIA GPU (e.g. RTX 3050) or fallback to CPU
DEVICE = 0 if torch.cuda.is_available() else "cpu"
model = YOLO("yolo11s.pt")

CELL_PHONE_CLASS_ID = 67
CONFIDENCE_THRESHOLD = 0.25

# Process every Nth frame (stride=1 means every frame, stride=2 means 2x faster, etc.)
FRAME_STRIDE = 1


def format_timestamp(seconds: float) -> str:
    minutes = int(seconds // 60)
    remaining_seconds = seconds % 60
    return f"{minutes:02d}:{remaining_seconds:05.2f}"


def process_video(
    video_path: str,
    output_path: str,
    stride: int = FRAME_STRIDE,
    progress_callback = None
):
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError("Could not open video")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        cap.release()
        raise ValueError("Could not determine video FPS")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps

    # =========================
    # VIDEO WRITER
    # =========================
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(
        output_path,
        fourcc,
        fps,
        (width, height)
    )

    detections = []
    frame_number = 0
    last_annotated_frame = None

    # =========================
    # PROCESS VIDEO ON GPU
    # =========================
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_number += 1
        timestamp = frame_number / fps

        # Report live progress every 15 frames
        if progress_callback and frame_number % 15 == 0 and total_frames > 0:
            pct = 15 + int((frame_number / total_frames) * 55)
            progress_callback(pct, frame_number, total_frames)

        # If stride > 1 and skipping this frame, write previous annotated frame or raw frame
        if stride > 1 and (frame_number % stride != 0):
            if last_annotated_frame is not None:
                out.write(last_annotated_frame)
            else:
                out.write(frame)
            continue

        # Run YOLO on GPU (device=0) or CPU
        results = model(
            frame,
            classes=[CELL_PHONE_CLASS_ID],
            conf=CONFIDENCE_THRESHOLD,
            device=DEVICE,
            verbose=False
        )

        result = results[0]

        # Extract Detections
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            confidence = float(box.conf[0])
            class_id = int(box.cls[0])
            class_name = model.names[class_id]

            detections.append({
                "frame": frame_number,
                "timestamp": round(timestamp, 3),
                "timestamp_formatted": format_timestamp(timestamp),
                "class_id": class_id,
                "class_name": class_name,
                "confidence": round(confidence, 4),
                "bbox": {
                    "x1": round(x1, 2),
                    "y1": round(y1, 2),
                    "x2": round(x2, 2),
                    "y2": round(y2, 2)
                }
            })

        # Draw YOLO Boxes
        annotated_frame = result.plot()
        last_annotated_frame = annotated_frame
        out.write(annotated_frame)

    # =========================
    # CLEANUP
    # =========================
    cap.release()
    out.release()

    return {
        "video": {
            "width": width,
            "height": height,
            "fps": round(fps, 3),
            "total_frames": total_frames,
            "duration": round(duration, 3)
        },
        "model": {
            "name": "YOLO11s",
            "type": "pretrained",
            "device": str(DEVICE),
            "confidence_threshold": CONFIDENCE_THRESHOLD
        },
        "detections": detections,
        "total_detections": len(detections)
    }