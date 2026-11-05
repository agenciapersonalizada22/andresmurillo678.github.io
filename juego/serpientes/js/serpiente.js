/* Serpiente: cabeza + rastro uniforme (anillo) + segmentos muestreados a distancia constante. */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, C = S.C;
  function Serpiente(id) {
    this.id = id; this.nombre = ''; this.skin = null; this.equipo = -1; this.bot = false; this.red = null; this.ia = null;
    this.tx = new Float32Array(128); this.ty = new Float32Array(128); this.th = 0; this.tn = 0;
    this.segs = new Float32Array(64); this.ns = 0;
    this.odo = 0;
    this.est = { kills: 0, orbes: 0, turbo: 0, maxMasa: 0, vivo: 0 };
    this.reiniciar(0, 0, 0, C.MASA_INI);
  }
  Serpiente.prototype.reiniciar = function (x, y, ang, masa) {
    this.x = x; this.y = y; this.ang = ang; this.objAng = ang; this.pideTurbo = false; this.turbo = false;
    this.masa = masa; this.vivo = true; this.inmune = C.INMUNE; this.estela = 0; this.pt = 0; this.muertoT = 0;
    this.r = S.radio(masa); this.sp = S.espaciado(this.r); this.vel = C.VEL;
    this.tn = 0; this.th = 0;
    var need = Math.ceil(S.largo(masa) / C.TRD) + 6, dx = Math.cos(ang), dy = Math.sin(ang);
    this.asegurar(need);
    for (var i = need; i >= 0; i--) this.empujar(x - dx * i * C.TRD, y - dy * i * C.TRD);
    this.ux = x; this.uy = y;
    this.est.kills = 0; this.est.orbes = 0; this.est.turbo = 0; this.est.maxMasa = masa; this.est.vivo = 0;
    this.actualizar();
  };
  Serpiente.prototype.asegurar = function (n) {
    if (n <= this.tx.length) return;
    var cap = Math.max(n, this.tx.length * 2), nx = new Float32Array(cap), ny = new Float32Array(cap), c = this.tx.length;
    for (var j = 0; j < this.tn; j++) { var k = (this.th - j + c) % c; nx[this.tn - 1 - j] = this.tx[k]; ny[this.tn - 1 - j] = this.ty[k]; }
    this.tx = nx; this.ty = ny; this.th = Math.max(0, this.tn - 1);
  };
  Serpiente.prototype.empujar = function (x, y) {
    var c = this.tx.length; this.th = (this.th + 1) % c; this.tx[this.th] = x; this.ty[this.th] = y; if (this.tn < c) this.tn++;
    this.ux = x; this.uy = y;
  };
  /* Recalcula radio, espaciado y numero de segmentos segun la masa. */
  Serpiente.prototype.actualizar = function () {
    this.r = S.radio(this.masa); this.sp = S.espaciado(this.r); this.ns = S.nSegs(this.masa);
    if (this.segs.length < this.ns * 2) this.segs = new Float32Array(Math.max(this.ns * 2, this.segs.length * 2));
    var need = Math.ceil(S.largo(this.masa) / C.TRD) + 6;
    this.asegurar(need + 8);
    if (this.tn > need + 2) this.tn = need + 2;
    this.muestrear();
  };
  Serpiente.prototype.paso = function (dt) {
    var da = S.angDiff(this.ang, this.objAng), mx = C.GIRO * dt / (1 + (this.r - 10) * 0.02);
    this.ang += da < -mx ? -mx : da > mx ? mx : da;
    if (this.ang > Math.PI) this.ang -= S.TAU; else if (this.ang < -Math.PI) this.ang += S.TAU;
    this.turbo = this.pideTurbo && this.masa > C.MASA_MIN + 0.5;
    var v = this.turbo ? C.VEL_TURBO : C.VEL;
    this.vel = v;
    var nx = this.x + Math.cos(this.ang) * v * dt, ny = this.y + Math.sin(this.ang) * v * dt;
    this.x = nx; this.y = ny; this.odo += v * dt;
    var dx = nx - this.ux, dy = ny - this.uy, d = Math.sqrt(dx * dx + dy * dy), T = C.TRD;
    while (d >= T) {
      var t = T / d; this.empujar(this.ux + dx * t, this.uy + dy * t);
      dx = nx - this.ux; dy = ny - this.uy; d = Math.sqrt(dx * dx + dy * dy);
    }
    if (this.turbo) {
      var gasto = (1.5 + this.masa * 0.004) * dt; this.masa -= gasto; this.estela += gasto; this.est.turbo += dt;
    }
    if (this.inmune > 0) this.inmune -= dt;
    this.est.vivo += dt;
    this.actualizar();
  };
  /* Posiciones de los ns segmentos (segs[0]=cabeza) a distancia sp a lo largo del rastro. */
  Serpiente.prototype.muestrear = function () {
    var segs = this.segs, ns = this.ns, sp = this.sp, T = C.TRD, c = this.tx.length, tn = this.tn;
    var ux = this.tx[this.th], uy = this.ty[this.th], hx = this.x, hy = this.y;
    var fx = hx - ux, fy = hy - uy, frac = Math.sqrt(fx * fx + fy * fy);
    segs[0] = hx; segs[1] = hy;
    for (var k = 1; k < ns; k++) {
      var D = k * sp, x, y;
      if (D <= frac) { var t = D / frac; x = hx - fx * t; y = hy - fy * t; }
      else {
        var j = (D - frac) / T, j0 = j | 0, f = j - j0;
        if (j0 + 1 >= tn) { var kk = (this.th - (tn - 1) + c * 2) % c; x = this.tx[kk]; y = this.ty[kk]; }
        else {
          var a = (this.th - j0 + c * 2) % c, b = (a - 1 + c) % c;
          x = this.tx[a] + (this.tx[b] - this.tx[a]) * f; y = this.ty[a] + (this.ty[b] - this.ty[a]) * f;
        }
      }
      segs[k * 2] = x; segs[k * 2 + 1] = y;
    }
  };
  /* Reconstruye el rastro desde una lista de segmentos (restauracion de partida). */
  Serpiente.prototype.desdeSegs = function (arr) {
    var n = arr.length / 2, need = Math.ceil(S.largo(this.masa) / C.TRD) + 6;
    this.asegurar(need + 8); this.tn = 0; this.th = 0;
    var pts = []; // cola -> cabeza
    var total = [], acc = 0;
    for (var i = n - 1; i > 0; i--) {
      var ax = arr[i * 2], ay = arr[i * 2 + 1], bx = arr[i * 2 - 2], by = arr[i * 2 - 1], d = Math.hypot(bx - ax, by - ay), t0 = 0;
      while (acc + d - t0 >= C.TRD && d > 0) { t0 += C.TRD - acc; acc = 0; pts.push(ax + (bx - ax) * t0 / d, ay + (by - ay) * t0 / d); }
      acc += d - t0;
    }
    if (pts.length < 4) { var dx = Math.cos(this.ang), dy = Math.sin(this.ang); for (var q = 6; q >= 0; q--) pts.push(this.x - dx * q * C.TRD, this.y - dy * q * C.TRD); }
    for (var p = 0; p < pts.length; p += 2) this.empujar(pts[p], pts[p + 1]);
    this.actualizar();
  };
  S.Serpiente = Serpiente;
})(typeof window !== 'undefined' ? window : globalThis);
