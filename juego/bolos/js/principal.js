// Principal: une escena, entrada, juego, interfaz, red y cuenta; bucle de cuadros, pausa y guardado.
import { $, h } from './dom.js';
import { D, PRESETS, calidadEscena, aplicar, guardarYa as guardarAjustes, suscribir, panelAjustes } from './ajustes.js';
import { Escena } from './escena.js';
import * as En from './entrada.js';
import * as Jg from './juego.js';
import * as Pr from './progreso.js';
import * as Cu from './cuenta-bolos.js';
import * as UI from './ui.js';
import * as Pa from './pantallas.js';
import * as Nav from './nav.js';
import { Sonido } from './sonido.js';
import { CLAVES, leer, escribir } from './almacen.js';
import { PISTAS } from './catalogo.js';

const Red = window.Red, Lobby = window.Lobby, Mando = window.Mando;
const { J } = Jg;
aplicar();
UI.iniciarUI();
const escena = new Escena($('#escena'), calidadEscena());
escena.reducir = D.reducirMov; escena.ponerDaltonico(D.daltonico);
Jg.enlazar(escena);
window.__bolos = { J, Jg, escena, Pr, En, UI, D };

/* ---------- escena de fondo segun estado ---------- */
function fondoMenu() {
  escena.tema(Pr.pistaSel().id); escena.ponerBola(Pr.D.sel.bola);
  escena.colocarPinos(Array.from({ length: 10 }, (_, i) => ({ i, tipo: 'normal' })), false);
  escena.colocarBola(0, 0, false); escena.modoCam('menu');
}
function volverAlMenu() {
  const online = J.online;
  Jg.detener();
  UI.cerrarTodas(); UI.pintarHud(); fondoMenu(); Pa.pintarMenu();
  if (online && Red && Red.conectado) { try { Red.salir(); } catch (e) { /* ya cerrada */ } }
}

/* ---------- ganchos del juego ---------- */
Jg.H.hud = UI.pintarHud; Jg.H.medidor = UI.medidor; Jg.H.mensaje = UI.mensaje;
Jg.H.estado = (e) => {
  if (e === 'juego') { escena.tema(pistaDePartida()); UI.pintarHud(); wake(); }
  if (e === 'esperando') UI.aviso('Esperando al anfitrión…');
};
const pistaDePartida = () => { const c = J.cfg && J.cfg.pista; return PISTAS.some((p) => p.id === c) ? c : Pr.pistaSel().id; };
Jg.H.vibrar = (a, b, ms) => {
  if (!D.vibracion) return;
  const k = D.vibInt;
  try { if (navigator.vibrate && matchMedia('(pointer: coarse)').matches) navigator.vibrate(Math.round(ms * k * 0.6)); } catch (e) { /* sin vibracion */ }
  if (Mando && Mando.conectado) Mando.vibrar(a * k, b * k, ms);
};
let ultimoSetup = null;
Pa.ctx.antesDeJugar = (s) => { ultimoSetup = s; };
Jg.H.fin = (res) => {
  UI.pintarHud(); UI.actualizarMonedas();
  const online = res.modo === 'online';
  Pa.mostrarFin(res, {
    menu: volverAlMenu,
    fondo: () => {},
    revancha: online ? null : (r) => {
      if (res.modo === 'liga') { volverAlMenu(); Pa.verLigas(); return; }
      if (ultimoSetup) { Pa.empezar({ ...ultimoSetup, jug: ultimoSetup.jug.map((p) => ({ ...p })) }); } else volverAlMenu();
      void r;
    }
  });
};
Jg.H.cerrado = (txt) => { UI.aviso(txt, '#ff6b4a'); volverAlMenu(); };

