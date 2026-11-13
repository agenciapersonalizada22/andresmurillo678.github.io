// Panel de ajustes con pestanas (navegable con raton, tactil, teclado y mando).
import { h } from './dom.js';
import { D, PRESETS, guardar, ponerCalidad, restablecer, TECLAS_BASE, guardarYa } from './ajustes.js';
import { modal, confirmar, toast } from './ui.js';
import { Sonido } from './sonido.js';
import { CLAVES, leer, escribir } from './almacen.js';
import * as Progreso from './progreso.js';
import { bloqueNube } from './cuenta-mente.js';

const get = (k) => k.split('.').reduce((o, p) => o[p], D), set = (k, v) => { const ps = k.split('.'), u = ps.pop(); ps.reduce((o, p) => o[p], D)[u] = v; guardar(); };
const fila = (tit, ctl, nota) => h('div', { cls: 'aj-fila' }, [h('div', { cls: 'aj-t' }, [h('b', { txt: tit }), nota ? h('small', { txt: nota }) : null]), ctl]);
const tog = (k, tit, nota, extra) => { const b = h('button', { type: 'button', cls: 'interr', 'data-f': 1, role: 'switch', 'aria-checked': String(!!get(k)), 'aria-label': tit, on: { click: () => { set(k, !get(k)); b.setAttribute('aria-checked', String(!!get(k))); if (extra) extra(); } } }, h('i')); return fila(tit, b, nota); };
const rango = (k, tit, min, max, paso, fmt = (v) => v, nota) => { const o = h('output', { txt: fmt(get(k)) }); const i = h('input', { type: 'range', min, max, step: paso, value: get(k), 'data-f': 1, 'aria-label': tit, on: { input: () => { set(k, Number(i.value)); o.textContent = fmt(Number(i.value)); } } }); return fila(tit, h('div', { cls: 'rng' }, [i, o]), nota); };
const grupo = (k, tit, ops, nota, alSet) => { const g = h('div', { cls: 'chips', role: 'group', 'aria-label': tit }); ops.forEach(([v, n]) => g.appendChild(h('button', { type: 'button', cls: 'chip', 'data-f': 1, txt: n, 'aria-pressed': String(get(k) === v), on: { click: () => { if (alSet) alSet(v); else set(k, v); Array.from(g.children).forEach((x, i) => x.setAttribute('aria-pressed', String(ops[i][0] === v))); } } }))); return fila(tit, g, nota); };

