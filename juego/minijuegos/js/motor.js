// Motor de rondas: lienzo, bucle, instrucciones, cuenta atras, pausa y resultado. Un juego = {id,nombre,...,crear(ctx)} (ver juegos/index.js).
import { D, PRESETS, guardar as guardarAj } from './ajustes.js';
import { Entrada } from './entrada.js';
import { Sonido } from './sonido.js';
import { repartir } from './zonas.js';
import { armarCtx } from './simular.js';
import { dentroZona, texto, rrect, puestos, TAU } from './util.js';
import { ficha, FORMAS_DALTO, cfg as cfgMarca } from './marca.js';
import { h, $ } from './dom.js';
import { nombreTecla } from './ajustes.js';

const escena = $('#escena'), cv = $('#lienzo'), g = cv.getContext('2d'), capa = $('#capaRonda'), bPausa = $('#bPausa');
const M = { estado: 'idle', inst: null, juego: null, parts: [], zonas: [], W: 0, H: 0, k: 1, ox: 0, oy: 0, esc: 1, cssW: 0, cssH: 0, t: 0, cuenta: 0, cierre: 0, opc: {}, fin: null, raf: 0, ult: 0, fps: 60, acumFps: 0, nFps: 0, parts_: [] };
export const Motor = { hooks: { ajustes: null, ayuda: null, aviso: null }, M };
const chispas = [];

function redimensionar() {
  const r = escena.getBoundingClientRect(); M.cssW = r.width; M.cssH = r.height;
  const q = Math.max(0.5, Math.min(3, (window.devicePixelRatio || 1) * (D.resolucion || 1)));
  const esc = Math.min(q, Math.sqrt(4.2e6 / Math.max(1, r.width * r.height)));
  M.esc = esc; cv.width = Math.max(1, Math.round(r.width * esc)); cv.height = Math.max(1, Math.round(r.height * esc));
  if (M.W) { M.k = Math.min(r.width / M.W, r.height / M.H); M.ox = (r.width - M.W * M.k) / 2; M.oy = (r.height - M.H * M.k) / 2; }
}
addEventListener('resize', () => { if (M.estado !== 'idle') redimensionar(); });
Entrada.iniciar(cv, (cx, cy) => { const r = cv.getBoundingClientRect(); return { x: (cx - r.left - M.ox) / M.k, y: (cy - r.top - M.oy) / M.k }; });

/* ---------- efectos ---------- */
const fx = {
  snd: (n) => Sonido.fx(n),
  vib: (seat, f, s, ms) => Entrada.vibrar(seat, f, s, ms),
  chispas(x, y, color, n = 10) {
    if (!D.particulas || D.acc.reducirMov) return;
    for (let i = 0; i < n && chispas.length < 400; i++) { const a = Math.random() * TAU, v = 40 + Math.random() * 160; chispas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.5 + Math.random() * 0.4, c: color, r: 2 + Math.random() * 3 }); }
  },
  chispasZ(seat, lx, ly, color, n) { const z = M.zonas[seat]; if (!z) return; const p = z.rot ? { x: z.x + z.w - lx, y: z.y + z.h - ly } : { x: z.x + lx, y: z.y + ly }; fx.chispas(p.x, p.y, color, n); }
};

