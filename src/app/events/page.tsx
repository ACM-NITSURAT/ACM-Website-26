'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Event } from '@/schema/event';

// ── Types ─────────────────────────────────────────────────────────────────────

type EventRow = Event & { id: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function tsToDate(ts: unknown): string {
  if (!ts || typeof ts !== 'object') return '';
  const s = Number((ts as Record<string, unknown>).seconds ?? (ts as Record<string, unknown>)._seconds);
  if (!s) return '';
  return new Date(s * 1000).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Style maps ────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<Event['type'], string> = {
  event:    'bg-violet-500/10 text-violet-400 border-violet-500/20',
  workshop: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  meet:     'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

const TYPE_LABELS: Record<Event['type'], string> = {
  event:    'Event',
  workshop: 'Workshop',
  meet:     'Meet',
};

const STATUS_STYLES: Record<Event['status'], string> = {
  upcoming: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ongoing:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  finished: 'bg-zinc-700/40 text-zinc-400 border-zinc-700',
};

// ── Filter chip ───────────────────────────────────────────────────────────────

function FilterChip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active
          ? 'bg-white text-zinc-900 border-transparent'
          : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────

function EventCard({ event }: { event: EventRow }) {
  const router = useRouter();
  const [thumbError, setThumbError] = useState(false);
  const thumbSrc = (!thumbError && event.eventThumbnail) ? event.eventThumbnail : '/event-placeholder.jpg';
  const isMeet = event.type === 'meet';
  const isFinished = event.status === 'finished';

  return (
    <div
      onClick={() => router.push(`/events/${event.slug}`)}
      className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-200 overflow-hidden cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative w-full overflow-hidden bg-zinc-800" style={{ aspectRatio: '16 / 9' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbSrc}
          alt={event.eventName}
          onError={() => setThumbError(true)}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isFinished ? 'grayscale opacity-70' : ''}`}
        />
        {/* Type badge overlaid on thumbnail */}
        <span className={`absolute top-2.5 left-2.5 inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium capitalize backdrop-blur-sm ${TYPE_STYLES[event.type]}`}>
          {TYPE_LABELS[event.type]}
        </span>
        {/* Status badge for non-upcoming */}
        {event.status !== 'upcoming' && (
          <span className={`absolute top-2.5 right-2.5 inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium capitalize backdrop-blur-sm ${STATUS_STYLES[event.status]}`}>
            {event.status}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Date */}
        {tsToDate(event.startDate) && (
          <p className="text-xs text-zinc-500">{tsToDate(event.startDate)}</p>
        )}

        {/* Title */}
        <h3 className="text-base font-semibold text-white leading-snug line-clamp-2 group-hover:text-zinc-100 transition-colors">
          {event.eventName}
        </h3>

        {/* Description — truncated to 3 lines */}
        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3 flex-1">
          {event.eventDescription}
        </p>

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {event.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 text-xs"
              >
                {tag}
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 text-xs">
                +{event.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* CTA button */}
        <div className="mt-3">
          {isMeet ? (
            <Link
              href={`/events/${event.slug}/register`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/15 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              See Agenda
            </Link>
          ) : isFinished ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-500 text-sm font-medium">
              Event Ended
            </span>
          ) : event.isFormOpen ? (
            <Link
              href={`/events/${event.slug}/register`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              Register Now
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm font-medium">
              View Details
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="w-full bg-zinc-800 animate-pulse" style={{ aspectRatio: '16 / 9' }} />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-3 w-20 rounded bg-zinc-800 animate-pulse" />
        <div className="h-5 w-3/4 rounded bg-zinc-800 animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-zinc-800 animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-zinc-800 animate-pulse" />
          <div className="h-3 w-4/6 rounded bg-zinc-800 animate-pulse" />
        </div>
        <div className="h-8 w-28 rounded-md bg-zinc-800 animate-pulse mt-1" />
      </div>
    </div>
  );
}

// ── Filter types ──────────────────────────────────────────────────────────────

type StatusFilter = 'all' | Event['status'];
type TypeFilter = 'all' | Event['type'];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? []))
      .catch(() => setError('Failed to load events. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    return true;
  });

  const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Ongoing', value: 'ongoing' },
    { label: 'Past', value: 'finished' },
  ];

  const TYPE_FILTERS: { label: string; value: TypeFilter }[] = [
    { label: 'All types', value: 'all' },
    { label: 'Events', value: 'event' },
    { label: 'Workshops', value: 'workshop' },
    { label: 'Meets', value: 'meet' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 pt-[74px]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">

        {/* Page header */}
        <div className="mb-10">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">SC.03</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-3"
            style={{ fontFamily: 'var(--font-display)' }}>
            Events
          </h1>
          <p className="text-zinc-400 text-sm max-w-xl">
            Hackathons, workshops, and community meets organised by ACM NIT Surat.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <FilterChip
                key={f.value}
                label={f.label}
                active={statusFilter === f.value}
                onClick={() => setStatusFilter(f.value)}
              />
            ))}
          </div>
          <span className="w-px h-4 bg-zinc-700 mx-1 hidden sm:block" />
          <div className="flex items-center gap-1.5 flex-wrap">
            {TYPE_FILTERS.map((f) => (
              <FilterChip
                key={f.value}
                label={f.label}
                active={typeFilter === f.value}
                onClick={() => setTypeFilter(f.value)}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 px-4 py-3 rounded-md border border-red-500/20 bg-red-500/10 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading skeleton grid */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-300">No events found</p>
            <p className="text-xs text-zinc-500 mt-1">
              {statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Check back soon for upcoming events.'}
            </p>
            {(statusFilter !== 'all' || typeFilter !== 'all') && (
              <button
                onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}
                className="mt-4 text-xs text-zinc-400 hover:text-zinc-200 underline transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Events grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
