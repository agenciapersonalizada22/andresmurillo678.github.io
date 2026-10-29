// Navegación de menús con mando: mueve el foco entre botones por posición en pantalla
// (cruceta / stick izquierdo) y deja el foco visible. Ratón, teclado y táctil siguen igual.
const SEL = 'button:not([disabled]), a[href], input[type="range"]';

function visible(e) {
  if (!e.isConnected) return false;
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
}

export function enfocables(raices) {
  const lista = [];
  for (const r of raices) {
    if (!r || r.classList.contains('oculto')) continue;
    if (r.matches && r.matches(SEL) && visible(r)) lista.push(r);
    r.querySelectorAll(SEL).forEach((e) => { if (visible(e)) lista.push(e); });
  }
  return lista;
}

export function enfocar(e) {
  if (!e) return;
  try { e.focus({ preventScroll: true }); } catch (x) { e.focus(); }
  try { e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (x) { /* nada */ }
}

// dir: 'arriba' | 'abajo' | 'izq' | 'der'. Devuelve true si hizo algo.
export function mover(raices, dir, preferido) {
  const lista = enfocables(raices);
  if (!lista.length) return false;
  const act = document.activeElement;
  if (!act || !lista.includes(act)) {
    enfocar((preferido && lista.includes(preferido) ? preferido : lista[0]));
    return true;
  }
  // el deslizador usa izquierda/derecha para cambiar su valor
  if (act.type === 'range' && (dir === 'izq' || dir === 'der')) {
    const paso = parseFloat(act.step) || 1, min = parseFloat(act.min), max = parseFloat(act.max);
    const v = Math.min(max, Math.max(min, parseFloat(act.value) + (dir === 'der' ? paso : -paso)));
    act.value = String(Math.round(v * 1000) / 1000);
    act.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  const r0 = act.getBoundingClientRect();
  const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  const vx = dir === 'der' ? 1 : dir === 'izq' ? -1 : 0, vy = dir === 'abajo' ? 1 : dir === 'arriba' ? -1 : 0;
  let mejor = null, mejorP = Infinity;
  for (const e of lista) {
    if (e === act) continue;
    const r = e.getBoundingClientRect();
    const dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
    const along = dx * vx + dy * vy;
    if (along <= 2) continue;
    // si se solapan en el eje perpendicular (misma columna / misma fila) no se penaliza el desvío
    const solapa = vx ? (r.top < r0.bottom - 4 && r.bottom > r0.top + 4) : (r.left < r0.right - 4 && r.right > r0.left + 4);
    const perp = Math.abs(dx * vy) + Math.abs(dy * vx);
    // izquierda/derecha solo recorre la misma fila (no salta a otra); arriba/abajo puede cambiar de columna
    if (vx && !solapa) continue;
    const p = along + (solapa ? 0 : perp * 2);
    if (p < mejorP) { mejorP = p; mejor = e; }
  }
  if (!mejor) return false;
  enfocar(mejor);
  return true;
}
