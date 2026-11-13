// Menus y dialogos: menu principal, nueva partida, pausa, ajustes, estadisticas, logros, ranking, ayuda, texto pegado y fin de partida.
import { h, $, limitar } from './dom.js';
import { A, TEMAS, guardar as guardarAjustes, aplicar, restaurar } from './ajustes.js';
import { VARIANTES, NIVELES, variante, nivelesDe } from './variantes.js';
import * as PR from './progreso.js';
import { fmtTiempo, fechaLocal, retoDiario, desafiosSemana, semanaISO } from './formato.js';
import * as J from './juego.js';
import * as AL from './almacen.js';
import * as CU from './cuenta-sudoku.js';
import { sonar, desbloquear } from './sonido.js';
import { analizarAsync } from './generar-cliente.js';
import { NOMBRE_TEC } from './tecnicas.js';

const capas = () => $('#capas');
export const hayCapa = () => capas().children.length > 0;

export function toast(msg, ms = 2800) {
  const t = h('div', { cls: 'toast', txt: msg, role: 'status' });
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), ms);
}
export function cargando(on, txt) { $('#cargando').hidden = !on; if (txt) $('#cargandoTxt').textContent = txt; else $('#cargandoTxt').textContent = 'Generando puzzle…'; }

/* ---------- capas ---------- */
export function abrirCapa(titulo, cuerpo, { pie = [], ancho = false, alCerrar, pestanas } = {}) {
  const previo = document.activeElement;
  const cerrar = () => { raiz.remove(); if (alCerrar) alCerrar(); if (previo && previo.isConnected && !hayCapa()) try { previo.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } };
  const caja = h('div', { cls: 'caja' + (ancho ? ' ancha' : '') }, [
    h('div', { cls: 'cab' }, [h('h3', { txt: titulo }), h('button', { type: 'button', cls: 'icono', 'data-f': 1, 'data-atras': 1, 'aria-label': 'Cerrar', txt: '✕', on: { click: cerrar } })]),
    pestanas || null,
    h('div', { cls: 'cuerpo' }, cuerpo),
    pie.length ? h('div', { cls: 'pie' }, pie) : null
  ]);
  const raiz = h('div', { cls: 'capa', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo, on: { click: (e) => { if (e.target === raiz) cerrar(); } } }, [caja]);
  capas().appendChild(raiz);
  const f = raiz.querySelector('[data-f]:not([data-atras])') || raiz.querySelector('[data-f]');
  if (f) setTimeout(() => f.focus({ preventScroll: true }), 30);
  return { cerrar, raiz, cuerpo: caja.querySelector('.cuerpo') };
}
export const cerrarTodas = () => { capas().textContent = ''; };
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && hayCapa()) { e.preventDefault(); const c = capas().lastElementChild; const b = c.querySelector('[data-atras]'); if (b) b.click(); else c.remove(); }
});
const btn = (txt, fn, cls = '') => h('button', { type: 'button', cls: 'btn ' + cls, 'data-f': 1, txt, on: { click: fn } });
const chip = (txt, on, fn) => h('button', { type: 'button', cls: 'chip', 'data-f': 1, txt, 'aria-pressed': String(!!on), on: { click: fn } });
function segmento(opciones, actual, alCambiar) {
  const g = h('div', { cls: 'seg', role: 'group' });
  const pintar = (v) => Array.from(g.children).forEach((b, i) => b.setAttribute('aria-pressed', String(opciones[i][0] === v)));
  opciones.forEach(([v, n]) => g.appendChild(chip(n, v === actual, () => { alCambiar(v); pintar(v); })));
  return g;
}

