// Cámaras: persecución, cabina, seguimiento de misil o bomba, kill-cam y la del tanque (con mira de francotirador).
import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';

const DIST = [1, 1.7, 0.55];
const V = new THREE.Vector3(), W = new THREE.Vector3();
const QL = new THREE.Quaternion(), QA = new THREE.Quaternion(), EXV = new THREE.Vector3(1, 0, 0), EYV = new THREE.Vector3(0, 1, 0);
export const NOMBRES_CAM = ['PERSECUCIÓN', 'PERSECUCIÓN LEJOS', 'PERSECUCIÓN CERCA', 'CABINA'];
export const NOMBRES_CAM_TANQUE = ['NORMAL', 'LEJOS', 'CERCA', 'MIRA DEL CAÑÓN'];

export class Camaras {
  constructor(ctx) {
    this.ctx = ctx;
    this.camPos = new THREE.Vector3();
    this.camQ = new THREE.Quaternion();
    this.mirar = { y: 0, p: 0 };
    this.especial = null; // { tipo: 'arma', p, t } | { tipo: 'kill', quien, a, t }
    this.camRef = 80;
  }

  reiniciar() {
    this.especial = null;
    this.mirar.y = this.mirar.p = 0;
  }

  // Cámara de arma: sigue al último misil, cohete o bomba lanzado
  alternarArma(j) {
    if (this.especial && this.especial.tipo === 'arma') { this.especial = null; return; }
    const p = this.ctx.proyectiles.ultimoDe(j);
    if (p) this.especial = { tipo: 'arma', p, t: 9 };
  }

  armaAuto(j) {
    const p = this.ctx.proyectiles.ultimoDe(j);
    if (p && this.ctx.ajustes.controles.camAuto) this.especial = { tipo: 'arma', p, t: 9 };
  }

  kill(quien, aqui) {
    this.especial = { tipo: 'kill', quien, a: Math.random() * 6, t: 99, aqui: aqui ? aqui.clone() : null };
  }

  get activaEspecial() { return !!this.especial; }

  // ---- Avión / helicóptero
  avion(j, def, dt, reiniciar) {
    const { camera, terreno, efectos, entrada } = this.ctx;
    if (this.especial && this._especial(dt, j)) return;
    const cam = def.cam;
    const cv = this.ctx.camVar | 0;
    const cabina = cv === 3 && j.vivo;
    j.grupo.visible = j.vivo && !cabina;
    document.body.classList.toggle('cabina', cabina);
    if (!j.vivo && !reiniciar) { camera.lookAt(j.pos); return; }
    const dist = DIST[cv] || 1;
    if (reiniciar) { this.camQ.copy(j.q); this.camPos.copy(j.pos).add(V.set(0, (cam.h - 0.2) * dist, cam.d * dist).applyQuaternion(j.q)); this.camRef = def.vel.min + def.vel.rango * 0.4; }
    // stick derecho: mirar alrededor; al soltarlo la cámara se recentra suave
    const sd = entrada.mDer, libre = Math.abs(sd.x) + Math.abs(sd.y) > 0.01;
    const kk = 1 - Math.exp(-(libre ? 9 : 4) * dt);
    this.mirar.y += (-sd.x * 2.4 - this.mirar.y) * kk;
    this.mirar.p += (-sd.y * 1.0 - this.mirar.p) * kk;
    let fovObj = CONFIG.vista.fov;
    if (cabina) {
      QL.copy(j.q).multiply(QA.setFromAxisAngle(EYV, this.mirar.y)).multiply(QA.setFromAxisAngle(EXV, this.mirar.p));
      const e = j.grupo.scale.x || 1;
      camera.position.copy(j.pos).add(V.set(0, 0.8 * e, -1.5 * e).applyQuaternion(j.q));
      camera.quaternion.copy(QL);
      this.camQ.copy(j.q);
      this.camPos.copy(camera.position);
      fovObj = 78;
    } else {
      this.camQ.slerp(j.q, 1 - Math.exp(-5.5 * dt));
      QL.copy(this.camQ).multiply(QA.setFromAxisAngle(EYV, this.mirar.y)).multiply(QA.setFromAxisAngle(EXV, this.mirar.p));
      const objetivo = V.set(0, cam.h * dist, cam.d * dist + (j.velocidad - this.camRef) * 0.04).applyQuaternion(QL).add(j.pos);
      this.camPos.lerp(objetivo, 1 - Math.exp(-14 * dt));
      camera.position.copy(this.camPos);
      camera.position.y = Math.max(camera.position.y, terreno.altura(camera.position.x, camera.position.z) + 2.5);
      camera.quaternion.copy(QL);
      camera.rotateX(-0.05);
      fovObj = CONFIG.vista.fov + (this.ctx.reducirEfectos ? 0 : Math.max(0, j.velocidad - this.camRef) * (18 / Math.max(1, def.vel.rango)));
    }
    this._fov(fovObj, dt);
    efectos.camara = camera.position;
  }

