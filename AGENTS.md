<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Lukas

- Lee `docs/SPEC.md` (producto), `DESIGN.md` (sistema visual) y `README.md` (estado, comandos, estructura) antes de cambiar algo.
- Antes de hacer commit: `npm test && npm run typecheck && npm run lint && npm run build`; si tocas `supabase/`, también `bash supabase/tests/run.sh`.
- La recurrencia se calcula en `src/lib/schedule.ts` (zona horaria del hogar). No la dupliques en SQL ni en componentes.
- Los estilos de componentes viven en `src/styles/lukas.css` (capa `components`). No uses la utilidad `ring` de Tailwind: `.ring` es el anillo de progreso.
- UI en español; nunca registres qué cuenta tocó "Hecha" (solo el crédito).

## Publicación y migraciones de Supabase

- Una vez que Andrés aprueba los cambios y pide subirlos a `main`, esa autorización incluye aplicar las migraciones de Supabase correspondientes; no pedir una segunda confirmación para ejecutarlas.
- Antes de mergear a `main`, ejecutar los checks de este archivo y revisar el historial y el esquema remoto. Aplicar solo las migraciones pendientes de los cambios aprobados, con la conexión de Supabase, y verificar su resultado. Si una migración ya se aplicó, no repetirla.
- El proyecto de esta app es `lukas-reminders` (`xijydcpyowttxfrbsgwy`). Mantener sincronizados el archivo local y la versión registrada en el historial remoto.
- Coordinar el orden de migración y publicación según la compatibilidad del cambio. Si una migración necesaria falla, resolverla antes de dar la publicación por terminada e informar el estado.
