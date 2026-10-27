// ── Mock Data Layer ─────────────────────────────────────────────────
// Replace these with real API calls. Each function mirrors what the
// backend will return. Keep shapes consistent with the SRS §9 spec.

export const MOCK_SESSIONS = [
  {
    id: 'sess_001',
    hallName: 'Exam Hall A',
    examName: 'Semester 5 – DBMS',
    date: '2026-08-20',
    status: 'completed',
    videoUrl: '/demo.mp4',
    durationSeconds: 88,
    cameraId: 'CAM-01',
    eventCount: 8,
    highRiskCount: 2,
    pendingReview: 5,
  },
  {
    id: 'sess_002',
    hallName: 'Exam Hall B',
    examName: 'Semester 6 – Operating Systems',
    date: '2026-08-20',
    status: 'completed',
    videoUrl: '/demo.mp4',
    durationSeconds: 88,
    cameraId: 'CAM-02',
    eventCount: 14,
    highRiskCount: 5,
    pendingReview: 9,
  },
  {
    id: 'sess_003',
    hallName: 'Exam Hall C',
    examName: 'Semester 4 – Computer Networks',
    date: '2026-08-21',
    status: 'processing',
    videoUrl: null,
    durationSeconds: 5400,
    cameraId: 'CAM-03',
    eventCount: null,
    highRiskCount: null,
    pendingReview: null,
    processingStage: 'motion_estimation',
    processingPercent: 62,
  },
  {
    id: 'sess_004',
    hallName: 'Exam Hall A',
    examName: 'Semester 3 – Discrete Math',
    date: '2026-08-21',
    status: 'queued',
    videoUrl: null,
    durationSeconds: 5400,
    cameraId: 'CAM-01',
    eventCount: null,
    highRiskCount: null,
    pendingReview: null,
  },
  {
    id: 'sess_005',
    hallName: 'Exam Hall D',
    examName: 'Semester 2 – Engineering Maths',
    date: '2026-08-19',
    status: 'failed',
    videoUrl: null,
    durationSeconds: 3600,
    cameraId: 'CAM-04',
    eventCount: null,
    highRiskCount: null,
    pendingReview: null,
    errorMessage: 'Frame extraction failed: corrupted video file at 00:14:22.',
  },
  // ── Real backend session — YOLO11s detections ──────────────────────
  {
    id: 'sess_backend_001',
    hallName: 'Exam Hall E',
    examName: 'First Backend Session',
    date: '2026-08-22',
    status: 'completed',
    // Video served from public/ — copied from backend/data/original/
    videoUrl: '/backend_session.mp4',
    // Video is 7.87 s at 30 fps (236 frames) — YOLO11s pretrained
    durationSeconds: 7.866,
    cameraId: 'CAM-05',
    eventCount: 6,
    highRiskCount: 3,
    pendingReview: 4,
    // UUID of the processed recording
    sourceUuid: '9963d75e-002b-4161-a127-e22017282342',
    modelName: 'YOLO11s',
    totalDetections: 63,
    videoWidth: 848,
    videoHeight: 478,
  },
];

