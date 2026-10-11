"use client";
export type ThemePref = "light" | "dark" | "system";
const KEY = "lukas-theme";

/** Script en línea del layout: aplica el tema antes de pintar (sin destello). */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${KEY}")||"light";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})()`;

const listeners = new Set<() => void>();
export function subscribeTheme(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function readThemePreference(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "dark" || v === "system" || v === "light") return v;
  } catch {
    /* sin almacenamiento */
  }
  return "light";
}

/** Cambia el tema con una transición circular desde el control tocado (View Transitions). */
export function applyTheme(pref: ThemePref, origin?: Element | null) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const next = dark ? "dark" : "light";
  const root = document.documentElement;
  if (root.getAttribute("data-theme") === next) return;
  const go = () => root.setAttribute("data-theme", next);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduced) return go();
  if (origin) {
    const r = origin.getBoundingClientRect();
    root.style.setProperty("--rx", `${r.left + r.width / 2}px`);
    root.style.setProperty("--ry", `${r.top + r.height / 2}px`);
  }
  root.classList.add("vt-theme");
  document.startViewTransition(go).finished.finally(() => root.classList.remove("vt-theme"));
}
