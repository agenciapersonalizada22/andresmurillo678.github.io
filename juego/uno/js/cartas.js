// Arte vectorial propio de las cartas (SVG en linea) con tres temas: clasico, neon y daltonico (simbolos).
import { MAZO, COLORES, SALTO, REVERSA, MAS2, COMODIN, MAS4 } from './reglas.js';

export const TEMAS = {
  clasico: { nombre: 'Clásico', col: ['#e3353b', '#f4c20d', '#2ea84f', '#1f6fd1'], fondo: '#fff', tinta: '#fff', neon: false, formas: false },
  neon: { nombre: 'Neón', col: ['#ff2d6f', '#ffe433', '#37ff8b', '#2fd0ff'], fondo: '#0a0a1c', tinta: '#0a0a1c', neon: true, formas: false },
  dalto: { nombre: 'Daltónico (símbolos)', col: ['#d55e00', '#f0e442', '#009e73', '#0072b2'], fondo: '#fff', tinta: '#fff', neon: false, formas: true }
};
export const nombreColor = (c) => COLORES[c] || 'Comodín';
export const nombreCarta = (id) => {
  const { c, v } = MAZO[id];
  if (v === COMODIN) return 'Comodín';
  if (v === MAS4) return 'Comodín más cuatro';
  const col = COLORES[c].toLowerCase();
  return (v <= 9 ? v : v === SALTO ? 'Salto' : v === REVERSA ? 'Reversa' : 'Más dos') + ' ' + col;
};

// formas para el tema daltonico: triangulo, circulo, cuadrado, rombo
const FORMA = [
  (x, y, s, f) => `<polygon points="${x},${y - s} ${x + s * 0.95},${y + s * 0.75} ${x - s * 0.95},${y + s * 0.75}" fill="${f}"/>`,
  (x, y, s, f) => `<circle cx="${x}" cy="${y}" r="${s * 0.9}" fill="${f}"/>`,
  (x, y, s, f) => `<rect x="${x - s * 0.8}" y="${y - s * 0.8}" width="${s * 1.6}" height="${s * 1.6}" fill="${f}"/>`,
  (x, y, s, f) => `<polygon points="${x},${y - s * 1.05} ${x + s * 0.85},${y} ${x},${y + s * 1.05} ${x - s * 0.85},${y}" fill="${f}"/>`
];
export function iconoColor(c, tema = 'clasico', tam = 28) {
  const T = TEMAS[tema] || TEMAS.clasico;
  const f = T.col[c];
  const cuerpo = T.formas ? FORMA[c](16, 16, 11, f) : `<circle cx="16" cy="16" r="12" fill="${f}" stroke="#fff" stroke-width="2"/>`;
  return `<svg viewBox="0 0 32 32" width="${tam}" height="${tam}" aria-hidden="true">${cuerpo}</svg>`;
}

function simbolo(v, col, T, esc) {
  const k = esc || 1, s = (body) => `<g transform="scale(${k})">${body}</g>`;
  const trazo = T.neon ? col : col;
  switch (v) {
    case SALTO: return s(`<circle r="19" fill="none" stroke="${trazo}" stroke-width="8"/><line x1="-13.4" y1="-13.4" x2="13.4" y2="13.4" stroke="${trazo}" stroke-width="8" stroke-linecap="round"/>`);
    case REVERSA: return s(`<g fill="${trazo}" stroke="${trazo}" stroke-linejoin="round"><path d="M-22 -9 H8" stroke-width="9" fill="none" stroke-linecap="butt"/><polygon points="4,-24 26,-9 4,6"/><path d="M22 11 H-8" stroke-width="9" fill="none"/><polygon points="-4,-4 -26,11 -4,26"/></g>`);
    case MAS2: return s(`<g fill="${trazo}"><rect x="-17" y="-26" width="18" height="26" rx="3" transform="rotate(-12)"/><rect x="-1" y="-24" width="18" height="26" rx="3" transform="rotate(10)" opacity=".85"/></g><text y="26" text-anchor="middle" font-size="26" font-weight="900" fill="${trazo}">+2</text>`);
    case COMODIN: return s(`<g transform="rotate(-25)"><path d="M0 0 L0 -24 A24 24 0 0 1 24 0Z" fill="${T.col[1]}"/><path d="M0 0 L24 0 A24 24 0 0 1 0 24Z" fill="${T.col[2]}"/><path d="M0 0 L0 24 A24 24 0 0 1 -24 0Z" fill="${T.col[3]}"/><path d="M0 0 L-24 0 A24 24 0 0 1 0 -24Z" fill="${T.col[0]}"/></g>`);
    case MAS4: return s(`<g stroke="${T.neon ? '#fff' : '#fff'}" stroke-width="1.6">${[0, 1, 2, 3].map((i) => `<rect x="-8" y="-24" width="16" height="22" rx="2.5" fill="${T.col[i]}" transform="translate(0 6) rotate(${-36 + i * 24} 0 18)"/>`).join('')}</g><text y="-22" text-anchor="middle" font-size="19" font-weight="900" fill="#fff">+4</text>`);
    default: return s(`<text y="19" text-anchor="middle" font-size="58" font-weight="900" fill="${trazo}" font-family="Arial Black,Arial,sans-serif">${v}</text>${v === 6 || v === 9 ? `<rect x="-10" y="26" width="20" height="4.5" fill="${trazo}"/>` : ''}`);
  }
}
const etiqueta = (v) => (v <= 9 ? String(v) : v === MAS2 ? '+2' : v === MAS4 ? '+4' : '');

