/**
 * Demo household used until Supabase is connected. Dates are computed relative
 * to "now" so the home screen always shows a realistic mix of states.
 */
import { TZDate } from "@date-fns/tz";
import { addDays, addMonths, addWeeks } from "date-fns";
import type { AppState, Task, Todo } from "./types";

const TZ = "America/Costa_Rica";

function at(now: Date, dayOffset: number, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = addDays(new TZDate(+now, TZ), dayOffset);
  return new Date(+new TZDate(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0, TZ));
}
const iso = (d: Date) => d.toISOString();
const ymd = (d: Date) => {
  const t = new TZDate(+d, TZ);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

/** Next date (offset in days from today, ≥ minOffset) that falls on the given weekday. */
function nextWeekday(now: Date, weekday: number, minOffset = 1): number {
  const today = new TZDate(+now, TZ).getDay();
  let off = (weekday - today + 7) % 7;
  while (off < minOffset) off += 7;
  return off;
}

export function demoState(now = new Date()): AppState {
  const t = (task: Omit<Task, "completedAt" | "deletedAt" | "history"> & { history?: Task["history"] }): Task => ({
    completedAt: null,
    deletedAt: null,
    history: [],
    ...task,
  });

  const basuraDue = at(now, -2, "19:00");
  const arenero = at(now, 0, "20:00");
  const regar = at(now, 1, "09:00");
  const despara = at(now, 5, "09:00");
  const barrer = at(now, nextWeekday(now, 4, 3), "10:00");
  const sabanas = at(now, 8, "09:00");
  const vacuna = at(now, 10, "10:00");
  const aptoDue = (() => {
    const n = new TZDate(+now, TZ);
    const d = new TZDate(n.getFullYear(), n.getMonth() + (n.getDate() >= 3 ? 1 : 0), 3, 9, 0, 0, 0, TZ);
    return new Date(+d);
  })();

  const tasks: Task[] = [
    t({
      id: "basura", emoji: "🗑️", title: "Sacar la basura", listId: "limpieza", color: "stone",
      description: "Bolsa negra los martes, reciclaje los jueves. El camión pasa a las 20:00.",
      schedule: { type: "weekly", weekdays: [new TZDate(+basuraDue, TZ).getDay(), (new TZDate(+basuraDue, TZ).getDay() + 2) % 7], everyWeeks: 1 },
      dueTime: "19:00", startsOn: "2026-01-01",
      assignment: { mode: "rotation", order: ["andres", "mari"], current: "andres" },
      cycleStartedAt: iso(at(now, -4, "19:00")), nextDueAt: iso(basuraDue),
    }),
    t({
      id: "arenero", emoji: "🪣", title: "Limpiar arenero", listId: "lukas", color: "mint", description: "",
      schedule: { type: "interval", every: 1, unit: "day", anchor: "completion" }, dueTime: "20:00", startsOn: "2026-01-01",
      assignment: { mode: "anyone" }, cycleStartedAt: iso(at(now, -1, "20:00")), nextDueAt: iso(arenero),
    }),
    t({
      id: "regar", emoji: "🌱", title: "Regar plantas", listId: "plantas", color: "leaf",
      description: "Las del balcón y el helecho de la sala. El cactus no.",
      schedule: { type: "interval", every: 3, unit: "day", anchor: "completion" }, dueTime: "09:00", startsOn: "2026-01-01",
      assignment: { mode: "fixed", userId: "mari" }, cycleStartedAt: iso(at(now, -2, "09:00")), nextDueAt: iso(regar),
    }),
    t({
      id: "despara", emoji: "💊", title: "Desparasitante de Lukas", listId: "lukas", color: "calico",
      description: "Media pastilla escondida en atún. Lukas la detecta igual.",
      schedule: { type: "interval", every: 1, unit: "month", anchor: "completion" }, dueTime: "09:00", startsOn: "2026-01-01",
      assignment: { mode: "fixed", userId: "mari" }, cycleStartedAt: iso(addMonths(despara, -1)), nextDueAt: iso(despara),
    }),
    t({
      id: "barrer", emoji: "🧹", title: "Barrer", listId: "limpieza", color: "butter", description: "",
      schedule: { type: "weekly", weekdays: [4], everyWeeks: 1 }, dueTime: "10:00", startsOn: "2026-01-01",
      assignment: { mode: "fixed", userId: "andres" }, cycleStartedAt: iso(addWeeks(barrer, -1)), nextDueAt: iso(barrer),
    }),
    t({
      id: "apto", emoji: "🏠", title: "Pagar el apartamento", listId: "pagos", color: "periwinkle", description: "",
      schedule: { type: "monthly", day: 3, everyMonths: 1 }, dueTime: "09:00", startsOn: "2026-01-01",
      assignment: { mode: "fixed", userId: "andres" }, cycleStartedAt: iso(addMonths(aptoDue, -1)), nextDueAt: iso(aptoDue),
    }),
    t({
      id: "sabanas", emoji: "🛏️", title: "Cambiar sábanas", listId: "limpieza", color: "lilac", description: "",
      schedule: { type: "interval", every: 2, unit: "week", anchor: "schedule" }, dueTime: "09:00", startsOn: ymd(addWeeks(sabanas, -2)),
      assignment: { mode: "fixed", userId: "mari" }, cycleStartedAt: iso(addWeeks(sabanas, -2)), nextDueAt: iso(sabanas),
    }),
    t({
      id: "vacuna", emoji: "💉", title: "Vacuna de Lukas", listId: "lukas", color: "rose", description: "Veterinaria San Rafael. Llevar el carné.",
      schedule: { type: "once", date: ymd(vacuna) }, dueTime: "10:00", startsOn: ymd(at(now, -9, "10:00")),
      assignment: { mode: "fixed", userId: "andres" }, cycleStartedAt: iso(at(now, -9, "10:00")), nextDueAt: iso(vacuna),
    }),
  ];

  const todo = (id: string, text: string, emoji: string, assigneeId: string | null, soon: boolean, done = false): Todo => ({
    id, text, emoji, assigneeId, soon, doneAt: done ? iso(at(now, -1, "18:00")) : null, createdAt: iso(at(now, -6, "12:00")), deletedAt: null,
  });

  return {
    version: 1,
    me: "andres",
    household: { id: "casa", name: "Casa", emoji: "🏡", timeZone: TZ },
    members: [
      { id: "andres", name: "Andrés", emoji: "🌵" },
      { id: "mari", name: "Mari", emoji: "🌸" },
    ],
    lists: [
      { id: "general", name: "General", emoji: "📌" },
      { id: "limpieza", name: "Limpieza", emoji: "🧹" },
      { id: "lukas", name: "Lukas", emoji: "🐱" },
      { id: "plantas", name: "Plantas", emoji: "🪴" },
      { id: "pagos", name: "Pagos", emoji: "💸" },
    ],
    tasks,
    todos: [
      todo("p1", "Cambiar el bombillo del pasillo", "💡", "andres", true),
      todo("p2", "Arreglar la puerta del clóset", "🚪", null, false),
      todo("p3", "Colgar la repisa del baño", "🔨", "andres", false),
      todo("p4", "Llevar ropa a donar", "👕", "mari", true),
      todo("p5", "Comprar rascador nuevo para Lukas", "🐱", null, false),
      todo("p6", "Pintar la pared de la sala", "🎨", null, false),
      todo("p7", "Desarmar las cajas de la mudanza", "📦", "mari", false, true),
      todo("p8", "Revisar la fuga del grifo", "🔧", "andres", false, true),
    ],
    groceries: [],
  };
}
