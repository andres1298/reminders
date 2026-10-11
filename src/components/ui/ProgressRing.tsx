import type { CSSProperties } from "react";

/** Anillo de progreso (SPEC §4.7): track tinta 15 %, progreso tinta 100 %, arranca a las 12. */
export function ProgressRing({
  progress,
  emoji,
  overdue = false,
  size = "md",
  className,
}: {
  progress: number;
  emoji: string;
  overdue?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const r = size === "lg" ? 45 : 44;
  return (
    <div
      className={["ring", size === "lg" ? "ring--lg" : "", overdue ? "is-overdue" : "", className ?? ""].join(" ").trim()}
      style={{ "--p": progress.toFixed(3) } as CSSProperties}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring__track" cx="50" cy="50" r={r} />
        <circle className="ring__bar" cx="50" cy="50" r={r} pathLength={100} />
      </svg>
      <span className="ring__emoji" aria-hidden="true">{emoji}</span>
      <i className="ring__alert" aria-hidden="true" />
    </div>
  );
}
