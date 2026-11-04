// =============================================================
//  SIMULACIÓN: todo lo que pasa en la partida, sin dibujar ni leer
//  teclas. Cada nave tiene su propio "ctl" (ver entrada.js), así que
//  añadir un segundo jugador es meter otra nave en Sim.naves.
//  Lo que debe verse/oírse sale por Sim.ev(tipo, ...).
// =============================================================
const Sim = (() => {
  'use strict';
  const W = CONFIG.ancho, H = CONFIG.alto;
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------- Pools
  function Pool(n, mk) { this.a = []; this.n = 0; for (let i = 0; i < n; i++) this.a.push(mk()); }
  Pool.prototype.nuevo = function () { return this.n < this.a.length ? this.a[this.n++] : null; };
  Pool.prototype.quitar = function (i) { const o = this.a[i]; this.a[i] = this.a[--this.n]; this.a[this.n] = o; };
  Pool.prototype.vaciar = function () { this.n = 0; };

  const balas = new Pool(260, () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 3, dmg: 1, vida: 0, tipo: 0, perf: 0, ult: 0, blanco: null, buid: 0, due: 0 }));
  const balasE = new Pool(520, () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 5, tipo: 0, vida: 0, graze: false }));
  const enem = new Pool(72, () => ({ uid: 0, tipo: '', def: null, x: 0, y: 0, vx: 0, vy: 0, r: 10, vida: 1, vidaMax: 1, t: 0, cad: 0, mov: 0, a: 0, b: 0, c: 0, d: 0,
    x0: 0, y0: 0, flash: 0, drop: '', hold: 0, fase: 0, ang: 0, rot: 0, pts: 0, jefe: null, fi: 0, ai: 0, acc: null, accT: 0, accEm: 0, accAng: 0, intro: 0, inv: 0, carga: 0, cT: 0, bx: 0, esc: 1, rvx: 0, rvy: 0 }));
  const pus = new Pool(56, () => ({ x: 0, y: 0, tipo: 'nivel', t: 0, r: 13 }));
  const hazs = new Pool(12, () => ({ x: 0, y: 0, w: 0, h: 0, warn: 0, dur: 0 }));
  const cola = []; for (let i = 0; i < 110; i++) cola.push({ en: 0, tipo: '', x: 0, y: 0, mov: 0, a: 0, b: 0, c: 0, d: 0, vx: 0, vy: 0, hold: 0, drop: '' });
  let nCola = 0, iCola = 0, uidSig = 1;

  const S = { activo: false, balas, balasE, enem, pus, hazs, naves: [], ev: () => {}, est: null };
  let r = Math.random, rO = Math.random;     // r = azar de la partida; rO = oleadas (con semilla en el diario)

  // ---------------------------------------------------------- Equilibrio
  S.calcMods = (m) => ({
    vidas: m.casco | 0, vel: 1 + 0.04 * m.motor, dmg: 1 + 0.08 * m.canon, cad: 1 - 0.04 * m.cadencia,
    reactor: 1 - 0.06 * m.reactor, iman: 1 + 0.25 * m.iman, botin: 1 + 0.1 * m.botin, escudo: m.blindaje | 0,
  });

  function crearNave(i, def, m, color) {
    const dif = S.dif, vidas = S.mod.vidas || (def.vida + m.vidas + dif.vidas);
    return { id: i, def, color, ctl: { ax: 0, ay: 0, dx: 0, dy: 0, fuego: false, hab: false },
      x: W / 2 + (i % 2 ? 70 : -(i ? 70 : 0)), y: H - 140, r: CONFIG.jugador.radio, vel: def.vel * m.vel, vida: Math.min(CONFIG.jugador.vidasMax, vidas), vidaMax: Math.min(CONFIG.jugador.vidasMax, vidas),
      escudo: m.escudo, inv: 2, cad: 0.3, arma: 'pulso', nivel: 1, rapido: 0, iman: 0, habCd: def.habCd * 0.35, habMax: def.habCd, habT: 0,
      dash: 0, dashX: 0, dashY: -1, dirX: 0, dirY: -1, dCad: 0, vivo: true, puntos: 0, racha: 0, rel: 0, mult: 1, monedas: 0, kills: 0,
      dmgMul: m.dmg, cadMul: m.cad, reactor: m.reactor, imanMul: m.iman, botin: m.botin, graze: 0, t: 0, sinDano: true, sinDanoSeq: 0, maxRacha: 0 };
  }

  // ---------------------------------------------------------- Inicio
  // cfg: { modo, mundo, jefe, semilla, dif, naves: [{def, mejoras, color}], mod }
  S.iniciar = function (cfg) {
    const sem = (cfg.semilla || (Math.random() * 4294967296)) >>> 0;
    r = cfg.modo === 'diario' ? Util.rng(sem ^ 0x9e3779b9) : Math.random;
    rO = Util.rng(sem);
    S.modo = cfg.modo; S.cfg = cfg; S.semilla = sem;
    S.dif = DIFICULTADES[cfg.dif] || DIFICULTADES.normal;
    S.mod = cfg.mod || {};
    S.velB = S.dif.vel * (S.mod.velBala || 1);
    S.hpMul = S.dif.hp * (S.mod.hpE || 1);
    S.ptsMul = S.dif.pts * (S.mod.pts || 1);
    S.dropMul = S.dif.drop * (S.mod.puMul || 1);
    S.t = 0; S.puntos = 0; S.lento = 0; S.terminado = false; S.victoria = false;
    S.estado = 'descanso'; S.estT = 1.4; S.oleada = 0; S.idxDif = 0; S.mundo = cfg.mundo || 0; S.etapa = 0;
    S.esJefe = false; S.jefe = null; S.jefeIdx = 0; S.ciclo = 0; S.jefesVencidos = 0; S.dano = false;
    S.mundoIni = S.mundo; S.finT = 0; S.fondoT = 0;
    S.est = { kills: 0, jefes: 0, jefesIds: [], habilidades: 0, rozes: 0, maxRacha: 0, maxMult: 1, disparos: 0, monedas: 0, sinDano: 0, mejorOleada: 0, armasMax: 0, logros: null };
    for (const p of [balas, balasE, enem, pus, hazs]) p.vaciar();
    nCola = iCola = 0;
    S.naves.length = 0;
    cfg.naves.forEach((c, i) => { const n = crearNave(i, c.def, S.calcMods(c.mejoras), c.color); n.x = W * (i + 1) / (cfg.naves.length + 1); S.naves.push(n); });
    S.yo = 0; S.espejo = false;
    if (cfg.modo === 'jefes') { S.jefeIdx = cfg.jefe >= 0 ? cfg.jefe : 0; S.esJefe = true; }
    if (cfg.modo === 'diario') { S.mundo = cfg.mundo | 0; S.mundoIni = S.mundo; }
    S.activo = true;
  };

  const vivas = () => { let n = 0; for (let i = 0; i < S.naves.length; i++) if (S.naves[i].vivo) n++; return n; };
  function objetivo(x, y) {
    let mejor = null, md = 1e12;
    for (let i = 0; i < S.naves.length; i++) { const n = S.naves[i]; if (!n.vivo) continue; const d = (n.x - x) * (n.x - x) + (n.y - y) * (n.y - y); if (d < md) { md = d; mejor = n; } }
    return mejor;
  }

  // ---------------------------------------------------------- Balas enemigas
  function bE(x, y, ang, v, tipo) {
    const b = balasE.nuevo(); if (!b) return null;
    const vv = v * S.velB;
    b.x = x; b.y = y; b.vx = Math.cos(ang) * vv; b.vy = Math.sin(ang) * vv; b.tipo = tipo; b.graze = false; b.vida = 9;
    b.r = tipo === 1 ? 3.5 : tipo === 2 ? 9 : 5.5;
    return b;
  }
  const angA = (x, y, n) => (n ? Math.atan2(n.y - y, n.x - x) : Math.PI / 2);

  // ---------------------------------------------------------- Cola de aparición
  function elegirDrop(tipo) {
    const base = tipo === 'blindado' ? 1 : CONFIG.powerups.probabilidad * S.dropMul;
    if (rO() >= base) return '';
    const lista = [];
    for (const k in POWERUPS) { const p = POWERUPS[k]; if (p.peso > 0 && !(S.mod.sinCura && (k === 'vida' || k === 'escudo'))) lista.push([k, p.peso]); }
    return Util.pesos(rO, lista);
  }
  function enc(en, tipo, x, y, mov, a, b, c, d, vx, vy, hold) {
    if (nCola >= cola.length) return;
    const q = cola[nCola++];
    q.en = en; q.tipo = tipo; q.x = x; q.y = y; q.mov = mov; q.a = a; q.b = b; q.c = c; q.d = d; q.vx = vx; q.vy = vy; q.hold = hold; q.drop = elegirDrop(tipo);
  }

  const PATRONES_ZANGANO = ['linea', 'v', 'columna', 'serpiente', 'lados', 'circulo'];
  function patron(nombre, tipo, n, t, idx) {
    const vy = Math.min(150, 95 + idx * 1.2);
    let i, dur = 2;
    switch (nombre) {
      case 'linea': for (i = 0; i < n; i++) enc(t, tipo, 50 + (W - 100) * (n > 1 ? i / (n - 1) : 0.5), -30, 0, 0, 0, 0, 0, 0, vy, 0); dur = 3; break;
      case 'v': { const cx = rO.azar(130, 350); for (i = 0; i < n; i++) { const k = i - (n - 1) / 2; enc(t + Math.abs(k) * 0.28, tipo, cx + k * 48, -30, 0, 0, 0, 0, 0, 0, vy, 0); } dur = 3; break; }
      case 'columna': { const x = rO.azar(70, 410); for (i = 0; i < n; i++) enc(t + i * 0.42, tipo, x, -30, 0, 0, 0, 0, 0, 0, vy + 15, 0); dur = n * 0.42 + 2; break; }
      case 'serpiente': { const x = rO.azar(150, 330); for (i = 0; i < n; i++) enc(t + i * 0.36, tipo, x, -30, 1, 110, 2.2, 0, 0, 0, 85, 0); dur = n * 0.36 + 3; break; }
      case 'lados': { const dir = rO() < 0.5 ? 1 : -1, y0 = rO.azar(60, 220); for (i = 0; i < n; i++) enc(t + i * 0.38, tipo, dir > 0 ? -30 : W + 30, y0, 2, 50, 2.6, 0, 0, dir * 150, 22, 0); dur = n * 0.38 + 3; break; }
      case 'circulo': { const cx = rO.azar(170, 310), s = rO() < 0.5 ? 1 : -1; for (i = 0; i < n; i++) enc(t, tipo, cx, -80, 3, TAU * i / n, 1.4 * s, 70, 0, 0, 52, 0); dur = 5; break; }
      case 'ancla': for (i = 0; i < n; i++) enc(t + i * 0.5, tipo, 70 + (W - 140) * (i + rO()) / n, -30, 4, 22, 90 + rO() * 170, 1.1 + rO(), 0, 0, 0, 9 + rO() * 4); dur = 4; break;
      case 'kami': for (i = 0; i < n; i++) enc(t + i * 0.55, tipo, rO.azar(50, 430), -30, 5, 50 + rO() * 90, 0, 0, 0, 0, 0, 0); dur = n * 0.55 + 2; break;
      case 'minas': for (i = 0; i < n; i++) enc(t + i * 0.7, tipo, rO.azar(50, 430), -30, 6, 0, 0, 0, 0, rO.azar(-18, 18), 42 + idx * 0.8, 0); dur = n * 0.7 + 1.5; break;
      case 'rocas': for (i = 0; i < n; i++) enc(t + i * 0.35, tipo, rO.azar(30, 450), -40, 6, 0.8 + rO() * 0.9, 0, rO.azar(-2, 2), 0, rO.azar(-45, 45), 100 + rO() * 60 + idx, 0); dur = n * 0.35 + 2; break;
    }
    return dur;
  }

  function generarOleada(idx, mundo, etapa) {
    nCola = iCola = 0;
    const M = MUNDOS[mundo];
    let pres = Math.min(60, (5 + idx * 1.35) * (S.mod.masE || 1) * (1 + 0.35 * (S.naves.length - 1)));
    const pool = M.pool.filter((p) => p[2] <= etapa || idx >= 10).map((p) => [p[0], p[1]]);
    let t = 0.8;
    while (pres > 0 && nCola < cola.length - 16 && t < 26) {
      const tipo = Util.pesos(rO, pool), def = ENEMIGOS[tipo];
      let nombre, n;
      if (tipo === 'zangano') { nombre = rO.elegir(PATRONES_ZANGANO); n = nombre === 'circulo' ? rO.ent(5, 8) : rO.ent(3, 5 + (idx > 8 ? 2 : 0)); }
      else if (tipo === 'kamikaze') { nombre = 'kami'; n = rO.ent(2, 3 + Math.min(3, idx >> 2)); }
      else if (tipo === 'mina') { nombre = 'minas'; n = rO.ent(2, 4); }
      else if (tipo === 'asteroide') { nombre = 'rocas'; n = rO.ent(3, 6); }
      else { nombre = 'ancla'; n = rO.ent(1, tipo === 'blindado' ? 2 : 3); }
      pres -= n * def.costo;
      t += patron(nombre, tipo, n, t, idx) * 0.8 + rO.azar(0.5, 1.6);
    }
  }

  function aparecer(tipo, x, y, mov, a, b, c, d, vx, vy, hold, drop, idx) {
    const e = enem.nuevo(); if (!e) return null;
    const def = ENEMIGOS[tipo], esc = tipo === 'asteroide' ? Math.max(0.6, a) : 1;
    e.uid = uidSig++; e.tipo = tipo; e.def = def; e.x = x; e.y = y; e.x0 = x; e.y0 = y; e.vx = vx; e.vy = vy; e.mov = mov; e.a = a; e.b = b; e.c = c; e.d = d;
    e.r = def.r * esc; e.esc = esc;
    const escHp = 1 + (idx || S.idxDif) * 0.04;
    e.vida = e.vidaMax = Math.max(1, def.vida * esc * S.hpMul * escHp * (1 + 0.5 * (S.naves.length - 1)));
    e.t = 0; e.cad = 0.6 + Math.random() * 1.2; e.flash = 0; e.drop = drop || ''; e.hold = hold || 0; e.fase = 0; e.ang = 0; e.rot = Math.random() * TAU;
    e.pts = def.pts; e.jefe = null; e.inv = 0; e.carga = 0; e.intro = 0; e.acc = null;
    return e;
  }

  function aparecerJefe(id, esc) {
    const J = JEFES[id % JEFES.length];
    const e = aparecer('blindado', W / 2, -90, 8, 0, 0, 0, 0, 0, 0, 0, '', 0);
    if (!e) return;
    e.tipo = 'jefe'; e.jefe = J; e.def = { vida: J.vida, r: J.r, pts: J.pts, costo: 0 };
    e.r = J.r; e.pts = J.pts;
    e.vida = e.vidaMax = J.vida * esc * S.hpMul * (1 + 0.55 * (S.naves.length - 1));
    e.intro = 2.6; e.fi = 0; e.ai = 0; e.cd = 2; e.carga = 0; e.bx = W / 2; e.inv = 0;
    S.jefe = e;
    S.ev('jefe', J.nombre, id);
  }

  // ---------------------------------------------------------- Oleadas
  function siguienteOleada() {
    const modo = S.modo, E = CONFIG.oleadas.etapasPorMundo;
    S.oleada++;
    let idx, mundo, etapa, jefe = false, nuevoMundo = false;
    if (modo === 'campana') {
      const k = S.oleada - 1; mundo = S.mundoIni + Math.floor(k / E); etapa = k % E; idx = mundo * E + etapa; jefe = etapa === E - 1;
    } else if (modo === 'infinito') {
      const k = S.oleada - 1; mundo = Math.floor(k / E) % 6; etapa = k % E; idx = k; jefe = etapa === E - 1;
      S.ciclo = Math.floor(k / (E * 6));
    } else if (modo === 'jefes') {
      jefe = true; mundo = (S.jefeIdx % 6); etapa = E - 1; idx = (S.jefeIdx % 6) * E + 4 + S.ciclo * 6;
    } else { // diario
      const k = S.oleada - 1; mundo = (S.mundoIni + (k >= E ? 1 : 0)) % 6; etapa = k % E; idx = k + 2; jefe = etapa === E - 1;
    }
    if (mundo !== S.mundo || S.oleada === 1) nuevoMundo = true;
    S.mundo = mundo; S.etapa = etapa; S.idxDif = idx; S.esJefe = jefe; S.dano = false;
    if (modo === 'jefes') for (const n of S.naves) if (n.vivo && n.nivel < 3) n.nivel = 3;
    if (S.oleada > S.est.mejorOleada) S.est.mejorOleada = S.oleada;
    if (jefe) {
      nCola = iCola = 0;
      const id = modo === 'jefes' ? S.jefeIdx : (modo === 'infinito' ? Math.floor((S.oleada / E - 1)) % 6 : MUNDOS[mundo].jefe);
      S.jefeIdx = id;
      aparecerJefe(id, 1 + 0.3 * S.ciclo + (modo === 'jefes' ? 0.12 * S.ciclo : 0));
    } else generarOleada(idx, mundo, etapa);
    S.estado = 'oleada';
    S.ev('oleada', S.oleada, jefe, mundo, nuevoMundo, etapa);
  }

  function finOleada() {
    // oleada superada
    let sinDano = !S.dano;
    for (const n of S.naves) { if (sinDano) n.sinDanoSeq++; else n.sinDanoSeq = 0; if (n.sinDanoSeq > S.est.sinDano) S.est.sinDano = n.sinDanoSeq; }
    if (sinDano) for (const n of S.naves) if (n.vivo) { sumarPuntos(n, 500); S.ev('texto', n.x, n.y - 30, 500, '#7dffb3'); }
    for (const n of S.naves) if (!n.vivo && !n.retirada) reanimar(n);
    S.ev('oleadaLista', S.oleada, sinDano);
    S.estado = 'descanso'; S.estT = CONFIG.oleadas.descanso + (S.esJefe ? 1.4 : 0);
    // Fin de partida por modos con meta
    const E = CONFIG.oleadas.etapasPorMundo;
    if (S.esJefe) {
      if (S.modo === 'campana') {
        S.ev('mundoCompleto', S.mundo);
        if (S.mundo >= 5) return terminar(true);
      } else if (S.modo === 'jefes') {
        S.jefeIdx++; if (S.cfg.jefe >= 0 || S.jefeIdx >= 6) return terminar(true);
      } else if (S.modo === 'diario' && S.oleada >= E * 2) return terminar(true);
    }
  }
  function terminar(victoria) {
    if (S.finT > 0) return;
    S.finT = victoria ? 2.6 : 1.8; S.victoria = victoria; S.estado = victoria ? 'victoria' : 'muerto';
    if (victoria) S.ev('victoria');
  }

  // ---------------------------------------------------------- Daño
  function danar(n) {
    if (!n.vivo || n.inv > 0 || n.dash > 0 || (n.habT > 0 && n.def.hab === 'escudo')) return false;
    S.dano = true; n.sinDano = false; n.racha = 0; n.rel = 0; n.mult = 1;
    if (n.escudo > 0) { n.escudo--; n.inv = 1.0; S.ev('escudoRoto', n); return true; }
    n.vida--; n.nivel = Math.max(1, n.nivel - 1); n.inv = CONFIG.jugador.invulnerable;
    if (n.vida <= 0) { n.vivo = false; S.ev('muerteNave', n); if (!vivas()) terminar(false); }
    else S.ev('dano', n);
    return true;
  }

  function reanimar(n) {
    n.vivo = true; n.vida = Math.min(2, n.vidaMax); n.inv = 3; n.reviv = 0; n.nivel = Math.max(1, n.nivel - 1);
    S.ev('revive', n.nombre || 'Jugador', n);
  }
  function sumarPuntos(n, base) {
    const p = Math.round(base * n.mult * S.ptsMul);
    n.puntos += p; S.puntos += p; return p;
  }
  function crearPU(x, y, tipo) {
    const p = pus.nuevo(); if (!p) return;
    p.x = x; p.y = y; p.tipo = tipo; p.t = 0; p.r = tipo === 'moneda' ? 9 : 13;
  }

  function matar(e, n) {
    const grande = e.r > 30;
    if (n) {
      const p = sumarPuntos(n, e.pts);
      n.racha++; n.rel = CONFIG.combo.ventana; n.kills++; n.habCd -= 0.12;
      const m = Math.min(CONFIG.combo.maximo, 1 + Math.floor(n.racha / CONFIG.combo.porNivel));
      if (m > n.mult) S.ev('multi', n, m);
      n.mult = m;
      if (n.racha > n.maxRacha) n.maxRacha = n.racha;
      if (m > S.est.maxMult) S.est.maxMult = m;
      if (n.racha > S.est.maxRacha) S.est.maxRacha = n.racha;
      if (p >= 200) S.ev('texto', e.x, e.y - 10, p, n.mult > 1 ? '#ffd23d' : '#ffffff');
    }
    S.est.kills++;
    S.ev('explosion', e.x, e.y, e.tipo, e.r, grande);
    if (e.drop) crearPU(e.x, e.y, e.drop);
    if (e.tipo !== 'asteroide' && e.tipo !== 'jefe' && Math.random() < 0.28 * S.dropMul) crearPU(e.x + 8, e.y, 'moneda');
    if (e.tipo === 'mina') for (let i = 0; i < 8; i++) bE(e.x, e.y, i * TAU / 8 + e.rot, 140, 0);
    if (e.jefe) {
      S.est.jefes++; if (S.est.jefesIds.indexOf(e.jefe.id) < 0) S.est.jefesIds.push(e.jefe.id);
      S.jefe = null;
      for (let i = balasE.n - 1; i >= 0; i--) { S.ev('chispa', balasE.a[i].x, balasE.a[i].y); balasE.quitar(i); }
      for (let i = 0; i < 26; i++) crearPU(e.x + Util.azar(-60, 60), e.y + Util.azar(-40, 40), 'moneda');
      if (!e.drop) crearPU(e.x, e.y, Math.random() < 0.5 ? 'vida' : 'nivel');
      S.ev('jefeMuerto', e.jefe, e.x, e.y);
      S.ev('sacudir', 14);
    } else S.ev('sacudir', grande ? 6 : 1.2);
    e.vida = 0;
  }

  function golpear(e, dmg, n) {
    if (e.inv > 0 || e.intro > 0) return;
    e.vida -= dmg; e.flash = 0.07;
    if (e.vida <= 0 && e.uid) { e.uid = 0; matar(e, n); }
  }

  // ---------------------------------------------------------- Armas
  const P_PULSO = [
    [[0, 0]], [[-7, 0], [7, 0]], [[0, 0], [-12, -0.07], [12, 0.07]], [[-6, 0], [6, 0], [-16, -0.1], [16, 0.1]], [[0, 0], [-9, 0], [9, 0], [-20, -0.14], [20, 0.14]],
  ];
  function bala(x, y, ang, v, dmg, tipo, vida, perf, rad, n) {
    const b = balas.nuevo(); if (!b) return null;
    b.x = x; b.y = y; b.vx = Math.sin(ang) * v; b.vy = -Math.cos(ang) * v; b.dmg = dmg; b.tipo = tipo; b.vida = vida; b.perf = perf; b.r = rad; b.ult = 0; b.blanco = null; b.buid = 0; b.due = n.id;
    return b;
  }
  function disparar(n) {
    const nv = n.nivel - 1, d = n.dmgMul * n.def.dmg;
    let cad = n.def.cad * n.cadMul * (n.rapido > 0 ? 0.62 : 1);
    S.est.disparos++;
    switch (n.arma) {
      case 'pulso': { const p = P_PULSO[nv]; for (let i = 0; i < p.length; i++) bala(n.x + p[i][0], n.y - 14, p[i][1], 900, d, 0, 1.2, 0, 3.5, n); S.ev('disparo', n, 0); break; }
      case 'disp': { const c = nv + 3, ab = 0.45 + nv * 0.07; for (let i = 0; i < c; i++) bala(n.x, n.y - 12, (i / (c - 1) - 0.5) * 2 * ab, 820, d * 0.78, 1, 0.52, 0, 3.5, n); cad *= 1.35; S.ev('disparo', n, 1); break; }
      case 'laser': { const c = nv < 2 ? 1 : nv < 4 ? 2 : 3; for (let i = 0; i < c; i++) bala(n.x + (i - (c - 1) / 2) * 13, n.y - 16, 0, 1500, d * 1.35, 2, 1, nv >= 3 ? 99 : 3, 3, n); cad *= 0.85; S.ev('disparo', n, 2); break; }
      case 'misil': { const c = [1, 2, 2, 3, 4][nv]; for (let i = 0; i < c; i++) bala(n.x + (i - (c - 1) / 2) * 16, n.y - 10, (i - (c - 1) / 2) * 0.16, 460, d * 3.4, 3, 2.2, 0, 5, n); cad *= 2.0; S.ev('disparo', n, 3); break; }
    }
    n.cad = cad;
  }

  function usarHab(n) {
    const def = n.def;
    switch (def.hab) {
      case 'dash': { let x = n.ctl.ax, y = n.ctl.ay; const m = Math.hypot(x, y); if (m > 0.2) { x /= m; y /= m; n.dirX = x; n.dirY = y; } else { x = n.dirX; y = n.dirY; } n.dashX = x; n.dashY = y; n.dash = 0.22; n.inv = Math.max(n.inv, 0.55); S.ev('hab', n, 'dash'); break; }
      case 'escudo': n.habT = 4; S.ev('hab', n, 'escudo'); break;
      case 'bomba':
        for (let i = enem.n - 1; i >= 0; i--) { const e = enem.a[i]; if (e.y > -20) golpear(e, e.jefe ? 38 : 40 * n.dmgMul, n); }
        for (let i = balasE.n - 1; i >= 0; i--) { S.ev('chispa', balasE.a[i].x, balasE.a[i].y); balasE.quitar(i); }
        n.inv = Math.max(n.inv, 0.6); S.ev('hab', n, 'bomba'); S.ev('sacudir', 12); break;
      case 'rayo': n.habT = 1.6; S.ev('hab', n, 'rayo'); break;
      case 'drones': n.habT = 9; n.dCad = 0; S.ev('hab', n, 'drones'); break;
    }
    n.habMax = def.habCd * n.reactor; n.habCd = n.habMax; S.est.habilidades++;
  }

  // ---------------------------------------------------------- Jefes
  function pilar(x, w) { const h = hazs.nuevo(); if (h) { h.x = x - w / 2; h.y = 0; h.w = w; h.h = H; h.warn = 1.1; h.dur = 0.55; } }
  function franja(x, w, y) { const h = hazs.nuevo(); if (h) { h.x = x; h.y = y; h.w = w; h.h = 42; h.warn = 1.2; h.dur = 0.6; } }

  function ejecutar(e, a) {
    const t = objetivo(e.x, e.y), base = angA(e.x, e.y, t);
    switch (a.id) {
      case 'anillo': { const o = Math.random() * TAU; for (let i = 0; i < a.n; i++) bE(e.x, e.y + 10, o + i * TAU / a.n, a.v, i % 2 ? 0 : 2); S.ev('sdisparo'); break; }
      case 'abanico': for (let i = 0; i < a.n; i++) bE(e.x, e.y + 20, base + (a.n > 1 ? (i / (a.n - 1) - 0.5) * a.spread : 0), a.v, 0); S.ev('sdisparo'); break;
      case 'rafaga': for (let i = -1; i <= 1; i++) bE(e.x, e.y + 20, base + i * 0.07, a.v, 1); S.ev('sdisparo'); break;
      case 'espiral': for (let i = 0; i < a.brazos; i++) bE(e.x, e.y + 10, e.accAng + i * TAU / a.brazos, a.v, 0); e.accAng += a.giro * a.rate; S.ev('sdisparo'); break;
      case 'lluvia': bE(Util.azar(20, W - 20), -10, Math.PI / 2 + Util.azar(-0.15, 0.15), a.v, Math.random() < 0.3 ? 2 : 0); break;
      case 'pilares': { if (t) pilar(t.x, 58); for (let i = 1; i < a.n; i++) pilar(Util.azar(30, W - 30), 58); S.ev('aviso'); break; }
      case 'franjas': for (let i = 0; i < a.n; i++) { const izq = Math.random() < 0.5; franja(izq ? 0 : 200, 280, 230 + i * 120 + Util.azar(-20, 20)); } S.ev('aviso'); break;
      case 'minions': for (let i = 0; i < a.n; i++) {
        const lado = i % 2 ? 1 : -1;
        if (a.tipo === 'kamikaze') aparecer('kamikaze', e.x + lado * 60, e.y, 5, e.y + 30, 0, 0, 0, 0, 0, 0, '', S.idxDif);
        else if (a.tipo === 'asteroide') aparecer('asteroide', Util.azar(40, W - 40), -30, 6, 1 + Math.random() * 0.6, 0, Util.azar(-2, 2), 0, Util.azar(-30, 30), 130, 0, '', S.idxDif);
        else aparecer(a.tipo, W / 2 + lado * (80 + 90 * (i >> 1)), -30, 4, 22, 200 + 40 * (i >> 1), 1.3, 0, 0, 0, 10, '', S.idxDif);
      } break;
      case 'minas': for (let i = 0; i < a.n; i++) aparecer('mina', e.x + (i - (a.n - 1) / 2) * 60, e.y + 30, 6, 0, 0, 0, 0, (i - (a.n - 1) / 2) * 25, 60, 0, '', S.idxDif); break;
      case 'carga': e.carga = 1; e.cT = 0.9; S.ev('aviso'); break;
    }
  }

  function actualizarJefe(e, dt) {
    const J = e.jefe;
    if (e.intro > 0) { e.intro -= dt; e.y += (190 - e.y) * Math.min(1, 2.2 * dt); e.flash = 0; return; }
    e.inv = Math.max(0, e.inv - dt);
    const frac = e.vida / e.vidaMax;
    while (e.fi + 1 < J.fases.length && frac <= J.fases[e.fi + 1].hp) {
      e.fi++; e.inv = 1.2; e.cd = 1.4; e.acc = null; e.carga = 0;
      for (let i = balasE.n - 1; i >= 0; i--) { S.ev('chispa', balasE.a[i].x, balasE.a[i].y); balasE.quitar(i); }
      S.ev('fase', e.fi + 1, J.fases.length); S.ev('sacudir', 9);
    }
    const f = J.fases[e.fi], tg = objetivo(e.x, e.y);
    if (e.carga === 0) {
      e.bx = W / 2 + Math.sin(e.t * 0.62 * f.mov) * (W / 2 - 92);
      e.x += (e.bx - e.x) * Math.min(1, 3 * dt);
      e.y += (190 + Math.sin(e.t * 1.3) * 12 - e.y) * Math.min(1, 3 * dt);
    } else if (e.carga === 1) { e.cT -= dt; e.flash = 0.05; if (tg) e.x += (tg.x - e.x) * Math.min(1, 2 * dt); if (e.cT <= 0) { e.carga = 2; e.cT = 0; } }
    else if (e.carga === 2) { e.y += 880 * dt; e.cT += dt; if (e.y > H - 210 || e.cT > 0.7) e.carga = 3; }
    else { e.y -= 300 * dt; if (e.y <= 190) { e.y = 190; e.carga = 0; e.cd = f.cd; } }
    if (e.carga !== 0) return;
    if (e.acc) {
      e.accT -= dt; e.accEm -= dt;
      while (e.accEm <= 0 && e.accT > 0) { ejecutar(e, e.acc); e.accEm += e.acc.rate; }
      if (e.accT <= 0) { e.acc = null; e.cd = f.cd; }
    } else {
      e.cd -= dt;
      if (e.cd <= 0 && tg) {
        const a = f.at[e.ai++ % f.at.length];
        if (a.dur) { e.acc = a; e.accT = a.dur; e.accEm = 0; e.accAng = Math.random() * TAU; }
        else { ejecutar(e, a); if (e.carga === 0) e.cd = f.cd; }
      }
    }
  }

  // ---------------------------------------------------------- Enemigos
  function mover(e, dt) {
    const t = e.t;
    switch (e.mov) {
      case 0: e.x += e.vx * dt; e.y += e.vy * dt; break;
      case 1: e.x = e.x0 + e.a * Math.sin(e.b * t + e.c); e.y += e.vy * dt; break;
      case 2: e.x += e.vx * dt; e.y = e.y0 + e.vy * t + e.a * Math.sin(e.b * t); break;
      case 3: { const cx = e.x0 + e.vx * t, cy = e.y0 + e.vy * t, ang = e.a + e.b * t; e.x = cx + e.c * Math.cos(ang); e.y = cy + e.c * Math.sin(ang) * 0.7; break; }
      case 4:
        e.y += (e.b - e.y) * Math.min(1, 2.4 * dt); e.x = e.x0 + e.a * Math.sin(t * e.c);
        if (t > e.hold) e.mov = 7;
        break;
      case 5:
        if (e.fase === 0) {
          e.y += (e.a - e.y) * Math.min(1, 3 * dt);
          if (t > 1.15) { const n = objetivo(e.x, e.y); e.ang = angA(e.x, e.y, n); e.fase = 1; e.d = 190; }
        } else { e.d = Math.min(520, e.d + 380 * dt); e.x += Math.cos(e.ang) * e.d * dt; e.y += Math.sin(e.ang) * e.d * dt; }
        break;
      case 6: e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.c * dt; break;
      case 7: e.y -= 190 * dt; break;
    }
  }

  function actualizarEnemigo(e, dt) {
    e.t += dt; e.flash = Math.max(0, e.flash - dt);
    if (e.jefe) { actualizarJefe(e, dt); return; }
    mover(e, dt);
    const n = objetivo(e.x, e.y);
    switch (e.tipo) {
      case 'tirador':
        e.cad -= dt;
        if (e.cad <= 0 && e.y > 20 && e.y < H * 0.75 && n) { bE(e.x, e.y + 10, angA(e.x, e.y, n), 250, 0); e.cad = Math.max(0.9, 1.7 - S.idxDif * 0.015); S.ev('sdisparo'); }
        break;
      case 'blindado':
        e.cad -= dt;
        if (e.cad <= 0 && e.y > 20 && n) { const k = e.vida < e.vidaMax * 0.5 ? 5 : 3, b = angA(e.x, e.y, n); for (let i = 0; i < k; i++) bE(e.x, e.y + 14, b + (i - (k - 1) / 2) * 0.24, 215, 0); e.cad = 2.3; S.ev('sdisparo'); }
        break;
      case 'tejedor':
        e.cad -= dt;
        if (e.fase === 0 && e.cad <= 0) { e.fase = 1; e.d = 2.1; e.cad = 0; }
        if (e.fase === 1) { e.d -= dt; if (e.cad <= 0 && e.y > 20) { e.rot += 0.5; bE(e.x, e.y, e.rot, 175, 0); bE(e.x, e.y, e.rot + Math.PI, 175, 0); e.cad = 0.11; } if (e.d <= 0) { e.fase = 0; e.cad = 1.8; } }
        break;
      case 'franco':
        e.cad -= dt;
        if (e.fase === 0 && e.cad <= 0 && e.y > 30 && n) { e.fase = 1; e.d = 1.15; S.ev('carga'); }
        else if (e.fase === 1) {
          e.d -= dt; if (e.d > 0.28 && n) e.ang = angA(e.x, e.y, n);
          if (e.d <= 0) { bE(e.x, e.y + 10, e.ang, 640, 1); e.fase = 0; e.cad = 2.4; S.ev('sdisparo'); }
        }
        break;
      case 'mina':
        e.rot += dt;
        if (e.t > 8 && e.uid) { e.uid = 0; e.vida = 0; matar(e, null); }
        break;
      case 'asteroide': break;
    }
  }

  // ---------------------------------------------------------- Actualizar
  function moverNave(n, dt) {
    const c = n.ctl;
    let vx = c.ax * n.vel, vy = c.ay * n.vel;
    if (n.habT > 0 && n.def.hab === 'rayo') { vx *= 0.6; vy *= 0.6; }
    if (n.dash > 0) { n.dash -= dt; vx = n.dashX * 1150; vy = n.dashY * 1150; }
    n.x = Util.limitar(n.x + vx * dt + c.dx, 18, W - 18);
    n.y = Util.limitar(n.y + vy * dt + c.dy, 60, H - 24);
    c.dx = c.dy = 0;
    const m = Math.hypot(c.ax, c.ay); if (m > 0.2) { n.dirX = c.ax / m; n.dirY = c.ay / m; }
  }
  // Cliente de multijugador: sólo mueve su propia nave (el resto lo manda el anfitrión)
  S.moverLocal = function (n, dt) {
    n.t += dt;
    if (!n.vivo) { n.ctl.dx = n.ctl.dy = 0; return; }
    n.inv = Math.max(0, n.inv - dt); n.habCd = Math.max(0, n.habCd - dt); if (n.habT > 0) n.habT -= dt;
    moverNave(n, dt);
  };
  S.dashLocal = function (n) {
    let x = n.ctl.ax, y = n.ctl.ay; const m = Math.hypot(x, y);
    if (m > 0.2) { x /= m; y /= m; n.dirX = x; n.dirY = y; } else { x = n.dirX; y = n.dirY; }
    n.dashX = x; n.dashY = y; n.dash = 0.22;
  };
  S.retirar = function (pid) {
    for (const n of S.naves) if (n.pid === pid) { n.vivo = false; n.retirada = true; }
    if (S.activo && !S.espejo && !vivas()) terminar(false);
  };

  function actualizarNave(n, dt) {
    const c = n.ctl;
    n.t += dt;
    if (!n.vivo) {
      c.dx = c.dy = 0; c.hab = false;
      if (!n.retirada) {
        let cerca = false;
        for (const m of S.naves) if (m.vivo && Math.hypot(m.x - n.x, m.y - n.y) < 56) { cerca = true; break; }
        n.reviv = Math.max(0, (n.reviv || 0) + (cerca ? dt : -dt * 0.5));
        if (n.reviv > 2.5) reanimar(n);
      }
      return;
    }
    n.inv = Math.max(0, n.inv - dt); n.rapido = Math.max(0, n.rapido - dt); n.iman = Math.max(0, n.iman - dt);
    n.habCd = Math.max(0, n.habCd - dt);
    if (n.habT > 0) n.habT -= dt;
    if (n.rel > 0) { n.rel -= dt; if (n.rel <= 0) { n.racha = 0; n.mult = 1; } }
    if (n.remota) { // la posición la manda su dueño
      if (n.dash > 0) n.dash -= dt;
      const k = Math.min(1, 18 * dt); n.x += (n.tx - n.x) * k; n.y += (n.ty - n.y) * k;
    } else moverNave(n, dt);
    n.cad -= dt;
    if (c.fuego && n.cad <= 0 && !(n.habT > 0 && n.def.hab === 'rayo')) disparar(n);
    if (c.hab) { c.hab = false; if (n.habCd <= 0 && n.dash <= 0) usarHab(n); }
    // efectos continuos de habilidades
    if (n.habT > 0) {
      if (n.def.hab === 'rayo') {
        for (let i = enem.n - 1; i >= 0; i--) { const e = enem.a[i]; if (e.y < n.y && Math.abs(e.x - n.x) < 22 + e.r) golpear(e, (e.jefe ? 42 : 70) * dt * n.dmgMul, n); }
        for (let i = balasE.n - 1; i >= 0; i--) { const b = balasE.a[i]; if (b.y < n.y && Math.abs(b.x - n.x) < 26) { S.ev('chispa', b.x, b.y); balasE.quitar(i); } }
      } else if (n.def.hab === 'escudo') {
        for (let i = balasE.n - 1; i >= 0; i--) { const b = balasE.a[i], dx = b.x - n.x, dy = b.y - n.y; if (dx * dx + dy * dy < 56 * 56) { S.ev('chispa', b.x, b.y); balasE.quitar(i); } }
      } else if (n.def.hab === 'drones') {
        n.dCad -= dt;
        if (n.dCad <= 0) {
          n.dCad = 0.3;
          for (let i = 0; i < 3; i++) { const a = n.t * 3 + i * TAU / 3; bala(n.x + Math.cos(a) * 46, n.y + Math.sin(a) * 46, 0, 900, 0.8 * n.dmgMul, 4, 1.1, 0, 3, n); }
        }
      }
    }
  }

  S.actualizar = function (dt) {
    if (!S.activo) return;
    S.t += dt; S.fondoT += dt;
    S.lento = Math.max(0, S.lento - dt);
    const dtE = S.lento > 0 ? dt * 0.5 : dt;
    for (let i = 0; i < S.naves.length; i++) actualizarNave(S.naves[i], dt);

    // balas del jugador
    for (let i = balas.n - 1; i >= 0; i--) {
      const b = balas.a[i];
      if (b.tipo === 3) { // misil: busca blanco
        if (!b.blanco || b.blanco.uid !== b.buid) {
          b.blanco = null; let md = 1e12;
          for (let k = 0; k < enem.n; k++) { const e = enem.a[k]; if (e.y < 0 || e.intro > 0) continue; const d = (e.x - b.x) * (e.x - b.x) + (e.y - b.y) * (e.y - b.y); if (d < md) { md = d; b.blanco = e; b.buid = e.uid; } }
        }
        let sp = Math.hypot(b.vx, b.vy); sp = Math.min(900, sp + 700 * dt);
        let ang = Math.atan2(b.vy, b.vx);
        if (b.blanco) { const want = Math.atan2(b.blanco.y - b.y, b.blanco.x - b.x); let da = want - ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; ang += Util.limitar(da, -5 * dt, 5 * dt); }
        b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.vida -= dt;
      if (b.vida <= 0 || b.y < -30 || b.y > H + 30 || b.x < -30 || b.x > W + 30) { balas.quitar(i); continue; }
      // choque con enemigos
      for (let k = 0; k < enem.n; k++) {
        const e = enem.a[k];
        if (e.uid === b.ult || e.y < -10 && !e.jefe) continue;
        const dx = e.x - b.x, dy = e.y - b.y, rr = e.r + b.r;
        if (dx * dx + dy * dy < rr * rr) {
          const n = S.naves[b.due] || S.naves[0];
          if (b.tipo === 3) { S.ev('explosion', b.x, b.y, 'misil', 14, false); for (let j = 0; j < enem.n; j++) { const o = enem.a[j]; if (o !== e && (o.x - b.x) * (o.x - b.x) + (o.y - b.y) * (o.y - b.y) < 60 * 60) golpear(o, b.dmg * 0.5, n); } }
          else S.ev('golpe', b.x, b.y);
          golpear(e, b.dmg, n);
          if (b.perf > 0) { b.perf--; b.ult = e.uid; } else { balas.quitar(i); }
          break;
        }
      }
    }

    // aparición desde la cola
    if (S.estado === 'oleada') {
      const te = S.t - S.tOle;
      while (iCola < nCola && cola[iCola].en <= te) { const q = cola[iCola++]; aparecer(q.tipo, q.x, q.y, q.mov, q.a, q.b, q.c, q.d, q.vx, q.vy, q.hold, q.drop, S.idxDif); }
    }

    for (let i = enem.n - 1; i >= 0; i--) {
      const e = enem.a[i];
      const dte = e.jefe ? dt : dtE, px = e.x, py = e.y;
      actualizarEnemigo(e, dte);
      if (dte > 0) { e.rvx = (e.x - px) / dte; e.rvy = (e.y - py) / dte; }
      if (e.uid === 0) { enem.quitar(i); continue; }
      if (e.y > H + 70 || e.x < -100 || e.x > W + 100 || (e.mov === 7 && e.y < -60)) { enem.quitar(i); continue; }
      // choque con naves
      for (let k = 0; k < S.naves.length; k++) {
        const n = S.naves[k]; if (!n.vivo) continue;
        const dx = e.x - n.x, dy = e.y - n.y, rr = e.r + n.r - 2;
        if (dx * dx + dy * dy < rr * rr && e.y > 0) {
          const dash = n.dash > 0;
          if (dash && !e.jefe) { golpear(e, 6, n); continue; }
          if (danar(n)) { if (!e.jefe) golpear(e, 6, n); }
        }
      }
      if (e.uid === 0) enem.quitar(i);
    }

    // balas enemigas
    for (let i = balasE.n - 1; i >= 0; i--) {
      const b = balasE.a[i];
      const k = S.lento > 0 ? 0.5 : 1;
      b.x += b.vx * dt * k; b.y += b.vy * dt * k; b.vida -= dt;
      if (b.vida <= 0 || b.y > H + 30 || b.y < -40 || b.x < -30 || b.x > W + 30) { balasE.quitar(i); continue; }
      for (let j = 0; j < S.naves.length; j++) {
        const n = S.naves[j]; if (!n.vivo) continue;
        const dx = b.x - n.x, dy = b.y - n.y, d2 = dx * dx + dy * dy, rr = b.r + n.r - 3;
        if (d2 < rr * rr) { if (danar(n)) { balasE.quitar(i); break; } }
        else if (!b.graze && n.inv <= 0 && d2 < (b.r + n.r + 13) * (b.r + n.r + 13)) {
          b.graze = true; n.graze++; S.est.rozes++;
          const p = sumarPuntos(n, 15); n.racha += 0.34; n.rel = CONFIG.combo.ventana; n.habCd -= 0.05;
          S.ev('graze', n, p);
        }
      }
    }

    // peligros (haces)
    for (let i = hazs.n - 1; i >= 0; i--) {
      const h = hazs.a[i];
      if (h.warn > 0) h.warn -= dt; else h.dur -= dt;
      if (h.dur <= 0) { hazs.quitar(i); continue; }
      if (h.warn <= 0) for (let j = 0; j < S.naves.length; j++) {
        const n = S.naves[j]; if (!n.vivo) continue;
        if (n.x + n.r > h.x && n.x - n.r < h.x + h.w && n.y + n.r > h.y && n.y - n.r < h.y + h.h) danar(n);
      }
    }

    // power-ups y monedas
    for (let i = pus.n - 1; i >= 0; i--) {
      const p = pus.a[i];
      p.t += dt; p.y += 85 * dt;
      let tomado = false;
      for (let j = 0; j < S.naves.length && !tomado; j++) {
        const n = S.naves[j]; if (!n.vivo) continue;
        const dx = n.x - p.x, dy = n.y - p.y, d = Math.hypot(dx, dy), im = CONFIG.powerups.iman * n.imanMul * (n.iman > 0 ? 2.8 : 1);
        if (d < im && d > 1) { const v = 460 * dt; p.x += dx / d * v; p.y += dy / d * v; }
        if (d < p.r + n.r + 8) { recoger(n, p); tomado = true; }
      }
      if (tomado || p.y > H + 30) pus.quitar(i);
    }

    // combo/estado
    S.est.maxMult = Math.max(S.est.maxMult, 1);
    if (S.finT > 0) { S.finT -= dt; if (S.finT <= 0) { S.terminado = true; S.activo = false; } return; }
    if (S.estado === 'descanso') { S.estT -= dt; if (S.estT <= 0) { S.tOle = S.t; siguienteOleada(); } }
    else if (S.estado === 'oleada') {
      let quedan = iCola < nCola;
      if (!quedan) for (let i = 0; i < enem.n; i++) if (enem.a[i].y > -80 || enem.a[i].jefe) { quedan = true; break; }
      if (!quedan && S.t - S.tOle > 1) finOleada();
    }
  };

  function recoger(n, p) {
    const t = p.tipo;
    switch (t) {
      case 'moneda': n.monedas++; S.est.monedas++; S.ev('moneda', n); return;
      case 'nivel': if (n.nivel < 5) n.nivel++; else sumarPuntos(n, 500); break;
      case 'disp': case 'laser': case 'misil': if (n.arma === t) { if (n.nivel < 5) n.nivel++; else sumarPuntos(n, 500); } else n.arma = t; break;
      case 'rapido': n.rapido = CONFIG.powerups.duracionRapido; break;
      case 'escudo': n.escudo = Math.min(3, n.escudo + 1); break;
      case 'vida': if (n.vida < n.vidaMax) n.vida++; else sumarPuntos(n, 1000); break;
      case 'iman': n.iman = 12; break;
      case 'bomba': n.habCd = 0; break;
      case 'lento': S.lento = 5; break;
    }
    if (n.nivel >= 5) S.est.armasMax = 1;
    S.ev('pickup', n, t);
  }

  S.resumen = function () {
    const n = S.naves[S.yo | 0] || S.naves[0], mult = S.dif.pts;
    let mon = n.monedas, pts = S.naves.length > 1 ? n.puntos : S.puntos;
    const base = Math.floor(pts / 120) + mon * 3 + (S.victoria ? 150 : 0);
    const botin = n ? n.botin : 1;
    return { puntos: S.puntos, creditos: Math.round(base * botin * (S.mod.pts ? 1 + (S.mod.pts - 1) * 0.5 : 1)), monedas: mon, oleada: S.oleada, tiempo: S.t,
      kills: S.est.kills, jefes: S.est.jefes, victoria: S.victoria, mult };
  };
  S.vivas = vivas;
  return S;
})();
