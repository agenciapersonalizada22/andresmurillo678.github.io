/* Fisica del hockey de mesa (sin DOM). UMD: window.HkFisica o require(). Mesa logica 400x800; jugador 0 abajo, jugador 1 arriba. */
(function (G) {
  'use strict';
  var F = {};
  F.W = 400; F.H = 800;
  F.CFG = { goalW: 150, puckR: 16, malletR: 30, post: 7, paso: 1 / 120, vMaxDisco: 1700, rebote: 0.92, golpe: 0.88, friccion: 0.32, malletV: 2600 };

  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  F.rng = rng;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  F.crear = function (o) {
    o = o || {};
    var C = Object.assign({}, F.CFG, o.cfg || {});
    var s = { C: C, t: 0, acc: 0, rnd: rng(o.semilla || 1), pucks: [], mallets: [], obst: [], items: [], marcador: [0, 0], ev: [], espera: 1.2, sacaLado: o.saca == null ? 0 : o.saca, usaItems: !!o.items, proxItem: 6, ultimoGol: -1 };
    for (var i = 0; i < 2; i++) s.mallets.push({ lado: i, x: F.W / 2, y: i ? 90 : F.H - 90, vx: 0, vy: 0, tx: F.W / 2, ty: i ? 90 : F.H - 90, r0: C.malletR, r: C.malletR, vmax: C.malletV, grande: 0, lento: 0 });
    (o.obst || []).forEach(function (b) { s.obst.push(Object.assign({ bx: b.x, by: b.y, ax: 0, ay: 0, per: 4, fase: 0 }, b)); });
    return s;
  };

  F.saque = function (s, lado) {
    var d = (s.rnd() - 0.5) * 120;
    s.pucks = [nuevoDisco(s, F.W / 2 + d, lado === 0 ? F.H / 2 + 110 : F.H / 2 - 110)];
    s.ev.push({ t: 'saque' });
  };
  function nuevoDisco(s, x, y, vx, vy) { return { x: x, y: y, vx: vx || 0, vy: vy || 0, r: s.C.puckR, ultimo: -1, vida: 0, extra: false, giro: 0 }; }

  F.objetivo = function (s, i, x, y) { var m = s.mallets[i]; m.tx = x; m.ty = y; };

  F.moverMallet = function (s, m, dt) {
    var r = m.r, lim = F.H / 2;
    m.r = m.r0 * (m.grande > 0 ? 1.4 : 1);
    var x0 = r, x1 = F.W - r, y0 = m.lado ? r : lim + r + 2, y1 = m.lado ? lim - r - 2 : F.H - r;
    var tx = clamp(m.tx, x0, x1), ty = clamp(m.ty, y0, y1);
    var vm = m.vmax * (m.lento > 0 ? 0.4 : 1), dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy), mx = vm * dt;
    var nx = m.x, ny = m.y;
    if (d <= mx) { nx = tx; ny = ty; } else { nx += dx / d * mx; ny += dy / d * mx; }
    for (var k = 0; k < s.obst.length; k++) { var p = empuje(s.obst[k], nx, ny, m.r); if (p) { nx += p.x; ny += p.y; } }
    nx = clamp(nx, x0, x1); ny = clamp(ny, y0, y1);
    m.vx = (nx - m.x) / dt; m.vy = (ny - m.y) / dt; m.x = nx; m.y = ny;
  };

  // vector para sacar un circulo (x,y,r) de un obstaculo, o null
  function empuje(o, x, y, r) {
    if (o.tipo === 'c') {
      var dx = x - o.x, dy = y - o.y, d = Math.hypot(dx, dy), m = r + o.r;
      if (d >= m) return null;
      if (d < 1e-6) { dx = 0; dy = 1; d = 1; }
      return { x: dx / d * (m - d), y: dy / d * (m - d), nx: dx / d, ny: dy / d };
    }
    var cx = clamp(x, o.x - o.w / 2, o.x + o.w / 2), cy = clamp(y, o.y - o.h / 2, o.y + o.h / 2);
    var ex = x - cx, ey = y - cy, e = Math.hypot(ex, ey);
    if (e >= r) return null;
    if (e < 1e-6) {
      var px = o.w / 2 - Math.abs(x - o.x), py = o.h / 2 - Math.abs(y - o.y);
      if (px < py) { var sx = x < o.x ? -1 : 1; return { x: sx * (px + r), y: 0, nx: sx, ny: 0 }; }
      var sy = y < o.y ? -1 : 1; return { x: 0, y: sy * (py + r), nx: 0, ny: sy };
    }
    return { x: ex / e * (r - e), y: ey / e * (r - e), nx: ex / e, ny: ey / e };
  }

  function rebota(s, p, nx, ny, e, tipo, extra) {
    var vn = p.vx * nx + p.vy * ny;
    if (vn >= 0) return;
    p.vx -= (1 + e) * vn * nx; p.vy -= (1 + e) * vn * ny;
    if (extra) { p.vx += nx * extra; p.vy += ny * extra; }
    s.ev.push({ t: tipo, v: -vn, x: p.x, y: p.y });
  }

  function chocaMallet(s, p, m) {
    var dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy), mr = p.r + m.r;
    if (d >= mr) return;
    if (d < 1e-6) { dx = 0; dy = m.lado ? 1 : -1; d = 1; }
    var nx = dx / d, ny = dy / d;
    p.x = m.x + nx * mr; p.y = m.y + ny * mr;
    var rvx = p.vx - m.vx, rvy = p.vy - m.vy, vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      var j = -(1 + s.C.golpe) * vn;
      p.vx += j * nx; p.vy += j * ny;
      var vs = p.vx * nx + p.vy * ny; if (vs < 60) { p.vx += (60 - vs) * nx; p.vy += (60 - vs) * ny; }
      p.ultimo = m.lado;
      s.ev.push({ t: 'golpe', v: Math.min(2000, j), x: p.x, y: p.y, lado: m.lado, nx: nx, ny: ny });
    }
  }

  function pared(s, p) {
    var W = F.W, H = F.H, C = s.C, r = p.r, gl = W / 2 - C.goalW / 2, gr = W / 2 + C.goalW / 2, e = C.rebote;
    if (p.x < r) { p.x = r; rebota(s, p, 1, 0, e, 'pared'); }
    else if (p.x > W - r) { p.x = W - r; rebota(s, p, -1, 0, e, 'pared'); }
    var enHueco = p.x > gl && p.x < gr;
    if (!enHueco || p.y > r * 2.5 && p.y < H - r * 2.5) {
      if (p.y < r && !enHueco) { p.y = r; rebota(s, p, 0, 1, e, 'pared'); }
      else if (p.y > H - r && !enHueco) { p.y = H - r; rebota(s, p, 0, -1, e, 'pared'); }
    }
    var ps = [[gl, 0], [gr, 0], [gl, H], [gr, H]];
    for (var i = 0; i < 4; i++) {
      var dx = p.x - ps[i][0], dy = p.y - ps[i][1], d = Math.hypot(dx, dy), m = r + C.post;
      if (d < m && d > 1e-6) { p.x = ps[i][0] + dx / d * m; p.y = ps[i][1] + dy / d * m; rebota(s, p, dx / d, dy / d, 0.85, 'poste'); }
    }
  }

  function efectoItem(s, it, lado) {
    s.ev.push({ t: 'item', tipo: it.tipo, x: it.x, y: it.y, lado: lado });
    var m = s.mallets[lado], rv = s.mallets[1 - lado];
    if (it.tipo === 'grande') m.grande = 8;
    else if (it.tipo === 'lento') rv.lento = 5;
    else if (it.tipo === 'multi') {
      for (var k = 0; k < 2; k++) { var a = s.rnd() * 6.283, q = nuevoDisco(s, F.W / 2, F.H / 2, Math.cos(a) * 380, Math.sin(a) * 380); q.extra = true; q.vida = 12; s.pucks.push(q); }
    }
  }

  function gol(s, p, scorer) {
    s.marcador[scorer]++; s.ultimoGol = scorer;
    s.ev.push({ t: 'gol', lado: scorer, x: p.x, y: p.y });
    s.pucks = []; s.items = []; s.espera = 1.7; s.sacaLado = 1 - scorer; s.proxItem = s.t + 6;
    s.mallets.forEach(function (m) { m.grande = 0; m.lento = 0; });
  }

  F.paso = function (s, dt) {
    var C = s.C, i, j, k;
    s.t += dt;
    s.obst.forEach(function (o) {
      if (o.ax || o.ay) { var f = Math.sin((s.t / o.per + o.fase) * 6.2832); o.x = o.bx + o.ax * f; o.y = o.by + o.ay * f; }
    });
    s.mallets.forEach(function (m) { m.grande = Math.max(0, m.grande - dt); m.lento = Math.max(0, m.lento - dt); F.moverMallet(s, m, dt); });
    if (s.espera > 0) { s.espera -= dt; if (s.espera <= 0) F.saque(s, s.sacaLado); return; }
    if (s.usaItems && s.t >= s.proxItem && s.items.length < 1) {
      var tp = ['grande', 'lento', 'multi'];
      s.items.push({ tipo: tp[Math.floor(s.rnd() * 3)], x: 60 + s.rnd() * 280, y: F.H * 0.36 + s.rnd() * F.H * 0.28, r: 20, vida: 14 });
      s.proxItem = s.t + 9 + s.rnd() * 7; s.ev.push({ t: 'itemNuevo' });
    }
    for (i = s.items.length - 1; i >= 0; i--) if ((s.items[i].vida -= dt) <= 0) s.items.splice(i, 1);
    for (i = 0; i < s.pucks.length; i++) {
      var p = s.pucks[i];
      if (p.extra && (p.vida -= dt) <= 0) { s.ev.push({ t: 'fin_extra', x: p.x, y: p.y }); s.pucks.splice(i--, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      var f = Math.exp(-C.friccion * dt); p.vx *= f; p.vy *= f;
      var sp = Math.hypot(p.vx, p.vy);
      if (sp > C.vMaxDisco) { p.vx *= C.vMaxDisco / sp; p.vy *= C.vMaxDisco / sp; }
      p.giro += sp * dt * 0.01;
      for (j = 0; j < 2; j++) chocaMallet(s, p, s.mallets[j]);
      for (k = 0; k < s.obst.length; k++) {
        var o = s.obst[k], e = empuje(o, p.x, p.y, p.r);
        if (e) { p.x += e.x; p.y += e.y; rebota(s, p, e.nx, e.ny, o.tipo === 'c' ? 1.02 : 0.95, 'obst', o.tipo === 'c' ? 90 : 0); }
      }
      pared(s, p);
      for (j = 0; j < 2; j++) chocaMallet(s, p, s.mallets[j]);
      for (k = s.items.length - 1; k >= 0; k--) {
        var it = s.items[k];
        if (p.ultimo >= 0 && Math.hypot(p.x - it.x, p.y - it.y) < p.r + it.r) { s.items.splice(k, 1); efectoItem(s, it, p.ultimo); }
      }
      if (p.y < -p.r * 0.5) { gol(s, p, 0); return; }
      if (p.y > F.H + p.r * 0.5) { gol(s, p, 1); return; }
    }
    for (i = 0; i < s.pucks.length; i++) for (j = i + 1; j < s.pucks.length; j++) {
      var a = s.pucks[i], b = s.pucks[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m2 = a.r + b.r;
      if (d < m2 && d > 1e-6) {
        var nx = dx / d, ny = dy / d, ov = (m2 - d) / 2;
        a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
        var vr = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vr < 0) { a.vx += vr * nx; a.vy += vr * ny; b.vx -= vr * nx; b.vy -= vr * ny; s.ev.push({ t: 'pared', v: -vr, x: a.x, y: a.y }); }
      }
    }
    if (!s.pucks.length && s.espera <= 0) s.espera = 0.3;
  };

  // avanza tiempo real con paso fijo; devuelve pasos ejecutados
  F.avanzar = function (s, dt, alPaso) {
    s.acc = Math.min(s.acc + dt, 0.1); var n = 0;
    while (s.acc >= s.C.paso) { if (alPaso) alPaso(s.C.paso); F.paso(s, s.C.paso); s.acc -= s.C.paso; n++; }
    return n;
  };

  // instantanea compacta para red (tabla de enteros/decimales cortos)
  var q = function (v) { return Math.round(v * 10) / 10; };
  F.instantanea = function (s) {
    return {
      t: q(s.t), m: s.marcador.slice(), e: s.espera > 0 ? 1 : 0,
      p: s.pucks.map(function (p) { return [q(p.x), q(p.y), q(p.vx), q(p.vy), p.extra ? 1 : 0]; }),
      a: s.mallets.map(function (m) { return [q(m.x), q(m.y), q(m.vx), q(m.vy), q(m.grande), q(m.lento)]; }),
      i: s.items.map(function (it) { return [it.tipo, q(it.x), q(it.y), q(it.vida)]; })
    };
  };

  F.espejo = function (x, y) { return { x: F.W - x, y: F.H - y }; };
  F.clamp = clamp;
  if (typeof module !== 'undefined' && module.exports) module.exports = F; else G.HkFisica = F;
})(typeof window !== 'undefined' ? window : globalThis);
