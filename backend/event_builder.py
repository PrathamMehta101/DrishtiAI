"""
event_builder.py
----------------
Converts raw per-frame YOLO detections into frontend-ready event clusters.

Clustering logic:
  - Detections within GAP_THRESHOLD seconds of each other → same cluster
  - Each cluster becomes one event with: start/end time, avg confidence,
    representative ROI (from peak-confidence frame), and an explanation string.
  - Events with avg_confidence > ESCALATE_CONF or duration > ESCALATE_DURATION
    are auto-escalated.
"""

import uuid

# ── Tuning knobs ────────────────────────────────────────────────────────────
GAP_THRESHOLD      = 0.5   # seconds gap that splits clusters
ESCALATE_CONF      = 0.60  # avg confidence above which → "escalated"
ESCALATE_DURATION  = 1.5   # seconds; sustained detection → "escalated"


def build_events(detections: list, video_meta: dict) -> list:
    """
    Parameters
    ----------
    detections : list of raw YOLO detection dicts
        Each has: frame, timestamp, confidence, bbox {x1,y1,x2,y2}, class_name
    video_meta : dict
        Keys: width, height, fps, duration

    Returns
    -------
    list of frontend-ready event dicts
    """
    if not detections:
        return []

    # ── 1. Sort by timestamp ────────────────────────────────────────────────
    sorted_dets = sorted(detections, key=lambda d: d["timestamp"])

    # ── 2. Group into clusters (gap-based) ─────────────────────────────────
    clusters = []
    current = [sorted_dets[0]]

    for det in sorted_dets[1:]:
        gap = det["timestamp"] - current[-1]["timestamp"]
        if gap <= GAP_THRESHOLD:
            current.append(det)
        else:
            clusters.append(current)
            current = [det]
    clusters.append(current)

    # ── 3. Convert each cluster → event ────────────────────────────────────
    events = []
    for i, cluster in enumerate(clusters):
        event = _cluster_to_event(cluster, i, video_meta)
        events.append(event)

    return events


def _cluster_to_event(cluster: list, index: int, video_meta: dict) -> dict:
    timestamps   = [d["timestamp"] for d in cluster]
    confidences  = [d["confidence"] for d in cluster]
    class_name   = cluster[0].get("class_name", "cell phone")

    ts_start  = min(timestamps)
    ts_end    = max(timestamps)
    duration  = ts_end - ts_start
    avg_conf  = sum(confidences) / len(confidences)
    peak_conf = max(confidences)

    # Representative ROI: use the frame with highest confidence
    peak_det = max(cluster, key=lambda d: d["confidence"])
    bbox     = peak_det["bbox"]
    roi = {
        "x": round(bbox["x1"]),
        "y": round(bbox["y1"]),
        "w": round(bbox["x2"] - bbox["x1"]),
        "h": round(bbox["y2"] - bbox["y1"]),
    }

    # Auto-escalate?
    escalate = avg_conf >= ESCALATE_CONF or duration >= ESCALATE_DURATION
    review_status = "escalated" if escalate else "pending"

    explanation = _make_explanation(
        class_name, len(cluster), ts_start, ts_end, peak_conf, escalate
    )

    return {
        "id":               f"evt_{uuid.uuid4().hex[:8]}",
        "type":             "phone_use",
        "timestampStart":   round(ts_start, 3),
        "timestampEnd":     round(ts_end, 3),
        "confidence":       round(avg_conf, 4),
        "objectsDetected":  ["mobile_phone"],
        "roi":              roi,
        "reviewStatus":     review_status,
        "explanation":      explanation,
    }


def _make_explanation(
    class_name: str,
    frame_count: int,
    ts_start: float,
    ts_end: float,
    peak_conf: float,
    escalated: bool,
) -> str:
    duration = round(ts_end - ts_start, 2)
    risk_tag = "HIGH RISK. " if escalated else ""
    return (
        f"{class_name.title()} detected across {frame_count} consecutive frames "
        f"({ts_start:.2f}s – {ts_end:.2f}s, {duration}s duration). "
        f"Peak model confidence: {round(peak_conf * 100)}%. "
        f"{risk_tag}"
        f"{'Sustained detection — candidate likely actively using device.' if escalated else 'Brief detection — candidate may have briefly accessed device.'}"
    )
