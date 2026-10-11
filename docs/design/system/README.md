# Lukas · Sistema de diseño

Fuente de verdad visual de Lukas. La estructura sigue **Apple HIG** (roles de color, estilos de texto, materiales, barras, controles, presentación modal). El look sale de `docs/SPEC.md` §5: chunky, herbal, con sello de tinta y con Lukas en todos lados.

| Archivo | Qué es |
|---|---|
| `styles.css` | Tokens (claro y `[data-theme="dark"]`) y clases de componentes. Única fuente de estilos. |
| `index.html` | Style guide vivo: fundamentos, todos los componentes, Dev Mode (inspector) y "Copiar como prompt". |
| `concept.html` | Dos pantallas de concepto (Inicio y Detalle) armadas solo con componentes. |
| `icons.js` / `icons.html` | Sprite SVG propio (estilo Phosphor bold) y su catálogo. |
| `lukas-art.js` | Ilustraciones de Lukas en tinta (ícono, cara, durmiendo en maceta, asomándose, brote). |

Se abren con `file://`; no hace falta compilar. El prototipo navegable está en `../prototype/`.

## Decisiones clave

- **Color.** Roles HIG (`--bg`, `--surface`, `--surface-2`, `--ink`, `--ink-muted`…). Cada fondo trae su `--on-*`, con el contraste verificado numéricamente (ver tabla en `index.html`). La tinta es el único tinte interactivo; la mostaza es la acción principal (una por pantalla).
- **Tarjetas.** Son 20 pasteles más "sin color", siempre con texto `#151515`, también en oscuro (todas ≥ 7.6:1).
- **Estado.** El estado de una tarea nunca depende solo del color. Los chips de "pronto", "vencida" y "hecha" son de tinta con texto de color, para que se lean sobre cualquier pastel.
- **Sello.** Los elementos interactivos principales llevan borde de tinta de 2 px y sombra dura de `0 3px 0`; al presionar, el elemento baja 3 px. En oscuro, el borde se oculta y la sombra pasa a negra.
- **Tipografía.** Bricolage Grotesque (títulos, 700–800, tamaño óptico) y DM Sans (UI). Se cubren los 11 estilos de texto HIG.
- **Movimiento.** El resorte del spec (stiffness 400, damping 35) está muestreado como `linear()`. Se anima solo `transform` y `opacity`. `prefers-reduced-motion` cambia los desplazamientos por fundidos y quita el confeti.
- **Ilustraciones.** Lukas se dibuja en tinta y su único color son los ojos verde-amarillo. En oscuro van sobre una placa crema, para no invertir a la gata.

## Cómo extender

1. **Token nuevo:** se agrega en `:root` dentro de su grupo y, si cambia en oscuro, también en `:root[data-theme="dark"]`. Se usa siempre por nombre, nunca en línea.
2. **Componente nuevo:** lleva
   - un bloque de clase en `styles.css` que solo lea tokens;
   - una `<section id="clave">` en `index.html`, con todas sus variantes y estados;
   - un registro en `SPECS.clave` (props, tokens, métricas). El botón "Copiar como prompt" aparece solo.
3. **Color de tarjeta nuevo:** se agrega el token, se verifica el contraste contra `#151515` (≥ 4.5:1) y se suma a `CARD` (style guide) y a `COLORS` (prototipo).
4. **Ilustración nueva:** es una función en `lukas-art.js`. Usa `currentColor` para la tinta, `--art-paper` para el blanco y `--art-eye` para los ojos.

## Pasar a la app (Next.js + Tailwind v4)

Los tokens de `:root` pasan a `@theme` en `globals.css`, y el tema oscuro sale de `[data-theme="dark"]` con `next-themes`. Las clases de componentes pasan a un componente React por cada sección del style guide. "⤓ Instalar sistema" en `index.html` genera el prompt completo.
