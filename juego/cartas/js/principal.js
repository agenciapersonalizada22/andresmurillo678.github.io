// Arranque y cableado: pantalla de entrada, creador de mesas, mesa, red y ajustes.
import { h, fmt, boton, dialogo, aviso, confirmar, anunciar, $ } from './ui/dom.js';
import { Sesion, iniciarAnfitrion, restaurarAnfitrion, liquidarGuardada, terminarSesion, detener, salirCliente, accion, chat as enviarChat, sentar, recomprar, levantarse, pausar, previstaDesdeUrl, iniciarSuscripcion, remotosConectados } from './marco/sesion.js';
import * as MesaUI from './ui/mesaUI.js';
import * as Acc from './ui/acciones.js';
import * as Entrada from './ui/entrada.js';
import * as P from './ui/paneles.js';
import { pantallaEntrar, unirseDialogo } from './ui/entrar.js';
import { pantallaCrear } from './ui/creador.js';
import * as Aj from './ui/ajustes.js';
import { motorDe, CATALOGO } from './juegos/registro.js';
import { Cartera } from './marco/cartera.js';
import * as Pro from './marco/progreso.js';
import * as A from './marco/almacen.js';
import { Sonido, vol, desbloquear } from './marco/sonido.js';
import * as Cta from './marco/cuenta.js';
import { rankingDialogo } from './ui/cuentaUI.js';

const app = document.getElementById('app');
let pendInvitar = '', vista = 'entrar', entrarUI = null, vmPrev = null, resVisto = -1, chatT = 0, noLeidos = 0, logT = 0, saliendo = false, finMostrado = false, idMesaVista = '', ofertaDlg = null, wake = null, pausaDlg = null;
const OPTS_LOBBY = { juego: 'Cartas', maxJugadores: 4, minJugadores: 1, modos: [], alIniciar() {}, alCerrar() {} };

// ---------- estructura ----------
const vEntrar = h('div', { id: 'vistaEntrar', cls: 'pantalla' });
const cabMesa = {
  titulo: h('b', { cls: 't-mesa' }), sub: h('small', { cls: 's-mesa' }), saldo: h('span', { cls: 'saldo-mini', title: 'Tu monedero' }),
  chat: boton('💬', () => abrirChat(), 'icono', { 'aria-label': 'Chat (T)', id: 'btnChat' }), badge: h('i', { cls: 'badge-chat', hidden: '' }),
  gestion: boton('👥', () => Sesion.vm && P.gestionDialogo(Sesion.vm, () => {}), 'icono', { 'aria-label': 'Gestionar mesa e invitar', id: 'btnGestion', hidden: '' }),
};
const vMesa = h('div', { id: 'vistaMesa', cls: 'oculto' }, [
  h('header', { cls: 'barra' }, [boton('☰', () => menuPausa(), 'icono', { 'aria-label': 'Menú de pausa (Esc)' }), h('div', { cls: 'tit' }, [cabMesa.titulo, cabMesa.sub]), cabMesa.saldo,
    h('div', { cls: 'acc-barra' }, [cabMesa.gestion, cabMesa.chat, boton('📊', () => Sesion.vm && P.resultadosDialogo(Sesion.vm), 'icono', { 'aria-label': 'Resultados' }), boton('⛶', () => pantallaCompleta(), 'icono', { 'aria-label': 'Pantalla completa' })])]),
  h('div', { cls: 'mesa-zona' }),
]);
cabMesa.chat.appendChild(cabMesa.badge);
const fpsEl = h('div', { id: 'fps', hidden: '' });
app.append(vEntrar, vMesa, fpsEl);
MesaUI.montar($('.mesa-zona', vMesa)); Acc.montar(vMesa);

