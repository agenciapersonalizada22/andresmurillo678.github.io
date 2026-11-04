// Tráfico, buses, peatones y semáforos animados sobre la red de calles (caminata aleatoria, sin ruta global).
import * as THREE from '../../lib/three.module.min.js';
import { N } from '../sim/ciudad.js';
import { geoCoche, geoPeaton, geoBus, geoSemaforo } from './modelosVia.js';

const COLORES = [0xe5484d, 0x3b82f6, 0xf2c14e, 0x34d399, 0xffffff, 0x9aa0aa, 0xff8a3d, 0xb78bff];
const COL_BUS = [0x2fb7e6, 0xf2c14e, 0x34d399];
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export class Agentes {
  constructor(scene, calidad) {
    this.coches = new THREE.InstancedMesh(geoCoche(), new THREE.MeshLambertMaterial({ vertexColors: true }), 400);
    this.buses = new THREE.InstancedMesh(geoBus(), new THREE.MeshLambertMaterial({ vertexColors: true }), 40);
    this.pe = new THREE.InstancedMesh(geoPeaton(), new THREE.MeshLambertMaterial({ vertexColors: true }), 600);
    this.sem = new THREE.InstancedMesh(geoSemaforo(), new THREE.MeshBasicMaterial({ color: 0xffffff }), 700);
    for (const m of [this.coches, this.buses, this.pe, this.sem]) { m.frustumCulled = false; m.count = 0; m.setColorAt(0, new THREE.Color(1, 1, 1)); scene.add(m); }
    this.a = []; this.p = []; this.b = [];
    this.q = calidad; this.col = new THREE.Color();
    this.t = 0; this.inter = new Uint8Array(N * N); this.interLista = [];
    this.semaforos = true; this.fase = 0;
  }
  vecinos(c, x, y) {
    const out = [];
    for (let k = 0; k < 4; k++) {
      const nx = x + DIRS[k][0], ny = y + DIRS[k][1];
      if (nx >= 0 && ny >= 0 && nx < N && ny < N && c.via[ny * N + nx] && c.r.con[ny * N + nx]) out.push(k);
    }
    return out;
  }
  nuevo(c, lista, esPeaton, desde) {
    const cand = c.r.conLista;
    if (!cand || !cand.length) return null;
    const i = desde != null ? desde : cand[Math.floor(Math.random() * cand.length)], x = i % N, y = (i / N) | 0;
    const vs = this.vecinos(c, x, y);
    if (!vs.length) return null;
    const d = vs[Math.floor(Math.random() * vs.length)];
    return { x, y, d, p: Math.random(), v: (esPeaton ? 0.35 : 1.1) * (0.8 + Math.random() * 0.5), col: COLORES[Math.floor(Math.random() * COLORES.length)], lado: esPeaton ? (Math.random() < 0.5 ? -1 : 1) : 1 };
  }
  reconstruir(c) {
    const r = c.r, l = [], pa = [];
    this.inter.fill(0); this.interLista.length = 0;
    for (let i = 0; i < N * N; i++) if (r.con[i]) {
      l.push(i);
      const x = i % N, y = (i / N) | 0;
      let k = 0;
      if (x > 0 && r.con[i - 1]) k++; if (x < N - 1 && r.con[i + 1]) k++; if (y > 0 && r.con[i - N]) k++; if (y < N - 1 && r.con[i + N]) k++;
      if (k >= 3) { this.inter[i] = 1; this.interLista.push(i); }
    }
    r.conLista = l; this._conN = l.length;
    for (const b of c.edif.values()) if (b.t === 'bus' || b.t === 'metro') {
      for (let yy = b.y - 1; yy <= b.y + 2; yy++) for (let xx = b.x - 1; xx <= b.x + 2; xx++) { const i = yy * N + xx; if (xx >= 0 && yy >= 0 && xx < N && yy < N && r.con[i]) { pa.push(i); } }
    }
    this.paradas = pa;
  }
  actualizar(c, dt, noche, opc = {}) {
    const r = c.r;
    if (!r) return;
    this.t += dt;
    if (c.rVer !== this._ver) { this._ver = c.rVer; this.reconstruir(c); }
    const nCon = this._conN || 0, pop = c.s ? c.s.pop : 0, mov = opc.reducirMov ? 0.5 : 1;
    const objCoches = Math.min(Math.floor(this.q.agentes * mov), Math.floor(nCon * 0.4), Math.floor(pop / 5) + (nCon > 8 ? 2 : 0));
    const objPe = Math.min(Math.floor(this.q.agentes * 1.6 * mov), Math.floor(nCon * 0.6), Math.floor(pop / 4)) * (noche > 0.6 ? 0.4 : 1);
    const cb = c.s ? ((c.s.cuenta.bus || 0) + (c.s.cuenta.metro || 0) * 2) : 0;
    const objBus = this.paradas && this.paradas.length ? Math.min(Math.floor(this.q.agentes / 8), Math.ceil(cb * 1.2), 24) : 0;
    while (this.a.length < objCoches) { const n = this.nuevo(c); if (!n) break; this.a.push(n); }
    while (this.p.length < objPe) { const n = this.nuevo(c, null, true); if (!n) break; this.p.push(n); }
    while (this.b.length < objBus) { const n = this.nuevo(c, null, false, this.paradas[Math.floor(Math.random() * this.paradas.length)]); if (!n) break; n.col = COL_BUS[this.b.length % 3]; n.v = 0.8; this.b.push(n); }
    if (this.a.length > objCoches) this.a.length = objCoches;
    if (this.p.length > Math.floor(objPe)) this.p.length = Math.floor(objPe);
    if (this.b.length > objBus) this.b.length = objBus;
    this.fase = Math.floor(this.t / 5) % 2;
    this.mover(c, this.a, dt, false);
    this.mover(c, this.b, dt, false);
    this.mover(c, this.p, dt, true);
    this.escribir(this.coches, this.a, false);
    this.escribir(this.buses, this.b, false);
    this.escribir(this.pe, this.p, true);
    this.escribirSemaforos();
  }
  mover(c, lista, dt, peaton) {
    const fl = c.r.flujo;
    for (let i = lista.length - 1; i >= 0; i--) {
      const a = lista[i];
      if (!c.via[a.y * N + a.x]) { const n = this.nuevo(c, null, peaton); if (n) lista[i] = n; else lista.splice(i, 1); continue; }
      let v = a.v;
      if (!peaton) {
        const ti = a.y * N + a.x, q = fl[ti] / (c.via[ti] === 2 ? 18 : 6);
        v /= 1 + Math.min(2, q) * 1.2;
        if (this.semaforos && a.p > 0.55) {
          const ni = (a.y + DIRS[a.d][1]) * N + a.x + DIRS[a.d][0];
          if (ni >= 0 && ni < N * N && this.inter[ni] && ((a.d & 1) ? 1 : 0) !== this.fase) v = a.p < 0.9 ? v * 0.25 : 0;
        }
      }
      a.p += v * dt;
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
  escribirSemaforos() {
    const L = this.interLista, n = Math.min(L.length, 340), arr = this.sem.instanceMatrix.array;
    let k = 0;
    for (let j = 0; j < n; j++) {
      const i = L[j], x = i % N, y = (i / N) | 0;
      for (let e = 0; e < 2; e++) {
        const o = k * 16;
        arr[o] = 1; arr[o + 1] = 0; arr[o + 2] = 0; arr[o + 3] = 0; arr[o + 4] = 0; arr[o + 5] = 1; arr[o + 6] = 0; arr[o + 7] = 0;
        arr[o + 8] = 0; arr[o + 9] = 0; arr[o + 10] = 1; arr[o + 11] = 0;
        arr[o + 12] = x + (e ? 0.84 : 0.16); arr[o + 13] = 0.04; arr[o + 14] = y + (e ? 0.84 : 0.16); arr[o + 15] = 1;
        this.col.setHex(this.fase === e ? 0x35e07a : 0xff4a4a); this.sem.setColorAt(k, this.col);
        k++;
      }
    }
    this.sem.count = k; this.sem.visible = this.semaforos;
    this.sem.instanceMatrix.needsUpdate = true;
    if (this.sem.instanceColor) this.sem.instanceColor.needsUpdate = true;
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
