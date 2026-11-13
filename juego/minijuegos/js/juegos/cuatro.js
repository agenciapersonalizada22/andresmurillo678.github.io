import { dentroZona, texto, rrect, clamp } from '../util.js';

export const COLS = 7, FILAS = 6;
export const nuevoTablero = () => Array(COLS * FILAS).fill(-1); // indice = fila*COLS+col, fila 0 arriba
export const filaLibre = (t, col) => { for (let f = FILAS - 1; f >= 0; f--) if (t[f * COLS + col] < 0) return f; return -1; };
export function soltar(t, col, j) { const f = filaLibre(t, col); if (f < 0) return -1; t[f * COLS + col] = j; return f; }
const LIN = (() => { const l = []; for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) for (const [df, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { const fin = [f + df * 3, c + dc * 3]; if (fin[0] < 0 || fin[0] >= FILAS || fin[1] < 0 || fin[1] >= COLS) continue; l.push([0, 1, 2, 3].map((k) => (f + df * k) * COLS + c + dc * k)); } return l; })();
export const ganadorCuatro = (t) => { for (const l of LIN) { const a = t[l[0]]; if (a >= 0 && a === t[l[1]] && a === t[l[2]] && a === t[l[3]]) return a; } return -1; };
export const columnasLibres = (t) => [0, 1, 2, 3, 4, 5, 6].filter((c) => t[c] < 0);
function eval4(t, yo) {
  let s = 0; for (let f = 0; f < FILAS; f++) if (t[f * COLS + 3] === yo) s += 3; else if (t[f * COLS + 3] >= 0) s -= 3;
  for (const l of LIN) { let a = 0, b = 0; for (const i of l) { if (t[i] === yo) a++; else if (t[i] >= 0) b++; } if (a && !b) s += [0, 1, 4, 20][a]; else if (b && !a) s -= [0, 1, 4, 20][b]; }
  return s;
}
function ab(t, prof, alfa, beta, turno, yo) {
  const g = ganadorCuatro(t); if (g >= 0) return (g === yo ? 1e5 : -1e5) * (prof + 1);
  const cols = columnasLibres(t).sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b)); if (!cols.length) return 0; if (prof === 0) return eval4(t, yo);
  let mejor = turno === yo ? -1e9 : 1e9;
  for (const c of cols) { const f = soltar(t, c, turno); const v = ab(t, prof - 1, alfa, beta, 1 - turno, yo); t[f * COLS + c] = -1; if (turno === yo) { mejor = Math.max(mejor, v); alfa = Math.max(alfa, v); } else { mejor = Math.min(mejor, v); beta = Math.min(beta, v); } if (beta <= alfa) break; }
  return mejor;
}
export function jugadaCuatro(t, yo, nivel, rnd) {
  const cols = columnasLibres(t);
  const gana = (m) => cols.find((c) => { const f = soltar(t, c, m); const g = ganadorCuatro(t); t[f * COLS + c] = -1; return g === m; });
  if (nivel === 0) return gana(yo) ?? (rnd() < 0.6 ? gana(1 - yo) : null) ?? rnd.elige(cols);
  let mp = -1e12, mejores = []; const prof = nivel === 1 ? 3 : 5;
  for (const c of cols) { const f = soltar(t, c, yo); const v = ab(t, prof - 1, -1e9, 1e9, 1 - yo, yo); t[f * COLS + c] = -1; if (v > mp) { mp = v; mejores = [c]; } else if (v === mp) mejores.push(c); }
  return rnd.elige(mejores);
}
export default {
  id: 'cuatro', nombre: '4 en raya', icono: '🔴', cat: 'Mesa y estrategia', min: 2, max: 2, dur: 45, ctrl: 'puntero', compartido: true,
  instr: ['Deja caer fichas por turnos en las columnas.', 'Toca una columna (o flechas y A).', 'Gana quien junte 4 en línea. Tienes 12 s por turno.'],
  crear(c) {
    const pts = [0, 0], S = { t: Array(42).fill(-1), turno: 0, fase: 'juega', lim: 12, ult: null, ta: 0, cur: 3, espera: 0 };
    const geo = () => { const w = Math.min(c.W * 0.94, c.H * 0.56 * COLS / FILAS), cs = w / COLS; return { cs, x: (c.W - w) / 2, y: (c.H - cs * FILAS) / 2 }; };
    const echar = (col) => {
      if (S.fase !== 'juega') return; const f = soltar(S.t, col, S.turno); if (f < 0) return;
      S.ult = { col, f }; S.ta = 0; S.lim = 12; c.fx.snd('golpe');
      const g = ganadorCuatro(S.t);
      if (g >= 0) { S.fase = 'fin'; pts[g] = 1; c.fx.snd('ok'); } else if (!columnasLibres(S.t).length) { S.fase = 'fin'; pts[0] = pts[1] = 0.5; } else S.turno = 1 - S.turno;
      S.espera = 0;
    };
    const inst = {
      pts, fin: false,
      puntero(i, lx, ly, wx) { if (c.jug[S.turno].bot) return; const G = geo(), col = Math.floor((wx - G.x) / G.cs); if (col >= 0 && col < COLS) { S.cur = col; echar(col); } },
      update(dt, ent) {
        if (this.fin) return; S.ta += dt; S.espera += dt;
        if (S.fase === 'fin') { if (S.espera > 1.6) this.fin = true; return; }
        S.lim -= dt; const j = c.jug[S.turno];
        if (j.bot) { if (S.espera > 0.8) echar(jugadaCuatro(S.t, S.turno, j.nivel, c.rnd)); return; }
        const e = ent[S.turno]; if (e.izqP) S.cur = (S.cur + 6) % 7; if (e.derP) S.cur = (S.cur + 1) % 7; if (e.aP) echar(S.cur);
        if (S.lim <= 0) echar(c.rnd.elige(columnasLibres(S.t)));
      },
      draw(g) {
        const G = geo(), r = G.cs * 0.38;
        g.fillStyle = '#2745a8'; rrect(g, G.x - 6, G.y - 6, G.cs * COLS + 12, G.cs * FILAS + 12, 16); g.fill();
        if (S.fase === 'juega' && !c.jug[S.turno].bot) { g.fillStyle = c.jug[S.turno].color + '44'; g.fillRect(G.x + S.cur * G.cs, G.y - 6, G.cs, G.cs * FILAS + 12); }
        for (let f = 0; f < FILAS; f++) for (let col = 0; col < COLS; col++) {
          const m = S.t[f * COLS + col]; let y = G.y + (f + 0.5) * G.cs;
          if (S.ult && S.ult.col === col && S.ult.f === f && S.ta < 0.3) { const k = clamp(S.ta / 0.3, 0, 1); y = G.y - G.cs + (y - (G.y - G.cs)) * k * k; }
          g.beginPath(); g.arc(G.x + (col + 0.5) * G.cs, y, r, 0, 6.3); g.fillStyle = m >= 0 ? c.jug[m].color : '#0b0820'; g.fill(); if (m >= 0) { g.lineWidth = 3; g.strokeStyle = '#fff8'; g.stroke(); }
        }
        for (let i = 0; i < 2; i++) dentroZona(g, c.zonas[i], (w, h) => { const mi = S.turno === i && S.fase === 'juega'; texto(g, S.fase === 'fin' ? (pts[i] === 1 ? '¡Ganaste!' : pts[i] === 0.5 ? 'Empate' : 'Perdiste') : mi ? `¡Tu turno! (${Math.max(0, S.lim | 0)})` : 'Espera…', w / 2, h - 74, 16, mi ? '#fff' : '#ffffff88'); });
      }
    };
    return inst;
  }
};