function mostrar(v) {
  vista = v; vEntrar.classList.toggle('oculto', v === 'mesa'); vMesa.classList.toggle('oculto', v !== 'mesa');
  document.body.classList.toggle('en-mesa', v === 'mesa');
  if (v === 'mesa') pedirWake(); else soltarWake();
}
function irEntrar() {
  mostrar('entrar'); vmPrev = null; MesaUI.reiniciarPrevio();
  entrarUI = pantallaEntrar(vEntrar, { crear: irCrear, unirse: abrirUnirse, ajustes: () => Aj.ajustesDialogo(), ayuda: ayudaGeneral, continuar: continuar, liquidar: liquidarGuardada });
  setTimeout(() => { const f = vEntrar.querySelector('.prim'); if (f && document.body.classList.contains('modo-mando')) f.focus(); }, 50);
}
function irCrear() { mostrar('entrar'); pantallaCrear(vEntrar, (m, J) => { iniciarAnfitrion(m, J); entrarMesa(); invitarPendiente(); }, irEntrar); }
// ?invitar=<uid> (desde el portal): tras crear la mesa se invita a ese amigo en linea
function invitarPendiente() {
  const uid = pendInvitar; if (!uid) return; pendInvitar = '';
  let n = 0; const t = setInterval(() => {
    const a = window.Cuenta && window.Cuenta.amigos && window.Cuenta.amigos.lista.find((x) => x.uid === uid);
    if (a || ++n > 20) { clearInterval(t); if (!a) return aviso('No se encontró a ese amigo en tu lista', '#ff6b6b'); if (a.estado === 'desconectado') aviso(a.nombre + ' no está conectado; invítalo con el enlace.', '#ffd23d', 4500); else P.invitarAmigoEnLinea(a, { set textContent(x) { aviso(x, '#3df5ff', 3500); } }); }
  }, 250);
}
function entrarMesa() { vmPrev = null; resVisto = -1; chatT = 0; logT = 0; noLeidos = 0; finMostrado = false; saliendo = false; MesaUI.reiniciarPrevio(); mostrar('mesa'); if (Sesion.vm) alVista(Sesion.vm); }
function continuar(id) {
  if (!restaurarAnfitrion(id)) { aviso('No se pudo restaurar la mesa', '#ff6b6b'); A.mesas.olvidar(id); irEntrar(); return; }
  entrarMesa(); aviso('Mesa restaurada. Los jugadores remotos deben reconectarse con «Reconectar jugador».', '#3df5ff', 4500);
}
function ayudaGeneral() { P.ayudaDialogo({ texto: { nombre: 'Cartas', ayuda: ['Crea una mesa de póker, veintiuno, siete y medio, Dompe, Conquián o Ve a pescar con bots o amigos, o únete con un enlace.', 'Las fichas son virtuales: tu monedero se guarda en este dispositivo y recibes un regalo diario de cortesía.', 'Si se cae un jugador, el anfitrión pulsa «Reconectar jugador» y le da un enlace nuevo; recupera asiento, fichas y mano.'] } }); }

// ---------- unirse por enlace ----------
function abrirUnirse(preMesa) {
  unirseDialogo(preMesa || '', (codigo, mesa) => {
    try { history.replaceState(null, '', location.pathname + '?sala=' + codigo + (mesa ? '&m=' + mesa : '')); } catch (e) {}
    previstaDesdeUrl(); if (window.Lobby) window.Lobby.abrir(OPTS_LOBBY);
  });
}

