/* Calculos puros de camara, fotogrametria, exposicion, almacenamiento, monturas, viento y bateria. window.DronCalc */
(function (g, f) { const m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.DronCalc = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const C = {}, RAD = Math.PI / 180, DEG = 180 / Math.PI, FF_DIAG = Math.hypot(36, 24);
  const num = (v, d) => { v = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v; return isFinite(v) ? v : d; };
  const r = (v, n) => { const k = Math.pow(10, n == null ? 2 : n); return Math.round(v * k) / k; };
  C.num = num; C.r = r;

  /* ---- optica ---- */
  C.fov = (lado, f) => 2 * Math.atan(lado / (2 * f)) * DEG;
  C.fovCamara = (sw, sh, f) => ({ h: C.fov(sw, f), v: C.fov(sh, f), d: C.fov(Math.hypot(sw, sh), f) });
  C.recorte = (sw, sh) => FF_DIAG / Math.hypot(sw, sh);
  C.focalEquiv = (f, sw, sh) => f * C.recorte(sw, sh);
  C.circuloConfusion = (sw, sh) => Math.hypot(sw, sh) / 1500;
  C.hiperfocal = (f, N, c) => f * f / (N * c) + f;                       // mm
  C.profundidad = (f, N, c, dist) => {                                    // dist y resultados en mm
    const H = C.hiperfocal(f, N, c), cerca = H * dist / (H + (dist - f)), lejos = dist >= H ? Infinity : H * dist / (H - (dist - f));
    return { H, cerca, lejos };
  };
  C.ANCHO_FF = 36;

  /* ---- fotogrametria ---- */
  C.gsd = (sw, f, pw, alt) => (sw * alt * 100) / (f * pw);               // cm/px; sw,f en mm, alt en m
  C.altParaGsd = (gsdCm, sw, f, pw) => gsdCm * f * pw / (sw * 100);      // m
  C.huella = (gsdCm, pw, ph) => ({ ancho: gsdCm * pw / 100, alto: gsdCm * ph / 100 });
  C.solape = (huella, sep) => Math.max(0, 1 - sep / huella);
  /* cam: {sw,sh,f,pw,ph,intervaloMin}; el ancho de imagen es perpendicular a la linea de vuelo. */
  C.fotogrametria = (cam, alt, frontal, lateral, vel) => {
    const gsd = C.gsd(cam.sw, cam.f, cam.pw, alt), h = C.huella(gsd, cam.pw, cam.ph);
    const sepFotos = h.alto * (1 - frontal), sepLineas = h.ancho * (1 - lateral);
    const o = { gsd, anchoHuella: h.ancho, altoHuella: h.alto, sepFotos, sepLineas, intervalo: vel > 0 ? sepFotos / vel : null };
    o.velMax = cam.intervaloMin > 0 ? sepFotos / cam.intervaloMin : null;
    o.fotosHa = 10000 / (sepFotos * sepLineas);
    return o;
  };
  C.areaMapeo = (ancho, alto, sepFotos, sepLineas) => {
    const lineas = Math.ceil(alto / sepLineas) + 1, porLinea = Math.floor(ancho / sepFotos) + 1;
    return { lineas, porLinea, fotos: lineas * porLinea };
  };

  /* ---- exposicion ---- */
  C.obturador180 = (fps, angulo) => 1 / (fps * 360 / (angulo || 180));    // s
  C.ESCENAS = [['Sol directo (EV 15)', 15], ['Sol suave / velado (EV 14)', 14], ['Nublado (EV 13)', 13], ['Sombra / atardecer (EV 12)', 12], ['Hora dorada baja (EV 10)', 10], ['Interior luminoso (EV 8)', 8]];
  C.stopsND = (ev100, iso, N, t) => ev100 + Math.log2(iso / 100) - Math.log2(N * N / t);
  C.ndPara = (ev100, iso, N, fps, angulo) => {
    const t = C.obturador180(fps, angulo), stops = C.stopsND(ev100, iso, N, t), cand = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 15];
    const mas = cand.filter(s => s >= stops - 0.34)[0];
    return { obturador: t, stops, nd: Math.max(0, mas == null ? 15 : mas), sobra: stops };
  };
  C.ndFactor = stops => Math.pow(2, stops);
  C.isoEquivalente = (N1, t1, iso1, N2, t2) => iso1 * (N2 * N2) / (N1 * N1) * (t1 / t2);
  C.ev = (N, t, iso) => Math.log2(N * N / t) - Math.log2((iso || 100) / 100);

  /* ---- video ---- */
  C.gbPorHora = mbps => mbps * 3600 / 8 / 1000;
  C.minutosEnTarjeta = (gb, mbps) => gb * 1000 * 8 / mbps / 60;
  C.gbPorMinuto = mbps => mbps * 60 / 8 / 1000;

  /* ---- monturas ---- */
  C.COBERTURA = { '1in': 15.9, MFT: 21.6, APSC: 28.4, S35: 31.1, FF: 43.3, MF: 55 };
  C.compatMontura = (lente, cam, factor) => {       // lente/cam: {ffd,nombre}; cam.sw/sh opcional para cobertura
    const o = { ok: false, tipo: '', espesor: null, notas: [] };
    if (!lente || !cam || lente.ffd == null || cam.ffd == null) { o.tipo = 'desconocido'; o.notas.push('Faltan datos de la montura.'); return o; }
    if (lente.nombre && lente.nombre === cam.nombre) { o.ok = true; o.tipo = 'directo'; o.espesor = 0; }
    else if (lente.ffd > cam.ffd + 0.05) { o.ok = true; o.tipo = 'adaptador'; o.espesor = r(lente.ffd - cam.ffd, 2); o.notas.push('Adaptador sin cristal de ' + o.espesor + ' mm: enfoca a infinito.'); }
    else { o.tipo = 'imposible'; o.notas.push('La lente necesita ' + r(lente.ffd, 2) + ' mm de registro y la cámara solo deja ' + r(cam.ffd, 2) + ' mm: sin óptica extra no enfoca a infinito.'); }
    return o;
  };
  C.vineteo = (cobertura, sw, sh) => { const d = C.COBERTURA[cobertura]; return d ? d < Math.hypot(sw, sh) - 0.3 : false; };
  C.equivalente = (f, N, sw, sh, factor) => { factor = factor || 1; return { focal: f * factor, apertura: N * factor, equiv35: f * factor * C.recorte(sw, sh), recorte: C.recorte(sw, sh) / factor }; };

  /* ---- dolly zoom ---- */
  C.dollyZoom = (f1, d1, d2) => f1 * d2 / d1;      // mismo tamaño aparente del sujeto

  /* ---- viento / bateria ---- */
  C.potencia = (pHover, v) => pHover * (1 + 0.004 * v * v);
  C.autonomia = ({ capWh, pHover, usable, vAire, viento, masaKg, temp }) => {
    usable = usable == null ? 0.8 : usable;
    const fT = temp == null ? 1 : temp >= 20 ? 1 : temp >= 10 ? 0.95 : temp >= 0 ? 0.85 : 0.7;
    const wh = capWh * usable * fT, vel = vAire || 0, w = viento || 0;
    const tHover = wh / pHover * 60, tCrucero = vel > 0 ? wh / C.potencia(pHover, vel) * 60 : tHover;
    const out = { whUtil: wh, factorTemp: fT, hoverMin: tHover, cruceroMin: tCrucero, rangoSinViento: vel * tCrucero * 60 };
    if (vel > w) { const T = tCrucero * 60; out.radioConViento = T * (vel * vel - w * w) / (2 * vel); out.velContra = vel - w; out.velFavor = vel + w; }
    else { out.radioConViento = 0; out.velContra = vel - w; out.advertencia = 'El viento iguala o supera la velocidad del dron: no avanza contra el viento.'; }
    out.radioRecomendado = out.radioConViento * 0.8;
    return out;
  };
  C.rafagas = (v) => v >= 12 ? 'No volar: viento excesivo para la mayoría de drones de consumo.' : v >= 8 ? 'Viento fuerte: solo vuelo corto y cerca; vigila la batería.' : v >= 5 ? 'Viento moderado: reduce el radio y planifica el regreso con viento en contra.' : 'Viento flojo.';
  return C;
});
