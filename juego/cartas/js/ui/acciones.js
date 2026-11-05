// Barra de acciones: botones del juego, deslizador de cantidad con atajos (1/2, 3/4, pot, all-in), temporizador, atajos de teclado.
import { h, fmt, boton } from './dom.js';
import { Sonido } from '../marco/sonido.js';

let raiz, tituloEl, infoEl, relojEl, cantCaja, rapidosEl, slider, valorEl, botonesEl, espera, ctl = null;
let est = { cant: 0, clave: '', panel: null, enviando: false, meta: null, t0: 0, plazo: 0 };
let teclas = {}, timerReloj = 0;
const hooks = { enviar: null, sentar: null, recomprar: null };
export function configurar(o) { Object.assign(hooks, o); }
export function ponerTeclas(t) { teclas = t || {}; }

export function montar(cont) {
  tituloEl = h('b', { cls: 'a-titulo' }); infoEl = h('span', { cls: 'a-info' }); relojEl = h('span', { cls: 'a-reloj', 'aria-hidden': 'true' });
  slider = h('input', { type: 'range', cls: 'a-slider', 'aria-label': 'Cantidad', 'data-f': 1, min: 0, max: 100, step: 1, value: 0 });
  valorEl = h('output', { cls: 'a-valor' });
  const menos = boton('−', () => cambiar(-1), 'icono', { 'aria-label': 'Menos' }), mas = boton('+', () => cambiar(1), 'icono', { 'aria-label': 'Más' });
  rapidosEl = h('div', { cls: 'a-rapidos' });
  cantCaja = h('div', { cls: 'a-cantidad', hidden: '' }, [rapidosEl, h('div', { cls: 'a-desliza' }, [menos, slider, mas, valorEl])]);
  botonesEl = h('div', { cls: 'a-botones' });
  espera = h('div', { cls: 'a-espera', hidden: '' });
  raiz = h('section', { id: 'acciones', 'aria-label': 'Acciones' }, [h('div', { cls: 'a-cab' }, [tituloEl, infoEl, relojEl]), cantCaja, botonesEl, espera]);
  slider.addEventListener('input', () => { est.cant = +slider.value; pintarCant(); });
  cont.appendChild(raiz);
  return raiz;
}
function limites() { const c = est.meta && est.meta.cantidad; return c; }
function fijar(v) {
  const c = limites(); if (!c) return;
  est.cant = Math.max(c.min, Math.min(c.max, Math.round(v))); slider.value = est.cant; pintarCant();
}
function pintarCant() {
  valorEl.textContent = fmt(est.cant);
  const b = botonesEl.querySelector('[data-cant]');
  if (b) b.textContent = b.dataset.plantilla.replace('{v}', fmt(est.cant));
  const c = limites(); if (c) slider.style.setProperty('--p', ((est.cant - c.min) / Math.max(1, c.max - c.min) * 100) + '%');
}
export function cambiar(dir, mult) {
  const c = limites(); if (!c) return false;
  fijar(est.cant + dir * (c.paso || 1) * (mult || 1)); return true;
}

