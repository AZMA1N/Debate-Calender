'use client';

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import classNames from "classnames";

import { categoryCopy } from "../page";
import type { DebateEvent, EventCategory } from "@/data/events";

type FormState = {
  id: string;
  title: string;
  start: string;
  end: string;
  locationLabel: string;
  locationLink: string;
  isOnline: boolean;
  category: EventCategory;
  description: string;
  registrationUrl: string;
  reminderOffsetMinutes: string;
  organizers: string;
  featured: boolean;
};

const emptyForm: FormState = {
  id: "",
  title: "",
  start: "",
  end: "",
  locationLabel: "",
  locationLink: "",
  isOnline: false,
  category: "practice",
  description: "",
  registrationUrl: "",
  reminderOffsetMinutes: "",
  organizers: "",
  featured: false,
};

function toInputDate(value: string) {
  if (!value) return "";
  return format(parseISO(value), "yyyy-MM-dd'T'HH:mm");
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function AdminPage() {
  const [events, setEvents] = useState<DebateEvent[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const authHeader = useMemo(() => {
    if (!token) return undefined;
    return { Authorization: `Bearer ${token}` } satisfies HeadersInit;
  }, [token]);

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      const data = (await res.json()) as DebateEvent[];
      setEvents(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load events");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents();
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("admin-token");
    if (saved)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(saved);
  }, []);

  useEffect(() => {
    if (token) {
      window.localStorage.setItem("admin-token", token);
    }
  }, [token]);

  const handleEdit = (event: DebateEvent) => {
    setEditingId(event.id);
    setForm({
      id: event.id,
      title: event.title,
      start: toInputDate(event.start),
      end: toInputDate(event.end),
      locationLabel: event.location.label,
      locationLink: event.location.link ?? "",
      isOnline: event.location.isOnline,
      category: event.category,
      description: event.description,
      registrationUrl: event.registrationUrl ?? "",
      reminderOffsetMinutes: event.reminderOffsetMinutes?.toString() ?? "",
      organizers: event.organizers ?? "",
      featured: event.featured ?? false,
    });
  };

  const handleDelete = async (id: string) => {
    setError(null);
    setStatus(null);
    setLoading(true);
    const res = await fetch(`/api/events/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ?? {}),
      },
    });
    setLoading(false);
    if (!res.ok) {
      setError("Delete failed (check token)");
      return;
    }
    setStatus("Deleted");
    await loadEvents();
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    setError(null);
    setStatus(null);
    setLoading(true);

    const payload: DebateEvent = {
      id: form.id || slugify(form.title),
      title: form.title,
      start: new Date(form.start).toISOString(),
      end: new Date(form.end).toISOString(),
      location: {
        label: form.locationLabel,
        isOnline: form.isOnline,
        link: form.locationLink || undefined,
      },
      category: form.category,
      description: form.description,
      registrationUrl: form.registrationUrl || undefined,
      reminderOffsetMinutes: form.reminderOffsetMinutes
        ? Number(form.reminderOffsetMinutes)
        : undefined,
      organizers: form.organizers || undefined,
      featured: form.featured,
    };

    const method = editingId ? "PUT" : "POST";
    const endpoint = editingId ? `/api/events/${editingId}` : "/api/events";

    const res = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ?? {}),
      },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const message =
        res.status === 401
          ? "Unauthorized (token missing or invalid)"
          : "Save failed";
      setError(message);
      return;
    }

    setStatus(editingId ? "Updated" : "Created");
    await loadEvents();
    setEditingId(payload.id);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setStatus(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Admin · secure with token</p>
            <h1 className="text-3xl font-semibold text-white">Manage events</h1>
          </div>
          <input
            type="password"
            placeholder="Admin token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-60 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-slate-900/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">
                  {editingId ? "Editing event" : "Create new event"}
                </p>
                <h2 className="text-xl font-semibold text-white">
                  {editingId || "New ID will auto-slug from title"}
                </h2>
              </div>
              <button
                onClick={resetForm}
                className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200 hover:bg-white/20"
              >
                Clear
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <LabeledInput
                label="Title"
                value={form.title}
                onChange={(v) => setForm((f) => ({ ...f, title: v }))}
              />
              <LabeledInput
                label="Event ID (slug)"
                value={form.id}
                onChange={(v) => setForm((f) => ({ ...f, id: v }))}
                placeholder="auto from title if empty"
              />
              <LabeledInput
                label="Start"
                type="datetime-local"
                value={form.start}
                onChange={(v) => setForm((f) => ({ ...f, start: v }))}
              />
              <LabeledInput
                label="End"
                type="datetime-local"
                value={form.end}
                onChange={(v) => setForm((f) => ({ ...f, end: v }))}
              />
              <LabeledInput
                label="Location label"
                value={form.locationLabel}
                onChange={(v) => setForm((f) => ({ ...f, locationLabel: v }))}
              />
              <LabeledInput
                label="Location link (optional)"
                value={form.locationLink}
                onChange={(v) => setForm((f) => ({ ...f, locationLink: v }))}
              />
              <LabeledInput
                label="Organizers"
                value={form.organizers}
                onChange={(v) => setForm((f) => ({ ...f, organizers: v }))}
              />
              <LabeledInput
                label="Registration URL"
                value={form.registrationUrl}
                onChange={(v) => setForm((f) => ({ ...f, registrationUrl: v }))}
              />
              <LabeledInput
                label="Reminder offset (minutes)"
                value={form.reminderOffsetMinutes}
                onChange={(v) =>
                  setForm((f) => ({ ...f, reminderOffsetMinutes: v }))
                }
              />
              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-300">Category</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      category: e.target.value as EventCategory,
                    }))
                  }
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  <option value="tournament">Tournament</option>
                  <option value="practice">Practice</option>
                  <option value="workshop">Workshop</option>
                  <option value="selection">Selection</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-300">Format</label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={form.isOnline}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, isOnline: e.target.checked }))
                      }
                      className="h-4 w-4 accent-sky-400"
                    />
                    Online event
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, featured: e.target.checked }))
                      }
                      className="h-4 w-4 accent-emerald-400"
                    />
                    Featured
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-sm text-slate-300">Description</label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={4}
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editingId ? "Update event" : "Create event"}
              </button>
              <button
                onClick={resetForm}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 hover:bg-white/20"
              >
                Reset
              </button>
              {status ? (
                <span className="text-sm text-emerald-300">{status}</span>
              ) : null}
              {error ? <span className="text-sm text-rose-300">{error}</span> : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-slate-900/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Current events</p>
                <h2 className="text-xl font-semibold text-white">
                  {events.length} scheduled
                </h2>
              </div>
              <button
                onClick={loadEvents}
                className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200 hover:bg-white/20"
              >
                Refresh
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={classNames(
                    "rounded-xl border p-3 shadow-sm backdrop-blur",
                    editingId === event.id
                      ? "border-emerald-400/60 bg-emerald-500/10"
                      : "border-slate-800 bg-white/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase text-slate-400">{event.id}</p>
                      <h3 className="text-lg font-semibold text-white">
                        {event.title}
                      </h3>
                      <p className="text-sm text-slate-300">
                        {format(parseISO(event.start), "MMM d, p")} –{" "}
                        {format(parseISO(event.end), "MMM d, p")}
                      </p>
                      <p className="text-xs text-slate-400">{event.location.label}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
                      {categoryCopy[event.category]}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <button
                      onClick={() => handleEdit(event)}
                      className="rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/20"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="rounded-full bg-rose-500/20 px-3 py-1 text-rose-100 ring-1 ring-rose-400/40 hover:bg-rose-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-slate-300">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
      />
    </div>
  );
}
