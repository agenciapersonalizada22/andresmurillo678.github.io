/* Mundo: simulacion autoritativa (anfitrion / solo). Sin DOM. */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, C = S.C, TAU = S.TAU;

  function Mundo(cfg) {
    this.cfg = cfg = cfg || {};
    this.modo = S.MODOS[cfg.modo] || S.MODOS.ffa;
    this.dif = S.DIFS[cfg.dif] || S.DIFS.normal;
    this.total = cfg.total || this.modo.total;
    this.rnd = S.rng(cfg.semilla || ((Math.random() * 4294967296) >>> 0));
    this.R = C.R; this.Rc = C.R; this.t = 0; this.fin = null; this.sigId = 1;
    this.orbes = new S.Orbes(C.R, C.MAX_ORBES);
    this.serps = []; this.vivas = []; this.porId = {}; this.ev = [];
    this.seg = new S.Rejilla(C.R, 64, C.MAX_SEG);
    this.sx = new Float32Array(C.MAX_SEG); this.sy = new Float32Array(C.MAX_SEG); this.sr = new Float32Array(C.MAX_SEG);
    this.so = new Int16Array(C.MAX_SEG); this.sk = new Int16Array(C.MAX_SEG); this.nSeg = 0;
    this.zona = null; this.eqMasa = [0, 0]; this.tMantener = 0; this.tRecorte = 0; this.pendBots = 0; this.cuenta = 0;
    this._yo = null; this._fnC = null; this._fnO = null;
    var self = this;
    this._fnC = function (i) { return self._colisiona(i); };
    this._fnO = function (i) { return self._come(i); };
    if (this.modo.id === 'rey') this._moverZona(true);
    if (!cfg.vacio) this._poblar();
  }
  var P = Mundo.prototype;

  P._poblar = function () {
    this.reponerOrbes(C.OBJ_ORBES);
  };
  P.reponerOrbes = function (hasta) {
    var o = this.orbes, tope = Math.min(hasta, C.MAX_ORBES - 600);
    var cuantos = 0;
    while (o.n < tope && cuantos < 260) {
      var a = this.rnd() * TAU, d = Math.sqrt(this.rnd()) * (this.Rc - 40), r = this.rnd(), v = r < 0.72 ? 1 : r < 0.93 ? 2 : 5;
      if (this.rnd() < 0.08) { // pequenos cumulos
        var bx = Math.cos(a) * d, by = Math.sin(a) * d;
        for (var k = 0; k < 6; k++) o.agregar(bx + (this.rnd() - .5) * 90, by + (this.rnd() - .5) * 90, 1);
        cuantos += 6;
      } else { o.agregar(Math.cos(a) * d, Math.sin(a) * d, v); cuantos++; }
    }
  };
  P.puntoLibre = function (minDist, ring) {
    var best = null, bd = -1;
    for (var t = 0; t < 14; t++) {
      var a = this.rnd() * TAU, d = ring ? this.Rc * 0.85 : Math.sqrt(this.rnd()) * this.Rc * 0.8, x = Math.cos(a) * d, y = Math.sin(a) * d, m = 1e9;
      for (var i = 0; i < this.vivas.length; i++) { var s = this.vivas[i], dd = Math.hypot(s.x - x, s.y - y); if (dd < m) m = dd; }
      if (m > minDist) return { x: x, y: y, a: a };
      if (m > bd) { bd = m; best = { x: x, y: y, a: a }; }
    }
    return best;
  };
  P.crear = function (o) {
    var s = new S.Serpiente(this.sigId++);
    s.nombre = o.nombre || 'Serpiente'; s.skin = o.skin; s.bot = !!o.bot; s.equipo = o.equipo == null ? -1 : o.equipo; s.red = o.red || null;
    if (s.bot) s.ia = { t: this.rnd() * 0.3, modo: 0, obj: 0, orb: this.rnd() < .5 ? 1 : -1, rc: 0, noise: 0, nt: 0 };
    this.ubicar(s, o.masa);
    this.serps.push(s); this.porId[s.id] = s; this.vivas.push(s);
    this.ev.push({ t: 'nace', id: s.id });
    return s;
  };
  P.ubicar = function (s, masa) {
    var p = this.puntoLibre(500, this.modo.id === 'superv');
    s.reiniciar(p.x, p.y, Math.atan2(-p.y, -p.x) + (this.rnd() - .5) * 0.8, masa || C.MASA_INI);
    if (s.ia) s.ia.rc = 0;
  };
  P.equipoMenor = function () {
    var c = [0, 0];
    for (var i = 0; i < this.serps.length; i++) { var e = this.serps[i].equipo; if (e >= 0) c[e]++; }
    return c[0] <= c[1] ? 0 : 1;
  };
  P.nuevoBot = function () {
    var S2 = S, nombre = S2.NOMBRES_BOT[(this.rnd() * S2.NOMBRES_BOT.length) | 0];
    var eq = this.modo.equipos ? this.equipoMenor() : -1;
    var skin = S2.Skins ? S2.Skins.aleatoria(this.rnd) : null;
    if (skin && eq >= 0) skin = S2.Skins.deEquipo(skin, eq);
    return this.crear({ nombre: nombre, skin: skin, bot: true, equipo: eq });
  };
  P.humano = function (o) { // jugador (local o remoto)
    if (this.modo.equipos && o.equipo == null) o.equipo = this.equipoMenor();
    var s = this.crear(o);
    s.humano = true;
    return s;
  };
  P.quitar = function (s) {
    var i = this.serps.indexOf(s); if (i >= 0) this.serps.splice(i, 1);
    i = this.vivas.indexOf(s); if (i >= 0) this.vivas.splice(i, 1);
    delete this.porId[s.id]; this.ev.push({ t: 'sale', id: s.id });
  };
  P.reaparecer = function (s, masa) {
    if (!this.modo.respawn || this.fin) return false;
    this.ubicar(s, masa);
    if (this.vivas.indexOf(s) < 0) this.vivas.push(s);
    this.ev.push({ t: 'reaparece', id: s.id });
    return true;
  };

  /* ---------- paso ---------- */
  P.paso = function (dt) {
    if (this.fin) return;
    this.t += dt; this.cuenta++;
    var i, s, vivas = this.vivas;
    for (i = 0; i < vivas.length; i++) {
      s = vivas[i];
      if (s.bot) { s.ia.t -= dt; if (s.ia.t <= 0) { s.ia.t = this.dif.ia * (0.8 + this.rnd() * 0.4); S.IA.decidir(this, s); } }
      s.paso(dt);
      if (s.estela >= 1.6) { this.soltarEstela(s); }
      if (s.masa > s.est.maxMasa) s.est.maxMasa = s.masa;
    }
    this._rejilla();
    var muertes = null;
    this.Rc = this.modo.id === 'superv' ? this.R * (1 - 0.78 * S.clamp((this.t - 25) / 300, 0, 1)) : this.R;
    for (i = 0; i < vivas.length; i++) {
      s = vivas[i];
      if (Math.hypot(s.x, s.y) + s.r * 0.4 > this.Rc) { (muertes = muertes || []).push([s, null, 'borde']); continue; }
      this._yo = s; this._mataA = null; this._tipo = null;
      if (s.inmune <= 0) {
        this.seg.cerca(s.x, s.y, s.r + 30, this._fnC);
        if (this._mataA) { (muertes = muertes || []).push([s, this._mataA, this._tipo]); continue; }
      }
      this.orbes.rej.cerca(s.x, s.y, s.r + 18, this._fnO);
    }
    if (muertes) for (i = 0; i < muertes.length; i++) if (muertes[i][0].vivo) this.matar(muertes[i][0], muertes[i][1], muertes[i][2]);
    this.tMantener -= dt;
    if (this.tMantener <= 0) { this.tMantener = 0.5; this._mantener(); }
    this._modo(dt);
    for (i = 0; i < this.serps.length; i++) { s = this.serps[i]; if (!s.vivo && s.bot) this.quitar(s), i--; }
  };
  P._rejilla = function () {
    var g = this.seg, n = 0, v = this.vivas, max = C.MAX_SEG;
    g.limpiar();
    for (var i = 0; i < v.length; i++) {
      var s = v[i], sg = s.segs;
      for (var k = 0; k < s.ns && n < max; k++, n++) {
        var x = sg[k * 2], y = sg[k * 2 + 1];
        this.sx[n] = x; this.sy[n] = y; this.sr[n] = s.r; this.so[n] = s.id; this.sk[n] = k;
        g.agregar(n, x, y);
      }
    }
    this.nSeg = n;
  };
  P._colisiona = function (i) {
    var s = this._yo, oid = this.so[i];
    if (oid === s.id) return false;
    var dx = this.sx[i] - s.x, dy = this.sy[i] - s.y, lim = (s.r + this.sr[i]) * 0.7;
    if (dx * dx + dy * dy >= lim * lim) return false;
    var o = this.porId[oid];
    if (!o || !o.vivo || (s.equipo >= 0 && o.equipo === s.equipo)) return false;
    if (this.sk[i] === 0) { if (o.inmune > 0 || s.masa > o.masa) return false; }
    this._mataA = o; this._tipo = this.sk[i] === 0 ? 'cabeza' : 'cuerpo'; return true;
  };
  P._come = function (i) {
    var s = this._yo, o = this.orbes, dx = o.x[i] - s.x, dy = o.y[i] - s.y, rr = s.r + 14;
    if (dx * dx + dy * dy > rr * rr) return false;
    var v = o.v[i]; s.masa += v; s.est.orbes++; o.quitar(i);
    if (s.humano) this.ev.push({ t: 'come', id: s.id, v: v });
    return false;
  };
  P.soltarEstela = function (s) {
    s.estela -= 1.0;
    var k = s.ns - 1;
    this.orbes.agregar(s.segs[k * 2] + (this.rnd() - .5) * 6, s.segs[k * 2 + 1] + (this.rnd() - .5) * 6, 0.8);
  };
  P.matar = function (s, killer, tipo) {
    if (!s.vivo) return;
    s.vivo = false; s.turbo = false; s.muertoT = this.t;
    var i = this.vivas.indexOf(s); if (i >= 0) this.vivas.splice(i, 1);
    var drop = s.masa * 0.78, n = S.clamp(Math.floor(drop / 3), 6, 110), v = drop / n;
    for (var j = 0; j < n; j++) {
      var k = Math.min(s.ns - 1, Math.floor(j * (s.ns - 1) / Math.max(1, n - 1)));
      var a = this.rnd() * TAU, d = this.rnd() * s.r;
      this.orbes.agregar(s.segs[k * 2] + Math.cos(a) * d, s.segs[k * 2 + 1] + Math.sin(a) * d, v);
    }
    if (killer && killer !== s) { killer.est.kills++; }
    var puesto = this.vivas.length + 1;
    this.ev.push({ t: 'muerte', id: s.id, killer: killer ? killer.id : 0, tipo: tipo, masa: s.masa, puesto: puesto, x: s.x, y: s.y, humano: !!s.humano });
    if (!this.modo.respawn) this._finSuperv();
  };

  /* ---------- reglas por modo ---------- */
  P._mantener = function () {
    this.reponerOrbes(C.OBJ_ORBES);
    var hum = 0, bots = 0;
    for (var i = 0; i < this.serps.length; i++) { var s = this.serps[i]; if (s.bot) bots++; else hum++; }
    if (this.modo.respawn || this.t < 1) {
      var falta = this.total - hum - bots;
      if (this.t < 1) while (falta-- > 0) this.nuevoBot();
      else if (falta > 0 && this.rnd() < 0.7) this.nuevoBot();
      else if (falta < 0) { var peq = null; for (var b = 0; b < this.vivas.length; b++) if (this.vivas[b].bot && (!peq || this.vivas[b].masa < peq.masa)) peq = this.vivas[b]; if (peq) this.matar(peq, null, 'recorte'); }
    }
    for (var h = 0; h < this.serps.length; h++) { // reaparicion de humanos
      var q = this.serps[h];
      if (!q.vivo && q.humano && q.autoReaparecer && this.t - q.muertoT > C.REAPARECE) this.reaparecer(q, q.masaRespawn);
    }
  };
  P._moverZona = function (primera) {
    var a = this.rnd() * TAU, d = primera ? 0 : Math.sqrt(this.rnd()) * this.R * 0.55;
    this.zona = { x: Math.cos(a) * d, y: Math.sin(a) * d, r: 380, desde: this.t };
  };
  P._modo = function (dt) {
    var id = this.modo.id, i, s;
    if (id === 'rey') {
      if (this.t - this.zona.desde > 45) this._moverZona(false);
      for (i = 0; i < this.vivas.length; i++) {
        s = this.vivas[i];
        if (Math.hypot(s.x - this.zona.x, s.y - this.zona.y) < this.zona.r) {
          s.pt += dt; s.est.zona = (s.est.zona || 0) + dt;
          if (s.pt >= this.modo.meta) { this.fin = { tipo: 'rey', ganador: s.id }; this.ev.push({ t: 'fin', fin: this.fin }); return; }
        }
      }
    } else if (id === 'equipos') {
      if (this.cuenta % 30 === 0) {
        this.eqMasa[0] = this.eqMasa[1] = 0;
        for (i = 0; i < this.vivas.length; i++) { s = this.vivas[i]; if (s.equipo >= 0) this.eqMasa[s.equipo] += s.masa; }
      }
      if (this.t >= this.modo.duracion) {
        this.fin = { tipo: 'equipos', ganador: this.eqMasa[0] === this.eqMasa[1] ? -1 : this.eqMasa[0] > this.eqMasa[1] ? 0 : 1, masa: this.eqMasa.slice() };
        this.ev.push({ t: 'fin', fin: this.fin });
      }
    } else if (id === 'superv') {
      this.tRecorte -= dt;
      if (this.tRecorte <= 0) {
        this.tRecorte = 2; var o = this.orbes, lim = this.Rc * 0.99;
        for (var k = 0; k < C.MAX_ORBES; k++) if (o.vivo[k] && Math.hypot(o.x[k], o.y[k]) > lim) o.quitar(k);
      }
    }
  };
  P._finSuperv = function () {
    var hum = 0, tot = this.vivas.length;
    for (var i = 0; i < this.vivas.length; i++) if (!this.vivas[i].bot) hum++;
    var hayHumanos = false;
    for (var j = 0; j < this.serps.length; j++) if (this.serps[j].humano) hayHumanos = true;
    if (tot <= 1 || (hayHumanos && hum === 0)) {
      this.fin = { tipo: 'superv', ganador: tot === 1 ? this.vivas[0].id : 0 };
      this.ev.push({ t: 'fin', fin: this.fin });
    }
  };
  P.tabla = function (n) { // clasificacion por masa (o puntos en rey)
    var rey = this.modo.id === 'rey', a = this.vivas.slice();
    a.sort(function (p, q) { return rey ? q.pt - p.pt || q.masa - p.masa : q.masa - p.masa; });
    return n ? a.slice(0, n) : a;
  };
  P.drenar = function () { var e = this.ev; this.ev = []; return e; };

  /* ---------- guardado ---------- */
  P.exportar = function () {
    var o = this.orbes, ob = [];
    for (var i = 0; i < o.cap; i++) if (o.vivo[i]) ob.push(Math.round(o.x[i]), Math.round(o.y[i]), Math.round(o.v[i] * 10));
    var ss = this.serps.map(function (s) {
      var seg = [], k; for (k = 0; k < s.ns * 2; k++) seg.push(Math.round(s.segs[k] * 10) / 10);
      return { id: s.id, n: s.nombre, k: s.skin, b: s.bot ? 1 : 0, h: s.humano ? 1 : 0, e: s.equipo, x: s.x, y: s.y, a: s.ang, m: s.masa, v: s.vivo ? 1 : 0, pt: s.pt, ms: s.masaRespawn, est: s.est, ia: s.ia ? 1 : 0, tk: s.red && s.red.token || '', seg: s.vivo ? seg : [] };
    });
    return { v: 1, cfg: { modo: this.cfg.modo, dif: this.cfg.dif, total: this.total }, t: this.t, sigId: this.sigId, ob: ob, ss: ss, zona: this.zona, fin: this.fin };
  };
  Mundo.importar = function (d) {
    var W = new Mundo({ modo: d.cfg.modo, dif: d.cfg.dif, total: d.cfg.total, vacio: true });
    W.t = d.t; W.sigId = d.sigId; W.zona = d.zona; W.fin = d.fin;
    for (var i = 0; i < d.ob.length; i += 3) W.orbes.agregar(d.ob[i], d.ob[i + 1], d.ob[i + 2] / 10);
    d.ss.forEach(function (o) {
      var s = new S.Serpiente(o.id);
      s.nombre = o.n; s.skin = o.k; s.bot = !!o.b; s.humano = !!o.h; s.equipo = o.e; s.pt = o.pt || 0; s.masaRespawn = o.ms;
      if (o.tk) s.red = { token: o.tk };
      if (o.ia) s.ia = { t: 0, modo: 0, obj: 0, orb: 1, rc: 0, noise: 0, nt: 0 };
      s.est = o.est || s.est;
      s.reiniciar(o.x, o.y, o.a, o.m);
      s.inmune = 0; s.vivo = !!o.v; s.est = o.est || s.est;
      if (o.v && o.seg.length) s.desdeSegs(o.seg);
      W.serps.push(s); W.porId[s.id] = s; if (s.vivo) W.vivas.push(s);
    });
    return W;
  };
  S.Mundo = Mundo;
})(typeof window !== 'undefined' ? window : globalThis);
