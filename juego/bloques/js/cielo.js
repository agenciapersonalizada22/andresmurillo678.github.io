// =============================================================
//  ☀️  CIELO, DÍA Y NOCHE
//  - Un domo (media esfera gigante) pinta el degradado del cielo,
//    los atardeceres, el sol y la luna con su halo y las estrellas
//    (que titilan). Todo se calcula en la tarjeta de video.
//  - Las nubes son varias capas de ruido a distintas alturas: al
//    moverte se ven con profundidad y reciben luz del sol.
//  - También calcula la luz del día: dirección y color del sol (o de
//    la luna de noche), luz del cielo, color de la niebla...
//  La "hora" va de 0 a 1: 0 = amanecer, 0.25 = mediodía,
//  0.5 = atardecer, 0.75 = medianoche.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';

const suave = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function crearColores() {
  return {
    diaArriba: new THREE.Color('#3b86e6'),
    diaHorizonte: new THREE.Color('#b4dcff'),
    nocheArriba: new THREE.Color('#040816'),
    nocheHorizonte: new THREE.Color('#121c40'),
    atardecer: new THREE.Color('#ff7f36'),
  };
}

const VERT_DOMO = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const FRAG_DOMO = /* glsl */`
  uniform vec3 arriba;
  uniform vec3 horizonte;
  uniform vec3 solDir;
  uniform vec3 colorAtardecer;
  uniform float fuerzaAtardecer;
  uniform float noche;
  uniform float tiempo;
  uniform float estrellas;
  varying vec3 vDir;
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float ruido(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 c = mix(horizonte, arriba, pow(clamp(h, 0.0, 1.0), 0.55));
    if (h < 0.0) c = mix(horizonte, horizonte * 0.7, clamp(-h * 5.0, 0.0, 1.0));
    float sd = dot(d, solDir);
    // resplandor del atardecer / amanecer
    float banda = smoothstep(-0.05, 0.16, h) * (1.0 - clamp(h * 2.2, 0.0, 1.0));
    c += colorAtardecer * fuerzaAtardecer * (0.28 * banda + 0.95 * pow(max(sd, 0.0), 6.0) * banda);
    float dia = 1.0 - noche;
    // sol: disco con halo
    float disco = smoothstep(0.99935, 0.99965, sd);
    float halo = pow(max(sd, 0.0), 90.0) * 0.55 + pow(max(sd, 0.0), 10.0) * 0.16;
    c += vec3(1.0, 0.94, 0.78) * (disco * 1.6 + halo) * smoothstep(-0.12, 0.04, solDir.y);
    // luna (enfrente del sol) con cráteres y halo
    vec3 ld = -solDir;
    float md = dot(d, ld);
    float disL = smoothstep(0.99955, 0.99975, md);
    float crateres = 0.82 + 0.18 * ruido(d * 120.0) + 0.1 * ruido(d * 300.0);
    c += vec3(0.86, 0.9, 1.0) * (disL * crateres + pow(max(md, 0.0), 110.0) * 0.32 + pow(max(md, 0.0), 14.0) * 0.07) * noche * smoothstep(-0.12, 0.04, ld.y);
    // estrellas que titilan
    if (estrellas > 0.5 && noche > 0.02 && h > -0.08) {
      vec3 g = d * 190.0;
      vec3 id = floor(g);
      float r = hash(id);
      float tam = smoothstep(0.45, 0.0, length(fract(g) - 0.5));
      float brillo = step(0.982, r) * tam * (0.55 + 0.45 * sin(tiempo * 2.3 + r * 60.0));
      c += mix(vec3(0.8, 0.9, 1.0), vec3(1.0, 0.9, 0.75), fract(r * 7.0)) * brillo * noche * smoothstep(-0.05, 0.25, h);
      // neblina de la vía láctea muy tenue
      float vl = ruido(d * 4.0 + vec3(3.0)) * smoothstep(0.35, 0.0, abs(d.x * 0.6 + d.y - d.z * 0.3));
      c += vec3(0.05, 0.06, 0.1) * vl * noche;
    }
    gl_FragColor = vec4(c, 1.0);
  }`;

