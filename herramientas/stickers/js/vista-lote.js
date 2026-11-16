/* Vista Lote: varias imagenes -> stickers de un pack (fondo liso opcional, contorno y sombra automaticos). */
(function (g) {
  'use strict';
  const T = g.Tr, h = T.h, Ui = g.Ui, A = g.StApp, Dt = g.StDatos, D = g.StDoc, R = g.StRender, H = g.StHerr;
  const S = { archivos: [], tolerancia: 28, fondo: true, grosor: 10, sombra: false, emoji: '😀', pack: '' };
  const cargarImg = (f) => new Promise((ok, ko) => { const u = URL.createObjectURL(f), i = new Image(); i.onload = () => { URL.revokeObjectURL(u); ok(i); }; i.onerror = () => { URL.revokeObjectURL(u); ko(new Error('No se pudo abrir ' + f.name)); }; i.src = u; });
  async function procesar(f, o) {
    const img = await cargarImg(f), k = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.round(img.naturalWidth * k), hh = Math.round(img.naturalHeight * k), id = D.nuevoPix(w, hh, img, false), p = D.pix.get(id);
    try {
      if (o.fondo) H.quitarFondoLiso(p.c, o.tolerancia);
      const esc = Math.min(440 / w, 440 / hh), doc = { w: 512, h: 512, capas: [D.capaNueva('raster', { pix: id, esc })], sticker: Object.assign(D.STICKER0(), { contorno: Object.assign(D.STICKER0().contorno, { on: o.grosor > 0, grosor: o.grosor }), sombra: Object.assign(D.STICKER0().sombra, { on: o.sombra }) }) };
      return R.paraExportar(doc, { lado: 512, margen: 12 });
    } finally { D.pix.delete(id); }
  }
  A.iniciarLote = function () {
    const raiz = document.getElementById('v-lote'), lista = h('ul', { cls: 'st-rejilla', id: 'lo-lista', 'aria-label': 'Imágenes del lote' }), estado = h('p', { cls: 'tr-ayuda', id: 'lo-estado', 'aria-live': 'polite' }), barra = h('div', { cls: 'st-barra' }, [h('i', { style: 'width:0%', id: 'lo-barra' })]);
    const inp = h('input', { type: 'file', accept: 'image/*', multiple: true, id: 'lo-archivos', cls: 'tr-solo-lector', 'aria-label': 'Elegir imágenes para el lote' }); let packSel;
    const pintarLista = () => { lista.textContent = ''; S.archivos.forEach((f, i) => { const u = URL.createObjectURL(f); lista.appendChild(h('li', { cls: 'st-card' }, [h('div', { cls: 'im' }, [h('img', { src: u, alt: f.name, on: { load: () => URL.revokeObjectURL(u) } })]), h('b', { txt: f.name, title: f.name }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Quitar', on: { click: () => { S.archivos.splice(i, 1); pintarLista(); } } })])); }); estado.textContent = S.archivos.length ? S.archivos.length + ' imagen(es) listas.' : 'Aún no has elegido imágenes.'; };
    inp.addEventListener('change', () => { S.archivos = S.archivos.concat(Array.from(inp.files).filter((f) => /^image\//.test(f.type))).slice(0, 60); inp.value = ''; pintarLista(); });
    const llenarPacks = async () => { const ps = await Dt.listaPacks(); const sel = packSel.sel; sel.textContent = ''; [['', 'Solo biblioteca (sin pack)'], ['__nuevo', '＋ Pack nuevo «Lote»']].concat(ps.map((p) => [p.id, p.nombre])).forEach((o) => sel.appendChild(h('option', { value: o[0], txt: o[1] }))); sel.value = S.pack; };
    packSel = Ui.select('Añadir al pack', [['', '…']], '', (v) => { S.pack = v; });
    const panel = h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Lote: muchas imágenes → un pack' }), Ui.nota('Elige varias fotos u objetos sobre fondo liso: cada una se convierte en sticker 512×512 con contorno. Para recortes difíciles, edítalas una a una en el Estudio.'),
      Ui.btn('📁 Elegir imágenes (hasta 60)', () => inp.click(), 'tr-pri', { id: 'lo-elegir' }), inp, lista, estado,
      Ui.check('Quitar fondo liso (desde las esquinas)', S.fondo, (v) => { S.fondo = v; }), Ui.rango('Tolerancia del fondo', 0, 100, 1, S.tolerancia, (v) => { S.tolerancia = v; }, (v) => v + '%'), Ui.rango('Contorno blanco', 0, 40, 1, S.grosor, (v) => { S.grosor = v; }, (v) => v + ' px'), Ui.check('Sombra suave', S.sombra, (v) => { S.sombra = v; }),
      Ui.texto('Emoji asociado', S.emoji, (v) => { S.emoji = v; }), packSel, barra,
      Ui.filaBtn([Ui.btn('Crear stickers', async (e) => {
        if (!S.archivos.length) { A.aviso('Elige imágenes primero.', 'error'); return; } const b = e.target; b.disabled = true; let pk = null, ok = 0; const packs = await Dt.listaPacks();
        try {
          if (S.pack === '__nuevo') { pk = Dt.packNuevo('Lote ' + new Date().toLocaleDateString(), Dt.ajuste('autor') || ''); pk = await Dt.guardarPack(pk); } else if (S.pack) pk = packs.find((p) => p.id === S.pack);
          const em = Array.from(S.emoji).filter((c) => /\p{Extended_Pictographic}/u.test(c)).slice(0, 3);
          for (let i = 0; i < S.archivos.length; i++) {
            estado.textContent = 'Procesando ' + (i + 1) + ' de ' + S.archivos.length + '…'; document.getElementById('lo-barra').style.width = ((i + 1) / S.archivos.length * 100) + '%'; await new Promise((r) => setTimeout(r, 10));
            try { const cv = await procesar(S.archivos[i], S); const reg = await Dt.guardarSticker({ nombre: S.archivos[i].name.replace(/\.[^.]+$/, '').slice(0, 30), canvas: cv, emojis: em.length ? em : ['😀'] }); if (pk) { pk.items.push({ sid: reg.id, emojis: em.length ? em : ['😀'] }); if (!pk.bandeja) pk.bandeja = reg.id; } ok++; } catch (er) { A.aviso(er.message, 'error'); }
          }
          if (pk) pk = await Dt.guardarPack(pk);
          estado.textContent = ok + ' sticker(s) creados' + (pk ? ' en «' + pk.nombre + '»' : '') + '.'; A.aviso(estado.textContent); A.logro('lote'); A.xp(10); A.emitir('stickers'); A.emitir('packs'); S.archivos = []; pintarLista(); llenarPacks();
        } catch (er) { A.aviso(er.message, 'error'); }
        b.disabled = false;
      }, 'tr-pri', { id: 'lo-crear' })])]);
    raiz.appendChild(panel); pintarLista(); Dt.listo.then(llenarPacks); A.on('packs', llenarPacks);
  };
})(window);
