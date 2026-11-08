// Arte original de las cartas (SVG en linea, sin imagenes externas) y textos. Cima del mazo = ultimo elemento (ver reglas.js).
import { MAZO, T } from './reglas.js';

export const INFO = [
  { n: 'Gato Bomba', s: 'EXPLOSIVA', d: 'Si la robas sin un Ovillo, explotas y quedas fuera.' },
  { n: 'Ovillo', s: 'DESACTIVAR', d: 'Calma a un Gato Bomba. Elige dónde esconderlo otra vez en el mazo.' },
  { n: 'Zarpazo', s: 'ATAQUE', d: 'Termina tu turno sin robar. El siguiente juega un turno extra.' },
  { n: 'Siesta', s: 'SALTAR', d: 'Termina un turno sin robar carta.' },
  { n: 'Súplica', s: 'FAVOR', d: 'Un rival a tu elección te da una carta que él elige.' },
  { n: 'Torbellino', s: 'BARAJAR', d: 'Mezcla el mazo de robo.' },
  { n: 'Vidente', s: 'VER FUTURO', d: 'Mira en secreto las 3 cartas de arriba del mazo.' },
  { n: '¡Miau No!', s: 'ANULAR', d: 'Anula cualquier jugada. Se puede anular otro «Miau No».' },
  { n: 'Panqueque', s: 'GATO · COMBOS', d: 'Gato de combos: 2 iguales roban al azar, 3 iguales piden una carta.' },
  { n: 'Calcetín', s: 'GATO · COMBOS', d: 'Gato de combos: 2 iguales roban al azar, 3 iguales piden una carta.' },
  { n: 'Fideo', s: 'GATO · COMBOS', d: 'Gato de combos: 2 iguales roban al azar, 3 iguales piden una carta.' },
  { n: 'Pijama', s: 'GATO · COMBOS', d: 'Gato de combos: 2 iguales roban al azar, 3 iguales piden una carta.' },
  { n: 'Bigotes', s: 'GATO · COMBOS', d: 'Gato de combos: 2 iguales roban al azar, 3 iguales piden una carta.' }
];
export const nombreTipo = (t) => INFO[t].n;
export const nombreCarta = (id) => INFO[MAZO[id]].n;

/* [marco, banda, panel] por tipo y tema */
const CLASICO = [
  ['#2a0f14', '#c1202e', '#4a1620'], ['#0d3b3a', '#1f9d8e', '#14625c'], ['#4a0f0f', '#d6401f', '#6e1a14'], ['#1a1d4a', '#5a5fd6', '#2c3278'],
  ['#4a1233', '#d6498f', '#6e1f4c'], ['#0f3a52', '#2b9fd6', '#17608a'], ['#2a1558', '#8a5cf0', '#43288f'], ['#4a2a0a', '#e8871a', '#8a4d12'],
  ['#6b3f10', '#e07b1a', '#ffe6bf'], ['#3a3f52', '#6f7a99', '#e1e5f0'], ['#5b4a14', '#c9a227', '#f6f1cf'], ['#1f2f7a', '#4a67e0', '#d9e6ff'], ['#2a2433', '#7a6a92', '#e6e1ee']
];
const OKABE = ['#8b1a1a', '#0072B2', '#D55E00', '#7a3fb0', '#CC79A7', '#1b8fc4', '#8a6d00', '#B8720A', '#B8720A', '#5a6a8a', '#8a7a00', '#2a58c0', '#5a4a72'];
export const TEMAS = {
  clasico: { nombre: 'Clásico', acc: '#ff9d3d' },
  neon: { nombre: 'Neón', acc: '#3df5ff' },
  dalto: { nombre: 'Alto contraste + símbolos', acc: '#ffd23d' }
};
const pal = (t, tema) => {
  const c = CLASICO[t];
  if (tema === 'neon') return ['#07061a', c[1], t >= 8 ? '#15123a' : c[2], '#3df5ff'];
  if (tema === 'dalto') return ['#000000', OKABE[t], t >= 8 ? '#f4f4f4' : '#202020', '#ffffff'];
  return [c[0], c[1], c[2], '#ffffff'];
};

