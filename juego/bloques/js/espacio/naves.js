// =============================================================
//  🚀  NAVES ESPACIALES (lógica pura)
//  Tres tiers: lanzadera (saltos locales), nave interplanetaria con
//  motor iónico y nave de salto de largo alcance. Combustible en
//  "unidades" (bidón = +40, celda de xenón = +120). Escudo térmico
//  para entrar en atmósferas: nivel de la nave + mejora.
//  Despegar cuesta según la gravedad; viajar según distancia
//  comprimida (sistemaSolar.js) y ventana de lanzamiento.
// =============================================================
import { hash2 } from '../ruido.js';
import { distancia, mismoSistema, errorFase, multiplicadorVentana, posicion, dJ, ELEMENTOS, sistemaDe } from './sistemaSolar.js';

export const TIERS = {
  lanzadera: { tier: 1, nombre: 'Lanzadera', kit: 'kit_lanzadera', tanque: 100, factor: 1.6, vel: 0.6, escudo: 1, gMax: 0.5, alcance: 30, color: 0xe8ecf2, acento: 0xff8a3a },
  nave_ionica: { tier: 2, nombre: 'Nave interplanetaria', kit: 'kit_nave_ionica', tanque: 400, factor: 0.9, vel: 0.8, escudo: 2, gMax: 1.0, alcance: 330, color: 0xdfe6f2, acento: 0x5ab6ff },
  nave_salto: { tier: 3, nombre: 'Nave de salto', kit: 'kit_nave_salto', tanque: 1200, factor: 0.35, vel: 2.4, escudo: 3, gMax: 3, alcance: 9999, color: 0xcfc6e8, acento: 0xb06cff },
};
export const TIPOS_NAVE = Object.keys(TIERS);
export const esNave = (t) => Object.prototype.hasOwnProperty.call(TIERS, t);
export const COMB_BIDON = 40, COMB_XENON = 120;
export const ESCUDO_MEJORA = 1;
export const CASCO_MIN = 20;             // por debajo no despega
export const DIAS_POR_UJ = 0.12;        // días de juego que pasan por unidad de distancia (en vivo)
export const GRAVEDAD_NO_DESPEGA = new Set(['superficie', 'abismo']);

export const nuevaNave = (tipo) => ({ tipo, mejoras: { escudo: false }, casco: 100, comb: TIERS[tipo].tanque * 0.5, enVuelo: false, cuerpo: null });
export function naveValida(o) {
  if (!o || typeof o !== 'object' || !esNave(o.tipo)) return null;
  const T = TIERS[o.tipo];
  return {
    tipo: o.tipo, mejoras: { escudo: !!(o.mejoras && o.mejoras.escudo) },
    casco: Number.isFinite(o.casco) ? Math.max(0, Math.min(100, o.casco)) : 100,
    comb: Number.isFinite(o.comb) ? Math.max(0, Math.min(T.tanque, o.comb)) : T.tanque * 0.5,
    enVuelo: !!o.enVuelo, cuerpo: typeof o.cuerpo === 'string' && /^[a-z0-9_]{1,24}$/.test(o.cuerpo) ? o.cuerpo : null,
  };
}
export const nivelEscudo = (n) => TIERS[n.tipo].escudo + (n.mejoras.escudo ? ESCUDO_MEJORA : 0);

// ¿Puede despegar de esta dimensión?
export function puedeDespegar(nave, dimId, gravedad) {
  const T = TIERS[nave.tipo];
  if (dimId === 'superficie') return { ok: false, razon: 'La nave no despega de la Superficie terrestre: usa el cohete hasta la órbita' };
  if (dimId === 'abismo') return { ok: false, razon: 'No se puede despegar del Abismo' };
  if (gravedad > T.gMax) return { ok: false, razon: `Gravedad ${gravedad.toFixed(2)} g: necesitas una nave mayor (máx. ${T.gMax} g)` };
  if (nave.casco < CASCO_MIN) return { ok: false, razon: 'Casco dañado: repáralo con hierro antes de despegar' };
  return { ok: true, razon: '' };
}
export const costeDespegue = (g) => Math.round(4 + 14 * g);
export const costeAterrizaje = (g) => Math.round(3 + 8 * g);

