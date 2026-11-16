/* Vista Packs: biblioteca, gestor de packs (nombre, autor, bandeja, orden, emojis) y exportacion con validador y vista previa de peso. */
(function (g) {
  'use strict';
  const T = g.Tr, h = T.h, Ui = g.Ui, A = g.StApp, Dt = g.StDatos, X = g.StExportar, F = g.StFormatos;
  const S = { packs: [], stickers: [], actual: null, plat: 'wa', prep: null, margen: 16, webm: false };
  const NOTAS = {
    wa: 'WhatsApp no importa packs desde un archivo en la app: solo funcionan a través de apps de terceros que usen su especificación de stickers (el .wastickers de este estudio es un ZIP con contents.json + tray.png + WebP 512×512). El formato oficial exige que una app Android/iOS añada el pack con el SDK de WhatsApp.',
    tg: 'Telegram: los sets se crean con el bot @Stickers (/newpack) enviando cada imagen. Estáticos: PNG/WebP con un lado de 512 px, ≤ 512 KB y margen de ~16 px. Animados: WebM VP9, ≤ 256 KB, ≤ 3 s, 30 fps.',
    signal: 'Signal: usa Signal Desktop > Archivo > Crear/cargar pack de stickers; PNG/APNG/WebP 512×512, ≤ 300 KB y un emoji por sticker.',
    imessage: 'iMessage: Apple exige un proyecto de Xcode («Sticker Pack App») con PNG/GIF/APNG de 300, 408 o 618 px y ≤ 500 KB. Aquí obtienes las imágenes listas para arrastrarlas a Xcode.',
    suelto: 'Archivos PNG con transparencia (512 px). Para SVG o contorno de corte usa la pestaña Imprimir y cortar.'
  };
  const peso = (b) => (b / 1024).toFixed(1) + ' KB';
  const emojiRe = /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]/u;
  const parseEmojis = (s, max) => Array.from(String(s).replace(/[\s,]+/g, '')).filter((c) => emojiRe.test(c)).slice(0, max || 3);
  const urlDe = (s) => s.img || s.mini;
  const tarjeta = (s, extra) => h('li', { cls: 'st-card' }, [h('div', { cls: 'im' }, [h('img', { src: urlDe(s), alt: s.nombre, loading: 'lazy' })]), h('b', { txt: s.nombre, title: s.nombre }), s.animado ? h('span', { cls: 'ins', txt: 'GIF' }) : null, extra]);

  async function cargar() { S.packs = await Dt.listaPacks(); S.stickers = await Dt.listaStickers(); if (S.actual && !S.packs.find((p) => p.id === S.actual)) S.actual = null; if (!S.actual && S.packs.length) S.actual = S.packs[0].id; pintar(); }
  const pack = () => S.packs.find((p) => p.id === S.actual);
  const guardar = async (p) => { await Dt.guardarPack(p); S.prep = null; };

  function listaPacks() {
    const ul = h('ul', { cls: 'st-rejilla', 'aria-label': 'Mis packs' });
    S.packs.forEach((p) => { const ic = S.stickers.find((s) => s.id === p.bandeja) || S.stickers.find((s) => p.items.length && s.id === p.items[0].sid); const li = h('li', { cls: 'st-card', 'aria-current': String(p.id === S.actual) }, [h('div', { cls: 'im' }, [ic ? h('img', { src: urlDe(ic), alt: '' }) : h('span', { txt: '📦' })]), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: p.nombre + ' (' + p.items.length + ')', on: { click: () => { S.actual = p.id; S.prep = null; pintar(); } } })]); ul.appendChild(li); });
    return ul;
  }
  function editor(p) {
    const cont = h('div', {}), n = p.items.length, plat = S.plat;
    cont.append(Ui.texto('Nombre del pack', p.nombre, async (v) => { p.nombre = v; await guardar(p); }), Ui.texto('Autor / editor', p.autor, async (v) => { p.autor = v; Dt.ajuste('autor', v); await guardar(p); }));
    const ul = h('ul', { cls: 'st-rejilla', 'aria-label': 'Stickers del pack, en orden' });
    p.items.forEach((it, i) => {
      const s = S.stickers.find((x) => x.id === it.sid); if (!s) { ul.appendChild(h('li', { cls: 'st-card', txt: '(sticker no disponible en este dispositivo)' })); return; }
      const em = h('input', { type: 'text', value: (it.emojis || []).join(''), 'aria-label': 'Emojis del sticker ' + (i + 1), maxlength: 30, placeholder: '😀', on: { change: async (e) => { it.emojis = parseEmojis(e.target.value, plat === 'tg' ? 20 : 3); e.target.value = it.emojis.join(''); await guardar(p); } } });
      const bt = (t, f, lbl) => h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: t, 'aria-label': lbl, on: { click: f } });
      ul.appendChild(tarjeta(s, h('div', {}, [em, h('div', { cls: 'st-fila-btn' }, [bt('◀', async () => { if (i > 0) { [p.items[i - 1], p.items[i]] = [p.items[i], p.items[i - 1]]; await guardar(p); pintar(); } }, 'Mover antes'), bt('▶', async () => { if (i < n - 1) { [p.items[i + 1], p.items[i]] = [p.items[i], p.items[i + 1]]; await guardar(p); pintar(); } }, 'Mover después'), bt(p.bandeja === s.id ? '★' : '☆', async () => { p.bandeja = s.id; await guardar(p); pintar(); }, 'Usar como icono de bandeja'), bt('✕', async () => { p.items.splice(i, 1); if (p.bandeja === s.id) p.bandeja = ''; await guardar(p); pintar(); }, 'Quitar del pack')])])));
    });
    cont.append(h('h3', { txt: 'Stickers del pack (★ = icono de bandeja)' }), n ? ul : h('p', { cls: 'tr-vacio', txt: 'Pack vacío. Añade stickers desde la biblioteca de abajo o guarda desde el Estudio.' }));
    cont.append(Ui.filaBtn([Ui.btn('Borrar pack', async () => { if (g.confirm('¿Borrar el pack «' + p.nombre + '»? Los stickers siguen en la biblioteca.')) { await Dt.borrarPack(p.id); S.actual = null; await cargar(); } }, 'tr-peli')]));
    return cont;
  }
  function exportador(p) {
    const cont = h('div', {}), plats = Object.keys(F.PLATAFORMAS).map((k) => [k, F.PLATAFORMAS[k]]), res = h('div', { id: 'pk-res', 'aria-live': 'polite' });
    cont.append(h('h2', { txt: 'Exportar «' + p.nombre + '»' }), Ui.select('Destino', plats, S.plat, (v) => { S.plat = v; S.prep = null; pintar(); }), Ui.nota(NOTAS[S.plat], S.plat === 'wa' ? 'tr-av' : ''),
      Ui.rango('Margen transparente', 0, 40, 1, S.margen, (v) => { S.margen = v; S.prep = null; }, (v) => v + ' px'));
    if (S.plat === 'tg') cont.append(Ui.check('Animados como WebM (MediaRecorder, tiempo real)', S.webm, (v) => { S.webm = v; S.prep = null; }));
    const b1 = Ui.btn('Analizar peso y validar', async () => { b1.disabled = true; res.textContent = 'Procesando ' + p.items.length + ' stickers…'; try { S.prep = await X.prepararPack(S.plat, p, { margen: S.margen, webm: S.webm }, (i, n) => { res.textContent = 'Procesando ' + (i + 1) + ' de ' + n + '…'; }); pintarRes(res, p); } catch (e) { res.textContent = ''; A.aviso(e.message, 'error'); } b1.disabled = false; }, 'tr-pri', { id: 'pk-analizar' });
    const b2 = Ui.btn('Descargar ' + (S.plat === 'wa' ? '.wastickers' : '.zip'), async () => { b2.disabled = true; try { if (!S.prep) S.prep = await X.prepararPack(S.plat, p, { margen: S.margen, webm: S.webm }); pintarRes(res, p); const blob = await X.zipPack(S.prep, p); T.descargar(blob, T.nombreArchivo(p.nombre) + '.' + X.extension[S.plat]); A.logro('exportar_' + S.plat); A.xp(10); if (S.prep.validacion.some((v) => v.nivel === 'error')) A.aviso('Descargado, pero el validador marca errores: revísalos.', 'error'); } catch (e) { A.aviso(e.message, 'error'); } b2.disabled = false; }, '', { id: 'pk-descargar' });
    cont.append(Ui.filaBtn([b1, b2]), res); if (S.prep && S.prep.plat === S.plat) pintarRes(res, p);
    return cont;
  }
  function pintarRes(res, p) {
    res.textContent = ''; const pr = S.prep; if (!pr) return; const L = F.LIM[pr.plat] || {}, lim = (x) => pr.plat === 'wa' ? (x.animado ? L.anim : L.est) : pr.plat === 'tg' ? (x.formato === 'webm' ? L.webm : L.max) : pr.plat === 'signal' ? L.max : pr.plat === 'imessage' ? L.max : 0;
    const resu = F.resumenValidacion(pr.validacion); if (pr.plat !== 'suelto') res.appendChild(Ui.nota(resu.cumple ? 'Cumple todos los requisitos de ' + F.PLATAFORMAS[pr.plat] + (resu.avisos ? ' (con ' + resu.avisos + ' aviso/s)' : '') + '.' : resu.errores + ' error(es): corrígelos antes de importar.', resu.cumple ? 'tr-ok' : 'tr-mal'));
    pr.infos.forEach((x, i) => { if (!x) return; const l = lim(x), pct = l ? Math.min(100, x.bytes / l * 100) : 0; res.appendChild(h('div', { cls: 'st-peso' }, [h('span', { txt: '#' + (i + 1) + ' ' + x.formato.toUpperCase() + ' ' + x.w + '×' + x.h + (x.animado ? ' ▶' : '') }), h('div', { cls: 'st-barra' }, [h('i', { cls: x.bytes > l && l ? 'mal' : '', style: 'width:' + pct + '%' })]), h('span', { txt: peso(x.bytes) + (l ? ' / ' + peso(l) : '') })])); });
    if (pr.tray) res.appendChild(h('div', { cls: 'st-peso' }, [h('span', { txt: 'Icono 96×96 PNG' }), h('div', { cls: 'st-barra' }, [h('i', { style: 'width:' + Math.min(100, pr.tray.bytes / L.trayMax * 100) + '%' })]), h('span', { txt: peso(pr.tray.bytes) + ' / 50 KB' })]));
    pr.notas.forEach((n) => res.appendChild(Ui.nota(n, 'tr-av'))); const ul = h('ul', { cls: 'st-val', 'aria-label': 'Validador del pack' }); pr.validacion.filter((v) => v.nivel !== 'ok').forEach((v) => ul.appendChild(h('li', { cls: v.nivel, txt: (v.nivel === 'error' ? 'Error: ' : 'Aviso: ') + v.texto }))); if (ul.children.length) res.appendChild(ul);
  }
  /* rotacion de tono (variantes) */
  function rotarTono(cv, grados) {
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(cv, 0, 0); const id = x.getImageData(0, 0, c.width, c.height), d = id.data, a = grados * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
    const m = [0.213 + co * 0.787 - si * 0.213, 0.715 - co * 0.715 - si * 0.715, 0.072 - co * 0.072 + si * 0.928, 0.213 - co * 0.213 + si * 0.143, 0.715 + co * 0.285 + si * 0.140, 0.072 - co * 0.072 - si * 0.283, 0.213 - co * 0.213 - si * 0.787, 0.715 - co * 0.715 + si * 0.715, 0.072 + co * 0.928 + si * 0.072];
    for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i + 1], b = d[i + 2]; d[i] = Math.max(0, Math.min(255, r * m[0] + gg * m[1] + b * m[2])); d[i + 1] = Math.max(0, Math.min(255, r * m[3] + gg * m[4] + b * m[5])); d[i + 2] = Math.max(0, Math.min(255, r * m[6] + gg * m[7] + b * m[8])); } x.putImageData(id, 0, 0); return c;
  }
  A.rotarTono = rotarTono;
  function biblioteca() {
    const p = pack(), cont = h('div', {}), ul = h('ul', { cls: 'st-rejilla', 'aria-label': 'Biblioteca de stickers' });
    S.stickers.forEach((s) => {
      const bt = (t, f, lbl, cls) => h('button', { type: 'button', cls: 'tr-btn tr-chico ' + (cls || ''), txt: t, 'aria-label': lbl, on: { click: f } });
      ul.appendChild(tarjeta(s, h('div', { cls: 'st-fila-btn' }, [
        p ? bt('＋', async () => { if (p.items.some((i) => i.sid === s.id)) { A.aviso('Ya está en el pack.'); return; } p.items.push({ sid: s.id, emojis: (s.emojis || []).slice(0, 3) }); if (!p.bandeja) p.bandeja = s.id; await guardar(p); pintar(); }, 'Añadir «' + s.nombre + '» al pack') : null,
        bt('⧉', async () => { const copia = Object.assign({}, s); delete copia.id; delete copia._t; delete copia._creado; copia.nombre = s.nombre + ' copia'; const blob = await Dt.imagenSticker(s); if (!blob) return; const cv = await X.canvasDe(blob); const nuevo = await Dt.guardarSticker({ nombre: copia.nombre, canvas: cv, emojis: s.emojis, proyecto: s.proyecto, anim: s.animado ? await Dt.animSticker(s) : null }); A.aviso('Duplicado.'); await cargar(); void nuevo; }, 'Duplicar'),
        bt('🎨', async () => { if (s.animado) { A.aviso('Las variantes de color son para stickers estáticos.', 'error'); return; } const blob = await Dt.imagenSticker(s), cv = await X.canvasDe(blob); for (const gr of [60, 140, 220]) await Dt.guardarSticker({ nombre: s.nombre + ' ' + gr + '°', canvas: rotarTono(cv, gr), emojis: s.emojis, proyecto: s.proyecto }); A.aviso('3 variantes de color creadas.'); A.logro('variantes'); await cargar(); }, 'Crear 3 variantes de color'),
        bt('⬇', async () => { const blob = await Dt.imagenSticker(s); if (blob) T.descargar(blob, T.nombreArchivo(s.nombre) + (blob.type === 'image/webp' ? '.webp' : '.png')); }, 'Descargar'),
        bt('✕', async () => { if (g.confirm('¿Borrar «' + s.nombre + '» de la biblioteca y de todos los packs?')) { await Dt.borrarSticker(s.id); await cargar(); } }, 'Borrar', 'tr-peli')].filter(Boolean))));
    });
    cont.append(h('h3', { txt: 'Biblioteca (' + S.stickers.length + ')' }), S.stickers.length ? ul : h('p', { cls: 'tr-vacio', txt: 'Todavía no hay stickers. Crea uno en el Estudio y pulsa «Guardar sticker».' }));
    const loc = S.stickers.filter((s) => s.local).length; if (loc) cont.appendChild(Ui.nota(loc + ' sticker(s) pesan más de 150 KB (o son animados): solo existen en este dispositivo y no se sincronizan.', 'tr-av'));
    return cont;
  }
  let raiz = null;
  function pintar() {
    if (!raiz) return; raiz.textContent = ''; const p = pack();
    const nuevo = Ui.btn('＋ Nuevo pack', async () => { const pk = await Dt.guardarPack(Dt.packNuevo('Pack ' + (S.packs.length + 1), Dt.ajuste('autor') || '')); S.actual = pk.id; await cargar(); }, 'tr-pri', { id: 'pk-nuevo' });
    const izq = h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Mis packs' }), S.packs.length ? listaPacks() : h('p', { cls: 'tr-vacio', txt: 'Aún no tienes packs.' }), nuevo, p ? editor(p) : null]);
    const der = h('div', { cls: 'tr-panel' }, [p ? exportador(p) : h('p', { cls: 'tr-vacio', txt: 'Crea o elige un pack para exportarlo.' })]);
    raiz.append(h('div', { cls: 'st-dos' }, [izq, der]), h('div', { cls: 'tr-panel' }, [biblioteca()]));
  }
  A.iniciarPacks = function () { raiz = document.getElementById('v-packs'); A.on('packs', cargar); A.on('stickers', cargar); Dt.alm.suscribir(null, () => { clearTimeout(S.t); S.t = setTimeout(cargar, 200); }); Dt.listo.then(cargar); };
  A.packsAhora = () => S;
})(window);
