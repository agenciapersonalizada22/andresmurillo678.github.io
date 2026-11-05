// Pruebas en Node:  node herramientas/pizarra/pruebas/pruebas.mjs
import { Doc, docNuevo, compactarOps } from '../js/modelo.js';
import { reconocer } from '../js/reconocer.js';
import { aSVG, crearPDF, aJSON, deJSON, limitesPagina } from '../js/exportar.js';
import { toca, caja, contornoTrazo, rdp, simplificarPlano, extremos, aLocal, aMundo } from '../js/geom.js';
import { envolver, medirAprox } from '../js/texto.js';
import { plantillas } from '../js/plantillas.js';

let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLO', m); } else console.log('ok  ', m); };
let sem = 12345; const azar = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296; };
const mezclar = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (azar() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---- convergencia con 3 replicas ----
{
  const base = docNuevo('t', 'base');
  const baseOps = base.aOps();
  const R = ['A', 'B', 'C'].map(a => { const d = new Doc(a); d.aplicarVarias(baseOps); d.log = []; d.alCambiarLocal = ops => d.log.push(...ops); return d; });
  const ids = [];
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const d = R[(azar() * 3) | 0], r = azar();
    if (r < 0.35 || ids.length < 5) {
      const id = 'o' + i; ids.push(id);
      d.cambiar([{ k: 'o', id, p: { tipo: 'nota', pg: 'p0', x: (azar() * 1000) | 0, y: 0, w: 100, h: 100, z: d.reloj + 1, del: false, texto: 't' + i } }]);
    } else {
      const id = ids[(azar() * ids.length) | 0];
      const q = azar();
      d.cambiar([{ k: 'o', id, p: q < 0.5 ? { x: (azar() * 1000) | 0 } : q < 0.8 ? { texto: 'e' + i, color: '#fff' } : { del: azar() < 0.5 } }]);
    }
    if (azar() < 0.02) {   // sincronizacion parcial aleatoria
      const o = R[(azar() * 3) | 0]; if (o !== d) o.aplicarVarias(mezclar(d.log.slice(-50)));
    }
  }
  const todas = R.flatMap(d => d.log);
  const huellas = R.map(d => { const x = new Doc('x' + d.actor); x.aplicarVarias(baseOps); return x; });
  huellas.forEach(x => x.aplicarVarias(mezclar(todas)));
  const h0 = huellas[0].huella();
  ok(huellas.every(x => x.huella() === h0), `3 replicas convergen con ${todas.length} operaciones en distinto orden`);
  const x2 = new Doc('z'); x2.aplicarVarias(todas); x2.aplicarVarias(todas); x2.aplicarVarias(baseOps);
  ok(x2.huella() === h0, 'aplicar dos veces (idempotente)');
  const r2 = Doc.deOps(huellas[0].aOps(), 'q');
  ok(r2.huella() === h0, 'serializar a operaciones y reconstruir da el mismo estado');
  ok(compactarOps(todas).length <= todas.length, 'compactar operaciones');
  const c = new Doc('c'); c.aplicarVarias(compactarOps(mezclar(R[0].log).sort((a, b) => a.c - b.c || (a.a < b.a ? -1 : 1))));
  // ultimo escribe gana por propiedad
  const A = new Doc('A'), B = new Doc('B');
  const oa = A.cambiar([{ k: 'o', id: 'q', p: { tipo: 'nota', pg: 'p0', del: false, x: 1, y: 1, w: 1, h: 1, color: 'rojo' } }]);
  B.aplicarVarias(oa);
  const a1 = A.cambiar([{ k: 'o', id: 'q', p: { x: 10 } }]), b1 = B.cambiar([{ k: 'o', id: 'q', p: { color: 'azul' } }]), b2 = B.cambiar([{ k: 'o', id: 'q', p: { x: 20 } }]);
  A.aplicarVarias(b1); A.aplicarVarias(b2); B.aplicarVarias(a1);
  ok(A.huella() === B.huella() && A.ent.o.get('q').v.color === 'azul', 'cambios concurrentes de propiedades distintas se combinan');
  ok(A.ent.o.get('q').v.x === 20, 'misma propiedad: gana el reloj logico mayor (desempate por actor)');
}

