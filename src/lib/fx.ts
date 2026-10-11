"use client";
import LukasArtSvg from "@/components/lukas/lukas-art";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* no disponible */
  }
}

/** Confeti de hojitas desde un punto de la pantalla (se omite con movimiento reducido). */
export function leafBurst(x: number, y: number, n = 14) {
  if (prefersReducedMotion()) return;
  const layer = document.getElementById("lukas-fx");
  if (!layer) return;
  const fills = ["var(--leaf)", "var(--moss)", "var(--olive)"];
  for (let i = 0; i < n; i++) {
    const el = document.createElement("div");
    el.className = "leaf";
    el.innerHTML = LukasArtSvg.leaf(fills[i % fills.length]);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    layer.appendChild(el);
    const ang = ((-90 + (i / n) * 360 + Math.random() * 24) * Math.PI) / 180;
    const dist = 70 + Math.random() * 70;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist - 30;
    const rot = Math.round(Math.random() * 360 - 180);
    const s = 0.7 + Math.random() * 0.6;
    el.animate(
      [
        { transform: "translate(0,0) rotate(0) scale(.2)", opacity: 0 },
        { transform: `translate(${dx * 0.6}px,${dy * 0.6}px) rotate(${rot * 0.5}deg) scale(${s})`, opacity: 1, offset: 0.35 },
        { transform: `translate(${dx}px,${dy + 90}px) rotate(${rot}deg) scale(${s * 0.9})`, opacity: 0 },
      ],
      { duration: 1000 + Math.random() * 300, easing: "cubic-bezier(.2,.7,.3,1)" },
    ).onfinish = () => el.remove();
  }
}

/** Squash & stretch de la tarjeta o el anillo al completar. */
export function squash(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  el.animate(
    [
      { transform: "scale(1,1)" },
      { transform: "scale(1.07,.9)", offset: 0.25 },
      { transform: "scale(.96,1.05)", offset: 0.55 },
      { transform: "scale(1.01,.99)", offset: 0.8 },
      { transform: "scale(1,1)" },
    ],
    { duration: 560, easing: "ease-out" },
  );
}

export function centerOf(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
