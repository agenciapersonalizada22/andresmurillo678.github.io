// =============================================================
//  🎥  CÁMARA ORBITAL
//  Gira alrededor del tablero con límites (no pasa por debajo de la
//  mesa ni se aleja demasiado). Se mueve con suavidad hacia sus
//  objetivos, y tiene tres vistas: blancas, negras y cenital.
// =============================================================
import * as THREE from '../lib/three.module.min.js';

const GRAD = Math.PI / 180;
export const VISTAS = {
  blancas: { yaw: 0, pitch: 56 * GRAD },
  negras: { yaw: Math.PI, pitch: 56 * GRAD },
  cenital: { yaw: null, pitch: 88 * GRAD },
};

export class Camara {
  constructor(camara) {
    this.cam = camara;
    this.vista = 'blancas';
    this.baseYaw = 0;
    this.yaw = 0; this.pitch = VISTAS.blancas.pitch; this.zoom = 1;
    this.tYaw = 0; this.tPitch = this.pitch; this.tZoom = 1;
    this.centro = new THREE.Vector3(0, 0.25, 0);
    this.aspecto = 1;
    this.fov = 34;
    this.dBase = 14;
    this.pitchVista = VISTAS.blancas.pitch;
    this.ajustar(1);
  }

  ajustar(aspecto) {
    this.aspecto = aspecto;
    this.cam.aspect = aspecto;
    // en pantallas estrechas se abre un poco el campo para que el tablero entre completo
    this.cam.fov = aspecto < 0.8 ? this.fov * (1 + (0.8 - aspecto) * 0.35) : this.fov;
    this.cam.updateProjectionMatrix();
    this.dBase = this._distancia(this.pitchVista);
  }

  // Distancia mínima para que el tablero (con su marco y las piezas altas) entre completo en pantalla
  _distancia(pitch) {
    const c = new THREE.PerspectiveCamera(this.cam.fov, this.aspecto, 0.5, 200);
    const esquinas = [];
    for (const x of [-4.8, 4.8]) for (const z of [-4.8, 4.8]) for (const y of [-0.2, 1.9]) esquinas.push(new THREE.Vector3(x, y, z));
    const v = new THREE.Vector3();
    for (let d = 6; d < 60; d += 0.25) {
      c.position.set(0, this.centro.y + d * Math.sin(pitch), d * Math.cos(pitch));
      c.lookAt(this.centro);
      c.updateMatrixWorld(); c.updateProjectionMatrix();
      let ok = true;
      for (const e of esquinas) {
        v.copy(e).project(c);
        if (Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.93 || v.z > 1) { ok = false; break; }
      }
      if (ok) return d;
    }
    return 30;
  }

  ir(nombre, inmediato = false) {
    const v = VISTAS[nombre];
    if (!v) return;
    this.vista = nombre;
    if (v.yaw !== null) this.baseYaw = v.yaw;
    this.tYaw = v.yaw !== null ? v.yaw : this._cercano(this.tYaw);
    this.tPitch = v.pitch;
    this.tZoom = 1;
    this.pitchVista = v.pitch;
    this.dBase = this._distancia(v.pitch);
    if (inmediato) { this.yaw = this.tYaw; this.pitch = this.tPitch; this.zoom = this.tZoom; }
  }

  _cercano(y) { // lleva el yaw a 0 o PI, el más cercano (para volver de cenital)
    const m = Math.round(y / Math.PI) * Math.PI;
    return m;
  }

  girar(dx, dy) {
    this.tYaw -= dx * 0.0085;
    this.tPitch += dy * 0.0065;
    this._limitar();
  }

  acercar(factor) {
    this.tZoom = Math.min(1.5, Math.max(0.45, this.tZoom * factor));
  }

  _limitar() {
    this.tPitch = Math.min(88 * GRAD, Math.max(16 * GRAD, this.tPitch));
    if (this.vista !== 'cenital') {
      this.tYaw = Math.min(this.baseYaw + 1.35, Math.max(this.baseYaw - 1.35, this.tYaw));
    }
    // en cenital no se baja demasiado
  }

  // devuelve true si la cámara se movió
  actualizar(dt) {
    if (this.libre) { // solo para depuración (?debug)
      this.cam.position.set(...this.libre.pos); this.cam.up.set(0, 1, 0); this.cam.lookAt(...this.libre.mira); this.cam.updateMatrixWorld();
      return false;
    }
    const k = 1 - Math.exp(-dt * 9);
    const dy = this.tYaw - this.yaw, dp = this.tPitch - this.pitch, dz = this.tZoom - this.zoom;
    const mueve = Math.abs(dy) > 1e-4 || Math.abs(dp) > 1e-4 || Math.abs(dz) > 1e-4;
    if (mueve) {
      this.yaw += dy * k; this.pitch += dp * k; this.zoom += dz * k;
    }
    const d = this.dBase * this.zoom;
    const cp = Math.cos(this.pitch);
    this.cam.position.set(
      this.centro.x + d * cp * Math.sin(this.yaw),
      this.centro.y + d * Math.sin(this.pitch),
      this.centro.z + d * cp * Math.cos(this.yaw),
    );
    this.cam.up.set(0, 1, 0);
    this.cam.lookAt(this.centro);
    this.cam.updateMatrixWorld();
    return mueve;
  }
}
