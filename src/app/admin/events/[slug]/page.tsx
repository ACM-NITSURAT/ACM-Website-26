'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getEvent, deleteEvent, toggleFormOpen } from '@/lib/firebase/admin-api';
import type { Event } from '@/schema/event';
import { EVENT_THUMBNAIL_ASPECT_RATIO, EVENT_TYPES_WITHOUT_FORMS } from '@/config';
import ToggleRow from '@/components/ui/ToggleRow';

type EventRow = Event & { id: string };

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

function tsToDateOnly(ts: unknown): string {
  if (!ts || typeof ts !== 'object') return '—';
  const s = Number((ts as Record<string, unknown>).seconds ?? (ts as Record<string, unknown>)._seconds);
  if (!s) return '—';
  return new Date(s * 1000).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const STATUS_STYLES: Record<Event['status'], string> = {
  upcoming: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ongoing:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  finished: 'bg-zinc-700/40 text-zinc-400 border-zinc-700',
};
const TYPE_STYLES: Record<Event['type'], string> = {
  event:    'bg-violet-500/10 text-violet-400 border-violet-500/20',
  workshop: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  meet:     'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-medium capitalize ${cls}`}>
      {label}
    </span>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium text-zinc-100 leading-snug">{value}</span>
      {sub && <span className="text-xs text-zinc-600">{sub}</span>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-3">{children}</p>
  );
}

// ── Delete modal ──────────────────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onCancel, loading }: {
  name: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm mx-4 rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6M9 6V4h6v2" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Delete event?</h2>
        <p className="text-sm text-zinc-400 mb-6">
          <span className="text-zinc-200 font-medium">{name}</span> will be permanently deleted. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 bg-red-500 text-white rounded-md py-2 text-sm font-medium hover:bg-red-400 disabled:opacity-50 transition-colors">
            {loading ? 'Deleting…' : 'Delete'}
          </button>
          <button onClick={onCancel} disabled={loading}
            className="flex-1 bg-zinc-800 text-zinc-300 rounded-md py-2 text-sm font-medium hover:bg-zinc-700 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const params = useParams();
  const slug   = params?.slug as string;
  const router = useRouter();

  const [event, setEvent]           = useState<EventRow | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [togglingForm, setTogglingForm] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getEvent(slug)
      .then(setEvent)
      .catch((e) => setError(e.message ?? 'Event not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteEvent(slug);
      router.replace('/admin/events');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete.');
      setShowDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleForm() {
    if (!event) return;
    setTogglingForm(true);
    try {
      const updated = await toggleFormOpen(slug, !event.isFormOpen);
      setEvent((prev) => prev ? { ...prev, isFormOpen: updated.isFormOpen } : prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to toggle form.');
    } finally {
      setTogglingForm(false);
    }
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex h-full min-h-screen">
      <div className="w-72 flex-shrink-0 border-r border-zinc-800 p-5 space-y-3">
        <div className="rounded-lg bg-zinc-800/60 animate-pulse" style={{ aspectRatio: EVENT_THUMBNAIL_ASPECT_RATIO }} />
        <div className="h-9 rounded-md bg-zinc-800 animate-pulse" />
        <div className="h-9 rounded-md bg-zinc-800 animate-pulse" />
      </div>
      <div className="flex-1 p-8 space-y-4">
        <div className="h-4 w-32 rounded bg-zinc-800 animate-pulse" />
        <div className="h-8 w-72 rounded bg-zinc-800 animate-pulse" />
        <div className="h-4 w-48 rounded bg-zinc-800/50 animate-pulse" />
      </div>
    </div>
  );

  if (error || !event) return (
    <div className="p-8">
      <p className="text-sm text-red-400 mb-4">{error || 'Event not found.'}</p>
      <Link href="/admin/events" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">← Back to events</Link>
    </div>
  );

  const thumbSrc = (!thumbError && event.eventThumbnail) ? event.eventThumbnail : '/event-placeholder.jpg';
  const hasPrize = event.prizeMoney > 0;
  const isTeam   = event.isTeamEvent;

  const chips: { label: string }[] = [];
  if (event.isOpenToAll)       chips.push({ label: 'Open to all' });
  if (event.unregisteredForm)  chips.push({ label: 'External form' });
  if (event.isFemaleMandatory) chips.push({ label: 'Female mandatory' });

  return (
    <>
      {showDelete && (
        <DeleteModal
          name={event.eventName}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          loading={deleting}
        />
      )}

      {/* Full-screen two-column layout */}
      <div className="flex min-h-full">

        {/* ── Left column: thumbnail + action buttons (sticky) ── */}
        <aside className="hidden lg:flex flex-col flex-shrink-0 w-72 xl:w-80 border-r border-zinc-800 sticky top-[74px] self-start max-h-[calc(100vh-74px)] overflow-y-auto">
          <div className="p-4 flex flex-col gap-3">

            {/* Thumbnail */}
            <div
              className="w-full rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900"
              style={{ aspectRatio: EVENT_THUMBNAIL_ASPECT_RATIO }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbSrc}
                alt={event.eventName}
                onError={() => setThumbError(true)}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Edit + Delete row */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/admin/events/${slug}/edit`}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </Link>
              <button
                onClick={() => setShowDelete(true)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                </svg>
                Delete
              </button>
            </div>

            {/* See participants — full span */}
            <Link
              href={`/admin/events/${slug}/participants`}
              className="flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-zinc-200 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              See participants
            </Link>

            {/* Form builder button + toggle — only for form-capable event types */}
            {!EVENT_TYPES_WITHOUT_FORMS.includes(event.type) && (
              <>
                <Link
                  href={`/admin/events/${slug}/form`}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-zinc-200 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  {event.hasForm ? 'Edit form' : 'Create form'}
                </Link>

                {event.hasForm && (
                  <ToggleRow
                    checked={!!event.isFormOpen}
                    onChange={handleToggleForm}
                    label="Form is open"
                    labelOff="Form is closed"
                    loading={togglingForm}
                  />
                )}
              </>
            )}
          </div>
        </aside>

        {/* ── Right column: all event details ── */}
        <main className="flex-1 min-w-0 px-6 md:px-10 py-8">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-6">
            <Link href="/admin/events" className="hover:text-zinc-300 transition-colors">Events</Link>
            <span>/</span>
            <span className="text-zinc-400 truncate">{event.eventName}</span>
          </div>

          {/* Title + badges */}
          <div className="mb-6">
            <div className="flex items-center gap-2 flex-wrap mb-2.5">
              <Badge label={event.status} cls={STATUS_STYLES[event.status]} />
              <Badge label={event.type}   cls={TYPE_STYLES[event.type]} />
              {chips.map(({ label }) => (
                <span key={label} className="inline-flex items-center px-2.5 py-0.5 rounded border text-xs border-zinc-700 bg-zinc-800 text-zinc-400">{label}</span>
              ))}
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white leading-tight tracking-tight">
              {event.eventName}
            </h1>
            <p className="text-xs text-zinc-600 font-mono mt-1.5">/events/{event.slug}</p>
          </div>

          {/* Mobile: thumbnail + actions (shown only below lg) */}
          <div className="lg:hidden mb-6 flex flex-col gap-3">
            <div className="w-full rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900"
              style={{ aspectRatio: EVENT_THUMBNAIL_ASPECT_RATIO }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbSrc} alt={event.eventName} onError={() => setThumbError(true)} className="w-full h-full object-cover" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/admin/events/${slug}/edit`}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </Link>
              <button onClick={() => setShowDelete(true)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" />
                </svg>
                Delete
              </button>
            </div>
            <Link href={`/admin/events/${slug}/participants`}
              className="flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-zinc-200 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              See participants
            </Link>
            {!EVENT_TYPES_WITHOUT_FORMS.includes(event.type) && (
              <>
                <Link href={`/admin/events/${slug}/form`}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-zinc-200 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  {event.hasForm ? 'Edit form' : 'Create form'}
                </Link>
                {event.hasForm && (
                  <ToggleRow
                    checked={!!event.isFormOpen}
                    onChange={handleToggleForm}
                    label="Form is open"
                    labelOff="Form is closed"
                    loading={togglingForm}
                  />
                )}
              </>
            )}
          </div>

          {/* ── Schedule + key stats grid ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="col-span-2 md:col-span-2 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col gap-3">
              <SectionLabel>Schedule</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Starts" value={tsToDateOnly(event.startDate)} sub={tsToDateTime(event.startDate).split(',').slice(1).join(',').trim()} />
                <Stat label="Ends"   value={tsToDateOnly(event.endDate)}   sub={tsToDateTime(event.endDate).split(',').slice(1).join(',').trim()} />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <Stat
                label={isTeam ? 'Teams' : 'Registered'}
                value={
                  <>
                    {isTeam ? event.totalTeams : event.totalParticipants}
                    <span className="text-zinc-500 font-normal text-xs ml-1">{isTeam ? 'teams' : 'pax'}</span>
                  </>
                }
                sub={event.maxParticipants === 0 ? 'No cap' : `of ${event.maxParticipants}`}
              />
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <Stat label="Location" value={event.location} />
            </div>
          </div>

          {/* ── Participation format ── */}
          <div className="mb-8">
            <SectionLabel>Participation</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-start gap-3">
                {isTeam ? (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-100">Team event</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {event.minTeamMembers === event.maxTeamMembers
                          ? `Exactly ${event.minTeamMembers} members per team`
                          : `${event.minTeamMembers}–${event.maxTeamMembers} members per team`}
                      </p>
                      {event.isFemaleMandatory && (
                        <p className="text-xs text-zinc-500 mt-0.5">Min. {event.minFemaleRequired} female member{event.minFemaleRequired !== 1 ? 's' : ''} required</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-100">Individual event</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Participants register on their own</p>
                    </div>
                  </>
                )}
              </div>

              {hasPrize && (
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Prize pool</p>
                  <p className="text-xl font-semibold text-zinc-100">₹{event.prizeMoney.toLocaleString('en-IN')}</p>
                  <div className="flex gap-3 mt-2">
                    {[
                      { label: '🥇', value: event.prizeMoneyDistribution.firstPrize },
                      { label: '🥈', value: event.prizeMoneyDistribution.secondPrize },
                      { label: '🥉', value: event.prizeMoneyDistribution.thirdPrize },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-xs text-zinc-400">
                        {label} {value > 0 ? `₹${value.toLocaleString('en-IN')}` : '—'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── About ── */}
          <div className="mb-8">
            <SectionLabel>About</SectionLabel>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{event.eventDescription}</p>
          </div>

          {/* ── Tags ── */}
          {event.tags.length > 0 && (
            <div className="mb-8">
              <SectionLabel>Tags</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700/60 text-xs text-zinc-400">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="pt-5 border-t border-zinc-800/60 flex flex-wrap gap-5 text-xs text-zinc-700">
            <span>Doc ID <span className="font-mono text-zinc-600">{event.id}</span></span>
            <span>Slug <span className="font-mono text-zinc-600">{event.slug}</span></span>
            <span>Created {tsToDateOnly(event.creationDate)}</span>
          </div>

        </main>
      </div>
    </>
  );
}
