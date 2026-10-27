# Frontend Software Requirements Specification (SRS)
## Project: DEXIT Hackathon — Problem Statement #2
### Offline Video Segmentation & ROI Detection using Motion Estimation

---

## 1. Purpose

This document specifies the requirements for the **frontend web application** that serves as the presentation and interaction layer for a backend AI system that performs offline analysis of recorded examination-hall surveillance footage. The backend handles motion estimation, ROI detection, event segmentation, and object detection; the frontend's job is to let investigators **upload footage, monitor processing, and review results** in a clean, premium, trustworthy interface.

This document is intended to be used as a persistent reference (e.g. by an AI coding agent such as Antigravity) while building the frontend, so it should be treated as the source of truth for scope, structure, and design intent.

---

## 2. Product Vision

A calm, professional, "investigation console" feel — not a flashy consumer app. Think: the UI a forensic analyst or exam-cell administrator would trust with sensitive footage. Minimal chrome, generous whitespace, confident typography, dark-mode-first (since this is video-review software used for long sessions), and subtle motion/微-interactions rather than loud color.

**Tone words:** premium, precise, quiet, forensic, trustworthy, minimal.

**Avoid:** gamified dashboards, bright saturated colors, cluttered stat-cards, generic Bootstrap look.

---

## 3. Scope of the Frontend

The frontend is a **client** to a backend API (assume REST/WebSocket endpoints will be provided separately). It does NOT perform any video processing itself. Its responsibilities:

1. Upload / select recorded video(s) for offline processing.
2. Display processing status/progress (job queue).
3. Visualize results:
   - Segmented event clips (timeline of events)
   - ROI (Region of Interest) overlays on video frames
   - Motion heatmaps
   - Activity timeline (scrubbable, with event markers)
   - Detected object flags (phone, chit/paper, etc.) with timestamps
   - Confidence scores per event
4. Provide a searchable/filterable event log.
5. Allow an investigator to review a flagged event: play the clip, see the overlay, see explanation/confidence, mark it reviewed/dismissed/escalated.
6. Provide a summary/export view (e.g. PDF/CSV export of reviewed events) — export action can be a stub calling a backend endpoint.

Out of scope: authentication system design (assume a simple login screen), actual ML inference, video storage infrastructure.

---

## 4. User Roles

- **Investigator / Invigilator-in-charge** — primary user. Uploads footage, reviews flagged events, marks decisions.
- **Admin** (optional, stretch) — manages exam sessions/halls, views aggregate analytics across multiple halls.

For hackathon scope, a single role (Investigator) is sufficient unless time permits an admin overview page.

---

## 5. Information Architecture / Screens

1. **Login / Landing** — minimal auth screen, product name + tagline.
2. **Dashboard (Sessions/Uploads list)**
   - List of exam sessions / uploaded videos with status: `Queued`, `Processing`, `Completed`, `Failed`
   - Quick stats: total events flagged, high-risk count, review pending count
   - Primary CTA: "Upload Recording"
3. **Upload Flow**
   - Drag-and-drop / file picker for video upload
   - Metadata fields: hall name, exam name/date, camera ID (optional, multi-camera support later)
   - Submit → shows job created, redirects to processing view
4. **Processing / Job Status View**
   - Progress indicator (percentage or stage: "Extracting frames → Motion estimation → Segmenting → Generating report")
   - Estimated time remaining if available from backend
5. **Session Detail / Review Screen** (the core screen)
   - Video player (large, central)
   - Horizontal **activity timeline** below the player with event markers color-coded by risk/confidence, scrubbing syncs video
   - Side panel: **Event list** (searchable/filterable by object type, risk level, time range)
   - On selecting an event: player seeks to timestamp, ROI bounding-box overlay drawn on video, event detail card shows (behavior type, confidence score, detected objects, duration)
   - Motion heatmap toggle (overlay or separate thumbnail strip)
   - Action buttons per event: Mark Reviewed / Dismiss / Escalate, optional note field
6. **Summary / Export View**
   - Aggregated stats for the session (total events, breakdown by type, review status)
   - Export button (PDF/CSV) — calls backend export endpoint

