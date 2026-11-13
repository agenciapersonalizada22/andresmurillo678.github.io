// Pantallas de la aplicacion.
import { h } from './dom.js';
import { AREAS, JUEGOS, juegoPorId, areaPorId, juegosDeArea, AVISO } from './datos.js';
import * as Progreso from './progreso.js';
import { LOGROS, TIENDA } from './progreso.js';
import { registrar, titulo, ir, atras, modal, confirmar, toast, pantallaP } from './ui.js';
import * as Flujos from './flujos.js';
import { dibujar, resumen } from './grafica.js';
import { percentil } from './logica/puntaje.js';
import { panelRanking, panelCuenta, usuario } from './cuenta-mente.js';
import { abrirAjustes } from './panel-ajustes.js';
import { Sonido } from './sonido.js';
import { hoy } from './almacen.js';

const COLORES_AREA = ['--a0', '--a1', '--a2', '--a3', '--a4'];
const ETQ_MEDALLA = { oro: '★★★ Oro', plata: '★★ Plata', bronce: '★ Bronce' };
const medalla = (m) => (m ? h('span', { cls: 'medalla m-' + m, txt: ETQ_MEDALLA[m] }) : h('span', { cls: 'medalla vacia', txt: 'Sin medalla' }));
const pctTxt = (p, que = 'partidas') => (p.calibrando ? `Calibrando: con ${p.n} de 5 ${que} aún no hay historial suficiente para comparar.` : `Mejor que el ${p.pct} % de tus ${que} anteriores (percentil personal ${p.pct}).`);
const btn = (txt, on, cls = 'btn', extra = {}) => h('button', { type: 'button', cls, 'data-f': 1, txt, on: { click: on }, ...extra });
const seccion = (tit, hijos, cls = '') => h('section', { cls: 'seccion ' + cls }, [tit ? h('h3', { txt: tit }) : null, ...hijos]);
const nombreArea = (id) => areaPorId(id).nombre;
const colorArea = (id) => 'var(' + COLORES_AREA[AREAS.findIndex((a) => a.id === id)] + ')';
const cssVar = (v) => getComputedStyle(document.body).getPropertyValue(v).trim() || '#88aaff';

