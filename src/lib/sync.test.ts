import { describe, expect, it, vi } from "vitest";
import { classifyError, createRefreshGate, createSyncQueue, errorMessage } from "./sync";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const settle = () => wait(30);

describe("createSyncQueue", () => {
  it("ejecuta en serie, en el orden en que llegan", async () => {
    const log: string[] = [];
    const q = createSyncQueue({ onError: () => {}, onIdle: () => {} });
    q.push(async () => {
      await wait(15);
      log.push("a");
    });
    q.push(async () => {
      log.push("b");
    });
    await settle();
    expect(log).toEqual(["a", "b"]);
  });

  it("busy mientras corre y libre después; onIdle una vez", async () => {
    const onIdle = vi.fn();
    const q = createSyncQueue({ onError: () => {}, onIdle });
    expect(q.busy()).toBe(false);
    q.push(() => wait(5));
    q.push(() => wait(5));
    expect(q.busy()).toBe(true);
    await settle();
    expect(q.busy()).toBe(false);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("al primer error descarta lo que sigue y avisa", async () => {
    const onError = vi.fn();
    const onIdle = vi.fn();
    const next = vi.fn(async () => {});
    const q = createSyncQueue({ onError, onIdle });
    q.push(async () => {
      throw { message: "already_done", code: "P0001" };
    });
    q.push(next);
    await settle();
    expect(onError).toHaveBeenCalledWith("already_done");
    expect(next).not.toHaveBeenCalled();
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(q.busy()).toBe(false);
  });
});

describe("classifyError", () => {
  it.each([
    [{ message: "already_done", code: "P0001" }, "already_done"],
    [{ message: "task_not_found", code: "P0002" }, "not_found"],
    [{ message: "todo_not_found", code: "P0002" }, "not_found"],
    [{ message: "forbidden", code: "42501" }, "not_found"],
    [new TypeError("Failed to fetch"), "offline"],
    [{ message: "TypeError: Load failed" }, "offline"],
    [{ message: "JWT expired", code: "PGRST301" }, "auth"],
    [{ message: "x", status: 401 }, "auth"],
    [new Error("boom"), "unknown"],
  ] as const)("%o → %s", (e, kind) => {
    expect(classifyError(e)).toBe(kind);
  });
});

describe("errorMessage", () => {
  it("textos en español", () => {
    expect(errorMessage("already_done")).toBe("Ya estaba hecha 🐾");
    expect(errorMessage("not_found")).toBe("Esa tarea ya no existe");
    expect(errorMessage("offline")).toBe("Sin conexión: no se guardó");
    expect(errorMessage("unknown")).toBe("No se pudo guardar. Intenta otra vez");
    expect(errorMessage("auth")).toBe("");
  });
});

describe("createRefreshGate", () => {
  it("descarta una foto que empezó antes de un cambio", () => {
    const g = createRefreshGate();
    const ticket = g.start();
    g.mutated();
    expect(g.canApply(ticket)).toBe(false);
  });
  it("descarta una foto vieja que llega después de una más nueva", () => {
    const g = createRefreshGate();
    const old = g.start();
    const fresh = g.start();
    expect(g.canApply(fresh)).toBe(true);
    expect(g.canApply(old)).toBe(false);
  });
  it("aplica la última foto sin cambios en medio", () => {
    const g = createRefreshGate();
    g.mutated();
    expect(g.canApply(g.start())).toBe(true);
  });
});
