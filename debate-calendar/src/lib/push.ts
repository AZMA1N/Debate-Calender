import webPush, { type PushSubscription } from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const contact = process.env.PUSH_CONTACT || "mailto:admin@example.com";

export function ensureVapidConfigured() {
  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID keys");
  }
  webPush.setVapidDetails(contact, publicKey, privateKey);
}

export async function sendPush(
  subscription: PushSubscription,
  payload: Record<string, unknown>,
) {
  ensureVapidConfigured();
  const data = JSON.stringify(payload);
  return webPush.sendNotification(subscription, data);
}
