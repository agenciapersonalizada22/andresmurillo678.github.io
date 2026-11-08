/* Calculos puros de Monetizacion (sin DOM). Educativos: no son asesoria fiscal, legal ni financiera. window.MonCalc / require. */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.MonCalc = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var C = {};
  function n(v, d) { v = parseFloat(v); return isFinite(v) ? v : (d || 0); }
  function r2(v) { return Math.round((v + 1e-9) * 100) / 100; }
  C.n = n; C.r2 = r2;

  /* ---------- fechas (cadenas AAAA-MM-DD, aritmetica UTC) ---------- */
  function ts(s) { var p = String(s).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function fs(t) { return new Date(t).toISOString().slice(0, 10); }
  C.hoy = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  C.sumDias = function (s, k) { return fs(ts(s) + k * 864e5); };
  C.diasEntre = function (a, b) { return Math.round((ts(b) - ts(a)) / 864e5); };
  C.mes = function (s) { return String(s).slice(0, 7); };
  C.sumMeses = function (s, k) {
    var p = s.split('-'), y = +p[0], m = +p[1] - 1 + k, d = +p[2]; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    var ult = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); return y + '-' + ('0' + (m + 1)).slice(-2) + '-' + ('0' + Math.min(d, ult)).slice(-2);
  };
  C.mesMas = function (ym, k) { return C.sumMeses(ym + '-01', k).slice(0, 7); };

  /* ---------- plataformas: CPM / RPM / conversion ---------- */
  C.rpm = function (ingresos, vistas) { return vistas > 0 ? ingresos / vistas * 1000 : 0; };
  C.ingresoAds = function (vistas, rpm) { return vistas / 1000 * rpm; };
  /* rpm = cpm * anuncios por vista * tasa de llenado * parte del creador */
  C.rpmDeCpm = function (cpm, anunciosPorVista, llenado, reparto) { return cpm * anunciosPorVista * llenado * reparto; };
  C.conversion = function (visitas, ventas) { return visitas > 0 ? ventas / visitas : 0; };
  C.ltv = function (arpa, margen, churn) { return churn > 0 ? arpa * margen / churn : Infinity; };
  C.cac = function (gasto, nuevos) { return nuevos > 0 ? gasto / nuevos : Infinity; };
  C.payback = function (cac, arpa, margen) { var m = arpa * margen; return m > 0 ? cac / m : Infinity; };
  C.equilibrio = function (o) {
    var mc = n(o.precio) - n(o.variable);
    if (mc <= 0) return { imposible: true, mc: mc };
    var ex = n(o.fijos) / mc; return { exactas: ex, unidades: Math.ceil(ex - 1e-9), ingresos: Math.ceil(ex - 1e-9) * n(o.precio), mc: mc, mcPct: mc / n(o.precio) };
  };
  C.embudo = function (inicio, tasas) { var v = n(inicio), s = [v]; tasas.forEach(function (t) { v = v * n(t); s.push(v); }); return s; };

  /* ---------- prestamos, depreciacion, ROI ---------- */
  C.cuota = function (P, tasaAnualPct, meses) { var i = n(tasaAnualPct) / 1200; return i === 0 ? P / meses : P * i / (1 - Math.pow(1 + i, -meses)); };
  C.amortizacion = function (P, tasaAnualPct, meses) {
    var i = n(tasaAnualPct) / 1200, c = C.cuota(P, tasaAnualPct, meses), s = P, filas = [], ti = 0;
    for (var k = 1; k <= meses; k++) { var int = s * i, cap = c - int; s = k === meses ? 0 : s - cap; ti += int; filas.push({ k: k, interes: int, capital: cap, cuota: c, saldo: Math.max(0, s) }); }
    return { cuota: c, filas: filas, totalInteres: ti, total: c * meses };
  };
  C.depreciacionMes = function (costo, residual, meses) { return meses > 0 ? Math.max(0, n(costo) - n(residual)) / meses : 0; };
  C.roiEquipo = function (o) {
    var neto = n(o.ingresoMes) - n(o.costoMes), costo = n(o.costo);
    return { neto: neto, meses: neto > 0 ? costo / neto : Infinity, roi12: costo > 0 ? (neto * 12 - costo) / costo * 100 : 0 };
  };

  /* ---------- flujo de caja y estacionalidad ---------- */
  C.flujo = function (saldo, meses) {
    var s = n(saldo), min = s, minMes = -1, falta = -1;
    var filas = meses.map(function (m, i) { var net = n(m.ingresos) - n(m.gastos); s += net; if (s < min) { min = s; minMes = i; } if (s < 0 && falta < 0) falta = i; return { ingresos: n(m.ingresos), gastos: n(m.gastos), neto: net, saldo: s }; });
    return { filas: filas, final: s, minimo: min, mesMinimo: minMes, primerNegativo: falta };
  };
  /* totales: [{mes:'2026-01', ingresos}] -> indice por mes natural (1 = media) */
  C.estacionalidad = function (tot) {
    var suma = new Array(12).fill(0), cnt = new Array(12).fill(0), all = 0, k = 0;
    tot.forEach(function (t) { var m = +t.mes.slice(5, 7) - 1; suma[m] += t.ingresos; cnt[m]++; all += t.ingresos; k++; });
    var media = k ? all / k : 0;
    return suma.map(function (s, i) { return cnt[i] && media > 0 ? r2(s / cnt[i] / media * 1000) / 1000 : 1; });
  };
  C.proyectar = function (o) {
    var est = o.estac || [], g = n(o.crecimientoPct) / 100, res = [], m0 = o.mesInicio;
    for (var i = 0; i < o.n; i++) {
      var ym = C.mesMas(m0, i), idx = est.length === 12 ? n(est[+ym.slice(5, 7) - 1], 1) : 1;
      var ing = n(o.ingresoBase) * Math.pow(1 + g, i) * idx + n((o.ingresosExtra || [])[i]), gas = n(o.gastoBase) + n((o.gastosExtra || [])[i]);
      res.push({ mes: ym, ingresos: ing, gastos: gas, reserva: ing * n(o.reservaPct) / 100 });
    }
    var f = C.flujo(o.saldo, res.map(function (m) { return { ingresos: m.ingresos - m.reserva, gastos: m.gastos }; }));
    f.filas.forEach(function (x, i) { x.mes = res[i].mes; x.reserva = res[i].reserva; x.ingresosBrutos = res[i].ingresos; });
    return f;
  };
  C.fondoEmergencia = function (gastoMes, meses, ahorrado, aporteMes) {
    var meta = n(gastoMes) * n(meses), falta = Math.max(0, meta - n(ahorrado));
    return { meta: meta, falta: falta, pct: meta > 0 ? Math.min(100, n(ahorrado) / meta * 100) : 0, mesesParaMeta: falta === 0 ? 0 : n(aporteMes) > 0 ? Math.ceil(falta / n(aporteMes)) : Infinity };
  };

  /* ---------- impuestos genericos (tasas del usuario; sin leyes codificadas) ---------- */
  /* tramos: [{hasta:number|null, tasa:%}] ordenados; hasta null = sin tope. */
  C.impuestoTramos = function (base, tramos) {
    var resto = Math.max(0, n(base)), prev = 0, imp = 0, det = [];
    (tramos || []).forEach(function (t) {
      if (resto <= 0 && prev >= base) return;
      var tope = t.hasta == null || t.hasta === '' ? Infinity : n(t.hasta), ancho = Math.min(base, tope) - prev;
      if (ancho > 0) { imp += ancho * n(t.tasa) / 100; det.push({ desde: prev, hasta: Math.min(base, tope), tasa: n(t.tasa), monto: ancho * n(t.tasa) / 100 }); }
      prev = Math.max(prev, tope === Infinity ? base : tope);
    });
    return { impuesto: imp, detalle: det };
  };
  C.simularImpuestos = function (o) {
    var ing = n(o.ingresos), gas = n(o.gastos), ded = gas * n(o.deducibleGastosPct == null ? 100 : o.deducibleGastosPct) / 100, base = Math.max(0, ing - ded - n(o.deduccionFija));
    var t = o.tramos && o.tramos.length ? C.impuestoTramos(base, o.tramos) : { impuesto: base * n(o.tasaPlana) / 100, detalle: [] };
    var otros = ing * n(o.otroSobreIngresosPct) / 100, total = t.impuesto + otros;
    return { baseImponible: base, impuestoRenta: t.impuesto, otros: otros, total: total, tasaEfectiva: ing > 0 ? total / ing * 100 : 0, netoDespues: ing - gas - total, detalle: t.detalle, reservaSugerida: ing > 0 ? total / ing * 100 : 0 };
  };

  /* ---------- tarifa de servicios ---------- */
  C.tarifaHora = function (o) {
    var h = n(o.horasFacturablesMes), costoMes = n(o.ingresoDeseadoMes) + n(o.gastosFijosMes) + n(o.seguroMes) + n(o.depreciacionMes);
    return h > 0 ? costoMes / h / Math.max(0.01, 1 - n(o.reservaImpuestosPct) / 100) : 0;
  };
  /* depreciacion por hora de uso de un equipo */
  C.depHora = function (e) { var h = n(e.vidaMeses) * n(e.usoHorasMes); return h > 0 ? Math.max(0, n(e.costo) - n(e.residual)) / h : 0; };
  C.tarifaProyecto = function (p) {
    var hc = n(p.horasCampo), hp = n(p.horasPost), tarifa = n(p.tarifaHora), tpost = p.tarifaPost == null || p.tarifaPost === '' ? tarifa : n(p.tarifaPost);
    var manoObra = hc * tarifa, post = hp * tpost, dep = 0, detEq = [];
    (p.equipo || []).forEach(function (e) { var v = C.depHora(e) * hc; dep += v; detEq.push({ nombre: e.nombre, monto: v }); });
    var hTot = n(p.horasFacturablesMes), seguro = hTot > 0 ? n(p.seguroMes) * (hc + hp) / hTot : 0;
    var desplaz = n(p.km) * n(p.costoKm) + n(p.peajes), bateria = n(p.ciclosBateria) * (n(p.ciclosVidaBateria) > 0 ? n(p.costoBateria) / n(p.ciclosVidaBateria) : 0), consum = bateria + n(p.consumibles);
    var costoExtra = dep + seguro + desplaz + consum, base = manoObra + post + costoExtra, m = Math.min(0.95, Math.max(0, n(p.margenPct) / 100));
    var precio = base / (1 - m), horas = hc + hp;
    return { manoObra: manoObra, post: post, depreciacion: dep, seguro: seguro, desplazamiento: desplaz, bateria: bateria, consumibles: consum, costoExtra: costoExtra, costoTotal: base, precio: precio, utilidad: precio - base, margenReal: precio > 0 ? (precio - base) / precio : 0, porHora: horas > 0 ? precio / horas : 0, porDia: n(p.horasJornada, 8) * (horas > 0 ? precio / horas : 0), detalleEquipo: detEq };
  };

  /* ---------- documentos: totales y numeracion ---------- */
  C.totalesDoc = function (d) {
    var sub = 0; (d.lineas || []).forEach(function (l) { sub += n(l.cant, 1) * n(l.precio) * (1 - n(l.desc) / 100); });
    var dg = sub * n(d.descuentoPct) / 100, base = sub - dg, imps = (d.impuestos || []).map(function (i) { var m = base * n(i.pct) / 100 * (i.retencion ? -1 : 1); return { nombre: i.nombre, pct: n(i.pct), retencion: !!i.retencion, monto: r2(m) }; });
    var tot = r2(base) + imps.reduce(function (a, i) { return a + i.monto; }, 0), pag = (d.pagos || []).reduce(function (a, p) { return a + n(p.monto); }, 0);
    return { subtotal: r2(sub), descuento: r2(dg), base: r2(base), impuestos: imps, total: r2(tot), pagado: r2(pag), saldo: r2(tot - pag) };
  };
  C.numerar = function (patron, num, fecha) {
    var f = fecha || C.hoy();
    return String(patron || 'DOC-{NNNN}').replace(/\{(AAAA|AA|MM|N+)\}/g, function (m, t) {
      if (t === 'AAAA') return f.slice(0, 4); if (t === 'AA') return f.slice(2, 4); if (t === 'MM') return f.slice(5, 7);
      return String(num).padStart(t.length, '0');
    });
  };
  /* est: {patron, sig, anio, reiniciar}; devuelve {numero, est: nuevo estado} */
  C.siguienteNumero = function (est, fecha) {
    var f = fecha || C.hoy(), y = +f.slice(0, 4), sig = n(est.sig, 1);
    if (est.reiniciar && est.anio && est.anio !== y) sig = 1;
    return { numero: C.numerar(est.patron, sig, f), est: Object.assign({}, est, { sig: sig + 1, anio: y }) };
  };

  /* ---------- moneda (tasas por 1 unidad de la moneda de referencia, p. ej. USD=1) ---------- */
  C.convertir = function (monto, de, a, tasas) {
    if (!de || !a || de === a) return n(monto);
    var td = de === 'USD' && tasas[de] == null ? 1 : tasas[de], ta = a === 'USD' && tasas[a] == null ? 1 : tasas[a];
    if (!(td > 0) || !(ta > 0)) return null;
    return n(monto) / td * ta;
  };

  /* ---------- recurrentes ---------- */
  C.fechasRecurrente = function (r, hasta) {
    var sal = [], paso = { semanal: 7, quincenal: 14 }[r.frecuencia], meses = { mensual: 1, trimestral: 3, anual: 12 }[r.frecuencia] || 0;
    if (!r.inicio || (!paso && !meses)) return sal;
    var i = 0, d = r.inicio, ult = r.ultimaGen || null;
    while (d <= hasta && i < 600) {
      if (r.fin && d > r.fin) break;
      if (!ult || d > ult) sal.push(d);
      i++; d = paso ? C.sumDias(r.inicio, paso * i) : C.sumMeses(r.inicio, meses * i);
    }
    return sal;
  };

  /* ---------- CSV ---------- */
  C.aCSV = function (filas, cols) {
    function q(v) { v = v == null ? '' : String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    return '﻿' + [cols.map(function (c) { return q(c.t); }).join(',')].concat(filas.map(function (f) { return cols.map(function (c) { return q(f[c.k]); }).join(','); })).join('\r\n');
  };
  C.numES = function (s) { s = String(s == null ? '' : s).trim().replace(/[^\d.,\-]/g, ''); if (!s) return 0; var c = s.lastIndexOf(','), p = s.lastIndexOf('.'); if (c > p) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, ''); return n(s); };

  /* ---------- agregados del libro ---------- */
  /* movs ya convertidos a la moneda base: {fecha,tipo,monto,proyecto,cliente,fuente,categoria} */
  C.porMes = function (movs, desde, hasta) {
    var m = {}; for (var k = desde; k <= hasta; k = C.mesMas(k, 1)) m[k] = { mes: k, ingresos: 0, gastos: 0 };
    movs.forEach(function (x) { var k = C.mes(x.fecha); if (m[k]) m[k][x.tipo === 'ingreso' ? 'ingresos' : 'gastos'] += x.monto; });
    return Object.keys(m).sort().map(function (k) { return m[k]; });
  };
  C.agrupar = function (movs, campo) {
    var m = {}; movs.forEach(function (x) { var k = x[campo] || '(sin asignar)', o = m[k] = m[k] || { clave: k, ingresos: 0, gastos: 0 }; o[x.tipo === 'ingreso' ? 'ingresos' : 'gastos'] += x.monto; });
    return Object.keys(m).map(function (k) { var o = m[k]; o.neto = o.ingresos - o.gastos; o.margen = o.ingresos > 0 ? o.neto / o.ingresos : null; return o; });
  };
  C.antiguedad = function (docs, hoy) {   // docs: {vence, saldo}
    var b = { alDia: 0, d30: 0, d60: 0, d90: 0 };
    docs.forEach(function (d) { var v = C.diasEntre(d.vence, hoy); if (v <= 0) b.alDia += d.saldo; else if (v <= 30) b.d30 += d.saldo; else if (v <= 60) b.d60 += d.saldo; else b.d90 += d.saldo; });
    return b;
  };
  return C;
});
