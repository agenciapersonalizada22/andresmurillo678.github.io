// Gestor de pantallas DOM y pantallas principales: menu, mapa del tiempo, preparacion, pausa, resultado y ayuda.
import { h, $, toast, fmt } from './dom.js';
import { P, Z, IDS_P, MUNDOS, NIV_POR_MUNDO, MUNDO_ZOMBIS } from './datos.js';
import { PR, AJ, slots, estrellasTotal, estrellasMundo, hechosMundo, mundoAbierto, nivelAbierto, plantaLibre, guardarProgreso, leerPartida, nHechos } from './almacen.js';
import { nivelAventura, zombisDe, pista, idPorIndice, diaDe, semanaDe, EVENTOS } from './niveles.js';
import * as Ar from './arte.js';
import * as S from './sonido.js';
import { App } from './app.js';

/* ---------- gestor de pantallas ---------- */
const pila = []; let cont = null;
export function iniciarUI() { cont = $('#pantalla'); }
export const hayPantalla = () => !!cont && cont.classList.contains('on');
export function mostrar(construir, opc) { pila.push({ construir, opc: opc || {} }); pintarTop(); }
function pintarTop() {
  const top = pila[pila.length - 1]; cont.textContent = '';
  if (!top) { cont.classList.remove('on'); document.body.classList.remove('con-pantalla'); return; }
  const el = top.construir(); cont.appendChild(el); cont.classList.add('on'); document.body.classList.add('con-pantalla'); el.classList.add('pan');
  cont.dataset.t = el.classList.contains('menu') ? 'menu' : 'otro'; const f = el.querySelector('[data-f]:not([data-atras])') || el.querySelector('[data-f]'); if (f && window.Mando && window.Mando.activo) f.focus({ preventScroll: true }); cont.scrollTop = 0;
}
export function atras() { if (!pila.length) return; const t = pila.pop(); if (t.opc.alCerrar) t.opc.alCerrar(); pintarTop(); }
export function cerrarTodo() { while (pila.length) { const t = pila.pop(); if (t.opc.alCerrar) t.opc.alCerrar(); } pintarTop(); }
export function reemplazar(construir, opc) { pila.pop(); mostrar(construir, opc); }
export const refrescar = () => pintarTop();
export const profundidad = () => pila.length;
export const btnAtras = (txt) => h('button', { type: 'button', cls: 'btn atras', 'data-f': 1, 'data-atras': 1, txt: txt || '← Volver', on: { click: () => { S.sfx('clic'); atras(); } } });
export const btn = (txt, fn, cls) => h('button', { type: 'button', cls: 'btn ' + (cls || ''), 'data-f': 1, txt, on: { click: () => { S.sfx('clic'); fn(); } } });
export function tabs(lista, actual, alCambiar) { return h('div', { cls: 'tabs', role: 'tablist' }, lista.map((t) => h('button', { type: 'button', cls: 'tab' + (t.id === actual ? ' on' : ''), role: 'tab', 'data-f': 1, txt: t.n, on: { click: () => { S.sfx('clic'); alCambiar(t.id); } } }))); }
export const cabecera = (titulo, extra) => h('div', { cls: 'cab' }, [btnAtras(), h('h2', { txt: titulo }), h('div', { cls: 'monedero' }, [h('span', { txt: '🪙 ' + fmt(PR.monedas) }), h('span', { txt: '💎 ' + fmt(PR.gemas) }), ...(extra || [])])]);

