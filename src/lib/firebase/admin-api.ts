'use client';

import { auth } from './auth';
import type { Event } from '@/schema/event';

/** Fetch a Bearer token from the current Firebase user. Throws if not signed in. */
async function getBearer(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const token = await getBearer();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Events ────────────────────────────────────────────────────────────────────

export interface EventsListResult {
  events: (Event & { id: string })[];
}

export async function listEvents(): Promise<EventsListResult> {
  return apiFetch('/api/admin/events');
}

export async function createEvent(data: Partial<Event>): Promise<Event & { id: string }> {
  return apiFetch('/api/admin/events', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getEvent(slug: string): Promise<Event & { id: string }> {
  return apiFetch(`/api/admin/events/${slug}`);
}

export async function updateEvent(slug: string, data: Partial<Event>): Promise<Event & { id: string }> {
  return apiFetch(`/api/admin/events/${slug}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteEvent(slug: string): Promise<void> {
  await apiFetch(`/api/admin/events/${slug}`, { method: 'DELETE' });
}

export async function toggleFormOpen(slug: string, isFormOpen: boolean): Promise<Event & { id: string }> {
  return apiFetch(`/api/admin/events/${slug}`, {
    method: 'PATCH',
    body: JSON.stringify({ isFormOpen }),
  });
}

// ── Form builder ──────────────────────────────────────────────────────────────

import type { EventForm } from '@/schema/form';

export async function getForm(slug: string): Promise<EventForm> {
  return apiFetch(`/api/admin/events/${slug}/form`);
}

export async function saveForm(
  slug: string,
  data: Pick<EventForm, 'title' | 'description' | 'fields' | 'afterScreen' | 'includeDefaultFields'>,
): Promise<void> {
  await apiFetch(`/api/admin/events/${slug}/form`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteForm(slug: string): Promise<void> {
  await apiFetch(`/api/admin/events/${slug}/form`, { method: 'DELETE' });
}
