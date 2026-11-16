/* Estudio > Sintetizador: teclado multitactil, teclado fisico, Web MIDI, parametros de osciladores, filtro, ADSR, LFO y efectos. */
(function (g) {
  'use strict';
  const Mu = g.Mu, D = g.MuDatos, E = g.MuEst, SS = g.MuSintes, h = Mu.h, esc = Mu.esc, A = g.MuApp;
  const ESPEC = [
    ['Oscilador 1', [['Forma', 'o1.t', ['sine', 'triangle', 'sawtooth', 'square']], ['Octava', 'o1.oct', -2, 2, 1, (v) => v], ['Afinación fina', 'o1.det', -50, 50, 1, (v) => v + ' ¢'], ['Nivel', 'o1.vol', 0, 1, 0.01, (v) => Math.round(v * 100) + '%']]],
    ['Oscilador 2', [['Forma', 'o2.t', ['sine', 'triangle', 'sawtooth', 'square']], ['Octava', 'o2.oct', -2, 2, 1, (v) => v], ['Desafinación', 'o2.det', -50, 50, 1, (v) => v + ' ¢'], ['Nivel', 'o2.vol', 0, 1, 0.01, (v) => Math.round(v * 100) + '%']]],
    ['Filtro', [['Tipo', 'filtro.t', ['lowpass', 'highpass', 'bandpass']], ['Corte', 'filtro.fc', 80, 12000, 1, (v) => Math.round(v) + ' Hz', 'log'], ['Resonancia', 'filtro.q', 0.2, 16, 0.1, (v) => v.toFixed(1)], ['Cantidad de envolvente', 'filtro.env', 0, 5, 0.1, (v) => v.toFixed(1) + ' oct']]],
    ['Envolvente de amplitud (ADSR)', [['Ataque', 'ea.a', 0.002, 2, 0.001, (v) => v.toFixed(3) + ' s', 'log'], ['Caída', 'ea.d', 0.01, 3, 0.01, (v) => v.toFixed(2) + ' s', 'log'], ['Sostén', 'ea.s', 0, 1, 0.01, (v) => Math.round(v * 100) + '%'], ['Relajación', 'ea.r', 0.01, 4, 0.01, (v) => v.toFixed(2) + ' s', 'log']]],
    ['Envolvente de filtro (ADSR)', [['Ataque', 'ef.a', 0.002, 2, 0.001, (v) => v.toFixed(3) + ' s', 'log'], ['Caída', 'ef.d', 0.01, 3, 0.01, (v) => v.toFixed(2) + ' s', 'log'], ['Sostén', 'ef.s', 0, 1, 0.01, (v) => Math.round(v * 100) + '%'], ['Relajación', 'ef.r', 0.01, 4, 0.01, (v) => v.toFixed(2) + ' s', 'log']]],
    ['LFO', [['Forma', 'lfo.t', ['sine', 'triangle', 'sawtooth', 'square']], ['Destino', 'lfo.dest', [['pitch', 'Tono (vibrato)'], ['filtro', 'Filtro (wah)'], ['amp', 'Volumen (trémolo)']]], ['Velocidad', 'lfo.hz', 0.1, 20, 0.1, (v) => v.toFixed(1) + ' Hz', 'log'], ['Profundidad', 'lfo.prof', 0, 1, 0.01, (v) => Math.round(v * 100) + '%']]],
    ['Efectos', [['Distorsión', 'fx.dist', 0, 1, 0.01, (v) => Math.round(v * 100) + '%'], ['Chorus', 'fx.coro', 0, 1, 0.01, (v) => Math.round(v * 100) + '%'], ['Delay: mezcla', 'fx.delay', 0, 1, 0.01, (v) => Math.round(v * 100) + '%'], ['Delay: tiempo', 'fx.tiempo', 0.05, 1, 0.01, (v) => v.toFixed(2) + ' s'], ['Delay: repeticiones', 'fx.fb', 0, 0.9, 0.01, (v) => Math.round(v * 100) + '%'], ['Reverb: mezcla', 'fx.rev', 0, 1, 0.01, (v) => Math.round(v * 100) + '%'], ['Reverb: duración', 'fx.revT', 0.4, 6, 0.1, (v) => v.toFixed(1) + ' s'], ['Volumen general', 'vol', 0, 1, 0.01, (v) => Math.round(v * 100) + '%']]]
  ];
  const get = (o, r) => r.split('.').reduce((a, k) => (a == null ? a : a[k]), o), set = (o, r, v) => { const p = r.split('.'), u = p.pop(); let x = o; p.forEach((k) => { x = x[k] = x[k] || {}; }); x[u] = v; };
  const TECLAS_B = 'zsxdcvgbhnjm,l.;/', TECLAS_A = 'q2w3er5t6y7ui9o0p';
  const BLANCAS = [0, 2, 4, 5, 7, 9, 11], NEGRAS = { 0: 1, 1: 3, 3: 6, 4: 8, 5: 10 };
  let teclasEl = {}, sost = false, retenidas = new Set();
  function on(m, v) { const s = E.sintVivo(); Mu.reanudar(); s.on(m, v == null ? 0.8 : v); const k = teclasEl[m]; if (k) k.classList.add('on'); Mu.logro('primera_nota'); }
  function off(m) { if (sost) { retenidas.add(m); return; } E.sint && E.sint.off(m); const k = teclasEl[m]; if (k) k.classList.remove('on'); }
  E.nota = { on, off };
  function teclado(raiz) {
    const kb = h('div', { cls: 'mu-teclado', id: 'mu-teclado', role: 'group', 'aria-label': 'Teclado en pantalla', style: 'touch-action:none' }); teclasEl = {}; const base = 12 * (E.oct + 1), n = innerWidth < 520 ? 8 : 14;
    const bl = h('div', { cls: 'mu-blancas' }), ng = h('div', { cls: 'mu-negras' });
    for (let i = 0; i < n; i++) { const o = Math.floor(i / 7), p = BLANCAS[i % 7], m = base + 12 * o + p; const k = h('button', { type: 'button', cls: 'mu-tecla', 'data-m': m, 'aria-label': E.nombreNota(m), tabindex: -1 }); k.innerHTML = '<span>' + (p === 0 ? E.nombreNota(m) : '') + '</span>'; bl.appendChild(k); teclasEl[m] = k; }
    for (let i = 0; i < n; i++) { const idx = i % 7; if (NEGRAS[idx] != null && i < n - 1) { const m = base + 12 * Math.floor(i / 7) + NEGRAS[idx]; const k = h('button', { type: 'button', cls: 'mu-tecla mu-negra', 'data-m': m, 'aria-label': E.nombreNota(m), tabindex: -1, style: 'left:calc(' + ((i + 1) / n * 100) + '% - ' + (100 / n * 0.32) + '%);width:' + (100 / n * 0.64) + '%' }); ng.appendChild(k); teclasEl[m] = k; } }
    kb.append(bl, ng); const activos = new Map();
    const bajo = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.closest ? el.closest('.mu-tecla') : null; };
    kb.addEventListener('pointerdown', (e) => { e.preventDefault(); const k = bajo(e); if (!k) return; try { kb.setPointerCapture(e.pointerId); } catch (x) {} const m = +k.dataset.m; activos.set(e.pointerId, m); const r = k.getBoundingClientRect(); on(m, 0.55 + 0.45 * Math.min(1, (e.clientY - r.top) / r.height)); });
    kb.addEventListener('pointermove', (e) => { if (!activos.has(e.pointerId)) return; const k = bajo(e); if (!k) return; const m = +k.dataset.m, a = activos.get(e.pointerId); if (m !== a) { off(a); activos.set(e.pointerId, m); on(m, 0.75); } });
    const fin = (e) => { if (!activos.has(e.pointerId)) return; off(activos.get(e.pointerId)); activos.delete(e.pointerId); };
    kb.addEventListener('pointerup', fin); kb.addEventListener('pointercancel', fin); kb.addEventListener('lostpointercapture', fin);
    return kb;
  }
  E.subs.sint = function (p) {
    p.textContent = ''; E.sintVivo();
    const cab = h('div', { cls: 'tr-panel' }); cab.appendChild(h('h2', { txt: 'Sintetizador polifónico' }));
    const pre = h('select', { id: 'mu-presets', 'aria-label': 'Sonido', on: { change: () => { E.sint.aplicar(SS.PRESETS[pre.value]); E.patch = E.sint.patch; E.guardarPatch(); pintarParams(); Mu.logro('sonido_cambiado'); } } }); Object.keys(SS.PRESETS).forEach((n) => pre.appendChild(h('option', { value: n, txt: n }))); pre.insertBefore(h('option', { value: '', txt: 'Sonido personalizado', selected: true }), pre.firstChild);
    cab.appendChild(h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'mu-presets', txt: 'Sonido' }), pre]), h('div', {}, [h('label', { for: 'mu-oct', txt: 'Octava del teclado' }), h('select', { id: 'mu-oct', on: { change: function () { E.oct = +this.value; remontar(); } } }, [1, 2, 3, 4, 5, 6].map((o) => h('option', { value: o, txt: 'C' + o + '–B' + (o + 1), selected: o === E.oct })))])]));
    const kbw = h('div', { id: 'mu-kbw' }); cab.appendChild(kbw); const remontar = () => { E.soltarTodo(); kbw.textContent = ''; kbw.appendChild(teclado()); };
    remontar(); cab.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Toca con varios dedos o con el teclado del ordenador (Z-M y Q-P, dos octavas; Espacio = pedal de sostenido). Puedes deslizar el dedo por las teclas.' }));
    const midi = h('div', { cls: 'tr-acciones' }); const est = h('span', { cls: 'tr-ayuda', id: 'mu-midi-est', role: 'status', txt: 'MIDI: sin conectar.' }); midi.append(h('button', { type: 'button', cls: 'tr-btn tr-chico', id: 'mu-midi', txt: 'Conectar MIDI', on: conectarMIDI }), est, h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Silenciar todo', on: () => { E.soltarTodo(); document.querySelectorAll('.mu-tecla.on').forEach((k) => k.classList.remove('on')); } })); cab.appendChild(midi);
    const vu = h('canvas', { cls: 'mu-vu', width: 300, height: 10, 'aria-label': 'Medidor de nivel', role: 'img' }); cab.appendChild(vu); const med = E.medidor(vu); med.iniciar(); p.appendChild(cab);
    const par = h('div', { id: 'mu-params' }); p.appendChild(par);
    function pintarParams() {
      par.textContent = ''; const P = E.sint.patch;
      ESPEC.forEach(([nom, ctrls], gi) => { const d = h('details', { cls: 'st-det mu-det', open: gi < 3 }); d.appendChild(h('summary', { txt: nom })); ctrls.forEach(([etq, ruta, a, b, step, fmt, esc2], i) => { const id = 'mu-p-' + ruta.replace('.', '-'); if (Array.isArray(a)) { const s = h('select', { id, 'aria-label': etq, on: { change: () => { set(P, ruta, s.value); E.sint.aplicar(); E.guardarPatch(); } } }); a.forEach((o) => { const v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : ({ sine: 'Seno', triangle: 'Triángulo', sawtooth: 'Sierra', square: 'Cuadrada', lowpass: 'Paso bajo', highpass: 'Paso alto', bandpass: 'Paso banda' })[o]; s.appendChild(h('option', { value: v, txt: t, selected: get(P, ruta) === v })); }); d.appendChild(h('div', { cls: 'mu-rango' }, [h('label', { for: id, txt: etq }), s, h('span')])); return; }
        const cur = get(P, ruta) == null ? a : get(P, ruta), log = esc2 === 'log', toS = (v) => (log ? Math.log(v / a) / Math.log(b / a) * 1000 : v), fromS = (s) => (log ? a * Math.pow(b / a, s / 1000) : s); const o = h('output', { for: id, txt: fmt(cur) }), r = h('input', { type: 'range', id, min: log ? 0 : a, max: log ? 1000 : b, step: log ? 1 : step, value: toS(cur), 'aria-label': etq, on: { input: () => { const v = log ? fromS(+r.value) : +r.value; set(P, ruta, v); o.textContent = fmt(v); E.sint.aplicar(); E.guardarPatch(); pre.value = ''; } } }); d.appendChild(h('div', { cls: 'mu-rango' }, [h('label', { for: id, txt: etq }), r, o])); }); par.appendChild(d); });
    }
    pintarParams(); E.subs.sint_vis = (v) => { if (v) med.iniciar(); else { med.detener(); E.soltarTodo(); } };
    let midiAcc = null;
    async function conectarMIDI() {
      if (!navigator.requestMIDIAccess) { est.textContent = 'Este navegador no incluye Web MIDI (en iPhone/iPad y Firefox no está disponible). Usa el teclado en pantalla.'; return; }
      try { midiAcc = await navigator.requestMIDIAccess(); const enlazar = () => { const ins = Array.from(midiAcc.inputs.values()); ins.forEach((i) => { i.onmidimessage = (m) => { const [s, a, b] = m.data, t = s & 0xF0; if (t === 0x90 && b > 0) on(a, b / 127); else if (t === 0x80 || (t === 0x90 && !b)) off(a); else if (t === 0xE0) E.sint.pitchBend(((b << 7 | a) - 8192) / 8192 * 200); else if (t === 0xB0 && a === 64) { sost = b >= 64; if (!sost) { retenidas.forEach((m2) => off(m2)); retenidas.clear(); } } else if (t === 0xB0 && a === 1) { E.sint.patch.lfo.prof = b / 127; E.sint.aplicar(); } }; }); est.textContent = ins.length ? 'MIDI: ' + ins.map((i) => i.name).join(', ') : 'MIDI activo, pero no hay dispositivos conectados.'; if (ins.length) Mu.logro('midi'); }; midiAcc.onstatechange = enlazar; enlazar(); }
      catch (e) { est.textContent = 'No se pudo acceder a MIDI: ' + e.message; }
    }
    /* teclado fisico */
    addEventListener('keydown', (e) => {
      if (!E.visible() || E.actual !== 'sint' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; const el = document.activeElement; if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName) && el.type !== 'range') return;
      if (e.code === 'Space') { e.preventDefault(); sost = true; return; } const k = e.key.toLowerCase(); let i = TECLAS_B.indexOf(k), m; if (i >= 0) m = 12 * (E.oct + 1) + i; else { i = TECLAS_A.indexOf(k); if (i >= 0) m = 12 * (E.oct + 2) + i; } if (m != null) { e.preventDefault(); on(m, 0.8); }
    });
    addEventListener('keyup', (e) => { if (e.code === 'Space') { sost = false; retenidas.forEach((m2) => off(m2)); retenidas.clear(); return; } const k = e.key.toLowerCase(); let i = TECLAS_B.indexOf(k), m; if (i >= 0) m = 12 * (E.oct + 1) + i; else { i = TECLAS_A.indexOf(k); if (i >= 0) m = 12 * (E.oct + 2) + i; } if (m != null) off(m); });
    addEventListener('blur', () => E.soltarTodo());
  };
})(window);
