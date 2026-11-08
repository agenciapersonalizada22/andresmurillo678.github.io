// Render del mundo: terreno, agua, edificios (una sola instancia) y objetos en trozos con instancing, culling por distancia y LOD.
import * as THREE from '../lib/three.module.min.js';
import { crearTerreno, MITAD, N, PASO, COL_BIOMA } from './terreno.js';
import { fusion, T as Tm, cono, cil, caja, ico } from './geom.js';
import { hash2 } from './util.js';

const CH = 160, NCH = Math.ceil(800 / CH);
const MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
function geos() {
  const pino = fusion([{ g: cil(0.28, 0.34, 2), c: 0x6b4a2b, m: Tm(0, 1, 0) }, { g: cono(2.3, 2.4, 7), c: 0x2e6b34, m: Tm(0, 3.2, 0) }, { g: cono(1.8, 2.2, 7), c: 0x347a3a, m: Tm(0, 4.7, 0) }, { g: cono(1.2, 2, 7), c: 0x3a8a41, m: Tm(0, 6, 0) }]);
  const pinoLo = fusion([{ g: cono(2.1, 6.5, 5), c: 0x2f6d35, m: Tm(0, 3.6, 0) }]);
  const roble = fusion([{ g: cil(0.3, 0.4, 2.6), c: 0x6b4a2b, m: Tm(0, 1.3, 0) }, { g: ico(2.1), c: 0x4f9a3e, m: Tm(0, 4, 0, 1, 0.85, 1) }, { g: ico(1.4), c: 0x5aa84a, m: Tm(1, 3.4, 0.5) }]);
  const robleLo = fusion([{ g: ico(2.1), c: 0x4f9a3e, m: Tm(0, 4, 0, 1, 0.85, 1) }]);
  const cactus = fusion([{ g: cil(0.4, 0.4, 3), c: 0x4c8a3c, m: Tm(0, 1.5, 0) }, { g: cil(0.22, 0.22, 1.2), c: 0x4c8a3c, m: Tm(0.7, 1.9, 0) }, { g: cil(0.22, 0.22, 0.8), c: 0x4c8a3c, m: Tm(-0.65, 1.6, 0) }]);
  const cactusLo = fusion([{ g: caja(0.8, 3, 0.8), c: 0x4c8a3c, m: Tm(0, 1.5, 0) }]);
  const roca = fusion([{ g: ico(1.1), c: 0x8b8a86, m: Tm(0, 0.6, 0, 1, 0.75, 1) }, { g: ico(0.7), c: 0x9a9893, m: Tm(0.9, 0.3, 0.3) }]);
  const cajaM = fusion([{ g: caja(2.4, 2.4, 4), c: 0xffffff, m: Tm(0, 1.2, 0) }, { g: caja(2.5, 0.2, 4.1), c: 0xbbbbbb, m: Tm(0, 2.4, 0) }]);
  const auto = fusion([{ g: caja(1.8, 0.7, 3.6), c: 0xffffff, m: Tm(0, 0.65, 0) }, { g: caja(1.6, 0.6, 1.8), c: 0xd8e8f0, m: Tm(0, 1.25, -0.2) }, { g: caja(1.9, 0.4, 3.2), c: 0x222222, m: Tm(0, 0.25, 0) }]);
  return { pino: [pino, pinoLo], roble: [roble, robleLo], cactus: [cactus, cactusLo], roca: [roca, roca], rocag: [roca, roca], caja: [cajaM, cajaM], auto: [auto, auto] };
}
const TINTES = { caja: [0xc0392b, 0x2e6fb5, 0xd98a1f, 0x3d8f5a], auto: [0xb0b8c0, 0xc0392b, 0x2e6fb5, 0xe8c12e] };
const ARBOLES = new Set(['pino', 'roble', 'cactus']);

