const assert = require('assert');
const S = require('./ayuda')(['config.js', 'rejilla.js', 'orbes.js', 'serpiente.js', 'ia.js', 'mundo.js']);
let ok = 0; const t = (n, f) => { f(); ok++; console.log('ok -', n); };

t('formulas monotonas', () => {
  assert(S.radio(100) > S.radio(12)); assert(S.radio(1e6) <= 26);
  assert(S.nSegs(1000) > 150, 'cientos de segmentos: ' + S.nSegs(1000));
});
t('segmentos equidistantes en linea recta', () => {
  const s = new S.Serpiente(1); s.reiniciar(0, 0, 0, 40);
  for (let i = 0; i < 120; i++) s.paso(S.C.DT);
  assert(s.ns > 10);
  for (let k = 1; k < s.ns; k++) {
    const d = Math.hypot(s.segs[k * 2] - s.segs[k * 2 - 2], s.segs[k * 2 + 1] - s.segs[k * 2 - 1]);
    assert(Math.abs(d - s.sp) < 0.05 * s.sp + 0.3, 'seg ' + k + ' d=' + d + ' sp=' + s.sp);
  }
});
t('el cuerpo sigue la cabeza en curva sin saltos', () => {
  const s = new S.Serpiente(1); s.reiniciar(0, 0, 0, 80);
  for (let i = 0; i < 600; i++) { s.objAng = (i % 200 < 100) ? 2 : -2; s.pideTurbo = i % 7 === 0; s.paso(S.C.DT); for (let k = 1; k < s.ns; k++) { const d = Math.hypot(s.segs[k * 2] - s.segs[k * 2 - 2], s.segs[k * 2 + 1] - s.segs[k * 2 - 1]); assert(d <= s.sp * 1.05 + 0.5 && d === d, 'salto en ' + k + ' d=' + d); } }
});
t('turbo gasta masa y no baja del minimo', () => {
  const s = new S.Serpiente(1); s.reiniciar(0, 0, 0, 30); s.pideTurbo = true; const m0 = s.masa;
  for (let i = 0; i < 6000; i++) s.paso(S.C.DT);
  assert(s.masa < m0 && s.masa >= S.C.MASA_MIN - 0.1, 'masa ' + s.masa);
});
t('rastro crece al ganar masa', () => {
  const s = new S.Serpiente(1); s.reiniciar(0, 0, 0, 20); s.masa = 400; s.paso(S.C.DT);
  for (let i = 0; i < 400; i++) s.paso(S.C.DT);
  assert.strictEqual(s.ns, S.nSegs(s.masa));
  const f = s.segs.slice(0, s.ns * 2); assert(f.every(Number.isFinite));
});
t('cabeza contra cuerpo ajeno mata y suelta orbes; cuerpo propio no', () => {
  const W = new S.Mundo({ modo: 'ffa', vacio: true, semilla: 3 });
  const a = W.crear({ nombre: 'A' }), b = W.crear({ nombre: 'B' });
  a.reiniciar(0, 0, 0, 60); b.reiniciar(300, -100, Math.PI / 2, 60); a.inmune = b.inmune = 0; W.vivas.length = 2;
  for (let i = 0; i < 30; i++) { b.paso(0.016); } // b queda con cuerpo vertical por x=300 (y -100 hacia arriba)
  // colocar a de frente a la mitad del cuerpo de b
  const k = 6, bx = b.segs[k * 2], by = b.segs[k * 2 + 1];
  a.reiniciar(bx - 40, by, 0, 60); a.inmune = 0; W.ev = [];
  const n0 = W.orbes.n;
  for (let i = 0; i < 30 && a.vivo; i++) W.paso(0.016);
  assert(!a.vivo, 'A debia morir'); assert(b.vivo);
  assert(W.orbes.n > n0 + 5, 'orbes caidos');
  assert(W.ev.some(e => e.t === 'muerte' && e.id === a.id && e.killer === b.id));
  // propio
  const c = W.crear({ nombre: 'C' }); c.reiniciar(-1500, 0, 0, 200); c.inmune = 0;
  for (let i = 0; i < 300; i++) { c.objAng = c.ang + 1; W.paso(0.016); if (!c.vivo) break; }
  assert(c.vivo, 'no choca consigo misma');
});
t('borde mortal', () => {
  const W = new S.Mundo({ modo: 'ffa', vacio: true, semilla: 3 }), a = W.crear({ nombre: 'A' });
  a.reiniciar(S.C.R - 60, 0, 0, 30); a.inmune = 0;
  for (let i = 0; i < 60 && a.vivo; i++) W.paso(0.016);
  assert(!a.vivo);
});
t('cabeza con cabeza: muere la menor', () => {
  const W = new S.Mundo({ modo: 'ffa', vacio: true, semilla: 3 });
  const a = W.crear({}), b = W.crear({});
  a.reiniciar(-30, 0, 0, 100); b.reiniciar(30, 0, Math.PI, 40); a.inmune = b.inmune = 0;
  for (let i = 0; i < 20; i++) W.paso(0.016);
  assert(a.vivo && !b.vivo);
});
t('equipos: no hay dano entre aliados', () => {
  const W = new S.Mundo({ modo: 'equipos', vacio: true, semilla: 3 });
  const a = W.crear({ equipo: 0 }), b = W.crear({ equipo: 0 });
  b.reiniciar(0, 0, 0, 80); for (let i = 0; i < 20; i++) b.paso(0.016); b.inmune = 0;
  a.reiniciar(b.segs[10] - 20, b.segs[11], 0, 40); a.inmune = 0;
  for (let i = 0; i < 20; i++) W.paso(0.016);
  assert(a.vivo);
});
t('guardar/restaurar conserva serpientes y orbes', () => {
  const W = new S.Mundo({ modo: 'ffa', semilla: 5, dif: 'normal' });
  for (let i = 0; i < 25; i++) W.nuevoBot();
  for (let i = 0; i < 300; i++) W.paso(0.016);
  const d = JSON.parse(JSON.stringify(W.exportar())), W2 = S.Mundo.importar(d);
  assert.strictEqual(W2.serps.length, W.serps.length); assert.strictEqual(W2.orbes.n, W.orbes.n);
  const a = W.vivas[0], b = W2.porId[a.id];
  assert(Math.abs(a.segs[a.ns * 2 - 2] - b.segs[b.ns * 2 - 2]) < 25, 'cola cercana');
  for (let i = 0; i < 120; i++) W2.paso(0.016);
});
t('modos: rey puntua en zona; supervivencia encoge', () => {
  const R = new S.Mundo({ modo: 'rey', vacio: true, semilla: 1 }), a = R.crear({});
  a.reiniciar(R.zona.x, R.zona.y, 0, 30);
  for (let i = 0; i < 200; i++) { a.objAng = Math.atan2(R.zona.y - a.y, R.zona.x - a.x) + (Math.hypot(a.x-R.zona.x,a.y-R.zona.y)<100?1:0); R.paso(0.016); }
  assert(a.pt > 1, 'pt ' + a.pt);
  const V = new S.Mundo({ modo: 'superv', vacio: true, semilla: 1 }); V.crear({}); V.t = 200; V.paso(0.016); assert(V.Rc < V.R);
});
console.log(ok + ' pruebas de cuerpo/colisiones OK');
