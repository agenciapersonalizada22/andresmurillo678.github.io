// =============================================================
//  🌐  ONLINE
//  Partidas 1v1 por WebRTC (window.Red / window.Lobby). El anfitrión
//  es el árbitro: valida cada jugada con las reglas, lleva el reloj
//  autoritativo y retransmite. Los demás conectados son espectadores.
//  Mensajes (fiables): o_mov, o_estado, o_pedirEstado, o_fin, o_tablas,
//  o_rendir, o_deshacer, o_revancha, o_elo, o_flecha, o_aviso.
// =============================================================
import * as Cu from './cuenta.js';

const $ = (id) => document.getElementById(id);
const GRACIA = 60000;

export function iniciarOnline(ctx) {
  const { juego, partida, reloj, opts, ui, yo } = ctx;
  const Red = window.Red, Lobby = window.Lobby;
  const S = { activo: false, jugando: false, espectador: false, miColor: 0, idB: -1, idN: -1, nombres: ['', ''], colores: ['#fff', '#aaa'], extra: ['', ''], cfg: null, rival: '', eloRival: 1200, puntua: false, semilla: 0, estadoTxt: () => '', desc: null, ofertaTablas: 0, revancha: { yo: false, el: false }, fin: false };
  const api = { S, disponible: !!(Red && Lobby) };
  if (!api.disponible) { api.abrir = () => ui.toast('Multijugador no disponible'); return api; }

  const parse = (id) => { const o = {}; String(id || '').split('&').forEach((p) => { const [k, v] = p.split('='); o[k] = v; }); return { c: o.c || 'azar', r: o.r || 'sin', v: o.v || 'estandar', p: o.p === '1' }; };
  const idModo = (c) => `c=${c.c}&r=${c.r}&v=${c.v}&p=${c.p ? 1 : 0}`;
  const nombreDe = (id) => (Red.jugadores[id] ? Red.jugadores[id].nombre : 'Jugador');
  const idDeColor = (c) => (c === 0 ? S.idB : S.idN);

  // ---------------- configuración previa (solo el anfitrión)
  const cfgUI = { c: 'azar', r: '5+3', v: 'estandar', p: false };
  function pintarCfg() {
    const f = (campo, lista) => `<div class="fichas" data-c="${campo}">${lista.map(([v, n]) => `<button type="button" data-v="${v}" class="${String(cfgUI[campo]) === String(v) ? 'sel' : ''}">${n}</button>`).join('')}</div>`;
    $('onlineCuerpo').innerHTML = `<div class="campo"><label>Tu color</label>${f('c', [['blancas', 'BLANCAS'], ['negras', 'NEGRAS'], ['azar', 'AL AZAR']])}</div>
      <div class="campo"><label>Reloj</label><select id="onReloj">${['sin', '1+0', '1+1', '3+0', '3+2', '5+0', '5+3', '10+0', '10+5', '15+10', '30+0'].map((r) => `<option value="${r}" ${cfgUI.r === r ? 'selected' : ''}>${r === 'sin' ? 'Sin reloj' : r.replace('+', ' min + ') + ' s'}</option>`).join('')}</select></div>
      <div class="campo"><label>Variante</label>${f('v', [['estandar', 'ESTÁNDAR'], ['960', 'CHESS960']])}</div>
      <div class="campo"><label>Tipo</label>${f('p', [[false, 'AMISTOSA'], [true, 'PUNTÚA (ELO ONLINE)']])}<p class="info">En amistosa se puede deshacer con permiso del rival. El análisis del motor se desactiva durante la partida.</p></div>`;
  }
  $('onlineCuerpo').addEventListener('click', (e) => { const b = e.target.closest('button'); const f = b && b.closest('.fichas[data-c]'); if (f) { cfgUI[f.dataset.c] = f.dataset.c === 'p' ? b.dataset.v === 'true' : b.dataset.v; pintarCfg(); } });
  $('onlineCuerpo').addEventListener('change', (e) => { if (e.target.id === 'onReloj') cfgUI.r = e.target.value; });
  $('btnOnlineCerrar').addEventListener('click', () => ui.ocultar('Online'));
  // Mismas OPTS en todas las entradas al lobby (también las registradas para invitaciones de amigos)
  const optsLobby = (conModo) => ({ juego: 'Ajedrez 3D', maxJugadores: 4, minJugadores: 2, modos: conModo ? [{ id: idModo(cfgUI), nombre: `${cfgUI.c} · ${cfgUI.r} · ${cfgUI.v}${cfgUI.p ? ' · puntúa' : ''}` }] : [{ id: idModo(cfgUI), nombre: 'Partida' }], alIniciar: () => {} });
  if (Lobby.registrar) Lobby.registrar(optsLobby(false));
  const abrirLobby = (conModo) => {
    ui.ocultar('Online');
    Lobby.abrir(optsLobby(conModo));
  };
  $('btnOnlineIr').addEventListener('click', () => abrirLobby(true));
  $('btnOnlineUnir').addEventListener('click', () => abrirLobby(false));

  api.abrir = () => {
    if (S.activo && Red.conectado) { Lobby.abrir(optsLobby(false)); return; }
    if (Lobby.hayEnlace && Lobby.hayEnlace()) { abrirLobby(false); return; }
    pintarCfg(); ui.mostrar('Online');
  };
  api.menu = () => api.abrir();

  // ---------------- comienzo de la partida (todos los equipos)
  function empezar(config, jugs) {
    const c = parse(config.modo);
    const ids = jugs.map((j) => j.id).sort((a, b) => a - b);
    const otro = ids.find((i) => i !== 0);
    if (otro === undefined) { ui.toast('Falta un rival'); return; }
    const semilla = (config.semilla >>> 0) || 1;
    const colorAnf = c.c === 'blancas' ? 0 : c.c === 'negras' ? 1 : semilla % 2;
    S.idB = colorAnf === 0 ? 0 : otro; S.idN = colorAnf === 0 ? otro : 0;
    cfgUI.c = c.c; S.cfg = c; S.semilla = semilla; S.puntua = c.p;
    const fen = c.v === '960' ? ctx.fen960(semilla % 960) : ctx.FEN_INICIAL;
    arrancar({ fen, movs: [], r: null, relojId: c.r });
  }

  function arrancar({ fen, movs, r, relojId, tuColor }) {
    const mi = Red.miId;
    S.activo = true; S.jugando = true; S.fin = false; S.desc = null; S.ofertaTablas = 0; S.revancha = { yo: false, el: false };
    S.espectador = mi !== S.idB && mi !== S.idN;
    S.miColor = tuColor !== undefined ? tuColor : (mi === S.idB ? 0 : mi === S.idN ? 1 : 0);
    S.nombres = [nombreDe(S.idB), nombreDe(S.idN)];
    S.colores = [(Red.jugadores[S.idB] || {}).color || '#fff', (Red.jugadores[S.idN] || {}).color || '#aaa'];
    S.rival = S.espectador ? '' : nombreDe(S.miColor === 0 ? S.idN : S.idB);
    S.estadoTxt = () => {
      if (S.espectador) return `EN VIVO · TURNO ${partida.turno ? 'NEGRAS' : 'BLANCAS'}`;
      if (S.desc) return 'RIVAL DESCONECTADO';
      return partida.turno === S.miColor ? 'TU TURNO' : `TURNO DE ${S.rival.toUpperCase()}`;
    };
    ctx.iniciarPartida({
      fen, modo: 'online', nivel: 'medio', relojId: relojId || (S.cfg ? S.cfg.r : 'sin'), girarAuto: false, humano: S.miColor, jugadas: movs, online: S,
      nombres: [[S.nombres[0].toUpperCase(), S.nombres[1].toUpperCase()], [S.espectador ? 'Blancas' : (S.miColor === 0 ? 'Tú · blancas' : 'Blancas'), S.espectador ? 'Negras' : (S.miColor === 1 ? 'Tú · negras' : 'Negras')]],
      sinPuntuar: true, vistaInicial: S.miColor === 1 ? 'negras' : 'blancas',
    });
    juego.pgnMeta = { Event: S.puntua ? 'Partida online puntuada' : 'Partida online amistosa', White: S.nombres[0], Black: S.nombres[1] };
    if (r) { reloj.fijar(r); if (movs.length >= 1 && !juego.est.fin) reloj.iniciar(partida.turno); }
    Lobby.cerrar && Lobby.cerrar();
    if (!S.espectador) Red.enviar && (Red.esAnfitrion ? Red.difundir('o_elo', { elo: miElo(), id: Red.miId }) : Red.enviar('o_elo', { elo: miElo(), id: Red.miId }));
    ctx.refrescar();
    ui.toast(S.espectador ? 'Estás viendo la partida en vivo' : `Partida contra ${S.rival}${S.puntua ? ' (puntúa)' : ''}`);
  }
  const miElo = () => { try { return JSON.parse(localStorage.getItem('ajedrez_perfil_v1') || '{}').extra.eloOnline || 1200; } catch (e) { return 1200; } };

  Red.on('iniciar', (config, jugs) => empezar(config, jugs));

  // ---------------- jugadas
  function ajustarReloj(r, t) {
    if (!r || !reloj.habilitado) return;
    reloj.restante = [r[0], r[1]];
    if (reloj.activo) { reloj.t0 = performance.now(); const lag = Math.max(0, Math.min(3000, Red.reloj() - t)); reloj.restante[reloj.turno] = Math.max(1, reloj.restante[reloj.turno] - lag); }
    reloj.alCambiar(reloj.restante);
    juego.tiempos[partida.cursor] = [reloj.restante[0], reloj.restante[1]];
  }
  const estadoPaquete = (tuId) => ({ fen: partida.fenInicial, movs: partida.jugadas.map((j) => j.uci), r: [reloj.restante[0], reloj.restante[1]], relojId: juego.relojId, idB: S.idB, idN: S.idN, puntua: S.puntua, cfg: S.cfg, semilla: S.semilla, fin: juego.est.fin ? { fin: juego.est.fin, ganador: juego.est.ganador } : null, tuColor: tuId === S.idB ? 0 : tuId === S.idN ? 1 : -1 });

  api.alJugar = ({ uci, origen }) => {
    if (!S.jugando || (origen !== 'local' && origen !== 'premov')) return;
    const msg = { uci, n: partida.cursor, h: partida.pos.hLo, r: [reloj.restante[0], reloj.restante[1]], t: Red.reloj(), de: Red.miId };
    if (Red.esAnfitrion) Red.difundir('o_mov', msg); else Red.enviar('o_mov', msg);
  };

  function alMensaje(tipo, d, de) {
    if (!S.activo) { if (tipo === 'o_estado') alEstado(d); return; }
    switch (tipo) {
      case 'o_mov': return alMov(d, de);
      case 'o_estado': return alEstado(d);
      case 'o_pedirEstado': if (Red.esAnfitrion) Red.enviar('o_estado', estadoPaquete(de), { a: de }); return;
      case 'o_fin': return alFinRemoto(d);
      case 'o_tablas': return alTablas(d);
      case 'o_rendir': if (Red.esAnfitrion && S.jugando && (de === S.idB || de === S.idN)) terminar('rendicion', (de === S.idB ? 0 : 1) ^ 1); return;
      case 'o_deshacer': return alDeshacer(d);
      case 'o_revancha': return alRevancha(d);
      case 'o_elo': if (d.id !== Red.miId) S.eloRival = d.elo; return;
      case 'o_flecha': if (opts.flechasDerecho !== false) ctx.flechas().alternar(d.a, d.b, '#ffb020'); return;
      case 'o_aviso': ui.toast(d.t); return;
      case 'o_banderin': if (Red.esAnfitrion && S.jugando && reloj.restante[d.c] < 1500) terminar('tiempo', d.c ^ 1); return;
      default: return;
    }
  }
  Red.on('mensaje', alMensaje);

  function alMov(d, de) {
    if (!S.jugando) return;
    if (Red.esAnfitrion) {
      const color = de === S.idB ? 0 : de === S.idN ? 1 : -1;
      if (color < 0 || color !== partida.turno || d.n !== partida.cursor + 1) { Red.enviar('o_estado', estadoPaquete(de), { a: de }); return; }
      if (!partida.alFinal) ctx.irAPly(partida.jugadas.length);
      const antes = reloj.restante[color];
      if (!ctx.recibirJugada(d.uci, 'online')) { Red.enviar('o_estado', estadoPaquete(de), { a: de }); return; }
      if (reloj.habilitado && d.r) { const tope = reloj.restante[color] + 3000; reloj.restante[color] = Math.max(0, Math.min(d.r[color], tope)); void antes; }
      Red.difundir('o_mov', { uci: d.uci, n: partida.cursor, h: partida.pos.hLo, r: [reloj.restante[0], reloj.restante[1]], t: Red.reloj(), de });
      return;
    }
    // amigo o espectador
    if (d.de === Red.miId) { ajustarReloj(d.r, d.t); return; }
    if (!partida.alFinal) ctx.irAPly(partida.jugadas.length);
    if (partida.cursor + 1 !== d.n) { Red.enviar('o_pedirEstado', {}); return; }
    if (!ctx.recibirJugada(d.uci, 'remoto')) { Red.enviar('o_pedirEstado', {}); return; }
    ajustarReloj(d.r, d.t);
    if (d.h !== partida.pos.hLo) Red.enviar('o_pedirEstado', {});
  }

  function alEstado(d) {
    S.idB = d.idB; S.idN = d.idN; S.cfg = d.cfg || S.cfg || parse(''); S.puntua = !!d.puntua; S.semilla = d.semilla;
    const mia = d.tuColor;
    arrancar({ fen: d.fen, movs: d.movs, r: d.r, relojId: d.relojId, tuColor: mia >= 0 ? mia : undefined });
    if (d.fin) { partida.terminar(d.fin.fin, d.fin.ganador); juego.est = partida.estado(); ctx.finalizar(juego.est); }
  }

  // ---------------- fin de la partida
  function terminar(fin, ganador) { // solo anfitrión
    if (juego.est.fin) return;
    Red.difundir('o_fin', { fin, ganador });
    aplicarFin({ fin, ganador });
  }
  function aplicarFin(d) {
    if (juego.est.fin) return;
    partida.terminar(d.fin, d.ganador);
    juego.est = partida.estado();
    ctx.finalizar(juego.est);
  }
  const alFinRemoto = (d) => aplicarFin(d);
  api.tiempoAgotado = (color) => {
    if (Red.esAnfitrion) terminar('tiempo', color ^ 1);
    else setTimeout(() => { if (!juego.est.fin) Red.enviar('o_banderin', { c: color }); }, 1500);
  };
  api.rendirse = () => { if (Red.esAnfitrion) terminar('rendicion', S.miColor ^ 1); else Red.enviar('o_rendir', {}); };

  api.alFin = (est, t, res) => {
    S.jugando = false;
    if (S.espectador) return '';
    ctx.logro('online');
    const r = ctx.Perfil.registrarPartida({ res, rival: S.rival, eloRival: S.eloRival || 1200, puntua: S.puntua && partida.jugadas.length >= 4, online: true, modo: 'online', eco: '', apertura: '' });
    Cu.reportarElos();
    Cu.xpPartida({ res, eloRival: S.eloRival || 1200, puntua: S.puntua && partida.jugadas.length >= 4, jugadas: partida.jugadas.length, online: true });
    return S.puntua && partida.jugadas.length >= 4 ? `Elo online ${r.elo} (${r.delta >= 0 ? '+' : ''}${r.delta})` : 'Partida amistosa: no cambia tu Elo.';
  };
  api.finDeJuego = () => { S.jugando = false; };
  api.puedeRevancha = () => !S.espectador && Red.conectado;

  // ---------------- mensajes al rival (el anfitrión es siempre uno de los dos jugadores)
  const rivalId = () => (S.miColor === 0 ? S.idN : S.idB);
  const aRival = (tipo, d) => (Red.esAnfitrion ? Red.enviar(tipo, d, { a: rivalId() }) : Red.enviar(tipo, d));

  // ---------------- tablas
  api.ofrecerTablas = () => {
    if (S.espectador || juego.est.fin) return;
    ui.toast('Oferta de tablas enviada');
    aRival('o_tablas', { a: 'ofrecer' });
  };
  async function alTablas(d) {
    if (S.espectador) return;
    if (d.a === 'ofrecer') {
      const si = await ui.confirmar('OFERTA DE TABLAS', `${S.rival} ofrece tablas. ¿Aceptas?`, 'ACEPTAR', 'RECHAZAR');
      aRival('o_tablas', { a: si ? 'si' : 'no' });
      if (si && Red.esAnfitrion) terminar('acuerdo', -1);
    } else if (d.a === 'si') { if (Red.esAnfitrion) terminar('acuerdo', -1); }
    else if (d.a === 'no') ui.toast('Tablas rechazadas');
  }

  // ---------------- deshacer con permiso (solo amistosas)
  api.pedirDeshacer = () => {
    if (S.puntua || S.espectador || !partida.jugadas.length || juego.est.fin) { ui.toast(S.puntua ? 'En partidas puntuadas no se puede deshacer' : 'Nada que deshacer'); return; }
    const n = Math.max(0, partida.jugadas.length - (partida.turno === S.miColor ? 2 : 1));
    ui.toast('Petición enviada al rival');
    aRival('o_deshacer', { a: 'pedir', n });
  };
  async function alDeshacer(d) {
    if (S.puntua) return;
    if (d.a === 'pedir') {
      if (S.espectador) return;
      const si = await ui.confirmar('DESHACER', `${S.rival} pide deshacer su última jugada. ¿Lo permites?`, 'PERMITIR', 'NO');
      if (!si) { aRival('o_deshacer', { a: 'no' }); return; }
      if (Red.esAnfitrion) { Red.difundir('o_deshacer', { a: 'ok', n: d.n }); aplicarDeshacer(d.n); } else Red.enviar('o_deshacer', { a: 'ok', n: d.n });
    } else if (d.a === 'ok') {
      if (Red.esAnfitrion) Red.difundir('o_deshacer', d);
      aplicarDeshacer(d.n);
    } else if (d.a === 'no') ui.toast('El rival no permite deshacer');
  }
  function aplicarDeshacer(n) { ctx.truncarA(n); if (reloj.habilitado && partida.cursor >= 1) reloj.iniciar(partida.turno); else reloj.detener(); }

  // ---------------- revancha (colores invertidos)
  api.revancha = () => {
    if (S.espectador) return;
    S.revancha.yo = true; ui.toast('Revancha propuesta');
    aRival('o_revancha', { a: 'pedir' });
    if (S.revancha.el) lanzarRevancha();
  };
  function alRevancha(d) {
    if (d.a === 'nueva') { arrancarRevancha(d.semilla); return; }
    S.revancha.el = true; ui.toast(`${S.rival} quiere la revancha`);
    if (S.revancha.yo) lanzarRevancha();
  }
  function lanzarRevancha() {
    if (!Red.esAnfitrion) return;
    const semilla = (Math.random() * 4e9) >>> 0 || 7;
    Red.difundir('o_revancha', { a: 'nueva', semilla });
    arrancarRevancha(semilla);
  }
  function arrancarRevancha(semilla) {
    [S.idB, S.idN] = [S.idN, S.idB];
    S.semilla = semilla;
    ui.ocultar('Fin');
    arrancar({ fen: S.cfg && S.cfg.v === '960' ? ctx.fen960(semilla % 960) : ctx.FEN_INICIAL, movs: [], r: null, relojId: S.cfg ? S.cfg.r : 'sin' });
  }

  // ---------------- conexiones y desconexiones
  Red.on('jugadorUnido', (id, j) => {
    if (!Red.esAnfitrion || !S.activo) return;
    if (S.jugando && S.desc && j.nombre === S.desc.nombre) { // reconexión del mismo jugador
      if (S.desc.color === 0) S.idB = id; else S.idN = id;
      S.desc = null;
      Red.difundir('o_aviso', { t: `${j.nombre} volvió a la partida` });
    }
    setTimeout(() => { if (S.jugando || partida.jugadas.length) Red.enviar('o_estado', estadoPaquete(id), { a: id }); }, 600);
  });
  Red.on('jugadorSalio', (id, j) => {
    if (!S.activo || !S.jugando || !Red.esAnfitrion) return;
    if (id !== S.idB && id !== S.idN) return;
    const color = id === S.idB ? 0 : 1;
    S.desc = { color, nombre: (j && j.nombre) || nombreDe(id), hasta: Date.now() + GRACIA };
    Red.difundir('o_aviso', { t: `${S.desc.nombre} se desconectó: espera hasta 60 s` });
    ui.toast(`${S.desc.nombre} se desconectó (60 s para volver)`);
    ctx.refrescar();
    const d = S.desc;
    setTimeout(() => { if (S.desc === d && S.jugando) terminar('abandono', color ^ 1); }, GRACIA);
  });
  Red.on('cerrado', () => {
    if (!S.activo || !S.jugando || Red.esAnfitrion) return;
    ui.toast('Se perdió la conexión con el anfitrión');
    const t = setTimeout(() => { if (S.jugando && !Red.conectado && !S.espectador) { S.jugando = false; aplicarFin({ fin: 'abandono', ganador: S.miColor }); } }, GRACIA);
    void t;
  });
  Red.on('estado', () => {});

  // ping en la tarjeta de cada jugador
  setInterval(() => {
    if (!S.activo || !Red.conectado) return;
    const p = (id) => { const j = Red.jugadores[id]; return j && j.ping != null ? `${Math.round(j.ping)} ms` : ''; };
    const nuevo = [p(S.idB), p(S.idN)];
    if (nuevo.join() !== S.extra.join()) { S.extra = nuevo; if (juego.modo === 'online') ctx.refrescar(); }
  }, 2500);

  // chat con frases rápidas
  const chat = document.createElement('div');
  chat.id = 'chatOnline'; chat.className = 'oculto';
  chat.innerHTML = '<button type="button" id="chatBtn" aria-label="Chat">💬</button><div id="chatPanel" class="oculto"><div id="chatLog"></div><div id="chatRapido"></div><div class="fila-in"><input id="chatIn" type="text" maxlength="140" placeholder="Escribe un mensaje" autocomplete="off"><button type="button" id="chatEnviar" class="chico">▶</button></div></div>';
  document.body.appendChild(chat);
  const FRASES = ['¡Buena jugada!', '¡Buena suerte!', 'Gracias por la partida', '¿Tablas?', 'Un momento…', '¡Ups!'];
  $('chatRapido').innerHTML = FRASES.map((f) => `<button type="button" class="chico">${f}</button>`).join('');
  const enviarChat = (t) => { t = String(t).trim(); if (t) Red.chat(t); $('chatIn').value = ''; };
  chat.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'chatBtn') { $('chatPanel').classList.toggle('oculto'); chat.classList.remove('nuevo'); }
    else if (b.id === 'chatEnviar') enviarChat($('chatIn').value);
    else if (b.closest('#chatRapido')) enviarChat(b.textContent);
  });
  $('chatIn').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') enviarChat($('chatIn').value); });
  Red.on('chat', (id, texto, jug) => {
    const l = $('chatLog'); const p = document.createElement('p');
    p.innerHTML = `<b style="color:${(jug && jug.color) || '#3df5ff'}"></b> `; p.firstChild.textContent = ((jug && jug.nombre) || nombreDe(id)) + ':'; p.appendChild(document.createTextNode(' ' + texto));
    l.appendChild(p); l.scrollTop = l.scrollHeight;
    if ($('chatPanel').classList.contains('oculto')) chat.classList.add('nuevo');
  });
  setInterval(() => chat.classList.toggle('oculto', !(S.activo && Red.conectado)), 800);

  // flechas visibles para el rival (opcional)
  api.enviarFlecha = (a, b) => { if (S.activo && Red.conectado) { if (Red.esAnfitrion) Red.difundir('o_flecha', { a, b }); else Red.enviar('o_flecha', { a, b }); } };
  window.addEventListener('pagehide', () => { try { Red.salir(); } catch (e) { /* nada */ } });
  return api;
}
