// Partida: bucle, entrada (tactil/raton/teclado/mando), renderizado Canvas 2D, efectos y HUD.
import * as M from './motor.js';
import { P, Z, COLS, FILAS } from './datos.js';
import * as Ar from './arte.js';
import * as S from './sonido.js';
import { AJ } from './almacen.js';

export const VS_PLANTAS = ['giras', 'dispa', 'nogal', 'hielo', 'cereza', 'pincho', 'mina', 'mordelon'];
export const VS_ZOMBIS = [['paseante', 25], ['baliza', 50], ['corredor', 50], ['cubero', 100], ['pertiguista', 75], ['reja', 75], ['coloso', 250]];

export function layout(w, h, versus) {
  const asp = w / h, L = { hor: asp >= 1.15 }, C = AJ.controles, bs = Math.round(44 * C.tam), gap = 8, zur = C.zurdo;
  if (L.hor) {
    L.W = 1000; L.H = 560; L.casa = 34; L.bx = 140; L.by = versus ? 58 : 62; L.cw = (L.W - L.bx - 6) / COLS; L.ch = versus ? 80 : (L.H - L.by - 12) / FILAS;
    L.sun = { x: 4, y: 4, w: 100, h: 44 };
    const x0 = zur ? 112 : L.W - 6 - bs, paso = zur ? bs + gap : -(bs + gap);
    L.pausa = { x: x0, y: 6, w: bs, h: bs }; L.vel = { x: x0 + paso, y: 6, w: bs, h: bs }; L.pala = { x: x0 + 2 * paso, y: 6, w: bs, h: bs };
    L.barra = zur ? { x: 112 + 3 * (bs + gap) + 6, y: 20, w: L.W - (112 + 3 * (bs + gap) + 6) - 16, h: 16 } : { x: 116, y: 20, w: L.W - 116 - 3 * (bs + gap) - 16, h: 16 };
    const sy = versus ? 88 : 54; L.slot = (i, n) => { const sh = Math.min(62, (L.H - sy - 6) / Math.max(1, n)); return { x: 6, y: sy + i * sh, w: 84, h: sh - 4 }; };
    L.zb = (i, n) => { const bw = (L.W - L.bx - 6) / n; return { x: L.bx + i * bw, y: L.by + L.ch * FILAS + 6, w: bw - 4, h: 54 }; };
  } else {
    L.W = 560; L.H = Math.max(720, Math.round(560 / asp)); L.casa = 0; L.bx = 8; L.cw = (L.W - 16) / COLS; L.ch = 82; L.by = 150 + (L.H - 720) * 0.3;
    L.sun = { x: 4, y: 4, w: 100, h: 42 };
    const x0 = L.W - 6 - bs, paso = -(bs + gap);
    L.pausa = { x: x0, y: 4, w: bs, h: bs }; L.vel = { x: x0 + paso, y: 4, w: bs, h: bs }; L.pala = { x: x0 + 2 * paso, y: 4, w: bs, h: bs };
    L.barra = { x: 112, y: 17, w: L.W - 112 - 3 * (bs + gap) - 10, h: 14 };
    L.slot = (i, n) => { const sw = Math.min(62, (L.W - 8) / Math.max(1, n)); return { x: 4 + i * sw, y: 54 + (bs > 44 ? 8 : 0), w: sw - 4, h: 80 }; };
    L.zb = (i, n) => { const bw = (L.W - 16) / n; return { x: 8 + i * bw, y: L.by + L.ch * FILAS + 70, w: bw - 4, h: 64 }; };
  }
  L.palaGrande = L.hor ? null : { x: zur ? 16 : L.W - 136, y: L.by + L.ch * FILAS + 8, w: 120, h: 50 };
  L.u = Math.min(L.cw, L.ch) * 1.05;
  L.esc = Math.min(w / L.W, h / L.H); L.ox = (w - L.W * L.esc) / 2; L.oy = (h - L.H * L.esc) / 2;
  return L;
}
const dentro = (r, x, y) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const PRESETS = { baja: { res: 0.75, part: 0.3, sombras: false }, media: { res: 1, part: 0.7, sombras: true }, alta: { res: 1.25, part: 1, sombras: true }, ultra: { res: 1.75, part: 1.6, sombras: true } };