export const MOCK_EVENTS = {
  sess_001: [
    {
      id: 'evt_001',
      sessionId: 'sess_001',
      timestampStart: 5,
      timestampEnd: 15,
      type: 'hand_movement',
      confidence: 0.82,
      objectsDetected: ['paper_chit'],
      roi: { x: 120, y: 80, w: 60, h: 90 },
      reviewStatus: 'pending',
      explanation: 'Repeated hand movement toward neighboring seat with object exchange pattern.',
    },
    {
      id: 'evt_002',
      sessionId: 'sess_001',
      timestampStart: 20,
      timestampEnd: 25,
      type: 'phone_use',
      confidence: 0.91,
      objectsDetected: ['mobile_phone'],
      roi: { x: 200, y: 150, w: 50, h: 40 },
      reviewStatus: 'pending',
      explanation: 'Candidate reached under desk; luminous screen detected in pocket region.',
    },
    {
      id: 'evt_003',
      sessionId: 'sess_001',
      timestampStart: 30,
      timestampEnd: 35,
      type: 'gaze_shift',
      confidence: 0.67,
      objectsDetected: [],
      roi: { x: 80, y: 40, w: 80, h: 60 },
      reviewStatus: 'reviewed',
      explanation: 'Candidate head orientation shifted sharply to adjacent row for ~10 seconds.',
    },
    {
      id: 'evt_004',
      sessionId: 'sess_001',
      timestampStart: 40,
      timestampEnd: 50,
      type: 'object_exchange',
      confidence: 0.88,
      objectsDetected: ['paper_chit'],
      roi: { x: 140, y: 100, w: 70, h: 80 },
      reviewStatus: 'escalated',
      explanation: 'Two candidates made contact. Object passed between rows confirmed by motion vectors.',
    },
    {
      id: 'evt_005',
      sessionId: 'sess_001',
      timestampStart: 55,
      timestampEnd: 60,
      type: 'phone_use',
      confidence: 0.74,
      objectsDetected: ['mobile_phone'],
      roi: { x: 300, y: 180, w: 45, h: 35 },
      reviewStatus: 'pending',
      explanation: 'Brief rectangular object visible below desk surface.',
    },
    {
      id: 'evt_006',
      sessionId: 'sess_001',
      timestampStart: 65,
      timestampEnd: 70,
      type: 'hand_movement',
      confidence: 0.55,
      objectsDetected: [],
      roi: { x: 90, y: 70, w: 55, h: 65 },
      reviewStatus: 'dismissed',
      explanation: 'Sudden motion in bottom-left region. May be invigilator movement. Low confidence.',
    },
    {
      id: 'evt_007',
      sessionId: 'sess_001',
      timestampStart: 72,
      timestampEnd: 78,
      type: 'object_exchange',
      confidence: 0.93,
      objectsDetected: ['paper_chit', 'pen'],
      roi: { x: 160, y: 90, w: 65, h: 75 },
      reviewStatus: 'pending',
      explanation: 'High-confidence exchange event: multiple small objects transitioned between two seats.',
    },
    {
      id: 'evt_008',
      sessionId: 'sess_001',
      timestampStart: 80,
      timestampEnd: 85,
      type: 'gaze_shift',
      confidence: 0.61,
      objectsDetected: [],
      roi: { x: 100, y: 50, w: 75, h: 55 },
      reviewStatus: 'pending',
      explanation: 'Candidate looked toward invigilator desk area repeatedly.',
    },
  ],
  sess_002: [
    {
      id: 'evt_101',
      sessionId: 'sess_002',
      timestampStart: 10,
      timestampEnd: 25,
      type: 'phone_use',
      confidence: 0.95,
      objectsDetected: ['mobile_phone'],
      roi: { x: 220, y: 160, w: 50, h: 40 },
      reviewStatus: 'escalated',
      explanation: 'Phone screen clearly visible. Candidate appeared to photograph answer sheet.',
    },
  ],

  // ── Real events from YOLO11s backend session ──────────────────────
  // Source: backend/data/results/9963d75e-002b-4161-a127-e22017282342.json
  // Video resolution: 848 × 478 px | 30 fps | 7.87 s | 63 total detections
  // Detections are grouped into 6 clusters by timestamp proximity.
  // roi values are raw pixel coordinates from YOLO bbox output.
  // VideoPlayer normalises them using (x / 640) * 100 — but since the
  // source video is 848×478 we store the raw px values here and let the
  // overlay formula handle proportional placement.
  sess_backend_001: [
    {
      // Cluster 1: frames 82–95 (t=2.73–3.17 s) — phone first appears
      id: 'bk_evt_001',
      sessionId: 'sess_backend_001',
      timestampStart: 2.733,
      timestampEnd: 3.167,
      type: 'phone_use',
      confidence: 0.46,           // avg confidence of cluster
      objectsDetected: ['mobile_phone'],
      // Representative bbox: frame 87 (highest confidence 0.62 in cluster)
      // x1=319, y1=245, x2=354, y2=289 → x=319, y=245, w=35, h=44
      roi: { x: 319, y: 245, w: 35, h: 44 },
      reviewStatus: 'pending',
      explanation: 'Cell phone detected in mid-frame region. YOLO11s flagged across 13 consecutive frames at 2.7–3.2 s. Candidate appears to be holding a mobile device below desk level.',
    },
    {
      // Cluster 2: frames 105–108 (t=3.50–3.60 s) — brief re-appearance
      id: 'bk_evt_002',
      sessionId: 'sess_backend_001',
      timestampStart: 3.5,
      timestampEnd: 3.6,
      type: 'phone_use',
      confidence: 0.46,
      objectsDetected: ['mobile_phone'],
      // bbox: frame 106 (highest conf 0.54) → x1=297, y1=263, x2=351, y2=316
      roi: { x: 297, y: 263, w: 54, h: 53 },
      reviewStatus: 'pending',
      explanation: 'Mobile phone briefly re-detected at 3.5 s. Object repositioned slightly downward from initial detection area. 4 frames of activity.',
    },
    {
      // Cluster 3: frames 117–145 (t=3.90–4.83 s) — sustained phone use
      id: 'bk_evt_003',
      sessionId: 'sess_backend_001',
      timestampStart: 3.9,
      timestampEnd: 4.833,
      type: 'phone_use',
      confidence: 0.52,           // avg across 22 frames
      objectsDetected: ['mobile_phone'],
      // Frame 120 — highest conf (0.65): x1=283, y1=277, x2=345, y2=322
      roi: { x: 283, y: 277, w: 61, h: 45 },
      reviewStatus: 'escalated',
      explanation: 'Sustained phone detection across 22 frames (~0.93 s). Highest confidence 0.65 at 4.0 s. Device position consistent — candidate likely reading from screen. HIGH RISK.',
    },
    {
      // Cluster 4: frames 127–151 (t=4.23–5.03 s) — continued use / overlapping
      id: 'bk_evt_004',
      sessionId: 'sess_backend_001',
      timestampStart: 4.233,
      timestampEnd: 5.033,
      type: 'phone_use',
      confidence: 0.53,
      objectsDetected: ['mobile_phone'],
      // Frame 136 — highest conf (0.67): x1=299, y1=267, x2=350, y2=316
      roi: { x: 299, y: 267, w: 51, h: 49 },
      reviewStatus: 'escalated',
      explanation: 'Overlapping detection cluster. Phone use persists with peak confidence 0.67 at 4.53 s. Candidate phone remains stationary — strong evidence of active usage. HIGH RISK.',
    },
    {
      // Cluster 5: frames 156–164 (t=5.20–5.47 s) — phone movement
      id: 'bk_evt_005',
      sessionId: 'sess_backend_001',
      timestampStart: 5.2,
      timestampEnd: 5.466,
      type: 'phone_use',
      confidence: 0.33,
      objectsDetected: ['mobile_phone'],
      // Frame 164 — highest conf (0.38): x1=313, y1=258, x2=361, y2=304
      roi: { x: 313, y: 258, w: 48, h: 46 },
      reviewStatus: 'pending',
      explanation: 'Phone shifts to upper-right region of earlier position. Detected over 6 frames at lower confidence — possible concealment motion.',
    },
    {
      // Cluster 6: frames 173–186 (t=5.77–6.20 s) — phone near end of video
      id: 'bk_evt_006',
      sessionId: 'sess_backend_001',
      timestampStart: 5.766,
      timestampEnd: 6.2,
      type: 'phone_use',
      confidence: 0.43,
      objectsDetected: ['mobile_phone'],
      // Frame 184 — highest conf (0.65): x1=346, y1=220, x2=394, y2=272
      roi: { x: 346, y: 220, w: 48, h: 52 },
      reviewStatus: 'pending',
      explanation: 'Final detection cluster — phone now visible in upper portion of frame. 10 frames detected at 5.77–6.20 s. Device may be raised from under-desk position.',
    },
  ],
};

export const PROCESSING_STAGES = [
  { key: 'extracting', label: 'Extracting frames', icon: 'Film' },
  { key: 'motion_estimation', label: 'Motion estimation', icon: 'Activity' },
  { key: 'segmenting', label: 'Segmenting events', icon: 'Scissors' },
  { key: 'generating', label: 'Generating report', icon: 'FileText' },
];
