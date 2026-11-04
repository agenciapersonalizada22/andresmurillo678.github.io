// Modelos extra de aviones (monoplano de hélice, jets, bombarderos, helicópteros).
// Se registran en MODELOS_AVION; el morro apunta a -Z.
import * as THREE from '../lib/three.module.min.js';
import { MODELOS_AVION, mat, G, malla, caja, cilZ, conoN, par, cabina, llamaEn, geoAlaGen, OSCURO } from './modelos.js';

function llamaVacia(g, z = 4) {
  const l = new THREE.Group();
  l.position.z = z;
  g.add(l);
  g.userData.llama = l;
}

function helice(g, x, y, z, r = 1.7, aspas = 2) {
  const h = new THREE.Group();
  h.position.set(x, y, z);
  for (let i = 0; i < aspas; i++) {
    const a = malla(caja(0.18, r * 2, 0.05), OSCURO(), 0, 0, 0);
    a.rotation.z = (i * Math.PI) / aspas;
    h.add(a);
  }
  h.add(malla(G('hubo', () => new THREE.SphereGeometry(0.22, 8, 6)), mat(0xb0b0b0), 0, 0, -0.05));
  g.add(h);
  return h;
}

MODELOS_AVION.monoplano = (g, mc, ma, mp) => {
  const k = mp.ancho || 1, rob = mp.robusto ? 1.25 : 1;
  g.add(malla(cilZ(0.42 * rob, 0.62 * rob, 6.6), mc, 0, 0, 0.5));
  g.add(malla(G('mpNariz', () => new THREE.CylinderGeometry(0.62 * rob, 0.5 * rob, 1.6, 10).rotateX(Math.PI / 2)), ma, 0, 0, -3.4));
  const alas = mp.alaGaviota ? geoAlaGen(5.2 * k, -0.2, 0.5, 1.9, 2.0, 0.2) : geoAlaGen(5.4 * k, -0.4, 0.4, 1.9, 2.1, 0.2);
  par(g, alas, ma, 0.45, mp.alaGaviota ? 0.1 : -0.2, 0.2, mp.alaGaviota ? 0.12 : 0.02);
  par(g, geoAlaGen(2.1, 3.0, 3.3, 4.1, 4.1, 0.1), ma, 0.3, 0.1, 0.3);
  g.add(malla(caja(0.12, 1.7, 1.6), ma, 0, 0.95, 3.1));
  par(g, cilZ(0.07, 0.07, 1.6, 6), OSCURO(), 1.5 * k, -0.3, -0.8);
  par(g, cilZ(0.3, 0.3, 0.3, 8), OSCURO(), 1.3, -0.65, 0.2);
  if (mp.burbuja) {
    const c = malla(G('mpBurbuja', () => new THREE.SphereGeometry(0.62, 10, 8)), mat(0x8fe3ff, { emissive: 0x113344 }), 0, 0.72, 0.5);
    c.scale.set(0.9, 0.85, 2);
    g.add(c);
  } else cabina(g, 0.6, 0.5, 1.0, 0.8, 2.0, 0.6);
  g.userData.helice = helice(g, 0, 0, -4.3, 1.9, 3);
  llamaVacia(g, 4);
};

MODELOS_AVION.jetGemelo = (g, mc, ma, mp) => {
  const k = mp.ancho || 1, L = mp.largo || 1;
  g.add(malla(cilZ(0.5, 0.72, 7 * L), mc, 0, 0, 0.3));
  g.add(malla(conoN(0.5, 3.6), mc, 0, 0, -4.8 * L));
  par(g, geoAlaGen(4.6 * k, -0.2, 2.0, 3.1, 2.6, 0.14), ma, 0.5, 0, 0.5);
  par(g, geoAlaGen(2.1, 3.0, 3.6, 4.3, 4.0, 0.1), ma, 0.4, 0.05, 1.8);
  const colas = mp.colas || 1;
  if (colas === 2) par(g, caja(0.1, 1.7, 1.6), ma, 0.9, 0.95, 3.4 * L, 0.18);
  else g.add(malla(caja(0.12, 1.9, 1.8), ma, 0, 1.0, 3.2 * L));
  par(g, cilZ(0.36, 0.42, 3.4, 10), OSCURO(), 0.85, -0.1, 2.9 * L);
  par(g, cilZ(0.24, 0.3, 1.8, 8), ma, 0.9, -0.2, -0.6);
  cabina(g, 0.65, -1.9 * L, 0.9, 0.7, 2.7, 0.5);
  llamaEn(g, 5.2 * L, 0.4, 3);
};

MODELOS_AVION.delta = (g, mc, ma) => {
  g.add(malla(cilZ(0.36, 0.6, 7.4), mc, 0, 0, 0.6));
  g.add(malla(conoN(0.36, 4.4), mc, 0, 0, -5.6));
  par(g, geoAlaGen(4.4, -1.6, 1.6, 3.7, 3.7, 0.12), ma, 0.4, 0, 0.8);
  par(g, caja(0.1, 1.6, 1.8), ma, 0.5, 0.9, 3.4, 0.1);
  g.add(malla(caja(0.12, 1.8, 1.8), ma, 0, 0.95, 3.5));
  par(g, cilZ(0.3, 0.38, 2.6, 8), OSCURO(), 0.4, -0.15, 3.4);
  par(g, geoAlaGen(1.4, -2.4, -1.8, -1.0, -1.2, 0.08), ma, 0.3, 0.1, -1.2);
  cabina(g, 0.5, -1.8, 0.75, 0.65, 2.3, 0.45);
  llamaEn(g, 5.2, 0.4, 3.6);
};

