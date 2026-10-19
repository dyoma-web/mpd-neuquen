/* ==========================================================================
   Asistente de orientación · Defensa Pública de Neuquén
   Instalación en cualquier sitio con una sola línea:
     <script src="https://…/assets/js/ventana.js" defer></script>
   Agrega un botón flotante que abre el asistente en una ventana (iframe).
   No modifica el resto de la página ni usa cookies.
   ========================================================================== */
(function () {
  'use strict';
  if (window.__mpdVentana) return;
  window.__mpdVentana = true;
  const me = document.currentScript || document.querySelector('script[src*="ventana.js"]');
  const base = new URL('../../', me.src);
  const chatUrl = new URL('chat.html?embed=1', base).href;

  const css = `
    .mpdv-btn{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:inline-flex;align-items:center;gap:10px;min-height:56px;padding:6px 20px 6px 8px;border-radius:999px;border:0;background:#24505C;color:#fff;font:600 15px/1.2 system-ui,sans-serif;box-shadow:0 10px 26px rgba(31,41,51,.25);cursor:pointer}
    .mpdv-btn:focus-visible{outline:3px solid #F2C6B1;outline-offset:2px}
    .mpdv-win{position:fixed;right:20px;bottom:88px;z-index:2147483000;width:400px;max-width:calc(100vw - 24px);height:min(640px,calc(100vh - 110px));border:1px solid #C9D3D6;border-radius:16px;overflow:hidden;box-shadow:0 18px 44px rgba(31,41,51,.22);background:#fff}
    .mpdv-win[hidden]{display:none}
    .mpdv-win iframe{width:100%;height:100%;border:0;display:block}
    @media (max-width:520px){.mpdv-win{right:6px;left:6px;width:auto;bottom:84px;height:calc(100vh - 100px)}}`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const win = document.createElement('div');
  win.className = 'mpdv-win';
  win.id = 'mpdv-win';
  win.hidden = true;
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'Asistente de orientación de la Defensa Pública');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mpdv-btn';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'mpdv-win');
  btn.innerHTML = '<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#fff"/><path d="M11 12h18a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9l-6 5v-5h-3a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3z" fill="#24505C"/></svg><span>¿Necesitás orientación?</span>';

  let loaded = false;
  btn.addEventListener('click', () => {
    const open = win.hidden;
    if (open && !loaded) {
      const f = document.createElement('iframe');
      f.src = chatUrl;
      f.title = 'Asistente de orientación de la Defensa Pública de Neuquén';
      f.setAttribute('allow', 'clipboard-write');
      win.appendChild(f);
      loaded = true;
    }
    win.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('span').textContent = open ? 'Cerrar el asistente' : '¿Necesitás orientación?';
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !win.hidden) btn.click(); });

  document.body.appendChild(win);
  document.body.appendChild(btn);
})();
