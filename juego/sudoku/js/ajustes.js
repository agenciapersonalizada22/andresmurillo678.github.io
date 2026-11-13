// Ajustes por dispositivo (sudoku_ajustes_dispositivo): tema, graficos, audio, controles y accesibilidad.
import { CLAVES, leer, escribir, mezclar } from './almacen.js';

export const TEMAS = [
  { id: 'oscuro', nombre: 'Oscuro' }, { id: 'claro', nombre: 'Claro' }, { id: 'papel', nombre: 'Papel' },
  { id: 'contraste', nombre: 'Contraste alto' }, { id: 'daltonico', nombre: 'Daltónico' }
];
export const DEFECTO = {
  tema: 'oscuro',
  graficos: { animaciones: true, resaltarIguales: true, resaltarUnidades: true, resaltarConflictos: true, mostrarTiempo: true, mostrarErrores: true },
  audio: { maestro: 0.7, efectos: true, silencio: false },
  controles: { entrada: 'celda', autoquitarNotas: true, autocomprobar: false, vibracion: true, vibIntensidad: 0.6, zonaMuerta: 0.3, zurdo: false, tamTeclado: 1 },
  accesibilidad: { textoGrande: false, reducirMovimiento: false, altoContraste: false },
  ultimo: { variante: 'clasico', nivel: 1, modo: 'libre' }
};
export const A = mezclar(DEFECTO, leer(CLAVES.dispositivo, {}));
export const guardar = () => escribir(CLAVES.dispositivo, A);
export function restaurar() { Object.assign(A, JSON.parse(JSON.stringify(DEFECTO))); guardar(); aplicar(); }
export function recargar() { Object.assign(A, mezclar(DEFECTO, leer(CLAVES.dispositivo, {}))); aplicar(); }

export function aplicar() {
  const b = document.body, a = A.accesibilidad;
  b.dataset.tema = A.tema;
  b.classList.toggle('texto-grande', !!a.textoGrande);
  b.classList.toggle('sin-mov', !!a.reducirMovimiento || !A.graficos.animaciones);
  b.classList.toggle('contraste', !!a.altoContraste || A.tema === 'contraste');
  b.classList.toggle('zurdo', !!A.controles.zurdo);
  b.style.setProperty('--k-teclado', String(A.controles.tamTeclado));
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = { oscuro: '#0f1424', claro: '#f3f5fa', papel: '#f1e8d2', contraste: '#000000', daltonico: '#10161f' }[A.tema] || '#0f1424';
}
