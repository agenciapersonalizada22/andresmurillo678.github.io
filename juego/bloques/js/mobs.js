// =============================================================
//  🧟  BICHOS: zombis, esqueletos, arañas, creepers y aldeanos
//  Están hechos de cajitas, como los animales. De noche (y en las
//  cuevas) salen los malos; de día los zombis y esqueletos se
//  queman con el sol. Los aldeanos viven en las aldeas y te
//  cambian cosas por esmeraldas. También están las flechas y las
//  explosiones del creeper.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { B, SOLIDO, DIBUJO, DIBUJO_AGUA, esIrrompible } from './bloques.js';
import { Sonido } from './sonido.js';
import { lanzarRayo } from './rayo.js';
import { hash2 } from './ruido.js';

const CAJA = new THREE.BoxGeometry(1, 1, 1);
const EPS = 1e-4;
const GRAV = 28;

export const TIPOS = {
  zombi: { nombre: 'Zombi', vida: 20, rad: 0.3, alto: 1.9, vel: 2.4, dano: 3, hostil: true, voz: 'zombi', botin: [['carne_podrida', 0, 2], ['hierro', 0.03, 1]] },
  esqueleto: { nombre: 'Esqueleto', vida: 20, rad: 0.3, alto: 1.9, vel: 2.1, dano: 3, hostil: true, voz: 'esqueleto', botin: [['hueso', 0, 2], ['flecha', 0, 2]] },
  arana: { nombre: 'Araña', vida: 16, rad: 0.5, alto: 0.9, vel: 3.3, dano: 2, hostil: true, voz: 'arana', botin: [['hilo', 0, 2]] },
  creeper: { nombre: 'Creeper', vida: 20, rad: 0.3, alto: 1.7, vel: 2.3, dano: 0, hostil: true, voz: null, botin: [['polvora', 0, 2]] },
  aldeano: { nombre: 'Aldeano', vida: 20, rad: 0.3, alto: 1.9, vel: 1.0, dano: 0, hostil: false, voz: 'aldeano', botin: [] },
};

export const OFICIOS = {
  granjero: { nombre: 'Granjero', color: '#8a6a3a', ofertas: [
    { dan: [['trigo', 16]], da: ['esmeralda', 1] }, { dan: [['esmeralda', 1]], da: ['pan', 4] }, { dan: [['esmeralda', 1]], da: ['manzana', 5] }] },
  herrero: { nombre: 'Herrero', color: '#4a4a52', ofertas: [
    { dan: [['hierro', 3]], da: ['esmeralda', 1] }, { dan: [['esmeralda', 2]], da: ['espada_hierro', 1] },
    { dan: [['esmeralda', 3]], da: ['pico_hierro', 1] }, { dan: [['esmeralda', 5]], da: ['peto_hierro', 1] }] },
  cazador: { nombre: 'Cazador', color: '#5a6a3a', ofertas: [
    { dan: [['hueso', 12]], da: ['esmeralda', 1] }, { dan: [['esmeralda', 2]], da: ['arco', 1] }, { dan: [['esmeralda', 1]], da: ['flecha', 8] }] },
  mecanico: { nombre: 'Mecánico', color: '#3a5a8a', ofertas: [
    { dan: [['carbon', 12]], da: ['esmeralda', 1] }, { dan: [['esmeralda', 2]], da: ['bidon', 1] }, { dan: [['esmeralda', 4]], da: ['pala_hierro', 1] }] },
};
const LISTA_OFICIOS = Object.keys(OFICIOS);
const NOMBRES_TIPO = Object.keys(TIPOS);

// Cajas que se ven con el rayo: devuelve la distancia o -1
export function rayoContraCaja(ox, oy, oz, dx, dy, dz, cx, cy, cz, rad, alto, max) {
  let t0 = 0, t1 = max;
  const ejes = [[ox, dx, cx - rad, cx + rad], [oy, dy, cy, cy + alto], [oz, dz, cz - rad, cz + rad]];
  for (const [o, d, a, b] of ejes) {
    if (Math.abs(d) < 1e-8) { if (o < a || o > b) return -1; continue; }
    let ta = (a - o) / d, tb = (b - o) / d;
    if (ta > tb) { const t = ta; ta = tb; tb = t; }
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    if (t0 > t1) return -1;
  }
  return t0;
}

// ----------------------------------------------------------- Modelos
const materiales = new Map();
let luz = [1, 1, 1];
const MAT_ROJO = new THREE.MeshBasicMaterial({ color: '#ff4a3a' });
const MAT_BLANCO = new THREE.MeshBasicMaterial({ color: '#ffffff' });

