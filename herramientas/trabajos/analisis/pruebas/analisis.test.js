/* Pruebas de la logica pura de Analisis con datos sinteticos de resultado conocido. Ejecutar: node pruebas/analisis.test.js */
'use strict';
const assert = require('assert'), path = require('path');
const Agg = require('../js/agregar.js'), C = require('../js/cruces.js'), I = require('../js/integridad.js'), R = require('../js/respaldo.js'), Inf = require('../js/informe.js'), IA = require('../js/ia.js'), FL = require('../js/flujos.js'), fixture = require('./fixture.js');
let ok = 0; function t(nombre, f) { try { f(); ok++; } catch (e) { console.error('FALLA:', nombre, '\n', e.message); process.exitCode = 1; } }
const close = (a, b, e) => assert.ok(Math.abs(a - b) <= (e || 0.01), a + ' != ' + b);
const ahora = new Date(2026, 10, 8, 12, 0, 0).getTime(), fx = fixture(ahora);
const datos = Agg.armar(fx.entradas, { ahora, ls: fx.ls, sync: fx.sync, estimate: fx.estimate });
const an = C.analizar(datos, { ahora, metas: [{ id: 'm1', kpi: 'margen_pct', comparador: '>=', objetivo: 20, alerta: true }, { id: 'm2', kpi: 'vencido', comparador: '<=', objetivo: 0, alerta: true }, { id: 'm3', kpi: 'cuota_pct', comparador: '<=', objetivo: 75, alerta: true }, { id: 'm4', kpi: 'horas_vuelo', comparador: '>=', objetivo: 3, alerta: true }] });

