// Explosiones, humo, chispas y restos humeantes (todo con partículas recicladas)
import { Particulas, rgb } from './particulas.js';
import { Sonido } from './sonido.js';
import { mat } from './modelos.js';
import * as THREE from '../lib/three.module.min.js';

const C = {
  fuego0: rgb(0xfff2a0), fuego1: rgb(0xff4a10),
  humo0: rgb(0x6c6c6c), humo1: rgb(0x1c1c1c),
  claro0: rgb(0xf2f2f2), claro1: rgb(0xaaaaaa),
  polvo0: rgb(0xb89d6c), polvo1: rgb(0x8a7550),
  agua0: rgb(0xffffff), agua1: rgb(0x9fd3ee),
  chispa0: rgb(0xffe080), chispa1: rgb(0xff6a20),
};
const r = (a, b) => a + Math.random() * (b - a);
const ANILLO = new THREE.RingGeometry(0.75, 1, 28).rotateX(-Math.PI / 2);
const MARCA = new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2);
const DEBRIS0 = rgb(0x3a3430), DEBRIS1 = rgb(0x151515);
const CARBON = mat(0x1b1b1d);

export class Efectos {
  constructor(escena) {
    this.escena = escena;
    this.fuego = new Particulas(escena, 800, true);
    this.humo = new Particulas(escena, 1300, false);
    this.sacudida = 0;
    this.escalaSacudida = 1;
    this.terreno = null;
    this.anillos = [];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(ANILLO, new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      m.visible = false;
      escena.add(m);
      this.anillos.push({ m, t: 0, dur: 0.7, tam: 1 });
    }
    this.marcas = [];
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(MARCA, new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.visible = false;
      escena.add(m);
      this.marcas.push({ m, t: 0 });
    }
    this.sigAnillo = 0;
    this.sigMarca = 0;
    this.alExplosion = null; // (fuerza) para vibrar el mando
    this.camara = null;
    this.restos = [];
  }

  // Cantidad de partículas (0.3 a 1) según la calidad gráfica
  densidad(v) {
    this.fuego.dens = v;
    this.humo.dens = v;
  }

  fijarEscala(v) {
    this.fuego.fijarEscala(v);
    this.humo.fijarEscala(v);
  }

  _distancia(p) {
    return this.camara ? Math.hypot(p.x - this.camara.x, p.y - this.camara.y, p.z - this.camara.z) : 0;
  }

  explosion(p, tam = 1) {
    const d = this._distancia(p);
    const fuerza = tam * Math.max(0, 1 - d / 450) * 1.3;
    this.sacudida = Math.max(this.sacudida, fuerza * this.escalaSacudida);
    if (this.alExplosion) this.alExplosion(fuerza);
    Sonido.explosion(tam, Sonido.porDistancia(d));
    const n = Math.min(14, 6 + Math.round(tam * 4));
    for (let i = 0; i < n; i++) {
      const v = 7 * tam;
      this.fuego.emitir(p.x, p.y, p.z, r(-v, v), r(-v * 0.4, v), r(-v, v),
        r(0.45, 0.9), 2.5 * tam, 8 * tam, C.fuego0, C.fuego1, 1);
    }
    for (let i = 0; i < Math.min(10, 4 + tam * 3); i++) {
      this.humo.emitir(p.x + r(-1, 1) * tam, p.y, p.z + r(-1, 1) * tam, r(-3, 3), r(2, 6), r(-3, 3),
        r(1.6, 3.2), 4 * tam, 13 * tam, C.humo0, C.humo1, 0.8);
    }
    for (let i = 0; i < 8; i++) {
      this.fuego.emitir(p.x, p.y, p.z, r(-30, 30) * tam, r(0, 30) * tam, r(-30, 30) * tam,
        r(0.3, 0.7), 0.7, 0.2, C.chispa0, C.chispa1, 1, 25);
    }
    // destello, restos que caen y onda expansiva
    this.fuego.emitir(p.x, p.y, p.z, 0, 0, 0, 0.14, 7 * tam, 16 * tam, C.claro0, C.fuego0, 1);
    if (tam > 0.7) {
      for (let i = 0; i < Math.min(8, 3 + tam * 2); i++) {
        this.humo.emitir(p.x, p.y, p.z, r(-18, 18) * tam, r(6, 22) * tam, r(-18, 18) * tam, r(1.2, 2.2), 0.7, 0.5, DEBRIS0, DEBRIS1, 1, 26);
      }
      this._anillo(p, tam);
      this._marca(p, tam);
    }
  }

