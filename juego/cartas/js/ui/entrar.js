// Pantalla "Entrar a sesion": monedero, perfil, mesas guardadas, crear mesa y unirse por enlace.
import { h, fmt, boton, aviso, dialogo, confirmar } from './dom.js';
import { Cartera } from '../marco/cartera.js';
import * as A from '../marco/almacen.js';
import { AVATARES } from '../marco/mesa.js';
import { LOGROS, grupoDe } from '../marco/progreso.js';
import { CATALOGO } from '../juegos/registro.js';
import { extraerCodigo, extraerMesa } from './red-util.js';

function hace(t) { const s = Math.max(0, (Date.now() - t) / 1000); return s < 90 ? 'hace un momento' : s < 5400 ? 'hace ' + Math.round(s / 60) + ' min' : s < 172800 ? 'hace ' + Math.round(s / 3600) + ' h' : 'hace ' + Math.round(s / 86400) + ' días'; }

export function pantallaEntrar(cont, acc) {
  const raiz = h('div', { cls: 'tarjeta entrar' });
  cont.replaceChildren(raiz);
  function pintar() {
    const idx = A.mesas.indice(), ids = Object.keys(idx).sort((a, b) => (idx[b].t || 0) - (idx[a].t || 0));
    const saldo = h('b', { cls: 'saldo-num', txt: fmt(Cartera.saldo()) });
    const regalo = Cartera.puedeRegalo() ? boton('Regalo diario +' + fmt(A.ajustes.obtener().economia.regalo), () => { const g = Cartera.regalo(); aviso('Recibiste ' + fmt(g) + ' fichas de cortesía', '#ffd23d'); pintar(); }, 'prim chico') : h('small', { txt: 'Regalo diario ya reclamado' });
    const perfil = h('div', { cls: 'perfil' });
    if (window.Lobby) window.Lobby.editorPerfil(perfil);
    const av = A.ajustes.obtener().mesa.avatar;
    perfil.appendChild(h('div', { cls: 'avatares', role: 'group', 'aria-label': 'Avatar' }, AVATARES.map((a) => h('button', { type: 'button', cls: 'avatar-op' + (a === av ? ' on' : ''), 'data-f': 1, 'aria-pressed': String(a === av), 'aria-label': 'Avatar ' + a, txt: a, on: { click: () => { const x = A.ajustes.obtener(); x.mesa.avatar = a; A.ajustes.guardar(x); pintar(); } } }))));
    const guardadas = ids.map((id) => {
      const t = idx[id], cat = CATALOGO[t.juego] || { corto: t.juego };
      if (t.rol === 'anfitrion') return h('div', { cls: 'guardada' }, [h('div', {}, [h('b', { txt: cat.corto + ' · mano ' + (t.mano || 0) }), h('small', { txt: ` tus fichas en mesa: ${fmt(t.fichas || 0)} · ${hace(t.t || 0)}` })]),
        h('div', { cls: 'fila' }, [boton('Continuar', () => acc.continuar(id), 'prim chico'), boton('Cobrar y cerrar', () => confirmar('Se cierra la mesa y tus fichas vuelven al monedero.', 'Cerrar mesa', () => { const c = acc.liquidar(id); aviso('Cobraste ' + fmt(c) + ' fichas', '#6dff6d'); pintar(); }, 'Cobrar'), 'sec chico')])]);
      return h('div', { cls: 'guardada' }, [h('div', {}, [h('b', { txt: 'Tu asiento en ' + cat.corto }), h('small', { txt: (t.anfitrion ? ' de ' + t.anfitrion : '') + ' · ' + hace(t.t || 0) + ' · pide al anfitrión un enlace nuevo con «Reconectar jugador»' })]),
        h('div', { cls: 'fila' }, [boton('Pegar enlace nuevo', () => acc.unirse(id), 'prim chico'), boton('Olvidar', () => confirmar('Si el anfitrión no te cobra, perderás las fichas que tenías en esa mesa.', 'Olvidar asiento', () => { A.mesas.olvidar(id); pintar(); }), 'sec chico')])]);
    });
    const logros = A.logros.obtener();
    raiz.replaceChildren(...[
      h('a', { cls: 'volver', href: '../', txt: '← Menú' }),
      h('h1', { cls: 'logo', html: '<span>CARTAS</span>' }), h('p', { cls: 'sub', txt: 'Póker · Veintiuno · Siete y medio · Dompe · Conquián · Ve a pescar' }),
      h('div', { cls: 'monedero', role: 'status' }, [h('span', { txt: '🪙 Monedero: ' }), saldo, h('span', { txt: ' fichas' }), regalo]),
      h('p', { cls: 'nota', txt: 'Solo fichas virtuales: nunca dinero real.' }),
      guardadas.length ? h('section', { cls: 'guardadas' }, [h('h2', { txt: 'Mesas guardadas' }), ...guardadas]) : null,
      h('div', { cls: 'fila grande' }, [boton('Crear mesa', acc.crear, 'prim grande'), boton('Unirme con enlace', () => acc.unirse(''), 'sec grande')]),
      h('details', { cls: 'grupo' }, [h('summary', { txt: 'Mi perfil y avatar' }), perfil]),
      h('div', { cls: 'fila' }, [boton('Ajustes', acc.ajustes, 'sec'), boton('Ayuda', acc.ayuda, 'sec'), boton('Logros (' + Object.keys(logros).length + '/' + LOGROS.length + ')', () => logrosDialogo(), 'sec')]),
      h('p', { cls: 'nota', txt: 'Para jugar con amigos: crea una mesa, pulsa «Invitar jugador» y envía el enlace. Si alguien se cae, pulsa «Reconectar jugador» y le das un enlace nuevo sin perder fichas ni mano.' })].filter(Boolean));
  }
  pintar();
  return { pintar };
}
export function logrosDialogo() {
  const l = A.logros.obtener(), st = A.stats.obtener();
  return dialogo({ titulo: 'Logros y estadísticas', cuerpo: [h('p', { cls: 'nota', txt: `Manos jugadas ${st.manos || 0} · ganadas ${st.ganadas || 0} · mayor bote ${fmt(st.mayorBote || 0)} · sesiones ${st.sesiones || 0}` }),
    h('ul', { cls: 'logros' }, LOGROS.flatMap((x, k) => [(k === 0 || grupoDe(LOGROS[k - 1].id) !== grupoDe(x.id)) ? h('li', { cls: 'grupo-logro', txt: grupoDe(x.id) }) : null, h('li', { cls: l[x.id] ? 'ok' : '' }, [h('b', { txt: (l[x.id] ? '★ ' : '☆ ') + x.nombre }), h('small', { txt: ' ' + x.descripcion })])].filter(Boolean)))], botones: [{ txt: 'Cerrar', cls: 'prim' }] });
}
export function unirseDialogo(preMesa, alUnir) {
  const area = h('textarea', { cls: 'campo', rows: 3, placeholder: 'Pega el enlace de invitación (o el código)', 'aria-label': 'Enlace de invitación', 'data-f': 1 });
  return dialogo({ titulo: preMesa ? 'Volver a tu asiento' : 'Unirme con enlace', cuerpo: [h('p', { txt: preMesa ? 'Pega el enlace nuevo que te generó el anfitrión con «Reconectar jugador». Recuperarás tu asiento, tus fichas y tu mano.' : 'Pega el enlace que te envió el anfitrión. Luego tendrás que devolverle un código de respuesta.' }), area,
    boton('Pegar del portapapeles', () => { if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then((t) => { area.value = t.trim(); }, () => aviso('Pega con Ctrl+V o mantén pulsado', '#ffd23d')); }, 'sec chico')],
  botones: [{ txt: 'Cancelar', cls: 'sec' }, { txt: 'Continuar', cls: 'prim', cerrar: false, fn: (api) => { const c = extraerCodigo(area.value); if (!c) { aviso('El enlace no es válido', '#ff6b6b'); return; } api.cerrar(); alUnir(c, extraerMesa(area.value) || preMesa || ''); } }] });
}