/* ---------- logros, cuenta y nube ---------- */
Pr.alLogro.fn = (id) => { UI.avisoLogro(id); Cu.logro(id); };
Pr.suscribir(UI.actualizarMonedas);
Cu.aplicarPerfil();
Cu.iniciarNube(() => { Pr.recargar(); Pa.pintarMenu(); UI.aviso('Progreso actualizado desde tu cuenta', '#6dff6d'); });
Cu.sincronizarLogros(Pr.D.logros);
Cu.enviarPuntajes({ puntos: Pr.D.stats.mejor, strikes: Pr.D.stats.strikes, estrellas: Pr.estrellasTotal(), diario: Pr.D.diario.mejor });
if (window.Cuenta && window.Cuenta.on) { try { window.Cuenta.on('perfil', () => { Cu.aplicarPerfil(); Pa.pintarMenu(); }); } catch (e) { /* sin eventos */ } }

/* ---------- ajustes, ayuda, pausa ---------- */
let alt = null;
function verAjustes(pest) {
  UI.abrirCapa('Ajustes', (c) => { alt = panelAjustes(c, { pest, alImportar: () => Pr.guardarYa() }); }, { alCerrar: () => { alt = null; guardarAjustes(); } });
}
Nav.N.alPestana = (d) => { if (alt) alt.siguiente(d); };
Pa.ctx.ajustes = verAjustes; Pa.ctx.ayuda = Pa.verAyuda;
function pausa() {
  if (!J.activo || UI.hayCapa()) return;
  Jg.pausar(true);
  UI.abrirCapa('Pausa', (c, api) => {
    c.appendChild(h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, txt: 'Continuar', on: { click: () => api.cerrar() } }));
    if (!J.ronda) c.appendChild(h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Tabla de puntos', on: { click: () => UI.abrirTabla() } }));
    c.appendChild(h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Ajustes', on: { click: () => verAjustes() } }));
    c.appendChild(h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Ayuda de controles', on: { click: () => Pa.verAyuda() } }));
    if (J.online && Red && Red.esAnfitrion) c.appendChild(h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Invitar / reconectar amigos', on: { click: () => { api.cerrar(); Lobby.abrir(OPTS); } } }));
    c.appendChild(h('button', { type: 'button', cls: 'btn peligro', 'data-f': 1, txt: J.online ? 'Salir de la partida' : 'Abandonar partida', on: { click: () => UI.confirmar(J.online ? '¿Salir de la partida online?' : '¿Abandonar? El progreso de la partida se pierde (las monedas ganadas se conservan).', () => { api.cerrar(); Jg.abandonar(); volverAlMenu(); }, 'Salir') } }));
  }, { cls: 'chica', alCerrar: () => Jg.pausar(false) });
}
Nav.N.alAtras = (capa) => { void capa; return false; };

/* ---------- tutorial ---------- */
Pa.ctx.tutorial = () => {
  if (leer(CLAVES.tutorial) || J.modo === 'online') return;
  escribir(CLAVES.tutorial, { visto: 1 });
  const pasos = [['Coloca la bola', 'Arrastra a los lados (o usa ←/→ o el stick izquierdo) para elegir desde dónde lanzas.'], ['Lanza deslizando', 'Desliza hacia arriba: más rápido = más fuerza. Si curvas el trazo, la bola gira y entra en curva al final.'], ['Suma puntos', 'Strike = 10 pinos con la primera bola. Spare = limpiar con la segunda. ¡Compra bolas y pistas con tus monedas!']];
  let k = 0;
  const api = UI.abrirCapa('Cómo se juega', (c, a) => {
    const caja = h('div', { cls: 'tuto' }), pintar = () => {
      caja.textContent = ''; caja.appendChild(h('h3', { txt: `${k + 1}/3 · ${pasos[k][0]}` })); caja.appendChild(h('p', { txt: pasos[k][1] }));
      caja.appendChild(h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, txt: k < 2 ? 'Siguiente' : '¡A jugar!', on: { click: () => { if (k < 2) { k++; pintar(); } else a.cerrar(); } } }));
    };
    pintar(); c.appendChild(caja);
  }, { cls: 'chica', alCerrar: () => Jg.pausar(false) });
  Jg.pausar(true); void api;
};

