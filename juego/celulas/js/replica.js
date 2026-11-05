/* Celulas: replica del mundo en el cliente. Decodifica snapshots, interpola entidades y predice la celula propia. */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {}, K = C.K;
  function Ent() { this.id = 0; this.jid = 0; this.x0 = 0; this.y0 = 0; this.m0 = 0; this.t0 = 0; this.x1 = 0; this.y1 = 0; this.m1 = 0; this.t1 = 0; this.vivo = false; this.st = 0; this.nuevo = true; this.rx = 0; this.ry = 0; this.rm = 0; this.rr = 0; this.ox = 0; this.oy = 0; this.x = 0; this.y = 0; this.m = 0; this.r = 0; this.tf = 0; this.prot = 0; }

  function Replica(info) {
    this.tam = info.tam; this.modo = info.modo; this.semilla = info.semilla >>> 0; this.yo = info.yo;
    this.cfg = C.MODOS[this.modo] || C.MODOS.ffa; this.nFood = info.nFood;
    this.fx = new Float32Array(this.nFood); this.fy = new Float32Array(this.nFood); this.fgen = new Uint8Array(this.nFood); this.fvivo = new Uint8Array(this.nFood);
    this.hComida = new C.Rejilla(this.tam, 200, this.nFood, 48); this.bufF = new Uint16Array(4096);
    this.cells = []; this.nC = 0; this.virus = []; this.nV = 0; this.ej = []; this.nE = 0;
    this.pc = new Array(4096); this.pv = new Array(512); this.pe = new Array(2048);
    this.jugs = []; this.lb = []; this.eqMasa = [0, 0]; this.zona = this.tam; this.zonaActiva = this.modo === 'batalla'; this.t = 0; this.estado = 'jugando'; this.ganador = -1; this.ganadorEq = -1;
    this.seq = -1; this.stamp = 0; this.tUlt = 0; this.recibidos = 0; this.vivo = false; this.zonaT = 0;
    this.entrada = { ax: 0, ay: 0, pausa: false };
    this.retardo = 110; this.cx = this.tam / 2; this.cy = this.tam / 2;
  }
  C.Replica = Replica;
  var P = Replica.prototype, _p = { x: 0, y: 0, c: 0 };
  var rb, ro;
  function r8() { return rb[ro++]; }
  function r16() { var v = (rb[ro] << 8) | rb[ro + 1]; ro += 2; return v; }
  function r32() { var v = ((rb[ro] << 24) | (rb[ro + 1] << 16) | (rb[ro + 2] << 8) | rb[ro + 3]) >>> 0; ro += 4; return v; }

  function tomar(rep, pool, lista, id, tms, x, y, m, jid) {
    var e = pool[id];
    if (!e) e = pool[id] = new Ent();
    if (!e.vivo) { e.vivo = true; e.nuevo = true; e.x0 = x; e.y0 = y; e.m0 = m; e.t0 = tms; e.rr = K * Math.sqrt(m); lista.push(e); }
    else { e.x0 = e.x1; e.y0 = e.y1; e.m0 = e.m1; e.t0 = e.t1; e.nuevo = false; }
    e.id = id; e.jid = jid; e.x1 = x; e.y1 = y; e.m1 = m; e.t1 = tms; e.st = rep.stamp;
    e.x = x; e.y = y; e.m = m; e.r = K * Math.sqrt(m);
    return e;
  }
  function barrer(rep, lista) {
    var w = 0;
    for (var i = 0; i < lista.length; i++) { var e = lista[i]; if (e.st === rep.stamp) lista[w++] = e; else e.vivo = false; }
    lista.length = w; return w;
  }

  /* aplica un snapshot (Uint8Array); devuelve false si es viejo o invalido */
  P.aplicar = function (bytes, len) {
    rb = bytes; ro = 0;
    if (r8() !== 1) return false;
    var tms = r32(), seq = r16(), flags = r8();
    if (this.seq >= 0 && ((seq - this.seq) & 0xffff) > 32768) return false;
    if (this.seq >= 0 && seq === this.seq) return false;
    this.seq = seq; this.stamp++; this.tUlt = tms; this.recibidos++; this.vivo = !!(flags & 2);
    var tam = this.tam, k = tam / 65535, n, i, id, jid, x, y, m, e;
    n = r16();
    for (i = 0; i < n; i++) { id = r16(); jid = r8(); x = r16() * k; y = r16() * k; m = r16() / 200; m *= m; tomar(this, this.pc, this.cells, id, tms, x, y, m, jid); }
    this.nC = barrer(this, this.cells);
    n = r16();
    for (i = 0; i < n; i++) { id = r16(); x = r16() * k; y = r16() * k; m = r16() / 200; m *= m; tomar(this, this.pv, this.virus, id, tms, x, y, m, 0).feed = 0; }
    this.nV = barrer(this, this.virus);
    n = r16();
    for (i = 0; i < n; i++) { id = r16(); x = r16() * k; y = r16() * k; jid = r8(); tomar(this, this.pe, this.ej, id, tms, x, y, 144, jid); }
    this.nE = barrer(this, this.ej);
    n = r16();
    for (i = 0; i < n; i++) { var s = r16(); if (s < this.nFood && this.fvivo[s]) { this.fvivo[s] = 0; this.hComida.quitar(s); } }
    if (flags & 1) {
      var x0 = r16() * k, y0 = r16() * k, x1 = r16() * k, y1 = r16() * k, a = this.hComida.consultar(x0, y0, x1, y1, this.bufF);
      for (i = 0; i < a; i++) { s = this.bufF[i]; if (this.fx[s] >= x0 && this.fx[s] <= x1 && this.fy[s] >= y0 && this.fy[s] <= y1) { this.fvivo[s] = 0; this.hComida.quitar(s); } }
      n = r16();
      for (i = 0; i < n; i++) {
        s = r16(); var g = r8(); if (s >= this.nFood) continue;
        C.posComida(this.semilla, s, g, tam, _p); this.fgen[s] = g; this.fx[s] = _p.x; this.fy[s] = _p.y;
        if (this.fvivo[s]) this.hComida.quitar(s);
        this.fvivo[s] = this.hComida.insertar(s, _p.x, _p.y) ? 1 : 0;
      }
    }
    return true;
  };

  /* mensaje periodico de informacion (JSON): tabla de jugadores, marcador, zona, tiempo */
  P.aplicarJugadores = function (lista) {
    var vistos = {}, q;
    for (q = 0; q < lista.length; q++) vistos[lista[q][0]] = 1;
    for (q = 0; q < this.jugs.length; q++) if (this.jugs[q] && !vistos[q]) this.jugs[q] = null;
    for (var i = 0; i < lista.length; i++) {
      var a = lista[i], j = this.jugs[a[0]] || (this.jugs[a[0]] = { id: a[0], cel: [], masa: 0, cx: 0, cy: 0, vivo: false, puesto: 0, st: {} });
      j.nombre = a[1]; j.skin = a[2]; j.equipo = a[3]; j.bot = !!a[4]; j.humano = !a[4];
    }
  };
  P.quitarJugadores = function (ids) { for (var i = 0; i < ids.length; i++) this.jugs[ids[i]] = null; };
  P.aplicarInfo = function (d) {
    this.t = d.t; this.estado = d.e ? 'terminado' : 'jugando'; this.zona = d.z || this.tam; this.ganador = d.g == null ? -1 : d.g; this.ganadorEq = d.ge == null ? -1 : d.ge;
    this.lb = d.lb || []; if (d.eq) { this.eqMasa[0] = d.eq[0]; this.eqMasa[1] = d.eq[1]; }
    var seen = {};
    for (var i = 0; i < d.pl.length; i++) {
      var a = d.pl[i], j = this.jugs[a[0]]; if (!j) continue;
      j.cx = a[1] * 10; j.cy = a[2] * 10; j.masa = a[3]; j.vivo = a[4] === 1; j.cel.length = a[5]; j.puesto = a[6] || 0; seen[a[0]] = 1;
    }
    for (i = 0; i < this.jugs.length; i++) if (this.jugs[i] && !seen[i]) { this.jugs[i].masa = 0; this.jugs[i].vivo = false; this.jugs[i].cel.length = 0; }
    if (d.yo) { this.puesto = d.yo.p; this.stYo = d.yo; }
  };

  /* interpolacion + prediccion. ahora = Red.reloj() (ms), dt en segundos */
  P.prepararRender = function (dt, ahora) {
    var tr = ahora - this.retardo, i, e, u, k;
    var f = Math.min(1, dt * 14);
    var lists = [this.cells, this.virus, this.ej];
    for (var L = 0; L < 3; L++) {
      var lista = lists[L];
      for (i = 0; i < lista.length; i++) {
        e = lista[i]; var d = e.t1 - e.t0;
        u = d > 0 ? (tr - e.t0) / d : 1; u = u < 0 ? 0 : u > 1.25 ? 1.25 : u;
        e.rx = e.x0 + (e.x1 - e.x0) * u; e.ry = e.y0 + (e.y1 - e.y0) * u;
        var m = e.m0 + (e.m1 - e.m0) * (u > 1 ? 1 : u); e.rm = m;
        var rt = K * Math.sqrt(m); e.rr += (rt - e.rr) * f;
      }
    }
    // celulas propias: prediccion
    var en = this.entrada, mine = 0, sx = 0, sy = 0, sm = 0;
    for (i = 0; i < this.nC; i++) { e = this.cells[i]; if (e.jid === this.yo) { mine++; sx += (e.nuevo || e.ox === 0 ? e.rx : e.ox) * e.m1; sy += (e.nuevo || e.oy === 0 ? e.ry : e.oy) * e.m1; sm += e.m1; } }
    if (mine && sm > 0) {
      var cx = sx / sm, cy = sy / sm, la = ahora - this.tUlt; if (la > 250) la = 250; if (la < 0) la = 0;
      var corr = 1 - Math.exp(-dt * 5);
      for (i = 0; i < this.nC; i++) {
        e = this.cells[i]; if (e.jid !== this.yo) continue;
        var dt1 = e.t1 - e.t0, vx = dt1 > 0 ? (e.x1 - e.x0) / dt1 : 0, vy = dt1 > 0 ? (e.y1 - e.y0) / dt1 : 0;
        var tx = e.x1 + vx * la, ty = e.y1 + vy * la;
        if (e.ox === 0 && e.oy === 0 || e.nuevo) { e.ox = tx; e.oy = ty; }
        if (!en.pausa) {
          var dx = cx + en.ax - e.ox, dy = cy + en.ay - e.oy, dd = Math.sqrt(dx * dx + dy * dy);
          if (dd > 1e-3) { var kk = dd / (e.r * 0.5 + 30); if (kk > 1) kk = 1; var v = C.velocidad(e.m1) * kk * dt; e.ox += dx / dd * v; e.oy += dy / dd * v; }
        }
        var ex = tx - e.ox, ey = ty - e.oy;
        if (ex * ex + ey * ey > 350 * 350) { e.ox = tx; e.oy = ty; } else { e.ox += ex * corr; e.oy += ey * corr; }
        e.rx = e.ox; e.ry = e.oy;
      }
    }
    var jd = this.jugs[this.yo];
    if (jd) {
      var mm = 0, ax = 0, ay = 0;
      for (i = 0; i < this.nC; i++) { e = this.cells[i]; if (e.jid === this.yo) { mm += e.rm; ax += e.rx * e.rm; ay += e.ry * e.rm; } }
      if (mm > 0) { jd.cx = ax / mm; jd.cy = ay / mm; jd.masa = mm; }
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
