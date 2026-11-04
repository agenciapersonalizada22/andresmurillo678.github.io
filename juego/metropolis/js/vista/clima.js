// Lluvia, nieve y tornado (decorativos). Se actualizan solo si hay precipitación; usan pocos vértices.
import * as THREE from '../../lib/three.module.min.js';

const MAXR = 1100, MAXN = 800;

export class ClimaVista {
  constructor(scene) {
    this.lluvia = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xb8d4ff, transparent: true, opacity: 0.55 }));
    this.lluvia.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXR * 6), 3));
    this.nieve = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffffff, size: 3.2, sizeAttenuation: false, transparent: true, opacity: 0.9 }));
    this.nieve.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXN * 3), 3));
    for (const m of [this.lluvia, this.nieve]) { m.frustumCulled = false; m.visible = false; scene.add(m); }
    this.sx = new Float32Array(MAXR); this.sz = new Float32Array(MAXR); this.sy = new Float32Array(MAXR); this.vv = new Float32Array(MAXR);
    for (let i = 0; i < MAXR; i++) { this.sx[i] = Math.random(); this.sz[i] = Math.random(); this.sy[i] = Math.random(); this.vv[i] = 0.8 + Math.random() * 0.5; }
    this.tornado = new THREE.Group(); this.tornado.visible = false; scene.add(this.tornado);
    const mat = new THREE.MeshLambertMaterial({ color: 0x7c828d, transparent: true, opacity: 0.75, flatShading: true });
    for (let i = 0; i < 7; i++) {
      const r0 = 0.15 + i * 0.22, m = new THREE.Mesh(new THREE.CylinderGeometry(r0 + 0.22, r0, 0.7, 7, 1, true), mat);
      m.position.y = 0.35 + i * 0.68; this.tornado.add(m);
    }
    this.t = 0; this.int = 0;
  }
  actualizar(dt, tipo, cam, q, reducir, c) {
    this.t += dt;
    const obj = reducir ? 0 : tipo === 'tormenta' ? 1 : tipo === 'lluvia' ? 0.6 : tipo === 'nieve' ? 0.7 : 0;
    this.int += (obj - this.int) * Math.min(1, dt * 1.5);
    const H = Math.max(9, cam.escala * 1.9), I = this.int * (q.clima || 1);
    const esN = tipo === 'nieve';
    const nr = esN ? 0 : Math.min(MAXR, Math.floor(MAXR * Math.min(1, I))), nn = esN ? Math.min(MAXN, Math.floor(MAXN * Math.min(1, I))) : 0;
    this.lluvia.visible = nr > 5; this.nieve.visible = nn > 5;
    if (nr > 5) {
      const p = this.lluvia.geometry.attributes.position.array;
      for (let i = 0; i < nr; i++) {
        this.sy[i] -= dt * this.vv[i] * 1.2; if (this.sy[i] < 0) { this.sy[i] += 1; this.sx[i] = Math.random(); this.sz[i] = Math.random(); }
        const x = cam.x + (this.sx[i] - 0.5) * 2 * H, z = cam.z + (this.sz[i] - 0.5) * 2 * H, y = this.sy[i] * 18, o = i * 6;
        p[o] = x; p[o + 1] = y; p[o + 2] = z; p[o + 3] = x - 0.06; p[o + 4] = y - 0.55; p[o + 5] = z;
      }
      this.lluvia.geometry.setDrawRange(0, nr * 2); this.lluvia.geometry.attributes.position.needsUpdate = true;
    }
    if (nn > 5) {
      const p = this.nieve.geometry.attributes.position.array;
      for (let i = 0; i < nn; i++) {
        this.sy[i] -= dt * this.vv[i] * 0.12; if (this.sy[i] < 0) { this.sy[i] += 1; this.sx[i] = Math.random(); this.sz[i] = Math.random(); }
        const sw = Math.sin(this.t * 1.3 + i) * 0.25, o = i * 3;
        p[o] = cam.x + (this.sx[i] - 0.5) * 2 * H + sw; p[o + 1] = this.sy[i] * 18; p[o + 2] = cam.z + (this.sz[i] - 0.5) * 2 * H;
      }
      this.nieve.geometry.setDrawRange(0, nn); this.nieve.geometry.attributes.position.needsUpdate = true;
    }
    const tor = c && c.evt.tornado;
    this.tornado.visible = !!tor;
    if (tor) {
      this.tornado.position.set(tor.x, 0, tor.y);
      this.tornado.children.forEach((m, i) => { m.rotation.y = this.t * (4 + i); m.position.x = Math.sin(this.t * 3 + i) * 0.08 * i; });
    }
    return this.int;
  }
}
