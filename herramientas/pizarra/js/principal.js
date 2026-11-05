// Aplicacion: une documento, lienzo, herramientas, interfaz, almacenamiento y colaboracion.
import { Doc, nuevoId, compactarOps } from './modelo.js';
import { Vista } from './vista.js';
import { crearHerramientas } from './herramientas.js';
import { crearUI } from './ui.js';
import { crearColab } from './colab.js';
import { crearMando } from './entrada_mando.js';
import * as Almacen from './almacen.js';
import { cargarAjustes, guardarAjustes, aplicarAjustes } from './ajustes.js';
import { caja } from './geom.js';
import { dibujarPagina } from './dibujo.js';
import { aSVG, crearPDF, aJSON, deJSON, lienzoPagina, descargar, nombreArchivo, dataURLaBytes } from './exportar.js';

const doc = new Doc();
const app = { doc, assets: {}, ajustes: cargarAjustes(), tableroId: null, ls: Almacen.ls, uid: null };
app.uid = Almacen.ls.leer('uid', null) || (() => { const u = nuevoId(8); Almacen.ls.escribir('uid', u); return u; })();
aplicarAjustes(app.ajustes);
app.caja = e => caja(doc, e);
app.yo = () => (window.Red ? window.Red.perfil.obtener() : { nombre: 'Yo', color: '#3b82f6' });
app.puedeEditar = () => !(app.colab && app.colab.soloLectura());
app.setAjuste = (k, v) => { app.ajustes[k] = v; guardarAjustes(app.ajustes); aplicarAjustes(app.ajustes); app.vista.aplicarDpr(); app.ui.refrescar(); };

const vista = app.vista = new Vista(document.querySelector('#escena'), app);
app.herr = crearHerramientas(app);
app.ui = crearUI(app);
app.colab = crearColab(app);
app.pedirAsset = id => app.colab.pedirAsset(id);

// ---------- persistencia ----------
let pend = [], tPers = 0, cadena = Promise.resolve(), flushes = 0, sucioVersion = false, sucioMini = false, tMini = 0;
app.persistir = ops => {
  pend.push(...ops); sucioVersion = sucioMini = true;
  clearTimeout(tPers); tPers = setTimeout(vaciar, 350);
  clearTimeout(tMini); tMini = setTimeout(guardarMini, 4000);
};
function vaciar() {
  clearTimeout(tPers); if (!pend.length || !app.tableroId) return cadena;
  const ops = compactarOps(pend), id = app.tableroId; pend = [];
  cadena = cadena.then(async () => {
    await Almacen.anexar(id, ops);
    await Almacen.actualizarMeta(id, { mod: Date.now(), n: contarObjetos(), paginas: doc.paginas().length, titulo: doc.meta('titulo') || 'Tablero sin título' });
    if (++flushes % 80 === 0 && id === app.tableroId) await Almacen.compactar(id, doc.aOps());
  }).catch(e => console.error('guardado', e));
  return cadena;
}
const contarObjetos = () => { let n = 0; for (const e of doc.ent.o.values()) if (e.v.del === false) n++; return n; };
app.guardarAhora = () => vaciar();
doc.alCambiarLocal = ops => { app.persistir(ops); app.colab.enviarOps(ops); };
doc.on((k, e, cam, local) => {
  if (k === 'p') { if (!local || true) { clearTimeout(app._tp); app._tp = setTimeout(verificarPagina, 0); } app.ui.paginasCambio(); }
  if (k === 'm' && 'titulo' in cam) { document.title = 'Pizarra · ' + (e.v.titulo || ''); }
  if (k === 'm' && 'timer' in cam) app.ui.timerCambio();
  if (local || true) { clearTimeout(app._ur); app._ur = setTimeout(() => app.ui.refrescar(), 30); }
});
function verificarPagina() {
  const p = vista.pg && doc.ent.p.get(vista.pg);
  if (p && p.v.del === false) return;
  const pgs = doc.paginas();
  if (pgs.length) { vista.pg = null; vista.ponerPagina(pgs[0].id); app.ui.refrescarTodo(); }
}
async function guardarMini() {
  if (!app.tableroId || !sucioMini) return; sucioMini = false;
  try {
    const pgs = doc.paginas(); if (!pgs.length) return;
    await precargar();
    const c = lienzoPagina(doc, pgs[0].id, dibujarPagina, id => vista.imagen(id), 0.2, 400);
    await Almacen.actualizarMeta(app.tableroId, { mini: c.toDataURL('image/jpeg', 0.6) });
  } catch (e) {}
}
app.guardarMini = async () => { sucioMini = true; await vaciar(); await guardarMini(); };
app.guardarVersion = async et => { await vaciar(); await Almacen.guardarVersion(app.tableroId, doc.aOps(), et); sucioVersion = false; };
app.restaurarVersion = async k => {
  const ops = await Almacen.leerVersion(app.tableroId, k); if (!ops) return false;
  await app.guardarVersion('antes de restaurar');
  const snap = Doc.deOps(ops, 'snap');
  doc.agrupar(() => doc.cambiar(doc.diffHacia(snap).filter(c => !(c.k === 'm' && c.id === 'm' && 'timer' in c.p))));
  verificarPagina(); vista.redibujarTodo(); app.ui.refrescarTodo(); return true;
};
setInterval(() => { if (sucioVersion && app.tableroId) app.guardarVersion('automática').catch(() => {}); }, 180000);
for (const ev of ['visibilitychange', 'pagehide', 'beforeunload']) window.addEventListener(ev, () => { if (ev !== 'visibilitychange' || document.hidden) { vaciar(); if (ev === 'pagehide' && window.Red) window.Red.salir(); } });

