/* Aprender: entrenador de oido (intervalos, acordes, escalas), teoria rapida (circulo de quintas, escalas y acordes con piano y guitarra) y lector de ritmo. */
(function (g) {
  'use strict';
  const Mu = g.Mu, D = g.MuDatos, E = g.MuEst, SS = g.MuSintes, TE = g.MuTeo, PL = g.MuPlan, SG = g.MuSenal, h = Mu.h, esc = Mu.esc;
  const Ap = g.MuApp.aprender = { sub: 'oido' };
  const nom = (pc, bem) => TE.nombre(pc, bem, D.ajuste('notacion') === 'anglo');
  let inst = null, instCtx = null;
  function sonido() { const n = E.nodos(); if (!inst || instCtx !== n.ctx) { inst = SS.crear(n.ctx, n.master, SS.PRESETS['Piano eléctrico']); instCtx = n.ctx; } return inst; }
  function tocar(notas, modo, sep) { Mu.reanudar(); const n = E.nodos(), s = sonido(), t = n.ctx.currentTime + 0.05; notas.forEach((m, i) => s.nota(m, t + (modo === 'junto' ? 0 : i * (sep || 0.6)), modo === 'junto' ? 1.6 : (sep || 0.6) * 1.4, 0.75)); return notas.length * (modo === 'junto' ? 0 : (sep || 0.6)); }
  Ap.tocar = tocar;
  const SUBS = [['oido', 'Entrenador de oído'], ['teoria', 'Teoría rápida'], ['ritmo', 'Lector de ritmo']];
  Ap.montar = function (raiz) {
    const bar = h('div', { cls: 'mu-sub', role: 'tablist', 'aria-label': 'Aprender', id: 'mu-sub-aprender' }), cont = h('div');
    SUBS.forEach(([id, t], i) => { bar.appendChild(h('button', { type: 'button', role: 'tab', cls: 'mu-pill', 'data-s': id, id: 'mua-' + id, 'aria-selected': i === 0, tabindex: i ? -1 : 0, txt: t, on: () => Ap.ir(id) })); cont.appendChild(h('section', { id: 'mua-p-' + id, role: 'tabpanel', hidden: i > 0, 'aria-labelledby': 'mua-' + id })); });
    raiz.append(bar, cont); Ap.ir('oido');
  };
  Ap.ir = function (id) { Ap.sub = id; document.querySelectorAll('#mu-sub-aprender .mu-pill').forEach((b) => { const on = b.dataset.s === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; }); document.querySelectorAll('#v-aprender [id^=mua-p-]').forEach((p) => { p.hidden = p.id !== 'mua-p-' + id; }); const p = document.getElementById('mua-p-' + id); if (p && !p.dataset.listo) { p.dataset.listo = 1; ({ oido, teoria, ritmo })[id](p); } };
  /* ============ Entrenador de oido ============ */
  const NIVELES = {
    intervalos: { 'Básico': [3, 4, 5, 7, 12], 'Intermedio': [2, 3, 4, 5, 7, 8, 9, 12], 'Todos': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    acordes: { 'Básico': ['Mayor', 'Menor'], 'Intermedio': ['Mayor', 'Menor', 'Disminuido', 'Aumentado', 'Septima (dom7)'], 'Todos': ['Mayor', 'Menor', 'Disminuido', 'Aumentado', 'Sus4', 'Septima (dom7)', 'Mayor 7', 'Menor 7'] },
    escalas: { 'Básico': ['Mayor (jonia)', 'Menor natural (eolia)'], 'Intermedio': ['Mayor (jonia)', 'Menor natural (eolia)', 'Pentatonica mayor', 'Pentatonica menor', 'Blues'], 'Todos': ['Mayor (jonia)', 'Menor natural (eolia)', 'Menor armonica', 'Dorica', 'Frigia', 'Lidia', 'Mixolidia', 'Pentatonica menor', 'Blues'] }
  };
  function oido(p) {
    const O = Ap.oido = { tipo: 'intervalos', nivel: 'Básico', dir: 'asc', q: null, resp: false, sesion: { a: 0, t: 0, racha: 0 }, prog: null };
    const d = h('div', { cls: 'tr-panel' }); d.appendChild(h('h2', { txt: 'Entrenador de oído' }));
    const tipo = h('select', { id: 'mu-o-tipo', 'aria-label': 'Ejercicio', on: { change: () => { O.tipo = tipo.value; nueva(); } } }); [['intervalos', 'Intervalos'], ['acordes', 'Acordes'], ['escalas', 'Escalas']].forEach(([v, t]) => tipo.appendChild(h('option', { value: v, txt: t })));
    const niv = h('select', { id: 'mu-o-niv', 'aria-label': 'Nivel', on: { change: () => { O.nivel = niv.value; nueva(); } } }); Object.keys(NIVELES.intervalos).forEach((v) => niv.appendChild(h('option', { value: v, txt: 'Nivel ' + v })));
    const dir = h('select', { id: 'mu-o-dir', 'aria-label': 'Dirección del intervalo', on: { change: () => { O.dir = dir.value; nueva(); } } }); [['asc', 'Ascendente'], ['desc', 'Descendente'], ['junto', 'Armónico (a la vez)']].forEach(([v, t]) => dir.appendChild(h('option', { value: v, txt: t })));
    d.appendChild(h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'mu-o-tipo', txt: 'Ejercicio' }), tipo]), h('div', {}, [h('label', { for: 'mu-o-niv', txt: 'Nivel' }), niv]), h('div', {}, [h('label', { for: 'mu-o-dir', txt: 'Intervalo' }), dir])]));
    const enun = h('p', { cls: 'mu-o-enun', id: 'mu-o-enun', role: 'status', 'aria-live': 'polite' }), opc = h('div', { cls: 'mu-opciones', id: 'mu-o-opc', role: 'group', 'aria-label': 'Respuestas' }), fb = h('div', { cls: 'mu-o-fb', id: 'mu-o-fb', role: 'status', 'aria-live': 'polite' }), stats = h('p', { cls: 'tr-ayuda', id: 'mu-o-stats' });
    d.append(enun, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'mu-o-oir', txt: 'Escuchar', on: () => oir() }), h('button', { type: 'button', cls: 'tr-btn', id: 'mu-o-sig', txt: 'Siguiente', on: () => nueva() })]), opc, fb, stats); p.appendChild(d);
    const gen = (tp, nv) => {
      const raiz = 48 + Math.floor(Math.random() * 13); const lista = NIVELES[tp][nv], v = lista[Math.floor(Math.random() * lista.length)];
      if (tp === 'intervalos') { const s = O.dir === 'desc' ? [raiz + v, raiz] : [raiz, raiz + v]; return { tipo: tp, correcta: String(v), opciones: lista.map(String), notas: s, modo: O.dir === 'junto' ? 'junto' : 'sec' }; }
      if (tp === 'acordes') { const f = TE.ACORDES[v], s = f.map((i) => raiz + i); return { tipo: tp, correcta: v, opciones: lista, notas: s, modo: 'junto' }; }
      const f = TE.ESCALAS[v], s = f.concat([12]).map((i) => raiz + i); return { tipo: tp, correcta: v, opciones: lista, notas: s, modo: 'sec' };
    };
    const etiqueta = (tp, v) => (tp === 'intervalos' ? TE.INTERVALOS[+v] : v.replace(/\((.*)\)/, '').trim());
    function nueva() { O.q = gen(O.tipo, O.nivel); O.resp = false; dir.parentNode.hidden = O.tipo !== 'intervalos'; niv.textContent = ''; Object.keys(NIVELES[O.tipo]).forEach((v) => niv.appendChild(h('option', { value: v, txt: 'Nivel ' + v, selected: v === O.nivel }))); enun.textContent = O.tipo === 'intervalos' ? '¿Qué intervalo suena?' : O.tipo === 'acordes' ? '¿Qué tipo de acorde es?' : '¿Qué escala es?'; fb.textContent = ''; fb.className = 'mu-o-fb'; opc.textContent = ''; O.q.opciones.forEach((o) => opc.appendChild(h('button', { type: 'button', cls: 'tr-btn mu-opcion', 'data-v': o, txt: etiqueta(O.tipo, o), on: () => responder(o) }))); oir(); pintarStats(); }
    function oir() { if (O.q) tocar(O.q.notas, O.q.modo, O.tipo === 'escalas' ? 0.38 : 0.75); }
    async function responder(o) {
      if (O.resp) return; O.resp = true; const ok = o === O.q.correcta; O.sesion.t++; if (ok) { O.sesion.a++; O.sesion.racha++; } else O.sesion.racha = 0;
      opc.querySelectorAll('button').forEach((b) => { b.disabled = true; if (b.dataset.v === O.q.correcta) b.classList.add('ok'); else if (b.dataset.v === o) b.classList.add('mal'); });
      fb.textContent = ok ? '¡Correcto! ' + etiqueta(O.tipo, o) : 'Era: ' + etiqueta(O.tipo, O.q.correcta) + '. Repítelo y compara.'; fb.className = 'mu-o-fb ' + (ok ? 'ok' : 'mal');
      const pr = O.prog || (O.prog = await D.progreso()); pr.total++; if (ok) pr.aciertos++; pr.racha = O.sesion.racha; pr.mejor = Math.max(pr.mejor || 0, O.sesion.racha); const k = O.tipo; pr.porTipo[k] = pr.porTipo[k] || { a: 0, t: 0 }; pr.porTipo[k].t++; if (ok) pr.porTipo[k].a++; D.guardarProgreso(pr).catch(() => {});
      if (ok) { Mu.xp(1); if (pr.aciertos >= 10) Mu.logro('oido_10'); if (O.sesion.racha >= 5) Mu.logro('oido_racha5'); if (pr.aciertos >= 1) Mu.logro('oido_primero'); }
      pintarStats();
    }
    async function pintarStats() { const pr = O.prog || (O.prog = await D.progreso()); const k = pr.porTipo[O.tipo]; stats.textContent = 'Esta sesión: ' + O.sesion.a + '/' + O.sesion.t + ' · racha ' + O.sesion.racha + ' · mejor racha ' + (pr.mejor || 0) + ' · total ' + pr.aciertos + '/' + pr.total + (k ? ' · ' + (O.tipo) + ': ' + Math.round(k.a / k.t * 100) + ' %' : ''); }
    nueva();
  }
  /* ============ Teoria rapida ============ */
  const NS = 'http://www.w3.org/2000/svg', sv = (t, a, txt) => { const e = document.createElementNS(NS, t); Object.keys(a || {}).forEach((k) => e.setAttribute(k, a[k])); if (txt != null) e.textContent = txt; return e; };
  function piano(pcs, raiz) {
    const w = 14 * 26, s = sv('svg', { viewBox: '0 0 ' + w + ' 110', cls: 'mu-piano-svg', role: 'img', 'aria-label': 'Diagrama de piano' }); s.setAttribute('class', 'mu-piano-svg'); const bl = [0, 2, 4, 5, 7, 9, 11], nm = { 0: 1, 1: 3, 3: 6, 4: 8, 5: 10 };
    for (let i = 0; i < 14; i++) { const pc = bl[i % 7], on = pcs.includes(pc), r = on && pc === raiz; s.appendChild(sv('rect', { x: i * 26 + 0.5, y: 0.5, width: 25, height: 108, rx: 3, fill: r ? 'var(--acento)' : on ? 'var(--acento-suave)' : '#fff', stroke: '#555' })); if (on) s.appendChild(sv('text', { x: i * 26 + 13, y: 100, 'text-anchor': 'middle', 'font-size': 10, fill: r ? '#fff' : '#222' }, nom(pc))); }
    for (let i = 0; i < 13; i++) { const idx = i % 7; if (nm[idx] == null || i === 13) continue; const pc = nm[idx], on = pcs.includes(pc), r = on && pc === raiz; s.appendChild(sv('rect', { x: (i + 1) * 26 - 8, y: 0.5, width: 16, height: 66, rx: 2, fill: r ? 'var(--acento)' : on ? 'var(--acento-med)' : '#222', stroke: '#000' })); }
    return s;
  }
  function guitarra(pcs, raiz) {
    const W = 13 * 40 + 30, s = sv('svg', { viewBox: '0 0 ' + W + ' 130', role: 'img', 'aria-label': 'Diagrama de guitarra' }); s.setAttribute('class', 'mu-guit-svg');
    for (let f = 0; f <= 12; f++) s.appendChild(sv('line', { x1: 26 + f * 40, y1: 14, x2: 26 + f * 40, y2: 104, stroke: f === 0 ? '#555' : '#999', 'stroke-width': f === 0 ? 4 : 1 }));
    [3, 5, 7, 9, 12].forEach((f) => s.appendChild(sv('text', { x: 6 + f * 40 + 20, y: 124, 'text-anchor': 'middle', 'font-size': 10, fill: 'currentColor' }, String(f))));
    for (let c = 0; c < 6; c++) { const y = 104 - c * 18, m = TE.CUERDAS[c]; s.appendChild(sv('line', { x1: 26, y1: y, x2: 26 + 12 * 40, y2: y, stroke: '#aaa', 'stroke-width': 1 + (5 - c) * 0.3 })); for (let f = 0; f <= 12; f++) { const pc = (m + f) % 12; if (!pcs.includes(pc)) continue; const x = f === 0 ? 14 : 26 + f * 40 - 20, r = pc === raiz; s.appendChild(sv('circle', { cx: x, cy: y, r: 8, fill: r ? 'var(--acento)' : 'var(--acento-med)', stroke: '#fff' })); s.appendChild(sv('text', { x, y: y + 3.5, 'text-anchor': 'middle', 'font-size': 8, fill: '#fff', 'font-weight': 700 }, nom(pc))); } }
    return s;
  }
  function teoria(p) {
    const d = h('div', { cls: 'tr-panel' }); d.appendChild(h('h2', { txt: 'Círculo de quintas' })); const info = h('div', { id: 'mu-q-info', cls: 'mu-q-info', role: 'status', 'aria-live': 'polite' }); const cont = h('div', { cls: 'mu-circ-w' }); let sel = 0;
    function circulo() {
      cont.textContent = ''; const s = sv('svg', { viewBox: '-150 -150 300 300', role: 'group', 'aria-label': 'Círculo de quintas' }); s.setAttribute('class', 'mu-circ');
      TE.QUINTAS.forEach((pc, i) => { [['M', 0, 0, 0, pc], ['m', 0, 0, 0, TE.relativaMenor(pc)]].forEach(([k, rOut, rr, r, pcn]) => { const a = (i / 12) * Math.PI * 2 - Math.PI / 2, x = Math.cos(a) * (k === 'M' ? 113 : 66), y = Math.sin(a) * (k === 'M' ? 113 : 66), bem = TE.usaBemoles(pc); const gr = sv('g', { tabindex: 0, role: 'button', 'aria-label': (k === 'M' ? nom(pc, bem) + ' mayor' : nom(pcn, bem) + ' menor') + ', ' + armaduraTxt(pc), 'data-pc': pc }); gr.setAttribute('class', 'mu-nodo' + (pc === sel ? ' on' : '') + (k === 'm' ? ' men' : '')); gr.appendChild(sv('circle', { cx: x, cy: y, r: k === 'M' ? 23 : 15.5 })); gr.appendChild(sv('text', { x, y: y + 4.5, 'text-anchor': 'middle', 'font-size': k === 'M' ? 14 : 10.5 }, nom(pcn, bem) + (k === 'm' ? 'm' : ''))); const go = () => { sel = pc; circulo(); detalle(); }; gr.addEventListener('click', go); gr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); s.appendChild(gr); }); });
      cont.appendChild(s);
    }
    const armaduraTxt = (pc) => { const a = TE.armadura(pc); return a === 0 ? 'sin alteraciones' : Math.abs(a) + (a > 0 ? ' sostenido' : ' bemol') + (Math.abs(a) > 1 ? 's' : ''); };
    function detalle() {
      const bem = TE.usaBemoles(sel), dia = TE.diatonicos(sel), esc2 = TE.pcs(sel, TE.ESCALAS['Mayor (jonia)']); info.textContent = ''; Mu.logro('teoria');
      info.appendChild(h('h3', { txt: nom(sel, bem) + ' mayor · relativa ' + nom(TE.relativaMenor(sel), bem) + ' menor' })); info.appendChild(h('p', { txt: 'Armadura: ' + armaduraTxt(sel) + '. Escala: ' + esc2.map((x) => nom(x, bem)).join(' – ') + '.' }));
      const dom = (sel + 7) % 12, sub = (sel + 5) % 12; info.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Dominante: ' + nom(dom, TE.usaBemoles(dom)) + ' · Subdominante: ' + nom(sub, TE.usaBemoles(sub)) + ' (vecinos en el círculo).' }));
      const asc = (pcs, base) => { const r = []; let prev = base - 1; pcs.forEach((pc) => { let m = prev + 1 + ((pc - prev - 1) % 12 + 12) % 12; r.push(m); prev = m; }); return r; };
      const fila = h('div', { cls: 'mu-acordes' }); dia.forEach((c) => fila.appendChild(h('button', { type: 'button', cls: 'tr-btn mu-acorde', 'aria-label': 'Escuchar ' + c.nombre, on: () => tocar(asc(c.notas, 55), 'junto') }, [h('b', { txt: c.nombre }), h('small', { txt: c.grado })]))); info.appendChild(fila);
      info.appendChild(h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'mu-q-esc', txt: 'Escuchar la escala', on: () => { const n = asc(esc2, 60); tocar(n.concat([n[0] + 12]), 'sec', 0.34); } }));
    }
    circulo(); detalle(); d.append(cont, info); p.appendChild(d);
    /* explorador de escalas y acordes */
    const e = h('div', { cls: 'tr-panel' }); e.appendChild(h('h2', { txt: 'Escalas y acordes' }));
    const st = { raiz: 0, modo: 'acorde', nombre: 'Mayor' };
    const rs = h('select', { id: 'mu-ex-raiz', 'aria-label': 'Nota raíz', on: { change: () => { st.raiz = +rs.value; dib(); } } }); for (let i = 0; i < 12; i++) rs.appendChild(h('option', { value: i, txt: nom(i) }));
    const md = h('select', { id: 'mu-ex-modo', 'aria-label': 'Escala o acorde', on: { change: () => { st.modo = md.value; llenar(); dib(); } } }); [['acorde', 'Acorde'], ['escala', 'Escala']].forEach(([v, t]) => md.appendChild(h('option', { value: v, txt: t })));
    const tp = h('select', { id: 'mu-ex-tipo', 'aria-label': 'Tipo', on: { change: () => { st.nombre = tp.value; dib(); } } });
    function llenar() { tp.textContent = ''; const l = Object.keys(st.modo === 'acorde' ? TE.ACORDES : TE.ESCALAS); st.nombre = l[0]; l.forEach((n) => tp.appendChild(h('option', { value: n, txt: n }))); }
    llenar(); e.appendChild(h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'mu-ex-raiz', txt: 'Raíz' }), rs]), h('div', {}, [h('label', { for: 'mu-ex-modo', txt: 'Mostrar' }), md]), h('div', {}, [h('label', { for: 'mu-ex-tipo', txt: 'Tipo' }), tp])]));
    const res = h('div', { id: 'mu-ex-res', role: 'status', 'aria-live': 'polite' }), pi = h('div', { cls: 'mu-diag', id: 'mu-ex-piano' }), gu = h('div', { cls: 'mu-diag', id: 'mu-ex-guit' }); e.append(res, h('h3', { txt: 'Piano' }), pi, h('h3', { txt: 'Guitarra (todas las posiciones)' }), gu, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'mu-ex-oir', txt: 'Escuchar', on: () => { const f = (st.modo === 'acorde' ? TE.ACORDES : TE.ESCALAS)[st.nombre]; tocar(f.map((i) => 48 + st.raiz + i).concat(st.modo === 'escala' ? [60 + st.raiz] : []), st.modo === 'acorde' ? 'junto' : 'sec', 0.32); } })]));
    function dib() { const f = (st.modo === 'acorde' ? TE.ACORDES : TE.ESCALAS)[st.nombre], pcs = TE.pcs(st.raiz, f), bem = TE.usaBemoles(st.raiz); res.textContent = ''; res.appendChild(h('p', {}, [h('b', { txt: nom(st.raiz, bem) + (st.modo === 'acorde' ? ' ' + (TE.SIMBOLO[st.nombre] || st.nombre) : ' ' + st.nombre) + ': ' }), pcs.map((x) => nom(x, bem)).join(' – ') + ' (' + f.map((i) => (i === 0 ? 'raíz' : TE.INTERVALOS[i % 13] || i)).join(', ') + ')'])); if (st.modo === 'acorde') { const dg = TE.digitacion(st.raiz, st.nombre); res.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Digitación sugerida (cuerdas 6→1, x = no tocar): ' + dg.trastes.map((x) => (x < 0 ? 'x' : x)).join(' ') })); } pi.textContent = ''; pi.appendChild(piano(pcs, st.raiz)); gu.textContent = ''; gu.appendChild(guitarra(pcs, st.raiz)); }
    dib(); p.appendChild(e);
  }
  /* ============ Lector de ritmo ============ */
  function figuras(patron) { // dibuja pulsos y figuras en un pentagrama de una linea
    const W = 600, s = sv('svg', { viewBox: '0 0 ' + W + ' 110', role: 'img', 'aria-label': 'Patrón rítmico de un compás de 4/4' }); s.setAttribute('class', 'mu-ritmo-svg'); const x0 = 92, ancho = W - 130, X = (b) => x0 + b / 4 * ancho;
    s.appendChild(sv('line', { x1: 20, y1: 70, x2: W - 10, y2: 70, stroke: 'currentColor', 'stroke-width': 1.5 })); for (let b = 0; b <= 4; b++) s.appendChild(sv('line', { x1: X(b) - 12, y1: 50, x2: X(b) - 12, y2: 90, stroke: b % 4 === 0 ? 'currentColor' : '#999', 'stroke-width': b % 4 === 0 ? 2 : 0.8, 'stroke-dasharray': b % 4 === 0 ? '' : '3 3' })); s.appendChild(sv('text', { x: 24, y: 64, 'font-size': 13, 'font-weight': 700, fill: 'currentColor' }, '4')); s.appendChild(sv('text', { x: 24, y: 82, 'font-size': 13, 'font-weight': 700, fill: 'currentColor' }, '4'));
    const notas = patron.map(([ini, dur]) => ({ ini, dur })); let t = 0; notas.forEach((n) => { if (n.ini > t + 1e-9) s.appendChild(sv('path', { d: 'M' + (X(t + (n.ini - t) / 2) - 5) + ' 62 l9 6 l-9 6 l9 6', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 })); t = n.ini + n.dur; }); if (t < 4 - 1e-9) s.appendChild(sv('path', { d: 'M' + (X(t + (4 - t) / 2) - 5) + ' 62 l9 6 l-9 6 l9 6', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }));
    notas.forEach((n, i) => { const x = X(n.ini); s.appendChild(sv('ellipse', { cx: x, cy: 70, rx: 7, ry: 5, fill: n.dur >= 2 ? 'none' : 'currentColor', stroke: 'currentColor', 'stroke-width': 2, transform: 'rotate(-18 ' + x + ' 70)' })); s.appendChild(sv('line', { x1: x + 6.5, y1: 68, x2: x + 6.5, y2: 30, stroke: 'currentColor', 'stroke-width': 2 })); if (n.dur === 1.5 || n.dur === 0.75) s.appendChild(sv('circle', { cx: x + 14, cy: 66, r: 2, fill: 'currentColor' })); const sig = notas[i + 1], corto = n.dur < 1; if (corto && sig && sig.dur < 1 && Math.floor(sig.ini) === Math.floor(n.ini)) { s.appendChild(sv('line', { x1: x + 6.5, y1: 30, x2: X(sig.ini) + 6.5, y2: 30, stroke: 'currentColor', 'stroke-width': 4 })); if (n.dur <= 0.25 || sig.dur <= 0.25) s.appendChild(sv('line', { x1: x + 6.5, y1: 38, x2: X(sig.ini) + 6.5, y2: 38, stroke: 'currentColor', 'stroke-width': 3 })); } else if (corto && !(notas[i - 1] && notas[i - 1].dur < 1 && Math.floor(notas[i - 1].ini) === Math.floor(n.ini))) s.appendChild(sv('path', { d: 'M' + (x + 6.5) + ' 30 q12 6 8 20', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.5 })); });
    return s;
  }
  function ritmo(p) {
    const R = Ap.ritmo = { patron: null, bpm: 80, fase: 'espera', toques: [], t0: 0, mejor: 0, esperados: [] };
    const d = h('div', { cls: 'tr-panel' }); d.appendChild(h('h2', { txt: 'Lector de ritmo' })); d.appendChild(h('p', { cls: 'tr-sub', txt: 'Lee el patrón, escúchalo y tócalo: tras 4 pulsos de cuenta atrás, toca (botón grande, tecla Espacio o pantalla) cada figura en su momento.' }));
    const bpm = h('input', { type: 'range', id: 'mu-r-bpm', min: 50, max: 140, value: R.bpm, 'aria-label': 'Tempo', on: { input: () => { R.bpm = +bpm.value; out.textContent = R.bpm + ' BPM'; } } }), out = h('output', { for: 'mu-r-bpm', txt: R.bpm + ' BPM' }); d.appendChild(h('div', { cls: 'mu-rango' }, [h('label', { for: 'mu-r-bpm', txt: 'Tempo' }), bpm, out]));
    const lienzo = h('div', { cls: 'mu-ritmo-w', id: 'mu-ritmo-w' }), btn = h('button', { type: 'button', cls: 'mu-tocar', id: 'mu-r-tocar', 'aria-label': 'Tocar aquí al ritmo', txt: 'TOCA' }), res = h('div', { id: 'mu-r-res', role: 'status', 'aria-live': 'polite', cls: 'mu-r-res' }), est = h('p', { cls: 'tr-ayuda', id: 'mu-r-est', role: 'status' });
    d.append(lienzo, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', id: 'mu-r-oir', txt: 'Escuchar patrón', on: () => oirPatron() }), h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'mu-r-ir', txt: 'Empezar (cuenta atrás)', on: () => empezar() }), h('button', { type: 'button', cls: 'tr-btn', id: 'mu-r-nuevo', txt: 'Otro patrón', on: () => nuevo() })]), btn, est, res); p.appendChild(d);
    function nuevo() { let n; do { n = TE.PATRONES_RITMO[Math.floor(Math.random() * TE.PATRONES_RITMO.length)]; } while (n === R.patron); R.patron = n; lienzo.textContent = ''; lienzo.appendChild(figuras(n)); res.textContent = ''; R.fase = 'espera'; est.textContent = ''; }
    const durB = () => 60 / R.bpm;
    function programar(conToques) { // metronomo de cuenta atras + (opcional) patron
      Mu.reanudar(); const n = E.nodos(), t0 = n.ctx.currentTime + 0.15, b = durB(); for (let i = 0; i < 4; i++) SS.clic(n.ctx, n.master, t0 + i * b, i === 0 ? 'fuerte' : 'debil', 0.7); const ini = t0 + 4 * b; if (!conToques) R.patron.forEach(([x]) => SS.clic(n.ctx, n.master, ini + x * b, 'medio', 0.9)); else for (let i = 0; i < 4; i++) SS.clic(n.ctx, n.master, ini + i * b, 'sub', 0.25);
      const ts = n.ctx.getOutputTimestamp ? n.ctx.getOutputTimestamp() : { contextTime: n.ctx.currentTime, performanceTime: performance.now() }; const aMs = (ct) => ts.performanceTime + (ct - ts.contextTime) * 1000 - (n.ctx.outputLatency || 0) * 1000 * 0; return { ini, aMs, b };
    }
    function oirPatron() { if (!R.patron) nuevo(); const n = E.nodos(); Mu.reanudar(); const t0 = n.ctx.currentTime + 0.12, b = durB(); R.patron.forEach(([x]) => SS.clic(n.ctx, n.master, t0 + x * b, 'medio', 0.9)); }
    function empezar() { if (!R.patron) nuevo(); R.fase = 'cuenta'; R.toques = []; res.textContent = ''; const pg = programar(true); R.esperados = R.patron.map(([x]) => pg.aMs(pg.ini + x * pg.b)); R.ventanaIni = pg.aMs(pg.ini) - pg.b * 400; R.fin = pg.aMs(pg.ini + 4 * pg.b) + 600; est.textContent = 'Cuenta atrás… 1 · 2 · 3 · 4 y ¡a tocar!'; R.fase = 'tocando'; setTimeout(() => { if (R.fase === 'tocando') evaluar(); }, Math.max(100, R.fin - performance.now())); btn.focus(); }
    function toque(ts) { if (R.fase !== 'tocando') return; if (ts > R.ventanaIni && ts < R.fin) { R.toques.push(ts); btn.classList.add('golpe'); setTimeout(() => btn.classList.remove('golpe'), 90); } }
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); toque(e.timeStamp || performance.now()); }); btn.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) toque(e.timeStamp || performance.now()); } });
    function evaluar() { R.fase = 'listo'; const r = TE.evaluarRitmo(R.esperados, R.toques, durB() * 1000 * 0.45); mostrar(r); }
    Ap.ritmoEvaluar = (esp, toq) => { R.esperados = esp; R.toques = toq; R.fase = 'listo'; const r = TE.evaluarRitmo(esp, toq, durB() * 1000 * 0.45); mostrar(r); return r; };
    function mostrar(r) { res.textContent = ''; res.appendChild(h('h3', { txt: 'Precisión: ' + r.pct + ' %' + (r.perfecto ? ' · ¡perfecto!' : '') })); res.appendChild(h('ul', { cls: 'mu-r-lista' }, r.items.map((i, k) => h('li', { cls: i.toque == null ? 'mal' : Math.abs(i.errorMs) <= 60 ? 'ok' : '', txt: 'Figura ' + (k + 1) + ': ' + (i.toque == null ? 'sin toque' : (i.errorMs > 0 ? '+' : '') + i.errorMs + ' ms ' + (Math.abs(i.errorMs) <= 60 ? '(en tiempo)' : i.errorMs > 0 ? '(tarde)' : '(pronto)')) })))); if (r.extras) res.appendChild(h('p', { cls: 'tr-ayuda', txt: r.extras + ' toque(s) de más.' })); R.mejor = Math.max(R.mejor, r.pct); est.textContent = 'Mejor de la sesión: ' + R.mejor + ' %'; Mu.logro('ritmo_leido'); if (r.perfecto) Mu.logro('ritmo_perfecto'); Mu.xp(1); }
    addEventListener('keydown', (e) => { if (e.code !== 'Space' || !document.getElementById('v-aprender') || document.getElementById('v-aprender').hidden || Ap.sub !== 'ritmo' || R.fase !== 'tocando') return; if (document.activeElement === btn) return; e.preventDefault(); if (!e.repeat) toque(e.timeStamp || performance.now()); });
    nuevo();
  }
})(window);
