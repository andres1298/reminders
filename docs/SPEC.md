# Spec — App de tareas recurrentes del hogar

> **Estado:** Borrador v0.1 · **Fecha:** 2026-10-10
> Este documento es una primera versión basada en la idea inicial. Las decisiones marcadas con **[SUPUESTO]** son propuestas que deben confirmarse; las preguntas pendientes están en la sección 14.

---

## 1. Visión

Una web app minimalista para que un hogar (p. ej. Andrés y Mari) lleve control de **cada cuánto se hace cada tarea** y **a quién le toca**. No es un calendario de eventos: cada tarea es un "widget" con un anillo de progreso que se va llenando a medida que se acerca la fecha en que toca hacerla de nuevo. Al marcarla como hecha, el anillo se reinicia.

Inspiración visual: app *Mindr* (tarjetas con emoji dentro de un anillo, "due in 4d", estado vacío "Nada que hacer 🙌").

Estilo: **herbal** — tonos verdes salvia, crema, tierra; ilustraciones sutiles de plantas y gatitos; mucho espacio en blanco; modo claro y oscuro.

### 1.1 Objetivos
- Crear una tarea en menos de 10 segundos.
- Ver de un vistazo qué está vencido, qué viene pronto y a quién le toca.
- Marcar una tarea como hecha con un toque.
- Consumir el estado desde un widget de iPhone vía Scriptable.
- Recibir recordatorios cuando algo vence.

### 1.2 Fuera de alcance (v1)
- Calendario con vista de eventos/horas.
- Subtareas / checklists dentro de una tarea. **[SUPUESTO]**
- App nativa iOS/Android (se usa PWA + Scriptable).
- Gamificación / puntos. **[SUPUESTO]**

---

## 2. Glosario

| Término | Definición |
|---|---|
| **Hogar (Household)** | Espacio compartido con sus miembros, listas y tareas. Un usuario puede pertenecer a varios. |
| **Lista** | Agrupación personalizada de tareas dentro de un hogar (p. ej. "Limpieza", "Michi 🐱", "Pagos"). |
| **Tarea** | Algo que se repite (o no) con un emoji, nombre, descripción, programación y responsable. |
| **Programación (Schedule)** | Regla que define cuándo vence la tarea. |
| **Completado (Completion)** | Registro de que alguien hizo la tarea en un momento dado. |
| **Ocurrencia** | Cada vencimiento concreto calculado a partir de la programación. |

---

## 3. Roles y permisos

| Acción | Super admin | Admin del hogar | Miembro |
|---|:-:|:-:|:-:|
| Ver todos los hogares de la plataforma | ✅ | ❌ | ❌ |
| Desactivar usuarios / hogares | ✅ | ❌ | ❌ |
| Crear un hogar (queda como admin) | ✅ | ✅ | ✅ |
| Editar nombre/emoji/zona horaria del hogar | ✅ | ✅ | ❌ |
| Invitar / expulsar miembros, cambiar roles | ✅ | ✅ | ❌ |
| Crear / editar / borrar listas | ✅ | ✅ | **[SUPUESTO]** ✅ |
| Crear / editar / archivar tareas | ✅ | ✅ | **[SUPUESTO]** ✅ |
| Marcar tareas como hechas / posponer | ✅ | ✅ | ✅ |
| Gestionar sus propias notificaciones y tokens de widget | ✅ | ✅ | ✅ |

- Un hogar debe tener **al menos un admin** siempre.
- El super admin se define por flag en `profiles.is_super_admin` (no se asigna desde la UI). **[SUPUESTO]**

---

## 4. Funcionalidades

### 4.1 Autenticación
- Supabase Auth con **magic link por email** y **Google OAuth**. **[SUPUESTO]**
- Perfil: nombre visible, avatar (emoji o foto), idioma preferido, tema preferido.

### 4.2 Hogares
- Crear hogar: nombre, emoji (🏡 por defecto), zona horaria (por defecto la del navegador).
- Invitar miembros mediante **enlace de invitación** (expira en 7 días, uso único) o por email.
- Cambiar entre hogares desde un selector en el header.
- Salir de un hogar; el último admin no puede salir sin transferir el rol.

### 4.3 Listas
- Nombre + emoji + color de acento opcional.
- Orden manual (drag & drop).
- Vista "Todas" que agrupa todas las tareas del hogar.

### 4.4 Tareas

