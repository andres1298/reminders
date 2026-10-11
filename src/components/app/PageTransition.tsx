import { ViewTransition, type ReactNode } from "react";

const MAP = { "nav-forward": "nav-forward", "nav-back": "nav-back", tab: "tab-fade", default: "none" };

/** Dirección de la navegación: push/pop deslizan; entre pestañas, fundido. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={MAP} exit={MAP} default="none">
      {children}
    </ViewTransition>
  );
}
