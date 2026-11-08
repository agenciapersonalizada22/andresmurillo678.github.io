// Multijugador (anfitrion autoritativo): sincroniza apuntado, tiros y resultados; asientos con token para reconectar tras recargar.
import { Partida } from './partida.js';
import { CLAVES, leer, escribir, borrar } from './almacen.js';

const Red = window.Red;
const aviso = (t, c) => { try { window.Lobby && window.Lobby.aviso(t, c); } catch (e) { /* sin lobby */ } };
const token = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const compacto = (ap) => Red.compactar({ ang: ap.ang, pot: ap.pot, a: ap.a, b: ap.b, mano: ap.mano ? { x: ap.mano.x, y: ap.mano.y } : null }, 4);

export const Sesion = {
  rol: 'local', miSeat: -1, setup: null, alEstado: () => {}, alReiniciar: () => {}, _holas: [], _conectado: false,

  get online() { return Sesion.rol !== 'local'; },

  conectar() {
    if (Sesion._conectado || !Red) return;
    Sesion._conectado = true;
    Red.on('mensaje', (tipo, d, de) => Sesion._mensaje(tipo, d, de));
    Red.on('jugadorSalio', (id, j) => {
      if (Sesion.rol !== 'anfitrion' || !Partida.activa) return;
      const i = Partida.asientos.findIndex((a) => a.redId === id);
      if (i < 0) return;
      Partida.asientos[i].redId = null; Partida.asientos[i].ausente = true;
      aviso(((j && j.nombre) || 'Un jugador') + ' se desconectó. Puede volver con un enlace nuevo (menú Pausa > Invitar).', '#ff8a4a');
      Sesion.alEstado(); Partida.gancho.guardar();
    });
    Red.on('cerrado', () => { if (Sesion.rol === 'cliente') Sesion.alReiniciar('El anfitrión cerró la sala.'); });
  },

  /* ---------- anfitrion ---------- */
  anfitrionIniciar(config, jugadores, setup) {
    Sesion.rol = 'anfitrion'; Sesion.setup = setup;
    if (Partida.activa && Partida.cfg && Partida.cfg.online) { Sesion._procesarHolas(); return 'reanudada'; }
    const n = Math.max(2, Math.min(setup.n || 2, setup.max));
    const asientos = jugadores.slice(0, setup.max).map((j) => ({ tipo: j.id === Red.miId ? 'local' : 'remoto', nombre: j.nombre, color: j.color, redId: j.id, token: j.id === Red.miId ? null : token() }));
    const colores = ['#ff9f43', '#54a0ff', '#ff6b6b', '#feca57'];
    while (asientos.length < n) { const k = asientos.length; asientos.push({ tipo: 'bot', nombre: 'Bot ' + k, color: colores[k % 4], nivel: setup.nivel || 2 }); }
    Partida.nueva({ modo: config.modo, semilla: config.semilla, objetivo: setup.objetivo || 15, online: true, anfitrion: true }, asientos);
    Sesion._procesarHolas();
    return 'nueva';
  },
  anfitrionRestaurado(g) {
    Sesion.rol = 'anfitrion';
    g.asientos.forEach((a) => { if (a.tipo === 'remoto') a.ausente = true; if (a.tipo === 'local') a.redId = Red && Red.miId != null ? Red.miId : 0; });
    Partida.restaurar({ ...g, cfg: { ...g.cfg, anfitrion: true, online: true } });
  },
  _procesarHolas() { const l = Sesion._holas.splice(0); l.forEach(([d, de]) => Sesion._hola(d, de)); },
  _hola(d, de) {
    if (!Partida.activa) { Sesion._holas.push([d, de]); return; }
    const as = Partida.asientos;
    let i = as.findIndex((a) => a.token && d.token && a.token === d.token);
    if (i < 0) i = as.findIndex((a) => a.redId === de && a.tipo === 'remoto');
    if (i < 0) i = as.findIndex((a) => a.tipo === 'remoto' && !a.redId);
    if (i < 0) i = as.findIndex((a) => a.tipo === 'bot' && a.sustituto);
    if (i < 0) { Red.enviar('lleno', {}, { a: de }); return; }
    const a = as[i];
    a.tipo = 'remoto'; a.redId = de; a.ausente = false; a.sustituto = false; a.token = a.token || token();
    const j = Red.jugadores[de]; if (j) { a.nombre = j.nombre; a.color = j.color; }
    Sesion._enviarInicio(de, i);
    Sesion.alEstado();
  },
  _enviarInicio(de, i) {
    const st = Partida.estadoRed();
    st.asientos = st.asientos.map((a) => ({ tipo: a.tipo, nombre: a.nombre, color: a.color, nivel: a.nivel, redId: a.redId, ausente: !!a.ausente }));
    Red.enviar('inicio', { ...st, yo: i, token: Partida.asientos[i].token }, { a: de });
  },
  sustituirPorBot(i) {
    const a = Partida.asientos[i]; if (!a || Sesion.rol !== 'anfitrion') return;
    a.tipo = 'bot'; a.redId = null; a.nivel = (Sesion.setup && Sesion.setup.nivel) || 2; a.sustituto = true; a.ausente = false;
    if (a.nombre && !/^Bot/.test(a.nombre)) a.nombre = 'Bot (' + a.nombre + ')';
    Sesion.alEstado();
    if (Partida.fase === 'espera' && Partida.E.turno === i) Partida._pensar();
  },

  /* ---------- cliente ---------- */
  clienteIniciar() {
    Sesion.rol = 'cliente'; Sesion.miSeat = -1;
    const g = leer(CLAVES.asiento, {});
    Red.enviar('hola', { token: g.token || null, nombre: (Red.perfil.obtener() || {}).nombre });
  },

  /* ---------- mensajes ---------- */
  _mensaje(tipo, d, de) {
    if (tipo === 'hola' && Sesion.rol === 'anfitrion') Sesion._hola(d, de);
    else if (tipo === 'inicio' && Sesion.rol === 'cliente') {
      escribir(CLAVES.asiento, { token: d.token, seat: d.yo, t: Date.now() });
      Sesion.miSeat = d.yo;
      const asientos = d.asientos.map((a, k) => ({ ...a, tipo: k === d.yo ? 'local' : (a.tipo === 'bot' ? 'bot' : 'remoto') }));
      Partida.restaurar({ cfg: { ...d.cfg, anfitrion: false, online: true }, asientos, E: d.E, snap: d.snap, stats: d.stats });
      Sesion.alEstado('inicio');
    } else if (tipo === 'lleno') Sesion.alReiniciar('La partida está completa.');
    else if (tipo === 'apunta') {
      if (Sesion.rol === 'anfitrion' && !Sesion._deSeat(de, d.s)) return;
      if (Partida.asientos[d.s] && Partida.asientos[d.s].tipo !== 'local') Partida.apuntaRemoto(d.s, d.ap);
    } else if (tipo === 'tiro') {
      if (Sesion.rol === 'anfitrion' && !Sesion._deSeat(de, d.t.seat)) return;
      Partida.tiroRemoto(d.t);
    } else if (tipo === 'res' && Sesion.rol === 'cliente') Partida.aplicarResultado(d);
    else if (tipo === 'revancha' && Sesion.rol === 'cliente') Sesion.alEstado('revancha');
  },
  _deSeat(de, s) { const a = Partida.asientos[s]; return !!a && a.redId === de; },

  /* ---------- ganchos de Partida ---------- */
  tiro(t) { if (Sesion.online && Red && Red.conectado) Red.difundir('tiro', { t }, { fiable: true }); },
  apunta(ap) {
    if (!(Sesion.online && Red && Red.conectado)) return;
    const a = Partida.asientoTurno();
    if (Partida.turnoLocal() || (Sesion.rol === 'anfitrion' && a.tipo === 'bot')) Red.difundir('apunta', { s: Partida.E.turno, ap: compacto(ap) }, { fiable: false });
  },
  resultado(m) { if (Sesion.rol === 'anfitrion' && Red && Red.conectado) Red.difundir('res', m, { fiable: true }); },
  salir() { Sesion.rol = 'local'; Sesion.miSeat = -1; borrar(CLAVES.asiento); try { if (Red && Red.conectado) Red.salir(); } catch (e) { /* ya cerrada */ } }
};
