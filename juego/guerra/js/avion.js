// =============================================================
//  AVIONES: el del jugador (física arcade) y los cazas enemigos (IA).
//  El morro apunta a -Z. Cabeceo = giro sobre X, alabeo = sobre Z.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { crearAvion, aplicarMarca } from './modelos.js';
import { Sonido } from './sonido.js';
import { CONFIG, ENEMIGOS_AIRE } from './config.js';

const EX = new THREE.Vector3(1, 0, 0), EY = new THREE.Vector3(0, 1, 0), EZ = new THREE.Vector3(0, 0, 1);
const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3(), V4 = new THREE.Vector3();
const H = new THREE.Vector3(), D = new THREE.Vector3(), L = new THREE.Vector3();
const Q1 = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), M1 = new THREE.Matrix4();
const E1 = new THREE.Euler();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const HOYO = new THREE.CircleGeometry(0.3, 8);
const MAT_HOYO = new THREE.MeshBasicMaterial({ color: 0x0c0c0e, side: THREE.DoubleSide });

class Avion {
  constructor(ctx, modelo, colores, escala = 1, mp = {}) {
    this.ctx = ctx;
    this.grupo = crearAvion(modelo, colores, escala, mp);
    ctx.escena.add(this.grupo);
    this.pos = this.grupo.position;
    this.q = this.grupo.quaternion;
    this.centro = this.pos;
    this.vel = new THREE.Vector3();
    this.fwd = new THREE.Vector3(0, 0, -1);
    this.dirArma = new THREE.Vector3(0, 0, -1);
    this.radio = 4.2;
    this.vivo = true;
    this.tipo = 'aire';
    this.velocidad = 90;
    this.vidaMax = 100;
    this.vida = 100;
    this.humoT = 0;
    this.alMorir = null;
    this.ultimo = null;
    this.nombre = '';
    this.mod = { alaI: 0, alaD: 0, motor: 0, cola: 0, piloto: 0 };
    this.fuego = 0;
    this.motorDelante = !!(this.grupo.userData.helice || this.grupo.userData.helices);
    this.esHeli = !!this.grupo.userData.rotor;
    this.hoyos = [];
  }

  // Zona del avión que recibió el impacto, según dónde cae el punto en su sistema local
  _zona(punto) {
    this.grupo.updateMatrixWorld(true);
    V1.copy(punto);
    this.grupo.worldToLocal(V1);
    const e = this.grupo.scale.x || 1, r = this.radio / e;
    const x = V1.x, z = V1.z;
    if (this.esHeli) return V1.y > 0.7 ? 'motor' : z > r * 0.9 ? 'cola' : Math.abs(x) > r * 0.5 ? (x > 0 ? 'alaD' : 'alaI') : 'cabina';
    if (Math.abs(x) > r * 0.42) return x > 0 ? 'alaD' : 'alaI';
    if (z > r * 0.5) return this.motorDelante ? 'cola' : 'motor';
    if (z < -r * 0.45) return this.motorDelante ? 'motor' : 'cabina';
    return 'cabina';
  }

  _agujero(punto, zona) {
    if (this.hoyos.length >= 10 || (zona !== 'alaI' && zona !== 'alaD')) return;
    V1.copy(punto);
    this.grupo.worldToLocal(V1);
    const h = new THREE.Mesh(HOYO, MAT_HOYO);
    h.position.set(V1.x, 0.2 * Math.sign(V1.y || 1), V1.z);
    h.rotation.x = -Math.PI / 2;
    const e = 1 / (this.grupo.scale.x || 1);
    h.scale.setScalar(e);
    this.grupo.add(h);
    this.hoyos.push(h);
  }

  _humoDanio(dt) {
    const f = this.vida / this.vidaMax;
    const m = this.mod;
    const mal = f < 0.5 || m.motor > 0.4 || m.alaI > 0.5 || m.alaD > 0.5;
    if (!mal) return;
    this.humoT -= dt;
    if (this.humoT > 0) return;
    const grave = f < 0.25 || m.motor > 0.8;
    this.humoT = grave ? 0.03 : 0.07;
    const ef = this.ctx.efectos;
    if (f < 0.5 || m.motor > 0.4) {
      V1.set(0, 0, 3.5).applyQuaternion(this.q).add(this.pos);
      ef.estela(V1, false, grave ? 1.6 : 1.1);
      if (grave || this.fuego) ef.llama(V1, 1);
    }
    for (const lado of [-1, 1]) {
      const d = lado > 0 ? m.alaD : m.alaI;
      if (d > 0.5) {
        V1.set(lado * this.radio * 0.8, 0, 1).applyQuaternion(this.q).add(this.pos);
        ef.estela(V1, false, 0.8 + d);
        if (d > 0.85) ef.llama(V1, 0.6);
      }
    }
    if (this.mod.piloto > 0.5) { V1.set(0, 0.6, -1.5).applyQuaternion(this.q).add(this.pos); ef.estela(V1, true, 0.5); }
  }

  morir() {
    if (!this.vivo) return;
    this.vivo = false;
    this.vida = 0;
    this.ctx.efectos.explosion(this.pos, 2.4);
    this.grupo.visible = false;
    if (this.alMorir) this.alMorir(this);
  }

  quitar() {
    this.ctx.escena.remove(this.grupo);
  }

  recibirDanio(d, punto, proj) {
    if (!this.vivo) return;
    if (proj && proj.dueno && proj.dueno !== this) this.ultimo = proj.dueno;
    if (punto) {
      const z = this._zona(punto);
      const m = this.mod;
      const dm = (d / this.vidaMax) * 3;
      if (z === 'cabina') m.piloto = Math.min(1, m.piloto + (d / this.vidaMax) * 1.4);
      else m[z] = Math.min(1, m[z] + dm);
      this._agujero(punto, z);
      if (m.motor > 0.85 && !this.fuego) this.fuego = 1;
      this.ctx.efectos.chispa(punto);
    }
    this.vida -= d;
    if (this.vida <= 0 || this.mod.piloto >= 1) this.morir();
  }

