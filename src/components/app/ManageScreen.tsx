"use client";
import Link from "next/link";
import { useAppState } from "@/lib/store";
import { scheduleText } from "@/lib/view";
import { LukasArt } from "@/components/lukas/LukasArt";

export function ManageScreen() {
  const state = useAppState();
  return (
    <main aria-label="Gestionar">
      <header className="simple-head">
        <h1>Gestionar</h1>
      </header>
      {state?.lists.map((l) => {
        const tasks = state.tasks.filter((t) => t.listId === l.id && !t.deletedAt && !t.completedAt);
        if (!tasks.length) return null;
        return (
          <section key={l.id}>
            <div className="section-header">{l.emoji} {l.name}</div>
            <div className="list list--inset">
              {tasks.map((t) => (
                <Link key={t.id} className="row row--lead" href={`/t/${t.id}`} transitionTypes={["nav-forward"]}>
                  <span className="row__lead">{t.emoji}</span>
                  <span className="row__main">
                    <span className="row__title">{t.title}</span>
                    <span className="row__sub">{scheduleText(t.schedule, t.dueTime)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
      <div className="soon-note">
        <LukasArt name="sprout" />
        <b>Pausar, Terminadas, Papelera y Modo vacaciones</b>
        Llegan con la conexión a Supabase (SPEC §4.3.1).
      </div>
      <div className="pad-tab" />
    </main>
  );
}
