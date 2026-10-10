# Lukas — Spec

> **Estado:** Borrador v0.2 · **Fecha:** 2026-10-10
> v0.2 incorpora las respuestas de la ronda 1 de preguntas. Lo marcado **[SUPUESTO]** es una propuesta por confirmar; las preguntas abiertas están en la sección 15.

---

## 1. Visión

**Lukas** es una web app mobile-first para que un hogar lleve control de **cada cuánto se hace cada tarea** y **a quién le toca**. No es un calendario de eventos: cada tarea es una tarjeta "widget" con un anillo de progreso que se llena a medida que se acerca el momento de hacerla de nuevo. Al marcarla como hecha, el anillo se reinicia.

El nombre y la mascota vienen de **Lukas**, la gata calicó de la casa (blanca con manchas negras y canela, ojos verde-amarillo). Ver `docs/design/refs/lukas.jpg`.

Usuarios: Andrés, Mari y algunos conocidos que crean sus propios hogares. No es un producto público a gran escala.

### 1.1 Objetivos
- Crear una tarea en menos de 10 segundos.
- Ver de un vistazo qué está vencido, qué toca pronto y a quién le toca.
- Marcar como hecha con un toque.
- Ver el estado en widgets de iPhone (Scriptable).
- Recibir recordatorios por **Telegram**.
- Ver estadísticas de cuántas tareas hizo cada persona del hogar.

### 1.2 Fuera de alcance
- Calendario con vista de eventos por hora.
- Subtareas / checklists.
- Montos, costos, adjuntos o recibos.
- Gamificación (puntos, rachas, premios).
- Notificaciones push web y por email (solo Telegram; el email se usa únicamente para autenticación).
- Widget de pantalla de bloqueo y completar tareas desde el widget.
- App nativa.

---

## 2. Glosario

| Término | Definición |
|---|---|
| **Hogar** | Espacio compartido con sus miembros, listas y tareas. Un usuario puede pertenecer a varios. |
| **Lista** | Agrupación de tareas dentro de un hogar ("Limpieza", "Lukas 🐱", "Pagos"). |
| **Tarea** | Algo que se repite (o no), con emoji, nombre, descripción, programación con hora y responsable. |
| **Programación** | Regla que define cuándo vence la tarea. |
| **Completado** | Registro de que alguien hizo la tarea en un momento dado. |
| **Ciclo** | Periodo entre el último completado (o inicio) y el próximo vencimiento. |

---

## 3. Roles y permisos

| Acción | Super admin | Admin del hogar | Miembro |
|---|:-:|:-:|:-:|
| Ver todos los usuarios, hogares y estadísticas globales | ✅ | ❌ | ❌ |
| Desactivar usuarios / hogares | ✅ | ❌ | ❌ |
| Crear un hogar (queda como admin) | ✅ | ✅ | ✅ |
| Editar nombre, emoji y zona horaria del hogar | ✅ | ✅ | ❌ |
| Invitar / expulsar miembros, cambiar roles | ✅ | ✅ | ❌ |
| Crear / editar / ordenar / borrar listas | ✅ | ✅ | ✅ |
| Crear / editar / archivar tareas | ✅ | ✅ | ✅ |
| Borrar tareas definitivamente | ✅ | ✅ | ❌ **[SUPUESTO]** |
| Completar, posponer o saltar cualquier tarea (aunque no sea suya) | ✅ | ✅ | ✅ |
| Ver estadísticas de su hogar | ✅ | ✅ | ✅ |
| Gestionar su perfil, Telegram y tokens de widget | ✅ | ✅ | ✅ |

Reglas:
- Un usuario **solo ve los hogares de los que es miembro**. Solo el super admin ve datos de otros hogares.
- Todo hogar debe tener al menos un admin; el último admin no puede salir sin transferir el rol.
- El super admin se marca con `profiles.is_super_admin` directamente en la base de datos (no desde la UI).

---

## 4. Funcionalidades

