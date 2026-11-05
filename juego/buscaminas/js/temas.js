/* Temas visuales: paletas y pintores de casillas (se hornean en un atlas por tamano). */
(function (G) {
  'use strict';
  var BM = G.BM = G.BM || {};
  var TEMAS = {
    clasico: { nombre: 'Clásico', estilo: 'bisel', bg: '#7d7d86', panel: '#c0c0c0', texto: '#111111', acento: '#0a3cff', cerr: '#c6c6c6', luz: '#ffffff', sombra: '#808080', abre: '#bdbdbd', linea: '#8a8a8a',
      num: ['#0000ff', '#007b00', '#ff0000', '#00007b', '#7b0000', '#007b7b', '#000000', '#6b6b6b'], bandera: '#e60000', mastil: '#111', mina: '#111', hover: '#d8d8d8' },
    neon: { nombre: 'Neón oscuro', estilo: 'neon', bg: '#05030f', panel: '#0d1130', texto: '#e8f4ff', acento: '#3df5ff', cerr: '#151c40', luz: '#3df5ff', sombra: '#0a0e26', abre: '#090c1f', linea: '#1b2350',
      num: ['#3df5ff', '#6dff6d', '#ff5f8f', '#a78bff', '#ffb43d', '#2fffd0', '#f0f0ff', '#ff8cf0'], bandera: '#ff4fd8', mastil: '#e8f4ff', mina: '#ff6b4a', hover: '#222c62' },
    madera: { nombre: 'Madera', estilo: 'madera', bg: '#2a1a0f', panel: '#4a2e1a', texto: '#fbeed9', acento: '#ffc66b', cerr: '#b9814a', luz: '#dba670', sombra: '#6e4724', abre: '#e8d3aa', linea: '#c9b184',
      num: ['#1f4e9c', '#2f7a2f', '#b01e1e', '#5a2a8f', '#7a3b00', '#007a73', '#2b2b2b', '#6b5a45'], bandera: '#c4281c', mastil: '#2b1a0c', mina: '#241810', hover: '#cc9560' },
    pastel: { nombre: 'Pastel', estilo: 'pastel', bg: '#f6eefc', panel: '#ffffff', texto: '#3b3550', acento: '#ff7eb6', cerr: '#cdb4f6', luz: '#e8dcff', sombra: '#a98be0', abre: '#fff7ec', linea: '#eadcf5',
      num: ['#4a7bff', '#2fa56a', '#ef5b7b', '#7d5bd6', '#e08a2e', '#1fa5a5', '#555066', '#9a8fb0'], bandera: '#ff5d8f', mastil: '#5a4f78', mina: '#4a3f66', hover: '#dcc8fb' }
  };
  var NUM_DALT = {
    deuteranopia: ['#0072B2', '#E69F00', '#CC79A7', '#56B4E9', '#D55E00', '#F0E442', '#000000', '#888888'],
    tritanopia: ['#d1495b', '#00798c', '#edae49', '#30638e', '#66a182', '#8d5b4c', '#222222', '#999999'],
    alto: ['#00e5ff', '#ffee00', '#ff3d3d', '#ff9100', '#76ff03', '#ff4df0', '#ffffff', '#b0b0b0']
  };
  var T_CERR = 0, T_VACIA = 1, T_N1 = 2, T_BAND = 10, T_DUDA = 11, T_MINA = 12, T_EXPL = 13, T_ERR = 14, T_HOV = 15, NTILES = 16;

  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  function cerrada(g, s, t, hover, glow) {
    var b = Math.max(1, Math.round(s * 0.1)), base = hover ? t.hover : t.cerr;
    if (t.estilo === 'bisel') {
      g.fillStyle = base; g.fillRect(0, 0, s, s);
      g.fillStyle = t.luz; g.beginPath(); g.moveTo(0, 0); g.lineTo(s, 0); g.lineTo(s - b, b); g.lineTo(b, b); g.lineTo(b, s - b); g.lineTo(0, s); g.fill();
      g.fillStyle = t.sombra; g.beginPath(); g.moveTo(s, s); g.lineTo(0, s); g.lineTo(b, s - b); g.lineTo(s - b, s - b); g.lineTo(s - b, b); g.lineTo(s, 0); g.fill();
    } else if (t.estilo === 'neon') {
      var m = s * 0.07, r = s * 0.2;
      var gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, base); gr.addColorStop(1, t.sombra);
      if (glow) { g.shadowColor = t.luz; g.shadowBlur = s * 0.22; }
      rr(g, m, m, s - 2 * m, s - 2 * m, r); g.fillStyle = gr; g.fill();
      g.shadowBlur = 0; g.lineWidth = Math.max(1, s * 0.05); g.strokeStyle = hover ? t.luz : 'rgba(61,245,255,0.5)'; g.stroke();
    } else if (t.estilo === 'madera') {
      g.fillStyle = base; g.fillRect(0, 0, s, s);
      g.strokeStyle = 'rgba(80,45,15,0.28)'; g.lineWidth = Math.max(1, s * 0.04);
      for (var k = 1; k < 4; k++) { g.beginPath(); g.moveTo(s * (0.15 + k * 0.2), 0); g.bezierCurveTo(s * (0.1 + k * 0.2), s * 0.35, s * (0.25 + k * 0.2), s * 0.65, s * (0.15 + k * 0.2), s); g.stroke(); }
      g.fillStyle = t.luz; g.fillRect(0, 0, s, b); g.fillRect(0, 0, b, s);
      g.fillStyle = t.sombra; g.fillRect(0, s - b, s, b); g.fillRect(s - b, 0, b, s);
      g.strokeStyle = 'rgba(30,15,5,0.7)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, s - 1, s - 1);
    } else {
      var m2 = s * 0.06, r2 = s * 0.28;
      var gr2 = g.createLinearGradient(0, 0, 0, s); gr2.addColorStop(0, hover ? '#e4d4ff' : t.luz); gr2.addColorStop(1, base);
      g.shadowColor = 'rgba(120,80,200,0.35)'; g.shadowBlur = s * 0.12; g.shadowOffsetY = s * 0.04;
      rr(g, m2, m2, s - 2 * m2 - 1, s - 2 * m2 - 1, r2); g.fillStyle = gr2; g.fill();
      g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
      g.lineWidth = Math.max(1, s * 0.04); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke();
    }
  }

  function abierta(g, s, t) {
    if (t.estilo === 'neon') {
      g.fillStyle = t.abre; g.fillRect(0, 0, s, s);
      g.strokeStyle = t.linea; g.lineWidth = 1; g.strokeRect(0.5, 0.5, s - 1, s - 1);
    } else if (t.estilo === 'pastel') {
      g.fillStyle = t.abre; g.fillRect(0, 0, s, s);
      g.strokeStyle = t.linea; g.lineWidth = 1; rr(g, 0.5, 0.5, s - 1, s - 1, s * 0.12); g.stroke();
    } else if (t.estilo === 'madera') {
      g.fillStyle = t.abre; g.fillRect(0, 0, s, s);
      g.strokeStyle = t.linea; g.lineWidth = 1; g.strokeRect(0.5, 0.5, s - 1, s - 1);
      g.fillStyle = 'rgba(120,80,30,0.14)'; g.fillRect(0, 0, s, Math.max(1, s * 0.08));
    } else {
      g.fillStyle = t.abre; g.fillRect(0, 0, s, s);
      g.strokeStyle = t.linea; g.lineWidth = 1; g.strokeRect(0.5, 0.5, s - 1, s - 1);
    }
  }

  function numero(g, s, t, n, color, glow) {
    g.font = '800 ' + Math.round(s * 0.62) + 'px system-ui, "Segoe UI", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (glow && t.estilo === 'neon') { g.shadowColor = color; g.shadowBlur = s * 0.3; }
    g.fillStyle = color; g.fillText(String(n), s / 2, s * 0.54);
    g.shadowBlur = 0;
  }

  function bandera(g, s, t) {
    var x = s * 0.5;
    g.fillStyle = t.mastil; g.fillRect(x - s * 0.04, s * 0.2, s * 0.08, s * 0.58);
    g.fillRect(s * 0.28, s * 0.74, s * 0.44, s * 0.09);
    g.fillStyle = t.bandera; g.beginPath(); g.moveTo(x - s * 0.02, s * 0.18); g.lineTo(s * 0.8, s * 0.34); g.lineTo(x - s * 0.02, s * 0.5); g.closePath(); g.fill();
  }

  function mina(g, s, t, fondoRojo) {
    var c = s / 2, r = s * 0.24;
    if (fondoRojo) { g.fillStyle = '#ff2d2d'; g.fillRect(0, 0, s, s); }
    g.strokeStyle = t.mina; g.lineWidth = Math.max(1.5, s * 0.07); g.lineCap = 'round';
    for (var k = 0; k < 4; k++) { var a = k * Math.PI / 4; g.beginPath(); g.moveTo(c - Math.cos(a) * r * 1.5, c - Math.sin(a) * r * 1.5); g.lineTo(c + Math.cos(a) * r * 1.5, c + Math.sin(a) * r * 1.5); g.stroke(); }
    g.fillStyle = t.mina; g.beginPath(); g.arc(c, c, r, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(c - r * 0.35, c - r * 0.35, r * 0.28, 0, 7); g.fill();
  }

  function cruz(g, s) {
    g.strokeStyle = '#ff2020'; g.lineWidth = Math.max(2, s * 0.1); g.lineCap = 'round';
    g.beginPath(); g.moveTo(s * 0.2, s * 0.2); g.lineTo(s * 0.8, s * 0.8); g.moveTo(s * 0.8, s * 0.2); g.lineTo(s * 0.2, s * 0.8); g.stroke();
  }

  /* Devuelve un canvas atlas (NTILES casillas de ts x ts en una fila). */
  function atlas(tema, ts, dalt, brillo) {
    var t = TEMAS[tema] || TEMAS.neon, cv = document.createElement('canvas');
    cv.width = ts * NTILES; cv.height = ts;
    var g = cv.getContext('2d'), nums = NUM_DALT[dalt] || t.num;
    function en(i, f) { g.save(); g.translate(i * ts, 0); g.beginPath(); g.rect(0, 0, ts, ts); g.clip(); f(); g.restore(); }
    en(T_CERR, function () { cerrada(g, ts, t, false, brillo); });
    en(T_HOV, function () { cerrada(g, ts, t, true, brillo); });
    en(T_VACIA, function () { abierta(g, ts, t); });
    for (var n = 1; n <= 8; n++) (function (n) { en(T_N1 + n - 1, function () { abierta(g, ts, t); numero(g, ts, t, n, nums[n - 1], brillo); }); })(n);
    en(T_BAND, function () { cerrada(g, ts, t, false, brillo); bandera(g, ts, t); });
    en(T_DUDA, function () { cerrada(g, ts, t, false, brillo); numero(g, ts, t, '?', t.acento, brillo); });
    en(T_MINA, function () { abierta(g, ts, t); mina(g, ts, t, false); });
    en(T_EXPL, function () { abierta(g, ts, t); mina(g, ts, t, true); });
    en(T_ERR, function () { abierta(g, ts, t); mina(g, ts, t, false); cruz(g, ts); });
    return cv;
  }

  BM.temas = { LISTA: TEMAS, atlas: atlas, T: { CERR: T_CERR, VACIA: T_VACIA, N1: T_N1, BAND: T_BAND, DUDA: T_DUDA, MINA: T_MINA, EXPL: T_EXPL, ERR: T_ERR, HOV: T_HOV }, DALT: NUM_DALT };
  if (typeof module !== 'undefined' && module.exports) module.exports = BM;
})(typeof window !== 'undefined' ? window : globalThis);
