/* Musica de fondo y efectos de sonido procedurales (sintesis en JS, libres de derechos). VE.sonidos */
(function (g) {
  var S = {}, PI2 = Math.PI * 2;
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  /* timbres aditivos: p=[razon, amp, decaimiento/s], a=ataque, r=relajacion, sus=sostenida */
  var saw = [], sq = [], tri = [], i;
  for (i = 1; i <= 10; i++) { saw.push([i, 1 / i, 0]); if (i % 2) { sq.push([i, 1 / i, 0]); tri.push([i, 1 / (i * i), 0]); } }
  var T = {
    seno: { p: [[1, 1, 0]], a: 0.01, r: 0.15, sus: 1 },
    tri: { p: tri, a: 0.01, r: 0.12, sus: 1 },
    sierra: { p: saw, a: 0.008, r: 0.1, sus: 1, g: 0.5 },
    cuadrada: { p: sq, a: 0.004, r: 0.04, sus: 1, g: 0.5 },
    pluck: { p: [[1, 1, 5], [2, 0.5, 7], [3, 0.3, 9], [4, 0.15, 11]], a: 0.003, r: 0.05, sus: 0 },
    epiano: { p: [[1, 1, 2.2], [2, 0.35, 4], [4, 0.1, 7], [7, 0.04, 9]], a: 0.004, r: 0.2, sus: 0 },
    pad: { p: [[1, 1, 0], [1.004, 0.8, 0], [2, 0.3, 0], [3, 0.12, 0]], a: 0.35, r: 0.6, sus: 1, g: 0.6 },
    cuerdas: { p: saw.slice(0, 6).concat([[1.006, 0.7, 0]]), a: 0.25, r: 0.5, sus: 1, vib: 5, g: 0.45 },
    campana: { p: [[1, 1, 1.6], [2.76, 0.6, 2.5], [5.4, 0.35, 3.5], [8.93, 0.2, 5]], a: 0.002, r: 0.3, sus: 0 },
    bajo: { p: [[1, 1, 0], [2, 0.5, 0], [3, 0.25, 0], [4, 0.12, 0]], a: 0.006, r: 0.08, sus: 1, g: 0.8 },
    bajo808: { p: [[1, 1, 1.4]], a: 0.003, r: 0.15, sus: 0, g: 1.2 }
  };
  function nota(L, R, sr, t, d, f, v, tim, pan) {
    var T0 = T[tim] || T.seno, n0 = Math.floor(t * sr), rel = T0.r, len = Math.floor((d + rel) * sr), gl = Math.cos((pan || 0.5) * Math.PI / 2), gr = Math.sin((pan || 0.5) * Math.PI / 2);
    var gan = v * (T0.g || 1), np = T0.p.length;
    for (var k = 0; k < len; k++) {
      var j = n0 + k; if (j < 0 || j >= L.length) continue;
      var tt = k / sr, e = tt < T0.a ? tt / T0.a : 1;
      if (T0.sus) { if (tt > d) e *= Math.max(0, 1 - (tt - d) / rel); } else e *= tt > d ? Math.max(0, 1 - (tt - d) / rel) : 1;
      var ph = T0.vib ? Math.sin(tt * T0.vib * PI2) * 0.004 : 0, s = 0;
      for (var q = 0; q < np; q++) { var p = T0.p[q]; s += p[1] * (p[2] ? Math.exp(-p[2] * tt) : 1) * Math.sin(PI2 * f * p[0] * tt * (1 + ph)); }
      if (tim === 'bajo808') s = Math.sin(PI2 * (f * tt + 0.15 * f * (1 - Math.exp(-30 * tt)) / 30)) * Math.exp(-1.4 * tt);
      s *= e * gan; L[j] += s * gl; R[j] += s * gr;
    }
  }
  function ruido(L, R, sr, t, d, v, tipo, rand, pan) {
    var n0 = Math.floor(t * sr), len = Math.floor(d * sr), prev = 0, lp = 0, gl = Math.cos((pan || 0.5) * 1.5708), gr = Math.sin((pan || 0.5) * 1.5708);
    for (var k = 0; k < len; k++) {
      var j = n0 + k; if (j < 0 || j >= L.length) continue;
      var x = rand() * 2 - 1, y = x - prev; prev = x;
      if (tipo === 'agudo') x = y; else if (tipo === 'medio') { lp += 0.3 * (x - lp); x = lp; }
      var s = x * v * Math.exp(-5 * k / len); L[j] += s * gl; R[j] += s * gr;
    }
  }
  function bombo(L, R, sr, t, v, tipo) {
    var n0 = Math.floor(t * sr), len = Math.floor(0.4 * sr), ph = 0;
    for (var k = 0; k < len; k++) { var j = n0 + k; if (j >= L.length) break; var tt = k / sr, f = (tipo === 'suave' ? 90 : 140) * Math.exp(-tt * 18) + 45; ph += PI2 * f / sr; var s = Math.sin(ph) * Math.exp(-tt * (tipo === 'suave' ? 14 : 9)) * v; L[j] += s; R[j] += s; }
  }
  function caja(L, R, sr, t, v, rand) {
    var n0 = Math.floor(t * sr), len = Math.floor(0.22 * sr), ph = 0;
    for (var k = 0; k < len; k++) { var j = n0 + k; if (j >= L.length) break; var tt = k / sr; ph += PI2 * 190 / sr; var s = (Math.sin(ph) * 0.4 * Math.exp(-tt * 25) + (rand() * 2 - 1) * 0.6 * Math.exp(-tt * 16)) * v; L[j] += s; R[j] += s; }
  }
  function eco(L, R, sr, ms, fb, mix) {
    var d = Math.floor(ms * sr / 1000), d2 = Math.floor(d * 1.31), n = L.length, a = new Float32Array(n), b = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var ra = i >= d ? a[i - d] : 0, rb = i >= d2 ? b[i - d2] : 0;
      a[i] = L[i] + ra * fb; b[i] = R[i] + rb * fb;
    }
    for (i = 0; i < n; i++) { L[i] += (i >= d2 ? b[i - d2] : 0) * mix; R[i] += (i >= d ? a[i - d] : 0) * mix; }
  }

  var ESC = { mayor: [0, 2, 4, 5, 7, 9, 11], menor: [0, 2, 3, 5, 7, 8, 10], dorico: [0, 2, 3, 5, 7, 9, 10] };
  function grado(esc, g) { var n = esc.length, o = Math.floor(g / n); return esc[((g % n) + n) % n] + 12 * o; }
  var BAT = {
    pop: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    lofi: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.xx' },
    epico: { k: 'x...........x...', s: '........x.......', h: '................' },
    electro: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.' },
    funk: { k: 'x..x..x...x..x..', s: '....x..x....x...', h: 'xxxxxxxxxxxxxxxx' },
    hiphop: { k: 'x.....x..x......', s: '....x.......x...', h: 'x.x.x.xxx.x.x.xx' },
    corp: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' },
    shaker: { k: '................', s: '................', h: 'x.xxx.xxx.xxx.xx' },
    ninguna: { k: '................', s: '................', h: '................' }
  };
  var MUSICAS = [
    { id: 'alegre', nombre: 'Alegre pop', bpm: 118, raiz: 60, modo: 'mayor', prog: [0, 4, 5, 3], acorde: 'pluck', bajo: 'bajo', lead: 'tri', bat: 'pop', rit: 'sync' },
    { id: 'lofi', nombre: 'Lo-fi relajado', bpm: 80, raiz: 57, modo: 'mayor', prog: [1, 4, 0, 5], acorde: 'epiano', bajo: 'seno', lead: 'epiano', bat: 'lofi', rit: 'plano', sept: true, ruido: true, swing: 0.12 },
    { id: 'epico', nombre: 'Épico cine', bpm: 92, raiz: 57, modo: 'menor', prog: [0, 5, 2, 6], acorde: 'cuerdas', bajo: 'bajo808', lead: 'cuerdas', bat: 'epico', rit: 'plano', oct: true },
    { id: 'electro', nombre: 'Electro pulso', bpm: 128, raiz: 53, modo: 'menor', prog: [0, 5, 2, 6], acorde: 'pad', bajo: 'sierra', lead: 'sierra', bat: 'electro', rit: 'plano', arp: 4, bajoPat: 'off' },
    { id: 'ambiental', nombre: 'Ambiental amplio', bpm: 62, raiz: 62, modo: 'mayor', prog: [0, 3, 4, 0], acorde: 'pad', bajo: 'seno', lead: 'campana', bat: 'ninguna', rit: 'plano', eco: 1 },
    { id: 'funk', nombre: 'Funk groove', bpm: 104, raiz: 52, modo: 'dorico', prog: [0, 3, 0, 4], acorde: 'epiano', bajo: 'sierra', lead: 'cuadrada', bat: 'funk', rit: 'sync16', bajoPat: 'funk', swing: 0.05 },
    { id: 'suspense', nombre: 'Suspense', bpm: 70, raiz: 48, modo: 'menor', prog: [0, 0, 5, 4], acorde: 'cuerdas', bajo: 'bajo', lead: 'campana', bat: 'ninguna', rit: 'plano', bajoPat: 'pulso', eco: 1 },
    { id: '8bit', nombre: 'Retro 8 bits', bpm: 150, raiz: 60, modo: 'mayor', prog: [0, 5, 3, 4], acorde: 'cuadrada', bajo: 'cuadrada', lead: 'cuadrada', bat: 'electro', rit: 'plano', arp: 4, bajoPat: 'off', chip: true },
    { id: 'acustica', nombre: 'Acústica cálida', bpm: 96, raiz: 55, modo: 'mayor', prog: [0, 4, 5, 3], acorde: 'pluck', bajo: 'pluck', lead: 'pluck', bat: 'shaker', rit: 'arp', arp: 2 },
    { id: 'hiphop', nombre: 'Hip-hop beat', bpm: 88, raiz: 50, modo: 'menor', prog: [0, 5, 3, 4], acorde: 'epiano', bajo: 'bajo808', lead: 'campana', bat: 'hiphop', rit: 'plano', bajoPat: 'trap' },
    { id: 'vlog', nombre: 'Vlog viajero', bpm: 112, raiz: 62, modo: 'mayor', prog: [0, 4, 1, 3], acorde: 'pluck', bajo: 'bajo', lead: 'tri', bat: 'pop', rit: 'sync', palmas: true },
    { id: 'corporativo', nombre: 'Tecnología corporativa', bpm: 120, raiz: 64, modo: 'mayor', prog: [0, 4, 5, 3], acorde: 'pad', bajo: 'bajo', lead: 'pluck', bat: 'corp', rit: 'arp', arp: 2 },
    { id: 'piano', nombre: 'Piano sereno', bpm: 70, raiz: 60, modo: 'mayor', prog: [0, 5, 3, 4], acorde: 'epiano', bajo: 'seno', lead: 'epiano', bat: 'ninguna', rit: 'arp', arp: 2, eco: 1 },
    { id: 'drama', nombre: 'Dramático tenso', bpm: 100, raiz: 50, modo: 'menor', prog: [0, 2, 5, 4], acorde: 'cuerdas', bajo: 'bajo', lead: 'cuerdas', bat: 'epico', rit: 'plano', bajoPat: 'pulso', oct: true }
  ];
  S.MUSICAS = MUSICAS.map(function (m) { return { id: m.id, nombre: m.nombre, bpm: m.bpm }; });

  S.musica = function (id, dur, sr) {
    sr = sr || 44100;
    var m = MUSICAS.filter(function (x) { return x.id === id; })[0] || MUSICAS[0], r = rng(m.bpm * 7 + m.raiz), n = Math.round(dur * sr);
    var L = new Float32Array(n), R = new Float32Array(n), esc = ESC[m.modo], beat = 60 / m.bpm, bar = beat * 4, bars = Math.ceil(dur / bar), bat = BAT[m.bat];
    var step = beat / 4, tl = 0, lastG = 0;
    for (var b = 0; b < bars; b++) {
      var gc = m.prog[b % m.prog.length], t0 = b * bar, raiz = m.raiz;
      var acorde = [0, 2, 4].concat(m.sept ? [6] : []).map(function (k) { return raiz + grado(esc, gc + k); });
      var bajoN = raiz - 24 + grado(esc, gc), vivo = b >= 1 ? 1 : 0.6;
      // acordes
      if (m.rit === 'plano') acorde.forEach(function (x, q) { nota(L, R, sr, t0, bar * 0.98, hz(x - (m.oct ? 12 : 0)), 0.11, m.acorde, 0.35 + q * 0.15); });
      else if (m.rit === 'sync') [0, 1.5, 2, 3.5].forEach(function (bt) { acorde.forEach(function (x, q) { nota(L, R, sr, t0 + bt * beat, beat * 0.4, hz(x), 0.09, m.acorde, 0.3 + q * 0.2); }); });
      else if (m.rit === 'sync16') for (var s16 = 0; s16 < 16; s16++) if ('x..x..x...x.x...'[s16] === 'x') acorde.forEach(function (x, q) { nota(L, R, sr, t0 + s16 * step, step * 0.7, hz(x + 12), 0.07, m.acorde, 0.3 + q * 0.2); });
      else if (m.rit === 'arp') { var np = m.arp || 2, nn = 8 / (np / 2) | 0; for (var a = 0; a < 8; a++) nota(L, R, sr, t0 + a * beat / 2, beat * 1.1, hz(acorde[a % acorde.length] + (a % 4 === 3 ? 12 : 0)), 0.12, m.acorde, 0.3 + (a % 3) * 0.2); acorde.forEach(function (x) { nota(L, R, sr, t0, bar, hz(x - 12), 0.04, 'pad', 0.5); }); }
      if (m.arp && m.rit !== 'arp') for (var a2 = 0; a2 < 16; a2++) nota(L, R, sr, t0 + a2 * step, step * 0.8, hz(acorde[a2 % acorde.length] + (a2 % 8 >= 4 ? 12 : 0) + 12), 0.06, m.lead, 0.2 + (a2 % 4) * 0.2);
      // bajo
      var bp = m.bajoPat || 'beats';
      if (bp === 'beats') [0, 2].forEach(function (bt) { nota(L, R, sr, t0 + bt * beat, beat * 1.8, hz(bajoN), 0.28, m.bajo, 0.5); });
      else if (bp === 'off') for (var o = 0; o < 8; o++) nota(L, R, sr, t0 + o * beat / 2, beat * 0.4, hz(bajoN + (o % 2 ? 12 : 0)), 0.2, m.bajo, 0.5);
      else if (bp === 'pulso') for (var o2 = 0; o2 < 8; o2++) nota(L, R, sr, t0 + o2 * beat / 2, beat * 0.4, hz(bajoN), 0.22, m.bajo, 0.5);
      else if (bp === 'funk') [0, 0.75, 1.5, 2.5, 3, 3.5].forEach(function (bt) { nota(L, R, sr, t0 + bt * beat, beat * 0.4, hz(bajoN + (bt === 1.5 ? 7 : 0)), 0.24, m.bajo, 0.5); });
      else if (bp === 'trap') [0, 1.5, 3].forEach(function (bt) { nota(L, R, sr, t0 + bt * beat, beat * 1.3, hz(bajoN + 12), 0.4, m.bajo, 0.5); });
      // bateria
      for (var s = 0; s < 16; s++) {
        var ts = t0 + s * step + ((s % 2) ? (m.swing || 0) * beat : 0), vol = vivo;
        if (bat.k[s] === 'x') bombo(L, R, sr, ts, 0.5 * vol, m.bat === 'lofi' ? 'suave' : 'duro');
        if (bat.s[s] === 'x') caja(L, R, sr, ts, 0.28 * vol, r);
        if (bat.h[s] === 'x') ruido(L, R, sr, ts, m.bat === 'shaker' ? 0.06 : 0.04, (m.bat === 'funk' ? 0.05 : 0.09) * vol, 'agudo', r, 0.3 + (s % 4) * 0.13);
      }
      if (m.bat === 'epico' && b % 2 === 1) for (var tm = 0; tm < 4; tm++) bombo(L, R, sr, t0 + (3 + tm * 0.25) * beat, 0.4, 'suave');
      if (m.palmas) [1, 3].forEach(function (bt) { ruido(L, R, sr, t0 + bt * beat, 0.09, 0.2, 'medio', r, 0.5); });
      // melodia
      if (b >= 2 && m.lead) {
        var pos = 0;
        while (pos < 16) {
          var dl = [2, 2, 4, 3, 1, 4][Math.floor(r() * 6)]; if (pos + dl > 16) dl = 16 - pos;
          if (r() < 0.72) {
            var salto = Math.floor(r() * 5) - 2; lastG = Math.max(-2, Math.min(9, lastG + salto));
            var dg = r() < 0.5 ? gc + [0, 2, 4][Math.floor(r() * 3)] : lastG; if (r() < 0.5) lastG = dg;
            nota(L, R, sr, t0 + pos * step + ((pos % 2) ? (m.swing || 0) * beat : 0), dl * step * 0.9, hz(raiz + 12 + grado(esc, dg)), m.id === 'ambiental' || m.id === 'piano' ? 0.1 : 0.13, m.lead, 0.5 + (r() - 0.5) * 0.3);
          }
          pos += dl; if (m.id === 'ambiental' || m.id === 'suspense') pos += 4;
        }
      }
      tl = t0;
    }
    if (m.eco) eco(L, R, sr, 280, 0.35, 0.3);
    else eco(L, R, sr, 90, 0.2, 0.12);
    if (m.ruido) { for (var q = 0; q < n; q++) { var cr = r() < 0.0004 ? (r() * 2 - 1) * 0.25 : 0; L[q] += (r() - 0.5) * 0.006 + cr; R[q] += (r() - 0.5) * 0.006 + cr; } }
    var fin = Math.floor(Math.min(2, dur * 0.2) * sr), ini = Math.floor(Math.min(0.2, dur * 0.05) * sr), pk = 0;
    for (var z = 0; z < n; z++) { var gz = z < ini ? z / ini : 1; if (z > n - fin) gz *= (n - z) / fin; L[z] *= gz; R[z] *= gz; pk = Math.max(pk, Math.abs(L[z]), Math.abs(R[z])); }
    var k = pk > 0 ? 0.8 / pk : 1; for (z = 0; z < n; z++) { L[z] *= k; R[z] *= k; }
    return [L, R];
  };

  /* ---- efectos ---- */
  function gen(dur, sr, f) { var n = Math.round(dur * sr), o = new Float32Array(n); for (var i = 0; i < n; i++) o[i] = f(i / sr, i, n); return o; }
  var env = function (t, d, a) { a = a || 0.005; return Math.min(1, t / a) * Math.exp(-t * 4 / d); };
  var barrido = function (f0, f1, t, d) { return f0 * Math.pow(f1 / f0, t / d); };
  function fase() { var p = 0; return function (f, sr) { p += PI2 * f / sr; return p; }; }
  function filtrado(sr, dur, f0, f1, vol, r) {
    var lp = 0; return gen(dur, sr, function (t) { var a = Math.min(1, PI2 * barrido(f0, f1, t, dur) / sr), x = r() * 2 - 1; lp += a * (x - lp); return lp * vol * Math.sin(Math.PI * t / dur) * 2; });
  }
  function tono(sr, dur, f0, f1, vol, forma, dec) {
    var ph = fase(); return gen(dur, sr, function (t) { var p = ph(barrido(f0, f1, t, dur), sr), s = forma === 'cuad' ? (Math.sin(p) > 0 ? 0.5 : -0.5) : forma === 'sierra' ? ((p / PI2) % 1) * 2 - 1 : Math.sin(p); return s * vol * Math.min(1, t / 0.004) * Math.exp(-t * (dec === undefined ? 3 : dec) / dur); });
  }
  function suma(a, b, off, sr) { var o = new Float32Array(Math.max(a.length, b.length + Math.round(off * sr))); o.set(a); var k = Math.round(off * sr); for (var i = 0; i < b.length; i++) o[i + k] += b[i]; return o; }
  var FX = {
    whoosh: ['Whoosh', 0.9, function (sr, r) { return filtrado(sr, 0.9, 300, 4000, 0.9, r); }],
    whoosh_rapido: ['Whoosh rápido', 0.4, function (sr, r) { return filtrado(sr, 0.4, 800, 7000, 0.9, r); }],
    swipe: ['Deslizar', 0.5, function (sr, r) { return filtrado(sr, 0.5, 5000, 400, 0.8, r); }],
    pop: ['Pop', 0.15, function (sr) { return tono(sr, 0.15, 900, 200, 0.9, 'sen', 8); }],
    clic: ['Clic', 0.05, function (sr, r) { return gen(0.05, sr, function (t) { return (r() * 2 - 1) * Math.exp(-t * 180) * 0.8; }); }],
    doble_clic: ['Doble clic', 0.2, function (sr, r) { var c = FX.clic[2](sr, r); return suma(c, c, 0.09, sr); }],
    ding: ['Ding', 1.2, function (sr) { var ph = fase(); return gen(1.2, sr, function (t) { return (Math.sin(ph(1318, sr)) + 0.4 * Math.sin(2.7 * 1318 * t)) * 0.5 * Math.exp(-t * 3.5); }); }],
    campana: ['Campana', 2.0, function (sr) { return gen(2.0, sr, function (t) { return (Math.sin(PI2 * 523 * t) + 0.6 * Math.sin(PI2 * 523 * 2.76 * t) + 0.4 * Math.sin(PI2 * 523 * 5.4 * t)) * 0.3 * Math.exp(-t * 2.2); }); }],
    notificacion: ['Notificación', 0.5, function (sr) { return suma(tono(sr, 0.2, 880, 880, 0.6, 'sen', 5), tono(sr, 0.3, 1320, 1320, 0.6, 'sen', 5), 0.14, sr); }],
    exito: ['Éxito', 0.9, function (sr) { var o = tono(sr, 0.25, 523, 523, 0.5, 'tri', 4); o = suma(o, tono(sr, 0.25, 659, 659, 0.5, 'sen', 4), 0.12, sr); o = suma(o, tono(sr, 0.25, 784, 784, 0.5, 'sen', 4), 0.24, sr); return suma(o, tono(sr, 0.5, 1047, 1047, 0.5, 'sen', 3), 0.36, sr); }],
    error: ['Error', 0.5, function (sr) { return suma(tono(sr, 0.22, 220, 220, 0.5, 'cuad', 5), tono(sr, 0.3, 165, 165, 0.5, 'cuad', 5), 0.2, sr); }],
    sirena: ['Sirena', 1.6, function (sr) { var ph = fase(); return gen(1.6, sr, function (t) { return Math.sin(ph(700 + 300 * Math.sin(t * 6.28 * 1.2), sr)) * 0.5 * Math.min(1, (1.6 - t) * 4); }); }],
    explosion: ['Explosión', 1.8, function (sr, r) { var lp = 0; return gen(1.8, sr, function (t) { lp += (0.02 + 0.3 * Math.exp(-t * 3)) * ((r() * 2 - 1) - lp); return lp * 3 * Math.exp(-t * 2.2) + Math.sin(PI2 * 50 * t) * Math.exp(-t * 4) * 0.6; }); }],
    impacto: ['Impacto', 0.8, function (sr, r) { var ph = fase(); return gen(0.8, sr, function (t) { return Math.sin(ph(barrido(120, 40, Math.min(t, 0.3), 0.3), sr)) * Math.exp(-t * 7) * 0.9 + (r() * 2 - 1) * Math.exp(-t * 40) * 0.5; }); }],
    drop_grave: ['Caída grave', 1.5, function (sr) { return tono(sr, 1.5, 90, 28, 0.9, 'sen', 2.5); }],
    riser: ['Subida (riser)', 2.5, function (sr, r) { var ph = fase(), lp = 0; return gen(2.5, sr, function (t) { lp += 0.2 * ((r() * 2 - 1) - lp); return (Math.sin(ph(barrido(200, 2400, t, 2.5), sr)) * 0.35 + lp * 0.5) * (t / 2.5); }); }],
    caida: ['Caída', 0.9, function (sr) { return tono(sr, 0.9, 1200, 150, 0.6, 'sen', 2); }],
    laser: ['Láser', 0.35, function (sr) { return tono(sr, 0.35, 2400, 200, 0.5, 'sierra', 4); }],
    moneda: ['Moneda', 0.4, function (sr) { return suma(tono(sr, 0.08, 988, 988, 0.5, 'cuad', 1), tono(sr, 0.35, 1319, 1319, 0.5, 'cuad', 5), 0.07, sr); }],
    salto: ['Salto', 0.3, function (sr) { return tono(sr, 0.3, 250, 700, 0.5, 'cuad', 3); }],
    aplausos: ['Aplausos', 2.5, function (sr, r) { var o = new Float32Array(Math.round(2.5 * sr)); for (var k = 0; k < 120; k++) { var t0 = Math.floor(r() * 2.2 * sr), a = 0.2 + r() * 0.5; for (var i = 0; i < 0.03 * sr; i++) if (t0 + i < o.length) o[t0 + i] += (r() * 2 - 1) * a * Math.exp(-i / sr * 90) * 0.4; } return o; }],
    beep: ['Pitido', 0.3, function (sr) { return tono(sr, 0.3, 1000, 1000, 0.5, 'sen', 0.5); }],
    censura: ['Pitido censura', 0.8, function (sr) { return tono(sr, 0.8, 1000, 1000, 0.5, 'sen', 0.1); }],
    glitch: ['Glitch', 0.5, function (sr, r) { return gen(0.5, sr, function (t) { var q = Math.floor(t * 30); return ((r() * 2 - 1) > 0.2 ? 1 : -1) * (q % 3 === 0 ? 0.5 : 0.1) * Math.sin(t * 900 * (1 + q % 5)) * (q % 2 ? 1 : 0.3); }); }],
    chispa: ['Chispa', 0.6, function (sr, r) { var o = new Float32Array(Math.round(0.6 * sr)); for (var k = 0; k < 25; k++) { var t0 = Math.floor(r() * 0.5 * sr); for (var i = 0; i < 0.01 * sr; i++) if (t0 + i < o.length) o[t0 + i] += Math.sin(i * (0.3 + r())) * 0.35 * Math.exp(-i / sr * 300); } return o; }],
    burbuja: ['Burbuja', 0.25, function (sr) { return tono(sr, 0.25, 300, 1000, 0.6, 'sen', 6); }],
    tambor: ['Tambor', 0.6, function (sr, r) { var ph = fase(); return gen(0.6, sr, function (t) { return Math.sin(ph(barrido(200, 80, Math.min(t, 0.2), 0.2), sr)) * Math.exp(-t * 9) * 0.9 + (r() * 2 - 1) * Math.exp(-t * 60) * 0.2; }); }],
    redoble: ['Redoble', 1.2, function (sr, r) { var o = new Float32Array(Math.round(1.2 * sr)), n = 28; for (var k = 0; k < n; k++) { var t0 = Math.floor((k / n * 1.1) * sr), a = 0.3 + 0.6 * k / n; for (var i = 0; i < 0.12 * sr; i++) if (t0 + i < o.length) o[t0 + i] += (r() * 2 - 1) * a * Math.exp(-i / sr * 40) * 0.5; } return o; }],
    tictac: ['Tic-tac', 1.0, function (sr, r) { var c = gen(0.04, sr, function (t) { return Math.sin(PI2 * 1800 * t) * Math.exp(-t * 120) * 0.6; }), d = gen(0.04, sr, function (t) { return Math.sin(PI2 * 1300 * t) * Math.exp(-t * 120) * 0.6; }); return suma(suma(c, d, 0.5, sr), suma(c, d, 0.5, sr), 0.5, sr).subarray(0, sr); }],
    teclado: ['Teclado', 1.0, function (sr, r) { var o = new Float32Array(sr); for (var k = 0; k < 9; k++) { var t0 = Math.floor((k * 0.1 + r() * 0.05) * sr); for (var i = 0; i < 0.02 * sr; i++) if (t0 + i < o.length) o[t0 + i] += (r() * 2 - 1) * Math.exp(-i / sr * 200) * 0.5; } return o; }],
    obturador: ['Obturador', 0.3, function (sr, r) { var c = gen(0.03, sr, function (t) { return (r() * 2 - 1) * Math.exp(-t * 100) * 0.7; }); return suma(c, c, 0.12, sr); }]
  };
  S.EFECTOS = Object.keys(FX).map(function (k) { return { id: k, nombre: FX[k][0], dur: FX[k][1] }; });
  S.efecto = function (id, sr) {
    sr = sr || 44100; var f = FX[id]; if (!f) return null;
    var x = f[2](sr, rng(id.length * 131 + id.charCodeAt(0))), pk = 0, i;
    for (i = 0; i < x.length; i++) pk = Math.max(pk, Math.abs(x[i]));
    var k = pk > 0 ? 0.85 / pk : 1; for (i = 0; i < x.length; i++) x[i] *= k;
    return [x, new Float32Array(x)];
  };
  g.VE = g.VE || {}; g.VE.sonidos = S;
  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
