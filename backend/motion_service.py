import cv2
import os
import json


# ============================================================
# MOTION DETECTION CONFIGURATION
# ============================================================

# How much difference between two frames is considered motion.
# Lower = more sensitive
# Higher = less sensitive (ignores ambient lighting/noise)
DIFF_THRESHOLD = 38

# Minimum contour area to consider as meaningful high motion.
# Filters out tiny movements, dust, and camera sensor noise.
MIN_CONTOUR_AREA = 850

# Morphological kernel size used to clean the motion mask.
MORPH_KERNEL_SIZE = 5

# Blur size used before frame comparison.
BLUR_SIZE = 21

# How many consecutive motion frames are needed before
# considering it a motion event.
MIN_EVENT_FRAMES = 3

# Gap between motion frames before ending an event.
MAX_EVENT_GAP = 5


# ============================================================
# HELPER: FORMAT TIMESTAMP
# ============================================================

def format_timestamp(seconds: float) -> str:

    minutes = int(seconds // 60)

    remaining_seconds = seconds % 60

    return f"{minutes:02d}:{remaining_seconds:05.2f}"


# ============================================================
# HELPER: CALCULATE MOTION
# ============================================================

def detect_motion_regions(previous_frame, current_frame):

    # --------------------------------------------------------
    # Convert frames to grayscale
    # --------------------------------------------------------

    previous_gray = cv2.cvtColor(
        previous_frame,
        cv2.COLOR_BGR2GRAY
    )

    current_gray = cv2.cvtColor(
        current_frame,
        cv2.COLOR_BGR2GRAY
    )

    # --------------------------------------------------------
    # Blur frames
    #
    # This reduces tiny changes caused by camera noise.
    # --------------------------------------------------------

    previous_gray = cv2.GaussianBlur(
        previous_gray,
        (BLUR_SIZE, BLUR_SIZE),
        0
    )

    current_gray = cv2.GaussianBlur(
        current_gray,
        (BLUR_SIZE, BLUR_SIZE),
        0
    )

    # --------------------------------------------------------
    # Calculate absolute difference
    # --------------------------------------------------------

    frame_difference = cv2.absdiff(
        previous_gray,
        current_gray
    )

    # --------------------------------------------------------
    # Convert difference to binary mask
    # --------------------------------------------------------

    _, threshold = cv2.threshold(
        frame_difference,
        DIFF_THRESHOLD,
        255,
        cv2.THRESH_BINARY
    )

    # --------------------------------------------------------
    # Morphological cleanup
    # --------------------------------------------------------

    kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE,
        (
            MORPH_KERNEL_SIZE,
            MORPH_KERNEL_SIZE
        )
    )

    threshold = cv2.morphologyEx(
        threshold,
        cv2.MORPH_OPEN,
        kernel
    )

    threshold = cv2.dilate(
        threshold,
        kernel,
        iterations=2
    )

    # --------------------------------------------------------
    # Find motion contours
    # --------------------------------------------------------

    contours, _ = cv2.findContours(
        threshold,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    regions = []

    total_motion_area = 0

    for contour in contours:

        area = cv2.contourArea(contour)

        # Ignore tiny changes
        if area < MIN_CONTOUR_AREA:
            continue

        x, y, width, height = cv2.boundingRect(contour)

        x2 = x + width
        y2 = y + height

        total_motion_area += area

        regions.append({
            "x1": round(float(x), 2),
            "y1": round(float(y), 2),
            "x2": round(float(x2), 2),
            "y2": round(float(y2), 2),
            "area": round(float(area), 2)
        })

    return regions, total_motion_area


# ============================================================
# MAIN MOTION PROCESSOR
# ============================================================

def process_motion(video_path: str, output_path: str):

    # --------------------------------------------------------
    # Validate video
    # --------------------------------------------------------

    if not os.path.exists(video_path):

        raise FileNotFoundError(
            f"Video not found: {video_path}"
        )

    # --------------------------------------------------------
    # Open video
    # --------------------------------------------------------

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():

        raise RuntimeError(
            f"Could not open video: {video_path}"
        )

    # --------------------------------------------------------
    # Video metadata
    # --------------------------------------------------------

    fps = cap.get(cv2.CAP_PROP_FPS)

    if fps <= 0:
        fps = 30.0

    width = int(
        cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    )

    height = int(
        cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    )

    total_frames = int(
        cap.get(cv2.CAP_PROP_FRAME_COUNT)
    )

    duration = (
        total_frames / fps
        if fps > 0
        else 0
    )

    # --------------------------------------------------------
    # Read first frame
    # --------------------------------------------------------

    ret, previous_frame = cap.read()

    if not ret:

        cap.release()

        raise RuntimeError(
            "Could not read first frame from video"
        )

    # --------------------------------------------------------
    # Detection storage
    # --------------------------------------------------------

    motion_frames = []

    frame_number = 1

    # ========================================================
    # PROCESS EVERY FRAME
    # ========================================================

    while True:

        ret, current_frame = cap.read()

        if not ret:
            break

        # ----------------------------------------------------
        # Detect motion
        # ----------------------------------------------------

        regions, motion_area = detect_motion_regions(
            previous_frame,
            current_frame
        )

        # ----------------------------------------------------
        # Calculate motion score
        #
        # Percentage of frame occupied by motion.
        # ----------------------------------------------------

        frame_area = width * height

        if frame_area > 0:

            motion_score = (
                motion_area / frame_area
            )

        else:

            motion_score = 0

        has_motion = len(regions) > 0

        # ----------------------------------------------------
        # Timestamp
        # ----------------------------------------------------

        timestamp = frame_number / fps

        # ----------------------------------------------------
        # Store only frames where motion exists
        #
        # This keeps the JSON much smaller.
        # ----------------------------------------------------

        if has_motion:

            motion_frames.append({

                "frame": frame_number,

                "timestamp": round(
                    timestamp,
                    3
                ),

                "timestamp_formatted":
                    format_timestamp(timestamp),

                "motion": True,

                "motion_score": round(
                    motion_score,
                    6
                ),

                "regions": regions
            })

        # ----------------------------------------------------
        # Current frame becomes previous frame
        # ----------------------------------------------------

        previous_frame = current_frame

        frame_number += 1

    # ========================================================
    # CLEANUP
    # ========================================================

    cap.release()

    # ========================================================
    # BUILD MOTION EVENTS
    # ========================================================

    motion_events = build_motion_events(
        motion_frames,
        fps
    )

    # ========================================================
    # BUILD RESULT
    # ========================================================

    result = {

        "success": True,

        "video_id": os.path.splitext(
            os.path.basename(output_path)
        )[0],

        "video": {

            "width": width,

            "height": height,

            "fps": round(
                float(fps),
                3
            ),

            "total_frames":
                total_frames,

            "duration":
                round(
                    float(duration),
                    3
                )
        },

        "motion": {

            "method":
                "OpenCV frame differencing",

            "diff_threshold":
                DIFF_THRESHOLD,

            "min_contour_area":
                MIN_CONTOUR_AREA,

            "blur_size":
                BLUR_SIZE,

            "total_motion_frames":
                len(motion_frames),

            "total_motion_events":
                len(motion_events)
        },

        "motion_frames":
            motion_frames,

        "motion_events":
            motion_events
    }

    # ========================================================
    # SAVE JSON
    # ========================================================

    os.makedirs(
        os.path.dirname(output_path),
        exist_ok=True
    )

    with open(
        output_path,
        "w"
    ) as f:

        json.dump(
            result,
            f,
            indent=2
        )

    return result


# ============================================================
# BUILD MOTION EVENTS
# ============================================================

def build_motion_events(
    motion_frames,
    fps
):

    if not motion_frames:

        return []

    events = []

    # Current event
    current_event = None

    for detection in motion_frames:

        frame = detection["frame"]

        timestamp = detection["timestamp"]

        # ----------------------------------------------------
        # Start new event
        # ----------------------------------------------------

        if current_event is None:

            current_event = {

                "start_frame":
                    frame,

                "end_frame":
                    frame,

                "start_time":
                    timestamp,

                "end_time":
                    timestamp,

                "detections": 1,

                "max_motion_score":
                    detection["motion_score"],

                "regions":
                    detection["regions"]
            }

            continue

        # ----------------------------------------------------
        # Determine frame gap
        # ----------------------------------------------------

        frame_gap = (
            frame -
            current_event["end_frame"]
        )

        # ----------------------------------------------------
        # Continue current event
        # ----------------------------------------------------

        if frame_gap <= MAX_EVENT_GAP:

            current_event["end_frame"] = frame

            current_event["end_time"] = timestamp

            current_event["detections"] += 1

            current_event["max_motion_score"] = max(
                current_event["max_motion_score"],
                detection["motion_score"]
            )

            current_event["regions"].extend(
                detection["regions"]
            )

        # ----------------------------------------------------
        # End current event and start another
        # ----------------------------------------------------

        else:

            if (
                current_event["detections"]
                >= MIN_EVENT_FRAMES
            ):

                events.append(
                    finalize_motion_event(
                        current_event
                    )
                )

            current_event = {

                "start_frame":
                    frame,

                "end_frame":
                    frame,

                "start_time":
                    timestamp,

                "end_time":
                    timestamp,

                "detections": 1,

                "max_motion_score":
                    detection["motion_score"],

                "regions":
                    detection["regions"]
            }

    # ========================================================
    # FINAL EVENT
    # ========================================================

    if current_event is not None:

        if (
            current_event["detections"]
            >= MIN_EVENT_FRAMES
        ):

            events.append(
                finalize_motion_event(
                    current_event
                )
            )

    return events


# ============================================================
# FINALIZE MOTION EVENT
# ============================================================

def finalize_motion_event(event):

    # --------------------------------------------------------
    # Calculate duration
    # --------------------------------------------------------

    duration = (
        event["end_time"]
        -
        event["start_time"]
    )

    # --------------------------------------------------------
    # Calculate overall bounding box
    #
    # This gives frontend a convenient region to visualize.
    # --------------------------------------------------------

    regions = event["regions"]

    if regions:

        x1 = min(
            region["x1"]
            for region in regions
        )

        y1 = min(
            region["y1"]
            for region in regions
        )

        x2 = max(
            region["x2"]
            for region in regions
        )

        y2 = max(
            region["y2"]
            for region in regions
        )

        bounding_box = {

            "x1": round(x1, 2),

            "y1": round(y1, 2),

            "x2": round(x2, 2),

            "y2": round(y2, 2)
        }

    else:

        bounding_box = None

    return {

        "start_frame":
            event["start_frame"],

        "end_frame":
            event["end_frame"],

        "start_time":
            round(
                event["start_time"],
                3
            ),

        "end_time":
            round(
                event["end_time"],
                3
            ),

        "start_timestamp":
            format_timestamp(
                event["start_time"]
            ),

        "end_timestamp":
            format_timestamp(
                event["end_time"]
            ),

        "duration":
            round(
                duration,
                3
            ),

        "detections":
            event["detections"],

        "max_motion_score":
            round(
                event["max_motion_score"],
                6
            ),

        "bbox":
            bounding_box
    }