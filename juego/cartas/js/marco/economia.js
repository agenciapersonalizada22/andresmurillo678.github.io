// Economia virtual: SOLO fichas ficticias, nunca dinero real. Funciones puras (sin DOM).
export const MULT_CIEGAS = [1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128];
export function ciegasNivel(sb, bb, nivel) {
  const m = MULT_CIEGAS[Math.min(nivel, MULT_CIEGAS.length - 1)] * (nivel >= MULT_CIEGAS.length ? 2 ** (nivel - MULT_CIEGAS.length + 1) : 1);
  return { sb: Math.max(1, Math.round(sb * m)), bb: Math.max(2, Math.round(bb * m)) };
}
// nivel de ciegas segun escalado: tipo 'manos' (cada N manos jugadas) o 'min' (cada N minutos reales)
export function nivelEscalado(esc, manosJugadas, msTranscurridos) {
  if (!esc || !esc.tipo || !(esc.cada > 0)) return 0;
  if (esc.tipo === 'manos') return Math.floor(manosJugadas / esc.cada);
  if (esc.tipo === 'min') return Math.floor(msTranscurridos / (esc.cada * 60000));
  return 0;
}
export function limitesCompra(cfg) {
  const min = Math.max(1, cfg.compraMin | 0), max = Math.max(min, cfg.compraMax | 0);
  return { min, max: cfg.tope > 0 ? Math.min(max, cfg.tope) : max };
}
export function validarCompra(cfg, monto, saldo) {
  const l = limitesCompra(cfg); monto = Math.floor(+monto || 0);
  if (monto < l.min) return { ok: false, error: 'La entrada minima es ' + l.min };
  if (monto > l.max) return { ok: false, error: 'La entrada maxima es ' + l.max };
  if (monto > saldo) return { ok: false, error: 'No tienes suficientes fichas (' + saldo + ')' };
  return { ok: true, monto };
}
// ---- monedero local por dispositivo ----
// Valores de referencia de la economia: por encima de ellos el monedero/la mesa NO cuentan para el ranking de la plataforma.
export const REF = { inicial: 5000, regalo: 500, fichasBots: 1000 };
export function monederoNuevo(inicial) { return { saldo: inicial, inicial, regalo: '', recibidos: 0, historial: [], exceso: 0 }; }
// monedero que empezo con mas fichas de las de referencia: no entra al ranking hasta reiniciarlo con las fichas por defecto (o menos)
export const monederoInflado = (m) => (+m.inicial || 0) > REF.inicial;
// fichas del saldo que vienen de fuentes no clasificables (regalo superior al de referencia, mesas con fichas de bots extra)
export function sumarExceso(m, delta) { m.exceso = Math.max(0, Math.round((+m.exceso || 0) + delta)); }
export const valorRanking = (m) => (monederoInflado(m) ? 0 : Math.max(0, Math.floor(m.saldo - (+m.exceso || 0))));
// mesa clasificable: las fichas de los bots (o de torneo) no superan la referencia
export const mesaLimpia = (cfg) => !(cfg && +cfg.fichasIni > REF.fichasBots);
// reglas estandar: todas las opciones del juego (salvo las de apuestas) en su valor por defecto
export function opcionesEstandar(opciones, op) {
  return (opciones || []).every((o) => o.grupo === 'Apuestas' || !op || op[o.id] === undefined || JSON.stringify(op[o.id]) === JSON.stringify(o.def));
}
const dia = (ms) => { const d = new Date(ms); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
export function puedeRegalo(m, ahora) { return m.regalo !== dia(ahora); }
export function reclamarRegalo(m, ahora, monto) {
  if (!(monto > 0) || !puedeRegalo(m, ahora)) return 0;
  m.regalo = dia(ahora); m.saldo += monto; m.recibidos = (m.recibidos || 0) + monto; if (monto > REF.regalo) sumarExceso(m, monto - REF.regalo); nota(m, 'Regalo diario', monto, ahora); return monto;
}
export function nota(m, txt, delta, ahora) { m.historial.push({ t: ahora, txt, d: delta, s: m.saldo }); if (m.historial.length > 60) m.historial.splice(0, m.historial.length - 60); }
export function debitar(m, n, txt, ahora) { n = Math.floor(n); if (n <= 0 || n > m.saldo) return false; m.saldo -= n; nota(m, txt, -n, ahora); return true; }
export function acreditar(m, n, txt, ahora) { n = Math.floor(n); if (n <= 0) return; m.saldo += n; nota(m, txt, n, ahora); }
// ---- resultados de sesion ----
export function tablaSesion(asientos, stacks) {
  return asientos.map((a, i) => {
    const en = stacks[i] || 0, neto = en + (a.cobrado || 0) - (a.compras || 0);
    return { i, nombre: a.nombre, color: a.color, tipo: a.tipo, compras: a.compras || 0, fichas: en, cobrado: a.cobrado || 0, neto, manosGanadas: a.ganadas || 0 };
  });
}
export function agregarHistorial(h, entrada, max = 200) { h.push(entrada); if (h.length > max) h.splice(0, h.length - max); return h; }
