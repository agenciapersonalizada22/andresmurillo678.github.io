// Rompecabezas de rutas: lleva al explorador hasta la meta pasando por todas las paradas, esquivando muros, con el camino mas corto posible.
import { generar, dirs, validarRuta } from '../logica/rutas.js';
export default {
  id: 'ruta', area: 'logica', nombre: 'Ruta segura', icono: '⌖', desc: 'Llega a la meta pasando por todas las paradas con el camino más corto.', esc: { subir: 1 },
  tutorial: ['Mueve al explorador (●) con las flechas o tocando una casilla vecina hasta la meta (⚑).', 'Hay paradas (◆) que debes visitar antes de llegar.', 'Prueba final: resuelve 3 rutas con pocos pasos extra.'],
  init(cx) {
    const e = cx.e;
    const info = cx.h('p', { cls: 'nota', 'aria-live': 'polite' }), rej = cx.h('div', { cls: 'ruta' });
    const pad = cx.h('div', { cls: 'pad-dir' }, [['arriba', '▲', 0], ['izq', '◀', 3], ['abajo', '▼', 2], ['der', '▶', 1]].map(([n, g, d]) => cx.h('button', { type: 'button', cls: 'btn sec peq d-' + n, 'data-f': 1, txt: g, 'aria-label': n, on: { click: () => paso(d) } })));
    const acc = cx.h('div', { cls: 'fila-btn' }, [cx.h('button', { type: 'button', cls: 'btn sec peq', 'data-f': 1, txt: 'Deshacer', on: { click: deshacer } }), cx.h('button', { type: 'button', cls: 'btn sec peq', 'data-f': 1, txt: 'Reiniciar', on: { click: () => nueva(e.p) } })]);
    cx.zona.appendChild(rej); cx.zona.appendChild(info); cx.zona.appendChild(pad); cx.zona.appendChild(acc);
    function nueva(p) { e.p = p; e.pasos = []; e.x = p.inicio.x; e.y = p.inicio.y; e.vis = new Set(); e.fin = false; pintar(); cx.consigna('Llega a ⚑ pasando por todas las ◆'); }
    function pintar() {
      const p = e.p; rej.style.setProperty('--cols', p.w); rej.replaceChildren();
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
        const muro = p.muros.has(x + ',' + y), parada = p.paradas.findIndex((q) => q.x === x && q.y === y), yo = x === e.x && y === e.y, meta = x === p.meta.x && y === p.meta.y;
        const b = cx.h('button', { type: 'button', cls: 'rc' + (muro ? ' muro' : '') + (yo ? ' yo' : '') + (parada >= 0 && e.vis.has(parada) ? ' vis' : ''), 'data-f': 1, tabindex: -1, 'aria-label': muro ? 'muro' : yo ? 'explorador' : meta ? 'meta' : parada >= 0 ? 'parada' : 'libre', txt: muro ? '▓' : yo ? '●' : meta ? '⚑' : parada >= 0 ? (e.vis.has(parada) ? '✓' : '◆') : '', on: { click: () => { const dx = x - e.x, dy = y - e.y; const d = dirs.findIndex(([a, b2]) => a === dx && b2 === dy); if (d >= 0) paso(d); } } });
        rej.appendChild(b);
      }
      info.textContent = `Pasos: ${e.pasos.length} · Mínimo: ${e.p.optimo}`;
    }
    function paso(d) {
      if (e.fin) return;
      const [dx, dy] = dirs[d], nx = e.x + dx, ny = e.y + dy, p = e.p;
      if (nx < 0 || ny < 0 || nx >= p.w || ny >= p.h || p.muros.has(nx + ',' + ny)) { cx.sonido.mal(); return; }
      e.pasos.push(d); e.x = nx; e.y = ny; cx.sonido.clic();
      p.paradas.forEach((q, i) => { if (q.x === nx && q.y === ny) e.vis.add(i); });
      pintar();
      const v = validarRuta(p, e.pasos);
      if (v.llego) { e.fin = true; cx.reportar(e.pasos.length <= p.optimo + Math.max(0, 4 - Math.floor(cx.nivel / 5))); cx.en(900, () => nueva(generar(cx.rng, cx.tut ? cx.nivel + (cx.tut > 1 ? 6 : 0) : cx.nivel))); }
    }
    function deshacer() { if (e.fin || !e.pasos.length) return; e.pasos.pop(); let x = e.p.inicio.x, y = e.p.inicio.y; e.vis = new Set(); e.pasos.forEach((d) => { x += dirs[d][0]; y += dirs[d][1]; e.p.paradas.forEach((q, i) => { if (q.x === x && q.y === y) e.vis.add(i); }); }); e.x = x; e.y = y; pintar(); }
    e.paso = paso; e.deshacer = deshacer;
    nueva(generar(cx.rng, cx.tut ? cx.nivel + (cx.tut > 1 ? 6 : 0) : cx.nivel));
  },
  entrada(cx, a) {
    const e = cx.e, m = { arriba: 0, der: 1, abajo: 2, izq: 3 };
    if (a in m) { e.paso(m[a]); return true; }
    if (a === 'b') { e.deshacer(); return true; }
    return false;
  }
};
