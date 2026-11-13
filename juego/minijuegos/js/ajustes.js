// Ajustes (todos por dispositivo en minijuegos_ajustes_dispositivo) y panel con pestanas navegables por raton, tactil y mando.
import { CLAVES, leer, escribir, mezclar, exportar, importar, borrarTodo } from './almacen.js';
import { h } from './dom.js';
import { Sonido } from './sonido.js';
import { bloqueNube } from './cuenta-mj.js';

export const TECLAS_BASE = [
  { izq: 'KeyA', der: 'KeyD', arr: 'KeyW', aba: 'KeyS', a: 'KeyQ', b: 'KeyE' },
  { izq: 'ArrowLeft', der: 'ArrowRight', arr: 'ArrowUp', aba: 'ArrowDown', a: 'Period', b: 'Slash' },
  { izq: 'KeyJ', der: 'KeyL', arr: 'KeyI', aba: 'KeyK', a: 'KeyU', b: 'KeyO' },
  { izq: 'Numpad4', der: 'Numpad6', arr: 'Numpad8', aba: 'Numpad5', a: 'Numpad7', b: 'Numpad9' }
];
const BASE = {
  calidad: 'alta', fps: false, autoBajada: true, particulas: true, brillo: true, resolucion: 1, limiteFps: 60,
  sonido: { maestro: 0.8, musica: 0.25, efectos: 0.9, musicaOn: false, pausaOculta: true },
  vibracion: true, vibInt: 1, zonaMuerta: 0.2, sens: 1, zurdo: false, tamControles: 100, opControles: 70, orient: 'auto', verControles: true,
  teclas: TECLAS_BASE,
  acc: { textoGrande: false, daltonico: false, reducirMov: false, altoContraste: false },
  tutorialVisto: false
};
export const PRESETS = {
  baja: { particulas: false, brillo: false, resolucion: 0.75, limiteFps: 30 },
  media: { particulas: true, brillo: false, resolucion: 1, limiteFps: 60 },
  alta: { particulas: true, brillo: true, resolucion: 1, limiteFps: 60 },
  ultra: { particulas: true, brillo: true, resolucion: 1.5, limiteFps: 0 }
};
export const D = mezclar(BASE, leer(CLAVES.dispositivo, {}));
if (!leer(CLAVES.dispositivo)) {
  try { if (matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600) { D.calidad = 'media'; Object.assign(D, PRESETS.media); } } catch (e) { /* sin matchMedia */ }
}
let alCambiar = [], dif = 0;
export const suscribir = (fn) => alCambiar.push(fn);
export const guardar = () => { clearTimeout(dif); dif = setTimeout(guardarYa, 250); aplicar(); alCambiar.forEach((f) => f()); };
export const guardarYa = () => { clearTimeout(dif); escribir(CLAVES.dispositivo, D); };
export function aplicar() {
  const c = document.body.classList;
  c.toggle('texto-grande', D.acc.textoGrande); c.toggle('sinmov', D.acc.reducirMov); c.toggle('contraste', D.acc.altoContraste);
  Sonido.ajustar(D.sonido);
}
export const nombreTecla = (k) => ({ ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Period: '.', Slash: '/', Comma: ',', Space: 'Espacio', Enter: 'Enter', Escape: 'Esc' })[k] || String(k).replace(/^Key|^Digit/, '').replace('Numpad', 'Num ');

