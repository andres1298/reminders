# Fase 2a: cuentas, hogar compartido y datos en Supabase · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lukas guarda tareas y pendientes en Supabase, con login por correo + contraseña, un hogar compartido e invitaciones por enlace.

**Architecture:** El navegador lee una "foto" del hogar (`AppState`) desde Supabase con la sesión del usuario (RLS) y la guarda en caché por usuario. Cada acción se aplica primero en local con las funciones puras de `src/lib/tasks.ts` y luego se manda por una cola en serie a las RPC / tablas. Registro por invitación y suscripciones push pasan por Server Actions con la service key.

**Tech Stack:** Next.js 16.4 (App Router, Cache Components, `proxy.ts`), React 19.3, `@supabase/ssr` 0.12 + `@supabase/supabase-js` 2.117, Zod 4, Vitest 5, Postgres (pruebas SQL en Docker).

**Spec:** `docs/superpowers/specs/2026-10-11-fase2-supabase-design.md`

## Global Constraints

- Antes de escribir código de Next, leer la guía relevante en `node_modules/next/dist/docs/` (AGENTS.md). Ya confirmado: el middleware se llama `proxy` (`src/proxy.ts`, export `proxy` + `config.matcher`); con `cacheComponents: true`, leer `cookies()`/`params` fuera de `<Suspense>` es error de build (`01-app/02-guides/authentication-with-cache-components.md`).
- UI en español. Mensajes exactos: "Ya estaba hecha 🐾", "Esa tarea ya no existe", "No se pudo guardar. Intenta otra vez", "Sin conexión: no se guardó", "Correo o contraseña incorrectos", "Esta invitación ya no sirve".
- La recurrencia solo en `src/lib/schedule.ts`; las RPC reciben el próximo vencimiento ya calculado.
- Nunca registrar qué cuenta tocó "Hecha" (solo `credited_to`).
- Estilos de componentes en `src/styles/lukas.css` (capa `components`); pantallas en `src/styles/app.css`. No usar la utilidad `ring` de Tailwind.
- Ids nuevos de tareas y pendientes: `crypto.randomUUID()`.
- Caché local: llave `lukas-cache-<userId>`; se elimina la llave `lukas-demo-v1`.
- Invitaciones: token de 32 bytes base64url, se guarda solo `sha256` hex; rol `member`; vence a los 7 días (default de la tabla).
- Contraseña mínima: 8 caracteres.
- Antes de cada commit: `npm test && npm run typecheck && npm run lint && npm run build`; si se toca `supabase/`, también las pruebas SQL (Task 1, paso 2).
- Commits en español, imperativo, terminando con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Dos teléfonos completan la misma ocurrencia casi a la vez → el segundo ve "Ya estaba hecha 🐾" y su foto se recarga; no queda la tarea avanzada dos veces en pantalla (Task 5: prueba de `errorMessage('already_done')` + recarga en la cola).
2. Un miembro que no es admin borra una tarea y toca "Deshacer" → se restaura (Task 1: prueba SQL de `restore_task` por quien la borró; y que otro miembro no-admin no pueda).
3. Llega una foto del servidor mientras hay cambios en la cola → no pisa el cambio optimista (Task 5: prueba "descarta la foto con la cola ocupada").
4. Sin red, la persona toca "Hecha" → la tarjeta vuelve a como estaba y sale "Sin conexión: no se guardó" (Task 5: prueba con `TypeError: Failed to fetch`).
5. Un teléfono cierra sesión y entra otra cuenta → los push ya no le llegan a la cuenta anterior (Task 11: `deletePushSubscription` al cerrar sesión; `savePushSubscription` reasigna por `endpoint`; verificación manual).

---

### Task 1: Migración de cuentas (perfil automático, restaurar)