/* ---------- dibujo ---------- */
function fondo() {
  cfgMarca.brillo = !!D.brillo;
  g.setTransform(1, 0, 0, 1, 0, 0);
  const gr = g.createLinearGradient(0, 0, 0, cv.height); gr.addColorStop(0, '#1b1450'); gr.addColorStop(1, '#0b0820');
  g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
  g.setTransform(M.esc * M.k, 0, 0, M.esc * M.k, M.esc * M.ox, M.esc * M.oy);
}
function etiquetas() {
  M.parts.forEach((p, i) => {
    const z = M.zonas[i];
    dentroZona(g, z, (w, hh) => {
      const ty = M.juego.compartido ? hh - 40 : 6;
      const pts = M.inst.etq ? M.inst.etq(i) : String(Math.round(M.inst.pts[i] || 0));
      g.font = '800 15px Orbitron, system-ui'; const nom = w > 250 ? p.nombre : '';
      const tw = g.measureText(pts).width + g.measureText(nom).width + 62 + (nom ? 8 : 0);
      g.globalAlpha = 0.85; g.fillStyle = 'rgba(8,6,24,.72)'; rrect(g, 6, ty, tw, 30, 15); g.fill(); g.globalAlpha = 1;
      ficha(g, M.forma(p, i), 21, ty + 15, 8, p.color);
      g.font = '16px system-ui'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(p.avatar || '', 34, ty + 16);
      texto(g, nom ? nom : '', 56, ty + 16, 13, '#dfe', 'left', 600);
      texto(g, pts, 56 + (nom ? g.measureText(nom).width + 8 : 0), ty + 16, 15, '#fff', 'left');
      if (p.bot) texto(g, '🤖', w - 20, ty + 15, 14);
    });
  });
}
function cuentaAtras() {
  const n = Math.ceil(M.cuenta), s = n > 0 ? String(n) : '¡YA!';
  M.parts.forEach((p, i) => dentroZona(g, M.zonas[i], (w, hh) => { g.globalAlpha = 0.9; texto(g, s, w / 2, hh / 2, Math.min(w, hh) * (n > 0 ? 0.42 : 0.28), '#fff'); g.globalAlpha = 1; }));
}
function dibujar(dt) {
  fondo();
  if (D.brillo) { g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 0; }
  if (M.inst) { g.save(); M.inst.draw(g); g.restore(); }
  for (let i = chispas.length - 1; i >= 0; i--) { const c = chispas[i]; c.t -= dt; if (c.t <= 0) { chispas.splice(i, 1); continue; } c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 220 * dt; g.globalAlpha = Math.min(1, c.t * 2); g.fillStyle = c.c; g.fillRect(c.x - c.r / 2, c.y - c.r / 2, c.r, c.r); }
  g.globalAlpha = 1;
  if (M.estado === 'juego' || M.estado === 'pausa' || M.estado === 'cierre') Entrada.dibujarControles(g);
  if (M.inst) etiquetas();
  if (M.estado === 'cuenta') cuentaAtras();
  if (D.fps) { g.setTransform(M.esc, 0, 0, M.esc, 0, 0); texto(g, Math.round(M.fps) + ' fps', M.cssW - 8, M.cssH - 10, 12, '#9f9', 'right', 600); }
}

/* ---------- bucle ---------- */
function frame(ts) {
  M.raf = requestAnimationFrame(frame);
  const lim = D.limiteFps; if (lim && ts - M.ult < 1000 / lim - 2) return;
  const dt = Math.min(0.05, M.ult ? (ts - M.ult) / 1000 : 0.016); M.ult = ts;
  M.acumFps += dt; M.nFps++; if (M.acumFps > 1) { M.fps = M.nFps / M.acumFps; autoBajar(); M.acumFps = 0; M.nFps = 0; }
  Entrada.cuadro();
  const ent = Entrada.ent;
  if (M.estado === 'instr') {
    M.t += dt; const barra = $('.barra5 i', capa); if (barra && !M.opc.practica) barra.style.width = Math.min(100, M.t / 5 * 100) + '%';
    if ((!M.opc.practica && M.t > 5) || ent.some((e) => e.aP || e.bP)) empezarCuenta();
  } else if (M.estado === 'cuenta') {
    const antes = Math.ceil(M.cuenta); M.cuenta -= dt; const ahora = Math.ceil(M.cuenta);
    if (ahora !== antes && ahora > 0) Sonido.fx('tick');
    if (M.cuenta <= 0) { M.estado = 'juego'; Sonido.fx('ya'); Entrada.soltarTodo(); }
  } else if (M.estado === 'juego') {
    M.t += dt; M.inst.update(dt, ent);
    if (M.inst.fin) { M.estado = 'cierre'; M.cierre = 1.3; Entrada.activar(false); Sonido.fx('gana'); }
    else if (M.t > (M.juego.dur || 40) * 2.5 + 20) { M.inst.fin = true; }
  } else if (M.estado === 'cierre') {
    M.cierre -= dt; if (M.cierre <= 0) mostrarResultado();
  }
  Entrada.fin();
  dibujar(dt);
}
function autoBajar() {
  if (!D.autoBajada || M.estado !== 'juego' || M.fps >= 38 || !(M.fps > 0)) return;
  M.lento = (M.lento || 0) + 1;
  if (M.lento < 3) return;
  M.lento = 0;
  const orden = ['ultra', 'alta', 'media', 'baja'], i = orden.indexOf(D.calidad);
  if (i >= 0 && i < 3) { D.calidad = orden[i + 1]; Object.assign(D, PRESETS[D.calidad]); guardarAj(); redimensionar(); Motor.hooks.aviso && Motor.hooks.aviso('Calidad bajada a ' + D.calidad + ' para ir más fluido'); }
}

