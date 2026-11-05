/* Plantillas de proyecto. aplicar(p, ctx): ctx = {visuales:[fichas video/imagen], musica(id,dur)->medioId}. VE.plantillas */
(function (g) {
  var M = g.VE.modelo, P = {};
  function limpiar(p, asp) { p.aspecto = asp; p.pistas = M.nuevo().pistas; p.marcadores = []; }
  function txt(p, texto, ini, dur, o) {
    return M.agregar(p, M.clip('texto', Object.assign({ texto: texto, ini: ini, dur: dur, tam: 0.08, estilo: 'contorno', color: '#ffffff', y: 0, anim: { in: 'fundido', out: 'fundido', dur: 0.5 } }, o || {})));
  }
  function fondo(p, ini, dur, c1, c2) { return M.agregar(p, M.clip('forma', { forma: 'fondo', color: c1, color2: c2, ini: ini, dur: dur })); }
  function vis(p, ficha, ini, dur, o) {
    var tipo = ficha.tipo, c = M.clip(tipo, Object.assign({ medio: ficha.id, ini: ini, dur: dur, off: 0, mute: tipo === 'video' ? false : true }, o || {}));
    if (tipo === 'video') c.dur = Math.min(dur, ficha.dur); return M.agregar(p, c);
  }
  function musica(p, ctx, id, dur, vol) {
    var mid = ctx.musica(id, Math.ceil(dur)); return M.agregar(p, M.clip('audio', { medio: mid, ini: 0, dur: dur, vol: vol || 0.7, fi: 0.5, fo: Math.min(2, dur / 3) }), 't_musica');
  }
  P.LISTA = [
    {
      id: 'intro', nombre: 'Intro de título', desc: '16:9 · 5 s · fondo degradado, título y música', aspecto: '16:9',
      aplicar: function (p, ctx) {
        limpiar(p, '16:9'); fondo(p, 0, 5, '#2b1b8f', '#d9378a');
        txt(p, 'TU TÍTULO AQUÍ', 0.4, 4.2, { tam: 0.075, estilo: 'impacto', y: -0.04, anim: { in: 'zoom', out: 'fundido', dur: 0.7 } });
        txt(p, 'Un subtítulo breve', 1.2, 3.4, { tam: 0.035, estilo: 'caja', y: 0.12, anim: { in: 'subir', out: 'fundido', dur: 0.6 } });
        M.agregar(p, M.clip('emoji', { texto: '✨', tam: 0.1, x: 0.38, y: -0.3, ini: 0.8, dur: 3.8, anim: { in: 'rebote', cont: 'pulso', dur: 0.6 } }));
        musica(p, ctx, 'epico', 5, 0.6);
      }
    },
    {
      id: 'historia', nombre: 'Historia con texto', desc: '9:16 · 8 s · tu primer clip/foto de fondo con textos animados', aspecto: '9:16',
      aplicar: function (p, ctx) {
        limpiar(p, '9:16'); var f = ctx.visuales[0];
        if (f) vis(p, f, 0, 8, { filtro: 'vivido', kf: { esc: [{ t: 0, v: 1, ease: 'suave' }, { t: 8, v: 1.12, ease: 'suave' }] } }); else fondo(p, 0, 8, '#0f766e', '#7c3aed');
        txt(p, 'Mi día', 0.3, 7.4, { tam: 0.14, estilo: 'impacto', y: -0.28, anim: { in: 'rebote', out: 'fundido', dur: 0.7 } });
        txt(p, 'Cuéntalo en una frase', 1.2, 6.5, { tam: 0.055, estilo: 'caja', y: 0.3, anim: { in: 'maquina', out: 'fundido', dur: 1.6 } });
        M.agregar(p, M.clip('emoji', { texto: '😍', tam: 0.2, x: 0.28, y: 0.05, ini: 2, dur: 5.5, anim: { in: 'zoom', cont: 'latido', dur: 0.5 } }));
        musica(p, ctx, 'alegre', 8, 0.5);
      }
    },
    {
      id: 'cuenta', nombre: 'Reel con cuenta regresiva', desc: '9:16 · 7 s · fotos con 3-2-1, zoom y destello', aspecto: '9:16',
      aplicar: function (p, ctx) {
        limpiar(p, '9:16'); var cols = [['#ff512f', '#dd2476'], ['#1fa2ff', '#12d8fa'], ['#7f00ff', '#e100ff'], ['#f7971e', '#ffd200'], ['#11998e', '#38ef7d']], d = 1.4;
        for (var i = 0; i < 5; i++) {
          var f = ctx.visuales[i % Math.max(1, ctx.visuales.length)], c;
          if (ctx.visuales.length) c = vis(p, f, i * d, d, { kf: { esc: [{ t: 0, v: 1, ease: 'suave' }, { t: d, v: 1.18, ease: 'suave' }] } });
          else c = fondo(p, i * d, d, cols[i][0], cols[i][1]);
          if (i > 0) c.trans = { tipo: 'destello', dur: 0.35 };
        }
        ['3', '2', '1'].forEach(function (n, i) { txt(p, n, i * d + 0.05, d - 0.1, { tam: 0.4, estilo: 'contorno', y: 0, anim: { in: 'rebote', out: 'zoom', dur: 0.35 } }); });
        txt(p, '¡YA!', 3 * d, 2 * d, { tam: 0.22, estilo: 'impacto', color: '#ffe14d', anim: { in: 'giro', out: 'fundido', dur: 0.5 } });
        musica(p, ctx, 'electro', 7, 0.55);
      }
    },
    {
      id: 'slideshow', nombre: 'Presentación con música', desc: '16:9 · fotos con fundido, Ken Burns y música', aspecto: '16:9',
      aplicar: function (p, ctx) {
        limpiar(p, '16:9'); var d = 3, n = Math.max(3, ctx.visuales.length), cols = [['#355c7d', '#c06c84'], ['#134e5e', '#71b280'], ['#41295a', '#2f0743'], ['#c33764', '#1d2671']];
        for (var i = 0; i < n; i++) {
          var f = ctx.visuales[i % Math.max(1, ctx.visuales.length)], dir = i % 2 ? -1 : 1, c;
          var kf = { esc: [{ t: 0, v: dir > 0 ? 1 : 1.14, ease: 'suave' }, { t: d, v: dir > 0 ? 1.14 : 1, ease: 'suave' }], x: [{ t: 0, v: -0.02 * dir, ease: 'suave' }, { t: d, v: 0.02 * dir, ease: 'suave' }] };
          if (ctx.visuales.length) c = vis(p, f, i * d, d, { kf: kf }); else c = fondo(p, i * d, d, cols[i % 4][0], cols[i % 4][1]);
          if (i > 0) c.trans = { tipo: 'fundido', dur: 0.6 };
        }
        var total = n * d;
        txt(p, 'Mis recuerdos', 0.5, 2.5, { tam: 0.07, estilo: 'caja', y: 0.35, anim: { in: 'subir', out: 'fundido', dur: 0.6 } });
        musica(p, ctx, 'acustica', total, 0.7);
      }
    },
    {
      id: 'tercio', nombre: 'Tercio inferior (lower third)', desc: '16:9 · 8 s · rótulo con nombre y cargo sobre tu video', aspecto: '16:9',
      aplicar: function (p, ctx) {
        limpiar(p, '16:9'); var f = ctx.visuales[0];
        if (f) vis(p, f, 0, 8); else fondo(p, 0, 8, '#222831', '#393e46');
        M.agregar(p, M.clip('forma', { forma: 'rect', tam: 0.07, relacion: 6, color: '#0ea5e9', x: -0.28, y: 0.3, ini: 1, dur: 5.5, anim: { in: 'izq', out: 'izq', dur: 0.5 } }));
        txt(p, 'Nombre Apellido', 1.1, 5.3, { tam: 0.034, estilo: 'basico', x: -0.28, y: 0.285, anim: { in: 'izq', out: 'fundido', dur: 0.6 } });
        txt(p, 'Cargo o descripción', 1.3, 5.0, { tam: 0.022, estilo: 'basico', color: '#e0f2fe', x: -0.28, y: 0.325, anim: { in: 'izq', out: 'fundido', dur: 0.6 } });
      }
    }
  ];
  g.VE = g.VE || {}; g.VE.plantillas = P;
})(window);
