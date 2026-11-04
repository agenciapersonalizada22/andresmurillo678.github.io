// =============================================================
//  👁  VISTA
//  Une todo lo 3D: renderizador, cámara, entorno, tablero y piezas.
//  Solo dibuja cuando algo cambia (ahorra batería en el celular).
//  La lógica del juego vive en principal.js; aquí solo se muestra.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CALIDADES, calidadEfectiva } from './config.js';
import { TEMAS, temaEfectivo } from './temas.js';
import { Camara } from './camara.js';
import { Entorno } from './entorno.js';
import { Tablero3D, deMundo, aMundo } from './tablero3d.js';
import { Piezas3D } from './piezas3d.js';
import { Chispas } from './chispas.js';

export class Vista {
  constructor(contenedor, { calidad = 'media', tema = 'clasico', set3d = 'tema', daltonico = 'no', limiteFps = 0, reducir = false, coordenadas = true } = {}) {
    this.contenedor = contenedor;
    this.cal = typeof calidad === 'object' ? calidad : (CALIDADES.find((c) => c.id === calidad) || CALIDADES[1]);
    this.temaId = TEMAS[tema] ? tema : 'clasico';
    this.set3d = set3d; this.daltonico = daltonico; this.limiteFps = limiteFps; this.reducir = reducir;
    this.sacudida = 0; this.fpsMedia = 60; this.ultimoCuadro = 0; this.alFps = null; this.alDibujar = null;
    this.sucio = true;
    this.escena = new THREE.Scene();
    this.camara3 = new THREE.PerspectiveCamera(34, 1, 0.5, 120);
    this.camara = new Camara(this.camara3);
    this.rayo = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.reloj = new THREE.Clock();
    this.onFrame = null;
    this.contextoPerdido = false;

    this._crearRenderer();
    this.chispas = new Chispas();
    this.escena.add(this.chispas.puntos);
    this.entorno = new Entorno(this.escena, this.renderer);
    this.tablero = new Tablero3D();
    this.tablero.coordenadas = coordenadas;
    this.chispas.activo = this.cal.particulas !== false && !reducir;
    this.entorno.reducir = reducir;
    this.piezas = new Piezas3D(this.chispas);
    this.escena.add(this.tablero.grupo, this.piezas.grupo);

    this.fijarTema(this.temaId);
    this._observar();
    this._bucle = this._bucle.bind(this);
    requestAnimationFrame(this._bucle);
  }

  get lienzo() { return this.renderer.domElement; }