/* ---------- online ---------- */
let restaurar = null;
const OPTS = {
  juego: 'Rey de los Bolos', maxJugadores: 4, minJugadores: 1,
  modos: [{ id: 'libre', nombre: 'Solo con amigos' }, { id: 'bots', nombre: 'Completar con bots (hasta 4)' }],
  alIniciar: (config, jugadores) => { UI.cerrarTodas(); const r = restaurar; restaurar = null; Jg.iniciarOnline(config, jugadores, r); }
};
Pa.ctx.online = (sala) => { restaurar = sala || null; Lobby.abrir(OPTS); };
if (Lobby && Lobby.registrar) Lobby.registrar(OPTS);
if (Red) {
  Red.on('mensaje', (t, d, de) => { if (typeof t === 'string' && t.startsWith('bolos_')) Jg.mensajeRed(t, d, de); });
  Red.on('jugadorSalio', (id) => Jg.jugadorSalio(id));
  Red.on('jugadorUnido', () => { if (Red.esAnfitrion && J.activo && J.online) setTimeout(() => { if (J.activo && Red.conectado) Red.iniciar({ modo: J.cfg.modo, reanudar: true }); }, 300); });
  Red.on('cerrado', (m) => { if (m !== 'salir' && J.activo && J.online) { UI.aviso('Conexión cerrada: ' + m, '#ff6b4a'); Jg.detener(); volverAlMenu(); } });
}

/* ---------- botones ---------- */
let bloqueo = null;
async function wake() { try { if ('wakeLock' in navigator && !bloqueo) { bloqueo = await navigator.wakeLock.request('screen'); bloqueo.addEventListener('release', () => { bloqueo = null; }); } } catch (e) { /* sin wake lock */ } }
document.addEventListener('visibilitychange', () => { if (!document.hidden && J.activo) wake(); else if (document.hidden) { Jg.guardar(); Pr.guardarYa(); guardarAjustes(); } });
function pantallaCompleta() { const d = document, e = d.documentElement; if (d.fullscreenElement) d.exitFullscreen(); else if (e.requestFullscreen) e.requestFullscreen().catch(() => {}); wake(); }
$('#bPantalla').addEventListener('click', pantallaCompleta);
$('#bAjustes').addEventListener('click', () => verAjustes());
$('#bAyuda').addEventListener('click', () => Pa.verAyuda());
$('#bMenu').addEventListener('click', pausa);
$('#bTabla').addEventListener('click', () => UI.abrirTabla());
$('#hudPuntos').addEventListener('click', () => { if (!J.ronda) UI.abrirTabla(); });
document.querySelectorAll('#cluster [data-b]').forEach((b) => {
  const k = b.dataset.b;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); En.E.botones.add(k); b.setPointerCapture && b.setPointerCapture(e.pointerId); });
  const sol = () => En.E.botones.delete(k);
  b.addEventListener('pointerup', sol); b.addEventListener('pointercancel', sol); b.addEventListener('lostpointercapture', sol);
});
const lz = $('#clLanzar');
lz.addEventListener('pointerdown', (e) => { e.preventDefault(); lz.setPointerCapture && lz.setPointerCapture(e.pointerId); En.botonCargar(true); });
lz.addEventListener('pointerup', () => En.botonCargar(false));
lz.addEventListener('pointercancel', () => { En.E.cargando = false; En.E.carga = 0; UI.medidor(); });
$('#clPos').addEventListener('input', (e) => { En.E.x = +e.target.value / 100; if (En.E.alCambiar) En.E.alCambiar(); });
$('#clRapido').addEventListener('click', () => { J.rapido = !J.rapido; });
En.iniciarPuntero($('#escena')); En.iniciarTeclado(); Nav.iniciarTeclado();
$('#escena').addEventListener('pointerdown', () => { Sonido.despertar(); if (J.fase === 'rodando') J.rapido = true; });
document.addEventListener('pointerdown', () => Sonido.despertar(), { once: true });
document.addEventListener('keydown', () => Sonido.despertar(), { once: true });
Nav.N.bloqueado = () => !!(Lobby && Lobby.abierto);
En.E.bloqueado = () => UI.hayCapa() || !!(Lobby && Lobby.abierto);
addEventListener('keydown', (e) => {
  if (e.defaultPrevented || (Lobby && Lobby.abierto)) return;
  if (UI.hayCapa() || !J.activo) return;
  if (e.code === D.teclas.pausa || e.code === 'KeyP') { e.preventDefault(); pausa(); }
  else if (e.code === D.teclas.tabla && !J.ronda) { e.preventDefault(); UI.abrirTabla(); }
});
addEventListener('pagehide', () => { Jg.guardar(); Pr.guardarYa(); guardarAjustes(); try { if (Red && Red.conectado) Red.salir(); } catch (e) { /* cierre */ } });
Pa.ctx.cuenta = Pa.verCuenta;

