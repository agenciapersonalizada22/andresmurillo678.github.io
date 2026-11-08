/* Exportadores de mision: KML, GPX, JSON, CSV y QGroundControl .plan (MAVLink simple). Puro. window.DronExport */
(function (g, f) { const m = f(g.DronGeo || require('./geo.js')); if (typeof module === 'object' && module.exports) module.exports = m; else g.DronExport = m; })(typeof self !== 'undefined' ? self : this, function (Geo) {
  'use strict';
  const X = {}, esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const f6 = v => v.toFixed(7).replace(/0+$/, '').replace(/\.$/, ''), f2 = v => (Math.round(v * 100) / 100).toString();
  const geo = (m, w) => Geo.aGeo(m.origen, w.x, w.y);
  const ACC = { ninguna: '', foto: 'Foto', video_ini: 'Inicio de video', video_fin: 'Fin de video', pausa: 'Pausa', rotar: 'Giro 360°' };
  const desc = (m, w, i) => 'Altura ' + f2(w.alt) + ' m, velocidad ' + f2(w.vel || m.vel) + ' m/s, cámara ' + f2(w.giro) + '°' + (w.rumbo != null ? ', rumbo ' + f2(w.rumbo) + '°' : '') + (w.accion && w.accion !== 'ninguna' ? ', ' + ACC[w.accion] : '') + (w.fotoCada > 0 ? ', foto cada ' + f2(w.fotoCada) + ' m' : '');
  X.kml = (m, nombre) => {
    const pts = m.wps.map(w => { const p = geo(m, w); return { p, w }; }), co = pts.map(o => f6(o.p.lon) + ',' + f6(o.p.lat) + ',' + f2(o.w.alt)).join(' ');
    return '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n<name>' + esc(nombre || 'Misión') + '</name>\n' +
      '<Style id="ruta"><LineStyle><color>ff00a5ff</color><width>3</width></LineStyle></Style>\n' +
      '<Placemark><name>Despegue</name><Point><coordinates>' + f6(m.origen.lon) + ',' + f6(m.origen.lat) + ',0</coordinates></Point></Placemark>\n' +
      pts.map((o, i) => '<Placemark><name>WP ' + (i + 1) + '</name><description>' + esc(desc(m, o.w, i)) + '</description><Point><altitudeMode>relativeToGround</altitudeMode><coordinates>' + f6(o.p.lon) + ',' + f6(o.p.lat) + ',' + f2(o.w.alt) + '</coordinates></Point></Placemark>').join('\n') + '\n' +
      (pts.length > 1 ? '<Placemark><name>Ruta</name><styleUrl>#ruta</styleUrl><LineString><altitudeMode>relativeToGround</altitudeMode><coordinates>' + co + '</coordinates></LineString></Placemark>\n' : '') + '</Document>\n</kml>\n';
  };
  X.gpx = (m, nombre) => {
    const pts = m.wps.map(w => ({ p: geo(m, w), w })), pt = (tag, o, i) => '<' + tag + ' lat="' + f6(o.p.lat) + '" lon="' + f6(o.p.lon) + '"><ele>' + f2(o.w.alt) + '</ele><name>WP' + (i + 1) + '</name><desc>' + esc(desc(m, o.w, i)) + '</desc></' + tag + '>';
    return '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Trabajos - Drones y cámaras" xmlns="http://www.topografix.com/GPX/1/1">\n<metadata><name>' + esc(nombre || 'Misión') + '</name></metadata>\n' +
      pts.map((o, i) => pt('wpt', o, i)).join('\n') + '\n<rte><name>' + esc(nombre || 'Misión') + '</name>\n' + pts.map((o, i) => pt('rtept', o, i)).join('\n') + '\n</rte>\n</gpx>\n';
  };
  X.json = (m, nombre) => JSON.stringify({ formato: 'trabajos-drones-mision', version: 1, nombre: nombre || 'Misión', mision: Object.assign({}, m, { wps: m.wps.map(w => Object.assign({}, w, geo(m, w))) }) }, null, 2);
  X.importarJSON = txt => {
    const o = JSON.parse(txt), m = o && (o.mision || o);
    if (!m || !Array.isArray(m.wps)) throw new Error('El JSON no contiene una misión (falta «wps»).');
    m.origen = Geo.valido(m.origen) ? m.origen : { lat: 0, lon: 0 };
    m.wps = m.wps.map(w => {
      let x = +w.x, y = +w.y; if (!isFinite(x) || !isFinite(y)) { if (isFinite(w.lat) && isFinite(w.lon)) { const l = Geo.aLocal(m.origen, w.lat, w.lon); x = l.x; y = l.y; } else throw new Error('Waypoint sin coordenadas.'); }
      return { x, y, alt: +w.alt || 0, vel: +w.vel || m.vel || 5, giro: isFinite(+w.giro) ? +w.giro : -30, rumbo: w.rumbo == null ? null : +w.rumbo, accion: w.accion || 'ninguna', pausa: +w.pausa || 0, fotoCada: +w.fotoCada || 0 };
    });
    return m;
  };
  const q = s => { s = String(s == null ? '' : s); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  X.csv = m => ['n,lat,lon,x_m,y_m,alt_m,vel_ms,giro_camara_deg,rumbo_deg,accion,pausa_s,foto_cada_m'].concat(m.wps.map((w, i) => { const p = geo(m, w); return [i + 1, f6(p.lat), f6(p.lon), f2(w.x), f2(w.y), f2(w.alt), f2(w.vel || m.vel), f2(w.giro), w.rumbo == null ? '' : f2(w.rumbo), w.accion || 'ninguna', f2(w.pausa || 0), f2(w.fotoCada || 0)].map(q).join(','); })).join('\n') + '\n';
  /* QGroundControl .plan. fw: 'px4' (12) o 'ardupilot' (3). Comandos MAVLink: 22 despegue, 16 waypoint, 178 velocidad, 1000 gimbal, 2000/2001 foto, 2500/2501 video, 20 RTL. */
  X.qgc = (m, o) => {
    o = o || {}; const items = []; let id = 1, vAct = null, gAct = null;
    const it = (command, params, frame) => items.push({ AMSLAltAboveTerrain: null, Altitude: params[6] == null ? 0 : params[6], AltitudeMode: 1, autoContinue: true, command, doJumpId: id++, frame, params, type: 'SimpleItem' });
    const h = m.origen, a0 = m.wps.length ? m.wps[0].alt : 10;
    if (m.wps.length) it(22, [0, 0, 0, null, h.lat, h.lon, a0], 3);
    m.wps.forEach(w => {
      const p = geo(m, w), v = w.vel || m.vel;
      if (v !== vAct) { it(178, [1, v, -1, 0, 0, 0, 0], 2); vAct = v; }
      if (w.giro !== gAct) { it(1000, [w.giro, null, null, null, 0, 0, 0], 2); gAct = w.giro; }
      if (w.fotoCada > 0) it(2000, [0, Math.max(0.5, Math.round(w.fotoCada / v * 10) / 10), 0, 0, 0, 0, 0], 2);
      if (w.accion === 'video_ini') it(2500, [0, 0, 0, 0, 0, 0, 0], 2);
      it(16, [w.accion === 'rotar' ? 12 : w.accion === 'pausa' ? (w.pausa || 3) : (w.pausa || 0), 0, 0, w.rumbo == null ? null : w.rumbo, p.lat, p.lon, w.alt], 3);
      if (w.accion === 'foto') it(2000, [0, 0, 1, 0, 0, 0, 0], 2);
      if (w.fotoCada > 0) it(2001, [0, 0, 0, 0, 0, 0, 0], 2);
      if (w.accion === 'video_fin') it(2501, [0, 0, 0, 0, 0, 0, 0], 2);
    });
    if (m.wps.length && m.retorno) it(20, [0, 0, 0, 0, 0, 0, 0], 2);
    return JSON.stringify({ fileType: 'Plan', geoFence: { circles: [], polygons: [], version: 2 }, groundStation: 'QGroundControl',
      mission: { cruiseSpeed: m.vel, firmwareType: o.fw === 'ardupilot' ? 3 : 12, globalPlanAltitudeMode: 1, hoverSpeed: Math.min(m.vel, 5), items, plannedHomePosition: [h.lat, h.lon, 0], vehicleType: 2, version: 2 },
      rallyPoints: { points: [], version: 2 }, version: 1 }, null, 2);
  };
  X.csvBitacora = l => ['fecha,piloto,dron,lugar,despegue,aterrizaje,minutos,baterias,viento_ms,incidencias,notas'].concat(l.map(e => [e.fecha, e.piloto, e.dron, e.lugar, e.despegue, e.aterrizaje, e.minutos, e.baterias, e.viento, e.incidencias, e.notas].map(q).join(','))).join('\n') + '\n';
  return X;
});
