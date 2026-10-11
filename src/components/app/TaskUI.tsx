"use client";
/**
 * Task actions shared by every screen: complete (with the "recién hecha"
 * moment), "La hizo alguien más", skip, snooze, delete and undo, plus the
 * sheets that drive them (actions, ¿quién la hizo?, crear/editar).
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { centerOf, leafBurst, prefersReducedMotion, squash, vibrate } from "@/lib/fx";
import { formatDue } from "@/lib/status";
import { getState, setState, tickNow } from "@/lib/store";
import { AlreadyDoneError, completeTask, deleteTask, restoreTask, skipTask, snoozeTask, undoLast } from "@/lib/tasks";
import { currentAssignee } from "@/lib/types";
import { viewTask } from "@/lib/view";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { CreateTaskSheet } from "@/components/tasks/CreateTaskSheet";

// --- tareas "recién hechas" (anillo vaciándose antes de reordenar) ----------
type Flash = Map<string, number>;
let flash: Flash = new Map();
const flashListeners = new Set<() => void>();
const setFlash = (next: Flash) => {
  flash = next;
  flashListeners.forEach((l) => l());
};
const subscribeFlash = (l: () => void) => {
  flashListeners.add(l);
  return () => flashListeners.delete(l);
};
const emptyFlash: Flash = new Map();
/** Map taskId → progress before completing (the ring animates from it to 0). */
export const useFlash = () => useSyncExternalStore(subscribeFlash, () => flash, () => emptyFlash);

type Source = "home" | "detail";
interface TaskUI {
  complete: (id: string, source: Source, creditTo?: string) => void;
  openActions: (id: string) => void;
  openWho: (id: string, source: Source) => void;
  openCreate: (editId?: string) => void;
  skip: (id: string) => void;
  openSnooze: (id: string) => void;
  remove: (id: string) => void;
}
const Ctx = createContext<TaskUI | null>(null);
export const useTaskUI = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTaskUI fuera de TaskUIProvider");
  return v;
};

const FLASH_MS = 1250;

