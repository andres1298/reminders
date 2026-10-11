import "server-only";
import webpush from "web-push";
import type { PushPayload } from "./plan";

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

let configured: boolean | null = null;

/** Configura VAPID una vez. false si faltan las variables de entorno. */
export function pushConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hola@lukas.app";
  configured = !!(pub && priv);
  if (configured) webpush.setVapidDetails(subject, pub!, priv!);
  return configured;
}

/** "gone": la suscripción ya no existe (404/410) y hay que borrarla. */
export async function sendPush(target: PushTarget, payload: PushPayload): Promise<"ok" | "gone" | "error"> {
  if (!pushConfigured()) return "error";
  try {
    await webpush.sendNotification(target, JSON.stringify(payload), { TTL: 60 * 60, urgency: "high", topic: payload.tag.slice(0, 32) });
    return "ok";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("push error", status, (e as Error).message);
    return "error";
  }
}
