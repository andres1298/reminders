import { describe, expect, it } from "vitest";
import { changedColumns } from "./mapping";

describe("changedColumns", () => {
  const before = { title: "A", next_due_at: "2026-10-14T01:00:00.000Z", current_assignee_id: "u1", schedule: { every: 3, unit: "day" } };
  it("solo manda lo que cambió (no pisa vencimiento ni turno de otro teléfono)", () => {
    expect(changedColumns(before, { ...before, title: "B" })).toEqual({ title: "B" });
  });
  it("compara jsonb por valor", () => {
    expect(changedColumns(before, { ...before, schedule: { every: 3, unit: "day" } })).toEqual({});
    expect(changedColumns(before, { ...before, schedule: { every: 2, unit: "day" } })).toEqual({ schedule: { every: 2, unit: "day" } });
  });
});
