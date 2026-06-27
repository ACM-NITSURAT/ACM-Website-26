import type { Timestamp } from './firestore';

// ── Field types ───────────────────────────────────────────────────────────────

/**
 * All supported custom field types in the event form builder.
 * To add a new type: extend this union, add the interface below,
 * add it to FormField, and handle it in the UI and validator.
 *
 * 'paragraph' is a display-only block (not a user-input field).
 * It stores rich-text HTML and is rendered inline in the form.
 * It must be excluded from extraFields validation and response collection.
 */
export type FormFieldType =
  | 'text'
  | 'email'
  | 'mobile'
  | 'rollNumber'
  | 'dropdown'
  | 'checkbox'
  | 'url'
  | 'paragraph';

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

/**
 * A display-only rich-text block. Not a user-input field.
 * `content` stores TipTap-generated HTML.
 * `label` is not shown to users — used only as an admin identifier in the builder.
 * `required` is always false and ignored during validation.
 * The field's id is NOT used as a key in extraFields.
 */
export interface ParagraphField extends FormFieldBase {
  type: 'paragraph';
  /** TipTap HTML content to render inside the form. */
  content: string;
}

/** Discriminated union of all field types. Narrow on `type`. */
export type FormField =
  | TextField
  | EmailField
  | MobileField
  | RollNumberField
  | DropdownField
  | CheckboxField
  | UrlField
  | ParagraphField;

// ── After-submission screen ───────────────────────────────────────────────────

/**
 * Optional screen shown after a successful form submission.
 * Mirrors a Google Forms confirmation page.
 * `body` is TipTap HTML — can include links (e.g. WhatsApp group), images, etc.
 */
export interface AfterScreen {
  /** Short heading shown at the top of the confirmation screen. */
  heading: string;
  /** Rich-text body. TipTap HTML. */
  body: string;
}

// ── EventForm document ────────────────────────────────────────────────────────

/**
 * Stored at: /events/{eventId}/form/config
 * (single document in the "form" subcollection, doc ID always "config")
 *
 * The participant.extraFields map uses FormField.id as keys.
 * ParagraphField entries are excluded from extraFields entirely.
 *
 * Field deletion/addition with existing responses:
 *  - Deleted field: orphaned key remains in existing extraFields — ignored on display.
 *  - Added required field: only enforced on new submissions — retroactive check is impossible.
 *  - Field reorder/rename: keys (UUIDs) are stable, stored responses are unaffected.
 */
export interface EventForm {
  /** Mirrors the parent event's Firestore doc ID. */
  eventId: string;

  /**
   * Displayed as the form heading.
   * Stored as TipTap HTML to support rich formatting.
   * Defaults to the event name on first creation.
   */
  title: string;

  /**
   * Rich-text description shown below the title.
   * Stored as TipTap HTML.
   */
  description: string;

  /**
   * When `true`, the registration page prepends the built-in identity
   * fields (name, roll number, gender for individuals; team name, leader
   * info, members for teams) before the custom fields.
   *
   * When `false` (default), ONLY the custom `fields` array is shown to
   * participants. The API still collects name/roll/gender from the body,
   * but they must be collected via custom fields if the admin wants them
   * visible in the form. This is the recommended setting when you want
   * full control over field order and labels.
   *
   * The server always requires and validates firstName/lastName/rollNumber/
   * gender regardless of this flag — this flag only controls UI rendering.
   */
  includeDefaultFields: boolean;

  /**
   * Custom fields defined by the admin.
   * Min: 1 non-paragraph field (form cannot be saved with only paragraphs).
   * Max: FORM_MAX_FIELDS (defined in src/config/index.ts).
   * ParagraphField entries count toward the max but not toward the min.
   */
  fields: FormField[];

  /**
   * Optional confirmation screen shown after successful submission.
   * When null/undefined, a generic success message is shown.
   */
  afterScreen?: AfterScreen | null;

  /** UTC timestamp of first creation. */
  createdAt: Timestamp;

  /** UTC timestamp of last save. */
  updatedAt: Timestamp;
}

// ── extraFields value types (for reading responses) ───────────────────────────

/**
 * Map of FormField.id → response value.
 * Stored in participant.extraFields.
 * ParagraphField ids are never present here.
 *
 * Value types per field:
 *   text, email, mobile, rollNumber, url, dropdown → string
 *   checkbox → string[]
 */
export type FormResponse = Record<string, string | string[]>;