### 4.1 Autenticación (Supabase Auth)
- **Link mágico** por email.
- **Email + contraseña** (registro, login, recuperar contraseña).
- Perfil: nombre visible, avatar (emoji o foto), idioma, tema.
- Registro abierto; quien se registra sin invitación entra al onboarding para crear su hogar. **[SUPUESTO]** (alternativa: registro solo por invitación, ver pregunta 1).

### 4.2 Hogares
- Crear hogar: nombre, emoji (🏡), zona horaria (por defecto `America/Costa_Rica`).
- Invitar con **enlace de invitación** (uso único, expira en 7 días) que se comparte por Telegram/WhatsApp. Al abrirlo: registrarse o iniciar sesión → unirse.
- Selector de hogar en el header cuando el usuario pertenece a más de uno.

### 4.3 Listas
- Nombre, emoji y color (de la paleta de la app).
- Orden manual (arrastrar).
- Vista "Todas" con todas las tareas del hogar.

### 4.4 Tareas

| Campo | Tipo | Obligatorio | Notas |
|---|---|:-:|---|
| Emoji | 1 grafema | ✅ | Cualquier emoji. Picker con búsqueda y sugerencias por palabra clave del nombre. |
| Nombre | texto ≤ 60 | ✅ | |
| Descripción | texto ≤ 500 | ❌ | Texto plano con saltos de línea. |
| Lista | ref | ❌ | Sin lista → "General". |
| Programación | ver 4.5 | ✅ | |
| **Hora** | `HH:mm` | ✅ | Default 09:00. Es la hora a la que vence y se notifica. |
| Responsable | ver 4.6 | ✅ | Default "Cualquiera". |

Acciones:
- **Hecha ✅** — registra completado (quién, cuándo), recalcula el próximo vencimiento y, si hay rotación, pasa el turno.
- **Posponer** — +1 h, +1 día, +3 días o fecha/hora a elegir. No registra completado.
- **Saltar esta vez** — avanza a la siguiente ocurrencia sin completado.
- **Deshacer** — toast de 5 s tras completar/saltar, y desde el historial.
- **Editar**, **Archivar**, **Borrar** (solo admin).
- **Historial** — completados con quién y cuándo.

### 4.5 Tipos de programación

| Tipo | Ejemplo | Parámetros |
|---|---|---|
| **Intervalo** | "Cada 3 días regar plantas", "Cada mes comprar desparasitante para Lukas" | `every` (n), `unit` (día/semana/mes), `anchor`: desde **última vez hecha** o desde **fecha programada** |
| **Días de la semana** | "Martes y jueves sacar la basura 19:00", "Jueves barrer" | `weekdays[]`, cada *n* semanas (default 1) |
| **Día del mes** | "El 3 de cada mes pagar el apartamento" | `day_of_month` (1–31 o "último"), cada *n* meses |
| **Una vez** | "Vacuna de Lukas el 20/10 10:00" | fecha |

Reglas:
- Todo se calcula en la **zona horaria del hogar**.
- Día 29–31 en meses que no lo tienen → último día del mes.
- **Ocurrencias no acumulan**: si una tarea se venció y llega otra ocurrencia, se muestra **una sola pendiente** ("vencida hace 2 días"). Al completarla, el próximo vencimiento es la siguiente ocurrencia **futura**.
- Intervalo anclado a *última vez hecha*: próximo = `completado + intervalo` (a la hora definida).
- Intervalo anclado a *fecha programada*, días de semana y día del mes: no se desplazan si se hacen tarde.
- Tareas "Una vez" completadas se archivan solas.

### 4.6 Responsables

| Modo | Comportamiento |
|---|---|
| **Cualquiera** | Sin responsable; el aviso llega a todos los miembros. |
| **Fijo** | Siempre la misma persona. |
| **Rotación** (opcional) | Lista ordenada de miembros; tras cada completado le toca al siguiente. |

