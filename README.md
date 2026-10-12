# Lukas

Web app mobile-first para llevar las tareas del hogar que se repiten: cada tarea es una tarjeta con un anillo que se llena hasta que toca hacerla otra vez. Spec en [`docs/SPEC.md`](docs/SPEC.md); diseño en [`DESIGN.md`](DESIGN.md) y [`docs/design/`](docs/design/).

## Estado: fase 2a

| Pieza | Estado |
|---|---|
| Next.js 16 (App Router, Cache Components) + Tailwind v4 + TypeScript estricto | ✅ |
| Sistema de diseño (tokens claro/oscuro, componentes, Lukas en SVG) | ✅ `src/styles/lukas.css` |
| Recurrencia con zona horaria (`src/lib/schedule.ts`) + criterios §12 | ✅ probado |
| Inicio, Detalle, Crear/editar, Pendientes de casa, Ajustes (tema) | ✅ |
| Completar · La hizo alguien más · Posponer · Saltar · Borrar · Deshacer | ✅ |
| Esquema Supabase con RLS y funciones atómicas | ✅ probado en Postgres |
| PWA: manifest, íconos (192/512/maskable/Apple), service worker sin conexión, guía para instalar | ✅ |
| Notificaciones push: activar/probar en Ajustes, aviso a la hora de cada tarea (cron + `web-push`) | ✅ |
| Datos en Supabase: caché por usuario para abrir sin conexión, cambios optimistas en cola | ✅ |
| Cuentas: correo + contraseña, registro solo por invitación de hogar, crear hogar | ✅ |
| Panel de super admin (crear hogares, miembros, roles, desactivar; sin acceso a tareas) | ✅ |
| Lista de compras compartida con historial por categorías (pestaña Súper) | ✅ |
| Gestionar completo, Estadísticas por persona, selector de hogar, Telegram, widget, ES/EN | ⏳ siguientes fases |

## Comandos

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # Vitest: recurrencia, estados y operaciones
npm run typecheck    # next typegen + tsc
npm run lint
npm run build
bash supabase/tests/run.sh   # migraciones + pruebas de RLS/funciones en un Postgres temporal
# en Windows, con Docker:
# docker run --rm -v "$PWD:/w" -w /w postgres:16 bash -c "PG_BIN=/usr/lib/postgresql/16/bin bash supabase/tests/run.sh"
```

## Estructura

```
src/
  app/                 rutas: / · /t/[id] · /pendientes · /gestionar · /estadisticas · /ajustes
  components/
    app/               AppShell, TabBar, TaskUI (acciones + sheets), pantallas simples
    tasks/             HomeScreen, TaskCard, TaskDetail, CreateTaskSheet
    todos/             TodoScreen (Pendientes de casa)
    ui/                Icon, ProgressRing, StatusChip, Segmented, Sheet (vaul), Toast…
    lukas/             ilustraciones de Lukas en SVG
  lib/
    schedule.ts        recurrencia (TZ del hogar, no acumula, día 31 → último día…)
    status.ts          progreso del anillo, estado y etiquetas
    tasks.ts           operaciones puras (crédito, rotación, deshacer)
    store.ts           almacén del cliente: última foto del hogar (caché por usuario)
    sync.ts            cola en serie hacia Supabase y mensajes de error
    supabase/          clientes, foto del hogar (snapshot), filas ⇄ AppState (mapping), verbos (remote)
  proxy.ts             renueva la sesión y manda a /entrar sin sesión
  styles/              lukas.css (tokens + componentes), app.css (pantallas y transiciones)
supabase/
  migrations/          esquema, RLS y funciones (complete_task, skip, snooze, undo…)
  tests/               pruebas SQL con un stub mínimo del esquema auth de Supabase
docs/                  spec, sistema de diseño (style guide) y prototipo
```

## PWA

- **Instalar:** en iPhone, Safari → Compartir → *Agregar a inicio* (iOS no tiene botón de instalar; la app lo explica en Ajustes y con un aviso descartable en Inicio). En Android/Chrome aparece "Instalar" cuando el navegador lo ofrece. Requiere HTTPS (Vercel).
- **Sin conexión:** `public/sw.js` guarda en caché los archivos estáticos (cache-first) y las páginas y datos de navegación (network-first). La app abre y navega sin red con lo último guardado y muestra "Sin conexión". Solo se registra en producción. Si cambias la estrategia de caché, sube `VERSION` en `public/sw.js`.
- **Íconos:** `node scripts/generate-icons.mjs` los regenera desde la ilustración de Lukas (necesita Playwright).
- **Push:** Ajustes → Notificaciones activa la suscripción del dispositivo (iPhone: solo con la app instalada) y permite enviar una de prueba (`src/app/actions/push.ts`). Los avisos de tareas salen de `/api/cron/notifications` (`src/lib/push/plan.ts` decide a quién y cuándo; probado con Vitest), disparada por pg_cron cada minuto.
- **Publicar:** pasos completos para Vercel, Supabase y las llaves en [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Decisiones de la fase 1

- **La recurrencia vive en TypeScript.** Las funciones SQL reciben el próximo vencimiento ya calculado y hacen el cambio atómicamente: bloquean la fila, verifican la ocurrencia esperada (para responder "ya estaba hecha"), rotan el turno y guardan el estado previo para "Deshacer".
- **Tema sin next-themes.** Un script en línea en `<head>` aplica `data-theme` antes de pintar, como recomienda la guía de Next 16 (evita el destello sin volver dinámico el layout).
- **Transiciones.** Se usa `<ViewTransition>` de React 19.3 con `transitionTypes` en `Link`: la tarjeta crece hasta el detalle, y la navegación desliza (push/pop) o funde (pestañas).
- **Datos (fase 2a).** El navegador lee la "foto" del hogar con la sesión del usuario (RLS) y la guarda en `localStorage` (`lukas-cache-<userId>`). Cada acción se aplica primero en pantalla con las funciones puras de `tasks.ts` y luego va a Supabase por una cola en serie (`DataProvider` + `sync.ts`); si falla, vuelve a la última foto. Se refresca al abrir, al volver a la app y cada minuto. Diseño: `docs/superpowers/specs/2026-10-11-fase2-supabase-design.md`.
