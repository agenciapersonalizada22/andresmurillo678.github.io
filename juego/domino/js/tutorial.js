// Contenido del tutorial: pasos con texto y una figura dibujada con las mismas fichas del juego.
import { h } from './dom.js';
import { miniFicha } from './escena.js';

const fila = (fichas, extra) => h('div', { cls: 'tuto-fig' }, [...fichas.map(([a, b, v]) => (a == null ? h('span', { cls: 'sep' }) : miniFicha(a, b, 54, !!v))), extra || null]);
const txt = (t) => h('span', { txt: t, style: 'margin:0 8px;font-weight:800;color:#ffd23d' });

export const PASOS = [
  { t: 'Objetivo', html: 'Cada jugador recibe sus fichas. Gana la mano quien se queda <b>sin fichas</b> primero (o quien tenga menos puntos si el juego se <b>tranca</b>). La partida se juega a una <b>meta de puntos</b> (por ejemplo 100 o 200).', fig: () => fila([[6, 6], [6, 4], [4, 1], [1, 1], [1, 3]]) },
  { t: 'Cómo se juega una ficha', html: 'Pon una ficha en cualquiera de los dos extremos de la cadena, <b>con el mismo número</b>. Aquí la cadena termina en 5 y en 2: el 4-5 (a la izquierda) y el 2-0 (a la derecha) encajan. Los dobles se colocan atravesados.', fig: () => fila([[4, 5, 1], [null], [5, 3], [3, 1], [1, 6], [6, 2], [null], [2, 0, 1]]) },
  { t: 'Pasar y robar', html: 'Si no tienes ninguna ficha que encaje, <b>pasas</b> (los demás oyen el «toc»). En el <b>duelo de dos</b> primero robas del <b>pozo</b> hasta que te salga una jugable; si el pozo se acaba, pasas. Pasar delata qué números no tienes: ¡los bots lo recuerdan!', fig: () => fila([[5, 2], [2, 2], [2, 0], [null], [4, 3, 1], [1, 1, 1], [6, 3, 1]], txt('sin 5 ni 0 →  pasa')) },
  { t: 'Tranque', html: 'Si todos pasan seguidos nadie puede jugar: la mano está <b>trancada</b>. Gana quien (o la pareja que) sume menos puntos en sus fichas y se lleva todos los puntos de la mesa. Si hay empate, nadie anota.', fig: () => fila([[0, 0], [0, 3], [3, 3], [3, 5], [5, 0]]) },
  { t: 'Capicúa', html: 'Si cierras la mano con una ficha que podía ir en <b>los dos extremos</b>, es <b>capicúa</b> y ganas un bono (25 o 50 puntos, configurable). Aquí el 4-3 cabe en ambos lados (la cadena termina en 4 y en 3).', fig: () => fila([[4, 4], [4, 1], [1, 2], [2, 2], [2, 3], [null], [3, 4, 1]]) },
  { t: 'Parejas, todos y duelo', html: '<b>Parejas</b>: cuatro jugadores, tu compañero se sienta frente a ti y los puntos son del equipo. <b>Todos contra todos</b>: 3 o 4 jugadores, cada uno por su cuenta. <b>Duelo</b>: dos jugadores con pozo. El ganador anota la suma de las fichas que quedan en la mesa (o solo las rivales, según la regla elegida).' },
  { t: 'Variantes y apuestas', html: '<b>Doble 6</b> (28 fichas), <b>doble 9</b> (55) y <b>doble 12</b> (91). En la mesa puedes apostar <b>fichas virtuales</b> (solo del juego, nunca dinero): quien gana la partida se lleva el bote.' },
  { t: 'Controles', html: '<b>Toca</b> una ficha para elegirla y vuelve a tocarla (o toca el extremo resaltado, o arrástrala) para jugarla. <b>Pellizca</b> o usa la rueda para acercar la cadena y arrástrala para moverla. <b>Teclado</b>: ← → eligen, ↑ ↓ cambian de extremo, Enter juega, P pasa, R roba. <b>Mando Xbox</b>: cruceta/stick, A juega, LB/RB extremo, X roba, Y pasa, stick derecho mueve el tablero.' }
];