// Planifica un viaje (origen y destino son cuerpos: 'tierra', 'marte', 'luna', 'sol'…)
export function planViaje(nave, origen, destino, diaAbs, gDespegue = 0) {
  const T = TIERS[nave.tipo];
  const r = { origen, destino, posible: true, razon: '', dist: 0, mult: 1, err: 0, comb: 0, seg: 0, dias: 0, local: false };
  if (origen === destino) return { ...r, posible: false, razon: 'Ya estás aquí' };
  if (destino === 'sol') {
    const d = dJ(posicion(origen, diaAbs).ua || 1) ;
    r.dist = Math.max(10, d); r.comb = Math.round(r.dist * T.factor * 1.4); r.seg = r.dist / T.vel; r.dias = r.dist * DIAS_POR_UJ;
    if (nivelEscudo(nave) < 4) { r.posible = false; r.razon = 'Solo una nave de salto con escudo térmico mejorado resiste el Sol'; }
  } else {
    r.local = mismoSistema(origen, destino);
    r.dist = Math.max(1, distancia(origen, destino, diaAbs));
    r.err = errorFase(origen, destino, diaAbs);
    r.mult = multiplicadorVentana(r.err);
    r.comb = Math.round(r.dist * T.factor * r.mult);
    r.seg = r.dist / T.vel;
    r.dias = r.dist * DIAS_POR_UJ * (r.local ? 0.2 : 1);
    if (!r.local && r.dist > T.alcance) { r.posible = false; r.razon = `Fuera de alcance (${T.alcance} uj): necesitas una nave mayor`; }
  }
  r.comb += costeDespegue(gDespegue);
  if (r.posible && r.comb > nave.comb) { r.posible = false; r.razon = `Combustible insuficiente: ${Math.round(nave.comb)} de ${r.comb}`; }
  return r;
}

// ¿Cruza el cinturón de asteroides? (radio comprimido entre las dos órbitas)
export function cruzaCinturon(origen, destino, diaAbs) {
  const a = origen === 'cinturon' ? 158 : (posicion(origen, diaAbs).r || 0), b = destino === 'cinturon' ? 158 : (posicion(destino, diaAbs).r || 0);
  const lo = Math.min(a, b), hi = Math.max(a, b), c = dJ(ELEMENTOS.cinturon.a);
  return lo < c - 8 && hi > c + 8;
}

// ---- eventos en ruta (deterministas con una semilla): lista ordenada por posición (0..1) del viaje
export function eventosRuta(origen, destino, semilla, diaAbs) {
  const s = (semilla | 0) ^ (origen.length * 131 + destino.length * 977 + Math.floor(diaAbs));
  const ev = [];
  const prueba = (tipo, k, p, pos0 = 0.15, pos1 = 0.85) => { if (hash2(k, 3, s) < p) ev.push({ tipo, pos: pos0 + hash2(k, 5, s) * (pos1 - pos0), resuelto: false, fuerza: 0.5 + hash2(k, 7, s) * 0.5 }); };
  if (cruzaCinturon(origen, destino, diaAbs)) { prueba('asteroides', 1, 1, 0.35, 0.6); prueba('asteroides', 2, 0.6, 0.4, 0.7); }
  const interior = Math.min(posicion(origen, diaAbs).r || 0, posicion(destino, diaAbs).r || 0) < 90;
  prueba('tormenta_solar', 3, interior ? 0.55 : 0.2);
  prueba('averia', 4, 0.3);
  prueba('asteroides', 5, 0.2);
  if (destino === 'sol') ev.push({ tipo: 'tormenta_solar', pos: 0.7, resuelto: false, fuerza: 1 });
  return ev.sort((a, b) => a.pos - b.pos);
}
export const ELECCIONES = {
  asteroides: [['esquivar', 'ESQUIVAR (3 combustible)'], ['escudo', 'USAR EL ESCUDO (solo naves iónicas o mayores)'], ['ignorar', 'IGNORAR']],
  tormenta_solar: [['refugio', 'REFUGIARSE EN LA BODEGA'], ['blindar', 'BLINDAR (1 blindaje anti-radiación)'], ['ignorar', 'IGNORAR']],
  averia: [['reparar', 'REPARAR (2 hierro)'], ['ignorar', 'IGNORAR']],
};
export const TEXTO_EVENTO = {
  asteroides: 'Campo de asteroides por proa', tormenta_solar: 'Tormenta solar: partículas de alta energía', averia: 'Avería: pérdida de presión en el sistema de combustible',
};