/* ---------- inicio ---------- */
registrar('inicio', (c) => {
  const S = Progreso.obtener(), racha = Progreso.rachaInfo(), pend = Progreso.evaluacionPendiente(), pg = Flujos.partidaGuardada();
  c.appendChild(h('div', { cls: 'aviso-visible', role: 'note' }, [h('b', { txt: 'Entretenimiento y práctica. ' }), 'No afirma mejorar la inteligencia ni sustituye una evaluación médica. ', btn('Más información', () => abrirAyuda(), 'enlace')]));
  if (pg) {
    c.appendChild(h('div', { cls: 'tarjeta-gran continuar' }, [h('div', {}, [h('b', { txt: 'Tienes una partida en curso' }), h('p', { cls: 'nota', txt: `${Flujos.NOMBRE_MODO[pg.modo]} · juego ${pg.i + 1} de ${pg.cola.length}` })]),
      btn('Continuar', () => Flujos.reanudar(), 'btn grande'), btn('Descartar', async () => { if (await confirmar('¿Descartar la partida en curso?', { si: 'Descartar' })) { Flujos.descartarPartida(); ir('inicio', {}, { reemplazar: true }); } }, 'btn sec peq')]));
  }
  const sd = Flujos.sesionDelDia();
  const explic = sd.razones.map((r) => `${nombreArea(r.area)}: debilidad ${r.debil} %, frescura ${r.fresco} % → ${r.cupos} juego${r.cupos > 1 ? 's' : ''}.`);
  c.appendChild(h('div', { cls: 'tarjeta-gran diaria' }, [
    h('div', { cls: 'fila-sp' }, [h('h2', { txt: 'Sesión diaria' }), h('span', { cls: 'racha', title: 'Racha diaria', txt: `Racha ${racha.actual}` }, [])]),
    h('p', { cls: 'nota', txt: racha.hoy ? 'Hoy ya la completaste. Puedes repetirla para practicar más.' : `Racha: ${racha.actual} día${racha.actual === 1 ? '' : 's'} (mejor: ${racha.mejor}). 5 juegos, unos 6 minutos.` }),
    h('ol', { cls: 'cola' }, sd.juegos.map((id, i) => h('li', {}, [h('span', { cls: 'pastilla', style: `--ca:${colorArea(sd.areas[i])}`, txt: AREAS.find((a) => a.id === sd.areas[i]).marca + ' ' + nombreArea(sd.areas[i]) }), ' ' + juegoPorId(id).nombre]))),
    btn(racha.hoy ? 'Repetir sesión diaria' : 'Empezar sesión diaria', () => Flujos.iniciar('diaria'), 'btn grande', { id: 'bDiaria' }),
    h('details', { cls: 'detalles' }, [h('summary', { 'data-f': 1, txt: '¿Cómo se eligen estos 5 juegos?' }), h('p', { txt: 'Se calcula la debilidad de cada área (cuánto está tu índice por debajo de tu propia media; un área sin datos cuenta como la más débil) y su frescura (días sin entrenar, 7 o más = máxima). Peso = 0,65×debilidad + 0,35×frescura. Los 5 cupos se reparten por el método D’Hondt (peso ÷ cupos ya asignados, máximo 2 por área), así las áreas débiles reciben más juegos pero casi siempre entrenas 4 o 5 áreas. Dentro de cada área se eligen los juegos que llevas más tiempo sin jugar.' }), h('ul', {}, explic.map((t) => h('li', { txt: t })))])]));
  if (pend) c.appendChild(h('div', { cls: 'tarjeta-gran eval' }, [h('div', {}, [h('b', { txt: pend === 'inicial' ? 'Evaluación inicial · 10 minutos' : 'Reevaluación mensual · 10 minutos' }), h('p', { cls: 'nota', txt: pend === 'inicial' ? '10 juegos (2 por área) con dificultad fija de partida: sirve de punto de comparación contigo mismo.' : 'Ya pasó un mes: repite los mismos 10 juegos para comparar con tu evaluación anterior.' })]), btn(pend === 'inicial' ? 'Empezar evaluación' : 'Empezar reevaluación', () => Flujos.iniciar('evaluacion'), 'btn', { id: 'bEval' })]));
  else c.appendChild(h('p', { cls: 'nota centro', txt: `Próxima reevaluación en ${Progreso.diasParaReeval()} día(s).` }));
  const modos = [
    ['Entrenar un juego', 'Elige entre 24 juegos', () => ir('juegos')], ['Entrenar un área', '3 juegos de un área', () => ir('areas')],
    ['Reto rápido 60 s', 'Un juego al azar, más difícil', () => Flujos.iniciar('reto'), 'bReto'], ['Duelo por turnos', 'Contra un amigo, mismo dispositivo', () => ir('duelo')],
    ['Mi progreso', 'Gráficas y percentiles', () => ir('progreso')], ['Logros y tienda', 'Medallas, monedas y desbloqueables', () => ir('logros')], ['Ranking', 'Global y amigos', () => ir('ranking')]
  ];
  c.appendChild(h('div', { cls: 'modos' }, modos.map(([t, s, f, id]) => h('button', { type: 'button', cls: 'tarjeta', 'data-f': 1, id: id || null, on: { click: f } }, [h('b', { txt: t }), h('small', { txt: s })]))));
  c.appendChild(h('p', { cls: 'nota centro', txt: `${S.partidas} juegos jugados · ${S.puntos} puntos · ${S.monedas} monedas virtuales` }));
});
titulo('inicio', 'Gimnasio Mental');