/* navegacion con mando para menus */
let rep = { d: '', t: 0 }, ult = 0;
export function iniciarNavMando() {
  const paso = (ts) => {
    requestAnimationFrame(paso); const dt = Math.min(0.1, (ts - ult) / 1000 || 0.016); ult = ts;
    const Md = window.Mando; if (!Md || !hayPantalla()) return; if (window.Lobby && window.Lobby.abierto) return; if (App.bloqueoNav && App.bloqueoNav()) return;
    Md.leer(); if (!Md.conectado) return;
    const ex = Md.ejes.izq.x, ey = Md.ejes.izq.y; let dir = '';
    if (Md.sostenido('ARRIBA') || ey < -0.55) dir = 'u'; else if (Md.sostenido('ABAJO') || ey > 0.55) dir = 'd'; else if (Md.sostenido('IZQ') || ex < -0.55) dir = 'l'; else if (Md.sostenido('DER') || ex > 0.55) dir = 'r';
    if (dir) { rep.t -= dt; if (rep.d !== dir || rep.t <= 0) { moverFoco(dir); rep.t = rep.d === dir ? 0.14 : 0.3; rep.d = dir; } } else { rep.d = ''; rep.t = 0; }
    if (Md.pulsado('A')) { const a = document.activeElement; if (a && cont.contains(a)) a.click(); else moverFoco('d'); }
    if (Md.pulsado('B')) { const b = cont.querySelector('[data-atras]'); if (b) b.click(); else if (cont.dataset.t !== 'menu') atras(); }
    if (Md.pulsado('RB') || Md.pulsado('LB')) { const tb = [...cont.querySelectorAll('.tabs .tab')].filter((x) => x.offsetParent); const i = tb.findIndex((x) => x.classList.contains('on')); if (tb.length) tb[(i + (Md.pulsado('RB') ? 1 : -1) + tb.length) % tb.length].click(); }
  };
  requestAnimationFrame(paso);
}
function moverFoco(dir) {
  const els = [...cont.querySelectorAll('[data-f]')].filter((e) => !e.disabled && e.offsetParent); if (!els.length) return; const act = document.activeElement; if (!els.includes(act)) { els[0].focus(); return; }
  const a = act.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2; let mejor = null, ms = 1e9;
  for (const e of els) { if (e === act) continue; const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, dx = x - ax, dy = y - ay; let p, o;
    if (dir === 'u') { if (dy >= -4) continue; p = -dy; o = Math.abs(dx); } else if (dir === 'd') { if (dy <= 4) continue; p = dy; o = Math.abs(dx); } else if (dir === 'l') { if (dx >= -4) continue; p = -dx; o = Math.abs(dy); } else { if (dx <= 4) continue; p = dx; o = Math.abs(dy); }
    const sc = p + o * 2.2; if (sc < ms) { ms = sc; mejor = e; } }
  if (mejor) { mejor.focus(); mejor.scrollIntoView({ block: 'nearest', inline: 'nearest' }); S.sfx('clic'); }
}

/* ---------- iconos ---------- */
export function iconoP(id, tam, t) { const c = h('canvas', { width: tam * 2, height: tam * 2, style: `width:${tam}px;height:${tam}px`, 'aria-hidden': 'true' }); Ar.iconoCanvasPlanta(c, id, t || 0.3); return c; }
export function iconoZ(tipo, tam) { const c = h('canvas', { width: tam * 2, height: tam * 2, style: `width:${tam}px;height:${tam}px`, 'aria-hidden': 'true' }); Ar.iconoCanvasZombi(c, tipo, 0.3); return c; }