const FRAG_NUBES = /* glsl */`
  uniform vec3 camara;
  uniform float tiempo;
  uniform vec2 viento;
  uniform vec3 luzNube;
  uniform vec3 sombraNube;
  uniform vec3 colorNiebla;
  uniform float opacidad;
  uniform float escala;
  uniform float cobertura;
  uniform float capa;
  uniform float octavas;
  uniform vec3 solDir;
  varying vec3 vP;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float ruido(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
      if (float(i) >= octavas) break;
      s += a * ruido(p);
      p = p * 2.03 + vec2(17.0, 9.0);
      a *= 0.5;
    }
    return s;
  }
  void main() {
    vec2 p = (vP.xz + viento * tiempo) * escala + vec2(capa * 31.7, capa * 12.3);
    float n = fbm(p);
    float dens = smoothstep(cobertura, cobertura + 0.22, n);
    if (dens < 0.01) discard;
    // luz: la nube es más clara del lado del sol y más oscura por dentro
    vec2 haciaSol = normalize(solDir.xz + vec2(0.001)) * 0.06;
    float n2 = fbm(p + haciaSol * 10.0);
    float luz = clamp(0.62 + (n - n2) * 5.0, 0.0, 1.0);
    vec3 col = mix(sombraNube, luzNube, luz);
    float d = length(vP.xz - camara.xz);
    float lejos = smoothstep(260.0, 700.0, d);
    col = mix(col, colorNiebla, lejos * 0.8);
    float alfa = dens * opacidad * (1.0 - smoothstep(420.0, 740.0, d));
    // si vuelas a la altura de la nube se desvanece (para no ver una raya)
    alfa *= smoothstep(2.0, 12.0, abs(camara.y - vP.y));
    gl_FragColor = vec4(col, alfa);
  }`;

