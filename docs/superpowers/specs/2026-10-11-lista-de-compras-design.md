# Lista de compras (Súper)

Fecha: 2026-10-11 · Estado: aprobado en conversación, pendiente de revisión escrita.

## Objetivo

Una lista de compras compartida por el hogar, armada en gran parte desde un **historial** de lo que ya se ha comprado, ordenado por categorías del súper. Éxito: en casa, alguien escribe "lec…" y agrega "Leche" del historial con un toque; en el súper, otra persona ve la lista por pasillos, tacha lo que va comprando y al final toca **Terminar compra**; la próxima vez, todo eso está en el historial, con lo más comprado arriba. Un artículo mal escrito se borra del historial en dos toques.

## Decisiones

| # | Tema | Decisión |
|---|---|---|
| 1 | Ubicación | Pestaña propia **Súper** en lugar de **Estadísticas** en la barra; Estadísticas pasa a una fila en Ajustes. |
| 2 | Categorías | Fijas (abajo), con emoji y en orden de pasillo. Se sugiere la categoría al escribir. |
| 3 | En el súper | Tocar tacha y baja dentro de su categoría; **Terminar compra** saca lo tachado y lo cuenta como comprado. |
| 4 | Detalle | Cantidad y nota opcionales. |
| 5 | Datos | Una tabla `grocery_items`: cada fila es un artículo del historial y lleva su estado en la lista actual. |
| 6 | Historial | Borrado lógico; si se vuelve a escribir el mismo nombre, el artículo reaparece. |

**Fuera de alcance:** varias listas, precios, avisos push de la lista, escaneo de productos, categorías editables.

### Categorías (orden de pasillo)

| Clave | Nombre | Emoji |
|---|---|---|
| `produce` | Frutas y verduras | 🥦 |
| `bakery` | Panadería | 🥖 |
| `dairy` | Lácteos y huevos | 🥛 |
| `meat` | Carnes | 🍗 |
| `pantry` | Despensa | 🥫 |
| `drinks` | Bebidas | 🧃 |
| `frozen` | Congelados | 🧊 |
| `cleaning` | Limpieza | 🧽 |
| `hygiene` | Higiene | 🧴 |
| `pets` | Mascotas | 🐾 |
| `other` | Otros | 🛒 |

## 1. Datos — `supabase/migrations/20261015000000_groceries.sql`

```text
grocery_items (id uuid PK, household_id → households,
               name text 1..60, name_key text,          -- minúsculas, sin tildes, espacios simples (lo calcula la app)
               category text check (in las 11 claves),
               on_list bool default false, quantity text ≤ 20 NULL, note text ≤ 80 NULL,
               checked_at timestamptz NULL,               -- tachado en la compra actual
               times_bought int default 0, last_bought_at timestamptz NULL,
               deleted_at timestamptz NULL, deleted_by NULL, created_by, created_at,
               UNIQUE (household_id, name_key))           -- incluye borrados: así reaparecen
```

- RLS: `select` / `insert` / `update` para miembros del hogar (`is_member`), sin el super admin; sin `delete`. La lectura excluye `deleted_at` salvo para admins (como tareas).
- `add_grocery(p_id uuid, p_household uuid, p_name text, p_name_key text, p_category text, p_quantity text, p_note text) returns uuid` (security definer, valida membresía): `insert ... on conflict (household_id, name_key) do update` → `deleted_at = null, on_list = true, checked_at = null, name, category, quantity, note`. Devuelve el `id` de la fila (el existente si reaparece).
- `finish_shopping(p_household uuid) returns int` (security definer, valida membresía): para las filas con `on_list and checked_at is not null` → `on_list = false, checked_at = null, quantity = null, note = null, times_bought + 1, last_bought_at = now()`. Devuelve cuántas.
- Borrar del historial: `update ... set deleted_at = now(), deleted_by = auth.uid(), on_list = false`; deshacer: `deleted_at = null`. Lo hace una función `set_grocery_deleted(p_id uuid, p_deleted boolean)` (security definer, valida membresía), porque la RLS de lectura oculta la fila borrada a quien no es admin.
- Lo demás (tachar, cantidad, nota, categoría, quitar de la lista) es `update` directo con RLS.

