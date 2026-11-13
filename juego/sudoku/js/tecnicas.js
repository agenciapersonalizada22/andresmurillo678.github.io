// Solucionador logico por tecnicas humanas, con explicaciones en espanol. Sirve para clasificar, dar pistas y resolver paso a paso.
import { nombreCelda } from './variantes.js';
import { pop, bits, jaulaInfo, unaSolucion } from './solver.js';

export const PESO = { unico_desnudo: 1, unico_oculto_region: 2, unico_oculto: 3, jaula: 4, bloqueo: 8, par_desnudo: 10, par_oculto: 14, trio_desnudo: 16, suma_unidad: 20, trio_oculto: 22, x_wing: 30, xy_wing: 32, swordfish: 45, prueba: 100 };
export const NOMBRE_TEC = {
  unico_desnudo: 'Único posible', unico_oculto_region: 'Único oculto en caja', unico_oculto: 'Único oculto', jaula: 'Combinaciones de jaula', suma_unidad: 'Suma de la unidad',
  bloqueo: 'Candidatos bloqueados', par_desnudo: 'Pareja desnuda', trio_desnudo: 'Trío desnudo', par_oculto: 'Pareja oculta', trio_oculto: 'Trío oculto',
  x_wing: 'X-Wing', xy_wing: 'XY-Wing', swordfish: 'Swordfish', prueba: 'Prueba y error'
};
const NIVEL = { unico_desnudo: 0, unico_oculto_region: 0, unico_oculto: 1, jaula: 1, bloqueo: 2, par_desnudo: 2, par_oculto: 3, trio_desnudo: 3, trio_oculto: 3, suma_unidad: 3, x_wing: 4, xy_wing: 4, swordfish: 5, prueba: 5 };

export function crearSt(M, dados, sol) {
  const st = { M, v: new Uint8Array(M.N), c: new Uint16Array(M.N).fill(M.todo), dados, sol: sol || null };
  for (let i = 0; i < M.N; i++) if (dados[i]) colocar(st, i, dados[i]);
  return st;
}
export function colocar(st, i, d) {
  const b = 1 << (d - 1);
  st.v[i] = d; st.c[i] = b;
  const p = st.M.pares[i];
  for (let t = 0; t < p.length; t++) st.c[p[t]] &= ~b;
}
export function aplicar(st, p) {
  if (p.col) p.col.forEach((x) => colocar(st, x.i, x.d));
  if (p.eli) p.eli.forEach((x) => { st.c[x.i] &= ~x.m; });
}
export const resuelto = (st) => st.v.every((x) => x > 0);
export const contradiccion = (st) => { for (let i = 0; i < st.M.N; i++) if (st.v[i] === 0 && st.c[i] === 0) return true; return false; };

const mk = (tec, o) => Object.assign({ tec, nivel: NIVEL[tec], peso: PESO[tec], titulo: NOMBRE_TEC[tec] }, o);
const cel = (M, i) => nombreCelda(M, i);
const lista = (M, a) => a.map((i) => cel(M, i)).join(', ');
const listaD = (m) => bits(m).join(', ');
function subconj(arr, k, fn) {
  const sel = [];
  const rec = (ini) => {
    if (sel.length === k) return fn(sel.slice());
    for (let i = ini; i < arr.length; i++) { sel.push(arr[i]); if (rec(i + 1)) return true; sel.pop(); }
    return false;
  };
  return rec(0);
}

function unicoDesnudo(st) {
  const { M, v, c } = st;
  for (let i = 0; i < M.N; i++) {
    if (v[i] === 0 && pop(c[i]) === 1) {
      const d = bits(c[i])[0];
      return mk('unico_desnudo', { col: [{ i, d }], celdas: [i], digito: d,
        pista1: 'Hay una celda en la que solo cabe un número. Mira las celdas con muchos números a su alrededor.',
        pista2: `Fíjate en ${cel(M, i)}: todos los demás números ya aparecen en su fila, columna o zona.`,
        texto: `En ${cel(M, i)} solo cabe el ${d}: los demás números ya aparecen entre las celdas que ve (fila, columna, caja u otras zonas).` });
    }
  }
  return null;
}

