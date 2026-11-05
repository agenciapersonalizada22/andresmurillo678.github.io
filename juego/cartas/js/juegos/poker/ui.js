// Interfaz del poker: traduce la vista de la mesa a un diseno generico (asientos, centro) y a un panel de acciones.
import { evaluar, PERFILES, nombreMano } from './evaluador.js';

const NOMBRE_FASE = { preflop: 'Pre-flop', flop: 'Flop', turn: 'Turn', river: 'River', entre: '' };
export function layout(vm) {
  const j = vm.j, n = vm.asientos.length, hu = j.jug.filter((p) => p.st !== 'fuera').length === 2;
  const asientos = j.jug.map((p, i) => {
    const badges = [];
    if (j.boton === i && (j.fase !== 'entre' || j.res)) badges.push({ txt: hu ? 'D·CP' : 'D', cls: 'dealer', tit: 'Botón' });
    if (j.fase !== 'entre' && !hu) { if (j.sbI === i) badges.push({ txt: 'CP', tit: 'Ciega pequeña' }); if (j.bbI === i) badges.push({ txt: 'CG', tit: 'Ciega grande' }); }
    if (j.fase !== 'entre' && hu && j.bbI === i) badges.push({ txt: 'CG', tit: 'Ciega grande' });
    let estado = '';
    if (p.st === 'fold') estado = 'fold'; else if (p.st === 'allin') { estado = 'allin'; badges.push({ txt: 'ALL-IN', cls: 'allin' }); }
    const gana = !!(j.res && j.res.botes.some((b) => b.ganadores.includes(i)));
    let etiqueta = '';
    if (j.res && j.res.manos[i]) etiqueta = j.res.manos[i].nombre;
    return { manos: [{ cartas: p.c, etiqueta, activa: gana }], badges, apuesta: p.ap, fichas: p.f, estado, turno: j.turno === i && j.fase !== 'entre', gana, fuera: p.st === 'fuera' && j.fase !== 'entre', delta: j.res ? j.res.gan[i] : null };
  });
  const bs = j.botes || [];
  let sub = NOMBRE_FASE[j.fase] || '';
  if (j.res) sub = j.res.showdown ? 'Showdown' : 'Sin showdown';
  let bote = j.fase === 'entre' && j.res ? j.res.total : j.bote;
  const lat = bs.length > 1 && j.jug.some((p) => p.st === 'allin') ? bs.map((b, k) => (k ? 'Lat. ' : 'Princ. ') + b.monto).join(' · ') : '';
  const lim = j.limite === 'pl' ? 'Pot-limit' : j.limite === 'fl' ? 'Límite fijo' : 'No-limit';
  const info = [];
  const yo = j.yo >= 0 ? j.jug[j.yo] : null;
  if (yo && yo.c.length === 2 && yo.c[0] && yo.st !== 'fold' && yo.st !== 'fuera') {
    const pr = PERFILES[j.baraja] || PERFILES.fr52;
    if (j.com.length >= 3) info.push('Tu mano: ' + nombreMano(evaluar(yo.c.concat(j.com), pr), pr));
  }
  return {
    disposicion: 'elipse', asientos, fin: j.fase === 'entre' && !!j.res,
    centro: { cartas: j.com, huecos: 5, bote, subtitulo: sub, extra: lat, grupos: [] },
    cabecera: `${lim} · ${j.sb}/${j.bb}${j.ante ? ' · ana ' + j.ante : ''} · mano ${j.manos + (j.fase === 'entre' ? 0 : 1)}` + (j.nivel ? ' · nivel ' + (j.nivel + 1) : ''),
    info: info.join(' · '),
  };
}

const redondear = (v, paso) => Math.max(1, Math.round(v / paso) * paso);
export function panel(vm) {
  const j = vm.j, L = j.legal;
  if (!L) return { espera: true };
  const botones = [];
  if (L.fold) botones.push({ id: 'fold', txt: 'Retirarse', cls: 'peligro', accion: { t: 'fold' }, tecla: 'f', b: !L.check });
  if (L.check) botones.push({ id: 'check', txt: 'Pasar', cls: 'sec', accion: { t: 'check' }, tecla: 'c', b: true });
  if (L.call) botones.push({ id: 'call', txt: L.aIgualar >= j.jug[j.yo].f ? 'Igualar all-in ' + L.aIgualar : 'Igualar ' + L.aIgualar, cls: 'prim', accion: { t: 'call' }, tecla: 'c' });
  if (L.raise) {
    const pot = j.bote, falta = L.falta, paso = Math.max(1, Math.min(j.bb, L.maxTo - L.minTo || 1));
    const r = (f) => Math.max(L.minTo, Math.min(L.maxTo, Math.round(j.ap + f * (pot + falta))));
    const fijo = L.minTo >= L.maxTo;
    botones.push({
      id: 'raise', txt: (falta > 0 ? 'Subir a ' : 'Apostar ') + '{v}', cls: 'prim', accion: { t: 'raise' }, tecla: 'r', clave: 'a',
      cantidad: fijo ? null : { min: L.minTo, max: L.maxTo, paso, def: Math.min(L.maxTo, Math.max(L.minTo, r(0.5))),
        rapidos: [{ txt: '½', v: r(0.5) }, { txt: '¾', v: r(0.75) }, { txt: 'Pot', v: r(1) }, { txt: 'All-in', v: L.allinTo }] },
      fijo: fijo ? L.minTo : 0,
    });
  }
  if (L.allin) botones.push({ id: 'allin', txt: 'All-in ' + L.allin, cls: 'allin', accion: { t: 'allin' }, tecla: 'a' });
  return { botones, info: L.call ? `Bote ${j.bote} · igualar ${L.aIgualar}` : `Bote ${j.bote}`, titulo: 'Tu turno' };
}
export const texto = {
  nombre: 'Póker Texas Hold\'em',
  ayuda: ['Cada jugador recibe 2 cartas privadas y se comparten 5 en la mesa (flop, turn, river).', 'En cada ronda puedes retirarte, pasar, igualar o subir. Gana la mejor mano de 5 cartas al final o el último que no se retire.', 'Si alguien va all-in por menos, se forman botes laterales: cada jugador solo puede ganar lo que igualó.'],
};
