// Dialogos de la mesa: chat, resultados de sesion, historial, gestion del anfitrion, invitar/reconectar, entrada, recompra, ayuda y pausa.
import { h, fmt, boton, dialogo, aviso, copiar, colorOk, $ } from './dom.js';
import { Sesion, invitar, expulsar } from '../marco/sesion.js';
import * as S from '../marco/sesion.js';
import { Cartera } from '../marco/cartera.js';
import * as M from '../marco/mesa.js';
import * as A from '../marco/almacen.js';
import { limitesCompra } from '../marco/economia.js';
import { aceptarRespuesta } from './red-util.js';

export const FRASES = ['¡Buena mano!', '¡Vamos!', 'Piénsalo bien…', 'Ups', '¡Qué suerte!', 'GG', 'Un momento', '¡Sube!'];
export const EMOJIS = ['😀', '😎', '😅', '😭', '🔥', '👏', '🍀', '💰', '😮', '🤔', '👍', '🙈'];

// ---------- chat ----------
let chatAbierto = null, noLeidos = 0;
export function chatDialogo(getVm, enviar) {
  if (chatAbierto) return chatAbierto.cerrar();
  const log = h('div', { cls: 'chat-log', role: 'log', 'aria-live': 'polite' });
  const inp = h('input', { type: 'text', cls: 'campo', maxlength: 160, placeholder: 'Escribe un mensaje', 'aria-label': 'Mensaje', 'data-f': 1, autocomplete: 'off' });
  const env = (t) => { t = (t || '').trim(); if (t) { enviar(t); inp.value = ''; } };
  inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') env(inp.value); if (e.key === 'Escape') chatAbierto && chatAbierto.cerrar(); });
  const frases = h('div', { cls: 'chat-rapidas' }, FRASES.map((f) => boton(f, () => env(f), 'sec chico')));
  const emojis = h('div', { cls: 'chat-emojis' }, EMOJIS.map((e) => boton(e, () => env(e), 'sec chico emoji', { 'aria-label': 'Emoji ' + e })));
  const api = dialogo({ titulo: 'Chat de la mesa', ancho: 'chat', cls: 'abajo', cuerpo: [log, h('div', { cls: 'chat-fila' }, [inp, boton('Enviar', () => env(inp.value), 'prim chico')]), frases, emojis], alCerrar: () => { chatAbierto = null; } });
  api.pintar = () => {
    const vm = getVm(); if (!vm) return;
    log.replaceChildren(...vm.chat.map((c) => h('div', { cls: 'chat-msg' }, [h('b', { txt: c.nombre + ': ', style: 'color:' + colorOk(c.color) }), c.texto])));
    log.scrollTop = log.scrollHeight;
  };
  api.pintar(); chatAbierto = api; noLeidos = 0; return api;
}
export const chatActual = () => chatAbierto;

// ---------- resultados y historial ----------
export function resultadosDialogo(vm) {
  const filas = vm.asientos.map((a, i) => ({ a, n: vm.neto[i] })).filter((x) => x.a.tipo !== 'abierto');
  const tabla = h('table', { cls: 'tabla' }, [h('thead', {}, [h('tr', {}, ['Jugador', 'Entrada', 'Fichas', 'Neto'].map((t) => h('th', { txt: t })))]),
    h('tbody', {}, filas.map(({ a, n }) => {
      const f = vm.j.jug[a.i].f; return h('tr', { cls: a.i === vm.yo ? 'yo' : '' }, [h('td', { txt: (a.avatar || '') + ' ' + a.nombre, style: 'color:' + colorOk(a.color) }), h('td', { txt: fmt(n.compras) }), h('td', { txt: fmt(f) }), h('td', { cls: n.neto >= 0 ? 'mas' : 'menos', txt: (n.neto > 0 ? '+' : n.neto < 0 ? '−' : '') + fmt(Math.abs(n.neto)) })]);
    }))]);
  const hist = vm.historial.slice().reverse().map((x) => h('li', {}, [h('b', { txt: 'Mano ' + x.n + ': ' }), (x.ganadores.join(' y ') || '—') + (x.texto ? ' (' + x.texto + ')' : '') + (vm.yo >= 0 && x.delta[vm.yo] ? ' · tú ' + (x.delta[vm.yo] > 0 ? '+' : '−') + fmt(Math.abs(x.delta[vm.yo])) : '')]));
  const st = A.stats.obtener();
  return dialogo({ titulo: 'Resultados de la sesión', cuerpo: [tabla, h('h3', { txt: 'Últimas manos' }), hist.length ? h('ul', { cls: 'lista-hist' }, hist) : h('p', { txt: 'Todavía no hay manos terminadas.' }),
    h('p', { cls: 'nota', txt: `Monedero: ${fmt(Cartera.saldo())} fichas · manos jugadas ${st.manos || 0} · ganadas ${st.ganadas || 0}` })], botones: [{ txt: 'Cerrar', cls: 'prim' }] });
}