  _crearRenderer() {
    const lienzo = document.createElement('canvas');
    lienzo.id = 'lienzo';
    lienzo.setAttribute('aria-label', 'Tablero de ajedrez en 3D');
    const r = new THREE.WebGLRenderer({ canvas: lienzo, antialias: this.cal.antialias, powerPreference: 'high-performance', alpha: false });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer = r;
    this.antialiasActual = this.cal.antialias;
    lienzo.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.contextoPerdido = true; });
    lienzo.addEventListener('webglcontextrestored', () => { this.contextoPerdido = false; this.fijarTema(this.temaId); this.pedir(); });
    const viejo = this.contenedor.querySelector('canvas');
    if (viejo) viejo.replaceWith(lienzo); else this.contenedor.prepend(lienzo);
    this._ajustarTamano();
  }

  _observar() {
    if (window.ResizeObserver) {
      this.obs = new ResizeObserver(() => this._ajustarTamano());
      this.obs.observe(this.contenedor);
    }
    window.addEventListener('resize', () => this._ajustarTamano());
  }

  _ajustarTamano() {
    const w = Math.max(1, this.contenedor.clientWidth), h = Math.max(1, this.contenedor.clientHeight);
    const pr = Math.min(window.devicePixelRatio || 1, this.cal.pixelRatio);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camara.ajustar(w / h);
    this.pedir();
  }

  pedir() { this.sucio = true; }

  fijarTema(id) {
    this.temaId = TEMAS[id] ? id : 'clasico';
    const t = temaEfectivo(this.temaId, this.set3d, this.daltonico);
    this.entorno.aplicarTema(t, this.cal);
    this.entorno.aplicarCalidad(this.cal);
    this.tablero.aplicarTema(t, this.cal);
    this.piezas.aplicarTema(t, this.cal, t.luz.entorno);
    this.pedir();
  }

  fijarOpciones(o) {
    if (o.set3d !== undefined) this.set3d = o.set3d;
    if (o.daltonico !== undefined) this.daltonico = o.daltonico;
    if (o.limiteFps !== undefined) this.limiteFps = o.limiteFps;
    if (o.reducir !== undefined) { this.reducir = o.reducir; this.entorno.reducir = o.reducir; this.chispas.activo = this.cal.particulas !== false && !o.reducir; }
    if (o.coordenadas !== undefined) { this.tablero.coordenadas = o.coordenadas; if (this.tablero.etiquetas) this.tablero.etiquetas.visible = o.coordenadas; }
    this.fijarTema(this.temaId);
  }

  sacudir(a = 0.12) { if (!this.reducir) { this.sacudida = a; this.pedir(); } }

  // Posición en pantalla (px, relativa al contenedor) del centro de una casilla
  pantallaDe(sq, y = 0) {
    const { x, z } = aMundo(sq);
    const v = new THREE.Vector3(x, y, z).project(this.camara3);
    return { x: (v.x + 1) / 2 * this.contenedor.clientWidth, y: (1 - v.y) / 2 * this.contenedor.clientHeight };
  }

  fijarCalidad(arg) {
    const c = typeof arg === 'object' ? arg : CALIDADES.find((x) => x.id === arg);
    if (!c) return;
    this.chispas.activo = c.particulas !== false && !this.reducir;
    const reiniciar = c.antialias !== this.antialiasActual;
    this.cal = c;
    if (reiniciar) {
      const viejo = this.renderer;
      this._crearRenderer();
      viejo.dispose();
      if (viejo.forceContextLoss) viejo.forceContextLoss();
      this.entorno.renderer = this.renderer;
      this.entorno.pmrem.dispose();
      this.entorno.pmrem = new THREE.PMREMGenerator(this.renderer);
      this.entorno.luzClave.shadow.map = null;
      this.onLienzoNuevo?.(this.renderer.domElement);
    }
    this._ajustarTamano();
    this.fijarTema(this.temaId);
  }

  fijarVista(nombre, inmediato = false) { this.camara.ir(nombre, inmediato); this.pedir(); }
  marcar(estado) { this.tablero.marcar(estado); this.pedir(); }
  sincronizar(b, pop = true) { this.piezas.sincronizar(b, pop); this.pedir(); }
  jugar(m, bAntes) { this.pedir(); return this.piezas.jugar(m, bAntes); }

  _rayo(cx, cy) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.rayo.setFromCamera(this.ndc, this.camara3);
  }

  // Casilla y si se tocó una pieza: { sq, pieza }
  recoger(cx, cy) {
    this._rayo(cx, cy);
    const mallas = this.piezas.mallas.filter(Boolean);
    const golpes = this.rayo.intersectObjects(mallas, true);
    if (golpes.length) {
      let o = golpes[0].object;
      while (o && o.userData.sq === undefined) o = o.parent;
      if (o) return { sq: o.userData.sq, pieza: true };
    }
    const p = this.puntoEnPlano(cx, cy, 0);
    return { sq: p ? deMundo(p.x, p.z) : -1, pieza: false };
  }

  puntoEnPlano(cx, cy, y) {
    this._rayo(cx, cy);
    this.plano.constant = -y;
    const p = new THREE.Vector3();
    return this.rayo.ray.intersectPlane(this.plano, p) ? p : null;
  }

  _bucle() {
    requestAnimationFrame(this._bucle);
    if (this.contextoPerdido) return;
    const ahora0 = performance.now();
    if (this.limiteFps && ahora0 - this.ultimoCuadro < 1000 / this.limiteFps - 2) return;
    const dt = Math.min(0.05, this.reloj.getDelta());
    let activo = this.sucio;
    if (this.camara.actualizar(dt)) activo = true;
    if (this.piezas.actualizar(dt)) activo = true;
    if (this.chispas.actualizar(dt)) activo = true;
    if (this.onFrame && this.onFrame(dt)) activo = true;
    const ambiente = this.entorno.actualizar(dt);
    const ahora = performance.now();
    // si solo se mueven las motas de polvo, basta con unos 20 cuadros por segundo
    if (!activo && !(ambiente && ahora - (this.ultimo || 0) > 48)) return;
    this.sucio = false;
    this.ultimo = ahora;
    let sac = null;
    if (this.sacudida > 0.002) {
      sac = this.camara3.position.clone();
      this.camara3.position.x += (Math.random() - 0.5) * this.sacudida;
      this.camara3.position.y += (Math.random() - 0.5) * this.sacudida;
      this.camara3.updateMatrixWorld();
      this.sacudida *= Math.exp(-dt * 7);
      this.sucio = true;
    } else this.sacudida = 0;
    this.renderer.render(this.escena, this.camara3);
    if (sac) { this.camara3.position.copy(sac); this.camara3.updateMatrixWorld(); }
    if (this.alDibujar) this.alDibujar();
    // FPS medio solo con animaciones seguidas (cuadros consecutivos)
    if (this.ultimoCuadro && ahora - this.ultimoCuadro < 80) {
      this.fpsMedia += (1000 / Math.max(1, ahora - this.ultimoCuadro) - this.fpsMedia) * 0.06;
      if (this.alFps) this.alFps(this.fpsMedia);
    }
    this.ultimoCuadro = ahora;
  }
}
