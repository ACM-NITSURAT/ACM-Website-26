'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Event } from '@/schema/event';
import type { EventForm, FormField, DropdownField, CheckboxField, ParagraphField, AfterScreen } from '@/schema/form';
import { useAuth } from '@/lib/firebase';
import { EVENT_TYPES_WITHOUT_FORMS } from '@/config';
import {
  validateFormField,
  validateFirstName, validateLastName, validateDefaultRollNumber, validateGender,
  validateTeamName, validateLeaderName, validateLeaderRollNumber,
  validateMemberName, validateMemberRollNumber, validateMemberGender,
} from '@/lib/validators/form-fields';

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

import styles from './page.module.css';
import aboutStyles from '@/components/sections/AboutSection.module.css';
import FlashingGrid from '@/components/sections/FlashingGrid';

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls = styles.consoleInput;
const labelCls = styles.inputLabel;
const selectCls = styles.consoleInput + ' ' + styles.consoleSelect;

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
  const [touched, setTouched] = useState(false);
  const fieldError = touched ? validateFormField(field, value) : null;

  if (field.type === 'paragraph') {
    return <ParagraphBlock field={field} />;
  }

  if (field.type === 'dropdown') {
    return (
      <div>
        <label className={labelCls}>
          {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <select value={value as string}
          onChange={(e) => { onChange(e.target.value); setTouched(true); }}
          onBlur={() => setTouched(true)}
          required={field.required} className={`${selectCls} ${fieldError ? 'border-red-500/60' : ''}`}>
          <option value="">Select an option</option>
          {(field as DropdownField).options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {fieldError && <p className="mt-1 text-xs text-red-400">{fieldError}</p>}
      </div>
    );
  }

  if (field.type === 'checkbox') {
    const checked = Array.isArray(value) ? value : [];
    const toggle = (opt: string) => {
      setTouched(true);
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
            <label key={opt} className={styles.checkboxLabel}>
              <button type="button" role="checkbox" aria-checked={checked.includes(opt)}
                onClick={() => toggle(opt)}
                className={`${styles.checkboxBox} ${checked.includes(opt) ? styles.checkboxBoxActive : ''}`}>
                {checked.includes(opt) && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(139, 92, 246, 1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <span className={styles.checkboxText}>{opt}</span>
            </label>
          ))}
        </div>
        {fieldError && <p className="mt-1 text-xs text-red-400">{fieldError}</p>}
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
      <input
        type={inputType}
        value={value as string}
        onChange={(e) => { onChange(e.target.value); if (touched) setTouched(true); }}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        required={field.required}
        className={`${inputCls} ${fieldError ? 'border-red-500/60' : ''}`}
      />
      {fieldError && <p className="mt-1 text-xs text-red-400">{fieldError}</p>}
    </div>
  );
}


// ── After-screen (success page) ───────────────────────────────────────────────

function AfterScreenView({ afterScreen, eventName }: { afterScreen: AfterScreen | null | undefined; eventName: string }) {
  return (
    <div className={styles.statusPanel}>
      <div className={`${styles.statusIcon} ${styles.statusIconInfo}`} style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.1)', boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div>
        <h2 className={styles.statusTitle}>
          {afterScreen?.heading ? afterScreen.heading.toUpperCase() : "REGISTRATION SUCCESSFUL"}
        </h2>
        {!afterScreen?.heading && (
          <p className={styles.statusDesc}>Data transmission complete. See you at {eventName}.</p>
        )}
      </div>

      {afterScreen?.body && (
        <div
          className="prose prose-invert prose-sm max-w-lg w-full text-left font-mono"
          dangerouslySetInnerHTML={{ __html: afterScreen.body }}
        />
      )}

      <Link
        href="/events"
        className={styles.statusBtn}
      >
        RETURN TO INDEX
      </Link>
    </div>
  );
}

// ── Default individual fields ─────────────────────────────────────────────────

