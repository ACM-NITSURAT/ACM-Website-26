'use client';

/**
 * Shared event form — used by both Create and Edit pages.
 * Receives initial data and an onSubmit handler; handles all state internally.
 */

import { useState, useRef } from 'react';
import Link from 'next/link';
import type { Event } from '@/schema/event';
import { EVENT_THUMBNAIL_WIDTH, EVENT_THUMBNAIL_HEIGHT } from '@/config';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function toSlug(str: string) {
  return str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
}

export function randomSlug() {
  return Math.random().toString(36).slice(2, 10);
}

export function toFirestoreTimestamp(local: string) {
  if (!local) return null;
  return { seconds: Math.floor(new Date(local).getTime() / 1000), nanoseconds: 0 };
}

/** Convert Firestore timestamp to datetime-local string for input */
export function tsToLocal(ts: unknown): string {
  if (!ts || typeof ts !== 'object') return '';
  const t = ts as Record<string, unknown>;
  const s = Number(t.seconds ?? t._seconds);
  if (!s) return '';
  const d = new Date(s * 1000);
  // datetime-local format: "YYYY-MM-DDTHH:mm"
  return d.toISOString().slice(0, 16);
}

// ── Primitives ────────────────────────────────────────────────────────────────

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-zinc-300">{label}</label>
      {children}
      {error  && <p className="text-xs text-red-400">{error}</p>}
      {!error && hint && <p className="text-xs text-zinc-600">{hint}</p>}
    </div>
  );
}