MODELOS_AVION.ataquePesado = (g, mc, ma) => {
  g.add(malla(cilZ(0.62, 0.86, 8.2), mc, 0, 0, 0.5));
  g.add(malla(G('apNariz', () => new THREE.CylinderGeometry(0.88, 0.62, 1.8, 10).rotateX(Math.PI / 2)), ma, 0, -0.1, -4.3));
  g.add(malla(cilZ(0.12, 0.12, 3.4, 8), OSCURO(), 0, -0.4, -6.0));
  par(g, geoAlaGen(6.6, -0.8, -0.3, 2.3, 2.6, 0.3), ma, 0.8, 0.1, 0.5);
  par(g, cilZ(0.6, 0.7, 3.2, 10), OSCURO(), 1.5, 1.2, 3.2);
  par(g, caja(0.16, 2.6, 1.9), ma, 2.6, 1.5, 4.4);
  g.add(malla(caja(3, 0.14, 1.6), ma, 0, 1.4, 4.0));
  for (const x of [2.8, 4.2, 5.4]) par(g, caja(0.5, 0.35, 1.8), OSCURO(), x, -0.45, 0);
  cabina(g, 0.95, -2.3, 0.95, 0.75, 2.1, 0.62);
  llamaEn(g, 5.4, 0.5, 2.6);
};

MODELOS_AVION.bombardero = (g, mc, ma, mp) => {
  const n = mp.motores || 2, grande = n > 2;
  const r = grande ? 1.05 : 0.85;
  g.add(malla(cilZ(r * 0.85, r, grande ? 11 : 9.5), mc, 0, 0, 0.6));
  g.add(malla(conoN(r * 0.85, 3), mc, 0, 0, grande ? -6.9 : -6.0));
  cabina(g, 0.75, grande ? -5.2 : -4.6, 0.95, 0.7, 1.8, 0.75);
  par(g, geoAlaGen(grande ? 9.6 : 8, -1.3, -0.6, 2.2, 2.4, 0.3), ma, r * 0.9, 0.2, 0.4);
  par(g, geoAlaGen(3.6, 4.4, 4.6, 5.6, 5.5, 0.14), ma, 0.5, 0.15, 0.4);
  g.add(malla(caja(0.16, 3, 2.4), ma, 0, 1.6, 4.9));
  const xs = n >= 4 ? [2.6, 5.0] : [3.2];
  const hs = [];
  for (const x of xs) {
    par(g, cilZ(0.5, 0.55, 2.4, 10), OSCURO(), x, 0.0, -1.0);
    for (const s of [1, -1]) hs.push(helice(g, s * x, 0, -2.4, 1.7, 3));
  }
  g.userData.helice = new THREE.Group();
  g.userData.helices = hs;
  llamaVacia(g, 5.5);
};

MODELOS_AVION.heli = (g, mc, ma, mp) => {
  const dos = mp.rotores === 2;
  const cuerpo = malla(G('heCuerpo', () => new THREE.SphereGeometry(1, 12, 8)), mc, 0, 0, 0);
  cuerpo.scale.set(dos ? 1.3 : 1.05, dos ? 1.2 : 1, dos ? 3.2 : 2.6);
  g.add(cuerpo);
  const cola = malla(G('heCola', () => new THREE.CylinderGeometry(0.22, 0.45, 5.8, 8).rotateX(Math.PI / 2)), mc, 0, 0.35, 5);
  g.add(cola);
  g.add(malla(caja(0.12, 1.5, 1.2), ma, 0, 1.0, 7.6));
  const cab = malla(G('heCab', () => new THREE.SphereGeometry(0.8, 10, 8)), mat(0x8fe3ff, { emissive: 0x113344 }), 0, 0.3, -1.9);
  cab.scale.set(0.9, 0.8, 1.5);
  g.add(cab);
  g.add(malla(G('heMastil', () => new THREE.CylinderGeometry(0.12, 0.16, 0.9, 6)), OSCURO(), 0, 1.15, 0));
  par(g, caja(1.8, 0.14, 0.9), ma, 1.4, -0.1, 0.3);
  par(g, cilZ(0.3, 0.3, 1.8, 8), OSCURO(), 1.9, -0.1, 0.3);
  par(g, caja(0.08, 0.8, 0.08), OSCURO(), 0.7, -0.9, 0.8);
  par(g, cilZ(0.06, 0.06, 4.2, 6), OSCURO(), 0.9, -1.25, 0.2);
  const rotor = new THREE.Group();
  rotor.position.y = 1.65;
  const nAs = dos ? 5 : 4;
  for (let i = 0; i < nAs; i++) {
    const a = malla(caja(0.28, 0.05, dos ? 8.4 : 7.4), OSCURO(), 0, 0, 0);
    a.rotation.y = (i * Math.PI * 2) / nAs;
    rotor.add(a);
  }
  g.add(rotor);
  g.userData.rotor = rotor;
  const rc = new THREE.Group();
  rc.position.set(0.3, 0.9, 7.4);
  rc.add(malla(caja(0.05, 2.4, 0.2), OSCURO(), 0, 0, 0));
  g.add(rc);
  g.userData.rotorCola = rc;
  llamaVacia(g, 5);
};
