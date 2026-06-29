'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listEvents } from '@/lib/firebase/admin-api';
import type { Event } from '@/schema/event';

const PAGE_SIZE = 10;

type EventRow = Event & { id: string };

const STATUS_STYLES: Record<Event['status'], string> = {
  upcoming:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ongoing:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  finished:  'bg-zinc-700/40 text-zinc-400 border-zinc-700',
};

const TYPE_STYLES: Record<Event['type'], string> = {
  event:    'bg-violet-500/10 text-violet-400 border-violet-500/20',
  workshop: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  meet:     'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function formatDate(ts: unknown): string {
  if (!ts) return '—';
  // Firestore Timestamp has _seconds, or it may be a serialized object
  const t = ts as { _seconds?: number; seconds?: number };
  const seconds = t._seconds ?? t.seconds;
  if (!seconds) return '—';
  return new Date(seconds * 1000).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
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
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Events</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {loading ? 'Loading…' : `${events.length} event${events.length !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <Link
          href="/admin/create/event"
          className="flex items-center gap-2 bg-white text-zinc-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors duration-150"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New event
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-md border border-red-500/20 bg-red-500/10 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-zinc-800/50 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-300">No events yet</p>
          <p className="text-xs text-zinc-500 mt-1 mb-6">Create your first event to get started.</p>
          <Link
            href="/admin/create/event"
            className="bg-white text-zinc-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors duration-150"
          >
            Create event
          </Link>
        </div>
      )}

      {/* Table */}
      {!loading && !error && events.length > 0 && (
        <>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
              {['Event', 'Type', 'Status', 'Start date', 'Slug'].map((h) => (
                <span key={h} className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</span>
              ))}
            </div>

            {/* Rows */}
            {slice.map((event) => (
              <Link
                key={event.id}
                href={`/admin/events/${event.slug}`}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3.5 border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/40 transition-colors duration-100 group items-center"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-zinc-100">
                    {event.eventName}
                  </p>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">{event.location}</p>
                </div>
                <div>
                  <Badge label={event.type} className={TYPE_STYLES[event.type]} />
                </div>
                <div>
                  <Badge label={event.status} className={STATUS_STYLES[event.status]} />
                </div>
                <span className="text-xs text-zinc-400">{formatDate(event.startDate)}</span>
                <span className="text-xs text-zinc-500 font-mono truncate">{event.slug}</span>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-zinc-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-md text-xs text-zinc-300 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
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
