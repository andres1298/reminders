"use client";
import { useMemo, useState, type CSSProperties } from "react";
import { TZDate } from "@date-fns/tz";
import type { IntervalUnit, Anchor, Schedule } from "@/lib/schedule";
import { getState, tickNow } from "@/lib/store";
import { saveTask } from "@/lib/supabase/remote";
import { createTask, updateTask, type TaskInput } from "@/lib/tasks";
import type { Task } from "@/lib/types";
import { useSync } from "@/components/app/DataProvider";
import { dueLabel } from "@/lib/status";
import { CARD_COLORS, type Assignment, type CardColor } from "@/lib/types";
import { scheduleText } from "@/lib/view";
import { Sheet } from "@/components/ui/Sheet";
import { Segmented } from "@/components/ui/Segmented";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";

const EMOJI: Record<string, string[]> = {
  casa: ["🧹", "🧽", "🫧", "🧺", "🛏️", "🗑️", "♻️", "🪟", "🚿", "🍽️", "🧼", "🪣"],
  lukas: ["🐱", "🐈", "🪣", "💊", "💉", "🐟", "🧶", "🐾"],
  plantas: ["🌱", "🪴", "🌿", "💧", "🌵", "🍃", "🌻", "🪻"],
  pagos: ["💸", "🏠", "🧾", "💡", "📶", "💳", "🔌", "📮"],
  otros: ["🛒", "🚗", "🔋", "🧯", "📦", "🎂", "🦷", "✂️"],
};
const CATEGORY: [RegExp, string][] = [
  [/reg|plant|maceta|abon|jard/, "plantas"],
  [/lukas|gat|arena|vet|vacun|desparas|pulga/, "lukas"],
  [/pag|apart|alquil|luz|agua|internet|recib|factur/, "pagos"],
  [/barr|limp|lav|basur|sában|saban|cama|ropa|plat|coc|baño|ventan|trapear/, "casa"],
];
const KEY_EMOJI: [RegExp, string][] = [
  [/basur/, "🗑️"], [/reg/, "🌱"], [/barr/, "🧹"], [/arena/, "🪣"], [/sában|saban|cama/, "🛏️"], [/ropa|lav/, "🧺"],
  [/plat|coc/, "🍽️"], [/ventan/, "🪟"], [/vacun/, "💉"], [/desparas|pastill/, "💊"], [/apart|alquil/, "🏠"], [/luz/, "💡"],
  [/internet/, "📶"], [/compr|súper|super/, "🛒"], [/plant/, "🪴"], [/lukas|gat/, "🐱"], [/pag/, "💸"],
];
const WD_LETTERS: [number, string, string][] = [
  [1, "L", "lunes"], [2, "M", "martes"], [3, "M", "miércoles"], [4, "J", "jueves"], [5, "V", "viernes"], [6, "S", "sábado"], [0, "D", "domingo"],
];

type Kind = Schedule["type"];
interface Form {
  emoji: string;
  userEmoji: boolean;
  title: string;
  description: string;
  kind: Kind;
  every: number;
  unit: IntervalUnit;
  anchor: Anchor;
  weekdays: number[];
  everyWeeks: number;
  day: number | "last";
  date: string;
  /** YYYY-MM-DD: primer día en que puede tocar (no aplica a "Una vez"). */
  startsOn: string;
  time: string;
  who: string; // "anyone" | member id
  rotation: boolean;
  listId: string;
  color: CardColor;
}

