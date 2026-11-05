// Mando Xbox: cursor con el stick, dibujar con A, borrar con X, paginas con LB/RB, MENU abre el menu.
// En dialogos la cruceta/stick mueven el foco, A acepta y B cierra.
import { TECLAS0 } from './herramientas.js';

export function crearMando(app) {
  const M = window.Mando; if (!M) return;
  const { vista } = app;
  const cur = { x: 200, y: 200, visible: false };
  const orden = ['sel', 'pluma', 'resaltador', 'borrador', 'forma', 'texto', 'nota', 'conector', 'comentario', 'votos', 'laser', 'mano'];
  const colores = ['tinta', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
  let t0 = performance.now(), A = false, X = false, L3 = false, rep = { t: 0 }, ultimoModal = false;
  const ptr = (id, extra = {}) => ({ id, tipo: 'mando', x: cur.x, y: cur.y, pr: 0.5, pen: false, button: 0, t: performance.now(), ...extra });

  function foco(dir) {
    const raiz = app.ui.modalTop() || document.querySelector('.menu') || document.body;
    const fs = [...raiz.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')].filter(e => e.offsetParent !== null);
    if (!fs.length) return;
    const act = document.activeElement;
    if (!fs.includes(act)) { fs[0].focus(); return; }
    const r = act.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let mejor = null, ms = Infinity;
    for (const e of fs) {
      if (e === act) continue;
      const q = e.getBoundingClientRect(), dx = q.left + q.width / 2 - cx, dy = q.top + q.height / 2 - cy;
      const ok = dir === 'DER' ? dx > 4 : dir === 'IZQ' ? dx < -4 : dir === 'ABAJO' ? dy > 4 : dy < -4;
      if (!ok) continue;
      const prim = dir === 'DER' || dir === 'IZQ' ? Math.abs(dx) : Math.abs(dy), sec = dir === 'DER' || dir === 'IZQ' ? Math.abs(dy) : Math.abs(dx);
      const s = prim + sec * 2.5; if (s < ms) { ms = s; mejor = e; }
    }
    if (mejor) { mejor.focus(); mejor.scrollIntoView && mejor.scrollIntoView({ block: 'nearest' }); }
  }
  function cambiarValor(dir) {
    const a = document.activeElement;
    if (a && a.type === 'range') { const p = +a.step || 1, d = dir === 'DER' ? p : -p; a.value = +a.value + d * Math.max(1, Math.round((+a.max - +a.min) / 40 / p)); a.dispatchEvent(new Event('input', { bubbles: true })); return true; }
    return false;
  }
  function abrirMenuMando() {
    const H = app.herr, u = app.ui, cont = u.h('div', { cls: 'menu-mando' });
    const b = (t, fn) => u.h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, on: { click: () => { m.cerrar(); fn(); } } }, [u.h('span', { txt: t })]);
    cont.append(u.h('h3', { txt: 'Herramienta' }), u.h('div', { cls: 'grid-mm' }, ['sel:Seleccionar', 'pluma:Lápiz', 'resaltador:Resaltador', 'borrador:Borrador', 'forma:Formas', 'texto:Texto', 'nota:Nota', 'conector:Conector', 'laser:Láser', 'mano:Mover lienzo'].map(s => { const [id, t] = s.split(':'); return b(t, () => H.setHerr(id)); })),
      u.h('h3', { txt: 'Acciones' }), u.h('div', { cls: 'grid-mm' }, [
        b('Deshacer', () => app.deshacer()), b('Rehacer', () => app.rehacer()), b('Ajustar vista', () => vista.ajustar(true)), b('Página nueva', () => app.nuevaPagina()),
        b('Mis tableros', () => u.abrirTableros()), b('Plantillas', () => u.abrirPlantillas()), b('Exportar', () => u.abrirExportar()), b('Colaborar', () => u.abrirColab()),
        b('Temporizador', () => u.abrirTemporizador()), b('Ajustes', () => document.querySelector('[aria-label="Ajustes"]').click()), b('Pantalla completa', () => u.alternarPantalla()), b('Ayuda', () => u.abrirAyuda())]));
    const m = u.modal('Menú', cont, { ancho: 640 });
  }

  function bucle(now) {
    requestAnimationFrame(bucle);
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    if (window.Lobby && window.Lobby.abierto) return;
    M.leer();
    if (!M.conectado) { if (cur.visible) { cur.visible = false; vista.superior(); } return; }
    const s = app.ajustes;
    const modal = app.ui.modalAbierto();
    if (M.pulsado('MENU')) { if (modal) app.ui.cerrar(); else abrirMenuMando(); return; }
    if (modal) {
      if (!ultimoModal) { ultimoModal = true; if (A) { app.herr.arriba(ptr('mandoA')); A = false; } }
      const nombre = ['ARRIBA', 'ABAJO', 'IZQ', 'DER'].find(n => M.pulsado(n));
      const ejeDir = M.ejes.izq.y < -0.6 ? 'ARRIBA' : M.ejes.izq.y > 0.6 ? 'ABAJO' : M.ejes.izq.x < -0.6 ? 'IZQ' : M.ejes.izq.x > 0.6 ? 'DER' : null;
      let dir = nombre;
      if (!dir && ejeDir && now - rep.t > 220) { dir = ejeDir; rep.t = now; }
      if (dir) { if ((dir === 'IZQ' || dir === 'DER') && cambiarValor(dir)) { /* ajustado */ } else foco(dir); }
      if (M.pulsado('A')) { const a = document.activeElement; if (a && a !== document.body) a.click(); }
      if (M.pulsado('B')) app.ui.cerrar();
      return;
    }
    ultimoModal = false;
    if (!cur.visible) { const r = vista.cont.getBoundingClientRect(); if (cur.x === 200 && cur.y === 200) { cur.x = r.width / 2; cur.y = r.height / 2; } cur.visible = true; }
    const H = app.herr, v = 650 * s.sensMando * dt * (1 + M.gatillo.izq * 0), izq = M.ejes.izq, der = M.ejes.der;
    let mov = false;
    if (izq.x || izq.y) { cur.x = Math.min(vista.W, Math.max(0, cur.x + izq.x * v * (1.2 + Math.hypot(izq.x, izq.y)))); cur.y = Math.min(vista.H, Math.max(0, cur.y + izq.y * v * (1.2 + Math.hypot(izq.x, izq.y)))); mov = true; }
    if (der.x || der.y) vista.mover(-der.x * 700 * dt, -der.y * 700 * dt);
    if (M.gatillo.der > 0.1) vista.zoomEn(cur.x, cur.y, 1 + 1.4 * M.gatillo.der * dt);
    if (M.gatillo.izq > 0.1) vista.zoomEn(cur.x, cur.y, 1 - 1.4 * M.gatillo.izq * dt);
    if (M.sostenido('A') && !A) { A = true; H.abajo(ptr('mandoA')); }
    else if (A && !M.sostenido('A')) { A = false; H.arriba(ptr('mandoA')); }
    else if (A && mov) H.mover(ptr('mandoA'));
    if (M.sostenido('X') && !X) { X = true; H.abajo(ptr('mandoX', { cmd: 'borrador' })); }
    else if (X && !M.sostenido('X')) { X = false; H.arriba(ptr('mandoX')); }
    else if (X && mov) H.mover(ptr('mandoX'));
    if (M.sostenido('L3') && !L3) { L3 = true; H.abajo(ptr('mandoL', { cmd: 'laser' })); }
    else if (L3 && !M.sostenido('L3')) { L3 = false; H.arriba(ptr('mandoL')); }
    else if (L3 && mov) H.mover(ptr('mandoL'));
    if (!A && !X && !L3 && mov) H.mover(ptr('mandoHover'));
    if (M.pulsado('B')) app.deshacer();
    if (M.pulsado('VISTA')) app.rehacer();
    if (M.pulsado('LB')) app.paginaRel(-1);
    if (M.pulsado('RB')) app.paginaRel(1);
    if (M.pulsado('R3')) vista.ajustar(true);
    if (M.pulsado('Y')) { const i = colores.indexOf(H.opts.color); H.cambiarOpts({ color: colores[(i + 1) % colores.length] }); }
    if (M.pulsado('DER')) { H.setHerr(orden[(orden.indexOf(H.herr) + 1) % orden.length]); app.aviso(H.herr, 900); }
    if (M.pulsado('IZQ')) { H.setHerr(orden[(orden.indexOf(H.herr) + orden.length - 1) % orden.length]); app.aviso(H.herr, 900); }
    if (M.pulsado('ARRIBA')) H.cambiarOpts({ grosor: Math.min(40, H.opts.grosor + 2) });
    if (M.pulsado('ABAJO')) H.cambiarOpts({ grosor: Math.max(1, H.opts.grosor - 2) });
    if (M.pulsado('A') && (H.herr === 'sel' || true)) { /* vibracion suave al tocar */ if (s.vibracion) M.vibrar(0.1, 0.1, 30); }
    vista.superior();
  }
  requestAnimationFrame(bucle);
  vista.capasSup.push(ctx => {
    if (!M.conectado || !cur.visible) return;
    ctx.save(); ctx.translate(cur.x, cur.y);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 6.2832); ctx.moveTo(-15, 0); ctx.lineTo(-5, 0); ctx.moveTo(5, 0); ctx.lineTo(15, 0); ctx.moveTo(0, -15); ctx.lineTo(0, -5); ctx.moveTo(0, 5); ctx.lineTo(0, 15); ctx.stroke();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  });
}
