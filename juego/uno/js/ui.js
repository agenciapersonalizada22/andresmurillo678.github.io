// Tablero: pinta la vista del asiento local (mano en abanico, pila, rivales), animaciones y acciones.
import { h, $, limitar } from './dom.js';
import { MAZO, COLORES, SALTO, REVERSA, MAS2, COMODIN, MAS4, esComodin } from './reglas.js';
import { svgCarta, svgDorso, iconoColor, nombreCarta, nombreColor, TEMAS } from './cartas.js';
import { FRASES, EMOJIS } from './mesa.js';
import { NIVELES } from './bots.js';
import { Sonido } from './sonido.js';
import { A, D, reducirMov } from './ajustes.js';

export const T = {
  v: null, meta: { nombres: [], colores: [], tipos: [] }, sel: [], cursor: 0, lim: null, limT0: 0, nuevos: new Set(), enviar: null, alEvento: null,
  alFin: null, modalAbierto: false, ultimoAviso: 0, dealing: false, tickSonado: -1, lastMano: []
};
let el = {}, els = new Map(), tema = 'clasico', pendTimer = 0, tamMano = { w: 0 };

export function iniciar() {
  for (const id of ['rivales', 'centro', 'mazo', 'descarte', 'estado', 'mano', 'acciones', 'bRobar', 'bUno', 'bPasar', 'bDesafiar', 'bJugar', 'miInfo', 'burbujas', 'chatPanel', 'modal', 'toasts', 'aria', 'colorTag', 'tiempo', 'pendTag', 'finPanel', 'confeti', 'dirIcono']) el[id] = $('#' + id);
  el.inner = h('div', { cls: 'abanico' }); el.mano.appendChild(el.inner);
  el.bRobar.addEventListener('click', () => accion('robar'));
  el.mazo.addEventListener('click', () => accion('robar'));
  el.bPasar.addEventListener('click', () => accion('pasar'));
  el.bDesafiar.addEventListener('click', () => accion('desafiar'));
  el.bUno.addEventListener('click', () => accion('uno'));
  el.bJugar.addEventListener('click', () => jugarSeleccion());
  prepararMano();
  construirChat();
  window.addEventListener('resize', () => { if (T.v) layoutMano(); });
}

const anim = () => !reducirMov();
const yo = () => T.v.yo;
const nombre = (j) => T.meta.nombres[j] || 'Jugador';
const hex = (j) => T.meta.colores[j] || '#3df5ff';
export const anunciar = (txt) => { if (A.acc.anuncios) { el.aria.textContent = ''; setTimeout(() => { el.aria.textContent = txt; }, 30); } };

export function aviso(txt, color) {
  const t = h('div', { cls: 'aviso', txt, style: color ? '--c:' + color : '' });
  el.toasts.appendChild(t); setTimeout(() => t.remove(), 2600);
  while (el.toasts.children.length > 3) el.toasts.firstChild.remove();
}

/* ---------- recepcion de paquetes ---------- */
export function recibir(p) {
  const antes = T.v;
  T.meta = { nombres: p.nombres, colores: p.colores, tipos: p.tipos };
  tema = A.tema;
  if (antes && p.v.ronda !== antes.ronda) { T.sel = []; limpiarMano(); }
  const reparto = p.ev.some((e) => e.t === 'reparto');
  const reset = reparto || !antes;
  T.rapida = !reparto;
  if (reset) { T.sel = []; limpiarMano(); T.cursor = 0; }
  T.v = p.v; T.lim = p.lim; T.limT0 = performance.now(); T.tickSonado = -1;
  for (const e of p.ev) evento(e, antes);
  if (T.alEvento) for (const e of p.ev) T.alEvento(e, T.v);
  T.sel = T.sel.filter((id) => T.v.mano.includes(id) && (T.v.turno === T.v.yo));
  if (T.sel.length && !T.v.jug.includes(T.sel[0])) T.sel = [];
  render(reset);
}
export function refrescarTema() { limpiarMano(); if (T.v) render(true); }

/* ---------- eventos -> sonido, vuelos, avisos ---------- */
function rectDe(j) {
  if (j === yo()) return (el.miInfo.firstElementChild || el.miInfo).getBoundingClientRect();
  const c = el.rivales.querySelector(`[data-j="${j}"]`);
  return c ? c.getBoundingClientRect() : el.rivales.getBoundingClientRect();
}
const rMazo = () => el.mazo.getBoundingClientRect();
const rDesc = () => el.descarte.getBoundingClientRect();
const centroDe = (r, w, hh) => ({ left: r.left + r.width / 2 - w / 2, top: r.top + r.height / 2 - hh / 2, width: w, height: hh });

