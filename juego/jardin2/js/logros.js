// Logros y evaluacion. Formato de las entradas: id:'..', nombre:'..', desc:'..'
export const LOGROS = [
  { id:'primera_victoria', nombre:'Primer salto', desc:'Gana el primer nivel de Arenas Antiguas.' },
  { id:'primera_energia', nombre:'Chispa verde', desc:'Usa tu primera Energía Verde.' },
  { id:'mundo_1', nombre:'Faraón destronado', desc:'Completa las Arenas Antiguas.' },
  { id:'mundo_2', nombre:'Lobo de mar', desc:'Completa los Mares Piratas.' },
  { id:'mundo_3', nombre:'Dueño de la frontera', desc:'Completa la Frontera del Oeste.' },
  { id:'mundo_4', nombre:'Deshielo', desc:'Completa la Edad de Hielo.' },
  { id:'mundo_5', nombre:'Rey sin corona', desc:'Completa la Era Medieval.' },
  { id:'mundo_6', nombre:'Mañana ya fue', desc:'Completa el Futuro Lejano.' },
  { id:'mundo_7', nombre:'Explorador de lianas', desc:'Completa la Selva Perdida.' },
  { id:'mundo_8', nombre:'Mordisco prehistórico', desc:'Completa la Era Jurásica.' },
  { id:'mundo_9', nombre:'Luces de neón', desc:'Completa el Mundo Neón.' },
  { id:'mundo_10', nombre:'Pequeño paso verde', desc:'Completa la Luna y termina el viaje.' },
  { id:'estrellas_30', nombre:'Constelación', desc:'Reúne 30 estrellas.' },
  { id:'estrellas_120', nombre:'Cielo despejado', desc:'Reúne 120 estrellas.' },
  { id:'estrellas_300', nombre:'Vía Láctea', desc:'Reúne 300 estrellas.' },
  { id:'cien_zombis', nombre:'Cazador', desc:'Derrota 100 zombis.' },
  { id:'mil_zombis', nombre:'Exterminador temporal', desc:'Derrota 1000 zombis.' },
  { id:'pinata', nombre:'¡Fiesta!', desc:'Revienta una piñata.' },
  { id:'diez_pinatas', nombre:'Rey de la fiesta', desc:'Revienta 10 piñatas.' },
  { id:'nivel5_planta', nombre:'Planta de élite', desc:'Lleva una planta al nivel 5.' },
  { id:'plantas_20', nombre:'Herbolario', desc:'Desbloquea 20 plantas.' },
  { id:'plantas_35', nombre:'Botánico del tiempo', desc:'Desbloquea 35 plantas.' },
  { id:'poder_dedo', nombre:'Mano firme', desc:'Usa un poder de dedo.' },
  { id:'sinfin_10', nombre:'Piso diez', desc:'Llega al piso 10 de la Zona sin fin.' },
  { id:'sinfin_25', nombre:'Torre de huesos', desc:'Llega al piso 25 de la Zona sin fin.' },
  { id:'arena_1', nombre:'Gladiador', desc:'Juega una Arena semanal.' },
  { id:'arena_2000', nombre:'Campeón de la Arena', desc:'Consigue 2000 puntos en una Arena.' },
  { id:'diario', nombre:'Constante', desc:'Completa un evento diario.' },
  { id:'racha_3', nombre:'Racha de tres', desc:'Completa el evento diario 3 días seguidos.' },
  { id:'coleccion', nombre:'Coleccionista', desc:'Completa la colección de un mundo.' },
  { id:'sin_pulso', nombre:'Sin red', desc:'Gana un nivel sin usar el pulso temporal.' },
  { id:'tres_estrellas', nombre:'Perfección', desc:'Gana un nivel con tres estrellas.' },
  { id:'jefes_5', nombre:'Cazajefes', desc:'Derrota a 5 jefes.' },
];
export const MAPA = Object.fromEntries(LOGROS.map((l) => [l.id, l]));
export function evaluar(PR, c) {
  const out = [], ok = (id, v) => { if (v) out.push(id); }, st = PR.stats;
  ok('primera_victoria', !!PR.hechos['1-1']); ok('primera_energia', st.energias >= 1);
  for (let m = 1; m <= 10; m++) ok('mundo_' + m, c.mundoCompleto(m - 1));
  ok('estrellas_30', c.estrellas >= 30); ok('estrellas_120', c.estrellas >= 120); ok('estrellas_300', c.estrellas >= 300);
  ok('cien_zombis', st.matados >= 100); ok('mil_zombis', st.matados >= 1000); ok('pinata', st.pinatas >= 1); ok('diez_pinatas', st.pinatas >= 10);
  ok('nivel5_planta', Object.values(PR.potenc).some((v) => v >= 5)); ok('plantas_20', c.plantasN >= 20); ok('plantas_35', c.plantasN >= 35);
  ok('poder_dedo', st.poderes >= 1); ok('sinfin_10', PR.sinfin.mejor >= 10); ok('sinfin_25', PR.sinfin.mejor >= 25);
  ok('arena_1', PR.arena.intentos >= 1); ok('arena_2000', PR.arena.mejor >= 2000); ok('diario', PR.diario.hecho || PR.diario.racha >= 1); ok('racha_3', PR.diario.racha >= 3);
  ok('coleccion', c.colecciones >= 1); ok('jefes_5', st.jefes >= 5);
  return out;
}