- Cualquiera puede completar cualquier tarea. El completado registra **quién la hizo**, y el historial lo muestra ("La hizo Mari · le tocaba a Andrés").
- En rotación, completar por otra persona igual pasa el turno al siguiente del responsable actual. **[SUPUESTO]**
- Las estadísticas cuentan a quien **la hizo**, no a quien le tocaba.

### 4.7 Estado visual (anillo)

`progreso = (ahora − inicio_del_ciclo) / (vencimiento − inicio_del_ciclo)`, limitado a [0, 1].

| Estado | Condición | Tarjeta | Texto |
|---|---|---|---|
| Al día | progreso < 0.75 | lima | "toca en 4d" |
| Pronto | ≥ 0.75 o vence hoy | mostaza | "hoy 19:00" |
| Vencida | ahora > vencimiento | coral | "vencida hace 2d" |
| Hecha | completada en el ciclo actual, mostrando la animación | crema | "✓ Mari, hace 1 min" |

El estado nunca depende solo del color: siempre hay texto y el anillo lleno/parcial.

### 4.8 Estadísticas
- Por hogar, visibles para todos sus miembros.
- Periodos: esta semana, este mes, últimos 3 meses, todo.
- Métricas:
  - **Tareas completadas por persona** (barra horizontal por miembro, con su avatar).
  - Completadas por lista, por persona.
  - Total completadas vs. vencidas sin hacer en el periodo. **[SUPUESTO]**
- Super admin: totales globales (usuarios, hogares, tareas activas, completados por día).

### 4.9 Notificaciones (Telegram)

**Vinculación:** Ajustes → "Conectar Telegram" → abre `https://t.me/<LukasBot>?start=<código de un solo uso>` → el bot recibe `/start <código>` en su webhook y guarda el `chat_id` del usuario. `/stop` en el bot o "Desconectar" en la app la desvincula.

**Tipos de mensaje:**

| Tipo | Cuándo | A quién |
|---|---|---|
| **Por tarea** | A la hora de vencimiento de la tarea | Responsable actual; si es "Cualquiera", a todos los miembros |
| **Resumen del día** | Al inicio del día (hora configurable por usuario, default 07:00) | Cada usuario: sus tareas del día + vencidas + "de cualquiera" |

- Se avisa **una sola vez** por ocurrencia (no hay recordatorios repetidos de vencidas). Posponer genera un nuevo aviso a la nueva hora.
- Cada usuario puede apagar el aviso por tarea o el resumen, y elegir horas de silencio. **[SUPUESTO]**
- El mensaje de Telegram está en el idioma del usuario e incluye un enlace a la tarea.
- **[PREGUNTA]** ¿Botón "✅ Hecha" en el mensaje de Telegram? (ver pregunta 6).

Ejemplos:

```
🗑️ Sacar la basura — toca ahora (19:00)
Le toca a: Andrés
Abrir en Lukas →
```

```
☀️ Buenos días, Mari. Hoy en Casa 🏡:
• 🧹 Barrer — 10:00
• 🗑️ Sacar la basura — 19:00 (Andrés)
⚠️ Vencida: 🐱 Desparasitante de Lukas (hace 2d)
```

**Implementación:** Supabase `pg_cron` cada minuto llama a una Edge Function (o ruta de Next) que busca tareas con `next_due_at` en la ventana y sin registro en `notification_log`, y envía con la Bot API (`sendMessage`). Otro job revisa cada 15 min qué usuarios llegaron a su hora de resumen.

### 4.10 Widgets (Scriptable)
- Cada usuario crea **tokens personales de solo lectura** (nombre, revocables, se guardan como hash).
- El repo incluye `scriptable/lukas-widget.js` con instrucciones paso a paso.
- Tamaños:
  - **Mediano — 4 espacios:** grid 4×1 o 2×2 con anillo + emoji + "toca en…".
  - **Grande — 8 espacios:** grid 4×2 con las 8 más urgentes.
