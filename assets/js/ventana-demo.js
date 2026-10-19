/* Ventana flotante simulada sobre el sitio actual del MPD. */
(function () {
  'use strict';
  const win = document.getElementById('wg-win');
  const bubble = document.getElementById('wg-bubble');
  const btn = document.getElementById('wg-launch');
  const label = btn.querySelector('[data-wg-label]');
  let open = true;
  function set(v, focus) {
    open = v;
    win.hidden = !open;
    bubble.hidden = open;
    btn.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Cerrar el asistente' : '¿Necesitás orientación?';
    if (open && focus && chat) chat.focus();
    if (!open && focus) btn.focus();
  }
  const chat = window.MPDChat.mount(win, { escena: 'menu', marco: 'flotante', onClose: () => set(false, true) });
  btn.addEventListener('click', () => set(!open, true));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open && win.contains(document.activeElement)) set(false, true); });
  // Muestra la dirección real del script de instalación.
  const src = document.querySelector('[data-ventana-src]');
  if (src) src.textContent = new URL('assets/js/ventana.js', location.href).href;
})();
