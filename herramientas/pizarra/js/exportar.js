// Exportacion: SVG, PDF (implementacion propia, paginas como JPEG), JSON del tablero y PNG.
import { MARCO, REL_TINTA, FUENTE } from './config.js';
import { Doc } from './modelo.js';
import { caja, cajaGrupo, contornoTrazo, extremos, poligonoForma, puntosTrazo } from './geom.js';
import { ajustarNota, envolver, medirAprox } from './texto.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const n2 = n => Math.round(n * 100) / 100;
const col = (c, osc) => (!c || c === 'tinta' ? (osc ? REL_TINTA.oscuro : REL_TINTA.claro) : c);

export function limitesPagina(doc, pg) {
  const p = doc.ent.p.get(pg);
  if (p && p.v.marco) return { x: 0, y: 0, w: MARCO.w, h: MARCO.h };
  const es = doc.lista(pg);
  if (!es.length) return { x: 0, y: 0, w: MARCO.w, h: MARCO.h };
  const b = cajaGrupo(doc, es), m = 40;
  return { x: Math.floor(b.x0 - m), y: Math.floor(b.y0 - m), w: Math.max(400, Math.ceil(b.x1 - b.x0 + 2 * m)), h: Math.max(300, Math.ceil(b.y1 - b.y0 + 2 * m)) };
}

