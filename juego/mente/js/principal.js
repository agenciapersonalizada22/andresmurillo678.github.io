// Arranque de Gimnasio Mental: ajustes, tema, cuenta, nube, pantallas, recordatorio y ganchos de prueba.
import './pantallas.js';
import { h, $ } from './dom.js';
import * as Ajustes from './ajustes.js';
import * as Progreso from './progreso.js';
import { Entrada, iniciarMando } from './entrada.js';
import { Sonido } from './sonido.js';
import { ir, atras, modal, toast, refrescar, registrar } from './ui.js';
import { abrirAjustes, abrirAyuda, abrirCuenta } from './pantallas.js';
import * as CM from './cuenta-mente.js';
import * as Flujos from './flujos.js';
import * as Motor from './motor.js';
import { TIENDA } from './progreso.js';
import { AVISO } from './datos.js';

const aplicarEquipado = () => {
  const S = Progreso.obtener();
  document.body.dataset.tema = (S.equipado.tema || 'tema_noche').replace('tema_', '');
  Sonido.conjunto = (S.equipado.sonido || 'son_suave').replace('son_', '');
  const it = TIENDA.find((x) => x.id === S.equipado.emblema);
  const e = $('#emblema'); if (e) { e.textContent = it && it.glifo ? it.glifo : ''; e.hidden = !(it && it.glifo); }
  const m = $('#monedas'); if (m) m.textContent = String(S.monedas);
  const tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.setAttribute('content', getComputedStyle(document.body).getPropertyValue('--fondo').trim() || '#0e1424');
};
function pintarChip() {
  const el = $('#chipCuenta'); if (!el) return; el.textContent = '';
  const u = CM.usuario(); el.hidden = !u; if (!u) return;
  el.appendChild(h('button', { type: 'button', cls: 'chip-cuenta', 'data-f': 1, 'aria-label': 'Cuenta de ' + (u.nombre || u.usuario), on: { click: abrirCuenta } }, [h('span', { txt: u.nombre || u.usuario }), h('small', { txt: ' · Nv ' + (u.nivel || 1) })]));
}
function pantallaCompleta() {
  const d = document.documentElement;
  if (document.fullscreenElement) document.exitFullscreen(); else if (d.requestFullscreen) d.requestFullscreen().catch(() => {});
}
let wake = null;
async function pedirWake() { try { if (navigator.wakeLock && document.body.classList.contains('jugando') && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; } }

Ajustes.aplicar(); aplicarEquipado();
Progreso.alCambiar(aplicarEquipado);
Progreso.alLogro((id) => { CM.logro(id); const l = Progreso.LOGROS.find((x) => x.id === id); if (l) toast('Logro: ' + l.nombre, 'logro'); });
$('#bAjustes').addEventListener('click', () => abrirAjustes());
$('#bAyuda').addEventListener('click', abrirAyuda);
$('#bPantalla').addEventListener('click', pantallaCompleta);
$('#bVolver').addEventListener('click', () => atras());
$('#bInicio').addEventListener('click', () => { if (!document.body.classList.contains('jugando')) ir('inicio', {}, { raiz: true }); });
new MutationObserver(() => pedirWake()).observe(document.body, { attributes: true, attributeFilter: ['class'] });
document.addEventListener('visibilitychange', () => { if (!document.hidden) pedirWake(); });
iniciarMando();
Entrada.atras = Entrada.atras;

(async function () {
  CM.aplicarPerfil(); pintarChip();
  CM.iniciarNube(() => { Progreso.recargar(); refrescar(); });
  if (window.Cuenta && window.Cuenta.alCambiar) { try { window.Cuenta.alCambiar(pintarChip); window.Cuenta.on('nivel', pintarChip); } catch (e) { /* sin eventos */ } }
  if (CM.usuario()) { CM.sincronizarLogros(Progreso.obtener().logros); }
  ir('inicio', {}, { raiz: true });
  if (!Progreso.obtener().avisoVisto) {
    modal('Antes de empezar', (m, cerrar) => {
      m.appendChild(h('p', { cls: 'aviso-visible', txt: AVISO }));
      m.appendChild(h('p', { txt: 'Son juegos cortos de memoria, atención, velocidad, flexibilidad y lógica. Tu progreso solo se compara contigo mismo y se guarda en este dispositivo (y en tu cuenta si sincronizas).' }));
      m.appendChild(h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, id: 'bEntendido', txt: 'Entendido', on: { click: () => { Progreso.obtener().avisoVisto = true; Progreso.guardar(); cerrar(); } } }));
    }, { sinCerrar: true });
  }
  setInterval(Flujos.recordatorioTick, 30000);
  const hc = Flujos.partidaGuardada(); if (hc) toast('Tienes una partida en curso: pulsa Continuar.');
})();
window.__mente = { Progreso, Flujos, Motor, Ajustes, ir, Entrada };
