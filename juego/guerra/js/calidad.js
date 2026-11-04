// Aplica los ajustes gráficos al renderizador, luces, efectos y cielo; sombras que siguen al jugador;
// contador de FPS y bajada automática de calidad si el juego va lento.
import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';
import { Ajustes, ORDEN_PRESETS, PRESETS, PALETAS } from './ajustes.js';

export class Calidad {
  // env = { renderer, camera, escena, sol, efectos, cielo, tactil, activo(), recargarTerreno(), aviso(txt), canvas }
  constructor(env) {
    this.env = env;
    this.sombrasAntes = -1;
    this.radio = 320;
    this.acum = 0;
    this.n = 0;
    this.malos = 0;
    this.fps = 60;
    this.tFps = 0;
    this.limiteMs = 0;
    this.elFps = document.createElement('div');
    this.elFps.id = 'contFps';
    this.elFps.className = 'oculto';
    document.body.appendChild(this.elFps);
    env.escena.add(env.sol.target);
  }

  terrenoOpc() {
    const G = Ajustes.d().grafico;
    return { detalle: !!G.detalle, aguaShader: G.agua === 'shader', arboles: G.arboles };
  }

  pixelRatio() {
    const G = Ajustes.d().grafico;
    return Math.max(0.4, Math.min((devicePixelRatio || 1) * G.resolucion, this.env.tactil ? 1.5 : 2.5));
  }

  aplicar() {
    const { renderer, camera, sol, efectos, cielo, escena } = this.env;
    const A = Ajustes.d(), G = A.grafico, X = A.acces;
    renderer.setPixelRatio(this.pixelRatio());
    renderer.setSize(innerWidth, innerHeight, false);
    camera.far = CONFIG.vista.lejos * Math.max(0.6, G.distancia);
    camera.updateProjectionMatrix();
    this.distancia = Math.max(0.5, G.distancia);
    if (escena.fog && this.env.mapa()) escena.fog.density = this.env.mapa().niebla / this.distancia;
    // sombras
    const n = G.sombras | 0;
    renderer.shadowMap.enabled = n > 0;
    renderer.shadowMap.type = n >= 2048 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    sol.castShadow = n > 0;
    if (n > 0 && sol.shadow.mapSize.x !== n) {
      sol.shadow.mapSize.set(n, n);
      if (sol.shadow.map) { sol.shadow.map.dispose(); sol.shadow.map = null; }
    }
    sol.shadow.bias = -0.0004;
    sol.shadow.normalBias = 0.6;
    if ((n > 0) !== (this.sombrasAntes > 0)) {
      escena.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) m.needsUpdate = true; });
    }
    this.sombrasAntes = n;
    // efectos
    const red = !!X.reducir;
    efectos.densidad(G.particulas * (red ? 0.6 : 1));
    efectos.escalaSacudida = red ? 0.12 : 1;
    this.env.ctx.reducirEfectos = red;
    cielo.usarVolumetricas(G.nubes === 'vol');
    this.limiteMs = G.fps > 0 ? 1000 / G.fps - 1.5 : 0;
    this.elFps.classList.toggle('oculto', !G.mostrarFps);
    // accesibilidad
    document.body.classList.toggle('textoGrande', !!X.texto);
    const P = PALETAS[X.daltonismo] || PALETAS.ninguno;
    const st = document.documentElement.style;
    st.setProperty('--aliado', P.aliado);
    st.setProperty('--enemigo', P.enemigo);
    st.setProperty('--objetivo', P.objetivo);
    this.paleta = P;
    // si cambió algo del terreno hay que regenerarlo
    const t = this.env.terrenoActual();
    const o = this.terrenoOpc();
    if (t && (t.opc.detalle !== o.detalle || t.opc.aguaShader !== o.aguaShader || t.opc.arboles !== o.arboles)) this.env.recargarTerreno();
  }

  // Las sombras siguen a la cámara; radio en metros
  sombra(centro, radio = this.radio) {
    const { sol, cielo } = this.env;
    if (!sol.castShadow) return;
    const c = sol.shadow.camera;
    if (c.right !== radio) { c.left = -radio; c.right = radio; c.top = radio; c.bottom = -radio; c.near = 10; c.far = radio * 4 + 800; c.updateProjectionMatrix(); }
    const tex = (radio * 2) / sol.shadow.mapSize.x;
    const x = Math.round(centro.x / tex) * tex, y = Math.round(centro.y / tex) * tex, z = Math.round(centro.z / tex) * tex;
    sol.target.position.set(x, y, z);
    sol.position.set(x, y, z).addScaledVector(cielo.dirSol, radio * 2 + 400);
    sol.target.updateMatrixWorld();
  }

  // Cada cuadro. Devuelve false si hay que saltarse el dibujo (límite de FPS)
  cuadro(ahora, dt) {
    this.tFps += dt;
    this.nf = (this.nf || 0) + 1;
    if (this.tFps >= 0.5) {
      this.fps = this.nf / this.tFps;
      this.nf = 0;
      this.tFps = 0;
      if (Ajustes.d().grafico.mostrarFps) this.elFps.textContent = Math.round(this.fps) + ' FPS';
      if (Ajustes.d().grafico.auto && this.env.activo()) {
        this.malos = this.fps < 34 ? this.malos + 1 : 0;
        if (this.malos >= 5) this.bajar();
      } else this.malos = 0;
    }
  }

  bajar() {
    this.malos = 0;
    const G = Ajustes.d().grafico;
    const i = ORDEN_PRESETS.indexOf(G.preset);
    const actual = i < 0 ? 2 : i;
    if (actual === 0) {
      if (G.resolucion > 0.6) { Ajustes.poner('grafico', 'resolucion', 0.6); this.env.aviso('CALIDAD AUTOMÁTICA: RESOLUCIÓN REDUCIDA'); }
      return;
    }
    const sig = ORDEN_PRESETS[actual - 1];
    const antes = G.antialias;
    Ajustes.preset(sig);
    G.antialias = antes;
    this.env.aviso('CALIDAD AUTOMÁTICA: ' + sig.toUpperCase());
  }
}

void PRESETS;
