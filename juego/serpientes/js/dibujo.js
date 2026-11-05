/* Dibujo en canvas 2D: fondo, arena, orbes (sprites), cuerpos por trazos redondeados por lotes, cabezas, particulas y minimapa. */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, K = S.Skins, TAU = S.TAU, D = S.Dibujo = {};
  var CALIDADES = {
    baja: { res: 0.7, glow: 0, runs: 0, orbSpr: 0, fondo: 0, part: 40, sombra: 0, nombres: 1 },
    media: { res: 1, glow: 1, runs: 1, orbSpr: 1, fondo: 1, part: 90, sombra: 0, nombres: 1 },
    alta: { res: 1.25, glow: 1, runs: 1, orbSpr: 1, fondo: 2, part: 160, sombra: 0, nombres: 1 },
    ultra: { res: 2, glow: 2, runs: 1, orbSpr: 1, fondo: 2, part: 260, sombra: 1, nombres: 1 }
  };
  D.CALIDADES = CALIDADES;

  var sprites = null;
  function crearSprites() {
    sprites = [];
    for (var c = 0; c < 8; c++) {
      sprites[c] = [];
      for (var t = 0; t < 4; t++) {
        var r = [4, 6, 9, 12][t], n = Math.ceil((r + 9) * 2), cv = G.document.createElement('canvas'); cv.width = cv.height = n;
        var x = cv.getContext('2d'), m = n / 2, g = x.createRadialGradient(m, m, 0, m, m, m);
        var col = K.colorOrbe(c);
        g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.28, col); g.addColorStop(0.5, col.replace('hsl', 'hsla').replace(')', ',.35)')); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.beginPath(); x.arc(m, m, m, 0, TAU); x.fill();
        x.fillStyle = col; x.beginPath(); x.arc(m, m, r * 0.62, 0, TAU); x.fill();
        x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.arc(m - r * 0.2, m - r * 0.2, r * 0.22, 0, TAU); x.fill();
        sprites[c][t] = cv;
      }
    }
  }
  var fondoTile = null;
  var TW = 554.256, TH = 480;
  function crearFondo() {
    var cv = G.document.createElement('canvas'); cv.width = 555; cv.height = TH;
    var x = cv.getContext('2d'), r = 40, w = TW / 8; x.strokeStyle = 'rgba(120,180,255,.07)'; x.lineWidth = 1.5; x.beginPath();
    for (var j = -1; j < 9; j++) for (var i = -1; i < 9; i++) {
      var cx = i * w + (((j % 2) + 2) % 2 ? w / 2 : 0) * 1, cy = j * 60;
      for (var k = 0; k < 6; k++) { var a = Math.PI / 3 * k + Math.PI / 6, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; k ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.closePath();
    }
    x.stroke(); fondoTile = cv;
  }

  function Render(cv, mm) {
    this.cv = cv; this.ctx = cv.getContext('2d', { alpha: false }); this.mm = mm; this.mctx = mm ? mm.getContext('2d') : null;
    this.q = CALIDADES.media; this.ancho = 0; this.alto = 0; this.dpr = 1;
    this.cam = { x: 0, y: 0, z: 1 }; this.zoomObj = 1; this.temblor = 0;
    this.orbOut = { x: new Float32Array(1400), y: new Float32Array(1400), t: new Uint8Array(1400), n: 0 };
    var N = 300; this.part = { x: new Float32Array(N), y: new Float32Array(N), vx: new Float32Array(N), vy: new Float32Array(N), vida: new Float32Array(N), max: new Float32Array(N), h: new Float32Array(N), tam: new Float32Array(N), n: 0 };
    this.op = { daltonismo: 'ninguno', reducir: false, nombres: true, mostrarFps: false };
    if (!sprites) crearSprites(); if (!fondoTile) crearFondo();
    this.tMM = 0;
  }
  D.Render = Render;
  var R = Render.prototype;
  R.calidad = function (nombre) { this.q = CALIDADES[nombre] || CALIDADES.media; this.nombreQ = nombre; this.redim(true); };
  R.redim = function (fuerza) {
    var w = this.cv.clientWidth || 800, h = this.cv.clientHeight || 600, dpr = Math.min(G.devicePixelRatio || 1, 2) * this.q.res;
    dpr = Math.max(0.5, Math.min(dpr, 2.5));
    if (!fuerza && w === this.ancho && h === this.alto && dpr === this.dpr) return;
    this.ancho = w; this.alto = h; this.dpr = dpr; this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
  };
  R.chispa = function (x, y, hue, n, vel) {
    var p = this.part, max = Math.min(this.q.part, p.x.length);
    for (var i = 0; i < n && p.n < max; i++) {
      var k = p.n++, a = Math.random() * TAU, v = (0.3 + Math.random()) * (vel || 120);
      p.x[k] = x; p.y[k] = y; p.vx[k] = Math.cos(a) * v; p.vy[k] = Math.sin(a) * v; p.vida[k] = p.max[k] = 0.5 + Math.random() * 0.6; p.h[k] = hue; p.tam[k] = 2 + Math.random() * 3;
    }
  };
  R.zoomPara = function (r, turbo) { return S.clamp(1 / (1 + (r - 10) * 0.017), 0.52, 1) * (turbo ? 0.96 : 1); };

  /* esc: {foco:{x,y,r,turbo}, serps:[...], orbes(x0,y0,x1,y1,out), R, Rc, zona, yoId, dt} */
  R.dibujar = function (esc, dt, tiempo) {
    this.redim(false);
    var c = this.ctx, W = this.ancho, H = this.alto, q = this.q, f = esc.foco, cam = this.cam;
    var base = Math.min(W, H) / 640, zt = this.zoomPara(f.r, f.turbo) * Math.max(0.55, base);
    cam.z += (zt - cam.z) * Math.min(1, dt * 3);
    var k = Math.min(1, dt * 12); cam.x += (f.x - cam.x) * (esc.snapCam ? 1 : k); cam.y += (f.y - cam.y) * (esc.snapCam ? 1 : k);
    var z = cam.z, ox = 0, oy = 0;
    if (this.temblor > 0 && !this.op.reducir) { this.temblor -= dt; ox = (Math.random() - .5) * this.temblor * 30; oy = (Math.random() - .5) * this.temblor * 30; }
    var tx = W / 2 - cam.x * z + ox, ty = H / 2 - cam.y * z + oy, d = this.dpr;
    c.setTransform(d, 0, 0, d, 0, 0);
    c.fillStyle = '#1b0610'; c.fillRect(0, 0, W, H);
    c.setTransform(d * z, 0, 0, d * z, tx * d, ty * d);
    var x0 = cam.x - W / 2 / z - 40, x1 = cam.x + W / 2 / z + 40, y0 = cam.y - H / 2 / z - 40, y1 = cam.y + H / 2 / z + 40;
    // arena
    var Rr = esc.R, Rc = esc.Rc || Rr;
    c.beginPath(); c.arc(0, 0, Rc, 0, TAU);
    if (q.fondo > 1) { var fg = c.createRadialGradient(0, 0, Rc * 0.1, 0, 0, Rc); fg.addColorStop(0, '#0d1b33'); fg.addColorStop(0.8, '#0a1424'); fg.addColorStop(1, '#101a2e'); c.fillStyle = fg; } else c.fillStyle = '#0b1526';
    c.fill();
    if (q.fondo) {
      var tw = TW, th = TH, gx0 = Math.floor(x0 / tw) * tw, gy0 = Math.floor(y0 / th) * th;
      for (var gy = gy0; gy < y1; gy += th) for (var gx = gx0; gx < x1; gx += tw) c.drawImage(fondoTile, gx, gy, tw, th);
      var rx = Math.max(Math.abs(x0), Math.abs(x1)), ry = Math.max(Math.abs(y0), Math.abs(y1));
      if (Math.hypot(rx, ry) > Rc - 1) { c.beginPath(); c.arc(0, 0, Rc + 2000, 0, TAU); c.arc(0, 0, Rc, 0, TAU, true); c.fillStyle = '#1b0610'; c.fill(); }
    }
    if (Rc < Rr - 1) { c.beginPath(); c.arc(0, 0, Rr, 0, TAU); c.arc(0, 0, Rc, 0, TAU, true); c.fillStyle = 'rgba(120,0,20,.35)'; c.fill(); }
    // zona rey
    if (esc.zona) {
      var zn = esc.zona, pul = 0.5 + 0.5 * Math.sin(tiempo * 2.4);
      c.beginPath(); c.arc(zn.x, zn.y, zn.r, 0, TAU); c.fillStyle = 'rgba(255,210,61,' + (0.07 + 0.05 * pul) + ')'; c.fill();
      c.lineWidth = 8; c.strokeStyle = 'rgba(255,210,61,' + (0.55 + 0.3 * pul) + ')'; c.setLineDash([40, 28]); c.lineDashOffset = -tiempo * 30; c.stroke(); c.setLineDash([]);
    }
    // borde mortal
    var peligro = Math.hypot(f.x, f.y) > Rc - 420;
    c.lineWidth = 26; c.strokeStyle = 'rgba(255,40,70,' + (peligro ? 0.5 + 0.25 * Math.sin(tiempo * 9) : 0.38) + ')';
    c.beginPath(); c.arc(0, 0, Rc + 13, 0, TAU); c.stroke();
    c.lineWidth = 5; c.strokeStyle = '#ff2a55'; c.beginPath(); c.arc(0, 0, Rc, 0, TAU); c.stroke();
    if (q.glow > 0) { c.lineWidth = 70; c.strokeStyle = 'rgba(255,30,60,.08)'; c.beginPath(); c.arc(0, 0, Rc - 35, 0, TAU); c.stroke(); }
    // orbes
    var ob = esc.orbes(x0, y0, x1, y1, this.orbOut), n = ob.n, sp = sprites;
    var tp = tiempo;
    if (q.orbSpr) {
      for (var i = 0; i < n; i++) {
        var ox2 = ob.x[i], oy2 = ob.y[i], t = ob.t[i], ci = ((ox2 * 0.37 + oy2 * 0.61) | 0) & 7, im = sp[ci][t], s2 = im.width * (this.op.reducir ? 1 : 0.92 + 0.12 * Math.sin(tp * 3 + ox2 * 0.05 + oy2 * 0.03));
        c.drawImage(im, ox2 - s2 / 2, oy2 - s2 / 2, s2, s2);
      }
    } else {
      for (var j = 0; j < n; j++) {
        c.fillStyle = K.colorOrbe((((ob.x[j] * 0.37 + ob.y[j] * 0.61) | 0) & 7)); var rr = [3, 4.5, 7, 10][ob.t[j]];
        c.fillRect(ob.x[j] - rr, ob.y[j] - rr, rr * 2, rr * 2);
      }
    }
    // serpientes (las mas pequenas debajo; yo encima)
    var ss = esc.serps, orden = this._orden || (this._orden = []);
    orden.length = 0;
    for (var a = 0; a < ss.length; a++) {
      var s = ss[a]; if (!s.vivo) continue;
      var bx0 = s.x, bx1 = s.x, by0 = s.y, by1 = s.y, st = s.ns > 60 ? 4 : 2;
      for (var m = 0; m < s.ns; m += st) { var sx = s.segs[m * 2], sy = s.segs[m * 2 + 1]; if (sx < bx0) bx0 = sx; if (sx > bx1) bx1 = sx; if (sy < by0) by0 = sy; if (sy > by1) by1 = sy; }
      if (bx1 + s.r < x0 || bx0 - s.r > x1 || by1 + s.r < y0 || by0 - s.r > y1) continue;
      orden.push(s);
    }
    orden.sort(function (p, q2) { return (p.id === esc.yoId ? 1e9 : p.masa) - (q2.id === esc.yoId ? 1e9 : q2.masa); });
    for (var b = 0; b < orden.length; b++) this.serpiente(c, orden[b], tiempo, esc, z);
    // particulas
    var p = this.part;
    for (var u = p.n - 1; u >= 0; u--) {
      p.vida[u] -= dt; if (p.vida[u] <= 0) { var l = --p.n; p.x[u] = p.x[l]; p.y[u] = p.y[l]; p.vx[u] = p.vx[l]; p.vy[u] = p.vy[l]; p.vida[u] = p.vida[l]; p.max[u] = p.max[l]; p.h[u] = p.h[l]; p.tam[u] = p.tam[l]; continue; }
      p.x[u] += p.vx[u] * dt; p.y[u] += p.vy[u] * dt; p.vx[u] *= 0.97; p.vy[u] *= 0.97;
      c.globalAlpha = p.vida[u] / p.max[u]; c.fillStyle = 'hsl(' + p.h[u] + ',100%,65%)'; c.fillRect(p.x[u] - p.tam[u] / 2, p.y[u] - p.tam[u] / 2, p.tam[u], p.tam[u]);
    }
    c.globalAlpha = 1;
    c.setTransform(d, 0, 0, d, 0, 0);
    if (peligro) { // vineta de peligro
      var vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(255,0,40,0)'); vg.addColorStop(1, 'rgba(255,0,40,.28)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    }
    this.minimapa(esc);
  };

  function trazar(c, s) {
    var sg = s.segs, ns = s.ns, st = 1;
    c.beginPath(); c.moveTo(sg[0], sg[1]);
    for (var i = st; i < ns; i += st) c.lineTo(sg[i * 2], sg[i * 2 + 1]);
    if ((ns - 1) % st) c.lineTo(sg[(ns - 1) * 2], sg[(ns - 1) * 2 + 1]);
  }
  function trazo(c, sg, a, b) { c.beginPath(); c.moveTo(sg[a * 2], sg[a * 2 + 1]); for (var i = a + 1; i <= b; i++) c.lineTo(sg[i * 2], sg[i * 2 + 1]); }
  var TEAM_COL = ['#3aa0ff', '#ff4a5a'];
  D.setDalton = function (m) { TEAM_COL[0] = m === 'ninguno' ? '#3aa0ff' : '#2f7bff'; TEAM_COL[1] = m === 'ninguno' ? '#ff4a5a' : '#ffb000'; };

  R.serpiente = function (c, s, t, esc, z) {
    var sk = s.skin || S.Skins.limpiar(null), co = K.colores(sk), r = s.r, q = this.q, ns = s.ns, sg = s.segs, sp = s.sp || S.espaciado(r);
    var pulso = s.turbo ? 1 : 0, parpadeo = s.inmune && ((t * 10) | 0) % 2 === 0;
    if (parpadeo) c.globalAlpha = 0.45;
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (s.equipo >= 0) { c.lineWidth = r * 2 + 8; c.strokeStyle = TEAM_COL[s.equipo]; c.globalAlpha *= 0.55; trazar(c, s); c.stroke(); c.globalAlpha = parpadeo ? 0.45 : 1; }
    if ((sk.g || pulso) && q.glow) {
      c.globalAlpha *= pulso ? 0.28 : 0.16; c.lineWidth = r * 2 + (pulso ? 26 : 16); c.strokeStyle = sk.p === 5 ? co.neon : co.c1; trazar(c, s); c.stroke();
      c.globalAlpha = parpadeo ? 0.45 : 1;
      if (q.glow > 1 && sk.g) { c.shadowColor = co.neon; c.shadowBlur = 18; }
    }
    c.lineWidth = r * 2 + 3; c.strokeStyle = co.borde; trazar(c, s); c.stroke(); c.shadowBlur = 0;
    var p = sk.p, odo = s.odo || 0;
    if (p === 5) { // neon: cuerpo oscuro con contorno brillante
      c.lineWidth = r * 2; c.strokeStyle = co.neon; trazar(c, s); c.stroke();
      c.lineWidth = r * 1.45; c.strokeStyle = co.fondo; trazar(c, s); c.stroke();
      c.lineWidth = r * 0.35; c.strokeStyle = co.c2; c.globalAlpha *= 0.8; trazar(c, s); c.stroke(); c.globalAlpha = parpadeo ? 0.45 : 1;
    } else if ((p === 3 || p === 4) && q.runs) {
      var run = Math.max(2, Math.round(r * 0.9 / sp * 2)), off = p === 3 ? ((-odo / sp) % run + run) % run : 0;
      c.lineWidth = r * 2;
      var a0 = 0, kk = 0;
      while (a0 < ns - 1) {
        var b0 = p === 3 ? Math.min(ns - 1, Math.ceil(a0 + (kk === 0 ? (off === 0 ? run : off) : run))) : Math.min(ns - 1, a0 + 5);
        var u = p === 3 ? Math.floor((a0 + run - off + 0.01) / run) : a0 / Math.max(1, ns - 1);
        c.strokeStyle = p === 3 ? 'hsl(' + ((sk.h1 + u * 34) % 360) + ',' + (sk.v === 2 ? 60 : 90) + '%,' + (sk.v === 2 ? 70 : 56) + '%)' : mezcla(sk, u);
        trazo(c, sg, a0, b0); c.stroke(); a0 = b0; kk++;
      }
    } else {
      c.lineWidth = r * 2; c.strokeStyle = (p === 3 || p === 4) ? co.c1 : co.c1; trazar(c, s); c.stroke();
      if (p === 1 || p === 7) {
        var per = p === 1 ? r * 1.7 : r * 3.4; c.lineCap = 'butt'; c.setLineDash([per * 0.5, per * 0.5]); c.lineDashOffset = ((odo % per) + per) % per;
        c.lineWidth = r * 1.96; c.strokeStyle = co.c2; trazar(c, s); c.stroke(); c.setLineDash([]); c.lineCap = 'round';
      } else if (p === 2) {
        var pd = r * 2.1; c.setLineDash([0.01, pd]); c.lineDashOffset = ((odo % pd) + pd) % pd; c.lineWidth = r * 1.0; c.strokeStyle = co.c2; trazar(c, s); c.stroke(); c.setLineDash([]);
      } else if (p === 6) {
        var ps = r * 0.95; c.lineCap = 'butt'; c.setLineDash([2.4, ps - 2.4]); c.lineDashOffset = ((odo % ps) + ps) % ps; c.lineWidth = r * 1.9; c.strokeStyle = co.borde; c.globalAlpha *= 0.55; trazar(c, s); c.stroke(); c.setLineDash([]); c.lineCap = 'round'; c.globalAlpha = parpadeo ? 0.45 : 1;
      }
    }
    if (p !== 5 && q.runs) { c.lineWidth = r * 0.55; c.strokeStyle = co.luz; c.globalAlpha *= 0.2; trazar(c, s); c.stroke(); c.globalAlpha = parpadeo ? 0.45 : 1; }
    this.cabeza(c, s, sk, co, t);
    if (this.op.nombres && s.nombre && (s.id === esc.yoId || s.masa > 8)) {
      c.font = '600 ' + Math.round(13 / z) + 'px system-ui,sans-serif'; c.textAlign = 'center'; c.fillStyle = s.equipo >= 0 ? TEAM_COL[s.equipo] : 'rgba(255,255,255,.85)';
      c.lineWidth = 3 / z; c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeText(s.nombre, s.x, s.y - r - 12 / z); c.fillText(s.nombre, s.x, s.y - r - 12 / z);
    }
    c.globalAlpha = 1;
  };
  function mezcla(sk, u) {
    var h = sk.h1 + (((sk.h2 - sk.h1 + 540) % 360) - 180) * u;
    return 'hsl(' + ((h + 360) % 360) + ',' + (sk.v === 2 ? 60 : 80) + '%,' + (sk.v === 2 ? 70 : 55) + '%)';
  }
  D.dibujarCabeza = function (c, x, y, ang, r, sk, co, t, turbo) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = co.c1; c.strokeStyle = co.borde; c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, r * 1.06, 0, TAU); c.fill(); c.stroke();
    if (sk.p === 5) { c.fillStyle = co.fondo; c.beginPath(); c.arc(0, 0, r * 0.8, 0, TAU); c.fill(); c.strokeStyle = co.neon; c.stroke(); }
    var o = sk.o, ex = r * 0.5, ey = r * 0.52, er = o === 1 ? r * 0.42 : o === 4 ? 0 : r * 0.3;
    if (o === 4) { // cíclope
      c.fillStyle = '#fff'; c.beginPath(); c.arc(r * 0.45, 0, r * 0.52, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(r * 0.6, 0, r * 0.26, 0, TAU); c.fill();
    } else if (o === 3) { // visor
      c.fillStyle = '#0b0b14'; c.fillRect(r * 0.2, -r * 0.62, r * 0.55, r * 1.24); c.fillStyle = co.neon; c.fillRect(r * 0.5, -r * 0.5, r * 0.18, r * 1.0);
    } else {
      for (var sgn = -1; sgn <= 1; sgn += 2) {
        c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, sgn * ey, er, 0, TAU); c.fill();
        c.fillStyle = '#111'; c.beginPath(); c.arc(ex + er * 0.3, sgn * ey, er * 0.52, 0, TAU); c.fill();
        if (o === 2) { c.strokeStyle = '#111'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(ex - er, sgn * (ey + er * 1.15)); c.lineTo(ex + er * 0.9, sgn * (ey - er * 0.25)); c.stroke(); }
        if (o === 5) { c.fillStyle = co.c1; c.beginPath(); c.arc(ex, sgn * ey, er * 1.05, Math.PI * 1.05, Math.PI * 1.95); c.fill(); c.fillRect(ex - er * 1.05, sgn * ey - er * 0.5, er * 2.1, er * 0.5); }
      }
    }
    var a = sk.a;
    if (a === 1) { c.fillStyle = '#ffd23d'; c.strokeStyle = '#a77d00'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-r * 0.7, -r * 0.7); c.lineTo(-r * 0.7, r * 0.7); c.lineTo(-r * 1.25, r * 0.55); c.lineTo(-r * 1.0, r * 0.2); c.lineTo(-r * 1.4, 0); c.lineTo(-r * 1.0, -r * 0.2); c.lineTo(-r * 1.25, -r * 0.55); c.closePath(); c.fill(); c.stroke(); }
    else if (a === 2) { c.fillStyle = '#5b3bd6'; c.strokeStyle = '#2a1a7a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-r * 0.2, -r * 0.8); c.lineTo(-r * 0.2, r * 0.8); c.lineTo(-r * 2.1, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#ffd23d'; c.beginPath(); c.arc(-r * 0.8, 0, r * 0.18, 0, TAU); c.fill(); }
    else if (a === 3) { c.fillStyle = '#0b0b14'; c.fillRect(r * 0.18, -r * 0.82, r * 0.5, r * 1.64); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(r * 0.34, -r * 0.7, r * 0.08, r * 0.5); }
    else if (a === 4) { c.strokeStyle = co.borde; c.lineWidth = 2; for (var s2 = -1; s2 <= 1; s2 += 2) { c.beginPath(); c.moveTo(r * 0.3, s2 * r * 0.6); c.quadraticCurveTo(r * 1.2, s2 * r * 1.0, r * 1.5, s2 * r * 1.5); c.stroke(); c.fillStyle = co.neon; c.beginPath(); c.arc(r * 1.5, s2 * r * 1.5, r * 0.2, 0, TAU); c.fill(); } }
    else if (a === 5) { c.fillStyle = '#f2ead0'; c.strokeStyle = '#6b6240'; c.lineWidth = 1.2; for (var s3 = -1; s3 <= 1; s3 += 2) { c.beginPath(); c.moveTo(-r * 0.1, s3 * r * 0.7); c.quadraticCurveTo(r * 0.5, s3 * r * 1.4, r * 0.9, s3 * r * 1.5); c.quadraticCurveTo(r * 0.5, s3 * r * 1.0, r * 0.45, s3 * r * 0.55); c.closePath(); c.fill(); c.stroke(); } }
    else if (a === 6) { c.fillStyle = '#ff5fa2'; c.strokeStyle = '#8a1f55'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-r * 0.5, r * 0.7); c.lineTo(-r * 1.1, r * 1.3); c.lineTo(-r * 1.1, r * 0.2); c.closePath(); c.moveTo(-r * 0.5, r * 0.7); c.lineTo(0, r * 1.3); c.lineTo(0, r * 0.2); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.arc(-r * 0.5, r * 0.7, r * 0.17, 0, TAU); c.fill(); }
    else if (a === 7) { c.strokeStyle = '#fff3a0'; c.lineWidth = Math.max(2, r * 0.18); c.beginPath(); c.ellipse(-r * 0.25, 0, r * 0.5, r * 1.2, 0, 0, TAU); c.stroke(); }
    c.restore();
  };
  R.cabeza = function (c, s, sk, co, t) {
    if (s.turbo) { c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.arc(s.x, s.y, s.r * 1.6, 0, TAU); c.fill(); }
    D.dibujarCabeza(c, s.x, s.y, s.ang, s.r, sk, co, t, s.turbo);
    var dal = this.op.daltonismo;
    if (s.equipo >= 0 && dal !== 'ninguno') { c.fillStyle = '#fff'; c.font = '700 ' + Math.round(s.r) + 'px system-ui'; c.textAlign = 'center'; c.fillText(s.equipo === 0 ? '▲' : '■', s.x, s.y - s.r * 1.6); }
  };

  /* minimapa */
  R.minimapa = function (esc) {
    var mc = this.mctx; if (!mc) return;
    var n = this.mm.width, m = n / 2, Rr = esc.R, k = (m - 3) / Rr;
    mc.clearRect(0, 0, n, n);
    mc.beginPath(); mc.arc(m, m, m - 2, 0, TAU); mc.fillStyle = 'rgba(8,16,32,.78)'; mc.fill();
    var rc = (esc.Rc || Rr) * k;
    mc.lineWidth = 2; mc.strokeStyle = '#ff2a55'; mc.beginPath(); mc.arc(m, m, rc, 0, TAU); mc.stroke();
    if (esc.zona) { mc.fillStyle = 'rgba(255,210,61,.35)'; mc.beginPath(); mc.arc(m + esc.zona.x * k, m + esc.zona.y * k, esc.zona.r * k, 0, TAU); mc.fill(); }
    var pts = esc.puntos;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], yo = p.id === esc.yoId; mc.fillStyle = yo ? '#fff' : p.equipo >= 0 ? TEAM_COL[p.equipo] : 'rgba(255,170,90,.9)';
      var r = yo ? 3.2 : Math.max(1.4, Math.min(3, p.r / 9)); mc.beginPath(); mc.arc(m + p.x * k, m + p.y * k, r, 0, TAU); mc.fill();
    }
    var f = esc.foco, vw = this.ancho / this.cam.z * k, vh = this.alto / this.cam.z * k;
    mc.strokeStyle = 'rgba(255,255,255,.35)'; mc.lineWidth = 1; mc.strokeRect(m + this.cam.x * k - vw / 2, m + this.cam.y * k - vh / 2, vw, vh);
    mc.strokeStyle = 'rgba(120,180,255,.5)'; mc.beginPath(); mc.arc(m, m, m - 2, 0, TAU); mc.stroke();
  };

  /* vista previa de skin (editor / menu) */
  D.previa = function (cv, skin, tiempo) {
    var c = cv.getContext('2d'), w = cv.width, h = cv.height, sk = K.limpiar(skin), co = K.colores(sk), n = 26, r = h * 0.17, segs = new Float32Array(n * 2), sp = r * 0.8;
    c.clearRect(0, 0, w, h);
    for (var i = 0; i < n; i++) { var x = w * 0.84 - i * sp * 1.3, y = h / 2 + Math.sin(i * 0.5 - tiempo * 2) * h * 0.2; segs[i * 2] = x; segs[i * 2 + 1] = y; }
    var s = { skin: sk, segs: segs, ns: n, r: r, sp: sp, x: segs[0], y: segs[1], ang: Math.atan2(segs[1] - segs[3], segs[0] - segs[2]), turbo: false, odo: tiempo * 60, id: 1, nombre: '', equipo: -1, masa: 50 };
    var fake = { cv: cv, ctx: c, q: CALIDADES.alta, op: { daltonismo: 'ninguno', nombres: false }, cabeza: R.cabeza };
    c.save(); R.serpiente.call(fake, c, s, tiempo, { yoId: 1 }, 1); c.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
