// Orquestador: bucle principal, menus, flujo de partidas, red (Lobby) y cuenta.
import { h, $ } from './dom.js';
import { A, P, guardarProgreso, aplicarPreset, partidaGuardada, salaGuardada, recargarProgreso, guardarAjustes } from './almacen.js';
import { crearRender } from './render.js';
import { crearEntrada } from './entrada.js';
import { crearPartida } from './partida.js';
import { Nav } from './nav.js';
import { S, musica, volumenes, desbloquear } from './sonido.js';
import { UI, iniciarUI, modal, btn, toast, cerrarTodos, cerrarTope, capaTope, ayuda, tienda, logros, estadisticas, ranking, configBot, config2P, reto, torneo } from './ui.js';
import { abrirAjustes, hooks as hooksAj } from './ajustes.js';
import * as PR from './progreso.js';
import * as CH from './cuenta-hockey.js';

const D = window.HkDatos, Red = window.Red, Lobby = window.Lobby, Mando = window.Mando, F = window.HkFisica;
const canvas = $('#cv'), menu = $('#menu'), juego = $('#juego'), pausaBtn = $('#bPausa');
let enJuego = false, reanudarSala = null, ultimoSpec = null;

iniciarUI();
CH.aplicarPerfil();
document.body.classList.toggle('texto-grande', A.acc.texto);
document.body.classList.toggle('reducir', A.acc.reducir);

const render = crearRender(canvas);
const entrada = crearEntrada(canvas, render);
entrada.bloqueado = () => UI.modalAbierto() || (Lobby && Lobby.abierto);
entrada.activa = true;
const partida = crearPartida(render, entrada, {
  alFin: (res) => finPartida(res),
  pausa: () => abrirPausa(),
  gol: () => {}
});

/* ---------- navegacion con mando/teclado ---------- */
Nav.activa = () => !enJuego || UI.modalAbierto();
Nav.usar(() => capaTope() || (enJuego ? null : menu), () => { if (UI.modalAbierto()) cerrarTope(); });

/* ---------- menu principal ---------- */
function pintarMenu() {
  const l = $('#listaMenu'); l.textContent = '';
  $('#monedas').textContent = 'Monedas: ' + P.monedas;
  const add = (t, sub, fn, cls) => l.appendChild(h('button', { type: 'button', cls: 'entrada ' + (cls || ''), 'data-f': 1, on: { click: () => { S.clic(); fn(); } } }, [h('b', { txt: t }), h('small', { txt: sub })]));
  const g = partidaGuardada.leer();
  if (g && g.spec) add('Continuar partida', (D.DIFS[g.spec.dif] || '') + ' · ' + g.spec.marcador.join(' - '), () => { partida.iniciar(g.spec); entrarJuego(g.spec); }, 'dest');
  const sala = salaGuardada.leer();
  if (sala && Red && Lobby) add('Reanudar sala en línea', 'Marcador guardado ' + (sala.marcador || [0, 0]).join(' - ') + ' · invita de nuevo a tu amigo', () => abrirLobby(sala), 'dest');
  add('1 contra Bot', '4 dificultades', () => configBot(empezar));
  add('1 contra 1 en línea', 'Con un amigo, tiempo real', () => abrirLobby(null));
  add('2 jugadores', 'Pantalla dividida en un teléfono', () => config2P(empezar));
  add('Torneo', P.torneo ? 'Torneo en curso' : 'Cuartos, semifinal y final', () => torneo(empezar));
  add('Reto', 'Obstáculos y power-ups · ' + P.reto.max + '/' + D.RETOS.length, () => reto(empezar));
  const f = h('div', { cls: 'fila-doble' });
  [['Tienda', tienda], ['Ranking', ranking], ['Logros', logros], ['Estadísticas', estadisticas]].forEach(([t, fn]) => f.appendChild(h('button', { type: 'button', cls: 'entrada', 'data-f': 1, on: { click: () => { S.clic(); fn(); } } }, [h('b', { txt: t })])));
  l.appendChild(f);
  const u = CH.usuario(), linea = $('#cuentaLinea'); linea.textContent = '';
  if (u) { linea.hidden = false; linea.appendChild(h('button', { type: 'button', cls: 'cuenta-chip', 'data-f': 1, txt: (u.nombre || u.usuario) + (u.nivel ? ' · Nv ' + u.nivel : '') + ' · Cuenta', on: { click: () => modal('Cuenta', (c) => { c.appendChild(CH.bloqueNube()); c.appendChild(btn('Ver rankings', () => { cerrarTope(); ranking(); })); c.appendChild(h('a', { cls: 'btn sec', href: '../', txt: 'Volver al portal', 'data-f': 1 })); }) } })); } else linea.hidden = true;
}

