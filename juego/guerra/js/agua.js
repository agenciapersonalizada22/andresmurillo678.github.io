// Agua con shader: olas por suma de senos, reflejo del cielo y del sol (Fresnel),
// color según la profundidad (turquesa en la orilla) y espuma en la costa.
import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';

const VERT = `
varying vec3 vW;
#include <fog_pars_vertex>
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FRAG = `
uniform float t;
uniform float tam;
uniform float op;
uniform vec3 colA, colB, horiz, cenit, sunDir, sunCol;
uniform sampler2D prof;
varying vec3 vW;
#include <fog_pars_fragment>
void main() {
  vec2 p = vW.xz;
  vec2 g = vec2(0.0);
  vec2 d1 = vec2(0.8, 0.6), d2 = vec2(-0.5, 0.86), d3 = vec2(0.3, -0.95), d4 = vec2(-0.9, -0.3);
  float f1 = 0.045, f2 = 0.09, f3 = 0.21, f4 = 0.47;
  float p1 = dot(d1, p) * f1 + t * 0.9, p2 = dot(d2, p) * f2 + t * 1.3, p3 = dot(d3, p) * f3 + t * 1.9, p4 = dot(d4, p) * f4 + t * 2.7;
  float dc = length(cameraPosition - vW);
  float lej = 1.0 / (1.0 + dc * 0.006);
  g += 0.9 * f1 * cos(p1) * d1 + 0.55 * f2 * cos(p2) * d2 * (0.4 + 0.6 * lej) + (0.28 * f3 * cos(p3) * d3 + 0.12 * f4 * cos(p4) * d4) * lej * lej;
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 v = normalize(cameraPosition - vW);
  float cosv = max(dot(n, v), 0.0);
  float fres = 0.04 + 0.96 * pow(1.0 - cosv, 5.0);
  vec3 r = reflect(-v, n);
  vec3 cielo = mix(horiz, cenit, pow(clamp(r.y, 0.0, 1.0), 0.5));
  float s = max(dot(r, sunDir), 0.0);
  vec3 spec = sunCol * (pow(s, 180.0) * 2.2 + pow(s, 20.0) * 0.18);
  vec2 uv = p / tam + 0.5;
  vec4 pr = texture2D(prof, uv);
  float depth = pr.r;
  vec3 agua = mix(colA, colB, smoothstep(0.0, 0.6, depth));
  vec3 col = mix(agua, cielo, clamp(fres * 1.15, 0.0, 1.0)) + spec;
  float ola = 0.5 + 0.5 * sin(p3 * 1.5 + p4);
  float espuma = (1.0 - smoothstep(0.015, 0.16, depth)) * (0.45 + 0.55 * ola) * step(pr.g, 0.5);
  col = mix(col, vec3(1.0), clamp(espuma, 0.0, 1.0) * 0.85);
  float a = clamp(mix(0.55, op, smoothstep(0.0, 0.5, depth) + fres), 0.0, 1.0);
  a = max(a, espuma * 0.9);
  gl_FragColor = vec4(col, a);
  #include <fog_fragment>
}`;

// Mapa de profundidad del mar (R: profundidad 0 a 1, G: 1 si es tierra) tomado del relieve
function texturaProfundidad(terreno, N = 192) {
  const T = CONFIG.mundo.tam;
  const d = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const h = terreno.altura(((i + 0.5) / N - 0.5) * T, ((j + 0.5) / N - 0.5) * T);
    const k = (j * N + i) * 4;
    d[k] = Math.round(Math.max(0, Math.min(1, -h / 18)) * 255);
    d[k + 1] = h > 0 ? 255 : 0;
    d[k + 3] = 255;
  }
  const tex = new THREE.DataTexture(d, N, N, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function crearAgua(terreno, A, cielo) {
  const T = CONFIG.mundo.tam;
  const tex = texturaProfundidad(terreno);
  const col = new THREE.Color(A.color);
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    t: { value: 0 }, tam: { value: T }, op: { value: A.op },
    colA: { value: col.clone().lerp(new THREE.Color(0x7fe8d8), 0.45) },
    colB: { value: col.clone().multiplyScalar(0.55) },
    horiz: { value: new THREE.Color(cielo.horizonte) }, cenit: { value: new THREE.Color(cielo.cenit) },
    sunDir: { value: new THREE.Vector3(...cielo.sol).normalize() }, sunCol: { value: new THREE.Color(cielo.colorSol) },
    prof: { value: tex },
  }]);
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, fog: true, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(T * 3.2, T * 3.2).rotateX(-Math.PI / 2), mat);
  mesh.renderOrder = 1;
  return {
    mesh,
    actualizar(t) { uniforms.t.value = t; },
    dispose() { tex.dispose(); },
  };
}
