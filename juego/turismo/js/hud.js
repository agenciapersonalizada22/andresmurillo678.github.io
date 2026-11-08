// HUD: fichas de jugadores, barra de acciones contextual, mini ficha de casilla y textos flotantes.
import { X, dinero } from './contexto.js';
import { h, boton, $, hojaAbierta, cerrarHojaId, refrescarHojas, confirmar } from './dom.js';
import { CASILLAS, CONTINENTES, EVENTOS, colorCont } from './datos.js';
import { patrimonio, calcularRenta } from './reglas.js';
import { abrirJugador, abrirPropiedades, abrirPasaporte, abrirRegistro, abrirChat, abrirSubasta, abrirCasilla, abrirRutas } from './hojas.js';
import { A } from './ajustes.js';

let rutaAbiertaSeq = -1, tMini = 0;
const nom = (j) => (j === X.yo ? 'Tú' : X.E.jug[j].nombre);
const fmtT = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

export function pintarJugadores() {
  const E = X.E, cont = $('jugs'); cont.textContent = '';
  const tot = E.jug.map((p) => patrimonio(E, p.id)), max = Math.max(1, ...tot);
  E.jug.forEach((p) => {
    const c = h('button', { type: 'button', cls: 'chipj' + (p.id === E.turno && E.fase !== 'fin_partida' ? ' turno' : '') + (p.quebrado ? ' quebrado' : '') + (p.id === X.yo ? ' yo' : ''), style: '--c:' + p.color, 'data-f': 1, 'aria-label': p.nombre + ', efectivo ' + p.din + ', patrimonio ' + tot[p.id] },
      h('span', { cls: 'jn' }, h('i', { cls: 'pt' }), p.id === X.yo ? 'Tú' : p.nombre.slice(0, 8), p.tipo === 'bot' ? h('em', {}, '🤖') : null, p.ret ? h('em', {}, '🛃') : null, p.sinConexion ? h('em', {}, '⚠') : null),
      h('b', {}, dinero(p.din), h('small', {}, ' 🛂' + p.sellos.length)), h('span', { cls: 'jb' }, h('i', { style: 'width:' + (tot[p.id] / max * 100) + '%' })));
    c.addEventListener('click', () => abrirJugador(p.id));
    cont.appendChild(c);
  });
}

