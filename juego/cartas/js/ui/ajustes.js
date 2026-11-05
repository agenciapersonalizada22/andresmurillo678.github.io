// Ajustes con pestanas (Graficos, Audio, Controles, Accesibilidad, Datos) y su aplicacion al documento.
import { h, boton, dialogo, aviso, confirmar, fmt } from './dom.js';
import * as A from '../marco/almacen.js';
import * as Dibujo from '../marco/dibujo.js';
import { vol, Sonido } from '../marco/sonido.js';
import { cfgUI } from './mesaUI.js';
import * as Acc from './acciones.js';
import { Cartera } from '../marco/cartera.js';
import * as Cta from '../marco/cuenta.js';
import { bloqueNube } from './cuentaUI.js';

const PRESETS = { baja: { animaciones: false, sombras: false }, media: { animaciones: true, sombras: false }, alta: { animaciones: true, sombras: true }, ultra: { animaciones: true, sombras: true } };
export const ORDEN_PRESET = ['baja', 'media', 'alta', 'ultra'];
let aj = A.ajustes.obtener(), disp = A.dispositivo.obtener();
export const obtener = () => ({ aj, disp });
export function aplicar() {
  const d = document.documentElement, ac = aj.accesibilidad, g = disp.graficos, c = disp.controles;
  d.dataset.texto = ac.textoGrande ? 'grande' : 'normal'; d.dataset.contraste = ac.contraste ? 'alto' : 'normal'; d.dataset.daltonico = ac.daltonico ? '1' : '0';
  d.dataset.mov = ac.reducirMov ? 'reducido' : 'normal'; d.dataset.calidad = g.preset; d.dataset.sombras = g.sombras ? '1' : '0';
  d.style.setProperty('--escala-btn', String(c.tamBoton)); d.style.setProperty('--opacidad-btn', String(c.opacidad));
  Dibujo.ajustar({ daltonico: ac.daltonico, contraste: ac.contraste, reverso: aj.mesa.reverso }); Dibujo.refrescarCartas(document);
  vol.maestro = aj.audio.maestro; vol.efectos = aj.audio.efectos;
  cfgUI.animar = g.animaciones && !ac.reducirMov;
  Acc.ponerTeclas(c.teclas); Acc.ponerZurdo(c.zurdo);
  const fps = document.getElementById('fps'); if (fps) fps.hidden = !g.fps;
}
export function cambiar(f, dispositivo) { f(aj, disp); if (dispositivo) A.dispositivo.guardar(disp); A.ajustes.guardar(aj); aplicar(); }
export function bajarCalidad() {
  const i = ORDEN_PRESET.indexOf(disp.graficos.preset); if (i <= 0) return false;
  setPreset(ORDEN_PRESET[i - 1]); return true;
}
function setPreset(p) { cambiar((a, d) => { d.graficos.preset = p; Object.assign(d.graficos, PRESETS[p]); }, true); }

const ETQ_TECLAS = { fold: 'Retirarse', check: 'Pasar', call: 'Igualar', raise: 'Subir / apostar', allin: 'All-in', apostar: 'Apostar (21)', pedir: 'Pedir', plantarse: 'Plantarse', doblar: 'Doblar', dividir: 'Dividir', rendirse: 'Rendirse', pasar: 'Pasar ronda', seguro: 'Seguro', noseguro: 'Sin seguro' };
const TECLAS_DEF = { fold: 'f', check: 'c', call: 'c', raise: 'r', allin: 'a', apostar: 'a', pedir: 'c', plantarse: 'p', doblar: 'd', dividir: 'v', rendirse: 'r', pasar: 'p', seguro: 's', noseguro: 'n' };

