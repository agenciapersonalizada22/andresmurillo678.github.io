// =============================================================
//  🎒  OBJETOS
//  Todo lo que cabe en el inventario y no es un bloque: palos,
//  lingotes, comida, herramientas, armaduras, flechas…
//  Los bloques usan su número (1 a 255); los objetos usan 1000 en
//  adelante. En los guardados los objetos se anotan por su "clave"
//  (texto) para que añadir objetos nuevos nunca rompa una partida.
// =============================================================
import { B, BASE, BLOQUES, nombreBloque } from './bloques.js';

export const ID_OBJETO = 1000;
export const OBJETOS_LISTA = [];
export const POR_CLAVE_OBJ = {};

function def(clave, nombre, o = {}) {
  const it = { id: ID_OBJETO + OBJETOS_LISTA.length, clave, nombre, tipo: 'material', pila: 64, color: '#cccccc', forma: 'gema', ...o };
  OBJETOS_LISTA.push(it);
  POR_CLAVE_OBJ[clave] = it;
  return it;
}

// ---- materiales y menas
def('palo', 'Palo', { forma: 'palo', color: '#8a5f34', comb: 5 });
def('carbon', 'Carbón', { forma: 'gema', color: '#2a2a2e', comb: 80 });
def('hierro_crudo', 'Hierro en bruto', { forma: 'crudo', color: '#d9a384' });
def('oro_crudo', 'Oro en bruto', { forma: 'crudo', color: '#f0c030' });
def('hierro', 'Lingote de hierro', { forma: 'lingote', color: '#c8ccd2' });
def('oro', 'Lingote de oro', { forma: 'lingote', color: '#f0c030' });
def('diamante', 'Diamante', { forma: 'gema', color: '#52d8e6' });
def('esmeralda', 'Esmeralda', { forma: 'gema', color: '#2fd070' });
def('cuero', 'Cuero', { forma: 'cuero', color: '#9a5a30' });
def('hilo', 'Hilo', { forma: 'hilo', color: '#f1f1f1' });
def('hueso', 'Hueso', { forma: 'hueso', color: '#e8e4d4' });
def('polvora', 'Pólvora', { forma: 'polvo', color: '#6a6a70' });
def('trigo', 'Trigo', { forma: 'trigo', color: '#d8b84a' });
def('flecha', 'Flecha', { forma: 'flecha', color: '#cfcfd4' });
def('bidon', 'Bidón de combustible', { forma: 'bidon', color: '#d23b2a', pila: 16 });

// ---- comida: hambre que quita y saturación
const comida = (clave, nombre, hambre, sat, forma, color) => def(clave, nombre, { tipo: 'comida', hambre, sat, forma, color });
comida('manzana', 'Manzana', 4, 2.4, 'manzana', '#d83a2e');
comida('pan', 'Pan', 5, 6, 'pan', '#c88a3c');
comida('cerdo_crudo', 'Cerdo crudo', 3, 1.8, 'carne', '#f0a0a0');
comida('cerdo_asado', 'Chuleta asada', 8, 12.8, 'carne', '#a8602a');
comida('res_cruda', 'Res cruda', 3, 1.8, 'carne', '#d86a6a');
comida('bistec', 'Bistec', 8, 12.8, 'carne', '#8a4a22');
comida('cordero_crudo', 'Cordero crudo', 2, 1.2, 'carne', '#e08a8a');
comida('cordero_asado', 'Cordero asado', 6, 9.6, 'carne', '#9a5428');
comida('carne_podrida', 'Carne podrida', 2, 0.4, 'carne', '#7a8a4a');

