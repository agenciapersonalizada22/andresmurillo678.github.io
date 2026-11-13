// Pistas progresivas y resolucion paso a paso sobre el estado de una partida.
import { crearSt, siguientePaso, aplicar, resuelto, contradiccion } from './tecnicas.js';
import { valoresSanos, candidatos, snap, poner, esDado } from './partida.js';
import { nombreCelda } from './variantes.js';

export function estadoDe(p) {
  const st = crearSt(p.M, valoresSanos(p), p.sol);
  for (let i = 0; i < p.N; i++) if (st.v[i] === 0) st.c[i] &= ~p.elim[i];
  return st;
}
/* Primer paso de pista para la partida: error propio, paso logico o null si ya esta resuelta. */
export function pasoDePista(p) {
  for (let i = 0; i < p.N; i++) {
    if (p.v[i] && !esDado(p, i) && p.v[i] !== p.sol[i]) {
      const c = nombreCelda(p.M, i);
      return { tec: 'error', titulo: 'Revisa tu tablero', error: i, celdas: [i], borrar: [i],
        pista1: 'Hay un número mal colocado en el tablero. Revisa lo último que escribiste.',
        pista2: `El número de ${c} no es correcto.`,
        texto: `El ${p.v[i]} de ${c} no es correcto. Bórralo y vuelve a intentarlo.` };
    }
  }
  const st = estadoDe(p);
  if (resuelto(st)) return null;
  return siguientePaso(st);
}
export function aplicarPista(p, paso, { autoquitar = true } = {}) {
  snap(p);
  if (paso.borrar) paso.borrar.forEach((i) => { p.v[i] = 0; p.notas[i] = 0; });
  (paso.col || []).forEach((x) => poner(p, x.i, x.d, { autoquitar, sinSnap: true }));
  (paso.eli || []).forEach((x) => {
    p.elim[x.i] |= x.m;
    if (p.v[x.i] === 0) p.notas[x.i] = (p.notas[x.i] === 0 ? candidatos(p, x.i) : p.notas[x.i]) & ~x.m;
  });
}

/* Resolucion paso a paso: lista de instantaneas {v, c, paso} partiendo del estado indicado. */
export function crearResolucion(p) {
  const st = estadoDe(p), hist = [{ v: st.v.slice(), c: st.c.slice(), paso: null }];
  return {
    st, hist, pos: 0,
    get listo() { return resuelto(st) || contradiccion(st); },
    siguiente() {
      if (this.pos < hist.length - 1) { this.pos++; return hist[this.pos]; }
      if (this.listo) return null;
      const paso = siguientePaso(st);
      if (!paso) return null;
      aplicar(st, paso);
      hist.push({ v: st.v.slice(), c: st.c.slice(), paso, previo: hist[hist.length - 1] });
      this.pos = hist.length - 1;
      return hist[this.pos];
    },
    anterior() { if (this.pos > 0) this.pos--; return hist[this.pos]; },
    get actual() { return hist[this.pos]; }
  };
}