// ---------- tableros ----------
function baseNueva(titulo) {
  doc.cambiar([
    { k: 'm', id: 'm', p: { titulo: titulo || 'Tablero sin título', creado: Date.now() } },
    { k: 'p', id: 'p0', p: { ord: 0, del: false, fondo: 'cuadriculado', marco: true } },
    { k: 'l', id: 'c0', p: { nombre: 'Fondo', ord: 0, del: false } }, { k: 'l', id: 'c1', p: { nombre: 'Contenido', ord: 1, del: false } }, { k: 'l', id: 'c2', p: { nombre: 'Anotaciones', ord: 2, del: false } }
  ], { sinHistorial: true });
}
function reiniciarDoc() {
  doc.vaciar(); app.assets = {}; vista.imgs.clear(); vista.pg = null; vista.camaras.clear(); vista.ocultos = new Set();
  app.herr.ponerSel([]); app.herr.opts.capa = 'c1';
}
function mostrar() {
  verificarPagina(); vista.redibujarTodo(); document.title = 'Pizarra · ' + (doc.meta('titulo') || '');
  app.ui.invalidarProps(); app.ui.refrescarTodo(); vista.ajustar(true);
}
app.abrirTablero = async id => {
  await vaciar(); await cadena;
  const d = await Almacen.cargar(id); if (!d) { app.aviso('No se encontró el tablero'); return false; }
  reiniciarDoc(); app.tableroId = id;
  doc.aplicarVarias(d.ops); app.assets = d.assets;
  if (!doc.paginas().length) baseNueva(d.meta.titulo);
  Almacen.ls.escribir('ultimo', id);
  if (d.registros > 30) Almacen.compactar(id, doc.aOps());
  mostrar(); return true;
};
app.nuevoTablero = async (titulo, ops, assets) => {
  await vaciar(); await cadena;
  const id = nuevoId(10);
  await Almacen.crear(id, titulo || 'Tablero sin título');
  reiniciarDoc(); app.tableroId = id;
  if (ops) { doc.aplicarVarias(ops); app.assets = assets || {}; await Almacen.anexar(id, ops); for (const [a, d] of Object.entries(app.assets)) await Almacen.guardarAsset(id, a, d); if (!doc.paginas().length) baseNueva(titulo); }
  else { doc.alCambiarLocal = null; baseNueva(titulo); doc.alCambiarLocal = (o) => { app.persistir(o); app.colab.enviarOps(o); }; app.persistir(doc.aOps()); }
  Almacen.ls.escribir('ultimo', id); await vaciar(); mostrar(); return id;
};
app.abrirCompartido = async (id, titulo) => {
  if (id === app.tableroId) return doc.ent.o.size > 0;
  await vaciar(); await cadena;
  const existe = await Almacen.meta(id);
  if (existe && !existe.borrado) { await app.abrirTablero(id); return true; }
  await Almacen.crear(id, titulo || 'Tablero compartido');
  reiniciarDoc(); app.tableroId = id; Almacen.ls.escribir('ultimo', id);
  doc.aplicar({ k: 'm', id: 'm', p: { titulo: titulo || 'Tablero compartido' }, c: 0, a: '' });
  vista.redibujarTodo(); app.ui.refrescarTodo(); return false;
};
app.renombrarActual = async t => { doc.cambiar([{ k: 'm', id: 'm', p: { titulo: t } }], { sinHistorial: true }); document.title = 'Pizarra · ' + t; };
app.renombrarTablero = async (id, t) => { if (id === app.tableroId) return app.renombrarActual(t); await Almacen.actualizarMeta(id, { titulo: t }); };
app.duplicarTablero = async id => { if (id === app.tableroId) await vaciar(); const m = await Almacen.meta(id); return Almacen.duplicar(id, nuevoId(10), 'Copia de ' + m.titulo); };
app.papelera = async id => {
  await Almacen.aPapelera(id);
  if (id === app.tableroId) { const l = await Almacen.listar(); if (l.length) await app.abrirTablero(l[0].id); else await app.nuevoTablero(); }
};
app.importarJSON = async file => {
  try { const d = deJSON(await file.text()); await app.nuevoTablero(d.titulo + ' (importado)', d.ops, d.assets); app.aviso('Tablero importado'); }
  catch (e) { app.aviso(e.message); }
};

