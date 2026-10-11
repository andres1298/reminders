# Fase 2a: cuentas, hogar compartido y datos en Supabase

Fecha: 2026-10-11 · Estado: aprobado en conversación, pendiente de revisión escrita.

## Objetivo

Que Lukas guarde tareas y pendientes en Supabase en lugar del teléfono, con login propio y un hogar compartido con las personas de la casa (invitación por enlace). Éxito = dos personas en dos iPhones ven el mismo hogar, lo que una completa le aparece a la otra al volver a la app, y llega el aviso push a la hora de cada tarea.

## Decisiones

| # | Tema | Decisión |
|---|---|---|
| 1 | Alcance | Login, crear hogar, datos en Supabase **e** invitaciones de hogar. |
| 2 | Datos de la demo | Se descartan; el hogar empieza vacío. |
| 3 | Login | Correo + contraseña (funciona dentro de la PWA en iOS, que no comparte cookies con Safari). Sin link mágico. |
| 4 | Sincronización | Al abrir, al volver a primer plano, cada minuto y tras guardar. Sin Realtime. |
| 5 | Arquitectura | Caché en el cliente + Supabase directo desde el navegador (RLS y RPCs). Solo el registro por invitación pasa por el servidor. |
| 6 | Primera cuenta | Se crea en el dashboard de Supabase (Add user, auto confirm) y se marca como super admin por SQL. |

**Fuera de alcance:** Gestionar (pausar, Papelera, vacaciones), estadísticas por persona, invitaciones de plataforma, expulsar miembros y cambiar roles, selector de hogar, cola de cambios sin conexión, Realtime, importar datos de `localStorage`.

## 1. Login y sesión

- `src/lib/supabase/browser.ts`: `createBrowserClient` de `@supabase/ssr` (sesión en cookies).
- `src/lib/supabase/server.ts`: `createServerClient` con `cookies()` de Next.
- `src/proxy.ts` (nombre en Next 16 del antiguo middleware; confirmar en `node_modules/next/dist/docs/` antes de escribirlo): renueva la sesión y redirige a `/entrar` sin sesión. Rutas libres: `/entrar`, `/recuperar`, `/nueva-contrasena`, `/invitacion/*`, `/api/cron/*`, `/sw.js`, `/manifest.webmanifest`, íconos y `/_next/*`.
- Pantallas (estilo Lukas, `src/styles/lukas.css`):
  - `/entrar`: correo, contraseña, **Entrar**, "¿Olvidaste tu contraseña?". Sin "Crear cuenta". Acepta `?next=` para volver a una invitación.
  - `/recuperar`: `resetPasswordForEmail` con `redirectTo` a `/nueva-contrasena` (correo vía Gmail SMTP ya configurado).
  - `/nueva-contrasena`: `updateUser({ password })` y a Inicio.
  - `/bienvenida`: si el usuario no pertenece a ningún hogar. Nombre, emoji y zona horaria (`America/Costa_Rica` por defecto) → RPC `create_household` → crea una lista inicial ("Casa", 🏠) → Inicio.
- Perfil: trigger `on auth.users insert` crea `profiles` con `display_name` = `raw_user_meta_data->>'display_name'` o la parte local del correo (recortada a 40).
- Ajustes → sección **Cuenta**: nombre y emoji editables (`update profiles`), **Cerrar sesión** (borra `lukas-cache-<userId>`).
- Con varios hogares se abre el primero por `joined_at`.

## 2. Invitaciones de hogar

- Ajustes → sección **Hogar**: miembros (emoji, nombre, rol). Si eres admin: **Invitar a alguien** y la lista de pendientes con **Revocar** (`update invitations set revoked_at`).
- Crear: Server Action `createInvitation(householdId)` genera 32 bytes aleatorios (base64url), guarda `sha256` en `invitations` (kind `household`, role `member`, vence a los 7 días) con el cliente del usuario (RLS exige admin) y devuelve `/invitacion/<token>`. Se comparte con `navigator.share` o se copia.
- `/invitacion/[token]` (Server Component): hashea el token y lee la invitación con la service key; muestra "**{invitó}** te invitó a **{emoji} {hogar}**". Si venció, se usó o fue revocada: pantalla "Esta invitación ya no sirve".
  - **Sin sesión:** formulario nombre, correo, contraseña (mín. 8) → Server Action `joinWithInvitation`:
    1. vuelve a validar el token;
    2. `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name } })`;
    3. `signInWithPassword` con el cliente de servidor (pone cookies);
    4. RPC `accept_invitation(hash)`;
    5. si 4 falla, `auth.admin.deleteUser` y error.
    Si el correo ya existe: "Ya tienes cuenta: entra para unirte" → `/entrar?next=/invitacion/<token>`.
  - **Con sesión:** botón **Unirme a {hogar}** → `accept_invitation`.
  - Tras unirse: Inicio, con el texto "Si instalas la app, entra una vez con tu correo y contraseña".

