"use server";
import { z } from "zod";
import { pushConfigured, sendPush } from "@/lib/push/webpush";

const Subscription = z.object({
  endpoint: z.url().startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

/** Notificación de prueba al dispositivo que la pide (no guarda nada). */
export async function sendTestPush(input: unknown): Promise<{ ok: boolean; message: string }> {
  if (!pushConfigured()) return { ok: false, message: "Falta configurar las llaves VAPID en el servidor." };
  const parsed = Subscription.safeParse(input);
  if (!parsed.success) return { ok: false, message: "La suscripción no es válida." };
  const r = await sendPush(parsed.data, {
    title: "🐾 Lukas",
    body: "Las notificaciones funcionan. Te avisaré cuando toque algo.",
    url: "/",
    tag: "lukas-test",
  });
  return r === "ok"
    ? { ok: true, message: "Enviada. Debería llegarte en unos segundos." }
    : { ok: false, message: r === "gone" ? "Este dispositivo ya no está suscrito. Vuelve a activar las notificaciones." : "No se pudo enviar. Intenta otra vez." };
}

export async function pushAvailable(): Promise<boolean> {
  return pushConfigured();
}
