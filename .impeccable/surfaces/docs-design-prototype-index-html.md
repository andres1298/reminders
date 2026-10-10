---
version: 1
slug: "docs-design-prototype-index-html"
primary_target: "docs/design/prototype/index.html"
related_targets: []
---

# Prototipo Lukas — Inicio, Detalle, Crear tarea

Scope: prototipo navegable mobile (viewport iPhone, claro y oscuro) para validar el estilo antes de programar. Modo: **Operate**.
Audiencia: Andrés y Mari, en el celular, pocos segundos por visita. Tarea: ver qué toca, marcar hecha, crear una tarea en < 10 s.
Constraints: paleta, tipos, radios y sello de tinta 2px fijados por SPEC §5 (dirección fijada por el brief; no se tiró concept-seed). Tema claro crema primero. Lukas en tinta + ojos verdes. Sensación: calma doméstica.
Momento memorable: completar una tarea — el anillo se vacía de vuelta, la tarjeta hace squash y salen hojitas.

## Direction contract

THESIS: Un hogar es un jardín de ciclos: cada tarea es una maceta-tarjeta pastel con su anillo de tinta que se llena. Rechaza la lista de checkboxes y el calendario.
OWN-WORLD: Crema #FBF6DC, tarjetas en 20 pasteles herbales con borde de tinta 2px y sombra dura de sello de 3px abajo; tinta #151515 para texto, trazos y anillos; mostaza para la acción principal; coral solo para "vencida". Bricolage Grotesque chunky para títulos, DM Sans para UI. Lukas en grabado de tinta con ojos verde-amarillo.
STORY: Al abrir se entiende qué está vencido, qué toca hoy y de quién es; se toca una tarjeta, se ve su ciclo, se marca "Hecha" y el anillo vuelve a cero; se crea otra desde una hoja inferior.
FIRST VIEWPORT: Arriba, pill mostaza "+ Nueva tarea" a la izquierda y avatar a la derecha; título grande "Hola, Andrés" con resumen "1 vencida · 1 para hoy"; chips Todas/Mías/Hoy + listas; grid de 2 columnas de tarjetas (anillo 92px con emoji, nombre, chip de estado en tinta, avatar); barra flotante tipo pill en tinta abajo.
FORM: Dirección fijada por el brief (SPEC §5 + referencias), posición 1 de 1; seed key: pinned-by-brief.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