const PESTANAS = [['graficos', 'Gráficos'], ['audio', 'Audio'], ['controles', 'Controles'], ['acc', 'Accesibilidad'], ['datos', 'Datos']];
export function panelAjustes(cont, opts = {}) {
  let pest = opts.pest || 'graficos';
  const cuerpo = h('div', { cls: 'aj-cuerpo' }), tabs = h('div', { cls: 'aj-tabs', role: 'tablist' }), bt = {};
  PESTANAS.forEach(([id, nom]) => { bt[id] = h('button', { type: 'button', cls: 'aj-tab', role: 'tab', 'data-f': 1, txt: nom, on: { click: () => ir(id) } }); tabs.appendChild(bt[id]); });
  function ir(id) {
    pest = id;
    for (const k in bt) { bt[k].setAttribute('aria-selected', String(k === id)); bt[k].classList.toggle('on', k === id); }
    cuerpo.textContent = ''; CONS[id](cuerpo, () => ir(id));
  }
  cont.appendChild(tabs); cont.appendChild(cuerpo); ir(pest);
  return { ir, siguiente: (d) => { const ids = PESTANAS.map((p) => p[0]); ir(ids[(ids.indexOf(pest) + d + ids.length) % ids.length]); } };
}
const fila = (etq, ctl, ayuda) => h('div', { cls: 'aj-fila' }, [h('label', { cls: 'aj-etq' }, [etq, ayuda ? h('small', { txt: ayuda }) : null]), ctl]);
const sw = (obj, k, extra) => { const b = h('button', { type: 'button', cls: 'aj-sw', role: 'switch', 'data-f': 1, 'aria-checked': String(!!obj[k]), on: { click: () => { obj[k] = !obj[k]; b.setAttribute('aria-checked', String(obj[k])); guardar(); extra && extra(obj[k]); } } }, [h('i')]); return b; };
const rango = (obj, k, min, max, paso, fmt, extra) => {
  const out = h('output', { txt: fmt ? fmt(obj[k]) : String(obj[k]) });
  const i = h('input', { type: 'range', min, max, step: paso, value: obj[k], 'data-f': 1, on: { input: () => { obj[k] = +i.value; out.textContent = fmt ? fmt(obj[k]) : String(obj[k]); guardar(); extra && extra(obj[k]); } } });
  return h('div', { cls: 'aj-rango' }, [i, out]);
};
const opc = (obj, k, lista, extra) => {
  const g = h('div', { cls: 'aj-opc', role: 'group' });
  lista.forEach(([val, nom]) => g.appendChild(h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: nom, 'aria-pressed': String(obj[k] === val), on: { click: () => { obj[k] = val; Array.from(g.children).forEach((x, i) => x.setAttribute('aria-pressed', String(lista[i][0] === val))); guardar(); extra && extra(val); } } })));
  return g;
};
const pct = (x) => Math.round(x * 100) + '%';
const CONS = {
  graficos(c, redib) {
    c.appendChild(fila('Calidad', opc(D, 'calidad', [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra']], (q) => { Object.assign(D, PRESETS[q]); guardar(); redib(); })));
    c.appendChild(fila('Partículas y chispas', sw(D, 'particulas')));
    c.appendChild(fila('Brillos y sombras', sw(D, 'brillo')));
    c.appendChild(fila('Resolución de dibujo', rango(D, 'resolucion', 0.5, 2, 0.25, (x) => 'x' + x)));
    c.appendChild(fila('Límite de FPS', opc(D, 'limiteFps', [[30, '30'], [60, '60'], [0, 'Sin límite']])));
    c.appendChild(fila('Bajar calidad si va lento', sw(D, 'autoBajada'), 'Reduce la calidad sola si los FPS caen.'));
    c.appendChild(fila('Mostrar FPS', sw(D, 'fps')));
  },
  audio(c) {
    const s = D.sonido;
    c.appendChild(fila('Volumen general', rango(s, 'maestro', 0, 1, 0.05, pct)));
    c.appendChild(fila('Efectos', rango(s, 'efectos', 0, 1, 0.05, pct, () => Sonido.fx('click'))));
    c.appendChild(fila('Música ambiental', sw(s, 'musicaOn', (on) => { Sonido.despertar(); Sonido.musica(on); })));
    c.appendChild(fila('Volumen de música', rango(s, 'musica', 0, 1, 0.05, pct)));
    c.appendChild(fila('Silenciar todo', h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, txt: 'Silencio', on: { click: () => { s.maestro = 0; guardar(); c.textContent = ''; CONS.audio(c); } } })));
    c.appendChild(fila('Pausar sonido al ocultar la pestaña', sw(s, 'pausaOculta')));
  },
  controles(c, redib) {
    c.appendChild(fila('Modo zurdo', sw(D, 'zurdo'), 'Intercambia palanca y botones táctiles.'));
    c.appendChild(fila('Mostrar controles táctiles', sw(D, 'verControles')));
    c.appendChild(fila('Tamaño de controles táctiles', rango(D, 'tamControles', 60, 160, 10, (x) => x + '%')));
    c.appendChild(fila('Opacidad de controles', rango(D, 'opControles', 20, 100, 5, (x) => x + '%')));
    c.appendChild(fila('Sensibilidad de la palanca', rango(D, 'sens', 0.5, 2, 0.1, (x) => 'x' + x.toFixed(1))));
    c.appendChild(fila('Orientación de las zonas', opc(D, 'orient', [['auto', 'Automática'], ['enfrentados', 'Enfrentados'], ['lado', 'Lado a lado']]), 'Enfrentados: unos arriba y otros abajo (tablet sobre la mesa).'));
    c.appendChild(fila('Zona muerta del mando', rango(D, 'zonaMuerta', 0.05, 0.5, 0.05, pct)));
    c.appendChild(fila('Vibración del mando', sw(D, 'vibracion')));
    c.appendChild(fila('Intensidad de vibración', rango(D, 'vibInt', 0.2, 1, 0.1, pct)));
    c.appendChild(h('div', { cls: 'aj-sub', txt: 'Teclas por jugador (toca una y pulsa la nueva)' }));
    const NOM = { izq: 'Izq', der: 'Der', arr: 'Arr', aba: 'Abj', a: 'A', b: 'B' };
    D.teclas.forEach((t, j) => {
      const g = h('div', { cls: 'aj-teclas' }, [h('b', { txt: 'Jugador ' + (j + 1) })]);
      for (const k of Object.keys(NOM)) {
        const b = h('button', { type: 'button', cls: 'aj-tecla', 'data-f': 1, txt: NOM[k] + ': ' + nombreTecla(t[k]) });
        b.addEventListener('click', () => {
          b.textContent = 'Pulsa…';
          const f = (e) => { e.preventDefault(); e.stopPropagation(); if (e.code !== 'Escape') { t[k] = e.code; guardar(); } b.textContent = NOM[k] + ': ' + nombreTecla(t[k]); removeEventListener('keydown', f, true); };
          addEventListener('keydown', f, true);
        });
        g.appendChild(b);
      }
      c.appendChild(g);
    });
    c.appendChild(h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Restablecer teclas', on: { click: () => { D.teclas = JSON.parse(JSON.stringify(TECLAS_BASE)); guardar(); redib(); } } }));
    c.appendChild(h('p', { cls: 'aj-nota', txt: 'Mando Xbox (hasta 4, uno por jugador humano en orden): palanca o cruceta mueven · A/X acción · B/Y segunda acción · MENÚ pausa.' }));
  },
  acc(c) {
    c.appendChild(fila('Texto grande', sw(D.acc, 'textoGrande')));
    c.appendChild(fila('Modo daltónico', sw(D.acc, 'daltonico'), 'Paleta segura y una forma distinta por jugador.'));
    c.appendChild(fila('Reducir movimiento y efectos', sw(D.acc, 'reducirMov'), 'Sin sacudidas ni confeti.'));
    c.appendChild(fila('Alto contraste', sw(D.acc, 'altoContraste')));
  },
  datos(c) {
    const area = h('textarea', { cls: 'aj-texto', rows: 4, 'data-f': 1, placeholder: 'Aquí aparece o se pega el texto de tu guardado', spellcheck: 'false' });
    const msg = h('div', { cls: 'aj-msg', 'aria-live': 'polite' });
    c.appendChild(h('p', { cls: 'aj-nota', txt: 'El texto incluye tu progreso (monedas, skins, logros, estadísticas, jugadores) y los ajustes de este dispositivo.' }));
    c.appendChild(area);
    c.appendChild(h('div', { cls: 'aj-botones' }, [
      h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Exportar', on: { click: () => { guardarYa(); area.value = exportar(); area.select(); try { navigator.clipboard.writeText(area.value); msg.textContent = 'Texto copiado.'; } catch (e) { msg.textContent = 'Copia el texto manualmente.'; } } } }),
      h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Importar', on: { click: () => { if (importar(area.value)) { msg.textContent = 'Importado. Recargando…'; setTimeout(() => location.reload(), 600); } else msg.textContent = 'Texto no válido.'; } } }),
      h('button', { type: 'button', cls: 'btn peligro', 'data-f': 1, txt: 'Borrar todo', on: { click: () => { if (confirm('¿Borrar progreso, ajustes y partida guardada de este dispositivo?')) { borrarTodo(); location.reload(); } } } })
    ]));
    c.appendChild(msg); c.appendChild(bloqueNube());
  }
};
