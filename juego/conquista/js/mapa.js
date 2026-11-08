// Mapa de Conquista Mundial: tierras (poligonos lon/lat dibujados a mano), territorios por semillas (Voronoi sobre cada tierra),
// continentes, vecindades terrestres (automaticas) y rutas maritimas. Sin DOM: se usa tambien en las pruebas de Node.
export const W = 1000, H = 545;
const pr = (lo, la) => [(lo + 170) * 2.8, (84 - la) * 3.8];
const P = (s) => s.trim().split(/\s+/).map((p) => { const [a, b] = p.split(',').map(Number); return pr(a, b); });

export const CONTINENTES = [
  { id: 'na', nombre: 'Norteamérica', bono: 5, color: '#e0a04a' },
  { id: 'sa', nombre: 'Sudamérica', bono: 2, color: '#6ccf72' },
  { id: 'eu', nombre: 'Europa', bono: 5, color: '#6aa6ff' },
  { id: 'af', nombre: 'África', bono: 3, color: '#e0714a' },
  { id: 'as', nombre: 'Asia', bono: 8, color: '#c27bff' },
  { id: 'oc', nombre: 'Oceanía', bono: 2, color: '#3fd0c9' }
];

const TIERRAS = {
  america: '-168,66 -163,69 -156,71 -142,70 -130,70 -118,69 -108,68 -95,69 -86,68 -82,66 -88,64 -94,60 -92,57 -86,55 -82,52 -79,52 -78,57 -78,62 -72,62 -66,59 -62,57 -58,54 -56,51 -60,48 -65,48 -66,44 -70,43 -70,41.5 -74,40 -76,37 -76,35 -79,33 -81,31 -80,27 -80,25.5 -82,27 -83,29.5 -86,30.3 -89,30 -93,29.5 -97,27 -97.5,22 -96,19 -94,18.3 -91,19 -90,21 -87,21 -87.5,18 -88.5,16 -84,15.8 -83.5,11 -81,9 -78,9.2 -75,11 -72,12 -69,12 -64,10.5 -61,10 -58,7 -52,5 -50,1 -48,-1 -44,-2.5 -38,-4 -35,-7 -35,-9 -38,-13 -39,-18 -41,-22 -45,-23.5 -48.5,-26 -49,-29 -53,-34 -57,-35 -57,-38 -62,-39 -65,-41 -64,-45 -67,-47 -66,-48 -69,-51.5 -68.5,-54.5 -72,-54 -74,-50 -75,-47 -73.5,-42 -73,-37 -71.5,-32 -71,-27 -70.2,-22 -70.3,-18 -75,-15 -77,-12 -79.5,-7 -81,-5 -80,-1 -80,1 -78.5,2.5 -77.5,4 -77.5,7 -80,7.5 -83,8 -85.7,10 -87.5,13 -91,14 -94,16 -97,16 -101,17.5 -105,19.5 -105.5,22 -109,25.5 -110.5,28 -113,31.5 -114.8,31.8 -117,32.5 -118.5,34 -121,35 -123,38 -124.3,40.5 -124,44 -124,47 -123,49 -127,51 -130,54 -134,57 -138,59 -144,60 -148,60.5 -152,59 -154,57.5 -158,56.5 -162,55 -158,58.5 -162,60 -166,62 -164,64',
  eurasia: '-9,37 -8.8,42 -9.3,43 -2,43.5 -1.5,46 -4.5,48 -1.5,48.7 1.5,50.5 4,51.5 5,53.3 8.5,54 8.6,57 10.5,57.7 10.3,56 10,55 11,54 14,54 19,54.5 21,56.5 24,57.5 23.5,59.2 28,59.7 30,60 26,60.4 22.5,60 21.5,61.5 21.5,63.5 25,65 22,65.8 18,63 17.5,61 19,59.8 16.5,57 14.5,56 13,55.4 12.5,56.3 11.5,58.5 10,59 8,58 6,58.8 5,60.5 5,62 8,63.5 12,66 15,68.5 20,70 26,71 31,70 36,69 41,67 44,68 41,66 34,66 34,64 40,64.5 44,66 48,68 55,68.5 60,69 68,69 73,72.5 80,73 88,75 100,77 108,76 113,74 122,73 130,71 140,72.5 150,71 160,69.5 170,67 175,66 172,64 170,60 163,59 162,55 156,51 156,57 160,61 155,60 143,59 137,54 141,52 140,48 133,43 129,41 129.5,35.5 126.5,34.5 126,38 125,40 121.5,40 121,38 119,37 122,37 121,32 122,30 120,26 117,23 113,22 109,21.5 106,20 106.5,17 108.5,14 109,11.5 105,8.6 102,12.5 99.5,10 100,6 103,4 104,1.3 101,3 98.5,8 98.5,13 97,17 94,16 94,19 92,22 90,22 87,21 85,19.5 80,15.5 80,10 77.5,8 73,17 72.5,21 69,22.5 66.5,25 61,25 57,25.8 56,27 52,27.5 50,30 48,29.5 50,26 51.5,24 54,24 56,26 56.5,24.5 59.5,22.5 58,20 55,17 52,16 45,13 43.2,13 42.8,16 39,21.5 35,28 34.5,29.5 34,31 35,33 36,36.5 32,36.2 29,36.5 26.5,38.5 26.5,40.2 24,40.7 23.5,39.5 24,38 22,36.5 21,38 19.5,40 19.5,42 16,43.5 14,45.2 12.3,45 13.5,43.5 16,41.9 18.5,40.3 16.8,39.2 16,38 15.7,40 14,40.8 12.5,41.8 10.5,43 8.8,44.4 7.5,43.8 3.5,43.2 3.1,42 0.8,40.8 -0.3,39 0,38.5 -1,37.4 -2.2,36.7 -4.5,36.7 -5.5,36 -7,37.2',
  africa: '-5.5,35.8 -2,35.2 3,36.8 10,37.3 11,35 10.2,33.5 15,32.5 19.5,30.5 20,32.5 23,32.8 29,30.9 32,31.3 33.5,30 33,28 35,24 37,20 39,16 43,12.5 46,10.8 51,12 51,10 47,5 44,1 41,-2 39.5,-6 40.5,-11 40.5,-15 35,-20 35.5,-24 32.5,-26 32.8,-29 28,-33 25,-34 20,-35 18,-33 15,-27 14,-22 11.8,-17 13.5,-12 12,-6 9,-1 9.5,3.5 6,4.3 4,6.3 -1,5 -4,5 -7.5,4.4 -11,7 -13.5,9.5 -16.8,12.5 -17.5,14.7 -16,19 -16.5,22 -13,27.5 -10,29.5 -9.8,31 -8.6,33.2 -6,35',
  australia: '113.5,-22 114,-26 115,-34 118,-35 123,-34 129,-31.5 135,-34.8 138,-35 140,-38 146,-39 150,-37 153,-31 153,-25 149,-20.5 146,-18.5 145.5,-15 142.5,-10.7 141.5,-17 139,-17.5 136,-15 137,-12 132,-11.5 129,-14.8 125,-14.5 122,-17.5 120,-20 116,-20.7'
};
const ISLAS = {
  groenlandia: ['-73,78 -60,82.5 -30,83.5 -20,78 -20,70 -30,68 -43,60 -50,62 -55,68 -60,76'],
  britanicas: ['-5.5,50 1.5,51 1.7,52.8 0,53.5 -2,55.5 -2,57.5 -3.5,58.6 -5.5,58.5 -6,56.5 -5,55 -3,54.5 -4.5,53.3 -5,51.8 -3.2,51.3', '-10,52 -6,52 -6,55 -8,55 -10,54'],
  japon: ['130,31.5 131.5,34 135,34.5 137,35 140,35 141,38 142,40 141.5,41.5 140,40.5 139.5,38 136,36.5 133,35.5 131,34.5 130,33.5', '141.5,42.3 144,43 145.5,43.7 143,44.8 141.7,45'],
  madagascar: ['49.3,-12 50.5,-15 49.5,-18 47.5,-24.5 45,-25.5 43.5,-23 44,-17 46,-15.8 48,-13.5'],
  guinea: ['131,-1 135,-3.5 138,-8 141,-9.2 144,-7.5 147.5,-10 150.5,-10.5 147,-6 145.5,-4.5 141,-2.6 137,-1.5 134,-0.8'],
  indonesia: ['95.3,5.6 98.5,3.8 104,-1 106,-3.5 105.8,-6 103,-5 100,-2 96,2.5', '109,1.5 111,2.5 114,4 117.5,7 119,5 118,1 116.5,-3.5 112,-3.8 110,-2', '106.5,-6.5 112,-6.8 114.5,-8.2 108,-7.8', '119,1 125,1.2 122.5,-1 120,-5.5 119,-3'],
  nzelanda: ['172.8,-34.5 175.5,-37 178,-37.7 176,-41.5 174.8,-41.3 175,-39.5 173.8,-39.5', '172.7,-40.5 174,-41.5 171,-44.5 169,-46.6 166.5,-46 168,-44 171.5,-41.8']
};