/* ---------- areas y juegos ---------- */
registrar('areas', (c) => {
  const idx = Progreso.indices();
  AREAS.forEach((a) => c.appendChild(h('button', { type: 'button', cls: 'tarjeta fila-area', 'data-f': 1, style: `--ca:${colorArea(a.id)}`, on: { click: () => ir('area', { id: a.id }) } }, [h('b', { txt: a.icono + ' ' + a.nombre }), h('small', { txt: a.desc }), h('span', { cls: 'idx', txt: idx[a.id] == null ? 'Sin índice aún' : 'Índice ' + idx[a.id] })])));
});
titulo('areas', 'Entrenar un área');
registrar('area', (c, p) => {
  const a = areaPorId(p.id); titulo('area', a.nombre);
  c.appendChild(h('p', { txt: a.desc }));
  c.appendChild(btn(`Entrenar ${a.nombre} (3 juegos)`, () => Flujos.iniciar('area', { area: a.id }), 'btn grande'));
  c.appendChild(listaJuegos(juegosDeArea(a.id)));
});
function listaJuegos(js) {
  return h('div', { cls: 'lista-juegos' }, js.map((j) => {
    const r = Progreso.ratingJuego(j.id), S = Progreso.obtener().juegos[j.id];
    return h('button', { type: 'button', cls: 'tarjeta fila-juego', 'data-f': 1, 'data-juego': j.id, style: `--ca:${colorArea(j.area)}`, on: { click: () => ir('juego', { id: j.id }) } }, [h('span', { cls: 'ico', 'aria-hidden': 'true', txt: j.icono }), h('div', {}, [h('b', { txt: j.nombre }), h('small', { txt: j.desc })]), h('span', { cls: 'der' }, [medalla(Progreso.medallaJuego(j.id)), h('small', { txt: S && S.n ? `Nivel ${r.toFixed(1)}` : 'Nuevo' })])]);
  }));
}
registrar('juegos', (c) => { AREAS.forEach((a) => { c.appendChild(h('h3', { cls: 'sep', txt: a.icono + ' ' + a.nombre })); c.appendChild(listaJuegos(juegosDeArea(a.id))); }); });
titulo('juegos', 'Entrenar un juego');

registrar('juego', (c, p) => {
  const j = juegoPorId(p.id), S = Progreso.obtener().juegos[p.id] || { n: 0, mejor: 0, hist: [], tut: 0 }; titulo('juego', j.nombre);
  c.appendChild(h('p', { txt: j.desc }));
  c.appendChild(h('p', { cls: 'nota' }, [h('span', { cls: 'pastilla', style: `--ca:${colorArea(j.area)}`, txt: nombreArea(j.area) }), ' ', medalla(Progreso.medallaJuego(j.id))]));
  c.appendChild(btn('Jugar (60 s)', () => Flujos.iniciar('juego', { juego: j.id }), 'btn grande', { id: 'bJugar' }));
  const ph = percentil(S.hist.length ? S.hist[S.hist.length - 1].p : 0, S.hist.slice(0, -1).map((x) => x.p));
  c.appendChild(seccion('Tus números', [h('div', { cls: 'stats' }, [stat('Partidas', S.n), stat('Mejor puntaje', S.mejor), stat('Nivel estimado', S.n ? Progreso.ratingJuego(j.id).toFixed(1) : '—'), stat('Mejor nivel', S.n ? (S.mejorEst || 0).toFixed(1) : '—')]), h('p', { cls: 'nota', txt: S.hist.length ? 'Última partida: ' + pctTxt(ph) : 'Aún no has jugado este juego.' })]));
  c.appendChild(seccion('Tutorial interactivo (3 niveles)', [h('div', { cls: 'fila-btn' }, [1, 2, 3].map((n) => btn(`${S.tut >= n ? '✓ ' : ''}Nivel ${n}`, () => Flujos.tutorial(j.id, n), S.tut >= n ? 'btn sec peq' : 'btn peq'))), h('p', { cls: 'nota', txt: ['1: guiado con pistas · 2: práctica sin ayuda · 3: prueba final (3 aciertos)'] })]));
  const cv = h('canvas', { cls: 'grafica', role: 'img' });
  c.appendChild(seccion('Progreso en este juego', [cv, h('div', { cls: 'leyenda' }, [h('span', { txt: '○ Nivel estimado por partida (1 a 20)' })])]));
  requestAnimationFrame(() => {
    const series = [{ nombre: 'Nivel estimado', color: colorArea(j.area).replace(/var\((.*)\)/, (m, v) => cssVar(v)), marca: '○', puntos: S.hist.map((x) => ({ v: x.nv })) }];
    dibujar(cv, series, { max: 20, xIzq: 'Primera', xDer: 'Última' }); cv.setAttribute('aria-label', 'Gráfica. ' + resumen(series));
  });
});
const stat = (t, v) => h('div', { cls: 'stat' }, [h('b', { txt: String(v) }), h('small', { txt: t })]);

