import { dentroZona, texto, rrect } from '../util.js';
import { vecino } from '../util.js';

/* Tablero de puntos y cajas: D x D puntos. Aristas: horizontales (D*(D-1)) y verticales (D*(D-1)). */
export function crearTablero(D = 4) {
  const E = [], idH = (r, c) => r * (D - 1) + c, idV = (r, c) => D * (D - 1) + r * D + c;
  for (let r = 0; r < D; r++) for (let c = 0; c < D - 1; c++) E.push({ t: 'h', r, c });
  for (let r = 0; r < D - 1; r++) for (let c = 0; c < D; c++) E.push({ t: 'v', r, c });
  const cajas = []; for (let r = 0; r < D - 1; r++) for (let c = 0; c < D - 1; c++) cajas.push({ r, c, e: [idH(r, c), idH(r + 1, c), idV(r, c), idV(r, c + 1)], dueno: -1 });
  return { D, E, cajas, usada: Array(E.length).fill(-1) };
}
export const ladosCaja = (tb, k) => tb.cajas[k].e.filter((e) => tb.usada[e] >= 0).length;
export function jugarArista(tb, e, j) {
  if (tb.usada[e] >= 0) return -1; tb.usada[e] = j; let n = 0;
  tb.cajas.forEach((cj, k) => { if (cj.dueno < 0 && cj.e.every((x) => tb.usada[x] >= 0) && cj.e.includes(e)) { cj.dueno = j; n++; } });
  return n;
}
export function jugadaCajas(tb, nivel, rnd) {
  const libres = tb.usada.map((u, i) => (u < 0 ? i : -1)).filter((i) => i >= 0);
  const completa = libres.filter((e) => tb.cajas.some((cj, k) => cj.e.includes(e) && ladosCaja(tb, k) === 3));
  if (completa.length && (nivel > 0 || rnd() < 0.5)) return rnd.elige(completa);
  if (nivel === 0) return rnd.elige(libres);
  const seguras = libres.filter((e) => !tb.cajas.some((cj, k) => cj.e.includes(e) && ladosCaja(tb, k) === 2));
  if (seguras.length) return rnd.elige(seguras);
  if (nivel === 1) return rnd.elige(libres);
  let mejor = null, mp = 99; for (const e of libres) { const regalo = tb.cajas.reduce((a, cj, k) => a + (cj.e.includes(e) && ladosCaja(tb, k) === 2 ? 1 : 0), 0); if (regalo < mp) { mp = regalo; mejor = [e]; } else if (regalo === mp) mejor.push(e); }
  return rnd.elige(mejor);
}
export default {
  id: 'cajas', nombre: 'Puntos y cajas', icono: '🔲', cat: 'Mesa y estrategia', min: 2, max: 4, dur: 50, ctrl: 'puntero', compartido: true,
  instr: ['Une dos puntos por turno tocando una línea.', 'Quien cierra una caja se la queda y repite turno.', 'Gana quien consiga más cajas.'],
  crear(c) {
    const n = c.n, tb = crearTablero(4), pts = Array(n).fill(0), S = { turno: 0, fase: 'juega', t: 0, lim: 12, cur: 0 };
    const geo = () => { const sp = Math.min(c.W * 0.8, c.H * 0.5) / (tb.D - 1), s = sp * (tb.D - 1); return { sp, x: (c.W - s) / 2, y: (c.H - s) / 2 }; };
    const extremos = (e, G) => { const q = tb.E[e]; return q.t === 'h' ? [[G.x + q.c * G.sp, G.y + q.r * G.sp], [G.x + (q.c + 1) * G.sp, G.y + q.r * G.sp]] : [[G.x + q.c * G.sp, G.y + q.r * G.sp], [G.x + q.c * G.sp, G.y + (q.r + 1) * G.sp]]; };
    const medio = (e, G) => { const [a, b] = extremos(e, G); return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 }; };
    const jugar = (e) => {
      if (S.fase !== 'juega' || tb.usada[e] >= 0) return; const k = jugarArista(tb, e, S.turno); S.lim = 12; S.t = 0;
      if (k > 0) { pts[S.turno] += k; c.fx.snd('ok'); } else { c.fx.snd('toque'); S.turno = (S.turno + 1) % n; }
      if (tb.cajas.every((cj) => cj.dueno >= 0)) { S.fase = 'fin'; S.t = 0; }
      else { const f = tb.usada.findIndex((u) => u < 0); S.cur = tb.usada[S.cur] < 0 ? S.cur : f; }
    };
    const inst = {
      pts, fin: false, tb,
      puntero(i, lx, ly, wx, wy) { if (c.jug[S.turno].bot) return; const G = geo(); let m = -1, md = G.sp * 0.4; tb.E.forEach((_, e) => { if (tb.usada[e] >= 0) return; const p = medio(e, G), d = Math.hypot(p.x - wx, p.y - wy); if (d < md) { md = d; m = e; } }); if (m >= 0) { S.cur = m; jugar(m); } },
      update(dt, ent) {
        if (this.fin) return; S.t += dt;
        if (S.fase === 'fin') { if (S.t > 1.6) this.fin = true; return; }
        S.lim -= dt; const j = c.jug[S.turno];
        if (j.bot) { if (S.t > 0.75) jugar(jugadaCajas(tb, j.nivel, c.rnd)); return; }
        const e = ent[S.turno], G = geo(), pts2 = tb.E.map((_, k) => medio(k, G));
        const mv = (dx, dy) => { const v = vecino(pts2, S.cur, dx, dy, (k) => tb.usada[k] < 0); if (v >= 0) S.cur = v; };
        if (e.izqP) mv(-1, 0); if (e.derP) mv(1, 0); if (e.arrP) mv(0, -1); if (e.abaP) mv(0, 1);
        if (tb.usada[S.cur] >= 0) S.cur = tb.usada.findIndex((u) => u < 0);
        if (e.aP) jugar(S.cur);
        if (S.lim <= 0) jugar(jugadaCajas(tb, 0, c.rnd));
      },
      draw(g) {
        const G = geo(); g.lineCap = 'round';
        tb.cajas.forEach((cj) => { if (cj.dueno >= 0) { g.fillStyle = c.jug[cj.dueno].color + '66'; g.fillRect(G.x + cj.c * G.sp + 4, G.y + cj.r * G.sp + 4, G.sp - 8, G.sp - 8); texto(g, c.jug[cj.dueno].avatar, G.x + (cj.c + 0.5) * G.sp, G.y + (cj.r + 0.5) * G.sp, G.sp * 0.4); } });
        tb.E.forEach((_, e) => {
          const [a, b] = extremos(e, G), u = tb.usada[e], foco = e === S.cur && S.fase === 'juega' && !c.jug[S.turno].bot;
          g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineWidth = u >= 0 ? 8 : foco ? 8 : 4; g.strokeStyle = u >= 0 ? c.jug[u].color : foco ? c.jug[S.turno].color : '#ffffff30'; g.stroke();
        });
        for (let r = 0; r < tb.D; r++) for (let q = 0; q < tb.D; q++) { g.beginPath(); g.arc(G.x + q * G.sp, G.y + r * G.sp, 7, 0, 6.3); g.fillStyle = '#fff'; g.fill(); }
        for (let i = 0; i < n; i++) dentroZona(g, c.zonas[i], (w, h) => { const mi = S.turno === i && S.fase === 'juega'; texto(g, mi ? `¡Tu turno! (${Math.max(0, S.lim | 0)})` : S.fase === 'fin' ? '' : 'Espera…', w / 2, h - 70, 15, mi ? '#fff' : '#ffffff77'); });
      }
    };
    return inst;
  }
};