function entrarJuego(spec) {
  enJuego = true; ultimoSpec = spec;
  document.body.className = document.body.className.replace('en-menu', 'en-juego');
  menu.hidden = true; juego.hidden = false; pausaBtn.hidden = false;
  render.medir(); desbloquear(); musica(true); pedirWake();
  const tactil = navigator.maxTouchPoints > 0 && entrada.ultimo === 'tactil';
  if (A.acc.ayuda && P.stats.partidas < 4) {
    const txt = Mando && Mando.conectado ? 'Stick izquierdo: mover el mazo · Menú: pausa' : tactil ? 'Arrastra el dedo por tu mitad (abajo) para mover el mazo' : 'Mueve el ratón sobre la mesa · o WASD / flechas';
    const p = $('#pista'); p.textContent = (spec.modo === 'local' ? 'Cada jugador toca su mitad · ' : '') + txt; p.hidden = false; setTimeout(() => { p.hidden = true; }, 5500);
  }
  Nav.refrescar && Nav.refrescar();
}
function salirAlMenu() {
  partida.detener(); enJuego = false; ultimoSpec = null;
  document.body.className = document.body.className.replace('en-juego', 'en-menu');
  juego.hidden = true; menu.hidden = false; pausaBtn.hidden = true; $('#pista').hidden = true;
  soltarWake(); musica(false); cerrarTodos(); pintarMenu();
}
function empezar(spec) {
  const base = { modo: 'bot', rol: 'local', yo: 0, mesa: P.sel.mesa, disco: P.sel.disco, miColor: CH.colorJugador(), obst: [], items: false };
  const s = Object.assign(base, spec);
  partida.iniciar(s); entrarJuego(s);
}

/* ---------- pausa y fin ---------- */
function abrirPausa() {
  if (!enJuego || partida.fase === 'fin' || UI.modalAbierto()) return;
  const sp = partida.spec, online = sp && sp.rol !== 'local';
  partida.pausar(true);
  modal('Pausa', (c) => {
    if (online) c.appendChild(h('p', { cls: 'nota', txt: 'En línea la partida sigue mientras miras el menú.' }));
    c.appendChild(btn('Continuar', () => cerrarTope(), 'grande'));
    c.appendChild(btn('Ajustes', () => abrirAjustes()));
    c.appendChild(btn('Cómo jugar', () => ayuda(), 'sec'));
    if (!online) c.appendChild(btn('Reiniciar partida', () => { cerrarTodos(); empezar(Object.assign({}, sp, { marcador: null })); }, 'sec'));
    c.appendChild(btn('Abandonar partida', () => { if (online && Red.conectado) { if (sp.rol === 'host') Red.difundir('hk_salir', {}); else Red.enviar('hk_salir', {}, { a: 0 }); } partidaGuardada.borrar(); salirAlMenu(); }, 'peligro'));
  }, { alCerrar: () => partida.pausar(false) });
}
pausaBtn.addEventListener('click', abrirPausa);

