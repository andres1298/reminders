"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { isLoaded, useAppState, useNow } from "@/lib/store";
import { homeTasks, summary, type HomeFilter } from "@/lib/view";
import { useFlash, useTaskUI } from "@/components/app/TaskUI";
import { LukasArt } from "@/components/lukas/LukasArt";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { TaskCard } from "./TaskCard";
import { InstallBanner } from "@/components/app/pwa";

export function HomeScreen() {
  // entrada escalonada solo si la pantalla arrancó sin datos (primera carga);
  // va antes de useAppState, que carga el almacén
  const [animateIn] = useState(() => !isLoaded());
  const state = useAppState();
  const nowMs = useNow();
  const flash = useFlash();
  const ui = useTaskUI();
  const [filter, setFilter] = useState<HomeFilter>("all");

  const ready = state && nowMs;
  const now = new Date(nowMs);
  const me = state?.members.find((m) => m.id === state.me);
  const tasks = ready ? homeTasks(state, now, filter) : [];
  const s = ready ? summary(state, now) : null;

  const filters: { id: HomeFilter; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "mine", label: "Mías" },
    { id: "today", label: "Hoy" },
    ...(state?.lists.slice(1).map((l) => ({ id: `list:${l.id}` as HomeFilter, label: `${l.emoji} ${l.name}` })) ?? []),
  ];
  const total = ready ? homeTasks(state, now, "all").length : 0;
  const next = ready ? homeTasks(state, now, "all").sort((a, b) => +new Date(a.task.nextDueAt!) - +new Date(b.task.nextDueAt!))[0] : null;

  return (
    <main aria-label="Inicio">
      <header className="home-head">
        <div className="home-head__row">
          <button className="btn btn--filled btn--sm" onClick={() => ui.openCreate()}>
            <Icon name="plus" size="sm" />
            Nueva tarea
          </button>
          <span className="spacer" />
          {state && (
            <span className="menu-btn" aria-label={`Hogar: ${state.household.name}`}>
              {state.household.emoji} {state.household.name}
            </span>
          )}
          {me && <Avatar emoji={me.emoji} name={me.name} size="lg" />}
        </div>
        <h1 className="hello">Hola{me ? `, ${me.name}` : ""}</h1>
        <p className="summary" aria-live="polite">
          {!s ? (
            <span className="skeleton skeleton--line" style={{ display: "block", width: "60%", height: 16, marginTop: 4 }} />
          ) : s.overdue || s.today ? (
            <>
              {s.overdue > 0 && (
                <>
                  <span className="dot" style={{ background: "var(--coral)" }} />
                  <b>{s.overdue} vencida{s.overdue > 1 ? "s" : ""}</b>
                </>
              )}
              {s.overdue > 0 && s.today > 0 && " · "}
              {s.today > 0 && (
                <>
                  <span className="dot" style={{ background: "var(--mustard)" }} />
                  <b>{s.today} para hoy</b>
                </>
              )}
              . Lo demás va bien.
            </>
          ) : (
            "Todo al día. Lukas aprueba."
          )}
        </p>
      </header>

      <InstallBanner />

      <nav className="filters" aria-label="Filtros">
        {filters.map((f) => (
          <button key={f.id} className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
            {f.id === "all" && ready ? <span className="chip__count">{total}</span> : null}
          </button>
        ))}
      </nav>

      {!ready ? (
        <div className="grid-cards" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skel-card">
              <div className="skeleton skeleton--circle" />
              <div className="skeleton skeleton--line" style={{ width: "80%" }} />
              <div className="skeleton skeleton--line" style={{ width: "46%", height: 28 }} />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty">
          <LukasArt name="sleepingPot" />
          <div className="empty__title">{filter === "today" ? "Nada para hoy" : filter === "all" ? "Nada pendiente" : "Aquí no hay nada"}</div>
          <p className="empty__msg">
            {next ? `Lo próximo es «${next.task.title}», ${next.label}.` : "Crea una tarea cuando haga falta."}
          </p>
          {filter !== "all" && (
            <button className="btn btn--bordered btn--sm" onClick={() => setFilter("all")}>
              Ver todas
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid-cards">
            <AnimatePresence initial={false} mode="popLayout">
              {tasks.map((v, i) => (
                <motion.div
                  key={v.task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.86, transition: { duration: 0.22 } }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                >
                  <TaskCard view={v} flashFrom={flash.get(v.task.id)} onMore={() => ui.openActions(v.task.id)} index={i} animateIn={animateIn} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="end-note">
            <LukasArt name="peek" />
            Eso es todo por ahora.
          </div>
        </>
      )}
      <div className="pad-tab" />
    </main>
  );
}
