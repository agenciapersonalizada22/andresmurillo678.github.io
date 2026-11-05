/* Motor de reglas del buscaminas (sin DOM). est: 0 cerrada, 1 abierta, 2 bandera, 3 duda, 4 mina explotada. */
(function (G) {
  'use strict';
  var BM = G.BM = G.BM || {};
  var cache = {};

  function tablaVec(w, h) {
    var k = w + 'x' + h; if (cache[k]) return cache[k];
    var n = w * h, v = new Int16Array(n * 8).fill(-1), c = new Uint8Array(n);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = y * w + x;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        var nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        v[i * 8 + c[i]++] = ny * w + nx;
      }
    }
    return (cache[k] = { v: v, c: c });
  }

  function crear(w, h, minas, fallos) {
    var n = w * h, t = tablaVec(w, h);
    return { w: w, h: h, n: n, minas: minas, mina: new Uint8Array(n), num: new Uint8Array(n), est: new Uint8Array(n),
      vec: t.v, nv: t.c, colocado: false, abiertas: 0, banderas: 0, explotadas: 0, estado: 'jugando', fallos: !!fallos, perdidaEn: -1 };
  }

  function calcularNum(w, h, mina) {
    var t = tablaVec(w, h), n = w * h, num = new Uint8Array(n);
    for (var i = 0; i < n; i++) {
      var s = 0; for (var k = 0; k < t.c[i]; k++) s += mina[t.v[i * 8 + k]];
      num[i] = s;
    }
    return num;
  }

  function colocar(T, mina) {
    T.mina.set(mina); T.num = calcularNum(T.w, T.h, T.mina); T.colocado = true;
    var m = 0; for (var i = 0; i < T.n; i++) m += T.mina[i]; T.minas = m;
  }

  function ganar(T) {
    T.estado = 'ganada'; T.banderas = 0;
    for (var i = 0; i < T.n; i++) if (T.mina[i]) { if (T.est[i] !== 4) T.est[i] = 2; T.banderas += T.est[i] === 2 ? 1 : 0; }
  }

  function abrir(T, i, R) {
    R = R || { abiertas: [], prof: [], minas: [], hecho: false };
    if (T.estado !== 'jugando') return R;
    var est = T.est;
    if (est[i] === 1 || est[i] === 2 || est[i] === 4) return R;
    R.hecho = true;
    if (T.mina[i]) {
      if (est[i] === 3) est[i] = 0;
      est[i] = 4; T.explotadas++; R.minas.push(i);
      if (!T.fallos) { T.estado = 'perdida'; T.perdidaEn = i; }
      return R;
    }
    var cola = [i], prof = [0], cab = 0;
    est[i] = 1; T.abiertas++;
    while (cab < cola.length) {
      var c = cola[cab], d = prof[cab]; cab++;
      R.abiertas.push(c); R.prof.push(d);
      if (T.num[c] !== 0) continue;
      for (var k = 0; k < T.nv[c]; k++) {
        var j = T.vec[c * 8 + k];
        if (est[j] === 0 || est[j] === 3) { est[j] = 1; T.abiertas++; cola.push(j); prof.push(d + 1); }
      }
    }
    if (T.estado === 'jugando' && T.abiertas === T.n - T.minas) ganar(T);
    return R;
  }

  function acorde(T, i) {
    var R = { abiertas: [], prof: [], minas: [], hecho: false };
    if (T.estado !== 'jugando' || T.est[i] !== 1 || T.num[i] === 0) return R;
    var f = 0, k, j;
    for (k = 0; k < T.nv[i]; k++) { j = T.vec[i * 8 + k]; if (T.est[j] === 2 || T.est[j] === 4) f++; }
    if (f !== T.num[i]) return R;
    R.hecho = true;
    for (k = 0; k < T.nv[i]; k++) {
      j = T.vec[i * 8 + k];
      if (T.est[j] === 0 || T.est[j] === 3) { abrir(T, j, R); if (T.estado !== 'jugando' && T.estado !== 'ganada') break; }
    }
    return R;
  }

  function bandera(T, i, duda) {
    if (T.estado !== 'jugando') return -1;
    var e = T.est[i];
    if (e === 0) { T.est[i] = 2; T.banderas++; }
    else if (e === 2) { T.banderas--; T.est[i] = duda ? 3 : 0; }
    else if (e === 3) T.est[i] = 0;
    else return -1;
    return T.est[i];
  }

  function restantes(T) { return T.minas - T.banderas - T.explotadas; }
  function progreso(T) { var s = T.n - T.minas; return s > 0 ? T.abiertas / s : 0; }

  function instantanea(T) { return { est: T.est.slice(), ab: T.abiertas, ban: T.banderas, exp: T.explotadas, estado: T.estado, pe: T.perdidaEn }; }
  function volver(T, s) { T.est.set(s.est); T.abiertas = s.ab; T.banderas = s.ban; T.explotadas = s.exp; T.estado = s.estado; T.perdidaEn = s.pe; }

  function serializarEst(T) { var s = ''; for (var i = 0; i < T.n; i++) s += T.est[i]; return s; }
  function restaurarEst(T, s) {
    T.abiertas = 0; T.banderas = 0; T.explotadas = 0;
    for (var i = 0; i < T.n; i++) {
      var e = s.charCodeAt(i) - 48; if (!(e >= 0 && e <= 4)) e = 0;
      T.est[i] = e;
      if (e === 1) T.abiertas++; else if (e === 2) T.banderas++; else if (e === 4) T.explotadas++;
    }
    T.estado = 'jugando'; T.perdidaEn = -1;
    if (T.abiertas === T.n - T.minas && T.minas > 0) ganar(T);
    else if (T.explotadas && !T.fallos) T.estado = 'perdida';
  }

  function mina2txt(mina) { var s = ''; for (var i = 0; i < mina.length; i++) s += mina[i] ? '1' : '0'; return s; }
  function txt2mina(s) { var m = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) m[i] = s.charCodeAt(i) === 49 ? 1 : 0; return m; }

  BM.motor = { tablaVec: tablaVec, crear: crear, calcularNum: calcularNum, colocar: colocar, abrir: abrir, acorde: acorde, bandera: bandera,
    restantes: restantes, progreso: progreso, instantanea: instantanea, volver: volver, serializarEst: serializarEst, restaurarEst: restaurarEst,
    mina2txt: mina2txt, txt2mina: txt2mina };
  if (typeof module !== 'undefined' && module.exports) module.exports = BM;
})(typeof window !== 'undefined' ? window : globalThis);
