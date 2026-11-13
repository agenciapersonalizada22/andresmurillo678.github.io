// Genera puzzles en un Web Worker; si no esta disponible (o falla) usa el hilo principal.
import { generar, analizarTexto } from './generador.js';

let w = null, seq = 0, intentoWorker = true;
const pend = new Map();
function trabajador() {
  if (w || !intentoWorker) return w;
  try {
    w = new Worker(new URL('./trabajador.js', import.meta.url), { type: 'module' });
    w.onmessage = (e) => { const p = pend.get(e.data.id); if (!p) return; pend.delete(e.data.id); e.data.ok ? p.res(e.data.r) : p.rej(new Error(e.data.error)); };
    w.onerror = () => { intentoWorker = false; const t = w; w = null; try { t.terminate(); } catch (e) { /* ya cerrado */ } const q = Array.from(pend.values()); pend.clear(); q.forEach((p) => p.reintentar()); };
  } catch (e) { intentoWorker = false; w = null; }
  return w;
}
function pedir(op, args, directo) {
  return new Promise((res, rej) => {
    const local = () => setTimeout(() => { try { res(directo(args)); } catch (e) { rej(e); } }, 30);
    const t = trabajador();
    if (!t) return local();
    const id = ++seq;
    pend.set(id, { res, rej, reintentar: local });
    t.postMessage({ id, op, args });
  });
}
export const generarAsync = (opts) => pedir('generar', opts, generar);
export const analizarAsync = (texto) => pedir('analizar', texto, analizarTexto);
export const usaWorker = () => !!w;
