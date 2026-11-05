const assert = require('assert');
const S = require('./ayuda')(['config.js', 'rejilla.js', 'orbes.js', 'serpiente.js', 'ia.js', 'mundo.js']);
function correr(modo, dif, seg) {
  const W = new S.Mundo({ modo, dif, semilla: 11, total: 25 });
  const t0 = Date.now(); let muertes = 0, maxM = 0, kills = 0;
  const pasos = Math.round(seg / S.C.DT);
  for (let i = 0; i < pasos; i++) {
    W.paso(S.C.DT);
    if (i % 30 === 0) for (const s of W.vivas) {
      for (const v of [s.x, s.y, s.ang, s.masa, s.objAng, s.r]) if (!Number.isFinite(v)) throw new Error('NaN en ' + s.nombre + ' t=' + W.t);
      for (let k = 0; k < s.ns * 2; k++) if (!Number.isFinite(s.segs[k])) throw new Error('NaN seg');
      if (s.masa > maxM) maxM = s.masa;
    }
    for (const e of W.drenar()) if (e.t === 'muerte') { muertes++; if (e.killer) kills++; }
    if (W.fin) break;
    for (const s of W.serps) if (!s.vivo && s.humano) W.reaparecer(s);
  }
  const ms = Date.now() - t0;
  console.log(`${modo}/${dif}: ${Math.round(W.t)}s simulados en ${ms}ms (${(ms / (W.t * 60)).toFixed(2)} ms/paso), vivas ${W.vivas.length}, muertes ${muertes} (por serpientes ${kills}), masa max ${Math.round(maxM)}, orbes ${W.orbes.n}`);
  return { W, muertes, kills, maxM };
}
const r = correr('ffa', 'normal', 300);
assert(r.W.vivas.length >= 15, 'se mantiene poblacion');
assert(r.maxM > 40, 'los bots crecen');
assert(r.muertes > 3 && r.muertes < 600, 'muertes razonables');
correr('ffa', 'experto', 300);
correr('ffa', 'facil', 120);
correr('equipos', 'dificil', 300);
correr('rey', 'normal', 200);
correr('superv', 'normal', 400);
console.log('IA OK (sin NaN)');
