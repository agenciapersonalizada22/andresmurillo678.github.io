// =============================================================
//  🚗  VEHÍCULOS
//  Jeep, bote, avioneta y vagoneta. Cada uno tiene su física de
//  juego (rápida de calcular, no un simulador):
//   - Jeep: acelera, frena, derrapa un poco, sube escalones de 1
//     bloque, se inclina con el terreno y no atraviesa paredes.
//   - Bote: flota sobre el agua, las olas lo mecen y la orilla lo frena.
//   - Avioneta: aceleras en pista, despegas al ir rápido y subir la
//     nariz (mueve el ratón), si vas lento se "pierde" y cae.
//   - Vagoneta: va por rieles, sube y baja a lo largo de ellos.
//  Todo choca con los bloques (se mueve en pasitos para que, aun muy
//  rápido, no atraviese el terreno).
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';
import { B, DIBUJO, DIBUJO_AGUA } from './bloques.js';
import { ALTO } from './medidas.js';
import { crearJeep, crearBote, crearAvioneta, crearVagoneta } from './modelosVeh.js';
import { Sonido } from './sonido.js';

const VC = CONFIG.vehiculos;
const MAR = CONFIG.mundo.nivelMar;
const PI2 = Math.PI * 2;
const lim = (v, a, b) => (v < a ? a : v > b ? b : v);
const aproximar = (v, objetivo, paso) => (v < objetivo ? Math.min(objetivo, v + paso) : Math.max(objetivo, v - paso));
const normalizarAngulo = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export const TIPOS = {
  jeep: {
    nombre: 'Jeep', crear: crearJeep, clase: 'tierra', tanque: 100, consumo: 0.14, asiento: [-0.4, 1.55, -0.1],
    distCam: 7.5, altCam: 2.2, ancho: 1.0, largo: 2.0, base: 2.4, via: 2.0, alto: 2.2, vmax: 25, subir: 1.06,
  },
  bote: {
    nombre: 'Bote', crear: crearBote, clase: 'agua', tanque: 100, consumo: 0.1, asiento: [0.4, 1.15, -0.5],
    distCam: 8, altCam: 2.4, ancho: 0.9, largo: 2.1, vmax: 17,
  },
  avioneta: {
    nombre: 'Avioneta', crear: crearAvioneta, clase: 'aire', tanque: 100, consumo: 0.1, asiento: [-0.3, 1.9, 0.2],
    distCam: 12, altCam: 3.4, ancho: 4.3, largo: 3.4, vmax: 40,
  },
  vagoneta: {
    nombre: 'Vagoneta', crear: crearVagoneta, clase: 'riel', tanque: 100, consumo: 0, asiento: [0, 1.6, 0.1],
    distCam: 5, altCam: 1.8, ancho: 0.5, largo: 0.65, vmax: 12,
  },
};
export const NOMBRES_VEH = Object.keys(TIPOS);

let contadorId = 1;

export class Vehiculos {
  constructor(escena, mundo, uniformes) {
    this.escena = escena;
    this.mundo = mundo;
    this.uniformes = uniformes;
    this.lista = [];
    this.actual = null;          // el que estás manejando
    this.grupo = new THREE.Group();
    escena.add(this.grupo);
    // luces para que el brillo de la carrocería siga al sol
    this.luzHemi = new THREE.HemisphereLight(0xbcd2ff, 0x6a5a48, 0.9);
    this.luzSol = new THREE.DirectionalLight(0xffffff, 1);
    escena.add(this.luzHemi, this.luzSol, this.luzSol.target);
    this.camaraTercera = true;
    this.rel = { yaw: 0, pitch: 0, tiempoMouse: 99 };
    this.camPos = new THREE.Vector3();
    this.camListo = false;
    this.tiempo = 0;
    this.avisos = [];            // textos para mostrar (los lee principal)
    this.tmp = new THREE.Vector3();
    this.particulas = null;      // se conecta desde principal
  }

  // ----------------------------------------------------------- Crear y quitar
  crear(tipo, x, y, z, yaw = 0, combustible = null, id = null) {
    const T = TIPOS[tipo];
    if (!T) return null;
    const modelo = T.crear();
    modelo.grupo.traverse((o) => { if (o.isMesh) o.layers.enable(1); });
    // las luces tienen su propio material (para prender y apagar cada vehículo)
    for (const l of (modelo.partes.luces || []).concat(modelo.partes.frenos || [])) {
      l.malla.material = l.base.clone();
      l.mat = l.malla.material;
      l.e0 = l.mat.emissiveIntensity ?? 1;
    }
    this.grupo.add(modelo.grupo);
    const v = {
      id: id || 'v' + (contadorId++), tipo, T, modelo, partes: modelo.partes,
      x, y, z, yaw, pitch: 0, roll: 0, vx: 0, vz: 0, vy: 0, vel: 0, giro: 0, giroRueda: 0,
      combustible: combustible ?? (VC.combustible ? T.tanque : T.tanque), luces: false, freno: 0,
      acelerador: 0, motor: false, asentado: false, enSuelo: true, rpm: 0, tiempo: Math.random() * 10,
      throttle: 0, stick: { x: 0, y: 0 }, eje: 'x', activo: false, ocupado: false, choque: 0, hundido: false,
    };
    if (T.clase === 'riel') {
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      v.eje = Math.abs(fx) > Math.abs(fz) ? 'x' : 'z';
      v.sentido = Math.sign(v.eje === 'x' ? fx : fz) || 1;
    }
    this.lista.push(v);
    this.actualizarModelo(v);
    return v;
  }

  quitar(v) {
    if (this.actual === v) this.bajar(true);
    this.grupo.remove(v.modelo.grupo);
    v.modelo.grupo.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    const i = this.lista.indexOf(v);
    if (i >= 0) this.lista.splice(i, 1);
  }

  limpiar() {
    if (this.actual) this.bajar(true);
    for (const v of this.lista.slice()) this.quitar(v);
  }

