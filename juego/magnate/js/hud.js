// HUD: fichas de jugadores, barra de acciones contextual, mini ficha de casilla y textos flotantes.
import { X, dinero } from './contexto.js';
import { h, boton, $, hojaAbierta, cerrarHojaId, refrescarHojas, confirmar } from './dom.js';
import { CASILLAS, GRUPOS } from './datos.js';
import { patrimonio, calcularRenta } from './reglas.js';
import { abrirJugador, abrirPropiedades, abrirTratos, abrirRegistro, abrirChat, abrirSubasta, abrirCasilla } from './hojas.js';
import { A } from './ajustes.js';

let ultimoTratoAbierto = 0, tMini = 0;
const nom = (j) => (j === X.yo ? 'Tú' : X.E.jug[j].nombre);
const fmtT = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

export function pintarJugadores() {
  const E = X.E, cont = $('jugs'); cont.textContent = '';
  const tot = E.jug.map((p) => patrimonio(E, p.id)), max = Math.max(1, ...tot);
  E.jug.forEach((p) => {
    const c = h('button', { type: 'button', cls: 'chipj' + (p.id === E.turno && E.fase !== 'fin_partida' ? ' turno' : '') + (p.quebrado ? ' quebrado' : '') + (p.id === X.yo ? ' yo' : ''), style: '--c:' + p.color, 'data-f': 1, 'aria-label': p.nombre + ', efectivo ' + p.din + ', patrimonio ' + tot[p.id] },
      h('span', { cls: 'jn' }, h('i', { cls: 'pt' }), p.id === X.yo ? 'Tú' : p.nombre.slice(0, 8), p.tipo === 'bot' ? h('em', {}, '🤖') : null, p.carcel ? h('em', {}, '⛓') : null, p.sinConexion ? h('em', {}, '⚠') : null),
      h('b', {}, dinero(p.din)), h('span', { cls: 'jb' }, h('i', { style: 'width:' + (tot[p.id] / max * 100) + '%' })));
    c.addEventListener('click', () => abrirJugador(p.id));
    cont.appendChild(c);
  });
}

function contexto(E) {
  const yo = X.yo, mt = E.turno === yo, j = E.jug[E.turno], d = E.dados[0] ? ' 🎲 ' + E.dados[0] + ' + ' + E.dados[1] + ' = ' + (E.dados[0] + E.dados[1]) : '';
  switch (E.fase) {
    case 'fin_partida': return 'Partida terminada.';
    case 'tirar': return mt ? (j.carcel ? 'Estás en la cárcel (intento ' + (j.intentos + 1) + ' de 3): saca dobles, paga o usa tarjeta.' : 'Tu turno: tira los dados.') : 'Turno de ' + j.nombre + '.';
    case 'compra': return mt ? CASILLAS[j.pos].nombre + ' cuesta ' + dinero(CASILLAS[j.pos].precio) + '. ¿La compras?' + d : j.nombre + ' decide si compra ' + CASILLAS[j.pos].nombre + '.';
    case 'deuda': return mt ? 'Debes ' + dinero(E.deuda.monto) + ' (' + E.deuda.motivo + '). Reúne dinero o declárate en bancarrota.' : j.nombre + ' debe reunir ' + dinero(E.deuda.monto) + '.';
    case 'fin': return (mt ? 'Puedes construir, negociar o terminar tu turno.' : j.nombre + ' termina su turno.') + d;
    case 'subasta': return 'Subasta de ' + CASILLAS[E.subasta.i].nombre + ': ' + (E.subasta.lider >= 0 ? dinero(E.subasta.monto) + ' de ' + nom(E.subasta.lider) : 'sin pujas') + '.';
    default: return '';
  }
}

