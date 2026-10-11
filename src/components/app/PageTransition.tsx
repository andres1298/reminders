import { ViewTransition, type ReactNode } from "react";

const MAP = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };

/**
 * Dirección de la navegación: push/pop deslizan. Entre pestañas el cambio es
 * instantáneo: en iPhone la captura de la transición dejaba la pantalla vieja
 * visible ~medio segundo.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={MAP} exit={MAP} default="none">
      {children}
    </ViewTransition>
  );
}
