import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { prisma } from "@/lib/prisma";
import { toDebateEvent } from "@/lib/eventMapper";
import { sendPush } from "@/lib/push";

const cronSecret = process.env.CRON_SECRET;
const sendgridKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.REMINDER_FROM_EMAIL;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!cronSecret || !sendgridKey || !fromEmail) {
    return NextResponse.json(
      { error: "Missing SENDGRID_API_KEY, REMINDER_FROM_EMAIL, or CRON_SECRET" },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  sgMail.setApiKey(sendgridKey);

  const now = new Date();

  const subscriptions = await prisma.subscription.findMany({
    where: { notified: false },
    include: { event: true },
  });

  const pushSubscriptions = await prisma.pushSubscription.findMany({
    where: { notified: false },
    include: { event: true },
  });

  const due = subscriptions.filter((sub) => {
    const event = sub.event;
    const offset =
      sub.customOffsetMinutes ?? event.reminderOffsetMinutes ?? 60;
    const reminderAt = new Date(event.start.getTime() - offset * 60000);
    return now >= reminderAt && now < event.start;
  });

  const pushDue = pushSubscriptions.filter((sub) => {
    const event = sub.event;
    const offset =
      sub.customOffsetMinutes ?? event.reminderOffsetMinutes ?? 60;
    const reminderAt = new Date(event.start.getTime() - offset * 60000);
    return now >= reminderAt && now < event.start;
  });

  const emailResults = await Promise.all(
    due.map(async (sub) => {
      const event = toDebateEvent(sub.event);
      const offset =
        sub.customOffsetMinutes ?? event.reminderOffsetMinutes ?? 60;
      const msg = buildMessage(sub.email, event, offset);

      try {
        await sgMail.send(msg);
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { notified: true, notifiedAt: new Date() },
        });
        return { id: sub.id, status: "sent" as const };
      } catch (err) {
        console.error("SendGrid error", err);
        return { id: sub.id, status: "failed" as const };
      }
    }),
  );
  const pushResults = await Promise.all(
    pushDue.map(async (sub) => {
      const event = toDebateEvent(sub.event);
      const offset =
        sub.customOffsetMinutes ?? event.reminderOffsetMinutes ?? 60;
      const expirationTime =
        sub.expirationTime === null || sub.expirationTime === undefined
          ? undefined
          : Number(sub.expirationTime);
      try {
        await sendPush(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
            expirationTime,
          },
          {
            title: `Debate reminder: ${event.title}`,
            body: `Starts in ~${offset >= 60 ? Math.round(offset / 60) + "h" : offset + "m"} · ${
              event.location.label
            }`,
            url: event.location.link || "https://google.com",
          },
        );
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { notified: true, notifiedAt: new Date() },
        });
        return { id: sub.id, status: "sent" as const };
      } catch (err) {
        console.error("Push error", err);
        return { id: sub.id, status: "failed" as const };
      }
    }),
  );

  return NextResponse.json({
    processed: emailResults.length + pushResults.length,
    sent:
      emailResults.filter((r) => r.status === "sent").length +
      pushResults.filter((r) => r.status === "sent").length,
    failed:
      emailResults.filter((r) => r.status === "failed").length +
      pushResults.filter((r) => r.status === "failed").length,
  });
}

function buildMessage(
  email: string,
  event: ReturnType<typeof toDebateEvent>,
  offsetMinutes: number,
) {
  const start = new Date(event.start);
  const time = start.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const body = [
    `Reminder: "${event.title}" starts in ~${Math.round(offsetMinutes / 60) || offsetMinutes} ${
      offsetMinutes >= 60 ? "hours" : "minutes"
    }.`,
    `When: ${time}`,
    `Where: ${event.location.label}${event.location.link ? ` (${event.location.link})` : ""}`,
    event.description,
    event.registrationUrl ? `Register: ${event.registrationUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    to: email,
    from: fromEmail!,
    subject: `Debate reminder: ${event.title}`,
    text: body,
  };
}