/* ---------- progreso ---------- */
registrar('progreso', (c, p) => {
  const S = Progreso.obtener(), idx = Progreso.indices(), sel = p.sel || 'todas';
  const med = Progreso.conteoMedallas();
  c.appendChild(h('div', { cls: 'stats' }, [stat('Juegos jugados', S.partidas), stat('Puntos', S.puntos), stat('Minutos', Math.round(S.segundos / 60)), stat('Medallas', med.oro + med.plata + med.bronce)]));
  c.appendChild(h('p', { cls: 'nota', txt: 'El índice de cada área (0 a 1000) es el nivel estimado medio de sus juegos × 50. El percentil compara tu último índice con tu propio historial; no hay comparación con otras personas.' }));
  AREAS.forEach((a, i) => {
    const hist = Progreso.historialArea(a.id), ult = hist.length ? hist[hist.length - 1].v : null, pc = percentil(ult || 0, hist.slice(0, -1).map((x) => x.v));
    c.appendChild(h('div', { cls: 'tarjeta fila-area estatica', style: `--ca:${colorArea(a.id)}` }, [h('b', { txt: a.marca + ' ' + a.nombre }), h('span', { cls: 'idx', txt: idx[a.id] == null ? 'Sin índice' : 'Índice ' + idx[a.id] }), h('small', { txt: idx[a.id] == null ? 'Juega al menos un juego de esta área.' : pctTxt(pc, 'registros') })]));
  });
  const opts = [['todas', 'Todas las áreas'], ...AREAS.map((a) => [a.id, a.nombre])];
  c.appendChild(h('div', { cls: 'chips', role: 'group', 'aria-label': 'Gráfica' }, opts.map(([v, n]) => h('button', { type: 'button', cls: 'chip', 'data-f': 1, txt: n, 'aria-pressed': String(sel === v), on: { click: () => ir('progreso', { sel: v }, { reemplazar: true }) } }))));
  const cv = h('canvas', { cls: 'grafica', role: 'img' }), ley = h('div', { cls: 'leyenda' });
  c.appendChild(cv); c.appendChild(ley);
  let series;
  if (sel === 'todas') series = AREAS.map((a, i) => ({ nombre: a.nombre, color: cssVar(COLORES_AREA[i]), marca: a.marca, puntos: Progreso.historialArea(a.id).map((x) => ({ v: x.v })) }));
  else series = juegosDeArea(sel).map((j, i) => ({ nombre: j.nombre, color: cssVar(COLORES_AREA[(i + AREAS.findIndex((a) => a.id === sel)) % 5]), marca: ['○', '□', '△', '◇', '✕', '○'][i], puntos: Progreso.historialJuego(j.id).map((x) => ({ v: x.nv })) }));
  series.forEach((s) => ley.appendChild(h('span', { cls: 'ley', style: `--c:${s.color}`, txt: s.marca + ' ' + s.nombre })));
  requestAnimationFrame(() => { dibujar(cv, series, sel === 'todas' ? { xIzq: 'Inicio', xDer: 'Reciente' } : { max: 20, xIzq: 'Primera', xDer: 'Última' }); cv.setAttribute('aria-label', 'Gráfica de progreso. ' + resumen(series)); });
  if (S.eval.length) c.appendChild(seccion('Evaluaciones', [h('table', { cls: 'tabla' }, [h('tr', {}, [h('th', { txt: 'Fecha' }), h('th', { txt: 'Tipo' }), h('th', { txt: 'Promedio' })]), ...S.eval.map((e) => h('tr', {}, [h('td', { txt: new Date(e.t).toLocaleDateString('es') }), h('td', { txt: e.tipo }), h('td', { txt: String(e.prom) })]))])]));
});
titulo('progreso', 'Mi progreso');

