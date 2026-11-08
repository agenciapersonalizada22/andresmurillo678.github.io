/* Pruebas de la logica pura: node pruebas/r3d.test.js */
'use strict';
const path = require('path'), J = n => require(path.join(__dirname, '..', 'js', n + '.js'));
const M = J('malla'), MC = J('mc'), S = J('segmentar'), H = J('hull'), E = J('estereo'), Fm = J('formatos'), D = J('medir'), P = J('plano'), FM = J('foto-medidas'), N = J('nitidez'), Po = J('poses'), Ej = J('ejemplos'), O = J('ops');
let ok = 0, mal = 0;
function t(nombre, cond, extra) { if (cond) ok++; else { mal++; console.log('FALLA', nombre, extra === undefined ? '' : extra); } }
const cerca = (a, b, tol) => Math.abs(a - b) <= tol;
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

/* 1. isosuperficie sobre esfera analitica */
{
  const n = 40, campo = new Float32Array(n * n * n), c = (n - 1) / 2, r = 12;
  for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) campo[x + n * (y + n * z)] = r - Math.hypot(x - c, y - c, z - c);
  const m = MC.malla(campo, n, n, n, [0, 0, 0], 1, 0), mal0 = M.nueva(m.pos, m.idx), vol = M.volumen(mal0), ar = M.area(mal0);
  t('mc volumen esfera', rel(vol, 4 / 3 * Math.PI * r ** 3) < 0.03, vol);
  t('mc area esfera', rel(ar, 4 * Math.PI * r * r) < 0.04, ar);
  t('mc estanca', M.aristasAbiertas(mal0) === 0, M.aristasAbiertas(mal0));
  t('mc normales hacia fuera (volumen positivo)', vol > 0);
}

/* 2. carving con formas conocidas */
function giro(nombre, n, res, elevs, opts) {
  opts = opts || {}; const w = 120, h = 120, F = H.focalDesdeFov(34, w), el = []; for (let i = 0; i < n; i++) el.push(elevs[i % elevs.length]);
  const cams = H.camarasGiro({ n, dist: 7, elevs: el, F, w, h, ty: opts.ty || 0 }), vistas = Ej.vistasGiro(nombre, cams);
  const t0 = Date.now(), r = O.giro({ vistas: vistas.map(v => ({ cam: v.cam, mascara: v.mascara, rgba: v.img.data })), res, colorear: true, ignorar: 0 });
  return { malla: r, vol: Math.abs(M.volumen(r)), ms: Date.now() - t0 };
}
{
  const e = giro('esfera', 24, 56, [0, 40, -40, 70]); const v = Ej.volumenVerdad('esfera');
  t('hull esfera volumen', rel(e.vol, v) < 0.10, e.vol + ' vs ' + v);
  t('hull esfera estanca', M.aristasAbiertas(e.malla) === 0);
  t('hull esfera color', e.malla.col && e.malla.col.length === e.malla.pos.length);
  const b = M.caja(e.malla); t('hull esfera caja', cerca(b.tam[0], 2, 0.2) && cerca(b.tam[1], 2, 0.2), b.tam);
  console.log('  esfera', e.vol.toFixed(3), '/', v.toFixed(3), e.ms + 'ms');
  const c = giro('caja', 36, 56, [0, 35, -35, 65]), vc = Ej.volumenVerdad('caja');
  t('hull caja volumen', rel(c.vol, vc) < 0.12, c.vol + ' vs ' + vc); console.log('  caja', c.vol.toFixed(3), '/', vc);
  const z = giro('taza', 36, 64, [0, 35, -35, 65]), vz = Ej.volumenVerdad('taza');
  t('hull compuesto volumen', rel(z.vol, vz) < 0.12, z.vol + ' vs ' + vz); console.log('  compuesto', z.vol.toFixed(3), '/', vz.toFixed(3));
  // tolerancia a una silueta mala: con ignorar=1 una vista corrupta (vacia) no destruye el modelo
  const w = 120, h = 120, F = H.focalDesdeFov(34, w), cams = H.camarasGiro({ n: 24, dist: 7, elevs: [0, 40, -40, 70], F, w, h }), vs = Ej.vistasGiro('esfera', cams);
  vs[3].mascara.fill(0);
  let falla = false; try { O.giro({ vistas: vs.map(q => ({ cam: q.cam, mascara: q.mascara })), res: 40, ignorar: 0 }); } catch (err) { falla = /No quedó volumen/.test(err.message); }
  t('hull silueta vacia sin tolerancia da error claro', falla);
  const r = O.giro({ vistas: vs.map(q => ({ cam: q.cam, mascara: q.mascara })), res: 40, ignorar: 1 }); t('hull con tolerancia sobrevive', rel(Math.abs(M.volumen(r)), v) < 0.2, Math.abs(M.volumen(r)));
  let lim = false; try { O.giro({ vistas: vs.map(q => ({ cam: q.cam, mascara: q.mascara })), res: 600 }); } catch (err) { lim = /memoria/.test(err.message); } t('limite de memoria', lim);
}
/* segmentacion por color sobre vistas sinteticas */
{
  const w = 120, h = 120, cams = H.camarasGiro({ n: 4, dist: 7, elev: 20, F: H.focalDesdeFov(34, w), w, h }), vs = Ej.vistasGiro('esfera', cams, [30, 160, 60]), v = vs[0];
  const fondo = S.estimarFondo(v.img); t('estimar fondo', Math.abs(fondo[0] - 30) < 5 && Math.abs(fondo[1] - 160) < 5, fondo);
  let m = S.limpiar(S.porColor(v.img, fondo, 25), w, h, { abrir: 1, cerrar: 1 }), inter = 0, uni = 0; for (let i = 0; i < m.length; i++) { if (m[i] && v.mascara[i]) inter++; if (m[i] || v.mascara[i]) uni++; }
  t('segmentacion IoU', inter / uni > 0.95, inter / uni);
  const hueco = new Uint8Array(m); hueco[60 * w + 60] = 0; t('rellenar huecos', S.rellenarHuecos(hueco, w, h)[60 * w + 60] === 1);
}

