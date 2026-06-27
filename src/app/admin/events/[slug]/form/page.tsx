'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
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
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link2 from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { getEvent, getForm, saveForm } from '@/lib/firebase/admin-api';
import type { Event } from '@/schema/event';
import type { FormField, FormFieldType, DropdownField, CheckboxField, ParagraphField, AfterScreen } from '@/schema/form';
import { EVENT_THUMBNAIL_ASPECT_RATIO, FORM_INTELLIGENT_MODE } from '@/config';

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string { return crypto.randomUUID(); }

function makeField(type: FormFieldType, order: number): FormField {
  const base = { id: uid(), label: '', required: false, order };
  if (type === 'dropdown') return { ...base, type, options: [''] };
  if (type === 'checkbox') return { ...base, type, options: [''] };
  if (type === 'paragraph') return { ...base, type, content: '' };
  return { ...base, type } as FormField;
}

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text:       'Short text',
  email:      'Email address',
  mobile:     'Mobile number',
  rollNumber: 'Roll number',
  url:        'URL',
  dropdown:   'Dropdown',
  checkbox:   'Checkboxes',
  paragraph:  'Paragraph / Rich text',
};

const ALL_INPUT_TYPES: FormFieldType[] = ['text', 'email', 'mobile', 'rollNumber', 'url', 'dropdown', 'checkbox'];
const ALL_TYPES: FormFieldType[] = [...ALL_INPUT_TYPES, 'paragraph'];

// ── Smart type inference ──────────────────────────────────────────────────────

const TYPE_HINTS: { words: string[]; type: FormFieldType }[] = [
  { words: ['email'],                                              type: 'email' },
  { words: ['roll', 'admission'],                                  type: 'rollNumber' },
  { words: ['url', 'link', 'website', 'portfolio', 'github', 'linkedin'], type: 'url' },
  { words: ['mobile', 'phone', 'contact'],                        type: 'mobile' },
];

function inferType(label: string, currentType: FormFieldType): FormFieldType {
  if (!FORM_INTELLIGENT_MODE || currentType === 'paragraph') return currentType;
  const words = label.trim().split(/\s+/);
  if (words.length > 4) return currentType;
  const lower = label.toLowerCase();
  const matches = TYPE_HINTS.filter((h) => h.words.some((w) => lower.includes(w)));
  if (matches.length !== 1) return currentType;
  return matches[0].type;
}


// ── TipTap toolbar ────────────────────────────────────────────────────────────

