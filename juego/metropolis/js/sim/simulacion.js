// Paso de simulación por hora, cierre de día, eventos y progreso.
import { N, azar, notar, fx, darXp, quitarEdif, edifEn, idx } from './ciudad.js';
import { ITEM, ZONAS, NIVELES, MISIONES, LOGROS, TECH, DIARIA } from './datos.js';
import { recalcular, tierPorPop } from './recalculo.js';
import { limitar } from './util.js';

export function razonSubida(c, b) {
  const it = ITEM[b.t];
  if (it.tipo !== 'zona' || b.n < 1) return '';
  if (b.n >= 4) return 'Nivel máximo';
  const r = c.r, ci = Math.floor(b.cy - 0.01) * N + Math.floor(b.cx - 0.01), z = it.zona, m = b.n + 1;
  if (b.falta) return 'Falta luz, agua o calle';
  const d = c.dem[z];
  if (d <= 0.15) return 'La demanda es baja';
  const v = r.valor[ci];
  if (m === 2 && v < (z === 'I' ? 25 : 35)) return 'Valor del suelo bajo';
  if (m === 3) {
    if (c.tier < 1) return 'Requiere Pueblo';
    if (v < (z === 'I' ? 35 : 50)) return 'Valor del suelo bajo';
    if (z !== 'I' && !r.edu[ci]) return 'Necesita escuela cerca';
    if (z === 'R' && !r.salud[ci]) return 'Necesita clínica cerca';
  }
  if (m === 4) {
    if (!c.tech.rascacielos) return 'Investiga Rascacielos';
    if (c.tier < 3) return 'Requiere Metrópolis';
    if (v < (z === 'I' ? 45 : 65)) return 'Valor del suelo bajo';
    if (!r.edu[ci] || !r.bomb[ci] || !r.poli[ci]) return 'Necesita escuela, bomberos y policía';
  }
  return '';
}

export function costoImpulso(b) { return 120 * b.n * (b.n + 1); }

export function impulsar(c, id) {
  const b = c.edif.get(id);
  if (!b || ITEM[b.t].tipo !== 'zona' || b.n < 1) return { ok: false, razon: 'No disponible' };
  const falta = razonSubida(c, b);
  const cs = costoImpulso(b);
  if (falta === 'La demanda es baja' || falta) return { ok: false, razon: falta };
  if (c.dinero < cs) return { ok: false, razon: 'Dinero insuficiente' };
  c.dinero -= cs; b.n++; b.edad = 0; c.sucio = true; c.undo.length = 0;
  darXp(c, 12);
  fx(c, { k: 'mejora', x: b.x, y: b.y, w: 1, h: 1, id });
  fx(c, { k: 'sonido', n: 'nivel' });
  return { ok: true, costo: cs };
}

function crecer(c) {
  const s = c.s, ok = s.ratioE >= 0.85 && s.ratioA >= 0.85;
  for (const b of c.edif.values()) {
    const it = ITEM[b.t];
    if (it.tipo !== 'zona') { b.edad++; continue; }
    b.edad++;
    const z = it.zona, d = c.dem[z];
    if (b.n === 0) {
      if (b.cn && b.cobE && b.cobA && ok && d > 0.05 && azar(c) < 0.03 + 0.22 * d) {
        b.n = 1; b.edad = 0; b.pop = 0;
        fx(c, { k: 'crece', x: b.x, y: b.y, w: 1, h: 1, id: b.id });
        c.sucio = true;
      }
      continue;
    }
    if (b.falta) {
      b.sinS++;
      if (b.sinS >= 30) { b.n--; b.sinS = 14; b.edad = 0; c.sucio = true; fx(c, { k: 'abandono', x: b.x, y: b.y }); }
      continue;
    }
    if (b.sinS > 0) b.sinS--;
    if (b.n < 4 && b.edad >= 8 && ok && d > 0.15 && azar(c) < 0.03 + 0.07 * d && razonSubida(c, b) === '') {
      b.n++; b.edad = 0; c.sucio = true;
      fx(c, { k: 'crece', x: b.x, y: b.y, w: 1, h: 1, id: b.id, sube: true });
    } else if (d < -0.5 && b.edad > 12 && azar(c) < -0.012 * d) {
      b.n--; b.edad = 0; c.sucio = true;
    }
  }
}