Campos:

| Campo | Tipo | Obligatorio | Notas |
|---|---|:-:|---|
| Emoji | string (1 grafema) | ✅ | Cualquier emoji; picker con búsqueda + sugerencias según el título. |
| Nombre | texto ≤ 60 | ✅ | |
| Descripción | texto ≤ 500 | ❌ | Markdown simple. |
| Lista | ref | ❌ | Si no tiene, va a "Sin lista". |
| Programación | ver 4.5 | ✅ | |
| Responsable | ver 4.6 | ❌ | |
| Recordatorio | ver 4.8 | ❌ | Hora y anticipación. |
| Notas privadas / costo | — | ❌ | **[PREGUNTA]** ¿Hace falta registrar costo (p. ej. alquiler, desparasitante)? |

Acciones sobre una tarea:
- **Hecha ✅** — registra un completado (quién, cuándo, nota opcional) y recalcula el próximo vencimiento.
- **Posponer** — mueve el próximo vencimiento (+1 día, +3 días, fecha a elegir) sin registrar completado.
- **Saltar esta vez** — avanza a la siguiente ocurrencia sin completado.
- **Deshacer** último completado (toast de 5 s y en el historial).
- **Archivar** / **Borrar**.
- **Historial** — lista de completados con quién la hizo.

### 4.5 Tipos de programación

| Tipo | Ejemplo | Parámetros |
|---|---|---|
| **Intervalo** | "Cada 2 semanas", "Cada mes comprar desparasitante" | `every` (n), `unit` (día/semana/mes/año), `anchor`: desde **última vez hecha** o desde **fecha programada** |
| **Días de la semana** | "Martes y jueves sacar la basura", "Jueves barrer" | `weekdays[]`, cada *n* semanas (default 1) |
| **Día del mes** | "El 3 de cada mes pagar el apartamento" | `day_of_month` (1–31, o "último día"), cada *n* meses |
| **Una vez** | "Llevar la gata al veterinario el 20/10" | `due_at` |

Reglas:
- Cada programación tiene **fecha de inicio**, **hora opcional** (si no hay hora, vence al final del día en la zona horaria del hogar) y **fecha fin opcional**.
- "Día del mes" con día 31 en meses cortos → se usa el último día del mes.
- Intervalo anclado a **última vez hecha**: el próximo vencimiento = `último completado + intervalo` (comportamiento de Mindr "Repeating from: last completion").
- Intervalo anclado a **fecha programada**: no se desplaza si se hace tarde.
- Días de la semana / día del mes: completar una ocurrencia vencida la cierra; si se acumularon varias ocurrencias vencidas **[SUPUESTO]** se muestran como una sola ("vencida hace 5 días") y al completarla se salta a la siguiente futura.

### 4.6 Responsables

| Modo | Comportamiento |
|---|---|
| **Cualquiera** | Nadie asignado; cualquiera la completa. |
| **Fijo** | Siempre la misma persona. |
| **Rotación** | Lista ordenada de miembros; tras cada completado le toca al siguiente. |

- **[SUPUESTO]** Cualquier miembro puede completar una tarea aunque no sea el responsable; en rotación, avanza igual al siguiente de la lista tras el responsable actual.

### 4.7 Estado visual (anillo)

`progreso = (ahora − inicio_del_ciclo) / (vencimiento − inicio_del_ciclo)`, limitado a [0, 1].

| Estado | Condición | Color |
|---|---|---|
| Al día | progreso < 0.75 | verde salvia |
| Pronto | 0.75 ≤ progreso < 1 o vence hoy | ámbar suave |
| Vencida | ahora > vencimiento | terracota, anillo completo + badge "hace X días" |
| Hecha hoy | completada en el día | anillo vacío + ✓ breve |

Texto bajo el título: "toca en 4d", "toca hoy", "vencida hace 2d", "le toca a Mari".

### 4.8 Notificaciones
Canales propuestos (cada usuario elige):
1. **Web Push (PWA)** — funciona en iPhone si la app se agrega a la pantalla de inicio (iOS ≥ 16.4).
2. **Email** — resumen diario (vía Resend). **[SUPUESTO]**
3. **[PREGUNTA]** ¿Telegram / WhatsApp?

