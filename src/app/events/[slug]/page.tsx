'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Event } from '@/schema/event';
import type { EventForm } from '@/schema/form';
import { EVENT_TYPES_WITHOUT_FORMS } from '@/config';

// ── Types ─────────────────────────────────────────────────────────────────────

type EventRow = Event & { id: string };

interface PageData {
  event: EventRow;
  form: EventForm | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tsToDateTime(ts: unknown): string {
  if (!ts || typeof ts !== 'object') return '—';
  const s = Number((ts as Record<string, unknown>).seconds ?? (ts as Record<string, unknown>)._seconds);
  if (!s) return '—';
  return new Date(s * 1000).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Style maps ────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<Event['type'], string> = {
  event:    'bg-violet-500/10 text-violet-400 border-violet-500/20',
  workshop: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  meet:     'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

const STATUS_STYLES: Record<Event['status'], string> = {
  upcoming: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ongoing:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  finished: 'bg-zinc-700/40 text-zinc-400 border-zinc-700',
};

const TYPE_GLOW: Record<Event['type'], string> = {
  event:    'from-violet-600/20',
  workshop: 'from-amber-600/20',
  meet:     'from-cyan-600/20',
};

// ── Register / See Agenda button ──────────────────────────────────────────────

function RegisterButton({
  event,
  size = 'default',
}: {
  event: EventRow;
  size?: 'default' | 'large';
}) {
  const isMeet = event.type === 'meet';
  const isFinished = event.status === 'finished';
  const noForm = EVENT_TYPES_WITHOUT_FORMS.includes(event.type);

  const base =
    size === 'large'
      ? 'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-colors'
      : 'w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors';

  if (isMeet || noForm) {
    return (
      <Link href={`/events/${event.slug}/register`}
        className={`${base} bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/15`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        See Agenda
      </Link>
    );
  }

  if (isFinished) {
    return (
      <div className={`${base} bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-default`}>
        Registrations Closed
      </div>
    );
  }

  if (!event.isFormOpen) {
    return (
      <div className={`${base} bg-zinc-800 border border-zinc-700 text-zinc-400 cursor-default`}>
        Registration Not Open Yet
      </div>
    );
  }

  return (
    <Link href={`/events/${event.slug}/register`}
      className={`${base} bg-white text-zinc-900 hover:bg-zinc-200`}>
      Register Now
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 pt-[74px]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="h-3 w-24 rounded bg-zinc-800 animate-pulse mb-8" />
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <div className="w-full rounded-xl bg-zinc-800 animate-pulse mb-6" style={{ aspectRatio: '16/9' }} />
            <div className="h-8 w-2/3 rounded bg-zinc-800 animate-pulse mb-3" />
            <div className="h-4 w-1/3 rounded bg-zinc-800 animate-pulse mb-6" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-3 rounded bg-zinc-800/60 animate-pulse" />)}
            </div>
          </div>
          <div className="lg:w-72 xl:w-80 flex-shrink-0">
            <div className="rounded-xl border border-zinc-800 p-5 space-y-3">
              <div className="h-9 rounded-lg bg-zinc-800 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-zinc-800/60 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [thumbError, setThumbError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/events/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error('Event not found');
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message ?? 'Failed to load event'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-[74px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-400 mb-4">{error || 'Event not found'}</p>
          <Link href="/events" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">← Back to events</Link>
        </div>
      </div>
    );
  }

  const { event } = data;
  const thumbSrc = !thumbError && event.eventThumbnail ? event.eventThumbnail : '/event-placeholder.jpg';
  const hasPrize = event.prizeMoney > 0;
  const isTeam = event.isTeamEvent;

  return (
    <div className="min-h-screen bg-zinc-950 pt-[74px]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-8">
          <Link href="/events" className="hover:text-zinc-300 transition-colors">Events</Link>
          <span>/</span>
          <span className="text-zinc-400 truncate">{event.eventName}</span>
        </div>

        {/* Main layout */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">

          {/* Left: main content */}
          <main className="flex-1 min-w-0">
            {/* Thumbnail */}
            <div className="relative w-full rounded-xl overflow-hidden bg-zinc-800 mb-6" style={{ aspectRatio: '16/9' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbSrc} alt={event.eventName} onError={() => setThumbError(true)} className="w-full h-full object-cover" />
              <div aria-hidden className="absolute inset-0 pointer-events-none bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent" />
            </div>

            {/* Title + badges */}
            <div className="relative mb-6">
              <div aria-hidden className={`absolute -top-10 -left-4 w-64 h-64 rounded-full blur-3xl opacity-60 pointer-events-none bg-gradient-to-br ${TYPE_GLOW[event.type]} to-transparent`} />
              <div className="relative flex flex-wrap items-center gap-2 mb-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-medium capitalize ${TYPE_STYLES[event.type]}`}>{event.type}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-medium capitalize ${STATUS_STYLES[event.status]}`}>{event.status}</span>
                {event.isOpenToAll && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-medium bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Open to all</span>
                )}
              </div>
              <h1 className="relative text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                {event.eventName}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {tsToDateTime(event.startDate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" /><circle cx="12" cy="10" r="3" />
                  </svg>
                  {event.location}
                </span>
              </div>
            </div>

            {/* About */}
            <section className="mb-8">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="h-3 w-0.5 rounded-full bg-zinc-600" />About
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{event.eventDescription}</p>
            </section>

            {/* Details grid */}
            <section className="mb-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">{isTeam ? 'Teams' : 'Registered'}</p>
                <p className="text-2xl font-semibold text-white">{isTeam ? event.totalTeams : event.totalParticipants}</p>
                {event.maxParticipants > 0 && <p className="text-xs text-zinc-500 mt-0.5">of {event.maxParticipants} max</p>}
              </div>
              {isTeam && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">Team size</p>
                  <p className="text-sm font-medium text-white">
                    {event.minTeamMembers === event.maxTeamMembers ? `${event.minTeamMembers} members` : `${event.minTeamMembers}–${event.maxTeamMembers} members`}
                  </p>
                </div>
              )}
              {hasPrize && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">Prize pool</p>
                  <p className="text-xl font-semibold text-amber-300">₹{event.prizeMoney.toLocaleString('en-IN')}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {event.prizeMoneyDistribution.firstPrize > 0 && <span className="text-xs text-amber-400/80">🥇 ₹{event.prizeMoneyDistribution.firstPrize.toLocaleString('en-IN')}</span>}
                    {event.prizeMoneyDistribution.secondPrize > 0 && <span className="text-xs text-zinc-400/80">🥈 ₹{event.prizeMoneyDistribution.secondPrize.toLocaleString('en-IN')}</span>}
                    {event.prizeMoneyDistribution.thirdPrize > 0 && <span className="text-xs text-orange-400/80">🥉 ₹{event.prizeMoneyDistribution.thirdPrize.toLocaleString('en-IN')}</span>}
                  </div>
                </div>
              )}
            </section>

            {/* Tags */}
            {event.tags.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="h-3 w-0.5 rounded-full bg-cyan-600" />Topics
                </h2>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((t) => (
                    <span key={t} className="px-3 py-1 rounded-full border border-zinc-700 bg-zinc-800 text-xs font-medium text-zinc-300">{t}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Mobile register button inline (before sticky bar) */}
            <div className="lg:hidden pb-24">
              <RegisterButton event={event} size="large" />
            </div>
          </main>

          {/* Right sidebar — sticky on desktop */}
          <aside className="hidden lg:block w-72 xl:w-80 flex-shrink-0 sticky top-[90px]">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col gap-5">
              {/* Schedule */}
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="h-3 w-0.5 rounded-full bg-blue-500" />Schedule
                </p>
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Starts</p>
                    <p className="text-sm font-medium text-zinc-100">{tsToDateTime(event.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Ends</p>
                    <p className="text-sm font-medium text-zinc-100">{tsToDateTime(event.endDate)}</p>
                  </div>
                </div>
              </div>
              {/* Venue */}
              <div className="border-t border-zinc-800 pt-4">
                <p className="text-xs text-zinc-500 mb-0.5">Venue</p>
                <p className="text-sm font-medium text-zinc-200">{event.location}</p>
              </div>
              {/* Capacity */}
              {event.maxParticipants > 0 && (
                <div className="border-t border-zinc-800 pt-4">
                  <p className="text-xs text-zinc-500 mb-1">Seats</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full bg-white/60 transition-all"
                        style={{ width: `${Math.min(100, (event.totalParticipants / event.maxParticipants) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-zinc-400 whitespace-nowrap">
                      {Math.max(0, event.maxParticipants - event.totalParticipants)} left
                    </span>
                  </div>
                </div>
              )}
              {/* CTA */}
              <div className="border-t border-zinc-800 pt-4">
                <RegisterButton event={event} />
              </div>
            </div>
          </aside>

        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md px-4 py-3">
        <RegisterButton event={event} size="large" />
      </div>
    </div>
  );
}
