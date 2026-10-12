/**
 * Traducción entre filas de Supabase y los tipos de la app (AppState).
 * Funciones puras: snapshot.ts lee con ellas y remote.ts escribe con ellas.
 */
import type { Schedule } from "../schedule";
import { CARD_COLORS, type AppState, type Assignment, type CardColor, type Task, type TaskEvent, type Todo } from "../types";
import { CATEGORIES, type GroceryCategory } from "../groceries";
import type { GroceryItem } from "../types";
import type { EventRow, GroceryRow, HouseholdRow, ListRow, MemberRow, RotationRow, TaskRow, TodoRow } from "./rows";

/** Eventos por tarea que se traen para el historial y "Deshacer". */
const HISTORY_PER_TASK = 20;

export function scheduleFromRow(r: Pick<TaskRow, "schedule_type" | "schedule" | "anchor">): Schedule {
  const s = r.schedule;
  switch (r.schedule_type) {
    case "interval":
      return { type: "interval", every: s.every as number, unit: s.unit as "day" | "week" | "month", anchor: r.anchor };
    case "weekly":
      return { type: "weekly", weekdays: s.weekdays as number[], everyWeeks: s.everyWeeks as number };
    case "monthly":
      return { type: "monthly", day: s.day as number | "last", everyMonths: s.everyMonths as number };
    case "once":
      return { type: "once", date: s.date as string };
  }
}

export function scheduleToRow(s: Schedule): Pick<TaskRow, "schedule_type" | "schedule" | "anchor"> {
  const { type, ...rest } = s;
  if (type === "interval") {
    const { anchor, ...schedule } = rest as Omit<Extract<Schedule, { type: "interval" }>, "type">;
    return { schedule_type: type, schedule, anchor };
  }
  return { schedule_type: type, schedule: rest, anchor: "schedule" };
}

function assignmentFor(mode: TaskRow["assignment_mode"], current: string | null, order: string[]): Assignment {
  if (mode === "fixed" && current) return { mode: "fixed", userId: current };
  if (mode === "rotation" && current) return { mode: "rotation", order, current };
  return { mode: "anyone" };
}

export function snoozeLabel(createdAt: string, until: string): string {
  const min = Math.round((+new Date(until) - +new Date(createdAt)) / 60_000);
  if (min < 24 * 60) return `+${Math.max(1, Math.round(min / 60))} h`;
  const days = Math.round(min / (24 * 60));
  return days === 1 ? "+1 día" : `+${days} días`;
}

function eventFromRow(e: EventRow, task: TaskRow, order: string[]): TaskEvent {
  return {
    id: e.id,
    kind: e.kind as TaskEvent["kind"],
    at: e.created_at,
    ...(e.kind === "done" ? { creditedTo: e.credited_to, chosen: e.credited_to !== e.assignee_at_time } : {}),
    ...(e.kind === "snoozed" && e.snoozed_until ? { label: snoozeLabel(e.created_at, e.snoozed_until) } : {}),
    prev: {
      nextDueAt: e.prev_next_due_at,
      cycleStartedAt: e.prev_cycle_started_at ?? task.cycle_started_at,
      assignment: assignmentFor(task.assignment_mode, e.prev_assignee_id, order),
      completedAt: null,
    },
    ...(e.undone_at ? { undone: true } : {}),
  };
}

export function taskFromRow(r: TaskRow, rotation: RotationRow[], events: EventRow[], defaultListId: string): Task {
  const order = rotation
    .filter((x) => x.task_id === r.id)
    .sort((a, b) => a.position - b.position)
    .map((x) => x.user_id);
  const history = events
    .filter((e) => e.task_id === r.id && (e.kind === "done" || e.kind === "skipped" || e.kind === "snoozed"))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, HISTORY_PER_TASK)
    .map((e) => eventFromRow(e, r, order));
  return {
    id: r.id,
    emoji: r.emoji,
    title: r.title,
    description: r.description ?? "",
    listId: r.list_id ?? defaultListId,
    color: r.color && (CARD_COLORS as readonly string[]).includes(r.color) ? (r.color as CardColor) : "none",
    schedule: scheduleFromRow(r),
    dueTime: r.due_time.slice(0, 5),
    alertMinutes: r.alert_minutes ?? null,
    startsOn: r.starts_on,
    assignment: assignmentFor(r.assignment_mode, r.current_assignee_id, order),
    cycleStartedAt: r.cycle_started_at,
    nextDueAt: r.next_due_at,
    completedAt: r.completed_at,
    deletedAt: r.deleted_at,
    history,
  };
}

