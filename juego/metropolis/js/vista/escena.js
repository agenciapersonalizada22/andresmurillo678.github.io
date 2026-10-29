// Renderer, luces, ciclo día/noche y calidad gráfica.
import * as THREE from '../../lib/three.module.min.js';

const lerpC = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const CALIDADES = {
  baja: { pr: 1, sombras: false, antialias: false, agentes: 24, agua: false, fps30: true, arboles: 0.5 },
  media: { pr: 1.5, sombras: false, antialias: true, agentes: 60, agua: true, fps30: false, arboles: 1 },
  alta: { pr: 2, sombras: true, antialias: true, agentes: 120, agua: true, fps30: false, arboles: 1 },
};

export class Escena {
  constructor(canvas, calidad) {
    this.canvas = canvas;
    this.q = CALIDADES[calidad] || CALIDADES.media;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.q.antialias, powerPreference: 'high-performance', alpha: false });
    this.renderer.shadowMap.enabled = this.q.sombras;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8fd0ff);
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6a7a5a, 0.8);
    this.sol = new THREE.DirectionalLight(0xfff1d6, 1.0);
    this.sol.castShadow = this.q.sombras;
    const sc = this.sol.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 200;
    this.sol.shadow.mapSize.set(2048, 2048); this.sol.shadow.bias = -0.0006; this.sol.shadow.normalBias = 0.03;
    this.scene.add(this.hemi, this.sol, this.sol.target);
    this.matVent = new THREE.MeshBasicMaterial({ color: 0x3c5a7a, side: THREE.DoubleSide });
    this.noche = 0; this.elev = 1;
    this.w = 1; this.h = 1;
    this.aplicarCalidad(calidad);
  }
  aplicarCalidad(nombre) {
    this.q = CALIDADES[nombre] || CALIDADES.media;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(Math.min(dpr, this.q.pr));
    this.renderer.shadowMap.enabled = this.q.sombras;
    this.sol.castShadow = this.q.sombras;
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
  dibujar(camara) { this.renderer.render(this.scene, camara); }
}
