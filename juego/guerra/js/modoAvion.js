// =============================================================
//  MODO AVIÓN: oleadas de cazas enemigos y objetivos en tierra.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG, AVIONES, ENEMIGOS_AIRE } from './config.js';
import { AvionJugador, AvionEnemigo } from './avion.js';
import { ObjetivoTierra } from './objetivos.js';
import { Sonido } from './sonido.js';
import { Musica } from './musica.js';

const V = new THREE.Vector3();
const QL = new THREE.Quaternion(), QA = new THREE.Quaternion(), EXV = new THREE.Vector3(1, 0, 0), EYV = new THREE.Vector3(0, 1, 0);

export class ModoAvion {
  constructor(ctx) {
    this.ctx = ctx;
    this.nombre = 'avion';
  }

  iniciar() {
    const c = this.ctx;
    this.def = AVIONES[c.avionId] || AVIONES[CONFIG.predeterminado.avion];
    this.jugador = new AvionJugador(c, this.def);
    this.jugador.invertido = c.opciones.invertido === true;
    this.jugador.alMorir = () => { this.tFin = 2.4; c.hud.aviso('AVIÓN DESTRUIDO', 2.4, true); };
    this.aire = [];
    this.tierra = [];
    this.blancos = [this.jugador];
    this.marcas = [];
    this.radarLista = [];
    this.puntaje = 0;
    this.oleada = 0;
    this.resultado = null;
    this.tFin = 0;
    this.tSig = 0;
    this.esperando = false;
    this.victoria = false;
    this.camPos = new THREE.Vector3(0, 175, 275);
    this.camRef = this.def.vel.min + this.def.vel.rango * 0.4;
    this.camQ = new THREE.Quaternion();
    this.mirar = { y: 0, p: 0 };
    c.proyectiles.blancos = () => this.blancos;
    c.hud.modo('avion', this.def);
    Sonido.motor.iniciar('avion');
    this._camara(1, true);
    this.siguienteOleada();
  }

  siguienteOleada() {
    const c = this.ctx;
    this.oleada++;
    this.esperando = false;
    for (const e of this.aire) e.quitar();
    for (const e of this.tierra) e.quitar();
    this.aire.length = 0;
    this.tierra.length = 0;
    const nAire = Math.min(2 + this.oleada, 8);
    const nTierra = Math.min(3 + this.oleada, 9);
    const jp = this.jugador.pos;
    for (let i = 0; i < nAire; i++) {
      const a = Math.random() * Math.PI * 2, r = 750 + Math.random() * 400;
      let x = jp.x + Math.cos(a) * r, z = jp.z + Math.sin(a) * r;
      const d = Math.hypot(x, z);
      if (d > 1000) { x *= 1000 / d; z *= 1000 / d; }
      const e = new AvionEnemigo(c, this.oleada, this._variante());
      e.colocar(x, Math.max(200 + Math.random() * 160, c.terreno.techo(x, z) + 90), z, jp);
      e.alMorir = (m) => this._muerte(m);
      this.aire.push(e);
    }
    const zonas = c.terreno.zonas.filter((z) => z.tipo !== 'pista');
    const nAA = Math.min(1 + this.oleada, 5);
    const otros = c.mapa.objetivos;
    for (let i = 0; i < nTierra; i++) {
      const zo = zonas[Math.floor(Math.random() * zonas.length)];
      let tipo = i < nAA ? 'antiaerea' : otros[Math.floor(Math.random() * otros.length)];
      let p = null;
      if (tipo === 'barco') p = c.terreno.puntoMar(zo, 60, 380);
      if (!p) { if (tipo === 'barco') tipo = 'camion'; p = c.terreno.puntoLibre(zo, 8, zo.r * 0.8, 6); }
      const e = new ObjetivoTierra(c, tipo, p.x, p.z, this.oleada);
      e.alMorir = (m) => this._muerte(m);
      this.tierra.push(e);
    }
    this.jugador.reabastecer();
    c.hud.aviso('OLEADA ' + this.oleada, 2.6);
  }

  // Variante de caza enemigo según el mapa y la oleada
  _variante() {
    const w = this.ctx.mapa.aire;
    let tot = 0;
    const ok = [];
    for (const k in w) {
      if (w[k] > 0 && ENEMIGOS_AIRE[k] && ENEMIGOS_AIRE[k].desde <= this.oleada) { ok.push(k); tot += w[k]; }
    }
    let r = Math.random() * tot;
    for (const k of ok) { r -= w[k]; if (r <= 0) return k; }
    return 'caza';
  }

  _muerte(e) {
    this.puntaje += e.puntos;
    this.ctx.hud.aviso('+' + e.puntos, 1.2);
  }

  vivos() {
    let n = 0;
    for (const e of this.aire) if (e.vivo) n++;
    for (const e of this.tierra) if (e.vivo) n++;
    return n;
  }

