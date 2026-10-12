/**
 * Lista de compras (Súper): categorías, búsqueda en el historial, agrupación
 * por pasillo y los verbos puros sobre AppState (la red va aparte, en remote.ts).
 */
import type { AppState, GroceryItem } from "./types";

export const CATEGORIES = [
  { key: "produce", name: "Frutas y verduras", emoji: "🥦" },
  { key: "bakery", name: "Panadería", emoji: "🥖" },
  { key: "dairy", name: "Lácteos y huevos", emoji: "🥛" },
  { key: "meat", name: "Carnes", emoji: "🍗" },
  { key: "pantry", name: "Despensa", emoji: "🥫" },
  { key: "drinks", name: "Bebidas", emoji: "🧃" },
  { key: "frozen", name: "Congelados", emoji: "🧊" },
  { key: "cleaning", name: "Limpieza", emoji: "🧽" },
  { key: "hygiene", name: "Higiene", emoji: "🧴" },
  { key: "pets", name: "Mascotas", emoji: "🐾" },
  { key: "other", name: "Otros", emoji: "🛒" },
] as const;

export type GroceryCategory = (typeof CATEGORIES)[number]["key"];
export type CategoryInfo = (typeof CATEGORIES)[number];

export const categoryInfo = (key: GroceryCategory): CategoryInfo => CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];

/** Clave para comparar nombres: minúsculas, sin tildes y con espacios simples. */
export function nameKey(name: string): string {
  return name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");
}

// Palabras clave por categoría (en el orden en que se revisan: lo más específico primero).
// Una frase con espacio se busca tal cual; una palabra, al inicio de alguna palabra del nombre.
const KEYWORDS: [GroceryCategory, string[]][] = [
  ["pets", ["arena para gato", "arena de gato", "croqueta", "alimento para gato", "alimento para perro", "comida de gato", "comida de perro", "mascota", "gato", "perro"]],
  ["hygiene", ["papel higienico", "pasta dental", "hilo dental", "cepillo de dientes", "jabon de bano", "jabon de manos", "toallas sanitarias", "champu", "shampoo", "acondicionador", "desodorante", "rastrillo", "afeitar"]],
  ["cleaning", ["papel toalla", "jabon de platos", "jabon para platos", "jabon en polvo", "bolsas de basura", "cloro", "detergente", "lavaplatos", "esponja", "desinfectante", "suavizante", "limpiador", "escoba", "trapeador"]],
  ["frozen", ["helado", "congelad", "hielo", "nugget"]],
  ["dairy", ["leche", "queso", "yogur", "mantequilla", "natilla", "crema dulce", "huevo"]],
  ["drinks", ["agua", "jugo", "refresco", "gaseosa", "soda", "cerveza", "vino", "bebida"]],
  ["bakery", ["pan", "tortilla", "bollo", "galleta", "queque", "reposteria"]],
  ["meat", ["pollo", "pechuga", "carne", "molida", "cerdo", "chuleta", "pescado", "tilapia", "salmon", "jamon", "salchich", "chorizo", "tocino", "camaron", "res"]],
  ["produce", ["manzana", "banano", "platano", "tomate", "cebolla", "papa", "aguacate", "limon", "lechuga", "zanahoria", "chile", "culantro", "ajo", "fresa", "pina", "mango", "naranja", "fruta", "verdura", "brocoli", "pepino", "uva"]],
  ["pantry", ["arroz", "frijol", "pasta", "espagueti", "aceite", "azucar", "sal", "cafe", "atun", "salsa", "harina", "avena", "cereal", "sopa", "mayonesa", "ketchup", "especia", "consome"]],
];

function matches(key: string, words: string[], kw: string): boolean {
  if (kw.includes(" ")) return key.includes(kw);
  // palabras cortas ("pan", "sal", "res") solo completas o en plural; las largas, como prefijo
  return words.some((w) => (kw.length <= 3 ? w === kw || w === kw + "s" || w === kw + "es" : w.startsWith(kw)));
}

export function suggestCategory(name: string): GroceryCategory {
  const key = nameKey(name);
  const words = key.split(" ");
  return KEYWORDS.find(([, kws]) => kws.some((kw) => matches(key, words, kw)))?.[0] ?? "other";
}

const SUGGESTIONS = 6;