  // El fuego del motor quema la estructura
  _quemar(dt) {
    if (!this.fuego || !this.vivo) return;
    this.vida -= 2.2 * dt * (this.vidaMax / 100);
    if (this.vida <= 0) this.morir();
  }
}

// ------------------------------------------------------------------ Jugador
export class AvionJugador extends Avion {
  constructor(ctx, def) {
    super(ctx, def.modelo, def.colores, def.escala || 1, def.mp || {});
    aplicarMarca(this.grupo, def.marca, ctx.perfilColor || '#ffffff');
    this.def = def;
    this.radio = def.radio;
    this.vidaMax = def.vida;
    this.sigilo = def.sigilo;
    this.equipo = 'jugador';
    this.w = new THREE.Vector3();
    this.palo = { x: 0, y: 0 };
    this.aim = new THREE.Vector3(0, 0, -1);
    this.lead = null;
    this.aimVisible = false;
    this.invertido = false;
    this.esJugador = true;
    this.ilimitado = false; // simulacro: munición infinita y sin daño
    this.reiniciar();
  }

  // punto = { x, y, z, rumbo } para aparecer en otro lugar (batallas por equipos)
  reiniciar(punto = null) {
    const ini = punto || this.ctx.mapa.inicio;
    this.pos.set(ini.x, ini.y, ini.z);
    this.q.identity();
    this.rumbo = ini.rumbo || 0;
    if (this.rumbo) this.q.setFromAxisAngle(EY, this.rumbo);
    this.velocidad = this.esHeli ? 0 : 95;
    this.empuje = this.esHeli ? 0 : 0.55;
    this.vida = this.vidaMax;
    this.vivo = true;
    this.grupo.visible = true;
    this.misiles = this.def.sec.n;
    this.bombas = this.def.bombas;
    this.bengalas = this.def.bengalas;
    this.extintores = 1;
    this.cdArma = 0;
    this.cdMisil = 0;
    this.cdBengala = 0;
    this.lado = 1;
    this.apuntado = null;
    this.bloqueado = null;
    this.tBloqueo = 0;
    this.perdida = 0;
    this.fuera = false;
    this.cercaSuelo = false;
    this.w.set(0, 0, 0);
    this.palo.x = this.palo.y = 0;
    this.aim.set(0, 0, -1).applyQuaternion(this.q);
    this.lead = null;
    this.regMisil = 0;
    this.regBomba = 0;
    this.vy = 0;
    this.g = 1;
    this.fuego = 0;
    this.ultimo = null;
    for (const k in this.mod) this.mod[k] = 0;
    for (const h of this.hoyos) this.grupo.remove(h);
    this.hoyos.length = 0;
    this.vel.set(0, 0, 0);
  }

  reabastecer() {
    this.misiles = this.def.sec.n;
    this.bombas = this.def.bombas;
    this.bengalas = this.def.bengalas;
    this.vida = Math.min(this.vidaMax, this.vida + 30);
  }

