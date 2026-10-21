// =============================================================
//  TERRENO: colinas, mar, árboles, pueblos, rocas y pistas.
//  Todo se calcula con una función de altura; así aviones y
//  tanques pueden preguntar "¿qué altura hay en (x, z)?".
//  Cada mapa (config.js) elige su relieve y sus extras en mapas.js.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG, MAPAS } from './config.js';
import { crearRng, crearRuido } from './ruido.js';
import { RELIEVES, ARBOLES, COLORES_ROCA, suave, canvasTextura } from './mapas.js';

const M = CONFIG.mundo;
const MEDIO = M.tam / 2;
const CELDA = 80;

export class Terreno {
  constructor(escena, id) {
    this.escena = escena;
    this.id = id;
    this.def = MAPAS[id];
    this.rel = RELIEVES[this.def.relieve];
    this.rng = crearRng(this.def.semilla);
    this.ruido = crearRuido(this.def.semilla);
    this.ruido2 = crearRuido(this.def.semilla + 77);
    this.nivelAgua = 0;
    this.zonas = [];
    this.colisionadores = [];
    this.celdas = new Map();
    this.cubiertas = [];
    this.objetos = [];
    const P = this.def.paleta;
    this.pal = {};
    for (const k of ['arena', 'pasto1', 'pasto2', 'roca', 'nieve', 'fondo', 'asfalto']) this.pal[k] = new THREE.Color(P[k]);
    this._crearZonas();
    this._crearMalla();
    this._crearAgua();
    this._crearPistas();
    this._crearPueblos();
    if (this.rel.extras) this.rel.extras(this);
    this._crearArboles();
    this._crearRocas();
    this._crearMinimapa();
  }

  add(obj) {
    this.escena.add(obj);
    this.objetos.push(obj);
    return obj;
  }

  // Quita todo lo del mapa de la escena y libera la memoria de la tarjeta gráfica
  destruir() {
    const texturas = new Set();
    for (const o of this.objetos) {
      this.escena.remove(o);
      o.traverse((m) => {
        if (m.geometry) m.geometry.dispose();
        const ms = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
        for (const x of ms) {
          for (const k of ['map', 'emissiveMap']) if (x[k]) texturas.add(x[k]);
          x.dispose();
        }
        if (m.isInstancedMesh) m.dispose();
      });
    }
    for (const t of texturas) t.dispose();
    this.objetos.length = 0;
    this.colisionadores.length = 0;
    this.celdas.clear();
    this.cubiertas.length = 0;
  }

  // ---------------------------------------------------------- Altura
  _bruta(x, z) { return this.rel.bruta(this, x, z); }

  // Suelo sin cubiertas de barco (con zonas aplanadas)
  _suelo(x, z) {
    let h = this._bruta(x, z);
    for (const zo of this.zonas) {
      if (!zo.plana) continue;
      const d = Math.hypot(x - zo.x, z - zo.z);
      if (d < zo.r + 120) h += (zo.y - h) * (1 - suave(zo.r, zo.r + 120, d));
    }
    return h;
  }

  altura(x, z) {
    for (const c of this.cubiertas) {
      const dx = x - c.x, dz = z - c.z;
      const u = dx * c.c - dz * c.s, v = dx * c.s + dz * c.c;
      if (Math.abs(u) < c.L / 2 && Math.abs(v) < c.W / 2) return c.y;
    }
    return this._suelo(x, z);
  }

  normal(x, z, salida) {
    const hx = this.altura(x + 2, z) - this.altura(x - 2, z);
    const hz = this.altura(x, z + 2) - this.altura(x, z - 2);
    return salida.set(-hx, 4, -hz).normalize();
  }

  // ---------------------------------------------------------- Obstáculos (edificios, rocas)
  registrar(x, z, r, y, h) {
    const c = { x, z, r, y, h };
    this.colisionadores.push(c);
    const k = Math.floor(x / CELDA) * 4096 + Math.floor(z / CELDA);
    const l = this.celdas.get(k);
    if (l) l.push(c); else this.celdas.set(k, [c]);
    return c;
  }

