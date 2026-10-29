// =============================================================
//  MODO TANQUE: tu tanque contra oleadas de tanques enemigos.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';
import { Tanque } from './tanque.js';
import { Sonido } from './sonido.js';
import { Musica } from './musica.js';

const DIR = new THREE.Vector3(), ORG = new THREE.Vector3(), PTO = new THREE.Vector3(), BOC = new THREE.Vector3(), OC = new THREE.Vector3(), P = new THREE.Vector3();

export class ModoTanque {
  constructor(ctx) {
    this.ctx = ctx;
    this.nombre = 'tanque';
  }

  iniciar() {
    const c = this.ctx;
    this.jugador = new Tanque(c, 'jugador');
    const zo = c.terreno.zonaTanque();
    const sp = zo.spawn || [128, 165];
    const p = c.terreno.puntoLibre(zo, sp[0], sp[1], 9);
    this.jugador.colocar(p.x, p.z, Math.random() * 6.28);
    this.jugador.alMorir = () => { this.tFin = 2.6; c.hud.aviso('TANQUE DESTRUIDO', 2.6, true); };
    this.enemigos = [];
    this.blancos = [this.jugador];
    this.marcas = [];
    this.radarLista = [];
    this.cmd = { av: 0, gi: 0 };
    this.puntaje = 0;
    this.oleada = 0;
    this.resultado = null;
    this.tFin = 0;
    this.tSig = 0;
    this.esperando = false;
    this.victoria = false;
    c.proyectiles.blancos = () => this.blancos;
    c.hud.modo('tanque');
    Sonido.motor.iniciar('tanque');
    this._camara();
    this.siguienteOleada();
  }

  siguienteOleada() {
    const c = this.ctx;
    this.oleada++;
    this.esperando = false;
    for (const e of this.enemigos) e.quitar();
    this.enemigos.length = 0;
    const n = Math.min(1 + this.oleada, 6);
    const j = this.jugador;
    j.vida = Math.min(j.vidaMax, j.vida + j.vidaMax * 0.35);
    j.modulos.orugas = j.modulos.torreta = j.modulos.motor = 0;
    for (let i = 0; i < n; i++) {
      const tipo = this._tipoEnemigo();
      const e = new Tanque(c, tipo, this.oleada);
      const p = c.terreno.puntoLibre(j.pos, 260, 480, 9);
      e.colocar(p.x, p.z, Math.atan2(-(j.pos.x - p.x), -(j.pos.z - p.z)));
      e.alMorir = (m) => { this.puntaje += m.puntos; c.hud.aviso('+' + m.puntos, 1.2); };
      this.enemigos.push(e);
    }
    c.hud.aviso('OLEADA ' + this.oleada, 2.6);
  }

  // Mezcla de tanques según el mapa; los pesados llegan con las oleadas
  _tipoEnemigo() {
    const w = this.ctx.mapa.tanques;
    const pes = w.pesado * Math.min(1, Math.max(0, (this.oleada - 1) / 2));
    let r = Math.random() * (w.ligero + w.medio + pes);
    if ((r -= pes) < 0) return 'pesado';
    return r < w.medio ? 'medio' : 'ligero';
  }

  actualizar(dt) {
    const c = this.ctx, j = this.jugador, ent = c.entrada;
    this.blancos.length = 0;
    this.blancos.push(j);
    let vivos = 0;
    for (const e of this.enemigos) if (e.vivo) { this.blancos.push(e); vivos++; }

    if (j.vivo) {
      const fw = (ent.k('KeyW') ? 1 : 0) - (ent.k('KeyS') ? 1 : 0) - ent.izq.y - ent.mIzq.y;
      const gi = (ent.k('KeyA') ? 1 : 0) - (ent.k('KeyD') ? 1 : 0) - ent.izq.x - ent.mIzq.x;
      this.cmd.av = Math.max(-1, Math.min(1, fw));
      this.cmd.gi = Math.max(-1, Math.min(1, gi));
      j.actualizar(dt, this.cmd);
      const r = ent.consumirRaton();
      const sens = 0.0024;
      const dYaw = -r.dx * sens + ((ent.k('ArrowLeft') ? 1 : 0) - (ent.k('ArrowRight') ? 1 : 0) - ent.der.x - ent.mDer.x) * 1.9 * dt;
      const dEl = -r.dy * sens + ((ent.k('ArrowUp') ? 1 : 0) - (ent.k('ArrowDown') ? 1 : 0) - ent.der.y - (this.ctx.opciones.invertido ? -ent.mDer.y : ent.mDer.y)) * 1.2 * dt;
      j.rotarTorreta(dYaw, dEl, dt);
      if (ent.k('PadX')) j.apuntarA(j.rumbo, 0.08, dt); // X: torreta al frente del casco
      this._camara();
      if (ent.k('Space', 'Mouse0', 'PadRT') && j.cdRecarga <= 0) this._disparar();
    }
    for (const e of this.enemigos) e.pensar(dt, j);
    this._separar();
    c.proyectiles.actualizar(dt);

    if (j.vivo && !this.esperando && vivos === 0) {
      this.esperando = true;
      const bonus = 200 * this.oleada;
      this.puntaje += bonus;
      if (this.oleada >= CONFIG.oleadas) { this.victoria = true; this.tSig = 3; c.hud.aviso('¡VICTORIA!  +' + bonus, 3); }
      else { this.tSig = 4.5; c.hud.aviso('OLEADA SUPERADA  +' + bonus + '  · REPARANDO', 3.5); }
    }
    if (this.esperando) {
      this.tSig -= dt;
      if (this.tSig <= 0) {
        if (this.victoria) this.resultado = { victoria: true, puntaje: this.puntaje, oleada: this.oleada };
        else this.siguienteOleada();
      }
    }
    if (this.tFin > 0) {
      this.tFin -= dt;
      if (this.tFin <= 0) this.resultado = { victoria: false, puntaje: this.puntaje, oleada: this.oleada };
    }
    this._hud(dt, vivos);
  }

