// =============================================================
//  TANQUES: casco y torreta independientes, cañón con recarga,
//  daño por zonas (frente, lados, trasera, torreta) y la IA enemiga.
//  El cañón apunta a -Z. rumbo = giro del casco sobre Y.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { crearTanque } from './modelos.js';
import { Sonido } from './sonido.js';

export const TIPOS_TANQUE = {
  jugador: { vida: 170, vel: 14, giro: 1.1, recarga: 2.2, dano: 46, escala: 1, color: 0x4d6b3c, rot: 3.5, puntos: 0, pref: 0 },
  ligero: { vida: 55, vel: 16, giro: 1.5, recarga: 2.9, dano: 16, escala: 0.9, color: 0xa8905a, rot: 1.0, puntos: 100, pref: 170 },
  medio: { vida: 100, vel: 12, giro: 1.1, recarga: 3.6, dano: 24, escala: 1, color: 0x8a5a45, rot: 0.8, puntos: 150, pref: 230 },
  pesado: { vida: 190, vel: 8, giro: 0.8, recarga: 4.8, dano: 38, escala: 1.25, color: 0x5a4a60, rot: 0.6, puntos: 250, pref: 300 },
};

const V = new THREE.Vector3(), W = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const envolver = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const ELEV_MIN = -0.16, ELEV_MAX = 0.4;

export class Tanque {
  constructor(ctx, tipo, oleada = 1) {
    this.ctx = ctx;
    this.clase = tipo;
    const T = this.datos = TIPOS_TANQUE[tipo];
    this.esJugador = tipo === 'jugador';
    this.equipo = this.esJugador ? 'jugador' : 'enemigo';
    this.tipo = 'tanque';
    this.puntos = T.puntos + oleada * 10;
    this.oleada = oleada;
    const m = crearTanque(T.color, T.escala);
    this.grupo = m.grupo;
    this.casco = m.casco;
    this.torreta = m.torreta;
    this.canon = m.canon;
    this.boca = m.boca;
    this.grupo.rotation.order = 'YXZ';
    ctx.escena.add(this.grupo);
    this.pos = this.grupo.position;
    this.centro = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.radio = 3.8 * T.escala;
    this.vidaMax = this.vida = this.esJugador ? T.vida : T.vida + oleada * 8;
    this.vivo = true;
    this.rumbo = 0;
    this.torretaYaw = 0;
    this.elev = 0.04;
    this.v = 0;
    this.cdRecarga = 1;
    this.retro = 0;
    this.incX = 0;
    this.incZ = 0;
    this.modulos = { orugas: 0, torreta: 0, motor: 0 };
    this.humoT = 0;
    this.alMorir = null;
    // IA
    this.estado = 'avanzar';
    this.tEstado = 4 + Math.random() * 3;
    this.orbita = Math.random() < 0.5 ? 1 : -1;
    this.tOrbita = 3 + Math.random() * 3;
    this.tLos = 0;
    this.ve = false;
    this.cubierta = null;
    this.espera = 0.5 + Math.random();
    this.atasco = { t: 0, x: 0, z: 0 };
    this.reversa = 0;
    this.cmd = { av: 0, gi: 0 };
  }

  colocar(x, z, rumbo) {
    this.pos.set(x, this.ctx.terreno.altura(x, z), z);
    this.rumbo = rumbo;
    this.torretaYaw = rumbo;
    this._aspecto(0);
  }

  get recargaFrac() { return clamp(1 - this.cdRecarga / this.datos.recarga, 0, 1); }

  dirTorreta(out) {
    const c = Math.cos(this.elev);
    return out.set(-Math.sin(this.torretaYaw) * c, Math.sin(this.elev), -Math.cos(this.torretaYaw) * c);
  }

