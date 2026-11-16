/* Reproductor > Ahora suena, mini reproductor persistente, modo conduccion, panel de sonido (EQ, compresor, normalizacion) y reproduccion (velocidad, tono, A-B, temporizador). */
(function (g) {
  'use strict';
  const Mu = g.Mu, D = g.MuDatos, B = g.MuBib, Q = g.MuCola, M = g.MuMotor, U = g.MuUI, C = g.MuCalc, A = g.MuApp, h = Mu.h, esc = Mu.esc;
  let viz = null, arrastrando = false, W = {};
  const rangoFila = (id, etq, min, max, step, val, fmt, fn, extra) => { const o = h('output', { for: id, txt: fmt(val) }), i = h('input', { type: 'range', id, min, max, step, value: val, 'aria-label': etq, on: { input: () => { o.textContent = fmt(+i.value); fn(+i.value); } } }); if (extra) Object.keys(extra).forEach((k) => i.setAttribute(k, extra[k])); return h('div', { cls: 'mu-rango' }, [h('label', { for: id, txt: etq }), i, o]); };
  A.rangoFila = rangoFila;
  A.pintarAhora = function (raiz) {
    raiz.textContent = ''; W = {};
    const it = M.estado.item, a = D.ajustes();
    W.portada = h('div', { cls: 'mu-portada', role: 'img', 'aria-label': 'Portada' }); W.titulo = h('h2', { cls: 'mu-ah-t', txt: 'Nada sonando' }); W.sub = h('p', { cls: 'mu-ah-s', txt: 'Elige una pista de la biblioteca.' });
    W.fav = Mu.boton('heart', 'Favorita', () => { const p = M.estado.item && D.pistas.get(M.estado.item.id); if (p) U.favorita(p).then(refrescarAhora); }, 'mu-fav'); W.estr = h('div', { cls: 'mu-estr-w' });
    raiz.appendChild(h('div', { cls: 'mu-cabeza' }, [W.portada, h('div', { cls: 'mu-info' }, [W.titulo, W.sub, h('div', { cls: 'mu-fila-acc' }, [W.fav, W.estr])])]));
    /* visualizador */
    W.cv = h('canvas', { cls: 'mu-viz', 'aria-label': 'Visualizador de audio', role: 'img' }); const modos = h('div', { cls: 'mu-chips', role: 'group', 'aria-label': 'Visualizador' });
    g.MuVisual.MODOS.forEach(([id, t]) => modos.appendChild(h('button', { type: 'button', cls: 'mu-chip', 'data-m': id, 'aria-pressed': a.visual === id, txt: t, on: { click: () => { viz.fijar(id); modos.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.m === id)); Mu.logro('visualizador'); } } })));
    const vizOn = h('button', { type: 'button', cls: 'mu-chip', 'aria-pressed': a.vizOn, txt: 'Visualizador activo', on: function () { const v = !D.ajustes().vizOn; D.ajuste('vizOn', v); this.setAttribute('aria-pressed', v); } }); modos.appendChild(vizOn);
    raiz.appendChild(h('div', { cls: 'mu-viz-w' }, [W.cv])); raiz.appendChild(modos);
    viz = g.MuVisual.crear(W.cv, { modo: a.visual }); if ('IntersectionObserver' in g) new IntersectionObserver((es) => { if (es[0].isIntersecting) viz.iniciar(); else viz.detener(); }).observe(W.cv); else viz.iniciar();
    /* progreso */
    W.pos = h('input', { type: 'range', min: 0, max: 1000, value: 0, step: 1, id: 'mu-pos', 'aria-label': 'Posición', on: { input: () => { arrastrando = true; W.t0.textContent = Mu.tiempo(+W.pos.value / 1000 * (M.duracion() || 0)); }, change: () => { M.buscar(+W.pos.value / 1000 * (M.duracion() || 0)); arrastrando = false; } } });
    W.t0 = h('span', { txt: '0:00' }); W.t1 = h('span', { txt: '0:00' }); W.marcas = h('div', { cls: 'mu-ab-marcas', 'aria-hidden': 'true' });
    raiz.appendChild(h('div', { cls: 'mu-prog' }, [W.t0, h('div', { cls: 'mu-prog-r' }, [W.pos, W.marcas]), W.t1]));
    /* transporte */
    W.shuf = Mu.boton('shuffle', 'Aleatorio', () => Q.aleatorio(!D.ajuste('aleatorio')), 'mu-tg'); W.rep = Mu.boton('repeat', 'Repetir', () => { const o = ['off', 'all', 'one'], v = o[(o.indexOf(D.ajuste('repetir')) + 1) % 3]; Q.repetir(v); }, 'mu-tg');
    W.play = Mu.boton('play', 'Reproducir', () => Q.reproducirActual(), 'mu-grande'); W.play.id = 'mu-play';
    raiz.appendChild(h('div', { cls: 'mu-trans' }, [W.shuf, Mu.boton('prev', 'Anterior', () => Q.anterior(), 'mu-med'), W.play, Mu.boton('next', 'Siguiente', () => Q.siguiente(true), 'mu-med'), W.rep]));
    W.vol = h('input', { type: 'range', min: 0, max: 100, value: Math.round(a.vol * 100), id: 'mu-vol', 'aria-label': 'Volumen', on: { input: () => M.volumen(+W.vol.value / 100) } });
    const mute = Mu.boton('vol', 'Silenciar', () => { if (M.estado.vol > 0) { W.antes = M.estado.vol; M.volumen(0); } else M.volumen(W.antes || 0.8); }, 'mu-tg'); raiz.appendChild(h('div', { cls: 'mu-vol' }, [mute, W.vol, Mu.boton('car', 'Modo conducción', () => A.conduccion(true), 'mu-tg')]));
    raiz.appendChild(h('p', { cls: 'tr-ayuda', id: 'mu-estado-motor', role: 'status' }));
    /* paneles */
    raiz.appendChild(panelRepro(a)); raiz.appendChild(panelSonido(a)); raiz.appendChild(panelLetra());
    refrescarAhora();
  };
  function panelRepro(a) {
    const d = h('details', { cls: 'st-det mu-det', open: true }), s = h('summary', { txt: 'Reproducción: velocidad, tono, bucle A-B, temporizador' }); d.appendChild(s);
    d.appendChild(rangoFila('mu-vel', 'Velocidad', 50, 200, 5, Math.round(a.vel * 100), (v) => (v / 100).toFixed(2) + '×', (v) => { M.velocidad(v / 100); Mu.logro('velocidad'); }));
    d.appendChild(rangoFila('mu-tono', 'Tono', -12, 12, 1, a.tono, (v) => (v > 0 ? '+' : '') + v + ' st', (v) => { M.tono(v); if (v) Mu.logro('tono'); }));
    W.ab = h('div', { cls: 'tr-acciones' }); const ba = h('button', { type: 'button', cls: 'tr-btn tr-chico', id: 'mu-ab', on: { click: () => { const b = M.estado.bucle, t = M.tiempo(); if (b.a == null) M.bucle(t, null); else if (b.b == null) { M.bucle(b.a, Math.max(t, b.a + 0.5)); Mu.logro('bucle_ab'); } else M.bucle(null, null); } } }); W.abBtn = ba; W.ab.appendChild(ba); W.ab.appendChild(h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Reiniciar velocidad y tono', on: () => { D.ajuste('vel', 1); D.ajuste('tono', 0); M.aplicarSonido(); A.pintarAhora(document.getElementById('mu-ahora')); } })); d.appendChild(W.ab);
    const t = h('select', { id: 'mu-temp', 'aria-label': 'Temporizador de apagado', on: { change: () => { const v = t.value; M.temporizador(v === 'pista' ? 'pista' : +v); if (v !== '0') Mu.logro('temporizador'); } } }); [['0', 'Temporizador: apagado'], ['15', '15 minutos'], ['30', '30 minutos'], ['45', '45 minutos'], ['60', '1 hora'], ['90', '1,5 horas'], ['pista', 'Al terminar la pista']].forEach(([v, x]) => t.appendChild(h('option', { value: v, txt: x }))); W.temp = t;
    const cf = h('select', { id: 'mu-cf', 'aria-label': 'Crossfade', on: { change: () => { D.ajuste('crossfade', +cf.value); if (+cf.value) Mu.logro('crossfade'); } } }); [[0, 'Sin crossfade (sin pausas)'], [2, 'Crossfade 2 s'], [4, 'Crossfade 4 s'], [6, 'Crossfade 6 s'], [10, 'Crossfade 10 s']].forEach(([v, x]) => cf.appendChild(h('option', { value: v, txt: x, selected: a.crossfade === v })));
    d.appendChild(h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'mu-temp', txt: 'Temporizador' }), t]), h('div', {}, [h('label', { for: 'mu-cf', txt: 'Transición' }), cf])]));
    return d;
  }
  function panelSonido(a) {
    const d = h('details', { cls: 'st-det mu-det' }); d.appendChild(h('summary', { txt: 'Sonido: ecualizador, compresor, normalización' }));
    W.curva = h('canvas', { cls: 'mu-curva', width: 600, height: 150, 'aria-label': 'Curva del ecualizador', role: 'img' }); d.appendChild(W.curva);
    const pre = h('select', { id: 'mu-eq-preset', 'aria-label': 'Preajuste del ecualizador', on: { change: () => { if (pre.value === '—') return; D.ajuste('eq', C.PRESETS[pre.value].slice()); D.ajuste('eqPreset', pre.value); M.aplicarSonido(); sliders(); Mu.logro('ecualizador'); } } }); const nom = Object.keys(C.PRESETS).concat(['—']); nom.forEach((n) => pre.appendChild(h('option', { value: n, txt: n === '—' ? 'Personalizado' : n, selected: n === a.eqPreset }))); W.pre = pre;
    const on = h('label', { cls: 'tr-chk' }, [h('input', { type: 'checkbox', id: 'mu-eq-on', checked: a.eqOn, on: { change: function () { D.ajuste('eqOn', this.checked); M.aplicarSonido(); dibujarCurva(); } } }), 'Ecualizador activo']);
    d.appendChild(h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'mu-eq-preset', txt: 'Preajuste' }), pre]), on]));
    W.bandas = h('div', { cls: 'mu-bandas', role: 'group', 'aria-label': 'Bandas del ecualizador' }); d.appendChild(W.bandas); sliders();
    d.appendChild(rangoFila('mu-preamp', 'Preamplificador', -12, 12, 0.5, a.preamp, (v) => (v > 0 ? '+' : '') + v + ' dB', (v) => { D.ajuste('preamp', v); M.aplicarSonido(); }));
    d.appendChild(h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Preamp automático', on: () => { const v = Math.round(C.autoPreamp(D.ajustes().eq) * 2) / 2; D.ajuste('preamp', v); M.aplicarSonido(); const i = document.getElementById('mu-preamp'); i.value = v; i.nextSibling.textContent = v + ' dB'; } })]));
    d.appendChild(h('label', { cls: 'tr-chk' }, [h('input', { type: 'checkbox', id: 'mu-comp', checked: a.comp, on: { change: function () { D.ajuste('comp', this.checked); M.aplicarSonido(); if (this.checked) Mu.logro('compresor'); } } }), 'Compresor dinámico']));
    d.appendChild(rangoFila('mu-comp-u', 'Umbral del compresor', -60, 0, 1, a.compUmbral, (v) => v + ' dB', (v) => { D.ajuste('compUmbral', v); M.aplicarSonido(); })); d.appendChild(rangoFila('mu-comp-r', 'Relación', 1, 20, 0.5, a.compRatio, (v) => v + ':1', (v) => { D.ajuste('compRatio', v); M.aplicarSonido(); }));
    d.appendChild(h('label', { cls: 'tr-chk' }, [h('input', { type: 'checkbox', id: 'mu-lim', checked: a.limitador, on: { change: function () { D.ajuste('limitador', this.checked); M.aplicarSonido(); } } }), 'Limitador (evita distorsión por picos)']));
    d.appendChild(h('label', { cls: 'tr-chk' }, [h('input', { type: 'checkbox', id: 'mu-norm', checked: a.normalizar, on: { change: function () { D.ajuste('normalizar', this.checked); M.ajustarRG(); if (this.checked) { Mu.logro('normalizar'); normalizarActual(); } } } }), 'Normalizar volumen (análisis RMS local)']));
    d.appendChild(rangoFila('mu-obj', 'Nivel objetivo', -24, -8, 1, a.objetivoRG, (v) => v + ' dBFS', (v) => { D.ajuste('objetivoRG', v); recalcularRG(); }));
    W.rgInfo = h('p', { cls: 'tr-ayuda', id: 'mu-rg-info' }); d.appendChild(W.rgInfo); d.addEventListener('toggle', dibujarCurva); return d;
  }
  function sliders() {
    const a = D.ajustes(); W.bandas.textContent = '';
    C.BANDAS.forEach((f, i) => { const id = 'mu-b' + i, o = h('output', { for: id, txt: (a.eq[i] > 0 ? '+' : '') + a.eq[i] }), r = h('input', { type: 'range', id, min: -12, max: 12, step: 1, value: a.eq[i], 'aria-label': (f >= 1000 ? f / 1000 + ' kHz' : f + ' Hz') + ' ganancia', orient: 'vertical', on: { input: () => { const eq = D.ajustes().eq.slice(); eq[i] = +r.value; o.textContent = (eq[i] > 0 ? '+' : '') + eq[i]; D.ajuste('eq', eq); D.ajuste('eqPreset', '—'); W.pre.value = '—'; M.aplicarSonido(); dibujarCurva(); Mu.logro('ecualizador'); } } }); W.bandas.appendChild(h('div', { cls: 'mu-banda' }, [o, r, h('span', { txt: f >= 1000 ? f / 1000 + 'k' : String(f) })])); });
    dibujarCurva();
  }
  function dibujarCurva() {
    const cv = W.curva; if (!cv || !cv.isConnected) return; const x = cv.getContext('2d'), a = D.ajustes(), w = cv.width, hh = cv.height, cs = getComputedStyle(cv); x.clearRect(0, 0, w, hh);
    x.strokeStyle = 'rgba(128,128,160,.3)'; x.lineWidth = 1; for (let db = -12; db <= 12; db += 6) { const y = hh / 2 - db / 15 * hh / 2; x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
    const fr = []; for (let i = 0; i < 120; i++) fr.push(20 * Math.pow(1000, i / 119)); const r = C.curvaEQ(a.eqOn ? a.eq : new Array(10).fill(0), 48000, fr);
    x.strokeStyle = cs.getPropertyValue('--acento').trim() || '#3e63dd'; x.lineWidth = 3; x.beginPath(); r.forEach((db, i) => { const px = i / 119 * w, py = hh / 2 - Mu.clamp(db, -15, 15) / 15 * hh / 2; if (i) x.lineTo(px, py); else x.moveTo(px, py); }); x.stroke();
  }
  async function normalizarActual() { const it = M.estado.item; if (!it || it.remoto || it.rgDb != null || !D.ajustes().normalizar) { rgTexto(); return; } try { await M.analizar(it, false); } catch (e) { /* sin archivo */ } rgTexto(); }
  function recalcularRG() { D.pistas.forEach((p) => { if (p.p95Db != null) p.rgDb = Math.round(C.ganRG(p.p95Db, p.picoDb, D.ajustes().objetivoRG, D.ajustes().evitarClip).db * 10) / 10; }); M.ajustarRG(); rgTexto(); }
  function rgTexto() { if (!W.rgInfo) return; const it = M.estado.item; W.rgInfo.textContent = !it ? '' : it.rgDb != null ? 'Ganancia aplicada a esta pista: ' + (it.rgDb > 0 ? '+' : '') + it.rgDb + ' dB (nivel medido ' + it.p95Db + ' dBFS, pico ' + it.picoDb + ' dBFS).' : it.rgTag != null ? 'Usando ReplayGain de las etiquetas: ' + it.rgTag + ' dB.' : 'Pista sin analizar: se analizará al activar la normalización (todo local).'; }
  /* ---- letras ---- */
  function panelLetra() {
    const d = h('details', { cls: 'st-det mu-det', id: 'mu-det-letra' }); d.appendChild(h('summary', { txt: 'Letra y karaoke' })); W.letra = h('div', { cls: 'mu-letra', id: 'mu-letra', 'aria-live': 'off' }); d.appendChild(W.letra);
    d.appendChild(h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-chico', id: 'mu-letra-ed', txt: 'Cargar, editar o sincronizar letra', on: { click: () => M.estado.item && !M.estado.item.remoto && A.letra(D.pistas.get(M.estado.item.id)) } })])); d.addEventListener('toggle', () => { if (d.open) cargarLetra(); }); return d;
  }
  let LET = null;
  async function cargarLetra() {
    LET = null; if (!W.letra) return; const it = M.estado.item; W.letra.textContent = ''; if (!it || it.remoto) { W.letra.textContent = 'Sin letra para este contenido.'; return; }
    const t = await B.letra(it.id); if (!t) { W.letra.textContent = 'Esta pista no tiene letra. Puedes pegarla o cargar un archivo .lrc.'; return; }
    const o = g.MuLrc.parse(t); LET = o; W.letra.dataset.i = -1;
    o.lineas.forEach((l, i) => { const p = h('p', { 'data-i': i, cls: 'mu-ln' }); if (l.palabras) l.palabras.forEach((w) => p.appendChild(h('span', { cls: 'mu-w', txt: w.texto }))); else p.textContent = l.texto; if (o.sincronizada) p.addEventListener('click', () => M.buscar(l.t)); W.letra.appendChild(p); });
  }
  function actualizarLetra(t) {
    if (!LET || !LET.sincronizada || !W.letra || !W.letra.isConnected || !W.letra.offsetParent) return; const i = g.MuLrc.indice(LET.lineas, t), prev = +W.letra.dataset.i;
    if (i !== prev) { W.letra.dataset.i = i; W.letra.querySelectorAll('.mu-ln.on').forEach((p) => p.classList.remove('on')); const p = W.letra.children[i]; if (p) { p.classList.add('on'); const r = W.letra.getBoundingClientRect(), pr = p.getBoundingClientRect(); W.letra.scrollTop += pr.top - r.top - r.height / 3; } }
    const p = W.letra.children[i]; if (p) { const k = g.MuLrc.karaoke(LET.lineas, i, t); if (k.palabras) Array.from(p.children).forEach((s, j) => { const w = k.palabras[j]; if (w) s.style.setProperty('--p', (w.p * 100).toFixed(0) + '%'); }); else p.style.setProperty('--p', (k.progreso * 100).toFixed(0) + '%'); }
  }
  Mu.on('letra', (id) => { if (M.estado.item && M.estado.item.id === id) cargarLetra(); });
  A.letra = function (p) {
    const ta = h('textarea', { id: 'mu-letra-ta', rows: 10, 'aria-label': 'Texto de la letra (LRC o texto plano)', placeholder: '[00:12.50]Primera línea\n[00:17.00]Segunda línea\n…o pega texto plano y sincroniza tocando.' }); B.letra(p.id).then((t) => { ta.value = t; });
    const arch = h('input', { type: 'file', accept: '.lrc,.txt,text/plain', 'aria-label': 'Cargar archivo .lrc', on: { change: async () => { if (arch.files[0]) ta.value = await arch.files[0].text(); } } });
    const sinc = h('div', { cls: 'mu-sinc', hidden: true });
    const c = h('div', {}, [ta, h('label', { txt: 'Cargar archivo .lrc o .txt' }), arch, h('p', { cls: 'tr-ayuda', txt: 'Formato LRC: [mm:ss.xx]texto. Con <mm:ss.xx>palabra se activa el karaoke palabra por palabra. Pulsa «Sincronizar tocando» para marcar cada línea al ritmo de la música.' }), sinc]);
    const iniciarSinc = async () => {
      let lin = g.MuLrc.desdeTexto(g.MuLrc.parse(ta.value).lineas.map((l) => l.texto).join('\n')); if (!lin.length) { Mu.aviso('Escribe o pega la letra primero.', 'error'); return false; }
      if (!M.estado.item || M.estado.item.id !== p.id) { const ok = await Q.poner([p], 0); if (!ok) return false; } else if (!M.estado.reproduciendo) M.reanudar(); M.buscar(0); let i = 0; sinc.hidden = false; sinc.textContent = '';
      const cab = h('p', { cls: 'mu-sinc-l' }), sig = h('p', { cls: 'tr-ayuda' }), btn = h('button', { type: 'button', cls: 'tr-btn tr-pri mu-gordo', id: 'mu-marcar', txt: '¡Ahora! (Espacio)' });
      const pintar = () => { cab.textContent = i < lin.length ? lin[i].texto : 'Listo: ' + lin.length + ' líneas marcadas.'; sig.textContent = i + 1 < lin.length ? 'Siguiente: ' + lin[i + 1].texto : ''; btn.disabled = i >= lin.length; };
      const marcar = () => { if (i >= lin.length) return; g.MuLrc.marcar(lin, i, M.tiempo()); i++; pintar(); if (i >= lin.length) { ta.value = g.MuLrc.serializar({ meta: {}, lineas: lin }); Mu.aviso('Sincronizada. Revisa y pulsa Guardar.'); Mu.logro('letra_sincronizada'); } };
      btn.addEventListener('click', marcar); btn.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); marcar(); } });
      const atras = h('button', { type: 'button', cls: 'tr-btn', txt: 'Deshacer última', on: () => { if (i > 0) { i--; lin[i].t = null; pintar(); } } });
      sinc.append(cab, sig, h('div', { cls: 'tr-acciones' }, [btn, atras])); pintar(); btn.focus(); return false;
    };
    U.dialogo('Letra: ' + p.titulo, c, [['Sincronizar tocando', iniciarSinc], ['Guardar', async () => { await B.guardarLetra(p.id, ta.value.trim()); Mu.aviso('Letra guardada en este dispositivo.'); }, 'tr-pri'], ['Cerrar', null]]);
  };
  /* ---- refresco ---- */
  async function refrescarAhora() {
    if (!W.titulo || !W.titulo.isConnected) return; const it = M.estado.item, p = it && !it.remoto ? D.pistas.get(it.id) : null;
    W.titulo.textContent = it ? it.titulo : 'Nada sonando'; W.sub.textContent = it ? (it.remoto ? (it.estacion || 'En directo') : U.sub(it)) : 'Elige una pista de la biblioteca.';
    W.t1.textContent = it ? Mu.tiempo(M.duracion()) : '0:00'; W.fav.classList.toggle('on', !!(p && p.fav)); W.fav.setAttribute('aria-pressed', !!(p && p.fav)); W.fav.disabled = !p;
    W.estr.textContent = ''; if (p) W.estr.appendChild(U.estrellas(p.val || 0, async (v) => { p.val = v; await D.guardarPista(p); if (v) Mu.logro('primera_valoracion'); }));
    W.portada.style.backgroundImage = ''; W.portada.style.background = it ? Mu.colorDe((it.album || it.artista || it.titulo || '')) : ''; W.portada.textContent = it ? U.inicial(it) : '♪';
    const u = p ? await B.portada(p) : null; if (u && M.estado.item === it) { W.portada.style.backgroundImage = 'url(' + u + ')'; W.portada.textContent = ''; }
    const a = D.ajustes(); W.shuf.classList.toggle('on', a.aleatorio); W.shuf.setAttribute('aria-pressed', a.aleatorio); W.rep.classList.toggle('on', a.repetir !== 'off'); W.rep.innerHTML = Mu.ico(a.repetir === 'one' ? 'repeat1' : 'repeat'); W.rep.setAttribute('aria-label', 'Repetir: ' + (a.repetir === 'off' ? 'desactivado' : a.repetir === 'all' ? 'toda la cola' : 'una pista')); W.rep.setAttribute('aria-pressed', a.repetir !== 'off');
    W.play.innerHTML = Mu.ico(M.estado.reproduciendo ? 'pause' : 'play'); W.play.setAttribute('aria-label', M.estado.reproduciendo ? 'Pausar' : 'Reproducir');
    const b = M.estado.bucle; W.abBtn.textContent = b.a == null ? 'Bucle A-B: marcar A' : b.b == null ? 'Marcar B (A=' + Mu.tiempo(b.a) + ')' : 'Quitar bucle ' + Mu.tiempo(b.a) + '–' + Mu.tiempo(b.b);
    const e = document.getElementById('mu-estado-motor'); if (e) e.textContent = M.estado.sinProcesar ? 'Este flujo no permite CORS: suena sin ecualizador ni visualizador.' : M.estado.error || '';
    const d = M.duracion(); W.marcas.style.setProperty('--a', b.a != null && d ? (b.a / d * 100) + '%' : '-10%'); W.marcas.style.setProperty('--b', b.b != null && d ? (b.b / d * 100) + '%' : '-10%'); W.marcas.classList.toggle('on', b.a != null);
    if (W.temp) { const t = M.estado.temp; W.temp.value = !t ? '0' : t.fin === 'pista' ? 'pista' : W.temp.value; } rgTexto(); cargarLetraSiAbierta();
  }
  let letraPara = null; function cargarLetraSiAbierta() { const it = M.estado.item; if ((it && it.id) !== letraPara) { letraPara = it && it.id; const d = document.getElementById('mu-det-letra'); if (d && d.open) cargarLetra(); else LET = null; } }
  A.refrescarAhora = refrescarAhora;
  M.on('pista', () => { refrescarAhora(); mini(); normalizarActual(); }); M.on('estado', () => { refrescarAhora(); mini(); }); M.on('bucle', refrescarAhora); M.on('temp', refrescarAhora); Mu.on('modo', refrescarAhora); Mu.on('estadisticas', () => { if (W.fav) refrescarAhora(); });
  M.on('tiempo', (t, d) => {
    if (W.pos && W.pos.isConnected && !arrastrando && W.pos.offsetParent) { W.pos.value = d ? Math.round(t / d * 1000) : 0; W.t0.textContent = Mu.tiempo(t); if (W.t1.textContent !== Mu.tiempo(d)) W.t1.textContent = Mu.tiempo(d); }
    const mb = document.getElementById('mu-mini-barra'); if (mb && d) mb.style.width = (t / d * 100).toFixed(1) + '%'; actualizarLetra(t);
    const cd = document.getElementById('mu-cond-barra'); if (cd && d) cd.style.width = (t / d * 100).toFixed(1) + '%';
  });
  M.on('vol', () => { if (W.vol) W.vol.value = Math.round(M.estado.vol * 100); });
  /* ---- mini reproductor persistente ---- */
  async function mini() {
    const m = document.getElementById('mu-mini'); if (!m) return; const it = M.estado.item; m.hidden = !it; document.body.classList.toggle('mu-con-mini', !!it); if (!it) return;
    m.querySelector('.mu-mini-t').textContent = it.titulo; m.querySelector('.mu-mini-s').textContent = it.remoto ? (it.estacion || 'En directo') : U.sub(it);
    const pl = m.querySelector('#mu-mini-play'); pl.innerHTML = Mu.ico(M.estado.reproduciendo ? 'pause' : 'play'); pl.setAttribute('aria-label', M.estado.reproduciendo ? 'Pausar' : 'Reproducir');
    const im = m.querySelector('.mu-mini-img'); im.style.backgroundImage = ''; im.style.background = Mu.colorDe(it.album || it.artista || it.titulo || ''); im.textContent = U.inicial(it); const u = it.remoto ? null : await B.portada(it); if (u && M.estado.item === it) { im.style.backgroundImage = 'url(' + u + ')'; im.textContent = ''; }
    const cd = document.getElementById('mu-cond'); if (cd && !cd.hidden) conduccionTexto();
  }
  A.montarMini = function () {
    const m = h('div', { id: 'mu-mini', cls: 'mu-mini', hidden: true, role: 'region', 'aria-label': 'Mini reproductor' }); m.innerHTML = '<div class="mu-mini-prog"><i id="mu-mini-barra"></i></div>';
    const info = h('button', { type: 'button', cls: 'mu-mini-info', 'aria-label': 'Abrir Ahora suena', on: { click: () => A.irA('repro', 'ahora') } }); info.innerHTML = '<span class="mu-mini-img"></span><span class="mu-mini-tx"><b class="mu-mini-t"></b><small class="mu-mini-s"></small></span>'; m.appendChild(info);
    const pl = Mu.boton('play', 'Reproducir', () => Q.reproducirActual(), 'mu-med'); pl.id = 'mu-mini-play'; m.append(Mu.boton('prev', 'Anterior', () => Q.anterior(), 'mu-med mu-solo-ancho'), pl, Mu.boton('next', 'Siguiente', () => Q.siguiente(true), 'mu-med')); document.body.appendChild(m); mini();
  };
  /* ---- modo conduccion ---- */
  let wake = null;
  function conduccionTexto() { const it = M.estado.item, c = document.getElementById('mu-cond'); if (!c) return; c.querySelector('.mu-cond-t').textContent = it ? it.titulo : 'Nada sonando'; c.querySelector('.mu-cond-s').textContent = it ? (it.remoto ? it.estacion || '' : it.artista || it.album || '') : 'Elige música y vuelve'; const pl = c.querySelector('#mu-cond-play'); pl.innerHTML = Mu.ico(M.estado.reproduciendo ? 'pause' : 'play'); pl.setAttribute('aria-label', M.estado.reproduciendo ? 'Pausar' : 'Reproducir'); }
  A.conduccion = async function (on) {
    let c = document.getElementById('mu-cond');
    if (!c) { c = h('div', { id: 'mu-cond', cls: 'mu-cond', hidden: true, role: 'dialog', 'aria-label': 'Modo conducción' }); c.innerHTML = '<div class="mu-cond-prog"><i id="mu-cond-barra"></i></div><h2 class="mu-cond-t"></h2><p class="mu-cond-s"></p>'; const f = h('div', { cls: 'mu-cond-btn' }); const pl = Mu.boton('play', 'Reproducir', () => Q.reproducirActual(), 'mu-enorme mu-cond-play'); pl.id = 'mu-cond-play'; f.append(Mu.boton('prev', 'Anterior', () => Q.anterior(), 'mu-enorme'), pl, Mu.boton('next', 'Siguiente', () => Q.siguiente(true), 'mu-enorme')); const f2 = h('div', { cls: 'mu-cond-btn mu-cond-peq' }); f2.append(Mu.boton('mute', 'Bajar volumen', () => M.volumen(M.estado.vol - 0.1), 'mu-enorme'), Mu.boton('vol', 'Subir volumen', () => M.volumen(M.estado.vol + 0.1), 'mu-enorme'), Mu.boton('heart', 'Favorita', () => { const p = M.estado.item && D.pistas.get(M.estado.item.id); if (p) U.favorita(p); }, 'mu-enorme'), Mu.boton('close', 'Salir del modo conducción', () => A.conduccion(false), 'mu-enorme')); c.append(f, f2); document.body.appendChild(c); }
    c.hidden = !on; document.body.classList.toggle('mu-cond-abierto', on);
    if (on) { conduccionTexto(); Mu.logro('conduccion'); try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch (e) {} const b = c.querySelector('#mu-cond-play'); b.focus(); } else { try { if (wake) wake.release(); } catch (e) {} wake = null; }
  };
})(window);
