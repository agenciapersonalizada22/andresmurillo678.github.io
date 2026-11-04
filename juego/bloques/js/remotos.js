// =============================================================
//  👥  JUGADORES REMOTOS (multijugador)
//  Cada amigo se ve como un muñeco de cajitas con su nombre y color
//  encima, brazos y piernas que se mueven, y lo que lleva en la mano.
//  Su posición llega ~16 veces por segundo y se suaviza con Red.Interpolador.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { crearHumanoide } from './mobs.js';

const CAJA = new THREE.BoxGeometry(1, 1, 1);

function etiqueta(texto, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,0.55)';
  x.beginPath(); x.roundRect ? x.roundRect(4, 8, 248, 48, 14) : x.rect(4, 8, 248, 48); x.fill();
  x.fillStyle = color; x.font = 'bold 30px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(texto.slice(0, 16), 128, 33);
  const t = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(1.5, 0.375, 1);
  s.renderOrder = 10;
  return s;
}

export class Remotos {
  constructor(escena, colorDe) {
    this.escena = escena;
    this.colorDe = colorDe;           // (idDeObjeto) -> '#rrggbb'
    this.grupo = new THREE.Group();
    escena.add(this.grupo);
    this.mapa = new Map();
  }

  agregar(id, nombre, color) {
    if (this.mapa.has(id)) this.quitar(id);
    const g = crearHumanoide({ piel: '#c9a07a', camisa: color || '#3df5ff', pantalon: '#2a3a5a', manga: color || '#3df5ff', pelo: '#3a2a1a', ojos: '#101010' });
    g.traverse((o) => { if (o.isMesh) o.layers.enable(1); });
    const tag = etiqueta(nombre || 'Jugador', color || '#ffffff');
    tag.position.set(0, 2.35, 0);
    g.add(tag);
    const mano = new THREE.Mesh(CAJA, new THREE.MeshBasicMaterial({ color: '#888888' }));
    mano.scale.set(0.26, 0.26, 0.26); mano.position.set(0, -0.78, 0.18); mano.visible = false;
    g.userData.brazoD.add(mano);
    g.visible = false;
    this.grupo.add(g);
    this.mapa.set(id, { id, nombre, color, malla: g, mano, tag, interp: new window.Red.Interpolador({ angulos: ['ry', 'pt'] }), item: -1, fase: 0, ultimo: null, ultimoT: 0 });
  }

  quitar(id) {
    const r = this.mapa.get(id);
    if (!r) return;
    this.grupo.remove(r.malla);
    r.tag.material.map.dispose(); r.tag.material.dispose();
    this.mapa.delete(id);
  }

  limpiar() { for (const id of [...this.mapa.keys()]) this.quitar(id); }

  // d: { t, p: { x, y, z, ry, pt }, sl (id en la mano), v (1 si va en vehículo) }
  recibir(id, d) {
    const r = this.mapa.get(id);
    if (!r || !d || !d.p) return;
    r.interp.agregar(d.t, d.p);
    r.ultimoT = performance.now();
    if (d.sl !== r.item) {
      r.item = d.sl;
      if (d.sl > 0) { r.mano.material.color.set(this.colorDe(d.sl)); r.mano.visible = true; } else r.mano.visible = false;
    }
    r.enVehiculo = !!d.v;
  }

  posicion(id) {
    const r = this.mapa.get(id);
    return r && r.ultimo ? r.ultimo : null;
  }

  actualizar(dt, luz) {
    for (const r of this.mapa.values()) {
      const s = r.interp.obtener();
      if (!s) { r.malla.visible = false; continue; }
      const px = r.ultimo ? r.ultimo.x : s.x, pz = r.ultimo ? r.ultimo.z : s.z;
      r.ultimo = s;
      r.malla.visible = !r.enVehiculo;
      r.malla.position.set(s.x, s.y, s.z);
      r.malla.rotation.y = s.ry;
      const v = Math.hypot(s.x - px, s.z - pz) / Math.max(dt, 0.001);
      r.fase += v * dt * 1.4;
      const sw = Math.sin(r.fase * 3.2) * Math.min(1, v / 3) * 0.8, u = r.malla.userData;
      u.piernaI.rotation.x = sw; u.piernaD.rotation.x = -sw;
      u.brazoI.rotation.x = -sw * 0.8; u.brazoD.rotation.x = sw * 0.8 - (r.item > 0 ? 0.35 : 0);
      u.cabeza.rotation.x = Math.max(-1.2, Math.min(1.2, -(s.pt || 0)));
    }
  }
}
