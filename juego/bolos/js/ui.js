// Interfaz base: capas modales, avisos, HUD de partida, mensajes y tabla de puntos.
import { h, $ } from './dom.js';
import * as S from './puntuacion.js';
import { J, totalDe, puedeLanzar } from './juego.js';
import * as En from './entrada.js';
import * as Pr from './progreso.js';
import { D as AJ } from './ajustes.js';
import { Sonido } from './sonido.js';
import { LOGROS } from './catalogo.js';
import { N, enfocarPrimero } from './nav.js';

export const el = {};
export function iniciarUI() {
  for (const id of ['app', 'escena', 'barra', 'hud', 'hudDot', 'hudNombre', 'hudInfo', 'pinosMini', 'hudPuntos', 'mensaje', 'medidor', 'pista', 'cluster', 'menu', 'listaMenu', 'capas', 'toasts', 'fps', 'monedas', 'bTabla', 'bMenu', 'clPos', 'clLanzar', 'clRapido', 'cuentaLinea']) el[id] = document.getElementById(id);
}

/* ---------- capas ---------- */
const pila = [];
export function abrirCapa(titulo, construir, opts = {}) {
  const raiz = h('div', { cls: 'capa panel' + (opts.cls ? ' ' + opts.cls : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo });
  const cuerpo = h('div', { cls: 'capa-cuerpo' });
  const api = { raiz, cuerpo, cerrar: () => cerrar(raiz, opts.alCerrar) };
  raiz.appendChild(h('div', { cls: 'capa-cab' }, [h('h2', { txt: titulo }), h('button', { type: 'button', cls: 'icono', 'data-f': 1, 'data-cerrar': 1, 'aria-label': 'Cerrar', txt: '✕', on: { click: api.cerrar } })]));
  raiz.appendChild(cuerpo);
  el.capas.appendChild(raiz); pila.push(raiz);
  construir(cuerpo, api);
  setTimeout(() => enfocarPrimero(raiz), 40);
  return api;
}
export function cerrar(raiz, cb) {
  const i = pila.indexOf(raiz); if (i >= 0) pila.splice(i, 1);
  raiz.remove();
  if (cb) cb();
  const sig = pila[pila.length - 1]; if (sig) setTimeout(() => enfocarPrimero(sig), 30);
  window.dispatchEvent(new Event('bolos-capa'));
}
export function cerrarTodas() { while (pila.length) { const r = pila.pop(); r.remove(); } window.dispatchEvent(new Event('bolos-capa')); }
export const hayCapa = () => pila.length > 0;
export const capaSuperior = () => pila[pila.length - 1] || null;
N.alAtras = () => false;

export function confirmar(texto, aceptar, etiqueta = 'Aceptar') {
  const api = abrirCapa('Confirmar', (c) => {
    c.appendChild(h('p', { txt: texto }));
    c.appendChild(h('div', { cls: 'botones' }, [
      h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Cancelar', on: { click: () => api.cerrar() } }),
      h('button', { type: 'button', cls: 'btn peligro', 'data-f': 1, txt: etiqueta, on: { click: () => { api.cerrar(); aceptar(); } } })
    ]));
  }, { cls: 'chica' });
}

/* ---------- avisos ---------- */
export function aviso(texto, color) {
  const t = h('div', { cls: 'toast', txt: texto, style: color ? 'border-color:' + color : '' });
  el.toasts.appendChild(t);
  setTimeout(() => { t.classList.add('sale'); setTimeout(() => t.remove(), 400); }, 2600);
  while (el.toasts.children.length > 3) el.toasts.firstChild.remove();
}
export function avisoLogro(id) {
  const l = LOGROS.find((x) => x.id === id); if (!l) return;
  const t = h('div', { cls: 'toast logro' }, [h('b', { txt: '🏆 ' + l.nombre }), h('span', { txt: l.desc })]);
  el.toasts.appendChild(t); Sonido.fx('logro');
  setTimeout(() => { t.classList.add('sale'); setTimeout(() => t.remove(), 400); }, 3600);
}
export function actualizarMonedas() { el.monedas.querySelector('b').textContent = String(Pr.D.monedas); }

/* ---------- mensaje grande ---------- */
let tMsg = 0;
export function mensaje(texto, tipo) {
  const m = el.mensaje; clearTimeout(tMsg);
  m.textContent = texto; m.className = 'msg ' + (tipo || ''); void m.offsetWidth; m.classList.add('ver');
  tMsg = setTimeout(() => m.classList.remove('ver'), tipo === 'strike' ? 2000 : 1300);
}

/* ---------- HUD ---------- */
const TRIANGULO = [[0, 0], [-0.5, 1], [0.5, 1], [-1, 2], [0, 2], [1, 2], [-1.5, 3], [-0.5, 3], [0.5, 3], [1.5, 3]];
export function pintarHud() {
  const vivo = J.activo && J.fase !== 'fin';
  el.hud.hidden = !vivo; el.bMenu.hidden = !vivo; el.bTabla.hidden = !vivo || !!J.ronda;
  document.body.classList.toggle('en-menu', !vivo);
  document.body.classList.toggle('en-apuntar', vivo && puedeLanzar());
  document.body.classList.toggle('rodando', vivo && J.fase === 'rodando');
  if (!vivo) { el.cluster.hidden = true; return; }
  el.cluster.hidden = !puedeLanzar() || document.body.classList.contains('sin-cluster');
  const p = J.jug[J.turno]; if (!p) return;
  el.hudDot.style.background = p.color; el.hudNombre.textContent = p.nombre;
  let info = '';
  if (J.ronda) info = J.ronda.tipo === 'diario' ? `Ronda ${J.ronda.r + 1}/5 · bola ${J.ronda.usados + 1}/2` : `Bola ${J.ronda.usados + 1}/3`;
  else { const sg = S.siguiente(J.tiros[J.turno]); info = `Frame ${sg.frame}/10 · bola ${Math.min(sg.tiro, 3)}`; }
  el.hudInfo.textContent = info;
  const caja = el.pinosMini; if (caja.children.length !== 10) { caja.textContent = ''; TRIANGULO.forEach(([x, y]) => { const i = h('i'); i.style.left = 50 + x * 28 + '%'; i.style.top = y * 9 + 'px'; caja.appendChild(i); }); }
  Array.from(caja.children).forEach((i, k) => i.classList.toggle('en', !!(J.enPie & (1 << k))));
  const hp = el.hudPuntos; hp.textContent = '';
  if (!J.ronda) J.jug.forEach((q, i) => hp.appendChild(h('span', { cls: 'pastilla' + (i === J.turno ? ' act' : ''), style: '--c:' + q.color }, [h('i'), h('b', { txt: String(totalDe(i)) }), h('small', { txt: q.nombre })])));
  else { const pts = J.ronda.tipo === 'diario' ? J.ronda.pts : 0; hp.appendChild(h('span', { cls: 'pastilla act', style: '--c:' + p.color }, [h('i'), h('b', { txt: J.ronda.tipo === 'diario' ? String(pts) : '★' }), h('small', { txt: J.ronda.tipo === 'diario' ? 'puntos' : 'desafío' })])); }
  medidor();
  textoPista();
}
export function medidor() {
  const m = el.medidor, mostrar = J.activo && J.fase === 'apuntar' && (En.E.cargando || En.E.gesto);
  m.hidden = !mostrar; if (mostrar) m.querySelector('i').style.width = Math.round(En.E.carga * 100) + '%';
  if (Math.abs(+el.clPos.value - En.E.x * 100) > 0.5) el.clPos.value = String(Math.round(En.E.x * 100));
}
function textoPista() {
  const p = el.pista;
  if (!(J.fase === 'apuntar' && puedeLanzar()) || Pr.D.stats.tiros > 40) { p.textContent = ''; return; }
  const tact = matchMedia('(pointer: coarse)').matches, pad = window.Mando && window.Mando.conectado && window.Mando.activo;
  p.textContent = pad ? 'Stick izq: posición · Stick der: dirección · Gatillos: efecto · Mantén A y suelta para lanzar'
    : tact ? 'Arrastra a los lados para colocar · Desliza hacia arriba para lanzar (curva = efecto)'
      : 'Arrastra a los lados y desliza hacia arriba · o ←/→ posición, Q/E dirección, Z/C efecto, Espacio (mantén y suelta)';
}

/* ---------- tabla de puntos ---------- */
export function tablaPuntos(tiros, jug, actual) {
  const wrap = h('div', { cls: 'tabla-bolos' });
  jug.forEach((p, i) => {
    const t = S.calcular(tiros[i]);
    const fila = h('div', { cls: 'tb-jug' + (i === actual ? ' act' : ''), style: '--c:' + p.color });
    fila.appendChild(h('div', { cls: 'tb-nom' }, [h('i'), h('b', { txt: p.nombre }), h('span', { cls: 'tb-total', txt: String(t.total) })]));
    const fr = h('div', { cls: 'tb-frames' });
    t.frames.forEach((f, k) => {
      const casillas = k < 9 ? [f.marcas[0] != null && f.marcas[0] !== undefined ? f.marcas[0] : '', f.marcas[1] != null ? f.marcas[1] : ''] : [f.marcas[0] || '', f.marcas[1] || '', f.marcas[2] || ''];
      if (k < 9 && f.marcas[0] === 'X') { casillas[0] = ''; casillas[1] = 'X'; }
      fr.appendChild(h('div', { cls: 'tb-f' + (k === 9 ? ' ult' : '') }, [h('span', { cls: 'tb-n', txt: String(k + 1) }), h('div', { cls: 'tb-m' }, casillas.map((c) => h('em', { cls: c === 'X' ? 'x' : c === '/' ? 'sp' : '', txt: c }))), h('strong', { txt: f.acum != null ? String(f.acum) : '' })]));
    });
    fila.appendChild(fr); wrap.appendChild(fila);
  });
  return wrap;
}
export function abrirTabla() {
  if (!J.activo) return;
  abrirCapa('Tabla de puntos', (c) => { c.appendChild(tablaPuntos(J.tiros, J.jug, J.turno)); });
}
void $;
void AJ;
