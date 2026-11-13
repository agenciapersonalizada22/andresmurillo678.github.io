// Entrada por jugador: multitouch por zonas (con rotacion), teclado compartido por zonas y hasta 4 mandos.
// Cada asiento recibe ent = {dx,dy (marco del jugador), wx,wy (marco del mundo), a,b (sostenidos), aP,bP,izqP,derP,arrP,abaP (flancos del cuadro)}.
import { D } from './ajustes.js';
import { clamp, aLocal, girar, rrect, texto } from './util.js';
import { zonaEn } from './zonas.js';

const nuevo = () => ({ dx: 0, dy: 0, wx: 0, wy: 0, a: false, b: false, aP: false, bP: false, aN: 0, bN: 0, izqP: false, derP: false, arrP: false, abaP: false, _prev: [0, 0], ta: false, tb: false, ka: false, kb: false, pa: false, pb: false, kd: [0, 0], pd: [0, 0], tw: [0, 0], tstick: null });
const S = { activo: false, ctrl: 'tap', usaB: false, compartido: false, zonas: [], parts: [], ent: [], ptrs: new Map(), keys: new Set(), conv: null, puntero: null, pausar: null, padDe: [], padAntes: {}, mapa: {}, usoMando: false, multi: false, seatDeSlot: {} };

function reconstruirMapa() {
  S.mapa = {};
  S.parts.forEach((p, seat) => { if (p.bot) return; const t = D.teclas[p.slot]; if (!t) return; for (const k of ['izq', 'der', 'arr', 'aba', 'a', 'b']) if (t[k]) S.mapa[t[k]] = { seat, k }; });
}
function accion(seat, k, abajo) {
  const e = S.ent[seat]; if (!e) return;
  if (k === 'a') { if (abajo && !e.ka) { e.aP = true; e.aN++; } e.ka = abajo; }
  else if (k === 'b') { if (abajo && !e.kb) { e.bP = true; e.bN++; } e.kb = abajo; }
  else { const i = { izq: [0, -1], der: [0, 1], arr: [1, -1], aba: [1, 1] }[k]; e.kd[i[0]] = abajo ? i[1] : (e.kd[i[0]] === i[1] ? 0 : e.kd[i[0]]); }
}
function teclaAbajo(ev) {
  if (!S.activo) return;
  if (ev.code === 'KeyP') { if (!ev.repeat && S.pausar) S.pausar(); ev.preventDefault(); return; }
  const m = S.mapa[ev.code]; if (!m) return;
  ev.preventDefault(); if (ev.repeat) return;
  S.keys.add(ev.code); accion(m.seat, m.k, true);
}
function teclaArriba(ev) { const m = S.mapa[ev.code]; if (!m) return; S.keys.delete(ev.code); accion(m.seat, m.k, false); }

/* ---------- punteros ---------- */
const tam = () => (D.tamControles || 100) / 100;
function ponerPuntero(id, x, y, ev) {
  const i = S.compartido ? -1 : zonaEn(S.zonas, x, y);
  if (!S.compartido && (i < 0 || S.parts[i].bot)) return;
  const reg = { i, x, y, rol: 'tap', ox: x, oy: y };
  S.ptrs.set(id, reg);
  if (S.ptrs.size >= 2) S.multi = true;
  if (S.compartido) { if (S.puntero) S.puntero(-1, x, y, x, y); return; }
  const z = S.zonas[i], e = S.ent[i], l = aLocal(z, x, y), c = S.ctrl;
  if (c === 'stick') {
    const izqLado = D.zurdo ? l.x > z.w * 0.42 : l.x < z.w * 0.58;
    if (izqLado) { reg.rol = 'stick'; e.tstick = { ox: x, oy: y, x, y }; }
    else if (S.usaB && l.y < z.h * 0.5) { reg.rol = 'b'; e.tb = true; e.bP = true; e.bN++; }
    else { reg.rol = 'a'; e.ta = true; e.aP = true; e.aN++; }
  } else if (c === 'ab' || c === 'lr') {
    if (l.x < z.w / 2) { reg.rol = 'a'; e.ta = true; e.aP = true; e.aN++; e.tw = girar(z, -1, 0); } else { reg.rol = 'b'; e.tb = true; e.bP = true; e.bN++; e.tw = girar(z, 1, 0); }
  } else { reg.rol = 'a'; e.ta = true; e.aP = true; e.aN++; if (S.puntero) S.puntero(i, l.x, l.y, x, y); }
}
function moverPuntero(id, x, y) {
  const r = S.ptrs.get(id); if (!r) return; r.x = x; r.y = y;
  if (r.rol === 'stick' && r.i >= 0) {
    const e = S.ent[r.i], st = e.tstick; if (!st) return;
    const R = 55 * tam() / clamp(D.sens || 1, 0.5, 2);
    let vx = (x - st.ox) / R, vy = (y - st.oy) / R; const m = Math.hypot(vx, vy);
    if (m > 1) { vx /= m; vy /= m; st.ox = x - vx * R; st.oy = y - vy * R; }
    st.x = x; st.y = y; e.tw = m < 0.12 ? [0, 0] : [vx, vy];
  }
}
function quitarPuntero(id) {
  const r = S.ptrs.get(id); if (!r) return; S.ptrs.delete(id);
  if (r.i < 0) return; const e = S.ent[r.i]; if (!e) return;
  if (r.rol === 'stick') { e.tstick = null; e.tw = [0, 0]; }
  else if (r.rol === 'a') { e.ta = false; if (S.ctrl === 'lr' || S.ctrl === 'ab') e.tw = [0, 0]; }
  else if (r.rol === 'b') { e.tb = false; if (S.ctrl === 'lr' || S.ctrl === 'ab') e.tw = [0, 0]; }
}

