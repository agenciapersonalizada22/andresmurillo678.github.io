// Ajustes por dispositivo (bolos_ajustes_dispositivo): graficos, audio, controles, accesibilidad y datos. Navegable con raton, tactil, teclado y mando.
import { CLAVES, leer, escribir, mezclar, exportar, importar, borrarTodo } from './almacen.js';
import { h } from './dom.js';
import { Sonido } from './sonido.js';
import { bloqueNube } from './cuenta-bolos.js';

export const TECLAS_BASE = { izq: 'ArrowLeft', der: 'ArrowRight', apIzq: 'KeyQ', apDer: 'KeyE', efIzq: 'KeyZ', efDer: 'KeyC', lanzar: 'Space', tabla: 'KeyT', pausa: 'Escape' };
const NOMBRES_TECLAS = { izq: 'Mover bola a la izquierda', der: 'Mover bola a la derecha', apIzq: 'Apuntar a la izquierda', apDer: 'Apuntar a la derecha', efIzq: 'Efecto a la izquierda', efDer: 'Efecto a la derecha', lanzar: 'Lanzar (mantén y suelta)', tabla: 'Ver tabla de puntos', pausa: 'Pausa' };
const BASE = {
  calidad: 'alta', sombras: 1, pr: 1.5, aa: true, detalle: 1, fpsMax: 0, fps: false, autoBajada: true, guia: true,
  maestro: 0.8, musica: 0.3, efectos: 0.9, musicaOn: false, pausaOculta: true,
  sens: 1, zonaMando: 0.15, invertirEfecto: false, vibracion: true, vibInt: 1, zurdo: false, botones: 'auto', tamBoton: 100, opBoton: 100, posBoton: 'abajo',
  textoGrande: false, daltonico: false, reducirMov: false, contraste: false,
  teclas: { ...TECLAS_BASE }
};
export const PRESETS = {
  baja: { sombras: 0, pr: 1, aa: false, detalle: 0, fpsMax: 0 },
  media: { sombras: 0, pr: 1.25, aa: false, detalle: 1, fpsMax: 0 },
  alta: { sombras: 1, pr: 1.5, aa: true, detalle: 1, fpsMax: 0 },
  ultra: { sombras: 2, pr: 2, aa: true, detalle: 2, fpsMax: 0 }
};
export const D = { ...mezclar(BASE, leer(CLAVES.dispositivo, {})) };
D.teclas = { ...TECLAS_BASE, ...(leer(CLAVES.dispositivo, {}).teclas || {}) };
if (!leer(CLAVES.dispositivo)) {
  try { if (matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600) { D.calidad = 'media'; Object.assign(D, PRESETS.media); } } catch (e) { /* sin matchMedia */ }
}
const alCambiar = [];
export const suscribir = (fn) => alCambiar.push(fn);
let diferido = 0;
export function guardar() { clearTimeout(diferido); diferido = setTimeout(guardarYa, 250); aplicar(); alCambiar.forEach((f) => f()); }
export function guardarYa() { clearTimeout(diferido); escribir(CLAVES.dispositivo, D); }
export const calidadEscena = () => ({ sombras: D.sombras, pr: Math.max(0.5, Math.min(window.devicePixelRatio || 1, D.pr)), aa: D.aa, detalle: D.detalle });
export function aplicar() {
  const c = document.body.classList, r = document.documentElement.style;
  let tact = false; try { tact = matchMedia('(pointer: coarse)').matches; } catch (e) { /* sin matchMedia */ }
  c.toggle('sin-cluster', D.botones === 'no' || (D.botones === 'auto' && !tact));
  c.toggle('texto-grande', D.textoGrande); c.toggle('sinmov', D.reducirMov); c.toggle('daltonico', D.daltonico); c.toggle('contraste', D.contraste); c.toggle('zurdo', D.zurdo);
  r.setProperty('--btn-k', String(D.tamBoton / 100)); r.setProperty('--btn-op', String(D.opBoton / 100));
  document.documentElement.dataset.botones = D.posBoton;
  Sonido.ajustar({ maestro: D.maestro, musica: D.musica, efectos: D.efectos, musicaOn: D.musicaOn, pausaOculta: D.pausaOculta });
}

const PESTANAS = [['graficos', 'Gráficos'], ['audio', 'Audio'], ['controles', 'Controles'], ['acc', 'Accesibilidad'], ['datos', 'Datos']];
export function panelAjustes(cont, opts = {}) {
  let pest = opts.pest || 'graficos';
  const cuerpo = h('div', { cls: 'aj-cuerpo' }), tabs = h('div', { cls: 'aj-tabs', role: 'tablist' }), bt = {};
  PESTANAS.forEach(([id, nom]) => { bt[id] = h('button', { type: 'button', cls: 'aj-tab', role: 'tab', 'data-f': 1, txt: nom, on: { click: () => ir(id) } }); tabs.appendChild(bt[id]); });
  function ir(id) {
    pest = id;
    for (const k in bt) { bt[k].setAttribute('aria-selected', String(k === id)); bt[k].classList.toggle('on', k === id); }
    cuerpo.textContent = ''; CONSTRUCTORES[id](cuerpo, opts);
  }
  cont.appendChild(tabs); cont.appendChild(cuerpo); ir(pest);
  return { ir, siguiente: (d) => { const ids = PESTANAS.map((p) => p[0]); ir(ids[(ids.indexOf(pest) + d + ids.length) % ids.length]); } };
}