/* ---------- menu principal ---------- */
export function menuPrincipal() {
  const m = $('#menu'); m.textContent = '';
  const g = J.resumenGuardada(), hoy = fechaLocal(), reto = retoDiario(hoy), hecho = PR.P.diario[hoy] != null;
  const rd = PR.P.rachaDiaria, racha = rd.ultima && (rd.ultima === hoy || rd.ultima === ayer(hoy)) ? rd.actual : 0;
  m.appendChild(h('div', { html: '<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><rect x="4" y="4" width="56" height="56" rx="10" fill="var(--panel)" stroke="var(--lineaG)" stroke-width="3"/><path d="M23 4v56M41 4v56M4 23h56M4 41h56" stroke="var(--linea)" stroke-width="1.6"/><path d="M23 4v56M41 4v56M4 23h56M4 41h56" stroke="var(--lineaG)" stroke-width="0" /><text x="32" y="39" font-size="26" font-weight="800" text-anchor="middle" fill="var(--acc)">9</text></svg>' }));
  m.appendChild(h('h2', { cls: 'gran', txt: 'Sudoku' }));
  m.appendChild(h('p', { cls: 'lema', txt: '7 variantes, 6 dificultades y pistas que te explican la técnica.' }));
  const cm = h('span', { cls: 'chip-cuenta chip-menu' }); CU.pintarChip(cm); if (!cm.hidden) m.appendChild(cm);
  const l = h('div', { cls: 'lista-menu' });
  const item = (t, sub, fn, cls = '') => h('button', { type: 'button', cls: 'btn ' + cls, 'data-f': 1, on: { click: fn } }, [h('span', { cls: 't' }, [t, sub ? h('small', { txt: sub }) : null]), h('span', { txt: '›' })]);
  if (g) l.appendChild(item('Continuar', `${J.nombreModo(g.modo)} · ${g.variante} · ${g.nivel} · ${fmtTiempo(g.t / 1000)}`, () => { desbloquear(); if (!J.continuar()) toast('No se pudo cargar la partida guardada.'); }, 'prim'));
  l.appendChild(item('Nueva partida', 'Libre, sin errores, contrarreloj o maratón', () => dialogoNueva(), g ? '' : 'prim'));
  l.appendChild(item('Reto diario', `${NIVELES[reto.nivel].nombre} · ${hecho ? 'completado hoy ✓' : 'pendiente'}${racha ? ' · racha ' + racha + ' d' : ''}`, dialogoDiario));
  l.appendChild(item('Desafíos semanales', '3 puzzles de variantes especiales cada semana', dialogoSemanal));
  l.appendChild(item('Pegar o resolver un puzzle', 'Pega 81 caracteres de otro libro o app', dialogoPegar));
  const f = h('div', { cls: 'fila2' });
  f.appendChild(btn('Estadísticas', dialogoStats)); f.appendChild(btn('Logros', dialogoLogros));
  f.appendChild(btn('Ranking', dialogoRanking)); f.appendChild(btn('Cómo se juega', dialogoAyuda));
  l.appendChild(f);
  m.appendChild(l);
  m.appendChild(h('p', { cls: 'nota', txt: PR.P.victorias ? `${PR.P.victorias} victorias · mejor racha ${PR.P.racha.mejor}` : 'Tu progreso se guarda solo en este dispositivo (y en tu cuenta si has iniciado sesión).' }));
}
const ayer = (f) => { const d = new Date(f + 'T12:00:00'); d.setDate(d.getDate() - 1); return fechaLocal(d); };

/* ---------- nueva partida ---------- */
const MODOS = [['libre', 'Libre'], ['sinerrores', 'Sin errores'], ['contrarreloj', 'Contrarreloj'], ['maraton', 'Maratón']];
const DESC_MODO = {
  libre: 'Sin límite de tiempo ni de fallos. Con pistas, notas y verificación.',
  sinerrores: 'Tienes 3 vidas: cada número incorrecto te quita una.',
  contrarreloj: 'Resuelve antes de que se acabe el tiempo. Más puntos si sobra tiempo y no usas pistas.',
  maraton: '12 puzzles clásicos de dificultad creciente con 3 vidas compartidas. Suma puntos por rapidez.'
};
export function dialogoNueva(modoIni) {
  const u = A.ultimo, sel = { modo: modoIni || (['libre', 'sinerrores', 'contrarreloj', 'maraton'].includes(u.modo) ? u.modo : 'libre'), variante: u.variante, nivel: u.nivel };
  const cuerpo = h('div'), desc = h('p', { cls: 'nota' }), zV = h('div'), zN = h('div');
  const pintar = () => {
    desc.textContent = DESC_MODO[sel.modo];
    zV.textContent = ''; zN.textContent = '';
    const mar = sel.modo === 'maraton';
    if (mar) { zV.appendChild(h('p', { cls: 'nota', txt: 'Variante: Clásico 9×9. La dificultad sube sola: principiante → demonio.' })); return; }
    zV.appendChild(h('h4', { txt: 'Variante' }));
    const g = h('div', { cls: 'seg', role: 'group' });
    VARIANTES.forEach((v) => g.appendChild(chip(v.corto, v.id === sel.variante, () => { sel.variante = v.id; if (!nivelesDe(v.id).includes(sel.nivel)) sel.nivel = nivelesDe(v.id).slice(-1)[0]; pintar(); })));
    zV.appendChild(g); zV.appendChild(h('p', { cls: 'nota', txt: variante(sel.variante).desc }));
    zN.appendChild(h('h4', { txt: 'Dificultad' }));
    const gn = h('div', { cls: 'seg', role: 'group' });
    nivelesDe(sel.variante).forEach((n) => gn.appendChild(chip(NIVELES[n].nombre, n === sel.nivel, () => { sel.nivel = n; pintar(); })));
    zN.appendChild(gn);
    if (sel.modo === 'contrarreloj') zN.appendChild(h('p', { cls: 'nota', txt: 'Tiempo disponible: ' + fmtTiempo(J.LIMITE_CR[sel.nivel]) }));
  };
  cuerpo.appendChild(h('h4', { txt: 'Modo' }));
  cuerpo.appendChild(segmento(MODOS, sel.modo, (v) => { sel.modo = v; pintar(); }));
  cuerpo.appendChild(desc); cuerpo.appendChild(zV); cuerpo.appendChild(zN);
  pintar();
  const c = abrirCapa('Nueva partida', [cuerpo], { pie: [btn('Jugar', () => { c.cerrar(); empezar(sel); }, 'prim')] });
}
export function empezar(sel) {
  if (sel.modo !== 'maraton') { A.ultimo = { variante: sel.variante, nivel: sel.nivel, modo: sel.modo }; } else A.ultimo.modo = 'maraton';
  guardarAjustes();
  if (sel.modo === 'maraton') return J.nueva({ variante: 'clasico', nivel: 0, modo: 'maraton', meta: { idx: 0, pts: 0, vidas: 3 }, textoCarga: 'Preparando la maratón…' });
  return J.nueva({ variante: sel.variante, nivel: sel.nivel, modo: sel.modo });
}

