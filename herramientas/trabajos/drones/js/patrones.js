/* Waypoints y patrones automaticos de vuelo (puro). window.DronPatrones. Coordenadas locales x este / y norte (m); rumbos en grados desde el norte. */
(function (g, f) { const m = f(g.DronGeo || (typeof require === 'function' ? require('./geo.js') : null)); if (typeof module === 'object' && module.exports) module.exports = m; else g.DronPatrones = m; })(typeof self !== 'undefined' ? self : this, function (Geo) {
  'use strict';
  const P = {}, RAD = Math.PI / 180, DEG = 180 / Math.PI, lerp = (a, b, k) => a + (b - a) * k;
  P.ACCIONES = [['ninguna', 'Ninguna'], ['foto', 'Tomar foto'], ['video_ini', 'Iniciar video'], ['video_fin', 'Parar video'], ['pausa', 'Pausa (hover)'], ['rotar', 'Giro de 360°']];
  P.wp = o => Object.assign({ x: 0, y: 0, alt: 50, vel: 5, giro: -30, rumbo: null, accion: 'ninguna', pausa: 0, fotoCada: 0 }, o || {});
  const r2 = v => Math.round(v * 100) / 100;
  const fin = w => { w.x = r2(w.x); w.y = r2(w.y); w.alt = r2(w.alt); w.giro = r2(w.giro); if (w.rumbo != null) w.rumbo = r2(Geo.norm360(w.rumbo)); return w; };

  /* orbita (con POI): el dron mira al centro; giro = atan(desnivel/radio) */
  P.orbita = o => {
    const n = Math.max(3, Math.round(o.n || 12)), v = Math.max(0.1, o.vueltas || 1), dir = o.sentido === 'anti' ? -1 : 1, pasos = Math.round(n * v), out = [];
    for (let i = 0; i <= pasos; i++) {
      const k = pasos ? i / pasos : 0, th = ((o.inicio || 0) + dir * 360 * v * k) * RAD, alt = lerp(o.alt, o.altFin == null ? o.alt : o.altFin, k);
      const x = o.cx + o.radio * Math.sin(th), y = o.cy + o.radio * Math.cos(th);
      out.push(fin(P.wp({ x, y, alt, vel: o.vel, rumbo: Geo.rumbo(x, y, o.cx, o.cy), giro: -Math.atan2(alt - (o.altObjetivo || 0), o.radio) * DEG })));
    }
    return out;
  };
  P.espiral = o => {
    const n = Math.max(6, Math.round(o.n || 16)), pasos = Math.round(n * Math.max(0.25, o.vueltas || 2)), dir = o.sentido === 'anti' ? -1 : 1, out = [];
    for (let i = 0; i <= pasos; i++) {
      const k = i / pasos, rad = lerp(o.radio, o.radioFin, k), th = ((o.inicio || 0) + dir * 360 * (o.vueltas || 2) * k) * RAD, alt = lerp(o.alt, o.altFin, k);
      const x = o.cx + rad * Math.sin(th), y = o.cy + rad * Math.cos(th);
      out.push(fin(P.wp({ x, y, alt, vel: o.vel, rumbo: Geo.rumbo(x, y, o.cx, o.cy), giro: -Math.atan2(alt - (o.altObjetivo || 0), Math.max(rad, 1)) * DEG })));
    }
    return out;
  };
  /* mapeo en lineas paralelas (segadora). El rectangulo se gira `angulo` grados en sentido horario (0 = lineas este-oeste); sepLineas es el maximo permitido y se reparte uniforme. */
  P.cuadricula = o => {
    const nl = Math.max(2, Math.ceil(o.alto / o.sepLineas) + 1), sep = o.alto / (nl - 1), a = (o.angulo || 0) * RAD, out = [];
    const al = [Math.cos(a), -Math.sin(a)], dr = [Math.sin(a), Math.cos(a)];   // angulo 0: lineas este-oeste; crece en sentido horario
    for (let i = 0; i < nl; i++) {
      const v = -o.alto / 2 + i * sep, dirIda = i % 2 === 0, u1 = dirIda ? -o.ancho / 2 : o.ancho / 2, u2 = -u1, rumbo = Geo.norm360(90 + (o.angulo || 0) + (dirIda ? 0 : 180));
      [u1, u2].forEach((u, j) => out.push(fin(P.wp({ x: o.cx + u * al[0] + v * dr[0], y: o.cy + u * al[1] + v * dr[1], alt: o.alt, vel: o.vel, giro: o.giro == null ? -90 : o.giro, rumbo, fotoCada: j === 1 ? (o.sepFotos || 0) : 0, accion: 'ninguna' }))));
    }
    return out;
  };
  P.lineal = o => {
    const n = Math.max(2, Math.round(o.n || 2)), out = [], rumbo = Geo.rumbo(o.x1, o.y1, o.x2, o.y2);
    for (let i = 0; i < n; i++) { const k = i / (n - 1); out.push(fin(P.wp({ x: lerp(o.x1, o.x2, k), y: lerp(o.y1, o.y2, k), alt: lerp(o.alt, o.altFin == null ? o.alt : o.altFin, k), vel: o.vel, rumbo, giro: lerp(o.giro == null ? -20 : o.giro, o.giroFin == null ? (o.giro == null ? -20 : o.giro) : o.giroFin, k) }))); }
    return out;
  };
  /* revelacion: avanza ascendiendo mientras la camara sube del suelo al horizonte */
  P.revelacion = o => {
    const rad = (o.rumbo || 0) * RAD, x2 = o.x1 + o.dist * Math.sin(rad), y2 = o.y1 + o.dist * Math.cos(rad);
    return P.lineal({ x1: o.x1, y1: o.y1, x2, y2, alt: o.alt, altFin: o.altFin, n: o.n || 5, vel: o.vel, giro: o.giro == null ? -70 : o.giro, giroFin: o.giroFin == null ? -8 : o.giroFin });
  };
  P.NOMBRES = { orbita: 'Órbita', espiral: 'Espiral', cuadricula: 'Cuadrícula (mapeo)', lineal: 'Lineal', revelacion: 'Revelación' };
  P.generar = (tipo, o) => P[tipo](o);
  return P;
});
