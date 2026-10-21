// =============================================================
//  AVIONES: el del jugador (física arcade) y los cazas enemigos (IA).
//  El morro apunta a -Z. Cabeceo = giro sobre X, alabeo = sobre Z.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { crearAvion } from './modelos.js';
import { Sonido } from './sonido.js';
import { CONFIG, ENEMIGOS_AIRE } from './config.js';

const EX = new THREE.Vector3(1, 0, 0), EY = new THREE.Vector3(0, 1, 0), EZ = new THREE.Vector3(0, 0, 1);
const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3(), V4 = new THREE.Vector3();
const H = new THREE.Vector3(), D = new THREE.Vector3(), L = new THREE.Vector3();
const Q1 = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), M1 = new THREE.Matrix4();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

class Avion {
  constructor(ctx, modelo, colores) {
    this.ctx = ctx;
    this.grupo = crearAvion(modelo, colores);
    ctx.escena.add(this.grupo);
    this.pos = this.grupo.position;
    this.q = this.grupo.quaternion;
    this.centro = this.pos;
    this.vel = new THREE.Vector3();
    this.fwd = new THREE.Vector3(0, 0, -1);
    this.radio = 4.2;
    this.vivo = true;
    this.velocidad = 90;
    this.vidaMax = 100;
    this.vida = 100;
    this.humoT = 0;
    this.alMorir = null;
  }

  _humoDanio(dt) {
    const f = this.vida / this.vidaMax;
    if (f > 0.5) return;
    this.humoT -= dt;
    if (this.humoT > 0) return;
    this.humoT = f < 0.25 ? 0.03 : 0.07;
    V1.set(0, 0, 3.5).applyQuaternion(this.q).add(this.pos);
    this.ctx.efectos.estela(V1, false, f < 0.25 ? 1.6 : 1.1);
    if (f < 0.25) this.ctx.efectos.llama(V1, 1);
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

  recibirDanio(d) {
    if (!this.vivo) return;
    this.vida -= d;
    if (this.vida <= 0) this.morir();
  }
}

// ------------------------------------------------------------------ Jugador
export class AvionJugador extends Avion {
  constructor(ctx, def) {
    super(ctx, def.modelo, def.colores);
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
    this.reiniciar();
  }

  reiniciar() {
    const ini = this.ctx.mapa.inicio;
    this.pos.set(ini.x, ini.y, ini.z);
    this.q.identity();
    this.velocidad = 95;
    this.empuje = 0.55;
    this.vida = this.vidaMax;
    this.vivo = true;
    this.grupo.visible = true;
    this.misiles = this.def.sec.n;
    this.bombas = this.def.bombas;
    this.cdArma = 0;
    this.cdMisil = 0;
    this.lado = 1;
    this.apuntado = null;
    this.bloqueado = null;
    this.tBloqueo = 0;
    this.perdida = 0;
    this.fuera = false;
    this.cercaSuelo = false;
    this.w.set(0, 0, 0);
    this.palo.x = this.palo.y = 0;
    this.aim.set(0, 0, -1);
    this.lead = null;
    this.regMisil = 0;
  }

  reabastecer() {
    this.misiles = this.def.sec.n;
    this.bombas = this.def.bombas;
    this.vida = Math.min(this.vidaMax, this.vida + 30);
  }

