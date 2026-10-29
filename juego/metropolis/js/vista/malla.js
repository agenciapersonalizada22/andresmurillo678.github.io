// Constructor de mallas low-poly con colores por vértice (cuerpo) y ventanas aparte (se encienden de noche).
import * as THREE from '../../lib/three.module.min.js';

const cache = {};
export const rgb = (h) => cache[h] || (cache[h] = new THREE.Color(h).toArray());

export class Malla {
  constructor() { this.P = []; this.N = []; this.C = []; this.V = []; this.sc = 1; this.ry = 0; this.px = 0; this.pz = 0; this.dy = 0; }
  pt(p) {
    let x = p[0], z = p[2];
    if (this.ry) {
      const c = Math.cos(this.ry), s = Math.sin(this.ry), dx = x - this.px, dz = z - this.pz;
      x = this.px + dx * c + dz * s; z = this.pz - dx * s + dz * c;
    }
    const k = this.sc;
    return [x * k, (p[1] + this.dy) * k, z * k];
  }
  girar(ang, px, pz) { this.ry = ang; this.px = px; this.pz = pz; return this; }
  libre() { this.ry = 0; return this; }
  tri(a, b, c, col, n) {
    a = this.pt(a); b = this.pt(b); c = this.pt(c);
    let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (n) {
      let o = n;
      if (this.ry) { const cs = Math.cos(this.ry), sn = Math.sin(this.ry); o = [n[0] * cs + n[2] * sn, n[1], -n[0] * sn + n[2] * cs]; }
      if (nx * o[0] + ny * o[1] + nz * o[2] < 0) { const t = b; b = c; c = t; nx = -nx; ny = -ny; nz = -nz; }
    }
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const k = rgb(col);
    this.P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (let i = 0; i < 3; i++) { this.N.push(nx, ny, nz); this.C.push(k[0], k[1], k[2]); }
  }
  quad(a, b, c, d, col, n) { this.tri(a, b, c, col, n); this.tri(a, c, d, col, n); }
  caja(cx, y0, cz, w, h, d, col, sinTapa) {
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y1 = y0 + h;
    if (!sinTapa) this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], col, [0, 1, 0]);
    this.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], col, [1, 0, 0]);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col, [-1, 0, 0]);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col, [0, 0, 1]);
    this.quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], col, [0, 0, -1]);
    return this;
  }
  // cilindro / tronco de cono; seg lados; rTop puede ser 0 (cono)
  cil(cx, y0, cz, r, h, col, seg = 8, rTop = r, rot = 0, colTapa) {
    const y1 = y0 + h;
    for (let i = 0; i < seg; i++) {
      const a0 = rot + (i / seg) * Math.PI * 2, a1 = rot + ((i + 1) / seg) * Math.PI * 2, am = (a0 + a1) / 2;
      const n = [Math.cos(am), (r - rTop) / (h || 1), Math.sin(am)];
      const p0 = [cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], p1 = [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r];
      const q0 = [cx + Math.cos(a0) * rTop, y1, cz + Math.sin(a0) * rTop], q1 = [cx + Math.cos(a1) * rTop, y1, cz + Math.sin(a1) * rTop];
      if (rTop > 0.0001) this.quad(p0, p1, q1, q0, col, n); else this.tri(p0, p1, [cx, y1, cz], col, n);
      if (rTop > 0.0001) this.tri([cx, y1, cz], q0, q1, colTapa || col, [0, 1, 0]);
    }
    return this;
  }
  cono(cx, y0, cz, r, h, col, seg = 6, rot = 0) { return this.cil(cx, y0, cz, r, h, col, seg, 0, rot); }
  // muro circular hueco: cara exterior, interior y tapa
  anillo(cx, y0, cz, rOut, rIn, h, col, seg = 14, colIn) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, am = (a0 + a1) / 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const P = (r, a, y) => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
      this.quad(P(rOut, a0, y0), P(rOut, a1, y0), P(rOut, a1, y0 + h), P(rOut, a0, y0 + h), col, [Math.cos(am), 0, Math.sin(am)]);
      this.quad(P(rIn, a0, y0), P(rIn, a1, y0), P(rIn, a1, y0 + h), P(rIn, a0, y0 + h), colIn || col, [-Math.cos(am), 0, -Math.sin(am)]);
      this.quad(P(rIn, a0, y0 + h), P(rIn, a1, y0 + h), P(rOut, a1, y0 + h), P(rOut, a0, y0 + h), col, [0, 1, 0]);
      void c0; void s0; void c1; void s1;
    }
    return this;
  }
  // grada inclinada entre dos radios
  grada(cx, cz, r0, y0, r1, y1, cols, seg = 14) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, am = (a0 + a1) / 2;
      const P = (r, a, y) => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
      this.quad(P(r0, a0, y0), P(r0, a1, y0), P(r1, a1, y1), P(r1, a0, y1), cols[i % cols.length], [-Math.cos(am) * (y1 - y0), r1 - r0, -Math.sin(am) * (y1 - y0)]);
    }
    return this;
  }
  // techo a cuatro aguas
  techo(cx, y0, cz, w, d, h, col) {
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, a = [cx, y0 + h, cz];
    this.tri([x0, y0, z0], [x0, y0, z1], a, col, [-h, w / 2, 0]);
    this.tri([x1, y0, z0], a, [x1, y0, z1], col, [h, w / 2, 0]);
    this.tri([x0, y0, z1], [x1, y0, z1], a, col, [0, d / 2, h]);
    this.tri([x0, y0, z0], a, [x1, y0, z0], col, [0, d / 2, -h]);
    return this;
  }
  // techo a dos aguas con cumbrera a lo largo de z
  aguas(cx, y0, cz, w, d, h, col, colFrente) {
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, ym = y0 + h;
    this.quad([x0, y0, z0], [x0, y0, z1], [cx, ym, z1], [cx, ym, z0], col, [-h, w / 2, 0]);
    this.quad([x1, y0, z0], [cx, ym, z0], [cx, ym, z1], [x1, y0, z1], col, [h, w / 2, 0]);
    const f = colFrente || col;
    this.tri([x0, y0, z1], [x1, y0, z1], [cx, ym, z1], f, [0, 0, 1]);
    this.tri([x0, y0, z0], [cx, ym, z0], [x1, y0, z0], f, [0, 0, -1]);
    return this;
  }
  // plano horizontal
  suelo(cx, y, cz, w, d, col) {
    this.quad([cx - w / 2, y, cz - d / 2], [cx - w / 2, y, cz + d / 2], [cx + w / 2, y, cz + d / 2], [cx + w / 2, y, cz - d / 2], col, [0, 1, 0]);
    return this;
  }
  // ventana: cuadro en la cara indicada (0:+z 1:+x 2:-z 3:-x)
  vent(cx, cz, w, d, y, ww, wh, cara, off) {
    const e = 0.004;
    let a, b, c, dd;
    if (cara === 0) { const z = cz + d / 2 + e; a = [off - ww / 2, y - wh / 2, z]; b = [off + ww / 2, y - wh / 2, z]; c = [off + ww / 2, y + wh / 2, z]; dd = [off - ww / 2, y + wh / 2, z]; }
    else if (cara === 2) { const z = cz - d / 2 - e; a = [off + ww / 2, y - wh / 2, z]; b = [off - ww / 2, y - wh / 2, z]; c = [off - ww / 2, y + wh / 2, z]; dd = [off + ww / 2, y + wh / 2, z]; }
    else if (cara === 1) { const x = cx + w / 2 + e; a = [x, y - wh / 2, off + ww / 2]; b = [x, y - wh / 2, off - ww / 2]; c = [x, y + wh / 2, off - ww / 2]; dd = [x, y + wh / 2, off + ww / 2]; }
    else { const x = cx - w / 2 - e; a = [x, y - wh / 2, off - ww / 2]; b = [x, y - wh / 2, off + ww / 2]; c = [x, y + wh / 2, off + ww / 2]; dd = [x, y + wh / 2, off - ww / 2]; }
    for (const p of [a, b, c, a, c, dd]) { const q = this.pt(p); this.V.push(q[0], q[1], q[2]); }
  }
  // ventanas en rejilla sobre las caras pedidas
  ventanas(cx, cz, w, d, y0, y1, filas, cols, caras = [0, 1, 2, 3], fw = 0.5, fh = 0.5) {
    for (const f of caras) {
      const largo = f % 2 === 0 ? w : d, c0 = f % 2 === 0 ? cx : cz;
      for (let j = 0; j < filas; j++) for (let i = 0; i < cols; i++) {
        const off = c0 - largo / 2 + (i + 0.5) * (largo / cols);
        const y = y0 + (j + 0.5) * ((y1 - y0) / filas);
        this.vent(cx, cz, w, d, y, (largo / cols) * fw, ((y1 - y0) / filas) * fh, f, off);
      }
    }
  }
  geos() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3));
    let v = null;
    if (this.V.length) { v = new THREE.BufferGeometry(); v.setAttribute('position', new THREE.Float32BufferAttribute(this.V, 3)); }
    return { cuerpo: g, vent: v };
  }
}