- Parámetros del widget (`args.widgetParameter`, formato `clave=valor;…`): `household`, `list`, `mine=1`, `theme=dark|light|auto`.
- Mismo lenguaje visual que la app (colores, anillos, tipografía).
- Tocar el widget abre la app en el hogar/lista. No se puede completar desde el widget.
- Cache local en Scriptable para mostrar el último estado si no hay red.

### 4.11 Internacionalización
- Español (default) e inglés con `next-intl`. Preferencia en el perfil; fallback a `Accept-Language`.
- Fechas relativas y plurales con `Intl` ("toca en 1 día" / "due in 3 days").
- Mensajes de Telegram y widget también traducidos. El contenido del usuario no se traduce.

### 4.12 Tema
- Claro / Oscuro / Sistema con `next-themes`, guardado en el perfil.

---

## 5. Dirección visual

Referencias en `docs/design/refs/`:

| Archivo | Qué tomar |
|---|---|
| `ui-chunky-cards.jpg` | Tarjetas grandes de color sólido, esquinas muy redondeadas, botón pill "Create new task", tira de días, barra de navegación flotante tipo pill, avatares apilados. |
| `ink-illustration.png` | Estilo de ilustración: tinta negra tipo grabado/sello sobre crema, trazo grueso, humor tierno. |
| `mindr-grid.png`, `mindr-create.png` | Grid de anillos, formulario de creación en bottom sheet. |
| `lukas.jpg` | La mascota: gata calicó (blanco, negro, canela; ojos verde-amarillo). |

### 5.1 Principios
- **Chunky**: componentes grandes, táctiles (mínimo 48 px de alto, botones principales 56 px), bordes muy redondeados, tipografía pesada.
- **Mobile first**: diseño a 375 px; en escritorio se centra en una columna de máx. ~480 px (y grid de 2–3 columnas de tarjetas en ≥ 768 px).
- **Una acción principal por pantalla.**
- **Herbal + Lukas**: hojas, macetas y Lukas dibujados en tinta, nunca recargado.

### 5.2 Paleta (tokens Tailwind)

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `bg` | `#FBF6DC` crema | `#161616` | Fondo |
| `surface` | `#FFFFFF` | `#232323` | Contenedores, sheets |
| `surface-2` | `#F1EBCB` | `#2E2E2E` | Chips, inputs |
| `ink` | `#151515` | `#F5F1DC` | Texto, trazos de ilustración |
| `ink-muted` | `#5E5A48` | `#A8A496` | Texto secundario |
| `leaf` (lima) | `#C5D98A` | `#C5D98A` | Estado "al día", acento primario |
| `mustard` | `#F2CB66` | `#F2CB66` | Estado "pronto", CTA |
| `coral` | `#EE8F6E` | `#EE8F6E` | Estado "vencida" |
| `stone` | `#DAD8D1` | `#DAD8D1` | Tarjetas neutras / archivadas |
| `calico` | `#D9A25F` | `#D9A25F` | Acento Lukas (detalles, ilustraciones) |

- Las tarjetas de color usan texto `#151515` en ambos temas (como la referencia), garantizando contraste AA.
- En oscuro, el fondo es casi negro y las tarjetas mantienen sus colores pastel.

### 5.3 Tipografía
- Títulos: **Bricolage Grotesque** (700–800) — chunky, con carácter. **[SUPUESTO]**
- Texto/UI: **DM Sans** (400–600).
- Escala: 32 / 24 / 20 / 16 / 14.

### 5.4 Forma y profundidad
- Radios: tarjetas `28px`, botones/pills `9999px`, sheets `32px` arriba.
- Sin sombras difusas; profundidad con bloques de color y, en claro, un borde/sombra dura de `2px` en tinta en elementos interactivos principales (estilo sello). **[SUPUESTO]**
- Íconos: Phosphor (peso *bold/fill*) para combinar con lo chunky.

### 5.5 Ilustraciones (tinta, estilo grabado)
Set inicial de SVG monocromos (se tiñen con `ink`):

