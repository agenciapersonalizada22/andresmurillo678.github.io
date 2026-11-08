/* Pestana Visor: la escena 3D en lado a lado, Cardboard (distorsion de lente ajustable + distancia interpupilar), anaglifo o WebXR VR; control tactil, mando y giroscopio. window.RA.VVisor */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, RA = g.RA, A = RA.App, P = RA.Panel, V = RA.VVisor = {};
  var el = {}, E = null, activo = false, ro = null, ptrs = {};
  var MODOS = [['mono', 'Normal'], ['sbs', 'Lado a lado'], ['cardboard', 'Cardboard (con distorsión de lente)'], ['anaglifo', 'Anaglifo rojo/cian']];
  function asegurar() { if (E && E.listo) return true; if (!RA.E3) return false; E = RA.E3; return E.init(); }
  function medir() {
    if (!E || !E.listo) return; var r = el.caja.getBoundingClientRect(), dpr = Math.min(g.devicePixelRatio || 1, 1.5); if (r.width < 10) return;
    E.tam(Math.max(2, Math.round(r.width * dpr)), Math.max(2, Math.round(r.height * dpr))); E.canvas.style.width = '100%'; E.canvas.style.height = '100%';
  }
  function guardar() { var v = E.visor; A.aj.ipd = v.ipd; A.aj.k1 = v.k1; A.aj.k2 = v.k2; A.aj.sep = v.sep; A.aj.fovVisor = v.fov; A.guardarAj(); }
  function cuadro(t) {
    if (!activo) return; if (E.xr.activa === 'vr') { E.renderer.clear(true, true, true); E.renderer.render(E.scene, E.camVis); return; }
    var Md = g.Mando, v = E.visor, o = E.orbita, dt = 1 / 60;
    if (Md) { try { Md.leer(); } catch (e) { /* sin mando */ }
      if (Md.conectado) {
        var L = Md.ejes.izq, R = Md.ejes.der;
        if (v.cabeza) { v.yaw -= R.x * 0.03; v.pit = Math.max(-1.4, Math.min(1.4, v.pit - R.y * 0.03)); var f = [-Math.sin(v.yaw), -Math.cos(v.yaw)], s = [Math.cos(v.yaw), -Math.sin(v.yaw)]; v.pos[0] += (f[0] * -L.y + s[0] * L.x) * 0.03; v.pos[2] += (f[1] * -L.y + s[1] * L.x) * 0.03; v.pos[1] += (Md.gatillo.der - Md.gatillo.izq) * 0.02; }
        else { o.th -= R.x * 0.03; o.ph = Math.max(-1.4, Math.min(1.4, o.ph + R.y * 0.03)); o.r = Math.max(0.3, o.r * Math.exp((Md.gatillo.der - Md.gatillo.izq) * 0.03 - L.y * 0.02)); o.th -= L.x * 0.02; }
        if (Md.pulsado('A')) recentrar(); if (Md.pulsado('B')) ciclarModo(); if (Md.pulsado('X')) alternarCabeza(); if (Md.pulsado('Y')) E.encuadre(); el.mando.textContent = 'Mando: ' + Md.nombre.slice(0, 28) + ' (A recentra, B cambia de modo, X cabeza/órbita, Y encuadra)';
      } else el.mando.textContent = 'Sin mando conectado (pulsa un botón del mando).';
    }
    if (v.cabeza) v.quat = RA.Sens.cuatRelativo();
    E.renderVisor();
  }
  function recentrar() { var E2 = E; if (RA.Sens.activo) RA.Sens.recentrar(); E2.visor.yaw = 0; E2.visor.pit = 0; E2.orbita.th = 0.6; E2.orbita.ph = 0.45; E2.encuadre(); }
  function ciclarModo() { var i = MODOS.map(function (m) { return m[0]; }).indexOf(E.visor.modo); poner(MODOS[(i + 1) % MODOS.length][0]); }
  function poner(m) { E.visor.modo = m; el.modo.value = m; el.cardboard.hidden = m !== 'cardboard'; el.estereo.hidden = m === 'mono'; A.logro('ra_visor_' + m); if (m === 'cardboard') { el.aviso.textContent = 'Pon el teléfono en horizontal dentro de las gafas Cardboard. Ajusta la distancia interpupilar y la distorsión hasta que las líneas rectas se vean rectas.'; } else el.aviso.textContent = m === 'anaglifo' ? 'Usa gafas rojo (ojo izquierdo) y cian (derecho).' : m === 'sbs' ? 'Para visión cruzada o paralela sin lentes: relaja los ojos hasta fusionar las dos imágenes.' : ''; }
  async function alternarCabeza() { var v = E.visor; v.cabeza = !v.cabeza; if (v.cabeza) { var ok = await RA.Sens.activar(); if (!ok) { T.aviso('No hay giroscopio disponible o se negó el permiso; usa la órbita táctil o el mando.', 'error'); v.cabeza = false; } else { RA.Sens.recentrar(); A.logro('ra_visor_giroscopio'); } } el.cabeza.setAttribute('aria-pressed', v.cabeza); el.cabeza.textContent = v.cabeza ? 'Control: cabeza (giroscopio)' : 'Control: órbita'; }
  function pantallaCompleta() { var c = el.caja; if (document.fullscreenElement) { document.exitFullscreen(); return; } (c.requestFullscreen ? c.requestFullscreen() : Promise.reject()).then(function () { try { screen.orientation.lock('landscape').catch(function () {}); } catch (e) { /* sin bloqueo */ } }).catch(function () { T.aviso('Este navegador no permite pantalla completa aquí.', 'error'); }); }
  V.activar = function () {
    if (!asegurar()) { el.vacio.hidden = false; return; } el.vacio.hidden = true; activo = true; E.preparaVisor(); el.caja.insertBefore(E.canvas, el.caja.firstChild); E.cuadro = cuadro; E.visor.mpu = A.aj.mpu || E.visor.mpu; medir(); E.encuadre();
    if (!ro && g.ResizeObserver) { ro = new ResizeObserver(medir); ro.observe(el.caja); } E.renderVisor();
  };
  V.desactivar = function () { if (!E || !E.listo) return; activo = false; E.cuadro = null; E.salirVisor(); if (E.canvas.parentNode === el.caja) el.caja.removeChild(E.canvas); if (document.fullscreenElement) document.exitFullscreen(); };
  V.iniciar = function (raiz) {
    el.caja = h('div', { cls: 'ra-visor', tabindex: 0, 'aria-label': 'Visor 3D. Flechas orbitan, + y − acercan, M cambia de modo, R recentra, F pantalla completa.' }); el.vacio = h('div', { cls: 'ra-vacio-lienzo', hidden: true }, [h('p', { txt: 'Este navegador no ofrece WebGL: el visor 3D no está disponible.' })]); el.caja.appendChild(el.vacio);
    var v = { ipd: A.aj.ipd, k1: A.aj.k1, k2: A.aj.k2, sep: A.aj.sep, fov: A.aj.fovVisor };
    function conE(fn) { return function (x) { if (asegurar()) { fn(x); guardar(); } }; }
    el.modo = h('select', { 'aria-label': 'Modo de visualización' }, MODOS.map(function (m) { return h('option', { value: m[0], txt: m[1] }); })); el.modo.addEventListener('change', function () { if (asegurar()) poner(el.modo.value); });
    el.cabeza = h('button', { type: 'button', cls: 'tr-btn', 'aria-pressed': 'false', txt: 'Control: órbita', on: { click: function () { if (asegurar()) alternarCabeza(); } } });
    el.estereo = h('div', { hidden: true }, [P.rango('Distancia interpupilar (mm)', 50, 75, 1, v.ipd, conE(function (x) { E.visor.ipd = x; })), P.rango('Tamaño aparente (m por unidad)', 0.1, 2, 0.05, A.aj.mpu || 0.5, conE(function (x) { E.visor.mpu = x; A.aj.mpu = x; })), P.rango('Campo de visión (°)', 40, 110, 1, v.fov, conE(function (x) { E.visor.fov = x; }))]);
    el.cardboard = h('div', { hidden: true }, [P.rango('Distorsión de lente k1', 0, 0.8, 0.01, v.k1, conE(function (x) { E.visor.k1 = x; }), function (x) { return x.toFixed(2); }), P.rango('Distorsión de lente k2', 0, 1.2, 0.01, v.k2, conE(function (x) { E.visor.k2 = x; }), function (x) { return x.toFixed(2); }), P.rango('Separación de lentes', -0.2, 0.2, 0.01, v.sep, conE(function (x) { E.visor.sep = x; }), function (x) { return x.toFixed(2); }),
      h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Cardboard v1 (0,34 / 0,55)', on: { click: function () { if (asegurar()) { E.visor.k1 = 0.34; E.visor.k2 = 0.55; guardar(); T.aviso('Valores de Cardboard v1. Recarga el visor para ver los controles actualizados.'); } } } })])]);
    el.aviso = h('p', { cls: 'tr-nota', 'aria-live': 'polite' }); el.mando = h('p', { cls: 'tr-ayuda', 'aria-live': 'polite', txt: 'Sin mando conectado (pulsa un botón del mando).' });
    el.xr = h('p', { cls: 'tr-ayuda', 'aria-live': 'polite' });
    var bVR = h('button', { type: 'button', cls: 'tr-btn', txt: 'Entrar en VR (WebXR)', on: { click: async function () { if (!asegurar()) return; try { await E.entrarVR(); A.logro('ra_visor_webxr_vr'); } catch (e) { T.aviso(e.message, 'error'); } } } });
    function pintarXR() { var x = RA.E3 && RA.E3.xr; bVR.disabled = !(x && x.vr); el.xr.textContent = !x ? 'Comprobando WebXR…' : x.vr ? 'WebXR VR disponible (visor con mandos de realidad virtual).' : 'WebXR VR no disponible en este dispositivo/navegador. Cardboard y lado a lado funcionan igual.'; }
    g.addEventListener('ra-xr', pintarXR); A.con3d(function () { if (RA.E3.init()) { pintarXR(); } }); pintarXR();
    raiz.appendChild(h('div', { cls: 'ra-dos ra-visor-dos' }, [el.caja, h('div', {}, [
      h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Visor 3D' }), h('p', { cls: 'tr-ayuda', txt: 'Muestra los objetos que tienes en la escena (pestaña Objetos / En vivo).' }), h('label', { cls: 'ra-campo' }, [h('span', { txt: 'Modo' }), el.modo]), el.aviso, el.estereo, el.cardboard]),
      h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Control' }), h('div', { cls: 'tr-acciones' }, [el.cabeza, h('button', { type: 'button', cls: 'tr-btn', txt: 'Recentrar', on: { click: function () { if (asegurar()) recentrar(); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Pantalla completa', on: { click: pantallaCompleta } }), bVR]), el.xr, el.mando])])]));
    el.caja.addEventListener('pointerdown', function (e) { if (e.target.closest && e.target.closest('button')) return; ptrs[e.pointerId] = [e.clientX, e.clientY]; el.caja.setPointerCapture(e.pointerId); });
    el.caja.addEventListener('pointermove', function (e) {
      var p = ptrs[e.pointerId]; if (!p || !E || !E.listo) return; var ids = Object.keys(ptrs), o = E.orbita, vv = E.visor;
      if (ids.length === 2) { var o2 = ids.filter(function (k) { return +k !== e.pointerId; })[0], q = ptrs[o2], d0 = Math.hypot(p[0] - q[0], p[1] - q[1]), d1 = Math.hypot(e.clientX - q[0], e.clientY - q[1]); if (d0 > 5) { if (vv.cabeza) { vv.pos[2] -= (d1 - d0) * 0.004; } else o.r = Math.max(0.3, Math.min(12, o.r * d0 / d1)); } }
      else if (vv.cabeza) { vv.yaw -= (e.clientX - p[0]) * 0.005; vv.pit = Math.max(-1.4, Math.min(1.4, vv.pit - (e.clientY - p[1]) * 0.005)); } else { o.th -= (e.clientX - p[0]) * 0.007; o.ph = Math.max(-1.4, Math.min(1.4, o.ph + (e.clientY - p[1]) * 0.007)); }
      ptrs[e.pointerId] = [e.clientX, e.clientY];
    });
    function suelta(e) { delete ptrs[e.pointerId]; } el.caja.addEventListener('pointerup', suelta); el.caja.addEventListener('pointercancel', suelta);
    el.caja.addEventListener('wheel', function (e) { if (!E || !E.listo) return; e.preventDefault(); E.orbita.r = Math.max(0.3, Math.min(12, E.orbita.r * Math.exp(e.deltaY * 0.001))); }, { passive: false });
    el.caja.addEventListener('keydown', function (e) {
      if (!E || !E.listo) return; var o = E.orbita, k = e.key;
      if (k === 'ArrowLeft') o.th += 0.08; else if (k === 'ArrowRight') o.th -= 0.08; else if (k === 'ArrowUp') o.ph = Math.min(1.4, o.ph + 0.06); else if (k === 'ArrowDown') o.ph = Math.max(-1.4, o.ph - 0.06); else if (k === '+') o.r = Math.max(0.3, o.r / 1.1); else if (k === '-') o.r = Math.min(12, o.r * 1.1);
      else if (k === 'm' || k === 'M') ciclarModo(); else if (k === 'r' || k === 'R') recentrar(); else if (k === 'f' || k === 'F') pantallaCompleta(); else return; e.preventDefault();
    });
    g.addEventListener('ra-3d-listo', function () { if (RA.E3.init()) { var vv = RA.E3.visor; vv.ipd = A.aj.ipd; vv.k1 = A.aj.k1; vv.k2 = A.aj.k2; vv.sep = A.aj.sep; vv.fov = A.aj.fovVisor; if (A.aj.mpu) vv.mpu = A.aj.mpu; } });
  };
})(window);