/* ---------- piezas de gato ---------- */
const ojo = (k, x, y, s, izq) => {
  const d = izq ? -1 : 1;
  switch (k) {
    case 'panico': return `<circle cx="${x}" cy="${y}" r="${5.2 * s}" fill="#fff" stroke="#000" stroke-width="1"/><circle cx="${x + d * 0.6 * s}" cy="${y + 0.6 * s}" r="${1.7 * s}" fill="#000"/><path d="M${x - 5 * s} ${y - 8 * s} L${x + 5 * s} ${y - 6 * s * (izq ? 1 : -1) - 2 * s}" stroke="#000" stroke-width="1.6" stroke-linecap="round"/>`;
    case 'calma': return `<path d="M${x - 4 * s} ${y + 1 * s} q${4 * s} ${-6 * s} ${8 * s} 0" fill="none" stroke="#1b1b1b" stroke-width="2" stroke-linecap="round"/>`;
    case 'enojo': return `<ellipse cx="${x}" cy="${y}" rx="${4.4 * s}" ry="${3.6 * s}" fill="#ffe14d" stroke="#000" stroke-width="1"/><rect x="${x - 0.8 * s}" y="${y - 3.2 * s}" width="${1.6 * s}" height="${6.4 * s}" rx="0.8" fill="#000"/><path d="M${x - 5.5 * s} ${y - 5.5 * s * (izq ? 1 : -0.2) - 1} L${x + 5.5 * s} ${y - 5.5 * s * (izq ? -0.2 : 1) - 1}" stroke="#000" stroke-width="2" stroke-linecap="round"/>`;
    case 'estrella': return `<polygon points="${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => { const r = (i % 2 ? 2.2 : 5.4) * s, a = (Math.PI * i) / 5 - Math.PI / 2; return (x + Math.cos(a) * r).toFixed(1) + ',' + (y + Math.sin(a) * r).toFixed(1); }).join(' ')}" fill="#ffe14d" stroke="#8a5a00" stroke-width="0.8"/>`;
    case 'dormido': return `<path d="M${x - 4 * s} ${y} q${4 * s} ${4 * s} ${8 * s} 0" fill="none" stroke="#1b1b1b" stroke-width="2" stroke-linecap="round"/>`;
    case 'suplica': return `<circle cx="${x}" cy="${y}" r="${5.6 * s}" fill="#1a1a1a"/><circle cx="${x - 1.6 * s}" cy="${y - 1.8 * s}" r="${2 * s}" fill="#fff"/><circle cx="${x + 2 * s}" cy="${y + 1.6 * s}" r="${1 * s}" fill="#fff"/>`;
    case 'mareo': return `<circle cx="${x}" cy="${y}" r="${4.6 * s}" fill="#fff" stroke="#000" stroke-width="1"/><path d="M${x} ${y} m${-1.2 * s} 0 a${1.2 * s} ${1.2 * s} 0 1 1 ${2.4 * s} 0 a${2.4 * s} ${2.4 * s} 0 1 1 ${-4.8 * s} 0 a${3.6 * s} ${3.6 * s} 0 1 1 ${7.2 * s} 0" fill="none" stroke="#000" stroke-width="1.2"/>`;
    default: return `<circle cx="${x}" cy="${y}" r="${4.4 * s}" fill="#fff" stroke="#000" stroke-width="1"/><circle cx="${x + d * 0.5 * s}" cy="${y + 0.5 * s}" r="${2.2 * s}" fill="#111"/><circle cx="${x + 0.3 * s}" cy="${y - 0.9 * s}" r="${0.8 * s}" fill="#fff"/>`;
  }
};
/* cabeza de gato centrada en (cx,cy) con radio r */
function cabeza(cx, cy, r, c, o = {}) {
  const e = o.ojos || 'normal', s = r / 20, ex = r * 0.4, ey = cy - r * 0.04;
  const oreja = (d) => `<polygon points="${cx + d * r * 0.95},${cy - r * 0.1} ${cx + d * r * 0.88},${cy - r * 1.3} ${cx + d * r * 0.18},${cy - r * 0.82}" fill="${c}" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/><polygon points="${cx + d * r * 0.78},${cy - r * 0.3} ${cx + d * r * 0.76},${cy - r * 1.0} ${cx + d * r * 0.32},${cy - r * 0.72}" fill="#ffb3c4"/>`;
  const bigote = (d, k) => `<line x1="${cx + d * r * 0.5}" y1="${cy + r * (0.28 + k * 0.1)}" x2="${cx + d * r * 1.25}" y2="${cy + r * (0.16 + k * 0.2)}" stroke="${o.bigote || '#fff'}" stroke-width="1.1" stroke-linecap="round" opacity=".9"/>`;
  return `${oreja(-1)}${oreja(1)}<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.9}" fill="${c}" stroke="#000" stroke-width="1.8"/>${o.rayas ? [-1, 0, 1].map((k) => `<path d="M${cx + k * r * 0.22} ${cy - r * 0.88} v${r * 0.34}" stroke="${o.rayas}" stroke-width="${r * 0.1}" stroke-linecap="round"/>`).join('') : ''}${o.hocico ? `<ellipse cx="${cx}" cy="${cy + r * 0.36}" rx="${r * 0.46}" ry="${r * 0.34}" fill="${o.hocico}"/>` : ''}${ojo(e, cx - ex, ey, s, true)}${ojo(e, cx + ex, ey, s, false)}<polygon points="${cx - r * 0.1},${cy + r * 0.2} ${cx + r * 0.1},${cy + r * 0.2} ${cx},${cy + r * 0.32}" fill="#ff7d9c" stroke="#000" stroke-width="0.8"/>${o.boca === 'abierta' ? `<ellipse cx="${cx}" cy="${cy + r * 0.58}" rx="${r * 0.2}" ry="${r * 0.15}" fill="#7a0b12"/>` : o.boca === 'colmillos' ? `<path d="M${cx - r * 0.3} ${cy + r * 0.45} q${r * 0.3} ${r * 0.18} ${r * 0.6} 0" fill="none" stroke="#000" stroke-width="1.4"/><polygon points="${cx - r * 0.2},${cy + r * 0.5} ${cx - r * 0.1},${cy + r * 0.5} ${cx - r * 0.15},${cy + r * 0.68}" fill="#fff"/><polygon points="${cx + r * 0.1},${cy + r * 0.5} ${cx + r * 0.2},${cy + r * 0.5} ${cx + r * 0.15},${cy + r * 0.68}" fill="#fff"/>` : `<path d="M${cx} ${cy + r * 0.32} v${r * 0.1} M${cx - r * 0.22} ${cy + r * 0.52} q${r * 0.22} ${r * 0.14} ${r * 0.22} ${-r * 0.1} q0 ${r * 0.24} ${r * 0.22} ${r * 0.1}" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round"/>`}${[-1, 1].map((d) => [0, 1, 2].map((k) => bigote(d, k)).join('')).join('')}`;
}
const estrella = (x, y, r, c = '#ffe14d') => `<polygon points="${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const rr = i % 2 ? r * 0.35 : r, a = (Math.PI * i) / 4 - Math.PI / 2; return (x + Math.cos(a) * rr).toFixed(1) + ',' + (y + Math.sin(a) * rr).toFixed(1); }).join(' ')}" fill="${c}"/>`;
const corazon = (x, y, s, c = '#ff4f86') => `<path d="M${x} ${y + 4 * s} C${x - 9 * s} ${y - 2 * s} ${x - 5 * s} ${y - 9 * s} ${x} ${y - 4 * s} C${x + 5 * s} ${y - 9 * s} ${x + 9 * s} ${y - 2 * s} ${x} ${y + 4 * s}Z" fill="${c}" stroke="#7a0b2a" stroke-width="0.8"/>`;