// ---- deshacer / rehacer ----
{
  const d = docNuevo('u', 'u1');
  const id = 'obj1';
  d.cambiar([{ k: 'o', id, p: { tipo: 'forma', fm: 'rect', pg: 'p0', del: false, x: 0, y: 0, w: 50, h: 50, z: 1 } }]);
  d.cambiar([{ k: 'o', id, p: { x: 100 } }]);
  d.agrupar(() => { d.cambiar([{ k: 'o', id, p: { x: 200 } }]); d.cambiar([{ k: 'o', id, p: { y: 70, color: '#f00' } }]); });
  ok(d.undo.length === 3, 'agrupar produce una sola entrada de historial');
  d.deshacer(); ok(d.ent.o.get(id).v.x === 100 && d.ent.o.get(id).v.y === 0 && d.ent.o.get(id).v.color == null, 'deshacer el grupo');
  d.deshacer(); ok(d.ent.o.get(id).v.x === 0, 'deshacer mover');
  d.deshacer(); ok(!d.obj(id), 'deshacer creacion borra');
  d.rehacer(); ok(!!d.obj(id) && d.obj(id).v.w === 50, 'rehacer creacion restaura');
  d.rehacer(); d.rehacer(); ok(d.obj(id).v.x === 200 && d.obj(id).v.color === '#f00', 'rehacer todo');
  d.cambiar([{ k: 'o', id, p: { del: true } }]); d.deshacer(); ok(!!d.obj(id), 'deshacer borrado');
  d.deshacer(); ok(d.redo.length >= 1, 'pila de rehacer');
  d.cambiar([{ k: 'o', id, p: { x: 1 } }]); ok(d.redo.length === 0, 'nuevo cambio vacia rehacer');
  // historial por usuario: el deshacer de A no toca lo creado por B
  const A = docNuevo('x', 'A'), B = new Doc('B'); B.aplicarVarias(A.aOps());
  A.alCambiarLocal = o => B.aplicarVarias(o); B.alCambiarLocal = o => A.aplicarVarias(o);
  A.cambiar([{ k: 'o', id: 'a1', p: { tipo: 'nota', pg: 'p0', del: false, x: 0, y: 0, w: 9, h: 9 } }]);
  B.cambiar([{ k: 'o', id: 'b1', p: { tipo: 'nota', pg: 'p0', del: false, x: 0, y: 0, w: 9, h: 9 } }]);
  A.deshacer();
  ok(!A.obj('a1') && !!A.obj('b1') && A.huella() === B.huella(), 'deshacer por usuario y replicado');
  let n = 0; for (let i = 0; i < 3000; i++) { A.cambiar([{ k: 'o', id: 'a1', p: { x: i + 5, del: false } }]); n++; }
  let k = 0; while (A.deshacer()) k++;
  ok(k >= 3000, `deshacer ilimitado (${k} pasos)`);
}

// ---- restaurar version ----
{
  const d = docNuevo('v', 'v');
  d.cambiar([{ k: 'o', id: 'a', p: { tipo: 'nota', pg: 'p0', del: false, x: 0, y: 0, w: 9, h: 9, texto: 'uno' } }]);
  const snap = Doc.deOps(d.aOps(), 's');
  d.cambiar([{ k: 'o', id: 'a', p: { texto: 'dos' } }, { k: 'o', id: 'b', p: { tipo: 'nota', pg: 'p0', del: false, x: 0, y: 0, w: 9, h: 9 } }]);
  d.cambiar(d.diffHacia(snap));
  ok(d.obj('a').v.texto === 'uno' && !d.obj('b'), 'restaurar version mediante operaciones');
}

