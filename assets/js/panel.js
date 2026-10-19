/* Panel de la Defensa · conversaciones para revisar */
(function () {
  'use strict';
  const D = window.MPD_DATA;
  const ESTILO = {
    'No supo responder': 'background:#E3EEF0;color:#183A43',
    'Situación crítica': 'background:#8F3A1C;color:#fff',
    'Valoración negativa': 'background:#F3EEE6;color:#6B4A1E',
    'Informe de error': 'background:#fff;color:#8F3A1C;border:1px solid #8F3A1C'
  };
  const FILTROS = ['Todas'].concat(Object.keys(ESTILO));
  const S = { filtro: 'Todas', hechos: [] };
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function render() {
    const vivos = D.revision.filter((d) => S.hechos.indexOf(d.id) < 0);
    const vis = vivos.filter((d) => S.filtro === 'Todas' || d.tipo === S.filtro);
    document.querySelectorAll('[data-pendientes]').forEach((el) => { el.textContent = vivos.length; });
    $('[data-filtros]').innerHTML = FILTROS.map((t) => {
      const n = t === 'Todas' ? vivos.length : vivos.filter((d) => d.tipo === t).length;
      return `<button type="button" class="chip${t === S.filtro ? ' chip-on' : ''}" aria-pressed="${t === S.filtro}" data-f="${esc(t)}">${esc(t)} (${n})</button>`;
    }).join('');
    $('[data-items]').innerHTML = vis.map((d) => `<li id="rev-${d.id}" style="display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;padding:14px 0;border-top:1px solid #E3E8EA">
      <span class="tag" style="${ESTILO[d.tipo]}">${esc(d.tipo)}</span>
      <span style="flex:1 1 320px;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-weight:700">${esc(d.texto)}</span><span class="small muted">${esc(d.detalle)}</span></span>
      <span class="small muted" style="min-width:110px">${esc(d.cuando)}</span>
      <span style="display:flex;flex-wrap:wrap;gap:8px"><a class="btn" href="${d.href}">${esc(d.accion)}</a><button type="button" class="btn btn-p" data-hecho="${d.id}">Marcar como revisada</button></span>
    </li>`).join('');
    $('[data-vacio]').hidden = vis.length > 0;
  }
  document.addEventListener('click', (e) => {
    const f = e.target.closest('[data-f]');
    if (f) { S.filtro = f.dataset.f; render(); document.querySelector(`[data-f="${CSS.escape(S.filtro)}"]`).focus(); return; }
    const h = e.target.closest('[data-hecho]');
    if (h) {
      S.hechos.push(Number(h.dataset.hecho));
      render();
      $('[data-live]').textContent = 'Conversación marcada como revisada.';
      const first = document.querySelector('[data-hecho]') || document.querySelector('[data-f]');
      if (first) first.focus();
    }
  });
  const src = document.querySelector('[data-ventana-src]');
  if (src) src.textContent = new URL('assets/js/ventana.js', location.href).href;
  render();
})();