// ---------- vista de mesa ----------
function alVista(vm) {
  if (vista !== 'mesa') { if (Sesion.rol !== 'ninguno') { entrarMesa(); } else return; }
  const J = motorDe(vm.juego), UI = J.ui;
  if (idMesaVista !== vm.id) { idMesaVista = vm.id; MesaUI.reiniciarPrevio(); }
  const L = MesaUI.render(vm, UI);
  Acc.render(vm, UI, L);
  cabMesa.titulo.textContent = CATALOGO[vm.juego].corto; cabMesa.sub.textContent = (vm.cfg.torneo ? 'Torneo · mano ' : 'Mano ') + Math.max(1, vm.mano) + ' · ' + vm.cfg.n + ' asientos';
  cabMesa.saldo.textContent = '🪙 ' + fmt(Cartera.saldo()); cabMesa.gestion.hidden = Sesion.rol !== 'anfitrion';
  // chat
  const ult = vm.chat.length ? vm.chat[vm.chat.length - 1].t : 0;
  if (ult > chatT) {
    vm.chat.filter((c) => c.t > chatT).forEach((c) => { if (c.i >= 0 && c.i !== vm.yo) MesaUI.burbuja(c.i, c.texto, c.color); if (c.i !== vm.yo) noLeidos++; });
    chatT = ult; if (P.chatActual()) { noLeidos = 0; P.chatActual().pintar(); } else if (noLeidos) Sonido.clic();
    cabMesa.badge.hidden = !noLeidos; cabMesa.badge.textContent = noLeidos;
  }
  vm.log.filter((l) => l.t > logT).forEach((l) => aviso(l.texto, '#ffd23d', 2800)); if (vm.log.length) logT = Math.max(logT, vm.log[vm.log.length - 1].t);
  resultadoMano(vm);
  Pro.tomarAvisos().forEach((l) => aviso('Logro: ' + l.nombre, '#ffd23d', 4500));
  if (vm.fin && !finMostrado) { finMostrado = true; mostrarFin(vm, Sesion.rol === 'anfitrion' ? null : null); }
  vmPrev = vm;
}
function resultadoMano(vm) {
  const j = vm.j, k = j.manos;
  if (!j.res || k === resVisto || vm.yo < 0) { if (!j.res) { /* mano en curso */ } return; }
  if (resVisto === -1 && vmPrev === null) { resVisto = k; return; }
  resVisto = k;
  const delta = j.res.gan[vm.yo] || 0, jugo = j.jug[vm.yo] && (j.jug[vm.yo].st !== 'fuera' || (j.jug[vm.yo].manos && j.jug[vm.yo].manos.length));
  if (!jugo) return;
  const nuevo = ['dompe', 'conquian', 'pescar'].includes(vm.juego), gano = nuevo ? (j.res.ganadores || []).includes(vm.yo) : delta > 0;
  const info = { juego: vm.juego === 'poker' ? 'poker' : (vm.juego === 'veintiuno' || vm.juego === 'sietemedio') ? 'veintiuno' : vm.juego, meta: j.res.meta || null, yo: vm.yo, delta, ganada: gano, bote: j.res.total, mano: j.res.manos && j.res.manos[vm.yo] ? j.res.manos[vm.yo].nombre : '', variante: vm.juego === 'sietemedio' ? 'sm' : 'bj' };
  if (vm.juego === 'veintiuno' || vm.juego === 'sietemedio') { const ms = j.jug[vm.yo].manos; info.natural = ms.some((m) => m.res === 'blackjack' || m.res === 'real'); info.doblada = ms.some((m) => m.doblada && m.res === 'gana'); }
  Pro.registrarMano(info);
  if (gano) Sonido.ganar(); else if (delta < 0 || (nuevo && j.res.ganadores.length)) Sonido.perder();
  window.Mando && window.Mando.vibrar && A.dispositivo.obtener().controles.vibracion && gano && window.Mando.vibrar(0.3, 0.5, 160);
  anunciar(nuevo ? (gano ? '¡Ganaste! ' : 'Ganó otro jugador. ') + j.res.texto + (delta ? ' (' + (delta > 0 ? '+' : '−') + Math.abs(delta) + ' fichas)' : '') : delta > 0 ? 'Ganaste ' + delta + ' fichas' : delta < 0 ? 'Perdiste ' + (-delta) + ' fichas' : 'Mano sin cambios');
}
function abrirChat() {
  if (P.chatActual()) return P.chatDialogo(() => Sesion.vm, enviarChat);
  noLeidos = 0; cabMesa.badge.hidden = true; P.chatDialogo(() => Sesion.vm, enviarChat);
}
function pantallaCompleta() { const d = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (d.requestFullscreen) d.requestFullscreen().catch(() => {}); }
async function pedirWake() { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) {} }
function soltarWake() { try { if (wake) { wake.release(); wake = null; } } catch (e) {} }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && vista === 'mesa') pedirWake();
  vol.mute = document.visibilityState === 'hidden' && A.ajustes.obtener().audio.pausaOculta;
});

