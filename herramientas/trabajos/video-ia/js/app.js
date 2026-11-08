/* Estado compartido y bus de eventos del modulo Video IA. window.VApp */
(function (g) {
  'use strict';
  var T = g.Tr, R = g.VReglas, A = g.VAnalisis, oyentes = {};
  var V = g.VApp = {
    fuente: null, ajustes: null, reglas: [], proyecto: null, motorReglas: new R.Motor([]),
    cfg: { sensibilidad: 55, minArea: 0.002, movimiento: true, seguimiento: true, calor: true, escena: true, calidad: true, color: true, umbralNitidez: 12, umbralEscena: 0.3, ancho: 160, fps: 8, objetoColor: null, lector: true, nativos: false, preroll: 5, vigilancias: [], zonas: [], lineas: [] },
    eventos: [], serie: { t: [], mov: [], ocup: [], bri: [], nit: [], rui: [] }, ult: null, capturas: [], clips: [], consentimiento: false, transcripcion: [], conteoTipos: {}, colores: {}, calorUlt: null, meta: { inicio: null, fuente: '', dur: 0 }
  };
  V.on = function (n, f) { (oyentes[n] = oyentes[n] || []).push(f); return function () { oyentes[n] = (oyentes[n] || []).filter(function (x) { return x !== f; }); }; };
  V.emitir = function (n, d) { (oyentes[n] || []).slice().forEach(function (f) { try { f(d); } catch (e) { console.error(e); } }); };
  V.reloj = function () { return V.fuente && V.fuente.esArchivo && V.fuente.video ? V.fuente.video.currentTime : (performance.now() - (V.t0 || 0)) / 1000; };
  V.limpiarDatos = function () { V.eventos = []; V.serie = { t: [], mov: [], ocup: [], bri: [], nit: [], rui: [] }; V.conteoTipos = {}; V.colores = {}; V.transcripcion = []; V.meta.inicio = Date.now(); V.t0 = performance.now(); V.emitir('limpio'); };
  /* registra un evento, lo cuenta y evalua las reglas */
  V.evento = function (ev) {
    ev.ts = Date.now(); V.eventos.push(ev); if (V.eventos.length > 3000) V.eventos.splice(0, 500);
    V.conteoTipos[ev.tipo] = (V.conteoTipos[ev.tipo] || 0) + 1; V.emitir('evento', ev);
    V.motorReglas.procesar(ev, ev.ts / 1000).forEach(function (x) { if (g.VAcciones) g.VAcciones.ejecutar(x.accion, ev, x.regla); });
  };
  V.muestra = function (r) {
    var s = V.serie, n = s.t.length; if (n && r.t - s.t[n - 1] < 0.5 && r.t >= s.t[n - 1]) { var i = n - 1; if (r.mov && r.mov.pct > s.mov[i]) s.mov[i] = r.mov.pct; if (r.ocupacion > s.ocup[i]) s.ocup[i] = r.ocupacion; return; }
    if (n && r.t < s.t[n - 1] - 0.5) { /* salto atras (video buscado): se conserva la serie */ }
    s.t.push(r.t); s.mov.push(r.mov ? r.mov.pct : 0); s.ocup.push(r.ocupacion || 0); s.bri.push(V.ult && V.ult.calidad ? V.ult.calidad.brillo : null); s.nit.push(V.ult && V.ult.calidad ? V.ult.calidad.nitidez : null); s.rui.push(V.ult && V.ult.calidad ? V.ult.calidad.ruido : null);
    if (s.t.length > 14400) { Object.keys(s).forEach(function (k) { s[k] = s[k].filter(function (_, j) { return j % 2 === 0; }); }); }
  };
  V.proyectoActual = function () { return { id: V.proyecto && V.proyecto.id, nombre: V.proyecto && V.proyecto.nombre || 'Proyecto sin nombre', cfg: JSON.parse(JSON.stringify(V.cfg)) }; };
  V.aplicarProyecto = function (p) { V.proyecto = p; if (p && p.cfg) Object.assign(V.cfg, p.cfg); V.emitir('proyecto'); V.emitir('cfg'); };
  V.cambioCfg = function () { V.emitir('cfg'); };
  V.reglasActivas = function () { V.motorReglas.poner(V.reglas); };
  V.cuenta = function (n) { return V.eventos.filter(function (e) { return e.tipo === n; }).length; };
  V.fmt = A.fmtT;
  V.ordenarCapturas = function () { while (V.capturas.length > 30) { var c = V.capturas.shift(); URL.revokeObjectURL(c.url); } while (V.clips.length > 20) { var k = V.clips.shift(); URL.revokeObjectURL(k.url); } };
})(window);
