"use client";
import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { vibrate } from "@/lib/fx";
import { getState, setState, useAppState } from "@/lib/store";
import { addTodo, updateTodo } from "@/lib/tasks";
import { HOGAR, type Todo } from "@/lib/types";
import { LukasArt } from "@/components/lukas/LukasArt";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";

type Filter = "all" | "mine" | "soon";

export function TodoScreen() {
  const state = useAppState();
  const toast = useToast();
  const [text, setText] = useState("");
  const [optsOpen, setOptsOpen] = useState(false);
  const [who, setWho] = useState<string | null>(null);
  const [soon, setSoon] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [checking, setChecking] = useState<Set<string>>(new Set());
  const [actionsFor, setActionsFor] = useState<string | null>(null);

  const todos = state?.todos.filter((t) => !t.deletedAt) ?? [];
  const open = todos.filter((t) => !t.doneAt);
  const done = todos.filter((t) => t.doneAt).sort((a, b) => +new Date(b.doneAt!) - +new Date(a.doneAt!));
  const list = open
    .filter((t) => (filter === "mine" ? t.assigneeId === state?.me : filter === "soon" ? t.soon : true))
    .sort((a, b) => Number(b.soon) - Number(a.soon) || +new Date(b.createdAt) - +new Date(a.createdAt));
  const member = (id: string | null) => (id && state?.members.find((m) => m.id === id)) || null;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const r = addTodo(getState(), text, who, soon, new Date());
    setState(r.state);
    setText("");
    if (filter !== "all" && !((filter === "soon" && soon) || (filter === "mine" && who === getState().me))) setFilter("all");
  }

  function toggle(t: Todo) {
    vibrate(10);
    if (t.doneAt) {
      setState(updateTodo(getState(), t.id, { doneAt: null }));
      return;
    }
    setChecking((s) => new Set(s).add(t.id));
    toast(`Hecho: ${t.text}`, {
      action: "Deshacer",
      paw: true,
      onAction: () => setState(updateTodo(getState(), t.id, { doneAt: null })),
    });
    setTimeout(() => {
      setState(updateTodo(getState(), t.id, { doneAt: new Date().toISOString() }));
      setChecking((s) => {
        const n = new Set(s);
        n.delete(t.id);
        return n;
      });
    }, 520);
  }

  const current = actionsFor ? todos.find((t) => t.id === actionsFor) : undefined;
  const closeActions = () => setActionsFor(null);

  const row = (t: Todo) => {
    const isDone = !!t.doneAt || checking.has(t.id);
    const m = member(t.assigneeId);
    return (
      <div className={`todo${isDone ? " is-done" : ""}`}>
        <button className="check" role="checkbox" aria-checked={isDone} aria-label={`${t.doneAt ? "Desmarcar" : "Marcar como hecho"}: ${t.text}`} onClick={() => toggle(t)}>
          <i>
            <svg viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9" /></svg>
          </i>
        </button>
        <span className="todo__emoji" aria-hidden="true">{t.emoji}</span>
        <button className="todo__main" onClick={() => setActionsFor(t.id)}>
          <span className="todo__text">{t.text}</span>
          <span className="todo__meta">
            {m ? `${m.emoji} ${m.name}` : `${HOGAR.emoji} Cualquiera`}
            {t.soon && !t.doneAt && <span className="tag-soon">pronto</span>}
          </span>
        </button>
      </div>
    );
  };

  return (
    <main aria-label="Pendientes de casa">
      <header className="simple-head">
        <h1>Pendientes de casa</h1>
        <p className="summary">
          {!state ? (
            <span className="skeleton skeleton--line" style={{ display: "block", width: "60%", height: 16, marginTop: 4 }} />
          ) : open.length ? (
            <>
              <b>{open.length} por hacer</b>. Sin fecha: se hacen cuando se pueda.
            </>
          ) : (
            "Todo hecho en casa."
          )}
        </p>
      </header>

      <div className="todo-wrap">
        <form className={`quick-add${optsOpen ? " is-open" : ""}`} onSubmit={submit} autoComplete="off">
          <div className="quick-add__row">
            <input
              value={text}
              maxLength={80}
              placeholder="Agregar un pendiente…"
              aria-label="Nuevo pendiente"
              enterKeyHint="done"
              onFocus={() => setOptsOpen(true)}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="icon-btn icon-btn--ink" type="submit" aria-label="Agregar pendiente" disabled={!text.trim()}>
              <Icon name="plus" />
            </button>
          </div>
          <div className="quick-add__opts" role="group" aria-label="Opciones">
            <button type="button" className="chip" aria-pressed={who === null} onClick={() => setWho(null)}>🏡 Cualquiera</button>
            {state?.members.map((m) => (
              <button key={m.id} type="button" className="chip" aria-pressed={who === m.id} onClick={() => setWho(m.id)}>
                {m.emoji} {m.name}
              </button>
            ))}
            <button type="button" className="chip" aria-pressed={soon} onClick={() => setSoon((x) => !x)}>Pronto</button>
          </div>
        </form>

        <nav className="filters" aria-label="Filtros de pendientes">
          {([["all", "Todos"], ["mine", "Míos"], ["soon", "Pronto"]] as const).map(([k, l]) => (
            <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {l}
              {k === "all" && state ? <span className="chip__count">{open.length}</span> : null}
            </button>
          ))}
        </nav>

        {state && list.length > 0 && (
          <div className="todo-group">
            <AnimatePresence initial={false}>
              {list.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.32, ease: [0.7, 0, 0.84, 0] } }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                >
                  {row(t)}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        {state && list.length === 0 && (
          <div className="todo-empty">
            <LukasArt name="peek" />
            <b>{open.length ? "Nada aquí" : "Nada pendiente en casa"}</b>
            {open.length ? "Prueba con «Todos»." : "Cuando aparezca algo, anótalo arriba."}
          </div>
        )}

        {done.length > 0 && (
          <details className="todo-done">
            <summary>
              <Icon name="chevron-right" size="sm" />
              Hechos ({done.length})
            </summary>
            <div className="todo-group">{done.map((t) => <div key={t.id}>{row(t)}</div>)}</div>
          </details>
        )}
      </div>
      <div className="pad-tab" />

      <Sheet open={!!current} onOpenChange={(o) => !o && closeActions()} title="Acciones del pendiente" bare>
        {current && state && (
          <div className="action-sheet">
            <div className="action-sheet__group">
              <div className="action-sheet__title">{current.emoji} {current.text}</div>
              <button className="action-sheet__btn" onClick={() => { closeActions(); setTimeout(() => toggle(current), 120); }}>
                <Icon name="check" size="md" />{current.doneAt ? "Marcar como pendiente" : "Marcar como hecho"}
              </button>
              {!current.doneAt && (
                <button className="action-sheet__btn" onClick={() => { setState(updateTodo(getState(), current.id, { soon: !current.soon })); closeActions(); }}>
                  <Icon name="clock" size="md" />{current.soon ? "Quitar «pronto»" : "Marcar como pronto"}
                </button>
              )}
              {!current.doneAt &&
                [null, ...state.members.map((m) => m.id)]
                  .filter((k) => k !== current.assigneeId)
                  .map((k) => (
                    <button key={k ?? "anyone"} className="action-sheet__btn" onClick={() => { setState(updateTodo(getState(), current.id, { assigneeId: k })); closeActions(); }}>
                      Pasar a {k ? `${member(k)!.emoji} ${member(k)!.name}` : "🏡 Cualquiera"}
                    </button>
                  ))}
              <button
                className="action-sheet__btn action-sheet__btn--danger"
                onClick={() => {
                  const t = current;
                  setState(updateTodo(getState(), t.id, { deletedAt: new Date().toISOString() }));
                  closeActions();
                  toast(`Borrado: ${t.text}`, { action: "Deshacer", onAction: () => setState(updateTodo(getState(), t.id, { deletedAt: null })) });
                }}
              >
                <Icon name="trash" size="md" />Borrar
              </button>
            </div>
            <div className="action-sheet__group">
              <button className="action-sheet__btn action-sheet__btn--cancel" onClick={closeActions}>Cancelar</button>
            </div>
          </div>
        )}
      </Sheet>
    </main>
  );
}
