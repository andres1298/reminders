import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadSnapshot } from "./snapshot";

/** Cliente falso: cada tabla responde lo mismo sin importar los filtros. */
function fakeDb(groceries: { data: unknown; error: unknown }) {
  const rows: Record<string, { data: unknown; error: unknown }> = {
    household_members: {
      data: [{ household_id: "h1", user_id: "u1", role: "admin", profiles: { display_name: "Ana", avatar_emoji: "🌸" } }],
      error: null,
    },
    households: { data: { id: "h1", name: "Casa", emoji: "🏡", timezone: "America/Costa_Rica" }, error: null },
    profiles: { data: { is_super_admin: false }, error: null },
    grocery_items: groceries,
  };
  const chain = (result: { data: unknown; error: unknown }): unknown =>
    new Proxy(Promise.resolve(result), {
      get: (target, prop) =>
        prop === "then" || prop === "catch" || prop === "finally"
          ? (target as unknown as Record<string | symbol, unknown>)[prop]?.toString && Reflect.get(target, prop).bind(target)
          : () => chain(result),
    });
  return { from: (t: string) => chain(rows[t] ?? { data: [], error: null }) } as unknown as SupabaseClient;
}

describe("loadSnapshot", () => {
  it("si falta la tabla grocery_items (migración sin correr), carga el resto con la lista vacía", async () => {
    const s = await loadSnapshot(fakeDb({ data: null, error: { code: "PGRST205", message: "Could not find the table" } }), "u1");
    expect(s).not.toBe("no-household");
    expect(s !== "no-household" && s.groceries).toEqual([]);
    expect(s !== "no-household" && s.household.name).toBe("Casa");
  });

  it("trae los artículos", async () => {
    const row = {
      id: "g1", name: "Leche", name_key: "leche", category: "dairy", on_list: true, quantity: "2", note: null,
      checked_at: null, times_bought: 3, last_bought_at: null,
    };
    const s = await loadSnapshot(fakeDb({ data: [row], error: null }), "u1");
    expect(s !== "no-household" && s.groceries).toEqual([
      { id: "g1", name: "Leche", nameKey: "leche", category: "dairy", onList: true, quantity: "2", note: null, checkedAt: null, timesBought: 3, lastBoughtAt: null },
    ]);
  });

  it("otro error de la lista sí se propaga", async () => {
    await expect(loadSnapshot(fakeDb({ data: null, error: { code: "42501", message: "forbidden" } }), "u1")).rejects.toMatchObject({ code: "42501" });
  });
});