// [id, nombre, continente, tierra, semillas lon/lat (o null si isla), etiqueta opcional]
const DEF = [
  ['ala', 'Alaska', 'na', 'america', [[-150, 64], [-158, 60]]],
  ['cow', 'Canadá Occidental', 'na', 'america', [[-115, 60], [-110, 52]]],
  ['coe', 'Canadá Oriental', 'na', 'america', [[-72, 53], [-68, 47]]],
  ['gro', 'Groenlandia', 'na', null, null, 'groenlandia'],
  ['cos', 'Costa Oeste', 'na', 'america', [[-120, 40], [-122, 46]]],
  ['llan', 'Grandes Llanuras', 'na', 'america', [[-97, 40], [-97, 47]]],
  ['cea', 'Costa Este', 'na', 'america', [[-78, 38], [-83, 31], [-84, 41]]],
  ['mex', 'México', 'na', 'america', [[-103, 23]]],
  ['cen', 'Centroamérica', 'na', 'america', [[-88, 15]]],
  ['col', 'Gran Colombia', 'sa', 'america', [[-70, 5]]],
  ['ama', 'Amazonia', 'sa', 'america', [[-58, -6], [-45, -8]]],
  ['and', 'Andes', 'sa', 'america', [[-72, -16], [-68, -24]]],
  ['pam', 'Pampas', 'sa', 'america', [[-60, -30]]],
  ['pat', 'Patagonia', 'sa', 'america', [[-69, -46]]],
  ['bri', 'Islas Británicas', 'eu', null, null, 'britanicas'],
  ['esc', 'Escandinavia', 'eu', 'eurasia', [[15, 63], [26, 63]]],
  ['ibe', 'Iberia', 'eu', 'eurasia', [[-5, 40]]],
  ['gal', 'Galia', 'eu', 'eurasia', [[2, 47], [3, 44]]],
  ['ger', 'Germania', 'eu', 'eurasia', [[11, 51.5]]],
  ['ita', 'Italia', 'eu', 'eurasia', [[12, 43], [16, 40.5]]],
  ['bal', 'Balcanes', 'eu', 'eurasia', [[22, 43], [17.5, 44.5]]],
  ['eeu', 'Europa Oriental', 'eu', 'eurasia', [[27, 51], [25, 57]]],
  ['rus', 'Rusia Europea', 'eu', 'eurasia', [[42, 57], [45, 65]]],
  ['mag', 'Magreb', 'af', 'africa', [[-3, 31], [8, 34], [14, 30]]],
  ['nil', 'Nilo', 'af', 'africa', [[29, 26], [31, 15]]],
  ['sah', 'Sahel', 'af', 'africa', [[-5, 15], [8, 14], [-12, 10], [18, 15]]],
  ['con', 'Congo', 'af', 'africa', [[22, 0], [12, 3], [15, -8]]],
  ['cue', 'Cuerno de África', 'af', 'africa', [[40, 7], [38, -3], [45, 10]]],
  ['aus', 'África Austral', 'af', 'africa', [[25, -22], [18, -25], [34, -17], [30, -30], [14, -17]]],
  ['mad', 'Madagascar', 'af', null, null, 'madagascar'],
  ['ori', 'Oriente Medio', 'as', 'eurasia', [[36, 38.5], [36, 33], [45, 25], [46, 31]]],
  ['per', 'Persia', 'as', 'eurasia', [[55, 32], [65, 32]]],
  ['tur', 'Turán', 'as', 'eurasia', [[66, 46], [72, 42], [58, 45]]],
  ['ura', 'Urales', 'as', 'eurasia', [[65, 60]]],
  ['sib', 'Siberia', 'as', 'eurasia', [[90, 62]]],
  ['yak', 'Yakutia', 'as', 'eurasia', [[122, 62]]],
  ['kam', 'Kamchatka', 'as', 'eurasia', [[158, 60], [170, 66]]],
  ['mon', 'Mongolia', 'as', 'eurasia', [[100, 46]]],
  ['man', 'Manchuria', 'as', 'eurasia', [[127, 46], [127.5, 37.5], [135, 52]]],
  ['chi', 'China', 'as', 'eurasia', [[110, 34], [118, 26], [95, 31]]],
  ['ind', 'India', 'as', 'eurasia', [[78, 22], [88, 25]]],
  ['ico', 'Indochina', 'as', 'eurasia', [[101, 16], [100, 6]]],
  ['jap', 'Japón', 'as', null, null, 'japon'],
  ['idn', 'Indonesia', 'oc', null, null, 'indonesia', [114, 0]],
  ['gui', 'Nueva Guinea', 'oc', null, null, 'guinea'],
  ['aoc', 'Australia Occidental', 'oc', 'australia', [[123, -26]]],
  ['aor', 'Australia Oriental', 'oc', 'australia', [[143, -26]]],
  ['nze', 'Nueva Zelanda', 'oc', null, null, 'nzelanda']
];
// rutas maritimas / pasos (ademas de las fronteras terrestres automaticas)
const RUTAS = [
  ['ala', 'kam'], ['coe', 'gro'], ['gro', 'bri'], ['ama', 'sah'], ['ibe', 'mag'], ['ita', 'mag'], ['bal', 'nil'],
  ['nil', 'ori'], ['bri', 'gal'], ['bri', 'ger'], ['bri', 'esc'], ['cue', 'mad'], ['aus', 'mad'], ['jap', 'kam'], ['jap', 'man'], ['jap', 'chi'],
  ['ico', 'idn'], ['idn', 'gui'], ['idn', 'aoc'], ['gui', 'aor'], ['nze', 'aor'], ['nze', 'aoc'], ['ind', 'idn'], ['cen', 'col']
];

