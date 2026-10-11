"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ViewTransition, type CSSProperties } from "react";
import { formatDue } from "@/lib/status";
import { useAppState, useNow } from "@/lib/store";
import { HOGAR } from "@/lib/types";
import { scheduleText, viewTask } from "@/lib/view";
import { useFlash, useTaskUI } from "@/components/app/TaskUI";
import { LukasArt } from "@/components/lukas/LukasArt";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { StatusChip } from "@/components/ui/StatusChip";
import { FlashRing } from "./TaskCard";

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  const nowMs = useNow();
  const flash = useFlash();
  const ui = useTaskUI();

  if (!state || !nowMs) return <div className="hero" style={{ minHeight: 360 }} aria-busy="true" />;

  const task = state.tasks.find((t) => t.id === id && !t.deletedAt);
  const view = task ? viewTask(state, task, new Date(nowMs)) : null;
  if (!task || !view) {
    return (
      <main className="simple-head">
        <Link className="icon-btn" href="/" aria-label="Volver a Inicio" transitionTypes={["nav-back"]}>
          <Icon name="back" />
        </Link>
        <div className="empty">
          <LukasArt name="peek" />
          <div className="empty__title">Esta tarea ya no está</div>
          <p className="empty__msg">Puede que la hayan borrado o terminado. Un admin la encuentra en la Papelera.</p>
        </div>
      </main>
    );
  }

  const tz = state.household.timeZone;
  const flashFrom = flash.get(task.id);
  const member = (mid: string | null | undefined) => (mid ? state.members.find((m) => m.id === mid) : null) ?? HOGAR;
  const list = state.lists.find((l) => l.id === task.listId);
  const color = task.color === "none" ? "var(--surface)" : `var(--${task.color})`;
  const overdue = view.status === "overdue";

  return (
    <main aria-label={`Detalle de ${task.title}`}>
      <ViewTransition name={`task-${task.id}`} share="morph" default="none">
        <header className={["hero", flashFrom !== undefined ? "is-flash" : ""].join(" ").trim()} style={{ "--card": color } as CSSProperties}>
          <div className="hero__bar">
            <Link className="icon-btn" href="/" aria-label="Volver a Inicio" transitionTypes={["nav-back"]}>
              <Icon name="back" />
            </Link>
            <button className="icon-btn" aria-label="Más acciones" onClick={() => ui.openActions(task.id)}>
              <Icon name="more-h" />
            </button>
          </div>
          <div className="hero__body">
            <div data-hero-ring="">
              <FlashRing view={view} flashFrom={flashFrom} size="lg" />
            </div>
            <h1 className="hero__title">{task.title}</h1>
            <p className="hero__sched">{scheduleText(task.schedule, task.dueTime)}</p>
            <StatusChip status={flashFrom !== undefined ? "done" : view.status} label={view.label} />
          </div>
        </header>
      </ViewTransition>

      <div className="detail-body">
        <div className="quick">
          <button className="toolbar__action" onClick={() => ui.openSnooze(task.id)}>
            <Icon name="snooze" />Posponer
          </button>
          <button className="toolbar__action" onClick={() => ui.skip(task.id)} disabled={task.schedule.type === "once"}>
            <Icon name="skip" />Saltar
          </button>
          <button className="toolbar__action" onClick={() => ui.openCreate(task.id)}>
            <Icon name="edit" />Editar
          </button>
          <button className="toolbar__action toolbar__action--danger" onClick={() => ui.remove(task.id)}>
            <Icon name="trash" />Borrar
          </button>
        </div>

        <div className="list list--inset">
          <div className="row">
            <span className="row__main"><span className="row__title">{overdue ? "Vencía" : "Próximo"}</span></span>
            <span className="row__value">{formatDue(new Date(task.nextDueAt!), tz)}</span>
          </div>
          <div className="row">
            <span className="row__main">
              <span className="row__title">Le toca a</span>
              {task.assignment.mode === "rotation" && (
                <span className="row__sub">Rotación: {task.assignment.order.map((m) => member(m).name).join(" → ")}</span>
              )}
              {task.assignment.mode === "anyone" && <span className="row__sub">Cualquiera del hogar</span>}
            </span>
            {task.assignment.mode === "rotation" && (
              <span className="avatar-stack">
                {task.assignment.order.map((m) => <Avatar key={m} emoji={member(m).emoji} size="sm" />)}
              </span>
            )}
            <span className="row__value">{view.assignee.emoji} {view.assignee.name}</span>
          </div>
          {list && (
            <div className="row">
              <span className="row__main"><span className="row__title">Lista</span></span>
              <span className="row__value">{list.emoji} {list.name}</span>
            </div>
          )}
        </div>

        {task.description && <p className="desc">{task.description}</p>}

        <div className="section-header">Historial</div>
        <div className="list list--inset">
          {task.history.filter((e) => !e.undone).slice(0, 5).map((e) => (
            <div className="row row--lead" key={e.id}>
              <span className="row__lead">
                <Icon name={e.kind === "done" ? "check" : e.kind === "skipped" ? "skip" : "snooze"} size="md" />
              </span>
              <span className="row__main">
                <span className="row__title">
                  {e.kind === "done" ? (e.chosen ? `Hecha por ${member(e.creditedTo).name}` : "Hecha") : e.kind === "skipped" ? "Saltada" : `Pospuesta ${e.label ?? ""}`}
                </span>
                <span className="row__sub">
                  {formatDue(new Date(e.at), tz)}
                  {e.kind === "done" && !e.chosen ? ` · crédito ${member(e.creditedTo).name}` : ""}
                </span>
              </span>
            </div>
          ))}
          {task.history.every((e) => e.undone) && (
            <div className="row"><span className="row__main"><span className="row__sub">Todavía no se ha hecho.</span></span></div>
          )}
        </div>

        <div className="detail-actions">
          <button className="btn btn--filled btn--lg btn--block" disabled={flashFrom !== undefined} onClick={() => ui.complete(task.id, "detail")}>
            <Icon name="check" />Hecha
          </button>
          <button className="btn btn--bordered btn--block" disabled={flashFrom !== undefined} onClick={() => ui.openWho(task.id, "detail")}>
            <Icon name="hand" size="md" />La hizo alguien más
          </button>
        </div>
      </div>
    </main>
  );
}
