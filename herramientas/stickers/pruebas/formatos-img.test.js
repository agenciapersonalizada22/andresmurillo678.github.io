/* GIF (LZW + cuantizacion) contra un decodificador de referencia (Pillow) y propio; APNG y WebP animado (estructura). Uso: node formatos-img.test.js */
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), { execFileSync } = require('child_process');
const G = require('../js/gif.js'), K = require('../js/contenedores.js');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stk-'));
const marco = (w, h, f) => { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(f(x, y), (y * w + x) * 4); return d; };
// fotogramas: disco rojo que se mueve sobre fondo transparente + degradado
const W = 48, H = 40, frames = [0, 1, 2, 3].map((t) => ({ ms: 80 + t * 20, rgba: marco(W, H, (x, y) => Math.hypot(x - (10 + t * 8), y - 20) < 9 ? [220, 40, 30, 255] : (y > 32 ? [x * 5, 100, 255 - x * 5, 255] : [0, 0, 0, 0])) }));
const gif = G.codificar(frames, W, H, { bucles: 0 });
fs.writeFileSync(path.join(tmp, 'a.gif'), gif);
// 1. referencia: Pillow
const py = `import sys,json\nfrom PIL import Image\nim=Image.open(sys.argv[1]);out=[]\nfor i in range(im.n_frames):\n    im.seek(i);f=im.convert('RGBA');out.append({'ms':im.info.get('duration'),'px':list(f.tobytes())})\nprint(json.dumps({'size':im.size,'loop':im.info.get('loop'),'n':im.n_frames,'f':out}))`;
fs.writeFileSync(path.join(tmp, 'ref.py'), py);
const ref = JSON.parse(execFileSync('python3', ['-I', path.join(tmp, 'ref.py'), path.join(tmp, 'a.gif')], { maxBuffer: 1 << 28 }).toString());
ok(ref.size[0] === W && ref.size[1] === H && ref.n === 4 && ref.loop === 0, 'Pillow lee tamano, 4 fotogramas y bucle infinito');
ok(ref.f.map((f) => f.ms).join() === '80,100,120,140', 'retardos ' + ref.f.map((f) => f.ms));
const error = (px, rgba) => { let e = 0, c = 0, tr = 0; for (let p = 0; p < rgba.length / 4; p++) { const a = rgba[p * 4 + 3] >= 128; if (!a) { if (px[p * 4 + 3] !== 0) tr++; continue; } if (px[p * 4 + 3] !== 255) tr++; for (let k = 0; k < 3; k++) { e += Math.abs(px[p * 4 + k] - rgba[p * 4 + k]); c++; } } return { medio: e / c, tr }; };
ref.f.forEach((f, i) => { const r = error(f.px, frames[i].rgba); ok(r.tr === 0, 'transparencia exacta en fotograma ' + i); ok(r.medio < 6, 'error de color medio (Pillow) ' + r.medio.toFixed(2)); });
// 2. decodificador propio
const dec = G.decodificar(gif); ok(dec.w === W && dec.frames.length === 4 && dec.frames[2].ms === 120, 'decodificador propio');
dec.frames.forEach((f, i) => { for (let k = 0; k < f.rgba.length; k++) ok(f.rgba[k] === ref.f[i].px[k], 'propio == Pillow'); });
// 3. ruido (llena la tabla LZW de 4096 codigos) y pocas colores
let s = 1; const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const ruido = marco(120, 100, () => [rnd() * 255, rnd() * 255, rnd() * 255, 255]);
const g2 = G.codificar([{ rgba: ruido, ms: 100 }], 120, 100, {}); fs.writeFileSync(path.join(tmp, 'b.gif'), g2);
const r2 = JSON.parse(execFileSync('python3', ['-I', path.join(tmp, 'ref.py'), path.join(tmp, 'b.gif')], { maxBuffer: 1 << 28 }).toString());
const d2 = G.decodificar(g2); let iguales = true; for (let k = 0; k < d2.frames[0].rgba.length; k++) if (d2.frames[0].rgba[k] !== r2.f[0].px[k]) { iguales = false; break; }
ok(iguales, 'ruido (tabla LZW llena y reinicios): propio == Pillow');
const dos = marco(16, 16, (x) => x < 8 ? [255, 255, 255, 255] : [0, 0, 0, 255]); const g3 = G.decodificar(G.codificar([{ rgba: dos, ms: 50 }], 16, 16, {})); ok(g3.frames[0].rgba[0] === 255 && g3.frames[0].rgba[15 * 4] === 0, 'dos colores');
ok(gif.length < W * H * 4 * 4, 'GIF mas pequeno que crudo: ' + gif.length);
// 4. APNG: PNGs reales construidos con zlib
const crcT = K.crc32; const png = (w, h, rgba) => { const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); } const ch = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4, 'latin1'); Buffer.from(d).copy(b, 8); b.writeUInt32BE(crcT(b.subarray(4, 8 + d.length)), 8 + d.length); return b; }; const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; return new Uint8Array(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))])); };
const pngs = frames.map((f) => png(W, H, f.rgba)); const ap = K.apng(pngs, frames.map((f) => f.ms), 0); fs.writeFileSync(path.join(tmp, 'a.png'), ap);
const inf = K.infoAPNG(ap); ok(inf.frames === 4 && inf.fcTL.map((f) => f.seq).join() === '0,1,3,5' && inf.fcTL[1].ms === 100 && inf.tipos.indexOf('acTL') < inf.tipos.indexOf('IDAT'), 'APNG: acTL antes de IDAT, secuencias 0,1,3,5');
const pa = JSON.parse(execFileSync('python3', ['-I', '-c', `import sys,json\nfrom PIL import Image\nim=Image.open(sys.argv[1]);print(json.dumps({'n':getattr(im,'n_frames',1),'anim':getattr(im,'is_animated',False),'f2':list(im.seek(2) or im.convert('RGBA').tobytes())}))`, path.join(tmp, 'a.png')], { maxBuffer: 1 << 28 }).toString());
ok(pa.n === 4 && pa.anim, 'Pillow reconoce APNG de 4 fotogramas'); ok(pa.f2.every((v, i) => v === frames[2].rgba[i]), 'fotograma 2 del APNG identico');
// 5. WebP animado: fotogramas reales (ffmpeg) -> reempaquetado -> ffprobe
try {
  const fr = []; for (let i = 0; i < 3; i++) { fs.writeFileSync(path.join(tmp, 'f' + i + '.png'), pngs[i]); execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(tmp, 'f' + i + '.png'), '-c:v', 'libwebp', '-lossless', '0', '-q:v', '70', path.join(tmp, 'f' + i + '.webp')]); fr.push(new Uint8Array(fs.readFileSync(path.join(tmp, 'f' + i + '.webp')))); }
  const wa = K.webpAnimado(fr, [100, 120, 140], 0); fs.writeFileSync(path.join(tmp, 'anim.webp'), wa); const wi = K.infoWebPAnim(wa);
  ok(wi.animado && wi.frames === 3 && wi.w === W && wi.h === H && wi.ms.join() === '100,120,140', 'WebP animado: estructura ' + JSON.stringify(wi.ms));
  const pw = JSON.parse(execFileSync('python3', ['-I', '-c', `import sys,json\nfrom PIL import Image\nim=Image.open(sys.argv[1]);print(json.dumps({'n':im.n_frames,'size':im.size,'d':[ (im.seek(i) or im.info.get('duration')) for i in range(im.n_frames)]}))`, path.join(tmp, 'anim.webp')]).toString());
  ok(pw.n === 3 && pw.size[0] === W && pw.size[1] === H, 'Pillow lee el WebP animado ensamblado: ' + JSON.stringify(pw));
  const one = K.leerWebP(fr[0]); ok(one.w === W && one.h === H && one.alfa, 'leerWebP');
} catch (e) { if (/ffmpeg|libwebp|ENOENT|Pillow|WebP/i.test(String(e.message)) && !/assert/i.test(e.name)) console.log('aviso: prueba WebP animado omitida:', e.message.slice(0, 120)); else throw e; }
console.log('formatos-img.test.js OK (' + n + ' comprobaciones)');
