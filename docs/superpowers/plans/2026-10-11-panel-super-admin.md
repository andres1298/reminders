# Panel de super admin · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un panel `/admin` para el super admin que crea hogares para otras personas y administra miembros, roles y activación, sin poder leer las tareas de esos hogares.

**Architecture:** Una migración quita el acceso de lectura del super admin a listas/tareas/historial/pendientes y agrega funciones `admin_*` (`security definer`, verifican `is_super_admin()`, una transacción por acción). La app las llama con la sesión del usuario: lecturas y acciones desde el cliente con `db.rpc`, y los enlaces de invitación desde Server Actions (el token se genera en el servidor).

**Tech Stack:** Postgres/Supabase (pruebas SQL en Docker), Next.js 16, React 19.3, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-11-panel-super-admin-design.md`

## Global Constraints

- Nunca usar la service key para el panel: todo con la sesión (`supabaseBrowser()` / `supabaseServer()`).
- Cada función `admin_*` empieza con `if not public.is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;`, es `security definer set search_path = ''`, y tiene `grant execute ... to authenticated` (tras `revoke ... from public, anon`).
- Códigos de error: `forbidden`, `last_admin`, `not_member`, `invalid_target`.
- Copia: "No tienes permiso", "El hogar necesita al menos un admin", "Esa persona ya no es del hogar", "Elige a alguien del hogar", "No se pudo. Intenta otra vez".
- UI en español, estilos en `src/styles/app.css` (pantallas) reutilizando clases de `lukas.css`; sin la utilidad `ring` de Tailwind.
- Pruebas SQL: `docker run --rm -v "<repo>:/w" -w /w postgres:16 bash -c "PG_BIN=/usr/lib/postgresql/16/bin bash supabase/tests/run.sh"` (en Git Bash con `MSYS_NO_PATHCONV=1`).
- En scripts de Bash/Python, escribir barras invertidas con `chr(92)` (el entorno colapsa `\\`).
- Antes de cada commit: `npm test && npm run typecheck && npm run lint && npm run build` (+ pruebas SQL si se toca `supabase/`).

## Review Focus

1. Quitar a la persona que tiene el turno actual de una rotación → el turno pasa al siguiente y las posiciones quedan 0..n-1 sin huecos (Task 1: prueba SQL).
2. Quitar al último miembro de una rotación → la tarea pasa a "Cualquiera", no queda en `rotation` sin filas (Task 1: prueba SQL).
3. `reassign` a la misma persona que se quita o a alguien de otro hogar → `invalid_target`, y no se quita a nadie (Task 1: prueba SQL de atomicidad: la membresía sigue).
4. Un admin normal (no super) llama `admin_overview` desde la consola → `forbidden` (Task 1).
5. El super admin abre `/admin` desde un teléfono donde no es super admin (otra cuenta) → vuelve a Inicio sin mostrar datos (Task 3: verificación manual + `forbidden` del RPC).

---

### Task 1: Migración de super admin y pruebas SQL

**Files:**
- Create: `supabase/migrations/20261014000000_super_admin.sql`
- Modify: `supabase/tests/rls_and_rpc.test.sql` (sección nueva al final "Super admin")

**Interfaces:**
- Produces (SQL): `admin_overview() returns jsonb`; `admin_create_household(text, text, text) returns uuid`; `admin_create_invitation(uuid, text) returns void`; `admin_set_role(uuid, uuid, text) returns void`; `admin_remove_member(uuid, uuid, text, uuid default null) returns void`; `admin_set_household_disabled(uuid, boolean) returns void`. Forma de `admin_overview`: `[{id, name, emoji, timezone, disabled: bool, members: [{user_id, name, emoji, role, tasks: int}]}]`.

- [ ] **Step 1: Pruebas SQL (fallan).** En la sección nueva, con un usuario super admin `s` (`'00000000-0000-0000-0000-0000000000f6'`, `update profiles set is_super_admin = true`):
  - `s` no es miembro de "Casa": `select count(*)` de `tasks`, `lists`, `task_events`, `household_todos` = 0; `restore_task` de una tarea borrada de Casa → `forbidden`.
  - Mari (no super) → `admin_overview()` da `forbidden`.
  - `s` → `admin_create_household('Casa de mamá','🏡','America/Costa_Rica')`: no existe fila en `household_members` para `s`; existe lista `General` posición 0.
  - `s` → `admin_create_invitation(hh, 'hash-mama')`; usuario `x` → `accept_invitation('hash-mama')`; su rol en `household_members` = `'admin'`.
  - `admin_overview()` de `s` incluye "Casa de mamá" con `x` rol admin y `tasks` = 0, y no contiene la clave `title` en ningún nivel (`position('title' in admin_overview()::text) = 0`).
  - Preparación en "Casa de mamá" (como `x`, más un miembro `y` = `'00000000-0000-0000-0000-0000000000a7'` y `z` = `…a8` unidos por invitaciones creadas por `s`): tarea fija de `y`, tarea fija de `y` #2, tarea en rotación `[y, z]` con turno `y`, tarea en rotación `[y]`.
  - `admin_remove_member(hh, y, 'reassign', y)` → `invalid_target` y `y` sigue siendo miembro.
  - `admin_remove_member(hh, y, 'reassign', z)` → las fijas tienen `current_assignee_id = z`; rotación `[y,z]` queda `[z]` en posición 0 con turno `z`; rotación `[y]` queda `assignment_mode = 'anyone'` sin filas en `task_rotation`; `y` ya no es miembro.
  - Re-unir `y`, darle una tarea fija y `admin_remove_member(hh, y, 'delete')` → esa tarea tiene `deleted_at` no nulo. Re-unir, otra fija, `'anyone'` → `assignment_mode = 'anyone'`.
  - `admin_remove_member(hh, x, 'anyone')` siendo `x` el único admin → `last_admin`. `admin_set_role(hh, z, 'admin')` y luego quitar `x` funciona.
  - `admin_set_household_disabled(hh, true)` → como `z`, `select count(*) from households where id = hh` = 0; `false` → 1.
- [ ] **Step 2:** correr pruebas SQL → FAIL (función inexistente).
- [ ] **Step 3: Migración.** Recrear `lists_select`, `tasks_select`, `events_select`, `todos_select` iguales a `20261011000000_init.sql` pero sin `or public.is_super_admin()` (`drop policy` + `create policy`); `create or replace` de `restore_task` sin `is_super_admin()`. Funciones según la tabla del spec §1. Algoritmo de `admin_remove_member` (en este orden): validar miembro (`not_member`) y destino si `reassign` (`p_to` miembro del hogar y ≠ `p_user`, si no `invalid_target`); tareas fijas no borradas del hogar con `current_assignee_id = p_user`: `delete`/`reassign`/`anyone`; para cada tarea en rotación con fila de `p_user`: si era el turno actual, `current_assignee_id := _next_in_rotation(task, p_user)` antes de borrar su fila; borrar su fila; renumerar con `row_number() over (order by position) - 1` (actualizar a posiciones negativas temporales primero para no chocar con `unique(task_id, position)`); si no quedan filas → `assignment_mode = 'anyone', current_assignee_id = null`; finalmente `delete from household_members` (el trigger da `last_admin`).
- [ ] **Step 4:** pruebas SQL → `ok · migraciones y pruebas SQL`.
- [ ] **Step 5: Commit** "Migración de super admin: privacidad y funciones de administración".

### Task 2: Datos del panel en la app

**Files:**
- Create: `src/lib/admin.ts`, `src/lib/admin.test.ts`, `src/app/actions/admin.ts`
- Modify: `src/lib/types.ts` (`AppState.isSuperAdmin?: boolean`), `src/lib/supabase/mapping.ts` (`SnapshotRows.isSuperAdmin?: boolean` → `AppState`), `src/lib/supabase/snapshot.ts` (leer `profiles.is_super_admin` del usuario), `src/lib/supabase/mapping.test.ts`

**Interfaces:**
- Produces:
  - `interface AdminMember { userId: string; name: string; emoji: string; role: "admin" | "member"; tasks: number }`, `interface AdminHousehold { id: string; name: string; emoji: string; timezone: string; disabled: boolean; members: AdminMember[] }`
  - `parseOverview(raw: unknown): AdminHousehold[]` (snake → camel; `null`/no-arreglo → `[]`)
  - `adminErrorMessage(e: unknown): string` (por `message`: `forbidden`, `last_admin`, `not_member`, `invalid_target`; resto → genérico)
  - Server Actions: `adminCreateHousehold(input: { name: string; emoji: string; timezone: string }): Promise<{ ok: true; url: string } | { ok: false; message: string }>`, `adminNewAdminLink(householdId: string)` con el mismo retorno. Ambas: `supabaseServer()`, `newInviteToken`/`hashInviteToken` (de `src/lib/invite-token.ts`), RPC `admin_create_invitation`; origen del enlace como en `src/app/actions/invitations.ts`.
- [ ] **Step 1: Pruebas** `admin.test.ts`: `parseOverview([{id:"h",name:"Casa",emoji:"🏡",timezone:"America/Costa_Rica",disabled:false,members:[{user_id:"u",name:"Ana",emoji:"🌸",role:"admin",tasks:2}]}])` → `[{id:"h",…,members:[{userId:"u",name:"Ana",emoji:"🌸",role:"admin",tasks:2}]}]`; `parseOverview(null)` → `[]`; `adminErrorMessage({message:"last_admin"})` → `"El hogar necesita al menos un admin"`, y los otros tres códigos y el genérico con los textos de Global Constraints. En `mapping.test.ts`: `buildState({...,isSuperAdmin:true}).isSuperAdmin` → `true`; sin el campo → `false`.
- [ ] **Step 2:** `npx vitest run src/lib/admin.test.ts src/lib/supabase/mapping.test.ts` → FAIL.
- [ ] **Step 3:** Implementar; en `snapshot.ts` leer `profiles.is_super_admin` con `.eq("id", userId).single()` en el mismo `Promise.all`.
- [ ] **Step 4:** PASS; `npm run typecheck`.
- [ ] **Step 5: Commit** "Datos del panel de super admin".

### Task 3: Pantalla `/admin`

**Files:**
- Create: `src/app/admin/page.tsx`, `src/components/admin/AdminScreen.tsx`, `src/components/app/InviteLink.tsx`
- Modify: `src/components/app/HouseholdCard.tsx` (usar `InviteLink`), `src/components/auth/WelcomeForm.tsx` (exportar los campos de hogar como `HouseholdFields` para reutilizarlos), `src/components/app/SettingsScreen.tsx` (fila "Panel de administración" si `state.isSuperAdmin`), `src/lib/auth/paths.ts` + `paths.test.ts` (`isBareScreen("/admin")` → `true`), `src/styles/app.css`

**Interfaces:**
- Consumes: `parseOverview`, `adminErrorMessage`, `adminCreateHousehold`, `adminNewAdminLink` (Task 2); `useSync().db`.
- Produces: `InviteLink({ url, title, onDone }: { url: string; title: string; onDone: () => void })` — el bloque "Enlace listo" con **Compartir** (solo si `navigator.share`) y **Copiar**, extraído de `HouseholdCard`.
- `AdminScreen`: carga `db.rpc("admin_overview")` al montar y tras cada acción; `forbidden` → `router.replace("/")`. Estructura y textos según spec §2: "Panel", **Crear hogar** (hoja con `HouseholdFields` → `adminCreateHousehold` → `InviteLink`), sección por hogar con "Desactivado" si aplica, filas de miembro "N tareas", acciones de miembro en `action-sheet` (**Hacer admin**/**Quitar admin**, **Quitar del hogar**), al pie **Nuevo enlace de admin** y **Desactivar hogar**/**Reactivar hogar** (confirmación "¿Desactivar {hogar}? Sus miembros dejan de verlo hasta que lo reactives."). Hoja de quitar: "Tiene N tareas asignadas." con **Pasarlas a {nombre}** por cada otro miembro, **Cualquiera**, **Borrarlas** (danger); con N = 0, solo "¿Quitar a {nombre} de {hogar}?" y **Quitar**. Errores → toast `adminErrorMessage`. Enlace "Volver" a `/ajustes`.
- [ ] **Step 1: Prueba** en `paths.test.ts`: `isBareScreen("/admin")` → `true`. FAIL → implementar → PASS.
- [ ] **Step 2:** Implementar componentes y estilos.
- [ ] **Step 3:** `npm test && npm run typecheck && npm run lint && npm run build` verde.
- [ ] **Step 4: Verificación en WebKit (Playwright del scratchpad, sesión "Prueba Claude" que NO es super admin):** `/admin` redirige a `/` y la fila "Panel de administración" no aparece en Ajustes. (La verificación como super admin la hace el usuario tras desplegar.)
- [ ] **Step 5: Commit** "Panel de super admin".

### Task 4: Documentación y verificación final

**Files:**
- Modify: `docs/DEPLOY.md` (§3.2: paso 4 `20261014000000_super_admin.sql`; §3.6: "En Ajustes aparece **Panel de administración**"), `README.md` (tabla de estado: fila "Panel de super admin (crear hogares, miembros, roles, desactivar; sin acceso a tareas)" ✅), `docs/SPEC.md` §17 (fase 2b: panel de super admin hecho).
- [ ] **Step 1:** Escribir. **Step 2:** suite completa + pruebas SQL verdes. **Step 3: Commit** "Documentar el panel de super admin".