function svgObjeto(doc, e, osc, assets) {
  const v = e.v, t = v.tipo;
  if (t === 'conector') {
    const [a, b] = extremos(doc, v), c = col(v.color, osc), g = v.grosor || 3;
    let s = `<line x1="${n2(a[0])}" y1="${n2(a[1])}" x2="${n2(b[0])}" y2="${n2(b[1])}" stroke="${c}" stroke-width="${g}" stroke-linecap="round"/>`;
    if (v.flecha !== false) s += punta(b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), 10 + g * 2.2, c, g);
    return s;
  }
  if (t === 'comentario') return `<g transform="translate(${n2(v.x)} ${n2(v.y)})" opacity="${v.res ? 0.4 : 1}"><circle cx="16" cy="16" r="16" fill="${esc(v.color || '#3b82f6')}" stroke="#fff" stroke-width="2.5"/><title>${esc(v.texto || '')}</title></g>`;
  if (t === 'votos') return `<g transform="translate(${n2(v.x)} ${n2(v.y)})"><rect width="${v.w}" height="${v.h}" rx="${v.h / 2}" fill="${esc(v.color || '#f59e0b')}"/><text x="${v.w / 2}" y="${v.h / 2 + 6}" text-anchor="middle" font-family="${esc(FUENTE)}" font-weight="700" font-size="17" fill="#1f2937">${esc(v.etq || '+')} ${doc.votos(e)}</text></g>`;
  const tr = `translate(${n2(v.x + v.w / 2)} ${n2(v.y + v.h / 2)}) rotate(${n2(((v.rot || 0) * 180) / Math.PI)}) translate(${n2(-v.w / 2)} ${n2(-v.h / 2)})`;
  const op = v.op != null && v.op < 1 ? ` opacity="${v.op}"` : '';
  let inner = '';
  if (t === 'trazo') {
    inner = `<path d="${contornoTrazo(puntosTrazo(v), v.grosor || 4, !!v.res)}" fill="${esc(col(v.color, osc))}"${v.res ? ' fill-opacity="0.38"' : ''}/>`;
  } else if (t === 'forma') {
    const c = esc(col(v.color, osc)), g = v.grosor || 3;
    const rel = v.relleno && v.relleno !== 'ninguno' ? esc(col(v.relleno, osc)) : 'none';
    const base = `stroke="${c}" stroke-width="${g}" stroke-linejoin="round" stroke-linecap="round" fill="${rel}"`;
    if (v.fm === 'linea' || v.fm === 'flecha') {
      const a = v.p1 || [0, 0], b = v.p2 || [1, 1], ax = a[0] * v.w, ay = a[1] * v.h, bx = b[0] * v.w, by = b[1] * v.h;
      inner = `<line x1="${n2(ax)}" y1="${n2(ay)}" x2="${n2(bx)}" y2="${n2(by)}" ${base} fill="none"/>`;
      if (v.fm === 'flecha') inner += punta(bx, by, Math.atan2(by - ay, bx - ax), 10 + g * 2.2, c, g);
    } else if (v.fm === 'rect') inner = `<rect width="${n2(v.w)}" height="${n2(v.h)}" rx="${v.rad || 0}" ${base}/>`;
    else if (v.fm === 'elipse') inner = `<ellipse cx="${n2(v.w / 2)}" cy="${n2(v.h / 2)}" rx="${n2(v.w / 2)}" ry="${n2(v.h / 2)}" ${base}/>`;
    else { const pol = poligonoForma(v); if (pol) inner = `<polygon points="${pol.map(([x, y]) => n2(x * v.w) + ',' + n2(y * v.h)).join(' ')}" ${base}/>`; }
  } else if (t === 'nota') {
    inner = `<rect width="${n2(v.w)}" height="${n2(v.h)}" rx="6" fill="${esc(v.color || '#fff176')}" stroke="rgba(0,0,0,.12)"/>`;
    if (v.texto) {
      const r = ajustarNota(v.texto, v.w, v.h, v.fs || 26, (fs, n) => medirAprox(fs, v.neg)), al = v.al || 'center';
      const tx = al === 'left' ? 14 : al === 'right' ? v.w - 14 : v.w / 2, anchor = al === 'left' ? 'start' : al === 'right' ? 'end' : 'middle';
      inner += lineasSVG(r.lineas, tx, Math.max(14, (v.h - r.lineas.length * r.fs * 1.25) / 2), r.fs, anchor, '#1f2937', v);
    }
  } else if (t === 'texto') {
    const fs = v.fs || 24, L = envolver(v.texto, v.w - 8, medirAprox(fs, v.neg)), al = v.al || 'left';
    inner = lineasSVG(L, al === 'left' ? 4 : al === 'right' ? v.w - 4 : v.w / 2, 4, fs, al === 'left' ? 'start' : al === 'right' ? 'end' : 'middle', col(v.color, osc), v);
  } else if (t === 'imagen') {
    const d = assets && assets[v.img];
    if (d) {
      const r = v.rec || [0, 0, 1, 1];
      inner = v.iw && v.ih
        ? `<svg width="${n2(v.w)}" height="${n2(v.h)}" viewBox="${n2(r[0] * v.iw)} ${n2(r[1] * v.ih)} ${n2(r[2] * v.iw)} ${n2(r[3] * v.ih)}" preserveAspectRatio="none"><image href="${esc(d)}" width="${v.iw}" height="${v.ih}"/></svg>`
        : `<image href="${esc(d)}" width="${n2(v.w)}" height="${n2(v.h)}" preserveAspectRatio="none"/>`;
    } else inner = `<rect width="${n2(v.w)}" height="${n2(v.h)}" fill="#ccc"/>`;
  }
  return inner ? `<g transform="${tr}"${op}>${inner}</g>` : '';
}
function punta(x, y, ang, tam, c, g) {
  const p = (a) => `${n2(x - tam * Math.cos(ang + a))},${n2(y - tam * Math.sin(ang + a))}`;
  return `<polyline points="${p(-0.45)} ${n2(x)},${n2(y)} ${p(0.45)}" fill="none" stroke="${c}" stroke-width="${g}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function lineasSVG(L, x, y0, fs, anchor, c, v) {
  const st = `${v.neg ? ' font-weight="700"' : ''}${v.cur ? ' font-style="italic"' : ''}`;
  return `<text font-family="${esc(FUENTE)}" font-size="${fs}" fill="${esc(c)}" text-anchor="${anchor}"${st}>` +
    L.map((l, i) => `<tspan x="${n2(x)}" y="${n2(y0 + fs * 1.25 * i + fs)}">${esc(l)}</tspan>`).join('') + '</text>';
}

function defsFondo(fondo, id) {
  const osc = fondo === 'oscuro', lin = osc ? 'rgba(255,255,255,0.12)' : 'rgba(30,60,120,0.16)', pun = osc ? 'rgba(255,255,255,0.28)' : 'rgba(30,60,120,0.32)';
  if (fondo === 'cuadriculado') return `<pattern id="${id}" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${lin}"/></pattern>`;
  if (fondo === 'lineas') return `<pattern id="${id}" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M0 48H48" fill="none" stroke="${lin}"/></pattern>`;
  if (fondo === 'puntos') return `<pattern id="${id}" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="16" cy="16" r="1.6" fill="${pun}"/></pattern>`;
  return '';
}

