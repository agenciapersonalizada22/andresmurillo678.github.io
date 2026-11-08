// Dibujo del canvas: mesa, discos, mazos, particulas, estelas y efectos.
import { A } from './almacen.js';
const F = window.HkFisica, W = F.W, H = F.H, PAD = 16;
const CAPS = [0, 70, 160, 320, 640];

export function crearRender(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const R = { esc: 1, ox: 0, oy: 0, cw: 0, ch: 0, shake: 0, flash: 0, flashC: '#fff', anillos: [], trails: [], np: 0, girar: false };
  const P = { x: new Float32Array(700), y: new Float32Array(700), vx: new Float32Array(700), vy: new Float32Array(700), v: new Float32Array(700), m: new Float32Array(700), s: new Float32Array(700), c: new Array(700).fill('#fff') };
  let estrellas = null;

  R.medir = function () {
    const r = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * (A.graf.res || 1);
    const cw = Math.max(200, r.width), ch = Math.max(200, r.height);
    const w = Math.round(cw * dpr), h = Math.round(ch * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    R.dpr = dpr; R.cw = cw; R.ch = ch;
    R.esc = Math.min(cw / (W + PAD * 2), ch / (H + PAD * 2));
    R.ox = (cw - W * R.esc) / 2; R.oy = (ch - H * R.esc) / 2;
  };
  // pantalla (px CSS) -> mesa logica
  R.aLogica = function (px, py) {
    let x = (px - R.ox) / R.esc, y = (py - R.oy) / R.esc;
    if (R.girar) { x = W - x; y = H - y; }
    return { x, y };
  };

  R.chispas = function (x, y, n, color, vel, vida) {
    const cap = CAPS[A.graf.particulas] * (A.acc.reducir ? 0.4 : 1);
    n = Math.min(n, Math.floor(cap / 6));
    for (let i = 0; i < n && R.np < cap; i++) {
      const k = R.np++, a = Math.random() * 6.2832, v = vel * (0.3 + Math.random() * 0.7);
      P.x[k] = x; P.y[k] = y; P.vx[k] = Math.cos(a) * v; P.vy[k] = Math.sin(a) * v; P.v[k] = vida * (0.6 + Math.random() * 0.6); P.m[k] = P.v[k]; P.s[k] = 1.5 + Math.random() * 2.5; P.c[k] = color;
    }
  };
  R.golpe = function (x, y, v, color) {
    R.chispas(x, y, 4 + Math.round(v / 160), color, 150 + v * 0.35, 0.45);
    if (A.graf.particulas) R.anillos.push({ x, y, t: 0, c: color, r0: 14 });
    if (!A.acc.reducir) R.shake = Math.min(7, R.shake + v / 420);
  };
  R.gol = function (x, y, color) {
    R.chispas(x, Math.max(10, Math.min(H - 10, y)), 80, color, 520, 1.1);
    R.flash = A.acc.reducir ? 0.12 : 0.45; R.flashC = color;
    if (!A.acc.reducir) R.shake = 12;
  };
  R.limpiar = function () { R.np = 0; R.anillos.length = 0; R.trails.length = 0; };

  function actualizar(dt) {
    const g = 60 * dt;
    for (let i = 0; i < R.np; i++) {
      P.v[i] -= dt;
      if (P.v[i] <= 0) { const k = --R.np; P.x[i] = P.x[k]; P.y[i] = P.y[k]; P.vx[i] = P.vx[k]; P.vy[i] = P.vy[k]; P.v[i] = P.v[k]; P.m[i] = P.m[k]; P.s[i] = P.s[k]; P.c[i] = P.c[k]; i--; continue; }
      P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; P.vx[i] *= 1 - 2.2 * dt; P.vy[i] *= 1 - 2.2 * dt;
    }
    for (let i = R.anillos.length - 1; i >= 0; i--) { R.anillos[i].t += dt * 2.6; if (R.anillos[i].t >= 1) R.anillos.splice(i, 1); }
    R.shake *= Math.pow(0.02, dt); R.flash = Math.max(0, R.flash - dt * 1.3);
    void g;
  }

  function estrellasInit() { estrellas = []; for (let i = 0; i < 70; i++) estrellas.push([Math.random() * W, Math.random() * H, Math.random() * 1.6 + 0.4, Math.random()]); }
  function ruta(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  function mesa(c, T, t) {
    const gl = W / 2 - 75, gw = 150, brillo = A.graf.brillo;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, T.fondo); g.addColorStop(0.5, T.fondo2); g.addColorStop(1, T.fondo);
    ruta(c, 0, 0, W, H, 26); c.fillStyle = g; c.fill();
    c.save(); ruta(c, 0, 0, W, H, 26); c.clip();
    if (T.id === 'madera') { c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 2; for (let y = 14; y < H; y += 26) { c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(100, y + 6, 300, y - 6, W, y); c.stroke(); } }
    else if (T.id === 'neon') { c.strokeStyle = 'rgba(255,79,216,.10)'; c.lineWidth = 1; for (let x = 0; x <= W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y <= H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } }
    else if (T.id === 'espacio') { if (!estrellas) estrellasInit(); c.fillStyle = '#fff'; estrellas.forEach((e) => { c.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t * 0.8 + e[3] * 6)); c.fillRect(e[0], e[1], e[2], e[2]); }); c.globalAlpha = 1; }
    else if (T.id === 'hielo') { c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.5; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(40 + i * 40, 0); c.lineTo(90 + i * 30, H); c.stroke(); } }
    else if (T.id === 'lava') { const l = c.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 380); l.addColorStop(0, 'rgba(255,90,31,.20)'); l.addColorStop(1, 'rgba(255,90,31,0)'); c.fillStyle = l; c.fillRect(0, 0, W, H); }
    c.restore();
    c.lineWidth = 3; c.strokeStyle = T.linea; c.globalAlpha = 0.55;
    if (brillo) { c.shadowColor = T.brillo; c.shadowBlur = 10; }
    c.beginPath(); c.moveTo(14, H / 2); c.lineTo(W - 14, H / 2); c.stroke();
    c.beginPath(); c.arc(W / 2, H / 2, 62, 0, 6.2832); c.stroke();
    c.beginPath(); c.arc(W / 2, 0, 100, 0, Math.PI); c.stroke();
    c.beginPath(); c.arc(W / 2, H, 100, Math.PI, 6.2832); c.stroke();
    c.globalAlpha = 1; c.fillStyle = T.linea; c.beginPath(); c.arc(W / 2, H / 2, 6, 0, 6.2832); c.fill();
    c.shadowBlur = 0;
    // porterias
    c.fillStyle = '#000';
    c.fillRect(gl, -12, gw, 12); c.fillRect(gl, H, gw, 12);
    c.lineWidth = 7; c.lineCap = 'round'; c.strokeStyle = T.borde;
    if (brillo) { c.shadowColor = T.brillo; c.shadowBlur = 14; }
    c.beginPath(); c.moveTo(26, 0); c.lineTo(gl, 0); c.moveTo(gl + gw, 0); c.lineTo(W - 26, 0); c.moveTo(26, H); c.lineTo(gl, H); c.moveTo(gl + gw, H); c.lineTo(W - 26, H);
    c.moveTo(0, 26); c.lineTo(0, H - 26); c.moveTo(W, 26); c.lineTo(W, H - 26); c.stroke();
    c.beginPath(); c.arc(26, 26, 26, Math.PI, 1.5 * Math.PI); c.arc(W - 26, 26, 26, 1.5 * Math.PI, 0); c.arc(W - 26, H - 26, 26, 0, 0.5 * Math.PI); c.arc(26, H - 26, 26, 0.5 * Math.PI, Math.PI); c.stroke();
    c.shadowBlur = 0;
    c.fillStyle = T.linea;
    [[gl, 0], [gl + gw, 0], [gl, H], [gl + gw, H]].forEach((p) => { c.beginPath(); c.arc(p[0], p[1], 7, 0, 6.2832); c.fill(); });
  }

  function disco(c, d, p, tr) {
    const r = p.r, x = p.x, y = p.y;
    if (A.graf.sombras) { c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x + 3, y + 5, r, r * 0.9, 0, 0, 6.2832); c.fill(); }
    if (A.graf.brillo) { c.shadowColor = d.color; c.shadowBlur = p.extra ? 8 : 16; }
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r);
    g.addColorStop(0, d.borde); g.addColorStop(0.35, d.color); g.addColorStop(1, shade(d.color));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); c.shadowBlur = 0;
    c.lineWidth = 2; c.strokeStyle = d.borde; c.globalAlpha = 0.9; c.beginPath(); c.arc(x, y, r - 1, 0, 6.2832); c.stroke(); c.globalAlpha = 1;
    if (d.tipo === 'anillo') { c.strokeStyle = d.borde; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r * 0.55, 0, 6.2832); c.stroke(); }
    else if (d.tipo === 'futbol') { c.fillStyle = d.borde; for (let i = 0; i < 5; i++) { const a = p.giro + i * 1.2566; c.beginPath(); c.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.2, 0, 6.2832); c.fill(); } c.beginPath(); c.arc(x, y, r * 0.22, 0, 6.2832); c.fill(); }
    else if (d.tipo === 'cristal') { c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r * 0.6, p.giro, p.giro + 1.7); c.stroke(); }
    if (p.extra) { c.strokeStyle = '#fff'; c.setLineDash([4, 4]); c.beginPath(); c.arc(x, y, r + 4, 0, 6.2832); c.stroke(); c.setLineDash([]); }
    void tr;
  }
  function shade(h) { const n = parseInt(h.slice(1), 16), k = 0.55; return 'rgb(' + ((n >> 16 & 255) * k | 0) + ',' + ((n >> 8 & 255) * k | 0) + ',' + ((n & 255) * k | 0) + ')'; }

  function mazo(c, m, col, t) {
    const r = m.r, x = m.x, y = m.y;
    if (A.graf.sombras) { c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.arc(x + 4, y + 7, r, 0, 6.2832); c.fill(); }
    if (A.graf.brillo) { c.shadowColor = col; c.shadowBlur = m.grande > 0 ? 24 : 12; }
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
    g.addColorStop(0, '#fff'); g.addColorStop(0.25, col); g.addColorStop(1, shade(col));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); c.shadowBlur = 0;
    c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.65)'; c.beginPath(); c.arc(x, y, r - 1.5, 0, 6.2832); c.stroke();
    c.fillStyle = shade(col); c.beginPath(); c.arc(x, y, r * 0.42, 0, 6.2832); c.fill();
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r * 0.3, 0, 6.2832); c.fill();
    if (m.lento > 0) { c.strokeStyle = '#9fe9ff'; c.lineWidth = 3; c.setLineDash([5, 5]); c.beginPath(); c.arc(x, y, r + 6, t * 2, t * 2 + 6.2832); c.stroke(); c.setLineDash([]); }
  }

  function obst(c, o, T) {
    c.fillStyle = T.borde; c.strokeStyle = T.linea; c.lineWidth = 3;
    if (A.graf.brillo) { c.shadowColor = T.brillo; c.shadowBlur = 12; }
    if (o.tipo === 'c') { c.beginPath(); c.arc(o.x, o.y, o.r, 0, 6.2832); c.fill(); c.globalAlpha = 0.4; c.fillStyle = T.linea; c.fill(); c.globalAlpha = 1; c.stroke(); c.beginPath(); c.arc(o.x, o.y, o.r * 0.45, 0, 6.2832); c.stroke(); }
    else { ruta(c, o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, 5); c.fill(); c.stroke(); }
    c.shadowBlur = 0;
  }

  const COLOR_ITEM = { grande: '#6dff6d', lento: '#9fe9ff', multi: '#ffd23d' };
  function item(c, it, t) {
    const col = COLOR_ITEM[it.tipo], r = it.r + Math.sin(t * 5) * 2, x = it.x, y = it.y;
    if (it.vida < 3 && Math.floor(t * 8) % 2) return;
    if (A.graf.brillo) { c.shadowColor = col; c.shadowBlur = 14; }
    c.fillStyle = 'rgba(0,0,0,.55)'; c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); c.stroke(); c.shadowBlur = 0;
    c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 2.5;
    if (it.tipo === 'grande') { c.beginPath(); c.arc(x, y, 5, 0, 6.2832); c.stroke(); c.beginPath(); c.arc(x, y, 10, 0, 6.2832); c.stroke(); }
    else if (it.tipo === 'lento') { for (let i = 0; i < 3; i++) { const a = i * 1.0472; c.beginPath(); c.moveTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11); c.lineTo(x - Math.cos(a) * 11, y - Math.sin(a) * 11); c.stroke(); } }
    else { [[-8, 4], [8, 4], [0, -7]].forEach((p) => { c.beginPath(); c.arc(x + p[0], y + p[1], 4, 0, 6.2832); c.fill(); }); }
  }

  R.dibujar = function (f, dt, t) {
    if (!R.cw) R.medir();
    actualizar(dt);
    const c = ctx, dpr = R.dpr, T = f.mesa, D = f.disco;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = f.fondoPagina || '#05060f'; c.fillRect(0, 0, R.cw, R.ch);
    const sx = R.shake ? (Math.random() - 0.5) * R.shake : 0, sy = R.shake ? (Math.random() - 0.5) * R.shake : 0;
    c.setTransform(dpr * R.esc, 0, 0, dpr * R.esc, dpr * (R.ox + sx), dpr * (R.oy + sy));
    c.save();
    if (R.girar) { c.translate(W, H); c.rotate(Math.PI); }
    mesa(c, T, t);
    f.obst.forEach((o) => obst(c, o, T));
    f.items.forEach((it) => item(c, it, t));
    if (A.graf.estela) {
      f.pucks.forEach((p, i) => {
        const tr = R.trails[i] || (R.trails[i] = []);
        tr.push(p.x, p.y); if (tr.length > 28) tr.splice(0, 2);
        const sp = Math.hypot(p.vx || 0, p.vy || 0);
        if (sp > 250) for (let k = 0; k < tr.length; k += 2) { c.globalAlpha = (k / tr.length) * 0.35; c.fillStyle = D.color; c.beginPath(); c.arc(tr[k], tr[k + 1], p.r * (0.35 + 0.5 * k / tr.length), 0, 6.2832); c.fill(); }
      });
      c.globalAlpha = 1; R.trails.length = Math.min(R.trails.length, f.pucks.length);
    }
    f.pucks.forEach((p) => disco(c, D, p));
    f.mallets.forEach((m, i) => mazo(c, m, f.colores[i], t));
    for (const a of R.anillos) { c.globalAlpha = 1 - a.t; c.strokeStyle = a.c; c.lineWidth = 3; c.beginPath(); c.arc(a.x, a.y, a.r0 + a.t * 46, 0, 6.2832); c.stroke(); }
    c.globalAlpha = 1;
    for (let i = 0; i < R.np; i++) { c.globalAlpha = Math.min(1, P.v[i] / P.m[i] * 1.4); c.fillStyle = P.c[i]; c.fillRect(P.x[i] - P.s[i] / 2, P.y[i] - P.s[i] / 2, P.s[i], P.s[i]); }
    c.globalAlpha = 1;
    c.restore();
    // marcador y textos (no giran con la vista)
    const mid = H / 2, big = A.acc.texto ? 70 : 58, fam = 'Orbitron, system-ui, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '800 ' + big + 'px system-ui, sans-serif';
    const abajo = f.girar ? 1 : 0; // indice del jugador que aparece abajo en pantalla
    c.fillStyle = f.colores[abajo]; c.globalAlpha = 0.5; c.fillText(String(f.marcador[abajo]), 54, mid + 52);
    c.fillStyle = f.colores[1 - abajo]; c.save();
    if (f.rotarArriba) { c.translate(W - 54, mid - 52); c.rotate(Math.PI); c.fillText(String(f.marcador[1 - abajo]), 0, 0); } else c.fillText(String(f.marcador[1 - abajo]), 54, mid - 52);
    c.restore(); c.globalAlpha = 1;
    if (f.nombres) {
      c.font = '600 ' + (A.acc.texto ? 18 : 14) + 'px ' + fam; c.globalAlpha = 0.75; c.fillStyle = T.id === 'hielo' ? '#0b2a40' : '#fff';
      c.fillText(f.nombres[abajo], W / 2, H - 14);
      if (f.rotarArriba) { c.save(); c.translate(W / 2, 14); c.rotate(Math.PI); c.fillText(f.nombres[1 - abajo], 0, 0); c.restore(); } else c.fillText(f.nombres[1 - abajo], W / 2, 14);
      c.globalAlpha = 1;
    }
    if (f.cuenta) {
      const k = f.cuentaK == null ? 1 : f.cuentaK;
      c.save(); c.translate(W / 2, mid); c.scale(1 + (1 - k) * 0.6, 1 + (1 - k) * 0.6); c.globalAlpha = 0.25 + 0.75 * k;
      c.font = '800 ' + (f.cuenta.length > 6 ? 44 : f.cuenta.length > 2 ? 70 : 120) + 'px ' + fam; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 6; c.strokeText(f.cuenta, 0, 0); c.fillText(f.cuenta, 0, 0);
      if (f.rotarArriba) { c.rotate(Math.PI); c.translate(0, 0); }
      c.restore();
    }
    if (R.flash > 0) { c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = R.flash; c.fillStyle = R.flashC; c.fillRect(0, 0, R.cw, R.ch); c.globalAlpha = 1; }
  };
  return R;
}
