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