function ToolbarBtn({
  onClick, active, title, children,
}: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
        active
          ? 'bg-white text-zinc-900'
          : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
      }`}>
      {children}
    </button>
  );
}

function TipTapToolbar({ editor }: { editor: Editor }) {

  function addImage() {
    const url = prompt('Image URL:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }

  function setLink() {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = prompt('Link URL:', prev ?? 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }

  function setColor() {
    const color = prompt('Hex color (e.g. #ff0000):');
    if (color) editor.chain().focus().setColor(color).run();
  }

  function insertTable() {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-zinc-700 bg-zinc-800/50">
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
        <strong>B</strong>
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
        <em>I</em>
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
        <span className="underline">U</span>
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
        <span className="line-through">S</span>
      </ToolbarBtn>
      <span className="w-px h-4 bg-zinc-700 mx-0.5" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
        H2
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
        H3
      </ToolbarBtn>
      <span className="w-px h-4 bg-zinc-700 mx-0.5" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
        •≡
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
        1≡
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
        ❝
      </ToolbarBtn>
      <span className="w-px h-4 bg-zinc-700 mx-0.5" />
      <ToolbarBtn onClick={setLink} active={editor.isActive('link')} title="Link">
        🔗
      </ToolbarBtn>
      <ToolbarBtn onClick={addImage} title="Image">
        🖼
      </ToolbarBtn>
      <ToolbarBtn onClick={setColor} title="Text color">
        <span style={{ borderBottom: '3px solid currentColor' }}>A</span>
      </ToolbarBtn>
      <ToolbarBtn onClick={insertTable} title="Insert table">
        ⊞
      </ToolbarBtn>
      <span className="w-px h-4 bg-zinc-700 mx-0.5" />
      <ToolbarBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear formatting">
        ✕
      </ToolbarBtn>
    </div>
  );
}

// ── Shared TipTap editor extensions ──────────────────────────────────────────

const TIPTAP_EXTENSIONS = [
  StarterKit,
  Underline,
  Link2.configure({ openOnClick: false, autolink: true }),
  TextStyle,
  Color,
  Image,
  Table.configure({ resizable: false }),
  TableRow,
  TableCell,
  TableHeader,
];

// ── Controlled TipTap editor component ───────────────────────────────────────

function RichEditor({
  value,
  onChange,
  placeholder,
  minHeight = '6rem',
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}) {
  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    content: value || '',
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none px-3 py-2 text-zinc-200',
        style: `min-height: ${minHeight}`,
        'data-placeholder': placeholder ?? '',
      },
    },
  });

  // Sync external value changes (e.g. loading from Firestore)
  const lastValueRef = useRef(value);
  useEffect(() => {
    if (!editor) return;
    if (value !== lastValueRef.current && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false);
      lastValueRef.current = value;
    }
  }, [editor, value]);

  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-800/60 overflow-hidden focus-within:ring-1 focus-within:ring-zinc-500">
      {editor && <TipTapToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}


// ── Paragraph field card ──────────────────────────────────────────────────────

interface ParagraphCardProps {
  field: ParagraphField;
  onChange: (updated: FormField) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ParagraphCard({ field, onChange, onDuplicate, onDelete }: ParagraphCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}
      className="rounded-xl border border-zinc-700 bg-zinc-900/80">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-zinc-800">
        <button {...attributes} {...listeners} type="button"
          className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 flex-shrink-0 p-1 -ml-1"
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
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex-1">Paragraph</span>
        <span className="text-xs text-zinc-600">Display only — not collected</span>
        <span className="w-px h-4 bg-zinc-700" />
        <button type="button" onClick={onDuplicate} title="Duplicate"
          className="text-zinc-500 hover:text-zinc-200 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
        <button type="button" onClick={onDelete} title="Delete"
          className="text-zinc-500 hover:text-red-400 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" />
          </svg>
        </button>
      </div>
      {/* Editor */}
      <div className="p-3">
        <RichEditor
          value={field.content}
          onChange={(html) => onChange({ ...field, content: html })}
          placeholder="Enter rich text content…"
          minHeight="5rem"
        />
      </div>
    </div>
  );
}

// ── Input field card ──────────────────────────────────────────────────────────

interface FieldCardProps {
  field: FormField;
  isDuplicate: boolean;
  autoFocus?: boolean;
  onChange: (updated: FormField) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function FieldCard({ field, isDuplicate, autoFocus, onChange, onDuplicate, onDelete }: FieldCardProps) {
  if (field.type === 'paragraph') {
    return (
      <ParagraphCard
        field={field}
        onChange={onChange}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    );
  }

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
    const base = { id: field.id, label: field.label, required: field.required, order: field.order };
    let updated: FormField;
    if (type === 'dropdown') updated = { ...base, type, options: [''] };
    else if (type === 'checkbox') updated = { ...base, type, options: [''] };
    else if (type === 'paragraph') updated = { ...base, type, content: '' };
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
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-zinc-800">
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
        <input type="text" value={field.label} onChange={(e) => updateLabel(e.target.value)}
          placeholder="Question" autoFocus={autoFocus}
          className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none min-w-0" />
        <select value={field.type} onChange={(e) => changeType(e.target.value as FormFieldType)}
          className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 flex-shrink-0 cursor-pointer">
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>
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
      <div className="flex items-center justify-between px-4 py-2.5">
        {isDuplicate && <span className="text-xs text-amber-500 mr-auto">Duplicate label</span>}
        <div className="flex items-center gap-4 ml-auto">
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">Required</span>
            <button type="button" role="switch" aria-checked={field.required} onClick={toggleRequired}
              className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 focus:outline-none ${field.required ? 'bg-white' : 'bg-zinc-700'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${field.required ? 'translate-x-4 bg-zinc-900' : 'translate-x-0 bg-zinc-400'}`} />
            </button>
          </label>
          <span className="w-px h-4 bg-zinc-700" />
          <button type="button" onClick={onDuplicate} title="Duplicate"
            className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
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


