// =============================================================
//  🌐  CIUDAD EN LÍNEA (2 a 4 jugadores, WebRTC con window.Red / Lobby)
//  Modos: Mundo libre cooperativo, Carreras callejeras, Policías y ladrones.
//  Cada jugador simula su personaje y su vehículo y difunde su estado
//  (~15 Hz, canal rápido). El anfitrión es autoritativo sobre tráfico,
//  peatones, policía IA, hora, clima y misiones compartidas.
// =============================================================
class CarroRemoto extends Carro {
  constructor(tipo, color, x, y, ang) {
    super(tipo, x, y, ang, { color, conductor: 'ia' });
    this.remoto = true;
    this.alt = 1;
    this.rotor = 0;
    if (tipo === 'helicoptero') this.aereo = true;
    if (tipo === 'lancha') this.acuatico = true;
  }
  actualizar(dt) { this.relojChoque = Math.max(0, this.relojChoque - dt); this.rotor += dt * 40; }
  fisica() {}
  colisionMundo() {}
  danar() {}
  golpe(fuerza, x, y) { if (fuerza > 120 && J.cercaDeCamara(x, y, 700)) { Sonido.choque(Util.limitar(fuerza / 700, 0.15, 0.8)); Efectos.chispas(x, y, 4); } }
  dibujar(g, t) {
    if (this.tipo === 'helicoptero') return Helicoptero.prototype.dibujar.call(this, g, t);
    return super.dibujar(g, t);
  }
}

