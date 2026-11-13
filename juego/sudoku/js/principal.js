// Arranque de la aplicacion: enlaza DOM, ajustes, cuenta, juego y menus.
import { $ } from './dom.js';
import { A, aplicar, guardar as guardarAjustes } from './ajustes.js';
import * as J from './juego.js';
import * as UI from './ui.js';
import * as PR from './progreso.js';
import * as CU from './cuenta-sudoku.js';
import { iniciarMando } from './mando-ui.js';
import { desbloquear } from './sonido.js';

aplicar();
const refs = {
  menu: $('#menu'), juego: $('#juego'), zona: $('#zona'), lateral: $('#lateral'), tablero: $('#tablero'), teclado: $('#teclado'), acciones: $('#acciones'), aviso: $('#aviso'),
  iModo: $('#iModo'), iNivel: $('#iNivel'), iTiempo: $('#iTiempo'), iVidas: $('#iVidas'), iErr: $('#iErr')
};

function enviarCuenta(res) {
  if (!CU.usuario()) return;
  CU.enviarPuntajes(res.pun);
  (res.nuevos || []).forEach((id, i) => setTimeout(() => CU.logro(id), 400 + i * 900));
  if (res.xp) CU.xp(res.xp);
  else if (res.maraton && res.maraton.fin) CU.xp(Math.min(300, Math.round(res.maraton.pts / 10)));
}
function avisarLogros(ids) { ids.forEach((id) => { const l = PR.LOGROS.find((x) => x.id === id); if (l) UI.toast('★ Logro: ' + l.nombre); CU.logro(id); }); }

J.iniciar(refs, {
  cargando: UI.cargando, toast: UI.toast, alFin: UI.dialogoFin, menuPausa: UI.menuPausa, hayCapa: UI.hayCapa,
  alMenu: () => { UI.menuPrincipal(); }, enviarCuenta, logros: avisarLogros
});
UI.menuPrincipal();
iniciarMando();

/* ---------- barra superior ---------- */
const sonido = $('#bSonido');
const pintarSonido = () => { sonido.textContent = A.audio.silencio ? '🔇' : '♪'; sonido.setAttribute('aria-pressed', String(!A.audio.silencio)); };
sonido.addEventListener('click', () => { A.audio.silencio = !A.audio.silencio; guardarAjustes(); pintarSonido(); desbloquear(); });
pintarSonido();
$('#bPantalla').addEventListener('click', UI.alternarPantalla);
$('#bAjustes').addEventListener('click', () => UI.dialogoAjustes());
$('#bAyuda').addEventListener('click', () => UI.dialogoAyuda());
$('#bPausa').addEventListener('click', () => UI.menuPausa());
addEventListener('keydown', (e) => { if (e.key === '?' && !UI.hayCapa()) UI.dialogoAyuda(); });
document.addEventListener('pointerdown', desbloquear, { once: true });

/* ---------- pantalla encendida durante la partida (movil) ---------- */
let wl = null;
async function pedirWake() { try { if ('wakeLock' in navigator && !wl && J.estado.p && !J.estado.p.fin) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } } catch (e) { wl = null; } }
document.addEventListener('visibilitychange', () => { if (!document.hidden) pedirWake(); });
setInterval(() => { if (!J.estado.p || J.estado.p.fin) { if (wl) { try { wl.release(); } catch (e) { /* ya liberado */ } wl = null; } } else if (!wl) pedirWake(); }, 5000);

/* ---------- cuenta ---------- */
CU.pintarChip($('#chipCuenta'));
CU.iniciarNube(() => { PR.recargar(); UI.menuPrincipal(); });
CU.sincronizarLogros(PR.P.logros);
if (window.Cuenta && window.Cuenta.on) { try { window.Cuenta.on('perfil', () => CU.pintarChip($('#chipCuenta'))); window.Cuenta.on('sesion', () => CU.pintarChip($('#chipCuenta'))); } catch (e) { /* sin eventos */ } }
window.__sudoku = { J, UI, PR };