**Files:**
- Create: `supabase/migrations/20261013000000_accounts.sql`
- Modify: `supabase/tests/00_supabase_stub.sql` (agregar `raw_user_meta_data jsonb` a `auth.users`)
- Modify: `supabase/tests/rls_and_rpc.test.sql` (agregar bloques al final; el `insert into public.profiles` de la línea 9 choca con el trigger: cambiarlo por `update public.profiles set display_name, avatar_emoji` por usuario; el bloque "Borrado lógico y Papelera" (líneas 95-104) hoy afirma que Mari **no** puede restaurar lo que borró: cambiarlo a que sí puede, y que vuelva a borrarla para que el bloque del admin siga probando la Papelera)
- Modify: `supabase/tests/run.sh` (aceptar `PG_BIN` ya existe; documentar en el encabezado el comando de Docker)

**Interfaces:**
- Produces: trigger `on_auth_user_created` → `public.handle_new_user()`; `public.restore_todo(uuid) returns void`; `public.restore_task(uuid)` permitido a admin, super admin **o** `deleted_by = auth.uid()` siendo miembro.

- [ ] **Step 1: Escribir las pruebas SQL (fallan)** al final de `rls_and_rpc.test.sql`:
  - insertar en `auth.users (id, email, raw_user_meta_data)` un usuario `'00000000-0000-0000-0000-0000000000d4'`, `'nuevo@example.com'`, `'{"display_name":"Nuevo"}'` → `assert (select display_name from public.profiles where id = …d4) = 'Nuevo'`.
  - usuario sin metadata `'sinnombre.largo@example.com'` → `display_name = 'sinnombre.largo'`.
  - Mari (miembro, no admin) borra una tarea con `delete_task` y la restaura con `restore_task` → `deleted_at is null`.
  - Andrés borra otra tarea; Mari intenta `restore_task` → `sqlerrm = 'forbidden'`.
  - Mari crea un pendiente, `delete_todo`, `restore_todo` → `deleted_at is null`; `Otra` (x) llama `restore_todo` sobre ese pendiente → `forbidden`.
- [ ] **Step 2: Correr y ver que fallan**
  Run (PowerShell, desde la raíz): `docker run --rm -v "${PWD}:/w" -w /w postgres:16 bash -c "PG_BIN=/usr/lib/postgresql/16/bin bash supabase/tests/run.sh"`
  Expected: error en el trigger / `restore_todo` inexistente.
- [ ] **Step 3: Escribir la migración.**
  - `handle_new_user()` `security definer set search_path = ''`: `insert into public.profiles (id, display_name) values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)), 40)) on conflict (id) do nothing`; trigger `after insert on auth.users for each row`.
  - `create or replace function public.restore_task` con la condición `public.is_admin(hh) or public.is_super_admin() or (deleted_by = auth.uid() and public.is_member(hh))` (leer `deleted_by` en el mismo `select … for update`).
  - `restore_todo(p_todo uuid)`: igual que `delete_todo` pero exige `deleted_at is not null`, valida `is_member`, pone `deleted_at = null, deleted_by = null`.
  - `revoke execute … from public, anon`; `grant execute on function public.restore_todo(uuid) to authenticated`.
- [ ] **Step 4: Correr las pruebas SQL** (mismo comando). Expected: `ok · migraciones y pruebas SQL`.
- [ ] **Step 5: Commit** `git add supabase && git commit -m "Migración de cuentas: perfil automático y restaurar tareas y pendientes"`

### Task 2: Traducción filas ⇄ AppState

**Files:**
- Create: `src/lib/supabase/rows.ts` (tipos de filas: `HouseholdRow`, `MemberRow`, `ListRow`, `TaskRow`, `RotationRow`, `EventRow`, `TodoRow`, con nombres de columna exactos de `20261011000000_init.sql`)
- Create: `src/lib/supabase/mapping.ts`
- Test: `src/lib/supabase/mapping.test.ts`

