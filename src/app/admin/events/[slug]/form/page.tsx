'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getEvent, getForm, saveForm } from '@/lib/firebase/admin-api';
import type { Event } from '@/schema/event';
import type { FormField, FormFieldType, DropdownField, CheckboxField } from '@/schema/form';
import { EVENT_THUMBNAIL_ASPECT_RATIO, FORM_INTELLIGENT_MODE } from '@/config';

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return crypto.randomUUID();
}

function makeField(type: FormFieldType, order: number): FormField {
  const base = { id: uid(), label: '', required: false, order };
  if (type === 'dropdown') return { ...base, type, options: [''] };
  if (type === 'checkbox') return { ...base, type, options: [''] };
  return { ...base, type } as FormField;
}

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text:        'Short text',
  email:       'Email address',
  mobile:      'Mobile number',
  rollNumber:  'Roll number',
  url:         'URL',
  dropdown:    'Dropdown',
  checkbox:    'Checkboxes',
};

const FIELD_TYPE_ICONS: Record<FormFieldType, string> = {
  text:       'T',
  email:      '@',
  mobile:     '📱',
  rollNumber: '#',
  url:        '🔗',
  dropdown:   '▾',
  checkbox:   '☑',
};

// ── Smart type inference from label ──────────────────────────────────────────

const TYPE_HINTS: { words: string[]; type: FormFieldType }[] = [
  { words: ['email'],                          type: 'email' },
  { words: ['roll', 'admission'],              type: 'rollNumber' },
  { words: ['url', 'link', 'website', 'portfolio', 'github', 'linkedin'], type: 'url' },
  { words: ['mobile', 'phone', 'contact'],     type: 'mobile' },
];

function inferType(label: string, currentType: FormFieldType): FormFieldType {
  if (!FORM_INTELLIGENT_MODE) return currentType;
  const words = label.trim().split(/\s+/);
  if (words.length > 4) return currentType; // revert to user's set type beyond 4 words
  const lower = label.toLowerCase();
  const matches = TYPE_HINTS.filter((h) => h.words.some((w) => lower.includes(w)));
  if (matches.length !== 1) return currentType; // 0 or 2+ matches → revert to current
  return matches[0].type;
}

const inputCls = 'bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors w-full';
const ALL_TYPES = Object.keys(FIELD_TYPE_LABELS) as FormFieldType[];