/* ---------- geometria: recorte de poligonos con etiqueta de arista ---------- */
function recortar(poli, a, b, c, tag) {
  const f = (p) => a * p.x + b * p.y - c, out = [], n = poli.length;
  for (let i = 0; i < n; i++) {
    const p = poli[i], q = poli[(i + 1) % n], fp = f(p), fq = f(q), dentroP = fp <= 0, dentroQ = fq <= 0;
    const cruce = () => { const t = fp / (fp - fq); return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }; };
    if (dentroP && dentroQ) out.push(p);
    else if (dentroP) { out.push(p); out.push({ ...cruce(), t: tag }); }
    else if (dentroQ) out.push({ ...cruce(), t: p.t });
  }
  return out;
}
const area = (v) => { let s = 0; for (let i = 0; i < v.length; i++) { const p = v[i], q = v[(i + 1) % v.length]; s += p.x * q.y - q.x * p.y; } return s / 2; };
function centroide(v) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < v.length; i++) { const p = v[i], q = v[(i + 1) % v.length], k = p.x * q.y - q.x * p.y; a += k; cx += (p.x + q.x) * k; cy += (p.y + q.y) * k; }
  a /= 2; return a ? [cx / (6 * a), cy / (6 * a)] : [v[0].x, v[0].y];
}
function dentro(v, x, y) {
  let c = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) if ((v[i].y > y) !== (v[j].y > y) && x < ((v[j].x - v[i].x) * (y - v[i].y)) / (v[j].y - v[i].y) + v[i].x) c = !c;
  return c;
}
const trazo = (v) => 'M' + v.map((p) => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join('L') + 'Z';

/* ---------- construccion ---------- */
export const TERR = DEF.map((d, i) => ({ i, id: d[0], nombre: d[1], cont: d[2], semillas: d[4] || null, tierra: d[3], isla: d[5] || null, etq: d[6] || null, polys: [], ady: [] }));
export const IDX = {}; TERR.forEach((t) => { IDX[t.id] = t.i; });
export const BORDES = { fino: '', cont: '', costa: '' };
export const MARES = [];

(function construir() {
  const adj = new Set(), lineas = { fino: [], cont: [] };
  for (const t of TERR) if (t.isla) {
    t.polys = ISLAS[t.isla].map((s) => P(s).map(([x, y]) => ({ x, y, t: 'c' })));
    const mayor = t.polys.slice().sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0];
    t.lab = t.etq || centroide(mayor);
    if (t.etq) t.lab = pr(t.etq[0], t.etq[1]);
  }
  for (const nombre of Object.keys(TIERRAS)) {
    const contorno = P(TIERRAS[nombre]).map(([x, y]) => ({ x, y, t: 'c' }));
    const semillas = [];
    for (const t of TERR) if (t.tierra === nombre) for (const s of t.semillas) { const [x, y] = pr(s[0], s[1]); semillas.push({ x, y, t: t.i }); }
    semillas.forEach((s, k) => {
      let cel = contorno.map((p) => ({ ...p }));
      semillas.forEach((o, m) => {
        if (m === k || !cel.length) return;
        cel = recortar(cel, 2 * (o.x - s.x), 2 * (o.y - s.y), o.x * o.x + o.y * o.y - s.x * s.x - s.y * s.y, m);
      });
      if (cel.length < 3) return;
      const T = TERR[s.t]; T.polys.push(cel);
      for (let i = 0; i < cel.length; i++) {
        const p = cel[i], q = cel[(i + 1) % cel.length], tag = p.t;
        if (tag === 'c') continue;
        const vecino = semillas[tag].t;
        const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
        if (!dentro(contorno, mx, my)) continue;
        if (vecino === s.t) { if (tag > k) (TERR[s.t].costuras = TERR[s.t].costuras || []).push('M' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + 'L' + q.x.toFixed(1) + ' ' + q.y.toFixed(1)); continue; }
        const long = Math.hypot(q.x - p.x, q.y - p.y);
        if (long >= 5) { const k2 = Math.min(s.t, vecino) + '-' + Math.max(s.t, vecino); adj.add(k2); }
        if (s.t < vecino) {
          const seg = 'M' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + 'L' + q.x.toFixed(1) + ' ' + q.y.toFixed(1);
          (TERR[vecino].cont !== T.cont ? lineas.cont : lineas.fino).push(seg);
        }
      }
    });
  }
  for (const t of TERR) {
    t.d = t.polys.map(trazo).join('');
    { const xs = t.polys.flat().map((p) => p.x), ys = t.polys.flat().map((p) => p.y); t.bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map((x) => Math.round(x * 10) / 10); }
    t.costura = (t.costuras || []).join(''); delete t.costuras;
    if (!t.lab) {
      const mayor = t.polys.slice().sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0];
      let c = centroide(mayor);
      if (!dentro(mayor, c[0], c[1])) c = [mayor[0].x, mayor[0].y];
      t.lab = c;
      if (t.polys.length > 1 && t.id !== 'ori') { // etiqueta en el centro de masa de todas las celdas si cae dentro de alguna
        let sa = 0, sx = 0, sy = 0; for (const p of t.polys) { const a = Math.abs(area(p)), cc = centroide(p); sa += a; sx += cc[0] * a; sy += cc[1] * a; }
        const g = [sx / sa, sy / sa]; if (t.polys.some((p) => dentro(p, g[0], g[1]))) t.lab = g;
      }
    }
    t.lab = [Math.round(t.lab[0] * 10) / 10, Math.round(t.lab[1] * 10) / 10];
  }
  adj.forEach((k) => { const [a, b] = k.split('-').map(Number); TERR[a].ady.push(b); TERR[b].ady.push(a); });
  for (const [a, b] of RUTAS) {
    const A = IDX[a], B = IDX[b];
    if (!TERR[A].ady.includes(B)) { TERR[A].ady.push(B); TERR[B].ady.push(A); }
    MARES.push([A, B]);
  }
  TERR.forEach((t) => t.ady.sort((x, y) => x - y));
  BORDES.fino = lineas.fino.join(''); BORDES.cont = lineas.cont.join('');
  BORDES.costa = TERR.map((t) => t.d).join('');
})();

export const N = TERR.length;
export const ADY = TERR.map((t) => t.ady);
export const DE_CONT = CONTINENTES.map((c) => TERR.filter((t) => t.cont === c.id).map((t) => t.i));
export const CONT_IDX = {}; CONTINENTES.forEach((c, i) => { CONT_IDX[c.id] = i; });
export const CONT_DE = TERR.map((t) => CONT_IDX[t.cont]);
// simbolo de carta (0 infanteria, 1 caballeria, 2 artilleria) por territorio
export const SIMBOLO = TERR.map((t) => t.i % 3);
export const sonVecinos = (a, b) => ADY[a].includes(b);
