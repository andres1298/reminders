# Lukas — Spec

> **Estado:** Borrador v0.8 · **Fecha:** 2026-10-11
> v0.8 incorpora las respuestas de las rondas 1 a 7 (la 6 sale de la revisión del prototipo; la 7 agrega notificaciones push). Lo marcado **[SUPUESTO]** es una propuesta por confirmar; las decisiones están en la sección 15 y las preguntas abiertas en la 16.

---

## 1. Visión

**Lukas** es una web app mobile-first para que un hogar lleve control de **cada cuánto se hace cada tarea** y **a quién le toca**. No es un calendario de eventos: cada tarea es una tarjeta "widget" con un anillo de progreso que se llena a medida que se acerca el momento de hacerla de nuevo. Al marcarla como hecha, el anillo se reinicia.

El nombre y la mascota vienen de **Lukas**, la gata calicó de la casa (blanca con manchas negras y canela, ojos verde-amarillo). Ver `docs/design/refs/lukas.jpg`.

Usuarios: Andrés, Mari y algunos conocidos que crean sus propios hogares. **Solo se entra por invitación**; no es un producto público.

**Principio de convivencia:** la app **nunca registra automáticamente quién tocó "Hecha"**. Al completar se puede indicar, **de forma opcional**, quién la hizo; si no se indica, el crédito es para **la persona a la que le tocaba**. Así nadie lleva la cuenta a escondidas y no se convierte en motivo de discusión.

**Principio de no-borrado:** nada se borra definitivamente. "Borrar" oculta el elemento para todos (borrado lógico), incluso para el admin. El **admin del hogar** (en la Papelera de su hogar) y el **super admin** pueden verlo y restaurarlo.

### 1.1 Objetivos
- Crear una tarea en menos de 10 segundos.
- Ver de un vistazo qué está vencido, qué toca pronto y a quién le toca.
- Marcar como hecha con un toque.
- Ver el estado en widgets de iPhone (Scriptable).
- Recibir recordatorios por **notificaciones push** (PWA instalada) y por **Telegram**.
- Ver estadísticas de tareas por responsable y un resumen general de pendientes del hogar.

### 1.2 Fuera de alcance
- Calendario con vista de eventos por hora.
- Subtareas / checklists.
- Montos, costos, adjuntos o recibos.
- Gamificación (puntos, rachas, premios).
- Notificaciones por email (el email se usa únicamente para autenticación).
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
| **Completado** | Registro de que la tarea se hizo en un momento dado, con un **crédito** opcional. |
| **Crédito** | Persona a la que se le atribuye un completado: la elegida en "¿Quién la hizo?" o, por defecto, el responsable. |
| **Borrado lógico** | El elemento se marca con `deleted_at` y desaparece de la app; nunca se elimina de la base de datos. |
| **Responsable** | Persona a la que le toca la ocurrencia actual (fija o por rotación). |
| **Ciclo** | Periodo entre el último completado (o inicio) y el próximo vencimiento. |
| **Pendiente** | Algo de la casa que hay que hacer alguna vez, sin fecha ni repetición ("cambiar el bombillo del pasillo"). Vive en su propia lista, aparte de las tareas. |

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
| Crear / editar tareas | ✅ | ✅ | ✅ |
| Borrar tareas y listas (borrado lógico) | ✅ | ✅ | ✅ |
| Ver y restaurar elementos borrados (Papelera) | ✅ | ✅ (su hogar) | ❌ |
| Pausar / reanudar tareas (desde el panel Gestionar) | ✅ | ✅ | ✅ |
| Activar / terminar modo vacaciones del hogar | ✅ | ✅ | ✅ |
| Borrado definitivo | ❌ nadie | ❌ | ❌ |
| Completar, posponer o saltar cualquier tarea (aunque no sea suya) | ✅ | ✅ | ✅ |
| Ver estadísticas de su hogar | ✅ | ✅ | ✅ |
| Gestionar su perfil, Telegram y tokens de widget | ✅ | ✅ | ✅ |
| Invitar a alguien a la plataforma para que cree su propio hogar | ✅ | ❌ | ❌ |

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
- **Registro solo por invitación.** No hay botón de "Crear cuenta" público; la pantalla de registro solo se abre desde un enlace de invitación válido.
- Dos tipos de invitación:
  - **Invitación a un hogar** (la crea un admin del hogar): la persona se registra y entra directo a ese hogar.
  - **Invitación a la plataforma** (la crea el super admin): la persona se registra y en el onboarding crea su propio hogar.
- Una vez registrado, cualquier usuario puede crear hogares adicionales y unirse a otros por invitación.

