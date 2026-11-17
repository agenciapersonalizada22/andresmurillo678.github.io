// =============================================================
//  🧪  SUPERVIVENCIA EN OTROS MUNDOS (lógica pura)
//  Temperatura, radiación y presión/ácido se compensan con tres
//  mejoras del traje espacial (niveles 0 a 3). Las protecciones usan
//  la energía del traje: si se acaba, valen cero hasta recargarla
//  (generador de oxígeno / cargador cerca, o una batería).
//  El oxígeno sigue en oxigeno.js. En creativo no pasa nada.
// =============================================================
import { hash2 } from '../ruido.js';

export const NIV_MAX = 3;
export const ENERGIA_MAX = 100;
export const GASTO_NIVEL = 0.11;        // energía por segundo y por nivel de protección en uso
export const RECARGA_ENERGIA = 8;       // por segundo en un refugio (base, estación, generador)
export const PILA_ENERGIA = 40;         // lo que da una batería de iones
export const TICK = 1.5;                // segundos entre daños
const PESO = { t: 1.5, r: 1.3, p: 2 };  // daño por nivel que falta
export const DANO_MAX = 8;

export const nuevoTraje = () => ({ t: 0, r: 0, p: 0 });
export const nuevaEnergia = () => ({ e: ENERGIA_MAX, tick: 0, exposicion: 0 });
export const trajeValido = (o) => {
  const r = nuevoTraje();
  if (o && typeof o === 'object') for (const k of ['t', 'r', 'p']) if (Number.isFinite(o[k])) r[k] = Math.max(0, Math.min(NIV_MAX, Math.floor(o[k])));
  return r;
};

// Nivel de protección térmica que pide una temperatura (°C)
export const nivelTermico = (T) => (T >= 300 || T <= -200 ? 3 : T >= 120 || T <= -120 ? 2 : T >= 50 || T <= -40 ? 1 : 0);

// Temperatura según haya Sol sobre el horizonte (solY > 0) o no
export function temperatura(amb, solY) {
  if (!amb) return 20;
  const t = Math.max(0, Math.min(1, (solY + 0.05) / 0.2));
  return amb.temp[1] + (amb.temp[0] - amb.temp[1]) * t;
}

// Niveles de traje que pide este lugar ahora mismo
export function requisitos(amb, solY) {
  if (!amb) return { t: 0, r: 0, p: 0 };
  return { t: Math.min(amb.req.t, nivelTermico(temperatura(amb, solY))), r: amb.req.r, p: amb.req.p };
}

// Cuánto falta (por tipo) dado el traje y si tiene energía
export function faltantes(req, traje, conEnergia) {
  const n = (k) => Math.max(0, req[k] - (conEnergia ? traje[k] : 0));
  return { t: n('t'), r: n('r'), p: n('p') };
}

// Un paso de la simulación.
// c: { creativo, refugio, traje (tiene el traje espacial), solY, tormenta (0..1) }
// Devuelve { danio, causa, falta:{t,r,p}, req, protegido, temp }
export function paso(e, dt, amb, niveles, c) {
  const res = { danio: 0, causa: '', falta: { t: 0, r: 0, p: 0 }, req: { t: 0, r: 0, p: 0 }, protegido: true, temp: temperatura(amb, c.solY) };
  if (!amb) { e.tick = 0; e.e = Math.min(ENERGIA_MAX, e.e + RECARGA_ENERGIA * dt); return res; }
  if (c.creativo || c.refugio) { e.e = Math.min(ENERGIA_MAX, e.e + RECARGA_ENERGIA * dt); e.tick = 0; e.exposicion = 0; return res; }
  const req = requisitos(amb, c.solY);
  res.req = req;
  const lv = c.traje ? niveles : nuevoTraje();
  const conEnergia = c.traje && e.e > 0;
  let usados = 0;
  for (const k of ['t', 'r', 'p']) usados += Math.min(req[k], lv[k]);
  if (conEnergia) e.e = Math.max(0, e.e - usados * GASTO_NIVEL * (1 + 0.5 * (c.tormenta || 0)) * dt);
  const f = faltantes(req, lv, conEnergia);
  res.falta = f;
  res.protegido = f.t + f.r + f.p === 0;
  if (res.protegido) { e.tick = 0; e.exposicion = Math.max(0, e.exposicion - dt); return res; }
  e.exposicion += dt;
  e.tick += dt;
  if (e.tick >= TICK) {
    e.tick = 0;
    res.danio = Math.min(DANO_MAX, Math.ceil(f.t * PESO.t + f.r * PESO.r + f.p * PESO.p));
    res.causa = f.p >= f.t && f.p >= f.r && f.p > 0 ? (amb.pres > 10 ? 'acido' : 'presion') : f.r >= f.t && f.r > 0 ? 'radiacion' : (res.temp > 0 ? 'calor' : 'frio');
  }
  return res;
}

// Recibe la mejora: sube el nivel pidiendo (nivel actual + 1) piezas. Devuelve { ok, costo, nuevo }
export function mejorar(niveles, tipo) {
  const n = niveles[tipo];
  if (n >= NIV_MAX) return { ok: false, costo: 0, nuevo: n };
  return { ok: true, costo: n + 1, nuevo: n + 1 };
}

// ---- tormentas (polvo en Marte, rayos en Júpiter): intensidad 0 a 1 determinista por día
export function intensidadTormenta(tipo, diaAbs, semilla = 0) {
  if (!tipo) return 0;
  const largo = tipo === 'polvo' ? 1.5 : 0.6;
  const slot = Math.floor(diaAbs / largo), t = (diaAbs / largo) - slot;
  if (hash2(slot, 7, semilla ^ 0x7015) > (tipo === 'polvo' ? 0.3 : 0.5)) return 0;
  return Math.sin(Math.PI * t) ** 0.7;
}
// Rayos: probabilidad por segundo de que caiga uno cerca si estás a la intemperie
export const probRayo = (intensidad, expuesto) => (expuesto ? 0.07 * intensidad : 0);
export const DANO_RAYO = 4;