function contexto(E) {
  const yo = X.yo, mt = E.turno === yo, j = E.jug[E.turno], d = E.dados[0] ? ' 🎲 ' + E.dados[0] + ' + ' + E.dados[1] + ' = ' + (E.dados[0] + E.dados[1]) : '';
  switch (E.fase) {
    case 'fin_partida': return 'Partida terminada.';
    case 'tirar': return mt ? (j.ret ? 'Retenido en la aduana (intento ' + (j.intentos + 1) + ' de 3): saca dobles, paga la fianza o usa un pase.' : 'Tu turno: tira los dados.') : 'Turno de ' + j.nombre + '.';
    case 'compra': return mt ? CASILLAS[j.pos].nombre + ' cuesta ' + dinero(CASILLAS[j.pos].precio) + '. ¿Lo compras?' + d : j.nombre + ' decide si compra ' + CASILLAS[j.pos].nombre + '.';
    case 'viaje': return mt ? 'Estás en ' + CASILLAS[j.pos].nombre + ': puedes tomar una ruta.' + d : j.nombre + ' elige su ruta de viaje.';
    case 'deuda': return mt ? 'Debes ' + dinero(E.deuda.monto) + ' (' + E.deuda.motivo + '). Reúne dinero o declárate en bancarrota.' : j.nombre + ' debe reunir ' + dinero(E.deuda.monto) + '.';
    case 'fin': return (mt ? 'Puedes construir o terminar tu turno.' : j.nombre + ' termina su turno.') + d;
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
      if (me.ret) {
        p.appendChild(boton('Pagar fianza ' + dinero(E.cfg.fianza), () => X.accion({ t: 'pagarRetencion' }), 'sec', { disabled: me.din < E.cfg.fianza }));
        if (me.tarj.length) p.appendChild(boton('Usar pase', () => X.accion({ t: 'usarPase' }), 'sec'));
      }
    } else if (mt && E.fase === 'compra') {
      const pr = CASILLAS[me.pos].precio;
      p.appendChild(boton('Comprar ' + dinero(pr), () => X.accion({ t: 'comprar' }), 'prim grande', { disabled: me.din < pr, 'data-pref': 1, id: 'btnPrim' }));
      p.appendChild(boton(E.cfg.subastaObligatoria ? 'Subastar' : 'No comprar', () => X.accion({ t: 'noComprar' }), 'sec'));
    } else if (mt && E.fase === 'viaje') {
      p.appendChild(boton('✈ Elegir ruta', () => abrirRutas(), 'prim grande', { 'data-pref': 1, id: 'btnPrim' }));
      p.appendChild(boton('Quedarme', () => X.accion({ t: 'noViajar' }), 'sec'));
    } else if (mt && E.fase === 'deuda') {
      p.appendChild(boton('Pagar ' + dinero(E.deuda.monto), () => X.accion({ t: 'pagarDeuda' }), 'prim grande', { disabled: me.din < E.deuda.monto, 'data-pref': 1, id: 'btnPrim' }));
      p.appendChild(boton('Vender / hipotecar', () => abrirPropiedades(), 'sec'));
      p.appendChild(boton('Bancarrota', () => confirmar('¿Declararte en bancarrota? Perderás todo.', () => X.accion({ t: 'quiebra' }), 'Declarar bancarrota'), 'mal'));
    } else if (mt && E.fase === 'fin') p.appendChild(boton('Terminar turno', () => X.accion({ t: 'terminar' }), 'prim grande', { 'data-pref': 1, id: 'btnPrim' }));
    else if (E.fase === 'subasta') p.appendChild(boton(E.subasta.turnoPuja === yo ? 'Pujar' : 'Ver subasta', () => abrirSubasta(), 'prim grande', { id: 'btnPrim' }));
    else p.appendChild(h('div', { cls: 'espera' }, 'Esperando…'));
  } else if (yo >= 0) p.appendChild(h('div', { cls: 'espera' }, 'Estás fuera de la partida. Puedes seguir mirando.'));
  else p.appendChild(h('div', { cls: 'espera' }, 'Modo espectador'));
  s.appendChild(boton('🏠 Destinos', () => abrirPropiedades(), 'sec', { id: 'btnProps' }));
  s.appendChild(boton('🛂 Pasaporte', () => abrirPasaporte(), 'sec', { id: 'btnPasaporte' }));
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
  if (E.cfg.limiteRondas > 0) partes.push('Ronda ' + E.ronda + '/' + E.cfg.limiteRondas); else partes.push('Ronda ' + E.ronda);
  if (E.cfg.metaSellos > 0) partes.push('Meta 🛂' + E.cfg.metaSellos);
  if (E.cfg.bote && E.bote > 0) partes.push('Bote ' + dinero(E.bote));
  E.eventos.forEach((v) => partes.push(EVENTOS[v.tipo].icono + ' ' + EVENTOS[v.tipo].nombre + (v.cont >= 0 ? ' · ' + CONTINENTES[v.cont].nombre : '') + ' (' + Math.max(1, v.hasta - E.ronda) + ')'));
  if (X.vence && E.fase !== 'fin_partida') { const r = X.vence - Date.now(); partes.push('⌛ ' + Math.max(0, Math.ceil(r / 1000)) + 's'); }
  t.textContent = partes.join(' · '); t.classList.toggle('urge', !!X.vence && X.vence - Date.now() < 8000);
}

export function pintarHud() {
  if (!X.E) return;
  pintarJugadores(); pintarBarra(); pintarTiempo();
  document.body.classList.toggle('mi-turno', X.E.turno === X.yo && X.E.fase !== 'fin_partida');
  const E = X.E;
  if (E.fase === 'viaje' && E.turno === X.yo && rutaAbiertaSeq !== E.seq) { rutaAbiertaSeq = E.seq; abrirRutas(); }
  if (E.fase !== 'viaje') cerrarHojaId('rutas');
  if (E.fase === 'subasta') { if (E.subasta.turnoPuja === X.yo || hojaAbierta('subasta')) abrirSubasta(); } else cerrarHojaId('subasta');
  refrescarHojas();
}

export function miniCasilla(i, fijo) {
  const m = $('mini'); if (i < 0 || !X.E) { m.hidden = true; return; }
  const E = X.E, cs = CASILLAS[i], q = E.prop[i];
  m.textContent = '';
  m.append(cs.tipo === 'dest' ? h('i', { cls: 'grp', style: 'background:' + colorCont(cs.grupo) }, A.simbolos ? CONTINENTES[cs.grupo].sim : '') : null, h('b', {}, cs.nombre));
  if (q) {
    m.append(h('span', {}, q.o < 0 ? 'Libre · ' + dinero(cs.precio) : (q.o === X.yo ? 'Tuyo' : E.jug[q.o].nombre) + (q.h ? ' (hip.)' : '') + (q.o >= 0 && !q.h ? ' · renta ' + dinero(calcularRenta(E, i, X.yo)) : '')));
    if (q.c) m.append(h('span', {}, q.c === 4 ? 'Hotel resort' : q.c + ' atracc.'));
  }
  if (cs.tipo === 'dest' && X.yo >= 0 && E.jug[X.yo].sellos.includes(i)) m.append(h('span', {}, '🛂'));
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
