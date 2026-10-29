// Cobertura de servicios, conexión por carretera, estadísticas y demanda (se recalcula al haber cambios).
import { N } from './ciudad.js';
import { ITEM, ZONAS, NIVELES } from './datos.js';
import { limitar, hash2 } from './util.js';
import { ayuntamiento } from './ciudad.js';

const NN = N * N;

function crearR(c) {
  const cercaAgua = new Uint8Array(NN);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let a = 0;
    for (let dy = -3; dy <= 3 && !a; dy++) for (let dx = -3; dx <= 3; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < N && yy < N && c.terr[yy * N + xx] === 1) { a = 1; break; }
    }
    cercaAgua[y * N + x] = a;
  }
  const mk = () => new Uint8Array(NN);
  return {
    cercaAgua, con: mk(), acc: mk(), cobE: mk(), cobA: mk(), bomb: mk(), poli: mk(), salud: mk(), edu: mk(),
    parq: mk(), trans: mk(), contam: mk(), valor: mk(),
  };
}

function sello(arr, cx, cy, radio, fuerza, suma) {
  const r = Math.ceil(radio), r2 = radio * radio;
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(N - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(N - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy, dy2 = dy * dy;
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx, d2 = dx * dx + dy2;
      if (d2 > r2) continue;
      const v = fuerza * (1 - 0.45 * d2 / r2), i = y * N + x;
      if (suma) { const t = arr[i] + v; arr[i] = t > 255 ? 255 : t; } else if (v > arr[i]) arr[i] = v;
    }
  }
}

export function radioEf(b) {
  const it = ITEM[b.t];
  return it.radio * (it.mej ? 1 + 0.2 * (b.n - 1) : 1);
}
export function prodEf(b) { return ITEM[b.t].prod; }

