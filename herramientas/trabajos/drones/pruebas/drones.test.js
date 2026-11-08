/* Pruebas de la logica pura del modulo Drones. Uso: node pruebas/drones.test.js */
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const Calc = require('../js/calculos.js'), Geo = require('../js/geo.js'), P = require('../js/patrones.js'), M = require('../js/mision.js'), X = require('../js/exportar.js'), T = require('../js/telemetria.js');
let n = 0; const ok = (c, m) => { assert(c, m); n++; }, cerca = (a, b, tol, m) => ok(Math.abs(a - b) <= tol, (m || '') + ' esperado ' + b + ' obtenido ' + a);
// --- optica y fotogrametria (referencias conocidas) ---
cerca(Calc.gsd(13.2, 8.8, 5472, 100), 2.741, 0.002, 'GSD Phantom 4 Pro a 100 m');
cerca(Calc.altParaGsd(2.741, 13.2, 8.8, 5472), 100, 0.05, 'altura para GSD');
cerca(Calc.fov(36, 50), 39.598, 0.01, 'HFOV 36mm f50'); cerca(Calc.fovCamara(36, 24, 50).d, 46.8, 0.05, 'FOV diagonal 50mm');
cerca(Calc.fovCamara(13.2, 8.8, 8.8).h, 73.74, 0.05, 'HFOV 1 pulgada 8.8mm');
cerca(Calc.recorte(36, 24), 1, 1e-9, 'recorte FF'); cerca(Calc.recorte(17.3, 13), 2.0, 0.01, 'recorte 4/3'); cerca(Calc.recorte(23.5, 15.6), 1.53, 0.01, 'recorte APS-C');
cerca(Calc.hiperfocal(50, 8, 0.03) / 1000, 10.467, 0.005, 'hiperfocal 50 f/8');
const pf = Calc.profundidad(50, 8, 0.03, 10000); cerca(pf.cerca / 1000, 5.1265, 0.01, 'limite cercano enfocando a 10 m'); ok(pf.lejos / 1000 > 200 && pf.lejos / 1000 < 400, 'lejano ' + pf.lejos);
const cam = { sw: 13.2, sh: 8.8, f: 8.8, pw: 5472, ph: 3648, intervaloMin: 2 }, fg = Calc.fotogrametria(cam, 100, 0.75, 0.65, 8);
cerca(fg.altoHuella, 100.0, 0.1, 'huella longitudinal'); cerca(fg.anchoHuella, 150.0, 0.2, 'huella transversal'); cerca(fg.sepFotos, 25, 0.05, 'separacion fotos'); cerca(fg.sepLineas, 52.5, 0.1, 'separacion lineas');
cerca(fg.intervalo, 3.125, 0.01, 'intervalo'); cerca(fg.velMax, 12.5, 0.05, 'vel max'); cerca(Calc.solape(fg.altoHuella, 25), 0.75, 0.002, 'solape');
ok(Calc.areaMapeo(200, 100, 25, 52.5).fotos === 3 * 9, 'fotos del area');
// --- exposicion, video, monturas ---
cerca(Calc.obturador180(24), 1 / 48, 1e-9, '180 grados 24p'); cerca(Calc.obturador180(25), 1 / 50, 1e-9); cerca(Calc.obturador180(60, 90), 1 / 240, 1e-9, 'obturador 90 grados');
const nd = Calc.ndPara(15, 100, 2.8, 24); cerca(nd.stops, 6.45, 0.05, 'stops ND soleado'); ok(nd.nd === 7, 'ND elegido ' + nd.nd);
cerca(Calc.isoEquivalente(2.8, 1 / 48, 100, 5.6, 1 / 48), 400, 1e-6, 'ISO equiv'); cerca(Calc.isoEquivalente(2.8, 1 / 48, 100, 2.8, 1 / 96), 200, 1e-6);
cerca(Calc.gbPorHora(100), 45, 1e-9, 'GB/h 100 Mbps'); cerca(Calc.minutosEnTarjeta(256, 100), 341.33, 0.01, 'minutos en 256GB');
const ef = { nombre: 'EF', ffd: 44 }, e = { nombre: 'E', ffd: 18 }, pl = { nombre: 'PL', ffd: 52 };
ok(Calc.compatMontura(ef, e).tipo === 'adaptador' && Calc.compatMontura(ef, e).espesor === 26, 'EF a E 26 mm'); ok(Calc.compatMontura(e, ef).tipo === 'imposible', 'E a EF imposible'); ok(Calc.compatMontura(ef, ef).tipo === 'directo', 'misma montura');
ok(Calc.compatMontura(pl, ef).tipo === 'adaptador', 'PL a EF');
ok(Calc.vineteo('MFT', 36, 24) === true && Calc.vineteo('FF', 36, 24) === false, 'vineteo');
const eq = Calc.equivalente(50, 1.8, 17.3, 13, 0.71); cerca(eq.focal, 35.5, 0.01); cerca(eq.apertura, 1.278, 0.01); cerca(eq.equiv35, 35.5 * 2.0, 0.6, 'equiv 35mm con speedbooster');
cerca(Calc.dollyZoom(24, 10, 20), 48, 1e-9, 'dolly zoom');
// --- viento y bateria ---
cerca(M.velSuelo(10, 0, { vel: 5, dir: 0 }), 5, 1e-6, 'contra viento'); cerca(M.velSuelo(10, 180, { vel: 5, dir: 0 }), 15, 1e-6, 'viento a favor'); cerca(M.velSuelo(10, 90, { vel: 5, dir: 0 }), Math.sqrt(75), 1e-6, 'viento cruzado');
const au = Calc.autonomia({ capWh: 50, pHover: 100, usable: 0.8, vAire: 10, viento: 5 }); cerca(au.whUtil, 40, 1e-9); cerca(au.hoverMin, 24, 1e-9); cerca(au.cruceroMin, 17.14, 0.01);
cerca(au.radioConViento, au.cruceroMin * 60 * 75 / 20, 0.01, 'radio ida y vuelta con viento'); ok(Calc.autonomia({ capWh: 50, pHover: 100, vAire: 5, viento: 6 }).advertencia, 'viento > velocidad');
cerca(Calc.autonomia({ capWh: 50, pHover: 100, temp: 5 }).factorTemp, 0.85, 1e-9, 'frio');
// --- geodesia ---
const o = { lat: 4.711, lon: -74.0721 }, p = Geo.aGeo(o, 300, 400), l = Geo.aLocal(o, p.lat, p.lon); cerca(l.x, 300, 1e-6); cerca(l.y, 400, 1e-6); cerca(Geo.haversine(o.lat, o.lon, p.lat, p.lon), 500, 0.5, 'haversine');
cerca(Geo.haversine(0, 0, 0, 1), 111195, 5, '1 grado de ecuador'); cerca(Geo.rumbo(0, 0, 10, 10), 45, 1e-9); cerca(Geo.rumbo(0, 0, 0, -5), 180, 1e-9); cerca(Geo.rumbo(0, 0, -5, 0), 270, 1e-9);
// --- patrones ---
const orb = P.orbita({ cx: 0, cy: 0, radio: 50, n: 12, alt: 40, vel: 5, altObjetivo: 0 });
ok(orb.length === 13, 'orbita cierra'); cerca(Geo.dist(orb[0].x, orb[0].y, orb[12].x, orb[12].y), 0, 0.02, 'orbita cerrada'); orb.forEach(w => cerca(Math.hypot(w.x, w.y), 50, 0.02, 'radio'));
cerca(orb[0].giro, -Math.atan(40 / 50) * 180 / Math.PI, 0.02, 'giro hacia el centro'); cerca(orb[0].rumbo, 180, 0.01, 'mira al centro');
const gr = P.cuadricula({ cx: 0, cy: 0, ancho: 200, alto: 100, angulo: 0, alt: 100, sepLineas: 52.5, sepFotos: 25, vel: 8 });
ok(gr.length === 2 * 3, 'cuadricula 3 lineas'); cerca(gr[0].x, -100, 0.01); cerca(gr[1].x, 100, 0.01); cerca(gr[2].x, 100, 0.01, 'serpentea'); cerca(gr[0].y, -50, 0.01); cerca(gr[5].y, 50, 0.01); ok(gr[1].fotoCada === 25 && gr[0].fotoCada === 0, 'foto cada');
const gr2 = P.cuadricula({ cx: 10, cy: 20, ancho: 100, alto: 40, angulo: 90, alt: 50, sepLineas: 100, sepFotos: 10, vel: 5 }); cerca(gr2[0].x, -10, 0.01, 'angulo 90: lineas norte-sur'); cerca(gr2[0].y, 70, 0.01, 'rotacion'); cerca(gr2[1].y, -30, 0.01); cerca(gr2[0].rumbo, 180, 1e-6, 'rumbo de linea'); cerca(gr[0].rumbo, 90, 1e-6);
const sp = P.espiral({ cx: 0, cy: 0, radio: 20, radioFin: 60, alt: 20, altFin: 60, vueltas: 2, n: 16, vel: 5 }); cerca(Math.hypot(sp[sp.length - 1].x, sp[sp.length - 1].y), 60, 0.1); cerca(sp[sp.length - 1].alt, 60, 1e-9);
const rev = P.revelacion({ x1: 0, y1: 0, rumbo: 90, dist: 100, alt: 5, altFin: 40, vel: 4 }); cerca(rev[rev.length - 1].x, 100, 0.01); ok(rev[0].giro < rev[rev.length - 1].giro, 'revelacion levanta camara');
// --- mision ---
const m = M.nueva(); m.wps = [P.wp({ x: 0, y: 100, alt: 50, vel: 5 }), P.wp({ x: 0, y: 200, alt: 50, vel: 5 })]; m.dron = { capWh: 50, pHover: 100, masaKg: 0.9, usable: 0.8, vMax: 16 };
const s = M.estadisticas(m, { alturaMax: 120, distMax: 150, vlos: true, nombre: 'T' });
cerca(s.distancia, 400, 1e-6, 'distancia total ida y vuelta'); cerca(s.duracion, 80, 0.5, 'duracion'); ok(s.avisos.some(a => /distancia/i.test(a.t)), 'aviso VLOS'); ok(s.bateriaPct > 0 && s.bateriaPct < 20, 'bateria ' + s.bateriaPct);
const tl = M.lineaTiempo(m), pos = M.posicion(tl, 20); cerca(pos.y, 100, 0.01, 'pos a 20 s'); cerca(M.posicion(tl, tl.duracion).y, 0, 1e-6, 'regresa'); ok(M.posicion(tl, 0).bat === 100);
m.wps[1].alt = 130; ok(M.estadisticas(m, { alturaMax: 120 }).avisos.some(a => /Altura/.test(a.t)), 'aviso altura');
// --- exportadores ---
const mm = M.nueva(); mm.origen = { lat: 4.711, lon: -74.0721 }; mm.wps = [P.wp({ x: 0, y: 100, alt: 30, accion: 'foto' }), P.wp({ x: 100, y: 100, alt: 40, vel: 6, giro: -90, rumbo: 90, fotoCada: 10, accion: 'video_ini' })];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'drn-')), kml = X.kml(mm, 'Misión <1> & "prueba"'), gpx = X.gpx(mm, 'Misión & prueba');
fs.writeFileSync(tmp + '/a.kml', kml); fs.writeFileSync(tmp + '/a.gpx', gpx);
ok(/<coordinates>-74\.0721,4\.711,0<\/coordinates>/.test(kml) && (kml.match(/<Placemark>/g) || []).length === 4, 'KML placemarks'); ok((gpx.match(/<wpt /g) || []).length === 2 && (gpx.match(/<rtept /g) || []).length === 2, 'GPX puntos');
try { cp.execFileSync('xmllint', ['--noout', tmp + '/a.kml', tmp + '/a.gpx']); n += 2; } catch (e) { if (e.code === 'ENOENT') console.log('(xmllint ausente: validacion XML omitida)'); else throw new Error('XML invalido: ' + e.stderr); }
const jj = JSON.parse(X.json(mm, 'x')); ok(jj.mision.wps[0].lat > 4.711 && jj.formato === 'trabajos-drones-mision', 'JSON'); const re = X.importarJSON(X.json(mm, 'x')); cerca(re.wps[1].x, 100, 0.01, 'roundtrip JSON'); ok(re.wps[1].accion === 'video_ini');
const rec = X.importarJSON(JSON.stringify({ origen: { lat: 10, lon: 10 }, wps: [{ lat: 10.001, lon: 10, alt: 20 }] })); cerca(rec.wps[0].y, 111.19, 0.1, 'importar lat/lon'); assert.throws(() => X.importarJSON('{"a":1}'));
const csv = X.csv(mm).trim().split('\n'); ok(csv.length === 3 && csv[0].startsWith('n,lat,lon') && csv[1].split(',').length === 12, 'CSV');
const q = JSON.parse(X.qgc(mm)); ok(q.fileType === 'Plan' && q.version === 1 && q.mission.version === 2 && q.groundStation === 'QGroundControl', 'QGC cabecera'); ok(q.mission.items.every((it, i) => it.doJumpId === i + 1 && it.params.length === 7 && it.type === 'SimpleItem'), 'QGC items');
ok(q.mission.items[0].command === 22 && q.mission.items.filter(i => i.command === 16).length === 2 && q.mission.items.slice(-1)[0].command === 20, 'QGC despegue/waypoints/RTL'); ok(q.mission.items.some(i => i.command === 2000) && q.mission.items.some(i => i.command === 2500) && q.mission.items.some(i => i.command === 178), 'QGC foto/video/velocidad');
ok(q.mission.items.filter(i => i.command === 16)[1].params[3] === 90 && q.mission.items.filter(i => i.command === 16)[0].params[3] === null, 'QGC yaw'); ok(JSON.parse(X.qgc(mm, { fw: 'ardupilot' })).mission.firmwareType === 3);
// --- telemetria ---
const air = 'time(millisecond),latitude,longitude,height_above_takeoff(feet),speed(mph),battery_percent,heading\n0,4.711,-74.0721,0,0,100,0\n1000,4.7111,-74.0721,32.8084,22.3694,99,10\n2000,4.7112,-74.0721,65.6168,22.3694,98,12\n';
const lg = T.parseLog(air); ok(lg.formato === 'CSV' && lg.muestras.length === 3, 'CSV filas'); cerca(lg.muestras[1].alt, 10, 0.001, 'pies a m'); cerca(lg.muestras[1].vel, 10, 0.001, 'mph a m/s'); cerca(lg.muestras[2].t, 2, 1e-9, 'ms a s'); cerca(lg.info.distancia, 22.24, 0.1, 'distancia del log'); ok(lg.info.batFin === 98 && lg.info.altMax > 19.9, 'resumen');
const lj = T.parseLog(JSON.stringify({ muestras: [{ t: 1712000000000, lat: 4.7, lon: -74, alt: 10, vel: 3, bat: 90 }, { t: 1712000002000, lat: 4.7001, lon: -74, alt: 12, vel: 4, bat: 89 }] })); cerca(lj.muestras[1].t, 2, 1e-9, 'epoch ms'); ok(lj.formato === 'JSON');
const ln = T.parseLog('{"lat":4.7,"lon":-74,"alt":5}\n{"lat":4.8,"lon":-74,"alt":6}\n'); ok(ln.formato === 'NDJSON' && ln.muestras.length === 2 && ln.avisos.length >= 1, 'NDJSON sin tiempo');
const e7 = T.normalizar({ lat: 47112345, lon: -740721000, relative_alt: 20, groundspeed: 5, hdg: 370 }); cerca(e7.lat, 4.7112345, 1e-9, 'degE7'); cerca(e7.rumbo, 10, 1e-9, 'rumbo normalizado');
['', 'abc,def\n1,2\n', '{"x":1}'].forEach(t => assert.throws(() => T.parseLog(t))); n += 3;
const L = T.Lineas(); ok(L.push('{"a":1}\n{"b"').length === 1 && L.push(':2}\n')[0] === '{"b":2}', 'buffer de lineas'); ok(T.parseLinea(T.DOC).lat === 4.711 && T.parseLinea('basura') === null, 'documentacion de trama');
const ru = T.aRuta(lg.muestras); cerca(ru.ruta[2].y, 22.24, 0.1, 'ruta local'); cerca(T.enT(lg.muestras, 1.5).t, 1, 1e-9, 'busqueda por tiempo');
console.log('OK drones: ' + n + ' comprobaciones');
