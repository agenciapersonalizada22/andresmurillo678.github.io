// HUD de la partida: jugadores, bandeja de bolas, mensajes, barra de fuerza y estado de controles.
import { h, $ } from './dom.js';
import { Partida } from './partida.js';
import { esCarom, textoGrupo, grupoDe, MODOS } from './reglas.js';
import { colorBola } from './mesa3d.js';
import { A } from './ajustes.js';
import { pintarEfecto } from './entrada.js';

export const bolita = (id, dalto, extra = '') => {
  const col = id === 0 ? '#f4f1e8' : colorBola(id, dalto);
  return h('span', { cls: 'bolita ' + (id > 8 ? 'raya ' : '') + extra, style: '--c:' + col, 'aria-label': 'Bola ' + id }, [h('b', { txt: id ? String(id) : '' })]);
};

let temporizador = 0;
export function mensaje(txt, tipo = '') {
  const m = $('#mensaje');
  m.textContent = txt; m.className = tipo ? 'on ' + tipo : 'on';
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { m.className = ''; }, tipo === 'falta' ? 3600 : 2400);
  const a = $('#aria'); if (a) a.textContent = txt;
}
export function toast(txt, color) {
  const cont = $('#toasts'); if (!cont) return;
  const t = h('div', { cls: 'aviso', txt, style: color ? '--c:' + color : '' });
  cont.appendChild(t); setTimeout(() => t.remove(), 2800);
}

export function pintarJugadores() {
  const cont = $('#jugadores'); cont.textContent = '';
  const E = Partida.E; if (!E) return;
  cont.style.setProperty('--n', String(Partida.asientos.length));
  Partida.asientos.forEach((a, i) => {
    let sub = '';
    if (E.modo === 'bola8') sub = E.grupos[i] ? `${textoGrupo(E.grupos[i])} · quedan ${E.mesa.filter((id) => grupoDe(id) === E.grupos[i]).length}` : 'Mesa abierta';
    else if (E.modo === 'bola9') sub = E.faltas[i] ? `Faltas seguidas: ${E.faltas[i]}/3` : 'Bola más baja primero';
    else sub = `${E.puntos[i]} / ${E.objetivo} carambolas`;
    const etq = a.tipo === 'bot' ? ` · Bot ${['', 'Nv1', 'Nv2', 'Nv3'][a.nivel || 2]}` : (a.ausente ? ' · desconectado' : (a.tipo === 'local' && Partida.cfg.online ? ' · tú' : ''));
    const bolaCarom = esCarom(E.modo) ? h('span', { cls: 'cb ' + (i % 2 ? 'am' : 'bl') }) : null;
    cont.appendChild(h('div', { cls: 'chip' + (E.turno === i && E.fase !== 'fin' ? ' turno' : '') + (a.ausente ? ' ausente' : ''), style: '--c:' + (a.color || '#3df5ff') }, [
      h('span', { cls: 'av' }, [bolaCarom || h('b', { txt: (a.nombre || '?').slice(0, 1).toUpperCase() })]),
      h('div', { cls: 'datos' }, [h('span', { cls: 'nom', txt: (a.nombre || 'Jugador') + etq }), h('span', { cls: 'sub', txt: sub })])
    ]));
  });
}

export function pintarBandeja() {
  const cont = $('#bandeja'); cont.textContent = '';
  const E = Partida.E; if (!E || esCarom(E.modo)) { cont.hidden = true; return; }
  cont.hidden = false;
  const total = E.modo === 'bola8' ? 15 : 9, dalto = A.acc.daltonismo;
  for (let id = 1; id <= total; id++) cont.appendChild(bolita(id, dalto, E.mesa.includes(id) ? 'en-mesa' : 'fuera'));
}

export function pintarPotencia() {
  const ap = Partida.ap, c = $('#potencia'); if (!c || !ap) return;
  c.style.setProperty('--p', Math.round(ap.pot * 100) + '%');
  c.querySelector('output').textContent = Math.round(ap.pot * 100) + '%';
  pintarEfecto();
}

/* estado de controles segun la fase y el turno */
export function pintarEstado() {
  const E = Partida.E, f = Partida.fase; if (!E) return;
  const mio = Partida.turnoLocal(), as = Partida.asientoTurno();
  const body = document.body;
  body.classList.toggle('mi-turno', mio && (f === 'apuntando' || f === 'colocando'));
  body.classList.toggle('colocando', mio && f === 'colocando');
  body.classList.toggle('rodando', f === 'rodando' || f === 'golpeando');
  let t = '';
  if (f === 'fin') t = 'Partida terminada';
  else if (f === 'rodando' || f === 'golpeando' || f === 'asentando' || f === 'esperaRes') t = '';
  else if (mio && f === 'colocando') t = E.mano === 'cabecera' ? 'Saque: coloca la blanca detrás de la línea' : 'Bola en mano: coloca la blanca donde quieras';
  else if (mio) t = esCarom(E.modo) ? 'Tu turno · tu bola es la ' + (E.turno % 2 ? 'amarilla' : 'blanca') : 'Tu turno';
  else t = as.ausente ? `Esperando a ${as.nombre}…` : (as.tipo === 'bot' ? `${as.nombre} está pensando…` : `Turno de ${as.nombre}`);
  $('#infoGolpe').textContent = t;
  $('#bTirar').disabled = !(mio && f === 'apuntando');
  $('#bConfirmar').hidden = !(mio && f === 'colocando');
  $('#potencia').classList.toggle('inactivo', !(mio && f === 'apuntando'));
  $('#efecto').classList.toggle('inactivo', !(mio && (f === 'apuntando' || f === 'colocando')));
  $('#bCentrar').textContent = 'Efecto: ' + efectoTexto();
}
export function efectoTexto() {
  const ap = Partida.ap; if (!ap) return 'centro';
  const a = ap.a, b = ap.b, m = Math.hypot(a, b);
  if (m < 0.06) return 'centro';
  const v = Math.abs(b) > 0.06 ? (b > 0 ? 'seguir' : 'retro') : '', l = Math.abs(a) > 0.06 ? (a > 0 ? 'der.' : 'izq.') : '';
  return [v, l].filter(Boolean).join(' + ');
}
export const nombreModo = (id) => (MODOS[id] ? MODOS[id].nombre : id);
