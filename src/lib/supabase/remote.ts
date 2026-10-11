/**
 * Cada verbo de la app contra Supabase. Lanzan el error de Supabase tal cual;
 * la cola de sync.ts lo traduce. Los próximos vencimientos vienen de
 * schedule.ts (vía tasks.ts): aquí no se calcula recurrencia.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task, Todo } from "../types";
import { changedColumns, rotationRows, taskToRow, todoToRow } from "./mapping";

async function ok(p: PromiseLike<{ error: unknown }>) {
  const { error } = await p;
  if (error) throw error;
}

export const rpcComplete = (db: SupabaseClient, id: string, expectedDue: string, nextDue: string | null, creditTo: string | null) =>
  ok(db.rpc("complete_task", { p_task: id, p_expected_due: expectedDue, p_next_due: nextDue, p_credited_to: creditTo }));

export const rpcSkip = (db: SupabaseClient, id: string, expectedDue: string, nextDue: string) =>
  ok(db.rpc("skip_task", { p_task: id, p_expected_due: expectedDue, p_next_due: nextDue }));

export const rpcSnooze = (db: SupabaseClient, id: string, until: string) => ok(db.rpc("snooze_task", { p_task: id, p_until: until }));

export const rpcUndo = (db: SupabaseClient, id: string) => ok(db.rpc("undo_last_event", { p_task: id }));

export const rpcDeleteTask = (db: SupabaseClient, id: string) => ok(db.rpc("delete_task", { p_task: id }));

export const rpcRestoreTask = (db: SupabaseClient, id: string) => ok(db.rpc("restore_task", { p_task: id }));

/**
 * Crear (`before` null) o editar una tarea, con su rotación. Al editar solo se
 * mandan las columnas que cambiaron: así no se pisa un vencimiento o un turno
 * que otro teléfono acaba de avanzar.
 */
export async function saveTask(db: SupabaseClient, task: Task, householdId: string, userId: string, before: Task | null) {
  const row = taskToRow(task, householdId, userId);
  const rotation = rotationRows(task.id, task.assignment);
  if (!before) {
    await ok(db.from("tasks").insert(row));
    if (rotation.length) await ok(db.from("task_rotation").insert(rotation));
    return;
  }
  const changes = changedColumns(taskToRow(before, householdId, userId), row);
  if (Object.keys(changes).length) {
    await ok(db.from("tasks").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", task.id));
  }
  if (JSON.stringify(rotationRows(task.id, before.assignment)) !== JSON.stringify(rotation)) {
    await ok(db.from("task_rotation").delete().eq("task_id", task.id));
    if (rotation.length) await ok(db.from("task_rotation").insert(rotation));
  }
}

export const insertTodo = (db: SupabaseClient, todo: Todo, householdId: string, userId: string) =>
  ok(db.from("household_todos").insert(todoToRow(todo, householdId, userId)));

export const patchTodo = (
  db: SupabaseClient,
  id: string,
  patch: { done_at?: string | null; soon?: boolean; assignee_id?: string | null; text?: string },
) => ok(db.from("household_todos").update(patch).eq("id", id));

export const rpcDeleteTodo = (db: SupabaseClient, id: string) => ok(db.rpc("delete_todo", { p_todo: id }));

export const rpcRestoreTodo = (db: SupabaseClient, id: string) => ok(db.rpc("restore_todo", { p_todo: id }));
