// Pruebas en Node: node juego/buscaminas/pruebas/pruebas.mjs [tableros-por-dificultad]
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
['azar', 'motor', 'solucionador', 'generador', 'config', 'logros', 'almacen', 'ajustes', 'progreso'].forEach(m => req('../js/' + m + '.js'));
const BM = globalThis.BM, M = BM.motor;
const N = +process.argv[2] || 500;
let fallos = 0, total = 0;
function ok(c, msg) { total++; if (!c) { fallos++; console.log('FALLO:', msg); } }
const sum = a => a.reduce((x, y) => x + y, 0);

// ---- generador clasico: primer clic nunca es mina y abre zona
for (const d of ['principiante', 'intermedio', 'experto']) {
  const { w, h, m } = BM.config.DIF[d];
  let bien = 0;
  for (let s = 0; s < N; s++) {
    const rng = BM.azar.crear(1000 + s), ini = Math.floor(rng() * w * h);
    const g = BM.generador.generar(w, h, m, ini, rng, {});
    const num = M.calcularNum(w, h, g.mina);
    if (sum(Array.from(g.mina)) === m && !g.mina[ini] && num[ini] === 0) bien++;
  }
  ok(bien === N, `${d}: primer clic seguro y con zona en ${bien}/${N}`);
}

// ---- generador sin adivinar: garantia en N tableros por dificultad
for (const d of ['principiante', 'intermedio', 'experto']) {
  const { w, h, m } = BM.config.DIF[d];
  let gar = 0, sano = 0, seguro = 0, t0 = Date.now();
  for (let s = 0; s < N; s++) {
    const rng = BM.azar.crear(5000 + s), ini = Math.floor(rng() * w * h);
    const g = BM.generador.generar(w, h, m, ini, rng, { sinAdivinar: true, maxMs: 5000 });
    if (g.garantizado) gar++;
    if (!g.mina[ini] && sum(Array.from(g.mina)) === m) seguro++;
    const r = BM.solucionador.simular(w, h, g.mina, ini, m);
    if (r.resuelto && r.correcto) sano++;
  }
  console.log(`  sin adivinar ${d}: ${gar}/${N} garantizados, ${((Date.now() - t0) / N).toFixed(1)} ms/tablero`);
  ok(gar === N, `${d}: garantizados ${gar}/${N}`);
  ok(sano === N, `${d}: resueltos por el solucionador sin errores ${sano}/${N}`);
  ok(seguro === N, `${d}: primer clic seguro y minas exactas ${seguro}/${N}`);
}

// ---- personalizado y esquinas
for (const [w, h, mm] of [[60, 40, 528], [5, 5, 5], [40, 25, 150]]) {
  let gar = 0;
  for (let s = 0; s < 20; s++) {
    const rng = BM.azar.crear(77 + s), ini = [0, w - 1, (h - 1) * w, w * h - 1][s % 4];
    const g = BM.generador.generar(w, h, mm, ini, rng, { sinAdivinar: s % 2 === 0, maxMs: 6000 });
    ok(!g.mina[ini] && sum(Array.from(g.mina)) === mm, `personalizado ${w}x${h} minas`);
    if (s % 2 === 0 && g.garantizado) gar++;
  }
  console.log(`  personalizado ${w}x${h}/${mm}: ${gar}/10 sin adivinar garantizados`);
  ok(gar === 10, `personalizado ${w}x${h}/${mm} sin adivinar ${gar}/10`);
}

