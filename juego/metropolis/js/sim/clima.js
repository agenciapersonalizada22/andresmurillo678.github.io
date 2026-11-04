// Estaciones y clima: efectos sobre producción, consumo y tráfico.
import { DIAS_ESTACION } from './datos.js';

export const estacion = (c) => Math.floor((c.t.dia - 1) / DIAS_ESTACION) % 4;

const SOLAR = { despejado: 1, nublado: 0.6, lluvia: 0.35, tormenta: 0.2, nieve: 0.3 };
const TRAF = { despejado: 1, nublado: 1, lluvia: 1.12, tormenta: 1.22, nieve: 1.3 };

export function factoresClima(c) {
  const e = estacion(c), t = c.clima.tipo;
  return {
    solar: SOLAR[t] || 1, eolica: t === 'tormenta' ? 1.3 : t === 'despejado' ? 1 : 0.9,
    agua: t === 'lluvia' || t === 'tormenta' ? 1.15 : e === 1 ? 0.9 : 1,
    demE: e === 3 ? 1.15 : e === 1 ? 1.05 : 1, demA: e === 1 ? 1.2 : 1, trafico: TRAF[t] || 1,
  };
}

// Transición del clima cada hora de juego (usa el azar de la ciudad para ser reproducible).
export function pasoClima(c, azar) {
  const k = c.clima, e = estacion(c);
  k.horas--;
  if (k.tipo === 'lluvia' || k.tipo === 'tormenta') k.lluvia++; else k.lluvia = Math.max(0, k.lluvia - 2);
  if (k.horas > 0) return false;
  const r = azar(c);
  let t;
  if (e === 3) t = r < 0.35 ? 'nieve' : r < 0.6 ? 'nublado' : r < 0.68 ? 'tormenta' : 'despejado';
  else if (e === 1) t = r < 0.55 ? 'despejado' : r < 0.75 ? 'nublado' : r < 0.9 ? 'lluvia' : 'tormenta';
  else t = r < 0.35 ? 'despejado' : r < 0.6 ? 'nublado' : r < 0.9 ? 'lluvia' : 'tormenta';
  const cambio = t !== k.tipo;
  k.tipo = t; k.horas = 5 + Math.floor(azar(c) * 14);
  return cambio;
}
