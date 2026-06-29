import { NextResponse, type NextRequest } from 'next/server';
import adminDb from '@/lib/firebase-admin/firestore';
import { requirePermission } from '@/server/guard';
import type { EventForm, FormField } from '@/schema/form';
import type { Participant } from '@/schema/participant';
import type { Event } from '@/schema/event';

async function getEventDocBySlug(slug: string) {
  const snap = await adminDb
    .collection('events')
    .where('slug', '==', slug)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0];
}

function tsToISO(ts: unknown): string {
  if (!ts || typeof ts !== 'object') return '';
  const s = Number(
    (ts as Record<string, unknown>).seconds ??
    (ts as Record<string, unknown>)._seconds,
  );
  return s ? new Date(s * 1000).toISOString() : '';
}

function csvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = Array.isArray(val) ? val.join('; ') : String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(',');
}

/**
 * GET /api/admin/events/[slug]/participants/csv
 *
 * Columns (all events):
 *   ID, Registered At, Submitter Name, Submitter Roll, Submitter User ID,
 *   Attended, <custom field label columns…>
 *
 * "Submitter *" columns are empty for anonymous events (unregisteredForm=true).
 *
 * Permission: viewEvents (core, adviser)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const guard = await requirePermission(request, 'viewEvents');
  if (guard.error) return guard.error;

  const { slug } = await params;
  const eventDoc = await getEventDocBySlug(slug);
  if (!eventDoc) {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  }

  const event = eventDoc.data() as Event;

  const participantsSnap = await eventDoc.ref
    .collection('participants')
    .orderBy('registrationTimestamp', 'asc')
    .get();

  // Get custom field labels + includeDefaultFields flag from form config
  let inputFields: FormField[] = [];
  let includeDefaultFields = false;
  const formSnap = await eventDoc.ref.collection('form').doc('config').get();
  if (formSnap.exists) {
    const form = formSnap.data() as EventForm;
    inputFields = form.fields
      .filter((f) => f.type !== 'paragraph')
      .sort((a, b) => a.order - b.order);
    includeDefaultFields = form.includeDefaultFields ?? false;
  }

  const lines: string[] = [];

  // Header row — submitter columns only when includeDefaultFields is ON
  const baseHeaders = [
    'ID',
    'Registered At',
    ...(includeDefaultFields ? [
      event.isTeamEvent ? 'Leader Name' : 'Submitter Name',
      event.isTeamEvent ? 'Leader Roll Number' : 'Submitter Roll Number',
      event.isTeamEvent ? 'Leader User ID' : 'Submitter User ID',
    ] : []),
    'Attended',
  ];
  lines.push(csvRow([...baseHeaders, ...inputFields.map((f) => f.label)]));

  for (const doc of participantsSnap.docs) {
    const p = { id: doc.id, ...doc.data() } as Participant & { id: string };
    const base = [
      p.id,
      tsToISO(p.registrationTimestamp),
      ...(includeDefaultFields ? [
        p.submitter?.name ?? '',
        p.submitter?.rollNumber ?? '',
        p.submitter?.userId ?? '',
      ] : []),
      p.attended ? 'yes' : 'no',
    ];
    const extras = inputFields.map((f) => {
      const val = p.extraFields?.[f.id];
      return val ?? '';
    });
    lines.push(csvRow([...base, ...extras]));
  }

  const csv = lines.join('\r\n');
  const filename = `${slug}-participants-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
