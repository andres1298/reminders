---
name: Lukas
description: Tareas del hogar como un jardín de ciclos. Tarjetas pastel con sello de tinta sobre crema.
colors:
  ink: "#151515"
  ink-muted: "#5E5A48"
  ink-faint: "#8C876F"
  cream: "#FBF6DC"
  white: "#FFFFFF"
  wheat: "#F1EBCB"
  separator-opaque: "#E4DDBD"
  ink-cream: "#F5F1DC"
  card-ink-muted: "#3D3A2E"
  accent: "#F2CB66"
  accent-soft: "#F8E4AE"
  danger: "#9E3B1F"
  danger-fill: "#EE8F6E"
  art-eye: "#CBD45E"
  art-calico: "#E8893A"
  leaf: "#C5D98A"
  sage: "#B7CDB0"
  mint: "#BFE3CF"
  moss: "#A9C27E"
  olive: "#D3D49A"
  mustard: "#F2CB66"
  butter: "#F6E29A"
  calico: "#D9A25F"
  sand: "#E8D5B0"
  clay: "#E3B48F"
  coral: "#EE8F6E"
  peach: "#F5BE9E"
  rose: "#F0B4BE"
  berry: "#D9A0C4"
  sky: "#A9CFE0"
  lake: "#9EC3C9"
  periwinkle: "#B6BEEB"
  lilac: "#CDB8E6"
  stone: "#DAD8D1"
  paper: "#F3EEDD"
  dark-bg: "#161616"
  dark-surface: "#232323"
  dark-surface-2: "#2E2E2E"
  dark-ink-muted: "#A8A496"
  dark-ink-faint: "#6F6C62"
  dark-separator-opaque: "#333230"
  dark-accent-soft: "#4A3F22"
  dark-danger: "#F2A386"
  dark-stroke: "#0A0A0A"
  dark-tabbar: "#2A2A28"
typography:
  large-title:
    fontFamily: "Bricolage Grotesque, DM Sans, ui-rounded, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.025em"
  title1:
    fontFamily: "Bricolage Grotesque, DM Sans, ui-rounded, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.022em"
  title2:
    fontFamily: "Bricolage Grotesque, DM Sans, ui-rounded, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 750
    lineHeight: 1.12
    letterSpacing: "-0.018em"
  title3:
    fontFamily: "Bricolage Grotesque, DM Sans, ui-rounded, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: "-0.012em"
  card-title:
    fontFamily: "Bricolage Grotesque, DM Sans, ui-rounded, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 750
    lineHeight: 1.15
    letterSpacing: "-0.012em"
  headline:
    fontFamily: "DM Sans, -apple-system, system-ui, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.005em"
  body:
    fontFamily: "DM Sans, -apple-system, system-ui, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  callout:
    fontFamily: "DM Sans, -apple-system, system-ui, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.4
  subhead:
    fontFamily: "DM Sans, -apple-system, system-ui, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.38
  footnote:
    fontFamily: "DM Sans, -apple-system, system-ui, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.38
  caption1:
    fontFamily: "DM Sans, -apple-system, system-ui, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.005em"
  caption2:
    fontFamily: "DM Sans, -apple-system, system-ui, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.02em"
  button:
    fontFamily: "DM Sans, -apple-system, system-ui, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.005em"
rounded:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "22px"
  card: "28px"
  sheet: "32px"
  full: "9999px"
spacing:
  sp-2: "2px"
  sp-4: "4px"
  sp-6: "6px"
  sp-8: "8px"
  sp-12: "12px"
  sp-16: "16px"
  sp-20: "20px"
  sp-24: "24px"
  sp-32: "32px"
  sp-40: "40px"
  sp-48: "48px"
  sp-64: "64px"
  margin: "20px"
  gutter: "12px"
  hit: "44px"
  control-h: "48px"
  btn-h: "56px"
  tabbar-h: "64px"
