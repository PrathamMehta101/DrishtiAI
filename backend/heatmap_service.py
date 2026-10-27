"""
heatmap_service.py
------------------
Generates spatial motion heatmaps overlaid directly onto surveillance footage.
Low motion areas are cool blue, and high motion areas glow yellow/orange/red.
Includes an in-frame thermal legend matching institutional surveillance standards.
"""

import os
import cv2
import numpy as np

HEATMAPS_DIR = os.path.join("data", "heatmaps")
os.makedirs(HEATMAPS_DIR, exist_ok=True)


def generate_motion_heatmap(
    video_id: str,
    video_path: str,
    output_path: str = None,
    detections: list = None,
    events: list = None,
    sample_stride: int = 1
) -> str:
    """
    Computes a pixel-level spatial motion heatmap blended over the video frame:
    - Entire room has a cool blue ambient tint
    - High motion zones glow brightly in yellow, orange, and red
    - Includes bottom-left 'Low motion -> High motion' gradient legend
    """
    if not output_path:
        output_path = os.path.join(HEATMAPS_DIR, f"{video_id}_heatmap.png")

    abs_video_path = os.path.abspath(video_path) if video_path else ""
    if not os.path.exists(abs_video_path):
        # Look in data/original
        alt_path = os.path.abspath(os.path.join("data", "original", f"{video_id}.mp4"))
        if os.path.exists(alt_path):
            abs_video_path = alt_path

    cap = None
    if os.path.exists(abs_video_path):
        cap = cv2.VideoCapture(abs_video_path)

    width = 1280
    height = 720
    reference_frame = None
    motion_canvas = np.zeros((height, width), dtype=np.float32)

    if cap and cap.isOpened():
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        if w > 0 and h > 0:
            width, height = w, h
            motion_canvas = np.zeros((height, width), dtype=np.float32)

        # Pick a sharp reference frame midway through the video
        ref_target = max(0, min(total_frames - 1, total_frames // 4))
        cap.set(cv2.CAP_PROP_POS_FRAMES, ref_target)
        ret, ref = cap.read()
        if ret and ref is not None:
            reference_frame = ref.copy()

        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        ret, prev_frame = cap.read()
        if ret and prev_frame is not None:
            if reference_frame is None:
                reference_frame = prev_frame.copy()

            prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
            prev_gray = cv2.GaussianBlur(prev_gray, (21, 21), 0)

            frame_idx = 0
            while True:
                ret, curr_frame = cap.read()
                if not ret or curr_frame is None:
                    break

                frame_idx += 1
                if sample_stride > 1 and frame_idx % sample_stride != 0:
                    continue

                curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)
                curr_gray_blurred = cv2.GaussianBlur(curr_gray, (21, 21), 0)

                # Frame difference
                diff = cv2.absdiff(prev_gray, curr_gray_blurred)
                _, thresh = cv2.threshold(diff, 18, 255, cv2.THRESH_BINARY)

                # Accumulate motion energy
                motion_canvas += thresh.astype(np.float32)
                prev_gray = curr_gray_blurred

        cap.release()

    # Fallback reference frame if video was unreadable
    if reference_frame is None:
        reference_frame = np.zeros((height, width, 3), dtype=np.uint8)
        reference_frame[:] = (40, 35, 45)

    # Normalize accumulated motion to 0..255
    max_motion = motion_canvas.max()
    if max_motion > 0:
        normalized_motion = (motion_canvas / max_motion * 255.0).astype(np.uint8)
    else:
        normalized_motion = np.zeros((height, width), dtype=np.uint8)

    # Gaussian smoothing for continuous organic thermal spread
    ksize = max(31, int(width * 0.035))
    if ksize % 2 == 0:
        ksize += 1
    smoothed_motion = cv2.GaussianBlur(normalized_motion, (ksize, ksize), 0)

    # Apply JET Colormap (Low = Deep Blue -> Cyan -> Green -> Yellow -> High = Bright Red)
    jet_heatmap = cv2.applyColorMap(smoothed_motion, cv2.COLORMAP_JET)

    # Blend 48% actual classroom video + 52% thermal JET map
    blended = cv2.addWeighted(reference_frame, 0.48, jet_heatmap, 0.52, 0)

    # Draw bottom-left thermal legend box
    bar_w = min(170, int(width * 0.22))
    bar_h = 13
    bar_x = 20
    bar_y = height - bar_h - 22

    # Gradient from 0 to 255
    gradient = np.linspace(0, 255, bar_w, dtype=np.uint8)
    gradient_img = np.tile(gradient, (bar_h, 1))
    gradient_jet = cv2.applyColorMap(gradient_img, cv2.COLORMAP_JET)

    # Semi-transparent dark background for the legend
    box_x1 = max(0, bar_x - 8)
    box_y1 = max(0, bar_y - 20)
    box_x2 = min(width, bar_x + bar_w + 8)
    box_y2 = min(height, bar_y + bar_h + 8)

    overlay = blended.copy()
    cv2.rectangle(overlay, (box_x1, box_y1), (box_x2, box_y2), (10, 12, 18), -1)
    cv2.addWeighted(overlay, 0.75, blended, 0.25, 0, blended)

    # Border around legend card
    cv2.rectangle(blended, (box_x1, box_y1), (box_x2, box_y2), (60, 65, 80), 1)

    # Place gradient bar
    blended[bar_y:bar_y + bar_h, bar_x:bar_x + bar_w] = gradient_jet
    cv2.rectangle(blended, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h), (255, 255, 255), 1)

    # Labels: 'Low motion' and 'High motion'
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(blended, "Low motion", (bar_x, bar_y - 6), font, 0.36, (220, 230, 255), 1, cv2.LINE_AA)
    cv2.putText(blended, "High motion", (bar_x + bar_w - 68, bar_y - 6), font, 0.36, (255, 220, 220), 1, cv2.LINE_AA)

    cv2.imwrite(output_path, blended)
    return output_path


def generate_heatmap(
    video_id: str,
    detections: list = None,
    video_width: int = 1280,
    video_height: int = 720,
    video_path: str = None,
    events: list = None
) -> str:
    original_path = video_path or os.path.join("data", "original", f"{video_id}.mp4")
    return generate_motion_heatmap(
        video_id=video_id,
        video_path=original_path,
        detections=detections,
        events=events
    )
