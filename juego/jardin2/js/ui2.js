// Pantallas secundarias: evento diario, arena, zona sin fin, tienda, almanaque, misiones, colecciones y ranking.
import { h, toast, fmt } from './dom.js';
import { P, Z, IDS_P, IDS_Z, MUNDOS, PACKS, PODERES, POTENCIAR_MAX, costePotenciar, SLOTS_BASE, SLOTS_MAX, costeRanura } from './datos.js';
import { PR, AJ, plantaLibre, slots, guardarProgreso, nHechos, estrellasMundo, hechosMundo } from './almacen.js';
import { nivelDiario, nivelArena, arenaSemillas, diaDe, semanaDe, EVENTOS } from './niveles.js';
import { misionesDelDia, misionesMundo, COL_NOMBRES, colId, colNombre, colCompleta, colTotal } from './misiones.js';
import * as E from './economia.js';
import * as CJ from './cuenta-jardin.js';
import { LOGROS } from './logros.js';
import * as U from './ui.js';
import * as S from './sonido.js';
import { App } from './app.js';
const { h: _h } = { h };
const ENERGIA_TXT = {
  prodburst: (e) => `Suelta ${e.n} chispas de ${e.v} de golpe.`, frenesi: (e) => `Dispara ×${e.mult} más rápido durante ${e.dur} s.`, espinas: (e) => `Púas giratorias durante ${e.dur} s que dañan a los zombis cercanos.`,
  meteoros: (e) => `Lluvia de ${e.n} meteoros sobre los zombis.`, haz: (e) => `Haz de ${e.d} de daño por ${e.filas.length} fila(s).`, trampas: (e) => `Siembra ${e.n} minas por el jardín.`, cong: (e) => `Congela a todos los zombis ${e.dur} s.`,
  alfombra: (e) => `Campo cortante por todo el jardín ${e.dur} s.`, tiempo: (e) => `Ralentiza el tiempo ${e.dur} s.`, ola: () => 'Ola que daña y empuja a los zombis cercanos.', clones: (e) => `Dos clones de la planta durante ${e.dur} s.`,
  cura: (e) => `Cura a todas las plantas ${Math.round(e.pct * 100)}% y regenera ${e.dur} s.`, inspira: (e) => `Todas las plantas ×${e.mult} de velocidad ${e.dur} s.`, sueno: (e) => `Duerme a todos ${e.dur} s.`, peste: (e) => `Peste: ${e.dps} de daño por segundo a todos.`,
  rebobinar: (e) => `Retrocede ${e.cols} casillas a los zombis.`, nova: (e) => `Explosión de ${e.d} de daño en radio ${e.rad}.`, domo: (e) => `Domo invulnerable ${e.dur} s y cura.`, tormenta: (e) => `Tormenta de ${e.n} rayos.`,
  muralla: (e) => `+${e.hp} de vida y bambú en cada fila.`, imanazo: () => 'Arranca toda la armadura metálica.', gigante: (e) => `Crece ${e.dur} s: casi inmune y aplasta zombis.`,
};
export const descEnergia = (id) => { const e = P[id].en; return (ENERGIA_TXT[e.k] ? ENERGIA_TXT[e.k](e) : 'Energía especial.'); };

/* ---------- evento diario ---------- */
export function diario() {
  const dia = diaDe(), niv = nivelDiario(dia), ev = EVENTOS.find((e) => e.id === niv.evento), hecho = PR.diario.dia === dia && PR.diario.hecho;
  return h('div', { cls: 'diario' }, [U.cabecera('Evento diario'), h('div', { cls: 'bloque' }, [h('h3', { txt: ev.n }), h('p', { txt: ev.d }), h('p', { cls: 'nota', txt: `Mundo: ${MUNDOS[niv.mundo].n}. Racha: ${PR.diario.racha} día(s). Recompensa: 150 🪙 + 3 💎 (+1 💎 por día de racha, máx. 5).` }), h('p', { txt: hecho ? '✓ Ya completado hoy. ¡Vuelve mañana!' : 'Sin completar.' })]),
    U.btn(hecho ? 'Jugar otra vez (sin premio)' : '¡Jugar evento!', () => U.mostrar(() => U.preparar(niv, { modo: 'diario', nota: ev.d })), 'grande verde')]);
}

