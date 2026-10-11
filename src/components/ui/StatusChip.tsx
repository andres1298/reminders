import type { CSSProperties } from "react";
import { ICONS } from "./icon-paths";

export type ChipStatus = "ok" | "soon" | "overdue" | "done";
const small = { "--icon-size": "13px", "--icon-stroke": 3 } as CSSProperties;

/** Chip de estado: siempre con texto; en tinta para leerse sobre cualquier pastel. */
export function StatusChip({ status, label }: { status: ChipStatus; label: string }) {
  if (status === "overdue")
    return (
      <span className="status status--overdue">
        <i className="status__dot" aria-hidden="true" />
        {label}
      </span>
    );
  if (status === "soon")
    return (
      <span className="status status--soon">
        <svg className="ico" style={small} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS.clock }} />
        {label}
      </span>
    );
  if (status === "done")
    return (
      <span className="status status--done">
        <svg className="ico" style={{ ...small, "--icon-stroke": 3.2 } as CSSProperties} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS.check }} />
        hecha
      </span>
    );
  return <span className="status status--ok">{label}</span>;
}