// Resuelve la elección del jugador. ctx: { nave, radiacion (nivel del traje), items: {hierro, blindaje_plomo}, rng }
// Devuelve { casco, comb, danio, gasta: {item: n}, texto, ok }
export function resolverEvento(ev, eleccion, ctx) {
  const rng = ctx.rng || Math.random, f = ev.fuerza || 0.7;
  const r = { casco: 0, comb: 0, danio: 0, gasta: {}, texto: '', ok: true };
  const tier = TIERS[ctx.nave.tipo].tier;
  switch (ev.tipo) {
    case 'asteroides':
      if (eleccion === 'escudo' && tier >= 2) r.texto = 'El escudo desvía las rocas';
      else if (eleccion === 'esquivar' && ctx.nave.comb >= 3) { r.comb = -3; if (rng() < 0.75) r.texto = 'Maniobra perfecta'; else { r.casco = -Math.round(6 * f); r.texto = 'Rozas una roca'; r.ok = false; } }
      else { r.casco = -Math.round(24 * f); r.texto = 'Impactos en el casco'; r.ok = false; }
      break;
    case 'tormenta_solar':
      if (eleccion === 'blindar' && (ctx.items.blindaje_plomo || 0) >= 1) { r.gasta.blindaje_plomo = 1; r.texto = 'Blindaje activado'; }
      else if (eleccion === 'refugio') { r.danio = Math.max(0, Math.round(3 * f) - ctx.radiacion); r.texto = r.danio ? 'Llegas tarde al refugio' : 'Radiación bloqueada'; r.ok = r.danio === 0; }
      else { r.danio = Math.max(1, Math.round(9 * f) - 2 * ctx.radiacion); r.casco = -4; r.texto = 'La radiación te alcanza'; r.ok = false; }
      break;
    case 'averia':
      if (eleccion === 'reparar' && (ctx.items.hierro || 0) >= 2) { r.gasta.hierro = 2; r.texto = 'Fuga reparada'; r.casco = 5; }
      else { r.comb = -Math.round(15 * f + 5); r.casco = -8; r.texto = 'Pierdes combustible'; r.ok = false; }
      break;
    default: break;
  }
  return r;
}

// ---- Entrada atmosférica: nivel de escudo que pide el cuerpo vs el de la nave
export function entradaAtmosferica(nave, reqNivel) {
  const niv = nivelEscudo(nave);
  if (niv >= reqNivel) return { ok: true, calor: reqNivel / 3, danoCasco: 0, falta: 0 };
  return { ok: false, calor: 1, danoCasco: 60 * (reqNivel - niv), falta: reqNivel - niv };
}
// ---- Aproximación al Sol: calor de 0 a 1 según la cercanía (progreso 0..1). Escudo >= 4 lo resiste.
export const calorSol = (prog) => Math.max(0, Math.min(1, (prog - 0.3) / 0.6));
export const resisteSol = (nave) => nivelEscudo(nave) >= 4;

// Repostar: cuánto sube el tanque con cada objeto
export const combustibleDe = { bidon: COMB_BIDON, celda_xenon: COMB_XENON };
export function repostar(nave, item) {
  const T = TIERS[nave.tipo], add = combustibleDe[item] || 0;
  if (!add || nave.comb >= T.tanque - 1) return 0;
  const antes = nave.comb; nave.comb = Math.min(T.tanque, nave.comb + add);
  return nave.comb - antes;
}
