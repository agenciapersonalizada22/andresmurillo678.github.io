// Ajustes: los de dispositivo (graficos, controles) viven aparte de los generales para no sincronizarse a la nube.
import { ls } from './almacen.js';
import { TECLAS0 } from './herramientas.js';
import { temaUI } from './dibujo.js';

export const DISP0 = { calidad: 'alta', autoBajar: true, mostrarFps: false, prediccion: true, palma: true, rueda: 'zoom', zurdo: false, tamBarra: 'normal', sensMando: 1, zonaMuerta: 0.18, vibracion: true, teclas: { ...TECLAS0 }, volumen: 0.6 };
export const GEN0 = { tema: 'auto', formas: true, suavizado: 0.35, presionSim: true, imantar: false, textoGrande: false, altoContraste: false, daltonismo: 'no', reducirMovimiento: false, sonido: true, invitadosLectura: false, pausarOculta: true };

export function cargarAjustes() {
  const a = { ...GEN0, ...ls.leer('ajustes', {}), ...DISP0, ...ls.leer('ajustes_dispositivo', {}) };
  a.teclas = { ...TECLAS0, ...(a.teclas || {}) };
  return a;
}
export function guardarAjustes(a) {
  const disp = {}, gen = {};
  for (const k in a) (k in DISP0 ? disp : gen)[k] = a[k];
  ls.escribir('ajustes', gen); ls.escribir('ajustes_dispositivo', disp);
}
export function aplicarAjustes(a) {
  const r = document.documentElement;
  const osc = a.tema === 'oscuro' || (a.tema === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  r.dataset.tema = osc ? 'oscuro' : 'claro'; temaUI.oscuro = osc;
  r.classList.toggle('texto-grande', !!a.textoGrande);
  r.classList.toggle('alto-contraste', !!a.altoContraste);
  r.classList.toggle('sin-movimiento', !!a.reducirMovimiento || matchMedia('(prefers-reduced-motion: reduce)').matches);
  r.classList.toggle('zurdo', !!a.zurdo);
  r.dataset.barra = a.tamBarra;
  r.dataset.dalt = a.daltonismo;
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = osc ? '#12151c' : '#f4f6fa';
}
export const PALETA_DALT = ['tinta', '#e69f00', '#56b4e9', '#009e73', '#f0e442', '#0072b2', '#d55e00', '#cc79a7', '#6b7280', '#ffffff'];

const NOMBRE_HERR = { pluma: 'Lápiz', resaltador: 'Resaltador', borrador: 'Borrador', sel: 'Seleccionar', mano: 'Mover lienzo', texto: 'Texto', nota: 'Nota', forma: 'Forma', conector: 'Conector', laser: 'Láser', comentario: 'Comentario', votos: 'Votos' };

// Construye el contenido del dialogo de ajustes. u = {h, modal, aviso}
export function abrirAjustes(app, u, inicial = 'Gráficos') {
  const { h } = u, A = app.ajustes;
  const guardar = (k, v) => { A[k] = v; guardarAjustes(A); aplicarAjustes(A); app.vista.aplicarDpr(); app.ui.refrescar(); };
  const sel = (k, opciones, etq) => h('label', { cls: 'fila' }, [h('span', { txt: etq }), h('select', { 'data-f': 1, on: { change: e => guardar(k, e.target.value) } }, opciones.map(([v, t]) => h('option', { value: v, txt: t, ...(String(A[k]) === v ? { selected: '' } : {}) })))]);
  const chk = (k, etq, desc) => h('label', { cls: 'fila' }, [h('span', {}, [etq, desc ? h('small', { txt: desc }) : null]), h('input', { type: 'checkbox', 'data-f': 1, ...(A[k] ? { checked: '' } : {}), on: { change: e => guardar(k, e.target.checked) } })]);
  const rango = (k, etq, min, max, paso, fmt = v => v) => { const o = h('output', { txt: fmt(A[k]) }); return h('label', { cls: 'fila' }, [h('span', { txt: etq }), h('span', { cls: 'rango' }, [h('input', { type: 'range', min, max, step: paso, value: A[k], 'data-f': 1, 'aria-label': etq, on: { input: e => { o.textContent = fmt(+e.target.value); guardar(k, +e.target.value); } } }), o])]); };
  const paneles = {
    Gráficos: () => [
      sel('calidad', [['baja', 'Baja (móvil, ahorra batería)'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra (pantallas retina)']], 'Calidad de dibujo'),
      chk('autoBajar', 'Bajar calidad automáticamente', 'Si la pizarra va lenta, reduce la resolución.'),
      chk('mostrarFps', 'Mostrar FPS'),
      chk('prediccion', 'Predicción del lápiz', 'Reduce el retraso al trazar con lápiz o dedo.'),
      h('p', { cls: 'nota-aj', txt: 'Los trazos se dibujan por capas con caché y recorte de lo que no se ve, así que miles de objetos no frenan el lápiz.' })
    ],
    Audio: () => [chk('sonido', 'Sonidos', 'Aviso del temporizador y avisos de colaboración.'), rango('volumen', 'Volumen', 0, 1, 0.05, v => Math.round(v * 100) + '%'), chk('pausarOculta', 'Silenciar al ocultar la pestaña')],
    Controles: () => [
      rango('suavizado', 'Suavizado del trazo', 0, 0.9, 0.05, v => Math.round(v * 100) + '%'),
      chk('presionSim', 'Presión simulada por velocidad', 'Los trazos son más finos cuanto más rápido dibujas (ratón y dedo).'),
      chk('formas', 'Reconocer formas al mantener', 'Mantén el trazo quieto al terminar para convertirlo en recta, círculo, rectángulo, triángulo o flecha.'),
      chk('palma', 'Rechazo de palma', 'Si usas lápiz, los dedos solo mueven y hacen zoom.'),
      chk('imantar', 'Imantar a la cuadrícula (20 px)'),
      sel('rueda', [['zoom', 'Rueda hace zoom'], ['mover', 'Rueda desplaza']], 'Rueda del ratón'),
      chk('zurdo', 'Modo zurdo', 'Barra de herramientas a la derecha.'),
      sel('tamBarra', [['normal', 'Normal'], ['grande', 'Grande'], ['xl', 'Muy grande']], 'Tamaño de botones'),
      rango('sensMando', 'Sensibilidad del cursor con mando', 0.4, 2.5, 0.1, v => v.toFixed(1) + '×'),
      rango('zonaMuerta', 'Zona muerta del mando', 0.05, 0.4, 0.01, v => Math.round(v * 100) + '%'),
      chk('vibracion', 'Vibración del mando'),
      h('h4', { txt: 'Atajos de teclado' }),
      h('div', { cls: 'atajos' }, Object.keys(NOMBRE_HERR).map(k => h('label', { cls: 'atajo' }, [h('span', { txt: NOMBRE_HERR[k] }), h('input', { type: 'text', maxlength: 1, value: A.teclas[k] || '', 'data-f': 1, 'aria-label': 'Tecla para ' + NOMBRE_HERR[k], on: { change: e => { const t = { ...A.teclas, [k]: e.target.value.toLowerCase() }; guardar('teclas', t); } } })]))),
      h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Restablecer atajos', on: { click: () => { guardar('teclas', { ...TECLAS0 }); u.cerrar(); abrirAjustes(app, u); } } })
    ],
    Accesibilidad: () => [
      sel('tema', [['auto', 'Automático (del sistema)'], ['claro', 'Claro'], ['oscuro', 'Oscuro']], 'Tema'),
      chk('textoGrande', 'Texto grande'), chk('altoContraste', 'Alto contraste'),
      sel('daltonismo', [['no', 'Paleta normal'], ['si', 'Paleta apta para daltonismo']], 'Colores'),
      chk('reducirMovimiento', 'Reducir movimiento', 'Sin animaciones de interfaz.'),
      h('p', { cls: 'nota-aj', txt: 'Todo se puede usar con teclado (Tab, Enter, Esc), pantalla táctil y mando. Los colores tienen nombre para lectores de pantalla.' })
    ],
    Datos: () => {
      const ta = h('textarea', { cls: 'campo', rows: 5, 'aria-label': 'Ajustes en texto', 'data-f': 1 });
      ta.value = JSON.stringify(A);
      return [
        app.nube ? app.nube.bloque(h) : null,
        h('p', { txt: 'Tus tableros se guardan solos en este navegador (IndexedDB). Con una cuenta se sincronizan entre dispositivos (bloque de arriba); también puedes exportar un tablero desde el menú Exportar.' }),
        h('label', { cls: 'col' }, [h('span', { txt: 'Ajustes como texto (copiar o pegar para importar)' }), ta]),
        h('div', { cls: 'fila-bot' }, [
          h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Importar ajustes', on: { click: () => { try { const o = JSON.parse(ta.value); Object.assign(A, o); guardarAjustes(A); aplicarAjustes(A); app.vista.aplicarDpr(); u.aviso('Ajustes importados'); } catch (e) { u.aviso('Texto no válido'); } } } }),
          h('button', { type: 'button', cls: 'btn peligro', 'data-f': 1, txt: 'Restablecer ajustes', on: { click: () => { if (confirm('¿Restablecer todos los ajustes?')) { Object.assign(A, GEN0, DISP0, { teclas: { ...TECLAS0 } }); guardarAjustes(A); aplicarAjustes(A); app.vista.aplicarDpr(); u.cerrar(); u.aviso('Ajustes restablecidos'); } } } })
        ])
      ];
    }
  };
  const cont = h('div', { cls: 'ajustes' }), tabs = h('div', { cls: 'tabs', role: 'tablist' }), cuerpo = h('div', { cls: 'tabcuerpo', role: 'tabpanel' });
  const mostrar = n => {
    cuerpo.replaceChildren(...paneles[n]());
    [...tabs.children].forEach(b => b.setAttribute('aria-selected', String(b.dataset.n === n)));
  };
  for (const n of Object.keys(paneles)) tabs.appendChild(h('button', { type: 'button', role: 'tab', cls: 'tab', 'data-n': n, 'data-f': 1, txt: n, on: { click: () => mostrar(n) } }));
  cont.append(tabs, cuerpo); mostrar(paneles[inicial] ? inicial : 'Gráficos');
  u.modal('Ajustes', cont, { ancho: 560 });
}