// ---- solidez del solucionador contra enumeracion exhaustiva (5x5, 5 minas)
(function () {
  const w = 5, h = 5, mt = 5, n = 25;
  const combos = []; (function rec(i, k, acc) { if (k === 0) { combos.push(acc.slice()); return; } for (let j = i; j <= n - k; j++) { acc.push(j); rec(j + 1, k - 1, acc); acc.pop(); } })(0, mt, []);
  let malas = 0;
  for (let s = 0; s < 25; s++) {
    const rng = BM.azar.crear(900 + s), ini = Math.floor(rng() * n);
    const g = BM.generador.generar(w, h, mt, ini, rng, {});
    const num = M.calcularNum(w, h, g.mina), X = BM.solucionador.contexto(w, h, num, mt), S = new Uint8Array(n);
    BM.solucionador.abrirSim(X, S, ini);
    for (let paso = 0; paso < 40; paso++) {
      const d = BM.solucionador.deducir(X, S);
      if (!d.seguras.length && !d.minas.length) break;
      const cons = combos.filter(c => { const mm = new Uint8Array(n); c.forEach(i => mm[i] = 1); const nn = M.calcularNum(w, h, mm); for (let i = 0; i < n; i++) if (S[i] === 1 && nn[i] !== num[i]) return false; for (let i = 0; i < n; i++) if (S[i] === 1 && mm[i]) return false; return true; });
      d.seguras.forEach(c => { if (cons.some(k => k.includes(c))) malas++; });
      d.minas.forEach(c => { if (cons.some(k => !k.includes(c))) malas++; });
      d.minas.forEach(c => S[c] = 2); d.seguras.forEach(c => BM.solucionador.abrirSim(X, S, c));
    }
  }
  ok(malas === 0, `solucionador solido (deducciones incorrectas: ${malas})`);
})();

// ---- determinismo por semilla
{
  const a = BM.generador.porSemilla(16, 16, 40, 12345), b = BM.generador.porSemilla(16, 16, 40, 12345), c = BM.generador.porSemilla(16, 16, 40, 12346);
  ok(M.mina2txt(a.mina) === M.mina2txt(b.mina) && a.inicio === b.inicio, 'semilla determinista');
  ok(M.mina2txt(a.mina) !== M.mina2txt(c.mina), 'semillas distintas, tableros distintos');
  ok(a.garantizado, 'porSemilla garantizado');
}

// ---- motor: apertura, cascada, banderas, acordes, victoria/derrota
function tablero(txt, fallos) {
  const f = txt.trim().split('\n').map(s => s.trim()), h = f.length, w = f[0].length, mina = new Uint8Array(w * h);
  f.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '*') mina[y * w + x] = 1; }));
  const T = M.crear(w, h, 0, fallos); M.colocar(T, mina); return T;
}
{
  const T = tablero(`
    ....*
    .....
    .....
    *....`);
  const R = M.abrir(T, 12);
  ok(T.est[12] === 1 && T.est[0] === 1 && T.abiertas === R.abiertas.length, 'cascada abre zona');
  ok(T.mina[4] && T.mina[15] && T.est[4] !== 1 && T.est[15] !== 1, 'la cascada no abre minas');
  ok(R.prof[0] === 0 && Math.max(...R.prof) >= 1, 'profundidad de cascada');
  ok(T.abiertas === 18 && T.estado === 'ganada', 'victoria al abrir todas las seguras');
  ok(T.est[4] === 2 && T.est[15] === 2, 'al ganar las minas quedan con bandera');
}
{
  const T = tablero(`
    *.....
    ......
    ......
    .....*`);
  M.abrir(T, 7);
  ok(T.num[7] === 1 && T.est[7] === 1, 'numero abierto');
  ok(M.acorde(T, 7).hecho === false, 'acorde sin banderas no hace nada');
  M.bandera(T, 0, true); ok(T.est[0] === 2 && M.restantes(T) === 1, 'bandera y contador');
  M.abrir(T, 0); ok(T.est[0] === 2 && T.estado === 'jugando', 'bandera protege la casilla');
  M.bandera(T, 20, true); M.bandera(T, 20, true); ok(T.est[20] === 3, 'bandera -> duda'); M.bandera(T, 20, true); ok(T.est[20] === 0 && T.banderas === 1, 'duda -> cerrada');
  const R = M.acorde(T, 7);
  ok(R.hecho && T.est[1] === 1 && T.est[6] === 1 && T.est[14] === 1, 'acorde abre vecinos');
}
{
  const T = tablero(`
    *.*
    ...
    ...`);
  M.abrir(T, 4); M.bandera(T, 1, false); M.bandera(T, 3, false);
  const R = M.acorde(T, 4);
  ok(T.estado === 'perdida' && R.minas.length >= 1, 'acorde con bandera equivocada explota');
}
{
  const T = tablero(`
    *.*.
    ....
    ....`, true);
  M.abrir(T, 0); ok(T.estado === 'jugando' && T.explotadas === 1 && T.est[0] === 4, 'modo con vidas: mina no termina');
  ok(M.restantes(T) === 1, 'contador descuenta mina explotada');
  const s = M.instantanea(T); M.abrir(T, 2); ok(T.explotadas === 2, 'segunda mina'); M.volver(T, s); ok(T.explotadas === 1 && T.est[2] === 0, 'deshacer restaura');
  const txt = M.serializarEst(T); const U = M.crear(4, 3, 2, true); M.colocar(U, T.mina); M.restaurarEst(U, txt);
  ok(M.serializarEst(U) === txt && U.explotadas === 1, 'serializar/restaurar');
}
{
  const T = tablero(`
    *.
    ..`);
  M.abrir(T, 0); ok(T.estado === 'perdida' && T.perdidaEn === 0, 'derrota al abrir mina');
  ok(M.abrir(T, 1).abiertas.length === 0, 'sin jugadas tras terminar');
}