// ---------- paginas y capas ----------
app.irPagina = (pg, remoto) => {
  if (!doc.ent.p.get(pg)) return;
  app.herr.ponerSel([]); vista.ponerPagina(pg); app.ui.refrescarTodo(); if (!remoto) app.colab.vistaCambio();
  app.colab.cursor(null);
};
app.paginaRel = d => { const p = doc.paginas(), i = p.findIndex(x => x.id === vista.pg), n = p[i + d]; if (n) app.irPagina(n.id); };
app.nuevaPagina = () => {
  if (!app.puedeEditar()) return;
  const p = doc.paginas(), id = nuevoId(6), actual = doc.ent.p.get(vista.pg), i = p.findIndex(x => x.id === vista.pg);
  const ord = i >= 0 && p[i + 1] ? (p[i].v.ord + p[i + 1].v.ord) / 2 : (p.length ? p[p.length - 1].v.ord + 1 : 0);
  doc.cambiar([{ k: 'p', id, p: { ord, del: false, fondo: actual ? actual.v.fondo : 'cuadriculado', marco: actual ? !!actual.v.marco : true } }]);
  app.irPagina(id); return id;
};
app.duplicarPagina = pg => {
  if (!app.puedeEditar()) return;
  const p = doc.paginas(), i = p.findIndex(x => x.id === pg), src = p[i]; if (!src) return;
  const id = nuevoId(6), ord = p[i + 1] ? (src.v.ord + p[i + 1].v.ord) / 2 : src.v.ord + 1, mapa = new Map(), ch = [];
  const L = doc.lista(pg); for (const e of L) mapa.set(e.id, nuevoId(10));
  ch.push({ k: 'p', id, p: { ord, del: false, fondo: src.v.fondo, marco: !!src.v.marco } });
  for (const e of L) {
    const v = { ...e.v, pg: id }; for (const k of Object.keys(v)) if (k.startsWith('v:')) delete v[k];
    if (v.tipo === 'conector') { v.ea = mapa.get(v.ea) || ''; v.eb = mapa.get(v.eb) || ''; }
    ch.push({ k: 'o', id: mapa.get(e.id), p: v });
  }
  doc.agrupar(() => doc.cambiar(ch)); app.irPagina(id);
};
app.borrarPagina = pg => {
  const p = doc.paginas(); if (p.length < 2) return;
  const i = p.findIndex(x => x.id === pg), sig = p[i + 1] || p[i - 1];
  doc.cambiar([{ k: 'p', id: pg, p: { del: true } }]);
  if (pg === vista.pg) app.irPagina(sig.id); else app.ui.refrescarTodo();
};
app.moverPagina = (pg, d) => {
  const p = doc.paginas(), i = p.findIndex(x => x.id === pg), j = i + d; if (j < 0 || j >= p.length) return;
  doc.cambiar([{ k: 'p', id: p[i].id, p: { ord: p[j].v.ord } }, { k: 'p', id: p[j].id, p: { ord: p[i].v.ord } }]);
  if (p[i].v.ord === p[j].v.ord) doc.cambiar([{ k: 'p', id: p[i].id, p: { ord: p[j].v.ord + (d > 0 ? 0.01 : -0.01) } }]);
  app.ui.refrescarTodo();
};
app.reordenarPagina = (id, antesDe) => {
  const p = doc.paginas().filter(x => x.id !== id), i = p.findIndex(x => x.id === antesDe); if (i < 0) return;
  const prev = p[i - 1], ord = prev ? (prev.v.ord + p[i].v.ord) / 2 : p[i].v.ord - 1;
  doc.cambiar([{ k: 'p', id, p: { ord } }]); app.ui.refrescarTodo();
};
app.cambiarPagina = p => { if (app.puedeEditar()) doc.cambiar([{ k: 'p', id: vista.pg, p }]); vista.redibujarTodo(); };
app.cambiarCapa = (id, p) => { if (app.puedeEditar()) doc.cambiar([{ k: 'l', id, p }]); vista.redibujarTodo(); };
app.nuevaCapa = () => { const c = doc.capas(), id = 'c' + nuevoId(4), n = c.length + 1; doc.cambiar([{ k: 'l', id, p: { nombre: 'Capa ' + n, ord: c[c.length - 1].v.ord + 1, del: false } }]); app.herr.opts.capa = id; };
app.aplicarPlantilla = (pl, nueva) => {
  if (!app.puedeEditar()) return;
  if (nueva) app.nuevaPagina();
  const ids = pl.crear(doc, vista.pg); vista.ajustar(true); app.herr.setHerr('sel'); app.herr.ponerSel(ids);
};
const cacheMini = new Map();
app.miniatura = pg => {
  const clave = pg + ':' + doc.version, c = cacheMini.get(pg);
  if (c && c.clave === clave) return c.cv;
  const cv = lienzoPagina(doc, pg, dibujarPagina, id => vista.imagen(id), 0.14, 400);
  cacheMini.set(pg, { clave, cv }); return cv;
};
app.deshacer = () => { if (!app.puedeEditar()) return; if (app.herr.editando) app.herr.cerrarEditor(); doc.deshacer(); app.herr.ponerSel([...app.herr.sel].filter(id => doc.obj(id))); app.ui.refrescar(); };
app.rehacer = () => { if (!app.puedeEditar()) return; if (app.herr.editando) app.herr.cerrarEditor(); doc.rehacer(); app.herr.ponerSel([...app.herr.sel].filter(id => doc.obj(id))); app.ui.refrescar(); };