/* ---------- logros, medallas y tienda ---------- */
registrar('logros', (c, p) => {
  const S = Progreso.obtener(), tab = p.tab || 'logros';
  c.appendChild(h('div', { cls: 'chips', role: 'group', 'aria-label': 'Sección' }, [['logros', 'Logros'], ['medallas', 'Medallas'], ['tienda', 'Tienda']].map(([v, n]) => h('button', { type: 'button', cls: 'chip', 'data-f': 1, txt: n, 'aria-pressed': String(tab === v), on: { click: () => ir('logros', { tab: v }, { reemplazar: true }) } }))));
  c.appendChild(h('p', { cls: 'monedas', txt: `Monedas virtuales: ${S.monedas} (solo se ganan jugando y no tienen valor real)` }));
  if (tab === 'logros') {
    c.appendChild(h('p', { cls: 'nota', txt: `${Object.keys(S.logros).length} de ${LOGROS.length} logros` }));
    c.appendChild(h('div', { cls: 'lista-logros' }, LOGROS.map((l) => h('div', { cls: 'logro' + (S.logros[l.id] ? ' ok' : '') }, [h('span', { cls: 'chk', 'aria-hidden': 'true', txt: S.logros[l.id] ? '✓' : '○' }), h('div', {}, [h('b', { txt: l.nombre }), h('small', { txt: l.desc })]), h('span', { cls: 'sr', txt: S.logros[l.id] ? 'Conseguido' : 'Pendiente' })]))));
  } else if (tab === 'medallas') {
    c.appendChild(h('p', { cls: 'nota', txt: 'Según tu mejor nivel estimado en cada juego: bronce desde 5, plata desde 9, oro desde 14.' }));
    AREAS.forEach((a) => { c.appendChild(h('h3', { cls: 'sep', txt: a.icono + ' ' + a.nombre })); c.appendChild(h('div', { cls: 'lista-logros' }, juegosDeArea(a.id).map((j) => h('div', { cls: 'logro' }, [h('span', { cls: 'chk', 'aria-hidden': 'true', txt: j.icono }), h('div', {}, [h('b', { txt: j.nombre }), h('small', { txt: 'Mejor nivel: ' + (((S.juegos[j.id] || {}).mejorEst) || 0).toFixed(1) })]), medalla(Progreso.medallaJuego(j.id))])))); });
  } else {
    [['tema', 'Temas'], ['sonido', 'Sonidos'], ['emblema', 'Emblemas']].forEach(([tp, n]) => {
      c.appendChild(h('h3', { cls: 'sep', txt: n }));
      c.appendChild(h('div', { cls: 'lista-logros' }, TIENDA.filter((x) => x.tipo === tp).map((it) => {
        const tengo = Progreso.posee(it.id), eq = S.equipado[tp] === it.id;
        const b = eq ? h('span', { cls: 'medalla m-oro', txt: 'En uso' }) : tengo ? btn('Usar', () => { Progreso.equipar(it.id); ir('logros', { tab: 'tienda' }, { reemplazar: true }); }, 'btn peq') : btn(`Comprar · ${it.precio}`, () => { const r = Progreso.comprar(it.id); if (r) { toast('Desbloqueado: ' + it.nombre); Sonido.logro(); } else toast('Te faltan monedas.'); ir('logros', { tab: 'tienda' }, { reemplazar: true }); }, 'btn peq', S.monedas < it.precio ? { 'aria-disabled': 'true' } : {});
        return h('div', { cls: 'logro' + (tengo ? ' ok' : '') }, [h('span', { cls: 'chk', 'aria-hidden': 'true', txt: it.glifo || (tp === 'tema' ? '◐' : '♪') }), h('div', {}, [h('b', { txt: it.nombre }), h('small', { txt: it.nota || (tengo ? 'Desbloqueado' : it.precio + ' monedas') })]), b]);
      })));
    });
  }
});
titulo('logros', 'Logros y tienda');
registrar('ranking', (c) => { c.appendChild(h('p', { cls: 'nota', txt: 'Rankings por índice de área (0 a 1000), racha diaria máxima y puntos totales. Los puntajes los envía tu navegador: son para divertirse entre amigos.' })); panelRanking(c); });
titulo('ranking', 'Ranking');