  actualizar(dt) {
    const c = this.ctx;
    const j = this.jugador;
    this.blancos.length = 0;
    this.blancos.push(j);
    const cand = [];
    for (const e of this.aire) if (e.vivo) { this.blancos.push(e); cand.push(e); }
    for (const e of this.tierra) if (e.vivo) { this.blancos.push(e); cand.push(e); }

    j.actualizar(dt, c.entrada, cand);
    for (const e of this.aire) e.actualizar(dt, j, this.aire);
    for (const e of this.tierra) e.actualizar(dt, j);
    c.proyectiles.actualizar(dt);

    // oleadas
    if (j.vivo && !this.esperando && cand.length === 0) {
      this.esperando = true;
      const bonus = 200 * this.oleada;
      this.puntaje += bonus;
      if (this.oleada >= CONFIG.oleadas) { this.victoria = true; this.tSig = 3; c.hud.aviso('¡MISIÓN CUMPLIDA!  +' + bonus, 3); }
      else { this.tSig = 4.5; c.hud.aviso('OLEADA SUPERADA  +' + bonus, 3.5); }
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

    this._avisos();
    this._camara(dt, false);
    this._hud(dt, cand);
  }

  _avisos() {
    const c = this.ctx, j = this.jugador;
    if (!j.vivo) return;
    const m = c.proyectiles.misilContra(j);
    if (m >= 0) { c.hud.aviso('¡MISIL! ROMPE A UN LADO', 0.4, true); Sonido.alarma(); }
    else if (j.perdida > 0.3) { c.hud.aviso('PÉRDIDA: BAJA EL MORRO', 0.4, true); Sonido.alarma(); }
    else if (j.cercaSuelo && j.pos.y < c.terreno.altura(j.pos.x, j.pos.z) + 40 && j.fwd.y < -0.1) { c.hud.aviso('¡ALTITUD!', 0.4, true); Sonido.alarma(); }
    else if (j.fuera) c.hud.aviso('REGRESA A LA ZONA DE COMBATE', 0.4, true);
  }

  _camara(dt, reiniciar) {
    const { camera, terreno, efectos } = this.ctx;
    const j = this.jugador;
    if (!j.vivo && !reiniciar) {
      camera.lookAt(j.pos);
      return;
    }
    const cam = this.def.cam;
    if (reiniciar) { this.camQ.copy(j.q); this.camPos.copy(j.pos).add(V.set(0, cam.h - 0.2, cam.d).applyQuaternion(j.q)); }
    this.camQ.slerp(j.q, 1 - Math.exp(-5.5 * dt));
    // stick derecho: mirar alrededor del avión; al soltarlo la cámara se recentra suave
    const sd = this.ctx.entrada.mDer, libre = Math.abs(sd.x) + Math.abs(sd.y) > 0.01;
    const kk = 1 - Math.exp(-(libre ? 9 : 4) * dt);
    this.mirar.y += (-sd.x * 2.4 - this.mirar.y) * kk;
    this.mirar.p += (-sd.y * 1.0 - this.mirar.p) * kk;
    QL.copy(this.camQ).multiply(QA.setFromAxisAngle(EYV, this.mirar.y)).multiply(QA.setFromAxisAngle(EXV, this.mirar.p));
    const objetivo = V.set(0, cam.h, cam.d + (j.velocidad - this.camRef) * 0.04).applyQuaternion(QL).add(j.pos);
    this.camPos.lerp(objetivo, 1 - Math.exp(-14 * dt));
    camera.position.copy(this.camPos);
    camera.position.y = Math.max(camera.position.y, terreno.altura(camera.position.x, camera.position.z) + 2.5);
    camera.quaternion.copy(QL);
    camera.rotateX(-0.05);
    const fov = CONFIG.vista.fov + Math.max(0, j.velocidad - this.camRef) * (18 / this.def.vel.rango);
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, 4 * dt); camera.updateProjectionMatrix(); }
    efectos.camara = camera.position;
  }

  _hud(dt, cand) {
    const c = this.ctx, j = this.jugador, hud = c.hud;
    hud.datos({
      puntaje: this.puntaje, oleada: this.oleada, enemigos: cand.length, vida: j.vida, vidaMax: j.vidaMax,
      estado: `VEL ${Math.round(j.velocidad * 3.6)} km/h · ALT ${Math.round(j.pos.y)} m · EMPUJE ${Math.round(j.empuje * 100)}%${this.def.sec.n ? ' · ' + this.def.sec.nombre + ' ' + j.misiles : ''}${this.def.bombas ? ' · BOMBAS ' + j.bombas : ''}`,
    });
    // marcadores y radar
    const lista = this.marcas, radar = this.radarLista;
    lista.length = 0;
    radar.length = 0;
    let cerca = false;
    for (const e of cand) {
      const aire = e.tipo === 'aire';
      lista.push({ pos: e.centro, clase: aire ? 'aire' : 'tierra', apuntado: j.apuntado === e, fijado: j.bloqueado === e });
      radar.push({ x: e.pos.x, z: e.pos.z, clase: aire ? 'aire' : 'tierra' });
      if (aire && e.pos.distanceTo(j.pos) < 800) cerca = true;
    }
    hud.marcadoresEnemigos(c.camera, lista, c.ancho, c.alto);
    hud.indicadores(c.camera, c.ancho, c.alto, j.vivo && j.aimVisible ? j.aim : null, j.vivo ? j.lead : null);
    j.fwd.set(0, 0, -1).applyQuaternion(j.q);
    hud.radar(dt, { alcance: 900, rumbo: Math.atan2(-j.fwd.x, -j.fwd.z), x: j.pos.x, z: j.pos.z, mapa: c.terreno.minimapa, entidades: radar });
    Musica.intensidad(j.vivo ? (cerca ? 0.85 : 0.35) : 0.1);
    Sonido.motor.ajustar(j.vivo ? j.empuje : 0);
  }

  destruir() {
    const c = this.ctx;
    this.jugador.quitar();
    for (const e of this.aire) e.quitar();
    for (const e of this.tierra) e.quitar();
    c.proyectiles.limpiar();
    c.proyectiles.blancos = () => [];
    c.efectos.limpiar();
    c.hud.indicadores(c.camera, c.ancho, c.alto, null, null);
    Sonido.motor.parar();
    c.camera.fov = CONFIG.vista.fov;
    c.camera.updateProjectionMatrix();
  }
}
