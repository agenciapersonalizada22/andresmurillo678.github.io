// Renderer, escena, luces, niebla y calidad grafica.
import * as THREE from '../lib/three.module.min.js';
import { G } from './estado.js';
export function crearEscena(canvas, aj) {
  const render = new THREE.WebGLRenderer({ canvas, antialias: !!aj.aa, powerPreference: 'high-performance' });
  const escena = new THREE.Scene(), camara = new THREE.PerspectiveCamera(70, 1, 0.15, 900);
  escena.background = new THREE.Color(0x8fcdf2); escena.fog = new THREE.Fog(0x8fcdf2, 150, 400);
  escena.add(new THREE.HemisphereLight(0xdff1ff, 0x6f8a5a, 0.95));
  const sol = new THREE.DirectionalLight(0xfff2d6, 1.15); sol.position.set(80, 140, 60); escena.add(sol, sol.target);
  Object.assign(G, { render, escena, camara, luz: sol });
  aplicarCalidad(aj);
  return G;
}
export function aplicarCalidad(aj) {
  const r = G.render; if (!r) return;
  r.setPixelRatio(Math.min(aj.pr, window.devicePixelRatio || 1) || 1);
  const on = aj.sombras > 0; r.shadowMap.enabled = on; r.shadowMap.type = THREE.PCFSoftShadowMap;
  const l = G.luz, sz = [0, 1024, 2048, 4096][aj.sombras] || 0;
  l.castShadow = on;
  if (on) { if (!l.shadow.map || l.shadow.mapSize.x !== sz) { l.shadow.mapSize.set(sz, sz); if (l.shadow.map) { l.shadow.map.dispose(); l.shadow.map = null; } } const c = l.shadow.camera; c.left = c.bottom = -70; c.right = c.top = 70; c.near = 10; c.far = 400; c.updateProjectionMatrix(); l.shadow.bias = -0.0005; }
  G.escena.fog.near = aj.dist * 0.45; G.escena.fog.far = aj.dist * 1.02; G.camara.far = aj.dist * 1.1 + 50; G.camara.updateProjectionMatrix();
  redimensionar();
}
export function redimensionar() {
  const r = G.render; if (!r) return; const w = innerWidth, h = innerHeight;
  r.setSize(w, h, false); G.camara.aspect = w / h; G.camara.updateProjectionMatrix();
}
export function seguirSol(x, y, z) {
  const l = G.luz; if (!l.castShadow) return;
  const q = 3; l.target.position.set(Math.round(x / q) * q, y, Math.round(z / q) * q); l.position.set(l.target.position.x + 80, l.target.position.y + 140, l.target.position.z + 60); l.target.updateMatrixWorld();
}
