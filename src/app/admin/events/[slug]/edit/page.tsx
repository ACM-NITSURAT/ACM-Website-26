'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getEvent, updateEvent } from '@/lib/firebase/admin-api';
import EventForm, { buildPayload, tsToLocal } from '@/components/admin/EventForm';
import type { FormData } from '@/components/admin/EventForm';
import type { Event } from '@/schema/event';

/** Map a fetched Event into the flat FormData shape for the form */
function eventToFormData(e: Event): Partial<FormData> {
  return {
    eventName:        e.eventName,
    eventDescription: e.eventDescription,
    slug:             e.slug,
    useRandomSlug:    false,
    type:             e.type,
    status:           e.status,
    location:         e.location,
    eventThumbnail:   e.eventThumbnail ?? '',
    tags:             (e.tags ?? []).join(', '),
    isOpenToAll:      e.isOpenToAll,
    unregisteredForm: e.unregisteredForm,
    maxParticipants:  String(e.maxParticipants ?? 0),
    startDate:        tsToLocal(e.startDate),
    endDate:          tsToLocal(e.endDate),
    isTeamEvent:      e.isTeamEvent,
    minTeamMembers:   String(e.minTeamMembers ?? 2),
    maxTeamMembers:   String(e.maxTeamMembers ?? 4),
    isFemaleMandatory: e.isFemaleMandatory,
    minFemaleRequired: String(e.minFemaleRequired ?? 1),
    prizeMoney:       String(e.prizeMoney ?? 0),
    firstPrize:       String(e.prizeMoneyDistribution?.firstPrize ?? 0),
    secondPrize:      String(e.prizeMoneyDistribution?.secondPrize ?? 0),
    thirdPrize:       String(e.prizeMoneyDistribution?.thirdPrize ?? 0),
  };
}

export default function EditEventPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  const [initial, setInitial] = useState<Partial<FormData> | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!slug) return;
    getEvent(slug)
      .then((ev) => setInitial(eventToFormData(ev)))
      .catch((err) => setLoadError(err.message ?? 'Failed to load event'));
  }, [slug]);

  async function handleSubmit(payload: ReturnType<typeof buildPayload>) {
    await updateEvent(slug, payload);
    // After save, navigate to the (possibly renamed) slug detail page
    const newSlug = (payload.slug as string | undefined) ?? slug;
    router.push(`/admin/events/${newSlug}`);
  }

  if (loadError) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-400">{loadError}</p>
        <Link href="/admin/events" className="mt-4 inline-block text-sm text-zinc-400 hover:text-zinc-200 transition-colors">← Back to events</Link>
      </div>
    );
  }

  if (!initial) {
    return (
      <div className="p-8">
        <div className="h-6 w-48 rounded bg-zinc-800 animate-pulse mb-4" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-10 rounded bg-zinc-800/50 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-6">
        <Link href="/admin/events" className="hover:text-zinc-300 transition-colors">Events</Link>
        <span>/</span>
        <Link href={`/admin/events/${slug}`} className="hover:text-zinc-300 transition-colors truncate max-w-xs">{initial.eventName}</Link>
        <span>/</span>
        <span className="text-zinc-300">Edit</span>
      </div>

      <h1 className="text-2xl font-semibold text-white mb-1">Edit event</h1>
      <p className="text-sm text-zinc-400 mb-8">Changes are saved immediately on submit.</p>

      <EventForm
        initial={initial}
        submitLabel="Save changes"
        onSubmit={handleSubmit}
        cancelHref={`/admin/events/${slug}`}
      />
    </div>
  );
}
