// Interfaz de la cuenta de la plataforma: perfil, ranking (Global/Amigos), bloque "Cuenta y nube". Todo con [data-f] para mando y tactil.
import { h, fmt, boton, aviso, dialogo, confirmar, colorOk } from './dom.js';
import * as Cta from '../marco/cuenta.js';
import { MODOS_PUNTAJE } from '../marco/progreso.js';

const C = () => window.Cuenta;

// ---------- cuenta ----------
export function insignia(usr) {
  return h('span', { cls: 'cta-punto', style: '--c:' + colorOk(usr.color) });
}
export function barraCuenta(abrir) {
  const u = Cta.usuario(); if (!u) return null;
  return h('button', { type: 'button', cls: 'btn sec chico cta-barra', 'data-f': 1, 'aria-label': 'Cuenta de ' + u.nombre, on: { click: abrir } }, [insignia(u), h('span', { txt: u.nombre }), h('small', { txt: 'Nv. ' + u.nivel })]);
}
export function cuentaDialogo() {
  const u = Cta.usuario();
  if (!u) return dialogo({ titulo: 'Cuenta', cuerpo: ['Estás jugando sin cuenta. Inicia sesión desde el portal para guardar tu progreso en la nube y entrar a los rankings.'], botones: [{ txt: 'Ir al portal', cls: 'prim', fn: () => { location.href = C() ? C().portalUrl() : '../'; } }, { txt: 'Cerrar', cls: 'sec' }] });
  const ni = u.nivelInfo || {};
  const cuerpo = [
    h('div', { cls: 'cta-perfil' }, [insignia(u), h('div', {}, [h('b', { txt: u.nombre }), h('small', { txt: 'Nivel ' + u.nivel + ' · ' + fmt(u.xp) + ' XP' + (ni.siguiente ? ' · siguiente nivel a los ' + fmt(ni.siguiente) + ' XP' : '') })])]),
    C().demo ? h('p', { cls: 'nota', txt: 'Modo demo: tu cuenta vive solo en este dispositivo.' }) : null,
    h('p', { cls: 'nota', txt: 'Tu nombre y color de la cuenta son los que ven los demás jugadores en la mesa. Puedes cambiarlos en el portal.' }),
    h('div', { cls: 'fila' }, [
      boton('Ir al portal', () => { location.href = C().portalUrl(); }, 'sec'),
      boton('Cerrar sesión', () => confirmar('Se cierra tu sesión en este dispositivo. Tu progreso queda guardado en la nube y en este navegador.', 'Cerrar sesión', async () => { try { await Cta.enviarPuntajesYa(); await C().nube.sincronizar(Cta.ID, Cta.CLAVES_NUBE, { preguntar: false }); } catch (e) {} try { await C().salir(); } catch (e) {} location.reload(); }, 'Cerrar sesión'), 'peligro')]),
  ];
  return dialogo({ titulo: 'Cuenta', cuerpo, botones: [{ txt: 'Cerrar', cls: 'prim' }] });
}