/* ---------- pantallas superpuestas ---------- */
const espejo = () => M.parts.length > 1 && M.zonas.some((z) => z.rot);
function panel(contenido, conEspejo) {
  capa.textContent = ''; capa.hidden = false; capa.className = 'capa-ronda' + (conEspejo && espejo() ? ' espejo' : '');
  if (conEspejo && espejo()) { capa.appendChild(h('div', { cls: 'mitad arriba' }, [contenido()])); capa.appendChild(h('div', { cls: 'mitad abajo' }, [contenido()])); }
  else capa.appendChild(h('div', { cls: 'mitad solo' }, [contenido()]));
}
function textoControles() {
  const c = M.juego.ctrl, hum = M.parts.filter((p) => !p.bot);
  const k = (p) => { const t = D.teclas[p.slot] || {}; const mov = [t.izq, t.arr, t.aba, t.der].map(nombreTecla).join(''); return `J${p.slot + 1} ${c === 'stick' ? mov + ' + ' : ''}${c === 'lr' || c === 'ab' ? nombreTecla(t.a) + '/' + nombreTecla(t.b) : nombreTecla(t.a)}${c === 'puntero' ? ' + ' + mov : ''}`; };
  const tact = { tap: 'Toca tu zona', stick: 'Arrastra a la izquierda para mover · botón A a la derecha', ab: 'Mitad izquierda = A · mitad derecha = B', lr: 'Mitad izquierda = girar a la izquierda · derecha = a la derecha', puntero: 'Toca lo que quieras elegir' }[c];
  return [['👆', tact], ['⌨️', hum.map(k).join('  ·  ')], ['🎮', 'Mando: palanca/cruceta y A' + (M.juego.usaB ? '/B' : '')]];
}
function pantallaInstr() {
  const j = M.juego;
  panel(() => h('div', { cls: 'instr' }, [
    h('div', { cls: 'instr-ico', txt: j.icono }), h('h2', { txt: j.nombre }),
    h('ul', { cls: 'instr-lista' }, j.instr.map((t) => h('li', { txt: t }))),
    h('div', { cls: 'instr-ctrl' }, textoControles().map(([i, t]) => h('p', {}, [h('span', { txt: i }), t]))),
    M.opc.etiqueta ? h('small', { cls: 'instr-et', txt: M.opc.etiqueta }) : null,
    M.opc.practica ? h('small', { cls: 'instr-et', txt: 'Modo práctica: sin puntos ni monedas.' }) : h('div', { cls: 'barra5' }, [h('i')]),
    h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, txt: '¡Listo!', on: { click: () => empezarCuenta() } })
  ]), true);
  setTimeout(() => { const f = $('[data-f]', capa); f && f.focus(); }, 30);
}
function empezarCuenta() { if (M.estado !== 'instr') return; capa.hidden = true; M.estado = 'cuenta'; M.cuenta = 3.99; Sonido.fx('tick'); }
async function mostrarResultado() {
  M.estado = 'fin'; const pts = M.inst.pts.slice(), pl = puestos(pts);
  const info = (M.opc.alTerminar && (await M.opc.alTerminar(pts, pl, M.inst))) || {};
  const orden = pts.map((_, i) => i).sort((a, b) => pl[a] - pl[b] || a - b);
  const fila = (i) => { const p = M.parts[i]; return h('div', { cls: 'res-fila p' + pl[i], style: '--c:' + p.color }, [h('b', { cls: 'res-pos', txt: pl[i] === 1 ? '🏆' : '#' + pl[i] }), h('span', { cls: 'res-av', txt: p.avatar }), h('span', { cls: 'res-nom', txt: p.nombre }), h('span', { cls: 'res-pts', txt: M.inst.etq ? M.inst.etq(i) : String(Math.round(pts[i])) }), h('small', { cls: 'res-ex', txt: (info.extra && info.extra[i]) || '' })]); };
  const botones = () => M.opc.practica
    ? h('div', { cls: 'aj-botones' }, [h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, txt: 'Repetir', on: { click: () => cerrarRonda({ repetir: true }) } }), h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Salir', on: { click: () => cerrarRonda({}) } })])
    : h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, txt: M.opc.continuar || 'Continuar', on: { click: () => cerrarRonda({}) } });
  panel(() => h('div', { cls: 'resultado' }, [h('h2', { txt: pl.filter((x) => x === 1).length > 1 ? 'Empate' : M.parts[orden[0]].nombre + ' gana la ronda' }), h('div', { cls: 'res-lista' }, orden.map(fila)), info.nota ? h('p', { cls: 'res-nota', txt: info.nota }) : null, botones()]), true);
  setTimeout(() => { const f = $('[data-f]', capa); f && f.focus(); }, 30);
}
function cerrarRonda(extra) { const r = { pts: M.inst.pts.slice(), places: puestos(M.inst.pts), ...extra }; limpiar(); M.resolver(r); }
function limpiar() { document.body.classList.remove('jugando'); cancelAnimationFrame(M.raf); capa.hidden = true; capa.textContent = ''; escena.hidden = true; Entrada.activar(false); M.estado = 'idle'; chispas.length = 0; M.inst = null; }

