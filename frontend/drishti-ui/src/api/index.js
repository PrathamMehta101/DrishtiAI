// ── API Layer ────────────────────────────────────────────────────────────
// Live sessions go to the FastAPI backend at localhost:8000.
// Demo sessions (sess_001, sess_002 …) still use mockData for the prototype.

import { MOCK_SESSIONS, MOCK_EVENTS } from '../lib/mockData';

const BACKEND = 'http://localhost:8000';
const delay = (ms = 400) => new Promise(r => setTimeout(r, ms));

// ── Live session storage (localStorage, persists across refreshes) ────────

const LS_KEY = 'drishti_live_sessions';

function getLiveSessions() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}

function saveLiveSession(session) {
  const all = getLiveSessions().filter(s => s.id !== session.id);
  localStorage.setItem(LS_KEY, JSON.stringify([session, ...all]));
}

function getLiveSessionData(id) {
  try {
    const raw = sessionStorage.getItem(`drishti_session_${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function storeLiveSessionData(id, data) {
  try {
    sessionStorage.setItem(`drishti_session_${id}`, JSON.stringify(data));
    saveLiveSession(data.session);
  } catch { /* quota exceeded — silently ignore */ }
}

// ── Upload & Analyze (real backend) ──────────────────────────────────────

/**
 * Uploads a video file and session metadata to the backend.
 * Uses Celery async task queue with real-time status polling.
 * Calls onProgress(0-100) during upload and worker analysis stages.
 * Returns { session, events, motion } on success.
 */
export function uploadAndAnalyze(file, metadata, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('video',     file);
    fd.append('hall_name', metadata.hallName  || '');
    fd.append('exam_name', metadata.examName  || '');
    fd.append('date',      metadata.date      || '');
    fd.append('camera_id', metadata.cameraId  || 'CAM-01');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BACKEND}/api/analyze`);

    // Upload progress (0-10%)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 10);
        onProgress?.(pct);
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        let res;
        try {
          res = JSON.parse(xhr.responseText);
        } catch {
          reject(new Error('Invalid JSON response from backend'));
          return;
        }

        // If backend returned a Celery task_id, poll for background worker progress
        if (res.task_id) {
          onProgress?.(12, 'Queued in background worker...');
          const taskId = res.task_id;
          const videoId = res.video_id;

          localStorage.setItem('drishti_active_task', JSON.stringify({
            taskId,
            videoId,
            examName: metadata.examName || 'Exam Video',
            progress: 12,
            stage: 'Queued in background worker...'
          }));

          const pollInterval = 1000; // poll every 1s
          const maxAttempts = 600;   // 10 minutes max
          let attempts = 0;

          const poll = setInterval(async () => {
            attempts++;
            if (attempts > maxAttempts) {
              clearInterval(poll);
              localStorage.removeItem('drishti_active_task');
              reject(new Error('Task processing timed out'));
              return;
            }

            try {
              const pollRes = await fetch(`${BACKEND}/api/task/${taskId}`);
              if (!pollRes.ok) {
                return; // Retry on transient network blip
              }
              const task = await pollRes.json();

              if (task.state === 'PROCESSING' || task.state === 'STARTED') {
                if (task.progress !== undefined) {
                  onProgress?.(task.progress, task.stage || 'Processing video...');
                  localStorage.setItem('drishti_active_task', JSON.stringify({
                    taskId,
                    videoId,
                    examName: metadata.examName || 'Exam Video',
                    progress: task.progress,
                    stage: task.stage
                  }));
                }
              } else if (task.state === 'SUCCESS') {
                clearInterval(poll);
                onProgress?.(100, 'Analysis Completed');
                resolve(task);
              } else if (task.state === 'FAILURE') {
                clearInterval(poll);
                localStorage.removeItem('drishti_active_task');
                reject(new Error(task.error || 'Video analysis task failed on worker node'));
              }
            } catch (pollErr) {
              // Ignore temporary poll error and continue polling
            }
          }, pollInterval);
        }
 else {
          // Direct synchronous response fallback
          onProgress?.(100);
          resolve(res);
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || `Backend error ${xhr.status}`));
        } catch {
          reject(new Error(`Backend error ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error — is the backend running?'));
    xhr.ontimeout = () => reject(new Error('Upload request timed out'));
    xhr.timeout = 10 * 60 * 1000;

    xhr.send(fd);
  });
}


// ── Sessions ──────────────────────────────────────────────────────────────

export async function getSessions() {
  await delay(200);
  const live = getLiveSessions();
  // Merge: live sessions first, then demo sessions that aren't shadowed
  const liveIds = new Set(live.map(s => s.id));
  const demos = MOCK_SESSIONS.filter(s => !liveIds.has(s.id));
  return [...live, ...demos];
}

export async function getSession(id) {
  await delay(150);

  // 1. Check in-memory sessionStorage (just uploaded)
  const live = getLiveSessionData(id);
  if (live?.session) return live.session;

  // 2. Check localStorage list (persisted across refreshes)
  const fromLS = getLiveSessions().find(s => s.id === id);
  if (fromLS) {
    // Fetch fresh from backend
    try {
      const res = await fetch(`${BACKEND}/api/session/${id}`);
      if (res.ok) {
        const data = await res.json();
        return data.session;
      }
    } catch { /* backend offline — fall through */ }
    return fromLS;
  }

  // 3. Fall back to mock
  const mock = MOCK_SESSIONS.find(s => s.id === id);
  if (mock) return mock;

  throw new Error(`Session ${id} not found`);
}

export async function createSession(payload) {
  await delay(400);
  return { id: `sess_${Date.now()}`, ...payload, status: 'queued' };
}

// ── Events ────────────────────────────────────────────────────────────────

export async function getEvents(sessionId) {
  await delay(150);

  // 1. sessionStorage (just uploaded)
  const live = getLiveSessionData(sessionId);
  if (live?.events) return live.events;

  // 2. Backend (persisted live session)
  const fromLS = getLiveSessions().find(s => s.id === sessionId);
  if (fromLS) {
    try {
      const res = await fetch(`${BACKEND}/api/session/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        return data.events ?? [];
      }
    } catch { /* backend offline */ }
  }

  // 3. Mock fallback
  return MOCK_EVENTS[sessionId] ?? [];
}

// ── Motion Data ───────────────────────────────────────────────────────────

export async function getMotion(sessionId) {
  await delay(150);

  // 1. sessionStorage (just uploaded)
  const live = getLiveSessionData(sessionId);
  if (live?.motion) return live.motion;

  // 2. Backend (persisted live session)
  const fromLS = getLiveSessions().find(s => s.id === sessionId);
  if (fromLS) {
    try {
      const res = await fetch(`${BACKEND}/api/motion/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch { /* backend offline */ }

    try {
      const res = await fetch(`${BACKEND}/api/session/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        return data.motion ?? null;
      }
    } catch { /* backend offline */ }
  }

  return null;
}

export async function updateEventStatus(eventId, sessionId, { reviewStatus, note }) {
  await delay(150);
  return { eventId, reviewStatus, note, updatedAt: new Date().toISOString() };
}

// ── Export ────────────────────────────────────────────────────────────────

export async function triggerExport(sessionId, format = 'csv') {
  await delay(500);
  return { url: `/mock/export-${sessionId}.${format}`, format };
}
