// HUD de partida: barras, ranuras de armas, materiales, minimapa, mapa grande, killfeed, mensajes, rueda de emotes y rejilla de edicion.
import { h, fmt } from './dom.js';
import { EMOTES } from './personajes.js';
import { RAREZAS } from './armas.js';
import { MATS } from './construccion.js';
export function crearHud(raiz, cb) {
  const el = {};
  const mk = (id, cls, kids, tag = 'div') => { el[id] = h(tag, { cls, id: 'h-' + id }, kids); return el[id]; };
  const hud = h('div', { id: 'hud', hidden: true }, [
    mk('mini', 'mini', [h('canvas', { width: 170, height: 170 })]), mk('info', 'info'), mk('torm', 'torm'),
    mk('feed', 'feed'), mk('msg', 'msg'), mk('prompt', 'prompt'), mk('cruz', 'cruz', [h('i')]), mk('hit', 'hit'), mk('viñeta', 'vig'), mk('torvig', 'torvig'), mk('mira', 'mira'),
    mk('barras', 'barras', [mk('bv', 'bar v', [h('i'), h('b')]), mk('be', 'bar e', [h('i'), h('b')])]),
    mk('mats', 'mats'), mk('slots', 'slots'), mk('ammo', 'ammo'), mk('cons', 'cons'), mk('usar', 'usar', [h('i'), h('span')]),
    mk('build', 'buildinfo'), mk('fps', 'fps'), mk('etiquetas', 'etiquetas'), mk('espectar', 'espectar'), mk('cuenta', 'cuenta-atras'),
    mk('bus', 'busmsg')]);
  raiz.appendChild(hud);
  /* ranuras de arma tocables */
  const slots = [];
  for (let i = 0; i < 6; i++) { const s = h('button', { type: 'button', cls: 'slot', tabindex: '-1', on: { click: () => cb.slot(i) } }, [h('small', { txt: String(i + 1) }), h('span')]); el.slots.appendChild(s); slots.push(s); }
  const mats = {};
  Object.keys(MATS).forEach((m) => { const b = h('button', { type: 'button', cls: 'mat ' + m, tabindex: '-1', on: { click: () => cb.material(m) } }, [h('b', { txt: '0' })]); el.mats.appendChild(b); mats[m] = b; });
  const cache = {}; const set = (k, node, v) => { if (cache[k] !== v) { cache[k] = v; node.textContent = v; } };
  const mcv = el.mini.firstChild, mctx = mcv.getContext('2d');
  /* mapa grande */
  const grande = h('div', { cls: 'mapa-grande', hidden: true, on: { click: () => { grande.hidden = true; } } }, [h('canvas', { width: 640, height: 640 }), h('p', { txt: 'Toca o pulsa M para cerrar' })]);
  raiz.appendChild(grande); const gctx = grande.firstChild.getContext('2d');
  let fondo = null;
  function dibujarMapa(g, W, d, zoom) {
    g.clearRect(0, 0, W, W); g.save();
    const esc = zoom ? W / zoom : W / 800, cx = zoom ? d.yo.x : 0, cz = zoom ? d.yo.z : 0, X = (x) => (x - cx) * esc + W / 2, Z = (z) => (z - cz) * esc + W / 2;
    if (zoom) { g.beginPath(); g.arc(W / 2, W / 2, W / 2, 0, 7); g.clip(); }
    g.fillStyle = '#245d86'; g.fillRect(0, 0, W, W);
    if (fondo) g.drawImage(fondo, X(-400), Z(-400), 800 * esc, 800 * esc);
    const t = d.torm;
    if (t) {
      g.save(); g.beginPath(); g.rect(0, 0, W, W); g.arc(X(t.cx), Z(t.cz), Math.max(0.1, t.r * esc), 0, 7, true); g.fillStyle = 'rgba(120,40,200,.38)'; g.fill('evenodd'); g.restore();
      g.strokeStyle = '#c58cff'; g.lineWidth = 2; g.beginPath(); g.arc(X(t.cx), Z(t.cz), Math.max(0.1, t.r * esc), 0, 7); g.stroke();
      if (t.prox) { g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(X(t.prox.x), Z(t.prox.z), Math.max(0.1, t.prox.r * esc), 0, 7); g.stroke(); }
    }
    g.fillStyle = '#fff'; g.font = (zoom ? 10 : 12) + 'px sans-serif'; g.textAlign = 'center';
    for (const p of d.pois) { g.fillRect(X(p.x) - 2, Z(p.z) - 2, 4, 4); if (!zoom || Math.abs(p.x - cx) < zoom / 2) g.fillText(p.n, X(p.x), Z(p.z) - 6); }
    if (d.bus) { g.strokeStyle = '#ffd23d'; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(X(d.bus.x0), Z(d.bus.z0)); g.lineTo(X(d.bus.x1), Z(d.bus.z1)); g.stroke(); g.setLineDash([]); g.fillStyle = '#ffd23d'; g.beginPath(); g.arc(X(d.bus.x), Z(d.bus.z), 5, 0, 7); g.fill(); }
    (d.aliados || []).forEach((a) => { g.fillStyle = document.body.dataset.dalt === 'no' || !document.body.dataset.dalt ? '#6dff6d' : '#4aa8ff'; g.beginPath(); g.arc(X(a.x), Z(a.z), 4, 0, 7); g.fill(); });
    (d.cofres || []).forEach((c) => { g.fillStyle = '#ffc12e'; g.fillRect(X(c.x) - 1.5, Z(c.z) - 1.5, 3, 3); });
    g.translate(X(d.yo.x), Z(d.yo.z)); g.rotate(Math.PI - d.yo.ry); g.fillStyle = '#ff3d6e'; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  /* rueda de emotes */
  const rueda = h('div', { cls: 'emotes', hidden: true }, EMOTES.map((n, i) => h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: (i + 1) + ' ' + n, on: { click: () => { rueda.hidden = true; cb.emote(i); } } })));
  rueda.appendChild(h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, 'data-back': 1, txt: 'Cerrar', on: { click: () => { rueda.hidden = true; cb.cerrarPanel && cb.cerrarPanel(); } } }));
  raiz.appendChild(rueda);
  addEventListener('keydown', (e) => { if (rueda.hidden) return; if (/^Digit[1-6]$/.test(e.code)) { rueda.hidden = true; cb.emote(+e.code.slice(5) - 1); } else if (e.code === 'Escape' || e.code === 'KeyT') { rueda.hidden = true; } });
  /* rejilla de edicion 3x3 */
  const celdas = Array.from({ length: 9 }, (_, n) => h('i', { 'data-n': n })), rej = h('div', { cls: 'rejilla' }, celdas), edit = h('div', { cls: 'edicion', hidden: true }, [h('p', { txt: 'Edición: clic o toque para quitar/poner; suelta Editar para confirmar' }), rej, h('div', { cls: 'cursor' })]);
  raiz.appendChild(edit);
  const cur = edit.querySelector('.cursor'); let mask = 511, pintar = null, cx = 1.5, cy = 1.5;
  const pinta = () => { celdas.forEach((c, n) => c.classList.toggle('quitada', !(mask >> n & 1))); };
  const celdaEn = (x, y) => Math.min(2, Math.max(0, Math.floor(y))) * 3 + Math.min(2, Math.max(0, Math.floor(x)));
  const toggleHover = (forzar) => { const n = celdaEn(cx, cy), act = !(mask >> n & 1); if (forzar == null) { pintar = act; } if ((forzar == null ? true : (mask >> n & 1) !== (pintar ? 1 : 0))) { mask = pintar ? mask | (1 << n) : mask & ~(1 << n); pinta(); } };
  celdas.forEach((c, n) => { c.addEventListener('pointerdown', (e) => { e.preventDefault(); pintar = !(mask >> n & 1); mask = pintar ? mask | (1 << n) : mask & ~(1 << n); pinta(); }); c.addEventListener('pointerenter', (e) => { if (e.buttons && pintar != null) { mask = pintar ? mask | (1 << n) : mask & ~(1 << n); pinta(); } }); });
  addEventListener('pointerup', () => { pintar = null; });
  const ED = {
    get abierta() { return !edit.hidden; }, get mask() { return mask; },
    abrir(m) { mask = m; cx = cy = 1.5; edit.hidden = false; pinta(); posCur(); },
    mover(dx, dy) { cx = Math.min(2.99, Math.max(0, cx + dx)); cy = Math.min(2.99, Math.max(0, cy + dy)); posCur(); },
    presionar(abajo) { if (abajo) toggleHover(); else pintar = null; },
    arrastrar() { if (pintar != null) toggleHover(false); },
    cerrar() { edit.hidden = true; pintar = null; }
  };
  function posCur() { cur.style.left = (rej.offsetLeft + cx / 3 * rej.offsetWidth) + 'px'; cur.style.top = (rej.offsetTop + cy / 3 * rej.offsetHeight) + 'px'; }
  /* killfeed, mensajes */
  const feed = []; let msgT = 0, hitT = 0, danoT = 0;
  const H = {
    el, ed: ED, emotes: rueda,
    mostrar(v) { hud.hidden = !v; },
    fondoMapa(c) { fondo = c; },
    baja(txt, mio) { const d = h('div', { cls: 'bj' + (mio ? ' mio' : ''), txt }); el.feed.prepend(d); feed.push({ d, t: performance.now() }); while (feed.length > 6) feed.shift().d.remove(); },
    limpiarFeed() { feed.forEach((f) => f.d.remove()); feed.length = 0; },
    mensaje(txt, ms = 3000) { el.msg.textContent = txt; el.msg.classList.add('on'); msgT = performance.now() + ms; },
    impacto(head, kill) { el.hit.className = 'hit on' + (head ? ' head' : '') + (kill ? ' kill' : ''); hitT = performance.now() + 160; },
    dano(f) { el.viñeta.style.opacity = Math.min(0.85, f); danoT = performance.now() + 350; },
    toggleMapa(v) { grande.hidden = v == null ? !grande.hidden : !v; },
    get mapaAbierto() { return !grande.hidden; },
    abrirEmotes() { rueda.hidden = false; cb.abrirPanel && cb.abrirPanel(rueda); },
    get emotesAbiertos() { return !rueda.hidden; },
    cerrarEmotes() { rueda.hidden = true; },
    cuentaAtras(t) { el.cuenta.textContent = t == null ? '' : t; },
    actualizar(s) {
      const ahora = performance.now();
      if (msgT && ahora > msgT) { el.msg.classList.remove('on'); msgT = 0; }
      if (hitT && ahora > hitT) { el.hit.className = 'hit'; hitT = 0; }
      if (danoT && ahora > danoT) { el.viñeta.style.opacity = 0; danoT = 0; }
      feed.forEach((f) => { if (ahora - f.t > 7000) f.d.style.opacity = 0; });
      set('vv', el.bv.lastChild, Math.ceil(s.vida)); el.bv.firstChild.style.width = Math.max(0, s.vida) + '%';
      set('ee', el.be.lastChild, Math.ceil(s.esc)); el.be.firstChild.style.width = Math.max(0, s.esc) + '%';
      for (const m in mats) { set('m' + m, mats[m].firstChild, s.mats[m] > 9998 ? '∞' : s.mats[m]); mats[m].classList.toggle('sel', s.construyendo && s.matSel === m); }
      slots.forEach((b, i) => { const sl = s.slots[i]; b.classList.toggle('sel', s.slotSel === i && !s.construyendo); b.style.borderColor = sl ? sl.color : ''; const t = sl ? sl.n : ''; if (b.lastChild.textContent !== t) b.lastChild.textContent = t; });
      set('ammo', el.ammo, s.ammo || ''); set('cons', el.cons, s.cons || '');
      set('info', el.info, `Vivos ${s.vivos}   Bajas ${s.elims}`);
      set('torm', el.torm, s.tormTxt || ''); el.torm.dataset.m = s.tormModo || '';
      set('prompt', el.prompt, s.prompt || ''); set('msgb', el.espectar, s.espectar || '');
      set('bus', el.bus, s.busTxt || '');
      el.usar.hidden = !s.usando; if (s.usando) { el.usar.firstChild.style.width = Math.round(s.usando.p * 100) + '%'; set('us', el.usar.lastChild, s.usando.t); }
      el.build.hidden = !s.construyendo; set('bld', el.build, s.construyendo ? `${s.piezaNombre} · ${s.matNombre} (${s.costo})` : '');
      el.mira.style.display = s.mira ? 'block' : 'none'; el.cruz.style.display = s.cruz ? 'block' : 'none';
      el.torvig.style.opacity = s.fueraTormenta ? 0.55 : 0; set('fps', el.fps, s.fps || '');
      if (s.mapaDatos) { dibujarMapa(mctx, 170, s.mapaDatos, 300); if (!grande.hidden) dibujarMapa(gctx, 640, s.mapaDatos, 0); }
      /* etiquetas de aliados */
      const et = s.etiquetas || []; while (el.etiquetas.children.length < et.length) el.etiquetas.appendChild(h('div', { cls: 'et' }));
      for (let i = 0; i < el.etiquetas.children.length; i++) { const d = el.etiquetas.children[i], e = et[i]; if (!e) { d.style.display = 'none'; continue; } d.style.display = 'block'; d.style.transform = `translate(${e.x}px,${e.y}px) translate(-50%,-100%)`; d.textContent = e.n; d.style.color = e.c; }
    }
  };
  return H;
}
export { RAREZAS };
