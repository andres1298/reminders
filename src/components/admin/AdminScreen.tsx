"use client";
/**
 * Panel de super admin: hogares y personas, nunca sus tareas (la base de datos
 * no se las deja leer). Cada acción es una función admin_* en Supabase.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminCreateHousehold, adminNewAdminLink } from "@/app/actions/admin";
import { adminErrorMessage, parseOverview, type AdminHousehold, type AdminMember } from "@/lib/admin";
import { useSync } from "@/components/app/DataProvider";
import { InviteLink } from "@/components/app/InviteLink";
import { HouseholdFields, newHouseholdDraft } from "@/components/auth/WelcomeForm";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";

type Picked = { household: AdminHousehold; member: AdminMember };
type Panel =
  | { kind: "create" }
  | { kind: "member"; pick: Picked }
  | { kind: "remove"; pick: Picked }
  | { kind: "disable"; household: AdminHousehold }
  | null;

const tasksLabel = (n: number) => (n === 1 ? "1 tarea" : `${n} tareas`);

export function AdminScreen() {
  const sync = useSync();
  const router = useRouter();
  const toast = useToast();
  const [homes, setHomes] = useState<AdminHousehold[] | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [link, setLink] = useState<{ householdId: string; url: string } | null>(null);
  const [draft, setDraft] = useState(() => newHouseholdDraft(""));
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await sync.db.rpc("admin_overview");
    if (error) {
      if (error.message === "forbidden") router.replace("/");
      else toast(adminErrorMessage(error));
      return;
    }
    setHomes(parseOverview(data));
  }, [router, sync, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    void load();
  }, [load]);

  /** Corre una acción, muestra el error si lo hay y recarga el panel. */
  async function act(rpc: string, args: Record<string, unknown>, done: string) {
    setBusy(true);
    const { error } = await sync.db.rpc(rpc, args);
    setBusy(false);
    setPanel(null);
    toast(error ? adminErrorMessage(error) : done, error ? {} : { paw: true });
    await load();
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await adminCreateHousehold(draft);
    setBusy(false);
    if (!r.ok) return toast(r.message);
    setPanel(null);
    setDraft(newHouseholdDraft(""));
    await load();
    setLink({ householdId: r.householdId, url: r.url });
  }

  async function newLink(h: AdminHousehold) {
    setBusy(true);
    const r = await adminNewAdminLink(h.id);
    setBusy(false);
    if (!r.ok) return toast(r.message);
    setLink({ householdId: h.id, url: r.url });
  }

  const remove = (p: Picked, tasks: "delete" | "reassign" | "anyone", to?: AdminMember) =>
    act(
      "admin_remove_member",
      { p_household: p.household.id, p_user: p.member.userId, p_tasks: tasks, p_to: to?.userId ?? null },
      `${p.member.name} ya no es de ${p.household.name}`,
    );

  return (
    <main aria-label="Panel de administración">
      <header className="simple-head admin-head">
        <Link className="btn btn--plain btn--sm" href="/ajustes">
          <Icon name="back" size="sm" />Ajustes
        </Link>
        <h1>Panel</h1>
        <p className="t-subhead t-muted">Hogares y personas. Las tareas de cada hogar son privadas: aquí solo ves cuántas tiene cada quien.</p>
        <button className="btn btn--filled btn--sm" onClick={() => setPanel({ kind: "create" })}>
          <Icon name="plus" size="sm" />Crear hogar
        </button>
      </header>

      {homes === null && <div className="skeleton skeleton--card" style={{ margin: "16px var(--margin)", height: 160 }} aria-busy="true" />}
      {homes?.length === 0 && <p className="section-footer">Todavía no hay hogares.</p>}

      {homes?.map((h) => (
        <section key={h.id} aria-label={h.name}>
          <div className="section-header">
            {h.emoji} {h.name}
            {h.disabled && <span className="admin-badge">Desactivado</span>}
          </div>
          {link?.householdId === h.id && (
            <InviteLink url={link.url} title={`Te invito a ${h.emoji} ${h.name} en Lukas`} onDone={() => setLink(null)} />
          )}
          <div className="list list--inset">
            {h.members.length === 0 && (
              <div className="row">
                <span className="row__main">
                  <span className="row__sub">Sin miembros todavía: comparte un enlace de admin.</span>
                </span>
              </div>
            )}
            {h.members.map((m) => (
              <button key={m.userId} className="row row--lead" onClick={() => setPanel({ kind: "member", pick: { household: h, member: m } })}>
                <span className="row__lead"><Avatar emoji={m.emoji} /></span>
                <span className="row__main">
                  <span className="row__title">{m.name}</span>
                  <span className="row__sub">{m.role === "admin" ? "Admin" : "Miembro"} · {tasksLabel(m.tasks)}</span>
                </span>
                <Icon name="more-h" className="row__chev" />
              </button>
            ))}
            <button className="row row--lead" disabled={busy} onClick={() => newLink(h)}>
              <span className="row__lead"><Icon name="link" size="md" /></span>
              <span className="row__main"><span className="row__title">Nuevo enlace de admin</span></span>
            </button>
            {h.disabled ? (
              <button className="row row--lead" disabled={busy} onClick={() => act("admin_set_household_disabled", { p_household: h.id, p_disabled: false }, `${h.name} está activo otra vez`)}>
                <span className="row__lead"><Icon name="play" size="md" /></span>
                <span className="row__main"><span className="row__title">Reactivar hogar</span></span>
              </button>
            ) : (
              <button className="row row--lead" disabled={busy} onClick={() => setPanel({ kind: "disable", household: h })}>
                <span className="row__lead"><Icon name="pause" size="md" /></span>
                <span className="row__main"><span className="row__title" style={{ color: "var(--danger)" }}>Desactivar hogar</span></span>
              </button>
            )}
          </div>
        </section>
      ))}
      <div style={{ height: "calc(var(--safe-bottom) + 40px)" }} />

      {/* Crear hogar */}
      <Sheet open={panel?.kind === "create"} onOpenChange={(o) => !o && setPanel(null)} title="Crear hogar">
        <form onSubmit={create}>
          <div className="sheet__head">
            <button type="button" className="btn btn--plain btn--sm" onClick={() => setPanel(null)}>Cancelar</button>
            <h2 className="sheet__title">Crear hogar</h2>
            <button className="btn btn--filled btn--sm" style={{ justifySelf: "end" }} disabled={busy || !draft.name.trim()}>Crear</button>
          </div>
          <div className="sheet__body auth-form" data-vaul-no-drag="">
            <p className="field__help">El hogar es para otra persona: tú no quedas como miembro. Al crearlo recibes un enlace para que entre como admin.</p>
            <HouseholdFields value={draft} onChange={setDraft} />
          </div>
        </form>
      </Sheet>

      {/* Acciones de un miembro */}
      <Sheet open={panel?.kind === "member"} onOpenChange={(o) => !o && setPanel(null)} title="Acciones" bare>
        {panel?.kind === "member" && (
          <div className="action-sheet">
            <div className="action-sheet__group">
              <div className="action-sheet__title">
                {panel.pick.member.emoji} {panel.pick.member.name} · {panel.pick.household.name}
              </div>
              {panel.pick.member.role === "admin" ? (
                <button className="action-sheet__btn" disabled={busy} onClick={() => act("admin_set_role", { p_household: panel.pick.household.id, p_user: panel.pick.member.userId, p_role: "member" }, `${panel.pick.member.name} ya no es admin`)}>
                  <Icon name="user" size="md" />Quitar admin
                </button>
              ) : (
                <button className="action-sheet__btn" disabled={busy} onClick={() => act("admin_set_role", { p_household: panel.pick.household.id, p_user: panel.pick.member.userId, p_role: "admin" }, `${panel.pick.member.name} ahora es admin`)}>
                  <Icon name="users" size="md" />Hacer admin
                </button>
              )}
              <button className="action-sheet__btn action-sheet__btn--danger" onClick={() => setPanel({ kind: "remove", pick: panel.pick })}>
                <Icon name="trash" size="md" />Quitar del hogar
              </button>
            </div>
            <div className="action-sheet__group">
              <button className="action-sheet__btn action-sheet__btn--cancel" onClick={() => setPanel(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </Sheet>

      {/* Quitar del hogar: qué pasa con sus tareas */}
      <Sheet open={panel?.kind === "remove"} onOpenChange={(o) => !o && setPanel(null)} title="Quitar del hogar" bare>
        {panel?.kind === "remove" && (
          <div className="action-sheet">
            <div className="action-sheet__group">
              {panel.pick.member.tasks === 0 ? (
                <>
                  <div className="action-sheet__title">¿Quitar a {panel.pick.member.name} de {panel.pick.household.name}?</div>
                  <button className="action-sheet__btn action-sheet__btn--danger" disabled={busy} onClick={() => remove(panel.pick, "anyone")}>
                    Quitar
                  </button>
                </>
              ) : (
                <>
                  <div className="action-sheet__title">
                    {panel.pick.member.name} tiene {tasksLabel(panel.pick.member.tasks)} asignada{panel.pick.member.tasks === 1 ? "" : "s"}. ¿Qué pasa con ellas?
                  </div>
                  {panel.pick.household.members
                    .filter((m) => m.userId !== panel.pick.member.userId)
                    .map((m) => (
                      <button key={m.userId} className="action-sheet__btn" disabled={busy} onClick={() => remove(panel.pick, "reassign", m)}>
                        {m.emoji} Pasarlas a {m.name}
                      </button>
                    ))}
                  <button className="action-sheet__btn" disabled={busy} onClick={() => remove(panel.pick, "anyone")}>
                    🏡 Cualquiera
                  </button>
                  <button className="action-sheet__btn action-sheet__btn--danger" disabled={busy} onClick={() => remove(panel.pick, "delete")}>
                    <Icon name="trash" size="md" />Borrarlas
                  </button>
                </>
              )}
            </div>
            <div className="action-sheet__group">
              <button className="action-sheet__btn action-sheet__btn--cancel" onClick={() => setPanel(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </Sheet>

      {/* Confirmar desactivar */}
      <Sheet open={panel?.kind === "disable"} onOpenChange={(o) => !o && setPanel(null)} title="Desactivar hogar" bare>
        {panel?.kind === "disable" && (
          <div className="action-sheet">
            <div className="action-sheet__group">
              <div className="action-sheet__title">¿Desactivar {panel.household.name}? Sus miembros dejan de verlo hasta que lo reactives.</div>
              <button className="action-sheet__btn action-sheet__btn--danger" disabled={busy} onClick={() => act("admin_set_household_disabled", { p_household: panel.household.id, p_disabled: true }, `${panel.household.name} está desactivado`)}>
                <Icon name="pause" size="md" />Desactivar
              </button>
            </div>
            <div className="action-sheet__group">
              <button className="action-sheet__btn action-sheet__btn--cancel" onClick={() => setPanel(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </Sheet>
    </main>
  );
}
