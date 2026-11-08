/* Estadisticas, limites y linea de tiempo de una mision (puro). window.DronMision */
(function (g, f) { const m = f(g.DronGeo || require('./geo.js'), g.DronCalc || require('./calculos.js')); if (typeof module === 'object' && module.exports) module.exports = m; else g.DronMision = m; })(typeof self !== 'undefined' ? self : this, function (Geo, Calc) {
  'use strict';
  const M = {}, VV_SUBE = 3, VV_BAJA = 2, T_ROTAR = 12;
  M.nueva = () => ({ origen: { lat: 4.711, lon: -74.0721, nombre: 'Punto de despegue' }, vel: 5, altDef: 50, retorno: true, wps: [],
    dron: { capWh: 50, pHover: 110, masaKg: 0.9, usable: 0.8, vMax: 16 }, foto: { frontal: 0.75, lateral: 0.65 }, viento: { vel: 0, dir: 0 }, plano: { ancho: 400, cx: 0, cy: 0, visible: true } });
  const vel = (w, m) => Math.max(0.5, +w.vel || m.vel || 5);
  /* velocidad sobre el suelo con viento (dir = de donde sopla, grados); aire = velocidad respecto al aire */
  M.velSuelo = (vAire, rumbo, viento) => {
    if (!viento || !viento.vel) return vAire;
    const th = (rumbo - (viento.dir + 180)) * Math.PI / 180, along = viento.vel * Math.cos(th), cross = viento.vel * Math.sin(th);
    const t = vAire * vAire - cross * cross; if (t <= 0) return 0.1;
    return Math.max(0.1, Math.sqrt(t) + along);
  };
  /* linea de tiempo: segmentos desde el punto de despegue (0,0,0), por los waypoints y de vuelta */
  M.lineaTiempo = m => {
    const d = m.dron || {}, segs = [], pts = [{ x: 0, y: 0, alt: 0, vel: m.vel, giro: -30, rumbo: null, home: true }].concat(m.wps.map((w, i) => Object.assign({ idx: i }, w)));
    if (m.retorno && m.wps.length) pts.push({ x: 0, y: 0, alt: 0, vel: m.vel, giro: m.wps[m.wps.length - 1].giro, rumbo: null, home: true, ret: true });
    let t = 0, e = 0, rumbo = m.wps.length && m.wps[0].rumbo != null ? m.wps[0].rumbo : 0, dist = 0, dist3 = 0;
    const eMax = (d.capWh || 1) * (d.usable == null ? 0.8 : d.usable);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], dh = Geo.dist(a.x, a.y, b.x, b.y), dz = b.alt - a.alt, va = vel(b, m), rb = dh > 0.3 ? Geo.rumbo(a.x, a.y, b.x, b.y) : rumbo;
      const gs = M.velSuelo(va, rb, m.viento), tH = dh > 0.01 ? dh / gs : 0, tV = Math.abs(dz) / (dz >= 0 ? VV_SUBE : VV_BAJA), dt = Math.max(tH, tV, 0.001);
      const vAireEf = dh > 0.01 && dt > 0 ? Math.min(va, (dh / dt) * (va / gs)) : 0, p = Calc.potencia(d.pHover || 100, vAireEf);
      const eSube = dz > 0 ? (d.masaKg || 1) * 9.81 * dz / 3600 / 0.6 : 0, de = p * dt / 3600 + eSube;
      const hdgB = b.rumbo != null && !b.home ? b.rumbo : rb;
      segs.push({ t0: t, t1: t + dt, e0: e, e1: e + de, a, b, vel: dh / dt, rumbo0: rumbo, rumbo1: hdgB, giro0: a.giro, giro1: b.giro, tipo: b.ret ? 'retorno' : 'ruta', idx: b.idx, dh, dz, rb, gs });
      t += dt; e += de; dist += dh; dist3 += Math.hypot(dh, dz); rumbo = hdgB;
      const pausa = b.home ? 0 : (+b.pausa || 0) + (b.accion === 'pausa' && !b.pausa ? 3 : 0) + (b.accion === 'rotar' ? T_ROTAR : 0);
      if (pausa > 0) { const dep = Calc.potencia(d.pHover || 100, 0) * pausa / 3600; segs.push({ t0: t, t1: t + pausa, e0: e, e1: e + dep, a: b, b, vel: 0, rumbo0: rumbo, rumbo1: b.accion === 'rotar' ? rumbo + 360 : rumbo, giro0: b.giro, giro1: b.giro, tipo: 'pausa', idx: b.idx, dh: 0, dz: 0 }); t += pausa; e += dep; }
    }
    return { segs, duracion: t, energia: e, eMax, distancia: dist, distancia3d: dist3 };
  };
  M.posicion = (tl, t) => {
    const s = tl.segs; if (!s.length) return { x: 0, y: 0, alt: 0, vel: 0, rumbo: 0, giro: 0, bat: 100, t: 0 };
    t = Math.max(0, Math.min(tl.duracion, t)); let i = 0; while (i < s.length - 1 && t > s[i].t1) i++;
    const g = s[i], k = g.t1 > g.t0 ? Math.min(1, Math.max(0, (t - g.t0) / (g.t1 - g.t0))) : 1, L = (p, q) => p + (q - p) * k;
    const e = L(g.e0, g.e1);
    return { x: L(g.a.x, g.b.x), y: L(g.a.y, g.b.y), alt: L(g.a.alt, g.b.alt), vel: g.vel, rumbo: Geo.norm360(L(g.rumbo0, g.tipo === 'pausa' ? g.rumbo1 : g.rumbo0 + Geo.difAng(g.rumbo0, g.rumbo1))), giro: L(g.giro0, g.giro1), bat: Math.max(0, 100 * (1 - e / tl.eMax)), t, idx: g.idx, tipo: g.tipo };
  };
  /* resumen y avisos. perfil: {alturaMax, distMax, vlos, nombre} (opcional) */
  M.estadisticas = (m, perfil, cam) => {
    const w = m.wps, tl = M.lineaTiempo(m), av = [], R = { vacia: !w.length };
    R.distancia = tl.distancia; R.distancia3d = tl.distancia3d; R.duracion = tl.duracion; R.energiaWh = tl.energia; R.bateriaPct = tl.eMax ? 100 * tl.energia / tl.eMax : 0;
    R.altMax = w.reduce((a, p) => Math.max(a, p.alt), 0); R.altMin = w.length ? w.reduce((a, p) => Math.min(a, p.alt), Infinity) : 0;
    R.distMaxHome = w.reduce((a, p) => Math.max(a, Math.hypot(p.x, p.y)), 0); R.velMax = w.reduce((a, p) => Math.max(a, vel(p, m)), 0);
    R.fotos = 0;
    w.forEach((p, i) => { if (p.accion === 'foto') R.fotos++; if (p.fotoCada > 0 && i > 0) R.fotos += Math.floor(Geo.dist(w[i - 1].x, w[i - 1].y, p.x, p.y) / p.fotoCada) + 1; });
    if (w.length) {
      const dMax = perfil && perfil.alturaMax, dH = perfil && perfil.distMax;
      if (dMax && R.altMax > dMax) av.push({ n: 'mal', t: 'Altura máxima del plan (' + Math.round(R.altMax) + ' m) supera el límite del perfil «' + (perfil.nombre || '') + '» (' + dMax + ' m).' });
      if (dH && R.distMaxHome > dH) av.push({ n: perfil.vlos ? 'mal' : 'av', t: 'Distancia máxima al despegue (' + Math.round(R.distMaxHome) + ' m) supera ' + dH + ' m' + (perfil.vlos ? ' (condición de línea de vista, VLOS)' : '') + '.' });
      if (R.bateriaPct > 100) av.push({ n: 'mal', t: 'El plan necesita ' + Math.round(R.bateriaPct) + ' % de la batería útil: no completa la misión. Divídelo en varios vuelos.' });
      else if (R.bateriaPct > 80) av.push({ n: 'av', t: 'El plan usa ' + Math.round(R.bateriaPct) + ' % de la batería útil: margen escaso.' });
      if (m.dron && m.dron.vMax && R.velMax > m.dron.vMax) av.push({ n: 'av', t: 'Hay velocidades (' + R.velMax + ' m/s) por encima de la velocidad máxima del dron (' + m.dron.vMax + ' m/s).' });
      if (tl.segs.some(s => s.tipo === 'ruta' && s.dh > 1 && s.gs <= 1)) av.push({ n: 'mal', t: 'Con este viento hay tramos en los que el dron casi no avanza.' });
      if (!m.retorno) av.push({ n: 'av', t: 'Sin retorno al despegue: calcula la batería de vuelta por tu cuenta.' });
      if (cam && cam.velMax && R.velMax > cam.velMax && w.some(p => p.fotoCada > 0)) av.push({ n: 'av', t: 'A ' + R.velMax + ' m/s la cámara no llega al intervalo de fotos (máx. ' + Calc.r(cam.velMax, 1) + ' m/s para este solape).' });
    } else av.push({ n: 'av', t: 'Aún no hay waypoints: toca el mapa en modo «Añadir» o genera un patrón.' });
    R.avisos = av; R.duracionTotalMin = R.duracion / 60; return R;
  };
  return M;
});