  exportar() {
    return this.lista.map((v) => ({ t: v.tipo, x: +v.x.toFixed(2), y: +v.y.toFixed(2), z: +v.z.toFixed(2), yaw: +v.yaw.toFixed(3), c: +v.combustible.toFixed(1), id: v.id }));
  }

  importar(datos) {
    this.limpiar();
    if (!Array.isArray(datos)) return;
    for (const d of datos) {
      if (!d || !TIPOS[d.t] || ![d.x, d.y, d.z, d.yaw].every(Number.isFinite)) continue;
      this.crear(d.t, d.x, d.y, d.z, d.yaw, Number.isFinite(d.c) ? d.c : null, typeof d.id === 'string' ? d.id : null);
    }
  }

  // El vehículo más cercano al jugador (para subirse con E)
  cercano(x, y, z, radio = 4.2) {
    let mejor = null, md = radio * radio;
    for (const v of this.lista) {
      if (v === this.actual) continue;
      const dx = v.x - x, dy = (v.y + 0.8) - y, dz = v.z - z;
      const d = dx * dx + dz * dz + dy * dy * 0.4;
      if (d < md) { md = d; mejor = v; }
    }
    return mejor;
  }

  // ----------------------------------------------------------- Mundo: suelo y agua
  suelo(x, z, yTope) {
    const ix = Math.floor(x), iz = Math.floor(z);
    for (let y = Math.min(ALTO - 1, Math.floor(yTope)); y >= 0; y--) if (this.mundo.esSolido(ix, y, iz)) return y + 1;
    return 0;
  }

  // altura del agua en (x, z) cerca de yRef; -1 si no hay agua
  superficieAgua(x, z, yRef) {
    const ix = Math.floor(x), iz = Math.floor(z);
    for (let y = Math.min(ALTO - 1, Math.floor(yRef + 3)); y >= Math.max(0, Math.floor(yRef - 8)); y--) {
      const b = this.mundo.obtener(ix, y, iz);
      if (DIBUJO[b] === DIBUJO_AGUA) {
        const arriba = this.mundo.obtener(ix, y + 1, iz);
        return DIBUJO[arriba] === DIBUJO_AGUA ? y + 1 : y + 0.875;
      }
      if (this.mundo.esSolido(ix, y, iz)) return -1;
    }
    return -1;
  }

  puntosCasco(v, T) {
    const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
    const f = [-s, -c], r = [c, -s];
    const l = T.largo, a = T.ancho;
    return [[l, 0], [-l, 0], [0, a], [0, -a], [l * 0.8, a * 0.9], [l * 0.8, -a * 0.9], [-l * 0.8, a * 0.9], [-l * 0.8, -a * 0.9]]
      .map(([pf, pr]) => [v.x + f[0] * pf + r[0] * pr, v.z + f[1] * pf + r[1] * pr]);
  }

  // ¿Se puede estar en (x, z) con el cuerpo a la altura y? (jeep)
  libreTierra(v, T, nx, nz, y) {
    const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
    const f = [-s, -c], r = [c, -s];
    const l = T.largo, a = T.ancho;
    const puntos = [[l, a], [l, -a], [-l, a], [-l, -a], [l, 0], [-l, 0], [0, a], [0, -a], [0, 0]];
    for (const [pf, pr] of puntos) {
      const px = nx + f[0] * pf + r[0] * pr, pz = nz + f[1] * pf + r[1] * pr;
      const h = this.suelo(px, pz, y + 1.15);
      if (h - y > T.subir) return false;
      const ix = Math.floor(px), iz = Math.floor(pz);
      for (const dy of [1.2, 1.7, T.alto - 0.1]) if (this.mundo.esSolido(ix, Math.floor(y + dy), iz)) return false;
    }
    return true;
  }

