// =============================================================
//  TERRENO: colinas, mar, árboles, pueblos, rocas y pistas.
//  Todo se calcula con una función de altura; así aviones y
//  tanques pueden preguntar "¿qué altura hay en (x, z)?".
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';
import { crearRng, crearRuido } from './ruido.js';

const M = CONFIG.mundo;
const MEDIO = M.tam / 2;
const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function canvasTextura(w, h, dibujar, repetir) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export class Terreno {
  constructor(escena, semilla) {
    this.escena = escena;
    this.rng = crearRng(semilla);
    this.ruido = crearRuido(semilla);
    this.ruido2 = crearRuido(semilla + 77);
    this.zonas = [];
    this.colisionadores = [];
    this.pistas = [];
    this._crearZonas();
    this._crearMalla();
    this._crearAgua();
    this._crearPistas();
    this._crearPueblos();
    this._crearArboles();
    this._crearRocas();
    this._crearMinimapa();
  }

  // ---------------------------------------------------------- Altura
  _bruta(x, z) {
    const n = this.ruido(x * 0.0009 + 5, z * 0.0009 + 9, 4);
    let h = (n - 0.46) * 190 + (this.ruido2(x * 0.004, z * 0.004, 3) - 0.5) * 22;
    const d = Math.hypot(x, z) / MEDIO;
    h -= suave(0.7, 1.05, d) * 70; // el borde del mapa es mar
    return h;
  }

  altura(x, z) {
    let h = this._bruta(x, z);
    for (const zo of this.zonas) {
      const d = Math.hypot(x - zo.x, z - zo.z);
      if (d < zo.r + 120) h += (zo.y - h) * (1 - suave(zo.r, zo.r + 120, d));
    }
    return h;
  }

  normal(x, z, salida) {
    const hx = this.altura(x + 2, z) - this.altura(x - 2, z);
    const hz = this.altura(x, z + 2) - this.altura(x, z - 2);
    return salida.set(-hx, 4, -hz).normalize();
  }

  // Colisionador (edificio o roca) que contiene el punto, o null
  colision(x, y, z, margen = 0) {
    for (const c of this.colisionadores) {
      const dx = x - c.x, dz = z - c.z, rr = c.r + margen;
      if (dx * dx + dz * dz < rr * rr && y < c.y + c.h) return c;
    }
    return null;
  }

  // ¿hay algo (suelo o edificio) entre dos puntos?
  bloqueado(a, b) {
    for (let i = 1; i < 14; i++) {
      const t = i / 14;
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, z = a.z + (b.z - a.z) * t;
      if (y < this.altura(x, z) || this.colision(x, y, z)) return true;
    }
    return false;
  }

  // Punto de tierra firme, plano y sin obstáculos
  puntoLibre(cerca = null, min = 0, max = 1000, margen = 8) {
    for (let i = 0; i < 80; i++) {
      let x, z;
      if (cerca) {
        const a = Math.random() * Math.PI * 2, d = min + Math.random() * (max - min);
        x = cerca.x + Math.cos(a) * d;
        z = cerca.z + Math.sin(a) * d;
      } else {
        x = (Math.random() - 0.5) * 2 * max;
        z = (Math.random() - 0.5) * 2 * max;
      }
      if (Math.hypot(x, z) > M.limite - 150) continue;
      const h = this.altura(x, z);
      if (h < 2 || h > 60) continue;
      if (Math.abs(this.altura(x + 6, z) - h) > 2.5 || Math.abs(this.altura(x, z + 6) - h) > 2.5) continue;
      if (this.colision(x, h + 1, z, margen)) continue;
      return { x, z, y: h };
    }
    return { x: 0, z: 0, y: this.altura(0, 0) };
  }

  // ---------------------------------------------------------- Zonas planas
  _crearZonas() {
    this.zonas.push({ x: 0, z: 0, r: 190, y: Math.max(6, Math.min(24, this._bruta(0, 0))), tipo: 'pista' });
    const tipos = ['ciudad', 'base', 'ciudad', 'base', 'ciudad', 'base'];
    for (const tipo of tipos) {
      for (let i = 0; i < 200; i++) {
        const x = (this.rng() - 0.5) * 1700, z = (this.rng() - 0.5) * 1700;
        const h = this._bruta(x, z);
        if (h < 4 || h > 30) continue;
        if (this.zonas.some((o) => Math.hypot(o.x - x, o.z - z) < 480)) continue;
        this.zonas.push({ x, z, r: tipo === 'ciudad' ? 120 : 90, y: Math.max(5, h), tipo });
        break;
      }
    }
  }

  // ---------------------------------------------------------- Malla
  _crearMalla() {
    const g = new THREE.PlaneGeometry(M.tam, M.tam, M.seg, M.seg);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) p.setY(i, this.altura(p.getX(i), p.getZ(i)));
    g.computeVertexNormals();
    const nor = g.attributes.normal;
    const c = new THREE.Color();
    const arena = new THREE.Color(0xd9c88f), pasto1 = new THREE.Color(0x3d7a38), pasto2 = new THREE.Color(0x76a64a);
    const roca = new THREE.Color(0x857d70), nieve = new THREE.Color(0xf0f4f7), fondo = new THREE.Color(0x2f6670);
    const asfalto = new THREE.Color(0x7d8082);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = p.getY(i);
      const v = this.ruido2(x * 0.02, z * 0.02, 2);
      if (h < 0) c.copy(fondo).lerp(arena, Math.max(0, 1 + h / 14));
      else if (h < 2.2) c.copy(arena);
      else {
        c.copy(pasto1).lerp(pasto2, v);
        if (h > 40) c.lerp(roca, suave(40, 62, h));
        if (h > 78) c.lerp(nieve, suave(78, 96, h));
        c.lerp(roca, suave(0.8, 0.62, nor.getY(i)));
        for (const zo of this.zonas) {
          if (zo.tipo !== 'pista' && Math.hypot(x - zo.x, z - zo.z) < zo.r * 0.95) c.lerp(asfalto, zo.tipo === 'base' ? 0.75 : 0.45);
        }
      }
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.malla = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.escena.add(this.malla);
  }

  _crearAgua() {
    const tex = canvasTextura(128, 128, (g, w, h) => {
      g.fillStyle = '#2f8cc0';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.13})`;
        g.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 9, 1);
      }
    }, true);
    tex.repeat.set(160, 160);
    this.texAgua = tex;
    const m = new THREE.MeshPhongMaterial({ map: tex, transparent: true, opacity: 0.88, specular: 0x334455, shininess: 40 });
    this.agua = new THREE.Mesh(new THREE.PlaneGeometry(M.tam * 3.2, M.tam * 3.2).rotateX(-Math.PI / 2), m);
    this.agua.position.y = 0;
    this.escena.add(this.agua);
  }

  actualizar(t) {
    this.texAgua.offset.set(t * 0.004, t * 0.0025);
  }

  // ---------------------------------------------------------- Pistas
  _crearPistas() {
    const tex = canvasTextura(64, 512, (g, w, h) => {
      g.fillStyle = '#34373b';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8e8e8';
      for (let y = 40; y < h - 40; y += 56) g.fillRect(w / 2 - 2, y, 4, 28);
      for (let i = 0; i < 6; i++) { g.fillRect(8 + i * 8, 6, 4, 22); g.fillRect(8 + i * 8, h - 28, 4, 22); }
      g.fillRect(2, 0, 2, h); g.fillRect(w - 4, 0, 2, h);
    });
    const geo = new THREE.PlaneGeometry(36, 460).rotateX(-Math.PI / 2);
    const m = new THREE.MeshLambertMaterial({ map: tex });
    for (const zo of this.zonas) {
      if (zo.tipo === 'ciudad') continue;
      const pista = new THREE.Mesh(geo, m);
      pista.position.set(zo.x, zo.y + 0.2, zo.z);
      if (zo.tipo === 'base') { pista.scale.set(0.8, 1, 0.55); pista.position.x += 40; }
      this.escena.add(pista);
    }
  }

  // ---------------------------------------------------------- Pueblos y bases
  _crearPueblos() {
    const tex = canvasTextura(64, 64, (g, w, h) => {
      g.fillStyle = '#b9bdc2';
      g.fillRect(0, 0, w, h);
      for (let y = 6; y < h; y += 16) for (let x = 6; x < w; x += 16) {
        g.fillStyle = Math.random() < 0.3 ? '#ffe9a0' : '#3d4b63';
        g.fillRect(x, y, 8, 9);
      }
    });
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const lista = [];
    const rng = this.rng;
    for (const zo of this.zonas) {
      if (zo.tipo === 'pista') continue;
      if (zo.tipo === 'ciudad') {
        for (let gx = -4; gx <= 4; gx++) for (let gz = -4; gz <= 4; gz++) {
          if (rng() < 0.35 || (gx === 0 && gz === 0)) continue;
          const w = 11 + rng() * 9, d = 11 + rng() * 9;
          lista.push({ x: zo.x + gx * 26 + (rng() - 0.5) * 4, z: zo.z + gz * 26 + (rng() - 0.5) * 4, w, d, h: 9 + rng() * rng() * 46, y: zo.y });
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + 0.4;
          lista.push({ x: zo.x + Math.cos(a) * 62, z: zo.z + Math.sin(a) * 62, w: 26, d: 14, h: 9, y: zo.y });
        }
      }
    }
    const m = new THREE.MeshLambertMaterial({ map: tex });
    const im = new THREE.InstancedMesh(geo, m, lista.length);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    lista.forEach((b, i) => {
      o.position.set(b.x, b.y, b.z);
      o.scale.set(b.w, b.h, b.d);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
      im.setColorAt(i, col.setHSL(0.08 + rng() * 0.1, 0.12 + rng() * 0.2, 0.55 + rng() * 0.3));
      this.colisionadores.push({ x: b.x, z: b.z, r: Math.max(b.w, b.d) * 0.52, y: b.y, h: b.h });
    });
    this.escena.add(im);
  }

  // ---------------------------------------------------------- Árboles
  _crearArboles() {
    const copa = new THREE.ConeGeometry(2.8, 10, 6).translate(0, 8, 0);
    const tronco = new THREE.CylinderGeometry(0.4, 0.55, 3.2, 5).translate(0, 1.6, 0);
    const max = 1700;
    const copas = new THREE.InstancedMesh(copa, new THREE.MeshLambertMaterial({ flatShading: true }), max);
    const troncos = new THREE.InstancedMesh(tronco, new THREE.MeshLambertMaterial({ color: 0x5b3d24 }), max);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    let n = 0;
    for (let i = 0; i < 9000 && n < max; i++) {
      const x = (this.rng() - 0.5) * (M.tam - 160), z = (this.rng() - 0.5) * (M.tam - 160);
      const h = this.altura(x, z);
      if (h < 2.5 || h > 52) continue;
      if (this.ruido(x * 0.004 + 40, z * 0.004 + 40, 3) < 0.5) continue;
      if (this.zonas.some((zo) => Math.hypot(x - zo.x, z - zo.z) < zo.r + 25)) continue;
      if (Math.abs(this.altura(x + 5, z) - h) > 4) continue;
      const s = 0.8 + this.rng() * 0.8;
      o.position.set(x, h - 0.3, z);
      o.scale.set(s, s * (0.9 + this.rng() * 0.4), s);
      o.rotation.y = this.rng() * 6;
      o.updateMatrix();
      copas.setMatrixAt(n, o.matrix);
      troncos.setMatrixAt(n, o.matrix);
      copas.setColorAt(n, col.setHSL(0.3 + this.rng() * 0.06, 0.5, 0.2 + this.rng() * 0.12));
      n++;
    }
    copas.count = troncos.count = n;
    this.escena.add(copas, troncos);
  }

  // ---------------------------------------------------------- Rocas (cobertura)
  _crearRocas() {
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const max = 140;
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0x8b857a, flatShading: true }), max);
    const o = new THREE.Object3D();
    let n = 0;
    for (let k = 0; k < 28 && n < max; k++) {
      const cx = (this.rng() - 0.5) * 2000, cz = (this.rng() - 0.5) * 2000;
      for (let j = 0; j < 5 && n < max; j++) {
        const x = cx + (this.rng() - 0.5) * 60, z = cz + (this.rng() - 0.5) * 60;
        const h = this.altura(x, z);
        if (h < 2 || h > 70 || this.zonas.some((zo) => Math.hypot(x - zo.x, z - zo.z) < zo.r + 10)) continue;
        const s = 3 + this.rng() * 5;
        o.position.set(x, h - s * 0.15, z);
        o.scale.set(s, s * 0.75, s * (0.8 + this.rng() * 0.4));
        o.rotation.set(this.rng(), this.rng() * 6, this.rng());
        o.updateMatrix();
        im.setMatrixAt(n++, o.matrix);
        this.colisionadores.push({ x, z, r: s * 0.85, y: h - 1, h: s * 0.9 });
      }
    }
    im.count = n;
    this.escena.add(im);
  }

  // ---------------------------------------------------------- Minimapa
  _crearMinimapa() {
    const P = 160;
    const c = document.createElement('canvas');
    c.width = c.height = P;
    const g = c.getContext('2d');
    const img = g.createImageData(P, P);
    for (let j = 0; j < P; j++) for (let i = 0; i < P; i++) {
      const x = (i / P - 0.5) * M.tam, z = (j / P - 0.5) * M.tam;
      const h = this.altura(x, z);
      const k = (j * P + i) * 4;
      let r, gg, b;
      if (h < 0) { r = 20; gg = 70 + h; b = 120; }
      else if (h < 40) { r = 40 + h; gg = 100 + h * 0.8; b = 50; }
      else { r = 110 + h * 0.5; gg = 100 + h * 0.5; b = 90 + h * 0.5; }
      img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    this.minimapa = c;
  }
}

