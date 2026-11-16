const assert = require('assert'), E = require('../js/etiquetas.js');
const B = (...p) => Buffer.concat(p.map((x) => (typeof x === 'string' ? Buffer.from(x, 'latin1') : Buffer.from(x))));
const be32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; }, le32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const ssz = (n) => Buffer.from([(n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127]);
const JPG = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 0xFF, 0xD9]), PNG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 9, 8, 7]);
const u16 = (s) => Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(s, 'utf16le')]);
let n = 0; const t = async (nombre, f) => { await f(); n++; console.log('ok', nombre); };
const leer = (b) => E.leer(E.deBuffer(b));
const frame3 = (id, body) => B(id, be32(body.length), [0, 0], body), frame4 = (id, body) => B(id, ssz(body.length), [0, 0], body);
const tag = (ver, frames) => { const f = Buffer.concat(frames); return B('ID3', [ver, 0, 0], ssz(f.length), f); };
// cuerpo MPEG1 L3 128kbps 44.1k: cabecera FF FB 90 00
const mpeg = Buffer.concat([Buffer.from([0xFF, 0xFB, 0x90, 0x00]), Buffer.alloc(417 * 100)]);

(async () => {
  await t('ID3v2.3 con portada, UTF-16 y genero numerico', async () => {
    const tg = tag(3, [frame3('TIT2', B([1], u16('Canción ñ'))), frame3('TPE1', B([0], 'Artista X')), frame3('TALB', B([0], 'Álbum')), frame3('TCON', B([0], '(17)')), frame3('TYER', B([0], '1999')), frame3('TRCK', B([0], '3/12')),
      frame3('APIC', B([0], 'image/jpeg\0', [3], '\0', JPG)), frame3('TXXX', B([0], 'REPLAYGAIN_TRACK_GAIN\0-6.5 dB'))]);
    const r = await leer(B(tg, mpeg));
    assert.equal(r.titulo, 'Canción ñ'); assert.equal(r.artista, 'Artista X'); assert.equal(r.album, 'Álbum'); assert.equal(r.genero, 'Rock'); assert.equal(r.anio, 1999); assert.equal(r.pista, 3);
    assert.equal(r.portada.mime, 'image/jpeg'); assert.deepEqual([...r.portada.datos], [...JPG]); assert.equal(r.rgTag, -6.5); assert.equal(r.formato, 'mp3');
    assert.ok(Math.abs(r.dur - (417 * 100 * 8 / 128000)) < 0.01, 'dur ' + r.dur);
  });
  await t('ID3v2.4 UTF-8 y syncsafe', async () => {
    const r = await leer(B(tag(4, [frame4('TIT2', B([3], Buffer.from('Título ✓'))), frame4('TPE1', B([3], 'Ana')), frame4('TDRC', B([3], '2021-05-01')), frame4('USLT', B([3], 'esp\0', Buffer.from('letra uno')))]), mpeg));
    assert.equal(r.titulo, 'Título ✓'); assert.equal(r.anio, 2021); assert.equal(r.letra, 'letra uno');
  });
  await t('ID3v2.2', async () => {
    const f22 = (id, body) => B(id, [0, 0, body.length], body);
    const f = Buffer.concat([f22('TT2', B([0], 'Viejo')), f22('TP1', B([0], 'Ayer')), f22('PIC', B([0], 'PNG', [3], '\0', PNG))]);
    const r = await leer(B('ID3', [2, 0, 0], ssz(f.length), f, mpeg));
    assert.equal(r.titulo, 'Viejo'); assert.equal(r.artista, 'Ayer'); assert.equal(r.portada.mime, 'image/png');
  });
  await t('ID3v1 solo', async () => {
    const campo = (s, n) => { const b = Buffer.alloc(n); b.write(s, 'latin1'); return b; };
    const r = await leer(B(mpeg, 'TAG', campo('Uno', 30), campo('Dos', 30), campo('Tres', 30), '2005', campo('', 28), [0, 7], [17]));
    assert.equal(r.titulo, 'Uno'); assert.equal(r.artista, 'Dos'); assert.equal(r.album, 'Tres'); assert.equal(r.anio, 2005); assert.equal(r.pista, 7); assert.equal(r.genero, 'Rock');
  });
  await t('MP4/M4A ilst con portada y pista', async () => {
    const box = (t, ...c) => { const b = B(...c); return B(be32(b.length + 8), Buffer.from(t, 'latin1'), b); };
    const dato = (tipo, p) => box('data', be32(tipo), be32(0), p);
    const it = (k, d) => box(k, d);
    const N = (x) => String.fromCharCode(0xA9) + x;
    const ilst = box('ilst', it(N('nam'), dato(1, Buffer.from('Canción M4A'))), it(N('ART'), dato(1, Buffer.from('Banda'))), it('trkn', dato(0, B([0, 0, 0, 5, 0, 12, 0, 0]))), it('covr', dato(14, PNG)), it(N('gen'), dato(1, Buffer.from('Jazz'))));
    const mvhd = box('mvhd', Buffer.from([0, 0, 0, 0]), be32(0), be32(0), be32(1000), be32(215000), Buffer.alloc(80));
    const moov = box('moov', mvhd, box('udta', box('meta', be32(0), ilst)));
    const ftyp = box('ftyp', 'M4A \0\0\0\0M4A mp42');
    const r = await leer(B(ftyp, box('mdat', Buffer.alloc(1000)), moov));
    assert.equal(r.formato, 'm4a'); assert.equal(r.titulo, 'Canción M4A'); assert.equal(r.artista, 'Banda'); assert.equal(r.pista, 5); assert.equal(r.genero, 'Jazz'); assert.equal(r.portada.mime, 'image/png'); assert.equal(Math.round(r.dur), 215);
  });
  const vc = (cm) => { const v = Buffer.from('prueba'); const items = cm.map((s) => B(le32(Buffer.byteLength(s)), Buffer.from(s, 'utf8'))); return B(le32(v.length), v, le32(cm.length), ...items); };
  await t('FLAC con Vorbis y PICTURE', async () => {
    const si = Buffer.alloc(34); // sr 44100 (0xAC44), 441000 muestras = 10 s
    const sr = 44100, ts = 441000; si[10] = (sr >> 12) & 255; si[11] = (sr >> 4) & 255; si[12] = ((sr & 15) << 4) | (1 << 1); si[13] = (0 << 4) | ((ts / 4294967296) & 15); si.writeUInt32BE(ts >>> 0, 14);
    const pic = B(be32(3), be32(9), 'image/png', be32(0), be32(0), be32(0), be32(0), be32(0), be32(PNG.length), PNG);
    const blk = (tipo, ult, d) => B([(ult ? 128 : 0) | tipo, (d.length >> 16) & 255, (d.length >> 8) & 255, d.length & 255], d);
    const r = await leer(B('fLaC', blk(0, 0, si), blk(4, 0, vc(['TITLE=Flac Título', 'ARTIST=Flaca', 'ALBUM=Lossless', 'DATE=2010-02', 'TRACKNUMBER=4/9', 'GENRE=Rock', 'REPLAYGAIN_TRACK_GAIN=-3.20 dB'])), blk(6, 1, pic), Buffer.alloc(50)));
    assert.equal(r.titulo, 'Flac Título'); assert.equal(r.anio, 2010); assert.equal(r.pista, 4); assert.equal(r.rgTag, -3.2); assert.equal(Math.round(r.dur), 10); assert.equal(r.portada.mime, 'image/png'); assert.deepEqual([...r.portada.datos], [...PNG]);
  });
  await t('Ogg Vorbis', async () => {
    const pagina = (pkt, seq, gran) => { const segs = []; let l = pkt.length; while (l >= 255) { segs.push(255); l -= 255; } segs.push(l); return B('OggS', [0, seq ? 0 : 2], Buffer.alloc(8), Buffer.alloc(4), le32(seq), Buffer.alloc(4), [segs.length], segs, pkt); };
    const ident = Buffer.alloc(30); ident[0] = 1; ident.write('vorbis', 1); ident.writeUInt32LE(44100, 12);
    const com = B([3], 'vorbis', vc(['TITLE=Ogg Song', 'ARTIST=Oggy', 'ALBUM=Libre']), [1]);
    let ult = pagina(B(Buffer.alloc(10)), 2); ult.writeUInt32LE(88200, 6); ult.writeUInt32LE(0, 10);
    const r = await leer(B(pagina(ident, 0), pagina(com, 1), ult));
    assert.equal(r.titulo, 'Ogg Song'); assert.equal(r.album, 'Libre'); assert.equal(Math.round(r.dur), 2);
  });
  await t('WAV con LIST INFO y duracion', async () => {
    const fmt = Buffer.alloc(16); fmt.writeUInt16LE(1, 0); fmt.writeUInt16LE(1, 2); fmt.writeUInt32LE(8000, 4); fmt.writeUInt32LE(16000, 8);
    const ch = (id, d) => B(id, le32(d.length), d, d.length & 1 ? [0] : []);
    const info = ch('LIST', B('INFO', ch('INAM', B('Onda\0')), ch('IART', B('Seno\0'))));
    const data = ch('data', Buffer.alloc(32000)); const body = B('WAVE', ch('fmt ', fmt), info, data);
    const r = await leer(B('RIFF', le32(body.length), body));
    assert.equal(r.titulo, 'Onda'); assert.equal(r.artista, 'Seno'); assert.equal(r.dur, 2);
  });
  await t('archivo desconocido no revienta', async () => { const r = await leer(Buffer.alloc(20)); assert.equal(r.titulo, ''); });
  console.log(n + ' pruebas de etiquetas OK');
})().catch((e) => { console.error(e); process.exit(1); });
