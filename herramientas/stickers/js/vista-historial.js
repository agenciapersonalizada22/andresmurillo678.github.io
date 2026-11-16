/* Vista Historial: proyectos recientes y favoritos, stickers recientes. */
(function (g) {
  'use strict';
  const T = g.Tr, h = T.h, Ui = g.Ui, A = g.StApp, Dt = g.StDatos, X = g.StExportar;
  const S = { soloFav: false };
  const fecha = (t) => t ? new Date(t).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  async function pintar() {
    const raiz = document.getElementById('v-historial'); if (!raiz) return; const proys = (await Dt.listaProyectos()).filter((p) => !S.soloFav || p.fav), sts = (await Dt.listaStickers()).filter((s) => !S.soloFav || s.fav);
    raiz.textContent = ''; const bt = (t, f, lbl, cls) => h('button', { type: 'button', cls: 'tr-btn tr-chico ' + (cls || ''), txt: t, 'aria-label': lbl, on: { click: f } });
    const ulP = h('ul', { cls: 'st-rejilla', 'aria-label': 'Proyectos' });
    proys.forEach((p) => ulP.appendChild(h('li', { cls: 'st-card' }, [h('div', { cls: 'im' }, [p.mini ? h('img', { src: p.mini, alt: '' }) : h('span', { txt: '🎨' })]), h('b', { txt: p.nombre, title: p.nombre }), h('span', { cls: 'tr-ayuda', txt: fecha(p._t) }),
      h('div', { cls: 'st-fila-btn' }, [bt('Abrir', () => A.abrirProyecto(p.id), 'Abrir ' + p.nombre, 'tr-pri'), bt(p.fav ? '★' : '☆', async () => { await Dt.favoritoProyecto(p.id, !p.fav); pintar(); }, 'Favorito'),
        bt('⧉', async () => { const r = await Dt.cargarProyecto(p.id); if (!r) { A.aviso('El proyecto completo solo está en su dispositivo de origen.', 'error'); return; } const id = Dt.alm.nuevoId(); await Dt.pes.set('proyectos', { id, nombre: p.nombre + ' copia', estructura: r.estructura, pix: r.pix }); await Dt.alm.set('proyectos_meta', Object.assign({}, p, { id, nombre: p.nombre + ' copia', fav: false, _t: undefined, _creado: undefined })); A.logro('variantes'); pintar(); }, 'Duplicar'),
        bt('✕', async () => { if (g.confirm('¿Borrar el proyecto «' + p.nombre + '»?')) { await Dt.borrarProyecto(p.id); pintar(); } }, 'Borrar', 'tr-peli')])])));
    const ulS = h('ul', { cls: 'st-rejilla', 'aria-label': 'Stickers' });
    sts.slice(0, 60).forEach((s) => ulS.appendChild(h('li', { cls: 'st-card' }, [h('div', { cls: 'im' }, [h('img', { src: s.img || s.mini, alt: s.nombre })]), h('b', { txt: s.nombre, title: s.nombre }), h('div', { cls: 'st-fila-btn' }, [bt(s.fav ? '★' : '☆', async () => { s.fav = !s.fav; await Dt.actualizarSticker(s); pintar(); }, 'Favorito'), bt('⬇', async () => { const b = await Dt.imagenSticker(s); if (b) T.descargar(b, T.nombreArchivo(s.nombre) + (b.type === 'image/webp' ? '.webp' : '.png')); }, 'Descargar')])])));
    raiz.append(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Historial' }), Ui.check('Solo favoritos', S.soloFav, (v) => { S.soloFav = v; pintar(); }), Ui.nota('Se sincronizan con tu cuenta la ficha del proyecto (nombre y miniatura) y los stickers de hasta 150 KB. Los píxeles de los proyectos y los stickers pesados o animados se quedan en este dispositivo.'), h('h3', { txt: 'Proyectos (' + proys.length + ')' }), proys.length ? ulP : h('p', { cls: 'tr-vacio', txt: 'Sin proyectos guardados todavía.' }), h('h3', { txt: 'Stickers (' + sts.length + ')' }), sts.length ? ulS : h('p', { cls: 'tr-vacio', txt: 'Sin stickers guardados todavía.' })]));
  }
  A.iniciarHistorial = function () { A.on('proyectos', pintar); A.on('stickers', pintar); Dt.listo.then(pintar); Dt.alm.suscribir(null, () => { clearTimeout(S.t); S.t = setTimeout(() => { if (!document.getElementById('v-historial').hidden) pintar(); }, 250); }); };
  A.alMostrarHistorial = pintar;
})(window);
