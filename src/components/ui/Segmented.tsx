"use client";
import type { CSSProperties } from "react";

/** Segmented control HIG con indicador de tinta que se desliza. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: "sm";
  className?: string;
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      className={["segmented", size === "sm" ? "segmented--sm" : "", className ?? ""].join(" ").trim()}
      style={{ "--n": options.length, "--i": i } as CSSProperties}
      role="group"
      aria-label={label}
    >
      <span className="segmented__thumb" aria-hidden="true" />
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
