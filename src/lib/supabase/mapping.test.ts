import { describe, expect, it } from "vitest";
import type { Schedule } from "../schedule";
import { buildState, scheduleFromRow, scheduleToRow, snoozeLabel, taskFromRow } from "./mapping";
import type { EventRow, TaskRow } from "./rows";

const baseTask: TaskRow = {
  id: "t1",
  household_id: "h1",
  list_id: null,
  emoji: "🗑️",
  title: "Sacar la basura",
  description: null,
  schedule_type: "weekly",
  schedule: { weekdays: [2, 4], everyWeeks: 1 },
  anchor: "schedule",
  due_time: "19:00:00",
  starts_on: "2026-10-01",
  ends_on: null,
  color: null,
  assignment_mode: "anyone",
  current_assignee_id: null,
  cycle_started_at: "2026-10-08T01:00:00.000Z",
  next_due_at: "2026-10-14T01:00:00.000Z",
  completed_at: null,
  paused_at: null,
  deleted_at: null,
  created_by: "u1",
};

const ev = (e: Partial<EventRow>): EventRow => ({
  id: "e",
  task_id: "t1",
  kind: "done",
  assignee_at_time: null,
  credited_to: null,
  due_at_snapshot: null,
  snoozed_until: null,
  prev_next_due_at: "2026-10-12T01:00:00.000Z",
  prev_cycle_started_at: "2026-10-05T01:00:00.000Z",
  prev_assignee_id: null,
  undone_at: null,
  created_at: "2026-10-12T02:00:00.000Z",
  ...e,
});

describe("programación", () => {
  const cases: Schedule[] = [
    { type: "interval", every: 3, unit: "day", anchor: "completion" },
    { type: "weekly", weekdays: [2, 4], everyWeeks: 1 },
    { type: "monthly", day: "last", everyMonths: 1 },
    { type: "once", date: "2026-10-20" },
  ];
  it.each(cases)("ida y vuelta %o", (s) => {
    expect(scheduleFromRow(scheduleToRow(s))).toEqual(s);
  });
  it("el jsonb es el Schedule sin type ni anchor, en camelCase", () => {
    expect(scheduleToRow({ type: "weekly", weekdays: [2, 4], everyWeeks: 1 })).toEqual({
      schedule_type: "weekly",
      schedule: { weekdays: [2, 4], everyWeeks: 1 },
      anchor: "schedule",
    });
    expect(scheduleToRow(cases[0]).anchor).toBe("completion");
  });
});

describe("taskFromRow", () => {
  it("hora, color, descripción y lista por defecto", () => {
    const t = taskFromRow(baseTask, [], [], "general");
    expect(t.dueTime).toBe("19:00");
    expect(t.color).toBe("none");
    expect(t.description).toBe("");
    expect(t.listId).toBe("general");
  });

  it("responsables", () => {
    expect(taskFromRow(baseTask, [], [], "l").assignment).toEqual({ mode: "anyone" });
    expect(taskFromRow({ ...baseTask, assignment_mode: "fixed", current_assignee_id: "u1" }, [], [], "l").assignment).toEqual({
      mode: "fixed",
      userId: "u1",
    });
    const rot = taskFromRow(
      { ...baseTask, assignment_mode: "rotation", current_assignee_id: "u2" },
      [
        { task_id: "t1", user_id: "u2", position: 1 },
        { task_id: "t1", user_id: "u1", position: 0 },
      ],
      [],
      "l",
    );
    expect(rot.assignment).toEqual({ mode: "rotation", order: ["u1", "u2"], current: "u2" });
  });

  it("eventos → history", () => {
    const t = taskFromRow(
      { ...baseTask, assignment_mode: "fixed", current_assignee_id: "u1" },
      [],
      [
        ev({ id: "old", credited_to: "u1", assignee_at_time: "u1", created_at: "2026-10-01T00:00:00.000Z" }),
        ev({ id: "chosen", credited_to: "u2", assignee_at_time: "u1", prev_assignee_id: "u1", created_at: "2026-10-10T00:00:00.000Z" }),
        ev({ id: "undone", kind: "skipped", undone_at: "2026-10-11T00:00:00.000Z", created_at: "2026-10-11T00:00:00.000Z" }),
        ev({ id: "u", kind: "undone", created_at: "2026-10-11T00:01:00.000Z" }),
        ev({ id: "m", kind: "missed", created_at: "2026-10-11T00:02:00.000Z" }),
      ],
      "l",
    );
    expect(t.history.map((e) => e.id)).toEqual(["undone", "chosen", "old"]);
    expect(t.history[0].undone).toBe(true);
    expect(t.history[1].chosen).toBe(true);
    expect(t.history[1].creditedTo).toBe("u2");
    expect(t.history[1].prev.assignment).toEqual({ mode: "fixed", userId: "u1" });
    expect(t.history[2].chosen).toBe(false);
  });
});

describe("snoozeLabel", () => {
  const at = "2026-10-12T12:00:00.000Z";
  const plus = (min: number) => new Date(+new Date(at) + min * 60_000).toISOString();
  it.each([
    [60, "+1 h"],
    [1440, "+1 día"],
    [4320, "+3 días"],
  ])("+%i min → %s", (min, label) => {
    expect(snoozeLabel(at, plus(min))).toBe(label);
  });
});

describe("buildState", () => {
  it("ordena listas, mapea miembros y conserva me", () => {
    const s = buildState({
      me: "u1",
      household: { id: "h1", name: "Casa", emoji: "🏡", timezone: "America/Costa_Rica" },
      members: [{ user_id: "u1", role: "admin", profiles: { display_name: "Andrés", avatar_emoji: "🌵" } }],
      lists: [
        { id: "b", name: "Plantas", emoji: "🪴", position: 1 },
        { id: "a", name: "General", emoji: "📌", position: 0 },
      ],
      tasks: [baseTask],
      rotation: [],
      events: [],
      todos: [],
    });
    expect(s.me).toBe("u1");
    expect(s.lists.map((l) => l.id)).toEqual(["a", "b"]);
    expect(s.members).toEqual([{ id: "u1", name: "Andrés", emoji: "🌵", role: "admin" }]);
    expect(s.household.timeZone).toBe("America/Costa_Rica");
    expect(s.tasks[0].listId).toBe("a");
  });
});
