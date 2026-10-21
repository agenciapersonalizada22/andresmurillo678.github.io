// =============================================================
//  MAPAS: relieves, vegetación y extras (rascacielos, portaaviones).
//  Cada relieve tiene bruta(t, x, z) = altura sin aplanar y, si hace falta,
//  zonas(), edificios(), extras(). t es el Terreno (semilla fija por mapa).
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';

const MEDIO = CONFIG.mundo.tam / 2;
export const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function canvasTextura(w, h, dibujar, repetir) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

// ---------------------------------------------------------- Vegetación y rocas
export const ARBOLES = {
  pino: {
    copa: () => new THREE.ConeGeometry(2.8, 10, 6).translate(0, 8, 0),
    tronco: () => new THREE.CylinderGeometry(0.4, 0.55, 3.2, 5).translate(0, 1.6, 0),
    colorTronco: 0x5b3d24, color: (c, r) => c.setHSL(0.3 + r() * 0.06, 0.5, 0.2 + r() * 0.12),
    hMin: 2.5, hMax: 52, umbral: 0.5, pend: 4, esc: [0.8, 1.6],
  },
  pinoNieve: {
    copa: () => new THREE.ConeGeometry(2.8, 10, 6).translate(0, 8, 0),
    tronco: () => new THREE.CylinderGeometry(0.4, 0.55, 3.2, 5).translate(0, 1.6, 0),
    colorTronco: 0x4a3a2c, color: (c, r) => c.setHSL(0.42, 0.1 + r() * 0.12, 0.7 + r() * 0.16),
    hMin: 3, hMax: 85, umbral: 0.42, pend: 6, esc: [1, 1.9],
  },
  palma: {
    copa: () => new THREE.ConeGeometry(4.6, 2.4, 7).translate(0, 9.7, 0),
    tronco: () => new THREE.CylinderGeometry(0.3, 0.45, 9, 5).translate(0, 4.5, 0),
    colorTronco: 0x7a5a38, color: (c, r) => c.setHSL(0.27 + r() * 0.05, 0.6, 0.3 + r() * 0.1),
    hMin: 2.2, hMax: 30, umbral: 0.3, pend: 5, esc: [0.9, 1.4],
  },
  cactus: {
    copa: () => new THREE.SphereGeometry(0.75, 6, 5).translate(0, 5.1, 0),
    tronco: () => new THREE.CylinderGeometry(0.6, 0.7, 5, 6).translate(0, 2.5, 0),
    colorTronco: 0x4f7a3a, color: (c, r) => c.setHSL(0.25 + r() * 0.04, 0.4, 0.3 + r() * 0.08),
    hMin: 3, hMax: 50, umbral: 0.3, pend: 4, esc: [0.8, 1.8],
  },
};

export const COLORES_ROCA = {
  granito: { color: 0x8b857a, tam: [3, 8] },
  arenisca: { color: 0xb5663e, tam: [4, 11] },
};