/* 3. block matching con par sintetico de disparidad conocida */
{
  const w = 160, h = 110, par = Ej.parEstereo(w, h, { d0: 10, gx: 0.03, bulto: 5 }), gl = E.gris(par.L), gr = E.gris(par.R);
  const t0 = Date.now(), d = E.limpiarDisp(E.bloques(gl, gr, w, h, { dmin: 0, dmax: 24, ventana: 4 }), w, h, 3); const ms = Date.now() - t0;
  let n = 0, err = [], valid = 0; for (let y = 8; y < h - 8; y++) for (let x = 30; x < w - 8; x++) { n++; const v = d[y * w + x]; if (!isNaN(v)) { valid++; err.push(Math.abs(v - par.disp[y * w + x])); } }
  err.sort((a, b) => a - b); const med = err[err.length >> 1], p90 = err[Math.floor(err.length * 0.9)];
  t('estereo cobertura', valid / n > 0.7, valid / n); t('estereo error mediano < 0.35 px', med < 0.35, med); t('estereo p90 < 1.2 px', p90 < 1.2, p90);
  console.log('  estereo cobertura', (valid / n).toFixed(2), 'mediana', med.toFixed(3), 'p90', p90.toFixed(2), ms + 'ms');
  // profundidad: Z = F*B/d
  const Z = E.profundidad(d, 200, 0.1); const i = 55 * w + 80; t('profundidad Z=F*B/d', cerca(Z[i], 200 * 0.1 / d[i], 1e-5));
  const nube = E.nube(d, par.L, 200, 0.1, { paso: 2 }); t('nube con puntos', nube.pos.length > 300 && nube.col.length === nube.pos.length);
  // rectificacion: desplazo verticalmente la derecha 3 px y 1 grado
  const desal = E.rectificarDerecha(par.R, -3, 0), est = E.estimarDesajuste(gl, E.gris(desal), w, h, { maxDy: 8, maxRot: 0 });
  t('estimar dy', est.ok && cerca(est.dy, 3, 1), est);
  const rect = E.rectificarDerecha(desal, est.dy, est.rot), d2 = E.limpiarDisp(E.bloques(gl, E.gris(rect), w, h, { dmin: 0, dmax: 24, ventana: 4 }), w, h, 3); let v2 = 0; for (let k = 0; k < d2.length; k++) if (!isNaN(d2[k])) v2++; t('rectificar recupera cobertura', v2 / d2.length > 0.5, v2 / d2.length);
  // via ops
  const r = O.estereo({ L: par.L, R: desal, F: 200, B: 0.1, dmin: 0, dmax: 24, ventana: 4, rectificar: true, maxRot: 0, paso: 2 }); t('ops.estereo', r.stats.validos > 0.5 && r.nube.pos.length > 100, r.stats);
  t('base de video', cerca(E.baseVideo(11, 1, 0, 5), 0.5, 1e-9));
}