// ---------- menu de pausa / salir ----------
function menuPausa() {
  if (vista !== 'mesa' || pausaDlg) return;
  const anf = Sesion.rol === 'anfitrion', solo = !remotosConectados();
  if (anf && solo) pausar(true);
  pausaDlg = P.pausaDialogo({
    esAnfitrion: anf, texto: anf ? (solo ? 'Partida en pausa.' : 'Hay jugadores conectados: la mesa sigue corriendo.') : 'Menú de la mesa.',
    resultados: () => Sesion.vm && P.resultadosDialogo(Sesion.vm), ajustes: () => Aj.ajustesDialogo(), ayuda: () => P.ayudaDialogo(motorDe(Sesion.vm.juego).ui, Sesion.vm),
    gestion: anf ? () => P.gestionDialogo(Sesion.vm, () => {}) : null,
    levantarse: Sesion.vm && Sesion.vm.yo >= 0 ? () => { levantarse(); aviso('Te levantarás al terminar la mano. Tus fichas vuelven al monedero.'); } : null,
    salir: () => (anf ? confirmar('Se cierra la mesa para todos y recibes tus fichas en el monedero.', 'Terminar sesión', terminar, 'Terminar y cobrar') : salirDeMesa()),
    menu: () => { if (anf) { detener(); } else salirCliente(); irEntrar(); },
  });
  const antes = pausaDlg.cerrar; pausaDlg.cerrar = () => { antes(); pausaDlg = null; if (anf) pausar(false); };
}
function terminar() {
  const vm = Sesion.vm, neto = vm && vm.neto[0] ? vm.neto[0].neto : 0, torneoGanado = vm && vm.premio && vm.premio.asiento === 0;
  const r = terminarSesion(); Pro.sesionTerminada(neto, torneoGanado);
  const cont = r && r.cobro ? `Recibes ${fmt(r.cobro)} fichas en tu monedero.` : 'Sin fichas que cobrar.';
  detener(); irEntrar();
  dialogo({ titulo: 'Sesión terminada', cuerpo: [cont, `Resultado de la sesión: ${neto >= 0 ? '+' : '−'}${fmt(Math.abs(neto))} fichas.`], botones: [{ txt: 'Ver ranking', cls: 'sec', fn: () => rankingDialogo() }, { txt: 'Aceptar', cls: 'prim' }].filter((b) => b.txt !== 'Ver ranking' || Cta.hay()) });
}
function salirDeMesa() {
  const vm = Sesion.vm;
  if (!vm || vm.yo < 0) { salirCliente(); irEntrar(); return; }
  saliendo = true; levantarse(); aviso('Saliendo: recibirás tus fichas al terminar la mano…');
  setTimeout(() => { if (saliendo && Sesion.rol === 'cliente') { salirCliente(); irEntrar(); } }, 12000);
}
function mostrarFin(vm) {
  const neto = vm.yo >= 0 && vm.neto[vm.yo] ? vm.neto[vm.yo].neto : 0;
  if (vm.yo === 0 && Sesion.rol === 'anfitrion') { Pro.sesionTerminada(neto, vm.premio && vm.premio.asiento === 0); }
  dialogo({ titulo: vm.premio ? 'Torneo terminado' : 'Sesión terminada', cerrable: false, cuerpo: [vm.premio ? `Ganador: ${vm.premio.nombre}. Premio: ${fmt(vm.premio.monto)} fichas.` : 'La mesa se cerró.', 'Tus fichas ya están en el monedero.'], botones: [...(Cta.hay() ? [{ txt: 'Ver ranking', cls: 'sec', fn: () => rankingDialogo() }] : []), { txt: 'Volver al menú', cls: 'prim', fn: () => { if (Sesion.rol === 'anfitrion') detener(); else salirCliente(); irEntrar(); } }] });
}