  _anillo(p, tam) {
    const o = this.anillos[this.sigAnillo];
    this.sigAnillo = (this.sigAnillo + 1) % this.anillos.length;
    o.t = 0;
    o.dur = 0.55 + tam * 0.1;
    o.tam = 12 * tam;
    o.m.position.set(p.x, p.y, p.z);
    o.m.visible = true;
  }

  // Mancha chamuscada en el suelo si la explosión fue cerca de él
  _marca(p, tam) {
    const T = this.terreno;
    if (!T) return;
    const h = T.altura(p.x, p.z);
    if (h < 0.5 || p.y - h > 8) return;
    const o = this.marcas[this.sigMarca];
    this.sigMarca = (this.sigMarca + 1) % this.marcas.length;
    o.t = 28;
    o.m.position.set(p.x, h + 0.35, p.z);
    o.m.scale.setScalar(2.5 * tam);
    o.m.visible = true;
  }

  chispa(p) {
    for (let i = 0; i < 3; i++) {
      this.fuego.emitir(p.x, p.y, p.z, r(-9, 9), r(0, 9), r(-9, 9), r(0.15, 0.35), 0.6, 0.1, C.chispa0, C.chispa1, 1, 20);
    }
  }

  polvo(p, tam = 1) {
    for (let i = 0; i < 4; i++) {
      this.humo.emitir(p.x, p.y + 0.5, p.z, r(-3, 3), r(1, 5), r(-3, 3), r(0.7, 1.4), 2 * tam, 7 * tam, C.polvo0, C.polvo1, 0.7);
    }
  }

  salpicadura(p, tam = 1) {
    for (let i = 0; i < 6; i++) {
      this.humo.emitir(p.x, 0.3, p.z, r(-5, 5), r(4, 14), r(-5, 5), r(0.6, 1.1), 1.8 * tam, 4 * tam, C.agua0, C.agua1, 0.8, 18);
    }
  }

  estela(p, claro = true, tam = 1) {
    this.humo.emitir(p.x, p.y, p.z, r(-0.5, 0.5), r(-0.3, 0.5), r(-0.5, 0.5),
      claro ? 1.3 : 1.8, 0.8 * tam, 3.6 * tam, claro ? C.claro0 : C.humo0, claro ? C.claro1 : C.humo1, claro ? 0.55 : 0.7);
  }

  llama(p, tam = 1) {
    this.fuego.emitir(p.x, p.y, p.z, r(-1, 1), r(0, 2), r(-1, 1), r(0.2, 0.4), 1.4 * tam, 0.3, C.fuego0, C.fuego1, 0.9);
  }

  // Quita el modelo cuando acabe el tiempo y mientras tanto humea, chamuscado
  dejarResto(grupo, segundos = 14) {
    grupo.traverse((o) => { if (o.isMesh) o.material = CARBON; });
    this.restos.push({ grupo, t: segundos, humo: 0 });
  }

  actualizar(dt) {
    this.fuego.actualizar(dt);
    this.humo.actualizar(dt);
    this.sacudida = Math.max(0, this.sacudida - dt * 2.2);
    for (const o of this.anillos) {
      if (!o.m.visible) continue;
      o.t += dt;
      const u = o.t / o.dur;
      if (u >= 1) { o.m.visible = false; continue; }
      o.m.scale.setScalar(1 + u * o.tam);
      o.m.material.opacity = 0.55 * (1 - u) * (1 - u);
    }
    for (const o of this.marcas) {
      if (!o.m.visible) continue;
      o.t -= dt;
      o.m.material.opacity = Math.min(0.5, o.t / 6);
      if (o.t <= 0) o.m.visible = false;
    }
    for (let i = this.restos.length - 1; i >= 0; i--) {
      const o = this.restos[i];
      o.t -= dt;
      o.humo -= dt;
      if (o.humo <= 0 && o.t > 2) {
        o.humo = 0.18;
        this.estela(o.grupo.position, false, 1.8);
        if (Math.random() < 0.3) this.llama(o.grupo.position, 1.4);
      }
      if (o.t <= 0) {
        if (o.grupo.parent) o.grupo.parent.remove(o.grupo);
        this.restos.splice(i, 1);
      }
    }
  }

  limpiar() {
    for (const o of this.anillos) o.m.visible = false;
    for (const o of this.marcas) o.m.visible = false;
    for (const o of this.restos) if (o.grupo.parent) o.grupo.parent.remove(o.grupo);
    this.restos.length = 0;
  }
}

