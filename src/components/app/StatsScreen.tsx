"use client";
import { useAppState, useNow } from "@/lib/store";
import { summary } from "@/lib/view";
import { LukasArt } from "@/components/lukas/LukasArt";

export function StatsScreen() {
  const state = useAppState();
  const now = useNow();
  const s = state && now ? summary(state, new Date(now)) : null;
  return (
    <main aria-label="Estadísticas">
      <header className="simple-head">
        <h1>Estadísticas</h1>
        <p className="summary">Pendientes del hogar, ahora</p>
      </header>
      <div className="stat-tiles">
        {([["coral", s?.overdue, "vencidas"], ["mustard", s?.today, "para hoy"], ["leaf", s?.week, "esta semana"]] as const).map(([c, n, l]) => (
          <div key={l} className="stat-tile" style={{ background: `var(--${c})` }}>
            <b>{n ?? "–"}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <div className="soon-note">
        <LukasArt name="sprout" />
        <b>Por persona y por lista, en la siguiente fase</b>
        Completadas por crédito y sin hacer por responsable.
      </div>
      <div className="pad-tab" />
    </main>
  );
}
