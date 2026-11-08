// Interfaz DOM de la mesa: marcador, estado, botones, chat, panel de fin de mano y puente entre paquetes de la sesion y la escena (canvas).
import { h, $ } from './dom.js';
import * as R from './reglas.js';
import * as E from './escena.js';
import { A, D, reducirMov } from './ajustes.js';
import { Sonido } from './sonido.js';
import { FRASES, EMOJIS } from './mesa.js';

export const T = {
  v: null, meta: { nombres: [], colores: [], tipos: [] }, enviar: null, alEvento: null, alFin: null, pistasOn: () => false, apuestaTexto: () => '', ultimo: null
};
let el = {}, sigAt = 0, finTimer = 0, autoTimer = 0, ultTurnoMio = false, pistaN = 0;
const anim = () => !reducirMov();
const unidad = (v, j) => (v.cfg.modo === 'parejas' ? j % 2 : j);

export function iniciar() {
  el = {
    cv: $('#tablero'), marcador: $('#marcador'), estado: $('#estado'), tiempo: $('#tiempo'), pasar: $('#bPasar'), robar: $('#bRobar'), pista: $('#pista'),
    chat: $('#chatPanel'), fin: $('#finPanel'), toasts: $('#toasts'), aria: $('#aria'), zoom: $('#zoomCtl')
  };
  E.iniciar(el.cv);
  E.H.enviar = (cmd) => enviar(cmd);
  E.H.aviso = (t, c) => aviso(t, c);
  E.H.alPozo = () => accion('robar');
  el.pasar.addEventListener('click', () => accion('pasar'));
  el.robar.addEventListener('click', () => accion('robar'));
  $('#zMas').addEventListener('click', () => E.zoomPor(1.25));
  $('#zMenos').addEventListener('click', () => E.zoomPor(0.8));
  $('#zAjustar').addEventListener('click', () => E.ajustar());
  construirChat();
}
export const anunciar = (txt) => { if (A.acc.anuncios) { el.aria.textContent = ''; setTimeout(() => { el.aria.textContent = txt; }, 30); } };
export function aviso(txt, color) {
  const n = h('div', { cls: 'aviso', txt, style: color ? '--c:' + color : '' });
  el.toasts.appendChild(n);
  while (el.toasts.children.length > 3) el.toasts.firstChild.remove();
  setTimeout(() => n.remove(), 2600);
}
function enviar(cmd) {
  if (!T.enviar) return false;
  const r = T.enviar(cmd);
  if (r && r.ok === false) { Sonido.fx('error'); if (r.err) aviso(r.err, '#ff6b4a'); }
  return r;
}

/* ---------- paquetes ---------- */
export function recibir(p) {
  const v = p.v, prev = T.v;
  T.v = v; T.meta = { nombres: p.nombres, colores: p.colores, tipos: p.tipos }; T.ultimo = p;
  document.body.classList.toggle('mi-turno', v.turno === v.yo && !v.fin);
  E.nuevoEstado(v, p.ev || [], T.meta, !!p.resync);
  for (const e of p.ev || []) evento(e, v, !!p.resync);
  limpiarTimers();
  if (!v.fin) ocultarFin();
  else if (p.resync || !prev) mostrarFin(p, 0);
  if (p.lim) { T.limHasta = performance.now() + p.lim.ms; T.limTotal = p.lim.total; } else T.limHasta = 0;
  sigAt = p.sig ? performance.now() + p.sig : 0;
  render(prev);
  turnoAuto(v, prev);
}
function limpiarTimers() { clearTimeout(autoTimer); autoTimer = 0; }
function turnoAuto(v, prev) {
  const mio = v.turno === v.yo && !v.fin;
  if (mio && !ultTurnoMio) { Sonido.fx('turno'); E.sucio(); }
  ultTurnoMio = mio;
  if (!mio) return;
  if (v.cadena.length === 0 && v.obligada != null) { E.seleccionar(v.obligada); }
  if (A.juego.paseAuto && (v.puedePasar || v.puedeRobar)) {
    const cmd = v.puedePasar ? 'pasar' : 'robar';
    autoTimer = setTimeout(() => { if (T.v === v) accion(cmd); }, v.puedePasar ? 1100 : 750);
  }
  void prev;
}

