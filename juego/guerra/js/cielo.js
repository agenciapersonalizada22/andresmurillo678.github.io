// Cielo con degradado y sol, más nubes de adorno que siguen a la cámara
import * as THREE from '../lib/three.module.min.js';

export const DIR_SOL = new THREE.Vector3(0.55, 0.5, -0.65).normalize();

const VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAG = `
varying vec3 vDir;
uniform vec3 sol;
void main() {
  float h = clamp(vDir.y, 0.0, 1.0);
  vec3 horizonte = vec3(0.78, 0.86, 0.93);
  vec3 cenit = vec3(0.16, 0.38, 0.78);
  vec3 c = mix(horizonte, cenit, pow(h, 0.55));
  float s = max(dot(normalize(vDir), sol), 0.0);
  c += vec3(1.0, 0.85, 0.55) * pow(s, 24.0) * 0.35;
  c += vec3(1.0, 0.97, 0.85) * smoothstep(0.9988, 0.9996, s) * 1.6;
  if (vDir.y < 0.0) c = horizonte;
  gl_FragColor = vec4(c, 1.0);
}`;

function texturaNube() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 16; i++) {
    const x = 28 + Math.random() * 72, y = 44 + Math.random() * 40, r = 16 + Math.random() * 22;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

export class Cielo {
  constructor(escena) {
    this.domo = new THREE.Mesh(
      new THREE.SphereGeometry(3400, 24, 14),
      new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide,
        uniforms: { sol: { value: DIR_SOL } }, depthWrite: false, fog: false,
      }),
    );
    this.domo.renderOrder = -10;
    escena.add(this.domo);
    const mt = new THREE.SpriteMaterial({ map: texturaNube(), transparent: true, depthWrite: false, opacity: 0.85 });
    this.nubes = new THREE.Group();
    for (let i = 0; i < 38; i++) {
      const s = new THREE.Sprite(mt);
      const e = 220 + Math.random() * 260;
      s.scale.set(e, e * 0.5, 1);
      s.position.set((Math.random() - 0.5) * 3000, 320 + Math.random() * 220, (Math.random() - 0.5) * 3000);
      this.nubes.add(s);
    }
    escena.add(this.nubes);
  }

  seguir(pos) { this.domo.position.copy(pos); }
}
