import { describe, expect, it } from "vitest";
import { isBareScreen, isPublicPath } from "./paths";

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

describe("isBareScreen", () => {
  it.each(["/entrar", "/recuperar", "/nueva-contrasena", "/invitacion/abc", "/bienvenida"])("%s va sin tab bar", (p) =>
    expect(isBareScreen(p)).toBe(true),
  );
  it.each(["/", "/ajustes", "/t/1", "/sw.js"])("%s lleva tab bar", (p) => expect(isBareScreen(p)).toBe(false));
});
