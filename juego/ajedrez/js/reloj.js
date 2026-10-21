// =============================================================
//  ⏱  RELOJ DE AJEDREZ
//  Tiempo restante de cada bando, con incremento por jugada. Solo
//  corre el reloj del bando que mueve. No usa el DOM: avisa por
//  callbacks (alCambiar cada ~100 ms mientras corre, alAgotar).
// =============================================================
export class Reloj {
  constructor() {
    this.activo = false;
    this.restante = [0, 0];
    this.inc = 0;
    this.turno = 0;
    this.t0 = 0;
    this.alCambiar = () => {};
    this.alAgotar = () => {};
    this.id = 0;
  }

  configurar(minutos, incSeg) {
    this.detener();
    this.habilitado = minutos > 0;
    this.restante = [minutos * 60000, minutos * 60000];
    this.inc = incSeg * 1000;
    this.alCambiar(this.restante);
  }

  fijar(r) {
    this.restante = [r[0], r[1]];
    this.alCambiar(this.restante);
  }

  // Empieza a contar el turno de "color"
  iniciar(color) {
    if (!this.habilitado) return;
    this.detener();
    this.turno = color;
    this.activo = true;
    this.t0 = performance.now();
    this.id = setInterval(() => this._tick(), 100);
  }

  _tick() {
    const ahora = performance.now();
    this.restante[this.turno] = Math.max(0, this.restante[this.turno] - (ahora - this.t0));
    this.t0 = ahora;
    this.alCambiar(this.restante);
    if (this.restante[this.turno] <= 0) {
      this.detener();
      this.alAgotar(this.turno);
    }
  }

  detener() {
    if (this.activo) {
      this.restante[this.turno] = Math.max(0, this.restante[this.turno] - (performance.now() - this.t0));
    }
    this.activo = false;
    clearInterval(this.id);
  }

  // El bando "color" acaba de mover: se le suma el incremento y corre el otro
  movio(color) {
    if (!this.habilitado) return;
    this.detener();
    this.restante[color] += this.inc;
    this.alCambiar(this.restante);
    this.iniciar(color ^ 1);
  }
}

export function formatoTiempo(ms) {
  const s = Math.ceil(ms / 1000);
  if (ms < 10000 && ms > 0) return `0:${(ms / 1000).toFixed(1).padStart(4, '0')}`;
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
