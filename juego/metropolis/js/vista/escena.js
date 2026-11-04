// Renderer, luces, ciclo día/noche y calidad gráfica.
import * as THREE from '../../lib/three.module.min.js';

const GRIS = new THREE.Color(0x6e7a8c);
const lerpC = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const CALIDADES = {
  baja: { pr: 1, sombras: false, antialias: false, agentes: 28, agua: false, fps30: true, arboles: 0.5, variantes: 3, mapa: 1024, clima: 0.4 },
  media: { pr: 1.5, sombras: false, antialias: true, agentes: 70, agua: true, fps30: false, arboles: 1, variantes: 5, mapa: 2048, clima: 0.7 },
  alta: { pr: 2, sombras: true, antialias: true, agentes: 130, agua: true, fps30: false, arboles: 1, variantes: 8, mapa: 2048, clima: 1 },
  ultra: { pr: 2.5, sombras: true, antialias: true, agentes: 230, agua: true, fps30: false, arboles: 1, variantes: 8, mapa: 4096, clima: 1.4 },
};
export const ORDEN_CALIDAD = ['baja', 'media', 'alta', 'ultra'];

// Preset + ajustes sueltos del jugador (null = lo decide el preset)
export function calidadEfectiva(nombre, aj = {}) {
  const q = Object.assign({}, CALIDADES[nombre] || CALIDADES.media);
  if (aj.sombras != null) q.sombras = !!aj.sombras;
  if (aj.resolucion) q.pr = aj.resolucion;
  if (aj.detalle != null) {
    const d = aj.detalle;
    q.arboles = d; q.agentes = Math.max(6, Math.round(q.agentes * (0.3 + 0.7 * d))); q.variantes = Math.max(1, Math.round(q.variantes * d)); q.clima *= d;
  }
  q.nombre = nombre;
  return q;
}

export class Escena {
  constructor(canvas, calidad, aj = {}) {
    this.canvas = canvas;
    this.q = calidadEfectiva(calidad, aj);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: aj.antialias != null ? !!aj.antialias : this.q.antialias, powerPreference: 'high-performance', alpha: false });
    this.renderer.shadowMap.enabled = this.q.sombras;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8fd0ff);
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6a7a5a, 0.8);
    this.sol = new THREE.DirectionalLight(0xfff1d6, 1.0);
    this.sol.castShadow = this.q.sombras;
    const sc = this.sol.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 200;
    this.sol.shadow.mapSize.set(this.q.mapa || 2048, this.q.mapa || 2048); this.sol.shadow.bias = -0.0006; this.sol.shadow.normalBias = 0.03;
    this.scene.add(this.hemi, this.sol, this.sol.target);
    this.matVent = new THREE.MeshBasicMaterial({ color: 0x3c5a7a, side: THREE.DoubleSide });
    this.noche = 0; this.elev = 1;
    this.w = 1; this.h = 1;
    this.aplicarCalidad(calidad, aj);
  }
  aplicarCalidad(nombre, aj = {}) {
    const antes = this.q && this.q.sombras;
    this.q = calidadEfectiva(nombre, aj);
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(Math.min(dpr, this.q.pr));
    this.renderer.shadowMap.enabled = this.q.sombras;
    this.sol.castShadow = this.q.sombras;
    const m = this.q.mapa || 2048;
    if (this.sol.shadow.mapSize.x !== m) { this.sol.shadow.mapSize.set(m, m); if (this.sol.shadow.map) { this.sol.shadow.map.dispose(); this.sol.shadow.map = null; } }
    if (antes !== this.q.sombras) this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    this.redim(true);
  }
  redim(forzar) {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    if (!forzar && w === this.w && h === this.h) return false;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    return true;
  }
  // hora: 0..24 (con decimales)
  hora(hf, objetivo) {
    const t = hf / 24;
    const elev = Math.sin((t - 0.25) * Math.PI * 2);
    this.elev = elev;
    const w1 = suave(-0.2, 0.08, elev), w2 = suave(0.08, 0.5, elev);
    const cielo = lerpC(lerpC(0x0a1030, 0xff9a72, w1), 0x8fd0ff, w2);
    this.scene.background.copy(cielo);
    const hs = lerpC(lerpC(0x5a6cb0, 0xffc09a, w1), 0xcfe8ff, w2);
    const hg = lerpC(lerpC(0x1a2036, 0x6a5a58, w1), 0x6f8060, w2);
    this.hemi.color.copy(hs); this.hemi.groundColor.copy(hg);
    this.hemi.intensity = 0.62 + 0.24 * w2 + 0.08 * w1;
    this.sol.color.copy(lerpC(lerpC(0x7b92ff, 0xff9a60, w1), 0xfff1d6, w2));
    this.sol.intensity = 0.38 + 0.78 * w2 + 0.22 * w1;
    const az = (t - 0.25) * Math.PI * 2;
    const dx = Math.cos(az) * 0.8, dy = Math.max(0.35, 0.35 + Math.abs(elev) * 0.9), dz = 0.55;
    const ox = objetivo ? objetivo.x : 32, oz = objetivo ? objetivo.z : 32;
    this.sol.position.set(ox + dx * 70, dy * 70, oz + dz * 70);
    this.sol.target.position.set(ox, 0, oz);
    const luz = 1 - suave(-0.08, 0.3, elev);
    this.noche = luz;
    this.matVent.color.copy(lerpC(0x4a6a8c, 0xffd27a, luz));
    return cielo;
  }
  // nubosidad 0..1 (tormenta/lluvia oscurecen y desaturan la escena)
  nubes(k) {
    if (k < 0.004) return;
    this.scene.background.lerp(GRIS, k * 0.6);
    this.hemi.intensity *= 1 - 0.18 * k; this.sol.intensity *= 1 - 0.5 * k;
  }
  dibujar(camara) { this.renderer.render(this.scene, camara); }
}