// ---------- invitar / reconectar (anfitrion) ----------
export function invitarDialogo(vm, asientoIdx) {
  const cuerpo = h('div', { cls: 'inv' });
  const desc = h('p', { txt: asientoIdx != null && vm.asientos[asientoIdx] ? `Se reconectará ${vm.asientos[asientoIdx].nombre} sin perder sus fichas ni su mano.` : 'Envía este enlace a tu amigo; al abrirlo recibirá un código de respuesta que debes pegar aquí.' });
  const enlace = h('input', { type: 'text', readonly: '', cls: 'campo', 'aria-label': 'Enlace de invitación', 'data-f': 1 });
  const resp = h('textarea', { cls: 'campo', rows: 3, placeholder: 'Pega aquí el código de respuesta del jugador', 'aria-label': 'Código de respuesta', 'data-f': 1 });
  const est = h('p', { cls: 'estado', role: 'status' });
  const btnGen = boton('Generar enlace', async () => {
    btnGen.disabled = true; est.textContent = 'Generando enlace…';
    try { const r = await invitar(); enlace.value = r.enlace; est.textContent = 'Enlace listo (caduca en 5 minutos).'; copiar(r.enlace); cb.hidden = false; }
    catch (e) { est.textContent = 'No se pudo: ' + e.message; } btnGen.disabled = false;
  }, 'prim');
  const cb = h('div', { cls: 'fila', hidden: '' }, [boton('Copiar', () => copiar(enlace.value).then(() => aviso('Enlace copiado')), 'sec'), navigator.share ? boton('Compartir', () => navigator.share({ title: 'Mesa de cartas', text: 'Únete a mi mesa', url: enlace.value }).catch(() => {}), 'sec') : null]);
  const btnOk = boton('Conectar jugador', async () => {
    if (!resp.value.trim()) { est.textContent = 'Pega primero el código de respuesta.'; return; }
    btnOk.disabled = true; est.textContent = 'Conectando…';
    try { await aceptarRespuesta(resp.value); est.textContent = 'Jugador conectado.'; resp.value = ''; aviso('Jugador conectado', '#6dff6d'); } catch (e) { est.textContent = e.message; }
    btnOk.disabled = false;
  }, 'prim');
  cuerpo.append(desc, btnGen, enlace, cb, resp, btnOk, est);
  return dialogo({ titulo: asientoIdx != null ? 'Reconectar jugador' : 'Invitar jugador', cuerpo: [cuerpo], botones: [{ txt: 'Cerrar', cls: 'sec' }] });
}

