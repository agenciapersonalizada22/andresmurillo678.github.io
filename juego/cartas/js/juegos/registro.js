// Registro de juegos disponibles. Para anadir uno: crea su carpeta (reglas + bot + ui + index) y agregalo aqui (ver LEEME.md).
import { Poker } from './poker/index.js';
import { Veintiuno, SieteYMedio } from './veintiuno/index.js';

// id del catalogo -> {J: modulo de reglas (J.id es el id del motor), preset: opciones fijas}
export const CATALOGO = {
  poker: { id: 'poker', J: Poker, emoji: '♠', corto: 'Póker Hold\'em', desc: 'Ciegas, botes laterales, torneos. 2 a 6 jugadores.' },
  veintiuno: { id: 'veintiuno', J: Veintiuno, emoji: '21', corto: 'Veintiuno', desc: 'Blackjack contra la banca. 1 a 7 jugadores.' },
  sietemedio: { id: 'sietemedio', J: SieteYMedio, emoji: '7½', corto: 'Siete y medio', desc: 'Baraja española de 40. Gana a la banca sin pasarte de 7,5.' },
};
export const motores = { poker: Poker, veintiuno: Veintiuno, sietemedio: SieteYMedio };
// la mesa guarda el id del catalogo en m.juego
export const motorDe = (id) => (CATALOGO[id] || CATALOGO.poker).J;
export const lista = () => Object.values(CATALOGO);
