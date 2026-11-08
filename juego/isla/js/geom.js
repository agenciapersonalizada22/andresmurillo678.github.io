import * as THREE from '../lib/three.module.min.js';
/* Fusiona primitivas en una sola geometria (flat shading) con color por vertice: partes = [{g, c, m?}] */
export function fusion(partes) {
  const pos = [], nor = [], col = [], c = new THREE.Color();
  for (const p of partes) {
    let g = p.g.index ? p.g.toNonIndexed() : p.g.clone();
    if (p.m) g.applyMatrix4(p.m);
    g.computeVertexNormals();
    const a = g.attributes.position.array, n = g.attributes.normal.array; c.set(p.c);
    for (let i = 0; i < a.length; i++) { pos.push(a[i]); nor.push(n[i]); }
    for (let i = 0; i < a.length / 3; i++) col.push(c.r, c.g, c.b);
    g.dispose();
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  r.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  r.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return r;
}
export const T = (x, y, z, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
export const cono = (r, h, s = 6) => new THREE.ConeGeometry(r, h, s);
export const cil = (r1, r2, h, s = 6) => new THREE.CylinderGeometry(r1, r2, h, s);
export const caja = (x, y, z) => new THREE.BoxGeometry(x, y, z);
export const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