function unicoOculto(st, soloRegion) {
  const { M, v, c } = st;
  for (const u of M.unidades) {
    if (soloRegion ? u.tipo !== 'region' : u.tipo === 'region') continue;
    for (let d = 1; d <= M.n; d++) {
      const b = 1 << (d - 1);
      let pos = -1, n = 0, puesto = false;
      for (const i of u.celdas) { if (v[i] === d) { puesto = true; break; } if (v[i] === 0 && (c[i] & b)) { n++; pos = i; } }
      if (!puesto && n === 1) {
        return mk(soloRegion ? 'unico_oculto_region' : 'unico_oculto', { col: [{ i: pos, d }], celdas: [pos], area: u.celdas.slice(), digito: d,
          pista1: `Mira la ${u.nombre}: hay un número que solo tiene un lugar posible.`,
          pista2: `En la ${u.nombre} busca dónde puede ir el ${d}.`,
          texto: `En la ${u.nombre}, el ${d} solo puede ir en ${cel(M, pos)}: en el resto de sus celdas ya no cabe.` });
      }
    }
  }
  return null;
}

function jaulas(st) {
  const { M, v, c } = st;
  for (let k = 0; k < M.jaulas.length; k++) {
    const J = M.jaulas[k], info = jaulaInfo(M, c, J.celdas, J.suma);
    if (!info) continue;
    const eli = [];
    J.celdas.forEach((i, t) => { if (v[i] === 0) { const q = c[i] & ~info.nm[t]; if (q) eli.push({ i, m: q }); } });
    if (eli.length) {
      const combos = info.factibles.slice(0, 6).map((m) => bits(m).join('+')).join(' · ');
      return mk('jaula', { eli, celdas: J.celdas.slice(), area: J.celdas.slice(),
        pista1: 'Mira una jaula: su suma limita qué números pueden formarla.',
        pista2: `La jaula de suma ${J.suma} (${J.celdas.length} celdas) solo se puede formar con: ${combos}.`,
        texto: `La jaula de suma ${J.suma} con ${J.celdas.length} celdas solo admite las combinaciones ${combos}${info.factibles.length > 6 ? '…' : ''}. Se descartan los números que no encajan en ninguna.` });
    }
  }
  return null;
}

/* Innies/outies: la suma de una unidad completa (45) frente a las jaulas que la cubren. */
function sumaUnidad(st) {
  const { M, v, c } = st;
  if (!M.jaulas.length) return null;
  const total = (M.n * (M.n + 1)) / 2;
  for (const u of M.unidades) {
    if (u.tipo === 'extra') continue;
    const dentro = new Set(u.celdas);
    let sumaDentro = 0, cubiertas = new Set(), fuera = new Set(), enteras = new Set();
    M.jaulas.forEach((J, k) => {
      const n = J.celdas.filter((i) => dentro.has(i)).length;
      if (n === 0) return;
      cubiertas.add(k);
      if (n === J.celdas.length) { enteras.add(k); sumaDentro += J.suma; } else J.celdas.forEach((i) => { if (!dentro.has(i)) fuera.add(i); });
    });
    const intentos = [];
    const resto = u.celdas.filter((i) => !enteras.size || !M.jaulas.some((J, k) => enteras.has(k) && J.celdas.includes(i)));
    if (enteras.size && resto.length >= 1 && resto.length <= 3) intentos.push({ celdas: resto, suma: total - sumaDentro, txt: `Las jaulas completas dentro de la ${u.nombre} suman ${sumaDentro} y la ${u.nombre} suma ${total}: las celdas restantes suman ${total - sumaDentro}.` });
    if (fuera.size >= 1 && fuera.size <= 3) {
      let sc = 0; cubiertas.forEach((k) => { sc += M.jaulas[k].suma; });
      const f = Array.from(fuera);
      if (M.unidades.some((w) => f.every((i) => w.celdas.includes(i)))) intentos.push({ celdas: f, suma: sc - total, txt: `Las jaulas que tocan la ${u.nombre} suman ${sc}, ${sc - total} más que la ${u.nombre}: las celdas que sobresalen suman ${sc - total}.` });
    }
    for (const it of intentos) {
      if (it.suma < 1) continue;
      const info = jaulaInfo(M, c, it.celdas, it.suma);
      if (!info) continue;
      const eli = [], col = [];
      it.celdas.forEach((i, t) => { if (v[i] === 0) { const q = c[i] & ~info.nm[t]; if (q) eli.push({ i, m: q }); } });
      if (eli.length) {
        return mk('suma_unidad', { eli, celdas: it.celdas.slice(), area: u.celdas.slice(),
          pista1: 'Compara la suma total de una fila, columna o caja con las jaulas que la cubren.',
          pista2: `Mira la ${u.nombre} y las jaulas que la cubren.`,
          texto: it.txt + ` ${it.celdas.length === 1 ? 'Ese valor' : 'Esa suma'} limita los candidatos de ${lista(M, it.celdas)}.` });
      }
    }
  }
  return null;
}

