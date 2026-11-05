// Reconocimiento de formas a partir de un trazo a mano alzada (puntos [x,y] del mundo).
// Devuelve {fm, ...} o null. fm: linea | flecha | rect | elipse | tri | rombo
import { rdp, distSeg } from './geom.js';

const largo = P => { let l = 0; for (let i = 1; i < P.length; i++) l += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return l; };

export function reconocer(P) {
  if (!P || P.length < 5) return null;
  const L = largo(P);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of P) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  const w = x1 - x0, h = y1 - y0, diag = Math.hypot(w, h);
  if (L < 30 || diag < 20) return null;
  const A = P[0], B = P[P.length - 1];
  const hueco = Math.hypot(A[0] - B[0], A[1] - B[1]);

  if (hueco > 0.2 * L) {
    let dev = 0;
    for (const q of P) dev = Math.max(dev, distSeg(q[0], q[1], A[0], A[1], B[0], B[1]));
    if (dev <= Math.max(4, 0.06 * hueco)) return ajustarLinea('linea', A, B);
    const S = rdp(P, Math.max(3, 0.04 * diag));
    if (S.length >= 4 && S.length <= 6) {
      const tip = S[1], s0 = Math.hypot(tip[0] - S[0][0], tip[1] - S[0][1]);
      let cerca = true;
      for (let i = 2; i < S.length; i++) if (Math.hypot(S[i][0] - tip[0], S[i][1] - tip[1]) > 0.45 * s0) cerca = false;
      if (cerca && s0 >= 0.5 * L && Math.hypot(S[S.length - 1][0] - tip[0], S[S.length - 1][1] - tip[1]) < 0.45 * s0) return ajustarLinea('flecha', S[0], tip);
    }
    return null;
  }

  // forma cerrada
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, a = Math.max(w / 2, 6), b = Math.max(h / 2, 6);
  let eE = 0, eB = 0;
  for (const [x, y] of P) {
    eE += Math.abs(Math.hypot((x - cx) / a, (y - cy) / b) - 1);
    eB += Math.min(x - x0, x1 - x, y - y0, y1 - y) / (Math.min(w, h) / 2 || 1);
  }
  eE /= P.length; eB /= P.length;
  if (w < 0.25 * h || h < 0.25 * w) return null;
  const R = { x: x0, y: y0, w, h };
  if (eE < eB && eE < 0.13) { if (Math.abs(w - h) < 0.14 * Math.max(w, h)) { const m = (w + h) / 2; R.x = cx - m / 2; R.y = cy - m / 2; R.w = R.h = m; } return { fm: 'elipse', ...R }; }
  if (eB < 0.14) { if (Math.abs(w - h) < 0.1 * Math.max(w, h)) { const m = (w + h) / 2; R.x = cx - m / 2; R.y = cy - m / 2; R.w = R.h = m; } return { fm: 'rect', ...R }; }
  const S = rdp(P.concat([P[0]]), 0.09 * diag);
  const V = S.slice(0, -1);
  if (V.length === 3) return { fm: 'tri', ...R };
  if (V.length === 4) {
    const mid = [[cx, y0], [x1, cy], [cx, y1], [x0, cy]];
    if (mid.every(m => V.some(q => Math.hypot(q[0] - m[0], q[1] - m[1]) < 0.22 * diag))) return { fm: 'rombo', ...R };
  }
  return null;
}

function ajustarLinea(fm, A, B) {
  let [x1, y1] = A, [x2, y2] = B;
  const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI, aa = Math.abs(ang);
  if (aa < 5 || aa > 175) y2 = y1;
  else if (Math.abs(aa - 90) < 5) x2 = x1;
  return { fm, x1, y1, x2, y2 };
}
