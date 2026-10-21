// =============================================================
//  🍃  PARTÍCULAS DE AMBIENTE
//  Cositas que dan vida al mundo: polvo que flota en el sol, hojas
//  que caen de los árboles, humo de las chimeneas, chispas de las
//  antorchas y, cuando manejas, humo del escape, polvo del camino y
//  espuma del bote. Todas viven en un solo objeto de puntos
//  (una sola llamada a la tarjeta de video).
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { ES_HOJAS, SOLIDO, TEXTURA_CARA, EMISION } from './bloques.js';

const MAX = 1800;

const VERT = /* glsl */`
  attribute vec4 pcolor;
  attribute float ptam;
  attribute float pemis;
  uniform float uEscala;
  varying vec4 vColor;
  varying float vEmis;
  varying float vDist;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDist = -mv.z;
    gl_PointSize = max(1.6, ptam * uEscala / max(0.1, -mv.z));
    gl_Position = projectionMatrix * mv;
    vColor = pcolor;
    vEmis = pemis;
  }`;

const FRAG = /* glsl */`
  uniform vec3 uLuz;
  uniform vec3 uNiebla;
  uniform float uNieblaCerca;
  uniform float uNieblaLejos;
  varying vec4 vColor;
  varying float vEmis;
  varying float vDist;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.15, d) * vColor.a;
    if (a < 0.01) discard;
    vec3 c = vColor.rgb * mix(uLuz, vec3(1.0), vEmis);
    c = mix(c, uNiebla, smoothstep(uNieblaCerca, uNieblaLejos, vDist) * (1.0 - vEmis));
    gl_FragColor = vec4(c, a);
  }`;

