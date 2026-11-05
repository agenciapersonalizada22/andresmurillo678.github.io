/* Ajustes: generales (audio, accesibilidad, juego) y de dispositivo (graficos y controles). */
(function (G) {
  'use strict';
  var BM = G.BM = G.BM || {};
  var GEN = { volMaestro: 0.8, volMusica: 0.25, volEfectos: 0.9, pausaOculta: true, textoGrande: false, daltonismo: 'ninguno', reducirMovimiento: false,
    duda: false, acordes: true, peligro: false, tutorialVisto: false, ultima: { modo: 'clasico', dif: 'principiante', w: 20, h: 12, m: 40 }, mpDif: 'intermedio' };
  var DISP = { calidad: 'alta', tema: 'neon', particulas: 2, cascada: true, brillo: true, resolucion: 1, fps: '60', mostrarFps: false, autoBajar: true, pantallaActiva: true,
    sensZoom: 1, sensCursor: 1, zonaMuerta: 0.15, vibracionMando: true, vibracionMovil: true, tactilTam: 'm', tactilOpac: 0.85, tactilPos: 'derecha', zurdo: false, pulsacionLarga: 380,
    teclas: { abrir: 'Space', bandera: 'KeyF', acorde: 'KeyC', pista: 'KeyH', deshacer: 'KeyU', pausa: 'KeyP', reiniciar: 'KeyR', zoomMas: 'Equal', zoomMenos: 'Minus' } };
  var PRESETS = {
    baja: { particulas: 0, cascada: false, brillo: false, resolucion: 0.75 },
    media: { particulas: 1, cascada: true, brillo: false, resolucion: 1 },
    alta: { particulas: 2, cascada: true, brillo: true, resolucion: 1 },
    ultra: { particulas: 3, cascada: true, brillo: true, resolucion: 1.5 }
  };
  var A = { gen: {}, disp: {}, PRESETS: PRESETS, DEF_GEN: GEN, DEF_DISP: DISP }, oyentes = [], tmr = 0;

  function mezclar(def, ent) {
    var o = JSON.parse(JSON.stringify(def));
    if (ent && typeof ent === 'object') for (var k in def) if (ent[k] !== undefined && typeof ent[k] === typeof def[k]) {
      if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) o[k] = mezclar(def[k], ent[k]); else o[k] = ent[k];
    }
    return o;
  }
  A.cargar = function () {
    A.gen = mezclar(GEN, BM.almacen.leer(BM.almacen.CLAVES.ajustes, null));
    A.disp = mezclar(DISP, BM.almacen.leer(BM.almacen.CLAVES.dispositivo, null));
    if (A.disp.calidad === 'auto' || !PRESETS[A.disp.calidad]) { if (A.disp.calidad !== 'personalizada') A.disp.calidad = 'alta'; }
  };
  A.guardar = function () {
    clearTimeout(tmr); tmr = setTimeout(A.guardarYa, 250);
  };
  A.guardarYa = function () {
    clearTimeout(tmr);
    BM.almacen.escribir(BM.almacen.CLAVES.ajustes, A.gen); BM.almacen.escribir(BM.almacen.CLAVES.dispositivo, A.disp);
  };
  A.poner = function (grupo, k, v) {
    A[grupo][k] = v;
    if (grupo === 'disp' && PRESETS.baja[k] !== undefined && A.disp.calidad !== 'personalizada') A.disp.calidad = 'personalizada';
    A.guardar(); oyentes.forEach(function (f) { f(grupo, k, v); });
  };
  A.preset = function (nombre) {
    var p = PRESETS[nombre]; if (!p) return;
    for (var k in p) A.disp[k] = p[k];
    A.disp.calidad = nombre; A.guardar(); oyentes.forEach(function (f) { f('disp', 'calidad', nombre); });
  };
  A.reiniciarTeclas = function () { A.disp.teclas = JSON.parse(JSON.stringify(DISP.teclas)); A.guardar(); oyentes.forEach(function (f) { f('disp', 'teclas'); }); };
  A.alCambiar = function (f) { oyentes.push(f); };
  A.cargar();
  BM.ajustes = A;
  if (typeof module !== 'undefined' && module.exports) module.exports = BM;
})(typeof window !== 'undefined' ? window : globalThis);