/* ---------- arena ---------- */
export function arena() {
  const sem = semanaDe(), niv = nivelArena(sem), sm = arenaSemillas(sem), el = h('div', { cls: 'arena' }, [U.cabecera('Arena semanal')]);
  const dias = 7 - ((Math.floor(Date.now() / 86400000) + 3) % 7);
  el.append(h('div', { cls: 'bloque' }, [h('h3', { txt: `Semana ${sem}: ${MUNDOS[niv.mundo].n}` }), h('p', { cls: 'nota', txt: `Todos juegan la misma semilla, mismo nivel y mismas plantas (nivel 3). Cambia en ${dias} día(s). Sin poderes de dedo.` }), h('div', { cls: 'fila-iconos' }, sm.map((id) => h('div', { cls: 'ico', title: P[id].n }, [U.iconoP(id, 44)]))),
    h('p', { txt: `Tu mejor puntaje: ${PR.arena.semana === sem ? fmt(PR.arena.mejor) : 0} · Intentos: ${PR.arena.semana === sem ? PR.arena.intentos : 0}` })]));
  el.append(U.btn('⚔ Jugar Arena', () => { cerrarYJugar(niv, sm); }, 'grande verde'), h('h4', { txt: 'Ranking de la semana' }), CJ.panelRanking('arena'));
  return el;
}
function cerrarYJugar(niv, sm) { U.cerrarTodo(); App.jugar(niv, sm, { modo: 'arena' }); }

/* ---------- zona sin fin ---------- */
export function sinfin() {
  return h('div', { cls: 'sinfin' }, [U.cabecera('Zona sin fin'), h('div', { cls: 'bloque' }, [h('h3', { txt: `Mejor piso: ${PR.sinfin.mejor}` }), h('p', { cls: 'nota', txt: 'Sube pisos sin parar: cada piso cambia de época y de mecánica y se vuelve más duro. Tras cada piso eliges 1 de 3 mejoras para esta carrera. Si pierdes, termina.' }), h('p', { cls: 'nota', txt: 'Recompensas: monedas y gemas por piso superado; los pisos múltiplo de 10 tienen jefe y botín grande.' })]),
    U.btn('♾ Empezar carrera', () => U.mostrar(() => App.preparaSinFin()), 'grande verde'), h('h4', { txt: 'Ranking de pisos' }), CJ.panelRanking('sinfin')]);
}
export function eligeMejora(opciones, alElegir, titulo) {
  const el = h('div', { cls: 'menu mejoras' }, [h('h2', { txt: titulo || 'Elige una mejora' }), h('div', { cls: 'botones' }, opciones.map((o) => U.btn(`${o.n}: ${o.d}`, () => { U.cerrarTodo(); alElegir(o); }, 'grande')))]); return el;
}