export function iniciarPartida(canvas, cfg, hooks) {
  const niv = cfg.nivel, versus = niv.tipo === 'versus';
  const s = cfg.restaurar ? M.restaurar(cfg.restaurar, niv, cfg.dif) : M.crear({ nivel: niv, semillas: cfg.semillas, dif: cfg.dif, seed: cfg.seed || (Date.now() & 0xffffff), tienda: cfg.tienda });
  if (cfg.restaurar && cfg.semillas) { /* las cartas ya vienen guardadas */ }
  const ctx = canvas.getContext('2d');
  let L = layout(canvas.clientWidth || 780, canvas.clientHeight || 390, versus), raf = 0, last = 0, pausa = false, vel = AJ.juego.vel || 1, tFPS = 0, fps = 60, frames = 0, tAuto = 0, tGuardar = 0, finT = 0, acabo = false, destruida = false, t = 0;
  const parts = [], flash = {}; let shake = 0, banner = null, tutorial = cfg.tutorial ? { paso: 0, t: 0 } : null;
  let sel = -1, palaOn = false, selZ = -1, drag = null, hover = null, cur = { r: 2, c: 2, vis: false }, ptr = { x: 0, y: 0, down: false, mov: 0 };
  const preset = () => PRESETS[AJ.graficos.calidad] || PRESETS.media;
  s.autoSol = AJ.accesibilidad.autoSol ? 3 : 0;
  Ar.A.dalt = AJ.accesibilidad.dalt; Ar.A.reducir = AJ.accesibilidad.reducir; Ar.A.sombras = AJ.graficos.sombras && preset().sombras;
  const nCartas = () => (s.cinta || niv.mano ? Math.max(5, Math.min(8, s.cola.length || 0) || 0) : s.cartas.length);
  const cartasMostradas = () => (versus ? VS_PLANTAS.length : s.cinta || niv.mano ? s.cola.length : s.cartas.length);

  function ajustarCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * (preset().res * (AJ.graficos.res || 1));
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    canvas.width = Math.round(w * Math.min(dpr, 2.5)); canvas.height = Math.round(h * Math.min(dpr, 2.5)); L = layout(w, h, versus);
  }
  ajustarCanvas();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(ajustarCanvas) : null; if (ro) ro.observe(canvas);

  /* ---------- helpers ---------- */
  const cx = (c) => L.bx + c * L.cw, cy = (r) => L.by + r * L.ch;
  const pantalla = (e) => { const b = canvas.getBoundingClientRect(); return { x: (e.clientX - b.left - L.ox) / L.esc, y: (e.clientY - b.top - L.oy) / L.esc }; };
  const celdaEn = (x, y) => { const c = Math.floor((x - L.bx) / L.cw), r = Math.floor((y - L.by) / L.ch); return r >= 0 && r < FILAS && c >= 0 && c < COLS ? { r, c } : null; };
  const txt = (str, x, y, size, col, al, borde) => { ctx.font = `800 ${Math.round(size * AJ.accesibilidad.texto)}px system-ui,-apple-system,Segoe UI,Roboto,sans-serif`; ctx.textAlign = al || 'center'; ctx.textBaseline = 'middle'; if (borde) { ctx.lineWidth = 3; ctx.strokeStyle = borde; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); } ctx.fillStyle = col || '#fff'; ctx.fillText(str, x, y); };
  const sfx = (n) => S.sfx(n);
  const vib = (ms) => { if (AJ.controles.vib && navigator.vibrate) { try { navigator.vibrate(Math.round(ms * AJ.controles.vibInt)); } catch (e) { /* sin vibracion */ } } };
  function pad(x, y, n, col, tam, vy) { const q = preset().part * (Ar.A.reducir ? 0.3 : 1); n = Math.round(n * q); for (let i = 0; i < n && parts.length < 400; i++) { const a = Math.random() * 6.28, v = (0.3 + Math.random()) * (tam || 60); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (vy || 20), vida: 0.5 + Math.random() * 0.5, v0: 1, col, r: 2 + Math.random() * 3, g: 160 }); } }
  function texto(x, y, str, col) { parts.push({ x, y, vx: 0, vy: -36, vida: 1, v0: 1, txt: str, col: col || '#fff', g: 0 }); }
  function aviso(str, col, dur) { banner = { txt: str, col: col || '#fff', t: dur || 2.4, d: dur || 2.4 }; }

  /* ---------- acciones ---------- */
  function plantarEn(i, r, c) {
    if (versus) { const id = VS_PLANTAS[i]; return plantarVs(id, r, c); }
    const antes = s.sol, res = M.plantar(s, i, r, c);
    if (!res.ok) { if (res.motivo === 'sol') { aviso('Te falta energía', '#ffd23a', 1); } else if (res.motivo === 'recarga') aviso('Recargando…', '#9fd', 0.8); sfx('error'); return false; }
    sel = -1; return true;
  }
  function plantarVs(id, r, c) {
    if (c >= 7) { sfx('error'); return false; }
    const d = P[id]; if (s.sol < d.c) { aviso('Te falta energía', '#ffd23a', 1); sfx('error'); return false; }
    if (!M.puedePlantarEn(s, id, r, c)) { sfx('error'); return false; }
    const k = s.cartas.find((q) => q.id === id) || (s.cartas.push({ id, listo: 0 }), s.cartas[s.cartas.length - 1]);
    if (k.listo > s.t) { sfx('error'); return false; }
    s.sol -= d.c; k.listo = s.t + d.rec * 0.5; M.colocar(s, id, r, c); sel = -1; return true;
  }
  function tocarCelda(r, c) {
    cur.r = r; cur.c = c;
    if (versus && selZ >= 0 && (sel < 0 || c >= 7)) { const [tp, co] = VS_ZOMBIS[selZ]; if (!M.lanzarZombi(s, tp, r, co)) { aviso('Faltan cerebros', '#ff9ad0', 0.8); sfx('error'); } else sfx('baila'); return; }
    const cel = s.celdas[M.idx(r, c)];
    if (palaOn) { if (M.pala(s, r, c)) { sfx('pala'); palaOn = false; } else sfx('error'); return; }
    if (cel.jarro) { M.romperJarro(s, r, c); return; }
    if (cel.tumba && niv.tipo === 'tumbas') { M.pala(s, r, c); return; }
    if (sel >= 0) { plantarEn(sel, r, c); return; }
    if (hooks.tocarVacio) hooks.tocarVacio();
  }
  function cogerSolEn(x, y, rad) {
    let n = 0;
    for (const q of s.soles.slice()) { const sx = L.bx + q.x * L.cw, sy = L.by + q.y * L.ch; if (Math.hypot(sx - x, sy - y) <= rad) { M.recogerSol(s, q.id); n++; } }
    for (const q of s.monedas.slice()) { const sx = L.bx + q.x * L.cw, sy = L.by + q.y * L.ch; if (Math.hypot(sx - x, sy - y) <= rad) { M.recogerMoneda(s, q.id); n++; } }
    return n;
  }
  function elegir(i) {
    if (i < 0 || i >= cartasMostradas()) return;
    if (!(s.cinta || niv.mano) && !versus && M.cartaListaEn(s, i) > 0) { sfx('error'); return; }
    palaOn = false; selZ = -1; sel = sel === i ? -1 : i; sfx('clic');
  }

  /* ---------- puntero ---------- */
  function slotEn(x, y) { const n = cartasMostradas(); for (let i = 0; i < n; i++) if (dentro(L.slot(i, Math.max(n, versus ? 8 : s.cartas.length || n)), x, y)) return i; return -1; }
  function zbEn(x, y) { if (!versus) return -1; for (let i = 0; i < VS_ZOMBIS.length; i++) if (dentro(L.zb(i, VS_ZOMBIS.length), x, y)) return i; return -1; }
  function onDown(e) {
    if (pausa || s.fin) return; S.iniciar(); canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    const p = pantalla(e); ptr = { x: p.x, y: p.y, down: true, mov: 0, x0: p.x, y0: p.y }; cur.vis = false; hover = null;
    const rad = e.pointerType === 'touch' ? 52 : 38;
    if (cogerSolEn(p.x, p.y, rad)) { drag = { tipo: 'sol' }; return; }
    if (dentro(L.pausa, p.x, p.y)) { hooks.pausar && hooks.pausar(); return; }
    if (dentro(L.vel, p.x, p.y)) { cambiarVel(); return; }
    if (dentro(L.pala, p.x, p.y) || dentro(L.palaGrande, p.x, p.y)) { palaOn = !palaOn; sel = -1; selZ = -1; sfx('clic'); return; }
    const zi = zbEn(p.x, p.y); if (zi >= 0) { selZ = selZ === zi ? -1 : zi; sel = -1; palaOn = false; sfx('clic'); return; }
    const si = slotEn(p.x, p.y); if (si >= 0) { if (!versus && !(s.cinta || niv.mano) && M.cartaListaEn(s, si) > 0) { sfx('error'); return; } drag = { tipo: 'semilla', i: si }; return; }
    const ce = celdaEn(p.x, p.y); if (ce) tocarCelda(ce.r, ce.c);
  }
  function onMove(e) {
    const p = pantalla(e); if (!ptr.down) { hover = celdaEn(p.x, p.y); ptr.x = p.x; ptr.y = p.y; cur.vis = false; return; }
    ptr.mov += Math.hypot(p.x - ptr.x, p.y - ptr.y); ptr.x = p.x; ptr.y = p.y;
    if (drag && drag.tipo === 'sol') cogerSolEn(p.x, p.y, 40);
    if (drag && drag.tipo === 'semilla' && ptr.mov > 10) { drag.mov = true; sel = drag.i; palaOn = false; }
    hover = celdaEn(p.x, p.y);
  }
  function onUp(e) {
    if (!ptr.down) return; ptr.down = false; const p = pantalla(e);
    if (drag && drag.tipo === 'semilla') {
      if (drag.mov) { const ce = celdaEn(p.x, p.y); if (ce && sel === drag.i) { plantarEn(drag.i, ce.r, ce.c); } else sel = -1; } else elegir(drag.i);
    }
    drag = null; hover = null;
  }
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  function cambiarVel() { vel = vel >= 2 ? 0.5 : vel >= 1.5 ? 2 : vel >= 1 ? 1.5 : 1; AJ.juego.vel = vel; sfx('clic'); }

  /* ---------- teclado y mando ---------- */
  function mover(dr, dc) { cur.vis = true; cur.r = Math.max(0, Math.min(FILAS - 1, cur.r + dr)); cur.c = Math.max(0, Math.min(COLS - 1, cur.c + dc)); sfx('clic'); }
  function accionCursor() { cur.vis = true; if (cogerSolEn(L.bx + (cur.c + 0.5) * L.cw, L.by + (cur.r + 0.5) * L.ch, L.cw * 0.9)) return; tocarCelda(cur.r, cur.c); }
  function onKey(e) {
    if (pausa || s.fin || e.target.closest && e.target.closest('input,textarea,select')) return;
    const T = AJ.controles.teclas, k = e.key, kk = k.length === 1 ? k.toLowerCase() : k; let h = true;
    if (kk === T.arriba) mover(-1, 0); else if (kk === T.abajo) mover(1, 0); else if (kk === T.izq) mover(0, -1); else if (kk === T.der) mover(0, 1);
    else if (kk === T.plantar || kk === ' ') accionCursor(); else if (kk === T.pala) { palaOn = !palaOn; sel = -1; sfx('clic'); } else if (kk === T.sol) M.recogerTodo(s);
    else if (kk === T.sig) elegir((sel + 1 + cartasMostradas()) % Math.max(1, cartasMostradas())); else if (kk === T.ant) elegir((sel - 1 + cartasMostradas()) % Math.max(1, cartasMostradas()));
    else if (kk === T.pausa || kk === 'p') hooks.pausar && hooks.pausar(); else if (/^[1-9]$/.test(kk)) elegir(+kk - 1); else if (kk === 'v') cambiarVel(); else h = false;
    if (h) e.preventDefault();
  }
  addEventListener('keydown', onKey);
  let rep = { t: 0, d: '' };
  function leerMando(dt) {
    const Md = window.Mando; if (!Md || (hooks.bloqueado && hooks.bloqueado())) return; Md.leer(); if (!Md.conectado) return;
    const zm = AJ.controles.zona; let dr = 0, dc = 0, dir = '';
    const ex = Md.ejes.izq.x, ey = Md.ejes.izq.y;
    if (Md.sostenido('ARRIBA') || ey < -0.55) { dr = -1; dir = 'u'; } else if (Md.sostenido('ABAJO') || ey > 0.55) { dr = 1; dir = 'd'; } else if (Md.sostenido('IZQ') || ex < -0.55) { dc = -1; dir = 'l'; } else if (Md.sostenido('DER') || ex > 0.55) { dc = 1; dir = 'r'; }
    if (dir) { rep.t -= dt; if (rep.d !== dir || rep.t <= 0) { mover(dr, dc); rep.t = rep.d === dir ? 0.16 : 0.3; rep.d = dir; } } else { rep.d = ''; rep.t = 0; }
    if (Md.pulsado('A')) accionCursor(); if (Md.pulsado('B')) { sel = -1; selZ = -1; palaOn = false; } if (Md.pulsado('X')) { palaOn = !palaOn; sel = -1; sfx('clic'); } if (Md.pulsado('Y')) M.recogerTodo(s);
    if (Md.pulsado('RB')) elegir(((sel < 0 ? -1 : sel) + 1) % Math.max(1, cartasMostradas())); if (Md.pulsado('LB')) elegir(((sel < 0 ? 0 : sel) - 1 + cartasMostradas()) % Math.max(1, cartasMostradas()));
    if (Md.pulsado('MENU') || Md.pulsado('XBOX')) hooks.pausar && hooks.pausar(); if (Md.pulsado('VISTA')) cambiarVel();
  }

  /* ---------- eventos del motor ---------- */
  function px(c) { return L.bx + c * L.cw; } function py(r) { return L.by + r * L.ch; }
  function procesar() {
    for (const e of s.ev) {
      switch (e.k) {
        case 'planta': pad(px(e.c + 0.5), py(e.r + 0.9), 8, '#8a6a3a', 50); if (e.id !== 'giras' || true) sfx('plantar'); break;
        case 'mejora': pad(px(e.c + 0.5), py(e.r + 0.5), 14, '#ffe34a', 80); sfx('sol'); break;
        case 'dispara': sfx(e.arco ? 'arco' : 'dispara'); break;
        case 'impacto': pad(px(e.x), py(e.r + 0.5), 4, e.fuego ? '#ff9a2a' : '#9fe05a', 40); sfx('impacto'); break;
        case 'golpe': flash[e.z] = 0.1; if (e.arm) sfx('golpeMetal'); break;
        case 'armRota': { const z = s.zombis.find((q) => q.id === e.z); if (z) pad(px(z.x), py(z.r + 0.4), 10, '#aab4bf', 90); sfx('golpeMetal'); break; }
        case 'muerde': sfx('muerde'); break;
        case 'muere': { pad(px(e.x), py(e.r + 0.6), 14, '#9fc98a', 70); sfx('muere'); break; }
        case 'plantaMuere': pad(px(e.c + 0.5), py(e.r + 0.6), 10, '#4cb43a', 70); break;
        case 'explosion': { const X = px(e.c + 0.5), Y = py(e.r + 0.5); pad(X, Y, 40, '#ff9a2a', 200); pad(X, Y, 20, '#ffe24a', 140); pad(X, Y, 14, '#555', 90); parts.push({ x: X, y: Y, r: 10, anillo: e.radio * L.cw, vida: 0.4, v0: 0.4, col: '#ffd23a', vx: 0, vy: 0, g: 0 }); sfx('explosion'); if (!Ar.A.reducir) shake = 10; vib(180); break; }
        case 'cortadora': sfx('cortadora'); vib(120); break;
        case 'sol': sfx('sol'); texto(L.sun.x + 62, L.sun.y + 22, '+' + e.val, '#ffe14a'); break;
        case 'moneda': sfx('moneda'); break;
        case 'ola': if (e.n > 1 || niv.infinito) sfx('ola'); if (niv.infinito) aviso('Oleada ' + e.n, '#fff', 1.6); break;
        case 'avisoOla': aviso(e.final ? '¡OLEADA FINAL!' : '¡Una gran oleada de zombis se acerca!', e.final ? '#ff5a4a' : '#ffd23a', 3); sfx(e.final ? 'final' : 'aviso'); break;
        case 'congela': sfx('congela'); break;
        case 'bolazo': pad(px(e.x), py(e.r + 0.6), 10, '#b97b3d', 90); sfx('impacto'); break;
        case 'jarro': pad(px(e.c + 0.5), py(e.r + 0.5), 16, '#c9783a', 100); sfx('jarro'); break;
        case 'traga': sfx('traga'); break;
        case 'baila': sfx('baila'); break;
        case 'hipnotiza': sfx('hipno'); if (hooks.evento) hooks.evento('hipno'); break;
        case 'pala': sfx('pala'); break;
        case 'pincha': sfx('impacto'); break;
        case 'aplasta': case 'roca': case 'jefeBola': if (!Ar.A.reducir) shake = Math.max(shake, 6); sfx('explosion'); break;
        case 'jefeInvoca': case 'invoca': aviso('¡Refuerzos!', '#ff9a4a', 1.5); sfx('ola'); break;
        case 'jefeApaga': aviso('¡Tus plantas se apagan!', '#9ab', 1.5); sfx('error'); break;
        case 'golpeTumba': pad(px(e.c + 0.5), py(e.r + 0.5), 6, '#8d93a3', 60); sfx('impacto'); break;
        case 'tumbaRota': pad(px(e.c + 0.5), py(e.r + 0.5), 14, '#8d93a3', 100); sfx('explosion'); break;
        case 'cinta': sfx('recarga'); break;
        case 'fin': break;
        default: break;
      }
    }
    s.ev.length = 0;
  }

  /* ---------- bucle ---------- */
  function resultado() {
    return { fin: s.fin, t: s.t, id: niv.id, dif: cfg.dif, stats: { ...s.stats }, monedas: s.monedasGan, olas: s.olaNum, puntajeSurv: Math.max(0, s.olaNum - 1), cortadoras: s.stats.cortadoras, perdidas: s.stats.perdidas, versus: s.fin };
  }
  function actualizar(dt) {
    t += dt; leerMando(dt);
    if (tutorial) pasoTutorial(dt);
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
    if (!pausa && !s.fin) {
      const antes = s.fin; M.paso(s, dt * vel); procesar();
      tGuardar += dt; if (tGuardar > 4 && hooks.guardar && !versus) { tGuardar = 0; hooks.guardar(M.serializar(s), s); }
      if (s.fin && !antes) { finT = 0; sfx(s.fin === 'victoria' || s.fin === 'plantas' ? 'victoria' : 'derrota'); aviso(s.fin === 'victoria' ? '¡Nivel superado!' : s.fin === 'plantas' ? '¡Ganan las plantas!' : s.fin === 'zombis' ? '¡Ganan los zombis!' : '¡Los zombis se comieron tu cerebro!', s.fin === 'derrota' || s.fin === 'zombis' ? '#ff5a4a' : '#7dff7d', 4); vib(s.fin === 'derrota' ? 500 : 200); }
    } else procesar();
    if (s.fin && !acabo) { finT += dt; if (finT > (s.fin === 'derrota' ? 2.6 : 2.2)) { acabo = true; hooks.fin && hooks.fin(resultado()); } }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.vida -= dt; if (p.vida <= 0) { parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; }
    for (const k in flash) { flash[k] -= dt; if (flash[k] <= 0) delete flash[k]; }
    shake = Math.max(0, shake - dt * 30);
  }
  function pasoTutorial(dt) {
    tutorial.t += dt; const p = tutorial.paso;
    if (p === 0 && (s.stats.soles > 0 || tutorial.t > 25)) { tutorial.paso = 1; tutorial.t = 0; }
    else if (p === 1 && s.plantas.length > 0) { tutorial.paso = 2; tutorial.t = 0; }
    else if (p === 2 && tutorial.t > 9) { tutorial.paso = 3; tutorial.t = 0; }
    else if (p === 3 && tutorial.t > 9) tutorial = null;
  }
  const TUT = ['Toca los soles que caen del cielo para recoger energía solar.', 'Toca la semilla Disparaina y luego una casilla del carril central (o arrástrala).', 'Tus plantas disparan solas a los zombis de su carril. ¡Plantea más!', 'Si un zombi llega a la casa, la cortadora de ese carril lo detiene (una vez).'];

  /* ---------- dibujo ---------- */
  function rr(x, y, w, h, r, f, st) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); if (f) { ctx.fillStyle = f; ctx.fill(); } if (st) { ctx.strokeStyle = st; ctx.lineWidth = 2; ctx.stroke(); } }
  function dibujarCarta(i, id, rect, lista, caro, cd, sel0, costo) {
    const { x, y, w, h } = rect; rr(x, y, w, h, 8, sel0 ? '#7fbf4a' : '#3b5a2c', sel0 ? '#ffe34a' : '#1c2f14');
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const sz = Math.min(w - 10, h - 24);
    if (id === 'bola' || id === 'bolagr' || id === 'bomba') Ar.dibujarBola(ctx, { tipo: id }, x + w / 2, y + h * 0.72, sz * 0.9, 0);
    else Ar.iconoSemilla(ctx, id, x + w / 2, y + (h - 16) / 2 - sz * 0.18, sz * 0.95, t);
    if (Ar.A.dalt && P[id]) Ar.insignia(ctx, id, x + 12, y + 12, 8);
    ctx.restore();
    if (costo != null) { rr(x + 2, y + h - 17, w - 4, 15, 6, 'rgba(0,0,0,.55)'); txt(String(costo), x + w / 2 + 6, y + h - 9, 12, caro ? '#ff8a6a' : '#ffe14a'); Ar.dibujarSol(ctx, x + w / 2 - 14, y + h - 9, 5, 0); }
    if (cd > 0) { ctx.fillStyle = 'rgba(0,0,0,.55)'; const q = Math.min(1, cd / (P[id] ? P[id].rec * s.recMult : 8)); ctx.fillRect(x, y, w, (h) * q); }
    else if (caro) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y, w, h); }
    if (tutorial && tutorial.paso === 1 && i === 0 && Math.sin(t * 6) > 0) rr(x - 2, y - 2, w + 4, h + 4, 9, null, '#ffe34a');
  }
  function dibujarHUD() {
    // energia
    rr(L.sun.x, L.sun.y, L.sun.w, L.sun.h, 10, '#2b1d0a', '#e0a800'); Ar.dibujarSol(ctx, L.sun.x + 20, L.sun.y + L.sun.h / 2, 13, t, null); txt(String(Math.floor(s.sol)), L.sun.x + L.sun.w - 10, L.sun.y + L.sun.h / 2, 20, '#ffe14a', 'right');
    if (versus) { rr(L.sun.x, L.sun.y + L.sun.h + 4 + (L.hor ? 0 : 0), L.sun.w, 30, 8, '#2a0a1f', '#ff7ac8'); txt('🧠 ' + Math.floor(s.versus.cerebros), L.sun.x + L.sun.w / 2, L.sun.y + L.sun.h + 4 + 15, 18, '#ff9ad0'); }
    // semillas
    const n = cartasMostradas(), cola = !!(s.cinta || niv.mano), total = versus ? 8 : cola ? Math.max(n, 6) : s.cartas.length;
    for (let i = 0; i < n; i++) {
      const rect = L.slot(i, total);
      if (versus) { const id = VS_PLANTAS[i]; const k = s.cartas.find((q) => q.id === id); dibujarCarta(i, id, rect, true, s.sol < P[id].c, k ? Math.max(0, k.listo - s.t) : 0, sel === i, P[id].c); }
      else if (cola) dibujarCarta(i, s.cola[i], rect, true, false, 0, sel === i, null);
      else { const c = s.cartas[i], cd = M.cartaListaEn(s, i); dibujarCarta(i, c.id, rect, cd <= 0, s.sol < P[c.id].c, cd, sel === i, P[c.id].c); if (!Ar.A.reducir && cd <= 0 && c._cd) { } c._cd = cd > 0; }
      if (!versus && !cola && L.hor) txt(String(i + 1), rect.x + 10, rect.y + 10, 10, '#fff', 'center', 'rgba(0,0,0,.6)');
    }
    // botones
    const b = (r, f, ic) => { ctx.globalAlpha = AJ.controles.op; rr(r.x, r.y, r.w, r.h, 10, f || '#2b3a4a', '#0006'); txt(ic, r.x + r.w / 2, r.y + r.h / 2 + 1, ic.length > 2 ? 14 : 22, '#fff'); ctx.globalAlpha = 1; };
    b(L.pausa, null, '⏸'); b(L.vel, '#2b3a4a', vel + '×'); b(L.pala, palaOn ? '#c58a1a' : '#4a3a2a', '⛏');
    if (L.palaGrande) { rr(L.palaGrande.x, L.palaGrande.y, L.palaGrande.w, L.palaGrande.h, 12, palaOn ? '#c58a1a' : '#4a3a2a', '#0006'); txt('⛏ Pala', L.palaGrande.x + L.palaGrande.w / 2, L.palaGrande.y + L.palaGrande.h / 2, 20, '#fff'); }
    // progreso
    const B = L.barra; if (!versus) {
      rr(B.x, B.y, B.w, B.h, 8, 'rgba(0,0,0,.5)');
      let f = 0, lab = '';
      if (niv.infinito) { lab = 'Oleada ' + Math.max(1, s.olaNum) + (niv.duro ? ' (duro)' : ''); f = ((s.t - 0) % 20) / 20; }
      else if (niv.tipo === 'carrera' && niv.objetivo) { f = Math.min(1, s.stats.soles / niv.objetivo.n); lab = 'Energía ' + s.stats.soles + '/' + niv.objetivo.n; }
      else if (niv.tipo === 'tumbas') { const n = s.celdas.filter((q) => q.tumba).length; f = 1 - n / Math.max(1, niv.tumbas.length); lab = 'Tumbas restantes: ' + n; }
      else if (niv.tipo === 'jarros') { const n = s.celdas.filter((q) => q.jarro).length; f = 1 - n / Math.max(1, niv.jarros.length); lab = 'Jarrones: ' + n; }
      else if (niv.tipo === 'puzzle') { const n = M.zombisVivos(s); f = 0; lab = 'Zombis: ' + n; }
      else { f = s.olas.length ? Math.min(1, (s.olaIdx - 1 + Math.min(1, (s.t - (s.olas[Math.max(0, s.olaIdx - 1)] || { t: 0 }).t) / Math.max(1, s.proxOla - (s.olas[Math.max(0, s.olaIdx - 1)] || { t: 0 }).t))) / s.olas.length + (s.olaIdx >= s.olas.length ? 0 : 0)) : 0; if (s.olaIdx >= s.olas.length) f = 1; f = Math.max(0, f); lab = s.olaIdx >= s.olas.length ? 'Oleada final' : 'Oleada ' + Math.max(1, s.olaIdx) + '/' + s.olas.length; }
      rr(B.x + 1, B.y + 1, Math.max(0, (B.w - 2) * f), B.h - 2, 7, niv.tipo === 'carrera' ? '#ffd23a' : '#7dff7d');
      if (!niv.infinito && s.olas.length) s.olas.forEach((o, k) => { if (o.grande || o.ultima) { const fx = B.x + B.w * (k + 0.5) / s.olas.length; ctx.fillStyle = o.ultima ? '#ff5a4a' : '#ffd23a'; ctx.beginPath(); ctx.moveTo(fx, B.y - 5); ctx.lineTo(fx + 5, B.y + 2); ctx.lineTo(fx - 5, B.y + 2); ctx.fill(); } });
      txt(lab, B.x + B.w / 2, B.y + B.h / 2 + 1, 11, '#fff', 'center', 'rgba(0,0,0,.6)');
      const jefe = s.zombis.find((z) => Z[z.tipo].jefe && z.estado !== 'muere'); if (jefe) { rr(B.x, B.y + 22, B.w, 10, 5, 'rgba(0,0,0,.5)'); rr(B.x + 1, B.y + 23, Math.max(0, (B.w - 2) * jefe.hp / jefe.hpMax), 8, 4, '#ff5a4a'); txt(Z[jefe.tipo].n, B.x + B.w / 2, B.y + 27, 9, '#fff'); }
    } else { rr(B.x, B.y, B.w, B.h, 8, 'rgba(0,0,0,.5)'); rr(B.x + 1, B.y + 1, (B.w - 2) * Math.min(1, s.t / niv.duracion), B.h - 2, 7, '#7dff7d'); txt('Plantas resisten: ' + Math.max(0, Math.ceil(niv.duracion - s.t)) + ' s', B.x + B.w / 2, B.y + B.h / 2 + 1, 11, '#fff', 'center', 'rgba(0,0,0,.6)'); }
    if (versus) { VS_ZOMBIS.forEach(([tp, co], i) => { const r = L.zb(i, VS_ZOMBIS.length); rr(r.x, r.y, r.w, r.h, 8, selZ === i ? '#9a3a7a' : '#4a1f3d', selZ === i ? '#ffe34a' : '#1c0a17'); ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); Ar.dibujarZombi(ctx, { tipo: tp, id: i, hp: 1, hpMax: 1, arm: Z[tp].arm ? { k: Z[tp].arm.k } : null, dir: -1, estado: 'anda' }, r.x + r.w / 2, r.y + r.h * 0.78, Math.min(r.w, r.h) * 0.62, 0, { }); ctx.restore(); txt(String(co), r.x + r.w / 2, r.y + r.h - 7, 12, s.versus.cerebros < co ? '#ff8a6a' : '#ff9ad0', 'center', '#000'); }); }
    if (versus) txt(L.hor ? 'Planta: toca semilla y casilla · Zombis: elige y toca un carril' : 'Toca semilla/zombi y luego el carril', L.W / 2, L.H - 6, 11, '#fff', 'center', '#000');
    // tutorial
    if (tutorial && (!acabo)) { const m = TUT[tutorial.paso], w = Math.min(L.W - 40, 640); rr(L.W / 2 - w / 2, L.H - 62, w, 44, 12, 'rgba(0,0,0,.72)', '#ffe34a'); txt(m, L.W / 2, L.H - 40, L.hor ? 15 : 14, '#fff'); }
  }
  function posZ(z) { return { x: L.bx + z.x * L.cw, y: L.by + (z.filas ? 2.55 : z.r + 0.95) * L.ch }; }
  function dibujar() {
    const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#10151c'; c.fillRect(0, 0, canvas.width, canvas.height);
    const k = canvas.width / canvas.clientWidth, sh = shake ? (Math.random() - 0.5) * shake : 0;
    c.setTransform(k * L.esc, 0, 0, k * L.esc, k * L.ox + sh, k * L.oy + sh);
    c.save(); c.beginPath(); c.rect(0, 0, L.W, L.H); c.clip();
    Ar.dibujarFondo(c, L, niv, t);
    // celdas especiales
    for (let r = 0; r < FILAS; r++) for (let q = 0; q < COLS; q++) {
      const cel = s.celdas[M.idx(r, q)], X = px(q + 0.5), Y = py(r + 0.9);
      if (cel.hielo > 0) { c.fillStyle = 'rgba(190,235,255,.55)'; c.fillRect(px(q), py(r), L.cw, L.ch); }
      if (cel.pozo > 0) { c.fillStyle = '#2a1a0a'; c.beginPath(); c.ellipse(X, Y - 6, L.cw * 0.38, L.ch * 0.16, 0, 0, 6.3); c.fill(); }
      if (cel.base) Ar.dibujarBase(c, cel.base, X, Y, L.u, t);
      if (cel.tumba) Ar.dibujarTumba(c, X, Y, L.u * 1.1, niv.tipo === 'tumbas' ? 3 - cel.tumba : 0);
      if (cel.jarro) Ar.dibujarJarro(c, X, Y, L.u * 1.05, cel.jarro, t);
    }
    // cortadoras
    for (let r = 0; r < FILAS; r++) { const m = s.cort[r]; if (m.estado === 'lista') Ar.dibujarCortadora(c, L.hor ? L.bx - 22 : L.bx + 14, py(r + 0.95), L.hor ? L.u * 0.7 : L.u * 0.5, t, m.tipo, false); else if (m.estado === 'activa') Ar.dibujarCortadora(c, px(m.x) - 10, py(r + 0.95), L.u * 0.8, t, m.tipo, true); }
    // sorted por fila
    for (let r = 0; r < FILAS; r++) {
      for (let q = 0; q < COLS; q++) { const cel = s.celdas[M.idx(r, q)], p = cel.p; if (p) { const X = px(q + 0.5), Y = py(r + 0.92); Ar.dibujarPlanta(c, p.id, X, Y, L.u, t, { ataque: p.ataque, hp: p.hp / p.hpMax, fuse: P[p.id].fuse ? p.fuse : null, arma: p.arma, mastica: p.mastica, preso: p.preso, dorm: p.dorm, ph: p.pid * 0.37 }); } if (cel.esc) Ar.dibujarEscudo(c, px(q + 0.5), py(r + 0.92), L.u, t, cel.esc.hp / cel.esc.hpMax); }
      const zs = s.zombis.filter((z) => (z.filas ? r === 2 : z.r === r)).sort((a, b) => b.x - a.x);
      for (const z of zs) { if (!M.visibleEn(s, z.r, z.x) && !z.hip) continue; const pp = posZ(z); z.flash = flash[z.id] || 0; Ar.dibujarZombi(c, z, pp.x, pp.y, L.u, t, {}); if (z.hp < z.hpMax && z.estado !== 'muere' && !Z[z.tipo].jefe && z.hp > 0) { } }
      for (const b of s.bolas) if (b.r === r) Ar.dibujarBola(c, b, px(b.x), py(r + 0.95), L.u, t);
    }
    // proyectiles
    for (const q of s.proy) Ar.dibujarProy(c, q, px(q.x), py(q.arco ? q.r + 0.5 : q.r), L.u, t);
    // niebla
    if (niv.niebla && s.t >= s.nieblaOff) Ar.dibujarNiebla(c, L, t, (r, x) => M.visibleEn(s, r, x));
    // objetos
    for (const q of s.monedas) Ar.dibujarMoneda(c, px(q.x), py(q.y), Math.max(14, L.cw * 0.2), t + q.id, q.val);
    for (const q of s.soles) { const a = q.vida < 2.5 && !q.cae ? 0.5 + 0.5 * Math.sin(t * 14) : 1; c.globalAlpha = a; Ar.dibujarSol(c, px(q.x), py(q.y), Math.max(18, L.cw * 0.27), t + q.id, q.val); c.globalAlpha = 1; }
    // cursor / vista previa
    const target = hover || (cur.vis ? { r: cur.r, c: cur.c } : null);
    if (target) {
      const id = versus ? (sel >= 0 ? VS_PLANTAS[sel] : null) : (sel >= 0 ? ((s.cinta || niv.mano) ? s.cola[sel] : (s.cartas[sel] || {}).id) : null);
      const ok = id && P[id] ? M.puedePlantarEn(s, id, target.r, target.c) : palaOn;
      c.fillStyle = id ? (ok ? 'rgba(255,255,255,.28)' : 'rgba(255,60,60,.3)') : 'rgba(255,255,255,.16)'; c.fillRect(px(target.c), py(target.r), L.cw, L.ch);
      if (id && ok && P[id]) { c.globalAlpha = 0.55; Ar.dibujarPlanta(c, id, px(target.c + 0.5), py(target.r + 0.92), L.u, t, {}); c.globalAlpha = 1; }
      if (id === 'bola' || id === 'bolagr' || id === 'bomba') { c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(px(0), py(target.r), L.cw * COLS, L.ch); }
      if (palaOn) { txt('⛏', px(target.c + 0.5), py(target.r + 0.5), 34, '#fff', 'center', '#000'); }
      c.strokeStyle = cur.vis ? '#ffe34a' : 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.strokeRect(px(target.c) + 2, py(target.r) + 2, L.cw - 4, L.ch - 4);
    }
    // arrastre
    if (drag && drag.tipo === 'semilla' && drag.mov) { const id = versus ? VS_PLANTAS[drag.i] : ((s.cinta || niv.mano) ? s.cola[drag.i] : (s.cartas[drag.i] || {}).id); if (id && P[id]) { c.globalAlpha = 0.8; Ar.dibujarPlanta(c, id, ptr.x, ptr.y + L.u * 0.4, L.u * 1.1, t, {}); c.globalAlpha = 1; } }
    // particulas
    for (const p of parts) {
      const a = Math.max(0, Math.min(1, p.vida / p.v0)); c.globalAlpha = a;
      if (p.txt) txt(p.txt, p.x, p.y, 18, p.col, 'center', '#000'); else if (p.anillo) { c.strokeStyle = p.col; c.lineWidth = 5 * a; c.beginPath(); c.arc(p.x, p.y, p.anillo * (1 - a), 0, 6.3); c.stroke(); } else { c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r * (0.5 + a), 0, 6.3); c.fill(); }
    }
    c.globalAlpha = 1; c.restore();
    c.save(); c.beginPath(); c.rect(0, 0, L.W, L.H); c.clip(); dibujarHUD();
    if (banner) { const a = Math.min(1, banner.t / 0.4, (banner.d - banner.t) / 0.25 + 0.2); c.globalAlpha = Math.max(0, a); rr(L.W / 2 - 300, L.H * 0.4, 600, 62, 14, 'rgba(0,0,0,.65)'); txt(banner.txt, L.W / 2, L.H * 0.4 + 32, L.hor ? 30 : 24, banner.col, 'center', '#000'); c.globalAlpha = 1; }
    if (AJ.graficos.mostrarFps) txt(Math.round(fps) + ' FPS', L.W - 40, L.H - 12, 11, '#fff', 'center', '#000');
    c.restore();
  }
  function bucle(ts) {
    raf = requestAnimationFrame(bucle); if (destruida) return;
    const lim = AJ.graficos.fps; if (lim && lim < 60 && ts - last < 1000 / lim - 2) return;
    const dt = Math.min(0.1, (ts - last) / 1000 || 0.016); last = ts;
    frames++; tFPS += dt; if (tFPS >= 1) { fps = frames / tFPS; frames = 0; tFPS = 0; if (AJ.graficos.auto && !pausa) { if (fps < 24) { tAuto++; if (tAuto >= 3 && hooks.bajarCalidad) { tAuto = 0; hooks.bajarCalidad(); } } else tAuto = 0; } }
    actualizar(pausa ? 0 : dt); dibujar();
  }
  raf = requestAnimationFrame((ts) => { last = ts; bucle(ts); });
  const onVis = () => { if (document.hidden) { if (hooks.guardar && !s.fin && !versus) hooks.guardar(M.serializar(s), s); if (hooks.ocultar) hooks.ocultar(); } };
  document.addEventListener('visibilitychange', onVis);
  let wl = null; try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then((w) => { wl = w; }).catch(() => {}); } catch (e) { /* sin wake lock */ }
  if (niv.tutorial === undefined) niv.tutorial = false;
  const API = {
    s, niv, destruir() { destruida = true; cancelAnimationFrame(raf); canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); if (ro) ro.disconnect(); try { wl && wl.release(); } catch (e) { /* nada */ } },
    pausar(v) { pausa = v; S.pausarAudio && 0; }, get pausada() { return pausa; }, resultado, serializar() { return M.serializar(s); },
    setVel(v) { vel = v; }, get vel() { return vel; }, aviso, refrescar() { Ar.A.dalt = AJ.accesibilidad.dalt; Ar.A.reducir = AJ.accesibilidad.reducir; Ar.A.sombras = AJ.graficos.sombras && preset().sombras; s.autoSol = AJ.accesibilidad.autoSol ? 3 : 0; ajustarCanvas(); },
    terminarAhora() { if (!s.fin) { s.fin = 'derrota'; acabo = true; hooks.fin && hooks.fin(resultado()); } }, cursor: cur, get sel() { return sel; }, fps: () => fps,
  };
  return API;
}
