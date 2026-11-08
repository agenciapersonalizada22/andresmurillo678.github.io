// Navegacion de menus con mando (cruceta/stick + A/B): mueve el foco entre elementos [data-f] de la capa activa.
let capas = [], ultimoMov = 0, previo = { x: 0, y: 0 };
const visible = (el) => !el.disabled && el.offsetParent !== null && el.getClientRects().length > 0;
export function capaActiva() { for (let i = capas.length - 1; i >= 0; i--) if (capas[i].el.isConnected && !capas[i].el.hidden) return capas[i]; return null; }
export function abrirCapa(el, alAtras) { capas = capas.filter((c) => c.el !== el); capas.push({ el, alAtras }); setTimeout(() => enfocar(el), 30); }
export function cerrarCapa(el) { capas = capas.filter((c) => c.el !== el); }
export function enfocar(el) { const l = [...el.querySelectorAll('[data-f]')].filter(visible); const a = el.querySelector('[data-f].inicial') ; const t = (a && visible(a)) ? a : l[0]; if (t) t.focus({ preventScroll: false }); }
function mover(capa, dx, dy) {
  const cur = document.activeElement, l = [...capa.el.querySelectorAll('[data-f]')].filter(visible);
  if (!l.length) return;
  if (!cur || !capa.el.contains(cur) || !cur.matches('[data-f]')) { l[0].focus(); return; }
  if (dx && cur.matches('input[type=range]')) { const st = +cur.step || 1, mn = +cur.min, mx = +cur.max; cur.value = Math.max(mn, Math.min(mx, +cur.value + dx * st * Math.max(1, Math.round((mx - mn) / st / 20)))); cur.dispatchEvent(new Event('input', { bubbles: true })); cur.dispatchEvent(new Event('change', { bubbles: true })); return; }
  const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let best = null, bs = 1e9;
  for (const el of l) {
    if (el === cur) continue; const q = el.getBoundingClientRect(), ex = q.left + q.width / 2 - cx, ey = q.top + q.height / 2 - cy;
    const along = dx ? ex * dx : ey * dy, across = dx ? Math.abs(ey) : Math.abs(ex); if (along <= 2) continue;
    const s = along + across * 2.2; if (s < bs) { bs = s; best = el; }
  }
  if (!best) { const i = l.indexOf(cur); best = l[(i + (dx + dy > 0 ? 1 : l.length - 1)) % l.length]; }
  best.focus(); best.scrollIntoView({ block: 'nearest' });
}
export function tick(Mando) {
  const capa = capaActiva(); if (!capa || !Mando) return false;
  const ahora = performance.now(), ex = Mando.ejes.izq, dx = Mando.pulsado('DER') ? 1 : Mando.pulsado('IZQ') ? -1 : 0, dy = Mando.pulsado('ABAJO') ? 1 : Mando.pulsado('ARRIBA') ? -1 : 0;
  let mx = dx, my = dy;
  if (!mx && !my) { const sx = Math.abs(ex.x) > 0.6 ? Math.sign(ex.x) : 0, sy = Math.abs(ex.y) > 0.6 ? Math.sign(ex.y) : 0; if ((sx || sy) && ahora - ultimoMov > 220) { mx = Math.abs(ex.x) > Math.abs(ex.y) ? sx : 0; my = mx ? 0 : sy; } }
  if (mx || my) { ultimoMov = ahora; document.body.classList.add('usando-mando'); mover(capa, mx, my); }
  if (Mando.pulsado('A')) { const c = document.activeElement; if (c && capa.el.contains(c) && c.matches('[data-f]')) { document.body.classList.add('usando-mando'); c.click(); } }
  if (Mando.pulsado('B')) { if (capa.alAtras) capa.alAtras(); else { const b = capa.el.querySelector('[data-back]'); if (b) b.click(); } }
  return true;
}
addEventListener('pointerdown', () => document.body.classList.remove('usando-mando'), true);