function volar(html, desde, hacia, o = {}) {
  if (!anim() || document.hidden) { o.fin && o.fin(); return; }
  const w = o.w || 46, hh = w * 1.5;
  const a = centroDe(desde, w, hh), b = centroDe(hacia, o.w2 || w, (o.w2 || w) * 1.5);
  const e = h('div', { cls: 'vuelo', html, style: `left:${a.left}px;top:${a.top}px;width:${w}px;height:${hh}px` });
  document.body.appendChild(e);
  const dx = b.left - a.left, dy = b.top - a.top, s = (o.w2 || w) / w;
  const an = e.animate([{ transform: `translate(0,0) rotate(${o.r0 || 0}deg) scale(1)` }, { transform: `translate(${dx}px,${dy}px) rotate(${o.r1 || 0}deg) scale(${s})` }], { duration: o.ms || 380, delay: o.retraso || 0, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
  an.onfinish = () => { e.remove(); o.fin && o.fin(); };
  an.oncancel = () => e.remove();
}
function volarDorsos(n, desde, hacia, retraso0 = 0, paso = 70) {
  const k = Math.min(n, 6);
  for (let i = 0; i < k; i++) volar(svgDorso(tema), desde, hacia, { w: 38, ms: 360, retraso: retraso0 + i * paso, r1: (i - k / 2) * 6 });
}

function evento(e, antes) {
  const v = T.v;
  switch (e.t) {
    case 'reparto': {
      T.dealing = true; Sonido.fx('repartir');
      const dur = D.calidad === 'baja' ? 20 : 45;
      for (let j = 0; j < v.n; j++) if (j !== yo()) setTimeout(() => volarDorsos(7, rMazo(), rectDe(j), j * 40, dur), 30);
      setTimeout(() => { T.dealing = false; }, 900);
      anunciar('Nueva ronda. Se reparten las cartas.');
      break;
    }
    case 'inicial': {
      const t = e.carta; T.ocultarTope = performance.now() + 450;
      volar(svgCarta(t, tema), rMazo(), rDesc(), { w: 46, w2: 64, ms: 420, retraso: 500 });
      break;
    }
    case 'jugar': {
      const fx = MAZO[e.cartas[0]].v;
      const dest = rDesc();
      e.cartas.forEach((id, i) => {
        let desde;
        if (e.j === yo() && els.has(id)) desde = els.get(id).getBoundingClientRect();
        else desde = rectDe(e.j);
        T.ocultarTope = performance.now() + 420 + i * 90;
        volar(svgCarta(id, tema), desde, dest, { w: e.j === yo() ? 64 : 46, w2: 64, ms: 380, retraso: i * 90, r0: e.j === yo() ? 0 : -10, r1: ((id * 7) % 11) - 5 });
      });
      Sonido.fx(fx === MAS2 ? 'mas2' : fx === MAS4 ? 'mas4' : fx === SALTO ? 'salto' : fx === REVERSA ? 'reversa' : fx === COMODIN ? 'comodin' : 'jugar');
      const cn = nombre(e.j) + ' juega ' + nombreCarta(e.cartas[0]) + (e.cartas.length > 1 ? ' ×' + e.cartas.length : '') + (esComodin(e.cartas[0]) ? ', color ' + nombreColor(e.color).toLowerCase() : '');
      anunciar(cn);
      if (e.j !== yo()) mostrarBurbuja(e.j, e.cartas.length > 1 ? '×' + e.cartas.length : '', true);
      flash(e.color);
      break;
    }
    case 'robo': {
      if (e.n === 0) break;
      if (e.j === yo()) { e.ids.forEach((id) => T.nuevos.add(id)); }
      else volarDorsos(e.n, rMazo(), rectDe(e.j), 0, 80);
      Sonido.fx('robar');
      anunciar(nombre(e.j) + ' roba ' + e.n + (e.n === 1 ? ' carta' : ' cartas'));
      if (e.motivo === 'penal' || e.motivo === 'desafio' || e.motivo === 'uno') mostrarBurbuja(e.j, '+' + e.n, true);
      break;
    }
    case 'pasar': anunciar(nombre(e.j) + ' pasa'); break;
    case 'salto': if (e.victima != null) { mostrarBurbuja(e.victima, 'pierde turno', true); } else { Sonido.fx('salto'); } break;
    case 'reversa': aviso('¡Cambio de sentido!', '#3df5ff'); anunciar('Cambia el sentido'); break;
    case 'uno': Sonido.fx('uno'); mostrarBurbuja(e.j, '¡UNO!', true); anunciar(nombre(e.j) + ' grita UNO'); break;
    case 'ventanaUno': if (e.j !== yo() || true) anunciar('¡' + nombre(e.j) + ' tiene una carta! Puedes cazarlo si no dice UNO'); break;
    case 'cazado': Sonido.fx('cazado'); aviso(`${nombre(e.por)} atrapó a ${nombre(e.j)} sin decir UNO: +2`, '#ff6b4a'); anunciar(nombre(e.j) + ' fue cazado y roba 2 cartas'); break;
    case 'desafio':
      Sonido.fx('desafio');
      aviso(e.ok ? `${nombre(e.j)} desafía: ¡${nombre(e.a)} hizo trampa! Roba el castigo` : `${nombre(e.j)} desafía y falla: roba 2 más`, e.ok ? '#6dff6d' : '#ff6b4a');
      anunciar(e.ok ? 'Desafío exitoso' : 'Desafío fallido');
      break;
    case 'rota': aviso('¡Las manos rotan!', '#ffd23d'); Sonido.fx('reversa'); break;
    case 'cambio': aviso(`${nombre(e.j)} intercambia su mano con ${nombre(e.a)}`, '#ffd23d'); Sonido.fx('comodin'); break;
    case 'rebaraja': aviso('Se rebaraja el descarte', '#9a8cff'); Sonido.fx('rebaraja'); break;
    case 'chat': {
      const txt = e.k < FRASES.length ? FRASES[e.k] : EMOJIS[e.k - FRASES.length];
      mostrarBurbuja(e.j, txt, e.k >= FRASES.length); if (e.j !== yo()) Sonido.fx('chat');
      anunciar(nombre(e.j) + ': ' + txt);
      break;
    }
    case 'fin': {
      const gano = e.ganador === yo();
      Sonido.fx(gano ? 'gana' : 'pierde');
      anunciar(gano ? '¡Ganaste la ronda!' : nombre(e.ganador) + ' gana la ronda');
      setTimeout(() => mostrarFin(), anim() ? 700 : 0);
      if (gano) confeti();
      break;
    }
    case 'ronda': ocultarFin(); break;
    case 'piloto': if (e.j === yo()) aviso('Piloto automático por inactividad: toca una carta para recuperar el control', '#ffd23d'); break;
    default: break;
  }
  void antes;
}
function flash(c) { if (c == null || !anim()) return; el.descarte.classList.remove('flash'); void el.descarte.offsetWidth; el.descarte.classList.add('flash'); }

function mostrarBurbuja(j, txt, corta) {
  if (!txt) return;
  const base = j === yo() ? el.miInfo : el.rivales.querySelector(`[data-j="${j}"]`);
  if (!base) return;
  const b = h('div', { cls: 'burbuja' + (corta ? ' corta' : ''), txt, 'aria-hidden': 'true' });
  const r = base.getBoundingClientRect();
  b.style.left = r.left + r.width / 2 + 'px'; b.style.top = (j === yo() ? r.top : r.bottom) + 'px';
  el.burbujas.appendChild(b); setTimeout(() => b.remove(), 2400);
}

/* ---------- render ---------- */
function render(reset) {
  const v = T.v;
  document.body.classList.toggle('mi-turno', v.turno === yo() && !v.fin);
  document.body.dataset.dir = String(v.dir);
  renderRivales(); renderCentro(); renderMano(reset); renderAcciones(); renderEstado();
}

function renderRivales() {
  const v = T.v, c = el.rivales;
  const orden = [];
  for (let k = 1; k < v.n; k++) orden.push((yo() + k) % v.n);
  c.style.setProperty('--n', String(orden.length)); c.classList.toggle('compacto', orden.length >= 4);
  const marcados = new Set();
  orden.forEach((j) => {
    marcados.add(String(j));
    let ch = c.querySelector(`[data-j="${j}"]`);
    if (!ch) { ch = chip(j); c.appendChild(ch); }
    actualizarChip(ch, j);
  });
  Array.from(c.children).forEach((x) => { if (!marcados.has(x.dataset.j)) x.remove(); });
  orden.forEach((j, i) => { const x = c.querySelector(`[data-j="${j}"]`); if (c.children[i] !== x) c.insertBefore(x, c.children[i]); });
  // yo
  let mi = el.miInfo.firstElementChild;
  if (!mi) { mi = chip(yo(), true); el.miInfo.appendChild(mi); }
  actualizarChip(mi, yo());
}
function chip(j, propio) {
  return h('div', { cls: 'chip' + (propio ? ' yo' : ''), 'data-j': j }, [
    h('div', { cls: 'av' }, [h('span', { cls: 'ini' })]),
    h('div', { cls: 'datos' }, [h('div', { cls: 'nom' }), h('div', { cls: 'sub' })]),
    h('div', { cls: 'cnt' }), h('span', { cls: 'bandera' })
  ]);
}
function actualizarChip(ch, j) {
  const v = T.v, tipo = T.meta.tipos[j] || 'humano';
  ch.style.setProperty('--c', hex(j));
  const turno = v.turno === j && !v.fin;
  ch.classList.toggle('turno', turno);
  ch.classList.toggle('ausente', tipo === 'ausente');
  ch.classList.toggle('peligro', v.conteos[j] === 1 && !v.fin);
  ch.querySelector('.ini').textContent = nombre(j).slice(0, 1).toUpperCase();
  ch.querySelector('.nom').textContent = nombre(j) + (j === yo() ? ' (tú)' : '');
  const nivel = tipo.startsWith('bot') ? NIVELES[+tipo.slice(3)].nombre : tipo === 'ausente' ? 'ausente' : '';
  ch.querySelector('.sub').textContent = [nivel, v.cfg.puntuacion === 'ronda' ? v.puntos[j] + ' pts' : ''].filter(Boolean).join(' · ');
  const cnt = ch.querySelector('.cnt');
  if (j !== yo()) cnt.innerHTML = `<span class="mini">${svgDorso(tema)}</span><b>${v.conteos[j]}</b>`; else cnt.textContent = '';
  const w = v.unoVent && v.unoVent.j === j;
  const b = ch.querySelector('.bandera');
  const dijo = v.uno[j] && v.conteos[j] >= 1 && v.conteos[j] <= 2;
  b.textContent = dijo ? 'UNO' : w ? '¡1!' : '';
  b.className = 'bandera' + (dijo ? ' uno' : w ? ' alerta' : '');
  ch.setAttribute('aria-label', `${nombre(j)}, ${v.conteos[j]} cartas${turno ? ', su turno' : ''}`);
}

function renderCentro() {
  const v = T.v;
  el.descarte.textContent = '';
  const ring = h('div', { cls: 'anillo c' + v.color }); el.descarte.appendChild(ring);
  const ids = v.pila.slice(-4);
  ids.forEach((id, i) => {
    const arriba = i === ids.length - 1;
    const c = h('div', { cls: 'carta tope' + (arriba ? ' arriba' : ''), html: svgCarta(id, tema), style: `--r:${((id * 13) % 17) - 8}deg;--dx:${((id * 5) % 9) - 4}px` });
    if (arriba && T.ocultarTope && performance.now() < T.ocultarTope) { c.style.visibility = 'hidden'; setTimeout(() => { c.style.visibility = ''; }, Math.max(0, T.ocultarTope - performance.now())); }
    el.descarte.appendChild(c);
  });
  el.descarte.setAttribute('aria-label', 'Descarte: ' + (ids.length ? nombreCarta(v.tope) : '') + ', color ' + nombreColor(v.color));
  el.mazo.innerHTML = `<span class="pila-d">${svgDorso(tema)}</span><span class="pila-d">${svgDorso(tema)}</span><span class="pila-d">${svgDorso(tema)}</span><b class="n">${v.nMazo}</b>`;
  el.mazo.classList.toggle('activo', v.puedeRobar);
  el.mazo.setAttribute('aria-label', 'Mazo de robo, ' + v.nMazo + ' cartas');
  el.colorTag.innerHTML = iconoColor(v.color, tema, 22) + `<span>${nombreColor(v.color)}</span>`;
  el.colorTag.style.setProperty('--c', TEMAS[tema].col[v.color]);
  el.pendTag.hidden = v.pend <= 0;
  el.pendTag.textContent = v.pend > 0 ? '+' + v.pend : '';
  el.dirIcono.className = 'dir ' + (v.dir === 1 ? 'horario' : 'antihorario');
}

const orden = (ids) => ids.slice().sort((a, b) => { const A1 = MAZO[a], B1 = MAZO[b]; return (A1.c - B1.c) || (A1.v - B1.v) || (a - b); });
function limpiarMano() { els.forEach((e) => e.remove()); els.clear(); T.nuevos.clear(); }

function crearCarta(id) {
  return h('button', { type: 'button', cls: 'carta mia', 'data-id': id, html: svgCarta(id, tema), tabindex: '-1' });
}
function renderMano(reset) {
  const v = T.v, ids = orden(v.mano);
  T.lastMano = ids;
  for (const [id, e] of els) if (!ids.includes(id)) { e.remove(); els.delete(id); }
  let k = 0;
  ids.forEach((id) => {
    let e = els.get(id);
    if (!e) {
      e = crearCarta(id); els.set(id, e); el.inner.appendChild(e);
      if (anim() && (T.nuevos.has(id) || reset)) { e.dataset.entra = '1'; e.style.setProperty('--ent', k++); }
    }
    e.classList.toggle('jugable', v.jug.includes(id) && v.turno === yo());
    e.classList.toggle('opaca', v.turno === yo() && !v.fin && !v.jug.includes(id) && !hermanas(id));
    e.classList.toggle('sel', T.sel.includes(id));
    e.classList.toggle('hermana', hermanas(id));
    e.setAttribute('aria-label', nombreCarta(id) + (v.turno === yo() && v.jug.includes(id) ? ', jugable' : ''));
    e.setAttribute('aria-pressed', String(T.sel.includes(id)));
  });
  T.nuevos.clear();
  T.cursor = limitar(T.cursor, 0, Math.max(0, ids.length - 1));
  layoutMano(reset);
}
function hermanas(id) {
  const v = T.v;
  if (!v.cfg.multiples || !T.sel.length || T.sel.includes(id) || v.turno !== yo()) return false;
  return MAZO[id].v === MAZO[T.sel[0]].v;
}
function layoutMano(reset) {
  const v = T.v, ids = T.lastMano, n = ids.length;
  const k = +getComputedStyle(document.documentElement).getPropertyValue('--carta-k') || 1;
  const tope = Math.max(46, Math.min(84, innerHeight * 0.155));
  const cw = Math.round(Math.min(tope, Math.max(46, el.mano.clientWidth / 5.2)) * k), ch = Math.round(cw * 1.5);
  const extra = innerHeight < 500 ? 28 : 56;
  el.mano.style.setProperty('--cw', cw + 'px'); el.mano.style.setProperty('--ch', ch + 'px'); el.mano.style.setProperty('--extra', extra + 'px');
  const W = el.mano.clientWidth || 360;
  const pad = Math.round(14 + cw * 0.25), paso = n <= 1 ? 0 : limitar((W - 2 * pad - cw) / (n - 1), 26 * k, cw * 0.78);
  const total = cw + paso * Math.max(0, n - 1);
  el.inner.style.width = Math.max(total + 2 * pad, W) + 'px'; el.inner.style.height = ch + extra + 'px';
  const x0 = Math.max(pad, (Math.max(total + 2 * pad, W) - total) / 2);
  const ang = Math.min(18, n * 1.8);
  ids.forEach((id, i) => {
    const e = els.get(id); if (!e) return;
    const t = n <= 1 ? 0 : i / (n - 1) - 0.5;
    const sel = T.sel.includes(id), foco = i === T.cursor;
    const x = x0 + paso * i, y = extra * 0.55 + Math.abs(t) * Math.abs(t) * (extra * 0.6) + (sel ? -extra * 0.5 : foco ? -extra * 0.2 : 0);
    e.style.setProperty('--x', x + 'px'); e.style.setProperty('--y', y + 'px'); e.style.setProperty('--rot', t * ang + 'deg');
    e.style.zIndex = sel ? 200 : foco ? 150 : i + 1;
    e.classList.toggle('foco', foco && (document.body.classList.contains('usando-teclado') || document.body.classList.contains('usando-mando')));
    if (e.dataset.entra) {
      const d = rMazo(), r = e.getBoundingClientRect();
      delete e.dataset.entra;
      const idx = +e.style.getPropertyValue('--ent') || 0;
      const dx = d.left + d.width / 2 - (r.left + r.width / 2), dy = d.top + d.height / 2 - (r.top + r.height / 2);
      e.animate([{ transform: `translate(${dx}px,${dy}px) scale(.6) rotate(0deg)`, opacity: 0, offset: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'none', opacity: 1, offset: 1 }], { duration: reset ? 460 : 380, delay: (reset && !T.rapida ? 600 : 0) + idx * (reset && !T.rapida ? 70 : 60), easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
    }
  });
  const f = els.get(ids[T.cursor]);
  if (f && (document.body.classList.contains('usando-teclado') || document.body.classList.contains('usando-mando'))) {
    const c = x0 + paso * T.cursor + cw / 2;
    el.mano.scrollLeft = Math.max(0, c - el.mano.clientWidth / 2);
  }
  void v;
}

function renderAcciones() {
  const v = T.v, mio = v.turno === yo() && !v.fin;
  el.bRobar.hidden = false;
  el.bRobar.disabled = !(mio && v.puedeRobar);
  el.bRobar.textContent = v.pend > 0 ? `Robar ${v.pend}` : v.cfg.robarHasta ? 'Robar hasta jugar' : 'Robar';
  el.bPasar.hidden = !(mio && v.puedePasar);
  el.bDesafiar.hidden = !(mio && v.puedeDesafiar);
  const n = T.sel.length;
  el.bJugar.hidden = !(mio && n > 0 && (v.cfg.multiples || esComodin(T.sel[0])));
  el.bJugar.textContent = n > 1 ? `Jugar ${n} cartas` : 'Jugar';
  const w = v.unoVent;
  const cazar = !!w && w.j !== yo();
  const puedeUno = v.conteos[yo()] <= 2 && !v.uno[yo()] && !v.fin;
  el.bUno.dataset.modo = cazar ? 'cazar' : puedeUno ? 'uno' : 'reposo';
  el.bUno.firstElementChild.textContent = cazar ? '¡CAZAR!' : 'UNO';
  el.bUno.disabled = v.fin || !(cazar || puedeUno || v.conteos[yo()] <= 3);
  el.bUno.setAttribute('aria-label', cazar ? `Cazar a ${nombre(w.j)}` : 'Gritar UNO');
}
function renderEstado() {
  const v = T.v;
  let t;
  if (v.fin) t = 'Fin de la ronda';
  else if (v.turno === yo()) {
    if (v.pend > 0) t = v.puedeDesafiar ? `Te lanzaron un +4: desafía o roba ${v.pend}${v.jug.length ? ' · o apila' : ''}` : v.jug.length ? `Castigo de ${v.pend}: apila otro o roba` : `Roba ${v.pend}`;
    else if (v.robo) t = 'Juega la carta robada o pasa';
    else t = v.jug.length ? 'Tu turno: juega una carta' : 'Tu turno: no tienes jugada, roba';
  } else t = 'Turno de ' + nombre(v.turno);
  el.estado.textContent = t;
  el.estado.className = v.turno === yo() && !v.fin ? 'mio' : '';
  if (v.turno === yo() && !v.fin && T.ultimoAviso !== v.nPila + ':' + v.turno + ':' + v.robo) { T.ultimoAviso = v.nPila + ':' + v.turno + ':' + v.robo; Sonido.fx('turno'); anunciar(t); }
}

/* ---------- acciones ---------- */
export function accion(n) {
  const v = T.v; if (!v || v.fin) return false;
  const mio = v.turno === yo();
  if (n === 'robar') { if (!mio || !v.puedeRobar) return error('Ahora no puedes robar'); T.sel = []; return enviar({ t: 'robar' }); }
  if (n === 'pasar') { if (!mio || !v.puedePasar) return error('Primero roba una carta'); return enviar({ t: 'pasar' }); }
  if (n === 'desafiar') { if (!mio || !v.puedeDesafiar) return error('No hay nada que desafiar'); return enviar({ t: 'desafiar' }); }
  if (n === 'uno') {
    const w = v.unoVent;
    if (w && w.j !== yo()) return enviar({ t: 'cazar' });
    if (v.conteos[yo()] <= 2 && !v.uno[yo()]) return enviar({ t: 'uno' });
    return error('Aún no tienes que gritar UNO');
  }
  return false;
}
function error(txt) { Sonido.fx('error'); aviso(txt, '#ff6b4a'); const b = el.estado; b.classList.remove('sacude'); void b.offsetWidth; b.classList.add('sacude'); return false; }
function enviar(cmd) {
  if (!T.enviar) return false;
  const r = T.enviar(cmd);
  if (r && r.ok === false) { error('Jugada no válida'); return false; }
  return true;
}

export function tocar(id) {
  const v = T.v; if (!v || v.fin) return;
  if (v.turno !== yo()) { T.cursor = Math.max(0, T.lastMano.indexOf(id)); Sonido.fx('selecciona'); layoutMano(); return; }
  const suma = v.cfg.multiples && T.sel.length && !T.sel.includes(id) && MAZO[T.sel[0]].v === MAZO[id].v;
  if (!v.jug.includes(id) && !suma) {
    if (v.pend > 0) return error(v.cfg.apilar ? 'Solo puedes apilar otro del mismo tipo' : 'Debes robar el castigo');
    return error(v.robo ? 'Solo puedes jugar la carta que robaste' : 'Esa carta no coincide en color ni número');
  }
  T.cursor = Math.max(0, T.lastMano.indexOf(id));
  if (T.sel.includes(id)) { jugarSeleccion(); return; }
  if (v.cfg.multiples && T.sel.length && MAZO[T.sel[0]].v === MAZO[id].v) T.sel.push(id); else T.sel = [id];
  Sonido.fx('selecciona');
  renderMano(); renderAcciones();
}
export function jugarSeleccion() {
  const v = T.v; if (!v || !T.sel.length) return;
  const cartas = ordenarGrupo(T.sel);
  const ult = cartas[cartas.length - 1];
  const base = { t: 'jugar', cartas };
  const fin = (extra) => { T.sel = []; Object.assign(base, extra || {}); enviar(base); };
  if (esComodin(ult)) {
    elegirColor(v.cfg, MAZO[ult].v === MAS4 && !v.mano.every((id) => MAZO[id].c !== v.color || cartas.includes(id)) ? 'Tienes cartas del color actual: si te desafían, robarás 4.' : '', (color) => { if (color != null) fin({ color }); });
  } else if (v.cfg.cero7 && MAZO[ult].v === 7 && cartas.length < v.mano.length) {
    elegirObjetivo((o) => { if (o != null) fin({ objetivo: o }); });
  } else fin();
}
function ordenarGrupo(sel) {
  const v = T.v;
  if (sel.length === 1) return sel.slice();
  const primera = sel.find((id) => v.jug.includes(id)) ?? sel[0];
  const resto = v.mano.filter((id) => !sel.includes(id));
  const cc = [0, 0, 0, 0]; resto.forEach((id) => { if (MAZO[id].c < 4) cc[MAZO[id].c]++; });
  const otras = sel.filter((id) => id !== primera).sort((a, b) => (MAZO[a].c < 4 ? cc[MAZO[a].c] : -1) - (MAZO[b].c < 4 ? cc[MAZO[b].c] : -1));
  return [primera, ...otras];
}

/* ---------- cursor (teclado / mando) ---------- */
export function moverCursor(d) {
  const n = T.lastMano.length; if (!n) return;
  T.cursor = limitar(T.cursor + d, 0, n - 1);
  Sonido.fx('selecciona');
  layoutMano();
}
export function confirmarCursor() {
  const id = T.lastMano[T.cursor];
  if (id == null) return;
  if (T.v && T.v.turno === yo() && T.v.jug.includes(id) && !T.sel.includes(id) && !T.sel.length) { tocar(id); if (!(T.v.cfg.multiples && T.v.mano.filter((x) => x !== id && MAZO[x].v === MAZO[id].v).length)) jugarSeleccion(); return; }
  tocar(id);
}

/* ---------- puntero: tocar y arrastrar ---------- */
function prepararMano() {
  let drag = null;
  el.mano.addEventListener('pointerdown', (ev) => {
    const c = ev.target.closest('.carta'); if (!c) return;
    document.body.classList.remove('usando-teclado', 'usando-mando');
    drag = { id: +c.dataset.id, el: c, x0: ev.clientX, y0: ev.clientY, activo: false, pid: ev.pointerId };
  });
  window.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.pid) return;
    const dx = ev.clientX - drag.x0, dy = ev.clientY - drag.y0;
    if (!drag.activo && dy < -18 * (1 / D.sensArrastre) && -dy > Math.abs(dx) && T.v && T.v.turno === yo() && T.v.jug.includes(drag.id)) {
      drag.activo = true; drag.el.classList.add('arrastra'); try { drag.el.setPointerCapture(ev.pointerId); } catch (e) { /* ya capturado */ }
    }
    if (drag.activo) drag.el.style.translate = `${dx}px ${dy}px`;
  });
  const fin = (ev) => {
    if (!drag || ev.pointerId !== drag.pid) return;
    const d = drag; drag = null;
    if (d.activo) {
      d.el.classList.remove('arrastra'); d.el.style.translate = '';
      const dy = ev.clientY - d.y0, r = el.descarte.getBoundingClientRect();
      const sobre = ev.clientX > r.left - 30 && ev.clientX < r.right + 30 && ev.clientY > r.top - 30 && ev.clientY < r.bottom + 30;
      if (sobre || -dy > 120 / D.sensArrastre) { if (!T.sel.includes(d.id)) T.sel = [d.id]; renderMano(); jugarSeleccion(); }
      d.suprimir = true; el.mano.dataset.supr = '1'; setTimeout(() => delete el.mano.dataset.supr, 50);
    }
  };
  window.addEventListener('pointerup', fin);
  window.addEventListener('pointercancel', (ev) => { if (drag && ev.pointerId === drag.pid) { drag.el.classList.remove('arrastra'); drag.el.style.translate = ''; drag = null; } });
  el.mano.addEventListener('click', (ev) => {
    if (el.mano.dataset.supr) return;
    const c = ev.target.closest('.carta'); if (c) tocar(+c.dataset.id);
  });
}

/* ---------- modales de eleccion (color / objetivo) ---------- */
export function abrirModal(contenido, onCerrar) {
  cerrarModal();
  el.modal.textContent = '';
  const caja = h('div', { cls: 'caja', role: 'dialog', 'aria-modal': 'true' }, [contenido]);
  el.modal.appendChild(caja); el.modal.hidden = false; T.modalAbierto = true; T.alCerrarModal = onCerrar || null;
  setTimeout(() => { const f = caja.querySelector('[data-f]'); if (f) f.focus(); }, 30);
  return caja;
}
export function cerrarModal() {
  if (el.modal.hidden) return;
  el.modal.hidden = true; el.modal.textContent = ''; T.modalAbierto = false;
  const f = T.alCerrarModal; T.alCerrarModal = null; if (f) f();
}
function elegirColor(cfg, aviso2, cb) {
  let hecho = false;
  const fin = (c) => { if (hecho) return; hecho = true; cerrarModal(); cb(c); };
  const bs = [0, 1, 2, 3].map((c) => h('button', { type: 'button', cls: 'elige-color', 'data-f': 1, 'aria-label': nombreColor(c), style: '--c:' + TEMAS[tema].col[c], html: iconoColor(c, tema, 54) + `<span>${nombreColor(c)}</span>`, on: { click: () => fin(c) } }));
  const cont = h('div', { cls: 'elige' }, [h('h3', { txt: 'Elige un color' }), aviso2 ? h('p', { cls: 'nota', txt: aviso2 }) : null, h('div', { cls: 'rejilla4' }, bs), h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, 'data-cerrar': 1, txt: 'Cancelar', on: { click: () => fin(null) } })]);
  abrirModal(cont, () => { if (!hecho) { hecho = true; cb(null); } });
  void cfg;
}
function elegirObjetivo(cb) {
  const v = T.v; let hecho = false;
  const fin = (j) => { if (hecho) return; hecho = true; cerrarModal(); cb(j); };
  const bs = [];
  for (let j = 0; j < v.n; j++) if (j !== yo()) bs.push(h('button', { type: 'button', cls: 'btn objetivo', 'data-f': 1, style: '--c:' + hex(j), html: `<b>${nombre(j)}</b><span>${v.conteos[j]} cartas</span>`, on: { click: () => fin(j) } }));
  bs.push(h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, 'data-cerrar': 1, txt: 'Cancelar', on: { click: () => fin(null) } }));
  abrirModal(h('div', { cls: 'elige' }, [h('h3', { txt: 'Intercambia tu mano con…' }), h('div', { cls: 'lista' }, bs)]), () => { if (!hecho) { hecho = true; cb(null); } });
}

