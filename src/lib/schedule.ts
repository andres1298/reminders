/**
 * Recurrence logic for Lukas (SPEC §4.5, §4.3.2, §12).
 *
 * Every computation happens in the household's time zone. Inputs and outputs
 * are plain `Date` instants; `TZDate` is only used internally so that
 * "the same wall-clock time on another day" is correct across DST changes.
 */
import { TZDate } from "@date-fns/tz";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  startOfWeek,
} from "date-fns";

export type IntervalUnit = "day" | "week" | "month";
export type Anchor = "completion" | "schedule";

export type Schedule =
  | { type: "interval"; every: number; unit: IntervalUnit; anchor: Anchor }
  /** weekdays: 0 = domingo … 6 = sábado */
  | { type: "weekly"; weekdays: number[]; everyWeeks: number }
  | { type: "monthly"; day: number | "last"; everyMonths: number }
  /** date: YYYY-MM-DD in the household time zone */
  | { type: "once"; date: string };

export interface ScheduleContext {
  schedule: Schedule;
  /** "HH:mm" */
  dueTime: string;
  timeZone: string;
  /** YYYY-MM-DD; the first day the schedule may produce an occurrence. */
  startsOn: string;
}

const MAX_STEPS = 1000;

function parseTime(dueTime: string): [number, number] {
  const m = /^(\d{1,2}):(\d{2})$/.exec(dueTime);
  if (!m) throw new Error(`Invalid due time: ${dueTime}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) throw new Error(`Invalid due time: ${dueTime}`);
  return [h, min];
}

function parseDate(date: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error(`Invalid date: ${date}`);
  return [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
}

/** Wall-clock `y-m-d` at `dueTime` in `tz`. */
function at(tz: string, y: number, m: number, d: number, dueTime: string): TZDate {
  const [h, min] = parseTime(dueTime);
  return new TZDate(y, m, d, h, min, 0, 0, tz);
}

function local(instant: Date | number, tz: string): TZDate {
  return new TZDate(+instant, tz);
}

/** Same calendar day as `day` (in tz), at `dueTime`. */
function onDay(day: TZDate, dueTime: string): TZDate {
  return at(day.timeZone ?? "UTC", day.getFullYear(), day.getMonth(), day.getDate(), dueTime);
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function addUnit(d: TZDate, n: number, unit: IntervalUnit): TZDate {
  if (unit === "day") return addDays(d, n);
  if (unit === "week") return addWeeks(d, n);
  return addMonths(d, n); // clamps day 31 → last day of month
}

function startDay(ctx: ScheduleContext): TZDate {
  const [y, m, d] = parseDate(ctx.startsOn);
  return at(ctx.timeZone, y, m, d, ctx.dueTime);
}

/**
 * First occurrence of a fixed-calendar schedule strictly after `after`.
 * Used by weekly / monthly / interval-anchored-to-schedule.
 */
function nextCalendarOccurrence(ctx: ScheduleContext, after: Date): Date {
  const { schedule: s, timeZone: tz, dueTime } = ctx;
  const start = startDay(ctx);
  const from = local(Math.max(+after, +start - 1), tz);

  if (s.type === "weekly") {
    if (s.weekdays.length === 0) throw new Error("Weekly schedule needs at least one weekday");
    const every = Math.max(1, s.everyWeeks);
    const startWeek = startOfWeek(start, { weekStartsOn: 1 });
    let day = onDay(from, dueTime);
    for (let i = 0; i < MAX_STEPS; i++) {
      const weekOffset = Math.round(
        differenceInCalendarDays(startOfWeek(day, { weekStartsOn: 1 }), startWeek) / 7,
      );
      if (
        +day > +after &&
        +day >= +start &&
        s.weekdays.includes(day.getDay()) &&
        weekOffset % every === 0
      ) {
        return new Date(+day);
      }
      day = onDay(addDays(day, 1), dueTime);
    }
  }

  if (s.type === "monthly") {
    const every = Math.max(1, s.everyMonths);
    let y = from.getFullYear();
    let m = from.getMonth();
    for (let i = 0; i < MAX_STEPS; i++) {
      const monthOffset = differenceInCalendarMonths(new Date(y, m, 1), new Date(start.getFullYear(), start.getMonth(), 1));
      if (monthOffset >= 0 && monthOffset % every === 0) {
        const last = lastDayOfMonth(y, m);
        const d = s.day === "last" ? last : Math.min(s.day, last);
        const candidate = at(tz, y, m, d, dueTime);
        if (+candidate > +after && +candidate >= +start) return new Date(+candidate);
      }
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
  }

  if (s.type === "interval") {
    let candidate = start;
    let i = 0;
    while (+candidate <= +after && i++ < MAX_STEPS) {
      candidate = onDay(addUnit(start, s.every * i, s.unit), dueTime);
    }
    return new Date(+candidate);
  }

  throw new Error(`No calendar occurrence for schedule type ${s.type}`);
}

/** First due date when a task is created at `now`. `null` never happens except for a past one-off. */
export function firstDue(ctx: ScheduleContext, now: Date): Date {
  const s = ctx.schedule;
  if (s.type === "once") {
    const [y, m, d] = parseDate(s.date);
    return new Date(+at(ctx.timeZone, y, m, d, ctx.dueTime));
  }
  if (s.type === "interval" && s.anchor === "completion") {
    // Same stepping as the anchored variant, starting from startsOn.
    return nextCalendarOccurrence({ ...ctx, schedule: { ...s, anchor: "schedule" } }, now);
  }
  return nextCalendarOccurrence(ctx, now);
}

/**
 * Next due date after completing the current occurrence.
 * Occurrences never accumulate: the result is always in the future relative
 * to both the completion moment and the occurrence that was completed.
 * Returns `null` for one-off tasks (they move to "Terminadas").
 */
export function nextDueAfterCompletion(ctx: ScheduleContext, currentDue: Date, completedAt: Date): Date | null {
  const s = ctx.schedule;
  if (s.type === "once") return null;
  if (s.type === "interval" && s.anchor === "completion") {
    const done = local(completedAt, ctx.timeZone);
    return new Date(+onDay(addUnit(done, s.every, s.unit), ctx.dueTime));
  }
  const base = new Date(Math.max(+completedAt, +currentDue));
  return nextCalendarOccurrence(ctx, base);
}

/** "Saltar esta vez": move to the next occurrence without a completion. */
export function nextDueAfterSkip(ctx: ScheduleContext, currentDue: Date, now: Date): Date | null {
  const s = ctx.schedule;
  if (s.type === "once") return null;
  if (s.type === "interval" && s.anchor === "completion") {
    const base = local(Math.max(+now, +currentDue), ctx.timeZone);
    return new Date(+onDay(addUnit(base, s.every, s.unit), ctx.dueTime));
  }
  return nextCalendarOccurrence(ctx, new Date(Math.max(+now, +currentDue)));
}

/**
 * Next due date when a paused task (or a household returning from vacation)
 * resumes (SPEC §4.3.2): completion-anchored intervals restart from the
 * resume moment; fixed schedules jump to their next future occurrence.
 */
export function nextDueOnResume(ctx: ScheduleContext, resumedAt: Date): Date | null {
  const s = ctx.schedule;
  if (s.type === "once") {
    const due = firstDue(ctx, resumedAt);
    return due;
  }
  if (s.type === "interval" && s.anchor === "completion") {
    const r = local(resumedAt, ctx.timeZone);
    return new Date(+onDay(addUnit(r, s.every, s.unit), ctx.dueTime));
  }
  return nextCalendarOccurrence(ctx, resumedAt);
}

/** Snooze ("Posponer"): a new due instant; the cycle start is unchanged. */
export function snoozeUntil(now: Date, minutes: number): Date {
  return new Date(+now + minutes * 60_000);
}
