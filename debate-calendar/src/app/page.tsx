'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import FullCalendar from "@fullcalendar/react";
import type { EventClickArg, EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import multiMonthPlugin from "@fullcalendar/multimonth";
import {
  addMinutes,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";

import { debateEvents, type DebateEvent, type EventCategory } from "@/data/events";

type CategoryFilter = EventCategory | "all";
type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

export const categoryCopy: Record<EventCategory, string> = {
  tournament: "Tournament",
  practice: "Practice",
  workshop: "Workshop",
  selection: "Selection",
};

const categoryStyles: Record<
  EventCategory,
  { badge: string; dot: string; pill: string }
> = {
  tournament: {
    badge: "bg-rose-100 text-rose-700 border border-rose-200",
    dot: "bg-rose-500",
    pill: "bg-gradient-to-r from-rose-500 to-orange-500",
  },
  practice: {
    badge: "bg-sky-100 text-sky-700 border border-sky-200",
    dot: "bg-sky-500",
    pill: "bg-gradient-to-r from-sky-500 to-cyan-500",
  },
  workshop: {
    badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
    pill: "bg-gradient-to-r from-emerald-500 to-lime-500",
  },
  selection: {
    badge: "bg-amber-100 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
    pill: "bg-gradient-to-r from-amber-500 to-orange-500",
  },
};

export default function Home() {
  const [events, setEvents] = useState<DebateEvent[]>(debateEvents);
  const [selectedEvent, setSelectedEvent] = useState<DebateEvent | null>(null);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [reminderIds, setReminderIds] = useState<Set<string>>(new Set());
  const [notificationEmail, setNotificationEmail] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupport, setPushSupport] = useState(true);
  const [pushSubscription, setPushSubscription] = useState<PushSubscriptionJSON | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load");
        const data = (await res.json()) as DebateEvent[];
        setEvents(data);
      } catch (err) {
        console.error("Falling back to bundled data", err);
        setEvents(debateEvents);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("debate-reminders");
    if (stored) {
      setReminderIds(new Set(JSON.parse(stored)));
    }

    const savedEmail = window.localStorage.getItem("debate-email");
    if (savedEmail) setNotificationEmail(savedEmail);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "debate-reminders",
      JSON.stringify(Array.from(reminderIds)),
    );

    if (notificationEmail) {
      window.localStorage.setItem("debate-email", notificationEmail);
    }
    if (pushEnabled) {
      window.localStorage.setItem("debate-push-enabled", "true");
    }
  }, [reminderIds, notificationEmail, pushEnabled]);

  const enablePush = useCallback(async () => {
    if (!pushSupport) {
      setToast("Push not supported in this browser.");
      setTimeout(() => setToast(null), 2400);
      return;
    }
    if (!vapidKey) {
      setToast("Missing VAPID public key.");
      setTimeout(() => setToast(null), 2400);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setToast("Notifications blocked.");
        setTimeout(() => setToast(null), 2400);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        }));

      const json = subscription.toJSON() as PushSubscriptionJSON;
      setPushSubscription(json);
      setPushEnabled(true);
      window.localStorage.setItem("debate-push-enabled", "true");
      setToast("Push enabled. Save reminders to receive alerts.");
      setTimeout(() => setToast(null), 2400);
    } catch (err) {
      console.error(err);
      setToast("Push setup failed.");
      setTimeout(() => setToast(null), 2400);
    }
  }, [pushSupport, vapidKey]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesCategory = category === "all" || event.category === category;
      const matchesOnline = !onlineOnly || event.location.isOnline;
      return matchesCategory && matchesOnline;
    });
  }, [category, events, onlineOnly]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((event) => isAfter(parseISO(event.end), now))
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      )
      .slice(0, 7);
  }, [events]);

  const soonestEvents = useMemo(() => {
    const now = new Date();
    const soonThreshold = addMinutes(now, 72 * 60);
    return events
      .filter(
        (event) =>
          isAfter(parseISO(event.start), now) &&
          isBefore(parseISO(event.start), soonThreshold),
      )
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
  }, [events]);

  const calendarEvents = filteredEvents.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    extendedProps: { event },
  }));

  const handleEventClick = (info: EventClickArg) => {
    const event = (info.event.extendedProps as { event?: DebateEvent }).event;
    if (event) {
      setSelectedEvent(event);
    }
  };

  const toggleReminder = async (eventId: string) => {
    if (!notificationEmail && !pushEnabled) {
      setToast("Add your email or enable push to receive reminders.");
      setTimeout(() => setToast(null), 2400);
      return;
    }

    const isSaved = reminderIds.has(eventId);

    try {
      const res = await fetch("/api/subscriptions", {
        method: isSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: notificationEmail || undefined,
          eventId,
          pushSubscription: pushSubscription || undefined,
        }),
      });

      if (!res.ok) {
        setToast("Failed to update reminder. Try again.");
        setTimeout(() => setToast(null), 2400);
        return;
      }

      setReminderIds((prev) => {
        const next = new Set(prev);
        if (isSaved) {
          next.delete(eventId);
          setToast("Reminder removed");
        } else {
          next.add(eventId);
          setToast(
            pushEnabled
              ? "Reminder saved. We'll push + email you."
              : "Reminder saved. We'll email you.",
          );
        }
        setTimeout(() => setToast(null), 2400);
        return next;
      });
    } catch (err) {
      console.error(err);
      setToast("Network error. Try again.");
      setTimeout(() => setToast(null), 2400);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPushSupport("serviceWorker" in navigator && "PushManager" in window);
    const saved = window.localStorage.getItem("debate-push-enabled");
    if (saved === "true") {
      enablePush();
    }
  }, [enablePush]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Hero
        soonest={soonestEvents}
        email={notificationEmail}
        onEmailChange={setNotificationEmail}
        pushEnabled={pushEnabled}
        onEnablePush={enablePush}
        pushSupported={pushSupport}
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16">
        <Filters
          category={category}
          onCategoryChange={setCategory}
          onlineOnly={onlineOnly}
          onToggleOnline={() => setOnlineOnly((v) => !v)}
        />
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-slate-900/40">
            <div className="flex items-center justify-between pb-3">
              <div>
                <p className="text-sm text-slate-400">
                  Club calendar · live updated
                </p>
                <h2 className="text-2xl font-semibold text-white">
                  Upcoming debates & drills
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <LegendDot color={categoryStyles.tournament.dot} label="Tournament" />
                <LegendDot color={categoryStyles.practice.dot} label="Practice" />
                <LegendDot color={categoryStyles.workshop.dot} label="Workshop" />
                <LegendDot color={categoryStyles.selection.dot} label="Selection" />
              </div>
            </div>
            <CalendarView
              events={calendarEvents}
              handleEventClick={handleEventClick}
            />
          </section>
          <UpcomingPanel
            events={upcomingEvents}
            onSelect={(ev) => setSelectedEvent(ev)}
            reminders={reminderIds}
            onToggleReminder={toggleReminder}
          />
        </div>
      </div>
      {selectedEvent ? (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onToggleReminder={toggleReminder}
          savedReminder={reminderIds.has(selectedEvent.id)}
        />
      ) : null}
      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm text-white shadow-lg backdrop-blur">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function Hero({
  soonest,
  email,
  onEmailChange,
  pushEnabled,
  onEnablePush,
  pushSupported,
}: {
  soonest: DebateEvent[];
  email: string;
  onEmailChange: (value: string) => void;
  pushEnabled: boolean;
  onEnablePush: () => void;
  pushSupported: boolean;
}) {
  const headline =
    soonest.length > 0
      ? `Next up: ${soonest[0].title}`
      : "No events in the next 72 hours";
  const subtext =
    soonest.length > 0
      ? `${format(parseISO(soonest[0].start), "EEE, MMM d • p")} · ${
          categoryCopy[soonest[0].category]
        }`
      : "Add a new tournament, workshop, or practice round.";

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.22),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.16),transparent_40%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-4 px-6 pb-14 pt-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100">
          <span className="h-2 w-2 rounded-full bg-lime-400" />
          Live debate calendar
        </div>
        <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
          Keep the club aligned on tournaments, drills, and workshops.
        </h1>
        <p className="max-w-3xl text-base text-slate-300 sm:text-lg">
          Browse events by format, save reminders, and drop any session into your own calendar.
          Everything updates live from the NSUDC events feed.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl bg-white/10 px-4 py-3 text-white shadow-lg shadow-blue-500/20 backdrop-blur">
            <p className="text-xs uppercase tracking-wide text-blue-200">Up next</p>
            <p className="text-lg font-semibold">{headline}</p>
            <p className="text-sm text-slate-200">{subtext}</p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-white/5 px-4 py-3 text-white backdrop-blur sm:flex-row sm:items-center sm:gap-3">
            <span className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400" />
            <div className="flex-1">
              <p className="text-sm text-slate-200">Email reminders</p>
              <p className="text-xs text-slate-400">
                Add your email, then tap “Remind me” on any event to get notified.
              </p>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 sm:w-64"
            />
            <div className="flex flex-col gap-1">
              <button
                onClick={onEnablePush}
                disabled={!pushSupported || pushEnabled}
                className={classNames(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition",
                  pushEnabled
                    ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/60"
                    : "bg-white/10 text-white ring-1 ring-white/10 hover:bg-white/20",
                  !pushSupported ? "opacity-50" : "",
                )}
              >
                {pushEnabled ? "Push enabled" : "Enable push alerts"}
              </button>
              {!pushSupported ? (
                <span className="text-[11px] text-rose-200">
                  Push not supported in this browser.
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Filters({
  category,
  onCategoryChange,
  onlineOnly,
  onToggleOnline,
}: {
  category: CategoryFilter;
  onCategoryChange: (value: CategoryFilter) => void;
  onlineOnly: boolean;
  onToggleOnline: () => void;
}) {
  const categoryOptions: { label: string; value: CategoryFilter }[] = [
    { label: "All", value: "all" },
    { label: "Tournaments", value: "tournament" },
    { label: "Practice", value: "practice" },
    { label: "Workshops", value: "workshop" },
    { label: "Selections", value: "selection" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-slate-900/40">
      <div className="flex flex-wrap items-center gap-2">
        {categoryOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onCategoryChange(option.value)}
            className={classNames(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              category === option.value
                ? "bg-white text-slate-900 shadow"
                : "bg-white/5 text-slate-200 hover:bg-white/10",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={onlineOnly}
          onChange={onToggleOnline}
          className="h-4 w-4 accent-sky-400"
        />
        Online only
      </label>
    </div>
  );
}

function CalendarView({
  events,
  handleEventClick,
}: {
  events: { id: string; title: string; start: string; end: string; extendedProps: { event: DebateEvent } }[];
  handleEventClick: (info: EventClickArg) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
      <FullCalendar
        plugins={[
          dayGridPlugin,
          timeGridPlugin,
          interactionPlugin,
          listPlugin,
          multiMonthPlugin,
        ]}
        initialView="dayGridMonth"
        height="auto"
        events={events}
        eventClick={handleEventClick}
        nowIndicator
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,listWeek,multiMonthYear",
        }}
        views={{
          multiMonthYear: { type: "multiMonthYear", fixedWeekCount: false },
        }}
        dayMaxEventRows={3}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: "short" }}
        displayEventEnd
        eventContent={(arg) => <EventContent {...arg} />}
      />
    </div>
  );
}

function EventContent(arg: EventContentArg) {
  const event = (arg.event.extendedProps as { event?: DebateEvent }).event;
  if (!event) {
    return <div>{arg.event.title}</div>;
  }

  const style = categoryStyles[event.category];

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-white/5 px-2 py-1 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2">
        <span className={classNames("h-2.5 w-2.5 rounded-full", style.dot)} />
        <span className="text-[11px] font-medium text-slate-300">
          {arg.timeText || "All day"}
        </span>
      </div>
      <p className="text-sm font-semibold leading-tight text-white">
        {event.title}
      </p>
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        {event.location.isOnline ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-200">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            Online
          </span>
        ) : null}
        <span>{categoryCopy[event.category]}</span>
      </div>
    </div>
  );
}

