// Miniaturas 3D de los aviones para el menú: se dibujan una vez con el renderer
// principal en un render target y se guardan como imágenes.
import * as THREE from '../lib/three.module.min.js';
import { crearAvion } from './modelos.js';
import { AVIONES } from './config.js';

const W = 240, H = 150;

export function generarVistas(renderer) {
  const vistas = {};
  let rt = null;
  const antes = new THREE.Color();
  renderer.getClearColor(antes);
  const alfaAntes = renderer.getClearAlpha();
  try {
    rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
    const esc = new THREE.Scene();
    esc.add(new THREE.HemisphereLight(0xdcebff, 0x667788, 2.2));
    const luz = new THREE.DirectionalLight(0xfff0d2, 2.6);
    luz.position.set(-4, 6, -3);
    esc.add(luz);
    const cam = new THREE.PerspectiveCamera(28, W / H, 0.5, 200);
    const buf = new Uint8Array(W * H * 4);
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d');
    const img = g.createImageData(W, H);
    renderer.setClearColor(0x000000, 0);
    for (const id in AVIONES) {
      const def = AVIONES[id];
      const m = crearAvion(def.modelo, def.colores);
      m.userData.llama.visible = false;
      m.rotation.y = 0.35;
      esc.add(m);
      const caja = new THREE.Box3().setFromObject(m);
      const c = caja.getCenter(new THREE.Vector3());
      const tam = caja.getSize(new THREE.Vector3()).length();
      cam.position.set(c.x + tam * 0.62, c.y + tam * 0.5, c.z - tam * 0.78);
      cam.lookAt(c);
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(esc, cam);
      renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
      renderer.setRenderTarget(null);
      for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
      g.putImageData(img, 0, 0);
      vistas[id] = cv.toDataURL('image/png');
      esc.remove(m);
    }
  } catch (e) {
    renderer.setRenderTarget(null);
  } finally {
    renderer.setClearColor(antes, alfaAntes);
    if (rt) rt.dispose();
  }
  return vistas;
}
