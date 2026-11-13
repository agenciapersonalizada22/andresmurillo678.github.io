// Catalogo: 5 areas cognitivas y 24 minijuegos (uno por archivo en js/juegos/).
import { JUEGOS } from './juegos/indice.js';
export { JUEGOS };
export const AREAS = [
  { id: 'memoria', nombre: 'Memoria', icono: '◈', marca: '○', desc: 'Retener y recordar secuencias, lugares y palabras.', evaluar: ['eco', 'lista'] },
  { id: 'atencion', nombre: 'Atención', icono: '◎', marca: '□', desc: 'Concentrarte en lo relevante e ignorar distracciones.', evaluar: ['tinta', 'buscador'] },
  { id: 'velocidad', nombre: 'Velocidad de procesamiento', icono: '⚡', marca: '△', desc: 'Percibir y responder con rapidez y precisión.', evaluar: ['relampago', 'cifras'] },
  { id: 'flexibilidad', nombre: 'Flexibilidad', icono: '⇋', marca: '◇', desc: 'Cambiar de regla o de tarea y controlar impulsos.', evaluar: ['cambio', 'alterna'] },
  { id: 'logica', nombre: 'Lógica y cálculo', icono: '∑', marca: '✕', desc: 'Razonar, calcular y resolver problemas.', evaluar: ['calculo', 'matriz'] }
];
export const juegoPorId = (id) => JUEGOS.find((j) => j.id === id);
export const areaPorId = (id) => AREAS.find((a) => a.id === id);
export const juegosDeArea = (id) => JUEGOS.filter((j) => j.area === id);
export const juegosPorArea = Object.fromEntries(AREAS.map((a) => [a.id, juegosDeArea(a.id).map((j) => j.id)]));
export const AVISO = 'Gimnasio Mental es entretenimiento y práctica: no afirma mejorar la inteligencia ni sustituye una evaluación médica o neuropsicológica.';