/* ---------- diario / semanal ---------- */
export function dialogoDiario() {
  const hoy = fechaLocal(), reto = retoDiario(hoy), t = PR.P.diario[hoy], rd = PR.P.rachaDiaria;
  const hecho = t != null, racha = rd.ultima && (rd.ultima === hoy || rd.ultima === ayer(hoy)) ? rd.actual : 0;
  const c = abrirCapa('Reto diario', [
    h('p', {}, [`${new Date(hoy + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}`]),
    h('div', { cls: 'resumen-fin' }, [
      h('div', {}, [h('b', { txt: NIVELES[reto.nivel].nombre }), h('span', { txt: 'Clásico 9×9 · igual para todos' })]),
      h('div', {}, [h('b', { txt: racha + (racha === 1 ? ' día' : ' días') }), h('span', { txt: 'Racha actual · mejor ' + rd.mejor })])
    ]),
    hecho ? h('p', { cls: 'ok-txt', txt: 'Ya lo completaste hoy' + (t ? ' en ' + fmtTiempo(t) + '.' : ' (con ayudas).') }) : h('p', { cls: 'nota', txt: 'Resuélvelo hoy para sumar a tu racha. Si usas pistas se completa, pero no entra al ranking.' })
  ], { pie: [hecho ? btn('Rejugar sin puntuar', () => { c.cerrar(); J.nueva({ variante: 'clasico', nivel: reto.nivel, semilla: reto.semilla, modo: 'libre' }); }) : btn('Jugar el reto de hoy', () => { c.cerrar(); J.nueva({ variante: 'clasico', nivel: reto.nivel, semilla: reto.semilla, modo: 'diario', meta: { fecha: hoy } }); }, 'prim')] });
}
export function dialogoSemanal() {
  const sem = semanaISO(fechaLocal()), lista = desafiosSemana(sem), w = PR.P.semanal[sem] || {};
  const cuerpo = [h('p', { cls: 'nota', txt: 'Semana ' + sem.split('-W')[1] + ': los mismos 3 puzzles para todos. Completa los tres para la semana perfecta.' })];
  let c;
  lista.forEach((d) => {
    const hecho = w[d.id] != null;
    cuerpo.push(h('div', { cls: 'bloque' }, [
      h('h4', { txt: `${d.id + 1}. ${variante(d.variante).nombre} · ${NIVELES[d.nivel].nombre}` }),
      h('p', { cls: hecho ? 'ok-txt' : 'nota', txt: hecho ? 'Completado' + (w[d.id] ? ' en ' + fmtTiempo(w[d.id]) : '') : variante(d.variante).desc }),
      btn(hecho ? 'Rejugar' : 'Jugar', () => { c.cerrar(); J.nueva({ variante: d.variante, nivel: d.nivel, semilla: d.semilla, modo: hecho ? 'libre' : 'semanal', meta: hecho ? {} : { semanal: { semana: sem, id: d.id } } }); }, hecho ? 'peq' : 'peq prim')
    ]));
  });
  c = abrirCapa('Desafíos semanales', cuerpo);
}