/* ilustraciones: area 8..92 x 8..112 */
const ARTE = [
  () => `<circle cx="50" cy="66" r="40" fill="#ff3b30" opacity=".18"/><polygon points="25,54 26,28 45,42" fill="#1d1d28" stroke="#000" stroke-width="2"/><polygon points="75,54 74,28 55,42" fill="#1d1d28" stroke="#000" stroke-width="2"/><polygon points="29,48 29,36 39,43" fill="#ff9db0"/><polygon points="71,48 71,36 61,43" fill="#ff9db0"/><circle cx="50" cy="70" r="30" fill="#23232e" stroke="#000" stroke-width="2.4"/><ellipse cx="38" cy="56" rx="9" ry="5" fill="#fff" opacity=".18" transform="rotate(-30 38 56)"/><path d="M50 40 q3 -10 13 -13" stroke="#d3b27a" stroke-width="3.4" fill="none" stroke-linecap="round"/>${estrella(66, 24, 9, '#ffb000')}${estrella(66, 24, 5, '#fff3a0')}<circle cx="74" cy="34" r="1.6" fill="#ffb000"/><circle cx="58" cy="18" r="1.4" fill="#ffd23d"/>${ojo('panico', 40, 66, 1.15, true)}${ojo('panico', 60, 66, 1.15, false)}<ellipse cx="50" cy="84" rx="7" ry="5.5" fill="#6b0a12"/><ellipse cx="50" cy="86" rx="4" ry="2.4" fill="#ff7d8e"/><path d="M76 56 q5 8 0 11 q-5 -3 0 -11z" fill="#6fd0ff"/>`,
  () => `<ellipse cx="50" cy="104" rx="30" ry="5" fill="#000" opacity=".25"/><circle cx="50" cy="76" r="28" fill="#2fb6a6" stroke="#0b4a43" stroke-width="2.2"/><path d="M24 72 q26 -18 52 0 M23 82 q27 -12 54 4 M30 93 q20 -12 42 -2 M34 60 q16 -8 32 -2" fill="none" stroke="#1c8174" stroke-width="2.4" stroke-linecap="round"/><path d="M72 92 q16 8 8 17 q-10 6 -26 2" fill="none" stroke="#2fb6a6" stroke-width="3.4" stroke-linecap="round"/><circle cx="50" cy="76" r="28" fill="none" stroke="#fff" stroke-width="1" opacity=".25"/>${cabeza(50, 44, 17, '#f0a050', { ojos: 'calma', hocico: '#fde6c4' })}<ellipse cx="38" cy="62" rx="6" ry="4.5" fill="#f0a050" stroke="#000" stroke-width="1.4"/><ellipse cx="62" cy="62" rx="6" ry="4.5" fill="#f0a050" stroke="#000" stroke-width="1.4"/><circle cx="78" cy="22" r="9" fill="#22c55e" stroke="#fff" stroke-width="2"/><path d="M73 22 l4 4 l8 -9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  () => `<circle cx="50" cy="62" r="42" fill="#ff2d1a" opacity=".16"/>${cabeza(50, 66, 25, '#ff8a4a', { ojos: 'enojo', boca: 'colmillos', rayas: '#a33d12', hocico: '#ffd2a8' })}<g stroke="#ffe14d" stroke-width="5" stroke-linecap="round"><path d="M74 14 L34 104"/><path d="M86 22 L46 110" opacity=".85"/><path d="M62 10 L22 98" opacity=".85"/></g><g stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".9"><path d="M74 14 L34 104"/><path d="M86 22 L46 110"/><path d="M62 10 L22 98"/></g>`,
  () => `<path d="M72 14 a14 14 0 1 0 14 22 a11 11 0 1 1 -14 -22z" fill="#ffe9a3" stroke="#a87f1a" stroke-width="1.4"/>${estrella(24, 26, 3.4, '#fff')}${estrella(40, 18, 2.4, '#fff')}${estrella(18, 44, 2.2, '#fff')}<ellipse cx="50" cy="98" rx="36" ry="12" fill="#8d63c9" stroke="#2d1a52" stroke-width="2"/><ellipse cx="50" cy="94" rx="30" ry="7" fill="#a984e0" opacity=".7"/><ellipse cx="52" cy="82" rx="28" ry="16" fill="#aab6d8" stroke="#000" stroke-width="1.8"/>${cabeza(33, 76, 14, '#aab6d8', { ojos: 'dormido', hocico: '#e8edf8' })}<path d="M76 82 q14 -4 8 -16 q-4 -6 -10 -2" fill="none" stroke="#aab6d8" stroke-width="6" stroke-linecap="round"/><text x="60" y="52" font-size="17" font-weight="900" fill="#fff" stroke="#2d3288" stroke-width="1.2" font-family="system-ui,sans-serif">Z</text><text x="74" y="40" font-size="12" font-weight="900" fill="#fff" stroke="#2d3288" stroke-width="1" font-family="system-ui,sans-serif">z</text><text x="84" y="30" font-size="8" font-weight="900" fill="#fff" font-family="system-ui,sans-serif">z</text>`,
  () => `${corazon(22, 34, 1.5)}${corazon(78, 30, 1.2)}${corazon(50, 22, 1.1, '#ff8fb5')}${cabeza(50, 66, 25, '#f4c28a', { ojos: 'suplica', hocico: '#fff1dc' })}<circle cx="31" cy="76" r="5" fill="#ff8fa5" opacity=".6"/><circle cx="69" cy="76" r="5" fill="#ff8fa5" opacity=".6"/><ellipse cx="38" cy="102" rx="9" ry="7" fill="#f4c28a" stroke="#000" stroke-width="1.6"/><ellipse cx="62" cy="102" rx="9" ry="7" fill="#f4c28a" stroke="#000" stroke-width="1.6"/><circle cx="38" cy="103" r="3" fill="#ff8fa5"/><circle cx="62" cy="103" r="3" fill="#ff8fa5"/>`,
  () => `<g fill="none" stroke="#aef0ff" stroke-width="4.5" stroke-linecap="round"><path d="M18 64 A32 32 0 0 1 46 30"/><path d="M82 62 A32 32 0 0 1 56 96"/></g><polygon points="46,22 58,32 44,40" fill="#aef0ff"/><polygon points="54,104 42,94 56,86" fill="#aef0ff"/>${cabeza(50, 62, 19, '#bcc3d8', { ojos: 'mareo', hocico: '#eef1fa' })}${estrella(20, 28, 5, '#fff')}${estrella(82, 96, 4, '#fff')}${estrella(80, 30, 3, '#aef0ff')}${estrella(22, 98, 3, '#aef0ff')}`,
  () => `${estrella(18, 24, 5, '#fff')}${estrella(84, 40, 4, '#fff')}${estrella(22, 74, 3, '#d9d2ff')}${cabeza(50, 44, 17, '#e0b070', { ojos: 'estrella', hocico: '#fbe8c8' })}<path d="M30 112 L36 100 H64 L70 112Z" fill="#4a3a88" stroke="#1c1240" stroke-width="2"/><circle cx="50" cy="78" r="26" fill="#7b6cff" opacity=".6" stroke="#d9d2ff" stroke-width="2.4"/><ellipse cx="42" cy="66" rx="8" ry="4.5" fill="#fff" opacity=".4" transform="rotate(-35 42 66)"/>${estrella(50, 80, 8, '#ffe14d')}${estrella(62, 90, 4, '#fff')}${estrella(38, 90, 3.4, '#fff')}`,
  () => `<ellipse cx="50" cy="80" rx="22" ry="19" fill="#3a2a24" stroke="#000" stroke-width="2"/><circle cx="29" cy="56" r="8" fill="#3a2a24" stroke="#000" stroke-width="2"/><circle cx="43" cy="44" r="8.5" fill="#3a2a24" stroke="#000" stroke-width="2"/><circle cx="58" cy="44" r="8.5" fill="#3a2a24" stroke="#000" stroke-width="2"/><circle cx="72" cy="56" r="8" fill="#3a2a24" stroke="#000" stroke-width="2"/><ellipse cx="50" cy="82" rx="12" ry="9" fill="#ff9db0" opacity=".85"/><circle cx="50" cy="64" r="36" fill="none" stroke="#e11d2e" stroke-width="8"/><path d="M25 39 L75 89" stroke="#e11d2e" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="64" r="36" fill="none" stroke="#fff" stroke-width="1.2" opacity=".5"/>`,
  () => `<ellipse cx="50" cy="104" rx="27" ry="6" fill="#d89a4a" stroke="#6b3f10" stroke-width="1.6"/><ellipse cx="50" cy="99" rx="27" ry="6" fill="#efbe74" stroke="#6b3f10" stroke-width="1.6"/><ellipse cx="50" cy="94" rx="27" ry="6" fill="#d89a4a" stroke="#6b3f10" stroke-width="1.6"/><ellipse cx="50" cy="90" rx="27" ry="6" fill="#f5cf8a" stroke="#6b3f10" stroke-width="1.6"/><path d="M30 90 q2 12 5 6 q3 8 6 0 M62 90 q2 9 5 4" fill="none" stroke="#8a3d12" stroke-width="3.4" stroke-linecap="round"/><rect x="44" y="84" width="12" height="6" rx="1.5" fill="#ffe14d" stroke="#a88a00" stroke-width="1"/>${cabeza(50, 56, 24, '#f29a3d', { ojos: 'calma', rayas: '#a3500e', hocico: '#ffe0b8' })}`,
  () => `${cabeza(44, 54, 23, '#a8aab8', { ojos: 'normal', hocico: '#e9eaf1', bigote: '#fff' })}<g transform="rotate(8 66 92)"><path d="M58 70 h18 v28 q0 12 -12 12 q-14 0 -14 -12 v-8z" fill="#fff" stroke="#000" stroke-width="2"/><rect x="58" y="74" width="18" height="5" fill="#e0453a"/><rect x="58" y="84" width="18" height="5" fill="#e0453a"/><rect x="50" y="94" width="26" height="5" fill="#e0453a" transform="rotate(8 58 96)"/><path d="M58 70 h18 v6 h-18z" fill="#fff" stroke="#000" stroke-width="1.2"/></g><path d="M50 74 q8 8 14 -2" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round"/>`,
  () => `<path d="M72 54 C92 62 40 72 30 86 S60 102 36 108" fill="none" stroke="#000" stroke-width="15" stroke-linecap="round"/><path d="M72 54 C92 62 40 72 30 86 S60 102 36 108" fill="none" stroke="#f3d18b" stroke-width="11.5" stroke-linecap="round"/><path d="M72 54 C92 62 40 72 30 86 S60 102 36 108" fill="none" stroke="#c9a14a" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round"/>${cabeza(66, 40, 16, '#f3d18b', { ojos: 'normal', hocico: '#fff6dc' })}<path d="M20 30 q4 -6 0 -12 M30 26 q4 -6 0 -12" fill="none" stroke="#fff" stroke-width="2" opacity=".6" stroke-linecap="round"/>`,
  () => `<polygon points="30,42 70,42 58,10 56,8" fill="#3b4fd8" stroke="#000" stroke-width="2" stroke-linejoin="round"/><rect x="27" y="39" width="46" height="8" rx="4" fill="#fff" stroke="#000" stroke-width="1.6"/><circle cx="57" cy="9" r="5.4" fill="#fff" stroke="#000" stroke-width="1.6"/><path d="M30 44 h40" stroke="#000" stroke-width="1"/>${cabeza(50, 62, 20, '#8fb8ff', { ojos: 'calma', hocico: '#e6f0ff' })}<rect x="30" y="86" width="40" height="26" rx="10" fill="#3b4fd8" stroke="#000" stroke-width="2"/><path d="M33 94 h34 M32 102 h36" stroke="#fff" stroke-width="3" opacity=".8"/>`,
  () => `${cabeza(50, 58, 24, '#2b2b33', { ojos: 'normal', hocico: '#f6f6f6', bigote: '#fff' })}<path d="M26 74 q-14 -4 -12 8 q2 8 12 2 M74 74 q14 -4 12 8 q-2 8 -12 2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M30 80 q-14 6 -10 18 M70 80 q14 6 10 18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".85"/><circle cx="60" cy="56" r="8.4" fill="none" stroke="#e8b923" stroke-width="2"/><path d="M66 62 q6 12 2 24" fill="none" stroke="#e8b923" stroke-width="1.4"/><polygon points="50,90 36,84 36,100" fill="#d6283a" stroke="#000" stroke-width="1.6"/><polygon points="50,90 64,84 64,100" fill="#d6283a" stroke="#000" stroke-width="1.6"/><circle cx="50" cy="91" r="4.4" fill="#a31a29" stroke="#000" stroke-width="1.4"/>`
];

