import { dentroZona, texto, rrect } from '../util.js';

export default {
  id: 'reflejos', nombre: 'Saque rápido', icono: '⚡', cat: 'Reflejos', min: 2, max: 4, dur: 30, ctrl: 'tap',
  instr: ['Espera la señal verde y toca antes que nadie (+1).', 'Si tocas antes de tiempo pierdes 1 punto.', 'Se juegan 5 saques seguidos.'],
  crear(c) {
    const n = c.n, SAQUES = 5, pts = Array(n).fill(0), rts = Array(n).fill(null), bloq = Array(n).fill(false), plan = Array(n).fill(null);
    const S = { fase: 'espera', t: 0, saque: 0, espera: 0, ganador: -1, mejor: [] };
    const nuevo = () => {
      S.fase = 'espera'; S.t = 0; S.ganador = -1; S.espera = c.rnd.entre(1.4, 3.6); rts.fill(null); bloq.fill(false);
      for (let i = 0; i < n; i++) { const b = c.jug[i]; plan[i] = b.bot ? { falso: c.rnd() < [0.14, 0.06, 0.01][b.nivel], tf: c.rnd.entre(0.3, S.espera - 0.1), rt: Math.max(0.17, [0.62, 0.42, 0.29][b.nivel] + c.rnd.gauss() * 0.07) } : null; }
    };
    const tocar = (i) => {
      if (bloq[i] || S.fase === 'res') return;
      if (S.fase === 'espera') { bloq[i] = true; pts[i] -= 1; c.fx.snd('mal'); if (!c.jug[i].bot) c.fx.vib(i, 0.6, 0.2, 200); return; }
      S.fase = 'res'; S.t = 0; S.ganador = i; rts[i] = S.t; pts[i] += 1; S.rt = S.tYa; c.fx.snd('ok');
      if (!c.jug[i].bot) S.mejor.push(Math.round(S.tYa * 1000));
    };
    nuevo();
    const inst = {
      pts, fin: false,
      logroExtra: () => (S.mejor.length ? { reaccionMs: Math.min(...S.mejor) } : {}),
      update(dt, ent) {
        if (this.fin) return;
        S.t += dt;
        if (S.fase === 'espera') {
          for (let i = 0; i < n; i++) { if (ent[i].aP) tocar(i); else if (plan[i] && plan[i].falso && !bloq[i] && S.t >= plan[i].tf) tocar(i); }
          if (S.t >= S.espera) { S.fase = 'ya'; S.t = 0; S.tYa = 0; c.fx.snd('ya'); }
        } else if (S.fase === 'ya') {
          S.tYa = S.t;
          for (let i = 0; i < n && S.fase === 'ya'; i++) { if (ent[i].aP) tocar(i); else if (plan[i] && !plan[i].falso && S.t >= plan[i].rt) tocar(i); }
          if (S.fase === 'ya' && S.t > 1.8) { S.fase = 'res'; S.t = 0; }
        } else if (S.t > 1.4) { S.saque++; if (S.saque >= SAQUES) this.fin = true; else nuevo(); }
      },
      draw(g) {
        for (let i = 0; i < n; i++) dentroZona(g, c.zonas[i], (w, h) => {
          const ya = S.fase === 'ya', gano = S.ganador === i;
          g.fillStyle = S.fase === 'espera' ? (bloq[i] ? '#6b2a2a' : '#7a2330') : ya ? '#1f9d55' : gano ? '#1f7a55' : '#2a2a55';
          rrect(g, 10, 44, w - 20, h - 54, 22); g.fill();
          const s = Math.min(w, h);
          texto(g, S.fase === 'espera' ? (bloq[i] ? '¡Muy pronto! −1' : 'Espera…') : ya ? '¡YA!' : S.ganador < 0 ? 'Nadie' : gano ? '+1 ¡Tú!' : c.jug[S.ganador].nombre, w / 2, h / 2, s * (ya ? 0.2 : 0.11), '#fff');
          if (S.fase === 'res' && S.ganador >= 0 && gano) texto(g, Math.round(S.rt * 1000) + ' ms', w / 2, h / 2 + s * 0.13, s * 0.07, '#fff');
          texto(g, `Saque ${Math.min(S.saque + 1, SAQUES)}/${SAQUES}`, w / 2, h - 22, 13, '#ffffffaa', 'center', 600);
        });
      }
    };
    return inst;
  }
};
