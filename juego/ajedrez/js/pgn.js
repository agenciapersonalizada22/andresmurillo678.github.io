// =============================================================
//  📄  PGN
//  Lee uno o varios juegos en PGN (cabeceras, comentarios, variantes
//  ignoradas, NAGs) y convierte las jugadas SAN en jugadas legales.
// =============================================================
import { Posicion, FEN_INICIAL, movAUci, movDesde, movHasta, ENR_C, ENR_L } from './reglas.js';

const limpiarSan = (s) => s.replace(/[+#!?]/g, '').replace(/0/g, 'O').replace(/^[Pp](?=[a-h])/, '').replace(/x/g, '').replace(/=/g, '');

// Busca la jugada legal que corresponde a la jugada escrita (tolera x, +, #, !, ?, 0-0)
export function sanAMov(pos, texto, L = null) {
  L = L || pos.movimientosLegales();
  const objetivo = limpiarSan(texto);
  for (const m of L) if (limpiarSan(pos.san(m, L)) === objetivo) return m;
  // sin desambiguar: pieza + destino (si solo hay una candidata)
  const mm = /^([NBRQK])?([a-h])?([1-8])?([a-h][1-8])(Q|R|B|N)?$/.exec(objetivo);
  if (!mm) return 0;
  const c = L.filter((m) => {
    const s = limpiarSan(pos.san(m, L)), dest = s.match(/[a-h][1-8](?=[QRBN]?$)/);
    return dest && dest[0] === mm[4] && (mm[1] ? s[0] === mm[1] : /^[a-h]/.test(s));
  });
  return c.length === 1 ? c[0] : 0;
}

function lex(texto) {
  // quita comentarios { } y ; resto de línea, guardando los { } para las notas
  const fichas = [];
  let i = 0, prof = 0;
  const n = texto.length;
  while (i < n) {
    const c = texto[i];
    if (c === '{') {
      const j = texto.indexOf('}', i);
      const t = texto.slice(i + 1, j < 0 ? n : j).trim();
      if (!prof) fichas.push({ nota: t });
      i = j < 0 ? n : j + 1;
    } else if (c === ';') { const j = texto.indexOf('\n', i); i = j < 0 ? n : j + 1; }
    else if (c === '(') { prof++; i++; }
    else if (c === ')') { prof = Math.max(0, prof - 1); i++; }
    else if (/\s/.test(c)) i++;
    else {
      let j = i;
      while (j < n && !/[\s{};()]/.test(texto[j])) j++;
      if (!prof) fichas.push({ t: texto.slice(i, j) });
      i = j;
    }
  }
  return fichas;
}

// -> [{ cab, sans, notas: {ply: texto}, res }]
export function parsearPGN(texto) {
  const juegos = [];
  const t = String(texto).replace(/\r/g, '');
  const partes = t.split(/\n\s*\n(?=\s*\[)/);
  let pendiente = null;
  for (const bloque of partes) {
    const b = bloque.trim();
    if (!b) continue;
    const cab = {};
    let resto = b;
    const re = /^\s*\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]\s*/;
    let m;
    while ((m = re.exec(resto))) { cab[m[1]] = m[2].replace(/\\"/g, '"'); resto = resto.slice(m[0].length); }
    if (Object.keys(cab).length === 0 && pendiente) { pendiente.resto += '\n' + resto; continue; }
    pendiente = { cab, resto };
    juegos.push(pendiente);
  }
  return juegos.map(({ cab, resto }) => {
    const sans = [], notas = {};
    let res = cab.Result || '*';
    for (const f of lex(resto)) {
      if (f.nota !== undefined) { if (sans.length) notas[sans.length] = (notas[sans.length] ? notas[sans.length] + ' ' : '') + f.nota; continue; }
      let s = f.t;
      if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(s)) { res = s; continue; }
      if (/^\$\d+$/.test(s)) continue;
      s = s.replace(/^\d+\.(\.\.)?/, '');
      if (!s || /^\d+\.*$/.test(s)) continue;
      sans.push(s);
    }
    return { cab, sans, notas, res };
  }).filter((g) => g.sans.length || Object.keys(g.cab).length);
}

// Convierte las jugadas de un juego a UCI. Devuelve { fen, ucis, error }
export function juegoAUci(g) {
  const fen = g.cab.FEN && (g.cab.SetUp === '1' || !g.cab.SetUp) ? g.cab.FEN : FEN_INICIAL;
  let pos;
  try { pos = Posicion.desdeFen(fen); } catch (e) { return { fen, ucis: [], error: 'FEN no válido en el PGN' }; }
  const ucis = [];
  for (let i = 0; i < g.sans.length; i++) {
    const m = sanAMov(pos, g.sans[i]);
    if (!m) return { fen, ucis, error: `Jugada ilegal o ilegible: «${g.sans[i]}» (jugada ${i + 1})` };
    ucis.push(movAUci(m, pos));
    pos.hacer(m);
  }
  return { fen, ucis, error: null };
}

export { movDesde, movHasta, ENR_C, ENR_L };
