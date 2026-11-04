// Menú de ajustes con pestañas (táctil, ratón y mando: todo son botones con la clase "foco").
import * as Almacen from './almacen.js';
import * as Audio from './audio.js';
import { ORDEN_CALIDAD } from '../vista/escena.js';

const NOM_CAL = { baja: 'Baja', media: 'Media', alta: 'Alta', ultra: 'Ultra' };
const ACCIONES_TECLA = [
  ['construir', 'Construir'], ['demoler', 'Demoler'], ['ciudad', 'Ciudad'], ['objetivos', 'Objetivos'], ['mejoras', 'Mejoras'], ['capas', 'Capas'],
  ['girarIzq', 'Girar izq.'], ['girarDer', 'Girar der.'], ['arriba', 'Mover arriba'], ['abajo', 'Mover abajo'], ['izq', 'Mover izq.'], ['der', 'Mover der.'], ['foto', 'Modo foto'], ['pausa', 'Pausa/velocidad'],
];
const nombreTecla = (k) => (k === ' ' ? 'Espacio' : k.length === 1 ? k.toUpperCase() : k);
const OPC_TRI = [[null, 'Auto'], [true, 'Sí'], [false, 'No']];
const OPC_FPS = [[0, 'Auto'], [30, '30'], [60, '60'], [-1, 'Sin límite']];
const OPC_DALT = [['ninguno', 'Ninguno'], ['protanopia', 'Protanopia'], ['deuteranopia', 'Deuteranopia'], ['tritanopia', 'Tritanopia']];