export function TaskUIProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const router = useRouter();
  const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [sheet, setSheet] = useState<
    | { kind: "actions"; id: string }
    | { kind: "snooze"; id: string }
    | { kind: "who"; id: string; source: Source }
    | { kind: "delete"; id: string }
    | null
  >(null);
  const [create, setCreate] = useState<{ open: boolean; editId?: string }>({ open: false });

  const undo = useCallback(
    (id: string) => {
      const t = pending.current.get(id);
      if (t) {
        clearTimeout(t);
        pending.current.delete(id);
        const next = new Map(flash);
        next.delete(id);
        setFlash(next);
      } else {
        try {
          setState(undoLast(getState(), id));
        } catch {
          return;
        }
      }
      tickNow();
      toast("Deshecho. Todo como antes.");
    },
    [toast],
  );

  const complete = useCallback(
    (id: string, source: Source, creditTo?: string) => {
      const state = getState();
      const task = state.tasks.find((t) => t.id === id);
      if (!task || flash.has(id)) return;
      const now = new Date();
      let result: ReturnType<typeof completeTask>;
      try {
        result = completeTask(state, id, now, { expectedDue: task.nextDueAt, creditTo });
      } catch (e) {
        if (e instanceof AlreadyDoneError) toast("Ya estaba hecha 🐾");
        return;
      }
      vibrate([12, 40, 18]);
      const before = viewTask(state, task, now)?.progress ?? 1;
      setFlash(new Map(flash).set(id, before));

      // efectos sobre el elemento visible
      requestAnimationFrame(() => {
        const ring =
          source === "detail"
            ? document.querySelector("[data-hero-ring]")
            : document.querySelector(`[data-task-card="${id}"] .ring`);
        const card = source === "detail" ? ring : document.querySelector(`[data-task-card="${id}"]`);
        squash(card);
        if (ring) {
          const { x, y } = centerOf(ring);
          setTimeout(() => leafBurst(x, y, source === "detail" ? 18 : 12), prefersReducedMotion() ? 0 : 380);
        }
      });

      const credited = result.creditedTo ? state.members.find((m) => m.id === result.creditedTo) : null;
      const who = creditTo && credited ? ` por ${credited.name}` : "";
      const msg = result.nextDue
        ? `Hecha${who} · próximo: ${formatDue(result.nextDue, state.household.timeZone)}`
        : `Hecha${who}. Pasa a Terminadas.`;
      toast(msg, { action: "Deshacer", onAction: () => undo(id), paw: true, raised: source === "detail" });

      const commit = () => {
        pending.current.delete(id);
        // recalcula sobre el estado actual (pudo cambiar en el intervalo)
        try {
          const latest = getState();
          const t = latest.tasks.find((x) => x.id === id);
          setState(completeTask(latest, id, now, { expectedDue: t?.nextDueAt, creditTo }).state);
        } catch {
          /* ya no aplica */
        }
        const next = new Map(flash);
        next.delete(id);
        setFlash(next);
        tickNow();
      };
      const wait = prefersReducedMotion() ? 500 : FLASH_MS;
      if (source === "detail") {
        pending.current.set(
          id,
          setTimeout(() => {
            commit();
            // vuelve a Inicio solo si la persona sigue en el detalle de esta tarea
            if (location.pathname === `/t/${id}`) router.push("/", { transitionTypes: ["nav-back"] });
          }, wait),
        );
      } else {
        pending.current.set(id, setTimeout(commit, wait));
      }
    },
    [router, toast, undo],
  );

  const skip = useCallback(
    (id: string) => {
      try {
        const { state, nextDue } = skipTask(getState(), id, new Date());
        setState(state);
        tickNow();
        toast(`Saltada · próximo: ${formatDue(nextDue, state.household.timeZone)}`, { action: "Deshacer", onAction: () => undo(id) });
      } catch {
        toast("Las tareas de una vez no se pueden saltar.");
      }
    },
    [toast, undo],
  );

  const snooze = useCallback(
    (id: string, minutes: number, label: string) => {
      const { state, until } = snoozeTask(getState(), id, new Date(), minutes, label);
      setState(state);
      tickNow();
      toast(`Pospuesta a ${formatDue(until, state.household.timeZone)}`, { action: "Deshacer", onAction: () => undo(id) });
    },
    [toast, undo],
  );

  const doDelete = useCallback(
    (id: string) => {
      const title = getState().tasks.find((t) => t.id === id)?.title ?? "";
      setState(deleteTask(getState(), id, new Date()));
      if (location.pathname === `/t/${id}`) router.push("/", { transitionTypes: ["nav-back"] });
      toast(`Borrada «${title}»`, { action: "Deshacer", onAction: () => setState(restoreTask(getState(), id)) });
    },
    [router, toast],
  );

  const api = useMemo<TaskUI>(
    () => ({
      complete,
      skip,
      openActions: (id) => setSheet({ kind: "actions", id }),
      openWho: (id, source) => setSheet({ kind: "who", id, source }),
      openCreate: (editId) => setCreate({ open: true, editId }),
      openSnooze: (id) => setSheet({ kind: "snooze", id }),
      remove: (id) => setSheet({ kind: "delete", id }),
    }),
    [complete, skip],
  );

  const state = sheet ? getState() : null;
  const task = sheet && state ? state.tasks.find((t) => t.id === sheet.id) : undefined;
  const close = () => setSheet(null);
  const afterClose = (fn: () => void) => {
    close();
    setTimeout(fn, 120);
  };

  return (
    <Ctx.Provider value={api}>
      {children}

      {/* Acciones de una tarea (botón "…") */}
      <Sheet open={sheet?.kind === "actions"} onOpenChange={(o) => !o && close()} title="Acciones" bare>
        {task && sheet?.kind === "actions" && (
          <div className="action-sheet">
            <div className="action-sheet__group">
              <div className="action-sheet__title">
                {task.emoji} {task.title}
              </div>
              <button className="action-sheet__btn" onClick={() => afterClose(() => complete(task.id, "home"))}>
                <Icon name="check" size="md" />Hecha
              </button>
              <button className="action-sheet__btn" onClick={() => setSheet({ kind: "who", id: task.id, source: "home" })}>
                <Icon name="hand" size="md" />La hizo alguien más
              </button>
              <button className="action-sheet__btn" onClick={() => setSheet({ kind: "snooze", id: task.id })}>
                <Icon name="snooze" size="md" />Posponer
              </button>
              {task.schedule.type !== "once" && (
                <button className="action-sheet__btn" onClick={() => afterClose(() => skip(task.id))}>
                  <Icon name="skip" size="md" />Saltar esta vez
                </button>
              )}
              <button className="action-sheet__btn" onClick={() => afterClose(() => setCreate({ open: true, editId: task.id }))}>
                <Icon name="edit" size="md" />Editar
              </button>
              <button className="action-sheet__btn action-sheet__btn--danger" onClick={() => setSheet({ kind: "delete", id: task.id })}>
                <Icon name="trash" size="md" />Borrar
              </button>
            </div>
            <div className="action-sheet__group">
              <button className="action-sheet__btn action-sheet__btn--cancel" onClick={close}>Cancelar</button>
            </div>
          </div>
        )}
      </Sheet>

      {/* Posponer */}
      <Sheet open={sheet?.kind === "snooze"} onOpenChange={(o) => !o && close()} title="Posponer" bare>
        {task && (
          <div className="action-sheet">
            <div className="action-sheet__group">
              <div className="action-sheet__title">Posponer «{task.title}»</div>
              <button className="action-sheet__btn" onClick={() => afterClose(() => snooze(task.id, 60, "+1 h"))}>+1 hora</button>
              <button className="action-sheet__btn" onClick={() => afterClose(() => snooze(task.id, 24 * 60, "+1 día"))}>+1 día</button>
              <button className="action-sheet__btn" onClick={() => afterClose(() => snooze(task.id, 3 * 24 * 60, "+3 días"))}>+3 días</button>
            </div>
            <div className="action-sheet__group">
              <button className="action-sheet__btn action-sheet__btn--cancel" onClick={close}>Cancelar</button>
            </div>
          </div>
        )}
      </Sheet>

      {/* Confirmar borrado */}
      <Sheet open={sheet?.kind === "delete"} onOpenChange={(o) => !o && close()} title="Borrar tarea" bare>
        {task && (
          <div className="action-sheet">
            <div className="action-sheet__group">
              <div className="action-sheet__title">
                ¿Borrar «{task.title}»? Desaparece para todos; un admin puede restaurarla desde la Papelera.
              </div>
              <button className="action-sheet__btn action-sheet__btn--danger" onClick={() => afterClose(() => doDelete(task.id))}>
                <Icon name="trash" size="md" />Borrar
              </button>
            </div>
            <div className="action-sheet__group">
              <button className="action-sheet__btn action-sheet__btn--cancel" onClick={close}>Cancelar</button>
            </div>
          </div>
        )}
      </Sheet>

      {/* ¿Quién la hizo? */}
      <Sheet open={sheet?.kind === "who"} onOpenChange={(o) => !o && close()} title="¿Quién la hizo?">
        {task && state && sheet?.kind === "who" && (
          <>
            <div className="sheet__head">
              <button className="btn btn--plain btn--sm" onClick={close}>Cancelar</button>
              <h2 className="sheet__title">¿Quién la hizo?</h2>
              <span />
            </div>
            <p className="t-subhead t-muted" style={{ textAlign: "center", padding: "0 32px" }}>
              {(() => {
                const def = currentAssignee(task.assignment);
                const m = def ? state.members.find((x) => x.id === def) : null;
                return m ? `Si no eliges, el crédito es para ${m.name}, a quien le tocaba.` : "Si no eliges, el crédito es para el Hogar.";
              })()}
            </p>
            <div className="who-grid">
              {state.members.map((m) => (
                <button key={m.id} className="person" onClick={() => afterClose(() => complete(task.id, sheet.source, m.id))}>
                  <Avatar emoji={m.emoji} />
                  {m.name}
                </button>
              ))}
            </div>
            <div style={{ height: "calc(var(--safe-bottom) + 28px)" }} />
          </>
        )}
      </Sheet>

      <CreateTaskSheet
        open={create.open}
        editId={create.editId}
        onOpenChange={(open) => setCreate((c) => ({ ...c, open }))}
        onSaved={(msg) => toast(msg, { paw: true })}
      />
    </Ctx.Provider>
  );
}
