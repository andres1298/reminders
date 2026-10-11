import "server-only";
import { hashInviteToken } from "./invite-token";
import { supabaseAdmin } from "./supabase/admin";

export interface InvitationView {
  tokenHash: string;
  household: { name: string; emoji: string };
  invitedBy: string;
}

/** Lee una invitación vigente con la service key (quien abre el enlace aún no tiene sesión). null = ya no sirve. */
export async function readInvitation(token: string): Promise<InvitationView | null> {
  const db = supabaseAdmin();
  if (!db || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const tokenHash = hashInviteToken(token);
  const { data } = await db
    .from("invitations")
    .select("kind, expires_at, accepted_at, revoked_at, households(name, emoji), profiles!invitations_invited_by_fkey(display_name)")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!data || data.kind !== "household" || data.accepted_at || data.revoked_at || new Date(data.expires_at) < new Date()) return null;
  const household = data.households as unknown as { name: string; emoji: string } | null;
  const inviter = data.profiles as unknown as { display_name: string } | null;
  if (!household) return null;
  return { tokenHash, household, invitedBy: inviter?.display_name ?? "Alguien" };
}