/* ---------- fondo animado del menu ---------- */
let mcv = null, mraf = 0, mon = false;
export function fondoMenu(on) {
  mon = on; mcv = $('#fondoMenu'); if (!mcv) return; mcv.style.display = on ? 'block' : 'none';
  if (on && !mraf) { const f = (ts) => { mraf = requestAnimationFrame(f); if (mon) dibujarMenu(ts / 1000); }; mraf = requestAnimationFrame(f); }
  if (!on && mraf) { cancelAnimationFrame(mraf); mraf = 0; }
}
function dibujarMenu(T) {
  const w = innerWidth, hh = innerHeight, pr = Math.min(devicePixelRatio || 1, 1.5); if (mcv.width !== Math.round(w * pr)) { mcv.width = Math.round(w * pr); mcv.height = Math.round(hh * pr); mcv.style.width = w + 'px'; mcv.style.height = hh + 'px'; }
  const g = mcv.getContext('2d'); g.setTransform(pr, 0, 0, pr, 0, 0); const m = Math.floor(T / 14) % MUNDOS.length; Ar.fondoMundo(g, m, w, hh, T, AJ.accesibilidad.reducir);
  const t = Math.min(w / 9, hh / 6), base = hh * 0.86; g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, base - t * 0.9, w, t);
  const pl = ['chispera', 'brote', 'roble', 'cometa', 'faro', 'cepo'];
  pl.forEach((id, i) => Ar.dibujarPlanta(g, id, (0.08 + i * 0.15) * w, base, t * 1.2, T + i, { hp: 1 }));
  const zs = MUNDO_ZOMBIS(m); for (let i = 0; i < 3 && zs.length; i++) { const x = (((T * 28 + i * 330) % (w + 300)) - 100); const k = zs[i % zs.length]; Ar.dibujarZombi(g, { tipo: k, id: i + 3, estado: 'anda', x: 5, tm: 0, edad: 0, arm: null }, w - x, base + 4, t * 1.2, T, {}); }
}

/* ---------- menu principal ---------- */
export function menuPrincipal() {
  S.musica('menu'); fondoMenu(true);
  const par = leerPartida(); const dia = diaDe(), ev = EVENTOS[dia % EVENTOS.length], hechoHoy = PR.diario.dia === dia && PR.diario.hecho;
  const el = h('div', { cls: 'menu' }, [
    h('div', { cls: 'logo' }, [h('h1', { txt: 'Jardín Zombi 2' }), h('p', { txt: 'Viaje en el Tiempo' })]),
    h('div', { cls: 'monedero grande' }, [h('span', { txt: '🪙 ' + fmt(PR.monedas) }), h('span', { txt: '💎 ' + fmt(PR.gemas) }), h('span', { txt: '⭐ ' + estrellasTotal() })]),
    h('div', { cls: 'botones' }, [
      ...(par && par.valida ? [btn('▶ Continuar: ' + (par.nombre || 'partida'), () => App.continuar(), 'grande verde')] : []),
      btn('🗺 Aventura en el tiempo', () => mostrar(mapa), 'grande'),
      btn(`📅 Evento diario${hechoHoy ? ' ✓' : ''}`, () => mostrar(() => App.ui2.diario()), hechoHoy ? '' : 'dest'),
      btn('🏟 Arena semanal', () => mostrar(() => App.ui2.arena())), btn('♾ Zona sin fin', () => mostrar(() => App.ui2.sinfin())),
      btn('🛒 Tienda', () => mostrar(() => App.ui2.tienda())), btn('📖 Almanaque', () => mostrar(() => App.ui2.almanaque())),
      btn('🎯 Misiones', () => mostrar(() => App.ui2.misiones())), btn('🪅 Colecciones y piñatas', () => mostrar(() => App.ui2.colecciones())),
      btn('🏆 Logros y ranking', () => mostrar(() => App.ui2.ranking())), btn('⚙ Ajustes', () => mostrar(() => App.ajustes())), btn('❓ Cómo jugar', () => mostrar(ayuda)),
    ]),
    h('p', { cls: 'nota pie', txt: `Evento de hoy: ${ev.n}.` }),
    h('a', { cls: 'link-portal', href: '../', 'data-f': 1, txt: '← Volver al portal' }),
  ]);
  return el;
}

