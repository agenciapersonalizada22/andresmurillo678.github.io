/* Modelo de linea de tiempo (logica pura, sin DOM). VE.modelo */
(function (g) {
  var M = {}, _n = 0, MIN = 0.1, EPS = 1e-6;
  M.MIN = MIN;
  M.uid = function (p) { return (p || 'i') + Date.now().toString(36) + (++_n).toString(36) + Math.random().toString(36).slice(2, 5); };
  M.ASPECTOS = { '9:16': [1080, 1920], '1:1': [1080, 1080], '4:5': [1080, 1350], '16:9': [1920, 1080] };
  M.COMPAT = { video: ['video', 'imagen', 'forma'], pip: ['video', 'imagen', 'emoji', 'forma'], texto: ['texto', 'emoji', 'forma'], audio: ['audio'], musica: ['audio'] };
  M.compatible = function (pista, clip) { return M.COMPAT[pista.tipo].indexOf(clip.tipo) >= 0; };
  M.AJ0 = function () { return { brillo: 0, contraste: 0, sat: 0, temp: 0, vineta: 0, bn: 0, vhs: 0 }; };

  M.nuevo = function (o) {
    o = o || {};
    var P = ['texto', 'pip', 'video', 'audio', 'musica'];
    return {
      v: 1, id: o.id || M.uid('p'), nombre: o.nombre || 'Proyecto sin título', aspecto: o.aspecto || '9:16', fps: o.fps || 30, fondo: '#000000',
      medios: {}, pistas: P.map(function (t) { return { id: 't_' + t, tipo: t, clips: [] }; }), marcadores: [], creado: Date.now(), mod: Date.now()
    };
  };
  M.dims = function (p) { return M.ASPECTOS[p.aspecto] || M.ASPECTOS['9:16']; };
  M.clip = function (tipo, o) {
    var c = {
      id: M.uid('c'), tipo: tipo, medio: null, ini: 0, dur: 3, off: 0, vel: 1, inv: false, cong: false,
      vol: 1, mute: false, fi: 0, fo: 0, tono: true,
      x: 0, y: 0, esc: 1, rot: 0, op: 1, flip: false, fit: 'cubrir', rec: null, foco: null,
      filtro: 'ninguno', aj: M.AJ0(), croma: null, estab: false, trans: null, kf: {}
    };
    for (var k in o) c[k] = o[k];
    return c;
  };
  M.fin = function (c) { return c.ini + c.dur; };
  M.todos = function (p) { var r = []; p.pistas.forEach(function (t) { t.clips.forEach(function (c) { r.push(c); }); }); return r; };
  M.buscar = function (p, id) {
    for (var i = 0; i < p.pistas.length; i++) { var t = p.pistas[i]; for (var j = 0; j < t.clips.length; j++) if (t.clips[j].id === id) return { clip: t.clips[j], pista: t, i: j }; }
    return null;
  };
  M.duracion = function (p) { var d = 0; M.todos(p).forEach(function (c) { d = Math.max(d, M.fin(c)); }); return d; };
  M.ordenar = function (t) { t.clips.sort(function (a, b) { return a.ini - b.ini; }); };
  M.activos = function (p, t) { return M.todos(p).filter(function (c) { return t >= c.ini - EPS && t < M.fin(c) - EPS; }); };

  M.tiempoFuente = function (c, t) {
    var l = Math.max(0, Math.min(c.dur, t - c.ini));
    if (c.cong) return c.off;
    return c.inv ? c.off + (c.dur - l) * c.vel : c.off + l * c.vel;
  };

  function libre(pista, ini, dur, excl) {
    var fin = ini + dur;
    return pista.clips.every(function (o) { return o.id === excl || o.ini >= fin - EPS || M.fin(o) <= ini + EPS; });
  }
  M.libre = libre;
  M.ubicar = function (pista, clip, ini) {
    ini = Math.max(0, ini);
    if (libre(pista, ini, clip.dur, clip.id)) return ini;
    var cand = [];
    pista.clips.forEach(function (o) {
      if (o.id === clip.id) return;
      cand.push(M.fin(o), o.ini - clip.dur);
    });
    cand.push(0);
    var best = null;
    cand.forEach(function (x) { if (x >= -EPS && libre(pista, Math.max(0, x), clip.dur, clip.id) && (best === null || Math.abs(x - ini) < Math.abs(best - ini))) best = Math.max(0, x); });
    return best;
  };
  M.addPista = function (p, tipo, pos) {
    var t = { id: M.uid('t'), tipo: tipo, clips: [] };
    if (pos === undefined) {
      var idx = -1; p.pistas.forEach(function (x, i) { if (x.tipo === tipo) idx = i; });
      p.pistas.splice(idx < 0 ? 0 : idx + 1, 0, t);
    } else p.pistas.splice(pos, 0, t);
    return t;
  };
  M.pistaPara = function (p, clip, preferida) {
    var ok = function (t) { return M.compatible(t, clip); };
    var cand = [];
    if (preferida) { var pp = p.pistas.filter(function (t) { return t.id === preferida; })[0]; if (pp && ok(pp)) cand.push(pp); }
    var pref = clip.tipo === 'audio' ? ['audio'] : clip.tipo === 'video' || clip.tipo === 'imagen' || clip.forma === 'fondo' ? ['video', 'pip'] : ['texto', 'pip'];
    pref.forEach(function (tp) { p.pistas.forEach(function (t) { if (t.tipo === tp && cand.indexOf(t) < 0) cand.push(t); }); });
    for (var i = 0; i < cand.length; i++) if (libre(cand[i], clip.ini, clip.dur)) return cand[i];
    return M.addPista(p, pref[0]);
  };
  M.agregar = function (p, clip, pistaId) {
    var t = M.pistaPara(p, clip, pistaId);
    t.clips.push(clip); M.ordenar(t); return clip;
  };

  M.dividir = function (p, id, t) {
    var f = M.buscar(p, id); if (!f) return null;
    var c = f.clip, fin = M.fin(c);
    if (t <= c.ini + EPS * 10 || t >= fin - EPS * 10) return null;
    var izq = c.dur, d1 = t - c.ini, d2 = fin - t, r = JSON.parse(JSON.stringify(c));
    r.id = M.uid('c'); r.ini = t; r.dur = d2; c.dur = d1;
    if (!c.cong) { if (c.inv) c.off = c.off + d2 * c.vel; else r.off = c.off + d1 * c.vel; }
    c.fo = 0; r.fi = 0; r.trans = null;
    var K = require_kf();
    ['x', 'y', 'esc', 'op', 'rot'].forEach(function (k) {
      if (c.kf[k] && c.kf[k].length) { r.kf[k] = K.cortar(c.kf[k], d1); c.kf[k] = c.kf[k].filter(function (e) { return e.t <= d1; }); }
    });
    if (izq && c.texto !== undefined) r.texto = c.texto;
    f.pista.clips.push(r); M.ordenar(f.pista);
    return r;
  };
  function require_kf() { return (typeof require === 'function' && typeof module !== 'undefined') ? require('./keyframes.js') : g.VE.keyframes; }

  function limitesVecinos(f, c) {
    var prev = 0, next = Infinity;
    f.pista.clips.forEach(function (o) {
      if (o.id === c.id) return;
      if (M.fin(o) <= c.ini + EPS && M.fin(o) > prev) prev = M.fin(o);
      if (o.ini >= M.fin(c) - EPS && o.ini < next) next = o.ini;
    });
    return { prev: prev, next: next };
  }
  function acotado(c, med) { return med && (c.tipo === 'video' || c.tipo === 'audio') && !c.cong && med.dur && isFinite(med.dur); }
  M.recortarFin = function (p, id, nuevoFin) {
    var f = M.buscar(p, id); if (!f) return false;
    var c = f.clip, med = p.medios[c.medio], nb = limitesVecinos(f, c);
    var nd = Math.max(MIN, Math.min(nuevoFin, nb.next) - c.ini);
    if (acotado(c, med)) {
      if (!c.inv) nd = Math.min(nd, (med.dur - c.off) / c.vel);
      else if (nd > c.dur) nd = Math.min(nd, c.dur + c.off / c.vel);
    }
    if (c.inv && !c.cong) c.off = Math.max(0, c.off + (c.dur - nd) * c.vel);
    c.dur = nd; return true;
  };
  M.recortarIni = function (p, id, nuevoIni) {
    var f = M.buscar(p, id); if (!f) return false;
    var c = f.clip, med = p.medios[c.medio], nb = limitesVecinos(f, c), fin = M.fin(c);
    var ni = Math.min(Math.max(nuevoIni, nb.prev), fin - MIN), delta = ni - c.ini;
    if (acotado(c, med)) {
      if (!c.inv) { if (delta < 0) delta = Math.max(delta, -c.off / c.vel); }
      else { var nd = Math.min(c.dur - delta, (med.dur - c.off) / c.vel); delta = c.dur - nd; }
    }
    c.ini += delta; c.dur -= delta;
    if (!c.inv && !c.cong) c.off += delta * c.vel;
    if (c.off < 0) c.off = 0;
    return true;
  };
  M.puntosIman = function (p, excl, extra) {
    var pts = [0];
    M.todos(p).forEach(function (c) { if (c.id !== excl) { pts.push(c.ini, M.fin(c)); } });
    p.marcadores.forEach(function (m) { pts.push(m.t); });
    (extra || []).forEach(function (x) { pts.push(x); });
    return pts;
  };
  M.iman = function (t, pts, tol) {
    var b = t, bd = tol;
    pts.forEach(function (x) { var d = Math.abs(x - t); if (d <= bd) { bd = d; b = x; } });
    return b;
  };
  M.mover = function (p, id, nuevoIni, pistaId, opc) {
    opc = opc || {};
    var f = M.buscar(p, id); if (!f) return false;
    var c = f.clip, dest = f.pista;
    if (pistaId && pistaId !== f.pista.id) {
      var d = p.pistas.filter(function (t) { return t.id === pistaId; })[0];
      if (d && M.compatible(d, c)) dest = d;
    }
    var ini = Math.max(0, nuevoIni);
    if (opc.iman) {
      var pts = M.puntosIman(p, id, opc.extra), a = M.iman(ini, pts, opc.tol), b = M.iman(ini + c.dur, pts, opc.tol);
      if (a !== ini) ini = a; else if (b !== ini + c.dur) ini = b - c.dur;
    }
    ini = Math.max(0, ini);
    var u = M.ubicar(dest, c, ini); if (u === null) return false;
    if (dest !== f.pista) { f.pista.clips.splice(f.i, 1); dest.clips.push(c); }
    c.ini = u; M.ordenar(dest); return true;
  };
  M.cerrarHuecos = function (pista) {
    M.ordenar(pista); var t = 0;
    pista.clips.forEach(function (c) { c.ini = t; t += c.dur; });
  };
  M.eliminar = function (p, id, cerrar) {
    var f = M.buscar(p, id); if (!f) return false;
    var c = f.clip; f.pista.clips.splice(f.i, 1);
    if (cerrar) f.pista.clips.forEach(function (o) { if (o.ini >= M.fin(c) - EPS) o.ini = Math.max(0, o.ini - c.dur); });
    return true;
  };
  M.duplicar = function (p, id) {
    var f = M.buscar(p, id); if (!f) return null;
    var r = JSON.parse(JSON.stringify(f.clip)); r.id = M.uid('c'); r.trans = null;
    var u = M.ubicar(f.pista, r, M.fin(f.clip));
    if (u === null) return null;
    r.ini = u; f.pista.clips.push(r); M.ordenar(f.pista); return r;
  };
  M.velocidad = function (p, id, v) {
    var f = M.buscar(p, id); if (!f) return false;
    v = Math.max(0.25, Math.min(4, v)); var c = f.clip, span = c.dur * c.vel, nd = span / v;
    var nb = limitesVecinos(f, c);
    if (c.ini + nd > nb.next) { nd = nb.next - c.ini; span = nd * v; if (c.inv) c.off += (c.dur * c.vel - span); }
    c.vel = v; c.dur = nd; return true;
  };
  M.congelar = function (p, id, t, dur) {
    var f = M.buscar(p, id); if (!f || f.clip.tipo !== 'video') return null;
    dur = dur || 2;
    var c = f.clip, ts = M.tiempoFuente(c, t), pista = f.pista;
    var r = M.dividir(p, id, t);
    var fr = JSON.parse(JSON.stringify(c)); fr.id = M.uid('c'); fr.ini = t; fr.dur = dur; fr.cong = true; fr.off = ts; fr.inv = false; fr.vel = 1; fr.trans = null; fr.fi = 0; fr.fo = 0; fr.mute = true; fr.kf = {};
    pista.clips.forEach(function (o) { if (o.ini >= t - EPS) o.ini += dur; });
    pista.clips.push(fr); M.ordenar(pista); return fr;
  };
  M.extraerAudio = function (p, id) {
    var f = M.buscar(p, id); if (!f || f.clip.tipo !== 'video') return null;
    var c = f.clip, a = M.clip('audio', { medio: c.medio, ini: c.ini, dur: c.dur, off: c.off, vel: c.vel, inv: c.inv, vol: c.vol, tono: c.tono, nombre: 'Audio extraído' });
    var t = M.pistaPara(p, a); t.clips.push(a); M.ordenar(t);
    c.mute = true; return a;
  };
  M.addMarcador = function (p, t, nombre) { p.marcadores.push({ id: M.uid('m'), t: t, nombre: nombre || '' }); p.marcadores.sort(function (a, b) { return a.t - b.t; }); };
  M.quitarMarcador = function (p, id) { p.marcadores = p.marcadores.filter(function (m) { return m.id !== id; }); };
  M.siguienteCorte = function (p, t, dir) {
    var pts = []; M.todos(p).forEach(function (c) { pts.push(c.ini, M.fin(c)); });
    pts = pts.filter(function (x, i, a) { return a.indexOf(x) === i; }).sort(function (a, b) { return a - b; });
    if (dir > 0) { for (var i = 0; i < pts.length; i++) if (pts[i] > t + 0.02) return pts[i]; return t; }
    for (var j = pts.length - 1; j >= 0; j--) if (pts[j] < t - 0.02) return pts[j];
    return 0;
  };

  /* Historial ilimitado (instantaneas JSON) */
  M.Historia = function (p) { this.estados = [JSON.stringify(p)]; this.i = 0; this.clave = null; this.tc = 0; };
  M.Historia.prototype.commit = function (p, clave) {
    var s = JSON.stringify(p); if (s === this.estados[this.i]) return false;
    var now = Date.now();
    if (clave && clave === this.clave && now - this.tc < 700 && this.i > 0) { this.estados[this.i] = s; }
    else { this.estados.length = this.i + 1; this.estados.push(s); this.i++; }
    this.clave = clave || null; this.tc = now; return true;
  };
  M.Historia.prototype.puedeDeshacer = function () { return this.i > 0; };
  M.Historia.prototype.puedeRehacer = function () { return this.i < this.estados.length - 1; };
  M.Historia.prototype.deshacer = function () { if (!this.puedeDeshacer()) return null; this.clave = null; return JSON.parse(this.estados[--this.i]); };
  M.Historia.prototype.rehacer = function () { if (!this.puedeRehacer()) return null; this.clave = null; return JSON.parse(this.estados[++this.i]); };

  M.fmt = function (s, cs) {
    s = Math.max(0, s || 0); var m = Math.floor(s / 60), r = s - m * 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r.toFixed(cs ? 2 : 1);
  };

  g.VE = g.VE || {}; g.VE.modelo = M;
  if (typeof module !== 'undefined') module.exports = M;
})(typeof window !== 'undefined' ? window : globalThis);