**Interfaces:**
- Produces:
  - `scheduleFromRow(r: Pick<TaskRow,"schedule_type"|"schedule"|"anchor">): Schedule`
  - `scheduleToRow(s: Schedule): Pick<TaskRow,"schedule_type"|"schedule"|"anchor">` (no-interval → `anchor: "schedule"`)
  - `taskFromRow(r: TaskRow, rotation: RotationRow[], events: EventRow[], defaultListId: string): Task`
  - `taskToRow(t: Task, householdId: string, userId: string): Omit<TaskRow,"created_at"|"updated_at"|"deleted_at"|"deleted_by"|"paused_at"|"paused_by">` (para `insert`/`update`; `created_by = userId`)
  - `rotationRows(taskId: string, a: Assignment): RotationRow[]` (vacío salvo `rotation`; `position` = índice)
  - `todoFromRow(r: TodoRow): Todo` / `todoToRow(t: Todo, householdId: string, userId: string): TodoRow-insert`
  - `Member` gana `role?: "admin" | "member"` en `src/lib/types.ts`; `buildState` lo llena desde `MemberRow.role`.
  - `buildState(input: { me: string; household: HouseholdRow; members: MemberRow[]; lists: ListRow[]; tasks: TaskRow[]; rotation: RotationRow[]; events: EventRow[]; todos: TodoRow[] }): AppState`
  - `snoozeLabel(createdAt: string, until: string): string`

- [ ] **Step 1: Pruebas** en `mapping.test.ts`:
  - ida y vuelta `scheduleToRow`→`scheduleFromRow` para los 4 tipos: `{type:"interval",every:3,unit:"day",anchor:"completion"}`, `{type:"weekly",weekdays:[2,4],everyWeeks:1}`, `{type:"monthly",day:"last",everyMonths:1}`, `{type:"once",date:"2026-10-20"}` → `toEqual` el original; y `scheduleToRow(weekly).schedule` `toEqual({weekdays:[2,4],everyWeeks:1})`.
  - `taskFromRow`: `due_time "19:00:00"` → `dueTime "19:00"`; `color null` → `"none"`; `description null` → `""`; `list_id null` → `defaultListId`.
  - assignment: `anyone` → `{mode:"anyone"}`; `fixed` + `current_assignee_id "u1"` → `{mode:"fixed",userId:"u1"}`; `rotation` con filas `[{user_id:"u2",position:1},{user_id:"u1",position:0}]` y actual `"u2"` → `{mode:"rotation",order:["u1","u2"],current:"u2"}`.
  - eventos: un `done` con `credited_to:"u2"`, `assignee_at_time:"u1"` → `chosen: true`; `credited_to` = `assignee_at_time` → `chosen: false`; `undone_at` no nulo → `undone: true`; eventos `undone`/`missed` se excluyen; orden más reciente primero; `prev.assignment` usa `prev_assignee_id` con el modo de la tarea.
  - `snoozeLabel` de +60 min → `"+1 h"`, +1440 → `"+1 día"`, +4320 → `"+3 días"`.
  - `buildState` ordena listas por `position` y `me` queda igual al argumento; miembros mapean `display_name`/`avatar_emoji`/`role` a `name`/`emoji`/`role`.
- [ ] **Step 2:** `npx vitest run src/lib/supabase/mapping.test.ts` → FAIL (módulo no existe).
- [ ] **Step 3:** Implementar `rows.ts` y `mapping.ts` con esas firmas. `due_time` a `"HH:mm"` con `slice(0,5)`.
- [ ] **Step 4:** Mismo comando → PASS.
- [ ] **Step 5: Commit** "Traducción entre filas de Supabase y AppState".

### Task 3: Clientes de Supabase, proxy y rutas públicas

