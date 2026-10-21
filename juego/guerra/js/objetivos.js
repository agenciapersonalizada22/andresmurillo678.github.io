// Objetivos en tierra: antiaéreas (disparan), depósitos, camiones y radares
import * as THREE from '../lib/three.module.min.js';
import { crearObjetivo } from './modelos.js';
import { Sonido } from './sonido.js';

const DATOS = {
  antiaerea: { vida: 45, puntos: 200, radio: 4.5, centroY: 2.2 },
  deposito: { vida: 60, puntos: 120, radio: 5, centroY: 2.6 },
  camion: { vida: 30, puntos: 80, radio: 3.8, centroY: 1.6 },
  radar: { vida: 50, puntos: 150, radius: 4.5, radio: 4.5, centroY: 2 },
};
const V = new THREE.Vector3(), W = new THREE.Vector3();

export class ObjetivoTierra {
  constructor(ctx, tipo, x, z, oleada) {
    this.ctx = ctx;
    this.tipo = 'tierra';
    this.clase = tipo;
    this.equipo = 'enemigo';
    const d = DATOS[tipo];
    this.puntos = d.puntos;
    this.radio = d.radio;
    this.vida = this.vidaMax = d.vida + oleada * 4;
    this.vivo = true;
    this.oleada = oleada;
    const m = crearObjetivo(tipo);
    this.grupo = m.grupo;
    this.cabeza = m.cabeza;
    const y = ctx.terreno.altura(x, z);
    this.grupo.position.set(x, y, z);
    this.grupo.rotation.y = Math.random() * 6.28;
    ctx.escena.add(this.grupo);
    this.pos = this.grupo.position;
    this.centro = new THREE.Vector3(x, y + d.centroY, z);
    this.cd = 1 + Math.random() * 2;
    this.alMorir = null;
  }

  actualizar(dt, jp) {
    if (!this.vivo) return;
    if (this.clase === 'radar' && this.cabeza) this.cabeza.rotation.y += dt;
    if (this.clase !== 'antiaerea' || !jp.vivo) return;
    const dist = this.centro.distanceTo(jp.pos);
    if (dist > 1000) return;
    V.copy(jp.pos).addScaledVector(jp.vel, dist / 330).sub(this.centro);
    const yaw = Math.atan2(-V.x, -V.z) - this.grupo.rotation.y;
    this.cabeza.rotation.y = yaw;
    this.cd -= dt;
    if (this.cd <= 0 && dist > 120) {
      this.cd = Math.max(0.8, 1.9 - this.oleada * 0.12);
      V.normalize();
      const e = 0.02 + dist / 30000;
      V.x += (Math.random() - 0.5) * e * 2;
      V.y += (Math.random() - 0.5) * e * 2;
      V.z += (Math.random() - 0.5) * e * 2;
      V.normalize();
      W.copy(this.centro).addScaledVector(V, 3);
      this.ctx.proyectiles.disparar('flak', 'enemigo', W, V, null, { dano: 10 + this.oleada });
      Sonido.disparo('flak', Sonido.porDistancia(dist));
    }
  }

  recibirDanio(d) {
    if (!this.vivo) return;
    this.vida -= d;
    if (this.vida > 0) return;
    this.vivo = false;
    this.ctx.efectos.explosion(this.centro, 1.6);
    this.ctx.efectos.dejarResto(this.grupo, 16);
    if (this.alMorir) this.alMorir(this);
  }

  quitar() {
    this.ctx.escena.remove(this.grupo);
  }
}