  actualizar(dt, ent, candidatos) {
    if (!this.vivo) return;
    const { terreno, efectos } = this.ctx;
    const D = this.def, VL = D.vel, GR = D.giro, M = this.mod;
    // --- entradas
    const r = ent.consumirRaton();
    const sens = this.ctx.opciones.sens || 1;
    const aim = this.ctx.opciones.raton !== 'joystick';
    this.fwd.set(0, 0, -1).applyQuaternion(this.q);
    const sgn = this.invertido ? -1 : 1;
    // mandos manuales: teclado, mando y joystick táctil (stick abajo = morro arriba)
    let cab = (ent.k('KeyS', 'ArrowDown') ? 1 : 0) - (ent.k('KeyW', 'ArrowUp') ? 1 : 0) + ent.izq.y + ent.mIzq.y;
    let ala = (ent.k('KeyD', 'ArrowRight') ? 1 : 0) - (ent.k('KeyA', 'ArrowLeft') ? 1 : 0) + ent.izq.x + ent.mIzq.x;
    cab = clamp(cab, -1, 1) * sgn;
    ala = clamp(ala, -1, 1);
    const manual = Math.abs(cab) + Math.abs(ala) > 0.05 || ent.k('KeyE', 'KeyQ', 'PadRB', 'PadLB');
    this.aimVisible = false;
    if (aim) {
      // ratón tipo War Thunder: el cursor marca hacia dónde quieres volar y el avión se orienta solo
      if (manual && !this.esHeli) this.aim.copy(this.fwd);
      else {
        const m = this._ratonApuntar(r, ent, sens);
        if (!this.esHeli) { cab = m.cab; ala = m.ala; }
        this.aimVisible = true;
      }
    } else {
      // joystick virtual con el ratón: lo que mueves se mantiene y se centra poco a poco
      this.palo.x = clamp(this.palo.x + r.dx * 0.005 * sens, -1, 1);
      this.palo.y = clamp(this.palo.y + r.dy * 0.005 * sens * sgn, -1, 1);
      const dec = Math.exp(-0.7 * dt);
      this.palo.x *= dec;
      this.palo.y *= dec;
      cab = clamp(cab + this.palo.y * sgn, -1, 1);
      ala = clamp(ala + this.palo.x, -1, 1);
    }
    // piloto herido: pulso tembloroso; ala dañada: el avión se va de lado
    if (M.piloto > 0.35) { cab += (Math.random() - 0.5) * M.piloto * 0.6; ala += (Math.random() - 0.5) * M.piloto * 0.6; }
    ala = clamp(ala + (M.alaD - M.alaI) * 0.7, -1, 1);
    const gui = (ent.k('KeyE', 'PadRB') ? 1 : 0) - (ent.k('KeyQ', 'PadLB') ? 1 : 0);
    if (this.esHeli) { this._volarHeli(dt, ent, cab, ala, gui, aim, sgn); this._armas(dt, ent, candidatos); return; }
    if (ent.pulso('PadX')) this.empuje = 0.6; // X: empuje de crucero
    if (ent.k('ShiftLeft', 'ShiftRight', 'PadUp')) this.empuje = Math.min(1, this.empuje + 0.5 * dt);
    if (ent.k('ControlLeft', 'ControlRight', 'KeyC', 'PadDown')) this.empuje = Math.max(0, this.empuje - 0.5 * dt);
    const freno = ent.k('KeyX', 'PadL3');

    // --- velocidad, energía y pérdida de sustentación
    this.fwd.set(0, 0, -1).applyQuaternion(this.q);
    const potencia = 1 - 0.7 * M.motor;
    const tope = VL.tope * (1 - 0.12 * (M.alaI + M.alaD)) * (this.ctx.potencia || 1);
    const objetivo = (VL.min + this.empuje * VL.rango * potencia) * (this.ctx.potencia || 1);
    // los giros cerrados cuestan velocidad (arrastre inducido); picar la gana, trepar la pierde
    const carga = Math.abs(this.w.x) / GR.cab * 0.6 + Math.abs(this.w.z) / GR.ala * 0.15;
    this.velocidad += (objetivo - this.velocidad) * 0.4 * dt - this.fwd.y * VL.grav * dt - carga * 9 * dt * (this.velocidad / VL.tope);
    if (freno) this.velocidad -= 22 * dt;
    this.velocidad = clamp(this.velocidad, VL.perdida - 30, tope);
    this.perdida = clamp((VL.perdida - this.velocidad) / 18, 0, 1);
    const autoridad = (1 - 0.7 * this.perdida) * (1 - 0.5 * M.cola);

    // --- giros (suavizados)
    const k = 1 - Math.exp(-GR.resp * dt);
    this.w.x += (cab * GR.cab * autoridad - this.w.x) * k;
    this.w.z += (-ala * GR.ala * autoridad - this.w.z) * k;
    this.w.y += (-gui * GR.gui - this.w.y) * k;
    this.g = 1 + Math.abs(this.w.x) * this.velocidad / 9.8 * 0.55;
    Q1.setFromAxisAngle(EX, this.w.x * dt - this.perdida * 0.9 * dt);
    Q2.setFromAxisAngle(EZ, this.w.z * dt);
    this.q.multiply(Q1).multiply(Q2);
    Q1.setFromAxisAngle(EY, this.w.y * dt);
    this.q.multiply(Q1);

    // viraje al ladear y nivelación automática sin mandos
    V1.set(1, 0, 0).applyQuaternion(this.q);
    V2.set(0, 1, 0).applyQuaternion(this.q);
    if (V2.y > 0.1) {
      Q1.setFromAxisAngle(EY, V1.y * 0.85 * dt);
      this.q.premultiply(Q1);
      if (Math.abs(ala) < 0.05 && ent.izq.x === 0) {
        Q1.setFromAxisAngle(EZ, -V1.y * 1.1 * dt);
        this.q.multiply(Q1);
      }
    }
    this._limites(dt);
    this.q.normalize();

    // --- movimiento
    this.fwd.set(0, 0, -1).applyQuaternion(this.q);
    this.vel.copy(this.fwd).multiplyScalar(this.velocidad);
    this.vel.y -= this.perdida * 18;
    this.pos.addScaledVector(this.vel, dt);

    // --- suelo: ayuda para no chocar, y choque
    const suelo = Math.max(terreno.altura(this.pos.x, this.pos.z), 0);
    this.cercaSuelo = this.pos.y < suelo + 55 && this.fwd.y < 0.02;
    if (this.pos.y < suelo + 20 && this.fwd.y < 0) {
      Q1.setFromAxisAngle(EX, 0.9 * dt);
      this.q.multiply(Q1);
    }
    if (this.pos.y < suelo + 1.6 || terreno.colision(this.pos.x, this.pos.y, this.pos.z, 2)) {
      this.morir();
      return;
    }
    this.dirArma.copy(this.fwd);
    this._armas(dt, ent, candidatos);

    // --- aspecto
    const ud = this.grupo.userData;
    ud.llama.scale.set(1, 1, 0.5 + this.empuje * 1.2 + Math.random() * 0.2);
    const giroH = (14 + this.empuje * 40) * dt;
    if (ud.helice) ud.helice.rotation.z += giroH;
    if (ud.helices) for (const h of ud.helices) h.rotation.z += giroH;
    this._humoDanio(dt);
    this._quemar(dt);
    if (Math.random() < 0.5 && this.empuje > 0.7) {
      V1.set(0, 0, 5).applyQuaternion(this.q).add(this.pos);
      efectos.llama(V1, 0.5);
    }
    this._estelas(dt);
  }

  // Bordes de la zona de combate y techo
  _limites(dt) {
    const dc = Math.hypot(this.pos.x, this.pos.z);
    this.fuera = dc > CONFIG.mundo.limite;
    if (this.fuera) {
      V1.set(this.fwd.x, 0, this.fwd.z).normalize();
      V2.set(-this.pos.x, 0, -this.pos.z).normalize();
      const cruz = V1.z * V2.x - V1.x * V2.z;
      if (V1.dot(V2) < 0.95) {
        Q1.setFromAxisAngle(EY, Math.sign(cruz || 1) * 0.9 * dt);
        this.q.premultiply(Q1);
      }
    }
    if (this.pos.y > 800) {
      Q1.setFromAxisAngle(EX, -0.8 * dt);
      this.q.multiply(Q1);
    }
  }

  // Estelas de condensación en las puntas de ala con mucha fuerza G
  _estelas(dt) {
    if (this.g < 2.4 || this.ctx.reducirEfectos) return;
    this.tEst = (this.tEst || 0) - dt;
    if (this.tEst > 0) return;
    this.tEst = 0.04;
    for (const l of [-1, 1]) {
      V1.set(l * this.radio * 0.95, 0, 1).applyQuaternion(this.q).add(this.pos);
      this.ctx.efectos.estela(V1, true, 0.5);
    }
  }

