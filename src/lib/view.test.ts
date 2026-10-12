import { describe, expect, it } from "vitest";
import { demoState } from "./demo-seed";
import { currentAssignee } from "./types";
import { homeTasks } from "./view";

const now = new Date("2026-10-10T23:40:00Z");

describe("filtros de inicio", () => {
  it("por persona: solo las tareas que le tocan ahora a esa persona", () => {
    const s = demoState(now);
    const mari = homeTasks(s, now, "person:mari");
    expect(mari.length).toBeGreaterThan(0);
    expect(mari.every((v) => currentAssignee(v.task.assignment) === "mari")).toBe(true);
  });

  it("«Mías» es el filtro de la persona con sesión", () => {
    const s = demoState(now);
    expect(homeTasks(s, now, "mine")).toEqual(homeTasks(s, now, `person:${s.me}`));
  });
});
