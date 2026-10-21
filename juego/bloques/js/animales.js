// =============================================================
//  🐑  ANIMALES (cerdos, ovejas y vacas)
//  Son animalitos pasivos hechos de cajitas. Caminan sin rumbo,
//  se paran a pastar, no se caen por los barrancos ni entran al
//  agua, y de vez en cuando hacen su ruido. Aparecen sobre el
//  pasto cerca de ti (de día) y desaparecen si te alejas.
//  No se guardan: cada vez salen otros. Los modelos se reciclan.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';
import { B, DIBUJO, DIBUJO_AGUA } from './bloques.js';
import { Sonido } from './sonido.js';

const A = CONFIG.animales;
const GRAVEDAD = 28;
const RADIO = 0.3;
const ALTURA = 0.85;
const EPS = 1e-4;

// Cada parte: [ancho, alto, largo, x, y, z, material, pata?]. El frente es +Z.
const TIPOS = {
  cerdo: {
    colores: ['#f0a8a8', '#d98888', '#2a1a1a'],
    partes: [
      [0.62, 0.56, 0.92, 0, 0.6, 0, 0], [0.46, 0.42, 0.42, 0, 0.7, 0.64, 0],
      [0.24, 0.17, 0.1, 0, 0.64, 0.88, 1], [0.07, 0.07, 0.03, 0.12, 0.78, 0.86, 2], [0.07, 0.07, 0.03, -0.12, 0.78, 0.86, 2],
      [0.18, 0.3, 0.18, 0.18, 0.3, 0.3, 1, 1], [0.18, 0.3, 0.18, -0.18, 0.3, 0.3, 1, 1],
      [0.18, 0.3, 0.18, 0.18, 0.3, -0.3, 1, 1], [0.18, 0.3, 0.18, -0.18, 0.3, -0.3, 1, 1],
    ],
    tono: 'oink', paso: 1.1,
  },
  oveja: {
    colores: ['#ece8e0', '#c9b9a4', '#222222', '#a89886'],
    partes: [
      [0.74, 0.68, 0.98, 0, 0.78, 0, 0], [0.4, 0.4, 0.4, 0, 0.98, 0.62, 1],
      [0.06, 0.06, 0.03, 0.1, 1.04, 0.83, 2], [0.06, 0.06, 0.03, -0.1, 1.04, 0.83, 2],
      [0.16, 0.44, 0.16, 0.2, 0.44, 0.3, 3, 1], [0.16, 0.44, 0.16, -0.2, 0.44, 0.3, 3, 1],
      [0.16, 0.44, 0.16, 0.2, 0.44, -0.3, 3, 1], [0.16, 0.44, 0.16, -0.2, 0.44, -0.3, 3, 1],
    ],
    tono: 'be', paso: 1.0,
  },
  vaca: {
    colores: ['#f2f0ec', '#3a2a22', '#8a7a6a', '#1a1a1a'],
    partes: [
      [0.7, 0.66, 1.1, 0, 0.88, 0, 0],
      [0.44, 0.42, 0.4, 0, 1.08, 0.74, 0], [0.26, 0.18, 0.1, 0, 0.98, 0.98, 2],
      [0.06, 0.06, 0.03, 0.12, 1.16, 0.95, 3], [0.06, 0.06, 0.03, -0.12, 1.16, 0.95, 3],
      [0.18, 0.5, 0.18, 0.2, 0.5, 0.38, 1, 1], [0.18, 0.5, 0.18, -0.2, 0.5, 0.38, 1, 1],
      [0.18, 0.5, 0.18, 0.2, 0.5, -0.38, 1, 1], [0.18, 0.5, 0.18, -0.2, 0.5, -0.38, 1, 1],
    ],
    mancha: [[0.72, 0.4, 0.4, 0, 0.98, -0.2], [0.72, 0.3, 0.36, 0, 0.8, 0.3]],
    tono: 'muu', paso: 0.8,
  },
};
const NOMBRES = Object.keys(TIPOS);
const CAJA = new THREE.BoxGeometry(1, 1, 1);

function azarEntre(a, b) { return a + Math.random() * (b - a); }

export class Animales {
  constructor(escena, mundo) {
    this.escena = escena;
    this.mundo = mundo;
    this.lista = [];
    this.reserva = {};            // modelos libres por tipo (reciclaje)
    this.materiales = {};
    this.tiempoNacer = 0;
    this.luz = [1, 1, 1];
    this.grupo = new THREE.Group();
    escena.add(this.grupo);
    for (const nombre of NOMBRES) {
      this.materiales[nombre] = TIPOS[nombre].colores.map((c) => {
        const m = new THREE.MeshBasicMaterial({ color: c });
        m.userData.base = m.color.clone();
        return m;
      });
      this.reserva[nombre] = [];
    }
  }