export function crearAjustes(J, modal) {
  const A = () => J.ajustes;
  const guardar = (k) => { Almacen.guardarAjustes(A()); J.aplicarAjustes(k); };
  const fmtPct = (v) => Math.round(v * 100) + '%';

  const paso = (k, rotulo, min, max, st, fmt = fmtPct, pie = '') => `<div class="ajuste"><span>${rotulo}${pie ? `<small>${pie}</small>` : ''}</span><div class="stepper"><button type="button" class="btn mini foco" data-acc="paso" data-k="${k}" data-d="-1" data-min="${min}" data-max="${max}" data-st="${st}" aria-label="Menos">−</button><b>${fmt(A()[k])}</b><button type="button" class="btn mini foco" data-acc="paso" data-k="${k}" data-d="1" data-min="${min}" data-max="${max}" data-st="${st}" aria-label="Más">+</button></div></div>`;
  const sw = (k, rotulo, pie = '') => `<div class="ajuste"><span>${rotulo}${pie ? `<small>${pie}</small>` : ''}</span><button type="button" class="btn mini foco ${A()[k] ? 'act' : ''}" data-acc="sw" data-k="${k}">${A()[k] ? 'Sí' : 'No'}</button></div>`;
  const ciclo = (k, rotulo, opc, pie = '') => { const v = A()[k], o = opc.find((q) => q[0] === v) || opc[0]; return `<div class="ajuste"><span>${rotulo}${pie ? `<small>${pie}</small>` : ''}</span><button type="button" class="btn mini foco" data-acc="ciclo" data-k="${k}" data-o="${opc === OPC_TRI ? 'tri' : opc === OPC_FPS ? 'fps' : 'dalt'}">${o[1]}</button></div>`; };

  const tabs = {
    graficos: () => `<h4>Calidad</h4><div class="seg">${ORDEN_CALIDAD.map((q) => `<button type="button" class="btn foco ${A().calidad === q ? 'act' : ''}" data-acc="cal" data-q="${q}">${NOM_CAL[q]}</button>`).join('')}</div>
      <p>Baja: celulares viejos. Media: celulares y portátiles. Alta: sombras reales. Ultra: PC potente.</p>
      <h4>Ajustes sueltos</h4>${ciclo('sombras', 'Sombras', OPC_TRI)}${ciclo('antialias', 'Antialias', OPC_TRI, 'Se aplica al recargar')}
      ${paso('resolucion', 'Resolución', 0.5, 2.5, 0.25, (v) => (v ? v.toFixed(2) + 'x' : 'Auto'), 'Escala de píxeles')}${paso('detalle', 'Detalle y distancia', 0.25, 1, 0.25, (v) => (v == null ? 'Auto' : fmtPct(v)), 'Árboles, tráfico, variedad de edificios')}
      ${ciclo('limiteFps', 'Límite de FPS', OPC_FPS)}${sw('verFps', 'Mostrar FPS')}${sw('autoCalidad', 'Bajar calidad si va lento', 'Reduce el preset si los FPS son bajos')}
      <div class="acciones"><button type="button" class="btn foco" data-acc="recargar">Recargar para aplicar</button></div>`,
    audio: () => `<h4>Volumen</h4>${paso('volMaestro', 'Maestro', 0, 1, 0.1)}${paso('volMusica', 'Música', 0, 1, 0.1)}${paso('volSfx', 'Efectos', 0, 1, 0.1)}${paso('volAmbiente', 'Ambiente por zona', 0, 1, 0.1, fmtPct, 'Tráfico, industria, parques, lluvia')}
      <h4>Interruptores</h4>${sw('musica', 'Música')}${sw('sfx', 'Efectos y ambiente')}${sw('silencio', 'Silenciar todo')}
      <p>El audio se pausa solo cuando cambias de pestaña.</p>`,
    controles: () => `<h4>Cámara</h4>${paso('sensibilidad', 'Sensibilidad', 0.4, 2.5, 0.1, (v) => v.toFixed(1) + 'x')}${sw('invertirY', 'Invertir arrastre vertical')}
      <h4>Mando</h4>${paso('zonaMuerta', 'Zona muerta', 0.05, 0.4, 0.05)}${sw('vibracion', 'Vibración')}${paso('vibracionInt', 'Intensidad de vibración', 0.2, 1.5, 0.1)}
      <h4>Pantalla táctil</h4>${paso('tamTactil', 'Tamaño de botones', 0.8, 1.4, 0.1, (v) => fmtPct(v))}${paso('opacTactil', 'Opacidad de controles', 0.4, 1, 0.1)}${sw('zurdo', 'Modo zurdo', 'Invierte los botones laterales')}
      <h4>Teclado (toca y pulsa una tecla)</h4><div class="teclas">${ACCIONES_TECLA.map(([id, n]) => `<button type="button" class="btn mini foco" data-acc="tecla" data-id="${id}"><span>${n}</span><b>${nombreTecla(Almacen.tecla(A(), id))}</b></button>`).join('')}</div>
      <div class="acciones"><button type="button" class="btn foco" data-acc="teclasDef">Teclas por defecto</button></div>
      <p><b>Táctil:</b> arrastra mueve, pellizca zoom, toca elige. <b>Mando:</b> stick izq. mueve, RT/LT zoom, A construye, B atrás, X demoler, Y menú, LB/RB categorías, cruceta velocidad.</p>`,
    accesibilidad: () => `<h4>Lectura</h4>${sw('textoGrande', 'Texto grande')}
      <h4>Color</h4>${ciclo('daltonismo', 'Modo daltónico', OPC_DALT, 'Cambia verde/rojo por azul/naranja en mapas y avisos')}
      <h4>Movimiento</h4>${sw('reducirMov', 'Reducir movimiento y efectos', 'Sin lluvia ni sacudidas, menos partículas y tráfico')}
      <h4>Ayuda</h4><div class="acciones"><button type="button" class="btn foco" data-acc="ayuda">Abrir ayuda y controles</button></div>`,
    datos: () => `<h4>Guardado</h4><p>Tienes 3 ranuras. Se guarda solo cada pocos segundos y al salir.</p>
      <div class="acciones"><button type="button" class="btn foco" data-acc="exportar">Exportar / importar texto</button></div>
      <h4>Borrar</h4><div class="acciones"><button type="button" class="btn foco" data-acc="resetAj">Restablecer ajustes</button><button type="button" class="btn peligro foco" data-acc="borrarTodo">Borrar todos los datos</button></div>
      <p>Borrar datos elimina ciudades, ajustes y logros de este juego en este dispositivo.</p>`,
  };
  const OPCS = { tri: OPC_TRI, fps: OPC_FPS, dalt: OPC_DALT };

  return function ajustes(tab = 'graficos') {
    let ret = null;
    const html = (t) => tabs[t]();
    const rehacer = (a) => a.rehacer(html(a.o.tab));
    const api = modal({
      titulo: 'Ajustes', pausa: true, ancho: true, inicial: '.btn',
      tabs: [{ id: 'graficos', nombre: 'Gráficos' }, { id: 'audio', nombre: 'Audio' }, { id: 'controles', nombre: 'Controles' }, { id: 'accesibilidad', nombre: 'Accesible' }, { id: 'datos', nombre: 'Datos' }],
      tab, html: html(tab),
      alTab: (id, a) => a.rehacer(html(id)),
      alCerrar: () => { if (ret) removeEventListener('keydown', ret, true); },
      acc: {
        cal: (b, a) => { A().calidad = b.dataset.q; A().sombras = A().resolucion = A().detalle = null; guardar('calidad'); rehacer(a); },
        paso: (b, a) => {
          const k = b.dataset.k, mn = +b.dataset.min, mx = +b.dataset.max, st = +b.dataset.st;
          let v = A()[k]; if (v == null) v = k === 'resolucion' ? 1 : 1;
          v = Math.round((v + st * +b.dataset.d) / st) * st; v = Math.max(mn, Math.min(mx, +v.toFixed(2)));
          A()[k] = v; guardar(k); rehacer(a);
        },
        sw: (b, a) => { A()[b.dataset.k] = !A()[b.dataset.k]; guardar(b.dataset.k); rehacer(a); },
        ciclo: (b, a) => { const o = OPCS[b.dataset.o], k = b.dataset.k; let i = o.findIndex((q) => q[0] === A()[k]); i = (i + 1) % o.length; A()[k] = o[i][0]; guardar(k); rehacer(a); },
        recargar: () => { J.guardar(); location.reload(); },
        tecla: (b, a) => {
          const id = b.dataset.id; b.querySelector('b').textContent = 'Pulsa…';
          if (ret) removeEventListener('keydown', ret, true);
          ret = (e) => {
            e.preventDefault(); e.stopPropagation(); removeEventListener('keydown', ret, true); ret = null;
            if (e.key !== 'Escape') {
              const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
              for (const [o] of ACCIONES_TECLA) if (o !== id && Almacen.tecla(A(), o) === k) A().teclas[o] = Almacen.TECLAS_DEF[id] === k ? Almacen.tecla(A(), id) : Almacen.TECLAS_DEF[o];
              A().teclas[id] = k; guardar('teclas');
            }
            rehacer(a);
          };
          addEventListener('keydown', ret, true);
        },
        teclasDef: (b, a) => { A().teclas = {}; guardar('teclas'); rehacer(a); },
        ayuda: () => J.paneles.ayuda(),
        exportar: () => J.paneles.intercambio(!J.enTitulo),
        resetAj: (b, a) => { const u = A().ultima; Object.assign(J.ajustes, Almacen.AJUSTES_DEF, { teclas: {}, ultima: u, calidad: A().calidad }); guardar('todo'); rehacer(a); },
        borrarTodo: (b, a) => {
          if (b.dataset.seguro !== '1') { b.dataset.seguro = '1'; b.textContent = '¿Seguro? Pulsa otra vez'; setTimeout(() => { if (b.isConnected) { b.dataset.seguro = ''; b.textContent = 'Borrar todos los datos'; } }, 3000); return; }
          Almacen.borrarTodo(); location.reload();
        },
      },
    });
    return api;
  };
}
export { Audio };
