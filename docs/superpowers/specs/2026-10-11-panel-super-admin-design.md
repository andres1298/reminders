# Panel de super admin

Fecha: 2026-10-11 · Estado: aprobado en conversación, pendiente de revisión escrita.

## Objetivo

Un panel muy sencillo para el super admin: crear hogares para otras personas y administrarlos (miembros, roles, activo/inactivo) **sin poder ver sus tareas**. Éxito = el super admin crea "Casa de mamá", le pasa un enlace, la persona entra como admin de su hogar, y el super admin puede quitar miembros o desactivar el hogar; en ningún momento (ni desde la consola del navegador) puede leer listas, tareas, historial o pendientes de un hogar al que no pertenece.

## Decisiones

| # | Tema | Decisión |
|---|---|---|
| 1 | Crear hogar | Para otra persona: el hogar nace vacío (con su lista "General"), el super admin **no** es miembro, y se genera un enlace de invitación con rol **admin**. |
| 2 | Privacidad | La garantiza la base de datos: se quita el acceso de lectura del super admin a `lists`, `tasks`, `task_events` y `household_todos`, y su permiso de `restore_task`. |
| 3 | Acciones | Nuevo enlace de admin, quitar miembro, hacer/quitar admin, desactivar/reactivar hogar. |
| 4 | Quitar miembro | Se elige el destino de **sus tareas fijas**: borrarlas (borrado lógico, recuperables por un admin del hogar desde la Papelera), pasarlas a otra persona del hogar, o a "Cualquiera". En rotaciones solo se le saca del turno. |
| 5 | Lo que ve el super admin | Hogares (nombre, emoji, zona, activo), miembros (nombre, emoji, rol) y **cuántas** tareas tiene asignadas cada miembro. Nunca títulos ni contenido. |
| 6 | Arquitectura | Funciones SQL `SECURITY DEFINER` que verifican `is_super_admin()` y hacen cada acción en una transacción. |

**Fuera de alcance:** invitaciones de plataforma, borrar hogares (la SPEC no permite borrado definitivo), que los admins de cada hogar quiten miembros, selector de hogar.

## 1. Migración `supabase/migrations/20261014000000_super_admin.sql`

### Privacidad
Recrear sin `or public.is_super_admin()`:
- `lists_select`, `tasks_select`, `events_select`, `todos_select`.
- `restore_task`: solo admin del hogar o quien la borró (miembro).

Se mantiene el acceso del super admin a `profiles`, `households` y `household_members` (lectura), que es lo que el panel necesita, aunque el panel usa las funciones de abajo.

### Funciones (todas `security definer set search_path = ''`, empiezan con `if not public.is_super_admin() then raise exception 'forbidden' using errcode = '42501'`; `grant execute ... to authenticated`)

| Función | Retorno | Comportamiento |
|---|---|---|
| `admin_overview()` | `jsonb` | Arreglo de hogares no borrados, ordenados por `created_at`: `{id, name, emoji, timezone, disabled, members: [{user_id, name, emoji, role, tasks}]}`. `tasks` = tareas no borradas con `current_assignee_id = user_id` y `assignment_mode = 'fixed'`, más las rotaciones donde participa. Sin títulos. |
| `admin_create_household(p_name text, p_emoji text, p_timezone text)` | `uuid` | Inserta el hogar con `created_by = auth.uid()` (sin membresía) y su lista "General" 📌 en posición 0. |
| `admin_create_invitation(p_household uuid, p_token_hash text)` | `void` | Inserta invitación `kind 'household'`, `role 'admin'`, `invited_by = auth.uid()`. El token lo genera el servidor (como en fase 2a). |
| `admin_set_role(p_household uuid, p_user uuid, p_role text)` | `void` | `update household_members`; el trigger `keep_one_admin` impide dejar el hogar sin admin (`last_admin`). |
| `admin_remove_member(p_household uuid, p_user uuid, p_tasks text, p_to uuid default null)` | `void` | `p_tasks` ∈ `'delete' \| 'reassign' \| 'anyone'`. En orden y en la misma transacción: (1) tareas fijas de la persona: `delete` → `deleted_at = now(), deleted_by = auth.uid()`; `reassign` → `current_assignee_id = p_to` (debe ser miembro del hogar, distinto de `p_user`, si no `22023`); `anyone` → `assignment_mode = 'anyone', current_assignee_id = null`. (2) Rotaciones: se borra su fila de `task_rotation` y se renumeran posiciones; si era el turno actual, pasa al siguiente; si la rotación queda vacía, la tarea pasa a "Cualquiera". (3) Borra la membresía (el trigger impide quitar al último admin). (4) Borra sus `push_subscriptions`? **No**: la persona puede pertenecer a otros hogares; el cron ya filtra por membresía. |
| `admin_set_household_disabled(p_household uuid, p_disabled boolean)` | `void` | `disabled_at = now()` o `null`. |