function mat(hex) {
  let m = materiales.get(hex);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: hex });
    m.userData.base = m.color.clone();
    m.color.setRGB(m.userData.base.r * luz[0], m.userData.base.g * luz[1], m.userData.base.b * luz[2]);
    materiales.set(hex, m);
  }
  return m;
}

export function tintarMobs(r, g, b) {
  if (r === luz[0] && g === luz[1] && b === luz[2]) return;
  luz = [r, g, b];
  for (const m of materiales.values()) m.color.setRGB(m.userData.base.r * r, m.userData.base.g * g, m.userData.base.b * b);
}

function caja(grupo, w, h, l, x, y, z, hex) {
  const m = new THREE.Mesh(CAJA, mat(hex));
  m.scale.set(w, h, l);
  m.position.set(x, y, z);
  m.userData.mat = m.material;
  grupo.add(m);
  return m;
}

function pivote(padre, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  padre.add(g);
  return g;
}

// Cuerpo de persona. P: piel, camisa, pantalon, fino (extremidades delgadas), tunica (cuerpo largo)
export function crearHumanoide(P) {
  const g = new THREE.Group();
  const gr = P.fino ? 0.18 : 0.25;
  const u = g.userData;
  u.piernaI = pivote(g, -0.125, 0.75, 0); u.piernaD = pivote(g, 0.125, 0.75, 0);
  for (const p of [u.piernaI, u.piernaD]) caja(p, gr, 0.75, gr, 0, -0.375, 0, P.pantalon);
  caja(g, 0.5, 0.75, 0.25, 0, 1.125, 0, P.camisa);
  if (P.tunica) caja(g, 0.56, 0.85, 0.32, 0, 0.55, 0, P.camisa);
  u.brazoI = pivote(g, -(0.25 + gr / 2), 1.5, 0); u.brazoD = pivote(g, 0.25 + gr / 2, 1.5, 0);
  for (const p of [u.brazoI, u.brazoD]) caja(p, gr, 0.75, gr, 0, -0.375, 0, P.manga || P.piel);
  u.cabeza = pivote(g, 0, 1.5, 0);
  caja(u.cabeza, 0.5, 0.5, 0.5, 0, 0.25, 0, P.piel);
  caja(u.cabeza, 0.1, 0.07, 0.03, -0.12, 0.3, 0.255, P.ojos || '#1a1a1a');
  caja(u.cabeza, 0.1, 0.07, 0.03, 0.12, 0.3, 0.255, P.ojos || '#1a1a1a');
  if (P.nariz) caja(u.cabeza, 0.1, 0.2, 0.12, 0, 0.18, 0.3, P.nariz);
  if (P.pelo) caja(u.cabeza, 0.54, 0.14, 0.54, 0, 0.5, 0, P.pelo);
  return g;
}

const CONSTRUCTORES = {
  zombi() {
    const g = crearHumanoide({ piel: '#5a9a4e', camisa: '#2a6a9a', pantalon: '#3a3a8a', manga: '#5a9a4e', ojos: '#101810' });
    g.userData.brazoI.rotation.x = g.userData.brazoD.rotation.x = -1.45;
    return g;
  },
  esqueleto() {
    const g = crearHumanoide({ piel: '#d8d8cc', camisa: '#c9c9bd', pantalon: '#bdbdb0', fino: true, ojos: '#1a1a1a' });
    const arco = caja(g.userData.brazoD, 0.06, 0.7, 0.14, 0.1, -0.7, 0.1, '#6a4a2a');
    arco.rotation.x = 0;
    g.userData.brazoD.rotation.x = -1.3;
    g.userData.brazoI.rotation.x = -1.2;
    return g;
  },
  aldeano(oficio) {
    const O = OFICIOS[oficio] || OFICIOS.granjero;
    const g = crearHumanoide({ piel: '#c9a07a', camisa: O.color, pantalon: O.color, manga: O.color, tunica: true, nariz: '#b88a62', ojos: '#2a2a2a', pelo: oficio === 'herrero' ? '#2a2a2a' : '#6a4a2a' });
    g.userData.brazoI.rotation.x = g.userData.brazoD.rotation.x = -0.9;
    return g;
  },
  creeper() {
    const g = new THREE.Group();
    const u = g.userData;
    const verde = '#4caa3a', oscuro = '#2f7a28';
    u.patas = [];
    for (const [x, z] of [[-0.13, 0.18], [0.13, 0.18], [-0.13, -0.18], [0.13, -0.18]]) {
      const p = pivote(g, x, 0.4, z);
      caja(p, 0.25, 0.4, 0.25, 0, -0.2, 0, oscuro);
      u.patas.push(p);
    }
    caja(g, 0.5, 0.8, 0.3, 0, 0.8, 0, verde);
    u.cabeza = pivote(g, 0, 1.2, 0);
    caja(u.cabeza, 0.5, 0.5, 0.5, 0, 0.25, 0, verde);
    for (const [w, h, x, y] of [[0.1, 0.1, -0.12, 0.33], [0.1, 0.1, 0.12, 0.33], [0.1, 0.12, 0, 0.18], [0.18, 0.08, 0, 0.09]]) caja(u.cabeza, w, h, 0.03, x, y, 0.255, '#101810');
    return g;
  },
  arana() {
    const g = new THREE.Group();
    const u = g.userData;
    const c = '#3a2f2a', rojo = '#c0211f';
    caja(g, 0.7, 0.45, 0.7, 0, 0.55, 0.1, c);
    caja(g, 0.9, 0.55, 1.1, 0, 0.6, -0.8, '#2c2420');
    u.cabeza = pivote(g, 0, 0.6, 0.62);
    caja(u.cabeza, 0.5, 0.4, 0.5, 0, 0, 0.1, c);
    caja(u.cabeza, 0.08, 0.08, 0.03, -0.12, 0.08, 0.37, rojo);
    caja(u.cabeza, 0.08, 0.08, 0.03, 0.12, 0.08, 0.37, rojo);
    u.patas = [];
    for (let i = 0; i < 4; i++) {
      for (const lado of [-1, 1]) {
        const p = pivote(g, lado * 0.3, 0.55, 0.3 - i * 0.22);
        const pata = caja(p, 0.9, 0.08, 0.08, lado * 0.45, -0.05, 0, '#2a211d');
        p.rotation.z = lado * -0.5;
        p.rotation.y = lado * (0.5 - i * 0.28);
        pata.userData.lado = lado;
        u.patas.push(p);
      }
    }
    return g;
  },
};

