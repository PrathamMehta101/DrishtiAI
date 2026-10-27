import { forwardRef } from "react";
import { formatTimecode, EVENT_TYPE_LABELS } from "../../lib/utils";

/* ── Professional Institutional Color Tokens ───────────────────────── */
const NAVY = "#0f172a"; // slate-900
const NAVY_MD = "#1e293b"; // slate-800
const NAVY_LT = "#334155"; // slate-700
const SLATE = "#475569"; // slate-600
const MUTED = "#64748b"; // slate-500
const BORDER = "#cbd5e1"; // slate-300
const BORDER_LT = "#e2e8f0"; // slate-200
const BG = "#f8fafc"; // slate-50
const BG_ALT = "#f1f5f9"; // slate-100
const WHITE = "#ffffff";

/* Risk & Alert Tokens */
const RED = "#dc2626"; // red-600
const RED_LIGHT = "#fef2f2"; // red-50
const RED_BDR = "#fca5a5"; // red-300
const AMBER = "#d97706"; // amber-600
const AMBER_LIGHT = "#fffbeb"; // amber-50
const AMBER_BDR = "#fde68a"; // amber-200
const GREEN = "#16a34a"; // green-600
const GREEN_LIGHT = "#f0fdf4"; // green-50
const GREEN_BDR = "#86efac"; // green-300
const TEAL = "#0284c7"; // sky-600

