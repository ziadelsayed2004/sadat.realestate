import { randomBytes } from 'node:crypto';

export type RequestLifecycleEvent = { eventId: string; dedupeKey: string; requestId: string; event: 'request.created' | 'request.transitioned' | 'request.assigned' | 'request.overdue'; payload: Record<string, unknown>; createdAt: Date; deliveredAt?: Date };
export interface NotificationOutbox { enqueue(event: Omit<RequestLifecycleEvent, 'eventId' | 'createdAt'>): Promise<RequestLifecycleEvent>; pending(limit: number): Promise<RequestLifecycleEvent[]>; markDelivered(eventId: string, now: Date): Promise<boolean>; }

export function createInMemoryNotificationOutbox(): NotificationOutbox {
  const events = new Map<string, RequestLifecycleEvent>(); const dedupe = new Map<string, string>();
  return {
    async enqueue(input) { const existing = dedupe.get(input.dedupeKey); if (existing) return events.get(existing) as RequestLifecycleEvent; const event = { ...input, eventId: randomBytes(12).toString('hex'), createdAt: new Date() }; events.set(event.eventId, event); dedupe.set(event.dedupeKey, event.eventId); return event; },
    async pending(limit) { return [...events.values()].filter(event => !event.deliveredAt).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.eventId.localeCompare(b.eventId)).slice(0, Math.max(1, Math.min(limit, 100))); },
    async markDelivered(eventId, now) { const event = events.get(eventId); if (!event || event.deliveredAt) return false; events.set(eventId, { ...event, deliveredAt: now }); return true; }
  };
}
