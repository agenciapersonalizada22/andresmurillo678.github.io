import { sel } from './util.js';
export const RAREZAS = [
  { n: 'Común', c: '#b8b8b8', m: 1 }, { n: 'Poco común', c: '#5fd35f', m: 1.05 }, { n: 'Rara', c: '#4aa8ff', m: 1.1 },
  { n: 'Épica', c: '#b45cff', m: 1.16 }, { n: 'Legendaria', c: '#ffb52e', m: 1.22 }];
/* dano base, cd entre disparos (s), mag, rec recarga (s), disp dispersion (grados), vel m/s, g gravedad de la bala, pel perdigones,
   retro retroceso (grados), alc alcance sin caida, zoom FOV al apuntar, expl radio de explosion */
export const ARMAS = {
  pistola: { n: 'Pistola', mun: 'ligera', dano: 24, cd: 0.17, mag: 16, rec: 1.5, disp: 1.1, vel: 320, g: 5, pel: 1, auto: false, retro: 1.3, alc: 55, zoom: 52, largo: 0.35, col: 0x555555 },
  smg: { n: 'Subfusil', mun: 'ligera', dano: 17, cd: 0.075, mag: 30, rec: 2.0, disp: 2.4, vel: 330, g: 5, pel: 1, auto: true, retro: 0.7, alc: 40, zoom: 52, largo: 0.5, col: 0x333344 },
  escopeta: { n: 'Escopeta', mun: 'cartuchos', dano: 11, cd: 0.85, mag: 5, rec: 2.8, disp: 4.5, vel: 240, g: 9, pel: 8, auto: false, retro: 5, alc: 18, zoom: 50, largo: 0.65, col: 0x6b4a2b },
  rifle: { n: 'Rifle', mun: 'media', dano: 30, cd: 0.13, mag: 30, rec: 2.2, disp: 1.3, vel: 430, g: 4, pel: 1, auto: true, retro: 1.2, alc: 80, zoom: 46, largo: 0.8, col: 0x2d4a2d },
  francotirador: { n: 'Francotirador', mun: 'pesada', dano: 105, cd: 1.5, mag: 1, rec: 2.5, disp: 0.05, vel: 800, g: 1.5, pel: 1, auto: false, retro: 6.5, alc: 220, zoom: 14, largo: 1.1, col: 0x22222a },
  cohete: { n: 'Lanzacohetes', mun: 'cohetes', dano: 100, cd: 2.0, mag: 1, rec: 3.2, disp: 0.5, vel: 62, g: 2.5, pel: 1, auto: false, retro: 5, alc: 999, zoom: 50, largo: 0.9, col: 0x8a2a2a, expl: 6 }};
export const ARMAS_ID = Object.keys(ARMAS);
export const MUN = { ligera: { n: 'Munición ligera', max: 180 }, media: { n: 'Munición media', max: 150 }, pesada: { n: 'Munición pesada', max: 30 }, cartuchos: { n: 'Cartuchos', max: 36 }, cohetes: { n: 'Cohetes', max: 8 } };
export const CONS = {
  vendaje: { n: 'Vendaje', cura: 15, tope: 75, t: 3.5, max: 15 }, botiquin: { n: 'Botiquín', cura: 100, tope: 100, t: 8, max: 3 },
  escudo_peq: { n: 'Escudo pequeño', esc: 25, tope: 50, t: 2, max: 6 }, escudo: { n: 'Poción de escudo', esc: 50, tope: 100, t: 4.5, max: 3 }};
export const MATERIALES = ['madera', 'piedra', 'metal'];
export const dano = (w, r) => ARMAS[w].dano * RAREZAS[r].m;
export function falloff(w, d) { const a = ARMAS[w].alc; return d <= a ? 1 : Math.max(0.5, 1 - (d - a) / (a * 3) * 0.5); }
export function rareza(R, cofre) { return sel(R, [0, 1, 2, 3, 4], cofre ? [0, 28, 40, 24, 8] : [48, 28, 15, 7, 2]); }
export function generarItem(R, cofre) {
  const x = R();
  if (x < 0.36) return { k: 'arma', w: sel(R, ['pistola', 'smg', 'escopeta', 'rifle', 'francotirador', 'cohete'], cofre ? [10, 18, 20, 26, 14, 12] : [18, 17, 16, 22, 8, 4]), r: rareza(R, cofre) };
  if (x < 0.62) { const t = sel(R, ['ligera', 'media', 'cartuchos', 'pesada', 'cohetes'], [30, 28, 20, 10, 5]); return { k: 'mun', t, n: { ligera: 30, media: 30, cartuchos: 8, pesada: 5, cohetes: 2 }[t] }; }
  if (x < 0.84) { const t = sel(R, ['vendaje', 'botiquin', 'escudo_peq', 'escudo'], [34, 10, 36, 20]); return { k: 'cons', t, n: t === 'vendaje' ? 4 : t === 'escudo_peq' ? 2 : 1 }; }
  return { k: 'mat', t: sel(R, ['madera', 'piedra', 'metal'], [50, 32, 18]), n: 30 + Math.floor(R() * 25) };
}
export function descItem(it) {
  if (it.k === 'arma') return ARMAS[it.w].n + ' (' + RAREZAS[it.r].n + ')';
  if (it.k === 'mun') return MUN[it.t].n + ' x' + it.n;
  if (it.k === 'cons') return CONS[it.t].n + ' x' + it.n;
  return 'Madera Piedra Metal'.split(' ')[MATERIALES.indexOf(it.t)] + ' x' + it.n;
}
export const colorItem = (it) => (it.k === 'arma' ? RAREZAS[it.r].c : it.k === 'mun' ? '#e8c050' : it.k === 'cons' ? '#ff6b8a' : it.t === 'madera' ? '#c08850' : it.t === 'piedra' ? '#aaaaaa' : '#7fb4e8');
