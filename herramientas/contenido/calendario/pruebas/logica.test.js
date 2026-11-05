const test = require('node:test'), assert = require('node:assert/strict');
const F = require('../js/fechas.js'), R = require('../js/recurrencia.js'), ICS = require('../js/ics.js'), CSV = require('../js/csv.js'), Me = require('../js/metricas.js'), Pl = require('../js/plan.js'), M = require('../js/modelo.js');

test('Fechas civiles', () => {
  assert.equal(F.sumarDias('2026-02-27', 3), '2026-03-02'); assert.equal(F.dow('2026-11-05'), 3); assert.equal(F.inicioSemana('2026-11-05'), '2026-11-02');
  assert.equal(F.diasEnMes(2028, 2), 29); assert.equal(F.rejillaMes(2026, 11).length, 42); assert.equal(F.rejillaMes(2026, 11)[0], '2026-10-26');
  assert.equal(F.diasEntre('2026-01-01', '2026-12-31'), 364); assert.deepEqual(F.sumarMeses('2026-11-05', 3), { y: 2027, m: 2 });
});
test('Zonas horarias: DST, sin DST, conversion y desfases', () => {
  const iso = ms => new Date(ms).toISOString();
  assert.equal(iso(F.instante('2026-07-01', '12:00', 'America/New_York')), '2026-07-01T16:00:00.000Z');
  assert.equal(iso(F.instante('2026-01-15', '12:00', 'America/New_York')), '2026-01-15T17:00:00.000Z');
  assert.equal(iso(F.instante('2026-03-08', '03:30', 'America/New_York')), '2026-03-08T07:30:00.000Z'); // tras el salto de DST
  assert.equal(iso(F.instante('2026-11-05', '09:00', 'Asia/Tokyo')), '2026-11-05T00:00:00.000Z');
  assert.equal(iso(F.instante('2026-11-05', '09:00', 'America/Mexico_City')), '2026-11-05T15:00:00.000Z');
  assert.equal(iso(F.instante('2026-11-05', '09:00', 'UTC')), '2026-11-05T09:00:00.000Z');
  assert.equal(F.convertir('2026-07-01', '12:00', 'America/New_York', 'Europe/Madrid'), '2026-07-01T18:00');
  assert.equal(F.convertir('2026-01-15', '23:30', 'Asia/Tokyo', 'America/Los_Angeles'), '2026-01-15T06:30');
  assert.equal(F.zonaValida('Mars/Olympus'), false); assert.equal(F.zonaValida('Europe/Madrid'), true);
});
test('Recurrencias', () => {
  const ex = (i, r, d, h) => R.expandir(i, r, d, h);
  assert.deepEqual(ex('2026-11-05', null, '2026-11-01', '2026-11-30'), ['2026-11-05']); assert.deepEqual(ex('2026-11-05', { freq: 'ninguna' }, '2026-12-01', '2026-12-30'), []);
  assert.deepEqual(ex('2026-11-05', { freq: 'diaria', cada: 2 }, '2026-11-01', '2026-11-12'), ['2026-11-05', '2026-11-07', '2026-11-09', '2026-11-11']);
  assert.deepEqual(ex('2026-11-05', { freq: 'semanal', cada: 1, dias: [0, 3] }, '2026-11-01', '2026-11-20'), ['2026-11-05', '2026-11-09', '2026-11-12', '2026-11-16', '2026-11-19']);
  assert.deepEqual(ex('2026-11-05', { freq: 'semanal', cada: 2 }, '2026-11-01', '2026-12-10'), ['2026-11-05', '2026-11-19', '2026-12-03']);
  assert.deepEqual(ex('2026-01-31', { freq: 'mensual', cada: 1 }, '2026-01-01', '2026-04-30'), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  assert.deepEqual(ex('2026-11-05', { freq: 'diaria', cada: 1, cuenta: 3 }, '2026-11-01', '2027-01-01'), ['2026-11-05', '2026-11-06', '2026-11-07']);
  assert.deepEqual(ex('2026-11-05', { freq: 'diaria', cada: 1, hasta: '2026-11-07' }, '2026-11-01', '2027-01-01'), ['2026-11-05', '2026-11-06', '2026-11-07']);
  assert.deepEqual(ex('2026-11-05', { freq: 'diaria', cada: 1, excepciones: ['2026-11-06'] }, '2026-11-05', '2026-11-07'), ['2026-11-05', '2026-11-07']);
  assert.deepEqual(ex('2026-11-05', { freq: 'diaria', cada: 1, cuenta: 5 }, '2026-11-07', '2026-12-30'), ['2026-11-07', '2026-11-08', '2026-11-09']); // la ventana no altera la cuenta
});
test('ICS válido: eventos, alarmas, escapes, plegado, DST', () => {
  const pubs = [{ id: 'a1', titulo: 'Video; con, comas\ny salto ' + 'largo '.repeat(30), red: 'tiktok', estado: 'programado', fecha: '2026-07-01', hora: '12:00', zona: 'America/New_York', recordar: 30, texto: 'Hola' },
    { id: 'b2', titulo: 'Semanal ñandú', red: 'x', estado: 'publicado', fecha: '2026-03-02', hora: '09:00', zona: 'America/New_York', rec: { freq: 'semanal', cada: 1, cuenta: 2 } }, { id: 'sin', titulo: 'sin fecha' }];
  const s = ICS.generar(pubs, { ahora: Date.UTC(2026, 0, 1), redes: { tiktok: { nombre: 'TikTok' } } });
  assert.deepEqual(ICS.validar(s), []); assert.equal((s.match(/BEGIN:VEVENT/g) || []).length, 3);
  assert.match(s, /DTSTART:20260701T160000Z/); assert.match(s, /TRIGGER:-PT30M/); assert.match(s, /\;/); assert.match(s, /\\n/); assert.match(s, /DTSTART:20260302T140000Z/); assert.match(s, /DTSTART:20260309T130000Z/); // 9 de marzo ya en DST
  assert.match(s, /\[TikTok\]/); assert.ok(!s.includes('sin fecha'));
  assert.ok(ICS.validar('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nEND:VCALENDAR\r\n').length > 0);
});
test('CSV: ida y vuelta con comillas, saltos, ; y validaciones', () => {
  const pubs = [{ id: 'x1', titulo: 'Hola, "mundo"', red: 'x', formato: 'Hilo', estado: 'idea', fecha: '2026-11-05', hora: '09:00', texto: 'línea1\nlínea2', metricas: { vistas: 10, likes: 2 } }, { id: 'x2', titulo: '=SUMA(1)', red: 'tiktok', estado: 'publicado', fecha: '2026-11-06', hora: '18:30', metricas: {} }];
  const csv = CSV.generar(CSV.filasPub(pubs)); const r = CSV.importar(csv);
  assert.deepEqual(r.errores, []); assert.equal(r.pubs.length, 2); assert.equal(r.pubs[0].titulo, 'Hola, "mundo"'); assert.equal(r.pubs[0].texto, 'línea1\nlínea2'); assert.equal(r.pubs[0].metricas.vistas, 10);
  assert.equal(r.pubs[1].titulo, "'=SUMA(1)"); // protección contra inyección de fórmulas
  const e = CSV.importar('Título;Red;Estado;Fecha;Hora\nA;Twitter;Edición;2026-11-01;9:00\nB;myspace;idea;;\nC;x;idea;01/11/2026;\n;x;idea;;\nD;x;nose;;');
  assert.equal(e.pubs.length, 1); assert.equal(e.pubs[0].red, 'x'); assert.equal(e.pubs[0].estado, 'edicion'); assert.equal(e.pubs[0].hora, '09:00'); assert.deepEqual(e.errores.map(x => x.fila), [3, 4, 5, 6]);
  assert.equal(CSV.importar('a,b\n1,2').errores[0].msg.includes('titulo'), true);
});
test('Métricas: engagement, agrupación, serie, mejores horas', () => {
  const p = (red, f, h, v, l, c, s, formato) => ({ red, fecha: f, hora: h, estado: 'publicado', formato, tema: 'T', metricas: { vistas: v, likes: l, comentarios: c, compartidos: s, clics: 1 } });
  const L = [p('x', '2026-11-03', '09:00', 1000, 50, 10, 5, 'Hilo'), p('x', '2026-11-01', '09:30', 500, 10, 0, 0, 'Hilo'), p('tiktok', '2026-11-02', '19:00', 4000, 400, 40, 60, 'Video corto'), p('tiktok', '2026-11-04', '19:00', 0, 0, 0, 0, 'Video corto')];
  assert.equal(Me.engagement(L[0]), 6.5); assert.equal(Me.engagement(L[3]), null);
  const g = Me.agrupar(L, 'red', 'vistas'); assert.equal(g[0].clave, 'tiktok'); assert.equal(g[0].promedio, 2000); assert.equal(g[1].promedio, 750);
  assert.equal(Me.agrupar(L, 'red', 'engagement').find(x => x.clave === 'tiktok').n, 1); // sin vistas no cuenta
  assert.deepEqual(Me.serie(L, 'vistas').map(x => x.fecha), ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']);
  const t = Me.totales(L); assert.equal(t.vistas, 5500); assert.equal(t.clics, 4);
  assert.equal(Me.mejoresHoras(L, 'tiktok')[0].clave, '19:00');
});
test('Plan de 30 días, ideas semanales y puntuación', () => {
  const pl = Pl.plan30({ nicho: 'yoga', redes: ['instagram', 'tiktok', 'x'], inicio: '2026-12-01' }); assert.equal(pl.length, 30); assert.equal(pl[29].fecha, '2026-12-30');
  pl.forEach(x => { assert.ok(['instagram', 'tiktok', 'x'].includes(x.red)); assert.equal(x.estado, 'idea'); assert.match(x.hora, /^\d\d:\d\d$/); });
  assert.equal(Pl.plan30({ nicho: 'yoga', redes: ['x'], inicio: '2026-12-01', cadaDias: 3 }).length, 10);
  assert.deepEqual(Pl.plan30({ nicho: 'a', inicio: '2026-12-01' }).map(x => x.titulo), Pl.plan30({ nicho: 'a', inicio: '2026-12-01' }).map(x => x.titulo));
  assert.equal(Pl.ideasSemana({ nicho: 'yoga', redes: ['x'] }).length, 7);
  assert.equal(Pl.puntuar({ impacto: 5, encaje: 5, esfuerzo: 1 }), 100); assert.equal(Pl.puntuar({ impacto: 1, encaje: 1, esfuerzo: 5 }), 20);
});
test('Modelo: guion duración, ocurrencias ordenadas', () => {
  assert.equal(M.duracionGuion([{ seg: 5 }, { seg: 20 }, {}]), 25); assert.equal(M.mmss(65), '1:05');
  const o = M.ocurrencias([{ id: 'a', fecha: '2026-11-05', hora: '10:00', rec: { freq: 'diaria', cada: 1, cuenta: 3 } }, { id: 'b', fecha: '2026-11-05', hora: '08:00' }], '2026-11-01', '2026-11-30');
  assert.deepEqual(o.map(x => x.pub.id + x.fecha.slice(8)), ['b05', 'a05', 'a06', 'a07']);
});
