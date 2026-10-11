import { describe, expect, it } from "vitest";
import { adminErrorMessage, parseOverview } from "./admin";

describe("parseOverview", () => {
  it("traduce la respuesta de admin_overview", () => {
    expect(
      parseOverview([
        {
          id: "h",
          name: "Casa",
          emoji: "🏡",
          timezone: "America/Costa_Rica",
          disabled: false,
          members: [{ user_id: "u", name: "Ana", emoji: "🌸", role: "admin", tasks: 2 }],
        },
      ]),
    ).toEqual([
      {
        id: "h",
        name: "Casa",
        emoji: "🏡",
        timezone: "America/Costa_Rica",
        disabled: false,
        members: [{ userId: "u", name: "Ana", emoji: "🌸", role: "admin", tasks: 2 }],
      },
    ]);
  });
  it("sin datos → lista vacía", () => {
    expect(parseOverview(null)).toEqual([]);
    expect(parseOverview({})).toEqual([]);
  });
});

describe("adminErrorMessage", () => {
  it.each([
    [{ message: "forbidden" }, "No tienes permiso"],
    [{ message: "last_admin" }, "El hogar necesita al menos un admin"],
    [{ message: "not_member" }, "Esa persona ya no es del hogar"],
    [{ message: "invalid_target" }, "Elige a alguien del hogar"],
    [new Error("boom"), "No se pudo. Intenta otra vez"],
  ])("%o → %s", (e, msg) => expect(adminErrorMessage(e)).toBe(msg));
});