  // Un modelo nuevo (o uno reciclado) de ese tipo
  modelo(nombre) {
    const libre = this.reserva[nombre].pop();
    if (libre) { libre.visible = true; return libre; }
    const t = TIPOS[nombre];
    const mats = this.materiales[nombre];
    const g = new THREE.Group();
    g.userData.patas = [];
    const poner = (malla, [w, h, l, x, y, z]) => {
      malla.scale.set(w, h, l);
      malla.position.set(x, y, z);
      g.add(malla);
    };
    for (const parte of t.partes) {
      const malla = new THREE.Mesh(CAJA, mats[parte[6]]);
      poner(malla, parte);
      if (parte[7]) g.userData.patas.push(malla);
      else if (parte[2] > 0.3 && parte[1] > 0.38 && parte[5] > 0.5) g.userData.cabeza = malla;
    }
    for (const m of t.mancha || []) {
      const malla = new THREE.Mesh(CAJA, mats[1]);
      poner(malla, [m[0], m[1], m[2], m[3], m[4], m[5]]);
    }
    g.traverse((o) => { if (o.isMesh) o.layers.enable(1); }); // dan sombra
    this.grupo.add(g);
    return g;
  }

  limpiar() {
    for (const a of this.lista) this.guardarModelo(a);
    this.lista.length = 0;
    this.tiempoNacer = 0;
  }

  guardarModelo(a) {
    a.malla.visible = false;
    this.reserva[a.tipo].push(a.malla);
  }

  tintar(r, g, b) {
    if (r === this.luz[0] && g === this.luz[1] && b === this.luz[2]) return;
    this.luz = [r, g, b];
    for (const lista of Object.values(this.materiales)) {
      for (const m of lista) m.color.setRGB(m.userData.base.r * r, m.userData.base.g * g, m.userData.base.b * b);
    }
  }

  // Busca un lugar de pasto, libre y no muy cerca, para que aparezca uno
  nacer(jugador, max) {
    const ang = Math.random() * Math.PI * 2;
    const dist = azarEntre(14, 30);
    const x = Math.floor(jugador.x + Math.cos(ang) * dist), z = Math.floor(jugador.z + Math.sin(ang) * dist);
    const m = this.mundo;
    if (!m.estaListo(x, z)) return;
    const y = m.alturaSuelo(x, z);
    if (y < CONFIG.mundo.nivelMar || m.obtener(x, y, z) !== B.PASTO) return;
    if (m.obtener(x, y + 1, z) !== B.AIRE && DIBUJO[m.obtener(x, y + 1, z)] !== 4) return;
    if (m.obtener(x, y + 2, z) !== B.AIRE) return;
    // en grupitos: si ya hay animales, mejor cerca de uno
    const tipo = NOMBRES[Math.floor(Math.random() * NOMBRES.length)];
    const malla = this.modelo(tipo);
    const a = {
      tipo, malla, x: x + 0.5, y: y + 1, z: z + 0.5, vx: 0, vy: 0, vz: 0,
      yaw: Math.random() * Math.PI * 2, rumbo: 0, estado: 'quieto', tiempo: azarEntre(0.5, 3),
      fase: Math.random() * 10, enSuelo: false, ruido: azarEntre(4, 12), cabeceo: 0,
    };
    a.rumbo = a.yaw;
    this.lista.push(a);
    if (this.lista.length > max) this.quitar(0);
  }

  quitar(i) {
    this.guardarModelo(this.lista[i]);
    this.lista.splice(i, 1);
  }

  esSolido(x, y, z) {
    return this.mundo.esSolido(Math.floor(x), Math.floor(y), Math.floor(z));
  }