// ---------- temporizador ----------
app.fijarTimer = t => { if (app.puedeEditar()) doc.cambiar([{ k: 'm', id: 'm', p: { timer: t } }], { sinHistorial: true }); app.ui.timerCambio(); };
app.controlTimer = a => {
  const t = doc.meta('timer'); if (!t) return;
  if (a === 'iniciar' && !t.run) { const resto = t.resto > 0 ? t.resto : t.dur; app.fijarTimer({ ...t, run: true, fin: Date.now() + resto, resto }); }
  else if (a === 'pausa' && t.run) app.fijarTimer({ ...t, run: false, resto: Math.max(0, t.fin - Date.now()) });
  else if (a === 'reiniciar') app.fijarTimer({ ...t, run: false, resto: t.dur, fin: 0, id: nuevoId(4) });
};
app.sonarFin = () => {
  if (!app.ajustes.sonido) return;
  try {
    const A = window.AudioContext || window.webkitAudioContext, ctx = new A(), vol = app.ajustes.volumen;
    [0, 0.25, 0.5].forEach(t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.25 * vol + 0.001, ctx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.22); });
    setTimeout(() => ctx.close(), 1500);
  } catch (e) {}
};

// ---------- imagenes ----------
const hash = s => { let h1 = 0x811c9dc5, h2 = 5381; for (let i = 0; i < s.length; i += 3) { h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619); h2 = (h2 * 33) ^ s.charCodeAt(i); } return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + s.length.toString(36); };
app.registrarAsset = data => {
  const id = hash(data);
  if (!app.assets[id]) { app.assets[id] = data; Almacen.guardarAsset(app.tableroId, id, data).catch(() => {}); app.colab.enviarAsset(id, data); }
  return id;
};
app.recibirAsset = (id, data) => { app.assets[id] = data; Almacen.guardarAsset(app.tableroId, id, data).catch(() => {}); vista.imgs.delete(id); vista.sucioEst = true; vista.pedir(); };
app.importarImagen = file => new Promise(res => {
  if (!file || !file.type.startsWith('image/')) return res();
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = im; const k = Math.min(1, 1400 / Math.max(w, h));
      let data = fr.result;
      if (k < 1 || file.size > 500000) {
        const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        const web = c.toDataURL('image/webp', 0.85); data = web.startsWith('data:image/webp') ? web : c.toDataURL('image/jpeg', 0.85); w = c.width; h = c.height;
      }
      app.herr.insertarImagen(data, w, h); res();
    };
    im.onerror = () => { app.aviso('No se pudo leer la imagen'); res(); };
    im.src = fr.result;
  };
  fr.readAsDataURL(file);
});
function precargar() {
  const ids = new Set(); for (const e of doc.ent.o.values()) if (e.v.tipo === 'imagen' && e.v.del === false) ids.add(e.v.img);
  return Promise.all([...ids].map(id => new Promise(ok => { if (vista.imagen(id)) return ok(); const r = vista.imgs.get(id); if (!r) return ok(); const t = setTimeout(ok, 3000); r.img.addEventListener('load', () => { clearTimeout(t); ok(); }, { once: true }); }))).catch(() => {});
}
document.querySelector('#archivoImg').addEventListener('change', async e => { for (const f of e.target.files) await app.importarImagen(f); e.target.value = ''; });
document.querySelector('#archivoJson').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (f) { app.ui.cerrar(); await app.importarJSON(f); } });

