import { describe, expect, it } from "vitest";
import { demoState } from "./demo-seed";
import {
  CATEGORIES,
  addGrocery,
  finishShopping,
  historyGroups,
  listGroups,
  nameKey,
  searchHistory,
  suggestCategory,
  type GroceryCategory,
} from "./groceries";
import type { GroceryItem } from "./types";

const item = (name: string, extra: Partial<GroceryItem> = {}): GroceryItem => ({
  id: name,
  name,
  nameKey: nameKey(name),
  category: "other",
  onList: false,
  quantity: null,
  note: null,
  checkedAt: null,
  timesBought: 0,
  lastBoughtAt: null,
  ...extra,
});

describe("nameKey", () => {
  it("minúsculas, sin tildes y espacios simples", () => {
    expect(nameKey("  LECHÉ  Deslactosada ")).toBe("leche deslactosada");
  });
});

describe("suggestCategory", () => {
  it.each<[string, GroceryCategory]>([
    ["Leche", "dairy"],
    ["Pan cuadrado", "bakery"],
    ["Pechuga de pollo", "meat"],
    ["Tomates", "produce"],
    ["Arroz", "pantry"],
    ["Cerveza", "drinks"],
    ["Helado", "frozen"],
    ["Cloro", "cleaning"],
    ["Papel higiénico", "hygiene"],
    ["Arena para gato", "pets"],
    ["Pilas", "other"],
  ])("%s → %s", (name, cat) => expect(suggestCategory(name)).toBe(cat));
});

describe("searchHistory", () => {
  it("sin tildes, prefijo primero y luego lo más comprado", () => {
    const items = [item("Café con leche", { timesBought: 9 }), item("Leche de coco", { timesBought: 1 }), item("Leche", { timesBought: 5 })];
    expect(searchHistory(items, "LECHÉ").map((i) => i.name)).toEqual(["Leche", "Leche de coco", "Café con leche"]);
  });
  it("máximo 6", () => {
    const items = Array.from({ length: 8 }, (_, i) => item(`Queso ${i}`));
    expect(searchHistory(items, "queso")).toHaveLength(6);
  });
  it("sin texto, nada", () => {
    expect(searchHistory([item("Leche")], "  ")).toEqual([]);
  });
});

describe("listGroups", () => {
  it("solo lo de la lista, por pasillo, tachados al final", () => {
    const groups = listGroups([
      item("Pan", { category: "bakery", onList: true }),
      item("Leche", { category: "dairy", onList: true, checkedAt: "2026-10-11T10:00:00Z" }),
      item("Yogur", { category: "dairy", onList: true }),
      item("Tomate", { category: "produce", onList: true }),
      item("Arroz", { category: "pantry" }),
    ]);
    expect(groups.map((g) => g.category.key)).toEqual(["produce", "bakery", "dairy"]);
    expect(groups[2].items.map((i) => i.name)).toEqual(["Yogur", "Leche"]);
  });
});

describe("historyGroups", () => {
  it("por pasillo, lo más comprado primero", () => {
    const groups = historyGroups([
      item("Queso", { category: "dairy", timesBought: 2 }),
      item("Leche", { category: "dairy", timesBought: 7 }),
      item("Huevos", { category: "dairy", timesBought: 2 }),
    ]);
    expect(groups[0].items.map((i) => i.name)).toEqual(["Leche", "Huevos", "Queso"]);
  });
  it("las categorías siguen el orden de CATEGORIES", () => {
    expect(CATEGORIES[0].key).toBe("produce");
    expect(CATEGORIES.at(-1)?.key).toBe("other");
  });
});

describe("verbos", () => {
  const now = new Date("2026-10-11T12:00:00Z");
  const base = () => ({ ...demoState(now), groceries: [item("Leche", { category: "dairy", timesBought: 3 })] });

  it("agregar un nombre que ya existe lo pone en la lista (mismo id)", () => {
    const { state, item: added } = addGrocery(base(), { name: "leche", category: "dairy", quantity: "2" }, now);
    expect(added.id).toBe("Leche");
    expect(state.groceries).toHaveLength(1);
    expect(state.groceries[0]).toMatchObject({ onList: true, quantity: "2", timesBought: 3 });
  });

  it("agregar un nombre nuevo crea otro artículo", () => {
    const { state, item: added } = addGrocery(base(), { name: "Pan", category: "bakery" }, now);
    expect(added.id).not.toBe("Leche");
    expect(state.groceries).toHaveLength(2);
    expect(added).toMatchObject({ name: "Pan", nameKey: "pan", onList: true });
  });

  it("terminar compra solo saca lo tachado", () => {
    const s = {
      ...demoState(now),
      groceries: [
        item("A", { onList: true, checkedAt: "x", quantity: "2", note: "n", timesBought: 1 }),
        item("B", { onList: true, checkedAt: "x" }),
        item("C", { onList: true }),
      ],
    };
    const { state, count } = finishShopping(s, now);
    expect(count).toBe(2);
    expect(state.groceries[0]).toMatchObject({ onList: false, checkedAt: null, quantity: null, note: null, timesBought: 2 });
    expect(state.groceries[2]).toMatchObject({ onList: true, checkedAt: null });
  });
});