/* ---------- mandos ---------- */
function leerPads() {
  const lista = (navigator.getGamepads ? Array.from(navigator.getGamepads()) : []).filter((p) => p && p.connected);
  S.padDe = lista;
  let seatsHum = S.parts.map((p, i) => (p.bot ? -1 : i)).filter((i) => i >= 0);
  lista.forEach((p, j) => {
    const seat = seatsHum[j]; if (seat == null) return;
    const e = S.ent[seat], b = p.buttons, ax = p.axes, zm = D.zonaMuerta;
    const btn = (i) => !!(b[i] && (b[i].pressed || b[i].value > 0.5));
    let x = ax[0] || 0, y = ax[1] || 0; const m = Math.hypot(x, y);
    if (m < zm) { x = 0; y = 0; } else { const k = Math.min(1, (m - zm) / (1 - zm)) / m; x *= k; y *= k; }
    if (btn(14)) x = -1; if (btn(15)) x = 1; if (btn(12)) y = -1; if (btn(13)) y = 1;
    e.pd = [x, y];
    const a = btn(0) || btn(2) || btn(7), bb = btn(1) || btn(3) || btn(5);
    const ant = S.padAntes[p.index] || {};
    if (a && !ant.a) { e.aP = true; e.aN++; } if (bb && !ant.b) { e.bP = true; e.bN++; }
    e.pa = a; e.pb = bb;
    if (btn(9) && !ant.m && S.pausar) S.pausar();
    if (a || bb || m > 0.4) S.usoMando = true;
    S.padAntes[p.index] = { a, b: bb, m: btn(9) };
  });
}

