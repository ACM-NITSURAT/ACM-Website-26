'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Event } from '@/schema/event';
import type { EventForm } from '@/schema/form';
import { EVENT_TYPES_WITHOUT_FORMS } from '@/config';
import styles from './page.module.css';
import aboutStyles from '@/components/sections/AboutSection.module.css';
import FlashingGrid from '@/components/sections/FlashingGrid';

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

function tsToDateString(ts: unknown): string {
  if (!ts || typeof ts !== 'object') return '—';
  const s = Number((ts as Record<string, unknown>).seconds ?? (ts as Record<string, unknown>)._seconds);
  if (!s) return '—';
  return new Date(s * 1000).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Register / See Agenda button ──────────────────────────────────────────────

function RegisterButton({
  event,
}: {
  event: EventRow;
}) {
  const isMeet = event.type === 'meet';
  const isFinished = event.status === 'finished';
  const noForm = EVENT_TYPES_WITHOUT_FORMS.includes(event.type);

  if (isMeet || noForm) {
    return (
      <Link href={`/events/${event.slug}/register`} className={styles.registerBtn}>
        <div className={styles.registerBtnScanline} />
        SEE AGENDA
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.registerIcon}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </Link>
    );
  }

  if (isFinished) {
    return (
      <div className={`${styles.registerBtn} ${styles.registerBtnDisabled}`}>
        REGISTRATIONS CLOSED
      </div>
    );
  }

  if (!event.isFormOpen) {
    return (
      <div className={`${styles.registerBtn} ${styles.registerBtnDisabled}`}>
        REGISTRATION NOT OPEN YET
      </div>
    );
  }

  return (
    <Link href={`/events/${event.slug}/register`} className={styles.registerBtn}>
      <div className={styles.registerBtnScanline} />
      REGISTER NOW
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.registerIcon}>
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.inner}>
        <div className="h-3 w-24 rounded bg-white/10 animate-pulse mb-8" />
        <div className={styles.layout}>
          <div className={styles.mainContent}>
            <div className="w-full rounded bg-white/5 animate-pulse mb-6" style={{ aspectRatio: '16/9' }} />
            <div className="h-8 w-2/3 rounded bg-white/10 animate-pulse mb-3" />
            <div className="h-4 w-1/3 rounded bg-white/10 animate-pulse mb-6" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-3 rounded bg-white/5 animate-pulse" />)}
            </div>
          </div>
          <div className={styles.sidebar}>
            <div className="rounded border border-white/10 p-5 space-y-3">
              <div className="h-9 rounded bg-white/10 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
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
      <div className={styles.wrapper}>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-mono text-red-400 mb-4">{error || 'ERROR: EVENT_NOT_FOUND'}</p>
            <Link href="/events" className="text-sm font-mono text-violet-400 hover:text-violet-300 transition-colors uppercase tracking-widest">
              [ RETURN TO ARCHIVE ]
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { event } = data;
  const thumbSrc = !thumbError && event.eventThumbnail ? event.eventThumbnail : '/event-placeholder.jpg';
  const hasPrize = event.prizeMoney > 0;
  const isTeam = event.isTeamEvent;

  // Format styles dynamically
  const typeBadgeClass = 
    event.type === 'hackathon' ? styles.badgeTypeHackathon :
    event.type === 'workshop' ? styles.badgeTypeWorkshop :
    event.type === 'meet' ? styles.badgeTypeMeetup :
    styles.badgeTypeContest;
    
  const statusBadgeClass =
    event.status === 'upcoming' ? styles.badgeStatusUpcoming :
    event.status === 'ongoing' ? styles.badgeStatusOngoing :
    styles.badgeStatusFinished;

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

        {/* Breadcrumb */}
        <div className={styles.breadcrumbs}>
          <Link href="/events" className={styles.breadcrumbLink}>EVENTS</Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbCurrent}>{event.eventName}</span>
        </div>

        {/* Main layout */}
        <div className={styles.layout}>

          {/* Left: main content */}
          <div className={styles.mainContent}>
            
            {/* Hero Frame */}
            <div className={styles.heroFrame}>
              <div className={styles.heroVignette} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbSrc} alt={event.eventName} onError={() => setThumbError(true)} className={styles.heroImage} />
            </div>

            {/* Header Info */}
            <div className={styles.headerInfo}>
              <div className={styles.ambientGlow} />
              
              <div className={styles.badgeRow}>
                <span className={`${styles.eventBadge} ${typeBadgeClass}`}>
                  {event.type}
                </span>
                <span className={`${styles.eventBadge} ${statusBadgeClass}`}>
                  {event.status}
                </span>
                {event.isOpenToAll && (
                  <span className={`${styles.eventBadge} ${styles.badgeStatusOngoing}`}>
                    OPEN TO ALL
                  </span>
                )}
              </div>
              
              <h1 className={styles.eventName}>{event.eventName}</h1>
              
              <div className={styles.metaRow}>
                <span className={styles.metaItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.metaIcon}>
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {tsToDateString(event.startDate)}
                </span>
                <span className={styles.metaItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.metaIcon}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" /><circle cx="12" cy="10" r="3" />
                  </svg>
                  {event.location}
                </span>
              </div>
            </div>

            {/* About */}
            <section className={styles.sectionBlock}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionTitleIndicator} />
                MISSION BRIEFING
              </h2>
              <p className={styles.aboutText}>{event.eventDescription}</p>
            </section>

            {/* Stats Grid */}
            <section className={styles.statsGrid}>
              <div className={styles.statBox}>
                <div className={styles.statLabel}>{isTeam ? 'TEAMS' : 'REGISTERED'}</div>
                <div className={styles.statValue}>{isTeam ? event.totalTeams : event.totalParticipants}</div>
                {event.maxParticipants > 0 && <div className={styles.statSub}>of {event.maxParticipants} max capacity</div>}
              </div>
              
              {isTeam && (
                <div className={styles.statBox}>
                  <div className={styles.statLabel}>TEAM SIZE</div>
                  <div className={styles.statValue}>
                    {event.minTeamMembers === event.maxTeamMembers ? event.minTeamMembers : `${event.minTeamMembers}-${event.maxTeamMembers}`}
                  </div>
                  <div className={styles.statSub}>members per team</div>
                </div>
              )}
              
              {hasPrize && (
                <div className={`${styles.statBox} ${styles.statBoxPrize}`}>
                  <div className={styles.statLabel}>PRIZE POOL</div>
                  <div className={`${styles.statValue} ${styles.statValuePrize}`}>
                    ₹{event.prizeMoney.toLocaleString('en-IN')}
                  </div>
                  <div className={styles.statSub}>
                    {event.prizeMoneyDistribution.firstPrize > 0 && <span>🥇 ₹{event.prizeMoneyDistribution.firstPrize.toLocaleString('en-IN')} </span>}
                    {event.prizeMoneyDistribution.secondPrize > 0 && <span>🥈 ₹{event.prizeMoneyDistribution.secondPrize.toLocaleString('en-IN')} </span>}
                    {event.prizeMoneyDistribution.thirdPrize > 0 && <span>🥉 ₹{event.prizeMoneyDistribution.thirdPrize.toLocaleString('en-IN')}</span>}
                  </div>
                </div>
              )}
            </section>

            {/* Topics */}
            {event.tags.length > 0 && (
              <section className={styles.sectionBlock}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.sectionTitleIndicator} />
                  PARAMETERS
                </h2>
                <div className={styles.topicsContainer}>
                  {event.tags.map((t) => (
                    <span key={t} className={styles.topicTag}>{t}</span>
                  ))}
                </div>
              </section>
            )}
            
          </div>

          {/* Right sidebar — Technical Console */}
          <aside className={styles.sidebar}>
            <div className={styles.consolePanel}>
              
              {/* Schedule */}
              <div className={styles.consoleRow}>
                <div className={styles.consoleLabel}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  T-MINUS
                </div>
                <div className="flex flex-col gap-4 mt-3">
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>START</div>
                    <div className={styles.consoleValue}>{tsToDateTime(event.startDate)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>END</div>
                    <div className={styles.consoleValue}>{tsToDateTime(event.endDate)}</div>
                  </div>
                </div>
              </div>
              
              {/* Venue */}
              <div className={styles.consoleRow}>
                <div className={styles.consoleLabel}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
                  </svg>
                  LOCATION
                </div>
                <div className={styles.consoleValue} style={{ marginTop: '8px' }}>{event.location}</div>
              </div>
              
              {/* Capacity */}
              {event.maxParticipants > 0 && (
                <div className={styles.consoleRow}>
                  <div className={styles.consoleLabel}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    CAPACITY
                  </div>
                  <div className={styles.capacityBarWrap}>
                    <div className={styles.capacityBarBg}>
                      <div 
                        className={styles.capacityBarFill} 
                        style={{ width: `${Math.min(100, (event.totalParticipants / event.maxParticipants) * 100)}%` }} 
                      />
                    </div>
                    <div className={styles.capacityLabel}>
                      {Math.max(0, event.maxParticipants - event.totalParticipants)} LEFT
                    </div>
                  </div>
                </div>
              )}
              
              {/* CTA */}
              <div style={{ marginTop: '24px' }}>
                <RegisterButton event={event} />
              </div>
            </div>
          </aside>

        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className={styles.mobileStickyBar}>
        <RegisterButton event={event} />
      </div>
    </div>
  );
}