Errores (`raise exception` con el mensaje como código): `forbidden`, `last_admin`, `not_member`, `invalid_target`.

## 2. App

- `src/app/actions/admin.ts` (Server Actions, usan `supabaseServer()`, es decir, la sesión del super admin; nunca la service key):
  - `adminCreateHousehold({ name, emoji, timezone })` → RPC + genera token con `newInviteToken`/`hashInviteToken` → `admin_create_invitation` → devuelve `{ ok, url }`.
  - `adminNewAdminLink(householdId)` → token + `admin_create_invitation` → `{ ok, url }`.
- Lecturas y demás acciones desde el cliente con `db.rpc(...)` (la sesión ya trae el permiso; las funciones validan).
- `src/lib/admin.ts` (puro, probado): tipos de `admin_overview` y `adminErrorMessage(code)` → "No tienes permiso", "El hogar necesita al menos un admin", "Esa persona ya no es del hogar", "Elige a alguien del hogar", genérico "No se pudo. Intenta otra vez".
- Pantalla `/admin` (`src/app/admin/page.tsx` + `src/components/admin/AdminScreen.tsx`), estilo de Ajustes (`list--inset`, `row`, `action-sheet` de `TaskUI`):
  - Encabezado "Panel" y botón **Crear hogar** → hoja con nombre, emoji, zona (mismo formulario que `/bienvenida`) → muestra el enlace con **Compartir/Copiar** (mismo bloque que `HouseholdCard`).
  - Una sección por hogar: emoji + nombre (+ "Desactivado"), sus miembros (emoji, nombre, rol, "N tareas"). Tocar un miembro → acciones: **Hacer admin / Quitar admin**, **Quitar del hogar**.
  - Al final de cada hogar: **Nuevo enlace de admin** y **Desactivar / Reactivar hogar** (este con confirmación).
  - **Quitar del hogar** → hoja: "Tiene N tareas asignadas." Opciones: **Pasarlas a…** (lista de los otros miembros), **Cualquiera**, **Borrarlas** (danger). Si N = 0, solo confirmar.
  - Si `admin_overview` responde `forbidden` → `router.replace("/")`.
- Ajustes: fila **Panel de administración** solo si el perfil es super admin. `profiles.is_super_admin` se lee en `loadSnapshot` y se expone como `AppState.isSuperAdmin?: boolean`.
- `/admin` pide sesión (no es pública) y va con la barra de pestañas oculta (`isBareScreen`) y botón "Volver a Ajustes".

## 3. Comportamientos que hay que saber

- Un miembro de un **hogar desactivado** deja de verlo (las RLS lo excluyen) y la app lo lleva a `/bienvenida`, donde podría crear otro hogar. Se acepta en este pedazo; un aviso "Tu hogar está desactivado" queda para después.
- El super admin no aparece como miembro de los hogares que crea, así que no recibe avisos ni ve sus tareas.

## 4. Pruebas

- SQL (`supabase/tests/rls_and_rpc.test.sql`, sección "Super admin"):
  - el super admin lee 0 filas de `tasks`, `lists`, `task_events` y `household_todos` de un hogar ajeno, y `restore_task` le da `forbidden`;
  - un no-super-admin recibe `forbidden` en cada función `admin_*`;
  - `admin_create_household` no lo hace miembro y crea "General";
  - `admin_create_invitation` + `accept_invitation` deja a la persona como **admin**;
  - `admin_remove_member` con `reassign`, `anyone` y `delete` (tarea fija), rotación con turno actual de la persona (pasa al siguiente, posiciones renumeradas) y rotación que queda vacía;
  - quitar al último admin → `last_admin`; `reassign` a alguien que no es del hogar → `invalid_target`;
  - `admin_set_household_disabled` hace que los miembros dejen de ver el hogar.
- Vitest: `adminErrorMessage` y el parseo de `admin_overview`.
- Manual: crear "Casa de prueba", abrir el enlace en otra sesión, quitarla con cada opción.

## 5. Despliegue

Correr `20261014000000_super_admin.sql` en el SQL Editor; agregarlo a `docs/DEPLOY.md` §3.2.
