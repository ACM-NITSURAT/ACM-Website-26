'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listEvents } from '@/lib/firebase/admin-api';
import type { Event } from '@/schema/event';
import FlashingGrid from '@/components/sections/FlashingGrid';

const PAGE_SIZE = 10;

type EventRow = Event & { id: string };

const STATUS_STYLES: Record<Event['status'], string> = {
  upcoming:  'bg-blue-500/10 text-blue-400 border-blue-500/30',
  ongoing:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 ',
  finished:  'bg-zinc-800/40 text-zinc-400 border-zinc-700',
};

const TYPE_STYLES: Record<Event['type'], string> = {
  event:    'bg-violet-500/10 text-violet-400 border-violet-500/30',
  workshop: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  meet:     'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  hackathon: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30',
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest border ${className}`} style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>
      {label}
    </span>
  );
}

function formatDate(ts: unknown): string {
  if (!ts) return '—';
  const t = ts as { _seconds?: number; seconds?: number };
  const seconds = t._seconds ?? t.seconds;
  if (!seconds) return '—';
  return new Date(seconds * 1000).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    listEvents()
      .then((res) => setEvents(res.events))
      .catch((err) => setError(err.message ?? 'Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const slice = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="relative min-h-screen bg-[#07060a] overflow-hidden" data-flashing-container="true">
      <div className="absolute inset-0 z-0 pointer-events-none bg-grid-pattern">
        <FlashingGrid />
      </div>
      <div className="relative z-10 p-8 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 border-b border-indigo-500/20 pb-8">
          <div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
              Events <span className="text-indigo-400">Manager</span>
            </h1>
            <p className="text-zinc-400 font-mono text-sm tracking-widest uppercase">
              {loading ? 'Initializing…' : `Database records: ${events.length}`}
            </p>
          </div>
          <Link
            href="/admin/create/event"
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-md px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all duration-300  hover:"
            style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Deploy Event
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400 font-mono">
            [ERROR] {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-[#12121a]/60 border border-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-[#12121a]/60 backdrop-blur-md border border-white/5 rounded-2xl">
            <div className="w-16 h-16 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 ">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <p className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>NO EVENTS FOUND</p>
            <p className="text-sm text-zinc-400 font-mono mb-8 max-w-md mx-auto">The database is currently empty. Deploy a new event to populate this sector.</p>
            <Link
              href="/admin/create/event"
              className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-md px-6 py-2 text-sm font-bold uppercase tracking-widest hover:bg-indigo-500/30 transition-all duration-150"
              style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}
            >
              Deploy Event
            </Link>
          </div>
        )}

        {/* Table */}
        {!loading && !error && events.length > 0 && (
          <>
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#12121a]/60 backdrop-blur-xl shadow-xl">
              {/* Table header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-4 bg-black/40 border-b border-white/10">
                {['Identifier', 'Type', 'Status', 'Launch Date', 'Slug'].map((h) => (
                  <span key={h} className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em]" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/5">
                {slice.map((event) => (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.slug}`}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-4 items-center group hover:bg-white/5 transition-colors duration-200"
                  >
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-bold text-zinc-200 truncate group-hover:text-indigo-400 transition-colors" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
                        {event.eventName}
                      </p>
                      <p className="text-[11px] text-zinc-500 font-mono truncate mt-1 group-hover:text-zinc-400 transition-colors">{event.location}</p>
                    </div>
                    <div>
                      <Badge label={event.type} className={TYPE_STYLES[event.type]} />
                    </div>
                    <div>
                      <Badge label={event.status} className={STATUS_STYLES[event.status]} />
                    </div>
                    <span className="text-xs text-zinc-400 font-mono">{formatDate(event.startDate)}</span>
                    <span className="text-[11px] text-zinc-500 font-mono truncate bg-black/40 px-2 py-1 rounded border border-white/5">{event.slug}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 border-t border-indigo-500/10 pt-6">
                <span className="text-xs text-indigo-400 font-mono tracking-widest uppercase">
                  Sector {page} / {totalPages}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded border border-indigo-500/30 text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}
                  >
                    &larr; Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 rounded border border-indigo-500/30 text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