/* ---------- mapa del tiempo ---------- */
export function mapa() {
  S.musica('menu'); const el = h('div', { cls: 'mapa' }, [cabecera('Viaje en el tiempo')]);
  const g = h('div', { cls: 'mundos' });
  MUNDOS.forEach((W, m) => {
    const abierto = mundoAbierto(m), est = estrellasMundo(m), hh = hechosMundo(m), ok = !!PR.llaves[m];
    const falta = []; if (m > 0 && !PR.llaves[m - 1]) falta.push('🔑 llave del mundo anterior'); if (estrellasTotal() < W.estrellas) falta.push(`⭐ ${W.estrellas} estrellas`);
    g.appendChild(h('button', { type: 'button', cls: 'mundo' + (abierto ? '' : ' cerrado') + (ok ? ' hecho' : ''), 'data-f': 1, style: `--c:${W.col}`, 'aria-label': W.n, on: { click: () => { S.sfx('clic'); if (!abierto) { toast('Para entrar: ' + falta.join(' y ')); return; } mostrar(() => niveles(m)); } } }, [
      h('b', { txt: `${m + 1}. ${W.n}` }), h('span', { cls: 'sub', txt: W.mecN }), h('span', { cls: 'est', txt: abierto ? `${hh}/${NIV_POR_MUNDO} niveles · ⭐ ${est}/${NIV_POR_MUNDO * 3} ${ok ? '🔑' : ''}` : '🔒 ' + falta.join(' · ') }),
    ]));
  });
  el.appendChild(g); return el;
}
export function niveles(m) {
  const W = MUNDOS[m]; S.musica(W.musica);
  const el = h('div', { cls: 'niveles', style: `--c:${W.col}` }, [cabecera(W.n), h('p', { cls: 'nota', txt: `${W.mecN}: ${W.mecD}` })]);
  const g = h('div', { cls: 'grid-niv' });
  for (let n = 1; n <= NIV_POR_MUNDO; n++) {
    const id = `${m + 1}-${n}`, hh = PR.hechos[id], ab = nivelAbierto(m, n), tipo = n === NIV_POR_MUNDO ? '👑' : n === 6 ? '🎞' : '';
    g.appendChild(h('button', { type: 'button', cls: 'niv' + (ab ? '' : ' cerrado') + (hh ? ' hecho' : ''), 'data-f': 1, 'aria-label': `Nivel ${id}`, on: { click: () => { S.sfx('clic'); if (!ab) { toast('Completa el nivel anterior'); return; } mostrar(() => preparar(nivelAventura(m, n), { modo: 'aventura' })); } } }, [h('b', { txt: tipo || String(n) }), h('span', { cls: 'estr', txt: hh ? '★'.repeat(hh.e || 1) + '☆'.repeat(3 - (hh.e || 1)) : (ab ? '☆☆☆' : '🔒') })]));
  }
  el.appendChild(g); return el;
}

