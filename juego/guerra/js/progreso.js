// Progresión: créditos, experiencia, vehículos comprados, mejoras, pintura, estadísticas y logros.
// Hay 3 ranuras de guardado; la ranura 1 usa la clave base.
import { CONFIG, AVIONES } from './config.js';
import { TANQUES, MEJORAS, ORDEN_MEJORAS, CAMUFLAJES, MARCAS, LOGROS } from './catalogo.js';
import { mejorPuntaje } from './guardado.js';
import { perfilCuenta } from './cuentaJuego.js';

const NUEVO = () => ({
  v: 1, creditos: 600, xp: 0,
  poseidos: { avion: {}, tanque: {} },
  mejoras: {}, pintura: {},
  elegido: { avion: 'halcon', tanque: 'jugador' },
  stats: { bajas: 0, bajasAire: 0, bajasTanque: 0, bajasTierra: 0, muertes: 0, partidas: 0, victorias: 0, tiempo: 0, disparos: 0, aciertos: 0, bombas: 0, misiles: 0, capturas: 0, misiones: 0, mejorRacha: 0, danio: 0, misilesEngañados: 0 },
  logros: {}, campana: {}, tutorial: false,
});

const clave = (n) => (n === 1 ? CONFIG.guardado.progreso : CONFIG.guardado.progreso + '_' + n);
let ranura = 1;
try { ranura = Math.min(3, Math.max(1, parseInt(localStorage.getItem(CONFIG.guardado.ranura), 10) || 1)); } catch (e) { /* sin almacenamiento */ }
let d = null;

function leer(n) {
  try {
    const o = JSON.parse(localStorage.getItem(clave(n)) || 'null');
    if (o && typeof o === 'object') { const b = NUEVO(); return { ...b, ...o, stats: { ...b.stats, ...(o.stats || {}) }, poseidos: { ...b.poseidos, ...(o.poseidos || {}) }, elegido: { ...b.elegido, ...(o.elegido || {}) } }; }
  } catch (e) { /* datos dañados: se empieza de cero */ }
  return NUEVO();
}

export const nivelDeXp = (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / 60)) + 1;
export const xpDeNivel = (n) => 60 * (n - 1) * (n - 1);
const tabla = (tipo) => (tipo === 'avion' ? AVIONES : TANQUES);