/* ---------- pausa ---------- */
export function menuPausa() {
  const p = J.estado.p; if (!p) return;
  let c;
  const accion = (fn) => () => { c.cerrar(); fn(); };
  const cuerpo = [h('div', { cls: 'col-btns' }, [
    btn('Continuar', () => c.cerrar(), 'prim'),
    btn('Verificar tablero', accion(() => J.verificar())),
    btn('Rellenar notas (candidatos)', accion(() => J.accion('autonotas'))),
    btn('Resolver paso a paso', accion(() => J.abrirResolucion())),
    btn('Ajustes', () => dialogoAjustes()),
    btn('Cómo se juega', () => dialogoAyuda()),
    p.fin ? null : btn('Reiniciar este puzzle', () => { c.cerrar(); const pz = p.puzzle; J.nueva({ variante: pz.v, nivel: pz.nivelPedido != null ? pz.nivelPedido : pz.nivel, puzzle: { ...pz }, modo: p.modo, meta: { ...p.meta } }); }),
    btn('Guardar y salir al menú', accion(() => J.salirAlMenu())),
    p.fin ? null : btn('Abandonar partida', () => confirmar('¿Abandonar la partida? Contará como derrota en tus estadísticas.', () => { c.cerrar(); J.terminar(false, 'abandono'); }), 'peligro')
  ])];
  c = abrirCapa('Pausa', cuerpo);
}
function confirmar(texto, ok) {
  let c;
  c = abrirCapa('Confirmar', [h('p', { txt: texto })], { pie: [btn('Cancelar', () => c.cerrar()), btn('Sí, continuar', () => { c.cerrar(); ok(); }, 'peligro')] });
}

