import { TZDate } from "@date-fns/tz";
import { describe, expect, it } from "vitest";
import {
  firstDue,
  nextDueAfterCompletion,
  nextDueAfterSkip,
  nextDueOnResume,
  type Schedule,
  type ScheduleContext,
} from "./schedule";
import { dueLabel, progress, taskStatus } from "./status";

const CR = "America/Costa_Rica";
/** Wall-clock time in Costa Rica (UTC−6). */
const cr = (y: number, m: number, d: number, h = 0, min = 0) => new Date(+new TZDate(y, m - 1, d, h, min, 0, 0, CR));
const ctx = (schedule: Schedule, dueTime = "09:00", startsOn = "2026-01-01", timeZone = CR): ScheduleContext => ({
  schedule,
  dueTime,
  startsOn,
  timeZone,
});

// 2026-10-13 is a Tuesday, 2026-10-15 a Thursday.
const basura = ctx({ type: "weekly", weekdays: [2, 4], everyWeeks: 1 }, "19:00");

describe("SPEC §12 · criterios de aceptación", () => {
  it("basura martes y jueves 19:00: completada el martes 20:00 → jueves 19:00", () => {
    expect(nextDueAfterCompletion(basura, cr(2026, 10, 13, 19), cr(2026, 10, 13, 20))).toEqual(cr(2026, 10, 15, 19));
  });

  it("no acumula: vencida el martes, completada el jueves 19:30 → martes siguiente", () => {
    // The pending occurrence is still Tuesday's; Thursday's has also passed.
    expect(nextDueAfterCompletion(basura, cr(2026, 10, 13, 19), cr(2026, 10, 15, 19, 30))).toEqual(cr(2026, 10, 20, 19));
  });

  it("completar antes de la hora no repite la misma ocurrencia", () => {
    expect(nextDueAfterCompletion(basura, cr(2026, 10, 13, 19), cr(2026, 10, 13, 8))).toEqual(cr(2026, 10, 15, 19));
  });

  it("desparasitante cada mes desde la última vez: vencía 10/10, completado 15/10 → 15/11 a la hora", () => {
    const c = ctx({ type: "interval", every: 1, unit: "month", anchor: "completion" });
    expect(nextDueAfterCompletion(c, cr(2026, 10, 10, 9), cr(2026, 10, 15, 16, 45))).toEqual(cr(2026, 11, 15, 9));
  });

  it("apartamento día 3, anclado: completado el 5 → día 3 del mes siguiente", () => {
    const c = ctx({ type: "monthly", day: 3, everyMonths: 1 });
    expect(nextDueAfterCompletion(c, cr(2026, 10, 3, 9), cr(2026, 10, 5, 12))).toEqual(cr(2026, 11, 3, 9));
  });

  it("día 31 en febrero → último día de febrero", () => {
    const c = ctx({ type: "monthly", day: 31, everyMonths: 1 });
    expect(nextDueAfterCompletion(c, cr(2027, 1, 31, 9), cr(2027, 1, 31, 10))).toEqual(cr(2027, 2, 28, 9));
    expect(nextDueAfterCompletion(c, cr(2028, 1, 31, 9), cr(2028, 1, 31, 10))).toEqual(cr(2028, 2, 29, 9));
  });

  it("vacaciones del 10 al 20: 'cada 3 días desde la última vez' vence el 23", () => {
    const c = ctx({ type: "interval", every: 3, unit: "day", anchor: "completion" });
    expect(nextDueOnResume(c, cr(2026, 10, 20, 0, 1))).toEqual(cr(2026, 10, 23, 9));
  });

  it("una vez: completada no tiene próximo vencimiento", () => {
    const c = ctx({ type: "once", date: "2026-10-20" }, "10:00");
    expect(firstDue(c, cr(2026, 10, 1))).toEqual(cr(2026, 10, 20, 10));
    expect(nextDueAfterCompletion(c, cr(2026, 10, 20, 10), cr(2026, 10, 20, 11))).toBeNull();
  });
});

