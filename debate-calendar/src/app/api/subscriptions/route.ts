import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PushSub = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime?: number | null;
};

type Payload = {
  email?: string;
  eventId: string;
  customOffsetMinutes?: number;
  pushSubscription?: PushSub;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Payload;
  if (!body.eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: body.eventId } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (body.email) {
    await prisma.subscription.upsert({
      where: { email_eventId: { email: body.email, eventId: body.eventId } },
      create: {
        email: body.email,
        eventId: body.eventId,
        customOffsetMinutes: body.customOffsetMinutes ?? null,
      },
      update: {
        customOffsetMinutes: body.customOffsetMinutes ?? null,
        notified: false,
        notifiedAt: null,
      },
    });
  }

  if (body.pushSubscription) {
    const { endpoint, keys, expirationTime } = body.pushSubscription;
    await prisma.pushSubscription.upsert({
      where: { endpoint_eventId: { endpoint, eventId: body.eventId } },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        expirationTime: expirationTime ? BigInt(expirationTime) : null,
        eventId: body.eventId,
        customOffsetMinutes: body.customOffsetMinutes ?? null,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        expirationTime: expirationTime ? BigInt(expirationTime) : null,
        customOffsetMinutes: body.customOffsetMinutes ?? null,
        notified: false,
        notifiedAt: null,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const body = (await req.json()) as Payload;
  if (!body.eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  if (body.email) {
    await prisma.subscription.deleteMany({
      where: { email: body.email, eventId: body.eventId },
    });
  }

  if (body.pushSubscription?.endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: body.pushSubscription.endpoint, eventId: body.eventId },
    });
  }

  return NextResponse.json({ ok: true });
}