function esquina(v, c, col, T) {
  const tinta = c === 1 && !T.neon ? '#1b1b1b' : '#fff';
  const peq = v <= 9 || v === MAS2 || v === MAS4
    ? `<text text-anchor="middle" font-size="${v === MAS2 || v === MAS4 ? 14 : 19}" font-weight="900" fill="${tinta}" font-family="Arial Black,Arial,sans-serif">${etiqueta(v)}</text>`
    : v === COMODIN ? simbolo(v, col, T, 0.3) : simbolo(v, tinta, T, 0.3);
  const forma = T.formas && c < 4 ? FORMA[c](0, 14, 5, tinta) : '';
  return `<g transform="translate(15 22)">${peq}${forma}</g>`;
}

const cache = new Map();
export function svgCarta(id, tema = 'clasico') {
  const k = tema + ':' + id;
  let r = cache.get(k);
  if (r) return r;
  const { c, v } = MAZO[id];
  const T = TEMAS[tema] || TEMAS.clasico;
  const comodin = c === 4;
  const col = comodin ? '#ffffff' : T.col[c];
  let cuerpo;
  if (T.neon) {
    const borde = comodin ? 'url(#arco)' : col;
    cuerpo = `<defs><linearGradient id="arco"><stop offset="0" stop-color="${T.col[0]}"/><stop offset=".33" stop-color="${T.col[1]}"/><stop offset=".66" stop-color="${T.col[2]}"/><stop offset="1" stop-color="${T.col[3]}"/></linearGradient></defs>
      <rect x="1.5" y="1.5" width="97" height="147" rx="11" fill="#0a0a1c" stroke="${borde}" stroke-width="3.2"/>
      <rect x="6" y="6" width="88" height="138" rx="8" fill="none" stroke="${borde}" stroke-opacity=".35" stroke-width="1.5"/>
      <ellipse cx="50" cy="75" rx="31" ry="46" transform="rotate(25 50 75)" fill="${comodin ? '#14142c' : col}" fill-opacity="${comodin ? 1 : 0.14}" stroke="${borde}" stroke-width="2.2"/>`;
  } else {
    const fondo = comodin ? '#17171f' : col;
    cuerpo = `<rect x="0" y="0" width="100" height="150" rx="12" fill="#fff"/><rect x="5" y="5" width="90" height="140" rx="8" fill="${fondo}"/>
      <ellipse cx="50" cy="75" rx="32" ry="48" transform="rotate(25 50 75)" fill="${comodin ? '#f6f6fa' : '#fff'}"/>`;
  }
  const marca = T.formas && !comodin ? `<g opacity=".18">${FORMA[c](50, 75, 30, col)}</g>` : '';
  const centro = simbolo(v, col, T);
  const formaCentro = T.formas && !comodin && v <= 9 ? FORMA[c](50, 108, 7.5, col) : '';
  const formasComodin = T.formas && comodin ? [0, 1, 2, 3].map((i) => FORMA[i](50 + (i % 2 ? 9 : -9) * 1.2, 75 + (i < 2 ? -9 : 9) * 1.2, 4.6, '#fff')).join('') : '';
  r = `<svg class="svgc" viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${cuerpo}${marca}<g transform="translate(50 75)">${centro}</g>${formaCentro}${formasComodin}
    ${esquina(v, c, col, T)}<g transform="rotate(180 50 75)">${esquina(v, c, col, T)}</g></svg>`;
  cache.set(k, r);
  return r;
}

export function svgDorso(tema = 'clasico') {
  const T = TEMAS[tema] || TEMAS.clasico;
  const k = 'dorso:' + tema;
  let r = cache.get(k);
  if (r) return r;
  const neon = T.neon;
  r = `<svg class="svgc" viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <rect width="100" height="150" rx="12" fill="${neon ? '#0a0a1c' : '#fff'}" ${neon ? `stroke="${T.col[3]}" stroke-width="3"` : ''}/>
    <rect x="5" y="5" width="90" height="140" rx="8" fill="${neon ? '#10102a' : '#16161d'}" ${neon ? `stroke="${T.col[0]}" stroke-width="1.5"` : ''}/>
    <ellipse cx="50" cy="75" rx="32" ry="48" transform="rotate(25 50 75)" fill="${neon ? 'none' : T.col[0]}" ${neon ? `stroke="${T.col[0]}" stroke-width="3"` : ''}/>
    <text x="50" y="86" text-anchor="middle" font-size="34" font-weight="900" font-style="italic" font-family="Arial Black,Arial,sans-serif" fill="${neon ? T.col[1] : T.col[1]}" stroke="#16161d" stroke-width="${neon ? 0 : 2.4}" paint-order="stroke">UNO</text>
    <g fill="${T.col[2]}" opacity=".9"><circle cx="15" cy="18" r="4"/><circle cx="85" cy="132" r="4"/></g><g fill="${T.col[3]}" opacity=".9"><circle cx="85" cy="18" r="4"/><circle cx="15" cy="132" r="4"/></g></svg>`;
  cache.set(k, r);
  return r;
}