// ---------- exportar ----------
const nombreBase = () => nombreArchivo(doc.meta('titulo'));
app.exportarPNG = async () => {
  await precargar();
  const c = lienzoPagina(doc, vista.pg, dibujarPagina, id => vista.imagen(id), 2);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  descargar(`${nombreBase()}-pagina-${doc.paginas().findIndex(p => p.id === vista.pg) + 1}.png`, blob); app.aviso('PNG exportado');
};
app.exportarSVG = () => { descargar(`${nombreBase()}-pagina-${doc.paginas().findIndex(p => p.id === vista.pg) + 1}.svg`, new Blob([aSVG(doc, vista.pg, app.assets)], { type: 'image/svg+xml' })); app.aviso('SVG exportado'); };
app.exportarJSON = () => { descargar(`${nombreBase()}.pizarra.json`, new Blob([aJSON(doc, app.assets)], { type: 'application/json' })); app.aviso('Tablero exportado'); };
app.generarPDF = async () => {
  await precargar();
  const pgs = doc.paginas().map(p => { const c = lienzoPagina(doc, p.id, dibujarPagina, id => vista.imagen(id), 1.5, 2400); return { w: c.width / 1.5, h: c.height / 1.5, pw: c.width, ph: c.height, jpeg: dataURLaBytes(c.toDataURL('image/jpeg', 0.9)) }; });
  return crearPDF(pgs, doc.meta('titulo') || 'Pizarra');
};
app.exportarPDF = async () => { const pdf = await app.generarPDF(); descargar(`${nombreBase()}.pdf`, new Blob([pdf], { type: 'application/pdf' })); app.aviso('PDF exportado'); };

