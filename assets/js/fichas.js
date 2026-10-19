/* Panel de la Defensa · edición de fichas (los cambios quedan en esta pestaña) */
(function () {
  'use strict';
  const D = window.MPD_DATA;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = window.MPDChat.norm;
  const ESTADO = {
    'Vigente': 'background:#E3EEF0;color:#183A43',
    'Por vencer': 'background:#F2C6B1;color:#1F2933',
    'En revisión': 'background:#F3EEE6;color:#6B4A1E',
    'Borrador': 'background:#fff;color:#4B5864;border:1px solid #9FB1B6'
  };
  const PRIO = { Emergencia: 'background:#8F3A1C;color:#fff', Urgente: 'background:#F2C6B1;color:#1F2933', Habitual: 'background:#E3EEF0;color:#183A43' };

  // Copia editable de las fichas.
  const F = {};
  Object.keys(D.fichas).forEach((k) => { F[k] = Object.assign({}, D.fichas[k], { llevar: D.fichas[k].llevar.slice(), palabras: (D.fichas[k].palabras || []).slice() }); });
  let sel = Object.keys(F).includes(location.hash.slice(1)) ? location.hash.slice(1) : 'alimentos';
  let nuevas = 0;

  function lista() {
    const q = norm($('#buscar-ficha').value.trim());
    const keys = Object.keys(F);
    let vis = 0;
    $('[data-lista]').innerHTML = keys.map((k) => {
      const f = F[k];
      const match = !q || norm([f.titulo, f.tema, f.servicio].concat(f.palabras).join(' ')).includes(q);
      if (match) vis++;
      return `<button type="button" class="row${k === sel ? ' row-on' : ''}" aria-pressed="${k === sel}" data-sel="${k}"${match ? '' : ' hidden'}>
        <span style="flex:1 1 auto;min-width:0;display:flex;flex-direction:column"><span style="font-weight:700">${esc(f.titulo || 'Ficha sin título')}</span><span class="small muted">${esc(f.tema)} · ${f.rev ? 'Revisada el ' + esc(f.rev) : 'Sin publicar'}</span></span>
        <span class="tag" style="${ESTADO[f.estado]}">${esc(f.estado)}</span></button>`;
    }).join('');
    $('[data-count]').textContent = '(' + (q ? vis + ' de ' : '') + keys.length + ')';
    $('[data-sin-res]').hidden = vis > 0;
  }

  function editor() {
    const f = F[sel];
    $$('[data-campo]').forEach((el) => {
      const k = el.dataset.campo;
      el.value = k === 'llevar' ? f.llevar.join('\n') : (f[k] || '');
    });
    const est = $('[data-estado]');
    est.textContent = f.estado; est.setAttribute('style', ESTADO[f.estado]);
    palabras();
    preview();
  }
  function palabras() {
    $('[data-palabras]').innerHTML = F[sel].palabras.map((w, i) => `<span class="kw">${esc(w)}<button type="button" data-del-palabra="${i}" aria-label="Quitar «${esc(w)}»" style="margin-left:6px;border:0;background:transparent;color:inherit;cursor:pointer;font-size:15px;line-height:1;padding:0 2px">×</button></span>`).join('');
  }
  function sede(f, loc) {
    if (f.sinLoc) return 'La defensoría que corresponda a tu caso. [Teléfonos a validar]';
    const l = D.localidades.find((x) => x.t === loc);
    return 'Defensoría ' + (f.corto || 'Civil') + ', ' + (l ? l.circ : 'la sede más cercana') + '. [Dirección y horario a validar]';
  }
  function preview() {
    const f = F[sel];
    const loc = $('[data-prev-loc]').value;
    $('[data-preview]').innerHTML = `<div style="border:1px solid #C9D3D6;border-radius:12px;overflow:hidden;background:#fff">
      <div style="padding:10px 14px;background:#E3EEF0;display:flex;flex-direction:column"><span style="font-size:12.5px;font-weight:700;color:#24505C">${esc(f.servicio)}</span><span style="font-family:Lexend,sans-serif;font-weight:600">${esc(f.titulo)}</span></div>
      <div style="padding:12px 14px;display:flex;flex-direction:column;gap:8px;font-size:15px">
        <div><span style="display:block;font-weight:700;font-size:13px;color:#24505C">Qué hace</span>${esc(f.que)}</div>
        <div><span style="display:block;font-weight:700;font-size:13px;color:#24505C">Quién puede acceder</span>${esc(f.quien)}</div>
        <div><span style="display:block;font-weight:700;font-size:13px;color:#24505C">A dónde ir</span>${esc(sede(f, loc))}</div>
        <div><span style="display:block;font-weight:700;font-size:13px;color:#24505C">Qué llevar</span><ul style="margin:0;padding-left:18px">${f.llevar.filter(Boolean).map((x) => '<li>' + esc(x) + '</li>').join('')}</ul></div>
        ${f.nota ? `<p style="margin:0;padding:8px 10px;border-radius:8px;background:#F3EEE6;font-size:14px">${esc(f.nota)}</p>` : ''}
      </div></div>
      <span style="font-size:12.5px;color:#4B5864">Ficha «${esc(f.titulo)}» · ${f.rev ? 'Revisada el ' + esc(f.rev) : 'Borrador, texto provisional'}</span>`;
  }

  // Edición de campos
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-campo]');
    if (!el) return;
    const k = el.dataset.campo;
    F[sel][k] = k === 'llevar' ? el.value.split('\n') : el.value;
    preview();
    if (k === 'titulo' || k === 'tema') lista();
  });
  document.addEventListener('change', (e) => { if (e.target.matches('[data-campo="tema"]')) lista(); if (e.target.matches('[data-prev-loc]')) preview(); });
  $('#buscar-ficha').addEventListener('input', lista);

  function addPalabra() {
    const inp = $('#f-palabra');
    const w = inp.value.trim();
    if (!w) return inp.focus();
    F[sel].palabras.push(w); inp.value = '';
    palabras(); inp.focus();
  }
  $('#f-palabra').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addPalabra(); } });

  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-sel]');
    if (s) { sel = s.dataset.sel; history.replaceState(null, '', '#' + sel); lista(); editor(); $(`[data-sel="${sel}"]`).focus(); return; }
    if (e.target.closest('[data-add-palabra]')) return addPalabra();
    const dp = e.target.closest('[data-del-palabra]');
    if (dp) { F[sel].palabras.splice(Number(dp.dataset.delPalabra), 1); palabras(); $('#f-palabra').focus(); return; }
    const ac = e.target.closest('[data-accion]');
    if (ac) {
      F[sel].estado = ac.dataset.accion;
      lista(); editor();
      $('[data-ok]').textContent = ac.dataset.accion === 'Borrador' ? 'Borrador guardado (solo en esta pestaña).' : 'Enviada a revisión del área responsable.';
      return;
    }
    if (e.target.closest('[data-nueva]')) {
      const k = 'nueva' + (++nuevas);
      F[k] = { titulo: '', tema: 'Familia y vivienda', servicio: 'Defensoría Civil', corto: 'Civil', estado: 'Borrador', rev: '', prox: '', que: '', quien: '', llevar: [''], nota: '', palabras: [] };
      sel = k; lista(); editor(); $('#f-titulo').focus();
    }
  });

  // Selector de localidad de la vista previa
  $('[data-prev-loc]').innerHTML = D.localidades.map((l) => `<option${l.t === 'Zapala' ? ' selected' : ''}>${esc(l.t)}</option>`).join('') + '<option>Otra localidad</option>';

  // Directorio y mensajes de urgencia (desde la base de conocimiento)
  $('[data-directorio]').innerHTML = Object.values(D.derivaciones).map((d) => `<tr><td><b>${esc(d.org)}</b></td><td>${esc(d.para)}</td><td>${esc(d.contacto)}</td><td><span class="tag" style="${PRIO[d.prio]}">${esc(d.prio)}</span></td></tr>`).join('');
  $('[data-urgencias]').innerHTML = Object.values(D.urgencias).map((u) => `<div style="padding:16px;border-radius:10px;border:1px solid #E7C3B3;background:#FBF4F0;display:flex;flex-direction:column;gap:8px">
    <span class="h3">${esc(u.nombre)}</span><strong class="small">${esc(u.titulo)}</strong><span class="small">${esc(u.texto)}</span>
    <span class="small muted">Líneas: ${u.lineas.map((n) => esc(D.lineas[n].n + ' (' + D.lineas[n].t + ')')).join(' · ')}</span>
    <span class="tag" style="align-self:flex-start;background:#F3EEE6;color:#6B4A1E">${esc(u.estado)}</span></div>`).join('');

  lista(); editor();
})();