// ---- herramientas
export const MATERIALES = {
  madera: { n: 'de madera', c: '#b08a4a', tier: 0, vel: 2, dur: 59, mas: 0 },
  piedra: { n: 'de piedra', c: '#8f9196', tier: 1, vel: 4, dur: 131, mas: 1 },
  hierro: { n: 'de hierro', c: '#dcdde0', tier: 2, vel: 6, dur: 250, mas: 2 },
  oro: { n: 'de oro', c: '#f4c430', tier: 0, vel: 12, dur: 32, mas: 0 },
  diamante: { n: 'de diamante', c: '#4fe0e8', tier: 3, vel: 8, dur: 1561, mas: 3 },
};
const HERR = [['pico', 'Pico', 2], ['hacha', 'Hacha', 3], ['pala', 'Pala', 1], ['espada', 'Espada', 4]];
for (const [m, M] of Object.entries(MATERIALES)) {
  for (const [h, nom, dano] of HERR) {
    def(h + '_' + m, nom + ' ' + M.n, { tipo: 'herramienta', herr: h, mat: m, tier: M.tier, vel: M.vel, dur: M.dur, dano: dano + M.mas, pila: 1, forma: h, color: M.c });
  }
}
def('arco', 'Arco', { tipo: 'arco', dur: 384, pila: 1, forma: 'arco', color: '#8a5f34' });

// ---- armaduras
export const ARMADURAS = {
  cuero: { n: 'de cuero', c: '#a8683a', dur: 5, def: [1, 3, 2, 1] },
  hierro: { n: 'de hierro', c: '#dcdde0', dur: 15, def: [2, 5, 4, 2] },
  diamante: { n: 'de diamante', c: '#4fe0e8', dur: 33, def: [3, 8, 6, 3] },
};
export const PIEZAS = [['casco', 'Casco', 11], ['peto', 'Peto', 16], ['pantalones', 'Pantalones', 15], ['botas', 'Botas', 13]];
for (const [m, A] of Object.entries(ARMADURAS)) {
  PIEZAS.forEach(([p, nom, d], i) => {
    def(p + '_' + m, nom + ' ' + A.n, { tipo: 'armadura', pieza: i, mat: m, defensa: A.def[i], dur: A.dur * d, pila: 1, forma: p, color: A.c });
  });
}

// ---- espacio: baterías, etapas de cohete y traje (al final: no cambian los números de los objetos de siempre)
def('bateria', 'Batería de iones', { forma: 'bateria', color: '#3ad07a', pila: 16 });
def('motor_electrico', 'Motor eléctrico', { forma: 'motor', color: '#9aa6b8', pila: 16 });
def('rotor', 'Rotor de turbina', { forma: 'motor', color: '#6ab8ff', pila: 16 });
def('kit_aeroauto', 'Kit de aeroauto Volta', { forma: 'kit', color: '#2f9bff', pila: 4 });
def('cohete_estructura', 'Cohete: estructura', { forma: 'cohete', color: '#e8ecf2', pila: 1 });
def('cohete_motores', 'Cohete: motores', { forma: 'cohete', color: '#ffa13a', pila: 1 });
def('cohete_combustible', 'Cohete: combustible', { forma: 'cohete', color: '#e2483a', pila: 1 });
def('cohete_cabina', 'Cohete: cabina', { forma: 'cohete', color: '#5ab6ff', pila: 1 });
def('traje_espacial', 'Traje espacial', { forma: 'peto', color: '#f2f4f8', pila: 1 });

// ---- consultas
export const esObjeto = (id) => id >= ID_OBJETO;
export const objetoPorId = (id) => OBJETOS_LISTA[id - ID_OBJETO] || null;

// Los bloques con variantes (cofre, puerta, cama…) se guardan siempre como su versión base
export function idInventario(id) {
  if (id === B.AGUA) return B.AGUA_PUESTA;
  if (id === B.PUERTA_Z || id === B.PUERTA_X_ABIERTA || id === B.PUERTA_Z_ABIERTA) return B.PUERTA_X;
  if (id >= B.CAMA_PIE && id < B.CAMA_PIE + 8) return B.CAMA_PIE;
  if (id === B.RIEL_Z) return B.RIEL_X;
  return BASE[id] || id;
}

export function nombreDe(id) {
  if (esObjeto(id)) { const o = objetoPorId(id); return o ? o.nombre : '?'; }
  return nombreBloque(id);
}

export function clavePara(id) {
  if (esObjeto(id)) { const o = objetoPorId(id); return o ? o.clave : null; }
  return id;
}

// Acepta número (bloque u objeto) o clave de texto de un objeto
export function resolverId(x) {
  if (typeof x === 'string') return POR_CLAVE_OBJ[x] ? POR_CLAVE_OBJ[x].id : 0;
  return x | 0;
}

