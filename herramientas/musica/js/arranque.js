/* Arranque del Estudio de Musica: tema, cuenta y nube, pestanas, mini reproductor, atajos de teclado y mando. */
(function (g) {
  'use strict';
  const T = g.Tr, Mu = g.Mu, D = g.MuDatos, B = g.MuBib, Q = g.MuCola, M = g.MuMotor, A = g.MuApp, CC = g.CuentaTrabajos, E = g.MuEst, h = Mu.h;
  T.tema(document.getElementById('btn-tema'));
  CC.integrar({ id: 'musica', alm: D.alm, cols: D.COLS, sync: true, etiqueta: 'el índice de tu biblioteca (títulos, artistas, favoritas y valoraciones), tus listas, emisoras, podcasts, proyectos de estudio y progreso de oído', nombreLocal: 'pistas', avisoLocal: 'Los archivos de audio nunca se suben.', alAplicar: async (n) => { await D.recargar(); Mu.aviso('Se actualizaron ' + n + ' elemento(s) desde tu cuenta.'); } });
  CC.chip(document.querySelector('.tr-barra'), document.getElementById('btn-tema'));
  A.aplicarAccesibilidad();
  /* ---- navegacion ---- */
  const SUBS = { biblioteca: 'mu-bib', ahora: 'mu-ahora', cola: 'mu-cola', listas: 'mu-listas', radio: 'mu-radio' };
  const subs = h('div', { cls: 'mu-sub', role: 'tablist', 'aria-label': 'Reproductor', id: 'mu-sub-repro' });
  [['biblioteca', 'Biblioteca'], ['ahora', 'Ahora suena'], ['cola', 'Cola'], ['listas', 'Listas'], ['radio', 'Radio y podcasts']].forEach(([id, t], i) => subs.appendChild(h('button', { type: 'button', role: 'tab', cls: 'mu-pill', 'data-s': id, id: 'mur-' + id, 'aria-selected': i === 0, tabindex: i ? -1 : 0, txt: t, on: () => A.sub(id) })));
  subs.addEventListener('keydown', (e) => { const b = Array.from(subs.children), i = b.indexOf(document.activeElement); if (i < 0 || !/Arrow/.test(e.key)) return; e.preventDefault(); const n = b[(i + (e.key === 'ArrowRight' ? 1 : -1) + b.length) % b.length]; n.focus(); A.sub(n.dataset.s); });
  const vr = document.getElementById('v-repro'); vr.appendChild(subs); Object.values(SUBS).forEach((id, i) => vr.appendChild(h('div', { id, hidden: i > 0, role: 'tabpanel' })));
  A.sub = function (id) {
    subs.querySelectorAll('.mu-pill').forEach((b) => { const on = b.dataset.s === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; }); Object.entries(SUBS).forEach(([k, v]) => { document.getElementById(v).hidden = k !== id; });
    if (id === 'ahora') A.pintarAhora(document.getElementById('mu-ahora')); else if (id === 'listas') A.pintarListas(); else if (id === 'cola') A.pintarCola(); else if (id === 'radio') { const r = document.getElementById('mu-radio'); if (!r.dataset.listo) { r.dataset.listo = 1; A.pintarRadio(r); } } else if (id === 'biblioteca' && !document.getElementById('mu-bib').dataset.listo) { document.getElementById('mu-bib').dataset.listo = 1; A.pintarBiblioteca(document.getElementById('mu-bib')); }
  };
  const tabs = T.tabs(document.getElementById('pestanas'), (v) => { if (v === 'estudio') { const p = document.getElementById('v-estudio'); if (!p.dataset.listo) { p.dataset.listo = 1; E.montar(p); } } else if (v === 'aprender') { const p = document.getElementById('v-aprender'); if (!p.dataset.listo) { p.dataset.listo = 1; A.aprender.montar(p); } } else if (v === 'ajustes') A.pintarAjustes(document.getElementById('v-ajustes')); if (v !== 'estudio') { E.soltarTodo && E.soltarTodo(); if (E.sec && E.sec.parar) E.sec.parar(); } });
  A.irA = (tab, sub) => { tabs.ir(tab); if (tab === 'repro' && sub) A.sub(sub); };
  Mu.on('ajuste', (k) => { if (['bajoConsumo', 'reducirMov', 'textoGrande', 'altoContraste'].includes(k)) A.aplicarAccesibilidad(); });
  /* ---- datos y estado inicial ---- */
  D.cargar().then(async () => { await B.cargarManejadores(); Q.restaurar(); A.sub('biblioteca'); A.montarMini(); if (Q.actual()) { M.estado.item = Q.actual(); Mu.emit('pista', Q.actual()); } Mu.emit('listo'); g.MuListo = true; }).catch((e) => { console.error(e); Mu.aviso('No se pudo abrir el almacenamiento local: ' + e.message, 'error'); });
  /* ---- atajos de teclado ---- */
  addEventListener('keydown', (e) => {
    const el = document.activeElement, tag = el && el.tagName; if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || document.querySelector('dialog[open]')) return;
    const escribiendo = /INPUT|TEXTAREA|SELECT/.test(tag || '') && !(el.type === 'range' || el.type === 'checkbox'); if (escribiendo) return;
    const cond = document.body.classList.contains('mu-cond-abierto'); if (cond && e.key === 'Escape') { A.conduccion(false); return; }
    const repro = !document.getElementById('v-repro').hidden; if (!repro && !cond) return; if (tag === 'BUTTON' && (e.code === 'Space' || e.key === 'Enter')) return; const k = e.key.toLowerCase();
    const sirve = () => { e.preventDefault(); return true; };
    if (e.code === 'Space') { if (sirve()) Q.reproducirActual(); } else if (e.key === 'ArrowRight') { if (el && el.type === 'range' && el.id !== 'mu-pos') return; if (sirve()) e.shiftKey ? Q.siguiente(true) : M.salto(5); } else if (e.key === 'ArrowLeft') { if (el && el.type === 'range' && el.id !== 'mu-pos') return; if (sirve()) e.shiftKey ? Q.anterior() : M.salto(-5); }
    else if (e.key === 'ArrowUp' && !(el && el.type === 'range')) { if (sirve()) M.volumen(M.estado.vol + 0.05); } else if (e.key === 'ArrowDown' && !(el && el.type === 'range')) { if (sirve()) M.volumen(M.estado.vol - 0.05); }
    else if (k === 'm') M.volumen(M.estado.vol > 0 ? 0 : 0.8); else if (k === 's') Q.aleatorio(!D.ajuste('aleatorio')); else if (k === 'r') Q.repetir({ off: 'all', all: 'one', one: 'off' }[D.ajuste('repetir')]);
    else if (k === 'l') { const p = M.estado.item && D.pistas.get(M.estado.item.id); if (p) g.MuUI.favorita(p); } else if (k === 'c') A.conduccion(!cond); else if (k === 'n') Q.siguiente(true); else if (k === 'p') Q.anterior();
  });
  /* ---- mando Xbox ---- */
  let padId = 0; const estadoPad = () => {
    if (!g.Mando) return; g.Mando.leer(); if (!g.Mando.conectado) return; const P = (b) => g.Mando.pulsado(b);
    if (P('A')) Q.reproducirActual(); if (P('RB')) Q.siguiente(true); if (P('LB')) Q.anterior(); if (P('DER')) M.salto(10); if (P('IZQ')) M.salto(-10); if (P('ARRIBA')) M.volumen(M.estado.vol + 0.1); if (P('ABAJO')) M.volumen(M.estado.vol - 0.1);
    if (P('X')) { const p = M.estado.item && D.pistas.get(M.estado.item.id); if (p) g.MuUI.favorita(p); } if (P('Y')) Q.aleatorio(!D.ajuste('aleatorio')); if (P('B')) Q.repetir({ off: 'all', all: 'one', one: 'off' }[D.ajuste('repetir')]); if (P('MENU')) A.conduccion(!document.body.classList.contains('mu-cond-abierto'));
  };
  const arrancarPad = () => { if (!padId) padId = setInterval(() => { if (!document.hidden) estadoPad(); }, 90); };
  addEventListener('gamepadconnected', arrancarPad); if (navigator.getGamepads && Array.from(navigator.getGamepads()).some(Boolean)) arrancarPad();
  /* ---- ahorro de bateria ---- */
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (E.sec && E.sec.parar) E.sec.parar(); } });
  g.MuPrueba = { D, B, Q, M, A, E, Mu };
})(window);