  // Helicóptero: vuela en cualquier dirección y se queda quieto en el aire
  _volarHeli(dt, ent, cab, ala, gui, aim, sgn) {
    const D = this.def, VL = D.vel, GR = D.giro, M = this.mod;
    const { terreno } = this.ctx;
    const potencia = (1 - 0.6 * M.motor) * (this.ctx.potencia || 1);
    const fw = clamp((ent.k('KeyW', 'ArrowUp') ? 1 : 0) - (ent.k('KeyS', 'ArrowDown') ? 1 : 0) - ent.izq.y - ent.mIzq.y, -1, 1) * (sgn > 0 ? 1 : 1);
    const lado = clamp((ent.k('KeyD', 'ArrowRight') ? 1 : 0) - (ent.k('KeyA', 'ArrowLeft') ? 1 : 0) + ent.izq.x + ent.mIzq.x, -1, 1);
    const subir = (ent.k('ShiftLeft', 'ShiftRight', 'PadUp') ? 1 : 0) - (ent.k('ControlLeft', 'ControlRight', 'KeyC', 'PadDown') ? 1 : 0);
    // rumbo: hacia el cursor (ratón) o con palanca de guiñada
    let yawV = -gui * GR.gui;
    if (aim && this.aimVisible) {
      const ang = Math.atan2(-this.aim.x, -this.aim.z);
      let err = ang - this.rumbo;
      while (err > Math.PI) err -= Math.PI * 2;
      while (err < -Math.PI) err += Math.PI * 2;
      yawV += clamp(err * 2.4, -GR.gui, GR.gui);
    } else if (!aim) yawV += -this.palo.x * GR.gui;
    this.w.y += (yawV - this.w.y) * (1 - Math.exp(-GR.resp * dt));
    this.rumbo += this.w.y * dt * (1 - 0.4 * M.cola);
    const sinR = Math.sin(this.rumbo), cosR = Math.cos(this.rumbo);
    const fx = -sinR, fz = -cosR, rx = cosR, rz = -sinR;
    const vmax = VL.tope * potencia * (1 - 0.12 * (M.alaI + M.alaD));
    const tx = (fx * fw + rx * lado * 0.7) * vmax, tz = (fz * fw + rz * lado * 0.7) * vmax;
    const k = 1 - Math.exp(-1.1 * dt);
    this.vel.x += (tx - this.vel.x) * k;
    this.vel.z += (tz - this.vel.z) * k;
    let vyObj = subir * 20 * potencia;
    if (aim && this.aimVisible && !subir) vyObj = clamp(this.aim.y * 26, -14, 14) * (Math.abs(fw) + Math.abs(lado) > 0.1 || this.empuje > 0 ? 1 : 0.4);
    this.vy += (vyObj - this.vy) * (1 - Math.exp(-2 * dt));
    this.vel.y = this.vy;
    this.pos.addScaledVector(this.vel, dt);
    // límites y suelo
    const dc = Math.hypot(this.pos.x, this.pos.z);
    this.fuera = dc > CONFIG.mundo.limite;
    if (this.fuera) { this.vel.x -= this.pos.x / dc * 20 * dt; this.vel.z -= this.pos.z / dc * 20 * dt; }
    if (this.pos.y > 600) this.pos.y = 600;
    const suelo = Math.max(terreno.altura(this.pos.x, this.pos.z), 0);
    this.cercaSuelo = this.pos.y < suelo + 25 && this.vy < -2;
    if (this.pos.y < suelo + 3) {
      if (this.vy < -22) { this.morir(); return; }
      this.pos.y = suelo + 3;
      this.vy = Math.max(0, this.vy);
    }
    if (terreno.colision(this.pos.x, this.pos.y, this.pos.z, 2)) { this.morir(); return; }
    // aspecto: morro hacia abajo al avanzar, ladeo al deslizarse
    const vf = this.vel.x * fx + this.vel.z * fz, vl = this.vel.x * rx + this.vel.z * rz;
    this.velocidad = Math.hypot(this.vel.x, this.vel.z);
    const cabeceo = clamp(-vf / VL.tope * 0.38 + this.vy * 0.004, -0.5, 0.35);
    const alabeo = clamp(-vl / VL.tope * 0.45 - this.w.y * 0.12, -0.6, 0.6);
    E1.set(cabeceo, this.rumbo, alabeo, 'YXZ');
    this.q.setFromEuler(E1);
    this.fwd.set(0, 0, -1).applyQuaternion(this.q);
    if (aim && this.aimVisible) this.dirArma.copy(this.aim);
    else this.dirArma.copy(this.fwd);
    this.g = 1;
    this.perdida = 0;
    const ud = this.grupo.userData;
    ud.rotor.rotation.y += (22 + Math.abs(this.vy) * 0.3) * dt * 3;
    if (ud.rotorCola) ud.rotorCola.rotation.x += 40 * dt;
    this._humoDanio(dt);
    this._quemar(dt);
  }

  // Disparos y recarga (igual para aviones y helicópteros)
  _armas(dt, ent, candidatos) {
    const D = this.def;
    this.cdArma -= dt;
    this.cdMisil -= dt;
    this.cdBengala -= dt;
    if (D.sec.n > 0 && this.misiles < D.sec.n) {
      this.regMisil += dt;
      if (this.regMisil > D.sec.regen) { this.regMisil = 0; this.misiles++; }
    }
    this._apuntar(dt, candidatos);
    if (ent.k('Space', 'Mouse0', 'PadRT') && this.cdArma <= 0) this._ametrallar();
    if ((D.sec.tipo === 'cohete' ? ent.k('KeyF', 'Mouse2', 'PadLT') : ent.pulso('KeyF', 'Mouse2', 'PadLT')) && this.misiles > 0 && this.cdMisil <= 0) this._misil();
    if (ent.pulso('KeyB', 'PadA') && this.bombas > 0) this._bomba();
    if (ent.pulso('KeyG', 'PadB')) this.lanzarBengalas();
    if (ent.pulso('KeyR', 'PadLeft')) this.extinguir();
    if (this.ilimitado) { this.misiles = D.sec.n; this.bombas = D.bombas; this.bengalas = D.bengalas; }
  }