Tipos:
- Recordatorio al responsable cuando la tarea vence (a la hora definida o a una hora por defecto, p. ej. 9:00).
- Recordatorio anticipado opcional (1 día antes, etc.).
- Resumen diario: "Hoy toca: 🧹 Barrer, 🗑️ Basura".
- Aviso de tarea vencida hace N días (máx. 1 por día por tarea).
- **[SUPUESTO]** Aviso cuando alguien completa una tarea → desactivado por defecto.
- Horas de silencio por usuario.

Implementación: `pg_cron` en Supabase cada 5–15 min invoca una Edge Function que calcula vencimientos y envía notificaciones; tabla `notification_log` evita duplicados.

### 4.9 Integración Scriptable (widgets iPhone)
- Cada usuario genera **tokens de API personales** (nombre, scope solo lectura o lectura+completar, revocables). Se guardan como hash.
- Endpoints REST versionados (sección 7).
- Repositorio incluye `scriptable/widget.js` listo para copiar, con tamaños small / medium / large:
  - **Small:** próxima tarea con anillo + emoji.
  - **Medium:** 4 tareas (las más urgentes) en grid de anillos.
  - **Large:** hasta 8–12 tareas o lista filtrada.
- Parámetros del widget (vía `args.widgetParameter`): `household`, `list`, `assignee=me`, `theme`.
- Tocar el widget abre la web app en la tarea / lista.
- Cache local en Scriptable para mostrar último estado sin conexión.

### 4.10 Internacionalización
- Español (default) e Inglés con `next-intl`.
- Detección por `Accept-Language`, preferencia guardada en el perfil.
- Fechas/pluralización con `Intl` ("toca en 1 día" / "toca en 3 días").
- Contenido creado por el usuario (nombres de tareas) **no** se traduce.

### 4.11 Tema
- Claro / Oscuro / Sistema con `next-themes`; preferencia guardada en el perfil.

---

## 5. UX / UI

Principios: **una acción principal por pantalla**, sin menús profundos, gestos simples, tipografía redondeada, microanimaciones suaves.

### 5.1 Pantallas
1. **Inicio (hogar actual)** — saludo + estado ("Nada pendiente 🙌🌿" o "3 tareas para hoy"), chips de listas, grid de tarjetas-anillo ordenadas por urgencia. Botón `+` flotante.
2. **Crear/editar tarea** (bottom sheet) — emoji grande arriba, nombre, segmented control *Intervalo / Días / Día del mes / Una vez*, responsable, recordatorio, botón verde "Guardar".
3. **Detalle de tarea** — anillo grande, "Marcar como hecha", próximo vencimiento, historial.
4. **Hogar** — miembros, invitaciones, listas.
5. **Ajustes** — perfil, idioma, tema, notificaciones, tokens de widget (con instrucciones de Scriptable).
6. **Super admin** — tabla de usuarios y hogares, métricas básicas.
7. **Onboarding** — crear o unirse a un hogar + 3 plantillas sugeridas.

### 5.2 Interacciones clave
- Tocar el anillo → menú rápido (Hecha / Posponer / Saltar). **[SUPUESTO]** Mantener presionado = Hecha directo.
- Filtro rápido "Mías" / "Todas".
- Estado vacío con ilustración (gatito durmiendo junto a una planta).

### 5.3 Sistema visual (propuesta)

| Token | Claro | Oscuro |
|---|---|---|
| Fondo | `#F6F3EC` crema | `#161A16` verde casi negro |
| Superficie | `#FFFFFF` | `#1F2520` |
| Primario (salvia) | `#7FA37A` | `#8FBF88` |
| Pronto (ámbar) | `#E3B565` | `#E8C27A` |
| Vencido (terracota) | `#C9735A` | `#E08C70` |
| Texto | `#2E3A2F` | `#E8EDE6` |

Tipografía sugerida: *Nunito* o *Quicksand*. Íconos: Lucide. Ilustraciones: SVG de línea fina (hojas, macetas, gatitos).

---

## 6. Modelo de datos (Supabase / Postgres)

