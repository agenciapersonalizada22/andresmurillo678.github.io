// Cobertura de servicios, conexión por carretera, estadísticas y demanda (se recalcula al haber cambios).
import { N } from './ciudad.js';
import { ITEM, ZONAS, NIVELES, ESPEC, ORD, costoOrd } from './datos.js';
import { factoresClima } from './clima.js';
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
    parq: mk(), trans: mk(), contam: mk(), valor: mk(), crim: mk(), ruido: mk(), def: mk(), dique: mk(), recic: mk(),
    flujo: new Float32Array(NN), padre: new Int32Array(NN), cola: new Int32Array(NN),
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
  for (const k of ['con', 'acc', 'cobE', 'cobA', 'bomb', 'poli', 'salud', 'edu', 'parq', 'trans', 'contam', 'crim', 'ruido', 'def', 'dique', 'recic']) r[k].fill(0);
  r.padre.fill(-1);
  const ord = c.ord || {}, fc = factoresClima(c), esp = ESPEC.find((e) => e.id === c.espec) || ESPEC[0];
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
  const cola = r.cola, padre = r.padre;
  let qh = 0, qt = 0;
  for (const i of pila) cola[qt++] = i;
  const vec = (i, j) => { if (c.via[j] && !r.con[j]) { r.con[j] = 1; padre[j] = i; cola[qt++] = j; } };
  while (qh < qt) {
    const i = cola[qh++]; viasConectadas++;
    const x = i % N, y = (i / N) | 0;
    if (x > 0) vec(i, i - 1);
    if (x < N - 1) vec(i, i + 1);
    if (y > 0) vec(i, i - N);
    if (y < N - 1) vec(i, i + N);
  }
  let avenidas = 0, capVia = 0, mantVias = 0, puentes = 0;
  for (let i = 0; i < NN; i++) {
    if (!c.via[i]) continue;
    capVia += c.via[i] === 2 ? 24 : 8;
    mantVias += c.via[i] === 2 ? 0.8 : 0.3;
    if (c.via[i] === 2) avenidas++;
    if (c.terr[i] === 1) { puentes++; mantVias += 1.2; }
    if (!r.con[i]) continue;
    const x = i % N, y = (i / N) | 0;
    for (let dy = -2; dy <= 2; dy++) {
      const yy = y + dy; if (yy < 0 || yy >= N) continue;
      const ax = 2 - Math.abs(dy);
      for (let dx = -ax; dx <= ax; dx++) { const xx = x + dx; if (xx >= 0 && xx < N) r.acc[yy * N + xx] = 1; }
    }
  }

  // 2) edificios: conexión, sellos de cobertura, producción
  let prodE = 0, prodA = 0, prodLimpia = 0, hoteles = 0, crudo = 0, tecnos = 0, puertos = 0, danados = 0, transitoPeso = 0, mantenimiento = 0, bonoIng = 0, bonoMon = 0, bonoFelic = 0, bonoPuntos = 0, bonoDemC = 0;
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
      if (b.t === 'zonaI' && b.n > 0) {
        sello(r.contam, b.cx, b.cy, 2 + b.n, ZONAS.I.cont[b.n] * 11 * (esp.contam || 1) * (ord.aire ? 0.55 : 1), true);
        sello(r.ruido, b.cx, b.cy, 3, 6 + b.n * 6, true);
      }
      if (b.dan) danados++;
      continue;
    }
    if (it.serv) tiposServ.add(it.serv);
    mantenimiento += it.mant * (1 + 0.3 * (b.n - 1 > 0 && it.mej ? b.n - 1 : 0));
    const rad = radioEf(b), serv = it.serv;
    if (b.dan) danados++;
    const activo = b.fuego <= 0 && !b.dan && (cn || serv === 'energia' || serv === 'agua' || serv === 'parque' || serv === 'deco' || serv === 'monumento' || serv === 'ayuntamiento');
    b.act = activo;
    if (!activo) continue;
    if (serv === 'energia') {
      const f = b.t === 'solar' ? fc.solar : b.t === 'eolica' ? fc.eolica : 1, p = it.prod * (1 + 0.4 * (b.n - 1)) * f;
      prodE += p; if (b.t === 'solar' || b.t === 'eolica') prodLimpia += p;
      sello(r.cobE, b.cx, b.cy, rad, 100); if (it.contam) sello(r.contam, b.cx, b.cy, 8, it.contam * 8 * (ord.reciclaje ? 0.75 : 1), true);
    }
    else if (serv === 'agua') { prodA += it.prod * (1 + 0.4 * (b.n - 1)) * fc.agua; sello(r.cobA, b.cx, b.cy, rad, 100); }
    else if (serv === 'defensa') sello(r.def, b.cx, b.cy, rad, 100);
    else if (serv === 'dique') sello(r.dique, b.cx, b.cy, rad, 100);
    else if (serv === 'reciclaje') { sello(r.recic, b.cx, b.cy, rad, 100); }
    else if (serv === 'turismo') hoteles += 1;
    else if (serv === 'puerto') { puertos++; sello(r.ruido, b.cx, b.cy, 8, 25, true); }
    else if (serv === 'produccion') {
      if (b.t === 'granja') crudo += 40; else if (b.t === 'mina') { crudo += 45; sello(r.contam, b.cx, b.cy, 6, it.contam * 8, true); sello(r.ruido, b.cx, b.cy, 6, 20, true); } else tecnos++;
    }
    else if (serv === 'bomberos') sello(r.bomb, b.cx, b.cy, rad, 100);
    else if (serv === 'policia') sello(r.poli, b.cx, b.cy, rad, 100);
    else if (serv === 'salud') sello(r.salud, b.cx, b.cy, rad, 100);
    else if (serv === 'educacion') sello(r.edu, b.cx, b.cy, rad, 100);
    else if (serv === 'transito') { sello(r.trans, b.cx, b.cy, rad, 100); transitoPeso += (b.t === 'metro' ? 0.1 : 0.03) * (1 + 0.25 * (b.n - 1)); }
    else if (serv === 'parque') sello(r.parq, b.cx, b.cy, rad, 100);
    else if (serv === 'deco') sello(r.parq, b.cx, b.cy, rad, 35);
    else if (serv === 'monumento') sello(r.parq, b.cx, b.cy, rad, 60);
    else if (serv === 'ayuntamiento') { sello(r.poli, b.cx, b.cy, rad, 40); bonoIng += 60 * b.n; }
    if (b.t === 'aeropuerto') sello(r.ruido, b.cx, b.cy, 10, 60, true);
    else if (b.t === 'estadio') sello(r.ruido, b.cx, b.cy, 8, 30, true);
    if (it.bono) {
      monumentos += serv === 'monumento' ? 1 : 0;
      bonoMon += it.bono.ingreso || 0; bonoFelic += it.bono.felic || 0; bonoPuntos += it.bono.puntos || 0; bonoDemC += it.bono.demC || 0;
    }
  }
  for (let i = 0; i < NN; i++) {
    if (r.recic[i]) r.contam[i] *= 1 - 0.5 * r.recic[i] / 100;
    if (r.contam[i] > 100) r.contam[i] = 100;
    if (r.ruido[i] > 100) r.ruido[i] = 100;
  }
  if (c.evt.apagon > 0) prodE *= 0.3;
  c.mantEdif = mantenimiento;

  // 3) consumo y estados
  let demE = 0, demA = 0;
  for (const b of c.edif.values()) {
    const it = ITEM[b.t];
    const ci = Math.min(NN - 1, Math.floor(b.cy) * N + Math.floor(b.cx));
    let cE = it.consE, cA = it.consA;
    if (it.tipo === 'zona') { cE = ZONAS[it.zona].cE[b.n]; cA = ZONAS[it.zona].cA[b.n]; }
    cE *= (ord.ahorroE ? 0.85 : 1) * fc.demE; cA *= (ord.ahorroA ? 0.85 : 1) * fc.demA;
    b.cE = cE; b.cA = cA;
    b.cobE = r.cobE[Math.floor(b.cy - 0.01) * N + Math.floor(b.cx - 0.01)] > 0 || r.cobE[ci] > 0;
    b.cobA = r.cobA[Math.floor(b.cy - 0.01) * N + Math.floor(b.cx - 0.01)] > 0 || r.cobA[ci] > 0;
    if (b.cobE) demE += cE;
    if (b.cobA) demA += cA;
  }
  const comOk = c.modo === 'sandbox' || !!c.tech.comext, com = c.com || {};
  const prodE0 = prodE;
  let impE = 0, impA = 0, ventaE = 0;
  if (comOk && com.impE && demE > prodE) { impE = Math.min(demE - prodE, demE * 0.5 + 10); prodE += impE; }
  else if (comOk && com.venE && prodE > demE * 1.05) ventaE = prodE - demE;
  if (comOk && com.impA && demA > prodA) { impA = Math.min(demA - prodA, demA * 0.5 + 10); prodA += impA; }
  const ratioE = demE > 0 ? limitar(prodE / demE, 0, 1) : 1;
  const ratioA = demA > 0 ? limitar(prodA / demA, 0, 1) : 1;

  // 4) estadísticas por edificio
  const s = {
    pop: 0, empR: 0, empC: 0, empI: 0, empS: 0, lotes: { R: 0, C: 0, I: 0 }, vacios: { R: 0, C: 0, I: 0 },
    cuenta, edificios: 0, nivel4: 0, monumentos, tiposServ: tiposServ.size, viasConectadas, avenidas,
    parcelas: 0, capR: 0, ratioE, ratioA, prodE, prodA, demE, demA, bonoIng, bonoMon, mantVias, bonoPuntos, bonoFelic, cons: 0, contamRes: 0,
    puentes, danados, hoteles, impE, impA, ventaE, limpia: prodE0 > 0 ? prodLimpia / prodE0 : 0, clima: c.clima.tipo,
  };
  for (let i = 0; i < c.parc.length; i++) s.parcelas += c.parc[i] ? 1 : 0;
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

  // 5) tráfico por calle: cada edificio envía viajes hacia el Ayuntamiento por la red
  const flujo = r.flujo; flujo.fill(0);
  const kT = (1 - Math.min(0.5, transitoPeso)) * (ord.transpGratis ? 0.8 : 1) * fc.trafico * 0.06;
  let viajes = 0;
  for (const b of c.edif.values()) {
    const it = ITEM[b.t];
    if (!b.cn || b.fuego > 0) continue;
    let trips = 0;
    if (it.tipo === 'zona') { if (b.n < 1) continue; trips = it.zona === 'R' ? b.pop * 0.35 : ZONAS[it.zona].cap[b.n] * 0.25; } else trips = it.trabajos * 0.2;
    if (trips < 0.5) continue;
    viajes += trips;
    let i0 = -1;
    for (let k = -1; k <= it.w && i0 < 0; k++) for (const [xx, yy] of [[b.x + k, b.y - 1], [b.x + k, b.y + it.h], [b.x - 1, b.y + k], [b.x + it.w, b.y + k]]) {
      if (xx >= 0 && yy >= 0 && xx < N && yy < N && r.con[yy * N + xx]) { i0 = yy * N + xx; break; }
    }
    if (i0 < 0) continue;
    const ci0 = Math.floor(b.cy - 0.01) * N + Math.floor(b.cx - 0.01);
    const f = trips * kT * (1 - 0.3 * r.trans[ci0] / 100);
    for (let i = i0, pasos = 0; i >= 0 && pasos < 40; i = padre[i], pasos++) flujo[i] += f;
  }
  let nFl = 0, sumQ = 0, nCong = 0;
  for (let i = 0; i < NN; i++) {
    if (!r.con[i] || flujo[i] <= 0) continue;
    const q = flujo[i] / (c.via[i] === 2 ? 18 : 6);
    nFl++; sumQ += q > 2 ? 2 : q; if (q > 1) nCong++;
    if (q > 0.5) { const x = i % N, y = (i / N) | 0; sello(r.ruido, x + 0.5, y + 0.5, 1.5, Math.min(30, q * 12), true); }
  }
  s.cong = nFl ? limitar(0.6 * sumQ / nFl + 0.8 * nCong / nFl, 0, 1.5) : 0;
  s.viasCong = nCong;
  s.viajes = viajes;

  // 5b) crimen, ruido, salud, educación
  let crimW = 0, ruiW = 0;
  for (const b of c.edif.values()) {
    if (b.t !== 'zonaR' || b.n < 1) continue;
    const ci = Math.floor(b.cy - 0.01) * N + Math.floor(b.cx - 0.01);
    let cr = 8 + 35 * (1 - s.empleoRatio) + 4 * b.n + (r.valor[ci] < 40 ? 10 : 0) - 55 * r.poli[ci] / 100;
    cr *= ord.patrullas ? 0.7 : 1;
    cr = limitar(cr, 0, 100); b.crim = cr;
    crimW += cr * b.pop; ruiW += Math.min(100, r.ruido[ci]) * b.pop;
    sello(r.crim, b.cx, b.cy, 3, cr);
  }
  s.contamRes = popW ? contW / popW : 0;
  s.crimen = popW ? crimW / popW : 0;
  s.ruidoRes = popW ? ruiW / popW : 0;
  s.salud = Math.round(limitar(100 - s.contamRes * 0.8 - (1 - s.cob.salud) * 30 - (1 - ratioA) * 25 - s.ruidoRes * 0.1 - (s.pop > 0 ? 0 : 0), 0, 100));
  s.edu = s.cob.edu;
  s.crudo = crudo;
  const eduOk = s.cob.edu >= 0.4;
  const mult = c.espec === 'tecnologia' && !eduOk ? 1.2 : esp.mult;
  s.bienes = Math.min(crudo + s.empI * 0.25, s.empI * 1.1) * (1 + tecnos * 0.2) + (c.espec === 'tecnologia' ? tecnos * 40 : 0);
  s.expCap = 80 + 500 * puertos + 300 * (cuenta.aeropuerto || 0);
  s.exporta = comOk && com.exp ? Math.min(s.bienes * 1.2, s.expCap) : 0;
  s.precio = mult;
  s.ingExport = Math.round(s.exporta * mult * 1.6 * (c.espec === 'agricultura' && cuenta.granja ? 1 + Math.min(1, cuenta.granja * 0.25) : 1));
  s.costoImp = Math.round(impE * 1.4 + impA * 1.2);
  s.ingVenta = Math.round(ventaE * 0.6);

  // 6) valor del suelo
  for (let i = 0; i < NN; i++) {
    let v = 40 + (r.cercaAgua[i] ? 10 : 0) - r.ruido[i] * 0.25 + r.parq[i] * 0.2 + r.salud[i] * 0.08 + r.poli[i] * 0.08 + r.edu[i] * 0.08 + r.bomb[i] * 0.05 - Math.min(100, r.contam[i]) * 0.4;
    r.valor[i] = v < 0 ? 0 : v > 100 ? 100 : v;
  }

  // 7) felicidad
  const fr = (x) => (popW ? x / popW : 0);
  let fel = 50 + 6 * fr(fFire) + 8 * fr(fPol) + 8 * fr(fSal) + 5 * fr(fEdu) + 8 * fr(fPark);
  if (s.pop > 0) fel -= (1 - s.empleoRatio) * 25;
  fel += (10 - (c.imp.R * 0.5 + c.imp.C * 0.25 + c.imp.I * 0.25)) * 1.6;
  s.contamRes = popW ? contW / popW : 0;
  fel -= s.contamRes * 0.25;
  fel -= Math.min(1, s.cong) * 12;
  fel -= (s.crimen || 0) * 0.18 + (s.ruidoRes || 0) * 0.12 + (s.salud != null ? (s.salud - 70) * 0.08 : 0);
  if (ord.transpGratis) fel += 2;
  fel -= (1 - ratioE) * 20 + (1 - ratioA) * 20;
  if (c.evt.festival > 0) fel += 12;
  if (c.evt.boom > 0 && c.evt.boomTipo === 1) fel -= 8;
  if (c.dinero < 0) fel -= 8;
  if (c.evt.epidemia > 0) fel -= 10;
  fel += bonoFelic;
  s.felicidad = Math.round(limitar(fel, 0, 100));
  s.turismo = (hoteles * 50 + bonoMon / 20 + (cuenta.estadio ? 60 : 0) + s.cob.parq * 40 + (s.felicidad > 60 ? 20 : 0)) * (1 + (ord.turismoPromo ? 0.4 : 0)) * (c.espec === 'turismo' ? 1.5 : 1);
  s.ingTurismo = s.turismo * 2.2 * (c.espec === 'turismo' ? 2 : 1);


  // 8) demanda R/C/I
  const emp = s.empleos;
  const lim = (v) => limitar(v, -1, 1);
  const vac = (v, l) => Math.max(0, v / (l + 4) - 0.3) * 1.2;
  let dR = lim((emp + 18 - trab) / (emp + trab + 36) * 1.7) + (s.felicidad - 50) / 100 - (c.imp.R - 10) * 0.02;
  dR -= vac(s.vacios.R, s.lotes.R);
  dR -= (s.capR - s.pop) > 0.35 * s.capR && s.capR > 30 ? 0.3 : 0;
  let dC = lim((0.32 * s.pop + 6 - s.empC) / (0.32 * s.pop + s.empC + 14) * 1.8) + bonoDemC - vac(s.vacios.C, s.lotes.C) - (c.imp.C - 10) * 0.02;
  let dI = lim((0.3 * s.pop + 5 - s.empI) / (0.3 * s.pop + s.empI + 14) * 1.8) - vac(s.vacios.I, s.lotes.I) - (c.imp.I - 10) * 0.02;
  if (c.evt.boom > 0 && c.evt.boomTipo === 2) { dR += 0.3; dC += 0.3; dI += 0.3; }
  c.dem = { R: limitar(dR, -1, 1), C: limitar(dC, -1, 1), I: limitar(dI, -1, 1) };

  c.costoOrd = 0;
  for (const id in ord) if (ord[id] && ORD[id]) c.costoOrd += costoOrd(ORD[id], s.pop);
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
