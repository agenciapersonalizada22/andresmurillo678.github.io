/* Alertas y movimiento de lineas (logica pura). Las alertas se evalúan al abrir la app o al actualizar los datos con la pestana abierta. */
(function (g) {
  var A = g.Apuestas = g.Apuestas || {};
  var C = g.Apuestas.cuotas || (typeof require !== 'undefined' ? require('./cuotas.js') : null);

  function todosEventos(datos) {
    var out = [];
    ((datos && datos.deportes) || []).forEach(function (d) { (d.eventos || []).forEach(function (e) { out.push({ deporte: d, ev: e }); }); });
    return out;
  }
  function coincide(ev, texto) {
    if (!texto) return true;
    var t = texto.toLowerCase();
    return (ev.local + ' ' + ev.visitante).toLowerCase().indexOf(t) >= 0;
  }
  /* regla: {id,tipo:'cuota'|'surebet'|'valor',texto,sel,umbral,activa}. Devuelve [{clave,regla,mensaje}] */
  function evaluar(reglas, datos, o) {
    o = o || {}; var out = [], evs = todosEventos(datos), ahora = o.ahora || Date.now();
    reglas.forEach(function (r) {
      if (r.activa === false) return;
      evs.forEach(function (x) {
        var ev = x.ev; if (!coincide(ev, r.texto)) return;
        if (Date.parse(ev.inicio) < ahora - 3 * 3600000) return;
        var nombre = ev.local + ' - ' + ev.visitante;
        if (r.tipo === 'cuota') {
          var m = C.mercadosDeEvento(ev).filter(function (mm) { return mm.clave === 'h2h'; })[0];
          if (!m || m.sels.indexOf(r.sel) < 0) return;
          var b = C.mejores(m)[r.sel];
          if (b && b.cuota >= r.umbral) out.push({ clave: r.id + '|' + ev.id + '|' + b.casa + '|' + b.cuota, regla: r, evento: ev, mensaje: nombre + ': ' + r.sel + ' a ' + b.cuota.toFixed(2) + ' en ' + b.casa + ' (umbral ' + r.umbral + ')' });
        } else if (r.tipo === 'surebet') {
          C.arbitraje(ev, 100).forEach(function (a) {
            if (a.roi * 100 >= (r.umbral || 0)) out.push({ clave: r.id + '|' + ev.id + '|' + a.mercado + '|' + a.roi.toFixed(3), regla: r, evento: ev, mensaje: 'Surebet ' + nombre + ' (' + a.mercado + '): ' + (a.roi * 100).toFixed(2) + '% garantizado' });
          });
        } else if (r.tipo === 'valor') {
          C.valor(ev, { referencia: o.referencia, metodo: o.metodo, minEdge: (r.umbral || 3) / 100 }).slice(0, 1).forEach(function (v) {
            out.push({ clave: r.id + '|' + ev.id + '|' + v.mercado + '|' + v.sel + '|' + v.casa + '|' + v.cuota, regla: r, evento: ev, mensaje: 'Valor ' + nombre + ': ' + v.sel + ' ' + v.cuota.toFixed(2) + ' en ' + v.casa + ' (edge ' + (v.edge * 100).toFixed(1) + '%)' });
          });
        }
      });
    });
    return out;
  }

  /* captura compacta: por evento y casa, cuotas 1X2/2 vias */
  function capturar(datos, t) {
    var ev = {};
    todosEventos(datos).forEach(function (x) {
      var e = x.ev, c = {};
      (e.casas || []).forEach(function (cs) {
        var h = cs.mercados && cs.mercados.h2h; if (!h) return;
        c[cs.casa] = [h.local, h.empate == null ? null : h.empate, h.visitante];
      });
      if (Object.keys(c).length) ev[e.id] = { n: e.local + ' - ' + e.visitante, i: e.inicio, d: x.deporte.nombre, c: c };
    });
    return { t: t || Date.now(), generado: datos.generado, ev: ev };
  }
  function probsEvento(ev) {
    var acc = [0, 0, 0], n = 0, nombres = ['local', 'empate', 'visitante'];
    Object.keys(ev.c).forEach(function (casa) {
      var v = ev.c[casa], idx = v[1] == null ? [0, 2] : [0, 1, 2];
      var p = C.justas(idx.map(function (i) { return v[i]; }), 'proporcional');
      idx.forEach(function (i, k) { acc[i] += p[k]; }); n++;
    });
    return nombres.map(function (nm, i) { return acc[i] ? acc[i] / n : null; });
  }
  /* compara dos capturas: cambios de probabilidad de consenso y de mejor cuota por evento */
  function movimiento(antes, ahora) {
    var out = [], nombres = ['local', 'empate', 'visitante'];
    Object.keys(ahora.ev).forEach(function (id) {
      var b = antes.ev[id]; if (!b) return;
      var a = ahora.ev[id], pa = probsEvento(a), pb = probsEvento(b);
      nombres.forEach(function (nm, i) {
        if (pa[i] == null || pb[i] == null) return;
        var mejor = function (ev) { var m = 0; Object.keys(ev.c).forEach(function (k) { if (ev.c[k][i] > m) m = ev.c[k][i]; }); return m; };
        out.push({ id: id, evento: a.n, inicio: a.i, deporte: a.d, sel: nm, probAntes: pb[i], probAhora: pa[i], dProb: pa[i] - pb[i], mejorAntes: mejor(b), mejorAhora: mejor(a) });
      });
    });
    return out.sort(function (x, y) { return Math.abs(y.dProb) - Math.abs(x.dProb); });
  }
  A.alertas = { evaluar: evaluar, capturar: capturar, movimiento: movimiento, todosEventos: todosEventos };
  if (typeof module !== 'undefined' && module.exports) module.exports = A.alertas;
})(typeof window !== 'undefined' ? window : globalThis);
