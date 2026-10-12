import { describe, it, expect } from "vitest";
import { availableAlerts, validAlert } from "./alerts";
import { firstDue } from "./schedule";
const now = new Date("2026-10-12T18:00:00Z");
describe("anticipos permitidos", () => {
  it("dos horas exactas solo permiten 15, 30 y 60 minutos", () => {
    expect(availableAlerts(new Date(+now + 120 * 60_000), now).map((o) => o.minutes)).toEqual([15, 30, 60]);
  });
  it("una fecha para hoy respeta la hora del hogar", () => {
    const due = firstDue({ schedule: { type: "once", date: "2026-10-12" }, startsOn: "2026-10-12", dueTime: "14:00", timeZone: "America/Costa_Rica" }, now);
    expect(availableAlerts(due, now).map((o) => o.minutes)).toEqual([15, 30, 60]);
    expect(validAlert(4320, due, now)).toBe(false);
  });
  it("sin fecha, vencidos o a 15 minutos no ofrecen anticipos", () => {
    for (const due of [null, new Date(+now-1), new Date(+now+15*60_000)]) expect(availableAlerts(due, now)).toEqual([]);
  });
  it("al pasar el tiempo una selección deja de ser válida", () => {
    const due = new Date(+now + 61 * 60_000);
    expect(validAlert(60, due, now)).toBe(true);
    expect(validAlert(60, due, new Date(+now + 60_000))).toBe(false);
    expect(validAlert(null, due, now)).toBe(true);
    expect(validAlert(45, due, now)).toBe(false);
  });
  it("las fechas lejanas muestran todos los anticipos fijos", () => {
    expect(availableAlerts(new Date(+now + 4*86400_000), now)).toHaveLength(7);
  });
});
