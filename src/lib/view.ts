import { TZDate } from "@date-fns/tz";
import { differenceInCalendarDays } from "date-fns";
import type { Schedule } from "./schedule";
import { dueLabel, progress, taskStatus, type TaskStatus } from "./status";
import { currentAssignee, HOGAR, type AppState, type Member, type Task } from "./types";

export interface TaskView {
  task: Task;
  status: TaskStatus;
  progress: number;
  label: string;
  assignee: Member;
}

export function viewTask(state: AppState, task: Task, now: Date): TaskView | null {
  if (!task.nextDueAt) return null;
  const due = new Date(task.nextDueAt);
  const start = new Date(task.cycleStartedAt);
  const tz = state.household.timeZone;
  const id = currentAssignee(task.assignment);
  return {
    task,
    status: taskStatus(start, due, now, tz),
    progress: progress(start, due, now),
    label: dueLabel(due, now, tz),
    assignee: (id && state.members.find((m) => m.id === id)) || HOGAR,
  };
}

const RANK: Record<TaskStatus, number> = { overdue: 0, soon: 1, ok: 2 };

export type HomeFilter = "all" | "mine" | "today" | `person:${string}` | `list:${string}`;

export function homeTasks(state: AppState, now: Date, filter: HomeFilter): TaskView[] {
  const tz = state.household.timeZone;
  return state.tasks
    .filter((t) => !t.deletedAt && !t.completedAt)
    .map((t) => viewTask(state, t, now))
    .filter((v): v is TaskView => !!v)
    .filter((v) => {
      if (filter === "all") return true;
      if (filter === "mine") return currentAssignee(v.task.assignment) === state.me;
      if (filter.startsWith("person:")) return currentAssignee(v.task.assignment) === filter.slice(7);
      if (filter === "today")
        return v.status === "overdue" || differenceInCalendarDays(new TZDate(+new Date(v.task.nextDueAt!), tz), new TZDate(+now, tz)) === 0;
      return v.task.listId === filter.slice(5);
    })
    .sort((a, b) => RANK[a.status] - RANK[b.status] || +new Date(a.task.nextDueAt!) - +new Date(b.task.nextDueAt!));
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const UNITS = { day: ["día", "días"], week: ["semana", "semanas"], month: ["mes", "meses"] } as const;

/** "Martes y jueves · 19:00", "Cada 3 días desde la última vez · 09:00"… */
export function scheduleText(s: Schedule, dueTime: string): string {
  let a: string;
  if (s.type === "interval") {
    const [one, many] = UNITS[s.unit];
    a = (s.every === 1 ? `Cada ${one}` : `Cada ${s.every} ${many}`) + (s.anchor === "completion" ? " desde la última vez" : "");
  } else if (s.type === "weekly") {
    const order = [...s.weekdays].sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7)).map((d) => WEEKDAYS[d]);
    a = order.length > 1 ? `${order.slice(0, -1).join(", ")} y ${order.at(-1)}` : (order[0] ?? "Sin días");
    a = a[0].toUpperCase() + a.slice(1);
    if (s.everyWeeks > 1) a += `, cada ${s.everyWeeks} semanas`;
  } else if (s.type === "monthly") {
    a = s.day === "last" ? "El último día de cada mes" : `El día ${s.day} de cada mes`;
    if (s.everyMonths > 1) a = a.replace("cada mes", `cada ${s.everyMonths} meses`);
  } else {
    const [y, m, d] = s.date.split("-").map(Number);
    a = `Una vez, el ${d} de ${MONTHS[m - 1]}${y !== new Date().getFullYear() ? ` de ${y}` : ""}`;
  }
  return `${a} · ${dueTime}`;
}

export function summary(state: AppState, now: Date) {
  const tz = state.household.timeZone;
  const live = state.tasks.filter((t) => !t.deletedAt && !t.completedAt && t.nextDueAt);
  const overdue = live.filter((t) => +now > +new Date(t.nextDueAt!)).length;
  const today = live.filter(
    (t) => +now <= +new Date(t.nextDueAt!) && differenceInCalendarDays(new TZDate(+new Date(t.nextDueAt!), tz), new TZDate(+now, tz)) === 0,
  ).length;
  const week = live.filter((t) => +new Date(t.nextDueAt!) >= +now && +new Date(t.nextDueAt!) - +now < 7 * 864e5).length;
  return { overdue, today, week };
}
