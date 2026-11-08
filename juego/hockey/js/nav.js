// Navegacion de menus con mando (cruceta/stick, A acepta, B atras) y flechas del teclado, por geometria.
const Mando = window.Mando;
let capa = () => document.body, atras = null, sticky = 0, prev = { x: 0, y: 0 };

export const Nav = {
  usar(fnCapa, fnAtras) { capa = fnCapa; atras = fnAtras; },
  lista() {
    const c = capa(); if (!c) return [];
    return [...c.querySelectorAll('[data-f]')].filter((e) => !e.disabled && e.offsetParent !== null && !e.closest('[hidden]'));
  },
  mover(dx, dy) {
    const l = Nav.lista(); if (!l.length) return;
    const a = document.activeElement;
    if (!a || !l.includes(a)) { l[0].focus({ preventScroll: false }); return; }
    const r = a.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let mejor = null, mp = 1e9;
    for (const e of l) {
      if (e === a) continue;
      const q = e.getBoundingClientRect(), ex = q.left + q.width / 2 - cx, ey = q.top + q.height / 2 - cy;
      const along = ex * dx + ey * dy; if (along <= 2) continue;
      const lat = Math.abs(ex * dy) + Math.abs(ey * dx);
      const p = along + lat * 2.2;
      if (p < mp) { mp = p; mejor = e; }
    }
    if (mejor) { mejor.focus(); mejor.scrollIntoView({ block: 'nearest' }); }
  },
  ajustar(dir) {
    const a = document.activeElement;
    if (a && a.type === 'range') { const st = +a.step || 1; a.value = Math.min(+a.max, Math.max(+a.min, +a.value + dir * st)); a.dispatchEvent(new Event('input', { bubbles: true })); return true; }
    return false;
  },
  // llamar una vez por cuadro tras Mando.leer(); devuelve true si el mando manejo algo
  gamepad() {
    if (!Mando || !Mando.conectado) return false;
    const lx = Mando.ejes.izq.x, ly = Mando.ejes.izq.y;
    const dir = (Mando.pulsado('ARRIBA') ? [0, -1] : Mando.pulsado('ABAJO') ? [0, 1] : Mando.pulsado('IZQ') ? [-1, 0] : Mando.pulsado('DER') ? [1, 0] : null);
    let d = dir;
    if (!d) {
      const x = Math.abs(lx) > 0.6 ? Math.sign(lx) : 0, y = Math.abs(ly) > 0.6 ? Math.sign(ly) : 0;
      if ((x || y) && (x !== prev.x || y !== prev.y)) d = Math.abs(lx) > Math.abs(ly) ? [x, 0] : [0, y];
      prev = { x, y };
    }
    if (d) { if (!(d[1] === 0 && Nav.ajustar(d[0]))) Nav.mover(d[0], d[1]); return true; }
    if (Mando.pulsado('A')) { const a = document.activeElement; if (a && a.click && Nav.lista().includes(a)) a.click(); else Nav.mover(0, 1); return true; }
    if (Mando.pulsado('B')) { if (atras) atras(); return true; }
    return false;
  }
};
addEventListener('keydown', (ev) => {
  if (ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName) && !(ev.target.type === 'range')) return;
  const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[ev.key];
  if (m && Nav.activa && Nav.activa()) { if (m[1] === 0 && Nav.ajustar(m[0])) { ev.preventDefault(); return; } Nav.mover(m[0], m[1]); ev.preventDefault(); }
});