export const inputCls    = 'bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-colors';
export const inputErrCls = 'bg-zinc-900 border border-red-500/50 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-colors';
export const selectCls   = `${inputCls} cursor-pointer`;

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mt-2">
      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest whitespace-nowrap">{children}</span>
      <span className="flex-1 h-px bg-zinc-800" />
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-zinc-500 ${checked ? 'bg-white' : 'bg-zinc-700'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-150 ${checked ? 'translate-x-4 bg-zinc-900' : 'translate-x-0 bg-zinc-400'}`} />
      </button>
      <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">{label}</span>
    </label>
  );
}

// ── Form data type & validation ───────────────────────────────────────────────

export type FormData = {
  eventName: string;
  eventDescription: string;
  slug: string;
  useRandomSlug: boolean;
  type: Event['type'];
  status: Event['status'];
  location: string;
  eventThumbnail: string;
  tags: string;
  isOpenToAll: boolean;
  unregisteredForm: boolean;
  maxParticipants: string;
  startDate: string;
  endDate: string;
  isTeamEvent: boolean;
  minTeamMembers: string;
  maxTeamMembers: string;
  isFemaleMandatory: boolean;
  minFemaleRequired: string;
  prizeMoney: string;
  firstPrize: string;
  secondPrize: string;
  thirdPrize: string;
};

export const FORM_DEFAULT: FormData = {
  eventName: '', eventDescription: '', slug: '', useRandomSlug: false,
  type: 'event', status: 'upcoming', location: '', eventThumbnail: '', tags: '',
  isOpenToAll: false, unregisteredForm: false, maxParticipants: '0',
  startDate: '', endDate: '',
  isTeamEvent: false, minTeamMembers: '2', maxTeamMembers: '4',
  isFemaleMandatory: false, minFemaleRequired: '1',
  prizeMoney: '0', firstPrize: '0', secondPrize: '0', thirdPrize: '0',
};

export type FieldErrors = Partial<Record<keyof FormData | '_global', string>>;

export function validateForm(form: FormData): FieldErrors {
  const errors: FieldErrors = {};
  const now = Date.now() / 1000;
  const start = form.startDate ? Math.floor(new Date(form.startDate).getTime() / 1000) : null;
  const end   = form.endDate   ? Math.floor(new Date(form.endDate).getTime()   / 1000) : null;

  if (start !== null && end !== null && end <= start)
    errors.endDate = 'End date must be after start date.';
  if (form.status === 'upcoming' && start !== null && start <= now)
    errors.startDate = 'An upcoming event must start in the future.';
  if (form.status === 'ongoing') {
    if (start !== null && start > now) errors.startDate = 'An ongoing event must have already started.';
    if (end   !== null && end  <= now) errors.endDate   = 'An ongoing event must not have ended yet.';
  }
  if (form.status === 'finished' && end !== null && end > now)
    errors.endDate = 'A finished event must have an end date in the past.';

  const total = parseInt(form.prizeMoney, 10) || 0;
  if (total > 0) {
    const sum = (parseInt(form.firstPrize, 10) || 0) + (parseInt(form.secondPrize, 10) || 0) + (parseInt(form.thirdPrize, 10) || 0);
    if (sum > total) errors.firstPrize = `Distribution (₹${sum}) exceeds pool (₹${total}).`;
  }

  if (form.isTeamEvent) {
    const min = parseInt(form.minTeamMembers, 10) || 1;
    const max = parseInt(form.maxTeamMembers, 10) || 1;
    if (min > max) errors.minTeamMembers = 'Min members cannot exceed max.';
    if (form.isFemaleMandatory) {
      const minF = parseInt(form.minFemaleRequired, 10) || 0;
      if (minF > max) errors.minFemaleRequired = 'Min female required exceeds max team size.';
    }
  }
  return errors;
}

/** Build the API payload from form state */
export function buildPayload(form: FormData): Partial<Event> & { slug?: string } {
  return {
    eventName:          form.eventName,
    eventDescription:   form.eventDescription,
    slug:               form.slug || undefined,
    type:               form.type,
    status:             form.status,
    location:           form.location,
    eventThumbnail:     form.eventThumbnail,
    tags:               form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    isOpenToAll:        form.isOpenToAll,
    unregisteredForm:   form.unregisteredForm,
    maxParticipants:    parseInt(form.maxParticipants, 10) || 0,
    startDate:          toFirestoreTimestamp(form.startDate) as unknown as Event['startDate'],
    endDate:            toFirestoreTimestamp(form.endDate)   as unknown as Event['endDate'],
    isTeamEvent:        form.isTeamEvent,
    minTeamMembers:     parseInt(form.minTeamMembers, 10) || 1,
    maxTeamMembers:     parseInt(form.maxTeamMembers, 10) || 1,
    isFemaleMandatory:  form.isFemaleMandatory,
    minFemaleRequired:  parseInt(form.minFemaleRequired, 10) || 0,
    prizeMoney:         parseInt(form.prizeMoney, 10) || 0,
    prizeMoneyDistribution: {
      firstPrize:  parseInt(form.firstPrize, 10) || 0,
      secondPrize: parseInt(form.secondPrize, 10) || 0,
      thirdPrize:  parseInt(form.thirdPrize, 10) || 0,
    },
  };
}

// ── EventForm component ───────────────────────────────────────────────────────

interface EventFormProps {
  /** Pre-fill values (edit mode). Leave undefined for create mode. */
  initial?: Partial<FormData>;
  /** Label on the submit button */
  submitLabel: string;
  /** Called with the validated payload; should throw on API error */
  onSubmit: (payload: ReturnType<typeof buildPayload>) => Promise<void>;
  cancelHref: string;
}

export default function EventForm({ initial, submitLabel, onSubmit, cancelHref }: EventFormProps) {
  const [form, setForm] = useState<FormData>({ ...FORM_DEFAULT, ...initial });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [thumbnailError, setThumbnailError] = useState(false);
  const slugManuallyEdited = useRef(!!initial?.slug);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'eventName' && !slugManuallyEdited.current && !prev.useRandomSlug)
        next.slug = toSlug(value as string);
      if (key === 'useRandomSlug' && value === true) { next.slug = randomSlug(); slugManuallyEdited.current = false; }
      if (key === 'useRandomSlug' && value === false) { next.slug = toSlug(prev.eventName); slugManuallyEdited.current = false; }
      return next;
    });
    setFieldErrors((prev) => { const n = { ...prev }; delete n[key as keyof typeof prev]; return n; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setSubmitting(true);
    try {
      await onSubmit(buildPayload(form));
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  const prizeTotal     = parseInt(form.prizeMoney, 10) || 0;
  const prizeSum       = (parseInt(form.firstPrize, 10) || 0) + (parseInt(form.secondPrize, 10) || 0) + (parseInt(form.thirdPrize, 10) || 0);
  const prizeRemaining = prizeTotal - prizeSum;

  // Thumbnail preview src — fall back to placeholder on error
  const thumbSrc = (!thumbnailError && form.eventThumbnail) ? form.eventThumbnail : '/event-placeholder.jpg';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* ── Basic info ── */}
      <SectionHeading>Basic info</SectionHeading>

      <Field label="Event name *" error={fieldErrors.eventName}>
        <input type="text" required value={form.eventName}
          onChange={(e) => set('eventName', e.target.value)}
          className={fieldErrors.eventName ? inputErrCls : inputCls}
          placeholder="e.g. Hackathon 2025" />
      </Field>

      <Field label="Slug" hint="Used in event URLs. Auto-generated from name.">
        <div className={`flex rounded-md border overflow-hidden focus-within:ring-1 focus-within:ring-zinc-600 ${fieldErrors.slug ? 'border-red-500/50' : 'border-zinc-700'}`}>
          <span className="px-3 py-2 text-sm text-zinc-500 bg-zinc-800 border-r border-zinc-700 flex-shrink-0 select-none">/events/</span>
          <input type="text" value={form.slug} disabled={form.useRandomSlug}
            onChange={(e) => { slugManuallyEdited.current = true; set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
            className={`flex-1 px-3 py-2 text-sm focus:outline-none ${form.useRandomSlug ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-zinc-900 text-white placeholder:text-zinc-600'}`}
            placeholder="auto-filled-from-name" />
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <Toggle checked={form.useRandomSlug} onChange={(v) => set('useRandomSlug', v)} label="Use random slug" />
          {form.useRandomSlug && (
            <button type="button" onClick={() => setForm((p) => ({ ...p, slug: randomSlug() }))}
              className="ml-auto text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Regenerate</button>
          )}
        </div>
      </Field>

      <Field label="Description *" error={fieldErrors.eventDescription}>
        <textarea required rows={4} value={form.eventDescription}
          onChange={(e) => set('eventDescription', e.target.value)}
          className={`${fieldErrors.eventDescription ? inputErrCls : inputCls} resize-none`}
          placeholder="Describe the event…" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Type *">
          <select value={form.type} onChange={(e) => set('type', e.target.value as Event['type'])} className={selectCls}>
            <option value="event">Event</option>
            <option value="workshop">Workshop</option>
            <option value="meet">Meet</option>
          </select>
        </Field>
        <Field label="Status"
          hint={form.status === 'upcoming' ? 'Start date must be in the future'
            : form.status === 'ongoing' ? 'Start in past, end in future' : 'End date must be in the past'}>
          <select value={form.status} onChange={(e) => set('status', e.target.value as Event['status'])} className={selectCls}>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="finished">Finished</option>
          </select>
        </Field>
      </div>

      <Field label="Location *" hint='e.g. "Main Audi", "Online", "CS Seminar Hall"'>
        <input type="text" required value={form.location}
          onChange={(e) => set('location', e.target.value)}
          className={inputCls} placeholder="Location" />
      </Field>

      <Field
        label={`Thumbnail URL`}
        hint={`Direct image URL. Rendered at ${EVENT_THUMBNAIL_WIDTH}×${EVENT_THUMBNAIL_HEIGHT}px (16:9, object-cover). Falls back to placeholder if empty or unreachable.`}
      >
        <input type="url" value={form.eventThumbnail}
          onChange={(e) => { set('eventThumbnail', e.target.value); setThumbnailError(false); }}
          className={inputCls} placeholder="https://..." />
        {/* Live thumbnail preview */}
        <div className="mt-2 rounded-md overflow-hidden border border-zinc-800 bg-zinc-900"
          style={{ aspectRatio: `${EVENT_THUMBNAIL_WIDTH} / ${EVENT_THUMBNAIL_HEIGHT}`, maxWidth: 400 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbSrc}
            alt="Thumbnail preview"
            onError={() => setThumbnailError(true)}
            className="w-full h-full object-cover"
          />
        </div>
        {thumbnailError && form.eventThumbnail && (
          <p className="text-xs text-amber-500">URL unreachable — showing placeholder.</p>
        )}
      </Field>

      <Field label="Tags" hint="Comma-separated. e.g. AI, Web3, CP">
        <input type="text" value={form.tags}
          onChange={(e) => set('tags', e.target.value)}
          className={inputCls} placeholder="AI, Web3, DevOps" />
      </Field>

      {/* ── Schedule ── */}
      <SectionHeading>Schedule</SectionHeading>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date & time *" error={fieldErrors.startDate}>
          <input type="datetime-local" required value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)}
            className={fieldErrors.startDate ? inputErrCls : inputCls} />
        </Field>
        <Field label="End date & time *" error={fieldErrors.endDate}>
          <input type="datetime-local" required value={form.endDate}
            min={form.startDate || undefined}
            onChange={(e) => set('endDate', e.target.value)}
            className={fieldErrors.endDate ? inputErrCls : inputCls} />
        </Field>
      </div>

      {/* ── Registration ── */}
      <SectionHeading>Registration</SectionHeading>

      <Field label="Max participants" hint="Set to 0 for unlimited.">
        <input type="number" min={0} value={form.maxParticipants}
          onChange={(e) => set('maxParticipants', e.target.value)} className={inputCls} />
      </Field>

      <div className="flex flex-col gap-3">
        <Toggle checked={form.isOpenToAll} onChange={(v) => set('isOpenToAll', v)} label="Open to all (non-ACM members can register)" />
        <Toggle checked={form.unregisteredForm} onChange={(v) => set('unregisteredForm', v)} label="Allow unregistered participants (external form)" />
      </div>

      {/* ── Team settings ── */}
      <SectionHeading>Team settings</SectionHeading>

      <Toggle checked={form.isTeamEvent} onChange={(v) => set('isTeamEvent', v)} label="Team-based event" />

      {form.isTeamEvent && (
        <div className="grid grid-cols-2 gap-4 mt-1">
          <Field label="Min team members" error={fieldErrors.minTeamMembers}>
            <input type="number" min={1} value={form.minTeamMembers}
              onChange={(e) => set('minTeamMembers', e.target.value)}
              className={fieldErrors.minTeamMembers ? inputErrCls : inputCls} />
          </Field>
          <Field label="Max team members">
            <input type="number" min={1} value={form.maxTeamMembers}
              onChange={(e) => set('maxTeamMembers', e.target.value)} className={inputCls} />
          </Field>
        </div>
      )}

      {/* ── Diversity ── */}
      <SectionHeading>Diversity</SectionHeading>

      <Toggle checked={form.isFemaleMandatory} onChange={(v) => set('isFemaleMandatory', v)} label="Require at least one female member per team" />

      {form.isFemaleMandatory && (
        <Field label="Minimum female members required" error={fieldErrors.minFemaleRequired}>
          <input type="number" min={1} value={form.minFemaleRequired}
            onChange={(e) => set('minFemaleRequired', e.target.value)}
            className={`${fieldErrors.minFemaleRequired ? inputErrCls : inputCls} mt-1`} />
        </Field>
      )}

      {/* ── Prizes ── */}
      <SectionHeading>Prizes</SectionHeading>

      <Field label="Total prize pool (₹)" hint="Set to 0 if no prize money.">
        <input type="number" min={0} value={form.prizeMoney}
          onChange={(e) => set('prizeMoney', e.target.value)} className={inputCls} />
      </Field>

      {prizeTotal > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Field label="🥇 1st prize (₹)" error={fieldErrors.firstPrize}>
              <input type="number" min={0} value={form.firstPrize}
                onChange={(e) => set('firstPrize', e.target.value)}
                className={fieldErrors.firstPrize ? inputErrCls : inputCls} />
            </Field>
            <Field label="🥈 2nd prize (₹)">
              <input type="number" min={0} value={form.secondPrize}
                onChange={(e) => set('secondPrize', e.target.value)} className={inputCls} />
            </Field>
            <Field label="🥉 3rd prize (₹)">
              <input type="number" min={0} value={form.thirdPrize}
                onChange={(e) => set('thirdPrize', e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className={`flex items-center justify-between px-3 py-2 rounded-md text-xs border ${prizeRemaining < 0 ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-zinc-800 bg-zinc-900 text-zinc-400'}`}>
            <span>Distributed: ₹{prizeSum}</span>
            <span className={prizeRemaining < 0 ? 'text-red-400 font-medium' : 'text-zinc-500'}>
              {prizeRemaining >= 0 ? `₹${prizeRemaining} remaining` : `₹${Math.abs(prizeRemaining)} over budget`}
            </span>
          </div>
        </>
      )}

      {/* ── Submit ── */}
      {serverError && (
        <div className="px-4 py-3 rounded-md border border-red-500/20 bg-red-500/10 text-sm text-red-400">
          {serverError}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-zinc-800 mt-2">
        <button type="submit" disabled={submitting}
          className="bg-white text-zinc-900 rounded-md px-5 py-2 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {submitting ? 'Saving…' : submitLabel}
        </button>
        <Link href={cancelHref} className="px-5 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
          Cancel
        </Link>
      </div>

    </form>
  );
}