function nombreUnidad(v, u) {
  if (v.cfg.modo === 'parejas') return u === unidad(v, v.yo) ? 'Tu pareja' : 'La pareja rival';
  return u === v.yo ? 'Tú' : T.meta.nombres[u] || 'Jugador';
}
function evento(e, v, resync) {
  const nom = (j) => (j === v.yo ? 'Tú' : T.meta.nombres[j] || 'Jugador');
  if (T.alEvento && !resync) T.alEvento(e, v);
  if (resync) return;
  switch (e.t) {
    case 'reparto': aviso(`Mano ${e.ronda} · sale ${e.sale === v.yo ? 'tu turno' : nom(e.sale)}`, '#3df5ff'); anunciar(`Mano ${e.ronda}. Sale ${nom(e.sale)}`); break;
    case 'jugar': {
      if (!anim()) Sonido.fx('ficha');
      const p = R.par(v.max, e.id);
      anunciar(`${nom(e.j)} juega ${p[0]}-${p[1]}. Extremos ${e.izq} y ${e.der}`);
      if (e.j === v.yo && D.vibracion && window.Mando && window.Mando.conectado) window.Mando.vibrar(0.1, 0.3, 60);
      break;
    }
    case 'pase': Sonido.fx('pasa'); anunciar(`${nom(e.j)} pasa`); if (e.j !== v.yo) pistaPase(e.j, v); break;
    case 'robo': if (e.j !== v.yo) { aviso(`${nom(e.j)} roba del pozo`, '#ffd23d'); Sonido.fx('robar'); } break;
    case 'chat': if (e.j !== v.yo) { Sonido.fx('chat'); const t = e.k < FRASES.length ? FRASES[e.k] : EMOJIS[e.k - FRASES.length]; E.burbuja(e.j, t, 'chat'); } break;
    case 'presencia': aviso(`${nom(e.j)} ${e.ausente ? 'se desconectó: un bot juega por él' : 'volvió a la mesa'}`, '#ffd23d'); break;
    case 'piloto': aviso(`${nom(e.j)} pasa a piloto automático`, '#ffd23d'); break;
    case 'fin': finDeMano(e, v); break;
    default: break;
  }
}
function pistaPase(j, v) { void j; void v; }
function finDeMano(e, v) {
  const mia = e.unidad === unidad(v, v.yo), gano = e.unidad >= 0 && mia;
  if (e.tipo === 'tranque') Sonido.fx('tranque'); else if (e.capicua) Sonido.fx('capicua'); else if (e.unidad >= 0) Sonido.fx('domino');
  if (e.partida) setTimeout(() => Sonido.fx(e.campeon === unidad(v, v.yo) ? 'gana' : 'pierde'), anim() ? 600 : 0);
  if (gano && D.particulas) setTimeout(() => E.celebrar(null, null, e.capicua ? 110 : 55), anim() ? 800 : 0);
  if (e.capicua) aviso('¡CAPICÚA! +' + e.bonus, '#ffd23d');
  if (D.vibracion && window.Mando && window.Mando.conectado) window.Mando.vibrar(0.5, 0.8, 400);
  anunciar(e.tipo === 'empate' ? 'Mano empatada' : `${nombreUnidad(v, e.unidad)} ${e.tipo === 'tranque' ? 'gana el tranque' : 'se pega'} y anota ${e.pts}`);
  clearTimeout(finTimer);
  finTimer = setTimeout(() => { if (T.v && T.v.fin) mostrarFin(T.ultimo, e); }, anim() ? 1300 : 100);
}

