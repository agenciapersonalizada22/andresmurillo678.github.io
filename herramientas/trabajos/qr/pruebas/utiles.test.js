/* Pruebas de impresion.calcular, CSV, ZIP, tipos QR. Uso: node utiles.test.js */
const assert = require('assert'), I = require('../../comun/impresion.js'), T = require('../../comun/util.js'), Tp = require('../js/qrtipos.js');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
let L = I.calcular({ papel: 'A4', modo: 'fija', cw: 50, ch: 50, sx: 4, sy: 4, mt: 10, md: 10, mb: 10, mi: 10, total: 100 });
ok(L.cols === 3 && L.filas === 5 && L.porHoja === 15 && L.paginas === 7, 'A4 50mm: ' + L.cols + 'x' + L.filas);
const c = L.celdas; ok(Math.abs(c[0].x - (10 + (190 - (3 * 50 + 8)) / 2)) < 0.01, 'centrado horizontal');
L = I.calcular({ papel: 'Carta', orient: 'horizontal', modo: 'cuadricula', cols: 4, filas: 2, mt: 5, md: 5, mb: 5, mi: 5, sx: 2, sy: 2, total: 8 });
ok(L.hoja.w === 279.4 && Math.abs(L.celda.w * 4 + 6 - 269.4) < 0.1 && L.paginas === 1, 'carta horizontal');
L = I.calcular({ papel: 'A4', modo: 'fija', explicito: true, cols: 3, filas: 7, cw: 63.5, ch: 38.1, sx: 2.5, sy: 0, mt: 15.1, mi: 7.2, md: 7.2, mb: 15.1, alinear: 'inicio', total: 21 });
ok(L.porHoja === 21 && L.celdas[0].x === 7.2 && L.celdas[0].y === 15.1 && L.avisos.length === 0, 'Avery L7160 cabe 3x7');
L = I.calcular({ modo: 'fija', cw: 500, ch: 500, total: 1 }); ok(L.porHoja === 0 && L.avisos.length, 'nada cabe');
const svg = I.hojaSVG(I.calcular({ modo: 'fija', cw: 50, ch: 50, cortes: 'lineas', registro: true, regla: true, mb: 12, total: 3 }), 0, (i) => '<rect width="5" height="5"/>', {});
ok(/width="210mm"/.test(svg) && (svg.match(/<rect width="5"/g) || []).length === 3 && /circle/.test(svg) && /50 mm/.test(svg), 'hoja svg: 3 celdas (total=3), registro, regla');
const f = T.csv('contenido;etiqueta\r\n"a;b";"x ""y"""\r\nc;d\r\n'); ok(f.length === 3 && f[1][0] === 'a;b' && f[1][1] === 'x "y"', 'csv');
const z = T.zip([{ nombre: 'a.txt', datos: T.bytes('hola') }]); ok(z.size > 40, 'zip'); ok(T.crc32(T.bytes('123456789')) === 0xCBF43926, 'crc32 estandar');
ok(Tp.tipo('wifi').construir({ ssid: 'a;b', clave: 'c:d', seg: 'WPA' }) === 'WIFI:T:WPA;S:a\\;b;P:c\\:d;;', 'wifi escapes');
ok(Tp.tipo('geo').validar({ lat: '91', lon: '0' }) !== null, 'geo valida');
console.log('OK', n);