function bloqueos(st) {
  const { M, v, c } = st;
  for (const { a, b, celdas } of M.inter) {
    const A = M.unidades[a], B = M.unidades[b];
    for (let d = 1; d <= M.n; d++) {
      const bt = 1 << (d - 1);
      let puesto = false; const pos = [];
      for (const i of A.celdas) { if (v[i] === d) { puesto = true; break; } if (v[i] === 0 && (c[i] & bt)) pos.push(i); }
      if (puesto || pos.length < 2 || !pos.every((i) => celdas.includes(i))) continue;
      const eli = [];
      for (const i of B.celdas) if (!A.celdas.includes(i) && v[i] === 0 && (c[i] & bt)) eli.push({ i, m: bt });
      if (!eli.length) continue;
      const apunta = A.tipo === 'region' && B.tipo !== 'region';
      return mk('bloqueo', { eli, celdas: pos, area: B.celdas.slice(), digito: d,
        pista1: `Mira dónde puede ir el ${d} en la ${A.nombre}.`,
        pista2: `En la ${A.nombre} el ${d} solo cabe en ${lista(M, pos)}, que están alineadas con la ${B.nombre}.`,
        texto: `En la ${A.nombre}, el ${d} solo puede ir en ${lista(M, pos)}, celdas que también están en la ${B.nombre}. Así que el ${d} de la ${A.nombre} ${apunta ? 'apunta' : 'se queda'} ahí y se descarta del resto de la ${B.nombre}.` });
    }
  }
  return null;
}

function desnudos(st, k) {
  const { M, v, c } = st, tec = k === 2 ? 'par_desnudo' : 'trio_desnudo';
  for (let gi = 0; gi < M.grupos.length; gi++) {
    const g = M.grupos[gi];
    const cs = g.filter((i) => v[i] === 0 && pop(c[i]) >= 2 && pop(c[i]) <= k);
    if (cs.length < k) continue;
    let res = null;
    subconj(cs, k, (sub) => {
      let u = 0; sub.forEach((i) => { u |= c[i]; });
      if (pop(u) !== k) return false;
      const eli = [];
      for (const j of g) if (!sub.includes(j) && v[j] === 0 && (c[j] & u)) eli.push({ i: j, m: c[j] & u });
      if (!eli.length) return false;
      const nombre = gi < M.unidades.length ? 'la ' + M.unidades[gi].nombre : `la jaula de suma ${M.jaulas[gi - M.unidades.length].suma}`;
      res = mk(tec, { eli, celdas: sub, area: g.slice(), digito: u,
        pista1: `Busca ${k === 2 ? 'dos' : 'tres'} celdas de ${nombre} que compartan los mismos candidatos.`,
        pista2: `${lista(M, sub)} solo pueden contener ${listaD(u)}.`,
        texto: `En ${nombre}, las celdas ${lista(M, sub)} solo pueden contener ${listaD(u)} entre ${k === 2 ? 'las dos' : 'las tres'}. Esos números no pueden ir en ninguna otra celda de ${nombre}, así que se descartan allí.` });
      return true;
    });
    if (res) return res;
  }
  return null;
}