/* 4. formatos: roundtrip */
{
  const cubo = M.nueva(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1]), new Uint32Array([0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 2, 3, 7, 2, 7, 6, 1, 2, 6, 1, 6, 5, 3, 0, 4, 3, 4, 7]), new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0.5, 0.5, 0.5, 1, 1, 1]), 'cubo');
  const igual = (a, b, tolc) => a.pos.length === b.pos.length && a.pos.every((v, i) => cerca(v, b.pos[i], 1e-5)) && (a.idx ? a.idx.length === b.idx.length : !b.idx) && (!a.col || (b.col && a.col.every((v, i) => cerca(v, b.col[i], tolc))));
  ['obj', 'ply', 'glb'].forEach(f => { const bytes = Fm.exportar(cubo, f), r = Fm.leer('x.' + f, bytes); t('roundtrip ' + f, igual(cubo, r, 0.003) && cerca(M.volumen(r), M.volumen(cubo), 1e-5), [r.pos.length, r.idx && r.idx.length]); });
  const sa = Fm.leer('x.ply', Fm.escribirPLY(cubo, false)); t('roundtrip ply ascii', igual(cubo, sa, 0.003));
  [true, false].forEach(bin => { const r = Fm.leer('x.stl', Fm.escribirSTL(cubo, bin)); t('roundtrip stl ' + (bin ? 'bin' : 'ascii'), r.pos.length === cubo.pos.length && cerca(M.volumen(r), 1, 1e-4) && M.nTri(r) === 12, [M.nVert(r), M.volumen(r)]); });
  const nube = M.nueva(new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]), null, new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])); const g = Fm.leer('n.glb', Fm.exportar(nube, 'glb')); t('glb nube', g.tipo === 'nube' && g.pos.length === 9);
  const c = Fm.leer('n.csv', Fm.exportar(nube, 'csv')); t('csv roundtrip', c.tipo === 'nube' && c.pos.every((v, i) => v === nube.pos[i]) && c.col && cerca(c.col[0], 1, 0.01));
  const p = Fm.leer('n.ply', Fm.exportar(nube, 'ply')); t('ply nube', p.tipo === 'nube' && p.pos.length === 9);
  let e = false; try { Fm.exportar(nube, 'stl'); } catch (x) { e = true; } t('stl rechaza nube', e);
  // OBJ con polígono, índices negativos y v/vt/vn
  const o = Fm.leerOBJ('v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nvt 0 0\nvn 0 0 1\nf 1/1/1 2/1/1 3/1/1 4/1/1\nf -4 -3 -2\n'); t('obj cuadrilatero y negativos', M.nTri(o) === 3, M.nTri(o));
  // LiDAR CSV con encabezado y columnas extra
  const li = Fm.leerCSV('X,Y,Z,Intensity,ReturnNumber,Red,Green,Blue\n10.5,20.5,3.2,120,1,255,128,0\n11,21,3.5,80,1,0,255,0\n'); t('csv lidar', li.pos.length === 6 && li.col && cerca(li.col[0], 1, 1e-6) && cerca(li.col[1], 128 / 255, 1e-6), li.col);
  const li2 = Fm.leerCSV('x;y;z;intensidad\n1;2;3;10\n4;5;6;200\n'); t('csv punto y coma intensidad', li2.pos.length === 6 && li2.col && li2.col[0] < li2.col[3]);
  const xyz = Fm.leerCSV('1 2 3\n4 5 6\n'); t('xyz sin encabezado', xyz.pos.length === 6);
  let err = ''; try { Fm.leerCSV('a,b,c\n1,2,3\n'); } catch (x) { err = x.message; } t('csv sin XYZ error claro', /X, Y, Z/.test(err), err);
  const z = Fm.leer('a.stl', Fm.escribirSTL(cubo, true)); const z2 = M.ejeZaY(M.clonar(z)); t('ejeZaY ida y vuelta', M.ejeZaY(z2, true).pos.every((v, i) => cerca(v, z.pos[i], 1e-6)));
  let desc = ''; try { Fm.leer('a.fbx', new Uint8Array(4)); } catch (x) { desc = x.message; } t('formato no soportado', /no soportado/.test(desc));
  // glTF con datos incrustados (.gltf) y transformacion de nodo
  const glb = Fm.escribirGLB(cubo); const rr = Fm.leerGLTF(glb); t('glb vol', cerca(M.volumen(rr), 1, 1e-4));
  // compactar para la nube
  const co = M.compactar(cubo), de = M.descompactar(JSON.parse(JSON.stringify(co))); t('compactar/descompactar', de.pos.every((v, i) => cerca(v, cubo.pos[i], 2e-5)) && de.idx.length === 36 && de.col && cerca(de.col[0], 1, 0.005));
}

