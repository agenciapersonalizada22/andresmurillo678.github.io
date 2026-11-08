// Tablero: pinta la vista del asiento local (mano en abanico, mazo, descarte, ventana de nope, rivales), animaciones y acciones.
import { h, $, limitar } from './dom.js';
import { MAZO, T as TP, ACCIONES, clasificar, objetivoValido } from './reglas.js';
import { svgCarta, svgTipo, svgDorso, nombreCarta, nombreTipo, INFO } from './cartas.js';
import { FRASES, EMOJIS } from './mesa.js';
import { NIVELES } from './bots.js';
import { Sonido } from './sonido.js';
import { A, D, reducirMov } from './ajustes.js';

export const T = {
  v: null, meta: { nombres: [], colores: [], tipos: [] }, sel: [], cursor: 0, lim: null, limT0: 0, nuevos: new Set(), enviar: null, alEvento: null,
  alFin: null, modalClave: null, respondido: null, ultimoAviso: '', lastMano: [], log: []
};
let el = {}, els = new Map(), tema = 'clasico', jugadaClave = '';

export function iniciar() {
  for (const id of ['rivales', 'centro', 'mazo', 'descarte', 'jugada', 'estado', 'mano', 'acciones', 'bRobar', 'bJugar', 'bNope', 'miInfo', 'burbujas', 'chatPanel', 'logPanel', 'modal', 'toasts', 'aria', 'tiempo', 'finPanel', 'fx', 'boom', 'bFuturo', 'selInfo']) el[id] = $('#' + id);
  el.inner = h('div', { cls: 'abanico' }); el.mano.appendChild(el.inner);
  el.bRobar.addEventListener('click', () => accion('robar'));
  el.mazo.addEventListener('click', () => accion('robar'));
  el.bNope.addEventListener('click', () => accion('nope'));
  el.bJugar.addEventListener('click', () => jugarSeleccion());
  el.bFuturo.addEventListener('click', () => { if (T.v && T.v.futuro) abrirFuturo(T.v.futuro); });
  prepararMano(); construirChat(); ajustarLienzo();
  window.addEventListener('resize', () => { ajustarLienzo(); if (T.v) layoutMano(); });
}