const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class Ambiente {
  constructor(escena, mundo, uniformes, promedios) {
    this.mundo = mundo;
    this.promedios = promedios;
    this.n = 0;
    this.pos = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 4);
    this.tam = new Float32Array(MAX);
    this.emis = new Float32Array(MAX);
    this.vida = new Float32Array(MAX);
    this.vida0 = new Float32Array(MAX);
    this.a0 = new Float32Array(MAX);
    this.tam0 = new Float32Array(MAX);
    this.tam1 = new Float32Array(MAX);
    this.grav = new Float32Array(MAX);
    this.arrastre = new Float32Array(MAX);
    this.tipo = new Uint8Array(MAX);   // 1 polvo, 2 hoja, 3 humo, 4 chispa, 5 otros, 6 estela
    this.u = {
      uEscala: { value: 500 },
      uLuz: { value: new THREE.Color(1, 1, 1) },
      uNiebla: uniformes.uNiebla,
      uNieblaCerca: uniformes.uNieblaCerca,
      uNieblaLejos: uniformes.uNieblaLejos,
    };
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3);
    this.aCol = new THREE.BufferAttribute(this.col, 4);
    this.aTam = new THREE.BufferAttribute(this.tam, 1);
    this.aEmis = new THREE.BufferAttribute(this.emis, 1);
    for (const a of [this.aPos, this.aCol, this.aTam, this.aEmis]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos);
    g.setAttribute('pcolor', this.aCol);
    g.setAttribute('ptam', this.aTam);
    g.setAttribute('pemis', this.aEmis);
    g.setDrawRange(0, 0);
    this.material = new THREE.ShaderMaterial({
      uniforms: this.u, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false,
    });
    this.puntos = new THREE.Points(g, this.material);
    this.puntos.frustumCulled = false;
    this.puntos.renderOrder = 5;
    escena.add(this.puntos);
    this.t = 0;
    this.tHoja = 0;
    this.tHumo = 0;
    this.tChispa = 0;
    this.nivel = 1;
    this.viento = [0.7, 0.3];
    this.fuentesHumo = [];
    this.fuentesChispa = [];
    this.tBusca = 0;
  }

  nueva(tipo, x, y, z, vx, vy, vz, r, g, b, a, t0, t1, vida, grav = 0, arrastre = 0, emis = 0) {
    if (this.n >= MAX) return -1;
    const i = this.n++;
    this.tipo[i] = tipo;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.col[i * 4] = r; this.col[i * 4 + 1] = g; this.col[i * 4 + 2] = b; this.col[i * 4 + 3] = 0;
    this.a0[i] = a; this.tam0[i] = t0; this.tam1[i] = t1; this.tam[i] = t0;
    this.vida[i] = this.vida0[i] = vida;
    this.grav[i] = grav; this.arrastre[i] = arrastre; this.emis[i] = emis;
    return i;
  }

  // ----------------------------------------------------------- Efectos de los vehículos
  humo(x, y, z, n = 4, k = 1) {
    for (let i = 0; i < n * this.nivel; i++) {
      const g = 70 + Math.random() * 40;
      this.nueva(3, x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 1.2 + this.viento[0] * 0.4, 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 1.2 + this.viento[1] * 0.4,
        g / 255, g / 255, g / 255, 0.55 * k, 0.35, 1.5 + Math.random(), 3.5 + Math.random() * 1.5, 0.1, 0.4);
    }
  }

  polvo(x, y, z, n = 3, vx = 0, vz = 0) {
    for (let i = 0; i < n * this.nivel; i++) {
      this.nueva(5, x + (Math.random() - 0.5) * 0.8, y, z + (Math.random() - 0.5) * 0.8, vx * 0.3 + (Math.random() - 0.5) * 1.2, 0.4 + Math.random() * 0.8, vz * 0.3 + (Math.random() - 0.5) * 1.2,
        0.62, 0.55, 0.42, 0.45, 0.25, 1.0 + Math.random() * 0.5, 1.2 + Math.random() * 0.7, 0.0, 1.6);
    }
  }

  espuma(x, y, z, vx, vz, k = 1) {
    for (let i = 0; i < 2 * this.nivel; i++) {
      this.nueva(5, x + (Math.random() - 0.5) * 0.5, y, z + (Math.random() - 0.5) * 0.5, vx + (Math.random() - 0.5) * 1.4, 0.8 + Math.random() * 1.2, vz + (Math.random() - 0.5) * 1.4,
        0.92, 0.97, 1.0, 0.55 * k, 0.12, 0.35, 0.7 + Math.random() * 0.4, -9, 0.5);
    }
  }

  chispas(x, y, z, n = 3) {
    for (let i = 0; i < n; i++) {
      this.nueva(4, x, y, z, (Math.random() - 0.5) * 2.4, 1 + Math.random() * 2.4, (Math.random() - 0.5) * 2.4, 1.0, 0.62 + Math.random() * 0.2, 0.2, 1, 0.07, 0.03, 0.4 + Math.random() * 0.5, -3.5, 0.6, 1);
    }
  }

  // ----------------------------------------------------------- Ambiente alrededor del jugador
  buscarFuentes(camara) {
    this.fuentesHumo.length = 0;
    this.fuentesChispa.length = 0;
    const cx = Math.floor(camara.position.x) >> 4, cz = Math.floor(camara.position.z) >> 4;
    for (let dz = -3; dz <= 3; dz++) {
      for (let dx = -3; dx <= 3; dx++) {
        const ch = this.mundo.chunks.get((cx + dx + 32768) * 65536 + (cz + dz + 32768));
        if (!ch) continue;
        if (ch.humos) for (const h of ch.humos) this.fuentesHumo.push(h);
        if (ch.emisores) for (const e of ch.emisores) if (e[3] === 14) this.fuentesChispa.push([ch.cx * 16 + e[0], e[1], ch.cz * 16 + e[2]]);
      }
    }
  }

  actualizar(dt, camara, cielo, nivel, activo) {
    this.nivel = nivel;
    this.t += dt;
    const cam = camara.position;
    this.u.uLuz.value.setRGB(0.25 + 0.75 * cielo.luz, 0.27 + 0.73 * cielo.luz, 0.32 + 0.68 * cielo.luz);
    this.u.uEscala.value = (this.alturaPantalla || 600) * 0.5 / Math.tan((camara.fov * Math.PI / 180) / 2);
    this.viento[0] = 0.7 + Math.sin(this.t * 0.13) * 0.4;
    this.viento[1] = 0.3 + Math.cos(this.t * 0.1) * 0.3;
    if (activo && nivel > 0) {
      this.tBusca -= dt;
      if (this.tBusca <= 0) { this.tBusca = 1; this.buscarFuentes(camara); }
      this.generar(dt, camara, cielo, nivel);
    }
    this.integrar(dt, cam);
  }

  generar(dt, camara, cielo, nivel) {
    const cam = camara.position;
    // polvo flotando en la luz del día
    let polvo = 0;
    for (let i = 0; i < this.n; i++) if (this.tipo[i] === 1) polvo++;
    const meta = Math.floor(46 * nivel * cielo.factorDia);
    if (polvo < meta && Math.random() < 0.5) {
      const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 11;
      this.nueva(1, cam.x + Math.cos(a) * r, cam.y + (Math.random() - 0.3) * 6, cam.z + Math.sin(a) * r,
        (Math.random() - 0.5) * 0.25 + this.viento[0] * 0.12, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.25 + this.viento[1] * 0.12,
        1.0, 0.96, 0.82, 0.5, 0.045, 0.045, 7 + Math.random() * 6, 0, 0.1, 0.35);
    }
    // hojas que caen de los árboles cercanos
    this.tHoja -= dt;
    if (this.tHoja <= 0) {
      this.tHoja = 0.22 / Math.max(0.2, nivel);
      const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 14;
      const x = Math.floor(cam.x + Math.cos(a) * r), z = Math.floor(cam.z + Math.sin(a) * r);
      const base = this.mundo.alturaSuelo(x, z);
      if (base >= 0) {
        for (let y = base + 3; y <= base + 16; y++) {
          const id = this.mundo.obtener(x, y, z);
          if (ES_HOJAS[id] && !SOLIDO[this.mundo.obtener(x, y - 1, z)]) {
            const p = this.promedios[TEXTURA_CARA[id * 6]] || [0.3, 0.6, 0.2];
            const v = 0.8 + Math.random() * 0.4;
            this.nueva(2, x + Math.random(), y - 0.1, z + Math.random(), this.viento[0] * 0.35, -0.9 - Math.random() * 0.5, this.viento[1] * 0.35,
              p[0] * v, p[1] * v, p[2] * v, 0.95, 0.11, 0.11, 9, 0, 0.3);
            break;
          }
        }
      }
    }
    // humo de las chimeneas
    this.tHumo -= dt;
    if (this.tHumo <= 0) {
      this.tHumo = 0.4 / nivel;
      for (const h of this.fuentesHumo) {
        if ((h[0] - cam.x) ** 2 + (h[2] - cam.z) ** 2 > 70 * 70) continue;
        const g = 90 + Math.random() * 50;
        this.nueva(3, h[0] + 0.5, h[1] + 0.2, h[2] + 0.5, this.viento[0] * 0.5 + (Math.random() - 0.5) * 0.3, 1 + Math.random() * 0.6, this.viento[1] * 0.5 + (Math.random() - 0.5) * 0.3,
          g / 255, g / 255, g / 255, 0.5, 0.5, 2.2, 5 + Math.random() * 2, 0.05, 0.3);
      }
    }
    // chispas de las antorchas
    this.tChispa -= dt;
    if (this.tChispa <= 0 && nivel >= 0.6) {
      this.tChispa = 0.25;
      let cuenta = 0;
      for (const f of this.fuentesChispa) {
        if ((f[0] - cam.x) ** 2 + (f[2] - cam.z) ** 2 > 28 * 28 || Math.random() > 0.35) continue;
        this.chispas(f[0] + 0.5, f[1] + 0.7, f[2] + 0.5, 1);
        if (++cuenta > 8) break;
      }
    }
  }

  integrar(dt, cam) {
    let i = 0;
    while (i < this.n) {
      this.vida[i] -= dt;
      const tipo = this.tipo[i];
      const px = this.pos[i * 3], py = this.pos[i * 3 + 1], pz = this.pos[i * 3 + 2];
      let muerta = this.vida[i] <= 0;
      if (!muerta && tipo === 1 && (px - cam.x) ** 2 + (pz - cam.z) ** 2 > 20 * 20) muerta = true;
      if (!muerta && tipo === 2 && SOLIDO[this.mundo.obtener(Math.floor(px), Math.floor(py - 0.1), Math.floor(pz))]) muerta = true;
      if (muerta) {
        const u = --this.n;
        if (i !== u) {
          for (let c = 0; c < 3; c++) { this.pos[i * 3 + c] = this.pos[u * 3 + c]; this.vel[i * 3 + c] = this.vel[u * 3 + c]; }
          for (let c = 0; c < 4; c++) this.col[i * 4 + c] = this.col[u * 4 + c];
          this.tam[i] = this.tam[u]; this.emis[i] = this.emis[u]; this.vida[i] = this.vida[u]; this.vida0[i] = this.vida0[u];
          this.a0[i] = this.a0[u]; this.tam0[i] = this.tam0[u]; this.tam1[i] = this.tam1[u];
          this.grav[i] = this.grav[u]; this.arrastre[i] = this.arrastre[u]; this.tipo[i] = this.tipo[u];
        }
        continue;
      }
      const k = i * 3;
      const f = Math.exp(-this.arrastre[i] * dt);
      this.vel[k] *= f; this.vel[k + 1] = this.vel[k + 1] * f + this.grav[i] * dt; this.vel[k + 2] *= f;
      if (tipo === 2) { // las hojas se balancean al caer
        this.vel[k] += Math.sin(this.t * 3 + i) * 0.9 * dt; this.vel[k + 2] += Math.cos(this.t * 2.6 + i * 1.7) * 0.9 * dt;
      }
      this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt;
      const t = 1 - this.vida[i] / this.vida0[i];
      this.tam[i] = this.tam0[i] + (this.tam1[i] - this.tam0[i]) * t;
      let a = this.a0[i] * Math.min(1, t * 8) * (1 - sstep(0.5, 1, t));
      if (tipo === 1) a *= 0.7 + 0.3 * Math.sin(this.t * 2 + i); // el polvo titila
      this.col[i * 4 + 3] = a;
      i++;
    }
    this.puntos.geometry.setDrawRange(0, this.n);
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aTam.needsUpdate = this.aEmis.needsUpdate = true;
  }

  limpiar() { this.n = 0; }
}