### 4.2 Hogares
- Crear hogar: nombre, emoji (🏡), zona horaria (por defecto `America/Costa_Rica`).
- Invitar con **enlace de invitación** (uso único, expira en 7 días) que se comparte por Telegram/WhatsApp. Al abrirlo: registrarse (si no tiene cuenta) o iniciar sesión → unirse.
- El admin ve las invitaciones pendientes y puede revocarlas.
- Selector de hogar en el header cuando el usuario pertenece a más de uno.

### 4.3 Listas
- Nombre, emoji y color (de la paleta de la app). Las tareas nuevas de la lista heredan ese color.
- Orden manual (arrastrar).
- Vista "Todas" con todas las tareas del hogar.

### 4.3.1 Panel Gestionar
Pantalla de administración de tareas del hogar (pestaña **Gestionar** de la navegación, antes "Listas"). Es el **único lugar** donde se pausa o reanuda una tarea: no se puede desde el detalle de la tarea ni desde Telegram.
- Listas con sus tareas en filas compactas (emoji, nombre, programación resumida, responsable, estado).
- **Pausar / Reanudar** por tarea (switch o acción de deslizar).
- Sección plegable **Pausadas**.
- Sección plegable **Terminadas** (tareas "Una vez" completadas).
- **Papelera** (solo admins): elementos borrados con "Restaurar".
- Acceso a **Modo vacaciones** (cualquier miembro).

### 4.3.2 Pausar una tarea
- Una tarea pausada **desaparece de Inicio**, no envía avisos, no aparece en el resumen ni en el widget y **no suma "sin hacer"** en estadísticas.
- Al **reanudar**: si es intervalo anclado a *última vez hecha*, el ciclo empieza de nuevo desde el momento de reanudar; si es de fecha fija (días de semana, día del mes, intervalo anclado), el próximo vencimiento es la siguiente ocurrencia futura.

### 4.3.3 Modo vacaciones (hogar)
- Cualquier miembro lo activa con **fecha de inicio y fin** (o "hasta que lo apague").
- Durante las vacaciones: no se envían avisos por tarea; el resumen diario se reemplaza por un único mensaje al iniciar ("🏖️ Lukas cuida la casa hasta el 20/10") y otro al terminar; Inicio y el widget muestran un estado especial con Lukas; no se cuenta "sin hacer".
- Al terminar: todas las tareas se reanudan con las mismas reglas que una pausa individual.
- Las tareas pausadas individualmente siguen pausadas después de las vacaciones.

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
| Color de tarjeta | token de paleta | ✅ | Default: color de la lista o `stone`. Ver 5.2. |

Acciones:
- **✅ Hecha** — la completa al instante con crédito para el responsable (o Hogar si es "Cualquiera").
- **🙋 La hizo alguien más** — abre un selector con los avatares de los miembros; al elegir, se completa con crédito para esa persona. Mismo flujo que en Telegram.
- Ambas acciones recalculan el próximo vencimiento, pasan el turno si hay rotación y muestran un toast con "Deshacer" (5 s).
- **Posponer** — +1 h, +1 día, +3 días o fecha/hora a elegir. No registra completado.
- **Saltar esta vez** — avanza a la siguiente ocurrencia sin completado.
- **Deshacer** — toast de 5 s tras completar/saltar, y desde el historial.
- **Editar** y **Borrar** (cualquier miembro, borrado lógico con confirmación y toast de "Deshacer").
- **Historial** — fechas en que se completó (con su crédito), se saltó o se pospuso.
- Si es una tarea sin responsable ("Cualquiera") y no se elige quién la hizo, el crédito es para **Hogar 🏡**.

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
- Tareas "Una vez" completadas pasan a una sección plegable **"Terminadas"** de su lista.

### 4.6 Responsables

| Modo | Comportamiento |
|---|---|
| **Cualquiera** | Sin responsable; el aviso llega a todos los miembros. |
| **Fijo** | Siempre la misma persona. |
| **Rotación** (opcional) | Lista ordenada de miembros; tras cada completado le toca al siguiente. |

- Cualquiera puede completar cualquier tarea. **No se guarda la cuenta que tocó "Hecha"**; solo el crédito (opcional, por defecto el responsable).
- En rotación, cada completado pasa el turno al siguiente de la lista, sin importar quién la hizo.
- Las estadísticas de completadas cuentan por **crédito**; las de sin hacer, por **responsable**.

### 4.7 Estado visual (anillo)

`progreso = (ahora − inicio_del_ciclo) / (vencimiento − inicio_del_ciclo)`, limitado a [0, 1].