// ----------------------------------------------------------- Física sencilla
function moverEje(mundo, e, eje, d) {
  if (!d) return false;
  if (eje === 0) e.x += d; else if (eje === 1) e.y += d; else e.z += d;
  const r = e.T.rad, h = e.T.alto;
  const x0 = Math.floor(e.x - r + EPS), x1 = Math.floor(e.x + r - EPS);
  const y0 = Math.floor(e.y + EPS), y1 = Math.floor(e.y + h - EPS);
  const z0 = Math.floor(e.z - r + EPS), z1 = Math.floor(e.z + r - EPS);
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    if (!mundo.esSolido(x, y, z)) continue;
    if (eje === 0) { e.x = d > 0 ? x - r - EPS : x + 1 + r + EPS; e.vx = 0; }
    else if (eje === 1) { if (d > 0) e.y = y - h - EPS; else { e.y = y + 1; e.enSuelo = true; } e.vy = 0; }
    else { e.z = d > 0 ? z - r - EPS : z + 1 + r + EPS; e.vz = 0; }
    return true;
  }
  return false;
}

const azar = (a, b) => a + Math.random() * (b - a);

// ----------------------------------------------------------- Flechas
export class Flechas {
  constructor(escena) {
    this.lista = [];
    this.grupo = new THREE.Group();
    escena.add(this.grupo);
    this.mat = new THREE.MeshBasicMaterial({ color: '#d8c8a0' });
  }

  disparar(x, y, z, dx, dy, dz, vel, dueno, dano) {
    const m = new THREE.Mesh(CAJA, this.mat);
    m.scale.set(0.06, 0.06, 0.7);
    this.grupo.add(m);
    this.lista.push({ x, y, z, vx: dx * vel, vy: dy * vel, vz: dz * vel, dueno, dano, malla: m, clavada: 0, edad: 0 });
  }

  limpiar() { for (const f of this.lista) this.grupo.remove(f.malla); this.lista.length = 0; }

