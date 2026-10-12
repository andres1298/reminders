import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task } from "../types";
import { patchGrocery, rpcAddGrocery, rpcComplete, saveTask } from "./remote";

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

  it("saveTask al editar manda solo lo que cambió y reemplaza la rotación si cambió", async () => {
    const { db, calls } = fakeDb();
    const before: Task = { ...task, title: "Basura", assignment: { mode: "fixed", userId: "u1" } };
    await saveTask(db, task, "h1", "u1", before);
    expect(calls[0][0]).toBe("tasks.update");
    const sent = calls[0][1] as Record<string, unknown>;
    expect(sent.title).toBe("Sacar la basura");
    expect(sent.assignment_mode).toBe("rotation");
    // el vencimiento no cambió: no se manda (no pisa lo que completó otro teléfono)
    expect(sent).not.toHaveProperty("next_due_at");
    expect(sent).not.toHaveProperty("cycle_started_at");
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
    await saveTask(db, { ...task, assignment: { mode: "anyone" } }, "h1", "u1", null);
    expect(calls.map((c) => c[0])).toEqual(["tasks.insert"]);
  });

  it("saveTask sin cambios no llama a Supabase", async () => {
    const { db, calls } = fakeDb();
    await saveTask(db, task, "h1", "u1", task);
    expect(calls).toEqual([]);
  });

  it("rpcAddGrocery manda los 7 parámetros de add_grocery", async () => {
    const { db, calls } = fakeDb();
    await rpcAddGrocery(
      db,
      { id: "g1", name: "Leche", nameKey: "leche", category: "dairy", onList: true, quantity: "2", note: null, checkedAt: null, timesBought: 0, lastBoughtAt: null },
      "h1",
    );
    expect(calls).toEqual([
      ["rpc", "add_grocery", { p_id: "g1", p_household: "h1", p_name: "Leche", p_name_key: "leche", p_category: "dairy", p_quantity: "2", p_note: null }],
    ]);
  });

  it("patchGrocery avisa si no encontró la fila (no se pierde en silencio)", async () => {
    const select = (data: unknown) =>
      ({
        from: () => ({ update: () => ({ eq: () => ({ select: () => Promise.resolve({ data, error: null }) }) }) }),
      }) as unknown as SupabaseClient;
    await expect(patchGrocery(select([]), "g1", { on_list: false })).rejects.toMatchObject({ message: "not_found" });
    await expect(patchGrocery(select([{ id: "g1" }]), "g1", { on_list: false })).resolves.toBeUndefined();
  });

  it("lanza el error de Supabase", async () => {
    const { db } = fakeDb({ message: "already_done", code: "P0001" });
    await expect(rpcComplete(db, "t1", "x", null, null)).rejects.toEqual({ message: "already_done", code: "P0001" });
  });
});