function ocultos(st, k) {
  const { M, v, c } = st, tec = k === 2 ? 'par_oculto' : 'trio_oculto';
  for (const u of M.unidades) {
    const libres = u.celdas.filter((i) => v[i] === 0);
    if (libres.length <= k) continue;
    const digs = [];
    for (let d = 1; d <= M.n; d++) if (!u.celdas.some((i) => v[i] === d)) digs.push(d);
    if (digs.length <= k) continue;
    let res = null;
    subconj(digs, k, (D) => {
      let mask = 0; D.forEach((d) => { mask |= 1 << (d - 1); });
      const cs = libres.filter((i) => c[i] & mask);
      if (cs.length !== k) return false;
      let uni = 0; cs.forEach((i) => { uni |= c[i] & mask; });
      if (uni !== mask) return false;
      const eli = [];
      cs.forEach((i) => { const q = c[i] & ~mask; if (q) eli.push({ i, m: q }); });
      if (!eli.length) return false;
      res = mk(tec, { eli, celdas: cs, area: u.celdas.slice(), digito: mask,
        pista1: `En la ${u.nombre}, busca ${k === 2 ? 'dos' : 'tres'} números que solo caben en las mismas ${k === 2 ? 'dos' : 'tres'} celdas.`,
        pista2: `En la ${u.nombre}, los números ${listaD(mask)} solo caben en ${lista(M, cs)}.`,
        texto: `En la ${u.nombre}, los números ${listaD(mask)} solo pueden ir en ${lista(M, cs)}. Esas celdas son suyas, así que se descartan sus otros candidatos.` });
      return true;
    });
    if (res) return res;
  }
  return null;
}

function peces(st, k) {
  const { M, v, c, } = st, n = M.n, tec = k === 2 ? 'x_wing' : 'swordfish';
  for (let d = 1; d <= n; d++) {
    const bt = 1 << (d - 1);
    for (const porFilas of [true, false]) {
      const base = porFilas ? M.filas : M.cols, cruce = porFilas ? M.cols : M.filas, lineas = [];
      base.forEach((cs, li) => {
        if (cs.some((i) => v[i] === d)) return;
        let mask = 0, cnt = 0;
        cs.forEach((i, x) => { if (v[i] === 0 && (c[i] & bt)) { mask |= 1 << x; cnt++; } });
        if (cnt >= 2 && cnt <= k) lineas.push({ li, mask });
      });
      if (lineas.length < k) continue;
      let res = null;
      subconj(lineas, k, (sub) => {
        let u = 0; sub.forEach((s) => { u |= s.mask; });
        if (pop(u) !== k) return false;
        const lis = sub.map((s) => s.li), eli = [], foco = [];
        for (const x of bits(u).map((q) => q - 1)) for (const i of cruce[x]) {
          const li = porFilas ? Math.floor(i / n) : i % n;
          if (lis.includes(li)) { if (v[i] === 0 && (c[i] & bt)) foco.push(i); } else if (v[i] === 0 && (c[i] & bt)) eli.push({ i, m: bt });
        }
        if (!eli.length) return false;
        const nl = porFilas ? 'filas' : 'columnas', nc = porFilas ? 'columnas' : 'filas';
        res = mk(tec, { eli, celdas: foco, digito: d,
          pista1: `Mira dónde puede ir el ${d}: busca ${k} ${nl} donde solo cabe en las mismas ${k} ${nc}.`,
          pista2: `El ${d} en las ${nl} ${lis.map((q) => q + 1).join(', ')} solo cabe en las ${nc} ${bits(u).join(', ')}.`,
          texto: `${NOMBRE_TEC[tec]} con el ${d}: en las ${nl} ${lis.map((q) => q + 1).join(', ')} el ${d} solo puede ir en las ${nc} ${bits(u).join(', ')}. Ocupará una celda de cada ${nc === 'columnas' ? 'columna' : 'fila'}, así que se descarta el ${d} del resto de esas ${nc}.` });
        return true;
      });
      if (res) return res;
    }
  }
  return null;
}

