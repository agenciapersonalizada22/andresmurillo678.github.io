// Tormenta determinista por semilla y tiempo de partida: todos los equipos calculan lo mismo sin sincronizar mas que el reloj.
import { rng } from './util.js';
import { R_ISLA } from './terreno.js';
export const FASES = [{ esp: 75, cie: 45, r: 300, d: 1 }, { esp: 50, cie: 35, r: 190, d: 2 }, { esp: 40, cie: 30, r: 110, d: 4 }, { esp: 30, cie: 25, r: 55, d: 6 }, { esp: 25, cie: 20, r: 20, d: 8 }, { esp: 15, cie: 15, r: 0, d: 10 }];
export const T_INI = 45;
export function crearTormenta(sem) {
  const R = rng(sem * 31 + 7), cs = [{ x: 0, z: 0, r: 520 }];
  FASES.forEach((f, k) => {
    const p = cs[k], a = R() * 6.283, d = Math.sqrt(R()) * Math.max(0, p.r - f.r) * 0.8;
    let x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d; const lim = R_ISLA * 0.55, h = Math.hypot(x, z); if (h > lim) { x *= lim / h; z *= lim / h; }
    cs.push({ x, z, r: f.r });
  });
  const total = T_INI + FASES.reduce((s, f) => s + f.esp + f.cie, 0);
  return {
    centros: cs, total,
    estado(t) {
      if (t < T_INI) return { fase: -1, modo: 'espera', resto: T_INI - t, cx: cs[0].x, cz: cs[0].z, r: cs[0].r, dano: 0, prox: cs[1] };
      let tt = t - T_INI;
      for (let k = 0; k < FASES.length; k++) {
        const f = FASES[k];
        if (tt < f.esp) return { fase: k, modo: 'espera', resto: f.esp - tt, cx: cs[k].x, cz: cs[k].z, r: cs[k].r, dano: f.d, prox: cs[k + 1] };
        tt -= f.esp;
        if (tt < f.cie) { const u = tt / f.cie, a = cs[k], b = cs[k + 1]; return { fase: k, modo: 'cierra', resto: f.cie - tt, cx: a.x + (b.x - a.x) * u, cz: a.z + (b.z - a.z) * u, r: a.r + (b.r - a.r) * u, dano: f.d, prox: b }; }
        tt -= f.cie;
      }
      const l = cs[cs.length - 1]; return { fase: FASES.length, modo: 'final', resto: 0, cx: l.x, cz: l.z, r: 0, dano: 10, prox: l };
    }
  };
}
