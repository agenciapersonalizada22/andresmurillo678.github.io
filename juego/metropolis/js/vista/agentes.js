// Tráfico y peatones animados sobre la red de calles (caminata aleatoria, sin ruta global).
import * as THREE from '../../lib/three.module.min.js';
import { N } from '../sim/ciudad.js';
import { geoCoche, geoPeaton } from './modelosVia.js';

const COLORES = [0xe5484d, 0x3b82f6, 0xf2c14e, 0x34d399, 0xffffff, 0x9aa0aa, 0xff8a3d, 0xb78bff];
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export class Agentes {
  constructor(scene, calidad) {
    this.coches = new THREE.InstancedMesh(geoCoche(), new THREE.MeshLambertMaterial({ vertexColors: true }), 160);
    this.pe = new THREE.InstancedMesh(geoPeaton(), new THREE.MeshLambertMaterial({ vertexColors: true }), 260);
    for (const m of [this.coches, this.pe]) { m.frustumCulled = false; m.count = 0; m.setColorAt(0, new THREE.Color(1, 1, 1)); scene.add(m); }
    this.a = []; this.p = [];
    this.q = calidad; this.col = new THREE.Color();
  }
  vecinos(c, x, y) {
    const out = [];
    for (let k = 0; k < 4; k++) {
      const nx = x + DIRS[k][0], ny = y + DIRS[k][1];
      if (nx >= 0 && ny >= 0 && nx < N && ny < N && c.via[ny * N + nx] && c.r.con[ny * N + nx]) out.push(k);
    }
    return out;
  }
  nuevo(c, lista, esPeaton) {
    const cand = c.r.conLista;
    if (!cand || !cand.length) return null;
    const i = cand[Math.floor(Math.random() * cand.length)], x = i % N, y = (i / N) | 0;
    const vs = this.vecinos(c, x, y);
    if (!vs.length) return null;
    const d = vs[Math.floor(Math.random() * vs.length)];
    return { x, y, d, p: Math.random(), v: (esPeaton ? 0.35 : 1.1) * (0.8 + Math.random() * 0.5), col: COLORES[Math.floor(Math.random() * COLORES.length)], lado: esPeaton ? (Math.random() < 0.5 ? -1 : 1) : 1 };
  }
  actualizar(c, dt, noche) {
    const r = c.r;
    if (!r) return;
    if (c.rVer !== this._ver) {
      this._ver = c.rVer;
      const l = []; for (let i = 0; i < N * N; i++) if (r.con[i]) l.push(i);
      r.conLista = l; this._conN = l.length;
    }
    const nCon = this._conN || 0;
    const pop = c.s ? c.s.pop : 0;
    const objCoches = Math.min(this.q.agentes, Math.floor(nCon * 0.35), Math.floor(pop / 6) + (nCon > 8 ? 2 : 0));
    const objPe = Math.min(Math.floor(this.q.agentes * 1.6), Math.floor(nCon * 0.5), Math.floor(pop / 5)) * (noche > 0.6 ? 0.4 : 1);
    while (this.a.length < objCoches) { const n = this.nuevo(c); if (!n) break; this.a.push(n); }
    while (this.p.length < objPe) { const n = this.nuevo(c, null, true); if (!n) break; this.p.push(n); }
    if (this.a.length > objCoches) this.a.length = objCoches;
    if (this.p.length > Math.floor(objPe)) this.p.length = Math.floor(objPe);
    const cong = c.s ? Math.min(0.7, c.s.cong) : 0;
    this.mover(c, this.a, dt * (1 - cong * 0.6), false);
    this.mover(c, this.p, dt, true);
    this.escribir(this.coches, this.a, false);
    this.escribir(this.pe, this.p, true);
  }
  mover(c, lista, dt, peaton) {
    for (let i = lista.length - 1; i >= 0; i--) {
      const a = lista[i];
      if (!c.via[a.y * N + a.x]) { const n = this.nuevo(c, null, peaton); if (n) lista[i] = n; else lista.splice(i, 1); continue; }
      a.p += a.v * dt;
      while (a.p >= 1) {
        a.p -= 1;
        a.x += DIRS[a.d][0]; a.y += DIRS[a.d][1];
        const vs = this.vecinos(c, a.x, a.y);
        if (!vs.length) { const n = this.nuevo(c, null, peaton); if (n) { lista[i] = n; } break; }
        const atras = (a.d + 2) % 4;
        const op = vs.filter((k) => k !== atras);
        const el = op.length ? op : vs;
        a.d = (op.includes(a.d) && Math.random() < 0.7) ? a.d : el[Math.floor(Math.random() * el.length)];
      }
    }
  }
  escribir(mesh, lista, peaton) {
    const arr = mesh.instanceMatrix.array;
    for (let i = 0; i < lista.length; i++) {
      const a = lista[i], dx = DIRS[a.d][0], dz = DIRS[a.d][1];
      const px = a.x + 0.5 + dx * (a.p - 0.5), pz = a.y + 0.5 + dz * (a.p - 0.5);
      const off = peaton ? 0.38 * a.lado : 0.15;
      const ox = -dz * off, oz = dx * off; // derecha respecto a la marcha
      const th = Math.atan2(dx, dz), cs = Math.cos(th), sn = Math.sin(th), o = i * 16;
      arr[o] = cs; arr[o + 1] = 0; arr[o + 2] = -sn; arr[o + 3] = 0; arr[o + 4] = 0; arr[o + 5] = 1; arr[o + 6] = 0; arr[o + 7] = 0;
      arr[o + 8] = sn; arr[o + 9] = 0; arr[o + 10] = cs; arr[o + 11] = 0;
      arr[o + 12] = px + ox; arr[o + 13] = 0.045; arr[o + 14] = pz + oz; arr[o + 15] = 1;
      this.col.setHex(a.col); mesh.setColorAt(i, this.col);
    }
    mesh.count = lista.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}
