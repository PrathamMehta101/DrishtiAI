"""
PS2 - Offline Video Motion Detection & ROI Extraction
------------------------------------------------------
Given a recorded video, this script:
  1. Runs background subtraction (MOG2) to get a coarse motion mask per frame
  2. Filters out noise/small blobs (camera noise, flicker)
  3. Finds contours -> candidate ROIs (bounding boxes) per frame
  4. Aggregates motion over time (temporal smoothing) to avoid over-segmentation
  5. Builds a cumulative motion heatmap for the whole video
  6. Outputs an event log (JSON) of {start_time, end_time, roi, confidence}

Usage:
    python motion_detection.py --video path/to/video.mp4 --out events.json
"""

import cv2
import numpy as np
import json
import argparse
from dataclasses import dataclass, asdict


# ---------------------------------------------------------------------------
# Config - tune these thresholds against your actual exam-hall footage
# ---------------------------------------------------------------------------
MIN_CONTOUR_AREA = 800          # ignore tiny blobs (noise, shadows)
MOTION_HISTORY = 500            # frames used to build MOG2 background model
VAR_THRESHOLD = 40              # MOG2 sensitivity (lower = more sensitive)
EVENT_START_THRESHOLD = 0.15    # fraction of frame area moving to start an event
EVENT_END_GRACE_FRAMES = 15     # frames of low motion before closing an event (hysteresis)
DOWNSCALE_WIDTH = 640           # resize frames for speed; keep aspect ratio


@dataclass
class Event:
    start_frame: int
    end_frame: int
    start_time: float
    end_time: float
    roi: dict          # bounding box in original-resolution coords {x, y, w, h}
    confidence: float  # 0-1, based on motion magnitude + duration + area


def get_scale_and_size(cap, target_width=DOWNSCALE_WIDTH):
    orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    scale = target_width / orig_w
    new_size = (target_width, int(orig_h * scale))
    return scale, new_size, orig_w, orig_h