/* ---------- pintado DOM ---------- */
function render() {
  const v = T.v; if (!v) return;
  // marcador
  el.marcador.textContent = '';
  const nu = v.puntos.length;
  const item = (u) => {
    const col = v.cfg.modo === 'parejas' ? (u === unidad(v, v.yo) ? '#6dff6d' : '#ff9a6b') : T.meta.colores[u] || '#fff';
    return h('div', { cls: 'mk-u' + (v.turno >= 0 && unidad(v, v.turno) === u ? ' turno' : ''), style: '--c:' + col }, [h('span', { cls: 'mk-n', txt: nombreUnidad(v, u) }), h('b', { txt: String(v.puntos[u]) })]);
  };
  const orden = [];
  for (let u = 0; u < nu; u++) orden.push(u);
  const mi = unidad(v, v.yo); orden.sort((a, b) => ((a - mi + nu) % nu) - ((b - mi + nu) % nu));
  orden.forEach((u, i) => { el.marcador.appendChild(item(u)); if (i === 0 && nu === 2) el.marcador.appendChild(h('div', { cls: 'mk-meta', txt: `Meta ${v.cfg.meta} · Mano ${v.ronda}` })); });
  if (nu > 2) el.marcador.appendChild(h('div', { cls: 'mk-meta', txt: `Meta ${v.cfg.meta} · Mano ${v.ronda}` }));
  // estado y botones
  const mio = v.turno === v.yo && !v.fin;
  let txt = '';
  if (v.fin) txt = 'Mano terminada';
  else if (mio) txt = v.puedePasar ? 'No tienes ficha: pasa' : v.puedeRobar ? 'No tienes ficha: roba del pozo' : v.cadena.length ? `Tu turno · extremos ${v.ext.izq} y ${v.ext.der}` : 'Tu turno: sales tú';
  else txt = `Turno de ${T.meta.nombres[v.turno] || '…'}`;
  el.estado.textContent = txt; el.estado.classList.toggle('mio', mio);
  el.pasar.hidden = false; el.pasar.disabled = !v.puedePasar;
  el.pasar.classList.toggle('pulso', v.puedePasar);
  const duelo = v.cfg.modo === 'duelo';
  el.robar.hidden = !duelo; el.robar.disabled = !v.puedeRobar; el.robar.classList.toggle('pulso', v.puedeRobar);
  el.robar.textContent = duelo ? `Robar (${v.pozo})` : 'Robar';
  el.tiempo.hidden = !T.limHasta || !!v.fin;
  pista();
}
function pista() {
  const v = T.v;
  let t = '';
  if (v && T.pistasOn() && !v.fin) {
    const mio = v.turno === v.yo;
    if (mio && !v.cadena.length) t = 'Sales tú: toca la ficha marcada y vuelve a tocarla para jugarla.';
    else if (mio && v.puedePasar) t = 'No tienes ficha que encaje: pulsa «Pasar».';
    else if (mio && v.puedeRobar) t = 'Sin jugada: roba del pozo hasta que te salga una ficha.';
    else if (mio && E.S.sel == null) t = 'Tu turno: toca una ficha que brille y luego el extremo resaltado.';
    else if (mio && E.ladosDe(E.S.sel).length > 1) t = 'Cabe en los dos extremos: toca el que prefieras.';
    else if (mio) t = 'Toca de nuevo la ficha (o arrástrala a la cadena) para jugarla.';
    else if (v.cfg.modo === 'parejas') t = 'Tu compañero se sienta frente a ti: ayúdalo a no pasar.';
  }
  el.pista.textContent = t; el.pista.hidden = !t;
}
export function refrescar() { if (T.v) { render(); E.sucio(); } }

export function accion(n) {
  const v = T.v; if (!v) return false;
  if (n === 'pasar') { if (!v.puedePasar) { Sonido.fx('error'); aviso(v.turno !== v.yo ? 'Espera tu turno' : 'Tienes ficha jugable: no puedes pasar', '#ff6b4a'); return false; } enviar({ t: 'pasar' }); return true; }
  if (n === 'robar') { if (!v.puedeRobar) { Sonido.fx('error'); aviso(v.cfg.modo !== 'duelo' ? 'Aquí no hay pozo' : v.turno !== v.yo ? 'Espera tu turno' : 'No puedes robar ahora', '#ff6b4a'); return false; } enviar({ t: 'robar' }); return true; }
  if (n === 'siguiente') { enviar({ t: 'siguiente' }); return true; }
  return false;
}

/* ---------- chat ---------- */
function construirChat() {
  const c = el.chat; c.textContent = '';
  c.appendChild(h('div', { cls: 'frases' }, FRASES.map((f, k) => h('button', { type: 'button', cls: 'btn peq sec', 'data-f': 1, txt: f, on: { click: () => chat(k) } }))));
  c.appendChild(h('div', { cls: 'emojis' }, EMOJIS.map((m, k) => h('button', { type: 'button', cls: 'emoji', 'data-f': 1, txt: m, 'aria-label': 'Emoji ' + m, on: { click: () => chat(FRASES.length + k) } }))));
}
function chat(k) { enviar({ t: 'chat', k }); el.chat.hidden = true; }
export function alternarChat(b) { el.chat.hidden = b == null ? !el.chat.hidden : !b; if (!el.chat.hidden) { const f = el.chat.querySelector('[data-f]'); if (f) f.focus(); } return !el.chat.hidden; }
export const chatAbierto = () => !el.chat.hidden;