  // ----------------------------------------------------------- Física por tipo
  // entrada: { adelante, derecha, saltar, correr } del jugador
  pasoTierra(v, T, dt, ent, manejando) {
    const mundo = this.mundo;
    const tiene = v.combustible > 0 || !VC.combustible;
    const acel = manejando && tiene ? ent.adelante : 0;
    const frenoMano = manejando && ent.saltar;
    const turbo = manejando && ent.correr && tiene;
    const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
    let vf = v.vx * -s + v.vz * -c;
    let vl = v.vx * c + v.vz * -s;
    const vmax = (turbo ? T.vmax * 1.3 : T.vmax) * (v.enAgua ? 0.45 : 1);
    if (acel > 0) {
      if (vf >= -0.5) vf += (vf < vmax ? 15 * (1 - lim(vf / (vmax + 4), 0, 1)) : -8) * acel * dt * (turbo ? 1.4 : 1);
      else vf += 34 * acel * dt;                       // frenando mientras iba en reversa
    } else if (acel < 0) {
      if (vf > 0.5) vf -= 34 * -acel * dt;             // frenando
      else vf = Math.max(vf - 9 * -acel * dt, -9);     // reversa
    }
    v.acelerador = acel;
    v.freno = (acel < 0 && vf > 0.5) || frenoMano ? 1 : 0;
    if (acel === 0 || !tiene) vf = aproximar(vf, 0, (2.2 + Math.abs(vf) * 0.35) * dt);
    if (frenoMano) vf = aproximar(vf, 0, 18 * dt);
    if (v.enAgua) vf *= Math.exp(-0.9 * dt);
    const grip = frenoMano ? 1.8 : 9;
    vl *= Math.exp(-grip * dt);
    // dirección (modelo de bicicleta): se cierra más a mayor velocidad
    const maxGiro = 0.62 / (1 + Math.abs(vf) * 0.075);
    const objetivoGiro = (manejando ? ent.derecha : 0) * maxGiro;
    v.giro += (objetivoGiro - v.giro) * Math.min(1, 7 * dt);
    const tasa = (vf / T.base) * Math.tan(v.giro) * (frenoMano ? 1.7 : 1);
    v.yaw -= tasa * dt;
    const s2 = Math.sin(v.yaw), c2 = Math.cos(v.yaw);
    v.vx = -s2 * vf + c2 * vl;
    v.vz = -c2 * vf - s2 * vl;
    v.vel = vf;
    v.slip = Math.abs(vl);
    if (VC.combustible && manejando && v.combustible > 0) v.combustible = Math.max(0, v.combustible - (T.consumo * (0.35 + Math.abs(acel) * 0.9 + (turbo ? 0.8 : 0))) * dt);

    // mover por ejes
    const nx = v.x + v.vx * dt;
    if (this.libreTierra(v, T, nx, v.z, v.y)) v.x = nx;
    else { v.choque = Math.max(v.choque, Math.abs(v.vx)); v.vx *= -0.25; }
    const nz = v.z + v.vz * dt;
    if (this.libreTierra(v, T, v.x, nz, v.y)) v.z = nz;
    else { v.choque = Math.max(v.choque, Math.abs(v.vz)); v.vz *= -0.25; }
    // si quedó metido en algo (por un giro), se saca para atrás
    if (!this.libreTierra(v, T, v.x, v.z, v.y)) { v.x -= v.vx * dt * 1.5; v.z -= v.vz * dt * 1.5; v.vx *= 0.5; v.vz *= 0.5; }

    // alturas de las 4 ruedas
    const hs = this.alturasRuedas(v, T);
    const yObj = (hs.fl + hs.fr + hs.rl + hs.rr) / 4;
    const antesY = v.y;
    if (yObj >= v.y - 0.001) {
      v.y += (yObj - v.y) * Math.min(1, 16 * dt);
      if (v.vy < 0) { v.choque = Math.max(v.choque, -v.vy * 0.5); v.vy = 0; }
      v.enSuelo = true;
    } else {
      v.vy -= 30 * dt;
      v.y += v.vy * dt;
      if (v.y <= yObj) { v.y = yObj; if (v.vy < -5) Sonido.aterrizaje('piedra'); v.vy = 0; v.enSuelo = true; } else v.enSuelo = false;
    }
    const pitchObj = Math.atan2((hs.fl + hs.fr) / 2 - (hs.rl + hs.rr) / 2, T.base);
    const rollObj = Math.atan2((hs.fr + hs.rr) / 2 - (hs.fl + hs.rl) / 2, T.via);
    const acelLong = (vf - (v.vfAnterior ?? vf)) / Math.max(dt, 1e-3);
    v.vfAnterior = vf;
    const squat = lim(-acelLong * 0.0045, -0.07, 0.07);
    const lean = lim(-vl * 0.02 - v.giro * vf * 0.012, -0.12, 0.12);
    v.pitch += ((pitchObj + squat) - v.pitch) * Math.min(1, 8 * dt);
    v.roll += ((rollObj + lean) - v.roll) * Math.min(1, 8 * dt);
    v.giroRueda -= (vf * dt) / (v.partes.radioRueda || 0.46);
    v.enAgua = DIBUJO[mundo.obtener(Math.floor(v.x), Math.floor(v.y + 0.3), Math.floor(v.z))] === DIBUJO_AGUA;
    v.rpm = lim(Math.abs(vf) / vmax, 0, 1.2);
    v.motor = tiene && manejando;
    return antesY;
  }

  alturasRuedas(v, T) {
    const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
    const f = [-s, -c], r = [c, -s];
    const h = (pf, pr) => Math.max(this.suelo(v.x + f[0] * pf + r[0] * pr, v.z + f[1] * pf + r[1] * pr, v.y + 1.15), v.y - 3);
    const a = T.base / 2, b = T.via / 2;
    return { fl: h(a, -b), fr: h(a, b), rl: h(-a, -b), rr: h(-a, b) };
  }

