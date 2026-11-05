/* Celulas: IA de los bots. Huir de mayores, cazar menores, evitar virus, dividirse para atacar. */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {}, K = C.K;
  var _q = { x: 0, y: 0 };
  C.pensarBot = function (w, j) {
    var D = w.difp, cel = j.cel, big = null, i, k, n, o, d, dx, dy;
    for (i = 0; i < cel.length; i++) if (cel[i].vivo && (!big || cel[i].m > big.m)) big = cel[i];
    if (!big) return;
    var cx = j.cx, cy = j.cy, myM = big.m, myR = big.r, tam = w.tam;
    var vis = (380 + myR * 3.4) * D.vision, fx = 0, fy = 0, amenaza = 0, mejorP = null, mejorS = 0, est = j.iaEst;
    n = w.hCel.consultar(cx, cy, vis, w.bufC);
    for (k = 0; k < n; k++) {
      o = w.cells[w.bufC[k]];
      if (!o.vivo || o.jid === j.id || (j.equipo >= 0 && o.j.equipo === j.equipo)) continue;
      dx = o.x - cx; dy = o.y - cy; d = Math.sqrt(dx * dx + dy * dy) + 1e-3;
      if (d > vis + o.r) continue;
      if (o.m >= myM * 0.8 * D.margen && o.m * 0.8 < o.m) {
        // posible amenaza: si me puede comer (>=1.25x) o casi
        if (o.m >= myM * 1.25 || o.m >= myM * 1.1) {
          var alcance = o.r + myR + (o.m > 70 ? 140 + o.r * 0.9 : 40);
          if (d < alcance + vis * 0.35) {
            var f = Math.min(3, (o.m / myM)) * 700 / Math.max(40, d - o.r - myR + 70);
            fx -= dx / d * f; fy -= dy / d * f; amenaza += f;
          }
        }
      } else if (o.m * 1.25 <= myM && o.prot <= 0) {
        var s = (o.m + 10) / (d + 90);
        if (s > mejorS) { mejorS = s; mejorP = o; }
      } else if (cel.length > 1 && o.m * 1.25 <= myM * 2) {
        // presa solo con division
        var s2 = (o.m + 10) / (d + 160) * 0.7;
        if (s2 > mejorS && d < myR * 4) { mejorS = s2; mejorP = o; }
      }
    }
    // virus
    if (myM >= 125) {
      n = w.hVir.consultar(cx, cy, myR + 220, w.bufV);
      for (k = 0; k < n; k++) {
        o = w.virus[w.bufV[k]]; if (!o.vivo) continue;
        dx = o.x - big.x; dy = o.y - big.y; d = Math.sqrt(dx * dx + dy * dy) + 1e-3;
        if (d < myR + 180 && myM < 2400) { var fv = 520 / Math.max(20, d - myR - 40); fx -= dx / d * fv; fy -= dy / d * fv; amenaza += fv * 0.4; }
      }
    }
    // bordes y zona
    var mx = 260;
    if (cx < mx) fx += (mx - cx) / mx * 3; else if (cx > tam - mx) fx -= (cx - (tam - mx)) / mx * 3;
    if (cy < mx) fy += (mx - cy) / mx * 3; else if (cy > tam - mx) fy -= (cy - (tam - mx)) / mx * 3;
    var enZonaMal = false;
    if (w.zonaActiva) {
      dx = cx - tam / 2; dy = cy - tam / 2; d = Math.sqrt(dx * dx + dy * dy);
      if (d > w.zona * 0.8 - myR) { enZonaMal = true; fx -= dx / (d + 1) * 6; fy -= dy / (d + 1) * 6; }
    }
    var gx = 0, gy = 0, tienePres = false;
    if (amenaza > 1.1) { gx = fx; gy = fy; }
    else if (mejorP && mejorS > 0.004) {
      o = mejorP; tienePres = true;
      var lead = D.predice * 0.35;
      var tx = o.x + (o.x - o.px) * 60 * lead, ty = o.y + (o.y - o.py) * 60 * lead;
      gx = tx - cx + fx * 60; gy = ty - cy + fy * 60;
      var dd = Math.hypot(o.x - big.x, o.y - big.y);
      if (j.cel.length < 6 && myM / 2 >= o.m * 1.25 && o.m > 35 && dd < 150 + myR * 1.6 && dd > myR * 0.6 && w.rng.next() < D.dividir * 0.5 && w.t - (j.tDiv || -9) > 2.5) {
        j.ax = gx; j.ay = gy; w.dividir(j);
      }
    } else {
      // comida mas cercana (o mas densa)
      var best = -1, bd = 1e12, r2 = Math.min(vis, 700);
      n = w.hComida.consultar(big.x - r2, big.y - r2, big.x + r2, big.y + r2, w.bufF);
      for (k = 0; k < n; k++) {
        var sl = w.bufF[k]; if (!w.fvivo[sl]) continue;
        dx = w.fx[sl] - big.x; dy = w.fy[sl] - big.y; d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = sl; }
      }
      if (best >= 0) { gx = w.fx[best] - cx; gy = w.fy[best] - cy; est.t = 0; }
      else { // vagar
        est.t -= w.difp.reac; if (est.t <= 0) { est.ang = w.rng.next() * 6.283; est.t = 2 + w.rng.next() * 3; }
        gx = Math.cos(est.ang) * 300; gy = Math.sin(est.ang) * 300;
      }
      gx += fx * 80; gy += fy * 80;
    }
    if (enZonaMal && !tienePres) { gx = tam / 2 - cx; gy = tam / 2 - cy; }
    d = Math.sqrt(gx * gx + gy * gy);
    if (!(d > 1e-6) || d !== d) { gx = 1; gy = 0; d = 1; }
    est.ruido = (est.ruido || 0) * 0.7 + (w.rng.next() - 0.5) * D.ruido * 0.6;
    var a = Math.atan2(gy, gx) + est.ruido, dist = tienePres ? Math.min(d, 400) : 350;
    j.ax = Math.cos(a) * dist; j.ay = Math.sin(a) * dist;
    // huir con division si me alcanzan y soy grande y no hay salida: expulsar para impulsarse es poco util; se omite
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