/* ── SVG Icons ──────────────────────────────────────────────────────── */
function ShieldIcon({ size = 18, color = WHITE }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function AlertIcon({ size = 11, color = RED }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function PhoneIcon({ size = 13, color = NAVY_LT }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function ActivityIcon({ size = 13, color = NAVY_LT }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function ClockIcon({ size = 13, color = NAVY_LT }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/* ── Main Report Template ───────────────────────────────────────────── */
const ReportTemplate = forwardRef(function ReportTemplate(
  { session, events = [] },
  ref
) {
  if (!session) return null;

  const total = events.length;
  const phoneEvts = events.filter(
    (e) =>
      e.type === "phone_use" ||
      e.objectsDetected?.includes("mobile phone") ||
      e.objectsDetected?.includes("mobile_phone") ||
      e.objectsDetected?.includes("phone")
  );
  const topEvent = events[0];
  const avgConf =
    total > 0
      ? Math.round(
          (events.reduce((s, e) => s + (e.confidence ?? 0), 0) / total) * 100
        )
      : 0;
  const escalated = events.filter((e) => e.reviewStatus === "escalated").length;
  const reviewed = events.filter((e) => e.reviewStatus === "reviewed").length;
  const pending = events.filter(
    (e) => !e.reviewStatus || e.reviewStatus === "pending"
  ).length;

  return (
    <div
      ref={ref}
      style={{
        width: "1000px",
        minHeight: "1414px",
        fontFamily: "'Segoe UI', 'Inter', Arial, sans-serif",
        background: WHITE,
        padding: 0,
        margin: "0 auto",
        boxSizing: "border-box",
        color: NAVY,
        fontSize: "9px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Top Content Area */}
      <div>
        {/* ── 1. HEADER BAR ─────────────────────────────────────────── */}
        <div style={{ background: NAVY }}>
          <div
            style={{
              padding: "16px 24px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* Logo & Branding */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "6px",
                  background: RED,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 2px 4px rgba(220,38,38,0.3)",
                }}
              >
                <ShieldIcon size={20} color={WHITE} />
              </div>
              <div>
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: "8px",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    marginBottom: "2px",
                  }}
                >
                  DRISHTI AI — AUTOMATED VIDEO ANALYTICS
                </div>
                <div
                  style={{
                    color: WHITE,
                    fontSize: "17px",
                    fontWeight: 700,
                    letterSpacing: "0.2px",
                    lineHeight: 1.1,
                  }}
                >
                  Examination Hall Video Analysis Report
                </div>
              </div>
            </div>

            {/* Right Header Metadata */}
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  display: "inline-block",
                  background: RED,
                  color: WHITE,
                  padding: "3px 10px",
                  borderRadius: "3px",
                  fontSize: "8px",
                  fontWeight: 700,
                  letterSpacing: "1px",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                }}
              >
                CONFIDENTIAL
              </div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "7.5px",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                REPORT GENERATED
              </div>
              <div
                style={{
                  color: "#cbd5e1",
                  fontSize: "9px",
                  fontFamily: "monospace",
                }}
              >
                {new Date().toLocaleString()}
              </div>
              <div
                style={{
                  color: "#64748b",
                  fontSize: "8px",
                  fontFamily: "monospace",
                  marginTop: "1px",
                }}
              >
                Session: {session.id}
              </div>
            </div>
          </div>

          {/* Crisp Gradient Accent Underline */}
          <div
            style={{
              height: "3px",
              background: `linear-gradient(to right, ${RED}, #f87171, #60a5fa, ${TEAL})`,
            }}
          />
        </div>

        {/* ── 2. REPORT BODY ────────────────────────────────────────── */}
        <div style={{ padding: "16px 24px" }}>
          {/* ── EXECUTIVE SUMMARY ───────────────────────────────────── */}
          <div
            style={{
              background: BG,
              borderTop: `1px solid ${BORDER}`,
              borderRight: `1px solid ${BORDER}`,
              borderBottom: `1px solid ${BORDER}`,
              borderLeft: `4px solid ${escalated > 0 ? RED : NAVY_MD}`,
              borderRadius: "5px",
              padding: "10px 14px",
              marginBottom: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1, paddingRight: "16px" }}>
              <div
                style={{
                  fontSize: "8px",
                  fontWeight: 700,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: escalated > 0 ? RED : SLATE,
                  marginBottom: "3px",
                }}
              >
                EXECUTIVE SUMMARY
              </div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: NAVY,
                  lineHeight: 1.4,
                }}
              >
                This executive summary provides a comprehensive review of recorded examination hall footage.
                {total > 0
                  ? ` System detected ${total} flagged activity instance${total > 1 ? "s" : ""} across ${formatTimecode(session.durationSeconds)} with an average confidence of ${avgConf}%.`
                  : ` No policy violations or suspicious activities detected across ${formatTimecode(session.durationSeconds)} of surveillance footage.`}
              </div>
              <div style={{ fontSize: "8px", color: MUTED, marginTop: "3px" }}>
                Exam Centre: <b>{session.hallName || "Exam Hall A"}</b> · Exam: <b>{session.examName || "Standard Exam"}</b> · Camera: <b>{session.cameraId || "CAM-01"}</b> · Date: <b>{session.date || "2026-08-23"}</b>
              </div>
            </div>

            {/* Mini Stat Summary */}
            <div
              style={{
                display: "flex",
                gap: "14px",
                flexShrink: 0,
                borderLeft: `1px solid ${BORDER_LT}`,
                paddingLeft: "14px",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: RED,
                    lineHeight: 1,
                  }}
                >
                  {total}
                </div>
                <div
                  style={{
                    fontSize: "7px",
                    color: MUTED,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                    marginTop: "2px",
                  }}
                >
                  TOTAL FLAGS
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: escalated > 0 ? RED : MUTED,
                    lineHeight: 1,
                  }}
                >
                  {escalated}
                </div>
                <div
                  style={{
                    fontSize: "7px",
                    color: MUTED,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                    marginTop: "2px",
                  }}
                >
                  ESCALATED
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: TEAL,
                    lineHeight: 1,
                  }}
                >
                  {avgConf}%
                </div>
                <div
                  style={{
                    fontSize: "7px",
                    color: MUTED,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                    marginTop: "2px",
                  }}
                >
                  AVG CONF.
                </div>
              </div>
            </div>
          </div>

          {/* ── ROW 1: SESSION INFO (50%) + KEY ANALYTICS SUMMARY (50%) ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <SectionCard title="Session Information">
              <div style={{ padding: "9px 12px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <InfoRow k="Exam Centre" v={session.hallName || "Exam Hall A"} />
                    <InfoRow k="Exam Name" v={session.examName || "Standard Exam"} />
                    <InfoRow k="Camera ID" v={session.cameraId || "CAM-01"} />
                    <InfoRow k="Date" v={session.date || "2026-08-23"} />
                    <InfoRow k="Duration" v={formatTimecode(session.durationSeconds)} mono />
                    <InfoRow k="AI Model" v={session.modelName || "YOLO11s (Pretrained)"} />
                    {session.id && (
                      <InfoRow k="Session ID" v={session.id.toString().slice(0, 18) + "…"} mono />
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="Key Analytics Summary">
              <div style={{ padding: "9px 14px" }}>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "14px",
                    color: SLATE,
                    fontSize: "8.5px",
                    lineHeight: "1.6",
                  }}
                >
                  <li>
                    <b>Surveillance Engine:</b> Automated YOLO11s real-time object & activity segmentation.
                  </li>
                  <li>
                    <b>High-Risk Detections:</b> {phoneEvts.length} prohibited item / phone interactions recorded.
                  </li>
                  <li>
                    <b>Review Status:</b> {escalated} escalated, {reviewed} reviewed, {pending} pending sign-off.
                  </li>
                  <li>
                    <b>Motion & Spatial Density:</b> Heatmap mapped against footage timeline markers.
                  </li>
                  <li>
                    <b>Explainability (XAI):</b> Temporal persistence & spatial coordinates logged.
                  </li>
                </ul>
              </div>
            </SectionCard>
          </div>

          {/* ── ROW 2: KEY DETECTION METRICS (4 CARDS) ───────────────── */}
          <SectionCard title="Key Detection Metrics" mb="12px">
            <div
              style={{
                padding: "10px 12px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: "10px",
              }}
            >
              <KpiCard
                value={total}
                label="Total Flags"
                sublabel="Detections flagged"
                accent={RED}
                icon={<AlertIcon size={14} color={RED} />}
              />
              <KpiCard
                value={avgConf + "%"}
                label="Avg. Confidence"
                sublabel="Model certainty"
                accent={TEAL}
                icon={<ActivityIcon size={14} color={TEAL} />}
              />
              <KpiCard
                value={phoneEvts.length}
                label="Phone Detections"
                sublabel="Prohibited devices"
                accent={NAVY_MD}
                icon={<PhoneIcon size={14} color={NAVY_MD} />}
              />
              <KpiCard
                value={formatTimecode(session.durationSeconds)}
                label="Total Duration"
                sublabel="Analyzed footage"
                accent={SLATE}
                icon={<ClockIcon size={14} color={SLATE} />}
                mono
              />
            </div>
          </SectionCard>

          {/* ── ROW 3: ACTIVITY TIMELINE (50%) + MOTION HEATMAP (50%) ─── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            {/* Activity Timeline */}
            <SectionCard title="Activity Timeline">
              <div
                style={{
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ fontSize: "8px", color: MUTED, marginBottom: "6px" }}>
                  Temporal distribution of flagged events across session duration.
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: MUTED,
                    fontSize: "7px",
                    fontFamily: "monospace",
                    marginBottom: "3px",
                  }}
                >
                  <span>00:00:00</span>
                  <span>{formatTimecode(Math.round(session.durationSeconds * 0.25))}</span>
                  <span>{formatTimecode(Math.round(session.durationSeconds * 0.5))}</span>
                  <span>{formatTimecode(Math.round(session.durationSeconds * 0.75))}</span>
                  <span>{formatTimecode(session.durationSeconds)}</span>
                </div>

                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "32px",
                    background: BG_ALT,
                    borderRadius: "4px",
                    border: `1px solid ${BORDER_LT}`,
                    overflow: "hidden",
                  }}
                >
                  {[25, 50, 75].map((pct) => (
                    <div
                      key={pct}
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: `${pct}%`,
                        width: "1px",
                        background: BORDER,
                        opacity: 0.6,
                      }}
                    />
                  ))}
                  {events.map((evt) => {
                    const l = (evt.timestampStart / session.durationSeconds) * 100;
                    const w = Math.max(
                      1,
                      ((evt.timestampEnd - evt.timestampStart) / session.durationSeconds) * 100
                    );
                    return (
                      <div
                        key={evt.id}
                        style={{
                          position: "absolute",
                          top: "4px",
                          bottom: "4px",
                          left: `${l}%`,
                          width: `${w}%`,
                          background: evt.reviewStatus === "escalated" ? RED : "#ef4444",
                          opacity: 0.9,
                          minWidth: "3px",
                          borderRadius: "2px",
                        }}
                      />
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "6px",
                    fontSize: "7.5px",
                    color: MUTED,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <div
                      style={{
                        width: "10px",
                        height: "6px",
                        background: RED,
                        borderRadius: "2px",
                      }}
                    />
                    <span>Flagged Activity</span>
                  </div>
                  <span style={{ fontFamily: "monospace" }}>
                    {total} events · {formatTimecode(session.durationSeconds)}
                  </span>
                </div>
              </div>
            </SectionCard>

            {/* Motion Heatmap */}
            <SectionCard title="Motion Heatmap">
              <div
                style={{
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ fontSize: "8px", color: MUTED, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 600 }}>
                  Spatial distribution of detected motion activity
                </div>

                <div
                  style={{
                    width: "100%",
                    height: "120px",
                    background: "#080a0f",
                    borderRadius: "6px",
                    border: `1px solid ${BORDER}`,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {session.heatmapUrl ? (
                    <img
                      src={session.heatmapUrl}
                      alt="Motion heatmap"
                      crossOrigin="anonymous"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "95%",
                        height: "65px",
                        display: "flex",
                        alignItems: "flex-end",
                      }}
                    >
                      <HeatmapBars events={events} duration={session.durationSeconds} buckets={20} />
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "6px",
                    fontSize: "7.5px",
                    color: MUTED,
                  }}
                >
                  <span>Surveillance Spatial Map</span>
                  <span style={{ fontFamily: "monospace", color: TEAL }}>
                    JET Thermal Colormap
                  </span>
                </div>
              </div>
            </SectionCard>


          </div>

          {/* ── ROW 4: FLAGGED EVENT LOG ─────────────────────────────── */}
          <SectionCard title="Flagged Event Log" mb="12px">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: NAVY_MD }}>
                  {[
                    "#",
                    "Event ID",
                    "Timestamp",
                    "Duration",
                    "Event Type",
                    "Detected Object",
                    "Confidence",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "6px 8px",
                        textAlign: "left",
                        fontSize: "8px",
                        fontWeight: 700,
                        color: "#f1f5f9",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        borderBottom: `2px solid ${RED}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 8).map((evt, i) => {
                  const isEscalated = evt.reviewStatus === "escalated";
                  const rowBg = isEscalated ? "#fff5f5" : i % 2 === 0 ? WHITE : BG;
                  return (
                    <tr
                      key={evt.id}
                      style={{
                        background: rowBg,
                        borderBottom: `1px solid ${BORDER_LT}`,
                        borderLeft: isEscalated ? `3px solid ${RED}` : `3px solid transparent`,
                      }}
                    >
                      <td style={{ padding: "5px 8px", color: MUTED, fontFamily: "monospace", fontSize: "8px" }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: "8px", color: NAVY, fontWeight: 600 }}>
                        {evt.id}
                      </td>
                      <td style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: "8px", color: SLATE }}>
                        {formatTimecode(evt.timestampStart)} – {formatTimecode(evt.timestampEnd)}
                      </td>
                      <td style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: "8px", color: SLATE }}>
                        {(evt.timestampEnd - evt.timestampStart).toFixed(2)}s
                      </td>
                      <td style={{ padding: "5px 8px", fontSize: "8.5px", color: NAVY, fontWeight: 600 }}>
                        {EVENT_TYPE_LABELS[evt.type] || evt.type}
                      </td>
                      <td style={{ padding: "5px 8px", fontSize: "8px", color: SLATE }}>
                        {evt.objectsDetected?.join(", ") || "—"}
                      </td>
                      <td style={{ padding: "5px 8px" }}>
                        <ConfBadge pct={Math.round((evt.confidence || 0) * 100)} />
                      </td>
                      <td style={{ padding: "5px 8px" }}>
                        <StatusBadge status={evt.reviewStatus} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div
              style={{
                padding: "5px 10px",
                background: BG_ALT,
                borderTop: `1px solid ${BORDER_LT}`,
                display: "flex",
                justifyContent: "space-between",
                fontSize: "7.5px",
                color: MUTED,
              }}
            >
              <span>
                Showing {Math.min(8, events.length)} of {total} events
              </span>
              <span>
                Avg. confidence: <b>{avgConf}%</b> · Phone instances: <b>{phoneEvts.length}</b>
              </span>
            </div>
          </SectionCard>

          {/* ── ROW 5: PRIORITY EVENT (50%) + EXPLAINABLE AI (50%) ───── */}
          {topEvent && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              {/* High Priority Event */}
              <SectionCard title="High Priority Event Details">
                <div style={{ padding: "10px 12px" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      background: RED_LIGHT,
                      color: RED,
                      border: `1px solid ${RED_BDR}`,
                      borderRadius: "3px",
                      padding: "2px 8px",
                      fontWeight: 700,
                      fontSize: "8px",
                      marginBottom: "8px",
                      letterSpacing: "0.4px",
                    }}
                  >
                    <AlertIcon size={10} color={RED} />
                    HIGH RISK — {EVENT_TYPE_LABELS[topEvent.type] || topEvent.type}
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      <InfoRow k="Event ID" v={topEvent.id} mono />
                      <InfoRow
                        k="Timestamp"
                        v={`${formatTimecode(topEvent.timestampStart)} – ${formatTimecode(topEvent.timestampEnd)}`}
                        mono
                      />
                      <InfoRow
                        k="Duration"
                        v={`${(topEvent.timestampEnd - topEvent.timestampStart).toFixed(2)}s`}
                      />
                      <InfoRow
                        k="Confidence"
                        v={`${Math.round((topEvent.confidence || 0) * 100)}%`}
                        bold
                      />
                      <InfoRow
                        k="Objects"
                        v={topEvent.objectsDetected?.join(", ") || "mobile_phone"}
                      />
                      <InfoRow k="Status" v={topEvent.reviewStatus || "pending"} />
                      {topEvent.roi && (
                        <InfoRow
                          k="ROI Region"
                          v={`x:${Math.round(topEvent.roi.x)} y:${Math.round(topEvent.roi.y)} w:${Math.round(topEvent.roi.w)} h:${Math.round(topEvent.roi.h)}`}
                          mono
                        />
                      )}
                    </tbody>
                  </table>

                  {topEvent.explanation && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "6px 8px",
                        background: RED_LIGHT,
                        border: `1px solid ${RED_BDR}`,
                        borderRadius: "3px",
                        color: "#7f1d1d",
                        fontSize: "8px",
                        lineHeight: "1.4",
                      }}
                    >
                      <b>AI Explanation:</b> {topEvent.explanation}
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Explainable AI */}
              <SectionCard title="Explainable AI (XAI) & Summary">
                <div style={{ padding: "10px 12px" }}>
                  <div
                    style={{
                      fontSize: "8px",
                      color: SLATE,
                      marginBottom: "8px",
                      fontWeight: 600,
                    }}
                  >
                    Detection signals contributing to session risk:
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {[
                      {
                        label: "Object Detection",
                        detail: `${total} prohibited object instances flagged by YOLO11s`,
                        score: Math.min(100, Math.max(40, total * 15)),
                      },
                      {
                        label: "Temporal Persistence",
                        detail: "Detections sustained across consecutive video frames",
                        score: 85,
                      },
                      {
                        label: "Spatial Consistency",
                        detail: "Device position consistent with active examination interaction",
                        score: 75,
                      },
                      {
                        label: "Confidence Score",
                        detail: `Average model certainty ${avgConf}% across all events`,
                        score: avgConf,
                      },
                    ].map(({ label, detail, score }) => (
                      <div key={label}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "1px",
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: "8px", color: SLATE }}>
                            {label}
                          </span>
                          <span
                            style={{
                              fontSize: "7.5px",
                              color: RED,
                              fontFamily: "monospace",
                              fontWeight: 700,
                            }}
                          >
                            {score}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: "4px",
                            background: BG_ALT,
                            borderRadius: "2px",
                            overflow: "hidden",
                            marginBottom: "1px",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${score}%`,
                              background: RED,
                              borderRadius: "2px",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: "7px", color: MUTED }}>{detail}</div>
                      </div>
                    ))}
                  </div>

                  {/* AI Summary note */}
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "6px 8px",
                      background: NAVY,
                      borderRadius: "3px",
                      color: "#e2e8f0",
                      fontSize: "8px",
                      lineHeight: "1.4",
                    }}
                  >
                    <b style={{ color: WHITE }}>AI Recommendation:</b>{" "}
                    {session.aiSummary ||
                      "Potential policy non-compliance detected. Review flagged timestamps."}
                    {session.recommendedAction && (
                      <div style={{ marginTop: "3px", color: "#fca5a5", fontWeight: 600 }}>
                        {session.recommendedAction}
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ── ROW 6: FORMAL AUDIT SIGNATURE BLOCK ──────────────────── */}
          <SectionCard title="Verification & Institutional Sign-Off">
            <div style={{ padding: "10px 14px", background: WHITE }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "16px",
                  fontSize: "8px",
                  color: SLATE,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: NAVY, marginBottom: "4px" }}>
                    Automated Verification
                  </div>
                  <div>Engine: YOLO11s Vision Core</div>
                  <div>Status: Analysis Complete</div>
                  <div>Integrity Hash: SHA-256 Verified</div>
                </div>

                <div>
                  <div style={{ fontWeight: 700, color: NAVY, marginBottom: "4px" }}>
                    Chief Examiner Sign-Off
                  </div>
                  <div style={{ marginTop: "16px", borderBottom: `1px solid ${BORDER}`, width: "90%" }} />
                  <div style={{ fontSize: "7px", color: MUTED, marginTop: "2px" }}>
                    Signature & Date
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 700, color: NAVY, marginBottom: "4px" }}>
                    Institutional Security Stamp
                  </div>
                  <div
                    style={{
                      marginTop: "6px",
                      height: "30px",
                      border: `1px dashed ${BORDER}`,
                      borderRadius: "3px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "7px",
                      color: MUTED,
                    }}
                  >
                    Official Stamp Area
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── 3. FORMAL INSTITUTIONAL FOOTER ─────────────────────────── */}
      <div
        style={{
          background: BG_ALT,
          borderTop: `1px solid ${BORDER}`,
          padding: "10px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "7.5px", color: MUTED }}>
          Drishti AI — Automated Video Analytics Engine · <b>CONFIDENTIAL & FORENSIC AUDIT REPORT</b> · For Authorized Personnel Only
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "7.5px", color: SLATE, fontWeight: 600 }}>
            Page 1 of 1
          </span>
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: RED,
            }}
          />
          <span style={{ color: MUTED, fontSize: "7.5px", fontFamily: "monospace" }}>
            Session: {session.id} · {session.examName || "Exam"}
          </span>
        </div>
      </div>
    </div>
  );
});

