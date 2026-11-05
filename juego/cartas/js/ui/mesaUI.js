// Mesa de fieltro: asientos, cartas animadas (repartir, voltear), fichas y reloj de turno. Generica: el juego aporta layout(vm).
import { h, fmt, colorOk, aviso } from './dom.js';
import { elementoCarta, poner } from '../marco/dibujo.js';
import { Sonido } from '../marco/sonido.js';

export const cfgUI = { animar: true };
export const hooks = { carta: null, pila: null, meld: null };
let bandejaEl, bandejaCartas, bandejaEtq, tapeteEl, barraEl, pilasEl, huecosEl, comunesWrap, bancaMano, fieltro, centro, mazo, comunes, grupoBanca, boteEl, subEl, extraEl, infoEl, asientos = [], nAnt = 0, dispAnt = '', ultimoLog = 0, prev = null, ctxAnim = { n: 0 };

export function montar(cont) {
  fieltro = h('div', { id: 'fieltro', role: 'group', 'aria-label': 'Mesa de juego' });
  mazo = h('div', { id: 'mazo', 'aria-hidden': 'true' }, [elementoCarta(null), elementoCarta(null)]);
  bancaMano = h('div', { cls: 'mano banca' }, [h('div', { cls: 'cartas' }), h('div', { cls: 'etq' })]);
  grupoBanca = h('div', { cls: 'grupo-banca' }, [bancaMano]);
  comunes = h('div', { cls: 'cartas comunes', 'aria-label': 'Cartas comunitarias' }); huecosEl = h('div', { cls: 'cartas comunes huecos', 'aria-hidden': 'true' });
  comunesWrap = h('div', { cls: 'comunes-wrap' }, [huecosEl, comunes]);
  subEl = h('div', { cls: 'sub', 'aria-live': 'off' }); boteEl = h('div', { cls: 'bote' }); extraEl = h('div', { cls: 'extra' });
  pilasEl = h('div', { cls: 'pilas' }); tapeteEl = h('div', { id: 'tapete', cls: 'tapete', hidden: '' });
  centro = h('div', { id: 'centro' }, [grupoBanca, comunesWrap, pilasEl, tapeteEl, boteEl, subEl, extraEl]);
  infoEl = h('div', { id: 'info', 'aria-live': 'polite' }); barraEl = h('div', { id: 'barra-chips', cls: 'chips', hidden: '' });
  bandejaCartas = h('div', { cls: 'cartas' }); bandejaEtq = h('div', { cls: 'etq' }); bandejaEl = h('div', { id: 'bandeja', cls: 'bandeja', hidden: '', 'aria-label': 'Tu mano' }, [bandejaCartas, bandejaEtq]);
  fieltro.append(mazo, centro, bandejaEl);
  cont.append(fieltro, infoEl, barraEl);
  return fieltro;
}
export const mazoEl = () => mazo;

function posiciones(n, disp, yo, band) {
  const out = [];
  if (disp === 'arco') {
    for (let k = 0; k < n; k++) {
      const dos = n > 3, fila = dos ? k % 2 : 0;
      out.push({ x: n > 1 ? 14 + (72 * k) / (n - 1) : 50, y: dos ? (fila ? 87 : 66) : 76 });
    }
    return out;
  }
  const base = yo >= 0 ? yo : 0;
  for (let k = 0; k < n; k++) {
    const r = (k - base + n) % n, ang = (Math.PI / 2) + (r * 2 * Math.PI) / n;
    out.push(band ? { x: 50 + 38 * Math.cos(ang), y: 41 + 26 * Math.sin(ang) } : { x: 50 + 37 * Math.cos(ang), y: 46 + 36 * Math.sin(ang) });
  }
  return out;
}
function crearAsiento(i) {
  const manos = h('div', { cls: 'manos' }), apuesta = h('div', { cls: 'apuesta' }), delta = h('div', { cls: 'delta' });
  const nombre = h('b', { cls: 'nombre' }), fichas = h('span', { cls: 'fichas' }), av = h('span', { cls: 'avatar', 'aria-hidden': 'true' }), badges = h('span', { cls: 'badges' }), reloj = h('i', { cls: 'reloj' });
  const placa = h('div', { cls: 'placa' }, [av, h('div', { cls: 'datos' }, [nombre, fichas]), badges, reloj]);
  const el = h('div', { cls: 'asiento', data: { i } }, [manos, placa, delta]);
  el._r = { manos, apuesta, delta, nombre, fichas, av, badges, reloj, placa, bet: 0, f: null };
  return el;
}
export function posicionAsientoEl(i) { return asientos[i]; }

