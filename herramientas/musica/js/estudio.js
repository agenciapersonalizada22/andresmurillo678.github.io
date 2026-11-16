/* Estudio: nucleo de audio compartido (salida, medidor), sintetizador en vivo, teclado en pantalla/fisico, Web MIDI y subpestanas. window.MuEst */
(function (g) {
  'use strict';
  const Mu = g.Mu, D = g.MuDatos, h = Mu.h, T = g.Tr, E = g.MuEst = { sint: null, patch: null, oct: 4, subs: {} };
  const NOMBRES = { lat: ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'], ang: ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] };
  E.nombreNota = (m) => (D.ajuste('notacion') === 'anglo' ? NOMBRES.ang : NOMBRES.lat)[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  E.nodos = function () {
    if (E.n) return E.n; const ctx = Mu.ctx(); const master = ctx.createGain(), an = ctx.createAnalyser(); master.gain.value = 0.9; an.fftSize = 1024; master.connect(an); master.connect(ctx.destination); E.n = { ctx, master, an }; return E.n;
  };
  E.sintVivo = function () { const n = E.nodos(); if (!E.sint) { E.sint = g.MuSintes.crear(n.ctx, n.master, E.patch || cargarPatch()); E.patch = E.sint.patch; } return E.sint; };
  function cargarPatch() { try { const o = JSON.parse(Mu.ls('musica_patch_dispositivo') || 'null'); if (o && o.o1) return o; } catch (e) {} return g.MuSintes.patchBase(); }
  E.guardarPatch = () => Mu.ls('musica_patch_dispositivo', JSON.stringify(E.sint ? E.sint.patch : E.patch));
  E.medidor = function (cv) { // medidor de nivel simple (pico) para cualquier analizador
    const x = cv.getContext('2d'); let raf = 0, buf = null, pico = 0;
    const f = () => { raf = requestAnimationFrame(f); if (!Mu.soloVisible(cv)) return; const an = E.n && E.n.an; if (!an) return; if (!buf) buf = new Float32Array(an.fftSize); an.getFloatTimeDomainData(buf); let m = 0; for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i])); pico = Math.max(m, pico * 0.92); const w = cv.width, hh = cv.height, v = Math.min(1, Math.sqrt(pico)); x.clearRect(0, 0, w, hh); x.fillStyle = 'rgba(128,128,160,.2)'; x.fillRect(0, 0, w, hh); x.fillStyle = v > 0.92 ? '#e5484d' : getComputedStyle(cv).getPropertyValue('--acento'); x.fillRect(0, 0, w * v, hh); };
    return { iniciar() { if (!raf) raf = requestAnimationFrame(f); }, detener() { cancelAnimationFrame(raf); raf = 0; } };
  };
  /* ---- subpestanas del Estudio ---- */
  E.montar = function (raiz) {
    const subs = [['sint', 'Sintetizador'], ['sec', 'Secuenciador'], ['metro', 'Metrónomo'], ['afin', 'Afinador'], ['graba', 'Grabadora'], ['anal', 'Analizador']];
    const bar = h('div', { cls: 'mu-sub', role: 'tablist', 'aria-label': 'Herramientas del estudio', id: 'mu-sub-estudio' }); const cont = h('div');
    subs.forEach(([id, t], i) => { bar.appendChild(h('button', { type: 'button', role: 'tab', cls: 'mu-pill', id: 'mue-' + id, 'data-s': id, 'aria-selected': i === 0, tabindex: i ? -1 : 0, txt: t, on: () => E.ir(id) })); cont.appendChild(h('section', { id: 'mue-p-' + id, role: 'tabpanel', hidden: i > 0, 'aria-labelledby': 'mue-' + id })); });
    bar.addEventListener('keydown', (e) => { const b = Array.from(bar.children), i = b.indexOf(document.activeElement); if (i < 0 || !/Arrow/.test(e.key)) return; e.preventDefault(); const n = b[(i + (e.key === 'ArrowRight' ? 1 : -1) + b.length) % b.length]; n.focus(); E.ir(n.dataset.s); });
    raiz.append(bar, cont); E.ir('sint');
  };
  E.ir = function (id) { E.actual = id; document.querySelectorAll('#mu-sub-estudio .mu-pill').forEach((b) => { const on = b.dataset.s === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; }); document.querySelectorAll('#v-estudio [id^=mue-p-]').forEach((p) => { p.hidden = p.id !== 'mue-p-' + id; }); const p = document.getElementById('mue-p-' + id); if (p && !p.dataset.listo && E.subs[id]) { p.dataset.listo = 1; E.subs[id](p); } if (E.subs[id + '_vis']) E.subs[id + '_vis'](true); Object.keys(E.subs).filter((k) => k.endsWith('_vis') && k !== id + '_vis').forEach((k) => E.subs[k](false)); };
  E.visible = () => { const v = document.getElementById('v-estudio'); return v && !v.hidden; };
  E.soltarTodo = () => { if (E.sint) E.sint.todoOff(); Mu.emit('midi-nota-off-todo'); };
})(window);
