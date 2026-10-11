"use server";
import { z } from "zod";
import { readInvitation } from "@/lib/invitations";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

const INVALID = "Esta invitación ya no sirve";

const Join = z.object({
  token: z.string(),
  name: z.string().trim().min(1).max(40),
  email: z.email().trim(),
  password: z.string().min(8),
});

type Result = { ok: true } | { ok: false; message: string; exists?: true };

/** Registro por invitación: crea la cuenta ya confirmada (sin correo), entra y se une al hogar. */
export async function joinWithInvitation(input: unknown): Promise<Result> {
  const parsed = Join.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revisa tu nombre, correo y contraseña (mínimo 8 caracteres)." };
  const { token, name, email, password } = parsed.data;
  const invitation = await readInvitation(token);
  const admin = supabaseAdmin();
  if (!invitation || !admin) return { ok: false, message: INVALID };

  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: name } });
  if (created.error) {
    const exists = created.error.code === "email_exists" || /already been registered/i.test(created.error.message);
    return exists
      ? { ok: false, exists: true, message: "Ya tienes cuenta: entra para unirte" }
      : { ok: false, message: "No se pudo crear la cuenta. Intenta otra vez" };
  }

  const db = await supabaseServer();
  const signIn = await db.auth.signInWithPassword({ email, password });
  const accepted = signIn.error ? signIn : await db.rpc("accept_invitation", { p_token_hash: invitation.tokenHash });
  if (accepted.error) {
    // no dejar una cuenta suelta sin hogar
    await db.auth.signOut();
    await admin.auth.admin.deleteUser(created.data.user.id);
    return { ok: false, message: INVALID };
  }
  return { ok: true };
}

/** Para quien ya tiene sesión: unirse con un toque. */
export async function acceptInvitation(token: unknown): Promise<{ ok: boolean; message?: string }> {
  const invitation = typeof token === "string" ? await readInvitation(token) : null;
  if (!invitation) return { ok: false, message: INVALID };
  const db = await supabaseServer();
  const { error } = await db.rpc("accept_invitation", { p_token_hash: invitation.tokenHash });
  return error ? { ok: false, message: INVALID } : { ok: true };
}