| Uso | Escena |
|---|---|
| Estado vacío "Nada pendiente 🙌" | Lukas dormida dentro de una maceta |
| Onboarding / login | Lukas montada sobre una hoja gigante como en `ink-illustration.png` |
| Hogar sin tareas | Lukas mirando una regadera |
| Error / 404 | Lukas tirando una maceta |
| Telegram conectado | Lukas con un sobre |
| Carga | Brote que crece (animado) |

**[PREGUNTA]** ¿Las dibujamos nosotros (SVG simples generados) o tienes un ilustrador / quieres generarlas con IA? (pregunta 8).

### 5.6 Movimiento y transiciones
Librería: **Motion** (`motion/react`) + **View Transitions API** para navegación entre rutas.

| Momento | Animación |
|---|---|
| Cambio de pantalla | Slide horizontal + fade (push/pop) en móvil; fade en escritorio. ~280 ms. |
| Tarjeta → detalle | *Shared element*: la tarjeta crece hasta convertirse en la pantalla de detalle (anillo y emoji conservan posición). |
| Abrir crear/editar | Bottom sheet con spring (`stiffness 400, damping 35`), arrastrable para cerrar. |
| Entrada de listas | Stagger de tarjetas (40 ms entre cada una), suben 12 px y aparecen. |
| Completar tarea | El anillo se cierra, la tarjeta hace "squash & stretch", confeti de hojitas 🍃 y la tarjeta se reordena con animación de layout. Vibración háptica (`navigator.vibrate`) donde exista. |
| Cambio de estado | Color de tarjeta interpola suavemente (200 ms). |
| Botones | Press: escala 0.96; release con spring. |
| Carga | Skeletons con forma de tarjeta (shimmer suave) usando `loading.tsx` + Suspense; brote animado en cargas largas. |
| Acciones optimistas | La UI cambia al instante (`useOptimistic`), revierte con toast si falla. |
| Tema claro/oscuro | Transición circular desde el botón (View Transitions). |

- Respetar `prefers-reduced-motion`: se reemplazan movimientos por fades cortos y se quita el confeti.
- Objetivo: 60 fps en iPhone; animar solo `transform` y `opacity`.

---

## 6. Pantallas

Navegación inferior flotante tipo pill (como la referencia): **Inicio · Listas · Estadísticas · Ajustes**. Botón pill mostaza "+ Nueva tarea" arriba.

1. **Inicio**
   - Header: "Hola, Andrés" + avatar + selector de hogar.
   - Resumen: "Hoy tocan 3" o "Nada pendiente 🙌" con ilustración.
   - **Tira de días** horizontal (hoy ± 7) como la referencia: filtrar lo que vence ese día. Por defecto "Todo".
   - Chips: Todas · Mías · por lista.
   - Grid de tarjetas chunky (2 columnas en móvil): color por estado, emoji en anillo, nombre, "toca en…", avatar del responsable, botón "…".
   - Orden: vencidas → pronto → al día.
2. **Detalle de tarea** — anillo grande, descripción, próximo vencimiento, responsable/rotación, botón gigante "Marcar como hecha", acciones secundarias, historial.
3. **Crear / editar tarea** (bottom sheet) — emoji grande tocable, nombre, segmented *Intervalo · Días · Día del mes · Una vez*, hora, responsable, lista, "Guardar" pill a todo el ancho.
4. **Listas** — tarjetas de listas con conteo y estado; crear/editar/ordenar.
5. **Estadísticas** — selector de periodo, barras por persona, desglose por lista.
6. **Ajustes** — perfil, idioma, tema, Telegram (conectar/estado/preferencias/hora del resumen), widgets (tokens + guía Scriptable), hogar (miembros, roles, invitar, salir).
7. **Onboarding** — crear hogar o unirse con enlace; elegir plantillas sugeridas; conectar Telegram (opcional).
8. **Auth** — login (link mágico / contraseña), registro, recuperar contraseña.
9. **Super admin** (`/admin`) — usuarios, hogares, métricas globales, desactivar.