  lanzarBengalas() {
    if (this.bengalas <= 0 || this.cdBengala > 0 || !this.vivo) return;
    this.bengalas--;
    this.cdBengala = 0.8;
    this.ctx.proyectiles.bengala(this, 3);
    Sonido.bip();
  }

  extinguir() {
    if (!this.fuego || this.extintores <= 0) return;
    this.extintores--;
    this.fuego = 0;
    this.mod.motor = Math.min(this.mod.motor, 0.7);
    this.ctx.hud.aviso('INCENDIO APAGADO', 1.6);
  }

  // Mueve el punto de mira (aim) y calcula cuánto girar para ir hacia él
  _ratonApuntar(r, ent, sens) {
    const MAX = this.esHeli ? 3.1 : 1.25;
    if (document.pointerLockElement) {
      const s = 0.0022 * sens;
      Q1.setFromAxisAngle(EY, -r.dx * s);
      this.aim.applyQuaternion(Q1);
      H.crossVectors(this.aim, EY);
      if (H.lengthSq() > 1e-6) {
        Q1.setFromAxisAngle(H.normalize(), -r.dy * s * (this.invertido ? -1 : 1));
        this.aim.applyQuaternion(Q1);
      }
    } else if (ent.ratonMovido) {
      // sin pointer lock: el cursor de pantalla es el punto de mira
      this.aim.set(ent.cx, ent.cy, 0.5).unproject(this.ctx.camera).sub(this.ctx.camera.position);
    }
    this.aim.y = clamp(this.aim.y / (this.aim.length() || 1), -0.93, 0.93);
    this.aim.normalize();
    const c = clamp(this.aim.dot(this.fwd), -1, 1);
    if (Math.acos(c) > MAX) {
      H.copy(this.aim).addScaledVector(this.fwd, -c).normalize();
      this.aim.copy(this.fwd).multiplyScalar(Math.cos(MAX)).addScaledVector(H, Math.sin(MAX));
    }
    D.copy(this.aim).applyQuaternion(Q2.copy(this.q).invert());
    // ángulo al objetivo y hacia qué lado del avión queda (0 = justo encima)
    const a = Math.acos(clamp(-D.z, -1, 1));
    if (a < 0.1) return { cab: clamp(D.y * 8, -1, 1), ala: clamp(D.x * 8, -1, 1) };
    const err = Math.atan2(D.x, D.y);
    const ala = (Math.abs(err) < 0.12 ? err * 8 : Math.sign(err)) * (a < 0.3 ? a / 0.3 + 0.2 : 1);
    // tira de la palanca cuando el objetivo ya queda hacia "arriba" del avión (viraje cerrado)
    const cab = Math.max(0, Math.cos(err)) * Math.min(1, a * 3) + (D.z > 0 ? 0.3 : 0);
    return { cab: clamp(cab, -1, 1), ala: clamp(ala, -1, 1) };
  }

  _apuntar(dt, candidatos) {
    let mejor = null, mejorA = 0.28;
    for (const e of candidatos) {
      if (!e.vivo) continue;
      V1.copy(e.centro).sub(this.pos);
      const d = V1.length();
      if (d > 1500 || d < 40) continue;
      const a = Math.acos(clamp(V1.divideScalar(d).dot(this.dirArma), -1, 1));
      if (a < mejorA) { mejorA = a; mejor = e; }
    }
    if (mejor && mejor === this.apuntado) this.tBloqueo += dt;
    else this.tBloqueo = 0;
    this.apuntado = mejor;
    // punto de mira de adelanto para las ametralladoras (bala a 650 m/s más tu velocidad)
    if (mejor) {
      V1.copy(mejor.centro).sub(this.pos);
      V2.set(0, 0, 0);
      if (mejor.vel) V2.copy(mejor.vel);
      V2.sub(this.vel);
      let t = V1.length() / 650;
      for (let i = 0; i < 3; i++) t = V3.copy(V1).addScaledVector(V2, t).length() / 650;
      if (!this.lead) this.lead = new THREE.Vector3();
      this.lead.copy(mejor.centro).addScaledVector(V2, t);
    } else this.lead = null;
    const antes = this.bloqueado;
    this.bloqueado = mejor && this.tBloqueo > 0.8 ? mejor : null;
    if (this.bloqueado && !antes) Sonido.bip();
  }

  _ametrallar() {
    const { proyectiles } = this.ctx;
    const A = this.def.ametra;
    this.cdArma = A.cd;
    this.lado = -this.lado;
    V1.set(this.lado * A.lado, -0.3, -2.2).applyQuaternion(this.q).add(this.pos);
    V2.copy(this.dirArma);
    // ayuda de puntería: se inclina un poco hacia el enemigo cercano al centro
    const e = this.apuntado;
    if (e) {
      V3.copy(e.centro).sub(V1);
      const d = V3.length();
      if (d < 800) {
        V3.addScaledVector(V4.copy(e.vel || V4.set(0, 0, 0)).sub(this.vel), d / 700).normalize();
        V2.lerp(V3, 0.55);
      }
    }
    V2.x += (Math.random() - 0.5) * A.disp;
    V2.y += (Math.random() - 0.5) * A.disp;
    V2.z += (Math.random() - 0.5) * A.disp;
    V2.normalize();
    proyectiles.disparar('bala', 'jugador', V1, V2, this.vel, { dano: A.dano * (this.ctx.potencia || 1), dueno: this });
    Sonido.disparo('ametralladora', 0.9);
    this.ctx.entrada.vibrar(0, 0.3, 50, 'ametra', 55);
    if (this.ctx.estadisticas) this.ctx.estadisticas.disparos++;
  }

