"use client";
import Link from "next/link";
import { useEffect, useState, ViewTransition, type CSSProperties } from "react";
import type { TaskView } from "@/lib/view";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { StatusChip } from "@/components/ui/StatusChip";

export function TaskCard({
  view,
  flashFrom,
  onMore,
  index = 0,
  animateIn = false,
}: {
  view: TaskView;
  /** progress before completing; the ring animates from it to 0 */
  flashFrom?: number;
  onMore: () => void;
  index?: number;
  animateIn?: boolean;
}) {
  const { task, status, label, assignee } = view;
  const flashing = flashFrom !== undefined;
  const color = task.color === "none" ? "var(--surface)" : `var(--${task.color})`;
  return (
    <ViewTransition name={`task-${task.id}`} share="morph" default="none">
      <div
        className={["task-card", flashing ? "is-flash" : "", animateIn ? "card-in" : ""].join(" ").trim()}
        data-task-card={task.id}
        style={{ "--card": color, "--n": index } as CSSProperties}
      >
        <div className="task-card__top">
          <Avatar emoji={assignee.emoji} name={`Le toca a ${assignee.name}`} size="sm" />
          <button className="icon-btn icon-btn--on-card" aria-label={`Acciones para ${task.title}`} onClick={onMore}>
            <Icon name="more-h" size="md" />
          </button>
        </div>
        <FlashRing view={view} flashFrom={flashFrom} />
        <div className="task-card__title">{task.title}</div>
        <div className="task-card__foot">
          <StatusChip status={flashing ? "done" : status} label={label} />
        </div>
        <Link
          className="task-card__open"
          href={`/t/${task.id}`}
          transitionTypes={["nav-forward"]}
          aria-label={`${task.title}, ${status === "overdue" ? label : `vence ${label}`}, le toca a ${assignee.name}`}
        />
      </div>
    </ViewTransition>
  );
}

/** Durante el "recién hecha" el anillo arranca en el progreso previo y anima a 0. */
export function FlashRing({ view, flashFrom, size }: { view: TaskView; flashFrom?: number; size?: "lg" }) {
  const [armed, setArmed] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (flashFrom === undefined) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setArmed(flashFrom)));
    return () => cancelAnimationFrame(id);
  }, [flashFrom]);
  const p = flashFrom === undefined ? view.progress : armed === flashFrom ? 0 : flashFrom;
  return <ProgressRing progress={p} emoji={view.task.emoji} overdue={flashFrom === undefined && view.status === "overdue"} size={size} />;
}
