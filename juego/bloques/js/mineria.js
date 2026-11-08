// =============================================================
//  ⛏️  MINERÍA
//  Cuánto tarda en romperse cada bloque, con qué herramienta se
//  rompe mejor y qué suelta. Con la mano todo se puede romper,
//  pero la piedra y los minerales piden pico (y de buen material
//  para los minerales buenos) o no sueltan nada.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { B, BLOQUES, BASE, DIBUJO, DIBUJO_PLANTA } from './bloques.js';
import { idInventario } from './objetos.js';

const NINGUNA = 0, PICO = 1, HACHA = 2, PALA = 3;
const NOMBRE_HERR = [null, 'pico', 'hacha', 'pala'];

const dureza = new Float32Array(256);
const herr = new Uint8Array(256);
const tierMin = new Uint8Array(256);
const requiere = new Uint8Array(256);

function fijar(ids, d, h, tier = 0, pide = false) {
  for (const id of [].concat(ids)) { dureza[id] = d; herr[id] = h; tierMin[id] = tier; requiere[id] = pide ? 1 : 0; }
}

for (const b of BLOQUES) {
  if (!b) continue;
  const id = b.id, c = b.clave || '';
  let d = 1, h = NINGUNA, pide = false, tier = 0;
  if (b.dibujo === 'planta') d = 0;
  else if (/^(pasto|tierra|camino|cultivo|arena|grava|nieve)/.test(c)) { d = c === 'nieve' ? 0.2 : 0.55; h = PALA; }
  else if (/^(tronco|tablas|valla|mesa|cofre|puerta|estanteria|escalera_tablas|escalera_oscura|losa_tablas)/.test(c)) { d = /^(puerta)/.test(c) ? 3 : 2; h = HACHA; }
  else if (/^(calabaza|paja|cactus)/.test(c)) { d = c === 'cactus' ? 0.4 : 1; h = HACHA; }
  else if (/^(hojas)/.test(c)) d = 0.2;
  else if (/^(lana|cama)/.test(c)) d = c.startsWith('cama') ? 0.2 : 0.8;
  else if (/^(vidrio|cristal|piedra_luminosa)/.test(c)) d = 0.3;
  else if (/^(hielo)/.test(c)) { d = 0.5; h = PICO; }
  else if (c === 'antorcha' || c === 'agua_puesta' || c === 'agua') d = 0;
  else if (c.startsWith('riel')) { d = 0.7; h = PICO; }
  else { d = 1.5; h = PICO; pide = true; }   // piedra, ladrillos, escaleras de piedra…
  dureza[id] = d; herr[id] = h; requiere[id] = pide ? 1 : 0; tierMin[id] = tier;
}
fijar(B.ADOQUIN, 2, PICO, 0, true);
fijar(B.ADOQUIN_MUSGOSO, 2, PICO, 0, true);
fijar(B.LADRILLO, 2, PICO, 0, true);
fijar(B.CARBON, 3, PICO, 0, true);
fijar(B.HIERRO, 3, PICO, 1, true);
fijar(B.ORO, 3, PICO, 2, true);
fijar(B.MINERAL_DIAMANTE, 3.5, PICO, 2, true);
fijar(B.MINERAL_ESMERALDA, 3.5, PICO, 2, true);
fijar(B.OBSIDIANA, 25, PICO, 3, true);
fijar(B.HORNO, 3.5, PICO, 0, true);
fijar(B.MESA_TRABAJO, 2.5, HACHA);
fijar(B.ARENISCA, 0.8, PICO, 0, true);
fijar(B.LECHO, 1e9, NINGUNA);
fijar(B.REGOLITO, 0.6, PALA);
fijar([B.ROCA_LUNAR, B.ROCA_ABISMO, B.ROCA_BRASA], 1.8, PICO, 0, true);
fijar([B.HORMIGON, B.METAL, B.PLATAFORMA, B.TORRE_METAL], 2.5, PICO, 0, true);
fijar([B.PANEL_CONTROL, B.CARGADOR, B.FABRICA, B.CONSOLA_NAV, B.GENERADOR_O2], 2.5, PICO, 0, false);
fijar([B.LAVA, B.PORTAL], 0, NINGUNA);

export function propsBloque(id) {
  return { dureza: dureza[id], herr: NOMBRE_HERR[herr[id]], tier: tierMin[id], requiere: !!requiere[id] };
}

