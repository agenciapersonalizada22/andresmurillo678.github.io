// Ajuste de texto en lineas (la medida real la aporta el lienzo; en Node se estima).
import { FUENTE } from './config.js';
export const fuenteCSS = (fs, negrita, cursiva) => `${cursiva ? 'italic ' : ''}${negrita ? '700' : '400'} ${fs}px ${FUENTE}`;
export const medirAprox = (fs, negrita) => s => s.length * fs * (negrita ? 0.58 : 0.54);

export function envolver(texto, ancho, medir) {
  const res = [];
  for (const par of String(texto || '').split('\n')) {
    if (!par) { res.push(''); continue; }
    let linea = '';
    for (const pal of par.split(/(?<=\s)/)) {
      const t = linea + pal;
      if (linea && medir(t.trimEnd()) > ancho) { res.push(linea.trimEnd()); linea = pal; } else linea = t;
      while (medir(linea.trimEnd()) > ancho && linea.length > 1) {   // palabra mas larga que la caja
        let k = linea.length - 1;
        while (k > 1 && medir(linea.slice(0, k)) > ancho) k--;
        res.push(linea.slice(0, k)); linea = linea.slice(k);
      }
    }
    res.push(linea.trimEnd());
  }
  return res;
}

// Tamano de fuente de una nota: el mayor (hasta fs) que cabe en la caja.
export function ajustarNota(texto, w, h, fsMax, medirDe) {
  const pad = 14;
  for (let fs = fsMax; fs >= 9; fs -= 1) {
    const L = envolver(texto, w - pad * 2, medirDe(fs, false));
    if (L.length * fs * 1.25 <= h - pad * 2) return { fs, lineas: L };
  }
  return { fs: 9, lineas: envolver(texto, w - pad * 2, medirDe(9, false)) };
}