  // c: { mundo, jugador, mobs (lista de entidades golpeables), herirJugador(n, dx, dz), herirEntidad(e, n, x, z) }
  actualizar(dt, c) {
    for (let i = this.lista.length - 1; i >= 0; i--) {
      const f = this.lista[i];
      f.edad += dt;
      if (f.clavada > 0) { f.clavada -= dt; if (f.clavada <= 0) { this.grupo.remove(f.malla); this.lista.splice(i, 1); } continue; }
      if (f.edad > 8) { this.grupo.remove(f.malla); this.lista.splice(i, 1); continue; }
      f.vy -= 14 * dt;
      const nx = f.x + f.vx * dt, ny = f.y + f.vy * dt, nz = f.z + f.vz * dt;
      let impacto = false;
      if (c.mundo.esSolido(Math.floor(nx), Math.floor(ny), Math.floor(nz))) {
        if (c.mundo.estaListo(nx, nz)) { f.clavada = 3; impacto = true; Sonido.en(f.x, f.y, f.z, () => Sonido.flechaImpacto()); }
      } else {
        let golpeado = null;
        if (f.dueno === 'mob' && c.jugadorVivo) {
          for (const j of c.objetivos) if (Math.abs(nx - j.x) < 0.45 && Math.abs(nz - j.z) < 0.45 && ny > j.y && ny < j.y + 1.8) { golpeado = j; break; }
        }
        if (golpeado) {
          c.herirJugador(f.dano, f.vx, f.vz, golpeado);
          this.grupo.remove(f.malla); this.lista.splice(i, 1);
          continue;
        }
        if (f.dueno === 'jugador') {
          let tocado = null;
          for (const e of c.mobs) {
            if (e.muriendo) continue;
            const r = e.T.rad + 0.1;
            if (Math.abs(nx - e.x) < r && Math.abs(nz - e.z) < r && ny > e.y - 0.1 && ny < e.y + e.T.alto + 0.1) { tocado = e; break; }
          }
          if (tocado) {
            c.herirEntidad(tocado, f.dano, f.x - f.vx, f.z - f.vz);
            this.grupo.remove(f.malla); this.lista.splice(i, 1);
            continue;
          }
        }
        f.x = nx; f.y = ny; f.z = nz;
      }
      const dir = new THREE.Vector3(f.vx, f.vy, f.vz).normalize();
      f.malla.position.set(f.x, f.y, f.z);
      f.malla.lookAt(f.x + dir.x, f.y + dir.y, f.z + dir.z);
      if (impacto) { f.vx = f.vy = f.vz = 0; }
    }
  }
}

// ----------------------------------------------------------- Los bichos
export class Mobs {
  constructor(escena, mundo) {
    this.escena = escena;
    this.mundo = mundo;
    this.lista = [];
    this.grupo = new THREE.Group();
    escena.add(this.grupo);
    this.flechas = new Flechas(escena);
    this.tiempoNacer = 0;
    this.alMorir = null;      // (e) para soltar el botín
    this.peligro = 0;         // > 0 si hay algún malo cerca (para la música)
    this.aldeanos = new Map(); // id del punto -> entidad
    this.sigId = 1;
    this.espejo = false;      // true en los invitados: solo dibujan lo que manda el anfitrión
  }

  limpiar() {
    for (const e of this.lista) this.grupo.remove(e.malla);
    this.lista.length = 0;
    this.aldeanos.clear();
    this.flechas.limpiar();
    this.tiempoNacer = 0;
  }

  contar(hostil) { let n = 0; for (const e of this.lista) if (e.T.hostil === hostil && !e.muriendo) n++; return n; }

  entidades() { return this.lista; }

  crear(tipo, x, y, z, extra = {}) {
    const T = TIPOS[tipo];
    const malla = CONSTRUCTORES[tipo](extra.oficio);
    malla.traverse((o) => { if (o.isMesh) o.layers.enable(1); });
    malla.position.set(x, y, z);
    this.grupo.add(malla);
    const e = {
      id: this.sigId++, tipo, T, malla, x, y, z, vx: 0, vy: 0, vz: 0, yaw: Math.random() * 6.28, rumbo: 0, vida: T.vida,
      enSuelo: false, estado: 'quieto', tiempo: azar(1, 3), fase: Math.random() * 10, ataque: 1, hurt: 0, muriendo: 0,
      fusible: 0, kb: 0, voz: azar(4, 12), disparo: azar(1, 2.5), ira: false, quema: 0, saltoEspera: 0,
      casa: { x, z }, ...extra,
    };
    e.rumbo = e.yaw;
    this.lista.push(e);
    return e;
  }

  crearAldeano(p) {
    if (this.aldeanos.has(p.id)) return;
    const oficio = LISTA_OFICIOS[Math.floor(hash2(Math.floor(p.x), Math.floor(p.z), 77) * LISTA_OFICIOS.length) % LISTA_OFICIOS.length];
    const e = this.crear('aldeano', p.x, p.y, p.z, { oficio, idPunto: p.id });
    this.aldeanos.set(p.id, e);
  }

  quitar(i) {
    const e = this.lista[i];
    this.grupo.remove(e.malla);
    if (e.idPunto) this.aldeanos.delete(e.idPunto);
    this.lista.splice(i, 1);
  }

  marcar(e, rojo) {
    e.malla.traverse((o) => { if (o.isMesh) o.material = rojo ? MAT_ROJO : o.userData.mat; });
    e.marcado = rojo;
  }

