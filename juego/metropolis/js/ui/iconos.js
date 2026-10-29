// Miniaturas 3D de cada edificio (se renderizan una vez con el mismo renderer).
import * as THREE from '../../lib/three.module.min.js';
import { ITEMS } from '../sim/datos.js';
import { modelo, TIENE_MODELO } from '../vista/modelos.js';
import { geoVia, geoLoseta } from '../vista/modelosVia.js';

const URLS = {};
const oyentes = [];
export const icono = (id) => URLS[id] || '';
export const alIcono = (fn) => oyentes.push(fn);

function iconoComprar() {
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#2d6a3f'; g.fillRect(12, 28, 72, 56);
  g.strokeStyle = '#ffd54a'; g.lineWidth = 3; g.setLineDash([8, 5]); g.strokeRect(12, 28, 72, 56);
  g.setLineDash([]); g.fillStyle = '#ffd54a'; g.font = '800 34px Orbitron, monospace'; g.textAlign = 'center'; g.fillText('$', 48, 68);
  g.fillStyle = '#e9f2ff'; g.fillRect(44, 8, 4, 24); g.fillStyle = '#ff4dc8'; g.fillRect(48, 8, 20, 12);
  return c.toDataURL();
}

export function generarIconos(renderer) {
  const lista = [];
  for (const it of ITEMS) {
    if (it.cat === 'ninguna') continue;
    lista.push(it);
  }
  const TAM = 112;
  const rt = new THREE.WebGLRenderTarget(TAM, TAM, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xdfeaff, 0x7a8a6a, 1.0));
  const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(-3, 6, 4); sc.add(d);
  const matC = new THREE.MeshLambertMaterial({ vertexColors: true });
  const matV = new THREE.MeshBasicMaterial({ color: 0xffe9a8, side: THREE.DoubleSide });
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const buf = new Uint8Array(TAM * TAM * 4);
  const cv = document.createElement('canvas'); cv.width = cv.height = TAM;
  const g2 = cv.getContext('2d');
  let i = 0;

  function uno(it) {
    if (it.id === 'comprar') { URLS[it.id] = iconoComprar(); return; }
    let geos;
    if (it.tipo === 'via') geos = geoVia(15, it.id === 'avenida' ? 2 : 1);
    else if (it.tipo === 'zona') geos = modelo(it.id, 2).geos();
    else if (TIENE_MODELO(it.id)) geos = modelo(it.id, it.mej ? 1 : 1).geos();
    else return;
    const grupo = new THREE.Group();
    const m = new THREE.Mesh(geos.cuerpo, matC); grupo.add(m);
    if (geos.vent) grupo.add(new THREE.Mesh(geos.vent, matV));
    if (it.tipo === 'zona') { const l = new THREE.Mesh(geoLoseta(it.zona === 'R' ? 0x7fd18a : it.zona === 'C' ? 0x6fb6ee : 0xe8c25a), matC); grupo.add(l); }
    sc.add(grupo);
    geos.cuerpo.computeBoundingBox();
    const bb = geos.cuerpo.boundingBox.clone();
    if (it.tipo === 'zona') { bb.min.set(-0.5, 0, -0.5); bb.max.y = Math.max(bb.max.y, 0.1); bb.max.x = Math.max(bb.max.x, 0.5); bb.max.z = Math.max(bb.max.z, 0.5); }
    const dir = new THREE.Vector3(1, 0.85, 1).normalize();
    cam.position.copy(dir.clone().multiplyScalar(30)); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
    const inv = cam.matrixWorldInverse;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
      const p = new THREE.Vector3(x, y, z).applyMatrix4(inv);
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, mitad = Math.max(x1 - x0, y1 - y0) / 2 * 1.1 + 0.05;
    cam.left = cx - mitad; cam.right = cx + mitad; cam.top = cy + mitad; cam.bottom = cy - mitad; cam.updateProjectionMatrix();
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(sc, cam); renderer.setRenderTarget(null);
    renderer.readRenderTargetPixels(rt, 0, 0, TAM, TAM, buf);
    const img = g2.createImageData(TAM, TAM);
    for (let y = 0; y < TAM; y++) img.data.set(buf.subarray((TAM - 1 - y) * TAM * 4, (TAM - y) * TAM * 4), y * TAM * 4);
    g2.putImageData(img, 0, 0);
    URLS[it.id] = cv.toDataURL('image/png');
    sc.remove(grupo);
  }

  function lote() {
    const col = new THREE.Color(), alfa = renderer.getClearAlpha();
    renderer.getClearColor(col);
    renderer.setClearColor(0x000000, 0);
    const n = Math.min(5, lista.length - i);
    for (let k = 0; k < n; k++) { const it = lista[i++]; try { uno(it); } catch (e) { /* sin icono */ } oyentes.forEach((f) => f(it.id, URLS[it.id])); }
    renderer.setClearColor(col, alfa);
    if (i < lista.length) requestAnimationFrame(lote);
    else { rt.dispose(); }
  }
  requestAnimationFrame(lote);
}