---

## 7. Modelo de datos (Supabase / Postgres)

```text
profiles            (id PK = auth.users.id, display_name, avatar_emoji, avatar_url,
                     locale ('es'|'en'), theme ('light'|'dark'|'system'),
                     is_super_admin bool, disabled_at, created_at)

households          (id, name, emoji, timezone default 'America/Costa_Rica',
                     created_by, disabled_at, created_at)

household_members   (household_id, user_id, role ('admin'|'member'), joined_at,
                     PK(household_id, user_id))

invitations         (id, household_id, token_hash, role, invited_by,
                     expires_at, accepted_by, accepted_at)

lists               (id, household_id, name, emoji, color, position, created_at)

tasks               (id, household_id, list_id NULL, emoji, title, description,
                     schedule_type ('interval'|'weekly'|'monthly'|'once'),
                     schedule jsonb,        -- {every,unit} | {weekdays,every_weeks} | {day,every_months} | {date}
                     anchor ('completion'|'schedule'),
                     due_time time NOT NULL,
                     starts_on date, ends_on date NULL,
                     assignment_mode ('anyone'|'fixed'|'rotation'),
                     current_assignee_id NULL,
                     cycle_started_at timestamptz,
                     next_due_at timestamptz,   -- desnormalizado
                     archived_at, created_by, created_at, updated_at)

task_rotation       (task_id, user_id, position, PK(task_id, user_id))

task_events         (id, task_id, household_id, actor_id,
                     kind ('done'|'skipped'|'snoozed'|'undone'),
                     assignee_at_time, due_at_snapshot, snoozed_until, created_at)

api_tokens          (id, user_id, name, token_hash, last_used_at, created_at, revoked_at)

telegram_links      (user_id PK, chat_id bigint UNIQUE, username, linked_at)
telegram_link_codes (code_hash PK, user_id, expires_at, used_at)

notification_prefs  (user_id PK, per_task bool default true, daily_digest bool default true,
                     digest_time time default '07:00', quiet_start, quiet_end)

notification_log    (id, user_id, task_id NULL, kind ('due'|'digest'),
                     occurrence_key text, sent_at,
                     UNIQUE(user_id, kind, occurrence_key))
```

- `stats` se calcula con una vista/RPC `household_stats(household_id, from, to)` sobre `task_events` (kind = 'done').
- Funciones SQL atómicas (SECURITY DEFINER, validan membresía): `complete_task`, `skip_task`, `snooze_task`, `undo_last_event`, `accept_invitation`.
- La lógica de recurrencia vive en **TypeScript** (`lib/schedule.ts`, testeada) y se replica en SQL solo si hace falta para el cron; **[SUPUESTO]** el cron corre en una ruta de Next.js para compartir el mismo código.

### 7.1 Seguridad (RLS)
- Datos de hogar: lectura y escritura si `auth.uid()` es miembro; operaciones de miembros/invitaciones/borrado definitivo solo admins.
- `api_tokens`, `telegram_links`, `notification_prefs`: solo el dueño.
- Super admin: acceso de lectura global vía `is_super_admin()`.
- Usuarios u hogares desactivados no pueden leer ni escribir.

---

## 8. API para Scriptable