function pGraficos(c) {
  c.appendChild(grupo('calidad', 'Calidad', [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra']], 'Baja es la más ligera para móviles.', (v) => { ponerCalidad(v); reabrir(); }));
  c.appendChild(tog('particulas', 'Confeti y efectos', 'Celebraciones al lograr medallas.'));
  c.appendChild(tog('sombras', 'Sombras suaves'));
  c.appendChild(tog('animaciones', 'Animaciones y transiciones'));
  c.appendChild(rango('resolucion', 'Resolución de los lienzos', 0.5, 1.5, 0.25, (v) => Math.round(v * 100) + ' %', 'Afecta a gráficas y al seguimiento de objetos.'));
  c.appendChild(grupo('fpsMax', 'Límite de FPS', [[30, '30'], [60, '60'], [0, 'Sin límite']]));
  c.appendChild(tog('mostrarFps', 'Mostrar FPS'));
  c.appendChild(tog('autoBajada', 'Bajar calidad automáticamente', 'Si el dispositivo va lento durante unos segundos.'));
}
function pAudio(c) {
  c.appendChild(rango('sonido.maestro', 'Volumen maestro', 0, 1, 0.05, (v) => Math.round(v * 100) + ' %'));
  c.appendChild(rango('sonido.efectos', 'Efectos', 0, 1, 0.05, (v) => Math.round(v * 100) + ' %', 'Sonidos suaves sintetizados; nunca es lo único que indica un acierto.'));
  c.appendChild(rango('sonido.musica', 'Música ambiental', 0, 1, 0.05, (v) => Math.round(v * 100) + ' %', 'Notas suaves durante el juego. 0 = silencio.'));
  c.appendChild(tog('sonido.pausaOculta', 'Pausar audio al ocultar la pestaña'));
  c.appendChild(h('button', { type: 'button', cls: 'btn sec peq', 'data-f': 1, txt: 'Probar sonido', on: { click: () => { Sonido.ok(); } } }));
}
function pControles(c) {
  c.appendChild(tog('vibracion', 'Vibración', 'Táctil y mando (si el dispositivo la tiene).'));
  c.appendChild(rango('vibIntensidad', 'Intensidad de vibración', 0.2, 1, 0.1, (v) => Math.round(v * 100) + ' %'));
  c.appendChild(rango('zonaMuerta', 'Zona muerta de la palanca', 0.2, 0.9, 0.05, (v) => Math.round(v * 100) + ' %', 'Cuánto debes inclinar la palanca izquierda del mando para moverte.'));
  c.appendChild(tog('zurdo', 'Modo zurdo', 'Los botones de dirección pasan a la izquierda.'));
  c.appendChild(rango('tamBotones', 'Tamaño de botones', 80, 140, 10, (v) => v + ' %'));
  c.appendChild(h('div', { cls: 'bloque' }, [h('h3', { txt: 'Teclas' }), h('p', { cls: 'nota', txt: 'Pulsa una tecla para reasignar. Además siempre funcionan WASD, 1-9, Espacio y P. Mando: A/B/X/Y eligen respuestas, cruceta/palanca mueven, Menú pausa.' })]));
  const nombres = { izq: 'Izquierda', der: 'Derecha', arriba: 'Arriba', abajo: 'Abajo', ok: 'Confirmar', pausa: 'Pausa' };
  Object.keys(nombres).forEach((k) => {
    const b = h('button', { type: 'button', cls: 'btn sec peq tecla-btn', 'data-f': 1, txt: D.teclas[k], on: { click: () => {
      b.textContent = 'Pulsa una tecla…'; document.body.classList.add('capturando-tecla');
      const f = (e) => { e.preventDefault(); e.stopPropagation(); document.body.classList.remove('capturando-tecla'); removeEventListener('keydown', f, true); if (e.key !== 'Escape') { D.teclas[k] = e.key.toLowerCase(); guardar(); } b.textContent = D.teclas[k]; };
      addEventListener('keydown', f, true);
    } } });
    c.appendChild(fila(nombres[k], b));
  });
  c.appendChild(h('button', { type: 'button', cls: 'btn sec peq', 'data-f': 1, txt: 'Restablecer teclas', on: { click: () => { D.teclas = { ...TECLAS_BASE }; guardar(); reabrir(); } } }));
}
function pAcc(c) {
  c.appendChild(tog('acc.textoGrande', 'Texto grande'));
  c.appendChild(tog('acc.daltonismo', 'Modo daltonismo', 'Paleta segura y símbolos junto a cada color. Ningún juego depende solo del color.'));
  c.appendChild(tog('acc.reducirMov', 'Reducir movimiento', 'Sin animaciones; el seguimiento de objetos va más lento.'));
  c.appendChild(tog('acc.altoContraste', 'Alto contraste'));
  c.appendChild(grupo('acc.tiempoExtra', 'Tiempos extendidos', [[1, 'Normal'], [1.5, '×1,5'], [2, '×2'], [3, '×3']], 'Multiplica el tiempo para ver y responder cada estímulo. La puntuación es la misma.'));
  c.appendChild(h('p', { cls: 'nota', txt: 'Todos los juegos se pueden jugar con teclado, mando o toque. Cada acierto o error se indica con símbolo y texto además de sonido y color.' }));
}
function pRecordatorio(c) {
  const R = D.recordatorio, sop = 'Notification' in window;
  c.appendChild(h('p', { cls: 'nota', txt: 'Un aviso diario para recordarte la sesión. Funciona solo con esta pestaña abierta (no hay servidor que envíe avisos).' }));
  if (!sop) { c.appendChild(h('p', { cls: 'nota', txt: 'Este navegador no admite notificaciones.' })); return; }
  c.appendChild(tog('recordatorio.on', 'Recordatorio diario', null, async () => { if (D.recordatorio.on && Notification.permission !== 'granted') { const p = await Notification.requestPermission(); if (p !== 'granted') { D.recordatorio.on = false; guardar(); toast('Permiso de notificaciones denegado.'); reabrir(); } } }));
  const i = h('input', { type: 'time', value: R.hora, 'data-f': 1, 'aria-label': 'Hora del recordatorio', on: { change: () => { D.recordatorio.hora = i.value || '19:00'; guardar(); } } });
  c.appendChild(fila('Hora', i));
  c.appendChild(h('p', { cls: 'nota', txt: 'Permiso del navegador: ' + Notification.permission }));
}
function pDatos(c) {
  const area = h('textarea', { rows: 4, 'aria-label': 'Texto de copia de seguridad', cls: 'caja-texto', placeholder: 'Aquí aparece o se pega la copia de seguridad' });
  c.appendChild(h('div', { cls: 'bloque' }, [h('h3', { txt: 'Copia de seguridad' }), h('p', { cls: 'nota', txt: 'Exporta tu progreso como texto (sin ajustes de dispositivo) y guárdalo donde quieras.' }),
    h('div', { cls: 'fila-btn' }, [
      h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Exportar', on: { click: () => { Progreso.guardarYa(); area.value = btoa(unescape(encodeURIComponent(JSON.stringify({ juego: 'mente', v: 1, progreso: Progreso.obtener() })))); area.select(); toast('Copia generada: cópiala del cuadro.'); } } }),
      h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Importar', on: { click: async () => {
        let o; try { o = JSON.parse(decodeURIComponent(escape(atob(area.value.trim())))); } catch (e) { o = null; }
        if (!o || o.juego !== 'mente' || !o.progreso || typeof o.progreso.juegos !== 'object') { toast('Texto no válido.'); return; }
        if (await confirmar('Esto reemplaza tu progreso actual por el de la copia. ¿Continuar?', { peligro: true, si: 'Reemplazar' })) { Progreso.reemplazar(o.progreso); toast('Progreso importado.'); }
      } } })]), area]));
  c.appendChild(bloqueNube());
  c.appendChild(h('div', { cls: 'bloque' }, [h('h3', { txt: 'Borrar' }),
    h('button', { type: 'button', cls: 'btn peligro', 'data-f': 1, txt: 'Borrar todo el progreso', on: { click: async () => { if (await confirmar('Se borrará tu historial, medallas, racha y monedas de este dispositivo. No se puede deshacer.', { peligro: true, si: 'Borrar' })) { Progreso.borrarTodo(); localStorage.removeItem(CLAVES.partida); toast('Progreso borrado.'); } } } }),
    h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Restablecer ajustes', on: { click: async () => { if (await confirmar('¿Volver a los ajustes predeterminados?', { si: 'Restablecer' })) { restablecer(); reabrir(); } } } })]));
}
const TABS = [['Gráficos', pGraficos], ['Audio', pAudio], ['Controles', pControles], ['Accesibilidad', pAcc], ['Recordatorio', pRecordatorio], ['Datos', pDatos]];
let tab = 0, cerrarActual = null;
function reabrir() { if (cerrarActual) { cerrarActual(); } abrirAjustes(tab); }
export function abrirAjustes(t = tab) {
  tab = t;
  cerrarActual = modal('Ajustes', (c) => {
    const nav = h('div', { cls: 'tabs', role: 'tablist' }), cuerpo = h('div', { cls: 'aj-cuerpo', role: 'tabpanel' });
    const mostrar = (i) => { tab = i; cuerpo.replaceChildren(); TABS[i][1](cuerpo); Array.from(nav.children).forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); }); };
    TABS.forEach(([n], i) => nav.appendChild(h('button', { type: 'button', cls: 'tab', role: 'tab', 'data-f': 1, txt: n, 'aria-selected': String(i === tab), on: { click: () => mostrar(i) } })));
    c.appendChild(nav); c.appendChild(cuerpo); mostrar(tab);
  }, { ancha: true, alCerrar: () => { guardarYa(); cerrarActual = null; } });
}
