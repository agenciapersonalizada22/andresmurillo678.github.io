/* contents.json de WhatsApp, ZIP .wastickers valido y validadores de packs. Uso: node formatos.test.js */
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const F = require('../js/formatos.js'), Tr = require('../../trabajos/comun/util.js');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const pack = { id: 'mi-pack', nombre: 'Gatitos ñoños', autor: 'Ana', stickers: [{ emojis: ['😺'] }, { emojis: ['😻', '❤'] }, { emojis: [] }] };
const cj = F.contentsWA(pack, ['sticker_01.webp', 'sticker_02.webp', 'sticker_03.webp'], 'tray.png', false);
const p = cj.sticker_packs[0];
ok(p.identifier === 'mi-pack' && p.name === 'Gatitos ñoños' && p.publisher === 'Ana' && p.tray_image_file === 'tray.png', 'campos obligatorios');
ok(p.stickers.length === 3 && p.stickers[0].image_file === 'sticker_01.webp' && p.stickers[1].emojis.length === 2 && p.stickers[2].emojis.length === 1, 'stickers y emojis (por defecto 1)');
ok(typeof p.image_data_version === 'string' && p.avoid_cache === false && p.animated_sticker_pack === false && 'android_play_store_link' in cj, 'campos de la especificacion');
ok(F.identificador('Gatos & perros!') === 'Gatos___perros' || /^[\w\-., ']+$/.test(F.identificador('Gatos & perros!')), 'identificador seguro: ' + F.identificador('Gatos & perros!'));
// ZIP valido: unzip -t, python zipfile y CRC
(async () => {
  const files = { 'tray.png': new Uint8Array([137, 80, 78, 71, 1, 2, 3]), 'sticker_01.webp': new Uint8Array(500).fill(7), 'sticker_02.webp': new Uint8Array(0), 'sticker_03.webp': Uint8Array.from({ length: 70000 }, (_, i) => i * 31 & 255) };
  const blob = F.zip(cj, files), buf = Buffer.from(await blob.arrayBuffer()); const d = fs.mkdtempSync(path.join(os.tmpdir(), 'stkz-')), f = path.join(d, 'p.wastickers'); fs.writeFileSync(f, buf);
  const t = execFileSync('unzip', ['-t', f]).toString(); ok(/No errors detected/.test(t), 'unzip -t sin errores');
  const out = JSON.parse(execFileSync('python3', ['-I', '-c', 'import zipfile,sys,json;z=zipfile.ZipFile(sys.argv[1]);print(json.dumps({"names":z.namelist(),"bad":z.testzip(),"c":json.loads(z.read("contents.json").decode("utf8"))}))', f]).toString());
  ok(out.bad === null && out.names[0] === 'contents.json' && out.names.length === 5 && out.c.sticker_packs[0].name === 'Gatitos ñoños', 'python zipfile: nombres, CRC y contents.json UTF-8');
  // validadores WhatsApp
  const ok512 = (b, extra) => Object.assign({ w: 512, h: 512, bytes: b, animado: false, formato: 'webp' }, extra);
  const mk = (k, em) => ({ nombre: 'X', autor: 'Y', stickers: Array.from({ length: k }, () => ({ emojis: em || ['😀'] })) });
  const tray = { w: 96, h: 96, bytes: 9000 };
  let v = F.resumenValidacion(F.validar('wa', mk(3), [ok512(90000), ok512(100 * 1024), ok512(500)], tray)); ok(v.cumple, 'pack valido (limite exacto 100 KB)');
  v = F.resumenValidacion(F.validar('wa', mk(2), [ok512(1), ok512(1)], tray)); ok(!v.cumple, 'minimo 3');
  v = F.resumenValidacion(F.validar('wa', mk(31), Array(31).fill(ok512(1)), tray)); ok(!v.cumple, 'maximo 30');
  v = F.validar('wa', mk(3), [ok512(100 * 1024 + 1), ok512(1), ok512(1)], tray); ok(v.some((x) => x.nivel === 'error' && /supera/.test(x.texto)), 'sticker de 100 KB + 1 byte falla');
  v = F.validar('wa', mk(3), [ok512(1, { w: 500 }), ok512(1), ok512(1)], tray); ok(v.some((x) => /512x512/.test(x.texto)), 'tamano');
  v = F.resumenValidacion(F.validar('wa', mk(3), [ok512(400 * 1024, { animado: true, ms: 3000, frameMs: 40 }), ok512(1, { animado: true, ms: 1000, frameMs: 40 }), ok512(1, { animado: true, ms: 1000, frameMs: 40 })], tray)); ok(v.cumple, 'animado hasta 500 KB');
  v = F.resumenValidacion(F.validar('wa', mk(3), [ok512(1, { animado: true, ms: 1000, frameMs: 40 }), ok512(1), ok512(1)], tray)); ok(!v.cumple, 'no mezclar animado y estatico');
  v = F.resumenValidacion(F.validar('wa', mk(3, []), [ok512(1), ok512(1), ok512(1)], tray)); ok(!v.cumple, 'emoji obligatorio');
  v = F.resumenValidacion(F.validar('wa', mk(3, ['😀', '😁', '😂', '🤣']), [ok512(1), ok512(1), ok512(1)], tray)); ok(!v.cumple, 'maximo 3 emojis');
  v = F.resumenValidacion(F.validar('wa', mk(3), [ok512(1), ok512(1), ok512(1)], { w: 96, h: 96, bytes: 51 * 1024 })); ok(!v.cumple, 'bandeja > 50 KB');
  v = F.resumenValidacion(F.validar('wa', mk(3), [ok512(1), ok512(1), ok512(1)], null)); ok(!v.cumple, 'falta bandeja');
  // Telegram, Signal, iMessage
  v = F.resumenValidacion(F.validar('tg', mk(2), [{ w: 512, h: 400, bytes: 500 * 1024, formato: 'png' }, { w: 512, h: 512, bytes: 100, formato: 'webp' }])); ok(v.cumple, 'telegram: un lado 512, <= 512 KB');
  v = F.resumenValidacion(F.validar('tg', mk(1), [{ w: 480, h: 480, bytes: 100, formato: 'png' }])); ok(!v.cumple, 'telegram: ningun lado de 512');
  v = F.resumenValidacion(F.validar('tg', mk(1), [{ w: 512, h: 512, bytes: 300 * 1024, formato: 'webm', ms: 3000 }])); ok(!v.cumple, 'telegram webm > 256 KB');
  v = F.resumenValidacion(F.validar('tg', mk(1), [{ w: 512, h: 512, bytes: 200 * 1024, formato: 'webm', ms: 3000 }])); ok(v.cumple, 'telegram webm 3 s 200 KB');
  v = F.resumenValidacion(F.validar('signal', mk(1), [{ w: 512, h: 512, bytes: 300 * 1024, formato: 'png' }])); ok(v.cumple, 'signal 300 KB'); v = F.resumenValidacion(F.validar('signal', mk(1), [{ w: 512, h: 512, bytes: 300 * 1024 + 1, formato: 'png' }])); ok(!v.cumple, 'signal > 300 KB');
  v = F.validar('imessage', mk(1), [{ w: 618, h: 618, bytes: 1000, formato: 'png' }]); ok(F.resumenValidacion(v).cumple && !v.some((x) => x.nivel === 'aviso'), 'imessage 618');
  const cb = F.cajaConMargen(1000, 500, 512, 16); ok(cb.w === 480 && cb.h === 240, 'caja Telegram con margen 16');
  console.log('formatos.test.js OK (' + n + ' comprobaciones)');
})();