// Segundos para romper el bloque con esa herramienta (objeto de objetos.js o null)
export function tiempoRomper(id, o) {
  const d = dureza[id];
  if (d <= 0) return 0;
  const buena = !!(o && o.tipo === 'herramienta' && NOMBRE_HERR[herr[id]] === o.herr);
  const puede = !requiere[id] || (buena && o.tier >= tierMin[id]);
  const vel = buena ? o.vel : 1;
  return (d * (puede ? 1.5 : 5)) / vel;
}

export function puedeCosechar(id, o) {
  if (!requiere[id]) return true;
  return !!(o && o.tipo === 'herramienta' && NOMBRE_HERR[herr[id]] === o.herr && o.tier >= tierMin[id]);
}

// Qué suelta: [[bloque u objeto (número o clave), cantidad], …]
export function botinDeBloque(id, o, azar = Math.random) {
  if (!puedeCosechar(id, o)) return [];
  const b = BLOQUES[id];
  if (!b) return [];
  const c = b.clave || '';
  if (id === B.PASTO || id === B.CAMINO || id === B.CULTIVO) return [[B.TIERRA, 1]];
  if (id === B.PIEDRA) return [[B.ADOQUIN, 1]];
  if (id === B.CARBON) return [['carbon', 1]];
  if (id === B.HIERRO) return [['hierro_crudo', 1]];
  if (id === B.ORO) return [['oro_crudo', 1]];
  if (id === B.MINERAL_DIAMANTE) return [['diamante', 1]];
  if (id === B.MINERAL_ESMERALDA) return [['esmeralda', 1]];
  if (id === B.TRIGO) return [['trigo', 1 + (azar() < 0.3 ? 1 : 0)]];
  if (id === B.ARBUSTO_MUERTO) return azar() < 0.6 ? [['palo', 1 + (azar() < 0.4 ? 1 : 0)]] : [];
  if (id === B.PASTO_ALTO) return [];
  if (id === B.HOJAS) return azar() < 0.06 ? [['manzana', 1]] : azar() < 0.12 ? [['palo', 1]] : [];
  if (id === B.HOJAS_ABETO || id === B.HOJAS_ABEDUL) return azar() < 0.12 ? [['palo', 1]] : [];
  if (c.startsWith('vidrio') || c.startsWith('cristal') || id === B.HIELO || id === B.PIEDRA_LUMINOSA || id === B.NIEVE) return [];
  if (id === B.AGUA || id === B.AGUA_PUESTA || id === B.LECHO || id === B.LAVA || id === B.PORTAL) return [];
  if (id >= B.CAMA_CABEZA && id < B.CAMA_CABEZA + 4) return [];
  if (DIBUJO[id] === DIBUJO_PLANTA) return [[id, 1]];
  return [[idInventario(id), 1]];
}

// Cuánta durabilidad gasta romper algo con esa herramienta
export function desgasteAlRomper(o) {
  if (!o || o.tipo !== 'herramienta') return 0;
  return o.herr === 'espada' ? 2 : 1;
}

// ---- grietas que se van viendo mientras rompes
export class Grietas {
  constructor(escena) {
    const c = document.createElement('canvas');
    c.width = 32 * 10; c.height = 32;
    const x = c.getContext('2d');
    let semilla = 7;
    const az = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };
    for (let e = 0; e < 10; e++) {
      x.strokeStyle = 'rgba(0,0,0,0.85)'; x.lineWidth = 1.2;
      const n = 2 + e * 2;
      for (let k = 0; k < n; k++) {
        let px = 16 + (az() - 0.5) * 8, py = 16 + (az() - 0.5) * 8;
        let ang = az() * Math.PI * 2;
        x.beginPath(); x.moveTo(e * 32 + px, py);
        for (let s = 0; s < 3 + (e >> 1); s++) {
          ang += (az() - 0.5) * 1.2;
          px += Math.cos(ang) * (3 + az() * 3); py += Math.sin(ang) * (3 + az() * 3);
          x.lineTo(e * 32 + Math.max(0, Math.min(31, px)), Math.max(0, Math.min(31, py)));
        }
        x.stroke();
      }
    }
    this.textura = new THREE.CanvasTexture(c);
    this.textura.magFilter = THREE.NearestFilter;
    this.textura.repeat.set(0.1, 1);
    const mat = new THREE.MeshBasicMaterial({ map: this.textura, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.malla = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), mat);
    this.malla.visible = false;
    this.malla.renderOrder = 5;
    escena.add(this.malla);
  }

  // progreso de 0 a 1 (null = esconder)
  mostrar(x, y, z, progreso) {
    if (progreso === null || progreso <= 0) { this.malla.visible = false; return; }
    const e = Math.max(0, Math.min(9, Math.floor(progreso * 10)));
    this.textura.offset.x = e / 10;
    this.malla.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.malla.visible = true;
  }
}
