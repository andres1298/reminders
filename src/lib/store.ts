"use client";
/**
 * Almacén del cliente: la última foto del hogar que mandó Supabase, guardada
 * en localStorage por usuario para abrir sin conexión. Las acciones aplican
 * primero un cambio optimista (setState) y DataProvider lo manda al servidor;
 * si falla, revertToServer vuelve a la foto.
 */
import { useSyncExternalStore } from "react";
import type { AppState } from "./types";

const LEGACY_KEY = "lukas-demo-v1";
const cacheKey = (userId: string) => `lukas-cache-${userId}`;
type Listener = () => void;

let userId: string | null = null;
let state: AppState | null = null;
let server: AppState | null = null;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

function readCache(id: string): AppState | null {
  try {
    const raw = localStorage.getItem(cacheKey(id));
    const parsed = raw ? (JSON.parse(raw) as AppState) : null;
    return parsed?.version === 1 && parsed.me === id ? parsed : null;
  } catch {
    return null;
  }
}

export const isLoaded = () => state !== null;

/** El estado actual. Las acciones solo corren con datos cargados. */
export function getState(): AppState {
  return state as AppState;
}

/** Abre la sesión de un usuario con lo último guardado en este dispositivo. */
export function startSession(id: string) {
  if (userId === id) return;
  userId = id;
  server = state = readCache(id);
  emit();
}

/** Foto nueva del servidor: se guarda y se publica. */
export function applyServer(next: AppState) {
  server = state = next;
  try {
    if (userId) localStorage.setItem(cacheKey(userId), JSON.stringify(next));
  } catch {
    /* sin almacenamiento: solo en memoria */
  }
  emit();
}

/** Cambio optimista (no se guarda en caché hasta que llegue la foto del servidor). */
export function setState(next: AppState) {
  state = next;
  emit();
}

export function revertToServer() {
  state = server;
  emit();
}

/** Cerrar sesión: borra los datos de este usuario del dispositivo. */
export function endSession() {
  try {
    if (userId) localStorage.removeItem(cacheKey(userId));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
  userId = state = server = null;
  emit();
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** null en el servidor y mientras no haya datos → se muestra el esqueleto. */
export function useAppState(): AppState | null {
  return useSyncExternalStore(subscribe, () => state, () => null);
}

// --- reloj compartido (avanza cada minuto) ---------------------------------
let nowValue = 0;
const clockListeners = new Set<Listener>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribeClock(l: Listener) {
  clockListeners.add(l);
  if (!timer) {
    timer = setInterval(() => {
      nowValue = Date.now();
      clockListeners.forEach((x) => x());
    }, 60_000);
  }
  return () => {
    clockListeners.delete(l);
    if (!clockListeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getNow() {
  if (!nowValue) nowValue = Date.now();
  return nowValue;
}

/** Current minute as epoch ms (0 on the server). */
export function useNow(): number {
  return useSyncExternalStore(subscribeClock, getNow, () => 0);
}

/** Force the shared clock forward (after an action, so labels update at once). */
export function tickNow() {
  nowValue = Date.now();
  clockListeners.forEach((x) => x());
}