```text
profiles            (id PK = auth.users.id, display_name, avatar_emoji, avatar_url,
                     locale, theme, timezone, is_super_admin, created_at)

households          (id, name, emoji, timezone, created_by, created_at)

household_members   (household_id, user_id, role ENUM('admin','member'),
                     joined_at, PK(household_id, user_id))

invitations         (id, household_id, token_hash, email NULL, role,
                     invited_by, expires_at, accepted_by NULL, accepted_at NULL)

lists               (id, household_id, name, emoji, color, position, created_at)

tasks               (id, household_id, list_id NULL, emoji, title, description,
                     schedule_type ENUM('interval','weekly','monthly','once'),
                     schedule JSONB,          -- parámetros según tipo
                     anchor ENUM('completion','schedule'),
                     starts_at, due_time NULL, ends_at NULL,
                     assignment_mode ENUM('anyone','fixed','rotation'),
                     current_assignee_id NULL,
                     next_due_at,             -- desnormalizado para ordenar/consultar
                     cycle_started_at,
                     remind_before_minutes NULL,
                     archived_at NULL, created_by, created_at, updated_at)

task_rotation       (task_id, user_id, position, PK(task_id, user_id))

task_completions    (id, task_id, completed_by, completed_at, note,
                     kind ENUM('done','skipped','snoozed'), due_at_snapshot)

api_tokens          (id, user_id, name, token_hash, scopes TEXT[],
                     last_used_at, created_at, revoked_at)

push_subscriptions  (id, user_id, endpoint, p256dh, auth, user_agent, created_at)

notification_prefs  (user_id, push_enabled, email_enabled, daily_digest_time,
                     quiet_start, quiet_end)

notification_log    (id, user_id, task_id, kind, due_at, sent_at,
                     UNIQUE(user_id, task_id, kind, due_at))
```

### 6.1 Seguridad (RLS)
- Todas las tablas de hogar: lectura si `auth.uid()` es miembro del hogar.
- Escritura sobre hogar/miembros/invitaciones: solo admins.
- `api_tokens`, `push_subscriptions`, `notification_prefs`: solo el propio usuario.
- Super admin: políticas adicionales vía función `is_super_admin()`.
- Lógica de recálculo de `next_due_at` en función SQL `complete_task(task_id, note)` (SECURITY DEFINER) para que sea atómica.

---

## 7. API pública (Scriptable)

Autenticación: `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/me` | Usuario y hogares. |
| GET | `/api/v1/households/:id/tasks?list=&assignee=me&limit=` | Tareas ordenadas por urgencia con `progress`, `status`, `next_due_at`, `assignee`. |
| POST | `/api/v1/tasks/:id/complete` | Marcar hecha (requiere scope `tasks:complete`). |

Ejemplo de respuesta:

```json
{
  "household": { "id": "…", "name": "Casa", "emoji": "🏡" },
  "generated_at": "2026-10-10T18:00:00Z",
  "tasks": [
    {
      "id": "…", "emoji": "🌱", "title": "Regar plantas",
      "status": "soon", "progress": 0.86,
      "next_due_at": "2026-10-11T23:59:59-06:00",
      "due_label": "toca en 1 día",
      "assignee": { "name": "Mari", "emoji": "🌸" },
      "url": "https://…/t/…"
    }
  ]
}
```

Rate limit: 60 req/min por token.

---

## 8. Arquitectura técnica

| Capa | Elección |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions), TypeScript |
| UI | Tailwind CSS + shadcn/ui, Framer Motion para microanimaciones |
| Datos | Supabase (Postgres, Auth, RLS, Edge Functions, pg_cron) + `@supabase/ssr` |
| Validación | Zod |
| i18n | next-intl |
| Tema | next-themes |
| Fechas | date-fns + date-fns-tz (toda la lógica de recurrencia en zona del hogar) |
| Emoji picker | `frimousse` o `emoji-mart` |
| Push | Web Push (VAPID) + Service Worker; PWA manifest |
| Email | Resend **[SUPUESTO]** |
| Hosting | Vercel **[SUPUESTO]** |
| Tests | Vitest (lógica de recurrencia), Playwright (flujos clave) |

---

## 9. Requisitos no funcionales
- Mobile-first; usable a 360 px de ancho. Lighthouse ≥ 90 en PWA y accesibilidad.
- Accesibilidad: contraste AA en ambos temas; el estado del anillo no depende solo del color (texto + ícono).
- Tiempos: carga inicial < 2 s en 4G.
- Privacidad: tokens hasheados; sin analítica de terceros **[SUPUESTO]**.
- Costos: dentro de los planes gratuitos de Supabase y Vercel para uso familiar.

---

