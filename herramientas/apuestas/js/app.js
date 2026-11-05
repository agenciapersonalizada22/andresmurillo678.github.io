/* Arranque, enrutado, verificacion de edad, autoexclusion y atajos. */
(function (g) {
  var A = g.Apuestas, U = A.ui, S = A.S, h = U.h, E = A.estado, V = A.vistas;
  var RUTAS = [
    ['eventos', 'Eventos', 'M3 6h18M3 12h18M3 18h18'], ['analisis', 'Análisis', 'M3 17l6-6 4 4 8-8M15 7h6v6'], ['banca', 'Banca', 'M4 7h16v12H4zM4 7l2-3h12l2 3M16 13h2'],
    ['modelos', 'Modelos', 'M4 20V10M10 20V4M16 20v-8M22 20H2'], ['registro', 'Registro', 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6'], ['panel', 'Panel', 'M3 3v18h18M7 14l4-4 3 3 5-6'], ['mas', 'Más', 'M12 5v.01M12 12v.01M12 19v.01']
  ];
  var ap = A.app = {}, excl = null, tExcl = null, ruta = 'eventos';

  function ns(tag, at) { var e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (var k in at) e.setAttribute(k, at[k]); return e; }
  function icono(d) { var s = ns('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }); s.appendChild(ns('path', { d: d })); return s; }
  function pintarNav() {
    U.montar(document.getElementById('nav'), RUTAS.map(function (r) { return h('a', { href: '#/' + r[0], 'aria-current': r[0] === ruta ? 'page' : null }, icono(r[2]), r[1]); }));
  }
  var ICO = { btnActualizar: 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5', btnTema: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z', btnAyuda: 'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17v.01' };
  function iconosCab() { Object.keys(ICO).forEach(function (id) { var b = document.getElementById(id), s = icono(ICO[id]); s.setAttribute('width', 20); s.setAttribute('height', 20); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', 2); s.setAttribute('stroke-linecap', 'round'); b.appendChild(s); }); }
  function leerRuta() { var m = location.hash.match(/^#\/(\w+)/); ruta = m && V[m[1]] ? m[1] : 'eventos'; }

  ap.pintar = function () {
    leerRuta(); pintarNav();
    document.getElementById('badgeDemo').hidden = !S.cfg.demo;
    var cont = document.getElementById('vista');
    var avisos = [];
    E.limites().filter(function (l) { return l.estado !== 'ok'; }).forEach(function (l) { avisos.push(U.aviso(l.estado === 'excedido' ? 'Has superado tu límite de pérdida ' + l.nombre + ' (' + U.m(l.perdida) + ' de ' + U.m(l.limite) + '). Haz una pausa.' : 'Te acercas a tu límite de pérdida ' + l.nombre + ' (' + U.m(l.perdida) + ' de ' + U.m(l.limite) + ').', l.estado === 'excedido' ? 'peligro' : 'aviso')); });
    if (S.sinPersistencia) avisos.push(U.aviso('Tu navegador no permite guardar datos de forma persistente: lo que registres se perderá al cerrar. Exporta el CSV con frecuencia.', 'peligro'));
    var vista = h('div', { class: 'vista-' + ruta });
    U.montar(cont, avisos, vista);
    V[ruta](vista);
    document.title = RUTAS.filter(function (r) { return r[0] === ruta; })[0][1] + ' · Apuestas: análisis y registro';
  };

  /* verificacion de edad / jurisdiccion (solo aviso, sin geolocalizacion) */
  function puertaEdad() {
    return new Promise(function (ok) {
      if (S.cfg.edad && S.cfg.edad.ok) { ok(); return; }
      var c1 = h('input', { type: 'checkbox', id: 'chkEdad' }), c2 = h('input', { type: 'checkbox', id: 'chkLey' }), pais = U.texto({ placeholder: 'País o región (opcional, solo para ti)', max: 60 });
      var entrar = U.btn('Entrar', function () { E.guardarCfg({ edad: { ok: true, t: Date.now(), pais: pais.value.trim() } }).then(function () { m.cerrar(); ok(); }); }, 'primario grande', { disabled: true });
      function chk() { entrar.disabled = !(c1.checked && c2.checked); }
      c1.addEventListener('change', chk); c2.addEventListener('change', chk);
      var m = U.modal({ titulo: 'Antes de empezar', sinCerrar: true, contenido: h('div', null,
        h('p', null, 'Esta herramienta analiza cuotas deportivas y lleva tu registro personal. ', h('b', null, 'No apuesta por ti, no se conecta a casas de apuestas y no gestiona dinero.')),
        U.aviso('Apostar implica riesgo de pérdida y puede ser adictivo. Es solo para mayores de edad y su legalidad depende de tu país o región. No hacemos geolocalización: la verificación es una declaración tuya.', 'aviso'),
        h('label', { class: 'check' }, c1, ' Soy mayor de edad según la ley de mi jurisdicción (18+ o la edad mínima que corresponda).'),
        h('label', { class: 'check' }, c2, ' Sé que apostar puede estar restringido donde vivo y soy responsable de cumplir la ley.'),
        U.campo('Jurisdicción', pais)),
        pie: [h('a', { class: 'btn', href: '../../' }, 'Salir'), entrar] });
    });
  }

  ap.revisarExclusion = function () {
    clearTimeout(tExcl);
    var rem = E.autoexcluido();
    if (!rem) { if (excl) { excl.cerrar(); excl = null; ap.pintar(); } return; }
    var txt = h('b', null, V.fmtRestante(rem));
    if (!excl) {
      excl = U.modal({ titulo: 'Autoexclusión activa', sinCerrar: true, clase: 'ancho', contenido: h('div', null,
        U.aviso('Decidiste tomarte un descanso de esta herramienta.', 'info'), h('p', null, 'Tiempo restante: ', txt),
        h('p', null, 'Gracias por cuidarte. Mientras tanto no puedes registrar apuestas ni consultar cuotas.'), V.RECURSOS()),
        pie: [U.btn('Exportar mis datos (CSV)', function () { U.descargar('apuestas-' + A.registro.hoy() + '.csv', '﻿' + A.registro.aCSV(A.registro.ordenar(S.apuestas))); })] });
    } else excl.el.querySelector('.aviso').nextSibling.lastChild.textContent = V.fmtRestante(rem);
    tExcl = setTimeout(ap.revisarExclusion, Math.min(rem + 500, 30000));
  };

  var ATAJOS = [['1 – 7', 'Cambiar de sección'], ['N', 'Nueva apuesta'], ['R', 'Actualizar cuotas'], ['T', 'Cambiar tema'], ['/', 'Buscar en la sección'], ['?', 'Mostrar esta ayuda'], ['Esc', 'Cerrar diálogo']];
  function teclas(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || document.body.classList.contains('modal') && e.key !== '?') return;
    var t = e.target, tag = t && t.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    var k = e.key.toLowerCase();
    if (k >= '1' && k <= '7') location.hash = '#/' + RUTAS[+k - 1][0];
    else if (k === 'n') { e.preventDefault(); A.registroUI.nueva(); }
    else if (k === 'r') ap.actualizar(true);
    else if (k === 't') ap.alternarTema();
    else if (k === '/') { var q = document.querySelector('#vista input[type=search]'); if (q) { e.preventDefault(); q.focus(); } }
    else if (e.key === '?') ayuda();
  }
  function ayuda() { U.modal({ titulo: 'Atajos de teclado', contenido: U.tabla(['Tecla', 'Acción'], ATAJOS.map(function (a) { return h('tr', null, h('th', { scope: 'row' }, h('kbd', null, a[0])), h('td', null, a[1])); })) }); }
  ap.alternarTema = function () { var oscuro = document.documentElement.getAttribute('data-tema') === 'oscuro' || (S.cfg.tema === 'auto' && matchMedia('(prefers-color-scheme:dark)').matches); E.guardarCfg({ tema: oscuro ? 'claro' : 'oscuro' }).then(E.aplicarTema); };
  ap.actualizar = function (manual) { return E.cargarDatos(true).then(function () { if (manual) U.toast(S.estadoDatos === 'error' ? 'No se pudo actualizar' : 'Cuotas actualizadas'); }); };

  function iniciar() {
    iconosCab();
    document.getElementById('btnTema').addEventListener('click', ap.alternarTema);
    document.getElementById('btnAyuda').addEventListener('click', ayuda);
    document.getElementById('btnActualizar').addEventListener('click', function () { ap.actualizar(true); });
    g.addEventListener('keydown', teclas);
    g.addEventListener('hashchange', ap.pintar);
    E.iniciar().then(function () {
      E.alCambiar(function (que) {
        var ok = que === 'datos' && ['eventos', 'analisis', 'modelos'].indexOf(ruta) >= 0 || que === 'apuestas' && ['registro', 'panel'].indexOf(ruta) >= 0 || que === 'alertas' && ruta === 'analisis';
        if (!ok || (que !== 'apuestas' && document.body.classList.contains('modal'))) return;
        ap.pintar();
      });
      return puertaEdad();
    }).then(function () {
      ap.revisarExclusion(); ap.pintar(); E.iniciarReloj();
      return E.cargarDatos();
    }).then(function () {
      ap.pintar();
      setInterval(function () { if (document.visibilityState === 'visible' && !E.autoexcluido()) E.cargarDatos(); }, 120000);
    }).catch(function (e) { console.error(e); U.montar(document.getElementById('vista'), U.aviso('Error al iniciar: ' + e.message, 'peligro')); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})(window);
