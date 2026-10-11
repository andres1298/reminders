export function Avatar({ emoji, name, size }: { emoji: string; name?: string; size?: "sm" | "lg" | "xl" }) {
  return (
    <span className={["avatar", size ? `avatar--${size}` : ""].join(" ").trim()} role={name ? "img" : undefined} aria-label={name}>
      {emoji}
    </span>
  );
}
