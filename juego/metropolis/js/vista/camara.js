// Cámara isométrica ortográfica con paneo, zoom y giro en pasos de 90 grados.
import * as THREE from '../../lib/three.module.min.js';
import { N } from '../sim/mapa.js';

const PITCH = 50 * Math.PI / 180;

export class Camara {
  constructor() {
    this.cam = new THREE.OrthographicCamera(-10, 10, 10, -10, -300, 600);
    this.x = 34; this.z = 34; this.escala = 9; this.escalaObj = 9;
    this.yaw = Math.PI / 4; this.yawObj = this.yaw;
    this.aspecto = 1; this.minE = 3.5; this.maxE = 30;
    this.xObj = this.x; this.zObj = this.z;
    this.aplicar();
  }
  tam(w, h) { this.aspecto = w / h; this.aplicar(); }
  dirDerecha() { return [Math.cos(this.yaw), -Math.sin(this.yaw)]; }
  dirAdelante() { return [-Math.sin(this.yaw), -Math.cos(this.yaw)]; }
  // desplaza el objetivo según píxeles de pantalla
  arrastrar(dx, dy, altoPx) {
    const k = (2 * this.escala) / altoPx, d = this.dirDerecha(), f = this.dirAdelante();
    this.xObj -= d[0] * dx * k; this.zObj -= d[1] * dx * k;
    this.xObj += f[0] * dy * k / Math.sin(PITCH); this.zObj += f[1] * dy * k / Math.sin(PITCH);
    this.limitar(); this.x = this.xObj; this.z = this.zObj;
  }
  mover(vx, vz) { this.xObj += vx; this.zObj += vz; this.limitar(); }
  // vx: derecha, vy: adelante (unidades del mundo)
  moverPantalla(dr, ad) {
    const d = this.dirDerecha(), f = this.dirAdelante();
    this.mover(d[0] * dr + f[0] * ad, d[1] * dr + f[1] * ad);
  }
  limitar() {
    this.xObj = Math.max(2, Math.min(N - 2, this.xObj)); this.zObj = Math.max(2, Math.min(N - 2, this.zObj));
  }
  zoom(factor) { this.escalaObj = Math.max(this.minE, Math.min(this.maxE, this.escalaObj * factor)); }
  fijarZoom(e) { this.escalaObj = this.escala = Math.max(this.minE, Math.min(this.maxE, e)); }
  girar(dir) { this.yawObj += dir * Math.PI / 2; }
  centrar(x, z) { this.xObj = x; this.zObj = z; this.limitar(); }
  actualizar(dt) {
    const k = 1 - Math.exp(-dt * 10);
    this.x += (this.xObj - this.x) * k; this.z += (this.zObj - this.z) * k;
    this.escala += (this.escalaObj - this.escala) * k;
    this.yaw += (this.yawObj - this.yaw) * (1 - Math.exp(-dt * 8));
    this.aplicar();
  }
  aplicar() {
    const c = this.cam, e = this.escala, a = this.aspecto;
    c.left = -e * a; c.right = e * a; c.top = e; c.bottom = -e;
    const D = 120;
    c.position.set(this.x + Math.sin(this.yaw) * Math.cos(PITCH) * D, Math.sin(PITCH) * D, this.z + Math.cos(this.yaw) * Math.cos(PITCH) * D);
    c.lookAt(this.x, 0, this.z);
    c.updateProjectionMatrix(); c.updateMatrixWorld();
  }
}
