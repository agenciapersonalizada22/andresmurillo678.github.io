// Cielo con degradado y sol (o luna y estrellas), más nubes de adorno que siguen a la cámara.
// Cada mapa lo reconfigura con aplicar().
import * as THREE from '../lib/three.module.min.js';

const VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAG = `
varying vec3 vDir;
uniform vec3 sol;
uniform vec3 horizonte;
uniform vec3 cenit;
uniform vec3 colorSol;
void main() {
  float h = clamp(vDir.y, 0.0, 1.0);
  vec3 c = mix(horizonte, cenit, pow(h, 0.55));
  float s = max(dot(normalize(vDir), sol), 0.0);
  c += colorSol * pow(s, 24.0) * 0.35;
  c += colorSol * 0.7 * pow(s, 6.0) * (1.0 - h) * 0.35;
  c += mix(colorSol, vec3(1.0), 0.6) * smoothstep(0.9988, 0.9996, s) * 1.6;
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
    this.escena = escena;
    this.dirSol = new THREE.Vector3(0.55, 0.5, -0.65).normalize();
    this.uni = {
      sol: { value: this.dirSol },
      horizonte: { value: new THREE.Color() },
      cenit: { value: new THREE.Color() },
      colorSol: { value: new THREE.Color() },
    };
    this.domo = new THREE.Mesh(
      new THREE.SphereGeometry(3400, 24, 14),
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, uniforms: this.uni, depthWrite: false, fog: false }),
    );
    this.domo.renderOrder = -10;
    escena.add(this.domo);
    this.matNube = new THREE.SpriteMaterial({ map: texturaNube(), transparent: true, depthWrite: false, opacity: 0.85 });
    this.nubes = new THREE.Group();
    escena.add(this.nubes);
    this.estrellas = null;
  }

  aplicar(d) {
    this.uni.horizonte.value.set(d.horizonte);
    this.uni.cenit.value.set(d.cenit);
    this.uni.colorSol.value.set(d.colorSol);
    this.dirSol.set(d.sol[0], d.sol[1], d.sol[2]).normalize();
    // nubes
    this.nubes.clear();
    this.matNube.opacity = d.nubes.op;
    this.matNube.color.set(d.nubes.color);
    for (let i = 0; i < d.nubes.n; i++) {
      const s = new THREE.Sprite(this.matNube);
      const e = 220 + Math.random() * 260;
      s.scale.set(e, e * 0.5, 1);
      s.position.set((Math.random() - 0.5) * 3000, d.nubes.alt + Math.random() * d.nubes.var, (Math.random() - 0.5) * 3000);
      this.nubes.add(s);
    }
    // estrellas
    if (this.estrellas) {
      this.escena.remove(this.estrellas);
      this.estrellas.geometry.dispose();
      this.estrellas.material.dispose();
      this.estrellas = null;
    }
    if (d.estrellas > 0) {
      const pos = new Float32Array(d.estrellas * 3);
      for (let i = 0; i < d.estrellas; i++) {
        const a = Math.random() * Math.PI * 2, y = 0.18 + Math.random() * 0.82, r = Math.sqrt(1 - y * y);
        pos[i * 3] = Math.cos(a) * r * 3300; pos[i * 3 + 1] = y * 3300; pos[i * 3 + 2] = Math.sin(a) * r * 3300;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.estrellas = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false, fog: false }));
      this.estrellas.renderOrder = -9;
      this.escena.add(this.estrellas);
    }
  }

  seguir(pos) {
    this.domo.position.copy(pos);
    if (this.estrellas) this.estrellas.position.copy(pos);
  }
}
