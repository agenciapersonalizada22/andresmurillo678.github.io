// =============================================================
//  ⏱  EDITOR DE RELOJ (HTML + eventos)
//  Se usa en el selector previo a la partida y en Ajustes > Reloj.
//  El estado vive fuera: ctx = { id, favs, poner(id), ponerFavs(lista), repintar() }.
// =============================================================
import { PRESETS_RELOJ, relojPorId } from './config.js';
import { codificar, cfgBase, resumen, categoria, normalizar } from './relojcfg.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nombrePreset = (id) => (id === 'sin' ? 'SIN RELOJ' : id.replace('+', ' + '));
export const estadoEditor = { abierto: false };

function cfgDe(id) {
  const r = relojPorId(id);
  return r.min > 0 || r.porJug ? normalizar(r) : cfgBase();
}

export function resumenId(id) {
  const r = relojPorId(id);
  if (!(r.min > 0 || r.porJug)) return 'Sin reloj';
  const c = normalizar(r);
  return `${resumen(c)} · ${categoria(c)}`;
}

export function htmlEditor(id, favs = []) {
  const c = cfgDe(id), e = c.etapas[0] || {};
  const ladoH = c.w != null ? 'w' : c.b != null ? 'b' : '';
  const minH = c.w != null ? c.w : c.b != null ? c.b : '';
  let h = `<div class="relojEd"><div class="fichas rlPresets" data-rl="presets">${PRESETS_RELOJ.map((p) => `<button type="button" data-rl="preset" data-v="${p}" class="${id === p ? 'sel' : ''}">${nombrePreset(p)}</button>`).join('')}</div>`;
  h += `<p class="info rlResumen"><b>${esc(resumenId(id))}</b></p>`;
  if (favs.length) h += `<div class="campo"><label>Mis favoritos</label><div class="fichas rlFavs">${favs.map((f, i) => `<span class="rlFav"><button type="button" data-rl="fav" data-i="${i}" class="${id === f.id ? 'sel' : ''}" title="${esc(resumenId(f.id))}">${esc(f.n)}</button><button type="button" class="chico" data-rl="favBorrar" data-i="${i}" aria-label="Quitar favorito">✖</button></span>`).join('')}</div></div>`;
  h += `<details class="avanzado rlPers" ${estadoEditor.abierto ? 'open' : ''}><summary>Reloj personalizado</summary>
    <div class="rlGrid">
      <label>Minutos<input type="number" data-rl="min" min="0.5" max="180" step="0.5" value="${c.min}"></label>
      <label>Incremento (Fischer), s<input type="number" data-rl="inc" min="0" max="60" step="1" value="${c.inc}"></label>
      <label>Retraso<select data-rl="retTipo"><option value="" ${!c.ret ? 'selected' : ''}>Ninguno</option><option value="s" ${c.ret && !c.brons ? 'selected' : ''}>Simple (delay)</option><option value="b" ${c.brons ? 'selected' : ''}>Bronstein</option></select></label>
      <label>Segundos de retraso<input type="number" data-rl="ret" min="0" max="60" step="1" value="${c.ret}"></label>
      <label>Tiempo extra tras N jugadas<input type="number" data-rl="eJug" min="0" max="200" step="1" placeholder="p. ej. 40" value="${e.jug || ''}"></label>
      <label>Minutos extra<input type="number" data-rl="eMin" min="0.5" max="180" step="0.5" placeholder="p. ej. 30" value="${e.min || ''}"></label>
      <label>Tiempo por jugada, s (0 = no)<input type="number" data-rl="porJug" min="0" max="600" step="1" value="${c.porJug}"></label>
      <label>Ventaja de tiempo<select data-rl="hLado"><option value="" ${!ladoH ? 'selected' : ''}>Ninguna</option><option value="w" ${ladoH === 'w' ? 'selected' : ''}>Blancas tienen…</option><option value="b" ${ladoH === 'b' ? 'selected' : ''}>Negras tienen…</option></select></label>
      <label>Minutos de ese bando<input type="number" data-rl="hMin" min="0.5" max="180" step="0.5" value="${minH}"></label>
    </div>
    <p class="info">El otro bando usa los minutos base. Con «tiempo por jugada» se ignoran incremento, retraso y tiempo extra.</p>
    <div class="fila-in"><input type="text" data-rl="favNombre" maxlength="14" placeholder="Nombre del favorito" autocomplete="off"><button type="button" class="chico" data-rl="favGuardar">GUARDAR FAVORITO</button></div>
  </details></div>`;
  return h;
}

function leerCfg(raiz) {
  const g = (k) => raiz.querySelector(`[data-rl="${k}"]`).value;
  const c = { min: +g('min') || 10, inc: +g('inc') || 0, ret: +g('ret') || 0, brons: g('retTipo') === 'b', etapas: [], porJug: +g('porJug') || 0, w: null, b: null };
  if (g('retTipo') === '') c.ret = 0;
  else if (!c.ret) c.ret = 5;
  if (+g('eJug') > 0 && +g('eMin') > 0) c.etapas.push({ jug: +g('eJug'), min: +g('eMin') });
  const hl = g('hLado'), hm = +g('hMin');
  if (hl && hm > 0) c[hl] = hm;
  return c;
}

// Devuelve true si el evento era del editor
export function clicEditor(e, ctx) {
  const b = e.target.closest('button[data-rl]'); if (!b) return false;
  const k = b.dataset.rl, raiz = b.closest('.relojEd');
  if (k === 'preset') { ctx.poner(b.dataset.v); }
  else if (k === 'fav') { const f = ctx.favs[+b.dataset.i]; if (f) ctx.poner(f.id); }
  else if (k === 'favBorrar') { ctx.ponerFavs(ctx.favs.filter((_, i) => i !== +b.dataset.i)); }
  else if (k === 'favGuardar' && raiz) {
    const id = codificar(leerCfg(raiz));
    const nombre = (raiz.querySelector('[data-rl="favNombre"]').value.trim() || resumen(normalizar(leerCfg(raiz)))).slice(0, 14);
    ctx.ponerFavs([...ctx.favs.filter((f) => f.id !== id), { n: nombre, id }].slice(-12));
    ctx.poner(id);
  } else return false;
  return true;
}

export function cambioEditor(e, ctx) {
  const t = e.target.closest('[data-rl]'); if (!t || t.tagName === 'BUTTON') return false;
  const raiz = t.closest('.relojEd'); if (!raiz) return false;
  if (t.dataset.rl === 'favNombre') return true;
  estadoEditor.abierto = true;
  // con un par a medias (p. ej. jugadas sin minutos) se espera al otro campo para no perder lo escrito
  const v = (k) => raiz.querySelector(`[data-rl="${k}"]`).value;
  if ((v('eJug') !== '') !== (v('eMin') !== '') || (v('hLado') !== '' && !(+v('hMin') > 0))) return true;
  ctx.poner(codificar(leerCfg(raiz)));
  return true;
}