---

## 6. Key UI Components (reusable)

- `VideoPlayer` — supports seek-to-timestamp, overlay canvas layer for ROI boxes
- `ActivityTimeline` — horizontal scrubbable bar with density/markers, synced to player
- `EventCard` / `EventList` — compact list item showing time, type, confidence badge, thumbnail
- `ConfidenceBadge` — small pill, color intensity maps to confidence/risk (avoid harsh red; use muted amber/rose accents)
- `UploadDropzone`
- `StatusPill` (Queued/Processing/Completed/Failed)
- `HeatmapOverlay`
- `Sidebar` / `TopNav` — minimal, icon + label, collapsible
- `EmptyState` — for no-sessions / no-events cases (important for a premium feel)

---

## 7. Visual Design Direction

- **Theme:** Dark-first (deep charcoal/near-black background, e.g. `#0B0C0E`–`#121316`), with a single restrained accent color (e.g. muted electric blue or amber — pick ONE) used sparingly for primary actions and active states.
- **Typography:** One clean sans-serif for UI (e.g. Inter, Geist, or similar), tight letter-spacing on headings, generous line-height on body. Numerical/timestamp data can use a subtle monospace (e.g. for timecodes) to reinforce the "forensic tool" feel.
- **Spacing:** Generous padding, avoid dense dashboard clutter. Prefer a few well-composed panels over many small cards.
- **Cards/panels:** Subtle 1px borders (low-opacity white/gray) rather than heavy shadows; very slight glassmorphism/blur is acceptable if used sparingly (e.g. top nav).
- **Motion:** Subtle fade/slide transitions (150–250ms) on panel changes and timeline scrubbing; no bouncy/playful easing.
- **Iconography:** Thin-stroke, consistent icon set (e.g. Lucide).
- **Data viz:** Muted, desaturated palette for charts/heatmaps except the risk/confidence indicators, which can use a restrained warm accent to draw attention.
- **Do not** use default Tailwind blue/purple gradients, emoji, or playful illustrations — this is professional software handling sensitive exam-integrity data.

---

## 8. Non-Functional Requirements

- Responsive down to tablet width (primary use is desktop/monitoring workstation per hardware spec, so mobile is not a priority).
- Frontend should be built to consume a REST API + optionally WebSocket for live job-progress updates (stub with polling if WebSocket unavailable during hackathon).
- All data shown (events, confidence, heatmaps) should degrade gracefully with mock/sample data if backend endpoints aren't ready — i.e. build with a clear mock-data layer that's easy to swap for real API calls.
- Accessibility: sufficient contrast even in dark theme, keyboard-navigable timeline/list.

---

## 9. Sample Data Shape (for building against mocks)

```json
{
  "session": {
    "id": "sess_001",
    "hallName": "Exam Hall A",
    "examName": "Semester 5 - DBMS",
    "date": "2026-08-20",
    "status": "completed",
    "videoUrl": "/mock/hall-a.mp4",
    "durationSeconds": 5400
  },
  "events": [
    {
      "id": "evt_001",
      "timestampStart": 342,
      "timestampEnd": 358,
      "type": "hand_movement",
      "confidence": 0.82,
      "objectsDetected": ["paper_chit"],
      "roi": { "x": 120, "y": 80, "w": 60, "h": 90 },
      "reviewStatus": "pending",
      "explanation": "Repeated hand movement toward neighboring seat with object exchange pattern."
    }
  ]
}
```

---

## 10. Deliverable Priority (for hackathon time constraints)

**Must have:** Dashboard, Upload flow (can be mocked), Session Review screen (player + timeline + event list + ROI overlay), premium dark visual design.

**Nice to have:** Motion heatmap overlay, export view, admin/aggregate analytics, WebSocket live progress.

**Skip if short on time:** Multi-role auth, multi-camera sync UI, notes/audit trail persistence.

---

## 11. Tech Suggestions (non-binding)

React + Tailwind CSS, component library kept minimal/custom rather than a heavy pre-styled kit (to preserve the premium custom look), Framer Motion for the subtle transitions, Recharts or a lightweight custom SVG for the activity timeline/heatmap.