/* ---------- duelo ---------- */
registrar('duelo', (c, p) => {
  const perfil = (() => { try { return JSON.parse(localStorage.getItem('juego_perfil') || '{}').nombre; } catch (e) { return ''; } })();
  const u = usuario(), cfg = p.cfg || { rondas: 1, juego: 'azar', n1: (u && (u.nombre || u.usuario)) || perfil || 'Jugador 1', n2: 'Jugador 2' };
  const i1 = h('input', { type: 'text', value: cfg.n1, maxlength: 16, 'aria-label': 'Nombre del jugador 1', 'data-f': 1 }), i2 = h('input', { type: 'text', value: cfg.n2, maxlength: 16, 'aria-label': 'Nombre del jugador 2', 'data-f': 1 });
  c.appendChild(h('p', { txt: 'Se turnan en el mismo dispositivo. Cada uno juega el mismo juego con los mismos problemas y gana quien sume más puntos. No afecta a tu progreso personal.' }));
  c.appendChild(h('div', { cls: 'campos' }, [h('label', {}, ['Jugador 1', i1]), h('label', {}, ['Jugador 2', i2])]));
  const gr = (tit, ops, k) => h('div', { cls: 'bloque' }, [h('h3', { txt: tit }), h('div', { cls: 'chips', role: 'group', 'aria-label': tit }, ops.map(([v, n]) => h('button', { type: 'button', cls: 'chip', 'data-f': 1, txt: n, 'aria-pressed': String(cfg[k] === v), on: { click: () => { cfg[k] = v; cfg.n1 = i1.value; cfg.n2 = i2.value; ir('duelo', { cfg }, { reemplazar: true }); } } })))]);
  c.appendChild(gr('Juegos por jugador', [[1, '1 juego'], [3, '3 juegos'], [5, '5 juegos']], 'rondas'));
  c.appendChild(h('div', { cls: 'bloque' }, [h('h3', { txt: 'Juego' }), btn(cfg.juego === 'azar' ? 'Al azar (cambiar…)' : juegoPorId(cfg.juego).nombre + ' (cambiar…)', () => {
    cfg.n1 = i1.value; cfg.n2 = i2.value;
    const cerrar = modal('Elige el juego', (m, cer) => { m.appendChild(btn('Al azar', () => { cfg.juego = 'azar'; cer(); ir('duelo', { cfg }, { reemplazar: true }); }, 'btn sec')); JUEGOS.forEach((j) => m.appendChild(btn(j.nombre, () => { cfg.juego = j.id; cer(); ir('duelo', { cfg }, { reemplazar: true }); }, 'btn sec peq'))); });
  }, 'btn sec')]));
  c.appendChild(btn('Empezar duelo', () => { const n1 = i1.value.trim() || 'Jugador 1', n2 = i2.value.trim() || 'Jugador 2'; Flujos.iniciar('duelo', { rondas: cfg.rondas, juego: cfg.juego, nombres: [n1, n2], extra: { cfgDuelo: cfg } }); }, 'btn grande', { id: 'bDuelo' }));
});
titulo('duelo', 'Duelo por turnos');
registrar('pase', (c, p) => {
  const e = p.e, nombre = p.p.extra.nombres[e.jug], j = juegoPorId(e.id);
  titulo('pase', 'Turno de ' + nombre);
  c.appendChild(h('div', { cls: 'centro-gran' }, [h('h2', { txt: 'Pasa el dispositivo a ' + nombre }), h('p', { txt: 'Juego: ' + j.nombre }), h('p', { cls: 'nota', txt: j.desc }), h('p', { cls: 'marcador', txt: `${p.p.extra.nombres[0]} ${p.p.extra.puntos[0]} · ${p.p.extra.puntos[1]} ${p.p.extra.nombres[1]}` }), btn('Estoy listo: empezar', () => p.listo('ok'), 'btn grande', { id: 'bListo' }), btn('Salir del duelo', () => p.listo('salir'), 'btn sec peq', { 'data-atras': 1 })]));
});
registrar('resumenDuelo', (c, p) => {
  const P = p.p, [a, b] = P.extra.puntos, n = P.extra.nombres; titulo('resumenDuelo', 'Resultado del duelo');
  c.appendChild(h('div', { cls: 'centro-gran' }, [h('h2', { txt: a === b ? 'Empate' : '¡Gana ' + (a > b ? n[0] : n[1]) + '!' }), h('p', { cls: 'marcador', txt: `${n[0]} ${a} · ${b} ${n[1]}` })]));
  const filas = [];
  for (let i = 0; i < P.res.length; i += 2) filas.push(h('tr', {}, [h('td', { txt: juegoPorId(P.res[i].id).nombre }), h('td', { txt: String(P.res[i].puntos) }), h('td', { txt: String(P.res[i + 1].puntos) })]));
  c.appendChild(h('table', { cls: 'tabla' }, [h('tr', {}, [h('th', { txt: 'Juego' }), h('th', { txt: n[0] }), h('th', { txt: n[1] })]), ...filas]));
  c.appendChild(btn('Revancha', () => Flujos.iniciar('duelo', { rondas: P.extra.cfgDuelo.rondas, juego: P.extra.cfgDuelo.juego, nombres: n, extra: { cfgDuelo: P.extra.cfgDuelo } }), 'btn'));
  c.appendChild(btn('Inicio', () => ir('inicio', {}, { raiz: true }), 'btn sec'));
});

