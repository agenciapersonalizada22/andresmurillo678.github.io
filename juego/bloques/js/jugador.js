// =============================================================
//  🧍  EL JUGADOR (física)
//  El jugador es una "caja" invisible de 0.6 x 1.8 bloques.
//  Cada cuadro: se aplica la gravedad, se lee hacia dónde quieres
//  caminar y se mueve la caja un eje a la vez (X, luego Y, luego Z).
//  Si al moverse se mete en un bloque sólido, se regresa justo a
//  la orilla. Así nunca atraviesas paredes ni el suelo.
// =============================================================
import { CONFIG } from './config.js';
import { DIBUJO, DIBUJO_AGUA, SOLIDO } from './bloques.js';
import { ALTO } from './generador.js';

const J = CONFIG.jugador;
const EPS = 1e-4;

export class Jugador {
  constructor() {
    this.x = 0.5; this.y = 80; this.z = 0.5;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = 0;      // girar a los lados
    this.pitch = 0;    // ver arriba/abajo
    this.volando = false;
    this.enSuelo = false;
    this.enAgua = false;
    this.cabezaEnAgua = false;
    this.chocoLado = false;
    this.corriendo = false;
    this.gravMul = 1;   // gravedad de la dimensión (Luna 0.165, órbita 0 = flotando)
    this.distanciaPasos = 0;
    this.eventos = [];  // 'salto', 'aterrizaje', 'paso', 'chapuzon' (para los sonidos)
  }

  get ancho() { return J.ancho / 2; }

  ponerEn(x, y, z) {
    this.x = x; this.y = y; this.z = z;
    this.vx = this.vy = this.vz = 0;
  }

  // ¿La caja del jugador toca este bloque?
  tocaBloque(bx, by, bz) {
    const w = this.ancho;
    return bx + 1 > this.x - w && bx < this.x + w &&
           by + 1 > this.y && by < this.y + J.alto &&
           bz + 1 > this.z - w && bz < this.z + w;
  }

  // ¿Está metido dentro de algo sólido?
  atorado(mundo) {
    const w = this.ancho - EPS;
    for (let y = Math.floor(this.y + EPS); y <= Math.floor(this.y + J.alto - EPS); y++) {
      for (let z = Math.floor(this.z - w); z <= Math.floor(this.z + w); z++) {
        for (let x = Math.floor(this.x - w); x <= Math.floor(this.x + w); x++) {
          if (SOLIDO[mundo.obtener(x, y, z)]) return true;
        }
      }
    }
    return false;
  }

  // Si quedó dentro de un bloque, lo sube hasta que quepa
  desatorar(mundo) {
    let n = 0;
    while (this.atorado(mundo) && n++ < ALTO) this.y = Math.floor(this.y) + 1;
  }