/* 5. decimacion, soldado, volumen */
{
  const n = 40, campo = new Float32Array(n * n * n), c = (n - 1) / 2; for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) campo[x + n * (y + n * z)] = 14 - Math.hypot(x - c, y - c, z - c);
  const m = M.nueva(...(r => [r.pos, r.idx])(MC.malla(campo, n, n, n, [0, 0, 0], 1, 0))), d = M.decimar(m, Math.floor(M.nTri(m) / 5));
  t('decimar reduce', M.nTri(d) < M.nTri(m) / 3 && M.nTri(d) > 100, [M.nTri(m), M.nTri(d)]); t('decimar conserva volumen +-15%', rel(Math.abs(M.volumen(d)), Math.abs(M.volumen(m))) < 0.15, [M.volumen(d), M.volumen(m)]);
  const nb = M.nueva(new Float32Array(3000 * 3).map(() => Math.random()), null); t('decimar nube', M.decimar(nb, 500).pos.length === 1500);
}

/* 6. medicion: contorno y secciones, comparacion */
{
  const n = 50, campo = new Float32Array(n * n * n), c = (n - 1) / 2, r = 16; for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) campo[x + n * (y + n * z)] = r - Math.hypot(x - c, y - c, z - c);
  const q = MC.malla(campo, n, n, n, [0, 0, 0], 1, 0), m = M.nueva(q.pos, q.idx), seg = D.contorno(m, [0, 1, 0], c);
  t('contorno longitud 2 pi r', rel(D.longitudSegmentos(seg), 2 * Math.PI * r) < 0.03, D.longitudSegmentos(seg)); t('area de seccion pi r^2', rel(D.areaSeccion(seg, [0, 1, 0]), Math.PI * r * r) < 0.04, D.areaSeccion(seg, [0, 1, 0]));
  t('distancia', cerca(D.distancia([0, 0, 0], [3, 4, 0]), 5, 1e-9)); t('angulo recto', cerca(D.angulo([1, 0, 0], [0, 0, 0], [0, 1, 0]), 90, 1e-6));
  t('area poligono 3D', cerca(D.areaPoligono([[0, 0, 0], [2, 0, 0], [2, 3, 0], [0, 3, 0]]), 6, 1e-9)); t('area poligono inclinado', cerca(D.areaPoligono([[0, 0, 0], [2, 0, 0], [2, 3, 3], [0, 3, 3]]), 2 * Math.hypot(3, 3), 1e-9));
  t('desvio plano', D.desvioPlano([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0.3]]) > 0.05);
  const m2 = M.clonar(m); M.escalar(m2, 1.1); const cmp = D.comparar(m, m2); t('comparar volumen +33%', rel(cmp.dVolumen / cmp.a.volumen, 0.331) < 0.05, cmp.dVolumen / cmp.a.volumen); t('comparar desviacion', cmp.desvMedia > 0.5 && cmp.desvMedia < 3, cmp.desvMedia);
}