// ---------- colaboracion ----------
const OPTS = { juego: 'Pizarra', maxJugadores: 4, modos: [{ id: 'col', nombre: 'Colaborar' }], alIniciar: () => app.colab.alIniciarLobby() };
app.abrirLobby = () => window.Lobby && window.Lobby.abrir(OPTS);
app.colab.iniciar();

// ---------- entrada global ----------
window.addEventListener('keydown', e => { if (app.herr.teclado(e)) e.preventDefault(); });
document.addEventListener('paste', e => {
  const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  const items = [...(e.clipboardData ? e.clipboardData.items : [])];
  const im = items.filter(i => i.type.startsWith('image/'));
  if (im.length) { e.preventDefault(); im.forEach(i => app.importarImagen(i.getAsFile())); return; }
  if (app.herr.portapapeles.length) { e.preventDefault(); app.herr.pegar(); return; }
  const txt = e.clipboardData && e.clipboardData.getData('text/plain');
  if (txt && txt.trim()) { e.preventDefault(); const [x, y] = vista.mundo(vista.W / 3, vista.H / 3); app.herr.cajaTexto(x, y, 0); const ed = app.herr.editando; if (ed) { ed.ta.value = txt.slice(0, 2000); ed.ta.dispatchEvent(new Event('input')); } }
});
const escena = document.querySelector('#escena');
escena.addEventListener('dragover', e => { e.preventDefault(); });
escena.addEventListener('drop', async e => {
  e.preventDefault();
  for (const f of e.dataTransfer.files) { if (f.type.startsWith('image/')) await app.importarImagen(f); else if (/\.json$/i.test(f.name)) await app.importarJSON(f); }
});
vista.onLento = m => {
  if (!app.ajustes.autoBajar) return;
  const orden = ['ultra', 'alta', 'media', 'baja'], i = orden.indexOf(app.ajustes.calidad);
  if (m > 28 && i >= 0 && i < orden.length - 1) { app.setAjuste('calidad', orden[i + 1]); app.aviso('Rendimiento bajo: calidad ' + orden[i + 1]); vista.dts.length = 0; }
};
setInterval(() => {
  if (!app.ajustes.mostrarFps) { app.ui.fps(''); return; }
  const d = vista.dts; const m = d.length ? d.reduce((a, b) => a + b, 0) / d.length : 16.7;
  app.ui.fps(`${Math.min(60, Math.round(1000 / Math.max(m, 1)))} FPS · ${vista.nUltimo} obj`);
}, 500);
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { aplicarAjustes(app.ajustes); vista.redibujarTodo(); }); } catch (e) {}
window.addEventListener('resize', () => { vista.redimensionar(); app.ui.refrescar(); });

crearMando(app);

// ---------- arranque ----------
(async () => {
  await Almacen.purgarPapelera().catch(() => {});
  const ultimo = Almacen.ls.leer('ultimo', null);
  let ok = false;
  if (ultimo) { const m = await Almacen.meta(ultimo); if (m && !m.borrado) ok = await app.abrirTablero(ultimo); }
  if (!ok) { const l = await Almacen.listar(); if (l.length) ok = await app.abrirTablero(l[0].id); }
  if (!ok) { await app.nuevoTablero(); app.ui.mostrarBienvenida(); }
  document.body.classList.add('listo');
  if (window.Lobby && window.Lobby.hayEnlace()) window.Lobby.abrir(OPTS);
})();
window.__pizarra = app;