interface FieldCardProps {
  field: FormField;
  isDuplicate: boolean;
  autoFocus?: boolean;
  onChange: (updated: FormField) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function FieldCard({ field, isDuplicate, autoFocus, onChange, onDuplicate, onDelete }: FieldCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function updateLabel(label: string) {
    const inferredType = inferType(label, field.type);
    if (inferredType !== field.type) {
      // Type changed — reset type-specific data but keep label
      const base = { id: field.id, label, required: field.required, order: field.order };
      let updated: FormField;
      if (inferredType === 'dropdown') updated = { ...base, type: 'dropdown', options: [''] };
      else if (inferredType === 'checkbox') updated = { ...base, type: 'checkbox', options: [''] };
      else updated = { ...base, type: inferredType } as FormField;
      onChange(updated);
    } else {
      onChange({ ...field, label });
    }
  }
  function toggleRequired() { onChange({ ...field, required: !field.required }); }
  function changeType(type: FormFieldType) {
    // Preserve the existing id and label — only reset type-specific fields
    const base = { id: field.id, label: field.label, required: field.required, order: field.order };
    let updated: FormField;
    if (type === 'dropdown') updated = { ...base, type, options: [''] };
    else if (type === 'checkbox') updated = { ...base, type, options: [''] };
    else updated = { ...base, type } as FormField;
    onChange(updated);
  }

  function updateOption(i: number, val: string) {
    if (field.type !== 'dropdown' && field.type !== 'checkbox') return;
    const options = [...field.options];
    options[i] = val;
    onChange({ ...field, options } as FormField);
  }
  function addOption() {
    if (field.type !== 'dropdown' && field.type !== 'checkbox') return;
    onChange({ ...field, options: [...field.options, ''] } as FormField);
  }
  function removeOption(i: number) {
    if (field.type !== 'dropdown' && field.type !== 'checkbox') return;
    const options = field.options.filter((_, idx) => idx !== i);
    onChange({ ...field, options } as FormField);
  }

  return (
    <div ref={setNodeRef} style={style}
      className={`rounded-xl border bg-zinc-900 transition-colors ${isDuplicate ? 'border-amber-500/40' : 'border-zinc-800'}`}>
      {/* Card header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-zinc-800">
        {/* Drag handle */}
        <button {...attributes} {...listeners} type="button"
          className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-white transition-colors flex-shrink-0 p-1 -ml-1"
          aria-label="Drag to reorder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="5" r="1" fill="currentColor" stroke="none" />
            <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="9" cy="19" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="5" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="19" r="1" fill="currentColor" stroke="none" />
          </svg>
        </button>

        {/* Label input */}
        <input type="text" value={field.label} onChange={(e) => updateLabel(e.target.value)}
          placeholder="Question" autoFocus={autoFocus}
          className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none min-w-0" />

        {/* Type selector */}
        <select value={field.type} onChange={(e) => changeType(e.target.value as FormFieldType)}
          className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 flex-shrink-0 cursor-pointer">
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* Options editor for dropdown / checkbox */}
      {(field.type === 'dropdown' || field.type === 'checkbox') && (
        <div className="px-4 py-3 border-b border-zinc-800 flex flex-col gap-2">
          {(field as DropdownField | CheckboxField).options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-zinc-600 w-4 text-right flex-shrink-0">{i + 1}.</span>
              <input type="text" value={opt} placeholder={`Option ${i + 1}`}
                onChange={(e) => updateOption(i, e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600" />
              {(field as DropdownField | CheckboxField).options.length > 1 && (
                <button type="button" onClick={() => removeOption(i)}
                  className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addOption}
            className="self-start flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add option
          </button>
        </div>
      )}

      {/* Card footer: required toggle + actions */}
      <div className="flex items-center justify-between px-4 py-2.5">
        {isDuplicate && (
          <span className="text-xs text-amber-500 mr-auto">Duplicate label</span>
        )}
        <div className="flex items-center gap-4 ml-auto">
          {/* Required toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">Required</span>
            <button type="button" role="switch" aria-checked={field.required} onClick={toggleRequired}
              className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 focus:outline-none ${field.required ? 'bg-white' : 'bg-zinc-700'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${field.required ? 'translate-x-4 bg-zinc-900' : 'translate-x-0 bg-zinc-400'}`} />
            </button>
          </label>
          {/* Divider */}
          <span className="w-px h-4 bg-zinc-700" />
          {/* Duplicate */}
          <button type="button" onClick={onDuplicate} title="Duplicate"
            className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          {/* Delete */}
          <button type="button" onClick={onDelete} title="Delete"
            className="text-zinc-500 hover:text-red-400 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add field button ──────────────────────────────────────────────────────────

function AddFieldButton({ onAdd }: { onAdd: () => void }) {
  return (
    <button type="button" onClick={onAdd}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-zinc-700 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/60 transition-all w-full justify-center">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Add question
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FormBuilderPage() {
  const params = useParams();
  const slug   = params?.slug as string;
  const router = useRouter();

  const [event, setEvent]       = useState<(Event & { id: string }) | null>(null);
  const [fields, setFields]     = useState<FormField[]>([]);
  const [title, setTitle]       = useState('');
  const [description, setDesc]  = useState('');
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isDirty, setIsDirty]   = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [newestFieldId, setNewestFieldId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ── Load event + existing form ──────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    Promise.all([
      getEvent(slug),
      getForm(slug).catch(() => null),
    ]).then(([ev, form]) => {
      setEvent(ev);
      setTitle(form?.title ?? ev.eventName);
      setDesc(form?.description ?? '');
      if (form?.fields?.length) {
        setFields([...form.fields].sort((a, b) => a.order - b.order));
      }
    }).catch((e) => setLoadError(e.message ?? 'Failed to load.'));
  }, [slug]);

  // ── Unsaved changes warning ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  function markDirty() { setIsDirty(true); setSaveError(''); }

  // ── Field operations ────────────────────────────────────────────────────────
  const addField = useCallback(() => {
    const newField = makeField('text', 0); // always text, order set below
    setFields((prev) => [...prev, { ...newField, order: prev.length }]);
    setNewestFieldId(newField.id);
    markDirty();
  }, []);

  const updateField = useCallback((updated: FormField) => {
    setFields((prev) => prev.map((f) => f.id === updated.id ? updated : f));
    setNewestFieldId(null); // clear autofocus once user interacts
    markDirty();
  }, []);

  const duplicateField = useCallback((id: string) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], id: uid(), order: prev[idx].order + 0.5 };
      const next = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
      return next.map((f, i) => ({ ...f, order: i }));
    });
    markDirty();
  }, []);

  const deleteField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id).map((f, i) => ({ ...f, order: i })));
    markDirty();
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFields((prev) => {
        const oldIndex = prev.findIndex((f) => f.id === active.id);
        const newIndex = prev.findIndex((f) => f.id === over.id);
        return arrayMove(prev, oldIndex, newIndex).map((f, i) => ({ ...f, order: i }));
      });
      markDirty();
    }
  }

  // ── Duplicate label detection ───────────────────────────────────────────────
  const duplicateIds = (() => {
    const seen = new Map<string, number>();
    fields.forEach((f) => {
      const key = f.label.trim().toLowerCase();
      if (!key) return;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    });
    return new Set(
      fields
        .filter((f) => {
          const key = f.label.trim().toLowerCase();
          return key && (seen.get(key) ?? 0) > 1;
        })
        .map((f) => f.id),
    );
  })();

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaveError('');
    // Client-side quick checks before hitting the API
    if (!title.trim()) { setSaveError('Form title is required.'); return; }
    if (fields.length === 0) { setSaveError('Add at least one field before saving.'); return; }
    if (!fields.some((f) => f.required)) { setSaveError('At least one field must be marked as required.'); return; }
    if (duplicateIds.size > 0) { setSaveError('Fix duplicate field labels before saving.'); return; }
    const emptyLabel = fields.find((f) => !f.label.trim());
    if (emptyLabel) { setSaveError('All fields must have a label.'); return; }
    const emptyOptions = fields.find(
      (f) => (f.type === 'dropdown' || f.type === 'checkbox') &&
             (f as DropdownField | CheckboxField).options.some((o) => !o.trim()),
    );
    if (emptyOptions) { setSaveError(`"${emptyOptions.label || 'A field'}" has empty options.`); return; }

    setSaving(true);
    try {
      await saveForm(slug, { title: title.trim(), description: description.trim(), fields });
      setIsDirty(false);
      // Refresh event data so hasForm updates in local state
      const updated = await getEvent(slug);
      setEvent(updated);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save form.');
    } finally {
      setSaving(false);
    }
  }

  // ── Guard: navigate away with unsaved changes ───────────────────────────────
  function handleBackClick(e: React.MouseEvent) {
    if (isDirty && !confirm('You have unsaved changes. Leave without saving?')) {
      e.preventDefault();
    }
  }

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loadError) return (
    <div className="p-8">
      <p className="text-sm text-red-400 mb-4">{loadError}</p>
      <Link href={`/admin/events/${slug}`} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">← Back to event</Link>
    </div>
  );

  if (!event) return (
    <div className="p-8 space-y-4">
      <div className="h-4 w-40 rounded bg-zinc-800 animate-pulse" />
      <div className="h-32 rounded-xl bg-zinc-800/50 animate-pulse" />
      <div className="h-24 rounded-xl bg-zinc-800/50 animate-pulse" />
    </div>
  );

  const thumbSrc = (!thumbError && event.eventThumbnail) ? event.eventThumbnail : '/event-placeholder.jpg';

  return (
    <div className="min-h-full bg-zinc-950">

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-20 bg-zinc-950 border-b border-zinc-800 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/admin/events/${slug}`} onClick={handleBackClick}
            className="text-zinc-500 hover:text-zinc-200 transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 truncate">
              {event.hasForm ? 'Edit form' : 'Create form'} · {event.eventName}
            </p>
          </div>
          {isDirty && !saveError && <span className="text-xs text-amber-500 flex-shrink-0">Unsaved changes</span>}
          {saveError && (
            <span className="text-xs text-red-400 flex-shrink-0 max-w-xs truncate" title={saveError}>
              ⚠ {saveError}
            </span>
          )}
        </div>
        <button onClick={handleSave} disabled={saving || duplicateIds.size > 0 || (!isDirty && !saveError)}
          className={`flex-shrink-0 flex items-center gap-2 rounded-md px-5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
            !isDirty && !saveError
              ? 'bg-emerald-600 text-white opacity-90 cursor-default'
              : 'bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-50'
          }`}>
          {!isDirty && !saveError && (
            <svg key="check" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" className="animate-check" />
            </svg>
          )}
          {saving ? 'Saving…' : !isDirty && !saveError ? 'Form saved' : 'Save form'}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-5">

        {/* ── Event header card ── */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="flex items-start gap-4 p-5">
            {/* Thumbnail */}
            <div className="w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-700 bg-zinc-800"
              style={{ aspectRatio: EVENT_THUMBNAIL_ASPECT_RATIO }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbSrc} alt={event.eventName}
                onError={() => setThumbError(true)}
                className="w-full h-full object-cover" />
            </div>
            {/* Event info */}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-zinc-500 mb-0.5 uppercase tracking-wide">Event form</p>
              <p className="text-base font-semibold text-white leading-tight truncate">{event.eventName}</p>
              {event.eventDescription && (
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                  {event.eventDescription}
                </p>
              )}
            </div>
          </div>
          {/* Form title + description inputs — styled to blend */}
          <div className="border-t border-zinc-800 p-5 flex flex-col gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); markDirty(); }}
              placeholder="Form title"
              className="bg-transparent text-xl font-semibold text-white placeholder:text-zinc-600 focus:outline-none border-b border-transparent focus:border-zinc-700 pb-1 transition-colors w-full"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => { setDesc(e.target.value); markDirty(); }}
              placeholder="Form description (optional)"
              className="bg-transparent text-sm text-zinc-400 placeholder:text-zinc-600 focus:outline-none border-b border-transparent focus:border-zinc-700 pb-1 transition-colors w-full"
            />
          </div>
        </div>

        {/* ── Field list (drag-to-reorder) ── */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {fields.map((field) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  isDuplicate={duplicateIds.has(field.id)}
                  autoFocus={field.id === newestFieldId}
                  onChange={updateField}
                  onDuplicate={() => duplicateField(field.id)}
                  onDelete={() => deleteField(field.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* ── Add field ── */}
        <AddFieldButton onAdd={addField} />

        {/* ── Empty state hint ── */}
        {fields.length === 0 && (
          <div className="text-center py-8 text-zinc-600 text-sm">
            Click &ldquo;Add question&rdquo; above to start building your form.
          </div>
        )}

        {/* ── Save success hint ── */}
        {!isDirty && event.hasForm && (
          <p className="text-center text-xs text-zinc-600">
            Form saved · {fields.length} field{fields.length !== 1 ? 's' : ''} ·{' '}
            <Link href={`/admin/events/${slug}`} className="underline hover:text-zinc-400 transition-colors">
              Back to event
            </Link>
          </p>
        )}

      </div>
    </div>
  );
}
