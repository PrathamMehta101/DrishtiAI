// ── Global Zustand Store ─────────────────────────────────────────────
import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────────
  isAuthenticated: !!localStorage.getItem('drishti_auth'),
  login: (email, password) => {
    // Stub: accept any credentials
    localStorage.setItem('drishti_auth', '1');
    set({ isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('drishti_auth');
    set({ isAuthenticated: false });
  },

  // ── Sidebar ───────────────────────────────────────────────────────
  sidebarCollapsed: false,
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // ── Session Review ────────────────────────────────────────────────
  selectedEventId: null,
  setSelectedEventId: (id) => set({ selectedEventId: id }),

  // Local event status mutations (optimistic, until real API)
  eventOverrides: {}, // { [eventId]: { reviewStatus, note } }
  updateEventOverride: (eventId, data) =>
    set(s => ({
      eventOverrides: {
        ...s.eventOverrides,
        [eventId]: { ...(s.eventOverrides[eventId] ?? {}), ...data },
      },
    })),

  // ── Heatmap toggle ────────────────────────────────────────────────
  heatmapEnabled: false,
  toggleHeatmap: () => set(s => ({ heatmapEnabled: !s.heatmapEnabled })),

  // ── Forensic Dossier ─────────────────────────────────────────────
  // Map of eventId -> true for events attached to the disciplinary file
  forensicDossier: {},
  attachToDossier: (eventId) =>
    set(s => ({ forensicDossier: { ...s.forensicDossier, [eventId]: true } })),
}));

export default useAppStore;
