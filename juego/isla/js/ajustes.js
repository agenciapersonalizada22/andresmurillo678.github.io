// Menu Ajustes con pestanas (raton, tactil y mando). Los valores viven en el objeto aj (clave isla_ajustes_dispositivo).
import { h } from './dom.js';
import { PRESETS, TECLAS } from './almacen.js';
const ESQ = {
  Gráficos: [
    { k: 'calidad', t: 'sel', n: 'Calidad', op: [['auto', 'Automática'], ['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra'], ['personalizado', 'Personalizada']] },
    { k: 'sombras', t: 'sel', n: 'Sombras', op: [[0, 'No'], [1, 'Bajas'], [2, 'Medias'], [3, 'Altas']] },
    { k: 'dist', t: 'rng', n: 'Distancia de render', min: 150, max: 800, step: 25, f: (v) => v + ' m' },
    { k: 'pr', t: 'rng', n: 'Resolución', min: 0.5, max: 2, step: 0.05, f: (v) => Math.round(v * 100) + '%' },
    { k: 'vegetacion', t: 'rng', n: 'Detalle de vegetación', min: 0.3, max: 1, step: 0.05, f: (v) => Math.round(v * 100) + '%' },
    { k: 'aa', t: 'chk', n: 'Antialiasing (se aplica al recargar)' },
    { k: 'fps', t: 'sel', n: 'Límite de FPS', op: [[30, '30'], [60, '60'], [120, '120'], [0, 'Sin límite']] },
    { k: 'verFps', t: 'chk', n: 'Mostrar FPS' }, { k: 'autoBajar', t: 'chk', n: 'Bajar calidad automáticamente si hay pocos FPS' }],
  Audio: [
    { k: 'maestro', t: 'rng', n: 'Volumen general', min: 0, max: 1, step: 0.05, f: (v) => Math.round(v * 100) + '%' },
    { k: 'musica', t: 'rng', n: 'Música', min: 0, max: 1, step: 0.05, f: (v) => Math.round(v * 100) + '%' },
    { k: 'efectos', t: 'rng', n: 'Efectos', min: 0, max: 1, step: 0.05, f: (v) => Math.round(v * 100) + '%' },
    { k: 'silencio', t: 'chk', n: 'Silenciar todo' }],
  Controles: [
    { k: 'sens', t: 'rng', n: 'Sensibilidad de cámara', min: 0.3, max: 2.5, step: 0.05, f: (v) => v.toFixed(2) + 'x' },
    { k: 'invY', t: 'chk', n: 'Invertir eje Y' },
    { k: 'zona', t: 'rng', n: 'Zona muerta del mando', min: 0.05, max: 0.4, step: 0.01, f: (v) => Math.round(v * 100) + '%' },
    { k: 'vibrar', t: 'chk', n: 'Vibración del mando' }, { k: 'vibInt', t: 'rng', n: 'Intensidad de vibración', min: 0.1, max: 1, step: 0.05, f: (v) => Math.round(v * 100) + '%' },
    { k: 'tactilTam', t: 'rng', n: 'Tamaño de controles táctiles', min: 0.7, max: 1.5, step: 0.05, f: (v) => Math.round(v * 100) + '%' },
    { k: 'tactilOp', t: 'rng', n: 'Opacidad de controles táctiles', min: 0.3, max: 1, step: 0.05, f: (v) => Math.round(v * 100) + '%' },
    { k: 'tactilPos', t: 'rng', n: 'Altura de los botones táctiles', min: 0, max: 120, step: 5, f: (v) => v + ' px' },
    { k: 'zurdo', t: 'chk', n: 'Modo zurdo (intercambia lados)' }, { t: 'teclas' }],
  Accesibilidad: [
    { k: 'textoGrande', t: 'chk', n: 'Texto grande' },
    { k: 'daltonico', t: 'sel', n: 'Modo daltónico', op: [['no', 'Desactivado'], ['deuter', 'Deuteranopía / protanopía'], ['trita', 'Tritanopía']] },
    { k: 'reducirMov', t: 'chk', n: 'Reducir movimiento y efectos (sacudidas, partículas)' }]
};
const ACC = [['adelante', 'Avanzar'], ['atras', 'Retroceder'], ['izq', 'Izquierda'], ['der', 'Derecha'], ['saltar', 'Saltar / planeador'], ['correr', 'Correr'], ['recargar', 'Recargar'], ['interactuar', 'Recoger / abrir'], ['pared', 'Pared'], ['piso', 'Piso'], ['rampa', 'Rampa'], ['techo', 'Techo'], ['editar', 'Editar (mantener)'], ['material', 'Cambiar material'], ['emote', 'Emotes'], ['mapa', 'Mapa grande'], ['curar', 'Curarse / escudo']];
const nombreTecla = (c) => c.replace('Key', '').replace('Digit', '').replace('Arrow', 'Flecha ').replace('Left', ' izq.').replace('Right', ' der.').replace('Space', 'Espacio');

