import { describe, expect, it } from "vitest";
import { demoState } from "./demo-seed";
import { AlreadyDoneError, addTodo, completeTask, createTask, skipTask, undoLast, updateTask, type TaskInput } from "./tasks";
import { currentAssignee } from "./types";

const now = new Date("2026-10-10T23:40:00Z"); // sáb 10 oct, 17:40 en Costa Rica

describe("completar", () => {
  it("rotación [Andrés, Mari]: sin elegir, crédito para Andrés y el turno pasa a Mari", () => {
    const s = demoState(now);
    const r = completeTask(s, "basura", now);
    expect(r.creditedTo).toBe("andres");
    const t = r.state.tasks.find((x) => x.id === "basura")!;
    expect(currentAssignee(t.assignment)).toBe("mari");
    expect(+new Date(t.nextDueAt!)).toBeGreaterThan(+now);
    expect(t.cycleStartedAt).toBe(now.toISOString());
  });

  it("'La hizo alguien más': el crédito es para quien se elige y el turno igual avanza", () => {
    const r = completeTask(demoState(now), "basura", now, { creditTo: "mari" });
    expect(r.creditedTo).toBe("mari");
    expect(currentAssignee(r.state.tasks.find((x) => x.id === "basura")!.assignment)).toBe("mari");
  });

  it("'Cualquiera' sin elegir: crédito para Hogar (null)", () => {
    expect(completeTask(demoState(now), "arenero", now).creditedTo).toBeNull();
  });

  it("no se puede completar dos veces la misma ocurrencia", () => {
    const s = demoState(now);
    const due = s.tasks.find((x) => x.id === "basura")!.nextDueAt;
    const r = completeTask(s, "basura", now, { expectedDue: due });
    expect(() => completeTask(r.state, "basura", now, { expectedDue: due })).toThrow(AlreadyDoneError);
  });

  it("deshacer devuelve vencimiento, ciclo y turno", () => {
    const s = demoState(now);
    const before = s.tasks.find((x) => x.id === "basura")!;
    const after = undoLast(completeTask(s, "basura", now).state, "basura").tasks.find((x) => x.id === "basura")!;
    expect(after.nextDueAt).toBe(before.nextDueAt);
    expect(after.cycleStartedAt).toBe(before.cycleStartedAt);
    expect(after.assignment).toEqual(before.assignment);
    expect(after.history[0].undone).toBe(true);
  });

  it("una vez: al completarla queda terminada", () => {
    const r = completeTask(demoState(now), "vacuna", now);
    const t = r.state.tasks.find((x) => x.id === "vacuna")!;
    expect(r.nextDue).toBeNull();
    expect(t.completedAt).toBe(now.toISOString());
    expect(() => skipTask(r.state, "vacuna", now)).toThrow();
  });

  it("crédito para alguien fuera del hogar falla", () => {
    expect(() => completeTask(demoState(now), "basura", now, { creditTo: "otra" })).toThrow("credit_not_member");
  });
});

describe("crear", () => {
  it("calcula el primer vencimiento con la zona horaria del hogar", () => {
    const s = demoState(now);
    const { task } = createTask(
      s,
      {
        emoji: "🌱", title: "Regar el helecho", description: "", listId: "plantas", color: "sky",
        schedule: { type: "interval", every: 3, unit: "day", anchor: "completion" }, dueTime: "09:00", startsOn: "2026-10-10",
        assignment: { mode: "anyone" },
      },
      now,
    );
    expect(task.nextDueAt).toBe("2026-10-13T15:00:00.000Z"); // martes 9:00 en Costa Rica
  });

  const helecho: TaskInput = {
    emoji: "🌱", title: "Regar el helecho", description: "", listId: "plantas", color: "sky",
    schedule: { type: "interval", every: 2, unit: "week", anchor: "schedule" }, dueTime: "09:00", startsOn: "2026-11-02",
    assignment: { mode: "anyone" },
  };

  it("con fecha de inicio futura, la primera vez es ese día y luego cada intervalo", () => {
    const { state, task } = createTask(demoState(now), helecho, now);
    expect(task.nextDueAt).toBe("2026-11-02T15:00:00.000Z"); // lun 2 nov, 9:00 en Costa Rica
    const { nextDue } = completeTask(state, task.id, new Date("2026-11-02T16:00:00Z"));
    expect(nextDue?.toISOString()).toBe("2026-11-16T15:00:00.000Z");
  });

  it("cambiar la fecha de inicio al editar recalcula el vencimiento", () => {
    const { state, task } = createTask(demoState(now), { ...helecho, startsOn: "2026-10-10" }, now);
    expect(task.nextDueAt).toBe("2026-10-24T15:00:00.000Z");
    const edited = updateTask(state, task.id, helecho, now);
    expect(edited.tasks.find((t) => t.id === task.id)!.nextDueAt).toBe("2026-11-02T15:00:00.000Z");
  });
});

describe("pendientes", () => {
  it("emoji automático y texto limpio", () => {
    const { todo } = addTodo(demoState(now), "  Comprar bombillos de repuesto ", null, true, now);
    expect(todo.text).toBe("Comprar bombillos de repuesto");
    expect(todo.emoji).toBe("💡");
    expect(() => addTodo(demoState(now), "   ", null, false, now)).toThrow("empty_todo");
  });
});
