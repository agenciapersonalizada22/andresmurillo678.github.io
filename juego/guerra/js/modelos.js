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
export const G = (n, f) => geos[n] || (geos[n] = f());
export const malla = (g, m, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  return o;
};

// ---- Avión (nariz hacia -Z)
export function geoAla() {
  const s = new THREE.Shape();
  s.moveTo(0, -1.4); s.lineTo(4.6, 0.7); s.lineTo(4.6, 1.8); s.lineTo(0, 1.8); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false });
  g.rotateX(Math.PI / 2);
  return g;
}

// Ala recta o en flecha: z de borde de ataque y de fuga en la raíz y en la punta
export function geoAlaGen(span, zr0, zp0, zp1, zr1, grosor = 0.16) {
  return G(`ala${span}_${zr0}_${zp0}_${zp1}_${zr1}_${grosor}`, () => {
    const s = new THREE.Shape();
    s.moveTo(0, zr0); s.lineTo(span, zp0); s.lineTo(span, zp1); s.lineTo(0, zr1); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: grosor, bevelEnabled: false });
    g.rotateX(Math.PI / 2);
    return g;
  });
}
export const caja = (x, y, z) => G(`caja${x}_${y}_${z}`, () => new THREE.BoxGeometry(x, y, z));
export const cilZ = (r0, r1, l, n = 10) => G(`cil${r0}_${r1}_${l}_${n}`, () => new THREE.CylinderGeometry(r0, r1, l, n).rotateX(Math.PI / 2));
export const conoN = (r, l, n = 10) => G(`con${r}_${l}_${n}`, () => new THREE.ConeGeometry(r, l, n).rotateX(-Math.PI / 2));
export const CRISTAL = () => mat(0x8fe3ff, { emissive: 0x113344 });
export const OSCURO = () => mat(0x26282a);

// Pareja de piezas simétricas (derecha e izquierda)
export function par(g, geo, m, x, y, z, rotZ = 0) {
  const d = malla(geo, m, x, y, z), i = malla(geo, m, -x, y, z);
  i.scale.x = -1;
  d.rotation.z = rotZ;
  i.rotation.z = -rotZ;
  g.add(d, i);
}

export function cabina(g, y, z, ex = 1, ey = 0.8, ez = 2.2, r = 0.5) {
  const c = malla(G(`cab${r}`, () => new THREE.SphereGeometry(r, 10, 8)), CRISTAL(), 0, y, z);
  c.scale.set(ex, ey, ez);
  g.add(c);
}

export function llamaEn(g, z, r = 0.4, l = 3) {
  const f = malla(G(`llama${r}_${l}`, () => new THREE.ConeGeometry(r, l, 8).rotateX(Math.PI / 2)), mat(0xff9a30, { basico: true, aditivo: true }), 0, 0, z);
  g.add(f);
  g.userData.llama = f;
}

