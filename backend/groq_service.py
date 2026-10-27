"""
groq_service.py
---------------
Generates a structured AI summary of a session using Groq's LLaMA model.

Returns:
  {
    "summary":              str,  # 2-3 sentence narrative
    "risk_level":           str,  # "HIGH" | "MEDIUM" | "LOW"
    "recommended_action":   str,  # one-line action string
  }
"""

import os
import json
from dotenv import load_dotenv

load_dotenv()  # reads backend/.env

try:
    from groq import Groq
    _client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
    _GROQ_AVAILABLE = True
except Exception:
    _client = None
    _GROQ_AVAILABLE = False


MODEL = "llama-3.1-8b-instant"


def generate_summary(session_meta: dict, events: list) -> dict:
    """
    Parameters
    ----------
    session_meta : dict with hallName, examName, date, cameraId, durationSeconds
    events       : list of frontend-shaped event dicts

    Returns
    -------
    dict with keys: summary, risk_level, recommended_action
    """
    if not _GROQ_AVAILABLE or not _client:
        return _fallback_summary(events)

    try:
        prompt = _build_prompt(session_meta, events)
        response = _client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an AI system that analyses exam-hall surveillance video. "
                        "You receive a structured JSON summary of suspicious activity detected "
                        "by a YOLO object detection model. "
                        "Respond ONLY with valid JSON — no markdown, no prose outside JSON."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=400,
        )
        raw = response.choices[0].message.content.strip()
        # Strip any accidental markdown fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw)
        # Ensure required keys exist
        return {
            "summary":            result.get("summary", ""),
            "risk_level":         result.get("risk_level", "HIGH").upper(),
            "recommended_action": result.get("recommended_action", "Manual review required."),
        }
    except Exception as exc:
        print(f"[groq_service] Groq call failed: {exc}")
        return _fallback_summary(events)


def _build_prompt(session_meta: dict, events: list) -> str:
    total_events  = len(events)
    escalated     = sum(1 for e in events if e.get("reviewStatus") == "escalated")
    avg_conf      = (
        round(sum(e.get("confidence", 0) for e in events) / total_events * 100)
        if total_events else 0
    )
    top = events[0] if events else {}

    data = {
        "hall":            session_meta.get("hallName", "Unknown Hall"),
        "exam":            session_meta.get("examName", "Unknown Exam"),
        "date":            session_meta.get("date", ""),
        "camera":          session_meta.get("cameraId", ""),
        "video_duration_s": session_meta.get("durationSeconds", 0),
        "total_detections": session_meta.get("totalDetections", 0),
        "total_events":    total_events,
        "escalated_events": escalated,
        "avg_confidence_pct": avg_conf,
        "top_event": {
            "type":            top.get("type", ""),
            "timestampStart":  top.get("timestampStart", 0),
            "timestampEnd":    top.get("timestampEnd", 0),
            "confidence":      round((top.get("confidence", 0)) * 100),
            "objectsDetected": top.get("objectsDetected", []),
        } if top else None,
    }

    return (
        f"Analyse the following exam-hall surveillance data and return a JSON object "
        f"with exactly three keys: summary, risk_level, recommended_action.\n\n"
        f"- summary: 2-3 sentences describing what was detected, when, and how severe.\n"
        f"- risk_level: one of HIGH, MEDIUM, LOW.\n"
        f"- recommended_action: one sentence telling the invigilator what to do next.\n\n"
        f"Data:\n{json.dumps(data, indent=2)}"
    )


def _fallback_summary(events: list) -> dict:
    """Used when Groq is unavailable — generates a rule-based summary."""
    n = len(events)
    esc = sum(1 for e in events if e.get("reviewStatus") == "escalated")
    return {
        "summary": (
            f"The YOLO11s model detected {n} suspicious event{'s' if n != 1 else ''} "
            f"in this session, of which {esc} {'were' if esc != 1 else 'was'} "
            f"automatically escalated based on confidence and duration. "
            f"Manual review of the flagged timestamps is strongly recommended."
        ),
        "risk_level": "HIGH" if esc > 0 else "MEDIUM",
        "recommended_action": (
            "Review escalated events immediately and cross-reference with the annotated video."
        ),
    }
