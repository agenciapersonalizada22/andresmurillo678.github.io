// Suelo, agua, árboles, rocas y límites de parcelas.
import * as THREE from '../../lib/three.module.min.js';
import { N, P, NP, parcelaComprable } from '../sim/ciudad.js';
import { hash2 } from '../sim/util.js';
import { modeloArbol } from './modelos.js';

const matLambert = () => new THREE.MeshLambertMaterial({ vertexColors: true });

export class Terreno {
  constructor(scene, calidad) {
    this.scene = scene; this.q = calidad;
    this.grupo = new THREE.Group(); scene.add(this.grupo);
    this.col = null; this.geo = null; this.suelo = null;
    this.t = 0;
    // fondo marino + agua
    const fondo = new THREE.Mesh(new THREE.PlaneGeometry(260, 260).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x1f5c78 }));
    fondo.position.set(N / 2, -0.46, N / 2); this.grupo.add(fondo);
    this.aguaGeo = new THREE.PlaneGeometry(200, 200, 50, 50).rotateX(-Math.PI / 2);
    this.agua = new THREE.Mesh(this.aguaGeo, new THREE.MeshPhongMaterial({ color: 0x3aa6d8, transparent: true, opacity: 0.72, flatShading: true, shininess: 70, specular: 0x9fd8ff, depthWrite: false }));
    this.agua.position.set(N / 2, -0.12, N / 2); this.agua.renderOrder = 1; this.grupo.add(this.agua);
    this.aguaBase = this.aguaGeo.attributes.position.array.slice();
    // árboles
    this.arbMesh = {};
    for (const [k, n] of [['pino', 1800], ['redondo', 1800], ['roca', 400]]) {
      const g = modeloArbol(k).geos().cuerpo;
      const im = new THREE.InstancedMesh(g, matLambert(), n);
      im.frustumCulled = false; im.count = 0;
      im.setColorAt(0, new THREE.Color(1, 1, 1));
      this.grupo.add(im); this.arbMesh[k] = im;
    }
    // bordes
    this.bordes = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 }));
    this.bordes.frustumCulled = false; this.grupo.add(this.bordes);
    // parcelas en venta
    this.matVenta = new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
    this.venta = new THREE.Mesh(new THREE.BufferGeometry(), this.matVenta);
    this.venta.visible = false; this.venta.renderOrder = 2; this.grupo.add(this.venta);
    this.sel = new THREE.Mesh(new THREE.PlaneGeometry(P, P).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }));
    this.sel.visible = false; this.sel.renderOrder = 3; this.grupo.add(this.sel);
    this.capa = null;
  }

  construir(c) {
    if (this.suelo) { this.grupo.remove(this.suelo); this.geo.dispose(); }
    const H = new Float32Array((N + 1) * (N + 1));
    const a = (xx, yy) => (xx < 0 || yy < 0 || xx >= N || yy >= N) ? true : c.terr[yy * N + xx] === 1;
    for (let y = 0; y <= N; y++) for (let x = 0; x <= N; x++) {
      H[y * (N + 1) + x] = a(x - 1, y - 1) && a(x, y - 1) && a(x - 1, y) && a(x, y) ? -0.4 : 0;
    }
    const pos = new Float32Array(N * N * 18), col = new Float32Array(N * N * 18);
    let o = 0;
    const V = (x, y) => H[y * (N + 1) + x];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const a = [x, V(x, y), y], b = [x + 1, V(x + 1, y), y], d = [x, V(x, y + 1), y + 1], e = [x + 1, V(x + 1, y + 1), y + 1];
      for (const p of [a, d, e, a, e, b]) { pos[o++] = p[0]; pos[o++] = p[1]; pos[o++] = p[2]; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    this.geo = g; this.col = col;
    this.suelo = new THREE.Mesh(g, matLambert());
    this.suelo.receiveShadow = true; this.grupo.add(this.suelo);
    this.colorear(c);
    this.bordesDe(c);
    this.arboles(c);
  }

  colorear(c, capa) {
    this.capa = capa || null;
    const col = this.col, r = c.r, tmp = new THREE.Color();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, t = c.terr[i], mia = c.parc[Math.floor(y / P) * NP + Math.floor(x / P)] === 1;
      const v = hash2(x, y, 5), chk = (x + y) & 1 ? 0.97 : 1.03;
      let hx = t === 0 ? 0x6cc16a : t === 2 ? 0xe3d3a2 : t === 3 ? 0x8b909b : 0x3b87a4;
      tmp.setHex(hx);
      let k = (0.92 + v * 0.16) * chk;
      if (t === 1) k = 0.85 + v * 0.2;
      tmp.multiplyScalar(k);
      if (!mia) { tmp.lerp(new THREE.Color(0x35465a), 0.38); tmp.multiplyScalar(0.8); }
      if (capa && r && t !== 1 && t !== 3) {
        let val = -1;
        if (capa === 'energia') val = r.cobE[i] ? 1 : 0;
        else if (capa === 'agua') val = r.cobA[i] ? 1 : 0;
        else if (capa === 'seguridad') val = (r.bomb[i] ? 0.5 : 0) + (r.poli[i] ? 0.5 : 0);
        else if (capa === 'salud') val = r.salud[i] ? 1 : 0;
        else if (capa === 'educacion') val = r.edu[i] ? 1 : 0;
        else if (capa === 'contaminacion') val = 1 - Math.min(1, r.contam[i] / 60);
        else if (capa === 'valor') val = r.valor[i] / 100;
        if (val >= 0) {
          const bueno = new THREE.Color(0x2fd27a), malo = new THREE.Color(0xd9453d);
          tmp.lerp(malo.lerp(bueno, val), mia ? 0.7 : 0.25);
        }
      }
      const base = i * 18;
      for (let j = 0; j < 6; j++) { col[base + j * 3] = tmp.r; col[base + j * 3 + 1] = tmp.g; col[base + j * 3 + 2] = tmp.b; }
    }
    this.geo.attributes.color.needsUpdate = true;
  }

  bordesDe(c) {
    const pos = [], col = [];
    const dueno = (px, py) => (px < 0 || py < 0 || px >= NP || py >= NP) ? 0 : c.parc[py * NP + px];
    const seg = (x0, z0, x1, z1, rgb) => { pos.push(x0, 0.04, z0, x1, 0.04, z1); col.push(...rgb, ...rgb); };
    const BR = [0.24, 0.96, 1.0], DIM = [0.35, 0.45, 0.5], MUY = [0.22, 0.28, 0.34];
    const tono = (a, b) => (a && b ? DIM : a || b ? BR : MUY);
    for (let py = 0; py < NP; py++) for (let px = 0; px < NP; px++) {
      const a = dueno(px, py);
      seg((px + 1) * P, py * P, (px + 1) * P, (py + 1) * P, tono(a, dueno(px + 1, py)));
      seg(px * P, (py + 1) * P, (px + 1) * P, (py + 1) * P, tono(a, dueno(px, py + 1)));
      if (px === 0) seg(0, py * P, 0, (py + 1) * P, tono(a, 0));
      if (py === 0) seg(px * P, 0, (px + 1) * P, 0, tono(a, 0));
    }
    this.bordes.geometry.dispose();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    this.bordes.geometry = g;
  }

  arboles(c) {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const cuentas = { pino: 0, redondo: 0, roca: 0 }, tint = new THREE.Color();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      let k = null;
      if (c.arbol[i] === 1) k = 'pino'; else if (c.arbol[i] === 2) k = 'redondo'; else if (c.terr[i] === 3) k = 'roca';
      if (!k) continue;
      if (k !== 'roca' && this.q.arboles < 1 && hash2(x, y, 99) > this.q.arboles) continue;
      const im = this.arbMesh[k], n = cuentas[k];
      if (n >= im.instanceMatrix.count) continue;
      const h = hash2(x, y, 11), j = hash2(x, y, 12);
      const esc = k === 'roca' ? 0.9 + h * 0.8 : 0.85 + h * 0.4;
      q.setFromAxisAngle(up, j * 6.28);
      p.set(x + 0.5 + (hash2(x, y, 13) - 0.5) * 0.3, 0, y + 0.5 + (hash2(x, y, 14) - 0.5) * 0.3);
      s.set(esc, esc * (0.9 + h * 0.3), esc);
      m4.compose(p, q, s); im.setMatrixAt(n, m4);
      const mia = c.parc[Math.floor(y / P) * NP + Math.floor(x / P)] === 1;
      const br = (mia ? 1 : 0.62) * (0.9 + hash2(x, y, 15) * 0.2);
      tint.setRGB(br, br, br); im.setColorAt(n, tint);
      cuentas[k]++;
    }
    for (const k in this.arbMesh) {
      const im = this.arbMesh[k]; im.count = cuentas[k];
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  }

  ventas(c, on, selPx, selPy) {
    this.venta.visible = !!on;
    if (!on) { this.sel.visible = false; return; }
    const pos = [];
    for (let py = 0; py < NP; py++) for (let px = 0; px < NP; px++) {
      if (!parcelaComprable(c, px, py)) continue;
      const x0 = px * P + 0.2, x1 = (px + 1) * P - 0.2, z0 = py * P + 0.2, z1 = (py + 1) * P - 0.2;
      pos.push(x0, 0.06, z0, x0, 0.06, z1, x1, 0.06, z1, x0, 0.06, z0, x1, 0.06, z1, x1, 0.06, z0);
    }
    this.venta.geometry.dispose();
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.venta.geometry = g;
    if (selPx != null && selPx >= 0) { this.sel.visible = true; this.sel.position.set(selPx * P + P / 2, 0.08, selPy * P + P / 2); } else this.sel.visible = false;
  }

  animar(dt, activo) {
    this.t += dt;
    this.matVenta.opacity = 0.3 + 0.15 * Math.sin(this.t * 3);
    if (!activo) return;
    this.frame = (this.frame || 0) + 1;
    if (this.frame & 1) return;
    const a = this.aguaGeo.attributes.position, base = this.aguaBase, t = this.t;
    for (let i = 0; i < a.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      a.array[i * 3 + 1] = Math.sin(x * 0.45 + t * 1.3) * 0.035 + Math.cos(z * 0.5 + t * 1.1) * 0.035;
    }
    a.needsUpdate = true;
  }
}
