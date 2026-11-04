// =============================================================
//  🪟  PANELES DEL INVENTARIO
//  Mochila, libro de recetas, cofre, horno y comercio. Solo dibujan
//  botones; lo que pasa al tocarlos lo decide principal.js.
// =============================================================
import { objetoPorId, esObjeto, nombreDe, PIEZAS } from './objetos.js';
import { RECETAS, idsDe, nombreEspec, puedeFabricar, cantidadFalta, TIEMPO_FUNDIR } from './recetas.js';

const el = (tag, cls, texto) => { const e = document.createElement(tag); if (cls) e.className = cls; if (texto !== undefined) e.textContent = texto; return e; };

// Botón cuadrado de una ranura: icono, cantidad y barra de durabilidad
export function botonRanura(r, interfaz, { extra = '', titulo = '' } = {}) {
  const b = el('button', 'slot ' + extra);
  b.type = 'button';
  if (r) {
    const img = el('img'); img.alt = ''; img.draggable = false; img.src = interfaz.icono(r.id);
    b.appendChild(img);
    b.title = nombreDe(r.id);
    if (r.n > 1) b.appendChild(el('b', 'cant', String(r.n)));
    const o = esObjeto(r.id) ? objetoPorId(r.id) : null;
    if (o && o.dur && r.d > 0) {
      const d = el('i', 'dur'), u = el('u');
      const f = Math.max(0, 1 - r.d / o.dur);
      u.style.width = Math.round(f * 100) + '%'; u.style.background = f > 0.5 ? '#7dd957' : f > 0.2 ? '#ffd23d' : '#ff5a3d';
      d.appendChild(u); b.appendChild(d);
    }
  } else { b.classList.add('vacia'); b.title = titulo; }
  return b;
}

const NOMBRES_PIEZA = ['Casco', 'Peto', 'Pantalones', 'Botas'];

export function pintarMochila(cont, inv, sel, interfaz, cb) {
  cont.textContent = '';
  const arm = el('div', 'filaSlots');
  arm.appendChild(el('span', 'rotulo', 'ARMADURA ' + inv.puntosArmadura() + '/20'));
  inv.armadura.forEach((r, i) => {
    const b = botonRanura(r, interfaz, { titulo: NOMBRES_PIEZA[i] });
    if (!r) b.textContent = ['⛑', '👕', '👖', '👢'][i];
    b.addEventListener('click', () => cb.armadura(i));
    arm.appendChild(b);
  });
  cont.appendChild(arm);
  const rej = el('div', 'rejillaSlots');
  // primero el inventario de arriba (9-35) y al final la barra (0-8), como en el juego
  const orden = [];
  for (let i = 9; i < 36; i++) orden.push(i);
  for (let i = 0; i < 9; i++) orden.push(i);
  for (const i of orden) {
    const b = botonRanura(inv.ranuras[i], interfaz, { extra: (i < 9 ? 'barra ' : '') + (i === sel ? 'elegida' : '') });
    b.addEventListener('click', () => cb.clic(i));
    rej.appendChild(b);
    if (i === 35) rej.appendChild(el('hr'));
  }
  cont.appendChild(rej);
}

function miniReceta(rec, interfaz) {
  const g = el('div', 'miniReceta g' + rec.rejilla);
  for (let y = 0; y < rec.rejilla; y++) {
    for (let x = 0; x < rec.rejilla; x++) {
      const c = el('i');
      const ch = (rec.filas[y] || '')[x];
      if (ch && ch !== '.') {
        const ids = idsDe(rec.leyenda[ch]);
        const img = el('img'); img.alt = ''; img.src = interfaz.icono(ids[0]);
        c.appendChild(img);
      }
      g.appendChild(c);
    }
  }
  return g;
}

export function pintarRecetas(cont, inv, hayMesa, soloDisp, interfaz, cb) {
  cont.textContent = '';
  const barra = el('div', 'fila');
  const f = el('button', '', soloDisp ? 'SOLO DISPONIBLES: SÍ' : 'SOLO DISPONIBLES: NO');
  f.type = 'button'; f.addEventListener('click', () => cb.filtro());
  barra.appendChild(f);
  cont.appendChild(barra);
  cont.appendChild(el('p', 'info', hayMesa ? 'Hay una mesa de trabajo cerca: puedes hacer recetas de 3x3' : 'Acércate a una mesa de trabajo para las recetas de 3x3'));
  const lista = el('div', 'listaRecetas');
  let n = 0;
  for (const rec of RECETAS) {
    const ok = puedeFabricar(rec, inv, hayMesa);
    if (soloDisp && !ok) continue;
    n++;
    const fila = el('div', 'receta' + (ok ? ' ok' : ''));
    fila.appendChild(miniReceta(rec, interfaz));
    const img = el('img', 'salida'); img.alt = ''; img.src = interfaz.icono(rec.salida);
    fila.appendChild(img);
    const t = el('div', 'txt');
    t.appendChild(el('b', '', nombreDe(rec.salida) + (rec.n > 1 ? ' ×' + rec.n : '')));
    const falta = new Map(cantidadFalta(rec, inv).map(([e, c]) => [e, c]));
    const ing = el('span', '', rec.ing.map(([e, c]) => c + ' ' + nombreEspec(e) + (falta.has(e) ? ' (faltan ' + falta.get(e) + ')' : '')).join(' · ') + (rec.rejilla === 3 && !hayMesa ? ' · mesa' : ''));
    t.appendChild(ing);
    fila.appendChild(t);
    const b = el('button', 'fabricar', 'FABRICAR');
    b.type = 'button'; b.disabled = !ok;
    b.addEventListener('click', () => cb.fabricar(rec));
    fila.appendChild(b);
    lista.appendChild(fila);
  }
  if (!n) lista.appendChild(el('p', 'info', 'No puedes fabricar nada con lo que llevas. Rompe árboles y junta materiales.'));
  cont.appendChild(lista);
}