export const Entrada = {
  S, ent: S.ent,
  iniciar(canvas, conv) {
    S.conv = conv;
    const pos = (ev) => S.conv(ev.clientX, ev.clientY);
    canvas.addEventListener('pointerdown', (ev) => { if (!S.activo) return; ev.preventDefault(); try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* sin captura */ } const p = pos(ev); ponerPuntero(ev.pointerId, p.x, p.y, ev); });
    canvas.addEventListener('pointermove', (ev) => { if (!S.activo || !S.ptrs.has(ev.pointerId)) return; ev.preventDefault(); const p = pos(ev); moverPuntero(ev.pointerId, p.x, p.y); });
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(t, (ev) => quitarPuntero(ev.pointerId));
    canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
    addEventListener('keydown', teclaAbajo, true); addEventListener('keyup', teclaArriba, true);
    addEventListener('blur', () => Entrada.soltarTodo());
  },
  preparar({ zonas, parts, ctrl, usaB, compartido, puntero, pausar }) {
    Object.assign(S, { zonas, parts, ctrl, usaB: !!usaB, compartido: !!compartido, puntero, pausar, multi: false, usoMando: false });
    S.ent.length = 0; parts.forEach(() => S.ent.push(nuevo()));
    S.ptrs.clear(); S.keys.clear(); S.padAntes = {};
    (navigator.getGamepads ? Array.from(navigator.getGamepads()) : []).forEach((p) => { if (p && p.connected) { const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed); S.padAntes[p.index] = { a: b(0) || b(2) || b(7), b: b(1) || b(3) || b(5), m: b(9) }; } });
    reconstruirMapa();
  },
  activar(v) { S.activo = v; if (!v) this.soltarTodo(); },
  soltarTodo() { S.ptrs.clear(); S.keys.clear(); S.ent.forEach((e, i) => { Object.assign(e, { ta: false, tb: false, ka: false, kb: false, kd: [0, 0], tw: [0, 0], tstick: null }); }); },
  cuadro() {
    leerPads();
    S.ent.forEach((e, i) => {
      const z = S.zonas[i];
      const tl = girar(z, e.tw[0], e.tw[1]);
      const pick = (a, b, c) => (Math.abs(a) >= Math.abs(b) && Math.abs(a) >= Math.abs(c) ? a : Math.abs(b) >= Math.abs(c) ? b : c);
      e.dx = pick(e.kd[0], e.pd[0], tl[0]); e.dy = pick(e.kd[1], e.pd[1], tl[1]);
      const w = girar(z, e.dx, e.dy); e.wx = w[0]; e.wy = w[1];
      e.a = e.ta || e.ka || e.pa; e.b = e.tb || e.kb || e.pb;
      const [px, py] = e._prev, T = 0.5;
      if (e.dx <= -T && px > -T) e.izqP = true; if (e.dx >= T && px < T) e.derP = true;
      if (e.dy <= -T && py > -T) e.arrP = true; if (e.dy >= T && py < T) e.abaP = true;
      e._prev = [e.dx, e.dy];
    });
  },
  fin() { S.ent.forEach((e) => { e.aN = e.bN = 0; e.aP = e.bP = e.izqP = e.derP = e.arrP = e.abaP = false; }); },
  vibrar(seat, fuerte, suave, ms) {
    if (!D.vibracion) return;
    const k = D.vibInt || 1, e = S.parts[seat]; if (!e || e.bot) return;
    const hum = S.parts.map((p, i) => (p.bot ? -1 : i)).filter((i) => i >= 0), p = S.padDe[hum.indexOf(seat)];
    try {
      if (p && p.vibrationActuator && p.vibrationActuator.playEffect) p.vibrationActuator.playEffect('dual-rumble', { duration: ms || 100, strongMagnitude: Math.min(1, fuerte * k), weakMagnitude: Math.min(1, suave * k) });
      else if (!p && navigator.vibrate && S.ptrs.size) navigator.vibrate(Math.min(60, ms || 30));
    } catch (er) { /* sin vibracion */ }
  },
  /* Ayudas tactiles en el marco de cada jugador humano (solo para juegos con palanca o botones). */
  dibujarControles(g) {
    if (!D.verControles) return;
    const c = S.ctrl; if (c !== 'stick' && c !== 'ab' && c !== 'lr') return;
    const k = tam(), op = D.opControles / 100;
    S.parts.forEach((p, i) => {
      if (p.bot) return;
      const z = S.zonas[i], e = S.ent[i];
      g.save(); g.translate(z.x + z.w / 2, z.y + z.h / 2); g.rotate(z.rot || 0); g.translate(-z.w / 2, -z.h / 2);
      g.globalAlpha = op * 0.55; g.lineWidth = 3; g.strokeStyle = '#fff'; g.fillStyle = 'rgba(255,255,255,.14)';
      const mx = (x) => (D.zurdo ? z.w - x : x);
      if (c === 'stick') {
        const st = e.tstick, r = 38 * k, bx = mx(z.w * 0.2), by = z.h * 0.8;
        const lp = st ? aLocal(z, st.ox, st.oy) : { x: bx, y: by }, kp = st ? aLocal(z, st.x, st.y) : { x: bx, y: by };
        g.beginPath(); g.arc(lp.x, lp.y, r, 0, 6.3); g.fill(); g.stroke();
        g.beginPath(); g.arc(kp.x, kp.y, r * 0.45, 0, 6.3); g.fillStyle = p.color; g.globalAlpha = op * 0.9; g.fill();
        g.globalAlpha = op * (e.ta ? 0.95 : 0.55); g.fillStyle = e.ta ? p.color : 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(mx(z.w * 0.82), z.h * (S.usaB ? 0.8 : 0.78), r * 0.85, 0, 6.3); g.fill(); g.stroke();
        texto(g, 'A', mx(z.w * 0.82), z.h * (S.usaB ? 0.8 : 0.78), r * 0.6, '#fff');
        if (S.usaB) { g.globalAlpha = op * (e.tb ? 0.95 : 0.55); g.fillStyle = e.tb ? p.color : 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(mx(z.w * 0.82), z.h * 0.42, r * 0.6, 0, 6.3); g.fill(); g.stroke(); texto(g, 'B', mx(z.w * 0.82), z.h * 0.42, r * 0.45, '#fff'); }
      } else {
        const hh = Math.min(70 * k, z.h * 0.22), et = c === 'lr' ? ['◀', '▶'] : ['A', 'B'];
        [0, 1].forEach((j) => {
          const act = j ? e.tb : e.ta; g.globalAlpha = op * (act ? 0.95 : 0.5);
          g.fillStyle = act ? p.color : 'rgba(255,255,255,.12)'; rrect(g, j ? z.w / 2 + 6 : 6, z.h - hh - 6, z.w / 2 - 12, hh, 16); g.fill(); g.stroke();
          texto(g, et[j], j ? z.w * 0.75 : z.w * 0.25, z.h - hh / 2 - 6, hh * 0.45, '#fff');
        });
      }
      g.restore();
    });
  }
};