export class Cielo {
  constructor(escena) {
    this.escena = escena;
    THREE.ColorManagement.enabled = false;
    this.colores = crearColores();
    this.uniformes = {
      arriba: { value: new THREE.Color() },
      horizonte: { value: new THREE.Color() },
      solDir: { value: new THREE.Vector3(0, 1, 0) },
      colorAtardecer: { value: this.colores.atardecer.clone() },
      fuerzaAtardecer: { value: 0 },
      noche: { value: 0 },
      tiempo: { value: 0 },
      estrellas: { value: 1 },
    };
    const domo = new THREE.Mesh(
      new THREE.SphereGeometry(1, 40, 20),
      new THREE.ShaderMaterial({
        uniforms: this.uniformes,
        vertexShader: VERT_DOMO,
        fragmentShader: FRAG_DOMO,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
      }));
    domo.renderOrder = -10;
    domo.frustumCulled = false;
    this.domo = domo;
    escena.add(domo);

    // Nubes: capas de ruido a distintas alturas (más capas = más volumen)
    this.capasNubes = [];
    this.nubesActivas = CONFIG.vista.nubes;
    this.compartidas = {
      camara: { value: new THREE.Vector3() },
      tiempo: { value: 0 },
      luzNube: { value: new THREE.Color(1, 1, 1) },
      sombraNube: { value: new THREE.Color(0.6, 0.66, 0.78) },
      colorNiebla: { value: new THREE.Color() },
      solDir: this.uniformes.solDir,
    };
    if (this.nubesActivas) {
      const geo = new THREE.PlaneGeometry(1500, 1500);
      for (let i = 0; i < 4; i++) {
        const mat = new THREE.ShaderMaterial({
          uniforms: {
            ...this.compartidas,
            viento: { value: new THREE.Vector2(1.6 - i * 0.35, 0.5 + i * 0.2) },
            opacidad: { value: 0.9 - i * 0.12 },
            escala: { value: 0.0105 + i * 0.0021 },
            cobertura: { value: 0.5 + i * 0.012 },
            capa: { value: i },
            octavas: { value: 5 },
          },
          vertexShader: `varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
          fragmentShader: FRAG_NUBES,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        });
        const m = new THREE.Mesh(geo, mat);
        m.rotation.x = -Math.PI / 2;
        m.frustumCulled = false;
        m.renderOrder = -5 + i;
        escena.add(m);
        this.capasNubes.push(m);
      }
      this.ponerCalidadNubes(4, 5);
    }

    // luz del día que usan el mundo y los vehículos
    this.luz = 1;
    this.factorDia = 1;
    this.escondido = false;
    this.colorNiebla = new THREE.Color();
    this.solDir = new THREE.Vector3(0, 1, 0);      // hacia el sol
    this.luzDir = new THREE.Vector3(0, 1, 0);      // hacia la luz principal (sol o luna) que hace sombras
    this.luzColor = new THREE.Color();
    this.ambCielo = new THREE.Color();
    this.ambSuelo = new THREE.Color();
    this.horizonte = this.uniformes.horizonte.value;
    this.arriba = this.uniformes.arriba.value;
    this.tmp = new THREE.Vector3();
    this.viento = 0;
  }

  ponerCalidadNubes(capas, octavas) {
    this.capasNubes.forEach((m, i) => {
      m.visible = i < capas;
      m.material.uniforms.octavas.value = octavas;
    });
    this.nCapas = capas;
  }

  ponerEstrellas(si) { this.uniformes.estrellas.value = si ? 1 : 0; }

  // Bajo el agua se esconde todo el cielo (así se ve solo el azul del agua)
  bajoAgua(si) {
    if (si === this.escondido) return;
    this.escondido = si;
    this.domo.visible = !si;
    if (si) for (const m of this.capasNubes) m.visible = false;
    else for (let i = 0; i < this.capasNubes.length; i++) this.capasNubes[i].visible = i < (this.nCapas || 1);
  }

  // Devuelve cuánta luz hay (0 a 1) y deja listo el color de la niebla
  actualizar(hora, camara, lejos, dt, tiempo = 0) {
    const ang = hora * Math.PI * 2;
    const solDir = this.solDir.set(Math.cos(ang), Math.sin(ang), 0.25).normalize();
    this.uniformes.solDir.value.copy(solDir);
    const altura = solDir.y;
    const dia = suave(-0.18, 0.2, altura);
    const atardecer = Math.exp(-Math.pow(altura / 0.2, 2)) * (hora < 0.12 || (hora > 0.38 && hora < 0.62) ? 1 : 0.4);
    this.factorDia = dia;

    const arriba = this.uniformes.arriba.value.copy(this.colores.nocheArriba).lerp(this.colores.diaArriba, dia);
    const horizonte = this.uniformes.horizonte.value.copy(this.colores.nocheHorizonte).lerp(this.colores.diaHorizonte, dia);
    horizonte.lerp(this.colores.atardecer, atardecer * 0.35);
    arriba.lerp(this.colores.atardecer, atardecer * 0.08);
    this.uniformes.fuerzaAtardecer.value = atardecer * 0.7;
    this.uniformes.noche.value = 1 - dia;
    this.uniformes.tiempo.value = tiempo;
    this.colorNiebla.copy(horizonte);

    const p = camara.position;
    this.domo.position.copy(p);
    this.domo.scale.setScalar(lejos * 0.9);

    // luz principal: el sol de día y la luna (más débil y azulada) de noche
    const intSol = suave(-0.05, 0.28, altura);
    const intLuna = suave(-0.05, 0.28, -altura) * 0.26;
    const sol = altura > 0.0;
    const dirBase = sol ? solDir : this.tmp.copy(solDir).multiplyScalar(-1);
    this.luzDir.copy(dirBase);
    if (this.luzDir.y < 0.2) { this.luzDir.y = 0.2; this.luzDir.normalize(); }
    const calido = suave(0.0, 0.5, altura);
    if (sol) this.luzColor.setRGB(1.0, 0.62 + 0.34 * calido, 0.34 + 0.52 * calido).multiplyScalar(intSol * 0.66);
    else this.luzColor.setRGB(0.55, 0.66, 1.0).multiplyScalar(intLuna);
    // luz del cielo (ambiente): más azul de día, casi negra de noche
    this.ambCielo.setRGB(0.1 + 0.4 * dia, 0.13 + 0.42 * dia, 0.24 + 0.4 * dia);
    this.ambCielo.lerp(this.colores.atardecer, atardecer * 0.12);
    this.ambSuelo.setRGB(0.06 + 0.3 * dia, 0.07 + 0.27 * dia, 0.1 + 0.22 * dia);

    const noche = CONFIG.dia.luzNoche;
    this.luz = noche + (1 - noche) * dia;

    if (this.nubesActivas) {
      this.compartidas.camara.value.copy(p);
      this.compartidas.tiempo.value = tiempo;
      this.compartidas.colorNiebla.value.copy(horizonte);
      const l = 0.2 + 0.8 * dia;
      this.compartidas.luzNube.value.setRGB(l * 1.0 + atardecer * 0.35, l * (0.97 - atardecer * 0.12), l * (1.0 - atardecer * 0.35));
      this.compartidas.sombraNube.value.setRGB(l * 0.58 + atardecer * 0.25, l * 0.64, l * 0.78 - atardecer * 0.1);
      const alturaNubes = CONFIG.vista.alturaNubes;
      this.capasNubes.forEach((m, i) => {
        m.position.set(p.x, alturaNubes + i * 6, p.z);
        m.visible = i < (this.nCapas || 1) && !this.escondido && p.y < alturaNubes + 250;
      });
    }
    return this.luz;
  }
}