/* glifo de esquina (ayuda a distinguir sin depender del color) */
const GLIFO = [
  '<circle cx="0" cy="1" r="4" fill="#fff"/><path d="M1 -3 l3 -3" stroke="#fff" stroke-width="1.6"/>',
  '<circle r="4" fill="none" stroke="#fff" stroke-width="2"/>',
  '<polygon points="0,-5 5,4 -5,4" fill="#fff"/>',
  '<rect x="-4" y="-4" width="3" height="8" fill="#fff"/><rect x="1.2" y="-4" width="3" height="8" fill="#fff"/>',
  '<path d="M0 4 C-8 -1 -4 -7 0 -3 C4 -7 8 -1 0 4Z" fill="#fff"/>',
  '<path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
  '<polygon points="0,-5 1.5,-1.5 5,-1.2 2.3,1.3 3.2,5 0,3 -3.2,5 -2.3,1.3 -5,-1.2 -1.5,-1.5" fill="#fff"/>',
  '<circle r="4.2" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M-3 -3 L3 3" stroke="#fff" stroke-width="1.8"/>'
];
const glifo = (t, tema) => {
  const g = t < 8 ? GLIFO[t] : `<text y="3.6" text-anchor="middle" font-size="10" font-weight="900" fill="#fff" font-family="system-ui,sans-serif">${t - 7}</text>`;
  return `<g transform="translate(17 19)"><circle r="${tema === 'dalto' ? 10 : 9}" fill="#000" opacity=".62"/>${g}</g>`;
};

