// Exporta los comentarios de revisión del asistente MPD Neuquén en CSV
// para Google Sheets (=IMPORTDATA). Valida el código de sesión con la
// misma función que usa el sitio.
const URL_ = Deno.env.get('SUPABASE_URL')!;
const KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const KIND: Record<string, string> = {
  gusta: 'Me gusta', no_gusta: 'No me gusta', falta: 'Falta algo', corregir: 'Corregir',
  pregunta: 'Pregunta', idea: 'Idea', eliminar: 'Eliminar', redaccion: 'Redacción'
};
const STATUS: Record<string, string> = { abierto: 'Abierto', en_curso: 'En curso', resuelto: 'Resuelto' };

function cell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return '"' + s.replace(/"/g, '""') + '"';
}
function fecha(v: string | null): string {
  if (!v) return '';
  return new Date(v).toLocaleString('es-AR', { timeZone: 'America/Argentina/Salta', dateStyle: 'short', timeStyle: 'short' });
}

Deno.serve(async (req) => {
  const code = new URL(req.url).searchParams.get('code') || '';
  const r = await fetch(`${URL_}/rest/v1/rpc/mpd_review_list`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_code: code })
  });
  if (!r.ok) return new Response('Código de sesión inválido', { status: 403 });
  const rows: any[] = await r.json();
  const head = ['N.º', 'Fecha', 'Página', 'Tipo', 'Estado', 'Votos', 'Autor', 'Comentario', 'Texto original', 'Redacción propuesta', 'Respuestas', 'Elemento', 'Ancho de pantalla', 'Versión', 'Resuelto en', 'Referencia de resolución'];
  const lines = [head.map(cell).join(',')];
  for (const c of rows) {
    lines.push([
      c.num, fecha(c.created_at), c.page_title || c.page, KIND[c.kind] || c.kind, STATUS[c.status] || c.status,
      (c.voters || []).length, c.author_name, c.body, c.quote, c.proposal,
      (c.replies || []).map((x: any) => `${x.author_name}: ${x.body}`).join(' | '),
      c.snippet, c.viewport_w, c.version, fecha(c.resolved_at), c.resolved_ref
    ].map(cell).join(','));
  }
  return new Response('﻿' + lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
  });
});
