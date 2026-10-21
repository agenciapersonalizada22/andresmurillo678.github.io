// =============================================================
//  🟫  TABLERO 3D
//  Superficie con textura, marco biselado con letras y números,
//  mesa, y las marcas de casillas (selección, destinos, última
//  jugada, jaque). Casilla 0 = a1 = (x -3.5, z +3.5); y = 0 es la
//  superficie del tablero.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { texturaTablero, texturaMaterial, texturaEtiquetas, texturaMarca } from './texturas.js';

export const aMundo = (sq) => ({ x: (sq & 7) - 3.5, z: 3.5 - (sq >> 3) });
export const deMundo = (x, z) => {
  const f = Math.floor(x + 4), r = Math.floor(4 - z);
  return f < 0 || f > 7 || r < 0 || r > 7 ? -1 : r * 8 + f;
};

const MARCO = 9.5;     // lado exterior del marco
const GROSOR = 0.2;

export class Tablero3D {
  constructor() {
    this.grupo = new THREE.Group();
    this.tema = null;
    this.casillas = [];   // mallas de marca grandes (selección, última, jaque, hover)
    this.puntos = [];     // marcas de destino
    this.piezasMarcas = {};
    this.vivos = [];      // texturas y materiales por liberar al cambiar de tema
    this._crearMarcas();
  }

