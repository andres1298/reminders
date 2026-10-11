"use client";
/** Ajustes → Hogar: miembros y, para admins, invitar por enlace y revocar. */
import { useCallback, useEffect, useState } from "react";
import { createInvitation } from "@/app/actions/invitations";
import { useAppState } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { useSync } from "./DataProvider";

interface Pending {
  id: string;
  expires_at: string;
}

const fmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });

export function HouseholdCard() {
  const state = useAppState();
  const sync = useSync();
  const toast = useToast();
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const me = state?.members.find((m) => m.id === state.me);
  const isAdmin = me?.role === "admin";
  const householdId = state?.household.id;

  const loadPending = useCallback(async () => {
    if (!isAdmin || !householdId) return;
    const { data } = await sync.db
      .from("invitations")
      .select("id, expires_at")
      .eq("household_id", householdId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    setPending((data as Pending[] | null) ?? []);
  }, [householdId, isAdmin, sync.db]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    void loadPending();
  }, [loadPending]);

  async function invite() {
    if (!householdId) return;
    setBusy(true);
    const r = await createInvitation(householdId);
    setBusy(false);
    if (!r.ok) return toast(r.message);
    void loadPending();
    const text = `Únete a ${state?.household.emoji} ${state?.household.name} en Lukas`;
    try {
      if (navigator.share) return await navigator.share({ title: "Lukas", text, url: r.url });
    } catch {
      return; // la persona cerró el menú de compartir
    }
    try {
      await navigator.clipboard.writeText(r.url);
      toast("Enlace copiado. Vence en 7 días.", { paw: true });
    } catch {
      toast(r.url);
    }
  }

  async function revoke(id: string) {
    const { error } = await sync.db.from("invitations").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast("No se pudo revocar. Intenta otra vez");
    setPending((p) => p.filter((x) => x.id !== id));
    toast("Invitación revocada.");
  }

  if (!state) return null;
  return (
    <>
      <div className="list list--inset">
        {state.members.map((m) => (
          <div key={m.id} className="row row--lead">
            <span className="row__lead"><Avatar emoji={m.emoji} /></span>
            <span className="row__main">
              <span className="row__title">{m.name}{m.id === state.me ? " (tú)" : ""}</span>
            </span>
            <span className="row__value">{m.role === "admin" ? "Admin" : "Miembro"}</span>
          </div>
        ))}
        {isAdmin && (
          <button className="row row--lead" disabled={busy} onClick={invite}>
            <span className="row__lead"><Icon name="share" size="md" /></span>
            <span className="row__main">
              <span className="row__title">Invitar a alguien</span>
              <span className="row__sub">Un enlace de un solo uso que vence en 7 días.</span>
            </span>
          </button>
        )}
      </div>
      {isAdmin && pending.length > 0 && (
        <>
          <div className="section-header">Invitaciones pendientes</div>
          <div className="list list--inset">
            {pending.map((p) => (
              <div key={p.id} className="row">
                <span className="row__main">
                  <span className="row__title">Enlace sin usar</span>
                  <span className="row__sub">Vence el {fmt.format(new Date(p.expires_at))}</span>
                </span>
                <button className="btn btn--plain btn--sm" onClick={() => revoke(p.id)}>Revocar</button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
