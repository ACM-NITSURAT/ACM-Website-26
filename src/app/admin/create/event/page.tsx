'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EventForm, { buildPayload } from '@/components/admin/EventForm';
import { createEvent } from '@/lib/firebase/admin-api';

export default function CreateEventPage() {
  const router = useRouter();

  async function handleSubmit(payload: ReturnType<typeof buildPayload>) {
    await createEvent(payload);
    router.push('/admin/events');
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-6">
        <Link href="/admin/events" className="hover:text-zinc-300 transition-colors">Events</Link>
        <span>/</span>
        <span className="text-zinc-300">New event</span>
      </div>
      <h1 className="text-2xl font-semibold text-white mb-1">Create event</h1>
      <p className="text-sm text-zinc-400 mb-8">Fill in the details below to publish a new event.</p>
      <EventForm
        submitLabel="Create event"
        onSubmit={handleSubmit}
        cancelHref="/admin/events"
      />
    </div>
  );
}
