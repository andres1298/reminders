/** Rutas que no piden sesión: login, recuperar, invitaciones, cron y archivos de la PWA. */
const PUBLIC = ["/entrar", "/recuperar", "/nueva-contrasena"];
const PUBLIC_PREFIXES = ["/invitacion/", "/api/cron/"];

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  // archivos (sw.js, manifest, íconos): el último segmento tiene extensión
  return /\.[a-z0-9]+$/i.test(pathname.split("/").pop() ?? "");
}

/** Pantallas sin la barra de pestañas (sin sesión o sin hogar todavía). */
export function isBareScreen(pathname: string): boolean {
  return PUBLIC.includes(pathname) || pathname.startsWith("/invitacion/") || pathname === "/bienvenida";
}

/** Destino después de entrar: solo rutas de este mismo sitio (evita redirecciones abiertas con ?next=). */
export function safeNext(next: string | null, origin: string): string {
  if (!next) return "/";
  try {
    const url = new URL(next, origin);
    return url.origin === origin ? url.pathname + url.search : "/";
  } catch {
    return "/";
  }
}
