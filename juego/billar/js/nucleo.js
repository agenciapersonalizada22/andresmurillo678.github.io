// Flujo de un tiro sin DOM: aplica la blanca en mano, golpea, (simula), resuelve reglas y repone bolas. Lo usan el juego, el anfitrion y las pruebas.
import { bola, golpear, simular } from './fisica.js';
import { analizar, resolver, reponer, idBlanca } from './reglas.js';

export function iniciarTiro(S, E, t) {
  const id = idBlanca(E), c = bola(S, id);
  if (t.mano && E.mano) { c.x = t.mano.x; c.y = t.mano.y; }
  golpear(S, id, t.ang, t.pot, t.a || 0, t.b || 0);
  S.ev = [];
  return id;
}
export function terminarTiro(S, E, id) {
  const an = analizar(S.ev, id);
  const r = resolver(E, an);
  reponer(S, r.E, r.info);
  return { E: r.E, info: r.info, an, ev: S.ev };
}
export function jugarTiro(S, E, t) {
  const id = iniciarTiro(S, E, t);
  simular(S, { maxT: 90 });
  return terminarTiro(S, E, id);
}