t('resumen de modulos', () => {
  const r = Object.fromEntries(an.resumen.map(x => [x.id, x]));
  assert.strictEqual(r.drones.registros, 5); assert.strictEqual(r.drones.proyectos, 2); assert.strictEqual(r.monetizacion.proyectos, 5); assert.strictEqual(r.qr.proyectos, 2);
  assert.strictEqual(r['video-ia'].registros, 3); assert.ok(r.drones.bytes > 100); assert.strictEqual(r.drones.ultima, ahora - 1 * 864e5);
});
t('uso diario (creaciones + ediciones)', () => {
  assert.strictEqual(an.uso.dias.length, 30); assert.strictEqual(an.uso.total[28], 8); assert.strictEqual(an.uso.porModulo.automatizaciones[28], 3);
  assert.strictEqual(an.uso.porModulo['realidad-aumentada'][28], 1); assert.strictEqual(an.uso.porModulo['realidad-aumentada'][20], 1);
});
t('cuota y avisos', () => { assert.strictEqual(an.cuota.nivel, 'aviso'); close(an.cuota.pct, 0.8); assert.ok(an.cuota.avisos[0].includes('80 %')); assert.strictEqual(Agg.cuota({ usage: 95, quota: 100 }, datos).nivel, 'critico'); assert.strictEqual(Agg.cuota(null, datos).nivel, 'desconocido'); });
t('sincronizacion y conflictos', () => {
  const s = Object.fromEntries(an.sincro.map(x => [x.id, x])); assert.strictEqual(s.drones.estado, 'pendiente'); assert.strictEqual(s.drones.pendientes, 2);   // dp1 (-2d) y b2 (-1d) son posteriores a la ultima sync (-2.5d)
  assert.strictEqual(s.drones.conflictos.length, 1); assert.strictEqual(s.drones.conflictos[0].k, 'proyectos/dp2'); assert.strictEqual(s.drones.conflictos[0].gana, 'borrado');
  assert.strictEqual(s.qr.estado, 'nunca'); assert.strictEqual(Agg.sincronizacion(datos, false)[0].estado, 'sinSesion');
});
t('drones', () => { const d = an.dom.drones; assert.strictEqual(d.misiones, 1); assert.strictEqual(d.waypoints, 1); close(d.distanciaKm, 0.1); assert.strictEqual(d.vuelos, 3); close(d.horas, 3); assert.strictEqual(d.incidencias, 1); assert.strictEqual(d.baterias, 4); close(d.vientoProm, 10); assert.strictEqual(d.porProyecto[0].horas, 2); });
t('automatizaciones', () => {
  const a = an.dom.automatizaciones; assert.strictEqual(a.ejecuciones, 7); assert.strictEqual(a.simulaciones, 1); assert.strictEqual(a.ok, 4); assert.strictEqual(a.error, 3); close(a.tasaExito, 4 / 7, 1e-9);
  const b = a.porFlujo.filter(f => f.id === 'fb')[0]; assert.strictEqual(b.total, 3); assert.strictEqual(b.error, 2); assert.strictEqual(b.durProm, 2000); assert.strictEqual(a.activos, 1); assert.strictEqual(a.nodos, 3);
});
t('contenido', () => {
  const c = an.dom.contenido; assert.strictEqual(c.piezas, 5); assert.strictEqual(c.publicadas, 1); assert.strictEqual(c.porEstado.idea, 2); assert.strictEqual(c.listas, 1);
  const y = c.canales.filter(x => x.canal === 'youtube')[0]; assert.strictEqual(y.crecimiento, 50); assert.strictEqual(y.vistas, 1500); close(y.ingresos, 7.5); assert.strictEqual(y.seguidores, 150);
});
t('monetizacion con conversion', () => {
  const m = an.dom.monetizacion; close(m.ingresos, 2500); close(m.gastos, 300); close(m.margen, 2200); close(m.margenPct, 0.88); close(m.porCobrar, 450); close(m.vencido, 150);
  assert.strictEqual(m.cuentasPorCobrar.length, 2); assert.strictEqual(m.cuentasPorCobrar[0].diasVencida, 7); assert.strictEqual(m.sinTasa.length, 0); close(m.porMes[Agg.u.mes(Agg.u.dia(ahora - 6 * 864e5))].ingresos > 0 ? 1 : 0, 1);
});
t('reconstruccion, ar, dispositivos, qr, video', () => {
  const r = an.dom.reconstruccion; assert.strictEqual(r.capas, 3); assert.strictEqual(r.tamanos.pequeno, 1); assert.strictEqual(r.tamanos.medio, 1); assert.strictEqual(r.tamanos.grande, 1); close(r.calidadProm, 70); assert.strictEqual(r.completitud[0].puntaje, 90);
  const a = an.dom.ar; assert.deepStrictEqual([a.capas, a.anclas, a.objetos], [2, 1, 3]);
  const d = an.dom.dispositivos; assert.strictEqual(d.sesiones, 2); close(d.minutos, 3); assert.strictEqual(d.conError, 1); assert.strictEqual(d.bytesRx, 1000);
  const q = an.dom.qr; assert.strictEqual(q.creados, 1); assert.strictEqual(q.leidos, 1); assert.strictEqual(q.favoritos, 1);
  const v = an.dom.video; assert.strictEqual(v.zonas, 2); assert.strictEqual(v.lineas, 1); assert.strictEqual(v.reglasActivas, 1); assert.strictEqual(v.eventos, 0); assert.strictEqual(v.llamadasIA, 1);
});
t('rentabilidad por proyecto y cliente', () => {
  const r = an.rent, p = r.proyectos.filter(x => x.nombre === 'Tomas aereas')[0]; close(p.ingresos, 1000); close(p.gastos, 200); close(p.margen, 800); close(p.horasVuelo, 2); close(p.margenPorHora, 400); close(p.costoEquipo, 40); close(p.margenNeto, 760); assert.strictEqual(p.vinculado, true); assert.strictEqual(p.facturas, 1);
  const q = r.proyectos.filter(x => x.nombre === 'Canal de viajes')[0]; close(q.ingresos, 1000); close(q.margen, 900); assert.strictEqual(q.vinculado, false) ; // en drones se llama igual: horas 0 por no tener vuelos
  const c1 = r.clientes.filter(x => x.nombre === 'Sol' && x.id === 'c1')[0]; close(c1.ingresos, 1500); close(c1.horas, 2); close(r.costoHoraEquipo, 30 - 10 ? 20 : 0);
});
t('ROI equipo', () => { const r = an.roi; close(r.inversion, 4800); close(r.margenVinculado, 800); close(r.roi, 800 / 4800, 1e-9); assert.strictEqual(r.horasParaRecuperar, 10); assert.strictEqual(r.equipos[0].horasParaRecuperar, Math.ceil(r.equipos[0].costo / 400)); });
t('costo de IA por pieza y productividad', () => { const i = an.ia; close(i.gasto, 1.0); assert.strictEqual(i.piezas, 2); close(i.costoPorPieza, 0.5); assert.strictEqual(i.llamadas, 4); const p = an.prod; close(p.horas, 3); assert.strictEqual(p.entregables, 1 + 3 + 3); close(p.horasPorEntregable, 3 / 7, 0.01); });
t('recomendaciones citan sus datos', () => {
  const ids = an.recomendaciones.map(r => r.id); ['cuota', 'facturas_vencidas', 'flujo_falla', 'fallo_global', 'piezas_atascadas', 'sin_respaldo'].forEach(i => assert.ok(ids.includes(i), 'falta ' + i + ' en ' + ids));
  an.recomendaciones.forEach(r => { assert.ok(r.regla && r.evidencia.length, r.id); });
  const fb = an.recomendaciones.filter(r => r.id === 'flujo_falla')[0]; assert.ok(fb.evidencia[0].etq === 'Flujo B' && /2 fallos de 3/.test(fb.evidencia[0].valor));
  assert.ok(!ids.includes('margen_bajo')); assert.strictEqual(an.recomendaciones[0].nivel, 'alta');
  const at = an.recomendaciones.filter(r => r.id === 'piezas_atascadas')[0]; assert.strictEqual(at.evidencia[0].valor, 3);
});
t('KPIs y metas con alertas', () => {
  close(an.valores.margen_pct, 88); close(an.valores.vencido, 150); const m = Object.fromEntries(an.metas.map(e => [e.meta.id, e.estado]));
  assert.deepStrictEqual(m, { m1: 'ok', m2: 'falla', m3: 'cerca', m4: 'ok' }); assert.strictEqual(an.alertas.length, 2); assert.strictEqual(an.alertas[0].nivel, 'alta');
  assert.strictEqual(C.evaluarMeta({ kpi: 'noexiste', objetivo: 1 }, {}).estado, 'sinDatos');
});
t('informe semanal y mensual', () => {
  const s = Inf.modelo(an, datos, 'semanal'), k = Object.fromEntries(s.kpis.map(x => [x.id, x]));
  assert.strictEqual(s.periodo.dias, 7); close(k.horas.valor, 2); assert.strictEqual(k.vuelos.valor, 2); close(k.ingresos.valor, 2000); close(k.gastos.valor, 300); close(k.margen.valor, 1700); assert.strictEqual(k.ejecuciones.valor, 7); assert.strictEqual(k.fallos.valor, 3);
  assert.strictEqual(k.piezasPublicadas.valor, 1); assert.strictEqual(k.sesiones.valor, 2); assert.strictEqual(k.facturas.valor, 2); close(k.horas.previo, 0);
  const m = Inf.modelo(an, datos, 'mensual'), km = Object.fromEntries(m.kpis.map(x => [x.id, x])); close(km.ingresos.valor, 2000); close(km.horas.previo, 1);
  const csv = Inf.aCSV(an, s); assert.ok(csv.startsWith('﻿seccion,metrica,valor')); assert.ok(csv.includes('Horas de vuelo,2,h')); const j = JSON.parse(Inf.aJSON(an, s)); assert.strictEqual(j.formato, 'trabajos_tablero'); assert.strictEqual(j.dominios.drones.horas, 3);
  const pag = Inf.paginar(s, 186, 273); assert.ok(pag.length >= 1); assert.ok(Inf.dibujarPagina(pag, 0, { w: 186, h: 273 }, s).includes('<text'));
});
t('IA: payload exacto, anonimizado y sin claves', () => {
  const s = Inf.modelo(an, datos, 'semanal'), a = IA.construir(an, s, datos, true), b = IA.construir(an, s, datos, false);
  assert.ok(b.mensaje.includes('Tomas aereas')); assert.ok(!a.mensaje.includes('Tomas aereas') && !a.mensaje.includes('Flujo B') && !a.mensaje.includes('Mavic') && /Nombre-\d+/.test(a.mensaje));
  assert.ok(!/api|clave|token|secret/i.test(a.mensaje.replace(/Nombre-\d+/g, ''))); assert.strictEqual(IA.desanonimizar('Revisa Nombre-1', { 'Tomas aereas': 'Nombre-1' }), 'Revisa Tomas aereas'); assert.ok(a.secciones.includes('finanzas'));
});
t('flujos sugeridos tienen forma importable', () => {
  const l = FL.sugeridos('https://x.test/herramientas/trabajos/analisis/?a=1'); assert.strictEqual(l.length, 4);
  l.forEach(f => { const ids = {}; f.flujo.nodos.forEach(n => { assert.ok(!ids[n.id]); ids[n.id] = 1; }); f.flujo.aristas.forEach(a => assert.ok(ids[a.de] && ids[a.a])); assert.ok(f.limite); });
  assert.ok(l[0].flujo.nodos.some(n => n.tipo === 'enlace' && n.cfg.url === 'https://x.test/herramientas/trabajos/analisis/?vista=informes&informe=semanal'));
  const cat = require('../../automatizaciones/js/catalogo.js'); assert.ok(Object.keys(cat.TIPOS).length > 20); l.forEach(f => f.flujo.nodos.forEach(n => assert.ok(cat.TIPOS[n.tipo], 'tipo desconocido ' + n.tipo)));

});
t('integridad detecta esquema, referencias y duplicados', () => {
  const v = I.verificar(datos); const por = (tipo) => v.issues.filter(x => x.tipo === tipo);
  assert.ok(por('duplicado').some(x => x.modulo === 'monetizacion' && x.col === 'clientes'));
  assert.strictEqual(por('referencia').length, 0); assert.strictEqual(por('esquema').length, 0, JSON.stringify(por('esquema')));
  // se danan datos a proposito en una copia
  const e2 = JSON.parse(JSON.stringify(fx.entradas));
  e2.monetizacion.regs.push({ k: 'movimientos/xr', col: 'movimientos', id: 'xr', t: ahora, v: { id: 'xr', tipo: 'ingreso', fecha: '2026-01-01', monto: 5, proyecto: 'fantasma' } });
  e2.monetizacion.regs.push({ k: 'movimientos/xs', col: 'movimientos', id: 'xs', t: ahora, v: { id: 'xs', tipo: 'regalo', fecha: 'ayer', monto: '5' } });
  e2.automatizaciones.regs[0].v.aristas.push({ de: 'n1', sal: 'sal', a: 'nX' });
  e2.automatizaciones.regs.push({ k: 'ejecuciones/eo', col: 'ejecuciones', id: 'eo', t: ahora, v: { id: 'eo', flujo: 'borrado', estado: 'ok' } });
  e2['contenido-ia'].regs.push({ k: 'piezas/pz', col: 'piezas', id: 'pz', t: ahora, v: { id: 'otro', proyecto: 'cp1', estado: 'raro' } });
  e2.qr.regs.push({ k: 'historial/q9', col: 'historial', id: 'q9', t: ahora - 1, v: { id: 'q9', tipo: 'url', texto: 'https://a.com' } });
  e2.drones.regs.push({ k: 'planos/zz', col: 'planos', id: 'zz', t: ahora, v: { id: 'zz', dataUrl: 'x' } });
  e2.drones.regs.push({ k: 'cosas/1', col: 'cosas', id: '1', t: ahora, v: { id: '1' } });
  const d2 = Agg.armar(e2, { ahora }), v2 = I.verificar(d2), has = (m, tipo, txt) => v2.issues.some(x => x.modulo === m && x.tipo === tipo && x.detalle.includes(txt));
  assert.ok(has('monetizacion', 'referencia', 'fantasma')); assert.ok(has('monetizacion', 'esquema', 'Valor «regalo»')); assert.ok(has('monetizacion', 'esquema', 'formato')); assert.ok(has('monetizacion', 'esquema', '«monto» debería ser number'));
  assert.ok(has('automatizaciones', 'referencia', '1 conexión')); assert.ok(has('automatizaciones', 'referencia', 'Ejecución de un flujo')); assert.ok(has('contenido-ia', 'esquema', 'id guardado')); assert.ok(has('contenido-ia', 'esquema', '«raro»'));
  assert.ok(has('qr', 'duplicado', 'Duplicado')); assert.ok(has('drones', 'referencia', 'Plano')); assert.ok(has('drones', 'esquema', 'no reconocida'));
  // limpieza: vista previa -> aplicar -> volver a verificar
  const seguros = v2.issues.filter(x => x.seguro).map(x => x.id), plan = I.plan(d2, v2.issues, seguros, ahora);
  assert.ok(plan.length >= 4); const antes = JSON.stringify(d2.modulos.monetizacion.regs);
  plan.forEach(op => { const nuevo = I.aplicarOps(d2.modulos[op.modulo].regs, op); const m = Agg.armarModulo(Agg.porId(op.modulo), { existe: true, regs: nuevo }); d2.modulos[op.modulo] = m; });
  const v3 = I.verificar(d2); assert.ok(v3.issues.filter(x => x.seguro).length === 0, JSON.stringify(v3.issues.filter(x => x.seguro).map(x => x.detalle))); assert.ok(!v3.issues.some(x => x.modulo === 'monetizacion' && x.detalle.includes('fantasma')));
  assert.ok(JSON.stringify(datos.modulos.monetizacion.regs) === JSON.stringify(Agg.armar(fx.entradas, {}).modulos.monetizacion.regs)); // el plan no muta los datos originales
  assert.ok(antes.length > 0);
});
t('respaldo ZIP/JSON roundtrip y restauracion', () => {
  const resp = R.construir(datos, { ahora }); assert.strictEqual(resp.total, Object.values(datos.modulos).reduce((a, m) => a + m.registros, 0));
  const js = R.aJSON(resp), r1 = R.leer(js); assert.deepStrictEqual(JSON.parse(JSON.stringify(r1.modulos)), JSON.parse(JSON.stringify(resp.modulos)));
});
t('respaldo ZIP', () => {
  const resp = R.construir(datos, { ahora }); const blob = R.aZip(resp);
  return blob.arrayBuffer().then(ab => { const r2 = R.leer(new Uint8Array(ab)); assert.deepStrictEqual(JSON.parse(JSON.stringify(r2.modulos)), JSON.parse(JSON.stringify(resp.modulos))); assert.strictEqual(r2.total, resp.total);
    const mal = new Uint8Array(ab); mal[60] ^= 0xff; assert.throws(() => R.leer(mal), /ZIP|dañado|JSON/);
    const vacio = Agg.armar({}, { ahora }); const prev = R.previsualizar(r2, vacio); assert.ok(prev.every(p => p.nuevos === p.total && p.soloLocal === 0));
    const pl = R.planRestaurar(r2, vacio, 'fusionar'); assert.strictEqual(pl.reduce((a, p) => a + p.poner.length, 0), resp.total);
    // restaurar sobre vacio y comparar contra el original
    const reg2 = {}; pl.forEach(p => { reg2[p.modulo] = { existe: true, regs: p.poner }; }); const d3 = Agg.armar(reg2, { ahora });
    Agg.MODULOS.forEach(m => { assert.strictEqual(d3.modulos[m.id].registros, datos.modulos[m.id].registros, m.id); assert.strictEqual(d3.modulos[m.id].bytes, datos.modulos[m.id].bytes, m.id); });
    // fusion: lo local mas reciente se conserva; reemplazar borra lo que no esta en el respaldo
    const loc = JSON.parse(JSON.stringify(fx.entradas)); loc.qr.regs[0].t += 5000; loc.qr.regs.push({ k: 'historial/solo', col: 'historial', id: 'solo', t: 1, v: { id: 'solo', tipo: 'texto', texto: 'x' } });
    const dl = Agg.armar(loc, { ahora }), pf = R.planRestaurar(r2, dl, 'fusionar', ['qr'])[0], pr = R.planRestaurar(r2, dl, 'reemplazar', ['qr'])[0];
    assert.ok(!pf.poner.some(r => r.k === 'historial/q1')); assert.strictEqual(pf.borrar.length, 0); assert.deepStrictEqual(pr.borrar, ['historial/solo']); assert.ok(pr.poner.some(r => r.k === 'historial/q1'));
    assert.throws(() => R.leer('{"hola":1}'), /no es un respaldo/); assert.throws(() => R.leer('no json'), /ni ZIP/);
    console.log('pruebas OK:', ok + 1);
  });
});
t('claves nunca entran al respaldo', () => {
  const e = JSON.parse(JSON.stringify(fx.entradas)); e.qr.regs[0].v.clave = 'sk-secreto'; e.qr.regs[0].v.apiKey = 'zzz'; const resp = R.construir(Agg.armar(e, { ahora }), { ahora });
  assert.ok(!R.aJSON(resp).includes('sk-secreto') && !R.aJSON(resp).includes('zzz'));
});
t('tolerancia: modulos vacios o con otro esquema', () => {
  const d = Agg.armar({}, { ahora }); const a = C.analizar(d, { ahora }); Object.keys(a.dom).forEach(k => assert.strictEqual(a.dom[k].sinDatos, true, k)); assert.strictEqual(a.rent.sinDatos, true); assert.strictEqual(a.recomendaciones.length, 0);
  assert.ok(a.resumen.every(r => r.sinDatos)); assert.doesNotThrow(() => Inf.aCSV(a, Inf.modelo(a, d, 'mensual'))); assert.doesNotThrow(() => JSON.parse(Inf.aJSON(a, null)));
  const raro = { drones: { existe: true, regs: [{ k: 'proyectos/x', col: 'proyectos', id: 'x', t: 1, v: { id: 'x', nombre: 5, mision: 'texto' } }, { k: 'bitacora/y', col: 'bitacora', id: 'y', t: 2, v: { id: 'y', minutos: 'abc', fecha: null } }] },
    monetizacion: { existe: true, regs: [{ k: 'movimientos/m', col: 'movimientos', id: 'm', t: 1, v: { id: 'm', monto: 'x', fecha: 7, tipo: 3 } }, { k: 'facturas/f', col: 'facturas', id: 'f', t: 1, v: { id: 'f', tipo: 'factura', lineas: 'no' } }] },
    'contenido-ia': { existe: true, regs: [{ k: 'piezas/p', col: 'piezas', id: 'p', t: 1, v: { id: 'p', estado: 7, fecha: 99 } }] }, 'video-ia': { existe: true, regs: [{ k: 'proyectos/v', col: 'proyectos', id: 'v', t: 1, v: { id: 'v', cfg: 'x' } }] } };
  const dr = Agg.armar(raro, { ahora }); let ar; assert.doesNotThrow(() => { ar = C.analizar(dr, { ahora }); }); assert.doesNotThrow(() => I.verificar(dr)); assert.doesNotThrow(() => Inf.modelo(ar, dr, 'semanal'));
  assert.ok(I.verificar(dr).issues.length > 3);
});