  _fov(obj, dt) {
    const { camera } = this.ctx;
    if (Math.abs(camera.fov - obj) > 0.05) { camera.fov += (obj - camera.fov) * Math.min(1, 4 * dt); camera.updateProjectionMatrix(); }
  }

  // Devuelve true si la cámara especial se encargó este cuadro
  _especial(dt, j) {
    const e = this.especial, { camera, efectos } = this.ctx;
    document.body.classList.remove('cabina');
    j.grupo.visible = j.vivo;
    if (e.tipo === 'arma') {
      e.t -= dt;
      if (!e.p.activo || e.t <= 0) { this.especial = null; return false; }
      W.copy(e.p.vel).normalize();
      V.copy(e.p.pos).addScaledVector(W, -9).add(W.set(0, 2.2, 0));
      camera.position.lerp(V, 1 - Math.exp(-12 * dt));
      camera.lookAt(e.p.pos);
      this._fov(60, dt);
      efectos.camara = camera.position;
      return true;
    }
    // kill-cam: rodea a quien te derribó (o al lugar donde caíste)
    e.a += dt * 0.5;
    const q = e.quien && e.quien.vivo ? e.quien.pos : (e.aqui || j.pos);
    V.set(Math.cos(e.a) * 55, 18, Math.sin(e.a) * 55).add(q);
    camera.position.lerp(V, 1 - Math.exp(-3 * dt));
    camera.position.y = Math.max(camera.position.y, this.ctx.terreno.altura(camera.position.x, camera.position.z) + 3);
    camera.lookAt(q);
    this._fov(CONFIG.vista.fov, dt);
    efectos.camara = camera.position;
    return true;
  }

  // ---- Tanque
  tanque(j) {
    const { camera, terreno, efectos } = this.ctx;
    document.body.classList.remove('cabina');
    if (this.especial && this.especial.tipo === 'kill') {
      this._especial(1 / 60, j);
      return;
    }
    const cv = this.ctx.camVar | 0;
    const c = Math.cos(j.elev);
    V.set(-Math.sin(j.torretaYaw) * c, Math.sin(j.elev), -Math.cos(j.torretaYaw) * c);
    const e = j.datos.escala;
    const P = W.copy(j.pos);
    P.y += 2.9 * e;
    if (cv === 3) {
      // mira del cañón: cámara pegada a la torreta con zoom
      camera.position.copy(P).addScaledVector(V, 1.2);
      camera.position.y += 0.4;
      camera.lookAt(P.addScaledVector(V, 80));
      this._fov(26, 1 / 20);
    } else {
      camera.position.copy(P).addScaledVector(V, -13 * ([1, 1.6, 0.6][cv] || 1));
      camera.position.y += 1.8;
      camera.position.y = Math.max(camera.position.y, terreno.altura(camera.position.x, camera.position.z) + 1.5);
      camera.lookAt(P.addScaledVector(V, 60));
      this._fov(CONFIG.vista.fov, 1 / 20);
    }
    document.body.classList.toggle('mira', cv === 3);
    j.grupo.visible = cv !== 3 || !j.vivo;
    efectos.camara = camera.position;
  }
}