function todayIn(tz: string) {
  const t = new TZDate(Date.now(), tz);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "hoy" · "2 nov" · "2 nov 2027" */
function startLabel(ymd: string, today: string) {
  if (ymd === today) return "hoy";
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}${y !== Number(today.slice(0, 4)) ? ` ${y}` : ""}`;
}

function initialForm(editId?: string): Form {
  const s = getState();
  const base: Form = {
    emoji: "✨", userEmoji: false, title: "", description: "", kind: "interval", every: 3, unit: "day", anchor: "completion",
    weekdays: [2, 4], everyWeeks: 1, day: 3, date: todayIn(s.household.timeZone),
    startsOn: todayIn(s.household.timeZone), time: "09:00", who: "anyone", rotation: false,
    listId: s.lists[0]?.id ?? "", color: "none",
  };
  const t = editId ? s.tasks.find((x) => x.id === editId) : undefined;
  if (!t) return base;
  const sc = t.schedule;
  return {
    ...base,
    emoji: t.emoji, userEmoji: true, title: t.title, description: t.description, kind: sc.type,
    ...(sc.type === "interval" ? { every: sc.every, unit: sc.unit, anchor: sc.anchor } : {}),
    ...(sc.type === "weekly" ? { weekdays: sc.weekdays, everyWeeks: sc.everyWeeks } : {}),
    ...(sc.type === "monthly" ? { day: sc.day } : {}),
    ...(sc.type === "once" ? { date: sc.date } : {}),
    startsOn: t.startsOn,
    time: t.dueTime,
    who: t.assignment.mode === "anyone" ? "anyone" : t.assignment.mode === "fixed" ? t.assignment.userId : t.assignment.current,
    rotation: t.assignment.mode === "rotation",
    listId: t.listId, color: t.color,
  };
}

function toSchedule(f: Form): Schedule {
  if (f.kind === "interval") return { type: "interval", every: f.every, unit: f.unit, anchor: f.anchor };
  if (f.kind === "weekly") return { type: "weekly", weekdays: f.weekdays, everyWeeks: f.everyWeeks };
  if (f.kind === "monthly") return { type: "monthly", day: f.day, everyMonths: 1 };
  return { type: "once", date: f.date };
}

export function CreateTaskSheet(props: {
  open: boolean;
  editId?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string) => void;
}) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange} title={props.editId ? "Editar tarea" : "Nueva tarea"}>
      {props.open && <CreateTaskForm key={props.editId ?? "new"} {...props} />}
    </Sheet>
  );
}

function CreateTaskForm({ editId, onOpenChange, onSaved }: { editId?: string; onOpenChange: (o: boolean) => void; onSaved: (m: string) => void }) {
  const state = getState();
  const sync = useSync();
  const [f, setF] = useState<Form>(() => initialForm(editId));
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState("");
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const schedule = toSchedule(f);
  const today = todayIn(state.household.timeZone);
  const valid = f.title.trim().length > 0 && !(f.kind === "weekly" && f.weekdays.length === 0);
  const whoText = f.rotation
    ? `Rotan ${state.members.map((m) => m.name).join(" y ")}`
    : f.who === "anyone" ? "Cualquiera" : state.members.find((m) => m.id === f.who)?.name ?? "";

  const suggestions = useMemo(() => {
    const q = (emojiQuery || f.title).toLowerCase();
    const cat = CATEGORY.find(([r]) => r.test(q))?.[1];
    const all = Object.values(EMOJI).flat();
    return { cat, list: (cat ? [...EMOJI[cat], ...all.filter((e) => !EMOJI[cat].includes(e))] : all).slice(0, 40) };
  }, [emojiQuery, f.title]);

  function onTitle(v: string) {
    setF((x) => {
      if (x.userEmoji) return { ...x, title: v };
      const hit = KEY_EMOJI.find(([r]) => r.test(v.toLowerCase()));
      return { ...x, title: v, emoji: hit ? hit[1] : "✨" };
    });
  }

  function save() {
    if (!valid) return;
    const assignment: Assignment = f.rotation
      ? { mode: "rotation", order: state.members.map((m) => m.id), current: f.who === "anyone" ? state.members[0].id : f.who }
      : f.who === "anyone" ? { mode: "anyone" } : { mode: "fixed", userId: f.who };
    const input: TaskInput = {
      emoji: f.emoji, title: f.title.trim(), description: f.description.trim(), listId: f.listId, color: f.color,
      schedule, dueTime: f.time, startsOn: f.kind === "once" ? today : f.startsOn, assignment,
    };
    const now = new Date();
    if (editId) {
      const before = getState().tasks.find((t) => t.id === editId)!;
      sync.run(
        (s) => updateTask(s, editId, f.kind === "once" ? { ...input, startsOn: before.startsOn } : input, now),
        (db, s) => saveTask(db, s.tasks.find((t) => t.id === editId)!, s.household.id, s.me, before),
      );
      onSaved("Cambios guardados");
    } else {
      let created: Task | undefined;
      sync.run(
        (s) => {
          const r = createTask(s, input, now);
          created = r.task;
          return r.state;
        },
        (db, s) => saveTask(db, created!, s.household.id, s.me, null),
      );
      const task = created as Task | undefined;
      if (task) onSaved(`Tarea creada · ${dueLabel(new Date(task.nextDueAt!), now, state.household.timeZone).replace(/^en /, "toca en ")}`);
    }
    tickNow();
    onOpenChange(false);
  }

  const wellStyle = { "--card": f.color === "none" ? "var(--surface-2)" : `var(--${f.color})` } as CSSProperties;

  return (
    <>
      <div className="sheet__head">
        <button className="btn btn--plain btn--sm" onClick={() => onOpenChange(false)}>Cancelar</button>
        <h2 className="sheet__title">{editId ? "Editar tarea" : "Nueva tarea"}</h2>
        <button className="btn btn--filled btn--sm" style={{ justifySelf: "end" }} disabled={!valid} onClick={save}>
          {editId ? "Guardar" : "Agregar"}
        </button>
      </div>

      <div className="sheet__body" data-vaul-no-drag="">
        <div className="well-wrap">
          <button type="button" className="emoji-well" style={wellStyle} aria-label="Elegir emoji" aria-expanded={emojiOpen} onClick={() => setEmojiOpen((o) => !o)}>
            <span>{f.emoji}</span>
            <span className="emoji-well__edit"><Icon name="edit" size="sm" /></span>
          </button>
        </div>
        <div className={`emoji-panel${emojiOpen ? " is-open" : ""}`}>
          <div>
            <div className="inner">
              <label className="search">
                <Icon name="search" size="md" />
                <input value={emojiQuery} onChange={(e) => setEmojiQuery(e.target.value)} placeholder="Buscar: planta, gato, basura…" aria-label="Buscar emoji" />
              </label>
              <div className="emoji-hint">{suggestions.cat ? `Sugerencias para «${(emojiQuery || f.title).trim()}»` : "Casa · Lukas · Plantas · Pagos · Otros"}</div>
              <div className="emoji-grid">
                {suggestions.list.map((e) => (
                  <button key={e} type="button" aria-pressed={e === f.emoji} aria-label={e} onClick={() => setF((x) => ({ ...x, emoji: e, userEmoji: true }))}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <input
          className="input input--title"
          value={f.title}
          maxLength={60}
          placeholder="¿Qué hay que hacer?"
          aria-label="Nombre de la tarea"
          autoComplete="off"
          enterKeyHint="done"
          onChange={(e) => onTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
        />

        <div className="sheet-section">
          <Segmented
            className="type-seg"
            label="Cada cuánto"
            value={f.kind}
            onChange={(v) => set("kind", v)}
            options={[
              { value: "interval", label: "Intervalo" },
              { value: "weekly", label: "Días" },
              { value: "monthly", label: "Día del mes" },
              { value: "once", label: "Una vez" },
            ]}
          />
          {f.kind === "interval" && (
            <div className="type-panel" key="interval">
              <div className="sheet-row">
                <span className="lbl">Cada</span>
                <Stepper value={f.every} onChange={(v) => set("every", v)} />
              </div>
              <Segmented size="sm" label="Unidad" value={f.unit} onChange={(v) => set("unit", v)}
                options={[{ value: "day", label: "días" }, { value: "week", label: "semanas" }, { value: "month", label: "meses" }]} />
              <Segmented size="sm" label="Contar desde" value={f.anchor} onChange={(v) => set("anchor", v)}
                options={[{ value: "completion", label: "desde la última vez" }, { value: "schedule", label: "desde la fecha" }]} />
            </div>
          )}
          {f.kind === "weekly" && (
            <div className="type-panel" key="weekly">
              <div className="weekdays">
                {WD_LETTERS.map(([d, l, name]) => (
                  <button key={d} type="button" aria-label={name} aria-pressed={f.weekdays.includes(d)}
                    onClick={() => set("weekdays", f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d])}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="sheet-row">
                <span className="lbl">Cada</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Stepper value={f.everyWeeks} onChange={(v) => set("everyWeeks", v)} max={8} />
                  <span className="t-subhead t-muted">{f.everyWeeks === 1 ? "semana" : "semanas"}</span>
                </span>
              </div>
            </div>
          )}
          {f.kind === "monthly" && (
            <div className="type-panel" key="monthly">
              <div className="days31">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <button key={d} type="button" aria-pressed={f.day === d} onClick={() => set("day", d)}>{d}</button>
                ))}
                <button type="button" className="last" aria-pressed={f.day === "last"} onClick={() => set("day", "last")}>Último día</button>
              </div>
            </div>
          )}
          {f.kind === "once" && (
            <div className="type-panel" key="once">
              <input type="date" className="input" value={f.date} onChange={(e) => set("date", e.target.value)} aria-label="Fecha" />
            </div>
          )}
        </div>

        <div className="sheet-section sheet-rows">
          {f.kind !== "once" && (
            <div className="sheet-row">
              <span className="lbl">Empieza</span>
              <label className="time-pill">
                <Icon name="calendar" size="md" />
                <span>{startLabel(f.startsOn, today)}</span>
                <input type="date" value={f.startsOn} aria-label="Fecha de inicio" onChange={(e) => set("startsOn", e.target.value || today)}
                  onClick={(e) => { try { e.currentTarget.showPicker(); } catch { /* sin picker */ } }} />
              </label>
            </div>
          )}
          <div className="sheet-row">
            <span className="lbl">Hora</span>
            <label className="time-pill">
              <Icon name="clock" size="md" />
              <span>{f.time}</span>
              <input type="time" value={f.time} aria-label="Hora" onChange={(e) => set("time", e.target.value || "09:00")}
                onClick={(e) => { try { e.currentTarget.showPicker(); } catch { /* sin picker */ } }} />
            </label>
          </div>
        </div>

        <div className="sheet-section">
          <span className="field__label">Le toca a</span>
          <div className="people" role="radiogroup" aria-label="Responsable">
            <button type="button" className="person" role="radio" aria-checked={f.who === "anyone"}
              onClick={() => setF((x) => ({ ...x, who: "anyone", rotation: false }))}>
              <Avatar emoji="🏡" />Cualquiera
            </button>
            {state.members.map((m) => (
              <button key={m.id} type="button" className="person" role="radio" aria-checked={f.who === m.id} onClick={() => set("who", m.id)}>
                <Avatar emoji={m.emoji} />{m.name}
              </button>
            ))}
          </div>
          <div className="sheet-row" style={{ marginTop: 6 }}>
            <span className="lbl" style={{ fontWeight: 500, color: "var(--ink-muted)" }}>Rotar entre {state.members.map((m) => m.name).join(" y ")}</span>
            <label className="switch">
              <input type="checkbox" checked={f.rotation} aria-label="Rotación"
                onChange={(e) => setF((x) => ({ ...x, rotation: e.target.checked, who: e.target.checked && x.who === "anyone" ? state.members[0].id : x.who }))} />
              <span className="switch__track" />
            </label>
          </div>
        </div>

        <div className="sheet-section">
          <span className="field__label">Lista</span>
          <div className="lists">
            {state.lists.map((l) => (
              <button key={l.id} type="button" className="chip" aria-pressed={f.listId === l.id} onClick={() => set("listId", l.id)}>
                {l.emoji} {l.name}
              </button>
            ))}
          </div>
        </div>

        <div className="sheet-section">
          <span className="field__label">Color de la tarjeta</span>
          <div className="swatches" role="radiogroup" aria-label="Color">
            {[...CARD_COLORS, "none" as const].map((c) => (
              <button key={c} type="button" role="radio" aria-checked={f.color === c} aria-label={c === "none" ? "Sin color" : c}
                className={`swatch${c === "none" ? " swatch--none" : ""}`} style={{ "--c": `var(--${c})` } as CSSProperties}
                onClick={() => set("color", c)}>
                <svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
              </button>
            ))}
          </div>
        </div>

        <div className="sheet-section field">
          <label className="field__label" htmlFor="task-desc">Descripción (opcional)</label>
          <textarea id="task-desc" className="textarea" maxLength={500} value={f.description}
            placeholder="Detalles, dónde está, cómo se hace" onChange={(e) => set("description", e.target.value)} />
        </div>
      </div>

      <div className="sheet__foot">
        <p className="sheet-summary">
          {f.kind === "weekly" && f.weekdays.length === 0 ? "Elige al menos un día." : `${scheduleText(schedule, f.time)}${f.kind !== "once" && f.startsOn > today ? ` · desde el ${startLabel(f.startsOn, today)}` : ""} · ${whoText}`}
        </p>
        <button className="btn btn--filled btn--lg btn--block" disabled={!valid} onClick={save}>
          {editId ? "Guardar cambios" : "Agregar tarea"}
        </button>
      </div>
    </>
  );
}

function Stepper({ value, onChange, max = 99 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="Menos" disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))}>−</button>
      <output>{value}</output>
      <button type="button" aria-label="Más" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}
