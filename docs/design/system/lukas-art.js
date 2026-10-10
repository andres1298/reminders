/* =========================================================================
   Lukas — ilustraciones en tinta (SVG a mano, sin dependencias).
   Gata calicó: antifaz negro sobre orejas y ojos, raya blanca en la frente,
   hocico blanco con mancha canela (en trama de tinta), ojos verde-amarillo.

   Todo se tiñe con tokens:
     currentColor        → trazo de tinta  (pon `color: var(--ink)` en el contenedor)
     --art-paper         → relleno "papel" (blanco del pelaje, fondo de macetas)
     --art-eye           → único color además de la tinta (ojos)
   Uso:  el.innerHTML = LukasArt.icon()   | face() | sleepingPot() | peek() | sprout() | leaf()
   ========================================================================= */
(function () {
  const PAPER = 'var(--art-paper, #FBF6DC)';
  const EYE = 'var(--art-eye, #CBD45E)';
  let uid = 0;
  const id = (p) => `${p}${++uid}`;

  /* --- cabeza (coordenadas 0..200) ------------------------------------- */
  const HEAD =
    'M46 104 C43 82 45 54 54 28 C66 38 78 50 86 60 C95 57 105 57 114 60 ' +
    'C122 50 134 38 146 28 C155 54 157 82 154 104 C160 134 138 168 100 169 ' +
    'C62 168 40 134 46 104 Z';

  /* antifaz negro: tapa orejas, coronilla y ojos; deja la raya blanca */
  const MASK =
    'M18 120 L18 0 L182 0 L182 120 C168 130 142 131 129 121 C120 114 112 104 108 88 ' +
    'C105 76 103 66 101 56 L99 56 C97 66 95 76 92 88 C88 104 80 114 71 121 ' +
    'C58 131 32 130 18 120 Z';

  /* mechones del borde del antifaz (pelo, no curva perfecta) */
  const TUFTS =
    'M54 127 l2 5 l3 -4 M64 126 l2 5 l2 -5 ' +
    'M136 126 l2 5 l2 -5 M146 127 l3 4 l2 -5';

  const almond = (cx, cy, w, h, flip) => {
    const s = flip ? -1 : 1, hw = w / 2;
    return `M${cx - hw * s} ${cy} C${cx - hw * 0.45 * s} ${cy - h * 0.62} ${cx + hw * 0.5 * s} ${cy - h * 0.62} ${cx + hw * s} ${cy - h * 0.16} ` +
      `C${cx + hw * 0.5 * s} ${cy + h * 0.52} ${cx - hw * 0.5 * s} ${cy + h * 0.52} ${cx - hw * s} ${cy} Z`;
  };

  function eye(cx, cy, flip) {
    return `
      <path d="${almond(cx, cy, 36, 24, flip)}" fill="${PAPER}"/>
      <path d="${almond(cx, cy, 29, 19, flip)}" fill="${EYE}" stroke="currentColor" stroke-width="2"/>
      <ellipse cx="${cx + (flip ? -1 : 1)}" cy="${cy - 1}" rx="2.6" ry="7.6" fill="currentColor"/>
      <circle cx="${cx + (flip ? -5 : 5)}" cy="${cy - 5}" r="2.1" fill="${PAPER}"/>`;
  }

  function sleepyEye(cx, cy, flip) {
    const s = flip ? -1 : 1;
    return `<path d="M${cx - 13 * s} ${cy - 1} C${cx - 6 * s} ${cy + 7} ${cx + 6 * s} ${cy + 7} ${cx + 13 * s} ${cy - 2}"
      fill="none" stroke="${PAPER}" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M${cx + 9 * s} ${cy + 3} l${3 * s} 4 M${cx + 3 * s} ${cy + 5} l${1 * s} 4.5" stroke="${PAPER}" stroke-width="2" stroke-linecap="round"/>`;
  }

  function hatch(clipId, x0, y0, x1, y1, gap, angle, width) {
    let lines = '';
    for (let x = x0; x < x1; x += gap) lines += `M${x} ${y1} L${x + (y1 - y0) * angle} ${y0} `;
    return `<path d="${lines}" clip-path="url(#${clipId})" stroke="currentColor" stroke-width="${width}" stroke-linecap="round"/>`;
  }

  /* cara completa (despierta o dormida) en el sistema 0..200 */
  function headGroup({ sleeping = false } = {}) {
    const clip = id('lk-head'), tan = id('lk-tan');
    const TAN = 'M98 135 C88 129 70 129 60 141 C63 155 82 162 97 153 Z';
    return `
    <defs>
      <clipPath id="${clip}"><path d="${HEAD}"/></clipPath>
      <clipPath id="${tan}"><path d="${TAN}"/></clipPath>
    </defs>
    <path d="${HEAD}" fill="${PAPER}"/>
    <path d="${MASK}" fill="currentColor" clip-path="url(#${clip})"/>
    <path d="${TUFTS}" fill="currentColor" clip-path="url(#${clip})"/>
    ${hatch(tan, 18, 126, 102, 164, 3.6, 1, 1.5)}
    <path d="${HEAD}" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>
    <path d="M60 46 C65 53 70 58 76 62 M64 40 l5 12 M140 46 C135 53 130 58 124 62 M136 40 l-5 12"
      fill="none" stroke="${PAPER}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M99 64 l0 8 M96 74 l1 6 M104 74 l-1 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    ${sleeping ? sleepyEye(75, 106) + sleepyEye(125, 106, true) : eye(75, 106) + eye(125, 106, true)}
    <path d="M92 128 C95 123.5 105 123.5 108 128 L100 135.5 Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M100 135.5 V140 M100 140 C97 145.5 90 145.5 87.5 141 M100 140 C103 145.5 110 145.5 112.5 141"
      fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M70 140 C52 135 36 134 16 136 M70 146 C52 147 36 151 20 158 M72 135 C56 127 42 122 26 119
             M130 140 C148 135 164 134 184 136 M130 146 C148 147 164 151 180 158 M128 135 C144 127 158 122 174 119"
      fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <g fill="currentColor">
      <circle cx="118" cy="146" r="1.1"/><circle cx="123" cy="141" r="1"/><circle cx="114" cy="140" r=".9"/>
      <circle cx="122" cy="150" r=".9"/><circle cx="58" cy="128" r="1"/><circle cx="144" cy="130" r="1"/>
      <circle cx="128" cy="157" r="1"/><circle cx="72" cy="158" r=".9"/>
    </g>`;
  }

  function leafPath(d, rib, veins) {
    return `<path d="${d}" fill="${PAPER}" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
      <path d="${rib}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="${veins}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`;
  }

  const LukasArt = {
    /* cara despierta — avatar del bot, onboarding, encabezados */
    face(opts = {}) {
      return `<svg viewBox="0 0 200 200" role="img" aria-label="Lukas" class="lukas-art">${headGroup(opts)}</svg>`;
    },

    /* ícono de la app / favicon: cara en tinta sobre crema */
    icon({ bg = '#FBF6DC', ink = '#151515', eye = '#CBD45E', radius = 44 } = {}) {
      return `<svg viewBox="0 0 200 200" role="img" aria-label="Lukas" style="color:${ink};--art-paper:${bg};--art-eye:${eye}">
        <rect width="200" height="200" rx="${radius}" fill="${bg}"/>
        <g transform="translate(4 8) scale(.96)">${headGroup()}</g>
      </svg>`;
    },

    /* estado vacío "Nada pendiente": Lukas dormida dentro de una maceta */
    sleepingPot() {
      const pot = id('lk-pot'), body = id('lk-body'), bodyD = 'M58 132 C60 88 118 72 160 78 C196 84 212 106 208 132 Z';
      return `<svg viewBox="0 0 260 226" role="img" aria-label="Lukas duerme dentro de una maceta" class="lukas-art lukas-sleep">
        <defs>
          <clipPath id="${pot}"><path d="M52 154 L70 212 H190 L208 154 Z"/></clipPath>
          <clipPath id="${body}"><path d="${bodyD}"/></clipPath>
        </defs>
        <g class="lk-leaves">
          <g transform="translate(196 22) rotate(34)">${leafPath('M0 92 C-26 58 -20 16 0 -6 C20 16 26 58 0 92 Z', 'M0 92 V4', 'M0 70 l-12 -12 M0 52 l13 -12 M0 34 l-10 -10 M0 78 l12 -9')}</g>
          <g transform="translate(150 30) rotate(-8)">${leafPath('M0 64 C-16 42 -12 12 0 -4 C12 12 16 42 0 64 Z', 'M0 64 V2', 'M0 46 l-8 -8 M0 30 l8 -8')}</g>
        </g>
        <path d="${bodyD}" fill="${PAPER}" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
        <path d="M128 76 C160 70 196 86 204 114 C182 106 156 102 132 92 Z" fill="currentColor" clip-path="url(#${body})"/>
        <path d="M150 112 l6 -4 M164 116 l6 -3 M176 120 l5 -4 M98 104 l5 -2 M88 114 l5 -3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <g transform="translate(30 30) rotate(-7 55 60) scale(.56)">${headGroup({ sleeping: true })}</g>
        <path d="M44 128 H216 a6 6 0 0 1 6 6 V148 a6 6 0 0 1 -6 6 H44 a6 6 0 0 1 -6 -6 V134 a6 6 0 0 1 6 -6 Z"
          fill="${PAPER}" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
        <path d="M184 134 v14 M192 134 v14 M200 134 v14 M208 134 v14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M52 154 L70 212 H190 L208 154 Z" fill="${PAPER}" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
        ${hatch(pot, 166, 154, 214, 214, 7, -0.16, 1.8)}
        <path d="M64 170 H196" stroke="currentColor" stroke-width="2" stroke-dasharray="1 7" stroke-linecap="round"/>
        <g class="lk-paw">
          <path d="M112 128 C112 120 140 118 144 126 C146 134 140 140 128 140 C116 140 112 136 112 128 Z" fill="${PAPER}" stroke="currentColor" stroke-width="3.4"/>
          <path d="M124 132 v6 M132 131 v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </g>
        <path class="lk-tail" d="M204 124 C230 124 240 150 226 170 C218 180 204 176 208 164" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
        <path d="M222 140 l5 3 M226 154 l5 0" stroke="${PAPER}" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M40 218 h16 M64 218 h8 M190 218 h10 M206 218 h18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
        <g class="lk-z" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
          <path class="z1" d="M42 46 h12 l-12 12 h12"/>
          <path class="z2" d="M22 20 h9 l-9 9 h9"/>
        </g>
      </svg>`;
    },

    /* Lukas asomándose desde abajo (fin de la lista) */
    peek() {
      const c = id('lk-peek');
      return `<svg viewBox="0 0 200 104" role="img" aria-label="Lukas se asoma" class="lukas-art lukas-peek">
        <defs><clipPath id="${c}"><rect x="0" y="0" width="200" height="86"/></clipPath></defs>
        <g clip-path="url(#${c})"><g class="lk-peek-head" transform="translate(30 -6) scale(.7)">${headGroup()}</g></g>
        <path d="M8 86 H192" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        <path d="M36 86 C34 76 54 74 56 84 Z M144 84 C146 74 166 76 164 86 Z" fill="${PAPER}" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M44 80 v4 M50 80 v4 M150 80 v4 M156 80 v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M14 96 h16 M170 96 h16" stroke="currentColor" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>
      </svg>`;
    },

    /* carga larga: brote que crece en una macetita */
    sprout() {
      return `<svg viewBox="0 0 80 80" role="img" aria-label="Cargando" class="lukas-art lukas-sprout">
        <path class="sp-stem" d="M40 60 C40 48 40 40 41 30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" pathLength="1"/>
        <path class="sp-leaf sp-l" d="M40 42 C30 42 24 36 22 28 C32 28 38 33 40 42 Z" fill="${PAPER}" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
        <path class="sp-leaf sp-r" d="M41 33 C50 33 57 27 58 18 C48 18 42 24 41 33 Z" fill="${PAPER}" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M22 58 H58 L54 74 H26 Z" fill="${PAPER}" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
        <path d="M48 62 l-2 9 M53 62 l-2 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>`;
    },

    /* hojita para el confeti al completar */
    leaf(fill = 'var(--leaf)') {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21 C3 10 10 3 21 3 C21 14 14 21 3 21 Z" style="fill:${fill}" stroke="#151515" stroke-width="2" stroke-linejoin="round"/><path d="M4 20 L15 9" stroke="#151515" stroke-width="1.4" stroke-linecap="round"/></svg>`;
    },
  };

  window.LukasArt = LukasArt;
})();