/* ---------- tienda ---------- */
let tTienda = 'plantas';
export function tienda() {
  const el = h('div', { cls: 'tienda' }), cont = h('div', { cls: 'tienda-c' });
  const refrescar = () => U.refrescar();
  const msg = (e, ok) => { if (e) { toast(e); S.sfx('error'); } else { toast(ok || 'Comprado'); S.sfx('mejora'); guardarProgreso(true); } refrescar(); };
  el.append(U.cabecera('Tienda'), U.tabs([{ id: 'plantas', n: 'Plantas' }, { id: 'mejoras', n: 'Mejoras' }, { id: 'poderes', n: 'Poderes' }, { id: 'ranuras', n: 'Ranuras' }, { id: 'packs', n: 'Packs' }], tTienda, (t) => { tTienda = t; refrescar(); }), cont);
  cont.append(h('p', { cls: 'nota', txt: 'Todo se paga con monedas y gemas ganadas jugando. No hay compras con dinero real.' }));
  if (tTienda === 'plantas') {
    const g = h('div', { cls: 'cat' }); IDS_P.filter((id) => P[id].g).forEach((id) => { const tiene = !!PR.tienda['p_' + id], d = P[id]; g.append(h('div', { cls: 'item' }, [U.iconoP(id, 56), h('b', { txt: d.n }), h('small', { txt: `${d.rol} · ${d.coste}☀ · ${d.hp} PS` }), h('small', { txt: '⚡ ' + d.en.nom }), tiene ? h('span', { cls: 'ok', txt: '✓ Tuya' }) : U.btn(`${d.g} 💎`, () => msg(E.comprarPlanta(PR, id), '¡Nueva planta!'))])); }); cont.append(g);
  } else if (tTienda === 'mejoras') {
    cont.append(h('p', { cls: 'nota', txt: 'Sube el nivel de tus plantas (1 a 5): más vida, daño y energía.' }));
    const g = h('div', { cls: 'cat' }); IDS_P.filter(plantaLibre).forEach((id) => { const lv = PR.potenc[id] || 1, d = P[id]; g.append(h('div', { cls: 'item' }, [U.iconoP(id, 48), h('b', { txt: d.n }), h('small', { txt: 'Nivel ' + lv + '/' + POTENCIAR_MAX }), lv >= POTENCIAR_MAX ? h('span', { cls: 'ok', txt: 'Máximo' }) : U.btn(`${costePotenciar(id, lv)} 🪙`, () => msg(E.potenciar(PR, id, plantaLibre), 'Mejorada'))])); }); cont.append(g);
  } else if (tTienda === 'poderes') {
    cont.append(h('p', { txt: `Usos gratis de poderes de dedo: ${PR.poderes.libres || 0}` }));
    PODERES.forEach((p) => cont.append(h('div', { cls: 'item fila' }, [h('b', { txt: `${p.ic} ${p.n}` }), h('small', { txt: `${p.d} Cuesta ${p.coste} 🪙 por uso.` })])));
    const pk = PACKS.find((q) => q.id === 'poder10'); cont.append(h('div', { cls: 'item fila' }, [h('b', { txt: pk.n }), h('small', { txt: pk.d }), U.btn(`${pk.m} 🪙`, () => msg(E.comprarPack(PR, 'poder10'), '+10 usos'))]));
  } else if (tTienda === 'ranuras') {
    const n = slots(), c = E.costeRanuraSiguiente(PR);
    cont.append(h('div', { cls: 'item fila' }, [h('b', { txt: `Ranuras de semilla: ${n}/${SLOTS_MAX}` }), h('small', { txt: 'Más semillas por nivel.' }), c ? U.btn(`${c} 💎`, () => msg(E.comprarRanura(PR), '+1 ranura')) : h('span', { cls: 'ok', txt: 'Completo' })]));
  } else {
    PACKS.filter((p) => p.id !== 'poder10').forEach((p) => { const n = PR.tienda[p.id] || 0; cont.append(h('div', { cls: 'item fila' }, [h('b', { txt: p.n }), h('small', { txt: p.d }), p.max && n >= p.max ? h('span', { cls: 'ok', txt: '✓' }) : U.btn(p.g ? `${p.g} 💎` : `${p.m} 🪙`, () => msg(E.comprarPack(PR, p.id), 'Comprado'))])); });
  }
  return el;
}

