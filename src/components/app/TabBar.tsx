"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isBareScreen } from "@/lib/auth/paths";
import { useAppState } from "@/lib/store";
import { Icon, type IconName } from "@/components/ui/Icon";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/pendientes", label: "Pendientes", icon: "todo" },
  { href: "/gestionar", label: "Gestionar", icon: "manage" },
  { href: "/estadisticas", label: "Estadísticas", icon: "stats" },
  { href: "/ajustes", label: "Ajustes", icon: "settings" },
];

/** Tab bar flotante tipo pill (Inicio · Pendientes · Gestionar · Estadísticas · Ajustes). */
export function TabBar() {
  const pathname = usePathname();
  const state = useAppState();
  if (isBareScreen(pathname)) return null;
  const hidden = pathname.startsWith("/t/");
  const soonTodos = state?.todos.some((t) => t.soon && !t.doneAt && !t.deletedAt);
  return (
    <div className={`tabbar-wrap${hidden ? " is-hidden" : ""}`} inert={hidden}>
      <nav className="tabbar" aria-label="Principal">
        {TABS.map((t) => {
          const current = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className="tabbar__item"
              aria-current={current ? "page" : undefined}
              aria-label={t.label}
              transitionTypes={["tab"]}
            >
              <Icon name={t.icon} />
              <span className="tabbar__label">{t.label}</span>
              {t.href === "/pendientes" && soonTodos && <span className="badge badge--dot" aria-hidden="true" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
