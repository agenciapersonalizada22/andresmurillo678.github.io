// =============================================================
//  🎁  OBJETOS EN EL SUELO
//  Lo que sueltan los bloques, los bichos y los cofres rotos: cubitos
//  que giran, caen y se pegan a ti cuando te acercas (se recogen solos).
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { TEXTURA_CARA } from './bloques.js';
import { esObjeto, colorDeObjeto } from './objetos.js';

const MAX = 90;
const CAJA = new THREE.BoxGeometry(1, 1, 1);

export class Drops {
  constructor(escena, mundo, promedios) {
    this.mundo = mundo;
    this.promedios = promedios;
    this.lista = [];
    this.grupo = new THREE.Group();
    escena.add(this.grupo);
    this.materiales = new Map();
    this.luz = [1, 1, 1];
  }

  material(id) {
    let m = this.materiales.get(id);
    if (!m) {
      let c;
      if (esObjeto(id)) c = new THREE.Color(colorDeObjeto(id));
      else { const p = this.promedios[TEXTURA_CARA[id * 6 + 2]] || [0.7, 0.7, 0.7]; c = new THREE.Color(p[0], p[1], p[2]); }
      m = new THREE.MeshBasicMaterial({ color: c });
      m.userData.base = c.clone();
      this.materiales.set(id, m);
      m.color.setRGB(c.r * this.luz[0], c.g * this.luz[1], c.b * this.luz[2]);
    }
    return m;
  }

  tintar(r, g, b) {
    if (r === this.luz[0] && g === this.luz[1] && b === this.luz[2]) return;
    this.luz = [r, g, b];
    for (const m of this.materiales.values()) m.color.setRGB(m.userData.base.r * r, m.userData.base.g * g, m.userData.base.b * b);
  }

  // Suelta n unidades de id en (x, y, z). vx, vz = empujoncito
  soltar(id, n, x, y, z, d = 0, vx = null, vz = null) {
    if (n <= 0) return;
    const malla = new THREE.Mesh(CAJA, this.material(id));
    const plano = esObjeto(id);
    malla.scale.set(plano ? 0.32 : 0.26, plano ? 0.32 : 0.26, plano ? 0.08 : 0.26);
    malla.position.set(x, y, z);
    this.grupo.add(malla);
    this.lista.push({
      id, n, d, malla, x, y, z, plano,
      vx: vx ?? (Math.random() - 0.5) * 2.6, vy: 3 + Math.random() * 2, vz: vz ?? (Math.random() - 0.5) * 2.6,
      edad: 0, espera: 0.55, fase: Math.random() * 6,
    });
    if (this.lista.length > MAX) this.quitar(0);
  }

  quitar(i) {
    const e = this.lista[i];
    this.grupo.remove(e.malla);
    this.lista.splice(i, 1);
  }

  limpiar() {
    while (this.lista.length) this.quitar(this.lista.length - 1);
  }

  // alRecoger(id, n, d) debe devolver cuántas NO cupieron
  actualizar(dt, jugador, alRecoger, puedeRecoger = true) {
    const m = this.mundo;
    for (let i = this.lista.length - 1; i >= 0; i--) {
      const e = this.lista[i];
      e.edad += dt;
      e.espera -= dt;
      if (e.edad > 300 || e.y < -10) { this.quitar(i); continue; }
      if (!m.estaListo(e.x, e.z)) continue;
      const dx = jugador.x - e.x, dy = jugador.y + 0.8 - e.y, dz = jugador.z - e.z;
      const dist = Math.hypot(dx, dy, dz);
      let atraido = false;
      if (puedeRecoger && e.espera <= 0 && dist < 2.6) {
        atraido = true;
        const f = Math.min(1, dt * 10);
        e.vx += (dx / dist * 7 - e.vx) * f; e.vz += (dz / dist * 7 - e.vz) * f; e.vy += (dy / dist * 7 - e.vy) * f;
        if (dist < 0.9) {
          const resto = alRecoger(e.id, e.n, e.d);
          if (resto <= 0) { this.quitar(i); continue; }
          e.n = resto;
          e.espera = 1;
        }
      } else {
        e.vy -= 22 * dt;
        e.vx *= Math.max(0, 1 - 3 * dt); e.vz *= Math.max(0, 1 - 3 * dt);
      }
      // movimiento con choque sencillo
      const nx = e.x + e.vx * dt, ny = e.y + e.vy * dt, nz = e.z + e.vz * dt;
      if (atraido) { e.x = nx; e.y = ny; e.z = nz; }   // atraído por ti: atraviesa lo que sea
      else {
      if (!m.esSolido(Math.floor(nx), Math.floor(e.y + 0.1), Math.floor(e.z))) e.x = nx; else e.vx = 0;
      if (!m.esSolido(Math.floor(e.x), Math.floor(e.y + 0.1), Math.floor(nz))) e.z = nz; else e.vz = 0;
      if (e.vy < 0 && m.esSolido(Math.floor(e.x), Math.floor(ny - 0.02), Math.floor(e.z))) {
        e.y = Math.floor(ny - 0.02) + 1.02; e.vy = 0;
      } else e.y = ny;
      }
      e.fase += dt * 2.4;
      e.malla.position.set(e.x, e.y + 0.14 + Math.sin(e.fase * 2) * 0.05, e.z);
      e.malla.rotation.y = e.fase;
    }
  }
}
