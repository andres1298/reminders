/**
 * Cola de cambios hacia Supabase: corre en serie (así "Hecha" y luego
 * "Deshacer" llegan en ese orden) y traduce los errores a mensajes.
 */

export type SyncError = "already_done" | "not_found" | "offline" | "auth" | "unknown";

export function classifyError(e: unknown): SyncError {
  const err = (e ?? {}) as { message?: string; code?: string; status?: number; name?: string };
  const msg = err.message ?? "";
  if (msg === "already_done" || e instanceof Error && e.name === "AlreadyDoneError") return "already_done";
  if (/^(task_not_found|todo_not_found|forbidden)$/.test(msg) || err.code === "42501" || err.code === "P0002") return "not_found";
  if (err.status === 401 || err.code === "PGRST301" || /JWT expired/i.test(msg)) return "auth";
  if (e instanceof TypeError || /Failed to fetch|Load failed|NetworkError/i.test(msg)) return "offline";
  return "unknown";
}

const MESSAGES: Record<SyncError, string> = {
  already_done: "Ya estaba hecha 🐾",
  not_found: "Esa tarea ya no existe",
  offline: "Sin conexión: no se guardó",
  auth: "",
  unknown: "No se pudo guardar. Intenta otra vez",
};

export const errorMessage = (e: SyncError) => MESSAGES[e];

export interface SyncQueue {
  push(job: () => Promise<void>): void;
  busy(): boolean;
}

export function createSyncQueue(opts: { onError: (e: SyncError) => void; onIdle: () => void }): SyncQueue {
  const jobs: (() => Promise<void>)[] = [];
  let running = false;

  async function drain() {
    running = true;
    while (jobs.length) {
      const job = jobs.shift()!;
      try {
        await job();
      } catch (e) {
        // lo que sigue se calculó sobre un estado que el servidor rechazó
        jobs.length = 0;
        running = false;
        opts.onError(classifyError(e));
        opts.onIdle();
        return;
      }
    }
    running = false;
    opts.onIdle();
  }

  return {
    push(job) {
      jobs.push(job);
      if (!running) void drain();
    },
    busy: () => running || jobs.length > 0,
  };
}
