var T = require('./util'), R = require('../js/registro.js'), AL = require('../js/almacen.js'), cerca = T.cerca, igual = T.igual;
function b(o) { return R.nueva(o); }
var L = [
  b({ id: '1', fecha: '2026-03-02', liquidada: '2026-03-02', creado: 1, cuota: 2, importe: 10, estado: 'ganada', cierre: 1.8, deporte: 'Fútbol', casa: 'A', etiquetas: ['valor', 'liga'] }),   // +10
  b({ id: '2', fecha: '2026-03-03', liquidada: '2026-03-03', creado: 2, cuota: 3, importe: 10, estado: 'perdida', cierre: 3.3, deporte: 'Tenis', casa: 'B', etiquetas: ['valor'] }),  // -10
  b({ id: '3', fecha: '2026-03-04', liquidada: '2026-03-04', creado: 3, cuota: 2, importe: 20, estado: 'perdida', deporte: 'Fútbol', casa: 'A' }), // -20
  b({ id: '4', fecha: '2026-03-05', liquidada: '2026-03-05', creado: 4, cuota: 1.5, importe: 10, estado: 'anulada' }),       // 0, no cuenta
  b({ id: '5', fecha: '2026-03-06', liquidada: '2026-03-06', creado: 5, cuota: 4, importe: 10, estado: 'cashout', cashout: 15, deporte: 'Fútbol', casa: 'A' }), // +5
  b({ id: '6', fecha: '2026-03-07', liquidada: '2026-03-07', creado: 6, cuota: 2.2, importe: 10, estado: 'mediaganada', deporte: 'NBA', casa: 'B' }), // 5*2.2+5-10 = +6
  b({ id: '7', fecha: '2026-03-08', liquidada: '2026-03-08', creado: 7, cuota: 2, importe: 10, estado: 'mediaperdida', deporte: 'NBA', casa: 'B' }), // -5
  b({ id: '8', fecha: '2026-03-09', creado: 8, cuota: 2, importe: 25, estado: 'pendiente' })
];
cerca(R.retorno(L[0]), 20, 1e-12, 'retorno ganada'); cerca(R.retorno(L[3]), 10, 1e-12, 'retorno anulada'); cerca(R.retorno(L[5]), 16, 1e-12, 'retorno media ganada'); cerca(R.retorno(L[6]), 5, 1e-12, 'retorno media perdida');
igual(R.retorno(L[7]), null, 'pendiente sin retorno'); cerca(R.neto(L[4]), 5, 1e-12, 'neto cashout'); cerca(R.neto(L[7]), 0, 0, 'neto pendiente');
cerca(R.clv(L[0]), 2 / 1.8 - 1, 1e-12, 'clv +'); cerca(R.clv(L[1]), 3 / 3.3 - 1, 1e-12, 'clv -'); igual(R.clv(L[2]), null, 'clv sin cierre');
var s = R.resumen(L, 1000);
cerca(s.neto, 10 - 10 - 20 + 5 + 6 - 5, 1e-9, 'neto total (-14)'); cerca(s.apostado, 10 + 10 + 20 + 10 + 10 + 10, 1e-9, 'apostado sin anuladas ni pendientes'); igual(s.liquidadas, 6, 'liquidadas');
cerca(s.yield, -14 / 70, 1e-12, 'yield'); cerca(s.roi, -0.014, 1e-12, 'roi sobre banca'); cerca(s.aciertos, 3 / 6, 1e-12, 'aciertos (ganada, cashout+, media+)');
cerca(s.cuotaMedia, (2 + 3 + 2 + 4 + 2.2 + 2) / 6, 1e-12, 'cuota media'); cerca(s.clvMedio, ((2 / 1.8 - 1) + (3 / 3.3 - 1)) / 2, 1e-12, 'clv medio'); cerca(s.clvPositivo, 0.5, 1e-12, '% clv+'); igual(s.clvN, 2, 'n clv');
igual(s.pendientes, 1, 'pendientes'); cerca(s.enJuego, 25, 0, 'en juego'); cerca(s.banca, 986, 1e-9, 'banca final');
// curva y drawdown: 1000,1010,1000,980,(anulada 980),985,991,986
igual(s.curva.map(function (p) { return p.banca; }).join(), '1000,1010,1000,980,980,985,991,986', 'curva');
cerca(s.drawdown.absoluto, 30, 1e-9, 'max drawdown'); cerca(s.drawdown.pct, 30 / 1010, 1e-12, 'max drawdown %');
cerca(R.drawdown([{ banca: 100 }, { banca: 150 }, { banca: 75 }, { banca: 200 }, { banca: 150 }]).pct, 0.5, 1e-12, 'dd 50%'); cerca(R.drawdown([1, 2, 3]).absoluto, 0, 0, 'sin dd');
// rachas: +,-,-,(anulada ignorada),+,+,- => max ganadora 2, perdedora 2, actual perdedora 1
var rc = R.rachas(L); igual(rc.maxGanadora, 2, 'racha ganadora'); igual(rc.maxPerdedora, 2, 'racha perdedora'); igual(rc.actual, { tipo: 'perdedora', n: 1 }, 'racha actual');
// desgloses
var d = R.desglose(L, 'deporte'); var fut = d.filter(function (x) { return x.clave === 'Fútbol'; })[0];
igual(fut.n, 3, 'futbol n'); cerca(fut.neto, 10 - 20 + 5, 1e-12, 'futbol neto'); cerca(fut.yield, -5 / 40, 1e-12, 'futbol yield');
var et = R.desglose(L, 'etiqueta'); cerca(et.filter(function (x) { return x.clave === 'valor'; })[0].neto, 0, 1e-12, 'etiqueta valor'); T.cierto(et.some(function (x) { return x.clave === '(sin etiqueta)'; }), 'sin etiqueta');
igual(R.diaSemana('2026-03-02'), 'lunes', 'dia semana'); igual(R.desglose(L, 'dia').filter(function (x) { return x.clave === 'lunes'; })[0].neto, 10, 'lunes');
igual(R.desglose(L, 'casa')[0].clave, 'A' === R.desglose(L, 'casa')[0].clave ? 'A' : 'B', 'orden por neto');
// combinada
cerca(R.cuotaTotal(b({ tipo: 'combinada', patas: [{ cuota: 1.5 }, { cuota: 2 }, { cuota: 2 }] })), 6, 1e-12, 'cuota combinada');
// limites (lunes 2026-03-09 12:00)
var ahora = new Date(2026, 2, 9, 12);
var lim = R.evaluarLimites(L, { perdidaDia: 20, perdidaSemana: 100, aviso: 0.8 }, ahora);
igual(lim[0].nombre, 'diario', 'limite diario'); cerca(lim[0].perdida, 25, 1e-12, 'perdida del dia = pendiente 25'); igual(lim[0].estado, 'excedido', 'dia excedido');
cerca(lim[1].perdida, 25, 1e-12, 'semana desde lunes 9'); igual(lim[1].estado, 'ok', 'semana ok');
var lim2 = R.evaluarLimites(L, { perdidaSemana: 30 }, new Date(2026, 2, 8, 12)); // semana lunes 2 - domingo 8: neto -14 sin pendiente => 14... (suma de importe-retorno)
cerca(lim2[0].perdida, 14, 1e-9, 'perdida semana'); igual(lim2[0].estado, 'ok', 'estado semana'); igual(R.evaluarLimites(L, { perdidaSemana: 16 }, new Date(2026, 2, 8, 12))[0].estado, 'aviso', 'aviso 87%');
// CSV
var csv = R.aCSV(L.concat([b({ id: 'q', evento: 'Real, "Madrid"\nvs Barça', cuota: 2.5, importe: 12.5, notas: 'con "comillas", coma; punto y coma', etiquetas: ['a', 'b'], tipo: 'combinada', patas: [{ evento: 'x', seleccion: 'y', cuota: 1.5 }, { evento: 'z', seleccion: 'w', cuota: 1.6667 }] })]));
var rt = R.deCSV(csv); igual(rt.errores.length, 0, 'sin errores'); igual(rt.apuestas.length, 9, 'filas'); var q = rt.apuestas[8];
igual(q.evento, 'Real, "Madrid"\nvs Barça', 'evento con comillas y salto'); igual(q.notas, 'con "comillas", coma; punto y coma', 'notas'); igual(q.etiquetas, ['a', 'b'], 'etiquetas'); igual(q.tipo, 'combinada', 'tipo'); igual(q.patas.length, 2, 'patas');
cerca(R.resumen(rt.apuestas, 1000).neto, s.neto, 1e-12, 'mismo neto tras ida y vuelta'); igual(rt.apuestas[0].cierre, 1.8, 'cierre'); igual(rt.apuestas[4].cashout, 15, 'cashout'); igual(rt.apuestas[0].creado, 1, 'creado conservado');
var eu = R.deCSV('﻿Fecha;Evento;Cuota;Importe;Resultado;Etiquetas\n2026-01-05;A - B;1,85;10,50;won;x|y\n2026-01-06;C - D;2,10;1.250,00;lost;\n2026-01-07;E - F;abc;5;won;\n2026-01-08;G - H;2.0;5;rara;\n');
igual(eu.apuestas.length, 2, 'importa europeo'); cerca(eu.apuestas[0].cuota, 1.85, 1e-12, 'coma decimal'); cerca(eu.apuestas[0].importe, 10.5, 1e-12, 'importe 10,50'); cerca(eu.apuestas[1].importe, 1250, 1e-12, 'miles'); igual(eu.apuestas[0].estado, 'ganada', 'alias won'); igual(eu.apuestas[1].estado, 'perdida', 'alias lost');
igual(eu.errores.length, 2, 'errores'); igual(eu.errores[0].linea, 4, 'linea error'); igual(R.deCSV('a,b\n1,2').errores[0].msg.indexOf('Faltan') >= 0, true, 'faltan columnas');
igual(R.deCSV('cuota,importe,estado\n2,5,cashout\n').errores.length, 1, 'cashout sin importe devuelto');
// Almacen (backend en memoria)
var S = AL.crear(AL.backendMemoria()), cambios = 0; S.suscribir(function () { cambios++; });
(async function () {
  var v = await S.set('bets', 'x1', { a: 1 }, 1000); igual(v._t, 1000, 'marca de tiempo'); igual((await S.get('bets', 'x1')).a, 1, 'get');
  await S.set('bets', 'x2', { a: 2 }); igual((await S.lista('bets')).length, 2, 'lista'); igual((await S.lista('otra')).length, 0, 'colecciones separadas');
  await S.borrar('bets', 'x1', 2000); igual(await S.get('bets', 'x1'), null, 'borrado'); igual((await S.lista('bets')).length, 1, 'lista sin lapidas'); igual((await S.lista('bets', { todo: true })).length, 2, 'lapida conservada');
  igual(await S.mezclar('bets', [{ id: 'x1', a: 9, _t: 1500 }, { id: 'x3', a: 3, _t: 5 }]), 1, 'mezcla: la lapida mas nueva gana'); igual((await S.get('bets', 'x3')).a, 3, 'x3 anadido');
  igual(await S.mezclar('bets', [{ id: 'x2', a: 7, _t: Date.now() + 10 }]), 1, 'mezcla mas nuevo'); igual((await S.get('bets', 'x2')).a, 7, 'x2 actualizado'); T.cierto(cambios >= 4, 'suscripcion');
  T.fin('registro+almacen');
})();
