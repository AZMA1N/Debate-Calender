import type { Event } from "@prisma/client";
import type { DebateEvent } from "@/data/events";

export function toDebateEvent(event: Event): DebateEvent {
  return {
    id: event.id,
    title: event.title,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    location: {
      label: event.locationLabel,
      isOnline: event.locationIsOnline,
      link: event.locationLink ?? undefined,
    },
    category: event.category as DebateEvent["category"],
    description: event.description,
    registrationUrl: event.registrationUrl ?? undefined,
    reminderOffsetMinutes: event.reminderOffsetMinutes ?? undefined,
    organizers: event.organizers ?? undefined,
    featured: event.featured,
  };
}
