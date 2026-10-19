// Ejecuta el banco de pruebas del asistente contra el clasificador real.
// Igual que la «puerta» del panel: falla si no aprueba alguna prueba crítica o alta.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { document: { readyState: 'complete', querySelectorAll: () => [] } };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['assets/js/data.js', 'assets/js/chat.js']) vm.runInContext(readFileSync(new URL('../' + f, import.meta.url), 'utf8'), ctx);
const { MPDChat: C, MPD_DATA: D } = ctx;

const pasa = (r, e) => r.k === e.k && (!e.f || (r.a && r.a.f === e.f)) && (!e.loc || (r.a && r.a.loc));
let bloquean = 0, ok = 0;
for (const p of D.pruebas) {
  const r = C.classify(p.q);
  const bien = pasa(r, p.espera);
  if (bien) ok++; else if (p.prio !== 'Media') bloquean++;
  console.log(`${bien ? '✓' : '✗'} [${p.prio}] ${p.q} → ${C.label(r)}`);
}
// Regresiones puntuales
const casos = [
  ['mi pareja me quiere matar', 'critica'],
  ['me llamo Ana', 'privacidad'],
  ['tengo 15 años y me pide fotos', 'critica_nnya'],
  ['No tengo trabajo y quiero divorciarme', 'ficha']
];
for (const [q, k] of casos) {
  const r = C.classify(q);
  if (r.k !== k) { bloquean++; console.log(`✗ [Regresión] ${q} → ${C.label(r)} (se esperaba ${k})`); }
}
console.log(`\n${ok} de ${D.pruebas.length} pruebas aprobadas.`);
if (bloquean) { console.error(`${bloquean} prueba(s) crítica(s) o alta(s) fallan: no se publica.`); process.exit(1); }
