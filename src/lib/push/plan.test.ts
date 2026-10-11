import { describe, expect, it } from "vitest";
import { occurrenceKey, planDueNotifications, type DueTaskRow } from "./plan";

const now = new Date("2026-10-13T01:00:00Z"); // lun 12 oct, 19:00 en Costa Rica
const base = {
  households: [{ id: "casa", timezone: "America/Costa_Rica", vacation_from: null, vacation_until: null }],
  members: [
    { household_id: "casa", user_id: "a", display_name: "Andrés" },
    { household_id: "casa", user_id: "m", display_name: "Mari" },
  ],
  subscriptions: [
    { id: "s1", user_id: "a", endpoint: "https://push/a-iphone", p256dh: "k", auth: "x" },
    { id: "s2", user_id: "a", endpoint: "https://push/a-mac", p256dh: "k", auth: "x" },
    { id: "s3", user_id: "m", endpoint: "https://push/m", p256dh: "k", auth: "x" },
  ],
  prefs: [],
  alreadySent: new Set<string>(),
  now,
};
const basura: DueTaskRow = {
  id: "basura", household_id: "casa", emoji: "🗑️", title: "Sacar la basura",
  next_due_at: "2026-10-13T01:00:00Z", assignment_mode: "rotation", current_assignee_id: "a",
};

describe("avisos push", () => {
  it("a la hora de vencimiento avisa al responsable en todos sus dispositivos", () => {
    const d = planDueNotifications({ ...base, tasks: [basura] });
    expect(d.map((x) => x.subscription.id)).toEqual(["s1", "s2"]);
    expect(d[0].payload).toEqual({ title: "🗑️ Sacar la basura", body: "Toca ahora (19:00) · le toca a Andrés", url: "/t/basura", tag: "task-basura" });
  });

  it("'Cualquiera' avisa a todo el hogar", () => {
    const d = planDueNotifications({ ...base, tasks: [{ ...basura, assignment_mode: "anyone", current_assignee_id: null }] });
    expect(new Set(d.map((x) => x.userId))).toEqual(new Set(["a", "m"]));
  });

  it("una sola vez por ocurrencia", () => {
    const sent = new Set([`a|${occurrenceKey("basura", basura.next_due_at)}`]);
    expect(planDueNotifications({ ...base, tasks: [basura], alreadySent: sent })).toEqual([]);
  });

  it("no avisa antes de tiempo ni ocurrencias viejas (más de 30 min)", () => {
    expect(planDueNotifications({ ...base, tasks: [{ ...basura, next_due_at: "2026-10-13T01:05:00Z" }] })).toEqual([]);
    expect(planDueNotifications({ ...base, tasks: [{ ...basura, next_due_at: "2026-10-13T00:20:00Z" }] })).toEqual([]);
  });

  it("respeta vacaciones y la preferencia de push", () => {
    const vac = [{ ...base.households[0], vacation_from: "2026-10-10T00:00:00Z", vacation_until: "2026-10-20T00:00:00Z" }];
    expect(planDueNotifications({ ...base, households: vac, tasks: [basura] })).toEqual([]);
    expect(planDueNotifications({ ...base, prefs: [{ user_id: "a", push: false, per_task: true }], tasks: [basura] })).toEqual([]);
  });
});
