// Monedero local del dispositivo (fichas virtuales; nunca dinero real).
import * as A from './almacen.js';
import * as E from './economia.js';
import * as Pro from './progreso.js';

let m = null;
const cargar = () => (m = m || A.monedero.obtener());
const guardar = () => { A.monedero.guardar(m); Pro.revisarMonedero(m.saldo); };
export const Cartera = {
  saldo() { return cargar().saldo; },
  datos() { return cargar(); },
  debitar(n, txt) { cargar(); const ok = E.debitar(m, n, txt, Date.now()); if (ok) guardar(); return ok; },
  acreditar(n, txt) { cargar(); E.acreditar(m, n, txt, Date.now()); guardar(); },
  puedeRegalo() { return E.puedeRegalo(cargar(), Date.now()) && A.ajustes.obtener().economia.regalo > 0; },
  regalo() { cargar(); const g = E.reclamarRegalo(m, Date.now(), A.ajustes.obtener().economia.regalo); if (g) guardar(); return g; },
  reiniciar() { m = E.monederoNuevo(A.ajustes.obtener().economia.inicial); guardar(); },
  recargar() { m = null; },
};
