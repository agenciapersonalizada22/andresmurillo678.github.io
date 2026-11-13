import { dentroZona, texto, rrect } from '../util.js';

const MANOS = ['✊', '✋', '✌️'], NOM = ['Piedra', 'Papel', 'Tijera'];
export const gana = (a, b) => (a - b + 3) % 3 === 1; // 0 piedra, 1 papel, 2 tijera: papel(1) gana a piedra(0)
export function liquidar(manos, apuestas) {
  const d = manos.map(() => 0);
  for (let i = 0; i < manos.length; i++) for (let j = 0; j < manos.length; j++) if (i !== j && gana(manos[i], manos[j])) { d[i] += apuestas[i]; d[j] -= apuestas[i]; }
  return d;
}
export default {
  id: 'ppt', nombre: 'Piedra, papel o tijera', icono: '✌️', cat: 'Mesa y estrategia', min: 2, max: 4, dur: 40, ctrl: 'puntero',
  instr: ['Elige tu apuesta (1, 2 o 3 fichas) y después tu mano.', 'Quien gana cobra su apuesta a quien pierde.', 'Cinco rondas: gana quien termine con más fichas.'],
  crear(c) {
    const n = c.n, RONDAS = 5, pts = Array(n).fill(10), mano = Array(n).fill(-1), apu = Array(n).fill(1), cur = Array(n).fill(null).map(() => ({ f: 0, c: 0 }));
    const hist = [], delta = Array(n).fill(0), plan = Array(n).fill(0);
    const S = { fase: 'elige', t: 0, ronda: 0 };
    const botElige = (i) => {
      const lv = c.jug[i].nivel; let m = c.rnd.int(3), b = 1 + c.rnd.int(3);
      if (lv === 1 && hist.length && c.rnd() < 0.5) m = (hist[hist.length - 1][i] + 1) % 3;
      if (lv === 2 && hist.length) { const cont = [0, 0, 0]; hist.forEach((r) => r.forEach((x, j) => { if (j !== i) cont[x]++; })); const top = cont.indexOf(Math.max(...cont)); if (cont[top] > hist.length * (n - 1) * 0.4) { m = (top + 1) % 3; b = 3; } else b = 1; }
      if (lv === 0) b = 1 + c.rnd.int(2);
      return [m, b];
    };
    const preparar = () => { S.fase = 'elige'; S.t = 0; mano.fill(-1); apu.fill(1); for (let i = 0; i < n; i++) if (c.jug[i].bot) { const [m, b] = botElige(i); plan[i] = { m, b, t: c.rnd.entre(0.8, 3.2) }; } };
    preparar();
    const fijar = (i, m) => { if (mano[i] >= 0 || S.fase !== 'elige') return; mano[i] = m; c.fx.snd('click'); };
    const botones = (w, h) => {
      const bw = Math.min(100, (w - 40) / 3), l = [];
      for (let k = 0; k < 3; k++) l.push({ f: 0, c: k, x: w / 2 + (k - 1) * (bw + 8) - bw / 2, y: h * 0.34, w: bw, h: bw * 1.05 });
      for (let k = 0; k < 3; k++) l.push({ f: 1, c: k, x: w / 2 + (k - 1) * (bw + 8) - bw / 2, y: h * 0.34 + bw * 1.05 + 46, w: bw, h: 46 });
      return l;
    };
    const tocar = (i, f, k) => { if (f === 1) { if (mano[i] < 0) { apu[i] = k + 1; c.fx.snd('toque'); } } else fijar(i, k); };
    const inst = {
      pts, fin: false, etq: (i) => pts[i] + ' 🪙',
      puntero(i, lx, ly) { if (i < 0 || c.jug[i].bot) return; const z = c.zonas[i]; for (const b of botones(z.w, z.h)) if (lx >= b.x && lx <= b.x + b.w && ly >= b.y && ly <= b.y + b.h) { cur[i] = { f: b.f, c: b.c }; tocar(i, b.f, b.c); } },
      update(dt, ent) {
        if (this.fin) return; S.t += dt;
        if (S.fase === 'elige') {
          for (let i = 0; i < n; i++) {
            const e = ent[i], q = cur[i];
            if (c.jug[i].bot) { if (S.t >= plan[i].t && mano[i] < 0) { apu[i] = plan[i].b; fijar(i, plan[i].m); } continue; }
            if (e.izqP) q.c = (q.c + 2) % 3; if (e.derP) q.c = (q.c + 1) % 3; if (e.arrP || e.abaP) q.f = 1 - q.f;
            if (e.aP) tocar(i, q.f, q.c);
          }
          if (mano.every((m) => m >= 0) || S.t > 9) { for (let i = 0; i < n; i++) if (mano[i] < 0) mano[i] = c.rnd.int(3); const d = liquidar(mano, apu); for (let i = 0; i < n; i++) { delta[i] = d[i]; pts[i] += d[i]; } hist.push(mano.slice()); S.fase = 'revela'; S.t = 0; c.fx.snd(d.some((x) => x) ? 'golpe' : 'tick'); }
        } else if (S.t > 2.2) { S.ronda++; if (S.ronda >= RONDAS) this.fin = true; else preparar(); }
      },
      draw(g) {
        for (let i = 0; i < n; i++) dentroZona(g, c.zonas[i], (w, h) => {
          const s = Math.min(w, h);
          g.fillStyle = '#ffffff0d'; rrect(g, 8, 44, w - 16, h - 52, 20); g.fill();
          texto(g, `Ronda ${Math.min(S.ronda + 1, RONDAS)}/${RONDAS}`, w / 2, 62, 13, '#ffffffaa', 'center', 600);
          if (S.fase === 'elige') {
            texto(g, mano[i] >= 0 ? '¡Elegido! Esperando…' : 'Apuesta y elige tu mano', w / 2, h * 0.25, Math.min(16, s * 0.06), '#fff', 'center', 700);
            botones(w, h).forEach((b) => {
              const sel = b.f ? apu[i] === b.c + 1 : mano[i] === b.c, foco = !c.jug[i].bot && cur[i].f === b.f && cur[i].c === b.c;
              g.fillStyle = sel ? c.jug[i].color : '#ffffff1c'; rrect(g, b.x, b.y, b.w, b.h, 14); g.fill(); if (foco) { g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); }
              if (b.f) texto(g, 'x' + (b.c + 1), b.x + b.w / 2, b.y + b.h / 2, 18, '#fff'); else texto(g, mano[i] >= 0 && !sel ? '' : MANOS[b.c], b.x + b.w / 2, b.y + b.h / 2, b.w * 0.5, '#fff');
            });
            texto(g, 'Apuesta: ' + apu[i] + ' ficha' + (apu[i] > 1 ? 's' : ''), w / 2, h - 24, 14, '#ffd23d');
          } else {
            const y = h * 0.4;
            c.jug.forEach((p, j) => { const x = w * (j + 0.5) / n; texto(g, MANOS[mano[j]], x, y, Math.min(w / n * 0.7, s * 0.24)); texto(g, p.avatar, x, y + s * 0.15, 16); texto(g, (delta[j] > 0 ? '+' : '') + delta[j], x, y + s * 0.26, 18, delta[j] > 0 ? '#7dffa8' : delta[j] < 0 ? '#ff8a6b' : '#fff'); });
          }
        });
      }
    };
    return inst;
  }
};
