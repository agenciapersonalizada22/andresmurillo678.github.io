// Barajas: fr52 (francesa), es40 (espanola 1-7,10-12), es48 (con 8 y 9). Carta = texto "<valor><palo>", comodin "0J".
// Palos franceses en mayuscula: S picas, H corazones, D diamantes, C treboles. Espanoles en minuscula: o oros, c copas, e espadas, b bastos.
export const PALOS_FR = ['S', 'H', 'D', 'C'], PALOS_ES = ['o', 'c', 'e', 'b'];
export const NOMBRE_PALO = { S: 'picas', H: 'corazones', D: 'diamantes', C: 'treboles', o: 'oros', c: 'copas', e: 'espadas', b: 'bastos' };
export const TIPOS = {
  fr52: { id: 'fr52', nombre: 'Francesa 52', valores: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], palos: PALOS_FR },
  es40: { id: 'es40', nombre: 'Espanola 40', valores: [1, 2, 3, 4, 5, 6, 7, 10, 11, 12], palos: PALOS_ES },
  es48: { id: 'es48', nombre: 'Espanola 48', valores: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], palos: PALOS_ES },
};
export function crearBaraja(tipo, { comodines = 0, mazos = 1 } = {}) {
  const t = TIPOS[tipo]; if (!t) throw new Error('baraja desconocida ' + tipo);
  const out = [];
  for (let m = 0; m < Math.max(1, mazos); m++) {
    for (const p of t.palos) for (const v of t.valores) out.push(v + p);
    if (tipo === 'fr52') for (let k = 0; k < Math.min(2, comodines); k++) out.push('0J');
  }
  return out;
}
export function parse(c) {
  if (c === '0J') return { v: 0, p: 'J', comodin: true };
  const m = /^(\d+)([A-Za-z])$/.exec(c); if (!m) return null;
  return { v: +m[1], p: m[2], comodin: false };
}
export const esEspanola = (c) => /[oceb]$/.test(c);
export function etiqueta(c) {
  const { v, p, comodin } = parse(c);
  if (comodin) return '★';
  if (esEspanola(c)) return v === 10 ? 'S' : v === 11 ? 'C' : v === 12 ? 'R' : String(v);
  return v === 1 ? 'A' : v === 11 ? 'J' : v === 12 ? 'Q' : v === 13 ? 'K' : String(v);
}
export function nombreCarta(c) {
  const { v, p, comodin } = parse(c);
  if (comodin) return 'Comodin';
  const e = esEspanola(c);
  const n = e ? (v === 1 ? 'As' : v === 10 ? 'Sota' : v === 11 ? 'Caballo' : v === 12 ? 'Rey' : String(v))
    : (v === 1 ? 'As' : v === 11 ? 'Jota' : v === 12 ? 'Reina' : v === 13 ? 'Rey' : String(v));
  return n + ' de ' + NOMBRE_PALO[p];
}
