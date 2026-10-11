"use client";
/** Ajustes → Cuenta: nombre y emoji visibles, y cerrar sesión. */
import { useState, type FormEvent } from "react";
import { endSession, useAppState } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { useSync } from "./DataProvider";

export function AccountCard() {
  const state = useAppState();
  const sync = useSync();
  const toast = useToast();
  const me = state?.members.find((m) => m.id === state.me);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!state || !name.trim()) return;
    const { error } = await sync.db
      .from("profiles")
      .update({ display_name: name.trim().slice(0, 40), avatar_emoji: emoji.trim() || "🙂" })
      .eq("id", state.me);
    if (error) return toast("No se pudo guardar. Intenta otra vez");
    setEditing(false);
    await sync.refresh();
    toast("Listo, así te ven en el hogar.", { paw: true });
  }

  async function signOut() {
    await sync.db.auth.signOut();
    endSession();
    location.replace("/entrar");
  }

  if (!me) return null;
  return (
    <div className="list list--inset">
      {editing ? (
        <form className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 12, padding: "14px 16px" }} onSubmit={save}>
          <label className="field">
            <span className="field__label">Tu nombre</span>
            <input className="input" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Tu emoji</span>
            <input className="input" maxLength={8} value={emoji} onChange={(e) => setEmoji(e.target.value)} />
          </label>
          <span style={{ display: "flex", gap: 8 }}>
            <button className="btn btn--filled btn--sm">Guardar</button>
            <button type="button" className="btn btn--plain btn--sm" onClick={() => setEditing(false)}>Cancelar</button>
          </span>
        </form>
      ) : (
        <button
          className="row row--lead"
          onClick={() => {
            setName(me.name);
            setEmoji(me.emoji);
            setEditing(true);
          }}
        >
          <span className="row__lead"><Avatar emoji={me.emoji} /></span>
          <span className="row__main">
            <span className="row__title">{me.name}</span>
            <span className="row__sub">Toca para cambiar tu nombre o emoji</span>
          </span>
        </button>
      )}
      <button className="row" onClick={signOut}>
        <span className="row__main">
          <span className="row__title" style={{ color: "var(--danger)" }}>Cerrar sesión</span>
        </span>
      </button>
    </div>
  );
}