  // ------------------------------------------------------------ Movimiento
  actualizar(dt, cmd) {
    if (!this.vivo) return;
    const T = this.datos;
    const { terreno } = this.ctx;
    const vel = T.vel * (this.modulos.orugas > 0.5 ? 0.55 : 1) * (this.modulos.motor > 0.6 ? 0.8 : 1);
    this.rumbo += cmd.gi * T.giro * (this.modulos.orugas > 0.5 ? 0.7 : 1) * dt;
    const objetivo = cmd.av > 0 ? cmd.av * vel : cmd.av * vel * 0.5;
    this.v += (objetivo - this.v) * Math.min(1, 2.2 * dt);
    const fx = -Math.sin(this.rumbo), fz = -Math.cos(this.rumbo);
    let nx = this.pos.x + fx * this.v * dt, nz = this.pos.z + fz * this.v * dt;
    const h0 = this.pos.y, h1 = terreno.altura(nx, nz);
    const paso = Math.abs(this.v * dt) + 1e-4;
    if (h1 < 0.4 || (h1 - h0) / paso > 0.6 && paso > 1e-3 && h1 > h0 + 0.35 || Math.hypot(nx, nz) > 1220) {
      this.v = 0;
      nx = this.pos.x; nz = this.pos.z;
    }
    for (const c of terreno.colisionadores) {
      const dx = nx - c.x, dz = nz - c.z, rr = c.r + 2.6 * this.datos.escala;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && this.pos.y < c.y + c.h) {
        const d = Math.sqrt(d2) || 0.01;
        nx = c.x + (dx / d) * rr;
        nz = c.z + (dz / d) * rr;
        this.v *= 0.6;
      }
    }
    this.pos.x = nx;
    this.pos.z = nz;
    this.pos.y = terreno.altura(nx, nz);
    this.vel.set(fx * this.v, 0, fz * this.v);
    this._aspecto(dt);
    this.cdRecarga = Math.max(0, this.cdRecarga - dt);
    this.retro *= Math.exp(-5 * dt);
    this.canon.position.z = -1.25 + this.retro;
    if (this.modulos.motor > 0.6) {
      this.recibirDanioDirecto(2 * dt);
    }
    this._humo(dt);
  }

  _aspecto(dt) {
    const { terreno } = this.ctx;
    const e = this.datos.escala;
    const fx = -Math.sin(this.rumbo), fz = -Math.cos(this.rumbo);
    const rx = Math.cos(this.rumbo), rz = -Math.sin(this.rumbo);
    const x = this.pos.x, z = this.pos.z;
    const pitch = Math.atan2(terreno.altura(x + fx * 3 * e, z + fz * 3 * e) - terreno.altura(x - fx * 3 * e, z - fz * 3 * e), 6 * e);
    const roll = Math.atan2(terreno.altura(x + rx * 1.7 * e, z + rz * 1.7 * e) - terreno.altura(x - rx * 1.7 * e, z - rz * 1.7 * e), 3.4 * e);
    const k = dt > 0 ? Math.min(1, 6 * dt) : 1;
    this.incX += (pitch - this.incX) * k;
    this.incZ += (roll - this.incZ) * k;
    this.grupo.rotation.set(this.incX, this.rumbo, this.incZ);
    this.torreta.rotation.y = this.torretaYaw - this.rumbo;
    this.canon.rotation.x = this.elev - this.incX;
    this.centro.set(x, this.pos.y + 1.8 * e, z);
  }

  _humo(dt) {
    const f = this.vida / this.vidaMax;
    if (f > 0.5 && this.modulos.motor < 0.4) return;
    this.humoT -= dt;
    if (this.humoT > 0) return;
    this.humoT = f < 0.25 ? 0.08 : 0.16;
    V.set(Math.sin(this.rumbo) * 2.5, 2.2, Math.cos(this.rumbo) * 2.5).add(this.pos);
    this.ctx.efectos.estela(V, false, 1.4);
    if (f < 0.3 || this.modulos.motor > 0.6) this.ctx.efectos.llama(V, 0.9);
  }

  // ------------------------------------------------------------ Torreta
  _girar(sy, se) {
    this.torretaYaw = envolver(this.torretaYaw + sy);
    this.elev = clamp(this.elev + se, ELEV_MIN, ELEV_MAX);
  }

  _maxGiro(dt) {
    return this.datos.rot * (this.modulos.torreta > 0.5 ? 0.45 : 1) * dt;
  }

  // Jugador: lo que pide el ratón se acumula y se aplica a la velocidad máxima de la torreta
  rotarTorreta(dYaw, dElev, dt) {
    this.pY = clamp((this.pY || 0) + dYaw, -1.5, 1.5);
    this.pE = clamp((this.pE || 0) + dElev, -0.5, 0.5);
    const max = this._maxGiro(dt);
    const sy = clamp(this.pY, -max, max), se = clamp(this.pE, -max, max);
    this.pY -= sy;
    this.pE -= se;
    this._girar(sy, se);
  }

  apuntarA(yaw, elev, dt) {
    const max = this._maxGiro(dt);
    this._girar(clamp(envolver(yaw - this.torretaYaw), -max, max), clamp(elev - this.elev, -max, max));
  }

  disparar(dir) {
    if (!this.vivo || this.cdRecarga > 0) return false;
    this.cdRecarga = this.datos.recarga;
    this.retro = 1.1;
    this.grupo.updateMatrixWorld(true);
    this.boca.getWorldPosition(V);
    const { proyectiles, efectos } = this.ctx;
    proyectiles.disparar('obus', this.equipo, V, dir, null, { dano: this.datos.dano });
    for (let i = 0; i < 6; i++) efectos.fuego.emitir(V.x, V.y, V.z, dir.x * 14 + (Math.random() - 0.5) * 6, dir.y * 14 + (Math.random() - 0.5) * 6, dir.z * 14 + (Math.random() - 0.5) * 6, 0.25, 1.6, 0.4, [1, 0.95, 0.6], [1, 0.4, 0.1], 1);
    efectos.estela(V, true, 1.6);
    Sonido.disparo('canon', this.esJugador ? 1 : Sonido.porDistancia(efectos._distancia(V)));
    if (this.esJugador) { efectos.sacudida = Math.max(efectos.sacudida, 0.7); this.ctx.entrada.vibrar(1, 0.6, 260, 'canon'); }
    return true;
  }

  // ------------------------------------------------------------ Daño por zonas
  recibirDanio(d, punto, proj) {
    if (!this.vivo) return;
    let mult = 1;
    const m = this.modulos;
    if (proj && proj.vel) {
      const fx = -Math.sin(this.rumbo), fz = -Math.cos(this.rumbo);
      const l = Math.hypot(proj.vel.x, proj.vel.z) || 1;
      const frente = (proj.vel.x * fx + proj.vel.z * fz) / l; // -1 = viene de frente
      const alto = punto.y > this.pos.y + 1.5 * this.datos.escala;
      if (alto) { mult = 1.15; m.torreta = Math.min(1, m.torreta + d / this.vidaMax * 2); }
      else if (frente < -0.55) mult = 0.55;
      else if (frente > 0.55) { mult = 1.8; m.motor = Math.min(1, m.motor + d / this.vidaMax * 2.2); }
      else { mult = 1.1; m.orugas = Math.min(1, m.orugas + d / this.vidaMax * 2.4); }
    }
    this.recibirDanioDirecto(d * mult);
    if (this.esJugador) {
      this.ctx.hud.golpe();
      Sonido.impacto(1);
      this.ctx.entrada.vibrar(Math.min(1, 0.3 + d / 40), 0.8, 180, 'dano', 90);
    }
  }

  recibirDanioDirecto(d) {
    if (!this.vivo) return;
    this.vida -= d;
    if (this.vida <= 0) this.morir();
  }

  morir() {
    if (!this.vivo) return;
    this.vivo = false;
    this.vida = 0;
    this.ctx.efectos.explosion(this.centro, 2);
    this.ctx.efectos.dejarResto(this.grupo, 18);
    if (this.alMorir) this.alMorir(this);
  }

  quitar() {
    this.ctx.escena.remove(this.grupo);
  }

  // ------------------------------------------------------------ IA enemiga
  pensar(dt, jp) {
    if (!this.vivo) return;
    const { terreno } = this.ctx;
    const T = this.datos;
    const dx = jp.pos.x - this.pos.x, dz = jp.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    this.tLos -= dt;
    if (this.tLos <= 0) {
      this.tLos = 0.35;
      A.copy(this.pos).y += 3;
      this.ve = dist < 650 && !terreno.bloqueado(A, B.copy(jp.centro));
    }
    this.tEstado -= dt;
    this.tOrbita -= dt;
    if (this.tOrbita <= 0) { this.orbita = -this.orbita; this.tOrbita = 3 + Math.random() * 4; }
    if (this.estado === 'avanzar' && this.tEstado <= 0) {
      const mal = this.vida < this.vidaMax * 0.45 || (this.cdRecarga > T.recarga * 0.6 && Math.random() < 0.4);
      const c = mal ? this._buscarCubierta(jp) : null;
      if (c) { this.estado = 'cubrir'; this.cubierta = c; this.tEstado = 3.5 + Math.random() * 2.5; }
      else this.tEstado = 3 + Math.random() * 3;
    } else if (this.estado === 'cubrir' && this.tEstado <= 0 && this.cdRecarga <= 0.2 && this.vida > this.vidaMax * 0.25) {
      this.estado = 'avanzar';
      this.tEstado = 5 + Math.random() * 4;
    }

    // adónde ir
    let tx = jp.pos.x, tz = jp.pos.z, av = 1;
    if (this.estado === 'cubrir' && this.cubierta) {
      tx = this.cubierta.x; tz = this.cubierta.z;
      if (Math.hypot(tx - this.pos.x, tz - this.pos.z) < 4) av = 0;
    } else if (!this.ve && dist < 230) {
      // sin línea de tiro y cerca: rodea los edificios para encontrar ángulo
      const px = -dz / dist, pz = dx / dist;
      tx = jp.pos.x + px * 110 * this.orbita;
      tz = jp.pos.z + pz * 110 * this.orbita;
    } else if (this.ve) {
      if (dist < T.pref * 0.55) { av = -0.7; }
      else if (dist < T.pref + 25) {
        const px = -dz / dist, pz = dx / dist;
        tx = this.pos.x + px * 90 * this.orbita + dx / dist * 20;
        tz = this.pos.z + pz * 90 * this.orbita + dz / dist * 20;
        av = 0.6;
      }
    }
    let rumboObj = Math.atan2(-(tx - this.pos.x), -(tz - this.pos.z));
    if (av < 0) rumboObj = Math.atan2(dx, dz); // retrocede mirando al jugador
    // esquivar edificios y rocas delante
    for (const c of terreno.colisionadores) {
      const ex = c.x - this.pos.x, ez = c.z - this.pos.z;
      const rr = c.r + 14;
      if (ex * ex + ez * ez > rr * rr * 4) continue;
      const ang = envolver(Math.atan2(-ex, -ez) - this.rumbo);
      if (Math.abs(ang) < 0.9 && ex * ex + ez * ez < rr * rr * 2.2) { rumboObj = this.rumbo - Math.sign(ang || 1) * 0.9; break; }
    }
    this.atasco.t += dt;
    if (this.atasco.t > 2) {
      if (Math.hypot(this.pos.x - this.atasco.x, this.pos.z - this.atasco.z) < 2 && av !== 0) this.reversa = 1.4;
      this.atasco.t = 0; this.atasco.x = this.pos.x; this.atasco.z = this.pos.z;
    }
    let gi, avance;
    if (this.reversa > 0) {
      this.reversa -= dt;
      avance = -0.7; gi = this.orbita;
    } else {
      const err = envolver(rumboObj - this.rumbo);
      gi = clamp(err * 2.2, -1, 1);
      avance = av >= 0 ? av * (Math.abs(err) < 0.9 ? 1 : 0.15) : av;
    }
    this.cmd.av = avance;
    this.cmd.gi = gi;
    this.actualizar(dt, this.cmd);

    // torreta y disparo
    const t = dist / 320;
    const ox = jp.pos.x + jp.vel.x * t - this.pos.x, oz = jp.pos.z + jp.vel.z * t - this.pos.z;
    const yaw = Math.atan2(-ox, -oz);
    const elev = Math.atan2(jp.centro.y - (this.pos.y + 2.5), dist);
    const objYaw = this.ve ? yaw : this.rumbo;
    this.apuntarA(objYaw, this.ve ? elev : 0.04, dt);
    this.espera -= dt;
    if (this.ve && this.cdRecarga <= 0 && this.espera <= 0 && Math.abs(envolver(yaw - this.torretaYaw)) < 0.04) {
      const err = Math.max(0.012, 0.04 - this.oleada * 0.0035) * (0.6 + dist / 350);
      this.dirTorreta(W);
      W.x += (Math.random() - 0.5) * err * 2;
      W.y += (Math.random() - 0.5) * err;
      W.z += (Math.random() - 0.5) * err * 2;
      W.normalize();
      if (this.disparar(W)) this.espera = 0.3 + Math.random() * 1.4;
    }
  }

  _buscarCubierta(jp) {
    let mejor = null, md = 170 * 170;
    for (const c of this.ctx.terreno.colisionadores) {
      if (c.r < 3) continue;
      const d2 = (c.x - this.pos.x) ** 2 + (c.z - this.pos.z) ** 2;
      if (d2 < md) { md = d2; mejor = c; }
    }
    if (!mejor) return null;
    const ux = mejor.x - jp.pos.x, uz = mejor.z - jp.pos.z;
    const l = Math.hypot(ux, uz) || 1;
    return { x: mejor.x + (ux / l) * (mejor.r + 7), z: mejor.z + (uz / l) * (mejor.r + 7) };
  }
}