  _misil() {
    const S = this.def.sec;
    this.cdMisil = S.cd;
    this.misiles--;
    V1.set(this.misiles % 2 ? 2.4 : -2.4, -0.5, -0.5).applyQuaternion(this.q).add(this.pos);
    const st = this.ctx.estadisticas;
    if (st) st.misiles++;
    if (S.tipo === 'cohete') {
      V2.copy(this.dirArma);
      V2.x += (Math.random() - 0.5) * 0.012;
      V2.y += (Math.random() - 0.5) * 0.012;
      V2.normalize();
      const p = this.ctx.proyectiles.disparar('cohete', 'jugador', V1, V2, this.vel, { dueno: this, dano: 44 * (this.ctx.potencia || 1) });
      this.ultimoDisparo = p;
      Sonido.disparo('misil', 0.7);
      this.ctx.entrada.vibrar(0.3, 0.5, 90, 'cohete', 80);
      return;
    }
    const p = this.ctx.proyectiles.disparar('misil', 'jugador', V1, this.dirArma, this.vel, { vel: 60, objetivo: this.bloqueado, giro: 2.8, dueno: this, dano: 70 * (this.ctx.potencia || 1) });
    this.ultimoDisparo = p;
    Sonido.disparo('misil', 1);
    this.ctx.entrada.vibrar(0.6, 0.7, 180, 'misil');
  }

  _bomba() {
    this.bombas--;
    V1.set(0, -1.1, 0.5).applyQuaternion(this.q).add(this.pos);
    const tipo = { L: 'bombaL', M: 'bomba', P: 'bombaP' }[this.def.bombaTipo] || 'bomba';
    this.ultimoDisparo = this.ctx.proyectiles.disparar(tipo, 'jugador', V1, this.fwd, this.vel, { vel: 0.01, dueno: this });
    if (this.ctx.estadisticas) this.ctx.estadisticas.bombas++;
    Sonido.disparo('flak', 0.6);
    this.ctx.entrada.vibrar(0.8, 0.3, 200, 'bomba');
  }

  recibirDanio(d, punto, proj) {
    if (!this.vivo || this.ilimitado) return;
    this.ctx.hud.golpe();
    Sonido.impacto(0.9);
    this.ctx.entrada.vibrar(Math.min(1, 0.3 + d / 40), 0.8, 160, 'dano', 90);
    super.recibirDanio(d * (this.ctx.fragilidad || 1), punto, proj);
  }

  update() { /* alias para pruebas */ }
}

// ------------------------------------------------------------------ Avión remoto (otro jugador; lo mueve la red)
export class AvionRemoto extends Avion {
  constructor(ctx, def, equipo = 'jugador') {
    super(ctx, def.modelo, def.colores, def.escala || 1, def.mp || {});
    this.def = def;
    this.radio = def.radio;
    this.vidaMax = this.vida = def.vida;
    this.equipo = equipo;
    this.remoto = true;
    this.objPos = new THREE.Vector3();
    this.objQ = new THREE.Quaternion();
  }

  // s = { x, y, z, q:[x,y,z,w], vx, vy, vz, vida }
  aplicar(s) {
    this.objPos.set(s.x, s.y, s.z);
    this.objQ.set(s.q[0], s.q[1], s.q[2], s.q[3]);
    this.vel.set(s.vx || 0, s.vy || 0, s.vz || 0);
    if (s.vida !== undefined) this.vida = s.vida;
  }

  actualizar(dt) {
    if (!this.vivo) return;
    const k = 1 - Math.exp(-12 * dt);
    this.pos.lerp(this.objPos, k);
    this.q.slerp(this.objQ, k);
    this.fwd.set(0, 0, -1).applyQuaternion(this.q);
    const ud = this.grupo.userData;
    if (ud.helice) ud.helice.rotation.z += 40 * dt;
    if (ud.rotor) ud.rotor.rotation.y += 60 * dt;
    if (ud.llama && ud.llama.scale) ud.llama.scale.set(1, 1, 0.9);
    this._humoDanio(dt);
  }

  recibirDanio(d, punto, proj) { super.recibirDanio(d, punto, proj); }
}

// ------------------------------------------------------------------ Enemigo / bot
// opc = { equipo, def (avión del catálogo), nivel (1 recluta .. 3 as), nombre }
const NIVEL_BOT = [
  { vel: 0.84, giro: 0.8, disp: 1.7, vida: 0.6, rafaga: 1.3, evade: 0.4, dano: 0.8 },
  { vel: 0.92, giro: 1, disp: 1, vida: 0.75, rafaga: 1, evade: 1, dano: 1 },
  { vel: 1, giro: 1.2, disp: 0.6, vida: 0.95, rafaga: 0.75, evade: 1.6, dano: 1.2 },
];

