// Registro de juegos disponibles. Para anadir uno: crea su carpeta (reglas + bot + ui + index) y agregalo aqui (ver LEEME.md).
import { Poker } from './poker/index.js';
import { Veintiuno, SieteYMedio } from './veintiuno/index.js';
import { Dompe } from './dompe/index.js';
import { Conquian } from './conquian/index.js';
import { Pescar } from './pescar/index.js';

// id del catalogo -> {J: modulo de reglas (J.id es el id del motor), preset: opciones fijas}
export const CATALOGO = {
  poker: { id: 'poker', J: Poker, emoji: '♠', corto: 'Póker Hold\'em', desc: 'Ciegas, botes laterales, torneos. 2 a 6 jugadores.' },
  veintiuno: { id: 'veintiuno', J: Veintiuno, emoji: '21', corto: 'Veintiuno', desc: 'Blackjack contra la banca. 1 a 7 jugadores.' },
  sietemedio: { id: 'sietemedio', J: SieteYMedio, emoji: '7½', corto: 'Siete y medio', desc: 'Baraja española de 40. Gana a la banca sin pasarte de 7,5.' },
  conquian: { id: 'conquian', J: Conquian, emoji: '🂱', corto: 'Conquián', desc: 'Combinaciones y escaleras con baraja española. 2 a 4 jugadores.' },
  pescar: { id: 'pescar', J: Pescar, emoji: '🎣', corto: 'Ve a pescar', desc: 'Pide cartas, pesca y junta libros. Con versión familiar. 2 a 6 jugadores.' },
  dompe: { id: 'dompe', J: Dompe, emoji: '6🂠', corto: 'Dompe', desc: 'Mano de 6 cartas, comodines y «dompe». 2 a 6 jugadores.' },
};
export const motores = { poker: Poker, veintiuno: Veintiuno, sietemedio: SieteYMedio, dompe: Dompe, conquian: Conquian, pescar: Pescar };
// la mesa guarda el id del catalogo en m.juego
export const motorDe = (id) => (CATALOGO[id] || CATALOGO.poker).J;
export const lista = () => Object.values(CATALOGO);
