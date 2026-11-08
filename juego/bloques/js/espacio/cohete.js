// =============================================================
//  🚀  COHETE (lógica pura)
//  Se ensambla por etapas en una plataforma: estructura, motores,
//  combustible y cabina (en ese orden). Al lanzar hay cuenta
//  regresiva, ignición, ascenso, separación de la primera etapa
//  (motores + tanques) y llegada a la órbita. La altura sale solo
//  del tiempo, así todos los jugadores ven el mismo despegue.
// =============================================================
export const ETAPAS = ['estructura', 'motores', 'combustible', 'cabina'];
export const ITEM_ETAPA = { estructura: 'cohete_estructura', motores: 'cohete_motores', combustible: 'cohete_combustible', cabina: 'cohete_cabina' };
export const NOMBRE_ETAPA = { estructura: 'Estructura', motores: 'Motores', combustible: 'Combustible', cabina: 'Cabina' };

export const T_CUENTA = 10;       // segundos de cuenta regresiva
export const T_IGNICION = 3;      // cuántos segundos antes del 0 se enciende el humo
export const T_SEPARACION = 11;  // segundos después del despegue
export const ALT_ORBITA = 420;    // bloques sobre la plataforma
const A1 = 2.2, A2 = 4.5;         // aceleraciones de cada etapa

export const siguienteEtapa = (etapas) => ETAPAS[etapas.length] || null;
export const completo = (etapas) => etapas.length === ETAPAS.length;
export const etapasValidas = (lista) => Array.isArray(lista) && lista.every((e, i) => e === ETAPAS[i]) && lista.length <= ETAPAS.length;

// Altura sobre la plataforma t segundos después del despegue (t < 0: en tierra)
export function altura(t) {
  if (t <= 0) return 0;
  if (t <= T_SEPARACION) return 0.5 * A1 * t * t;
  const y1 = 0.5 * A1 * T_SEPARACION * T_SEPARACION, v1 = A1 * T_SEPARACION, d = t - T_SEPARACION;
  return y1 + v1 * d + 0.5 * A2 * d * d;
}
export function velocidad(t) {
  if (t <= 0) return 0;
  if (t <= T_SEPARACION) return A1 * t;
  return A1 * T_SEPARACION + A2 * (t - T_SEPARACION);
}
// Segundos hasta llegar a la órbita
export const T_ORBITA = (() => { let t = T_SEPARACION; while (altura(t) < ALT_ORBITA) t += 0.01; return t; })();

// Fase del vuelo según el tiempo respecto al 0 (negativo = antes del despegue)
export function fase(t) {
  if (t < -T_IGNICION) return 'cuenta';
  if (t < 0) return 'ignicion';
  if (t < T_SEPARACION) return 'ascenso1';
  if (t < T_SEPARACION + 1.2) return 'separacion';
  if (altura(t) < ALT_ORBITA) return 'ascenso2';
  return 'orbita';
}

// Cuánto vibra la cámara (0 a 1)
export function vibracion(t) {
  const f = fase(t);
  if (f === 'cuenta') return 0;
  if (f === 'ignicion') return 0.25 + 0.35 * (1 + t / T_IGNICION);
  if (f === 'ascenso1') return Math.max(0.45, 1 - t / 14);
  if (f === 'separacion') return 0.9;
  if (f === 'ascenso2') return 0.35;
  return 0;
}

export const textoCuenta = (t) => (t >= 0 ? 'DESPEGUE' : String(Math.ceil(-t)));

// 0 = Superficie, 1 = espacio: cuánto se oscurece el cielo según la altura absoluta (sobre el nivel del mar)
export const oscuridadCielo = (yAbs) => { const t = Math.max(0, Math.min(1, (yAbs - 120) / 180)); return t * t * (3 - 2 * t); };