// ---------- eventos de red ----------
Sesion.alVista = alVista;
Sesion.alSolicitud = (info, decidir) => { P.solicitudDialogo(info, decidir); aviso(info.nombre + ' quiere sentarse', '#3df5ff'); };
Sesion.alFin = () => { if (Sesion.vm) alVista(Sesion.vm); };
Sesion.alOferta = (o) => {
  if (window.Lobby && window.Lobby.abierto) window.Lobby.cerrar();
  if (ofertaDlg) ofertaDlg.cerrar();
  ofertaDlg = P.entradaDialogo(o, (r) => { ofertaDlg = null; if (!sentar(r.compra, r.espectador)) aviso('No se pudo entrar (saldo insuficiente)', '#ff6b6b'); });
};
Sesion.alCerrado = (motivo) => {
  if (Sesion.rol !== 'cliente') return;
  const id = Sesion.mesaId;
  dialogo({ titulo: 'Conexión perdida', cerrable: false, cuerpo: [`Se cerró la conexión con el anfitrión (${motivo}).`, 'Tu asiento y tus fichas siguen guardados. Pídele al anfitrión que pulse «Reconectar jugador» (menú de la mesa → Gestionar mesa) y pega el enlace nuevo.'],
    botones: [{ txt: 'Pegar enlace nuevo', cls: 'prim', fn: () => { salirCliente(); abrirUnirse(id); } }, { txt: 'Volver al menú', cls: 'sec', fn: () => { salirCliente(); irEntrar(); } }] });
};
Sesion.alEvento = (ev) => {
  if (ev.tipo === 'conectado') { if (window.Lobby && window.Lobby.abierto) window.Lobby.cerrar(); aviso('Conectado al anfitrión', '#6dff6d'); }
  else if (ev.tipo === 'bienvenida') {
    if (ev.d.error) { aviso(ev.d.error, '#ff6b6b', 4500); if (!Sesion.vm) { salirCliente(); irEntrar(); } return; }
    if (ev.d.reconexion) aviso('¡Recuperaste tu asiento!', '#6dff6d');
    if (vista !== 'mesa') entrarMesa();
  } else if (ev.tipo === 'cobro') { aviso('Recibiste ' + fmt(ev.n) + ' fichas', '#6dff6d'); if (saliendo) { saliendo = false; salirCliente(); irEntrar(); } }
  else if (ev.tipo === 'cobroHost') aviso('Fichas devueltas a tu monedero', '#6dff6d');
  else if (ev.tipo === 'rec') aviso(ev.d.ok ? 'Recompra aplicada al empezar la mano' : ev.d.error, ev.d.ok ? '#6dff6d' : '#ff6b6b');
  else if (ev.tipo === 'err') aviso(ev.error, '#ff6b6b');
  else if (ev.tipo === 'expulsado') { dialogo({ titulo: 'Expulsado', cerrable: false, cuerpo: ['El anfitrión te expulsó de la mesa. Tus fichas se devuelven a tu monedero.'], botones: [{ txt: 'Aceptar', cls: 'prim', fn: () => { salirCliente(); irEntrar(); } }] }); }
  else if (ev.tipo === 'fin') { /* el cobro se acredita en sesion.js; la vista final muestra el cierre */ if (Sesion.vm) { Sesion.vm.fin = true; alVista(Sesion.vm); } }
  else if (ev.tipo === 'salio') aviso('Un jugador se desconectó. Puedes reconectarlo desde «Gestionar mesa».', '#ff6b6b');
};
MesaUI.hooks.carta = (seat, k, code, mano) => { const vm = Sesion.vm; const UI = vm && motorDe(vm.juego).ui; const a = UI && UI.alCarta && UI.alCarta(vm, k, code, seat, mano); if (a) accion(a); };
MesaUI.hooks.meld = (id) => { const vm = Sesion.vm; const UI = vm && motorDe(vm.juego).ui; const a = UI && UI.alMeld && UI.alMeld(vm, id); if (a) accion(a); };
MesaUI.hooks.pila = (id) => { const vm = Sesion.vm; const UI = vm && motorDe(vm.juego).ui; const a = UI && UI.alPila && UI.alPila(vm, id); if (a) accion(a); };
Acc.configurar({
  enviar: (a) => accion(a),
  sentar: () => { if (Sesion.rol === 'anfitrion') { P.invitarDialogo(Sesion.vm); return; } aviso('Pide al anfitrión que te abra un asiento', '#ffd23d'); },
  recomprar: () => { const vm = Sesion.vm; P.recompraDialogo(vm, (v) => { const r = recomprar(v); if (r.ok === false) aviso(r.error, '#ff6b6b'); else aviso('Recompra aplicada al empezar la próxima mano', '#6dff6d'); cabMesa.saldo.textContent = '🪙 ' + fmt(Cartera.saldo()); }); },
});
Entrada.configurar({ umbral: () => 0.25 + Aj.obtener().disp.controles.zonaMuerta, sens: () => Aj.obtener().disp.controles.sensibilidad, pausa: menuPausa, chat: abrirChat, activo: () => vista === 'mesa', contexto: () => (vista === 'mesa' ? (Sesion.vm && motorDe(Sesion.vm.juego).ui.mandoCartas ? vMesa : Acc.contenedor()) : vEntrar) });

