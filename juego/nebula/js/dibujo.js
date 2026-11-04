// =============================================================
//  DIBUJO: fondos con parallax por mundo, sprites precalculados,
//  partículas y la escena de juego. No modifica la simulación.
// =============================================================
const PALETAS = {
  ninguno: { jug: '#3df5ff', balaJ: '#c8fcff', bE: '#ff6b9a', en: { zangano: '#ff3d81', tirador: '#ff9f1c', kamikaze: '#c86bff', franco: '#ff4d4d', mina: '#7dff6b', blindado: '#ff7a3d', tejedor: '#ff6bd5', asteroide: '#a89a8a' } },
  protanopia: { jug: '#4fc3ff', balaJ: '#d4efff', bE: '#ffd000', en: { zangano: '#ff9a1a', tirador: '#ffe14d', kamikaze: '#ffffff', franco: '#ff7a00', mina: '#ffd000', blindado: '#d98a1a', tejedor: '#ffc266', asteroide: '#b0a08a' } },
  tritanopia: { jug: '#7dffea', balaJ: '#e0fff9', bE: '#ff3a3a', en: { zangano: '#ff4d6d', tirador: '#ff8a8a', kamikaze: '#ffffff', franco: '#ff2a2a', mina: '#ff9a4d', blindado: '#d94a4a', tejedor: '#ff7ab0', asteroide: '#a89a8a' } },
};
PALETAS.deuteranopia = PALETAS.protanopia;

// ---------------------------------------------------------------- Efectos
const Fx = (() => {
  const MAXP = 900;
  const ps = []; for (let i = 0; i < MAXP; i++) ps.push({ x: 0, y: 0, vx: 0, vy: 0, vida: 0, max: 1, c: '#fff', s: 2, g: 0 });
  let np = 0;
  const ts = []; for (let i = 0; i < 26; i++) ts.push({ x: 0, y: 0, s: '', c: '#fff', v: 0, tam: 14 });
  let nt = 0;
  const F = { sacudida: 0, flash: 0, flashC: '#fff', texto: true };
  const aj = () => Datos.aj;
  const cupo = () => Math.min(MAXP, Math.round(MAXP * aj().particulas / 1.6 * (aj().reducirMov ? 0.5 : 1)));

  F.p = function (x, y, vx, vy, vida, c, s) {
    if (np >= cupo()) return;
    const p = ps[np++]; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.vida = p.max = vida; p.c = c; p.s = s;
  };
  F.explosion = function (x, y, color, r, grande) {
    const n = Math.round((grande ? 46 : 12 + r * 0.5) * aj().particulas * (aj().reducirMov ? 0.5 : 1));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = (0.2 + Math.random()) * (grande ? 340 : 190);
      F.p(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.3 + Math.random() * (grande ? 0.9 : 0.5), Math.random() < 0.25 ? '#ffffff' : color, 2 + Math.random() * (grande ? 4 : 2.5));
    }
  };
  F.chispa = function (x, y, color) {
    for (let i = 0; i < 3; i++) { const a = Math.random() * 6.283; F.p(x, y, Math.cos(a) * 90, Math.sin(a) * 90, 0.3, color || '#ffffff', 2.4); }
  };
  F.texto = function (x, y, s, c, tam) {
    if (nt >= ts.length) return;
    const t = ts[nt++]; t.x = x; t.y = y; t.s = s; t.c = c; t.v = 0.9; t.tam = tam || 15;
  };
  F.sacudir = function (f) { const k = aj().sacudida * (aj().reducirMov ? 0 : 1); F.sacudida = Math.max(F.sacudida, f * k); };
  F.destello = function (c, a) { if (aj().reducirMov) a *= 0.3; F.flashC = c; F.flash = Math.max(F.flash, a); };
  F.limpiar = function () { np = 0; nt = 0; F.sacudida = 0; F.flash = 0; };
  F.actualizar = function (dt) {
    for (let i = np - 1; i >= 0; i--) {
      const p = ps[i]; p.vida -= dt;
      if (p.vida <= 0) { const o = ps[--np]; ps[np] = p; ps[i] = o; continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; p.vy *= 0.985;
    }
    for (let i = nt - 1; i >= 0; i--) {
      const t = ts[i]; t.v -= dt; t.y -= 38 * dt;
      if (t.v <= 0) { const o = ts[--nt]; ts[nt] = t; ts[i] = o; }
    }
    F.sacudida = Math.max(0, F.sacudida - dt * 40);
    F.flash = Math.max(0, F.flash - dt * 2.2);
  };
  F.dibujar = function (g) {
    if (aj().brillo) g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < np; i++) {
      const p = ps[i], a = p.vida / p.max;
      g.globalAlpha = a > 1 ? 1 : a; g.fillStyle = p.c;
      const s = p.s * (0.4 + 0.6 * a);
      g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    if (nt) {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let i = 0; i < nt; i++) {
        const t = ts[i]; g.globalAlpha = Math.min(1, t.v * 2.2); g.fillStyle = t.c;
        g.font = '800 ' + (t.tam * (aj().textoGrande ? 1.2 : 1)) + 'px ' + Dibujo.FUENTE; g.fillText(t.s, t.x, t.y);
      }
      g.globalAlpha = 1;
    }
  };
  return F;
})();

