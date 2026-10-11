import { describe, expect, it } from "vitest";
import { allowViewTransition } from "./view-transitions";

describe("allowViewTransition", () => {
  it("deja pasar entrar y salir del detalle", () => {
    expect(allowViewTransition({ update: () => {}, types: ["nav-forward"] })).toBe(true);
    expect(allowViewTransition({ update: () => {}, types: ["nav-back"] })).toBe(true);
  });
  it("deja pasar el cambio de tema (se llama con una función)", () => {
    expect(allowViewTransition(() => {})).toBe(true);
  });
  it("bloquea las demás: cambiar de pestaña, cargar datos", () => {
    expect(allowViewTransition({ update: () => {}, types: [] })).toBe(false);
    expect(allowViewTransition({ update: () => {} })).toBe(false);
    expect(allowViewTransition(undefined)).toBe(false);
  });
});
