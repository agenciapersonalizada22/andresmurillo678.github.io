// Reserva fija de partículas (puntos) que se reciclan: no se crean objetos nuevos al jugar.
import * as THREE from '../lib/three.module.min.js';

const VERT = `
attribute vec4 aColor;
attribute float aSize;
uniform float escala;
varying vec4 vColor;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(aSize * escala / max(-mv.z, 0.5), 420.0);
}`;
const FRAG = `
varying vec4 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  gl_FragColor = vec4(vColor.rgb, vColor.a * (1.0 - d * d));
}`;

export function rgb(hex) {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}

export class Particulas {
  constructor(escena, max, aditivo) {
    this.max = max;
    this.sig = 0;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.tam = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.edad = new Float32Array(max).fill(1);
    this.dur = new Float32Array(max).fill(1);
    this.t0 = new Float32Array(max);
    this.t1 = new Float32Array(max);
    this.c0 = new Float32Array(max * 3);
    this.c1 = new Float32Array(max * 3);
    this.a0 = new Float32Array(max);
    this.grav = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    this.attrPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.attrCol = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.attrTam = new THREE.BufferAttribute(this.tam, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.attrPos);
    geo.setAttribute('aColor', this.attrCol);
    geo.setAttribute('aSize', this.attrTam);
    this.material = new THREE.ShaderMaterial({
      uniforms: { escala: { value: 600 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.puntos = new THREE.Points(geo, this.material);
    this.puntos.frustumCulled = false;
    escena.add(this.puntos);
  }

  fijarEscala(v) { this.material.uniforms.escala.value = v; }

  emitir(x, y, z, vx, vy, vz, dur, t0, t1, c0, c1, a0 = 1, grav = 0) {
    const i = this.sig;
    this.sig = (i + 1) % this.max;
    const i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.c0[i3] = c0[0]; this.c0[i3 + 1] = c0[1]; this.c0[i3 + 2] = c0[2];
    this.c1[i3] = c1[0]; this.c1[i3 + 1] = c1[1]; this.c1[i3 + 2] = c1[2];
    this.edad[i] = 0;
    this.dur[i] = dur;
    this.t0[i] = t0;
    this.t1[i] = t1;
    this.a0[i] = a0;
    this.grav[i] = grav;
  }

  actualizar(dt) {
    const { pos, vel, col, tam, edad, dur, c0, c1, a0, t0, t1, grav } = this;
    for (let i = 0; i < this.max; i++) {
      if (edad[i] >= dur[i]) {
        if (tam[i] !== 0) { tam[i] = 0; col[i * 4 + 3] = 0; }
        continue;
      }
      edad[i] += dt;
      const u = Math.min(1, edad[i] / dur[i]);
      const i3 = i * 3, i4 = i * 4;
      vel[i3 + 1] -= grav[i] * dt;
      const fr = 1 - 1.2 * dt;
      vel[i3] *= fr; vel[i3 + 2] *= fr;
      pos[i3] += vel[i3] * dt;
      pos[i3 + 1] += vel[i3 + 1] * dt;
      pos[i3 + 2] += vel[i3 + 2] * dt;
      col[i4] = c0[i3] + (c1[i3] - c0[i3]) * u;
      col[i4 + 1] = c0[i3 + 1] + (c1[i3 + 1] - c0[i3 + 1]) * u;
      col[i4 + 2] = c0[i3 + 2] + (c1[i3 + 2] - c0[i3 + 2]) * u;
      col[i4 + 3] = a0[i] * (1 - u) * Math.min(1, u * 12 + 0.25);
      tam[i] = t0[i] + (t1[i] - t0[i]) * u;
    }
    this.attrPos.needsUpdate = true;
    this.attrCol.needsUpdate = true;
    this.attrTam.needsUpdate = true;
  }
}