  // Le hace daño a un bicho. Devuelve true si murió.
  herir(e, dano, desdeX, desdeZ, kb = 6) {
    if (e.muriendo) return false;
    e.vida -= dano;
    e.hurt = 0.25;
    e.ira = true;
    this.marcar(e, true);
    const dx = e.x - desdeX, dz = e.z - desdeZ, d = Math.hypot(dx, dz) || 1;
    e.vx = (dx / d) * kb; e.vz = (dz / d) * kb; e.vy = 4.5; e.kb = 0.3; e.enSuelo = false;
    Sonido.en(e.x, e.y, e.z, () => Sonido.golpeCuerpo());
    if (e.vida <= 0) {
      e.muriendo = 0.5;
      if (this.alMorir) this.alMorir(e);
      return true;
    }
    return false;
  }

  // ¿Es de noche o está bajo tierra? Dónde puede aparecer un malo
  intentarNacer(jugador, c) {
    const m = this.mundo;
    const ang = Math.random() * Math.PI * 2, dist = azar(16, 32);
    const x = Math.floor(jugador.x + Math.cos(ang) * dist), z = Math.floor(jugador.z + Math.sin(ang) * dist);
    if (!m.estaListo(x, z)) return;
    const subte = Math.random() < 0.5;
    let y = -1;
    if (!subte) {
      if (c.dia > 0.32) return;
      y = m.alturaSuelo(x, z) + 1;
    } else {
      const base = Math.floor(jugador.y) + Math.floor(azar(-10, 4));
      for (let k = 0; k < 8; k++) {
        const yy = base + k - 4;
        if (yy < 2) continue;
        if (!SOLIDO[m.obtener(x, yy - 1, z)] || SOLIDO[m.obtener(x, yy, z)] || SOLIDO[m.obtener(x, yy + 1, z)]) continue;
        if (m.alturaSuelo(x, z) <= yy + 2) continue;          // tiene que haber techo (oscuro)
        y = yy; break;
      }
    }
    if (y < 2) return;
    if (DIBUJO[m.obtener(x, y, z)] === DIBUJO_AGUA || DIBUJO[m.obtener(x, y - 1, z)] === DIBUJO_AGUA) return;
    if (SOLIDO[m.obtener(x, y, z)] || SOLIDO[m.obtener(x, y + 1, z)] || !SOLIDO[m.obtener(x, y - 1, z)]) return;
    if (Math.hypot(x + 0.5 - jugador.x, z + 0.5 - jugador.z) < 12) return;
    const r = Math.random();
    const tipo = r < 0.4 ? 'zombi' : r < 0.65 ? 'esqueleto' : r < 0.85 ? 'arana' : 'creeper';
    this.crear(tipo, x + 0.5, y, z + 0.5);
  }