export function render(vm, UI, L) {
  const j = vm.j, yo = vm.yo;
  const panel = (yo >= 0 && !vm.fin) ? UI.panel(vm) : { espera: true };
  est.enviando = false;
  clearInterval(timerReloj); relojEl.textContent = '';
  if (panel.espera) {
    botonesEl.replaceChildren(); cantCaja.hidden = true; tituloEl.textContent = ''; infoEl.textContent = ''; est.meta = null; est.panel = null;
    espera.hidden = false; espera.replaceChildren(...textoEspera(vm, L));
    return;
  }
  espera.hidden = true;
  const clave = JSON.stringify([vm.mano, j.fase, j.turno, j.legal && (j.legal.minTo || j.legal.min), j.legal && (j.legal.maxTo || j.legal.max)]);
  const nuevo = clave !== est.clave; est.clave = clave;
  tituloEl.textContent = panel.titulo || ''; infoEl.textContent = panel.info || '';
  const con = panel.botones.find((b) => b.cantidad);
  est.meta = con || null; est.panel = panel;
  cantCaja.hidden = !con;
  if (con) {
    const c = con.cantidad;
    slider.min = c.min; slider.max = c.max;
    rapidosEl.replaceChildren(...c.rapidos.filter((r, k, a) => a.findIndex((x) => x.v === r.v) === k).map((r) => boton(r.txt, () => fijar(r.v), 'sec rapido', { 'aria-label': 'Fijar ' + r.txt + ' (' + fmt(r.v) + ')' })));
    if (nuevo || est.cant < c.min || est.cant > c.max) est.cant = Math.max(c.min, Math.min(c.max, c.def));
    slider.value = est.cant;
  }
  botonesEl.replaceChildren(...panel.botones.map((b) => {
    const txt = b.txt.replace('{v}', fmt(b.fijo || est.cant));
    const el = boton(txt, () => enviar(b), b.cls, { 'data-id': b.id });
    if (b.cantidad) { el.dataset.cant = 1; el.dataset.plantilla = b.txt.replace('{v}', '{v}'); }
    if (b.b) el.dataset.b = 1;
    const tk = teclas[b.id] || b.tecla; if (tk) el.setAttribute('aria-keyshortcuts', tk);
    return el;
  }));
  if (con) pintarCant();
  if (nuevo) {
    Sonido.turno();
    const def = botonesEl.querySelector('.prim') || botonesEl.firstChild;
    if (def && document.body.classList.contains('modo-mando')) def.focus({ preventScroll: true });
  }
  const pl = vm.plazo && vm.plazo[yo];
  if (pl != null) {
    est.t0 = performance.now(); est.plazo = pl;
    const tic = () => { const s = Math.max(0, Math.ceil((est.plazo - (performance.now() - est.t0)) / 1000)); relojEl.textContent = '⏱ ' + s + ' s'; relojEl.classList.toggle('urge', s <= 5); if (s <= 5 && s > 0 && relojEl._s !== s) Sonido.tick(); relojEl._s = s; };
    tic(); timerReloj = setInterval(tic, 250);
  }
}
function textoEspera(vm, L) {
  const out = [], yo = vm.yo;
  const quien = L ? L.asientos.map((s, i) => (s.turno ? vm.asientos[i].nombre : '')).filter(Boolean) : [];
  if (vm.fin) { out.push(h('span', { txt: vm.premio ? `Torneo terminado: gana ${vm.premio.nombre}` : 'La sesión terminó.' })); return out; }
  if (yo < 0) {
    out.push(h('span', { txt: 'Mirando como espectador. ' }));
    if (vm.asientos.some((a) => a.tipo === 'abierto') && hooks.sentar) out.push(boton('Sentarme', () => hooks.sentar(), 'prim'));
    return out;
  }
  const mi = L && L.asientos[yo];
  if (mi && mi.fichas <= 0 && !(vm.asientos[yo].pend > 0) && L.fin !== false) {
    out.push(h('span', { txt: vm.cfg.torneo ? 'Estás eliminado. ' : 'Te quedaste sin fichas. ' }));
    if (vm.cfg.recompra && !vm.cfg.torneo && hooks.recomprar) out.push(boton('Recomprar fichas', () => hooks.recomprar(), 'prim'));
    return out;
  }
  if (vm.asientos[yo].salir) { out.push(h('span', { txt: 'Te levantarás al terminar la mano…' })); return out; }
  if (vm.pausa > 0) out.push(h('span', { txt: 'Siguiente mano en un momento…' }));
  else out.push(h('span', { txt: quien.length ? 'Esperando a ' + quien.join(', ') + '…' : 'Esperando…' }));
  return out;
}
function enviar(b) {
  if (est.enviando) return;
  est.enviando = true; Sonido.clic();
  const a = Object.assign({}, b.accion);
  if (b.cantidad) a.a = est.cant; else if (b.fijo) a.a = b.fijo;
  Array.from(botonesEl.children).forEach((x) => { x.disabled = true; });
  if (hooks.enviar) hooks.enviar(a);
  setTimeout(() => { est.enviando = false; Array.from(botonesEl.children).forEach((x) => { x.disabled = false; }); }, 900);
}
export function pulsarB() { const b = botonesEl && botonesEl.querySelector('[data-b]'); if (b && !b.disabled) { b.click(); return true; } return false; }
export function atajo(e) {
  if (!est.panel || !est.panel.botones) return false;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === 'ArrowUp' || k === 'ArrowDown') { if (!limites()) return false; cambiar(k === 'ArrowUp' ? 1 : -1, e.shiftKey ? 10 : 1); return true; }
  if (k === 'Enter' || k === ' ') { const d = document.activeElement; if (d && d.tagName === 'BUTTON' && raiz.contains(d)) return false; const p = botonesEl.querySelector('.prim:not([data-cant])') || botonesEl.querySelector('.prim'); if (p) { p.click(); return true; } return false; }
  const b = est.panel.botones.find((x) => (teclas[x.id] || x.tecla) === k);
  if (b) { const el = botonesEl.querySelector(`[data-id="${b.id}"]`); if (el && !el.disabled) { el.click(); return true; } }
  return false;
}
export const contenedor = () => raiz;
export const hayCantidad = () => !!limites();
export function ponerZurdo(v) { if (raiz) raiz.classList.toggle('zurdo', !!v); }