export class AvionEnemigo extends Avion {
  constructor(ctx, oleada, variante = 'caza', opc = {}) {
    const def = opc.def || null;
    const V = def
      ? { modelo: def.modelo, colores: def.colores, vida: 1, vel: 1, giro: 1, puntos: 1, radio: def.radio, desde: 1, misil: def.sec.tipo === 'misil' && def.sec.n > 0 ? 1 : 99, disp: 1, dano: 1 }
      : ENEMIGOS_AIRE[variante] || ENEMIGOS_AIRE.caza;
    super(ctx, V.modelo, V.colores, def ? def.escala || 1 : 1, def ? def.mp || {} : {});
    this.V = V;
    this.def = def;
    this.nivel = opc.nivel || 0;
    const N = this.nivel ? NIVEL_BOT[this.nivel - 1] : null;
    this.radio = V.radio;
    this.equipo = opc.equipo || 'enemigo';
    this.nombre = opc.nombre || '';
    this.puntos = Math.round((100 + oleada * 20) * V.puntos);
    this.oleada = oleada;
    this.bank = 0;
    this.romper = 0;
    this.signo = 1;
    this.rafaga = 0;
    this.cdRafaga = 2 + Math.random() * 2;
    this.cdMisil = 8 + Math.random() * 8;
    this.cdBala = 0;
    this.cdBomba = 2;
    this.cdBengala = 0;
    this.objetivo = null;
    this.tObjetivo = Math.random();
    this.aSueloAtaque = 0;
    if (def) {
      const heli = def.tipo === 'heli';
      this.vidaMax = this.vida = Math.round(def.vida * N.vida);
      this.base = heli ? 34 * N.vel : (def.vel.min + def.vel.rango * 0.72) * N.vel;
      this.giro = (heli ? 1.3 : def.giro.cab * 0.75 + 0.28) * N.giro;
      this.dispersion = 0.03 * N.disp * (def.ametra.disp / 0.014);
      this.danoBala = (3.2 + def.ametra.dano * 0.28) * N.dano;
      this.cdTiro = Math.max(0.07, def.ametra.cd * 1.15);
      this.bombasN = def.bombas;
      this.bombaTipo = { L: 'bombaL', M: 'bomba', P: 'bombaP' }[def.bombaTipo] || 'bomba';
      this.bengalasN = def.bengalas;
      this.misilesN = def.sec.tipo === 'misil' ? def.sec.n : 0;
      this.rol = def.rol;
      this.ataca = def.rol === 'ataque' || def.rol === 'bombardero' || heli;
      this.sigilo = def.sigilo;
    } else {
      this.vidaMax = this.vida = Math.round(Math.min(80, 28 + oleada * 7) * V.vida);
      this.base = Math.min(118, 78 + oleada * 5) * V.vel;
      this.giro = Math.min(1.35, 0.7 + oleada * 0.1) * V.giro;
      this.dispersion = Math.max(0.012, 0.045 - oleada * 0.005) * V.disp;
      this.danoBala = (3 + oleada * 0.4) * V.dano;
      this.cdTiro = 0.09;
      this.bombasN = 0;
      this.bengalasN = 0;
      this.misilesN = 99;
      this.ataca = false;
    }
    this.N = N || NIVEL_BOT[1];
    this.velocidad = this.base;
  }

  colocar(x, y, z, hacia) {
    this.pos.set(x, y, z);
    this.fwd.copy(hacia).sub(this.pos).setY(0).normalize();
    this._orientar();
  }

  _orientar() {
    const f = this.fwd;
    V1.set(-f.z, 0, f.x);
    if (V1.lengthSq() < 1e-4) V1.set(1, 0, 0);
    V1.normalize();
    V2.crossVectors(V1, f);
    M1.makeBasis(V1, V2, V3.copy(f).negate());
    this.q.setFromRotationMatrix(M1);
    Q1.setFromAxisAngle(EZ, this.bank);
    this.q.multiply(Q1);
  }