function finPartida(res) {
  const sp = res.spec; let r = { monedas: 0 }, bono = 0, extra = '';
  if (res.razon === 'abandono') extra = 'Tu rival se desconectó.';
  else {
    const antes = Object.keys(P.logros).length;
    r = PR.registrar(res);
    if (sp.modo === 'torneo') PR.cerrarRonda(res.gane);
    if (sp.modo === 'reto' && res.gane) bono = PR.retoGanado(sp.retoIdx);
    void antes;
  }
  const local = sp.modo === 'local', gan = res.gane;
  modal(local ? 'Fin del partido' : gan ? 'Victoria' : 'Derrota', (c, api) => {
    const t = local ? (res.ganador === 0 ? 'Gana ' + sp.nombres[0] : 'Gana ' + sp.nombres[1]) : gan ? '¡Ganaste!' : 'Perdiste';
    c.appendChild(h('div', { cls: 'fin-res' }, [h('h3', { cls: gan || local ? 'gana' : 'pierde', txt: t }), h('div', { cls: 'pts', txt: res.marcador[0] + ' - ' + res.marcador[1] }),
      r.monedas || bono ? h('p', { cls: 'monedas', txt: '+' + (r.monedas + bono) + ' monedas' + (bono ? ' (incluye bono de nivel)' : '') }) : null, extra ? h('p', { cls: 'nota', txt: extra }) : null, r.nota ? h('p', { cls: 'nota', txt: r.nota }) : null]));
    const online = sp.rol !== 'local';
    if (sp.modo === 'torneo') c.appendChild(btn('Continuar torneo', () => { api.cerrar(); salirAlMenu(); torneo(empezar); }, 'grande'));
    else if (sp.modo === 'reto') {
      if (gan && sp.retoIdx + 1 < D.RETOS.length) { const n = D.RETOS[sp.retoIdx + 1]; c.appendChild(btn('Siguiente nivel', () => { api.cerrar(); empezar({ modo: 'reto', dif: n.bot, meta: n.meta, obst: n.obst, items: true, retoIdx: sp.retoIdx + 1, nombres: [sp.nombres[0], 'Bot ' + D.DIFS[n.bot]] }); }, 'grande')); }
      c.appendChild(btn(gan ? 'Repetir nivel' : 'Reintentar', () => { api.cerrar(); empezar(Object.assign({}, sp, { marcador: null })); }, gan ? 'sec' : 'grande'));
    } else if (online) {
      if (sp.rol === 'host' && res.razon !== 'abandono') c.appendChild(btn('Revancha', () => { api.cerrar(); salaGuardada.borrar(); lanzarOnline(Red.lista ? Red.lista() : null); }, 'grande'));
      else if (res.razon !== 'abandono') c.appendChild(h('p', { cls: 'nota', txt: 'Esperando la revancha del anfitrión… (o vuelve al menú)' }));
    } else c.appendChild(btn('Revancha', () => { api.cerrar(); empezar(Object.assign({}, sp, { marcador: null })); }, 'grande'));
    c.appendChild(btn('Menú principal', () => { api.cerrar(); salirAlMenu(); }, 'sec'));
  }, { cerrable: false });
  Nav.refrescar && Nav.refrescar();
}

/* ---------- en linea ---------- */
function opcionesLobby() {
  return { juego: 'Hockey de mesa', maxJugadores: 2, modos: [{ id: '1v1', nombre: '1 contra 1' }], alIniciar: (cfg, jug) => { if (Red.esAnfitrion) lanzarOnline(jug); } };
}
function abrirLobby(sala) {
  if (!Lobby || !Red) { toast('El modo en línea no está disponible'); return; }
  reanudarSala = sala; cerrarTodos(); Lobby.abrir(opcionesLobby());
}
function lanzarOnline(jug) {
  const lista = jug && jug.length ? jug : Object.keys(Red.jugadores).map((k) => Object.assign({ id: +k }, Red.jugadores[k]));
  const a = lista.find((j) => j.id === 0) || lista[0], b = lista.find((j) => j.id !== 0) || lista[1] || { nombre: 'Rival', color: '#ff4fd8' };
  let ca = a.color, cb = b.color; if (ca === cb) { ca = '#3df5ff'; cb = '#ff4fd8'; }
  const datos = { mesa: P.sel.mesa, disco: P.sel.disco, meta: reanudarSala ? reanudarSala.meta : 7, nombres: [a.nombre, b.nombre], colores: [ca, cb], marcador: reanudarSala ? reanudarSala.marcador : [0, 0] };
  reanudarSala = null;
  Red.difundir('hk_inicio', datos);
  const s = Object.assign({ modo: 'online', rol: 'host', yo: 0, obst: [], items: false }, datos);
  partida.iniciar(s); entrarJuego(s);
}
if (Red) {
  Red.on('mensaje', (tipo, d, de) => {
    if (tipo === 'hk_inicio' && !Red.esAnfitrion) {
      cerrarTodos(); const s = Object.assign({ modo: 'online', rol: 'guest', yo: 1, obst: [], items: false }, d);
      partida.iniciar(s); entrarJuego(s);
    } else if (tipo === 'hk_salir' && partida.spec && partida.spec.rol !== 'local') partida.fin(partida.spec.yo, 'abandono');
    else if (typeof tipo === 'string' && tipo.startsWith('hk_')) partida.recibir(tipo, d);
  });
  const caida = () => { if (partida.spec && partida.spec.rol !== 'local' && partida.fase === 'juego') partida.fin(partida.spec.yo, 'abandono'); };
  Red.on('jugadorSalio', caida); Red.on('cerrado', caida);
}
addEventListener('pagehide', () => { partida.guardar(); try { if (Red && Red.conectado) Red.salir(); } catch (e) { /* ok */ } });