/* ---------- pausa ---------- */
function pausar() {
  if (M.estado === 'pausa') return reanudar();
  if (M.estado !== 'juego' && M.estado !== 'cuenta') return;
  M.previo = M.estado; M.estado = 'pausa'; Entrada.activar(false); Sonido.fx('click');
  capa.textContent = ''; capa.hidden = false; capa.className = 'capa-ronda';
  const b = (t, f, c = '') => h('button', { type: 'button', cls: 'btn ' + c, 'data-f': 1, txt: t, on: { click: f } });
  capa.appendChild(h('div', { cls: 'mitad solo' }, [h('div', { cls: 'instr' }, [h('h2', { txt: 'Pausa' }),
    b('Reanudar', reanudar, 'grande'),
    b('Ajustes', () => Motor.hooks.ajustes && Motor.hooks.ajustes(), 'sec'),
    b('Cómo se juega', () => Motor.hooks.ayuda && Motor.hooks.ayuda(), 'sec'),
    M.opc.practica ? b('Reiniciar ronda', () => cerrarRonda({ repetir: true }), 'sec') : null,
    b(M.opc.practica ? 'Salir de la práctica' : 'Abandonar y guardar', () => cerrarRonda({ abandono: true }), 'peligro')])]));
  setTimeout(() => { const f = $('[data-f]', capa); f && f.focus(); }, 30);
}
function reanudar() { if (M.estado !== 'pausa') return; capa.hidden = true; M.estado = M.previo; Entrada.activar(M.previo === 'juego'); M.ult = 0; }
Motor.pausar = pausar; Motor.reanudar = reanudar; Motor.enPausa = () => M.estado === 'pausa';
bPausa.addEventListener('click', pausar);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && (M.estado === 'juego' || M.estado === 'cuenta')) pausar(); });
Motor.activo = () => M.estado !== 'idle';

/* ---------- ronda ---------- */
Motor.ronda = (juego, parts, opc = {}) => new Promise((resolver) => {
  M.resolver = resolver; M.juego = juego; M.opc = opc; M.parts = parts;
  escena.hidden = false; document.body.classList.add('jugando'); redimensionar();
  M.W = Math.round(M.cssW); M.H = Math.round(M.cssH); M.k = 1; M.ox = 0; M.oy = 0;
  M.zonas = repartir(parts.length, M.W, M.H, D.orient);
  M.forma = (p, i) => (D.acc.daltonico ? FORMAS_DALTO[i % 4] : p.forma || 'circulo');
  const ctx = armarCtx(parts, M.W, M.H, { zonas: M.zonas, prac: !!opc.practica, reducir: D.acc.reducirMov, brillo: D.brillo, fx });
  ctx.forma = M.forma;
  M.inst = juego.crear(ctx); M.t = 0; M.estado = 'instr'; M.ult = 0; M.lento = 0;
  Entrada.preparar({ zonas: M.zonas, parts, ctrl: juego.ctrl, usaB: juego.usaB, compartido: juego.compartido, puntero: (i, lx, ly, wx, wy) => M.inst.puntero && M.estado === 'juego' && M.inst.puntero(i, lx, ly, wx, wy), pausar });
  Entrada.activar(true);
  pantallaInstr();
  M.raf = requestAnimationFrame(frame);
});
Motor.abortar = () => { if (M.estado !== 'idle') { const r = M.resolver; limpiar(); r({ abandono: true, pts: [], places: [] }); } };
Motor.extras = () => ({ mando: Entrada.S.usoMando, multitoque: Entrada.S.multi, inst: M.inst });