Autenticación: `Authorization: Bearer <token>` (solo lectura).

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/me` | Usuario, hogares y listas. |
| GET | `/api/v1/widget?household=&list=&mine=1&limit=8` | Tareas ordenadas por urgencia, listas para dibujar. |

```json
{
  "household": { "id": "…", "name": "Casa", "emoji": "🏡" },
  "generated_at": "2026-10-10T18:00:00Z",
  "locale": "es",
  "tasks": [
    {
      "id": "…", "emoji": "🌱", "title": "Regar plantas",
      "status": "soon", "progress": 0.86,
      "next_due_at": "2026-10-11T09:00:00-06:00",
      "due_label": "mañana 9:00",
      "assignee": { "name": "Mari", "emoji": "🌸" },
      "url": "https://lukas-….vercel.app/t/…"
    }
  ]
}
```

Rate limit: 60 req/min por token. Webhook de Telegram: `POST /api/telegram/webhook` validado con `X-Telegram-Bot-Api-Secret-Token`.

---

## 9. Arquitectura técnica

| Capa | Elección |
|---|---|
| Framework | Next.js (App Router, Server Components, Server Actions), TypeScript estricto |
| Estilos | **Tailwind CSS v4** con tokens de la sección 5 en `@theme`; `clsx` + `tailwind-merge` |
| Componentes | Propios (chunky); primitivas accesibles de Radix donde haga falta (dialog, popover, switch); `vaul` para bottom sheets |
| Animación | `motion` + View Transitions API |
| Datos | Supabase (Postgres, Auth, RLS, pg_cron) + `@supabase/ssr` |
| Validación | Zod |
| i18n | next-intl |
| Tema | next-themes |
| Fechas | date-fns + `@date-fns/tz` |
| Emoji | `frimousse` (picker liviano) |
| Telegram | Bot API vía `fetch` (sin SDK) |
| Hosting | Vercel (plan gratuito, subdominio `*.vercel.app`) + Supabase (plan gratuito) |
| Tests | Vitest (recurrencia, permisos), Playwright (flujos clave en viewport móvil) |
| PWA | Manifest + íconos para "Agregar a inicio" (sin push) |

### 9.1 Email de autenticación sin dominio
El SMTP por defecto de Supabase solo envía a miembros del equipo del proyecto y con límites muy bajos, así que **no sirve para invitar a conocidos**. Opciones:
1. **Gmail SMTP con contraseña de aplicación** como SMTP personalizado en Supabase (gratis, ~500 correos/día). **[SUPUESTO — recomendado]**
2. Comprar un dominio (~USD 10/año) y usar Resend.

El login con contraseña funciona igual, pero registro, link mágico y recuperación necesitan SMTP.

---

## 10. Requisitos no funcionales
- Usable desde 360 px. Lighthouse ≥ 90 en rendimiento, accesibilidad y buenas prácticas en móvil.
- Contraste AA en ambos temas; foco visible; navegación por teclado; `prefers-reduced-motion`.
- Carga inicial < 2 s en 4G; interacciones optimistas < 100 ms percibidos.
- Tokens y códigos guardados como hash; secretos solo en variables de entorno.
- Costo: USD 0 dentro de planes gratuitos.

---

## 11. Plantillas sugeridas (onboarding)
- 🧹 Barrer — jueves 10:00
- 🗑️ Sacar la basura — martes y jueves 19:00
- 🏠 Pagar apartamento — día 3 de cada mes 09:00
- 🐱 Desparasitante de Lukas — cada mes desde la última vez
- 🌱 Regar plantas — cada 3 días desde la última vez
- 🛏️ Cambiar sábanas — cada 2 semanas
- 🪣 Limpiar arenero — cada día 20:00

---

## 12. Criterios de aceptación
- **Basura martes y jueves 19:00:** al completarla el martes 20:00, el próximo vencimiento es jueves 19:00 y el anillo se reinicia.
- **No acumula:** si no se hizo el martes, el jueves 19:30 se ve **una** pendiente ("vencida"); al completarla, el próximo vencimiento es el martes siguiente.
- **Desparasitante cada mes desde la última vez:** vencía el 10/10, se completa el 15/10 → próximo 15/11 a la hora definida.
- **Apartamento día 3, anclado:** completado el 5 → próximo el día 3 del mes siguiente.
- **Día 31 en febrero** → vence el último día de febrero.
- **Rotación [Andrés, Mari]:** Andrés completa → responsable Mari. Mari completa una de Andrés → queda registrado que la hizo Mari y el turno pasa a Mari. **[SUPUESTO]**
- **Telegram:** a las 19:00 el responsable recibe un mensaje; no recibe otro de esa ocurrencia aunque siga vencida. Si la pospone a 20:00, recibe uno a las 20:00.
- **Resumen:** a las 07:00 (hora del usuario) recibe el resumen solo si tiene tareas ese día o vencidas. **[SUPUESTO]**
- **Aislamiento:** un usuario de otro hogar no puede leer tareas ni estadísticas de "Casa" (RLS devuelve vacío / 404).
- **Widget:** con token válido, `GET /api/v1/widget?limit=4` devuelve las 4 más urgentes; con token revocado → 401.
- **Miembro** puede crear tareas y listas, pero no ve la opción de invitar ni de borrar definitivamente.
- **Reduced motion:** con la preferencia activa no hay slide ni confeti.

---

## 13. Fases

| Fase | Contenido |
|---|---|
| **MVP** | Auth (link mágico + contraseña), hogares e invitaciones, roles, listas, tareas con 4 programaciones y hora, completar/posponer/saltar/deshacer, anillos y estados, tema claro/oscuro, ES/EN, sistema visual chunky con animaciones base. |
| **v1.0** | Telegram (vinculación, aviso por tarea, resumen diario), API + widget Scriptable (4 y 8), rotación, historial, estadísticas por persona, ilustraciones de Lukas, transiciones avanzadas (shared element, confeti). |
| **v1.1** | Panel super admin, PWA pulida, sugerencias de emoji mejoradas. |

---

## 14. Riesgos
- **Email sin dominio** (ver 9.1).
- **Cron en plan gratuito**: pg_cron funciona en Supabase free; si el proyecto se pausa por inactividad (7 días sin uso en plan free) se detienen las notificaciones. Mitigación: el propio cron y el widget generan actividad. **[SUPUESTO]**
- **Widgets de Scriptable** se refrescan cuando iOS decide (≈ cada 15–60 min); no son tiempo real.
- **Ilustraciones**: el estilo de tinta requiere trabajo de dibujo; sin ellas la app pierde mucha identidad.
- **View Transitions** en Safari: soportado desde iOS 18; fallback a animaciones de Motion.

---

## 15. Preguntas abiertas (ronda 2)

1. **Registro:** ¿cualquiera puede crear cuenta, o solo quien recibe una invitación (y el super admin habilita a quien quiera crear un hogar)?
2. **Hora por defecto:** ¿09:00 te parece bien como hora por defecto al crear una tarea?
3. **Rotación + completar por otro:** si a Andrés le tocaba y lo hizo Mari, ¿el siguiente turno es de Mari (avanza normal) o vuelve a quedar en Andrés ("le debe una")?
4. **Avisos "Cualquiera":** ¿la notificación de una tarea sin responsable le llega a todos los miembros?
5. **Resumen diario:** ¿mandarlo aunque no haya nada ("Hoy no hay tareas 🌿") o solo cuando hay algo?
6. **Telegram:** ¿quieres un botón "✅ Hecha" en el mensaje del bot? (es la forma más rápida de completar sin abrir la app).
7. **Estadísticas:** además de "tareas por persona", ¿quieren ver vencidas sin hacer por persona? ¿Comparativa semana a semana?
8. **Ilustraciones:** ¿quién las hace — genero SVG simples, las generan con IA siguiendo el estilo de tinta, o hay ilustrador?
9. **Tira de días:** ¿te gusta en Inicio para filtrar por día (como la referencia), o prefieres solo el grid ordenado por urgencia?
10. **Tarjetas en Inicio:** ¿grid de 2 columnas con anillo (estilo Mindr) o tarjetas anchas de una columna con color de estado (estilo de la referencia chunky)? Puedo proponer ambas en un prototipo.
11. **Mascota en la UI:** ¿Lukas aparece solo en estados vacíos/carga, o también como avatar del bot de Telegram e ícono de la app?
12. **Nombre del bot de Telegram:** ¿`LukasCasaBot` o algo distinto? (el `@username` debe estar libre).
