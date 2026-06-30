'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Event } from '@/schema/event';
import styles from './page.module.css';
import aboutStyles from '@/components/sections/AboutSection.module.css';
import FlashingGrid from '@/components/sections/FlashingGrid';

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

// ── Filter chip ───────────────────────────────────────────────────────────────

function FilterChip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`${styles.filterTab} ${active ? styles.filterTabActive : ''}`}
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

  // Format type style dynamically
  const typeBadgeClass = 
    event.type === 'hackathon' ? styles.badgeTypeHackathon :
    event.type === 'workshop' ? styles.badgeTypeWorkshop :
    event.type === 'meet' ? styles.badgeTypeMeetup :
    styles.badgeTypeContest; // default generic fallback

  return (
    <div
      onClick={() => router.push(`/events/${event.slug}`)}
      className={styles.eventCard}
    >
      <div className={styles.scanLine} />

      {/* Thumbnail */}
      <div className={styles.cardImageWrapper}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbSrc}
          alt={event.eventName}
          onError={() => setThumbError(true)}
          className={`${styles.cardImage} ${isFinished ? styles.cardImageGrayscale : ''}`}
        />
        {/* Type badge overlaid on thumbnail */}
        <span className={`${styles.badge} ${typeBadgeClass}`}>
          {event.type}
        </span>
        {/* Status badge for non-upcoming */}
        {event.status !== 'upcoming' && (
          <span className={`${styles.badge} ${styles.badgeStatus}`}>
            {event.status}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className={styles.cardBody}>
        {/* Date */}
        {tsToDate(event.startDate) && (
          <p className={styles.cardDate}>{tsToDate(event.startDate)}</p>
        )}

        {/* Title */}
        <h3 className={styles.cardTitle}>
          {event.eventName}
        </h3>

        {/* Description — truncated to 3 lines via arbitrary line-clamp CSS utility */}
        <p className={`${styles.cardDesc} line-clamp-3`}>
          {event.eventDescription}
        </p>

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className={styles.cardTags}>
            {event.tags.slice(0, 3).map((tag) => (
              <span key={tag} className={styles.cardTag}>
                {tag}
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className={styles.cardTag}>
                +{event.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* CTA button */}
        {event.isFormOpen && !isFinished && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <Link
              href={`/events/${event.slug}/register`}
              onClick={(e) => e.stopPropagation()}
              className={styles.registerBtn}
            >
              REGISTER NOW
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.registerIcon}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={`${styles.skeletonImage} ${styles.skeletonPulse}`} />
      <div className={styles.skeletonBody}>
        <div className={`${styles.skeletonLine} ${styles.skeletonPulse}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonPulse}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonPulse}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonPulse}`} />
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
    <div className={styles.wrapper}>
      
      {/* Background Atmosphere */}
      <div className={aboutStyles.bgAtmosphere} aria-hidden="true">
        <div className={aboutStyles.bgGrid} />
        <FlashingGrid />
        <div className={aboutStyles.bgGlow1} />
        <div className={aboutStyles.bgGlow2} />
      </div>

      <div className={styles.inner}>

        {/* Page header */}
        <div className={styles.headerBlock}>
          <p className={styles.eyebrow}>SC.03 — EVENTS ARCHIVE</p>
          <h1 className={styles.heading}>EVENTS</h1>
          <p className={styles.description}>
            Hackathons, workshops, and community meets organised by ACM NIT Surat. 
            Browse our technical blueprint of past and upcoming ventures.
          </p>
        </div>

        {/* Filters */}
        <div className={styles.filterContainer}>
          {STATUS_FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              label={f.label}
              active={statusFilter === f.value}
              onClick={() => setStatusFilter(f.value)}
            />
          ))}
          <span className="w-px h-6 bg-violet-500/20 mx-2 hidden sm:block" />
          {TYPE_FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              label={f.label}
              active={typeFilter === f.value}
              onClick={() => setTypeFilter(f.value)}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 px-4 py-3 rounded-md border border-red-500/20 bg-red-500/10 text-sm text-red-400 relative z-10">
            {error}
          </div>
        )}

        {/* Loading skeleton grid */}
        {loading && (
          <div className={styles.eventsGrid}>
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center relative z-10">
            <div className="w-12 h-12 rounded-full border border-violet-500/20 bg-violet-500/5 flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500/50">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <p className="text-sm font-medium text-violet-100">No events found in this category</p>
            <p className="text-xs text-violet-500/50 mt-1">
              {statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Check back soon for upcoming events.'}
            </p>
            {(statusFilter !== 'all' || typeFilter !== 'all') && (
              <button
                onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}
                className="mt-4 text-xs font-mono tracking-widest uppercase text-violet-400 hover:text-violet-300 transition-colors"
              >
                [ Clear Filters ]
              </button>
            )}
          </div>
        )}

        {/* Events grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className={styles.eventsGrid}>
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
