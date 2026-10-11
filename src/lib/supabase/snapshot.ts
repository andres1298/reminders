/**
 * La "foto" del hogar: todo lo que la app muestra, leído con la sesión del
 * usuario (las RLS filtran). Se pide entera; es poco y así no hay estados a medias.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppState } from "../types";
import { buildState } from "./mapping";
import type { EventRow, HouseholdRow, ListRow, MemberRow, RotationRow, TaskRow, TodoRow } from "./rows";

/** Ventana de eventos para el historial y "Deshacer". */
const EVENTS_DAYS = 90;

function rows<T>(r: { data: unknown; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data as T;
}

export async function loadSnapshot(db: SupabaseClient, userId: string): Promise<AppState | "no-household"> {
  const mine = rows<{ household_id: string }[]>(
    await db.from("household_members").select("household_id").eq("user_id", userId).order("joined_at").limit(1),
  );
  if (!mine.length) return "no-household";
  const hh = mine[0].household_id;
  const since = new Date(Date.now() - EVENTS_DAYS * 24 * 3600 * 1000).toISOString();

  const [household, members, lists, tasks, events, todos] = await Promise.all([
    db.from("households").select("id, name, emoji, timezone").eq("id", hh).single(),
    db.from("household_members").select("user_id, role, profiles!inner(display_name, avatar_emoji)").eq("household_id", hh).order("joined_at"),
    db.from("lists").select("id, name, emoji, position").eq("household_id", hh).is("deleted_at", null),
    db.from("tasks").select("*").eq("household_id", hh).is("deleted_at", null).is("paused_at", null),
    db.from("task_events").select("*").eq("household_id", hh).gte("created_at", since).order("created_at", { ascending: false }),
    db.from("household_todos").select("*").eq("household_id", hh).is("deleted_at", null),
  ]);
  const taskRows = rows<TaskRow[]>(tasks);
  const rotation = taskRows.some((t) => t.assignment_mode === "rotation")
    ? rows<RotationRow[]>(await db.from("task_rotation").select("task_id, user_id, position").in("task_id", taskRows.map((t) => t.id)))
    : [];

  return buildState({
    me: userId,
    household: rows<HouseholdRow>(household),
    members: rows<MemberRow[]>(members),
    lists: rows<ListRow[]>(lists),
    tasks: taskRows,
    rotation,
    events: rows<EventRow[]>(events),
    todos: rows<TodoRow[]>(todos),
  });
}
