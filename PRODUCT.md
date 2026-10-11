# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Web app mobile-first (PWA "Agregar a inicio"), pensada sobre todo para iPhone. El sistema de diseño sigue la estructura de Apple HIG (roles de color, estilos de texto, barras, sheets), pero es una web, no una app nativa.

## Stack

App: Next.js (App Router) + Tailwind CSS v4 + Supabase, con Motion y la View Transitions API (ver `docs/SPEC.md` §9). Prototipo de diseño: HTML/CSS/JS estático y autocontenido en `docs/design/prototype/`.

## Users

Un hogar pequeño: Andrés y Mari (y la gata Lukas), más algunos conocidos que entran por invitación y crean sus propios hogares. Abren la app en el celular, varias veces al día y por pocos segundos: para ver qué toca, marcar algo como hecho o crear una tarea nueva en menos de 10 segundos.

## Product Purpose

Llevar control de **cada cuánto se hace cada tarea del hogar** y **a quién le toca**, sin convertirlo en motivo de discusión. Cada tarea es una tarjeta con un anillo que se llena a medida que se acerca el momento de hacerla otra vez; al marcarla como hecha, el anillo se reinicia. Lo logra si de un vistazo se ve qué está vencido, qué toca pronto y a quién le toca.

## Positioning

No es un calendario de eventos ni un gestor de tareas genérico: es un ciclo, con anillo por tarea, crédito opcional ("La hizo alguien más") y una mascota real (Lukas). Nunca registra automáticamente quién tocó "Hecha".

## Operating Context

- Uso en el celular, de pie, en la cocina o la sala; a menudo con una mano.
- Recordatorios por Telegram con los mismos botones que la app ("✅ Hecha", "🙋 La hizo alguien más", "⏰ +1 h").
- Widgets de iPhone vía Scriptable con el mismo lenguaje visual (anillos, colores).
- Zona horaria del hogar (por defecto `America/Costa_Rica`). Español por defecto, también inglés.

## Capabilities and Constraints

Ver `docs/SPEC.md` v0.7 (fuente de verdad del producto): lista aparte de Pendientes de casa sin fecha; cuatro tipos de programación (Intervalo, Días de la semana, Día del mes, Una vez) con hora; responsables Cualquiera / Fijo / Rotación; posponer, saltar, deshacer; pausar solo desde Gestionar; modo vacaciones; borrado lógico y Papelera; estadísticas por crédito y por responsable. Fuera de alcance: gamificación, subtareas, notificaciones push o email, app nativa.

## Brand Commitments

- Nombre y mascota: **Lukas**, gata calicó real (blanca con manchas negras y naranjas, ojos verde-amarillo). Foto de referencia: `docs/design/refs/lukas.jpg`. Aparece en todos lados: ícono, favicon, bot, estados vacíos, carga, onboarding.
- Ilustraciones en tinta tipo grabado/sello sobre crema (`docs/design/refs/ink-illustration.png`); además de la tinta, Lukas lleva sus manchas naranjas de calicó y los ojos verde-amarillo (confirmado en las rondas de diseño).
- Paleta, tipografía (Bricolage Grotesque + DM Sans), radios y borde de tinta de 2px tipo sello fijados en `docs/SPEC.md` §5.
- Tema base: claro crema; el oscuro es un tema de primera clase.
- Sensación buscada: **calma doméstica**. Se ve de un vistazo qué toca, sin culpa; lo vencido se nota pero no grita.
- Bot de Telegram: **Lukas-remind-it**.

## Evidence on Hand

Referencias visuales en `docs/design/refs/` (ui-chunky-cards.jpg, ink-illustration.png, mindr-grid.png, mindr-create.png, lukas.jpg). No hay usuarios externos, testimonios ni métricas: no se inventan.

## Product Principles

1. Un vistazo basta: estado, plazo y responsable se leen sin tocar nada.
2. Un toque para cumplir: completar es la acción principal y siempre se puede deshacer.
3. Sin cuentas a escondidas: el crédito es opcional y nunca se registra quién tocó.
4. Nada se pierde: borrar oculta, no destruye.
5. La casa tiene personalidad: Lukas acompaña, nunca estorba.

## Accessibility & Inclusion

Contraste AA en ambos temas; el estado nunca depende solo del color (siempre hay texto); objetivos táctiles ≥ 44 px (botones principales 56 px); foco visible; `prefers-reduced-motion` reemplaza movimientos por fundidos cortos y quita el confeti; usable desde 360 px.