  // Los tanques no se atraviesan
  _separar() {
    const todos = this.blancos;
    for (let i = 0; i < todos.length; i++) for (let k = i + 1; k < todos.length; k++) {
      const a = todos[i], b = todos[k];
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), min = 7;
      if (d < min && d > 0.01) {
        const f = (min - d) / 2 / d;
        a.pos.x -= dx * f; a.pos.z -= dz * f;
        b.pos.x += dx * f; b.pos.z += dz * f;
      }
    }
  }

  _camara() {
    const { camera, terreno, efectos } = this.ctx;
    const j = this.jugador;
    const c = Math.cos(j.elev);
    DIR.set(-Math.sin(j.torretaYaw) * c, Math.sin(j.elev), -Math.cos(j.torretaYaw) * c);
    const e = j.datos.escala;
    P.copy(j.pos);
    P.y += 2.9 * e;
    camera.position.copy(P).addScaledVector(DIR, -13 * ([1, 1.6, 0.6][this.ctx.camVar | 0] || 1)).add(ORG.set(0, 1.8, 0));
    camera.position.y = Math.max(camera.position.y, terreno.altura(camera.position.x, camera.position.z) + 1.5);
    camera.lookAt(P.addScaledVector(DIR, 60));
    efectos.camara = camera.position;
  }

  // Dispara hacia donde apunta la mira: primer suelo, edificio o enemigo en el rayo
  _disparar() {
    const { camera, terreno } = this.ctx;
    const j = this.jugador;
    camera.getWorldDirection(DIR);
    ORG.copy(camera.position);
    let dist = 520;
    for (let d = 16; d < 520; d += 6) {
      PTO.copy(ORG).addScaledVector(DIR, d);
      if (PTO.y < terreno.altura(PTO.x, PTO.z) || terreno.colision(PTO.x, PTO.y, PTO.z)) { dist = d; break; }
    }
    for (const e of this.enemigos) {
      if (!e.vivo) continue;
      OC.copy(e.centro).sub(ORG);
      const tca = OC.dot(DIR);
      if (tca <= 0) continue;
      const d2 = OC.lengthSq() - tca * tca;
      if (d2 < e.radio * e.radio) dist = Math.min(dist, tca - Math.sqrt(e.radio * e.radio - d2));
    }
    j.grupo.updateMatrixWorld(true);
    j.boca.getWorldPosition(BOC);
    PTO.copy(ORG).addScaledVector(DIR, dist);
    DIR.copy(PTO).sub(BOC);
    if (dist < 25 || DIR.lengthSq() < 1) j.dirTorreta(DIR);
    DIR.normalize();
    j.disparar(DIR);
  }

  _hud(dt, vivos) {
    const c = this.ctx, j = this.jugador, hud = c.hud;
    hud.datos({
      puntaje: this.puntaje, oleada: this.oleada, enemigos: vivos, vida: j.vida, vidaMax: j.vidaMax,
      estado: `RUMBO ${Math.round((((-j.torretaYaw * 180 / Math.PI) % 360) + 360) % 360)}° · CAÑÓN ${j.cdRecarga <= 0 ? 'LISTO' : 'RECARGANDO'}`,
      recarga: j.recargaFrac, modulos: j.modulos,
    });
    const lista = this.marcas, radar = this.radarLista;
    lista.length = 0;
    radar.length = 0;
    let cerca = false;
    for (const e of this.enemigos) {
      if (!e.vivo) continue;
      lista.push({ pos: e.centro, clase: 'tanque', apuntado: false, fijado: false });
      radar.push({ x: e.pos.x, z: e.pos.z, clase: 'tanque' });
      if (e.pos.distanceTo(j.pos) < 300) cerca = true;
    }
    hud.marcadoresEnemigos(c.camera, lista, c.ancho, c.alto);
    hud.radar(dt, { alcance: 450, rumbo: j.torretaYaw, x: j.pos.x, z: j.pos.z, mapa: c.terreno.minimapa, entidades: radar });
    Musica.intensidad(j.vivo ? (cerca ? 0.8 : 0.35) : 0.1);
    Sonido.motor.ajustar(j.vivo ? Math.min(1, Math.abs(j.v) / 12 + 0.15) : 0);
  }

  destruir() {
    const c = this.ctx;
    this.jugador.quitar();
    for (const e of this.enemigos) e.quitar();
    c.proyectiles.limpiar();
    c.proyectiles.blancos = () => [];
    c.efectos.limpiar();
    Sonido.motor.parar();
  }
}