export function recalcular(c) {
  const r = c.r || (c.r = crearR(c));
  for (const k of ['con', 'acc', 'cobE', 'cobA', 'bomb', 'poli', 'salud', 'edu', 'parq', 'trans', 'contam']) r[k].fill(0);
  const ay = ayuntamiento(c);

  // 1) calles conectadas al ayuntamiento
  const pila = [];
  if (ay) {
    const it = ITEM[ay.t];
    for (let y = ay.y - 1; y <= ay.y + it.h; y++) for (let x = ay.x - 1; x <= ay.x + it.w; x++) {
      const dentroX = x >= ay.x && x < ay.x + it.w, dentroY = y >= ay.y && y < ay.y + it.h;
      if (dentroX === dentroY) continue; // solo bordes ortogonales
      if (x < 0 || y < 0 || x >= N || y >= N) continue;
      const i = y * N + x;
      if (c.via[i] && !r.con[i]) { r.con[i] = 1; pila.push(i); }
    }
  }
  let viasConectadas = 0;
  while (pila.length) {
    const i = pila.pop(); viasConectadas++;
    const x = i % N, y = (i / N) | 0;
    if (x > 0 && c.via[i - 1] && !r.con[i - 1]) { r.con[i - 1] = 1; pila.push(i - 1); }
    if (x < N - 1 && c.via[i + 1] && !r.con[i + 1]) { r.con[i + 1] = 1; pila.push(i + 1); }
    if (y > 0 && c.via[i - N] && !r.con[i - N]) { r.con[i - N] = 1; pila.push(i - N); }
    if (y < N - 1 && c.via[i + N] && !r.con[i + N]) { r.con[i + N] = 1; pila.push(i + N); }
  }
  let avenidas = 0, capVia = 0, mantVias = 0;
  for (let i = 0; i < NN; i++) {
    if (!c.via[i]) continue;
    capVia += c.via[i] === 2 ? 24 : 8;
    mantVias += c.via[i] === 2 ? 0.8 : 0.3;
    if (c.via[i] === 2) avenidas++;
    if (!r.con[i]) continue;
    const x = i % N, y = (i / N) | 0;
    for (let dy = -2; dy <= 2; dy++) {
      const yy = y + dy; if (yy < 0 || yy >= N) continue;
      const ax = 2 - Math.abs(dy);
      for (let dx = -ax; dx <= ax; dx++) { const xx = x + dx; if (xx >= 0 && xx < N) r.acc[yy * N + xx] = 1; }
    }
  }

  // 2) edificios: conexión, sellos de cobertura, producción
  let prodE = 0, prodA = 0, transitoPeso = 0, mantenimiento = 0, bonoIng = 0, bonoMon = 0, bonoFelic = 0, bonoPuntos = 0, bonoDemC = 0;
  const cuenta = {}, tiposServ = new Set();
  let monumentos = 0;
  for (const b of c.edif.values()) {
    const it = ITEM[b.t];
    cuenta[b.t] = (cuenta[b.t] || 0) + (it.tipo === 'zona' && b.n === 0 ? 0 : 1);
    let cn = false;
    for (let yy = b.y; yy < b.y + it.h && !cn; yy++) for (let xx = b.x; xx < b.x + it.w; xx++) if (r.acc[yy * N + xx]) { cn = true; break; }
    b.cn = cn;
    b.cx = b.x + it.w / 2; b.cy = b.y + it.h / 2;
    if (it.tipo === 'zona') {
      if (b.t === 'zonaI' && b.n > 0) sello(r.contam, b.cx, b.cy, 2 + b.n, ZONAS.I.cont[b.n] * 11, true);
      continue;
    }
    if (it.serv) tiposServ.add(it.serv);
    mantenimiento += it.mant * (1 + 0.3 * (b.n - 1 > 0 && it.mej ? b.n - 1 : 0));
    const rad = radioEf(b), serv = it.serv;
    const activo = b.fuego <= 0 && (cn || serv === 'energia' || serv === 'agua' || serv === 'parque' || serv === 'deco' || serv === 'monumento' || serv === 'ayuntamiento');
    b.act = activo;
    if (!activo) continue;
    if (serv === 'energia') { prodE += it.prod * (1 + 0.4 * (b.n - 1)); sello(r.cobE, b.cx, b.cy, rad, 100); if (it.contam) sello(r.contam, b.cx, b.cy, 8, it.contam * 8, true); }
    else if (serv === 'agua') { prodA += it.prod * (1 + 0.4 * (b.n - 1)); sello(r.cobA, b.cx, b.cy, rad, 100); }
    else if (serv === 'bomberos') sello(r.bomb, b.cx, b.cy, rad, 100);
    else if (serv === 'policia') sello(r.poli, b.cx, b.cy, rad, 100);
    else if (serv === 'salud') sello(r.salud, b.cx, b.cy, rad, 100);
    else if (serv === 'educacion') sello(r.edu, b.cx, b.cy, rad, 100);
    else if (serv === 'transito') { sello(r.trans, b.cx, b.cy, rad, 100); transitoPeso += (b.t === 'metro' ? 0.1 : 0.03) * (1 + 0.25 * (b.n - 1)); }
    else if (serv === 'parque') sello(r.parq, b.cx, b.cy, rad, 100);
    else if (serv === 'deco') sello(r.parq, b.cx, b.cy, rad, 35);
    else if (serv === 'monumento') sello(r.parq, b.cx, b.cy, rad, 60);
    else if (serv === 'ayuntamiento') { sello(r.poli, b.cx, b.cy, rad, 40); bonoIng += 60 * b.n; }
    if (it.bono) {
      monumentos += serv === 'monumento' ? 1 : 0;
      bonoMon += it.bono.ingreso || 0; bonoFelic += it.bono.felic || 0; bonoPuntos += it.bono.puntos || 0; bonoDemC += it.bono.demC || 0;
    }
  }
  for (let i = 0; i < NN; i++) if (r.contam[i] > 100) r.contam[i] = 100;
  if (c.evt.apagon > 0) prodE *= 0.3;
  c.mantEdif = mantenimiento;

  // 3) consumo y estados
  let demE = 0, demA = 0;
  for (const b of c.edif.values()) {
    const it = ITEM[b.t];
    const ci = Math.min(NN - 1, Math.floor(b.cy) * N + Math.floor(b.cx));
    let cE = it.consE, cA = it.consA;
    if (it.tipo === 'zona') { cE = ZONAS[it.zona].cE[b.n]; cA = ZONAS[it.zona].cA[b.n]; }
    b.cE = cE; b.cA = cA;
    b.cobE = r.cobE[Math.floor(b.cy - 0.01) * N + Math.floor(b.cx - 0.01)] > 0 || r.cobE[ci] > 0;
    b.cobA = r.cobA[Math.floor(b.cy - 0.01) * N + Math.floor(b.cx - 0.01)] > 0 || r.cobA[ci] > 0;
    if (b.cobE) demE += cE;
    if (b.cobA) demA += cA;
  }
  const ratioE = demE > 0 ? limitar(prodE / demE, 0, 1) : 1;
  const ratioA = demA > 0 ? limitar(prodA / demA, 0, 1) : 1;

  // 4) estadísticas por edificio
  const s = {
    pop: 0, empR: 0, empC: 0, empI: 0, empS: 0, lotes: { R: 0, C: 0, I: 0 }, vacios: { R: 0, C: 0, I: 0 },
    cuenta, edificios: 0, nivel4: 0, monumentos, tiposServ: tiposServ.size, viasConectadas, avenidas,
    parcelas: 0, capR: 0, ratioE, ratioA, prodE, prodA, demE, demA, bonoIng, bonoMon, mantVias, bonoPuntos, bonoFelic, cons: 0, contamRes: 0,
  };
  for (let i = 0; i < c.parc.length; i++) s.parcelas += c.parc[i];
  let fFire = 0, fPol = 0, fSal = 0, fEdu = 0, fPark = 0, popW = 0, contW = 0;
  for (const b of c.edif.values()) {
    const it = ITEM[b.t];
    const ci = Math.floor(b.cy - 0.01) * N + Math.floor(b.cx - 0.01);
    if (it.tipo === 'zona') {
      s.lotes[it.zona]++;
      if (b.n === 0) { s.vacios[it.zona]++; b.sE = !b.cobE; b.sA = !b.cobA; b.sV = !b.cn; continue; }
      s.edificios++;
      if (b.n === 4) s.nivel4++;
      const falta = !b.cn || !b.cobE || !b.cobA || (ratioE < 1 && hash2(b.id, 7, 3) >= ratioE) || (ratioA < 1 && hash2(b.id, 9, 5) >= ratioA);
      b.sE = !b.cobE || (ratioE < 1 && hash2(b.id, 7, 3) >= ratioE);
      b.sA = !b.cobA || (ratioA < 1 && hash2(b.id, 9, 5) >= ratioA);
      b.sV = !b.cn;
      b.falta = falta;
      const cap = ZONAS[it.zona].cap[b.n];
      if (it.zona === 'R') {
        s.pop += b.pop; s.capR += cap;
        popW += b.pop;
        if (r.bomb[ci]) fFire += b.pop; if (r.poli[ci]) fPol += b.pop; if (r.salud[ci]) fSal += b.pop;
        if (r.edu[ci]) fEdu += b.pop; if (r.parq[ci] > 20) fPark += b.pop;
        contW += r.contam[ci] * b.pop;
      } else {
        const f = falta ? 0.35 : 1;
        if (it.zona === 'C') s.empC += cap * f; else s.empI += cap * f;
      }
    } else {
      if (b.t !== 'ayuntamiento') s.edificios++;
      s.empS += it.trabajos * (b.act ? 1 : 0.3);
      b.sE = it.consE > 0 && (!b.cobE || (ratioE < 1 && hash2(b.id, 7, 3) >= ratioE));
      b.sA = it.consA > 0 && (!b.cobA || (ratioA < 1 && hash2(b.id, 9, 5) >= ratioA));
      b.sV = !b.act && !b.cn && !['energia', 'agua', 'parque', 'deco', 'monumento', 'ayuntamiento'].includes(it.serv);
      b.falta = b.sV;
    }
  }
  const trab = s.pop * 0.5;
  s.trab = trab;
  s.empleos = s.empC + s.empI + s.empS;
  s.empleoRatio = trab > 0 ? Math.min(1, s.empleos / trab) : 1;
  s.parqFrac = popW ? fPark / popW : 0;
  s.cob = { bomb: popW ? fFire / popW : 0, poli: popW ? fPol / popW : 0, salud: popW ? fSal / popW : 0, edu: popW ? fEdu / popW : 0, parq: s.parqFrac };

  // 5) tráfico
  const viajes = (s.pop * 0.35 + (s.empC + s.empI) * 0.25) * (1 - Math.min(0.5, transitoPeso));
  s.cong = viajes / (capVia + 10);
  s.viajes = viajes;

  // 6) valor del suelo
  for (let i = 0; i < NN; i++) {
    let v = 40 + (r.cercaAgua[i] ? 10 : 0) + r.parq[i] * 0.2 + r.salud[i] * 0.08 + r.poli[i] * 0.08 + r.edu[i] * 0.08 + r.bomb[i] * 0.05 - Math.min(100, r.contam[i]) * 0.4;
    r.valor[i] = v < 0 ? 0 : v > 100 ? 100 : v;
  }

  // 7) felicidad
  const fr = (x) => (popW ? x / popW : 0);
  let fel = 50 + 6 * fr(fFire) + 8 * fr(fPol) + 8 * fr(fSal) + 5 * fr(fEdu) + 8 * fr(fPark);
  if (s.pop > 0) fel -= (1 - s.empleoRatio) * 25;
  fel += (10 - c.impuesto) * 1.6;
  s.contamRes = popW ? contW / popW : 0;
  fel -= s.contamRes * 0.25;
  fel -= Math.min(1, s.cong) * 12;
  fel -= (1 - ratioE) * 20 + (1 - ratioA) * 20;
  if (c.evt.festival > 0) fel += 12;
  if (c.evt.boom > 0 && c.evt.boomTipo === 1) fel -= 8;
  if (c.dinero < 0) fel -= 8;
  fel += bonoFelic;
  s.felicidad = Math.round(limitar(fel, 0, 100));

  // 8) demanda R/C/I
  const emp = s.empleos;
  const lim = (v) => limitar(v, -1, 1);
  const vac = (v, l) => Math.max(0, v / (l + 4) - 0.3) * 1.2;
  let dR = lim((emp + 18 - trab) / (emp + trab + 36) * 1.7) + (s.felicidad - 50) / 100 - (c.impuesto - 10) * 0.02;
  dR -= vac(s.vacios.R, s.lotes.R);
  dR -= (s.capR - s.pop) > 0.35 * s.capR && s.capR > 30 ? 0.3 : 0;
  let dC = lim((0.32 * s.pop + 6 - s.empC) / (0.32 * s.pop + s.empC + 14) * 1.8) + bonoDemC - vac(s.vacios.C, s.lotes.C);
  let dI = lim((0.3 * s.pop + 5 - s.empI) / (0.3 * s.pop + s.empI + 14) * 1.8) - vac(s.vacios.I, s.lotes.I);
  if (c.evt.boom > 0 && c.evt.boomTipo === 2) { dR += 0.3; dC += 0.3; dI += 0.3; }
  c.dem = { R: limitar(dR, -1, 1), C: limitar(dC, -1, 1), I: limitar(dI, -1, 1) };

  s.neto = c.neto;
  s.tier = c.tier;
  c.s = s;
  c.rVer = (c.rVer || 0) + 1;
  c.sucio = false;
  return c;
}

export function tierPorPop(pop) {
  let t = 0;
  for (const n of NIVELES) if (pop >= n.pop) t = n.id;
  return t;
}