function fila(etq, ctl, nota) { return h('label', { cls: 'a-fila' }, [h('span', { txt: etq }), ctl, nota ? h('small', { txt: nota }) : null]); }
function interruptor(valor, fn) { const c = h('input', { type: 'checkbox', 'data-f': 1, role: 'switch' }); c.checked = !!valor; c.addEventListener('change', () => fn(c.checked)); return c; }
function deslizador(valor, min, max, paso, fn) { const c = h('input', { type: 'range', min, max, step: paso, value: valor, cls: 'a-slider fino', 'data-f': 1 }); c.addEventListener('input', () => fn(+c.value)); return c; }
function selector(valor, ops, fn) { const s = h('select', { cls: 'campo', 'data-f': 1 }, ops.map(([v, t]) => h('option', { value: v, txt: t }))); s.value = valor; s.addEventListener('change', () => fn(s.value)); return s; }

export function ajustesDialogo(pestana) {
  let actual = pestana || 'graficos';
  const cuerpo = h('div', { cls: 'a-cuerpo' }), tabs = h('div', { cls: 'tabs', role: 'tablist' });
  let limpiar = null;
  const T = {
    graficos() {
      const g = disp.graficos;
      return [fila('Calidad', selector(g.preset, [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra']], (v) => { setPreset(v); pintar(); })),
        fila('Animaciones de cartas y fichas', interruptor(g.animaciones, (v) => cambiar((a, d) => { d.graficos.animaciones = v; }, true))),
        fila('Sombras y brillos', interruptor(g.sombras, (v) => cambiar((a, d) => { d.graficos.sombras = v; }, true))),
        fila('Mostrar FPS', interruptor(g.fps, (v) => cambiar((a, d) => { d.graficos.fps = v; }, true))),
        fila('Bajar la calidad automáticamente si va lento', interruptor(g.autoBajar, (v) => cambiar((a, d) => { d.graficos.autoBajar = v; }, true))),
        fila('Reverso de las cartas', selector(aj.mesa.reverso, Dibujo.REVERSOS, (v) => cambiar((a) => { a.mesa.reverso = v; })))];
    },
    audio() {
      return [fila('Volumen general', deslizador(aj.audio.maestro, 0, 1, 0.05, (v) => { cambiar((a) => { a.audio.maestro = v; }); Sonido.fichas(2); })),
        fila('Efectos (cartas y fichas)', deslizador(aj.audio.efectos, 0, 1, 0.05, (v) => { cambiar((a) => { a.audio.efectos = v; }); Sonido.carta(); })),
        fila('Silenciar al ocultar la pestaña', interruptor(aj.audio.pausaOculta, (v) => cambiar((a) => { a.audio.pausaOculta = v; }))),
        boton('Probar sonidos', () => { Sonido.barajar(); setTimeout(() => Sonido.fichas(4), 400); setTimeout(() => Sonido.ganar(), 800); }, 'sec')];
    },
    controles() {
      const c = disp.controles;
      const lista = Object.keys(ETQ_TECLAS).map((id) => {
        const b = boton(((c.teclas[id] || TECLAS_DEF[id]) || '—').toUpperCase(), () => {
          b.textContent = 'pulsa una tecla…';
          const f = (e) => { e.preventDefault(); e.stopPropagation(); document.removeEventListener('keydown', f, true); if (e.key !== 'Escape') cambiar((a, d) => { d.controles.teclas[id] = e.key.length === 1 ? e.key.toLowerCase() : e.key; }, true); pintar(); };
          document.addEventListener('keydown', f, true);
        }, 'sec chico');
        return fila(ETQ_TECLAS[id], b);
      });
      return [fila('Modo zurdo (acciones invertidas)', interruptor(c.zurdo, (v) => cambiar((a, d) => { d.controles.zurdo = v; }, true))),
        fila('Vibración del mando', interruptor(c.vibracion, (v) => cambiar((a, d) => { d.controles.vibracion = v; }, true))),
        fila('Zona muerta del stick', deslizador(c.zonaMuerta, 0.1, 0.8, 0.05, (v) => cambiar((a, d) => { d.controles.zonaMuerta = v; }, true))),
        fila('Sensibilidad de la cantidad (LB/RB)', deslizador(c.sensibilidad, 0.5, 3, 0.25, (v) => cambiar((a, d) => { d.controles.sensibilidad = v; }, true))),
        fila('Tamaño de los botones táctiles', deslizador(c.tamBoton, 0.8, 1.4, 0.05, (v) => cambiar((a, d) => { d.controles.tamBoton = v; }, true))),
        fila('Opacidad de los controles', deslizador(c.opacidad, 0.5, 1, 0.05, (v) => cambiar((a, d) => { d.controles.opacidad = v; }, true))),
        h('h3', { txt: 'Teclas' }), ...lista,
        boton('Restablecer teclas', () => { cambiar((a, d) => { d.controles.teclas = {}; }, true); pintar(); }, 'sec')];
    },
    accesibilidad() {
      const ac = aj.accesibilidad;
      return [fila('Texto grande', interruptor(ac.textoGrande, (v) => cambiar((a) => { a.accesibilidad.textoGrande = v; }))),
        fila('Modo daltónico (colores y formas distintas)', interruptor(ac.daltonico, (v) => cambiar((a) => { a.accesibilidad.daltonico = v; }))),
        fila('Alto contraste', interruptor(ac.contraste, (v) => cambiar((a) => { a.accesibilidad.contraste = v; }))),
        fila('Reducir movimiento', interruptor(ac.reducirMov, (v) => cambiar((a) => { a.accesibilidad.reducirMov = v; })))];
    },
    datos() {
      const area = h('textarea', { cls: 'campo', rows: 4, 'aria-label': 'Guardado', 'data-f': 1, placeholder: 'Aquí aparece tu guardado; para importar pega el texto y pulsa Importar' });
      const nube = bloqueNube(); limpiar = nube.limpiar || null;
      return [nube, h('p', { txt: 'El guardado incluye monedero, estadísticas, logros y mesas guardadas. No incluye los ajustes de gráficos y controles de este dispositivo.' }), area,
        h('div', { cls: 'fila' }, [boton('Exportar', () => { area.value = A.exportar(); area.select(); }, 'sec'), boton('Importar', () => { const r = A.importar(area.value); if (r.ok) { aviso(`Importado (${r.n} datos). Recargando…`, '#6dff6d'); Cartera.recargar(); setTimeout(() => location.reload(), 700); } else aviso(r.error, '#ff6b6b'); }, 'sec')]),
        fila('Fichas iniciales del monedero', deslizador(aj.economia.inicial, 500, 50000, 500, (v) => cambiar((a) => { a.economia.inicial = v; })), 'se usa al reiniciar el monedero'),
        fila('Regalo diario (fichas, 0 = desactivado)', deslizador(aj.economia.regalo, 0, 5000, 100, (v) => cambiar((a) => { a.economia.regalo = v; }))),
        h('div', { cls: 'fila' }, [boton('Reiniciar monedero', () => confirmar('El saldo vuelve a las fichas iniciales.', 'Reiniciar monedero', () => { Cartera.reiniciar(); aviso('Monedero reiniciado'); }), 'sec'),
          boton('Borrar todo el progreso', () => confirmar('Se borran monedero, estadísticas, logros y mesas guardadas' + (Cta.hay() ? ' (y en la próxima sincronización también tu copia de la nube)' : '') + '. No se puede deshacer.', 'Borrar progreso', () => { A.borrarTodo(false); Cartera.recargar(); setTimeout(() => location.reload(), 300); }, 'Borrar'), 'peligro')])];
    },
  };
  const NOMBRES = [['graficos', 'Gráficos'], ['audio', 'Audio'], ['controles', 'Controles'], ['accesibilidad', 'Accesibilidad'], ['datos', 'Datos']];
  function pintar() {
    tabs.replaceChildren(...NOMBRES.map(([id, n]) => { const b = boton(n, () => { actual = id; pintar(); }, 'tab' + (id === actual ? ' on' : ''), { role: 'tab', 'aria-selected': String(id === actual) }); return b; }));
    if (limpiar) { limpiar(); limpiar = null; }
    cuerpo.replaceChildren(...T[actual]().filter(Boolean));
  }
  pintar();
  return dialogo({ titulo: 'Ajustes', ancho: 'ancho', cuerpo: [tabs, cuerpo], alCerrar: () => { if (limpiar) { limpiar(); limpiar = null; } }, botones: [{ txt: 'Listo', cls: 'prim' }] });
}
