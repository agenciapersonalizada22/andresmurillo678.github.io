// Persistencia local: todo con try/catch y claves propias. Progreso (sincronizable) y ajustes (por dispositivo) van en claves distintas.
import { gratis, equipoInicial } from './economia.js';
export const K = { prog: 'pingpong_progreso', ajustes: 'pingpong_ajustes_dispositivo', partida: 'pingpong_partida', tutorial: 'pingpong_tutorial', asiento: 'pingpong_asiento' };
export const leer = (k, def = null) => { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } };
export const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
export const borrar = (k) => { try { localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } };

export const progresoNuevo = () => ({
  v: 1, monedas: 60, totalMonedas: 0, poseidos: gratis(), equipo: equipoInicial(), logros: {}, torneo: null,
  stats: { partidos: 0, victorias: 0, derrotas: 0, puntosGanados: 0, puntosPerdidos: 0, aces: 0, rallyMax: 0, retoMax: 0, racha: 0, mejorRacha: 0, torneos: 0, golpes: 0, aciertosEntreno: 0, rachaEntreno: 0, onlineVictorias: 0, onlinePartidos: 0, dobles: 0, compras: 0, victoriasDif: 0, tiempo: 0 }
});
export function normalizarProgreso(o) {
  const b = progresoNuevo();
  if (!o || typeof o !== 'object') return b;
  const p = Object.assign(b, o);
  p.stats = Object.assign(progresoNuevo().stats, o.stats || {});
  p.poseidos = { mesas: [...new Set([...(o.poseidos && o.poseidos.mesas || []), 'azul'])], paletas: [...new Set([...(o.poseidos && o.poseidos.paletas || []), 'clasica'])], salas: [...new Set([...(o.poseidos && o.poseidos.salas || []), 'gimnasio'])] };
  p.equipo = Object.assign(equipoInicial(), o.equipo || {});
  if (!p.poseidos.mesas.includes(p.equipo.mesa)) p.equipo.mesa = 'azul';
  if (!p.poseidos.paletas.includes(p.equipo.paleta)) p.equipo.paleta = 'clasica';
  if (!p.poseidos.salas.includes(p.equipo.sala)) p.equipo.sala = 'gimnasio';
  p.logros = o.logros && typeof o.logros === 'object' ? o.logros : {};
  p.monedas = Math.max(0, Math.floor(+p.monedas || 0));
  return p;
}
export const cargarProgreso = () => normalizarProgreso(leer(K.prog));
export const guardarProgreso = (p) => escribir(K.prog, p);
