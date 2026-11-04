// Miniaturas 3D de aviones y tanques para los menús: se dibujan bajo demanda con el renderer
// principal en un render target y se guardan como imágenes (con la pintura elegida).
import * as THREE from '../lib/three.module.min.js';
import { crearAvion, crearTanque, aplicarMarca } from './modelos.js';
import { AVIONES } from './config.js';
import { TANQUES } from './catalogo.js';

const W = 240, H = 150;

export class Vistas {
  constructor(renderer) {
    this.renderer = renderer;
    this.cache = new Map();
    this.rt = null;
    this.listo = false;
  }

  _preparar() {
    if (this.listo) return !!this.rt;
    this.listo = true;
    try {
      this.rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
      this.esc = new THREE.Scene();
      this.esc.add(new THREE.HemisphereLight(0xdcebff, 0x667788, 2.2));
      const luz = new THREE.DirectionalLight(0xfff0d2, 2.6);
      luz.position.set(-4, 6, -3);
      this.esc.add(luz);
      this.cam = new THREE.PerspectiveCamera(28, W / H, 0.5, 200);
      this.buf = new Uint8Array(W * H * 4);
      this.cv = document.createElement('canvas');
      this.cv.width = W;
      this.cv.height = H;
      this.g = this.cv.getContext('2d');
      this.img = this.g.createImageData(W, H);
    } catch (e) { this.rt = null; }
    return !!this.rt;
  }

  // tipo: 'avion' | 'tanque'; pintura = { camo colores, marca }
  obtener(tipo, id, colores = null, marca = 'ninguna', colorMarca = '#fff') {
    const clave = `${tipo}:${id}:${colores ? colores.join(',') : ''}:${marca}`;
    if (this.cache.has(clave)) return this.cache.get(clave);
    const url = this._dibujar(tipo, id, colores, marca, colorMarca);
    this.cache.set(clave, url);
    return url;
  }

  _dibujar(tipo, id, colores, marca, colorMarca) {
    if (!this._preparar()) return '';
    const r = this.renderer;
    const antes = new THREE.Color();
    r.getClearColor(antes);
    const alfa = r.getClearAlpha();
    const sombras = r.shadowMap.enabled;
    let url = '';
    let m = null;
    try {
      r.shadowMap.enabled = false;
      r.setClearColor(0x000000, 0);
      if (tipo === 'avion') {
        const d = AVIONES[id];
        m = crearAvion(d.modelo, colores || d.colores, d.escala || 1, d.mp || {});
        aplicarMarca(m, marca, colorMarca);
        if (m.userData.llama) m.userData.llama.visible = false;
        m.rotation.y = 0.35;
      } else {
        const t = TANQUES[id];
        const o = crearTanque(colores ? colores[0] : t.color, t.escala, t.variante);
        m = o.grupo;
        aplicarMarca(m, marca, colorMarca, true);
        m.rotation.y = 0.6;
      }
      this.esc.add(m);
      const caja = new THREE.Box3().setFromObject(m);
      const c = caja.getCenter(new THREE.Vector3());
      const tam = caja.getSize(new THREE.Vector3()).length();
      this.cam.position.set(c.x + tam * 0.62, c.y + tam * 0.5, c.z - tam * 0.78);
      this.cam.lookAt(c);
      r.setRenderTarget(this.rt);
      r.clear();
      r.render(this.esc, this.cam);
      r.readRenderTargetPixels(this.rt, 0, 0, W, H, this.buf);
      r.setRenderTarget(null);
      for (let y = 0; y < H; y++) this.img.data.set(this.buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
      this.g.putImageData(this.img, 0, 0);
      url = this.cv.toDataURL('image/png');
    } catch (e) {
      console.warn('vista', e.message);
      r.setRenderTarget(null);
    } finally {
      if (m) this.esc.remove(m);
      r.shadowMap.enabled = sombras;
      r.setClearColor(antes, alfa);
    }
    return url;
  }
}
