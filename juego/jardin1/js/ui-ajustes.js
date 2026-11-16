// Menu de ajustes con pestanas: graficos, audio, controles, accesibilidad, juego, datos.
import { h, toast } from './dom.js';
import { AJ, guardarAjustes, restablecerAjustes, exportar, importar, borrarTodo, AJ_DEF } from './almacen.js';
import * as S from './sonido.js';
import * as CJ from './cuenta-jardin.js';
import { mostrar, cab, btn, refrescar } from './ui.js';
import { App } from './app.js';
import { DIF } from './datos.js';

let tab = 'graficos';
const aplicar = () => { guardarAjustes(); S.Son.vol = { ...AJ.audio }; S.aplicar(); App.aplicarAjustes && App.aplicarAjustes(); };
const fila = (et, ctl, nota) => h('div', { cls: 'ajf' }, [h('label', { txt: et }), ctl, nota ? h('small', { txt: nota }) : null]);
const tog = (obj, k, extra) => h('button', { type: 'button', cls: 'tog' + (obj[k] ? ' on' : ''), role: 'switch', 'aria-checked': String(!!obj[k]), 'data-f': 1, txt: obj[k] ? 'Sí' : 'No', on: { click: (e) => { obj[k] = !obj[k]; e.target.classList.toggle('on', obj[k]); e.target.textContent = obj[k] ? 'Sí' : 'No'; e.target.setAttribute('aria-checked', String(obj[k])); aplicar(); extra && extra(); } } });
const opc = (obj, k, vals, extra) => { const c = h('div', { cls: 'tabs peq' }); const pintar = () => { c.textContent = ''; vals.forEach(([v, n]) => c.appendChild(h('button', { type: 'button', cls: 'tab' + (obj[k] === v ? ' on' : ''), 'data-f': 1, txt: n, on: { click: () => { obj[k] = v; aplicar(); extra && extra(); pintar(); } } }))); }; pintar(); return c; };
const slider = (obj, k, min, max, paso, fmtv, extra) => { const v = h('span', { cls: 'val', txt: fmtv ? fmtv(obj[k]) : String(obj[k]) }); const i = h('input', { type: 'range', min, max, step: paso, value: obj[k], 'data-f': 1, 'aria-label': k, on: { input: (e) => { obj[k] = +e.target.value; v.textContent = fmtv ? fmtv(obj[k]) : String(obj[k]); aplicar(); extra && extra(); } } }); return h('div', { cls: 'sl' }, [i, v]); };
const pct = (x) => Math.round(x * 100) + '%';
const NOM_TECLAS = { arriba: 'Arriba', abajo: 'Abajo', izq: 'Izquierda', der: 'Derecha', plantar: 'Plantar', pala: 'Pala', sol: 'Recoger sol', sig: 'Semilla siguiente', ant: 'Semilla anterior', pausa: 'Pausa' };

