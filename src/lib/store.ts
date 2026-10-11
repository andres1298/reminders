"use client";
/**
 * Client store for the demo phase: AppState kept in memory and persisted to
 * localStorage. The UI talks to it through the same verbs the Supabase RPCs
 * expose (complete, skip, snooze, undo…), so swapping the backend later only
 * changes this module.
 */
import { useSyncExternalStore } from "react";
import { demoState } from "./demo-seed";
import type { AppState } from "./types";

const KEY = "lukas-demo-v1";
type Listener = () => void;

let state: AppState | null = null;
const listeners = new Set<Listener>();

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed?.version === 1) return parsed;
    }
  } catch {
    /* sin almacenamiento: se usa la demo en memoria */
  }
  return demoState();
}

function persist() {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export const isLoaded = () => state !== null;

export function getState(): AppState {
  if (!state) state = load();
  return state;
}

export function setState(next: AppState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

export function resetDemo() {
  setState(demoState());
}

function subscribe(l: Listener) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** null on the server and during hydration → render the skeleton. */
export function useAppState(): AppState | null {
  return useSyncExternalStore(subscribe, getState, () => null);
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