El **color de la tarjeta lo elige el usuario** (por tarea o heredado de la lista). El **estado** se comunica con el anillo y una etiqueta (chip) dentro de la tarjeta, para que funcione sobre cualquier color:

| Estado | Condición | Anillo | Chip |
|---|---|---|---|
| Al día | progreso < 0.75 | trazo de tinta, parcial | neutro: "en 4d" |
| Pronto | ≥ 0.75 o vence hoy | trazo de tinta, casi lleno | mostaza: "hoy 19:00" |
| Vencida | ahora > vencimiento | lleno + punto coral pulsante | coral: "vencida hace 2d" |
| Recién hecha | segundos después de completar | se vacía con animación | "✓ hecha" |

- Track del anillo: tinta al 15 %; progreso: tinta al 100 % (contrasta con todos los colores pastel).
- El estado nunca depende solo del color: siempre hay texto.

### 4.8 Estadísticas
- Por hogar, visibles para todos sus miembros.
- Periodos: esta semana, este mes, últimos 3 meses, todo.
- Completadas por persona = por **crédito** (elegido o, por defecto, el responsable). Sin hacer por persona = por **responsable**.
- Métricas:
  - **Resumen general de pendientes del hogar:** vencidas ahora, para hoy, para esta semana (tarjetas grandes con número).
  - **Por persona:** tareas completadas con su crédito, y tareas que le tocaban y **quedaron sin hacer** (ocurrencias que vencieron y se saltaron o quedaron sin completar antes de la siguiente).
  - Tareas de "Cualquiera" se agrupan como **Hogar** 🏡.
  - Desglose por lista.
- Super admin: totales globales (usuarios, hogares, tareas activas, completados por día).

### 4.9 Notificaciones (push y Telegram)

**Push (PWA):** cada persona activa las notificaciones en cada dispositivo desde Ajustes (en iPhone, solo con Lukas instalada, iOS 16.4+). El aviso por tarea llega a la hora de vencimiento al responsable, o a todos si es "Cualquiera": título con emoji y nombre, cuerpo "Toca ahora (19:00) · le toca a Andrés", y al tocarlo abre el detalle de la tarea. Una sola vez por ocurrencia y canal (posponer genera otra ocurrencia). No llegan en vacaciones ni para tareas pausadas. Preferencias por canal en `notification_prefs` (`push`, `telegram`). El envío lo hace `/api/cron/notifications`, que pg_cron llama cada minuto (ver `docs/DEPLOY.md`). **[SUPUESTO]** El resumen diario sigue solo por Telegram.

**Telegram:**

**Vinculación:** Ajustes → "Conectar Telegram" → abre `https://t.me/<LukasBot>?start=<código de un solo uso>` → el bot recibe `/start <código>` en su webhook y guarda el `chat_id` del usuario. `/stop` en el bot o "Desconectar" en la app la desvincula.

**Tipos de mensaje:**

| Tipo | Cuándo | A quién |
|---|---|---|
| **Por tarea** | A la hora de vencimiento de la tarea | Responsable actual; si es "Cualquiera", a todos los miembros |
| **Resumen del día** | Al inicio del día (hora configurable por usuario, default 07:00) | Cada usuario: sus tareas del día + vencidas + "de cualquiera" |

- El **resumen se envía siempre**, aunque no haya tareas ("Hoy no hay nada pendiente 🌿 Lukas aprueba.").
- Se avisa **una sola vez** por ocurrencia (no hay recordatorios repetidos de vencidas). Posponer genera un nuevo aviso a la nueva hora.
- Cada usuario puede apagar el aviso por tarea o el resumen, y elegir horas de silencio. **[SUPUESTO]**
- El mensaje de Telegram está en el idioma del usuario e incluye un enlace a la tarea.
- El mensaje por tarea incluye tres **botones inline**: **"✅ Hecha"**, **"🙋 La hizo alguien más"** y **"⏰ +1 h"**.
- Al tocar **"✅ Hecha"**:
  1. El webhook valida que el `chat_id` corresponde a un usuario miembro del hogar.
  2. Ejecuta `complete_task` con crédito para el responsable (o Hogar si es "Cualquiera").
  3. Edita el mensaje a "✅ Hecha · próximo: jueves 19:00" y quita los botones.
  4. Si ya estaba completada (p. ej. desde la app), responde "Ya estaba hecha 🐾".