/* ---------- ajustes ---------- */
const fila = (et, sub, ctrl, col) => h('div', { cls: 'fila-aj' + (col ? ' col' : '') }, [h('div', { cls: 'et' }, [et, sub ? h('small', { txt: sub }) : null]), ctrl]);
function interruptor(obj, clave, alCambiar) {
  const b = h('button', { type: 'button', cls: 'sw', role: 'switch', 'data-f': 1, 'aria-checked': String(!!obj[clave]), on: { click: () => { obj[clave] = !obj[clave]; b.setAttribute('aria-checked', String(obj[clave])); guardarAjustes(); aplicar(); if (alCambiar) alCambiar(obj[clave]); } } });
  return b;
}
function deslizador(obj, clave, min, max, paso, alCambiar) {
  return h('input', { type: 'range', min, max, step: paso, value: obj[clave], 'data-f': 1, 'data-rango': 1, on: { input: (e) => { obj[clave] = +e.target.value; guardarAjustes(); aplicar(); if (alCambiar) alCambiar(obj[clave]); } } });
}
export function dialogoAjustes() {
  const pestanas = [['gra', 'Gráficos'], ['aud', 'Audio'], ['con', 'Controles'], ['acc', 'Accesibilidad'], ['dat', 'Datos']];
  let actual = 'gra', c;
  const barra = h('div', { cls: 'pestanas', role: 'tablist' });
  const cuerpoEl = () => c.cuerpo;
  const pintar = () => {
    Array.from(barra.children).forEach((b, i) => b.setAttribute('aria-pressed', String(pestanas[i][0] === actual)));
    const cu = cuerpoEl(); cu.textContent = '';
    ({ gra: pGraficos, aud: pAudio, con: pControles, acc: pAccesibilidad, dat: pDatos })[actual](cu);
  };
  pestanas.forEach(([id, n]) => barra.appendChild(h('button', { type: 'button', cls: 'chip', role: 'tab', 'data-f': 1, 'data-pestana': id, txt: n, on: { click: () => { actual = id; pintar(); } } })));
  c = abrirCapa('Ajustes', [], { pestanas: barra, ancho: true });
  c.raiz.dataset.pestanas = pestanas.map((x) => x[0]).join(',');
  c.cambiarPestana = (d) => { const ids = pestanas.map((x) => x[0]); actual = ids[(ids.indexOf(actual) + d + ids.length) % ids.length]; pintar(); };
  c.raiz.__pestana = c.cambiarPestana;
  pintar();
}
function pGraficos(cu) {
  cu.appendChild(h('div', { cls: 'bloque' }, [h('h4', { txt: 'Tema' }), segmento(TEMAS.map((t) => [t.id, t.nombre]), A.tema, (v) => { A.tema = v; guardarAjustes(); aplicar(); })]));
  const G = A.graficos, b = h('div', { cls: 'bloque' }, [h('h4', { txt: 'Tablero' })]);
  b.appendChild(fila('Animaciones', 'Celebración al ganar y transiciones', interruptor(G, 'animaciones')));
  b.appendChild(fila('Resaltar números iguales', null, interruptor(G, 'resaltarIguales', J.pintar)));
  b.appendChild(fila('Resaltar fila, columna y zona', null, interruptor(G, 'resaltarUnidades', J.pintar)));
  b.appendChild(fila('Resaltar conflictos', 'Marca en rojo los números repetidos', interruptor(G, 'resaltarConflictos', J.pintar)));
  b.appendChild(fila('Mostrar el tiempo', null, interruptor(G, 'mostrarTiempo', J.pintarInfo)));
  b.appendChild(fila('Mostrar contador de errores', 'Solo con autocomprobación', interruptor(G, 'mostrarErrores', J.pintarInfo)));
  cu.appendChild(b);
  cu.appendChild(btn('Pantalla completa', alternarPantalla, 'peq'));
}
function pAudio(cu) {
  const a = A.audio, b = h('div', { cls: 'bloque' });
  b.appendChild(fila('Volumen', null, deslizador(a, 'maestro', 0, 1, 0.05)));
  b.appendChild(fila('Efectos de sonido', 'Sonidos suaves sintetizados', interruptor(a, 'efectos')));
  b.appendChild(fila('Silenciar todo', null, interruptor(a, 'silencio')));
  cu.appendChild(b); cu.appendChild(btn('Probar sonido', () => { desbloquear(); sonar('poner'); setTimeout(() => sonar('unidad'), 250); }, 'peq'));
}
function pControles(cu) {
  const C = A.controles, b = h('div', { cls: 'bloque' });
  b.appendChild(fila('Modo de entrada', 'Celda primero: eliges celda y luego número. Número primero: eliges número y tocas celdas.', segmento([['celda', 'Celda primero'], ['numero', 'Número primero']], C.entrada, (v) => { C.entrada = v; guardarAjustes(); J.estado.num = 0; J.pintar(); }), true));
  b.appendChild(fila('Quitar notas automáticamente', 'Al poner un número se borra de las notas vecinas', interruptor(C, 'autoquitarNotas')));
  b.appendChild(fila('Autocomprobación', 'Marca los errores al instante (cuenta como ayuda)', interruptor(C, 'autocomprobar', (v) => { const p = J.estado.p; if (p && v) p.autocheck = true; J.pintar(); J.pintarInfo(); })));
  b.appendChild(fila('Vibración', null, interruptor(C, 'vibracion')));
  b.appendChild(fila('Intensidad de vibración', null, deslizador(C, 'vibIntensidad', 0.2, 1, 0.1)));
  b.appendChild(fila('Zona muerta del mando', null, deslizador(C, 'zonaMuerta', 0.1, 0.7, 0.05)));
  b.appendChild(fila('Modo zurdo', 'Teclado a la izquierda en pantallas anchas', interruptor(C, 'zurdo')));
  b.appendChild(fila('Tamaño del teclado', null, deslizador(C, 'tamTeclado', 0.8, 1.4, 0.1, () => setTimeout(J.ajustarLayout, 0))));
  cu.appendChild(b);
  cu.appendChild(h('div', { cls: 'bloque' }, [h('h4', { txt: 'Atajos' }), h('p', { cls: 'nota', html: '<b>Teclado:</b> 1-9 número · Mayús+número nota · flechas mover (Mayús extiende) · Supr borrar · N lápiz · H pista · Ctrl+Z / Ctrl+Y deshacer / rehacer · Tab siguiente vacía · Esc pausa.<br><b>Mando Xbox:</b> cruceta o stick izquierdo mueve · A coloca el número activo · LT/RT cambian de número · stick derecho abre el menú radial de números · B borra · X lápiz · Y pista · LB/RB deshacer/rehacer · Vista rellena notas · Menú pausa.' })]));
}
function pAccesibilidad(cu) {
  const a = A.accesibilidad, b = h('div', { cls: 'bloque' });
  b.appendChild(fila('Texto grande', null, interruptor(a, 'textoGrande', () => setTimeout(J.ajustarLayout, 50))));
  b.appendChild(fila('Reducir movimiento', 'Sin animaciones ni transiciones', interruptor(a, 'reducirMovimiento')));
  b.appendChild(fila('Alto contraste', 'Líneas y colores más marcados', interruptor(a, 'altoContraste')));
  cu.appendChild(b);
  cu.appendChild(h('p', { cls: 'nota', txt: 'El tema «Daltónico» (en Gráficos) usa azul y naranja en lugar de rojo y verde.' }));
}
function pDatos(cu) {
  cu.appendChild(CU.bloqueNube());
  const exp = h('textarea', { cls: 'txt', readonly: '', rows: 3, 'data-f': 1, 'aria-label': 'Datos exportados' }), imp = h('textarea', { cls: 'txt', rows: 3, placeholder: 'Pega aquí el texto exportado', 'data-f': 1, 'aria-label': 'Datos a importar' });
  const b = h('div', { cls: 'bloque' }, [h('h4', { txt: 'Copia de seguridad' })]);
  b.appendChild(btn('Exportar progreso y ajustes', () => { exp.value = AL.exportar(); exp.select(); try { navigator.clipboard.writeText(exp.value); toast('Copiado al portapapeles.'); } catch (e) { toast('Texto listo para copiar.'); } }, 'peq'));
  b.appendChild(exp);
  b.appendChild(imp);
  b.appendChild(btn('Importar', () => { if (AL.importar(imp.value)) { PR.recargar(); (async () => { const m = await import('./ajustes.js'); m.recargar(); })(); toast('Datos importados.'); menuPrincipal(); } else toast('El texto no es válido.'); }, 'peq'));
  cu.appendChild(b);
  const z = h('div', { cls: 'bloque' }, [h('h4', { txt: 'Borrar' })]);
  z.appendChild(btn('Restablecer ajustes', () => confirmar('¿Restablecer todos los ajustes de este dispositivo?', () => { restaurar(); toast('Ajustes restablecidos.'); }), 'peq'));
  z.appendChild(btn('Borrar progreso, estadísticas y partida', () => confirmar('Se borrarán estadísticas, rachas, logros y la partida guardada de este dispositivo. ¿Seguro?', () => { AL.borrarTodo(); PR.recargar(); Object.assign(PR.P, PR.vacio()); restaurar(); toast('Datos borrados.'); menuPrincipal(); }), 'peq peligro'));
  cu.appendChild(z);
}
export function alternarPantalla() {
  try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { toast('Tu navegador no permite pantalla completa.'); }
}

