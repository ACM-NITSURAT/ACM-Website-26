/**
 * Validates a form schema before saving it to Firestore.
 * Used server-side in PUT /api/admin/events/[slug]/form/route.ts.
 *
 * Returns null on success, or an error string describing the first violation.
 */

import type { FormField } from '@/schema/form';
import { FORM_MAX_FIELDS } from '@/config';

const VALID_TYPES = ['text', 'email', 'mobile', 'rollNumber', 'dropdown', 'checkbox', 'url'];

export function validateFormSchema(
  title: unknown,
  description: unknown,
  fields: unknown,
): string | null {
  if (!title || typeof title !== 'string' || !title.trim())
    return 'Form title is required.';

  if (typeof description !== 'string')
    return 'Form description must be a string.';

  if (!Array.isArray(fields))
    return 'fields must be an array.';

  if (fields.length === 0)
    return 'A form must have at least 1 field.';

  if (fields.length > FORM_MAX_FIELDS)
    return `A form cannot have more than ${FORM_MAX_FIELDS} fields.`;

  // Label uniqueness (case-insensitive)
  const seenLabels = new Set<string>();

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i] as Partial<FormField>;
    const pos = `Field ${i + 1}`;

    if (!f.id || typeof f.id !== 'string')
      return `${pos}: missing or invalid id.`;

    if (!f.label || typeof f.label !== 'string' || !f.label.trim())
      return `${pos}: label is required.`;

    const labelKey = f.label.trim().toLowerCase();
    if (seenLabels.has(labelKey))
      return `Duplicate field label: "${f.label}". Each field must have a unique label.`;
    seenLabels.add(labelKey);

    if (typeof f.required !== 'boolean')
      return `${pos} ("${f.label}"): required must be a boolean.`;

    if (!VALID_TYPES.includes(f.type as string))
      return `${pos} ("${f.label}"): invalid type "${f.type as string}".`;

    if (f.type === 'dropdown' || f.type === 'checkbox') {
      const options = (f as { options?: unknown }).options;
      if (!Array.isArray(options) || options.length === 0)
        return `${pos} ("${f.label}"): ${f.type} fields must have at least 1 option.`;
      if (options.some((o) => typeof o !== 'string' || !o.trim()))
        return `${pos} ("${f.label}"): all options must be non-empty strings.`;
    }
  }

  return null;
}