function xyWing(st) {
  const { M, v, c, } = st;
  for (let p = 0; p < M.N; p++) {
    if (v[p] !== 0 || pop(c[p]) !== 2) continue;
    const [A, B] = bits(c[p]), ba = 1 << (A - 1), bb = 1 << (B - 1), vec = Array.from(M.pares[p]).filter((i) => v[i] === 0 && pop(c[i]) === 2);
    for (const x of vec) {
      if (!(c[x] & ba) || (c[x] & bb)) continue;
      const bc = c[x] & ~ba;
      for (const y of vec) {
        if (y === x || c[y] !== (bb | bc)) continue;
        const eli = [];
        for (let j = 0; j < M.N; j++) if (j !== p && j !== x && j !== y && v[j] === 0 && (c[j] & bc) && M.ve[x * M.N + j] && M.ve[y * M.N + j]) eli.push({ i: j, m: bc });
        if (!eli.length) continue;
        const C = bits(bc)[0];
        return mk('xy_wing', { eli, celdas: [p, x, y], digito: C,
          pista1: 'Busca una celda con solo dos candidatos que "vea" a otras dos celdas de dos candidatos.',
          pista2: `Mira ${cel(M, p)} (${A}/${B}), ${cel(M, x)} y ${cel(M, y)}.`,
          texto: `XY-Wing: ${cel(M, p)} (${A}/${B}) es el pivote, ${cel(M, x)} (${A}/${C}) y ${cel(M, y)} (${B}/${C}). Sea cual sea el valor del pivote, una de las alas será ${C}, así que las celdas que ven a ambas alas no pueden ser ${C}.` });
      }
    }
  }
  return null;
}

function prueba(st) {
  const { M, v, c } = st;
  if (!st.sol) { const s = unaSolucion(M, st.dados); if (!s) return null; st.sol = s; }
  let mejor = -1, mk2 = 99;
  for (let i = 0; i < M.N; i++) if (v[i] === 0 && pop(c[i]) < mk2) { mk2 = pop(c[i]); mejor = i; }
  if (mejor < 0) return null;
  const d = st.sol[mejor];
  return mk('prueba', { col: [{ i: mejor, d }], celdas: [mejor], digito: d,
    pista1: 'No hay una jugada lógica sencilla. Tendrás que probar con una celda de pocos candidatos.',
    pista2: `Prueba con ${cel(M, mejor)}: tiene pocos candidatos.`,
    texto: `Ninguna técnica sencilla avanza. Probando en ${cel(M, mejor)}: el ${d} es el único valor que lleva a la solución (comprobado por búsqueda exhaustiva).` });
}

/* Siguiente paso logico segun la escalera de tecnicas; null si el tablero esta resuelto o es inconsistente. */
export function siguientePaso(st, { permitirPrueba = true } = {}) {
  if (contradiccion(st)) return null;
  return unicoDesnudo(st) || unicoOculto(st, true) || unicoOculto(st, false) || jaulas(st) || bloqueos(st) || desnudos(st, 2) || sumaUnidad(st)
    || ocultos(st, 2) || desnudos(st, 3) || ocultos(st, 3) || peces(st, 2) || xyWing(st) || peces(st, 3) || (permitirPrueba ? prueba(st) : null);
}

/* Resuelve con logica y mide la dificultad real. nivelMax corta (ok:false) si hace falta una tecnica superior. */
export function clasificar(M, dados, { nivelMax = 9, sol = null } = {}) {
  const st = crearSt(M, dados, sol);
  let nivel = 0, puntos = 0, pasos = 0, pruebas = 0;
  const uso = {};
  while (!resuelto(st) && pasos < 3000) {
    const p = siguientePaso(st, { permitirPrueba: nivelMax >= 5 });
    if (!p || p.nivel > nivelMax) return { ok: false, nivel: p ? p.nivel : 9, puntos, pasos, uso };
    aplicar(st, p);
    if (p.nivel > nivel) nivel = p.nivel;
    puntos += p.peso; pasos++; uso[p.tec] = (uso[p.tec] || 0) + 1;
    if (p.tec === 'prueba') pruebas++;
  }
  return { ok: resuelto(st), nivel, puntos, pasos, uso, pruebas };
}
