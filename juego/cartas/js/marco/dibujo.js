// Dibujo vectorial procedural de las barajas francesa y espanola (SVG generado, sin imagenes externas) y de los reversos.
import { parse, esEspanola, etiqueta, nombreCarta } from './barajas.js';

export const opciones = { daltonico: false, contraste: false, reverso: 'azul' };
export const REVERSOS = [['azul', 'Azul rombos'], ['rojo', 'Rojo clasico'], ['verde', 'Verde estrellas'], ['negro', 'Negro dorado'], ['dorado', 'Dorado']];
const cache = new Map();
export function ajustar(o) { Object.assign(opciones, o); cache.clear(); }

const COLOR = {
  normal: { S: '#17171c', C: '#17171c', H: '#c8141c', D: '#c8141c', o: '#d49a0c', c: '#c8141c', e: '#1f5fbf', b: '#2b7d2f' },
  dalt: { S: '#111111', H: '#d55e00', D: '#0072b2', C: '#009e73', o: '#e69f00', c: '#d55e00', e: '#0072b2', b: '#009e73' },
};
const color = (p) => (opciones.daltonico ? COLOR.dalt : COLOR.normal)[p];
const NEG = '#1a1a22';
// glifos en caja 24x24
function glifo(p, cx, cy, s, rot) {
  const c = color(p), t = `translate(${cx - s / 2} ${cy - s / 2}) scale(${s / 24})`, r = rot ? ` rotate(180 12 12)` : '';
  const st = opciones.contraste ? ` stroke="${NEG}" stroke-width="1.2"` : '';
  let d;
  switch (p) {
    case 'S': d = '<path d="M12 1C9 6 2 9.500 2 15.200A5 5 0 0 0 11 18.500C10.800 21 10 22.500 8 23h8c-2-.5-2.800-2-3-4.500A5 5 0 0 0 22 15.200C22 9.500 15 6 12 1z"/>'; break;
    case 'H': d = '<path d="M12 22.500C5 17 2 13 2 8.500A5.500 5.500 0 0 1 12 5.500 5.500 5.500 0 0 1 22 8.500C22 13 19 17 12 22.500z"/>'; break;
    case 'D': d = '<path d="M12 1 21 12 12 23 3 12z"/>'; break;
    case 'C': d = '<circle cx="12" cy="7" r="5"/><circle cx="6.500" cy="14.500" r="5"/><circle cx="17.500" cy="14.500" r="5"/><path d="M12 12 9 23.500h6z"/>'; break;
    case 'o': return `<g transform="${t}"><circle cx="12" cy="12" r="11" fill="${c}" stroke="#7a5200" stroke-width="1.500"/><circle cx="12" cy="12" r="7.500" fill="none" stroke="#fff4c4" stroke-width="1.400"/><circle cx="12" cy="12" r="3" fill="#fff4c4"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3" stroke="#7a5200" stroke-width="1.200"/></g>`;
    case 'c': d = '<path d="M4 1.500h16c0 8-3 11.500-7 12.500v5h5v3.500H6V19h5v-5C7 13 4 9.500 4 1.500z"/>'; break;
    case 'e': d = '<path d="M12 .5l3.200 4.500v13.500H8.800V5z"/><rect x="4" y="18" width="16" height="2.800" rx="1.400"/><rect x="10.400" y="20.500" width="3.200" height="3.300" rx="1"/>'; break;
    case 'b': d = '<path d="M9.500 1C14 0 17.500 2.500 17 7c-.3 3-2 4.500-2.800 7L13.800 23h-4l.5-9C9 11.500 7.300 9.500 7.500 6.500 7.600 4 8.300 2 9.500 1z"/><circle cx="9.800" cy="6" r="1.100" fill="#fff" opacity=".6"/><circle cx="13.500" cy="9" r="1.100" fill="#fff" opacity=".6"/>'; break;
    default: return '';
  }
  return `<g transform="${t}${r}" fill="${c}"${st}>${d}</g>`;
}
// posiciones de pips (x 0..100, y 0..140) para los valores 1..10
const X1 = 34, X2 = 50, X3 = 66;
const PIPS = {
  1: [[50, 70]], 2: [[50, 32], [50, 108]], 3: [[50, 32], [50, 70], [50, 108]],
  4: [[X1, 32], [X3, 32], [X1, 108], [X3, 108]], 5: [[X1, 32], [X3, 32], [50, 70], [X1, 108], [X3, 108]],
  6: [[X1, 32], [X3, 32], [X1, 70], [X3, 70], [X1, 108], [X3, 108]],
  7: [[X1, 32], [X3, 32], [50, 51], [X1, 70], [X3, 70], [X1, 108], [X3, 108]],
  8: [[X1, 32], [X3, 32], [50, 51], [X1, 70], [X3, 70], [50, 89], [X1, 108], [X3, 108]],
  9: [[X1, 32], [X3, 32], [X1, 57], [X3, 57], [50, 70], [X1, 83], [X3, 83], [X1, 108], [X3, 108]],
  10: [[X1, 32], [X3, 32], [50, 45], [X1, 57], [X3, 57], [X1, 83], [X3, 83], [50, 95], [X1, 108], [X3, 108]],
};
// figura (sota/caballo/rey o J/Q/K) en la mitad superior; se repite girada 180 grados
function figura(rango, p) {
  const c = color(p), ORO = '#e6b422', PIEL = '#f3d2a6';
  let s = `<rect x="24" y="26" width="52" height="88" rx="4" fill="${c}" opacity=".10"/><rect x="24" y="26" width="52" height="88" rx="4" fill="none" stroke="${c}" stroke-width="1.500"/>`;
  const mitad = (() => {
    let g = `<path d="M30 70 34 56Q50 48 66 56L70 70z" fill="${c}"/>`;       // hombros
    g += `<path d="M44 56h12v6Q50 66 44 62z" fill="${PIEL}"/>`;               // cuello
    g += `<circle cx="50" cy="46" r="9" fill="${PIEL}" stroke="#7a5a30" stroke-width=".8"/><circle cx="46.500" cy="45" r="1" fill="#333"/><circle cx="53.500" cy="45" r="1" fill="#333"/><path d="M47 50q3 2.500 6 0" stroke="#a33" fill="none" stroke-width="1"/>`;
    if (rango === 'K' || rango === 'R') g += `<path d="M39 40 41 30 46 36 50 28 54 36 59 30 61 40z" fill="${ORO}" stroke="#7a5200" stroke-width=".8"/><path d="M42 52q8 9 16 0" fill="#6b4a1f" opacity=".7"/>`;
    else if (rango === 'Q') g += `<path d="M39 41Q38 30 50 30 62 30 61 41Q56 35 50 35T39 41z" fill="#7a4a1c"/><path d="M42 33 44 28 47 32 50 27 53 32 56 28 58 33z" fill="${ORO}" stroke="#7a5200" stroke-width=".7"/>`;
    else if (rango === 'J' || rango === 'S') g += `<path d="M38 41Q40 30 50 30T62 41Q56 37 50 37T38 41z" fill="${c}"/><path d="M59 36Q72 24 70 34" stroke="${ORO}" stroke-width="2" fill="none"/>`;
    else g += `<path d="M39 41Q40 29 50 29T61 41z" fill="#9aa3b0" stroke="#555" stroke-width=".8"/><path d="M50 29Q54 20 62 24" stroke="${ORO}" stroke-width="2.500" fill="none"/>`; // caballo: casco con penacho
    g += glifo(p, 33, 68, 9);
    return g;
  })();
  return s + `<g>${mitad}</g><g transform="rotate(180 50 70)">${mitad}</g><line x1="24" y1="70" x2="76" y2="70" stroke="${c}" stroke-width=".8" opacity=".5"/>`;
}
function indice(v, p, lab, x, y, rot) {
  const c = color(p), tam = opciones.contraste ? 25 : 22, mas = lab.length > 1 ? tam * 0.82 : tam;
  const g = `<text x="${x}" y="${y}" font-size="${mas}" font-weight="700" text-anchor="middle" fill="${c}" font-family="Georgia,'Times New Roman',serif"${opciones.contraste ? ` stroke="${NEG}" stroke-width=".5"` : ''}>${lab}</text>${glifo(p, x, y + 11, 13)}`;
  return rot ? `<g transform="rotate(180 50 70)">${g}</g>` : g;
}
const RANGO_FIG = { fr: { 11: 'J', 12: 'Q', 13: 'K' }, es: { 10: 'S', 11: 'C', 12: 'R' } };