/* ---------- calidad ---------- */
let calAnt = JSON.stringify(calidadEscena());
suscribir(() => {
  const c = JSON.stringify(calidadEscena());
  if (c !== calAnt) { calAnt = c; escena.aplicarCalidad(calidadEscena()); }
  escena.reducir = D.reducirMov; escena.ponerDaltonico(D.daltonico);
  $('#fps').hidden = !D.fps;
  UI.pintarHud();
});
$('#fps').hidden = !D.fps;
const ORDEN = ['alta', 'media', 'baja'];
let fpsAcum = 0, fpsN = 0, fpsT = 0, lenta = 0;
function medirFps(dt) {
  fpsAcum += dt; fpsN++; fpsT += dt;
  if (fpsT < 1) return;
  const fps = fpsN / fpsAcum;
  if (D.fps) $('#fps').textContent = Math.round(fps) + ' FPS';
  if (D.autoBajada && J.activo && !document.hidden && !Jg.J.pausado) {
    lenta = fps < 24 ? lenta + 1 : 0;
    if (lenta >= 4) {
      lenta = 0;
      const i = ORDEN.indexOf(D.calidad === 'ultra' ? 'alta' : D.calidad), sig = D.calidad === 'ultra' ? 'alta' : ORDEN[i + 1];
      if (sig) { D.calidad = sig; Object.assign(D, PRESETS[sig]); UI.aviso('Rendimiento bajo: calidad ' + sig, '#ffd23d'); import('./ajustes.js').then((m) => m.guardar()); }
    }
  }
  fpsAcum = 0; fpsN = 0; fpsT = 0;
}

/* ---------- bucle ---------- */
let t0 = performance.now(), ultimoDibujo = 0;
function bucle(t) {
  requestAnimationFrame(bucle);
  if (document.hidden) { t0 = t; return; }
  if (D.fpsMax && t - ultimoDibujo < 1000 / D.fpsMax - 2) return;
  ultimoDibujo = t;
  const dt = Math.min(0.05, (t - t0) / 1000); t0 = t;
  const lobby = !!(Lobby && Lobby.abierto);
  let capa = false;
  if (!lobby) {
    Mando.leer();
    capa = Nav.cuadroMando(Mando, D.zonaMando);
    if (!capa && Mando.conectado && J.activo && !J.pausado) {
      if (Mando.pulsado('MENU')) pausa();
      else if (Mando.pulsado('Y') && !J.ronda) UI.abrirTabla();
    }
  }
  if (!lobby && !capa && J.activo) En.cuadro(dt, Mando);
  if (En.E.cargando && J.fase === 'apuntar') UI.medidor();
  Jg.tick(dt);
  escena.render(dt);
  medirFps(dt);
}

/* ---------- arranque ---------- */
Pa.pintarMenu(); fondoMenu(); UI.pintarHud();
requestAnimationFrame(bucle);
if (Lobby && Lobby.hayEnlace()) Lobby.abrir(OPTS);
window.addEventListener('bolos-capa', () => { if (!UI.hayCapa() && J.activo && J.pausado && !document.querySelector('.capa.panel')) Jg.pausar(false); });
