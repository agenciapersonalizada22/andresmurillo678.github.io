// =============================================================
//  UI: menús dibujados en el lienzo (ratón, táctil, teclado y mando).
//  Una pantalla = { titulo, tabs?, filas() , atras?, fondo? }.
//  Filas: btn | tog | sli | sel | txt | cus (dibujo propio).
// =============================================================
const UI = (() => {
  const W = CONFIG.ancho, H = CONFIG.alto, TAU = Math.PI * 2;
  const pila = [];
  let skip = 0, filas = [], foco = 0, scroll = 0, ptr = null, pantalla = null, hover = true, dlg = null;
  const U = { pila, abierto: () => pila.length > 0 };
  const aj = () => Datos.aj;
  const tg = () => (aj().textoGrande ? 1.2 : 1);
  const AREA_Y = 128, AREA_FIN = H - 56;
  const alto = (f) => f.alto || (f.t === 'sli' ? 66 : f.t === 'txt' ? (f.h || 30) : f.t === 'btn' ? 58 : 54);
  const enfocable = (f) => f.t !== 'txt' && !f.nofoco && !f.deshab;

  function construir(mantener) {
    if (!pantalla) return;
    filas = pantalla.filas(pantalla.tab || 0) || [];
    let y = 0; for (const f of filas) { f.y = y; f.h = alto(f); y += f.h + (f.t === 'txt' ? 0 : 8); }
    U.total = y;
    if (!mantener) { foco = Math.max(0, filas.findIndex(enfocable)); scroll = 0; }
    else foco = Math.min(foco, filas.length - 1);
  }
  const areaY = () => (pantalla && pantalla.tabs ? AREA_Y + 40 : AREA_Y);
  const maxScroll = () => Math.max(0, (U.total || 0) - (AREA_FIN - areaY()));
  function asegurarFoco() {
    const f = filas[foco]; if (!f) return;
    const vis = AREA_FIN - areaY();
    if (f.y - scroll < 0) scroll = f.y; else if (f.y + f.h - scroll > vis) scroll = f.y + f.h - vis;
    scroll = Util.limitar(scroll, 0, maxScroll());
  }
  U.reconstruir = () => construir(true);
  U.empujar = (p) => { skip = 1; pila.push(p); pantalla = p; if (p.tab === undefined) p.tab = 0; construir(false); Sonido.clic(); if (p.alAbrir) p.alAbrir(); };
  U.raiz = (p) => { pila.length = 0; U.empujar(p); };
  U.volver = () => {
    if (pila.length <= 1 && !pantalla.noraiz) return;
    pila.pop(); pantalla = pila[pila.length - 1] || null; if (pantalla) construir(true); Sonido.atras();
  };
  U.cerrarTodo = () => { pila.length = 0; pantalla = null; };
  U.actual = () => pantalla;

  // ------------------------------------------------ Diálogo de texto (DOM)
  U.dialogo = (o) => {
    if (dlg) return;
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:50;background:rgba(5,3,15,.85);display:flex;align-items:center;justify-content:center;font-family:Orbitron,sans-serif;color:#fff;padding:16px';
    const caja = document.createElement('div');
    caja.style.cssText = 'background:#12092e;border:2px solid #5b3fd1;border-radius:12px;padding:16px;width:min(420px,100%);box-sizing:border-box';
    const h = document.createElement('div'); h.textContent = o.titulo; h.style.cssText = 'font-weight:800;margin-bottom:10px;color:#3df5ff';
    const c = document.createElement(o.multi ? 'textarea' : 'input'); c.value = o.valor || ''; if (o.multi) c.rows = 6; if (o.ro) c.readOnly = true; if (o.max) c.maxLength = o.max;
    c.style.cssText = 'width:100%;box-sizing:border-box;background:#05030f;color:#fff;border:1px solid #5b3fd1;border-radius:8px;padding:10px;font-size:15px;font-family:monospace';
    const fila = document.createElement('div'); fila.style.cssText = 'display:flex;gap:8px;margin-top:12px;justify-content:flex-end';
    const mkb = (t, fn) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'background:#2a1a6a;color:#fff;border:1px solid #5b3fd1;border-radius:8px;padding:10px 14px;font:700 13px Orbitron,sans-serif;cursor:pointer'; b.onclick = fn; return b; };
    const cerrar = () => { d.remove(); dlg = null; };
    dlg = { aceptar: () => { const v = c.value; cerrar(); if (o.alAceptar) o.alAceptar(v); }, cancelar: () => { cerrar(); if (o.alCancelar) o.alCancelar(); } };
    if (o.copiar) fila.appendChild(mkb('Copiar', () => { c.select(); try { navigator.clipboard.writeText(c.value); } catch (e) { document.execCommand('copy'); } }));
    fila.appendChild(mkb(o.cancelarTxt || 'Cancelar', dlg.cancelar)); if (!o.soloCerrar) fila.appendChild(mkb(o.boton || 'Aceptar', dlg.aceptar));
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !o.multi) dlg.aceptar(); if (e.key === 'Escape') dlg.cancelar(); });
    caja.append(h, c, fila); d.appendChild(caja); document.body.appendChild(d);
    if (!o.ro) setTimeout(() => { c.focus(); c.select(); }, 30);
  };
  U.dialogoAbierto = () => !!dlg;

  // ------------------------------------------------ Acciones
  function ajustar(f, dir) {
    if (f.t === 'sli') { const v = Util.limitar(Math.round((f.get() + dir * f.paso) / f.paso) * f.paso, f.min, f.max); f.set(+v.toFixed(3)); }
    else if (f.t === 'sel') { const n = f.opts.length, i = (f.idx() + dir + n) % n; f.set(i); }
    else if (f.t === 'tog') f.set(!f.get());
    Sonido.clic(); construir(true);
  }
  function activar(f) {
    if (!f || f.deshab) return;
    if (f.t === 'btn') { Sonido.clic(); if (f.fn) f.fn(); construir(true); }
    else if (f.t === 'tog') ajustar(f, 1);
    else if (f.t === 'sel') ajustar(f, 1);
    else if (f.t === 'cus' && f.fn) { f.fn(); construir(true); }
  }
  function mover(d) {
    let i = foco; for (let k = 0; k < filas.length; k++) { i += d; if (i < 0 || i >= filas.length) return; if (enfocable(filas[i])) { foco = i; Sonido.aviso && 0; asegurarFoco(); return; } }
  }
  function cambiarTab(d) {
    if (!pantalla.tabs) return false;
    const n = pantalla.tabs.length; pantalla.tab = (pantalla.tab + d + n) % n; construir(false); Sonido.clic(); return true;
  }

  // ------------------------------------------------ Entrada
  function entrada(dt) {
    const N = Entrada.nav;
    if (skip > 0) { skip--; Entrada.limpiarEventos(); return; }
    if (dlg) { if (N.ok && Entrada.dispositivo() === 'mando') dlg.aceptar(); else if (N.atras && Entrada.dispositivo() === 'mando') dlg.cancelar(); Entrada.limpiarEventos(); return; }
    if (pantalla.capturando) { Entrada.limpiarEventos(); return; }
    const evs = Entrada.tomarEventos();
    for (const e of evs) puntero(e);
    if (N.pestIzq) cambiarTab(-1); if (N.pestDer) cambiarTab(1);
    if (N.arriba) { mover(-1); hover = false; } if (N.abajo) { mover(1); hover = false; }
    const f = filas[foco];
    if (N.izq) { if (f && (f.t === 'sli' || f.t === 'sel' || f.t === 'tog')) ajustar(f, -1); else cambiarTab(-1); }
    if (N.der) { if (f && (f.t === 'sli' || f.t === 'sel' || f.t === 'tog')) ajustar(f, 1); else cambiarTab(1); }
    if (N.ok) activar(f);
    if (N.atras || (N.menu && pantalla.noraiz)) { if (pantalla.atras) pantalla.atras(); else U.volver(); }
  }
  function filaEn(x, y) {
    const ay = areaY(); if (y < ay || y > AREA_FIN) return -1;
    const yy = y - ay + scroll;
    for (let i = 0; i < filas.length; i++) if (yy >= filas[i].y && yy <= filas[i].y + filas[i].h) return i;
    return -1;
  }
  const sliderPos = (f, x) => Util.limitar((x - 50) / (W - 100), 0, 1);
  function aplicarSlider(f, x) { const p = sliderPos(f, x), v = f.min + p * (f.max - f.min); f.set(+(Util.limitar(Math.round(v / f.paso) * f.paso, f.min, f.max)).toFixed(3)); }
  function puntero(e) {
    if (e.t === 'w') { scroll = Util.limitar(scroll + e.dy * 0.6, 0, maxScroll()); return; }
    if (e.t === 'd') {
      hover = true;
      if (pantalla.icos) for (const ic of pantalla.icos) if (Math.hypot(e.x - ic.x, e.y - ic.y) < 22) { Sonido.clic(); ic.fn(); return; }
      if (pantalla.tabs && e.y > AREA_Y - 4 && e.y < AREA_Y + 38) {
        const n = pantalla.tabs.length, i = Math.floor(e.x / (W / n)); if (i !== pantalla.tab) { pantalla.tab = i; construir(false); Sonido.clic(); } return;
      }
      if (e.y < 56 && e.x < 120 && (pila.length > 1 || pantalla.atras)) { if (pantalla.atras) pantalla.atras(); else U.volver(); return; }
      const i = filaEn(e.x, e.y);
      ptr = { id: e.id, y0: e.y, s0: scroll, i, mov: false, slider: false };
      if (i >= 0 && filas[i].t === 'sli' && !filas[i].deshab) { foco = i; ptr.slider = true; aplicarSlider(filas[i], e.x); }
    } else if (e.t === 'm') {
      if (ptr && e.id === ptr.id) {
        if (ptr.slider) { aplicarSlider(filas[ptr.i], e.x); return; }
        if (Math.abs(e.y - ptr.y0) > 10) ptr.mov = true;
        if (ptr.mov) scroll = Util.limitar(ptr.s0 - (e.y - ptr.y0), 0, maxScroll());
      } else if (!e.b && hover) { const i = filaEn(e.x, e.y); if (i >= 0 && enfocable(filas[i])) foco = i; }
    } else if (e.t === 'u') {
      if (ptr && e.id === ptr.id) {
        if (ptr.slider) construir(true);
        else if (!ptr.mov && ptr.i >= 0 && enfocable(filas[ptr.i])) { foco = ptr.i; const f = filas[ptr.i]; if (f.t === 'sel' || f.t === 'tog') activar(f); else activar(f); }
        ptr = null;
      }
    }
  }

  // ------------------------------------------------ Dibujo
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function txt(g, s, x, y, tam, c, al, peso) { g.font = (peso || 700) + ' ' + Math.round(tam * tg()) + 'px ' + Dibujo.FUENTE; g.fillStyle = c; g.textAlign = al || 'left'; g.textBaseline = 'middle'; g.fillText(s, x, y); }
  U.txt = txt; U.rr = rr;

  function fila(g, f, i, x, y, w, t) {
    const sel = i === foco && enfocable(f);
    if (f.t === 'txt') {
      if (f.draw) f.draw(g, x, y, w, f.h);
      else txt(g, f.txt, f.centro ? W / 2 : x + 6, y + f.h / 2, f.tam || 13, f.color || '#c9c2ff', f.centro ? 'center' : 'left', f.peso || 500);
      return;
    }
    rr(g, x, y, w, f.h, 12);
    g.fillStyle = sel ? 'rgba(61,245,255,.16)' : 'rgba(18,10,46,.78)'; g.fill();
    g.lineWidth = sel ? 2.5 : 1.5; g.strokeStyle = f.deshab ? '#3a3260' : sel ? '#3df5ff' : (f.color || '#5b3fd1'); g.stroke();
    const col = f.deshab ? '#6a6090' : '#fff';
    if (f.t === 'btn') {
      txt(g, f.txt, f.dib ? x + 14 : x + w / 2, f.dib && f.h > 80 ? y + 20 : y + (f.sub ? f.h / 2 - 9 : f.h / 2), f.tam || 17, col, f.dib ? 'left' : 'center');
      if (f.sub) txt(g, f.sub, f.dib ? x + 14 : x + w / 2, y + f.h / 2 + 12, 11, f.deshab ? '#5a5080' : '#9a8cff', f.dib ? 'left' : 'center', 500);
    } else if (f.t === 'tog') {
      txt(g, f.txt, x + 16, y + f.h / 2, 15, col);
      const on = f.get(); rr(g, x + w - 70, y + f.h / 2 - 12, 52, 24, 12); g.fillStyle = on ? '#2ad48a' : '#3a3260'; g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x + w - (on ? 30 : 58), y + f.h / 2, 9, 0, TAU); g.fill();
    } else if (f.t === 'sel') {
      txt(g, f.txt, x + 16, f.dib ? y + 20 : y + f.h / 2, 15, col);
      const s = f.opts[f.idx()]; txt(g, '‹  ' + s + '  ›', x + w - 16, f.dib ? y + 20 : y + f.h / 2, 14, sel ? '#3df5ff' : '#c9c2ff', 'right');
    } else if (f.t === 'sli') {
      txt(g, f.txt, x + 16, y + 20, 15, col); txt(g, f.fmt ? f.fmt(f.get()) : String(f.get()), x + w - 16, y + 20, 14, '#3df5ff', 'right');
      const p = (f.get() - f.min) / (f.max - f.min), tx = 50, tw = W - 100;
      g.fillStyle = '#2a2250'; rr(g, tx, y + 42, tw, 6, 3); g.fill(); g.fillStyle = '#3df5ff'; rr(g, tx, y + 42, Math.max(6, tw * p), 6, 3); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(tx + tw * p, y + 45, 9, 0, TAU); g.fill();
    }
    if (f.dib) f.dib(g, x, y, w, f.h, sel, t);
  }

  U.dibujar = function (g, t, dt) {
    if (!pantalla) return;
    entrada(dt);
    if (!pantalla) return;
    if (pantalla.fondo) pantalla.fondo(g, t);
    if (pantalla.panel !== false) { g.fillStyle = 'rgba(5,3,15,' + (pantalla.dim || 0.55) + ')'; g.fillRect(0, 0, W, H); }
    if (pantalla.dibujar) pantalla.dibujar(g, t);
    if (pantalla.titulo && !pantalla.sinCabecera) {
      txt(g, pantalla.titulo, W / 2, 56, 24, '#fff', 'center', 800);
      g.fillStyle = '#5b3fd1'; g.fillRect(W / 2 - 60, 80, 120, 2);
      if (pantalla.sub) txt(g, pantalla.sub(), W / 2, 104, 12, '#9a8cff', 'center', 500);
      if (pila.length > 1 || (pantalla.atras && !pantalla.noraiz)) txt(g, '‹ Atrás', 16, 30, 13, '#9a8cff');
    }
    if (pantalla.tabs) {
      const n = pantalla.tabs.length, w = W / n;
      for (let i = 0; i < n; i++) {
        const a = i === pantalla.tab; g.fillStyle = a ? 'rgba(61,245,255,.16)' : 'rgba(18,10,46,.6)'; g.fillRect(i * w + 2, AREA_Y, w - 4, 34);
        g.fillStyle = a ? '#3df5ff' : '#3a3260'; g.fillRect(i * w + 2, AREA_Y + 32, w - 4, 2);
        txt(g, pantalla.tabs[i], i * w + w / 2, AREA_Y + 17, 11, a ? '#fff' : '#9a8cff', 'center');
      }
    }
    // lista
    const ay = areaY();
    g.save(); g.beginPath(); g.rect(0, ay, W, AREA_FIN - ay); g.clip();
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i], y = ay + f.y - scroll;
      if (y + f.h < ay - 4 || y > AREA_FIN + 4) continue;
      fila(g, f, i, 20, y, W - 40, t);
    }
    g.restore();
    if (maxScroll() > 0) { const th = (AREA_FIN - ay) * (AREA_FIN - ay) / U.total; g.fillStyle = 'rgba(154,140,255,.5)'; g.fillRect(W - 6, ay + (AREA_FIN - ay - th) * scroll / maxScroll(), 3, th); }
    if (pantalla.icos) for (const ic of pantalla.icos) { g.fillStyle = 'rgba(18,10,46,.8)'; g.strokeStyle = ic.on === false ? '#6a6090' : '#5b3fd1'; g.lineWidth = 2; g.beginPath(); g.arc(ic.x, ic.y, 18, 0, TAU); g.fill(); g.stroke(); ic.dib(g, ic.x, ic.y); }
    // ayuda de controles
    const disp = Entrada.dispositivo();
    txt(g, disp === 'mando' ? '↕ elegir   A aceptar   B atrás   LB/RB pestañas' : disp === 'tactil' ? 'Toca para elegir · arrastra para desplazar' : '↑↓ elegir   ←→ cambiar   Intro aceptar   Esc atrás', W / 2, H - 22, 10, '#6a5ac0', 'center', 500);
  };
  return U;
})();
