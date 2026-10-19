/* Comportamiento común del prototipo */
(function () {
  'use strict';
  const D = window.MPD_DATA;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Menú «Páginas del prototipo» */
  const btn = document.querySelector('.proto-btn');
  const panel = document.getElementById('proto-panel');
  if (btn && panel) {
    const toggle = (open) => { panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) { const a = panel.querySelector('[aria-current]') || panel.querySelector('a'); a && a.focus(); } };
    btn.addEventListener('click', () => toggle(panel.hidden));
    panel.querySelector('.proto-close').addEventListener('click', () => { toggle(false); btn.focus(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { toggle(false); btn.focus(); } });
    document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) toggle(false); });
  }

  /* Bloques que se arman desde la base de conocimiento */
  document.querySelectorAll('[data-render="sedes"]').forEach((el) => {
    el.innerHTML = D.circunscripciones.map((c) => `<div class="card sede"><b>${esc(c.n)}</b><span class="small">${esc(c.locs)}</span><br><span class="small"><span class="ph">${esc(c.sedes)}</span> · Teléfono <span class="ph">[a validar]</span></span></div>`).join('');
  });
  document.querySelectorAll('[data-render="circ-table"]').forEach((el) => {
    el.innerHTML = D.circunscripciones.map((c) => `<tr><td><b>${esc(c.n)}</b></td><td>${esc(c.locs)}</td><td>${esc(c.sedes)}</td></tr>`).join('');
  });

  /* Botones de demostración: explican qué haría la versión final */
  let toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'demo-toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('is-on'), 4200);
  }
  document.addEventListener('click', (e) => {
    const d = e.target.closest('[data-demo]');
    if (d) toast(d.dataset.demo);
  });
  window.MPDToast = toast;
})();
