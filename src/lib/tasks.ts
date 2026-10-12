/**
 * Task operations as pure functions over AppState (same semantics as the SQL
 * functions in supabase/migrations: credit, rotation, "ya estaba hecha", undo).
 */
import { validAlert } from "./alerts";
import {
  firstDue,
  nextDueAfterCompletion,
  nextDueAfterSkip,
  snoozeUntil,
  type Schedule,
  type ScheduleContext,
} from "./schedule";
import { currentAssignee, type AppState, type Assignment, type CardColor, type Task, type TaskEvent, type Todo } from "./types";

export class AlreadyDoneError extends Error {
  constructor() {
    super("already_done");
  }
}

/** Ids como los de Postgres (uuid): la tarjeta optimista y la fila comparten id. */
export const newId = () => crypto.randomUUID();

export function scheduleContext(state: AppState, task: Pick<Task, "schedule" | "dueTime" | "startsOn">): ScheduleContext {
  return { schedule: task.schedule, dueTime: task.dueTime, startsOn: task.startsOn, timeZone: state.household.timeZone };
}

function nextRotation(a: Assignment): Assignment {
  if (a.mode !== "rotation") return a;
  const i = a.order.indexOf(a.current);
  return { ...a, current: a.order[(i + 1) % a.order.length] };
}

function replaceTask(state: AppState, task: Task): AppState {
  return { ...state, tasks: state.tasks.map((t) => (t.id === task.id ? task : t)) };
}

function getTask(state: AppState, id: string): Task {
  const t = state.tasks.find((x) => x.id === id && !x.deletedAt);
  if (!t) throw new Error("task_not_found");
  return t;
}

function snapshot(t: Task): TaskEvent["prev"] {
  return { nextDueAt: t.nextDueAt, cycleStartedAt: t.cycleStartedAt, assignment: t.assignment, completedAt: t.completedAt };
}

/**
 * "✅ Hecha" (creditTo undefined → el responsable, o Hogar si es "Cualquiera")
 * or "🙋 La hizo alguien más" (creditTo = member id).
 * expectedDue guards against completing the same occurrence twice.
 */
export function completeTask(
  state: AppState,
  id: string,
  now: Date,
  opts: { expectedDue?: string | null; creditTo?: string } = {},
): { state: AppState; nextDue: Date | null; creditedTo: string | null } {
  const t = getTask(state, id);
  if (t.completedAt || (opts.expectedDue !== undefined && opts.expectedDue !== t.nextDueAt) || !t.nextDueAt) {
    throw new AlreadyDoneError();
  }
  if (opts.creditTo && !state.members.some((m) => m.id === opts.creditTo)) throw new Error("credit_not_member");
  const next = nextDueAfterCompletion(scheduleContext(state, t), new Date(t.nextDueAt), now);
  const creditedTo = opts.creditTo ?? currentAssignee(t.assignment);
  const event: TaskEvent = {
    id: newId(),
    kind: "done",
    at: now.toISOString(),
    creditedTo,
    chosen: !!opts.creditTo,
    prev: snapshot(t),
  };
  const updated: Task = {
    ...t,
    cycleStartedAt: now.toISOString(),
    nextDueAt: next ? next.toISOString() : null,
    completedAt: next ? null : now.toISOString(),
    assignment: nextRotation(t.assignment),
    history: [event, ...t.history],
  };
  return { state: replaceTask(state, updated), nextDue: next, creditedTo };
}

export function skipTask(state: AppState, id: string, now: Date): { state: AppState; nextDue: Date } {
  const t = getTask(state, id);
  if (!t.nextDueAt) throw new AlreadyDoneError();
  const next = nextDueAfterSkip(scheduleContext(state, t), new Date(t.nextDueAt), now);
  if (!next) throw new Error("cannot_skip_once");
  const start = new Date(Math.max(+now, +new Date(t.nextDueAt)));
  const updated: Task = {
    ...t,
    cycleStartedAt: start.toISOString(),
    nextDueAt: next.toISOString(),
    history: [{ id: newId(), kind: "skipped", at: now.toISOString(), prev: snapshot(t) }, ...t.history],
  };
  return { state: replaceTask(state, updated), nextDue: next };
}

export function snoozeTask(state: AppState, id: string, now: Date, minutes: number, label: string): { state: AppState; until: Date } {
  const t = getTask(state, id);
  const until = snoozeUntil(now, minutes);
  const updated: Task = {
    ...t,
    nextDueAt: until.toISOString(),
    cycleStartedAt: new Date(Math.min(+new Date(t.cycleStartedAt), +now)).toISOString(),
    history: [{ id: newId(), kind: "snoozed", at: now.toISOString(), label, prev: snapshot(t) }, ...t.history],
  };
  return { state: replaceTask(state, updated), until };
}

