/* Formatos de exportacion y validadores de packs (sin DOM). Limites de WhatsApp segun su especificacion publica de stickers para apps de terceros
   (1 KB = 1024 bytes), Telegram (@Stickers), Signal y Apple (iMessage). UMD: window.StFormatos. */
(function (g, f) { const m = f(g.Tr || (typeof require === 'function' ? require('../../trabajos/comun/util.js') : null)); if (typeof module === 'object' && module.exports) module.exports = m; else g.StFormatos = m; })(typeof self !== 'undefined' ? self : this, function (Tr) {
  'use strict';
  const F = {}, KB = 1024;
  F.LIM = {
    wa: { lado: 512, est: 100 * KB, anim: 500 * KB, tray: 96, trayMax: 50 * KB, min: 3, max: 30, animSeg: 10, frameMin: 8, emojis: 3, texto: 128 },
    tg: { lado: 512, margen: 16, max: 512 * KB, webm: 256 * KB, webmSeg: 3, maxStickers: 120, emojis: 20 },
    signal: { lado: 512, max: 300 * KB, maxStickers: 200 },
    imessage: { lados: [618, 408, 300], max: 500 * KB }
  };
  F.PLATAFORMAS = { wa: 'WhatsApp', tg: 'Telegram', signal: 'Signal', imessage: 'iMessage', suelto: 'PNG / SVG sueltos' };
  F.kb = (b) => (b / KB).toFixed(1) + ' KB';

  /* Caja con margen: tamano (w,h) de origen -> escala para caber en lado - 2*margen. */
  F.cajaConMargen = function (w, h, lado, margen) { const max = lado - 2 * margen, k = Math.min(max / w, max / h); return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)), x: 0, y: 0, k }; };
  F.identificador = (s) => (String(s || 'pack').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_.,'\- ]+/g, '_').replace(/\s+/g, '_').replace(/^_+|_+$/g, '').slice(0, 100) || 'pack');
  F.nombreArchivo = (i, ext) => 'sticker_' + String(i + 1).padStart(2, '0') + '.' + ext;

  /* contents.json (formato de la app de ejemplo de WhatsApp Stickers). stickers: [{emojis, archivo}] */
  F.contentsWA = function (pack, archivos, trayArchivo, animado) {
    return {
      android_play_store_link: '', ios_app_store_link: '',
      sticker_packs: [{
        identifier: F.identificador(pack.id || pack.nombre), name: String(pack.nombre || '').slice(0, F.LIM.wa.texto), publisher: String(pack.autor || '').slice(0, F.LIM.wa.texto),
        tray_image_file: trayArchivo, publisher_email: '', publisher_website: '', privacy_policy_website: '', license_agreement_website: '', image_data_version: '1', avoid_cache: false,
        animated_sticker_pack: !!animado, stickers: archivos.map((a, i) => ({ image_file: a, emojis: (pack.stickers[i].emojis && pack.stickers[i].emojis.length ? pack.stickers[i].emojis : ['😀']).slice(0, F.LIM.wa.emojis) }))
      }]
    };
  };
  /* ZIP .wastickers: contents.json + tray + stickers. files {nombre: Uint8Array}. */
  F.zip = function (contents, files) {
    const lista = [{ nombre: 'contents.json', datos: Tr.bytes(JSON.stringify(contents, null, 2)) }];
    Object.keys(files).forEach((n) => lista.push({ nombre: n, datos: files[n] }));
    return Tr.zip(lista);
  };
  F.zipPlano = (files) => Tr.zip(Object.keys(files).map((n) => ({ nombre: n, datos: files[n] })));

  /* Validadores. pack {nombre, autor, stickers:[{emojis}]}, infos [{w,h,bytes,animado,ms (duracion total), frameMs (minimo), formato}], tray {w,h,bytes,formato}.
     Devuelve [{nivel:'ok'|'aviso'|'error', texto}]. */
  F.validar = function (plat, pack, infos, tray) {
    const r = [], add = (nivel, texto) => r.push({ nivel, texto }), n = pack.stickers.length, L = F.LIM[plat];
    const emo = (i) => (pack.stickers[i].emojis || []).length;
    if (plat === 'wa') {
      n < L.min ? add('error', 'WhatsApp exige al menos ' + L.min + ' stickers (hay ' + n + ').') : n > L.max ? add('error', 'WhatsApp admite como maximo ' + L.max + ' stickers por pack (hay ' + n + ').') : add('ok', n + ' stickers (3-30).');
      if (!pack.nombre || !pack.nombre.trim()) add('error', 'El pack necesita nombre.'); else if (pack.nombre.length > L.texto) add('error', 'Nombre de pack demasiado largo (max 128).');
      if (!pack.autor || !pack.autor.trim()) add('error', 'El pack necesita autor/editor.');
      const an = infos.filter((x) => x && x.animado).length; if (an && an !== infos.length) add('error', 'No se pueden mezclar stickers animados y estaticos en un pack de WhatsApp.');
      infos.forEach((x, i) => {
        if (!x) { add('error', 'Sticker ' + (i + 1) + ': sin imagen.'); return; }
        const p = 'Sticker ' + (i + 1) + ': ';
        if (x.w !== L.lado || x.h !== L.lado) add('error', p + 'debe medir 512x512 (mide ' + x.w + 'x' + x.h + ').');
        if (x.formato !== 'webp') add('error', p + 'debe ser WebP (este navegador genero ' + x.formato + ').');
        const lim = x.animado ? L.anim : L.est; x.bytes > lim ? add('error', p + F.kb(x.bytes) + ' supera ' + F.kb(lim) + '.') : add('ok', p + F.kb(x.bytes) + ' de ' + F.kb(lim) + '.');
        if (x.animado) { if (x.ms > L.animSeg * 1000) add('error', p + 'dura mas de 10 s.'); if (x.frameMs != null && x.frameMs < L.frameMin) add('error', p + 'fotogramas de menos de 8 ms.'); }
        if (emo(i) < 1) add('error', p + 'necesita al menos 1 emoji.'); else if (emo(i) > L.emojis) add('error', p + 'maximo 3 emojis.');
      });
      if (!tray) add('error', 'Falta el icono de bandeja.'); else { (tray.w !== 96 || tray.h !== 96) && add('error', 'Icono de bandeja: debe ser 96x96 (es ' + tray.w + 'x' + tray.h + ').'); tray.bytes > L.trayMax ? add('error', 'Icono de bandeja: ' + F.kb(tray.bytes) + ' supera 50 KB.') : add('ok', 'Icono de bandeja 96x96 PNG, ' + F.kb(tray.bytes) + '.'); }
    } else if (plat === 'tg') {
      if (n < 1) add('error', 'Telegram necesita al menos 1 sticker.'); else if (n > L.maxStickers) add('error', 'Telegram admite hasta ' + L.maxStickers + ' stickers por set.'); else add('ok', n + ' stickers.');
      infos.forEach((x, i) => {
        if (!x) { add('error', 'Sticker ' + (i + 1) + ': sin imagen.'); return; } const p = 'Sticker ' + (i + 1) + ': ';
        if (x.formato === 'webm') { x.bytes > L.webm ? add('error', p + F.kb(x.bytes) + ' supera 256 KB (WebM).') : add('ok', p + 'WebM ' + F.kb(x.bytes) + '.'); if (x.ms > L.webmSeg * 1000) add('error', p + 'dura mas de 3 s.'); }
        else { if (Math.max(x.w, x.h) !== L.lado || Math.min(x.w, x.h) > L.lado) add('error', p + 'un lado debe medir 512 px y el otro no pasar de 512 (mide ' + x.w + 'x' + x.h + ').'); x.bytes > L.max ? add('error', p + F.kb(x.bytes) + ' supera 512 KB.') : add('ok', p + x.formato.toUpperCase() + ' ' + F.kb(x.bytes) + '.'); }
        if (emo(i) < 1) add('aviso', p + 'sin emoji asociado (Telegram lo pide al crear el sticker).'); else if (emo(i) > L.emojis) add('error', p + 'maximo 20 emojis.');
      });
    } else if (plat === 'signal') {
      if (n < 1) add('error', 'Signal necesita al menos 1 sticker.'); else if (n > L.maxStickers) add('error', 'Signal admite hasta 200 stickers.'); else add('ok', n + ' stickers.');
      infos.forEach((x, i) => { if (!x) { add('error', 'Sticker ' + (i + 1) + ': sin imagen.'); return; } const p = 'Sticker ' + (i + 1) + ': '; (x.w !== 512 || x.h !== 512) && add('error', p + 'debe medir 512x512.'); x.bytes > L.max ? add('error', p + F.kb(x.bytes) + ' supera 300 KB.') : add('ok', p + F.kb(x.bytes) + '.'); if (emo(i) !== 1) add('aviso', p + 'Signal asocia un emoji por sticker.'); });
    } else if (plat === 'imessage') {
      if (n < 1) add('error', 'Necesitas al menos 1 sticker.');
      infos.forEach((x, i) => { if (!x) return; const p = 'Sticker ' + (i + 1) + ': '; if (L.lados.indexOf(x.w) < 0 || x.w !== x.h) add('aviso', p + 'Apple usa 300, 408 o 618 px cuadrados (mide ' + x.w + 'x' + x.h + ').'); x.bytes > L.max ? add('error', p + F.kb(x.bytes) + ' supera 500 KB.') : add('ok', p + F.kb(x.bytes) + '.'); });
    }
    return r;
  };
  F.resumenValidacion = (res) => ({ errores: res.filter((x) => x.nivel === 'error').length, avisos: res.filter((x) => x.nivel === 'aviso').length, cumple: !res.some((x) => x.nivel === 'error') });
  return F;
});