  _cerca(x, z) {
    const cx = Math.floor(x / CELDA), cz = Math.floor(z / CELDA);
    const salida = [];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const l = this.celdas.get((cx + i) * 4096 + cz + j);
      if (l) for (const c of l) salida.push(c);
    }
    return salida;
  }

  // Colisionador (edificio o roca) que contiene el punto, o null
  colision(x, y, z, margen = 0) {
    const cx = Math.floor(x / CELDA), cz = Math.floor(z / CELDA);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const l = this.celdas.get((cx + i) * 4096 + cz + j);
      if (!l) continue;
      for (const c of l) {
        const dx = x - c.x, dz = z - c.z, rr = c.r + margen;
        if (dx * dx + dz * dz < rr * rr && y < c.y + c.h) return c;
      }
    }
    return null;
  }

  // Altura del suelo o del edificio más alto en ese punto (para esquivar en vuelo)
  techo(x, z) {
    let h = Math.max(this.altura(x, z), 0);
    for (const c of this._cerca(x, z)) {
      const dx = x - c.x, dz = z - c.z, rr = c.r + 12;
      if (dx * dx + dz * dz < rr * rr) h = Math.max(h, c.y + c.h);
    }
    return h;
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

  _valido(x, z, margen, plano) {
    if (Math.hypot(x, z) > M.limite - 150) return null;
    const h = this.altura(x, z);
    if (h < 2 || h > 60) return null;
    if (Math.abs(this.altura(x + 6, z) - h) > plano || Math.abs(this.altura(x, z + 6) - h) > plano) return null;
    if (Math.abs(this.altura(x - 6, z) - h) > plano || Math.abs(this.altura(x, z - 6) - h) > plano) return null;
    if (this.colision(x, h + 1, z, margen)) return null;
    return { x, z, y: h };
  }

  // Punto de tierra firme, plano y sin obstáculos (nunca en agua, roca ni edificio)
  puntoLibre(cerca = null, min = 0, max = 1000, margen = 8) {
    for (let i = 0; i < 90; i++) {
      let x, z;
      if (cerca) {
        const a = Math.random() * Math.PI * 2, d = min + Math.random() * (max - min);
        x = cerca.x + Math.cos(a) * d;
        z = cerca.z + Math.sin(a) * d;
      } else {
        x = (Math.random() - 0.5) * 2 * max;
        z = (Math.random() - 0.5) * 2 * max;
      }
      const p = this._valido(x, z, margen, 2.5);
      if (p) return p;
    }
    // sin hueco cerca: cualquier punto válido del mapa
    for (let i = 0; i < 400; i++) {
      const p = this._valido((Math.random() - 0.5) * 2 * (M.limite - 150), (Math.random() - 0.5) * 2 * (M.limite - 150), margen, i < 200 ? 2.5 : 5);
      if (p) return p;
    }
    for (let r = 0; r < 1000; r += 12) for (let a = 0; a < 6.28; a += 0.3) {
      const p = this._valido(Math.cos(a) * r, Math.sin(a) * r, 2, 8);
      if (p) return p;
    }
    return { x: 0, z: 0, y: Math.max(this.altura(0, 0), 2) };
  }

  // Punto de mar abierto (para barcos): agua honda, lejos de islas y portaaviones
  puntoMar(cerca = null, min = 0, max = 1000) {
    for (let i = 0; i < 200; i++) {
      let x, z;
      if (cerca && i < 120) {
        const a = Math.random() * Math.PI * 2, d = min + Math.random() * (max - min);
        x = cerca.x + Math.cos(a) * d;
        z = cerca.z + Math.sin(a) * d;
      } else {
        x = (Math.random() - 0.5) * 2 * (M.limite - 100);
        z = (Math.random() - 0.5) * 2 * (M.limite - 100);
      }
      if (Math.hypot(x, z) > M.limite - 100) continue;
      let ok = true;
      for (const [dx, dz] of [[0, 0], [30, 0], [-30, 0], [0, 30], [0, -30]]) if (this.altura(x + dx, z + dz) > -4) { ok = false; break; }
      if (ok) return { x, z, y: this.nivelAgua };
    }
    return null;
  }

  // Zona donde empieza el tanque del jugador
  zonaTanque() {
    const ok = this.zonas.filter((z) => z.tipo === 'ciudad' || z.tipo === 'base');
    return ok.find((z) => z.tipo === 'ciudad') || ok[0] || this.zonas[0];
  }

  // ---------------------------------------------------------- Zonas planas
  _crearZonas() {
    const E = this.def.estruc;
    if (this.rel.zonas) { this.rel.zonas(this); return; }
    this.zonas.push({ x: 0, z: 0, r: 190, y: Math.max(6, Math.min(24, this._bruta(0, 0))), tipo: 'pista', plana: true });
    const tipos = [];
    for (let i = 0; i < 3; i++) {
      if (i < E.zonas.ciudad) tipos.push('ciudad');
      if (i < E.zonas.base) tipos.push('base');
    }
    for (const tipo of tipos) {
      let puesto = false;
      for (let pasada = 0; pasada < 2 && !puesto; pasada++) {
        for (let i = 0; i < 260 && !puesto; i++) {
          const x = (this.rng() - 0.5) * 1700, z = (this.rng() - 0.5) * 1700;
          const h = this._bruta(x, z);
          if (pasada === 0 ? (h < 4 || h > 30) : (h < 2.5 || h > 120)) continue;
          if (this.zonas.some((o) => Math.hypot(o.x - x, o.z - z) < (pasada === 0 ? 480 : 330))) continue;
          this.zonas.push({ x, z, r: tipo === 'ciudad' ? 120 : 90, y: Math.min(40, Math.max(5, h)), tipo, plana: true });
          puesto = true;
        }
      }
    }
  }

  // ---------------------------------------------------------- Malla
  _color(x, z, h, ny, c) {
    const p = this.pal, P = this.def.paleta;
    const v = this.ruido2(x * 0.02, z * 0.02, 2);
    if (h < 0) c.copy(p.fondo).lerp(p.arena, Math.max(0, 1 + h / 14));
    else if (h < 2.2 && this.def.agua) c.copy(p.arena);
    else {
      c.copy(p.pasto1).lerp(p.pasto2, v);
      if (h > P.rocaDesde) c.lerp(p.roca, suave(P.rocaDesde, P.rocaDesde + 22, h));
      if (h > P.nieveDesde) c.lerp(p.nieve, suave(P.nieveDesde, P.nieveDesde + 18, h));
      c.lerp(p.roca, suave(0.8, 0.62, ny));
      for (const zo of this.zonas) {
        if ((zo.tipo === 'ciudad' || zo.tipo === 'base') && Math.hypot(x - zo.x, z - zo.z) < zo.r * 0.95) c.lerp(p.asfalto, zo.tipo === 'base' ? 0.75 : 0.45);
      }
    }
    return c;
  }

  _crearMalla() {
    const g = new THREE.PlaneGeometry(M.tam, M.tam, M.seg, M.seg);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) p.setY(i, this._suelo(p.getX(i), p.getZ(i)));
    g.computeVertexNormals();
    const nor = g.attributes.normal;
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      this._color(p.getX(i), p.getZ(i), p.getY(i), nor.getY(i), c);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.malla = this.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })));
  }

  _crearAgua() {
    const A = this.def.agua;
    if (!A) return;
    const tex = canvasTextura(128, 128, (g, w, h) => {
      g.fillStyle = A.color;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.13})`;
        g.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 9, 1);
      }
    }, true);
    tex.repeat.set(160, 160);
    this.texAgua = tex;
    const m = new THREE.MeshPhongMaterial({ map: tex, transparent: true, opacity: A.op, specular: 0x334455, shininess: 40 });
    this.agua = this.add(new THREE.Mesh(new THREE.PlaneGeometry(M.tam * 3.2, M.tam * 3.2).rotateX(-Math.PI / 2), m));
    this.agua.position.y = this.nivelAgua;
  }

  actualizar(t) {
    if (this.texAgua) this.texAgua.offset.set(t * 0.004, t * 0.0025);
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
    const luces = [];
    for (const zo of this.zonas) {
      if (zo.tipo !== 'pista' && zo.tipo !== 'base') continue;
      if (this.rel.sinPistas) continue;
      const pista = new THREE.Mesh(geo, m);
      pista.position.set(zo.x, zo.y + 0.2, zo.z);
      if (zo.tipo === 'base') { pista.scale.set(0.8, 1, 0.55); pista.position.x += 40; }
      this.add(pista);
      if (this.def.estruc.luces) {
        const sx = zo.tipo === 'base' ? 0.8 : 1, sz = zo.tipo === 'base' ? 0.55 : 1;
        for (let k = -11; k <= 11; k++) for (const lado of [-1, 1]) {
          luces.push(pista.position.x + lado * 19 * sx, zo.y + 1.2, pista.position.z + k * 20 * sz);
        }
      }
    }
    if (luces.length) {
      const n = luces.length / 3;
      const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1.1, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), n);
      const o = new THREE.Object3D();
      for (let i = 0; i < n; i++) { o.position.set(luces[i * 3], luces[i * 3 + 1], luces[i * 3 + 2]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
      this.add(im);
    }
  }

  // ---------------------------------------------------------- Pueblos y bases
  _texVentanas(luces) {
    const celdas = [];
    for (let i = 0; i < 16; i++) celdas.push(this.rng() < 0.3);
    const dib = (g, w, h, emisiva) => {
      g.fillStyle = emisiva ? '#000' : '#b9bdc2';
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const on = celdas[y * 4 + x];
        if (emisiva && !on) continue;
        g.fillStyle = on ? '#ffe08a' : '#3d4b63';
        g.fillRect(6 + x * 16, 6 + y * 16, 8, 9);
      }
    };
    const map = canvasTextura(64, 64, (g, w, h) => dib(g, w, h, false), true);
    const emis = luces ? canvasTextura(64, 64, (g, w, h) => dib(g, w, h, true), true) : null;
    return { map, emis };
  }

  // Geometrías de caja con las ventanas repetidas según la altura (3 clases)
  _geoEdificio(filas) {
    const g = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * filas);
    return g;
  }

  // lista = [{ x, z, w, d, h, y }]
  _instanciarEdificios(lista) {
    if (!lista.length) return;
    const luces = this.def.estruc.luces;
    const { map, emis } = this._texVentanas(luces);
    const mat = new THREE.MeshLambertMaterial({ map });
    if (emis) { mat.emissiveMap = emis; mat.emissive = new THREE.Color(0xffffff); mat.emissiveIntensity = 1.4; }
    const clases = [{ max: 24, filas: 1.4 }, { max: 60, filas: 3.4 }, { max: 1e9, filas: 7 }];
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    const tono = this.def.estruc.casas.tono;
    const rng = this.rng;
    for (let k = 0; k < clases.length; k++) {
      const sub = lista.filter((b) => b.h < clases[k].max && (k === 0 || b.h >= clases[k - 1].max));
      if (!sub.length) continue;
      const im = new THREE.InstancedMesh(this._geoEdificio(clases[k].filas), mat, sub.length);
      sub.forEach((b, i) => {
        o.position.set(b.x, b.y, b.z);
        o.scale.set(b.w, b.h, b.d);
        o.updateMatrix();
        im.setMatrixAt(i, o.matrix);
        im.setColorAt(i, col.setHSL(tono + rng() * 0.1, 0.12 + rng() * 0.2, 0.55 + rng() * 0.3));
        this.registrar(b.x, b.z, Math.max(b.w, b.d) * 0.52, b.y, b.h);
      });
      this.add(im);
    }
  }

  _crearPueblos() {
    const lista = [];
    const rng = this.rng;
    const C = this.def.estruc.casas;
    for (const zo of this.zonas) {
      if (zo.tipo === 'ciudad') {
        for (let gx = -4; gx <= 4; gx++) for (let gz = -4; gz <= 4; gz++) {
          if (rng() < 0.35 || (gx === 0 && gz === 0)) continue;
          const w = 11 + rng() * 9, d = 11 + rng() * 9;
          lista.push({ x: zo.x + gx * 26 + (rng() - 0.5) * 4, z: zo.z + gz * 26 + (rng() - 0.5) * 4, w, d, h: C.min + rng() * rng() * C.alto, y: zo.y });
        }
      } else if (zo.tipo === 'base') {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + 0.4;
          lista.push({ x: zo.x + Math.cos(a) * 62, z: zo.z + Math.sin(a) * 62, w: 26, d: 14, h: 9, y: zo.y });
        }
      }
    }
    if (this.rel.edificios) this.rel.edificios(this, lista);
    this._instanciarEdificios(lista);
  }

  // ---------------------------------------------------------- Árboles
  _crearArboles() {
    const A = ARBOLES[this.def.estruc.arboles];
    const max = this.def.estruc.nArb;
    if (!A || !max) return;
    const copas = new THREE.InstancedMesh(A.copa(), new THREE.MeshLambertMaterial({ flatShading: true, color: A.colorCopa || 0xffffff }), max);
    const troncos = new THREE.InstancedMesh(A.tronco(), new THREE.MeshLambertMaterial({ color: A.colorTronco }), max);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    let n = 0;
    for (let i = 0; i < 12000 && n < max; i++) {
      const x = (this.rng() - 0.5) * (M.tam - 160), z = (this.rng() - 0.5) * (M.tam - 160);
      const h = this.altura(x, z);
      if (h < A.hMin || h > A.hMax) continue;
      if (this.ruido(x * 0.004 + 40, z * 0.004 + 40, 3) < A.umbral) continue;
      if (this.zonas.some((zo) => zo.plana && Math.hypot(x - zo.x, z - zo.z) < zo.r + 25)) continue;
      if (Math.abs(this.altura(x + 5, z) - h) > A.pend) continue;
      if (this.colision(x, h + 1, z, 6)) continue;
      const s = A.esc[0] + this.rng() * (A.esc[1] - A.esc[0]);
      o.position.set(x, h - 0.3, z);
      o.scale.set(s, s * (0.9 + this.rng() * 0.4), s);
      o.rotation.y = this.rng() * 6;
      o.updateMatrix();
      copas.setMatrixAt(n, o.matrix);
      troncos.setMatrixAt(n, o.matrix);
      copas.setColorAt(n, A.color(col, this.rng));
      n++;
    }
    copas.count = troncos.count = n;
    this.add(copas);
    this.add(troncos);
  }

  // ---------------------------------------------------------- Rocas (cobertura)
  _crearRocas() {
    const R = COLORES_ROCA[this.def.estruc.rocas];
    if (!R) return;
    const max = 140;
    const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: R.color, flatShading: true }), max);
    const o = new THREE.Object3D();
    let n = 0;
    for (let k = 0; k < 28 && n < max; k++) {
      const cx = (this.rng() - 0.5) * 2000, cz = (this.rng() - 0.5) * 2000;
      for (let j = 0; j < 5 && n < max; j++) {
        const x = cx + (this.rng() - 0.5) * 60, z = cz + (this.rng() - 0.5) * 60;
        const h = this.altura(x, z);
        if (h < 2 || h > 70 || this.zonas.some((zo) => zo.plana && Math.hypot(x - zo.x, z - zo.z) < zo.r + 10)) continue;
        const s = R.tam[0] + this.rng() * (R.tam[1] - R.tam[0]);
        if (this.colision(x, h + 1, z, s)) continue;
        o.position.set(x, h - s * 0.15, z);
        o.scale.set(s, s * 0.75, s * (0.8 + this.rng() * 0.4));
        o.rotation.set(this.rng(), this.rng() * 6, this.rng());
        o.updateMatrix();
        im.setMatrixAt(n++, o.matrix);
        this.registrar(x, z, s * 0.85, h - 1, s * 0.9);
      }
    }
    im.count = n;
    this.add(im);
  }

  // ---------------------------------------------------------- Minimapa
  _crearMinimapa() {
    const P = 160;
    const c = document.createElement('canvas');
    c.width = c.height = P;
    const g = c.getContext('2d');
    const img = g.createImageData(P, P);
    const col = new THREE.Color();
    for (let j = 0; j < P; j++) for (let i = 0; i < P; i++) {
      const x = (i / P - 0.5) * M.tam, z = (j / P - 0.5) * M.tam;
      const h = this.altura(x, z);
      const ny = 1 / Math.hypot(1, (this.altura(x + 12, z) - h) / 12, (this.altura(x, z + 12) - h) / 12);
      this._color(x, z, h, ny, col);
      const k = (j * P + i) * 4;
      const sombra = 0.75;
      img.data[k] = col.r * 255 * sombra; img.data[k + 1] = col.g * 255 * sombra; img.data[k + 2] = col.b * 255 * sombra; img.data[k + 3] = 255;
      if (h < 0 && this.def.agua) { img.data[k] = 20; img.data[k + 1] = 70 + h; img.data[k + 2] = 120; }
    }
    g.putImageData(img, 0, 0);
    g.fillStyle = 'rgba(40,40,44,0.9)';
    const s = P / M.tam;
    for (const o of this.colisionadores) {
      if (o.r < 6) continue;
      const w = Math.max(1.5, o.r * 2 * s);
      g.fillRect((o.x + MEDIO) * s - w / 2, (o.z + MEDIO) * s - w / 2, w, w);
    }
    for (const cu of this.cubiertas) {
      g.save();
      g.translate((cu.x + MEDIO) * s, (cu.z + MEDIO) * s);
      g.rotate(Math.atan2(cu.s, cu.c) * -1);
      g.fillStyle = 'rgba(120,128,138,1)';
      g.fillRect(-cu.L * s / 2, -cu.W * s / 2, cu.L * s, Math.max(2, cu.W * s));
      g.restore();
    }
    this.minimapa = c;
  }
}
