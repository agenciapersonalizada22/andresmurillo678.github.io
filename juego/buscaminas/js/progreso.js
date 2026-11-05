/* Progreso local: estadisticas por categoria, tabla de records, contadores y logros. */
(function (G) {
  'use strict';
  var BM = G.BM = G.BM || {};
  var P = { d: null };

  function vacio() { return { v: 1, cat: {}, records: {}, logros: {}, c: { acordes: 0, ms: 0, jugadas: 0, derrotas: 0, victorias: 0, dias: [], pistas: 0 }, nombre: '' }; }
  P.cargar = function () {
    var d = BM.almacen.leer(BM.almacen.CLAVES.progreso, null), v = vacio();
    if (d && typeof d === 'object') { for (var k in v) if (d[k] !== undefined) v[k] = d[k]; for (var c in vacio().c) if (typeof v.c[c] === 'undefined') v.c[c] = vacio().c[c]; }
    P.d = v; return v;
  };
  P.guardar = function () { BM.almacen.escribir(BM.almacen.CLAVES.progreso, P.d); };
  P.reiniciar = function () { P.d = vacio(); P.guardar(); };

  function categoria(clave) {
    var c = P.d.cat[clave];
    if (!c) c = P.d.cat[clave] = { jugadas: 0, ganadas: 0, mejor: null, tiempoTotal: 0, racha: 0, mejorRacha: 0, mejorPts: 0 };
    return c;
  }
  function claveScore(r) { return r.modo === 'diario' ? 'diario' : r.modo === 'contrarreloj' ? 'contrarreloj' : r.modo === 'supervivencia' ? 'supervivencia' : (r.dif === 'personalizado' ? null : 'tiempo_' + r.dif); }

  function dar(id, nuevos) {
    if (!P.d.logros[id]) { P.d.logros[id] = Date.now(); nuevos.push(BM.logros.LISTA.filter(function (l) { return l.id === id; })[0]); }
  }

  /* r: {modo,dif,w,h,m,victoria,tiempoMs,pistas,peligro,practica,banderas,acordes,nivel,puntos,mp} -> {nuevos, puesto, clave} */
  P.registrar = function (r) {
    var d = P.d, nuevos = [], puesto = -1, c = d.c, valido = !r.practica;
    c.acordes += r.acordes || 0; c.ms += r.tiempoMs || 0; c.pistas += r.pistas || 0;
    var sinAyuda = !r.pistas && !r.peligro && !r.practica;
    if (r.mp) {
      if (r.mp.gano) dar(r.mp.modo === 'carrera' ? 'carrera_ganada' : r.mp.modo === 'coop' ? 'coop_ganado' : 'duelo_ganado', nuevos);
    } else if (r.modo !== 'practica' || r.victoria) {
      var k = BM.config.clave(r.modo, r.dif), cat = categoria(k);
      if (r.modo !== 'practica') {
        c.jugadas++; cat.jugadas++;
        if (r.victoria) {
          c.victorias++; cat.ganadas++; cat.racha++; cat.tiempoTotal += r.tiempoMs || 0; if (cat.racha > cat.mejorRacha) cat.mejorRacha = cat.racha;
          if (valido && r.modo !== 'supervivencia' && r.modo !== 'contrarreloj' && (cat.mejor == null || r.tiempoMs < cat.mejor) && sinAyuda) cat.mejor = r.tiempoMs;
        } else { cat.racha = 0; c.derrotas++; }
        if ((r.puntos || 0) > cat.mejorPts) cat.mejorPts = r.puntos;
      }
    }
    if (!r.mp) {
      if (r.victoria) {
        dar('primera_victoria', nuevos);
        if (r.practica) dar('aprendiz', nuevos);
        if (!r.practica) {
          var t = r.tiempoMs / 1000;
          if (sinAyuda && r.modo !== 'supervivencia') {
            if (r.dif === 'principiante' && t < 15) dar('relampago', nuevos);
            if (r.dif === 'intermedio' && t < 90) dar('veloz_intermedio', nuevos);
            if (r.dif === 'experto' && t < 240) dar('maestro_experto', nuevos);
          }
          if (r.dif === 'experto') dar('experto_ganado', nuevos);
          if (r.banderas === 0 && r.m >= 40 && r.modo !== 'supervivencia') dar('sin_banderas', nuevos);
          if (r.modo === 'sinadivinar') dar('sin_adivinar_ok', nuevos);
          if (r.modo === 'contrarreloj') dar('contrarreloj_ok', nuevos);
          if (r.modo === 'diario') {
            dar('diario_ok', nuevos);
            var dia = BM.azar.fechaClave(); if (c.dias.indexOf(dia) < 0) c.dias.push(dia);
            if (c.dias.length >= 7) dar('diario_7', nuevos);
          }
          if (r.dif === 'personalizado' && r.w * r.h >= 1000 && r.modo !== 'supervivencia') dar('colosal', nuevos);
        }
      }
      if (r.modo === 'supervivencia') { if (r.nivel >= 5) dar('supervivencia_5', nuevos); if (r.nivel >= 10) dar('supervivencia_10', nuevos); }
      var racha = Math.max.apply(null, Object.keys(d.cat).map(function (q) { return d.cat[q].racha; }).concat([0]));
      if (racha >= 3) dar('racha_3', nuevos); if (racha >= 10) dar('racha_10', nuevos);
      if (c.derrotas >= 10) dar('explosivo', nuevos);
    }
    if (r.pistas) dar('pidio_pista', nuevos);
    if (c.acordes >= 100) dar('acordista', nuevos);
    if (c.jugadas >= 50) dar('veterano', nuevos);
    if (c.ms >= 3600000) dar('maraton', nuevos);

    var cs = !r.mp && valido && claveScore(r), ok = false;
    if (cs) ok = cs === 'contrarreloj' || cs === 'supervivencia' ? (r.puntos || 0) > 0 && !r.pistas : !!r.victoria && sinAyuda;
    if (ok) {
      var mayor = cs === 'contrarreloj' || cs === 'supervivencia';
      var lista = d.records[cs] = d.records[cs] || [];
      var val = mayor ? r.puntos : r.tiempoMs;
      var reg = { nombre: P.nombre(), v: val, fecha: Date.now(), nivel: r.nivel || 0 };
      lista.push(reg);
      lista.sort(function (a, b) { return mayor ? b.v - a.v : a.v - b.v; });
      puesto = lista.indexOf(reg);
      if (lista.length > 10) lista.length = 10;
      if (puesto >= 10) puesto = -1;
      P.ultimo = puesto >= 0 ? reg : null;
    }
    P.guardar();
    return { nuevos: nuevos, puesto: puesto, clave: cs };
  };
  P.nombre = function () {
    if (P.d.nombre) return P.d.nombre;
    try { var cn = BM.cuenta && BM.cuenta.nombre(); if (cn) return cn; } catch (e) {}
    try { return G.Red && G.Red.perfil.obtener().nombre || 'Jugador'; } catch (e) { return 'Jugador'; }
  };
  P.renombrarUltimo = function (n) {
    n = String(n || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 16) || 'Jugador';
    P.d.nombre = n; if (P.ultimo) P.ultimo.nombre = n; P.guardar();
  };
  P.totalLogros = function () { return BM.logros.LISTA.length; };
  P.cargar();
  BM.progreso = P;
  if (typeof module !== 'undefined' && module.exports) module.exports = BM;
})(typeof window !== 'undefined' ? window : globalThis);
