// =============================================================
//  📖  APERTURAS
//  Nombre y código ECO de la posición (por transposición, ignora el
//  orden de jugadas) y jugadas de libro para los bots. La lista está
//  en datos/aperturas_lista.js (SAN); aquí se convierte, la primera
//  vez que se usa, en un mapa de posiciones.
// =============================================================
import { Posicion, FEN_INICIAL, movAUci } from './reglas.js';
import { LISTA } from './datos/aperturas_lista.js';

let mapa = null;      // clave de posición -> { eco, nombre, largo }
let libro = null;     // clave -> Map(uci -> peso)

const clave = (p) => `${p.hLo}:${p.hHi}`;

function sanAMov(p, san) {
  const L = p.movimientosLegales();
  for (const m of L) if (p.san(m, L).replace(/[+#]/g, '') === san.replace(/[+#]/g, '')) return m;
  return 0;
}

function construir() {
  mapa = new Map(); libro = new Map();
  for (const linea of LISTA) {
    const [eco, nombre, jug] = linea.split('|');
    const p = Posicion.desdeFen(FEN_INICIAL);
    const sans = jug.split(' ');
    let ok = true;
    for (let i = 0; i < sans.length; i++) {
      const m = sanAMov(p, sans[i]);
      if (!m) { ok = false; console.warn('Apertura inválida', nombre, sans[i]); break; }
      // jugada de libro: desde esta posición se juega m
      const k = clave(p);
      const e = libro.get(k) || new Map();
      const u = `${m}`;
      e.set(u, (e.get(u) || 0) + 1);
      libro.set(k, e);
      p.hacer(m);
    }
    if (!ok) continue;
    const prev = mapa.get(clave(p));
    if (!prev || prev.largo <= sans.length) mapa.set(clave(p), { eco, nombre, largo: sans.length });
  }
}

// Última apertura reconocida en la partida (recorre las jugadas ya hechas); null si no hay
export function nombreApertura(partida) {
  if (!mapa) construir();
  if (partida.pos.es960 || partida.fenInicial !== FEN_INICIAL) return null;
  const p = Posicion.desdeFen(FEN_INICIAL);
  let res = null, fuera = 0;
  for (let i = 0; i < partida.cursor; i++) {
    p.hacer(partida.jugadas[i].m);
    const e = mapa.get(clave(p));
    if (e) { res = e; fuera = 0; } else fuera++;
    if (fuera > 8) break;
  }
  return res;
}

// ¿La posición tras jugar los movs (uci) sigue "en libro"? (para clasificar jugadas)
export function enLibro(pos) {
  if (!mapa) construir();
  return mapa.has(clave(pos));
}

// Jugada de libro (uci) para la posición pos, o '' (elige al azar con peso por frecuencia)
export function jugadaLibro(pos) {
  if (!mapa) construir();
  if (pos.es960) return '';
  const e = libro.get(clave(pos));
  if (!e) return '';
  const L = pos.movimientosLegales();
  const opciones = [];
  let total = 0;
  for (const [m, w] of e) { const mv = +m; if (L.includes(mv)) { opciones.push([mv, w]); total += w; } }
  if (!opciones.length) return '';
  let r = Math.random() * total;
  for (const [mv, w] of opciones) { r -= w; if (r <= 0) return movAUci(mv); }
  return movAUci(opciones[0][0]);
}

export const totalAperturas = () => { if (!mapa) construir(); return mapa.size; };
