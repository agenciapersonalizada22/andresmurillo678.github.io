/* Captura guiada de un objeto fisico: el marcador da la posicion de la camara (azimut, elevacion, distancia); un anillo de sectores indica donde faltan fotos.
   Las fotos + poses salen en un ZIP para el modulo Reconstruccion 3D. window.RA.CG */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, RA = g.RA, G = RA.Geo, CG = RA.CG = {};
  var st = { n: 16, fotos: [], activo: false, auto: true, hecho: {}, estable: 0, ult: null, actual: null, nitidez: 0 };
  CG.estado = st;
  CG.sector = function (az, n) { return Math.floor(((az % 360) + 360) % 360 / 360 * n) % n; };
  CG.nitidez = function (gris, w, hh) { // varianza del laplaciano (mayor = mas nitido)
    var s = 0, s2 = 0, n = 0, x, y; for (y = 1; y < hh - 1; y += 2) for (x = 1; x < w - 1; x += 2) { var i = y * w + x, v = 4 * gris[i] - gris[i - 1] - gris[i + 1] - gris[i - w] - gris[i + w]; s += v; s2 += v * v; n++; }
    return n ? s2 / n - (s / n) * (s / n) : 0;
  };
  CG.faltan = function () { var f = []; for (var i = 0; i < st.n; i++) if (!st.hecho[i]) f.push(i); return f; };
  CG.posesJSON = function (ctx) {
    return JSON.stringify({ version: 1, origen: 'realidad-aumentada', sectores: st.n, ladoMarcadorMm: ctx.ladoMm, fovHorizontalGrados: ctx.fov, ancho: ctx.w, alto: ctx.h,
      nota: 'azimut: 0° = lado derecho del marcador, crece en sentido antihorario visto desde arriba. Para Reconstruccion 3D (siluetas) usa las fotos en orden de azimut con la distancia media.',
      fotos: st.fotos.map(function (f, i) { return { archivo: nombre(f, i), azimut: +f.az.toFixed(1), elevacion: +f.el.toFixed(1), distanciaMm: Math.round(f.dist * ctx.ladoMm), nitidez: Math.round(f.nit) }; }) }, null, 1);
  };
  function nombre(f, i) { return 'foto_' + String(i + 1).padStart(2, '0') + '_az' + Math.round(f.az) + '.jpg'; }
  /* llamar cada cuadro con {pose, ahora, gris, gw, gh, fuente, w, h, ladoMm} */
  CG.actualizar = function (c) {
    if (!c.pose) { st.actual = null; st.estable = 0; return null; }
    var e = G.azElDist(c.pose); e.sector = CG.sector(e.az, st.n); st.actual = e;
    if (st.ult && Math.abs(e.az - st.ult.az) < 2 && Math.abs(e.el - st.ult.el) < 2 && Math.abs(e.dist - st.ult.dist) < 0.06 * e.dist) st.estable += c.dt || 16; else st.estable = 0; st.ult = e;
    if (st.activo && st.auto && !st.hecho[e.sector] && e.el > 8 && st.estable > 350) {
      st.nitidez = CG.nitidez(c.gris, c.gw, c.gh); if (st.nitidez > 60) CG.capturar(c);
    }
    return e;
  };
  CG.capturar = function (c) {
    var e = st.actual; if (!e) { T.aviso('No veo el marcador: apunta a la mesa con el marcador junto al objeto.', 'error'); return; }
    var cv = document.createElement('canvas'); cv.width = c.w; cv.height = c.h; cv.getContext('2d').drawImage(c.fuente, 0, 0, c.w, c.h);
    var nit = st.nitidez || (c.gris ? CG.nitidez(c.gris, c.gw, c.gh) : 0);
    cv.toBlob(function (b) {
      if (!b) return; st.fotos.push({ blob: b, az: e.az, el: e.el, dist: e.dist, sector: e.sector, nit: nit, url: URL.createObjectURL(b) }); st.hecho[e.sector] = true; st.estable = 0;
      if (CG.alCambiar) CG.alCambiar(); if (RA.App) RA.App.logro('ra_captura_guiada');
    }, 'image/jpeg', 0.92);
  };
  CG.reiniciar = function () { st.fotos.forEach(function (f) { URL.revokeObjectURL(f.url); }); st.fotos = []; st.hecho = {}; st.estable = 0; if (CG.alCambiar) CG.alCambiar(); };
  CG.quitar = function (i) { var f = st.fotos.splice(i, 1)[0]; if (f) { URL.revokeObjectURL(f.url); st.hecho = {}; st.fotos.forEach(function (x) { st.hecho[x.sector] = true; }); } if (CG.alCambiar) CG.alCambiar(); };
  CG.zip = async function (ctx) {
    var arch = []; for (var i = 0; i < st.fotos.length; i++) arch.push({ nombre: nombre(st.fotos[i], i), datos: new Uint8Array(await st.fotos[i].blob.arrayBuffer()) });
    arch.push({ nombre: 'poses.json', datos: T.bytes(CG.posesJSON(ctx)) });
    arch.push({ nombre: 'LEEME.txt', datos: T.bytes('Fotos tomadas con el modulo Realidad aumentada (captura guiada).\r\n1) Descomprime este ZIP.\r\n2) Abre Trabajos > Reconstruccion 3D > Captura > Elegir fotos y selecciona los .jpg.\r\n3) Usa poses.json para ver el azimut de cada foto (mesa giratoria: ' + (360 / st.n).toFixed(1) + ' grados entre fotos) y la distancia media.\r\nNo se subio nada: todo ocurre en tu dispositivo.\r\n') });
    return T.zip(arch);
  };
  /* anillo de sectores (canvas pequeno) */
  CG.dibujarAnillo = function (cv) {
    var x = cv.getContext('2d'), W = cv.width, c = W / 2, r = c - 16, n = st.n, i; x.clearRect(0, 0, W, W); x.lineWidth = 12;
    for (i = 0; i < n; i++) {
      var a0 = i / n * 2 * Math.PI - 0.5 * Math.PI * 0 + 0.03, a1 = (i + 1) / n * 2 * Math.PI - 0.03, cur = st.actual && st.actual.sector === i; // 0 grados = derecha, antihorario (y invertida en canvas)
      x.strokeStyle = st.hecho[i] ? '#37b24d' : cur ? '#ffd43b' : '#868e96'; x.beginPath(); x.arc(c, c, r, -a1, -a0); x.stroke();
    }
    x.fillStyle = '#868e96'; x.fillRect(c - 12, c - 12, 24, 24); x.fillStyle = '#fff'; x.font = 'bold 13px system-ui'; x.textAlign = 'center'; x.fillText('marcador', c, c + 30);
    if (st.actual) { var a = st.actual.az * Math.PI / 180, rr = r - 22 - Math.max(0, Math.min(1, (st.actual.el / 90))) * 20; x.fillStyle = '#ffd43b'; x.beginPath(); x.arc(c + Math.cos(a) * rr, c - Math.sin(a) * rr, 7, 0, 7); x.fill(); }
    x.fillStyle = '#fff'; x.font = 'bold 20px system-ui'; x.fillText(Object.keys(st.hecho).length + ' / ' + n, c, c + 4 - 30 + 30 * 0);
  };
})(window);