// ---- pista del solucionador sobre estado real
{
  const g = BM.generador.generar(16, 16, 40, 120, BM.azar.crear(3), { sinAdivinar: true });
  const T = M.crear(16, 16, 40); M.colocar(T, g.mina); M.abrir(T, 120);
  let bien = true, pasos = 0;
  while (T.estado === 'jugando' && pasos++ < 600) {
    const p = BM.solucionador.pista(T);
    if (!p || p.tipo === 'riesgo') { bien = false; break; }
    if (p.tipo === 'segura') { if (T.mina[p.idx]) { bien = false; break; } M.abrir(T, p.idx); } else { if (!T.mina[p.idx]) { bien = false; break; } M.bandera(T, p.idx, false); }
  }
  ok(bien && T.estado === 'ganada', 'las pistas resuelven un tablero sin adivinar (' + pasos + ' pistas)');
}

// ---- progreso / logros
{
  BM.progreso.reiniciar();
  const r = BM.progreso.registrar({ modo: 'clasico', dif: 'principiante', w: 9, h: 9, m: 10, victoria: true, tiempoMs: 12000, banderas: 3, acordes: 5 });
  ok(r.nuevos.some(l => l.id === 'primera_victoria') && r.nuevos.some(l => l.id === 'relampago'), 'logros por primera victoria');
  ok(r.puesto === 0 && BM.progreso.d.records.tiempo_principiante.length === 1, 'record registrado');
  BM.progreso.registrar({ modo: 'clasico', dif: 'principiante', w: 9, h: 9, m: 10, victoria: true, tiempoMs: 9000, pistas: 1 });
  ok(BM.progreso.d.records.tiempo_principiante.length === 1, 'con pistas no hay record');
  BM.progreso.registrar({ modo: 'clasico', dif: 'principiante', w: 9, h: 9, m: 10, victoria: false, tiempoMs: 4000 });
  ok(BM.progreso.d.cat['clasico:principiante'].racha === 0 && BM.progreso.d.cat['clasico:principiante'].ganadas === 2, 'racha y estadisticas');
  const ids = BM.logros.LISTA.map(l => l.id); ok(ids.length >= 15 && new Set(ids).size === ids.length && ids.every(i => /^[a-z0-9_]+$/.test(i)), 'logros: ids validos');
}

console.log(fallos ? `\n${fallos} FALLOS de ${total}` : `\nTodas las pruebas pasaron (${total} comprobaciones)`);
process.exit(fallos ? 1 : 0);