export const Progreso = {
  ranura: () => ranura,
  datos() { return d || (d = leer(ranura)); },
  guardar() { try { localStorage.setItem(clave(ranura), JSON.stringify(this.datos())); } catch (e) { /* nada */ } },
  cambiarRanura(n) {
    ranura = n;
    try { localStorage.setItem(CONFIG.guardado.ranura, String(n)); } catch (e) { /* nada */ }
    d = leer(n);
  },
  resumenRanura(n) {
    const o = n === ranura ? this.datos() : leer(n);
    return `Nivel ${nivelDeXp(o.xp)} · ${o.creditos} cr · ${o.stats.partidas} partidas`;
  },
  borrarRanura(n) {
    try { localStorage.removeItem(clave(n)); } catch (e) { /* nada */ }
    if (n === ranura) d = NUEVO();
  },
  nivel() { return nivelDeXp(this.datos().xp); },
  xp() { return this.datos().xp; },
  creditos() { return this.datos().creditos; },
  stats() { return this.datos().stats; },

  // ---- Vehículos
  poseido(tipo, id) {
    const t = tabla(tipo)[id];
    if (!t) return false;
    if ((t.rango || 1) <= 1 && !t.costo) return true;
    if (this.datos().poseidos[tipo][id]) return true;
    // compatibilidad con la versión anterior: se abrían con puntos de récord
    return tipo === 'avion' && t.desbloqueo > 0 && mejorPuntaje('avion') >= t.desbloqueo;
  },
  nPoseidos() { let n = 0; for (const tipo of ['avion', 'tanque']) for (const id in tabla(tipo)) if (this.poseido(tipo, id)) n++; return n; },
  puedeComprar(tipo, id) {
    const t = tabla(tipo)[id];
    return !this.poseido(tipo, id) && this.nivel() >= (t.rango || 1) && this.datos().creditos >= (t.costo || 0);
  },
  comprar(tipo, id) {
    if (!this.puedeComprar(tipo, id)) return false;
    this.datos().creditos -= tabla(tipo)[id].costo || 0;
    this.datos().poseidos[tipo][id] = 1;
    this.guardar();
    return true;
  },
  elegido(tipo) {
    const id = this.datos().elegido[tipo];
    return this.poseido(tipo, id) ? id : (tipo === 'avion' ? CONFIG.predeterminado.avion : 'jugador');
  },
  elegir(tipo, id) {
    if (!this.poseido(tipo, id)) return false;
    this.datos().elegido[tipo] = id;
    this.guardar();
    return true;
  },

  // ---- Mejoras de módulos (3 niveles)
  nivelMejora(tipo, id, mod) { const m = this.datos().mejoras[tipo + ':' + id]; return m ? m[mod] || 0 : 0; },
  costoMejora(tipo, id, mod) { return MEJORAS[mod].costo * (this.nivelMejora(tipo, id, mod) + 1); },
  mejorar(tipo, id, mod) {
    const n = this.nivelMejora(tipo, id, mod);
    if (n >= 3 || !this.poseido(tipo, id)) return false;
    const c = this.costoMejora(tipo, id, mod);
    if (this.datos().creditos < c) return false;
    this.datos().creditos -= c;
    const k = tipo + ':' + id;
    const m = this.datos().mejoras[k] || (this.datos().mejoras[k] = {});
    m[mod] = n + 1;
    this.guardar();
    return true;
  },
  multiplicadores(tipo, id) {
    const n = (m) => this.nivelMejora(tipo, id, m);
    return { vel: 1 + 0.05 * n('motor'), dano: 1 + 0.08 * n('armas'), vida: 1 + 0.08 * n('blindaje') };
  },

  // ---- Pintura
  pintura(tipo, id) {
    const p = this.datos().pintura[tipo + ':' + id] || {};
    return { camo: p.camo || 'base', marca: p.marca || 'ninguna', camos: p.camos || { base: 1 }, marcas: p.marcas || { ninguna: 1 } };
  },
  _pint(tipo, id) {
    const k = tipo + ':' + id;
    const o = this.datos().pintura[k] || (this.datos().pintura[k] = { camo: 'base', marca: 'ninguna', camos: { base: 1 }, marcas: { ninguna: 1 } });
    return o;
  },
  elegirPintura(tipo, id, que, valor) {
    const cat = que === 'camo' ? CAMUFLAJES : MARCAS;
    if (!cat[valor]) return false;
    const o = this._pint(tipo, id), lista = que === 'camo' ? o.camos : o.marcas;
    if (!lista[valor]) {
      if (this.datos().creditos < cat[valor].costo) return false;
      this.datos().creditos -= cat[valor].costo;
      lista[valor] = 1;
    }
    o[que] = valor;
    this.guardar();
    return true;
  },

  // Definición lista para jugar: mejoras y pintura aplicadas
  defAvion(id) {
    const base = AVIONES[id] || AVIONES[CONFIG.predeterminado.avion];
    const m = this.multiplicadores('avion', base.id || id), p = this.pintura('avion', base.id || id);
    const def = { ...base, vel: { ...base.vel }, ametra: { ...base.ametra }, sec: { ...base.sec } };
    def.vel.tope *= m.vel; def.vel.rango *= m.vel;
    def.ametra.dano *= m.dano;
    def.vida = Math.round(base.vida * m.vida);
    const c = CAMUFLAJES[p.camo];
    if (c && c.c) def.colores = c.c;
    def.marca = p.marca;
    return def;
  },
  opcionesTanque(id) {
    const m = this.multiplicadores('tanque', id), p = this.pintura('tanque', id);
    const c = CAMUFLAJES[p.camo];
    return { jugador: true, mult: m, color: c && c.c ? c.c[0] : undefined, marca: p.marca };
  },

  // ---- Experiencia, créditos, estadísticas
  recompensar(xp, cr) {
    const antes = this.nivel();
    const o = this.datos();
    o.xp += Math.round(xp);
    o.creditos += Math.round(cr);
    this.guardar();
    return this.nivel() > antes ? this.nivel() : 0;
  },
  sumar(clave, n = 1) { this.datos().stats[clave] = (this.datos().stats[clave] || 0) + n; },
  maximo(clave, v) { if (v > (this.datos().stats[clave] || 0)) this.datos().stats[clave] = v; },
  // Devuelve los logros recién conseguidos
  revisarLogros() {
    const o = this.datos(), nuevos = [];
    const extra = { nPoseidos: this.nPoseidos(), nivel: this.nivel() };
    for (const l of LOGROS) {
      if (!o.logros[l.id] && l.ok(o.stats, extra)) { o.logros[l.id] = Date.now(); nuevos.push(l); }
    }
    if (nuevos.length) this.guardar();
    return nuevos;
  },
  misionHecha(id) { return !!this.datos().campana[id]; },
  completarMision(id) { this.datos().campana[id] = 1; this.sumar('misiones'); this.guardar(); },
  ordenMejoras: ORDEN_MEJORAS,
};

// Perfil compartido con los demás juegos
export function perfil() {
  const c = perfilCuenta();
  if (c) return c;
  try {
    const p = JSON.parse(localStorage.getItem('juego_perfil') || 'null');
    if (p && typeof p === 'object') return { nombre: String(p.nombre || 'Jugador').slice(0, 16), color: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#3df5ff' };
  } catch (e) { /* sin perfil */ }
  return { nombre: 'Jugador', color: '#3df5ff' };
}
