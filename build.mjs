// Generador estático mínimo, sin dependencias.
// Lee src/pages/*.html (con front-matter), los envuelve en src/layout.html
// con la navegación del prototipo y el menú del panel, y escribe el sitio en dist/.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'dist');

// Páginas del prototipo, en el orden del menú «Páginas del prototipo».
const PAGES = [
  ['index', 'Guía de la sesión de revisión', 'Para empezar'],
  ['asistente', 'Página del asistente', 'Experiencia ciudadana'],
  ['ventana', 'Ventana flotante en el sitio del MPD', 'Experiencia ciudadana'],
  ['chat', 'Asistente a pantalla completa (celular)', 'Experiencia ciudadana'],
  ['estados', 'Estados de la conversación', 'Experiencia ciudadana'],
  ['como-funciona', 'Cómo funciona este asistente', 'Experiencia ciudadana'],
  ['temas', 'Mapa de temas y árboles guiados', 'Temas y flujos'],
  ['panel', 'Resumen y revisión', 'Panel de la Defensa'],
  ['fichas', 'Fichas y derivaciones', 'Panel de la Defensa'],
  ['pruebas', 'Banco de pruebas y publicación', 'Panel de la Defensa']
];

// Menú lateral del panel de la Defensa (igual en las tres pantallas).
const PANEL_NAV = [
  { id: 'resumen', t: 'Resumen', href: 'panel.html' },
  { id: 'revision', t: 'Conversaciones para revisar', href: 'panel.html#revision', badge: true },
  { id: 'fichas', t: 'Fichas y derivaciones', href: 'fichas.html' },
  { id: 'temas', t: 'Árboles guiados', href: 'temas.html' },
  { id: 'pruebas', t: 'Banco de pruebas', href: 'pruebas.html' },
  { id: 'historial', t: 'Publicaciones', href: 'pruebas.html#historial' },
  { id: 'instalacion', t: 'Instalación', href: 'panel.html#instalacion' }
];

const REVIEW = JSON.parse(readFileSync(join(ROOT, 'review.config.json'), 'utf8'));

const read = (p) => readFileSync(p, 'utf8');
const layout = read(join(SRC, 'layout.html'));
const panelSide = read(join(SRC, 'partials', 'panel-side.html'));

function parse(file) {
  const raw = read(file);
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error('Falta front-matter en ' + file);
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m[2] };
}

const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? vars[k] : ''));

function protoNav(current) {
  let group = null, items = '';
  for (const [f, t, g] of PAGES) {
    if (g !== group) { group = g; items += `<p class="proto-group">${g}</p>\n`; }
    items += `<a href="${f}.html"${f === current ? ' aria-current="page"' : ''}>${t}</a>\n`;
  }
  return `<button type="button" class="proto-btn" aria-expanded="false" aria-controls="proto-panel">Páginas del prototipo</button>
<nav id="proto-panel" class="proto-panel" aria-label="Páginas del prototipo" hidden>
<div class="proto-head"><div><p class="proto-title">Prototipo 1 · Asistente de orientación de la Defensa Pública de Neuquén</p><p class="proto-note">Textos provisionales. Los datos entre corchetes están por completar y los del panel son ficticios.</p></div><button type="button" class="proto-close" aria-label="Cerrar">×</button></div>
<div class="proto-list">
${items}</div>
</nav>`;
}

function panelNav(active, who) {
  const nav = PANEL_NAV.map((i) => {
    const on = i.id === active;
    return `<a class="nav${on ? ' nav-on' : ''}" href="${i.href}"${on ? ' aria-current="page"' : ''}>${i.t}${i.badge ? '<span class="badge" data-pendientes>6</span>' : ''}</a>`;
  }).join('\n');
  return fill(panelSide, { nav, who: who || '[Persona responsable]<br>Acceso con usuario institucional' });
}

// Versión publicada: commit corto + fecha, para saber sobre qué versión se hizo cada comentario.
let version = new Date().toISOString().slice(0, 10);
try {
  const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  if (sha) version = `${sha} · ${version}`;
} catch (e) { /* sin git */ }

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(ROOT, 'assets'), join(OUT, 'assets'), { recursive: true });
if (existsSync(join(ROOT, 'public'))) cpSync(join(ROOT, 'public'), OUT, { recursive: true });

const pages = readdirSync(join(SRC, 'pages')).filter((f) => f.endsWith('.html'));
for (const f of pages) {
  const name = basename(f, '.html');
  const { meta, body } = parse(join(SRC, 'pages', f));
  const scripts = (meta.scripts || '').split(',').map((s) => s.trim()).filter(Boolean)
    .map((s) => `<script src="assets/js/${s}" defer></script>`).join('\n');
  const main = fill(body, { panelSide: meta.panel ? panelNav(meta.panel, meta.who) : '' });
  const html = fill(layout, {
    title: `${meta.title} · Asistente de orientación · Defensa Pública de Neuquén · Prototipo`,
    description: meta.description || '',
    page: meta.page || name,
    bodyClass: meta.bodyClass || '',
    version,
    main,
    protoNav: meta.noNav === 'true' ? '' : protoNav(name),
    reviewConfig: JSON.stringify(REVIEW),
    scripts
  });
  writeFileSync(join(OUT, f), html);
  console.log('  ✓', f);
}
console.log(`Sitio generado en dist/ (${pages.length} páginas).`);
