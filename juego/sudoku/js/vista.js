// Dibujo del tablero: celdas DOM, bordes de regiones (SVG), jaulas killer, sombreado de variantes y resaltados.
import { h } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
const COLNOTAS = { 4: 2, 6: 3, 9: 3 };

export function crearVista(raiz, { alCelda } = {}) {
  let p = null, celdas = [], firmas = [], tam = 0;

  function montar(partida) {
    p = partida; raiz.textContent = ''; celdas = []; firmas = [];
    const { M, n } = p;
    raiz.style.setProperty('--n', n);
    raiz.dataset.n = n; raiz.dataset.v = p.puzzle.v;
    raiz.setAttribute('role', 'grid'); raiz.setAttribute('aria-label', 'Tablero de Sudoku');
    const cols = COLNOTAS[n] || 3, extra = new Map();
    M.unidades.forEach((u) => { if (u.tipo === 'extra') u.celdas.forEach((c) => extra.set(c, u.nombre.startsWith('ventana') ? 'w' : 'x')); });
    const cumbre = new Map();
    M.jaulas.forEach((J) => { cumbre.set(Math.min(...J.celdas), J.suma); });
    for (let i = 0; i < M.N; i++) {
      const c = h('div', { cls: 'c', 'data-i': i, role: 'gridcell' });
      if (extra.has(i)) c.classList.add(extra.get(i));
      const v = h('span', { cls: 'v' });
      const nt = h('span', { cls: 'nt', style: `--cn:${cols}` });
      const ns = [];
      for (let d = 1; d <= n; d++) { const x = h('i', { 'data-d': d }); nt.appendChild(x); ns.push(x); }
      c.appendChild(nt); c.appendChild(v);
      if (cumbre.has(i)) c.appendChild(h('span', { cls: 'suma', txt: String(cumbre.get(i)) }));
      const jk = M.jaulaDe[i];
      if (jk >= 0) {
        const r = Math.floor(i / n), co = i % n, mis = (rr, cc) => rr >= 0 && rr < n && cc >= 0 && cc < n && M.jaulaDe[rr * n + cc] === jk;
        const lados = [!mis(r - 1, co), !mis(r, co + 1), !mis(r + 1, co), !mis(r, co - 1)]; // arriba, derecha, abajo, izquierda
        c.classList.add('jl');
        ['t', 'r', 'b', 'l'].forEach((k, q) => {
          c.style.setProperty('--j' + k, lados[q] ? '3px' : '0px');
          c.style.setProperty('--b' + k, lados[q] ? '1.5px' : '0px');
        });
      }
      raiz.appendChild(c);
      celdas.push({ el: c, v, ns });
      firmas.push('');
    }
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${n} ${n}`); svg.setAttribute('class', 'regiones'); svg.setAttribute('aria-hidden', 'true');
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const i = r * n + c;
      if (c < n - 1 && M.reg[i] !== M.reg[i + 1]) d += `M${c + 1} ${r}V${r + 1}`;
      if (r < n - 1 && M.reg[i] !== M.reg[i + n]) d += `M${c} ${r + 1}H${c + 1}`;
    }
    const path = document.createElementNS(NS, 'path'); path.setAttribute('d', d); path.setAttribute('class', 'reg-int');
    const marco = document.createElementNS(NS, 'rect'); marco.setAttribute('x', 0); marco.setAttribute('y', 0); marco.setAttribute('width', n); marco.setAttribute('height', n); marco.setAttribute('class', 'reg-ext');
    svg.appendChild(path); svg.appendChild(marco); raiz.appendChild(svg);
    ajustarTam();
  }

  function ajustarTam() {
    const w = raiz.clientWidth;
    if (!w || !p) return;
    tam = w;
    raiz.style.setProperty('--cel', (w / p.n) + 'px');
  }

  /* est: {sel:Set, foco, num, conf:Set, malos:Set, pc:Set, pa:Set, elim:Map, resaltar:{iguales,unidades,conflictos}} */
  function pintar(est) {
    const P = est.p || p;
    if (!p) return;
    const n = p.n, M = p.M, ra = est.resaltar || {};
    const focoVal = est.foco >= 0 ? P.v[est.foco] : 0, num = est.num || focoVal;
    const veFoco = est.foco >= 0 && ra.unidades !== false ? M.ve : null;
    for (let i = 0; i < M.N; i++) {
      const v = P.v[i], nm = P.notas[i], c = celdas[i], fan = est.fantasma ? est.fantasma.get(i) || 0 : 0;
      const cls = [];
      if (p.dados[i]) cls.push('dado');
      if (est.sel.has(i)) cls.push(i === est.foco ? 'foco' : 'sel');
      else if (veFoco && est.foco !== i && veFoco[est.foco * M.N + i]) cls.push('unid');
      if (num && ra.iguales !== false && v === num && !est.sel.has(i)) cls.push('igual');
      if (ra.conflictos !== false && est.conf.has(i)) cls.push('mal');
      if (est.malos && est.malos.has(i)) cls.push('err');
      if (est.pc && est.pc.has(i)) cls.push('pc'); else if (est.pa && est.pa.has(i)) cls.push('pa');
      if (fan && !v) cls.push('fan');
      const el = est.elim ? est.elim.get(i) || 0 : 0;
      const firma = cls.join(' ') + '|' + v + '|' + nm + '|' + (num && !v ? num : 0) + '|' + el + '|' + fan;
      if (firmas[i] === firma) continue;
      firmas[i] = firma;
      c.el.className = 'c' + (c.el.classList.contains('jl') ? ' jl' : '') + (c.el.classList.contains('x') ? ' x' : '') + (c.el.classList.contains('w') ? ' w' : '') + (cls.length ? ' ' + cls.join(' ') : '');
      c.v.textContent = v ? String(v) : (fan ? String(fan) : '');
      c.el.setAttribute('aria-label', `Fila ${Math.floor(i / n) + 1}, columna ${(i % n) + 1}: ` + (v ? v : (nm ? 'notas' : 'vacía')) + (p.dados[i] ? ' (dato)' : ''));
      for (let d = 1; d <= n; d++) {
        const x = c.ns[d - 1], on = !v && (nm & (1 << (d - 1)));
        const t = on || (el & (1 << (d - 1))) ? String(d) : '';
        if (x.textContent !== t) x.textContent = t;
        x.className = (num === d && on ? 'hl ' : '') + (el & (1 << (d - 1)) ? 'tach' : '');
      }
    }
  }

  const celdaEn = (x, y) => { const e = document.elementFromPoint(x, y); const c = e && e.closest ? e.closest('.c') : null; return c && raiz.contains(c) ? +c.dataset.i : -1; };
  new ResizeObserver(() => { ajustarTam(); }).observe(raiz);
  return { montar, pintar, ajustarTam, celdaEn, rect: () => raiz.getBoundingClientRect(), celda: (i) => celdas[i] && celdas[i].el, get tam() { return tam; } };
}
