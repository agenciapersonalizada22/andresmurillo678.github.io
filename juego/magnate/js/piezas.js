// Piezas procedurales: fichas, casas, hoteles y dados.
import * as THREE from '../lib/three.module.min.js';

const geoms = {};
const caja = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function mat(color, extra) { return new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {})); }
function malla(g, m, x, y, z) { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; return o; }

export const FORMAS = ['Coche', 'Sombrero', 'Barco', 'Peón', 'Cubo', 'Estrella'];
export function crearFicha(forma, color) {
  const g = new THREE.Group(), m = mat(color), b = mat('#f4f1e8'), osc = mat('#222');
  switch (forma % 6) {
    case 0:
      g.add(malla(caja(0.5, 0.14, 0.26), m, 0, 0.14, 0)); g.add(malla(caja(0.26, 0.12, 0.22), b, -0.02, 0.26, 0));
      [[-0.15, 0.13], [0.15, 0.13], [-0.15, -0.13], [0.15, -0.13]].forEach((p) => { const r = malla(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), osc, p[0], 0.07, p[1]); r.rotation.x = Math.PI / 2; g.add(r); });
      break;
    case 1:
      g.add(malla(new THREE.CylinderGeometry(0.27, 0.27, 0.04, 16), m, 0, 0.04, 0)); g.add(malla(new THREE.CylinderGeometry(0.16, 0.18, 0.28, 16), m, 0, 0.2, 0)); g.add(malla(new THREE.CylinderGeometry(0.185, 0.185, 0.05, 16), b, 0, 0.12, 0));
      break;
    case 2:
      g.add(malla(caja(0.5, 0.12, 0.22), m, 0, 0.1, 0)); g.add(malla(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), b, 0, 0.36, 0));
      { const v = malla(new THREE.ConeGeometry(0.17, 0.32, 3), b, 0.03, 0.36, 0); v.rotation.y = Math.PI / 2; v.scale.z = 0.25; g.add(v); }
      break;
    case 3:
      g.add(malla(new THREE.CylinderGeometry(0.2, 0.25, 0.06, 14), m, 0, 0.03, 0)); g.add(malla(new THREE.ConeGeometry(0.17, 0.4, 14), m, 0, 0.26, 0)); g.add(malla(new THREE.SphereGeometry(0.12, 14, 10), b, 0, 0.5, 0));
      break;
    case 4:
      { const c = malla(caja(0.3, 0.3, 0.3), m, 0, 0.2, 0); c.rotation.y = 0.6; g.add(c); g.add(malla(caja(0.1, 0.1, 0.1), b, 0, 0.2, 0.17)); }
      break;
    default:
      { const t = malla(new THREE.OctahedronGeometry(0.24), m, 0, 0.34, 0); t.scale.y = 1.4; g.add(t); g.add(malla(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 12), b, 0, 0.03, 0)); }
  }
  return g;
}

export function crearCasa() {
  geoms.casa = geoms.casa || [caja(0.2, 0.15, 0.2), new THREE.ConeGeometry(0.17, 0.12, 4)];
  const g = new THREE.Group(), cuerpo = malla(geoms.casa[0], mat('#2fbf5a'), 0, 0.075, 0), techo = malla(geoms.casa[1], mat('#c43d2f'), 0, 0.21, 0);
  techo.rotation.y = Math.PI / 4; g.add(cuerpo, techo); return g;
}
export function crearHotel() {
  const g = new THREE.Group();
  g.add(malla(caja(0.62, 0.3, 0.3), mat('#d63a3a'), 0, 0.15, 0)); g.add(malla(caja(0.66, 0.06, 0.34), mat('#7a1c1c'), 0, 0.33, 0));
  g.add(malla(caja(0.12, 0.12, 0.12), mat('#f4f1e8'), 0.18, 0.4, 0));
  return g;
}

function carasDado() {
  const pos = { 1: [[0.5, 0.5]], 2: [[0.25, 0.25], [0.75, 0.75]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]], 4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]], 6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5], [0.25, 0.75], [0.75, 0.75]] };
  const orden = [3, 4, 1, 6, 2, 5]; // +x -x +y -y +z -z
  return orden.map((n) => {
    const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d');
    x.fillStyle = '#f7f3e6'; x.fillRect(0, 0, 96, 96); x.strokeStyle = '#cfc8b0'; x.lineWidth = 4; x.strokeRect(2, 2, 92, 92);
    x.fillStyle = n === 1 ? '#c4372c' : '#1a1a1a';
    pos[n].forEach((p) => { x.beginPath(); x.arc(p[0] * 96, p[1] * 96, n === 1 ? 13 : 9, 0, 7); x.fill(); });
    const t = new THREE.CanvasTexture(c); t.anisotropy = 2; return new THREE.MeshLambertMaterial({ map: t });
  });
}
export function crearDado() {
  geoms.dado = geoms.dado || { g: new THREE.BoxGeometry(0.62, 0.62, 0.62), m: carasDado() };
  const d = new THREE.Mesh(geoms.dado.g, geoms.dado.m); d.castShadow = true; return d;
}
// rotacion que deja la cara `v` hacia arriba
export function rotacionDado(v, yaw) {
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  if (v === 6) e.set(Math.PI, 0, 0); else if (v === 3) e.set(0, 0, Math.PI / 2); else if (v === 4) e.set(0, 0, -Math.PI / 2); else if (v === 2) e.set(-Math.PI / 2, 0, 0); else if (v === 5) e.set(Math.PI / 2, 0, 0);
  q.setFromEuler(e); return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw || 0).multiply(q);
}