/* ---------- almanaque ---------- */
let tAlm = 'plantas', selAlm = null;
export function almanaque() {
  const el = h('div', { cls: 'almanaque' }), det = h('div', { cls: 'bloque det' });
  el.append(U.cabecera('Almanaque'), U.tabs([{ id: 'plantas', n: 'Plantas' }, { id: 'zombis', n: 'Zombis' }], tAlm, (t) => { tAlm = t; selAlm = null; U.refrescar(); }));
  const g = h('div', { cls: 'cuad-plantas' });
  const lista = tAlm === 'plantas' ? IDS_P : IDS_Z.filter((id) => Z[id].mundo >= 0 || id === 'pinata');
  const mostrarDet = (id) => {
    selAlm = id; det.textContent = '';
    if (tAlm === 'plantas') { const d = P[id], lib = plantaLibre(id); det.append(h('div', { cls: 'fila' }, [U.iconoP(id, 72), h('div', {}, [h('h3', { txt: d.n }), h('p', { cls: 'nota', txt: `${d.rol}${d.g ? ' · Premium (gemas)' : ''}` })])]), h('p', { txt: `Coste ${d.coste}☀ · Recarga ${d.rec}s · Vida ${d.hp} · Nivel ${PR.potenc[id] || 1}/5` }), h('p', { txt: lib ? descPlanta(d) : `Se desbloquea tras ${d.g ? 'comprarla en la tienda' : d.u + ' niveles superados (llevas ' + nHechos() + ')'}.` }), h('p', { cls: 'energia', txt: `⚡ ${d.en.nom}: ${descEnergia(id)}` })); PR.vistosP[id] = 1; }
    else { const d = Z[id], W = MUNDOS[d.mundo]; det.append(h('div', { cls: 'fila' }, [U.iconoZ(id, 72), h('div', {}, [h('h3', { txt: d.n }), h('p', { cls: 'nota', txt: (W ? W.n : 'Fiesta') + (d.jefe ? ' · JEFE' : '') })])]), h('p', { txt: `Vida ${d.hp}${d.arm ? ' + armadura ' + d.arm.hp : ''} · Velocidad ${(d.v * 5).toFixed(1)} · Daño ${d.dps}/s` }), h('p', { txt: descZombi(d) })); PR.vistosZ[id] = 1; }
  };
  lista.forEach((id) => { const vis = tAlm === 'plantas' ? (plantaLibre(id) || PR.vistosP[id]) : (PR.vistosZ[id] || true); g.append(h('button', { type: 'button', cls: 'planta-c' + (selAlm === id ? ' usado' : '') + (vis ? '' : ' oculto'), 'data-f': 1, 'aria-label': (tAlm === 'plantas' ? P[id] : Z[id]).n, on: { click: () => { S.sfx('clic'); mostrarDet(id); } } }, [tAlm === 'plantas' ? U.iconoP(id, 40) : U.iconoZ(id, 40), h('small', { txt: (tAlm === 'plantas' ? P[id] : Z[id]).n })])); });
  el.append(det, g); mostrarDet(selAlm || lista[0]); return el;
}
function descPlanta(d) {
  const k = { prod: 'Produce chispas.', tira: 'Dispara a los zombis de su fila.', lob: 'Lanza proyectiles en arco sobre obstáculos.', muro: 'Aguanta mordiscos para proteger a las demás.', bomba: 'Explota tras un instante.', mina: 'Se arma y explota al contacto.', trampa: 'Daña a los zombis que la pisan.', cepo: 'Devora zombis pequeños de un bocado.', aura: 'Potencia a las plantas cercanas.', luz: 'Ilumina e inspira cerca.', sueno: 'Duerme a los zombis cercanos.', tornado: 'Empuja zombis hacia atrás.', rayo: 'Rayo que salta entre zombis.', tormenta: 'Rayos aleatorios sobre el campo.', paradoja: 'Devuelve zombis al inicio.', iman: 'Arranca armaduras metálicas.', base: 'Plataforma para plantar sobre agua.' }[d.k] || '';
  return k + (d.perf ? ' Atraviesa zombis.' : '') + (d.aereo ? ' Alcanza voladores.' : '') + (d.ignifugo ? ' Ignífuga.' : '') + (d.flota ? ' Flota sobre el agua.' : '');
}
function descZombi(d) { const m = { rapido: 'Corre más.', cura: 'Cura a los zombis cercanos.', gigante: 'Gigante: resiste congelación y aturdimientos.', vuelo: 'Vuela sobre las plantas hasta llegar cerca.', lanza: 'Ataca a distancia.', explota: 'Explota al llegar.', monta: 'Va montado: más rápido hasta perder la montura.', escudo: 'Lleva escudo frontal.', teleporta: 'Se teletransporta.', salto: 'Salta sobre la primera planta.', atrapa: 'Atrapa plantas con lianas.', fase: 'Se vuelve intangible a ratos.', buff: 'Acelera a sus aliados.', parte: 'Se divide al morir.', invoca: 'Invoca refuerzos.', escudoT: 'Se protege con un escudo temporal.', embiste: 'Embiste a toda velocidad.', rugido: 'Su rugido aturde plantas.', lluvia: 'Hace llover proyectiles.' }; return (d.h || []).map((k) => m[k]).filter(Boolean).join(' ') || 'Camina despacio y muerde.'; }