  // c: { jugador, dia, activos (hay malos), dificultad, max, jugadorVivo, herirJugador(n, dx, dz, causa), explotar(x,y,z) , luz:[r,g,b] }
  actualizar(dt, c) {
    const m = this.mundo;
    const j = c.jugador;
    this.tiempoNacer -= dt;
    if (this.tiempoNacer <= 0 && !this.espejo) {
      this.tiempoNacer = 1.6;
      const ob = c.objetivos && c.objetivos.length ? c.objetivos : [j];
      if (c.activos && this.contar(true) < c.max) this.intentarNacer(ob[Math.floor(Math.random() * ob.length)], c);
    }
    let peligro = 0;

    const objetivos = c.objetivos && c.objetivos.length ? c.objetivos : [j];
    for (let i = this.lista.length - 1; i >= 0; i--) {
      const e = this.lista[i];
      if (this.espejo) { this.pasoEspejo(e, dt); continue; }
      let j = objetivos[0], mejorD = Infinity;
      for (const o of objetivos) { const d2 = (o.x - e.x) ** 2 + (o.z - e.z) ** 2; if (d2 < mejorD) { mejorD = d2; j = o; } }
      const dx = j.x - e.x, dz = j.z - e.z, dist = Math.hypot(dx, dz);
      // se van si estás lejos (o si ya no hay malos)
      if (dist > 80 || e.y < -10 || (e.T.hostil && !c.activos) || (e.T.hostil && dist > 48 && c.dia > 0.5)) { this.quitar(i); continue; }
      if (e.muriendo) {
        e.muriendo -= dt;
        e.malla.rotation.z = Math.min(1.5, (0.5 - e.muriendo) * 3.2);
        if (e.muriendo <= 0) this.quitar(i);
        continue;
      }
      if (!m.estaListo(e.x, e.z)) continue;
      if (e.hurt > 0) { e.hurt -= dt; if (e.hurt <= 0 && e.marcado) this.marcar(e, false); }
      e.kb = Math.max(0, e.kb - dt);
      e.ataque = Math.max(0, e.ataque - dt);

      const hostilActivo = e.T.hostil && c.activos && c.jugadorVivo;
      if (hostilActivo && dist < 24) peligro = Math.max(peligro, 1 - dist / 24);

      // ---- cerebro
      let quiere = 0;      // velocidad deseada hacia e.rumbo
      let vagando = false;
      const T = e.T;
      switch (e.tipo) {
        case 'zombi': {
          if (hostilActivo && dist < 30) {
            e.rumbo = Math.atan2(dx, dz); quiere = T.vel * (c.dificultad === 'dificil' ? 1.15 : 1);
            if (dist < 1.5 && Math.abs(j.y - e.y) < 1.6 && e.ataque <= 0) {
              e.ataque = 1.0;
              c.herirJugador(T.dano, dx, dz, 'zombi', null, j);
            }
          } else { this.vagar(e, dt); vagando = true; }
          break;
        }
        case 'esqueleto': {
          if (hostilActivo && dist < 28) {
            e.rumbo = Math.atan2(dx, dz);
            if (dist < 5.5) { e.rumbo += Math.PI; quiere = T.vel; }       // se aleja
            else if (dist > 11) quiere = T.vel;                            // se acerca
            else { e.rumbo += Math.PI / 2 * (Math.sin(e.fase * 0.2) > 0 ? 1 : -1); quiere = T.vel * 0.5; }
            e.disparo -= dt;
            if (e.disparo <= 0 && dist < 20) {
              e.disparo = c.dificultad === 'dificil' ? 1.3 : 2.2;
              this.dispararFlecha(e, j, c);
            }
          } else { this.vagar(e, dt); vagando = true; }
          break;
        }
        case 'arana': {
          const agresiva = hostilActivo && (c.dia < 0.5 || e.ira) && dist < 24;
          if (agresiva) {
            e.rumbo = Math.atan2(dx, dz); quiere = T.vel;
            if (dist < 2.6 && e.enSuelo && e.ataque <= 0 && dist > 1.0) {
              e.vy = 6; e.vx = Math.sin(e.rumbo) * 6; e.vz = Math.cos(e.rumbo) * 6; e.kb = 0.35; e.enSuelo = false;
            }
            if (dist < 1.2 && Math.abs(j.y - e.y) < 1.4 && e.ataque <= 0) { e.ataque = 1.0; c.herirJugador(T.dano, dx, dz, 'arana', null, j); }
          } else { this.vagar(e, dt); vagando = true; }
          break;
        }
        case 'creeper': {
          if (hostilActivo && dist < 24) {
            e.rumbo = Math.atan2(dx, dz);
            if (dist < 3.2 || (e.fusible > 0 && dist < 6)) {
              e.fusible += dt; quiere = 0;
              if (e.fusible === dt) Sonido.en(e.x, e.y, e.z, () => Sonido.silbido());
              if (e.fusible >= 1.5) { c.explotar(e.x, e.y + 0.8, e.z, e); this.quitar(i); continue; }
            } else { e.fusible = Math.max(0, e.fusible - dt * 2); quiere = T.vel; }
          } else { e.fusible = 0; this.vagar(e, dt); vagando = true; }
          break;
        }
        default: {   // aldeano
          this.vagarCerca(e, dt); vagando = true;
          if (dist < 7) { const a = Math.atan2(dx, dz); e.cabezaYaw = a; e.estado = 'quieto'; }
          else e.cabezaYaw = null;
          break;
        }
      }
      if (vagando && e.estado === 'camina') quiere = e.tipo === 'aldeano' ? T.vel : T.vel * 0.45;

      // ---- sol: zombis y esqueletos se queman
      if ((e.tipo === 'zombi' || e.tipo === 'esqueleto') && c.dia > 0.55) {
        const techo = m.alturaSuelo(Math.floor(e.x), Math.floor(e.z));
        if (techo < Math.floor(e.y) && !(DIBUJO[m.obtener(Math.floor(e.x), Math.floor(e.y), Math.floor(e.z))] === DIBUJO_AGUA)) {
          e.quema += dt;
          if (e.quema >= 1) { e.quema = 0; this.herir(e, 2, e.x, e.z, 0); }
        }
      }

      // ---- movimiento
      let dy = e.rumbo - e.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      e.yaw += dy * Math.min(1, dt * 8);
      if (e.kb <= 0) {
        const f = 1 - Math.exp(-(e.enSuelo ? 10 : 2.5) * dt);
        e.vx += (Math.sin(e.yaw) * quiere - e.vx) * f;
        e.vz += (Math.cos(e.yaw) * quiere - e.vz) * f;
      }
      const enAgua = DIBUJO[m.obtener(Math.floor(e.x), Math.floor(e.y + 0.3), Math.floor(e.z))] === DIBUJO_AGUA;
      if (enAgua) e.vy += (2.2 - e.vy) * (1 - Math.exp(-4 * dt));
      else e.vy = Math.max(-30, e.vy - GRAV * dt);
      e.enSuelo = false;
      const choco = moverEje(m, e, 0, e.vx * dt) | moverEje(m, e, 2, e.vz * dt);
      moverEje(m, e, 1, e.vy * dt);
      e.saltoEspera -= dt;
      if (choco && e.enSuelo && quiere > 0 && e.saltoEspera <= 0) { e.vy = 7.4; e.saltoEspera = 0.4; }

      // ---- voz
      e.voz -= dt;
      if (e.voz <= 0) {
        e.voz = azar(5, 14);
        if (T.voz && dist < 28 && (e.tipo !== 'arana' || c.dia < 0.5)) Sonido.en(e.x, e.y, e.z, () => Sonido.bicho(T.voz, 1 - dist / 28));
      }

      // ---- pose
      this.pose(e, dt, quiere);
    }
    this.peligro = peligro;

    this.flechas.actualizar(dt, {
      mundo: m, jugador: j, objetivos, jugadorVivo: c.jugadorVivo, mobs: c.golpeables(),
      herirJugador: (n, vx, vz, t) => c.herirJugador(n, vx, vz, 'flecha', null, t),
      herirEntidad: (e, n, x, z) => c.herirEntidad(e, n, x, z, true),
    });
  }