// ---------- ranking ----------
const ETQ = { monedero: 'Monedero', bote: 'Mayor bote', dompe_racha: 'Racha Dompe', conq_turnos: 'Conquián rápido', pesc_libros: 'Pescar: libros' };
export function rankingDialogo(modoIni) {
  let modo = ETQ[modoIni] ? modoIni : 'monedero', alcance = 'global', token = 0, ultimo = 'm:' + (ETQ[modoIni] ? modoIni : 'monedero');
  const chips = h('div', { cls: 'fila cta-chips', role: 'group', 'aria-label': 'Modo de ranking' }), tabs = h('div', { cls: 'tabs', role: 'tablist' });
  const lista = h('div', { cls: 'cta-lista', role: 'status', 'aria-live': 'polite' }), pie = h('p', { cls: 'nota' });
  function pintarBarras() {
    chips.replaceChildren(...MODOS_PUNTAJE.map((m) => h('button', { type: 'button', cls: 'btn chico' + (m.id === modo ? ' prim' : ' sec'), 'data-f': 1, 'aria-pressed': String(m.id === modo), txt: ETQ[m.id] || m.nombre, 'data-k': 'm:' + m.id, on: { click: () => { modo = m.id; ultimo = 'm:' + m.id; cargar(); } } })));
    tabs.replaceChildren(...[['global', 'Global'], ['amigos', 'Amigos']].map(([id, n]) => h('button', { type: 'button', cls: 'btn tab' + (id === alcance ? ' on' : ''), 'data-f': 1, role: 'tab', 'aria-selected': String(id === alcance), txt: n, 'data-k': 'a:' + id, on: { click: () => { alcance = id; ultimo = 'a:' + id; cargar(); } } })));
    const f = d && d.el.querySelector('[data-k="' + ultimo + '"]'); if (f) f.focus({ preventScroll: true }); // el foco (mando/teclado) sobrevive al repintado
  }
  async function cargar() {
    const mi = ++token, def = MODOS_PUNTAJE.find((m) => m.id === modo);
    pintarBarras(); pie.textContent = def.nombre + (def.mayorEsMejor ? '' : ' (menos es mejor)');
    if (!Cta.hay()) { lista.replaceChildren(h('p', { cls: 'nota', txt: 'Inicia sesión desde el portal para ver los rankings.' })); return; }
    lista.replaceChildren(h('p', { cls: 'nota cta-carga', txt: 'Cargando ranking…' }));
    try {
      await Cta.enviarPuntajesYa();
      const [top, yo] = await Promise.all([C().top(Cta.ID, modo, 10, { soloAmigos: alcance === 'amigos' }), C().miPosicion(Cta.ID, modo).catch(() => null)]);
      if (mi !== token) return;
      if (!top.length) lista.replaceChildren(h('p', { cls: 'nota', txt: alcance === 'amigos' ? 'Ni tú ni tus amigos tienen puntaje en este modo todavía. Agrega amigos desde el portal.' : 'Aún no hay puntajes en este modo. ¡Sé el primero!' }));
      else lista.replaceChildren(h('ol', { cls: 'cta-top' }, top.map((e) => h('li', { cls: e.yo ? 'yo' : '' }, [h('span', { cls: 'pos', txt: '#' + e.pos }), h('span', { cls: 'cta-punto', style: '--c:' + colorOk(e.color) }), h('span', { cls: 'nom', txt: e.nombre + (e.yo ? ' (tú)' : '') }), h('b', { txt: fmt(e.valor) + ' ' + (def.unidad || '') })]))));
      if (yo && yo.posicion) pie.textContent = def.nombre + ' · tu posición: #' + yo.posicion + (yo.total ? ' de ' + yo.total : '') + ' con ' + fmt(yo.valor) + ' ' + (def.unidad || '');
    } catch (e) {
      if (mi !== token) return;
      lista.replaceChildren(h('p', { cls: 'nota', txt: 'No se pudo cargar el ranking (' + ((C() && C().mensajeError) ? C().mensajeError(e) : 'sin conexión') + ').' }), boton('Reintentar', cargar, 'sec chico'));
    }
  }
  let d = null;
  d = dialogo({ titulo: 'Ranking', ancho: 'ancho', cuerpo: [chips, tabs, lista, pie], botones: [{ txt: 'Cerrar', cls: 'prim' }] });
  cargar(); setTimeout(() => { const f = d.el.querySelector('[data-k="' + ultimo + '"]'); if (f) f.focus({ preventScroll: true }); }, 60); return d;
}

// ---------- bloque "Cuenta y nube" (Ajustes > Datos) ----------
export function bloqueNube() {
  const u = Cta.usuario();
  if (!u) return h('section', { cls: 'cta-nube' }, [h('h3', { txt: 'Cuenta y nube' }), h('p', { cls: 'nota', txt: 'Sin sesión: el progreso solo se guarda en este dispositivo. Inicia sesión desde el portal para sincronizarlo.' })]);
  const est = h('p', { cls: 'nota', role: 'status', 'aria-live': 'polite' });
  const pintar = () => { est.textContent = Cta.estadoNube().texto; };
  const btn = boton('Sincronizar ahora', async () => {
    btn.disabled = true; est.textContent = 'Sincronizando…';
    const r = await Cta.sincronizarAhora(); btn.disabled = false; pintar();
    aviso({ igual: 'Todo está al día', subido: 'Progreso subido a la nube', bajado: 'Progreso descargado de la nube', sinRed: 'Sin conexión: se reintentará solo', cancelado: 'Sincronización pospuesta', sinSesion: 'Sin sesión' }[r.estado] || 'Listo', r.estado === 'sinRed' ? '#ffd23d' : '#6dff6d');
  }, 'prim');
  const off = Cta.alEstado(pintar); pintar();
  const caja = h('section', { cls: 'cta-nube' }, [h('h3', { txt: 'Cuenta y nube' }), h('div', { cls: 'cta-perfil' }, [insignia(u), h('div', {}, [h('b', { txt: u.nombre }), h('small', { txt: C().demo ? 'Modo demo (solo este dispositivo)' : 'Cuenta en la nube' })])]),
    est, h('div', { cls: 'fila' }, [btn, boton('Ver ranking', () => rankingDialogo(), 'sec')]),
    h('p', { cls: 'nota', txt: 'Se sincronizan monedero, estadísticas, logros e historial. Los ajustes de gráficos, audio y controles son de cada dispositivo. Si tu progreso cambió aquí y en otro dispositivo, la plataforma te pedirá elegir qué versión conservar.' })]);
  caja.limpiar = off; return caja;
}
