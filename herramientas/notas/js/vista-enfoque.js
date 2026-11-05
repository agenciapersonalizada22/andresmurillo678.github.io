/* Enfoque Pomodoro con estadisticas. El estado vive en localStorage (notas_enfoque) y sobrevive a recargas. */
(function (G) {
  'use strict';
  var doc = G.document, h = G.UI.h, UI = G.UI, F = G.Fechas, T = G.Tareas, Cfg = G.Config, U = G.Util;
  var V = G.VistaEnfoque = {}, S = function () { return G.App.store; }, cont = null, tick = 0, bloqueo = null;
  V.titulo = function () { return 'Enfoque'; };
  var NOM = { trabajo: 'Concentración', corto: 'Descanso corto', largo: 'Descanso largo' };

  function leer() { try { return JSON.parse(G.localStorage.getItem('notas_enfoque')); } catch (e) { return null; } }
  function escribir(s) { try { s ? G.localStorage.setItem('notas_enfoque', JSON.stringify(s)) : G.localStorage.removeItem('notas_enfoque'); } catch (e) {} }
  function durFase(f) { var p = Cfg.pref.pomo; return (f === 'trabajo' ? p.trabajo : f === 'corto' ? p.corto : p.largo) * 60000; }
  V.estado = leer;
  V.iniciar = function (fase, tarea, ciclo) {
    var d = durFase(fase), prev = leer();
    escribir({ fase: fase, inicio: Date.now(), fin: Date.now() + d, dur: d, tarea: tarea != null ? tarea : (prev ? prev.tarea : ''), ciclo: ciclo || (prev ? prev.ciclo : 1) || 1, pausa: null });
    pedirBloqueo(); pintar(); G.App.emitir('enfoque');
  };
  V.iniciarCon = function (id) { G.App.ir('enfoque', ''); V.iniciar('trabajo', id, 1); };
  V.pausar = function () { var s = leer(); if (!s) return; if (s.pausa) { s.fin = Date.now() + s.pausa; s.pausa = null; } else { s.pausa = Math.max(0, s.fin - Date.now()); } escribir(s); pintar(); };
  V.detener = function (registrar) {
    var s = leer(); if (!s) return; if (registrar && s.fase === 'trabajo') { var min = (s.dur - (s.pausa != null ? s.pausa : Math.max(0, s.fin - Date.now()))) / 60000; if (min >= 1) T.registrarTiempo(s.tarea, min, 'pomodoro', s.inicio); }
    escribir(null); soltarBloqueo(); pintar(); G.App.emitir('enfoque');
  };
  function pedirBloqueo() { try { if (G.navigator.wakeLock && !bloqueo) G.navigator.wakeLock.request('screen').then(function (b) { bloqueo = b; b.addEventListener('release', function () { bloqueo = null; }); }, function () {}); } catch (e) {} }
  function soltarBloqueo() { try { if (bloqueo) bloqueo.release(); } catch (e) {} bloqueo = null; }
  function sonido() {
    if (!Cfg.disp.sonido) return;
    try { var ac = new (G.AudioContext || G.webkitAudioContext)(), t = ac.currentTime; [0, 0.25, 0.5].forEach(function (d, i) { var o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = [660, 880, 990][i]; g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.22); o.connect(g); g.connect(ac.destination); o.start(t + d); o.stop(t + d + 0.25); }); } catch (e) {}
  }
  /* se llama cada segundo desde cualquier vista; termina la fase si ya paso */
  V.vigilar = function () {
    var s = leer(); if (!s || s.pausa) return; if (Date.now() < s.fin) return;
    escribir(null); var p = Cfg.pref.pomo, t = s.tarea ? S().get('tareas', s.tarea) : null;
    if (s.fase === 'trabajo') {
      T.registrarTiempo(s.tarea, s.dur / 60000, 'pomodoro', s.inicio);
      var largo = s.ciclo % p.cada === 0, sig = largo ? 'largo' : 'corto';
      notificar('Pomodoro completado' + (t ? ': ' + t.titulo : ''), 'Toca descansar ' + (largo ? p.largo : p.corto) + ' min.');
      if (p.auto) V.iniciar(sig, s.tarea, s.ciclo); else { escribir({ fase: 'espera', siguiente: sig, tarea: s.tarea, ciclo: s.ciclo }); soltarBloqueo(); }
    } else {
      S().poner('sesiones', { id: U.id(), tipo: 'descanso', tarea: '', dur: s.dur / 60000, ts: s.inicio, fecha: F.hoy() });
      notificar('Descanso terminado', 'Listo para otro pomodoro.');
      if (p.auto) V.iniciar('trabajo', s.tarea, s.ciclo + 1); else { escribir({ fase: 'espera', siguiente: 'trabajo', tarea: s.tarea, ciclo: s.ciclo + 1 }); soltarBloqueo(); }
    }
    sonido(); if (Cfg.disp.vibracion && G.navigator.vibrate) G.navigator.vibrate([200, 100, 200]);
    if (cont && cont.isConnected) pintar(); G.App.emitir('enfoque');
  };
  function notificar(t, cuerpo) {
    UI.aviso(t + '. ' + cuerpo, { tipo: 'recordatorio', fijo: true });
    try { if (G.Notification && G.Notification.permission === 'granted' && doc.hidden) new G.Notification(t, { body: cuerpo, tag: 'notas-enfoque' }); } catch (e) {}
  }

  function fmt(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return F.p2(Math.floor(s / 60)) + ':' + F.p2(s % 60); }
  var refs = {};
  function pintar() {
    if (!cont) return; cont.textContent = ''; var s = leer(), p = Cfg.pref.pomo, hoy = F.hoy();
    var tareas = S().lista('tareas', function (t) { return !t.papelera && t.estado !== 'hecha' && !t.padre; }).sort(function (a, b) { return (a.fecha || '9') < (b.fecha || '9') ? -1 : 1; }).slice(0, 80);
    var sel = h('select', { cls: 'campo', 'aria-label': 'Tarea en la que enfocarse', style: 'max-width:340px', 'data-f': 1 }, [h('option', { value: '', txt: 'Sin tarea concreta' })].concat(tareas.map(function (t) { return h('option', { value: t.id, txt: t.titulo }); })));
    sel.value = s && s.tarea ? s.tarea : ''; sel.addEventListener('change', function () { var e = leer(); if (e) { e.tarea = sel.value; escribir(e); } else refs.tarea = sel.value; });
    if (!s && refs.tarea) sel.value = refs.tarea;
    var activo = s && s.fase !== 'espera';
    var anillo = h('div', { cls: 'reloj', role: 'timer', 'aria-label': 'Temporizador' }), R = 108, C = 2 * Math.PI * R;
    anillo.innerHTML = '<svg viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="' + R + '" fill="none" stroke="var(--linea)" stroke-width="12"/><circle id="anillo" cx="120" cy="120" r="' + R + '" fill="none" stroke="' + (s && s.fase !== 'trabajo' ? 'var(--ok)' : 'var(--acento)') + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="0"/></svg>';
    var num = h('div', { cls: 'num' }, [h('div', {}, [h('span', { id: 'tiempo', txt: fmt(activo ? (s.pausa != null ? s.pausa : s.fin - Date.now()) : durFase('trabajo')) }), h('small', { txt: s ? (s.fase === 'espera' ? 'Listo para ' + NOM[s.siguiente].toLowerCase() : NOM[s.fase] + (s.pausa != null ? ' (en pausa)' : '') + ' · ciclo ' + s.ciclo) : 'Pomodoro de ' + p.trabajo + ' min' })])]);
    anillo.appendChild(num);
    var b = [];
    if (!s) b.push(h('button', { type: 'button', cls: 'btn prim', 'data-f': 1, on: { click: function () { V.iniciar('trabajo', sel.value, 1); } } }, [UI.icono('play'), h('span', { txt: 'Empezar' })]));
    else if (s.fase === 'espera') { b.push(h('button', { type: 'button', cls: 'btn prim', 'data-f': 1, on: { click: function () { V.iniciar(s.siguiente, s.tarea, s.ciclo); } } }, [UI.icono('play'), h('span', { txt: 'Iniciar ' + NOM[s.siguiente].toLowerCase() })])); b.push(h('button', { type: 'button', cls: 'btn', txt: 'Terminar', 'data-f': 1, on: { click: function () { V.detener(false); } } })); }
    else {
      b.push(h('button', { type: 'button', cls: 'btn prim', 'data-f': 1, on: { click: V.pausar } }, [UI.icono(s.pausa != null ? 'play' : 'pause'), h('span', { txt: s.pausa != null ? 'Reanudar' : 'Pausar' })]));
      b.push(h('button', { type: 'button', cls: 'btn', 'data-f': 1, on: { click: function () { var e = leer(); e.fin = Date.now() - 1; e.pausa = null; escribir(e); V.vigilar(); } } }, [UI.icono('skip'), h('span', { txt: 'Saltar' })]));
      b.push(h('button', { type: 'button', cls: 'btn peligro', txt: 'Detener', 'data-f': 1, on: { click: function () { V.detener(true); } } }));
    }
    var sesH = S().lista('sesiones', function (x) { return x.tipo === 'pomodoro' && x.fecha === hoy; }), minH = sesH.reduce(function (a, x) { return a + x.dur; }, 0);
    var datos = []; for (var i = 6; i >= 0; i--) { var f = F.sumDias(hoy, -i); datos.push({ etq: F.nombreDia(F.diaSemana(f), true), v: Math.round(S().lista('sesiones', function (x) { return x.fecha === f && x.tipo !== 'descanso'; }).reduce(function (a, x) { return a + x.dur; }, 0)) }); }
    var graf = h('div', { cls: 'graf', style: 'width:100%;max-width:560px;margin:0' }, [h('h2', { txt: 'Minutos enfocados, últimos 7 días' })]); graf.appendChild(G.Graficos.barras(datos, { unidad: 'min', desc: 'Minutos enfocados por día: ' + datos.map(function (d) { return d.etq + ' ' + d.v; }).join(', ') }));
    cont.appendChild(h('div', { cls: 'enfoque' }, [h('label', { cls: 'etq', style: 'text-align:center' }, ['Tarea', sel]), anillo, h('div', { cls: 'fila', style: 'justify-content:center' }, b),
      h('div', { cls: 'tarjetas', style: 'width:100%;max-width:560px' }, [h('div', { cls: 'kpi' }, [h('b', { txt: sesH.length }), h('span', { txt: 'pomodoros hoy' })]), h('div', { cls: 'kpi' }, [h('b', { txt: UI.fmtDur(minH) }), h('span', { txt: 'enfocado hoy' })])]), graf,
      h('p', { cls: 'ayuda', style: 'max-width:520px;text-align:center', txt: 'Los temporizadores se guardan: puedes recargar la página sin perder el pomodoro en curso. Duraciones en Ajustes.' })]));
    refs.C = C; actualizarAnillo();
  }
  function actualizarAnillo() {
    var s = leer(), a = doc.getElementById('anillo'), t = doc.getElementById('tiempo'); if (!a || !t || !s || s.fase === 'espera') return;
    var rest = s.pausa != null ? s.pausa : Math.max(0, s.fin - Date.now()); t.textContent = fmt(rest); a.setAttribute('stroke-dashoffset', String(refs.C * (1 - rest / s.dur)));
    if (doc.hidden === false) doc.title = fmt(rest) + ' · ' + NOM[s.fase];
  }
  V.montar = function (c) {
    var barra = h('div', { cls: 'barra-v' }, [h('button', { type: 'button', cls: 'btn ic-b solo-m', 'aria-label': 'Abrir menú', 'data-f': 1, on: { click: function () { G.App.alternarMenu(true); } } }, [UI.icono('menu')]), h('h1', { txt: 'Enfoque' })]);
    cont = h('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0;overflow-y:auto' }); c.appendChild(h('div', { cls: 'ancho' }, [barra, cont])); pintar();
    clearInterval(tick); tick = setInterval(function () { if (!cont || !cont.isConnected) { clearInterval(tick); return; } actualizarAnillo(); }, 500);
  };
  V.salir = function () { clearInterval(tick); };
  V.actualizar = function (evs) { if (!cont || !cont.isConnected) return; if (evs.some(function (e) { return e.col === 'sesiones'; }) && !(doc.activeElement && doc.activeElement.tagName === 'SELECT')) pintar(); };
  G.App.vistas.enfoque = V;
})(window);
