// Puntuacion oficial de boliche de 10 frames (logica pura, sin DOM). `tiros` = pinos derribados por cada lanzamiento.

/* Estado del siguiente lanzamiento: frame 1..10, tiro 1..3, rack = rack nuevo (10 pinos) o continua el frame. */
export function siguiente(tiros) {
  let i = 0;
  for (let f = 1; f <= 9; f++) {
    if (i >= tiros.length) return { terminado: false, frame: f, tiro: 1, rack: true };
    if (tiros[i] === 10) { i += 1; continue; }
    if (i + 1 >= tiros.length) return { terminado: false, frame: f, tiro: 2, rack: false };
    i += 2;
  }
  const r = tiros.slice(i);
  if (r.length === 0) return { terminado: false, frame: 10, tiro: 1, rack: true };
  if (r.length === 1) return { terminado: false, frame: 10, tiro: 2, rack: r[0] === 10 };
  if (r.length === 2) {
    if (r[0] === 10) return { terminado: false, frame: 10, tiro: 3, rack: r[1] === 10 };
    if (r[0] + r[1] === 10) return { terminado: false, frame: 10, tiro: 3, rack: true };
    return { terminado: true, frame: 10, tiro: 3, rack: false };
  }
  return { terminado: true, frame: 10, tiro: 3, rack: false };
}

/* Tabla: frames[f] = {t:[...pinos], marcas:['X','/','-',n], acum:null|n (null si faltan bonos)}. */
export function calcular(tiros) {
  const frames = [];
  let i = 0, acum = 0, total = 0;
  const marca = (n) => (n === 0 ? '-' : String(n));
  for (let f = 1; f <= 10; f++) {
    const fr = { t: [], marcas: [], acum: null };
    if (i >= tiros.length) { frames.push(fr); continue; }
    if (f < 10) {
      const a = tiros[i];
      if (a === 10) {
        fr.t = [10]; fr.marcas = ['X'];
        if (i + 2 < tiros.length) { acum += 10 + tiros[i + 1] + tiros[i + 2]; fr.acum = acum; total = acum; }
        i += 1;
      } else if (i + 1 < tiros.length) {
        const b = tiros[i + 1];
        fr.t = [a, b]; fr.marcas = [marca(a), a + b === 10 ? '/' : marca(b)];
        if (a + b === 10) { if (i + 2 < tiros.length) { acum += 10 + tiros[i + 2]; fr.acum = acum; total = acum; } }
        else { acum += a + b; fr.acum = acum; total = acum; }
        i += 2;
      } else { fr.t = [a]; fr.marcas = [marca(a)]; i += 1; }
    } else {
      const r = tiros.slice(i, i + 3);
      fr.t = r.slice();
      r.forEach((n, k) => {
        if (n === 10) fr.marcas.push('X');
        else if (k > 0 && r[k - 1] !== 10 && r[k - 1] + n === 10) fr.marcas.push('/');
        else fr.marcas.push(marca(n));
      });
      const sg = siguiente(tiros);
      if (sg.terminado) { acum += r.reduce((s, n) => s + n, 0); fr.acum = acum; total = acum; }
      i = tiros.length;
    }
    frames.push(fr);
  }
  return { frames, total, completo: siguiente(tiros).terminado };
}

/* Puntaje que se mostraria hasta ahora (incluye bonos parciales). */
export function parcial(tiros) {
  let t = 0, i = 0;
  for (let f = 1; f <= 10 && i < tiros.length; f++) {
    if (f < 10) {
      if (tiros[i] === 10) { t += 10 + (tiros[i + 1] || 0) + (tiros[i + 2] || 0); i += 1; }
      else { const s = tiros[i] + (tiros[i + 1] || 0); t += s === 10 ? 10 + (tiros[i + 2] || 0) : s; i += 2; }
    } else { t += tiros.slice(i, i + 3).reduce((s, n) => s + n, 0); i = tiros.length; }
  }
  return t;
}

export const contarStrikes = (tiros) => {
  let n = 0, i = 0;
  for (let f = 1; f <= 9 && i < tiros.length; f++) { if (tiros[i] === 10) { n++; i += 1; } else i += 2; }
  const [a, b, c] = tiros.slice(i);
  if (a === 10) n++;
  if (a === 10 && b === 10) n++;
  if ((a === 10 && b === 10 && c === 10) || (a !== undefined && a < 10 && a + b === 10 && c === 10)) n++;
  return n;
};

export const contarSpares = (tiros) => calcular(tiros).frames.reduce((n, f) => n + f.marcas.filter((m) => m === '/').length, 0);

/* Racha maxima de strikes consecutivos (pavo = 3). */
export function rachaStrikes(tiros) {
  let mejor = 0, act = 0, i = 0;
  for (let f = 1; f <= 9 && i < tiros.length; f++) {
    if (tiros[i] === 10) { act++; mejor = Math.max(mejor, act); i += 1; } else { act = 0; i += 2; }
  }
  for (const n of tiros.slice(i)) { if (n === 10) { act++; mejor = Math.max(mejor, act); } else act = 0; }
  return mejor;
}

/* Quien lanza despues: se mantiene el jugador mientras le queden tiros en su frame; si no, el siguiente no terminado. */
export function siguienteTurno(todos, actual) {
  const n = todos.length;
  const sg = siguiente(todos[actual]);
  if (!sg.terminado && sg.tiro > 1) return actual;
  for (let k = 1; k <= n; k++) {
    const j = (actual + k) % n;
    if (!siguiente(todos[j]).terminado) return j;
  }
  return -1;
}

export const NOMBRE_MARCA = { X: 'Strike', '/': 'Spare', '-': 'Fallo' };