describe("programaciones", () => {
  it("intervalo anclado a la fecha no se desplaza si se hace tarde", () => {
    const c = ctx({ type: "interval", every: 2, unit: "week", anchor: "schedule" }, "09:00", "2026-10-04");
    expect(nextDueAfterCompletion(c, cr(2026, 10, 18, 9), cr(2026, 10, 21, 12))).toEqual(cr(2026, 11, 1, 9));
  });

  it("cada 2 semanas en martes respeta la semana de inicio", () => {
    const c = ctx({ type: "weekly", weekdays: [2], everyWeeks: 2 }, "19:00", "2026-10-12");
    expect(firstDue(c, cr(2026, 10, 12))).toEqual(cr(2026, 10, 13, 19));
    expect(nextDueAfterCompletion(c, cr(2026, 10, 13, 19), cr(2026, 10, 13, 20))).toEqual(cr(2026, 10, 27, 19));
  });

  it("'último' día del mes", () => {
    const c = ctx({ type: "monthly", day: "last", everyMonths: 1 });
    expect(firstDue(c, cr(2026, 4, 2))).toEqual(cr(2026, 4, 30, 9));
  });

  it("crear 'cada 3 días' por la tarde: la de hoy a las 9:00 ya pasó, salta 3 días", () => {
    const c = ctx({ type: "interval", every: 3, unit: "day", anchor: "completion" }, "09:00", "2026-10-10");
    expect(firstDue(c, cr(2026, 10, 10, 17, 40))).toEqual(cr(2026, 10, 13, 9));
  });

  it("saltar una semanal avanza a la siguiente ocurrencia futura", () => {
    expect(nextDueAfterSkip(basura, cr(2026, 10, 13, 19), cr(2026, 10, 13, 10))).toEqual(cr(2026, 10, 15, 19));
  });

  it("mantiene la hora local al cruzar un cambio de horario", () => {
    const ny = ctx({ type: "interval", every: 1, unit: "day", anchor: "completion" }, "19:00", "2026-10-01", "America/New_York");
    const done = new Date(+new TZDate(2026, 9, 31, 20, 0, 0, 0, "America/New_York")); // sáb 31 oct (EDT)
    const next = nextDueAfterCompletion(ny, done, done)!;
    expect(new TZDate(+next, "America/New_York").getHours()).toBe(19); // dom 1 nov (EST)
    expect(+next - +done).toBe(24 * 3_600_000); // 23 h de reloj + 1 h por el cambio
  });
});

describe("estado del anillo", () => {
  const now = cr(2026, 10, 10, 17, 40);
  it("progreso limitado a [0, 1]", () => {
    expect(progress(cr(2026, 10, 9, 20), cr(2026, 10, 10, 20), now)).toBeCloseTo(0.903, 2);
    expect(progress(cr(2026, 10, 6, 19), cr(2026, 10, 8, 19), now)).toBe(1);
  });
  it("al día · pronto · vencida", () => {
    expect(taskStatus(cr(2026, 10, 8, 10), cr(2026, 10, 15, 10), now, CR)).toBe("ok");
    expect(taskStatus(cr(2026, 10, 8, 9), cr(2026, 10, 11, 9), now, CR)).toBe("soon"); // 0.79
    expect(taskStatus(cr(2026, 10, 1), cr(2026, 10, 10, 23), now, CR)).toBe("soon"); // vence hoy
    expect(taskStatus(cr(2026, 10, 6, 19), cr(2026, 10, 8, 19), now, CR)).toBe("overdue");
  });
  it("etiquetas", () => {
    expect(dueLabel(cr(2026, 10, 8, 19), now, CR)).toBe("vencida hace 2 d");
    expect(dueLabel(cr(2026, 10, 10, 15), now, CR)).toBe("vencida hace 3 h");
    expect(dueLabel(cr(2026, 10, 10, 20), now, CR)).toBe("hoy 20:00");
    expect(dueLabel(cr(2026, 10, 11, 9), now, CR)).toBe("mañana 9:00");
    expect(dueLabel(cr(2026, 10, 15, 9), now, CR)).toBe("en 5 d");
  });
});
