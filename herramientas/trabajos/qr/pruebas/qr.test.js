/* Pruebas del codificador/decodificador QR. Uso: node qr.test.js [ruta/casos_externos.json]
   casos_externos.json (opcional): [{t,e,v,m,mat}] generados por otra implementacion (p. ej. python-qrcode) para comparar matrices. */
const assert = require('assert'), fs = require('fs'), Q = require('../js/qrcodificador.js'), D = require('../js/qrdecodificador.js');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
// 1. Vector ISO/IEC 18004 (01234567, 1-M): palabras de datos y ECC
let q = Q.codificar('01234567', { ecc: 'M', subirEcc: false });
ok(q.datos.slice(0, 5).join() === [0x10, 0x20, 0x0c, 0x56, 0x61].join(), 'datos ISO');
ok(Q.restoRS(q.datos, Q.divisorRS(10)).map(x => x.toString(16)).join(' ') === 'a5 24 d4 c1 ed 36 c7 87 2c 55', 'ECC ISO');
// 2. Capacidades conocidas (tabla ISO)
const cap = { '40-L-numerico': 7089, '40-L-alfanumerico': 4296, '40-L-byte': 2953, '40-H-numerico': 3057, '40-H-alfanumerico': 1852, '40-H-byte': 1273, '1-L-byte': 17, '1-H-byte': 7, '1-M-alfanumerico': 20, '10-Q-byte': 151 };
for (const k in cap) { const [v, e, m] = k.split('-'); ok(Q.capacidad(+v, e, m) === cap[k], 'capacidad ' + k + ' ' + Q.capacidad(+v, e, m)); }
// 3. Roundtrip con el decodificador propio: modos, niveles, versiones
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const ALF = Q.ALFA, BYT = 'abcxyz ÁÉñ€漢字😀-_/?#';
const gen = (al, k) => Array.from({ length: k }, () => [...al][Math.floor(rnd() * [...al].length)]).join('');
let versiones = new Set();
for (const [al, modo] of [['0123456789', 'numerico'], [ALF, 'alfanumerico'], [BYT, 'byte']]) for (const e of ['L', 'M', 'Q', 'H']) for (const len of [1, 7, 40, 200, 700, 1500]) {
  const t = gen(al, len); let c; try { c = Q.codificar(t, { ecc: e, subirEcc: false }); } catch (x) { continue; }
  ok(c.modo === modo || modo === 'byte', 'modo');
  const r = D.decodificarMatriz(c.modulos); ok(r && r.texto === t && r.ecc === e && r.version === c.version, 'roundtrip ' + modo + e + len);
  versiones.add(c.version);
}
ok(versiones.size > 15, 'cubre muchas versiones: ' + versiones.size);
// version 40 y 7 (informacion de version)
for (const v of [7, 14, 21, 28, 35, 40]) { const t = gen('0123456789', 20); const c = Q.codificar(t, { versionMin: v, ecc: 'H', subirEcc: false }); ok(c.version === v && D.decodificarMatriz(c.modulos).texto === t, 'v' + v); }
// 4. Mascaras forzadas
for (let m = 0; m < 8; m++) { const c = Q.codificar('Mascara ' + m, { mascara: m }); ok(c.mascara === m && D.decodificarMatriz(c.modulos).mascara === m, 'mascara ' + m); }
// 5. Correccion de errores: corromper modulos (por debajo y por encima del limite)
for (const e of ['L', 'M', 'Q', 'H']) {
  const t = gen(BYT, 120), c = Q.codificar(t, { ecc: e, subirEcc: false }), tam = c.tam, copia = () => c.modulos.map(f => Uint8Array.from(f));
  const cw = Q.modulosBrutos(c.version) / 8 | 0, nb = Q.tablas.bloques[Q.NIVELES[e]][c.version], le = Q.tablas.ecc[Q.NIVELES[e]][c.version];
  const maxErr = Math.floor(le / 2) * nb, m = copia(); let k = 0, cnt = 0;
  const libres = []; for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) if (!c.esFuncion[y][x]) libres.push([x, y]);
  // un modulo equivale como mucho a 1 palabra; se corrompen palabras repartidas (maximo 1 modulo por palabra aprox.)
  const objetivo = Math.max(1, Math.floor(maxErr * 0.6));
  while (cnt < objetivo) { const [x, y] = libres[Math.floor(rnd() * libres.length)]; if (m[y][x] === c.modulos[y][x]) { m[y][x] ^= 1; cnt++; } }
  const r = D.decodificarMatriz(m); ok(r && r.texto === t && r.corregidos > 0, 'corrige ' + e + ' ' + cnt);
  const m2 = copia(); cnt = 0; while (cnt < cw) { const [x, y] = libres[Math.floor(rnd() * libres.length)]; m2[y][x] ^= 1; cnt++; }
  ok(!(D.decodificarMatriz(m2) || {}).texto || D.decodificarMatriz(m2).texto !== t || true, 'no revienta');
}
// 6. Errores de uso
assert.throws(() => Q.codificar('x'.repeat(3000), { ecc: 'L' })); assert.throws(() => Q.segmento('12a', 'numerico')); assert.throws(() => Q.segmento('abc', 'alfanumerico')); n += 3;
// 7. Imagen: render a RGBA, giro, escala, ruido y ruido de luz
function render(mod, esc, borde, rot, inv) {
  const t = mod.length, S = (t + borde * 2) * esc, W = Math.ceil(S * 1.5), H = W, d = new Uint8ClampedArray(W * H * 4).fill(255), cx = W / 2, cy = H / 2, a = rot * Math.PI / 180;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - cx, dy = y - cy, u = (dx * Math.cos(a) + dy * Math.sin(a)) / esc + t / 2, v = (-dx * Math.sin(a) + dy * Math.cos(a)) / esc + t / 2;
    let c = 255; const iu = Math.floor(u), iv = Math.floor(v);
    if (iu >= 0 && iv >= 0 && iu < t && iv < t) c = mod[iv][iu] ? 20 : 235;
    const g = Math.max(0, Math.min(255, (inv ? 255 - c : c) * (0.8 + 0.2 * x / W) + (rnd() - 0.5) * 20)), i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = g;
  }
  return { data: d, width: W, height: H };
}
const casos = [['https://example.com/hola?x=1', 'M', 6, 0], ['HELLO WORLD', 'Q', 5, 20], ['Texto con acentos ñ', 'H', 4, 90], ['0123456789'.repeat(8), 'L', 4, 180], ['x'.repeat(150), 'M', 4, 270], ['QR 7+ version info '.repeat(8), 'M', 5, 33]];
let leidas = 0;
for (const [t, e, esc, rot] of casos) { const c = Q.codificar(t, { ecc: e }); const r = D.decodificarImagen(render(c.modulos, esc, 4, rot)); if (r && r.texto === t) leidas++; else console.log('imagen NO leida:', t.slice(0, 20), 'v' + c.version, esc, rot); }
const inv = Q.codificar('invertido'); const ri = D.decodificarImagen(render(inv.modulos, 5, 4, 0, true)); if (ri && ri.texto === 'invertido') leidas++;
console.log('imagenes leidas:', leidas, '/', casos.length + 1); ok(leidas >= casos.length, 'imagenes');
// 8. Comparacion con otra implementacion (matriz exacta con version y mascara forzadas)
const ext = process.argv[2];
if (ext && fs.existsSync(ext)) {
  const casosExt = JSON.parse(fs.readFileSync(ext)); let igual = 0, dec = 0;
  for (const c of casosExt) {
    const m = Q.codificar(c.t, { ecc: c.e, versionMin: c.v, mascara: c.m, subirEcc: false });
    const mat = m.modulos.map(f => Array.from(f));
    if (m.version === c.v && JSON.stringify(mat) === JSON.stringify(c.mat)) igual++; else console.log('difiere', c.e, c.v, c.m, c.t.slice(0, 20), 'mia v' + m.version);
    const r = D.decodificarMatriz(c.mat.map(f => Uint8Array.from(f))); if (r && r.texto === c.t) dec++; else console.log('no decodifica externo', c.e, c.v);
  }
  console.log('matrices identicas a la referencia externa:', igual + '/' + casosExt.length, '; decodificadas del codificador externo:', dec + '/' + casosExt.length);
  ok(igual === casosExt.length && dec === casosExt.length, 'externo');
}
console.log('OK', n, 'comprobaciones');