components:
  button-filled:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "48px"
  button-filled-lg:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "56px"
  button-prominent:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "48px"
  button-bordered:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "48px"
  button-tinted:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "48px"
  button-destructive-filled:
    backgroundColor: "{colors.danger-fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "48px"
  icon-button:
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: "44px"
  chip:
    backgroundColor: "{colors.wheat}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "40px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "40px"
  status-soon:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.accent}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "28px"
  status-overdue:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.coral}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "28px"
  status-done:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.leaf}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "28px"
  task-card:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.ink}"
    typography: "{typography.card-title}"
    rounded: "{rounded.card}"
    padding: "12px 12px 16px 16px"
    height: "216px"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
  input:
    backgroundColor: "{colors.wheat}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "48px"
  input-focus:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  search:
    backgroundColor: "{colors.wheat}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "48px"
  segmented:
    backgroundColor: "{colors.wheat}"
    rounded: "{rounded.full}"
    padding: "4px"
  tabbar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ink-cream}"
    rounded: "{rounded.full}"
    padding: "8px"
    height: "64px"
  tabbar-item-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "48px"
  sheet:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ink-cream}"
    rounded: "{rounded.lg}"
    padding: "8px 8px 8px 16px"
    height: "56px"
  list-inset:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
---

# Design System: Lukas

## Overview

**Creative North Star: "El jardín de macetas con sello de tinta"**

