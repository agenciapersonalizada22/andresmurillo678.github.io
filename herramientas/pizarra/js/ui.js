// Interfaz: barra superior, herramientas, propiedades, paginas, dialogos.
import { ic } from './iconos.js';
import { COLORES, NOMBRES_COLOR, COLORES_NOTA, FONDOS, FORMAS, GROSORES } from './config.js';
import { PALETA_DALT, abrirAjustes } from './ajustes.js';
import { plantillas } from './plantillas.js';
import { nuevoId, Doc } from './modelo.js';
import * as Almacen from './almacen.js';
import { aMundo } from './geom.js';

export function h(tag, props, kids) {
  const e = document.createElement(tag);
  for (const k in props || {}) {
    if (k === 'cls') e.className = props[k]; else if (k === 'txt') e.textContent = props[k];
    else if (k === 'on') for (const ev in props.on) e.addEventListener(ev, props.on[ev]);
    else if (k === 'style') e.style.cssText = props[k]; else e.setAttribute(k, props[k]);
  }
  for (const c of kids || []) if (c != null && c !== false) e.append(c);
  return e;
}
const btn = (txt, fn, cls = '', icono) => h('button', { type: 'button', cls: 'btn ' + cls, 'data-f': 1, on: { click: fn } }, [icono ? ic(icono, 18) : null, txt ? h('span', { txt }) : null]);
const tiempoRel = ts => { const s = (Date.now() - ts) / 1000; return s < 60 ? 'hace un momento' : s < 3600 ? `hace ${Math.floor(s / 60)} min` : s < 86400 ? `hace ${Math.floor(s / 3600)} h` : new Date(ts).toLocaleDateString('es'); };
const luz = c => { const m = /^#([0-9a-f]{6})$/i.exec(c || ''); if (!m) return 0; const n = parseInt(m[1], 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };

const HERRAMIENTAS = [
  ['sel', 'Seleccionar (V)', 'sel'], ['pluma', 'Lápiz (P)', 'pluma'], ['resaltador', 'Resaltador (H)', 'resaltador'], ['borrador', 'Borrador (E)', 'borrador'],
  ['forma', 'Formas (R)', 'forma'], ['texto', 'Texto (T)', 'texto'], ['nota', 'Nota adhesiva (N)', 'nota'], ['conector', 'Conector (C)', 'conector'],
  ['imagen', 'Imagen', 'imagen'], ['comentario', 'Comentario (K)', 'comentario'], ['votos', 'Marcador de votos (B)', 'votos'], ['laser', 'Láser (L)', 'laser'], ['regla', 'Regla', 'regla'], ['mano', 'Mover lienzo (M / Espacio)', 'mano']
];

export function crearUI(app) {
  const { doc, vista } = app, H = () => app.herr;
  const U = { };
  const $ = s => document.querySelector(s);
  const modales = [];
  const toasts = $('#avisos');

  // ---------- avisos y modales ----------
  U.aviso = (txt, ms = 2600) => {
    const t = h('div', { cls: 'aviso', txt }); toasts.append(t);
    setTimeout(() => { t.classList.add('sale'); setTimeout(() => t.remove(), 300); }, ms);
  };
  app.aviso = U.aviso;
  const FOCO = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function modal(titulo, contenido, opts = {}) {
    const previo = document.activeElement;
    const cab = h('div', { cls: 'modal-cab' }, [h('h2', { id: 'm' + modales.length, txt: titulo }), h('button', { type: 'button', cls: 'icono', 'aria-label': 'Cerrar', 'data-f': 1, on: { click: () => cerrar() } }, [ic('cerrar')])]);
    const caja = h('section', { cls: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'm' + modales.length, style: opts.ancho ? `max-width:${opts.ancho}px` : '' }, [cab, h('div', { cls: 'modal-cuerpo' }, [contenido])]);
    const fondo = h('div', { cls: 'modal-fondo', on: { pointerdown: e => { if (e.target === fondo) cerrar(); } } }, [caja]);
    const m = { fondo, caja, alCerrar: opts.alCerrar, previo };
    function cerrar() { const i = modales.indexOf(m); if (i < 0) return; modales.splice(i, 1); fondo.remove(); if (m.alCerrar) m.alCerrar(); if (previo && previo.focus && document.contains(previo)) previo.focus(); }
    m.cerrar = cerrar; modales.push(m); document.body.append(fondo);
    caja.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); cerrar(); }
      else if (e.key === 'Tab') { const f = [...caja.querySelectorAll(FOCO)].filter(x => x.offsetParent !== null); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
    setTimeout(() => { const f = caja.querySelector('.modal-cuerpo ' + FOCO.split(',')[0].trim() + ',.modal-cuerpo input,.modal-cuerpo select') || caja.querySelector(FOCO); if (f) f.focus(); }, 30);
    return m;
  }
  U.modal = modal; U.h = h;
  U.cerrar = () => { const m = modales[modales.length - 1]; if (m) m.cerrar(); };
  U.modalAbierto = () => modales.length > 0 || !!window.Lobby && window.Lobby.abierto;
  U.modalTop = () => (modales.length ? modales[modales.length - 1].caja : null);
  U.cerrarPaneles = () => { cerrarMenu(); panelPag.classList.remove('abierto'); document.body.classList.remove('pag-abierta'); };

  // ---------- barra superior ----------
  const barra = $('#barraSup'), herrBar = $('#herramientas'), props = $('#props'), panelPag = $('#paginas');
  const B = {};
  function ib(nombre, etq, fn, icono, cls = '') { const b = h('button', { type: 'button', cls: 'icono ' + cls, 'aria-label': etq, title: etq, 'data-f': 1, on: { click: fn } }, [ic(icono)]); B[nombre] = b; return b; }
  B.titulo = h('input', { cls: 'titulo-tab', type: 'text', maxlength: 80, 'aria-label': 'Título del tablero', 'data-f': 1, on: { change: e => { app.renombrarActual(e.target.value.trim() || 'Tablero sin título'); } } });
  B.pagInfo = h('button', { type: 'button', cls: 'pagInfo', 'aria-label': 'Páginas', title: 'Páginas', 'data-f': 1, on: { click: () => alternarPaginas() } });
  B.zoomInfo = h('button', { type: 'button', cls: 'zoomInfo', 'aria-label': 'Ajustar vista', title: 'Ajustar a la página (0)', 'data-f': 1, on: { click: () => vista.ajustar(true) } });
  B.timer = h('button', { type: 'button', cls: 'chip-timer oculto', 'aria-label': 'Temporizador', 'data-f': 1, on: { click: () => abrirTemporizador() } });
  B.colab = h('button', { type: 'button', cls: 'icono colab', 'aria-label': 'Colaborar', title: 'Colaborar en tiempo real', 'data-f': 1, on: { click: () => abrirColab() } }, [ic('usuarios'), h('span', { cls: 'insignia oculto' })]);
  barra.append(
    h('a', { cls: 'volver', href: '../../juego/', 'data-f': 1, 'aria-label': 'Volver al menú de juegos', title: 'Menú' }, [ic('izq', 20), h('span', { txt: 'Menú' })]),
    ib('menu', 'Menú principal', e => abrirMenu(e.currentTarget), 'menu'), B.titulo,
    h('div', { cls: 'grupo pag' }, [ib('prev', 'Página anterior', () => app.paginaRel(-1), 'izq'), B.pagInfo, ib('next', 'Página siguiente', () => app.paginaRel(1), 'der')]),
    h('div', { cls: 'grupo' }, [ib('undo', 'Deshacer (Ctrl+Z)', () => app.deshacer(), 'undo'), ib('redo', 'Rehacer (Ctrl+Y)', () => app.rehacer(), 'redo')]),
    h('div', { cls: 'grupo zoom' }, [ib('zm', 'Alejar', () => vista.zoomEn(vista.W / 2, vista.H / 2, 0.8), 'menos'), B.zoomInfo, ib('zp', 'Acercar', () => vista.zoomEn(vista.W / 2, vista.H / 2, 1.25), 'mas')]),
    h('div', { cls: 'espacio' }), B.timer, B.colab,
    ib('exportar', 'Exportar', () => abrirExportar(), 'bajar', 'ancho'), ib('ajustes', 'Ajustes', () => abrirAjustes(app, U), 'ajustes', 'ancho')
  );
  $('#escena').append(h('div', { id: 'banner', cls: 'banner oculto', role: 'status', 'aria-live': 'polite' }), h('div', { id: 'fps', cls: 'fps oculto' }));

  // ---------- herramientas ----------
  const botonesH = {};
  for (const [id, etq, icono] of HERRAMIENTAS) {
    const b = h('button', { type: 'button', cls: 'herr', 'aria-label': etq, title: etq, 'data-herr': id, 'aria-pressed': 'false', 'data-f': 1, on: { click: () => {
      if (id === 'imagen') { $('#archivoImg').click(); return; }
      if (id === 'regla') { H().regla.on = !H().regla.on; vista.superior(); U.refrescar(); return; }
      if (H().herr === id && id !== 'sel') mostrarProps(!props.classList.contains('abierto'));
      H().setHerr(id);
      if (!['sel', 'mano', 'laser'].includes(id)) mostrarProps(true);
    } } }, [ic(icono), h('span', { cls: 'etq', txt: etq.replace(/ \(.*\)/, '') })]);
    botonesH[id] = b; herrBar.append(b);
  }
  function mostrarProps(v) { props.classList.toggle('abierto', v); }

  // ---------- propiedades ----------
  const reg = [];   // controles sincronizables
  let sigProps = '';
  const paleta = () => (app.ajustes.daltonismo === 'si' ? PALETA_DALT : COLORES);
  const valorSel = (campo, sel) => { let v; for (const e of sel) { const x = e.v[campo]; if (v === undefined) v = x; else if (v !== x) return undefined; } return v; };
  function swatches(titulo, lista, get, set, opciones = {}) {
    const cont = h('div', { cls: 'swatches', role: 'group', 'aria-label': titulo });
    const botones = lista.map(c => {
      const nombre = c === 'ninguno' ? 'Sin relleno' : (NOMBRES_COLOR[c] || c);
      const b = h('button', { type: 'button', cls: 'sw' + (c === 'ninguno' ? ' ninguno' : ''), 'aria-label': nombre, title: nombre, 'aria-pressed': 'false', 'data-c': c, 'data-f': 1, style: c === 'tinta' ? '' : c === 'ninguno' ? '' : `background:${c}`, on: { click: () => set(c) } });
      if (c === 'tinta') b.append(h('i', { cls: 'tinta' }));
      cont.append(b); return b;
    });
    if (opciones.libre !== false) {
      const inp = h('input', { type: 'color', cls: 'sw-libre', 'aria-label': titulo + ': color personalizado', title: 'Color personalizado', 'data-f': 1, on: { input: e => set(e.target.value) } });
      cont.append(inp); reg.push(() => { const v = get(); if (/^#[0-9a-f]{6}$/i.test(v)) inp.value = v; });
    }
    reg.push(() => { const v = get(); botones.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === v))); });
    return h('div', { cls: 'sec' }, [h('div', { cls: 'sec-t', txt: titulo }), cont]);
  }
  function rango(titulo, min, max, paso, get, set, fmt = v => v) {
    const o = h('output', { txt: '' }), inp = h('input', { type: 'range', min, max, step: paso, 'aria-label': titulo, 'data-f': 1, on: { input: e => { o.textContent = fmt(+e.target.value); set(+e.target.value); } } });
    reg.push(() => { const v = get(); if (v != null && document.activeElement !== inp) inp.value = v; o.textContent = fmt(+inp.value); });
    return h('div', { cls: 'sec' }, [h('div', { cls: 'sec-t' }, [h('span', { txt: titulo }), o]), inp]);
  }
  function seg(titulo, opciones, get, set) {
    const bs = opciones.map(([v, t, icono]) => h('button', { type: 'button', cls: 'seg', 'aria-pressed': 'false', 'data-v': v, 'aria-label': t, title: t, 'data-f': 1, on: { click: () => set(v) } }, [icono ? ic(icono, 18) : null, h('span', { txt: icono ? '' : t })]));
    reg.push(() => { const v = get(); bs.forEach(b => b.setAttribute('aria-pressed', String(String(b.dataset.v) === String(v)))); });
    return h('div', { cls: 'sec' }, [titulo ? h('div', { cls: 'sec-t', txt: titulo }) : null, h('div', { cls: 'segs' }, bs)]);
  }
  function acciones(lista) { return h('div', { cls: 'acc' }, lista.map(([t, ico, fn, cls]) => h('button', { type: 'button', cls: 'btn peq ' + (cls || ''), title: t, 'aria-label': t, 'data-f': 1, on: { click: fn } }, [ic(ico, 18), h('span', { cls: 'txt', txt: t })]))); }

  function firma() {
    const o = H(), sel = o.objsSel();
    return [o.herr, sel.map(e => e.v.tipo + (e.v.fm || '') + (e.v.res ? 'r' : '')).join(','), o.opts.borr, o.opts.forma, app.ajustes.daltonismo, app.puedeEditar(), doc.capas().map(c => c.id + c.v.nombre).join()].join('|');
  }
  function construirProps() {
    reg.length = 0; props.replaceChildren();
    const o = H(), sel = o.objsSel(), tipos = new Set(sel.map(e => e.v.tipo)), tool = o.herr;
    const O = o.opts, ed = app.puedeEditar();
    const cab = h('div', { cls: 'props-cab' }, [h('strong', { txt: sel.length ? (sel.length === 1 ? nombreTipo(sel[0]) : sel.length + ' objetos') : nombreHerr(tool) }), h('button', { type: 'button', cls: 'icono peq', 'aria-label': 'Cerrar propiedades', 'data-f': 1, on: { click: () => mostrarProps(false) } }, [ic('cerrar', 16)])]);
    props.append(cab);
    const cuerpo = h('div', { cls: 'props-cuerpo' }); props.append(cuerpo);
    const add = x => x && cuerpo.append(x);
    if (!ed) { add(h('p', { cls: 'nota-aj', txt: 'Modo solo lectura: puedes mirar, mover el lienzo y usar el láser.' })); return; }
    const uno = sel.length ? sel : null;
    const conColor = tool === 'pluma' || tool === 'forma' || tool === 'conector' || tool === 'texto' || (uno && sel.some(e => ['trazo', 'forma', 'texto', 'conector'].includes(e.v.tipo) && !e.v.res));
    if (conColor) add(swatches('Color', paleta(), () => (uno ? valorSel('color', sel.filter(e => e.v.tipo !== 'nota')) : O.color), c => o.cambiarOpts({ color: c })));
    if (tool === 'resaltador' || (uno && sel.every(e => e.v.res))) add(swatches('Color del resaltador', ['#facc15', '#4ade80', '#f472b6', '#38bdf8', '#fb923c', '#a78bfa'], () => (uno ? valorSel('color', sel) : O.colorRes), c => { O.colorRes = c; if (uno) o.aplicarSel({ color: c }); else o.cambiarOpts({}); U.refrescar(); }));
    if (tool === 'pluma' || tool === 'forma' || tool === 'conector' || (uno && sel.some(e => ['trazo', 'forma', 'conector'].includes(e.v.tipo) && !e.v.res))) {
      add(rango('Grosor', 1, 40, 1, () => (uno ? valorSel('grosor', sel) || O.grosor : O.grosor), v => o.cambiarOpts({ grosor: v }), v => v + ' px'));
      add(h('div', { cls: 'rapidos' }, GROSORES.map(g => h('button', { type: 'button', cls: 'g', 'aria-label': 'Grosor ' + g, title: 'Grosor ' + g, 'data-f': 1, on: { click: () => o.cambiarOpts({ grosor: g }) } }, [h('i', { style: `width:${Math.min(22, g + 3)}px;height:${Math.min(22, g + 3)}px` })]))));
    }
    if (tool === 'resaltador') add(rango('Grosor del resaltador', 8, 60, 1, () => O.grosorRes, v => { O.grosorRes = v; ls_guardar(); }, v => v + ' px'));
    if (tool === 'pluma') add(toggle('Reconocer formas al mantener', () => app.ajustes.formas, v => app.setAjuste('formas', v)));
    if (tool === 'borrador') {
      add(seg('Modo', [['trazo', 'Por trazo'], ['area', 'Por área']], () => O.borr, v => o.cambiarOpts({ borr: v })));
      add(seg('Tamaño', [[10, 'S'], [20, 'M'], [36, 'L'], [60, 'XL']], () => O.tamBorr, v => o.cambiarOpts({ tamBorr: v })));
    }
    if (tool === 'forma') add(h('div', { cls: 'sec' }, [h('div', { cls: 'sec-t', txt: 'Forma' }), (() => { const g = h('div', { cls: 'formas' }); const bs = FORMAS.map(([id, n]) => h('button', { type: 'button', cls: 'seg', 'aria-pressed': 'false', 'data-v': id, title: n, 'aria-label': n, 'data-f': 1, on: { click: () => o.cambiarOpts({ forma: id }) } }, [formaIcono(id), h('span', { cls: 'etq-s', txt: n })])); bs.forEach(b => g.append(b)); reg.push(() => bs.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === O.forma)))); return g; })()]));
    if (tool === 'forma' || (uno && sel.some(e => e.v.tipo === 'forma' && e.v.fm !== 'linea' && e.v.fm !== 'flecha'))) add(swatches('Relleno', ['ninguno', ...paleta().filter(c => c !== 'tinta')], () => (uno ? valorSel('relleno', sel.filter(e => e.v.tipo === 'forma')) || 'ninguno' : O.relleno), c => o.cambiarOpts({ relleno: c }), { libre: true }));
    if (tool === 'conector' || (uno && tipos.has('conector'))) add(toggle('Punta de flecha', () => (uno ? valorSel('flecha', sel.filter(e => e.v.tipo === 'conector')) !== false : O.conFlecha), v => { O.conFlecha = v; o.aplicarSel({ flecha: v }); U.refrescar(); }));
    if (tool === 'nota' || (uno && tipos.has('nota'))) add(swatches('Color de la nota', COLORES_NOTA, () => (uno ? valorSel('color', sel.filter(e => e.v.tipo === 'nota')) : O.colorNota), c => o.cambiarOpts({ colorNota: c }), { libre: false }));
    if (tool === 'texto' || tool === 'nota' || (uno && (tipos.has('texto') || tipos.has('nota')))) {
      const ts = uno ? sel.filter(e => e.v.tipo === 'texto' || e.v.tipo === 'nota') : [];
      add(rango('Tamaño del texto', 10, 120, 1, () => (ts.length ? valorSel('fs', ts) || O.fs : O.fs), v => o.cambiarOpts({ fs: v }), v => v + ' px'));
      add(h('div', { cls: 'sec' }, [h('div', { cls: 'sec-t', txt: 'Formato' }), h('div', { cls: 'segs' }, [
        fmtBtn('N', 'Negrita', 'neg', ts, o), fmtBtn('K', 'Cursiva', 'cur', ts, o),
        ...[['left', 'Izquierda'], ['center', 'Centro'], ['right', 'Derecha']].map(([v, t]) => { const b = h('button', { type: 'button', cls: 'seg', 'aria-pressed': 'false', title: 'Alinear ' + t, 'aria-label': 'Alinear ' + t, 'data-f': 1, on: { click: () => o.aplicarSel({ al: v }) } }, [h('span', { txt: v === 'left' ? '⇤' : v === 'center' ? '↔' : '⇥' })]); reg.push(() => b.setAttribute('aria-pressed', String(valorSel('al', ts) === v))); return b; })
      ])]));
    }
    if (tool === 'votos' || (uno && tipos.has('votos'))) add(h('p', { cls: 'nota-aj', txt: 'Toca un marcador para sumar o quitar tu voto. Cada persona tiene un voto por marcador.' }));
    if (tool === 'laser') add(h('p', { cls: 'nota-aj', txt: 'Arrastra para señalar: el trazo desaparece solo y los demás lo ven.' }));
    if (uno) {
      if (!tipos.has('conector') || sel.length > 1) add(rango('Opacidad', 10, 100, 5, () => Math.round((valorSel('op', sel) ?? 1) * 100), v => o.aplicarSel({ op: v / 100 }), v => v + '%'));
      add(acciones([['Duplicar', 'copiar', () => o.duplicar()], ['Al frente', 'frente', () => o.orden(true)], ['Al fondo', 'atras', () => o.orden(false)], ['Bloquear', 'candado', () => o.bloquearObjetos(true)], ['Borrar', 'papelera', () => o.borrarSel(), 'peligro']]));
      if (sel.length === 1 && tipos.has('imagen')) add(acciones([['Recortar', 'recortar', () => abrirRecorte(sel[0].id)]]));
      if (sel.length >= 2) add(acciones([['Izquierda', 'alIzq', () => o.alinear('izq')], ['Centro H', 'alCx', () => o.alinear('cx')], ['Derecha', 'alDer', () => o.alinear('der')], ['Arriba', 'alArr', () => o.alinear('arr')], ['Centro V', 'alCy', () => o.alinear('cy')], ['Abajo', 'alAba', () => o.alinear('aba')]]));
      if (sel.length >= 3) add(acciones([['Distribuir horizontal', 'disH', () => o.distribuir('h')], ['Distribuir vertical', 'disV', () => o.distribuir('v')]]));
      add(h('label', { cls: 'sec fila-sel' }, [h('span', { cls: 'sec-t', txt: 'Mover a capa' }), h('select', { 'data-f': 1, 'aria-label': 'Mover a capa', on: { change: e => { o.moverACapa(e.target.value); } } }, doc.capas().map(c => h('option', { value: c.id, txt: c.v.nombre || c.id, ...(valorSel('cap', sel) === c.id || (!valorSel('cap', sel) && c.id === 'c1') ? { selected: '' } : {}) })))]));
    }
    add(h('label', { cls: 'sec fila-sel' }, [h('span', { cls: 'sec-t', txt: 'Capa activa' }), h('select', { 'data-f': 1, 'aria-label': 'Capa activa', on: { change: e => { O.capa = e.target.value; } } }, doc.capas().map(c => h('option', { value: c.id, txt: (c.v.lock ? '🔒 ' : '') + (c.v.nombre || c.id), ...(O.capa === c.id ? { selected: '' } : {}) }))), btn('Capas…', () => abrirCapas(), 'peq')]));
    if (H().regla.on) add(h('p', { cls: 'nota-aj', txt: 'Regla activa: arrástrala por el cuerpo; el círculo del extremo la gira. Un trazo que empieza junto a su borde se endereza.' }));
  }
  const ls_guardar = () => { app.herr.cambiarOpts({}); };
  function toggle(t, get, set) {
    const inp = h('input', { type: 'checkbox', 'data-f': 1, on: { change: e => set(e.target.checked) } });
    reg.push(() => { inp.checked = !!get(); });
    return h('label', { cls: 'sec fila' }, [h('span', { txt: t }), inp]);
  }
  function fmtBtn(t, nombre, campo, ts, o) { const b = h('button', { type: 'button', cls: 'seg', 'aria-pressed': 'false', title: nombre, 'aria-label': nombre, 'data-f': 1, on: { click: () => { const v = !(ts.length ? valorSel(campo, ts) : o.opts[campo]); o.opts[campo] = v; o.aplicarSel({ [campo]: v }); U.refrescar(); } } }, [h('b', { txt: t, style: campo === 'cur' ? 'font-style:italic' : '' })]); reg.push(() => b.setAttribute('aria-pressed', String(!!(ts.length ? valorSel(campo, ts) : o.opts[campo])))); return b; }
  function formaIcono(id) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', 20); s.setAttribute('height', 20); s.setAttribute('aria-hidden', 'true'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    const D = { rect: 'M4 6h16v12H4z', elipse: 'M12 5a8 7 0 100 14 8 7 0 000-14z', linea: 'M4 20L20 4', flecha: 'M4 20L20 4M11 4h9v9', tri: 'M12 4l9 16H3z', rombo: 'M12 3l9 9-9 9-9-9z', pent: 'M12 3l9 7-3.5 11h-11L3 10z', hexa: 'M7 4h10l5 8-5 8H7l-5-8z', estrella: 'M12 2l3 7 7 .6-5.3 4.8 1.6 7.4L12 18l-6.3 3.8 1.6-7.4L2 9.6 9 9z' };
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', D[id]); s.append(p); return s;
  }
  const nombreHerr = t => ({ pluma: 'Lápiz', resaltador: 'Resaltador', borrador: 'Borrador', sel: 'Selección', mano: 'Mover lienzo', texto: 'Texto', nota: 'Notas', forma: 'Formas', conector: 'Conector', laser: 'Láser', comentario: 'Comentarios', votos: 'Votos' }[t] || t);
  const nombreTipo = e => ({ trazo: e.v.res ? 'Resaltado' : 'Trazo', forma: 'Forma', nota: 'Nota', texto: 'Texto', imagen: 'Imagen', conector: 'Conector', comentario: 'Comentario', votos: 'Votos' }[e.v.tipo] || 'Objeto');

  U.selCambio = () => {
    const n = H().sel.size;
    if (n && !props.classList.contains('abierto') && !esMovil()) mostrarProps(true);
    U.refrescar();
  };
  const esMovil = () => window.innerWidth < 700;
  U.refrescar = () => {
    if (!app.herr) return;
    const o = H();
    for (const [id, b] of Object.entries(botonesH)) b.setAttribute('aria-pressed', String(id === 'regla' ? o.regla.on : id === o.herr));
    const sg = firma();
    if (sg !== sigProps) { sigProps = sg; construirProps(); }
    for (const f of reg) f();
    B.undo.disabled = !doc.undo.length; B.redo.disabled = !doc.redo.length;
    const pgs = doc.paginas(), i = pgs.findIndex(p => p.id === vista.pg);
    B.pagInfo.textContent = `${i + 1} / ${pgs.length}`; B.prev.disabled = i <= 0; B.next.disabled = i >= pgs.length - 1;
    B.zoomInfo.textContent = Math.round(vista.cam.z * 100) + '%';
    if (document.activeElement !== B.titulo) B.titulo.value = doc.meta('titulo') || '';
    H().cursor();
    const ro = !app.puedeEditar();
    document.body.classList.toggle('solo-lectura', ro);
  };
  const prevAlMover = vista.alMoverCamara;
  vista.alMoverCamara = () => { if (prevAlMover) prevAlMover(); B.zoomInfo.textContent = Math.round(vista.cam.z * 100) + '%'; if (app.colab) app.colab.vistaCambio(); };

  U.refrescarTodo = () => { U.refrescar(); pintarPaginas(); if (!app.colab || true) U.timerCambio(); };

  // ---------- menu principal ----------
  let menuEl = null;
  function cerrarMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
  function abrirMenu(origen) {
    if (menuEl) { cerrarMenu(); return; }
    const item = (t, ico, fn) => h('button', { type: 'button', cls: 'menu-item', role: 'menuitem', 'data-f': 1, on: { click: () => { cerrarMenu(); fn(); } } }, [ic(ico, 18), h('span', { txt: t })]);
    menuEl = h('div', { cls: 'menu', role: 'menu' }, [
      item('Mis tableros', 'carpeta', () => abrirTableros()), item('Renombrar tablero', 'texto', () => { const n = prompt('Nombre del tablero', doc.meta('titulo') || ''); if (n && n.trim()) { app.renombrarActual(n.trim()); U.refrescar(); } }), item('Nuevo tablero', 'mas', () => app.nuevoTablero()), item('Plantillas', 'plantilla', () => abrirPlantillas()),
      item('Fondo de la página', 'fondo', () => abrirFondo()), item('Capas', 'capas', () => abrirCapas()),
      item('Páginas', 'pag', () => alternarPaginas(true)), item('Exportar / importar', 'bajar', () => abrirExportar()), item('Historial de versiones', 'historial', () => abrirVersiones()),
      item('Colaborar', 'usuarios', () => abrirColab()), item('Temporizador', 'timer', () => abrirTemporizador()), item('Pantalla completa', 'pantalla', () => alternarPantalla()),
      item('Ajustes', 'ajustes', () => abrirAjustes(app, U)), item('Volver al menú de juegos', 'izq', () => { location.href = '../../juego/'; }), item('Ayuda y atajos', 'ayuda', () => abrirAyuda())
    ]);
    document.body.append(menuEl);
    const r = origen.getBoundingClientRect(); menuEl.style.left = Math.max(8, Math.min(r.left, innerWidth - 250)) + 'px'; menuEl.style.top = r.bottom + 6 + 'px';
    menuEl.querySelector('button').focus();
    setTimeout(() => document.addEventListener('pointerdown', cerrarFuera, true), 0);
  }
  const cerrarFuera = e => { if (menuEl && !menuEl.contains(e.target)) { cerrarMenu(); document.removeEventListener('pointerdown', cerrarFuera, true); } };
  U.abrirMenu = () => abrirMenu(B.menu);
  menuEl && 0;
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuEl) cerrarMenu(); });
  function alternarPantalla() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); }
  U.alternarPantalla = alternarPantalla;

  // ---------- paginas ----------
  function alternarPaginas(v) { const a = v == null ? !panelPag.classList.contains('abierto') : v; panelPag.classList.toggle('abierto', a); document.body.classList.toggle('pag-abierta', a); if (a) pintarPaginas(); }
  let miniaturas = new Map(), tMini = 0;
  function pintarPaginas() {
    if (!panelPag.classList.contains('abierto')) return;
    const pgs = doc.paginas(), ed = app.puedeEditar();
    const lista = h('ol', { cls: 'lista-pag' });
    pgs.forEach((p, i) => {
      const cv = app.miniatura(p.id);
      const it = h('li', { cls: 'pag-item' + (p.id === vista.pg ? ' activa' : ''), draggable: ed ? 'true' : 'false', 'data-id': p.id }, [
        h('button', { type: 'button', cls: 'pag-mini', 'aria-label': `Ir a la página ${i + 1}`, 'aria-current': p.id === vista.pg ? 'page' : 'false', 'data-f': 1, on: { click: () => app.irPagina(p.id) } }, [cv, h('span', { cls: 'num', txt: String(i + 1) })]),
        ed ? h('div', { cls: 'pag-acc' }, [
          mini('Subir', 'arriba', () => app.moverPagina(p.id, -1), i === 0), mini('Bajar', 'abajo', () => app.moverPagina(p.id, 1), i === pgs.length - 1),
          mini('Duplicar página', 'copiar', () => app.duplicarPagina(p.id)), mini('Borrar página', 'papelera', () => { if (pgs.length > 1) app.borrarPagina(p.id); else U.aviso('Debe quedar al menos una página'); }, pgs.length < 2)
        ]) : null
      ]);
      it.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move'; });
      it.addEventListener('dragover', e => { if (ed) { e.preventDefault(); it.classList.add('sobre'); } });
      it.addEventListener('dragleave', () => it.classList.remove('sobre'));
      it.addEventListener('drop', e => { e.preventDefault(); it.classList.remove('sobre'); const id = e.dataTransfer.getData('text/plain'); if (id && id !== p.id) app.reordenarPagina(id, p.id); });
      lista.append(it);
    });
    panelPag.replaceChildren(
      h('div', { cls: 'props-cab' }, [h('strong', { txt: 'Páginas' }), h('button', { type: 'button', cls: 'icono peq', 'aria-label': 'Cerrar páginas', 'data-f': 1, on: { click: () => alternarPaginas(false) } }, [ic('cerrar', 16)])]),
      h('div', { cls: 'props-cuerpo' }, [lista, ed ? btn('Añadir página', () => app.nuevaPagina(), 'principal', 'mas') : null])
    );
  }
  const mini = (t, ico, fn, dis) => { const b = h('button', { type: 'button', cls: 'icono peq', title: t, 'aria-label': t, 'data-f': 1, on: { click: fn } }, [ic(ico, 16)]); if (dis) b.disabled = true; return b; };
  U.paginasCambio = () => { clearTimeout(tMini); tMini = setTimeout(pintarPaginas, 400); };

  // ---------- dialogos ----------
  async function abrirTableros() {
    if (app.guardarMini) await app.guardarMini();
    const cont = h('div', { cls: 'tableros' }), tabs = h('div', { cls: 'tabs' });
    let ver = 'activos';
    const pintar = async () => {
      const lista = await Almacen.listar(ver === 'papelera'), grid = h('div', { cls: 'grid-tab' });
      for (const t of lista) {
        const acc = ver === 'activos' ? [['Abrir', () => { m.cerrar(); app.abrirTablero(t.id); }, 'principal'], ['Renombrar', async () => { const n = prompt('Nuevo nombre', t.titulo); if (n && n.trim()) { await app.renombrarTablero(t.id, n.trim()); pintar(); } }], ['Duplicar', async () => { await app.duplicarTablero(t.id); pintar(); }], ['A la papelera', async () => { await app.papelera(t.id); pintar(); }, 'peligro']]
          : [['Restaurar', async () => { await Almacen.restaurar(t.id); pintar(); }, 'principal'], ['Eliminar para siempre', async () => { if (confirm('Se eliminará definitivamente.')) { await Almacen.eliminar(t.id); pintar(); } }, 'peligro']];
        const dias = ver === 'papelera' ? Math.max(0, 30 - Math.floor((Date.now() - t.borrado) / 86400000)) : 0;
        grid.append(h('article', { cls: 'tarj' + (t.id === app.tableroId ? ' actual' : '') }, [
          h('div', { cls: 'tarj-mini' }, [t.mini ? h('img', { src: t.mini, alt: '' }) : h('span', { cls: 'vacio', txt: 'Sin vista previa' })]),
          h('h3', { txt: t.titulo }), h('p', { cls: 'meta', txt: `${t.n || 0} objetos · ${t.paginas || 1} pág. · ${tiempoRel(t.mod)}${ver === 'papelera' ? ` · se borra en ${dias} días` : ''}` }),
          h('div', { cls: 'acc' }, acc.map(([tx, fn, cl]) => btn(tx, fn, 'peq ' + (cl || ''))))
        ]));
      }
      cuerpo.replaceChildren(...[lista.length ? grid : h('p', { cls: 'vacio-t', txt: ver === 'activos' ? 'Aún no hay tableros.' : 'La papelera está vacía.' }), ver === 'papelera' && lista.length ? btn('Vaciar papelera', async () => { if (confirm('¿Eliminar todo para siempre?')) { await Almacen.vaciarPapelera(); pintar(); } }, 'peligro') : null].filter(Boolean));
      tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === ver)));
    };
    const cuerpo = h('div');
    for (const [v, t] of [['activos', 'Tableros'], ['papelera', 'Papelera (30 días)']]) tabs.append(h('button', { type: 'button', cls: 'tab', role: 'tab', 'data-v': v, 'data-f': 1, txt: t, on: { click: () => { ver = v; pintar(); } } }));
    cont.append(h('div', { cls: 'fila-bot' }, [btn('Nuevo tablero', () => { m.cerrar(); app.nuevoTablero(); }, 'principal', 'mas'), btn('Importar JSON', () => $('#archivoJson').click(), '', 'bajar')]), tabs, cuerpo);
    const m = modal('Mis tableros', cont, { ancho: 760 }); pintar();
  }
  U.abrirTableros = abrirTableros;

  function abrirPlantillas() {
    const grid = h('div', { cls: 'grid-pl' });
    for (const pl of plantillas) grid.append(h('div', { cls: 'tarj' }, [h('h3', { txt: pl.nombre }), h('div', { cls: 'acc' }, [btn('En esta página', () => { m.cerrar(); app.aplicarPlantilla(pl, false); }, 'peq principal'), btn('En página nueva', () => { m.cerrar(); app.aplicarPlantilla(pl, true); }, 'peq')])]));
    const m = modal('Plantillas', h('div', {}, [h('p', { txt: 'Estructuras listas para trabajar en equipo. Después puedes editar, mover y borrar todo.' }), grid]), { ancho: 620 });
  }
  function abrirFondo() {
    const p = doc.ent.p.get(vista.pg), cont = h('div', {});
    const g = h('div', { cls: 'segs grande' });
    for (const [id, n] of FONDOS) g.append(h('button', { type: 'button', cls: 'seg fondo-' + id, 'aria-pressed': String(p.v.fondo === id), 'data-f': 1, txt: n, on: { click: () => { app.cambiarPagina({ fondo: id }); g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === g.querySelector('.fondo-' + id)))); } } }));
    const marco = h('input', { type: 'checkbox', 'data-f': 1, ...(p.v.marco ? { checked: '' } : {}), on: { change: e => app.cambiarPagina({ marco: e.target.checked }) } });
    cont.append(g, h('label', { cls: 'fila' }, [h('span', {}, ['Mostrar marco 16:9', h('small', { txt: 'El marco define lo que se exporta; fuera de él el lienzo sigue siendo infinito.' })]), marco]));
    modal('Fondo de la página', cont, { ancho: 480 });
  }
  function abrirCapas() {
    const cont = h('div', { cls: 'capas' });
    const pintar = () => {
      const ul = h('ul', { cls: 'lista-capas' });
      [...doc.capas()].reverse().forEach(c => {
        ul.append(h('li', {}, [
          h('input', { type: 'text', value: c.v.nombre || '', maxlength: 24, 'aria-label': 'Nombre de la capa', 'data-f': 1, on: { change: e => app.cambiarCapa(c.id, { nombre: e.target.value }) } }),
          h('button', { type: 'button', cls: 'icono peq', title: c.v.vis === false ? 'Mostrar' : 'Ocultar', 'aria-label': (c.v.vis === false ? 'Mostrar' : 'Ocultar') + ' capa', 'aria-pressed': String(c.v.vis === false), 'data-f': 1, on: { click: () => { app.cambiarCapa(c.id, { vis: c.v.vis === false }); pintar(); } } }, [ic('ojo', 16)]),
          h('button', { type: 'button', cls: 'icono peq', title: c.v.lock ? 'Desbloquear' : 'Bloquear', 'aria-label': (c.v.lock ? 'Desbloquear' : 'Bloquear') + ' capa', 'aria-pressed': String(!!c.v.lock), 'data-f': 1, on: { click: () => { app.cambiarCapa(c.id, { lock: !c.v.lock }); pintar(); } } }, [ic('candado', 16)]),
          h('button', { type: 'button', cls: 'btn peq' + (H().opts.capa === c.id ? ' principal' : ''), 'data-f': 1, txt: H().opts.capa === c.id ? 'Activa' : 'Usar', on: { click: () => { H().opts.capa = c.id; pintar(); sigProps = ''; U.refrescar(); } } }),
          ['c0', 'c1', 'c2'].includes(c.id) ? null : h('button', { type: 'button', cls: 'icono peq', title: 'Borrar capa', 'aria-label': 'Borrar capa', 'data-f': 1, on: { click: () => { app.cambiarCapa(c.id, { del: true }); if (H().opts.capa === c.id) H().opts.capa = 'c1'; pintar(); } } }, [ic('papelera', 16)])
        ]));
      });
      cont.replaceChildren(h('p', { txt: 'Las capas superiores se pintan encima. Una capa bloqueada no se puede seleccionar, borrar ni dibujar en ella.' }), ul, btn('Añadir capa', () => { app.nuevaCapa(); pintar(); }, 'principal', 'mas'));
    };
    pintar(); modal('Capas', cont, { ancho: 480, alCerrar: () => { sigProps = ''; U.refrescar(); } });
  }
  function abrirRecorte(id) {
    const e = doc.obj(id); if (!e) return;
    const v0 = { ...e.v }, r0 = v0.rec || [0, 0, 1, 1], esc = v0.w / (r0[2] * (v0.iw || v0.w));
    const val = { l: 0, t: 0, r: 0, b: 0 };
    const aplicar = () => {
      const iw = v0.iw || v0.w, ih = v0.ih || v0.h;
      const rec = [r0[0] + r0[2] * val.l, r0[1] + r0[3] * val.t, r0[2] * (1 - val.l - val.r), r0[3] * (1 - val.t - val.b)];
      const w = rec[2] * iw * esc, h2 = rec[3] * ih * esc;
      const P = aMundo(v0, (rec[0] - r0[0]) * iw * esc, (rec[1] - r0[1]) * ih * esc), c = Math.cos(v0.rot || 0), s = Math.sin(v0.rot || 0);
      const cx = P[0] + (w / 2) * c - (h2 / 2) * s, cy = P[1] + (w / 2) * s + (h2 / 2) * c;
      doc.cambiar([{ k: 'o', id, p: { rec, w, h: h2, x: cx - w / 2, y: cy - h2 / 2 } }]);
    };
    doc.abrirGrupo();
    const sl = (t, k) => h('label', { cls: 'fila' }, [h('span', { txt: t }), h('input', { type: 'range', min: 0, max: 45, value: 0, 'data-f': 1, 'aria-label': 'Recortar ' + t, on: { input: ev => { val[k] = ev.target.value / 100; aplicar(); } } })]);
    modal('Recortar imagen', h('div', {}, [sl('Izquierda', 'l'), sl('Derecha', 'r'), sl('Arriba', 't'), sl('Abajo', 'b'), h('p', { cls: 'nota-aj', txt: 'Se recorta de forma no destructiva sobre la imagen original.' })]), { ancho: 420, alCerrar: () => doc.cerrarGrupo() });
  }

  function abrirExportar() {
    const f = (t, d, fn, ico) => h('button', { type: 'button', cls: 'op-exp', 'data-f': 1, on: { click: async () => { try { await fn(); } catch (e) { console.error(e); U.aviso('No se pudo exportar: ' + e.message); } } } }, [ic(ico, 22), h('span', {}, [h('strong', { txt: t }), h('small', { txt: d })])]);
    modal('Exportar e importar', h('div', { cls: 'exportar' }, [
      f('Imagen PNG', 'La página actual, con el fondo', () => app.exportarPNG(), 'imagen'),
      f('PDF', 'Todas las páginas en un solo archivo', () => app.exportarPDF(), 'pag'),
      f('SVG', 'Vectorial de la página actual', () => app.exportarSVG(), 'forma'),
      f('Tablero (JSON)', 'Copia completa para guardar o mover a otro equipo', () => app.exportarJSON(), 'bajar'),
      f('Importar tablero (JSON)', 'Abre un archivo exportado antes como tablero nuevo', () => $('#archivoJson').click(), 'carpeta'),
      f('Insertar imagen', 'Desde un archivo (también puedes pegar o arrastrar)', () => $('#archivoImg').click(), 'imagen')
    ]), { ancho: 480 });
  }
  async function abrirVersiones() {
    const cont = h('div', {}), cuerpo = h('div');
    const pintar = async () => {
      const vs = await Almacen.versiones(app.tableroId), ul = h('ul', { cls: 'lista-ver' });
      for (const v of vs) ul.append(h('li', {}, [h('span', {}, [h('strong', { txt: new Date(v.ts).toLocaleString('es') }), h('small', { txt: ` · ${v.etiqueta || 'automática'} · ${v.n} cambios` })]), btn('Restaurar', async () => { if (await app.restaurarVersion(v.k)) { m.cerrar(); U.aviso('Versión restaurada (puedes deshacer)'); } }, 'peq')]));
      cuerpo.replaceChildren(vs.length ? ul : h('p', { txt: 'Todavía no hay versiones guardadas.' }));
    };
    cont.append(h('p', { txt: 'Se guardan versiones automáticamente mientras trabajas. Restaurar aplica los cambios necesarios como una edición normal: se puede deshacer y se replica a los demás.' }), btn('Guardar versión ahora', async () => { await app.guardarVersion('manual'); pintar(); U.aviso('Versión guardada'); }, 'principal'), cuerpo);
    const m = modal('Historial de versiones', cont, { ancho: 560 }); pintar();
  }
  function abrirAyuda() {
    const fila = (a, b) => h('tr', {}, [h('th', { scope: 'row', txt: a }), h('td', { txt: b })]);
    modal('Ayuda', h('div', { cls: 'ayuda' }, [
      h('h3', { txt: 'Atajos de teclado' }), h('table', {}, [fila('V / P / H / E', 'Seleccionar / Lápiz / Resaltador / Borrador'), fila('T / N / R / C', 'Texto / Nota / Forma / Conector'), fila('L / K / B / M', 'Láser / Comentario / Votos / Mover lienzo'), fila('Espacio + arrastrar', 'Mover el lienzo'), fila('Rueda / pellizco', 'Zoom (Ctrl + rueda también)'), fila('Ctrl+Z / Ctrl+Y', 'Deshacer / Rehacer'), fila('Ctrl+C / V / X / D', 'Copiar / Pegar / Cortar / Duplicar'), fila('Ctrl+A, Supr', 'Seleccionar todo, borrar'), fila('Flechas (+Shift)', 'Mover la selección 1 (10) px'), fila('Alt+Izq/Der, RePág/AvPág', 'Cambiar de página'), fila('0 / 1', 'Ajustar al marco / a todo el contenido')]),
      h('h3', { txt: 'Pantalla táctil y lápiz' }), h('ul', {}, [h('li', { txt: 'Un dedo dibuja; dos dedos mueven y hacen zoom. Con rechazo de palma, si usas lápiz los dedos solo mueven.' }), h('li', { txt: 'Termina un trazo y mantén quieto el lápiz o dedo para que se convierta en forma perfecta.' }), h('li', { txt: 'Doble toque sobre una nota o texto para editarlo.' })]),
      h('h3', { txt: 'Mando Xbox' }), h('table', {}, [fila('Stick izquierdo', 'Mover el cursor'), fila('Stick derecho / LT / RT', 'Mover el lienzo / zoom'), fila('A', 'Dibujar o pulsar (mantener)'), fila('X', 'Borrar (mantener)'), fila('Y', 'Siguiente color'), fila('B / VISTA', 'Deshacer / Rehacer'), fila('LB / RB', 'Página anterior / siguiente (ideal para presentar)'), fila('Cruceta', 'Herramienta ◀ ▶ y grosor ▲ ▼'), fila('L3 / R3', 'Láser (mantener) / ajustar vista'), fila('MENU', 'Abrir el menú')]),
      h('h3', { txt: 'Colaboración' }), h('p', { txt: 'Pulsa Colaborar, crea la sala y envía el enlace (hasta 4 personas). Todos ven los cursores y los trazos en vivo. El anfitrión puede dejar a las personas invitadas en solo lectura y presentar para que las demás sigan su vista.' })
    ]), { ancho: 620 });
  }
  U.abrirAyuda = abrirAyuda;

  // ---------- temporizador y votos ----------
  let sonado = '';
  function abrirTemporizador() {
    const cont = h('div', { cls: 'tmr' }), disp = h('div', { cls: 'tmr-num', 'aria-live': 'off' });
    const act = () => { const t = U.tiempoRestante(); disp.textContent = fmtT(t.resto); };
    const fijar = ms => app.fijarTimer({ dur: ms, resto: ms, fin: 0, run: false, id: nuevoId(4) });
    const grid = h('div', { cls: 'segs grande' }, [1, 3, 5, 10, 15].map(m => h('button', { type: 'button', cls: 'seg', 'data-f': 1, txt: m + ' min', on: { click: () => { fijar(m * 60000); act(); } } })));
    const pers = h('input', { type: 'number', min: 1, max: 180, value: 5, 'data-f': 1, 'aria-label': 'Minutos personalizados', style: 'width:5em' });
    cont.append(disp, grid, h('label', { cls: 'fila' }, [h('span', { txt: 'Personalizado (min)' }), h('span', {}, [pers, btn('Fijar', () => { fijar(Math.max(1, +pers.value || 1) * 60000); act(); }, 'peq')])]),
      h('div', { cls: 'fila-bot' }, [btn('Iniciar', () => { app.controlTimer('iniciar'); act(); }, 'principal', 'presentar'), btn('Pausar', () => { app.controlTimer('pausa'); act(); }), btn('Reiniciar', () => { app.controlTimer('reiniciar'); act(); }), btn('Quitar', () => { app.fijarTimer(null); m.cerrar(); })]),
      h('p', { cls: 'nota-aj', txt: 'El temporizador es compartido: todas las personas conectadas lo ven y oyen el aviso al terminar.' }));
    const iv = setInterval(act, 250);
    const m = modal('Temporizador', cont, { ancho: 420, alCerrar: () => clearInterval(iv) }); act();
  }
  const fmtT = ms => { const s = Math.ceil(ms / 1000), mm = Math.floor(s / 60); return String(mm).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  U.tiempoRestante = () => {
    const t = doc.meta('timer'); if (!t) return { resto: 0, run: false };
    if (t.run) return { resto: Math.max(0, t.fin - Date.now()), run: true, t };
    return { resto: t.resto, run: false, t };
  };
  U.timerCambio = () => {
    const t = doc.meta('timer');
    B.timer.classList.toggle('oculto', !t);
    if (t) { const r = U.tiempoRestante(); B.timer.textContent = '⏱ ' + fmtT(r.resto); B.timer.classList.toggle('corre', r.run); B.timer.classList.toggle('fin', r.resto <= 0 && !!t.run); }
  };
  setInterval(() => {
    U.timerCambio();
    const r = U.tiempoRestante();
    if (r.t && r.run && r.resto <= 0 && sonado !== r.t.id + r.t.fin) { sonado = r.t.id + r.t.fin; app.sonarFin(); U.aviso('⏱ ¡Se acabó el tiempo!', 5000); }
  }, 300);

  // ---------- colaboracion ----------
  function abrirColab() {
    const C = app.colab, Red = window.Red;
    const cont = h('div', { cls: 'colab' });
    const pintar = () => {
      cont.replaceChildren();
      const conectado = Red && Red.conectado;
      if (!conectado) {
        cont.append(h('p', { txt: 'Trabaja con hasta 3 personas más en el mismo tablero, en tiempo real y sin servidor: creas una sala, envías el enlace y listo. Lo que dibujen aparece en vivo con su nombre y color.' }),
          btn('Crear sala o unirme', () => { m.cerrar(); app.abrirLobby(); }, 'principal grande', 'usuarios'));
        return;
      }
      const lista = h('ul', { cls: 'lista-j' });
      for (const j of Red.lista()) {
        const yo = j.id === Red.miId;
        const ro = !!C.ro[j.id];
        lista.append(h('li', {}, [
          h('span', { cls: 'punto', style: `background:${j.color}` }), h('span', { cls: 'nom', txt: j.nombre + (yo ? ' (tú)' : '') + (j.id === 0 ? ' · anfitrión' : '') }),
          C.presentador === j.id ? h('span', { cls: 'etq-p', txt: 'presenta' }) : null,
          Red.esAnfitrion && !yo ? h('label', { cls: 'chk' }, [h('input', { type: 'checkbox', ...(ro ? { checked: '' } : {}), 'data-f': 1, on: { change: e => C.fijarSoloLectura(j.id, e.target.checked) } }), h('span', { txt: 'Solo lectura' })]) : (ro ? h('span', { cls: 'etq-p', txt: 'solo lectura' }) : null)
        ]));
      }
      cont.append(lista);
      const yoPres = C.presentador === Red.miId;
      cont.append(h('div', { cls: 'fila-bot' }, [
        btn(yoPres ? 'Dejar de presentar' : 'Presentar (que me sigan)', () => { C.presentar(!yoPres); pintar(); }, yoPres ? 'peligro' : 'principal', 'presentar'),
        btn('Invitar a otra persona', () => { m.cerrar(); app.abrirLobby(); }, '', 'mas')
      ]));
      cont.append(h('label', { cls: 'fila' }, [h('span', { txt: 'Seguir al presentador' }), h('input', { type: 'checkbox', 'data-f': 1, ...(C.siguiendo ? { checked: '' } : {}), on: { change: e => { C.siguiendo = e.target.checked; } } })]));
      if (Red.esAnfitrion) cont.append(h('label', { cls: 'fila' }, [h('span', {}, ['Las personas nuevas entran en solo lectura', h('small', { txt: 'Puedes cambiarlo por persona arriba.' })]), h('input', { type: 'checkbox', 'data-f': 1, ...(app.ajustes.invitadosLectura ? { checked: '' } : {}), on: { change: e => app.setAjuste('invitadosLectura', e.target.checked) } })]));
      cont.append(btn('Salir de la sala', () => { Red.salir(); m.cerrar(); }, 'peq'));
    };
    const m = modal('Colaborar', cont, { ancho: 480 }); pintar();
    U.colabPanel = pintar; m.alCerrar = () => { U.colabPanel = null; };
  }

  U.colabCambio = (soloOps) => {
    const C = app.colab, Red = window.Red;
    if (soloOps) { U.paginasCambio(); U.refrescar(); return; }
    const n = Red && Red.conectado ? Red.cuantos() : 0;
    const ins = B.colab.querySelector('.insignia'); ins.classList.toggle('oculto', n < 2); ins.textContent = n;
    B.colab.classList.toggle('activo', n >= 2);
    const bn = $('#banner');
    if (C && C.presentador != null && C.activo) {
      const yo = Red && C.presentador === Red.miId;
      bn.replaceChildren(h('span', { txt: yo ? 'Estás presentando: las demás personas siguen tu vista' : `${C.nombreDe(C.presentador)} está presentando`}), yo ? btn('Dejar de presentar', () => C.presentar(false), 'peq') : btn(C.siguiendo ? 'Dejar de seguir' : 'Seguir', () => { C.siguiendo = !C.siguiendo; U.colabCambio(); }, 'peq'));
      bn.classList.remove('oculto');
    } else bn.classList.add('oculto');
    if (U.colabPanel) U.colabPanel();
    U.refrescar();
  };

  // ---------- comentarios ----------
  U.abrirComentario = (id, nuevo) => {
    const e = doc.obj(id); if (!e) return;
    const ta = h('textarea', { cls: 'campo', rows: 4, maxlength: 500, placeholder: 'Escribe un comentario…', 'aria-label': 'Comentario', 'data-f': 1 });
    ta.value = e.v.texto || '';
    const mio = !e.v.autor || e.v.autor === app.yo().nombre || nuevo, ed = app.puedeEditar();
    if (!mio || !ed) ta.readOnly = true;
    const cont = h('div', {}, [h('p', { cls: 'meta', txt: 'De ' + (e.v.autor || 'alguien') }), ta, ed ? h('div', { cls: 'fila-bot' }, [
      btn('Guardar', () => { doc.cambiar([{ k: 'o', id, p: { texto: ta.value.trim(), autor: e.v.autor || app.yo().nombre } }]); m.cerrar(); }, 'principal'),
      btn(e.v.res ? 'Reabrir' : 'Resolver', () => { doc.cambiar([{ k: 'o', id, p: { res: !e.v.res } }]); m.cerrar(); }),
      btn('Borrar', () => { doc.cambiar([{ k: 'o', id, p: { del: true } }]); H().ponerSel([]); m.cerrar(); }, 'peligro')
    ]) : null]);
    const m = modal('Comentario', cont, { ancho: 420, alCerrar: () => { const e2 = doc.obj(id); if (e2 && nuevo && !e2.v.texto) doc.cambiar([{ k: 'o', id, p: { del: true } }]); } });
    setTimeout(() => ta.focus(), 50);
  };

  U.mostrarBienvenida = () => {
    if (app.ls.leer('bienvenida', false)) return;
    app.ls.escribir('bienvenida', true);
    modal('Bienvenido a Pizarra', h('div', { cls: 'ayuda' }, [h('ul', {}, [
      h('li', { txt: 'Dibuja con el lápiz, ratón o dedo; todo se guarda solo en este dispositivo.' }),
      h('li', { txt: 'Mantén quieto el trazo al terminar para convertirlo en forma perfecta.' }),
      h('li', { txt: 'Pellizca o usa la rueda para acercar; dos dedos mueven el lienzo.' }),
      h('li', { txt: 'Pulsa Colaborar para trabajar con hasta 3 personas más. Mando Xbox: MENU abre el menú.' })]),
      btn('Empezar', () => U.cerrar(), 'principal')]), { ancho: 460 });
  };

  U.fps = txt => { const f = $('#fps'); f.classList.toggle('oculto', !txt); f.textContent = txt || ''; };
  U.mostrarProps = mostrarProps; U.alternarPaginas = alternarPaginas;
  U.abrirPlantillas = abrirPlantillas; U.abrirExportar = abrirExportar; U.abrirColab = abrirColab; U.abrirTemporizador = abrirTemporizador; U.abrirFondo = abrirFondo; U.abrirCapas = abrirCapas; U.abrirVersiones = abrirVersiones;
  U.invalidarProps = () => { sigProps = ''; };
  return U;
}
