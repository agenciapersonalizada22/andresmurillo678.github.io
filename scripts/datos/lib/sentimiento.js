'use strict';
// Sentimiento simple por lexicon bilingue (es/en). Devuelve -1..1.
const { sinAcentos } = require('./util');

const POS = {
  // en
  surge: 2, surges: 2, surged: 2, soar: 2, soars: 2, soared: 2, rally: 2, rallies: 2, rallied: 2, gain: 1, gains: 1, gained: 1,
  rise: 1, rises: 1, rose: 1, rising: 1, jump: 1, jumps: 1, jumped: 1, climb: 1, climbs: 1, climbed: 1, up: 0.5, high: 0.5, highs: 1, record: 1.5,
  bullish: 2, boom: 2, breakout: 1.5, beat: 1, beats: 1, growth: 1, grow: 1, grows: 1, profit: 1, profits: 1, profitable: 1,
  strong: 1, stronger: 1, strength: 1, optimism: 1, optimistic: 1, upgrade: 1.5, upgraded: 1.5, approve: 1, approved: 1, approval: 1, win: 1, wins: 1, won: 1, victory: 1.5, champion: 1, champions: 1,
  recover: 1, recovers: 1, recovery: 1, rebound: 1.5, rebounds: 1.5, adoption: 1, partnership: 1, launch: 0.5, launches: 0.5, success: 1, successful: 1, positive: 1, outperform: 1.5, buy: 0.5, milestone: 1,
  // es
  sube: 1, suben: 1, subio: 1, subida: 1, alza: 1.5, alcista: 2, dispara: 2, disparan: 2, disparo: 2, repunta: 1.5, repunte: 1.5, avanza: 1, avance: 1, gana: 1, ganan: 1, ganancia: 1, ganancias: 1, beneficio: 1, beneficios: 1,
  maximo: 1.5, maximos: 1.5, recupera: 1, recuperacion: 1, rebota: 1.5, rebote: 1.5, crecimiento: 1, crece: 1, crecen: 1, fuerte: 1, optimismo: 1, optimista: 1, aprueba: 1, aprobado: 1, aprobacion: 1,
  victoria: 1.5, campeon: 1, triunfo: 1.5, triunfa: 1.5, exito: 1, positivo: 1, positivos: 1, mejora: 1, mejoran: 1, auge: 1.5, asociacion: 1, lanzamiento: 0.5, hito: 1, compra: 0.5
};
const NEG = {
  // en
  plunge: 2, plunges: 2, plunged: 2, crash: 2.5, crashes: 2.5, crashed: 2.5, collapse: 2.5, collapses: 2.5, tumble: 2, tumbles: 2, tumbled: 2, drop: 1, drops: 1, dropped: 1,
  fall: 1, falls: 1, fell: 1, falling: 1, decline: 1, declines: 1, declined: 1, slump: 2, slumps: 2, sink: 1.5, sinks: 1.5, sank: 1.5, down: 0.5, low: 0.5, lows: 1,
  bearish: 2, loss: 1.5, losses: 1.5, lose: 1, loses: 1, lost: 1, weak: 1, weaker: 1, weakness: 1, fear: 1.5, fears: 1.5, panic: 2, selloff: 2, sell: 0.5, dump: 1.5, dumps: 1.5,
  hack: 2, hacked: 2, hacks: 2, exploit: 2, exploited: 2, scam: 2, fraud: 2, lawsuit: 1.5, sue: 1.5, sues: 1.5, sued: 1.5, ban: 1.5, bans: 1.5, banned: 1.5, probe: 1, investigation: 1,
  bankruptcy: 2.5, bankrupt: 2.5, insolvent: 2.5, default: 1.5, recession: 2, inflation: 0.5, crisis: 2, warning: 1, warns: 1, warned: 1, downgrade: 1.5, downgraded: 1.5, miss: 1, misses: 1, missed: 1,
  cut: 0.5, cuts: 0.5, layoffs: 1.5, delay: 1, delays: 1, delayed: 1, defeat: 1.5, defeated: 1.5, injury: 1, injured: 1, concern: 0.5, concerns: 1, risk: 0.5, risks: 0.5, negative: 1, volatile: 0.5, fine: 0.5, fined: 1.5, shutdown: 1.5,
  // es
  cae: 1, caen: 1, cayo: 1, caida: 1.5, caidas: 1.5, desploma: 2.5, desplome: 2.5, hundimiento: 2.5, hunde: 2, derrumba: 2.5, derrumbe: 2.5, baja: 1, bajan: 1, bajista: 2, retroceso: 1, retrocede: 1,
  perdida: 1.5, perdidas: 1.5, pierde: 1, pierden: 1, debil: 1, debilidad: 1, miedo: 1.5, panico: 2, temor: 1, temores: 1, venta: 0.5,
  hackeo: 2, hackean: 2, estafa: 2, fraude: 2, demanda: 1, prohibe: 1.5, prohibicion: 1.5, veta: 1, investigacion: 1, quiebra: 2.5, bancarrota: 2.5, recesion: 2,
  advierte: 1, advertencia: 1, rebaja: 1, recorte: 1, recortes: 1, despidos: 1.5, retraso: 1, retrasa: 1, derrota: 1.5, derrotado: 1.5, lesion: 1, lesionado: 1, preocupacion: 1, preocupa: 1, riesgo: 0.5, riesgos: 0.5,
  negativo: 1, negativos: 1, minimo: 1, minimos: 1, multa: 1.5, multado: 1.5, cierre: 0.5, colapso: 2.5
};
const NEGADORES = new Set(['not', 'no', 'never', 'without', 'nunca', 'sin', 'tampoco', 'nada', "n't", 'ni']);
const FRASES = [
  ['all-time high', 2], ['all time high', 2], ['maximo historico', 2], ['maximos historicos', 2], ['record high', 2],
  ['all-time low', -2], ['minimo historico', -2], ['rate cut', 0.5], ['subida de tipos', -0.5], ['alza de tipos', -0.5], ['rate hike', -0.5],
  ['sell-off', -2], ['sell off', -2], ['short squeeze', 1]
];

function sentimiento(texto) {
  let t = sinAcentos(String(texto || '')).toLowerCase();
  let suma = 0;
  for (const [f, w] of FRASES) {
    if (t.includes(f)) { suma += w; t = t.split(f).join(' '); }
  }
  const toks = t.replace(/n't\b/g, ' not').split(/[^a-z0-9']+/).filter(Boolean);
  let sig = 0;
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i];
    let v = 0;
    if (Object.prototype.hasOwnProperty.call(POS, w)) v = POS[w];
    else if (Object.prototype.hasOwnProperty.call(NEG, w)) v = -NEG[w];
    if (!v) continue;
    const neg = (toks[i - 1] && NEGADORES.has(toks[i - 1])) || (toks[i - 2] && NEGADORES.has(toks[i - 2]));
    suma += neg ? -v * 0.8 : v;
    sig++;
  }
  if (!sig && !suma) return 0;
  return Math.round(Math.tanh(suma / 3) * 100) / 100;
}

module.exports = { sentimiento };