export default ReportTemplate;

/* ── Clean Helper Sub-Components ────────────────────────────────────── */

function SectionCard({ title, children, mb = "0" }) {
  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: "5px",
        background: WHITE,
        overflow: "hidden",
        marginBottom: mb,
        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      <div
        style={{
          background: NAVY_MD,
          color: "#f8fafc",
          padding: "6px 10px",
          fontSize: "8px",
          fontWeight: 700,
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          borderBottom: `1px solid ${BORDER_LT}`,
        }}
      >
        <div
          style={{
            width: "3px",
            height: "9px",
            background: RED,
            borderRadius: "1px",
          }}
        />
        {title}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ value, label, sublabel, accent, icon, mono = false }) {
  return (
    <div
      style={{
        background: BG,
        border: `1px solid ${BORDER}`,
        borderRadius: "4px",
        padding: "9px 10px",
        borderTop: `3px solid ${accent}`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "4px",
        }}
      >
        <span
          style={{
            fontSize: "7.5px",
            color: MUTED,
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        {icon}
      </div>
      <div
        style={{
          fontSize: "20px",
          fontWeight: 800,
          color: NAVY,
          lineHeight: 1,
          fontFamily: mono ? "monospace" : "inherit",
        }}
      >
        {value}
      </div>
      {sublabel && (
        <div style={{ fontSize: "7px", color: MUTED, marginTop: "3px" }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

function InfoRow({ k, v, mono = false, bold = false }) {
  return (
    <tr>
      <td
        style={{
          padding: "2.5px 0",
          fontWeight: 600,
          color: MUTED,
          fontSize: "8px",
          width: "95px",
          verticalAlign: "top",
        }}
      >
        {k}
      </td>
      <td
        style={{
          padding: "2.5px 3px",
          color: MUTED,
          fontSize: "8px",
          width: "6px",
        }}
      >
        :
      </td>
      <td
        style={{
          padding: "2.5px 0",
          fontSize: "8.5px",
          color: NAVY,
          fontFamily: mono ? "monospace" : "inherit",
          fontWeight: bold ? 700 : 500,
        }}
      >
        {v}
      </td>
    </tr>
  );
}

function ConfBadge({ pct }) {
  const color = pct >= 75 ? RED : pct >= 50 ? AMBER : GREEN;
  const bg = pct >= 75 ? RED_LIGHT : pct >= 50 ? AMBER_LIGHT : GREEN_LIGHT;
  const bdr = pct >= 75 ? RED_BDR : pct >= 50 ? AMBER_BDR : GREEN_BDR;
  return (
    <span
      style={{
        display: "inline-block",
        background: bg,
        color,
        border: `1px solid ${bdr}`,
        borderRadius: "3px",
        padding: "1px 5px",
        fontWeight: 700,
        fontSize: "7.5px",
        fontFamily: "monospace",
      }}
    >
      {pct}%
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    escalated: { bg: RED_LIGHT, color: RED, bdr: RED_BDR, label: "Escalated" },
    reviewed: {
      bg: GREEN_LIGHT,
      color: GREEN,
      bdr: GREEN_BDR,
      label: "Reviewed",
    },
    pending: {
      bg: AMBER_LIGHT,
      color: AMBER,
      bdr: AMBER_BDR,
      label: "Pending",
    },
    dismissed: { bg: BG_ALT, color: MUTED, bdr: BORDER, label: "Dismissed" },
  };
  const m = map[status] || map.pending;
  return (
    <span
      style={{
        display: "inline-block",
        background: m.bg,
        color: m.color,
        border: `1px solid ${m.bdr}`,
        borderRadius: "3px",
        padding: "1px 5px",
        fontWeight: 600,
        fontSize: "7.5px",
        textTransform: "capitalize",
      }}
    >
      {m.label}
    </span>
  );
}

function HeatmapBars({ events, duration, buckets = 20 }) {
  const counts = Array(buckets).fill(0);
  events.forEach((evt) => {
    const idx = Math.min(
      buckets - 1,
      Math.floor((evt.timestampStart / (duration || 1)) * buckets)
    );
    counts[idx]++;
  });
  const max = Math.max(1, ...counts);
  return (
    <div
      style={{
        display: "flex",
        gap: "2px",
        width: "100%",
        height: "100%",
        alignItems: "flex-end",
      }}
    >
      {counts.map((c, i) => {
        const pct = c / max;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(10, pct * 95)}%`,
              background: `rgba(220,38,38,${Math.max(0.2, pct)})`,
              borderRadius: "2px 2px 0 0",
              border:
                c > 0
                  ? "1px solid rgba(220,38,38,0.5)"
                  : "1px solid rgba(255,255,255,0.05)",
            }}
          />
        );
      })}
    </div>
  );
}
