/* Pruebas de la logica pura: node pruebas/cia.test.js */
'use strict';
const assert = require('assert'), path = require('path');
const J = p => require(path.join(__dirname, '../js', p));
const E = J('editorial.js'), S = J('similitud.js'), Me = J('metricas.js'), Ma = J('marca.js'), Mi = J('miniaturas.js'), Fl = J('flujos.js'), Pl = J('plantillas.js'), Pr = J('prompts.js');
const A = p => require(path.join(__dirname, '../../automatizaciones/js', p));
const Auto = A('motor.js'), Cat = A('catalogo.js'), CSV = require(path.join(__dirname, '../../../contenido/calendario/js/csv.js')), VIA = require(path.join(__dirname, '../../video-ia/js/ia.js'));
const T = []; const t = (n, f) => T.push([n, f]);
const cerca = (a, b, e) => assert(Math.abs(a - b) <= (e || 1e-6), a + ' != ' + b);

t('fechas y huecos', () => {
  assert.strictEqual(E.sumarDias('2026-02-27', 2), '2026-03-01'); assert.strictEqual(E.diaSemana('2026-11-09'), 1); assert.strictEqual(E.dias('2026-01-01', '2026-12-31'), 364);
  const h = E.huecos({ youtube: { dias: [2, 4], hora: '18:00' } }, '2026-11-09', '2026-11-22');
  assert.deepStrictEqual(h.map(x => x.fecha), ['2026-11-10', '2026-11-12', '2026-11-17', '2026-11-19']);
  assert.throws(() => E.sumarDias('mal', 1));
});
t('planificador: asigna por canal, respeta ocupados y avanzadas primero', () => {
  const piezas = [{ id: 'a', canal: 'youtube', estado: 'idea', _creado: 1 }, { id: 'b', canal: 'youtube', estado: 'listo', _creado: 2 }, { id: 'c', canal: 'tiktok', estado: 'guion' }, { id: 'd', canal: 'youtube', estado: 'idea', fecha: '2026-11-10', hora: '18:00' }, { id: 'x', canal: 'x', estado: 'idea' }];
  const r = E.planificar({ piezas, desde: '2026-11-09', semanas: 1, cadencia: { youtube: { dias: [2, 4], hora: '18:00' }, tiktok: { dias: [1], hora: '19:00' } } });
  const m = Object.fromEntries(r.asignaciones.map(a => [a.id, a]));
  assert.strictEqual(m.b.fecha, '2026-11-12'); assert.strictEqual(m.c.fecha, '2026-11-09'); assert(!m.a); assert.deepStrictEqual(r.sinHueco.sort(), ['a', 'x']);
});
t('balance de pilares', () => {
  const b = E.balancePilares([{ pilar: 'A' }, { pilar: 'A' }, { pilar: 'A' }, { pilar: 'B' }], [{ nombre: 'A', peso: 50 }, { nombre: 'B', peso: 50 }]);
  assert.strictEqual(b[0].real, 75); assert(b[0].alerta && b[1].alerta);
});
t('cola y recordatorios', () => {
  const ahora = new Date(2026, 10, 12, 17, 40).getTime();
  const p = [{ id: 1, fecha: '2026-11-12', hora: '18:00', estado: 'programado', recordar: 30 }, { id: 2, fecha: '2026-11-13', hora: '09:00', estado: 'listo', recordar: 30 }, { id: 3, fecha: '2026-11-12', hora: '08:00', estado: 'programado' }, { id: 4, estado: 'idea', fecha: '2026-11-12' }, { id: 5, fecha: '2026-11-12', hora: '18:00', estado: 'programado', recordar: 30, recordado: true }];
  const c = E.cola(p, ahora); assert.deepStrictEqual(c.map(x => x.pieza.id), [3, 1, 5, 2]); assert(c[0].vencida && !c[1].vencida);
  assert.deepStrictEqual(E.recordatoriosDebidos(p, ahora).map(x => x.id), [1]);
});
t('exportacion CSV valida para el Calendario', () => {
  const filas = E.filasCalendario([{ titulo: 'Hola, "mundo"', canal: 'podcast', formato: 'podcast', estado: 'produccion', fecha: '2026-11-12', hora: '18:00', pilar: 'P', metricas: { vistas: 10 } }, { titulo: 'Corto', canal: 'tiktok', formato: 'corto', estado: 'idea' }], {});
  const r = CSV.importar(CSV.generar(filas)); assert.deepStrictEqual(r.errores, []); assert.strictEqual(r.pubs.length, 2); assert.strictEqual(r.pubs[0].estado, 'grabacion'); assert.strictEqual(r.pubs[0].red, 'youtube'); assert.strictEqual(r.pubs[0].metricas.vistas, 10); assert(/Canal original: podcast/.test(r.pubs[0].tema));
});
t('similitud: identicos, distintos, parafrasis y tramo comun', () => {
  const a = 'Aprende a editar video en tu telefono con tres trucos sencillos que ahorran horas cada semana';
  cerca(S.similitud(a, a), 1); assert(S.similitud(a, 'La receta de arroz con pollo lleva ajo cebolla y mucho cariño en la cocina') < 0.05);
  assert(S.similitud(a, a + ' y ademas mas cosas') > 0.6); const tr = S.tramoComun('uno dos tres cuatro cinco seis', 'cero dos tres cuatro cinco siete'); assert.strictEqual(tr.palabras, 4);
  assert.deepStrictEqual(S.parejas([{ id: 1, texto: a }, { id: 2, texto: a }, { id: 3, texto: 'otra cosa totalmente distinta aqui' }]).map(p => [p.a, p.b]), [[1, 2]]);
  assert.strictEqual(S.contraFuente(a, a).riesgo, 'alto'); assert.strictEqual(S.contraFuente(a, 'nada que ver con esto aqui').riesgo, 'bajo');
  assert.strictEqual(S.repetidas('uno dos tres cuatro uno dos tres cuatro')[0].veces, 2); assert(S.diversidad('a b c d') === 1);
});
t('banderas de riesgo', () => {
  const ids = x => S.banderas(x).map(b => b.id);
  assert(ids('Hazte rico con este método, rentabilidad garantizada').includes('financiero')); assert(ids('Este suplemento cura el cancer sin efectos secundarios').includes('medico'));
  assert(ids('Letra completa de la canción y película completa').includes('copyright')); assert(ids('Mira este deepfake').includes('suplantacion')); assert(ids('Estudios demuestran que funciona').includes('fuente'));
  assert.deepStrictEqual(ids('Receta de pan casero con harina y agua'), []);
  const ev = S.evaluarPieza({ titulo: 'Entrevista', divulgacion: { ia: true, voz: true, etiquetada: false } }); assert(ev.some(x => x.id === 'divulgacion'));
  assert(!S.evaluarPieza({ titulo: 'Ok', divulgacion: { ia: true, voz: true, etiquetada: true } }).some(x => x.id === 'divulgacion'));
});
t('metricas: regresion, crecimiento, A/B de referencia', () => {
  const r = Me.regresion([[0, 1], [1, 3], [2, 5], [3, 7]]); cerca(r.pendiente, 2); cerca(r.interseccion, 1); cerca(r.r2, 1);
  const c = Me.crecimiento([{ fecha: '2026-01-01', valor: 100 }, { fecha: '2026-01-11', valor: 200 }], 30); assert.strictEqual(c.delta, 100); assert.strictEqual(c.pct, 100); assert.strictEqual(c.porDia, 10); assert.strictEqual(c.proyeccion, 500);
  assert.strictEqual(Me.crecimiento([{ fecha: '2026-01-01', valor: 1 }]).ok, false);
  const ab = Me.ab([{ nombre: 'A', impresiones: 1000, clics: 100 }, { nombre: 'B', impresiones: 1000, clics: 130 }]);
  assert.strictEqual(ab.ganador, 'B'); cerca(ab.z, 2.103, 0.002); cerca(ab.p, 0.0355, 0.001); assert(ab.significativo); cerca(ab.mejoraRelativa, 30);
  assert(!Me.ab([{ nombre: 'A', impresiones: 100, clics: 10 }, { nombre: 'B', impresiones: 100, clics: 11 }]).significativo);
  cerca(Me.cdfNormal(1.96), 0.975, 0.0005); const w = Me.wilson(50, 100); assert(w[0] < 0.5 && w[1] > 0.5); assert.strictEqual(Me.muestraNecesaria(0.05, 0.2) > 3000, true);
  assert.strictEqual(Me.rpm(5, 1000), 5); assert.strictEqual(Me.engagement({ vistas: 1000, likes: 50, comentarios: 10, compartidos: 5 }), 6.5);
  const regs = [{ canal: 'a', fecha: '2026-01-01', seguidores: 10 }, { canal: 'b', fecha: '2026-01-01', seguidores: 5 }, { canal: 'a', fecha: '2026-01-08', seguidores: 20 }];
  assert.deepStrictEqual(Me.serieSeguidores(regs).map(x => x.valor), [15, 25]); assert.deepStrictEqual(Me.serieSeguidores(regs, 'a').map(x => x.valor), [10, 20]);
  const es = Me.escala(0, 97); assert(es.max >= 97 && es.marcas.length >= 3);
  assert.strictEqual(Me.resumenPorCanal([{ canal: 'a', fecha: '2026-01-01', vistas: 1000, ingresos: 5, seguidores: 3 }, { canal: 'a', fecha: '2026-01-02', vistas: 1000, ingresos: 5, seguidores: 9 }])[0].seguidores, 9);
});
t('marca: color, paleta, nombres, SVG', () => {
  assert.strictEqual(Ma.contraste('#000000', '#ffffff'), 21); assert.strictEqual(Ma.textoSobre('#ffff00'), '#111111'); assert.strictEqual(Ma.textoSobre('#102030'), '#ffffff');
  assert.deepStrictEqual(Ma.hexAHsl('#ff0000'), [0, 100, 50]); assert.strictEqual(Ma.hex(120, 100, 50), '#00ff00');
  ['analogo', 'complementario', 'triada', 'mono'].forEach(e => { const p = Ma.paleta('#3e63dd', e); assert(p.contrasteTexto >= 7, e); assert(p.contrastePrimario >= 4.5, e); assert(/^#[0-9a-f]{6}$/.test(p.acento)); });
  const n1 = Ma.nombres(['cocina', 'rapida'], 'compuesto', 5, 's'), n2 = Ma.nombres(['cocina', 'rapida'], 'compuesto', 5, 's'); assert.deepStrictEqual(n1, n2); assert(n1.length >= 3 && n1[0].handle.startsWith('@'));
  const marca = { nombre: 'Faro Lab <x>', lema: 'Claro & directo', forma: 'hexagono', tipografia: 'moderna', paleta: Ma.paleta('#e8590c', 'analogo') };
  const sv = Ma.avatarSVG(marca, 200), bn = Ma.bannerSVG(marca); assert(sv.startsWith('<svg') && sv.endsWith('</svg>') && !sv.includes('<x>') && sv.includes('FL')); assert(bn.includes('&amp;'));
  assert((sv.match(/<(\w+)/g) || []).length > 5); assert(Ma.manualHTML(marca, { personaje: 'Zoe' }, {}).includes('Zoe'));
});
t('miniaturas: ajustar y dibujar con contexto falso', () => {
  const med = s => s.length * 10; assert.deepStrictEqual(Mi.partirLineas(med, 'uno dos tres cuatro', 80), ['uno dos', 'tres', 'cuatro']); assert.strictEqual(Mi.partirLineas(med, 'a b c d e f g h', 30, 2).length, 2);
  const llam = []; const ctx = new Proxy({ measureText: s => ({ width: s.length * 0.5 * parseInt((ctx.font.match(/(\d+)px/) || [0, 20])[1]) }), createLinearGradient: () => ({ addColorStop() {} }), font: '10px x' }, { get: (o, k) => k in o ? o[k] : (...a) => { llam.push(k); }, set: (o, k, v) => { o[k] = v; return true; } });
  const marca = { nombre: 'X', paleta: Ma.paleta('#3e63dd', 'analogo') };
  Mi.PLANTILLAS.forEach(([id]) => { llam.length = 0; Mi.dibujar(ctx, 1280, 720, { plantilla: id, titulo: 'Cómo editar video con IA sin gastar', subtitulo: 'Guía', marca, valor: '7', izq: 'Antes', der: 'Después' }); assert(llam.includes('fillText'), id); });
  const r = Mi.ajustar(ctx, 'TEXTO MUY LARGO PARA PROBAR EL AJUSTE AUTOMATICO DEL TAMAÑO', px => '800 ' + px + 'px x', { w: 400, h: 200 }, 3, 20, 100); assert(r.px >= 20 && r.px <= 100);
});
t('diff, competencia y consistencia', () => {
  assert.deepStrictEqual(S.diff('a\nb\nc', 'a\nc\nd').map(x => x.t + x.l), ['=a', '-b', '=c', '+d']); assert(S.diff('x', 'x').every(d => d.t === '='));
  const c = Me.competencia([{ nombre: 'A', seguidores: '1000', vistas: '500', frecuencia: '3' }, { nombre: 'B', seguidores: '5000', vistas: '1000', frecuencia: '5' }, { nombre: 'C', seguidores: '200', vistas: '300', frecuencia: '1' }], { seguidores: 600 });
  assert.strictEqual(c.mejorAlcance, 'C'); assert.strictEqual(c.masGrande, 'B'); assert.strictEqual(c.medianaSeguidores, 1000); assert.strictEqual(c.tuPosicion, 3); assert.strictEqual(Me.competencia([]).ok, false); assert.strictEqual(Me.mediana([1, 2, 3, 4]), 2.5);
  const k = Ma.consistencia('Esto es CLICKBAIT puro, amigos', { vetos: 'clickbait, spam', vocabulario: 'amigos, comunidad' }); assert.deepStrictEqual(k.vetos, ['clickbait']); assert.deepStrictEqual(k.vocabularioFalta, ['comunidad']); assert.strictEqual(k.puntaje, 70);
});
t('plantillas, reutilizacion y prompts externos', () => {
  Object.keys(Pl.FORMATOS).forEach(f => assert(Pl.esqueleto(f, 'tema').includes('## ')));
  assert.strictEqual(Pl.reutilizar({ id: 'p', titulo: 'Video' }).length, 10); assert(Pl.reutilizar({ titulo: 'V' }, ['x']).every(d => d.canal === 'x'));
  assert(Pl.promptExterno('imagen', 'una cocina', { personaje: 'Chef Zoe' }).includes('Chef Zoe')); assert(/No imitar la voz/.test(Pl.promptExterno('voz', 'hola', {}))); assert.throws(() => Pl.promptExterno('x', 'a', {}));
  assert.deepStrictEqual(Pl.escenas(Pl.esqueleto('corto', 'T').replace('// Primeros', 'Primeros')).map(e => e.titulo).slice(0, 1), ['GANCHO']);
  assert.strictEqual(Pl.limites('x', { titulo: 'a'.repeat(300) }).length, 1); assert.strictEqual(Pl.rellenar('Hola {nombre} {z}', { nombre: 'Ana' }), 'Hola Ana {z}'); assert(Pl.checklist('youtube').some(c => /sint/.test(c)));
  assert.deepStrictEqual(Pl.hashtags(['Cocina rápida, y fácil'], 3), ['#cocina', '#rapida', '#facil']); assert(Pl.divulgacionTexto({ voz: true, herramientas: 'X' }).includes('voz'));
});
t('prompts: construccion y parseo tolerante', () => {
  assert(Pr.sistema({ nicho: { tema: 'cocina' }, biblia: { vetos: 'sin clickbait' } }).includes('sin clickbait'));
  const j = VIA.extraerJSON('Claro:\n```json\n{"pilares":[{"nombre":"A","peso":"40"},{"nombre":""},{"nombre":"B","peso":900}]}\n```'); const p = Pr.parsear.pilares(j); assert.deepStrictEqual(p.map(x => x.peso), [40, 100]);
  assert.strictEqual(Pr.parsear.ideas({ ideas: [{ titulo: 'X', formato: 'rarisimo' }] })[0].formato, 'corto'); assert.deepStrictEqual(Pr.parsear.descripcion({ descripcion: 'd', hashtags: ['a', '#b'] }).hashtags, ['#a', '#b']); assert.deepStrictEqual(Pr.parsear.nichos(null), []);
  ['nicho', 'personas', 'pilares', 'competencia', 'ideas', 'guion', 'hooks', 'titulos', 'miniatura', 'descripcion', 'promptsExternos', 'reutilizar', 'respuesta', 'mejorar'].forEach(k => { const a = k === 'nicho' ? [{}] : k === 'personas' ? [{}] : k === 'pilares' ? [{}, []] : k === 'competencia' ? [{}, 'x'] : k === 'ideas' ? [{}, 'p', 3, []] : k === 'guion' ? [{ formato: 'corto', titulo: 't' }, 'e'] : k === 'promptsExternos' ? [{}, [{ titulo: 'a', texto: 'b' }], {}] : k === 'respuesta' ? ['hola'] : k === 'mejorar' ? ['x'] : k === 'descripcion' ? [{}, 'x'] : k === 'titulos' ? [{}, 'x'] : [{}]; assert(Pr[k].apply(null, a).texto.length > 20, k); });
  const q = VIA.construirPeticion({ proveedor: 'anthropic', base: 'https://api.anthropic.com', modelo: 'm' }, 'K', { texto: 'hola', sistema: 'S' }); assert(q.url.endsWith('/v1/messages'));
});
t('flujos de Automatizaciones: validos, normalizables y ejecutables', async () => {
  const cad = { dias: [2, 4], hora: '00:10' }, fl = Fl.todos({ canales: [{ id: 'youtube', nombre: 'YouTube', cadencia: cad, checklist: Pl.checklist('youtube') }], piezas: [{ titulo: 'V', canal: 'youtube', fecha: '2026-11-12', hora: '18:00', estado: 'programado' }], antes: 30 });
  fl.push(Fl.recordatorioPieza({ titulo: 'Pieza', canal: 'youtube', fecha: '2026-11-12', hora: '18:00' }, 30, 'YouTube'), Fl.ideasSemanales('cocina'));
  assert.strictEqual(fl[0].nodos[0].cfg.hora, '23:40'); assert.strictEqual(fl[0].nodos[0].cfg.dias, '1,3');
  global.window = { Tr: { uid: () => 'id1' }, Almacen: { crear: () => ({}) }, AutoCatalogo: Cat }; delete require.cache[require.resolve('../../automatizaciones/js/datos.js')]; require('../../automatizaciones/js/datos.js'); const D = global.window.AutoDatos;
  for (const f of fl) {
    assert.deepStrictEqual(Fl.validar(f, Cat), [], f.nombre); const n = D.normalizar(f); assert.strictEqual(n.nodos.length, f.nodos.length); assert.strictEqual(n.aristas.length, f.aristas.length);
    const r = await Auto.ejecutar(n, { catalogo: Cat, simulacion: true, esperar: async () => {}, acciones: {} }); assert.notStrictEqual(r.estado, 'error', f.nombre + ': ' + r.error);
  }
  const hoy = new Date(); const p2 = n => ('0' + n).slice(-2), f0 = hoy.getFullYear() + '-' + p2(hoy.getMonth() + 1) + '-' + p2(hoy.getDate());
  const r = await Auto.ejecutar(D.normalizar(Fl.resumenDiario([{ titulo: 'A', canal: 'x', fecha: f0, hora: '10:00', estado: 'programado' }, { titulo: 'B', canal: 'x', fecha: '2020-01-01', hora: '10:00' }], '08:00')), { catalogo: Cat, simulacion: true }); assert(r.pasos.some(p => p.tipo === 'notificacion'), 'rama si del resumen diario');
  assert(Fl.validar({ nodos: [{ id: 'n1', tipo: 'noexiste' }] }, Cat).length > 0);
});
(async () => { let ok = 0; for (const [n, f] of T) { try { await f(); ok++; console.log('ok  ' + n); } catch (e) { console.log('FALLA ' + n + '\n  ' + (e.stack || e).split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } } console.log(ok + '/' + T.length); })();
