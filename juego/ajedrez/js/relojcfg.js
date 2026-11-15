// =============================================================
//  ⏱  CONFIGURACIÓN DE RELOJ (sin DOM)
//  Un control de tiempo completo vive en una cadena corta (id), igual
//  que los ids antiguos ("5+3", "c15+5"): sirve para guardar partidas,
//  enviar por red y recordar favoritos.
//    k<min>+<inc>[~ds<s>|~db<s>][~e<jug>:<min>]...[~p<s>][~w<min>][~b<min>]
//  ds = retraso simple · db = retraso Bronstein · e = tiempo extra tras N
//  jugadas de cada bando (estilo torneo) · p = tiempo por jugada ·
//  w / b = minutos propios de blancas / negras (ventaja de tiempo).
// =============================================================
export const LIM = { min: [0.5, 180], inc: [0, 60], ret: [0, 60], jug: [1, 200], porJug: [3, 600] };
const lim = (v, [a, b], def) => { v = +v; return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : def; };
const num = (x) => String(+(+x).toFixed(2));

export const cfgBase = () => ({ min: 10, inc: 0, ret: 0, brons: false, etapas: [], porJug: 0, w: null, b: null });

export function normalizar(c) {
  const o = cfgBase();
  o.min = lim(c.min, LIM.min, 10);
  o.inc = Math.round(lim(c.inc, LIM.inc, 0));
  o.ret = Math.round(lim(c.ret, LIM.ret, 0));
  o.brons = !!c.brons && o.ret > 0;
  o.porJug = c.porJug ? Math.round(lim(c.porJug, LIM.porJug, 30)) : 0;
  o.etapas = (c.etapas || []).slice(0, 3).map((e) => ({ jug: Math.round(lim(e.jug, LIM.jug, 40)), min: lim(e.min, LIM.min, 15) })).sort((a, b) => a.jug - b.jug);
  o.w = c.w != null && c.w !== '' ? lim(c.w, LIM.min, o.min) : null;
  o.b = c.b != null && c.b !== '' ? lim(c.b, LIM.min, o.min) : null;
  if (o.porJug) { o.ret = 0; o.brons = false; o.inc = 0; o.etapas = []; }
  return o;
}

export function codificar(c) {
  c = normalizar(c);
  let s = `k${num(c.min)}+${c.inc}`;
  if (c.ret) s += `~d${c.brons ? 'b' : 's'}${c.ret}`;
  for (const e of c.etapas) s += `~e${e.jug}:${num(e.min)}`;
  if (c.porJug) s += `~p${c.porJug}`;
  if (c.w != null) s += `~w${num(c.w)}`;
  if (c.b != null) s += `~b${num(c.b)}`;
  return s;
}

// id -> cfg normalizada (min 0 = sin reloj) o null si no es un id extendido
export function decodificar(id) {
  const m = /^k(\d+(?:\.\d+)?)\+(\d+)((?:~[a-z][\w.:]*)*)$/.exec(id || '');
  if (!m) return null;
  const c = { min: +m[1], inc: +m[2], etapas: [] };
  for (const t of m[3].split('~').filter(Boolean)) {
    const k = t[0], v = t.slice(1);
    if (k === 'd') { c.brons = v[0] === 'b'; c.ret = +v.slice(1); }
    else if (k === 'e') { const [j, mi] = v.split(':'); c.etapas.push({ jug: +j, min: +mi }); }
    else if (k === 'p') c.porJug = +v;
    else if (k === 'w') c.w = +v;
    else if (k === 'b') c.b = +v;
  }
  if (!(c.min > 0) && !c.porJug) return null;
  const o = normalizar(c);
  if (!(+m[1] > 0)) o.min = 0;
  return o;
}

const mm = (m) => (m < 1 ? `${Math.round(m * 60)} s` : `${num(m)} min`);
export function resumen(c) {
  if (!c || (!(c.min > 0) && !c.porJug)) return 'Sin reloj';
  if (c.porJug) return `${c.porJug} s por jugada`;
  let t = `${mm(c.min)}${c.inc ? ` + ${c.inc} s` : ''}`;
  if (c.ret) t += ` · retraso ${c.brons ? 'Bronstein ' : ''}${c.ret} s`;
  for (const e of c.etapas) t += ` · +${mm(e.min)} en la jugada ${e.jug}`;
  if (c.w != null || c.b != null) t += ` · blancas ${mm(c.w ?? c.min)} / negras ${mm(c.b ?? c.min)}`;
  return t;
}

// Reloj de ajedrez: rapidez según tiempo de partida estimado (min + 40·inc)
export function categoria(c) {
  if (!c || !(c.min > 0 || c.porJug)) return '';
  const t = c.porJug ? c.porJug * 40 / 60 : c.min + (c.inc * 40) / 60;
  return t < 3 ? 'Bala' : t < 10 ? 'Blitz' : t < 30 ? 'Rápida' : 'Clásica';
}