/* ---------- chat ---------- */
function construirChat() {
  const p = el.chatPanel;
  const frases = h('div', { cls: 'frases' }, FRASES.map((f, k) => h('button', { type: 'button', cls: 'btn sec peq', 'data-f': 1, txt: f, on: { click: () => { chat(k); } } })));
  const emojis = h('div', { cls: 'emojis' }, EMOJIS.map((e, k) => h('button', { type: 'button', cls: 'emoji', 'data-f': 1, txt: e, 'aria-label': 'Reacción ' + e, on: { click: () => { chat(FRASES.length + k); } } })));
  p.appendChild(emojis); p.appendChild(frases);
}
function chat(k) { if (T.enviar) T.enviar({ t: 'chat', k }); el.chatPanel.hidden = true; }
export function alternarChat(b) { el.chatPanel.hidden = b == null ? !el.chatPanel.hidden : !b; if (!el.chatPanel.hidden) { const f = el.chatPanel.querySelector('[data-f]'); if (f) f.focus(); } return !el.chatPanel.hidden; }
export const chatAbierto = () => !el.chatPanel.hidden;

/* ---------- fin de ronda / partida ---------- */
function mostrarFin() {
  const v = T.v; if (!v || !v.fin) return;
  const f = v.fin, p = el.finPanel;
  p.textContent = '';
  const gano = f.ganador === yo();
  p.appendChild(h('h2', { txt: f.partida ? (gano ? '¡Ganaste la partida!' : `${nombre(f.ganador)} gana la partida`) : (gano ? '¡Ganaste la ronda!' : `${nombre(f.ganador)} gana la ronda`) }));
  p.appendChild(h('p', { cls: 'sub', txt: `+${f.pts} puntos${f.bloqueo ? ' (mesa bloqueada: gana la mano más ligera)' : ''}` }));
  const tabla = h('table', { cls: 'tabla' });
  const ord = v.puntos.map((pt, j) => j).sort((a, b) => v.puntos[b] - v.puntos[a]);
  tabla.appendChild(h('tr', {}, [h('th', { txt: 'Jugador' }), h('th', { txt: 'Cartas' }), h('th', { txt: v.cfg.puntuacion === 'ronda' ? `Puntos (meta ${v.cfg.meta})` : 'Puntos' })]));
  ord.forEach((j) => tabla.appendChild(h('tr', { cls: j === f.ganador ? 'gana' : '', style: '--c:' + hex(j) }, [h('td', { txt: nombre(j) + (j === yo() ? ' (tú)' : '') }), h('td', { txt: String(f.conteos[j]) }), h('td', { txt: String(v.puntos[j]) })])));
  p.appendChild(tabla);
  const bt = h('div', { cls: 'botones' });
  if (!f.partida) bt.appendChild(h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Siguiente ronda', on: { click: () => enviar({ t: 'siguiente' }) } }));
  else {
    if (T.alFin && T.alFin.revancha) bt.appendChild(h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Revancha', on: { click: T.alFin.revancha } }));
    bt.appendChild(h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Menú', on: { click: () => T.alFin && T.alFin.menu() } }));
  }
  p.appendChild(bt);
  if (!f.partida) p.appendChild(h('p', { cls: 'nota', txt: 'La siguiente ronda empieza sola en unos segundos.' }));
  p.hidden = false;
  const b = bt.querySelector('[data-f]'); if (b) setTimeout(() => b.focus(), 30);
}
function ocultarFin() { el.finPanel.hidden = true; el.finPanel.textContent = ''; }
export const finVisible = () => !el.finPanel.hidden;
export function ocultarTodo() { ocultarFin(); cerrarModal(); el.chatPanel.hidden = true; limpiarMano(); el.rivales.textContent = ''; el.miInfo.textContent = ''; T.v = null; }

/* ---------- confeti ---------- */
let confId = 0;
function confeti() {
  if (!D.particulas || !anim()) return;
  const cv = el.confeti, g = cv.getContext('2d'); if (!g) return;
  cv.width = cv.clientWidth; cv.height = cv.clientHeight;
  const n = D.calidad === 'ultra' ? 160 : D.calidad === 'alta' ? 90 : 40, cols = TEMAS[tema].col;
  const ps = Array.from({ length: n }, () => ({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.4, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: cols[(Math.random() * 4) | 0], s: 5 + Math.random() * 6 }));
  const t0 = performance.now(); cancelAnimationFrame(confId);
  const paso = (t) => {
    g.clearRect(0, 0, cv.width, cv.height);
    ps.forEach((p) => { p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6); g.restore(); });
    if (t - t0 < 3200) confId = requestAnimationFrame(paso); else g.clearRect(0, 0, cv.width, cv.height);
  };
  confId = requestAnimationFrame(paso);
}

/* ---------- temporizador (llamado cada cuadro) ---------- */
export function cuadro(t) {
  const v = T.v; if (!v) return;
  const barra = el.tiempo;
  if (T.lim && T.lim.total && !v.fin) {
    const resta = Math.max(0, T.lim.ms - (t - T.limT0)), p = resta / T.lim.total;
    barra.hidden = false; barra.style.setProperty('--p', (p * 100).toFixed(1) + '%'); barra.classList.toggle('urge', resta < 4000);
    const ch = v.turno === yo() ? el.miInfo.firstElementChild : el.rivales.querySelector(`[data-j="${v.turno}"]`);
    if (ch) ch.style.setProperty('--p', (p * 100).toFixed(1));
    if (v.turno === yo() && resta < 3500) { const s = Math.ceil(resta / 1000); if (s !== T.tickSonado) { T.tickSonado = s; Sonido.fx('tictac'); } }
  } else barra.hidden = true;
  if (v.unoVent) { const w = v.unoVent; const resta = Math.max(0, w.resta - (t - T.limT0)); if (resta <= 0 && el.bUno.dataset.modo === 'cazar') { el.bUno.dataset.modo = 'reposo'; } }
}
export const elementos = () => el;