  pasoAgua(v, T, dt, ent, manejando) {
    const tiene = v.combustible > 0 || !VC.combustible;
    const acel = manejando && tiene ? ent.adelante : 0;
    const turbo = manejando && ent.correr && tiene;
    const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
    let vf = v.vx * -s + v.vz * -c;
    let vl = v.vx * c + v.vz * -s;
    const vmax = turbo ? T.vmax * 1.25 : T.vmax;
    if (acel > 0) {
      if (vf >= -0.5) vf += 8 * acel * (1 - lim(vf / (vmax + 3), 0, 1)) * dt * (turbo ? 1.5 : 1);
      else vf += 9 * acel * dt;
    } else if (acel < 0) {
      if (vf > 0.5) vf -= 9 * -acel * dt;
      else vf = Math.max(vf - 4 * -acel * dt, -5);
    }
    v.acelerador = acel;
    if (acel === 0 || !tiene) vf = aproximar(vf, 0, (0.9 + Math.abs(vf) * 0.28) * dt);
    vf = aproximar(vf, 0, Math.abs(vf) * 0.08 * dt);
    vl *= Math.exp(-1.6 * dt);
    const giroObj = (manejando ? ent.derecha : 0) * 1.25 * lim(Math.abs(vf) / 3 + 0.25, 0, 1) * (vf < -0.5 ? -1 : 1);
    v.giro += (giroObj - v.giro) * Math.min(1, 4 * dt);
    v.yaw -= v.giro * dt;
    const s2 = Math.sin(v.yaw), c2 = Math.cos(v.yaw);
    v.vx = -s2 * vf + c2 * vl;
    v.vz = -c2 * vf - s2 * vl;
    v.vel = vf;
    v.slip = Math.abs(vl);
    if (VC.combustible && manejando && v.combustible > 0) v.combustible = Math.max(0, v.combustible - T.consumo * (0.35 + Math.abs(acel) * 0.9 + (turbo ? 0.8 : 0)) * dt);

    const libre = (nx, nz) => {
      const s3 = Math.sin(v.yaw), c3 = Math.cos(v.yaw);
      const f = [-s3, -c3], r = [c3, -s3];
      for (const [pf, pr] of [[T.largo, 0], [-T.largo, 0], [0, T.ancho], [0, -T.ancho], [T.largo * 0.7, T.ancho * 0.8], [T.largo * 0.7, -T.ancho * 0.8]]) {
        const px = nx + f[0] * pf + r[0] * pr, pz = nz + f[1] * pf + r[1] * pr;
        const sup = this.superficieAgua(px, pz, v.y);
        if (sup < 0) return false;
        const ix = Math.floor(px), iz = Math.floor(pz);
        for (const dy of [0.2, 0.9]) if (this.mundo.esSolido(ix, Math.floor(sup - 0.4 + dy), iz)) return false;
      }
      return true;
    };
    const nx = v.x + v.vx * dt;
    if (libre(nx, v.z)) v.x = nx; else { v.choque = Math.max(v.choque, Math.abs(v.vx)); v.vx *= -0.2; vf *= 0.6; }
    const nz = v.z + v.vz * dt;
    if (libre(v.x, nz)) v.z = nz; else { v.choque = Math.max(v.choque, Math.abs(v.vz)); v.vz *= -0.2; vf *= 0.6; }

    let sup = this.superficieAgua(v.x, v.z, v.y);
    v.enAgua = sup >= 0;
    const olas = Math.sin(v.tiempo * 1.7 + v.x * 0.5) * 0.04 + Math.sin(v.tiempo * 2.6 + v.z * 0.7) * 0.025;
    if (sup < 0) {
      // varado: cae al suelo y se frena
      const h = this.suelo(v.x, v.z, v.y + 1);
      v.vx *= Math.exp(-3 * dt); v.vz *= Math.exp(-3 * dt);
      v.vy -= 30 * dt; v.y = Math.max(h, v.y + v.vy * dt); if (v.y <= h) v.vy = 0;
    } else {
      const yObj = sup - 0.3 + olas;
      v.vy += ((yObj - v.y) * 40 - v.vy * 6) * dt;
      v.y += v.vy * dt;
    }
    const lean = lim(-v.giro * vf * 0.03, -0.18, 0.18);
    const pitchObj = lim(vf * 0.011, 0, 0.13) + Math.sin(v.tiempo * 1.9 + v.z * 0.4) * 0.012;
    v.pitch += (pitchObj - v.pitch) * Math.min(1, 4 * dt);
    v.roll += ((lean + Math.sin(v.tiempo * 1.3 + v.x * 0.5) * 0.02) - v.roll) * Math.min(1, 4 * dt);
    v.giroRueda -= vf * dt * 3;
    v.rpm = lim(Math.abs(vf) / vmax, 0, 1.2);
    v.motor = tiene && manejando;
    // estela
    if (this.particulas && Math.abs(vf) > 2 && v.enAgua) {
      v.estela = (v.estela || 0) - dt;
      if (v.estela <= 0) {
        v.estela = 0.05;
        const sx = Math.sin(v.yaw), cx = Math.cos(v.yaw);
        this.particulas.espuma(v.x + sx * 2.0, v.y + 0.3, v.z + cx * 2.0, v.vx * 0.3, v.vz * 0.3, Math.min(1, Math.abs(vf) / 10));
      }
    }
  }

  pasoAire(v, T, dt, ent, manejando) {
    const tiene = v.combustible > 0 || !VC.combustible;
    const mundo = this.mundo;
    // la palanca (ratón o botones) se suelta sola
    v.stick.x = lim(v.stick.x * Math.exp(-1.6 * dt), -1, 1);
    v.stick.y = lim(v.stick.y * Math.exp(-1.6 * dt), -1, 1);
    const entrX = manejando ? ent.derecha * 0.7 : 0;
    // palanca de gases
    if (manejando) {
      if (ent.adelante > 0) v.throttle = Math.min(1, v.throttle + 0.5 * ent.adelante * dt);
      else if (ent.adelante < 0) v.throttle = Math.max(0, v.throttle + 0.7 * ent.adelante * dt);
      if (ent.saltar) v.throttle = Math.min(1, v.throttle + 0.5 * dt);
    }
    if (!tiene) v.throttle = 0;
    const potencia = v.throttle * (ent.correr && manejando && tiene ? 1.25 : 1);
    const meta = potencia * T.vmax;
    const sinP = Math.sin(v.pitch);
    // velocidad: el motor empuja, el aire frena, bajar la nariz acelera y subirla frena
    const cargaEnSuelo = v.enSuelo ? 0.8 : 0;
    v.vel += ((meta - v.vel) * (v.enSuelo ? 0.5 : 0.38) - sinP * 14 - cargaEnSuelo * Math.max(0, v.vel) * 0.12) * dt;
    if (v.vel < 0) v.vel = 0;
    if (!tiene && !v.enSuelo) v.vel = Math.max(10, v.vel - 1.2 * dt);
    const VR = 13; // velocidad para despegar
    const yawRate = (manejando ? (-(v.stick.x + entrX)) : 0) * (v.enSuelo ? 0.5 : 1.25) * lim(v.vel / 12, 0, 1);
    v.yaw += yawRate * dt;
    // nariz: la palanca (ratón) arriba/abajo
    let pitchObj = -(manejando ? v.stick.y : 0) * 1.0;
    if (v.enSuelo) {
      pitchObj = v.vel > VR ? Math.max(0, pitchObj) * 0.7 + 0.02 : 0;
    }
    if (v.vel < 11 && !v.enSuelo) pitchObj = Math.min(pitchObj, -0.15 - (11 - v.vel) * 0.1);  // entra en pérdida: baja la nariz
    pitchObj = lim(pitchObj, -1.0, 0.85);
    v.pitch += lim(pitchObj - v.pitch, -1.3 * dt, 1.3 * dt);
    const rollObj = lim(-yawRate * 0.9 + (manejando ? -(v.stick.x + entrX) * 0.25 : 0), -0.8, 0.8);
    v.roll += (rollObj - v.roll) * Math.min(1, 4 * dt);
    if (v.enSuelo) v.roll *= Math.exp(-6 * dt);
    const sp = Math.sin(v.yaw), cp = Math.cos(v.yaw);
    const cosP = Math.cos(v.pitch);
    v.vx = -sp * cosP * v.vel;
    v.vz = -cp * cosP * v.vel;
    let vy = Math.sin(v.pitch) * v.vel;
    if (v.vel < 12 && !v.enSuelo) vy -= (12 - v.vel) * 1.1;
    v.vy = vy;
    if (VC.combustible && manejando && v.combustible > 0) v.combustible = Math.max(0, v.combustible - T.consumo * (0.25 + v.throttle * 1.1) * dt);

    // mover con choques (alas y nariz)
    const antes = [v.x, v.y, v.z];
    v.x += v.vx * dt; v.y += v.vy * dt; v.z += v.vz * dt;
    const cuerpo = this.puntosAvion(v);
    let choco = false;
    for (const [px, py, pz] of cuerpo) if (mundo.esSolido(Math.floor(px), Math.floor(py), Math.floor(pz))) { choco = true; break; }
    // las ruedas tocan el piso
    const hr = Math.max(this.suelo(v.x, v.z, v.y + 1.4), 0);
    const tren = hr;
    if (hr > antes[1] + 1.1) choco = true;   // un cerro o pared de frente: es choque, no se sube
    if (choco) {
      // se regresa al punto anterior; si ibas muy rápido, el golpe frena en seco
      const fuerza = v.vel;
      v.x = antes[0]; v.y = antes[1]; v.z = antes[2];
      v.choque = Math.max(v.choque, fuerza);
      v.vel *= 0.2;
      v.vy = 0;
      if (fuerza > 14 && this.particulas) this.particulas.humo(v.x, v.y + 1.2, v.z, 10, 0.5);
    }
    if (v.y <= tren + 0.001) {
      if (!v.enSuelo && this.particulas) this.particulas.polvo(v.x, tren + 0.2, v.z, 6);
      const impacto = -vy;
      if (impacto > 11 || v.pitch < -0.5) { v.choque = Math.max(v.choque, impacto * 2); v.vel *= 0.4; if (this.particulas) this.particulas.humo(v.x, tren + 1, v.z, 12, 0.7); }
      v.y = tren;
      v.enSuelo = true;
      if (v.pitch < 0) v.pitch = aproximar(v.pitch, 0, 1.5 * dt);
    } else if (v.y > tren + 0.35) {
      v.enSuelo = false;
    }
    if (v.y > ALTO - 6) { v.y = ALTO - 6; v.vy = Math.min(0, v.vy); }
    v.giroRueda -= v.enSuelo ? (v.vel * dt) / 0.3 : v.vel * dt * 0.2;
    v.rpm = lim(0.25 + v.throttle * 0.75, 0, 1);
    v.motor = tiene;
    v.helice = (v.helice || 0) + dt * (12 + v.throttle * 70);
  }