export function pilaMaxima(id) {
  if (esObjeto(id)) { const o = objetoPorId(id); return o ? o.pila : 64; }
  return 64;
}

export function combustible(id) {
  if (esObjeto(id)) { const o = objetoPorId(id); return (o && o.comb) || 0; }
  const b = BLOQUES[id];
  if (!b) return 0;
  return b.clave.startsWith('tronco') || b.clave.startsWith('tablas') ? 15 : 0;
}

// ---- iconos (se dibujan una vez y se guardan)
const cache = new Map();

function trazo(x, f, ancho, color) {
  x.lineCap = 'round'; x.lineJoin = 'round';
  x.strokeStyle = 'rgba(0,0,0,0.65)'; x.lineWidth = ancho + 2.4; f(); x.stroke();
  x.strokeStyle = color; x.lineWidth = ancho; f(); x.stroke();
}
function relleno(x, f, color) {
  x.fillStyle = color; f(); x.fill();
  x.lineJoin = 'round'; x.lineWidth = 1.6; x.strokeStyle = 'rgba(0,0,0,0.65)'; x.stroke();
}
const clar = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const m = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${m(n >> 16)},${m((n >> 8) & 255)},${m(n & 255)})`;
};

function pintar(x, o) {
  const c = o.color;
  const mango = () => trazo(x, () => { x.beginPath(); x.moveTo(5, 27); x.lineTo(21, 11); }, 3, '#7a5230');
  switch (o.forma) {
    case 'pico':
      mango();
      trazo(x, () => { x.beginPath(); x.moveTo(8, 13); x.quadraticCurveTo(18, 1, 28, 15); }, 4.2, c);
      break;
    case 'hacha':
      mango();
      relleno(x, () => { x.beginPath(); x.moveTo(16, 14); x.lineTo(13, 5); x.lineTo(24, 3); x.lineTo(28, 11); x.lineTo(21, 16); x.closePath(); }, c);
      break;
    case 'pala':
      mango();
      x.save(); x.translate(23, 9); x.rotate(Math.PI / 4);
      relleno(x, () => { x.beginPath(); x.ellipse(0, 0, 5, 7.5, 0, 0, 7); }, c);
      x.restore();
      break;
    case 'espada':
      trazo(x, () => { x.beginPath(); x.moveTo(5, 27); x.lineTo(10, 22); }, 3, '#7a5230');
      trazo(x, () => { x.beginPath(); x.moveTo(7, 17); x.lineTo(15, 25); }, 3, '#8a6a3a');
      relleno(x, () => { x.beginPath(); x.moveTo(11, 18); x.lineTo(14, 21); x.lineTo(28, 5); x.lineTo(27, 3); x.lineTo(24, 4); x.closePath(); }, c);
      break;
    case 'arco':
      trazo(x, () => { x.beginPath(); x.arc(9, 16, 14, -1.1, 1.1); }, 3, '#8a5f34');
      x.strokeStyle = '#eee'; x.lineWidth = 1; x.beginPath(); x.moveTo(14, 3.6); x.lineTo(14, 28.4); x.stroke();
      break;
    case 'flecha':
      trazo(x, () => { x.beginPath(); x.moveTo(6, 26); x.lineTo(24, 8); }, 2, '#8a5f34');
      relleno(x, () => { x.beginPath(); x.moveTo(30, 2); x.lineTo(21, 6); x.lineTo(26, 11); x.closePath(); }, '#c8ccd2');
      relleno(x, () => { x.beginPath(); x.moveTo(3, 29); x.lineTo(5, 20); x.lineTo(12, 27); x.closePath(); }, '#f4f4f4');
      break;
    case 'casco':
      relleno(x, () => { x.beginPath(); x.moveTo(6, 25); x.lineTo(6, 15); x.quadraticCurveTo(16, 2, 26, 15); x.lineTo(26, 25); x.lineTo(21, 25); x.lineTo(21, 18); x.lineTo(11, 18); x.lineTo(11, 25); x.closePath(); }, c);
      break;
    case 'peto':
      relleno(x, () => { x.beginPath(); x.moveTo(5, 8); x.lineTo(11, 5); x.lineTo(13, 8); x.lineTo(19, 8); x.lineTo(21, 5); x.lineTo(27, 8); x.lineTo(27, 16); x.lineTo(23, 16); x.lineTo(23, 28); x.lineTo(9, 28); x.lineTo(9, 16); x.lineTo(5, 16); x.closePath(); }, c);
      break;
    case 'pantalones':
      relleno(x, () => { x.beginPath(); x.moveTo(7, 4); x.lineTo(25, 4); x.lineTo(26, 28); x.lineTo(18, 28); x.lineTo(16, 13); x.lineTo(14, 28); x.lineTo(6, 28); x.closePath(); }, c);
      break;
    case 'botas':
      relleno(x, () => { x.beginPath(); x.moveTo(5, 6); x.lineTo(13, 6); x.lineTo(13, 22); x.lineTo(16, 26); x.lineTo(16, 29); x.lineTo(4, 29); x.lineTo(4, 22); x.closePath(); x.moveTo(19, 6); x.lineTo(27, 6); x.lineTo(27, 22); x.lineTo(30, 26); x.lineTo(30, 29); x.lineTo(18, 29); x.lineTo(18, 22); x.closePath(); }, c);
      break;
    case 'palo':
      trazo(x, () => { x.beginPath(); x.moveTo(6, 27); x.lineTo(26, 6); }, 4, c);
      break;
    case 'gema':
      relleno(x, () => { x.beginPath(); x.moveTo(16, 3); x.lineTo(28, 12); x.lineTo(16, 29); x.lineTo(4, 12); x.closePath(); }, c);
      x.fillStyle = 'rgba(255,255,255,0.45)'; x.beginPath(); x.moveTo(16, 3); x.lineTo(10, 12); x.lineTo(16, 14); x.closePath(); x.fill();
      break;
    case 'lingote':
      relleno(x, () => { x.beginPath(); x.moveTo(8, 10); x.lineTo(26, 10); x.lineTo(30, 24); x.lineTo(4, 24); x.closePath(); }, c);
      x.fillStyle = 'rgba(255,255,255,0.45)'; x.fillRect(10, 12, 12, 3);
      break;
    case 'crudo':
      relleno(x, () => { x.beginPath(); x.moveTo(6, 20); x.lineTo(9, 9); x.lineTo(19, 5); x.lineTo(27, 12); x.lineTo(26, 24); x.lineTo(14, 27); x.closePath(); }, '#7d7d82');
      x.fillStyle = c; for (const [a, b, r] of [[13, 13, 3.2], [20, 18, 3.6], [12, 21, 2.6], [21, 10, 2.2]]) { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); }
      break;
    case 'bidon':
      relleno(x, () => { x.beginPath(); x.rect(7, 7, 18, 22); }, c);
      x.fillStyle = '#222'; x.fillRect(19, 3, 6, 5); x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(10, 13, 12, 8); x.fillStyle = c; x.fillRect(12, 15, 8, 4);
      break;
    case 'pan':
      relleno(x, () => { x.beginPath(); x.ellipse(16, 18, 13, 8, 0, 0, 7); }, c);
      x.strokeStyle = 'rgba(120,70,20,0.8)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(9, 15); x.lineTo(13, 21); x.moveTo(15, 14); x.lineTo(19, 22); x.moveTo(21, 15); x.lineTo(25, 21); x.stroke();
      break;
    case 'manzana':
      relleno(x, () => { x.beginPath(); x.arc(16, 19, 9, 0, 7); }, c);
      x.fillStyle = '#3a8a2a'; x.fillRect(16, 6, 3, 6); x.fillStyle = 'rgba(255,255,255,0.4)'; x.fillRect(11, 15, 3, 4);
      break;
    case 'carne':
      relleno(x, () => { x.beginPath(); x.ellipse(15, 17, 11, 8, -0.5, 0, 7); }, c);
      x.fillStyle = 'rgba(255,255,255,0.3)'; x.beginPath(); x.ellipse(11, 14, 4, 2.5, -0.5, 0, 7); x.fill();
      trazo(x, () => { x.beginPath(); x.moveTo(22, 21); x.lineTo(28, 27); }, 2.4, '#efe9d6');
      break;
    case 'cuero':
      relleno(x, () => { x.beginPath(); x.moveTo(6, 8); x.lineTo(26, 6); x.lineTo(27, 24); x.lineTo(8, 27); x.closePath(); }, c);
      x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(10, 12, 12, 8);
      break;
    case 'hilo':
      trazo(x, () => { x.beginPath(); x.moveTo(5, 22); x.bezierCurveTo(8, 4, 14, 30, 18, 10); x.bezierCurveTo(20, 4, 26, 20, 28, 8); }, 2.4, c);
      break;
    case 'hueso':
      trazo(x, () => { x.beginPath(); x.moveTo(8, 25); x.lineTo(24, 9); }, 4, c);
      for (const [a, b] of [[6, 22], [10, 27], [22, 5], [27, 10]]) { x.fillStyle = c; x.beginPath(); x.arc(a, b, 3, 0, 7); x.fill(); }
      break;
    case 'polvo':
      relleno(x, () => { x.beginPath(); x.moveTo(4, 26); x.quadraticCurveTo(16, 2, 28, 26); x.closePath(); }, c);
      x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(12, 18, 3, 3); x.fillRect(18, 21, 3, 3);
      break;
    case 'trigo':
      trazo(x, () => { x.beginPath(); x.moveTo(8, 28); x.lineTo(22, 4); }, 2, '#9a8a3a');
      for (let i = 0; i < 4; i++) { x.fillStyle = c; x.beginPath(); x.ellipse(21 - i * 2.4 - 3, 8 + i * 4.6, 4, 2.2, -1, 0, 7); x.fill(); x.beginPath(); x.ellipse(21 - i * 2.4 + 3, 7 + i * 4.6, 4, 2.2, 1, 0, 7); x.fill(); }
      break;
    case 'bateria':
      relleno(x, () => { x.beginPath(); x.rect(6, 10, 20, 16); }, c);
      x.fillStyle = '#222'; x.fillRect(11, 6, 10, 4); x.fillStyle = 'rgba(255,255,255,0.7)';
      x.beginPath(); x.moveTo(17, 12); x.lineTo(12, 19); x.lineTo(16, 19); x.lineTo(14, 25); x.lineTo(21, 17); x.lineTo(17, 17); x.closePath(); x.fill();
      break;
    case 'motor':
      relleno(x, () => { x.beginPath(); x.arc(16, 17, 10, 0, 7); }, c);
      x.fillStyle = '#2a2e36'; x.beginPath(); x.arc(16, 17, 4, 0, 7); x.fill();
      for (let i = 0; i < 3; i++) { x.save(); x.translate(16, 17); x.rotate(i * 2.09); x.fillStyle = 'rgba(255,255,255,0.55)'; x.fillRect(-1.5, -9, 3, 7); x.restore(); }
      break;
    case 'kit':
      relleno(x, () => { x.beginPath(); x.rect(5, 9, 22, 17); }, c);
      x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillRect(5, 15, 22, 3); x.fillRect(14, 9, 4, 17);
      break;
    case 'cohete':
      relleno(x, () => { x.beginPath(); x.moveTo(16, 2); x.quadraticCurveTo(25, 10, 22, 24); x.lineTo(10, 24); x.quadraticCurveTo(7, 10, 16, 2); x.closePath(); }, c);
      relleno(x, () => { x.beginPath(); x.moveTo(10, 18); x.lineTo(4, 27); x.lineTo(10, 25); x.closePath(); x.moveTo(22, 18); x.lineTo(28, 27); x.lineTo(22, 25); x.closePath(); }, '#d23b2a');
      x.fillStyle = '#0b2540'; x.beginPath(); x.arc(16, 12, 3, 0, 7); x.fill();
      break;
    default:
      relleno(x, () => { x.beginPath(); x.arc(16, 16, 9, 0, 7); }, c);
  }
}

// Imagen (data URL) de un objeto
export function iconoObjeto(o) {
  let r = cache.get(o.clave);
  if (r) return r;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.scale(2, 2);
  pintar(x, o);
  r = c.toDataURL();
  cache.set(o.clave, r);
  return r;
}

export function colorDeObjeto(id) { const o = objetoPorId(id); return o ? o.color : '#cccccc'; }
