/* Pruebas en Node de la logica pura de RA: node pruebas/ra.test.js */
'use strict';
const assert = require('assert');
global.self = global;
const G = require('../js/geo.js'); global.RA = { Geo: G };
const M = require('../js/marcadores.js');
let ok = 0; function t(n, f) { try { f(); ok++; console.log('ok  ', n); } catch (e) { console.log('FALLA', n, '\n  ', e.message); process.exitCode = 1; } }
const D2R = Math.PI / 180;
function rnd(sem) { return function () { sem |= 0; sem = sem + 0x6D2B79F5 | 0; let x = Math.imul(sem ^ sem >>> 15, 1 | sem); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); }

t('homografia: reproduce 4 puntos y es invertible', () => {
  const s = [[0, 0], [1, 0], [1, 1], [0, 1]], d = [[10, 20], [200, 30], [180, 220], [5, 190]], H = G.homografia(s, d);
  assert(G.errorReproj(H, s, d) < 1e-9);
  const Hi = G.inv3(H), p = G.aplicar(H, 0.3, 0.7), b = G.aplicar(Hi, p[0], p[1]); assert(Math.abs(b[0] - 0.3) < 1e-9 && Math.abs(b[1] - 0.7) < 1e-9);
  const I = G.mul3(H, Hi).map(v => v / G.mul3(H, Hi)[8]); assert(Math.abs(I[0] - 1) < 1e-9 && Math.abs(I[1]) < 1e-9);
});
t('homografia: puntos intermedios proyectivos (diagonal no es el punto medio)', () => {
  const H = G.homografia([[0, 0], [1, 0], [1, 1], [0, 1]], [[0, 0], [100, 0], [80, 50], [20, 50]]);
  const c = G.aplicar(H, 0.5, 0.5); assert(c[1] > 25 - 1e-9 && c[1] < 40, 'centro no cae en 25 (perspectiva)'); assert(Math.abs(c[0] - 50) < 1e-9);
});