  puntosAvion(v) {
    const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
    const f = [-s, -c], r = [c, -s];
    const cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
    // [adelante, derecha, arriba] respecto al origen del modelo: nariz, cola, puntas de las alas, techo
    const L = [[3.3, 0, 1.25], [-3.9, 0, 1.4], [0, 4.3, 1.0], [0, -4.3, 1.0], [0, 0, 2.2], [-1.5, 3, 1.0], [-1.5, -3, 1.0]];
    return L.map(([a, rr, u]) => {
      const h = a * cp - u * sp, y = a * sp + u * cp;
      return [v.x + f[0] * h + r[0] * rr, v.y + y, v.z + f[1] * h + r[1] * rr];
    });
  }

  pasoRiel(v, T, dt, ent, manejando) {
    const mundo = this.mundo;
    const acel = manejando ? ent.adelante : 0;
    const turbo = manejando && ent.correr;
    const vmax = turbo ? T.vmax * 1.3 : T.vmax;
    if (acel !== 0) v.vel += acel * (acel * v.vel < 0 ? 12 : 6) * dt;
    else v.vel = aproximar(v.vel, 0, 1.6 * dt);
    v.vel = lim(v.vel, -vmax, vmax);
    v.acelerador = acel;
    const esRiel = (x, y, z) => { const b = mundo.obtener(Math.floor(x), Math.floor(y), Math.floor(z)); return b === B.RIEL_X || b === B.RIEL_Z; };
    const yRiel = Math.floor(v.y + 0.05);
    const pasos = Math.max(1, Math.ceil(Math.abs(v.vel) * dt / 0.3));
    for (let i = 0; i < pasos; i++) {
      const fx = v.eje === 'x' ? v.sentido : 0, fz = v.eje === 'z' ? v.sentido : 0;
      const d = (v.vel * dt) / pasos;
      const sg = Math.sign(d);
      const nx = v.x + fx * d, nz = v.z + fz * d;
      if (sg !== 0 && !esRiel(nx + fx * sg * 0.45, yRiel, nz + fz * sg * 0.45)) { v.choque = Math.max(v.choque, Math.abs(v.vel)); v.vel *= -0.15; break; }
      v.x = nx; v.z = nz;
      // en un cruce se puede girar con A / D
      if (manejando && ent.derecha !== 0 && v.vel > 0.5) {
        const cx = Math.floor(v.x) + 0.5, cz = Math.floor(v.z) + 0.5;
        const cerca = v.eje === 'x' ? Math.abs(v.x - cx) : Math.abs(v.z - cz);
        if (cerca < Math.abs(d) + 0.04) {
          const lado = ent.derecha > 0 ? 1 : -1;
          const nfx = -fz * lado, nfz = fx * lado;
          if (esRiel(Math.floor(v.x) + nfx, yRiel, Math.floor(v.z) + nfz)) {
            v.eje = nfx !== 0 ? 'x' : 'z';
            v.sentido = nfx !== 0 ? nfx : nfz;
            v.x = cx; v.z = cz;
            break;
          }
        }
      }
    }
    const fx = v.eje === 'x' ? v.sentido : 0, fz = v.eje === 'z' ? v.sentido : 0;
    const yawObj = Math.atan2(-fx, -fz);
    v.yaw += normalizarAngulo(yawObj - v.yaw) * Math.min(1, 10 * dt);
    const h = this.suelo(v.x, v.z, v.y + 0.6);
    v.y += (h - v.y) * Math.min(1, 20 * dt);
    v.giroRueda -= v.vel * dt / 0.2;
    v.rpm = Math.min(1, Math.abs(v.vel) / vmax);
    v.motor = false;
    v.pitch += (0 - v.pitch) * Math.min(1, 6 * dt);
    v.roll += (Math.sin(v.tiempo * 17) * 0.004 * Math.min(1, Math.abs(v.vel) / 4) - v.roll) * Math.min(1, 8 * dt);
    v.slip = 0;
    v.vx = fx * v.vel * 1; v.vz = fz * v.vel;
  }