/* ---------- estadisticas / logros / ranking ---------- */
export function dialogoStats() {
  let vid = 'clasico';
  const cuerpo = h('div');
  const pintar = () => {
    cuerpo.textContent = '';
    const sel = h('select', { cls: 'sel', 'data-f': 1, 'aria-label': 'Variante', on: { change: () => { vid = sel.value; pintar(); } } }, VARIANTES.map((v) => h('option', { value: v.id, txt: v.nombre })));
    sel.value = vid; cuerpo.appendChild(sel);
    const t = h('table', { cls: 'tabla' });
    t.appendChild(h('tr', {}, ['Dificultad', 'Jugadas', 'Victorias', 'Mejor', 'Media', 'Racha'].map((x) => h('th', { txt: x }))));
    nivelesDe(vid).forEach((n) => {
      const s = PR.stat(vid, n);
      t.appendChild(h('tr', {}, [NIVELES[n].nombre, s.jugadas, s.victorias, s.mejor ? fmtTiempo(s.mejor) : '—', s.victorias ? fmtTiempo(s.suma / s.victorias) : '—', `${s.racha}/${s.mejorRacha}`].map((x) => h('td', { txt: String(x) }))));
    });
    cuerpo.appendChild(t);
    const P = PR.P;
    cuerpo.appendChild(h('div', { cls: 'resumen-fin' }, [
      h('div', {}, [h('b', { txt: String(P.victorias) }), h('span', { txt: 'Victorias totales' })]),
      h('div', {}, [h('b', { txt: `${P.racha.actual} / ${P.racha.mejor}` }), h('span', { txt: 'Racha de victorias (actual / mejor)' })]),
      h('div', {}, [h('b', { txt: `${P.rachaDiaria.actual} / ${P.rachaDiaria.mejor}` }), h('span', { txt: 'Racha diaria (actual / mejor)' })]),
      h('div', {}, [h('b', { txt: String(Object.keys(P.diario).length) }), h('span', { txt: 'Retos diarios completados' })]),
      h('div', {}, [h('b', { txt: String(P.maraton.mejor) }), h('span', { txt: 'Mejor Maratón (pts) · ' + P.maraton.puzzles + ' puzzles' })]),
      h('div', {}, [h('b', { txt: String(P.contrarreloj.mejor) }), h('span', { txt: 'Mejor Contrarreloj (pts)' })])
    ]));
    cuerpo.appendChild(h('p', { cls: 'nota', txt: 'Los mejores tiempos solo cuentan partidas sin pistas ni autocomprobación.' }));
  };
  pintar(); abrirCapa('Estadísticas', [cuerpo], { ancho: true });
}
export function dialogoLogros() {
  const g = h('div', { cls: 'logros' });
  PR.LOGROS.forEach((l) => g.appendChild(h('div', { cls: 'logro' + (PR.P.logros[l.id] ? ' ok' : '') }, [h('b', { txt: (PR.P.logros[l.id] ? '✓ ' : '') + l.nombre }), h('span', { txt: l.desc })])));
  abrirCapa(`Logros (${Object.keys(PR.P.logros).length}/${PR.LOGROS.length})`, [g], { ancho: true });
}
export function dialogoRanking() {
  const cu = h('div'); CU.panelRanking(cu);
  abrirCapa('Ranking', [cu, h('p', { cls: 'nota', txt: 'Tiempos: menor es mejor. Solo cuentan partidas clásicas sin ayudas.' })], { ancho: true });
}