function poblar(c) {
  const fel = c.s.felicidad / 100;
  const dR = c.dem.R;
  for (const b of c.edif.values()) {
    if (b.t !== 'zonaR') continue;
    if (b.n === 0) { b.pop = 0; continue; }
    const cap = ZONAS.R.cap[b.n];
    let obj = cap * (0.45 + 0.55 * fel) * (b.falta ? 0.4 : 1) * (dR < -0.4 ? 0.85 : 1);
    obj = Math.round(obj);
    if (b.pop < obj) b.pop = Math.min(obj, b.pop + Math.max(1, Math.ceil(cap * 0.25)));
    else if (b.pop > obj) b.pop = Math.max(obj, b.pop - Math.max(1, Math.ceil(cap * 0.2)));
    if (b.pop > cap) b.pop = cap;
  }
}

function fuegos(c) {
  const r = c.r;
  let cambio = false;
  const arder = [];
  for (const b of c.edif.values()) {
    if (b.fuego <= 0) continue;
    const ci = Math.floor(b.cy - 0.01) * N + Math.floor(b.cx - 0.01);
    if (r.bomb[ci] > 0 && azar(c) < 0.5) {
      b.fuego = 0; c.cont.incendios++; cambio = true;
      notar(c, 'Los bomberos apagaron un incendio', 'ok', b.cx, b.cy);
      fx(c, { k: 'sonido', n: 'ok' });
      continue;
    }
    b.fuego--;
    if (b.fuego <= 0) {
      const it = ITEM[b.t];
      if (it.tipo === 'zona') { b.n = 0; b.pop = 0; }
      else quitarEdif(c, b);
      fx(c, { k: 'derribo', x: b.x, y: b.y, w: it.w, h: it.h, t: b.t });
      notar(c, 'Un incendio destruyó un edificio', 'mal', b.cx, b.cy);
      cambio = true;
    } else if (azar(c) < 0.1) arder.push(b);
  }
  for (const b of arder) {
    const vec = [];
    for (let y = Math.floor(b.cy) - 3; y <= Math.floor(b.cy) + 3; y++) for (let x = Math.floor(b.cx) - 3; x <= Math.floor(b.cx) + 3; x++) {
      const o = edifEn(c, x, y);
      if (!o || o === b || o.fuego > 0 || vec.includes(o)) continue;
      if (ITEM[o.t].tipo === 'zona' && o.n === 0) continue;
      vec.push(o);
    }
    if (vec.length) { const o = vec[Math.floor(azar(c) * vec.length)]; o.fuego = 10; cambio = true; }
  }
  if (cambio) c.sucio = true;
  c.evt.pend = c.evt.pend.filter((p) => p.tipo !== 'incendio' || ((c.edif.get(p.id) || {}).fuego > 0));
}

function encender(c) {
  const cand = [];
  for (const b of c.edif.values()) {
    const it = ITEM[b.t];
    if (b.t === 'ayuntamiento' || b.fuego > 0) continue;
    if (it.tipo === 'zona' && b.n === 0) continue;
    if (it.serv === 'parque' || it.serv === 'deco') continue;
    cand.push(b);
  }
  if (!cand.length) return;
  const b = cand[Math.floor(azar(c) * cand.length)];
  b.fuego = 10; c.sucio = true;
  c.evt.pend.push({ tipo: 'incendio', id: b.id, x: b.cx, y: b.cy, vence: c.t.dia + 3 });
  notar(c, '¡Incendio en la ciudad!', 'mal', b.cx, b.cy);
  fx(c, { k: 'sonido', n: 'alerta' });
}