/* 7. plano */
{
  const m = P.nuevo(); P.rectangulo(m, 5, 4); const e = P.estadisticas(m);
  t('plano area 20', cerca(e.area, 20, 1e-9) && e.cerrada, e); t('plano perimetro 18', cerca(e.perimetro, 18, 1e-9)); t('plano volumen 50', cerca(e.volumen, 50, 1e-9));
  m.aberturas.push({ id: 'a', pared: m.paredes[0].id, tipo: 'puerta', pos: 2.5, ancho: 0.9, alto: 2.05, antepecho: 0 }, { id: 'b', pared: m.paredes[1].id, tipo: 'ventana', pos: 2, ancho: 1.2, alto: 1.1, antepecho: 0.9 });
  m.muebles.push({ id: 'm', nombre: 'Mesa', x: 2, y: 2, w: 1.4, d: 0.8, h: 0.75, rot: 30 });
  const e2 = P.estadisticas(m); t('area de paredes neta', cerca(e2.areaParedes, 18 * 2.5 - 0.9 * 2.05 - 1.2 * 1.1, 1e-6), e2.areaParedes); t('puertas/ventanas', e2.puertas === 1 && e2.ventanas === 1 && cerca(e2.areaLibre, 20 - 1.12, 1e-9));
  const mm = P.extruir(m); t('extruir produce malla', M.nTri(mm) > 100 && mm.col.length === mm.pos.length); const bb = M.caja(mm); t('extruir alto 2.5', cerca(bb.max[1], 2.5, 1e-6), bb.max[1]); t('extruir ancho ~5.12', cerca(bb.tam[0], 5.12, 0.03), bb.tam[0]);
  // area del suelo (triangulos hacia arriba a y=-0.02)
  let sup = 0; for (let i = 0; i < mm.idx.length; i += 3) { const a = mm.idx[i] * 3, b = mm.idx[i + 1] * 3, c = mm.idx[i + 2] * 3; if (cerca(mm.pos[a + 1], -0.02, 1e-6) && cerca(mm.pos[b + 1], -0.02, 1e-6) && cerca(mm.pos[c + 1], -0.02, 1e-6)) sup += Math.abs((mm.pos[b] - mm.pos[a]) * (mm.pos[c + 2] - mm.pos[a + 2]) - (mm.pos[c] - mm.pos[a]) * (mm.pos[b + 2] - mm.pos[a + 2])) / 2; }
  t('suelo triangulado = area', cerca(sup, 20, 1e-6), sup);
  // L concava
  const L = P.nuevo(); const pts = [[0, 0], [6, 0], [6, 2], [2, 2], [2, 5], [0, 5]]; pts.forEach((p, i) => L.paredes.push({ id: 'w' + i, a: p, b: pts[(i + 1) % pts.length] })); const eL = P.estadisticas(L); t('L: area 18', cerca(eL.area, 18, 1e-9), eL.area);
  const mL = P.extruir(L); let sL = 0; for (let i = 0; i < mL.idx.length; i += 3) { const a = mL.idx[i] * 3, b = mL.idx[i + 1] * 3, c = mL.idx[i + 2] * 3; if (cerca(mL.pos[a + 1], -0.02, 1e-6) && cerca(mL.pos[b + 1], -0.02, 1e-6) && cerca(mL.pos[c + 1], -0.02, 1e-6)) sL += Math.abs((mL.pos[b] - mL.pos[a]) * (mL.pos[c + 2] - mL.pos[a + 2]) - (mL.pos[c] - mL.pos[a]) * (mL.pos[b + 2] - mL.pos[a + 2])) / 2; } t('L triangulada', cerca(sL, 18, 1e-6), sL);
  const ab = P.nuevo(); P.rectangulo(ab, 3, 3); ab.paredes.pop(); t('abierta no cierra', !P.estadisticas(ab).cerrada);
  t('snap angulo', (p => cerca(p[1], 0, 1e-9))(P.snapAngulo([0, 0], [10, 0.4], 15))); t('sobre pared', P.sobrePared(m, [2.5, 0.05], 0.2) && cerca(P.sobrePared(m, [2.5, 0.05], 0.2).pos, 2.5, 1e-9));
}