// ---------------------------------------------------------------- Dibujo
const Dibujo = (() => {
  const W = CONFIG.ancho, H = CONFIG.alto, TAU = Math.PI * 2;
  const FUENTE = 'Orbitron, ui-monospace, Menlo, Consolas, monospace';
  const aj = () => Datos.aj;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; };
  let pal = PALETAS.ninguno, SPR = null, firmaSpr = '';
  const D = { FUENTE, pal: () => pal };

  // ------------------------------------------------------ Formas (centradas en 0,0)
  function neon(g, c, fillA) {
    g.fillStyle = '#0a0614'; g.fill(); g.globalAlpha = fillA == null ? 0.42 : fillA; g.fillStyle = c; g.fill(); g.globalAlpha = 1;
    g.lineWidth = 2.6; g.strokeStyle = c; g.lineJoin = 'round'; g.stroke();
    g.lineWidth = 0.9; g.strokeStyle = 'rgba(255,255,255,.75)'; g.stroke();
  }
  function poli(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
  const FORMAS = {
    zangano(g, r, c) { poli(g, [0, r, -r, -r * 0.2, -r * 0.55, -r * 0.8, 0, -r * 0.3, r * 0.55, -r * 0.8, r, -r * 0.2]); neon(g, c); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r * 0.18, 0, TAU); g.fill(); },
    tirador(g, r, c) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); neon(g, c); g.fillStyle = c; g.fillRect(-3, 0, 6, r * 1.15); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r * 0.25, 0, TAU); g.fill(); },
    kamikaze(g, r, c) { poli(g, [0, r * 1.15, -r * 0.8, -r * 0.7, 0, -r * 0.25, r * 0.8, -r * 0.7]); neon(g, c, 0.55); },
    franco(g, r, c) { g.beginPath(); g.arc(0, 0, r * 0.75, 0, TAU); neon(g, c); g.fillStyle = c; g.fillRect(-2.5, 0, 5, r * 1.5); g.strokeStyle = c; g.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + Math.PI / 4; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75); g.lineTo(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15); g.stroke(); } g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r * 0.22, 0, TAU); g.fill(); },
    mina(g, r, c) { const n = 10; g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, rr = i % 2 ? r * 0.65 : r * 1.12; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); neon(g, c, 0.3); g.fillStyle = '#ff3030'; g.beginPath(); g.arc(0, 0, r * 0.3, 0, TAU); g.fill(); },
    blindado(g, r, c) { poli(g, [-r, -r * 0.5, -r * 0.5, -r, r * 0.5, -r, r, -r * 0.5, r, r * 0.3, 0, r, -r, r * 0.3]); neon(g, c); g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.moveTo(-r * 0.6, -r * 0.1); g.lineTo(r * 0.6, -r * 0.1); g.moveTo(0, -r * 0.8); g.lineTo(0, r * 0.7); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r * 0.18, 0, TAU); g.fill(); },
    tejedor(g, r, c) { g.beginPath(); for (let i = 0; i < 4; i++) { const a = i * TAU / 4; g.lineTo(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15); g.lineTo(Math.cos(a + 0.5) * r * 0.45, Math.sin(a + 0.5) * r * 0.45); g.lineTo(Math.cos(a + 0.78) * r * 0.9, Math.sin(a + 0.78) * r * 0.9); g.lineTo(Math.cos(a + 1.05) * r * 0.45, Math.sin(a + 1.05) * r * 0.45); } g.closePath(); neon(g, c); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r * 0.2, 0, TAU); g.fill(); },
    asteroide(g, r, c) { const pts = [1, 0.8, 1.05, 0.85, 1, 0.78, 1.08, 0.9, 0.82]; g.beginPath(); pts.forEach((k, i) => { const a = i * TAU / pts.length; g.lineTo(Math.cos(a) * r * k, Math.sin(a) * r * k); }); g.closePath(); g.fillStyle = '#2a2420'; g.fill(); g.globalAlpha = 0.35; g.fillStyle = c; g.fill(); g.globalAlpha = 1; g.strokeStyle = c; g.lineWidth = 2; g.stroke(); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(r * 0.25, -r * 0.2, r * 0.22, 0, TAU); g.arc(-r * 0.3, r * 0.3, r * 0.15, 0, TAU); g.fill(); },
  };
  const NAVE_F = {
    centella(g, c, ac) { poli(g, [0, -22, 8, -4, 20, 14, 8, 10, 0, 16, -8, 10, -20, 14, -8, -4]); neon(g, c, 0.35); g.fillStyle = ac; g.beginPath(); g.ellipse(0, -2, 3.4, 7, 0, 0, TAU); g.fill(); },
    baluarte(g, c, ac) { poli(g, [0, -20, 12, -10, 22, 4, 18, 16, 6, 12, 0, 18, -6, 12, -18, 16, -22, 4, -12, -10]); neon(g, c, 0.4); g.fillStyle = ac; g.beginPath(); g.arc(0, 0, 5.5, 0, TAU); g.fill(); g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.arc(0, 2, 12, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); },
    artillera(g, c, ac) { poli(g, [0, -18, 9, -8, 14, 8, 20, 18, 8, 14, 0, 18, -8, 14, -20, 18, -14, 8, -9, -8]); neon(g, c, 0.4); g.fillStyle = c; g.fillRect(-18, -12, 5, 18); g.fillRect(13, -12, 5, 18); g.fillStyle = ac; g.fillRect(-3, -8, 6, 12); },
    aguja(g, c, ac) { poli(g, [0, -28, 4, -6, 16, 16, 5, 11, 0, 20, -5, 11, -16, 16, -4, -6]); neon(g, c, 0.35); g.fillStyle = ac; g.beginPath(); g.ellipse(0, -6, 2.2, 8, 0, 0, TAU); g.fill(); },
    enjambre(g, c, ac) { poli(g, [0, -20, 10, -4, 12, 14, 0, 18, -12, 14, -10, -4]); neon(g, c, 0.35); g.fillStyle = ac; g.beginPath(); g.arc(0, 0, 4.5, 0, TAU); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(-19, 6, 4, 0, TAU); g.arc(19, 6, 4, 0, TAU); g.fill(); },
  };

  function halo(g, x, y, r, c) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function conAlfa(c, a) { // '#rrggbb' -> rgba
    const n = parseInt(c.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  // ------------------------------------------------------ Sprites
  function construirSprites() {
    const a = aj(), glow = a.brillo, K = 2, perfil = Datos.perfil();
    pal = PALETAS[a.daltonico] || PALETAS.ninguno;
    const firma = [a.brillo, a.daltonico, perfil.color].join('|');
    if (SPR && firma === firmaSpr) return; firmaSpr = firma;
    SPR = { en: {}, enF: {}, nave: {}, bala: {}, bE: [] };
    for (const t in FORMAS) {
      const base = ENEMIGOS[t].r, tam = (base * 2 + 16) * K, c = pal.en[t];
      for (const flash of [0, 1]) {
        const cv = mk(tam, tam), g = cv.getContext('2d');
        g.translate(tam / 2, tam / 2); g.scale(K, K);
        if (glow && t !== 'asteroide') halo(g, 0, 0, base + 8, conAlfa(c, 0.28));
        FORMAS[t](g, base, flash ? '#ffffff' : c);
        (flash ? SPR.enF : SPR.en)[t] = cv;
      }
    }
    for (const n of NAVES) {
      const cv = mk(80 * K, 80 * K), g = cv.getContext('2d');
      g.translate(40 * K, 40 * K); g.scale(K, K);
      if (glow) halo(g, 0, 0, 34, conAlfa(n.color, 0.22));
      NAVE_F[n.id](g, n.color, perfil.color);
      SPR.nave[n.id] = cv;
    }
    // balas
    const bol = (w, h, fn) => { const cv = mk(w * K, h * K), g = cv.getContext('2d'); g.translate(w * K / 2, h * K / 2); g.scale(K, K); fn(g); return cv; };
    SPR.bala[0] = bol(16, 30, (g) => { if (glow) halo(g, 0, 0, 12, conAlfa(pal.jug, 0.35)); g.fillStyle = pal.jug; g.fillRect(-2.6, -9, 5.2, 18); g.fillStyle = pal.balaJ; g.fillRect(-1.3, -9, 2.6, 18); });
    SPR.bala[1] = bol(16, 16, (g) => { if (glow) halo(g, 0, 0, 8, 'rgba(255,159,28,.4)'); g.fillStyle = '#ff9f1c'; g.beginPath(); g.arc(0, 0, 3.4, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 1.5, 0, TAU); g.fill(); });
    SPR.bala[2] = bol(14, 44, (g) => { if (glow) halo(g, 0, 0, 14, 'rgba(125,249,255,.3)'); g.fillStyle = '#7df9ff'; g.fillRect(-2.2, -19, 4.4, 38); g.fillStyle = '#fff'; g.fillRect(-0.9, -19, 1.8, 38); });
    SPR.bala[3] = bol(16, 26, (g) => { if (glow) halo(g, 0, 4, 11, 'rgba(255,107,107,.35)'); g.fillStyle = '#ff6b6b'; poli(g, [0, -10, 4, 6, -4, 6]); g.fill(); g.fillStyle = '#ffd23d'; g.beginPath(); g.moveTo(-2.5, 6); g.lineTo(0, 12); g.lineTo(2.5, 6); g.fill(); });
    SPR.bala[4] = bol(12, 12, (g) => { if (glow) halo(g, 0, 0, 6, 'rgba(196,161,255,.4)'); g.fillStyle = '#c4a1ff'; g.beginPath(); g.arc(0, 0, 2.6, 0, TAU); g.fill(); });
    const be = pal.bE;
    SPR.bE[0] = bol(24, 24, (g) => { if (glow) halo(g, 0, 0, 11, conAlfa(be, 0.4)); g.fillStyle = be; g.beginPath(); g.arc(0, 0, 5.2, 0, TAU); g.fill(); g.lineWidth = 1.4; g.strokeStyle = '#fff'; g.beginPath(); g.arc(0, 0, 5.2, 0, TAU); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 2.3, 0, TAU); g.fill(); });
    SPR.bE[1] = bol(14, 30, (g) => { if (glow) halo(g, 0, 0, 12, conAlfa(be, 0.3)); g.fillStyle = be; poli(g, [0, 12, -3.2, -9, 3.2, -9]); g.fill(); g.fillStyle = '#fff'; poli(g, [0, 10, -1.2, -6, 1.2, -6]); g.fill(); });
    SPR.bE[2] = bol(32, 32, (g) => { if (glow) halo(g, 0, 0, 15, conAlfa(be, 0.35)); g.fillStyle = be; g.beginPath(); g.arc(0, 0, 8.5, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff'; g.beginPath(); g.arc(0, 0, 8.5, 0, TAU); g.stroke(); g.strokeStyle = be; g.beginPath(); g.arc(0, 0, 4.2, 0, TAU); g.stroke(); });
    SPR.moneda = bol(22, 22, (g) => { if (glow) halo(g, 0, 0, 10, 'rgba(255,210,61,.35)'); g.fillStyle = '#ffd23d'; g.beginPath(); g.arc(0, 0, 6.5, 0, TAU); g.fill(); g.strokeStyle = '#fff6c0'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = '#b8860b'; g.fillRect(-1.2, -3.5, 2.4, 7); });
  }
  D.construirSprites = construirSprites;

  // ------------------------------------------------------ Fondo por mundo
  const F = { mundo: -1, tile: null, decor: [], capas: [[], [], []], emb: [] };
  function construirFondo(m) {
    const M = MUNDOS[m], rg = Util.rng(m * 977 + 13);
    F.mundo = m;
    F.tile = mk(240, 400);
    const g = F.tile.getContext('2d');
    g.fillStyle = M.fondo; g.fillRect(0, 0, 240, 400);
    for (let i = 0; i < 9; i++) {
      const x = rg() * 240, y = rg() * 400, rr = 60 + rg() * 90, c = M.neb[i % 2];
      for (const oy of [-400, 0, 400]) { const gr = g.createRadialGradient(x, y + oy, 0, x, y + oy, rr); gr.addColorStop(0, conAlfa(c, 0.5)); gr.addColorStop(1, conAlfa(c, 0)); g.fillStyle = gr; g.fillRect(x - rr, y + oy - rr, rr * 2, rr * 2); }
    }
    // decoración lenta
    F.decor = [];
    const rd = Util.rng(m * 31 + 5);
    const add = (spr, x, y, vy, vx) => F.decor.push({ spr, x, y, vy, vx: vx || 0, ph: rd() * 6 });
    const sp = (w, h, fn) => { const cv = mk(w, h), q = cv.getContext('2d'); fn(q, w, h); return cv; };
    switch (M.decor) {
      case 'planeta': {
        const pl = sp(220, 220, (q) => { const gr = q.createRadialGradient(80, 80, 10, 110, 110, 100); gr.addColorStop(0, '#d96bff'); gr.addColorStop(1, '#2a0a4a'); q.fillStyle = gr; q.beginPath(); q.arc(110, 110, 80, 0, TAU); q.fill(); q.strokeStyle = 'rgba(255,200,255,.35)'; q.lineWidth = 5; q.beginPath(); q.ellipse(110, 110, 105, 22, -0.4, 0, TAU); q.stroke(); });
        const lu = sp(60, 60, (q) => { const gr = q.createRadialGradient(20, 20, 3, 30, 30, 30); gr.addColorStop(0, '#ffd9b0'); gr.addColorStop(1, '#503020'); q.fillStyle = gr; q.beginPath(); q.arc(30, 30, 26, 0, TAU); q.fill(); });
        add(pl, 330, 120, 14); add(lu, 60, 520, 24); break;
      }
      case 'roca': for (let i = 0; i < 7; i++) { const s = 30 + rd() * 60; add(sp(s * 2, s * 2, (q) => { q.translate(s, s); q.beginPath(); for (let k = 0; k < 9; k++) { const a = k * TAU / 9, rr = s * (0.7 + rd() * 0.3); q.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } q.closePath(); const gr = q.createLinearGradient(-s, -s, s, s); gr.addColorStop(0, '#7a5a3a'); gr.addColorStop(1, '#2a1a10'); q.fillStyle = gr; q.fill(); }), rd() * W, rd() * H, 30 + rd() * 50, rd() * 10 - 5); } break;
      case 'cristal': for (let i = 0; i < 6; i++) { const s = 24 + rd() * 40; add(sp(s * 1.2, s * 2.4, (q) => { q.translate(s * 0.6, s * 1.2); poli(q, [0, -s * 1.1, s * 0.5, 0, 0, s * 1.1, -s * 0.5, 0]); const gr = q.createLinearGradient(-s * 0.5, 0, s * 0.5, 0); gr.addColorStop(0, 'rgba(180,240,255,.75)'); gr.addColorStop(1, 'rgba(60,120,200,.5)'); q.fillStyle = gr; q.fill(); q.strokeStyle = 'rgba(220,250,255,.8)'; q.lineWidth = 1.5; q.stroke(); }), rd() * W, rd() * H, 25 + rd() * 35, 0); } break;
      case 'espora': for (let i = 0; i < 9; i++) { const s = 14 + rd() * 28; add(sp(s * 2, s * 2, (q) => halo(q, s, s, s, i % 2 ? 'rgba(125,255,107,.55)' : 'rgba(120,255,220,.45)')), rd() * W, rd() * H, 20 + rd() * 25, 0); } break;
      case 'sol': add(sp(520, 260, (q) => { halo(q, 260, 260, 260, 'rgba(255,170,40,.9)'); q.fillStyle = '#ffe9a0'; q.beginPath(); q.arc(260, 280, 150, 0, TAU); q.fill(); }), -20, -170, 6); break;
      case 'anillo': add(sp(440, 440, (q) => { halo(q, 220, 220, 220, 'rgba(120,40,160,.4)'); q.fillStyle = '#000'; q.beginPath(); q.arc(220, 220, 46, 0, TAU); q.fill(); for (let k = 0; k < 4; k++) { q.strokeStyle = 'rgba(217,107,255,' + (0.55 - k * 0.1) + ')'; q.lineWidth = 3; q.beginPath(); q.ellipse(220, 220, 80 + k * 38, 28 + k * 12, 0.4, 0, TAU); q.stroke(); } }), 20, 140, 8); break;
    }
    // estrellas
    const n = aj().estrellas;
    for (let k = 0; k < 3; k++) { F.capas[k].length = 0; const c = Math.round(n / (k === 0 ? 2.2 : k === 1 ? 3.2 : 5)); for (let i = 0; i < c; i++) F.capas[k].push({ x: Math.random() * W, y: Math.random() * H, s: k === 2 ? 2.4 : k === 1 ? 1.7 : 1.1 }); }
  }
  D.fondoMundo = (m) => { if (F.mundo !== m) construirFondo(m); };
  D.reconstruirFondo = () => { F.mundo = -1; };

  const VEL = [28, 70, 150];
  function fondo(g, t, dt, velMul) {
    const a = aj(), M = MUNDOS[F.mundo], mov = a.reducirMov ? 0.25 : 1, vm = (velMul || 1) * mov;
    const off = (t * 14 * vm) % 800;
    g.imageSmoothingEnabled = true;
    g.drawImage(F.tile, 0, off - 800, W, 800); g.drawImage(F.tile, 0, off, W, 800);
    if (a.capas >= 2) for (let i = 0; i < F.decor.length; i++) {
      const d = F.decor[i], w = d.spr.width, h = d.spr.height;
      let y = (d.y + t * d.vy * vm) % (H + h * 2); if (y < 0) y += H + h * 2;
      let x = d.x + Math.sin(t * 0.3 + d.ph) * 14 + d.vx * t * 0.2;
      if (M.decor === 'sol') { g.globalAlpha = 0.8 + Math.sin(t) * 0.1; g.drawImage(d.spr, x, d.y); g.globalAlpha = 1; continue; }
      if (M.decor === 'anillo') { g.drawImage(d.spr, x, d.y + Math.sin(t * 0.2) * 10); continue; }
      g.drawImage(d.spr, x, y - h);
    }
    g.fillStyle = M.estrella;
    for (let k = 0; k < 3; k++) {
      if (k >= a.capas) break;
      const L = F.capas[k], v = VEL[k] * vm;
      g.globalAlpha = k === 0 ? 0.45 : k === 1 ? 0.7 : 1;
      for (let i = 0; i < L.length; i++) { const s = L[i]; s.y += v * dt; if (s.y > H) { s.y -= H; s.x = Math.random() * W; } g.fillRect(s.x, s.y, s.s, k === 2 ? s.s * 2.6 : s.s); }
    }
    g.globalAlpha = 1;
  }
  D.fondo = fondo;

  // ------------------------------------------------------ Jefes (vectorial)
  function jefeForma(g, e, t) {
    const J = e.jefe, r = e.r, c = e.flash > 0 ? '#ffffff' : J.color, k = Math.sin(t * 3) * 0.5 + 0.5;
    switch (J.id) {
      case 'centinela': poli(g, [0, r, -r * 1.2, -r * 0.1, -r * 0.7, -r * 0.9, 0, -r * 0.5, r * 0.7, -r * 0.9, r * 1.2, -r * 0.1]); neon(g, c); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r * 0.2 + k * 2, 0, TAU); g.fill(); break;
      case 'reina': g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * TAU / 10, rr = i % 2 ? r * 0.8 : r * 1.1; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.9); } g.closePath(); neon(g, c); g.fillStyle = '#fff'; g.fillRect(-r * 0.35, -r * 0.1, r * 0.7, 6); break;
      case 'leviatan': g.beginPath(); g.ellipse(0, 0, r * 1.15, r * 0.75, 0, 0, TAU); neon(g, c); g.strokeStyle = c; g.lineWidth = 3; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * r * 0.4, -r * 0.5); g.lineTo(i * r * 0.55, r * 0.6); g.stroke(); } g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -r * 0.1, r * 0.2, 0, TAU); g.fill(); break;
      case 'espora': g.beginPath(); for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + t * 0.3, rr = i % 2 ? r * 0.75 : r * 1.12; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); neon(g, c, 0.3); for (let i = 0; i < 5; i++) { g.fillStyle = '#c8ffc0'; g.beginPath(); g.arc(Math.cos(i * 1.26 + t) * r * 0.4, Math.sin(i * 1.26 + t) * r * 0.4, r * 0.1, 0, TAU); g.fill(); } break;
      case 'coloso': poli(g, [-r * 1.3, r * 0.2, -r, -r * 0.7, -r * 0.4, -r, r * 0.4, -r, r, -r * 0.7, r * 1.3, r * 0.2, r * 0.5, r, -r * 0.5, r]); neon(g, c); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r * 0.3, 0, TAU); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(0, 0, r * 0.18 + k * 3, 0, TAU); g.fill(); break;
      case 'ojo': g.beginPath(); g.ellipse(0, 0, r * 1.3, r * 0.85, 0, 0, TAU); neon(g, c, 0.3); g.fillStyle = '#0a0614'; g.beginPath(); g.arc(0, 0, r * 0.55, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); g.fillStyle = c; g.beginPath(); g.arc(Math.sin(t) * r * 0.15, Math.cos(t * 0.7) * r * 0.1, r * 0.28, 0, TAU); g.fill(); g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r * 1.45, t, t + 2); g.stroke(); break;
    }
  }

  // ------------------------------------------------------ Escena
  function mundoDeSim(S) { return S.mundo; }
  D.escena = function (g, S, dt, t) {
    const a = aj();
    D.fondoMundo(mundoDeSim(S));
    fondo(g, t, dt, S.lento > 0 ? 0.5 : 1);
    // peligros
    for (let i = 0; i < S.hazs.n; i++) {
      const h = S.hazs.a[i];
      if (h.warn > 0) { g.globalAlpha = 0.12 + 0.12 * Math.sin(t * 30); g.fillStyle = '#ff3030'; g.fillRect(h.x, h.y, h.w, h.h); g.globalAlpha = 0.8; g.strokeStyle = '#ff6060'; g.lineWidth = 1.5; g.strokeRect(h.x, h.y, h.w, h.h); g.globalAlpha = 1; }
      else { g.fillStyle = conAlfa(pal.bE, 0.55); g.fillRect(h.x - 4, h.y - 4, h.w + 8, h.h + 8); g.fillStyle = '#fff'; g.fillRect(h.x + h.w * 0.25, h.y, h.w * 0.5, h.h); }
    }
    // power-ups
    for (let i = 0; i < S.pus.n; i++) {
      const p = S.pus.a[i], P = POWERUPS[p.tipo];
      if (p.tipo === 'moneda') { const s = 1 + Math.sin(p.t * 8) * 0.12; g.drawImage(SPR.moneda, p.x - 11 * s, p.y - 11 * s, 22 * s, 22 * s); continue; }
      const k = 1 + Math.sin(p.t * 6) * 0.08;
      g.fillStyle = '#0a0614'; g.beginPath(); g.arc(p.x, p.y, p.r * k, 0, TAU); g.fill();
      g.lineWidth = 2.5; g.strokeStyle = P.color; g.stroke();
      g.fillStyle = P.color; g.font = '800 14px ' + FUENTE; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(P.letra, p.x, p.y + 1);
    }
    // telegrafía del francotirador
    for (let i = 0; i < S.enem.n; i++) {
      const e = S.enem.a[i];
      if (e.tipo === 'franco' && e.fase === 1) {
        g.globalAlpha = 0.25 + 0.55 * (1 - e.d / 1.15); g.strokeStyle = '#ff3030'; g.lineWidth = 1.5 + (1 - e.d / 1.15) * 2;
        g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.x + Math.cos(e.ang) * 1000, e.y + Math.sin(e.ang) * 1000); g.stroke(); g.globalAlpha = 1;
      }
    }
    // enemigos
    for (let i = 0; i < S.enem.n; i++) {
      const e = S.enem.a[i];
      if (e.jefe) {
        g.save(); g.translate(e.x, e.y);
        if (a.brillo) halo(g, 0, 0, e.r * 2, conAlfa(e.jefe.color, 0.25));
        if (e.inv > 0 || e.intro > 0) g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 40);
        jefeForma(g, e, t); g.restore(); g.globalAlpha = 1;
        if (e.carga === 1) { g.strokeStyle = '#ff3030'; g.lineWidth = 2; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.x, H); g.stroke(); g.globalAlpha = 1; }
        continue;
      }
      const sp = (e.flash > 0 ? SPR.enF : SPR.en)[e.tipo], sz = sp.width / 2;
      if (e.tipo === 'asteroide') { g.save(); g.translate(e.x, e.y); g.rotate(e.rot); g.scale(e.esc, e.esc); g.drawImage(sp, -sz / 2, -sz / 2, sz, sz); g.restore(); continue; }
      if (e.tipo === 'mina') { g.save(); g.translate(e.x, e.y); g.rotate(e.rot); g.drawImage(sp, -sz / 2, -sz / 2, sz, sz); g.restore(); continue; }
      if (e.tipo === 'kamikaze') { g.save(); g.translate(e.x, e.y); g.rotate(e.fase === 1 ? e.ang - Math.PI / 2 : 0); if (e.fase === 0 && Math.sin(e.t * 30) > 0.3) g.globalAlpha = 0.55; g.drawImage(sp, -sz / 2, -sz / 2, sz, sz); g.restore(); g.globalAlpha = 1; continue; }
      g.drawImage(sp, e.x - sz / 2, e.y - sz / 2, sz, sz);
      if (e.vidaMax > 6 && e.vida < e.vidaMax) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(e.x - 16, e.y - e.r - 9, 32, 3); g.fillStyle = pal.en[e.tipo]; g.fillRect(e.x - 16, e.y - e.r - 9, 32 * Math.max(0, e.vida / e.vidaMax), 3); }
    }
    // balas enemigas
    for (let i = 0; i < S.balasE.n; i++) {
      const b = S.balasE.a[i], sp = SPR.bE[b.tipo], w = sp.width / 2, h = sp.height / 2;
      if (b.tipo === 1) { g.save(); g.translate(b.x, b.y); g.rotate(Math.atan2(b.vy, b.vx) - Math.PI / 2); g.drawImage(sp, -w / 2, -h / 2, w, h); g.restore(); }
      else g.drawImage(sp, b.x - w / 2, b.y - h / 2, w, h);
    }
    // naves
    for (let i = 0; i < S.naves.length; i++) nave(g, S.naves[i], t, dt);
    // balas del jugador
    for (let i = 0; i < S.balas.n; i++) {
      const b = S.balas.a[i], sp = SPR.bala[b.tipo], w = sp.width / 2, h = sp.height / 2;
      if (b.tipo === 3 || (b.tipo === 0 && b.vx !== 0)) { g.save(); g.translate(b.x, b.y); g.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2); g.drawImage(sp, -w / 2, -h / 2, w, h); g.restore(); }
      else g.drawImage(sp, b.x - w / 2, b.y - h / 2, w, h);
    }
    Fx.dibujar(g);
  };

  function etiqueta(g, n, S) {
    if (S.naves.length < 2) return;
    g.font = '700 10px ' + FUENTE; g.textAlign = 'center'; g.textBaseline = 'middle';
    const s = n.nombre || 'Jugador';
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(n.x - g.measureText(s).width / 2 - 3, n.y + 28, g.measureText(s).width + 6, 13);
    g.fillStyle = n.colorP || '#fff'; g.fillText(s, n.x, n.y + 35);
    if (n.ping !== undefined && n.id !== S.yo) { g.fillStyle = n.ping < 80 ? '#7dffb3' : n.ping < 160 ? '#ffd23d' : '#ff6b6b'; g.font = '600 8px ' + FUENTE; g.fillText(n.ping + ' ms', n.x, n.y + 48); }
    if (n.burbujaT > 0) { const w = g.measureText(n.burbuja).width + 14; g.font = '700 12px ' + FUENTE; g.fillStyle = 'rgba(8,4,22,.9)'; g.strokeStyle = n.colorP || '#fff'; g.lineWidth = 1.5; g.fillRect(n.x - w / 2, n.y - 62, w + 8, 22); g.strokeRect(n.x - w / 2, n.y - 62, w + 8, 22); g.fillStyle = '#fff'; g.fillText(n.burbuja, n.x + 4, n.y - 51); }
  }
  function fantasma(g, n, t) {
    if (n.retirada) return;
    g.globalAlpha = 0.5 + 0.2 * Math.sin(t * 5); g.strokeStyle = n.color; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.arc(n.x, n.y, 26, 0, TAU); g.stroke(); g.setLineDash([]);
    g.lineWidth = 4; g.strokeStyle = '#7dffb3'; g.beginPath(); g.arc(n.x, n.y, 32, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, (n.reviv || 0) / 2.5)); g.stroke();
    g.fillStyle = '#fff'; g.font = '700 10px ' + FUENTE; g.textAlign = 'center'; g.fillText('REVIVIR', n.x, n.y - 40); g.globalAlpha = 1;
  }
  function nave(g, n, t, dt) {
    if (!n.vivo) { if (Sim.naves.length > 1) { fantasma(g, n, t); etiqueta(g, n, Sim); } return; }
    const sp = SPR.nave[n.def.id], w = 40;
    if (n.hab_prev === undefined) n.hab_prev = 0;
    // rayo
    if (n.habT > 0 && n.def.hab === 'rayo') {
      const gr = g.createLinearGradient(n.x - 26, 0, n.x + 26, 0);
      gr.addColorStop(0, 'rgba(255,107,213,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,107,213,0)');
      g.globalAlpha = Math.min(1, n.habT * 3); g.fillStyle = gr; g.fillRect(n.x - 26, 0, 52, n.y); g.globalAlpha = 1;
    }
    // estela
    if (aj().estela && Math.random() < 0.7) Fx.p(n.x + Util.azar(-3, 3), n.y + 16, Util.azar(-14, 14), 120, 0.35, n.color, 3);
    if (n.inv > 0 && n.dash <= 0 && Math.floor(n.inv * 14) % 2) g.globalAlpha = 0.35;
    if (n.dash > 0) g.globalAlpha = 0.6;
    g.drawImage(sp, n.x - w, n.y - w, w * 2, w * 2);
    g.globalAlpha = 1;
    // llama del motor
    const f = 8 + Math.random() * 6; g.fillStyle = '#ffd23d'; poli(g, [n.x - 4, n.y + 14, n.x, n.y + 14 + f, n.x + 4, n.y + 14]); g.fill();
    // escudos
    if (n.escudo > 0) { g.strokeStyle = '#7dffb3'; g.lineWidth = 2; g.globalAlpha = 0.8; g.beginPath(); g.arc(n.x, n.y, 25, 0, TAU); g.stroke(); if (n.escudo > 1) { g.beginPath(); g.arc(n.x, n.y, 29, 0, TAU); g.stroke(); } g.globalAlpha = 1; }
    if (n.habT > 0 && n.def.hab === 'escudo') { g.fillStyle = 'rgba(125,255,179,.18)'; g.strokeStyle = '#7dffb3'; g.lineWidth = 2.5; g.globalAlpha = n.habT < 1 ? 0.5 + 0.5 * Math.sin(t * 30) : 1; g.beginPath(); g.arc(n.x, n.y, 52, 0, TAU); g.fill(); g.stroke(); g.globalAlpha = 1; }
    if (n.habT > 0 && n.def.hab === 'drones') for (let i = 0; i < 3; i++) { const a = n.t * 3 + i * TAU / 3; g.fillStyle = '#c4a1ff'; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(n.x + Math.cos(a) * 46, n.y + Math.sin(a) * 46, 5, 0, TAU); g.fill(); g.stroke(); }
    if (n.iman > 0) { g.strokeStyle = 'rgba(196,161,255,.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(n.x, n.y, 34 + Math.sin(t * 8) * 3, 0, TAU); g.stroke(); }
    // punto de impacto (caja de choque)
    g.fillStyle = '#fff'; g.beginPath(); g.arc(n.x, n.y, 2.6, 0, TAU); g.fill();
    g.strokeStyle = n.color; g.lineWidth = 1; g.beginPath(); g.arc(n.x, n.y, 4.4, 0, TAU); g.stroke();
    etiqueta(g, n, Sim);
  }

  D.halo = halo; D.conAlfa = conAlfa; D.poli = poli; D.neon = neon; D.NAVE_F = NAVE_F; D.sprNave = (id) => SPR.nave[id];
  return D;
})();