export function aSVG(doc, pg, assets = {}) {
  const p = doc.ent.p.get(pg), fondo = (p && p.v.fondo) || 'blanco', osc = fondo === 'oscuro', b = limitesPagina(doc, pg);
  const def = defsFondo(fondo, 'fnd');
  let s = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${b.w}" height="${b.h}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}">\n`;
  if (def) s += `<defs>${def}</defs>\n`;
  s += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${osc ? '#1e2430' : '#ffffff'}"/>\n`;
  if (def) s += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="url(#fnd)"/>\n`;
  for (const e of doc.lista(pg)) {
    if (!doc.capaVisible(e.v.cap)) continue;
    const t = svgObjeto(doc, e, osc, assets);
    if (t) s += t + '\n';
  }
  return s + '</svg>\n';
}

// ----- PDF minimo: una pagina por imagen JPEG (DCTDecode) -----
const enc = new TextEncoder();
export function crearPDF(paginas, titulo = 'Pizarra') {
  const partes = [], offs = [];
  let pos = 0;
  const push = d => { const u = typeof d === 'string' ? enc.encode(d) : d; partes.push(u); pos += u.length; };
  const obj = (n, cuerpo) => { offs[n] = pos; push(`${n} 0 obj\n`); push(cuerpo); push('\nendobj\n'); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const N = paginas.length, kids = [];
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  for (let i = 0; i < N; i++) kids.push(`${5 + i * 3} 0 R`);
  obj(2, `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${N} >>`);
  obj(3, `<< /Producer (Pizarra) /Title (${String(titulo).replace(/[^\x20-\x7e]/g, '?').replace(/[()\\]/g, '')}) >>`);
  obj(4, '<< >>');
  paginas.forEach((pa, i) => {
    const base = 5 + i * 3, W = Math.round(pa.w * 0.75 * 100) / 100, H = Math.round(pa.h * 0.75 * 100) / 100;
    obj(base, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${base + 2} 0 R >> >> /Contents ${base + 1} 0 R >>`);
    const c = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    obj(base + 1, `<< /Length ${c.length} >>\nstream\n${c}\nendstream`);
    offs[base + 2] = pos;
    push(`${base + 2} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pa.pw || pa.w} /Height ${pa.ph || pa.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pa.jpeg.length} >>\nstream\n`);
    push(pa.jpeg); push('\nendstream\nendobj\n');
  });
  const total = 5 + N * 3, xref = pos;
  let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let i = 1; i < total; i++) x += String(offs[i] || 0).padStart(10, '0') + ' 00000 n \n';
  push(x + `trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(pos); let o = 0;
  for (const p of partes) { out.set(p, o); o += p.length; }
  return out;
}
export function dataURLaBytes(url) {
  const b = atob(url.slice(url.indexOf(',') + 1)), u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
}

// ----- JSON del tablero -----
export function aJSON(doc, assets = {}, titulo) {
  return JSON.stringify({ formato: 'pizarra', version: 1, titulo: titulo || doc.meta('titulo') || 'Tablero', exportado: new Date().toISOString(), ops: doc.aOps(), assets });
}
export function deJSON(texto) {
  let d;
  try { d = JSON.parse(texto); } catch (e) { throw new Error('El archivo no es JSON válido'); }
  if (!d || d.formato !== 'pizarra' || !Array.isArray(d.ops)) throw new Error('No parece un tablero de Pizarra');
  const ok = d.ops.filter(o => o && typeof o.id === 'string' && 'mlpo'.includes(o.k) && o.p && typeof o.p === 'object' && Number.isFinite(o.c) && typeof o.a === 'string');
  return { titulo: String(d.titulo || 'Tablero importado').slice(0, 80), ops: ok, assets: d.assets && typeof d.assets === 'object' ? d.assets : {} };
}

// ----- navegador: PNG y miniaturas -----
export function lienzoPagina(doc, pg, dibujarPagina, imagen, escala = 2, maxLado = 4096) {
  const b = limitesPagina(doc, pg);
  const k = Math.min(escala, maxLado / b.w, maxLado / b.h);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(b.w * k)); c.height = Math.max(1, Math.round(b.h * k));
  const ctx = c.getContext('2d');
  ctx.scale(k, k);
  dibujarPagina(ctx, doc, pg, { x: b.x, y: b.y, z: 1 }, b.w, b.h, { imagen });
  return c;
}
export const descargar = (nombre, blob) => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
};
export const nombreArchivo = t => String(t || 'pizarra').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'pizarra';