/** "Deshacer": reverts the latest done / skipped / snoozed event that is not undone yet. */
export function undoLast(state: AppState, id: string): AppState {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) throw new Error("task_not_found");
  const last = t.history.find((e) => !e.undone);
  if (!last) throw new Error("nothing_to_undo");
  return replaceTask(state, {
    ...t,
    nextDueAt: last.prev.nextDueAt,
    cycleStartedAt: last.prev.cycleStartedAt,
    assignment: last.prev.assignment,
    completedAt: last.prev.completedAt,
    history: t.history.map((e) => (e.id === last.id ? { ...e, undone: true } : e)),
  });
}

export interface TaskInput {
  emoji: string;
  title: string;
  description: string;
  listId: string;
  color: CardColor;
  schedule: Schedule;
  dueTime: string;
  alertMinutes?: number | null;
  startsOn: string;
  assignment: Assignment;
}

export function createTask(state: AppState, input: TaskInput, now: Date): { state: AppState; task: Task } {
  const due = firstDue(scheduleContext(state, input), now);
  if (!validAlert(input.alertMinutes, due, now)) throw new Error("invalid_alert");
  const task: Task = {
    ...input,
    id: newId(),
    cycleStartedAt: now.toISOString(),
    nextDueAt: due.toISOString(),
    completedAt: null,
    deletedAt: null,
    history: [],
  };
  return { state: { ...state, tasks: [...state.tasks, task] }, task };
}

/** Editing the schedule recomputes the due date from the current cycle start. */
export function updateTask(state: AppState, id: string, input: TaskInput, now: Date): AppState {
  const t = getTask(state, id);
  const scheduleChanged =
    JSON.stringify(t.schedule) !== JSON.stringify(input.schedule) || t.dueTime !== input.dueTime || t.startsOn !== input.startsOn;
  const nextDueAt = scheduleChanged
    ? firstDue(scheduleContext(state, input), new Date(Math.min(+now, +new Date(t.cycleStartedAt)))).toISOString()
    : t.nextDueAt;
  if (!validAlert(input.alertMinutes, nextDueAt, now)) throw new Error("invalid_alert");
  return replaceTask(state, { ...t, ...input, nextDueAt, completedAt: scheduleChanged ? null : t.completedAt });
}

export function deleteTask(state: AppState, id: string, now: Date): AppState {
  return replaceTask(state, { ...getTask(state, id), deletedAt: now.toISOString() });
}

export function restoreTask(state: AppState, id: string): AppState {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) throw new Error("task_not_found");
  return replaceTask(state, { ...t, deletedAt: null });
}

// --- Pendientes de casa -----------------------------------------------------

const TODO_EMOJI: [RegExp, string][] = [
  [/bombill|luz|lámpar|lampar/, "💡"], [/puert|bisagr|chap/, "🚪"], [/pint/, "🎨"], [/repis|estant|cuadro|colgar/, "🔨"],
  [/don|ropa/, "👕"], [/caja|mudanz/, "📦"], [/cortin/, "🪟"], [/compr|súper|super/, "🛒"], [/plant|maceta/, "🪴"],
  [/lukas|gat|rascador/, "🐱"], [/fug|grifo|tuber|llave/, "🔧"], [/limpi|orden/, "🧹"], [/cocin|nevera|refri/, "🍳"],
  [/carro|auto/, "🚗"], [/factur|banco|pag/, "🧾"],
];
export const todoEmoji = (text: string) => TODO_EMOJI.find(([r]) => r.test(text.toLowerCase()))?.[1] ?? "📝";

export function addTodo(state: AppState, text: string, assigneeId: string | null, soon: boolean, now: Date, alert: Pick<Todo, "dueAt" | "alertMinutes"> = {}): { state: AppState; todo: Todo } {
  const clean = text.trim().slice(0, 80);
  if (!clean) throw new Error("empty_todo");
  if (!validAlert(alert.alertMinutes, alert.dueAt ?? null, now)) throw new Error("invalid_alert");
  const todo: Todo = { ...alert, id: newId(), text: clean, emoji: todoEmoji(clean), assigneeId, soon, doneAt: null, createdAt: now.toISOString(), deletedAt: null };
  return { state: { ...state, todos: [todo, ...state.todos] }, todo };
}

export function updateTodo(state: AppState, id: string, patch: Partial<Pick<Todo, "doneAt" | "soon" | "assigneeId" | "deletedAt" | "text" | "dueAt" | "alertMinutes">>): AppState {
  return { ...state, todos: state.todos.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
}