/* ---------- resultados ---------- */
registrar('resultado', (c, p) => {
  const r = p.res, j = juegoPorId(r.id), info = p.info; titulo('resultado', j.nombre);
  c.appendChild(h('div', { cls: 'centro-gran' }, [h('h2', { txt: r.puntos + ' puntos' }), h('p', { cls: 'nota', txt: j.nombre })]));
  c.appendChild(h('div', { cls: 'stats' }, [stat('Aciertos', r.aciertos), stat('Errores', r.errores), stat('Precisión', Math.round(r.precision * 100) + ' %'), stat('Nivel final', r.nivelFinal), stat('Nivel estimado', r.nivelEst.toFixed(1))]));
  if (r.mediana) c.appendChild(h('p', { cls: 'nota centro', txt: 'Tiempo de reacción mediano: ' + r.mediana + ' ms' }));
  if (r.pocos) c.appendChild(h('p', { cls: 'nota centro', txt: 'Pocos ensayos: el nivel estimado es provisional.' }));
  if (info) {
    c.appendChild(seccion(null, [h('p', { txt: 'Juego: ' + pctTxt(info.pctJuego) }), info.idxArea != null ? h('p', { txt: `${nombreArea(r.area)}: índice ${info.idxArea}. ${pctTxt(info.pctArea, 'registros')}` }) : null, h('p', { cls: 'nota', txt: `+${info.monedas} monedas virtuales` }),
      info.medallaNueva ? h('p', {}, ['¡Medalla nueva! ', medalla(info.medallaNueva)]) : null, ...info.logros.map((id) => h('p', { cls: 'logro-nuevo', txt: '★ Logro: ' + LOGROS.find((l) => l.id === id).nombre }))]));
  } else if (p.p && p.p.modo === 'duelo') c.appendChild(h('p', { cls: 'nota centro', txt: 'Duelo: no cuenta para tu progreso.' }));
  if (p.siguiente) {
    c.appendChild(btn(p.p.modo === 'duelo' ? 'Continuar' : `Siguiente juego (${p.p.i + 1} de ${p.p.cola.length})`, () => p.listo('ok'), 'btn grande', { id: 'bSiguiente' }));
    c.appendChild(btn('Salir de la sesión', async () => { if (await confirmar('Se guardó lo jugado hasta ahora. ¿Salir de la sesión?', { si: 'Salir' })) p.listo('salir'); }, 'btn sec peq', { 'data-atras': 1 }));
  } else {
    c.appendChild(btn('Jugar de nuevo', () => Flujos.iniciar(p.p && p.p.modo === 'reto' ? 'reto' : 'juego', { juego: r.id }), 'btn grande'));
    c.appendChild(btn('Ver el juego', () => ir('juego', { id: r.id }, { raiz: true }), 'btn sec'));
    c.appendChild(btn('Inicio', () => ir('inicio', {}, { raiz: true }), 'btn sec'));
  }
});
registrar('tutResultado', (c, p) => {
  titulo('tutResultado', 'Tutorial ' + p.nivel + ' de 3');
  const ok = p.res.aprobado;
  c.appendChild(h('div', { cls: 'centro-gran' }, [h('h2', { txt: ok ? (p.nivel < 3 ? '¡Bien hecho!' : '¡Tutorial completado!') : 'Casi: inténtalo otra vez' }), h('p', { txt: `${p.res.aciertos} aciertos y ${p.res.errores} errores en este nivel.` }), p.r.monedas ? h('p', { cls: 'nota', txt: '+' + p.r.monedas + ' monedas virtuales' }) : null]));
  if (ok && p.nivel < 3) c.appendChild(btn('Siguiente nivel', () => p.listo('siguiente'), 'btn grande', { id: 'bSigTut' }));
  c.appendChild(btn('Repetir este nivel', () => p.listo('repetir'), 'btn sec'));
  c.appendChild(btn(ok && p.nivel === 3 ? 'Terminar' : 'Salir del tutorial', () => p.listo('salir'), 'btn sec', { 'data-atras': 1 }));
});
registrar('resumen', (c, p) => {
  titulo('resumen', p.titulo);
  c.appendChild(h('div', { cls: 'centro-gran' }, [h('h2', { txt: p.titulo }), h('p', { txt: p.modo === 'diaria' ? `Racha diaria: ${p.extra.racha} día${p.extra.racha === 1 ? '' : 's'} · +${p.extra.bono} monedas virtuales` : 'Buen entrenamiento. Cada juego sumó a tu historial.' })]));
  c.appendChild(h('table', { cls: 'tabla' }, [h('tr', {}, [h('th', { txt: 'Juego' }), h('th', { txt: 'Puntos' }), h('th', { txt: 'Nivel' })]), ...p.res.map((r) => h('tr', {}, [h('td', { txt: juegoPorId(r.id).nombre }), h('td', { txt: String(r.puntos) }), h('td', { txt: r.nivelEst.toFixed(1) })]))]));
  p.extra.logros.forEach((id) => c.appendChild(h('p', { cls: 'logro-nuevo', txt: '★ Logro: ' + LOGROS.find((l) => l.id === id).nombre })));
  c.appendChild(btn('Ver mi progreso', () => ir('progreso', {}, { raiz: true }), 'btn')); c.appendChild(btn('Inicio', () => ir('inicio', {}, { raiz: true }), 'btn sec'));
});
registrar('resumenEval', (c, p) => {
  titulo('resumenEval', 'Resultado de la evaluación');
  c.appendChild(h('div', { cls: 'centro-gran' }, [h('h2', { txt: p.reg.tipo === 'inicial' ? 'Punto de partida registrado' : 'Reevaluación completada' }), h('p', { txt: 'Promedio de índices: ' + p.reg.prom + (p.previa ? ` (antes: ${p.previa.prom}, ${p.reg.prom - p.previa.prom >= 0 ? '+' : ''}${p.reg.prom - p.previa.prom})` : '') }), h('p', { cls: 'nota', txt: 'Es una comparación contigo mismo en estos juegos; no mide inteligencia ni diagnostica nada.' })]));
  c.appendChild(h('table', { cls: 'tabla' }, [h('tr', {}, [h('th', { txt: 'Área' }), h('th', { txt: 'Índice' }), p.previa ? h('th', { txt: 'Antes' }) : null]), ...AREAS.map((a) => h('tr', {}, [h('td', { txt: a.nombre }), h('td', { txt: String(p.reg.idx[a.id] ?? '—') }), p.previa ? h('td', { txt: String(p.previa.idx[a.id] ?? '—') }) : null]))]));
  p.logros.forEach((id) => c.appendChild(h('p', { cls: 'logro-nuevo', txt: '★ Logro: ' + LOGROS.find((l) => l.id === id).nombre })));
  c.appendChild(btn('Ver mi progreso', () => ir('progreso', {}, { raiz: true }), 'btn')); c.appendChild(btn('Inicio', () => ir('inicio', {}, { raiz: true }), 'btn sec'));
});

