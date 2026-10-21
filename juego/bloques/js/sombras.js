// =============================================================
//  🌓  SOMBRAS DEL SOL
//  Se dibuja el mundo una vez desde el sol (solo la profundidad) y
//  después, al dibujar de verdad, cada pixel mira ese dibujo para
//  saber si el sol lo alcanza. Hay dos "cascadas": una chica y
//  nítida alrededor de ti y una grande y más borrosa para lo lejano.
//  La imagen se mueve de a "texeles" enteros para que las sombras
//  no tiemblen cuando caminas. Los bordes salen suaves (promedio de
//  8 lecturas giradas al azar por pixel).
// =============================================================
import * as THREE from '../lib/three.module.min.js';

const FONDO = 170; // hasta dónde atrás del centro se dibujan cosas que dan sombra

function crearObjetivo(tam) {
  const dt = new THREE.DepthTexture(tam, tam);
  dt.type = THREE.UnsignedIntType;
  dt.minFilter = dt.magFilter = THREE.NearestFilter;
  const rt = new THREE.WebGLRenderTarget(tam, tam, { depthTexture: dt, depthBuffer: true });
  rt.texture.minFilter = rt.texture.magFilter = THREE.NearestFilter;
  return rt;
}

export class Sombras {
  constructor(renderer, escena, uniformes) {
    this.renderer = renderer;
    this.escena = escena;
    this.u = uniformes;
    this.cascadas = 0;
    this.tam = 0;
    this.objetivos = [];
    this.camaras = [];
    this.rango = [40, 90];
    this.cuadro = 0;
    this.ultimaClave = ['', ''];
    this.dummy = new THREE.DepthTexture(1, 1);
    uniformes.uSombra0.value = this.dummy;
    uniformes.uSombra1.value = this.dummy;
    this.right = new THREE.Vector3();
    this.up = new THREE.Vector3();
    this.fwd = new THREE.Vector3();
    this.foco = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    this.mat = new THREE.Matrix4();
  }

  // cascadas: 0 apagadas, 1 una, 2 dos
  configurar(cascadas, tam, rango) {
    if (cascadas === this.cascadas && tam === this.tam && rango[0] === this.rango[0] && rango[1] === this.rango[1]) return;
    for (const o of this.objetivos) { o.depthTexture.dispose(); o.dispose(); }
    this.objetivos = [];
    this.camaras = [];
    this.cascadas = cascadas;
    this.tam = tam;
    this.rango = rango.slice();
    this.ultimaClave = ['', ''];
    const u = this.u;
    u.uUsaSombra.value = cascadas > 0 ? 1 : 0;
    u.uNumCasc.value = cascadas;
    u.uSombra0.value = this.dummy;
    u.uSombra1.value = this.dummy;
    for (let i = 0; i < cascadas; i++) {
      const rt = crearObjetivo(tam);
      this.objetivos.push(rt);
      const E = i === 0 ? rango[0] : rango[1];
      const cam = new THREE.OrthographicCamera(-E, E, E, -E, 1, FONDO * 2);
      cam.layers.set(1);
      this.camaras.push(cam);
    }
    if (cascadas > 0) {
      u.uSombra0.value = this.objetivos[0].depthTexture;
      if (cascadas > 1) u.uSombra1.value = this.objetivos[1].depthTexture;
    }
    // si solo hay una cascada, cubre todo el rango
    u.uSombraTexel.value.set(1 / tam, 1 / tam, (2 * rango[0]) / tam, (2 * rango[1]) / tam);
    const prof = FONDO * 2;
    u.uSombraBias.value.set(((2 * rango[0]) / tam) * 2.2 / prof, ((2 * rango[1]) / tam) * 2.2 / prof);
  }

  // Coloca la cámara del sol para la cascada i (ajustada a texeles enteros)
  colocar(i, camara, luzDir) {
    const cam = this.camaras[i];
    const E = i === 0 ? this.rango[0] : this.rango[1];
    const fwd = this.fwd.copy(luzDir).negate();   // hacia donde viaja la luz
    const right = this.right.crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const up = this.up.crossVectors(right, fwd).normalize();
    // el centro va un poco adelante de la cámara (se ve más hacia donde miras)
    camara.getWorldDirection(this.tmp);
    this.foco.copy(camara.position).addScaledVector(this.tmp, E * 0.28);
    this.foco.y = Math.max(this.foco.y * 0.6 + camara.position.y * 0.4, 0);
    const texel = (2 * E) / this.tam;
    const cx = Math.round(this.foco.dot(right) / texel) * texel;
    const cy = Math.round(this.foco.dot(up) / texel) * texel;
    const cz = this.foco.dot(fwd);
    const centro = this.tmp.copy(right).multiplyScalar(cx).addScaledVector(up, cy).addScaledVector(fwd, cz);
    cam.position.copy(centro).addScaledVector(fwd, -FONDO);
    cam.up.copy(up);
    cam.lookAt(centro);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    return `${cx.toFixed(3)},${cy.toFixed(3)},${fwd.x.toFixed(3)},${fwd.y.toFixed(3)}`;
  }

  // Dibuja los mapas de sombra que hagan falta. "dinamico" = hay cosas que se mueven (vehículos...)
  actualizar(camara, luzDir, versionMundo, dinamico, intensidad) {
    if (this.cascadas === 0) return;
    this.u.uUsaSombra.value = intensidad > 0.02 ? 1 : 0;
    if (intensidad <= 0.02) return;
    this.cuadro++;
    const r = this.renderer;
    const anteriorObjetivo = r.getRenderTarget();
    this.u.uPaso.value = 1;
    // mientras se dibuja en un mapa de sombra no se puede leer de él (sería un círculo)
    this.u.uSombra0.value = this.dummy;
    this.u.uSombra1.value = this.dummy;
    for (let i = 0; i < this.cascadas; i++) {
      const clave = this.colocar(i, camara, luzDir) + '|' + versionMundo;
      const cambio = clave !== this.ultimaClave[i];
      // la cascada chica se repite si algo se mueve; la grande se refresca de a poco
      const toca = i === 0 ? (cambio || dinamico) : (cambio && this.cuadro % 3 === 0) || this.cuadro % 24 === 0 || this.ultimaClave[i] === '';
      if (!toca) continue;
      this.ultimaClave[i] = clave;
      // la matriz del shader solo cambia cuando el mapa se vuelve a dibujar (si no, se desfasan)
      const cam = this.camaras[i];
      (i === 0 ? this.u.uMatSombra0.value : this.u.uMatSombra1.value).multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      r.setRenderTarget(this.objetivos[i]);
      r.clear(true, true, false);
      r.render(this.escena, this.camaras[i]);
    }
    this.u.uPaso.value = 0;
    this.u.uSombra0.value = this.objetivos[0].depthTexture;
    if (this.cascadas > 1) this.u.uSombra1.value = this.objetivos[1].depthTexture;
    r.setRenderTarget(anteriorObjetivo);
  }
}