export function svgCarta(code) {
  const { v, p, comodin } = parse(code);
  const borde = opciones.contraste ? NEG : '#3b3b44', sw = opciones.contraste ? 3 : 1.800;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140"><rect x="1.500" y="1.500" width="97" height="137" rx="9" fill="#fffdf6" stroke="${borde}" stroke-width="${sw}"/>`;
  if (comodin) {
    s += `<text x="50" y="58" font-size="30" text-anchor="middle" fill="#7a2fc4" font-family="Georgia,serif" font-weight="700">★</text><text x="50" y="84" font-size="14" text-anchor="middle" fill="#7a2fc4" font-family="Georgia,serif" font-weight="700" letter-spacing="1">JOKER</text><path d="M28 124l6-20 8 10 8-16 8 16 8-10 6 20z" fill="#e6b422" stroke="#7a5200" stroke-width="1"/>`;
    return s + '</svg>';
  }
  const esp = esEspanola(code), lab = etiqueta(code), fig = esp ? v >= 10 : v >= 11;
  s += indice(v, p, lab, 12, 24, false) + indice(v, p, lab, 12, 24, true);
  if (fig) s += figura(RANGO_FIG[esp ? 'es' : 'fr'][v], p);
  else if (v === 1) s += glifo(p, 50, 70, esp ? 44 : 46);
  else {
    const lista = PIPS[v] || [];
    lista.forEach(([x, y]) => { s += glifo(p, x, y, 21, !esp && y > 70); });
  }
  return s + '</svg>';
}
// reversos: patrones generados sin <pattern> para que cada SVG sea autonomo
export function svgReverso(id) {
  const T = {
    azul: ['#1d3b8f', '#9ec1ff', '#0e2260'], rojo: ['#8a1c1c', '#f0c987', '#561010'], verde: ['#14532d', '#a7e8b5', '#0a3319'],
    negro: ['#15151b', '#d4af37', '#000000'], dorado: ['#c9971c', '#fff2b8', '#7a5200'],
  }[id] || ['#1d3b8f', '#9ec1ff', '#0e2260'];
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140"><rect x="1.500" y="1.500" width="97" height="137" rx="9" fill="#fffdf6" stroke="#3b3b44" stroke-width="1.800"/><rect x="7" y="7" width="86" height="126" rx="5" fill="${T[0]}"/>`;
  s += `<clipPath id="k"><rect x="9" y="9" width="82" height="122" rx="4"/></clipPath><g clip-path="url(#k)" stroke="${T[1]}" stroke-width="1" opacity=".75" fill="none">`;
  if (id === 'verde') { for (let y = 16; y < 140; y += 16) for (let x = (y / 16) % 2 ? 14 : 22; x < 100; x += 16) s += `<path d="M${x} ${y - 4}l1.300 2.800 3 .4-2.200 2 .6 3-2.700-1.500-2.700 1.500.6-3-2.200-2 3-.4z" fill="${T[1]}" stroke="none"/>`; }
  else if (id === 'negro' || id === 'dorado') { for (let i = -14; i < 16; i++) { s += `<path d="M${i * 8} 0L${i * 8 + 100} 140M${i * 8 + 100} 0L${i * 8} 140"/>`; } s += `<rect x="16" y="16" width="68" height="108" stroke-width="1.500"/>`; }
  else { for (let i = -10; i < 14; i++) { s += `<path d="M${i * 10} 0L${i * 10 + 140} 140M${i * 10 + 140} 0L${i * 10} 140"/>`; } }
  s += `</g><ellipse cx="50" cy="70" rx="17" ry="22" fill="${T[2]}" stroke="${T[1]}" stroke-width="1.500"/><path d="M50 55l9 15-9 15-9-15z" fill="${T[1]}"/></svg>`;
  return s;
}
const uri = (svg) => 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
export function urlCarta(code) { const k = 'c' + code; if (!cache.has(k)) cache.set(k, uri(svgCarta(code))); return cache.get(k); }
export function urlReverso(id) { const k = 'r' + (id || opciones.reverso); if (!cache.has(k)) cache.set(k, uri(svgReverso(id || opciones.reverso))); return cache.get(k); }

// elemento DOM de carta con dos caras (volteable). code === null -> boca abajo.
export function elementoCarta(code, extra) {
  const d = document.createElement('div'); d.className = 'carta' + (extra ? ' ' + extra : '');
  d.innerHTML = '<div class="in"><div class="cara"></div><div class="dorso"></div></div>';
  poner(d, code); return d;
}
export function poner(el, code) {
  const cara = el.querySelector('.cara'), dorso = el.querySelector('.dorso'); if (!cara) return;
  dorso.style.backgroundImage = urlReverso();
  if (code) { cara.style.backgroundImage = urlCarta(code); el.dataset.c = code; el.setAttribute('aria-label', nombreCarta(code)); el.classList.add('arriba'); }
  else { cara.style.backgroundImage = ''; delete el.dataset.c; el.setAttribute('aria-label', 'Carta boca abajo'); el.classList.remove('arriba'); }
  el.setAttribute('role', 'img');
}
export function refrescarCartas(raiz) {
  raiz.querySelectorAll('.carta').forEach((el) => poner(el, el.dataset.c || null));
}
