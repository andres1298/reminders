"use client";
/** Primer ingreso sin hogar: crear uno (queda como admin) con su lista "General". */
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useSync } from "@/components/app/DataProvider";

const EMOJIS = ["🏡", "🏠", "🏘️", "🌵", "🪴", "🐱"];
const DEFAULT_TZ = "America/Costa_Rica";

export interface HouseholdDraft {
  name: string;
  emoji: string;
  timezone: string;
}

export const newHouseholdDraft = (name = "Casa"): HouseholdDraft => ({ name, emoji: EMOJIS[0], timezone: DEFAULT_TZ });

/** Nombre, emoji y zona horaria de un hogar (bienvenida y panel de administración). */
export function HouseholdFields({ value, onChange }: { value: HouseholdDraft; onChange: (v: HouseholdDraft) => void }) {
  const [zones] = useState(() => Intl.supportedValuesOf("timeZone"));
  const set = <K extends keyof HouseholdDraft>(k: K, v: HouseholdDraft[K]) => onChange({ ...value, [k]: v });
  return (
    <>
      <label className="field">
        <span className="field__label">Nombre del hogar</span>
        <input className="input" required maxLength={40} value={value.name} onChange={(e) => set("name", e.target.value)} />
      </label>
      <fieldset className="field">
        <legend className="field__label">Emoji</legend>
        <div className="welcome-emojis">
          {EMOJIS.map((x) => (
            <button key={x} type="button" className="chip" aria-pressed={x === value.emoji} onClick={() => set("emoji", x)}>
              {x}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span className="field__label">Zona horaria</span>
        <select className="input" value={value.timezone} onChange={(e) => set("timezone", e.target.value)}>
          {zones.map((z) => (
            <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
          ))}
        </select>
        <span className="field__help">Las tareas vencen a la hora de esta zona.</span>
      </label>
    </>
  );
}

export function WelcomeForm() {
  const sync = useSync();
  const router = useRouter();
  const [draft, setDraft] = useState(() => newHouseholdDraft());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = draft.name.trim().slice(0, 40);
    if (!clean) return;
    setBusy(true);
    setError("");
    const db = sync.db;
    const { data: householdId, error: e1 } = await db.rpc("create_household", { p_name: clean, p_emoji: draft.emoji, p_timezone: draft.timezone });
    const { error: e2 } = e1
      ? { error: e1 }
      : await db.from("lists").insert({ household_id: householdId, name: "General", emoji: "📌", position: 0 });
    if (e2) {
      setError("No se pudo crear el hogar. Intenta otra vez");
      setBusy(false);
      return;
    }
    await sync.refresh();
    router.replace("/");
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <HouseholdFields value={draft} onChange={setDraft} />
      {error && <p className="field__help is-error" role="alert">{error}</p>}
      <button className="btn btn--filled btn--lg btn--block" disabled={busy}>
        {busy ? "Creando…" : "Crear mi hogar"}
      </button>
      <p className="field__help">Si instalas la app, entra una vez con tu correo y contraseña.</p>
    </form>
  );
}