  // ---- multijugador: el anfitrión manda, los invitados solo dibujan
  pasoEspejo(e, dt) {
    const k = Math.min(1, dt * 12);
    const px = e.x, pz = e.z;
    e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; e.z += (e.tz - e.z) * k;
    let d = e.tyaw - e.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); e.yaw += d * k;
    e.vx = (e.x - px) / Math.max(dt, 0.001); e.vz = (e.z - pz) / Math.max(dt, 0.001);
    e.malla.rotation.z = e.caido ? 1.5 : 0;
    this.pose(e, dt, 0);
  }

  exportarSnapshot() {
    const r = [];
    for (const e of this.lista) r.push([e.id, NOMBRES_TIPO.indexOf(e.tipo), +e.x.toFixed(2), +e.y.toFixed(2), +e.z.toFixed(2), +e.yaw.toFixed(2), e.muriendo ? 1 : 0, e.fusible > 0 ? e.fusible : 0, e.oficio ? LISTA_OFICIOS.indexOf(e.oficio) : -1]);
    return r;
  }

  aplicarSnapshot(arr) {
    const vistos = new Set();
    for (const a of arr) {
      const [id, ti, x, y, z, yaw, muerto, fus, of] = a;
      vistos.add(id);
      let e = this.lista.find((q) => q.id === id);
      if (!e) {
        if (!NOMBRES_TIPO[ti]) continue;
        e = this.crear(NOMBRES_TIPO[ti], x, y, z, { id, oficio: of >= 0 ? LISTA_OFICIOS[of] : undefined });
        e.yaw = yaw;
      }
      e.tx = x; e.ty = y; e.tz = z; e.tyaw = yaw; e.caido = !!muerto; e.fusible = fus;
    }
    for (let i = this.lista.length - 1; i >= 0; i--) if (!vistos.has(this.lista[i].id)) this.quitar(i);
  }

  vagar(e, dt) {
    e.tiempo -= dt;
    if (e.tiempo > 0) return;
    if (e.estado === 'quieto' && Math.random() < 0.7) { e.estado = 'camina'; e.rumbo = Math.random() * Math.PI * 2; e.tiempo = azar(1.5, 4); }
    else { e.estado = 'quieto'; e.tiempo = azar(1.5, 5); }
  }

  // Los aldeanos no se alejan de su casa
  vagarCerca(e, dt) {
    e.tiempo -= dt;
    if (e.tiempo > 0) return;
    if (e.estado === 'quieto' && Math.random() < 0.6) {
      e.estado = 'camina';
      const dx = e.casa.x - e.x, dz = e.casa.z - e.z;
      e.rumbo = Math.hypot(dx, dz) > 7 ? Math.atan2(dx, dz) : Math.random() * Math.PI * 2;
      e.tiempo = azar(1, 3);
    } else { e.estado = 'quieto'; e.tiempo = azar(2, 6); }
  }

  dispararFlecha(e, j, c) {
    const ox = e.x, oy = e.y + 1.5, oz = e.z;
    const tx = j.x, ty = j.y + 1.2, tz = j.z;
    const d = Math.hypot(tx - ox, ty - oy, tz - oz);
    // se comprueba que no haya una pared en medio
    const ult = lanzarRayo(this.mundo, ox, oy, oz, (tx - ox) / d, (ty - oy) / d, (tz - oz) / d, d - 0.5);
    if (ult) return;
    const prec = c.dificultad === 'dificil' ? 0.02 : c.dificultad === 'facil' ? 0.12 : 0.07;
    const dirx = (tx - ox) / d + (Math.random() - 0.5) * prec, diry = (ty - oy) / d + 0.05 * (d / 12) + (Math.random() - 0.5) * prec, dirz = (tz - oz) / d + (Math.random() - 0.5) * prec;
    const l = Math.hypot(dirx, diry, dirz);
    this.flechas.disparar(ox, oy, oz, dirx / l, diry / l, dirz / l, 20, 'mob', c.dificultad === 'dificil' ? 4 : 3);
    Sonido.en(ox, oy, oz, () => Sonido.arco());
  }

  pose(e, dt, quiere) {
    const m = e.malla, u = m.userData;
    m.position.set(e.x, e.y, e.z);
    m.rotation.y = e.yaw;
    const v = Math.hypot(e.vx, e.vz);
    e.fase += v * dt * 5.5;
    const sw = Math.sin(e.fase) * Math.min(1, v / 1.6) * 0.8;
    if (u.piernaI) { u.piernaI.rotation.x = sw; u.piernaD.rotation.x = -sw; }
    if (e.tipo === 'zombi') {
      u.brazoI.rotation.x = -1.45 + sw * 0.1; u.brazoD.rotation.x = -1.45 - sw * 0.1;
    } else if (e.tipo === 'aldeano') {
      const mirada = e.cabezaYaw != null ? Math.atan2(Math.sin(e.cabezaYaw - e.yaw), Math.cos(e.cabezaYaw - e.yaw)) : 0;
      u.cabeza.rotation.y += (Math.max(-1, Math.min(1, mirada)) - u.cabeza.rotation.y) * Math.min(1, dt * 6);
    } else if (e.tipo === 'creeper') {
      u.patas.forEach((p, k) => { p.rotation.x = (k % 3 === 0 ? sw : -sw); });
      const hinchado = e.fusible > 0 ? 1 + Math.sin(e.fusible * 22) * 0.06 + e.fusible * 0.18 : 1;
      m.scale.set(hinchado, hinchado, hinchado);
      const blanco = e.fusible > 0 && Math.floor(e.fusible * 10) % 2 === 0;
      if (!e.hurt && blanco !== !!e.blanco) {
        e.blanco = blanco;
        m.traverse((o) => { if (o.isMesh) o.material = blanco ? MAT_BLANCO : o.userData.mat; });
      }
    } else if (e.tipo === 'arana') {
      u.patas.forEach((p, k) => { p.rotation.x = Math.sin(e.fase * 1.6 + k * 1.7) * Math.min(1, v / 2) * 0.35; });
    }
  }
}