function DefaultIndividualFields({
  values,
  onChange,
}: {
  values: { firstName: string; lastName: string; rollNumber: string; gender: string };
  onChange: (field: string, val: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>First name <span className="text-red-400">*</span></label>
          <input type="text" required value={values.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            placeholder="First" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Last name <span className="text-red-400">*</span></label>
          <input type="text" required value={values.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            placeholder="Last" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Roll number <span className="text-red-400">*</span></label>
        <input type="text" required value={values.rollNumber}
          onChange={(e) => onChange('rollNumber', e.target.value)}
          placeholder="e.g. U24CS089" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Gender <span className="text-red-400">*</span></label>
        <select required value={values.gender}
          onChange={(e) => onChange('gender', e.target.value)}
          className={selectCls}>
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>
    </div>
  );
}

// ── Default team fields ───────────────────────────────────────────────────────

interface MemberEntry { name: string; rollNumber: string; gender: string; }

function DefaultTeamFields({
  event,
  teamValues,
  onTeamChange,
  members,
  onMembersChange,
}: {
  event: EventRow;
  teamValues: { teamName: string; leaderName: string; leaderRollNumber: string };
  onTeamChange: (field: string, val: string) => void;
  members: MemberEntry[];
  onMembersChange: (members: MemberEntry[]) => void;
}) {
  const minMembers = Math.max(0, event.minTeamMembers - 1);
  const maxMembers = event.maxTeamMembers - 1;
  const defaultMember = (): MemberEntry => ({ name: '', rollNumber: '', gender: '' });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={labelCls}>Team name <span className="text-red-400">*</span></label>
        <input type="text" required value={teamValues.teamName}
          onChange={(e) => onTeamChange('teamName', e.target.value)}
          placeholder="e.g. Team Sigma" className={inputCls} />
      </div>
      <div className="border border-white/10 bg-white/5 p-4 flex flex-col gap-3 rounded-[2px] mb-2">
        <p className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">Leader (you)</p>
        <div>
          <label className={labelCls}>Name <span className="text-red-400">*</span></label>
          <input type="text" required value={teamValues.leaderName}
            onChange={(e) => onTeamChange('leaderName', e.target.value)}
            placeholder="Full name" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Roll number <span className="text-red-400">*</span></label>
          <input type="text" required value={teamValues.leaderRollNumber}
            onChange={(e) => onTeamChange('leaderRollNumber', e.target.value)}
            placeholder="e.g. U24CS089" className={inputCls} />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between mb-2">
          <p className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
            Members ({members.length} additional · {members.length + 1} total incl. leader)
          </p>
          {members.length < maxMembers && (
            <button type="button"
              onClick={() => onMembersChange([...members, defaultMember()])}
              className="font-mono text-[10px] tracking-widest text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors uppercase">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              ADD MEMBER
            </button>
          )}
        </div>
        {members.map((m, i) => (
          <div key={i} className="border border-white/10 bg-white/5 p-4 flex flex-col gap-3 rounded-[2px] mb-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">MEMBER {i + 1}</span>
              {members.length > minMembers && (
                <button type="button"
                  onClick={() => onMembersChange(members.filter((_, idx) => idx !== i))}
                  className="text-zinc-600 hover:text-red-400 transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <input type="text" required value={m.name}
              onChange={(e) => { const ms = [...members]; ms[i] = { ...ms[i], name: e.target.value }; onMembersChange(ms); }}
              placeholder="Full name" className={inputCls} />
            <input type="text" required value={m.rollNumber}
              onChange={(e) => { const ms = [...members]; ms[i] = { ...ms[i], rollNumber: e.target.value }; onMembersChange(ms); }}
              placeholder="Roll number" className={inputCls} />
            <select required value={m.gender}
              onChange={(e) => { const ms = [...members]; ms[i] = { ...ms[i], gender: e.target.value }; onMembersChange(ms); }}
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
  );
}

// ── Main registration form ────────────────────────────────────────────────────

function RegistrationForm({ event, form }: { event: EventRow; form: EventForm | null }) {
  const { user } = useAuth();
  const isTeam = event.isTeamEvent;
  const showDefaults = form?.includeDefaultFields === true;

  const allFields = form
    ? [...form.fields].sort((a, b) => a.order - b.order)
    : [];
  const inputFields = allFields.filter((f) => f.type !== 'paragraph');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  // extraFields from custom form fields
  const [extraFields, setExtraFields] = useState<Record<string, string | string[]>>(
    Object.fromEntries(inputFields.map((f) => [f.id, f.type === 'checkbox' ? [] : '']))
  );

  // Default individual fields state (only used when showDefaults && !isTeam)
  const [individual, setIndividual] = useState({ firstName: '', lastName: '', rollNumber: '', gender: '' });

  // Default team fields state (only used when showDefaults && isTeam)
  const minMembers = Math.max(0, event.minTeamMembers - 1);
  const [teamValues, setTeamValues] = useState({ teamName: '', leaderName: '', leaderRollNumber: '' });
  const [members, setMembers] = useState<MemberEntry[]>(
    Array.from({ length: minMembers }, () => ({ name: '', rollNumber: '', gender: '' }))
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    // ── Client-side validation ────────────────────────────────────────────────

    // Validate custom form fields
    for (const field of inputFields) {
      const val = extraFields[field.id] ?? (field.type === 'checkbox' ? [] : '');
      const err = validateFormField(field, val);
      if (err) { setSubmitError(err); return; }
    }

    // Validate default fields when shown
    if (showDefaults) {
      if (!isTeam) {
        const checks = [
          validateFirstName(individual.firstName),
          validateLastName(individual.lastName),
          validateDefaultRollNumber(individual.rollNumber),
          validateGender(individual.gender),
        ];
        const err = checks.find(Boolean);
        if (err) { setSubmitError(err); return; }
      } else {
        const teamChecks = [
          validateTeamName(teamValues.teamName),
          validateLeaderName(teamValues.leaderName),
          validateLeaderRollNumber(teamValues.leaderRollNumber),
        ];
        const teamErr = teamChecks.find(Boolean);
        if (teamErr) { setSubmitError(teamErr); return; }
        for (let i = 0; i < members.length; i++) {
          const memberErr =
            validateMemberName(members[i].name, i) ||
            validateMemberRollNumber(members[i].rollNumber, i) ||
            validateMemberGender(members[i].gender, i);
          if (memberErr) { setSubmitError(memberErr); return; }
        }
      }
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { extraFields };

      // When default fields are ON, include them in the body too
      if (showDefaults) {
        if (!isTeam) {
          Object.assign(body, individual);
        } else {
          Object.assign(body, teamValues, { members });
        }
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (!event.unregisteredForm && user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/event/${event.slug}/form`, {
        method: 'POST', headers, body: JSON.stringify(body),
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

  return (
    <form onSubmit={handleSubmit} className={styles.formPanel}>
      {/* Form title + description */}
      {form && (
        <div className="flex flex-col gap-3">
          {form.title && (
            <h2 className={styles.formTitle}>
              <span className={styles.formTitleIndicator} />
              {form.title}
            </h2>
          )}
          {form.description && (
            <div className="prose prose-invert prose-sm max-w-none text-zinc-400"
              dangerouslySetInnerHTML={{ __html: form.description }} />
          )}
        </div>
      )}

      <div className="flex flex-col gap-6 mt-4">

      {/* Default identity fields — rendered only when admin opted in */}
      {showDefaults && !isTeam && (
        <DefaultIndividualFields
          values={individual}
          onChange={(field, val) => setIndividual((p) => ({ ...p, [field]: val }))}
        />
      )}
      {showDefaults && isTeam && (
        <DefaultTeamFields
          event={event}
          teamValues={teamValues}
          onTeamChange={(field, val) => setTeamValues((p) => ({ ...p, [field]: val }))}
          members={members}
          onMembersChange={setMembers}
        />
      )}

      {/* Custom form fields — exactly what the admin designed */}
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
      </div>

      {submitError && (
        <div className="px-4 py-3 mt-4 rounded border border-red-500/20 bg-red-500/10 text-xs font-mono text-red-400 uppercase tracking-widest">
          {submitError}
        </div>
      )}

      <button type="submit" disabled={submitting} className={styles.submitBtn}>
        <div className={styles.submitBtnScanline} />
        {submitting ? 'TRANSMITTING…' : 'INITIALIZE'}
      </button>
    </form>
  );
}


// ── Already registered screen ─────────────────────────────────────────────────

function AlreadyRegistered({ event }: { event: EventRow }) {
  return (
    <div className={styles.statusPanel}>
      <div className={`${styles.statusIcon} ${styles.statusIconInfo}`}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <div>
        <h2 className={styles.statusTitle}>REGISTRATION CONFIRMED</h2>
        <p className={styles.statusDesc}>
          You are already registered for <strong>{event.eventName}</strong>. No further action is required.
        </p>
      </div>
      <Link href={`/events/${event.slug}`} className={styles.statusBtn}>
        ABORT SEQUENCE
      </Link>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className={styles.wrapper}>
      <div className={aboutStyles.bgAtmosphere} aria-hidden="true">
        <div className={aboutStyles.bgGrid} />
        <FlashingGrid />
        <div className={aboutStyles.bgGlow1} />
        <div className={aboutStyles.bgGlow2} />
      </div>
      <div className={styles.inner}>
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
  const { user, role, loading: authLoading } = useAuth();

  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [statusChecking, setStatusChecking] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  // Debug: log auth state once it resolves
  useEffect(() => {
    if (authLoading) return;
    console.log('[RegisterPage] auth state:', {
      uid:   user?.uid ?? null,
      email: user?.email ?? null,
      role:  role ?? null,
      emailVerified: user?.emailVerified ?? null,
    });
  }, [authLoading, user, role]);

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
      <div className={styles.wrapper}>
        <div className={aboutStyles.bgAtmosphere} aria-hidden="true">
          <div className={aboutStyles.bgGrid} />
          <FlashingGrid />
          <div className={aboutStyles.bgGlow1} />
          <div className={aboutStyles.bgGlow2} />
        </div>
        <div className={styles.inner}>
          <div className={styles.statusPanel}>
            <div className={`${styles.statusIcon} ${styles.statusIconInfo}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <h2 className={styles.statusTitle}>REGISTRATION NOT APPLICABLE</h2>
              <p className={styles.statusDesc}>
                This event does not require a registration form.
              </p>
            </div>
            <Link href={`/events/${slug}`} className={styles.statusBtn}>
              RETURN TO EVENT
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Gate: form not open
  if (isFinished || formClosed) {
    return (
      <div className={styles.wrapper}>
        <div className={aboutStyles.bgAtmosphere} aria-hidden="true">
          <div className={aboutStyles.bgGrid} />
          <FlashingGrid />
          <div className={aboutStyles.bgGlow1} />
          <div className={aboutStyles.bgGlow2} />
        </div>
        <div className={styles.inner}>
          <div className={styles.statusPanel}>
            <div className={`${styles.statusIcon} ${styles.statusIconWarning}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h2 className={styles.statusTitle}>REGISTRATION CLOSED</h2>
              <p className={styles.statusDesc}>
                {isFinished ? 'This event has already concluded.' : 'Registration is not currently open.'} Check back later for updates.
              </p>
            </div>
            <Link href={`/events/${slug}`} className={styles.statusBtn}>
              RETURN TO EVENT
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Gate: form-capable event but no form built yet
  if (!form) {
    return (
      <div className={styles.wrapper}>
        <div className={aboutStyles.bgAtmosphere} aria-hidden="true">
          <div className={aboutStyles.bgGrid} />
          <FlashingGrid />
          <div className={aboutStyles.bgGlow1} />
          <div className={aboutStyles.bgGlow2} />
        </div>
        <div className={styles.inner}>
          <div className={styles.statusPanel}>
            <div className={`${styles.statusIcon} ${styles.statusIconInfo}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <h2 className={styles.statusTitle}>SYSTEM STANDBY</h2>
              <p className={styles.statusDesc}>
                The registration interface is currently being configured and is not yet available.
              </p>
            </div>
            <Link href={`/events/${slug}`} className={styles.statusBtn}>
              RETURN TO EVENT
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          <Link href={`/events/${slug}`} className={styles.breadcrumbLink}>
            {event.eventName}
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbCurrent}>REGISTER</span>
        </div>

        {/* Page header: title first, then full-width thumbnail below it */}
        <div className={styles.headerBlock}>
          <div>
            <h1 className={styles.heading}>
              {event.eventName}
            </h1>
            {dateStr && (
              <p className={styles.metaText}>{dateStr} · {event.location}</p>
            )}
          </div>

          {/* Full-width thumbnail — below title, inside the content column */}
          {thumbSrc && (
            <div className={styles.heroFrame}>
              <div className={styles.heroVignette} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbSrc}
                alt={event.eventName}
                onError={() => setThumbError(true)}
                className={styles.heroImage}
              />
            </div>
          )}
        </div>

        {/* Gate: invalid config — executives-only but anonymous form is logically broken */}
        {!event.isOpenToAll && event.unregisteredForm ? (
          <div className={styles.statusPanel}>
            <div className={`${styles.statusIcon} ${styles.statusIconWarning}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h2 className={styles.statusTitle}>SYSTEM ERROR: EVENT MISCONFIGURED</h2>
              <p className={styles.statusDesc}>
                This event has an invalid configuration. Please contact the administrator.
              </p>
            </div>
            <Link href={`/events/${slug}`} className={styles.statusBtn}>
              ABORT SEQUENCE
            </Link>
          </div>

        ) : /* Gate: auth required but user not logged in */ !event.unregisteredForm && !user ? (
          <div className={styles.statusPanel}>
            <div className={`${styles.statusIcon} ${styles.statusIconError}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h2 className={styles.statusTitle}>ACCESS DENIED: LOGIN REQUIRED</h2>
              <p className={styles.statusDesc}>
                This event requires a verified SVNIT account to register. Please log in to continue.
              </p>
            </div>
            <Link
              href={`/login?redirect=${encodeURIComponent(`/events/${slug}/register`)}`}
              className={styles.statusBtn} style={{ background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.4)', color: '#fff' }}
            >
              AUTHENTICATE NOW
            </Link>
            <Link href={`/events/${slug}`} className={styles.statusBtn}>
              ABORT SEQUENCE
            </Link>
          </div>

        ) : /* Gate: executives-only event but logged-in user is only a member */ !event.isOpenToAll && !event.unregisteredForm && role === 'member' ? (
          <div className={styles.statusPanel}>
            <div className={`${styles.statusIcon} ${styles.statusIconError}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" /><path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                <line x1="17" y1="11" x2="19" y2="13" /><line x1="19" y1="11" x2="17" y2="13" />
              </svg>
            </div>
            <div>
              <h2 className={styles.statusTitle}>ACCESS DENIED: INSUFFICIENT CLEARANCE</h2>
              <p className={styles.statusDesc}>
                This event is restricted to executives and above. Your current account lacks the required clearance level.
              </p>
            </div>
            <Link href={`/events/${slug}`} className={styles.statusBtn}>
              ABORT SEQUENCE
            </Link>
          </div>

        ) : statusChecking ? (
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