/* ---------- fin de mano / partida ---------- */
function ocultarFin() { clearTimeout(finTimer); el.fin.hidden = true; el.fin.textContent = ''; }
export const finVisible = () => !el.fin.hidden;
function mostrarFin(p, e) {
  const v = p.v, f = v.fin; if (!f) return;
  const mi = unidad(v, v.yo), mia = f.unidad === mi, nom = (j) => (j === v.yo ? 'Tú' : p.nombres[j]);
  el.fin.textContent = ''; el.fin.hidden = false; void e;
  let titulo, sub;
  if (f.partida) { titulo = f.campeon === mi ? (v.cfg.modo === 'parejas' ? '¡Ganó tu pareja la partida!' : '¡Ganaste la partida!') : (v.cfg.modo === 'parejas' ? 'La pareja rival ganó la partida' : `${nombreUnidad(v, f.campeon)} ganó la partida`); }
  else if (f.tipo === 'empate') titulo = 'Tranque empatado';
  else if (v.cfg.modo === 'parejas') titulo = mia ? '¡Mano para tu pareja!' : 'Mano para la pareja rival';
  else titulo = mia ? '¡Ganaste la mano!' : `Mano para ${p.nombres[f.ganador]}`;
  if (f.tipo === 'empate') sub = 'Nadie anota: las sumas están igualadas.';
  else sub = (f.tipo === 'tranque' ? `Tranque: gana ${nom(f.ganador).replace('Tú', 'tú')} con la menor suma.` : `${nom(f.ganador)} se queda sin fichas.`) + ` Anota ${f.pts}${f.bonus ? ` (incluye capicúa +${f.bonus})` : ''}.`;
  el.fin.appendChild(h('h2', { txt: titulo }));
  el.fin.appendChild(h('p', { cls: 'sub', txt: sub }));
  const tabla = h('div', { cls: 'fin-manos' });
  for (let j = 0; j < v.n; j++) {
    const fichas = h('div', { cls: 'fin-fichas' }, f.manos[j].map((id) => { const q = R.par(v.max, id); return E.miniFicha(q[0], q[1], 26, true); }));
    tabla.appendChild(h('div', { cls: 'fin-fila' + (j === f.ganador ? ' gana' : ''), style: '--c:' + (p.colores[j] || '#fff') }, [h('span', { cls: 'fin-n', txt: nom(j) }), fichas, h('b', { txt: String(f.manos[j].reduce((s, id) => s + R.valor(v.max, id), 0)) })]));
  }
  el.fin.appendChild(tabla);
  const nu = f.puntos.length, filas = [];
  for (let u = 0; u < nu; u++) filas.push(h('span', { cls: u === f.campeon ? 'camp' : '' }, [nombreUnidad(v, u) + ': ', h('b', { txt: `${f.puntos[u]}/${v.cfg.meta}` })]));
  el.fin.appendChild(h('p', { cls: 'fin-marc' }, filas));
  const ap = T.apuestaTexto(f); if (ap) el.fin.appendChild(h('p', { cls: 'fin-ap', txt: ap }));
  const pos = h('p', { cls: 'nota', 'aria-live': 'polite' });
  el.fin.appendChild(pos);
  const bt = h('div', { cls: 'botones' });
  if (!f.partida) {
    const b = h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, txt: 'Siguiente mano', on: { click: () => accion('siguiente') } });
    bt.appendChild(b); T.sigBoton = b;
  } else {
    if (T.alFin) {
      T.alFin.posicion && T.alFin.posicion(pos);
      bt.appendChild(h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, txt: 'Revancha', on: { click: () => T.alFin.revancha() } }));
      bt.appendChild(h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Ranking', on: { click: () => T.alFin.ranking() } }));
      bt.appendChild(h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Menú', on: { click: () => T.alFin.menu() } }));
    }
  }
  el.fin.appendChild(bt);
  setTimeout(() => { const b = el.fin.querySelector('[data-f]'); if (b) b.focus({ preventScroll: true }); }, 60);
}

export function ocultarTodo() {
  ocultarFin(); el.chat.hidden = true; E.reiniciar(); T.v = null; limpiarTimers(); document.body.classList.remove('mi-turno'); ultTurnoMio = false;
  el.marcador.textContent = '';
}

/* ---------- cuadro ---------- */
let ultimaTexto = 0;
export function cuadro(t, dt) {
  E.cuadro(t, dt);
  if (T.limHasta && T.v && !T.v.fin) {
    const resto = Math.max(0, T.limHasta - performance.now());
    el.tiempo.style.setProperty('--p', Math.round(100 * resto / T.limTotal) + '%');
    el.tiempo.classList.toggle('urge', resto < 6000);
  }
  if (t - ultimaTexto > 400) {
    ultimaTexto = t;
    if (T.sigBoton && T.sigBoton.isConnected && sigAt) T.sigBoton.textContent = `Siguiente mano (${Math.max(0, Math.ceil((sigAt - performance.now()) / 1000))})`;
  }
}
export const elementos = () => el;