// ----------------------------------------------------------- Explosión
// Rompe bloques en una bola de radio r y empuja/daña. c: { mundo, particulas, jugador, herirJugador, mobs, herirEntidad, escala }
export function explosion(x, y, z, r, c) {
  const m = c.mundo;
  const n = Math.ceil(r);
  for (let dx = -n; dx <= n; dx++) for (let dy = -n; dy <= n; dy++) for (let dz = -n; dz <= n; dz++) {
    const d = Math.hypot(dx, dy, dz);
    if (d > r) continue;
    const bx = Math.floor(x) + dx, by = Math.floor(y) + dy, bz = Math.floor(z) + dz;
    const id = m.obtener(bx, by, bz);
    if (id === B.AIRE || esIrrompible(id) || id === B.OBSIDIANA) continue;
    if (Math.random() > 1.15 - d / r * 0.9) continue;
    if (c.protegerBloques) continue;
    if (c.alRomper) c.alRomper(bx, by, bz, id);
    m.poner(bx, by, bz, B.AIRE, true, 'mundo');
  }
  const col = [0.85, 0.82, 0.78];
  for (let i = 0; i < 4; i++) c.particulas.explotar(x - 0.5 + (Math.random() - 0.5) * r, y - 0.5 + (Math.random() - 0.5) * r * 0.6, z - 0.5 + (Math.random() - 0.5) * r, col, 28);
  Sonido.en(x, y, z, () => Sonido.explosion());
  // daño al jugador
  for (const j of c.objetivos) {
    const dj = Math.hypot(j.x - x, j.y + 0.9 - y, j.z - z);
    if (dj < r * 2 && c.jugadorVivo) {
      const k = 1 - dj / (r * 2);
      c.herirJugador(Math.round(k * 22 * (c.escala || 1)), j.x - x, j.z - z, 'creeper', { empuje: k * 12 }, j);
    }
  }
  for (const e of c.mobs) {
    if (e.muriendo) continue;
    const de = Math.hypot(e.x - x, e.y + 0.8 - y, e.z - z);
    if (de < r * 2) c.herirEntidad(e, Math.round((1 - de / (r * 2)) * 22), x, z);
  }
}