const fila = (etq, ctl, ayuda) => h('div', { cls: 'aj-fila' }, [h('label', { cls: 'aj-etq' }, [etq, ayuda ? h('small', { txt: ayuda }) : null]), ctl]);
const interruptor = (k, extra) => {
  const b = h('button', { type: 'button', cls: 'aj-sw', role: 'switch', 'data-f': 1, 'aria-checked': String(!!D[k]), on: { click: () => { D[k] = !D[k]; b.setAttribute('aria-checked', String(D[k])); guardar(); if (extra) extra(D[k]); } } }, [h('i')]);
  return b;
};
const deslizador = (k, min, max, paso, fmt, extra) => {
  const f = fmt || String, out = h('output', { txt: f(D[k]) });
  const i = h('input', { type: 'range', min, max, step: paso, value: D[k], 'data-f': 1, on: { input: () => { D[k] = +i.value; out.textContent = f(D[k]); guardar(); if (extra) extra(D[k]); } } });
  return h('div', { cls: 'aj-rango' }, [i, out]);
};
const opciones = (k, lista, extra) => {
  const g = h('div', { cls: 'aj-opc', role: 'group' });
  lista.forEach(([val, nom]) => g.appendChild(h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: nom, 'aria-pressed': String(D[k] === val), on: { click: () => { D[k] = val; Array.from(g.children).forEach((x, i) => x.setAttribute('aria-pressed', String(lista[i][0] === val))); guardar(); if (extra) extra(val); } } })));
  return g;
};
const pct = (x) => Math.round(x * 100) + '%';

