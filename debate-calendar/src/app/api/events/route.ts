import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDebateEvent } from "@/lib/eventMapper";
import { debateEvents, type DebateEvent } from "@/data/events";

export const dynamic = "force-dynamic";

const adminToken = process.env.ADMIN_TOKEN;

async function ensureSeeded() {
  const count = await prisma.event.count();
  if (count > 0) return;

  await prisma.event.createMany({
    data: debateEvents.map((ev) => ({
      id: ev.id,
      title: ev.title,
      start: new Date(ev.start),
      end: new Date(ev.end),
      locationLabel: ev.location.label,
      locationIsOnline: ev.location.isOnline,
      locationLink: ev.location.link ?? null,
      category: ev.category,
      description: ev.description,
      registrationUrl: ev.registrationUrl ?? null,
      reminderOffsetMinutes: ev.reminderOffsetMinutes ?? null,
      organizers: ev.organizers ?? null,
      featured: ev.featured ?? false,
    })),
  });
}

export async function GET() {
  await ensureSeeded();

  const events = await prisma.event.findMany({
    orderBy: { start: "asc" },
  });

  return NextResponse.json(events.map(toDebateEvent));
}

export async function POST(req: Request) {
  if (!adminToken) {
    return NextResponse.json(
      { error: "Server missing ADMIN_TOKEN" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<DebateEvent>;
  if (
    !body.id ||
    !body.title ||
    !body.start ||
    !body.end ||
    !body.category ||
    !body.description ||
    !body.location
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const created = await prisma.event.create({
    data: {
      id: body.id,
      title: body.title,
      start: new Date(body.start),
      end: new Date(body.end),
      locationLabel: body.location.label,
      locationIsOnline: body.location.isOnline,
      locationLink: body.location.link ?? null,
      category: body.category,
      description: body.description,
      registrationUrl: body.registrationUrl ?? null,
      reminderOffsetMinutes: body.reminderOffsetMinutes ?? null,
      organizers: body.organizers ?? null,
      featured: body.featured ?? false,
    },
  });

  return NextResponse.json(toDebateEvent(created), { status: 201 });
}
