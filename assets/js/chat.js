/* ==========================================================================
   Asistente de orientación · motor del chat
   - Capa 1: menús guiados con respuestas fijas (fichas de MPD_DATA).
   - Capa 2 (simulada): texto libre → clasificador por reglas → misma ficha.
   Los mensajes se agregan al registro sin volver a dibujar la conversación,
   para que los lectores de pantalla anuncien solo lo nuevo.
   ========================================================================== */
window.MPDChat = (function () {
  'use strict';
  const D = window.MPD_DATA;
  const EXIT_URL = 'https://www.google.com.ar';

  /* ---------- Utilidades ---------- */
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function h(tag, attrs, kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    (Array.isArray(kids) ? kids : kids == null ? [] : [kids]).forEach((c) => {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }
  const ICON = {
    trash: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    grid: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
    send: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
    doc: '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/></svg>',
    check: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>',
    warn: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" class="mc-warn"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/></svg>',
    logo: '<svg width="38" height="38" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#fff"/><path d="M11 12h18a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9l-6 5v-5h-3a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3z" fill="#24505C"/><circle cx="15" cy="19.5" r="1.7" fill="#fff"/><circle cx="20" cy="19.5" r="1.7" fill="#fff"/><circle cx="25" cy="19.5" r="1.7" fill="#F2C6B1"/></svg>'
  };

  /* ---------- Salida rápida ---------- */
  // Reemplaza la página actual (no abre otra pestaña) para que el chat no quede
  // en el historial. Si el asistente está dentro de un iframe, sale la página entera.
  function quickExit(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    try { sessionStorage.clear(); } catch (x) { /* sin almacenamiento */ }
    try { window.top.location.replace(EXIT_URL); } catch (x) { location.replace(EXIT_URL); }
  }

  /* ---------- Clasificador (capa 2 simulada) ---------- */
  function findLoc(low) {
    return D.localidades.find((l) => [l.t].concat(l.alias || []).some((n) => low.includes(norm(n)))) || null;
  }
  function hasPersonal(t, low) {
    return /\b\d{7,8}\b/.test(t.replace(/\./g, ''))
      || /\b\d{2}-\d{8}-\d\b/.test(t)
      || /[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(t)
      || /\b(me llamo|mi nombre es|mi apellido es)\b/.test(low);
  }
  const TOPICS = [
    [/(alimento|cuota|manutencion|plata para (los chicos|mi hij))/, 'alimentos', 'Entiendo que necesitás resolver una cuota alimentaria. La Defensoría Civil puede ayudarte.'],
    [/(desaloj|alquiler|me echan|inquilin)/, 'desalojo', 'Entiendo: tu consulta es sobre un desalojo o tu vivienda. La Defensoría Civil puede asesorarte y representarte.'],
    [/(tenencia|visitas|regimen de comunicacion|cuidado personal|ver a mis hij|ver a mi hij)/, 'cuidado', 'Entiendo que tu consulta es sobre el cuidado de tus hijas o hijos. La Defensoría Civil puede acompañarte.'],
    [/(divorci|separar|separacion|union convivencial)/, 'divorcio', 'Entiendo que querés divorciarte o terminar una unión. La Defensoría Civil puede acompañarte.'],
    [/(me citaron|citacion|me acusan|acusad|imputad|declarar)/, 'acusado', 'Entiendo que te citaron o te acusan de un delito. Tenés derecho a una defensa.'],
    [/(detuv|detenid|preso|presa|comisaria|carcel)/, 'detenido', 'Entiendo que detuvieron a una persona. Toda persona detenida tiene derecho a una defensa.'],
    [/(mi defensor|mi defensora|mi abogad)/, 'contacto', 'Para comunicarte con tu defensora o defensor, te dejo los pasos.'],
    [/(internad|internacion|salud mental)/, 'internacion', 'Entiendo que tu consulta es sobre una internación por salud mental.'],
    [/(capacidad juridica|apoyos para|curatela|insania)/, 'apoyos', 'Entiendo que tu consulta es sobre apoyos para tomar decisiones.'],
    [/(maltrato infantil|abuso infantil|(nino|nina|chico|chica|nene|nena) en (riesgo|peligro))/, 'ninez', 'Entiendo que una niña, un niño o un adolescente necesita protección.']
  ];

  // Devuelve el nodo de la conversación que corresponde a un texto libre.
  function classify(t) {
    const low = norm(t);
    if (hasPersonal(t, low)) return { k: 'privacidad' };
    const loc = findLoc(low);
    const menor = /\b(tengo|tiene) (1[0-7]|[5-9]) anos\b|\bsoy (menor|chic[oa]|nen[ae]|adolescente)\b/.test(low);
    const riesgoNnya = /(me escribe|me manda|me pide|fotos|videos|instagram|tiktok|whatsapp|discord|un hombre|un senor|me toca|me pega|abus|tengo miedo|me amenaza|peligro)/.test(low);
    if (menor && riesgoNnya) return { k: 'critica_nnya' };
    if (/(no puedo hablar|no puedo llamar|no puedo hacer ruido|me esta escuchando|me escucha|me esta mirando|me revisa el (celular|telefono))/.test(low)) return { k: 'critica_silencio' };
    if (/(me esta pegando|me pega|me pego|me quiere matar|me va a matar|nos quiere matar|esta aca|esta afuera|tengo miedo|me amenaza|me esta siguiendo|me golpea|me golpeo)/.test(low)) return { k: 'critica' };
    if (/(matarme|me quiero matar|suicid|no quiero vivir|quitarme la vida|hacerme dano|lastimarme|no aguanto mas)/.test(low)) return { k: 'critica_salud' };
    if (menor) return { k: 'nnya' };
    if (/(hablar con (alguien|una persona|un humano)|no me (estas )?entend|humano|operador|persona real)/.test(low)) return { k: 'humano' };
    if (/(expediente|mi causa|legajo|como va mi|como sigue mi|estado de mi|mi audiencia)/.test(low)) return { k: 'fuera' };
    if (/denunci/.test(low)) return { k: 'denuncia' };
    if (/guardia/.test(low)) return { k: 'ficha', a: { f: 'detenido', loc: loc && loc.t }, nat: 'La guardia penal atiende a personas detenidas y a sus familias. Te dejo los datos.' };
    const hit = TOPICS.find((r) => r[0].test(low));
    if (hit) return { k: 'ficha', a: { f: hit[1], loc: loc && loc.t }, nat: hit[2] };
    if (/(violencia|golpe|maltrat|perimetral|restriccion de acercamiento)/.test(low)) return { k: 'violencia' };
    if (/(certificado (unico )?de discapacidad|\bcud\b)/.test(low)) return { k: 'cud' };
    if (/(despid|trabajo|laboral|patron|sueldo|aguinaldo|indemniz)/.test(low)) return { k: 'trabajo' };
    if (/(deuda|banco|tarjeta|compra|consumo|empresa|factura|embarg)/.test(low)) return { k: 'consumo' };
    if (/(donde queda|donde esta|direccion|donde (voy|tengo que ir)|sede|defensoria (de|en|mas cercana))/.test(low)) return { k: 'sede', a: { loc: loc && loc.t } };
    if (/(no puedo pagar|no tengo (plata|dinero)|sin plata|defensor(a)? (publico|publica|oficial|gratis)|necesito un(a)? (defensor|abogad))/.test(low)) return { k: 'acceso' };
    if (/(cuanto cuesta|cuanto sale|gratis|gratuito|cobran|tengo que pagar|costo)/.test(low)) return { k: 'costo' };
    if (/^(hola|buen(os|as)|que tal|menu|temas)\b/.test(low)) return { k: 'menu' };
    if (loc) return { k: 'sede', a: { loc: loc.t } };
    return { k: 'nolose' };
  }

  const LABELS = {
    acceso: 'Explicación de quién puede acceder', denuncia: 'Derivación al Ministerio Público Fiscal', critica: 'Mensaje fijo de violencia en curso',
    critica_silencio: 'Mensaje fijo de violencia sin poder hablar', critica_nnya: 'Mensaje fijo para niñas, niños y adolescentes', critica_salud: 'Mensaje fijo de salud mental',
    fuera: 'Límite del servicio', humano: 'Derivación a una persona', trabajo: 'Derivación al organismo laboral', consumo: 'Derivación a Defensa del Consumidor',
    cud: 'Derivación por certificado de discapacidad', costo: 'Respuesta sobre el costo', privacidad: 'Mensaje borrado por datos personales',
    nnya: 'Pregunta de peligro para menores de 18', violencia: 'Pregunta de peligro (violencias)', menu: 'Menú de temas', nolose: '«No tengo información validada»'
  };
  function label(r) {
    if (r.k === 'ficha') return 'Ficha «' + D.fichas[r.a.f].titulo + '»' + (r.a.loc ? ' · ' + r.a.loc : '');
    if (r.k === 'sede') return r.a && r.a.loc ? 'Sede de ' + r.a.loc : 'Pregunta la localidad (no la reconoció)';
    return LABELS[r.k] || r.k;
  }

  /* ---------- Contenido de cada paso ---------- */
  const VOLVER = { t: 'Volver a los temas', k: 'menu' };
  const HUMANO = { t: 'Hablar con una persona', k: 'humano' };
  const SALIDA = { t: 'Salida rápida', salida: true };
  const PREGUNTA = '¿Sobre qué tema es tu consulta? Elegí una opción o escribí con tus palabras.';
  const temasAcc = () => D.temas.map((x) => ({ t: x.t, k: x.k }));
  const circ = (loc) => { const l = D.localidades.find((x) => x.t === loc); return l ? l.circ : 'la sede más cercana'; };
  const fuenteFicha = (F) => F.estado === 'Borrador' ? 'Ficha «' + F.titulo + '» · Borrador, texto provisional' : 'Ficha «' + F.titulo + '» · Revisada el ' + F.rev;
  const FUENTE_DERIV = 'Directorio de derivación · Revisado el [fecha]';
  function sede(F, loc) {
    if (F.sinLoc) return 'La defensoría que corresponda a tu caso. [Teléfonos a validar]';
    if (!loc) return 'Depende de tu localidad. Elegila abajo y te digo a dónde ir.';
    return 'Defensoría ' + F.corto + ', ' + circ(loc) + '. [Dirección y horario a validar]';
  }
  const bot = (o) => Object.assign({ de: 'bot', tipo: 'texto' }, o);

  function fichaMsg(f, loc) {
    const F = D.fichas[f];
    const acc = [{ t: 'Guardar esta orientación', k: 'resumen', prim: true }];
    if (!F.sinLoc) acc.push({ t: loc ? 'Cambiar localidad' : 'Elegir mi localidad', k: 'loc', a: f });
    acc.push(HUMANO, VOLVER);
    return { de: 'bot', tipo: 'ficha', titulo: F.titulo, servicio: F.servicio,
      filas: [{ k: 'Qué hace', v: F.que }, { k: 'Quién puede acceder', v: F.quien }, { k: 'A dónde ir', v: sede(F, loc) }, { k: 'Costo', v: 'Gratuito.' }],
      llevar: F.llevar, nota: F.nota, fuente: fuenteFicha(F), valorable: true, acciones: acc };
  }
  function critica(k, acciones) {
    const U = D.urgencias[k];
    return { de: 'bot', tipo: 'critica', titulo: U.titulo, texto: U.texto, lineas: U.lineas.map((n) => D.lineas[n]),
      pie: 'Mensaje fijo aprobado por la Defensa Pública. [Texto a validar]', acciones };
  }
  function deriv(key, extra) {
    return [bot({ texto: D.derivaciones[key].texto, fuente: FUENTE_DERIV, valorable: true, acciones: [HUMANO, VOLVER].concat(extra || []) })];
  }
  function resumenItems(u) {
    const F = u ? D.fichas[u.f] : null;
    return F ? [{ k: 'Tema', v: F.titulo }, { k: 'Servicio', v: F.servicio }, { k: 'A dónde ir', v: sede(F, u.loc) }, { k: 'Qué llevar', v: F.llevar.join('; ') }, { k: 'Teléfono', v: '[Número de la defensoría]' }]
      : [{ k: 'Tema', v: 'Consulta general' }, { k: 'A dónde ir', v: 'La defensoría de tu localidad' }, { k: 'Teléfono', v: D.contacto.telefono }];
  }

  // Devuelve los mensajes del asistente para un paso. ctx.ultima = última ficha vista.
  function node(k, a, ctx) {
    switch (k) {
      case 'saludo': return [bot({ texto: 'Hola. Soy el asistente de orientación de la Defensa Pública de Neuquén. Te ayudo a saber si la Defensa puede atender tu problema, a dónde ir y qué llevar.' }), bot({ texto: PREGUNTA, acciones: temasAcc() })];
      case 'menu': return [bot({ texto: PREGUNTA, acciones: temasAcc() })];
      case 'familia': return [bot({ texto: '¿Qué necesitás resolver?', acciones: [{ t: 'Cuota alimentaria', k: 'loc', a: 'alimentos' }, { t: 'Cuidado de hijas e hijos', k: 'loc', a: 'cuidado' }, { t: 'Divorcio o separación', k: 'loc', a: 'divorcio' }, { t: 'Me quieren desalojar', k: 'loc', a: 'desalojo' }, { t: 'Otro tema de familia', k: 'otro' }, VOLVER] })];
      case 'penal': return [bot({ texto: '¿Qué pasó?', acciones: [{ t: 'Detuvieron a un familiar', k: 'loc', a: 'detenido' }, { t: 'Me citaron o me acusan', k: 'loc', a: 'acusado' }, { t: 'Quiero hablar con mi defensa', k: 'ficha', a: { f: 'contacto' } }, { t: 'Una persona está presa', k: 'ficha', a: { f: 'ejecucion' } }, VOLVER] })];
      case 'ninez': return [bot({ texto: 'Para orientarte mejor, ¿quién está consultando?', acciones: [{ t: 'Tengo menos de 18 años', k: 'nnya' }, { t: 'Soy una persona adulta', k: 'loc', a: 'ninez' }, VOLVER] })];
      case 'nnya': return [bot({ texto: 'Gracias por escribir. ¿Estás en peligro ahora?', acciones: [{ t: 'Sí', k: 'critica_nnya' }, { t: 'No', k: 'ficha', a: { f: 'nnya' } }] })];
      case 'violencia': return [bot({ texto: 'Antes de seguir: ¿estás en peligro en este momento?', acciones: [{ t: 'Sí, estoy en peligro', k: 'critica' }, { t: 'No, ahora no', k: 'violencia2' }, SALIDA] })];
      case 'violencia2': return [bot({ texto: '¿Qué tipo de situación es?', acciones: [{ t: 'De mi pareja o ex pareja', k: 'loc', a: 'violencia' }, { t: 'De un familiar', k: 'loc', a: 'violencia' }, { t: 'Otra situación', k: 'nolose' }, VOLVER] })];
      case 'salud': return [bot({ texto: '¿Sobre qué necesitás orientación?', acciones: [{ t: 'Internación por salud mental', k: 'loc', a: 'internacion' }, { t: 'Apoyos para tomar decisiones', k: 'loc', a: 'apoyos' }, { t: 'Certificado de discapacidad', k: 'cud' }, VOLVER] })];
      case 'otro': return [bot({ texto: 'Contame con tus palabras qué pasó, sin nombres ni datos personales. Te digo si la Defensa puede ayudarte o a dónde podés ir.', acciones: [VOLVER] })];
      case 'loc': return [bot({ texto: '¿En qué localidad vivís? Así te digo a qué defensoría ir.', acciones: D.localidades.map((l) => ({ t: l.t, k: 'ficha', a: { f: a, loc: l.t } })).concat([{ t: 'Otra localidad', k: 'ficha', a: { f: a, loc: 'Otra localidad' } }]) })];
      case 'ficha': return [fichaMsg(a.f, a.loc || null)];
      case 'sede':
        if (a && a.loc) return [bot({ texto: 'La defensoría que te corresponde está en la ' + circ(a.loc) + '. [Dirección y horario a validar]', fuente: 'Directorio de sedes · Revisado el [fecha]', valorable: true, acciones: [HUMANO, VOLVER] })];
        return [bot({ texto: 'No reconocí la localidad. ¿En cuál vivís? Así te digo a qué defensoría ir.', acciones: D.localidades.map((l) => ({ t: l.t, k: 'sede', a: { loc: l.t } })).concat([HUMANO]) })];
      case 'resumen': return [{ de: 'bot', tipo: 'resumen', titulo: 'Tu orientación', items: resumenItems(ctx.ultima), nota: 'No incluye datos personales. Podés mostrarlo en la defensoría para no repetir tu consulta.', acciones: [VOLVER] }];
      case 'humano': return [{ de: 'bot', tipo: 'deriv', titulo: 'Hablar con una persona', items: [{ k: 'Por teléfono', v: D.contacto.telefono + ', ' + D.contacto.horario + '.' }, { k: 'En persona', v: 'En la defensoría de tu localidad. [Dirección y horario]' }, { k: 'Fuera de horario', v: D.contacto.guardia + '. Emergencias: 911.' }], nota: 'Te preparé un resumen de lo que hablamos para que no tengas que repetirlo. No incluye datos personales.', acciones: [{ t: 'Ver el resumen', k: 'resumen', prim: true }, VOLVER] }];
      case 'critica': return [critica('critica', [{ t: 'Ya estoy a salvo, seguir', k: 'violencia2', prim: true }, SALIDA])];
      case 'critica_silencio': return [critica('critica_silencio', [SALIDA, { t: 'Ya estoy a salvo, seguir', k: 'violencia2' }])];
      case 'critica_nnya': return [critica('critica_nnya', [{ t: 'Ahora estoy bien, seguir', k: 'ficha', a: { f: 'nnya' }, prim: true }])];
      case 'critica_salud': return [critica('critica_salud', [HUMANO, VOLVER])];
      case 'cud': return deriv('cud');
      case 'consumo': return deriv('consumo');
      case 'trabajo': return deriv('trabajo');
      case 'denuncia': return deriv('mpf');
      case 'fuera': return [bot({ texto: 'Por este asistente no puedo consultar causas ni expedientes. Para saber cómo sigue tu caso, comunicate con la defensoría que lo lleva.', fuente: 'Límites del servicio · Revisado el [fecha]', acciones: [{ t: 'Cómo contactar a mi defensa', k: 'ficha', a: { f: 'contacto' } }, HUMANO, VOLVER] })];
      case 'costo': return [bot({ texto: 'La atención de la Defensa Pública es gratuita.', fuente: 'Preguntas frecuentes · Revisada el [fecha]', valorable: true, acciones: [VOLVER] })];
      case 'acceso': return [bot({ texto: 'La Defensa Pública atiende gratis a personas que no pueden pagar una abogada o un abogado particular. [Criterios de admisión a validar] En temas penales, defiende a cualquier persona acusada que no tenga abogada o abogado. Contame sobre qué tema es y te digo a qué defensoría ir.', fuente: 'Preguntas frecuentes · Revisada el [fecha]', valorable: true, acciones: temasAcc() })];
      case 'nolose': return [bot({ texto: 'No tengo información validada sobre eso, y prefiero no darte un dato incorrecto. Una persona de la Defensa puede ayudarte.', nota: 'Tu pregunta queda registrada, sin datos personales, para mejorar el asistente.', acciones: [HUMANO, VOLVER] })];
      case 'privacidad': return [bot({ texto: 'Borré tu mensaje porque parecía incluir un número de documento, un correo o un nombre. No necesito datos personales para orientarte.', acciones: [VOLVER] })];
      default: return [];
    }
  }

  /* ---------- Componente ---------- */
  let seq = 0;
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function mount(root, opts) {
    opts = opts || {};
    const id = ++seq;
    const S = { fase: 'chat', ultima: null, grande: false, silent: false };
    let log, input, bodyEl, actionsEl = null, liveEl;

    root.classList.add('mc');
    if (opts.marco) root.dataset.marco = opts.marco;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Asistente de orientación de la Defensa Pública');

    // Encabezado
    const head = h('header', { class: 'mc-head' }, [
      h('span', { class: 'mc-logo', html: ICON.logo }),
      h('div', { class: 'mc-title' }, [h('span', { class: 'mc-name' }, 'Asistente de orientación'), h('span', { class: 'mc-sub' }, 'Defensa Pública de Neuquén')]),
      h('a', { class: 'mc-exit', href: EXIT_URL, onclick: quickExit }, 'Salida rápida'),
      opts.onClose ? h('button', { type: 'button', class: 'mc-close', 'aria-label': 'Cerrar el asistente', onclick: () => opts.onClose() }, '×') : null
    ]);
    const bigBtn = h('button', { type: 'button', class: 'mc-tool', 'aria-label': 'Agrandar el texto', 'aria-pressed': 'false', onclick: () => {
      S.grande = !S.grande; root.classList.toggle('mc-big', S.grande); bigBtn.setAttribute('aria-pressed', String(S.grande));
    } }, 'A+');
    const band = h('div', { class: 'mc-band' }, [
      h('a', { href: 'tel:911', class: 'mc-strong' }, 'En peligro: 911'),
      h('a', { href: 'tel:144' }, 'Violencia de género: 144'),
      h('a', { href: 'tel:102' }, 'Niñez: 102'),
      h('span', { class: 'mc-tools' }, [bigBtn,
        h('button', { type: 'button', class: 'mc-tool', 'aria-label': 'Borrar la conversación', html: ICON.trash, onclick: () => reset(true) })])
    ]);
    bodyEl = h('div', { class: 'mc-body' });
    liveEl = h('p', { class: 'mc-sr', role: 'status' });
    root.replaceChildren(head, band, bodyEl, liveEl);

    function announce(t) { liveEl.textContent = ''; setTimeout(() => { liveEl.textContent = t; }, 30); }

    /* Aviso inicial */
    function renderAviso() {
      S.fase = 'aviso';
      const li = (icon, t) => h('li', null, [h('span', { class: 'mc-li-ic', html: icon }), h('span', null, t)]);
      bodyEl.replaceChildren(h('div', { class: 'mc-aviso-wrap' }, h('div', { class: 'mc-aviso' }, [
        h('h2', { class: 'mc-aviso-t' }, 'Hola. Antes de empezar'),
        h('ul', { class: 'mc-aviso-l' }, [
          li(ICON.check, 'Te oriento con información validada por la Defensa Pública. No doy asesoramiento sobre tu caso.'),
          li(ICON.check, 'Es anónimo: no escribas nombres, documentos ni datos de tu causa.'),
          li(ICON.check, 'Podés pedir hablar con una persona en cualquier momento.'),
          li(ICON.warn, 'Si estás en peligro, llamá al 911.')
        ]),
        h('button', { type: 'button', class: 'mc-btn mc-btn-p mc-start', onclick: () => { renderChat(); add(node('saludo')); } }, 'Entendido, empezar'),
        h('a', { class: 'mc-terms', href: 'como-funciona.html#terminos' }, 'Términos de uso y privacidad')
      ])));
    }

    /* Conversación */
    function renderChat() {
      S.fase = 'chat';
      log = h('div', { class: 'mc-log', role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversación', tabindex: '-1' });
      const inputId = 'consulta-' + id;
      input = h('input', { id: inputId, class: 'mc-input', type: 'text', autocomplete: 'off', placeholder: 'Escribí tu consulta', maxlength: '400',
        onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); sendFromInput(); } } });
      const composer = h('div', { class: 'mc-composer' }, [
        h('div', { class: 'mc-row' }, [
          h('button', { type: 'button', class: 'mc-round', 'aria-label': 'Ver los temas', html: ICON.grid, onclick: () => pick({ t: 'Ver los temas', k: 'menu' }) }),
          h('label', { for: inputId, class: 'mc-sr' }, 'Escribí tu consulta'),
          input,
          h('button', { type: 'button', class: 'mc-round mc-round-p', 'aria-label': 'Enviar', html: ICON.send, onclick: sendFromInput })
        ]),
        h('p', { class: 'mc-hint' }, 'No escribas nombres, documentos ni datos de tu causa.')
      ]);
      bodyEl.replaceChildren(log, composer);
      actionsEl = null;
    }

    function reset(announceIt) {
      S.ultima = null;
      renderChat();
      add(node('saludo'), { focus: false });
      if (announceIt) { announce('Conversación borrada.'); input.focus(); }
    }

    function sendFromInput() {
      const t = input.value.trim();
      if (!t) return;
      input.value = '';
      send(t, { focus: 'input' });
    }

    function send(t, o) {
      const r = classify(t);
      const mine = r.k === 'privacidad' ? { de: 'yo', texto: 'Mensaje borrado por contener datos personales', borrado: true } : { de: 'yo', texto: t };
      const out = [mine];
      if (r.nat) out.push(bot({ texto: r.nat, natural: true }));
      if (r.k === 'ficha') S.ultima = { f: r.a.f, loc: r.a.loc || null };
      add(out.concat(node(r.k, r.a, S)), o);
    }

    function pick(a, o) {
      if (a.salida) return quickExit();
      if (a.k === 'ficha') S.ultima = { f: a.a.f, loc: a.a.loc || null };
      add([{ de: 'yo', texto: a.t }].concat(node(a.k, a.a, S)), Object.assign({ focus: 'msg' }, o));
    }

    /* Render de mensajes */
    function add(list, o) {
      o = o || {};
      if (actionsEl) { actionsEl.remove(); actionsEl = null; }
      let firstBot = null;
      const lastBot = list.length - 1 - list.slice().reverse().findIndex((m) => m.de !== 'yo');
      list.forEach((m, i) => {
        const el = renderMsg(m, i === lastBot);
        log.appendChild(el);
        if (m.de !== 'yo' && !firstBot) firstBot = el;
      });
      // Desplaza hasta el comienzo de la primera respuesta nueva.
      const target = firstBot || log.lastElementChild;
      if (target) {
        const top = Math.max(0, target.offsetTop - 10);
        if (log.scrollTo && !S.silent && !reduce()) log.scrollTo({ top, behavior: 'smooth' }); else log.scrollTop = top;
      }
      if (S.silent) return;
      if (o.focus === 'input') input.focus({ preventScroll: true });
      else if (o.focus === 'msg' && firstBot) firstBot.focus({ preventScroll: true });
    }

    function dl(items) {
      return h('dl', { class: 'mc-dl' }, items.map((it) => h('div', null, [h('dt', null, it.k), h('dd', null, it.v)])));
    }

    function renderMsg(m, conAcciones) {
      if (m.de === 'yo') return h('div', { class: 'mc-msg mc-yo' + (m.borrado ? ' is-borrado' : '') }, h('p', null, [h('span', { class: 'mc-sr' }, 'Vos: '), m.texto]));
      const wrap = h('div', { class: 'mc-msg mc-bot', tabindex: '-1' });
      wrap.appendChild(h('span', { class: 'mc-sr' }, 'Asistente: '));
      if (m.natural) wrap.appendChild(h('span', { class: 'mc-natural' }, 'Respuesta en lenguaje natural'));
      if (m.tipo === 'texto') {
        wrap.appendChild(h('div', { class: 'mc-bubble' }, [h('p', null, m.texto), m.nota ? h('p', { class: 'mc-note' }, m.nota) : null]));
      } else if (m.tipo === 'ficha') {
        wrap.appendChild(h('article', { class: 'mc-card mc-ficha' }, [
          h('div', { class: 'mc-card-h' }, [h('span', { class: 'mc-serv' }, m.servicio), h('h3', { class: 'mc-card-t' }, m.titulo)]),
          h('dl', { class: 'mc-dl mc-pad' }, m.filas.map((f) => h('div', null, [h('dt', null, f.k), h('dd', null, f.v)])).concat([
            h('div', null, [h('dt', null, 'Qué llevar'), h('dd', null, h('ul', null, m.llevar.map((x) => h('li', null, x))))])
          ])),
          m.nota ? h('p', { class: 'mc-card-note' }, m.nota) : null
        ]));
      } else if (m.tipo === 'critica') {
        wrap.appendChild(h('div', { class: 'mc-card mc-critica', role: 'alert' }, [
          h('h3', { class: 'mc-crit-t' }, m.titulo),
          h('p', null, m.texto),
          h('div', { class: 'mc-lines' }, m.lineas.map((l) => h('a', { href: 'tel:' + l.n, class: 'mc-line' }, [h('span', { class: 'mc-line-n' }, l.n), h('span', { class: 'mc-line-t' }, l.t)]))),
          h('span', { class: 'mc-crit-pie' }, m.pie)
        ]));
      } else if (m.tipo === 'deriv') {
        wrap.appendChild(h('div', { class: 'mc-card mc-deriv' }, [h('h3', { class: 'mc-card-t' }, m.titulo), dl(m.items), m.nota ? h('p', { class: 'mc-card-note mc-note-blue' }, m.nota) : null]));
      } else if (m.tipo === 'resumen') {
        const txt = m.titulo + '\n' + m.items.map((it) => it.k + ': ' + it.v).join('\n') + '\n\nDefensa Pública de Neuquén · Asistente de orientación';
        const copyBtn = h('button', { type: 'button', class: 'mc-btn' }, 'Copiar');
        copyBtn.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(txt); } catch (e) {
            const ta = h('textarea', { class: 'mc-sr' }); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (x) { /* nada */ } ta.remove();
          }
          copyBtn.textContent = 'Copiado'; announce('Orientación copiada.');
          setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 2500);
        });
        wrap.appendChild(h('div', { class: 'mc-card mc-resumen' }, [
          h('h3', { class: 'mc-card-t' }, m.titulo), dl(m.items), h('p', { class: 'mc-note' }, m.nota),
          h('div', { class: 'mc-acts' }, [h('button', { type: 'button', class: 'mc-btn mc-btn-p', onclick: () => printResumen(m) }, 'Descargar en PDF'), copyBtn])
        ]));
      }
      if (m.fuente) wrap.appendChild(h('span', { class: 'mc-fuente' }, [h('span', { html: ICON.doc }), m.fuente]));
      if (m.valorable) {
        const box = h('div', { class: 'mc-vote' });
        const vote = (v) => {
          box.replaceChildren(h('span', { class: 'mc-thanks' }, v === 'si' ? 'Gracias por tu respuesta.' : 'Gracias. Una persona de la Defensa va a revisar esta respuesta.'));
          announce(box.textContent);
        };
        box.append(h('span', null, '¿Te sirvió?'),
          h('button', { type: 'button', onclick: () => vote('si') }, 'Sí'),
          h('button', { type: 'button', onclick: () => vote('no') }, 'No'),
          h('button', { type: 'button', onclick: () => vote('error') }, 'Informar un error'));
        wrap.appendChild(box);
      }
      if (conAcciones && m.acciones && m.acciones.length) {
        actionsEl = h('div', { class: 'mc-acts', role: 'group', 'aria-label': 'Opciones' }, m.acciones.map((a) => a.salida
          ? h('a', { href: EXIT_URL, class: 'mc-chip mc-chip-exit', onclick: quickExit }, a.t)
          : h('button', { type: 'button', class: 'mc-chip' + (a.prim ? ' mc-chip-p' : ''), onclick: () => pick(a) }, a.t)));
        wrap.appendChild(actionsEl);
      }
      return wrap;
    }

    function printResumen(m) {
      const area = h('div', { class: 'mc-print' }, [
        h('p', { class: 'mc-print-k' }, 'Defensa Pública de Neuquén · Asistente de orientación'),
        h('h1', null, m.titulo), dl(m.items), h('p', null, m.nota),
        h('p', { class: 'mc-print-k' }, 'Emergencias: 911 · Violencia de género: 144 · Niñez: 102')
      ]);
      document.body.appendChild(area);
      document.documentElement.classList.add('mc-printing');
      const done = () => { area.remove(); document.documentElement.classList.remove('mc-printing'); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      window.print();
      setTimeout(done, 1500);
    }

    /* Escenas precargadas (para revisar estados) */
    function seed(esc) {
      if (esc === 'bienvenida') return renderAviso();
      S.silent = true;
      renderChat();
      add(node('saludo'));
      const fichaPasos = [{ t: 'Familia y vivienda', k: 'familia' }, { t: 'Cuota alimentaria', k: 'loc', a: 'alimentos' }, { t: 'Zapala', k: 'ficha', a: { f: 'alimentos', loc: 'Zapala' } }];
      const P = {
        ficha: fichaPasos,
        resumen: fichaPasos.concat([{ t: 'Guardar esta orientación', k: 'resumen' }]),
        critica: [{ t: 'Violencias', k: 'violencia' }, { t: 'Sí, estoy en peligro', k: 'critica' }]
      };
      const T = { libre: 'Me quieren desalojar y no tengo plata para un abogado', derivacion: 'No me estás entendiendo, quiero hablar con alguien', privacidad: 'Mi DNI es 30111222', fuera: '¿Cómo va mi expediente?' };
      if (T[esc]) send(T[esc]);
      (P[esc] || []).forEach((a) => pick(a));
      S.silent = false;
    }

    seed(opts.escena || 'bienvenida');
    return { reset, send: (t) => send(t, { focus: 'input' }), focus: () => (input || root.querySelector('button')).focus() };
  }

  // Monta automáticamente cada [data-chat] de la página.
  function autoMount() {
    document.querySelectorAll('[data-chat]').forEach((el) => {
      if (el._mc) return;
      el._mc = mount(el, { escena: el.dataset.escena, marco: el.dataset.marco });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount); else autoMount();

  return { mount, classify, label, quickExit, norm };
})();
