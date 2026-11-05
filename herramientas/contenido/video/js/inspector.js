/* Inspector de propiedades del clip seleccionado. VE.insp */
(function (g) {
  var M = g.VE.modelo, K = g.VE.keyframes, h = g.VE.h, $ = g.VE.$, FL = g.VE.filtros, P = g.VE.paneles, I = {}, A = null;
  var FUENTES = [['sans', 'Moderna'], ['impact', 'Impacto'], ['serif', 'Con serifa'], ['mono', 'Máquina'], ['redonda', 'Redonda'], ['cursiva', 'Cursiva']];
  var ENT = { ninguna: 'Ninguna', fundido: 'Fundido', subir: 'Subir', bajar: 'Bajar', izq: 'Desde la izquierda', der: 'Desde la derecha', zoom: 'Zoom', rebote: 'Rebote', maquina: 'Máquina de escribir', giro: 'Giro', desplazar: 'Desplazamiento continuo' };
  var SAL = { ninguna: 'Ninguna', fundido: 'Fundido', subir: 'Subir', bajar: 'Bajar', zoom: 'Zoom', izq: 'A la izquierda', der: 'A la derecha' };
  var CON = { ninguna: 'Ninguna', pulso: 'Pulso', latido: 'Latido', flotar: 'Flotar', girar: 'Girar' };
  I.iniciar = function (app) { A = app; };

  function get(c, ruta) { return ruta.split('.').reduce(function (o, k) { return o && o[k]; }, c); }
  function poner(c, ruta, v) { var ks = ruta.split('.'), o = c; for (var i = 0; i < ks.length - 1; i++) { if (!o[ks[i]]) o[ks[i]] = {}; o = o[ks[i]]; } o[ks[ks.length - 1]] = v; }
  var AUDIO = /^(vol|mute|fi|fo|tono|vel|inv)$/;
  function cambio(c, ruta, v, clave) {
    poner(c, ruta, v); if (AUDIO.test(ruta)) A.motor.invalidar();
    A.dibujar(); A.commit(clave || ruta, true);
  }
  function localT(c) { return Math.max(0, Math.min(c.dur, A.motor.t - c.ini)); }

  function deslizador(c, rotulo, ruta, o) {
    var kfable = !!o.kf, lista = kfable && c.kf && c.kf[ruta], t = localT(c);
    var val = lista && lista.length ? K.valor(lista, t, c[ruta]) : get(c, ruta); if (val === undefined || val === null) val = o.def;
    var out = h('output', { texto: (o.fmt || function (x) { return (+x).toFixed(2); })(val) });
    var rg = h('input', { type: 'range', min: o.min, max: o.max, step: o.step || 0.01, valor: val, 'aria-label': rotulo, oninput: function () {
      var v = +this.value; out.textContent = (o.fmt || function (x) { return (+x).toFixed(2); })(v);
      if (kfable && c.kf && c.kf[ruta] && c.kf[ruta].length) { K.poner(c.kf[ruta], localT(c), v, A.easeKf); A.dibujar(); A.commit('kf' + ruta, true); }
      else if (o.alCambiar) o.alCambiar(v); else cambio(c, ruta, v);
    } });
    var fila = h('div', { class: 's fila' }, h('label', { texto: rotulo }), rg, out);
    if (kfable) {
      var on = !!(lista && lista.some(function (k) { return Math.abs(k.t - t) < 0.05; }));
      fila.appendChild(h('button', { class: 'kf' + (on ? ' on' : ''), title: on ? 'Quitar fotograma clave aquí' : 'Añadir fotograma clave aquí', 'aria-label': (on ? 'Quitar' : 'Añadir') + ' fotograma clave de ' + rotulo, 'aria-pressed': String(on), onclick: function () {
        var l = c.kf[ruta] || (c.kf[ruta] = []), tt = localT(c);
        if (on) { K.quitar(l, tt); if (!l.length) { c[ruta] = c[ruta]; delete c.kf[ruta]; } }
        else { if (!l.length && tt > 0.05) K.poner(l, 0, c[ruta], A.easeKf); K.poner(l, tt, +rg.value, A.easeKf); }
        A.commit('kfb'); A.refrescar();
      } }, '◆'));
    } else fila.appendChild(h('span'));
    return fila;
  }
  function selector(c, rotulo, ruta, opciones, alCambiar) {
    var cur = get(c, ruta), s = h('select', { 'aria-label': rotulo, onchange: function () { (alCambiar || function (v) { cambio(c, ruta, v); })(this.value); } },
      opciones.map(function (o) { return h('option', { value: o[0], selected: o[0] === cur, texto: o[1] }); }));
    return h('div', { class: 'fila' }, h('label', { texto: rotulo + ' ' }), s);
  }
  function chk(c, rotulo, ruta, alCambiar) {
    return h('label', { class: 'chk', estilo: 'margin:4px 12px 4px 0' }, h('input', { type: 'checkbox', checked: !!get(c, ruta), onchange: function () { (alCambiar || function (v) { cambio(c, ruta, v); })(this.checked); } }), ' ' + rotulo);
  }
  function sec(titulo, abierta, ...hijos) { var d = h('details', { class: 'sec' }, h('summary', { texto: titulo }), ...hijos); if (abierta) d.open = true; return d; }
  var pct = function (x) { return Math.round(x * 100) + '%'; };

  I.render = function () {
    var r = $('inspector'), c = A.clipSel(), y = r.parentNode.scrollTop; r.textContent = '';
    if (!c) {
      r.appendChild(h('h3', { texto: 'Proyecto' }));
      r.appendChild(h('div', { class: 'fila' }, h('label', { texto: 'Nombre ' }), h('input', { type: 'text', valor: A.p.nombre, 'aria-label': 'Nombre del proyecto', onchange: function () { A.p.nombre = this.value || 'Proyecto'; A.commit('nombre'); } })));
      r.appendChild(h('div', { class: 'fila' }, h('label', { texto: 'Fondo ' }), h('input', { type: 'color', valor: A.p.fondo || '#000000', 'aria-label': 'Color de fondo', onchange: function () { A.p.fondo = this.value; A.dibujar(); A.commit('fondo'); } }),
        h('label', { texto: ' FPS ' }), h('select', { 'aria-label': 'Fotogramas por segundo', onchange: function () { A.p.fps = +this.value; A.commit('fps'); } }, [24, 30, 60].map(function (f) { return h('option', { value: f, selected: A.p.fps === f, texto: f }); }))));
      r.appendChild(h('p', { class: 'vacio', texto: 'Selecciona un clip en la línea de tiempo para ver y cambiar sus propiedades.' }));
      var tot = M.todos(A.p).length; r.appendChild(h('p', { class: 'ayuda', texto: tot + ' clips · duración ' + M.fmt(M.duracion(A.p)) + ' · ' + A.p.pistas.length + ' pistas' }));
      return;
    }
    var tipo = c.tipo, visual = tipo !== 'audio', conAudio = tipo === 'video' || tipo === 'audio', fuente = tipo === 'video' || tipo === 'imagen';
    var nom = { video: 'Video', imagen: 'Foto', audio: 'Audio', texto: 'Texto', emoji: 'Pegatina', forma: 'Forma' }[tipo];
    r.appendChild(h('h3', { texto: nom + (A.p.medios[c.medio] ? ': ' + A.p.medios[c.medio].nombre : '') }));
    r.appendChild(h('div', { class: 'fila' },
      h('button', { class: 'btn chico', onclick: function () { A.dividir(); } }, '✂ Dividir'), h('button', { class: 'btn chico', onclick: function () { A.duplicar(); } }, '⧉ Duplicar'),
      h('button', { class: 'btn chico peligro', onclick: function () { A.eliminarClip(c.id, $('tlRipple').checked); } }, '🗑 Eliminar')));
    // tiempo
    r.appendChild(sec('Tiempo', true,
      h('div', { class: 'fila' }, h('label', { texto: 'Inicio (s) ' }), h('input', { type: 'number', step: '0.1', min: '0', valor: +c.ini.toFixed(2), estilo: 'width:84px', 'aria-label': 'Inicio', onchange: function () { M.mover(A.p, c.id, +this.value); A.commit('ini'); A.refrescar(); } }),
        h('label', { texto: ' Duración ' }), h('input', { type: 'number', step: '0.1', min: '0.1', valor: +c.dur.toFixed(2), estilo: 'width:84px', 'aria-label': 'Duración', onchange: function () { M.recortarFin(A.p, c.id, c.ini + (+this.value)); A.commit('dur'); A.refrescar(); } }))));
    if (tipo === 'texto') {
      r.appendChild(sec('Texto', true,
        h('textarea', { rows: 3, valor: c.texto, 'aria-label': 'Contenido del texto', oninput: function () { c.texto = this.value; A.dibujar(); A.commit('texto', true); A.linea.render(); } }),
        selector(c, 'Estilo', 'estilo', [['basico', 'Básico'], ['contorno', 'Contorno'], ['caja', 'Caja'], ['subtitulo', 'Subtítulo'], ['resaltado', 'Resaltado'], ['neon', 'Neón'], ['retro', 'Retro'], ['impacto', 'Impacto'], ['gradiente', 'Degradado']]),
        selector(c, 'Fuente', 'fuente', FUENTES),
        h('div', { class: 'fila' }, h('label', { texto: 'Color ' }), h('input', { type: 'color', valor: c.color || '#ffffff', 'aria-label': 'Color', onchange: function () { cambio(c, 'color', this.value); } }),
          h('label', { texto: ' 2º color ' }), h('input', { type: 'color', valor: c.color2 || '#ff2d95', 'aria-label': 'Segundo color', onchange: function () { cambio(c, 'color2', this.value); } })),
        deslizador(c, 'Tamaño', 'tam', { min: 0.02, max: 0.4, step: 0.005, def: 0.07, fmt: function (x) { return Math.round(x * 100); } })));
    }
    if (tipo === 'emoji' || tipo === 'forma') {
      var cont = [];
      if (tipo === 'emoji') cont.push(h('div', { class: 'fila' }, h('label', { texto: 'Emoji ' }), h('input', { type: 'text', valor: c.texto, estilo: 'width:90px', 'aria-label': 'Emoji', oninput: function () { cambio(c, 'texto', this.value); A.linea.render(); } })));
      else { cont.push(selector(c, 'Forma', 'forma', [['circulo', 'Círculo'], ['rect', 'Rectángulo'], ['redondeado', 'Redondeado'], ['triangulo', 'Triángulo'], ['estrella', 'Estrella'], ['corazon', 'Corazón'], ['flecha', 'Flecha'], ['linea', 'Línea'], ['fondo', 'Fondo degradado']])); cont.push(h('div', { class: 'fila' }, h('label', { texto: 'Color ' }), h('input', { type: 'color', valor: c.color || '#ffd400', onchange: function () { cambio(c, 'color', this.value); }, 'aria-label': 'Color' }), h('label', { texto: ' 2º ' }), h('input', { type: 'color', valor: c.color2 || '#d92b8a', onchange: function () { cambio(c, 'color2', this.value); }, 'aria-label': 'Segundo color' }))); cont.push(deslizador(c, 'Alargar', 'relacion', { min: 0.2, max: 10, step: 0.1, def: 1 })); }
      cont.push(deslizador(c, 'Tamaño', 'tam', { min: 0.03, max: 1, step: 0.01, def: 0.2, fmt: function (x) { return Math.round(x * 100); } }));
      r.appendChild(sec(tipo === 'emoji' ? 'Pegatina' : 'Forma', true, ...cont));
    }
    if (tipo === 'texto' || tipo === 'emoji' || tipo === 'forma') {
      c.anim = c.anim || { in: 'ninguna', out: 'ninguna', dur: 0.5, cont: 'ninguna' };
      r.appendChild(sec('Animación', true,
        selector(c, 'Entrada', 'anim.in', Object.keys(ENT).map(function (k) { return [k, ENT[k]]; })), selector(c, 'Salida', 'anim.out', Object.keys(SAL).map(function (k) { return [k, SAL[k]]; })),
        selector(c, 'Continua', 'anim.cont', Object.keys(CON).map(function (k) { return [k, CON[k]]; })),
        deslizador(c, 'Duración', 'anim.dur', { min: 0.1, max: 3, step: 0.05, def: 0.5, fmt: function (x) { return (+x).toFixed(2) + ' s'; } })));
    }
    if (visual) {
      r.appendChild(sec('Posición y movimiento (◆ = fotograma clave)', true,
        deslizador(c, 'Posición X', 'x', { min: -1, max: 1, def: 0, kf: true }), deslizador(c, 'Posición Y', 'y', { min: -1, max: 1, def: 0, kf: true }),
        deslizador(c, 'Escala', 'esc', { min: 0.1, max: 4, step: 0.01, def: 1, kf: true, fmt: pct }), deslizador(c, 'Rotación', 'rot', { min: -180, max: 180, step: 1, def: 0, kf: true, fmt: function (x) { return Math.round(x) + '°'; } }),
        deslizador(c, 'Opacidad', 'op', { min: 0, max: 1, def: 1, kf: true, fmt: pct }),
        selector({ k: A.easeKf }, 'Interpolación', 'k', [['suave', 'Suave'], ['lineal', 'Lineal'], ['entra', 'Acelera'], ['sale', 'Frena'], ['rebote', 'Rebote'], ['elastico', 'Elástico']], function (v) { A.easeKf = v; }),
        h('div', { class: 'fila' }, h('button', { class: 'btn chico', onclick: function () { c.rot = (c.rot + 90 + 540) % 360 - 180; A.commit('rot'); A.dibujar(); A.refrescar(); } }, '↻ 90°'), chk(c, 'Voltear', 'flip'),
          h('button', { class: 'btn chico', onclick: function () { c.kf = {}; A.commit('kfx'); A.dibujar(); A.refrescar(); } }, 'Borrar fotogramas clave'))));
    }
    if (fuente) {
      r.appendChild(sec('Encuadre y recorte', false,
        selector(c, 'Ajuste', 'fit', [['cubrir', 'Llenar (recorta)'], ['ajustar', 'Mostrar todo']]),
        deslizador(c, 'Esquinas', 'radio', { min: 0, max: 0.5, step: 0.01, def: 0, fmt: pct }),
        h('div', { class: 'fila' }, h('button', { class: 'btn chico', onclick: function () { A.reencuadre(c.id); } }, '🎯 Reencuadre inteligente'), h('button', { class: 'btn chico', onclick: function () { c.foco = null; c.rec = null; A.commit('rec'); A.dibujar(); A.refrescar(); } }, 'Restablecer')),
        deslizador(c, 'Foco X', 'foco.x', { min: 0, max: 1, def: 0.5, alCambiar: function (v) { c.foco = c.foco || { x: 0.5, y: 0.5 }; cambio(c, 'foco.x', v); } }), deslizador(c, 'Foco Y', 'foco.y', { min: 0, max: 1, def: 0.5, alCambiar: function (v) { c.foco = c.foco || { x: 0.5, y: 0.5 }; cambio(c, 'foco.y', v); } }),
        ['x', 'y', 'w', 'h'].map(function (k) { return deslizador(c, 'Recorte ' + k, 'rec.' + k, { min: 0, max: 1, step: 0.005, def: k === 'w' || k === 'h' ? 1 : 0, alCambiar: function (v) { c.rec = c.rec || { x: 0, y: 0, w: 1, h: 1 }; cambio(c, 'rec.' + k, v); } }); })));
      c.aj = c.aj || M.AJ0();
      r.appendChild(sec('Filtro y color', false,
        selector(c, 'Filtro', 'filtro', Object.keys(FL.LISTA).map(function (k) { return [k, FL.LISTA[k].nombre]; })),
        deslizador(c, 'Brillo', 'aj.brillo', { min: -1, max: 1, def: 0 }), deslizador(c, 'Contraste', 'aj.contraste', { min: -1, max: 1, def: 0 }), deslizador(c, 'Saturación', 'aj.sat', { min: -1, max: 1, def: 0 }),
        deslizador(c, 'Temperatura', 'aj.temp', { min: -1, max: 1, def: 0 }), deslizador(c, 'Viñeta', 'aj.vineta', { min: 0, max: 1, def: 0 }), deslizador(c, 'Blanco y negro', 'aj.bn', { min: 0, max: 1, def: 0 }), deslizador(c, 'Retro VHS', 'aj.vhs', { min: 0, max: 1, def: 0 }),
        h('div', { class: 'fila' }, h('button', { class: 'btn chico', onclick: function () { c.aj = M.AJ0(); c.filtro = 'ninguno'; A.commit('aj'); A.dibujar(); A.refrescar(); } }, 'Restablecer color'))));
      var ck = c.croma || { on: false, color: '#00ff00', tol: 0.35, suave: 0.12 };
      r.appendChild(sec('Croma (pantalla verde)', !!(c.croma && c.croma.on),
        h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: ck.on, onchange: function () { c.croma = Object.assign({ color: '#00ff00', tol: 0.35, suave: 0.12 }, c.croma || {}, { on: this.checked }); A.commit('croma'); A.dibujar(); A.refrescar(); } }), ' Quitar color de fondo'),
        h('div', { class: 'fila' }, h('label', { texto: 'Color a quitar ' }), h('input', { type: 'color', valor: ck.color, 'aria-label': 'Color a quitar', onchange: function () { c.croma = Object.assign({}, ck, c.croma || {}, { color: this.value }); A.commit('croma'); A.dibujar(); } })),
        deslizador(c, 'Tolerancia', 'croma.tol', { min: 0, max: 1, def: 0.35, alCambiar: function (v) { c.croma = c.croma || ck; cambio(c, 'croma.tol', v); } }), deslizador(c, 'Bordes suaves', 'croma.suave', { min: 0, max: 1, def: 0.12, alCambiar: function (v) { c.croma = c.croma || ck; cambio(c, 'croma.suave', v); } }),
        h('p', { class: 'ayuda', texto: 'Coloca el clip con croma en la pista "Superpos." sobre otro fondo.' })));
      var tr = c.trans || { tipo: 'ninguna', dur: 0.6 };
      r.appendChild(sec('Transición de entrada', !!c.trans,
        h('div', { class: 'fila' }, h('select', { 'aria-label': 'Tipo de transición', onchange: function () { A.aplicarTransicion(this.value, tr.dur); } }, P.TRANS.map(function (t) { return h('option', { value: t[0], selected: t[0] === tr.tipo, texto: t[1] }); }))),
        deslizador(c, 'Duración', 'trans.dur', { min: 0.1, max: 2, step: 0.05, def: 0.6, fmt: function (x) { return (+x).toFixed(2) + ' s'; }, alCambiar: function (v) { if (c.trans) cambio(c, 'trans.dur', v); } })));
    }
    if (tipo === 'video' || tipo === 'audio') {
      r.appendChild(sec('Velocidad', true,
        h('div', { class: 'fila s' }, h('label', { texto: 'Velocidad' }), h('input', { type: 'range', min: 0.25, max: 4, step: 0.05, valor: c.vel, 'aria-label': 'Velocidad', oninput: function () { this.nextSibling.textContent = (+this.value).toFixed(2) + '×'; }, onchange: function () { M.velocidad(A.p, c.id, +this.value); A.motor.invalidar(); A.commit('vel'); A.refrescar(); } }), h('output', { texto: c.vel.toFixed(2) + '×' }), h('span')),
        h('div', { class: 'fila' }, [0.25, 0.5, 1, 1.5, 2, 3, 4].map(function (v) { return h('button', { class: 'btn chico' + (c.vel === v ? ' activo' : ''), onclick: function () { M.velocidad(A.p, c.id, v); A.motor.invalidar(); A.commit('vel'); A.refrescar(); } }, v + '×'); })),
        chk(c, 'Conservar el tono', 'tono'), chk(c, 'Invertir (rebobinar)', 'inv', function (v) { c.inv = v; A.motor.invalidar(); A.commit('inv'); A.dibujar(); A.refrescar(); }),
        tipo === 'video' ? h('div', { class: 'fila' }, h('button', { class: 'btn chico', onclick: function () { A.congelar(); } }, '❄ Congelar fotograma (2 s)'), h('button', { class: 'btn chico', title: 'Reduce el temblor de cámara analizando el movimiento', onclick: function () { A.estabilizar(c.id); } }, c.estabDatos ? '〰 Re-estabilizar' : '〰 Estabilizar'), c.estabDatos ? h('button', { class: 'btn chico', onclick: function () { delete c.estabDatos; A.commit('estab'); A.dibujar(); A.refrescar(); } }, 'Quitar estabilización') : null) : null));
    }
    if (conAudio) {
      r.appendChild(sec('Audio', true,
        deslizador(c, 'Volumen', 'vol', { min: 0, max: 2, step: 0.01, def: 1, fmt: pct }), chk(c, 'Silenciar', 'mute'),
        deslizador(c, 'Fundido de entrada', 'fi', { min: 0, max: Math.min(10, c.dur), step: 0.1, def: 0, fmt: function (x) { return (+x).toFixed(1) + ' s'; } }),
        deslizador(c, 'Fundido de salida', 'fo', { min: 0, max: Math.min(10, c.dur), step: 0.1, def: 0, fmt: function (x) { return (+x).toFixed(1) + ' s'; } }),
        tipo === 'video' ? h('div', { class: 'fila' }, h('button', { class: 'btn chico', onclick: function () { A.extraerAudio(); } }, '♫ Extraer audio a su pista')) : null));
    }
    r.parentNode.scrollTop = y;
  };
  g.VE.insp = I;
})(window);