/** Columnas que la app escribe al crear o editar una tarea. */
export type TaskWrite = Pick<
  TaskRow,
  | "id" | "household_id" | "list_id" | "emoji" | "title" | "description" | "schedule_type" | "schedule" | "anchor"
  | "alert_minutes" | "due_time" | "starts_on" | "color" | "assignment_mode" | "current_assignee_id" | "cycle_started_at"
  | "next_due_at" | "completed_at" | "created_by"
>;

export function taskToRow(t: Task, householdId: string, userId: string): TaskWrite {
  const a = t.assignment;
  return {
    id: t.id,
    household_id: householdId,
    list_id: t.listId || null,
    emoji: t.emoji,
    title: t.title,
    description: t.description || null,
    ...scheduleToRow(t.schedule),
    due_time: t.dueTime,
    alert_minutes: t.alertMinutes ?? null,
    starts_on: t.startsOn,
    color: t.color === "none" ? null : t.color,
    assignment_mode: a.mode,
    current_assignee_id: a.mode === "anyone" ? null : a.mode === "fixed" ? a.userId : a.current,
    cycle_started_at: t.cycleStartedAt,
    next_due_at: t.nextDueAt,
    completed_at: t.completedAt,
    created_by: userId,
  };
}

export function rotationRows(taskId: string, a: Assignment): RotationRow[] {
  return a.mode === "rotation" ? a.order.map((user_id, position) => ({ task_id: taskId, user_id, position })) : [];
}

export function todoFromRow(r: TodoRow): Todo {
  return {
    id: r.id,
    text: r.text,
    emoji: r.emoji,
    assigneeId: r.assignee_id,
    soon: r.soon,
    dueAt: r.due_at ?? null,
    alertMinutes: r.alert_minutes ?? null,
    doneAt: r.done_at,
    createdAt: r.created_at,
    deletedAt: r.deleted_at,
  };
}

export function todoToRow(t: Todo, householdId: string, userId: string): Omit<TodoRow, "deleted_at"> {
  return {
    id: t.id,
    household_id: householdId,
    text: t.text,
    emoji: t.emoji,
    assignee_id: t.assigneeId,
    soon: t.soon,
    due_at: t.dueAt ?? null,
    alert_minutes: t.alertMinutes ?? null,
    done_at: t.doneAt,
    created_by: userId,
    created_at: t.createdAt,
  };
}

export interface SnapshotRows {
  me: string;
  household: HouseholdRow;
  members: MemberRow[];
  lists: ListRow[];
  tasks: TaskRow[];
  rotation: RotationRow[];
  events: EventRow[];
  todos: TodoRow[];
  groceries?: GroceryRow[];
  isSuperAdmin?: boolean;
}

export function buildState(input: SnapshotRows): AppState {
  const lists = [...input.lists].sort((a, b) => a.position - b.position).map((l) => ({ id: l.id, name: l.name, emoji: l.emoji }));
  const defaultListId = lists[0]?.id ?? "";
  return {
    version: 1,
    me: input.me,
    household: { id: input.household.id, name: input.household.name, emoji: input.household.emoji, timeZone: input.household.timezone },
    members: input.members.map((m) => ({ id: m.user_id, name: m.profiles.display_name, emoji: m.profiles.avatar_emoji, role: m.role })),
    lists,
    tasks: input.tasks.map((t) => taskFromRow(t, input.rotation, input.events, defaultListId)),
    todos: input.todos.map(todoFromRow),
    groceries: (input.groceries ?? []).map(groceryFromRow),
    isSuperAdmin: !!input.isSuperAdmin,
  };
}

/** Columnas que cambiaron entre dos versiones de una fila (jsonb comparado por valor). */
export function changedColumns<T extends object>(before: T, after: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(after) as (keyof T)[]) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) out[k] = after[k];
  }
  return out;
}

export function groceryFromRow(r: GroceryRow): GroceryItem {
  const category = (CATEGORIES.some((c) => c.key === r.category) ? r.category : "other") as GroceryCategory;
  return {
    id: r.id,
    name: r.name,
    nameKey: r.name_key,
    category,
    onList: r.on_list,
    quantity: r.quantity,
    note: r.note,
    checkedAt: r.checked_at,
    timesBought: Number(r.times_bought) || 0,
    lastBoughtAt: r.last_bought_at,
  };
}