export function abrirAjustes(o) {
  const { aj, alCambiar, datos } = o; let tab = Object.keys(ESQ)[0], captura = null;
  const raiz = h('div', { cls: 'modal ajustes', role: 'dialog', 'aria-label': 'Ajustes' });
  const caja = h('div', { cls: 'caja' }); raiz.appendChild(caja);
  const tabs = h('div', { cls: 'tabs', role: 'tablist' }), cont = h('div', { cls: 'aj-cont' });
  const cerrar = () => { removeEventListener('keydown', teclaCaptura, true); raiz.remove(); o.cerrar && o.cerrar(); };
  caja.append(h('div', { cls: 'cab' }, [h('h2', { txt: 'Ajustes' }), h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, 'data-back': 1, txt: 'Cerrar', on: { click: cerrar } })]), tabs, cont);
  const cambiar = (k, v) => {
    aj[k] = v; let redibujar = false;
    if (k === 'calidad' && PRESETS[v]) { Object.assign(aj, PRESETS[v]); redibujar = true; }
    else if (k === 'calidad') redibujar = true;
    else if (['sombras', 'dist', 'pr', 'aa', 'vegetacion'].includes(k) && aj.calidad !== 'personalizado') { aj.calidad = 'personalizado'; redibujar = true; }
    alCambiar(k); if (redibujar) { const f = document.activeElement && document.activeElement.textContent; pintar(true); if (f && k !== 'calidad') { /* foco se recupera en la pestana */ } }
  };
  function fila(c) {
    const val = aj[c.k];
    if (c.t === 'chk') return h('label', { cls: 'fila' }, [h('span', { txt: c.n }), h('input', { type: 'checkbox', 'data-f': 1, checked: val ? 'checked' : null, on: { change: (e) => cambiar(c.k, e.target.checked) } })]);
    if (c.t === 'rng') { const lb = h('b', { txt: c.f(val) }); return h('label', { cls: 'fila' }, [h('span', { txt: c.n }), lb, h('input', { type: 'range', 'data-f': 1, min: c.min, max: c.max, step: c.step, value: val, on: { input: (e) => { lb.textContent = c.f(+e.target.value); cambiar(c.k, +e.target.value); } } })]); }
    if (c.t === 'sel') return h('div', { cls: 'fila col' }, [h('span', { txt: c.n }), h('div', { cls: 'seg', role: 'group' }, c.op.map(([v, n]) => h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, 'aria-pressed': String(String(val) === String(v)), txt: n, on: { click: () => cambiar(c.k, typeof c.op[0][0] === 'number' ? +v : v) } })))]);
    return null;
  }
  function teclasUI() {
    const caja2 = h('div', { cls: 'teclas' }, [h('h3', { txt: 'Teclas (clic y pulsa la nueva)' })]);
    ACC.forEach(([k, n]) => { const b = h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, txt: nombreTecla(aj.teclas[k] || TECLAS[k]), on: { click: () => { captura = { k, b }; b.textContent = 'Pulsa una tecla…'; } } }); caja2.appendChild(h('div', { cls: 'fila' }, [h('span', { txt: n }), b])); });
    caja2.appendChild(h('button', { type: 'button', cls: 'btn peq sec', 'data-f': 1, txt: 'Restaurar teclas', on: { click: () => { aj.teclas = { ...TECLAS }; alCambiar('teclas'); pintar(true); } } }));
    return caja2;
  }
  function teclaCaptura(e) {
    if (!captura) return; e.preventDefault(); e.stopPropagation();
    if (e.code !== 'Escape') { aj.teclas[captura.k] = e.code; alCambiar('teclas'); }
    captura.b.textContent = nombreTecla(aj.teclas[captura.k]); captura = null;
  }
  addEventListener('keydown', teclaCaptura, true);
  function datosUI() {
    const ta = h('textarea', { cls: 'campo', rows: '4', placeholder: 'Pega aquí un guardado para importarlo', 'data-f': 1 }), msg = h('p', { cls: 'nota' });
    return h('div', {}, [
      h('p', { cls: 'nota', txt: 'El guardado incluye monedas, skins, logros y estadísticas (no los ajustes de este dispositivo).' }),
      h('div', { cls: 'botones' }, [
        h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, txt: 'Exportar', on: { click: () => { ta.value = datos.exportar(); ta.select(); msg.textContent = 'Copia este texto para guardarlo.'; } } }),
        h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, txt: 'Importar', on: { click: () => { msg.textContent = datos.importar(ta.value) ? 'Guardado importado.' : 'Texto no válido.'; } } }),
        h('button', { type: 'button', cls: 'btn peq peligro', 'data-f': 1, txt: 'Borrar datos', on: { click: () => { if (confirm('¿Borrar monedas, skins, logros y estadísticas de este dispositivo?')) { datos.borrar(); msg.textContent = 'Datos borrados.'; } } } })]), ta, msg, o.cuenta ? o.cuenta() : null]);
  }
  function pintar(mantener) {
    const sc = cont.scrollTop; tabs.textContent = ''; cont.textContent = '';
    [...Object.keys(ESQ), 'Datos'].forEach((t) => tabs.appendChild(h('button', { type: 'button', role: 'tab', cls: 'tab', 'data-f': 1, 'aria-selected': String(t === tab), txt: t, on: { click: () => { tab = t; pintar(); } } })));
    if (tab === 'Datos') cont.appendChild(datosUI());
    else ESQ[tab].forEach((c) => cont.appendChild(c.t === 'teclas' ? teclasUI() : fila(c)));
    if (mantener) cont.scrollTop = sc;
    const foco = document.activeElement; if (!foco || !raiz.contains(foco)) { const b = tabs.querySelector('[aria-selected=true]'); if (b) b.focus(); }
  }
  pintar();
  document.body.appendChild(raiz);
  raiz.cerrar = cerrar;
  return raiz;
}