  // Mueve la caja en un eje y la detiene si choca
  moverEje(eje, d, mundo) {
    if (d === 0) return;
    const w = this.ancho;
    if (eje === 0) this.x += d; else if (eje === 1) this.y += d; else this.z += d;
    const x0 = Math.floor(this.x - w + EPS), x1 = Math.floor(this.x + w - EPS);
    const y0 = Math.floor(this.y + EPS), y1 = Math.floor(this.y + J.alto - EPS);
    const z0 = Math.floor(this.z - w + EPS), z1 = Math.floor(this.z + w - EPS);
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          if (!mundo.esSolido(x, y, z)) continue;
          if (eje === 0) {
            this.x = d > 0 ? x - w - EPS : x + 1 + w + EPS;
            this.vx = 0;
            this.chocoLado = true;
          } else if (eje === 1) {
            if (d > 0) { this.y = y - J.alto - EPS; }
            else { this.y = y + 1; this.enSuelo = true; }
            this.vy = 0;
          } else {
            this.z = d > 0 ? z - w - EPS : z + 1 + w + EPS;
            this.vz = 0;
            this.chocoLado = true;
          }
          return;
        }
      }
    }
  }

  actualizar(dt, entrada, mundo, tactil) {
    this.eventos.length = 0;
    // si el chunk de abajo todavía no existe, esperamos quietos
    if (!mundo.estaListo(this.x, this.z)) { this.vx = this.vy = this.vz = 0; return; }

    const bx = Math.floor(this.x), bz = Math.floor(this.z);
    const estabaEnAgua = this.enAgua;
    this.enAgua = DIBUJO[mundo.obtener(bx, Math.floor(this.y + 0.1), bz)] === DIBUJO_AGUA ||
                  DIBUJO[mundo.obtener(bx, Math.floor(this.y + 0.9), bz)] === DIBUJO_AGUA;
    if (this.enAgua && !estabaEnAgua && this.vy < -4) this.eventos.push('chapuzon');

    // ---- hacia dónde quiere ir (relativo a la cámara)
    const sen = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let mx = entrada.derecha * cos - entrada.adelante * sen;
    let mz = -entrada.derecha * sen - entrada.adelante * cos;
    const largo = Math.hypot(mx, mz);
    if (largo > 1) { mx /= largo; mz /= largo; }

    this.corriendo = !!entrada.correr && entrada.adelante > 0 && !this.enAgua;
    let rapidez;
    if (this.volando) rapidez = entrada.correr ? J.velocidadVueloRapido : J.velocidadVuelo;
    else if (this.enAgua) rapidez = J.velocidadAgua;
    else rapidez = this.corriendo ? J.velocidadCorrer : J.velocidad;

    const flota = this.gravMul === 0 && !this.enAgua;
    const agarre = this.volando ? 8 : flota ? 1.8 : this.enSuelo ? 16 : this.enAgua ? 6 : this.gravMul < 1 ? 2.2 : 5;
    const f = 1 - Math.exp(-agarre * dt);
    this.vx += (mx * rapidez - this.vx) * f;
    this.vz += (mz * rapidez - this.vz) * f;

    // ---- arriba / abajo
    if (this.volando) {
      const objetivo = ((entrada.saltar ? 1 : 0) - (entrada.bajar ? 1 : 0)) * rapidez * 0.8;
      this.vy += (objetivo - this.vy) * (1 - Math.exp(-10 * dt));
    } else if (this.enAgua) {
      const objetivo = entrada.saltar ? 3.4 : -2.2;
      this.vy += (objetivo - this.vy) * (1 - Math.exp(-(entrada.saltar ? 7 : 2.5) * dt));
      // salir del agua trepando por la orilla
      if (entrada.saltar && this.chocoLado) this.vy = Math.max(this.vy, 5.5);
    } else if (flota) {
      const objetivo = ((entrada.saltar ? 1 : 0) - (entrada.bajar ? 1 : 0)) * 3.4;
      this.vy += (objetivo - this.vy) * (1 - Math.exp(-1.8 * dt));
    } else {
      this.vy -= J.gravedad * this.gravMul * dt;
      if (this.vy < -J.caidaMaxima) this.vy = -J.caidaMaxima;
      if (entrada.saltar && this.enSuelo) {
        this.vy = J.salto;
        this.eventos.push('salto');
      }
    }

    // ---- mover con choques (en pasitos para no atravesar nada)
    const velAntes = this.vy;
    const estabaEnSuelo = this.enSuelo;
    const mayor = Math.max(Math.abs(this.vx), Math.abs(this.vy), Math.abs(this.vz)) * dt;
    const pasos = Math.max(1, Math.ceil(mayor / 0.35));
    const sdt = dt / pasos;
    this.enSuelo = false;
    this.chocoLado = false;
    for (let i = 0; i < pasos; i++) {
      this.moverEje(0, this.vx * sdt, mundo);
      this.moverEje(1, this.vy * sdt, mundo);
      this.moverEje(2, this.vz * sdt, mundo);
    }

    if (this.enSuelo && !estabaEnSuelo && velAntes < -9) this.eventos.push('aterrizaje');
    if (this.volando && this.enSuelo && entrada.bajar) this.volando = false; // aterrizó

    // ---- salto automático (celular): si chocas con un escalón de 1 bloque
    if (tactil && J.saltoAutomaticoMovil && this.enSuelo && this.chocoLado && largo > 0.2 && !this.volando) {
      const ax = Math.floor(this.x + (mx / (largo || 1)) * (this.ancho + 0.35));
      const az = Math.floor(this.z + (mz / (largo || 1)) * (this.ancho + 0.35));
      const py = Math.floor(this.y + EPS);
      if (mundo.esSolido(ax, py, az) && !mundo.esSolido(ax, py + 1, az) && !mundo.esSolido(ax, py + 2, az) &&
          !mundo.esSolido(Math.floor(this.x), py + 2, Math.floor(this.z))) {
        this.vy = J.salto;
        this.enSuelo = false;
      }
    }

    // ---- pasos (para el sonido)
    if (this.enSuelo && !this.enAgua) {
      this.distanciaPasos += Math.hypot(this.vx, this.vz) * dt;
      if (this.distanciaPasos > (this.corriendo ? 2.6 : 2.1)) {
        this.distanciaPasos = 0;
        this.eventos.push('paso');
      }
    }

    this.cabezaEnAgua = DIBUJO[mundo.obtener(Math.floor(this.x), Math.floor(this.y + J.ojos), Math.floor(this.z))] === DIBUJO_AGUA;

    // ---- se cayó del mundo (no debería pasar, pero por si acaso)
    if (this.y < -20) {
      this.y = ALTO;
      this.vy = 0;
    }
  }

  // Bloque que está bajo los pies (para saber qué sonido hacen los pasos)
  bloqueBajoPies(mundo) {
    return mundo.obtener(Math.floor(this.x), Math.floor(this.y - 0.05), Math.floor(this.z));
  }

  posicionOjos() {
    return { x: this.x, y: this.y + J.ojos, z: this.z };
  }
}
