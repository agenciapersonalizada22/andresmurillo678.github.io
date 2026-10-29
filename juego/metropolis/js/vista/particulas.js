// Partículas baratas (cubitos instanciados): construcción, humo, fuegos artificiales.
import * as THREE from '../../lib/three.module.min.js';

export class Particulas {
  constructor(scene, max = 500) {
    this.max = max;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), max);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    scene.add(this.mesh);
    this.p = [];
    this.col = new THREE.Color();
    this.acum = 0;
  }
  nueva(o) {
    if (this.p.length >= this.max) this.p.shift();
    this.p.push(o);
  }
  rafaga(x, y, z, color, n = 12, fuerza = 2.2, tam = 0.08) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = (0.4 + Math.random()) * fuerza;
      this.nueva({ x, y, z, vx: Math.cos(a) * v * 0.6, vy: (0.6 + Math.random()) * fuerza, vz: Math.sin(a) * v * 0.6, g: 6, t: 0, vida: 0.6 + Math.random() * 0.4, s: tam * (0.6 + Math.random()), c: color, tipo: 0 });
    }
  }
  polvo(x, z, w, h, n = 14) {
    for (let i = 0; i < n; i++) this.nueva({ x: x + Math.random() * w, y: 0.1, z: z + Math.random() * h, vx: (Math.random() - 0.5) * 0.8, vy: 0.4 + Math.random() * 0.8, vz: (Math.random() - 0.5) * 0.8, g: -0.2, t: 0, vida: 0.9 + Math.random() * 0.6, s: 0.07 + Math.random() * 0.07, c: 0xb8aea0, tipo: 1 });
  }
  humo(x, y, z, color = 0xd0d4dc) {
    this.nueva({ x, y, z, vx: 0.12 + Math.random() * 0.1, vy: 0.45 + Math.random() * 0.2, vz: 0.05, g: 0, t: 0, vida: 2.2 + Math.random(), s: 0.1, c: color, tipo: 1 });
  }
  llama(x, y, z) {
    this.nueva({ x: x + (Math.random() - 0.5) * 0.4, y, z: z + (Math.random() - 0.5) * 0.4, vx: 0, vy: 0.9 + Math.random() * 0.6, vz: 0, g: 0, t: 0, vida: 0.7, s: 0.14, c: Math.random() < 0.5 ? 0xff6a2a : 0xffb02a, tipo: 2 });
  }
  fuegos(x, z, altura = 3.5) {
    const cols = [0xff4d6d, 0x3df5ff, 0xffd54a, 0x7dff8a, 0xc08bff];
    const c = cols[Math.floor(Math.random() * cols.length)];
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), v = 1.8 + Math.random() * 0.8;
      this.nueva({ x, y: altura, z, vx: Math.sin(b) * Math.cos(a) * v, vy: Math.cos(b) * v, vz: Math.sin(b) * Math.sin(a) * v, g: 1.8, t: 0, vida: 1.2, s: 0.09, c, tipo: 0 });
    }
  }
  actualizar(dt) {
    const arr = this.mesh.instanceMatrix.array, col = this.col;
    let n = 0;
    for (let i = this.p.length - 1; i >= 0; i--) {
      const q = this.p[i];
      q.t += dt;
      if (q.t >= q.vida) { this.p.splice(i, 1); continue; }
    }
    for (const q of this.p) {
      q.vy -= q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.tipo === 0 && q.y < 0.05) { q.y = 0.05; q.vy *= -0.3; q.vx *= 0.6; q.vz *= 0.6; }
      const k = q.t / q.vida;
      let s = q.s;
      if (q.tipo === 0) s *= 1 - k * 0.7;
      else if (q.tipo === 1) s *= 1 + k * 1.8 - Math.max(0, k - 0.5) * 3.6;
      else s *= 1 - k;
      if (s < 0.005) continue;
      const o = n * 16;
      arr[o] = s; arr[o + 1] = 0; arr[o + 2] = 0; arr[o + 3] = 0; arr[o + 4] = 0; arr[o + 5] = s; arr[o + 6] = 0; arr[o + 7] = 0;
      arr[o + 8] = 0; arr[o + 9] = 0; arr[o + 10] = s; arr[o + 11] = 0; arr[o + 12] = q.x; arr[o + 13] = q.y; arr[o + 14] = q.z; arr[o + 15] = 1;
      col.setHex(q.c); this.mesh.setColorAt(n, col);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
