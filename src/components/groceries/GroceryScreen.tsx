"use client";
/**
 * Súper: la lista de compras del hogar y el historial del que se arma.
 * Tocar en la lista tacha; "Terminar compra" saca lo tachado y lo cuenta.
 */
import { useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { vibrate } from "@/lib/fx";
import {
  CATEGORIES,
  addGrocery,
  categoryInfo,
  finishShopping,
  historyGroups,
  listGroups,
  nameKey,
  removeFromHistory,
  restoreToHistory,
  searchHistory,
  suggestCategory,
  toggleChecked,
  updateGrocery,
  type GroceryCategory,
} from "@/lib/groceries";
import { useAppState } from "@/lib/store";
import { patchGrocery, rpcAddGrocery, rpcFinishShopping, rpcSetGroceryDeleted } from "@/lib/supabase/remote";
import type { GroceryItem } from "@/lib/types";
import { useSync } from "@/components/app/DataProvider";
import { LukasArt } from "@/components/lukas/LukasArt";
import { Icon } from "@/components/ui/Icon";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";

type View = "list" | "history";

/** La nota crece con el texto: de 2 a 5 líneas, luego hace scroll. */
function growTextarea(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 5 * 22 + 20)}px`;
}
type Panel = { kind: "item"; id: string } | { kind: "edit"; id: string } | { kind: "category"; id: string | null } | null;

export function GroceryScreen() {
  const state = useAppState();
  const sync = useSync();
  const toast = useToast();
  const [view, setView] = useState<View>("list");
  const [text, setText] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [chosenCategory, setChosenCategory] = useState<GroceryCategory | null>(null);
  const [optsOpen, setOptsOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [editQty, setEditQty] = useState("");
  const [editNote, setEditNote] = useState("");
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // la nota crece con el texto (y se encoge al vaciarse después de agregar)
  useLayoutEffect(() => {
    if (noteRef.current) growTextarea(noteRef.current);
  }, [note, optsOpen]);

  const items = useMemo(() => state?.groceries ?? [], [state]);
  const groups = useMemo(() => listGroups(items), [items]);
  const history = useMemo(() => historyGroups(items), [items]);
  const suggestions = useMemo(() => searchHistory(items, text), [items, text]);
  const onList = items.filter((i) => i.onList);
  const checked = onList.filter((i) => i.checkedAt).length;
  const category = chosenCategory ?? suggestCategory(text);
  const current = panel && panel.kind !== "category" ? items.find((i) => i.id === panel.id) : undefined;

  function add(name: string, cat: GroceryCategory, qty = quantity, nt = note) {
    if (!name.trim()) return;
    let added: GroceryItem | undefined;
    try {
      sync.run(
        (s) => {
          const r = addGrocery(s, { name, category: cat, quantity: qty, note: nt }, new Date());
          added = r.item;
          return r.state;
        },
        (db, s) => rpcAddGrocery(db, added!, s.household.id),
      );
    } catch {
      return;
    }
    vibrate(10);
    setText("");
    setQuantity("");
    setNote("");
    setChosenCategory(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    // si ya está en el historial, conserva su categoría (salvo que se haya elegido otra)
    const exact = items.find((i) => i.nameKey === nameKey(text));
    add(text, chosenCategory ?? exact?.category ?? category);
  }

  function toggle(i: GroceryItem) {
    vibrate(10);
    let next: GroceryItem | undefined;
    sync.run(
      (s) => {
        const r = toggleChecked(s, i.id, new Date());
        next = r.item;
        return r.state;
      },
      (db) => patchGrocery(db, i.id, { checked_at: next!.checkedAt }),
    );
  }

  function finish() {
    let count = 0;
    sync.run(
      (s) => {
        const r = finishShopping(s, new Date());
        count = r.count;
        return r.state;
      },
      (db, s) => rpcFinishShopping(db, s.household.id),
    );
    toast(`Compra terminada · ${count} ${count === 1 ? "artículo" : "artículos"}`, { paw: true });
  }

  function removeFromList(i: GroceryItem) {
    sync.run((s) => updateGrocery(s, i.id, { onList: false }), (db) => patchGrocery(db, i.id, { on_list: false, checked_at: null }));
  }

  function forget(i: GroceryItem) {
    sync.run((s) => removeFromHistory(s, i.id), (db) => rpcSetGroceryDeleted(db, i.id, true));
    toast(`Borrado del historial: ${i.name}`, {
      action: "Deshacer",
      // por la cola (va después del borrado) y vuelve tal como estaba, también a la lista
      onAction: () =>
        sync.run(
          (s) => restoreToHistory(s, i),
          async (db) => {
            await rpcSetGroceryDeleted(db, i.id, false);
            if (i.onList) await patchGrocery(db, i.id, { on_list: true, quantity: i.quantity, note: i.note, checked_at: i.checkedAt });
          },
        ),
    });
  }

  function setCategory(id: string | null, cat: GroceryCategory) {
    setPanel(null);
    if (id === null) return setChosenCategory(cat);
    sync.run((s) => updateGrocery(s, id, { category: cat }), (db) => patchGrocery(db, id, { category: cat }));
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!current) return;
    const quantity = editQty.trim().slice(0, 20) || null;
    const note = editNote.trim().slice(0, 80) || null;
    sync.run((s) => updateGrocery(s, current.id, { quantity, note }), (db) => patchGrocery(db, current.id, { quantity, note }));
    setPanel(null);
  }

  const detail = (i: GroceryItem) => [i.quantity, i.note].filter(Boolean).join(" · ");

  return (
    <main aria-label="Súper">
      <header className="simple-head">
        <h1>Súper</h1>
        <p className="summary">
          {!state ? (
            <span className="skeleton skeleton--line" style={{ display: "block", width: "60%", height: 16, marginTop: 4 }} />
          ) : onList.length ? (
            <>
              <b>{onList.length - checked} por comprar</b>
              {checked > 0 && ` · ${checked} en el carrito`}
            </>
          ) : (
            "La lista está vacía."
          )}
        </p>
      </header>

      <div className="todo-wrap">
        <form className={`quick-add${optsOpen ? " is-open" : ""}`} onSubmit={submit} autoComplete="off">
          <div className="quick-add__row">
            <input
              value={text}
              maxLength={60}
              placeholder="Agregar…"
              aria-label="Agregar a la lista"
              enterKeyHint="done"
              onFocus={() => setOptsOpen(true)}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="icon-btn icon-btn--ink" type="submit" aria-label="Agregar a la lista" disabled={!text.trim()}>
              <Icon name="plus" />
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="grocery-suggest" role="listbox" aria-label="Del historial">
              {suggestions.map((s) => (
                <button key={s.id} type="button" className="chip" onClick={() => add(s.name, s.category)}>
                  {categoryInfo(s.category).emoji} {s.name}
                  {s.onList && <span className="chip__count">en la lista</span>}
                </button>
              ))}
            </div>
          )}
          <div className="quick-add__opts grocery-opts" role="group" aria-label="Opciones">
            <div className="grocery-opts__row">
              <button type="button" className="chip grocery-opts__cat" onClick={() => setPanel({ kind: "category", id: null })} aria-label={`Categoría: ${categoryInfo(category).name}. Cambiar`}>
                {categoryInfo(category).emoji} {categoryInfo(category).name}
                <Icon name="chevron-down" size="sm" />
              </button>
              <input className="grocery-field" value={quantity} maxLength={20} placeholder="Cantidad" aria-label="Cantidad" enterKeyHint="next" onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <textarea
              className="grocery-field grocery-field--note"
              value={note}
              maxLength={80}
              rows={2}
              placeholder="Nota (opcional): marca, tamaño, dónde está…"
              aria-label="Nota"
              ref={noteRef}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </form>

        <div style={{ padding: "4px var(--margin) 8px" }}>
          <Segmented
            label="Vista"
            value={view}
            onChange={setView}
            options={[
              { value: "list", label: `Lista${onList.length ? ` (${onList.length})` : ""}` },
              { value: "history", label: "Historial" },
            ]}
          />
        </div>

        {state && view === "list" && (
          <>
            {groups.map((g) => (
              <section key={g.category.key} aria-label={g.category.name}>
                <div className="section-header">{g.category.emoji} {g.category.name}</div>
                <div className="todo-group">
                  {g.items.map((i) => (
                    <div key={i.id} className={`todo${i.checkedAt ? " is-done" : ""}`}>
                      <button className="check" role="checkbox" aria-checked={!!i.checkedAt} aria-label={`${i.checkedAt ? "Desmarcar" : "Marcar"}: ${i.name}`} onClick={() => toggle(i)}>
                        <i>
                          <svg viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9" /></svg>
                        </i>
                      </button>
                      <button className="todo__main" onClick={() => toggle(i)}>
                        <span className="todo__text">{i.name}</span>
                        {detail(i) && <span className="todo__meta">{detail(i)}</span>}
                      </button>
                      <button className="icon-btn icon-btn--ghost" aria-label={`Opciones de ${i.name}`} onClick={() => setPanel({ kind: "item", id: i.id })}>
                        <Icon name="more-h" size="md" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {groups.length === 0 && (
              <div className="todo-empty">
                <LukasArt name="peek" />
                <b>La lista está vacía</b>
                Agrega lo que haga falta o tráelo del historial.
              </div>
            )}
            {checked > 0 && (
              <div className="grocery-finish">
                <button className="btn btn--filled btn--lg btn--block" onClick={finish}>
                  <Icon name="cart" size="sm" />Terminar compra ({checked})
                </button>
              </div>
            )}
          </>
        )}

        {state && view === "history" && (
          <>
            {history.map((g) => (
              <section key={g.category.key} aria-label={g.category.name}>
                <div className="section-header">{g.category.emoji} {g.category.name}</div>
                <div className="list list--inset">
                  {g.items.map((i) => (
                    <div key={i.id} className="row">
                      <button className="row__main grocery-history__add" disabled={i.onList} onClick={() => add(i.name, i.category, "", "")}>
                        <span className="row__title">{i.name}</span>
                        <span className="row__sub">{i.onList ? "En la lista" : i.timesBought ? `Comprado ${i.timesBought} ${i.timesBought === 1 ? "vez" : "veces"}` : "Toca para agregar"}</span>
                      </button>
                      <button className="icon-btn icon-btn--ghost" aria-label={`Opciones de ${i.name}`} onClick={() => setPanel({ kind: "item", id: i.id })}>
                        <Icon name="more-h" size="md" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {history.length === 0 && (
              <div className="todo-empty">
                <LukasArt name="peek" />
                <b>Todavía no hay historial</b>
                Lo que agregues a la lista queda aquí para la próxima.
              </div>
            )}
          </>
        )}
      </div>
      <div className="pad-tab" />

      {/* Opciones de un artículo */}
      <Sheet open={panel?.kind === "item"} onOpenChange={(o) => !o && setPanel(null)} title="Opciones" bare>
        {current && panel?.kind === "item" && (
          <div className="action-sheet">
            <div className="action-sheet__group">
              <div className="action-sheet__title">{categoryInfo(current.category).emoji} {current.name}</div>
              {current.onList && (
                <button
                  className="action-sheet__btn"
                  onClick={() => {
                    setEditQty(current.quantity ?? "");
                    setEditNote(current.note ?? "");
                    setPanel({ kind: "edit", id: current.id });
                  }}
                >
                  <Icon name="edit" size="md" />Cantidad y nota
                </button>
              )}
              <button className="action-sheet__btn" onClick={() => setPanel({ kind: "category", id: current.id })}>
                <Icon name="list" size="md" />Cambiar categoría
              </button>
              {current.onList && (
                <button className="action-sheet__btn" onClick={() => { removeFromList(current); setPanel(null); }}>
                  <Icon name="close" size="md" />Quitar de la lista
                </button>
              )}
              <button className="action-sheet__btn action-sheet__btn--danger" onClick={() => { forget(current); setPanel(null); }}>
                <Icon name="trash" size="md" />Borrar del historial
              </button>
            </div>
            <div className="action-sheet__group">
              <button className="action-sheet__btn action-sheet__btn--cancel" onClick={() => setPanel(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </Sheet>

      {/* Cantidad y nota */}
      <Sheet open={panel?.kind === "edit"} onOpenChange={(o) => !o && setPanel(null)} title="Cantidad y nota">
        {current && (
          <form onSubmit={saveEdit}>
            <div className="sheet__head">
              <button type="button" className="btn btn--plain btn--sm" onClick={() => setPanel(null)}>Cancelar</button>
              <h2 className="sheet__title">{current.name}</h2>
              <button className="btn btn--filled btn--sm" style={{ justifySelf: "end" }}>Guardar</button>
            </div>
            <div className="sheet__body auth-form" data-vaul-no-drag="">
              <label className="field">
                <span className="field__label">Cantidad</span>
                <input className="input" maxLength={20} placeholder="2, 1 kg, 6 latas…" value={editQty} onChange={(e) => setEditQty(e.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">Nota</span>
                <textarea
                  className="textarea"
                  rows={3}
                  maxLength={80}
                  placeholder="La marca sin lactosa…"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                />
              </label>
            </div>
          </form>
        )}
      </Sheet>

      {/* Categoría */}
      <Sheet open={panel?.kind === "category"} onOpenChange={(o) => !o && setPanel(null)} title="Categoría" bare>
        {panel?.kind === "category" && (
          <div className="action-sheet">
            <div className="action-sheet__group">
              <div className="action-sheet__title">Categoría</div>
              {CATEGORIES.map((c) => (
                <button key={c.key} className="action-sheet__btn" onClick={() => setCategory(panel.id, c.key)}>
                  {c.emoji} {c.name}
                </button>
              ))}
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