// ---- cartas ----
function sincronizarCartas(cont, codes, opt) {
  const ex = Array.from(cont.children);
  codes.forEach((code, k) => {
    let el = ex[k];
    if (!el) {
      el = elementoCarta(code); cont.appendChild(el);
      if (cfgUI.animar && mazo) volar(el, k);
      else if (code) el.classList.add('arriba');
    } else {
      const antes = el.dataset.c || null;
      if ((antes || null) !== (code || null)) { poner(el, code); if (code && !antes) { Sonido.voltear(); if (opt && opt.sonido) opt.sonido(); } }
    }
    el.classList.toggle('dim', !!(opt && opt.dim));
    el.classList.toggle('sel', !!(opt && opt.sel && opt.sel.includes(k)));
    el.classList.toggle('clic', !!(opt && opt.clic));
    el.onclick = opt && opt.clic && code ? () => hooks.carta && hooks.carta(opt.seat, k, code, opt.mano) : null;
    if (opt && opt.clic) { el.tabIndex = 0; el.setAttribute('data-f', 1); el.onkeydown = (e) => { if (e.key === 'Enter') el.click(); }; }
  });
  for (let k = ex.length - 1; k >= codes.length; k--) ex[k].remove();
}
function volar(el, k) {
  const r = el.getBoundingClientRect(), d = mazo.getBoundingClientRect();
  if (!r.width || !d.width) return;
  const dx = d.left + d.width / 2 - (r.left + r.width / 2), dy = d.top + d.height / 2 - (r.top + r.height / 2);
  const retraso = ctxAnim.n++ * 110;
  el.style.visibility = 'hidden';
  const a = el.animate([{ transform: `translate(${dx}px,${dy}px) scale(.55) rotate(-25deg)`, opacity: 0.2 }, { transform: 'none', opacity: 1 }], { duration: 380, delay: retraso, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
  setTimeout(() => { el.style.visibility = ''; Sonido.carta(); }, retraso);
  a.onfinish = () => { el.style.visibility = ''; };
}
// fichas voladoras (apuestas al bote, bote al ganador)
export function volarFichas(desde, hacia, cant) {
  if (!cfgUI.animar || !desde || !hacia) return;
  const a = desde.getBoundingClientRect(), b = hacia.getBoundingClientRect();
  if (!a.width && !a.height) return;
  const n = Math.min(5, 2 + Math.floor(Math.log10(Math.max(1, cant || 1))));
  for (let k = 0; k < n; k++) {
    const f = h('div', { cls: 'ficha-vuelo', 'aria-hidden': 'true' }); document.body.appendChild(f);
    const x0 = a.left + a.width / 2 - 9, y0 = a.top + a.height / 2 - 9, x1 = b.left + b.width / 2 - 9 + (k - n / 2) * 4, y1 = b.top + b.height / 2 - 9;
    const an = f.animate([{ transform: `translate(${x0}px,${y0}px)` }, { transform: `translate(${x1}px,${y1}px)` }], { duration: 480 + k * 60, delay: k * 50, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'both' });
    an.onfinish = () => f.remove();
  }
  Sonido.fichas(n);
}

function fichaIcono(n) { return h('span', { cls: 'pila', 'aria-hidden': 'true' }, [h('i'), h('i'), h('i')]); }

// ---- render principal ----
export function render(vm, UI, opts) {
  const L = UI.layout(vm), n = L.asientos.length, yo = vm.yo;
  ctxAnim.n = 0;
  if (!fieltro) return;
  fieltro.dataset.n = n; fieltro.dataset.disp = L.disposicion; fieltro.dataset.juego = vm.juego; fieltro.dataset.bandeja = L.bandeja ? '1' : ''; fieltro.style.setProperty('--sw', (n > 3 ? 190 / n : 92 / n) + '%');
  if (asientos.length !== n || dispAnt !== L.disposicion) {
    asientos.forEach((a) => { a._r.apuesta.remove(); a.remove(); }); asientos = [];
    for (let i = 0; i < n; i++) { const a = crearAsiento(i); fieltro.append(a, a._r.apuesta); asientos.push(a); }
  }
  dispAnt = L.disposicion;
  const pos = posiciones(n, L.disposicion, yo, !!L.bandeja);
  const c = { x: 50, y: L.disposicion === 'arco' ? 24 : 40 };
  renderExtra(L, vm);
  L.asientos.forEach((s, i) => {
    const el = asientos[i], r = el._r, meta = vm.asientos[i], p = pos[i];
    el.style.left = p.x + '%'; el.style.top = p.y + '%';
    el.classList.toggle('yo', i === yo); el.classList.toggle('turno', !!s.turno); el.classList.toggle('fold', s.estado === 'fold'); el.classList.toggle('fuera', !!s.fuera);
    el.classList.toggle('gana', !!s.gana); el.classList.toggle('libre', meta.tipo === 'abierto'); el.classList.toggle('offline', meta.tipo === 'humano' && !meta.conectado);
    el.style.setProperty('--c', colorOk(meta.color));
    const nombre = meta.tipo === 'abierto' ? 'Asiento libre' : meta.nombre;
    r.nombre.textContent = nombre; r.av.textContent = meta.tipo === 'abierto' ? '＋' : meta.tipo === 'bot' ? '🤖' : (meta.avatar || '🙂');
    r.fichas.textContent = meta.tipo === 'abierto' ? '' : fmt(s.fichas) + (meta.pend ? ' (+' + fmt(meta.pend) + ')' : '');
    el.setAttribute('aria-label', `${nombre}${meta.tipo === 'bot' ? ' (bot ' + meta.nivel + ')' : ''}, ${fmt(s.fichas)} fichas${s.estado ? ', ' + s.estado : ''}${s.turno ? ', su turno' : ''}`);
    // insignias
    const bd = s.badges.map((b) => h('em', { cls: 'badge ' + (b.cls || ''), txt: b.txt, title: b.tit || '' }));
    if (meta.tipo === 'bot') bd.push(h('em', { cls: 'badge nivel', txt: meta.nivel }));
    if (meta.tipo === 'humano' && !meta.conectado) bd.push(h('em', { cls: 'badge off', txt: 'sin conexión' }));
    if (meta.silenciado) bd.push(h('em', { cls: 'badge', txt: '🔇' }));
    if (meta.salir) bd.push(h('em', { cls: 'badge', txt: 'se levanta' }));
    r.badges.replaceChildren(...bd);
    // manos
    const mc = r.manos; mc.style.setProperty('--m', s.manos.length || 1); while (mc.children.length > s.manos.length) mc.lastChild.remove();
    s.manos.forEach((m, k) => {
      let me = mc.children[k];
      if (!me) { me = h('div', { cls: 'mano' }, [h('div', { cls: 'cartas' }), h('div', { cls: 'etq' }), h('div', { cls: 'ap' })]); mc.appendChild(me); }
      me.classList.toggle('activa', !!m.activa); me.className = 'mano' + (m.activa ? ' activa' : '') + (m.cls ? ' ' + m.cls : '');
      me.children[0].style.setProperty('--k', m.cartas.length); sincronizarCartas(me.children[0], m.cartas, { dim: s.estado === 'fold', clic: m.clic, sel: m.sel, seat: i, mano: k });
      me.children[1].textContent = m.etiqueta || ''; me.children[2].textContent = m.apuesta ? '◉ ' + fmt(m.apuesta) : '';
    });
    // apuesta de la calle (poker)
    const ap = s.apuesta || 0;
    r.apuesta.style.left = (p.x + (c.x - p.x) * 0.34) + '%'; r.apuesta.style.top = (p.y + (c.y - p.y) * 0.34) + '%';
    if (ap) { r.apuesta.replaceChildren(fichaIcono(ap), h('b', { txt: fmt(ap) })); r.apuesta.hidden = false; } else { r.apuesta.replaceChildren(); r.apuesta.hidden = true; }
    // delta de mano
    if (s.delta != null && s.delta !== 0) { r.delta.textContent = (s.delta > 0 ? '+' : '−') + fmt(Math.abs(s.delta)); r.delta.className = 'delta ' + (s.delta > 0 ? 'mas' : 'menos') + ' ver'; } else r.delta.className = 'delta';
    // reloj
    const pl = vm.plazo && vm.plazo[i];
    if (pl != null && s.turno) { if (r.reloj._k !== vm.rev) { r.reloj._k = vm.rev; r.reloj.style.setProperty('--dur', pl + 'ms'); r.reloj.classList.remove('corre'); void r.reloj.offsetWidth; r.reloj.classList.add('corre'); } }
    else { r.reloj.classList.remove('corre'); r.reloj._k = null; }
    // fichas voladoras: apuesta recogida al bote, o bote al ganador
    if (prev && prev.n === n) {
      if (prev.ap[i] > 0 && ap === 0 && !L.fin && L.centro.bote > 0) volarFichas(r.placa, boteEl, prev.ap[i]);
      if (L.fin && !prev.fin && s.fichas > prev.f[i]) volarFichas(boteEl, r.placa, s.fichas - prev.f[i]);
    }
  });
  // centro
  const cg = L.centro;
  centro.style.top = (L.disposicion === 'arco' ? 30 : 40) + '%';
  comunesWrap.hidden = !cg.huecos; sincronizarCartas(comunes, cg.cartas, {});
  while (huecosEl.children.length < cg.huecos) huecosEl.appendChild(h('div', { cls: 'carta hueco' }));
  while (huecosEl.children.length > cg.huecos) huecosEl.lastChild.remove();
  const pilas = cg.pilas || [];
  while (pilasEl.children.length > pilas.length) pilasEl.lastChild.remove();
  pilas.forEach((pl, k) => {
    let pe = pilasEl.children[k];
    if (!pe) { pe = h('div', { cls: 'pila-c', data: { id: pl.id } }, [h('div', { cls: 'cartas' }), h('small', { cls: 'etq' })]); pilasEl.appendChild(pe); }
    sincronizarCartas(pe.children[0], pl.cartas, { clic: pl.clic, seat: pl.id }); pe.children[1].textContent = pl.etiqueta || ''; pe.dataset.id = pl.id;
    const c0 = pe.children[0].firstChild; if (c0 && pl.clic) c0.onclick = () => hooks.pila && hooks.pila(pl.id);
  });
  grupoBanca.hidden = !cg.grupos.length;
  if (cg.grupos.length) {
    const g = cg.grupos[0];
    sincronizarCartas(bancaMano.children[0], g.cartas, {}); bancaMano.children[1].textContent = g.etiqueta || '';
  } else sincronizarCartas(bancaMano.children[0], [], {});
  boteEl.textContent = cg.bote ? '🪙 ' + fmt(cg.bote) : ''; boteEl.hidden = !cg.bote;
  subEl.textContent = cg.subtitulo || ''; extraEl.textContent = cg.extra || '';
  infoEl.textContent = [L.cabecera, L.info].filter(Boolean).join('  ·  ');
  prev = { n, f: L.asientos.map((s) => s.fichas), ap: L.asientos.map((s) => s.apuesta || 0), bote: cg.bote || 0, fin: !!L.fin };
  return L;
}
// bandeja de mano propia (manos grandes), tapete de combinaciones y chips de estado
function renderExtra(L, vm) {
  const b = L.bandeja;
  bandejaEl.hidden = !b;
  if (b) {
    const k = b.cartas.length; bandejaCartas.style.setProperty('--k', k);
    bandejaEl.style.setProperty('--bw', k <= 7 ? 'clamp(40px, 14.5vw, 66px)' : k <= 11 ? 'clamp(36px, 11.5vw, 58px)' : 'clamp(32px, 9.5vw, 50px)');
    sincronizarCartas(bandejaCartas, b.cartas, { clic: b.clic, sel: b.sel, seat: vm.yo, mano: -1, dim: false });
    bandejaEtq.textContent = b.etiqueta || ''; bandejaEl.classList.toggle('turno', !!b.turno);
  }
  const tp = (L.centro && L.centro.tapete) || [];
  tapeteEl.hidden = !tp.length;
  while (tapeteEl.children.length > tp.length) tapeteEl.lastChild.remove();
  tp.forEach((m, k) => {
    let me = tapeteEl.children[k];
    if (!me) { me = h('div', { cls: 'meld', tabindex: '0', 'data-f': 1, role: 'button' }, [h('div', { cls: 'cartas' }), h('small', { cls: 'etq' })]); tapeteEl.appendChild(me); }
    me.dataset.meld = m.id; me.style.setProperty('--c', colorOk(m.color)); me.classList.toggle('dest', !!m.destacada); me.classList.toggle('clic', !!m.clic);
    me.setAttribute('aria-label', m.aria || ('Combinación ' + m.etiqueta));
    me.children[0].style.setProperty('--k', m.cartas.length); sincronizarCartas(me.children[0], m.cartas, { seat: -1 });
    me.children[1].textContent = m.etiqueta || '';
    me.onclick = () => hooks.meld && hooks.meld(m.id); me.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); me.click(); } };
  });
  const ch = L.barra || [];
  barraEl.hidden = !ch.length;
  barraEl.replaceChildren(...ch.map((c) => h('span', { cls: 'chip ' + (c.cls || ''), txt: c.txt, title: c.tit || '' })));
}
export function reiniciarPrevio() { prev = null; asientos.forEach((a) => { a._r.apuesta.remove(); a.remove(); }); asientos = []; }
export function elementoBote() { return boteEl; }
export function burbuja(i, texto, color) {
  const a = asientos[i]; if (!a) return;
  const b = h('div', { cls: 'burbuja', txt: texto, style: '--c:' + colorOk(color) }); a.appendChild(b); setTimeout(() => b.remove(), 4500);
}
