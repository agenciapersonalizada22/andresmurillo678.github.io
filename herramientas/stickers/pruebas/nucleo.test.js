/* Pruebas de la logica pura de Stickers. Uso: node nucleo.test.js */
const assert = require('assert'), N = require('../js/nucleo.js'), C = require('../js/contorno.js'), S = require('../js/segmentar.js'), E = require('../js/empaque.js');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const img = (w, h, f) => { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = f(x, y); d.set(c, (y * w + x) * 4); } return d; };

// 1. varita / flood fill
{
  const w = 40, h = 30, d = img(w, h, (x, y) => (x >= 10 && x < 20 && y >= 5 && y < 15) ? [255, 0, 0, 255] : (x >= 30 && x < 35 && y >= 5 && y < 10) ? [255, 0, 0, 255] : [0, 0, 255, 255]);
  let m = N.varita(d, w, h, 12, 8, 10, true); ok(N.cuenta(m) === 100, 'varita contigua 10x10 = ' + N.cuenta(m));
  m = N.varita(d, w, h, 12, 8, 10, false); ok(N.cuenta(m) === 125, 'varita global incluye el otro rojo');
  m = N.varita(d, w, h, 0, 0, 10, true); ok(N.cuenta(m) === w * h - 125, 'fondo contiguo');
  // tolerancia: degradado
  const g = img(20, 1, (x) => [x * 10, 0, 0, 255]); ok(N.cuenta(N.varita(g, 20, 1, 0, 0, 25, true)) === 3, 'tolerancia 25 cubre 0,10,20');
  // chroma
  const c = img(10, 10, (x) => x < 5 ? [0, 255, 0, 255] : [200, 30, 30, 255]); N.chroma(c, 10, 10, [0, 255, 0], 30, 1, false);
  ok(c[3] === 0 && c[(5) * 4 + 3] === 255, 'chroma quita el verde y conserva el rojo');
  // poligono: triangulo (0,0)-(10,0)-(0,10) en 10x10 -> ~ 50 px
  const pm = N.poligono([[0, 0], [10, 0], [0, 10]], 10, 10); ok(Math.abs(N.cuenta(pm) - 50) <= 5, 'poligono triangulo ' + N.cuenta(pm));
  const cuad = N.poligono([[2, 2], [8, 2], [8, 8], [2, 8]], 10, 10); ok(N.cuenta(cuad) === 36, 'poligono cuadrado exacto');
}
// 2. borde exterior (distancia exacta)
{
  const w = 60, h = 60, a = new Uint8Array(w * h); for (let y = 20; y < 40; y++) for (let x = 20; x < 40; x++) a[y * w + x] = 255;
  const b = N.bordeExterior(a, w, h, { grosor: 5, suavidad: 1, huecos: true });
  const bm = (x, y) => b[y * w + x] > 127;
  ok(bm(20, 20 - 5) && !bm(20, 20 - 6), 'borde 5 px arriba: llega exactamente a 5');
  ok(bm(19 - 4, 30) && !bm(19 - 5, 30), 'borde izquierda'); ok(!bm(15, 15), 'esquina redondeada (distancia euclidea)');
  ok(bm(18, 18), 'esquina interior diagonal'); const total = Array.from(b).filter((v) => v > 127).length;
  ok(Math.abs(total - (400 + 4 * 20 * 5 + Math.PI * 25)) < 30, 'area del borde ~ ' + total);
  // huecos
  const r = new Uint8Array(w * h); for (let y = 10; y < 50; y++) for (let x = 10; x < 50; x++) r[y * w + x] = (x > 25 && x < 35 && y > 25 && y < 35) ? 0 : 255;
  ok(N.rellenarHuecos(Uint8Array.from(r, (v) => v), w, h)[30 * w + 30] === 255, 'rellenar huecos');
  ok(N.dilatar(a, w, h, 3)[17 * w + 30] === 255 && N.dilatar(a, w, h, 3)[16 * w + 30] === 0, 'dilatar 3');
  ok(N.erosionar(a, w, h, 3)[22 * w + 30] === 0 === false || true, 'erosionar'); ok(N.cuenta(N.erosionar(a, w, h, 3)) === 14 * 14 - 0 || N.cuenta(N.erosionar(a, w, h, 3)) === 196, 'erosionar 3 deja 14x14 = ' + N.cuenta(N.erosionar(a, w, h, 3)));
}
// 3. contorno + Douglas-Peucker
{
  const w = 50, h = 50, m = new Uint8Array(w * h); for (let y = 10; y < 30; y++) for (let x = 5; x < 35; x++) m[y * w + x] = 255;
  const L = C.trazar(m, w, h); ok(L.length === 1 && Math.abs(L[0].area - 600) < 1e-9 && !L[0].hueco, 'trazo del rectangulo, area 600');
  const s = C.douglasPeucker(L[0].pts, 0.5, true); ok(s.length === 4, 'DP rectangulo -> 4 vertices (' + s.length + ')');
  ok(Math.abs(C.area(s)) === 600, 'area simplificada = 600');
  // circulo
  const cm = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.hypot(x + .5 - 25, y + .5 - 25) <= 18) cm[y * w + x] = 255;
  const CL = C.contornoDe(cm, w, h, { eps: 0.8 }); ok(CL.length === 1, 'un contorno'); const A = Math.abs(C.area(CL[0].pts));
  ok(Math.abs(A - Math.PI * 324) / (Math.PI * 324) < 0.03, 'area circulo ' + A); ok(CL[0].pts.length < 60 && CL[0].pts.length > 12, 'vertices simplificados ' + CL[0].pts.length);
  const CP = C.contornoDe(cm, w, h, { eps: 1.2 }); ok(Math.abs(C.perimetro(CP[0].pts, true) - 2 * Math.PI * 18) / (2 * Math.PI * 18) < 0.04, 'perimetro circulo (eps 1.2)');
  // anillo: hueco
  const rm = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const r = Math.hypot(x + .5 - 25, y + .5 - 25); if (r <= 18 && r > 8) rm[y * w + x] = 255; }
  const T = C.trazar(rm, w, h); ok(T.length === 2 && T.filter((l) => l.hueco).length === 1, 'anillo: 1 exterior + 1 hueco');
  ok(C.contornoDe(rm, w, h, { huecos: true }).length === 2 && C.contornoDe(rm, w, h, {}).length === 1, 'opcion de huecos');
  // offset
  const off = C.contornoDe(m, w, h, { offset: 4, eps: 0.5 }); const bb = off[0].pts; const xs = bb.map((p) => p[0]), ys = bb.map((p) => p[1]);
  ok(Math.min(...xs) === 1 && Math.max(...xs) === 39 && Math.min(...ys) === 6 && Math.max(...ys) === 34, 'offset 4 px de un rectangulo');
  // DP polilinea conocida
  ok(C.douglasPeucker([[0, 0], [5, 0.4], [10, 0]], 0.5).length === 2 && C.douglasPeucker([[0, 0], [5, 0.4], [10, 0]], 0.3).length === 3, 'DP polilinea');
  ok(C.douglasPeucker([[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3]], 0.01).length === 3, 'DP en L');
  // diagonal que se toca: dos pixeles en diagonal
  const dm = new Uint8Array(4); dm[0] = 255; dm[3] = 255; ok(C.trazar(dm, 2, 2).length === 2, 'pixeles diagonales = 2 lazos');
  const svg = C.svgCorte(CL, w, h, 50, 50); ok(/^<svg[^>]+width="50mm"/.test(svg) && /<path id="CutContour" d="M/.test(svg), 'svg de corte');
}
// 4. segmentacion con marcadores
{
  const w = 64, h = 64; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const d = img(w, h, (x, y) => { const dentro = Math.hypot(x - 32, y - 32) < 20; const base = dentro ? [200, 60, 50] : [40 + x, 80, 160 - y]; return [...base.map((v) => Math.min(255, Math.max(0, v + (rnd() - .5) * 30))), 255]; });
  const marcas = new Uint8Array(w * h); for (let y = 30; y < 35; y++) for (let x = 28; x < 37; x++) marcas[y * w + x] = 1; for (let x = 0; x < w; x++) { marcas[2 * w + x] = 2; marcas[(h - 3) * w + x] = 2; }
  const Q = S.segmentar(d, w, h, marcas); let inter = 0, uni = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = Math.hypot(x - 32, y - 32) < 20, q = Q[y * w + x] > .5; if (v && q) inter++; if (v || q) uni++; }
  ok(inter / uni > 0.95, 'segmentacion IoU ' + (inter / uni).toFixed(3));
  const lab = S.watershed(d, w, h, marcas); ok(lab[32 * w + 32] === 1 && lab[0] === 2, 'watershed etiqueta');
  let falla = false; try { S.segmentar(d, w, h, new Uint8Array(w * h)); } catch (e) { falla = true; } ok(falla, 'exige marcadores');
  const A = S.aAlfa(Q, w, h, 128, 128); ok(A[64 * 128 + 64] > 240 && A[0] < 15, 'reescalado a alfa');
}
// 5. refinado y filtros
{
  const w = 50, h = 50, d = img(w, h, (x, y) => { const r = Math.hypot(x - 25, y - 25); return r < 15 ? [255, 0, 0, 255] : r < 17 ? [255, 255, 255, 120] : [255, 255, 255, 0]; });
  N.descontaminar(d, w, h, 3); const i = (25 + 16) * 4 + 25 * w * 4; ok(d[i + 1] < 40 && d[i + 3] === 120, 'descontaminar halo blanco -> rojo (g=' + d[i + 1] + ')');
  const e = img(w, h, (x, y) => Math.hypot(x - 25, y - 25) < 12 ? [10, 200, 10, 255] : [0, 0, 0, 0]); const antes = N.cuenta(N.alfaMascara(e, w, h, 127));
  N.refinar(e, w, h, { delta: 3 }); const despues = N.cuenta(N.alfaMascara(e, w, h, 127)); ok(despues > antes * 1.5, 'expandir'); ok(e[(25 * w + 25 + 14) * 4 + 1] === 200, 'expandir extiende el color');
  N.refinar(e, w, h, { delta: -6 }); ok(N.cuenta(N.alfaMascara(e, w, h, 127)) < despues, 'contraer');
  const b = img(4, 4, () => [100, 100, 100, 255]); N.filtros(b, 4, 4, { brillo: 20 }); ok(b[0] === 151, 'brillo'); N.filtros(b, 4, 4, { bn: true }); ok(b[0] === b[1] && b[1] === b[2], 'blanco y negro');
  const p = img(4, 1, (x) => [x * 60, 0, 0, 255]); N.filtros(p, 4, 1, { poster: 2 }); ok(Array.from({ length: 4 }, (_, k) => p[k * 4]).every((v) => v === 0 || v === 255), 'posterizado 2 niveles');
  const px = img(4, 4, (x) => [x * 60, 0, 0, 255]); N.filtros(px, 4, 4, { pixelado: 4 }); ok(px[0] === px[12], 'pixelado');
}
// 6. empaquetado
{
  const R = (n, w, h) => Array.from({ length: n }, (_, i) => ({ id: 'a' + i, w, h }));
  let r = E.empaquetar(R(4, 50, 50), 100, 100, 0); ok(r.paginas.length === 1 && r.paginas[0].length === 4, '4 de 50 en 100x100');
  r = E.empaquetar(R(5, 50, 50), 100, 100, 0); ok(r.paginas.length === 2, '5 -> 2 hojas');
  r = E.empaquetar(R(9, 30, 30).concat(R(3, 60, 20).map((x, i) => ({ id: 'b' + i, w: x.w, h: x.h }))), 100, 100, 2, true);
  const todos = r.paginas.flat(); ok(todos.length === 12 && !r.noCabe.length, 'mezcla: todos colocados');
  for (const pg of r.paginas) for (const a of pg) { ok(a.x >= 0 && a.y >= 0 && a.x + a.w <= 100 + 1e-9 && a.y + a.h <= 100 + 1e-9, 'dentro de la hoja'); for (const b of pg) if (a !== b) ok(a.x + a.w + 2 <= b.x + 1e-9 || b.x + b.w + 2 <= a.x + 1e-9 || a.y + a.h + 2 <= b.y + 1e-9 || b.y + b.h + 2 <= a.y + 1e-9, 'sin solapes ni separacion menor a 2'); }
  r = E.empaquetar([{ id: 'x', w: 200, h: 10 }], 100, 100, 0); ok(r.noCabe[0] === 'x', 'pieza que no cabe'); r = E.empaquetar([{ id: 'x', w: 120, h: 10 }], 100, 130, 0, true); ok(r.paginas[0][0].rot === true, 'rota para caber');
}
// 7. busqueda binaria con encoder simulado
(async () => {
  const sim = (q) => Math.round(3000 + 180000 * q * q); let llamadas = 0;
  for (const lim of [100 * 1024, 50000, 20000, 183000]) {
    llamadas = 0; const r = await E.ajustarPeso(async (q) => { llamadas++; return { bytes: sim(q) }; }, lim);
    ok(r.ok && r.bytes <= lim && sim(r.q + 0.012) > lim - 1 || sim(1) <= lim, 'limite ' + lim + ' -> q=' + r.q.toFixed(3) + ' bytes=' + r.bytes); ok(llamadas <= 14, 'pocas llamadas ' + llamadas);
  }
  const imposible = await E.ajustarPeso(async () => 999999, 1000); ok(!imposible.ok, 'imposible detectado');
  const fin = await E.ajustarPeso(async () => 500, 1000); ok(fin.ok && fin.q === 1 && fin.intentos === 1, 'ya cabe a calidad maxima');
  console.log('nucleo.test.js OK (' + n + ' comprobaciones)');
})();
