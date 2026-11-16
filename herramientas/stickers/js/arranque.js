/* Arranque del Estudio de Stickers: tema, cuenta y nube, vistas, atajos y autoguardado. */
(function (g) {
  'use strict';
  const T = g.Tr, A = g.StApp, CC = g.CuentaTrabajos, Dt = g.StDatos, D = g.StDoc, H = g.StHerr, V = g.StVista;
  T.tema(document.getElementById('btn-tema'));
  CC.integrar({ id: 'stickers', alm: Dt.alm, cols: Dt.COLS, sync: true, etiqueta: 'tus packs, los stickers de hasta 150 KB y la ficha de tus proyectos', nombreLocal: 'proyectos', avisoLocal: 'Los píxeles de los proyectos y los stickers pesados o animados no se suben.', alAplicar: (n) => { T.aviso('Se actualizaron ' + n + ' elemento(s) desde tu cuenta.'); A.emitir('packs'); A.emitir('stickers'); A.emitir('proyectos'); } });
  CC.chip(document.querySelector('.tr-barra'), document.getElementById('btn-tema'));
  CC.bloque(document.getElementById('v-cuenta'));
  D.vacio(512, 512);
  A.iniciarEstudio(); A.iniciarPaneles(); A.iniciarAnim(); A.iniciarPacks(); A.iniciarImprimir(); A.iniciarLote(); A.iniciarHistorial();
  const tabs = T.tabs(document.getElementById('pestanas'), (v) => { if (v === 'imprimir') A.alMostrarImprimir(); if (v === 'historial') A.alMostrarHistorial(); if (v === 'estudio') setTimeout(() => V.ajustar(), 30); });
  A.ir = (v) => tabs.ir(v);
  setInterval(() => { if (D.id && D.sucio && Dt.ajuste('autoguardar') !== false && !document.hidden) A.guardarProyecto(true); }, 20000);
  addEventListener('beforeunload', (e) => { if (D.sucio && D.capas.length) { e.preventDefault(); e.returnValue = ''; } });

  /* atajos de teclado */
  const MAPA = { v: 'mover', h: 'mano', e: 'borrar', r: 'restaurar', w: 'varita', k: 'color', l: 'lazo', p: 'poligono', s: 'inteligente', b: 'pintar' };
  addEventListener('keydown', (e) => {
    const el = document.activeElement, tag = el && el.tagName, escribiendo = /INPUT|TEXTAREA|SELECT/.test(tag || '') && !(el.type === 'range' || el.type === 'checkbox' || el.type === 'button');
    if (escribiendo || e.isComposing || document.querySelector('dialog[open]')) return; const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey, enEstudio = !document.getElementById('v-estudio').hidden;
    if (mod && k === 'z') { e.preventDefault(); const r = e.shiftKey ? D.rehacer() : D.deshacer(); if (r) T.aviso((e.shiftKey ? 'Rehecho: ' : 'Deshecho: ') + r); return; }
    if (mod && k === 'y') { e.preventDefault(); const r = D.rehacer(); if (r) T.aviso('Rehecho: ' + r); return; }
    if (mod && k === 's') { e.preventDefault(); A.guardarProyecto(); return; }
    if (!enEstudio) return;
    if (mod && k === 'd') { e.preventDefault(); const c = D.capaSel(); if (c) D.duplicar(c.id); return; }
    if (mod || e.altKey) return;
    if (MAPA[k]) { A.elegirHerramienta(MAPA[k]); return; }
    if (k === '[' || k === ']') { H.o.tam = Math.max(2, Math.min(240, H.o.tam + (k === ']' ? 4 : -4))); A.pintarOpciones(); V.repintar(); return; }
    if (k === '+' || k === '=') { V.zoomA(1.25); return; } if (k === '-') { V.zoomA(0.8); return; } if (k === '0') { V.ajustar(); return; }
    if (k === 'enter' && H.activa === 'poligono') { H.cerrarPoligono(); return; } if (k === 'escape') { H.cancelar(); H.quitarSel(); H.cancelarPrevia(); return; }
    if (k === 'delete' || k === 'backspace') { e.preventDefault(); if (H.sel) H.selAccion('borrar'); else { const c = D.capaSel(); if (c) D.borrar(c.id); } return; }
    if (k.startsWith('arrow')) { const c = D.capaSel(); if (!c) return; e.preventDefault(); const p = e.shiftKey ? 10 : 1, dx = k === 'arrowleft' ? -p : k === 'arrowright' ? p : 0, dy = k === 'arrowup' ? -p : k === 'arrowdown' ? p : 0; D.propiedad(c.id, { x: c.x + dx, y: c.y + dy }, 'flecha'); }
  });
  /* ganchos para pruebas automatizadas */
  g.StPrueba = { D, H, V, A, Dt, R: g.StRender, X: g.StExportar };
})(window);