// ---- reconocimiento de formas ----
{
  const circ = []; for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2 * 1.03; circ.push([200 + 100 * Math.cos(a) + azar() * 3, 200 + 100 * Math.sin(a) + azar() * 3]); }
  ok(reconocer(circ)?.fm === 'elipse', 'reconoce circulo');
  const rect = []; const R = (a, b, c, d) => { for (let i = 0; i <= 10; i++) rect.push([a + ((c - a) * i) / 10 + azar() * 2, b + ((d - b) * i) / 10 + azar() * 2]); };
  R(0, 0, 200, 0); R(200, 0, 200, 120); R(200, 120, 0, 120); R(0, 120, 0, 3);
  ok(reconocer(rect)?.fm === 'rect', 'reconoce rectangulo');
  const ln = []; for (let i = 0; i < 30; i++) ln.push([i * 10, i * 2 + azar() * 2]);
  ok(reconocer(ln)?.fm === 'linea', 'reconoce linea recta');
  const hz = []; for (let i = 0; i < 30; i++) hz.push([i * 10, 100 + azar() * 2]);
  const rh = reconocer(hz); ok(rh.fm === 'linea' && rh.y1 === rh.y2, 'linea casi horizontal se endereza');
  const ar = []; for (let i = 0; i <= 20; i++) ar.push([i * 10, 0]); for (let i = 0; i <= 5; i++) ar.push([200 - i * 5, -i * 5]); for (let i = 0; i <= 5; i++) ar.push([175 + i * 5, -25 + i * 5]); for (let i = 0; i <= 5; i++) ar.push([200 - i * 5, i * 5]);
  ok(reconocer(ar)?.fm === 'flecha', 'reconoce flecha');
  const tr = []; const T = (a, b, c, d) => { for (let i = 0; i <= 10; i++) tr.push([a + ((c - a) * i) / 10, b + ((d - b) * i) / 10]); }; T(100, 0, 200, 150); T(200, 150, 0, 150); T(0, 150, 100, 0);
  ok(reconocer(tr)?.fm === 'tri', 'reconoce triangulo');
  const garabato = []; for (let i = 0; i < 60; i++) garabato.push([azar() * 200, azar() * 200]);
  ok(reconocer(garabato) === null, 'no reconoce un garabato');
}

// ---- geometria ----
{
  const d = docNuevo('g', 'g');
  d.cambiar([{ k: 'o', id: 'r', p: { tipo: 'forma', fm: 'rect', pg: 'p0', del: false, x: 100, y: 100, w: 100, h: 50, rot: Math.PI / 2, z: 1, grosor: 2 } },
    { k: 'o', id: 'r2', p: { tipo: 'forma', fm: 'rect', pg: 'p0', del: false, x: 400, y: 100, w: 100, h: 50, z: 2, grosor: 2, relleno: '#f00' } },
    { k: 'o', id: 'c', p: { tipo: 'conector', pg: 'p0', del: false, ea: 'r', eb: 'r2', z: 3, grosor: 3 } }]);
  ok(toca(d, d.ent.o.get('r'), 150, 85, 2) === false && toca(d, d.ent.o.get('r2'), 450, 125, 2), 'contacto con rectangulo (relleno) y rotado');
  const [lx, ly] = aLocal(d.ent.o.get('r').v, 150, 100); const [wx, wy] = aMundo(d.ent.o.get('r').v, lx, ly);
  ok(Math.abs(wx - 150) < 1e-6 && Math.abs(wy - 100) < 1e-6, 'transformacion local/mundo ida y vuelta');
  const [a, b] = extremos(d, d.ent.o.get('c').v);
  ok(a[0] > 100 && b[0] < 450 && b[0] > 390, 'conector sigue a los objetos');
  d.cambiar([{ k: 'o', id: 'r2', p: { x: 800 } }]);
  ok(extremos(d, d.ent.o.get('c').v)[1][0] > 790, 'el conector se mueve con el objeto');
  const pts = []; for (let i = 0; i < 5000; i++) pts.push(i, Math.sin(i / 10) * 40, 0.5);
  ok(simplificarPlano(pts).length / 3 * 14 < 11000, 'simplificar trazo largo para red');
  ok(/^M.*Z$/.test(contornoTrazo([[0, 0, 0.5], [10, 5, 0.6], [20, 0, 0.7]], 6)), 'contorno de trazo');
  const L = envolver('hola mundo cruel y extraordinariamente largo\nsegunda', 100, medirAprox(16, false));
  ok(L.length >= 4 && L.every(l => l.length * 8.64 <= 100 + 1), 'ajuste de texto');
}

