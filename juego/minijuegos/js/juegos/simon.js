import { dentroZona, texto, rrect } from '../util.js';

const COL = ['#ff4d5a', '#3d8bff', '#3ddc84', '#ffd23d'], SIM = ['▲', '●', '■', '★'];
export default {
  id: 'simon', nombre: 'Simón dice', icono: '🎵', cat: 'Puntería y ritmo', min: 2, max: 4, dur: 45, ctrl: 'puntero',
  instr: ['Mira la secuencia de colores y sonidos.', 'Repítela tocando tus botones: cada nivel añade uno.', 'Quien se equivoca queda fuera; gana el último.'],
  crear(c) {
    const n = c.n, MAXN = 8, seq = Array.from({ length: MAXN + 1 }, () => c.rnd.int(4)), pts = Array(n).fill(0), vivo = Array(n).fill(true), hecho = Array(n).fill(false), prog = Array(n).fill(0), luz = Array(n).fill(-1), luzT = Array(n).fill(0), cur = Array(n).fill(0), plan = Array(n).fill(null);
    const S = { nivel: 1, fase: 'muestra', t: 0, k: 0, lim: 0 };
    const empezarNivel = () => {
      S.fase = 'muestra'; S.t = -0.4; S.k = -1; prog.fill(0); hecho.fill(false);
      for (let i = 0; i < n; i++) if (c.jug[i].bot && vivo[i]) { const p = [0.88, 0.94, 0.98][c.jug[i].nivel]; plan[i] = { ok: c.rnd() < Math.pow(p, S.nivel), t: 0.9 + S.nivel * [0.7, 0.5, 0.35][c.jug[i].nivel] + c.rnd(), fallo: c.rnd.int(S.nivel) }; }
    };
    empezarNivel();
    let inst;
    const cierra = () => {
      for (let i = 0; i < n; i++) { if (vivo[i] && !hecho[i]) { vivo[i] = false; pts[i] = S.nivel - 1; } else if (vivo[i]) pts[i] = S.nivel; }
      const vivos = vivo.filter((x) => x).length;
      if ((n > 1 && vivos <= 1) || vivos === 0 || S.nivel >= MAXN) { inst.fin = true; return; }
      S.nivel++; empezarNivel();
    };
    const pulsar = (i, b) => {
      if (S.fase !== 'entrada' || !vivo[i] || hecho[i]) return;
      luz[i] = b; luzT[i] = 0.18; c.fx.snd('nota' + b); if (!c.jug[i].bot) c.fx.vib(i, 0.1, 0.2, 25);
      if (seq[prog[i]] !== b) { vivo[i] = false; c.fx.snd('mal'); pts[i] = S.nivel - 1; return; }
      if (++prog[i] >= S.nivel) { hecho[i] = true; c.fx.snd('ok'); }
    };
    const botn = (w, h, b) => { const s = Math.min(w - 30, h - 130) / 2, x0 = (w - s * 2) / 2, y0 = 76 + (h - 76 - s * 2) / 2 - 8; return { x: x0 + (b % 2) * s, y: y0 + ((b / 2) | 0) * s, s }; };
    inst = {
      pts, fin: false, etq: (i) => (vivo[i] ? 'N' + S.nivel : '✗ ' + pts[i]),
      puntero(i, lx, ly) { if (i < 0 || c.jug[i].bot) return; const z = c.zonas[i]; for (let b = 0; b < 4; b++) { const q = botn(z.w, z.h, b); if (lx >= q.x && lx <= q.x + q.s && ly >= q.y && ly <= q.y + q.s) { cur[i] = b; pulsar(i, b); } } },
      update(dt, ent) {
        if (this.fin) return;
        for (let i = 0; i < n; i++) luzT[i] -= dt;
        S.t += dt;
        if (S.fase === 'muestra') {
          const k = Math.floor(S.t / 0.62);
          if (S.t >= 0 && k !== S.k && k < S.nivel) { S.k = k; for (let i = 0; i < n; i++) { luz[i] = seq[k]; luzT[i] = 0.4; } c.fx.snd('nota' + seq[k]); }
          if (k >= S.nivel) { S.fase = 'entrada'; S.t = 0; S.lim = 4 + S.nivel * 1.2; }
        } else {
          for (let i = 0; i < n; i++) {
            if (!vivo[i] || hecho[i]) continue;
            if (c.jug[i].bot) { const p = plan[i]; if (S.t >= p.t) { if (p.ok) { prog[i] = S.nivel; hecho[i] = true; } else { vivo[i] = false; pts[i] = S.nivel - 1; c.fx.snd('mal'); } } continue; }
            const e = ent[i];
            if (e.izqP) cur[i] = cur[i] % 2 ? cur[i] - 1 : cur[i] + 1; if (e.derP) cur[i] = cur[i] % 2 ? cur[i] - 1 : cur[i] + 1; if (e.arrP || e.abaP) cur[i] = (cur[i] + 2) % 4;
            if (e.aP) pulsar(i, cur[i]);
          }
          if (S.t > S.lim || vivo.every((v, i) => !v || hecho[i])) cierra();
        }
      },
      draw(g) {
        for (let i = 0; i < n; i++) dentroZona(g, c.zonas[i], (w, h) => {
          const s = Math.min(w, h);
          texto(g, !vivo[i] ? 'Eliminado en nivel ' + (S.nivel) : S.fase === 'muestra' ? 'Mira…' : hecho[i] ? '¡Bien! Espera…' : `Repite (${prog[i]}/${S.nivel})`, w / 2, 60, Math.min(16, s * 0.06), '#fff', 'center', 700);
          for (let b = 0; b < 4; b++) {
            const q = botn(w, h, b), on = luz[i] === b && luzT[i] > 0, foco = !c.jug[i].bot && cur[i] === b && S.fase === 'entrada' && vivo[i];
            g.globalAlpha = vivo[i] ? 1 : 0.35; g.fillStyle = on ? '#fff' : COL[b] + '88'; rrect(g, q.x + 4, q.y + 4, q.s - 8, q.s - 8, 18); g.fill();
            if (on) { g.fillStyle = COL[b]; g.fill(); } if (foco) { g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); }
            texto(g, SIM[b], q.x + q.s / 2, q.y + q.s / 2, q.s * 0.3, on ? '#fff' : '#ffffffaa'); g.globalAlpha = 1;
          }
        });
      }
    };
    return inst;
  }
};
