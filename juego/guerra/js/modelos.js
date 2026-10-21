// Modelos 3D hechos con formas simples. Geometrías y materiales se comparten.
import * as THREE from '../lib/three.module.min.js';

const mats = new Map();
export function mat(color, extra = {}) {
  const clave = color + JSON.stringify(extra);
  let m = mats.get(clave);
  if (!m) {
    m = extra.basico
      ? new THREE.MeshBasicMaterial({ color, transparent: !!extra.aditivo, blending: extra.aditivo ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !extra.aditivo })
      : new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
    mats.set(clave, m);
  }
  return m;
}

const geos = {};
const G = (n, f) => geos[n] || (geos[n] = f());
const malla = (g, m, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  return o;
};

// ---- Avión (nariz hacia -Z)
function geoAla() {
  const s = new THREE.Shape();
  s.moveTo(0, -1.4); s.lineTo(4.6, 0.7); s.lineTo(4.6, 1.8); s.lineTo(0, 1.8); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false });
  g.rotateX(Math.PI / 2);
  return g;
}

export function crearAvion(cuerpo, ala) {
  const g = new THREE.Group();
  const mc = mat(cuerpo), ma = mat(ala);
  g.add(malla(G('avFus', () => new THREE.CylinderGeometry(0.34, 0.68, 6.2, 10).rotateX(Math.PI / 2)), mc, 0, 0, 0.4));
  g.add(malla(G('avNariz', () => new THREE.ConeGeometry(0.68, 2.4, 10).rotateX(-Math.PI / 2)), mc, 0, 0, -3.9));
  const wa = G('avAla', geoAla);
  const d = malla(wa, ma, 0.4, 0, 0.2);
  const i = malla(wa, ma, -0.4, 0, 0.2);
  i.scale.x = -1;
  g.add(d, i);
  const cola = G('avCola', () => geoAla().scale(0.42, 1, 0.5));
  const td = malla(cola, ma, 0.3, 0.05, 3.1);
  const ti = malla(cola, ma, -0.3, 0.05, 3.1);
  ti.scale.x = -1;
  g.add(td, ti);
  g.add(malla(G('avAleta', () => new THREE.BoxGeometry(0.12, 1.7, 1.6)), ma, 0, 0.9, 3.0));
  const cab = malla(G('avCab', () => new THREE.SphereGeometry(0.5, 10, 8)), mat(0x8fe3ff, { emissive: 0x113344 }), 0, 0.55, -1.4);
  cab.scale.set(1, 0.8, 2.2);
  g.add(cab);
  const llama = malla(G('avLlama', () => new THREE.ConeGeometry(0.4, 3, 8).rotateX(Math.PI / 2)), mat(0xff9a30, { basico: true, aditivo: true }), 0, 0, 5.2);
  g.add(llama);
  g.userData.llama = llama;
  return g;
}

// ---- Tanque (cañón hacia -Z)
export function crearTanque(color, escala = 1) {
  const grupo = new THREE.Group();
  const casco = new THREE.Group();
  grupo.add(casco);
  const mc = mat(color), md = mat(0x26282a), mo = mat(new THREE.Color(color).multiplyScalar(0.8).getHex());
  casco.add(malla(G('tqCasco', () => new THREE.BoxGeometry(3, 0.9, 5.6)), mc, 0, 1.0, 0.1));
  const frente = malla(G('tqFrente', () => new THREE.BoxGeometry(3, 0.9, 1.6)), mo, 0, 0.95, -3.0);
  frente.rotation.x = 0.45;
  casco.add(frente);
  const oruga = G('tqOruga', () => new THREE.BoxGeometry(0.85, 1.1, 6.6));
  casco.add(malla(oruga, md, 1.75, 0.6, 0), malla(oruga, md, -1.75, 0.6, 0));
  const rueda = G('tqRueda', () => new THREE.CylinderGeometry(0.5, 0.5, 0.95, 10).rotateZ(Math.PI / 2));
  for (const x of [1.75, -1.75]) for (let z = -2.6; z <= 2.7; z += 1.3) casco.add(malla(rueda, mat(0x3a3d40), x, 0.55, z));
  const torreta = new THREE.Group();
  torreta.position.set(0, 1.45, 0.2);
  torreta.add(malla(G('tqTorre', () => new THREE.BoxGeometry(2.2, 0.85, 2.6)), mc, 0, 0.42, 0));
  torreta.add(malla(G('tqTapa', () => new THREE.CylinderGeometry(0.5, 0.55, 0.3, 10)), mo, 0.3, 1.0, 0.4));
  const canon = new THREE.Group();
  canon.position.set(0, 0.5, -1.25);
  canon.add(malla(G('tqTubo', () => new THREE.CylinderGeometry(0.13, 0.16, 4.4, 8).rotateX(Math.PI / 2)), md, 0, 0, -2.0));
  const boca = new THREE.Object3D();
  boca.position.set(0, 0, -4.3);
  canon.add(boca);
  torreta.add(canon);
  grupo.add(torreta);
  grupo.scale.setScalar(escala);
  return { grupo, casco, torreta, canon, boca };
}

