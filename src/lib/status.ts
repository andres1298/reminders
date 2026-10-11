/** Ring progress, task state and due labels (SPEC §4.7). */
import { TZDate } from "@date-fns/tz";
import { differenceInCalendarDays } from "date-fns";

export type TaskStatus = "ok" | "soon" | "overdue";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** (now − cycle start) / (due − cycle start), clamped to [0, 1]. */
export function progress(cycleStartedAt: Date, dueAt: Date, now: Date): number {
  const span = +dueAt - +cycleStartedAt;
  if (span <= 0) return now >= dueAt ? 1 : 0;
  return Math.min(1, Math.max(0, (+now - +cycleStartedAt) / span));
}

function calendarDaysBetween(from: Date, to: Date, timeZone: string): number {
  return differenceInCalendarDays(new TZDate(+to, timeZone), new TZDate(+from, timeZone));
}

/**
 * Al día: progress < 0.75 · Pronto: ≥ 0.75 or due today · Vencida: now > due.
 * The thresholds come from the SPEC; the UI always pairs them with text.
 */
export function taskStatus(cycleStartedAt: Date, dueAt: Date, now: Date, timeZone: string): TaskStatus {
  if (+now > +dueAt) return "overdue";
  if (progress(cycleStartedAt, dueAt, now) >= 0.75) return "soon";
  if (calendarDaysBetween(now, dueAt, timeZone) === 0) return "soon";
  return "ok";
}

function clock(d: Date, timeZone: string): string {
  const t = new TZDate(+d, timeZone);
  return `${t.getHours()}:${String(t.getMinutes()).padStart(2, "0")}`;
}

/** Short Spanish label for the status chip: "vencida hace 2 d", "hoy 19:00", "mañana 9:00", "en 4 d". */
export function dueLabel(dueAt: Date, now: Date, timeZone: string): string {
  if (+now > +dueAt) {
    const ago = +now - +dueAt;
    if (ago < DAY) return `vencida hace ${Math.max(1, Math.round(ago / HOUR))} h`;
    return `vencida hace ${Math.round(ago / DAY)} d`;
  }
  const days = calendarDaysBetween(now, dueAt, timeZone);
  if (days === 0) return `hoy ${clock(dueAt, timeZone)}`;
  if (days === 1) return `mañana ${clock(dueAt, timeZone)}`;
  return `en ${days} d`;
}

const WD = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "mar 13 oct, 19:00" */
export function formatDue(d: Date, timeZone: string): string {
  const t = new TZDate(+d, timeZone);
  const hh = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  return `${WD[t.getDay()]} ${t.getDate()} ${MO[t.getMonth()]}, ${hh}:${mm}`;
}
