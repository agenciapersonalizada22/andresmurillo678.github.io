/* Arranque de Monetizacion: tema, cuenta, datos, pestanas y atajos. */
(function (g) {
  'use strict';
  var T = g.Tr, CC = g.CuentaTrabajos, D = g.MonDatos, App = g.MonApp = {}, pest, ini = false;
  T.tema(document.getElementById('btn-tema'));
  CC.integrar({ id: 'trabajos_monetizacion', alm: D.alm, cols: D.SYNC, sync: true, etiqueta: 'solo una copia CIFRADA de tus finanzas, si activas el cifrado; nunca la frase', nombreLocal: 'datos financieros', avisoLocal: 'Sin cifrado activado nada se sincroniza.', alAplicar: function () { T.aviso('Hay una copia cifrada más reciente en tu Cuenta. En Ajustes puedes traerla con tu frase.'); } });
  CC.chip(document.querySelector('.tr-barra'), document.getElementById('btn-tema'));
  App.ir = function (v) { if (pest) pest.ir(v); };
  function estado() {
    var e = document.getElementById('mon-estado'), act = D.cifradoActivo;
    e.textContent = act ? '🔒 Cifrado activo: a tu Cuenta solo llega una copia cifrada con tu frase.' : '💾 Tus cifras están solo en este dispositivo (sin cifrado no se sincronizan). Actívalo en Ajustes si quieres llevarlas a otros dispositivos.';
  }
  D.cargar().then(function () {
    var v = ['tablero', 'ingresos', 'libro', 'facturas', 'tarifas', 'plan', 'ajustes'], mods = { ingresos: g.MonIngresos, libro: g.MonLibro, facturas: g.MonFacturas, tarifas: g.MonTarifas, plan: g.MonPlan, ajustes: g.MonAjustes, tablero: g.MonTablero };
    ['plan', 'libro', 'facturas', 'tarifas', 'ingresos', 'ajustes', 'tablero'].forEach(function (k) { mods[k].iniciar(document.getElementById('v-' + k)); });
    pest = T.tabs(document.getElementById('pestanas'), function () {}); ini = true; estado(); D.on(function (c) { if (c === 'cifrado' || c === null) estado(); });
    document.body.setAttribute('data-listo', '1');
    document.addEventListener('keydown', function (e) { if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return; if (e.altKey && /^[1-7]$/.test(e.key)) { pest.ir(v[+e.key - 1]); e.preventDefault(); } });
  }).catch(function (e) { console.error(e); T.aviso('No se pudo abrir el almacén local: ' + (e.message || e), 'error'); });
})(window);