// ---- Objetivos terrestres
export function crearObjetivo(tipo) {
  const g = new THREE.Group();
  let cabeza = null;
  if (tipo === 'antiaerea') {
    g.add(malla(G('aaBase', () => new THREE.CylinderGeometry(2.6, 3.2, 1.4, 10)), mat(0x5a5f55), 0, 0.7, 0));
    cabeza = new THREE.Group();
    cabeza.position.y = 2;
    cabeza.add(malla(G('aaCab', () => new THREE.BoxGeometry(2, 1.1, 2)), mat(0x6c7364), 0, 0, 0));
    const tubo = G('aaTubo', () => new THREE.CylinderGeometry(0.12, 0.14, 3.2, 6).rotateX(Math.PI / 2));
    const a = malla(tubo, mat(0x2a2c2e), 0.55, 0.5, -2);
    const b = malla(tubo, mat(0x2a2c2e), -0.55, 0.5, -2);
    a.rotation.x = b.rotation.x = 0.5;
    cabeza.add(a, b);
    g.add(cabeza);
  } else if (tipo === 'deposito') {
    g.add(malla(G('dpCil', () => new THREE.CylinderGeometry(3.6, 3.6, 5, 14)), mat(0xd7d2c4), 0, 2.5, 0));
    g.add(malla(G('dpTapa', () => new THREE.CylinderGeometry(3.7, 3.7, 0.6, 14)), mat(0xc0392b), 0, 5.2, 0));
  } else if (tipo === 'camion') {
    g.add(malla(G('cmCaja', () => new THREE.BoxGeometry(2.6, 2.3, 5)), mat(0x59623f), 0, 1.7, 0.8));
    g.add(malla(G('cmCab', () => new THREE.BoxGeometry(2.6, 1.9, 1.8)), mat(0x4a5233), 0, 1.5, -2.5));
    g.add(malla(G('cmBase', () => new THREE.BoxGeometry(2.4, 0.5, 7.2)), mat(0x22252a), 0, 0.5, 0));
  } else {
    g.add(malla(G('rdBase', () => new THREE.BoxGeometry(5, 1.6, 5)), mat(0x707a80), 0, 0.8, 0));
    cabeza = new THREE.Group();
    cabeza.position.y = 2.6;
    const plato = malla(G('rdPlato', () => new THREE.SphereGeometry(2.6, 12, 6, 0, Math.PI * 2, 0, 1.1)), mat(0xdfe6e8), 0, 0, 0);
    plato.rotation.x = -1.1;
    cabeza.add(plato);
    g.add(cabeza);
  }
  return { grupo: g, cabeza };
}

// ---- Proyectiles
export function geoTrazadora() { return G('trazadora', () => new THREE.BoxGeometry(0.16, 0.16, 6)); }
export function geoMisil() {
  return G('misil', () => {
    const c = new THREE.CylinderGeometry(0.14, 0.14, 2.6, 6).rotateX(Math.PI / 2);
    return c;
  });
}
export function geoBomba() { return G('bomba', () => new THREE.CylinderGeometry(0.36, 0.3, 1.8, 8).rotateX(Math.PI / 2)); }
export function geoObus() { return G('obus', () => new THREE.BoxGeometry(0.28, 0.28, 2.4)); }
export function geoFlak() { return G('flak', () => new THREE.SphereGeometry(0.5, 8, 6)); }