/* ---------- ayuda ---------- */
export function dialogoAyuda() {
  const cu = [
    h('div', { cls: 'bloque', html: '<h4>Objetivo</h4><p>Rellena la cuadrícula para que cada fila, columna y caja contenga cada número una sola vez. Cada puzzle tiene una única solución que se puede deducir con lógica.</p>' }),
    h('div', { cls: 'bloque' }, [h('h4', { txt: 'Variantes' }), ...VARIANTES.map((v) => h('p', { html: `<b>${v.nombre}:</b> ${v.desc}` }))]),
    h('div', { cls: 'bloque', html: '<h4>Cómo se controla</h4><p><b>Táctil:</b> toca una celda y luego un número del teclado. Arrastra el dedo para seleccionar varias celdas; «Varias» permite tocar para añadir. Con ✎ escribes notas a lápiz. Puedes elegir «Número primero» en Ajustes.</p><p><b>Teclado:</b> 1-9, flechas, Supr, N (lápiz), H (pista), Ctrl+Z/Y.</p><p><b>Mando Xbox:</b> cruceta mueve, A coloca, LT/RT cambian número, stick derecho = menú radial, B borra, X lápiz, Y pista, LB/RB deshacer/rehacer.</p>' }),
    h('div', { cls: 'bloque' }, [h('h4', { txt: 'Pistas' }), h('p', { txt: 'El botón 💡 funciona en tres pasos: primero te señala dónde mirar, luego qué técnica aplicar y por último explica la jugada y te deja aplicarla. Las pistas descalifican la partida de los rankings y de los mejores tiempos.' })]),
    h('div', { cls: 'bloque' }, [h('h4', { txt: 'Técnicas que explica el juego' }), h('p', { txt: Object.values(NOMBRE_TEC).join(' · ') + '.' })]),
    h('div', { cls: 'bloque', html: '<h4>Dificultad</h4><p>Cada puzzle se clasifica con un solucionador lógico por la técnica más avanzada que necesita: <b>Principiante</b> (únicos), <b>Fácil</b> (únicos ocultos en filas y columnas), <b>Medio</b> (candidatos bloqueados y parejas), <b>Difícil</b> (tríos y parejas ocultas), <b>Experto</b> (X-Wing, XY-Wing) y <b>Demonio</b> (Swordfish o búsqueda con prueba y error).</p>' })
  ];
  abrirCapa('Cómo se juega', cu, { ancho: true });
}