const cache = new Map();
export function svgTipo(t, tema = 'clasico') {
  const k = t + tema; let s = cache.get(k); if (s) return s;
  const p = pal(t, tema), inf = INFO[t];
  const claro = tema === 'dalto' && (t === 0 ? false : false);
  const txt = claro ? '#000' : '#fff';
  s = `<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${inf.n}"><rect x="2" y="2" width="96" height="146" rx="11" fill="${p[0]}" stroke="${p[3]}" stroke-width="3"/><rect x="8" y="8" width="84" height="106" rx="8" fill="${p[2]}"/><svg x="8" y="8" width="84" height="106" viewBox="8 8 84 106" overflow="hidden">${ARTE[t]()}</svg>${glifo(t, tema)}<rect x="8" y="118" width="84" height="25" rx="7" fill="${p[1]}"/><text x="50" y="130" text-anchor="middle" font-size="${inf.n.length > 10 ? 9 : 10.5}" font-weight="900" fill="${txt}" font-family="system-ui,-apple-system,Segoe UI,sans-serif">${inf.n}</text><text x="50" y="138.6" text-anchor="middle" font-size="5.2" font-weight="700" letter-spacing=".6" fill="${txt}" opacity=".85" font-family="system-ui,sans-serif">${inf.s}</text></svg>`;
  cache.set(k, s); return s;
}
export const svgCarta = (id, tema) => svgTipo(MAZO[id], tema);