/* ---------- pantalla completa y wake lock ---------- */
$('#bPantalla').addEventListener('click', () => { const d = document; if (d.fullscreenElement) d.exitFullscreen(); else (d.documentElement.requestFullscreen || (() => toast('Pantalla completa no disponible')))(); });
$('#bSonido').addEventListener('click', () => { A.audio.mute = !A.audio.mute; guardarAjustes(); volumenes(); $('#bSonido').textContent = A.audio.mute ? '✕' : '♪'; });
$('#bSonido').textContent = A.audio.mute ? '✕' : '♪';
$('#bAjustes').addEventListener('click', () => abrirAjustes());
$('#bAyuda').addEventListener('click', ayuda);
let wake = null;
async function pedirWake() { try { if (navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; } }
function soltarWake() { try { if (wake) wake.release(); } catch (e) { /* ok */ } wake = null; }
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { partida.guardar(); if (enJuego && partida.spec && partida.spec.rol === 'local') abrirPausa(); soltarWake(); }
  else if (enJuego) pedirWake();
});
addEventListener('resize', () => render.medir());
addEventListener('orientationchange', () => setTimeout(() => render.medir(), 200));
hooksAj.alCambiar = () => { render.medir(); $('#fps').hidden = !A.graf.mostrarFps; $('#bSonido').textContent = A.audio.mute ? '✕' : '♪'; if (enJuego) musica(true); };

/* ---------- bucle ---------- */
let ultimo = performance.now(), fcount = 0, ftime = 0, malos = 0, tiempoRender = 0;
const ORDEN = ['ultra', 'alta', 'media', 'baja'];
function bajarCalidad() {
  const i = ORDEN.indexOf(A.graf.preset);
  const sig = ORDEN[(i < 0 ? 1 : i) + 1]; if (!sig) return;
  aplicarPreset(sig); render.medir(); toast('Calidad reducida a ' + sig + ' por rendimiento');
}
function bucle(now) {
  requestAnimationFrame(bucle);
  const cap = A.graf.fps;
  if (cap && now - ultimo < 1000 / cap - 3) return;
  const dt = Math.min(0.05, (now - ultimo) / 1000); ultimo = now;
  if (!(Lobby && Lobby.abierto) && Mando) { Mando.leer(); if (UI.modalAbierto() || !enJuego) Nav.gamepad(); }
  if (enJuego) {
    const f = partida.tick(dt);
    if (f) render.dibujar(f, dt, now / 1000);
    if (partida.fase === 'juego' && !partida.pausada && !UI.modalAbierto()) {
      fcount++; ftime += dt;
      if (ftime >= 2.5) {
        const fps = fcount / ftime; if (A.graf.mostrarFps) $('#fps').textContent = Math.round(fps) + ' FPS';
        if (A.graf.auto && fps < (cap === 30 ? 22 : 40)) { if (++malos >= 2) { bajarCalidad(); malos = 0; } } else malos = 0;
        fcount = 0; ftime = 0;
      }
    }
  } else if (A.graf.mostrarFps) { fcount++; ftime += dt; if (ftime > 1) { $('#fps').textContent = Math.round(fcount / ftime) + ' FPS'; fcount = 0; ftime = 0; } }
}
$('#fps').hidden = !A.graf.mostrarFps;

/* ---------- arranque ---------- */
CH.iniciarNube(() => { recargarProgreso(); pintarMenu(); toast('Progreso de la nube aplicado'); });
if (Lobby && Lobby.registrar) Lobby.registrar(opcionesLobby());
pintarMenu();
if (!P.tuto && A.acc.ayuda) setTimeout(ayuda, 400);
if (Lobby && Lobby.hayEnlace && Lobby.hayEnlace()) Lobby.abrir(opcionesLobby());
requestAnimationFrame(bucle);
window.__hk = { partida, render, entrada, P, A, F, empezar };
