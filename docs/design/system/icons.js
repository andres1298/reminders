/* =========================================================================
   Lukas — sprite de íconos (SVG propio, estilo Phosphor "bold": 24px,
   trazo 2.25 redondeado). Se tiñen con currentColor y --icon-stroke.
   Uso: <svg class="ico"><use href="#i-home"/></svg>
   Este archivo inyecta el sprite al inicio de <body>; funciona con file://.
   Nunca emoji como ícono de UI (los emoji son contenido: tareas, avatares).
   ========================================================================= */
(function () {
  const ICONS = {
    home: '<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19z"/>',
    manage: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="m3.5 6 1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5"/><circle cx="5.25" cy="18" r="1.5"/>',
    stats: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    'chevron-right': '<path d="m9 5 7 7-7 7"/>',
    'chevron-down': '<path d="m5 9 7 7 7-7"/>',
    'chevron-updown': '<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    'more-h': '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
    hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5M14 6a1.5 1.5 0 0 1 3 0v6"/><path d="M17 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.6a6 6 0 0 1-4.6-2.2l-3.5-4.4a1.6 1.6 0 0 1 2.5-2L8 15"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    snooze: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5M5 4 2.5 6.5M19 4l2.5 2.5"/>',
    skip: '<path d="M5 6v12l9-6z"/><path d="M18 6v12"/>',
    edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13M10 11v5M14 11v5"/>',
    restore: '<path d="M4 7h16M6 7l1 13h10l1-13"/><path d="M12 17v-6M9.5 13.5 12 11l2.5 2.5"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    repeat: '<path d="M4 11V9a3 3 0 0 1 3-3h12M16 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H5M8 21l-3-3 3-3"/>',
    rotate: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4.5h-4.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 19.5a6.5 6.5 0 0 1 13 0M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.5 13.6a6.5 6.5 0 0 1 4 5.9"/>',
    bell: '<path d="M6 16V10.5a6 6 0 0 1 12 0V16l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 4.5 4.5"/>',
    paw: '<ellipse cx="12" cy="16" rx="4.5" ry="3.8" fill="currentColor" stroke="none"/><circle cx="6" cy="10.5" r="2" fill="currentColor" stroke="none"/><circle cx="9.5" cy="6.5" r="2" fill="currentColor" stroke="none"/><circle cx="14.5" cy="6.5" r="2" fill="currentColor" stroke="none"/><circle cx="18" cy="10.5" r="2" fill="currentColor" stroke="none"/>',
    leaf: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19 13 11"/>',
    plant: '<path d="M12 20v-8M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 14c0-4 3-7 7-7 0 4-3 7-7 7z"/><path d="M7 20h10"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>',
    share: '<path d="M12 15V3.5M8 7l4-4 4 4"/><path d="M8 10.5H6.5a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-6.5a2 2 0 0 0-2-2H16"/>',
    send: '<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="m10 13 4.5-4.5"/>',
    chat: '<path d="M4 18.5V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H8z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    history: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5M12 8v4l3 2"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    umbrella: '<path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9zM12 12v6.5a2 2 0 0 1-4 0"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
    warning: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.3v.2"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    sparkle: '<path d="M12 3c.8 4.6 3.4 7.2 8 8-4.6.8-7.2 3.4-8 8-.8-4.6-3.4-7.2-8-8 4.6-.8 7.2-3.4 8-8z"/>',
    drop: '<path d="M12 3.5s6.5 7 6.5 11a6.5 6.5 0 0 1-13 0c0-4 6.5-11 6.5-11z"/>',
    todo: '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="m8 12.2 3 3 5.2-6"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  };
  const NAMES = Object.keys(ICONS);
  const sprite = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true">' +
    NAMES.map((n) => `<symbol id="i-${n}" viewBox="0 0 24 24">${ICONS[n]}</symbol>`).join('') + '</svg>';
  const inject = () => document.body.insertAdjacentHTML('afterbegin', sprite);
  if (document.body) inject(); else document.addEventListener('DOMContentLoaded', inject);
  window.LukasIcons = { names: NAMES, use: (n, cls = '') => `<svg class="ico ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>` };
})();
