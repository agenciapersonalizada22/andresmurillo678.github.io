/* Pestana Sensores: movimiento, orientacion, GPS y bateria en vivo con graficas de canvas. */
(function (g) {
  'use strict';
  var T = g.Tr, A = g.DispApp, U = g.DispUI, P = g.DispPuro, TD = g.TrabajosDispositivos, h = T.h;
  var COL = ['#3e63dd', '#e8590c', '#2b8a3e'];
  function grafica(titulo, nombres, rango) {
    var cv = h('canvas', { width: '600', height: '150', role: 'img', 'aria-label': 'Gráfica de ' + titulo }), x = cv.getContext('2d'), series = nombres.map(function () { return new P.Serie(200); }), val = h('div', { cls: 'dp-vals' }), vis = 0;
    function dib() {
      var ac = getComputedStyle(document.body); x.clearRect(0, 0, 600, 150); x.strokeStyle = ac.color; x.globalAlpha = .18; x.lineWidth = 1; x.beginPath(); for (var i = 1; i < 4; i++) { x.moveTo(0, i * 37.5); x.lineTo(600, i * 37.5); } x.stroke(); x.globalAlpha = 1;
      var mn = Infinity, mx = -Infinity; series.forEach(function (s) { s.v.forEach(function (v) { if (v < mn) mn = v; if (v > mx) mx = v; }); });
      if (rango) { mn = rango[0]; mx = rango[1]; } else { if (!isFinite(mn)) { mn = -1; mx = 1; } var pad = (mx - mn) * .1 || 1; mn -= pad; mx += pad; }
      series.forEach(function (s, k) {
        x.strokeStyle = COL[k]; x.lineWidth = 2; x.beginPath(); s.v.forEach(function (v, i) { var px = i * 600 / 199, py = 145 - (v - mn) / (mx - mn) * 140; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
      });
      x.fillStyle = ac.color; x.globalAlpha = .6; x.font = '11px system-ui'; x.fillText(mx.toFixed(1), 4, 12); x.fillText(mn.toFixed(1), 4, 146); x.globalAlpha = 1;
    }
    return {
      el: h('figure', { cls: 'dp-graf' }, [h('figcaption', {}, [h('b', { txt: titulo }), ' ' ].concat(nombres.map(function (n, k) { return h('span', { cls: 'dp-leyenda', style: '--c:' + COL[k], txt: n }); }))), cv, val]),
      push: function (vs) { vs.forEach(function (v, k) { if (v != null) series[k].push(v); }); if (!vis) vis = requestAnimationFrame(function () { vis = 0; dib(); val.textContent = series.map(function (s, k) { var st = s.stats(), u = s.v[s.v.length - 1]; return nombres[k] + ' ' + (u == null ? '–' : u.toFixed(2)) + ' (mín ' + st.min.toFixed(1) + ' · máx ' + st.max.toFixed(1) + ')'; }).join('   '); }); },
      limpiar: function () { series.forEach(function (s) { s.v = []; }); dib(); val.textContent = ''; }
    };
  }
  A.iniciarSensores = function () {
    var raiz = document.getElementById('v-sensores'), cMov = h('input', { type: 'checkbox', checked: true }), cOri = h('input', { type: 'checkbox', checked: true }), cGps = h('input', { type: 'checkbox' }), cBat = h('input', { type: 'checkbox', checked: true });
    var gA = grafica('Aceleración con gravedad (m/s²)', ['x', 'y', 'z']), gG = grafica('Giroscopio (°/s)', ['α', 'β', 'γ']), gO = grafica('Orientación (°)', ['α', 'β', 'γ']);
    var gps = h('dl', { cls: 'dp-info' }), bat = h('dl', { cls: 'dp-info' }), aviso = h('div', {}), cuenta = { movimiento: 0, orientacion: 0 }, tAv = 0;
    A.params.sensores = { leer: function () { return { movimiento: cMov.checked, orientacion: cOri.checked, gps: cGps.checked, bateria: cBat.checked }; }, aplicar: function (p) { cMov.checked = p.movimiento !== false; cOri.checked = p.orientacion !== false; cGps.checked = !!p.gps; cBat.checked = p.bateria !== false; } };
    function dl(el, pares) { el.textContent = ''; pares.forEach(function (p) { el.appendChild(h('dt', { txt: p[0] })); el.appendChild(h('dd', { txt: p[1] == null ? '–' : String(p[1]) })); }); }
    var ctl = U.control({
      tipo: 'sensores', etiqueta: 'Iniciar sensores',
      abrir: function () { cuenta = { movimiento: 0, orientacion: 0 }; gA.limpiar(); gG.limpiar(); gO.limpiar(); return TD.conectar('sensores', A.params.sensores.leer()); },
      alConectar: function (c) {
        aviso.textContent = '';
        c.escuchar(function (ev) {
          var d = ev.datos; if (ev.dir !== 'rx') return;
          if (d.sensor === 'movimiento') { cuenta.movimiento++; gA.push([d.acel.x, d.acel.y, d.acel.z]); gG.push([d.giro.alfa, d.giro.beta, d.giro.gamma]); }
          else if (d.sensor === 'orientacion') { cuenta.orientacion++; gO.push([d.alfa, d.beta, d.gamma]); }
          else if (d.sensor === 'gps') dl(gps, [['Latitud', d.lat], ['Longitud', d.lon], ['Precisión', d.precision + ' m'], ['Altitud', d.alt], ['Velocidad', d.vel], ['Rumbo', d.rumbo]]);
          else if (d.sensor === 'bateria') dl(bat, [['Nivel', d.nivel + ' %'], ['Cargando', d.cargando ? 'sí' : 'no']]);
        }, 'datos');
        tAv = setTimeout(function () { if (ctl.actual() === c && (cMov.checked || cOri.checked) && !cuenta.movimiento && !cuenta.orientacion) aviso.appendChild(U.nota('No llegan datos de movimiento ni orientación. Es lo normal en un ordenador de escritorio; en un móvil, comprueba que el permiso de sensores esté concedido y que la página esté en HTTPS.', 'av')); }, 2500);
      },
      alCerrar: function () { clearTimeout(tAv); }
    });
    raiz.appendChild(h('div', { cls: 'tr-dos' }, [
      U.panel('Sensores del equipo', [h('p', { cls: 'tr-sub', txt: 'Mejor en un teléfono. Pulsa Iniciar para dar permiso (en iPhone es obligatorio). Los datos se quedan en tu dispositivo.' }),
        h('label', { cls: 'tr-chk' }, [cMov, 'Acelerómetro y giroscopio']), h('label', { cls: 'tr-chk' }, [cOri, 'Orientación']), h('label', { cls: 'tr-chk' }, [cGps, 'Ubicación GPS']), h('label', { cls: 'tr-chk' }, [cBat, 'Batería']),
        ctl.el, aviso, U.barraPerfil('sensores'), h('h3', { txt: 'Ubicación' }), gps, h('h3', { txt: 'Batería' }), bat]),
      U.panel('En vivo', [gA.el, gG.el, gO.el])]));
  };
})(window);
