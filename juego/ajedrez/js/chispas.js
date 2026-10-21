// =============================================================
//  ✨  CHISPAS
//  Partículas al capturar o coronar: puntitos que salen disparados,
//  caen con gravedad y se apagan. Un solo objeto Points con un
//  anillo de partículas reutilizadas (sin crear basura).
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { texturaChispa } from './texturas.js';

const MAX = 360;

export class Chispas {
  constructor() {
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.vida = new Float32Array(MAX);
    this.dur = new Float32Array(MAX).fill(1);
    this.base = new Float32Array(MAX * 3);
    this.sig = 0;
    this.activas = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.tex = texturaChispa();
    this.puntos = new THREE.Points(g, new THREE.PointsMaterial({
      size: 0.16, map: this.tex, vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false,
    }));
    this.puntos.frustumCulled = false;
    this.puntos.renderOrder = 5;
    for (let i = 0; i < MAX; i++) this.pos[i * 3 + 1] = -100;
  }

  emitir(x, y, z, color, n = 40, fuerza = 2.4) {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const i = this.sig;
      this.sig = (this.sig + 1) % MAX;
      const a = Math.random() * Math.PI * 2, e = Math.random() * 0.9 + 0.1;
      const v = fuerza * (0.35 + Math.random() * 0.8);
      this.pos.set([x, y, z], i * 3);
      this.vel.set([Math.cos(a) * v * e, (0.6 + Math.random()) * v * 0.9, Math.sin(a) * v * e], i * 3);
      const blanco = Math.random() < 0.35 ? 1 : 0;
      this.base.set([c.r + blanco * (1 - c.r), c.g + blanco * (1 - c.g), c.b + blanco * (1 - c.b)], i * 3);
      this.vida[i] = this.dur[i] = 0.55 + Math.random() * 0.55;
    }
    this.activas = MAX;
  }

  // true mientras haya partículas vivas
  actualizar(dt) {
    if (!this.activas) return false;
    let vivas = 0;
    for (let i = 0; i < MAX; i++) {
      if (this.vida[i] <= 0) { continue; }
      this.vida[i] -= dt;
      const o = i * 3;
      if (this.vida[i] <= 0) {
        this.pos[o + 1] = -100; this.col[o] = this.col[o + 1] = this.col[o + 2] = 0;
        continue;
      }
      vivas++;
      this.vel[o + 1] -= 7.5 * dt;
      this.pos[o] += this.vel[o] * dt; this.pos[o + 1] += this.vel[o + 1] * dt; this.pos[o + 2] += this.vel[o + 2] * dt;
      if (this.pos[o + 1] < 0.03) { this.pos[o + 1] = 0.03; this.vel[o + 1] *= -0.3; this.vel[o] *= 0.7; this.vel[o + 2] *= 0.7; }
      const f = Math.max(0, this.vida[i] / this.dur[i]);
      this.col[o] = this.base[o] * f; this.col[o + 1] = this.base[o + 1] * f; this.col[o + 2] = this.base[o + 2] * f;
    }
    this.puntos.geometry.attributes.position.needsUpdate = true;
    this.puntos.geometry.attributes.color.needsUpdate = true;
    if (!vivas) this.activas = 0;
    return vivas > 0;
  }
}
