// Arranque de Magnate: conecta escena 3D, HUD, sesion, entrada y ajustes.
import { X } from './contexto.js';
import { $, aviso, cerrarTodas, hayHojas } from './dom.js';
import { A, D, alCambiar, guardarAjustes, esTactil } from './ajustes.js';
import { crearTablero } from './tablero3d.js';
import * as Sonido from './sonido.js';
import { configurarVista } from './vista.js';
import { pintarHud, miniCasilla, pintarTiempo } from './hud.js';
import { abrirCasilla, abrirFin } from './hojas.js';
import { iniciarRed, abandonar, S, iniciarSolo, opcionesLobby, guardarPartida } from './sesion.js';
import { configurarEntrada } from './entrada.js';
import { abrirAjustes } from './panel_ajustes.js';
import { mostrarMenu, abrirPausa, primeraVez } from './menu.js';
import { alLogro } from './logros.js';

const Mando = window.Mando, Lobby = window.Lobby;

function vibrar(f, s, ms) {
  if (!D.ctl.vibracion) return;
  if (Mando) Mando.vibrar(f * D.ctl.vibInt, s * D.ctl.vibInt, ms);
  try { if (esTactil() && navigator.vibrate) navigator.vibrate(Math.min(40, ms * 0.2)); } catch (e) { /* nada */ }
}
configurarVista({ vibrar });

let tablero = null;
try {
  tablero = crearTablero($('escena'), { gfx: D.gfx, acc: A, sens: D.ctl.sens });
} catch (e) {
  console.error(e);
  document.body.classList.add('sinwebgl');
  $('escena').textContent = 'Tu navegador no admite WebGL: Magnate necesita gráficos 3D.';
}
X.tablero = tablero || { poner() {}, activo() {}, cursor() {}, camara: { enfocar() {}, rotar() {}, zoom() {}, cenital() {}, reset() {}, pan() {} }, vis: null, espera: () => Promise.resolve(), pausar() {}, configurar() {}, proyectar: () => ({ x: 0, y: 0 }), verDados() {}, dados: () => Promise.resolve(), mover: () => Promise.resolve(), salto: () => Promise.resolve(), compra: () => Promise.resolve(), quiebra: () => Promise.resolve(), actualizarParcial() {}, chispas() {}, confeti() {}, ocupado: 0 };
if (tablero) {
  tablero.alTocar = (i) => { if (i >= 0 && X.E) abrirCasilla(i); };
  tablero.alHover = (i) => { if (X.E && !hayHojas()) miniCasilla(i); };
  tablero.alPaso = () => Sonido.sfx.paso();
  tablero.alCalidad = () => {
    if (D.gfx.pixel > 0.8) { D.gfx.pixel = Math.max(0.75, +(D.gfx.pixel - 0.25).toFixed(2)); D.gfx.preset = 'personal'; guardarAjustes(); aviso('Calidad bajada para mantener la fluidez', '#ffd23d'); }
  };
}

function margenes() {
  if (!tablero) return;
  const j = $('jugs').getBoundingClientRect(), b = $('barra').getBoundingClientRect(), alto = innerHeight;
  const menu = document.body.classList.contains('enMenu'), arriba = document.body.classList.contains('barra-arriba');
  tablero.margenes(menu ? 0 : (arriba ? b.bottom : j.bottom + 6), menu ? 0 : (arriba ? 0 : Math.max(0, alto - b.top)));
}
new ResizeObserver(margenes).observe($('barra')); new ResizeObserver(margenes).observe($('jugs')); addEventListener('resize', margenes); setInterval(margenes, 1000);
/* ---------- ajustes aplicados ---------- */
function aplicar() {
  document.body.dataset.texto = A.texto;
  document.body.classList.toggle('contraste', A.altoContraste); document.body.classList.toggle('reducir', A.reducirMov);
  document.body.classList.toggle('zurdo', D.ctl.zurdo);
  document.body.classList.toggle('barra-arriba', D.ctl.posBotones === 'arriba');
  document.documentElement.style.setProperty('--esc-btn', D.ctl.tamBotones);
  document.documentElement.style.setProperty('--op-barra', D.ctl.opBotones);
  $('fps').hidden = !D.gfx.mostrarFps;
  Sonido.volumenes(A.vol); Sonido.musica(A.musica && !!X.E);
  if (tablero) { tablero.configurar({ gfx: D.gfx, acc: A, sens: D.ctl.sens }); if (X.E) tablero.poner(X.E); }
  if (X.E) pintarHud();
  $('btnSonido').textContent = A.vol.maestro > 0 ? '♪' : '✕';
}
alCambiar(aplicar);
setInterval(() => { if (X.E) pintarTiempo(); }, 500);
setInterval(() => { if (D.gfx.mostrarFps && tablero) $('fps').textContent = tablero.fps + ' FPS'; }, 500);

/* ---------- interfaz superior ---------- */
function pantallaCompleta() {
  const el = document.documentElement;
  try { if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); } catch (e) { /* nada */ }
}
let silencio = false;
function alternarSonido() { silencio = !silencio; Sonido.volumenes({ maestro: silencio ? 0 : A.vol.maestro }); $('btnSonido').textContent = silencio ? '✕' : '♪'; }
$('btnPausa').addEventListener('click', () => abrirPausa());
$('btnAjustes').addEventListener('click', () => abrirAjustes());
$('btnSonido').addEventListener('click', alternarSonido);
$('btnPantalla').addEventListener('click', pantallaCompleta);
$('btnVista').addEventListener('click', () => X.tablero.camara.cenital());
configurarEntrada({ pausa: () => { if (X.E && !($('menu') && !$('menu').hidden)) abrirPausa(); }, ajustes: abrirAjustes, sonido: alternarSonido, pantalla: pantallaCompleta,
  atrasMenu: () => {} });

X.alMenu = () => { cerrarTodas(); abandonar(false); Sonido.musica(false); mostrarMenu(true); };
X.revancha = () => { cerrarTodas(); iniciarSolo(S.setup); };
X.verFin = () => abrirFin();
X.alArrancar = () => { mostrarMenu(false); cerrarTodas(); Sonido.musica(A.musica); pedirWake(); if (X.modo === 'solo') primeraVez(); };
X.alChat = () => pintarHud();
alLogro((l) => { aviso('🏆 Logro: ' + l.nombre, '#ffd23d', 4000); Sonido.sfx.ganar(); });

/* ---------- ciclo de vida ---------- */
let wake = null;
async function pedirWake() { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { /* nada */ } }
let pausaAuto = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    guardarPartida();
    if (A.pausaOculta) Sonido.pausar();
    if (X.E && X.modo === 'solo' && !X.pausado) { X.pausaVis = true; import('./sesion.js').then((M) => M.pausar(true)); pausaAuto = true; }
  } else {
    Sonido.reanudar(); pedirWake();
    if (pausaAuto) { pausaAuto = false; import('./sesion.js').then((M) => { if (!hayHojas()) M.pausar(false); else X.pausado = true; }); }
  }
});
window.addEventListener('pagehide', guardarPartida);
['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => { Sonido.iniciar(); Sonido.musica(A.musica && !!X.E); }, { once: true, capture: true }));

iniciarRed();
aplicar();
mostrarMenu(true);
if (Lobby && Lobby.hayEnlace()) { mostrarMenu(false); X.lobbyAbierto = true; Lobby.abrir(opcionesLobby()); }
window.Magnate = { X, S, tablero };