  // jp = objetivo actual (puede ser null: patrulla) · aliados = todos los aviones (para separarse)
  actualizar(dt, jp, aliados) {
    if (!this.vivo) return;
    const { terreno, proyectiles } = this.ctx;
    const pos = this.pos, fwd = this.fwd;
    const hayObj = !!(jp && jp.vivo);
    const objAire = hayObj && jp.tipo === 'aire';
    let haciaJ = H.set(-pos.x, 0, -pos.z), dist = 600;
    if (hayObj) { haciaJ.copy(jp.centro || jp.pos).sub(pos); dist = haciaJ.length(); }
    haciaJ.divideScalar(Math.max(haciaJ.length(), 1e-3));
    const sig = (hayObj && jp.sigilo) || 1;
    const jfwd = hayObj && jp.fwd && objAire ? jp.fwd : null;
    const miraAMi = jfwd ? jfwd.dot(V2.copy(haciaJ).negate()) : 0;
    // punto de tiro con adelanto
    const jvel = hayObj && jp.vel ? jp.vel : V4.set(0, 0, 0);
    const deseo = D.copy(hayObj ? (jp.centro || jp.pos) : pos).addScaledVector(jvel, Math.min(dist / 650, 1.2) * 0.8).sub(pos);
    if (!hayObj) {
      if (this.ruta && Math.hypot(this.ruta.x - pos.x, this.ruta.z - pos.z) > 120) deseo.set(this.ruta.x - pos.x, (this.ruta.y || 250) - pos.y, this.ruta.z - pos.z).multiplyScalar(0.01);
      else deseo.set(-pos.z * 0.5 - pos.x * 0.15, 0, pos.x * 0.5 - pos.z * 0.15); // patrulla en círculo
    }
    deseo.normalize();
    const lado = L.set(-fwd.z, 0, fwd.x).normalize();
    const N = this.N;
    // misil enemigo encima: bengalas y viraje de escape
    const mc = proyectiles.misilContra(this);
    if (mc >= 0 && mc < 500 && this.nivel >= 2 && this.bengalasN > 0 && this.cdBengala <= 0 && Math.random() < dt * 1.5 * N.evade) {
      this.cdBengala = 1.2; this.bengalasN--;
      proyectiles.bengala(this, 2);
    }
    if (mc >= 0 && mc < 450 && this.romper <= 0 && Math.random() < dt * 2 * N.evade) { this.romper = 1.6; this.signo = Math.random() < 0.5 ? 1 : -1; }

    if (this.romper <= 0 && ((miraAMi > 0.94 && dist < 500 * sig && Math.random() < dt * 1.3 * N.evade) || (objAire && dist < 110 && fwd.dot(haciaJ) > 0.2))) {
      this.romper = 1.5 + Math.random();
      this.signo = Math.random() < 0.5 ? 1 : -1;
    }
    if (this.romper > 0) {
      this.romper -= dt;
      deseo.copy(fwd).multiplyScalar(0.3).addScaledVector(lado, this.signo * 0.95);
      deseo.y = (this.romper > 0.8 ? -0.25 : 0.3) + Math.sin(this.romper * 7) * 0.2;
    }
    for (const a of aliados) {
      if (a === this || !a.vivo) continue;
      const d = a.pos.distanceTo(pos);
      if (d < 80) deseo.addScaledVector(V2.copy(pos).sub(a.pos), 0.9 / Math.max(d, 1));
    }
    // evitar el suelo (los que atacan a tierra se acercan más)
    const margen = hayObj && !objAire && this.romper <= 0 ? 0.55 : 1;
    const adelante = Math.max(terreno.techo(pos.x + fwd.x * 260, pos.z + fwd.z * 260), terreno.techo(pos.x + fwd.x * 130, pos.z + fwd.z * 130), terreno.techo(pos.x, pos.z), 0);
    if (pos.y + fwd.y * 260 < adelante + 60 * margen || pos.y < adelante + 45 * margen) deseo.set(fwd.x * 0.4, 1, fwd.z * 0.4);
    if (pos.y > 650) deseo.y = Math.min(deseo.y, -0.3);
    if (Math.hypot(pos.x, pos.z) > 1050) {
      deseo.x += -pos.x * 0.002; deseo.z += -pos.z * 0.002;
    }
    deseo.y = clamp(deseo.y, -0.7, 0.7);
    deseo.normalize();

    // girar hacia el deseo con límite de giro
    const crucey = fwd.z * deseo.x - fwd.x * deseo.z;
    const ang = Math.acos(clamp(fwd.dot(deseo), -1, 1));
    const paso = Math.min(ang, this.giro * dt);
    if (ang > 1e-3) {
      V2.crossVectors(fwd, deseo).normalize();
      fwd.applyAxisAngle(V2, paso);
    }
    const objBank = clamp(Math.sign(crucey) * (paso / Math.max(dt, 1e-3)) * 0.9, -1.2, 1.2);
    this.bank += (objBank - this.bank) * Math.min(1, 4 * dt);
    this._orientar();

    this.velocidad += ((this.base * (dist < 250 && objAire ? 0.85 : 1)) - this.velocidad) * dt;
    this.vel.copy(fwd).multiplyScalar(this.velocidad);
    pos.addScaledVector(this.vel, dt);
    if (pos.y < Math.max(terreno.altura(pos.x, pos.z), 0) + 2 || terreno.colision(pos.x, pos.y, pos.z, 1)) { this.morir(); return; }

    // disparos
    this.cdRafaga -= dt;
    this.cdBala -= dt;
    this.cdMisil -= dt;
    this.cdBomba -= dt;
    this.cdBengala -= dt;
    const alineado = hayObj ? fwd.dot(haciaJ) : 0;
    if (this.rafaga <= 0 && this.cdRafaga <= 0 && dist < 560 * sig && alineado > 0.985 && hayObj) {
      this.rafaga = 0.6 + Math.random() * 0.5;
      this.cdRafaga = (2.2 + Math.random() * 2) * N.rafaga;
    }
    if (this.rafaga > 0) {
      this.rafaga -= dt;
      if (this.cdBala <= 0) {
        this.cdBala = this.cdTiro;
        V2.copy(fwd).lerp(deseo, 0.5);
        V2.x += (Math.random() - 0.5) * this.dispersion * 2;
        V2.y += (Math.random() - 0.5) * this.dispersion * 2;
        V2.z += (Math.random() - 0.5) * this.dispersion * 2;
        V2.normalize();
        V3.copy(fwd).multiplyScalar(2).add(pos);
        proyectiles.disparar('bala', this.equipo, V3, V2, this.vel, { dano: this.danoBala, dueno: this });
        Sonido.disparo('ametralladora', Sonido.porDistancia(this.ctx.efectos._distancia(pos)) * 0.6);
      }
    }
    if (objAire && this.misilesN > 0 && this.oleada >= this.V.misil && this.cdMisil <= 0 && dist > 450 && dist < 1300 * sig && alineado > 0.96 && hayObj) {
      this.cdMisil = 11 + Math.random() * 6;
      if (this.misilesN < 99) this.misilesN--;
      proyectiles.disparar('misil', this.equipo, pos, fwd, this.vel, { vel: 40, objetivo: jp, giro: 1.25 + this.nivel * 0.1, dano: 34, vida: 8, dueno: this });
      Sonido.disparo('misil', Sonido.porDistancia(dist));
    }
    // bombardeo y cohetes contra blancos de tierra
    if (hayObj && !objAire && this.ataca && this.cdBomba <= 0) {
      const dx = jp.pos.x - pos.x, dz = jp.pos.z - pos.z;
      if (this.bombasN > 0 && Math.hypot(dx, dz) < 70 && pos.y - jp.pos.y < 420 && pos.y - jp.pos.y > 25) {
        this.bombasN--;
        this.cdBomba = 1.4;
        V3.copy(pos); V3.y -= 1.5;
        proyectiles.disparar(this.bombaTipo, this.equipo, V3, fwd, this.vel, { vel: 0.01, dueno: this });
      } else if (this.def && this.def.sec.tipo === 'cohete' && alineado > 0.97 && dist < 650 && dist > 160) {
        this.cdBomba = 0.5;
        proyectiles.disparar('cohete', this.equipo, pos, fwd, this.vel, { dano: 34, dueno: this });
        Sonido.disparo('misil', Sonido.porDistancia(dist) * 0.6);
      }
    }
    const ud = this.grupo.userData;
    if (ud.llama && ud.llama.scale) ud.llama.scale.set(1, 1, 0.9);
    if (ud.helice) ud.helice.rotation.z += 40 * dt;
    if (ud.helices) for (const h of ud.helices) h.rotation.z += 40 * dt;
    if (ud.rotor) ud.rotor.rotation.y += 60 * dt;
    this._humoDanio(dt);
    this._quemar(dt);
  }

  recibirDanio(d, punto, proj) {
    if (!this.vivo) return;
    this.romper = Math.max(this.romper, 0.8);
    super.recibirDanio(d, punto, proj);
  }
}