// ---------------------------------------------------------- Relieves
export const RELIEVES = {
  // Colinas suaves; el borde del mapa es mar o montañas
  colinas: {
    bruta(t, x, z) {
      const R = t.def.rel;
      const n = t.ruido(x * R.escala + 5, z * R.escala + 9, 4);
      let h = (n - R.base) * R.amp + (t.ruido2(x * 0.004, z * 0.004, 3) - 0.5) * 22;
      const d = Math.hypot(x, z) / MEDIO;
      if (R.borde === 'mar') h -= suave(0.7, 1.05, d) * 70;
      else h += suave(0.72, 1.0, d) * 110;
      return h;
    },
  },

  // Dunas largas, mesas rojas y cañones estrechos (nunca bajo 3 m: no hay agua)
  desierto: {
    bruta(t, x, z) {
      const d = Math.hypot(x, z);
      const lejos = suave(150, 450, d);
      let h = 16 + (t.ruido(x * 0.0011 + 3, z * 0.0011 + 1, 4) - 0.5) * 26;
      h += Math.abs(Math.sin((x * 0.55 + z * 0.83) * 0.011 + t.ruido2(x * 0.0028, z * 0.0028, 3) * 7)) * 9;
      h += suave(0.6, 0.66, t.ruido2(x * 0.0013 + 20, z * 0.0013 + 5, 3)) * 46 * lejos;
      const c = Math.abs(t.ruido(x * 0.0017 + 11, z * 0.0017 + 4, 3) - 0.5);
      h += (4 - h) * suave(0.045, 0.015, c) * lejos;
      h += suave(0.74, 1.0, d / MEDIO) * 95;
      return Math.max(h, 3.2);
    },
  },

  // Cordilleras en cresta con valles helados y lagos
  picos: {
    bruta(t, x, z) {
      const d = Math.hypot(x, z);
      const n = t.ruido(x * 0.0011 + 2, z * 0.0011 + 8, 5);
      const r = 1 - Math.abs(2 * t.ruido2(x * 0.0017 + 4, z * 0.0017 + 1, 4) - 1);
      const m = suave(0.38, 0.62, n) * suave(200, 700, d);
      let h = 4 + (n - 0.3) * 30 + Math.pow(r, 2.3) * 250 * m + (t.ruido2(x * 0.01, z * 0.01, 2) - 0.5) * 14;
      h -= suave(0.4, 0.28, n) * 20;
      h += suave(0.72, 1.0, d / MEDIO) * 130;
      return h;
    },
  },

  // Meseta llana con bahía; rascacielos en cuadrícula, avenidas y plazas militares
  ciudad: {
    sinPistas: true,
    bruta(t, x, z) {
      const d = Math.hypot(x, z);
      return 8 - suave(1020, 1160, d) * 46 - suave(1160, 1500, d) * 14 + suave(1250, 1800, d) * 130;
    },
    zonas(t) {
      t.plazas = [];
      for (const [i, j] of [[-3, -3], [3, -2], [-2, 3], [4, 4]]) {
        const zo = { x: (i + 0.5) * 70, z: (j + 0.5) * 70, r: 100, y: 8, tipo: 'base', plana: true, spawn: [15, 70] };
        t.zonas.push(zo);
        t.plazas.push(zo);
      }
    },
    edificios(t, lista) {
      const rng = t.rng;
      for (let i = -14; i <= 14; i++) for (let j = -14; j <= 14; j++) {
        const x = i * 70 + (rng() - 0.5) * 6, z = j * 70 + (rng() - 0.5) * 6;
        const d = Math.hypot(x, z);
        const w = 22 + rng() * 16, dd = 22 + rng() * 16;
        const alto = 14 + rng() * rng() * 50 + Math.exp(-d / 380) * (30 + rng() * 100);
        if (d > 960 || rng() < 0.1) continue;
        if (t.plazas.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + 24)) continue;
        lista.push({ x, z, w, d: dd, h: alto, y: 8 });
      }
    },
    extras(t) {
      const tex = canvasTextura(128, 128, (g, w, h) => {
        g.fillStyle = '#868a90';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#34373b';
        g.fillRect(64 - 25, 0, 50, h);
        g.fillRect(0, 64 - 25, w, 50);
        g.fillStyle = '#d8d070';
        for (let k = 0; k < 128; k += 16) {
          if (Math.abs(k + 4 - 64) > 30) { g.fillRect(63, k, 2, 8); g.fillRect(k, 63, 8, 2); }
        }
      }, true);
      const R = 1040, rep = (R * 2) / 70;
      tex.repeat.set(rep, rep);
      tex.offset.set(0.143, 0.143);
      tex.anisotropy = 4;
      const m = new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const calles = new THREE.Mesh(new THREE.CircleGeometry(R, 72).rotateX(-Math.PI / 2), m);
      calles.position.y = 8.12;
      t.add(calles);
      const mp = new THREE.MeshLambertMaterial({ color: 0x585b5f, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      for (const p of t.plazas) {
        const disco = new THREE.Mesh(new THREE.CircleGeometry(p.r, 40).rotateX(-Math.PI / 2), mp);
        disco.position.set(p.x, 8.25, p.z);
        t.add(disco);
      }
    },
  },

  // Islas dispersas, una isla principal y portaaviones fondeados
  archipielago: {
    bruta(t, x, z) {
      const d = Math.hypot(x, z);
      const n = t.ruido(x * 0.0019 + 1, z * 0.0019 + 7, 4);
      let h = (n - 0.57) * 230 + (t.ruido2(x * 0.006, z * 0.006, 2) - 0.5) * 10;
      h = Math.max(h, -24 + suave(620, 300, d) * 62);
      h -= suave(0.8, 1.05, d / MEDIO) * 40;
      return Math.min(h, 70);
    },
    extras(t) {
      const n = t.def.estruc.portaaviones || 0;
      const cand = [[-640, 430, 0.3], [620, -480, -0.6], [560, 560, 1.2], [-560, -540, 0.9], [20, -940, 0], [-900, -60, 1.5], [900, 80, 0.2]];
      let puestos = 0;
      for (const [x, z, ang] of cand) {
        if (puestos >= n) break;
        const c = Math.cos(ang), s = Math.sin(ang);
        let mar = true;
        for (const u of [-150, -75, 0, 75, 150]) for (const v of [-45, 0, 45]) {
          if (t._suelo(x + u * c + v * s, z - u * s + v * c) > -9) mar = false;
        }
        if (!mar) continue;
        crearPortaaviones(t, x, z, ang);
        puestos++;
      }
    },
  },
};

// ---------------------------------------------------------- Portaaviones
const CUBIERTA = 11;

function crearPortaaviones(t, x, z, ang) {
  const L = 250, W = 56;
  const g = new THREE.Group();
  const gris = new THREE.MeshLambertMaterial({ color: 0x59616b, flatShading: true });
  const claro = new THREE.MeshLambertMaterial({ color: 0x8e969f, flatShading: true });
  const tex = canvasTextura(1024, 256, (c, w, h) => {
    c.fillStyle = '#3d4146';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#e8e8e8';
    for (let i = 60; i < w - 60; i += 90) c.fillRect(i, h / 2 - 3, 50, 6);
    c.fillStyle = '#e0c040';
    c.fillRect(0, 10, w, 4);
    c.fillRect(0, h - 14, w, 4);
    c.save();
    c.translate(w * 0.82, h * 0.5);
    c.rotate(-Math.PI / 2);
    c.fillStyle = '#e8e8e8';
    c.font = 'bold 84px sans-serif';
    c.textAlign = 'center';
    c.fillText('67', 0, 30);
    c.restore();
    c.strokeStyle = '#e8e8e8';
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(w * 0.1, h * 0.8); c.lineTo(w * 0.62, h * 0.2); c.stroke();
  });
  const cubierta = new THREE.MeshLambertMaterial({ map: tex });
  const losa = new THREE.Mesh(new THREE.BoxGeometry(L, 0.8, W), [gris, gris, cubierta, gris, gris, gris]);
  losa.position.y = CUBIERTA - 0.4;
  const casco = new THREE.Mesh(new THREE.BoxGeometry(L - 12, 13, 38), gris);
  casco.position.y = 4;
  const torre = new THREE.Mesh(new THREE.BoxGeometry(16, 26, 9), claro);
  torre.position.set(25, CUBIERTA + 13, 22);
  const mastil = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 14, 6), claro);
  mastil.position.set(25, CUBIERTA + 33, 22);
  const radar = new THREE.Mesh(new THREE.BoxGeometry(7, 0.6, 1.5), claro);
  radar.position.set(25, CUBIERTA + 40, 22);
  g.add(losa, casco, torre, mastil, radar);
  g.position.set(x, 0, z);
  g.rotation.y = ang;
  t.add(g);
  const c = Math.cos(ang), s = Math.sin(ang);
  t.cubiertas.push({ x, z, c, s, L, W, y: CUBIERTA });
  t.zonas.push({ x, z, r: 70, y: CUBIERTA, tipo: 'portaaviones', plana: false });
  // la torre es sólida
  const tx = x + 25 * c + 22 * s, tz = z - 25 * s + 22 * c;
  t.registrar(tx, tz, 11, CUBIERTA, 28);
}