// ---------- FPS y calidad automatica ----------
let fr = 0, t0 = performance.now(), bajos = 0;
function medirFps() {
  fr++; const t = performance.now();
  if (t - t0 >= 1000) {
    const fps = Math.round(fr * 1000 / (t - t0)); fr = 0; t0 = t;
    fpsEl.textContent = fps + ' FPS';
    if (!document.hidden && vista === 'mesa' && A.dispositivo.obtener().graficos.autoBajar) { bajos = fps < 22 ? bajos + 1 : 0; if (bajos >= 5 && Aj.bajarCalidad()) { bajos = 0; aviso('Calidad gráfica reducida automáticamente', '#ffd23d'); } }
  }
  requestAnimationFrame(medirFps);
}

// ---------- arranque ----------
document.addEventListener('pointerdown', desbloquear, { once: true });
document.addEventListener('keydown', desbloquear, { once: true });
// la nube bajo datos nuevos: se vuelve a leer el monedero y se repinta el menu (si hay una mesa en curso no se interrumpe)
function alBajarNube() { Cartera.recargar(); if (vista === 'entrar' && entrarUI) entrarUI.pintar(); aviso('Progreso actualizado desde tu cuenta', '#6dff6d'); }
async function arrancar() {
  try { if (window.Cuenta) await window.Cuenta.requerir(); } catch (e) { console.warn(e); } // sin sesion redirige al portal (no resuelve)
  app.hidden = false;
  try { if (window.Cuenta && window.Cuenta.ui) window.Cuenta.ui.mandoPropio = true; } catch (e) {} // los modales de la plataforma (conflicto de guardado) se manejan con mando; Entrada cede mientras estan abiertos
  const pi = /[?&]invitar=([A-Za-z0-9_-]+)/.exec(location.search);
  if (pi) { pendInvitar = pi[1]; try { const u = new URL(location.href); u.searchParams.delete('invitar'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) {} }
  if (window.Lobby && window.Lobby.registrar) window.Lobby.registrar(OPTS_LOBBY);
  await Cta.iniciarNube(alBajarNube, 4000); // antes de leer/escribir guardados; nunca espera mas de 4 s
  try { if (window.Red && !localStorage.getItem('juego_perfil')) window.Red.perfil.guardar({ nombre: window.Red.perfil.nombreAleatorio(), color: window.Red.perfil.paleta[Math.floor(Math.random() * 8)] }); } catch (e) {}
  Aj.aplicar(); iniciarSuscripcion(); Entrada.iniciar(); requestAnimationFrame(medirFps);
  Pro.revisarMonedero(Cartera.saldo());
  Cta.reportarLogrosLocales();
  irEntrar();
  if (window.Lobby && window.Lobby.hayEnlace()) { previstaDesdeUrl(); window.Lobby.abrir(OPTS_LOBBY); }
  else if (pendInvitar && Cta.hay()) { irCrear(); aviso('Crea tu mesa y deja un asiento como «Jugador humano»: invitaremos a tu amigo.', '#3df5ff', 6000); }
}
window.__cartas = { Sesion, A, Cartera, accion };
arrancar();
