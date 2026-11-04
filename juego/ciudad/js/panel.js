// =============================================================
//  🪟  PANEL: ventana de menús reutilizable (ajustes, teléfono, tiendas...)
//  Sirve con ratón, toque, teclado y mando Xbox (cruceta/stick, A, B, LB/RB).
//  Filas: boton, interruptor, deslizador, selector, info, titulo, texto, tecla, area
// =============================================================
const Panel = (() => {
  let raiz = null, cajaEl = null, tituloEl = null, tabsEl = null, cuerpoEl = null, pieEl = null;
  let def = null, tab = 0, filas = [], sel = 0, previo = 'jugando', capturando = null;
  let stickPrev = 0, repetir = 0;

  function crear() {
    raiz = document.createElement('div');
    raiz.id = 'panel';
    raiz.className = 'capa oculto';
    raiz.innerHTML = '<div class="caja-panel"><div class="pn-cab"><h2 id="pnTitulo"></h2><button type="button" id="pnX" aria-label="Cerrar">✕</button></div>' +
      '<div class="pn-tabs" id="pnTabs"></div><div class="pn-cuerpo" id="pnCuerpo"></div><div class="pn-pie" id="pnPie"></div></div>';
    document.body.appendChild(raiz);
    cajaEl = raiz.querySelector('.caja-panel');
    tituloEl = raiz.querySelector('#pnTitulo');
    tabsEl = raiz.querySelector('#pnTabs');
    cuerpoEl = raiz.querySelector('#pnCuerpo');
    pieEl = raiz.querySelector('#pnPie');
    raiz.querySelector('#pnX').addEventListener('click', () => cerrar());
    raiz.addEventListener('pointerdown', (e) => e.stopPropagation());
    window.addEventListener('keydown', teclaDown, true);
  }

  const interactiva = (f) => f && f.t !== 'info' && f.t !== 'titulo' && !f.deshabilitado;

  function listaFilas() {
    const t = def.pestanas[tab];
    return (typeof t.filas === 'function' ? t.filas() : t.filas) || [];
  }

  function enfocar(i) {
    const els = cuerpoEl.querySelectorAll('[data-i]');
    els.forEach((e) => e.classList.remove('pn-sel'));
    const e = cuerpoEl.querySelector(`[data-i="${i}"]`);
    if (e) {
      e.classList.add('pn-sel');
      if (e.scrollIntoView) e.scrollIntoView({ block: 'nearest' });
    }
  }

  function render(conservarScroll) {
    if (!def) return;
    const sc = cuerpoEl.scrollTop;
    tituloEl.textContent = def.titulo;
    tabsEl.innerHTML = '';
    tabsEl.style.display = def.pestanas.length > 1 ? '' : 'none';
    def.pestanas.forEach((p, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = p.nombre;
      if (k === tab) b.className = 'act';
      b.addEventListener('click', () => { tab = k; sel = 0; render(); });
      tabsEl.appendChild(b);
    });
    filas = listaFilas();
    cuerpoEl.innerHTML = '';
    cuerpoEl.classList.toggle('pn-rejilla', !!def.pestanas[tab].rejilla);
    filas.forEach((f, i) => cuerpoEl.appendChild(crearFila(f, i)));
    if (!interactiva(filas[sel])) sel = Math.max(0, filas.findIndex(interactiva));
    enfocar(sel);
    if (conservarScroll) cuerpoEl.scrollTop = sc;
    pieEl.textContent = def.pie || (Entrada.tactil ? 'Toca una opción · ✕ para cerrar' : Entrada.hayMando ? 'Cruceta: mover · A: elegir · B: volver · LB/RB: pestañas' : 'Flechas: mover · Enter: elegir · Esc: volver · Tab: pestañas');
  }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function crearFila(f, i) {
    let d;
    if (f.t === 'titulo') { d = el('div', 'pn-titulo', esc(f.texto)); return d; }
    if (f.t === 'info') {
      d = el('div', 'pn-fila pn-info', `<span>${esc(f.texto)}</span><b>${esc(f.valor === undefined ? '' : f.valor)}</b>`);
      return d;
    }
    if (f.t === 'area') {
      d = el('div', 'pn-fila pn-area');
      const ta = document.createElement('textarea');
      ta.rows = f.filas || 4;
      ta.value = f.valor || '';
      ta.readOnly = !!f.soloLectura;
      ta.placeholder = f.texto || '';
      ta.addEventListener('input', () => { f.valor = ta.value; });
      d.appendChild(ta);
      f.el = ta;
      return d;
    }
    d = el('div', 'pn-fila' + (f.deshabilitado ? ' pn-off' : '') + (f.peligro ? ' pn-peligro' : ''));
    d.dataset.i = i;
    if (f.t === 'boton') {
      d.classList.add('pn-boton');
      d.innerHTML = `<span>${esc(f.texto)}</span>` + (f.nota ? `<small>${esc(f.nota)}</small>` : '') + (f.precio !== undefined ? `<b>${esc(f.precio)}</b>` : '');
      if (f.color) d.style.setProperty('--c', f.color);
    } else if (f.t === 'interruptor') {
      d.innerHTML = `<span>${esc(f.texto)}</span><span class="pn-sw ${f.get() ? 'on' : ''}"><i></i></span>`;
    } else if (f.t === 'deslizador') {
      const v = f.get();
      d.innerHTML = `<span>${esc(f.texto)}</span><span class="pn-ctl"><input type="range" min="${f.min}" max="${f.max}" step="${f.paso || 1}" value="${v}"><b>${esc(f.fmt ? f.fmt(v) : v)}</b></span>`;
      const inp = d.querySelector('input'), val = d.querySelector('b');
      inp.addEventListener('input', () => { const n = Number(inp.value); f.set(n); val.textContent = f.fmt ? f.fmt(n) : n; });
      inp.addEventListener('change', () => { if (f.alCambiar) f.alCambiar(); });
    } else if (f.t === 'selector') {
      const act = f.get();
      const op = f.opciones.find((o) => o[0] === act) || f.opciones[0];
      d.innerHTML = `<span>${esc(f.texto)}</span><span class="pn-ctl pn-sel2"><button type="button" data-d="-1">◀</button><b>${esc(op[1])}</b><button type="button" data-d="1">▶</button></span>`;
      d.querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); sel = i; cambiar(i, Number(b.dataset.d)); }));
    } else if (f.t === 'tecla') {
      d.innerHTML = `<span>${esc(f.texto)}</span><span class="pn-ctl"><b class="pn-tecla">${capturando === f ? 'Pulsa una tecla...' : esc(nombreTecla(f.get()))}</b></span>`;
    }
    if (f.deshabilitado) return d;
    d.addEventListener('click', () => {
      sel = i;
      enfocar(i);
      if (f.t === 'selector') return;
      activar(i);
    });
    return d;
  }

  function nombreTecla(c) {
    if (!c) return '—';
    return String(c).replace(/^Key/, '').replace(/^Digit/, '').replace('Arrow', 'Flecha ').replace('ShiftLeft', 'Shift').replace('Space', 'Espacio').replace('Control', 'Ctrl');
  }

  function activar(i) {
    const f = filas[i];
    if (!f || f.deshabilitado) return;
    if (f.t === 'boton') {
      if (f.accion) f.accion();
    } else if (f.t === 'interruptor') {
      f.set(!f.get());
      if (f.alCambiar) f.alCambiar();
      render(true);
    } else if (f.t === 'tecla') {
      capturando = f;
      render(true);
    }
  }

  function cambiar(i, paso) {
    const f = filas[i];
    if (!f || f.deshabilitado) return;
    if (f.t === 'deslizador') {
      const n = Util.limitar(f.get() + paso * (f.paso || 1), f.min, f.max);
      f.set(Math.round(n * 1000) / 1000);
      if (f.alCambiar) f.alCambiar();
      render(true);
    } else if (f.t === 'selector') {
      const k = f.opciones.findIndex((o) => o[0] === f.get());
      const n = (k + paso + f.opciones.length) % f.opciones.length;
      f.set(f.opciones[n][0]);
      if (f.alCambiar) f.alCambiar();
      render(true);
    } else if (f.t === 'interruptor') {
      f.set(paso > 0);
      if (f.alCambiar) f.alCambiar();
      render(true);
    }
  }

  function mover(paso) {
    const n = filas.length;
    if (!n) return;
    let i = sel;
    for (let k = 0; k < n; k++) {
      i = (i + paso + n) % n;
      if (interactiva(filas[i])) { sel = i; enfocar(i); return; }
    }
  }

  function cambiarTab(paso) {
    if (def.pestanas.length < 2) return;
    tab = (tab + paso + def.pestanas.length) % def.pestanas.length;
    sel = 0;
    render();
  }

  const rejilla = () => !!(def && def.pestanas[tab].rejilla);

  function teclaDown(e) {
    if (!def) return;
    if (capturando) {
      e.preventDefault();
      e.stopPropagation();
      const f = capturando;
      capturando = null;
      if (e.code !== 'Escape') f.set(e.code);
      render(true);
      return;
    }
    if (e.target && /^(TEXTAREA|INPUT)$/.test(e.target.tagName) && e.target.type !== 'range') {
      if (e.code === 'Escape') e.target.blur();
      return;
    }
    const k = e.code;
    const dY = rejilla() ? 2 : 1;
    if (k === 'ArrowDown') { e.preventDefault(); mover(dY); }
    else if (k === 'ArrowUp') { e.preventDefault(); mover(-dY); }
    else if (k === 'ArrowLeft') { e.preventDefault(); rejilla() ? mover(-1) : cambiar(sel, -1); }
    else if (k === 'ArrowRight') { e.preventDefault(); rejilla() ? mover(1) : cambiar(sel, 1); }
    else if (k === 'Enter' || k === 'Space') {
      if (e.target && e.target.tagName === 'INPUT') return;
      e.preventDefault();
      activar(sel);
    } else if (k === 'Escape') { e.preventDefault(); cerrar(); }
    else if (k === 'Tab') { e.preventDefault(); cambiarTab(e.shiftKey ? -1 : 1); }
    else if (k === 'PageDown') cambiarTab(1);
    else if (k === 'PageUp') cambiarTab(-1);
  }

  // Mando Xbox: se llama cada cuadro mientras el panel esta abierto
  function actualizar(dt) {
    if (!def || !window.Mando || !Mando.conectado) return;
    if (capturando) return;
    const P = (n) => Mando.pulsado(n);
    const izq = Mando.ejes.izq;
    let dx = 0, dy = 0;
    if (P('ABAJO')) dy = 1; else if (P('ARRIBA')) dy = -1;
    if (P('DER')) dx = 1; else if (P('IZQ')) dx = -1;
    const fy = Math.abs(izq.y) > 0.6 ? Math.sign(izq.y) : 0;
    const fx = Math.abs(izq.x) > 0.6 ? Math.sign(izq.x) : 0;
    repetir -= dt;
    const st = fy * 3 + fx;
    if (st && (st !== stickPrev || repetir <= 0)) {
      if (fy) dy = fy;
      if (fx) dx = fx;
      repetir = st !== stickPrev ? 0.35 : 0.12;
    }
    stickPrev = st;
    if (dy) mover(rejilla() ? dy * 2 : dy);
    if (dx) rejilla() ? mover(dx) : cambiar(sel, dx);
    if (P('A')) activar(sel);
    if (P('B') || P('MENU')) cerrar();
    if (P('LB')) cambiarTab(-1);
    if (P('RB')) cambiarTab(1);
  }

  function abrir(d) {
    if (!raiz) crear();
    if (def) { def = d; tab = d.tab || 0; sel = 0; render(); return; }
    previo = J.modo;
    def = d;
    tab = d.tab || 0;
    sel = 0;
    capturando = null;
    J.modo = 'menu';
    Entrada.soltarTodo();
    Sonido.callarContinuos();
    document.body.classList.add('en-panel');
    raiz.classList.remove('oculto');
    raiz.classList.toggle('pn-transparente', !!d.transparente);
    render();
  }

  function cerrar(silencioso) {
    if (!def) return;
    const d = def;
    def = null;
    capturando = null;
    raiz.classList.add('oculto');
    document.body.classList.remove('en-panel');
    if (J.modo === 'menu') J.modo = previo === 'menu' ? 'jugando' : previo;
    if (!silencioso && d.alCerrar) d.alCerrar();
  }

  return {
    abrir, cerrar, actualizar,
    refrescar() { if (def) render(true); },
    get abierto() { return !!def; },
    get previo() { return previo; },
    nombreTecla,
  };
})();
