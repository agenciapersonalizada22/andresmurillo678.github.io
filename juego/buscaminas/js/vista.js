/* Vista canvas 2D: camara (zoom/arrastre), atlas de casillas, animaciones de apertura/explosion y particulas. */
(function (G) {
  'use strict';
  var BM = G.BM = G.BM || {};
  var V = { cursor: -1, cursorVisible: false, hover: -1, presion: -1, riesgo: null, remotos: {}, pista: null, fps: 0 };
  var auto = true, cv, g, T = null, TT, cssW = 0, cssH = 0, dpr = 1, cam = { cx: 0, cy: 0, z: 24 }, ts = 24, sucio = true, animHasta = 0;
  var animT, popT, revT, atl = null, atlClave = '', tema = 'neon', dalt = 'ninguno', brillo = true, particulasNivel = 2, cascada = true, reducir = false;
  var parts = [], shock = null, flash = 0, flashCol = '255,255,255', sacudeHasta = 0, sacudeAmp = 0, ahoraUlt = 0;
  var MAXP = [0, 90, 220, 520];

  V.iniciar = function (canvas) {
    cv = canvas; g = cv.getContext('2d'); TT = BM.temas.T;
    for (var i = 0; i < 520; i++) parts.push({ v: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, max: 1, s: 0.2, c: '#fff', gr: 0, pant: false });
  };
  V.opciones = function (o) {
    if (o.tema !== undefined) tema = o.tema; if (o.dalt !== undefined) dalt = o.dalt; if (o.brillo !== undefined) brillo = o.brillo;
    if (o.particulas !== undefined) particulasNivel = o.particulas; if (o.cascada !== undefined) cascada = o.cascada; if (o.reducir !== undefined) reducir = o.reducir;
    if (o.dpr !== undefined) { dpr = o.dpr; V.redim(); }
    atlClave = ''; sucio = true;
  };
  V.redim = function (w, h) {
    if (w) { cssW = w; cssH = h; }
    if (!cv || !cssW) return;
    cv.width = Math.max(1, Math.round(cssW * dpr)); cv.height = Math.max(1, Math.round(cssH * dpr));
    cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
    if (T) { if (auto) V.ajustar(); else { V.zoomA(cam.z); limitar(); } }
    sucio = true;
  };
  V.marcar = function () { sucio = true; };

  V.poner = function (tab) {
    T = tab; animT = new Float64Array(T.n); popT = new Float64Array(T.n); revT = new Float64Array(T.n);
    V.cursor = Math.floor(T.h / 2) * T.w + Math.floor(T.w / 2); V.hover = -1; V.pista = null; V.presion = -1; V.riesgo = null;
    parts.forEach(function (p) { p.v = 0; }); shock = null; flash = 0; sacudeHasta = 0;
    V.ajustar(); sucio = true;
  };

  function zMin() { return Math.max(6 / dpr, Math.min(fitZ() * 0.95, 20)); }
  function fitZ() { var z = Math.max(4, Math.min((cssW - 8) / T.w, (cssH - 8) / T.h)); return Math.max(4, Math.floor(z * dpr) / dpr); }
  V.ajustar = function () { if (!T) return; auto = true; V.zoomA(fitZ()); cam.cx = T.w / 2; cam.cy = T.h / 2; limitar(); sucio = true; };
  V.zoomA = function (z) { z = Math.max(zMin(), Math.min(96, z)); ts = Math.max(5, Math.round(z * dpr)); cam.z = ts / dpr; sucio = true; };
  V.zoom = function (factor, ax, ay) {
    if (!T) return;
    auto = false;
    if (ax === undefined) { ax = cssW / 2; ay = cssH / 2; }
    var ant = ts, wx = cam.cx + (ax * dpr - cv.width / 2) / ts, wy = cam.cy + (ay * dpr - cv.height / 2) / ts;
    V.zoomA(cam.z * factor);
    if (ts === ant && factor !== 1) { var zz = (ant + (factor > 1 ? 1 : -1)) / dpr; V.zoomA(zz); }
    cam.cx = wx - (ax * dpr - cv.width / 2) / ts; cam.cy = wy - (ay * dpr - cv.height / 2) / ts; limitar();
  };
  V.mover = function (dx, dy) { auto = false; cam.cx -= dx * dpr / ts; cam.cy -= dy * dpr / ts; limitar(); sucio = true; };
  function limitar() {
    if (!T) return;
    var vw = cv.width / ts, vh = cv.height / ts, pad = 1.5;
    if (T.w + pad * 2 <= vw) cam.cx = T.w / 2; else cam.cx = Math.max(vw / 2 - pad, Math.min(T.w - vw / 2 + pad, cam.cx));
    if (T.h + pad * 2 <= vh) cam.cy = T.h / 2; else cam.cy = Math.max(vh / 2 - pad, Math.min(T.h - vh / 2 + pad, cam.cy));
  }
  V.celdaEn = function (x, y) {
    if (!T) return -1;
    var fx = Math.floor(cam.cx + (x * dpr - cv.width / 2) / ts), fy = Math.floor(cam.cy + (y * dpr - cv.height / 2) / ts);
    return fx < 0 || fy < 0 || fx >= T.w || fy >= T.h ? -1 : fy * T.w + fx;
  };
  V.posCelda = function (i) { var r = cv.getBoundingClientRect(); return { x: r.left + ((cam.cx * -1 + (i % T.w) + 0.5) * ts + cv.width / 2) / dpr, y: r.top + ((-cam.cy + Math.floor(i / T.w) + 0.5) * ts + cv.height / 2) / dpr }; };
  V.centrar = function (i) { cam.cx = (i % T.w) + 0.5; cam.cy = Math.floor(i / T.w) + 0.5; limitar(); sucio = true; };
  V.seguir = function (i) {
    if (!T || i < 0) return;
    var x = (i % T.w) + 0.5, y = Math.floor(i / T.w) + 0.5, vw = cv.width / ts, vh = cv.height / ts, m = 2.2;
    if (x < cam.cx - vw / 2 + m) cam.cx = x - m + vw / 2; else if (x > cam.cx + vw / 2 - m) cam.cx = x + m - vw / 2;
    if (y < cam.cy - vh / 2 + m) cam.cy = y - m + vh / 2; else if (y > cam.cy + vh / 2 - m) cam.cy = y + m - vh / 2;
    limitar(); sucio = true;
  };
  V.zoomActual = function () { return { z: cam.z, min: zMin(), ajuste: fitZ() }; };

  /* ---------- efectos ---------- */
  function lanzar(x, y, n, col, vel, vida, tam, grav, pant) {
    var cap = MAXP[particulasNivel] || 0;
    if (!cap || reducir) return;
    for (var i = 0, usados = 0; i < parts.length && usados < n; i++) {
      var p = parts[i]; if (p.v || i >= cap) continue;
      var a = Math.random() * 6.283, s = vel * (0.3 + Math.random() * 0.8);
      p.v = 1; p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - (grav < 0 ? 0 : vel * 0.2); p.t = 0; p.max = vida * (0.6 + Math.random() * 0.6); p.s = tam * (0.6 + Math.random() * 0.7);
      p.c = Array.isArray(col) ? col[(Math.random() * col.length) | 0] : col; p.gr = grav; p.pant = !!pant; usados++;
    }
    sucio = true;
  }
  var C_EXP = ['#ff5a1f', '#ffb42e', '#fff1a8', '#ff2d2d', '#444'];
  V.abrirAnim = function (R, ahora) {
    if (!T || !R.abiertas.length) return;
    var d = reducir || !cascada ? 0 : Math.max(5, Math.min(24, 900 / (Math.max.apply(null, R.prof) + 1)));
    for (var k = 0; k < R.abiertas.length; k++) {
      var c = R.abiertas[k];
      animT[c] = d ? ahora + R.prof[k] * d : 0;
      if (d && particulasNivel >= 2 && k % 5 === 0 && k < 160) lanzar((c % T.w) + 0.5, Math.floor(c / T.w) + 0.5, 1, 'rgba(255,255,255,0.7)', 1.2, 450, 0.09, 1, false);
    }
    animHasta = Math.max(animHasta, ahora + (d ? (Math.max.apply(null, R.prof) * d + 260) : 0)); sucio = true;
  };
  V.banderaAnim = function (i, ahora) { if (reducir) return; popT[i] = ahora; animHasta = Math.max(animHasta, ahora + 260); sucio = true; };
  V.explosion = function (i, ahora, fuerte) {
    var x = (i % T.w) + 0.5, y = Math.floor(i / T.w) + 0.5;
    lanzar(x, y, fuerte ? 90 : 36, C_EXP, 7, 800, 0.16, 6, false);
    if (!reducir) { shock = { x: x, y: y, t0: ahora }; flash = 0.55; flashCol = '255,120,60'; sacudeHasta = ahora + 450; sacudeAmp = fuerte ? 9 : 5; }
    animHasta = Math.max(animHasta, ahora + 900); sucio = true;
  };
  V.revelarMinas = function (ahora, desde) {
    var xs = desde % T.w, ys = Math.floor(desde / T.w), lst = [];
    for (var i = 0; i < T.n; i++) if (T.mina[i] && T.est[i] === 0) lst.push([Math.hypot(i % T.w - xs, Math.floor(i / T.w) - ys), i]);
    lst.sort(function (a, b) { return a[0] - b[0]; });
    var paso = reducir ? 0 : Math.min(60, 1100 / (lst.length || 1));
    lst.forEach(function (e, k) {
      revT[e[1]] = ahora + 250 + k * paso;
      if (particulasNivel && k < 40 && !reducir) setTimeout(function () { if (T && T.estado === 'perdida') lanzar((e[1] % T.w) + 0.5, Math.floor(e[1] / T.w) + 0.5, 8, C_EXP, 4, 500, 0.12, 5, false); }, 250 + k * paso);
    });
    animHasta = Math.max(animHasta, ahora + 400 + lst.length * paso); sucio = true;
  };
  V.victoria = function (ahora) {
    if (reducir) { sucio = true; return; }
    var cols = ['#3df5ff', '#ff4fd8', '#ffd23d', '#6dff6d', '#ff6b4a', '#ffffff'], n = particulasNivel ? [0, 30, 70, 150][particulasNivel] : 0;
    for (var k = 0; k < n; k++) lanzar(Math.random() * 1, Math.random() * 0.2, 1, cols, 0.6, 2600, 0.45, -1, true);
    for (var q = 0; q < parts.length; q++) if (parts[q].v && parts[q].pant) { parts[q].x = Math.random(); parts[q].y = -Math.random() * 0.2; parts[q].vx = (Math.random() - 0.5) * 0.25; parts[q].vy = 0.1 + Math.random() * 0.25; parts[q].gr = -2; }
    flash = 0.25; flashCol = '120,255,200'; animHasta = Math.max(animHasta, ahora + 2800); sucio = true;
  };
  V.pistaOn = function (idx, tipo, ahora) { V.pista = { i: idx, tipo: tipo, hasta: ahora + 4500 }; animHasta = Math.max(animHasta, ahora + 4500); sucio = true; };
  V.limpiarAnim = function () { if (animT) { animT.fill(0); revT.fill(0); } shock = null; flash = 0; sucio = true; };

  /* ---------- dibujo ---------- */
  function ease(p) { var c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }

  V.dibujar = function (ahora, dt) {
    ahoraUlt = ahora;
    if (!g) return false;
    var animando = ahora < animHasta || flash > 0.01 || shock || hayParticulas();
    if (!sucio && !animando && !(V.pista) ) return false;
    sucio = false;
    var W = cv.width, H = cv.height, th = BM.temas.LISTA[tema] || BM.temas.LISTA.neon;
    var clave = tema + '|' + ts + '|' + dalt + '|' + brillo;
    if (clave !== atlClave) { atl = BM.temas.atlas(tema, ts, dalt, brillo); atlClave = clave; }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = th.bg; g.fillRect(0, 0, W, H);
    if (!T) return false;
    var ox = 0, oy = 0;
    if (ahora < sacudeHasta) { var k = (sacudeHasta - ahora) / 450 * sacudeAmp * dpr; ox = (Math.random() - 0.5) * k; oy = (Math.random() - 0.5) * k; }
    var px0 = Math.round(W / 2 - cam.cx * ts + ox), py0 = Math.round(H / 2 - cam.cy * ts + oy);
    var x0 = Math.max(0, Math.floor(-px0 / ts)), y0 = Math.max(0, Math.floor(-py0 / ts));
    var x1 = Math.min(T.w - 1, Math.floor((W - px0) / ts)), y1 = Math.min(T.h - 1, Math.floor((H - py0) / ts));
    if (th.estilo === 'neon' && brillo) { g.shadowColor = th.acento; g.shadowBlur = 18 * dpr; g.fillStyle = th.abre; g.fillRect(px0, py0, T.w * ts, T.h * ts); g.shadowBlur = 0; }
    else { g.fillStyle = th.abre; g.fillRect(px0 - 2, py0 - 2, T.w * ts + 4, T.h * ts + 4); }
    var perd = T.estado === 'perdida', y, x, i, t;
    var pr = V.presion >= 0 ? vecinosPresion() : null;
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
      i = y * T.w + x; t = tile(i, ahora, perd);
      if (pr && pr[i] && T.est[i] === 0) t = TT.VACIA;
      else if (t === TT.CERR && i === V.hover && !V.cursorVisible && T.estado === 'jugando') t = TT.HOV;
      var dx = px0 + x * ts, dy = py0 + y * ts, a = animT[i], pp = popT[i];
      if (T.est[i] === 1 && a && ahora - a < 240 && ahora >= a) {
        var p = (ahora - a) / 240; g.drawImage(atl, TT.CERR * ts, 0, ts, ts, dx, dy, ts, ts);
        var s = ts * (0.75 + 0.25 * ease(p)), o = (ts - s) / 2; g.globalAlpha = Math.min(1, p * 2.2);
        g.drawImage(atl, t * ts, 0, ts, ts, dx + o, dy + o, s, s); g.globalAlpha = 1;
      } else if (pp && ahora - pp < 240 && (T.est[i] === 2)) {
        var q = (ahora - pp) / 240, s2 = ts * (1 + 0.3 * Math.sin(q * 3.14159)), o2 = (ts - s2) / 2;
        g.drawImage(atl, t * ts, 0, ts, ts, dx + o2, dy + o2, s2, s2);
      } else if (T.est[i] === 4 && !reducir && animT[i] === 0 && revT[i] === 0 && false) { /* reservado */ }
      else g.drawImage(atl, t * ts, 0, ts, ts, dx, dy, ts, ts);
    }
    if (V.riesgo && T.estado === 'jugando') {
      for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
        i = y * T.w + x; var r = V.riesgo[i];
        if (r > 0 && (T.est[i] === 0 || T.est[i] === 3)) { g.fillStyle = 'rgba(255,50,50,' + (0.12 + 0.5 * r).toFixed(2) + ')'; g.fillRect(px0 + x * ts, py0 + y * ts, ts, ts); }
      }
    }
    // pista
    if (V.pista) {
      if (ahora > V.pista.hasta) V.pista = null;
      else {
        var hp = V.pista, hx = px0 + (hp.i % T.w) * ts, hy = py0 + Math.floor(hp.i / T.w) * ts, pu = 0.5 + 0.5 * Math.sin(ahora / 150);
        g.lineWidth = Math.max(2, ts * 0.12); g.strokeStyle = hp.tipo === 'segura' ? 'rgba(80,255,140,' + (0.5 + 0.5 * pu) + ')' : hp.tipo === 'mina' ? 'rgba(255,80,80,' + (0.5 + 0.5 * pu) + ')' : 'rgba(255,210,60,' + (0.5 + 0.5 * pu) + ')';
        g.strokeRect(hx + 1, hy + 1, ts - 2, ts - 2);
      }
    }
    // cursores remotos
    for (var id in V.remotos) {
      var rc = V.remotos[id]; if (rc.i < 0 || rc.i >= T.n) continue;
      var cx = px0 + (rc.i % T.w) * ts, cy = py0 + Math.floor(rc.i / T.w) * ts;
      g.lineWidth = Math.max(2, ts * 0.1); g.strokeStyle = rc.color; g.strokeRect(cx + 1, cy + 1, ts - 2, ts - 2);
      if (ts >= 14) { g.font = '700 ' + Math.max(9, ts * 0.38) + 'px system-ui,sans-serif'; g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillStyle = rc.color; g.fillText(rc.nombre || '', cx + 2, cy - 1); }
    }
    // cursor de teclado / mando
    if (V.cursorVisible && V.cursor >= 0 && T.estado === 'jugando') {
      var kx = px0 + (V.cursor % T.w) * ts, ky = py0 + Math.floor(V.cursor / T.w) * ts;
      g.lineWidth = Math.max(2, ts * 0.1); g.strokeStyle = th.acento; g.shadowColor = th.acento; g.shadowBlur = brillo ? 8 * dpr : 0;
      g.strokeRect(kx + 1, ky + 1, ts - 2, ts - 2); g.shadowBlur = 0;
    }
    // particulas
    if (hayParticulas()) {
      var sd = Math.min(0.05, (dt || 16) / 1000);
      for (var j = 0; j < parts.length; j++) {
        var pa = parts[j]; if (!pa.v) continue;
        pa.t += sd * 1000; if (pa.t >= pa.max) { pa.v = 0; continue; }
        pa.vy += (pa.gr < 0 ? -pa.gr * 0.4 : pa.gr) * sd; pa.x += pa.vx * sd; pa.y += pa.vy * sd;
        var al = 1 - pa.t / pa.max, sx, sy;
        if (pa.pant) { sx = pa.x * W; sy = pa.y * H; } else { sx = px0 + pa.x * ts; sy = py0 + pa.y * ts; }
        g.globalAlpha = al; g.fillStyle = pa.c; var sz = Math.max(2, (pa.pant ? pa.s * 0.03 * H : pa.s * ts));
        g.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
      }
      g.globalAlpha = 1;
    }
    if (shock) {
      var sp = Math.max(0, (ahora - shock.t0) / 650);
      if (sp >= 1) shock = null;
      else { g.strokeStyle = 'rgba(255,200,120,' + (1 - sp) * 0.8 + ')'; g.lineWidth = Math.max(2, ts * 0.3 * (1 - sp)); g.beginPath(); g.arc(px0 + shock.x * ts, py0 + shock.y * ts, sp * ts * 7, 0, 6.283); g.stroke(); }
    }
    if (flash > 0.01) { g.fillStyle = 'rgba(' + flashCol + ',' + flash + ')'; g.fillRect(0, 0, W, H); flash *= Math.pow(0.012, (dt || 16) / 1000); }
    return true;
  };
  function hayParticulas() { for (var i = 0; i < parts.length; i++) if (parts[i].v) return true; return false; }
  function vecinosPresion() {
    var o = {}, i = V.presion; o[i] = 1;
    if (T.est[i] === 1) for (var k = 0; k < T.nv[i]; k++) o[T.vec[i * 8 + k]] = 1;
    return o;
  }
  function tile(i, ahora, perd) {
    var e = T.est[i];
    if (e === 1) { if (animT[i] > ahora) return TT.CERR; return T.num[i] ? TT.N1 + T.num[i] - 1 : TT.VACIA; }
    if (e === 4) return TT.EXPL;
    if (e === 2) return perd && !T.mina[i] ? TT.ERR : TT.BAND;
    if (e === 3) return TT.DUDA;
    if (perd && T.mina[i] && revT[i] && revT[i] <= ahora) return TT.MINA;
    return TT.CERR;
  }

  V.tamano = function () { return { w: cssW, h: cssH }; };
  V.infoCamara = function () { return { ts: ts, dpr: dpr }; };
  BM.vista = V;
  if (typeof module !== 'undefined' && module.exports) module.exports = BM;
})(typeof window !== 'undefined' ? window : globalThis);
