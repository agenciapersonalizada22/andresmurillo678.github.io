/* Genera PNG de prueba (sin dependencias): node generar_imagenes.cjs <carpeta> */
const zlib = require('zlib'), fs = require('fs'), path = require('path');
function crc(b) { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xFFFFFFFF; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xFFFFFFFF) >>> 0; }
function chunk(t, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); }
function png(w, h, f) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; for (let x = 0; x < w; x++) { const p = f(x, y), o = y * (w * 4 + 1) + 1 + x * 4; raw[o] = p[0]; raw[o + 1] = p[1]; raw[o + 2] = p[2]; raw[o + 3] = p[3]; } }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
module.exports = { png };
if (require.main === module) {
  const dir = process.argv[2]; fs.mkdirSync(dir, { recursive: true });
  // 200x120: fondo blanco con cuadrado rojo central (80x60) y banda azul inferior
  fs.writeFileSync(path.join(dir, 'rojo_sobre_blanco.png'), png(200, 120, (x, y) => (x >= 60 && x < 140 && y >= 30 && y < 90) ? [220, 20, 20, 255] : y >= 100 ? [20, 40, 220, 255] : [255, 255, 255, 255]));
  fs.writeFileSync(path.join(dir, 'degradado.png'), png(256, 256, (x, y) => [x, y, 128, 255]));
  fs.writeFileSync(path.join(dir, 'foto_grande.png'), png(1600, 900, (x, y) => [(x * 255 / 1600) | 0, (y * 255 / 900) | 0, ((x + y) & 255), 255]));
}