  // Un vehículo parado se asienta en el suelo cuando ya existe el terreno
  asentar(v, dt) {
    const T = v.T;
    if (!this.mundo.estaListo(v.x, v.z)) return;
    if (T.clase === 'tierra') {
      const hs = this.alturasRuedas(v, T);
      const yObj = (hs.fl + hs.fr + hs.rl + hs.rr) / 4;
      if (v.y > yObj + 0.02) { v.vy -= 30 * dt; v.y = Math.max(yObj, v.y + v.vy * dt); } else { v.y = yObj; v.vy = 0; v.asentado = true; }
      v.pitch += (Math.atan2((hs.fl + hs.fr) / 2 - (hs.rl + hs.rr) / 2, T.base) - v.pitch) * Math.min(1, 8 * dt);
      v.roll += (Math.atan2((hs.fr + hs.rr) / 2 - (hs.fl + hs.rl) / 2, T.via) - v.roll) * Math.min(1, 8 * dt);
    } else if (T.clase === 'agua') {
      const sup = this.superficieAgua(v.x, v.z, v.y);
      v.enAgua = sup >= 0;
      v.tiempo += dt;
      if (sup >= 0) {
        const olas = Math.sin(v.tiempo * 1.7 + v.x * 0.5) * 0.04;
        v.y += ((sup - 0.3 + olas) - v.y) * Math.min(1, 6 * dt);
        v.roll = Math.sin(v.tiempo * 1.3 + v.x * 0.5) * 0.02;
        v.pitch = Math.sin(v.tiempo * 1.9 + v.z * 0.4) * 0.012;
      } else {
        const h = this.suelo(v.x, v.z, v.y + 1);
        v.y = Math.max(h, v.y - 12 * dt);
        v.asentado = v.y <= h + 0.01;
      }
    } else if (T.clase === 'aire') {
      const h = this.suelo(v.x, v.z, v.y + 1.4);
      v.y = Math.max(h, v.y - 12 * dt);
      v.asentado = v.y <= h + 0.01;
      v.enSuelo = true;
    } else {
      const h = this.suelo(v.x, v.z, v.y + 0.6);
      v.y = h; v.asentado = true;
    }
  }

  // ----------------------------------------------------------- Subir y bajar
  subir(v, jugador) {
    if (this.actual || !v) return false;
    this.actual = v;
    v.ocupado = true;
    v.activo = true;
    this.rel.yaw = 0; this.rel.pitch = 0.0; this.rel.tiempoMouse = 99;
    this.camListo = false;
    jugador.volando = false;
    jugador.vx = jugador.vy = jugador.vz = 0;
    Sonido.motorIniciar(v.T.clase);
    Sonido.puerta();
    return true;
  }

  // Devuelve true si el jugador pudo bajar (en el aire no se puede)
  bajar(forzar = false, jugador = null) {
    const v = this.actual;
    if (!v) return false;
    if (!forzar && v.T.clase === 'aire') {
      const h = this.suelo(v.x, v.z, v.y + 1.4);
      if (v.y - h > 2.5 || v.vel > 4) { this.avisos.push('Aterriza y detente para bajar'); return false; }
    }
    if (!forzar && v.T.clase === 'riel') { /* siempre se puede */ }
    if (jugador) this.colocarJugador(v, jugador);
    v.ocupado = false;
    v.activo = false;
    v.acelerador = 0;
    v.motor = false;
    v.asentado = false;
    this.actual = null;
    Sonido.motorParar();
    Sonido.puerta();
    return true;
  }

  // Busca un lugar libre a los lados del vehículo
  colocarJugador(v, jugador) {
    const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
    const r = [c, -s], f = [-s, -c];
    const T = v.T;
    const lado = T.ancho + 1.1;
    const intentos = [[r, lado], [r, -lado], [f, -(T.largo + 1.2)], [f, T.largo + 1.2], [r, lado + 1.4], [r, -lado - 1.4]];
    for (const [d, k] of intentos) {
      const x = v.x + (d === r ? r[0] * k : f[0] * k), z = v.z + (d === r ? r[1] * k : f[1] * k);
      const h = this.suelo(x, z, v.y + 3);
      const ix = Math.floor(x), iz = Math.floor(z);
      if (h > v.y + 1.6 || h < v.y - 6) continue;
      if (this.mundo.esSolido(ix, Math.floor(h), iz) || this.mundo.esSolido(ix, Math.floor(h) + 1, iz)) continue;
      if (T.clase === 'agua' && this.superficieAgua(x, z, v.y) >= 0 && h < MAR - 1) continue;
      jugador.ponerEn(x, Math.max(h, 0.01), z);
      jugador.yaw = v.yaw;
      return;
    }
    jugador.ponerEn(v.x, v.y + 2.5, v.z);
    jugador.yaw = v.yaw;
  }

  alternarCamara() {
    this.camaraTercera = !this.camaraTercera;
    this.camListo = false;
  }

  repostar(mochila) {
    const v = this.actual || null;
    if (!v) return false;
    if (v.combustible >= v.T.tanque - 1) { this.avisos.push('El tanque está lleno'); return false; }
    if (!mochila.quitar('bidon', 1)) { this.avisos.push('No tienes bidones de combustible (búscalos en cofres)'); return false; }
    v.combustible = Math.min(v.T.tanque, v.combustible + 55);
    this.avisos.push('Combustible +55');
    Sonido.clic();
    return true;
  }