const anim = () => !reducirMov();
const yo = () => T.v.yo;
const nombre = (j) => T.meta.nombres[j] || 'Jugador';
const hex = (j) => T.meta.colores[j] || '#3df5ff';
const activo = (v) => (v.fase === 'turno' ? v.turno : v.fase === 'favor' ? v.pend.a : v.fase === 'bomba' ? v.pend.j : -1);
const miTurno = (v) => v.fase === 'turno' && v.turno === v.yo && v.vivo[v.yo];
const tieneNope = (v) => v.mano.some((c) => MAZO[c] === TP.NOPE);
export const anunciar = (txt) => { if (A.acc.anuncios) { el.aria.textContent = ''; setTimeout(() => { el.aria.textContent = txt; }, 30); } };
function anotar(txt) { T.log.push(txt); if (T.log.length > 40) T.log.shift(); if (!el.logPanel.hidden) pintarLog(); }
function pintarLog() { el.logPanel.textContent = ''; T.log.slice(-14).forEach((t) => el.logPanel.appendChild(h('div', { txt: t }))); el.logPanel.scrollTop = 1e6; }
export function alternarLog(b) { el.logPanel.hidden = b == null ? !el.logPanel.hidden : !b; if (!el.logPanel.hidden) pintarLog(); }

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
  const reparto = p.ev.some((e) => e.t === 'reparto');
  const reset = reparto || !antes || antes.ronda !== p.v.ronda;
  if (reset) { T.sel = []; limpiarMano(); T.cursor = 0; T.modalClave = null; T.respondido = null; cerrarModal(); jugadaClave = ''; if (reparto) T.log = []; }
  T.rapida = !reparto;
  T.v = p.v; T.lim = p.lim; T.limT0 = performance.now();
  for (const e of p.ev) evento(e);
  if (T.alEvento) for (const e of p.ev) T.alEvento(e, T.v);
  T.sel = T.sel.filter((id) => T.v.mano.includes(id) && miTurno(T.v));
  render(reset);
}
export function refrescarTema() { limpiarMano(); jugadaClave = ''; if (T.v) render(true); }

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
  $('#app').appendChild(e);
  const dx = b.left - a.left, dy = b.top - a.top, s = (o.w2 || w) / w;
  const an = e.animate([{ transform: `translate(0,0) rotate(${o.r0 || 0}deg) scale(1)` }, { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 24}px) rotate(${((o.r0 || 0) + (o.r1 || 0)) / 2}deg) scale(${(1 + s) / 2 * 1.12})`, offset: 0.55 }, { transform: `translate(${dx}px,${dy}px) rotate(${o.r1 || 0}deg) scale(${s})` }], { duration: o.ms || 420, delay: o.retraso || 0, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
  an.onfinish = () => { e.remove(); o.fin && o.fin(); };
  an.oncancel = () => e.remove();
}
function volarDorsos(n, desde, hacia, retraso0 = 0, paso = 70, w = 38) {
  const k = Math.min(n, 6);
  for (let i = 0; i < k; i++) volar(svgDorso(tema), desde, hacia, { w, ms: 380, retraso: retraso0 + i * paso, r1: (i - k / 2) * 6 });
}
function centroPantalla(j) { const r = rectDe(j); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
function flashClase(nodo, cls, ms = 900) { if (!nodo || !anim()) return; nodo.classList.remove(cls); void nodo.offsetWidth; nodo.classList.add(cls); setTimeout(() => nodo.classList.remove(cls), ms); }
const chipDe = (j) => (j === yo() ? el.miInfo.firstElementChild : el.rivales.querySelector(`[data-j="${j}"]`));
const FX_JUGAR = { [TP.ATAQUE]: 'ataque', [TP.SALTAR]: 'siesta', [TP.FAVOR]: 'favor', [TP.BARAJAR]: 'baja', [TP.FUTURO]: 'futuro' };

function evento(e) {
  const v = T.v;
  switch (e.t) {
    case 'reparto': {
      Sonido.fx('repartir');
      const dur = D.calidad === 'baja' ? 20 : 45;
      for (let j = 0; j < v.n; j++) if (j !== yo()) setTimeout(() => volarDorsos(v.cfg.mano, rMazo(), rectDe(j), j * 40, dur), 30);
      anunciar('Nueva ronda. Se reparten las cartas.'); anotar('— Ronda ' + v.ronda + ' —');
      break;
    }
    case 'robo': {
      if (e.bomba) {
        Sonido.fx('mecha'); T.ocultarTope = performance.now() + 500;
        volar(svgCarta(e.id, tema), rMazo(), rectDe(e.j), { w: 50, w2: 64, ms: 520 });
        aviso(`¡${nombre(e.j)} robó un Gato Bomba!`, '#ff6b4a'); anunciar(nombre(e.j) + ' roba un Gato Bomba');
        flashClase(chipDe(e.j), 'alerta', 1400); anotar(nombre(e.j) + ' robó un Gato Bomba');
        break;
      }
      if (e.j === yo()) (e.ids || []).forEach((id) => T.nuevos.add(id)); else volarDorsos(e.n, rMazo(), rectDe(e.j), 0, 80);
      Sonido.fx('robar'); anunciar(nombre(e.j) + ' roba una carta');
      break;
    }
    case 'desactiva': {
      Sonido.fx('desactivar');
      volar(svgCarta(e.carta, tema), rectDe(e.j), rDesc(), { w: 46, w2: 62, ms: 480 });
      const c = centroPantalla(e.j); particulasCalma(c.x, c.y); flashClase(chipDe(e.j), 'calma', 1200);
      aviso(`${nombre(e.j)} desactiva la bomba con un Ovillo`, '#3ddc97'); anunciar(nombre(e.j) + ' desactiva la bomba'); anotar(nombre(e.j) + ' desactivó la bomba');
      break;
    }
    case 'reinserta': {
      if (e.j !== yo()) volarDorsos(1, rectDe(e.j), rMazo(), 400, 0, 40);
      Sonido.fx('robar'); anotar(nombre(e.j) + ' escondió la bomba en el mazo');
      break;
    }
    case 'explota': {
      Sonido.fx('boom'); explotar(e.j);
      aviso(`¡${nombre(e.j)} explotó!`, '#ff3b30'); anunciar(nombre(e.j) + ' explota y queda eliminado'); anotar(nombre(e.j) + ' explotó');
      break;
    }
    case 'jugar': {
      const dest = rDesc(), t = e.tp;
      e.cartas.forEach((id, i) => {
        const desde = e.j === yo() && els.has(id) ? els.get(id).getBoundingClientRect() : rectDe(e.j);
        T.ocultarTope = performance.now() + 460 + i * 90;
        volar(svgCarta(id, tema), desde, dest, { w: e.j === yo() ? 64 : 48, w2: 62, ms: 420, retraso: i * 90, r0: e.j === yo() ? 0 : -10, r1: ((id * 7) % 11) - 5 });
      });
      Sonido.fx(e.kind === 'carta' ? 'carta' : 'combo');
      const txt = e.kind === 'carta' ? INFO[t].n : e.kind === 'par' ? 'Par de ' + INFO[t].n : e.kind === 'trio' ? 'Trío de ' + INFO[t].n : 'Cinco gatos distintos';
      mostrarBurbuja(e.j, txt, true); anunciar(nombre(e.j) + ' juega ' + txt); anotar(nombre(e.j) + ' juega ' + txt + (e.obj != null ? ' contra ' + nombre(e.obj) : ''));
      break;
    }
    case 'nope': {
      Sonido.fx('nope'); estampa('¡NO!', '#ff3b30');
      volar(svgCarta(e.carta, tema), e.j === yo() && els.size ? rectDe(e.j) : rectDe(e.j), rDesc(), { w: 46, w2: 62, ms: 380 });
      mostrarBurbuja(e.j, '¡Miau No!', true); anunciar(nombre(e.j) + ' juega Miau No'); anotar(nombre(e.j) + ' juega ¡Miau No!');
      break;
    }
    case 'anulada': Sonido.fx('error'); aviso('La jugada fue anulada', '#ff6b4a'); anotar('Jugada anulada'); anunciar('La jugada queda anulada'); break;
    case 'resuelve': break;
    case 'ataque': { Sonido.fx('ataque'); slash(e.a); aviso(`¡Zarpazo! ${nombre(e.a)} juega turnos extra`, '#ff6b4a'); anunciar(nombre(e.a) + ' recibe un ataque'); break; }
    case 'saltar': Sonido.fx('siesta'); zzz(e.j); anotar(nombre(e.j) + ' se echa una siesta'); break;
    case 'barajo': Sonido.fx('baja'); flashClase(el.mazo, 'baraja', 900); aviso('Se baraja el mazo', '#9a8cff'); anotar(nombre(e.j) + ' baraja el mazo'); break;
    case 'futuro':
      Sonido.fx('futuro');
      if (e.ids) abrirFuturo(e.ids); else aviso(`${nombre(e.j)} espía el futuro`, '#9a8cff');
      anotar(nombre(e.j) + ' mira el futuro');
      break;
    case 'favor': aviso(`${nombre(e.a)} debe darle una carta a ${nombre(e.j)}`, '#ff8fb5'); break;
    case 'dar': {
      Sonido.fx('roba');
      const part = e.id != null;
      volar(part ? svgCarta(e.id, tema) : svgDorso(tema), rectDe(e.de), rectDe(e.a), { w: 44, ms: 480 });
      if (e.a === yo() && part) T.nuevos.add(e.id);
      anotar(`${nombre(e.de)} le da una carta a ${nombre(e.a)}`);
      break;
    }
    case 'roba': {
      if (e.nada) { Sonido.fx('error'); aviso(`${nombre(e.a)} no tenía esa carta`, '#9a8cff'); anotar(`${nombre(e.j)} no consigue nada de ${nombre(e.a)}`); break; }
      Sonido.fx('roba');
      const cara = e.id != null && (e.j === yo() || e.a === yo() || e.tp != null);
      volar(cara ? svgCarta(e.id, tema) : svgDorso(tema), rectDe(e.a), rectDe(e.j), { w: 44, ms: 520 });
      if (e.j === yo() && e.id != null) T.nuevos.add(e.id);
      if (e.tp != null) aviso(`${nombre(e.j)} consigue «${INFO[e.tp].n}» de ${nombre(e.a)}`, '#ffd23d');
      anotar(`${nombre(e.j)} roba una carta a ${nombre(e.a)}`);
      break;
    }
    case 'rescata': Sonido.fx('roba'); volar(svgCarta(e.id, tema), rDesc(), rectDe(e.j), { w: 50, ms: 520 }); if (e.j === yo()) T.nuevos.add(e.id); aviso(`${nombre(e.j)} rescata «${nombreCarta(e.id)}» del descarte`, '#ffd23d'); break;
    case 'turno':
      if (e.j === yo() && T.v.fase === 'turno') Sonido.fx('turno');
      break;
    case 'chat': {
      const txt = e.k < FRASES.length ? FRASES[e.k] : EMOJIS[e.k - FRASES.length];
      mostrarBurbuja(e.j, txt, e.k >= FRASES.length); if (e.j !== yo()) Sonido.fx('chat');
      anunciar(nombre(e.j) + ': ' + txt);
      break;
    }
    case 'fin': {
      const gano = e.ganadores.includes(yo());
      Sonido.fx(gano ? 'gana' : 'pierde');
      anunciar(gano ? '¡Ganaste!' : nombre(e.ganador) + ' gana');
      setTimeout(() => mostrarFin(), anim() ? 1100 : 0);
      if (gano) setTimeout(confeti, 500);
      break;
    }
    case 'piloto': if (e.j === yo()) aviso('Piloto automático por inactividad: toca una carta para recuperar el control', '#ffd23d'); break;
    default: break;
  }
}

function mostrarBurbuja(j, txt, corta) {
  if (!txt) return;
  const base = chipDe(j);
  if (!base) return;
  const b = h('div', { cls: 'burbuja' + (corta ? ' corta' : ''), txt, 'aria-hidden': 'true' });
  const r = base.getBoundingClientRect();
  b.style.left = r.left + r.width / 2 + 'px'; b.style.top = (j === yo() ? r.top : r.bottom) + 'px';
  el.burbujas.appendChild(b); setTimeout(() => b.remove(), 2400);
}
function estampa(txt, color) {
  if (!anim()) return;
  const s = h('div', { cls: 'estampa', txt, style: '--c:' + color });
  el.burbujas.appendChild(s); setTimeout(() => s.remove(), 1100);
}
function slash(j) {
  const c = chipDe(j); if (!c || !anim()) return;
  const r = c.getBoundingClientRect();
  const s = h('div', { cls: 'zarpazo', style: `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px`, html: '<i></i><i></i><i></i>' });
  el.burbujas.appendChild(s); setTimeout(() => s.remove(), 900);
  flashClase(c, 'golpe', 700);
}
function zzz(j) {
  const c = chipDe(j); if (!c || !anim()) return;
  const r = c.getBoundingClientRect();
  const s = h('div', { cls: 'zzz', txt: 'Z z z', style: `left:${r.left + r.width / 2}px;top:${r.top}px` });
  el.burbujas.appendChild(s); setTimeout(() => s.remove(), 1500);
}
function explotar(j) {
  const c = centroPantalla(j);
  if (anim()) {
    el.boom.innerHTML = `<div class="boom-txt">¡BOOM!</div><div class="boom-sub">${nombre(j)}</div>`;
    el.boom.style.setProperty('--x', c.x + 'px'); el.boom.style.setProperty('--y', c.y + 'px');
    el.boom.classList.remove('on'); void el.boom.offsetWidth; el.boom.classList.add('on'); setTimeout(() => el.boom.classList.remove('on'), 1700);
    flashClase($('#app'), 'tiembla', 650);
  }
  particulasExplosion(c.x, c.y);
}

/* ---------- particulas (lienzo) ---------- */
const fxs = { ps: [], id: 0, w: 0, h: 0, k: 1 };
function ajustarLienzo() {
  const cv = el.fx; if (!cv) return;
  const k = Math.max(0.4, (D.resolucion || 100) / 100) * Math.min(window.devicePixelRatio || 1, 2);
  fxs.k = k; fxs.w = innerWidth; fxs.h = innerHeight;
  cv.width = Math.round(innerWidth * k); cv.height = Math.round(innerHeight * k);
}
const cuantas = (n) => Math.round(n * (D.calidad === 'ultra' ? 1.6 : D.calidad === 'alta' ? 1 : D.calidad === 'media' ? 0.55 : 0.3));
function sembrar(ps) { if (!D.particulas || !anim()) return; fxs.ps.push(...ps); if (fxs.ps.length > 700) fxs.ps.splice(0, fxs.ps.length - 700); if (!fxs.id) fxs.id = requestAnimationFrame(pasoFx); }
function particulasExplosion(x, y) {
  const ps = [], f = ['#ff3b30', '#ff8a1f', '#ffd23d', '#fff1a8'], pelo = ['#23232e', '#f29a3d', '#aab6d8', '#ffffff'];
  for (let i = 0; i < cuantas(70); i++) { const a = Math.random() * 6.283, v = 2 + Math.random() * 9; ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, g: 0.18, vida: 0, dura: 36 + Math.random() * 30, c: f[(Math.random() * 4) | 0], s: 3 + Math.random() * 6, tipo: 'c', fr: 0.97 }); }
  for (let i = 0; i < cuantas(26); i++) { const a = Math.random() * 6.283, v = 3 + Math.random() * 8; ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, g: 0.3, vida: 0, dura: 60 + Math.random() * 40, c: pelo[(Math.random() * 4) | 0], s: 4 + Math.random() * 5, tipo: 'p', r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, fr: 0.99 }); }
  for (let i = 0; i < cuantas(14); i++) ps.push({ x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 2, vy: -0.6 - Math.random(), g: -0.01, vida: 0, dura: 70 + Math.random() * 30, c: '#33323d', s: 12 + Math.random() * 16, tipo: 'h', fr: 0.99 });
  sembrar(ps);
}
function particulasCalma(x, y) {
  const ps = [], f = ['#3ddc97', '#7be8ff', '#ffffff', '#c8ffe9'];
  for (let i = 0; i < cuantas(34); i++) { const a = (i / 34) * 6.283 + Math.random() * 0.3, v = 1.5 + Math.random() * 3; ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.5, g: -0.02, vida: 0, dura: 50 + Math.random() * 30, c: f[(Math.random() * 4) | 0], s: 3 + Math.random() * 4, tipo: 'e', r: Math.random() * 3, vr: 0.1, fr: 0.98 }); }
  sembrar(ps);
}
export function confeti() {
  const ps = [], cols = ['#ff9d3d', '#ffd23d', '#ff4fd8', '#3df5ff', '#6dff6d', '#9a8cff'];
  for (let i = 0; i < cuantas(120); i++) ps.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.4, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, g: 0.02, vida: 0, dura: 170, c: cols[(Math.random() * 6) | 0], s: 5 + Math.random() * 6, tipo: 'k', r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, fr: 1 });
  sembrar(ps);
}
function pasoFx() {
  const cv = el.fx, g = cv.getContext('2d');
  g.setTransform(fxs.k, 0, 0, fxs.k, 0, 0); g.clearRect(0, 0, fxs.w, fxs.h);
  const vivos = [];
  for (const p of fxs.ps) {
    p.vida++; if (p.vida > p.dura) continue;
    p.vx *= p.fr; p.vy = p.vy * p.fr + p.g; p.x += p.vx; p.y += p.vy; if (p.r != null) p.r += p.vr || 0;
    const a = 1 - p.vida / p.dura; g.globalAlpha = p.tipo === 'h' ? a * 0.5 : Math.min(1, a * 1.6);
    g.fillStyle = p.c;
    if (p.tipo === 'k' || p.tipo === 'p') { g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s * 0.5); g.restore(); }
    else if (p.tipo === 'e') { g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillRect(-p.s / 2, -0.8, p.s, 1.6); g.fillRect(-0.8, -p.s / 2, 1.6, p.s); g.restore(); }
    else { g.beginPath(); g.arc(p.x, p.y, p.tipo === 'h' ? p.s * (1 + p.vida / p.dura) : p.s * a + 1, 0, 6.283); g.fill(); }
    vivos.push(p);
  }
  g.globalAlpha = 1; fxs.ps = vivos;
  fxs.id = vivos.length ? requestAnimationFrame(pasoFx) : 0;
  if (!vivos.length) g.clearRect(0, 0, fxs.w, fxs.h);
}

/* ---------- render ---------- */
function render(reset) {
  const v = T.v;
  document.body.classList.toggle('mi-turno', miTurno(v));
  document.body.classList.toggle('fuera', !v.vivo[yo()]);
  renderRivales(); renderCentro(); renderJugada(); renderMano(reset); renderAcciones(); renderEstado(); sincronizarModal();
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
  const ac = activo(v) === j && v.fase !== 'fin';
  ch.classList.toggle('turno', ac);
  ch.classList.toggle('ausente', tipo === 'ausente');
  ch.classList.toggle('fuera', !v.vivo[j]);
  ch.classList.toggle('equipoA', !!v.equipo && v.equipo[j] === 0); ch.classList.toggle('equipoB', !!v.equipo && v.equipo[j] === 1);
  ch.querySelector('.ini').textContent = nombre(j).slice(0, 1).toUpperCase();
  ch.querySelector('.nom').textContent = nombre(j) + (j === yo() ? ' (tú)' : '');
  const nivel = tipo.startsWith('bot') ? NIVELES[+tipo.slice(3)].nombre : tipo === 'ausente' ? 'ausente' : '';
  const eq = v.equipo ? (v.equipo[j] === v.equipo[yo()] ? (j === yo() ? 'tu equipo' : 'compañero') : 'rival') : '';
  const pts = v.cfg.meta > 1 ? v.puntos[j] + '/' + v.cfg.meta + ' rondas' : '';
  ch.querySelector('.sub').textContent = !v.vivo[j] ? 'eliminado' : [nivel, eq, pts].filter(Boolean).join(' · ');
  const cnt = ch.querySelector('.cnt');
  if (j !== yo()) cnt.innerHTML = v.vivo[j] ? `<span class="mini">${svgDorso(tema)}</span><b>${v.conteos[j]}</b>` : '<b class="ko">KO</b>'; else cnt.textContent = '';
  const b = ch.querySelector('.bandera');
  const extra = ac && v.fase === 'turno' && v.rest > 1;
  b.textContent = extra ? '×' + v.rest : '';
  b.className = 'bandera' + (extra ? ' extra' : '');
  ch.setAttribute('aria-label', `${nombre(j)}, ${v.vivo[j] ? v.conteos[j] + ' cartas' : 'eliminado'}${ac ? ', su turno' : ''}`);
}

function renderCentro() {
  const v = T.v;
  el.descarte.textContent = '';
  const ids = v.desc.slice(-4);
  ids.forEach((id, i) => {
    const arriba = i === ids.length - 1;
    const c = h('div', { cls: 'carta tope' + (arriba ? ' arriba' : ''), html: svgCarta(id, tema), style: `--r:${((id * 13) % 17) - 8}deg;--dx:${((id * 5) % 9) - 4}px` });
    if (arriba && T.ocultarTope && performance.now() < T.ocultarTope) { c.style.visibility = 'hidden'; setTimeout(() => { c.style.visibility = ''; }, Math.max(0, T.ocultarTope - performance.now())); }
    el.descarte.appendChild(c);
  });
  if (!ids.length) el.descarte.appendChild(h('div', { cls: 'hueco', txt: 'Descarte' }));
  el.descarte.setAttribute('aria-label', 'Descarte: ' + (ids.length ? nombreCarta(ids[ids.length - 1]) : 'vacío'));
  el.mazo.innerHTML = `<span class="pila-d">${svgDorso(tema)}</span><span class="pila-d">${svgDorso(tema)}</span><span class="pila-d">${svgDorso(tema)}</span><b class="n">${v.nMazo}</b>`;
  el.mazo.classList.toggle('activo', miTurno(v));
  el.mazo.setAttribute('aria-label', 'Mazo de robo, ' + v.nMazo + ' cartas');
  el.bFuturo.hidden = !(v.futuro && v.futuro.length);
  if (v.futuro) el.bFuturo.textContent = 'Ver futuro (' + v.futuro.length + ')';
}

/* ---------- panel de jugada pendiente / esperas ---------- */
function describir(p) {
  const o = p.obj != null ? nombre(p.obj) : '';
  if (p.kind === 'carta') return INFO[p.t].n + (p.t === TP.FAVOR ? ' → ' + o : '');
  if (p.kind === 'par') return `Par de ${INFO[p.t].n} → ${o}`;
  if (p.kind === 'trio') return `Trío de ${INFO[p.t].n}: pide «${INFO[p.pedir].n}» a ${o}`;
  return `Cinco gatos: rescata «${nombreCarta(p.pedir)}»`;
}
function renderJugada() {
  const v = T.v, p = v.pend, box = el.jugada;
  let clave = '';
  if (v.fase === 'nope' && p) clave = 'n' + p.j + ':' + p.cartas.join() + ':' + p.nopes.length;
  else if (v.fase === 'favor') clave = 'f' + p.j + p.a;
  else if (v.fase === 'bomba') clave = 'b' + p.j + v.desc.length;
  if (clave === jugadaClave) return;
  jugadaClave = clave; box.textContent = '';
  box.hidden = !clave;
  if (!clave) return;
  if (v.fase === 'nope') {
    const par = p.nopes.length % 2 === 0;
    const cartas = h('div', { cls: 'jg-cartas' }, p.cartas.map((id) => h('div', { cls: 'jg-c', html: svgCarta(id, tema) })));
    const barra = h('div', { cls: 'jg-barra' }, [h('i')]);
    box.appendChild(h('div', { cls: 'jg-cab', txt: nombre(p.j) + ' juega' }));
    box.appendChild(cartas);
    box.appendChild(h('div', { cls: 'jg-txt', txt: describir(p) }));
    box.appendChild(h('div', { cls: 'jg-res ' + (par ? 'ok' : 'no'), txt: (p.nopes.length ? `${p.nopes.length} × ¡Miau No! · ` : '') + (par ? 'Se cumplirá' : 'Quedará anulada') }));
    box.appendChild(barra);
    if (anim() && p.ms > 0) { const total = Math.max(p.ms, v.cfg.nopeMs); barra.firstChild.animate([{ transform: `scaleX(${Math.min(1, p.ms / total)})` }, { transform: 'scaleX(0)' }], { duration: p.ms, easing: 'linear', fill: 'forwards' }); }
    else barra.firstChild.style.transform = 'scaleX(.5)';
  } else if (v.fase === 'favor') {
    box.appendChild(h('div', { cls: 'jg-cab', txt: 'Súplica' }));
    box.appendChild(h('div', { cls: 'jg-txt', txt: p.a === yo() ? `${nombre(p.j)} te pide una carta` : `${nombre(p.a)} elige qué carta darle a ${nombre(p.j)}…` }));
  } else {
    box.appendChild(h('div', { cls: 'jg-cab', txt: 'Bomba desactivada' }));
    box.appendChild(h('div', { cls: 'jg-txt', txt: p.j === yo() ? 'Elige dónde esconder la bomba' : `${nombre(p.j)} esconde la bomba en el mazo…` }));
  }
}

const orden = (ids) => ids.slice().sort((a, b) => (MAZO[a] - MAZO[b]) || (a - b));
function limpiarMano() { els.forEach((e) => e.remove()); els.clear(); T.nuevos.clear(); }

function renderMano(reset) {
  const v = T.v, ids = orden(v.mano);
  T.lastMano = ids;
  for (const [id, e] of els) if (!ids.includes(id)) { e.remove(); els.delete(id); }
  let k = 0;
  const mio = miTurno(v);
  ids.forEach((id) => {
    let e = els.get(id);
    if (!e) {
      e = h('button', { type: 'button', cls: 'carta mia', 'data-id': id, html: svgCarta(id, tema), tabindex: '-1' }); els.set(id, e); el.inner.appendChild(e);
      if (anim() && (T.nuevos.has(id) || reset)) { e.dataset.entra = '1'; e.style.setProperty('--ent', k++); }
    }
    const t = MAZO[id];
    e.classList.toggle('jugable', mio && (ACCIONES.includes(t) || (v.cfg.combos && t >= TP.NOPE && t !== TP.DESACTIVAR)));
    e.classList.toggle('sel', T.sel.includes(id));
    e.classList.toggle('nopeable', v.fase === 'nope' && t === TP.NOPE && v.vivo[yo()]);
    e.setAttribute('aria-label', nombreCarta(id) + ': ' + INFO[t].d);
    e.setAttribute('aria-pressed', String(T.sel.includes(id)));
  });
  T.nuevos.clear();
  T.cursor = limitar(T.cursor, 0, Math.max(0, ids.length - 1));
  layoutMano(reset);
}
function layoutMano(reset) {
  const ids = T.lastMano, n = ids.length;
  const k = +getComputedStyle(document.documentElement).getPropertyValue('--carta-k') || 1;
  const tope = Math.max(50, Math.min(92, innerHeight * 0.165));
  const cw = Math.round(Math.min(tope, Math.max(50, el.mano.clientWidth / 4.9)) * k), ch = Math.round(cw * 1.5);
  const extra = innerHeight < 500 ? 28 : 58;
  el.mano.style.setProperty('--cw', cw + 'px'); el.mano.style.setProperty('--ch', ch + 'px'); el.mano.style.setProperty('--extra', extra + 'px');
  const W = el.mano.clientWidth || 360;
  const pad = Math.round(14 + cw * 0.2), paso = n <= 1 ? 0 : limitar((W - 2 * pad - cw) / (n - 1), 30 * k, cw * 0.8);
  const total = cw + paso * Math.max(0, n - 1);
  el.inner.style.width = Math.max(total + 2 * pad, W) + 'px'; el.inner.style.height = ch + extra + 'px';
  const x0 = Math.max(pad, (Math.max(total + 2 * pad, W) - total) / 2);
  const ang = Math.min(16, n * 1.6);
  const teclado = document.body.classList.contains('usando-teclado') || document.body.classList.contains('usando-mando');
  ids.forEach((id, i) => {
    const e = els.get(id); if (!e) return;
    const t = n <= 1 ? 0 : i / (n - 1) - 0.5;
    const sel = T.sel.includes(id), foco = i === T.cursor;
    const x = x0 + paso * i, y = extra * 0.55 + t * t * (extra * 0.6) + (sel ? -extra * 0.55 : foco ? -extra * 0.2 : 0);
    e.style.setProperty('--x', x + 'px'); e.style.setProperty('--y', y + 'px'); e.style.setProperty('--rot', t * ang + 'deg');
    e.style.zIndex = sel ? 200 : foco ? 150 : i + 1;
    e.classList.toggle('foco', foco && teclado);
    if (e.dataset.entra) {
      const d = rMazo(), r = e.getBoundingClientRect();
      delete e.dataset.entra;
      const idx = +e.style.getPropertyValue('--ent') || 0;
      const dx = d.left + d.width / 2 - (r.left + r.width / 2), dy = d.top + d.height / 2 - (r.top + r.height / 2);
      const rep = reset && !T.rapida;
      e.animate([{ transform: `translate(${dx}px,${dy}px) scale(.6) rotate(0deg)`, opacity: 0, offset: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'none', opacity: 1, offset: 1 }], { duration: rep ? 460 : 420, delay: (rep ? 600 : 100) + idx * (rep ? 70 : 90), easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
    }
  });
  if (teclado && els.get(ids[T.cursor])) el.mano.scrollLeft = Math.max(0, x0 + paso * T.cursor + cw / 2 - el.mano.clientWidth / 2);
  void reset;
}

function infoSeleccion() {
  const v = T.v, s = T.sel;
  if (!s.length) return '';
  const k = clasificar(s, v.cfg.combos);
  if (k === 'carta') return INFO[MAZO[s[0]]].n + ': ' + INFO[MAZO[s[0]]].d;
  if (k === 'par') return 'Par: robas una carta al azar a un rival.';
  if (k === 'trio') return 'Trío: pides una carta por su nombre; si la tiene, es tuya.';
  if (k === 'cinco') return 'Cinco distintos: eliges una carta del descarte.';
  if (s.length === 1) return INFO[MAZO[s[0]]].n + ': los gatos solo valen en pareja, trío o cinco distintos.';
  return 'Esa selección no forma una jugada. Pares y tríos: iguales · Cinco: todos distintos.';
}
function renderAcciones() {
  const v = T.v, mio = miTurno(v), vivo = v.vivo[yo()];
  const nn = v.mano.filter((c) => MAZO[c] === TP.NOPE).length;
  el.bRobar.disabled = !mio;
  el.bRobar.textContent = v.fase === 'turno' && v.turno === yo() && v.rest > 1 ? `Robar · quedan ${v.rest}` : 'Robar y terminar';
  const kind = T.sel.length ? clasificar(T.sel, v.cfg.combos) : null;
  el.bJugar.hidden = !T.sel.length || !mio;
  el.bJugar.disabled = !kind;
  el.bJugar.textContent = kind === 'par' ? 'Jugar par' : kind === 'trio' ? 'Jugar trío' : kind === 'cinco' ? 'Jugar 5 distintas' : 'Jugar';
  const ventana = v.fase === 'nope' && vivo && nn > 0;
  el.bNope.disabled = !ventana;
  el.bNope.classList.toggle('lista', ventana);
  el.bNope.innerHTML = `<span>¡Miau No!</span>${nn ? `<b>${nn}</b>` : ''}`;
  el.selInfo.textContent = mio ? infoSeleccion() : '';
  el.selInfo.hidden = !(mio && T.sel.length);
}
function renderEstado() {
  const v = T.v;
  let t;
  if (v.fase === 'fin') t = 'Fin de la ronda';
  else if (!v.vivo[yo()]) t = 'Estás fuera. Mira cómo acaba la partida.';
  else if (v.fase === 'nope') t = v.pend.j === yo() && !v.pend.nopes.length ? 'Otros pueden anular tu jugada con ¡Miau No!…' : tieneNope(v) ? '¿Anular o rescatar la jugada? Pulsa ¡Miau No!' : 'Ventana de «¡Miau No!»…';
  else if (v.fase === 'favor') t = v.pend.a === yo() ? `Elige la carta que le das a ${nombre(v.pend.j)}` : `${nombre(v.pend.a)} elige una carta…`;
  else if (v.fase === 'bomba') t = v.pend.j === yo() ? 'Esconde la bomba en el mazo' : `${nombre(v.pend.j)} esconde la bomba…`;
  else if (v.turno === yo()) t = 'Tu turno: juega cartas y termina robando' + (v.rest > 1 ? ` (turnos: ${v.rest})` : '');
  else t = 'Turno de ' + nombre(v.turno);
  el.estado.textContent = t;
  el.estado.className = miTurno(v) ? 'mio' : '';
  const k = v.fase + v.turno + v.rest + v.nMazo;
  if (miTurno(v) && T.ultimoAviso !== k) { T.ultimoAviso = k; anunciar(t); }
}

/* ---------- acciones ---------- */
function error(txt) { Sonido.fx('error'); aviso(txt, '#ff6b4a'); const b = el.estado; b.classList.remove('sacude'); void b.offsetWidth; b.classList.add('sacude'); return false; }
function enviar(cmd) {
  if (!T.enviar) return false;
  const r = T.enviar(cmd);
  if (r && r.ok === false) { error('Jugada no válida'); return false; }
  return true;
}
export function accion(n) {
  const v = T.v; if (!v || v.fase === 'fin') return false;
  if (!v.vivo[yo()]) return error('Estás eliminado');
  if (n === 'robar') {
    if (v.fase === 'nope') return error('Espera a que termine la ventana de «¡Miau No!»');
    if (!miTurno(v)) return error('Aún no es tu turno');
    T.sel = []; return enviar({ t: 'robar' });
  }
  if (n === 'nope') {
    if (v.fase !== 'nope') return error('No hay ninguna jugada que anular');
    if (!tieneNope(v)) return error('No tienes ¡Miau No!');
    return enviar({ t: 'nope' });
  }
  return false;
}
export function cancelarSel() { if (!T.sel.length) return; T.sel = []; Sonido.fx('click'); renderMano(); renderAcciones(); }

function compatible(sel, id) {
  const ts = sel.map((c) => MAZO[c]), t = MAZO[id];
  if (ts.every((x) => x === t) && sel.length < 3 && t !== TP.DESACTIVAR && t !== TP.BOMBA) return true;
  if (!ts.includes(t) && sel.length < 5 && (sel.length >= 2 || (ts[0] >= TP.GATO && t >= TP.GATO))) return new Set(ts).size === ts.length;
  return false;
}
export function tocar(id) {
  const v = T.v; if (!v || v.fase === 'fin') return;
  T.cursor = Math.max(0, T.lastMano.indexOf(id));
  if (!miTurno(v)) {
    if (v.fase === 'nope' && MAZO[id] === TP.NOPE && v.vivo[yo()]) { accion('nope'); return; }
    Sonido.fx('selecciona'); layoutMano(); return;
  }
  if (T.sel.includes(id)) {
    if (clasificar(T.sel, v.cfg.combos)) { jugarSeleccion(); return; }
    T.sel = T.sel.filter((x) => x !== id);
  } else if (T.sel.length && compatible(T.sel, id)) T.sel.push(id);
  else T.sel = [id];
  Sonido.fx('selecciona');
  renderMano(); renderAcciones();
}
export function jugarSeleccion() {
  const v = T.v; if (!v || !T.sel.length) return;
  if (!miTurno(v)) return error('Ahora no puedes jugar cartas');
  const cartas = T.sel.slice(), kind = clasificar(cartas, v.cfg.combos);
  if (!kind) return error(infoSeleccion());
  const fin = (extra) => { T.sel = []; renderMano(); renderAcciones(); enviar(cmd(extra)); };
  const cmd = (extra) => (kind === 'carta' ? { t: 'jugar', carta: cartas[0], ...extra } : { t: 'combo', cartas, ...extra });
  const objs = () => { const l = []; for (let j = 0; j < v.n; j++) if (objetivoValido({ n: v.n, vivo: v.vivo, equipo: v.equipo }, yo(), j)) l.push(j); return l; };
  if ((kind === 'carta' && MAZO[cartas[0]] === TP.FAVOR) || kind === 'par' || kind === 'trio') {
    const l = objs().filter((j) => kind === 'trio' || v.conteos[j] > 0);
    if (!l.length) return error('Ningún rival tiene cartas que tomar');
    elegirObjetivo(kind === 'carta' ? 'Pídele un favor a…' : kind === 'par' ? 'Roba una carta al azar a…' : 'Pídele una carta a…', l, (o) => {
      if (o == null) return;
      if (kind === 'trio') elegirTipo((tp) => { if (tp != null) fin({ obj: o, pedir: tp }); });
      else fin({ obj: o });
    });
  } else if (kind === 'cinco') {
    const util = Array.from(new Set(v.desc.filter((c) => MAZO[c] !== TP.BOMBA && !cartas.includes(c))));
    if (!util.length) return error('El descarte está vacío');
    elegirDescarte(util, (id) => { if (id != null) fin({ pedir: id }); });
  } else fin();
}

/* ---------- cursor (teclado / mando) ---------- */
export function moverCursor(d) {
  const n = T.lastMano.length; if (!n) return;
  T.cursor = limitar(T.cursor + d, 0, n - 1);
  Sonido.fx('selecciona'); layoutMano();
}
export function confirmarCursor() {
  const id = T.lastMano[T.cursor];
  if (id == null) return;
  const v = T.v;
  if (v && miTurno(v) && !T.sel.length && ACCIONES.includes(MAZO[id])) { T.sel = [id]; jugarSeleccion(); return; }
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
    if (!drag.activo && dy < -18 * (1 / D.sensArrastre) && -dy > Math.abs(dx) && T.v && miTurno(T.v)) {
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
      const sobre = ev.clientX > r.left - 40 && ev.clientX < r.right + 40 && ev.clientY > r.top - 40 && ev.clientY < r.bottom + 40;
      if (sobre || -dy > 120 / D.sensArrastre) { if (!T.sel.includes(d.id)) T.sel = [d.id]; renderMano(); jugarSeleccion(); }
      el.mano.dataset.supr = '1'; setTimeout(() => delete el.mano.dataset.supr, 50);
    }
  };
  window.addEventListener('pointerup', fin);
  window.addEventListener('pointercancel', (ev) => { if (drag && ev.pointerId === drag.pid) { drag.el.classList.remove('arrastra'); drag.el.style.translate = ''; drag = null; } });
  el.mano.addEventListener('click', (ev) => {
    if (el.mano.dataset.supr) return;
    const c = ev.target.closest('.carta'); if (c) tocar(+c.dataset.id);
  });
}

/* ---------- modales de eleccion ---------- */
export function abrirModal(contenido, onCerrar) {
  cerrarModal();
  el.modal.textContent = '';
  const caja = h('div', { cls: 'caja', role: 'dialog', 'aria-modal': 'true' }, [contenido]);
  el.modal.appendChild(caja); el.modal.hidden = false; T.alCerrarModal = onCerrar || null;
  setTimeout(() => { const f = caja.querySelector('[data-f]'); if (f) f.focus(); }, 30);
  return caja;
}
export function cerrarModal() {
  if (el.modal.hidden) return;
  el.modal.hidden = true; el.modal.textContent = '';
  const f = T.alCerrarModal; T.alCerrarModal = null; if (f) f();
}
const btnCancelar = (fin) => h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, 'data-cerrar': 1, txt: 'Cancelar', on: { click: () => fin(null) } });
function eleccion(titulo, nota, cuerpo, cb, forzado) {
  let hecho = false;
  const fin = (x) => { if (hecho) return; hecho = true; cerrarModal(); cb(x); };
  const cont = h('div', { cls: 'elige' }, [h('h3', { txt: titulo }), nota ? h('p', { cls: 'nota', txt: nota }) : null, cuerpo(fin), forzado ? null : btnCancelar(fin)]);
  abrirModal(cont, () => { if (!hecho) { hecho = true; cb(null); } });
}
function elegirObjetivo(titulo, lista, cb) {
  const v = T.v;
  eleccion(titulo, '', (fin) => h('div', { cls: 'lista' }, lista.map((j, i) => h('button', { type: 'button', cls: 'btn objetivo', 'data-f': 1, 'data-n': i + 1, style: '--c:' + hex(j), html: `<b>${nombre(j)}</b><span>${v.conteos[j]} cartas</span>`, on: { click: () => fin(j) } }))), cb);
}
function elegirTipo(cb) {
  const tipos = []; for (let t = 1; t < 13; t++) tipos.push(t);
  eleccion('¿Qué carta pides?', 'Si la tiene, te la da. Si no, pierdes el trío.', (fin) => h('div', { cls: 'rejilla-t' }, tipos.map((t, i) => h('button', { type: 'button', cls: 'mini-carta', 'data-f': 1, 'data-n': i + 1, 'aria-label': INFO[t].n, html: svgTipo(t, tema) + `<span>${INFO[t].n}</span>`, on: { click: () => fin(t) } }))), cb);
}
function elegirDescarte(ids, cb) {
  eleccion('Rescata una carta del descarte', '', (fin) => h('div', { cls: 'rejilla-t' }, ids.map((id, i) => h('button', { type: 'button', cls: 'mini-carta', 'data-f': 1, 'data-n': i + 1, 'aria-label': nombreCarta(id), html: svgCarta(id, tema) + `<span>${nombreCarta(id)}</span>`, on: { click: () => fin(id) } }))), cb);
}
function abrirFuturo(ids) {
  const cartas = h('div', { cls: 'futuro' }, ids.map((id, i) => h('div', { cls: 'fu-c' + (anim() ? ' gira' : ''), style: `--d:${i * 0.18}s` }, [h('div', { cls: 'carta', html: svgCarta(id, tema) }), h('span', { txt: i === 0 ? 'Siguiente' : (i + 1) + '.ª' })])));
  const bomba = ids.findIndex((c) => MAZO[c] === TP.BOMBA);
  abrirModal(h('div', { cls: 'elige' }, [h('h3', { txt: 'El futuro del mazo' }), h('p', { cls: 'nota', txt: bomba >= 0 ? `¡Cuidado! Hay un Gato Bomba en la posición ${bomba + 1}.` : 'No hay bombas entre las próximas cartas.' }), cartas, h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, 'data-cerrar': 1, txt: 'Entendido', on: { click: cerrarModal } })]));
}
function abrirReinsertar() {
  const v = T.v, n = v.nMazo;
  let pos = 0;
  const lab = h('div', { cls: 'rein-lab' });
  const rango = h('input', { type: 'range', min: 0, max: n, step: 1, value: 0, 'data-f': 1, 'aria-label': 'Posición de la bomba' });
  const pinta = () => { lab.textContent = pos === 0 ? 'Arriba del todo: la robará el siguiente que robe' : pos >= n ? 'Al fondo del mazo' : `Tras ${pos} carta${pos > 1 ? 's' : ''} (la ${pos + 1}.ª en salir)`; rango.value = pos; };
  rango.addEventListener('input', () => { pos = +rango.value; pinta(); });
  const rap = (txt, p) => h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt, on: { click: () => { pos = limitar(p(), 0, n); pinta(); } } });
  const cuerpo = h('div', { cls: 'elige' }, [
    h('h3', { txt: '¡Bomba desactivada!' }),
    h('p', { cls: 'nota', txt: `Escóndela en el mazo (${n} cartas). Nadie verá dónde.` }),
    h('div', { cls: 'rein' }, [h('div', { cls: 'carta', html: svgCarta(v.pend.bomba, tema) })]),
    lab, rango,
    h('div', { cls: 'aj-opc rein-rap' }, [rap('Arriba', () => 0), rap('2.ª', () => 1), rap('3.ª', () => 2), rap('Mitad', () => n >> 1), rap('Fondo', () => n), rap('Al azar', () => Math.floor(Math.random() * (n + 1)))]),
    h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, txt: 'Esconder la bomba', on: { click: () => { T.respondido = T.modalClave; cerrarModal(); enviar({ t: 'reinsertar', pos }); } } })
  ]);
  pinta(); abrirModal(cuerpo);
}
function abrirDar() {
  const v = T.v, quien = v.pend.j;
  const ids = orden(v.mano);
  const cuerpo = h('div', { cls: 'elige' }, [
    h('h3', { txt: `Dale una carta a ${nombre(quien)}` }), h('p', { cls: 'nota', txt: 'Tú eliges cuál. Mejor una que no necesites.' }),
    h('div', { cls: 'rejilla-t' }, ids.map((id, i) => h('button', { type: 'button', cls: 'mini-carta', 'data-f': 1, 'data-n': i + 1, 'aria-label': nombreCarta(id), html: svgCarta(id, tema) + `<span>${nombreCarta(id)}</span>`, on: { click: () => { T.respondido = T.modalClave; cerrarModal(); enviar({ t: 'dar', carta: id }); } } })))
  ]);
  abrirModal(cuerpo);
}
function sincronizarModal() {
  const v = T.v;
  let clave = null;
  if (v.vivo[yo()] && v.fase === 'favor' && v.pend.a === yo()) clave = 'favor:' + v.ronda + ':' + v.desc.length + ':' + v.pend.j;
  else if (v.vivo[yo()] && v.fase === 'bomba' && v.pend.j === yo()) clave = 'bomba:' + v.ronda + ':' + v.desc.length;
  if (clave) {
    if (T.modalClave !== clave && T.respondido !== clave) { T.modalClave = clave; if (v.fase === 'favor') abrirDar(); else abrirReinsertar(); }
  } else if (T.modalClave) { T.modalClave = null; cerrarModal(); }
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
  const gano = f.ganadores.includes(yo());
  const eq = !!v.equipo;
  p.appendChild(h('h2', { txt: f.partida ? (gano ? (eq ? '¡Tu equipo gana!' : '¡Ganaste la partida!') : eq ? 'Gana el otro equipo' : `${nombre(f.ganador)} gana la partida`) : (gano ? '¡Ganaste la ronda!' : `${nombre(f.ganador)} gana la ronda`) }));
  p.appendChild(h('p', { cls: 'sub', txt: eq ? 'Último equipo en pie: ' + f.ganadores.map(nombre).join(' y ') : (gano ? 'Último gato en pie.' : 'Sobrevivió al final.') }));
  const tabla = h('table', { cls: 'tabla' });
  const pos = [...f.ganadores, ...f.orden.slice().reverse().filter((j) => !f.ganadores.includes(j))];
  tabla.appendChild(h('tr', {}, [h('th', { txt: 'Puesto' }), h('th', { txt: 'Jugador' }), h('th', { txt: v.cfg.meta > 1 ? `Rondas (meta ${v.cfg.meta})` : 'Resultado' })]));
  pos.forEach((j, i) => tabla.appendChild(h('tr', { cls: f.ganadores.includes(j) ? 'gana' : '', style: '--c:' + hex(j) }, [h('td', { txt: String(i + 1) }), h('td', { txt: nombre(j) + (j === yo() ? ' (tú)' : '') }), h('td', { txt: v.cfg.meta > 1 ? String(v.puntos[j]) : f.ganadores.includes(j) ? 'Sobrevive' : 'Explotó' })])));
  p.appendChild(tabla);
  if (f.partida && T.alFin && T.alFin.posicion) { const ps = h('p', { cls: 'nota', 'aria-live': 'polite' }); p.appendChild(ps); T.alFin.posicion(ps); }
  const bt = h('div', { cls: 'botones' });
  if (!f.partida) bt.appendChild(h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Siguiente ronda', on: { click: () => enviar({ t: 'siguiente' }) } }));
  else {
    if (T.alFin && T.alFin.revancha) bt.appendChild(h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Revancha', on: { click: T.alFin.revancha } }));
    if (T.alFin && T.alFin.ranking) bt.appendChild(h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Ranking', on: { click: T.alFin.ranking } }));
    bt.appendChild(h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Menú', on: { click: () => T.alFin && T.alFin.menu() } }));
  }
  p.appendChild(bt);
  if (!f.partida) p.appendChild(h('p', { cls: 'nota', txt: 'La siguiente ronda empieza sola en unos segundos.' }));
  p.hidden = false;
  const b = bt.querySelector('[data-f]'); if (b) setTimeout(() => b.focus(), 30);
}
function ocultarFin() { el.finPanel.hidden = true; el.finPanel.textContent = ''; }
export const finVisible = () => !el.finPanel.hidden;
export function ocultarTodo() { ocultarFin(); cerrarModal(); el.chatPanel.hidden = true; el.logPanel.hidden = true; limpiarMano(); el.rivales.textContent = ''; el.miInfo.textContent = ''; el.jugada.hidden = true; T.v = null; T.modalClave = null; T.respondido = null; jugadaClave = ''; }

/* ---------- temporizador (llamado cada cuadro) ---------- */
export function cuadro(t) {
  const v = T.v; if (!v) return;
  if (v.fase !== 'fin' && el.finPanel && !el.finPanel.hidden && v.fase !== 'fin') ocultarFin();
  const barra = el.tiempo;
  if (T.lim && T.lim.total && v.fase !== 'fin' && v.fase !== 'nope') {
    const resta = Math.max(0, T.lim.ms - (t - T.limT0)), p = resta / T.lim.total;
    barra.hidden = false; barra.style.setProperty('--p', (p * 100).toFixed(1) + '%'); barra.classList.toggle('urge', resta < 4000);
    const ch = chipDe(activo(v));
    if (ch) ch.style.setProperty('--p', (p * 100).toFixed(1));
    if (activo(v) === yo() && resta < 3500) { const s = Math.ceil(resta / 1000); if (s !== T.tickSonado) { T.tickSonado = s; Sonido.fx('tictac'); } }
  } else barra.hidden = true;
}
export const elementos = () => el;
