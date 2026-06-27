'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Event } from '@/schema/event';
import type { EventForm, FormField, DropdownField, CheckboxField, ParagraphField, AfterScreen } from '@/schema/form';
import { useAuth } from '@/lib/firebase';
import { EVENT_TYPES_WITHOUT_FORMS } from '@/config';
import { isValidRollNumber, ROLL_NUMBER_ERROR } from '@/lib/validators/rollNumber';

// ── Types ─────────────────────────────────────────────────────────────────────

type EventRow = Event & { id: string };

interface PageData {
  event: EventRow;
  form: EventForm | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tsToDate(ts: unknown): string {
  if (!ts || typeof ts !== 'object') return '';
  const s = Number((ts as Record<string, unknown>).seconds ?? (ts as Record<string, unknown>)._seconds);
  if (!s) return '';
  return new Date(s * 1000).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors';
const labelCls = 'block text-sm font-medium text-zinc-300 mb-1.5';
const selectCls = 'w-full bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors cursor-pointer';

// ── Render a paragraph (display-only) field ───────────────────────────────────

function ParagraphBlock({ field }: { field: ParagraphField }) {
  if (!field.content) return null;
  return (
    <div
      className="prose prose-invert prose-sm max-w-none text-zinc-300"
      dangerouslySetInnerHTML={{ __html: field.content }}
    />
  );
}

// ── Render a single dynamic field ─────────────────────────────────────────────

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string | string[];
  onChange: (val: string | string[]) => void;
}) {
  if (field.type === 'paragraph') {
    return <ParagraphBlock field={field} />;
  }

  if (field.type === 'dropdown') {
    return (
      <div>
        <label className={labelCls}>
          {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <select value={value as string} onChange={(e) => onChange(e.target.value)}
          required={field.required} className={selectCls}>
          <option value="">Select an option</option>
          {(field as DropdownField).options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'checkbox') {
    const checked = Array.isArray(value) ? value : [];
    const toggle = (opt: string) => {
      if (checked.includes(opt)) onChange(checked.filter((v) => v !== opt));
      else onChange([...checked, opt]);
    };
    return (
      <div>
        <label className={labelCls}>
          {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <div className="flex flex-col gap-2.5">
          {(field as CheckboxField).options.map((opt) => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer group">
              <button type="button" role="checkbox" aria-checked={checked.includes(opt)}
                onClick={() => toggle(opt)}
                className={`w-4 h-4 rounded border flex-shrink-0 transition-colors flex items-center justify-center ${
                  checked.includes(opt) ? 'bg-white border-white' : 'bg-transparent border-zinc-600 group-hover:border-zinc-400'
                }`}>
                {checked.includes(opt) && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <span className="text-sm text-zinc-300">{opt}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  const inputType = field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text';
  const placeholder =
    field.type === 'mobile' ? '10-digit mobile number'
    : field.type === 'rollNumber' ? 'e.g. U24CS089'
    : field.type === 'url' ? 'https://'
    : '';

  return (
    <div>
      <label className={labelCls}>
        {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input type={inputType} value={value as string}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required={field.required} className={inputCls} />
    </div>
  );
}


// ── After-screen (success page) ───────────────────────────────────────────────

function AfterScreenView({ afterScreen, eventName }: { afterScreen: AfterScreen | null | undefined; eventName: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-8">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-2">
          {afterScreen?.heading || "You're registered!"}
        </h2>
        {!afterScreen?.heading && (
          <p className="text-sm text-zinc-400">We&apos;ll see you at {eventName}.</p>
        )}
      </div>

      {afterScreen?.body && (
        <div
          className="prose prose-invert prose-sm max-w-lg w-full text-left"
          dangerouslySetInnerHTML={{ __html: afterScreen.body }}
        />
      )}

      <Link
        href="/events"
        className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
      >
        ← Back to events
      </Link>
    </div>
  );
}

// ── Team member row ───────────────────────────────────────────────────────────

interface MemberEntry {
  name: string;
  rollNumber: string;
  gender: string;
  userId: null;
}

// ── Main registration form ────────────────────────────────────────────────────

function RegistrationForm({ event, form }: { event: EventRow; form: EventForm | null }) {
  const { user } = useAuth();
  const isTeam = event.isTeamEvent;

  // Only include input fields (filter out paragraph display fields) sorted by order
  const inputFields = form
    ? [...form.fields]
        .sort((a, b) => a.order - b.order)
        .filter((f) => f.type !== 'paragraph')
    : [];

  // All fields sorted for rendering (includes paragraphs for display)
  const allFields = form
    ? [...form.fields].sort((a, b) => a.order - b.order)
    : [];

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  // extraFields state — keyed by field.id, only for input fields
  const [extraFields, setExtraFields] = useState<Record<string, string | string[]>>(
    Object.fromEntries(inputFields.map((f) => [f.id, f.type === 'checkbox' ? [] : '']))
  );

  // Individual registration state
  const [individual, setIndividual] = useState({ firstName: '', lastName: '', rollNumber: '', gender: '' });

  // Team registration state
  const defaultMember = (): MemberEntry => ({ name: '', rollNumber: '', gender: '', userId: null });
  // minTeamMembers / maxTeamMembers are TOTAL size including the leader.
  // The `members` array holds additional members only (leader is separate).
  const minMembers = Math.max(0, event.minTeamMembers - 1);
  const maxMembers = event.maxTeamMembers - 1;
  const [team, setTeam] = useState({
    teamName: '', leaderName: '', leaderRollNumber: '',
    members: Array.from({ length: minMembers }, defaultMember),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    // Client-side roll number format validation
    if (showDefaults) {
      if (!isTeam) {
        if (!isValidRollNumber(individual.rollNumber)) {
          setSubmitError(ROLL_NUMBER_ERROR);
          return;
        }
      } else {
        if (!isValidRollNumber(team.leaderRollNumber)) {
          setSubmitError(`Leader: ${ROLL_NUMBER_ERROR}`);
          return;
        }
        for (let i = 0; i < team.members.length; i++) {
          if (!isValidRollNumber(team.members[i].rollNumber)) {
            setSubmitError(`Member ${i + 1}: ${ROLL_NUMBER_ERROR}`);
            return;
          }
        }
      }
    }

    setSubmitting(true);

    try {
      const body: Record<string, unknown> = isTeam
        ? { ...team, extraFields }
        : { ...individual, extraFields };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (!event.unregisteredForm && user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/event/${event.slug}/form`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? `Error ${res.status}`); return; }
      setSuccess(true);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return <AfterScreenView afterScreen={form?.afterScreen} eventName={event.eventName} />;
  }

  const showDefaults = form?.includeDefaultFields === true;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Form header: title → description (thumbnail is in the page banner above) */}
      {form && (
        <div className="flex flex-col gap-3">
          {form.title && (
            <h2 className="text-xl font-bold text-white leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
              {form.title}
            </h2>
          )}
          {form.description && (
            <div
              className="prose prose-invert prose-sm max-w-none text-zinc-400"
              dangerouslySetInnerHTML={{ __html: form.description }}
            />
          )}
        </div>
      )}

      {/* Default individual fields — only when admin opted in */}
      {showDefaults && !isTeam && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>First name <span className="text-red-400">*</span></label>
              <input type="text" required value={individual.firstName}
                onChange={(e) => setIndividual((p) => ({ ...p, firstName: e.target.value }))}
                placeholder="First" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Last name <span className="text-red-400">*</span></label>
              <input type="text" required value={individual.lastName}
                onChange={(e) => setIndividual((p) => ({ ...p, lastName: e.target.value }))}
                placeholder="Last" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Roll number <span className="text-red-400">*</span></label>
            <input type="text" required value={individual.rollNumber}
              onChange={(e) => setIndividual((p) => ({ ...p, rollNumber: e.target.value }))}
              placeholder="e.g. U24CS089"
              pattern="[A-Za-z][0-9]{2}[A-Za-z]{2}[0-9]{3}"
              title={ROLL_NUMBER_ERROR}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Gender <span className="text-red-400">*</span></label>
            <select required value={individual.gender}
              onChange={(e) => setIndividual((p) => ({ ...p, gender: e.target.value }))}
              className={selectCls}>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      )}

      {/* Default team fields — only when admin opted in */}
      {showDefaults && isTeam && (
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>Team name <span className="text-red-400">*</span></label>
            <input type="text" required value={team.teamName}
              onChange={(e) => setTeam((p) => ({ ...p, teamName: e.target.value }))}
              placeholder="e.g. Team Sigma" className={inputCls} />
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Leader (you)</p>
            <div>
              <label className={labelCls}>Name <span className="text-red-400">*</span></label>
              <input type="text" required value={team.leaderName}
                onChange={(e) => setTeam((p) => ({ ...p, leaderName: e.target.value }))}
                placeholder="Full name" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Roll number <span className="text-red-400">*</span></label>
              <input type="text" required value={team.leaderRollNumber}
                onChange={(e) => setTeam((p) => ({ ...p, leaderRollNumber: e.target.value }))}
                placeholder="e.g. U24CS089"
                pattern="[A-Za-z][0-9]{2}[A-Za-z]{2}[0-9]{3}"
                title={ROLL_NUMBER_ERROR}
                className={inputCls} />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Team members ({team.members.length} additional · {team.members.length + 1} total incl. leader)
              </p>
              {team.members.length < maxMembers && (
                <button type="button"
                  onClick={() => setTeam((p) => ({ ...p, members: [...p.members, defaultMember()] }))}
                  className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add member
                </button>
              )}
            </div>
            {team.members.map((m, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-500">Member {i + 1}</span>
                  {team.members.length > minMembers && (
                    <button type="button"
                      onClick={() => setTeam((p) => ({ ...p, members: p.members.filter((_, idx) => idx !== i) }))}
                      className="text-zinc-600 hover:text-red-400 transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
                <input type="text" required value={m.name}
                  onChange={(e) => setTeam((p) => { const ms = [...p.members]; ms[i] = { ...ms[i], name: e.target.value }; return { ...p, members: ms }; })}
                  placeholder="Full name" className={inputCls} />
                <input type="text" required value={m.rollNumber}
                  onChange={(e) => setTeam((p) => { const ms = [...p.members]; ms[i] = { ...ms[i], rollNumber: e.target.value }; return { ...p, members: ms }; })}
                  placeholder="Roll number"
                  pattern="[A-Za-z][0-9]{2}[A-Za-z]{2}[0-9]{3}"
                  title={ROLL_NUMBER_ERROR}
                  className={inputCls} />
                <select required value={m.gender}
                  onChange={(e) => setTeam((p) => { const ms = [...p.members]; ms[i] = { ...ms[i], gender: e.target.value }; return { ...p, members: ms }; })}
                  className={selectCls}>
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom fields from form builder — always rendered, nothing else */}
      {allFields.length > 0 && (
        <div className="flex flex-col gap-5">
          {allFields.map((field) => (
            <DynamicField
              key={field.id}
              field={field}
              value={field.type === 'paragraph' ? '' : (extraFields[field.id] ?? (field.type === 'checkbox' ? [] : ''))}
              onChange={(val) => {
                if (field.type !== 'paragraph') {
                  setExtraFields((p) => ({ ...p, [field.id]: val }));
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {submitError && (
        <div className="px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-sm text-red-400">
          {submitError}
        </div>
      )}

      {/* Submit */}
      <button type="submit" disabled={submitting}
        className="w-full bg-white text-zinc-900 font-semibold py-3.5 rounded-xl text-sm hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        {submitting ? 'Submitting…' : isTeam ? 'Register Team' : 'Register'}
      </button>
    </form>
  );
}


// ── Already registered screen ─────────────────────────────────────────────────

function AlreadyRegistered({ event }: { event: EventRow }) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-8">
      <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">You&apos;re already registered</h2>
        <p className="text-sm text-zinc-400 max-w-xs">
          You have already signed up for <span className="text-zinc-200">{event.eventName}</span>. No need to register again.
        </p>
      </div>
      <Link
        href={`/events/${event.slug}`}
        className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
      >
        ← Back to event
      </Link>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 pt-[74px]">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
        <div className="h-3 w-32 rounded bg-zinc-800 animate-pulse mb-8" />
        <div className="space-y-4">
          <div className="h-7 w-2/3 rounded bg-zinc-800 animate-pulse" />
          <div className="h-4 w-full rounded bg-zinc-800/60 animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-zinc-800/60 animate-pulse" />
          <div className="h-10 rounded-lg bg-zinc-800/60 animate-pulse mt-2" />
          <div className="h-10 rounded-lg bg-zinc-800/60 animate-pulse" />
          <div className="h-10 rounded-lg bg-zinc-800/60 animate-pulse" />
          <div className="h-12 rounded-xl bg-zinc-800 animate-pulse mt-4" />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [statusChecking, setStatusChecking] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  // Load event + form
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/events/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error('Event not found');
        return r.json();
      })
      .then((d: PageData) => setData(d))
      .catch((e: Error) => setError(e.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Check registration status once auth resolves and event is loaded
  useEffect(() => {
    if (authLoading || !data || !user) return;
    // Only check for events that require auth (unregisteredForm=false)
    if (data.event.unregisteredForm) return;

    setStatusChecking(true);
    user.getIdToken()
      .then((token) =>
        fetch(`/api/event/${slug}/registration-status`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then((r) => r.json())
      .then((d: { registered?: boolean }) => {
        if (d.registered) setAlreadyRegistered(true);
      })
      .catch(() => { /* silently ignore — don't block the form */ })
      .finally(() => setStatusChecking(false));
  }, [authLoading, user, data, slug]);

  if (loading || authLoading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-[74px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-400 mb-4">{error || 'Event not found'}</p>
          <Link href="/events" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            ← Back to events
          </Link>
        </div>
      </div>
    );
  }

  const { event, form } = data;
  const isMeet = EVENT_TYPES_WITHOUT_FORMS.includes(event.type);
  const isFinished = event.status === 'finished';
  const formClosed = !event.isFormOpen;
  const thumbSrc = !thumbError && event.eventThumbnail ? event.eventThumbnail : null;
  const dateStr = tsToDate(event.startDate);

  // Gate: meets / no-form types have no registration
  if (isMeet) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-[74px] flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <p className="text-sm text-zinc-400 mb-4">This event does not have a registration form.</p>
          <Link href={`/events/${slug}`} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">← Back to event</Link>
        </div>
      </div>
    );
  }

  // Gate: form not open
  if (isFinished || formClosed) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-[74px] flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <p className="text-sm text-zinc-400 mb-1">
            {isFinished ? 'This event has ended.' : 'Registration is not open yet.'}
          </p>
          <p className="text-xs text-zinc-600 mb-4">Check back later or follow us for updates.</p>
          <Link href={`/events/${slug}`} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">← Back to event</Link>
        </div>
      </div>
    );
  }

  // Gate: form-capable event but no form built yet
  if (!form) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-[74px] flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <p className="text-sm text-zinc-400 mb-4">The registration form isn&apos;t ready yet.</p>
          <Link href={`/events/${slug}`} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">← Back to event</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 pt-[74px] pb-16">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-6">
          <Link href="/events" className="hover:text-zinc-300 transition-colors">Events</Link>
          <span>/</span>
          <Link href={`/events/${slug}`} className="hover:text-zinc-300 transition-colors truncate max-w-[8rem]">
            {event.eventName}
          </Link>
          <span>/</span>
          <span className="text-zinc-400">Register</span>
        </div>

        {/* Page header: title first, then full-width thumbnail below it */}
        <div className="mb-8 flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              {event.eventName}
            </h1>
            {dateStr && (
              <p className="text-xs text-zinc-500 mt-1.5">{dateStr} · {event.location}</p>
            )}
          </div>

          {/* Full-width thumbnail — below title, inside the content column */}
          {thumbSrc && (
            <div className="relative w-full rounded-2xl overflow-hidden bg-zinc-800" style={{ aspectRatio: '16 / 9' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbSrc}
                alt={event.eventName}
                onError={() => setThumbError(true)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
            </div>
          )}
        </div>

        {/* Status checking spinner */}
        {statusChecking ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
          </div>
        ) : alreadyRegistered ? (
          <AlreadyRegistered event={event} />
        ) : (
          <RegistrationForm event={event} form={form} />
        )}

      </div>
    </div>
  );
}
