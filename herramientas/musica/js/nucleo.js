/* Nucleo comun de Estudio de Musica: bus de eventos, utilidades DOM, iconos, avisos, logros y AudioContext unico. window.Mu */
(function (g) {
  'use strict';
  const T = g.Tr, Mu = g.Mu = { h: (t, p, k) => T.h(t, p && typeof p.on === 'function' ? Object.assign({}, p, { on: { click: p.on } }) : p, k), esc: T.esc, aviso: (m, t) => T.aviso(m, t), oyentes: {}, ls: T.ls };
  Mu.on = (ev, fn) => { (Mu.oyentes[ev] = Mu.oyentes[ev] || []).push(fn); return () => { Mu.oyentes[ev] = (Mu.oyentes[ev] || []).filter((f) => f !== fn); }; };
  Mu.emit = (ev, ...a) => { (Mu.oyentes[ev] || []).slice().forEach((f) => { try { f(...a); } catch (e) { console.error(e); } }); };
  Mu.logro = (id) => { try { g.CuentaTrabajos.logro(id); } catch (e) {} };
  Mu.xp = (n) => { try { g.CuentaTrabajos.xp(n); } catch (e) {} };
  Mu.$ = (s, r) => (r || document).querySelector(s); Mu.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  Mu.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const P = {
    play: 'M8 5v14l11-7z', pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z', prev: 'M6 5h2v14H6zM20 5v14L9 12z', next: 'M16 5h2v14h-2zM4 5v14l11-7z', stop: 'M6 6h12v12H6z', rec: 'M12 7a5 5 0 1 0 .01 0z',
    shuffle: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5', repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3', repeat1: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3M11 10h1v4',
    heart: 'M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 22l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z', star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1z',
    vol: 'M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13', mute: 'M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', plus: 'M12 5v14M5 12h14', close: 'M6 6l12 12M18 6 6 18',
    car: 'M5 17h14M3 13l2-6h14l2 6v4H3zM7 17v2M17 17v2M7.5 13h.01M16.5 13h.01', file: 'M14 3H6v18h12V7zM14 3v4h4', folder: 'M3 6h6l2 2h10v11H3z', mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3', trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14', edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
    music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z', down: 'M12 4v12M6 12l6 6 6-6M5 21h14', up: 'M12 20V8M6 12l6-6 6 6', clock: 'M12 3a9 9 0 1 0 .01 0zM12 7v5l3 2', mas: 'M12 5v14M5 12h14', ab: 'M4 18l4-12 4 12M5.5 14h5M15 6h3a2 2 0 0 1 0 4h-3M15 10h3.5a2 2 0 0 1 0 4H15z', sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
    radio: 'M4 9h16v11H4zM7 9l9-5M8 14h.01M8 17h4M15 14h2M15 17h2', lyr: 'M5 5h14M5 10h14M5 15h9M5 20h6', wave: 'M2 12h3l2-7 3 14 3-10 2 5 2-2h5'
  };
  Mu.ico = (n, c) => '<svg viewBox="0 0 24 24" aria-hidden="true"' + (c ? ' class="' + c + '"' : '') + (n === 'play' || n === 'pause' || n === 'prev' || n === 'next' || n === 'stop' || n === 'rec' ? ' fill="currentColor" stroke="none"' : '') + '><path d="' + (P[n] || P.music) + '"/></svg>';
  Mu.boton = (ico, etiqueta, fn, cls, extra) => { const b = Mu.h('button', Object.assign({ type: 'button', cls: 'mu-ib ' + (cls || ''), 'aria-label': etiqueta, title: etiqueta, on: { click: fn } }, extra || {})); b.innerHTML = Mu.ico(ico); return b; };
  Mu.tiempo = (s) => g.MuCalc.tiempo(s);
  Mu.hex = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  Mu.colorDe = (s) => 'hsl(' + (Mu.hex(s || '?') % 360) + ' 55% 42%)';
  /* AudioContext unico (se crea con el primer gesto) */
  let ctx = null;
  Mu.ctx = () => {
    if (!ctx) { const A = g.AudioContext || g.webkitAudioContext; try { ctx = new A({ latencyHint: (g.MuDatos && g.MuDatos.ajuste('calidad')) || 'interactive' }); } catch (e) { ctx = new A(); } ctx.onstatechange = () => Mu.emit('ctx', ctx.state); }
    return ctx;
  };
  Mu.reanudar = () => { const c = Mu.ctx(); return c.state === 'suspended' ? c.resume().catch(() => {}) : Promise.resolve(); };
  Mu.soloVisible = (el) => !!(el && el.offsetParent !== null && !document.hidden);
  Mu.descarga = (datos, nombre, tipo) => T.descargar(datos instanceof Blob ? datos : new Blob([datos], { type: tipo || 'application/octet-stream' }), nombre);
  Mu.buscaTexto = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
})(window);