// ---------- gestion de la mesa (anfitrion) ----------
export function gestionDialogo(vm, refrescar) {
  const lista = h('div', { cls: 'gestion' });
  const pintar = () => {
    const v = Sesion.vm || vm; lista.replaceChildren();
    v.asientos.forEach((a, i) => {
      const f = v.j.jug[i] ? v.j.jug[i].f : 0;
      const acc = [];
      if (a.tipo === 'humano' && !a.host) {
        acc.push(boton(a.silenciado ? 'Quitar silencio' : 'Silenciar', () => { M.silenciar(Sesion.m, i); refrescar(); pintar(); }, 'sec chico'));
        acc.push(boton('Expulsar', () => { expulsar(i); pintar(); }, 'peligro chico'));
        if (!a.conectado) acc.push(boton('Reconectar', () => invitarDialogo(v, i), 'prim chico'));
      }
      if (a.tipo === 'bot') {
        acc.push(boton('Cambiar por humano', () => { if (M.abrirAsiento(Sesion.m, Sesion.J, i)) { aviso('Asiento abierto'); refrescar(); pintar(); } else aviso('Solo entre manos', '#ffd23d'); }, 'sec chico'));
        ['novato', 'medio', 'experto'].forEach((n) => { if (n !== a.nivel) acc.push(boton(n, () => { if (M.ponerBot(Sesion.m, Sesion.J, i, n)) { refrescar(); pintar(); } else aviso('Solo entre manos', '#ffd23d'); }, 'sec chico')); });
      }
      if (a.tipo === 'abierto') {
        acc.push(boton('Invitar', () => invitarDialogo(v), 'prim chico'));
        ['novato', 'medio', 'experto'].forEach((n) => acc.push(boton('Bot ' + n, () => { if (M.ponerBot(Sesion.m, Sesion.J, i, n)) { refrescar(); pintar(); } else aviso('Solo entre manos', '#ffd23d'); }, 'sec chico')));
      }
      lista.appendChild(h('div', { cls: 'g-fila' }, [h('div', { cls: 'g-nom', style: 'color:' + colorOk(a.color) }, [(a.tipo === 'abierto' ? '＋' : a.tipo === 'bot' ? '🤖' : a.avatar || '🙂') + ' ' + (a.nombre || 'Asiento libre'), h('small', { txt: a.tipo === 'humano' ? (a.host ? ' anfitrión' : a.conectado ? ' conectado' : ' sin conexión') : a.tipo === 'bot' ? ' bot ' + a.nivel : '' }), a.tipo !== 'abierto' ? h('small', { txt: ' · ' + fmt(f) + ' fichas' }) : null]), h('div', { cls: 'g-acc' }, acc)]));
    });
    if (v.espectadores.length) lista.appendChild(h('p', { cls: 'nota', txt: 'Espectadores: ' + v.espectadores.join(', ') }));
  };
  pintar();
  return dialogo({ titulo: 'Gestionar mesa', cuerpo: [lista, h('p', { cls: 'nota', txt: 'Conexiones simultáneas: hasta 3 jugadores o espectadores además del anfitrión. Los cambios de asiento se aplican entre manos.' })], botones: [{ txt: 'Invitar o reconectar jugador', cls: 'prim', fn: () => invitarDialogo(vm), cerrar: false }, { txt: 'Cerrar', cls: 'sec' }] });
}

// ---------- entrada a mesa (cliente) y recompra ----------
export function entradaDialogo(o, alDecidir) {
  const sal = Cartera.saldo(), l = o.torneo ? { min: o.def, max: o.def } : limitesCompra({ compraMin: o.min, compraMax: o.max, tope: o.tope });
  const tope = Math.min(l.max, sal), minimo = l.min;
  let valor = Math.max(minimo, Math.min(tope, o.def));
  const num = h('output', { cls: 'a-valor grande', txt: fmt(valor) });
  const rng = h('input', { type: 'range', cls: 'a-slider', min: minimo, max: Math.max(minimo, tope), step: 1, value: valor, 'data-f': 1, 'aria-label': 'Fichas de entrada' });
  rng.addEventListener('input', () => { valor = +rng.value; num.textContent = fmt(valor); });
  const puede = sal >= minimo && o.libres > 0;
  const cuerpo = [h('p', { txt: `${o.anfitrion} te invita a ${o.nombre}.` }), h('p', { txt: `Asientos libres: ${o.libres}. Tu monedero: ${fmt(sal)} fichas.` })];
  if (puede) cuerpo.push(h('p', { txt: o.torneo ? `Inscripción de torneo: ${fmt(o.def)} fichas (recibes fichas de torneo).` : `Entrada (mínimo ${fmt(minimo)}, máximo ${fmt(l.max)}):` }), num, o.torneo ? null : rng);
  else cuerpo.push(h('p', { cls: 'aviso-p', txt: o.libres <= 0 ? 'No hay asientos libres: puedes mirar como espectador.' : 'No tienes fichas suficientes para la entrada mínima.' }));
  return dialogo({ titulo: 'Entrar a la mesa', cerrable: false, cuerpo, botones: [puede ? { txt: 'Sentarme', cls: 'prim', fn: () => alDecidir({ compra: o.torneo ? o.def : valor, espectador: false }) } : null, { txt: 'Solo mirar', cls: 'sec', fn: () => alDecidir({ compra: 0, espectador: true }) }].filter(Boolean) });
}
export function recompraDialogo(vm, alDecidir) {
  const cfg = vm.cfg, sal = Cartera.saldo(), yo = vm.yo, f = vm.j.jug[yo] ? vm.j.jug[yo].f : 0;
  const l = limitesCompra({ compraMin: cfg.compraMin, compraMax: cfg.compraMax, tope: cfg.tope }), max = Math.min(l.max, sal, cfg.tope > 0 ? cfg.tope - f : Infinity);
  if (max < l.min) return dialogo({ titulo: 'Recompra', cuerpo: ['No puedes recomprar ahora (saldo insuficiente o tope de la mesa).'], botones: [{ txt: 'Cerrar', cls: 'prim' }] });
  let v = Math.min(max, Math.max(l.min, vm.cfg.compraDef || l.min));
  const num = h('output', { cls: 'a-valor grande', txt: fmt(v) }), rng = h('input', { type: 'range', cls: 'a-slider', min: l.min, max, step: 1, value: v, 'data-f': 1, 'aria-label': 'Fichas a recomprar' });
  rng.addEventListener('input', () => { v = +rng.value; num.textContent = fmt(v); });
  return dialogo({ titulo: 'Recomprar fichas', cuerpo: [h('p', { txt: `Monedero: ${fmt(sal)} fichas. Mínimo ${fmt(l.min)}, máximo ${fmt(max)}.` }), num, rng], botones: [{ txt: 'Cancelar', cls: 'sec' }, { txt: 'Recomprar', cls: 'prim', fn: () => alDecidir(v) }] });
}
export function solicitudDialogo(info, decidir) {
  let hecho = false;
  const fin = (ok) => { if (!hecho) { hecho = true; decidir(ok); } };
  const d = dialogo({ titulo: 'Solicitud de asiento', cerrable: false, cuerpo: [`${info.nombre} quiere sentarse en tu mesa privada con ${fmt(info.compra || 0)} fichas.`], botones: [{ txt: 'Rechazar', cls: 'sec', fn: () => fin(false) }, { txt: 'Aceptar', cls: 'prim', fn: () => fin(true) }] });
  setTimeout(() => { if (!hecho) { fin(false); d.cerrar(); } }, 60000);
  return d;
}