/* ---------- pegar ---------- */
export function dialogoPegar() {
  const area = h('textarea', { cls: 'txt', rows: 5, 'data-f': 1, 'aria-label': 'Puzzle en texto', placeholder: '530070000600195000098000060800060003400803001700020006060000280000419005000080079' });
  const out = h('div', { 'aria-live': 'polite' });
  let analisis = null, c;
  const jugar = (resolver) => {
    if (!analisis) return;
    c.cerrar();
    J.nueva({ variante: analisis.puzzle.v, nivel: analisis.puzzle.nivel, puzzle: analisis.puzzle, modo: 'pegado' }).then((ok) => { if (ok && resolver) J.abrirResolucion(); });
  };
  const bAn = btn('Analizar', async () => {
    out.textContent = ''; analisis = null; bJ.disabled = bR.disabled = true;
    const r = await analizarAsync(area.value);
    if (r.error) { out.appendChild(h('p', { cls: 'nota', txt: r.error })); return; }
    analisis = r; const pz = r.puzzle;
    out.appendChild(h('p', { html: `<b>${variante(pz.v).nombre}</b> · ${pz.pistas} pistas · dificultad <b>${NIVELES[pz.nivel].nombre}</b> (${pz.puntos} puntos de dificultad)${r.unico ? '' : '<br><span class="nota">Atención: tiene varias soluciones; se usará una de ellas.</span>'}` }));
    bJ.disabled = bR.disabled = false;
  }, 'peq');
  const bJ = btn('Jugarlo', () => jugar(false), 'prim'), bR = btn('Resolver paso a paso', () => jugar(true));
  bJ.disabled = bR.disabled = true;
  c = abrirCapa('Pegar un puzzle', [
    h('p', { cls: 'nota', txt: 'Escribe o pega el puzzle como texto: 81 caracteres (también 36 para 6×6 o 16 para 4×4), con 0 o . en las celdas vacías. Si tienes una foto, transcríbela en ese formato.' }),
    area, bAn, out
  ], { pie: [bJ, bR] });
}

/* ---------- fin de partida ---------- */
export function dialogoFin(res) {
  const m = res.maraton;
  const titulo = res.gano ? (m && m.fin ? '¡Maratón completada!' : '¡Resuelto!') : (res.motivo === 'abandono' ? 'Partida abandonada' : res.motivo === 'tiempo' ? 'Se acabó el tiempo' : res.motivo === 'vidas' ? 'Sin vidas' : 'Fin de la partida');
  const cel = (b, s) => h('div', {}, [h('b', { txt: b }), h('span', { txt: s })]);
  const g = h('div', { cls: 'resumen-fin' }, [cel(fmtTiempo(res.tiempo), 'Tiempo'), cel(String(res.errores), 'Errores'), cel(String(res.pistas), 'Pistas'), cel(NIVELES[res.nivelReal].nombre, `Dificultad real · ${J.estado.p ? J.estado.p.puzzle.puntos : ''} pts`)]);
  const cu = [g];
  if (res.puntos) cu.push(h('p', { cls: 'ok-txt', txt: `Puntuación: ${res.puntos}` }));
  if (m) cu.push(h('p', { txt: `Maratón: ${m.hechos}/${12} puzzles · ${m.pts} puntos` + (m.ganados ? ` (+${m.ganados})` : '') + ` · vidas ${m.vidas}` }));
  if (res.mejoro && res.gano) cu.push(h('p', { cls: 'ok-txt', txt: '¡Nuevo mejor tiempo!' }));
  if (res.gano && res.ayudado) cu.push(h('p', { cls: 'nota', txt: 'Usaste ayudas: no cuenta para mejores tiempos ni ranking.' }));
  if (res.nuevos && res.nuevos.length) { cu.push(h('h4', { txt: 'Logros desbloqueados' })); res.nuevos.forEach((id) => { const l = PR.LOGROS.find((x) => x.id === id); if (l) cu.push(h('p', {}, [h('b', { txt: '★ ' + l.nombre + ': ' }), l.desc])); }); }
  if (res.xp && CU.usuario()) cu.push(h('p', { cls: 'nota', txt: `+${res.xp} XP` }));
  const pz = J.estado.p ? J.estado.p.puzzle : null, p = J.estado.p;
  let c; const pie = [];
  if (m && !m.fin) pie.push(btn('Siguiente puzzle', () => { c.cerrar(); const i = m.hechos; J.nueva({ variante: 'clasico', nivel: Math.min(5, J.nivelMaraton(i)), modo: 'maraton', meta: { idx: i, pts: m.pts, vidas: m.vidas }, textoCarga: 'Siguiente puzzle de la maratón…' }); }, 'prim'));
  else if (pz && res.modo !== 'diario' && res.modo !== 'semanal' && res.modo !== 'pegado') pie.push(btn('Otra partida', () => { c.cerrar(); res.modo === 'maraton' ? empezar({ modo: 'maraton' }) : J.nueva({ variante: pz.v, nivel: res.nivel, modo: res.modo }); }, 'prim'));
  if (!res.gano && p && res.motivo !== 'abandono') pie.push(btn('Ver la solución paso a paso', () => { c.cerrar(); J.abrirResolucion(); }));
  pie.push(btn('Menú', () => { c.cerrar(); J.salirAlMenu(); }));
  c = abrirCapa(titulo, cu, { pie, alCerrar: () => {} });
}