function cierreDia(c) {
  const s = c.s, rate = c.impuesto / 10, t = c.tech;
  const resTax = s.pop * 0.45 * rate * (0.55 + 0.45 * s.empleoRatio);
  const fC = limitar((0.3 * s.pop) / (s.empC * 0.8 + 1), 0.4, 1.3);
  const comTax = s.empC * 1.7 * rate * fC * (t.comercio ? 1.1 : 1);
  const indTax = s.empI * 1.3 * rate * (t.industria ? 1.1 : 1);
  let mult = 1 + (c.evt.festival > 0 ? 0.25 : 0) + (c.evt.boom > 0 && c.evt.boomTipo === 1 ? 0.35 : 0) + (s.felicidad - 50) / 250;
  mult = Math.max(0.5, mult);
  const ingreso = (resTax + comTax + indTax) * mult + s.bonoIng + s.bonoMon * (t.turismo ? 1.5 : 1);
  const gasto = c.mantEdif * (t.redes ? 0.9 : 1) + s.mantVias;
  c.ingresoDia = Math.round(ingreso); c.gastoDia = Math.round(gasto);
  c.neto = Math.round(ingreso - gasto);
  c.dinero += c.neto;
  c.hist.push(c.neto); if (c.hist.length > 14) c.hist.shift();
  const ay = c.edif.size ? [...c.edif.values()].find((b) => b.t === 'ayuntamiento') : null;
  if (ay) fx(c, { k: 'dinero', x: ay.cx, y: ay.cy, v: c.neto, dia: true });
  fx(c, { k: 'sonido', n: 'moneda' });
  if (s.bonoPuntos) { c.puntos += Math.floor(s.bonoPuntos); notar(c, '+' + Math.floor(s.bonoPuntos) + ' punto de mejora', 'ok'); }
  if (c.dinero < 0) notar(c, 'Estás en números rojos: baja gastos o sube impuestos', 'mal');

  // eventos aleatorios
  const pend = c.evt.pend;
  c.evt.pend = pend.filter((p) => p.vence > c.t.dia);
  const hayBomb = c.r && s.pop > 0 ? 1 : 0;
  let cubierto = 0, tot = 0;
  for (const b of c.edif.values()) if (b.t === 'zonaR' && b.n > 0) { tot++; if (c.r.bomb[Math.floor(b.cy - 0.01) * N + Math.floor(b.cx - 0.01)]) cubierto++; }
  const cobBomb = tot ? cubierto / tot : 0;
  if (s.pop >= 100 && hayBomb && azar(c) < 0.1 * (1 - 0.65 * cobBomb)) encender(c);
  if (s.pop >= 200 && c.evt.apagon <= 0 && azar(c) < (s.ratioE < 1.01 && s.demE > s.prodE * 0.9 ? 0.18 : 0.05)) {
    c.evt.apagon = 8;
    c.evt.pend.push({ tipo: 'apagon', vence: c.t.dia + 2 });
    c.cont.apagones++;
    notar(c, '¡Apagón! La red cayó al 30%', 'mal');
    fx(c, { k: 'sonido', n: 'alerta' });
  }
  if (s.pop >= 300 && c.evt.festival <= 0 && !c.evt.pend.some((p) => p.tipo === 'festival') && azar(c) < 0.1) {
    c.evt.pend.push({ tipo: 'festival', vence: c.t.dia + 2, costo: Math.round(300 + s.pop * 0.6) });
    notar(c, 'Los vecinos piden un festival', 'info');
  }
  if (s.pop >= 500 && c.evt.boom <= 0 && !c.evt.pend.some((p) => p.tipo === 'boom') && azar(c) < 0.06) {
    c.evt.pend.push({ tipo: 'boom', vence: c.t.dia + 2, costo: Math.round(500 + s.pop * 0.5) });
    notar(c, '¡Boom económico! Decide cómo aprovecharlo', 'ok');
    fx(c, { k: 'sonido', n: 'ok' });
  }
}

