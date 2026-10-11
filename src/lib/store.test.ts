import { beforeEach, describe, expect, it } from "vitest";
import { demoState } from "./demo-seed";
import { applyServer, endSession, getState, revertToServer, setState, startSession } from "./store";

const mem = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage;

beforeEach(() => {
  mem.clear();
  endSession();
});

describe("store", () => {
  it("startSession publica la caché de ese usuario", () => {
    const s = { ...demoState(), me: "u1" };
    mem.set("lukas-cache-u1", JSON.stringify(s));
    startSession("u1");
    expect(getState().me).toBe("u1");
  });

  it("sin caché no hay estado todavía", () => {
    startSession("u2");
    expect(getState()).toBeNull();
  });

  it("applyServer guarda la caché y publica", () => {
    startSession("u1");
    const s = { ...demoState(), me: "u1" };
    applyServer(s);
    expect(getState()).toBe(s);
    expect(JSON.parse(mem.get("lukas-cache-u1")!).me).toBe("u1");
  });

  it("revertToServer deshace el cambio optimista", () => {
    startSession("u1");
    const server = { ...demoState(), me: "u1" };
    applyServer(server);
    setState({ ...server, tasks: [] });
    expect(getState().tasks).toHaveLength(0);
    revertToServer();
    expect(getState()).toBe(server);
  });

  it("endSession borra la caché del usuario y la demo vieja", () => {
    startSession("u1");
    applyServer({ ...demoState(), me: "u1" });
    mem.set("lukas-demo-v1", "{}");
    endSession();
    expect(mem.has("lukas-cache-u1")).toBe(false);
    expect(mem.has("lukas-demo-v1")).toBe(false);
    expect(getState()).toBeNull();
  });
});