## 10. Plantillas sugeridas (onboarding)
- 🧹 Barrer — todos los jueves
- 🗑️ Sacar la basura — martes y jueves
- 🏠 Pagar apartamento — día 3 de cada mes
- 🐱 Desparasitante de la gata — cada mes desde la última vez
- 🌱 Regar plantas — cada 3 días desde la última vez
- 🛏️ Cambiar sábanas — cada 2 semanas

---

## 11. Criterios de aceptación (ejemplos)
- **Dado** una tarea "Basura" martes y jueves, **cuando** la completo el martes, **entonces** el próximo vencimiento es el jueves y el anillo se reinicia.
- **Dado** "Desparasitante" cada 1 mes desde la última vez, **cuando** la completo el 15/10 aunque vencía el 10/10, **entonces** el próximo vencimiento es el 15/11.
- **Dado** "Pagar apto" el día 3 anclado a fecha, **cuando** la completo el 5, **entonces** el próximo vencimiento sigue siendo el 3 del siguiente mes.
- **Dado** una rotación [Andrés, Mari], **cuando** Andrés completa, **entonces** el responsable pasa a Mari.
- **Dado** un token de solo lectura, **cuando** llamo `POST /complete`, **entonces** recibo 403.
- **Dado** un miembro (no admin), **cuando** intenta invitar a alguien, **entonces** la acción no está disponible y la API responde 403.

---

## 12. Fases

| Fase | Contenido |
|---|---|
| **MVP** | Auth, hogar único + invitación, listas, tareas con 4 tipos de programación, completar/posponer, anillos, tema, i18n, API + script de Scriptable. |
| **v1.1** | Rotación, notificaciones push + resumen por email, historial, roles completos, multi-hogar. |
| **v1.2** | Panel super admin, estadísticas ("quién hizo más"), sugerencia de emoji con IA, PWA offline. |

---

## 13. Riesgos
- Web Push en iOS requiere instalar la PWA; si no, solo email/Scriptable.
- Los widgets de Scriptable se refrescan a discreción de iOS (no en tiempo real).
- Zonas horarias y DST en el cálculo de recurrencias → cubrir con tests.

---

## 14. Preguntas abiertas

Las respuestas se incorporarán en la v0.2 de este documento.

**Uso y alcance**
1. ¿Será solo para su hogar (y algunos amigos/familia) o planean abrirla al público? Esto define si el super admin, límites y onboarding importan desde el MVP.
2. ¿Alguna tarea necesita registrar **monto/costo** (alquiler, desparasitante) o adjuntos (foto del recibo)?
3. ¿Necesitan **subtareas/checklist** (p. ej. "Limpieza profunda": baño, cocina…)?
4. ¿Quieren **estadísticas** (quién hizo más, rachas) o algo de gamificación?

**Programación y responsables**
5. ¿Las tareas tienen **hora** (sacar basura antes de las 7 pm) o basta con el día?
6. Si una tarea de "martes y jueves" se quedó sin hacer el martes, el jueves ¿debe verse como 1 pendiente o 2 acumuladas?
7. ¿Necesitan **rotación** de responsables (esta semana Andrés, la próxima Mari) o basta con responsable fijo / cualquiera?
8. ¿Un miembro puede completar una tarea asignada a otro? ¿Quieren ver "la hizo Mari aunque le tocaba a Andrés"?
9. ¿Los miembros (no admin) pueden crear y editar tareas, o solo completarlas?

**Notificaciones**
10. ¿Qué canal usarían de verdad: push en el iPhone (requiere instalar la PWA), email, Telegram o WhatsApp?
11. ¿Prefieren una notificación por tarea o un **resumen diario** a una hora fija? ¿A qué hora?
12. ¿Insistir si una tarea sigue vencida (cada día) o avisar solo una vez?

**Widget / Scriptable**
13. ¿Qué tamaños de widget usarán (pequeño, mediano, grande, pantalla de bloqueo)?
14. ¿Quieren **marcar como hecha desde el widget** (abre una URL/atajo) o solo visualizar?

**Cuentas, estilo y despliegue**
15. ¿Login con magic link por email, Google, Apple, o usuario/contraseña?
16. ¿Las ilustraciones de plantas y gatitos: hay que crearlas (SVG simples) o tienen referencias/una gata en particular que quieran retratar (nombre de la gata)?
17. ¿Zona horaria del hogar (asumo America/Costa_Rica)?
18. ¿Hosting en Vercel + Supabase plan gratuito está bien? ¿Tienen dominio?
19. ¿Nombre de la app?
