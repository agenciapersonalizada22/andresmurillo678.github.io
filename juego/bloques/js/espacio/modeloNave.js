// =============================================================
//  🛸  MODELOS 3D DE LAS NAVES (diseño propio, pocas piezas)
//  Miran hacia -Z. Materiales compartidos por mat() de modelosVeh.
// =============================================================
import * as THREE from '../../lib/three.module.min.js';
import { mat, caja, cilindro, terminar } from '../modelosVeh.js';
import { TIERS } from './naves.js';

const PI2 = Math.PI / 2;
function patas(g, oscuro, w, z) {
  for (const s of [-1, 1]) { caja(g, 0.18, 1.0, 0.18, s * w, 0.5, z, oscuro, 0, 0, s * 0.25); caja(g, 0.7, 0.1, 0.9, s * (w + 0.12), 0.05, z, oscuro); }
}

export function crearNave(tipo) {
  const T = TIERS[tipo];
  const g = new THREE.Group();
  const partes = { luces: [], frenos: [], exterior: [], ruedas: null };
  const casco = mat(T.color, { brillo: 100, espec: 0x8899aa });
  const oscuro = mat(0x20242c, { brillo: 30 });
  const cristal = mat(0x6fb6e6, { alfa: 0.5, brillo: 140, espec: 0xffffff });
  const acento = mat(T.acento, { emisivo: T.acento, intensidad: 0.9, brillo: 40 });
  const baja = tipo === 'lanzadera';
  const largo = baja ? 6.4 : tipo === 'nave_ionica' ? 8.6 : 10.4;
  const radio = baja ? 1.05 : tipo === 'nave_ionica' ? 1.15 : 1.0;
  const y0 = baja ? 1.4 : 1.7;
  // fuselaje
  cilindro(g, radio, radio, largo, 0, y0, 0, casco, PI2, 0, 0, 20);
  const nariz = new THREE.Mesh(new THREE.ConeGeometry(radio, largo * 0.35, 20), casco);
  nariz.rotation.x = -PI2; nariz.position.set(0, y0, -largo / 2 - largo * 0.175); g.add(nariz);
  // cabina
  const cab = new THREE.Mesh(new THREE.SphereGeometry(radio * 0.62, 14, 10, 0, Math.PI * 2, 0, PI2), cristal);
  cab.position.set(0, y0 + radio * 0.55, -largo * 0.3); cab.scale.set(1, 0.8, 1.5); g.add(cab); partes.exterior.push(cab);
  // franjas de acento
  cilindro(g, radio + 0.03, radio + 0.03, 0.28, 0, y0, -largo * 0.1, acento, PI2, 0, 0, 20);
  cilindro(g, radio + 0.03, radio + 0.03, 0.2, 0, y0, largo * 0.28, acento, PI2, 0, 0, 20);
  // alas y cola
  if (tipo === 'nave_salto') {
    for (const s of [-1, 1]) { caja(g, 3.4, 0.12, 3.6, s * 2.5, y0 - 0.1, 1.2, casco, 0, s * 0.35, s * 0.08); caja(g, 0.1, 1.5, 1.6, s * 4.1, y0 + 0.5, 2.2, acento); }
    cilindro(g, 2.0, 2.0, 0.12, 0, y0, largo * 0.05, mat(0xb06cff, { emisivo: 0xb06cff, intensidad: 1.3, alfa: 0.55 }), PI2, 0, 0, 28);
  } else if (tipo === 'nave_ionica') {
    for (const s of [-1, 1]) { caja(g, 4.2, 0.1, 1.2, s * 3, y0 + 0.2, 1.8, mat(0x1a3a66, { emisivo: 0x1030a0, intensidad: 0.5, brillo: 80 })); caja(g, 0.1, 0.1, 1.2, s * 1.3, y0 + 0.2, 1.8, oscuro); }
    cilindro(g, 0.35, 1.55, 0.35, 0, y0, -largo / 2 + 0.2, oscuro, PI2, 0, 0, 16);
  } else {
    for (const s of [-1, 1]) caja(g, 2.4, 0.12, 2.6, s * 1.9, y0 - 0.45, 1.4, casco, 0, s * 0.3, s * 0.05);
  }
  caja(g, 0.12, 1.6, 1.8, 0, y0 + 1.0, largo * 0.38, casco);
  // motores y llama
  const motorX = baja ? [-0.5, 0.5] : [0];
  for (const x of motorX) {
    cilindro(g, 0.32, 0.55, 0.7, x, y0, largo / 2 + 0.25, oscuro, PI2, 0, 0, 14);
    const llama = mat(T.acento, { emisivo: T.acento, intensidad: 1.6, alfa: 0.7 });
    const m = cilindro(g, 0.0, 0.34, 1.1, x, y0, largo / 2 + 1.0, llama, -PI2, 0, 0, 12);
    partes.luces.push({ malla: m, base: llama, delantero: false });
  }
  // luces
  const faro = mat(0xeaf6ff, { emisivo: 0xb8e0ff, intensidad: 0.6 });
  const f = caja(g, 0.5, 0.12, 0.12, 0, y0 - 0.1, -largo / 2 - largo * 0.3, faro);
  partes.frenos.push({ malla: f, base: faro });
  // patas de aterrizaje
  patas(g, oscuro, radio + 0.9, -largo * 0.25); patas(g, oscuro, radio + 0.9, largo * 0.3);
  return terminar({ grupo: g, partes });
}

// Tipos para vehiculos.js
export const TIPOS_NAVE_VEH = {};
for (const [id, T] of Object.entries(TIERS)) {
  TIPOS_NAVE_VEH[id] = {
    nombre: T.nombre, crear: () => crearNave(id), clase: 'nave', tanque: T.tanque, consumo: 0, asiento: [0, 1.6, 0],
    distCam: 14, altCam: 4, ancho: 2.2, largo: 4, vmax: 0, alto: 3.6,
  };
}