  // Mueve en un eje; devuelve true si chocó
  moverEje(a, eje, d) {
    if (!d) return false;
    if (eje === 0) a.x += d; else if (eje === 1) a.y += d; else a.z += d;
    const x0 = Math.floor(a.x - RADIO + EPS), x1 = Math.floor(a.x + RADIO - EPS);
    const y0 = Math.floor(a.y + EPS), y1 = Math.floor(a.y + ALTURA - EPS);
    const z0 = Math.floor(a.z - RADIO + EPS), z1 = Math.floor(a.z + RADIO - EPS);
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          if (!this.mundo.esSolido(x, y, z)) continue;
          if (eje === 0) { a.x = d > 0 ? x - RADIO - EPS : x + 1 + RADIO + EPS; a.vx = 0; }
          else if (eje === 1) {
            if (d > 0) a.y = y - ALTURA - EPS; else { a.y = y + 1; a.enSuelo = true; }
            a.vy = 0;
          } else { a.z = d > 0 ? z - RADIO - EPS : z + 1 + RADIO + EPS; a.vz = 0; }
          return true;
        }
      }
    }
    return false;
  }

  // ¿Es seguro caminar hacia allá? (nada de barrancos ni agua)
  seguro(a, dx, dz) {
    const x = a.x + dx * 0.75, z = a.z + dz * 0.75;
    const y = Math.floor(a.y + 0.1);
    for (let k = 0; k <= 2; k++) {
      const id = this.mundo.obtener(Math.floor(x), y - k, Math.floor(z));
      if (DIBUJO[id] === DIBUJO_AGUA) return false;
      if (this.esSolido(x, y - k, z)) return !(k === 0 && this.esSolido(x, y + 1, z) && this.esSolido(x, y + 2, z));
    }
    return false;
  }

  pensar(a, dt) {
    a.tiempo -= dt;
    if (a.tiempo > 0) return;
    if (a.estado === 'quieto' && Math.random() < 0.8) {
      a.estado = 'camina';
      a.rumbo = Math.random() * Math.PI * 2;
      a.tiempo = azarEntre(1.5, 5);
    } else {
      a.estado = 'quieto';
      a.tiempo = azarEntre(1.5, 5);
    }
  }

  actualizar(dt, jugador, factorDia, max) {
    // aparecen de a poco, de día
    this.tiempoNacer -= dt;
    if (this.tiempoNacer <= 0) {
      this.tiempoNacer = this.lista.length < 2 ? 0.25 : 2.5;
      if (this.lista.length < max && factorDia > 0.35) this.nacer(jugador, max);
    }

    for (let i = this.lista.length - 1; i >= 0; i--) {
      const a = this.lista[i];
      const dx = a.x - jugador.x, dz = a.z - jugador.z;
      const lejos = dx * dx + dz * dz > 52 * 52;
      if (lejos || a.y < -10 || !this.mundo.estaListo(a.x, a.z)) {
        if (lejos || a.y < -10) { this.quitar(i); continue; }
        continue; // el terreno de abajo aún no existe: se queda quieto
      }

      this.pensar(a, dt);
      const dir = [Math.sin(a.rumbo), Math.cos(a.rumbo)];
      let rapidez = 0;
      if (a.estado === 'camina') {
        if (this.seguro(a, dir[0], dir[1])) rapidez = TIPOS[a.tipo].paso;
        else { a.rumbo = Math.random() * Math.PI * 2; a.tiempo = Math.min(a.tiempo, 0.6); }
      }
      // gira suave hacia donde va
      let dy = a.rumbo - a.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      a.yaw += dy * Math.min(1, dt * 6);
      const f = 1 - Math.exp(-8 * dt);
      a.vx += (Math.sin(a.yaw) * rapidez - a.vx) * f;
      a.vz += (Math.cos(a.yaw) * rapidez - a.vz) * f;

      const enAgua = DIBUJO[this.mundo.obtener(Math.floor(a.x), Math.floor(a.y + 0.2), Math.floor(a.z))] === DIBUJO_AGUA;
      if (enAgua) a.vy += (2 - a.vy) * (1 - Math.exp(-4 * dt));
      else a.vy = Math.max(-30, a.vy - GRAVEDAD * dt);

      a.enSuelo = false;
      const choco = this.moverEje(a, 0, a.vx * dt) | this.moverEje(a, 2, a.vz * dt);
      this.moverEje(a, 1, a.vy * dt);
      if (choco && a.enSuelo && rapidez > 0) a.vy = 7.2;   // salta escalones de 1 bloque

      // ruido de vez en cuando (más bajito cuanto más lejos)
      a.ruido -= dt;
      if (a.ruido <= 0) {
        a.ruido = azarEntre(6, 16);
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < 24) Sonido.animal(TIPOS[a.tipo].tono, 1 - d / 24);
      }

      // pose: patas que se mueven y cabeza que pasta
      const v = Math.hypot(a.vx, a.vz);
      a.fase += v * dt * 7;
      const m = a.malla;
      m.position.set(a.x, a.y, a.z);
      m.rotation.y = a.yaw;
      const pata = Math.sin(a.fase) * Math.min(1, v) * 0.7;
      const patas = m.userData.patas;
      for (let k = 0; k < patas.length; k++) {
        patas[k].rotation.x = (k === 0 || k === 3 ? pata : -pata);
      }
      if (m.userData.cabeza) {
        const quiere = a.estado === 'quieto' && a.tiempo < 3 ? 0.4 : 0;
        a.cabeceo += (quiere - a.cabeceo) * Math.min(1, dt * 4);
        m.userData.cabeza.rotation.x = a.cabeceo;
      }
    }
  }
}
