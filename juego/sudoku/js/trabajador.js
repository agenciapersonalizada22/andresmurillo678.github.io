// Web Worker: genera y analiza puzzles fuera del hilo principal.
import { generar, analizarTexto } from './generador.js';

self.onmessage = (e) => {
  const { id, op, args } = e.data;
  try { self.postMessage({ id, ok: true, r: op === 'analizar' ? analizarTexto(args) : generar(args) }); }
  catch (err) { self.postMessage({ id, ok: false, error: String(err && err.message || err) }); }
};
