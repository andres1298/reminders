"use server";
/**
 * Panel de super admin: lo que necesita generar el token de invitación en el
 * servidor. Va con la sesión (las funciones admin_* verifican super admin);
 * nunca con la service key.
 */
import { headers } from "next/headers";
import { z } from "zod";
import { adminErrorMessage } from "@/lib/admin";
import { hashInviteToken, newInviteToken } from "@/lib/invite-token";
import { supabaseServer } from "@/lib/supabase/server";

type LinkResult = { ok: true; url: string; householdId: string } | { ok: false; message: string; householdId?: string };

async function adminLink(householdId: string): Promise<LinkResult> {
  const db = await supabaseServer();
  const token = newInviteToken();
  const { error } = await db.rpc("admin_create_invitation", { p_household: householdId, p_token_hash: hashInviteToken(token) });
  if (error) return { ok: false, householdId, message: adminErrorMessage(error) };
  const h = await headers();
  return { ok: true, householdId, url: `${h.get("origin") ?? `https://${h.get("host")}`}/invitacion/${token}` };
}

const NewHousehold = z.object({
  name: z.string().trim().min(1).max(40),
  emoji: z.string().trim().max(8),
  timezone: z.string().min(1).max(64),
});

/** Crea un hogar para otra persona y devuelve su enlace de admin. */
export async function adminCreateHousehold(input: unknown): Promise<LinkResult> {
  const parsed = NewHousehold.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revisa el nombre del hogar." };
  const db = await supabaseServer();
  const { data, error } = await db.rpc("admin_create_household", {
    p_name: parsed.data.name,
    p_emoji: parsed.data.emoji,
    p_timezone: parsed.data.timezone,
  });
  if (error) return { ok: false, message: adminErrorMessage(error) };
  return adminLink(data as string);
}

/** Otro enlace de admin para un hogar (si el anterior venció o se perdió). */
export async function adminNewAdminLink(householdId: unknown): Promise<LinkResult> {
  const id = z.uuid().safeParse(householdId);
  return id.success ? adminLink(id.data) : { ok: false, message: adminErrorMessage(null) };
}