/* ---------- preparacion (seleccion de semillas) ---------- */
export function preparar(niv, op) {
  op = op || {}; const W = MUNDOS[niv.mundo]; S.musica(op.modo === 'arena' ? 'arena' : W.musica); const n = slots();
  const libres = IDS_P.filter((id) => plantaLibre(id) && P[id].k !== undefined);
  let sel = (op.semillas || PR.loadout.filter((id) => libres.includes(id))).slice(0, n); if (!sel.length) sel = ['chispera', 'brote'].filter((id) => libres.includes(id));
  const fijo = niv.semillasFijas, cinta = niv.tipo === 'cinta';
  const el = h('div', { cls: 'prep', style: `--c:${W.col}` }), top = h('div', { cls: 'sel-lista' }), cuad = h('div', { cls: 'cuad-plantas' }), info = h('div', { cls: 'bloque' });
  const pz = zombisDe(niv); info.append(h('h3', { txt: niv.nombre }), h('p', { cls: 'nota', txt: `${W.mecN}: ${W.mecD}` }), h('div', { cls: 'fila-iconos' }, pz.slice(0, 9).map((k) => h('div', { cls: 'ico', title: Z[k].n }, [iconoZ(k, 38)]))));
  if (niv.diario != null || op.nota) info.append(h('p', { cls: 'nota', txt: op.nota || '' }));
  const pintar = () => {
    top.textContent = ''; cuad.textContent = '';
    if (fijo || cinta) { top.appendChild(h('p', { cls: 'nota', txt: cinta ? 'Cinta transportadora: recibirás semillas gratis durante el nivel.' : 'Semillas fijas de este desafío (todas con nivel 3):' })); (fijo || []).forEach((id) => top.appendChild(h('div', { cls: 'ico', title: P[id].n }, [iconoP(id, 44)]))); return; }
    for (let i = 0; i < n; i++) { const id = sel[i]; top.appendChild(id ? h('button', { type: 'button', cls: 'hueco lleno', 'data-f': 1, 'aria-label': 'Quitar ' + P[id].n, on: { click: () => { sel.splice(i, 1); pintar(); } } }, [iconoP(id, 44), h('small', { txt: String(P[id].coste) })]) : h('div', { cls: 'hueco' })); }
    libres.forEach((id) => { const on = sel.includes(id); cuad.appendChild(h('button', { type: 'button', cls: 'planta-c' + (on ? ' usado' : ''), 'data-f': 1, 'aria-label': `${P[id].n}, ${P[id].rol}, ${P[id].coste}`, on: { click: () => { S.sfx('clic'); if (on) sel.splice(sel.indexOf(id), 1); else if (sel.length < n) sel.push(id); else { toast('Sin ranuras libres: quita una o compra ranuras en la tienda'); return; } pintar(); } } }, [iconoP(id, 40), h('small', { txt: `${P[id].coste}☀` }), h('span', { cls: 'lv', txt: P[id].g ? '💎' : (PR.potenc[id] > 1 ? '★' + PR.potenc[id] : '') })])); });
  };
  const dif = h('select', { 'data-f': 1, 'aria-label': 'Dificultad', on: { change: (e) => { AJ.juego.dif = e.target.value; } } }, [['facil', 'Fácil'], ['normal', 'Normal'], ['dificil', 'Difícil']].map(([v, t]) => h('option', { value: v, txt: t, selected: AJ.juego.dif === v })));
  const pistaB = h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: '💡 Pista de estrategia', on: { click: () => { const p = pista(niv, libres); if (!fijo && !cinta) { p.rec.forEach((id) => { if (!sel.includes(id) && sel.length < n) sel.push(id); }); pintar(); } toast(p.texto.slice(0, 3).join(' '), 6000); } } });
  const jugar = btn('¡A jugar!', () => { if (!fijo && !cinta && !sel.length) { toast('Elige al menos una semilla'); return; } if (!fijo && !cinta) { PR.loadout = sel.slice(); guardarProgreso(); } cerrarTodo(); op.alJugar ? op.alJugar(fijo || sel.slice(), niv) : App.jugar(niv, fijo || sel.slice(), op); }, 'grande verde');
  el.append(cabecera('Preparar'), info, h('h4', { txt: fijo || cinta ? 'Semillas' : `Tu equipo (${n} ranuras)` }), top);
  if (!fijo && !cinta) el.append(h('h4', { txt: 'Tus plantas' }), cuad);
  el.append(h('div', { cls: 'fila' }, [h('label', { cls: 'sel-dif' }, ['Dificultad ', dif]), pistaB]), jugar); pintar(); return el;
}

