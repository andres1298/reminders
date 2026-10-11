/**
 * Decide qué avisos push enviar en una pasada del cron (SPEC §4.9):
 * a la hora de vencimiento, al responsable (o a todo el hogar si es
 * "Cualquiera"), una sola vez por ocurrencia y canal. Posponer crea una
 * ocurrencia nueva (otro vencimiento) y por eso vuelve a avisar.
 */
import { TZDate } from "@date-fns/tz";

export interface DueTaskRow {
  id: string;
  household_id: string;
  emoji: string;
  title: string;
  next_due_at: string;
  assignment_mode: "anyone" | "fixed" | "rotation";
  current_assignee_id: string | null;
}
export interface HouseholdRow {
  id: string;
  timezone: string;
  vacation_from: string | null;
  vacation_until: string | null;
}
export interface MemberRow {
  household_id: string;
  user_id: string;
  display_name: string;
}
export interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}
export interface PrefsRow {
  user_id: string;
  push: boolean;
  per_task: boolean;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}
export interface Delivery {
  userId: string;
  subscription: SubscriptionRow;
  payload: PushPayload;
  occurrenceKey: string;
}

/** Ventana de gracia: si el cron se salta un minuto, igual avisa. */
export const CATCH_UP_MS = 30 * 60_000;

export const occurrenceKey = (taskId: string, dueAt: string) => `${taskId}@${new Date(dueAt).toISOString()}`;

function onVacation(h: HouseholdRow, now: Date) {
  if (!h.vacation_from) return false;
  return +new Date(h.vacation_from) <= +now && (!h.vacation_until || +now < +new Date(h.vacation_until));
}

export function planDueNotifications(input: {
  tasks: DueTaskRow[];
  households: HouseholdRow[];
  members: MemberRow[];
  subscriptions: SubscriptionRow[];
  prefs: PrefsRow[];
  /** claves `${userId}|${occurrenceKey}` ya avisadas por push */
  alreadySent: Set<string>;
  now: Date;
}): Delivery[] {
  const { now } = input;
  const households = new Map(input.households.map((h) => [h.id, h]));
  const prefs = new Map(input.prefs.map((p) => [p.user_id, p]));
  const out: Delivery[] = [];

  for (const t of input.tasks) {
    const due = new Date(t.next_due_at);
    if (+due > +now || +now - +due > CATCH_UP_MS) continue;
    const h = households.get(t.household_id);
    if (!h || onVacation(h, now)) continue;

    const members = input.members.filter((m) => m.household_id === t.household_id);
    const recipients =
      t.assignment_mode === "anyone" || !t.current_assignee_id
        ? members
        : members.filter((m) => m.user_id === t.current_assignee_id);
    const assignee = members.find((m) => m.user_id === t.current_assignee_id);
    const local = new TZDate(+due, h.timezone);
    const hhmm = `${local.getHours()}:${String(local.getMinutes()).padStart(2, "0")}`;
    const key = occurrenceKey(t.id, t.next_due_at);

    for (const r of recipients) {
      const p = prefs.get(r.user_id);
      if (p && (!p.push || !p.per_task)) continue;
      if (input.alreadySent.has(`${r.user_id}|${key}`)) continue;
      const payload: PushPayload = {
        title: `${t.emoji} ${t.title}`,
        body: assignee ? `Toca ahora (${hhmm}) · le toca a ${assignee.display_name}` : `Toca ahora (${hhmm}) · cualquiera del hogar`,
        url: `/t/${t.id}`,
        tag: `task-${t.id}`,
      };
      for (const s of input.subscriptions.filter((x) => x.user_id === r.user_id)) {
        out.push({ userId: r.user_id, subscription: s, payload, occurrenceKey: key });
      }
    }
  }
  return out;
}
