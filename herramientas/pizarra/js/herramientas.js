// Herramientas de dibujo y edicion: entrada unificada (raton, tactil, lapiz, mando) -> acciones sobre el documento.
import { nuevoId } from './modelo.js';
import { aLocal, aMundo, anclaje, caja, cajaGrupo, centro, cruza, distSeg, extremos, simplificarPlano, toca, puntosTrazo, contornoTrazo, esquinas } from './geom.js';
import { reconocer } from './reconocer.js';
import { dibujarObjeto, colorReal, lineasTexto } from './dibujo.js';
import { ls } from './almacen.js';
import { COLORES_NOTA, MARCO } from './config.js';

const OPTS0 = { color: 'tinta', colorRes: '#facc15', grosor: 4, grosorRes: 22, relleno: 'ninguno', forma: 'rect', colorNota: '#fff176', borr: 'trazo', tamBorr: 20, fs: 28, capa: 'c1', conFlecha: true };
export const TECLAS0 = { pluma: 'p', resaltador: 'h', borrador: 'e', sel: 'v', mano: 'm', texto: 't', nota: 'n', forma: 'r', conector: 'c', laser: 'l', comentario: 'k', votos: 'b' };

export function crearHerramientas(app) {
  const { doc, vista } = app;
  const H = {
    herr: 'pluma', opts: { ...OPTS0, ...ls.leer('herramienta', {}) }, sel: new Set(), puntero: null, hover: null,
    espacio: false, lapizT: -1e9, portapapeles: [], pegados: 0, regla: { on: false, x: 300, y: 300, ang: 0, largo: 600 }, lasers: [], editando: null
  };
  H.opts.capa = 'c1';
  const guardarOpts = () => ls.escribir('herramienta', H.opts);
  const el = vista.cont, ptrs = new Map();
  let accion = null, gesto = null, ultimoTap = { t: 0, x: 0, y: 0 };
  const ahora = () => performance.now();
  const tol = p => (p && p.tipo === 'touch' ? 16 : 7) / vista.cam.z;
  const escala = () => Math.min(3, Math.max(0.7, 0.8 / vista.cam.z));

  // ---------- utilidades ----------
  H.puedeEditar = () => app.puedeEditar();
  const puedeCrear = () => {
    if (!app.puedeEditar()) { app.aviso('Estás en modo solo lectura'); return false; }
    if (doc.capaBloqueada(H.opts.capa)) { app.aviso('La capa activa está bloqueada'); return false; }
    return true;
  };
  H.objsSel = () => [...H.sel].map(id => doc.obj(id)).filter(Boolean);
  H.nuevo = (tipo, p) => { const id = nuevoId(10); return { k: 'o', id, p: { tipo, pg: vista.pg, del: false, x: 0, y: 0, w: 100, h: 100, rot: 0, z: doc.reloj + 1, cap: H.opts.capa, ...p } }; };
  const bloqueado = e => doc.capaBloqueada(e.v.cap) || e.v.lock || !doc.capaVisible(e.v.cap);
  H.elegible = e => !bloqueado(e);
  H.ponerSel = ids => { H.sel = new Set(ids); app.ui && app.ui.selCambio(); vista.superior(); };
  H.cambiarOpts = p => {
    Object.assign(H.opts, p); guardarOpts();
    if (H.sel.size && app.puedeEditar()) H.aplicarSel(p);
    app.ui && app.ui.refrescar(); vista.superior();
  };
  H.aplicarSel = p => {
    const cambios = [];
    for (const e of H.objsSel()) {
      const v = e.v, c = {};
      if ('color' in p) { if (v.tipo === 'nota') continue; if (['trazo', 'forma', 'texto', 'conector'].includes(v.tipo)) c.color = p.color; }
      if ('colorNota' in p && v.tipo === 'nota') c.color = p.colorNota;
      if ('relleno' in p && v.tipo === 'forma' && v.fm !== 'linea' && v.fm !== 'flecha') c.relleno = p.relleno;
      if ('grosor' in p && ['trazo', 'forma', 'conector'].includes(v.tipo)) c.grosor = v.res ? v.grosor : p.grosor;
      if ('fs' in p && (v.tipo === 'texto' || v.tipo === 'nota')) c.fs = p.fs;
      if ('op' in p) c.op = p.op;
      for (const k of ['neg', 'cur', 'al', 'rad', 'flecha', 'etq']) if (k in p && ['texto', 'nota', 'forma', 'conector', 'votos'].includes(v.tipo)) c[k] = p[k];
      if (Object.keys(c).length) cambios.push({ k: 'o', id: e.id, p: c });
    }
    if (cambios.length) { doc.cambiar(cambios); for (const e of H.objsSel()) if (e.v.tipo === 'texto') H.altoTexto(e); }
  };
  H.altoTexto = e => {
    const v = { ...e.v }, k = lineasTexto(vista.sctx, v, null), h = Math.ceil(k.lineas.length * k.fs * 1.25 + 8);
    if (Math.abs(h - e.v.h) > 0.5) doc.cambiar([{ k: 'o', id: e.id, p: { h } }]);
  };
  H.setHerr = h => {
    if (H.editando) H.cerrarEditor();
    if (accion) cancelarAccion();
    H.herr = h; if (h !== 'sel' && h !== 'texto' && h !== 'nota') { if (H.sel.size) H.ponerSel([]); }
    el.dataset.tool = h; app.ui && app.ui.refrescar(); vista.superior();
  };
  H.cursor = () => {
    const h = H.herr;
    el.style.cursor = H.espacio || h === 'mano' ? 'grab' : h === 'sel' ? 'default' : h === 'texto' ? 'text' : (h === 'borrador' ? 'none' : 'crosshair');
  };

  // ---------- seleccion: hit, cajas, manejadores ----------
  H.golpe = (wx, wy, t) => {
    const L = doc.lista(vista.pg);
    for (let i = L.length - 1; i >= 0; i--) { const e = L[i]; if (bloqueado(e)) continue; if (toca(doc, e, wx, wy, t)) return e; }
    return null;
  };
  H.golpeCaja = (wx, wy, t) => {   // objeto bajo el punto aunque este hueco (para conectores)
    const L = doc.lista(vista.pg);
    for (let i = L.length - 1; i >= 0; i--) {
      const e = L[i]; if (bloqueado(e) || e.v.tipo === 'conector' || e.v.tipo === 'trazo') continue;
      const [lx, ly] = aLocal(e.v, wx, wy); if (lx >= -t && ly >= -t && lx <= e.v.w + t && ly <= e.v.h + t) return e;
    }
    return null;
  };
  H.cajaSel = () => {
    const es = H.objsSel(); if (!es.length) return null;
    if (es.length === 1 && es[0].v.tipo !== 'conector') { const v = es[0].v; return { x: v.x, y: v.y, w: v.w, h: v.h, rot: v.rot || 0, uno: es[0] }; }
    const b = cajaGrupo(doc, es);
    return { x: b.x0, y: b.y0, w: Math.max(1, b.x1 - b.x0), h: Math.max(1, b.y1 - b.y0), rot: 0, uno: null };
  };
  const esLinea = e => e && e.v.tipo === 'forma' && (e.v.fm === 'linea' || e.v.fm === 'flecha');
  const MANGOS = [['nw', 0, 0], ['n', .5, 0], ['ne', 1, 0], ['e', 1, .5], ['se', 1, 1], ['s', .5, 1], ['sw', 0, 1], ['w', 0, .5]];
  function posMangos(B) {
    const r = [];
    if (esLinea(B.uno)) {
      const v = B.uno.v, a = v.p1 || [0, 0], b = v.p2 || [1, 1];
      r.push(['p1', ...aMundo(v, a[0] * v.w, a[1] * v.h)], ['p2', ...aMundo(v, b[0] * v.w, b[1] * v.h)]);
      return r;
    }
    for (const [n, fx, fy] of MANGOS) r.push([n, ...aMundo(B, fx * B.w, fy * B.h)]);
    const off = 34 / vista.cam.z; r.push(['rot', ...aMundo(B, B.w / 2, -off)]);
    return r;
  }
  function mangoEn(p) {
    const B = H.cajaSel(); if (!B || !app.puedeEditar()) return null;
    const r = (p.tipo === 'touch' ? 20 : 10) / vista.cam.z;
    let mejor = null, dm = r;
    for (const [n, x, y] of posMangos(B)) { const d = Math.hypot(p.wx - x, p.wy - y); if (d <= dm) { dm = d; mejor = n; } }
    return mejor ? { n: mejor, B } : null;
  }

  // ---------- creacion de objetos ----------
  H.crearForma = (fm, x0, y0, x1, y1) => {
    const lin = fm === 'linea' || fm === 'flecha';
    const c = {
      fm, x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.max(lin ? 1 : 6, Math.abs(x1 - x0)), h: Math.max(lin ? 1 : 6, Math.abs(y1 - y0)),
      color: H.opts.color, grosor: H.opts.grosor, relleno: lin ? 'ninguno' : H.opts.relleno
    };
    if (lin) { c.p1 = [x0 <= x1 ? 0 : 1, y0 <= y1 ? 0 : 1]; c.p2 = [x0 <= x1 ? 1 : 0, y0 <= y1 ? 1 : 0]; }
    return H.nuevo('forma', c);
  };
  H.crearTrazo = (flat, color, grosor, res, id) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < flat.length; i += 3) { x0 = Math.min(x0, flat[i]); y0 = Math.min(y0, flat[i + 1]); x1 = Math.max(x1, flat[i]); y1 = Math.max(y1, flat[i + 1]); }
    const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0), rel = [];
    for (let i = 0; i < flat.length; i += 3) rel.push(flat[i] - x0, flat[i + 1] - y0, flat[i + 2]);
    const c = H.nuevo('trazo', { x: x0, y: y0, w, h, bw: w, bh: h, pts: simplificarPlano(rel, 0.3 / Math.max(0.3, vista.cam.z)), color, grosor, res: !!res });
    if (id) c.id = id;
    return c;
  };
  H.nota = (wx, wy) => {
    if (!puedeCrear()) return;
    const f = escala(), w = 200 * f, h = 150 * f;
    const c = H.nuevo('nota', { x: wx - w / 2, y: wy - h / 2, w, h, color: H.opts.colorNota, texto: '', fs: 26 * Math.sqrt(f) });
    doc.abrirGrupo(); doc.cambiar([c]); H.ponerSel([c.id]); H.editar(c.id, true);
  };
  H.cajaTexto = (wx, wy, w) => {
    if (!puedeCrear()) return;
    const f = escala(), fs = H.opts.fs * f;
    const c = H.nuevo('texto', { x: wx, y: wy, w: w || 320 * f, h: fs * 1.25 + 8, texto: '', fs, color: H.opts.color, al: 'left' });
    doc.abrirGrupo(); doc.cambiar([c]); H.ponerSel([c.id]); H.editar(c.id, true);
  };
  H.comentario = (wx, wy) => {
    if (!puedeCrear()) return;
    const c = H.nuevo('comentario', { x: wx - 16, y: wy - 16, w: 32, h: 32, texto: '', autor: app.yo().nombre, color: app.yo().color, cap: 'c2', res: false });
    doc.cambiar([c]); H.ponerSel([c.id]); app.ui.abrirComentario(c.id, true);
  };
  H.votos = (wx, wy) => {
    if (!puedeCrear()) return;
    const c = H.nuevo('votos', { x: wx - 36, y: wy - 16, w: 72, h: 32, etq: '👍', color: '#fbbf24', cap: 'c2' });
    doc.cambiar([c]); H.ponerSel([c.id]);
  };
  H.votar = id => {
    const e = doc.obj(id); if (!e || !app.puedeEditar()) return;
    const campo = 'v:' + app.uid, mio = e.v[campo] || 0;
    doc.cambiar([{ k: 'o', id, p: { [campo]: mio > 0 ? 0 : 1 } }], { sinHistorial: true });
    vista.sucioEst = true; vista.pedir();
  };
  H.insertarImagen = (data, iw, ih, pos) => {
    if (!puedeCrear()) return;
    const id = app.registrarAsset(data);
    const k = Math.min(1, 520 / Math.max(iw, ih)) * Math.max(1, escala() * 0.9), w = iw * k, h = ih * k;
    const [cx, cy] = pos || vista.mundo(vista.W / 2, vista.H / 2);
    const c = H.nuevo('imagen', { x: cx - w / 2, y: cy - h / 2, w, h, img: id, iw, ih, rec: [0, 0, 1, 1] });
    doc.cambiar([c]); H.setHerr('sel'); H.ponerSel([c.id]);
  };

  // ---------- edicion de texto (textarea superpuesto) ----------
  H.editar = (id, nuevo) => {
    const e = doc.obj(id); if (!e || !['nota', 'texto'].includes(e.v.tipo) || !app.puedeEditar()) { if (nuevo) doc.cerrarGrupo(); return; }
    if (H.editando) H.cerrarEditor();
    const v = e.v, ta = document.createElement('textarea');
    ta.className = 'editor-texto ' + v.tipo; ta.setAttribute('aria-label', v.tipo === 'nota' ? 'Texto de la nota' : 'Texto'); ta.value = v.texto || ''; ta.spellcheck = true;
    vista.cont.appendChild(ta);
    const st = { id, ta, nuevo, grupo: !nuevo, timer: 0 };
    if (!nuevo) doc.abrirGrupo();
    H.editando = st;
    vista.ocultos.add(id); vista.sucioEst = true; vista.pedir();
    const colocar = () => {
      const e2 = doc.obj(id); if (!e2) return;
      const w = e2.v, z = vista.cam.z, [sx, sy] = vista.pantalla(w.x + w.w / 2, w.y + w.h / 2);
      const fs = (e2._t && e2.v.tipo === 'nota' ? e2._t.fs : w.fs || 24);
      const s = ta.style;
      s.width = w.w * z + 'px'; s.height = w.h * z + 'px'; s.left = sx - (w.w * z) / 2 + 'px'; s.top = sy - (w.h * z) / 2 + 'px';
      s.transform = `rotate(${w.rot || 0}rad)`; s.fontSize = fs * z + 'px'; s.lineHeight = '1.25';
      s.fontWeight = w.neg ? '700' : '400'; s.fontStyle = w.cur ? 'italic' : 'normal'; s.textAlign = w.al || (w.tipo === 'nota' ? 'center' : 'left');
      if (w.tipo === 'nota') { s.background = w.color || '#fff176'; s.padding = 14 * z + 'px'; s.color = '#1f2937'; s.borderRadius = 6 * z + 'px'; }
      else { s.padding = 4 * z + 'px'; s.color = colorReal(w.color, (doc.ent.p.get(vista.pg) || { v: {} }).v.fondo === 'oscuro'); }
    };
    st.colocar = colocar; colocar();
    const volcar = () => {
      const e2 = doc.obj(id); if (!e2) return;
      doc.cambiar([{ k: 'o', id, p: { texto: ta.value } }]);
      if (e2.v.tipo === 'texto') { H.altoTexto(doc.obj(id)); colocar(); }
    };
    ta.addEventListener('input', () => { clearTimeout(st.timer); st.timer = setTimeout(volcar, 200); });
    ta.addEventListener('keydown', ev => {
      ev.stopPropagation();
      if (ev.key === 'Escape' || (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey))) { ev.preventDefault(); H.cerrarEditor(); }
    });
    ta.addEventListener('blur', () => setTimeout(() => { if (H.editando === st) H.cerrarEditor(); }, 120));
    ta.addEventListener('pointerdown', ev => ev.stopPropagation());
    ta.focus();
    setTimeout(() => { ta.focus(); ta.select && nuevo && ta.setSelectionRange(ta.value.length, ta.value.length); }, 30);
  };
  H.cerrarEditor = () => {
    const st = H.editando; if (!st) return;
    H.editando = null; clearTimeout(st.timer);
    const e = doc.obj(st.id);
    if (e) {
      if (e.v.texto !== st.ta.value) doc.cambiar([{ k: 'o', id: st.id, p: { texto: st.ta.value } }]);
      if (e.v.tipo === 'texto') { if (!st.ta.value.trim()) doc.cambiar([{ k: 'o', id: st.id, p: { del: true } }]); else H.altoTexto(doc.obj(st.id)); }
    }
    st.ta.remove(); vista.ocultos.delete(st.id); vista.sucioEst = true; vista.pedir();
    doc.cerrarGrupo();
    if (e && !doc.obj(st.id)) H.ponerSel([]);
    app.ui && app.ui.refrescar();
  };

  // ---------- operaciones sobre la seleccion ----------
  H.borrarSel = () => {
    if (!app.puedeEditar()) return;
    const es = H.objsSel().filter(e => !bloqueado(e)); if (!es.length) return;
    const ids = new Set(es.map(e => e.id)), ch = [];
    for (const c of doc.lista(vista.pg)) if (c.v.tipo === 'conector' && !ids.has(c.id) && (ids.has(c.v.ea) || ids.has(c.v.eb))) {
      const [a, b] = extremos(doc, c.v);
      ch.push({ k: 'o', id: c.id, p: { pa: [a[0], a[1]], pb: [b[0], b[1]], ea: ids.has(c.v.ea) ? '' : c.v.ea, eb: ids.has(c.v.eb) ? '' : c.v.eb } });
    }
    for (const e of es) ch.push({ k: 'o', id: e.id, p: { del: true } });
    doc.cambiar(ch); H.ponerSel([]);
  };
  H.copiar = () => {
    const es = H.objsSel().filter(e => !bloqueado(e)); if (!es.length) return false;
    H.portapapeles = es.map(e => ({ id: e.id, v: JSON.parse(JSON.stringify(e.v)) })); H.pegados = 0; return true;
  };
  H.pegar = (en) => {
    if (!H.portapapeles.length || !puedeCrear()) return;
    const n = ++H.pegados, mapa = new Map(), ch = [];
    let dx = 24 * n, dy = 24 * n;
    if (en) { let x0 = Infinity, y0 = Infinity; for (const o of H.portapapeles) { if (o.v.x < x0) x0 = o.v.x; if (o.v.y < y0) y0 = o.v.y; } dx = en[0] - x0; dy = en[1] - y0; }
    for (const o of H.portapapeles) mapa.set(o.id, nuevoId(10));
    const base = doc.reloj + 1;
    H.portapapeles.forEach((o, i) => {
      const p = { ...o.v, del: false, pg: vista.pg, z: base + i };
      for (const k of Object.keys(p)) if (k.startsWith('v:') || k === 'rev') delete p[k];
      if (p.tipo === 'conector') {
        p.ea = mapa.has(p.ea) ? mapa.get(p.ea) : ''; p.eb = mapa.has(p.eb) ? mapa.get(p.eb) : '';
        p.pa = [(p.pa ? p.pa[0] : 0) + dx, (p.pa ? p.pa[1] : 0) + dy]; p.pb = [(p.pb ? p.pb[0] : 0) + dx, (p.pb ? p.pb[1] : 0) + dy];
      } else { p.x += dx; p.y += dy; }
      ch.push({ k: 'o', id: mapa.get(o.id), p });
    });
    doc.cambiar(ch); H.ponerSel([...mapa.values()]);
  };
  H.duplicar = () => { if (H.copiar()) H.pegar(); };
  H.cortar = () => { if (H.copiar()) H.borrarSel(); };
  H.todo = () => H.ponerSel(doc.lista(vista.pg).filter(e => !bloqueado(e)).map(e => e.id));
  H.orden = alFrente => {
    const es = H.objsSel(); if (!es.length || !app.puedeEditar()) return;
    const L = doc.lista(vista.pg), zs = L.map(e => e.v.z || 0);
    const base = alFrente ? Math.max(doc.reloj, ...zs) + 1 : Math.min(0, ...zs) - es.length - 1;
    doc.cambiar(es.sort((a, b) => (a.v.z || 0) - (b.v.z || 0)).map((e, i) => ({ k: 'o', id: e.id, p: { z: base + i } })));
  };
  H.mover = (dx, dy) => {
    const es = H.objsSel().filter(e => !bloqueado(e) && e.v.tipo !== 'conector'); if (!es.length || !app.puedeEditar()) return;
    doc.cambiar(es.map(e => ({ k: 'o', id: e.id, p: { x: e.v.x + dx, y: e.v.y + dy } })));
  };
  H.alinear = modo => {
    const es = H.objsSel().filter(e => !bloqueado(e) && e.v.tipo !== 'conector'); if (es.length < 2 || !app.puedeEditar()) return;
    const bs = es.map(e => caja(doc, e)), G = cajaGrupo(doc, es), ch = [];
    es.forEach((e, i) => {
      const b = bs[i], p = {};
      if (modo === 'izq') p.x = e.v.x + (G.x0 - b.x0); else if (modo === 'der') p.x = e.v.x + (G.x1 - b.x1);
      else if (modo === 'cx') p.x = e.v.x + ((G.x0 + G.x1) / 2 - (b.x0 + b.x1) / 2);
      else if (modo === 'arr') p.y = e.v.y + (G.y0 - b.y0); else if (modo === 'aba') p.y = e.v.y + (G.y1 - b.y1);
      else if (modo === 'cy') p.y = e.v.y + ((G.y0 + G.y1) / 2 - (b.y0 + b.y1) / 2);
      ch.push({ k: 'o', id: e.id, p });
    });
    doc.cambiar(ch);
  };
  H.distribuir = eje => {
    const es = H.objsSel().filter(e => !bloqueado(e) && e.v.tipo !== 'conector'); if (es.length < 3 || !app.puedeEditar()) return;
    const h = eje === 'h', it = es.map(e => ({ e, b: caja(doc, e) })).sort((a, b) => (h ? a.b.x0 + a.b.x1 - b.b.x0 - b.b.x1 : a.b.y0 + a.b.y1 - b.b.y0 - b.b.y1));
    const ini = h ? it[0].b.x0 : it[0].b.y0, fin = h ? it[it.length - 1].b.x1 : it[it.length - 1].b.y1;
    const tam = it.reduce((s, o) => s + (h ? o.b.x1 - o.b.x0 : o.b.y1 - o.b.y0), 0), hueco = (fin - ini - tam) / (it.length - 1);
    let pos = ini; const ch = [];
    for (const o of it) {
      const t = h ? o.b.x1 - o.b.x0 : o.b.y1 - o.b.y0, d = pos - (h ? o.b.x0 : o.b.y0);
      ch.push({ k: 'o', id: o.e.id, p: h ? { x: o.e.v.x + d } : { y: o.e.v.y + d } }); pos += t + hueco;
    }
    doc.cambiar(ch);
  };
  H.bloquearObjetos = b => { const es = H.objsSel(); if (es.length) doc.cambiar(es.map(e => ({ k: 'o', id: e.id, p: { lock: b } }))); if (b) H.ponerSel([]); };
  H.moverACapa = capa => { const es = H.objsSel(); if (es.length) doc.cambiar(es.map(e => ({ k: 'o', id: e.id, p: { cap: capa } }))); };

  // ---------- acciones por herramienta ----------
  const fabricas = {};

  // Lapiz y resaltador
  function trazo(res) {
    return p => {
      if (!puedeCrear()) return null;
      const o = H.opts, s = {
        res, id: nuevoId(10), pts: [], color: res ? o.colorRes : o.color, grosor: res ? o.grosorRes : o.grosor,
        sm: [p.wx, p.wy], prPrev: p.pen ? p.pr : 0.55, ultimo: [p.wx, p.wy], t: p.t, sx: p.x, sy: p.y, ancla: [p.x, p.y], tAncla: p.t, reconocida: null, pred: null, tVivo: 0, enviados: 0, regla: null, timer: 0
      };
      if (H.regla.on && !res) s.regla = reglaAjuste(p.wx, p.wy);
      let [x, y] = s.regla ? proyectar(s.regla, p.wx, p.wy) : [p.wx, p.wy];
      s.pts.push(x, y, s.prPrev);
      const mover = (q, lista) => {
        for (const c of lista) {
          const dt = Math.max(1, c.t - s.t); s.t = c.t;
          let [wx, wy] = [c.wx, c.wy];
          if (s.regla) [wx, wy] = proyectar(s.regla, wx, wy);
          else { const k = Math.min(0.9, app.ajustes.suavizado); s.sm = [s.sm[0] + (wx - s.sm[0]) * (1 - k), s.sm[1] + (wy - s.sm[1]) * (1 - k)]; [wx, wy] = s.sm; }
          const z = vista.cam.z, dpx = Math.hypot(wx - s.ultimo[0], wy - s.ultimo[1]) * z;
          if (dpx < 0.8) continue;
          let pr;
          if (c.pen) pr = c.pr; else if (res || !app.ajustes.presionSim) pr = 0.6;
          else { const v = dpx / dt; pr = Math.max(0.25, 1 - Math.min(0.75, v * 0.42)); }
          s.prPrev += (pr - s.prPrev) * (c.pen ? 1 : 0.22);
          s.pts.push(wx, wy, Math.round(s.prPrev * 100) / 100); s.ultimo = [wx, wy];
          if (Math.hypot(c.x - s.ancla[0], c.y - s.ancla[1]) > 4) { s.ancla = [c.x, c.y]; s.tAncla = c.t; }
          if (s.reconocida && Math.hypot(c.x - s.refPos[0], c.y - s.refPos[1]) > 18) s.reconocida = null;
        }
        const ult = lista[lista.length - 1];
        s.pred = null;
        if (ult && ult.pred && !s.regla) s.pred = ult.pred.map(([a, b]) => [a, b, s.prPrev]);
        clearTimeout(s.timer);
        if (!res && app.ajustes.formas && s.pts.length > 12) s.timer = setTimeout(() => sostener(s, q), 620);
        const n = ahora(); if (n - s.tVivo > 45) { s.tVivo = n; app.colab && app.colab.vivo(s, false); }
        vista.superior();
      };
      const arriba = () => {
        clearTimeout(s.timer);
        const raw = s.pts;
        if (s.reconocida) { const f = s.reconocida; crearReconocida(f); }
        else if (raw.length >= 3) doc.cambiar([H.crearTrazo(raw, s.color, s.grosor, res, s.id)]);
        app.colab && app.colab.vivo(s, true);
        accionVivo = null; vista.superior();
      };
      accionVivo = s;
      return { mover, arriba, cancelar: () => { clearTimeout(s.timer); accionVivo = null; app.colab && app.colab.vivo(s, true); vista.superior(); } };
    };
  }
  let accionVivo = null;
  function sostener(s, q) {
    if (accionVivo !== s) return;
    const P = []; for (let i = 0; i < s.pts.length; i += 3) P.push([s.pts[i], s.pts[i + 1]]);
    const f = reconocer(P);
    if (f) { s.reconocida = f; s.refPos = [...s.ancla]; app.colab && app.colab.vivo(s, false); vista.superior(); try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} }
  }
  function crearReconocida(f) {
    const o = H.opts;
    let c;
    if (f.fm === 'linea' || f.fm === 'flecha') c = H.crearForma(f.fm, f.x1, f.y1, f.x2, f.y2);
    else c = H.crearForma(f.fm, f.x, f.y, f.x + f.w, f.y + f.h);
    c.p.relleno = 'ninguno';
    doc.cambiar([c]);
  }
  function reglaAjuste(x, y) {
    const r = H.regla, c = Math.cos(r.ang), s = Math.sin(r.ang), dx = x - r.x, dy = y - r.y;
    const u = dx * c + dy * s, v = -dx * s + dy * c;
    if (u >= -20 && u <= r.largo + 20 && Math.abs(v) <= 26 / vista.cam.z) return { c, s, y0: v >= 0 ? 0 : 0, lado: v >= 0 ? 1 : -1 };
    return null;
  }
  function proyectar(g, x, y) {
    const r = H.regla, dx = x - r.x, dy = y - r.y, u = dx * g.c + dy * g.s;
    return [r.x + u * g.c, r.y + u * g.s];
  }

  fabricas.pluma = trazo(false); fabricas.resaltador = trazo(true);

  // Borrador
  fabricas.borrador = p => {
    if (!app.puedeEditar()) return null;
    const area = H.opts.borr === 'area';
    doc.abrirGrupo();
    let ultimo = null;
    const r = () => H.opts.tamBorr / vista.cam.z;
    const pasar = (wx, wy) => {
      const R = r(), ch = [], borrar = [];
      const caja0 = { x0: wx - R, y0: wy - R, x1: wx + R, y1: wy + R };
      for (const e of doc.lista(vista.pg)) {
        if (bloqueado(e) || !cruza(caja(doc, e), caja0)) continue;
        if (area && e.v.tipo === 'trazo') {
          const piezas = partirTrazo(e, wx, wy, R);
          if (piezas) { ch.push({ k: 'o', id: e.id, p: { del: true } }); for (const q of piezas) ch.push(q); }
        } else if (toca(doc, e, wx, wy, R)) borrar.push(e);
      }
      for (const e of borrar) ch.push({ k: 'o', id: e.id, p: { del: true } });
      if (ch.length) doc.cambiar(ch);
    };
    pasar(p.wx, p.wy); ultimo = [p.wx, p.wy];
    return {
      mover: (q, lista) => {
        for (const c of lista) {
          const d = Math.hypot(c.wx - ultimo[0], c.wy - ultimo[1]), paso = Math.max(1, r() * 0.6), n = Math.ceil(d / paso);
          for (let i = 1; i <= n; i++) pasar(ultimo[0] + ((c.wx - ultimo[0]) * i) / n, ultimo[1] + ((c.wy - ultimo[1]) * i) / n);
          ultimo = [c.wx, c.wy];
        }
        vista.superior();
      },
      arriba: () => { doc.cerrarGrupo(); }, cancelar: () => { doc.cerrarGrupo(); }
    };
  };
  function partirTrazo(e, cx, cy, R) {
    const v = e.v, P = puntosTrazo(v).map(([lx, ly, pr]) => [...aMundo(v, lx, ly), pr]);
    const lim = R + (v.grosor || 4) / 2, paso = Math.max(1, lim * 0.5);
    const D = [];
    for (let i = 0; i < P.length; i++) {
      D.push(P[i]);
      if (i + 1 < P.length) {
        const a = P[i], b = P[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(d / paso);
        for (let k = 1; k < n; k++) D.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, a[2] + ((b[2] - a[2]) * k) / n]);
      }
    }
    const runs = []; let cur = [], quitado = false;
    for (const q of D) {
      if (Math.hypot(q[0] - cx, q[1] - cy) <= lim) { quitado = true; if (cur.length) runs.push(cur); cur = []; } else cur.push(q);
    }
    if (cur.length) runs.push(cur);
    if (!quitado) return null;
    const out = [];
    for (const run of runs) {
      if (run.length < 2 && !(D.length < 3)) continue;
      const flat = []; for (const q of run) flat.push(q[0], q[1], q[2]);
      const c = H.crearTrazo(flat, v.color, v.grosor, v.res); c.p.cap = v.cap; c.p.z = v.z || c.p.z; out.push(c);
    }
    return out;
  }

  // Laser temporal
  fabricas.laser = p => {
    const s = { pts: [[p.wx, p.wy, ahora()]], color: app.yo().color };
    H.lasers.push(s);
    return {
      mover: (q, lista) => { for (const c of lista) s.pts.push([c.wx, c.wy, ahora()]); app.colab && app.colab.laser(s); vista.animar(40); },
      arriba: () => { s.fin = ahora(); vista.animar(60); }, cancelar: () => { s.fin = ahora(); }
    };
  };

  // Mano (desplazar)
  fabricas.mano = p => {
    let ult = [p.x, p.y];
    el.classList.add('arrastrando');
    return { mover: (q, lista) => { const c = lista[lista.length - 1]; vista.mover(c.x - ult[0], c.y - ult[1]); ult = [c.x, c.y]; }, arriba: () => el.classList.remove('arrastrando'), cancelar: () => el.classList.remove('arrastrando') };
  };

  // Formas
  fabricas.forma = p => {
    if (!puedeCrear()) return null;
    const fm = H.opts.forma, a = [p.wx, p.wy]; let b = a, prev = null;
    const calc = (c, shift, alt) => {
      let [x1, y1] = [c.wx, c.wy], [x0, y0] = a;
      if (app.ajustes.imantar && !shift) { x1 = Math.round(x1 / 20) * 20; y1 = Math.round(y1 / 20) * 20; x0 = Math.round(x0 / 20) * 20; y0 = Math.round(y0 / 20) * 20; }
      if (shift) { const lin = fm === 'linea' || fm === 'flecha'; if (lin) { const ang = Math.round(Math.atan2(y1 - y0, x1 - x0) / (Math.PI / 4)) * (Math.PI / 4), d = Math.hypot(x1 - x0, y1 - y0); x1 = x0 + d * Math.cos(ang); y1 = y0 + d * Math.sin(ang); } else { const m = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); x1 = x0 + Math.sign(x1 - x0 || 1) * m; y1 = y0 + Math.sign(y1 - y0 || 1) * m; } }
      if (alt && fm !== 'linea' && fm !== 'flecha') { x0 = a[0] - (x1 - a[0]); y0 = a[1] - (y1 - a[1]); }
      return [x0, y0, x1, y1];
    };
    return {
      mover: (q, lista) => { const c = lista[lista.length - 1]; b = calc(c, q.shift, q.alt); prev = b; H.previa = { fm, c: b }; vista.superior(); },
      arriba: q => {
        H.previa = null;
        if (!prev || Math.hypot(prev[2] - prev[0], prev[3] - prev[1]) < 6) {   // un toque: forma de tamano estandar
          const f = escala(), w = (fm === 'linea' || fm === 'flecha' ? 200 : 180) * f, h = (fm === 'linea' || fm === 'flecha' ? 0 : 120) * f;
          prev = [a[0] - w / 2, a[1] - h / 2, a[0] + w / 2, a[1] + h / 2 + (h ? 0 : 0.0)];
          if (fm === 'linea' || fm === 'flecha') { prev[1] = prev[3] = a[1]; }
        }
        const c = H.crearForma(fm, ...prev); doc.cambiar([c]); H.ponerSel([c.id]); H.setHerr('sel'); H.ponerSel([c.id]);
      },
      cancelar: () => { H.previa = null; vista.superior(); }
    };
  };

  // Conectores
  fabricas.conector = p => {
    if (!puedeCrear()) return null;
    const ini = H.golpeCaja(p.wx, p.wy, tol(p)), a = [p.wx, p.wy];
    let fin = null, b = a;
    return {
      mover: (q, lista) => { const c = lista[lista.length - 1]; b = [c.wx, c.wy]; const o = H.golpeCaja(c.wx, c.wy, tol(c)); fin = o && o !== ini && o.v.tipo !== 'conector' ? o : null; H.previa = { conector: true, a, b, ini, fin }; vista.superior(); },
      arriba: () => {
        H.previa = null;
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) * vista.cam.z > 14) {
          const ea = ini && ini.v.tipo !== 'conector' ? ini : null;
          const c = H.nuevo('conector', { ea: ea ? ea.id : '', eb: fin ? fin.id : '', pa: a, pb: b, flecha: H.opts.conFlecha, color: H.opts.color, grosor: Math.max(2, H.opts.grosor), x: 0, y: 0, w: 1, h: 1 });
          doc.cambiar([c]); H.ponerSel([c.id]);
        }
        vista.superior();
      },
      cancelar: () => { H.previa = null; vista.superior(); }
    };
  };

  // Seleccion, mover, escalar, rotar
  fabricas.sel = p => {
    const m = mangoEn(p);
    if (m) return transformar(m, p);
    const o = H.golpe(p.wx, p.wy, tol(p));
    if (o) {
      if (p.shift) { const s = new Set(H.sel); s.has(o.id) ? s.delete(o.id) : s.add(o.id); H.ponerSel(s); if (!s.has(o.id)) return null; }
      else if (!H.sel.has(o.id)) H.ponerSel([o.id]);
      return arrastrar(p, o);
    }
    // marco de seleccion
    const a = [p.wx, p.wy], base = p.shift ? new Set(H.sel) : new Set(); if (!p.shift) H.ponerSel([]);
    return {
      mover: (q, lista) => {
        const c = lista[lista.length - 1], r = { x0: Math.min(a[0], c.wx), y0: Math.min(a[1], c.wy), x1: Math.max(a[0], c.wx), y1: Math.max(a[1], c.wy) };
        H.marco = r; const s = new Set(base);
        for (const e of doc.lista(vista.pg)) if (!bloqueado(e) && cruza(caja(doc, e), r)) s.add(e.id);
        H.sel = s; app.ui.selCambio(); vista.superior();
      },
      arriba: () => { H.marco = null; vista.superior(); }, cancelar: () => { H.marco = null; vista.superior(); }
    };
  };
  function arrastrar(p, o) {
    if (!app.puedeEditar()) return { mover() {}, arriba: () => clickSimple(o, p), cancelar() {} };
    let es = H.objsSel().filter(e => !bloqueado(e) && e.v.tipo !== 'conector');
    let movido = false, ini = null, dup = false;
    const snap = new Map();
    const iniciar = () => {
      ini = true; doc.abrirGrupo();
      if (p.alt && !dup) {   // alt+arrastrar: duplica
        dup = true; H.copiar(); H.pegados = 0; const cur = H.portapapeles; H.pegar([Math.min(...cur.map(c => c.v.x)), Math.min(...cur.map(c => c.v.y))]);
        es = H.objsSel().filter(e => e.v.tipo !== 'conector');
      }
      for (const e of es) snap.set(e.id, { x: e.v.x, y: e.v.y });
      vista.ocultos = new Set(es.map(e => e.id)); vista.sucioEst = true; vista.pedir();
    };
    return {
      mover: (q, lista) => {
        const c = lista[lista.length - 1];
        if (!ini) { if (Math.hypot(c.x - p.x, c.y - p.y) < (p.tipo === 'touch' ? 8 : 4)) return; iniciar(); }
        movido = true;
        let dx = c.wx - p.wx, dy = c.wy - p.wy;
        if (q.shift) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
        const ch = [];
        for (const e of es) {
          const s = snap.get(e.id); if (!s) continue;
          let nx = s.x + dx, ny = s.y + dy;
          if (app.ajustes.imantar && !q.shift) { nx = Math.round(nx / 20) * 20; ny = Math.round(ny / 20) * 20; }
          ch.push({ k: 'o', id: e.id, p: { x: nx, y: ny } });
        }
        doc.cambiar(ch); vista.superior();
      },
      arriba: () => {
        if (ini) { doc.cerrarGrupo(); vista.ocultos = new Set(); vista.sucioEst = true; vista.pedir(); }
        if (!movido) clickSimple(o, p);
        app.ui.refrescar();
      },
      cancelar: () => { if (ini) { doc.cerrarGrupo(); doc.deshacer(); vista.ocultos = new Set(); vista.sucioEst = true; vista.pedir(); } }
    };
  }
  function clickSimple(o, p) {
    const ahoraT = ahora();
    const dbl = ahoraT - ultimoTap.t < 380 && Math.hypot(p.x - ultimoTap.x, p.y - ultimoTap.y) < 14;
    ultimoTap = { t: ahoraT, x: p.x, y: p.y };
    if (o.v.tipo === 'comentario') { app.ui.abrirComentario(o.id, false); return; }
    if (o.v.tipo === 'votos' && H.herr === 'votos') H.votar(o.id);
    if (dbl && ['nota', 'texto'].includes(o.v.tipo)) { H.ponerSel([o.id]); H.editar(o.id, false); }
    else if (dbl && o.v.tipo === 'votos') H.votar(o.id);
  }
  function transformar(m, p) {
    doc.abrirGrupo();
    const B0 = { ...m.B }, es = H.objsSel().filter(e => !bloqueado(e) && e.v.tipo !== 'conector');
    const snap = new Map(es.map(e => [e.id, { x: e.v.x, y: e.v.y, w: e.v.w, h: e.v.h, rot: e.v.rot || 0, p1: e.v.p1, p2: e.v.p2 }]));
    const uno = B0.uno;
    vista.ocultos = new Set(es.map(e => e.id)); vista.sucioEst = true; vista.pedir();
    const ctr = [B0.x + B0.w / 2, B0.y + B0.h / 2];
    return {
      mover: (q, lista) => {
        const c = lista[lista.length - 1], ch = [];
        if (m.n === 'rot') {
          let ang = Math.atan2(c.wy - ctr[1], c.wx - ctr[0]) + Math.PI / 2;
          const base = B0.rot, k = Math.PI / 12, tt = Math.round(ang / k) * k;
          if (q.shift || Math.abs(ang - tt) < 0.05) ang = tt;
          const d = ang - base;
          for (const e of es) {
            const s = snap.get(e.id);
            const ecx = s.x + s.w / 2, ecy = s.y + s.h / 2, co = Math.cos(d), si = Math.sin(d), rx = ecx - ctr[0], ry = ecy - ctr[1];
            const ncx = ctr[0] + rx * co - ry * si, ncy = ctr[1] + rx * si + ry * co;
            ch.push({ k: 'o', id: e.id, p: { x: ncx - s.w / 2, y: ncy - s.h / 2, rot: s.rot + d } });
          }
        } else if (m.n === 'p1' || m.n === 'p2') {
          const e = uno, v = snap.get(e.id), ev = { ...e.v, ...v };
          const a = ev.p1 || [0, 0], b = ev.p2 || [1, 1];
          let P1 = aMundo(ev, a[0] * ev.w, a[1] * ev.h), P2 = aMundo(ev, b[0] * ev.w, b[1] * ev.h);
          let tgt = [c.wx, c.wy];
          const otro = m.n === 'p1' ? P2 : P1;
          if (q.shift) { const ang = Math.round(Math.atan2(tgt[1] - otro[1], tgt[0] - otro[0]) / (Math.PI / 4)) * (Math.PI / 4), d = Math.hypot(tgt[0] - otro[0], tgt[1] - otro[1]); tgt = [otro[0] + d * Math.cos(ang), otro[1] + d * Math.sin(ang)]; }
          if (m.n === 'p1') P1 = tgt; else P2 = tgt;
          ch.push({ k: 'o', id: e.id, p: { x: Math.min(P1[0], P2[0]), y: Math.min(P1[1], P2[1]), w: Math.max(1, Math.abs(P2[0] - P1[0])), h: Math.max(1, Math.abs(P2[1] - P1[1])), rot: 0, p1: [P1[0] <= P2[0] ? 0 : 1, P1[1] <= P2[1] ? 0 : 1], p2: [P2[0] <= P1[0] ? 0 : 1, P2[1] <= P1[1] ? 0 : 1] } });
        } else {
          const fx = m.n.includes('e') ? 1 : m.n.includes('w') ? 0 : null, fy = m.n.includes('s') ? 1 : m.n.includes('n') ? 0 : null;
          const ax = fx === null ? 0.5 : 1 - fx, ay = fy === null ? 0.5 : 1 - fy;
          const [lx, ly] = aLocal(B0, c.wx, c.wy);
          let nw = fx === null ? B0.w : (fx === 1 ? lx - ax * B0.w : ax * B0.w - lx), nh = fy === null ? B0.h : (fy === 1 ? ly - ay * B0.h : ay * B0.h - ly);
          nw = Math.max(8, nw); nh = Math.max(8, nh);
          const ratio = (uno && uno.v.tipo === 'imagen' && fx !== null && fy !== null) || (q.shift && fx !== null && fy !== null);
          if (ratio) { const k = Math.max(nw / B0.w, nh / B0.h); nw = B0.w * k; nh = B0.h * k; }
          if (uno && uno.v.tipo === 'texto') nh = B0.h;
          const sx = nw / B0.w, sy = nh / B0.h;
          const dxL = fx === null ? 0 : (fx === 1 ? 1 : -1) * (nw - B0.w) / 2 , dyL = fy === null ? 0 : (fy === 1 ? 1 : -1) * (nh - B0.h) / 2;
          // nuevo centro de la caja: el ancla se mantiene fija
          const co = Math.cos(B0.rot), si = Math.sin(B0.rot);
          const nc = [ctr[0] + dxL * co - dyL * si, ctr[1] + dxL * si + dyL * co];
          const NB = { x: nc[0] - nw / 2, y: nc[1] - nh / 2, w: nw, h: nh };
          for (const e of es) {
            const s = snap.get(e.id);
            if (uno) ch.push({ k: 'o', id: e.id, p: { x: NB.x, y: NB.y, w: NB.w, h: NB.h } });
            else ch.push({ k: 'o', id: e.id, p: { x: NB.x + ((s.x - B0.x) / B0.w) * NB.w, y: NB.y + ((s.y - B0.y) / B0.h) * NB.h, w: s.w * sx, h: s.h * sy } });
          }
        }
        doc.cambiar(ch);
        for (const e of es) if (e.v.tipo === 'texto') { const v2 = doc.obj(e.id); if (v2) H.altoTexto(v2); }
        vista.superior();
      },
      arriba: () => { doc.cerrarGrupo(); vista.ocultos = new Set(); vista.sucioEst = true; vista.pedir(); app.ui.refrescar(); },
      cancelar: () => { doc.cerrarGrupo(); vista.ocultos = new Set(); vista.sucioEst = true; vista.pedir(); }
    };
  }

  // Click para notas, texto, comentarios, votos
  const colocar = (fn) => p => {
    return { mover() {}, arriba: q => { fn(q.wx, q.wy); }, cancelar() {} };
  };
  fabricas.nota = p => {
    const o = H.golpe(p.wx, p.wy, tol(p));
    if (o && o.v.tipo === 'nota') { H.ponerSel([o.id]); return { mover() {}, arriba: () => H.editar(o.id, false), cancelar() {} }; }
    return colocar((x, y) => H.nota(x, y))(p);
  };
  fabricas.texto = p => {
    const o = H.golpe(p.wx, p.wy, tol(p));
    if (o && (o.v.tipo === 'texto' || o.v.tipo === 'nota')) { H.ponerSel([o.id]); return { mover() {}, arriba: () => H.editar(o.id, false), cancelar() {} }; }
    const a = [p.wx, p.wy]; let w = 0;
    return { mover: (q, l) => { w = Math.abs(l[l.length - 1].wx - a[0]); H.previa = { caja: true, x: a[0], y: a[1], w, h: 30 / vista.cam.z }; vista.superior(); }, arriba: () => { H.previa = null; H.cajaTexto(a[0], a[1], w > 40 / vista.cam.z ? w : 0); }, cancelar: () => { H.previa = null; } };
  };
  fabricas.comentario = p => colocar((x, y) => H.comentario(x, y))(p);
  fabricas.votos = p => {
    const o = H.golpe(p.wx, p.wy, tol(p));
    if (o && o.v.tipo === 'votos') return { mover() {}, arriba: () => H.votar(o.id), cancelar() {} };
    return colocar((x, y) => H.votos(x, y))(p);
  };

  // ---------- regla ----------
  function reglaToca(p) {
    if (!H.regla.on) return null;
    const r = H.regla, c = Math.cos(r.ang), s = Math.sin(r.ang), dx = p.wx - r.x, dy = p.wy - r.y, u = dx * c + dy * s, v = -dx * s + dy * c;
    const z = vista.cam.z, ancho = 54 / z;
    if (Math.hypot(p.wx - (r.x + c * r.largo), p.wy - (r.y + s * r.largo)) < 22 / z) return 'rot';
    if (u >= 0 && u <= r.largo && v >= 0 && v <= ancho && p.wy !== undefined) return 'mover';
    return null;
  }
  function accionRegla(modo, p) {
    const r = H.regla, o = { x: r.x, y: r.y };
    return {
      mover: (q, lista) => {
        const c = lista[lista.length - 1];
        if (modo === 'mover') { r.x = o.x + (c.wx - p.wx); r.y = o.y + (c.wy - p.wy); }
        else { r.ang = Math.atan2(c.wy - r.y, c.wx - r.x); r.largo = Math.max(150, Math.hypot(c.wx - r.x, c.wy - r.y)); const a = Math.round(r.ang / (Math.PI / 12)) * (Math.PI / 12); if (Math.abs(a - r.ang) < 0.04) r.ang = a; }
        vista.superior();
      }, arriba() {}, cancelar() {}
    };
  }

  // ---------- entrada de punteros ----------
  function iniciarAccion(p) {
    if (H.editando) { H.cerrarEditor(); return; }
    const rg = reglaToca(p);
    if (rg && !(p.tipo === 'touch' && accion)) { accion = accionRegla(rg, p); return; }
    let herr = H.herr;
    if (p.mano || H.espacio || p.button === 1 || p.button === 2) herr = 'mano';
    else if (p.tipo === 'pen' && p.boton2 && herr !== 'borrador') herr = 'borrador';
    if (!app.puedeEditar() && !['mano', 'laser', 'sel'].includes(herr)) { if (herr !== 'mano') { app.aviso('Estás en modo solo lectura'); } herr = 'mano'; }
    if (!app.puedeEditar() && herr === 'sel') herr = 'mano';
    if (p.forzar) herr = p.forzar;
    if (p.cmd) herr = p.cmd;
    accion = (fabricas[herr] || fabricas.mano)(p);
    if (accion) accion.herr = herr;
    if (herr === 'borrador') H.cursorBorr = true;
  }
  function cancelarAccion() { if (accion) { try { accion.cancelar && accion.cancelar(); } catch (e) { console.error(e); } accion = null; } }

  H.abajo = p => {
    p.t = p.t || ahora();
    const [wx, wy] = vista.mundo(p.x, p.y); p.wx = wx; p.wy = wy;
    ptrs.set(p.id, { ...p });
    if (p.tipo === 'pen') H.lapizT = ahora();
    if (p.tipo === 'touch') {
      if (app.ajustes.palma && (p.ancho >= 48 || p.alto >= 48)) { ptrs.delete(p.id); return; }
      if (app.ajustes.palma && ahora() - H.lapizT < 25000) p.mano = true;
      const toques = [...ptrs.values()].filter(q => q.tipo === 'touch');
      if (toques.length >= 2) { cancelarAccion(); iniciarGesto(toques); return; }
    }
    if (gesto) return;
    iniciarAccion(p);
    accion && (accion.ptr = p.id);
  };
  H.mover = (p, lista) => {
    const q = ptrs.get(p.id);
    if (!q) { H.hover = p; actualizarHover(p); return; }
    Object.assign(q, { x: p.x, y: p.y, shift: p.shift, alt: p.alt });
    if (gesto) { actualizarGesto(); return; }
    if (accion && accion.ptr === p.id && accion.mover) {
      const l = (lista || [p]).map(c => { const [wx, wy] = vista.mundo(c.x, c.y); return { ...c, wx, wy, t: c.t || ahora() }; });
      const ult = l[l.length - 1]; ult.pred = p.pred ? p.pred.map(c => vista.mundo(c.x, c.y)) : null;
      accion.mover({ shift: p.shift, alt: p.alt, ctrl: p.ctrl }, l);
    }
  };
  H.arriba = p => {
    const q = ptrs.get(p.id); if (!q) return;
    ptrs.delete(p.id);
    if (gesto) { if ([...ptrs.values()].filter(x => x.tipo === 'touch').length < 2) { gesto = null; vista.camCambio(); } return; }
    if (accion && accion.ptr === p.id) {
      const [wx, wy] = vista.mundo(p.x, p.y);
      try { accion.arriba && accion.arriba({ ...p, wx, wy, shift: q.shift, alt: q.alt }); } catch (e) { console.error(e); }
      accion = null; H.cursorBorr = false; vista.superior();
    }
    if (p.tipo !== 'touch') actualizarHover(p);
  };
  function actualizarHover(p) {
    H.hover = p;
    if (H.herr === 'borrador' || H.herr === 'laser' || app.colab) {
      if (app.colab) { const [wx, wy] = vista.mundo(p.x, p.y); app.colab.cursor(wx, wy); }
      vista.superior();
    }
  }
  function iniciarGesto(toques) {
    const [a, b] = toques; gesto = { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
  }
  function actualizarGesto() {
    const t = [...ptrs.values()].filter(q => q.tipo === 'touch'); if (t.length < 2) return;
    const [a, b] = t, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    vista.mover(cx - gesto.cx, cy - gesto.cy); vista.zoomEn(cx, cy, d / gesto.d);
    gesto = { cx, cy, d };
  }

  function pDesdeEvento(e) {
    const r = el.getBoundingClientRect();
    return { id: e.pointerId, tipo: e.pointerType === 'mouse' || e.pointerType === 'pen' || e.pointerType === 'touch' ? e.pointerType : 'mouse', x: e.clientX - r.left, y: e.clientY - r.top, pr: e.pressure, pen: e.pointerType === 'pen' && e.pressure > 0 && e.pressure !== 0.5, shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey || e.metaKey, button: e.button, boton2: (e.buttons & 32) !== 0, ancho: e.width, alto: e.height, t: e.timeStamp || ahora() };
  }
  el.addEventListener('pointerdown', e => {
    if (e.target.closest('.editor-texto')) return;
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1 && e.button !== 2) return;
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (x) {}
    if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
    H.abajo(pDesdeEvento(e));
  });
  el.addEventListener('pointermove', e => {
    const p = pDesdeEvento(e);
    let lista = null;
    if (ptrs.has(e.pointerId) && e.getCoalescedEvents) {
      const cs = e.getCoalescedEvents();
      if (cs && cs.length > 1) lista = cs.map(c => ({ ...pDesdeEvento(c), t: c.timeStamp }));
      if (p.pen !== false && e.getPredictedEvents && app.ajustes.prediccion) { const pe = e.getPredictedEvents(); if (pe && pe.length) p.pred = pe.slice(0, 2).map(c => ({ x: c.clientX - el.getBoundingClientRect().left, y: c.clientY - el.getBoundingClientRect().top })); }
    }
    H.mover(p, lista);
  });
  const fin = e => { H.arriba(pDesdeEvento(e)); };
  el.addEventListener('pointerup', fin);
  el.addEventListener('pointercancel', e => { const q = ptrs.get(e.pointerId); if (q) { if (accion && accion.ptr === e.pointerId) cancelarAccion(); ptrs.delete(e.pointerId); if (gesto && [...ptrs.values()].filter(x => x.tipo === 'touch').length < 2) gesto = null; } });
  el.addEventListener('pointerleave', e => { if (!ptrs.has(e.pointerId)) { H.hover = null; if (app.colab) app.colab.cursor(null); vista.superior(); } });
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('dblclick', e => {
    if (H.herr !== 'sel' || e.target.closest('.editor-texto')) return;
    const r = el.getBoundingClientRect(), [wx, wy] = vista.mundo(e.clientX - r.left, e.clientY - r.top), o = H.golpe(wx, wy, 6 / vista.cam.z);
    if (o && ['nota', 'texto'].includes(o.v.tipo)) { H.ponerSel([o.id]); H.editar(o.id, false); }
  });
  el.addEventListener('wheel', e => {
    e.preventDefault();
    const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let dx = e.deltaX, dy = e.deltaY;
    if (e.deltaMode === 1) { dx *= 32; dy *= 32; }
    if (e.ctrlKey || e.metaKey) vista.zoomEn(x, y, Math.exp(-dy * 0.01));
    else if (app.ajustes.rueda === 'zoom' && !e.shiftKey && (Number.isInteger(dy) && Math.abs(dy) >= 40 || e.deltaMode === 1) && !dx) vista.zoomEn(x, y, Math.exp(-dy * 0.0014));
    else if (e.shiftKey && !dx) vista.mover(-dy, 0);
    else vista.mover(-dx, -dy);
    if (H.editando) H.editando.colocar();
  }, { passive: false });
  vista.alMoverCamara = () => { if (H.editando) H.editando.colocar(); };

  // ---------- pintado de la capa superior ----------
  vista.capasSup.push((ctx, v) => {
    // objetos arrastrados (fuera de la cache)
    if (v.ocultos.size) {
      ctx.save(); v.aplicar(ctx);
      const cx = v._cx();
      for (const id of v.ocultos) { if (H.editando && H.editando.id === id) continue; const e = doc.obj(id); if (e && e.v.pg === v.pg) dibujarObjeto(ctx, doc, e, cx); }
      ctx.restore();
    }
    ctx.save(); v.aplicar(ctx);
    if (accionVivo) pintarVivo(ctx, accionVivo);
    pintarPrevia(ctx);
    pintarRegla(ctx);
    ctx.restore();
    pintarSeleccion(ctx, v);
    pintarLaseres(ctx, v);
    if (H.hover && H.herr === 'borrador' && !ptrs.size || H.cursorBorr) pintarBorrador(ctx);
  });
  function pintarVivo(ctx, s) {
    const P = []; for (let i = 0; i < s.pts.length; i += 3) P.push([s.pts[i], s.pts[i + 1], s.pts[i + 2]]);
    if (s.pred) P.push(...s.pred);
    if (s.reconocida) { ctx.globalAlpha = 0.9; dibujarForma(ctx, s.reconocida, s.color, s.grosor); return; }
    ctx.fillStyle = colorReal(s.color, (doc.ent.p.get(vista.pg) || { v: {} }).v.fondo === 'oscuro');
    if (s.res) ctx.globalAlpha = 0.38;
    ctx.fill(new Path2D(contornoTrazo(P, s.grosor, s.res)));
  }
  function dibujarForma(ctx, f, color, g) {
    ctx.strokeStyle = colorReal(color, (doc.ent.p.get(vista.pg) || { v: {} }).v.fondo === 'oscuro'); ctx.lineWidth = g; ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath();
    if (f.fm === 'linea' || f.fm === 'flecha') {
      ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      if (f.fm === 'flecha') { const a = Math.atan2(f.y2 - f.y1, f.x2 - f.x1), t = 10 + g * 2.2; ctx.beginPath(); ctx.moveTo(f.x2 - t * Math.cos(a - .45), f.y2 - t * Math.sin(a - .45)); ctx.lineTo(f.x2, f.y2); ctx.lineTo(f.x2 - t * Math.cos(a + .45), f.y2 - t * Math.sin(a + .45)); ctx.stroke(); }
      return;
    }
    if (f.fm === 'elipse') ctx.ellipse(f.x + f.w / 2, f.y + f.h / 2, f.w / 2, f.h / 2, 0, 0, 6.2832);
    else if (f.fm === 'rect') ctx.rect(f.x, f.y, f.w, f.h);
    else if (f.fm === 'tri') { ctx.moveTo(f.x + f.w / 2, f.y); ctx.lineTo(f.x + f.w, f.y + f.h); ctx.lineTo(f.x, f.y + f.h); ctx.closePath(); }
    else if (f.fm === 'rombo') { ctx.moveTo(f.x + f.w / 2, f.y); ctx.lineTo(f.x + f.w, f.y + f.h / 2); ctx.lineTo(f.x + f.w / 2, f.y + f.h); ctx.lineTo(f.x, f.y + f.h / 2); ctx.closePath(); }
    ctx.stroke();
  }
  function pintarPrevia(ctx) {
    const pv = H.previa; if (!pv) return;
    ctx.save(); ctx.globalAlpha = 0.85;
    if (pv.conector) {
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3 / vista.cam.z; ctx.setLineDash([8 / vista.cam.z, 6 / vista.cam.z]);
      const a = pv.ini ? anclaje(pv.ini.v, pv.b[0], pv.b[1]) : pv.a, b = pv.fin ? anclaje(pv.fin.v, a[0], a[1]) : pv.b;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      for (const o of [pv.ini, pv.fin]) if (o) { ctx.setLineDash([]); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3 / vista.cam.z; const q = esquinas(o.v); ctx.beginPath(); q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke(); }
    } else if (pv.caja) { ctx.strokeStyle = '#3b82f6'; ctx.setLineDash([6 / vista.cam.z, 4 / vista.cam.z]); ctx.lineWidth = 1.5 / vista.cam.z; ctx.strokeRect(pv.x, pv.y, pv.w, pv.h); }
    else {
      const [x0, y0, x1, y1] = pv.c, f = pv.fm;
      dibujarForma(ctx, f === 'linea' || f === 'flecha' ? { fm: f, x1: x0, y1: y0, x2: x1, y2: y1 } : { fm: f === 'pent' || f === 'hexa' || f === 'estrella' ? 'rect' : f, x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) }, H.opts.color, H.opts.grosor);
    }
    ctx.restore();
  }
  function pintarRegla(ctx) {
    if (!H.regla.on) return;
    const r = H.regla, z = vista.cam.z, ancho = 54 / z;
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.ang);
    ctx.fillStyle = 'rgba(250,204,21,.78)'; ctx.strokeStyle = 'rgba(120,80,0,.8)'; ctx.lineWidth = 1 / z;
    ctx.fillRect(0, 0, r.largo, ancho); ctx.strokeRect(0, 0, r.largo, ancho);
    ctx.fillStyle = ctx.strokeStyle = '#5b3d00'; ctx.font = `${11 / z}px system-ui`; ctx.textAlign = 'center';
    ctx.beginPath();
    for (let u = 0; u <= r.largo; u += 10) { const m = u % 100 === 0 ? 16 : u % 50 === 0 ? 11 : 6; ctx.moveTo(u, 0); ctx.lineTo(u, m / z); }
    ctx.stroke();
    for (let u = 0; u <= r.largo; u += 100) ctx.fillText(String(u / 100), u, 30 / z);
    ctx.beginPath(); ctx.arc(r.largo, ancho / 2, 14 / z, 0, 6.2832); ctx.fillStyle = '#5b3d00'; ctx.fill();
    ctx.restore();
  }
  function pintarSeleccion(ctx, v) {
    if (H.marco) {
      const [x0, y0] = v.pantalla(H.marco.x0, H.marco.y0), [x1, y1] = v.pantalla(H.marco.x1, H.marco.y1);
      ctx.fillStyle = 'rgba(59,130,246,.12)'; ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    }
    if (!H.sel.size || H.editando) return;
    const es = H.objsSel(); if (!es.length) return;
    ctx.strokeStyle = '#3b82f6'; ctx.fillStyle = '#fff'; ctx.lineWidth = 1.5;
    const poli = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => { const [sx, sy] = v.pantalla(x, y); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }); ctx.closePath(); ctx.stroke(); };
    for (const e of es) {
      if (e.v.tipo === 'conector') { const [a, b] = extremos(doc, e.v); ctx.beginPath(); const [ax, ay] = v.pantalla(...a), [bx, by] = v.pantalla(...b); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]); }
      else if (!esLinea(e)) { ctx.setLineDash(es.length > 1 ? [4, 3] : []); poli(esquinas(e.v)); ctx.setLineDash([]); }
    }
    const B = H.cajaSel();
    if (B && app.puedeEditar()) {
      if (es.length > 1) poli(esquinas(B));
      const mangos = posMangos(B), rotM = mangos.find(m => m[0] === 'rot');
      if (rotM) { const [a, b] = v.pantalla(...aMundo(B, B.w / 2, 0)), [c, d] = v.pantalla(rotM[1], rotM[2]); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
      for (const [n, x, y] of mangos) {
        const [sx, sy] = v.pantalla(x, y); ctx.beginPath();
        if (n === 'rot' || n[0] === 'p') ctx.arc(sx, sy, 7, 0, 6.2832); else ctx.rect(sx - 5, sy - 5, 10, 10);
        ctx.fill(); ctx.stroke();
      }
    }
  }
  function pintarLaseres(ctx, v) {
    const t = ahora(), vida = 1100;
    H.lasers = H.lasers.filter(s => { const ult = s.pts[s.pts.length - 1][2]; return t - Math.max(ult, s.fin || 0) < vida + 100; });
    for (const s of [...H.lasers, ...(app.colab ? app.colab.lasers() : [])]) {
      const pts = s.pts.filter(p => t - p[2] < vida); if (!pts.length) continue;
      ctx.lineCap = ctx.lineJoin = 'round';
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], f = 1 - (t - b[2]) / vida;
        const [ax, ay] = v.pantalla(a[0], a[1]), [bx, by] = v.pantalla(b[0], b[1]);
        ctx.strokeStyle = s.color; ctx.globalAlpha = Math.max(0, f); ctx.lineWidth = 3 + 6 * f; ctx.shadowColor = s.color; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      const l = pts[pts.length - 1], [lx, ly] = v.pantalla(l[0], l[1]); ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(lx, ly, 5, 0, 6.2832); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    if (H.lasers.length || (app.colab && app.colab.lasers().length)) v.animar(3);
  }
  function pintarBorrador(ctx) {
    const h = H.hover; if (!h) return;
    ctx.beginPath(); ctx.arc(h.x, h.y, H.opts.tamBorr, 0, 6.2832);
    ctx.fillStyle = 'rgba(120,120,120,.15)'; ctx.fill(); ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  H.dibujarVivo = (ctx, s) => pintarVivo(ctx, s);

  // ---------- teclado ----------
  H.teclado = e => {
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable || t.tagName === 'SELECT')) return false;
    if (app.ui.modalAbierto()) return false;
    const k = e.key, ctrl = e.ctrlKey || e.metaKey;
    if (ctrl) {
      const kl = k.toLowerCase();
      if (kl === 'z') { e.shiftKey ? app.rehacer() : app.deshacer(); return true; }
      if (kl === 'y') { app.rehacer(); return true; }
      if (kl === 'c') { H.copiar(); return true; }
      if (kl === 'x') { H.cortar(); return true; }
      if (kl === 'v') { return false; }   // lo gestiona el evento paste
      if (kl === 'd') { H.duplicar(); return true; }
      if (kl === 'a') { H.setHerr('sel'); H.todo(); return true; }
      if (kl === 's') { app.guardarAhora(); app.aviso('Guardado'); return true; }
      if (k === '+' || k === '=') { vista.zoomEn(vista.W / 2, vista.H / 2, 1.25); return true; }
      if (k === '-') { vista.zoomEn(vista.W / 2, vista.H / 2, 0.8); return true; }
      if (k === '0') { vista.ajustar(true); return true; }
      return false;
    }
    if (k === ' ') { if (!H.espacio) { H.espacio = true; H.cursor(); } return true; }
    if (k === 'Delete' || k === 'Backspace') { H.borrarSel(); return true; }
    if (k === 'Escape') { if (accion) cancelarAccion(); H.ponerSel([]); app.ui.cerrarPaneles(); return true; }
    if (k.startsWith('Arrow') && H.sel.size) {
      const d = e.shiftKey ? 10 : 1; H.mover(k === 'ArrowLeft' ? -d : k === 'ArrowRight' ? d : 0, k === 'ArrowUp' ? -d : k === 'ArrowDown' ? d : 0); return true;
    }
    if (k === 'PageUp' || (k === 'ArrowLeft' && !H.sel.size && e.altKey)) { app.paginaRel(-1); return true; }
    if (k === 'PageDown' || (k === 'ArrowRight' && !H.sel.size && e.altKey)) { app.paginaRel(1); return true; }
    if (k === '+' || k === '=') { vista.zoomEn(vista.W / 2, vista.H / 2, 1.25); return true; }
    if (k === '-') { vista.zoomEn(vista.W / 2, vista.H / 2, 0.8); return true; }
    if (k === '0') { vista.ajustar(true); return true; }
    if (k === '1') { vista.ajustar(false); return true; }
    const teclas = app.ajustes.teclas || TECLAS0;
    for (const h in teclas) if (teclas[h] && teclas[h].toLowerCase() === k.toLowerCase()) { H.setHerr(h); return true; }
    return false;
  };
  window.addEventListener('keyup', e => { if (e.key === ' ' && H.espacio) { H.espacio = false; H.cursor(); } });
  window.addEventListener('blur', () => { H.espacio = false; });

  H.pegarImagenesDe = async (items) => {
    for (const it of items) if (it.type && it.type.startsWith('image/')) { const f = it.getAsFile ? it.getAsFile() : it; if (f) await app.importarImagen(f); }
  };
  H.iniciarPuntero = (p) => { H.abajo(p); };
  el.dataset.tool = H.herr; H.cursor();
  return H;
}
