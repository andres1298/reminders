import { ICONS } from "./icon-paths";

export type IconName = keyof typeof ICONS;

/** Ícono del sprite de Lukas (trazo con currentColor, grosor --icon-stroke). */
export function Icon({ name, className, size }: { name: IconName; className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <svg
      className={["ico", size ? `ico--${size}` : "", className ?? ""].join(" ").trim()}
      viewBox="0 0 24 24"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}
