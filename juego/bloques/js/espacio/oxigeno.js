// =============================================================
//  🫁  OXÍGENO (lógica pura)
//  En la Luna y en la órbita no hay aire. Con el traje espacial en
//  la mochila tienes un tanque que dura unos 3 minutos; sin traje
//  solo unos segundos. Se recarga en un generador de oxígeno, en
//  la Superficie o en el Abismo. En creativo no pasa nada.
// =============================================================
export const TANQUE = 100;
export const DRENAJE_TRAJE = 0.55;   // por segundo (≈ 3 minutos)
export const DRENAJE_SIN_TRAJE = 4;  // por segundo (≈ 25 segundos)
export const RECARGA = 30;           // por segundo
export const DANO_ASFIXIA = 2;       // vida cada ASFIXIA_CADA segundos con el tanque vacío
export const ASFIXIA_CADA = 1.2;

export function nuevoOxigeno() { return { o2: TANQUE, t: 0 }; }

// e: estado { o2, t }; c: { respirable, traje, creativo, generador (bool), enAgua }
// Devuelve el daño que hay que aplicar en este paso (0 si ninguno)
export function pasoOxigeno(e, dt, c) {
  if (c.creativo || c.respirable || c.generador) {
    e.o2 = Math.min(TANQUE, e.o2 + RECARGA * dt);
    e.t = 0;
    return 0;
  }
  e.o2 = Math.max(0, e.o2 - (c.traje ? DRENAJE_TRAJE : DRENAJE_SIN_TRAJE) * dt);
  if (e.o2 > 0) { e.t = 0; return 0; }
  e.t += dt;
  if (e.t >= ASFIXIA_CADA) { e.t = 0; return DANO_ASFIXIA; }
  return 0;
}

export const segundosRestantes = (e, traje) => Math.round(e.o2 / (traje ? DRENAJE_TRAJE : DRENAJE_SIN_TRAJE));
