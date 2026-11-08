// Controlador de partida: bucle de simulacion, bots, eventos, estadisticas y red (anfitrion autoritativo / invitado con prediccion).
import { A, P, partidaGuardada, salaGuardada } from './almacen.js';
import { S } from './sonido.js';
const F = window.HkFisica, B = window.HkBot, D = window.HkDatos, Red = window.Red, Mando = window.Mando;
const COL_DALTO = ['#3d9bff', '#ffa43d'];

export function crearPartida(render, entrada, hooks) {
  const G = { spec: null, s: null, fase: 'nada', pausada: false };
  let bots = [], stats, colores, nombres, mesaT, discoT, cuentaN = 0, ya = 0, banner = '', bannerT = 0, tSnap = 0, tIn = 0, t = 0;
  let interp = null, ultSnap = null, cola = [], local = null, esperaInicio = 0, marcadorRed = [0, 0];

  const esGuest = () => G.spec && G.spec.rol === 'guest';
  const esHost = () => G.spec && G.spec.rol === 'host';
  const yo = () => (G.spec ? G.spec.yo : 0);

  function vib(f, d, ms) {
    if (!A.ctrl.vibracion) return;
    if (Mando && Mando.conectado) Mando.vibrar(f * A.ctrl.vibInt, d * A.ctrl.vibInt, ms);
    else if (navigator.vibrate && entrada.ultimo === 'tactil') try { navigator.vibrate(Math.min(30, ms / 3)); } catch (e) { /* sin vibracion */ }
  }

  G.iniciar = function (spec) {
    G.detener(true);
    G.spec = spec = Object.assign({ rol: 'local', yo: 0, meta: 7, dif: 1, obst: [], items: false, humanos: null }, spec);
    mesaT = D.MESAS.find((m) => m.id === spec.mesa) || D.MESAS[0]; discoT = D.DISCOS.find((d) => d.id === spec.disco) || D.DISCOS[0];
    const cfg = Object.assign({}, mesaT.cfg);
    G.s = F.crear({ cfg, obst: spec.obst, items: spec.items, semilla: spec.semilla || (Math.random() * 1e9) | 0, saca: spec.saca || 0 });
    if (spec.marcador) G.s.marcador = spec.marcador.slice();
    G.s.espera = 3.3; esperaInicio = 3.3; ya = 0; cuentaN = 0;
    const mc = P.sel && Red && Red.perfil ? Red.perfil.obtener().color : '#3df5ff';
    colores = spec.colores || (A.acc.dalto ? COL_DALTO.slice() : [spec.miColor || mc, spec.colorRival || (spec.modo === 'local' ? '#ff4fd8' : '#ff4f6a')]);
    if (A.acc.dalto) colores = COL_DALTO.slice();
    nombres = spec.nombres || ['Tú', 'Bot'];
    entrada.local2p = spec.modo === 'local'; entrada.yo = spec.yo;
    entrada.humanos = spec.humanos || (spec.modo === 'local' ? [true, true] : spec.rol === 'guest' ? [false, true] : [true, false]);
    entrada.reiniciar(G.s);
    render.limpiar(); render.girar = spec.rol === 'guest';
    bots = [];
    if (spec.modo !== 'local' && spec.rol !== 'guest' && spec.rol !== 'host') bots[1] = B.crear(spec.dif, 1, F.rng((Math.random() * 1e9) | 0));
    stats = { me: 0, contra: 0, racha: 0, mejorRacha: 0, deficit: 0, poderes: 0, seg: 0 };
    if (spec.marcador) { stats.me = 0; }
    G.fase = 'juego'; G.pausada = false; banner = ''; interp = null; ultSnap = null; cola = []; t = 0;
    if (esGuest()) { local = F.crear({ cfg, obst: spec.obst }); local.espera = 0; marcadorRed = spec.marcador ? spec.marcador.slice() : [0, 0]; interp = new Red.Interpolador({ retardo: 95, extrapolar: 100 }); }
    else local = null;
    S.cuenta(false);
  };

  G.detener = function (silencio) {
    G.fase = 'nada'; G.spec = null; G.s = null; local = null; render.girar = false;
    if (!silencio) render.limpiar();
  };

  G.pausar = function (v) { if (G.fase === 'juego' && G.spec && G.spec.rol === 'local') G.pausada = v; };

  function guardar() {
    if (!G.spec || G.fase !== 'juego' || G.spec.rol !== 'local') return;
    if (G.spec.modo === 'local') return;
    partidaGuardada.guardar({ spec: Object.assign({}, G.spec, { marcador: G.s.marcador.slice() }) });
  }
  G.guardar = guardar;

  function fin(ganador, razon) {
    if (G.fase !== 'juego') return;
    G.fase = 'fin'; G.pausada = false;
    const m = esGuest() ? marcadorRed : G.s.marcador, i = yo();
    if (G.s) G.s.espera = 999;
    partidaGuardada.borrar(); if (esHost()) salaGuardada.borrar();
    const res = { ganador, razon: razon || '', marcador: m.slice(), yo: i, gane: ganador === i, golesYo: m[i], golesRival: m[1 - i], racha: stats.mejorRacha, deficit: stats.deficit, poderes: stats.poderes, seg: Math.round(stats.seg), spec: G.spec };
    (ganador === i ? S.victoria : S.derrota)();
    setTimeout(() => hooks.alFin && hooks.alFin(res), 900);
  }
  G.fin = fin;

  function manejar(e, remoto) {
    const i = yo();
    switch (e.t) {
      case 'golpe': S.golpe(e.v); render.golpe(e.x, e.y, e.v, colores[e.lado]); if (e.lado === i || G.spec.modo === 'local') vib(Math.min(1, e.v / 1500), 0.3, 60); break;
      case 'pared': S.pared(e.v); if (e.v > 300) render.chispas(e.x, e.y, 3, '#fff', 120, 0.3); break;
      case 'poste': S.poste(); render.chispas(e.x, e.y, 6, '#fff', 200, 0.4); break;
      case 'obst': S.obst(); render.chispas(e.x, e.y, 5, mesaT.linea, 160, 0.4); break;
      case 'item': S.item(); render.chispas(e.x, e.y, 22, '#fff', 260, 0.7); if (e.lado === i && G.spec.modo !== 'local') { stats.poderes++; hooks.poder && hooks.poder(); } break;
      case 'gol': {
        const propio = e.lado === i || G.spec.modo === 'local';
        S.gol(propio); render.gol(e.x, e.y, colores[e.lado]); vib(0.8, 0.8, 300);
        banner = G.spec.modo === 'local' ? '¡GOL!' : propio ? '¡GOL!' : 'Gol rival'; bannerT = 1.4;
        if (e.lado === i) { stats.me++; stats.racha++; stats.mejorRacha = Math.max(stats.mejorRacha, stats.racha); } else { stats.contra++; stats.racha = 0; }
        const m = remoto ? marcadorRed : G.s.marcador;
        stats.deficit = Math.max(stats.deficit, m[1 - i] - m[i]);
        hooks.gol && hooks.gol(e.lado === i, m);
        if (!remoto) {
          guardar();
          if (esHost()) salaGuardada.guardar({ marcador: m.slice(), mesa: G.spec.mesa, disco: G.spec.disco, meta: G.spec.meta });
          if (m[e.lado] >= G.spec.meta) { G.s.espera = 999; fin(e.lado); }
        }
        break;
      }
    }
  }

  /* ---------- red ---------- */
  function enviarEventos(evs) {
    const r = evs.filter((e) => e.t !== 'saque').map((e) => Object.assign({}, e, { x: Math.round(e.x || 0), y: Math.round(e.y || 0), v: Math.round(e.v || 0), nx: undefined, ny: undefined }));
    if (r.length) { const m = G.s.marcador.slice(); Red.difundir('hk_ev', { e: r, m }); }
  }
  G.recibir = function (tipo, d) {
    if (!G.spec) return;
    if (esHost() && tipo === 'hk_in' && G.s && isFinite(d.x) && isFinite(d.y)) F.objetivo(G.s, 1, +d.x, +d.y);
    if (esGuest()) {
      if (tipo === 'hk_s') { ultSnap = d; interp.agregar(d.t, { p: d.p, a: [[d.a[0][0], d.a[0][1]], [d.a[1][0], d.a[1][1]]] }); if (d.m) marcadorRed = d.m; reconciliar(d); }
      else if (tipo === 'hk_ev') { if (d.m) marcadorRed = d.m; cola.push(d); }
      else if (tipo === 'hk_fin') { marcadorRed = d.m; fin(d.g, d.r); }
    }
  };
  function reconciliar(d) {
    const m = local.mallets[1], h = d.a[1];
    m.grande = h[4]; m.lento = h[5]; m.r = m.r0 * (m.grande > 0 ? 1.4 : 1);
    const dx = h[0] - m.x, dy = h[1] - m.y;
    if (Math.hypot(dx, dy) > 140) { m.x += dx * 0.4; m.y += dy * 0.4; }
  }

  /* ---------- bucle ---------- */
  G.tick = function (dt) {
    if (G.fase === 'nada' || !G.s) return null;
    t += dt; if (bannerT > 0) bannerT -= dt;
    const s = G.s, spec = G.spec;
    if (G.pausada || G.fase === 'fin') { entrada.pausa = false; return frame(); }
    if (entrada.pausa) { entrada.pausa = false; hooks.pausa && hooks.pausa(); }
    stats.seg += dt;
    if (esGuest()) return tickGuest(dt);
    entrada.leer(s, dt);
    F.avanzar(s, dt, (pd) => { if (bots[1]) B.decidir(bots[1], s, pd); });
    if (s.ev.length) { const evs = s.ev.splice(0); evs.forEach((e) => manejar(e)); if (esHost()) enviarEventos(evs); }
    if (esHost() && t - tSnap > 0.033) { tSnap = t; const q = F.instantanea(s); q.t = Red.reloj(); Red.difundir('hk_s', q, { fiable: false }); }
    return frame();
  };

  function tickGuest(dt) {
    const m = local.mallets[1];
    entrada.leer(local, dt);
    F.avanzar(local, dt, null);
    tIn += dt; if (tIn > 0.033) { tIn = 0; Red.enviar('hk_in', { x: Math.round(entrada.tg[1].x), y: Math.round(entrada.tg[1].y) }, { a: 0, fiable: false }); }
    while (cola.length) { const c = cola.shift(); c.e.forEach((e) => manejar(e, true)); }
    esperaInicio = Math.max(0, esperaInicio - dt);
    return frame();
  }

  function frame() {
    const s = G.s, spec = G.spec;
    let pucks, mallets, items = s.items, obst = s.obst, marcador = s.marcador, cuenta = '', k = 1;
    if (esGuest()) {
      const o = interp.obtener();
      pucks = o ? o.p.map((p) => ({ x: p[0], y: p[1], vx: p[2], vy: p[3], r: s.C.puckR, extra: p[4] > 0.5, giro: t * 6 })) : [];
      const mi = local.mallets[1], rv = o ? o.a[0] : [s.mallets[0].x, s.mallets[0].y], hs = ultSnap ? ultSnap.a[0] : [0, 0, 0, 0, 0, 0];
      mallets = [{ x: rv[0], y: rv[1], r: s.C.malletR * (hs[4] > 0 ? 1.4 : 1), lado: 0, grande: hs[4], lento: hs[5] }, mi];
      items = ultSnap ? ultSnap.i.map((i) => ({ tipo: i[0], x: i[1], y: i[2], vida: i[3], r: 20 })) : [];
      obst = spec.obst; marcador = marcadorRed;
      pucks.forEach((p) => { const dx = p.x - mi.x, dy = p.y - mi.y, d = Math.hypot(dx, dy), mm = p.r + mi.r; if (d < mm && d > 0) { p.x = mi.x + dx / d * mm; p.y = mi.y + dy / d * mm; } });
      if (esperaInicio > 0.2) { cuenta = String(Math.ceil(esperaInicio - 0.2)); k = (esperaInicio - 0.2) % 1; }
    } else {
      pucks = s.pucks; mallets = s.mallets;
      if (esperaInicio > 0 && s.espera < 900) { if (s.espera > 0.2) { cuenta = String(Math.ceil(s.espera - 0.2)); k = (s.espera - 0.2) % 1; } else if (s.espera > 0) cuenta = '¡YA!'; else esperaInicio = 0; if (s.espera <= 0) esperaInicio = 0; }
    }
    const n = cuenta ? cuenta : '';
    if (n !== '' && n !== String(cuentaN) && n !== '¡YA!') { cuentaN = n; S.cuenta(false); } else if (n === '¡YA!' && !ya) { ya = 1; S.cuenta(true); }
    if (bannerT > 0) { if (!cuenta) { cuenta = banner; k = Math.min(1, bannerT * 2); } }
    return { mesa: mesaT, disco: discoT, obst, items, pucks, mallets, colores, marcador, nombres, girar: esGuest(), rotarArriba: spec.modo === 'local', cuenta, cuentaK: k, fondoPagina: '#04060d' };
  }

  G.info = () => ({ colores, nombres, mesa: mesaT, stats });
  G.marcador = () => (esGuest() ? marcadorRed : G.s ? G.s.marcador : [0, 0]);
  G.redOk = () => !!(Red && Red.conectado);
  return G;
}