const CONSTRUCTORES = {
  graficos(c, o) {
    const rehacer = () => { c.textContent = ''; CONSTRUCTORES.graficos(c, o); };
    c.appendChild(fila('Calidad', opciones('calidad', [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra']], (q) => { Object.assign(D, PRESETS[q]); guardar(); rehacer(); })));
    const marca = (extra) => (v) => { D.calidad = 'personal'; guardar(); if (extra) extra(v); };
    c.appendChild(fila('Sombras', opciones('sombras', [[0, 'Sin'], [1, 'Normales'], [2, 'Suaves']], marca())));
    c.appendChild(fila('Resolución', deslizador('pr', 0.75, 2, 0.25, (x) => x + '×', marca()), 'Escala de píxeles (el máximo es la del dispositivo).'));
    c.appendChild(fila('Detalle de modelos', opciones('detalle', [[0, 'Bajo'], [1, 'Medio'], [2, 'Alto']], marca())));
    c.appendChild(fila('Suavizado de bordes', interruptor('aa', marca())));
    c.appendChild(fila('Límite de FPS', opciones('fpsMax', [[0, 'Sin límite'], [30, '30'], [60, '60']])));
    c.appendChild(fila('Guía de puntería', interruptor('guia'), 'Muestra puntos con la trayectoria prevista.'));
    c.appendChild(fila('Bajar calidad si va lento', interruptor('autoBajada'), 'Reduce la calidad automáticamente si los cuadros por segundo caen.'));
    c.appendChild(fila('Mostrar FPS', interruptor('fps')));
    c.appendChild(h('p', { cls: 'aj-nota', txt: 'Cambios de sombras, resolución y suavizado reinician el motor de dibujo (un instante).' }));
  },
  audio(c) {
    D.silencio = D.maestro === 0;
    c.appendChild(fila('Volumen general', deslizador('maestro', 0, 1, 0.05, pct)));
    c.appendChild(fila('Efectos', deslizador('efectos', 0, 1, 0.05, pct, () => { Sonido.despertar(); Sonido.fx('click'); })));
    c.appendChild(fila('Música ambiental', interruptor('musicaOn', (on) => { Sonido.despertar(); Sonido.musica(on); })));
    c.appendChild(fila('Volumen de música', deslizador('musica', 0, 1, 0.05, pct)));
    c.appendChild(fila('Silenciar todo', interruptor('silencio', (on) => { const m = on ? 0 : 0.8; D.maestro = m; guardar(); })));
    c.appendChild(fila('Pausar sonido al ocultar la pestaña', interruptor('pausaOculta')));
  },
  controles(c) {
    c.appendChild(fila('Sensibilidad del lanzamiento', deslizador('sens', 0.5, 2, 0.1, (x) => x.toFixed(1) + '×'), 'Fuerza y movimiento de la bola con el dedo, ratón o teclado.'));
    c.appendChild(fila('Invertir efecto', interruptor('invertirEfecto'), 'Cambia el sentido del giro (curva).'));
    c.appendChild(fila('Zona muerta del mando', deslizador('zonaMando', 0, 0.5, 0.05, pct)));
    c.appendChild(fila('Vibración', interruptor('vibracion')));
    c.appendChild(fila('Intensidad de vibración', deslizador('vibInt', 0.2, 1, 0.1, pct)));
    c.appendChild(fila('Modo zurdo', interruptor('zurdo'), 'Mueve los botones táctiles al otro lado.'));
    c.appendChild(fila('Botones en pantalla', opciones('botones', [['auto', 'Automático'], ['si', 'Siempre'], ['no', 'Nunca']], () => alCambiar.forEach((f) => f())), 'Posición, dirección, efecto y lanzar con botones.'));
    c.appendChild(fila('Tamaño de botones táctiles', deslizador('tamBoton', 70, 140, 10, (x) => x + '%')));
    c.appendChild(fila('Opacidad de botones', deslizador('opBoton', 30, 100, 10, (x) => x + '%')));
    c.appendChild(fila('Posición de botones', opciones('posBoton', [['abajo', 'Abajo'], ['medio', 'Centro']])));
    c.appendChild(h('div', { cls: 'aj-sub', txt: 'Teclas' }));
    for (const k of Object.keys(TECLAS_BASE)) {
      const b = h('button', { type: 'button', cls: 'aj-tecla', 'data-f': 1, txt: nombreTecla(D.teclas[k]) });
      b.addEventListener('click', () => {
        b.textContent = 'Pulsa una tecla…';
        const fn = (e) => { e.preventDefault(); e.stopPropagation(); removeEventListener('keydown', fn, true); if (e.code !== 'Escape' || k === 'pausa') { D.teclas[k] = e.code; guardar(); } b.textContent = nombreTecla(D.teclas[k]); };
        addEventListener('keydown', fn, true);
      });
      c.appendChild(fila(NOMBRES_TECLAS[k], b));
    }
    c.appendChild(h('button', { type: 'button', cls: 'btn sec peq', 'data-f': 1, txt: 'Restablecer teclas', on: { click: () => { D.teclas = { ...TECLAS_BASE }; guardar(); c.textContent = ''; CONSTRUCTORES.controles(c); } } }));
  },
  acc(c) {
    c.appendChild(fila('Texto grande', interruptor('textoGrande')));
    c.appendChild(fila('Modo daltónico', interruptor('daltonico', () => alCambiar.forEach((f) => f())), 'Franjas y colores de los pinos con más contraste.'));
    c.appendChild(fila('Alto contraste', interruptor('contraste')));
    c.appendChild(fila('Reducir movimiento y efectos', interruptor('reducirMov'), 'Sin sacudidas de cámara, destellos ni chispas.'));
  },
  datos(c, o) {
    c.appendChild(bloqueNube());
    const ta = h('textarea', { cls: 'aj-texto', rows: 4, 'data-f': 1, placeholder: 'Aquí aparece o pegas el texto del guardado', spellcheck: 'false' });
    const msg = h('div', { cls: 'aj-msg', 'aria-live': 'polite' });
    c.appendChild(h('div', { cls: 'aj-sub', txt: 'Guardado' }));
    c.appendChild(ta);
    c.appendChild(h('div', { cls: 'aj-botones' }, [
      h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Exportar', on: { click: () => { ta.value = exportar(); ta.select(); try { navigator.clipboard && navigator.clipboard.writeText(ta.value); msg.textContent = 'Guardado exportado y copiado.'; } catch (e) { msg.textContent = 'Guardado exportado: copia el texto.'; } } } }),
      h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Importar', on: { click: () => { if (importar(ta.value)) { msg.textContent = 'Guardado importado. Recargando…'; if (o.alImportar) o.alImportar(); setTimeout(() => location.reload(), 600); } else msg.textContent = 'El texto no es un guardado válido.'; } } })
    ]));
    c.appendChild(msg);
    c.appendChild(h('button', { type: 'button', cls: 'btn peligro', 'data-f': 1, txt: 'Borrar todos los datos', on: { click: () => { if (confirm('¿Borrar monedas, desbloqueos, logros y ajustes de este dispositivo?')) { borrarTodo(); location.reload(); } } } }));
  }
};
export function nombreTecla(code) {
  if (!code) return '—';
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace('Arrow', '').replace('Space', 'Espacio').replace('Escape', 'Esc').replace('Left', '← ').replace('Right', '→ ').replace('Up', '↑').replace('Down', '↓').replace('← ', '←').replace('→ ', '→');
}