export const MODELOS_AVION = {
  halcon(g, mc, ma) {
    g.add(malla(cilZ(0.34, 0.68, 6.2), mc, 0, 0, 0.4));
    g.add(malla(conoN(0.68, 2.4), mc, 0, 0, -3.9));
    par(g, G('avAla', geoAla), ma, 0.4, 0, 0.2);
    par(g, G('avCola', () => geoAla().scale(0.42, 1, 0.5)), ma, 0.3, 0.05, 3.1);
    g.add(malla(caja(0.12, 1.7, 1.6), ma, 0, 0.9, 3.0));
    cabina(g, 0.55, -1.4);
    llamaEn(g, 5.2);
  },
  saeta(g, mc, ma) {
    g.add(malla(cilZ(0.3, 0.55, 7.4), mc, 0, 0, 0.6));
    g.add(malla(conoN(0.55, 3.8), mc, 0, 0, -5.1));
    par(g, geoAlaGen(3.6, -0.4, 2.2, 3.1, 2.7, 0.12), ma, 0.35, 0, 0.5);
    par(g, geoAlaGen(1.7, 2.6, 3.7, 4.3, 4.0, 0.1), ma, 0.3, 0.05, 1.2);
    par(g, caja(0.1, 1.5, 1.5), ma, 0.75, 0.85, 3.3, 0.35);
    par(g, cilZ(0.09, 0.09, 2.2, 6), mat(0xdedede), 1.7, -0.3, 0.2);
    par(g, cilZ(0.28, 0.3, 1.2, 8), OSCURO(), 0.45, -0.15, 4.0);
    cabina(g, 0.5, -1.7, 0.9, 0.7, 2.6, 0.45);
    llamaEn(g, 5.4, 0.35, 3.4);
  },
  mastodonte(g, mc, ma) {
    g.add(malla(cilZ(0.78, 1.0, 8), mc, 0, 0, 0.5));
    g.add(malla(conoN(1.0, 2.8), mc, 0, 0, -4.9));
    par(g, geoAlaGen(7.4, -1.0, 0.1, 2.3, 1.9, 0.3), ma, 0.9, 0, 0.2);
    par(g, cilZ(0.62, 0.66, 3.4, 12), OSCURO(), 3.3, -0.35, -0.2);
    par(g, cilZ(0.42, 0.42, 2.2, 8), mat(0x4a5238), 5.4, -0.55, 0.3);
    par(g, geoAlaGen(3.0, 3.2, 3.8, 4.7, 4.4, 0.2), ma, 0.6, 0.45, 0.2);
    par(g, caja(0.16, 2.4, 2.0), ma, 2.2, 1.3, 4.1);
    g.add(malla(caja(0.16, 2.6, 2.2), ma, 0, 1.4, 4.0));
    cabina(g, 0.9, -2.6, 1.0, 0.8, 2.0, 0.7);
    llamaEn(g, 5.9, 0.7, 3.4);
  },
  tormenta(g, mc, ma) {
    g.add(malla(cilZ(0.46, 0.82, 7.0), mc, 0, 0, 0.4));
    g.add(malla(conoN(0.82, 1.7), mc, 0, 0, -3.75));
    g.add(malla(cilZ(0.15, 0.15, 3.0, 8), OSCURO(), 0, -0.3, -5.0));
    par(g, geoAlaGen(5.6, -0.4, -0.2, 1.9, 2.0, 0.28), ma, 0.55, 0.0, 0.1);
    par(g, cilZ(0.5, 0.45, 2.8, 10), OSCURO(), 1.15, 0.8, 2.5);
    par(g, geoAlaGen(2.4, 3.2, 3.4, 4.5, 4.3, 0.14), ma, 0.4, 0.55, 0.1);
    par(g, caja(0.12, 1.9, 1.5), ma, 2.7, 1.4, 3.8);
    par(g, caja(0.5, 0.4, 1.8), OSCURO(), 2.5, -0.45, -0.2);
    par(g, caja(0.5, 0.4, 1.8), OSCURO(), 4.2, -0.4, -0.2);
    cabina(g, 0.75, -1.6, 1.1, 0.95, 2.2, 0.55);
    llamaEn(g, 5.4, 0.45, 2.6);
  },
  biplano(g, mc, ma) {
    const madera = mat(0x6a4a2a);
    g.add(malla(cilZ(0.3, 0.62, 5.4, 8), mc, 0, 0, 0.7));
    g.add(malla(cilZ(0.75, 0.75, 1.2, 12), ma, 0, 0, -2.3));
    g.add(malla(caja(9.4, 0.14, 1.8), ma, 0, -0.15, -0.4));
    g.add(malla(caja(9.4, 0.14, 1.8), mc, 0, 1.5, -0.55));
    for (const x of [-2.6, 2.6, -4.2, 4.2]) g.add(malla(caja(0.08, 1.55, 0.08), madera, x, 0.68, -0.45));
    g.add(malla(caja(3.4, 0.1, 1.2), ma, 0, 0.05, 3.2));
    g.add(malla(caja(0.1, 1.3, 1.2), ma, 0, 0.7, 3.2));
    par(g, cilZ(0.36, 0.36, 0.2, 10), OSCURO(), 0.95, -1.05, -1.0);
    par(g, caja(0.07, 0.9, 0.07), madera, 0.9, -0.6, -1.0);
    const cab = malla(G('biCab', () => new THREE.SphereGeometry(0.32, 8, 6)), OSCURO(), 0, 0.5, 0.3);
    g.add(cab);
    const helice = new THREE.Group();
    helice.position.set(0, 0, -3.0);
    helice.add(malla(caja(0.22, 3.4, 0.06), OSCURO(), 0, 0, 0));
    helice.add(malla(caja(0.3, 0.3, 0.3), mat(0xb0b0b0), 0, 0, -0.05));
    g.add(helice);
    g.userData.helice = helice;
    const l = new THREE.Group();
    l.position.z = 3.6;
    g.add(l);
    g.userData.llama = l;
  },
  espectro(g, mc, ma) {
    const s = new THREE.Shape();
    s.moveTo(0, -5.2); s.lineTo(5.4, 2.3); s.lineTo(3.2, 2.0); s.lineTo(1.9, 3.1); s.lineTo(0, 2.2);
    s.lineTo(-1.9, 3.1); s.lineTo(-3.2, 2.0); s.lineTo(-5.4, 2.3); s.closePath();
    g.add(malla(G('espAla', () => new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false }).rotateX(Math.PI / 2)), mc, 0, 0.15, 0));
    g.add(malla(cilZ(0.3, 0.7, 5.6), ma, 0, 0.25, 0.4));
    g.add(malla(conoN(0.7, 2.4), ma, 0, 0.25, -3.4));
    par(g, caja(0.1, 1.2, 1.5), ma, 0.7, 0.9, 2.2, 0.55);
    par(g, cilZ(0.3, 0.34, 1.0, 8), mat(0x101216), 0.55, 0.2, 3.0);
    cabina(g, 0.65, -1.3, 0.85, 0.6, 2.4, 0.5);
    llamaEn(g, 4.4, 0.35, 2.6);
  },
};

