/**
 * Validates a submitted extraFields map against the event's form schema.
 *
 * Used server-side in the registration API.
 * All field-level validation logic lives in src/lib/validators/form-fields.ts
 * so it can be shared with the client.
 */

import type { EventForm, FormResponse } from '@/schema/form';
import { validateFormField } from '@/lib/validators/form-fields';

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
    if (field.type === 'paragraph') continue;
    const err = validateFormField(field, response[field.id]);
    if (err) return err;
  }
  return null;
}
