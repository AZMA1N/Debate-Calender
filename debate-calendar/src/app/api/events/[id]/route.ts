import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDebateEvent } from "@/lib/eventMapper";
import type { DebateEvent } from "@/data/events";

const adminToken = process.env.ADMIN_TOKEN;

type RouteContext = { params: Promise<{ id: string }> };

async function getId(context: RouteContext) {
  const { id } = await context.params;
  return id;
}

function isAuthorized(req: NextRequest) {
  return (
    adminToken && req.headers.get("authorization") === `Bearer ${adminToken}`
  );
}

export async function GET(
  _req: NextRequest,
  context: RouteContext,
) {
  const id = await getId(context);
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(toDebateEvent(event));
}

export async function PUT(
  req: NextRequest,
  context: RouteContext,
) {
  if (!adminToken) {
    return NextResponse.json(
      { error: "Server missing ADMIN_TOKEN" },
      { status: 500 },
    );
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<DebateEvent>;
  const id = await getId(context);

  if (
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

  try {
    const updated = await prisma.event.update({
      where: { id },
      data: {
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

    return NextResponse.json(toDebateEvent(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: RouteContext,
) {
  if (!adminToken) {
    return NextResponse.json(
      { error: "Server missing ADMIN_TOKEN" },
      { status: 500 },
    );
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
  const id = await getId(context);
  await prisma.event.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
