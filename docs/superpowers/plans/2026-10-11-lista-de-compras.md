# Lista de compras (Súper) · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pestaña **Súper** con una lista de compras compartida que se arma desde un historial por categorías.

**Architecture:** Tabla `grocery_items` (una fila por artículo del historial con su estado en la lista) + funciones `add_grocery`, `finish_shopping`, `set_grocery_deleted`. La app la carga en la foto del hogar (`AppState.groceries`) y la modifica con el mismo patrón optimista + cola de tareas y pendientes. Lógica pura en `src/lib/groceries.ts`.

**Tech Stack:** Postgres/Supabase, Next.js 16, React 19.3, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-11-lista-de-compras-design.md`

## Global Constraints

- Categorías (clave, nombre, emoji, orden): `produce` Frutas y verduras 🥦, `bakery` Panadería 🥖, `dairy` Lácteos y huevos 🥛, `meat` Carnes 🍗, `pantry` Despensa 🥫, `drinks` Bebidas 🧃, `frozen` Congelados 🧊, `cleaning` Limpieza 🧽, `hygiene` Higiene 🧴, `pets` Mascotas 🐾, `other` Otros 🛒.
- Límites: `name` 1..60, `quantity` ≤ 20, `note` ≤ 80.
- RLS solo para miembros (`is_member`); el super admin **no** lee `grocery_items`; sin política `delete`.
- **Despliegue seguro:** el código se publica antes de correr la migración. Si `grocery_items` no existe (PostgREST `PGRST205` o Postgres `42P01`), `loadSnapshot` usa `groceries: []` y el resto de la foto carga igual.
- Cachés viejas sin `groceries` se leen como `[]`.
- UI en español; estilos en `src/styles/app.css` reutilizando `lukas.css`; sin utilidad `ring` de Tailwind.
- Barras invertidas en scripts: `chr(92)`.
- Antes de cada commit: `npm test && npm run typecheck && npm run lint && npm run build` (+ pruebas SQL en Docker si se toca `supabase/`).

## Review Focus

1. Agregar "leche" cuando existe "Leche" borrada del historial → reaparece la misma fila (mismo id, `times_bought` intacto), no un duplicado (Task 1 SQL).
2. Terminar compra con artículos sin tachar → solo salen los tachados; los demás siguen en la lista (Task 1 SQL + Task 2 Vitest del verbo puro).
3. App publicada sin la migración → Inicio y Pendientes siguen funcionando; Súper muestra la lista vacía (Task 3: prueba de `loadSnapshot` con `grocery_items` faltante).
4. Escribir con tildes o mayúsculas distintas ("LECHÉ") encuentra "Leche" en las sugerencias y no crea otra (Task 2 `searchHistory` / `nameKey`).
5. Un miembro no admin borra del historial y toca "Deshacer" → vuelve (Task 1 SQL `set_grocery_deleted`).

---

### Task 1: Migración y pruebas SQL

**Files:** Create `supabase/migrations/20261015000000_groceries.sql`, `supabase/tests/groceries.test.sql`; Modify `supabase/tests/run.sh` (agregar `-f "$here/groceries.test.sql"` a la misma sesión).

**Interfaces (Produces):** tabla `grocery_items` (columnas del spec §1); `add_grocery(uuid, uuid, text, text, text, text, text) returns uuid`; `finish_shopping(uuid) returns int`; `set_grocery_deleted(uuid, boolean) returns void`. Errores: `forbidden` (no miembro), `not_found`.

- [ ] **Step 1: Pruebas SQL** (usuarios/hogares de los archivos previos: `a` y `m` en Casa, `x` en Otra, `s` super admin):
  - `m` → `add_grocery(id1, casa, 'Leche', 'leche', 'dairy', '2', null)` devuelve `id1`; `x` y `s` leen 0 filas de `grocery_items`; `a` lee 1.
  - `a` → `add_grocery(id2, casa, 'LECHE', 'leche', 'dairy', null, null)` devuelve `id1` (no duplica) y deja `quantity` null.
  - `x` → `add_grocery(..., casa, ...)` → `forbidden`.
  - `m` agrega 'Pan' (`bakery`), tacha Leche (`update set checked_at = now()`), `finish_shopping(casa)` → 1; Leche: `on_list = false`, `times_bought = 1`, `last_bought_at` no nulo; Pan sigue `on_list`.
  - `m` (no admin) → `set_grocery_deleted(id1, true)`: `m` deja de leerla; `set_grocery_deleted(id1, false)`: vuelve. `x` → `set_grocery_deleted(id1, true)` → `forbidden`.
  - Borrar Leche y `add_grocery(id3, casa, 'Leché', 'leche', 'dairy', null, null)` → devuelve `id1`, `deleted_at` null, `times_bought` = 1.
- [ ] **Step 2:** pruebas SQL → FAIL.
- [ ] **Step 3:** migración (tabla, índice `(household_id) where deleted_at is null`, RLS: `select` usando `is_member(household_id) and (deleted_at is null or is_admin(household_id))`, `insert`/`update` con `is_member` y `with check` igual; las tres funciones `security definer set search_path = ''`, validan `is_member`; `revoke ... from public, anon` y `grant ... to authenticated`).
- [ ] **Step 4:** pruebas SQL → `ok`. **Step 5: Commit** "Lista de compras: tabla y funciones".

### Task 2: Lógica pura

**Files:** Create `src/lib/groceries.ts`, `src/lib/groceries.test.ts`; Modify `src/lib/types.ts` (`GroceryItem`, `AppState.groceries`).

**Interfaces (Produces):**
- `type GroceryCategory = "produce" | … | "other"`; `CATEGORIES: { key: GroceryCategory; name: string; emoji: string }[]` (orden de pasillo).
- `interface GroceryItem { id: string; name: string; nameKey: string; category: GroceryCategory; onList: boolean; quantity: string | null; note: string | null; checkedAt: string | null; timesBought: number; lastBoughtAt: string | null }`.
- `nameKey(name: string): string`; `suggestCategory(name: string): GroceryCategory`; `searchHistory(items: GroceryItem[], query: string): GroceryItem[]`; `listGroups(items): { category: typeof CATEGORIES[number]; items: GroceryItem[] }[]`; `historyGroups(items)` (misma forma).
- Verbos puros sobre `AppState` (no tocan red): `addGrocery(state, input: { name: string; category: GroceryCategory; quantity?: string; note?: string }, now: Date): { state: AppState; item: GroceryItem }` (si hay un artículo con el mismo `nameKey`, lo pone en la lista con la cantidad/nota nuevas; si no, crea uno con `crypto.randomUUID()`), `toggleChecked(state, id, now)`, `updateGrocery(state, id, patch: Partial<Pick<GroceryItem, "quantity" | "note" | "category" | "onList">>)`, `removeFromHistory(state, id)` (lo saca de `groceries`) , `finishShopping(state, now): { state: AppState; count: number }`.

- [ ] **Step 1: Pruebas** `groceries.test.ts`:
  - `nameKey("  LECHÉ  Deslactosada ")` → `"leche deslactosada"`.
  - `suggestCategory`: "Leche"→dairy, "Pan cuadrado"→bakery, "Pechuga de pollo"→meat, "Tomates"→produce, "Arroz"→pantry, "Cerveza"→drinks, "Helado"→frozen, "Cloro"→cleaning, "Papel higiénico"→hygiene, "Arena para gato"→pets, "Pilas"→other.
  - `searchHistory` con Leche (times 5), "Leche de coco" (times 1), "Café con leche" (times 9): query "LECHÉ" → `["Leche","Leche de coco","Café con leche"]` (prefijo primero, luego por veces); 8 coincidencias → 6.
  - `listGroups`: solo `onList`, categorías en orden de `CATEGORIES`, sin categorías vacías; tachados al final de su categoría.
  - `historyGroups`: por `timesBought` desc y nombre.
  - `addGrocery` con "leche" cuando existe "Leche" fuera de la lista → mismo id, `onList` true, `quantity` nueva; con nombre nuevo → id nuevo.
  - `finishShopping` con 2 tachados y 1 sin tachar → `count` 2; los tachados quedan `onList` false, `checkedAt` null, `quantity` null, `note` null, `timesBought` +1; el otro intacto.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS + typecheck (agregar `groceries: []` donde se construya `AppState`: `buildState`, `demo-seed.ts`). **Step 5: Commit** "Lista de compras: lógica pura".

### Task 3: Carga y escritura contra Supabase

**Files:** Modify `src/lib/supabase/rows.ts` (`GroceryRow`), `mapping.ts` (`groceryFromRow`, `SnapshotRows.groceries`), `snapshot.ts`, `remote.ts`, `store.ts` (caché sin `groceries` → `[]`); Test `mapping.test.ts`, `remote.test.ts`, `src/lib/supabase/snapshot.test.ts` (nuevo).

**Interfaces (Produces):** `rpcAddGrocery(db, item: GroceryItem, householdId: string)` → `add_grocery(p_id, p_household, p_name, p_name_key, p_category, p_quantity, p_note)`; `patchGrocery(db, id, patch: { on_list?; quantity?; note?; category?; checked_at? })`; `rpcFinishShopping(db, householdId)`; `rpcSetGroceryDeleted(db, id, deleted: boolean)`.

- [ ] **Step 1: Pruebas:** `groceryFromRow` (snake→camel, `times_bought` número); `rpcAddGrocery` manda los 7 parámetros; `snapshot.test.ts` con un cliente falso donde `from("grocery_items")` devuelve `{ error: { code: "PGRST205" } }` → `loadSnapshot` devuelve estado con `groceries: []` (Review Focus 3), y con otro código de error → lanza.
- [ ] **Step 2:** FAIL → **Step 3:** implementar (la consulta de `grocery_items` filtra `deleted_at is null`) → **Step 4:** PASS. **Step 5: Commit** "Lista de compras: carga y escritura".

### Task 4: Pantalla Súper y barra de pestañas

**Files:** Create `src/app/super/page.tsx`, `src/components/groceries/GroceryScreen.tsx`; Modify `src/components/app/TabBar.tsx` (Súper en lugar de Estadísticas, ícono de carrito: agregar `cart` a `src/components/ui/icon-paths.js` y `.d.ts` si falta), `src/components/app/SettingsScreen.tsx` (fila **Estadísticas** → `/estadisticas`), `src/styles/app.css`.

**Interfaces (Consumes):** Task 2 (lógica + verbos puros), Task 3 (remote), `useSync().run`, `useAppState`.

- Comportamiento y textos según spec §2: segmentado **Lista | Historial**; campo **Agregar…** con sugerencias (`searchHistory`), chip de categoría sugerida que cicla al tocarlo (abre hoja con las 11), campos cantidad y nota en una fila que se despliega; secciones por categoría; tocar tacha (`toggleChecked` + `patchGrocery({checked_at})`); "…" → editar cantidad/nota, quitar de la lista, cambiar categoría; **Terminar compra (N)** (`finishShopping` + `rpcFinishShopping`, toast "Compra terminada · N artículos"); historial: tocar agrega (`addGrocery` + `rpcAddGrocery`), "…" → **Borrar del historial** (`removeFromHistory` + `rpcSetGroceryDeleted(true)`, toast con **Deshacer** que llama `rpcSetGroceryDeleted(false)` y `refresh()`), **Cambiar categoría**. Vacíos con Lukas.
- [ ] **Step 1:** Implementar. **Step 2:** suite + build verdes. **Step 3: Verificación WebKit** (scratchpad, sesión "Prueba Claude", build local contra producción sin la migración): `/super` carga con la lista vacía y sin error de foto; Inicio sigue mostrando sus tareas (Review Focus 3); la barra muestra Súper. **Step 4: Commit** "Pestaña Súper".

### Task 5: Documentación

**Files:** Modify `docs/DEPLOY.md` (§3.2 paso 5: `20261015000000_groceries.sql`), `README.md` (fila "Lista de compras compartida con historial por categorías (Súper)" ✅), `docs/SPEC.md` §17.
- [ ] **Step 1:** Escribir. **Step 2:** suite + SQL verdes. **Step 3: Commit** "Documentar la lista de compras".