/* ---------- escena sintetica ---------- */
const K = { f: 520, cx: 320, cy: 240 }, W = 640, Hh = 480;
function Rz(a) { return [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1]; }
function Rx(a) { return [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)]; }
function Ry(a) { return [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a)]; }
/* pose camara OpenCV: el marcador de cara a la camara = r1=(1,0,0), r2=(0,-1,0), r3=(0,0,-1) */
function poseAleatoria(r, inclinMax) {
  const base = [1, 0, 0, 0, -1, 0, 0, 0, -1];
  const R = G.mul3(G.mul3(base, G.mul3(Rz(r() * 2 * Math.PI), G.mul3(Rx((r() * 2 - 1) * inclinMax * D2R), Ry((r() * 2 - 1) * inclinMax * D2R)))), [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  const lado = 45 + r() * 170, z = K.f / lado * (1); // lado del marcador = 1 unidad: z = f/lado
  const x = (r() - 0.5) * (W - lado * 1.9) / K.f * z, y = (r() - 0.5) * (Hh - lado * 1.9) / K.f * z;
  return { R, t: [x, y, z] };
}
function render(id, pose, r, ruido, difumina) {
  const g = new Float32Array(W * Hh), mat = M.matriz(id);
  const quad = G.MODELO.map(p => G.proyectar(pose, K, [p[0], p[1], 0])), Hm = G.homMarcador(quad), Hi = G.inv3(Hm);
  const gx = (r() - 0.5) * 60, gy = (r() - 0.5) * 60, base = 150 + r() * 60;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    let s = 0;
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
      const p = G.aplicar(Hi, x + (a + 0.5) / 3 - 0.5, y + (b + 0.5) / 3 - 0.5), u = p[0] + 0.5, v = 0.5 - p[1]; // 0..1 del cuadro de 6x6
      let val = 235; if (u >= 0 && u < 1 && v >= 0 && v < 1) val = mat[Math.floor(v * 6)][Math.floor(u * 6)] ? 235 : 22; else if (u > -1 / 6 && u < 7 / 6 && v > -1 / 6 && v < 7 / 6) val = 235;
      else val = base + (x / W - 0.5) * gx + (y / Hh - 0.5) * gy;
      s += val;
    }
    g[y * W + x] = s / 9;
  }
  const o = new Uint8Array(W * Hh);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    let v = g[y * W + x];
    if (difumina) { let s = 0, n = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const xx = Math.min(W - 1, Math.max(0, x + i)), yy = Math.min(Hh - 1, Math.max(0, y + j)); s += g[yy * W + xx]; n++; } v = s / n; }
    o[y * W + x] = Math.max(0, Math.min(255, v + gauss(r) * ruido));
  }
  return { g: o, quad };
}
t('diccionario: 50 codigos, distancia minima entre rotaciones >= 4', () => {
  assert.strictEqual(M.codigos.length, 50);
  const rot = c => { let q = 0; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((c >> ((3 - j) * 4 + i)) & 1) q |= 1 << (i * 4 + j); return q; };
  const pop = x => { let n = 0; while (x) { n += x & 1; x >>= 1; } return n; };
  let dmin = 99; for (let a = 0; a < 50; a++) { let ra = M.codigos[a]; for (let k = 0; k < 4; k++) { for (let b = 0; b < 50; b++) if (!(a === b && k === 0)) dmin = Math.min(dmin, pop(ra ^ M.codigos[b])); ra = rot(ra); } }
  assert(dmin >= 4, 'dmin=' + dmin);
});
t('pose: reconstruye R y t de una homografia exacta (sin ruido)', () => {
  const r = rnd(7); let maxT = 0, maxR = 0;
  for (let n = 0; n < 100; n++) {
    const p = poseAleatoria(r, 55), quad = G.MODELO.map(q => G.proyectar(p, K, [q[0], q[1], 0])), est = G.poseDeHom(G.homMarcador(quad), K);
    maxT = Math.max(maxT, Math.hypot(est.t[0] - p.t[0], est.t[1] - p.t[1], est.t[2] - p.t[2]) / p.t[2]);
    const Rr = G.mul3(est.R, G.tr3(p.R)), ang = Math.acos(Math.max(-1, Math.min(1, (Rr[0] + Rr[4] + Rr[8] - 1) / 2))) / D2R; maxR = Math.max(maxR, ang);
  }
  assert(maxT < 1e-6 && maxR < 1e-4, 't ' + maxT + ' R ' + maxR);
});
function medir(n, semilla, inclin, ruido, difumina) {
  const r = rnd(semilla); let ok = 0, malId = 0, errC = 0, errT = 0, errR = 0, nC = 0; const lt = [], lr = [];
  for (let i = 0; i < n; i++) {
    const id = Math.floor(r() * 50), p = poseAleatoria(r, inclin), s = render(id, p, r, ruido, difumina), d = M.detectar(s.g, W, Hh).filter(x => x.id === id), todos = M.detectar(s.g, W, Hh);
    if (todos.some(x => x.id !== id)) malId++;
    if (!d.length) continue; ok++;
    const e = d[0].esquinas; let m = 0; e.forEach((c, k) => { m = Math.max(m, Math.hypot(c[0] - s.quad[k][0], c[1] - s.quad[k][1])); }); errC = Math.max(errC, m); nC += m;
    const est = G.poseDeHom(G.homMarcador(e), K); lt.push(Math.hypot(est.t[0] - p.t[0], est.t[1] - p.t[1], est.t[2] - p.t[2]) / p.t[2]);
    const Rr = G.mul3(est.R, G.tr3(p.R)); lr.push(Math.acos(Math.max(-1, Math.min(1, (Rr[0] + Rr[4] + Rr[8] - 1) / 2))) / D2R);
  }
  const p95 = a => a.sort((x, y) => x - y)[Math.floor(a.length * 0.95)] || 0; errT = p95(lt); errR = p95(lr);
  return { tasa: ok / n, malId, errC, media: nC / Math.max(1, ok), errT, errR };
}
t('deteccion: rotaciones 0..360, inclinacion <=45 y ruido leve', () => {
  const m = medir(120, 11, 45, 6, false); console.log('     ', JSON.stringify(m, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v));
  assert(m.tasa >= 0.97, 'tasa ' + m.tasa); assert(m.malId === 0, 'ids falsos'); assert(m.errC < 3, 'esquina ' + m.errC); assert(m.errT < 0.06 && m.errR < 12, 'pose p95 t ' + m.errT + ' R ' + m.errR);
});
t('deteccion: ruido gaussiano fuerte (sigma 14) con desenfoque', () => {
  const m = medir(100, 23, 40, 14, true); console.log('     ', JSON.stringify(m, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v));
  assert(m.tasa >= 0.9, 'tasa ' + m.tasa); assert(m.malId === 0, 'ids falsos'); assert(m.errC < 4, 'esquina ' + m.errC); assert(m.errR < 25 && m.errT < 0.12, 'R ' + m.errR);
});
t('deteccion: inclinacion fuerte (60) mantiene la mayoria', () => {
  const m = medir(80, 31, 60, 6, false); console.log('     ', JSON.stringify(m, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v));
  assert(m.tasa >= 0.8 && m.malId === 0);
});
t('deteccion: no inventa marcadores en ruido, rectangulos oscuros ni bordes', () => {
  const r = rnd(5); let fp = 0;
  for (let k = 0; k < 40; k++) {
    const g = new Uint8Array(W * Hh); for (let i = 0; i < g.length; i++) g[i] = 128 + gauss(r) * 20;
    for (let n = 0; n < 6; n++) { const x0 = r() * 500, y0 = r() * 380, w = 30 + r() * 100, h = 30 + r() * 80, v = r() * 80; for (let y = y0 | 0; y < Math.min(Hh, y0 + h); y++) for (let x = x0 | 0; x < Math.min(W, x0 + w); x++) g[y * W + x] = v; }
    fp += M.detectar(g, W, Hh).length;
  }
  assert.strictEqual(fp, 0, 'falsos positivos ' + fp);
});
t('deteccion: varios marcadores a la vez y orden de esquinas', () => {
  const r = rnd(99), a = render(3, poseAleatoria(r, 20), r, 3, false);
  assert.strictEqual(M.detectar(a.g, W, Hh).length, 1);
  assert.strictEqual(M.detectar(a.g, W, Hh)[0].id, 3);
});
t('lente: distorsion inversa recupera el punto y es barril', () => {
  for (const [k1, k2] of [[0.2, 0.05], [0.34, 0.55], [0, 0]]) for (const [x, y] of [[0.3, 0.1], [-0.7, 0.5], [0.9, -0.2]]) {
    const d = G.distorsion(x, y, k1, k2), b = G.distorsionInversa(d[0], d[1], k1, k2); assert(Math.hypot(b[0] - x, b[1] - y) < 1e-9);
  }
  const d = G.distorsion(0.8, 0, 0.3, 0.1); assert(d[0] > 0.8, 'el muestreo se aleja del centro con k>0'); assert.deepStrictEqual(G.distorsion(0, 0, 0.3, 0.1), [0, 0]);
  const e = G.distorsionInversa(0.8, 0, 0.3, 0.1); assert(e[0] < 0.8, 'en pantalla el borde se comprime');
});
t('cuaterniones: slerp, matriz<->cuaternion, orientacion del dispositivo', () => {
  const a = G.Q.deEuler(0.3, 0.5, -0.2, 'YXZ'), m = G.Q.aMat3(a), b = G.Q.deMat3(m); assert(Math.abs(Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]) - 1) < 1e-9);
  const s = G.Q.slerp([0, 0, 0, 1], G.Q.norm([0, Math.sin(0.5), 0, Math.cos(0.5)]), 0.5); assert(Math.abs(s[1] - Math.sin(0.25)) < 1e-9);
  // telefono vertical (beta=90) mirando al horizonte: la camara mira hacia -z (alpha=0)
  const q = G.cuatDispositivo(0, 90, 0, 0), f = G.Q.rotar(q, [0, 0, -1]); assert(Math.abs(f[0]) < 1e-9 && Math.abs(f[1]) < 1e-9 && f[2] < -0.999, JSON.stringify(f));
  // telefono plano (beta=0) con la pantalla arriba: la camara trasera mira al suelo (-y)
  const p = G.Q.rotar(G.cuatDispositivo(0, 0, 0, 0), [0, 0, -1]); assert(p[1] < -0.999, JSON.stringify(p));
  const q2 = G.cuatDispositivo(90, 90, 0, 0), f2 = G.Q.rotar(q2, [0, 0, -1]); assert(Math.abs(f2[0] + 1) < 1e-9, 'alpha=90 gira a la izquierda: ' + JSON.stringify(f2));
});
t('matriz de Three y proyeccion coinciden con la pose', () => {
  const r = rnd(3), p = poseAleatoria(r, 30), mt = G.matrizThree(p), pt = [0.2, -0.1, 0.3];
  const x = mt[0] * pt[0] + mt[4] * pt[1] + mt[8] * pt[2] + mt[12], y = mt[1] * pt[0] + mt[5] * pt[1] + mt[9] * pt[2] + mt[13], z = mt[2] * pt[0] + mt[6] * pt[1] + mt[10] * pt[2] + mt[14];
  const px = K.cx + K.f * x / -z, py = K.cy - K.f * y / -z, q = G.proyectar(p, K, pt); assert(Math.hypot(px - q[0], py - q[1]) < 1e-6);
});
t('azimut/elevacion/distancia de la camara y homografia desde la pose', () => {
  // camara a 40 grados de elevacion y azimut 120 grados, a 3 lados del marcador, mirando al origen
  const az = 120 * D2R, el = 40 * D2R, d = 3, c = [d * Math.cos(el) * Math.cos(az), d * Math.cos(el) * Math.sin(az), d * Math.sin(el)];
  const z = c.map(v => -v / d);                       // eje optico (hacia el origen), en coordenadas del marcador
  let x = [z[1], -z[0], 0]; const nx = Math.hypot(x[0], x[1]); x = x.map(v => v / nx);  // derecha de la camara: perpendicular horizontal
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]]; // z x x = y de la camara (abajo)
  const Rc = [x[0], x[1], x[2], y[0], y[1], y[2], z[0], z[1], z[2]], Rm = G.tr3(Rc);   // marcador -> camara
  const tt = [0, 1, 2].map(i => -(Rc[i * 3] * c[0] + Rc[i * 3 + 1] * c[1] + Rc[i * 3 + 2] * c[2]));
  const e = G.azElDist({ R: Rc, t: tt }); assert(Math.abs(e.az - 120) < 1e-6 && Math.abs(e.el - 40) < 1e-6 && Math.abs(e.dist - 3) < 1e-9, JSON.stringify(e));
  const pose = { R: Rc, t: tt }, H = G.homDePose(pose, K), q = G.aplicar(H, 0.2, -0.1), r = G.proyectar(pose, K, [0.2, -0.1, 0]); assert(Math.hypot(q[0] - r[0], q[1] - r[1]) < 1e-9);
});
t('CSS matrix3d reproduce la homografia', () => { const H = G.cuadAHom([[10, 10], [200, 30], [190, 150], [20, 120]]); assert(/^matrix3d\(/.test(G.cssMatrix3d(H, 1, 1))); });
global.RA.Marcadores = M; const B = require('../js/biblioteca.js'); global.RA.Biblio = B; global.RA.App = { aj: { ladoMm: 80 } }; global.Tr = { h: () => null };
const Ov = require('../js/overlays.js'), Rc = require('../js/recorte.js'), CG = (global.window = global, require('../js/captura.js'), global.RA.CG);
t('overlay pegado al marcador: cuadrilatero = esquinas proyectadas y vuelta con aMarcador', () => {
  const r = rnd(41), p = poseAleatoria(r, 35), Hm = G.homDePose(p, K), ov = Ov.nuevo({ ancla: 'marcador', m: { x: 0, y: 0, w: 1, h: 1, rot: 0 } }), q = Ov.cuadPx(ov, { W, H: Hh, Hm });
  G.MODELO.forEach((c, i) => { const e = G.proyectar(p, K, [c[0], c[1], 0]); assert(Math.hypot(q[i][0] - e[0], q[i][1] - e[1]) < 1e-6); });
  const m0 = { x: 0.2, y: -0.1, w: 0.6, h: 0.4, rot: 25 }, qpx = Ov.cuadPx(Ov.nuevo({ ancla: 'marcador', m: m0 }), { W, H: Hh, Hm }), ov2 = Ov.nuevo({ ancla: 'imagen', q: qpx.map(c => [c[0] / W, c[1] / Hh]) });
  assert(Ov.aMarcador(ov2, { W, H: Hh, Hm })); assert.strictEqual(ov2.ancla, 'marcador'); Object.keys(m0).forEach(k => assert(Math.abs(ov2.m[k] - m0[k]) < 1e-6, k + ' ' + ov2.m[k]));
});
t('overlay con rostro: caja girada, y punto dentro/fuera del cuadrilatero', () => {
  const ov = Ov.nuevo({ ancla: 'rostro', r: { x: 0, y: 0, w: 1, h: 1 } }), q = Ov.cuadPx(ov, { W, H: Hh, rostro: { x: 100, y: 50, w: 80, h: 100, ang: 0 } });
  assert.deepStrictEqual(q.map(p => p.map(Math.round)), [[100, 50], [180, 50], [180, 150], [100, 150]]); assert(Ov.dentro(q, 140, 100)); assert(!Ov.dentro(q, 300, 100)); assert.strictEqual(Ov.cuadPx(ov, { W, H: Hh }), null);
});
t('iframes: solo https y dominios permitidos', () => {
  assert(!Ov.urlPermitida('javascript:alert(1)')); assert(!Ov.urlPermitida('http://ejemplo.com')); assert(!Ov.urlPermitida('https://malo.com/x', ['ejemplo.com'])); assert(Ov.urlPermitida('https://www.ejemplo.com/x', ['ejemplo.com'])); assert(!Ov.urlPermitida('data:text/html,hola', ['ejemplo.com']));
});
t('biblioteca: 40 items SVG validos con anclas y parametros', () => { assert(B.lista.length >= 35); B.lista.forEach(i => { const s = B.svgTexto(i, { t: '<x>' }); assert(/^<svg/.test(s) && !/<x>/.test(s)); }); assert(B.lista.some(i => i.pant) && B.CATS.every(c => B.lista.some(i => i.cat === c[0]))); });
t('PNG propio: quitar color con tolerancia y borde suave; recorte al contenido', () => {
  const w = 10, h = 10, d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) { d[i * 4] = 0; d[i * 4 + 1] = 255; d[i * 4 + 2] = 0; d[i * 4 + 3] = 255; }
  for (let y = 3; y < 7; y++) for (let x = 3; x < 7; x++) { const i = (y * w + x) * 4; d[i] = 255; d[i + 1] = 0; d[i + 3] = 255; }
  Rc.quitarColor(d, 0, 255, 0, 30, 10); assert.strictEqual(d[3], 0); assert.strictEqual(d[(4 * w + 4) * 4 + 3], 255); assert.deepStrictEqual(Rc.cajaOpaca(d, w, h), { x: 3, y: 3, w: 4, h: 4 }); assert.deepStrictEqual(Rc.recortar(100, 50, { x: -5, y: 10, w: 500, h: 20 }), { x: 0, y: 10, w: 100, h: 20 });
});
t('captura guiada: sectores, nitidez y cobertura', () => {
  assert.strictEqual(CG.sector(0, 16), 0); assert.strictEqual(CG.sector(359.9, 16), 15); assert.strictEqual(CG.sector(-10, 16), 15); assert.strictEqual(CG.sector(90, 16), 4);
  const nit = new Uint8Array(64 * 64).fill(100), bor = new Uint8Array(64 * 64); for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) bor[y * 64 + x] = x < 32 ? 40 : 200; const conRuido = new Uint8Array(64 * 64); for (let i = 0; i < conRuido.length; i++) conRuido[i] = (i * 37) % 256;
  assert(CG.nitidez(nit, 64, 64) < 1 && CG.nitidez(conRuido, 64, 64) > CG.nitidez(bor, 64, 64)); assert.strictEqual(CG.faltan().length, 16);
});
console.log(ok + ' pruebas pasadas');
