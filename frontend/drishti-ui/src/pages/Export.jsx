import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  Smartphone,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Timer,
  Loader2,
  Shield,
} from "lucide-react";
import { getSession, getEvents } from "../api/index";
import {
  EVENT_TYPE_LABELS,
  REVIEW_STATUS_META,
  formatTimecode,
} from "../lib/utils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ReportTemplate from "../components/report/ReportTemplate";
import useAppStore from "../store/useAppStore";

/* ── Stat card for the summary row ──────────────────────────────────── */
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "text-[#26323D]",
  urgent = false,
}) {
  return (
    <div
      className={`panel px-4 py-3.5 flex flex-col justify-between shadow-xs ${
        urgent ? "border-l-3 border-l-rose-500 bg-rose-50/40" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-[#6B7785] font-semibold uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <Icon
            size={13}
            className={urgent ? "text-rose-600" : "text-[#A9B7C5]"}
          />
        )}
      </div>
      <div>
        <p
          className={`text-2xl font-bold font-mono tracking-tight ${
            urgent ? "text-rose-700" : accent
          }`}
        >
          {value}
        </p>
        {sub && <p className="text-[10px] text-[#6B7785] font-mono mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Progress bar row ────────────────────────────────────────────────── */
function BreakdownRow({ label, count, total, barColor, badge }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-4 px-4 py-2.5">
      <div className="flex-1 min-w-0">
        {badge ? (
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${badge}`}
          >
            {label}
          </span>
        ) : (
          <span className="text-xs text-[#26323D] font-medium">{label}</span>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-28 h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-mono text-[#26323D] font-semibold w-6 text-right">
          {count}
        </span>
        <span className="text-[10px] font-mono text-[#6B7785] w-8 text-right">
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}

/* ── Toast notification ──────────────────────────────────────────────── */
function Toast({ message, type = "success", onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg shadow-lg text-xs font-medium ${
        type === "success"
          ? "bg-white border border-[#D9E0E6] text-[#26323D]"
          : "bg-rose-50 border border-rose-200 text-rose-700"
      }`}
    >
      {type === "success" ? (
        <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
      ) : (
        <AlertCircle size={14} className="text-rose-600 flex-shrink-0" />
      )}
      <span>{message}</span>
    </motion.div>
  );
}

/* ── Main Export page ────────────────────────────────────────────────── */
export default function Export() {
  const { id } = useParams();
  const { eventOverrides } = useAppStore();
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [exporting, setExporting] = useState(null); // 'pdf' | 'csv' | null
  const [toast, setToast] = useState(null);
  const [heatmapDataUrl, setHeatmapDataUrl] = useState(null);
  const reportRef = useRef(null);

  useEffect(() => {
    Promise.all([getSession(id), getEvents(id)]).then(([s, e]) => {
      setSession(s);
      setEvents(e);

      // Pre-fetch heatmap as base64 data URL for instant canvas rasterization in PDF
      fetch(`http://localhost:8000/api/heatmap/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Heatmap not found');
          return res.blob();
        })
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setHeatmapDataUrl(reader.result);
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {
          // ignore if unavailable
        });
    });
  }, [id]);

  /* Apply local review-status overrides */
  const resolvedEvents = events.map((e) => ({
    ...e,
    reviewStatus: eventOverrides[e.id]?.reviewStatus ?? e.reviewStatus,
  }));

  /* Derived stats */
  const byStatus = resolvedEvents.reduce((acc, e) => {
    acc[e.reviewStatus] = (acc[e.reviewStatus] ?? 0) + 1;
    return acc;
  }, {});

  const byType = resolvedEvents.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});

  const avgConf =
    resolvedEvents.length > 0
      ? Math.round(
          (resolvedEvents.reduce((s, e) => s + (e.confidence ?? 0), 0) /
            resolvedEvents.length) *
            100
        )
      : 0;

  const phoneEvts = resolvedEvents.filter(
    (e) =>
      e.type === "phone_use" ||
      e.objectsDetected?.includes("mobile phone") ||
      e.objectsDetected?.includes("mobile_phone") ||
      e.objectsDetected?.includes("phone")
  );
  const escalated = byStatus.escalated ?? 0;

  /* ── Export handlers ─────────────────────────────────────────────── */
  const handleExport = async (format) => {
    setExporting(format);
    await new Promise((r) => setTimeout(r, 120));

    try {
      if (format === "csv") {
        const headers = [
          "Event ID,Timestamp Start,Timestamp End,Risk Level,Event Type,Confidence,Review Status",
        ];
        const rows = resolvedEvents.map((evt) => {
          const risk = evt.reviewStatus === "escalated" ? "High" : "Medium";
          return `${evt.id},${evt.timestampStart},${evt.timestampEnd},${risk},${evt.type},${evt.confidence},${evt.reviewStatus || "pending"}`;
        });
        const csvContent =
          "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `drishti_report_${id}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setToast({ message: "CSV exported successfully", type: "success" });
      } else if (format === "pdf") {
        if (reportRef.current) {
          const canvas = await html2canvas(reportRef.current, {
            scale: 2.0,
            useCORS: true,
            logging: false,
          });
          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          const pdf = new jsPDF("p", "mm", "a4");
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const imgRatio = canvas.width / canvas.height;

          let renderWidth = pageWidth;
          let renderHeight = pageWidth / imgRatio;
          let offsetX = 0;
          let offsetY = 0;

          if (renderHeight > pageHeight) {
            renderHeight = pageHeight;
            renderWidth = pageHeight * imgRatio;
            offsetX = (pageWidth - renderWidth) / 2;
          }

          pdf.addImage(
            imgData,
            "JPEG",
            offsetX,
            offsetY,
            renderWidth,
            renderHeight,
            undefined,
            "FAST"
          );
          pdf.save(`drishti_report_${id}.pdf`);
          setToast({
            message: "PDF report exported successfully",
            type: "success",
          });
        }
      }
    } catch (e) {
      console.error(e);
      setToast({
        message: "Export failed — check console for details",
        type: "error",
      });
    } finally {
      setExporting(null);
    }
  };

  if (!session)
    return (
      <div className="flex items-center justify-center h-full bg-[#FAFAFA]">
        <div className="text-xs font-mono text-[#52677D] animate-pulse">
          Loading report telemetry…
        </div>
      </div>
    );

  return (
    <>
      <div className="p-5 max-w-5xl mx-auto space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          {/* ── Page header ──────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to={`/session/${id}`}
                className="btn-ghost text-xs gap-1.5 py-1 px-2.5 text-[#52677D] hover:text-[#26323D]"
              >
                <ArrowLeft size={13} />
                <span>Back to Review</span>
              </Link>
              <div className="w-px h-3.5 bg-[#D9E0E6]" />
              <div>
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-[#26323D]" />
                  <h1 className="text-base font-bold tracking-tight text-[#26323D]">
                    Forensic Investigation Report
                  </h1>
                </div>
                <p className="text-xs text-[#6B7785] mt-0.5">
                  {session.hallName} · {session.examName} · <span className="font-mono">{session.date}</span>
                </p>
              </div>
            </div>

            {/* Export actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                id="export-csv"
                onClick={() => handleExport("csv")}
                disabled={!!exporting}
                className="btn-outline text-xs gap-1.5 py-1.5 px-3 font-semibold"
              >
                {exporting === "csv" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={13} />
                )}
                <span>{exporting === "csv" ? "Exporting…" : "Export CSV"}</span>
              </button>
              <button
                id="export-pdf"
                onClick={() => handleExport("pdf")}
                disabled={!!exporting}
                className="btn-primary text-xs gap-1.5 py-1.5 px-3 font-bold"
              >
                {exporting === "pdf" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <FileText size={13} />
                )}
                <span>{exporting === "pdf" ? "Generating PDF…" : "Export PDF"}</span>
              </button>
            </div>
          </div>

          {/* ── Session metadata strip ───────────────────────────────── */}
          <div className="panel px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border-l-3 border-l-[#26323D] bg-[#F8FAFC]">
            <MetaItem label="Camera ID" value={session.cameraId || "CAM-01"} mono />
            <MetaItem
              label="Duration"
              value={formatTimecode(session.durationSeconds)}
              mono
            />
            <MetaItem label="Inference Model" value={session.modelName || "YOLO11s"} mono />
            <MetaItem
              label="Session Identifier"
              value={session.id?.toString().slice(0, 12)}
              mono
            />
          </div>

          {/* ── KPI cards ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Total Events"
              value={resolvedEvents.length}
              icon={AlertTriangle}
              accent="text-[#26323D]"
            />
            <StatCard
              label="Escalated Events"
              value={escalated}
              sub={escalated > 0 ? "Requires review" : "None escalated"}
              icon={AlertCircle}
              accent="text-rose-700"
              urgent={escalated > 0}
            />
            <StatCard
              label="Phone Detections"
              value={phoneEvts.length}
              icon={Smartphone}
              accent="text-[#52677D]"
            />
            <StatCard
              label="Avg. Confidence"
              value={avgConf + "%"}
              icon={Activity}
              accent="text-[#26323D]"
            />
          </div>

          {/* ── Alert banner (escalated events) ──────────────────────── */}
          {escalated > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 px-4 py-2.5 rounded border border-rose-200 bg-rose-50"
            >
              <AlertTriangle
                size={14}
                className="text-rose-600 flex-shrink-0"
              />
              <span className="text-xs text-rose-700 font-bold">
                {escalated} escalated high-risk event{escalated !== 1 ? "s" : ""} recorded in this session.
              </span>
              <span className="text-xs text-rose-600/80 ml-auto font-mono hidden sm:inline font-semibold">
                Action required
              </span>
            </motion.div>
          )}

          {/* ── Two-column breakdown panels ──────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Event type breakdown */}
            <div className="panel overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#D9E0E6] flex items-center justify-between bg-[#F8FAFC]">
                <span className="text-[10px] font-bold text-[#52677D] uppercase tracking-widest">By Detection Category</span>
                <span className="text-[10px] text-[#6B7785] font-mono">
                  {Object.keys(byType).length} Type{Object.keys(byType).length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y divide-[#D9E0E6]/50">
                {Object.entries(byType).length === 0 && (
                  <p className="px-4 py-3 text-xs text-[#A9B7C5]">
                    No detections recorded.
                  </p>
                )}
                {Object.entries(byType).map(([type, count]) => (
                  <BreakdownRow
                    key={type}
                    label={EVENT_TYPE_LABELS[type] ?? type}
                    count={count}
                    total={resolvedEvents.length}
                    barColor="bg-[#26323D]"
                  />
                ))}
              </div>
            </div>

            {/* Review status breakdown */}
            <div className="panel overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#D9E0E6] flex items-center justify-between bg-[#F8FAFC]">
                <span className="text-[10px] font-bold text-[#52677D] uppercase tracking-widest">By Review Disposition</span>
                <span className="text-[10px] text-[#6B7785] font-mono">
                  {resolvedEvents.length} Total
                </span>
              </div>
              <div className="divide-y divide-[#D9E0E6]/50">
                {Object.entries(byStatus).length === 0 && (
                  <p className="px-4 py-3 text-xs text-[#A9B7C5]">
                    No reviews logged.
                  </p>
                )}
                {["escalated", "pending", "reviewed", "dismissed"].map(
                  (status) => {
                    const count = byStatus[status] ?? 0;
                    if (count === 0) return null;
                    const meta = REVIEW_STATUS_META[status];
                    const barColors = {
                      escalated: "bg-rose-500",
                      reviewed: "bg-emerald-500",
                      pending: "bg-amber-500",
                      dismissed: "bg-[#A9B7C5]",
                    };
                    return (
                      <BreakdownRow
                        key={status}
                        label={meta.label}
                        count={count}
                        total={resolvedEvents.length}
                        barColor={barColors[status] || "bg-[#A9B7C5]"}
                        badge={meta.color}
                      />
                    );
                  }
                )}
              </div>
            </div>
          </div>

          {/* ── Session summary note ──────────────────────────────────── */}
          {(session.aiSummary || session.recommendedAction) && (
            <div className="panel p-4 space-y-3">
              <span className="text-[10px] font-bold text-[#52677D] uppercase tracking-widest block">AI Summary &amp; Recommended Disposition</span>
              {session.aiSummary && (
                <p className="text-xs text-[#26323D] leading-relaxed bg-[#F8FAFC] p-3 rounded border border-[#D9E0E6]">
                  {session.aiSummary}
                </p>
              )}
              {session.recommendedAction && (
                <div className="flex items-start gap-2.5 p-3 rounded bg-rose-50 border border-rose-200">
                  <AlertTriangle
                    size={14}
                    className="text-rose-600 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-0.5">
                      Recommended Action
                    </div>
                    <div className="text-xs text-rose-800 font-medium">
                      {session.recommendedAction}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Export info footer ───────────────────────────────────── */}
          <div className="flex items-center justify-between text-[11px] font-mono text-[#6B7785] px-1 pt-1">
            <span>Report Telemetry Generated: {new Date().toLocaleString()}</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {formatTimecode(session.durationSeconds)}
              </span>
              <span className="flex items-center gap-1">
                <Timer size={11} />
                {resolvedEvents.length} Events
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Hidden PDF template (off-screen for rasterization) ───────── */}
      <div
        style={{
          position: "absolute",
          top: "-9999px",
          left: "-9999px",
          width: "1000px",
        }}
      >
        <ReportTemplate
          ref={reportRef}
          session={{
            ...session,
            heatmapUrl: heatmapDataUrl || session?.heatmapUrl,
          }}
          events={resolvedEvents}
        />
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}

/* ── Helper: session metadata pill ──────────────────────────────────── */
function MetaItem({ label, value, mono = false }) {
  return (
    <div>
      <div className="text-[9px] text-[#6B7785] font-bold uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div
        className={`text-xs text-[#26323D] font-semibold ${mono ? "font-mono" : ""} truncate`}
      >
        {value || "—"}
      </div>
    </div>
  );
}