/* ---------- modales ---------- */
export function abrirAyuda() {
  modal('Cómo funciona', (m) => {
    m.appendChild(h('p', { cls: 'aviso-visible', txt: AVISO }));
    [['Áreas y juegos', '5 áreas (memoria, atención, velocidad de procesamiento, flexibilidad y lógica y cálculo) con 24 minijuegos cortos de 60 segundos.'],
      ['Dificultad adaptativa', 'Cada juego sube un nivel tras 2 aciertos seguidos y baja uno tras cada error (escalera 2 arriba / 1 abajo), así que tiende a mantenerte cerca del 70 % de aciertos. El nivel estimado es el promedio de los últimos puntos de giro de esa escalera.'],
      ['Puntajes', 'Los puntos dependen del nivel y de tu racha de aciertos. El percentil compara solo con tu propio historial (se muestra tras 5 partidas). El índice de un área es el nivel estimado medio × 50.'],
      ['Sesión diaria', 'Cinco juegos elegidos según tus áreas más débiles y menos entrenadas (el algoritmo se explica en la tarjeta de inicio). Completarla suma un día a tu racha.'],
      ['Evaluación', '10 juegos (2 por área) con dificultad inicial fija, para compararte contigo mismo; se sugiere repetirla cada mes.'],
      ['Monedas virtuales', 'Se ganan jugando y sirven solo para desbloquear temas, sonidos y emblemas. No tienen valor real.'],
      ['Teclado y mando', 'Respuestas con 1-9, flechas o WASD; Espacio/Enter confirman; Esc o P pausan. Mando Xbox: A/B/X/Y responden, cruceta y palanca mueven, Menú pausa.']].forEach(([t, d]) => { m.appendChild(h('h3', { txt: t })); m.appendChild(h('p', { txt: d })); });
  }, { ancha: true });
}
export function abrirCuenta() { modal('Cuenta', (m, cerrar) => panelCuenta(m, cerrar)); }
export { abrirAjustes };