/* ---------- misiones ---------- */
export function asegurarMisiones() { const dia = diaDe(); if (PR.misiones.dia !== dia) { PR.misiones.dia = dia; PR.misiones.prog = {}; Object.keys(PR.misiones.hechas).forEach((k) => { if (k.startsWith('d_')) delete PR.misiones.hechas[k]; }); } }
export function sumarProgreso(delta) { asegurarMisiones(); for (const k in delta) if (delta[k]) PR.misiones.prog[k] = (PR.misiones.prog[k] || 0) + delta[k]; }
function dar(r) { if (r.m) PR.monedas += r.m, PR.ganadas += r.m; if (r.g) PR.gemas += r.g; }
let mundoSel = 0;
export function misiones() {
  asegurarMisiones(); const el = h('div', { cls: 'misiones' }, [U.cabecera('Misiones')]), dia = diaDe();
  el.append(h('h4', { txt: 'Misiones del día' }));
  misionesDelDia(dia).forEach((q) => { const v = Math.min(q.meta, PR.misiones.prog[q.stat] || 0), listo = v >= q.meta, cobrada = PR.misiones.hechas[q.id]; el.append(fila(q.n, v, q.meta, q.r, listo, cobrada, () => { PR.misiones.hechas[q.id] = 1; dar(q.r); guardarProgreso(true); toast('Recompensa recibida'); S.sfx('gema'); U.refrescar(); })); });
  el.append(h('h4', { txt: 'Misiones de mundo' }), U.tabs(MUNDOS.map((W, i) => ({ id: i, n: String(i + 1) })), mundoSel, (i) => { mundoSel = i; U.refrescar(); }));
  const ctx = { hechosMundo, estrellasMundo, llave: (m) => !!PR.llaves[m] };
  misionesMundo(mundoSel).forEach((q) => { const v = q.val(ctx), listo = q.ok(ctx), cobrada = PR.misiones.mundo[q.id]; el.append(fila(q.n, v, q.meta, q.r, listo, cobrada, () => { PR.misiones.mundo[q.id] = 1; dar(q.r); guardarProgreso(true); toast('Recompensa recibida'); S.sfx('gema'); U.refrescar(); })); });
  return el;
}
function fila(n, v, meta, r, listo, cobrada, cobrar) { return h('div', { cls: 'mision' + (cobrada ? ' hecha' : '') }, [h('b', { txt: n }), h('div', { cls: 'prog' }, [h('div', { cls: 'prog-f', style: `width:${Math.round(v / meta * 100)}%` })]), h('small', { txt: `${v}/${meta} · ${r.m ? r.m + ' 🪙' : ''}${r.g ? r.g + ' 💎' : ''}` }), cobrada ? h('span', { cls: 'ok', txt: '✓' }) : (listo ? U.btn('Cobrar', cobrar, 'verde') : h('span'))]); }

/* ---------- colecciones ---------- */
export function colecciones() {
  const el = h('div', { cls: 'colecciones' }, [U.cabecera('Colecciones y piñatas'), h('p', { cls: 'nota', txt: `Piezas: ${colTotal(PR.col)}/80. Los zombis (a veces) y sobre todo las piñatas de fiesta sueltan piezas de la época. Completar un mundo da 15 💎.` })]);
  MUNDOS.forEach((W, m) => { const g = h('div', { cls: 'col-mundo', style: `--c:${W.col}` }, [h('b', { txt: W.n })]); const fila = h('div', { cls: 'col-fila' }); for (let k = 0; k < 8; k++) { const id = colId(m, k), tiene = !!PR.col[id]; fila.append(h('div', { cls: 'col-item' + (tiene ? ' on' : ''), title: tiene ? colNombre(id) : '???' }, [h('span', { txt: tiene ? ['🏺', '🪙', '🗝', '📜', '💍', '🔱', '🔮', '⌛'][k] : '?' }), h('small', { txt: tiene ? colNombre(id) : '???' })])); } g.append(fila); const comp = colCompleta(PR.col, m), cob = PR.colRec[m]; g.append(comp ? (cob ? h('span', { cls: 'ok', txt: '✓ Colección completa' }) : U.btn('Cobrar 15 💎', () => { PR.colRec[m] = 1; PR.gemas += 15; guardarProgreso(true); S.sfx('gema'); U.refrescar(); }, 'verde')) : h('small', { txt: 'Incompleta' })); el.append(g); });
  return el;
}

/* ---------- logros y ranking ---------- */
let tRank = 'ranking';
export function ranking() {
  const el = h('div', { cls: 'logros' }, [U.cabecera('Logros y ranking'), U.tabs([{ id: 'ranking', n: 'Ranking' }, { id: 'logros', n: 'Logros' }], tRank, (t) => { tRank = t; U.refrescar(); })]);
  if (tRank === 'ranking') el.append(CJ.panelRanking());
  else { const hechos = LOGROS.filter((l) => PR.logros[l.id]).length; el.append(h('p', { cls: 'nota', txt: `${hechos}/${LOGROS.length} logros` })); LOGROS.forEach((l) => el.append(h('div', { cls: 'logro' + (PR.logros[l.id] ? ' on' : '') }, [h('span', { txt: PR.logros[l.id] ? '🏆' : '🔒' }), h('div', {}, [h('b', { txt: l.nombre }), h('small', { txt: l.desc })])]))); }
  return el;
}
void _h; void SLOTS_BASE; void costeRanura; void AJ;
