import { describe, expect, it } from "vitest";
import { isPublicPath } from "./paths";

describe("isPublicPath", () => {
  it.each([
    "/entrar",
    "/recuperar",
    "/nueva-contrasena",
    "/invitacion/abc",
    "/api/cron/notifications",
    "/sw.js",
    "/manifest.webmanifest",
    "/icon.svg",
    "/apple-icon.png",
    "/icons/192.png",
  ])("%s es pública", (p) => expect(isPublicPath(p)).toBe(true));

  it.each(["/", "/t/123", "/ajustes", "/bienvenida", "/entrarx"])("%s pide sesión", (p) => expect(isPublicPath(p)).toBe(false));
});