def detect_motion(video_path: str, out_json: str, visualize: bool = False):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise FileNotFoundError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    scale, resize_dim, orig_w, orig_h = get_scale_and_size(cap)

    # Background subtractor - handles gradual lighting change, shadows
    back_sub = cv2.createBackgroundSubtractorMOG2(
        history=MOTION_HISTORY, varThreshold=VAR_THRESHOLD, detectShadows=True
    )

    heatmap_accum = np.zeros(resize_dim[::-1], dtype=np.float32)  # (h, w)

    events = []
    active_event = None
    low_motion_streak = 0
    frame_idx = 0

    prev_gray = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        small = cv2.resize(frame, resize_dim)
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)  # reduce sensor noise

        # --- 1. Coarse motion mask via background subtraction ---
        fg_mask = back_sub.apply(small)
        # Remove shadow pixels (MOG2 marks shadows as gray/127) and threshold
        _, fg_mask = cv2.threshold(fg_mask, 200, 255, cv2.THRESH_BINARY)
        # Morphological cleanup: remove speckle noise, fill small gaps
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel, iterations=1)
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_DILATE, kernel, iterations=2)

        # --- 2. Optical flow magnitude (for heatmap + confidence weighting) ---
        flow_mag_mean = 0.0
        if prev_gray is not None:
            flow = cv2.calcOpticalFlowFarneback(
                prev_gray, gray, None,
                pyr_scale=0.5, levels=3, winsize=15,
                iterations=3, poly_n=5, poly_sigma=1.2, flags=0
            )
            mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            heatmap_accum += mag
            flow_mag_mean = float(np.mean(mag))
        prev_gray = gray

        # --- 3. Contours -> candidate ROIs ---
        contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        boxes = [cv2.boundingRect(c) for c in contours if cv2.contourArea(c) >= MIN_CONTOUR_AREA]

        motion_fraction = np.sum(fg_mask > 0) / fg_mask.size

        # --- 4. Temporal event logic (hysteresis to avoid over-segmentation) ---
        if motion_fraction >= EVENT_START_THRESHOLD and boxes:
            merged_box = merge_boxes(boxes)
            low_motion_streak = 0
            if active_event is None:
                active_event = {
                    "start_frame": frame_idx,
                    "boxes": [merged_box],
                    "flow_scores": [flow_mag_mean],
                    "motion_fractions": [motion_fraction],
                }
            else:
                active_event["boxes"].append(merged_box)
                active_event["flow_scores"].append(flow_mag_mean)
                active_event["motion_fractions"].append(motion_fraction)
        else:
            if active_event is not None:
                low_motion_streak += 1
                if low_motion_streak >= EVENT_END_GRACE_FRAMES:
                    events.append(close_event(active_event, frame_idx, fps, scale))
                    active_event = None
                    low_motion_streak = 0

        if visualize:
            debug = small.copy()
            for (x, y, w, h) in boxes:
                cv2.rectangle(debug, (x, y), (x + w, y + h), (0, 0, 255), 2)
            cv2.imshow("motion mask", fg_mask)
            cv2.imshow("frame", debug)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

        frame_idx += 1

    # close any event still open at end of video
    if active_event is not None:
        events.append(close_event(active_event, frame_idx, fps, scale))

    cap.release()
    if visualize:
        cv2.destroyAllWindows()

    # --- 5. Save heatmap image ---
    heatmap_norm = cv2.normalize(heatmap_accum, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    heatmap_color = cv2.applyColorMap(heatmap_norm, cv2.COLORMAP_JET)
    heatmap_color = cv2.resize(heatmap_color, (orig_w, orig_h))
    heatmap_path = out_json.replace(".json", "_heatmap.png")
    cv2.imwrite(heatmap_path, heatmap_color)

    # --- 6. Save event log ---
    with open(out_json, "w") as f:
        json.dump([asdict(e) for e in events], f, indent=2)

    print(f"Detected {len(events)} motion events.")
    print(f"Event log saved to: {out_json}")
    print(f"Heatmap saved to: {heatmap_path}")

    return events


def merge_boxes(boxes):
    """Merge multiple candidate boxes into one bounding region for this frame."""
    xs = [b[0] for b in boxes]
    ys = [b[1] for b in boxes]
    x2s = [b[0] + b[2] for b in boxes]
    y2s = [b[1] + b[3] for b in boxes]
    x, y = min(xs), min(ys)
    w, h = max(x2s) - x, max(y2s) - y
    return (x, y, w, h)


def close_event(active_event, end_frame, fps, scale) -> Event:
    boxes = active_event["boxes"]
    xs = [b[0] for b in boxes]
    ys = [b[1] for b in boxes]
    x2s = [b[0] + b[2] for b in boxes]
    y2s = [b[1] + b[3] for b in boxes]
    x, y = min(xs), min(ys)
    w, h = max(x2s) - x, max(y2s) - y

    # scale ROI back to original video resolution
    roi = {
        "x": int(x / scale), "y": int(y / scale),
        "w": int(w / scale), "h": int(h / scale),
    }

    avg_flow = float(np.mean(active_event["flow_scores"])) if active_event["flow_scores"] else 0.0
    avg_frac = float(np.mean(active_event["motion_fractions"]))
    duration_frames = end_frame - active_event["start_frame"]

    # simple explainable confidence: combine motion magnitude, coverage, duration
    confidence = min(1.0, (0.5 * min(avg_flow / 5.0, 1.0)) +
                           (0.3 * min(avg_frac / 0.5, 1.0)) +
                           (0.2 * min(duration_frames / (fps * 3), 1.0)))

    return Event(
        start_frame=active_event["start_frame"],
        end_frame=end_frame,
        start_time=round(active_event["start_frame"] / fps, 2),
        end_time=round(end_frame / fps, 2),
        roi=roi,
        confidence=round(confidence, 3),
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True, help="Path to input video")
    parser.add_argument("--out", default="events.json", help="Path to output event log JSON")
    parser.add_argument("--visualize", action="store_true", help="Show live debug windows")
    args = parser.parse_args()

    detect_motion(args.video, args.out, visualize=args.visualize)