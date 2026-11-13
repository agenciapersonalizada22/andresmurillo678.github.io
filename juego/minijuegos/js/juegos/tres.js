import { dentroZona, texto, rrect } from '../util.js';

export const LINEAS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
export const ganadorTres = (t) => { for (const [a, b, c] of LINEAS) if (t[a] >= 0 && t[a] === t[b] && t[b] === t[c]) return t[a]; return -1; };
export const llenoTres = (t) => t.every((x) => x >= 0);
function minimax(t, turno, yo, prof) {
  const g = ganadorTres(t); if (g >= 0) return g === yo ? 10 - prof : prof - 10; if (llenoTres(t)) return 0;
  let mejor = turno === yo ? -99 : 99;
  for (let i = 0; i < 9; i++) if (t[i] < 0) { t[i] = turno; const v = minimax(t, 1 - turno, yo, prof + 1); t[i] = -1; mejor = turno === yo ? Math.max(mejor, v) : Math.min(mejor, v); }
  return mejor;
}
export function jugadaTres(t, yo, nivel, rnd) {
  const libres = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => t[i] < 0);
  const probar = (m) => libres.find((i) => { t[i] = m; const g = ganadorTres(t); t[i] = -1; return g === m; });
  if (nivel === 0) return rnd() < 0.3 ? (probar(yo) ?? rnd.elige(libres)) : rnd.elige(libres);
  if (nivel === 1) { const a = probar(yo); if (a != null) return a; const b = probar(1 - yo); if (b != null && rnd() < 0.85) return b; return libres.includes(4) && rnd() < 0.7 ? 4 : rnd.elige(libres); }
  let mp = -99, mejores = [];
  for (const i of libres) { t[i] = yo; const v = minimax(t, 1 - yo, yo, 1); t[i] = -1; if (v > mp) { mp = v; mejores = [i]; } else if (v === mp) mejores.push(i); }
  return rnd.elige(mejores);
}
export default {
  id: 'tres', nombre: 'Tres en raya', icono: '❌', cat: 'Mesa y estrategia', min: 2, max: 2, dur: 40, ctrl: 'puntero', compartido: true,
  instr: ['Por turnos, marca casillas: tres en línea gana.', 'Toca la casilla (o muévete con flechas y pulsa A).', 'Se juega al mejor de 3 partidas rápidas.'],
  crear(c) {
    const pts = [0, 0], S = { tab: Array(9).fill(-1), turno: 0, inicio: 0, minis: 0, fase: 'juega', t: 0, lim: 10, msg: '', cur: [4, 4] };
    const B = () => Math.min(c.W * 0.88, c.H * 0.5), orig = () => ({ x: (c.W - B()) / 2, y: (c.H - B()) / 2 });
    const poner = (i) => {
      if (S.fase !== 'juega' || S.tab[i] >= 0) return;
      S.tab[i] = S.turno; S.lim = 10; c.fx.snd('toque');
      const g = ganadorTres(S.tab);
      if (g >= 0 || llenoTres(S.tab)) { S.fase = 'mini'; S.t = 0; S.msg = g >= 0 ? c.jug[g].nombre + ' gana' : 'Empate'; if (g >= 0) { pts[g]++; c.fx.snd('ok'); } S.minis++; } else S.turno = 1 - S.turno;
    };
    const inst = {
      pts, fin: false,
      puntero(i, lx, ly, wx, wy) { if (c.jug[S.turno].bot) return; const o = orig(), cs = B() / 3, cx = Math.floor((wx - o.x) / cs), cy = Math.floor((wy - o.y) / cs); if (cx >= 0 && cx < 3 && cy >= 0 && cy < 3) { S.cur[S.turno] = cy * 3 + cx; poner(cy * 3 + cx); } },
      update(dt, ent) {
        if (this.fin) return; S.t += dt;
        if (S.fase === 'mini') { if (S.t > 1.3) { if (pts[0] >= 2 || pts[1] >= 2 || S.minis >= 3) { this.fin = true; return; } S.tab.fill(-1); S.inicio = 1 - S.inicio; S.turno = S.inicio; S.fase = 'juega'; S.t = 0; S.lim = 10; } return; }
        S.lim -= dt;
        const j = c.jug[S.turno];
        if (j.bot) { if (S.t > 0.7 + S.turno * 0.0) { S.t = 0; poner(jugadaTres(S.tab, S.turno, j.nivel, c.rnd)); } return; }
        const e = ent[S.turno]; let k = S.cur[S.turno], x = k % 3, y = (k / 3) | 0;
        if (e.izqP) x = (x + 2) % 3; if (e.derP) x = (x + 1) % 3; if (e.arrP) y = (y + 2) % 3; if (e.abaP) y = (y + 1) % 3; S.cur[S.turno] = y * 3 + x;
        if (e.aP) poner(y * 3 + x);
        if (S.lim <= 0) poner(c.rnd.elige([0, 1, 2, 3, 4, 5, 6, 7, 8].filter((q) => S.tab[q] < 0)));
      },
      draw(g) {
        const o = orig(), b = B(), cs = b / 3;
        g.lineWidth = 6; g.strokeStyle = '#ffffff55'; g.lineCap = 'round';
        for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(o.x + k * cs, o.y + 8); g.lineTo(o.x + k * cs, o.y + b - 8); g.moveTo(o.x + 8, o.y + k * cs); g.lineTo(o.x + b - 8, o.y + k * cs); g.stroke(); }
        S.tab.forEach((m, i) => {
          const x = o.x + (i % 3 + 0.5) * cs, y = o.y + (((i / 3) | 0) + 0.5) * cs, r = cs * 0.3;
          if (m < 0 && S.fase === 'juega' && !c.jug[S.turno].bot && S.cur[S.turno] === i) { g.fillStyle = c.jug[S.turno].color + '33'; rrect(g, x - cs * 0.45, y - cs * 0.45, cs * 0.9, cs * 0.9, 12); g.fill(); }
          if (m < 0) return; g.lineWidth = 10; g.strokeStyle = c.jug[m].color; g.beginPath();
          if (m === 0) { g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x + r, y - r); g.lineTo(x - r, y + r); } else g.arc(x, y, r, 0, 6.3); g.stroke();
        });
        for (let i = 0; i < 2; i++) dentroZona(g, c.zonas[i], (w, h) => {
          const mi = S.turno === i && S.fase === 'juega';
          texto(g, S.fase === 'mini' ? S.msg : mi ? `¡Tu turno! (${Math.max(0, S.lim | 0)})` : 'Espera…', w / 2, h - 74, 16, mi ? '#fff' : '#ffffff88');
          texto(g, i === 0 ? 'Juegas con ✕' : 'Juegas con ○', w / 2, h - 96, 12, c.jug[i].color, 'center', 700);
        });
      }
    };
    return inst;
  }
};
