/**
 * React inicia una View Transition cada vez que entra o sale cualquier
 * <ViewTransition>, aunque su animación sea "none". Eso hace que cada cambio de
 * pestaña capture toda la página, y en iPhone la pantalla vieja queda congelada
 * ~medio segundo. Solo se dejan pasar las que animan algo: entrar y salir del
 * detalle, y el cambio de tema. Para las demás, startViewTransition lanza y
 * React aplica el cambio al instante (su camino para navegadores sin soporte).
 */
const ANIMATED_TYPES = ["nav-forward", "nav-back"];

type StartArg = (() => void) | { update?: () => void; types?: string[] } | undefined;

export function allowViewTransition(arg: StartArg): boolean {
  if (typeof arg === "function") return true;
  return !!arg?.types?.some((t) => ANIMATED_TYPES.includes(t));
}

export function installViewTransitionGate() {
  if (typeof document === "undefined" || !document.startViewTransition) return;
  const original = document.startViewTransition.bind(document);
  document.startViewTransition = ((arg: StartArg) => {
    if (!allowViewTransition(arg)) throw new Error("view transition omitida");
    return original(arg as Parameters<typeof original>[0]);
  }) as typeof document.startViewTransition;
}
