import type { Timestamp } from './firestore';

// ── Field types ───────────────────────────────────────────────────────────────

/**
 * All supported custom field types in the event form builder.
 * To add a new type: extend this union, add the interface below,
 * add it to FormField, and handle it in the UI and validator.
 */
export type FormFieldType =
  | 'text'
  | 'email'
  | 'mobile'
  | 'rollNumber'
  | 'dropdown'
  | 'checkbox'
  | 'url';

/** Fields shared by every form field. */
interface FormFieldBase {
  /** Stable UUID — used as the key in participant.extraFields. Never changes after creation. */
  id: string;
  /** Question / label text. Must be unique (case-insensitive) within a form. */
  label: string;
  required: boolean;
  /** Display position. 0-indexed. Determines render order. */
  order: number;
}

export interface TextField       extends FormFieldBase { type: 'text' }
export interface EmailField      extends FormFieldBase { type: 'email' }
export interface MobileField     extends FormFieldBase { type: 'mobile' }
export interface RollNumberField extends FormFieldBase { type: 'rollNumber' }
export interface UrlField        extends FormFieldBase { type: 'url' }

export interface DropdownField extends FormFieldBase {
  type: 'dropdown';
  /** At least 1 option required. Response stored as `string`. */
  options: string[];
}

export interface CheckboxField extends FormFieldBase {
  type: 'checkbox';
  /** At least 1 option required. Response stored as `string[]`. */
  options: string[];
}

/** Discriminated union of all field types. Narrow on `type`. */
export type FormField =
  | TextField
  | EmailField
  | MobileField
  | RollNumberField
  | DropdownField
  | CheckboxField
  | UrlField;

// ── EventForm document ────────────────────────────────────────────────────────

/**
 * Stored at: /events/{eventId}/form/config
 * (single document in the "form" subcollection, doc ID always "config")
 *
 * The participant.extraFields map uses FormField.id as keys.
 *
 * Field deletion/addition with existing responses:
 *  - Deleted field: orphaned key remains in existing extraFields — ignored on display.
 *  - Added required field: only enforced on new submissions — retroactive check is impossible.
 *  - Field reorder/rename: keys (UUIDs) are stable, stored responses are unaffected.
 */
export interface EventForm {
  /** Mirrors the parent event's Firestore doc ID. */
  eventId: string;

  /** Displayed as the form heading. Defaults to the event name. */
  title: string;

  /** Short description shown below the title. */
  description: string;

  /**
   * Custom fields defined by the admin.
   * Min: 1 field (form cannot be saved empty).
   * Max: FORM_MAX_FIELDS (defined in src/config/index.ts).
   */
  fields: FormField[];

  /** UTC timestamp of first creation. */
  createdAt: Timestamp;

  /** UTC timestamp of last save. */
  updatedAt: Timestamp;
}

// ── extraFields value types (for reading responses) ───────────────────────────

/**
 * Map of FormField.id → response value.
 * Stored in participant.extraFields.
 *
 * Value types per field:
 *   text, email, mobile, rollNumber, url, dropdown → string
 *   checkbox → string[]
 */
export type FormResponse = Record<string, string | string[]>;
