import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task } from "../types";
import { rpcComplete, saveTask } from "./remote";

type Call = [string, ...unknown[]];

/** Cliente falso: registra cada llamada y responde `{ error }`. */
function fakeDb(error: unknown = null) {
  const calls: Call[] = [];
  const result = Promise.resolve({ data: null, error });
  const chain = (prefix: string) => ({
    eq: (col: string, val: unknown) => {
      calls.push([`${prefix}.eq`, col, val]);
      return result;
    },
  });
  const db = {
    rpc: (name: string, args: unknown) => {
      calls.push(["rpc", name, args]);
      return result;
    },
    from: (table: string) => ({
      insert: (v: unknown) => {
        calls.push([`${table}.insert`, v]);
        return result;
      },
      update: (v: unknown) => {
        calls.push([`${table}.update`, v]);
        return chain(`${table}.update`);
      },
      delete: () => {
        calls.push([`${table}.delete`]);
        return chain(`${table}.delete`);
      },
    }),
  };
  return { db: db as unknown as SupabaseClient, calls };
}

const task: Task = {
  id: "t1",
  emoji: "🗑️",
  title: "Sacar la basura",
  description: "",
  listId: "l1",
  color: "none",
  schedule: { type: "weekly", weekdays: [2], everyWeeks: 1 },
  dueTime: "19:00",
  startsOn: "2026-10-01",
  assignment: { mode: "rotation", order: ["u1", "u2"], current: "u1" },
  cycleStartedAt: "2026-10-08T01:00:00.000Z",
  nextDueAt: "2026-10-14T01:00:00.000Z",
  completedAt: null,
  deletedAt: null,
  history: [],
};

describe("remote", () => {
  it("rpcComplete manda los parámetros de complete_task", async () => {
    const { db, calls } = fakeDb();
    await rpcComplete(db, "t1", "2026-10-13T01:00:00.000Z", null, null);
    expect(calls).toEqual([
      ["rpc", "complete_task", { p_task: "t1", p_expected_due: "2026-10-13T01:00:00.000Z", p_next_due: null, p_credited_to: null }],
    ]);
  });

  it("saveTask al editar actualiza la tarea y reemplaza la rotación", async () => {
    const { db, calls } = fakeDb();
    await saveTask(db, task, "h1", "u1", false);
    expect(calls[0][0]).toBe("tasks.update");
    expect(calls[1]).toEqual(["tasks.update.eq", "id", "t1"]);
    expect(calls[2]).toEqual(["task_rotation.delete"]);
    expect(calls[3]).toEqual(["task_rotation.delete.eq", "task_id", "t1"]);
    expect(calls[4]).toEqual([
      "task_rotation.insert",
      [
        { task_id: "t1", user_id: "u1", position: 0 },
        { task_id: "t1", user_id: "u2", position: 1 },
      ],
    ]);
  });

  it("saveTask nueva inserta y no toca la rotación si no rota", async () => {
    const { db, calls } = fakeDb();
    await saveTask(db, { ...task, assignment: { mode: "anyone" } }, "h1", "u1", true);
    expect(calls.map((c) => c[0])).toEqual(["tasks.insert"]);
  });

  it("lanza el error de Supabase", async () => {
    const { db } = fakeDb({ message: "already_done", code: "P0001" });
    await expect(rpcComplete(db, "t1", "x", null, null)).rejects.toEqual({ message: "already_done", code: "P0001" });
  });
});
