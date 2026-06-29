/**
 * Isomorphic field-level validation.
 *
 * Used by BOTH:
 *  - server: src/lib/form-builder/validate-response.ts
 *  - client: src/app/events/[slug]/register/page.tsx (DynamicField, DefaultIndividualFields, DefaultTeamFields)
 *
 * Every function returns `null` on success, or a human-readable error string.
 * All functions trim string inputs before testing.
 *
 * Side-effect free. No external dependencies beyond the rollNumber validator.
 */

import { isValidRollNumber, ROLL_NUMBER_ERROR } from './rollNumber';

// ── Regexes ───────────────────────────────────────────────────────────────────

/** Standard email: something@something.something */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Indian mobile: starts 6–9, exactly 10 digits */
const MOBILE_RE = /^[6-9]\d{9}$/;

/** URL: must start with http:// or https:// */
const URL_RE = /^https?:\/\/.+/i;

// ── Field-type validators ─────────────────────────────────────────────────────

export function validateTextField(label: string, value: unknown, required: boolean): string | null {
  const v = typeof value === 'string' ? value.trim() : '';
  if (required && !v) return `"${label}" is required.`;
  if (v && typeof value !== 'string') return `"${label}" must be a string.`;
  return null;
}

export function validateEmailField(label: string, value: unknown, required: boolean): string | null {
  const v = typeof value === 'string' ? value.trim() : '';
  if (required && !v) return `"${label}" is required.`;
  if (v && !EMAIL_RE.test(v)) return `"${label}" must be a valid email address.`;
  return null;
}

export function validateMobileField(label: string, value: unknown, required: boolean): string | null {
  const v = typeof value === 'string' ? value.trim() : '';
  if (required && !v) return `"${label}" is required.`;
  if (v && !MOBILE_RE.test(v))
    return `"${label}" must be a valid 10-digit Indian mobile number (e.g. 9876543210).`;
  return null;
}

export function validateRollNumberField(label: string, value: unknown, required: boolean): string | null {
  const v = typeof value === 'string' ? value.trim() : '';
  if (required && !v) return `"${label}" is required.`;
  if (v && !isValidRollNumber(v)) return `"${label}": ${ROLL_NUMBER_ERROR}`;
  return null;
}

export function validateUrlField(label: string, value: unknown, required: boolean): string | null {
  const v = typeof value === 'string' ? value.trim() : '';
  if (required && !v) return `"${label}" is required.`;
  if (v && !URL_RE.test(v))
    return `"${label}" must be a valid URL starting with http:// or https://.`;
  return null;
}

export function validateDropdownField(
  label: string, value: unknown, required: boolean, options: string[],
): string | null {
  const v = typeof value === 'string' ? value.trim() : '';
  if (required && !v) return `"${label}" is required.`;
  if (v && !options.includes(v))
    return `"${label}" must be one of: ${options.join(', ')}.`;
  return null;
}

export function validateCheckboxField(
  label: string, value: unknown, required: boolean, options: string[],
): string | null {
  if (!Array.isArray(value)) return `"${label}" must be an array of selected options.`;
  if (required && value.length === 0) return `"${label}" is required — please select at least one option.`;
  const invalid = value.filter((v) => !options.includes(v as string));
  if (invalid.length > 0)
    return `"${label}" contains invalid option(s): ${invalid.join(', ')}.`;
  return null;
}

// ── Dedicated default-field validators (used by client + server) ──────────────

export function validateFirstName(v: string): string | null {
  if (!v.trim()) return 'First name is required.';
  return null;
}

export function validateLastName(v: string): string | null {
  if (!v.trim()) return 'Last name is required.';
  return null;
}

export function validateDefaultRollNumber(v: string): string | null {
  if (!v.trim()) return 'Roll number is required.';
  if (!isValidRollNumber(v)) return ROLL_NUMBER_ERROR;
  return null;
}

export function validateGender(v: string): string | null {
  if (!['male', 'female', 'other'].includes(v)) return 'Please select a gender.';
  return null;
}

export function validateTeamName(v: string): string | null {
  if (!v.trim()) return 'Team name is required.';
  return null;
}

export function validateLeaderName(v: string): string | null {
  if (!v.trim()) return 'Leader name is required.';
  return null;
}

export function validateLeaderRollNumber(v: string): string | null {
  if (!v.trim()) return 'Leader roll number is required.';
  if (!isValidRollNumber(v)) return `Leader roll number: ${ROLL_NUMBER_ERROR}`;
  return null;
}

export function validateMemberName(v: string, idx: number): string | null {
  if (!v.trim()) return `Member ${idx + 1}: name is required.`;
  return null;
}

export function validateMemberRollNumber(v: string, idx: number): string | null {
  if (!v.trim()) return `Member ${idx + 1}: roll number is required.`;
  if (!isValidRollNumber(v)) return `Member ${idx + 1}: ${ROLL_NUMBER_ERROR}`;
  return null;
}

export function validateMemberGender(v: string, idx: number): string | null {
  if (!['male', 'female', 'other'].includes(v)) return `Member ${idx + 1}: please select a gender.`;
  return null;
}

// ── Unified dispatcher used by validate-response.ts ──────────────────────────

import type { FormField, DropdownField, CheckboxField } from '@/schema/form';

/**
 * Validate a single form field against its submitted value.
 * Returns null on success, error string on failure.
 */
export function validateFormField(field: FormField, value: unknown): string | null {
  switch (field.type) {
    case 'text':       return validateTextField(field.label, value, field.required);
    case 'email':      return validateEmailField(field.label, value, field.required);
    case 'mobile':     return validateMobileField(field.label, value, field.required);
    case 'rollNumber': return validateRollNumberField(field.label, value, field.required);
    case 'url':        return validateUrlField(field.label, value, field.required);
    case 'dropdown':   return validateDropdownField(field.label, value, field.required, (field as DropdownField).options);
    case 'checkbox':   return validateCheckboxField(field.label, value, field.required, (field as CheckboxField).options);
    case 'paragraph':  return null; // display-only, never validated
    default:           return null;
  }
}