export function pintarBarra() {
  const E = X.E, yo = X.yo, mt = E.turno === yo, p = $('prim'), s = $('sec');
  $('ctx').textContent = contexto(E);
  p.textContent = ''; s.textContent = '';
  const me = E.jug[yo];
  if (E.fase === 'fin_partida') p.appendChild(boton('Ver resultados', () => X.verFin(), 'prim grande'));
  else if (yo >= 0 && !me.quebrado) {
    if (mt && E.fase === 'tirar') {
      p.appendChild(boton('🎲 Tirar dados', () => X.accion({ t: 'tirar' }), 'prim grande', { 'data-pref': 1, id: 'btnPrim' }));
      if (me.carcel) {
        p.appendChild(boton('Pagar fianza ' + dinero(E.cfg.multaCarcel), () => X.accion({ t: 'pagarCarcel' }), 'sec', { disabled: me.din < E.cfg.multaCarcel }));
        if (me.tarj.length) p.appendChild(boton('Usar tarjeta', () => X.accion({ t: 'tarjetaCarcel' }), 'sec'));
      }
    } else if (mt && E.fase === 'compra') {
      const pr = CASILLAS[me.pos].precio;
      p.appendChild(boton('Comprar ' + dinero(pr), () => X.accion({ t: 'comprar' }), 'prim grande', { disabled: me.din < pr, 'data-pref': 1, id: 'btnPrim' }));
      p.appendChild(boton(E.cfg.subastaObligatoria ? 'Subastar' : 'No comprar', () => X.accion({ t: 'noComprar' }), 'sec'));
    } else if (mt && E.fase === 'deuda') {
      p.appendChild(boton('Pagar ' + dinero(E.deuda.monto), () => X.accion({ t: 'pagarDeuda' }), 'prim grande', { disabled: me.din < E.deuda.monto, 'data-pref': 1, id: 'btnPrim' }));
      p.appendChild(boton('Vender / hipotecar', () => abrirPropiedades(), 'sec'));
      p.appendChild(boton('Bancarrota', () => confirmar('¿Declararte en bancarrota? Perderás todo.', () => X.accion({ t: 'quiebra' }), 'Declarar bancarrota'), 'mal'));
    } else if (mt && E.fase === 'fin') p.appendChild(boton('Terminar turno', () => X.accion({ t: 'terminar' }), 'prim grande', { 'data-pref': 1, id: 'btnPrim' }));
    else if (E.fase === 'subasta') p.appendChild(boton(E.subasta.turnoPuja === yo ? 'Pujar' : 'Ver subasta', () => abrirSubasta(), 'prim grande', { id: 'btnPrim' }));
    else p.appendChild(h('div', { cls: 'espera' }, 'Esperando…'));
  } else if (yo >= 0) p.appendChild(h('div', { cls: 'espera' }, 'Estás fuera de la partida. Puedes seguir mirando.'));
  else p.appendChild(h('div', { cls: 'espera' }, 'Modo espectador'));
  const tr = E.trato && E.trato.a === yo;
  s.appendChild(boton('🏠 Propiedades', () => abrirPropiedades(), 'sec', { id: 'btnProps' }));
  s.appendChild(boton('🤝 Tratos' + (tr ? ' ●' : ''), () => abrirTratos(), 'sec' + (tr ? ' aviso' : ''), { id: 'btnTratos' }));
  s.appendChild(boton('📜 Registro', () => abrirRegistro(), 'sec', { id: 'btnReg' }));
  s.appendChild(boton('💬 Chat' + (X.noLeidos ? ' (' + X.noLeidos + ')' : ''), () => abrirChat(), 'sec', { id: 'btnChat' }));
  if (E.fase === 'fin_partida' && !hojaAbierta('fin')) X.verFin();
}

export function pintarTiempo() {
  const E = X.E; if (!E) return;
  const t = $('tiempo'), partes = [];
  if (E.cfg.limiteMin > 0) {
    const rest = E.cfg.limiteMin * 60000 - (E.tiempoMs + (X.t0 ? Date.now() - X.t0 : 0));
    partes.push(rest > 0 ? '⏱ ' + fmtT(rest) : 'Última ronda');
  }
  if (E.cfg.bote && E.bote > 0) partes.push('Bote ' + dinero(E.bote));
  if (X.vence && E.fase !== 'fin_partida') { const r = X.vence - Date.now(); partes.push('⌛ ' + Math.max(0, Math.ceil(r / 1000)) + 's'); }
  t.textContent = partes.join(' · '); t.classList.toggle('urge', !!X.vence && X.vence - Date.now() < 8000);
}

export function pintarHud() {
  if (!X.E) return;
  pintarJugadores(); pintarBarra(); pintarTiempo();
  document.body.classList.toggle('mi-turno', X.E.turno === X.yo && X.E.fase !== 'fin_partida');
  const E = X.E;
  if (E.trato && E.trato.a === X.yo && E.trato.id !== ultimoTratoAbierto) { ultimoTratoAbierto = E.trato.id; abrirTratos(); }
  if (E.fase === 'subasta') { if (E.subasta.turnoPuja === X.yo || hojaAbierta('subasta')) abrirSubasta(); } else cerrarHojaId('subasta');
  refrescarHojas();
}

export function miniCasilla(i, fijo) {
  const m = $('mini'); if (i < 0 || !X.E) { m.hidden = true; return; }
  const E = X.E, cs = CASILLAS[i], q = E.prop[i];
  m.textContent = '';
  m.append(cs.grupo != null ? h('i', { cls: 'grp', style: 'background:' + GRUPOS[cs.grupo].color }, A.simbolos ? GRUPOS[cs.grupo].sim : '') : null, h('b', {}, cs.nombre));
  if (q) {
    m.append(h('span', {}, q.o < 0 ? 'Libre · ' + dinero(cs.precio) : (q.o === X.yo ? 'Tuya' : E.jug[q.o].nombre) + (q.h ? ' (hip.)' : '') + (q.o >= 0 && !q.h ? ' · renta ' + dinero(calcularRenta(E, i)) : '')));
    if (q.c) m.append(h('span', {}, q.c === 5 ? 'Hotel' : q.c + ' casa(s)'));
  }
  m.hidden = false; clearTimeout(tMini); if (!fijo) tMini = setTimeout(() => { m.hidden = true; }, 3500);
}
export function flotante(txt, x, y, cls) {
  if (A.reducirMov) return;
  const e = h('div', { cls: 'flot ' + (cls || ''), style: 'left:' + x + 'px;top:' + y + 'px' }, txt);
  document.body.appendChild(e); setTimeout(() => e.remove(), 1500);
}
export function burbuja(j, txt) {
  const chip = $('jugs').children[j]; if (!chip) return;
  const r = chip.getBoundingClientRect(), e = h('div', { cls: 'burbuja', style: 'left:' + (r.left + r.width / 2) + 'px;top:' + (r.bottom + 4) + 'px' }, txt);
  document.body.appendChild(e); setTimeout(() => e.remove(), 3200);
}
export { abrirCasilla };