## 2. App

- `src/lib/groceries.ts` (puro, probado):
  - `CATEGORIES` (tabla de arriba, en orden), `type GroceryCategory`.
  - `nameKey(name: string): string` (NFD sin diacríticos, minúsculas, `trim`, espacios múltiples → uno).
  - `suggestCategory(name: string): GroceryCategory` por palabras clave (ej.: leche/queso/yogur/huevo → `dairy`; pan/tortilla → `bakery`; pollo/carne/res/cerdo/pescado/atún fresco → `meat`; manzana/banano/tomate/cebolla/papa/aguacate/limón → `produce`; arroz/frijoles/pasta/aceite/azúcar/sal/café/atún/salsa → `pantry`; agua/jugo/refresco/cerveza/vino → `drinks`; helado/congelado → `frozen`; jabón de platos/cloro/detergente/esponja/papel toalla → `cleaning`; papel higiénico/champú/pasta dental/desodorante → `hygiene`; arena/alimento de gato/croquetas → `pets`; si nada → `other`).
  - `searchHistory(items, query)`: artículos no borrados cuyo `nameKey` contiene `nameKey(query)`, primero los que empiezan con él, luego por `timesBought` desc; máx. 6.
  - `listGroups(items)`: los `onList`, agrupados por categoría en orden de pasillo; dentro, primero los no tachados (por nombre), luego los tachados (por `checkedAt`).
  - `historyGroups(items)`: no borrados, por categoría; dentro por `timesBought` desc y luego nombre.
- Tipos: `GroceryItem { id, name, nameKey, category, onList, quantity, note, checkedAt, timesBought, lastBoughtAt, deletedAt }` en `src/lib/types.ts`; `AppState.groceries: GroceryItem[]`. `mapping.ts`/`snapshot.ts` los cargan (no borrados). Las cachés guardadas sin `groceries` se leen como `[]`.
- Verbos (optimistas + cola, `src/lib/supabase/remote.ts` y funciones puras en `groceries.ts`): agregar (nuevo o del historial), tachar/destachar, editar cantidad/nota, quitar de la lista, cambiar categoría, borrar del historial / deshacer, terminar compra.
- Pantalla `/super` (`src/app/super/page.tsx`, `src/components/groceries/GroceryScreen.tsx`), estilo de Pendientes:
  - Encabezado "Súper", segmentado **Lista | Historial**.
  - Campo **Agregar…** (estilo `quick-add`): sugerencias del historial mientras se escribe; si es nuevo, chip de categoría sugerida que se puede tocar para cambiarla; campos opcionales cantidad y nota.
  - **Lista**: secciones por categoría (emoji + nombre); filas con nombre, "cantidad · nota"; tocar tacha; "…" → editar cantidad/nota, quitar de la lista. Botón **Terminar compra (N)** cuando hay tachados. Vacía: Lukas + "La lista está vacía. Agrega lo que haga falta o tráelo del historial."
  - **Historial**: secciones por categoría; tocar agrega a la lista (o "En la lista"); "…" → **Cambiar categoría**, **Borrar del historial** (toast con **Deshacer**).
- Barra de pestañas: Inicio · Pendientes · Súper · Gestionar · Ajustes (ícono de carrito; si el set no tiene uno, se agrega al set de íconos). Ajustes gana la fila **Estadísticas** → `/estadisticas`.

## 3. Pruebas

- SQL (`supabase/tests/groceries.test.sql`, misma sesión que las demás): un miembro agrega, otro hogar no ve; el super admin no ve; nombre repetido con otra mayúscula/tilde (mismo `name_key`) no duplica; `add_grocery` sobre un borrado lo hace reaparecer con el mismo id; `finish_shopping` solo afecta a los tachados y suma `times_bought`; `set_grocery_deleted` solo para miembros.
- Vitest: `nameKey`, `suggestCategory` (un caso por categoría + "otros"), `searchHistory` (sin tildes, prefijo primero, máx. 6), `listGroups`, `historyGroups`, verbos puros y la traducción de filas.

## 4. Despliegue

Correr `20261015000000_groceries.sql` en el SQL Editor; agregarlo a `docs/DEPLOY.md` §3.2.