  alternarLuces() {
    if (!this.actual) return;
    this.actual.luces = !this.actual.luces;
    Sonido.clic();
  }

  // Ratón o dedo: mueve la cámara (jeep, bote, vagoneta) o la palanca (avioneta)
  mirar(dx, dy) {
    const v = this.actual;
    if (!v) return;
    if (v.T.clase === 'aire') {
      v.stick.x = lim(v.stick.x + dx * 0.9, -1.4, 1.4);
      v.stick.y = lim(v.stick.y + dy * 0.9, -1.4, 1.4);
    } else {
      this.rel.yaw -= dx;
      this.rel.pitch = lim(this.rel.pitch - dy, -0.9, 0.9);
      this.rel.tiempoMouse = 0;
    }
  }

  // ----------------------------------------------------------- Cada cuadro
  actualizar(dt, ent, jugador, camara, esperando) {
    this.tiempo += dt;
    this.pausado = !!esperando;
    // luz de los modelos igual que el día
    const cielo = this.cielo;
    if (cielo) {
      this.luzHemi.color.copy(cielo.ambCielo).multiplyScalar(1.5);
      this.luzHemi.groundColor.copy(cielo.ambSuelo).multiplyScalar(1.5);
      this.luzHemi.intensity = 0.85;
      this.luzSol.color.copy(cielo.luzColor);
      this.luzSol.intensity = 1.9;
      this.luzSol.position.copy(cielo.luzDir).multiplyScalar(50).add(camara.position);
      this.luzSol.target.position.copy(camara.position);
      this.luzSol.target.updateMatrixWorld();
    }
    const noche = cielo ? 1 - cielo.factorDia : 0;
    let vistos = 0;
    for (const v of this.lista) {
      const manejando = v === this.actual;
      v.tiempo += dt;
      const cerca = (v.x - camara.position.x) ** 2 + (v.z - camara.position.z) ** 2 < (this.radioVista || 120) ** 2;
      const listo = this.mundo.estaListo(v.x, v.z);
      v.modelo.grupo.visible = cerca && listo;
      if (!listo) continue;
      if (manejando && !esperando) {
        const T = v.T;
        const pasos = Math.max(1, Math.ceil(Math.min(dt, 0.1) * (Math.abs(v.vel) + 4) / 0.4));
        const sdt = Math.min(dt, 0.1) / pasos;
        v.choque = 0;
        for (let i = 0; i < pasos; i++) {
          if (T.clase === 'tierra') this.pasoTierra(v, T, sdt, ent, true);
          else if (T.clase === 'agua') this.pasoAgua(v, T, sdt, ent, true);
          else if (T.clase === 'aire') this.pasoAire(v, T, sdt, ent, true);
          else this.pasoRiel(v, T, sdt, ent, true);
        }
        if (v.choque > 7) Sonido.golpeVehiculo(Math.min(1, v.choque / 25));
        // luces automáticas de noche
        if (!v.lucesManual) v.luces = noche > 0.55;
      } else if (!v.asentado) {
        this.asentar(v, dt);
      } else if (v.T.clase === 'agua' && cerca) {
        this.asentar(v, dt); // los botes siguen meciéndose
        v.asentado = true;
      }
      if (cerca) { this.actualizarModelo(v); vistos++; if (manejando && !esperando) this.efectos(v, dt); }
    }
    this.luces();
    this.sonido();
    if (this.actual) this.camaraVehiculo(dt, camara, jugador);
  }

  // Polvo de las llantas y humo del escape
  efectos(v, dt) {
    const amb = this.particulas;
    if (!amb) return;
    v.fxT = (v.fxT || 0) - dt;
    if (v.fxT > 0) return;
    v.fxT = 0.07;
    const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
    const clase = v.T.clase;
    if ((clase === 'tierra' || clase === 'aire') && v.enSuelo && Math.abs(v.vel) > 4) {
      const b = this.mundo.obtener(Math.floor(v.x), Math.floor(v.y - 0.1), Math.floor(v.z));
      if (b !== B.AIRE && DIBUJO[b] !== DIBUJO_AGUA && !v.enAgua) amb.polvo(v.x + s * (clase === 'aire' ? 0.3 : 1.4), v.y + 0.1, v.z + c * (clase === 'aire' ? 0.3 : 1.4), 1, v.vx, v.vz);
    }
    if (clase === 'tierra' && v.motor && Math.random() < 0.5) {
      amb.humo(v.x + s * 2.1 - c * 0.6, v.y + 0.5, v.z + c * 2.1 + s * 0.6, 1, 0.25 + Math.abs(v.acelerador) * 0.3);
    }
    if (clase === 'aire' && v.motor && v.throttle > 0.3 && Math.random() < 0.25) {
      amb.humo(v.x - s * 3.2, v.y + 1.2, v.z - c * 3.2, 1, 0.2);
    }
  }