const Multi = (() => {
  const T = Mundo.T;
  const L = Mundo.lugares;
  const TIPOS = Object.keys(CONFIG.carros);
  const PUNTOS_CARRERA = [5, 3, 2, 1];
  const FRASES = ['¡Sígueme!', '¡Cuidado!', '¡Ayuda!', 'Gracias', '¡Vamos!', 'Espérame', '¡Policía!', '¡Buena carrera!', 'Sube a mi carro'];

  let activo = false, modo = 'libre', soyHost = false;
  const remotos = {};          // id -> jugador remoto
  const fantasmas = new Map(); // id del anfitrión -> carro de tráfico (clientes)
  const gente = new Map();     // id -> peatón fantasma (clientes)
  const pts = {};              // puntos por jugador (id -> n)
  let act = null;              // actividad en curso (carrera, policias, coop)
  let tEnvio = 0, tMundo = 0, tSync = 0, tPoli = 0;
  let nGente = 1;
  const chat = [];
  let heliRemoto = null;
  let reaparecer = 0;
  let pendienteRobo = null;

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const yo = () => J.jugador;
  const miPos = () => { const j = J.jugador; const o = j.carro || j; return { x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0, ang: o.ang || 0 }; };
  const nombreDe = (id) => (id === Red.miId ? J.perfil.nombre : (Red.jugadores[id] ? Red.jugadores[id].nombre : 'Jugador'));
  const colorDe = (id) => (id === Red.miId ? J.perfil.color : (Red.jugadores[id] ? Red.jugadores[id].color : '#fff'));
  const sumar = (id, n) => { pts[id] = (pts[id] || 0) + n; };
  const idsTodos = () => Red.lista().map((j) => j.id);

  // ----------------------------------------------------------- Entrada a la partida
  function iniciar(config, jugadores) {
    activo = true;
    modo = config.modo || 'libre';
    soyHost = Red.esAnfitrion;
    J.multi = true;
    J.multiCliente = !soyHost;
    J.sinDelitos = false;
    for (const k in pts) delete pts[k];
    act = null;
    if (J.modo === 'titulo') J.empezar();
    const idx = Math.max(0, jugadores.findIndex((q) => q.id === Red.miId));
    const j = J.jugador;
    if (j.carro) { j.carro.conductor = null; j.carro = null; }
    j.x = L.inicio.x + (idx - 1.5) * 66; j.y = L.inicio.y + 20;
    J.cam.x = j.x; J.cam.y = j.y;
    if (J.multiCliente) limpiarLocal();
    Panel.cerrar(true);
    if (J.modo === 'pausa') document.getElementById('bSeguir').click();
    J.avisar('CIUDAD EN LÍNEA', `${jugadores.length} jugadores · ${nombreModo(modo)}`, '#3df5ff', 3.5);
    if (soyHost && modo !== 'libre') setTimeout(() => { if (activo) lanzar(modo === 'carreras' ? 'carrera' : 'policias'); }, 3500);
  }
  const nombreModo = (m) => ({ libre: 'Mundo libre cooperativo', carreras: 'Carreras callejeras', policias: 'Policías y ladrones' }[m] || m);

  function limpiarLocal() {
    for (let k = J.carros.length - 1; k >= 0; k--) { const c = J.carros[k]; if (c.conductor === 'ia' && !c.remoto && !c.mision) J.carros.splice(k, 1); }
    J.peatones.length = 0;
  }

  function salir(motivo, aviso) {
    if (!activo) return;
    activo = false;
    J.multi = false; J.multiCliente = false; J.sinDelitos = false;
    for (const id in remotos) quitarRemoto(+id);
    for (const c of fantasmas.values()) { const k = J.carros.indexOf(c); if (k >= 0) J.carros.splice(k, 1); }
    fantasmas.clear(); gente.clear();
    act = null;
    const j = J.jugador;
    j.pasajeroDe = null;
    if (aviso !== false) J.avisar('SALISTE DE LA SALA', motivo || '', '#ff8a8a', 3);
  }

  // ----------------------------------------------------------- Remotos
  function crearRemoto(id) {
    const info = Red.jugadores[id] || {};
    return (remotos[id] = {
      id, x: 0, y: 0, ang: 0, vx: 0, vy: 0, interp: new Red.Interpolador({ angulos: ['a'], retardo: 110 }),
      e: { v: '', c: '', a: '', s: 0, f: 0, ca: 0, ps: -1, av: 0, ne: '', rk: 0 }, carro: null, fase: 0, tienePos: false,
      nombre: info.nombre || 'Jugador', color: info.color || '#fff', arrestT: 0, burbuja: null,
    });
  }
  function quitarRemoto(id) {
    const r = remotos[id];
    if (!r) return;
    if (r.carro) { const k = J.carros.indexOf(r.carro); if (k >= 0) J.carros.splice(k, 1); }
    delete remotos[id];
    if (J.jugador.pasajeroDe === id) bajarPasajero();
  }

  function actualizarRemotos(dt) {
    for (const id in remotos) {
      const r = remotos[id];
      const info = Red.jugadores[id];
      if (info) { r.nombre = info.nombre; r.color = info.color; r.ping = info.ping; }
      const s = r.interp.obtener();
      if (!s) continue;
      r.tienePos = true;
      const px = r.x, py = r.y;
      r.x = s.x; r.y = s.y; r.ang = s.a; r.vx = s.vx || 0; r.vy = s.vy || 0;
      r.fase += Math.hypot(r.x - px, r.y - py) * 0.14;
      r.pasajero = r.e.ps >= 0;
      const quiere = r.e.v && !r.pasajero;
      if (quiere && (!r.carro || r.carro.tipo !== r.e.v)) {
        if (r.carro) { const k = J.carros.indexOf(r.carro); if (k >= 0) J.carros.splice(k, 1); }
        if (CONFIG.carros[r.e.v]) {
          r.carro = new CarroRemoto(r.e.v, r.e.c || CONFIG.carros[r.e.v].colores[0], r.x, r.y, r.ang);
          r.carro.jugadorId = +id;
          J.carros.push(r.carro);
        }
      } else if (!quiere && r.carro) {
        const k = J.carros.indexOf(r.carro); if (k >= 0) J.carros.splice(k, 1);
        r.carro = null;
      }
      const c = r.carro;
      if (c) {
        c.x = r.x; c.y = r.y; c.ang = r.ang; c.vx = r.vx; c.vy = r.vy;
        c.vf = r.vx * Math.cos(r.ang) + r.vy * Math.sin(r.ang);
        c.sirena = !!r.e.s; c.frenando = !!r.e.f; c.averiado = !!r.e.av; c.neon = r.e.ne || null;
        if (r.e.c && c.color !== r.e.c) c.pintar(r.e.c);
        c.vida = c.averiado ? 0 : c.t.vida;
      }
      if (r.burbuja && J.tiempo - r.burbuja.t > 4.5) r.burbuja = null;
    }
  }

  // ----------------------------------------------------------- Envío de mi estado (15 Hz)
  function estadoMio() {
    const j = J.jugador, c = j.carro, o = c || j;
    return {
      t: Red.reloj(),
      p: Red.compactar({ x: o.x, y: o.y, a: o.ang, vx: o.vx || 0, vy: o.vy || 0 }, 1),
      e: {
        v: c ? c.tipo : '', c: c ? c.color : '', a: Armas.actual || '', s: c && c.sirena ? 1 : 0, f: c && c.frenando ? 1 : 0,
        ca: j.caido > 0 ? 1 : 0, ps: j.pasajeroDe === undefined || j.pasajeroDe === null ? -1 : j.pasajeroDe, av: c && c.averiado ? 1 : 0,
        ne: (c && c.neon) || '', rk: act && act.tipo === 'carrera' ? act.k : 0, cu: j.cubierto ? 1 : 0,
      },
    };
  }

  // ----------------------------------------------------------- Mundo del anfitrión -> clientes
  function focos() {
    const f = [miPos()];
    for (const id in remotos) { const r = remotos[id]; if (r.tienePos && !r.pasajero) f.push({ x: r.x, y: r.y }); }
    return f;
  }
  const cercaDeFocos = (x, y, d, fs) => fs.some((f) => Math.hypot(x - f.x, y - f.y) < d);

  function enviarMundo() {
    const fs = focos();
    const cs = [];
    for (const c of J.carros) {
      if (c.remoto || c.conductor !== 'ia' || c.mision || c.estacionado) continue;
      if (!cercaDeFocos(c.x, c.y, 1500, fs)) continue;
      cs.push([c.id, TIPOS.indexOf(c.tipo), c.color, Math.round(c.x), Math.round(c.y), Math.round(c.ang * 100) / 100, Math.round(c.vx), Math.round(c.vy), (c.sirena ? 1 : 0) | (c.frenando ? 2 : 0) | (c.averiado ? 4 : 0)]);
      if (cs.length >= 70) break;
    }
    const gs = [];
    for (const p of J.peatones) {
      if (p.mision || !cercaDeFocos(p.x, p.y, 1100, fs)) continue;
      if (!p.mid) p.mid = nGente++;
      gs.push([p.mid, Math.round(p.x), Math.round(p.y), Math.round(p.ang * 100) / 100, p.estado === 'caido' ? 1 : 0]);
      if (gs.length >= 55) break;
    }
    const hp = window.Policia2 && Policia2.posHeli();
    Red.difundir('mundo', { t: Red.reloj(), c: cs, g: gs, h: hp ? [Math.round(hp.x), Math.round(hp.y), Math.round(hp.ang * 100) / 100] : 0 }, { fiable: false });
  }

  function recibirMundo(d) {
    const vistos = new Set();
    for (const a of d.c) {
      const [id, ti, col, x, y, ang, vx, vy, fl] = a;
      vistos.add(id);
      let c = fantasmas.get(id);
      const tipo = TIPOS[ti];
      if (!c) {
        if (!tipo) continue;
        c = new CarroRemoto(tipo, col, x, y, ang);
        c.trafico = true; c.hid = id; c.interp = new Red.Interpolador({ angulos: ['a'], retardo: 130 });
        fantasmas.set(id, c); J.carros.push(c);
      }
      c.interp.agregar(d.t, { x, y, a: ang, vx, vy });
      c.fl = fl; c.visto = J.tiempo;
    }
    const vg = new Set();
    for (const a of d.g) {
      const [id, x, y, ang, caido] = a;
      vg.add(id);
      let p = gente.get(id);
      if (!p) {
        const h = (n) => Util.hash(id, n, 7);
        p = { id, interp: new Red.Interpolador({ angulos: ['a'], retardo: 130 }), colores: { ropa: ROPA[Math.floor(h(1) * ROPA.length)], piel: PIEL[Math.floor(h(2) * PIEL.length)], pelo: PELO[Math.floor(h(3) * PELO.length)] }, fase: h(4) * 10, x, y, ang, caido: 0, tCaido: 0 };
        gente.set(id, p);
      }
      p.interp.agregar(d.t, { x, y, a: ang });
      p.caido = caido; p.visto = J.tiempo;
    }
    if (d.h) Policia2.fijarRemoto({ x: d.h[0], y: d.h[1], ang: d.h[2] }); else Policia2.fijarRemoto(null);
  }

  function actualizarFantasmas(dt) {
    for (const [id, c] of fantasmas) {
      if (J.tiempo - c.visto > 1.2) { const k = J.carros.indexOf(c); if (k >= 0) J.carros.splice(k, 1); fantasmas.delete(id); continue; }
      const s = c.interp.obtener();
      if (!s) continue;
      c.x = s.x; c.y = s.y; c.ang = s.a; c.vx = s.vx; c.vy = s.vy;
      c.vf = s.vx * Math.cos(s.a) + s.vy * Math.sin(s.a);
      c.sirena = !!(c.fl & 1); c.frenando = !!(c.fl & 2); c.averiado = !!(c.fl & 4);
      c.vida = c.averiado ? 0 : c.t.vida;
    }
    for (const [id, p] of gente) {
      if (J.tiempo - p.visto > 1.2) { gente.delete(id); continue; }
      const s = p.interp.obtener();
      if (!s) continue;
      const dx = s.x - p.x, dy = s.y - p.y;
      p.fase += Math.hypot(dx, dy) * 0.16;
      p.x = s.x; p.y = s.y; p.ang = s.a;
      p.tCaido = Math.max(0, p.tCaido - dt);
    }
    // Mis atropellos a la gente del anfitrión
    const c = J.jugador.carro;
    if (c && c.velocidad > 80 && !c.remoto) {
      for (const p of gente.values()) {
        if (p.caido || p.tCaido > 0 || Math.abs(p.x - c.x) > c.largo || Math.abs(p.y - c.y) > c.largo) continue;
        if (Math.hypot(p.x - c.x, p.y - c.y) < c.ancho / 2 + 12) {
          p.tCaido = 2.5;
          Red.enviar('atr', { id: p.id, vx: Math.round(c.vx), vy: Math.round(c.vy) });
          c.vx *= 0.94; c.vy *= 0.94;
        }
      }
    }
  }

  // ----------------------------------------------------------- Mensajes
  function alMensaje(tipo, d, de) {
    if (!activo) {
      if (tipo === 'iniciarSala') return;
      return;
    }
    if (tipo === 'p') {
      const r = remotos[de] || crearRemoto(de);
      r.interp.agregar(d.t, d.p);
      r.e = d.e;
    } else if (tipo === 'mundo') { if (J.multiCliente) recibirMundo(d); }
    else if (tipo === 'sync') {
      if (J.multiCliente) {
        J.hora = d.h;
        if (window.Clima && Clima.tipo !== d.cl) Clima.forzar(d.cl);
        J.buscado.calor = d.calor; J.buscado.estrellas = d.est;
      }
      Object.assign(pts, d.pts || {});
    } else if (tipo === 'delito') { if (soyHost) J.delito(d.tipo, d.x, d.y); }
    else if (tipo === 'atr') {
      if (soyHost) { const p = J.peatones.find((q) => q.mid === d.id); if (p && p.tumbar(d.vx, d.vy)) J.delito('atropello', p.x, p.y); }
    } else if (tipo === 'danoT') {
      if (soyHost) { const c = J.carros.find((q) => q.id === d.id); if (c) c.danar(d.d); }
    } else if (tipo === 'robar') {
      if (soyHost) {
        const c = J.carros.find((q) => q.id === d.id && q.conductor === 'ia');
        if (c && c.velocidad < 170 && !c.mision) {
          const k = J.carros.indexOf(c);
          if (c.espacio) { c.espacio.carro = null; c.espacio.decidido = false; }
          J.carros.splice(k, 1);
          if (c.esPolicia) J.delito('robarPatrulla', c.x, c.y); else J.delito('robo', c.x, c.y);
          Red.enviar('robado', { ok: 1, id: d.id, tipo: c.tipo, color: c.color, x: c.x, y: c.y, a: c.ang, vida: c.vida / c.t.vida }, { a: de });
        } else Red.enviar('robado', { ok: 0, id: d.id }, { a: de });
      }
    } else if (tipo === 'robado') { recibirRobo(d); }
    else if (tipo === 'dano') {
      const c = J.jugador.carro;
      if (c && !c.averiado) { c.danar(d.d); Efectos.chispas(c.x, c.y, 4); Entrada.vibrar(0.4, 0.4, 100); if (c.averiado) Red.difundir('muerte', { por: d.de }); }
    } else if (tipo === 'tumbar') { J.jugador.tumbar(d.vx, d.vy); }
    else if (tipo === 'muerte') {
      if (soyHost) { sumar(d.por, 1); }
      J.pista(`${nombreDe(d.por)} destruyó el carro de ${nombreDe(de)}`);
    } else if (tipo === 'preso') { J.atrapar(); }
    else if (tipo === 'carrera') onCarrera(d);
    else if (tipo === 'carrera_fin') { if (soyHost) finCarreraJugador(de, d.t); }
    else if (tipo === 'carrera_res') onCarreraRes(d);
    else if (tipo === 'poli') onPoli(d);
    else if (tipo === 'poli_fin') onPoliFin(d);
    else if (tipo === 'coop') onCoop(d);
    else if (tipo === 'coop_fase') { if (act && act.tipo === 'coop') { act.fase = d.fase; J.avisar('¡SIGUIENTE FASE!', 'Todos al punto final', '#ffd23d'); Sonido.checkpoint(); } }
    else if (tipo === 'coop_fin') onCoopFin(d);
    else if (tipo === 'fin_act') { act = null; J.sinDelitos = false; }
  }

  function recibirRobo(d) {
    const p = pendienteRobo;
    pendienteRobo = null;
    const g = fantasmas.get(d.id);
    if (g) { const k = J.carros.indexOf(g); if (k >= 0) J.carros.splice(k, 1); fantasmas.delete(d.id); }
    if (!d.ok) { J.pista('Ese carro va muy rápido'); return; }
    const c = new Carro(d.tipo, d.x, d.y, d.a, { color: d.color });
    c.vida = Math.max(1, d.vida * c.t.vida);
    c.conductor = 'jugador'; c.mando.freno = true;
    J.carros.push(c);
    const j = J.jugador;
    j.carro = c; j.vx = 0; j.vy = 0;
    J.stats.carrosTomados = (J.stats.carrosTomados || 0) + 1;
    Sonido.puerta(); Radio.encender();
  }

  // ----------------------------------------------------------- Interacciones locales
  function subirA(c) {
    const j = J.jugador;
    if (c.trafico) {
      if (c.velocidad > 160) { J.pista('¡Ese carro va muy rápido!'); return; }
      pendienteRobo = c.hid;
      Red.enviar('robar', { id: c.hid });
      return;
    }
    const r = remotos[c.jugadorId];
    if (!r) return;
    const ocupados = Object.values(remotos).filter((q) => q.e.ps === r.id).length + (j.pasajeroDe === r.id ? 1 : 0);
    if (ocupados >= 3) { J.pista('El carro está lleno'); return; }
    j.pasajeroDe = r.id;
    Sonido.puerta();
    J.pista(`Vas de copiloto con ${r.nombre} (E para bajar)`);
  }
  function bajarPasajero() {
    const j = J.jugador;
    const r = remotos[j.pasajeroDe];
    j.pasajeroDe = null;
    if (r) { j.x = r.x + Math.cos(r.ang + Math.PI / 2) * 40; j.y = r.y + Math.sin(r.ang + Math.PI / 2) * 40; }
    Sonido.puerta();
  }
  function golpeAPie(r, dx, dy) { Red.enviar('tumbar', { vx: Math.round(dx * 170), vy: Math.round(dy * 170) }, { a: r.id }); }
  function golpeCarro(c, d) {
    if (c.trafico) Red.enviar('danoT', { id: c.hid, d });
    else if (c.jugadorId !== undefined && !(act && act.tipo === 'poli' && act.rolesIguales && act.rolesIguales(Red.miId, c.jugadorId))) Red.enviar('dano', { d, de: Red.miId }, { a: c.jugadorId });
  }

  // ----------------------------------------------------------- Actividades
  function lanzar(tipo) {
    if (!soyHost) { J.pista('Solo el anfitrión inicia actividades'); return; }
    if (act) { J.pista('Ya hay una actividad en curso'); return; }
    if (tipo === 'carrera') lanzarCarrera();
    else if (tipo === 'policias') { if (Red.cuantos() < 2) { J.pista('Necesitas al menos 2 jugadores'); return; } lanzarPoli(0); }
    else if (tipo === 'coop') lanzarCoop();
  }
  function terminarActividad() {
    if (!soyHost) return;
    Red.difundir('fin_act', {});
    act = null; J.sinDelitos = false;
  }

  function punto(k, dMin, dMax) {
    const r = Util.crearAleatorio(Math.floor(Red.reloj()) + k * 17);
    let q = Mundo.paradas[0];
    for (let i = 0; i < 400; i++) {
      q = Mundo.paradas[Math.floor(r() * Mundo.paradas.length)];
      const d = Math.hypot(q.x - L.inicio.x, q.y - L.inicio.y);
      if (d >= dMin && d <= dMax) break;
    }
    return { x: q.px, y: q.py };
  }

  // ---- Carrera
  function lanzarCarrera() {
    const base = L.carrera || L.inicio;
    let n = Mundo.nodoCercano(base.x, base.y), dirPrev = -1;
    const c0 = Mundo.centroNodo(n.i, n.j);
    const puntos = [];
    for (let k = 0; k < 8; k++) {
      for (let s = 0; s < 2; s++) {
        const todas = Mundo.salidas(n.i, n.j).filter((d) => dirPrev < 0 || d !== (dirPrev + 2) % 4);
        const d = Util.elegir(todas.length ? todas : Mundo.salidas(n.i, n.j));
        n = { i: n.i + DIRS[d][0], j: n.j + DIRS[d][1] }; dirPrev = d;
      }
      const c = Mundo.centroNodo(n.i, n.j);
      puntos.push({ x: Math.round(c.x), y: Math.round(c.y) });
    }
    const a = Math.atan2(puntos[0].y - c0.y, puntos[0].x - c0.x);
    const grid = idsTodos().map((id, i) => ({ id, x: Math.round(c0.x - Math.cos(a) * i * 70 - Math.sin(a) * (i % 2 ? 22 : -22)), y: Math.round(c0.y - Math.sin(a) * i * 70 + Math.cos(a) * (i % 2 ? 22 : -22)), a: Math.round(a * 100) / 100 }));
    const d = { id: Date.now(), pts: puntos, grid, t0: Red.reloj() + 5500 };
    Red.difundir('carrera', d);
    onCarrera(d);
  }
  function onCarrera(d) {
    act = { tipo: 'carrera', id: d.id, pts: d.pts, k: 0, t0: d.t0, fin: false, res: {}, ultimo: 9, hecho: false };
    const mio = d.grid.find((g) => g.id === Red.miId);
    const j = J.jugador;
    if (j.carro) { j.carro.conductor = null; j.carro = null; }
    j.pasajeroDe = null;
    if (mio) {
      const c = new Carro('deportivo', mio.x, mio.y, mio.a, { color: colorDe(Red.miId) === '#ffffff' ? undefined : undefined });
      c.pintar(CONFIG.carros.deportivo.colores[Red.miId % CONFIG.carros.deportivo.colores.length]);
      c.conductor = 'jugador'; c.mando.freno = true;
      J.carros.push(c); j.carro = c; j.x = c.x; j.y = c.y;
      Radio.encender();
    }
    J.avisar('CARRERA CALLEJERA', '8 puntos · ¡prepárate!', '#ff3d81', 3);
  }
  function actualizarCarrera(dt) {
    const a = act;
    const rest = (a.t0 - Red.reloj()) / 1000;
    const j = J.jugador;
    const c = j.carro;
    if (rest > 0) {
      const n = Math.ceil(rest);
      if (n <= 3 && n !== a.ultimo) { a.ultimo = n; J.avisar(String(n), '', '#ff3d81', 0.9); Sonido.cuenta(false); }
      if (c) { c.mando.gas = 0; c.mando.freno = true; }
      a.retener = true;
      return;
    }
    if (a.retener) { a.retener = false; J.avisar('¡YA!', '', '#ff3d81', 0.9); Sonido.cuenta(true); }
    if (a.hecho || !c) return;
    if (dist(c, a.pts[a.k]) < 115) {
      a.k++;
      Sonido.checkpoint();
      if (a.k >= a.pts.length) {
        a.hecho = true;
        const t = Math.round((Red.reloj() - a.t0)) / 1000;
        J.avisar('¡META!', t.toFixed(1) + ' s', '#7dff6b');
        if (soyHost) finCarreraJugador(Red.miId, t); else Red.enviar('carrera_fin', { t });
      }
    }
  }
  function finCarreraJugador(id, t) {
    if (!act || act.tipo !== 'carrera' || act.res[id] !== undefined) return;
    act.res[id] = t;
    if (act.primero === undefined) act.primero = J.tiempo;
  }
  function revisarFinCarrera() {
    const a = act;
    const n = Red.cuantos();
    const hechos = Object.keys(a.res).length;
    const tiempoFuera = (Red.reloj() - a.t0) / 1000 > 150 || (a.primero !== undefined && J.tiempo - a.primero > 45);
    if (hechos >= n || tiempoFuera) {
      const orden = Object.entries(a.res).map(([id, t]) => [+id, t]).sort((x, y) => x[1] - y[1]);
      orden.forEach(([id], i) => sumar(id, PUNTOS_CARRERA[i] || 0));
      const d = { orden, pts };
      Red.difundir('carrera_res', d);
      onCarreraRes(d);
    }
  }
  function onCarreraRes(d) {
    Object.assign(pts, d.pts || {});
    const ganador = d.orden[0];
    J.avisar('CARRERA TERMINADA', ganador ? `Ganó ${nombreDe(ganador[0])} (${ganador[1].toFixed(1)} s)` : 'Nadie terminó', '#ffd23d', 4);
    Sonido.exito();
    act = null;
    setTimeout(() => abrirPanel('jugadores', d.orden), 1200);
  }

  // ---- Policías y ladrones
  function lanzarPoli(ronda) {
    const ids = idsTodos();
    const ladron = ids[ronda % ids.length];
    const ini = Mundo.carrilAzar(Mundo.TAM / 2, Mundo.TAM / 2, 0, 1400, (q) => Math.hypot(q.x - L.comisaria.x, q.y - L.comisaria.y) > 1200) || { x: L.inicio.x, y: L.inicio.y, dir: 0 };
    let ref = punto(ronda, 1800, 4200);
    for (let k = 0; k < 20 && Math.hypot(ref.x - ini.x, ref.y - ini.y) < 2200; k++) ref = punto(ronda * 7 + k, 1500, 5500);
    const d = { ronda, ladron, refugio: { x: Math.round(ref.x), y: Math.round(ref.y) }, ini: { x: Math.round(ini.x), y: Math.round(ini.y), a: ini.dir * Math.PI / 2 }, t0: Red.reloj() + 5000, dur: 210, ids };
    Red.difundir('poli', d);
    onPoli(d);
  }
  function onPoli(d) {
    act = Object.assign({ tipo: 'poli', arrestT: 0, fin: false, rolesIguales: (a, b) => (a === d.ladron) === (b === d.ladron) }, d);
    J.sinDelitos = true;
    J.limpiarBuscado(true);
    const j = J.jugador;
    if (j.carro) { j.carro.conductor = null; j.carro = null; }
    j.pasajeroDe = null;
    const esLadron = Red.miId === d.ladron;
    let c;
    if (esLadron) c = new Carro('superdeportivo', d.ini.x, d.ini.y, d.ini.a, {});
    else {
      const i = d.ids.filter((q) => q !== d.ladron).indexOf(Red.miId);
      c = new Carro('policia', L.comisaria.x + (i - 1) * 60, L.comisaria.y - 40, -Math.PI / 2, {});
      c.sirena = true;
    }
    c.conductor = 'jugador'; c.mando.freno = true;
    J.carros.push(c); j.carro = c; j.x = c.x; j.y = c.y;
    Radio.encender();
    J.avisar(esLadron ? 'ERES EL LADRÓN' : 'ERES POLICÍA', esLadron ? 'Llega al refugio sin que te atrapen' : `Atrapa a ${nombreDe(d.ladron)} antes de que escape`, esLadron ? '#ff8a3d' : '#5c8dff', 4);
  }
  function actualizarPoli(dt) {
    const a = act;
    const rest = (a.t0 - Red.reloj()) / 1000;
    const c = J.jugador.carro;
    if (rest > 0) { if (c) { c.mando.gas = 0; c.mando.freno = true; } return; }
    if (!a.empezo) { a.empezo = true; J.avisar('¡YA!', '', '#ffd23d', 1); Sonido.cuenta(true); }
    if (!soyHost || a.fin) return;
    const ent = a.ladron === Red.miId ? miPos() : (remotos[a.ladron] && remotos[a.ladron].tienePos ? remotos[a.ladron] : null);
    if (!ent) return;
    const rl = remotos[a.ladron];
    const velL = Math.hypot(ent.vx || 0, ent.vy || 0);
    if (dist(ent, a.refugio) < 130) return finPoli('ladron');
    if (rl && rl.e.av || (a.ladron === Red.miId && J.jugador.carro && J.jugador.carro.averiado)) return finPoli('policia');
    if (Red.reloj() > a.t0 + a.dur * 1000) return finPoli('ladron');
    let cerca = false;
    for (const id of a.ids) {
      if (id === a.ladron) continue;
      const pe = id === Red.miId ? miPos() : remotos[id];
      if (pe && (id === Red.miId || pe.tienePos) && dist(pe, ent) < 100 && velL < 130) { cerca = true; break; }
    }
    a.arrestT = cerca ? a.arrestT + dt : Math.max(0, a.arrestT - dt * 1.5);
    if (a.arrestT > 2.5) finPoli('policia');
  }
  function finPoli(ganador) {
    const a = act;
    a.fin = true;
    if (ganador === 'ladron') sumar(a.ladron, 3); else for (const id of a.ids) if (id !== a.ladron) sumar(id, 2);
    const d = { ganador, ladron: a.ladron, pts, ronda: a.ronda };
    Red.difundir('poli_fin', d);
    onPoliFin(d);
    setTimeout(() => { if (activo && soyHost && act && act.fin) { act = null; lanzarPoli(d.ronda + 1); } }, 7000);
  }
  function onPoliFin(d) {
    Object.assign(pts, d.pts || {});
    if (act) act.fin = true;
    J.avisar(d.ganador === 'ladron' ? '¡EL LADRÓN ESCAPÓ!' : '¡LADRÓN ATRAPADO!', d.ganador === 'ladron' ? nombreDe(d.ladron) + ' gana 3 puntos' : 'Los policías ganan 2 puntos', '#ffd23d', 4);
    Sonido.exito();
    if (J.jugador.carro) { J.jugador.carro.mando.freno = true; J.jugador.carro.sirena = false; }
  }

  // ---- Misión cooperativa
  function lanzarCoop() {
    const A = punto(3, 600, 1800), B = punto(4, 2400, 4600);
    const d = { A: { x: Math.round(A.x), y: Math.round(A.y) }, B: { x: Math.round(B.x), y: Math.round(B.y) }, pago: 1500 + 600 * Red.cuantos() };
    Red.difundir('coop', d);
    onCoop(d);
  }
  function onCoop(d) {
    act = { tipo: 'coop', A: d.A, B: d.B, pago: d.pago, fase: 0 };
    J.avisar('MISIÓN COOPERATIVA', 'Reúnanse todos en el punto A', '#ffd23d', 4);
    Sonido.mision();
  }
  function actualizarCoop(dt) {
    if (!soyHost) return;
    const a = act;
    const pu = a.fase === 0 ? a.A : a.B;
    const todos = idsTodos().every((id) => { const e = id === Red.miId ? miPos() : remotos[id]; return e && (id === Red.miId || e.tienePos) && dist(e, pu) < (a.fase === 0 ? 130 : 150); });
    if (!todos) { a.cuenta = 0; return; }
    a.cuenta = (a.cuenta || 0) + dt;
    if (a.cuenta < 0.8) return;
    a.cuenta = 0;
    if (a.fase === 0) { Red.difundir('coop_fase', { fase: 1 }); a.fase = 1; J.avisar('¡SIGUIENTE FASE!', 'Todos al punto final', '#ffd23d'); Sonido.checkpoint(); }
    else { const d = { pago: Math.round(a.pago / Red.cuantos()) }; Red.difundir('coop_fin', d); onCoopFin(d); }
  }
  function onCoopFin(d) {
    J.ganar(d.pago);
    J.avisar('¡MISIÓN COMPLETADA!', `Tu parte: ${Util.dinero(d.pago)}`, '#7dff6b', 4);
    J.stats.coop = (J.stats.coop || 0) + 1;
    Sonido.exito();
    act = null;
  }

  // ----------------------------------------------------------- Panel de multijugador
  function abrirPanel(tab, orden) {
    const filasJ = () => {
      const f = [{ t: 'info', texto: `Modo: ${nombreModo(modo)}`, valor: soyHost ? 'ANFITRIÓN' : 'INVITADO' }];
      Red.lista().forEach((q) => {
        const pos = orden ? orden.findIndex((o) => o[0] === q.id) : -1;
        f.push({ t: 'info', texto: `${q.id === Red.miId ? '★ ' : '● '}${q.nombre}${q.id === 0 ? ' (anfitrión)' : ''}${pos >= 0 ? ` · ${pos + 1}º ${orden[pos][1].toFixed(1)} s` : ''}`, valor: `${pts[q.id] || 0} pts · ${q.id === Red.miId ? Math.round(Red.rtt || 0) : Math.round(q.ping || 0)} ms` });
      });
      return f;
    };
    const filasA = () => {
      const f = [];
      if (!soyHost) f.push({ t: 'info', texto: 'Solo el anfitrión inicia actividades', valor: '' });
      f.push({ t: 'boton', texto: 'Carrera callejera', nota: 'checkpoints + cuenta atrás', deshabilitado: !soyHost || !!act, color: '#ff3d81', accion: () => { Panel.cerrar(); lanzar('carrera'); } });
      f.push({ t: 'boton', texto: 'Policías y ladrones', nota: 'mínimo 2 jugadores', deshabilitado: !soyHost || !!act, color: '#5c8dff', accion: () => { Panel.cerrar(); lanzar('policias'); } });
      f.push({ t: 'boton', texto: 'Misión cooperativa', nota: 'recompensa dividida', deshabilitado: !soyHost || !!act, color: '#ffd23d', accion: () => { Panel.cerrar(); lanzar('coop'); } });
      f.push({ t: 'boton', texto: 'Terminar actividad actual', deshabilitado: !soyHost || !act, peligro: true, accion: () => { terminarActividad(); Panel.cerrar(); } });
      return f;
    };
    const filasC = () => FRASES.map((tx) => ({ t: 'boton', texto: tx, accion: () => { decir(tx); Panel.cerrar(); } }));
    Panel.abrir({
      titulo: 'CIUDAD EN LÍNEA',
      pestanas: [{ id: 'jugadores', nombre: 'JUGADORES', filas: filasJ }, { id: 'act', nombre: 'ACTIVIDADES', filas: filasA }, { id: 'chat', nombre: 'CHAT RÁPIDO', filas: filasC }],
      tab: tab === 'chat' ? 2 : tab === 'act' ? 1 : 0, transparente: true,
    });
  }

  function decir(tx) {
    Red.chat(tx);
    chat.push({ id: Red.miId, txt: tx, t: J.tiempo });
    if (chat.length > 5) chat.shift();
    me.burbuja = { txt: tx, t: J.tiempo };
  }
  const me = { burbuja: null };

  // ----------------------------------------------------------- Módulo del juego
  function enviarEstadoPoli() {
    if (!soyHost || J.buscado === undefined) return;
    // Arrestos de jugadores remotos por la policía IA
    for (const id in remotos) {
      const r = remotos[id];
      if (!r.tienePos || r.pasajero || J.buscado.estrellas === 0) { r.arrestT = 0; continue; }
      const cerca = J.carros.some((c) => c.ia instanceof IAPolicia && c.ia.modo === 'perseguir' && !c.averiado && !c.remoto && Math.hypot(c.x - r.x, c.y - r.y) < CONFIG.policia.distanciaAtrapar && c.velocidad < 230);
      const quieto = Math.hypot(r.vx, r.vy) < 60;
      r.arrestT = cerca && quieto ? r.arrestT + 0.1 : Math.max(0, r.arrestT - 0.15);
      if (r.arrestT >= CONFIG.policia.tiempoAtrapar) { r.arrestT = 0; Red.enviar('preso', {}, { a: +id }); }
    }
  }

  const mod = J.registrar({
    actualizar(dt) {
      if (!activo) return;
      actualizarRemotos(dt);
      if (J.multiCliente) actualizarFantasmas(dt);
      // Pasajero: pegado al carro del conductor
      const j = J.jugador;
      if (j.pasajeroDe !== undefined && j.pasajeroDe !== null) {
        const r = remotos[j.pasajeroDe];
        if (!r || !r.e.v) bajarPasajero();
        else { j.x = r.x; j.y = r.y; j.vx = r.vx; j.vy = r.vy; j.ang = r.ang; }
      }
      tEnvio -= dt;
      if (tEnvio <= 0) { tEnvio = 1 / 15; Red.difundir('p', estadoMio(), { fiable: false }); }
      if (soyHost) {
        tMundo -= dt;
        if (tMundo <= 0) { tMundo = 0.125; enviarMundo(); }
        tSync -= dt;
        if (tSync <= 0) { tSync = 1; Red.difundir('sync', { h: Math.round(J.hora * 100) / 100, cl: window.Clima ? Clima.tipo : 'despejado', calor: Math.round(J.buscado.calor * 100) / 100, est: J.buscado.estrellas, pts }, { fiable: false }); }
        tPoli -= dt;
        if (tPoli <= 0) { tPoli = 0.1; enviarEstadoPoli(); }
      }
      if (act) {
        if (act.tipo === 'carrera') { actualizarCarrera(dt); if (soyHost) revisarFinCarrera(); }
        else if (act.tipo === 'poli') actualizarPoli(dt);
        else if (act.tipo === 'coop') actualizarCoop(dt);
      }
      // Reaparición del carro destruido
      const c = j.carro;
      if (c && c.averiado && (modo !== 'libre' || act)) {
        reaparecer += dt;
        if (reaparecer > 5) {
          reaparecer = 0;
          c.reparar(); c.x = L.inicio.x; c.y = L.inicio.y + 60; c.vx = c.vy = 0; c.ang = -Math.PI / 2;
          if (act && act.tipo === 'carrera') { c.x = act.pts[Math.max(0, act.k - 1)].x; c.y = act.pts[Math.max(0, act.k - 1)].y; }
          J.avisar('REAPARECES', 'Tu carro fue reparado', '#7dff9a');
        }
      } else reaparecer = 0;
      if (Entrada.pulso('Tab')) abrirPanel('jugadores');
    },

    dibujarSuelo(g, t, v) {
      if (!act) return;
      const marca = (p, col, txt, r) => {
        if (p.x < v.x0 - 150 || p.x > v.x1 + 150 || p.y < v.y0 - 150 || p.y > v.y1 + 150) return;
        const rr = r * (1 + Math.sin(t * 5) * 0.07);
        g.save();
        g.fillStyle = col; g.globalAlpha = 0.2; g.beginPath(); g.arc(p.x, p.y, rr, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1; g.strokeStyle = col; g.lineWidth = 5; g.setLineDash([16, 10]); g.lineDashOffset = t * 40;
        g.beginPath(); g.arc(p.x, p.y, rr, 0, Math.PI * 2); g.stroke();
        if (txt) { g.setLineDash([]); g.fillStyle = '#fff'; g.font = `800 22px ${FUENTE}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, p.x, p.y); }
        g.restore();
      };
      if (act.tipo === 'carrera' && !act.hecho) {
        marca(act.pts[act.k], '#ff3d81', String(act.k + 1), 100);
        if (act.k + 1 < act.pts.length) { const q = act.pts[act.k + 1]; g.save(); g.globalAlpha = 0.4; g.strokeStyle = '#ff3d81'; g.lineWidth = 4; g.beginPath(); g.arc(q.x, q.y, 90, 0, Math.PI * 2); g.stroke(); g.restore(); }
      } else if (act.tipo === 'poli' && act.ladron === Red.miId) marca(act.refugio, '#7dff6b', 'REFUGIO', 120);
      else if (act.tipo === 'coop') marca(act.fase === 0 ? act.A : act.B, '#ffd23d', act.fase === 0 ? 'A' : 'B', 120);
    },

    dibujarEntidades(g, t, v) {
      if (!activo) return;
      const k = J.dpr / J.escala;
      const etiqueta = (x, y, txt, col, b) => {
        g.save();
        g.font = `800 ${Math.round(12 * k)}px ${FUENTE_TEXTO}`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 3.5 * k; g.strokeStyle = 'rgba(0,0,0,0.75)';
        g.strokeText(txt, x, y); g.fillStyle = col; g.fillText(txt, x, y);
        if (b) { g.font = `700 ${Math.round(12 * k)}px ${FUENTE_TEXTO}`; const w = g.measureText(b).width + 14 * k; g.fillStyle = 'rgba(10,8,25,0.85)'; Util.rectRedondo(g, x - w / 2, y - 30 * k, w, 18 * k, 8 * k); g.fill(); g.fillStyle = '#fff'; g.fillText(b, x, y - 21 * k); }
        g.restore();
      };
      for (const id in remotos) {
        const r = remotos[id];
        if (!r.tienePos || r.pasajero) continue;
        if (r.x < v.x0 - 80 || r.x > v.x1 + 80 || r.y < v.y0 - 80 || r.y > v.y1 + 80) continue;
        if (!r.e.v) {
          dibujarPersona(g, r.x, r.y, r.ang, { ropa: r.color, piel: '#e0ac69', pelo: '#2a1a10' }, r.fase, { caido: !!r.e.ca, angCaido: r.ang, tiempo: t, quieto: Math.hypot(r.vx, r.vy) < 5, arma: r.e.a || null, destello: false, contorno: r.color });
        } else if (r.carro) {
          g.save(); g.strokeStyle = r.color; g.globalAlpha = 0.55; g.lineWidth = 3 * k;
          g.beginPath(); g.arc(r.x, r.y, r.carro.largo * 0.62, 0, Math.PI * 2); g.stroke(); g.restore();
        }
        etiqueta(r.x, r.y - (r.e.v ? 46 : 30) * 1, r.nombre, r.color, r.burbuja && r.burbuja.txt);
      }
      for (const p of gente.values()) {
        if (p.x < v.x0 - 40 || p.x > v.x1 + 40 || p.y < v.y0 - 40 || p.y > v.y1 + 40) continue;
        dibujarPersona(g, p.x, p.y, p.ang, p.colores, p.fase, { caido: !!p.caido || p.tCaido > 0, angCaido: p.ang, tiempo: t, quieto: false });
      }
      const j = J.jugador;
      if (j.pasajeroDe === undefined || j.pasajeroDe === null) etiqueta(j.carro ? j.carro.x : j.x, (j.carro ? j.carro.y : j.y) - (j.carro ? 46 : 30), J.perfil.nombre, J.perfil.color, me.burbuja && me.burbuja.txt);
      if (me.burbuja && J.tiempo - me.burbuja.t > 4.5) me.burbuja = null;
    },

    iconosMapa(g, aPant, esc, dentro) {
      if (!activo) return;
      for (const id in remotos) {
        const r = remotos[id];
        if (!r.tienePos || r.pasajero) continue;
        const q = aPant(r.x, r.y);
        if (!dentro(q)) continue;
        g.fillStyle = r.color; g.strokeStyle = '#0a0d18'; g.lineWidth = 2;
        g.beginPath(); g.arc(q.x, q.y, 5.5 * esc, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#0a0d18'; g.font = `800 ${Math.round(7 * esc)}px ${FUENTE}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(r.nombre.charAt(0).toUpperCase(), q.x, q.y + 0.5);
      }
    },

    dibujarHUD(g, W, H, u, t) {
      if (!activo || J.modo === 'foto') return;
      const z = J.zonaMinimapa || { x: W - 70, y: 70, r: 60 };
      let y = z.y + z.r + 40 * u;
      g.save();
      g.textAlign = 'right'; g.textBaseline = 'middle';
      const fila = (txt, col) => { g.font = `700 ${Math.round(11 * u)}px ${FUENTE_TEXTO}`; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeText(txt, W - 14, y); g.fillStyle = col; g.fillText(txt, W - 14, y); y += 15 * u; };
      Red.lista().forEach((q) => fila(`${q.nombre}  ${pts[q.id] || 0}pt  ${Math.round(q.id === Red.miId ? (Red.rtt || 0) : (q.ping || 0))}ms`, q.color));
      g.restore();
      // Chat reciente (abajo a la izquierda)
      let yc = H - 150 * u;
      g.save();
      g.textAlign = 'left'; g.textBaseline = 'middle';
      for (const m of chat) {
        if (J.tiempo - m.t > 8) continue;
        g.globalAlpha = Math.min(1, (8 - (J.tiempo - m.t)) / 2);
        g.font = `700 ${Math.round(12 * u)}px ${FUENTE_TEXTO}`; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.75)';
        const tx = `${nombreDe(m.id)}: ${m.txt}`;
        g.strokeText(tx, 14, yc); g.fillStyle = colorDe(m.id); g.fillText(tx, 14, yc); yc += 16 * u;
      }
      g.restore();
      // Información de la actividad
      if (act) {
        let linea = '', col = '#ffd23d', obj = null;
        const me2 = miPos();
        if (act.tipo === 'carrera') {
          const adelante = Object.values(remotos).filter((r) => r.e.rk > act.k).length;
          linea = act.retener ? 'CARRERA · prepárate' : `CARRERA · punto ${Math.min(act.k + 1, act.pts.length)}/${act.pts.length} · puesto ${adelante + 1}º`;
          col = '#ff3d81'; if (!act.hecho && !act.retener) obj = act.pts[act.k];
        } else if (act.tipo === 'poli') {
          const lad = act.ladron === Red.miId;
          linea = lad ? `LADRÓN · llega al refugio · ${Math.max(0, Math.round((act.t0 + act.dur * 1000 - Red.reloj()) / 1000))}s` : `POLICÍA · atrapa a ${nombreDe(act.ladron)}`;
          col = lad ? '#ff8a3d' : '#5c8dff';
          if (lad) obj = act.refugio; else { const rl = remotos[act.ladron]; if (rl && rl.tienePos) obj = rl; }
          if (act.arrestT > 0.3 && soyHost) linea += ` · arresto ${Math.round(act.arrestT / 2.5 * 100)}%`;
        } else if (act.tipo === 'coop') {
          linea = act.fase === 0 ? 'COOP · reúnanse en A' : 'COOP · todos al punto B'; obj = act.fase === 0 ? act.A : act.B;
        }
        g.save();
        g.font = `800 ${Math.round(13 * u)}px ${FUENTE}`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.8)';
        const yy = 12 + (J.seguro ? Math.max(0, J.seguro.t - 10) : 0) + 70 * u;
        g.strokeText(linea, W / 2, yy); g.fillStyle = col; g.fillText(linea, W / 2, yy);
        if (obj) {
          const m = Math.round(Math.hypot(obj.x - me2.x, obj.y - me2.y) / 16);
          g.font = `700 ${Math.round(11 * u)}px ${FUENTE_TEXTO}`; g.fillStyle = '#fff'; g.strokeText(`${m} m`, W / 2, yy + 16 * u); g.fillText(`${m} m`, W / 2, yy + 16 * u);
          const ps = J.aPantalla(me2.x, me2.y), os = J.aPantalla(obj.x, obj.y);
          const d = Math.hypot(os.x - ps.x, os.y - ps.y);
          if (d > 90 * u) {
            const ang = Math.atan2(os.y - ps.y, os.x - ps.x), rr = 70 * u;
            g.translate(ps.x + Math.cos(ang) * rr, ps.y + Math.sin(ang) * rr); g.rotate(ang);
            g.fillStyle = col; g.beginPath(); g.moveTo(14 * u, 0); g.lineTo(-8 * u, -10 * u); g.lineTo(-3 * u, 0); g.lineTo(-8 * u, 10 * u); g.closePath(); g.fill();
          }
        }
        g.restore();
      }
    },
  });

  // ----------------------------------------------------------- Red
  Red.on('mensaje', alMensaje);
  Red.on('chat', (de, texto) => {
    if (!activo || de === Red.miId) return;
    chat.push({ id: de, txt: texto, t: J.tiempo });
    if (chat.length > 5) chat.shift();
    if (remotos[de]) remotos[de].burbuja = { txt: texto, t: J.tiempo };
  });
  Red.on('jugadorSalio', (id) => { if (activo) { quitarRemoto(id); delete pts[id]; if (act && act.tipo === 'poli' && soyHost && (act.ladron === id)) finPoli('policia'); } });
  Red.on('jugadorUnido', (id, j) => { if (activo) J.pista(`${j.nombre} se unió`); });
  Red.on('cerrado', (motivo) => { if (activo) salir('La sala se cerró' + (motivo ? ': ' + motivo : '')); });
  window.addEventListener('pagehide', () => { try { Red.salir(); } catch (e) { /* nada */ } });

  const OPTS = {
    juego: 'Ciudad Libre', maxJugadores: 4, minJugadores: 1,
    modos: [{ id: 'libre', nombre: 'Mundo libre cooperativo' }, { id: 'carreras', nombre: 'Carreras callejeras' }, { id: 'policias', nombre: 'Policías y ladrones' }],
    alIniciar: (config, jugadores) => iniciar(config, jugadores),
  };

  function abrirLobby() { Lobby.abrir(OPTS); }

  return {
    get activo() { return activo; }, get modo() { return modo; }, OPTS, abrirLobby, abrirPanel, lanzar, decir, FRASES,
    remotos, pts, focos, subirA, bajarPasajero, golpeAPie, golpeCarro,
    enviarAlHost(t, d) { Red.enviar(t, d); },
    aPie() { return Object.values(remotos).filter((r) => r.tienePos && !r.e.v && !r.pasajero); },
    objetivoPolicia(c) {
      let mejor = null, md = Infinity;
      const cand = [miPos()];
      for (const id in remotos) { const r = remotos[id]; if (r.tienePos && !r.pasajero) cand.push(r); }
      for (const o of cand) { const d = Math.hypot(o.x - c.x, o.y - c.y); if (d < md) { md = d; mejor = o; } }
      return mejor || miPos();
    },
    get actividad() { return act; },
    get cuentaGente() { return gente.size; },
  };
})();

// Botones y enlace de invitación
(() => {
  const b = document.getElementById('bMulti');
  if (b) b.addEventListener('click', () => Multi.abrirLobby());
  const bp = document.getElementById('bMultiPausa');
  if (bp) bp.addEventListener('click', () => (Multi.activo ? Multi.abrirPanel() : Multi.abrirLobby()));
  if (window.Lobby) Lobby.registrar(Multi.OPTS); // invitaciones directas de amigos
  if (window.Lobby && Lobby.hayEnlace()) Lobby.abrir(Multi.OPTS);
})();
