'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { listParticipants, downloadParticipantsCsv } from '@/lib/firebase/admin-api';
import type { Participant } from '@/schema/participant';
import type { EventForm, FormField } from '@/schema/form';

// ── Types ─────────────────────────────────────────────────────────────────────

type RawParticipant = Participant & { id: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function tsToSeconds(ts: unknown): number {
  if (!ts || typeof ts !== 'object') return 0;
  const s = Number(
    (ts as Record<string, unknown>).seconds ??
    (ts as Record<string, unknown>)._seconds,
  );
  return s || 0;
}

function tsToDateTime(ts: unknown): string {
  const s = tsToSeconds(ts);
  if (!s) return '—';
  return new Date(s * 1000).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const DAY = 86400;
function now() { return Math.floor(Date.now() / 1000); }

function getInputFields(form: EventForm | null): FormField[] {
  if (!form) return [];
  return form.fields.filter((f) => f.type !== 'paragraph').sort((a, b) => a.order - b.order);
}

function extraVal(p: RawParticipant, fieldId: string): string {
  const val = p.extraFields?.[fieldId];
  if (val === null || val === undefined) return '—';
  return Array.isArray(val) ? val.join(', ') || '—' : String(val) || '—';
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: {
  label: string; value: React.ReactNode; sub?: string; accent: string;
}) {
  return (
    <div className={`rounded-xl border bg-zinc-900/50 p-5 flex flex-col gap-1.5 ${accent}`}>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-bold text-white tabular-nums leading-none">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Table shared styles ───────────────────────────────────────────────────────

const thCls = 'px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap bg-zinc-900 sticky top-0';
const tdCls = 'px-3 py-3 align-middle text-sm';

// ── Participants table ────────────────────────────────────────────────────────

function ParticipantsTable({
  rows, inputFields, isTeam, includeDefaultFields,
}: {
  rows: RawParticipant[];
  inputFields: FormField[];
  isTeam: boolean;
  includeDefaultFields: boolean;
}) {
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-zinc-800">
          {/* Submitter identity — shown only when default fields are ON */}
          {includeDefaultFields && (
            <>
              <th className={thCls}>{isTeam ? 'Leader name' : 'Submitter name'}</th>
              <th className={thCls}>{isTeam ? 'Leader roll' : 'Submitter roll'}</th>
            </>
          )}
          {/* Custom form field columns — always shown */}
          {inputFields.map((f) => (
            <th key={f.id} className={thCls}>{f.label}</th>
          ))}
          {/* Meta */}
          <th className={thCls}>Attended</th>
          <th className={thCls}>Registered at</th>
          <th className={thCls}>Doc ID</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/25 transition-colors">
            {includeDefaultFields && (
              <>
                <td className={`${tdCls} font-medium text-white whitespace-nowrap`}>
                  {p.submitter?.name || <span className="text-zinc-600 italic">anonymous</span>}
                </td>
                <td className={`${tdCls} font-mono text-zinc-400 whitespace-nowrap`}>
                  {p.submitter?.rollNumber || <span className="text-zinc-600">—</span>}
                </td>
              </>
            )}
            {inputFields.map((f) => (
              <td key={f.id} className={`${tdCls} text-zinc-400 max-w-[200px]`}>
                <span className="block truncate" title={extraVal(p, f.id)}>
                  {extraVal(p, f.id)}
                </span>
              </td>
            ))}
            <td className={tdCls}>
              <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${
                p.attended
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-500 border-zinc-700'
              }`}>
                {p.attended ? 'Yes' : 'No'}
              </span>
            </td>
            <td className={`${tdCls} text-zinc-500 whitespace-nowrap`}>
              {tsToDateTime(p.registrationTimestamp)}
            </td>
            <td className={`${tdCls} font-mono text-zinc-600 text-xs whitespace-nowrap`} title={p.id}>
              {p.id.slice(0, 8)}…
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export default function ParticipantsPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [participants, setParticipants] = useState<RawParticipant[]>([]);
  const [form, setForm] = useState<EventForm | null>(null);
  const [isTeam, setIsTeam] = useState(false);
  const [includeDefaultFields, setIncludeDefaultFields] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    if (!slug) return;
    listParticipants(slug)
      .then((res) => {
        const first = res.participants[0];
        setIsTeam(first ? first.isTeam : false);
        setIncludeDefaultFields(res.form?.includeDefaultFields ?? false);
        const sorted = [...res.participants].sort(
          (a, b) => tsToSeconds(b.registrationTimestamp) - tsToSeconds(a.registrationTimestamp),
        );
        setParticipants(sorted);
        setForm(res.form);
      })
      .catch((e: Error) => setError(e.message ?? 'Failed to load.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const inputFields = useMemo(() => getInputFields(form), [form]);

  const filtered = useMemo(() => {
    if (!search.trim()) return participants;
    const q = search.toLowerCase();
    return participants.filter((p) => {
      const name = p.submitter?.name?.toLowerCase() ?? '';
      const roll = p.submitter?.rollNumber?.toLowerCase() ?? '';
      // also search within extraFields string values
      const extras = Object.values(p.extraFields ?? {})
        .map((v) => (Array.isArray(v) ? v.join(' ') : String(v ?? '')))
        .join(' ')
        .toLowerCase();
      return name.includes(q) || roll.includes(q) || extras.includes(q);
    });
  }, [participants, search]);

  const n = now();
  const analytics = useMemo(() => ({
    total: participants.length,
    last24h: participants.filter((p) => tsToSeconds(p.registrationTimestamp) >= n - DAY).length,
    last3d: participants.filter((p) => tsToSeconds(p.registrationTimestamp) >= n - 3 * DAY).length,
  }), [participants]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [search]);

  async function handleExport() {
    setExporting(true);
    setExportError('');
    try {
      await downloadParticipantsCsv(slug);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  }

  if (loading) return (
    <div className="p-8 space-y-6">
      <div className="h-4 w-40 rounded bg-zinc-800 animate-pulse" />
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-zinc-800/50 animate-pulse" />)}
      </div>
      <div className="h-64 rounded-lg bg-zinc-800/30 animate-pulse" />
    </div>
  );

  if (error) return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        <p className="text-sm text-red-400">{error}</p>
      </div>
      <Link href={`/admin/events/${slug}`} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
        ← Back to event
      </Link>
    </div>
  );

  return (
    <div className="p-6 md:p-8 min-h-full">

      {/* Top bar */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
            <Link href="/admin/events" className="hover:text-zinc-300 transition-colors">Events</Link>
            <span>/</span>
            <Link href={`/admin/events/${slug}`} className="hover:text-zinc-300 transition-colors">{slug}</Link>
            <span>/</span>
            <span className="text-zinc-400">Participants</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">
            {isTeam ? 'Teams' : 'Participants'}
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {filtered.length} {isTeam ? 'team' : 'participant'}{filtered.length !== 1 ? 's' : ''}
            {search ? ` matching "${search}"` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {exportError && <span className="text-xs text-red-400">{exportError}</span>}
          <button
            onClick={handleExport}
            disabled={exporting || participants.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Exporting…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export CSV
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label={isTeam ? 'Total teams' : 'Total registered'}
          value={analytics.total}
          sub="all time"
          accent="border-zinc-800"
        />
        <StatCard
          label="Last 3 days"
          value={analytics.last3d}
          sub="past 72 hours"
          accent="border-blue-500/20"
        />
        <StatCard
          label="Last 24 hours"
          value={analytics.last24h}
          sub="past 24 hours"
          accent="border-emerald-500/20"
        />
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, roll number, or any response…"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-md pl-9 pr-8 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {participants.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-300">No registrations yet</p>
          <p className="text-xs text-zinc-500 mt-1">Once participants register, they&apos;ll appear here.</p>
        </div>
      )}

      {/* No search results */}
      {participants.length > 0 && filtered.length === 0 && (
        <div className="py-12 text-center text-zinc-500 text-sm">
          No results for &ldquo;{search}&rdquo;.{' '}
          <button onClick={() => setSearch('')} className="underline hover:text-zinc-300 transition-colors">
            Clear search
          </button>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <>
          <div className="rounded-lg border border-zinc-800 overflow-x-auto">
            <ParticipantsTable rows={slice} inputFields={inputFields} isTeam={isTeam} includeDefaultFields={includeDefaultFields} />
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-zinc-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-md text-xs text-zinc-300 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs text-zinc-500">Page {page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-md text-xs text-zinc-300 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