// ---- exportacion ----
function xmlValido(s) {   // comprobador minimo de XML bien formado
  s = s.replace(/<\?xml[^>]*\?>/, '');
  const pila = []; const re = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>|[^<]+/g; let m, pos = 0;
  while ((m = re.exec(s))) {
    if (m.index !== pos) return false; pos = re.lastIndex;
    if (!m[2]) { if (/&(?!(amp|lt|gt|quot|apos);)/.test(m[0])) return false; continue; }
    if (m[1]) { if (pila.pop() !== m[2]) return false; } else if (!m[4]) pila.push(m[2]);
  }
  return pos === s.length && pila.length === 0;
}
{
  const d = docNuevo('Export <&> "x"', 'e');
  plantillas.forEach(pl => { pl.crear(d, 'p0', { x: 0, y: 0 }); });
  d.cambiar([{ k: 'o', id: 's1', p: { tipo: 'trazo', pg: 'p0', del: false, x: 10, y: 10, w: 100, h: 50, bw: 100, bh: 50, pts: [0, 0, 0.4, 50, 25, 0.9, 100, 50, 0.5], grosor: 6, color: 'tinta', z: 99 } },
    { k: 'o', id: 't1', p: { tipo: 'texto', pg: 'p0', del: false, x: 10, y: 300, w: 200, h: 40, texto: 'Hola <b> & "adiós"\nlínea 2', fs: 20, neg: true, z: 100 } },
    { k: 'o', id: 'i1', p: { tipo: 'imagen', pg: 'p0', del: false, x: 0, y: 0, w: 50, h: 50, img: 'a1', iw: 10, ih: 10, rec: [0, 0, .5, .5], z: 101 } }]);
  for (const f of ['blanco', 'cuadriculado', 'lineas', 'puntos', 'oscuro']) {
    d.cambiar([{ k: 'p', id: 'p0', p: { fondo: f } }]);
    const svg = aSVG(d, 'p0', { a1: 'data:image/png;base64,AAAA' });
    ok(xmlValido(svg) && svg.includes('<svg') && svg.includes('Hola &lt;b&gt;'), `SVG valido (fondo ${f}, ${svg.length} bytes)`);
  }
  const lim = limitesPagina(d, 'p0'); ok(lim.w === 1600, 'limites de pagina con marco');
  const js = aJSON(d, { a1: 'data:x' }); const im = deJSON(js);
  ok(Doc.deOps(im.ops).huella() === d.huella() && im.assets.a1, 'JSON exportar/importar conserva el tablero');
  let err = false; try { deJSON('{"x":1}'); } catch (e) { err = true; } ok(err, 'JSON invalido se rechaza');
  const jpg = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
  const pdf = crearPDF([{ w: 1600, h: 900, jpeg: jpg }, { w: 800, h: 600, jpeg: jpg }], 'Mi tablero');
  const txt = Buffer.from(pdf).toString('latin1');
  ok(txt.startsWith('%PDF-1.4') && txt.includes('/Count 2') && txt.trimEnd().endsWith('%%EOF'), 'PDF con 2 paginas');
  const sx = +/startxref\n(\d+)/.exec(txt)[1]; ok(txt.slice(sx, sx + 4) === 'xref', 'tabla xref apunta bien');
  const offs = [...txt.slice(sx).matchAll(/(\d{10}) 00000 n/g)].map(m => +m[1]);
  ok(offs.every((o, i) => txt.slice(o).startsWith(`${i + 1} 0 obj`)), 'offsets de objetos PDF correctos');
}
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
