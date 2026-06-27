/**
 * Validates a submitted extraFields map against the event's form schema.
 *
 * Used server-side in the registration API to enforce required fields,
 * format constraints, and option membership checks.
 *
 * Returns null on success, or an error string describing the first violation.
 */

import type { EventForm, FormField, FormResponse } from '@/schema/form';
import { isValidRollNumber } from '@/lib/validators/rollNumber';

const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[6-9]\d{9}$/;          // Indian mobile: starts 6-9, 10 digits
const URL_RE    = /^https?:\/\/.+/i;

function validateField(field: FormField, value: unknown): string | null {
  // Required check
  const isEmpty =
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);

  if (field.required && isEmpty) {
    return `"${field.label}" is required.`;
  }

  // Skip format checks for empty optional fields
  if (isEmpty) return null;

  switch (field.type) {
    case 'email':
      if (typeof value !== 'string' || !EMAIL_RE.test(value.trim()))
        return `"${field.label}" must be a valid email address.`;
      break;

    case 'mobile':
      if (typeof value !== 'string' || !MOBILE_RE.test(value.trim()))
        return `"${field.label}" must be a valid 10-digit Indian mobile number.`;
      break;

    case 'rollNumber':
      if (typeof value !== 'string' || !isValidRollNumber(value))
        return `"${field.label}" must follow the roll number format (e.g. U24CS089).`;
      break;

    case 'url':
      if (typeof value !== 'string' || !URL_RE.test(value.trim()))
        return `"${field.label}" must be a valid URL (starting with http:// or https://).`;
      break;

    case 'dropdown':
      if (typeof value !== 'string' || !field.options.includes(value))
        return `"${field.label}" must be one of: ${field.options.join(', ')}.`;
      break;

    case 'checkbox': {
      if (!Array.isArray(value))
        return `"${field.label}" must be an array of selected options.`;
      const invalid = (value as unknown[]).filter((v) => !field.options.includes(v as string));
      if (invalid.length > 0)
        return `"${field.label}" contains invalid option(s): ${invalid.join(', ')}.`;
      break;
    }

    case 'text':
      if (typeof value !== 'string')
        return `"${field.label}" must be a string.`;
      break;
  }

  return null;
}

/**
 * Validate all fields in the form schema against the submitted response map.
 *
 * @param form     - The saved EventForm document (from Firestore).
 * @param response - The extraFields object from the registration submission.
 * @returns null if valid, or the first error message string.
 */
export function validateFormResponse(
  form: EventForm,
  response: FormResponse,
): string | null {
  for (const field of form.fields) {
    // Paragraph fields are display-only — never collected in extraFields
    if (field.type === 'paragraph') continue;
    const value = response[field.id];
    const err = validateField(field, value);
    if (err) return err;
  }
  return null;
}