  actualizar(dt, ent, candidatos) {
    if (!this.vivo) return;
    const { terreno, efectos } = this.ctx;
    const D = this.def, VL = D.vel, GR = D.giro;
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
      if (manual) this.aim.copy(this.fwd);
      else {
        const m = this._ratonApuntar(r, ent, sens);
        cab = m.cab;
        ala = m.ala;
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
    const gui = (ent.k('KeyE', 'PadRB') ? 1 : 0) - (ent.k('KeyQ', 'PadLB') ? 1 : 0);
    if (ent.k('ShiftLeft', 'ShiftRight', 'PadUp')) this.empuje = Math.min(1, this.empuje + 0.5 * dt);
    if (ent.k('ControlLeft', 'ControlRight', 'KeyC', 'PadDown')) this.empuje = Math.max(0, this.empuje - 0.5 * dt);

    // --- velocidad y pérdida de sustentación
    this.fwd.set(0, 0, -1).applyQuaternion(this.q);
    const objetivo = VL.min + this.empuje * VL.rango;
    this.velocidad += (objetivo - this.velocidad) * 0.4 * dt - this.fwd.y * VL.grav * dt;
    this.velocidad = clamp(this.velocidad, VL.perdida - 30, VL.tope);
    this.perdida = clamp((VL.perdida - this.velocidad) / 18, 0, 1);
    const autoridad = 1 - 0.7 * this.perdida;

    // --- giros (suavizados)
    const k = 1 - Math.exp(-GR.resp * dt);
    this.w.x += (cab * GR.cab * autoridad - this.w.x) * k;
    this.w.z += (-ala * GR.ala * autoridad - this.w.z) * k;
    this.w.y += (-gui * GR.gui - this.w.y) * k;
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

    // --- bordes: de vuelta a la zona de combate
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

    // --- armas
    this.cdArma -= dt;
    this.cdMisil -= dt;
    if (D.sec.n > 0 && this.misiles < D.sec.n) {
      this.regMisil += dt;
      if (this.regMisil > D.sec.regen) { this.regMisil = 0; this.misiles++; }
    }
    this._apuntar(dt, candidatos);
    if (ent.k('Space', 'Mouse0', 'PadRT') && this.cdArma <= 0) this._ametrallar();
    if ((this.def.sec.tipo === 'cohete' ? ent.k('KeyF', 'Mouse2', 'PadLT') : ent.pulso('KeyF', 'Mouse2', 'PadLT')) && this.misiles > 0 && this.cdMisil <= 0) this._misil();
    if (ent.pulso('KeyB', 'PadA') && this.bombas > 0) this._bomba();

    // --- aspecto
    this.grupo.userData.llama.scale.set(1, 1, 0.5 + this.empuje * 1.2 + Math.random() * 0.2);
    if (this.grupo.userData.helice) this.grupo.userData.helice.rotation.z += (14 + this.empuje * 40) * dt;
    this._humoDanio(dt);
    if (Math.random() < 0.5 && this.empuje > 0.7) {
      V1.set(0, 0, 5).applyQuaternion(this.q).add(this.pos);
      efectos.llama(V1, 0.5);
    }
  }

  // Mueve el punto de mira (aim) y calcula cuánto girar para ir hacia él
  _ratonApuntar(r, ent, sens) {
    const MAX = 1.25;
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
      const a = Math.acos(clamp(V1.divideScalar(d).dot(this.fwd), -1, 1));
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
    V2.copy(this.fwd);
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
    proyectiles.disparar('bala', 'jugador', V1, V2, this.vel, { dano: A.dano });
    Sonido.disparo('ametralladora', 0.9);
  }

  _misil() {
    const S = this.def.sec;
    this.cdMisil = S.cd;
    this.misiles--;
    V1.set(this.misiles % 2 ? 2.4 : -2.4, -0.5, -0.5).applyQuaternion(this.q).add(this.pos);
    if (S.tipo === 'cohete') {
      V2.copy(this.fwd);
      V2.x += (Math.random() - 0.5) * 0.012;
      V2.y += (Math.random() - 0.5) * 0.012;
      V2.normalize();
      this.ctx.proyectiles.disparar('cohete', 'jugador', V1, V2, this.vel);
      Sonido.disparo('misil', 0.7);
      return;
    }
    this.ctx.proyectiles.disparar('misil', 'jugador', V1, this.fwd, this.vel, { vel: 60, objetivo: this.bloqueado, giro: 2.8 });
    Sonido.disparo('misil', 1);
  }

  _bomba() {
    this.bombas--;
    V1.set(0, -1.1, 0.5).applyQuaternion(this.q).add(this.pos);
    this.ctx.proyectiles.disparar('bomba', 'jugador', V1, this.fwd, this.vel, { vel: 0.01 });
    Sonido.disparo('flak', 0.6);
  }

  recibirDanio(d) {
    if (!this.vivo) return;
    this.ctx.hud.golpe();
    Sonido.impacto(0.9);
    super.recibirDanio(d);
  }
}

// ------------------------------------------------------------------ Enemigo
export class AvionEnemigo extends Avion {
  constructor(ctx, oleada, variante = 'caza') {
    const V = ENEMIGOS_AIRE[variante] || ENEMIGOS_AIRE.caza;
    super(ctx, V.modelo, V.colores);
    this.V = V;
    this.radio = V.radio;
    this.equipo = 'enemigo';
    this.tipo = 'aire';
    this.puntos = Math.round((100 + oleada * 20) * V.puntos);
    this.vidaMax = this.vida = Math.round(Math.min(80, 28 + oleada * 7) * V.vida);
    this.base = Math.min(118, 78 + oleada * 5) * V.vel;
    this.velocidad = this.base;
    this.giro = Math.min(1.35, 0.7 + oleada * 0.1) * V.giro;
    this.oleada = oleada;
    this.bank = 0;
    this.romper = 0;
    this.signo = 1;
    this.rafaga = 0;
    this.cdRafaga = 2 + Math.random() * 2;
    this.cdMisil = 8 + Math.random() * 8;
    this.cdBala = 0;
    this.dispersion = Math.max(0.012, 0.045 - oleada * 0.005) * V.disp;
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

  actualizar(dt, jp, aliados) {
    if (!this.vivo) return;
    const { terreno, proyectiles } = this.ctx;
    const pos = this.pos, fwd = this.fwd;
    const haciaJ = H.copy(jp.pos).sub(pos);
    const dist = haciaJ.length();
    haciaJ.divideScalar(dist || 1);
    const sig = jp.sigilo || 1;
    const miraAMi = jp.fwd.dot(V2.copy(haciaJ).negate());
    // punto de tiro con adelanto
    const deseo = D.copy(jp.pos).addScaledVector(jp.vel, Math.min(dist / 650, 1.2) * 0.8).sub(pos).normalize();
    const lado = L.set(-fwd.z, 0, fwd.x).normalize();

    if (this.romper <= 0 && ((miraAMi > 0.94 && dist < 500 * sig && Math.random() < dt * 1.3) || (dist < 110 && fwd.dot(haciaJ) > 0.2))) {
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
    // evitar el suelo
    const adelante = Math.max(terreno.techo(pos.x + fwd.x * 260, pos.z + fwd.z * 260), terreno.techo(pos.x + fwd.x * 130, pos.z + fwd.z * 130), terreno.techo(pos.x, pos.z), 0);
    if (pos.y + fwd.y * 260 < adelante + 60 || pos.y < adelante + 45) deseo.set(fwd.x * 0.4, 1, fwd.z * 0.4);
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

    this.velocidad += ((this.base * (dist < 250 ? 0.85 : 1)) - this.velocidad) * dt;
    this.vel.copy(fwd).multiplyScalar(this.velocidad);
    pos.addScaledVector(this.vel, dt);
    if (pos.y < Math.max(terreno.altura(pos.x, pos.z), 0) + 2 || terreno.colision(pos.x, pos.y, pos.z, 1)) { this.morir(); return; }

    // disparos
    this.cdRafaga -= dt;
    this.cdBala -= dt;
    this.cdMisil -= dt;
    const alineado = fwd.dot(haciaJ);
    if (this.rafaga <= 0 && this.cdRafaga <= 0 && dist < 560 * sig && alineado > 0.985 && jp.vivo) {
      this.rafaga = 0.6 + Math.random() * 0.5;
      this.cdRafaga = 2.2 + Math.random() * 2;
    }
    if (this.rafaga > 0) {
      this.rafaga -= dt;
      if (this.cdBala <= 0) {
        this.cdBala = 0.09;
        V2.copy(fwd).lerp(deseo, 0.5);
        V2.x += (Math.random() - 0.5) * this.dispersion * 2;
        V2.y += (Math.random() - 0.5) * this.dispersion * 2;
        V2.z += (Math.random() - 0.5) * this.dispersion * 2;
        V2.normalize();
        V3.copy(fwd).multiplyScalar(2).add(pos);
        proyectiles.disparar('bala', 'enemigo', V3, V2, this.vel, { dano: (3 + this.oleada * 0.4) * this.V.dano });
        Sonido.disparo('ametralladora', Sonido.porDistancia(dist) * 0.6);
      }
    }
    if (this.oleada >= this.V.misil && this.cdMisil <= 0 && dist > 450 && dist < 1300 * sig && alineado > 0.96 && jp.vivo) {
      this.cdMisil = 11 + Math.random() * 6;
      proyectiles.disparar('misil', 'enemigo', pos, fwd, this.vel, { vel: 40, objetivo: jp, giro: 1.25, dano: 34, vida: 8 });
      Sonido.disparo('misil', Sonido.porDistancia(dist));
    }
    this.grupo.userData.llama.scale.set(1, 1, 0.9);
    if (this.grupo.userData.helice) this.grupo.userData.helice.rotation.z += 40 * dt;
    this._humoDanio(dt);
  }

  recibirDanio(d) {
    if (!this.vivo) return;
    this.romper = Math.max(this.romper, 0.8);
    super.recibirDanio(d);
  }
}
