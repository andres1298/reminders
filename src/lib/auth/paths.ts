/** Rutas que no piden sesión: login, recuperar, invitaciones, cron y archivos de la PWA. */
const PUBLIC = ["/entrar", "/recuperar", "/nueva-contrasena"];
const PUBLIC_PREFIXES = ["/invitacion/", "/api/cron/"];

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  // archivos (sw.js, manifest, íconos): el último segmento tiene extensión
  return /\.[a-z0-9]+$/i.test(pathname.split("/").pop() ?? "");
}
