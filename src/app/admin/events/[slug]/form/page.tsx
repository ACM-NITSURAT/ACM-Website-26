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
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-white/5 bg-[#12121a]/80 backdrop-blur-xl">
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
      <span className="w-px h-4 bg-white/10 mx-1.5" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
        H2
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
        H3
      </ToolbarBtn>
      <span className="w-px h-4 bg-white/10 mx-1.5" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
        •≡
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
        1≡
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
        ❝
      </ToolbarBtn>
      <span className="w-px h-4 bg-white/10 mx-1.5" />
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
      <span className="w-px h-4 bg-white/10 mx-1.5" />
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
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none px-4 py-3 text-zinc-300 font-mono',
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
    <div className="rounded-xl border border-white/5 bg-black/40 overflow-hidden focus-within:border-indigo-500/50 focus-within: transition-all">
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
      className="rounded-2xl border border-white/5 bg-[#12121a]/60 backdrop-blur-md shadow-lg transition-colors focus-within:border-indigo-500/30 focus-within:">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-white/5 bg-black/20 rounded-t-2xl">
        <button {...attributes} {...listeners} type="button"
          className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-indigo-400 transition-colors flex-shrink-0 p-1.5 -ml-1.5 rounded bg-white/5 hover:bg-indigo-500/10"
          aria-label="Drag to reorder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="9" cy="19" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="15" cy="5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="15" cy="19" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex-1 font-mono">Paragraph Block</span>
        <span className="text-xs text-zinc-600 font-mono">Display only</span>
        <span className="w-px h-4 bg-white/10 mx-2" />
        <button type="button" onClick={onDuplicate} title="Duplicate"
          className="text-zinc-500 hover:text-indigo-300 transition-colors bg-white/5 hover:bg-indigo-500/10 p-1.5 rounded">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
        <button type="button" onClick={onDelete} title="Delete"
          className="text-zinc-500 hover:text-red-400 transition-colors bg-white/5 hover:bg-red-500/10 p-1.5 rounded">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" />
          </svg>
        </button>
      </div>
      {/* Editor */}
      <div className="p-5">
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
      className={`rounded-2xl border bg-[#12121a]/60 backdrop-blur-md shadow-lg transition-colors focus-within:border-indigo-500/30 focus-within: ${isDuplicate ? 'border-amber-500/40 ' : 'border-white/5'}`}>
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-white/5 bg-black/20 rounded-t-2xl">
        <button {...attributes} {...listeners} type="button"
          className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-indigo-400 transition-colors flex-shrink-0 p-1.5 -ml-1.5 rounded bg-white/5 hover:bg-indigo-500/10"
          aria-label="Drag to reorder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="9" cy="19" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="15" cy="5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="15" cy="19" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <input type="text" value={field.label} onChange={(e) => updateLabel(e.target.value)}
          placeholder="Question Label" autoFocus={autoFocus}
          className="flex-1 bg-transparent text-lg font-bold text-white placeholder:text-zinc-600 focus:outline-none min-w-0" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }} />
        <select value={field.type} onChange={(e) => changeType(e.target.value as FormFieldType)}
          className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-300 focus:outline-none focus:border-indigo-500/50 flex-shrink-0 cursor-pointer font-mono">
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>
      {(field.type === 'dropdown' || field.type === 'checkbox') && (
        <div className="px-5 py-4 border-b border-white/5 flex flex-col gap-3 bg-[#07060a]/20">
          {(field as DropdownField | CheckboxField).options.map((opt, i) => (
            <div key={i} className="flex items-center gap-3 group">
              <span className="text-[10px] text-zinc-600 font-mono w-4 text-right flex-shrink-0">{i + 1}.</span>
              <input type="text" value={opt} placeholder={`Option ${i + 1}`}
                onChange={(e) => updateOption(i, e.target.value)}
                className="flex-1 bg-black/40 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-[#12121a] transition-all font-mono" />
              {(field as DropdownField | CheckboxField).options.length > 1 && (
                <button type="button" onClick={() => removeOption(i)}
                  className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 bg-white/5 hover:bg-red-500/10 p-2 rounded-lg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addOption}
            className="self-start flex items-center gap-2 px-3 py-2 mt-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 hover:text-indigo-300 transition-all font-mono ml-7">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add option
          </button>
        </div>
      )}
      <div className="flex items-center justify-between px-5 py-3 bg-black/20 rounded-b-2xl">
        {isDuplicate && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mr-auto font-mono bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">Duplicate label</span>}
        <div className="flex items-center gap-4 ml-auto">
          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <span className="text-[10px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors uppercase tracking-widest font-mono">Required</span>
            <button type="button" role="switch" aria-checked={field.required} onClick={toggleRequired}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 focus:outline-none border ${field.required ? 'bg-indigo-500/20 border-indigo-500/50 ' : 'bg-black/60 border-white/10'}`}>
              <span className={`absolute top-[2px] left-[2px] w-4 h-4 rounded-full transition-transform ${field.required ? 'translate-x-5 bg-indigo-400 ' : 'translate-x-0 bg-zinc-600'}`} />
            </button>
          </label>
          <span className="w-px h-5 bg-white/10 mx-2" />
          <button type="button" onClick={onDuplicate} title="Duplicate"
            className="text-zinc-500 hover:text-indigo-300 transition-colors bg-white/5 hover:bg-indigo-500/10 p-2 rounded-lg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button type="button" onClick={onDelete} title="Delete"
            className="text-zinc-500 hover:text-red-400 transition-colors bg-white/5 hover:bg-red-500/10 p-2 rounded-lg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
    <div className="flex items-center gap-3">
      <div className="flex-1 flex items-center gap-2 rounded-lg bg-black/40 border border-white/5 px-3 py-2 opacity-70 pointer-events-none select-none">
        <span className="text-xs text-zinc-400 flex-1 font-mono">{label}</span>
        {tag === 'select' && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>
      {required && <span className="text-lg font-black text-red-500 flex-shrink-0 drop-">*</span>}
    </div>
  );
}

// ── Add field buttons ─────────────────────────────────────────────────────────

function AddFieldButtons({ onAdd }: { onAdd: (type: FormFieldType) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={() => onAdd('text')}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-indigo-500/30 text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/50 hover: transition-all font-mono">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Field
      </button>
      <button type="button" onClick={() => onAdd('paragraph')}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-cyan-500/30 text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover: transition-all font-mono">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Paragraph
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
    <div className="min-h-full bg-[#07060a]">


      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-[#07060a]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link href={`/admin/events/${slug}`} onClick={handleBackClick}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all flex-shrink-0 ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <div className="flex flex-col min-w-0">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              {event.hasForm ? 'Edit form' : 'Create form'}
            </p>
            <p className="text-sm font-semibold text-white truncate" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
              {event.eventName}
            </p>
          </div>
          {isDirty && !saveError && <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 uppercase tracking-widest flex-shrink-0 font-mono ">Unsaved changes</span>}
          {saveError && <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 uppercase tracking-widest flex-shrink-0 max-w-xs truncate font-mono " title={saveError}>⚠ {saveError}</span>}
        </div>
        <button onClick={handleSave} disabled={saving || duplicateIds.size > 0 || (!isDirty && !saveError)}
          className={`flex-shrink-0 flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all  disabled:cursor-not-allowed ${
            !isDirty && !saveError
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30  cursor-default'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 hover:'
          }`}>
          {!isDirty && !saveError && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" className="animate-check" />
            </svg>
          )}
          {saving ? 'Saving…' : !isDirty && !saveError ? 'Form saved' : 'Save Form'}
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-6 relative z-10">

        {/* Event header */}
        <div className="rounded-2xl border border-white/5 bg-[#12121a]/60 backdrop-blur-md overflow-hidden shadow-xl">
          <div className="flex items-start gap-5 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-50" />
            <div className="w-24 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 border-indigo-500/20 bg-black/60 shadow-lg relative z-10"
              style={{ aspectRatio: EVENT_THUMBNAIL_ASPECT_RATIO }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbSrc} alt={event.eventName} onError={() => setThumbError(true)} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1 relative z-10 pt-1">
              <p className="text-[10px] font-bold text-indigo-400 mb-1 uppercase tracking-widest font-mono">Event Form Architecture</p>
              <p className="text-2xl font-black text-white leading-tight truncate" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>{event.eventName}</p>
            </div>
          </div>
          {/* Title (plain text) + Description (rich text) + Default fields toggle */}
          <div className="border-t border-white/5 p-6 flex flex-col gap-6 bg-black/20">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 block mb-2 uppercase tracking-widest font-mono">Form Headline</label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); markDirty(); }}
                placeholder="Form title"
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-lg font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus: transition-all"
                style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-500 block mb-2 uppercase tracking-widest font-mono">Form Description (Rich Text)</label>
              <RichEditor
                value={description}
                onChange={(html) => { setDesc(html); markDirty(); }}
                placeholder="Describe the form…"
                minHeight="4rem"
              />
            </div>

            {/* Default fields toggle */}
            <div className="border-t border-white/5 pt-6 mt-2">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white leading-snug" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>Include Default Identity Fields</p>
                  <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed font-mono">
                    When active, the registration form prepends built-in identity fields (name, roll number, gender, team info) before your custom fields. Leave disabled to handle those fields manually.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeDefaultFields}
                  onClick={() => { setIncludeDefaultFields((p) => !p); markDirty(); }}
                  className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors mt-1 focus:outline-none border ${includeDefaultFields ? 'bg-indigo-500/20 border-indigo-500/50 ' : 'bg-black/60 border-white/10'}`}
                >
                  <span className={`absolute top-[2px] left-[2px] w-4 h-4 rounded-full transition-transform ${includeDefaultFields ? 'translate-x-6 bg-indigo-400 ' : 'translate-x-0 bg-zinc-600'}`} />
                </button>
              </div>

              {/* Preview panel — only visible when toggle is on */}
              {includeDefaultFields && (
                <div className="mt-5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 overflow-hidden ">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-indigo-500/20 bg-indigo-500/10">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 flex-shrink-0">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest font-mono">Default fields shown to participants</span>
                    <span className="ml-auto text-[10px] text-indigo-400/50 uppercase tracking-widest font-mono">read-only preview</span>
                  </div>
                  <div className="px-5 py-4 flex flex-col gap-3">
                    {event?.isTeamEvent ? (
                      <>
                        <DefaultFieldRow label="Team name" required />
                        <div className="mt-2 mb-1">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 font-mono">Leader</p>
                          <div className="flex flex-col gap-3 pl-3 border-l-2 border-white/5">
                            <DefaultFieldRow label="Leader name" required />
                            <DefaultFieldRow label="Leader roll number" required />
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 font-mono">
                            Members ({event.minTeamMembers - 1}–{event.maxTeamMembers - 1} additional · {event.minTeamMembers}–{event.maxTeamMembers} total incl. leader)
                          </p>
                          <div className="flex flex-col gap-3 pl-3 border-l-2 border-white/5">
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
        <div className="flex gap-2 bg-black/40 border border-white/5 rounded-xl p-1.5 backdrop-blur-md">
          <button type="button" onClick={() => setTab('fields')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all font-mono ${tab === 'fields' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 ' : 'text-zinc-500 hover:text-zinc-300 border border-transparent hover:bg-white/5'}`}>
            Form Fields
          </button>
          <button type="button" onClick={() => setTab('afterscreen')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all font-mono ${tab === 'afterscreen' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 ' : 'text-zinc-500 hover:text-zinc-300 border border-transparent hover:bg-white/5'}`}>
            After Submission
          </button>
        </div>

        {/* Fields tab */}
        {tab === 'fields' && (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-4">
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
              <div className="text-center py-12 px-6 rounded-2xl border border-dashed border-white/10 bg-black/20 text-zinc-500 text-sm font-mono flex flex-col items-center gap-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                Click &ldquo;Add Field&rdquo; to start building your form payload.
              </div>
            )}

            {!isDirty && event.hasForm && (
              <p className="text-center text-[10px] font-bold text-zinc-600 uppercase tracking-widest font-mono">
                Payload secured · {inputFields.length} input field{inputFields.length !== 1 ? 's' : ''} ·{' '}
                <Link href={`/admin/events/${slug}`} className="text-indigo-400 hover:text-indigo-300 transition-colors underline decoration-indigo-500/30 underline-offset-4">Return to Event</Link>
              </p>
            )}
          </>
        )}

        {/* After-submission tab */}
        {tab === 'afterscreen' && (
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-white/5 bg-[#12121a]/60 backdrop-blur-md p-6 flex flex-col gap-6 shadow-xl">
              <div>
                <p className="text-lg font-black text-white mb-1.5" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>Confirmation Screen</p>
                <p className="text-xs text-zinc-500 leading-relaxed font-mono">
                  Shown to operatives after they successfully register. Leave blank to use the default success message.
                  You can include WhatsApp group links, next steps, or contact info.
                </p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 block mb-2 uppercase tracking-widest font-mono">Heading</label>
                <input
                  type="text"
                  value={afterScreen.heading}
                  onChange={(e) => { setAfterScreen((p) => ({ ...p, heading: e.target.value })); markDirty(); }}
                  placeholder="e.g. You're registered! 🎉"
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-lg font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus: transition-all"
                  style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 block mb-2 uppercase tracking-widest font-mono">Body (Rich Text)</label>
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
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 ">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-4 font-mono flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 " />
                  Live Preview
                </p>
                <div className="flex flex-col items-center text-center gap-4 py-6 px-4 bg-[#12121a]/80 backdrop-blur-md rounded-xl border border-white/5">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center ">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  {afterScreen.heading && (
                    <p className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>{afterScreen.heading}</p>
                  )}
                  {afterScreen.body && (
                    <div
                      className="prose prose-invert prose-sm max-w-none text-zinc-300 font-mono text-center"
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
