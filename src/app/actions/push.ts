"use server";
import { z } from "zod";
import { pushConfigured, sendPush } from "@/lib/push/webpush";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

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

async function sessionUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await (await supabaseServer()).auth.getUser();
  return user?.id ?? null;
}

/**
 * Asocia este dispositivo a la cuenta con sesión. Va con la service key porque
 * el endpoint es único: si el teléfono cambió de cuenta, la fila se reasigna.
 */
export async function savePushSubscription(input: unknown, userAgent?: string): Promise<{ ok: boolean }> {
  const parsed = Subscription.safeParse(input);
  const userId = await sessionUserId();
  const admin = supabaseAdmin();
  if (!parsed.success || !userId || !admin) return { ok: false };
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: typeof userAgent === "string" ? userAgent.slice(0, 300) : null,
    },
    { onConflict: "endpoint" },
  );
  return { ok: !error };
}

/** Al desactivar o cerrar sesión: este dispositivo deja de recibir avisos de la cuenta. */
export async function deletePushSubscription(endpoint: unknown): Promise<void> {
  if (typeof endpoint !== "string") return;
  const db = await supabaseServer();
  await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
