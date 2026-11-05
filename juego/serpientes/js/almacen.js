/* Almacenamiento unico (localStorage). Claves con prefijo del juego; ajustes de dispositivo aparte (nunca se sincronizan). */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, A = S.Almacen = {};
  var CL = A.CL = { disp: 'serpientes_ajustes_dispositivo', aj: 'serpientes_ajustes', prog: 'serpientes_progreso', partida: 'serpientes_partida', sala: 'serpientes_sala', asiento: 'serpientes_asiento' };
  var DISP = {
    graficos: { calidad: 'media', fps: false, auto: true, nombres: true, particulas: true },
    controles: { sens: 1, teclas: { izq: 'KeyA', der: 'KeyD', izq2: 'ArrowLeft', der2: 'ArrowRight', turbo: 'Space', pausa: 'KeyP' }, zona: 0.18, vibracion: true, tactilTam: 1, tactilOp: 0.75, tactilPos: 0, zurdo: false }
  };
  var AJ = { audio: { maestro: 0.8, musica: 0.35, efectos: 0.9, pausaOculta: true }, acc: { textoGrande: false, dalton: 'ninguno', reducir: false }, modo: 'ffa', dif: 'normal', ayudaVista: false, tutorialVisto: false };
  var PROG = { record: 0, skin: null, skins: [], stats: { partidas: 0, kills: 0, muertes: 0, orbes: 0, tiempo: 0, maxMasa: 0, turbo: 0, victorias: 0, mpPartidas: 0 }, logros: {}, mejores: {} };
  function clon(o) { return JSON.parse(JSON.stringify(o)); }
  function mezclar(def, v) {
    if (v == null || typeof v !== 'object' || Array.isArray(def)) return v === undefined ? clon(def) : v;
    var r = {}, k;
    for (k in def) r[k] = (def[k] !== null && typeof def[k] === 'object' && !Array.isArray(def[k])) ? mezclar(def[k], v[k]) : (v[k] === undefined || typeof v[k] !== typeof def[k] ? def[k] : v[k]);
    for (k in v) if (!(k in def)) r[k] = v[k];
    return r;
  }
  A.leer = function (k, def) { try { var t = G.localStorage.getItem(k); return t == null ? def : JSON.parse(t); } catch (e) { return def; } };
  A.escribir = function (k, v) { try { G.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  A.borrar = function (k) { try { G.localStorage.removeItem(k); } catch (e) {} };
  A.disp = mezclar(DISP, A.leer(CL.disp, null) || {});
  A.aj = mezclar(AJ, A.leer(CL.aj, null) || {});
  A.prog = mezclar(PROG, A.leer(CL.prog, null) || {});
  /* vuelve a leer el progreso de localStorage (tras una bajada de la nube o al iniciar sesion) */
  A.recargar = function () { A.prog = mezclar(PROG, A.leer(CL.prog, null) || {}); };
  A.guardarDisp = function () { A.escribir(CL.disp, A.disp); };
  A.guardarAj = function () { A.escribir(CL.aj, A.aj); };
  A.guardarProg = function () { A.escribir(CL.prog, A.prog); };
  A.restablecerDisp = function () { A.disp = clon(DISP); A.guardarDisp(); };
  /* exportar / importar: texto base64 con ajustes y progreso (sin ajustes de dispositivo ni partidas en curso) */
  A.exportar = function () {
    var j = JSON.stringify({ juego: 'serpientes', v: 1, aj: A.aj, prog: A.prog, perfil: A.leer('juego_perfil', null) });
    try { return btoa(unescape(encodeURIComponent(j))); } catch (e) { return ''; }
  };
  A.importar = function (txt) {
    try {
      var d = JSON.parse(decodeURIComponent(escape(atob(String(txt).trim()))));
      if (!d || d.juego !== 'serpientes') return false;
      A.aj = mezclar(AJ, d.aj || {}); A.prog = mezclar(PROG, d.prog || {});
      A.guardarAj(); A.guardarProg();
      if (d.perfil) A.escribir('juego_perfil', d.perfil);
      return true;
    } catch (e) { return false; }
  };
  A.borrarTodo = function (tambienDisp) {
    [CL.aj, CL.prog, CL.partida, CL.sala, CL.asiento].forEach(A.borrar);
    if (tambienDisp) A.borrar(CL.disp);
    A.aj = mezclar(AJ, {}); A.prog = mezclar(PROG, {}); if (tambienDisp) A.restablecerDisp();
  };
})(typeof window !== 'undefined' ? window : globalThis);
