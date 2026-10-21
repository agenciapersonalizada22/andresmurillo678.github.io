// =============================================================
//  ♞  MODELOS 3D DE LAS PIEZAS
//  Peón, torre, alfil, dama y rey se tornean con perfiles (como en un
//  torno de verdad) y llevan detalles: collares, almenas, corona, cruz.
//  El caballo es una cabeza de caballo extruida con bordes
//  redondeados sobre un pedestal torneado.
//  Las geometrías se crean una vez y se comparten entre piezas.
//  Unidades: 1 casilla = 1; el centro de la base está en (0, 0, 0).
// =============================================================
import * as THREE from '../lib/three.module.min.js';

const A = (cx, cy, rx, ry, a0, a1, n = 10) => {
  const o = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + (a1 - a0) * i / n) * Math.PI) / 180;
    o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return o;
};

// Geometría de revolución con aristas duras donde el perfil gira bruscamente
function torno(perfil, seg = 48, umbral = 40) {
  const pts = perfil.filter((p, i) => i === 0 || Math.hypot(p[0] - perfil[i - 1][0], p[1] - perfil[i - 1][1]) > 1e-6);
  const n = pts.length;
  const sn = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1];
    const l = Math.hypot(dx, dy) || 1;
    sn.push([dy / l, -dx / l]);
  }
  const cosU = Math.cos((umbral * Math.PI) / 180);
  const V = [];
  const alto = Math.max(...pts.map((p) => p[1])) || 1;
  const dura = []; // dura[k] = true si V[k] y V[k+1] son el mismo punto (arista)
  const meter = (p, nr) => V.push({ r: p[0], y: p[1], nr: nr[0], ny: nr[1] });
  for (let i = 0; i < n; i++) {
    const prev = i > 0 ? sn[i - 1] : null, next = i < n - 1 ? sn[i] : null;
    if (!prev) { meter(pts[i], next); dura.push(false); }
    else if (!next) { meter(pts[i], prev); dura.push(false); }
    else if (prev[0] * next[0] + prev[1] * next[1] < cosU) {
      meter(pts[i], prev); dura.push(true); meter(pts[i], next); dura.push(false);
    } else {
      const x = prev[0] + next[0], y = prev[1] + next[1], l = Math.hypot(x, y) || 1;
      meter(pts[i], [x / l, y / l]); dura.push(false);
    }
  }
  const col = seg + 1;
  const pos = new Float32Array(V.length * col * 3), nor = new Float32Array(V.length * col * 3), uv = new Float32Array(V.length * col * 2);
  V.forEach((v, k) => {
    for (let j = 0; j <= seg; j++) {
      const f = (j / seg) * Math.PI * 2, c = Math.cos(f), s = Math.sin(f), o = k * col + j;
      pos.set([v.r * c, v.y, v.r * s], o * 3);
      nor.set([v.nr * c, v.ny, v.nr * s], o * 3);
      uv.set([j / seg, v.y / alto], o * 2);
    }
  });
  const idx = [];
  for (let k = 0; k < V.length - 1; k++) {
    if (dura[k]) continue;
    for (let j = 0; j < seg; j++) {
      const a = k * col + j, b = a + 1, c = (k + 1) * col + j, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// Suaviza las normales de una geometría sin índice uniendo vértices en la misma posición
function suavizar(g) {
  const p = g.attributes.position;
  const n = new Float32Array(p.count * 3);
  const mapa = new Map();
  const clave = (i) => `${Math.round(p.getX(i) * 2000)},${Math.round(p.getY(i) * 2000)},${Math.round(p.getZ(i) * 2000)}`;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), f = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    f.subVectors(c, b).cross(a.clone().sub(b)); // ponderada por el área
    for (let k = 0; k < 3; k++) {
      const key = clave(i + k);
      let m = mapa.get(key);
      if (!m) { m = new THREE.Vector3(); mapa.set(key, m); }
      m.add(f);
    }
  }
  for (let i = 0; i < p.count; i++) {
    const m = mapa.get(clave(i)).clone().normalize();
    n[i * 3] = m.x; n[i * 3 + 1] = m.y; n[i * 3 + 2] = m.z;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return g;
}

const base = (R) => [
  [0, 0], [R * 0.92, 0], [R * 0.98, 0.012], [R, 0.035], [R, 0.06], [R * 0.97, 0.08], [R * 0.88, 0.09],
  [R * 0.8, 0.095], [R * 0.77, 0.12], [R * 0.73, 0.145], [R * 0.65, 0.16], [R * 0.56, 0.19], [R * 0.5, 0.23],
];

const PERFILES = {
  peon: () => [
    ...base(0.31),
    [0.15, 0.25], [0.126, 0.33], [0.11, 0.43], [0.105, 0.5],
    [0.14, 0.505], [0.185, 0.52], [0.2, 0.54], [0.19, 0.565], [0.14, 0.58], [0.105, 0.59],
    ...A(0, 0.74, 0.17, 0.17, -62, 90, 14),
  ],
  torre: () => [
    ...base(0.37),
    [0.2, 0.27], [0.235, 0.3], [0.26, 0.34], [0.25, 0.4], [0.235, 0.52], [0.23, 0.7], [0.24, 0.74],
    [0.3, 0.76], [0.335, 0.78], [0.34, 0.8], [0.34, 0.93], [0.25, 0.93], [0.23, 0.9], [0.23, 0.86], [0, 0.86],
  ],
  alfil: () => [
    ...base(0.36),
    [0.17, 0.28], [0.135, 0.38], [0.115, 0.47],
    [0.17, 0.48], [0.205, 0.5], [0.205, 0.53], [0.165, 0.56], [0.12, 0.585],
    [0.15, 0.63], [0.19, 0.72], [0.205, 0.82], [0.2, 0.93], [0.17, 1.04], [0.125, 1.14], [0.075, 1.21], [0.052, 1.24],
    [0.1, 1.25], [0.105, 1.275], [0.07, 1.295],
    ...A(0, 1.36, 0.075, 0.075, -50, 90, 10),
  ],
  dama: () => [
    ...base(0.39),
    [0.18, 0.28], [0.145, 0.38], [0.12, 0.5], [0.112, 0.56],
    [0.19, 0.57], [0.22, 0.595], [0.205, 0.63], [0.14, 0.66],
    [0.13, 0.72], [0.15, 0.86], [0.19, 1.02], [0.24, 1.17], [0.285, 1.29],
    [0.305, 1.33], [0.305, 1.38], [0.27, 1.4], [0.2, 1.385], [0.14, 1.365], [0.12, 1.4], [0.105, 1.44],
    ...A(0, 1.52, 0.09, 0.09, -65, 90, 10),
  ],
  rey: () => [
    ...base(0.4),
    [0.19, 0.28], [0.15, 0.4], [0.125, 0.55], [0.118, 0.62],
    [0.2, 0.63], [0.23, 0.655], [0.21, 0.69], [0.145, 0.72],
    [0.135, 0.8], [0.155, 0.95], [0.2, 1.12], [0.25, 1.28], [0.285, 1.38],
    [0.305, 1.42], [0.305, 1.47], [0.27, 1.51], [0.2, 1.545], [0.13, 1.56],
    [0.095, 1.58], [0.095, 1.62], [0.125, 1.64], [0.125, 1.67], [0.08, 1.69], [0, 1.69],
  ],
};

function geoCaballo() {
  const s = new THREE.Shape();
  s.moveTo(-0.3, 0);
  s.bezierCurveTo(-0.35, 0.25, -0.31, 0.55, -0.21, 0.8);          // nuca y crin
  s.bezierCurveTo(-0.19, 0.93, -0.13, 1.03, -0.07, 1.1);         // hasta la oreja
  s.lineTo(-0.05, 1.27); s.lineTo(0.0, 1.29);                     // oreja
  s.lineTo(0.065, 1.12);
  s.bezierCurveTo(0.14, 1.09, 0.21, 1.01, 0.27, 0.92);           // frente
  s.bezierCurveTo(0.32, 0.84, 0.39, 0.72, 0.43, 0.62);           // caballete de la nariz
  s.bezierCurveTo(0.47, 0.55, 0.47, 0.46, 0.4, 0.43);            // hocico
  s.bezierCurveTo(0.33, 0.4, 0.26, 0.43, 0.2, 0.5);              // mandíbula
  s.bezierCurveTo(0.14, 0.58, 0.09, 0.5, 0.12, 0.4);             // garganta
  s.bezierCurveTo(0.14, 0.25, 0.25, 0.12, 0.31, 0);              // pecho
  s.lineTo(-0.3, 0);
  const prof = 0.27;
  const g = new THREE.ExtrudeGeometry(s, { depth: prof, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.055, bevelSegments: 6, curveSegments: 28 });
  g.translate(0, 0, -prof / 2);
  const p = g.attributes.position;
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const k = 1 - 0.42 * sm(0.05, 0.45, x) - 0.2 * sm(0.95, 1.25, y) + 0.3 * (1 - sm(-0.3, 0.12, x)) * (1 - sm(0.3, 0.95, y));
    p.setZ(i, p.getZ(i) * k);
  }
  suavizar(g);
  g.computeBoundingSphere();
  return g;
}