// ── Default field preview row ─────────────────────────────────────────────────

function DefaultFieldRow({ label, required, tag = 'input' }: { label: string; required?: boolean; tag?: 'input' | 'select' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 flex items-center gap-1.5 rounded-md bg-zinc-800 border border-zinc-700/60 px-2.5 py-1.5 opacity-60 pointer-events-none select-none">
        <span className="text-xs text-zinc-400 flex-1">{label}</span>
        {tag === 'select' && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>
      {required && <span className="text-xs text-red-500 flex-shrink-0">*</span>}
    </div>
  );
}

// ── Add field buttons ─────────────────────────────────────────────────────────

function AddFieldButtons({ onAdd }: { onAdd: (type: FormFieldType) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onAdd('text')}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-zinc-700 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/60 transition-all">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add question
      </button>
      <button type="button" onClick={() => onAdd('paragraph')}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-cyan-800/60 text-xs text-cyan-600 hover:border-cyan-600 hover:text-cyan-400 hover:bg-cyan-900/10 transition-all">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add paragraph
      </button>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type BuilderTab = 'fields' | 'afterscreen';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FormBuilderPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [event, setEvent]     = useState<(Event & { id: string }) | null>(null);
  const [fields, setFields]   = useState<FormField[]>([]);
  const [title, setTitle]     = useState('');
  const [description, setDesc] = useState('');
  const [afterScreen, setAfterScreen] = useState<AfterScreen>({ heading: '', body: '' });
  const [includeDefaultFields, setIncludeDefaultFields] = useState(false);
  const [tab, setTab]         = useState<BuilderTab>('fields');

  const [loadError, setLoadError]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');
  const [isDirty, setIsDirty]       = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [newestFieldId, setNewestFieldId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      getEvent(slug),
      getForm(slug).catch(() => null),
    ]).then(([ev, form]) => {
      setEvent(ev);
      setTitle(form?.title ?? ev.eventName);
      setDesc(form?.description ?? '');
      if (form?.afterScreen) setAfterScreen(form.afterScreen);
      setIncludeDefaultFields(form?.includeDefaultFields ?? false);
      if (form?.fields?.length) {
        setFields([...form.fields].sort((a, b) => a.order - b.order));
      }
    }).catch((e) => setLoadError(e.message ?? 'Failed to load.'));
  }, [slug]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  function markDirty() { setIsDirty(true); setSaveError(''); }

  const addField = useCallback((type: FormFieldType = 'text') => {
    const newField = makeField(type, 0);
    setFields((prev) => [...prev, { ...newField, order: prev.length }]);
    if (type !== 'paragraph') setNewestFieldId(newField.id);
    markDirty();
  }, []);

  const updateField = useCallback((updated: FormField) => {
    setFields((prev) => prev.map((f) => f.id === updated.id ? updated : f));
    setNewestFieldId(null);
    markDirty();
  }, []);

  const duplicateField = useCallback((id: string) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx === -1) return prev;
      const src = prev[idx];
      const copy: FormField = src.type === 'paragraph'
        ? { ...src, id: uid() }
        : { ...src, id: uid() };
      const next = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
      return next.map((f, i) => ({ ...f, order: i }));
    });
    markDirty();
  }, []);

  const deleteField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id).map((f, i) => ({ ...f, order: i })));
    markDirty();
  }, []);

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setFields((prev) => {
        const oldIndex = prev.findIndex((f) => f.id === active.id);
        const newIndex = prev.findIndex((f) => f.id === over.id);
        return arrayMove(prev, oldIndex, newIndex).map((f, i) => ({ ...f, order: i }));
      });
      markDirty();
    }
  }

  const inputFields = fields.filter((f) => f.type !== 'paragraph');

  const duplicateIds = (() => {
    const seen = new Map<string, number>();
    inputFields.forEach((f) => {
      const key = f.label.trim().toLowerCase();
      if (!key) return;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    });
    return new Set(
      inputFields.filter((f) => {
        const key = f.label.trim().toLowerCase();
        return key && (seen.get(key) ?? 0) > 1;
      }).map((f) => f.id),
    );
  })();

  async function handleSave() {
    setSaveError('');
    if (!title.trim()) { setSaveError('Form title is required.'); return; }
    if (inputFields.length === 0) { setSaveError('Add at least one input field.'); return; }
    if (!inputFields.some((f) => f.required)) { setSaveError('At least one field must be marked as required.'); return; }
    if (duplicateIds.size > 0) { setSaveError('Fix duplicate field labels before saving.'); return; }
    const emptyLabel = inputFields.find((f) => !f.label.trim());
    if (emptyLabel) { setSaveError('All fields must have a label.'); return; }
    const emptyOptions = inputFields.find(
      (f) => (f.type === 'dropdown' || f.type === 'checkbox') &&
             (f as DropdownField | CheckboxField).options.some((o) => !o.trim()),
    );
    if (emptyOptions) { setSaveError(`"${emptyOptions.label || 'A field'}" has empty options.`); return; }

    setSaving(true);
    try {
      const hasAfterScreen = afterScreen.heading.trim() || afterScreen.body.trim();
      await saveForm(slug, {
        title: title.trim(),
        description,
        fields,
        afterScreen: hasAfterScreen ? { heading: afterScreen.heading.trim(), body: afterScreen.body } : null,
        includeDefaultFields,
      });
      setIsDirty(false);
      const updated = await getEvent(slug);
      setEvent(updated);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save form.');
    } finally {
      setSaving(false);
    }
  }

  function handleBackClick(e: React.MouseEvent) {
    if (isDirty && !confirm('You have unsaved changes. Leave without saving?')) {
      e.preventDefault();
    }
  }

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
    </div>
  );

  const thumbSrc = (!thumbError && event.eventThumbnail) ? event.eventThumbnail : '/event-placeholder.jpg';

  return (
    <div className="min-h-full bg-zinc-950">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-zinc-950 border-b border-zinc-800 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/admin/events/${slug}`} onClick={handleBackClick}
            className="text-zinc-500 hover:text-zinc-200 transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <p className="text-xs text-zinc-500 truncate">
            {event.hasForm ? 'Edit form' : 'Create form'} · {event.eventName}
          </p>
          {isDirty && !saveError && <span className="text-xs text-amber-500 flex-shrink-0">Unsaved changes</span>}
          {saveError && <span className="text-xs text-red-400 flex-shrink-0 max-w-xs truncate" title={saveError}>⚠ {saveError}</span>}
        </div>
        <button onClick={handleSave} disabled={saving || duplicateIds.size > 0 || (!isDirty && !saveError)}
          className={`flex-shrink-0 flex items-center gap-2 rounded-md px-5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
            !isDirty && !saveError
              ? 'bg-emerald-600 text-white opacity-90 cursor-default'
              : 'bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-50'
          }`}>
          {!isDirty && !saveError && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" className="animate-check" />
            </svg>
          )}
          {saving ? 'Saving…' : !isDirty && !saveError ? 'Form saved' : 'Save form'}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-5">

        {/* Event header */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="flex items-start gap-4 p-5">
            <div className="w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-700 bg-zinc-800"
              style={{ aspectRatio: EVENT_THUMBNAIL_ASPECT_RATIO }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbSrc} alt={event.eventName} onError={() => setThumbError(true)} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-zinc-500 mb-0.5 uppercase tracking-wide">Event form</p>
              <p className="text-base font-semibold text-white leading-tight truncate">{event.eventName}</p>
            </div>
          </div>
          {/* Title (plain text) + Description (rich text) + Default fields toggle */}
          <div className="border-t border-zinc-800 p-5 flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1.5">Form title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); markDirty(); }}
                placeholder="Form title"
                className="bg-transparent text-lg font-semibold text-white placeholder:text-zinc-600 focus:outline-none border-b border-transparent focus:border-zinc-700 pb-1 transition-colors w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1.5">Form description (rich text)</label>
              <RichEditor
                value={description}
                onChange={(html) => { setDesc(html); markDirty(); }}
                placeholder="Describe the form…"
                minHeight="4rem"
              />
            </div>

            {/* Default fields toggle */}
            <div className="border-t border-zinc-800 pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 leading-snug">Include default fields</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                    When on, the registration form prepends built-in identity fields (name, roll number, gender, team info) before your custom fields. Leave off if you want to handle those fields yourself or skip them entirely.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeDefaultFields}
                  onClick={() => { setIncludeDefaultFields((p) => !p); markDirty(); }}
                  className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors mt-0.5 focus:outline-none ${includeDefaultFields ? 'bg-white' : 'bg-zinc-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${includeDefaultFields ? 'translate-x-5 bg-zinc-900' : 'translate-x-0 bg-zinc-400'}`} />
                </button>
              </div>

              {/* Preview panel — only visible when toggle is on */}
              {includeDefaultFields && (
                <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-800/40 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700 bg-zinc-800/60">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 flex-shrink-0">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span className="text-xs font-medium text-zinc-400">Default fields shown to participants</span>
                    <span className="ml-auto text-xs text-zinc-600">read-only preview</span>
                  </div>
                  <div className="px-4 py-3 flex flex-col gap-2">
                    {event?.isTeamEvent ? (
                      <>
                        <DefaultFieldRow label="Team name" required />
                        <div className="mt-1 mb-0.5">
                          <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">Leader</p>
                          <div className="flex flex-col gap-2 pl-2 border-l border-zinc-700">
                            <DefaultFieldRow label="Leader name" required />
                            <DefaultFieldRow label="Leader roll number" required />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
                            Members ({event.minTeamMembers - 1}–{event.maxTeamMembers - 1} per team)
                          </p>
                          <div className="flex flex-col gap-2 pl-2 border-l border-zinc-700">
                            <DefaultFieldRow label="Member name" required />
                            <DefaultFieldRow label="Member roll number" required />
                            <DefaultFieldRow label="Member gender" required tag="select" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <DefaultFieldRow label="First name" required />
                        <DefaultFieldRow label="Last name" required />
                        <DefaultFieldRow label="Roll number" required />
                        <DefaultFieldRow label="Gender" required tag="select" />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <button type="button" onClick={() => setTab('fields')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'fields' ? 'bg-white text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'}`}>
            Form fields
          </button>
          <button type="button" onClick={() => setTab('afterscreen')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'afterscreen' ? 'bg-white text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'}`}>
            After submission
          </button>
        </div>

        {/* Fields tab */}
        {tab === 'fields' && (
          <>
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

            <AddFieldButtons onAdd={addField} />

            {fields.length === 0 && (
              <div className="text-center py-8 text-zinc-600 text-sm">
                Click &ldquo;Add question&rdquo; to start building your form.
              </div>
            )}

            {!isDirty && event.hasForm && (
              <p className="text-center text-xs text-zinc-600">
                Form saved · {inputFields.length} input field{inputFields.length !== 1 ? 's' : ''} ·{' '}
                <Link href={`/admin/events/${slug}`} className="underline hover:text-zinc-400 transition-colors">Back to event</Link>
              </p>
            )}
          </>
        )}

        {/* After-submission tab */}
        {tab === 'afterscreen' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-200 mb-1">Confirmation screen</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Shown to participants after they successfully register. Leave blank to use the default success message.
                  You can include WhatsApp group links, next steps, contact info, etc.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1.5">Heading</label>
                <input
                  type="text"
                  value={afterScreen.heading}
                  onChange={(e) => { setAfterScreen((p) => ({ ...p, heading: e.target.value })); markDirty(); }}
                  placeholder="e.g. You're registered! 🎉"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1.5">Body (rich text)</label>
                <RichEditor
                  value={afterScreen.body}
                  onChange={(html) => { setAfterScreen((p) => ({ ...p, body: html })); markDirty(); }}
                  placeholder="Add next steps, links, or any message…"
                  minHeight="8rem"
                />
              </div>
            </div>

            {/* Preview hint */}
            {(afterScreen.heading || afterScreen.body) && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3">Preview</p>
                <div className="flex flex-col items-center text-center gap-3 py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  {afterScreen.heading && (
                    <p className="text-lg font-semibold text-white">{afterScreen.heading}</p>
                  )}
                  {afterScreen.body && (
                    <div
                      className="prose prose-invert prose-sm max-w-none text-zinc-300"
                      dangerouslySetInnerHTML={{ __html: afterScreen.body }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
