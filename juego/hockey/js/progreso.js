// Reglas de progreso: monedas virtuales, tienda, estadisticas, logros, reto y torneo.
import { P, guardarProgreso } from './almacen.js';
import * as CH from './cuenta-hockey.js';
const D = window.HkDatos;

export const aviso = { fn: null };
const decir = (t) => aviso.fn && aviso.fn(t);

export function logro(id) {
  if (P.logros[id]) return false;
  P.logros[id] = Date.now(); guardarProgreso(); CH.logroNube(id);
  const l = D.LOGROS.find((x) => x.id === id); decir('Logro: ' + (l ? l.nombre : id)); return true;
}
export function monedas(n) { P.monedas = Math.max(0, P.monedas + n); guardarProgreso(); }

export function comprar(tipo, id) {
  const lista = tipo === 'mesa' ? D.MESAS : D.DISCOS, tiene = tipo === 'mesa' ? P.mesas : P.discos, it = lista.find((x) => x.id === id);
  if (!it || tiene.includes(id)) return false;
  if (P.monedas < it.precio) return false;
  P.monedas -= it.precio; tiene.push(id); equipar(tipo, id);
  if (P.mesas.length === D.MESAS.length && P.discos.length === D.DISCOS.length) logro('tienda_completa');
  guardarProgreso(); return true;
}
export function equipar(tipo, id) {
  const tiene = tipo === 'mesa' ? P.mesas : P.discos; if (!tiene.includes(id)) return;
  P.sel[tipo === 'mesa' ? 'mesa' : 'disco'] = id; guardarProgreso();
}

// res de partida.fin; ctx.contarStats=false en 2 jugadores locales
export function registrar(res) {
  const sp = res.spec, st = P.stats, local = sp.modo === 'local';
  const out = { monedas: 0, logros: [], gane: res.gane };
  if (local) { logro('dos_jugadores'); out.nota = 'Partida de 2 jugadores: no suma monedas ni ranking.'; return out; }
  st.partidas++; st.goles += res.golesYo; st.contra += res.golesRival; st.segundos += res.seg;
  if (res.golesYo > 0) logro('primer_gol');
  st.mejorRacha = Math.max(st.mejorRacha, res.racha); if (res.racha >= 5) logro('racha_5');
  if (res.gane) {
    st.victorias++; if (sp.modo === 'bot' || sp.modo === 'torneo' || sp.modo === 'reto') P.vic[sp.dif] = (P.vic[sp.dif] || 0) + 1;
    logro('primera_victoria');
    if (sp.dif === 3 && sp.modo === 'bot') logro('victoria_experto');
    if (res.golesRival === 0) logro('blanqueada');
    if (res.deficit >= 3) logro('remontada');
  } else st.derrotas++;
  if (sp.rol !== 'local') { st.onlinePart++; if (res.gane) { st.onlineVic++; logro('online_victoria'); } }
  st.poderes += res.poderes; if (st.poderes >= 10) logro('poderes_10');
  if (st.goles >= 100) logro('goles_100'); if (st.victorias >= 25) logro('victorias_25');
  // monedas: 1 por gol, premio por ganar segun dificultad (en linea = Difícil)
  const mult = sp.rol !== 'local' ? 2 : sp.dif;
  out.monedas = res.golesYo + (res.gane ? 10 + mult * 8 : 2);
  if (sp.modo === 'bot' && sp.dif === 0) out.monedas = Math.min(out.monedas, 14);
  monedas(out.monedas);
  guardarProgreso(); CH.enviarPuntajes(st); CH.xp(res.gane ? 20 + mult * 10 : 8);
  return out;
}

/* ---------- reto ---------- */
export function retoGanado(i) {
  let bono = 0;
  if (i + 1 > P.reto.max) { P.reto.max = i + 1; bono = 30 + i * 10; monedas(bono); }
  if (P.reto.max >= 4) logro('reto_4'); if (P.reto.max >= D.RETOS.length) logro('reto_completo');
  guardarProgreso(); return bono;
}

/* ---------- torneo ---------- */
const barajar = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export function nuevoTorneo() {
  const ids = barajar([0, 1, 2, 3, 4, 5, 6]);
  P.torneo = { l: [[-1].concat(ids), [], [], []], ronda: 0, vivo: true, campeon: false };
  guardarProgreso(); return P.torneo;
}
const nivelDe = (id) => (id < 0 ? 1.5 : D.RIVALES[id].nivel);
export function rivalActual() { const T = P.torneo; return T && T.vivo ? T.l[T.ronda][1] : null; }
export function metaRonda(r) { return r === 2 ? 7 : 5; }
export function cerrarRonda(gane) {
  const T = P.torneo; if (!T) return;
  const L = T.l[T.ronda], sig = [];
  for (let i = 0; i < L.length; i += 2) {
    const a = L[i], b = L[i + 1];
    if (a === -1) sig.push(gane ? a : b);
    else { const p = Math.max(0.15, Math.min(0.85, 0.5 + 0.17 * (nivelDe(a) - nivelDe(b)))); sig.push(Math.random() < p ? a : b); }
  }
  T.l[T.ronda + 1] = sig;
  if (!gane) { T.vivo = false; T.ronda++; }
  else if (T.ronda === 2) { T.ronda = 3; T.vivo = false; T.campeon = true; P.stats.torneos++; monedas(150); logro('torneo_campeon'); }
  else T.ronda++;
  guardarProgreso();
}
export const nombreTorneo = (id) => (id < 0 ? 'Tú' : D.RIVALES[id].nombre);