Lukas trata cada tarea del hogar como una maceta: una tarjeta pastel, gorda y redondeada, con un anillo de tinta que se llena a medida que se acerca el momento de repetirla. Todo está dibujado con la misma tinta casi negra (#151515): texto, trazos de 2px, anillos, íconos y la gata Lukas en grabado. Sobre un papel crema, esa tinta da un look chunky y táctil, como objetos estampados con un sello, y el pastel herbal de cada tarjeta es el único color abundante. La sensación buscada es calma doméstica: lo vencido se nota (coral, punto que late) pero no grita.

La estructura es Apple HIG traducida a la web: roles semánticos de color (label / secondaryLabel / systemBackground), los once estilos de texto, barras, sheets, action sheets, alerts y menús. El carácter no es HIG: los controles principales son píldoras de tinta o mostaza con borde de 2px y una sombra dura de 3px que se "hunde" al tocar, y la barra de pestañas flota como una píldora negra. El tema claro crema es el base; el oscuro es de primera clase: fondo casi negro, las tarjetas conservan su pastel con texto #151515, y el borde de tinta desaparece (sería ruido crema) mientras el sello se vuelve una sombra negra.

Densidad media, pensada para una mano en el celular: objetivos de 44px como mínimo, botones principales de 56px, grid de dos columnas de tarjetas con 12px de separación y 20px de margen. El movimiento es elástico pero corto: un resorte muestreado (stiffness 400, damping 35) para lo que se desplaza, ease-out rápido para lo que cambia de color.

**Key Characteristics:**
- Tinta única (#151515) para texto, trazos, anillos, íconos e ilustración; crema (#FBF6DC) como papel.
- Sello de tinta: borde 2px + sombra dura `0 3px 0` en objetos tocables chunky; al presionar, baja 3px y la sombra llega a cero.
- 20 pasteles herbales solo para el fondo de las tarjetas de tarea; texto de tarjeta siempre #151515, en ambos temas.
- Mostaza (#F2CB66) para la acción principal; coral (#EE8F6E) solo para vencido y destructivo.
- Bricolage Grotesque chunky (700 a 800) para títulos y números grandes; DM Sans para toda la UI.
- Formas redondas: controles en píldora, tarjetas de 28px, sheets de 32px.
- Movimiento de resorte en 520ms; `prefers-reduced-motion` lo cambia por fundidos y quita el hundimiento del sello.

## Colors

Papel crema, tinta casi negra y un jardín de 20 pasteles herbales; un único acento cálido (mostaza) para actuar y un coral reservado para lo vencido.

### Primary
- **Tinta de Sello** (ink): el color del sistema. Texto principal (16.8:1 sobre crema), trazos de 2px, anillos de progreso, íconos, chip de filtro seleccionado, thumb del segmented, botón prominente y fondo de la tab bar y del toast. Es también el único tinte interactivo (`--tint`): los enlaces y los controles seleccionados se marcan en tinta, no en un azul de sistema. En oscuro la tinta pasa a ser crema (ink-cream, 15.9:1 sobre dark-bg).
- **Mostaza de Acción** (accent): relleno del botón principal ("+ Nueva tarea", "Hecha"), pestaña activa de la tab bar, acción "Deshacer" del toast, thumb del slider, selección de texto y anillo de foco en oscuro. Texto encima siempre tinta (11.8:1).
- **Mostaza Suave** (accent-soft): botón tinted; en oscuro se vuelve dark-accent-soft con texto accent-soft.

### Secondary
- **Coral Vencido** (danger-fill / coral): punto de alerta del anillo, texto del chip "vencida" sobre tinta (7.6:1), badge de conteo y botón destructivo relleno. No aparece en ningún otro rol.
- **Óxido de Peligro** (danger): texto destructivo sobre crema y sobre fills (6.2:1 y 5.3:1); en oscuro, dark-danger con 4.5:1 o más.

### Tertiary
- **Paleta de macetas** (leaf, sage, mint, moss, olive, mustard, butter, calico, sand, clay, coral, peach, rose, berry, sky, lake, periwinkle, lilac, stone, paper, más "sin color" = surface): el fondo de cada tarjeta de tarea, del hero del detalle y de los swatches del selector. Stone es el valor por defecto. Moss rellena el switch encendido; leaf es el texto del chip "hecha" sobre tinta. Los colores de sistema HIG se mapean a esta paleta (red = coral, green = leaf, blue = periwinkle, etc.).
- **Verde Ojo de Lukas** (art-eye #CBD45E): los ojos.
- **Naranja Calicó** (art-calico #E8893A): las manchas naranjas de Lukas (coronilla, mejilla, hocico, lomo, cola), sólidas y con trama de tinta encima. Solo en ilustraciones.

### Neutral
- **Crema Papel** (cream): fondo de la app (`--bg`), de los sheets y papel de las ilustraciones.
- **Blanco** (white): surface: listas agrupadas, cards genéricas, botón bordered, campo enfocado.
- **Trigo** (wheat): surface-2: chips sin seleccionar, inputs, search, segmented, stepper, desc del detalle.
- **Tinta Apagada** (ink-muted): secondaryLabel (6.4:1): resúmenes, subtítulos de fila, labels de campo, placeholders.
- **Tinta Tenue** (ink-faint): tertiaryLabel, solo para chevrons, deshabilitado o decorativo; nunca texto que haya que leer.
- **Separadores y fills**: separador `rgb(21 21 21 / .14)` y opaco separator-opaque; fills de tinta al 5 / 8 / 12 / 18 % para estados presionados, tracks y fondos de icon-button.
- **Tema oscuro**: dark-bg, dark-surface y dark-surface-2 como fondos; dark-ink-muted (7.3:1) y dark-ink-faint; separadores y fills en crema al 14 % y 5 / 9 / 13 / 20 %.

### Named Rules
**La Regla de la Tinta Única.** Hay un solo tinte interactivo: la tinta. Selección, foco, enlace y progreso se dibujan en tinta (en oscuro, crema o mostaza para el foco); nunca se introduce un azul de sistema.

**La Regla del Coral Vencido.** El coral significa "vencida" o "destructivo" y nada más. Su escasez es lo que hace que lo vencido se note sin gritar.

**La Regla de la Tarjeta Siempre Tinta.** Sobre cualquier pastel el texto es #151515 (o card-ink-muted), en claro y en oscuro. El pastel no se oscurece en el tema oscuro.

**La Regla del Estado con Palabras.** El estado de una tarea nunca depende solo del color: el chip de estado siempre lleva texto ("Vencida hace 2 d", "Hoy 18:00").

## Typography

**Display Font:** Bricolage Grotesque (con DM Sans, ui-rounded, system-ui), opsz automático, pesos 500 a 800.
**Body Font:** DM Sans (con -apple-system, system-ui, Segoe UI), opsz 9 a 40, pesos 400 a 700 (800 en badges y énfasis puntual).

**Character:** Una grotesca de display gorda y con carácter, con remate casi de letrero, para títulos, nombres de tarea y números grandes; una sans geométrica tranquila para todo lo que se lee y se toca. El contraste es de peso y de familia, no de tamaño exagerado: la escala se mueve entre 11 y 32px.

### Hierarchy
- **Large Title** (800, 32px, 1.04, -0.025em): título de pantalla en la navbar grande ("Hola, Andrés").
- **Title 1 / Title 2 / Title 3** (800 28px / 750 24px / 700 20px, tracking negativo): títulos de sheet, estado vacío (24px), section header grande (20px, 750).
- **Card Title** (750, 17px, 1.15): nombre de la tarea en la tarjeta, máximo dos líneas con clamp y altura reservada de 2.3em.
- **Headline** (DM Sans 600, 16px, 1.3): títulos de fila y de disclosure.
- **Body** (400, 16px, 1.5): texto corrido; mensajes de estado vacío a 15px con máximo 30ch y `text-wrap: balance`.
- **Callout / Subhead / Footnote** (500 15px / 500 14px / 400 13px): resúmenes, chips, subtítulos de fila, section headers (700 13px en ink-muted, en caja normal).
- **Caption 1 / Caption 2** (500 12px +0.005em / 600 11px +0.02em): ayudas de campo, conteos.
- **Botón** (DM Sans 700, 16px, 1; 17px en el tamaño grande, 14px en el chico).
- **Números**: stepper, time pill, wheel y stat tiles en Bricolage 800 con cifras tabulares.

### Named Rules
**La Regla de los Dos Registros.** Bricolage solo para títulos, nombres de tarea y números protagonistas; DM Sans para todo control, label y párrafo. Ningún control de UI se escribe en Bricolage salvo los días de la semana y los números del stepper y de la hora.

**La Regla de las Cifras Tabulares.** Toda hora, conteo, fecha o número que pueda cambiar usa `font-variant-numeric: tabular-nums`.

## Layout

Mobile-first en una sola columna con margen de layout de 20px (`margin`) y ritmo de espaciado de 4/8 (2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64px). La pantalla de inicio apila: fila superior (botón mostaza + avatar, alto 44px), large title con resumen, fila de chips de filtro con scroll horizontal y un grid de tarjetas de dos columnas con 12px de gutter (`gutter`), que pasa a tres columnas desde 600px de contenedor. La tab bar flota a 16px de los bordes y 10px sobre el área segura; el contenido reserva su alto más 40px al final.

Los objetivos táctiles miden 44px como mínimo (`hit`); los controles 48px (`control-h`); los botones principales 56px (`btn-h`); la tab bar 64px. Los controles visualmente más chicos (botón sm de 36px, icon-button sobre tarjeta de 36px) amplían su área táctil con un pseudo-elemento de 4px. Las listas agrupadas son inset con 20px de margen; las filas miden 52px como mínimo con separador indentado a 16px (60px con ícono líder). Los sheets dejan 48px de la pantalla visibles arriba. Las acciones del detalle se fijan abajo sobre un degradado de crema.

## Elevation & Depth

El sistema es casi plano y usa dos lenguajes de profundidad distintos. Los objetos tocables y chunky (tarjetas de tarea, cards, botones filled / prominent / bordered, icon-button bordered, stat tiles, hero del detalle, grupos de action sheet) llevan el sello de tinta: borde de 2px en tinta y una sombra dura, sin desenfoque, de 3px hacia abajo. Al presionar, el objeto baja 3px (`translateY(3px) scale(.98)` en botones) y la sombra se reduce a cero: se siente como un sello que se apoya en el papel. Lo que flota de verdad (sheets, alerts, menús, popovers, toasts) usa sombras ambientales cálidas y difusas. Las barras usan material translúcido con `saturate(160%) blur(18px)` sobre crema al 78 % (navbar) o al 90 % (toolbar).

En oscuro, el borde de tinta se vuelve transparente y el sello pasa a `0 3px 0 rgb(0 0 0 / .65)`; las sombras ambientales se oscurecen.

### Shadow Vocabulary
- **Sello** (`box-shadow: 0 3px 0 #151515`; oscuro `0 3px 0 rgb(0 0 0 / .65)`): reposo de todo objeto chunky tocable.
- **Sello presionado** (`box-shadow: 0 0 0 #151515` con `translateY(3px)`): estado activo.
- **Elev 1** (`box-shadow: 0 1px 0 rgb(21 21 21 / .06), 0 6px 18px rgb(60 52 20 / .10)`): popovers.
- **Elev 2** (`box-shadow: 0 2px 0 rgb(21 21 21 / .05), 0 18px 48px rgb(60 52 20 / .20)`): sheets, alerts, menús, toasts.
- **Tab bar** (`box-shadow: 0 10px 30px rgb(21 21 21 / .28)`): la píldora flotante.
- **Scrim** (`rgb(21 21 21 / .38)`, oscuro `rgb(0 0 0 / .55)`): detrás de sheets y alerts.

### Named Rules
**La Regla del Sello.** Si se toca y es un objeto (tarjeta, botón principal, tile), lleva borde de tinta de 2px y sombra dura de 3px, y se hunde al presionar. El sello es el material del mundo, no un adorno: no se le agrega desenfoque ni se cambia la distancia.

**La Regla de Flotar Solo lo Modal.** Las sombras difusas son exclusivas de lo que se superpone (sheets, alerts, menús, popovers, toasts, tab bar). Una tarjeta nunca flota.

## Shapes

Todo es redondo y gordo. Controles, chips, chips de estado, search, segmented, tab bar y sus ítems son píldoras (`full`). Las tarjetas de tarea, cards genéricas, skeletons y placas de ilustración usan 28px (`card`); los sheets 32px solo en las esquinas de arriba, y el hero del detalle 32px solo en las de abajo. Listas inset, alerts, menús, action sheets, toasts y stat tiles usan 22px (`lg`); inputs, wheels, popovers y la persona del selector 16px (`md`); ítems de menú 12px (`sm`). Avatares, swatches, días de la semana, emoji well y botones del stepper son círculos perfectos. Los bordes son de 2px (sello) o de 1px (separadores); el emoji well agrega un anillo punteado interno de 2px al 35 %. El campo de título del sheet de crear es la única excepción recta: sin radio, con línea inferior punteada de 2px que pasa a tinta al enfocar.

## Components

### Buttons
Píldoras chunky que se hunden al tocar.
- **Shape:** píldora (9999px), 48px de alto; grande 56px y 17px de texto; chico 36px y 14px.
- **Filled (principal):** mostaza con texto tinta, borde de 2px en tinta y sello. Es la acción principal: "Nueva tarea", "Hecha".
- **Prominent:** tinta con texto crema, borde y sello.
- **Bordered:** blanco con texto tinta, borde y sello (en oscuro, surface-2 sin borde).
- **Tinted / Gray / Plain:** mostaza suave, fill de tinta al 8 %, o transparente con peso 600; sin borde ni sello.
- **Destructive:** texto danger en plain y gray; relleno coral con texto tinta en filled.
- **Press:** `translateY(3px) scale(.98)` y la sombra a cero en 120ms ease-out; el rebote de vuelta usa el resorte (520ms).
- **Focus:** anillo doble `0 0 0 3px` del fondo + `0 0 0 5.5px` en tinta (mostaza en oscuro).
- **Disabled:** opacidad .42, sin sello ni transformación.
- **Icon button:** círculo de 44px sobre fill de tinta al 8 %; variantes ghost, ink (tinta con ícono crema), bordered (con sello) y on-card (36px, blanco al 55 % sobre el pastel). Al tocar escala a .92.

### Chips
- **Filtro:** píldora de 40px, trigo con texto tinta, 600 14px; seleccionado = tinta con texto crema. El conteo va a 700 12px con opacidad .7. Al tocar escala a .95.
- **Estado (dentro de la tarjeta):** píldora de 28px, 700 12.5px, punto de 7px en currentColor. Neutro: blanco al 62 % con tinta. Pronto: tinta con texto mostaza. Vencida: tinta con texto coral y el punto late (1.6s). Hecha: tinta con texto leaf. Funciona sobre cualquiera de los 20 pasteles.

### Cards / Containers
- **Tarjeta de tarea (componente firma):** fondo pastel elegido por el usuario (stone por defecto), radio 28px, borde de tinta 2px, sello, mínimo 216px de alto, padding 12 / 12 / 16 / 16px. Arriba: fila de 36px con icon-button on-card; centro: anillo de 92px con emoji; luego el nombre (card title, dos líneas) y al pie el chip de estado y el avatar. Toda la tarjeta es tocable y se hunde 3px.
- **Card genérica:** blanco, radio 28px, padding 20px, borde y sello; variante plana en trigo sin borde ni sombra.
- **Hero del detalle:** el mismo pastel de la tarjeta a sangre, radio 32px abajo, borde inferior de tinta y sello; anillo grande de 184px y título 800 30px.
- **Listas:** inset agrupadas en blanco, radio 22px, filas de 52px, separador de 1px indentado; ícono líder de 32px con radio 10px sobre trigo.

### Inputs / Fields
- **Style:** trigo, borde de 2px transparente, radio 16px, 48px de alto, 500 16px; label encima en 600 13px ink-muted.
- **Focus:** el borde pasa a tinta y el fondo a blanco (sin anillo de foco adicional).
- **Error / Disabled:** borde y ayuda en danger; deshabilitado a opacidad .5.
- **Search:** píldora en trigo de 48px; al enfocar, borde interior de 2px en tinta.
- **Selección:** segmented con thumb de tinta que se desliza con el resorte; switch de 56x34px que se llena de moss; stepper en píldora trigo con botones circulares blancos; selector de días con círculos de 44px (seleccionado = tinta); swatches de 44px con borde de tinta, check que se dibuja y anillo doble al seleccionar.

### Navigation
- **Tab bar:** cinco destinos (Inicio · Pendientes · Gestionar · Estadísticas · Ajustes); píldora flotante en tinta (oscuro #2A2A28 con filo crema al 8 %), 64px de alto y 8px de padding. Los ítems inactivos son círculos de 48px con ícono crema al 72 %; el activo se estira (flex-grow con el resorte), se rellena de mostaza y muestra su label en 700 14px.
- **Navbar:** estándar de 52px con material translúcido y título 700 17px centrado; grande transparente con large title alineado a la izquierda.
- **Sheets:** fondo crema, radio 32px arriba, grabber de 40x5px, cabecera en tres columnas (Cancelar · título 700 17px · acción principal en píldora mostaza pequeña, siempre visible aunque el teclado tape el pie), entra desde abajo con el resorte y se puede arrastrar; pie fijo con separador.
- **Toast:** tinta con texto crema (invertido en oscuro), radio 22px, 56px de alto; acción "Deshacer" en píldora mostaza y una huella de Lukas que aparece con el resorte.

### Pendientes de casa
Checklist aparte, sin anillo ni fecha. Captura rápida en una tarjeta sellada (input de 44 + botón "+" en tinta) que al enfocar muestra chips de responsable y "Pronto". Las filas van en un grupo blanco sellado con radio 22: checkbox circular de 28px (área de 44) que se rellena de tinta y dibuja el check, emoji automático, texto 600 16px y una meta con el responsable y la etiqueta mostaza "pronto". Al marcar, el texto se tacha con una línea de 2px, la fila se pliega y pasa a "Hechos" (grupo punteado, sin sello).

### Anillo de progreso
El corazón del producto. Círculo SVG que empieza a las 12, track de tinta al 15 % y progreso en tinta al 100 % con punta redonda; trazo de 8 (7 en el grande). Tamaños 92px (tarjeta) y 184px (hero), con el emoji de la tarea al centro al 36 % del tamaño. Si está vencida, un punto coral de 16px con borde de tinta late sobre las 12. El progreso transiciona en 420ms ease-out; al completar, el anillo se vacía en 640ms ease-in-out y salen hojitas. En 0 el trazo se oculta para no dejar un punto huérfano.

### Ilustraciones de Lukas
SVG dibujados a mano (sin dependencias), en tinta (`currentColor`) sobre papel crema (`--art-paper`), con los ojos en verde (art-eye) y las manchas de calicó en naranja (art-calico) como únicos colores. Motivos: ícono, cara, Lukas dormida en maceta, Lukas asomándose, brote y hoja. En oscuro se apoyan sobre una placa crema (paper) con radio 28px y 12px de padding. Animaciones lentas y en bucle: zetas que suben (3.2s), cola que se mece (4s), brote que crece y hojas que brotan con el resorte (2.4s); con movimiento reducido quedan quietas en su estado final.

### Íconos
Sprite SVG propio estilo Phosphor bold: 24px (18, 20 y 28 en variantes), trazo 2.25 con puntas y uniones redondas, en currentColor. Los emoji son contenido (tareas, avatares, botones de Telegram), nunca íconos de UI.

### Movimiento
Duraciones 120 / 200 / 280 / 420 / 640ms; ease-out `cubic-bezier(.16,1,.3,1)` para casi todo, ease-in `cubic-bezier(.7,0,.84,0)` para salidas, ease-in-out `cubic-bezier(.65,0,.35,1)`; resorte `linear()` muestreado (stiffness 400, damping 35) en 520ms para thumbs, switch, sheets, tab bar, swatches y rebotes; stagger de 40ms en la entrada de tarjetas. Transiciones de pantalla con View Transitions (push lateral de 280ms, cambio de tema con revelado circular de 520ms). Con `prefers-reduced-motion` el resorte se vuelve ease-out de 200ms, el sello deja de hundirse y los bucles se detienen.

## Do's and Don'ts

### Do:
- **Do** dibujar todo en una sola tinta (#151515): texto, trazos de 2px, anillos, íconos e ilustraciones.
- **Do** darle el sello (borde 2px en tinta + `0 3px 0`) a todo objeto chunky tocable y hundirlo 3px al presionar.
- **Do** usar mostaza (#F2CB66) para una sola acción principal por pantalla, siempre con texto tinta.
- **Do** escribir el estado con palabras dentro de un chip de tinta, además del color.
- **Do** mantener el texto de las tarjetas en #151515 y el pastel intacto en ambos temas.
- **Do** quitar el borde de tinta en oscuro y dejar el sello como sombra negra `0 3px 0 rgb(0 0 0 / .65)`.
- **Do** usar cifras tabulares en horas, fechas y conteos.
- **Do** respetar 44px de objetivo táctil (56px en botones principales) y ampliar el área de los controles chicos con un pseudo-elemento.

### Don't:
- **Don't** usar coral para nada que no sea vencido o destructivo.
- **Don't** introducir un azul de sistema u otro tinte interactivo: selección, enlace y foco van en tinta.
- **Don't** darle sombra difusa a una tarjeta ni desenfoque al sello; las sombras ambientales son solo para lo que se superpone.
- **Don't** usar emoji como íconos de UI; los íconos salen del sprite de trazo 2.25.
- **Don't** agregar a las ilustraciones otro color que no sea la tinta y el verde de los ojos de Lukas.
- **Don't** usar ink-faint (#8C876F) para texto que haya que leer.
- **Don't** escribir controles ni párrafos en Bricolage Grotesque.
