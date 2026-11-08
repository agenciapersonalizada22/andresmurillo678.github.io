/* Operaciones pesadas (puro; corren en Worker o, si falla, en el hilo principal). R3D.Ops.<op>(datos, progreso(p, texto)) */
(function (root) {
  'use strict';
  var R = root.R3D = root.R3D || {}, O = R.Ops = {};
  O.MAX_VOXELES = 14e6;
  O.estimarVoxeles = function (res, caja) { var t = [caja.max[0] - caja.min[0], caja.max[1] - caja.min[1], caja.max[2] - caja.min[2]], p = Math.max(t[0], t[1], t[2]) / res; return (Math.ceil(t[0] / p) + 3) * (Math.ceil(t[1] / p) + 3) * (Math.ceil(t[2] / p) + 3); };
  /* d: {vistas:[{cam, w,h, mascara, rgba?}], caja?, res, ignorar, colorear}  -> {pos,idx,col,info} */
  O.giro = function (d, prog) {
    prog = prog || function () {}; var H = R.Hull, vistas = d.vistas.map(function (v) { return { cam: v.cam, mascara: v.mascara, img: v.rgba ? { w: v.cam.w, h: v.cam.h, data: v.rgba } : null }; });
    var caja = d.caja || H.cajaDesdeVistas(vistas, 0.06), nvox = O.estimarVoxeles(d.res, caja);
    if (nvox > O.MAX_VOXELES) throw new Error('Resolución demasiado alta para la memoria (' + Math.round(nvox / 1e6) + ' M de voxeles; máximo ' + Math.round(O.MAX_VOXELES / 1e6) + ' M). Baja la resolución.');
    prog(0.02, 'Distancias de silueta');
    vistas.forEach(function (v) { v.sdf = H.sdf(v.mascara, v.cam.w, v.cam.h); });
    var t0 = Date.now(), c = H.tallar(vistas, caja, d.res, d.ignorar || 0, function (p) { prog(0.1 + p * 0.7, 'Tallando voxeles'); });
    prog(0.85, 'Extrayendo superficie'); var m = R.MC.malla(c.campo, c.nx, c.ny, c.nz, c.orig, c.paso, 0);
    if (!m.idx.length) throw new Error('No quedó volumen: revisa las siluetas (¿el objeto está dentro del encuadre y bien segmentado?) o los ángulos.');
    var malla = R.Malla.nueva(m.pos, m.idx, null, d.nombre || 'Visual hull');
    if (d.colorear && vistas.some(function (v) { return v.img; })) { prog(0.92, 'Proyectando color'); malla.col = H.colorear(malla, vistas); }
    prog(1, 'Listo'); malla.info = { voxeles: c.nx * c.ny * c.nz, paso: c.paso, caja: caja, ms: Date.now() - t0 }; return malla;
  };
  /* d: {L,R:{w,h,data}, F, B, dmin,dmax, ventana, unicidad, rectificar, paso, zMax, limpiar} -> {disp, vis, nube, rect, stats} */
  O.estereo = function (d, prog) {
    prog = prog || function () {}; var E = R.Estereo, L = d.L, Rr = d.R, rect = { dy: 0, rot: 0 };
    var gl = E.gris(L), gr0 = E.gris(Rr);
    if (d.rectificar) { prog(0.05, 'Rectificando'); rect = E.estimarDesajuste(gl, gr0, L.w, L.h, { maxDy: d.maxDy || 10, maxRot: d.maxRot == null ? 2 : d.maxRot }); if (rect.ok && (rect.dy || rect.rot)) { Rr = E.rectificarDerecha(Rr, rect.dy, rect.rot); } }
    var gr = E.gris(Rr); var disp = E.bloques(gl, gr, L.w, L.h, { dmin: d.dmin, dmax: d.dmax, ventana: d.ventana, unicidad: d.unicidad, maxCosto: d.maxCosto }, function (p) { prog(0.15 + 0.7 * p, 'Block matching'); });
    if (d.limpiar !== false) disp = E.limpiarDisp(disp, L.w, L.h, 3);
    prog(0.92, 'Nube de puntos'); var nube = E.nube(disp, L, d.F, d.B, { paso: d.paso || 1, zMax: d.zMax }), val = 0; for (var i = 0; i < disp.length; i++) if (!isNaN(disp[i])) val++;
    var vis = E.coloresDisp(disp, L.w, L.h, d.dmin, d.dmax); prog(1, 'Listo');
    return { disp: disp, vis: vis, nube: nube, rect: rect, stats: { validos: val / disp.length, puntos: nube.pos.length / 3 } };
  };
  O.decimar = function (d) { return R.Malla.decimar(d.malla, d.objetivo); };
  O.leer = function (d) { return R.Formatos.leer(d.nombre, d.datos); };
  O.exportar = function (d) { return R.Formatos.exportar(d.malla, d.formato, d.opts); };
  if (typeof module === 'object' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : globalThis);
