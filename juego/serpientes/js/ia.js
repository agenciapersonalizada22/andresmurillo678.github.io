/* IA de bots: comida, caza (intercepcion / encierro en circulos), evitacion de bordes y cuerpos. */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, TAU = S.TAU, IA = S.IA = {};
  var CAND = [0, 0.3, -0.3, 0.6, -0.6, 0.95, -0.95, 1.3, -1.3, 1.75, -1.75, 2.3, -2.3];
  var W0, S0, mejorV, mejorI, mejorD, bx, by, bv;

  function hayCuerpo(W, x, y, rad, s) {
    var hit = 0, g = W.seg;
    g.cerca(x, y, rad + 28, function (i) {
      var oid = W.so[i];
      if (oid === s.id) { if (W.sk[i] < 10) return false; }
      else if (s.equipo >= 0) { var o = W.porId[oid]; if (o && o.equipo === s.equipo) return false; }
      var dx = W.sx[i] - x, dy = W.sy[i] - y, l = rad + W.sr[i];
      if (dx * dx + dy * dy < l * l) { hit = W.sk[i] === 0 ? 2 : 1; return true; }
      return false;
    });
    return hit;
  }
  IA.hayCuerpo = hayCuerpo;

  function mejorOrbe(W, s, rad) {
    var o = W.orbes; mejorV = 0; bx = by = 0;
    var sx = s.x, sy = s.y, ca = Math.cos(s.ang), sa = Math.sin(s.ang);
    o.rej.cerca(sx, sy, rad, function (i) {
      var dx = o.x[i] - sx, dy = o.y[i] - sy, d = Math.sqrt(dx * dx + dy * dy);
      if (d > rad || d < 1) return false;
      var cos = (dx * ca + dy * sa) / d; if (cos < -0.2 && d > 90) return false; // evitar giros hacia atras
      var sc = (o.v[i] + 0.3) / (d + 60) * (0.7 + 0.5 * cos);
      if (sc > mejorV) { mejorV = sc; bx = o.x[i]; by = o.y[i]; }
      return false;
    });
    return mejorV > 0;
  }

  IA.decidir = function (W, s) {
    var D = W.dif, ia = s.ia, rnd = W.rnd, Rc = W.Rc;
    var dc = Math.hypot(s.x, s.y), meta = s.ang, usaMeta = false, turbo = false;
    var vision = D.vision * (1 + (s.r - 10) * 0.012);
    // 1. objetivo
    var presa = null, amenaza = null, pd = 1e9, ad = 1e9, vivas = W.vivas;
    for (var i = 0; i < vivas.length; i++) {
      var o = vivas[i]; if (o === s) continue;
      if (s.equipo >= 0 && o.equipo === s.equipo) continue;
      var dx = o.x - s.x, dy = o.y - s.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > vision) continue;
      if (o.inmune <= 0 && s.masa > o.masa * 1.25 && d < pd) { pd = d; presa = o; }
      else if (o.masa > s.masa * 0.9 && d < ad) { ad = d; amenaza = o; }
    }
    if (presa && rnd() < D.agr + 0.15) {
      var ps = presa, dxp = ps.x - s.x, dyp = ps.y - s.y;
      var largoMio = s.ns * s.sp, puedeCirc = D.circulo && s.masa > ps.masa * 1.5 && largoMio > 420 && pd < 520;
      if (puedeCirc) {
        if (!ia.rc || ia.obj !== ps.id) { ia.rc = Math.max(pd * 0.9, 150); ia.obj = ps.id; }
        ia.rc = Math.max(110 + ps.r * 2, ia.rc - 10);
        var a0 = Math.atan2(s.y - ps.y, s.x - ps.x) + ia.orb * 0.8;
        bx = ps.x + Math.cos(ps.ang) * 60 + Math.cos(a0) * ia.rc; by = ps.y + Math.sin(ps.ang) * 60 + Math.sin(a0) * ia.rc;
        turbo = pd > ia.rc * 1.6 && s.masa > 30 && rnd() < D.turbo;
      } else {
        var lead = S.clamp(pd * 0.55, 30, 280);
        bx = ps.x + Math.cos(ps.ang) * lead; by = ps.y + Math.sin(ps.ang) * lead;
        turbo = pd < 380 && s.masa > 25 && rnd() < D.turbo;
        ia.rc = 0;
      }
      meta = Math.atan2(by - s.y, bx - s.x); usaMeta = true;
    } else {
      ia.rc = 0;
      if (mejorOrbe(W, s, vision * 0.8)) { meta = Math.atan2(by - s.y, bx - s.x); usaMeta = true; }
      else if (W.modo.id === 'rey' && W.zona) { meta = Math.atan2(W.zona.y - s.y, W.zona.x - s.x); usaMeta = true; }
      else {
        ia.nt -= 1;
        if (ia.nt <= 0) { ia.nt = 6 + rnd() * 10; ia.noise = (rnd() - .5) * 1.4; }
        meta = Math.atan2(-s.y, -s.x) * 0.0 + s.ang + ia.noise * 0.3; // paseo
        if (dc > Rc * 0.6) meta = Math.atan2(-s.y, -s.x) + ia.noise * 0.5;
      }
    }
    if (amenaza && ad < 260 + amenaza.r * 3) { // huir si va de frente
      var rel = S.angDiff(Math.atan2(amenaza.y - s.y, amenaza.x - s.x), amenaza.ang + Math.PI);
      if (Math.abs(rel) < 0.9) { meta = Math.atan2(s.y - amenaza.y, s.x - amenaza.x) + (rel > 0 ? -1 : 1) * 0.6; usaMeta = true; turbo = turbo || (s.masa > 30 && ad < 180 && rnd() < D.turbo); }
    }
    // 2. borde
    var margen = 230 + s.r * 4;
    if (dc > Rc - margen) {
      var w = S.clamp((dc - (Rc - margen)) / margen, 0, 1), hacia = Math.atan2(-s.y, -s.x);
      meta = meta + S.angDiff(meta, hacia) * Math.max(0.5, w);
      if (dc > Rc - 90) meta = hacia;
    }
    // 3. evitar cuerpos: probar rumbos
    var L = (80 + s.vel * 0.3) * D.mira * (1 + s.r / 40), mejorC = 1e9, mejorA = meta, peligroFrente = false;
    for (var c = 0; c < CAND.length; c++) {
      var a = s.ang + CAND[c], cost = Math.abs(S.angDiff(meta, a)) * 1.6, ca = Math.cos(a), sa = Math.sin(a);
      for (var k = 1; k <= 3; k++) {
        var dd = L * (k === 1 ? 0.45 : k === 2 ? 0.95 : 1.6), px = s.x + ca * dd, py = s.y + sa * dd;
        if (Math.hypot(px, py) > Rc - 30 - s.r) { cost += 18 / k; continue; }
        var h = hayCuerpo(W, px, py, s.r * 0.9, s);
        if (h) { cost += (h === 2 ? 24 : 16) / k; if (c === 0 && k <= 2) peligroFrente = true; }
      }
      if (cost < mejorC) { mejorC = cost; mejorA = a; }
    }
    if (peligroFrente && mejorC > 12 && s.masa > 30 && D.turbo > 0.6) turbo = false;
    s.objAng = mejorA + (rnd() - .5) * D.ruido;
    s.pideTurbo = turbo && s.masa > 22;
  };
})(typeof window !== 'undefined' ? window : globalThis);
