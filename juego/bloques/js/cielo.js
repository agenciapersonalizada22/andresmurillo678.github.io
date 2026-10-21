// =============================================================
//  ☀️  CIELO, DÍA Y NOCHE
//  - Un domo (media esfera gigante) pinta el degradado del cielo.
//  - El sol y la luna son cuadrados que giran alrededor de ti.
//  - De noche salen estrellas y todo se oscurece.
//  - Las nubes son una capa de cuadritos que se mueve despacio.
//  La "hora" va de 0 a 1: 0 = amanecer, 0.25 = mediodía,
//  0.5 = atardecer, 0.75 = medianoche.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';
import { azarConSemilla } from './ruido.js';

// Se crean al armar el cielo (no al cargar el módulo) para que ya esté
// desactivado ColorManagement y los colores se lean tal cual están escritos.
function crearColores() {
  return {
    diaArriba: new THREE.Color('#3f8fe8'),
    diaHorizonte: new THREE.Color('#acd8ff'),
    nocheArriba: new THREE.Color('#050a1c'),
    nocheHorizonte: new THREE.Color('#16224a'),
    atardecer: new THREE.Color('#ff8a3d'),
  };
}

const suave = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function texturaCuadro(tam, pintar) {
  const c = document.createElement('canvas');
  c.width = c.height = tam;
  pintar(c.getContext('2d', { willReadFrequently: true }), tam); // en memoria normal: se sube rápido a la tarjeta
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

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
    };
    const domo = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 12),
      new THREE.ShaderMaterial({
        uniforms: this.uniformes,
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 arriba;
          uniform vec3 horizonte;
          uniform vec3 solDir;
          uniform vec3 colorAtardecer;
          uniform float fuerzaAtardecer;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 c = mix(horizonte, arriba, pow(clamp(h, 0.0, 1.0), 0.6));
            float s = max(dot(d, solDir), 0.0);
            float banda = smoothstep(-0.02, 0.12, h) * (1.0 - clamp(h * 2.5, 0.0, 1.0));
            c += colorAtardecer * fuerzaAtardecer * (0.25 * banda + 0.75 * pow(s, 5.0) * banda);
            gl_FragColor = vec4(c, 1.0);
          }`,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
      }));
    domo.renderOrder = -10;
    domo.frustumCulled = false;
    this.domo = domo;
    escena.add(domo);

    // Sol: cuadrado brillante con un halo
    const texSol = texturaCuadro(32, (ctx, n) => {
      ctx.fillStyle = 'rgba(255, 236, 160, 0.18)';
      ctx.fillRect(0, 0, n, n);
      ctx.fillStyle = 'rgba(255, 240, 180, 0.35)';
      ctx.fillRect(4, 4, n - 8, n - 8);
      ctx.fillStyle = '#fff8d8';
      ctx.fillRect(9, 9, n - 18, n - 18);
    });
    this.sol = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: texSol, transparent: true, fog: false, depthWrite: false }));
    this.sol.renderOrder = -9;
    this.sol.frustumCulled = false;
    escena.add(this.sol);

    // Luna: cuadrado gris con cráteres
    const texLuna = texturaCuadro(16, (ctx) => {
      ctx.fillStyle = '#dfe4ee';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#b8bfcc';
      ctx.fillRect(4, 5, 3, 3);
      ctx.fillRect(9, 9, 2, 2);
      ctx.fillRect(10, 4, 2, 2);
      ctx.fillRect(5, 11, 2, 1);
    });
    this.luna = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: texLuna, transparent: true, fog: false, depthWrite: false }));
    this.luna.renderOrder = -9;
    this.luna.frustumCulled = false;
    escena.add(this.luna);

    // Estrellas
    const azar = azarConSemilla(4242);
    const pos = [];
    for (let i = 0; i < 700; i++) {
      const u = azar() * 2 - 1, a = azar() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      pos.push(r * Math.cos(a), u, r * Math.sin(a));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.materialEstrellas = new THREE.PointsMaterial({
      color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false,
    });
    this.estrellas = new THREE.Points(geo, this.materialEstrellas);
    this.estrellas.frustumCulled = false;
    this.estrellas.renderOrder = -8;
    escena.add(this.estrellas);

    // Nubes
    this.nubes = null;
    if (CONFIG.vista.nubes) {
      const tex = texturaCuadro(64, (ctx, n) => {
        const az = azarConSemilla(99);
        ctx.clearRect(0, 0, n, n);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 26; i++) {
          const x = Math.floor(az() * n), y = Math.floor(az() * n);
          const w = 3 + Math.floor(az() * 9), h = 2 + Math.floor(az() * 6);
          for (const [ox, oy] of [[0, 0], [-n, 0], [0, -n], [-n, -n]]) ctx.fillRect(x + ox, y + oy, w, h);
        }
      });
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      this.TAM_NUBES = 768;
      this.REPITE_NUBES = 3;
      tex.repeat.set(this.REPITE_NUBES, this.REPITE_NUBES);
      this.materialNubes = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide,
      });
      this.nubes = new THREE.Mesh(new THREE.PlaneGeometry(this.TAM_NUBES, this.TAM_NUBES), this.materialNubes);
      this.nubes.rotation.x = -Math.PI / 2;
      this.nubes.frustumCulled = false;
      escena.add(this.nubes);
      this.viento = 0;
    }

    this.luz = 1;
    this.factorDia = 1;
    this.escondido = false;
    this.colorNiebla = new THREE.Color();
    this.tmp = new THREE.Vector3();
  }

  // Bajo el agua se esconde todo el cielo (así se ve solo el azul del agua)
  bajoAgua(si) {
    if (si === this.escondido) return;
    this.escondido = si;
    this.domo.visible = !si;
    if (si) {
      this.sol.visible = this.luna.visible = this.estrellas.visible = false;
      if (this.nubes) this.nubes.visible = false;
    }
  }

  // Devuelve cuánta luz hay (0 a 1) y deja listo el color de la niebla
  actualizar(hora, camara, lejos, dt) {
    const ang = hora * Math.PI * 2;
    const solDir = this.uniformes.solDir.value.set(Math.cos(ang), Math.sin(ang), 0.25).normalize();
    const altura = solDir.y;
    const dia = suave(-0.18, 0.2, altura);
    const atardecer = Math.exp(-Math.pow(altura / 0.2, 2)) * (hora < 0.12 || (hora > 0.38 && hora < 0.62) ? 1 : 0.4);
    this.factorDia = dia;

    const arriba = this.uniformes.arriba.value.copy(this.colores.nocheArriba).lerp(this.colores.diaArriba, dia);
    const horizonte = this.uniformes.horizonte.value.copy(this.colores.nocheHorizonte).lerp(this.colores.diaHorizonte, dia);
    horizonte.lerp(this.colores.atardecer, atardecer * 0.35);
    arriba.lerp(this.colores.atardecer, atardecer * 0.08);
    this.uniformes.fuerzaAtardecer.value = atardecer * 0.6;
    this.colorNiebla.copy(horizonte);

    const p = camara.position;
    const r = lejos * 0.9;
    this.domo.position.copy(p);
    this.domo.scale.setScalar(r);

    const dSol = lejos * 0.8;
    this.sol.position.copy(p).addScaledVector(solDir, dSol);
    this.sol.scale.setScalar(dSol * 0.14);
    this.sol.lookAt(p);
    this.luna.position.copy(p).addScaledVector(solDir, -dSol);
    this.luna.scale.setScalar(dSol * 0.1);
    this.luna.lookAt(p);
    this.sol.visible = altura > -0.25 && !this.escondido;
    this.luna.visible = altura < 0.25 && !this.escondido;

    this.estrellas.position.copy(p);
    this.estrellas.scale.setScalar(lejos * 0.85);
    this.estrellas.rotation.set(0, 0, ang);
    this.materialEstrellas.opacity = Math.max(0, 1 - dia * 1.6);
    this.estrellas.visible = this.materialEstrellas.opacity > 0.01 && !this.escondido;

    const noche = CONFIG.dia.luzNoche;
    this.luz = noche + (1 - noche) * dia;

    if (this.nubes) {
      this.viento += dt * 1.2;
      const alturaNubes = CONFIG.vista.alturaNubes;
      this.nubes.position.set(p.x, alturaNubes, p.z);
      const tile = this.TAM_NUBES / this.REPITE_NUBES;
      this.materialNubes.map.offset.set((p.x + this.viento) / tile, -p.z / tile);
      const l = 0.35 + 0.65 * dia;
      this.materialNubes.color.setRGB(l, l, l * (dia < 0.5 ? 1.1 : 1));
      // si vuelas justo a la altura de las nubes se desvanecen (para no ver una raya)
      const cerca = Math.abs(p.y - alturaNubes);
      this.materialNubes.opacity = 0.8 * Math.min(1, Math.max(0, (cerca - 1) / 7));
      this.nubes.visible = p.y < alturaNubes + 200 && this.materialNubes.opacity > 0.01 && !this.escondido;
    }
    return this.luz;
  }
}
