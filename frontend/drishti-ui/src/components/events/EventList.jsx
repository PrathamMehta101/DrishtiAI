import { useState, useMemo } from 'react';
import { Search, X, ShieldAlert } from 'lucide-react';
import EventCard from './EventCard';
import EmptyState from '../ui/EmptyState';
import { EVENT_TYPE_LABELS } from '../../lib/utils';
import useAppStore from '../../store/useAppStore';

const RISK_FILTERS = [
  { value: 'all', label: 'All Risks' },
  { value: 'high', label: 'High Priority' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'dismissed', label: 'Dismissed' },
];

export default function EventList({ events = [], onEventClick }) {
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { selectedEventId, eventOverrides } = useAppStore();

  const escalatedCount = useMemo(() => {
    return events.filter(e => {
      const override = eventOverrides[e.id];
      const status = override?.reviewStatus ?? e.reviewStatus;
      return status === 'escalated';
    }).length;
  }, [events, eventOverrides]);

  const filtered = useMemo(() => {
    return events.filter(evt => {
      const override = eventOverrides[evt.id];
      const status = override?.reviewStatus ?? evt.reviewStatus;
      const SUSPICIOUS_TYPES = new Set(['phone_use', 'hand_movement', 'gaze_shift', 'object_exchange']);
      const risk = SUSPICIOUS_TYPES.has(evt.type) ? 'high' : evt.confidence >= 0.80 ? 'high' : evt.confidence >= 0.60 ? 'medium' : 'low';
      const label = (EVENT_TYPE_LABELS[evt.type] ?? evt.type).toLowerCase();
      const objects = (evt.objectsDetected ?? []).join(' ');

      if (riskFilter !== 'all' && risk !== riskFilter) return false;
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (query && !label.includes(query.toLowerCase()) && !objects.includes(query.toLowerCase()) && !evt.id?.toLowerCase().includes(query.toLowerCase())) return false;

      return true;
    });
  }, [events, query, riskFilter, statusFilter, eventOverrides]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-3.5 py-3 border-b border-[#E2E8F0] flex-shrink-0 space-y-2 bg-[#F8FAFC]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#1E293B] uppercase tracking-wider">
              Flagged Events
            </span>
            <span className="font-mono text-[10px] font-bold text-[#64748B]">
              ({filtered.length})
            </span>
          </div>
          {escalatedCount > 0 && (
            <span className="flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
              <ShieldAlert size={11} />
              {escalatedCount} Escalated
            </span>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            id="event-search"
            placeholder="Filter by type, obj, ID…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="input-field pl-7 pr-6 text-xs h-7.5 bg-white border-[#E2E8F0] focus:border-[#243746]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#1E293B]">
              <X size={10} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-1.5">
          <select
            id="risk-filter"
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="input-field text-[10px] h-6.5 py-0 px-1.5 bg-white border-[#E2E8F0] text-[#64748B] font-semibold"
          >
            {RISK_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input-field text-[10px] h-6.5 py-0 px-1.5 bg-white border-[#E2E8F0] text-[#64748B] font-semibold"
          >
            {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#F5F7F9]">
        {filtered.length === 0 ? (
          <EmptyState
            title="No events found"
            description="Adjust search or filters to view events."
          />
        ) : (
          filtered.map(evt => (
            <EventCard
              key={evt.id}
              event={evt}
              isSelected={evt.id === selectedEventId}
              onClick={onEventClick}
              override={eventOverrides[evt.id]}
            />
          ))
        )}
      </div>
    </div>
  );
}
