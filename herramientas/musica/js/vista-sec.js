/* Estudio > Secuenciador: caja de ritmos de 16 pasos (kits sintetizados y muestras propias), piano roll multipista, transporte con look-ahead,
   proyectos, exportacion de la mezcla a WAV y MIDI. */
(function (g) {
  'use strict';
  const Mu = g.Mu, D = g.MuDatos, E = g.MuEst, SS = g.MuSintes, PR = g.MuProy, PL = g.MuPlan, B = g.MuBib, U = g.MuUI, T = g.Tr, h = Mu.h, esc = Mu.esc;
  const X = E.sec = { proy: null, tocando: false, cola: [], insts: {}, sel: 0, base: 48, largo: 1, taps: [], bat: null, muestras: {} };
  const NOTAS_NEGRAS = [1, 3, 6, 8, 10];
  const copia = (o) => JSON.parse(JSON.stringify(o));
  function actual() { if (X.proy) return X.proy; try { const o = JSON.parse(Mu.ls('musica_proy_actual_dispositivo') || 'null'); if (o && o.patron) { X.proy = o; return o; } } catch (e) {} X.proy = PR.ejemplo(); return X.proy; }
  let guardarT = 0; function cambio() { Mu.ls('musica_proy_actual_dispositivo', JSON.stringify(X.proy)); clearTimeout(guardarT); if (X.proy.id) guardarT = setTimeout(() => D.guardarProyecto(X.proy).catch(() => {}), 1500); }
  /* ---- audio ---- */
  function preparar() {
    const n = E.nodos(), p = X.proy; if (!X.bat || X.batCtx !== n.ctx) { X.bat = SS.bateria(n.ctx, n.master, p.kit); X.batCtx = n.ctx; } X.bat.kit = p.kit; X.bat.muestras = X.muestras;
    if (X.cacheCtx !== n.ctx) { X.cache = {}; X.cacheCtx = n.ctx; } X.insts = {};
    p.rollo.pistas.forEach((t, i) => { if (t.preset === 'Mi sintetizador') { X.insts[i] = E.sintVivo(); return; } const k = SS.PRESETS[t.preset] ? t.preset : 'Lead brillante'; X.insts[i] = X.cache[k] || (X.cache[k] = SS.crear(n.ctx, n.master, SS.PRESETS[k])); });
  }
  function iniciar() {
    const p = actual(); Mu.reanudar(); preparar(); const n = E.nodos();
    X.tr = PL.transporte({ reloj: () => n.ctx.currentTime, adelante: 0.12, intervalo: 25, patron: () => X.proy.patron, rollo: () => X.proy.rollo,
      alGolpe: (i, t, v) => { const pt = X.proy.patron.pistas[i]; X.bat.golpe(pt.sonido, t, v * (pt.vol == null ? 1 : pt.vol)); },
      alNota: (i, nota, t, d, v) => { const s = X.insts[i]; if (s) s.nota(nota, t, d, v * (X.proy.rollo.pistas[i].vol == null ? 1 : X.proy.rollo.pistas[i].vol)); },
      alPaso: (paso, t) => { X.cola.push({ paso, t }); } });
    X.tr.bpm = p.bpm; X.tr.swing = p.swing || 0; X.tr.iniciar(); X.tocando = true; X.cola = []; pintarBoton(); animar(); Mu.logro('secuenciador'); Mu.xp(2);
  }
  function parar() { if (X.tr) X.tr.detener(); X.tocando = false; Object.values(X.insts).forEach((s) => s.todoOff && s.todoOff()); marcarPaso(-1); pintarBoton(); }
  E.sec.parar = parar;
  let raf = 0, pasoVis = -1;
  function animar() { cancelAnimationFrame(raf); const f = () => { if (!X.tocando) return; raf = requestAnimationFrame(f); const n = E.nodos(), now = n.ctx.currentTime; let ult = null; while (X.cola.length && X.cola[0].t <= now) ult = X.cola.shift(); if (ult && ult.paso !== pasoVis) marcarPaso(ult.paso); }; raf = requestAnimationFrame(f); }
  function marcarPaso(p) { pasoVis = p; document.querySelectorAll('#mu-grid .mu-paso.cab').forEach((c, i) => c.classList.toggle('now', i === p % 16)); if (X.pr) dibujarRollo(p); }
  function pintarBoton() { const b = document.getElementById('mu-sec-play'); if (b) { b.innerHTML = Mu.ico(X.tocando ? 'stop' : 'play') + '<span>' + (X.tocando ? 'Detener' : 'Reproducir') + '</span>'; b.setAttribute('aria-pressed', X.tocando); } }
  /* ---- UI ---- */
  E.subs.sec = function (p) {
    p.textContent = ''; const pr = actual(); p.appendChild(cabecera()); p.appendChild(rejilla()); p.appendChild(rollo()); p.appendChild(exportar());
    E.subs.sec_vis = (v) => { if (!v) parar(); };
    addEventListener('keydown', (e) => { if (!E.visible() || E.actual !== 'sec' || e.code !== 'Space') return; const el = document.activeElement; if (el && /INPUT|TEXTAREA|SELECT|BUTTON/.test(el.tagName) && el.type !== 'range') return; e.preventDefault(); X.tocando ? parar() : iniciar(); });
  };
  function repintar() { const p = document.getElementById('mue-p-sec'); if (!p) return; const was = X.tocando; E.subs.sec(p); if (was) pintarBoton(); }
  function cabecera() {
    const pr = X.proy, d = h('div', { cls: 'tr-panel' }); d.appendChild(h('h2', { txt: 'Secuenciador y piano roll' }));
    const play = h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'mu-sec-play', 'aria-pressed': 'false', on: () => (X.tocando ? parar() : iniciar()) }); play.innerHTML = Mu.ico('play') + '<span>Reproducir</span>';
    const bpm = h('input', { type: 'number', id: 'mu-sec-bpm', min: 40, max: 240, value: pr.bpm, 'aria-label': 'Tempo (BPM)', on: { change: () => { pr.bpm = Mu.clamp(+bpm.value || 100, 40, 240); bpm.value = pr.bpm; if (X.tr) X.tr.bpm = pr.bpm; cambio(); } } });
    const tap = h('button', { type: 'button', cls: 'tr-btn', txt: 'Tap tempo', on: () => { const n = performance.now(); X.taps = X.taps.filter((t) => n - t < 2500); X.taps.push(n); if (X.taps.length > 2) { const iv = (X.taps[X.taps.length - 1] - X.taps[0]) / (X.taps.length - 1); pr.bpm = Mu.clamp(Math.round(60000 / iv), 40, 240); bpm.value = pr.bpm; if (X.tr) X.tr.bpm = pr.bpm; cambio(); } } });
    const sw = h('input', { type: 'range', id: 'mu-sec-sw', min: 0, max: 50, value: Math.round((pr.swing || 0) * 100), 'aria-label': 'Swing', on: { input: () => { pr.swing = +sw.value / 100; if (X.tr) X.tr.swing = pr.swing; cambio(); } } });
    const kit = h('select', { id: 'mu-sec-kit', 'aria-label': 'Kit de batería', on: { change: () => { pr.kit = kit.value; if (X.bat) X.bat.kit = pr.kit; cambio(); const s = X.bat || (preparar(), X.bat); s.golpe('caja', E.nodos().ctx.currentTime + 0.02, 0.9); } } }); Object.keys(SS.KITS).forEach((k) => kit.appendChild(h('option', { value: k, txt: 'Kit ' + k, selected: k === pr.kit })));
    d.appendChild(h('div', { cls: 'tr-acciones' }, [play, h('div', { cls: 'mu-bpm' }, [h('label', { for: 'mu-sec-bpm', txt: 'BPM' }), bpm]), tap]));
    d.appendChild(h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'mu-sec-sw', txt: 'Swing' }), sw]), h('div', {}, [h('label', { for: 'mu-sec-kit', txt: 'Kit' }), kit])]));
    /* proyectos */
    const sel = h('select', { id: 'mu-proy', 'aria-label': 'Proyectos guardados', on: { change: () => { const q = D.proyectos.find((x) => x.id === sel.value); if (q) { parar(); X.proy = copia(q); X.muestras = {}; cargarMuestras(); cambio(); repintar(); } } } }); sel.appendChild(h('option', { value: '', txt: pr.id ? '(proyecto guardado)' : '(borrador sin guardar)' })); D.proyectos.forEach((q) => sel.appendChild(h('option', { value: q.id, txt: q.nombre, selected: q.id === pr.id })));
    const nom = h('input', { type: 'text', id: 'mu-proy-nom', value: pr.nombre, 'aria-label': 'Nombre del proyecto', on: { change: () => { pr.nombre = nom.value.trim() || 'Proyecto'; cambio(); } } });
    d.appendChild(h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'mu-proy-nom', txt: 'Nombre' }), nom]), h('div', {}, [h('label', { for: 'mu-proy', txt: 'Proyectos' }), sel])]));
    d.appendChild(h('div', { cls: 'tr-acciones' }, [
      h('button', { type: 'button', cls: 'tr-btn', id: 'mu-proy-guardar', txt: 'Guardar proyecto', on: async () => { pr.nombre = nom.value.trim() || 'Proyecto'; await D.guardarProyecto(pr); cambio(); Mu.aviso('Proyecto guardado (se sincroniza con tu cuenta; las muestras de audio no).'); Mu.logro('proyecto_guardado'); repintar(); } }),
      h('button', { type: 'button', cls: 'tr-btn', txt: 'Nuevo', on: () => { parar(); X.proy = PR.nuevo(); X.muestras = {}; cambio(); repintar(); } }),
      h('button', { type: 'button', cls: 'tr-btn', txt: 'Ejemplo', on: () => { parar(); X.proy = PR.ejemplo(); X.muestras = {}; cambio(); repintar(); } }),
      h('button', { type: 'button', cls: 'tr-btn tr-peli', txt: 'Borrar guardado', disabled: !pr.id, on: () => U.confirmar('¿Borrar este proyecto guardado?', async () => { await D.borrarProyecto(pr.id); delete pr.id; cambio(); repintar(); }) })]));
    return d;
  }
  async function cargarMuestras() { const pr = X.proy; if (!pr.id) return; for (const r of await D.loc.lista('muestras')) { if (r.proyecto === pr.id) try { X.muestras[r.slot] = await E.nodos().ctx.decodeAudioData(await r.blob.arrayBuffer()); } catch (e) {} } }
  function rejilla() {
    const pr = X.proy, d = h('div', { cls: 'tr-panel' }); d.appendChild(h('h3', { txt: 'Caja de ritmos (16 pasos)' })); d.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Toca un paso para activarlo; vuelve a tocar para acentuarlo y otra vez para apagarlo. Pulsa el nombre para oírlo.' }));
    const g2 = h('div', { cls: 'mu-grid-w' }), grid = h('div', { cls: 'mu-grid', id: 'mu-grid', role: 'grid', 'aria-label': 'Caja de ritmos' });
    grid.appendChild(h('div', { cls: 'mu-fila-g mu-cabs' }, [h('span', { cls: 'mu-etq' })].concat(Array.from({ length: 16 }, (_, i) => h('span', { cls: 'mu-paso cab' + (i % 4 === 0 ? ' fuerte' : ''), txt: i % 4 === 0 ? String(i / 4 + 1) : '·' })))));
    pr.patron.pistas.forEach((t, ti) => {
      const nombre = h('button', { type: 'button', cls: 'mu-etq', title: 'Escuchar ' + t.nombre, on: () => { preparar(); X.bat.golpe(t.sonido, E.nodos().ctx.currentTime + 0.01, 0.9); } }); nombre.innerHTML = '<span>' + esc(t.nombre) + '</span>';
      const mute = h('button', { type: 'button', cls: 'mu-mini-b', 'aria-pressed': !!t.mute, 'aria-label': 'Silenciar ' + t.nombre, txt: 'M', on: () => { t.mute = !t.mute; mute.setAttribute('aria-pressed', t.mute); cambio(); } });
      const carga = h('label', { cls: 'mu-mini-b', title: 'Usar tu propia muestra de audio en ' + t.nombre }); carga.innerHTML = Mu.ico('file'); const inp = h('input', { type: 'file', accept: 'audio/*', cls: 'tr-solo-lector', 'aria-label': 'Cargar muestra para ' + t.nombre, on: { change: async () => { const f = inp.files[0]; if (!f) return; try { const buf = await E.nodos().ctx.decodeAudioData(await f.arrayBuffer()); X.muestras[t.sonido] = buf; if (X.bat) X.bat.muestras = X.muestras; await D.loc.set('muestras', { id: (pr.id || 'borrador') + ':' + t.sonido, proyecto: pr.id || 'borrador', slot: t.sonido, blob: f }); Mu.aviso('Muestra «' + f.name + '» asignada a ' + t.nombre + '.'); Mu.logro('muestra_propia'); preparar(); X.bat.golpe(t.sonido, E.nodos().ctx.currentTime + 0.02, 0.9); } catch (e) { Mu.aviso('No se pudo leer ese audio.', 'error'); } inp.value = ''; } } }); carga.appendChild(inp); if (X.muestras[t.sonido]) carga.classList.add('on');
      const fila = h('div', { cls: 'mu-fila-g', role: 'row' }); fila.appendChild(h('div', { cls: 'mu-etq-w' }, [nombre, mute, carga]));
      t.pasos.forEach((v, i) => { const c = h('button', { type: 'button', cls: 'mu-paso v' + v + (i % 4 === 0 ? ' fuerte' : ''), role: 'gridcell', 'aria-label': t.nombre + ' paso ' + (i + 1) + ': ' + ['apagado', 'activo', 'acento'][v], on: () => { t.pasos[i] = (t.pasos[i] + 1) % 3; c.className = 'mu-paso v' + t.pasos[i] + (i % 4 === 0 ? ' fuerte' : ''); c.setAttribute('aria-label', t.nombre + ' paso ' + (i + 1) + ': ' + ['apagado', 'activo', 'acento'][t.pasos[i]]); if (t.pasos[i]) { preparar(); X.bat.golpe(t.sonido, E.nodos().ctx.currentTime + 0.01, t.pasos[i] === 2 ? 1 : 0.7); } cambio(); Mu.logro('ritmo'); } }); fila.appendChild(c); });
      grid.appendChild(fila);
    });
    g2.appendChild(grid); d.appendChild(g2); d.appendChild(h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Limpiar ritmo', on: () => { pr.patron.pistas.forEach((t) => t.pasos.fill(0)); cambio(); repintar(); } })])); return d;
  }
  /* ---- piano roll ---- */
  const CW = 26, CH = 20, FILAS = 25, TECLAS = 44;
  function rollo() {
    const pr = X.proy, d = h('div', { cls: 'tr-panel' }); d.appendChild(h('h3', { txt: 'Piano roll' })); X.sel = Math.min(X.sel, pr.rollo.pistas.length - 1);
    const chips = h('div', { cls: 'mu-chips', role: 'group', 'aria-label': 'Pistas del piano roll' }); pr.rollo.pistas.forEach((t, i) => chips.appendChild(h('button', { type: 'button', cls: 'mu-chip', 'aria-pressed': i === X.sel, txt: t.nombre, on: () => { X.sel = i; repintar(); } }))); chips.appendChild(h('button', { type: 'button', cls: 'mu-chip', txt: '+ Pista', on: () => { if (pr.rollo.pistas.length >= 8) return; pr.rollo.pistas.push({ nombre: 'Pista ' + (pr.rollo.pistas.length + 1), preset: 'Piano eléctrico', vol: 1, mute: false, notas: [] }); X.sel = pr.rollo.pistas.length - 1; cambio(); repintar(); } })); d.appendChild(chips);
    const t = pr.rollo.pistas[X.sel]; const pre = h('select', { id: 'mu-rollo-preset', 'aria-label': 'Sonido de la pista', on: { change: () => { t.preset = pre.value; cambio(); } } }); Object.keys(SS.PRESETS).concat(['Mi sintetizador']).forEach((n) => pre.appendChild(h('option', { value: n, txt: n, selected: n === t.preset })));
    const len = h('select', { id: 'mu-rollo-len', 'aria-label': 'Duración de la nota nueva', on: { change: () => { X.largo = +len.value; } } }); [[0.5, '1/32'], [1, '1/16'], [2, '1/8'], [4, '1/4'], [8, '1/2'], [16, '1 compás']].forEach(([v, x]) => len.appendChild(h('option', { value: v, txt: 'Nota ' + x, selected: v === X.largo })));
    const pas = h('select', { id: 'mu-rollo-pasos', 'aria-label': 'Largo del bucle', on: { change: () => { pr.rollo.pasos = +pas.value; cambio(); repintar(); } } }); [16, 32, 48, 64].forEach((n) => pas.appendChild(h('option', { value: n, txt: n / 16 + ' compás' + (n > 16 ? 'es' : ''), selected: n === pr.rollo.pasos })));
    d.appendChild(h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'mu-rollo-preset', txt: 'Sonido' }), pre]), h('div', {}, [h('label', { for: 'mu-rollo-len', txt: 'Nota' }), len]), h('div', {}, [h('label', { for: 'mu-rollo-pasos', txt: 'Bucle' }), pas])]));
    d.appendChild(h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Octava ▲', on: () => { X.base = Math.min(84, X.base + 12); dibujarRollo(); } }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Octava ▼', on: () => { X.base = Math.max(24, X.base - 12); dibujarRollo(); } }), h('button', { type: 'button', cls: 'tr-btn tr-chico', id: 'mu-roll-mover', 'aria-pressed': !!X.desplazar, txt: 'Desplazar', title: 'Activa para deslizar el piano roll con el dedo sin crear notas', on: function () { X.desplazar = !X.desplazar; this.setAttribute('aria-pressed', X.desplazar); X.pr.style.touchAction = X.desplazar ? 'pan-x' : 'none'; } }), h('button', { type: 'button', cls: 'tr-btn tr-chico', 'aria-pressed': !!t.mute, txt: 'Silenciar pista', on: function () { t.mute = !t.mute; this.setAttribute('aria-pressed', t.mute); cambio(); } }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Borrar notas', on: () => { t.notas = []; cambio(); dibujarRollo(); } }), h('button', { type: 'button', cls: 'tr-btn tr-chico tr-peli', txt: 'Quitar pista', disabled: pr.rollo.pistas.length < 2, on: () => { pr.rollo.pistas.splice(X.sel, 1); X.sel = 0; cambio(); repintar(); } })]));
    d.appendChild(rangoVol(t)); const w = h('div', { cls: 'mu-roll-w', id: 'mu-roll-w' }); X.pr = h('canvas', { id: 'mu-roll', cls: 'mu-roll', 'aria-label': 'Piano roll: toca una celda para crear o borrar una nota', role: 'img', style: 'touch-action:' + (X.desplazar ? 'pan-x' : 'none') }); w.appendChild(X.pr); d.appendChild(w); d.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Toca una celda para crear una nota (arrastra a la derecha para alargarla) o toca una nota para borrarla. Desliza para ver más compases.' })); enlazarRollo(); dibujarRollo(); return d;
  }
  function rangoVol(t) { const o = h('output', { txt: Math.round((t.vol == null ? 1 : t.vol) * 100) + '%' }), r = h('input', { type: 'range', min: 0, max: 100, value: Math.round((t.vol == null ? 1 : t.vol) * 100), id: 'mu-rollo-vol', 'aria-label': 'Volumen de la pista', on: { input: () => { t.vol = +r.value / 100; o.textContent = r.value + '%'; cambio(); } } }); return h('div', { cls: 'mu-rango' }, [h('label', { for: 'mu-rollo-vol', txt: 'Volumen pista' }), r, o]); }
  function dibujarRollo(paso) {
    const cv = X.pr; if (!cv || !cv.isConnected) return; const pr = X.proy, t = pr.rollo.pistas[X.sel]; if (!t) return; const n = pr.rollo.pasos, w = TECLAS + n * CW, hh = FILAS * CH; if (cv.width !== w * 2 || cv.height !== hh * 2) { cv.width = w * 2; cv.height = hh * 2; cv.style.width = w + 'px'; cv.style.height = hh + 'px'; } const x = cv.getContext('2d'); x.setTransform(2, 0, 0, 2, 0, 0); const cs = getComputedStyle(cv), ac = cs.getPropertyValue('--acento').trim() || '#3e63dd', tx = cs.getPropertyValue('--txt').trim() || '#222', pn = cs.getPropertyValue('--panel2').trim() || '#eee', bd = cs.getPropertyValue('--borde').trim() || '#ccc', pa = cs.getPropertyValue('--panel').trim() || '#fff';
    x.clearRect(0, 0, w, hh); x.font = '10px system-ui'; x.textBaseline = 'middle';
    for (let f = 0; f < FILAS; f++) { const m = X.base + (FILAS - 1 - f), neg = NOTAS_NEGRAS.includes(m % 12), y = f * CH; x.fillStyle = neg ? pn : pa; x.fillRect(TECLAS, y, w - TECLAS, CH); x.fillStyle = neg ? '#222' : '#fff'; x.fillRect(0, y, TECLAS - 2, CH); x.strokeStyle = bd; x.lineWidth = 0.5; x.strokeRect(0, y, TECLAS - 2, CH); if (m % 12 === 0 || f === 0) { x.fillStyle = neg ? '#fff' : '#222'; x.fillText(E.nombreNota(m), 4, y + CH / 2); } }
    for (let c = 0; c <= n; c++) { x.strokeStyle = c % 16 === 0 ? tx : c % 4 === 0 ? bd : 'rgba(128,128,150,.25)'; x.lineWidth = c % 16 === 0 ? 1.2 : 0.6; x.beginPath(); x.moveTo(TECLAS + c * CW, 0); x.lineTo(TECLAS + c * CW, hh); x.stroke(); }
    t.notas.forEach((nt) => { const f = FILAS - 1 - (nt.nota - X.base); if (f < 0 || f >= FILAS) return; x.fillStyle = ac; x.globalAlpha = 0.55 + 0.45 * ((nt.vel || 100) / 127); x.fillRect(TECLAS + nt.ini * CW + 1, f * CH + 1, Math.max(5, nt.dur * CW - 2), CH - 2); x.globalAlpha = 1; });
    if (paso != null && paso >= 0 && X.tocando) { const pp = paso % n; x.fillStyle = 'rgba(229,72,77,.22)'; x.fillRect(TECLAS + pp * CW, 0, CW, hh); }
  }
  function enlazarRollo() {
    const cv = X.pr; let act = null;
    const celda = (e) => { const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) * (cv.width / 2 / r.width), py = (e.clientY - r.top) * (cv.height / 2 / r.height); return { col: Math.floor((px - TECLAS) / CW), fila: Math.floor(py / CH) }; };
    cv.addEventListener('pointerdown', (e) => {
      if (X.desplazar) return; const c = celda(e), pr = X.proy, t = pr.rollo.pistas[X.sel]; const m = X.base + (FILAS - 1 - c.fila); if (c.col < 0) { preparar(); const s = X.insts[X.sel]; if (s) s.nota(m, E.nodos().ctx.currentTime + 0.01, 0.4, 0.8); return; } if (c.col >= pr.rollo.pasos || c.fila < 0 || c.fila >= FILAS) return;
      const ex = t.notas.findIndex((nt) => nt.nota === m && c.col >= nt.ini && c.col < nt.ini + nt.dur);
      if (ex >= 0) { t.notas.splice(ex, 1); cambio(); dibujarRollo(); return; }
      const nt = { ini: c.col, nota: m, dur: X.largo, vel: 100 }; t.notas.push(nt); act = { nt, col: c.col, id: e.pointerId }; try { cv.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault();
      Mu.reanudar(); if (!X.tocando) preparar(); const s = X.insts[X.sel]; if (s) s.nota(m, E.nodos().ctx.currentTime + 0.01, 0.3, 0.8); cambio(); dibujarRollo(); Mu.logro('piano_roll');
    });
    cv.addEventListener('pointermove', (e) => { if (!act || e.pointerId !== act.id) return; const c = celda(e), d = Math.max(0.5, c.col - act.col + 1); const n = Math.min(d, X.proy.rollo.pasos - act.col); if (n !== act.nt.dur) { act.nt.dur = n; dibujarRollo(); } });
    const fin = () => { if (act) { act = null; cambio(); } }; cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
  }
  /* ---- exportar ---- */
  function exportar() {
    const pr = X.proy, d = h('div', { cls: 'tr-panel' }); d.appendChild(h('h3', { txt: 'Exportar' })); const v = h('select', { id: 'mu-exp-v', 'aria-label': 'Repeticiones' }); [1, 2, 4, 8].forEach((n) => v.appendChild(h('option', { value: n, txt: n + (n === 1 ? ' vuelta' : ' vueltas') })));
    const est = h('p', { cls: 'tr-ayuda', role: 'status', id: 'mu-exp-est' });
    d.appendChild(h('div', { cls: 'tr-fila' }, [v, h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'mu-exp-wav', txt: 'Exportar mezcla a WAV', on: async function () { this.disabled = true; est.textContent = 'Renderizando la mezcla…'; try { const buf = await SS.renderizar(pr, +v.value, 44100, X.muestras); Mu.descarga(SS.aWav(buf), T.nombreArchivo(pr.nombre) + '.wav', 'audio/wav'); est.textContent = 'Listo: ' + buf.duration.toFixed(1) + ' s exportados.'; Mu.logro('exportar_wav'); } catch (e) { est.textContent = 'No se pudo renderizar: ' + e.message; } this.disabled = false; } }), h('button', { type: 'button', cls: 'tr-btn', id: 'mu-exp-midi', txt: 'Exportar MIDI', on: () => { Mu.descarga(PR.aMidi(pr), T.nombreArchivo(pr.nombre) + '.mid', 'audio/midi'); Mu.logro('exportar_midi'); } })]));
    const imp = h('input', { type: 'file', accept: '.mid,.midi,audio/midi', 'aria-label': 'Importar archivo MIDI', on: { change: async () => { const f = imp.files[0]; if (!f) return; try { parar(); X.proy = PR.desdeMidi(new Uint8Array(await f.arrayBuffer()), f.name.replace(/\.[^.]+$/, '')); cambio(); repintar(); Mu.aviso('MIDI importado: ' + X.proy.rollo.pistas.length + ' pista(s).'); } catch (e) { Mu.aviso('No se pudo leer el MIDI: ' + e.message, 'error'); } } } });
    d.appendChild(h('label', { txt: 'Importar un archivo MIDI' })); d.appendChild(imp); d.appendChild(est); return d;
  }
  X.actual = actual; actual();
})(window);