- Al tocar **"🙋 La hizo alguien más"**: el mensaje se edita y muestra un botón por cada miembro del hogar (con su emoji) + "↩️ Cancelar". Al elegir a alguien, ejecuta `complete_task` con crédito para esa persona y edita el mensaje a "✅ Hecha por Mari".
- Al tocar **"⏰ +1 h"**: ejecuta `snooze_task` (+1 h desde ahora), edita el mensaje a "⏰ Pospuesta a las 20:00" y a esa hora se envía un nuevo aviso.
- El bot se muestra como **Lukas-remind-it** con la foto de perfil de Lukas.

Ejemplos:

```
🗑️ Sacar la basura — toca ahora (19:00)
Le toca a: Andrés
[ ✅ Hecha ]  [ 🙋 La hizo alguien más ]
[ ⏰ +1 h ]  [ Abrir en Lukas ]
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

### 4.13 Pendientes de casa
Lista aparte, en su propia pestaña **Pendientes**, para cosas que hay que hacer en algún momento pero no se repiten ni tienen fecha.
- Captura rápida: escribir y Enter (o "+"). Opcional: responsable (Cualquiera, por defecto, o un miembro) y la marca **pronto**.
- Emoji automático según palabras clave del texto, editable.
- Marcar como hecho con un toque (checkbox); pasa a la sección plegable **Hechos**, con toast de "Deshacer" (5 s). Se puede desmarcar.
- Filtros: Todos · Míos · Pronto. Orden: los marcados "pronto" primero, luego por fecha de creación.
- Tocar un pendiente abre acciones: marcar hecho/pendiente, poner o quitar "pronto", pasar a otra persona, borrar (borrado lógico).
- No generan avisos por Telegram ni cuentan en estadísticas de tareas. **[SUPUESTO]** el resumen diario puede mencionar los pendientes marcados "pronto".
- Sin fecha, sin hora, sin anillo: es una checklist, no un ciclo.

### 4.12 Tema
- Claro / Oscuro / Sistema con `next-themes`, guardado en el perfil.

---

## 5. Dirección visual

Referencias en `docs/design/refs/`:

| Archivo | Qué tomar |
|---|---|
| `ui-chunky-cards.jpg` | Tarjetas grandes de color sólido, esquinas muy redondeadas, botón pill "Create new task", barra de navegación flotante tipo pill, avatares apilados. |
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
| `leaf` (lima) | `#C5D98A` | `#C5D98A` | Color de tarjeta, acento primario |
| `mustard` | `#F2CB66` | `#F2CB66` | Color de tarjeta, chip "pronto", CTA |
| `coral` | `#EE8F6E` | `#EE8F6E` | Color de tarjeta, chip "vencida" |
| `stone` | `#DAD8D1` | `#DAD8D1` | Tarjetas neutras |
| `calico` | `#D9A25F` | `#D9A25F` | Acento Lukas (detalles, ilustraciones) |

- **Paleta amplia de tarjetas** (cada persona elige el color al crear/editar una tarea o lista). 20 tonos pastel, todos con contraste AA contra texto `#151515`:

| Familia | Colores (`token` hex) |
|---|---|
| Verdes / herbales | `leaf` `#C5D98A` · `sage` `#B7CDB0` · `mint` `#BFE3CF` · `moss` `#A9C27E` · `olive` `#D3D49A` |
| Amarillos / tierra | `mustard` `#F2CB66` · `butter` `#F6E29A` · `calico` `#D9A25F` · `sand` `#E8D5B0` · `clay` `#E3B48F` |
| Rojos / rosas | `coral` `#EE8F6E` · `peach` `#F5BE9E` · `rose` `#F0B4BE` · `berry` `#D9A0C4` |
| Azules / violetas | `sky` `#A9CFE0` · `lake` `#9EC3C9` · `periwinkle` `#B6BEEB` · `lilac` `#CDB8E6` |
| Neutros | `stone` `#DAD8D1` · `paper` `#F3EEDD` |

  Más "sin color" (`surface`). Selector: grid de círculos chunky de 44 px en el bottom sheet, con check animado. **[SUPUESTO]** valores exactos se ajustan en la fase de diseño.
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