export function ajustes() {
  mostrar(() => {
    const raiz = h('div', { cls: 'aj' }), tabs = h('div', { cls: 'tabs' }), cuerpo = h('div', { cls: 'aj-cuerpo' });
    [['graficos', 'Gráficos'], ['audio', 'Audio'], ['controles', 'Controles'], ['acc', 'Accesibilidad'], ['juego', 'Juego'], ['datos', 'Datos']].forEach(([k, n]) => tabs.appendChild(h('button', { type: 'button', cls: 'tab' + (tab === k ? ' on' : ''), 'data-f': 1, 'data-test': 'aj-' + k, txt: n, on: { click: () => { tab = k; refrescar(); } } })));
    const G = AJ.graficos, A = AJ.audio, C = AJ.controles, X = AJ.accesibilidad, J = AJ.juego;
    if (tab === 'graficos') {
      cuerpo.append(fila('Calidad', opc(G, 'calidad', [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra']]), 'Baja es la más ligera para móviles; Ultra para PC potentes.'), fila('Sombras', tog(G, 'sombras')), fila('Partículas y efectos', tog(G, 'particulas')),
        fila('Límite de FPS', opc(G, 'fps', [[30, '30'], [60, '60'], [0, 'Sin límite']])), fila('Resolución', slider(G, 'res', 0.5, 1.5, 0.25, pct), 'Escala sobre la calidad elegida.'), fila('Mostrar FPS', tog(G, 'mostrarFps')), fila('Bajar calidad automáticamente', tog(G, 'auto'), 'Si el rendimiento es bajo, la calidad baja sola.'));
    } else if (tab === 'audio') {
      cuerpo.append(fila('Volumen general', slider(A, 'maestro', 0, 1, 0.05, pct, () => S.sfx('sol'))), fila('Música', slider(A, 'musica', 0, 1, 0.05, pct)), fila('Efectos', slider(A, 'efectos', 0, 1, 0.05, pct, () => S.sfx('plantar'))), fila('Silenciar todo', tog(A, 'mudo')), h('p', { cls: 'nota', txt: 'El audio se pausa solo al ocultar la pestaña.' }));
    } else if (tab === 'controles') {
      cuerpo.append(fila('Zona muerta del mando', slider(C, 'zona', 0.05, 0.5, 0.05, pct)), fila('Vibración', tog(C, 'vib')), fila('Intensidad de vibración', slider(C, 'vibInt', 0.2, 1, 0.1, pct)), fila('Modo zurdo (botones a la izquierda)', tog(C, 'zurdo')), fila('Tamaño de botones táctiles', slider(C, 'tam', 0.8, 1.5, 0.1, pct)), fila('Opacidad de botones', slider(C, 'op', 0.4, 1, 0.1, pct)));
      cuerpo.appendChild(h('h3', { txt: 'Teclas' }));
      Object.keys(NOM_TECLAS).forEach((k) => { const b = h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: C.teclas[k] === ' ' ? 'Espacio' : C.teclas[k], on: { click: () => { b.textContent = 'Pulsa una tecla…'; const f = (e) => { e.preventDefault(); e.stopPropagation(); removeEventListener('keydown', f, true); if (e.key !== 'Escape') { C.teclas[k] = e.key.length === 1 ? e.key.toLowerCase() : e.key; aplicar(); } b.textContent = C.teclas[k]; }; addEventListener('keydown', f, true); } } }); cuerpo.appendChild(fila(NOM_TECLAS[k], b)); });
      cuerpo.appendChild(btn('Restablecer teclas', () => { C.teclas = { ...AJ_DEF.controles.teclas }; aplicar(); refrescar(); }, 'sec'));
    } else if (tab === 'acc') {
      cuerpo.append(fila('Tamaño del texto', opc(X, 'texto', [[1, 'Normal'], [1.25, 'Grande'], [1.5, 'Enorme']], () => { document.documentElement.style.setProperty('--ts', X.texto); })), fila('Modo daltónico (símbolos y patrones)', tog(X, 'dalt', () => App.logroExtra && X.dalt && App.logroExtra('daltonico')), 'Añade un símbolo por rol a cada planta, patrones a las armaduras y números a los soles.'), fila('Reducir movimiento y efectos', tog(X, 'reducir')), fila('Recoger soles automáticamente', tog(X, 'autoSol'), 'Los soles se recogen solos a los 3 segundos.'));
    } else if (tab === 'juego') {
      cuerpo.append(fila('Dificultad', opc(J, 'dif', Object.keys(DIF).map((k) => [k, DIF[k].n])), 'Fácil: zombis más débiles y lentos. Desafiante: más fuertes y sin cortadoras.'), fila('Velocidad del juego', slider(J, 'vel', 0.5, 2, 0.25, (v) => v + '×', () => App.velocidad && App.velocidad(J.vel))), fila('Tutorial en el primer nivel', tog(J, 'tutorial')));
    } else {
      const ta = h('textarea', { rows: 4, 'aria-label': 'Datos de guardado', readonly: true }), msg = h('div', { cls: 'nota', 'aria-live': 'polite' });
      cuerpo.append(h('p', { cls: 'nota', txt: 'Exporta tu progreso como texto para guardarlo o moverlo a otro dispositivo (los ajustes de este dispositivo no se incluyen).' }),
        btn('Exportar progreso', () => { ta.value = exportar(); ta.readOnly = true; ta.select(); msg.textContent = 'Copia el texto de arriba.'; try { navigator.clipboard && navigator.clipboard.writeText(ta.value).catch(() => {}); } catch (e) { /* sin portapapeles */ } }, 'sec', { 'data-test': 'exportar' }), ta,
        btn('Importar (pega el texto y pulsa)', () => { if (ta.readOnly) { ta.readOnly = false; ta.value = ''; ta.focus(); msg.textContent = 'Pega el texto y vuelve a pulsar Importar.'; return; } if (importar(ta.value)) { msg.textContent = 'Progreso importado.'; toast('Progreso importado'); App.tras && App.tras(); } else msg.textContent = 'El texto no es válido.'; }, 'sec', { 'data-test': 'importar' }),
        btn('Restablecer ajustes', () => { restablecerAjustes(); aplicar(); refrescar(); }, 'sec'),
        btn('Borrar todos los datos', () => { if (confirm('¿Borrar progreso, ajustes y partida de Jardín Zombi de este dispositivo?')) { borrarTodo(); aplicar(); msg.textContent = 'Datos borrados.'; App.tras && App.tras(); } }, 'peligro', { 'data-test': 'borrar' }), msg, CJ.bloqueNube());
    }
    raiz.append(cab('Ajustes'), tabs, cuerpo); return raiz;
  });
}