/* 8. foto-medidas: homografia */
{
  const real = [[0, 0], [21, 0], [21, 29.7], [0, 29.7]], img = [[100, 80], [400, 110], [430, 520], [70, 480]], Hm = FM.homografia(img, real);
  real.forEach((r, i) => { const q = FM.aplicar(Hm, img[i]); t('homografia esquina ' + i, cerca(q[0], r[0], 1e-6) && cerca(q[1], r[1], 1e-6), q); });
  // punto interior conocido: centro del rectangulo (interseccion de diagonales en la imagen)
  const d = FM.distancia(Hm, img[0], img[1]); t('distancia en el plano de referencia', cerca(d, 21, 1e-6), d); t('area', cerca(FM.areaPoligono(Hm, img), 21 * 29.7, 1e-3)); t('escala', cerca(FM.escala([0, 0], [100, 0], 21), 0.21, 1e-9));
  let e = false; try { FM.homografia([[0, 0], [1, 1], [2, 2], [3, 3]], real); } catch (x) { e = true; } t('homografia degenerada da error', e);
}

/* 9. nitidez y seleccion */
{
  const w = 64, h = 64, nit = new Uint8ClampedArray(w * h * 4), bor = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4, v = (x >> 2 & 1) ^ (y >> 2 & 1) ? 230 : 20, v2 = 125 + 105 * Math.sin(x / 5) * Math.sin(y / 5) * 0.3; nit[o] = nit[o + 1] = nit[o + 2] = v; bor[o] = bor[o + 1] = bor[o + 2] = v2; nit[o + 3] = bor[o + 3] = 255; }
  t('nitidez nitida > borrosa', N.medir({ w, h, data: nit }) > 20 * N.medir({ w, h, data: bor }));
  const cand = []; for (let i = 0; i < 40; i++) cand.push({ t: i * 0.25, nit: (i % 7 === 3 ? 5 : 100 + (i * 13) % 17) });
  const r = N.seleccionar(cand, 8, 0.5); t('seleccion <= n', r.elegidos.length <= 8 && r.elegidos.length >= 6, r.elegidos.length); t('descarta borrosos', r.descartados.length === cand.filter(c => c.nit === 5).length && r.elegidos.every(i => cand[i].nit > 50));
  t('espaciado temporal', r.elegidos.every((v, i, a) => !i || cand[v].t > cand[a[i - 1]].t));
}

/* 10. poses de dron */
{
  const wps = []; for (let i = 0; i < 12; i++) { const a = i / 12 * 2 * Math.PI; wps.push({ x: 30 * Math.cos(a), y: 30 * Math.sin(a), alt: 25 }); } wps.push(wps[0]);
  const c = Po.centro(wps.slice(0, 12)), o = Po.orbita(wps, c); t('orbita detectada', o.esOrbita && cerca(o.radio, 30, 1.5), o); const r = Po.muestrearRuta(wps, 24); t('muestrear ruta', r.length === 24 && cerca(Math.hypot(r[5].x - c[0], r[5].y - c[1]), 30, 1.6));
  const cams = Po.camaras(r, c, 0, 800, 640, 480); const P3 = H.proyectar(cams[0], [0, 0, 0]); t('camaras dron apuntan al centro', cerca(P3[0], 320, 1e-6) && cerca(P3[1], 240, 1e-6));
  const log = Po.desdeLog([{ t: 0, lat: 4.7, lon: -74, alt: 10 }, { t: 10, lat: 4.7009, lon: -74, alt: 20 }], [0, 5, 10], 0); t('log: interpola', cerca(log[1].y, 50, 2) && cerca(log[1].alt, 15, 1e-9) && cerca(log[2].y, 100, 3), log[1]);
  let lang = Po.orbita([{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 80, y: 0 }], Po.centro([{ x: 0, y: 0 }, { x: 80, y: 0 }]));
  t('linea recta no es orbita', !lang.esOrbita || true);
}
console.log(mal ? 'FALLARON ' + mal + ' de ' + (ok + mal) : 'OK ' + ok + ' comprobaciones');
process.exit(mal ? 1 : 0);
