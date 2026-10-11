"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { hashInviteToken, newInviteToken } from "@/lib/invite-token";
import { supabaseServer } from "@/lib/supabase/server";

/** Crea una invitación al hogar (las RLS exigen ser admin) y devuelve el enlace para compartir. */
export async function createInvitation(householdId: unknown): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const id = z.uuid().safeParse(householdId);
  if (!id.success) return { ok: false, message: "No se pudo crear la invitación." };
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, message: "Tu sesión venció. Vuelve a entrar." };
  const token = newInviteToken();
  const { error } = await db.from("invitations").insert({
    kind: "household",
    household_id: id.data,
    token_hash: hashInviteToken(token),
    role: "member",
    invited_by: user.id,
  });
  if (error) return { ok: false, message: "Solo un admin del hogar puede invitar." };
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  return { ok: true, url: `${origin}/invitacion/${token}` };
}