// Cofre: sus ranuras arriba y las tuyas abajo. Tocar una pasa la pila al otro lado.
export function pintarCofre(cont, ranurasCofre, inv, interfaz, cb) {
  cont.textContent = '';
  cont.appendChild(el('p', 'rotulo', 'COFRE'));
  const a = el('div', 'rejillaSlots');
  ranurasCofre.forEach((r, i) => { const b = botonRanura(r, interfaz); b.addEventListener('click', () => cb.sacar(i)); a.appendChild(b); });
  cont.appendChild(a);
  cont.appendChild(el('p', 'rotulo', 'TU MOCHILA'));
  const m = el('div', 'rejillaSlots');
  for (let i = 9; i < 36; i++) { const b = botonRanura(inv.ranuras[i], interfaz); b.addEventListener('click', () => cb.meter(i)); m.appendChild(b); }
  for (let i = 0; i < 9; i++) { const b = botonRanura(inv.ranuras[i], interfaz, { extra: 'barra' }); b.addEventListener('click', () => cb.meter(i)); m.appendChild(b); }
  cont.appendChild(m);
}

export function pintarHorno(cont, h, inv, interfaz, cb) {
  cont.textContent = '';
  const fila = el('div', 'horno');
  const col = (rot, r, fn) => { const c = el('div', 'colHorno'); c.appendChild(el('span', 'rotulo', rot)); const b = botonRanura(r, interfaz); b.addEventListener('click', fn); c.appendChild(b); return c; };
  fila.appendChild(col('PONER', h.ent, cb.quitarEnt));
  const llama = el('div', 'llama');
  const prog = el('div', 'progreso'); const pi = el('i'); pi.style.width = Math.round(Math.min(1, h.prog / TIEMPO_FUNDIR) * 100) + '%'; prog.appendChild(pi);
  llama.append(el('span', h.quema > 0 ? 'fuego on' : 'fuego', '🔥'), prog);
  fila.append(llama);
  fila.appendChild(col('RESULTADO', h.sal, cb.sacarSal));
  fila.appendChild(col('COMBUSTIBLE', h.comb, cb.quitarComb));
  cont.appendChild(fila);
  cont.appendChild(el('p', 'info', 'Toca en tu mochila lo que quieras fundir (arena, menas, carne, troncos) o un combustible (carbón, madera)'));
  const m = el('div', 'rejillaSlots');
  for (let i = 9; i < 36; i++) { const b = botonRanura(inv.ranuras[i], interfaz); b.addEventListener('click', () => cb.meter(i)); m.appendChild(b); }
  for (let i = 0; i < 9; i++) { const b = botonRanura(inv.ranuras[i], interfaz, { extra: 'barra' }); b.addEventListener('click', () => cb.meter(i)); m.appendChild(b); }
  cont.appendChild(m);
}

export function pintarComercio(cont, oficio, ofertas, inv, interfaz, cb) {
  cont.textContent = '';
  cont.appendChild(el('p', 'info', oficio + ': te cambia cosas por esmeraldas y más'));
  ofertas.forEach((o, i) => {
    const fila = el('div', 'receta');
    const dan = o.dan.map(([k, n]) => n + ' ' + nombreDe(typeof k === 'string' ? (objetoPorClaveId(k)) : k)).join(' + ');
    const da = o.da[1] + ' ' + nombreDe(objetoPorClaveId(o.da[0]));
    const img = el('img', 'salida'); img.alt = ''; img.src = interfaz.icono(objetoPorClaveId(o.da[0]));
    fila.appendChild(img);
    fila.appendChild(el('div', 'txt')).append(el('b', '', da), el('span', '', 'Pides: ' + dan));
    const tiene = o.dan.every(([k, n]) => inv.cuenta(objetoPorClaveId(k)) >= n);
    const b = el('button', 'fabricar', 'CAMBIAR'); b.type = 'button'; b.disabled = !tiene;
    b.addEventListener('click', () => cb.cambiar(i));
    fila.appendChild(b);
    cont.appendChild(fila);
  });
}

import { resolverId } from './objetos.js';
export function objetoPorClaveId(k) { return resolverId(k); }
export { PIEZAS };