export function crearMundo(sem, aj) {
  const T = crearTerreno(sem), grupo = new THREE.Group(), tmp = new THREE.Object3D(), c = new THREE.Color();
  /* terreno */
  const k = aj.dist <= 300 ? 4 : aj.dist <= 600 ? 2 : 1, M = (N - 1) / k + 1, pos = new Float32Array(M * M * 3), col = new Float32Array(M * M * 3);
  for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
    const x = -MITAD + i * PASO * k, z = -MITAD + j * PASO * k, h = T.g[j * k * N + i * k], b = T.bioma(x, z, h), o = (j * M + i) * 3;
    pos[o] = x; pos[o + 1] = h; pos[o + 2] = z;
    const pend = Math.abs(T.altura(x + 3, z) - h) + Math.abs(T.altura(x, z + 3) - h), v = 0.9 + hash2(i, j, sem) * 0.18;
    c.setHex(COL_BIOMA[b]); if (h < 1.2) c.lerp(new THREE.Color(0x9a8a60), 0.5); if (pend > 4.5 && b !== 4) c.lerp(new THREE.Color(0x8a867e), Math.min(0.7, (pend - 4.5) / 6));
    col[o] = c.r * v; col[o + 1] = c.g * v; col[o + 2] = c.b * v;
  }
  const idx = new Uint32Array((M - 1) * (M - 1) * 6); let q = 0;
  for (let j = 0; j < M - 1; j++) for (let i = 0; i < M - 1; i++) { const a = j * M + i, b = a + 1, d = a + M, e = d + 1; idx[q++] = a; idx[q++] = d; idx[q++] = b; idx[q++] = b; idx[q++] = d; idx[q++] = e; }
  const gt = new THREE.BufferGeometry(); gt.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gt.setAttribute('color', new THREE.BufferAttribute(col, 3)); gt.setIndex(new THREE.BufferAttribute(idx, 1)); gt.computeVertexNormals();
  const terreno = new THREE.Mesh(gt, new THREE.MeshLambertMaterial({ vertexColors: true })); terreno.receiveShadow = true; grupo.add(terreno);
  const agua = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshLambertMaterial({ color: 0x2a8ec0, transparent: true, opacity: 0.82 }));
  agua.rotation.x = -Math.PI / 2; agua.position.y = -0.1; grupo.add(agua);
  /* edificios: una sola malla instanciada */
  const cb = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, T.cajas.length));
  T.cajas.forEach((b, i) => { tmp.position.set((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2); tmp.scale.set(b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0); tmp.rotation.set(0, 0, 0); tmp.updateMatrix(); cb.setMatrixAt(i, tmp.matrix); cb.setColorAt(i, c.set(b.c)); });
  cb.frustumCulled = false; cb.castShadow = cb.receiveShadow = true; grupo.add(cb);
  /* objetos por trozos con LOD */
  const G = geos(), chunks = [];
  const porChunk = new Map();
  T.objetos.forEach((o, i) => { const ci = Math.min(NCH - 1, Math.floor((o.x + MITAD) / CH)), cj = Math.min(NCH - 1, Math.floor((o.z + MITAD) / CH)), key = cj * NCH + ci; if (!porChunk.has(key)) porChunk.set(key, []); porChunk.get(key).push(i); });
  porChunk.forEach((lista, key) => {
    const ch = { cx: (key % NCH + 0.5) * CH - MITAD, cz: (Math.floor(key / NCH) + 0.5) * CH - MITAD, meshes: {} };
    const tipos = {}; lista.forEach((i) => { (tipos[T.objetos[i].t] = tipos[T.objetos[i].t] || []).push(i); });
    for (const t in tipos) {
      const ids = tipos[t], mk = (geo) => { const m = new THREE.InstancedMesh(geo, MAT, ids.length); m.castShadow = true; return m; };
      const mh = mk(G[t][0]), ml = G[t][1] === G[t][0] ? null : mk(G[t][1]);
      ids.forEach((i, n) => {
        const o = T.objetos[i]; tmp.position.set(o.x, o.y - 0.05, o.z); tmp.rotation.set(0, o.rot, 0); tmp.scale.setScalar(o.s); tmp.updateMatrix();
        mh.setMatrixAt(n, tmp.matrix); if (ml) ml.setMatrixAt(n, tmp.matrix);
        const tn = TINTES[t]; c.setHex(tn ? tn[(i * 7) % tn.length] : 0xffffff); c.multiplyScalar(0.88 + hash2(i, 3, sem) * 0.2); mh.setColorAt(n, c); if (ml) ml.setColorAt(n, c);
        o.mi = { ch, t, n };
      });
      mh.computeBoundingSphere(); grupo.add(mh); if (ml) { ml.computeBoundingSphere(); grupo.add(ml); }
      ch.meshes[t] = { hi: mh, lo: ml, arb: ARBOLES.has(t) };
    }
    chunks.push(ch);
  });
  const cero = new THREE.Matrix4().makeScale(0, 0, 0);
  const API = {
    T, grupo, chunks,
    actualizar(cam) {
      const d0 = aj.dist, veg = Math.max(0.35, aj.vegetacion || 1);
      for (const ch of chunks) {
        const d = Math.hypot(cam.x - ch.cx, cam.z - ch.cz) - 113, vis = d < d0, hi = d < 150;
        for (const t in ch.meshes) {
          const m = ch.meshes[t], ok = vis && (!m.arb || d < d0 * veg);
          if (m.lo) { m.hi.visible = ok && hi; m.lo.visible = ok && !hi; } else m.hi.visible = ok;
        }
      }
    },
    destruirObjeto(i) {
      const o = T.objetos[i]; if (!o || !o.vivo) return false;
      o.vivo = false;
      if (o.mi) { const { hi: mh, lo: ml } = o.mi.ch.meshes[o.mi.t]; mh.setMatrixAt(o.mi.n, cero); mh.instanceMatrix.needsUpdate = true; if (ml) { ml.setMatrixAt(o.mi.n, cero); ml.instanceMatrix.needsUpdate = true; } }
      return true;
    },
    minimapa(tam = 256) {
      const cv = document.createElement('canvas'); cv.width = cv.height = tam; const g = cv.getContext('2d'), im = g.createImageData(tam, tam), e = 800 / tam;
      for (let j = 0; j < tam; j++) for (let i = 0; i < tam; i++) {
        const x = -MITAD + (i + 0.5) * e, z = -MITAD + (j + 0.5) * e, h = T.altura(x, z), o = (j * tam + i) * 4;
        let r = 40, gg = 110, b = 160;
        if (h > -0.3) { c.setHex(COL_BIOMA[T.bioma(x, z, h)]); const s = 0.8 + Math.min(0.35, h / 90); r = c.r * 255 * s; gg = c.g * 255 * s; b = c.b * 255 * s; } else if (h > -2.5) { r = 80; gg = 160; b = 200; }
        im.data[o] = r; im.data[o + 1] = gg; im.data[o + 2] = b; im.data[o + 3] = 255;
      }
      g.putImageData(im, 0, 0); return cv;
    },
    dispose() { grupo.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose && o.material !== MAT) o.material.dispose(); }); }
  };
  return API;
}