  actualizarModelo(v) {
    const g = v.modelo.grupo;
    g.position.set(v.x, v.y, v.z);
    g.rotation.set(v.pitch, v.yaw, v.roll, 'YXZ');
    const p = v.partes;
    if (p.ruedas) {
      for (const r of p.ruedas) r.giro.rotation.x = v.giroRueda;
      if (p.delanteras) for (const r of p.delanteras) r.pivote.rotation.y = v.T.clase === 'aire' ? -v.stick.x * 0.3 : -v.giro * 0.9;
    }
    if (p.volante) p.volante.rotation.z = v.giro * 3 * (v.T.clase === 'agua' ? 1 : 1.2);
    if (p.helice) {
      if (v.T.clase === 'aire') {
        p.helice.rotation.z = v.helice || 0;
        if (p.discoHelice) p.discoHelice.material.opacity = Math.min(0.28, ((v.rpm || 0) - 0.15) * 0.5);
      } else {
        p.helice.rotation.z = (p.helice.rotation.z || 0) + (v.rpm || 0) * 0.9 + (v.motor ? 0.2 : 0);
      }
    }
    if (p.alerones) for (const a of p.alerones) a.grupo.rotation.x = lim(v.stick.x * a.lado * 0.5, -0.5, 0.5);
    if (p.elevadores) for (const e of p.elevadores) e.rotation.x = lim(v.stick.y * 0.5, -0.5, 0.5);
    if (p.timon) p.timon.rotation.y = lim(-v.stick.x * 0.4, -0.45, 0.45);
    // luces
    for (const l of p.luces) { l.mat.emissiveIntensity = v.luces ? 3.2 : l.e0 * 0.3; if (l.mat.emissive) l.mat.emissive.setHex(v.luces ? 0xfff0b0 : 0x222010); }
    const frena = v.activo && v.ocupado && (v.freno > 0);
    for (const l of p.frenos) { l.mat.emissiveIntensity = frena ? 3 : (v.luces ? 1.2 : 0.3); }
    // el exterior del jeep estorba en primera persona
    const interior = v === this.actual && !this.camaraTercera;
    if (p.exterior) for (const e of p.exterior) e.visible = !interior;
  }

  luces() {
    // hasta 2 vehículos con faros prendidos alumbran el terreno
    const u = this.uniformes.uLuzDin.value, c = this.uniformes.uLuzDinC.value;
    for (let i = 0; i < 4; i++) { u[i].set(0, -999, 0, 1); c[i].set(0, 0, 0); }
    let n = 0;
    this.uniformes.uHayLuces.value = 0;
    const lista = this.lista.filter((v) => v.luces && v.modelo.grupo.visible && v.T.clase !== 'riel').slice(0, 2);
    for (const v of lista) {
      const s = Math.sin(v.yaw), co = Math.cos(v.yaw);
      for (const [d, k] of [[7, 1.0], [14, 0.8]]) {
        if (n >= 4) break;
        u[n].set(v.x - s * d, v.y + 1.0, v.z - co * d, d * 1.15 + 5);
        c[n].set(1.0 * k, 0.93 * k, 0.72 * k);
        n++;
        this.uniformes.uHayLuces.value = 1;
      }
    }
  }

  sonido() {
    const v = this.actual;
    if (!v) return;
    if (this.pausado) { Sonido.motorActualizar(0, 0, false, true, 0); return; }
    let carga = 0.3;
    if (v.T.clase === 'aire') carga = v.throttle;
    else carga = Math.min(1, Math.abs(v.acelerador));
    Sonido.motorActualizar(v.rpm, carga, v.motor, v.T.clase === 'agua' ? v.enAgua : true, v.slip || 0);
  }

  // Información para el tablero
  info() {
    const v = this.actual;
    if (!v) return null;
    return {
      nombre: v.T.nombre, tipo: v.tipo, clase: v.T.clase,
      velocidad: Math.round(Math.abs(v.vel) * 3.6), combustible: v.combustible / v.T.tanque,
      gas: v.throttle, altura: Math.round(v.y), luces: v.luces,
      sinCombustible: VC.combustible && v.combustible <= 0 && v.T.consumo > 0,
    };
  }

  // La cámara va pegada al vehículo, atrás (tercera persona) o en el asiento (primera)
  camaraVehiculo(dt, camara, jugador) {
    const v = this.actual;
    const T = v.T;
    this.rel.tiempoMouse += dt;
    if (this.rel.tiempoMouse > 1.6) {
      this.rel.yaw += (0 - this.rel.yaw) * Math.min(1, 1.8 * dt);
      this.rel.pitch += (0 - this.rel.pitch) * Math.min(1, 1.8 * dt);
    }
    const yaw = v.yaw + this.rel.yaw;
    const objetivo = this.tmp.set(v.x, v.y + (T.clase === 'aire' ? 1.4 : T.clase === 'riel' ? 0.9 : 1.2), v.z);
    if (this.camaraTercera) {
      const ph = 0.3 + this.rel.pitch * 0.9 + (T.clase === 'aire' ? -v.pitch * 0.3 : 0);
      const dist = T.distCam * (1 + Math.min(Math.abs(v.vel), 30) * 0.004);
      const dx = Math.sin(yaw) * Math.cos(ph) * dist, dz = Math.cos(yaw) * Math.cos(ph) * dist, dy = Math.sin(ph) * dist + 0.8;
      // el terreno no tapa la cámara: se acerca si choca con un bloque
      let k = 1;
      for (let t = 0.12; t <= 1.0; t += 0.08) {
        const px = objetivo.x + dx * t, py = objetivo.y + dy * t, pz = objetivo.z + dz * t;
        if (this.mundo.esSolido(Math.floor(px), Math.floor(py), Math.floor(pz))) { k = Math.max(0.1, t - 0.1); break; }
      }
      const deseada = new THREE.Vector3(objetivo.x + dx * k, objetivo.y + dy * k, objetivo.z + dz * k);
      if (!this.camListo) { this.camPos.copy(deseada); this.camListo = true; }
      else this.camPos.lerp(deseada, Math.min(1, dt * 12));
      camara.position.copy(this.camPos);
      camara.lookAt(objetivo.x, objetivo.y + 0.2, objetivo.z);
      camara.rotation.order = 'YXZ';
    } else {
      const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
      const [ax, ay, az] = T.asiento;
      // el asiento está en coordenadas del modelo (frente = -Z)
      const wx = ax * c + az * s, wz = -ax * s + az * c;
      camara.position.set(v.x + wx, v.y + ay, v.z + wz);
      camara.rotation.set(v.pitch * 0.6 + this.rel.pitch, yaw, -v.roll * 0.5, 'YXZ');
    }
    // para que el resto del juego (apuntar, etc.) sepa dónde estás
    jugador.x = v.x; jugador.y = v.y; jugador.z = v.z;
    jugador.yaw = yaw;
  }
}
