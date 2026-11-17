// Partida en curso: bucle, HUD DOM, entrada (tactil, raton, teclado, mando), tutorial, guardado y avisos.
import { h, $, toast, fmt } from './dom.js';
import * as M from './motor.js';
import { P, Z, PODERES, FILAS, COLS, MUNDOS } from './datos.js';
import { Vista } from './vista.js';
import * as S from './sonido.js';
import * as Ar from './arte.js';
import { AJ, PR, guardarProgreso } from './almacen.js';
import { pista as pistaNivel } from './niveles.js';

const VELS = [1, 1.5, 2, 0.5];
export function iniciarPartida(cfg, op, hooks) {
  const lienzo = $('#lienzo'), vista = new Vista(lienzo, AJ);
  let s = op.restaurar ? M.restaurar(op.restaurar) : null; if (!s) s = M.crear(cfg);
  const niv = s.niv, modo = op.modo || 'aventura';
  const ctl = { s, vista, pausado: false, vivo: true };
  let sel = -1, mod = null, vel = AJ.juego.vel || 1, acc = 0, ult = 0, raf = 0, finT = 0, avisoQ = [], avisoT = 0, guardT = 0, fpsT = 0, fpsN = 0, rec = [], popup = null, arrastre = null, hold = null, poderSel = null, tutPaso = 0, nTotal = niv.olas.filter((o) => o.z).length || 1, ptr = { x: 0, y: 0 }, tactil = false;
  const cursor = { r: 2, c: 1 }; vista.cursor = null; vista.mundo = niv.mundo;
  const poderesOk = op.poderes !== false;
  S.musica(niv.tipo === 'jefe' ? 'jefe' : modo === 'arena' ? 'arena' : MUNDOS[niv.mundo].musica); S.aplicar();

  /* ---------- DOM ---------- */
  const raiz = h('div', { id: 'juego', cls: 'juego' + (niv.noche ? ' noche' : '') });
  const bPausa = h('button', { type: 'button', cls: 'hb', 'data-f': 1, 'aria-label': 'Pausa', txt: '⏸', on: { click: () => hooks.alPausa && hooks.alPausa() } });
  const elCh = h('div', { cls: 'hud-ch', title: 'Chispas', 'aria-label': 'Chispas' }, [h('span', { cls: 'ic', txt: '☀' }), h('b', { id: 'vCh', txt: '0' })]);
  const pips = [0, 1, 2].map(() => h('i', { cls: 'pip' })), bEn = h('button', { type: 'button', cls: 'hb en', 'data-f': 1, 'aria-label': 'Energía Verde: toca y luego elige una planta', title: 'Energía Verde' }, [h('span', { cls: 'ic', txt: '⚡' }), ...pips]);
  const barra = h('div', { cls: 'prog', 'aria-label': 'Progreso' }, [h('div', { cls: 'prog-f' })]), progF = barra.firstChild;
  const nombre = h('div', { cls: 'hud-n', txt: niv.nombre });
  const bVel = h('button', { type: 'button', cls: 'hb', 'data-f': 1, 'aria-label': 'Velocidad', txt: '×' + vel, on: { click: () => { vel = VELS[(VELS.indexOf(vel) + 1) % VELS.length]; AJ.juego.vel = vel; bVel.textContent = '×' + vel; } } });
  const bPista = h('button', { type: 'button', cls: 'hb', 'data-f': 1, 'aria-label': 'Pista de estrategia', txt: '💡', on: { click: () => mostrarPista() } });
  const top = h('div', { cls: 'hud-top' }, [bPausa, elCh, bEn, h('div', { cls: 'hud-mid' }, [nombre, barra]), bPista, bVel]);
  const cartas = s.cartas.map((k, i) => carta(k, i)), cinta = !!s.cinta;
  const elSem = h('div', { cls: 'semillas', id: 'semillas', role: 'toolbar', 'aria-label': 'Semillas' }, cartas.map((c) => c.el));
  const bPala = h('button', { type: 'button', cls: 'pod', 'data-f': 1, 'aria-label': 'Pala', title: 'Pala (X)', on: { click: () => setMod(mod === 'pala' ? null : 'pala') } }, [h('span', { cls: 'ic', txt: '⛏' }), h('small', { txt: 'Pala' })]);
  const pods = PODERES.map((p) => h('button', { type: 'button', cls: 'pod', 'data-f': 1, 'data-id': p.id, 'aria-label': p.n, title: p.d, on: { click: () => setMod(mod === p.id ? null : p.id) } }, [h('span', { cls: 'ic', txt: p.ic }), h('small', { txt: p.n }), h('em', { txt: '' })]));
  const elPod = h('div', { cls: 'poderes', id: 'poderes' }, [bPala, ...(poderesOk ? pods : [])]);
  const elBanner = h('div', { cls: 'banner', role: 'status', 'aria-live': 'polite' }), elTut = h('div', { cls: 'tut', role: 'status' });
  const elFps = h('div', { cls: 'fps' });
  raiz.append(top, elSem, elPod, elBanner, elTut, elFps); document.body.appendChild(raiz);

  function carta(k, i) {
    const cv = h('canvas', { width: 64, height: 64, 'aria-hidden': 'true' }); Ar.iconoCanvasPlanta(cv, k.id, 0.3);
    const cd = h('div', { cls: 'cd' }), cs = h('span', { cls: 'coste', txt: s.cinta ? '' : String(k.coste) }), tk = h('span', { cls: 'tecla', txt: i < 9 ? String(i + 1) : '' });
    const el = h('button', { type: 'button', cls: 'carta', 'data-f': 1, 'aria-label': `${P[k.id].n}, ${k.coste} chispas`, 'data-i': i, on: { pointerdown: (e) => { arrastre = { i, x: e.clientX, y: e.clientY, mov: false }; ptr.x = e.clientX; ptr.y = e.clientY; }, click: (e) => { if (e.detail === 0 || !arrastre || !arrastre.mov) elegir(i); } } }, [cv, cd, cs, tk]);
    return { el, cd, cs, k, cv };
  }
  function repintarCartas() { elSem.textContent = ''; cartas.length = 0; s.cartas.forEach((k, i) => { const c = carta(k, i); cartas.push(c); elSem.appendChild(c.el); }); layout(); }

  /* ---------- modos ---------- */
  function setMod(m, i) {
    mod = m; sel = m === 'planta' ? i : -1; vista.modo = m; vista.sel = sel >= 0 ? sel : null; vista.fantasma = sel >= 0 && s.cartas[sel] ? s.cartas[sel].id : null; poderSel = poderesOk && PODERES.some((p) => p.id === m) ? m : null;
    elSem.querySelectorAll('.carta').forEach((c) => c.classList.toggle('sel', +c.dataset.i === sel)); bEn.classList.toggle('on', m === 'energia'); bPala.classList.toggle('on', m === 'pala'); pods.forEach((b) => b.classList.toggle('on', b.dataset.id === m));
    raiz.dataset.mod = m || ''; cerrarPopup(); S.sfx('clic');
  }
  function elegir(i) { const k = s.cartas[i]; if (!k) return; if (mod === 'planta' && sel === i) { setMod(null); return; } setMod('planta', i); }
  bEn.addEventListener('pointerdown', (e) => { arrastre = { i: -2, x: e.clientX, y: e.clientY, mov: false }; });
  bEn.addEventListener('click', (e) => { if (arrastre && arrastre.mov) return; if (s.en < 1) { toast('Necesitas Energía Verde: la sueltan los zombis brillantes ✨'); S.sfx('error'); return; } setMod(mod === 'energia' ? null : 'energia'); });
  pods.forEach((b) => { b.addEventListener('pointerdown', (e) => { arrastre = { i: -3, id: b.dataset.id, x: e.clientX, y: e.clientY, mov: false }; }); });

  /* ---------- acciones ---------- */
  function puede(r, c) { const k = s.cartas[sel]; return !!(k && M.puedePlantar(s, k.id, r, c)); }
  function accionCelda(r, c) {
    if (s.fin) return; const p = M.plantaEn(s, r, c) || M.celda(s, r, c).base;
    if (mod === 'planta') { if (M.plantar(s, sel, r, c)) { tutOk('plantar'); if (cinta) repintarCartas(); setMod(null); } return; }
    if (mod === 'energia') { const q = M.plantaEn(s, r, c); if (q && M.energia(s, q)) { tutOk('energia'); setMod(null); } else S.sfx('error'); return; }
    if (mod === 'pala') { if (p && M.quitar(s, p)) setMod(null); return; }
    if (s.cel[M.idx(r, c)].ter === 'tumba') { M.golpearTumba(s, r, c); return; }
    if (p && p.k !== 'base') abrirPopup(p);
  }
  function usarPoder(id, z, o) {
    if (!poderesOk || !z) return false; const def = PODERES.find((q) => q.id === id); if (!def) return false;
    if (PR.poderes.libres > 0) PR.poderes.libres--; else if (PR.monedas >= def.coste) PR.monedas -= def.coste; else { toast('Te faltan monedas para ' + def.n); S.sfx('error'); return false; }
    PR.stats.poderes++; guardarProgreso(); const ok = M.poder(s, id, z, o); if (ok) tutOk('poder'); return ok;
  }
  function abrirPopup(p) {
    cerrarPopup(); const d = P[p.id], x = vista.xc(p.c + 0.5), y = vista.yb(p.r, 0.2), c = M.costeMejora(s, p);
    const btns = [];
    if (p.nv < 3) btns.push(h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: `⬆ Mejorar ${c}☀`, on: { click: () => { M.mejorar(s, p); cerrarPopup(); } } })); else btns.push(h('span', { cls: 'nota', txt: 'Nivel máximo' }));
    if (d.en && !p.tmp) btns.push(h('button', { type: 'button', cls: 'btn verde', 'data-f': 1, txt: '⚡ ' + d.en.nom, on: { click: () => { if (M.energia(s, p)) tutOk('energia'); cerrarPopup(); } } }));
    btns.push(h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: '🗑 Quitar', on: { click: () => { M.quitar(s, p); cerrarPopup(); } } }));
    popup = h('div', { cls: 'popup' }, [h('b', { txt: d.n + ' ' + '★'.repeat(p.nv - 1) }), h('small', { txt: `${d.rol} · ${Math.round(p.hp)}/${Math.round(p.hpMax)} PS` }), ...btns]);
    raiz.appendChild(popup); const w = popup.offsetWidth || 150; const m = vista.margen; popup.style.left = Math.max(m.l + 4, Math.min(vista.W - m.r - w - 4, x - w / 2)) + 'px'; popup.style.top = Math.max(50, Math.min(vista.H - m.b - (popup.offsetHeight || 140) - 4, y + 8)) + 'px';
    const f = popup.querySelector('[data-f]'); if (f && window.Mando && window.Mando.conectado) f.focus();
  }
  function cerrarPopup() { if (popup) { popup.remove(); popup = null; } }
  function mostrarPista() {
    if (ctl.pausado) return; const tengo = s.cartas.map((k) => k.id), pi = pistaNivel(niv, tengo); S.sfx('clic');
    rec = pi.rec.map((id) => tengo.indexOf(id)).filter((i) => i >= 0); elSem.querySelectorAll('.carta').forEach((c) => c.classList.toggle('rec', rec.includes(+c.dataset.i))); setTimeout(() => elSem.querySelectorAll('.carta.rec').forEach((c) => c.classList.remove('rec')), 9000);
    const d = h('div', { cls: 'pan dlg pistas' }, [h('h3', { txt: '💡 Pista de estrategia' }), h('ul', {}, pi.texto.map((t) => h('li', { txt: t }))), h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Entendido', on: { click: () => { d.remove(); ctl.pausado = false; } } })]);
    ctl.pausado = true; raiz.appendChild(d); const f = d.querySelector('[data-f]'); if (f) f.focus({ preventScroll: true });
  }
  function banner(txt, col) { avisoQ.push({ txt, col }); }

  /* ---------- tutorial ---------- */
  const TUT = [
    { id: 'plantar1', msg: 'Toca la carta de la Chispera y luego una casilla de la columna izquierda.', ok: () => s.plantas.some((p) => p.id === 'chispera') },
    { id: 'recoger', msg: 'Toca las chispas ☀ que caen para recogerlas. Con ellas plantas más.', ok: () => s.st.soles >= 1 },
    { id: 'plantar2', msg: 'Planta un Brote Disparador delante: dispara a los zombis de su fila.', ok: () => s.plantas.some((p) => p.id === 'brote') },
    { id: 'verde', msg: 'Los zombis brillantes sueltan Energía Verde ⚡. Tócala para guardarla.', ok: () => s.st.verdes >= 1 || s.fin },
    { id: 'energia', msg: 'Toca ⚡ y luego una planta: ¡liberas su energía especial!', ok: () => s.st.energias >= 1 || s.fin },
  ];
  const usaTut = !!niv.tutorial && AJ.juego.tutorial && !PR.tut.basico;
  function tutOk() { /* se evalua en el bucle */ }
  function tutPaso1() { if (!usaTut || tutPaso >= TUT.length) { elTut.classList.remove('on'); return; } const t = TUT[tutPaso]; if (t.ok()) { tutPaso++; if (tutPaso >= TUT.length) { PR.tut.basico = 1; guardarProgreso(); } } const q = TUT[tutPaso]; elTut.textContent = q ? q.msg : ''; elTut.classList.toggle('on', !!q); }

  /* ---------- layout ---------- */
  function layout() {
    const w = window.innerWidth, hh = window.innerHeight, ts = AJ.accesibilidad.texto || 1, vert = w < hh * 1.05, ct = AJ.controles; raiz.classList.toggle('vert', vert); raiz.classList.toggle('zurdo', !!ct.zurdo);
    raiz.style.setProperty('--tam', String(ct.tam || 1)); raiz.style.setProperty('--op', String(ct.op || 1));
    const m = { t: top.offsetHeight + 4, l: 0, r: 0, b: 0 };
    if (vert) m.b = elSem.offsetHeight + elPod.offsetHeight + 6; else { m.l = elSem.offsetWidth + 4; m.r = elPod.offsetWidth + 4; }
    vista.redimensionar(w, hh, window.devicePixelRatio || 1, m); void ts;
  }
  const onRes = () => layout(); window.addEventListener('resize', onRes); window.addEventListener('orientationchange', onRes); layout(); setTimeout(layout, 120);

  /* ---------- entrada: puntero ---------- */
  const rect = () => lienzo.getBoundingClientRect();
  const pos = (e) => { const r = rect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  lienzo.addEventListener('pointerdown', (e) => {
    if (hooks.bloqueado && hooks.bloqueado()) return; if (ctl.pausado || s.fin) return; tactil = e.pointerType === 'touch'; cerrarPopup(); const p = pos(e); ptr = p; try { lienzo.setPointerCapture(e.pointerId); } catch (x) { /* nada */ }
    const o = vista.orbeEn(s, p.x, p.y); if (o && !poderSel) { M.recoger(s, o.id); return; }
    if (poderSel) { const z = vista.zombiEn(s, p.x, p.y); if (z) { if (poderSel === 'lanzar') { hold = z; } else usarPoder(poderSel, z); } return; }
    const c = vista.celdaEn(p.x, p.y); if (c) { cursor.r = c.r; cursor.c = c.c; accionCelda(c.r, c.c); }
  });
  lienzo.addEventListener('pointermove', (e) => { const p = pos(e); ptr = p; if (e.pointerType === 'mouse' || mod === 'planta') { const c = vista.celdaEn(p.x, p.y); vista.cursor = c && (e.pointerType === 'mouse' || mod) ? c : null; if (c) { cursor.r = c.r; cursor.c = c.c; } } });
  lienzo.addEventListener('pointerleave', () => { if (!window.Mando || !window.Mando.activo) vista.cursor = null; });
  window.addEventListener('pointermove', (e) => { if (arrastre && !arrastre.mov && Math.hypot(e.clientX - arrastre.x, e.clientY - arrastre.y) > 10) { arrastre.mov = true; if (arrastre.i >= 0) elegir(arrastre.i); else if (arrastre.i === -2 && s.en > 0) setMod('energia'); else if (arrastre.i === -3) setMod(arrastre.id); } if (arrastre && arrastre.mov) { const p = pos(e), c = vista.celdaEn(p.x, p.y); vista.cursor = c; if (c) { cursor.r = c.r; cursor.c = c.c; } } });
  window.addEventListener('pointerup', (e) => {
    const p = pos(e);
    if (hold) { const z = hold; hold = null; if (!s.fin && M.vivo(z)) { const c = vista.celdaEn(p.x, p.y); if (c) usarPoder('lanzar', z, { r: c.r, x: c.c + 0.5 }); else usarPoder('lanzar', z, { r: z.r, x: z.x + 1.5 }); } }
    if (arrastre && arrastre.mov && !s.fin) { const c = vista.celdaEn(p.x, p.y); if (c) { if (poderSel && poderSel !== 'lanzar') { const z = vista.zombiEn(s, p.x, p.y); if (z) usarPoder(poderSel, z); } else if (mod && mod !== 'lanzar') accionCelda(c.r, c.c); } else if (mod === 'planta') setMod(null); }
    arrastre = null; if (e.pointerType === 'touch' && !mod) vista.cursor = null;
  });
  lienzo.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ---------- entrada: teclado ---------- */
  function tecla(e) {
    if (hooks.bloqueado && hooks.bloqueado()) return; const T = AJ.controles.teclas, k = e.key; if (ctl.pausado && k !== 'Escape') return;
    if (/^[1-9]$/.test(k)) { elegir(+k - 1); return; }
    if (k === T.pausa || k === 'p') { hooks.alPausa && hooks.alPausa(); e.preventDefault(); return; }
    if (s.fin) return; vista.cursor = vista.cursor || { r: cursor.r, c: cursor.c };
    if (k === T.arriba) cursor.r = Math.max(0, cursor.r - 1); else if (k === T.abajo) cursor.r = Math.min(FILAS - 1, cursor.r + 1); else if (k === T.izq) cursor.c = Math.max(0, cursor.c - 1); else if (k === T.der) cursor.c = Math.min(COLS - 1, cursor.c + 1);
    else if (k === T.plantar || k === ' ') { accionCelda(cursor.r, cursor.c); e.preventDefault(); }
    else if (k === T.pala) setMod(mod === 'pala' ? null : 'pala'); else if (k === T.energia) { if (s.en > 0) setMod(mod === 'energia' ? null : 'energia'); } else if (k === T.sol) M.recogerTodo(s);
    else if (k === T.sig) cicla(1); else if (k === T.ant) cicla(-1); else if (k === 'Backspace') setMod(null); else return;
    vista.cursor = { r: cursor.r, c: cursor.c }; if (/Arrow/.test(k)) e.preventDefault();
  }
  const cicla = (d) => { const n = s.cartas.length; if (!n) return; elegir(((sel < 0 ? (d > 0 ? -1 : 0) : sel) + d + n) % n); };
  window.addEventListener('keydown', tecla);

  /* ---------- entrada: mando ---------- */
  let rep = 0, repD = '';
  function leerMando(dt) {
    const Md = window.Mando; if (!Md || (hooks.bloqueado && hooks.bloqueado()) || ctl.pausado) return; Md.leer(); if (!Md.conectado) return;
    if (Md.pulsado('MENU')) { hooks.alPausa && hooks.alPausa(); return; }
    if (Md.activo) vista.cursor = vista.cursor || { r: cursor.r, c: cursor.c };
    const ex = Md.ejes.izq.x, ey = Md.ejes.izq.y; let dir = ''; if (Md.sostenido('ARRIBA') || ey < -0.5) dir = 'u'; else if (Md.sostenido('ABAJO') || ey > 0.5) dir = 'd'; else if (Md.sostenido('IZQ') || ex < -0.5) dir = 'l'; else if (Md.sostenido('DER') || ex > 0.5) dir = 'r';
    if (dir) { rep -= dt; if (repD !== dir || rep <= 0) { rep = repD === dir ? 0.12 : 0.26; repD = dir; if (dir === 'u') cursor.r = Math.max(0, cursor.r - 1); if (dir === 'd') cursor.r = Math.min(FILAS - 1, cursor.r + 1); if (dir === 'l') cursor.c = Math.max(0, cursor.c - 1); if (dir === 'r') cursor.c = Math.min(COLS - 1, cursor.c + 1); } } else { rep = 0; repD = ''; }
    vista.cursor = { r: cursor.r, c: cursor.c };
    if (Md.pulsado('A')) { const o = s.orbes.find((q) => Math.abs(q.x - (cursor.c + 0.5)) < 0.8 && Math.abs(q.y - cursor.r) < 0.8); if (o && !mod) M.recoger(s, o.id); else if (poderSel) { const z = M.objetivoCercano(s, cursor.c + 0.5, cursor.r + 0.5); if (z) { if (poderSel === 'lanzar') { hold = z; setMod(null); const r2 = Math.min(FILAS - 1, z.r + 1); usarPoder('lanzar', z, { r: r2, x: z.x }); hold = null; } else usarPoder(poderSel, z); } } else accionCelda(cursor.r, cursor.c); }
    if (Md.pulsado('B')) { if (popup) cerrarPopup(); else setMod(null); }
    if (Md.pulsado('X')) setMod(mod === 'pala' ? null : 'pala'); if (Md.pulsado('Y')) M.recogerTodo(s);
    if (Md.pulsado('RB')) cicla(1); if (Md.pulsado('LB')) cicla(-1);
    if (Md.pulsado('LT') || (Md.gatillo.izq > 0.6 && !ctl._lt)) { if (s.en > 0) setMod(mod === 'energia' ? null : 'energia'); } ctl._lt = Md.gatillo.izq > 0.6;
    if ((Md.pulsado('RT') || (Md.gatillo.der > 0.6 && !ctl._rt)) && poderesOk) { const ids = [null, ...PODERES.map((p) => p.id)], i = ids.indexOf(poderSel); setMod(ids[(i + 1) % ids.length]); } ctl._rt = Md.gatillo.der > 0.6;
    if (Md.pulsado('VISTA')) mostrarPista();
  }

  /* ---------- bucle ---------- */
  const pasoFijo = 1 / 60;
  function bucle(ts) {
    if (!ctl.vivo) return; raf = requestAnimationFrame(bucle);
    const dtR = Math.min(0.1, (ts - ult) / 1000 || 0.016); ult = ts;
    const fpsMax = AJ.graficos.fps; if (fpsMax < 60 && dtR < 1 / fpsMax - 0.002) { ult -= 0; }
    leerMando(dtR);
    if (!ctl.pausado) { acc += dtR * vel; let n = 0; while (acc >= pasoFijo && n < 8) { M.paso(s, pasoFijo); acc -= pasoFijo; n++; if (s.ev.length) { vista.eventos(s, s.ev); s.ev.length = 0; } if (s.fin) break; } if (n >= 8) acc = 0; }
    for (const q of vista.pend.splice(0)) if (q.k === 'banner') banner(q.txt, q.col);
    actualizarHud(dtR);
    vista.dibujar(s, ctl.pausado ? 0 : dtR, { puede });
    if (s.fin && !finT) { finT = 1; if (s.fin === 'victoria') { M.recogerTodo(s); S.sfx('victoria'); } else S.sfx('derrota'); setTimeout(() => { if (ctl.vivo && hooks.alFin) hooks.alFin(s); }, s.fin === 'victoria' ? 1800 : 1400); }
    guardT += dtR; if (guardT > 4 && !s.fin && !ctl.pausado) { guardT = 0; if (hooks.guardar) hooks.guardar(M.serializar(s)); }
    fpsT += dtR; fpsN++; if (fpsT >= 1) { const fps = fpsN / fpsT; if (AJ.graficos.mostrarFps) elFps.textContent = Math.round(fps) + ' FPS'; else elFps.textContent = ''; autoCalidad(fps); fpsT = 0; fpsN = 0; }
  }
  let bajos = 0;
  function autoCalidad(fps) { if (!AJ.graficos.auto || ctl.pausado) return; if (fps < 32) bajos++; else bajos = Math.max(0, bajos - 1); if (bajos >= 4 && vista.resFactor > 0.6) { vista.resFactor = Math.max(0.6, vista.resFactor - 0.2); bajos = 0; layout(); if (AJ.graficos.calidad !== 'baja' && vista.resFactor <= 0.7) { AJ.graficos.calidad = AJ.graficos.calidad === 'ultra' ? 'alta' : AJ.graficos.calidad === 'alta' ? 'media' : 'baja'; } } }
  function actualizarHud(dt) {
    $('#vCh', raiz).textContent = fmt(s.ch); elCh.classList.toggle('vacio', cinta);
    pips.forEach((p, i) => p.classList.toggle('on', i < s.en)); bEn.classList.toggle('lista', s.en > 0);
    const vivos = s.zombis.filter((z) => z.estado !== 'muere').length, pend = s.olas.filter((o) => o.z).length, hecho = 1 - (pend + vivos) / Math.max(nTotal, pend + vivos);
    progF.style.width = Math.max(0, Math.min(100, hecho * 100)) + '%'; barra.classList.toggle('jefe', niv.tipo === 'jefe');
    s.cartas.forEach((k, i) => { const c = cartas[i]; if (!c) return; const rest = M.cartaLista(s, i), ok = cinta || (s.ch >= k.coste && rest <= 0); c.cd.style.height = cinta ? '0%' : Math.min(100, rest / (P[k.id].rec * s.recM) * 100) + '%'; c.el.classList.toggle('no', !ok); });
    if (poderesOk) pods.forEach((b, i) => { const def = PODERES[i]; b.lastChild.textContent = PR.poderes.libres > 0 ? '×' + PR.poderes.libres : def.coste + '$'; b.classList.toggle('no', PR.poderes.libres <= 0 && PR.monedas < def.coste); });
    avisoT -= dt; if (avisoT <= 0 && avisoQ.length) { const q = avisoQ.shift(); elBanner.textContent = q.txt; elBanner.style.color = q.col || ''; elBanner.classList.add('on'); avisoT = 2.1; if (!avisoQ.length) setTimeout(() => { if (avisoT <= 0.2) elBanner.classList.remove('on'); }, 2000); }
    else if (avisoT <= 0 && !avisoQ.length) elBanner.classList.remove('on');
    tutPaso1();
  }
  function pausarBucle(p) { ctl.pausado = p; if (!p) ult = performance.now(); }
  const oculta = () => { if (document.hidden) { if (hooks.guardar && !s.fin) hooks.guardar(M.serializar(s)); S.pausarAudio(true); if (!ctl.pausado && !s.fin && hooks.alPausa) hooks.alPausa(); } else S.pausarAudio(false); };
  document.addEventListener('visibilitychange', oculta);
  raf = requestAnimationFrame((t) => { ult = t; bucle(t); });
  if (s.niv.tipo === 'jefe' && s.t < 1) banner('¡Cuidado! Jefe del mundo al final', '#f8a');
  if (s.t < 1 && MUNDOS[niv.mundo].mec && niv.n === 1 && modo === 'aventura') banner(MUNDOS[niv.mundo].mecN + ': ' + MUNDOS[niv.mundo].mecD, '#fff');

  ctl.destruir = () => { ctl.vivo = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onRes); window.removeEventListener('orientationchange', onRes); window.removeEventListener('keydown', tecla); document.removeEventListener('visibilitychange', oculta); raiz.remove(); };
  ctl.pausar = pausarBucle; ctl.serializar = () => M.serializar(s); ctl.refrescar = () => { vel = AJ.juego.vel || 1; bVel.textContent = '×' + vel; layout(); };
  ctl.reanudar = () => { pausarBucle(false); layout(); };
  ctl.ocultar = (b) => { raiz.style.visibility = b ? 'hidden' : ''; };
  ctl.sel = () => sel; ctl.tiempo = () => s.t;
  return ctl;
}
