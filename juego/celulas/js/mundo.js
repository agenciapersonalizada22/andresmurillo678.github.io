/* Celulas: simulacion del mundo (autoritativa). Sin DOM: corre en el navegador y en Node. */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {}, K = C.K, clamp = C.clamp;
  C.radio = function (m) { return K * Math.sqrt(m); };
  C.velocidad = function (m) { return Math.max(26, 760 * Math.pow(m, -0.38)); };
  C.tFusion = function (m) { return 10 + 0.02 * m; };

  function Celda() { this.id = 0; this.j = null; this.jid = 0; this.x = 0; this.y = 0; this.px = 0; this.py = 0; this.m = 0; this.pm = 0; this.r = 0; this.vx = 0; this.vy = 0; this.hx = 1; this.hy = 0; this.tf = 0; this.prot = 0; this.edad = 0; this.vivo = false; this.rx = 0; this.ry = 0; this.rm = 0; this.rr = 0; }
  function Virus() { this.id = 0; this.x = 0; this.y = 0; this.px = 0; this.py = 0; this.m = 0; this.vx = 0; this.vy = 0; this.feed = 0; this.fx = 1; this.fy = 0; this.vivo = false; this.rx = 0; this.ry = 0; this.rm = 0; }
  function Eyec() { this.id = 0; this.x = 0; this.y = 0; this.px = 0; this.py = 0; this.m = 0; this.vx = 0; this.vy = 0; this.jid = 0; this.edad = 0; this.r = 0; this.vivo = false; this.rx = 0; this.ry = 0; }

  function Mundo(o) {
    o = o || {};
    var cfg = this.cfg = C.MODOS[o.modo] || C.MODOS.ffa;
    this.modo = C.MODOS[o.modo] ? o.modo : 'ffa';
    this.tam = o.tam || cfg.tam; this.semilla = (o.semilla == null ? 12345 : o.semilla) >>> 0;
    this.rng = new C.Rng(this.semilla ^ 0x5bd1e995);
    this.dif = C.DIF[o.dificultad] ? o.dificultad : 'normal'; this.difp = C.DIF[this.dif];
    this.decay = o.decay == null ? C.DECAY : o.decay;
    this.botsTotal = o.bots == null ? 30 : o.bots;
    this.nFood = o.comida == null ? Math.round(this.tam * this.tam / 11000) : o.comida;
    this.nVirusObj = o.virus == null ? Math.max(4, Math.round(this.tam * this.tam / 1100000)) : o.virus;
    this.t = 0; this.estado = 'jugando'; this.ganador = null; this.ganadorEq = -1; this.zona = this.tam; this.zonaActiva = this.modo === 'batalla';
    this.alEvento = null; this.pausadoIA = false;
    // jugadores
    this.jugs = []; this.idsJ = new C.Ids(C.MAX_JUG); this.nHumanos = 0;
    // celdas, virus, eyecciones (listas densas + reserva)
    this.cells = []; this.nC = 0; this.libC = []; this.idsC = new C.Ids(4096);
    this.virus = []; this.nV = 0; this.libV = []; this.idsV = new C.Ids(512);
    this.ej = []; this.nE = 0; this.libE = []; this.idsE = new C.Ids(2048);
    this.hCel = new C.HashDin(this.tam, 256, 4096); this.hVir = new C.HashDin(this.tam, 256, 512); this.hEj = new C.HashDin(this.tam, 256, 2048);
    // comida
    var n = this.nFood, p = { x: 0, y: 0, c: 0 };
    this.fx = new Float32Array(n); this.fy = new Float32Array(n); this.fgen = new Uint8Array(n); this.fvivo = new Uint8Array(n);
    this.hComida = new C.Rejilla(this.tam, 200, n, 48);
    this.muertas = new Uint16Array(n); this.nMuertas = 0; this.acumComida = 0;
    for (var i = 0; i < n; i++) this.nacerComida(i, 0);
    this.ringE = new Uint16Array(1024); this.ringT = new Float32Array(1024); this.ringN = 0; // comidas comidas recientes
    this.bufF = new Uint16Array(4096); this.bufC = new Int32Array(1024); this.bufV = new Int32Array(256); this.bufE = new Int32Array(1024);
    this.perdida = 0; this.masaNueva = 0; this.comidaCons = 0; this.virusAbs = 0;
    this.tLb = 0; this.lb = []; this.tVirus = 0; this.tFin = 0; this.tComida = 0; this.eqMasa = [0, 0];
    for (i = 0; i < this.nVirusObj; i++) this.crearVirus();
    this.ajustarBots(true);
  }
  C.Mundo = Mundo;
  var P = Mundo.prototype;

  /* ---------- comida ---------- */
  var _p = { x: 0, y: 0, c: 0 };
  P.nacerComida = function (s, gen) {
    C.posComida(this.semilla, s, gen, this.tam, _p);
    this.fgen[s] = gen; this.fx[s] = _p.x; this.fy[s] = _p.y;
    this.fvivo[s] = this.hComida.insertar(s, _p.x, _p.y) ? 1 : 0;
    if (!this.fvivo[s]) this.muertas[this.nMuertas++] = s;
  };
  P.comerComida = function (s) {
    this.fvivo[s] = 0; this.hComida.quitar(s); this.muertas[this.nMuertas++] = s;
    var k = this.ringN & 1023; this.ringE[k] = s; this.ringT[k] = this.t; this.ringN++;
  };

  /* ---------- fabrica de entidades ---------- */
  P.nuevaCelda = function (j, x, y, m) {
    var id = this.idsC.sacar(); if (id < 0) return null;
    var c = this.libC.pop() || new Celda();
    c.id = id; c.j = j; c.jid = j.id; c.x = c.px = c.rx = x; c.y = c.py = c.ry = y; c.m = c.pm = c.rm = m; c.r = c.rr = C.radio(m);
    c.vx = c.vy = 0; c.tf = 0; c.prot = 0; c.edad = 0; c.vivo = true;
    this.cells[this.nC++] = c; j.cel.push(c); return c;
  };
  P.fijar = function (c, m) { c.m = m < C.MASA_MIN ? C.MASA_MIN : m; c.r = K * Math.sqrt(c.m); };
  P.crearVirus = function (x, y, vx, vy) {
    var id = this.idsV.sacar(); if (id < 0) return null;
    var v = this.libV.pop() || new Virus();
    if (x == null) { var q = this.puntoSeguro(true); x = q.x; y = q.y; vx = vy = 0; }
    v.id = id; v.x = v.px = v.rx = x; v.y = v.py = v.ry = y; v.m = v.rm = C.MASA_VIRUS; v.vx = vx; v.vy = vy; v.feed = 0; v.vivo = true;
    this.virus[this.nV++] = v; return v;
  };
  P.crearEyec = function (j, x, y, vx, vy) {
    var id = this.idsE.sacar(); if (id < 0) return null;
    var e = this.libE.pop() || new Eyec();
    e.id = id; e.x = e.px = e.rx = x; e.y = e.py = e.ry = y; e.vx = vx; e.vy = vy; e.m = C.MASA_EYEC; e.r = C.R_EYEC; e.jid = j.id; e.edad = 0; e.vivo = true;
    this.ej[this.nE++] = e; return e;
  };

  /* ---------- jugadores ---------- */
  P.equipoLibre = function () {
    var n = [0, 0];
    for (var i = 0; i < this.jugs.length; i++) { var j = this.jugs[i]; if (j && j.equipo >= 0) n[j.equipo]++; }
    return n[0] <= n[1] ? 0 : 1;
  };
  P.agregarJugador = function (o) {
    var id = this.idsJ.sacar(); if (id < 0) return null;
    var j = {
      id: id, nombre: String(o.nombre || 'Celula').slice(0, 16), skin: o.skin || '#3df5ff|0|', bot: !!o.bot, humano: !o.bot,
      equipo: this.modo === 'equipos' ? (o.equipo >= 0 ? o.equipo : this.equipoLibre()) : -1,
      token: o.token || '', redId: o.redId == null ? -1 : o.redId, cel: [], vivo: false, ax: 0, ay: 0, pausa: false, cx: this.tam / 2, cy: this.tam / 2, masa: 0,
      iaT: this.rng.next() * 0.3, rt: 0.5 + this.rng.next() * 2, cdEj: 0, puesto: 0, tVida: 0, ultimo: -1, vw: 1400, vh: 900, iaEst: { gx: 0, gy: 0, ang: 0, t: 0 },
      st: { kills: 0, killsVida: 0, maxMasa: 0, comida: 0, muertes: 0, tTotal: 0, virus: 0, divisiones: 0, expulsadas: 0, tVivo: 0 }, espectar: -1
    };
    this.jugs[id] = j; if (j.humano) this.nHumanos++;
    if (this.t < 1 || this.puedeReaparecer(j)) this.reaparecer(j); else j.puesto = 0;
    if (j.humano) this.ajustarBots(false);
    return j;
  };
  P.matarTodo = function (j) { for (var i = 0; i < j.cel.length; i++) { this.perdida += j.cel[i].m; j.cel[i].vivo = false; } };
  P.convertirBot = function (j) { if (j.humano) { j.humano = false; j.bot = true; this.nHumanos--; j.nombre = j.nombre.slice(0, 13) + '*'; } };
  P.reclamar = function (j) {
    if (!j.humano) { j.humano = true; j.bot = false; this.nHumanos++; j.nombre = j.nombre.replace(/\*$/, ''); }
  };
  P.quitarJugador = function (j) {
    this.matarTodo(j); this.limpiar(); this.jugs[j.id] = null; this.idsJ.devolver(j.id); if (j.humano) this.nHumanos--;
  };
  P.ajustarBots = function (inicio) {
    var n = 0, bots = [], i, j;
    for (i = 0; i < this.jugs.length; i++) { j = this.jugs[i]; if (j) { n++; if (j.bot) bots.push(j); } }
    while (n > this.botsTotal && bots.length) { this.quitarJugador(bots.pop()); n--; }
    if (!inicio && !this.cfg.reaparece && this.t > 5) return;
    while (n < this.botsTotal) {
      var nom = C.NOMBRES_BOT[this.rng.entero(C.NOMBRES_BOT.length)];
      var skin = C.COLORES_SKIN[this.rng.entero(C.COLORES_SKIN.length)] + '|' + this.rng.entero(C.PATRONES.length) + '|' + (this.rng.next() < 0.35 ? C.EMOJIS[1 + this.rng.entero(C.EMOJIS.length - 1)] : '');
      if (!this.agregarJugador({ nombre: nom, skin: skin, bot: true })) break; n++;
    }
  };
  P.puntoSeguro = function (paraVirus) {
    var best = null, bs = -1, tam = this.tam;
    for (var k = 0; k < 7; k++) {
      var x = tam * (0.05 + 0.9 * this.rng.next()), y = tam * (0.05 + 0.9 * this.rng.next());
      if (this.zonaActiva) { var dx = x - tam / 2, dy = y - tam / 2, d = Math.hypot(dx, dy), R = this.zona * 0.85; if (d > R) { x = tam / 2 + dx / d * R; y = tam / 2 + dy / d * R; } }
      var s = 1e9;
      for (var i = 0; i < this.nC; i++) { var c = this.cells[i]; if (c.m > 40 || paraVirus) { var dd = Math.hypot(c.x - x, c.y - y) - c.r; if (dd < s) s = dd; } }
      if (paraVirus) for (i = 0; i < this.nV; i++) { dd = Math.hypot(this.virus[i].x - x, this.virus[i].y - y) - 200; if (dd < s) s = dd; }
      if (s > bs) { bs = s; best = { x: x, y: y }; }
    }
    return best;
  };
  P.puedeReaparecer = function (j) {
    if (this.estado !== 'jugando') return false;
    if (this.cfg.reaparece) return true;
    return this.modo === 'batalla' && this.t < (this.cfg.gracia || 0);
  };
  P.reaparecer = function (j) {
    if (j.cel.length) return false;
    var p = this.puntoSeguro(false), c = this.nuevaCelda(j, p.x, p.y, C.MASA_INI);
    if (!c) return false;
    c.prot = 2.5; j.vivo = true; j.tVida = 0; j.st.killsVida = 0; j.rt = 0; j.ultimo = -1;
    this.masaNueva += C.MASA_INI; this.actualizarCOM(j);
    return true;
  };
  P.actualizarCOM = function (j) {
    var m = 0, sx = 0, sy = 0, cel = j.cel;
    for (var i = 0; i < cel.length; i++) { var c = cel[i]; if (!c.vivo) continue; m += c.m; sx += c.x * c.m; sy += c.y * c.m; }
    j.masa = m; if (m > 0) { j.cx = sx / m; j.cy = sy / m; if (m > j.st.maxMasa) j.st.maxMasa = m; }
  };
  P.entrada = function (j, ax, ay, pausa) {
    if (!(ax === ax) || !(ay === ay)) return;
    var d = Math.hypot(ax, ay);
    if (d > 3000) { ax *= 3000 / d; ay *= 3000 / d; }
    j.ax = ax; j.ay = ay; j.pausa = !!pausa;
  };

  /* ---------- acciones ---------- */
  P.dividir = function (j) {
    var n0 = j.cel.length, hecho = false;
    for (var i = 0; i < n0; i++) {
      var c = j.cel[i];
      if (!c.vivo || c.m < C.MASA_DIV || j.cel.length >= C.MAX_CEL) continue;
      var dx = j.cx + j.ax - c.x, dy = j.cy + j.ay - c.y, d = Math.hypot(dx, dy);
      if (d < 1e-3) { dx = c.hx; dy = c.hy; d = 1; }
      dx /= d; dy /= d;
      var h = c.m / 2; this.fijar(c, h);
      var n = this.nuevaCelda(j, c.x, c.y, h); if (!n) { this.fijar(c, c.m * 2); continue; }
      var v = 520 + 4 * n.r; n.vx = dx * v; n.vy = dy * v; n.hx = dx; n.hy = dy;
      c.tf = n.tf = C.tFusion(h * 2); n.prot = 0; hecho = true;
    }
    if (hecho) { j.st.divisiones++; j.tDiv = this.t; }
    return hecho;
  };
  P.expulsar = function (j) {
    if (j.cdEj > 0 || this.nE > 1500) return false;
    var hecho = false, n0 = j.cel.length;
    for (var i = 0; i < n0; i++) {
      var c = j.cel[i];
      if (!c.vivo || c.m < C.MASA_EXP) continue;
      var dx = j.cx + j.ax - c.x, dy = j.cy + j.ay - c.y, d = Math.hypot(dx, dy);
      if (d < 1e-3) { dx = c.hx; dy = c.hy; d = 1; }
      dx /= d; dy /= d;
      var a = (this.rng.next() - 0.5) * 0.18, ca = Math.cos(a), sa = Math.sin(a), ux = dx * ca - dy * sa, uy = dx * sa + dy * ca;
      var e = this.crearEyec(j, c.x + ux * c.r, c.y + uy * c.r, ux * 720, uy * 720);
      if (!e) break;
      this.fijar(c, c.m - C.MASA_EYEC); hecho = true;
    }
    if (hecho) { j.cdEj = 0.09; j.st.expulsadas++; }
    return hecho;
  };

  /* ---------- paso de simulacion ---------- */
  P.paso = function (dt) {
    var i, j, c;
    this.t += dt;
    for (i = 0; i < this.nC; i++) { c = this.cells[i]; c.px = c.x; c.py = c.y; c.pm = c.m; }
    for (i = 0; i < this.nV; i++) { c = this.virus[i]; c.px = c.x; c.py = c.y; }
    for (i = 0; i < this.nE; i++) { c = this.ej[i]; c.px = c.x; c.py = c.y; }
    this.hCel.reconstruir(this.cells, this.nC); this.hVir.reconstruir(this.virus, this.nV); this.hEj.reconstruir(this.ej, this.nE);
    var jugs = this.jugs;
    for (i = 0; i < jugs.length; i++) {
      j = jugs[i]; if (!j) continue;
      if (j.cdEj > 0) j.cdEj -= dt;
      if (j.cel.length) {
        j.tVida += dt; j.st.tTotal += dt;
        if (j.bot && !this.pausadoIA) { j.iaT -= dt; if (j.iaT <= 0) { C.pensarBot(this, j); j.iaT = this.difp.reac * (0.7 + 0.6 * this.rng.next()); } }
      } else if (j.bot && this.puedeReaparecer(j) && j.vivo === false) { j.rt -= dt; if (j.rt <= 0) this.reaparecer(j); }
    }
    this.mover(dt);
    this.fusionar(dt);
    this.comer();
    this.virusYEyecciones(dt);
    this.limpiar();
    this.reglas(dt);
  };

  P.mover = function (dt) {
    var tam = this.tam, fr = Math.exp(-4.2 * dt), dec = this.decay * dt, i, c, j;
    for (i = 0; i < this.nC; i++) {
      c = this.cells[i]; j = c.j;
      if (c.tf > 0) c.tf -= dt; if (c.prot > 0) c.prot -= dt; c.edad += dt;
      var dx = j.cx + j.ax - c.x, dy = j.cy + j.ay - c.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1e-3) {
        c.hx = dx / d; c.hy = dy / d;
        if (!j.pausa) { var k = d / (c.r * 0.5 + 30); if (k > 1) k = 1; var v = C.velocidad(c.m) * k * dt; c.x += c.hx * v; c.y += c.hy * v; }
      }
      if (c.vx !== 0 || c.vy !== 0) {
        c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= fr; c.vy *= fr;
        if (c.vx * c.vx + c.vy * c.vy < 16) c.vx = c.vy = 0;
      }
      var lo = Math.min(c.r * 0.35, tam * 0.4), hi = tam - lo;
      if (c.x < lo) { c.x = lo; c.vx = -c.vx * 0.5; } else if (c.x > hi) { c.x = hi; c.vx = -c.vx * 0.5; }
      if (c.y < lo) { c.y = lo; c.vy = -c.vy * 0.5; } else if (c.y > hi) { c.y = hi; c.vy = -c.vy * 0.5; }
      if (dec > 0 && c.m > C.DECAY_MIN) { var p = c.m * dec; this.perdida += p; c.m -= p; c.r = K * Math.sqrt(c.m); }
    }
    for (i = 0; i < this.nV; i++) {
      c = this.virus[i];
      if (c.vx !== 0 || c.vy !== 0) {
        c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= fr; c.vy *= fr;
        if (c.vx * c.vx + c.vy * c.vy < 16) c.vx = c.vy = 0;
        c.x = clamp(c.x, 70, tam - 70); c.y = clamp(c.y, 70, tam - 70);
      }
    }
    for (i = 0; i < this.nE; i++) {
      c = this.ej[i]; c.edad += dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= fr; c.vy *= fr;
      c.x = clamp(c.x, 10, tam - 10); c.y = clamp(c.y, 10, tam - 10);
      if (c.edad > 75) { c.vivo = false; this.perdida += c.m; }
    }
    for (i = 0; i < this.jugs.length; i++) { j = this.jugs[i]; if (j && j.cel.length) this.actualizarCOM(j); }
  };

  P.fusionar = function (dt) {
    var ff = Math.min(1, dt * 20);
    for (var q = 0; q < this.jugs.length; q++) {
      var j = this.jugs[q]; if (!j || j.cel.length < 2) continue;
      var cel = j.cel;
      for (var a = 0; a < cel.length; a++) {
        var A = cel[a]; if (!A.vivo) continue;
        for (var b = a + 1; b < cel.length; b++) {
          var B = cel[b]; if (!B.vivo || !A.vivo) continue;
          var dx = B.x - A.x, dy = B.y - A.y, d = Math.sqrt(dx * dx + dy * dy), min = A.r + B.r;
          if (A.tf > 0 || B.tf > 0) {
            if (d < min) {
              if (d < 1e-3) { dx = 1; dy = 0.01; d = 1; }
              var ov = (min - d) * ff, nx = dx / d, ny = dy / d, sa = B.m / (A.m + B.m);
              A.x -= nx * ov * sa; A.y -= ny * ov * sa; B.x += nx * ov * (1 - sa); B.y += ny * ov * (1 - sa);
            }
          } else if (d < Math.max(A.r, B.r) * 0.85) {
            var gr = A.m >= B.m ? A : B, pe = gr === A ? B : A;
            this.fijar(gr, gr.m + pe.m); pe.vivo = false;
            if (gr.m > 0) { gr.vx += pe.vx * 0.5; gr.vy += pe.vy * 0.5; }
          }
        }
      }
    }
  };

  P.devorar = function (c, o) {
    this.fijar(c, c.m + o.m); o.vivo = false;
    var v = o.j, k = c.j;
    v.ultimo = k.id;
    if (k.tDiv !== undefined && this.t - k.tDiv < 3 && !o.j.cel.some(function (q) { return q.vivo; })) k.st.emboscadas = (k.st.emboscadas || 0) + 1;
  };

  P.comer = function () {
    var i, k, n, c, r, dx, dy, s, o;
    for (i = 0; i < this.nC; i++) {
      c = this.cells[i]; if (!c.vivo) continue;
      r = c.r;
      n = this.hComida.consultar(c.x - r, c.y - r, c.x + r, c.y + r, this.bufF);
      for (k = 0; k < n; k++) {
        s = this.bufF[k]; if (!this.fvivo[s]) continue;
        dx = this.fx[s] - c.x; dy = this.fy[s] - c.y;
        if (dx * dx + dy * dy < r * r) { this.comerComida(s); c.m += 1; this.comidaCons += 1; c.j.st.comida++; }
      }
      c.r = K * Math.sqrt(c.m); r = c.r;
      n = this.hEj.consultar(c.x, c.y, r + 40, this.bufE);
      for (k = 0; k < n; k++) {
        o = this.ej[this.bufE[k]]; if (!o.vivo || (o.jid === c.jid && o.edad < 0.45)) continue;
        dx = o.x - c.x; dy = o.y - c.y;
        if (dx * dx + dy * dy < (r - 4) * (r - 4)) { o.vivo = false; c.m += o.m; c.r = K * Math.sqrt(c.m); r = c.r; }
      }
      n = this.hVir.consultar(c.x, c.y, r + 40, this.bufV);
      for (k = 0; k < n; k++) {
        o = this.virus[this.bufV[k]]; if (!o.vivo || c.m < o.m * 1.25) continue;
        dx = o.x - c.x; dy = o.y - c.y;
        if (Math.sqrt(dx * dx + dy * dy) < r - 60 * 0.4) { this.explotar(c, o); r = c.r; break; }
      }
      if (!c.vivo || c.prot > 0) continue;
      n = this.hCel.consultar(c.x, c.y, r + 40, this.bufC);
      for (k = 0; k < n; k++) {
        o = this.cells[this.bufC[k]];
        if (o === c || !o.vivo || o.jid === c.jid || o.prot > 0) continue;
        if (c.m < o.m * 1.25) continue;
        if (c.j.equipo >= 0 && c.j.equipo === o.j.equipo) continue;
        dx = o.x - c.x; dy = o.y - c.y;
        if (Math.sqrt(dx * dx + dy * dy) < r - o.r * 0.45) { this.devorar(c, o); r = c.r; }
      }
    }
  };

  P.explotar = function (c, v) {
    v.vivo = false; var j = c.j, total = c.m + v.m;
    this.virusAbs += v.m; j.st.virus++;
    var libres = C.MAX_CEL - j.cel.length, p = Math.min(libres, 7, Math.floor(total / 25) - 1);
    if (p < 1) { this.fijar(c, total); return; }
    var pieza = total * 0.5 / p;
    while (pieza < 15 && p > 1) { p--; pieza = total * 0.5 / p; }
    this.fijar(c, total - pieza * p);
    var a0 = this.rng.next() * 6.283, tf = C.tFusion(total);
    for (var i = 0; i < p; i++) {
      var n = this.nuevaCelda(j, c.x, c.y, pieza);
      if (!n) { this.fijar(c, c.m + pieza); continue; }
      var a = a0 + i * 6.283 / p, sp = 480 + 3 * n.r;
      n.vx = Math.cos(a) * sp; n.vy = Math.sin(a) * sp; n.tf = tf; n.hx = Math.cos(a); n.hy = Math.sin(a);
    }
    c.tf = tf; j.explotado = this.t;
    if (this.alEvento) this.alEvento('virus', j, c);
  };

  P.virusYEyecciones = function (dt) {
    for (var i = 0; i < this.nV; i++) {
      var v = this.virus[i]; if (!v.vivo) continue;
      var n = this.hEj.consultar(v.x, v.y, 120, this.bufE);
      for (var k = 0; k < n; k++) {
        var e = this.ej[this.bufE[k]]; if (!e.vivo) continue;
        var dx = e.x - v.x, dy = e.y - v.y;
        if (dx * dx + dy * dy < 55 * 55) {
          e.vivo = false; this.perdida += e.m; v.feed++;
          var d = Math.hypot(e.vx, e.vy); if (d > 1) { v.fx = e.vx / d; v.fy = e.vy / d; }
          if (v.feed >= C.FEED_VIRUS) {
            v.feed = 0;
            if (this.nV < 64) this.crearVirus(v.x + v.fx * 70, v.y + v.fy * 70, v.fx * 650, v.fy * 650);
          }
        }
      }
    }
  };

  P.muerte = function (j) {
    j.vivo = false; j.st.muertes++; j.tMuerte = this.t;
    var kil = j.ultimo >= 0 ? this.jugs[j.ultimo] : null;
    if (kil && kil !== j) { kil.st.kills++; kil.st.killsVida++; }
    var vivos = 0; for (var i = 0; i < this.jugs.length; i++) { var q = this.jugs[i]; if (q && q !== j && q.cel.length) vivos++; }
    j.puesto = this.puedeReaparecer(j) ? 0 : vivos + 1;
    j.rt = 2 + this.rng.next() * 3;
    if (this.alEvento) this.alEvento('muerte', j, kil);
    if (kil && kil !== j && this.alEvento) this.alEvento('kill', kil, j);
  };

  P.limpiar = function () {
    var w, i, c;
    for (w = 0, i = 0; i < this.nC; i++) { c = this.cells[i]; if (c.vivo) this.cells[w++] = c; else { this.idsC.devolver(c.id); c.j = null; this.libC.push(c); } }
    this.cells.length = this.nC = w;
    for (w = 0, i = 0; i < this.nV; i++) { c = this.virus[i]; if (c.vivo) this.virus[w++] = c; else { this.idsV.devolver(c.id); this.libV.push(c); } }
    this.virus.length = this.nV = w;
    for (w = 0, i = 0; i < this.nE; i++) { c = this.ej[i]; if (c.vivo) this.ej[w++] = c; else { this.idsE.devolver(c.id); this.libE.push(c); } }
    this.ej.length = this.nE = w;
    for (i = 0; i < this.jugs.length; i++) {
      var j = this.jugs[i]; if (!j) continue;
      var cel = j.cel, k = 0;
      for (var q = 0; q < cel.length; q++) if (cel[q].vivo) cel[k++] = cel[q];
      cel.length = k;
      if (k === 0 && j.vivo) { j.masa = 0; this.muerte(j); }
    }
  };

  P.reglas = function (dt) {
    var i, j;
    // reposicion de comida y virus
    this.tComida += dt * 70;
    while (this.tComida >= 1 && this.nMuertas > 0) {
      this.tComida -= 1;
      var k = this.rng.entero(this.nMuertas), s = this.muertas[k]; this.muertas[k] = this.muertas[--this.nMuertas];
      this.nacerComida(s, (this.fgen[s] + 1) & 255);
    }
    if (this.tComida > 4) this.tComida = 4;
    this.tVirus += dt;
    if (this.tVirus > 3) { this.tVirus = 0; if (this.nV < this.nVirusObj) this.crearVirus(); }
    // zona
    if (this.zonaActiva) {
      var g = this.cfg.gracia, T = this.cfg.tiempo, R0 = this.tam * 0.72, R1 = this.tam * 0.09;
      this.zona = this.t < g ? R0 : R0 + (R1 - R0) * clamp((this.t - g) / (T - g - 30), 0, 1);
      var mid = this.tam / 2, z2 = this.zona * this.zona;
      for (i = 0; i < this.nC; i++) {
        var c = this.cells[i], dx = c.x - mid, dy = c.y - mid;
        if (dx * dx + dy * dy > z2) { var p = (c.m * 0.05 + 3) * dt; this.perdida += p; this.fijar(c, c.m - p); if (c.m <= C.MASA_MIN + 0.01) c.vivo = false; }
      }
    }
    // clasificacion y fin
    this.tLb -= dt;
    if (this.tLb <= 0) { this.tLb = 0.5; this.clasificar(); }
    this.tFin -= dt;
    if (this.tFin <= 0) { this.tFin = 1; this.evaluarFin(); }
  };

  P.clasificar = function () {
    var arr = this.lb; arr.length = 0;
    this.eqMasa[0] = this.eqMasa[1] = 0;
    for (var i = 0; i < this.jugs.length; i++) {
      var j = this.jugs[i]; if (!j) continue;
      if (j.cel.length) { arr.push(j.id); if (j.equipo >= 0) this.eqMasa[j.equipo] += j.masa; }
    }
    var J = this.jugs; arr.sort(function (a, b) { return J[b].masa - J[a].masa; });
    if (arr.length > 10) arr.length = 10;
  };

  P.vivosCuenta = function () { var n = 0; for (var i = 0; i < this.jugs.length; i++) { var j = this.jugs[i]; if (j && j.cel.length) n++; } return n; };
  P.evaluarFin = function () {
    if (this.estado !== 'jugando') return;
    var vivos = this.vivosCuenta(), cfg = this.cfg, fin = false, i, j, best = null;
    if (this.modo === 'superv' && vivos <= 1 && this.t > 5) fin = true;
    if (this.modo === 'batalla' && this.t > cfg.gracia + 5 && vivos <= 1) fin = true;
    if (cfg.tiempo && this.t >= cfg.tiempo) fin = true;
    if (!fin) return;
    this.estado = 'terminado';
    if (this.modo === 'equipos') {
      this.clasificar(); this.ganadorEq = this.eqMasa[0] >= this.eqMasa[1] ? 0 : 1;
    }
    for (i = 0; i < this.jugs.length; i++) { j = this.jugs[i]; if (j && j.cel.length && (!best || j.masa > best.masa)) best = j; }
    this.ganador = best ? best.id : -1;
    if (best && this.modo !== 'equipos') best.puesto = 1;
    if (this.alEvento) this.alEvento('fin', best, this.ganadorEq);
  };

  /* interpolacion para dibujar entre el paso anterior y el actual */
  P.prepararRender = function (alpha, dt) {
    var f = Math.min(1, dt * 14), i, c;
    for (i = 0; i < this.nC; i++) {
      c = this.cells[i]; c.rx = c.px + (c.x - c.px) * alpha; c.ry = c.py + (c.y - c.py) * alpha; c.rm = c.pm + (c.m - c.pm) * alpha;
      c.rr += (K * Math.sqrt(c.rm) - c.rr) * f;
    }
    for (i = 0; i < this.nV; i++) { c = this.virus[i]; c.rx = c.px + (c.x - c.px) * alpha; c.ry = c.py + (c.y - c.py) * alpha; c.rm = c.m; }
    for (i = 0; i < this.nE; i++) { c = this.ej[i]; c.rx = c.px + (c.x - c.px) * alpha; c.ry = c.py + (c.y - c.py) * alpha; }
  };

  /* ---------- guardado compacto ---------- */
  var q1 = function (v) { return Math.round(v * 10) / 10; };
  P.serializar = function () {
    var jg = [], i, k, j, c;
    for (i = 0; i < this.jugs.length; i++) {
      j = this.jugs[i]; if (!j) continue;
      var cel = [];
      for (k = 0; k < j.cel.length; k++) { c = j.cel[k]; cel.push([q1(c.x), q1(c.y), q1(c.m), Math.round(c.vx), Math.round(c.vy), q1(c.tf)]); }
      jg.push({ id: j.id, n: j.nombre, s: j.skin, b: j.bot ? 1 : 0, h: j.humano ? 1 : 0, e: j.equipo, tk: j.token, v: j.vivo ? 1 : 0, p: j.puesto, st: j.st, tv: q1(j.tVida), rt: q1(j.rt), c: cel });
    }
    var vi = [], ej = [], f = new Uint8Array(this.nFood * 2);
    for (i = 0; i < this.nV; i++) { c = this.virus[i]; vi.push([q1(c.x), q1(c.y), Math.round(c.vx), Math.round(c.vy), c.feed]); }
    for (i = 0; i < this.nE; i++) { c = this.ej[i]; ej.push([q1(c.x), q1(c.y), Math.round(c.vx), Math.round(c.vy), c.jid, q1(c.edad)]); }
    for (i = 0; i < this.nFood; i++) { f[i * 2] = this.fgen[i]; f[i * 2 + 1] = this.fvivo[i]; }
    return { v: 1, modo: this.modo, tam: this.tam, sem: this.semilla, dif: this.dif, bots: this.botsTotal, decay: this.decay, t: q1(this.t), rng: this.rng.s, estado: this.estado, j: jg, vi: vi, ej: ej, f: C.b64(f) };
  };
  Mundo.restaurar = function (d, extra) {
    var o = { modo: d.modo, tam: d.tam, semilla: d.sem, dificultad: d.dif, bots: 0, decay: d.decay, virus: 0 };
    for (var k in extra || {}) o[k] = extra[k];
    var m = new Mundo(o), i, k2;
    m.botsTotal = d.bots; m.nVirusObj = Math.max(4, Math.round(m.tam * m.tam / 1100000));
    m.t = d.t; m.rng.s = d.rng >>> 0; m.estado = d.estado || 'jugando';
    var f = C.deb64(d.f); m.hComida.limpiar(); m.nMuertas = 0;
    for (i = 0; i < m.nFood; i++) {
      m.fgen[i] = f[i * 2]; C.posComida(m.semilla, i, m.fgen[i], m.tam, _p); m.fx[i] = _p.x; m.fy[i] = _p.y;
      m.fvivo[i] = f[i * 2 + 1] && m.hComida.insertar(i, _p.x, _p.y) ? 1 : 0;
      if (!m.fvivo[i]) m.muertas[m.nMuertas++] = i;
    }
    for (i = 0; i < d.vi.length; i++) { var v = m.crearVirus(d.vi[i][0], d.vi[i][1], d.vi[i][2], d.vi[i][3]); if (v) v.feed = d.vi[i][4]; }
    var usados = {}; for (i = 0; i < d.j.length; i++) usados[d.j[i].id] = 1;
    var libres = []; while (m.idsJ.cnt) { var x = m.idsJ.sacar(); if (!usados[x]) libres.push(x); }
    m.idsJ = new C.Ids(C.MAX_JUG); m.idsJ.cnt = 0; m.idsJ.ini = 0;
    for (i = 0; i < libres.length; i++) m.idsJ.devolver(libres[i]);
    m.nHumanos = 0;
    for (i = 0; i < d.j.length; i++) {
      var s2 = d.j[i], j = {
        id: s2.id, nombre: s2.n, skin: s2.s, bot: !!s2.b, humano: !!s2.h, equipo: s2.e, token: s2.tk || '', redId: -1, cel: [], vivo: !!s2.v, ax: 0, ay: 0, pausa: false, cx: m.tam / 2, cy: m.tam / 2, masa: 0,
        iaT: 0, rt: s2.rt, cdEj: 0, puesto: s2.p, tVida: s2.tv, ultimo: -1, vw: 1400, vh: 900, iaEst: { gx: 0, gy: 0, ang: 0, t: 0 }, st: s2.st, espectar: -1
      };
      m.jugs[j.id] = j; if (j.humano) m.nHumanos++;
      for (k2 = 0; k2 < s2.c.length; k2++) {
        var cc = m.nuevaCelda(j, s2.c[k2][0], s2.c[k2][1], s2.c[k2][2]);
        if (cc) { cc.vx = s2.c[k2][3]; cc.vy = s2.c[k2][4]; cc.tf = s2.c[k2][5]; }
      }
      m.actualizarCOM(j);
    }
    for (i = 0; i < d.ej.length; i++) { var e = m.crearEyec(m.jugs[d.ej[i][4]] || { id: 0 }, d.ej[i][0], d.ej[i][1], d.ej[i][2], d.ej[i][3]); if (e) e.edad = d.ej[i][5]; }
    return m;
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