/* ---------- pausa y fin ---------- */
export function pausa(op) {
  fondoMenu(false);
  return h('div', { cls: 'menu pausa' }, [h('h2', { txt: 'Pausa' }), h('p', { cls: 'nota', txt: op.titulo || '' }), h('div', { cls: 'botones' }, [
    btn('▶ Reanudar', () => { cerrarTodo(); App.reanudar(); }, 'grande verde'), btn('↻ Reiniciar nivel', () => { cerrarTodo(); App.reiniciar(); }),
    btn('⚙ Ajustes', () => mostrar(() => App.ajustes())), btn('❓ Cómo jugar', () => mostrar(ayuda)), btn('🏠 Salir al menú', () => { cerrarTodo(); App.salirAlMenu(); }),
  ])]);
}
export function resultado(r) {
  const vic = r.victoria; S.musica('menu');
  const el = h('div', { cls: 'menu fin ' + (vic ? 'vic' : 'der') }, [h('h2', { txt: vic ? '¡Victoria!' : 'Derrota' }), h('p', { cls: 'nota', txt: r.titulo || '' })]);
  if (vic && r.estrellas != null) el.appendChild(h('div', { cls: 'estrellas' }, [1, 2, 3].map((i) => h('span', { cls: 'estrella' + (i <= r.estrellas ? ' on' : ''), style: `animation-delay:${i * 0.25}s`, txt: '★' }))));
  const filas = h('div', { cls: 'bloque' }); (r.lineas || []).forEach((l) => filas.appendChild(h('p', { txt: l }))); el.appendChild(filas);
  if (r.nuevas && r.nuevas.length) el.appendChild(h('div', { cls: 'bloque nuevo' }, [h('h3', { txt: '¡Desbloqueado!' }), h('div', { cls: 'fila-iconos' }, r.nuevas.map((id) => h('div', { cls: 'ico', title: P[id].n }, [iconoP(id, 52)])))]));
  if (r.logros && r.logros.length) el.appendChild(h('p', { cls: 'nota', txt: '🏆 ' + r.logros.join(', ') }));
  el.appendChild(h('div', { cls: 'botones' }, (r.botones || []).map((b) => btn(b.txt, b.fn, b.cls))));
  return el;
}

/* ---------- ayuda ---------- */
export function ayuda() {
  const sec = (t, ps) => h('div', { cls: 'bloque' }, [h('h3', { txt: t }), ...ps.map((p) => h('p', { txt: p }))]);
  const tec = AJ.controles.teclas;
  return h('div', { cls: 'ayuda' }, [cabecera('Cómo jugar'),
    sec('Objetivo', ['Planta defensas para frenar a los zombis de cada época antes de que crucen el jardín. Si uno llega al borde izquierdo, un pulso temporal lo limpia una vez por carril; luego pierdes.']),
    sec('Chispas ☀', ['Las Chispera y otras productoras generan chispas ☀. Toca las chispas para recogerlas y úsalas para plantar. Cada semilla tiene recarga.']),
    sec('Energía Verde ⚡', ['Los zombis brillantes sueltan orbes verdes. Cada planta tiene una mejora de energía única y espectacular: toca ⚡ y luego la planta, o arrastra ⚡ sobre ella. Máximo 3 cargas.']),
    sec('Poderes de dedo 🤏', ['Pellizcar (daño y aturdir), Sacudir (quita armadura) y Lanzar (arrastra un zombi a otro carril). Cuestan monedas por uso.']),
    sec('Terrenos', ['Cada mundo tiene su mecánica: tumbas, agua, rieles con vagonetas, hielo, almenas, portales, viento, lava, apagones y pistas de aterrizaje. Lee el aviso al empezar y usa 💡.']),
    sec('Controles', ['Táctil / ratón: toca una carta y una casilla, o arrástrala. Toca una planta para mejorarla o quitarla.', `Teclado: flechas mueven el cursor, ${tec.plantar} actúa, 1-9 eligen semilla, ${tec.pala} pala, ${tec.energia} energía, ${tec.sol} recoge todo, ${tec.pausa} pausa.`, 'Mando Xbox: cruceta/palanca cursor, A actuar, B cancelar, X pala, Y recoger, LB/RB semillas, LT energía, RT poderes, VISTA pista, MENU pausa.']),
    sec('Economía', ['Monedas 🪙 y gemas 💎 son virtuales, se ganan jugando y no hay compras con dinero real.']),
  ]);
}