export function svgDorso(tema = 'clasico') {
  const neon = tema === 'neon', dalto = tema === 'dalto';
  const f = dalto ? '#000' : neon ? '#07061a' : '#241044', b = dalto ? '#fff' : neon ? '#3df5ff' : '#ff9d3d', c = dalto ? '#333' : neon ? '#1a1650' : '#3a1b6e';
  return `<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="2" y="2" width="96" height="146" rx="11" fill="${f}" stroke="${b}" stroke-width="3"/><rect x="9" y="9" width="82" height="132" rx="7" fill="${c}"/><g fill="none" stroke="${b}" stroke-width="1.4" opacity=".5"><circle cx="50" cy="75" r="36" stroke-dasharray="4 5"/><circle cx="50" cy="75" r="44"/></g><ellipse cx="50" cy="84" rx="17" ry="15" fill="${b}"/><circle cx="31" cy="64" r="7" fill="${b}"/><circle cx="43" cy="53" r="7.5" fill="${b}"/><circle cx="58" cy="53" r="7.5" fill="${b}"/><circle cx="70" cy="64" r="7" fill="${b}"/><polygon points="50,18 53,25 60,26 55,31 56,38 50,34 44,38 45,31 40,26 47,25" fill="${b}" opacity=".8"/><polygon points="50,132 52,127 57,126 53,123 54,118 50,121 46,118 47,123 43,126 48,127" fill="${b}" opacity=".7"/></svg>`;
}
export function nombreDeJuegoTipo(t) { return INFO[t].n; }
export { T };
