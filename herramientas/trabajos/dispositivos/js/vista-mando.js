/* Pestana Mandos: lista de mandos, visualizacion de botones/ejes (reutiliza juego/comun/mando.js), datos crudos y vibracion. */
(function (g) {
  'use strict';
  var T = g.Tr, A = g.DispApp, U = g.DispUI, P = g.DispPuro, TD = g.TrabajosDispositivos, h = T.h;
  var BOTONES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'VISTA', 'MENU', 'L3', 'R3', 'ARRIBA', 'ABAJO', 'IZQ', 'DER', 'XBOX'];
  function palo(etq) {
    var cv = h('canvas', { width: '120', height: '120', role: 'img', 'aria-label': 'Palanca ' + etq }), x = cv.getContext('2d'), est = getComputedStyle(document.documentElement);
    return { cv: cv, dibujar: function (px, py, pulsado) {
      x.clearRect(0, 0, 120, 120); var tx = getComputedStyle(document.body).color, ac = getComputedStyle(document.body).getPropertyValue('--acento') || '#3e63dd';
      x.strokeStyle = tx; x.globalAlpha = .35; x.lineWidth = 2; x.beginPath(); x.arc(60, 60, 50, 0, 7); x.stroke(); x.beginPath(); x.moveTo(10, 60); x.lineTo(110, 60); x.moveTo(60, 10); x.lineTo(60, 110); x.stroke(); x.globalAlpha = 1;
      x.fillStyle = pulsado ? '#c62828' : ac.trim() || '#3e63dd'; x.beginPath(); x.arc(60 + px * 44, 60 + py * 44, 11, 0, 7); x.fill();
    } };
  }
  A.iniciarMandos = function () {
    var raiz = document.getElementById('v-mandos'), M = g.Mando, lista = h('ul', { cls: 'dp-autoriz' }), chips = {}, raf = 0, ultimo = null;
    var cont = h('div', { cls: 'dp-botones', role: 'group', 'aria-label': 'Botones' }), pi = palo('izquierda'), pd = palo('derecha'), gi = h('div', { cls: 'dp-nivel' }, [h('i')]), gd = h('div', { cls: 'dp-nivel' }, [h('i')]);
    var crudo = h('pre', { cls: 'dp-pre', tabindex: '0', 'aria-label': 'Valores crudos del mando', txt: 'Conecta un mando, pulsa un botón y elige «Usar este mando».' });
    BOTONES.forEach(function (n) { chips[n] = h('span', { cls: 'dp-btnpad', txt: n }); cont.appendChild(chips[n]); });
    var sel = h('select', { 'aria-label': 'Mando' }), bVib = h('button', { type: 'button', cls: 'tr-btn', txt: 'Probar vibración', disabled: true });
    function refrescar() {
      var l = TD.driver('mando').listar(); sel.textContent = '';
      if (!l.length) sel.appendChild(h('option', { value: '', txt: 'Ningún mando visible: pulsa un botón' }));
      l.forEach(function (p) { sel.appendChild(h('option', { value: p.indice, txt: p.id + ' · ' + p.botones + ' botones, ' + p.ejes + ' ejes' + (p.mapeo === 'standard' ? '' : ' · mapeo no estándar') })); });
      ctl && (ctl.el.querySelector('button').disabled = !l.length || !!ctl.actual());
    }
    A.params.mando = { leer: function () { return {}; }, aplicar: function () {} };
    var ctl = U.control({
      tipo: 'mando', etiqueta: 'Usar este mando',
      abrir: function () { return TD.conectar('mando', { indice: sel.value === '' ? null : +sel.value }); },
      alConectar: function (c) {
        bVib.disabled = false; c.escuchar(function (ev) { if (ev.dir === 'rx') ultimo = ev.datos; }, 'datos');
        (function lazo() {
          var a = ctl.actual(); if (!a) return; if (M) M.leer();
          var est = M && M.conectado && ultimo && ultimo.mapeo === 'standard';
          BOTONES.forEach(function (n, i) { var on = est ? M.sostenido(n) : !!(ultimo && ultimo.botones[i] > .5); chips[n].classList.toggle('on', on); chips[n].textContent = n + (ultimo && ultimo.botones[i] > 0 && ultimo.botones[i] < 1 ? ' ' + Math.round(ultimo.botones[i] * 100) + '%' : ''); });
          var li = est ? M.ejes.izq : { x: ultimo ? ultimo.ejes[0] || 0 : 0, y: ultimo ? ultimo.ejes[1] || 0 : 0 }, ld = est ? M.ejes.der : { x: ultimo ? ultimo.ejes[2] || 0 : 0, y: ultimo ? ultimo.ejes[3] || 0 : 0 };
          pi.dibujar(li.x, li.y, est && M.sostenido('L3')); pd.dibujar(ld.x, ld.y, est && M.sostenido('R3'));
          gi.firstChild.style.width = Math.round((est ? M.gatillo.izq : ultimo && ultimo.botones[6] || 0) * 100) + '%'; gd.firstChild.style.width = Math.round((est ? M.gatillo.der : ultimo && ultimo.botones[7] || 0) * 100) + '%';
          if (ultimo) crudo.textContent = 'id: ' + ultimo.id + '\nmapeo: ' + (ultimo.mapeo || '(ninguno)') + '\nbotones: ' + JSON.stringify(ultimo.botones) + '\nejes: ' + JSON.stringify(ultimo.ejes);
          raf = requestAnimationFrame(lazo);
        })();
      },
      alCerrar: function () { cancelAnimationFrame(raf); bVib.disabled = true; refrescar(); }
    });
    bVib.addEventListener('click', function () { var c = ctl.actual(); if (c) c.enviar({ vibrar: { fuerte: 1, suave: .5, ms: 300 } }).catch(function (e) { ctl.error(e); }); });
    addEventListener('gamepadconnected', refrescar); addEventListener('gamepaddisconnected', refrescar);
    var bRef = h('button', { type: 'button', cls: 'tr-btn', txt: 'Buscar mandos', on: { click: refrescar } });
    refrescar();
    raiz.appendChild(h('div', { cls: 'tr-dos' }, [
      U.panel('Mandos de juego', [h('p', { cls: 'tr-sub', txt: 'Xbox, PlayStation y genéricos por USB o Bluetooth. El navegador no los muestra hasta que pulsas un botón. La vista usa el mismo módulo «mando.js» que los juegos del portal.' }), U.campo('Mando detectado', sel), h('div', { cls: 'tr-acciones' }, [bRef]), ctl.el, h('div', { cls: 'tr-acciones' }, [bVib]),
        h('p', { cls: 'tr-ayuda', txt: 'La vibración depende del mando y del navegador (Chrome/Edge con Xbox y DualSense por lo general).' })]),
      U.panel('Botones y ejes', [cont, h('div', { cls: 'dp-palos' }, [pi.cv, pd.cv]), h('div', { cls: 'tr-ayuda', txt: 'Gatillos izquierdo y derecho' }), gi, gd, crudo])]));
  };
})(window);