function UpcomingPanel({
  events,
  onSelect,
  reminders,
  onToggleReminder,
}: {
  events: DebateEvent[];
  onSelect: (event: DebateEvent) => void;
  reminders: Set<string>;
  onToggleReminder: (eventId: string) => void;
}) {
  return (
    <aside className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950/90 p-4 shadow-xl shadow-slate-900/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Upcoming</p>
          <h3 className="text-xl font-semibold text-white">Stay in the loop</h3>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
          {events.length} events
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {events.length === 0 ? (
          <p className="text-sm text-slate-400">
            No upcoming events. Add a new practice, workshop, or tournament.
          </p>
        ) : (
          events.map((event) => {
            const style = categoryStyles[event.category];
            return (
              <div
                key={event.id}
                className="flex gap-3 rounded-xl border border-slate-800 bg-white/5 p-3 shadow-sm backdrop-blur"
              >
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-slate-900 text-center">
                  <span className="text-xs text-slate-400">
                    {format(parseISO(event.start), "MMM")}
                  </span>
                  <span className="text-lg font-semibold text-white">
                    {format(parseISO(event.start), "d")}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      className="text-left text-base font-semibold text-white hover:underline"
                      onClick={() => onSelect(event)}
                    >
                      {event.title}
                    </button>
                    <span
                      className={classNames(
                        "rounded-full px-3 py-1 text-[11px] font-semibold",
                        style.badge,
                      )}
                    >
                      {categoryCopy[event.category]}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">
                    {format(parseISO(event.start), "EEE, MMM d • p")}
                  </p>
                  <p className="text-xs text-slate-400">{event.location.label}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <button
                      className="rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/20"
                      onClick={() => onSelect(event)}
                    >
                      Details
                    </button>
                    <button
                      className={classNames(
                        "rounded-full px-3 py-1 text-white transition",
                        reminders.has(event.id)
                          ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/60"
                          : "bg-white/10 hover:bg-white/20",
                      )}
                      onClick={() => onToggleReminder(event.id)}
                    >
                      {reminders.has(event.id) ? "Reminder on" : "Remind me"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

function EventModal({
  event,
  onClose,
  onToggleReminder,
  savedReminder,
}: {
  event: DebateEvent;
  onClose: () => void;
  onToggleReminder: (eventId: string) => void;
  savedReminder: boolean;
}) {
  const style = categoryStyles[event.category];
  const googleLink = buildGoogleCalendarLink(event);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-slate-900/60">
        <div className={classNames("h-2 w-full", style.pill)} />
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">
                {categoryCopy[event.category]}
              </p>
              <h3 className="text-2xl font-semibold text-white">{event.title}</h3>
              <p className="text-sm text-slate-300">
                {formatDateRange(event.start, event.end)}
              </p>
              <p className="text-sm text-slate-400">{event.location.label}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200 hover:bg-white/20"
            >
              Close
            </button>
          </div>
          <p className="text-sm leading-6 text-slate-200">{event.description}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span
              className={classNames(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium",
                style.badge,
              )}
            >
              <span className={classNames("h-2 w-2 rounded-full", style.dot)} />
              {categoryCopy[event.category]}
            </span>
            {event.location.isOnline ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1 text-sky-100">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-slate-200">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                In person
              </span>
            )}
            {event.organizers ? (
              <span className="rounded-full bg-white/5 px-3 py-1 text-slate-300">
                Host: {event.organizers}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {event.registrationUrl ? (
              <a
                href={event.registrationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                Register
                <span aria-hidden>↗</span>
              </a>
            ) : null}
            <a
              href={googleLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              Add to Google Calendar
            </a>
            {event.location.link ? (
              <a
                href={event.location.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-100 ring-1 ring-sky-400/40 transition hover:bg-sky-500/30"
              >
                Join online room
              </a>
            ) : null}
            <button
              onClick={() => onToggleReminder(event.id)}
              className={classNames(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                savedReminder
                  ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/60"
                  : "bg-white/10 text-white ring-1 ring-white/10 hover:bg-white/20",
              )}
            >
              {savedReminder ? "Reminder saved" : "Remind me"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-slate-400">
      <span className={classNames("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}

function formatDateRange(start: string, end: string) {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const sameDay = startOfDay(startDate).getTime() === startOfDay(endDate).getTime();

  if (sameDay) {
    return `${format(startDate, "EEE, MMM d · p")} - ${format(endDate, "p")}`;
  }

  return `${format(startDate, "EEE, MMM d · p")} → ${format(endDate, "EEE, MMM d · p")}`;
}

function buildGoogleCalendarLink(event: DebateEvent) {
  const start = new Date(event.start).toISOString().replace(/[-:]|\.\d{3}/g, "");
  const end = new Date(event.end).toISOString().replace(/[-:]|\.\d{3}/g, "");
  const details = encodeURIComponent(`${event.description}\n\n${event.location.label}`);
  const location = encodeURIComponent(event.location.label);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${end}&details=${details}&location=${location}`;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