export function resolverEvento(c, i, op) {
  const p = c.evt.pend[i];
  if (!p) return { ok: false, razon: 'Ya pasó' };
  const quitar = () => { const k = c.evt.pend.indexOf(p); if (k >= 0) c.evt.pend.splice(k, 1); };
  if (op === 'ignorar') { quitar(); return { ok: true }; }
  if (p.tipo === 'incendio') {
    const b = c.edif.get(p.id), cs = 150;
    if (!b || b.fuego <= 0) { quitar(); return { ok: true }; }
    if (c.dinero < cs) return { ok: false, razon: 'Dinero insuficiente' };
    c.dinero -= cs; b.fuego = 0; c.cont.incendios++; c.sucio = true; quitar();
    darXp(c, 20); notar(c, 'Incendio sofocado con helicópteros', 'ok');
    fx(c, { k: 'sonido', n: 'ok' });
    return { ok: true, costo: cs };
  }
  if (p.tipo === 'apagon') {
    const cs = Math.round(200 + c.s.pop * 0.2);
    if (c.dinero < cs) return { ok: false, razon: 'Dinero insuficiente' };
    c.dinero -= cs; c.evt.apagon = 0; c.sucio = true; quitar();
    darXp(c, 20); notar(c, 'Red eléctrica reparada', 'ok'); fx(c, { k: 'sonido', n: 'ok' });
    return { ok: true, costo: cs };
  }
  if (p.tipo === 'festival') {
    if (c.dinero < p.costo) return { ok: false, razon: 'Dinero insuficiente' };
    c.dinero -= p.costo; c.evt.festival = 48; c.cont.festivales++; c.sucio = true; quitar();
    darXp(c, 40); notar(c, '¡Festival en marcha! Felicidad e ingresos suben', 'ok');
    fx(c, { k: 'festival' }); fx(c, { k: 'sonido', n: 'nivel' });
    return { ok: true, costo: p.costo };
  }
  if (p.tipo === 'boom') {
    if (op === 'impuestos') {
      c.evt.boom = 96; c.evt.boomTipo = 1; c.sucio = true; quitar();
      notar(c, 'Cobras más impuestos durante 4 días', 'ok'); fx(c, { k: 'sonido', n: 'moneda' });
      return { ok: true };
    }
    if (c.dinero < p.costo) return { ok: false, razon: 'Dinero insuficiente' };
    c.dinero -= p.costo; c.evt.boom = 120; c.evt.boomTipo = 2; c.puntos += 1; c.sucio = true; quitar();
    darXp(c, 40); notar(c, 'Inversión hecha: más demanda y +1 punto de mejora', 'ok'); fx(c, { k: 'sonido', n: 'nivel' });
    return { ok: true, costo: p.costo };
  }
  return { ok: false };
}

// ---------------------------------------------------------------- progreso
export function misionActual(c) { return c.misDone < MISIONES.length ? MISIONES[c.misDone] : null; }

export function chequearProgreso(c) {
  if (c.sucio || !c.s) recalcular(c);
  const t = tierPorPop(c.s.pop);
  while (c.tier < t) {
    c.tier++;
    const n = NIVELES[c.tier];
    const prem = Math.round(1000 * Math.pow(3, c.tier));
    c.dinero += prem; c.puntos += 3;
    const nuevos = Object.values(ITEM).filter((it) => it.nivel === c.tier && it.cat !== 'ninguna').map((it) => it.nombre);
    fx(c, { k: 'tier', v: c.tier, nombre: n.nombre, premio: prem, nuevos });
    notar(c, '¡Tu ciudad ahora es ' + n.nombre + '! +$' + prem + ' y 3 puntos de mejora', 'ok');
    darXp(c, 150 * c.tier);
    c.sucio = true;
  }
  let m;
  while ((m = misionActual(c)) && m.prog(c) >= m.meta) {
    c.misDone++;
    darPremio(c, m.rec);
    fx(c, { k: 'mision', titulo: m.titulo, rec: m.rec });
    notar(c, 'Objetivo cumplido: ' + m.titulo, 'ok');
    fx(c, { k: 'sonido', n: 'logro' });
  }
  for (const l of LOGROS) {
    if (c.logros[l.id]) continue;
    if (l.prog(c) >= l.meta) {
      c.logros[l.id] = c.t.dia;
      darPremio(c, l.rec);
      fx(c, { k: 'logro', nombre: l.nombre, rec: l.rec });
      notar(c, 'Logro: ' + l.nombre, 'ok');
      fx(c, { k: 'sonido', n: 'logro' });
    }
  }
}

