// =============================================================
//  👁  VISTA
//  Une todo lo 3D: renderizador, cámara, entorno, tablero y piezas.
//  Solo dibuja cuando algo cambia (ahorra batería en el celular).
//  La lógica del juego vive en principal.js; aquí solo se muestra.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { CALIDADES } from './config.js';
import { TEMAS } from './temas.js';
import { Camara } from './camara.js';
import { Entorno } from './entorno.js';
import { Tablero3D, deMundo } from './tablero3d.js';
import { Piezas3D } from './piezas3d.js';
import { Chispas } from './chispas.js';

export class Vista {
  constructor(contenedor, { calidad = 'media', tema = 'clasico' } = {}) {
    this.contenedor = contenedor;
    this.cal = CALIDADES.find((c) => c.id === calidad) || CALIDADES[1];
    this.temaId = TEMAS[tema] ? tema : 'clasico';
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
    const t = TEMAS[this.temaId];
    this.entorno.aplicarTema(t, this.cal);
    this.entorno.aplicarCalidad(this.cal);
    this.tablero.aplicarTema(t, this.cal);
    this.piezas.aplicarTema(t, this.cal, t.luz.entorno);
    this.pedir();
  }

  fijarCalidad(id) {
    const c = CALIDADES.find((x) => x.id === id);
    if (!c) return;
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
    this.renderer.render(this.escena, this.camara3);
  }
}