export function sombrear(g) {
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function crearAvion(modelo, colores, escala = 1, mp = {}) {
  const g = new THREE.Group();
  (MODELOS_AVION[modelo] || MODELOS_AVION.halcon)(g, mat(colores[0]), mat(colores[1]), mp);
  if (escala !== 1) g.scale.setScalar(escala);
  return sombrear(g);
}

// ---- Tanque (cañón hacia -Z). variante: medio, ligero, pesado, cazacarros, antiaereo
const DIM_TORRE = { medio: [2.2, 0.85, 2.6], ligero: [1.8, 0.7, 2.0], pesado: [2.6, 1.0, 2.9], cazacarros: [2.1, 0.75, 3.4], antiaereo: [2.4, 1.1, 2.4] };
const TUBO = { medio: [0.13, 4.4], ligero: [0.11, 3.4], pesado: [0.2, 5.0], cazacarros: [0.16, 6.2], antiaereo: [0.09, 3.0] };
export function crearTanque(color, escala = 1, variante = 'medio') {
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
  if (variante === 'pesado') for (const x of [2.25, -2.25]) casco.add(malla(G('tqFaldon', () => new THREE.BoxGeometry(0.2, 0.9, 6.2)), mo, x, 1.0, 0));
  if (variante === 'cazacarros') casco.add(malla(G('tqRampa', () => new THREE.BoxGeometry(3, 1.1, 3.6)), mc, 0, 1.35, -1.2));
  const torreta = new THREE.Group();
  torreta.position.set(0, 1.45, 0.2);
  const dt = DIM_TORRE[variante] || DIM_TORRE.medio;
  torreta.add(malla(G(`tqTorre${dt}`, () => new THREE.BoxGeometry(dt[0], dt[1], dt[2])), mc, 0, dt[1] / 2, variante === 'cazacarros' ? 0.5 : 0));
  if (variante !== 'antiaereo') torreta.add(malla(G('tqTapa', () => new THREE.CylinderGeometry(0.5, 0.55, 0.3, 10)), mo, 0.3, dt[1] + 0.15, 0.4));
  const canon = new THREE.Group();
  canon.position.set(0, dt[1] * 0.6, -dt[2] / 2 + 0.05);
  const [rt, lt] = TUBO[variante] || TUBO.medio;
  if (variante === 'antiaereo') {
    const t = G(`tqTuboAA${lt}`, () => new THREE.CylinderGeometry(rt, rt * 1.2, lt, 6).rotateX(Math.PI / 2));
    canon.add(malla(t, md, 0.6, 0, -lt / 2), malla(t, md, -0.6, 0, -lt / 2));
    canon.add(malla(G('tqCajaAA', () => new THREE.BoxGeometry(1.9, 0.5, 1)), mo, 0, 0, 0));
    torreta.add(malla(G('tqRadarAA', () => new THREE.CylinderGeometry(0.6, 0.6, 0.12, 10)), mat(0xdfe6e8), -0.7, dt[1] + 0.3, 0.8));
  } else {
    canon.add(malla(G(`tqTubo${rt}_${lt}`, () => new THREE.CylinderGeometry(rt, rt * 1.2, lt, 8).rotateX(Math.PI / 2)), md, 0, 0, -lt / 2));
    if (variante === 'cazacarros') canon.add(malla(G('tqFreno', () => new THREE.BoxGeometry(0.5, 0.4, 0.8)), md, 0, 0, -lt));
  }
  const boca = new THREE.Object3D();
  boca.position.set(0, 0, -lt - 0.1);
  canon.add(boca);
  torreta.add(canon);
  grupo.add(torreta);
  grupo.scale.setScalar(escala);
  return { grupo: sombrear(grupo), casco, torreta, canon, boca, largo: lt, retroBase: canon.position.z };
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
  } else if (tipo === 'barco') {
    g.add(malla(G('bcCasco', () => new THREE.BoxGeometry(5, 2.4, 15)), mat(0x6b7480), 0, 0.5, 0));
    g.add(malla(G('bcProa', () => new THREE.ConeGeometry(2.5, 5, 4).rotateX(-Math.PI / 2).rotateZ(Math.PI / 4).scale(1, 0.48, 1)), mat(0x6b7480), 0, 0.5, -9.8));
    g.add(malla(G('bcPuente', () => new THREE.BoxGeometry(3, 2.6, 3.6)), mat(0x9aa4ad), 0, 2.9, 2.5));
    g.add(malla(G('bcMastil', () => new THREE.CylinderGeometry(0.1, 0.1, 3.6, 5)), mat(0x2a2c2e), 0, 5.6, 2.5));
    cabeza = new THREE.Group();
    cabeza.position.set(0, 2.2, -4.5);
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
  return { grupo: sombrear(g), cabeza };
}

// ---- Proyectiles
export function geoTrazadora() { return G('trazadora', () => new THREE.BoxGeometry(0.16, 0.16, 6)); }
export function geoMisil() {
  return G('misil', () => {
    const c = new THREE.CylinderGeometry(0.14, 0.14, 2.6, 6).rotateX(Math.PI / 2);
    return c;
  });
}
export function geoCohete() { return G('cohete', () => new THREE.CylinderGeometry(0.1, 0.1, 1.7, 5).rotateX(Math.PI / 2)); }
export function geoBomba() { return G('bomba', () => new THREE.CylinderGeometry(0.36, 0.3, 1.8, 8).rotateX(Math.PI / 2)); }
export function geoObus() { return G('obus', () => new THREE.BoxGeometry(0.28, 0.28, 2.4)); }
export function geoFlak() { return G('flak', () => new THREE.SphereGeometry(0.5, 8, 6)); }

// ---- Insignias: pegatinas planas sobre alas y cola (avión) o torreta y casco (tanque)
export function aplicarMarca(grupo, marca, color = '#ffffff', esTanque = false) {
  if (!marca || marca === 'ninguna') return;
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), side: THREE.DoubleSide });
  const gro = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  grupo.updateMatrixWorld(true);
  const caja = new THREE.Box3().setFromObject(grupo);
  const inv = 1 / (grupo.scale.x || 1);
  const sp = (caja.max.x - caja.min.x) / 2 * inv, y = (caja.max.y - caja.min.y) * inv;
  const poner = (geo, mat, x, yy, z, rx = -Math.PI / 2) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, yy, z);
    o.rotation.x = rx;
    o.scale.setScalar(inv * (grupo.scale.x || 1) / (grupo.scale.x || 1));
    grupo.add(o);
    return o;
  };
  if (esTanque) {
    const g = marca === 'estrella' ? new THREE.CircleGeometry(0.55, 5) : marca === 'franjas' ? new THREE.PlaneGeometry(0.4, 1.8) : new THREE.CircleGeometry(0.55, 14);
    poner(g, m, 0, 2.55, 0.5);
    return;
  }
  const x = sp * 0.55;
  for (const l of [-1, 1]) {
    if (marca === 'circulo') { poner(new THREE.CircleGeometry(0.9, 14), m, l * x, 0.3, 0.9); poner(new THREE.CircleGeometry(0.45, 14), gro, l * x, 0.32, 0.9); }
    else if (marca === 'estrella') poner(new THREE.CircleGeometry(0.95, 5), m, l * x, 0.3, 0.9);
    else if (marca === 'franjas') { poner(new THREE.PlaneGeometry(0.5, 2.2), m, l * (x - 0.5), 0.3, 1), poner(new THREE.PlaneGeometry(0.5, 2.2), m, l * (x + 0.5), 0.3, 1); }
    else if (marca === 'as') poner(new THREE.CircleGeometry(0.8, 3), m, l * x, 0.3, 0.9);
  }
  if (marca === 'as') { const t = poner(new THREE.PlaneGeometry(0.1, 0.1), m, 0, 0, 0); t.visible = false; }
  void y;
}