/** Sugerencias del historial mientras se escribe: primero las que empiezan igual, luego lo más comprado. */
export function searchHistory(items: GroceryItem[], query: string): GroceryItem[] {
  const q = nameKey(query);
  if (!q) return [];
  return items
    .filter((i) => i.nameKey.includes(q))
    .sort(
      (a, b) =>
        Number(b.nameKey.startsWith(q)) - Number(a.nameKey.startsWith(q)) || b.timesBought - a.timesBought || a.name.localeCompare(b.name, "es"),
    )
    .slice(0, SUGGESTIONS);
}

export interface GroceryGroup {
  category: CategoryInfo;
  items: GroceryItem[];
}

function group(items: GroceryItem[], compare: (a: GroceryItem, b: GroceryItem) => number): GroceryGroup[] {
  return CATEGORIES.map((category) => ({ category, items: items.filter((i) => i.category === category.key).sort(compare) })).filter(
    (g) => g.items.length > 0,
  );
}

/** La lista por pasillo: dentro de cada uno, lo pendiente por nombre y lo tachado al final. */
export const listGroups = (items: GroceryItem[]) =>
  group(
    items.filter((i) => i.onList),
    (a, b) =>
      Number(!!a.checkedAt) - Number(!!b.checkedAt) ||
      (a.checkedAt && b.checkedAt ? a.checkedAt.localeCompare(b.checkedAt) : a.name.localeCompare(b.name, "es")),
  );

/** El historial por pasillo: lo más comprado primero. */
export const historyGroups = (items: GroceryItem[]) =>
  group(items, (a, b) => b.timesBought - a.timesBought || a.name.localeCompare(b.name, "es"));

// --- verbos puros ----------------------------------------------------------------

function replace(state: AppState, item: GroceryItem): AppState {
  return { ...state, groceries: state.groceries.map((g) => (g.id === item.id ? item : g)) };
}

export interface GroceryInput {
  name: string;
  category: GroceryCategory;
  quantity?: string;
  note?: string;
}

/** Agregar a la lista: si ya está en el historial (mismo nombre), se reutiliza. */
export function addGrocery(state: AppState, input: GroceryInput, now: Date): { state: AppState; item: GroceryItem } {
  void now;
  const name = input.name.trim().slice(0, 60);
  if (!name) throw new Error("empty_grocery");
  const key = nameKey(name);
  const fields = { name, category: input.category, onList: true, checkedAt: null, quantity: input.quantity?.trim().slice(0, 20) || null, note: input.note?.trim().slice(0, 80) || null };
  const existing = state.groceries.find((g) => g.nameKey === key);
  if (existing) {
    const item = { ...existing, ...fields };
    return { state: replace(state, item), item };
  }
  const item: GroceryItem = { id: crypto.randomUUID(), nameKey: key, timesBought: 0, lastBoughtAt: null, ...fields };
  return { state: { ...state, groceries: [...state.groceries, item] }, item };
}

export function toggleChecked(state: AppState, id: string, now: Date): { state: AppState; item: GroceryItem } {
  const g = state.groceries.find((x) => x.id === id);
  if (!g) throw new Error("not_found");
  const item = { ...g, checkedAt: g.checkedAt ? null : now.toISOString() };
  return { state: replace(state, item), item };
}

export function updateGrocery(
  state: AppState,
  id: string,
  patch: Partial<Pick<GroceryItem, "quantity" | "note" | "category" | "onList">>,
): AppState {
  const g = state.groceries.find((x) => x.id === id);
  if (!g) throw new Error("not_found");
  return replace(state, { ...g, ...patch, ...(patch.onList === false ? { checkedAt: null } : {}) });
}

export function removeFromHistory(state: AppState, id: string): AppState {
  return { ...state, groceries: state.groceries.filter((g) => g.id !== id) };
}

/** Terminar compra: lo tachado sale de la lista y cuenta como comprado. */
export function finishShopping(state: AppState, now: Date): { state: AppState; count: number } {
  let count = 0;
  const groceries = state.groceries.map((g) => {
    if (!g.onList || !g.checkedAt) return g;
    count++;
    return { ...g, onList: false, checkedAt: null, quantity: null, note: null, timesBought: g.timesBought + 1, lastBoughtAt: now.toISOString() };
  });
  return { state: { ...state, groceries }, count };
}
