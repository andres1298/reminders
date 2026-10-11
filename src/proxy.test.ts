import { describe, expect, it } from "vitest";
import { config } from "./proxy";

// Next compila el matcher con path-to-regexp; para este patrón basta con anclarlo.
const matches = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

describe("matcher del proxy", () => {
  it.each(["/", "/ajustes", "/pendientes", "/bienvenida", "/t/123", "/invitacion/abc", "/entrar"])("%s pasa por el proxy", (p) =>
    expect(matches(p)).toBe(true),
  );
  it.each(["/sw.js", "/manifest.webmanifest", "/icon.svg", "/_next/static/x.js"])("%s no", (p) => expect(matches(p)).toBe(false));
});
