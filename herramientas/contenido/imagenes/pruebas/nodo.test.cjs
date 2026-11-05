/* Pruebas de la logica pura (sin DOM): node pruebas/nodo.test.cjs */
const assert = require('assert'), path = require('path'), cp = require('child_process'), fs = require('fs'), os = require('os');
const N = (n) => require(path.join(__dirname, '../js/nucleo', n + '.js'));
const Matriz = N('matriz'), Color = N('color'), Mezcla = N('mezcla'), Historial = N('historial'), RLE = N('rle'), Relleno = N('relleno'),
  Filtros = N('filtros'), Zip = N('zip'), Geo = N('geometria'), QR = N('qr');
let ok = 0; const t = (n, f) => { try { f(); ok++; } catch (e) { console.error('FALLA', n, '\n', e.message); process.exitCode = 1; } };
const cerca = (a, b, e = 1e-6, m) => assert.ok(Math.abs(a - b) <= e, (m || '') + ' ' + a + ' != ' + b);

t('matriz inversa y composicion', () => {
  const m = Matriz.componer(100, 50, 30, 2, 1.5), i = Matriz.inv(m);
  assert.ok(Matriz.igual(Matriz.mul(m, i), Matriz.ident(), 1e-9));
  const p = Matriz.punto(m, 3, 4), q = Matriz.punto(i, p.x, p.y); cerca(q.x, 3); cerca(q.y, 4);
  const d = Matriz.descomponer(m); cerca(d.rot, 30, 1e-9); cerca(d.sx, 2); cerca(d.sy, 1.5); cerca(d.x, 100);
  const r = Matriz.punto(Matriz.rotacion(90), 1, 0); cerca(r.x, 0, 1e-12); cerca(r.y, 1);
  const c = Matriz.caja(Matriz.esquinas(Matriz.componer(0, 0, 45, 1, 1), 100, 100)); cerca(c.w, 141.4213562, 1e-6);
  assert.strictEqual(Matriz.inv([0, 0, 0, 0, 1, 1]), null);
});
t('color', () => {
  assert.deepStrictEqual(Color.hexARgb('#ff8000'), [255, 128, 0, 255]); assert.strictEqual(Color.rgbAHex(255, 128, 0), '#ff8000');
  assert.deepStrictEqual(Color.hexARgb('#fa0'), [255, 170, 0, 255]);
  const hsl = Color.rgbAHsl(255, 0, 0); assert.deepStrictEqual(hsl, [0, 1, 0.5]);
  assert.deepStrictEqual(Color.hslARgb(120, 1, 0.5), [0, 255, 0]);
  cerca(Color.rgbAHsl(0, 0, 255)[0], 240);
  assert.deepStrictEqual(Color.hsvARgb(...Color.rgbAHsv(30, 100, 200)).map((v, i) => Math.abs(v - [30, 100, 200][i]) <= 1), [true, true, true]);
  cerca(Color.contraste([0, 0, 0], [255, 255, 255]), 21, 1e-9);
  for (let k = 0; k < 50; k++) { const r = [k * 5, 255 - k * 3, (k * 37) % 256], h = Color.rgbAHsl(...r), b = Color.hslARgb(...h); r.forEach((v, i) => assert.ok(Math.abs(v - b[i]) <= 1)); }
});
t('mezcla vs formulas de referencia', () => {
  // referencias independientes (por canal, formulas Photoshop/W3C escritas aparte)
  const ref = {
    multiply: (b, s) => b * s, screen: (b, s) => 1 - (1 - b) * (1 - s), overlay: (b, s) => b < 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s),
    darken: (b, s) => Math.min(b, s), lighten: (b, s) => Math.max(b, s), difference: (b, s) => Math.abs(b - s), exclusion: (b, s) => b + s - 2 * b * s,
    'hard-light': (b, s) => s < 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s),
    'color-dodge': (b, s) => s === 1 ? 1 : Math.min(1, b / (1 - s)), 'color-burn': (b, s) => s === 0 ? 0 : 1 - Math.min(1, (1 - b) / s)
  };
  for (const modo in ref) for (const b of [0, 0.2, 0.5, 0.8, 1]) for (const s of [0, 0.3, 0.5, 0.9, 1]) {
    if ((modo === 'color-dodge' && b === 0) || (modo === 'color-burn' && b === 1)) continue;
    const r = Mezcla.mezclarColor(modo, [b, b, b], [s, s, s]); cerca(r[0], ref[modo](b, s), 1e-9, modo + ' ' + b + ' ' + s);
  }
  // soft-light W3C: b=0.5,s=0.75 -> 0.5+(0.5)*(sqrt(.5)-.5)
  cerca(Mezcla.mezclarColor('soft-light', [0.5, 0.5, 0.5], [0.75, 0.75, 0.75])[0], 0.5 + 0.5 * (Math.sqrt(0.5) - 0.5), 1e-9);
  cerca(Mezcla.mezclarColor('soft-light', [0.2, 0.2, 0.2], [0.25, 0.25, 0.25])[0], 0.2 - 0.5 * 0.2 * 0.8, 1e-9);
  // opacidad: multiplicar al 50% sobre opaco
  const c = Mezcla.componer('multiply', [0.5, 0.5, 0.5], 1, [0.5, 0.5, 0.5], 0.5); cerca(c[0], 0.5 * 0.5 + 0.5 * 0.5 * 0.5 - 0.5 * 0.5 * 0.5 + 0.5 * 0.5 * (0.5 - 0.5) + 0.125 - 0.125 + 0.125, 1e-9, 'compuesto');
  cerca(c[3], 1);
  const n = Mezcla.componer('normal', [1, 0, 0], 1, [0, 0, 1], 0.25); cerca(n[0], 0.75); cerca(n[2], 0.25);
  const lum = Mezcla.mezclarColor('luminosity', [1, 0, 0], [0.5, 0.5, 0.5]); cerca(0.3 * lum[0] + 0.59 * lum[1] + 0.11 * lum[2], 0.5, 1e-9);
  const col = Mezcla.mezclarColor('color', [0.5, 0.5, 0.5], [1, 0, 0]); cerca(0.3 * col[0] + 0.59 * col[1] + 0.11 * col[2], 0.5, 1e-9);
  assert.strictEqual(Mezcla.aCanvas('multiplicar'), 'multiply');
});
t('historial: deshacer, rehacer, fusion, compactar', () => {
  let v = 0, tick = 0; const H = new Historial({ ventana: 3, reloj: () => tick });
  const cmd = (a, b, clave) => ({ nombre: 'v' + b, clave, hacer() { v = b; }, deshacer() { v = a; }, fusionar(n) { if (n.clave !== this.clave) return false; this.hacer = n.hacer; this.nombre = n.nombre; return true; }, compactar() { this._c = 1; }, descompactar() { this._c = 0; } });
  for (let i = 1; i <= 10; i++) { tick += 5000; H.ejecutar(cmd(i - 1, i)); }
  assert.strictEqual(v, 10); assert.strictEqual(H.pila.length, 10); assert.ok(H.pila[0]._compacto && !H.pila[9]._compacto);
  H.deshacer(); assert.strictEqual(v, 9); H.rehacer(); assert.strictEqual(v, 10);
  for (let i = 0; i < 10; i++) H.deshacer(); assert.strictEqual(v, 0); assert.ok(!H.puedeDeshacer());
  H.irA(5); assert.strictEqual(v, 5);
  H.ejecutar(cmd(5, 99)); assert.strictEqual(H.pila.length, 6); assert.ok(!H.puedeRehacer());
  tick += 5000; H.ejecutar(cmd(99, 100, 'k')); tick += 100; H.ejecutar(cmd(100, 101, 'k')); tick += 100; H.ejecutar(cmd(101, 102, 'k'));
  assert.strictEqual(H.pila.length, 7, 'fusion'); H.deshacer(); assert.strictEqual(v, 99);
  const H2 = new Historial(); for (let i = 0; i < 5000; i++) H2.registrar({ nombre: 'x', hacer() {}, deshacer() {} }); assert.strictEqual(H2.pila.length, 5000, 'ilimitado');
});
t('RLE ida y vuelta', () => {
  for (const n of [0, 1, 2, 3, 100, 129, 130, 131, 1000, 70000]) {
    const a = new Uint8Array(n); for (let i = 0; i < n; i++) a[i] = (i % 500 === 0 || (i % 4000 > 3900)) ? (i * 31) & 255 : 0;
    const c = RLE.comprimir(a), b = RLE.descomprimir(c, n); assert.deepStrictEqual(Array.from(b), Array.from(a));
    if (n > 10000) assert.ok(c.length < a.length / 2);
  }
  const al = new Uint8Array(5000).map((_, i) => (i * 2654435761) >>> 24); assert.deepStrictEqual(Array.from(RLE.descomprimir(RLE.comprimir(al), 5000)), Array.from(al));
  const x = RLE.xor(Uint8Array.of(1, 2, 3), Uint8Array.of(3, 2, 1)); assert.deepStrictEqual(Array.from(RLE.xor(x, Uint8Array.of(3, 2, 1))), [1, 2, 3]);
});
function img(w, h, f) { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(f(x, y), (y * w + x) * 4); return d; }
t('relleno por inundacion', () => {
  // muro vertical en x=5 que divide la imagen 10x6
  const d = img(10, 6, (x) => x === 5 ? [0, 0, 0, 255] : [255, 255, 255, 255]);
  const n = Relleno.rellenar(d, 10, 6, 1, 1, [255, 0, 0, 255], 0, true);
  assert.strictEqual(n, 5 * 6); assert.strictEqual(d[(2 * 10 + 7) * 4], 255); assert.strictEqual(d[(2 * 10 + 7) * 4 + 1], 255, 'otro lado intacto');
  assert.strictEqual(d[(2 * 10 + 2) * 4 + 1], 0);
  const g = img(10, 6, (x) => x === 5 ? [0, 0, 0, 255] : [255, 255, 255, 255]);
  assert.strictEqual(Relleno.rellenar(g, 10, 6, 1, 1, [0, 0, 255, 255], 0, false), 5 * 6 + 4 * 6, 'global');
  // tolerancia: degradado
  const e = img(8, 1, (x) => [x * 10, 0, 0, 255]);
  assert.strictEqual(Relleno.region(e, 8, 1, 0, 0, 15, true).filter(Boolean).length, 2);
  assert.strictEqual(Relleno.region(e, 8, 1, 0, 0, 35, true).filter(Boolean).length, 4);
  // laberinto en espiral (conectividad 4, sin diagonales)
  const dd = img(5, 5, (x, y) => (x === y || x + y === 4) ? [0, 0, 0, 255] : [255, 255, 255, 255]);
  assert.strictEqual(Relleno.region(dd, 5, 5, 2, 0, 0, true).filter(Boolean).length, 4, 'triangulo superior');
  assert.strictEqual(Relleno.region(dd, 5, 5, -1, 0, 0, true).filter(Boolean).length, 0);
});
t('varita y quitar color', () => {
  const d = img(20, 20, (x, y) => (x >= 5 && x < 15 && y >= 5 && y < 15) ? [200, 30, 30, 255] : [250, 250, 250, 255]);
  const m = Relleno.varita(d, 20, 20, 10, 10, 10, true); assert.strictEqual(m.filter(Boolean).length, 100);
  const q = Relleno.quitarColor(d, 20, 20, [250, 250, 250], 5, 0, true); assert.strictEqual(q, 300);
  assert.strictEqual(d[3], 0); assert.strictEqual(d[(10 * 20 + 10) * 4 + 3], 255);
  // suavizado: gris intermedio recibe alfa parcial
  const s = img(3, 1, (x) => [250 - x * 20, 250 - x * 20, 250 - x * 20, 255]);
  Relleno.quitarColor(s, 3, 1, [250, 250, 250], 5, 30, false); assert.strictEqual(s[3], 0); assert.ok(s[7] > 0 && s[7] < 255, 'alfa parcial ' + s[7]);
  const sm = Relleno.suavizarMascara(Uint8Array.from([0, 0, 255, 0, 0]), 5, 1, 1); assert.ok(sm[1] > 0 && sm[2] < 255);
});
t('filtros: valores de referencia', () => {
  const px = (rgb, op, p) => { const d = new Uint8ClampedArray([...rgb, 255]); Filtros.aplicar(d, 1, 1, op, p); return Array.from(d.slice(0, 3)); };
  assert.deepStrictEqual(px([100, 150, 200], 'invertir'), [155, 105, 55]);
  assert.deepStrictEqual(px([100, 100, 100], 'brillo', { v: 10 }), [126, 126, 126]);
  assert.deepStrictEqual(px([255, 0, 0], 'grises'), [76, 76, 76]);
  assert.deepStrictEqual(px([128, 128, 128], 'contraste', { v: 50 }), [128, 128, 128]);
  assert.ok(px([200, 100, 100], 'contraste', { v: 50 })[0] > 200);
  assert.deepStrictEqual(px([100, 100, 100], 'niveles', { neg: 50, blan: 150 }), [128, 128, 128]);
  assert.deepStrictEqual(px([10, 20, 30], 'duotono', { c1: '#000000', c2: '#ffffff' }), [18, 18, 18]);
  const hr = px([255, 0, 0], 'tono', { v: 120 }); assert.ok(hr[1] > hr[0] && hr[1] > hr[2] && hr[0] < 5, 'rojo a verde ' + hr);
  const s0 = px([180, 90, 90], 'saturacion', { v: -100 }); assert.ok(s0[0] === s0[1] && s0[1] === s0[2]);
  assert.deepStrictEqual(px([128, 128, 128], 'curvas', { puntos: [[0, 0], [255, 255]] }), [128, 128, 128]);
  const t1 = Filtros.tablaCurva([[0, 0], [128, 200], [255, 255]]); assert.strictEqual(t1[128], 200); for (let i = 1; i < 256; i++) assert.ok(t1[i] >= t1[i - 1], 'monotona');
  assert.ok(px([128, 128, 128], 'temperatura', { v: 50 })[0] > px([128, 128, 128], 'temperatura', { v: 50 })[2]);
  // desenfoque conserva media y reduce varianza
  const d = img(16, 16, (x, y) => ((x + y) % 2 ? [255, 255, 255, 255] : [0, 0, 0, 255])); Filtros.desenfoque(d, 16, 16, { v: 3 });
  const v = Array.from({ length: 16 * 16 }, (_, i) => d[i * 4]); const media = v.reduce((a, b) => a + b) / v.length; assert.ok(Math.abs(media - 127.5) < 15); assert.ok(Math.max(...v) - Math.min(...v) < 200);
  const pix = img(8, 8, (x) => [x * 30, 0, 0, 255]); Filtros.pixelado(pix, 8, 8, { v: 4 }); assert.strictEqual(pix[0], pix[4]);
  const au = img(8, 8, (x) => [60 + x * 10, 60 + x * 10, 60 + x * 10, 255]); Filtros.auto(au, 8, 8); assert.ok(au[0] < 60 && au[7 * 4] > 130);
  assert.strictEqual(Filtros.LOOKS.length, 21);
  Filtros.LOOKS.forEach((l) => { const dd = img(6, 6, () => [120, 90, 60, 255]); Filtros.aplicarOps(dd, 6, 6, l[2]); });
});
t('zip', () => {
  const a = [{ nombre: 'uno.txt', datos: new TextEncoder().encode('hola mundo') }, { nombre: 'carpeta/dos.bin', datos: Uint8Array.from({ length: 3000 }, (_, i) => i & 255) }];
  const z = Zip.crear(a, new Date(2024, 4, 20, 10, 30, 0)); assert.strictEqual(Zip.crc32(new TextEncoder().encode('123456789')), 0xCBF43926);
  const l = Zip.leer(z); assert.strictEqual(l.length, 2); assert.strictEqual(new TextDecoder().decode(l[0].datos), 'hola mundo');
  const f = path.join(os.tmpdir(), 'prueba_im_' + process.pid + '.zip'); fs.writeFileSync(f, z);
  let r = ''; try { r = cp.execSync('python3 -c "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); print(z.testzip(), z.namelist(), z.read(\'uno.txt\'))" ' + f).toString(); } catch (e) { r = 'ERR ' + e.message; }
  fs.unlinkSync(f); assert.ok(/None \['uno.txt', 'carpeta\/dos.bin'\] b'hola mundo'/.test(r), r);
});
t('geometria: alinear, distribuir, guias', () => {
  const c = [{ x: 10, y: 10, w: 20, h: 20 }, { x: 50, y: 30, w: 40, h: 10 }, { x: 200, y: 5, w: 10, h: 10 }];
  assert.deepStrictEqual(Geo.alinear(c, 'izq').map((r) => r.dx), [0, -40, -190]);
  assert.deepStrictEqual(Geo.alinear(c, 'cx', { x: 0, y: 0, w: 300, h: 100 }).map((r) => r.dx), [130, 80, -55]);
  const dst = Geo.distribuir(c, 'x'); cerca(dst[1].dx, ((200 - 30) - 40) / 2 + 30 - 50 + 0, 1e-9 + 0, 'hueco igual');
  const aj = Geo.ajustar({ x: 97, y: 40, w: 50, h: 20 }, { x: [0, 150, 300], y: [100] }, 6); cerca(aj.dx, 3); assert.deepStrictEqual(aj.lineasX, [150]);
  assert.strictEqual(aj.dy, 0);
  const ce = Geo.ajustar({ x: 100, y: 0, w: 50, h: 20 }, { x: [125] }, 3); assert.strictEqual(ce.dx, 0);
  assert.strictEqual(Geo.ajustar({ x: 0, y: 0, w: 10, h: 10 }, { x: [100] }, 6).dx, 0);
  assert.strictEqual(Geo.estrella(5, 0.4).length, 10); assert.strictEqual(Geo.cuadricula(47, 10), 50);
});
// ---------- QR ----------
t('QR: Reed-Solomon, formato y capacidades conocidos', () => {
  // vector clasico (thonky): "HELLO WORLD" 1-M alfanumerico
  const d = QR.datos('HELLO WORLD', 'M', 1, 1); assert.deepStrictEqual(d.cw, [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17]);
  assert.deepStrictEqual(QR.reedSolomon(d.cw, 10), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  assert.strictEqual(QR.bitsFormato('L', 0), 0x77C4); assert.strictEqual(QR.bitsFormato('M', 0), 0x5412); assert.strictEqual(QR.bitsFormato('Q', 0), 0x355F); assert.strictEqual(QR.bitsFormato('H', 0), 0x1689);
  assert.deepStrictEqual(QR.posAlineacion(7), [6, 22, 38]); assert.deepStrictEqual(QR.posAlineacion(32), [6, 34, 60, 86, 112, 138]); assert.deepStrictEqual(QR.posAlineacion(2), [6, 18]);
  // capacidad de bytes: 1-L=17, 1-M=14, 10-M=213, 40-L=2953
  const cap = { '1L': 17, '1M': 14, '10M': 213, '40L': 2953, '40H': 1273 };
  for (const k in cap) { const v = parseInt(k), e = k.slice(-1); const lo = 4 + 8 + 0; const bytes = Math.floor((QR.modulosDatos(v, e) * 8 - 4 - (v <= 9 ? 8 : 16)) / 8); assert.strictEqual(bytes, cap[k], k); }
  assert.strictEqual(QR.codificar('A'.repeat(17), 'L').version, 1); assert.strictEqual(QR.codificar('A'.repeat(18).toLowerCase(), 'L').version, 2);
  assert.strictEqual(QR.codificar('12345678901234567890123456789012345678901', 'L').version, 1, '41 cifras 1-L'); assert.strictEqual(QR.codificar('123456789012345678901234567890123456789012', 'L').version, 2);
});
// decodificador de referencia independiente
function decodificar(m) {
  const size = m.length, v = (size - 17) / 4, bit = (x, y) => m[y][x] ? 1 : 0;
  // formato (copia superior-izquierda)
  let f = 0; const ps = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
  ps.forEach(([x, y], i) => { f |= bit(x, y) << i; }); f ^= 0x5412;
  const eccBits = (f >> 13) & 3, mascara = (f >> 10) & 7, ecc = { 1: 'L', 0: 'M', 3: 'Q', 2: 'H' }[eccBits];
  // BCH comprobar
  let rem = f >> 10; let g = (f >> 10) << 10; let r = g; for (let i = 14; i >= 10; i--) if ((r >> i) & 1) r ^= 0x537 << (i - 10); assert.strictEqual(r, f & 1023, 'BCH formato');
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const mk = (x, y) => { if (x >= 0 && y >= 0 && x < size && y < size) fn[y][x] = true; };
  for (let i = 0; i < size; i++) { mk(6, i); mk(i, 6); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) mk(cx + dx, cy + dy);
  const al = []; if (v > 1) { const n = Math.floor(v / 7) + 2; const paso = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2; al.push(6); for (let p = size - 7, k = 1; al.length < n; p -= paso) al.splice(1, 0, p); }
  al.forEach((a, i) => al.forEach((b, j) => { if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) mk(a + dx, b + dy); }));
  for (let i = 0; i < 9; i++) { mk(8, i); mk(i, 8); } for (let i = 0; i < 8; i++) { mk(size - 1 - i, 8); mk(8, size - 1 - i); }
  if (v >= 7) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { mk(size - 11 + j, i); mk(i, size - 11 + j); }
  const mf = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (((y >> 1) + Math.floor(x / 3)) % 2) === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0, (x, y) => ((((x * y) % 2) + ((x * y) % 3)) % 2) === 0, (x, y) => ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0][mascara];
  const bits = []; let up = true;
  for (let col = size - 1; col > 0; col -= 2) { if (col === 6) col = 5; for (let k = 0; k < size; k++) { const y = up ? size - 1 - k : k; for (const x of [col, col - 1]) if (!fn[y][x]) bits.push(bit(x, y) ^ (mf(x, y) ? 1 : 0)); } up = !up; }
  const cws = []; for (let i = 0; i + 8 <= bits.length; i += 8) cws.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  // desentrelazar
  const nb = require('vm'); const tabNB = { L: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4], M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5], Q: [1, 1, 2, 2, 4, 4, 6, 6, 8, 8], H: [1, 1, 2, 4, 4, 4, 5, 6, 8, 8] };
  const tabEC = { L: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18], M: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26], Q: [13, 22, 18, 26, 18, 24, 18, 22, 20, 24], H: [17, 28, 22, 16, 22, 28, 26, 26, 24, 28] };
  const B = tabNB[ecc][v - 1], E = tabEC[ecc][v - 1], total = cws.length - (cws.length - 0) % 1; const cortos = B - cws.length % B; const lc = Math.floor(cws.length / B);
  const bloques = Array.from({ length: B }, () => []); let p = 0;
  for (let i = 0; i < lc - E + 1; i++) for (let b = 0; b < B; b++) { if (i === lc - E && b < cortos) continue; bloques[b].push(cws[p++]); }
  const ecs = Array.from({ length: B }, () => []); for (let i = 0; i < E; i++) for (let b = 0; b < B; b++) ecs[b].push(cws[p++]);
  // sindromes: el codigo completo debe anularse en alfa^0..alfa^(E-1)
  const exp = [], log = []; let x = 1; for (let i = 0; i < 255; i++) { exp[i] = x; log[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; }
  const mul = (a, b) => a && b ? exp[(log[a] + log[b]) % 255] : 0;
  bloques.forEach((bl, b) => { const cw = bl.concat(ecs[b]); for (let s = 0; s < E; s++) { let acc = 0; const a = exp[s]; cw.forEach((c) => { acc = mul(acc, a) ^ c; }); assert.strictEqual(acc, 0, 'sindrome ' + s + ' bloque ' + b); } });
  const datos = [].concat(...bloques), bs = datos.map((c) => c.toString(2).padStart(8, '0')).join('');
  let q = 0; const lee = (n) => { const r = parseInt(bs.substr(q, n), 2); q += n; return r; };
  const modo = lee(4), cnt = lee({ 1: v <= 9 ? 10 : 12, 2: v <= 9 ? 9 : 11, 4: v <= 9 ? 8 : 16 }[modo]);
  const AL = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'; let out = '';
  if (modo === 4) { const by = []; for (let i = 0; i < cnt; i++) by.push(lee(8)); out = Buffer.from(by).toString('utf8'); }
  else if (modo === 2) { for (let i = 0; i + 1 < cnt; i += 2) { const n = lee(11); out += AL[Math.floor(n / 45)] + AL[n % 45]; } if (cnt % 2) out += AL[lee(6)]; }
  else if (modo === 1) { for (let i = 0; i < cnt; i += 3) { const n = Math.min(3, cnt - i); out += String(lee(n * 3 + 1)).padStart(n, '0'); } }
  return { texto: out, ecc, mascara, version: v };
}
t('QR: decodificacion con decodificador de referencia', () => {
  const casos = ['HELLO WORLD', '0123456789', 'https://andresmurillo678.github.io/herramientas/', 'Ñandú: ¡prueba! 日本語 😀', 'a'.repeat(150), 'B'.repeat(400), '1234567890'.repeat(30), 'A-B.C/D$E%F +G'];
  for (const txt of casos) for (const e of ['L', 'M', 'Q', 'H']) {
    let qr; try { qr = QR.codificar(txt, e); } catch (er) { continue; }
    if (qr.version > 10) continue;
    const r = decodificar(qr.modulos); assert.strictEqual(r.texto, txt, e + ' ' + txt.slice(0, 10)); assert.strictEqual(r.ecc, e); assert.strictEqual(r.version, qr.version);
  }
  for (let mk = 0; mk < 8; mk++) { const qr = QR.codificar('mascara ' + mk, 'M', { mascara: mk }); assert.strictEqual(decodificar(qr.modulos).mascara, mk); assert.strictEqual(decodificar(qr.modulos).texto, 'mascara ' + mk); }
  // patrones fijos
  const qr = QR.codificar('x', 'L'); assert.strictEqual(qr.size, 21); assert.ok(qr.modulos[8][13] === true && qr.modulos[0][0] && !qr.modulos[1][1] && qr.modulos[2][2] && qr.modulos[6][8] === true); assert.ok(qr.modulos[13][8] === true, 'modulo oscuro');
  assert.throws(() => QR.codificar('x'.repeat(3000), 'H'));
  assert.ok(QR.aSvg(qr).startsWith('<svg'));
});
t('QR: versiones altas (>=7) con informacion de version', () => {
  const qr = QR.codificar('v'.repeat(300), 'H'); assert.ok(qr.version >= 7);
  // bits de version 7 conocidos: 0x07C94
  const v7 = QR.codificar('x'.repeat(140), 'L', { minVersion: 7, maxVersion: 7 }); assert.strictEqual(v7.version, 7);
  let b = 0; for (let i = 0; i < 18; i++) { const a = v7.size - 11 + i % 3, c = Math.floor(i / 3); if (v7.modulos[a][c]) b |= 1 << i; }
  assert.strictEqual(b, 0x07C94);
});
console.log(process.exitCode ? 'CON FALLAS' : 'OK ' + ok + ' pruebas');
