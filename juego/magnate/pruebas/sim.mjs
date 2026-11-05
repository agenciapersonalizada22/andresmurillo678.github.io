// Simulador de partidas completas entre bots (sin DOM). Uso: node sim.mjs [partidas] [semilla]
import { crearPartida, aplicar, revisar, quienActua, clonar } from '../js/reglas.js';
import { decidir, aceptaTrato } from '../js/bots.js';

export function pasoBot(e) {
  if (e.trato && e.jug[e.trato.a].tipo === 'bot') return [e.trato.a, { t: 'tratoResponder', ok: !!aceptaTrato(e, e.trato.a) }];
  const j = quienActua(e);
  return [j, decidir(e, j)];
}
export function jugar(cfg, niveles, semilla, opts = {}) {
  const e = crearPartida(cfg, niveles.map((n, i) => ({ nombre: 'B' + i, color: '#fff', tipo: 'bot', nivel: n })), semilla);
  const est = { pasos: 0, quiebras: 0, subastas: 0, tratos: 0, cartas: 0, carcel: 0, hipotecas: 0, construcciones: 0, hoteles: 0, dobles3: 0 };
  let guard = 0;
  while (e.fase !== 'fin_partida') {
    if (++guard > 60000) throw new Error('bloqueo: demasiados pasos ' + e.fase + ' turno ' + e.turnoN);
    const [j, acc] = pasoBot(e);
    if (!acc) throw new Error('bot sin accion en fase ' + e.fase);
    e.tiempoMs += 4000;
    const antes = opts.clonarCada && guard % opts.clonarCada === 0 ? clonar(e) : null;
    const r = aplicar(e, j, acc);
    if (!r.ok) throw new Error('accion invalida de bot: ' + JSON.stringify(acc) + ' -> ' + r.error + ' fase ' + e.fase);
    for (const v of r.ev) { if (v.t === 'quiebra') est.quiebras++; if (v.t === 'subasta') est.subastas++; if (v.t === 'trato') est.tratos++; if (v.t === 'carta') est.cartas++; if (v.t === 'hipoteca' && v.h) est.hipotecas++; if (v.t === 'construir' && !v.vende) { est.construcciones++; if (v.c === 5) est.hoteles++; } if (v.t === 'salto' && v.a === 10) est.carcel++; }
    const err = revisar(e);
    if (err.length) throw new Error('estado invalido: ' + err.join('; ') + ' tras ' + JSON.stringify(acc));
    if (antes) { const s = JSON.stringify(e); if (JSON.stringify(clonar(JSON.parse(s))) !== s) throw new Error('serializacion inestable'); }
    est.pasos++;
  }
  return { e, est };
}
if (process.argv[1] && process.argv[1].endsWith('sim.mjs')) {
  const N = +process.argv[2] || 200, S = +process.argv[3] || 1;
  const t0 = Date.now(); const tot = {}; let naturales = 0, turnos = 0, ganaNivel = [0, 0, 0, 0];
  for (let k = 0; k < N; k++) {
    const n = 2 + (k % 5), niv = Array.from({ length: n }, (_, i) => (k + i) % 3);
    const cfg = { limiteTurnos: 600, bote: k % 2 === 0, bonoSalida: k % 3 === 0, construccionPareja: k % 4 !== 3, subastaObligatoria: k % 5 !== 4, sinRentaCarcel: k % 6 === 1, hipotecaMitad: k % 7 !== 6, dineroInicial: [1000, 1500, 2000][k % 3] };
    const { e, est } = jugar(cfg, niv, S * 100003 + k);
    if (e.motivoFin === 'ultimo') naturales++;
    turnos += e.turnoN; ganaNivel[e.jug[e.ganador].nivel]++;
    for (const x in est) tot[x] = (tot[x] || 0) + est[x];
  }
  console.log({ partidas: N, naturales, turnosMedios: Math.round(turnos / N), ganaNivel, ms: Date.now() - t0, ...tot });
}
