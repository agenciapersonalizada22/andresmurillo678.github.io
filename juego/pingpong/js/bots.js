// Rivales bot (puros): 4 dificultades x 5 estilos. Deciden el golpe (potencia, efecto, direccion); la fisica y la calidad las resuelve el juego.
export const crearRng = (semilla = 1) => { let a = semilla >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
export const gauss = (rng) => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

export const DIFICULTADES = {
  facil: { nombre: 'Fácil', sigma: 0.26, vmax: 2.3, reaccion: 0.36, potMax: 0.55, agresion: 0.5, smash: 0, timing: 0.28, giro: 0.35 },
  normal: { nombre: 'Normal', sigma: 0.15, vmax: 3.1, reaccion: 0.25, potMax: 0.75, agresion: 0.8, smash: 0.35, timing: 0.18, giro: 0.6 },
  dificil: { nombre: 'Difícil', sigma: 0.085, vmax: 4.1, reaccion: 0.16, potMax: 0.92, agresion: 1, smash: 0.7, timing: 0.1, giro: 0.85 },
  experto: { nombre: 'Experto', sigma: 0.04, vmax: 5.2, reaccion: 0.09, potMax: 1, agresion: 1.1, smash: 0.95, timing: 0.05, giro: 1 }
};
export const ESTILOS = {
  equilibrado: { nombre: 'Equilibrado', ataque: 0.4, corte: 0.15, top: 0.6, lateral: 0.2, colocacion: 0.5 },
  atacante: { nombre: 'Atacante', ataque: 0.75, corte: 0.04, top: 0.9, lateral: 0.15, colocacion: 0.55 },
  defensor: { nombre: 'Defensor', ataque: 0.1, corte: 0.6, top: 0.3, lateral: 0.1, colocacion: 0.35 },
  efectos: { nombre: 'Efectos', ataque: 0.35, corte: 0.2, top: 0.7, lateral: 0.8, colocacion: 0.6 },
  bloqueador: { nombre: 'Bloqueador', ataque: 0.15, corte: 0.1, top: 0.2, lateral: 0.1, colocacion: 0.9 }
};
export const lerp = (a, b, t) => a + (b - a) * t;

export class Bot {
  constructor(dif = 'normal', estilo = 'equilibrado', rng = Math.random, lado = -1) {
    this.dif = DIFICULTADES[dif] || DIFICULTADES.normal; this.est = ESTILOS[estilo] || ESTILOS.equilibrado; this.rng = rng; this.lado = lado;
    this.vmax = this.dif.vmax; this.reaccion = this.dif.reaccion; this.sigma = this.dif.sigma;
    this.px = 0; this.retardoTimbre = 0; this.dzGolpe = 0.35;
  }
  nuevaPelota() { this.dzGolpe = 0.35 + (this.rng() - 0.5) * 2 * this.dif.timing; }
  /* Decide el golpe de rally. ctx: {h (altura sobre la mesa), rivalX, racha (golpes del rally)} */
  golpe(ctx) {
    const r = this.rng, d = this.dif, e = this.est;
    let power, top, curva = 0;
    if (ctx.h > 0.3 && r() < d.smash * (0.4 + e.ataque)) { power = 0.88 + 0.12 * r(); top = 0.15; }
    else {
      const u = r();
      if (u < e.ataque * d.agresion) { power = lerp(0.5, d.potMax, r()); top = lerp(0.4, 0.95, r()) * e.top * d.giro + 0.15; }
      else if (u < e.ataque * d.agresion + e.corte) { power = lerp(0.15, 0.4, r()); top = -lerp(0.5, 0.9, r()) * d.giro; }
      else { power = lerp(0.3, Math.min(0.6, d.potMax), r()); top = lerp(0.1, 0.5, r()) * d.giro; }
    }
    if (r() < e.lateral * d.giro) curva = (r() < 0.5 ? -1 : 1) * lerp(0.4, 0.9, r());
    const rx = ctx.rivalX || 0, lado = Math.abs(rx) < 0.12 ? (r() < 0.5 ? -1 : 1) : -Math.sign(rx);
    const aimX = Math.max(-0.66, Math.min(0.66, lado * (0.18 + 0.48 * e.colocacion * r()) + (r() - 0.5) * 0.16));
    return { aimX, power: Math.min(1, power), top: Math.max(-1, Math.min(1, top)), curva, sigma: this.sigma };
  }
  saque(ctx) {
    const r = this.rng, e = this.est;
    const lado = ctx && ctx.mitad ? ctx.mitad : (r() < 0.5 ? -1 : 1);
    const spinCorte = r() < e.corte + 0.2;
    return { aimX: lado * (0.15 + 0.45 * r()), power: lerp(0.25, 0.55, r()), top: spinCorte ? -0.6 : lerp(0.1, 0.5, r()) * this.dif.giro, curva: r() < e.lateral ? (r() < 0.5 ? -0.7 : 0.7) : 0, sigma: this.sigma * 0.6 };
  }
}
