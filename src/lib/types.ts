import type { Schedule } from "./schedule";

export const CARD_COLORS = [
  "leaf", "sage", "mint", "moss", "olive",
  "mustard", "butter", "calico", "sand", "clay",
  "coral", "peach", "rose", "berry",
  "sky", "lake", "periwinkle", "lilac",
  "stone", "paper",
] as const;
export type CardColor = (typeof CARD_COLORS)[number] | "none";

export interface Member {
  id: string;
  name: string;
  emoji: string;
  role?: "admin" | "member";
}

export interface Household {
  id: string;
  name: string;
  emoji: string;
  timeZone: string;
}

export interface TaskList {
  id: string;
  name: string;
  emoji: string;
}

export type Assignment =
  | { mode: "anyone" }
  | { mode: "fixed"; userId: string }
  | { mode: "rotation"; order: string[]; current: string };

export type TaskEventKind = "done" | "skipped" | "snoozed";

export interface TaskEvent {
  id: string;
  kind: TaskEventKind;
  at: string;
  /** done: who gets the credit; null = Hogar ("Cualquiera"). */
  creditedTo?: string | null;
  /** true when the credit was chosen in "¿Quién la hizo?" */
  chosen?: boolean;
  label?: string;
  prev: { nextDueAt: string | null; cycleStartedAt: string; assignment: Assignment; completedAt: string | null };
  undone?: boolean;
}

export interface Task {
  id: string;
  emoji: string;
  title: string;
  description: string;
  listId: string;
  color: CardColor;
  schedule: Schedule;
  /** "HH:mm" */
  dueTime: string;
  alertMinutes?: number | null;
  /** YYYY-MM-DD */
  startsOn: string;
  assignment: Assignment;
  cycleStartedAt: string;
  nextDueAt: string | null;
  completedAt: string | null;
  deletedAt: string | null;
  history: TaskEvent[];
}

export interface Todo {
  id: string;
  text: string;
  emoji: string;
  /** null = Cualquiera */
  assigneeId: string | null;
  soon: boolean;
  dueAt?: string | null;
  alertMinutes?: number | null;
  doneAt: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface GroceryItem {
  id: string;
  name: string;
  /** minúsculas, sin tildes: identifica el artículo en el historial */
  nameKey: string;
  category: import("./groceries").GroceryCategory;
  onList: boolean;
  quantity: string | null;
  note: string | null;
  /** tachado en la compra actual */
  checkedAt: string | null;
  timesBought: number;
  lastBoughtAt: string | null;
}

export interface AppState {
  version: 1;
  me: string;
  household: Household;
  members: Member[];
  lists: TaskList[];
  tasks: Task[];
  todos: Todo[];
  /** lista de compras e historial (Súper) */
  groceries: GroceryItem[];
  /** puede abrir el panel de administración */
  isSuperAdmin?: boolean;
}

export const HOGAR: Member = { id: "hogar", name: "Hogar", emoji: "🏡" };

export function currentAssignee(a: Assignment): string | null {
  if (a.mode === "anyone") return null;
  if (a.mode === "fixed") return a.userId;
  return a.current;
}
