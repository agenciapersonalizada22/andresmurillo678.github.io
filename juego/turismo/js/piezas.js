// Piezas procedurales: fichas de viaje, edificios y dados.
import * as THREE from '../lib/three.module.min.js';

const geoms = {}, cache = {};
const G = (C, ...a) => cache[C.name + a.join()] || (cache[C.name + a.join()] = new C(...a));
const caja = (w, h, d) => G(THREE.BoxGeometry, w, h, d);
const cil = (a, b, h, n) => G(THREE.CylinderGeometry, a, b, h, n || 14);
function mat(color, extra) { const k = 'm' + color + JSON.stringify(extra || {}); return cache[k] || (cache[k] = new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {}))); }
function malla(g, m, x, y, z) { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; return o; }

export const FORMAS = ['Avión', 'Maleta', 'Barco', 'Cámara', 'Sombrero', 'Brújula'];
export function crearFicha(forma, color) {
  const g = new THREE.Group(), m = mat(color), b = mat('#f4f1e8'), osc = mat('#222');
  switch (forma % 6) {
    case 0: { // avion
      const f = malla(cil(0.07, 0.05, 0.62, 10), m, 0, 0.2, 0); f.rotation.z = Math.PI / 2; g.add(f);
      g.add(malla(caja(0.2, 0.025, 0.62), b, 0.02, 0.2, 0)); g.add(malla(caja(0.1, 0.1, 0.02), m, -0.27, 0.28, 0)); g.add(malla(caja(0.1, 0.02, 0.24), b, -0.27, 0.22, 0));
      g.add(malla(G(THREE.ConeGeometry, 0.06, 0.12, 10), osc, 0.36, 0.2, 0).rotateZ(-Math.PI / 2)); g.add(malla(cil(0.12, 0.14, 0.05), b, 0, 0.03, 0));
      break;
    }
    case 1: { // maleta
      g.add(malla(caja(0.3, 0.34, 0.14), m, 0, 0.2, 0)); g.add(malla(caja(0.1, 0.05, 0.05), osc, 0, 0.4, 0));
      g.add(malla(caja(0.32, 0.04, 0.16), b, 0, 0.2, 0)); g.add(malla(cil(0.025, 0.025, 0.05, 6), osc, -0.1, 0.02, 0)); g.add(malla(cil(0.025, 0.025, 0.05, 6), osc, 0.1, 0.02, 0));
      break;
    }
    case 2: {
      g.add(malla(caja(0.5, 0.12, 0.22), m, 0, 0.1, 0)); g.add(malla(cil(0.015, 0.015, 0.4, 6), b, 0, 0.36, 0));
      { const v = malla(G(THREE.ConeGeometry, 0.17, 0.32, 3), b, 0.03, 0.36, 0); v.rotation.y = Math.PI / 2; v.scale.z = 0.25; g.add(v); }
      break;
    }
    case 3: { // camara
      g.add(malla(caja(0.34, 0.22, 0.2), m, 0, 0.17, 0)); const l = malla(cil(0.085, 0.085, 0.12, 14), osc, 0, 0.17, 0.15); l.rotation.x = Math.PI / 2; g.add(l);
      g.add(malla(caja(0.1, 0.05, 0.08), b, -0.09, 0.31, 0)); g.add(malla(cil(0.05, 0.05, 0.02, 10), b, 0.1, 0.29, 0));
      break;
    }
    case 4: { // sombrero de explorador
      g.add(malla(cil(0.27, 0.27, 0.03, 18), m, 0, 0.04, 0)); g.add(malla(cil(0.14, 0.17, 0.2, 16), m, 0, 0.16, 0)); g.add(malla(cil(0.175, 0.175, 0.04, 16), b, 0, 0.1, 0));
      break;
    }
    default: { // brujula
      g.add(malla(cil(0.2, 0.22, 0.08, 20), m, 0, 0.06, 0)); g.add(malla(cil(0.16, 0.16, 0.02, 20), b, 0, 0.11, 0));
      const a = malla(caja(0.04, 0.02, 0.26), mat('#d33'), 0, 0.13, 0); a.rotation.y = 0.7; g.add(a); g.add(malla(cil(0.04, 0.04, 0.1, 8), osc, 0, 0.2, -0.24));
    }
  }
  return g;
}

// atraccion (1-3) segun continente: torre, cupula, estadio; y hotel resort
export function crearAtraccion(color, nivel) {
  const g = new THREE.Group(), m = mat(color), b = mat('#f4f1e8');
  if (nivel === 1) { g.add(malla(caja(0.26, 0.16, 0.26), b, 0, 0.08, 0)); g.add(malla(G(THREE.ConeGeometry, 0.2, 0.14, 4), m, 0, 0.23, 0).rotateY(Math.PI / 4)); }
  else if (nivel === 2) { g.add(malla(cil(0.16, 0.18, 0.12, 12), b, 0, 0.06, 0)); g.add(malla(G(THREE.SphereGeometry, 0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, 0.12, 0)); g.add(malla(cil(0.012, 0.012, 0.2, 5), b, 0, 0.35, 0)); }
  else { g.add(malla(cil(0.22, 0.2, 0.14, 16), b, 0, 0.07, 0)); g.add(malla(G(THREE.TorusGeometry, 0.2, 0.03, 6, 16), m, 0, 0.15, 0).rotateX(Math.PI / 2)); }
  return g;
}
export function crearHotel(color) {
  const g = new THREE.Group(), m = mat(color);
  g.add(malla(caja(0.46, 0.44, 0.3), mat('#f4f1e8'), 0, 0.22, 0)); g.add(malla(caja(0.5, 0.05, 0.34), m, 0, 0.46, 0));
  g.add(malla(caja(0.16, 0.2, 0.16), m, 0, 0.58, 0)); g.add(malla(caja(0.12, 0.08, 0.02), mat('#ffe27a'), 0, 0.24, 0.16));
  return g;
}

function carasDado() {
  const pos = { 1: [[0.5, 0.5]], 2: [[0.25, 0.25], [0.75, 0.75]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]], 4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]], 6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5], [0.25, 0.75], [0.75, 0.75]] };
  const orden = [3, 4, 1, 6, 2, 5]; // +x -x +y -y +z -z
  return orden.map((n) => {
    const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d');
    x.fillStyle = '#f7f3e6'; x.fillRect(0, 0, 96, 96); x.strokeStyle = '#cfc8b0'; x.lineWidth = 4; x.strokeRect(2, 2, 92, 92);
    x.fillStyle = n === 1 ? '#1f7fc4' : '#1a1a1a';
    pos[n].forEach((p) => { x.beginPath(); x.arc(p[0] * 96, p[1] * 96, n === 1 ? 13 : 9, 0, 7); x.fill(); });
    const t = new THREE.CanvasTexture(c); t.anisotropy = 2; return new THREE.MeshLambertMaterial({ map: t });
  });
}
export function crearDado() {
  geoms.dado = geoms.dado || { g: G(THREE.BoxGeometry, 0.62, 0.62, 0.62), m: carasDado() };
  const d = new THREE.Mesh(geoms.dado.g, geoms.dado.m); d.castShadow = true; return d;
}
// rotacion que deja la cara `v` hacia arriba
export function rotacionDado(v, yaw) {
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  if (v === 6) e.set(Math.PI, 0, 0); else if (v === 3) e.set(0, 0, Math.PI / 2); else if (v === 4) e.set(0, 0, -Math.PI / 2); else if (v === 2) e.set(-Math.PI / 2, 0, 0); else if (v === 5) e.set(Math.PI / 2, 0, 0);
  q.setFromEuler(e); return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw || 0).multiply(q);
}