// Crin: cinta fina sobre el borde trasero del cuello
function geoCrin() {
  const s = new THREE.Shape();
  s.moveTo(-0.3, 0.12);
  s.bezierCurveTo(-0.35, 0.3, -0.31, 0.57, -0.215, 0.8);
  s.bezierCurveTo(-0.19, 0.93, -0.13, 1.03, -0.075, 1.1);
  s.lineTo(-0.02, 1.0);
  s.bezierCurveTo(-0.1, 0.9, -0.17, 0.78, -0.2, 0.62);
  s.bezierCurveTo(-0.23, 0.45, -0.24, 0.3, -0.22, 0.12);
  s.lineTo(-0.3, 0.12);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.26, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.04, bevelSegments: 4, curveSegments: 20 });
  g.translate(0, 0, -0.13);
  suavizar(g);
  return g;
}

const cache = {};

// Cada pieza es una lista de partes: { geo, rol, pos, rot }; rol = cuerpo | acento | oscuro
function partes(tipo) {
  if (cache[tipo]) return cache[tipo];
  let L = [];
  const lat = (pf, seg) => torno(pf, seg);
  switch (tipo) {
    case 'peon':
      L = [{ geo: lat(PERFILES.peon(), 40), rol: 'cuerpo' }];
      break;
    case 'torre': {
      L = [{ geo: lat(PERFILES.torre(), 48), rol: 'cuerpo' }];
      const caja = new THREE.BoxGeometry(0.15, 0.13, 0.095);
      const uvc = caja.attributes.uv;
      for (let i = 0; i < uvc.count; i++) uvc.setXY(i, uvc.getX(i) * 0.18, uvc.getY(i) * 0.18);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        L.push({ geo: caja, rol: 'cuerpo', pos: [Math.cos(a) * 0.2925, 0.93 + 0.065, Math.sin(a) * 0.2925], rot: [0, -a, 0] });
      }
      break;
    }
    case 'alfil':
      L = [
        { geo: lat(PERFILES.alfil(), 48), rol: 'cuerpo' },
        { geo: new THREE.BoxGeometry(0.022, 0.15, 0.425), rol: 'oscuro', pos: [0.02, 1.0, 0], rot: [0, 0, -0.62] },
      ];
      break;
    case 'dama': {
      L = [{ geo: lat(PERFILES.dama(), 56), rol: 'cuerpo' }];
      const bola = new THREE.SphereGeometry(0.04, 16, 12);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        L.push({ geo: bola, rol: 'acento', pos: [Math.cos(a) * 0.285, 1.41, Math.sin(a) * 0.285] });
      }
      L.push({ geo: new THREE.SphereGeometry(0.035, 12, 10), rol: 'acento', pos: [0, 1.62, 0] });
      break;
    }
    case 'rey': {
      L = [{ geo: lat(PERFILES.rey(), 56), rol: 'cuerpo' }];
      L.push({ geo: new THREE.CapsuleGeometry(0.036, 0.26, 6, 12), rol: 'acento', pos: [0, 1.84, 0] });
      L.push({ geo: new THREE.CapsuleGeometry(0.036, 0.16, 6, 12), rol: 'acento', pos: [0, 1.88, 0], rot: [0, 0, Math.PI / 2] });
      const bola = new THREE.SphereGeometry(0.035, 12, 10);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        L.push({ geo: bola, rol: 'acento', pos: [Math.cos(a) * 0.29, 1.5, Math.sin(a) * 0.29] });
      }
      break;
    }
    case 'caballo': {
      const ped = [
        ...base(0.37), [0.2, 0.26], [0.3, 0.285], [0.315, 0.31], [0.29, 0.335], [0.2, 0.345], [0, 0.345],
      ];
      L = [{ geo: lat(ped, 48), rol: 'cuerpo' }];
      const ojo = new THREE.SphereGeometry(0.04, 14, 10);
      L.push({ geo: geoCaballo(), rol: 'cuerpo', pos: [-0.03, 0.33, 0], escala: 0.8 });
      L.push({ geo: geoCrin(), rol: 'acento', pos: [-0.03, 0.33, 0], escala: 0.8 });
      L.push({ geo: ojo, rol: 'oscuro', pos: [0.13, 1.074, 0.1] });
      L.push({ geo: ojo, rol: 'oscuro', pos: [0.13, 1.074, -0.1] });
      const nar = new THREE.SphereGeometry(0.022, 10, 8);
      L.push({ geo: nar, rol: 'oscuro', pos: [0.3, 0.74, 0.055] });
      L.push({ geo: nar, rol: 'oscuro', pos: [0.3, 0.74, -0.055] });
      break;
    }
    default: throw new Error('pieza desconocida ' + tipo);
  }
  cache[tipo] = L;
  return L;
}

export const NOMBRES = ['', 'peon', 'caballo', 'alfil', 'torre', 'dama', 'rey'];

// mats = { cuerpo, acento, oscuro }; color 0 = blancas (el caballo mira hacia -z) y 1 = negras
export function crearPieza(tipoNum, color, mats, giro = 0) {
  const nombre = NOMBRES[tipoNum];
  const g = new THREE.Group();
  const pivote = new THREE.Group(); // gira el caballo; el resto no se nota
  g.add(pivote);
  for (const p of partes(nombre)) {
    const m = new THREE.Mesh(p.geo, mats[p.rol]);
    m.castShadow = true;
    m.receiveShadow = true;
    if (p.pos) m.position.set(p.pos[0], p.pos[1], p.pos[2]);
    if (p.rot) m.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
    if (p.escala) m.scale.setScalar(p.escala);
    pivote.add(m);
  }
  if (nombre === 'caballo') pivote.rotation.y = (color === 0 ? Math.PI / 2 : -Math.PI / 2) + giro;
  else pivote.rotation.y = color ? Math.PI * 0.25 : 0;
  g.userData = { tipo: tipoNum, color };
  return g;
}

export const ALTURA = [0, 0.92, 1.3, 1.42, 1.06, 1.68, 1.98];