function darPremio(c, r) {
  if (r.dinero) c.dinero += r.dinero;
  if (r.puntos) c.puntos += r.puntos;
  if (r.xp) darXp(c, r.xp);
}

export function investigar(c, id) {
  const t = TECH[id];
  if (!t) return { ok: false, razon: 'No existe' };
  if (c.tech[id]) return { ok: false, razon: 'Ya investigada' };
  for (const q of t.req) if (!c.tech[q]) return { ok: false, razon: 'Requiere ' + TECH[q].nombre };
  if (c.puntos < t.costo) return { ok: false, razon: 'Faltan puntos' };
  c.puntos -= t.costo; c.tech[id] = c.t.dia; c.sucio = true;
  darXp(c, 30 * t.costo);
  fx(c, { k: 'sonido', n: 'nivel' });
  notar(c, 'Investigado: ' + t.nombre, 'ok');
  chequearProgreso(c);
  return { ok: true };
}

export function diariaDisponible(c, ahora) { return ahora - c.diaria.ultimo >= 20 * 3600 * 1000; }
export function premioDiaria(c, ahora) {
  const racha = ahora - c.diaria.ultimo < 48 * 3600 * 1000 && c.diaria.racha > 0 ? c.diaria.racha + 1 : 1;
  const k = (racha - 1) % 7;
  return { racha, k, dinero: Math.round(DIARIA[k] * (1 + c.tier * 0.5)), puntos: k === 6 ? 3 : k === 3 ? 1 : 0 };
}
export function reclamarDiaria(c, ahora) {
  if (!diariaDisponible(c, ahora)) return null;
  const p = premioDiaria(c, ahora);
  c.diaria.ultimo = ahora; c.diaria.racha = p.racha;
  c.dinero += p.dinero; c.puntos += p.puntos;
  fx(c, { k: 'sonido', n: 'moneda' });
  return p;
}

export function calcOffline(c, ahora) {
  if (!c.ult) return null;
  const real = (ahora - c.ult) / 3600000;
  if (real < 0.1) return null;
  const tope = c.tech.offline ? 16 : 8, h = Math.min(real, tope);
  const base = c.hist.length ? c.hist.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, c.hist.length) : 0;
  const dinero = base > 0 ? Math.round(base * h * 4 * 0.6) : 0;
  c.dinero += dinero;
  c.ult = ahora;
  return { horas: h, real, dinero, tope: real > tope };
}

export function paso(c) {
  if (c.sucio || !c.s) recalcular(c);
  c.t.hora++;
  crecer(c);
  poblar(c);
  fuegos(c);
  if (c.evt.apagon > 0) c.evt.apagon--;
  if (c.evt.festival > 0) c.evt.festival--;
  if (c.evt.boom > 0) { c.evt.boom--; if (c.evt.boom === 0) c.evt.boomTipo = 0; }
  if (c.t.hora >= 24) {
    c.t.hora = 0; c.t.dia++;
    cierreDia(c);
  }
  recalcular(c);
  chequearProgreso(c);
  if (c.sucio) recalcular(c);
}

export function avanzar(c, horas) { for (let i = 0; i < horas; i++) paso(c); }
export { edifEn, idx };
