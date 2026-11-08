// Progreso: monedas virtuales, skins, estadisticas y logros (se guarda en isla_progreso; se sincroniza con la cuenta).
import { G } from './estado.js';
import { guardarProgreso, SKINS } from './almacen.js';
import * as CI from './cuenta-isla.js';
import { h } from './dom.js';
export const LOGROS = [
  { id: 'primera_baja', nombre: 'Primera baja', desc: 'Elimina a un rival.' }, { id: 'victoria', nombre: 'Rey de la isla', desc: 'Gana una partida.' },
  { id: 'diez_victorias', nombre: 'Diez coronas', desc: 'Gana 10 partidas.' }, { id: 'cinco_bajas', nombre: 'Racha de cinco', desc: '5 bajas en una partida.' },
  { id: 'top5', nombre: 'Entre los cinco', desc: 'Termina entre los 5 primeros.' }, { id: 'constructor', nombre: 'Constructor', desc: 'Coloca 100 piezas.' },
  { id: 'recolector', nombre: 'Recolector', desc: 'Reúne 1000 materiales.' }, { id: 'tiro_largo', nombre: 'Tiro largo', desc: 'Elimina con francotirador a más de 100 m.' },
  { id: 'explosivo', nombre: 'Explosivo', desc: 'Elimina con el lanzacohetes.' }, { id: 'comprador', nombre: 'De compras', desc: 'Compra una skin.' },
  { id: 'duo_victoria', nombre: 'Dúo imbatible', desc: 'Gana una partida de dúos.' }, { id: 'ultimo_circulo', nombre: 'Último círculo', desc: 'Llega vivo a la fase 5 de la tormenta.' },
  { id: 'aprendiz', nombre: 'Aprendiz', desc: 'Practica 1 minuto en modo creativo.' }];
let cont = null;
export function aviso(txt, ms = 3200) {
  if (!cont) { cont = h('div', { id: 'avisos' }); document.body.appendChild(cont); }
  const d = h('div', { cls: 'aviso', txt }); cont.appendChild(d); setTimeout(() => d.classList.add('fuera'), ms); setTimeout(() => d.remove(), ms + 500);
}
const guardar = () => guardarProgreso(G.prog);
export function dar(id) {
  const p = G.prog; if (p.logros[id]) return false;
  p.logros[id] = Date.now(); guardar(); const l = LOGROS.find((x) => x.id === id); aviso('Logro: ' + (l ? l.nombre : id)); CI.logro(id); return true;
}
export const monedasDe = (r) => Math.round(10 + r.elims * 10 + (r.gano ? 200 : r.puesto <= 5 ? 60 : r.puesto <= 10 ? 25 : 0) + Math.floor(r.dano / 100) * 2);
export function registrarPartida(r) {
  const p = G.prog, s = p.stats; if (r.modo === 'creativo') return { monedas: 0 };
  s.partidas++; s.elims += r.elims; s.dano += r.dano; s.mats += r.mats; s.piezas += r.piezas; s.tiempo += Math.round(r.tiempo); s.mejorElim = Math.max(s.mejorElim, r.elims); s.mejorPuesto = Math.min(s.mejorPuesto, r.puesto);
  if (r.gano) s.victorias++; else s.muertes++; if (r.puesto <= 5) s.top5++;
  const m = monedasDe(r); p.monedas += m;
  if (r.gano) { dar('victoria'); if (r.modo === 'duos') dar('duo_victoria'); } if (s.victorias >= 10) dar('diez_victorias'); if (r.puesto <= 5) dar('top5'); if (r.elims >= 5) dar('cinco_bajas'); if (s.piezas >= 100) dar('constructor'); if (s.mats >= 1000) dar('recolector');
  guardar(); CI.enviarPuntajes({ victorias: s.victorias, elims: s.elims, mejorElim: s.mejorElim }); CI.recompensaFin(r); return { monedas: m };
}
export function eventoKill(P, w) {
  dar('primera_baja'); if (P.est.elims >= 5) dar('cinco_bajas'); if (w === 'cohete') dar('explosivo'); if (w === 'francotirador' && P.ultKill && P.ultKill.dist > 100) dar('tiro_largo');
}
export function comprar(id) { const p = G.prog, s = SKINS.find((x) => x.id === id); if (!s || p.skins.includes(id) || p.monedas < s.precio) return false; p.monedas -= s.precio; p.skins.push(id); p.skin = id; guardar(); dar('comprador'); return true; }
export function equipar(id) { if (G.prog.skins.includes(id)) { G.prog.skin = id; guardar(); return true; } return false; }
export function exportar() { return btoa(unescape(encodeURIComponent(JSON.stringify(G.prog)))); }
export function importar(t) { try { const o = JSON.parse(decodeURIComponent(escape(atob(t.trim())))); if (!o || typeof o !== 'object' || !Array.isArray(o.skins)) return false; Object.assign(G.prog, { monedas: o.monedas | 0, skins: o.skins.filter((x) => SKINS.some((s) => s.id === x)), skin: o.skin || 'base', logros: o.logros || {}, stats: Object.assign(G.prog.stats, o.stats || {}) }); if (!G.prog.skins.includes('base')) G.prog.skins.push('base'); guardar(); return true; } catch (e) { return false; } }
export function borrarTodo() { G.prog.monedas = 0; G.prog.skins = ['base']; G.prog.skin = 'base'; G.prog.logros = {}; for (const k in G.prog.stats) G.prog.stats[k] = k === 'mejorPuesto' ? 99 : 0; guardar(); }