**Files:**
- Create: `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `src/lib/auth/paths.ts`, `src/proxy.ts`
- Test: `src/lib/auth/paths.test.ts`

**Interfaces:**
- Produces:
  - `supabaseBrowser(): SupabaseClient` (singleton, `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)`)
  - `supabaseServer(): Promise<SupabaseClient>` (`createServerClient` con `await cookies()`, `getAll`/`setAll`; `setAll` en try/catch para Server Components)
  - `isPublicPath(pathname: string): boolean`
- [ ] **Step 1: Pruebas** `paths.test.ts`: públicas → `true`: `/entrar`, `/recuperar`, `/nueva-contrasena`, `/invitacion/abc`, `/api/cron/notifications`, `/sw.js`, `/manifest.webmanifest`, `/icon.svg`, `/apple-icon.png`, `/icons/192.png`. Privadas → `false`: `/`, `/t/123`, `/ajustes`, `/bienvenida`, `/entrarx`.
- [ ] **Step 2:** `npx vitest run src/lib/auth/paths.test.ts` → FAIL.
- [ ] **Step 3:** Implementar `paths.ts`. Leer `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` (matcher) y escribir `src/proxy.ts`: crea `createServerClient` sobre `request.cookies`/`response.cookies` (patrón `updateSession` de `@supabase/ssr`), llama `auth.getUser()`, y si no hay usuario y `!isPublicPath` → `NextResponse.redirect('/entrar?next=<path>')`. `config.matcher` excluye `/_next/static`, `/_next/image` y archivos con extensión.
- [ ] **Step 4:** pruebas PASS; `npm run typecheck && npm run build` sin errores.
- [ ] **Step 5: Commit** "Clientes de Supabase y proxy de sesión".

### Task 4: Pantallas de login y recuperación

**Files:**
- Create: `src/app/entrar/page.tsx`, `src/app/recuperar/page.tsx`, `src/app/nueva-contrasena/page.tsx`, `src/components/auth/AuthForms.tsx` (client: `SignInForm`, `RecoverForm`, `NewPasswordForm`)
- Modify: `src/styles/app.css` (clase `.auth-screen`: columna centrada con `LukasArt`, tarjeta y botón mostaza existentes)
- Modify: `src/components/app/AppShell.tsx` y `TabBar.tsx` (ocultar la tab bar en `/entrar`, `/recuperar`, `/nueva-contrasena`, `/invitacion/*`, `/bienvenida`)

**Interfaces:**
- Consumes: `supabaseBrowser()` (Task 3).
- `SignInForm` lee `next` con `useSearchParams()` (dentro de `<Suspense>`), `signInWithPassword`; error → "Correo o contraseña incorrectos"; éxito → `location.replace(next ?? "/")` (recarga completa para que el proxy vea la cookie).
- `RecoverForm`: `resetPasswordForEmail(email, { redirectTo: location.origin + "/nueva-contrasena" })`; siempre muestra "Si el correo existe, te llegó un enlace." (no revela si existe).
- `NewPasswordForm`: `updateUser({ password })` (mín. 8) → `location.replace("/")`.
- [ ] **Step 1:** Implementar las tres páginas (Server Components estáticos que montan el formulario cliente) sin botón de "Crear cuenta".
- [ ] **Step 2:** `npm run dev`; con un usuario de prueba creado en el dashboard (Add user, auto confirm): `/` redirige a `/entrar?next=%2F`; credenciales malas muestran el mensaje exacto; buenas llevan a `/`.
- [ ] **Step 3:** `npm run typecheck && npm run lint && npm run build`.
- [ ] **Step 4: Commit** "Pantallas para entrar y recuperar la contraseña".

### Task 5: Cola de sincronización y mensajes de error

**Files:**
- Create: `src/lib/sync.ts`
- Test: `src/lib/sync.test.ts`

**Interfaces:**
- Produces:
  - `type SyncError = "already_done" | "not_found" | "offline" | "auth" | "unknown"`
  - `classifyError(e: unknown): SyncError` (Postgres/PostgREST `message` `already_done` → already_done; `task_not_found`/`todo_not_found`/`forbidden`/código `42501`/`P0002` → not_found; `TypeError` de fetch → offline; status 401 o `JWT expired` → auth)
  - `errorMessage(e: SyncError): string` → `"Ya estaba hecha 🐾"`, `"Esa tarea ya no existe"`, `"Sin conexión: no se guardó"`, auth → `""` (se redirige), unknown → `"No se pudo guardar. Intenta otra vez"`
  - `createSyncQueue(opts: { onError: (e: SyncError) => void; onIdle: () => void }): { push(job: () => Promise<void>): void; busy(): boolean }` — ejecuta en serie; al primer error descarta los trabajos restantes, llama `onError` y luego `onIdle`.
- [ ] **Step 1: Pruebas:** orden (dos jobs que resuelven en tiempos inversos registran `["a","b"]`); `busy()` true mientras corre y false después; un job que lanza `{ message: "already_done" }` → `onError("already_done")` y el siguiente job no corre; `new TypeError("Failed to fetch")` → `"offline"`; `onIdle` se llama una vez al vaciarse; `errorMessage` devuelve los textos exactos de arriba.
- [ ] **Step 2:** `npx vitest run src/lib/sync.test.ts` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** "Cola de sincronización en serie con errores en español".

### Task 6: Almacén con foto de Supabase y proveedor de datos

**Files:**
- Create: `src/lib/supabase/snapshot.ts`, `src/components/app/DataProvider.tsx`
- Modify: `src/lib/store.ts` (quitar demo y `resetDemo`; caché por usuario), `src/components/app/AppShell.tsx` (montar `DataProvider` dentro de `ToastProvider`, envolviendo `TaskUIProvider`)
- Test: `src/lib/store.test.ts`

**Interfaces:**
- Consumes: `buildState` (Task 2), `supabaseBrowser` (Task 3), `createSyncQueue`/`errorMessage` (Task 5).
- Produces:
  - `loadSnapshot(db: SupabaseClient, userId: string): Promise<AppState | "no-household">` — primer hogar por `joined_at`; consultas con `.is("deleted_at", null)` en listas, tareas y pendientes; eventos de los últimos 90 días del hogar ordenados `created_at desc` (se recortan a 20 por tarea en `buildState`).
  - en `store.ts`: `startSession(userId: string): void` (carga `lukas-cache-<userId>` si existe y lo publica), `applyServer(next: AppState): void` (guarda en caché y publica; quien llama decide si aplica), `setState(next)` (solo local, para el optimista), `endSession(): void` (borra la caché del usuario y `lukas-demo-v1`), `useAppState`, `useNow`, `tickNow`, `getState` sin cambios de firma.
  - `useSync(): { run(apply: (s: AppState) => AppState, remote: (db: SupabaseClient, s: AppState) => Promise<void>): void; db: SupabaseClient; refresh(): Promise<void> }` exportado desde `DataProvider.tsx`. `refresh` carga la foto y la descarta si `queue.busy()` (Review Focus 3); `run` aplica `apply` con `setState`, encola `remote` con el estado resultante; en error → toast `errorMessage`, `refresh()`; `auth` → `location.replace("/entrar")`.
- `DataProvider`: al montar, `getUser()`; sin usuario y ruta no pública → no hace nada (el proxy ya redirige). Con usuario: `startSession`, `refresh()`; si `"no-household"` y la ruta no es `/bienvenida` ni `/invitacion/*` → `router.replace("/bienvenida")`. Refresca en `visibilitychange` a visible, cada 60 s y en `onIdle`.
- [ ] **Step 1: Pruebas** `store.test.ts` (entorno node con `localStorage` simulado en `globalThis`): `startSession("u1")` con caché guardada publica ese estado; `applyServer(x)` guarda `lukas-cache-u1` y `getState()` devuelve `x`; `endSession` borra `lukas-cache-u1` y `lukas-demo-v1`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar `store.ts`, `snapshot.ts`, `DataProvider.tsx` → **Step 4:** PASS, `npm run typecheck`.
- [ ] **Step 5:** Quitar de `SettingsScreen.tsx` la sección "Datos de prueba" y el footer "…llegan con la conexión a Supabase". `demo-seed.ts` queda solo importado por pruebas.
- [ ] **Step 6: Commit** "La app carga el hogar desde Supabase con caché por usuario".

### Task 7: Crear el hogar (`/bienvenida`)

**Files:**
- Create: `src/app/bienvenida/page.tsx`, `src/components/auth/WelcomeForm.tsx`

**Interfaces:**
- Consumes: `useSync().db`, `refresh` (Task 6).
- Formulario: nombre (1–40), emoji (default 🏡), zona horaria (`<select>` con `Intl.supportedValuesOf("timeZone")`, default `America/Costa_Rica`). Al guardar: `db.rpc("create_household", { p_name, p_emoji, p_timezone })` → `db.from("lists").insert({ household_id, name: "General", emoji: "📌", position: 0 })` → `refresh()` → `router.replace("/")`. Texto bajo el botón: "Si instalas la app, entra una vez con tu correo y contraseña."
- [ ] **Step 1:** Implementar. **Step 2:** manual en `npm run dev` con el usuario de prueba: llega a `/bienvenida`, crea "Casa", queda en Inicio vacío con Lukas. **Step 3:** typecheck, lint, build. **Step 4: Commit** "Pantalla para crear el hogar".

### Task 8: Acciones de tareas y pendientes contra Supabase

**Files:**
- Create: `src/lib/supabase/remote.ts`
- Modify: `src/lib/tasks.ts` (`newId` → `crypto.randomUUID()` para tareas, pendientes y eventos), `src/components/app/TaskUI.tsx`, `src/components/tasks/CreateTaskSheet.tsx`, `src/components/todos/TodoScreen.tsx`, `src/components/tasks/HomeScreen.tsx`
- Test: `src/lib/supabase/remote.test.ts`

**Interfaces:**
- Consumes: `useSync().run` (Task 6), `taskToRow`/`rotationRows`/`todoToRow` (Task 2).
- Produces en `remote.ts` (cada una `(db: SupabaseClient, …) => Promise<void>`, lanza el `error` de Supabase si lo hay):
  - `rpcComplete(db, id, expectedDue: string, nextDue: string | null, creditTo: string | null)` → `complete_task` (`p_task, p_expected_due, p_next_due, p_credited_to`)
  - `rpcSkip(db, id, expectedDue, nextDue)`, `rpcSnooze(db, id, until)`, `rpcUndo(db, id)`, `rpcDeleteTask(db, id)`, `rpcRestoreTask(db, id)`
  - `saveTask(db, task: Task, householdId, userId, isNew: boolean)` → `insert` o `update` en `tasks`, luego `delete` de `task_rotation` del task y `insert` de `rotationRows`
  - `insertTodo(db, todo, householdId, userId)`, `patchTodo(db, id, patch: { done_at?, soon?, assignee_id?, text? })`, `rpcDeleteTodo(db, id)`, `rpcRestoreTodo(db, id)`
- Cableado:
  - `TaskUI.complete`: la llamada remota va en `commit` (después del destello). Se calcula `expectedDue` = `nextDueAt` de la tarea **antes** de aplicar, y `nextDue`/`creditedTo` desde el resultado de `completeTask`. Si se deshace durante el destello no se manda nada.
  - `undo` tras el commit → `rpcUndo`; `skip` → `rpcSkip`; `snooze` → `rpcSnooze(until)`; borrar → `rpcDeleteTask`, su "Deshacer" → `rpcRestoreTask`.
  - `CreateTaskSheet`: lista por defecto `state.lists[0].id` (en vez de `"general"`); `saveTask` con `isNew`.
  - `HomeScreen`: los filtros de lista excluyen `state.lists[0]` (en vez de `id !== "general"`).
  - `TodoScreen`: agregar → `insertTodo`; marcar/desmarcar → `patchTodo({ done_at })`; "pronto"/responsable → `patchTodo`; borrar → `rpcDeleteTodo`, deshacer → `rpcRestoreTodo`.
- [ ] **Step 1: Pruebas** `remote.test.ts` con un `db` falso que registra llamadas: `rpcComplete(db,"t1","2026-10-13T01:00:00.000Z",null,null)` llama `rpc("complete_task", { p_task:"t1", p_expected_due:"2026-10-13T01:00:00.000Z", p_next_due:null, p_credited_to:null })`; `saveTask` de una tarea en rotación hace `update` y luego `delete().eq("task_id",id)` y `insert` de 2 filas con `position` 0 y 1; si el `db` falso devuelve `{ error: { message: "already_done" } }`, la función lanza ese objeto.
- [ ] **Step 2:** FAIL → **Step 3:** implementar `remote.ts` y el cableado → **Step 4:** `npm test` (incluye las pruebas existentes de `tasks.test.ts`, que deben seguir pasando con UUIDs).
- [ ] **Step 5:** Manual: crear tarea, completar, deshacer, saltar, posponer, borrar y deshacer, pendientes; recargar la página y ver que todo persiste. En un segundo navegador con otra sesión del mismo hogar, completar y volver a la primera pestaña → se actualiza.
- [ ] **Step 6: Commit** "Tareas y pendientes se guardan en Supabase".

### Task 9: Ajustes → Cuenta y Hogar, crear y revocar invitaciones

**Files:**
- Create: `src/lib/invite-token.ts`, `src/app/actions/invitations.ts`, `src/components/app/AccountCard.tsx`, `src/components/app/HouseholdCard.tsx`
- Modify: `src/components/app/SettingsScreen.tsx`
- Test: `src/lib/invite-token.test.ts`

**Interfaces:**
- Produces:
  - `newInviteToken(): string` (32 bytes `randomBytes`, `base64url`) y `hashInviteToken(token: string): string` (`sha256` hex) — server-only.
  - Server Action `createInvitation(householdId: string): Promise<{ ok: true; url: string } | { ok: false; message: string }>` — usa `supabaseServer()`; inserta `{ kind: "household", household_id, token_hash, role: "member", invited_by: user.id }`; `url` = origen de `headers()` + `/invitacion/<token>`.
  - Lectura de pendientes y revocar desde el cliente con `db` (RLS de admin): `from("invitations").select("id, created_at, expires_at").is("accepted_at", null).is("revoked_at", null).gt("expires_at", now)`; revocar = `update({ revoked_at: now })`.
- `AccountCard`: nombre (1–40) y emoji editables → `update profiles`, luego `refresh()`; **Cerrar sesión** → `deletePushSubscription` (Task 11; hasta entonces, omitir esa llamada) → `db.auth.signOut()` → `endSession()` → `location.replace("/entrar")`.
- `HouseholdCard`: miembros desde `state.members` con su `role` (Task 2); si soy admin: **Invitar a alguien** → `createInvitation` → `navigator.share({ title: "Lukas", text: "Únete a mi hogar en Lukas", url })` con fallback a `navigator.clipboard.writeText(url)` + toast "Enlace copiado"; lista de pendientes con "Vence el {fecha}" y **Revocar**.
- [ ] **Step 1: Pruebas** `invite-token.test.ts`: el token tiene 43 caracteres y solo `[A-Za-z0-9_-]`; dos tokens son distintos; `hashInviteToken("abc")` = `"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS, typecheck, lint, build.
- [ ] **Step 5:** Manual: cambiar nombre, crear invitación, verla en pendientes, revocarla.
- [ ] **Step 6: Commit** "Ajustes: cuenta, miembros e invitaciones".

### Task 10: Aceptar una invitación (`/invitacion/[token]`)

**Files:**
- Create: `src/app/invitacion/[token]/page.tsx`, `src/components/auth/JoinForm.tsx`, `src/app/actions/join.ts`

**Interfaces:**
- Consumes: `hashInviteToken` (Task 9), `supabaseAdmin()` (existente), `supabaseServer()` (Task 3).
- `page.tsx`: lee `params` y la invitación **dentro de `<Suspense>`** (Cache Components). Con `supabaseAdmin()`: invitación por `token_hash` + hogar (`name`, `emoji`) + perfil de `invited_by`. Inválida (no existe, `revoked_at`, `accepted_at` o `expires_at < now`) → pantalla "Esta invitación ya no sirve" + "Pídele otra a quien te invitó." Válida → "**{nombre}** te invitó a **{emoji} {hogar}**" y `JoinForm` (con `signedIn` según `supabaseServer().auth.getUser()`).
- Server Action `joinWithInvitation(input: { token: string; name: string; email: string; password: string }): Promise<{ ok: true } | { ok: false; message: string; exists?: true }>` — Zod (nombre 1–40, email, password ≥ 8); revalida la invitación; `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: name } })` (error de correo existente → `{ ok:false, exists:true, message:"Ya tienes cuenta: entra para unirte" }`); `signInWithPassword` con `supabaseServer()`; `rpc("accept_invitation", { p_token_hash })`; si falla → `auth.admin.deleteUser(id)` y `{ ok:false, message:"Esta invitación ya no sirve" }`.
- Server Action `acceptInvitation(token: string): Promise<{ ok: boolean; message?: string }>` para quien ya tiene sesión.
- `JoinForm`: sin sesión → formulario; con `exists` → enlace a `/entrar?next=/invitacion/<token>`; con sesión → botón "Unirme a {emoji} {hogar}". Éxito → `location.replace("/")`.
- [ ] **Step 1:** Implementar. **Step 2:** Manual en `npm run dev`: invitación revocada → pantalla de inválida; válida en ventana privada → crear cuenta → Inicio muestra el hogar compartido; volver a abrir el mismo enlace → inválida; correo ya existente → mensaje y enlace a entrar. **Step 3:** typecheck, lint, build. **Step 4: Commit** "Unirse a un hogar con un enlace de invitación".

### Task 11: Suscripciones push por usuario y service worker

**Files:**
- Modify: `src/app/actions/push.ts`, `src/components/app/PushCard.tsx`, `src/components/app/AccountCard.tsx`, `public/sw.js`

**Interfaces:**
- Produces:
  - `savePushSubscription(input: unknown): Promise<{ ok: boolean }>` — valida con el `Subscription` de Zod existente; `user` desde `supabaseServer().auth.getUser()` (sin usuario → `{ ok:false }`); `supabaseAdmin().from("push_subscriptions").upsert({ user_id, endpoint, p256dh, auth, user_agent }, { onConflict: "endpoint" })`.
  - `deletePushSubscription(endpoint: string): Promise<void>` — borra por `endpoint` **y** `user_id` del usuario de la sesión.
- `PushCard.enable` → tras `subscribe`, `savePushSubscription(s.toJSON())`. También al montar, si ya hay suscripción, llamarla una vez (re-asocia el dispositivo a la cuenta actual). `disable` → `deletePushSubscription(sub.endpoint)` antes de `unsubscribe`.
- `AccountCard` cerrar sesión → si hay suscripción en este dispositivo, `deletePushSubscription(endpoint)`.
- `public/sw.js`: en la estrategia network-first de páginas, no guardar `res.redirected`; `VERSION = "v3"`.
- [ ] **Step 1:** Implementar. **Step 2:** typecheck, lint, build. **Step 3:** Manual tras desplegar (Task 12): activar push → aparece la fila en `push_subscriptions` con tu `user_id`; crear una tarea que venza en 2 minutos → llega el aviso. **Step 4: Commit** "Las suscripciones push quedan asociadas a la cuenta".

### Task 12: Documentación y verificación final

**Files:**
- Modify: `docs/DEPLOY.md` (nueva sección "4. Fase 2: cuentas": correr `20261013000000_accounts.sql` en el SQL Editor; Authentication → Users → **Add user** con "Auto Confirm User"; el SQL de super admin del 3.6; entrar en la app y crear el hogar), `README.md` (tabla de estado: Datos ✅ Supabase, Auth por invitación ✅, avisos de tareas ✅; comando de pruebas SQL con Docker; quitar "datos de demo"), `docs/SPEC.md` §17 (fase 2a hecha).
- [ ] **Step 1:** Escribir los cambios.
- [ ] **Step 2:** `npm test && npm run typecheck && npm run lint && npm run build` y las pruebas SQL de Task 1 → todo verde.
- [ ] **Step 3: Commit** "Documentar la fase 2a y el despliegue de cuentas".