## 3. Datos y sincronización

- `src/lib/supabase/mapping.ts` (puro, probado): filas ⇄ tipos de `src/lib/types.ts`.
  - `schedule_type` + `schedule` jsonb + `anchor` ⇄ `Schedule` (`interval` lleva `anchor`; jsonb en snake_case: `{every,unit}`, `{weekdays,every_weeks}`, `{day,every_months}`, `{date}`).
  - `due_time` `HH:mm:ss` ⇄ `"HH:mm"`; `color` NULL ⇄ `"none"`; `list_id` NULL → primera lista.
  - `assignment_mode` + `current_assignee_id` + `task_rotation` ⇄ `Assignment`.
  - `task_events` (`done`/`skipped`/`snoozed`, últimos 20 por tarea) → `history`, con `prev` desde `prev_*` y `undone` desde `undone_at`. La etiqueta de posponer se deriva de `snoozed_until`.
- `src/lib/supabase/snapshot.ts`: `loadSnapshot(client, userId)` → `AppState` (hogar, miembros + perfiles, listas, tareas, rotaciones, eventos, pendientes). Filtra `deleted_at is null` explícitamente: las políticas dejan a los admins leer lo borrado (Papelera).
- `src/lib/store.ts` pasa a ser caché de esa foto: mismo `useAppState`/`useNow` para los componentes; `localStorage` con llave `lukas-cache-<userId>` para abrir sin red.
- Escritura (`src/lib/sync.ts`): cada verbo aplica primero la función pura de `tasks.ts` (optimista) y encola la llamada; la cola es **en serie**.

  | Acción | Llamada |
  |---|---|
  | Hecha / La hizo alguien más | `complete_task(id, expected_due, next_due, credited_to)` |
  | Saltar | `skip_task(id, expected_due, next_due)` |
  | Posponer | `snooze_task(id, until)` |
  | Deshacer | `undo_last_event(id)` |
  | Borrar / deshacer borrado | `delete_task` / `restore_task` |
  | Crear / editar tarea | `insert` / `update` en `tasks` + reemplazo de `task_rotation` |
  | Pendientes | `insert` / `update` en `household_todos`; `delete_todo` / `restore_todo` |

- Ids nuevos con `crypto.randomUUID()` (reemplaza `newId` para tareas y pendientes).
- Refresco: al montar, en `visibilitychange` a visible, cada minuto (reloj compartido) y cuando la cola se vacía. Con la cola ocupada, la foto entrante se descarta.
- Sin conexión: la acción se revierte (se vuelve a la última foto del servidor) y toast "Sin conexión: no se guardó".
- Push: `PushCard` guarda la suscripción en `push_subscriptions` (upsert por `endpoint`, con `user_id`) al activar y la borra al desactivar.
- Limpieza: `demo-seed.ts` solo para pruebas; fuera "Restablecer demo" y la llave `lukas-demo-v1`.

### Migración nueva `supabase/migrations/20261013000000_accounts.sql`
- Trigger `handle_new_user` en `auth.users` → `profiles`.
- `restore_todo(p_todo uuid)` (SECURITY DEFINER, valida membresía), con `grant execute` a `authenticated`.
- Sin cambios de políticas: `accept_invitation` es SECURITY DEFINER, la página de invitación lee con la service key y `invitations_insert/update` ya exigen admin.

## 4. Errores

| Caso | Qué ve la persona |
|---|---|
| `already_done` (local o del servidor) | "Ya estaba hecha 👍" y se recarga |
| `task_not_found` / `forbidden` | "Esa tarea ya no existe" y se recarga |
| Red o error inesperado | Se revierte y "No se pudo guardar. Intenta otra vez" |
| Sesión vencida | Redirección a `/entrar` |
| Login fallido | "Correo o contraseña incorrectos" |
| Invitación inválida / correo ya registrado | Ver sección 2 |

## 5. Pruebas

- Vitest: `mapping.ts` (ida y vuelta de cada programación, color, responsables, rotación, eventos), cola de `sync.ts` (orden, reversión, no pisar con foto entrante; cliente de Supabase simulado), hash del token.
- SQL (`bash supabase/tests/run.sh`): trigger de perfil, `restore_todo` solo para miembros, `create_household` → invitación → `accept_invitation`.
- Manual en iPhone: entrar → crear hogar → crear tarea → invitar → la otra persona se une y completa → se ve al volver a la app → llega el push a la hora.
- Antes de cada commit: `npm test && npm run typecheck && npm run lint && npm run build` y `bash supabase/tests/run.sh`.

## 6. Despliegue

- Correr la migración nueva en el SQL Editor.
- `docs/DEPLOY.md`: crear la primera cuenta (Add user + auto confirm), marcar super admin, entrar y crear el hogar.
- Sin variables nuevas en Vercel.
- `README.md`: actualizar la tabla de estado.