  _crearMarcas() {
    const g = new THREE.PlaneGeometry(0.98, 0.98);
    g.rotateX(-Math.PI / 2);
    const gp = new THREE.PlaneGeometry(0.4, 0.4);
    gp.rotateX(-Math.PI / 2);
    const ga = new THREE.PlaneGeometry(0.94, 0.94);
    ga.rotateX(-Math.PI / 2);
    const gj = new THREE.PlaneGeometry(1.9, 1.9);
    gj.rotateX(-Math.PI / 2);
    this.geoMarca = g; this.geoPunto = gp; this.geoAnillo = ga; this.geoJaque = gj;
    this.marcas = new THREE.Group();
    for (let sq = 0; sq < 64; sq++) {
      const { x, z } = aMundo(sq);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
      m.position.set(x, 0.012, z);
      m.visible = false;
      m.renderOrder = 2;
      const p = new THREE.Mesh(gp, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
      p.position.set(x, 0.016, z);
      p.visible = false;
      p.renderOrder = 3;
      this.marcas.add(m, p);
      this.casillas.push(m); this.puntos.push(p);
    }
    this.grupo.add(this.marcas);
  }

  aplicarTema(tema, calidad) {
    this.tema = tema;
    for (const o of this.vivos) o.dispose();
    this.vivos = [];
    if (this.cuerpo) {
      this.grupo.remove(this.cuerpo);
      this.cuerpo.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    const cuerpo = new THREE.Group();
    this.cuerpo = cuerpo;
    const guardar = (o) => { this.vivos.push(o); return o; };

    const texT = guardar(texturaTablero(tema, calidad.textura));
    const neon = tema.tablero.tipo === 'neon';
    const sup = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      guardar(new THREE.MeshPhysicalMaterial({
        map: texT, roughness: neon ? 0.28 : 0.42, metalness: 0, clearcoat: neon ? 0.9 : 0.55, clearcoatRoughness: 0.18, envMapIntensity: 0.9,
      })),
    );
    sup.rotation.x = -Math.PI / 2;
    sup.receiveShadow = true;
    cuerpo.add(sup);

    // Marco con bisel (extrusión con hueco)
    const forma = new THREE.Shape();
    const h = MARCO / 2, r = 0.22;
    forma.moveTo(-h + r, -h); forma.lineTo(h - r, -h); forma.quadraticCurveTo(h, -h, h, -h + r);
    forma.lineTo(h, h - r); forma.quadraticCurveTo(h, h, h - r, h); forma.lineTo(-h + r, h);
    forma.quadraticCurveTo(-h, h, -h, h - r); forma.lineTo(-h, -h + r); forma.quadraticCurveTo(-h, -h, -h + r, -h);
    const hueco = new THREE.Path();
    hueco.moveTo(-4, -4); hueco.lineTo(-4, 4); hueco.lineTo(4, 4); hueco.lineTo(4, -4); hueco.lineTo(-4, -4);
    forma.holes.push(hueco);
    const geoMarco = new THREE.ExtrudeGeometry(forma, { depth: GROSOR, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 8 });
    geoMarco.rotateX(-Math.PI / 2);
    geoMarco.translate(0, -GROSOR + 0.02, 0);
    const mc = tema.marco;
    const texM = guardar(texturaMaterial(mc.tipo, Math.min(1024, calidad.textura), mc.base, mc.veta, 7, 0.16));
    const marco = new THREE.Mesh(geoMarco, guardar(new THREE.MeshPhysicalMaterial({
      map: texM, roughness: 0.4 - mc.brillo * 0.2, clearcoat: mc.brillo, clearcoatRoughness: 0.2, envMapIntensity: 0.9,
    })));
    marco.castShadow = true; marco.receiveShadow = true;
    cuerpo.add(marco);

    // Letras y números sobre el marco
    const texL = guardar(texturaEtiquetas(tema, MARCO, 8, Math.min(1024, calidad.textura * 2)));
    const et = new THREE.Mesh(
      new THREE.PlaneGeometry(MARCO, MARCO),
      guardar(new THREE.MeshBasicMaterial({ map: texL, transparent: true, depthWrite: false, toneMapped: false })),
    );
    et.rotation.x = -Math.PI / 2; et.position.y = 0.075; et.renderOrder = 1;
    cuerpo.add(et);

    if (neon) {
      const luz = guardar(new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3df5ff).multiplyScalar(1.6), toneMapped: false }));
      const mag = guardar(new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff4fd8).multiplyScalar(1.4), toneMapped: false }));
      const lado = (w, d, x, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.035, d), m); b.position.set(x, 0.06, z); cuerpo.add(b); };
      lado(8.1, 0.04, 0, -4.02, luz); lado(8.1, 0.04, 0, 4.02, luz); lado(0.04, 8.1, -4.02, 0, luz); lado(0.04, 8.1, 4.02, 0, luz);
      const e = MARCO / 2 - 0.02;
      lado(MARCO - 0.1, 0.04, 0, -e, mag); lado(MARCO - 0.1, 0.04, 0, e, mag); lado(0.04, MARCO - 0.1, -e, 0, mag); lado(0.04, MARCO - 0.1, e, 0, mag);
    }
    this.grupo.add(cuerpo);

    // Marcas
    for (const o of Object.values(this.piezasMarcas)) { if (o.map) o.map.dispose(); o.dispose(); }
    const rs = tema.resalte;
    const mk = (tipo, color, op) => {
      const t = texturaMarca(tipo, color);
      return new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: op, depthWrite: false, toneMapped: false });
    };
    this.piezasMarcas = {
      seleccion: mk('cuadro', rs.seleccion, 0.85),
      ultima: mk('cuadro', rs.ultima, 0.55),
      jaque: mk('suave', rs.jaque, 0.95),
      hover: mk('cuadro', '#ffffff', 0.18),
      pista: mk('cuadro', rs.destino, 0.9),
      destino: mk('punto', rs.destino, 0.9),
      captura: mk('anillo', rs.captura, 0.95),
    };
  }

  // estado: { seleccion, destinos: [{sq, captura}], ultima: [a, b], jaque, hover }
  marcar(estado) {
    for (let i = 0; i < 64; i++) { this.casillas[i].visible = false; this.puntos[i].visible = false; }
    const pm = this.piezasMarcas;
    const poner = (sq, tipo) => {
      if (sq < 0 || sq > 63) return;
      const m = this.casillas[sq];
      m.material = pm[tipo]; m.geometry = tipo === 'jaque' ? this.geoJaque : this.geoMarca; m.visible = true;
      m.renderOrder = tipo === 'jaque' ? 4 : 2;
    };
    if (estado.hover >= 0 && estado.hover !== undefined) poner(estado.hover, 'hover');
    if (estado.ultima) for (const s of estado.ultima) poner(s, 'ultima');
    if (estado.jaque >= 0 && estado.jaque !== undefined) poner(estado.jaque, 'jaque');
    if (estado.pista) for (const s of estado.pista) poner(s, 'pista');
    if (estado.seleccion >= 0 && estado.seleccion !== undefined) poner(estado.seleccion, 'seleccion');
    for (const d of estado.destinos || []) {
      const p = this.puntos[d.sq];
      p.material = pm[d.captura ? 'captura' : 'destino'];
      p.geometry = d.captura ? this.geoAnillo : this.geoPunto;
      p.visible = true;
    }
  }
}
