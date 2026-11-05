// Orquesta eventos del motor -> animaciones 3D, sonidos y HUD (con cola para no pisarse).
import { X, dinero } from './contexto.js';
import { aviso, $ } from './dom.js';
import { pintarHud, flotante, miniCasilla, pintarTiempo } from './hud.js';
import { mostrarCarta } from './hojas.js';
import { sfx } from './sonido.js';
import { A } from './ajustes.js';
import * as Logros from './logros.js';

const cola = []; let corriendo = false, vibrar = () => {};
export function configurarVista(o) { vibrar = o.vibrar || vibrar; }
export const animando = () => corriendo || cola.length > 0 || (X.tablero && X.tablero.ocupado > 0);

export function mostrarInicial(E) {
  cola.length = 0; X.E = E; const T = X.tablero;
  T.poner(E); T.activo(E.fase === 'fin_partida' ? -1 : E.turno); if (E.dados[0]) T.verDados(E.dados);
  pintarHud();
}
export function recibir(E, ev) {
  cola.push({ E, ev }); X.E = E;
  if (!corriendo) correr();
}
function hibrido(E, ev) {
  const T = X.tablero, V = JSON.parse(JSON.stringify(E)), old = T.vis;
  if (!old || old.jug.length !== E.jug.length) return V;
  ev.forEach((v) => {
    if ((v.t === 'compra' || v.t === 'construir' || v.t === 'hipoteca') && old.prop[v.i]) V.prop[v.i] = old.prop[v.i];
    if ((v.t === 'mover' || v.t === 'salto') ) { V.jug[v.j].pos = old.jug[v.j].pos; V.jug[v.j].carcel = old.jug[v.j].carcel; }
  });
  return V;
}
async function correr() {
  corriendo = true;
  while (cola.length) {
    const job = cola.shift();
    X.tablero.rapido = cola.length >= 2;
    try { await procesar(job.E, job.ev); } catch (e) { console.error(e); X.tablero.poner(job.E); }
  }
  corriendo = false;
  pintarHud();
}
const chip = (j) => { const c = $('jugs').children[j]; if (!c) return { x: 60, y: 80 }; const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom }; };
async function procesar(E, ev) {
  const T = X.tablero, yo = X.yo;
  Logros.evento(ev, E, yo);
  if (ev.length) T.poner(hibrido(E, ev));
  for (const v of ev) {
    switch (v.t) {
      case 'log': if (!/saca \d|cobra su sueldo|roba /.test(v.x)) aviso(v.x, null, 2600); break;
      case 'dados': sfx.dado(); await T.dados(v.d); break;
      case 'mover': await T.mover(v.j, v.ruta, v.atras ? 150 : 200); break;
      case 'salto': if (v.a === 10 && E.jug[v.j].carcel) { sfx.carcel(); vibrar(0.7, 0.3, 200); } await T.salto(v.j, v.a, v.a === 10 && E.jug[v.j].carcel); break;
      case 'carta': sfx.carta(); mostrarCarta(v.k, v.x, v.j); await T.espera(X.tablero.rapido ? 200 : 1300); break;
      case 'compra': { sfx.compra(); T.actualizarParcial(E, v.i); const p = T.proyectar(v.i); flotante('-' + dinero(v.m), p.x, p.y, 'mal'); await T.compra(v.i, E.jug[v.j].color); if (v.j === yo) vibrar(0.3, 0.5, 120); break; }
      case 'renta': { sfx.renta(); const p = T.proyectar(v.i); flotante('Renta ' + dinero(v.m), p.x, p.y, 'mal'); if (v.de === yo) vibrar(0.6, 0.3, 150); await T.espera(250); break; }
      case 'din': { const c = chip(v.j); flotante((v.d > 0 ? '+' : '−') + dinero(Math.abs(v.d)), c.x, c.y, v.d > 0 ? 'bien' : 'mal'); if (v.j === yo && v.d >= 50) sfx.ganar(); break; }
      case 'construir': { sfx.construir(); T.actualizarParcial(E, v.i); const r = T.proyectar(v.i); flotante(v.vende ? 'Venta' : 'Construcción', r.x, r.y, ''); await T.espera(300); break; }
      case 'hipoteca': sfx.click(); T.actualizarParcial(E, v.i); break;
      case 'subasta': sfx.subasta(); break;
      case 'puja': sfx.puja(); break;
      case 'trato': sfx.trato(); break;
      case 'tratoNuevo': if (v.a === yo) { sfx.turno(); aviso('Tienes un trato pendiente', '#ffd23d'); } break;
      case 'turno': T.activo(v.j); if (v.j === yo) { sfx.turno(); vibrar(0.2, 0.4, 100); } if (A.camaraAuto && !A.reducirMov) T.camara.enfocar(E.jug[v.j].pos); break;
      case 'quiebra': sfx.quiebra(); await T.quiebra(v.j); break;
      case 'libre': sfx.click(); break;
      case 'fin': sfx.fin(); T.confeti(); T.activo(-1); break;
      default: break;
    }
  }
  T.poner(E);
  if (E.fase !== 'fin_partida') T.activo(E.turno);
  if (E.dados[0]) { /* los dados quedan donde cayeron */ }
  pintarHud();
  if (E.fase === 'fin_partida') Logros.finPartida(E, yo, E.jug.filter((p) => p.tipo === 'humano').length);
  pintarTiempo();
}
export { miniCasilla };
