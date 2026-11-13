import { dentroZona, texto, rrect, clamp } from '../util.js';

export default {
  id: 'parar', nombre: 'Para en el cinco', icono: '⏱️', cat: 'Puntería y ritmo', min: 2, max: 4, dur: 30, ctrl: 'tap',
  instr: ['Un cronómetro corre: toca para pararlo en 5,00 s.', 'Tras los 2 primeros segundos se oculta.', 'Tres intentos: gana quien se acerque más.'],
  crear(c) {
    const n = c.n, OBJ = 5, RONDAS = 3, sig = [0.38, 0.19, 0.07], pts = Array(n).fill(0), parada = Array(n).fill(null), ronda = Array(n).fill(0);
    const bot = Array(n).fill(0);
    const S = { r: 0, t: 0, fase: 'corre', espera: 0 };
    const sorteo = () => { for (let i = 0; i < n; i++) bot[i] = c.jug[i].bot ? clamp(OBJ + c.rnd.gauss() * sig[c.jug[i].nivel], 1.5, 7.4) : 0; };
    sorteo();
    const parar = (i) => { if (parada[i] !== null) return; parada[i] = S.t; const err = Math.abs(S.t - OBJ); const p = Math.max(0, Math.round(100 - err * 100)); pts[i] += p; c.fx.snd(err < 0.15 ? 'ok' : 'toque'); if (!c.jug[i].bot) c.fx.vib(i, 0.2, 0.3, 40); };
    const inst = {
      pts, fin: false,
      update(dt, ent) {
        if (this.fin) return;
        if (S.fase === 'corre') {
          S.t += dt;
          for (let i = 0; i < n; i++) { if (parada[i] === null && ((ent[i].aP && !c.jug[i].bot) || (c.jug[i].bot && S.t >= bot[i]) || S.t >= 7.5)) parar(i); }
          if (parada.every((p) => p !== null)) { S.fase = 'muestra'; S.espera = 1.8; }
        } else { S.espera -= dt; if (S.espera <= 0) { S.r++; if (S.r >= RONDAS) this.fin = true; else { S.t = 0; S.fase = 'corre'; parada.fill(null); sorteo(); } } }
      },
      draw(g) {
        for (let i = 0; i < n; i++) dentroZona(g, c.zonas[i], (w, h) => {
          const s = Math.min(w, h), ya = parada[i] !== null, vis = ya || S.t < 2 || S.fase !== 'corre';
          g.fillStyle = ya ? '#1f4d3a' : '#22225a'; rrect(g, 10, 44, w - 20, h - 54, 22); g.fill();
          texto(g, 'Objetivo 5,00', w / 2, 66 + s * 0.03, 15, '#ffffffbb', 'center', 600);
          const v = ya ? parada[i] : S.t;
          texto(g, vis ? v.toFixed(2).replace('.', ',') : '? ? ?', w / 2, h / 2, s * 0.2, ya ? '#7dffa8' : '#fff');
          if (ya && S.fase === 'muestra') texto(g, 'Error ' + Math.abs(parada[i] - OBJ).toFixed(2).replace('.', ',') + ' s', w / 2, h / 2 + s * 0.17, s * 0.07, '#fff');
          texto(g, ya ? '¡Parado!' : 'TOCA PARA PARAR', w / 2, h - 36, 14, '#ffffffcc', 'center', 600);
          texto(g, `Intento ${Math.min(S.r + 1, RONDAS)}/${RONDAS}`, w / 2, h - 18, 12, '#ffffff88', 'center', 600);
        });
      }
    };
    return inst;
  }
};
