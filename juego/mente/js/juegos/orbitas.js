// Seguimiento de multiples objetos (MOT): sigue las esferas marcadas mientras se mueven. Las marcadas llevan anillo y estrella (no solo color).
export default {
  id: 'orbitas', area: 'atencion', nombre: 'Órbitas', icono: '◉', desc: 'Sigue con la vista las esferas marcadas mientras se mueven entre las demás.', esc: { subir: 1 },
  tutorial: ['Se marcan algunas esferas con anillo y estrella. Síguelas mientras se mueven, luego tócalas.', 'Más esferas en movimiento.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e, W = 320, H = 320, cv = cx.canvas(W, H), g = cv.g;
    e.fase = 'nada'; e.bolas = []; e.sel = new Set(); e.foco = 0;
    const lento = cx.reducirMov() ? 0.6 : 1;
    function ensayo() {
      const n = Math.min(12, 6 + Math.floor(cx.nivel / 3)), k = Math.min(5, 2 + Math.floor(cx.nivel / 4));
      e.k = k; e.bolas = Array.from({ length: n }, (_, i) => { const a = cx.rng.f() * 6.28; const v = (40 + cx.nivel * 6) * lento; return { x: 20 + cx.rng.f() * (W - 40), y: 20 + cx.rng.f() * (H - 40), vx: Math.cos(a) * v, vy: Math.sin(a) * v, meta: i < k }; });
      e.sel = new Set(); e.fase = 'marca'; e.foco = 0; cx.consigna('Memoriza las ' + k + ' marcadas'); e.fin = cx.t + cx.tx(1800);
    }
    cv.c.addEventListener('pointerdown', (ev) => { if (e.fase !== 'elige') return; const p = cv.punto(ev); let b = null, d = 30 * 30; e.bolas.forEach((x) => { const dd = (x.x - p.x) ** 2 + (x.y - p.y) ** 2; if (dd < d) { d = dd; b = x; } }); if (b) alternar(b); });
    function alternar(b) {
      if (e.fase !== 'elige') return;
      if (e.sel.has(b)) e.sel.delete(b); else if (e.sel.size < e.k) e.sel.add(b);
      cx.sonido.clic();
      if (e.sel.size === e.k) {
        e.fase = 'res'; const aciertos = [...e.sel].filter((x) => x.meta).length;
        cx.reportar(aciertos === e.k); cx.consigna(aciertos + ' de ' + e.k + ' correctas'); e.fin = cx.t + 1400;
      }
    }
    e.alternar = alternar;
    cx.e.dibujar = () => {
      g.clearRect(0, 0, W, H); g.fillStyle = '#0d1424'; g.fillRect(0, 0, W, H);
      e.bolas.forEach((b, i) => {
        g.beginPath(); g.arc(b.x, b.y, 13, 0, 6.283); g.fillStyle = '#8aa4d6'; g.fill();
        const marca = (e.fase === 'marca' && b.meta) || (e.fase === 'res' && b.meta);
        if (marca) { g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = '#0d1424'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', b.x, b.y + 1); }
        if (e.fase === 'elige' && e.sel.has(b)) { g.lineWidth = 3; g.strokeStyle = '#ffd34d'; g.stroke(); g.fillStyle = '#0d1424'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('✓', b.x, b.y + 1); }
        if (e.fase === 'elige' && i === e.foco && e.usoTeclas) { g.lineWidth = 2; g.setLineDash([4, 3]); g.strokeStyle = '#fff'; g.beginPath(); g.arc(b.x, b.y, 19, 0, 6.283); g.stroke(); g.setLineDash([]); }
        if (e.fase === 'res' && !b.meta && e.sel.has(b)) { g.strokeStyle = '#ff6b6b'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#0d1424'; g.fillText('✗', b.x, b.y + 1); }
      });
    };
    e.nuevo = ensayo; ensayo();
  },
  loop(cx, dt) {
    const e = cx.e, W = 320, H = 320;
    if (e.fase === 'marca' && cx.t >= e.fin) { e.fase = 'mueve'; cx.consigna('Sigue las marcadas…'); e.fin = cx.t + cx.tx(2600 + cx.nivel * 90); }
    else if (e.fase === 'mueve' && cx.t >= e.fin) { e.fase = 'elige'; e.foco = 0; cx.consigna('Toca las ' + e.k + ' esferas marcadas'); }
    else if (e.fase === 'res' && cx.t >= e.fin) e.nuevo();
    if (e.fase === 'mueve') {
      const s = dt / 1000;
      e.bolas.forEach((b) => { b.x += b.vx * s; b.y += b.vy * s; if (b.x < 14 || b.x > W - 14) { b.vx *= -1; b.x = Math.max(14, Math.min(W - 14, b.x)); } if (b.y < 14 || b.y > H - 14) { b.vy *= -1; b.y = Math.max(14, Math.min(H - 14, b.y)); } });
      if (Math.random() < dt / 1800) { const b = e.bolas[Math.floor(Math.random() * e.bolas.length)]; const a = Math.atan2(b.vy, b.vx) + (Math.random() - 0.5) * 1.6, v = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; }
    }
    e.dibujar();
  },
  entrada(cx, a) {
    const e = cx.e; if (e.fase !== 'elige') return false;
    e.usoTeclas = true; const n = e.bolas.length;
    const orden = e.bolas.map((b, i) => i).sort((p, q) => e.bolas[p].x - e.bolas[q].x);
    const pos = orden.indexOf(e.foco);
    if (a === 'izq' || a === 'arriba') { e.foco = orden[(pos + n - 1) % n]; return true; }
    if (a === 'der' || a === 'abajo') { e.foco = orden[(pos + 1) % n]; return true; }
    if (a === 'ok' || a === 'a') { e.alternar(e.bolas[e.foco]); return true; }
    return false;
  }
};