Las ilustraciones se crean como parte del proyecto (SVG a mano, trazo de tinta, sin dependencias externas), basadas en la foto de referencia de Lukas: cara con antifaz negro, manchas **naranjas de calicó** (`--art-calico` #E8893A, sólidas con trama de tinta encima), pecho y patas blancas, ojos verde-amarillo.

**Lukas aparece en todos lados:**
- Ícono de la app / PWA y favicon (cara de Lukas en tinta sobre crema).
- Avatar del bot de Telegram.
- Estados vacíos, carga, errores, onboarding, login.
- Estado vacío del widget de Scriptable.
- Detalles pequeños: una patita 🐾 en el toast de "hecha", Lukas asomándose en el header en ocasiones.

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

Navegación inferior flotante tipo pill (como la referencia): **Inicio · Pendientes · Gestionar · Estadísticas · Ajustes**. Botón pill mostaza "+ Nueva tarea" arriba.

1. **Inicio**
   - Header: "Hola, Andrés" + avatar + selector de hogar.
   - Resumen: "Hoy tocan 3" o "Nada pendiente 🙌" con ilustración.
   - Chips de filtro: **Todas · Mías · Hoy** + una por lista.
   - **Grid de 2 columnas estilo Mindr**: tarjetas chunky con el color elegido, anillo de progreso con el emoji al centro, nombre, chip de estado, avatar del responsable y botón "…".
   - Orden: vencidas → pronto → al día.
2. **Detalle de tarea** — anillo grande, descripción, próximo vencimiento, responsable/rotación, dos botones grandes **"✅ Hecha"** (principal) y **"🙋 La hizo alguien más"** (secundario), acciones secundarias (posponer, saltar, editar, borrar), historial. Desde la tarjeta en Inicio, el botón "…" ofrece las mismas acciones.
3. **Crear / editar tarea** (bottom sheet) — emoji grande tocable, nombre, segmented *Intervalo · Días · Día del mes · Una vez*, hora, responsable, lista, color. Botón **"Agregar"** siempre visible arriba a la derecha (no lo tapa el teclado) y "Agregar tarea" pill a todo el ancho al final; Enter en el nombre también guarda.
3b. **Pendientes de casa** — captura rápida arriba, lista con checkbox, filtros Todos · Míos · Pronto y sección plegable Hechos (ver 4.13).
4. **Gestionar** — listas (crear/editar/ordenar), tareas en filas compactas, pausar/reanudar, Pausadas, Terminadas, Papelera y Modo vacaciones (ver 4.3.1).
5. **Estadísticas** — resumen general de pendientes, selector de periodo, completadas y sin hacer por responsable, desglose por lista.
6. **Ajustes** — perfil, idioma, tema, Telegram (conectar/estado/preferencias/hora del resumen), widgets (tokens + guía Scriptable), hogar (miembros, roles, invitar, salir).
7. **Onboarding** (solo con invitación) — registrarse desde el enlace; si es invitación de hogar, entrar a él; si es de plataforma, crear hogar y elegir plantillas sugeridas; conectar Telegram (opcional).
8. **Auth** — login (link mágico / contraseña), registro, recuperar contraseña.
9. **Super admin** (`/admin`) — usuarios, hogares, métricas globales, invitaciones a la plataforma, desactivar.

---

## 7. Modelo de datos (Supabase / Postgres)

```text
profiles            (id PK = auth.users.id, display_name, avatar_emoji, avatar_url,
                     locale ('es'|'en'), theme ('light'|'dark'|'system'),
                     is_super_admin bool, disabled_at, created_at)

households          (id, name, emoji, timezone default 'America/Costa_Rica',
                     vacation_from timestamptz NULL, vacation_until timestamptz NULL,
                     created_by, disabled_at, deleted_at NULL, created_at)

household_members   (household_id, user_id, role ('admin'|'member'), joined_at,
                     PK(household_id, user_id))

invitations         (id, kind ('household'|'platform'),
                     household_id NULL,       -- NULL si kind = 'platform'
                     token_hash, role NULL, invited_by,
                     expires_at, accepted_by, accepted_at, revoked_at)

lists               (id, household_id, name, emoji, color NULL, position,
                     deleted_at NULL, deleted_by NULL, created_at)

tasks               (id, household_id, list_id NULL, emoji, title, description,
                     schedule_type ('interval'|'weekly'|'monthly'|'once'),
                     schedule jsonb,        -- {every,unit} | {weekdays,every_weeks} | {day,every_months} | {date}
                     anchor ('completion'|'schedule'),
                     due_time time NOT NULL,
                     starts_on date, ends_on date NULL,
                     color NULL,             -- NULL = hereda de la lista
                     assignment_mode ('anyone'|'fixed'|'rotation'),
                     current_assignee_id NULL,
                     cycle_started_at timestamptz,
                     next_due_at timestamptz,   -- desnormalizado
                     completed_at NULL,      -- tareas "Una vez" terminadas
                     paused_at NULL, paused_by NULL,    -- pausa individual
                     deleted_at NULL, deleted_by NULL,  -- borrado lógico
                     created_by, created_at, updated_at)

task_rotation       (task_id, user_id, position, PK(task_id, user_id))

task_events         (id, task_id, household_id,
                     kind ('done'|'skipped'|'snoozed'|'missed'|'undone'),
                     assignee_at_time NULL,   -- a quién le tocaba; NULL = "Cualquiera"
                     due_at_snapshot, snoozed_until, created_at)
                     credited_to NULL,        -- 'done': persona elegida en "¿Quién la hizo?"
                                              -- o, por defecto, el responsable; NULL = Hogar
                     -- Intencionalmente SIN actor_id: no se guarda la cuenta que tocó "Hecha".
                     -- 'missed' lo inserta el cron cuando una ocurrencia vencida
                     -- queda superada por la siguiente sin completarse.

household_todos     (id, household_id, text, emoji, assignee_id NULL,  -- NULL = Cualquiera
                     soon bool default false, done_at NULL,
                     deleted_at NULL, deleted_by NULL, created_by, created_at)

api_tokens          (id, user_id, name, token_hash, last_used_at, created_at, revoked_at)

telegram_links      (user_id PK, chat_id bigint UNIQUE, username, linked_at)
telegram_link_codes (code_hash PK, user_id, expires_at, used_at)

telegram_messages   (chat_id, message_id, task_id, occurrence_key, sent_at)  -- para editar el mensaje al tocar "Hecha"

notification_prefs  (user_id PK, per_task bool default true, daily_digest bool default true,
                     digest_time time default '07:00', quiet_start, quiet_end)

notification_log    (id, user_id, task_id NULL, kind ('due'|'digest'),
                     channel ('telegram'|'push'), occurrence_key text, sent_at,
                     UNIQUE(user_id, kind, occurrence_key, channel))

push_subscriptions  (id, user_id, endpoint UNIQUE, p256dh, auth, user_agent,
                     created_at, last_used_at)   -- una por dispositivo
```

- `stats` se calcula con una RPC `household_stats(household_id, from, to)` sobre `task_events`: completadas agrupadas por `credited_to` (`done`), sin hacer agrupadas por `assignee_at_time` (`missed`/`skipped`) + conteo en vivo de pendientes desde `tasks.next_due_at`.
- Funciones SQL atómicas (SECURITY DEFINER, validan membresía): `complete_task`, `skip_task`, `snooze_task`, `undo_last_event`, `accept_invitation`.
- El registro (`auth.users` insert) se bloquea salvo con un token de invitación válido: el alta pasa por una ruta del servidor que valida la invitación y crea el usuario con la service key. **[SUPUESTO]**
- La lógica de recurrencia vive en **TypeScript** (`lib/schedule.ts`, testeada) y se replica en SQL solo si hace falta para el cron; **[SUPUESTO]** el cron corre en una ruta de Next.js para compartir el mismo código.

### 7.1 Seguridad (RLS)
- Datos de hogar: lectura y escritura si `auth.uid()` es miembro; operaciones de miembros/invitaciones/borrado definitivo solo admins.
- `api_tokens`, `telegram_links`, `notification_prefs`: solo el dueño.
- Super admin: acceso de lectura global vía `is_super_admin()`.
- Usuarios u hogares desactivados no pueden leer ni escribir.
- Las políticas de lectura excluyen filas con `deleted_at` (excepto para el super admin). No hay política `DELETE` para ningún rol de la app: borrar = `UPDATE ... SET deleted_at = now()`.

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
| Tema | Script en línea en `<head>` que pone `data-theme` antes de pintar (guía de Next 16; reemplaza a next-themes) |
| Fechas | date-fns + `@date-fns/tz` |
| Emoji | `frimousse` (picker liviano) |
| Telegram | Bot API vía `fetch` (sin SDK) |
| Hosting | Vercel (plan gratuito, subdominio `*.vercel.app`) + Supabase (plan gratuito) |
| Tests | Vitest (recurrencia, permisos), Playwright (flujos clave en viewport móvil) |
| PWA | Manifest + íconos (192/512/maskable/Apple) + service worker propio (sin conexión + push) + guía de instalación en Ajustes |
| Push | `web-push` con llaves VAPID; envío desde `/api/cron/notifications` disparado por pg_cron + pg_net cada minuto |

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
- **Rotación [Andrés, Mari]:** a Andrés le toca; alguien la completa sin elegir quién → crédito para Andrés y el turno pasa a Mari.
- **Crédito opcional:** a Andrés le toca, se completa y en "¿Quién la hizo?" se elige Mari → la estadística de completadas suma 1 a Mari; el turno igual pasa al siguiente de la rotación.
- **Borrado lógico:** un miembro borra "Barrer" → desaparece para todos, sigue en la base con `deleted_at`, no genera avisos, y el admin del hogar (Papelera) o el super admin (`/admin`) pueden restaurarla. Ningún rol tiene una acción de borrado definitivo.
- **Pausar:** desde Gestionar se pausa "Regar plantas" → desaparece de Inicio, no llegan avisos y no suma "sin hacer". En el detalle de la tarea y en Telegram no existe la opción de pausar.
- **Vacaciones:** un admin activa vacaciones del 10 al 20 → no llegan avisos por tarea, llega un solo mensaje de inicio y otro de fin; el 20 las tareas se reanudan y la de "cada 3 días desde la última vez" vence el 23.
- **Sin hacer:** a Mari le tocaba "Basura" el martes y no se completó antes de la ocurrencia del jueves → en estadísticas suma 1 "sin hacer" para Mari.
- **Registro cerrado:** abrir `/registro` sin token de invitación válido muestra "Lukas solo abre la puerta con invitación 🐾" y no permite crear cuenta.
- **Telegram "La hizo alguien más":** se toca el botón, aparecen los miembros, se elige Mari → la tarea se completa con crédito para Mari y el mensaje dice "✅ Hecha por Mari".
- **Telegram "Hecha":** tocar el botón completa la tarea (crédito al responsable), el mensaje se edita a "✅ Hecha" y la app refleja el cambio; tocarlo de nuevo responde "Ya estaba hecha".
- **Telegram "+1 h":** a las 19:00 se toca "⏰ +1 h" → la tarea queda pospuesta a las 20:00 y a esa hora llega un nuevo aviso.
- **Telegram:** a las 19:00 el responsable recibe un mensaje; no recibe otro de esa ocurrencia aunque siga vencida. Si la pospone a 20:00, recibe uno a las 20:00.
- **Resumen:** a las 07:00 (hora del usuario) recibe el resumen siempre; si no hay tareas, recibe el mensaje de "nada pendiente".
- **Aislamiento:** un usuario de otro hogar no puede leer tareas ni estadísticas de "Casa" (RLS devuelve vacío / 404).
- **Widget:** con token válido, `GET /api/v1/widget?limit=4` devuelve las 4 más urgentes; con token revocado → 401.
- **Miembro** puede crear tareas y listas, pero no ve la opción de invitar ni de borrar definitivamente.
- **Reduced motion:** con la preferencia activa no hay slide ni confeti.

---

## 13. Fases

| Fase | Contenido |
|---|---|
| **MVP** | Auth (link mágico + contraseña, registro solo por invitación), hogares e invitaciones, roles, listas, tareas con 4 programaciones y hora, completar/posponer/saltar/deshacer, anillos y estados, tema claro/oscuro, ES/EN, sistema visual chunky con animaciones base. |
| **v1.0** | Telegram (vinculación, aviso por tarea con botón "Hecha", resumen diario), API + widget Scriptable (4 y 8), rotación, historial, estadísticas por persona, ilustraciones de Lukas, transiciones avanzadas (shared element, confeti). |
| **v1.1** | Panel super admin, PWA pulida, sugerencias de emoji mejoradas. |

---

## 14. Riesgos
- **Email sin dominio** (ver 9.1).
- **Cron en plan gratuito**: pg_cron funciona en Supabase free; si el proyecto se pausa por inactividad (7 días sin uso en plan free) se detienen las notificaciones. Mitigación: el propio cron y el widget generan actividad. **[SUPUESTO]**
- **Widgets de Scriptable** se refrescan cuando iOS decide (≈ cada 15–60 min); no son tiempo real.
- **Ilustraciones**: el estilo de tinta requiere trabajo de dibujo; sin ellas la app pierde mucha identidad.
- **View Transitions** en Safari: soportado desde iOS 18; fallback a animaciones de Motion.

---

## 15. Decisiones de la ronda 2

| # | Tema | Decisión |
|---|---|---|
| 1 | Registro | Solo por invitación (de hogar o de plataforma). |
| 2 | Hora por defecto | 09:00. |
| 3 | Quién completó | No se registra la cuenta que completa; los turnos avanzan igual tras cada completado. *(Ajustado en ronda 3: crédito opcional.)* |
| 4 | Avisos de "Cualquiera" | Le llegan a todos los miembros. |
| 5 | Resumen diario | Se envía siempre, aunque no haya tareas. |
| 6 | Telegram | Botón "✅ Hecha" en el mensaje por tarea. |
| 7 | Estadísticas | Completadas y sin hacer por responsable + resumen general de pendientes. |
| 8 | Ilustraciones | Se crean en el proyecto (SVG en tinta). |
| 9 | Tira de días | Se elimina; se reemplaza por el chip "Hoy". |
| 10 | Tarjetas | Grid de 2 columnas con anillos estilo Mindr, con color elegible por tarea/lista. |
| 11 | Lukas | En todos lados: ícono, favicon, bot, estados vacíos, carga, onboarding, widget. |
| 12 | Bot de Telegram | Nombre visible **Lukas-remind-it**. El `@username` no admite guiones y debe terminar en "bot": propuesta `@lukas_remind_it_bot`. |

### 15.1 Decisiones de la ronda 3

| # | Tema | Decisión |
|---|---|---|
| 1 | Quién la hizo | Opcional al completar; si no se indica, el crédito es para el responsable (o Hogar si es "Cualquiera"). |
| 2 | Colores | Paleta amplia de 20 tonos; cada persona elige el color de la tarjeta. |
| 3 | Borrar | Todos pueden "borrar", pero es borrado lógico; nada se elimina definitivamente, ni siquiera el admin. |
| 4 | Telegram | Botones "✅ Hecha" y "⏰ +1 h". |
| 5 | Prototipo | Más adelante, con las skills de diseño (impeccable) y brainstorming instaladas. |

### 15.2 Decisiones de la ronda 4

| # | Tema | Decisión |
|---|---|---|
| 1 | Papelera | La ven y restauran el admin del hogar y el super admin. |
| 2 | Pausar | Sí, pero solo desde el panel Gestionar (no en el detalle de la tarea ni en Telegram). |
| 3 | Modo vacaciones | Sí, para todo el hogar. |
| 4 | Telegram | Botones "✅ Hecha", "🙋 La hizo alguien más" (luego pregunta quién) y "⏰ +1 h". |

## 16. Herramientas de diseño para la construcción

- **impeccable** (skill de proyecto en `.claude/skills/impeccable`, sin hooks): dirección de diseño, crítica, auditoría, animación y pulido. Empezar con `/impeccable init`.
- **mobile-design-system** (skill de proyecto en `.claude/skills/mobile-design-system`, guía Apple HIG): sistema de tokens y catálogo de componentes como style guide HTML.
- **frontend-design** (skill de proyecto en `.claude/skills/frontend-design`, de Anthropic): implementación de la UI en Next.js + Tailwind.

Flujo propuesto: `mobile-design-system` (iOS) → tokens y catálogo → `impeccable` para crítica/animación/pulido → `frontend-design` al implementar cada pantalla.

### 15.3 Decisiones de la ronda 5

| # | Tema | Decisión |
|---|---|---|
| 1 | Modo vacaciones | Lo puede activar cualquier miembro. |
| 2 | Pausar | Cualquier miembro, desde Gestionar. |
| 3 | Completar en la app | Dos botones, igual que Telegram: "✅ Hecha" y "🙋 La hizo alguien más". |

### 15.4 Decisiones de la ronda 6 (prototipo de diseño)

| # | Tema | Decisión |
|---|---|---|
| 1 | Crear tarea | El botón para guardar tiene que verse siempre: "Agregar" arriba a la derecha del sheet, además del botón grande al final. |
| 2 | Lukas | Calicó con naranja: manchas naranjas además del negro, en todas las ilustraciones y en el ícono. |
| 3 | Pendientes de casa | Nueva lista aparte (pestaña propia) para pendientes sin fecha ni repetición. Ver 4.13. |
| 4 | Sello de tinta | Se mantiene el estilo actual (borde 2px + sombra dura, mostaza como CTA). |

### 15.5 Decisiones de la ronda 7

| # | Tema | Decisión |
|---|---|---|
| 1 | Notificaciones | Se agregan notificaciones push de la PWA, además de Telegram. |
| 2 | Hosting | Vercel (plan gratuito); el reloj de los avisos lo pone pg_cron de Supabase porque el cron de Vercel gratuito es diario. |

## 17. Implementación

**Fase 1 (en curso):** Next.js 16 + Tailwind v4, sistema de diseño, recurrencia probada, Inicio / Detalle / Crear / Pendientes con datos de demo en el navegador, y esquema de Supabase con RLS y funciones atómicas probadas en Postgres. Ver `README.md`.

**Fase 2:** conectar Supabase (auth por invitación, datos reales, Server Actions), Gestionar completo (pausar, Papelera, vacaciones) y estadísticas por persona. **Fase 3:** Telegram, widget de Scriptable, ES/EN.

## 18. Siguiente paso (histórico)

El spec queda listo para pasar a diseño: generar el sistema de diseño (tokens + catálogo de componentes) y un prototipo de Inicio, detalle y crear tarea para validarlo antes de programar.