// ---------- ayuda y pausa ----------
export function ayudaDialogo(UI) {
  const t = UI.texto;
  return dialogo({ titulo: 'Ayuda · ' + t.nombre, cuerpo: [...t.ayuda.map((x) => h('p', { txt: x })),
    h('h3', { txt: 'Controles' }),
    h('ul', { cls: 'lista-ayuda' }, [
      h('li', { html: '<b>Táctil:</b> toca un botón de acción; desliza la barra para elegir cuánto apostar y usa ½ ¾ Pot All-in.' }),
      h('li', { html: '<b>Teclado:</b> F retirarse · C pasar/igualar · R subir · A all-in · ↑/↓ cantidad (Mayús ×10) · T chat · Esc menú.' }),
      h('li', { html: '<b>Mando Xbox:</b> cruceta/stick mueve el foco · A confirma · B retira o pasa · LB/RB cambia la cantidad · X chat · MENU pausa.' })]),
    h('p', { cls: 'nota', txt: 'Solo se usan fichas virtuales sin valor real.' })], botones: [{ txt: 'Entendido', cls: 'prim' }] });
}
export function pausaDialogo(acc) {
  const b = [
    { txt: 'Continuar', cls: 'prim' }, { txt: 'Resultados', cls: 'sec', fn: acc.resultados, cerrar: false }, { txt: 'Ajustes', cls: 'sec', fn: acc.ajustes, cerrar: false },
    { txt: 'Ayuda', cls: 'sec', fn: acc.ayuda, cerrar: false },
  ];
  if (acc.gestion) b.push({ txt: 'Gestionar mesa', cls: 'sec', fn: acc.gestion, cerrar: false });
  if (acc.levantarse) b.push({ txt: 'Levantarme de la mesa', cls: 'sec', fn: acc.levantarse });
  b.push({ txt: acc.esAnfitrion ? 'Terminar sesión y cobrar' : 'Salir de la mesa', cls: 'peligro', fn: acc.salir });
  b.push({ txt: 'Volver al menú (guardar)', cls: 'sec', fn: acc.menu });
  return dialogo({ titulo: 'Pausa', cuerpo: [h('p', { txt: acc.texto || '' })], botones: b, cls: 'vertical' });
}
