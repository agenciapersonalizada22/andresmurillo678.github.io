/* Plantillas generadas por codigo (47), paletas, stickers y logos. Todo editable (capas normales). */
(function (IM) {
  var Doc = IM.Doc, P = IM.Plantillas = { lista: [], paletas: [], stickers: [] };
  var IMP = 'Impact, Haettenschweiler, "Arial Narrow Bold", "Liberation Sans Narrow", sans-serif', ARI = 'Arial, Helvetica, sans-serif', GEO = 'Georgia, "Times New Roman", serif', TRE = '"Trebuchet MS", Helvetica, sans-serif', VER = 'Verdana, Geneva, sans-serif', COU = '"Courier New", Courier, monospace', PAL = 'Palatino, "Palatino Linotype", serif';
  P.fuentes = { IMP: IMP, ARI: ARI, GEO: GEO, TRE: TRE, VER: VER, COU: COU, PAL: PAL };
  [['Océano', '#0b132b', '#1c2541', '#3a86ff', '#5bc0be', '#ffffff'], ['Atardecer', '#2d1b4e', '#ff6b6b', '#ffd93d', '#ff8e53', '#ffffff'], ['Menta', '#ecfdf5', '#10b981', '#065f46', '#34d399', '#064e3b'],
    ['Neón', '#0a0a14', '#00f5d4', '#f15bb5', '#fee440', '#ffffff'], ['Pastel', '#fdf2f8', '#f9a8d4', '#a5b4fc', '#fde68a', '#312e81'], ['Monocromo', '#111111', '#ffffff', '#9ca3af', '#ef4444', '#ffffff'],
    ['Tierra', '#f5ebe0', '#a47148', '#6f4e37', '#d5bdaf', '#3f2a1d'], ['Corporativo', '#f8fafc', '#1e40af', '#0ea5e9', '#f59e0b', '#0f172a'], ['Fuego', '#1a0000', '#ff3d00', '#ffab00', '#ffd600', '#ffffff'],
    ['Bosque', '#0f2a1d', '#2d6a4f', '#95d5b2', '#d8f3dc', '#ffffff'], ['Retro', '#fff1d6', '#e63946', '#457b9d', '#1d3557', '#1d3557'], ['Uva', '#1e1b4b', '#7c3aed', '#c084fc', '#f0abfc', '#ffffff']]
    .forEach(function (p) { P.paletas.push({ nombre: p[0], bg: p[1], a: p[2], b: p[3], c: p[4], t: p[5] }); });
  var T = Doc.texto, Rc = Doc.rect, F = Doc.forma;
  var G = function (a, b, ang) { return { tipo: 'degradado', c1: a, c2: b, ang: ang == null ? 135 : ang }; };
  var S = function (c, w) { return { color: c, ancho: w }; };
  var SOM = function (a) { return { color: 'rgba(0,0,0,' + (a || 0.5) + ')', blur: 12, dx: 0, dy: 6 }; };
  function foto(x, y, w, h, p, r) {
    var a = Rc(x, y, w, h, p.a, { radio: r || 0, nombre: 'Marcador de foto', opacidad: 0.9 }), i = F('icono', x + w / 2 - Math.min(w, h) * 0.15, y + h / 2 - Math.min(w, h) * 0.15, Math.min(w, h) * 0.3, Math.min(w, h) * 0.3, p.t, { icono: 'imagen', opacidad: 0.5, nombre: 'Icono foto' });
    return [a, i];
  }
  function ic(n, x, y, s, col, o) { return F('icono', x, y, s, s, col, Object.assign({ icono: n, nombre: 'Icono' }, o || {})); }
  function def(id, nombre, cat, w, h, build) { P.lista.push({ id: id, nombre: nombre, cat: cat, w: w, h: h, build: build }); }
  var CAT = { yt: 'Miniaturas de vídeo', meme: 'Memes', car: 'Carruseles', cita: 'Citas', anu: 'Anuncios', tar: 'Tarjetas', ban: 'Banners', logo: 'Logos' };
  P.categorias = CAT;
  /* ---------- miniaturas 1280x720 ---------- */
  def('yt-titulo', 'Título gigante', 'yt', 1280, 720, function (w, h, p) {
    return { fondo: G(p.a, p.b, 120), capas: [F('poligono', -200, -100, 700, 700, p.c, { lados: 6, opacidad: 0.25, rot: 15 }), F('elipse', 800, 380, 600, 600, p.b, { opacidad: 0.35 }),
      T('TÍTULO\nIMPACTANTE', 60, 120, 1160, 165, { fuente: IMP, color: p.t, contorno: S('#000000', 10), sombra: SOM(0.6), alin: 'left', interlineado: 0.95 }),
      Rc(60, 600, 420, 70, p.c, { radio: 14 }), T('MIRA ESTO', 70, 612, 400, 44, { fuente: ARI, color: p.bg, peso: 900, alin: 'center' })] };
  });
  def('yt-sujeto', 'Sujeto + título', 'yt', 1280, 720, function (w, h, p) {
    return { fondo: G(p.bg, p.a, 90), capas: foto(40, 60, 560, 600, p, 30).concat([T('NO SABÍAS\nESTO', 640, 150, 600, 105, { fuente: IMP, color: p.t, contorno: S('#000000', 8), alin: 'left', interlineado: 0.95 }),
      T('Lo que nadie te cuenta', 640, 440, 600, 54, { fuente: ARI, color: p.c, peso: 800, alin: 'left' }), ic('flecha-der', 640, 540, 110, p.b)]) };
  });
  def('yt-antes-despues', 'Antes y después', 'yt', 1280, 720, function (w, h, p) {
    return { fondo: { tipo: 'solido', c1: p.bg }, capas: [Rc(0, 0, 640, 720, p.a), Rc(640, 0, 640, 720, p.b), T('ANTES', 40, 560, 560, 110, { fuente: IMP, color: p.t, contorno: S('#000', 6) }),
      T('DESPUÉS', 680, 560, 560, 110, { fuente: IMP, color: p.t, contorno: S('#000', 6) }), F('elipse', 540, 260, 200, 200, p.c, { sombra: SOM(0.5) }), ic('flecha-der', 575, 295, 130, p.bg)].concat(foto(60, 60, 520, 440, { a: p.bg, t: p.t }, 20), foto(700, 60, 520, 440, { a: p.bg, t: p.t }, 20)) };
  });
  def('yt-reaccion', 'Reacción con flechas', 'yt', 1280, 720, function (w, h, p) {
    return { fondo: G(p.a, p.bg, 45), capas: foto(560, 60, 660, 600, p, 20).concat([T('¡NO LO VAS A\nCREER!', 40, 80, 560, 95, { fuente: IMP, color: '#ffe600', contorno: S('#000', 8), alin: 'left', interlineado: 0.95 }),
      F('elipse', 780, 180, 300, 300, null, { trazo: { color: '#ff1744', ancho: 14 } }), F('flecha', 360, 440, 380, 150, '#ff1744', { rot: -25, sombra: SOM(0.5) }), T('😱', 80, 400, 240, 200, { alin: 'center', fuente: ARI })]) };
  });
  def('yt-top', 'Top / número gigante', 'yt', 1280, 720, function (w, h, p) {
    return { fondo: { tipo: 'solido', c1: p.bg }, capas: [Rc(0, 0, 520, 720, p.a), T('10', -20, 10, 560, 640, { fuente: IMP, color: p.c, alin: 'center', contorno: S('#000', 6), sombra: SOM(0.5) }),
      T('MEJORES\nTRUCOS', 560, 150, 680, 120, { fuente: IMP, color: p.t, alin: 'left', interlineado: 0.95, contorno: S('#000', 6) }), Rc(560, 480, 560, 20, p.b), T('QUE DEBES CONOCER', 560, 520, 680, 46, { fuente: ARI, peso: 800, color: p.c, alin: 'left' })] };
  });
  def('yt-tutorial', 'Tutorial paso a paso', 'yt', 1280, 720, function (w, h, p) {
    var c = [Rc(0, 0, 1280, 140, p.a), T('TUTORIAL', 40, 30, 600, 80, { fuente: IMP, color: p.c, alin: 'left' }), T('Aprende en 3 pasos', 40, 190, 1200, 100, { fuente: TRE, color: p.t, peso: 800, alin: 'left' })];
    [['1', 'Prepara'], ['2', 'Crea'], ['3', 'Publica']].forEach(function (q, i) { var x = 40 + i * 410; c.push(F('elipse', x, 360, 120, 120, p.b), T(q[0], x, 378, 120, 84, { fuente: IMP, color: p.t, alin: 'center' }), T(q[1], x + 140, 392, 240, 54, { fuente: ARI, peso: 800, color: p.t, alin: 'left' })); });
    return { fondo: { tipo: 'solido', c1: p.bg }, capas: c.concat([Rc(40, 580, 1200, 8, p.c)]) };
  });
  def('yt-gaming', 'Gaming con franjas', 'yt', 1280, 720, function (w, h, p) {
    return { fondo: { tipo: 'solido', c1: p.bg }, capas: [Rc(-100, 200, 1600, 120, p.a, { rot: -12, opacidad: 0.9 }), Rc(-100, 420, 1600, 60, p.b, { rot: -12 }), Rc(-100, 520, 1600, 30, p.c, { rot: -12 }),
      ic('mando', 900, 60, 300, p.c, { rot: 12, sombra: { color: p.c, blur: 40, dx: 0, dy: 0 } }), T('GAMEPLAY', 40, 100, 900, 190, { fuente: IMP, color: p.t, alin: 'left', contorno: S(p.bg, 10), sombra: { color: p.b, blur: 30, dx: 0, dy: 0 } }),
      T('EPISODIO 1', 40, 600, 600, 70, { fuente: IMP, color: p.c, alin: 'left', contorno: S('#000', 5) })] };
  });
  def('yt-misterio', 'Misterio oscuro', 'yt', 1280, 720, function (w, h, p) {
    return { fondo: { tipo: 'radial', c1: p.a, c2: '#000000' }, capas: [F('elipse', 360, 60, 560, 560, null, { trazo: { color: p.b, ancho: 6, punteado: true }, opacidad: 0.6 }), ic('pregunta', 450, 130, 380, p.b, { opacidad: 0.9, sombra: { color: p.b, blur: 50, dx: 0, dy: 0 } }),
      T('¿QUÉ PASÓ\nREALMENTE?', 40, 480, 1200, 150, { fuente: IMP, color: p.t, contorno: S('#000', 8), interlineado: 0.9 })] };
  });
  def('yt-vlog', 'Vlog minimalista', 'yt', 1280, 720, function (w, h, p) {
    return { fondo: { tipo: 'solido', c1: p.bg }, capas: foto(640, 60, 580, 600, p, 300).concat([Rc(60, 90, 260, 54, p.b, { radio: 27 }), T('VLOG #1', 60, 98, 260, 38, { fuente: ARI, peso: 800, color: p.bg, alin: 'center', espaciado: 3 }), T('Un día\nconmigo', 60, 220, 600, 150, { fuente: GEO, cursiva: true, peso: 700, color: p.t, alin: 'left', interlineado: 1 }), Rc(60, 560, 120, 8, p.c)]) };
  });
  def('yt-pregunta', 'Pregunta con signos', 'yt', 1280, 720, function (w, h, p) {
    return { fondo: G(p.b, p.a, 60), capas: [ic('pregunta', 60, 60, 220, p.c, { rot: -15, opacidad: 0.5 }), ic('pregunta', 1000, 420, 240, p.c, { rot: 15, opacidad: 0.5 }), T('¿VALE LA\nPENA?', 40, 150, 1200, 190, { fuente: IMP, color: p.t, contorno: S('#000', 10), interlineado: 0.92, sombra: SOM(0.5) }),
      Rc(380, 540, 520, 90, p.c, { radio: 45 }), T('LA VERDAD', 380, 556, 520, 56, { fuente: ARI, peso: 900, color: p.bg, alin: 'center' })] };
  });
  /* ---------- memes 1080x1080 ---------- */
  def('meme-clasico', 'Clásico arriba / abajo', 'meme', 1080, 1080, function (w, h, p) {
    var o = { fuente: IMP, color: '#ffffff', contorno: S('#000000', 8), mayus: true, alin: 'center', interlineado: 1 };
    return { fondo: { tipo: 'solido', c1: '#222222' }, capas: foto(0, 0, 1080, 1080, { a: '#3a3a3a', t: '#ffffff' }, 0).concat([T('CUANDO TEXTO SUPERIOR', 30, 24, 1020, 110, o), T('Y TEXTO INFERIOR', 30, 900, 1020, 110, o)]) };
  });
  def('meme-barra', 'Barra blanca superior', 'meme', 1080, 1080, function (w, h, p) {
    return { fondo: { tipo: 'solido', c1: '#ffffff' }, capas: [T('Cuando el lunes llega y tú no estás listo', 40, 50, 1000, 70, { fuente: ARI, peso: 800, color: '#000', alin: 'left', interlineado: 1.1 })].concat(foto(0, 240, 1080, 840, { a: '#c8ccd4', t: '#555' }, 0)) };
  });
  def('meme-paneles', 'Dos paneles', 'meme', 1080, 1080, function (w, h, p) {
    return { fondo: { tipo: 'solido', c1: '#000' }, capas: [Rc(10, 10, 1060, 520, p.a), Rc(10, 550, 1060, 520, p.b), T('EXPECTATIVA', 30, 30, 700, 70, { fuente: IMP, color: p.t, contorno: S('#000', 5), alin: 'left' }), T('REALIDAD', 30, 570, 700, 70, { fuente: IMP, color: p.t, contorno: S('#000', 5), alin: 'left' })] };
  });
  def('meme-drake', 'Aprobar / rechazar', 'meme', 1080, 1080, function (w, h, p) {
    return { fondo: { tipo: 'solido', c1: '#ffffff' }, capas: [Rc(0, 0, 540, 540, '#f2c94c'), Rc(0, 540, 540, 540, '#6fcf97'), ic('equis', 190, 190, 160, '#b00020'), ic('check', 190, 730, 160, '#1b5e20'),
      T('Hacerlo\nmanual', 580, 190, 470, 70, { fuente: ARI, peso: 800, color: '#000', alin: 'left' }), T('Automatizarlo\ncon código', 580, 730, 470, 70, { fuente: ARI, peso: 800, color: '#000', alin: 'left' }), Rc(540, 0, 4, 1080, '#000'), Rc(0, 538, 1080, 4, '#000')] };
  });
  def('meme-cuatro', 'Cuatro paneles', 'meme', 1080, 1080, function (w, h, p) {
    var c = []; [[0, 0], [540, 0], [0, 540], [540, 540]].forEach(function (q, i) { c.push(Rc(q[0] + 8, q[1] + 8, 524, 524, [p.a, p.b, p.c, p.bg][i]), T(String(i + 1), q[0] + 30, q[1] + 20, 120, 120, { fuente: IMP, color: p.t, alin: 'left', contorno: S('#000', 4) }), T('Texto del panel', q[0] + 30, q[1] + 380, 480, 56, { fuente: ARI, peso: 800, color: p.t, contorno: S('#000', 4), alin: 'left' })); });
    return { fondo: { tipo: 'solido', c1: '#000' }, capas: c };
  });
  def('meme-niveles', 'Niveles crecientes', 'meme', 1080, 1080, function (w, h, p) {
    var c = []; [['Normal', 40, p.a], ['Mejor', 54, p.b], ['Genial', 68, p.c], ['LEYENDA', 88, '#ffd700']].forEach(function (q, i) { c.push(Rc(0, i * 270, 1080, 270, q[2]), T(q[0], 40, i * 270 + 135 - q[1] * 0.6, 1000, q[1], { fuente: IMP, color: i === 3 ? '#000' : p.t, alin: 'left', contorno: i === 3 ? null : S('#000', 4) }), ic('estrella', 880, i * 270 + 70, 130, 'rgba(255,255,255,.7)')); });
    return { fondo: { tipo: 'solido', c1: '#000' }, capas: c };
  });
  /* ---------- carruseles 1080x1350 (varias paginas) ---------- */
  function carrusel(titulo, items, estilo) {
    return function (w, h, p) {
      var paginas = [], n = items.length;
      var bgp = function (i) { return estilo === 'alt' && i % 2 ? { tipo: 'solido', c1: p.a } : (estilo === 'deg' ? G(p.a, p.bg, 160 + i * 20) : { tipo: 'solido', c1: p.bg }); };
      paginas.push({ fondo: G(p.b, p.a, 140), capas: [F('elipse', 600, -200, 800, 800, p.c, { opacidad: 0.25 }), T(titulo, 70, 420, 940, 150, { fuente: IMP, color: p.t, alin: 'left', interlineado: 1, contorno: S('#000', 4) }), Rc(70, 330, 160, 14, p.c), T('Desliza  →', 70, 1160, 600, 54, { fuente: ARI, peso: 800, color: p.t, alin: 'left' })] });
      items.forEach(function (it, i) {
        var tc = (estilo === 'alt' && i % 2) || estilo === 'deg' ? p.t : (window.Color.textoSobre(bgp(i).c1 || p.a));
        paginas.push({ fondo: bgp(i), capas: [T(String(i + 1).padStart(2, '0'), 70, 90, 400, 260, { fuente: IMP, color: p.c, alin: 'left', opacidad: 1 }), Rc(70, 380, 160, 14, p.b), T(it[0], 70, 440, 940, 90, { fuente: TRE, peso: 900, color: tc, alin: 'left', interlineado: 1.1 }), T(it[1], 70, 640, 940, 44, { fuente: ARI, color: tc, alin: 'left', interlineado: 1.4, peso: 400 }), T((i + 2) + ' / ' + (n + 2), 70, 1230, 940, 30, { fuente: ARI, color: tc, alin: 'right', opacidad: 0.6 })] });
      });
      paginas.push({ fondo: G(p.a, p.b, 30), capas: [ic('corazon', 440, 280, 200, p.c), T('¿Te sirvió?', 70, 560, 940, 110, { fuente: IMP, color: p.t, alin: 'center' }), T('Guárdalo y compártelo', 70, 740, 940, 50, { fuente: ARI, peso: 700, color: p.t, alin: 'center' }), Rc(300, 900, 480, 90, p.c, { radio: 45 }), T('SÍGUEME', 300, 918, 480, 54, { fuente: ARI, peso: 900, color: p.bg, alin: 'center' })] });
      return { paginas: paginas };
    };
  }
  def('car-consejos', '5 consejos', 'car', 1080, 1350, carrusel('5 CONSEJOS\nQUE CAMBIAN TODO', [['Empieza pequeño', 'Un paso cada día vale más que un gran salto que nunca llega.'], ['Mide lo que importa', 'Lo que no se mide no se mejora. Elige un solo número.'], ['Descansa a tiempo', 'La constancia necesita energía. Duerme y desconecta.']], 'plano'));
  def('car-pasos', 'Paso a paso', 'car', 1080, 1350, carrusel('GUÍA PASO\nA PASO', [['Prepara tus materiales', 'Reúne todo lo necesario antes de empezar.'], ['Sigue el proceso', 'Haz cada paso con calma y sin saltarte ninguno.'], ['Revisa el resultado', 'Compara con tu objetivo y ajusta los detalles.']], 'alt'));
  def('car-antes-despues', 'Mitos y verdades', 'car', 1080, 1350, carrusel('MITOS Y\nVERDADES', [['Mito: más es mejor', 'Verdad: lo justo y bien hecho gana siempre.'], ['Mito: hay un truco mágico', 'Verdad: hay hábitos pequeños repetidos.'], ['Mito: es demasiado tarde', 'Verdad: el mejor momento es hoy.']], 'deg'));
  def('car-ideas', 'Lista de ideas', 'car', 1080, 1350, carrusel('IDEAS PARA\nEMPEZAR HOY', [['Crea una lista', 'Anota tres objetivos concretos y visibles.'], ['Pide opinión', 'Una mirada externa ahorra semanas.'], ['Publica antes de estar listo', 'Aprender en público acelera todo.']], 'alt'));
  def('car-historia', 'Historia en capítulos', 'car', 1080, 1350, carrusel('MI HISTORIA\nEN 3 CAPÍTULOS', [['Capítulo 1: el inicio', 'Todo empezó con una pregunta y muchas dudas.'], ['Capítulo 2: el bache', 'Fallé, aprendí y volví a intentarlo.'], ['Capítulo 3: el giro', 'Hoy lo cuento para que tú llegues antes.']], 'deg'));
  def('car-datos', 'Datos curiosos', 'car', 1080, 1350, carrusel('¿SABÍAS\nQUE...?', [['El dato 1', 'Escribe aquí un dato sorprendente y fácil de recordar.'], ['El dato 2', 'Añade contexto en una o dos frases cortas.'], ['El dato 3', 'Termina con el más llamativo para que lo compartan.']], 'plano'));
  /* ---------- citas 1080x1080 ---------- */
  function cita(est) {
    return function (w, h, p) {
      var q = 'La constancia vence\nal talento cuando el\ntalento no se esfuerza.', a = '— Autor/a de la cita';
      if (est === 0) return { fondo: { tipo: 'solido', c1: p.bg }, capas: [ic('comentario', 90, 90, 130, p.c), T(q, 90, 300, 900, 66, { fuente: GEO, color: window.Color.textoSobre(p.bg), alin: 'left', interlineado: 1.3, peso: 700 }), Rc(90, 800, 120, 8, p.b), T(a, 90, 840, 900, 38, { fuente: ARI, color: p.c, alin: 'left', peso: 700 })] };
      if (est === 1) return { fondo: G(p.a, p.b, 135), capas: [T('“', 60, -40, 400, 520, { fuente: GEO, color: 'rgba(255,255,255,.3)', alin: 'left' }), T(q, 90, 330, 900, 70, { fuente: PAL, cursiva: true, color: p.t, alin: 'center', interlineado: 1.25 }), T(a, 90, 850, 900, 38, { fuente: ARI, color: p.t, alin: 'center', peso: 700 })] };
      if (est === 2) return { fondo: { tipo: 'solido', c1: p.c }, capas: [Rc(60, 60, 960, 960, null, { trazo: { color: p.a, ancho: 10 } }), T(q.replace(/\n/g, ' ').toUpperCase(), 140, 300, 800, 64, { fuente: IMP, color: p.a, alin: 'center', interlineado: 1.1 }), T(a, 140, 800, 800, 36, { fuente: ARI, color: p.a, alin: 'center', peso: 700 })] };
      if (est === 3) return { fondo: { tipo: 'solido', c1: '#101014' }, capas: [F('elipse', -200, -200, 700, 700, p.b, { opacidad: 0.35 }), F('elipse', 600, 600, 700, 700, p.a, { opacidad: 0.5 }), T(q, 100, 340, 880, 64, { fuente: TRE, color: '#ffffff', alin: 'left', peso: 800, interlineado: 1.25 }), T(a, 100, 820, 880, 36, { fuente: ARI, color: p.c, alin: 'left', peso: 700 })] };
      if (est === 4) return { fondo: { tipo: 'solido', c1: '#fbf6ea' }, capas: [ic('libro', 440, 120, 200, '#8d6e63'), T(q, 100, 400, 880, 62, { fuente: PAL, cursiva: true, color: '#3e2723', alin: 'center', interlineado: 1.35 }), Rc(480, 780, 120, 4, '#8d6e63'), T(a, 100, 820, 880, 34, { fuente: PAL, color: '#5d4037', alin: 'center' })] };
      return { fondo: { tipo: 'solido', c1: '#050510' }, capas: [T(q, 100, 340, 880, 70, { fuente: COU, peso: 700, color: p.a === '#ffffff' ? p.b : p.a, alin: 'left', sombra: { color: p.b, blur: 24, dx: 0, dy: 0 }, interlineado: 1.3 }), T('> ' + a.replace('— ', ''), 100, 830, 880, 36, { fuente: COU, color: '#ffffff', alin: 'left' })] };
    };
  }
  ['Minimal con acento', 'Degradado con comillas', 'Marco y mayúsculas', 'Oscuro con luces', 'Libro clásico', 'Terminal neón'].forEach(function (n, i) { def('cita-' + i, n, 'cita', 1080, 1080, cita(i)); });
  /* ---------- anuncios ---------- */
  def('anu-oferta', 'Oferta -50%', 'anu', 1080, 1080, function (w, h, p) {
    return { fondo: G(p.a, p.bg, 150), capas: [F('estrella', 140, 120, 800, 800, p.c, { puntas: 16, interior: 0.85, rot: 10, sombra: SOM(0.4) }), T('-50%', 140, 330, 800, 260, { fuente: IMP, color: p.bg, alin: 'center' }), T('SOLO ESTE FIN DE SEMANA', 90, 640, 900, 60, { fuente: ARI, color: p.bg, peso: 900, alin: 'center' }), Rc(280, 900, 520, 100, p.t, { radio: 50 }), T('COMPRAR AHORA', 280, 922, 520, 56, { fuente: ARI, color: p.bg, peso: 900, alin: 'center' })] };
  });
  def('anu-producto', 'Lanzamiento de producto', 'anu', 1080, 1350, function (w, h, p) {
    return { fondo: { tipo: 'solido', c1: p.bg }, capas: [F('elipse', 90, 210, 900, 900, p.a), F('elipse', 190, 310, 700, 700, p.b, { opacidad: 0.6 })].concat(foto(290, 410, 500, 500, { a: p.c, t: p.bg }, 250), [T('NUEVO', 70, 70, 940, 110, { fuente: IMP, color: p.c, alin: 'left' }), T('Tu producto estrella', 70, 1060, 940, 70, { fuente: TRE, color: window.Color.textoSobre(p.bg), peso: 900, alin: 'left' }), T('Disponible desde hoy', 70, 1160, 940, 40, { fuente: ARI, color: p.c, alin: 'left', peso: 700 })]) };
  });
  def('anu-evento', 'Evento con fecha', 'anu', 1080, 1350, function (w, h, p) {
    return { fondo: G(p.a, p.b, 160), capas: [Rc(70, 70, 940, 1210, null, { trazo: { color: p.t, ancho: 4 }, opacidad: 0.5 }), T('TALLER EN VIVO', 110, 150, 860, 60, { fuente: ARI, color: p.c, peso: 900, alin: 'center', espaciado: 6 }), T('Aprende\ndiseño\ndesde cero', 110, 300, 860, 170, { fuente: IMP, color: p.t, alin: 'center', interlineado: 1 }), Rc(340, 840, 400, 160, p.c, { radio: 20 }), T('SÁB 15', 340, 862, 400, 70, { fuente: IMP, color: p.bg, alin: 'center' }), T('18:00 h · Online', 340, 940, 400, 36, { fuente: ARI, color: p.bg, alin: 'center', peso: 800 }), ic('ubicacion', 500, 1090, 80, p.t)] };
  });
  def('anu-empleo', 'Buscamos talento', 'anu', 1080, 1080, function (w, h, p) {
    return { fondo: { tipo: 'solido', c1: p.bg }, capas: [Rc(0, 0, 360, 1080, p.a), ic('usuario', 70, 300, 220, p.c), T('ESTAMOS\nCONTRATANDO', 420, 140, 620, 120, { fuente: IMP, color: window.Color.textoSobre(p.bg), alin: 'left', interlineado: 0.95 }), T('Diseñador/a gráfico\n• Remoto\n• Jornada completa', 420, 480, 620, 44, { fuente: ARI, color: window.Color.textoSobre(p.bg), alin: 'left', interlineado: 1.6, peso: 600 }), Rc(420, 860, 500, 90, p.b, { radio: 12 }), T('Envía tu CV', 420, 880, 500, 50, { fuente: ARI, color: p.t, alin: 'center', peso: 900 })] };
  });
  def('anu-viernes', 'Viernes negro', 'anu', 1080, 1080, function (w, h, p) {
    return { fondo: { tipo: 'solido', c1: '#000000' }, capas: [Rc(-100, 130, 1300, 120, '#ffd600', { rot: -8 }), T('BLACK FRIDAY', 60, 140, 960, 100, { fuente: IMP, color: '#000', alin: 'center', rot: 0 }), T('HASTA\n70% DTO', 60, 330, 960, 220, { fuente: IMP, color: '#ffffff', alin: 'center', interlineado: 0.9 }), T('Solo 24 horas · Stock limitado', 60, 800, 960, 44, { fuente: ARI, color: '#ffd600', peso: 800, alin: 'center' }), ic('regalo', 440, 880, 200, '#ffd600')] };
  });
  /* ---------- tarjetas ---------- */
  def('tar-visita', 'Tarjeta de visita', 'tar', 1050, 600, function (w, h, p) {
    return { fondo: { tipo: 'solido', c1: p.bg }, capas: [Rc(0, 0, 40, 600, p.b), T('Nombre Apellido', 100, 90, 800, 66, { fuente: TRE, peso: 900, color: window.Color.textoSobre(p.bg), alin: 'left' }), T('DISEÑADOR/A', 100, 175, 800, 30, { fuente: ARI, peso: 800, color: p.b, alin: 'left', espaciado: 5 }), ic('telefono', 100, 340, 36, p.b), T('+34 600 000 000', 156, 340, 700, 34, { fuente: ARI, color: window.Color.textoSobre(p.bg), alin: 'left' }), ic('correo', 100, 400, 36, p.b), T('hola@ejemplo.com', 156, 400, 700, 34, { fuente: ARI, color: window.Color.textoSobre(p.bg), alin: 'left' }), ic('mundo', 100, 460, 36, p.b), T('www.ejemplo.com', 156, 460, 700, 34, { fuente: ARI, color: window.Color.textoSobre(p.bg), alin: 'left' }), F('elipse', 760, 60, 240, 240, p.c, { opacidad: 0.8 })] };
  });
  def('tar-invitacion', 'Invitación', 'tar', 1080, 1350, function (w, h, p) {
    return { fondo: G(p.a, p.bg, 180), capas: [Rc(60, 60, 960, 1230, null, { trazo: { color: p.c, ancho: 6 } }), Rc(90, 90, 900, 1170, null, { trazo: { color: p.c, ancho: 2 } }), T('ESTÁS INVITADO/A', 120, 200, 840, 44, { fuente: ARI, color: p.c, peso: 800, alin: 'center', espaciado: 6 }), T('Nuestra\nCelebración', 120, 330, 840, 130, { fuente: GEO, cursiva: true, color: p.t, alin: 'center', interlineado: 1.05 }), ic('corazon', 490, 700, 100, p.c), T('Sábado 20 · 19:00 h\nSalón Principal', 120, 880, 840, 52, { fuente: PAL, color: p.t, alin: 'center', interlineado: 1.5 })] };
  });
  def('tar-felicitacion', 'Felicitación', 'tar', 1080, 1080, function (w, h, p) {
    var c = [F('elipse', 60, 60, 300, 300, p.b, { opacidad: 0.5 }), F('elipse', 760, 700, 380, 380, p.c, { opacidad: 0.5 }), ic('regalo', 440, 140, 200, p.a), T('¡FELIZ\nCUMPLE!', 90, 400, 900, 190, { fuente: IMP, color: p.t === '#ffffff' ? p.c : p.a, alin: 'center', interlineado: 0.95, contorno: S(p.bg, 6) }), T('Que todos tus deseos se cumplan', 90, 880, 900, 40, { fuente: TRE, color: p.t, alin: 'center', peso: 700 })];
    return { fondo: G(p.bg, p.a, 120), capas: c };
  });
  def('tar-gracias', 'Agradecimiento', 'tar', 1080, 1080, function (w, h, p) {
    return { fondo: { tipo: 'solido', c1: p.c }, capas: [T('Gracias', 60, 300, 960, 230, { fuente: GEO, cursiva: true, peso: 700, color: p.a, alin: 'center' }), Rc(440, 600, 200, 6, p.a), T('Por ser parte de esta historia', 60, 650, 960, 44, { fuente: TRE, color: p.a, alin: 'center', peso: 700 }), ic('corazon', 480, 780, 120, p.a)] };
  });
  /* ---------- banners ---------- */
  def('ban-canal', 'Banner de canal 2560x1440', 'ban', 2560, 1440, function (w, h, p) {
    return { fondo: G(p.a, p.b, 100), capas: [F('elipse', -300, 500, 1400, 1400, p.c, { opacidad: 0.2 }), F('elipse', 1700, -400, 1400, 1400, p.bg, { opacidad: 0.3 }), T('NOMBRE DEL CANAL', 430, 560, 1700, 190, { fuente: IMP, color: p.t, alin: 'center', contorno: S('#000', 8), sombra: SOM(0.5) }), T('Nuevos vídeos cada semana', 430, 790, 1700, 70, { fuente: TRE, peso: 800, color: p.c, alin: 'center' })] };
  });
  def('ban-x', 'Cabecera X / Twitter', 'ban', 1500, 500, function (w, h, p) {
    return { fondo: G(p.bg, p.a, 90), capas: [T('Tu nombre o marca', 60, 150, 900, 90, { fuente: TRE, peso: 900, color: p.t, alin: 'left' }), T('Lo que haces en una línea', 60, 270, 900, 40, { fuente: ARI, color: p.c, alin: 'left', peso: 700 }), F('estrella', 1000, 80, 340, 340, p.b, { puntas: 8, interior: 0.6, opacidad: 0.7, rot: 20 })] };
  });
  def('ban-fb', 'Portada de Facebook', 'ban', 1640, 624, function (w, h, p) {
    return { fondo: { tipo: 'solido', c1: p.a }, capas: [Rc(0, 430, 1640, 194, p.b), T('Bienvenidos a nuestra página', 80, 150, 1200, 90, { fuente: TRE, peso: 900, color: p.t, alin: 'left' }), T('Comunidad · Noticias · Eventos', 80, 270, 1200, 44, { fuente: ARI, color: p.c, peso: 700, alin: 'left' }), F('elipse', 1250, 60, 300, 300, p.c, { opacidad: 0.8 })] };
  });
  def('ban-in', 'Banner de LinkedIn', 'ban', 1584, 396, function (w, h, p) {
    return { fondo: G(p.bg, p.a, 0), capas: [T('Soluciones que impulsan tu negocio', 520, 120, 1000, 70, { fuente: TRE, peso: 900, color: window.Color.textoSobre(p.bg), alin: 'left' }), T('Consultoría · Estrategia · Resultados', 520, 220, 1000, 34, { fuente: ARI, color: p.b, peso: 700, alin: 'left' }), F('poligono', 1300, 30, 280, 280, p.b, { lados: 6, opacidad: 0.5 })] };
  });
  /* ---------- logos 1000x1000 (con nombre editable) ---------- */
  function ini(n) { return String(n || 'Marca').split(/\s+/).map(function (s) { return s[0]; }).join('').slice(0, 2).toUpperCase(); }
  function logo(est) {
    return function (w, h, p, a) {
      var nom = (a && a.nombre) || 'Mi Marca', lema = (a && a.lema) || 'SLOGAN AQUÍ', iniciales = ini(nom), tc = window.Color.textoSobre(p.bg);
      if (est === 0) return { fondo: { tipo: 'solido', c1: p.bg }, capas: [F('elipse', 250, 140, 500, 500, G(p.b, p.a, 135)), T(iniciales, 250, 290, 500, 220, { fuente: IMP, color: '#ffffff', alin: 'center' }), T(nom, 100, 700, 800, 90, { fuente: TRE, peso: 900, color: tc, alin: 'center' }), T(lema, 100, 810, 800, 34, { fuente: ARI, color: p.c, peso: 700, alin: 'center', espaciado: 8 })] };
      if (est === 1) return { fondo: { tipo: 'solido', c1: p.bg }, capas: [Rc(280, 150, 440, 440, p.b, { radio: 90 }), T(iniciales, 280, 270, 440, 200, { fuente: GEO, peso: 700, color: p.bg, alin: 'center' }), T(nom.toUpperCase(), 100, 680, 800, 80, { fuente: ARI, peso: 800, color: tc, alin: 'center', espaciado: 14 }), Rc(440, 800, 120, 6, p.c)] };
      if (est === 2) return { fondo: { tipo: 'solido', c1: p.bg }, capas: [F('poligono', 240, 100, 520, 520, p.a, { lados: 6, trazo: { color: p.c, ancho: 14 } }), T(iniciales, 240, 270, 520, 200, { fuente: IMP, color: p.c, alin: 'center' }), T(nom, 100, 690, 800, 90, { fuente: PAL, peso: 700, color: tc, alin: 'center' }), T(lema, 100, 800, 800, 32, { fuente: ARI, color: p.b, peso: 700, alin: 'center', espaciado: 8 })] };
      if (est === 3) return { fondo: { tipo: 'solido', c1: p.bg }, capas: [F('elipse', 150, 150, 700, 700, null, { trazo: { color: p.b, ancho: 16 } }), F('elipse', 190, 190, 620, 620, null, { trazo: { color: p.c, ancho: 4 } }), T(nom.toUpperCase(), 250, 380, 500, 90, { fuente: IMP, color: tc, alin: 'center' }), T(lema, 250, 520, 500, 28, { fuente: ARI, color: p.b, peso: 800, alin: 'center', espaciado: 6 }), ic('estrella', 465, 270, 70, p.c), ic('estrella', 465, 640, 70, p.c)] };
      if (est === 4) return { fondo: { tipo: 'solido', c1: p.bg }, capas: [Rc(140, 430, 90, 10, p.b), T(nom, 140, 440, 720, 120, { fuente: TRE, peso: 300, color: tc, alin: 'left', espaciado: 4 }), T(lema, 140, 590, 720, 30, { fuente: ARI, color: p.c, peso: 600, alin: 'left', espaciado: 10 })] };
      return { fondo: G(p.a, p.bg, 135), capas: [F('estrella', 300, 130, 400, 400, G(p.c, p.b, 90), { puntas: 5, interior: 0.5, rot: -10 }), T(nom, 100, 620, 800, 110, { fuente: IMP, color: '#ffffff', alin: 'center', contorno: S(p.bg, 6) }), T(lema, 100, 760, 800, 34, { fuente: ARI, color: p.c, peso: 800, alin: 'center', espaciado: 8 })] };
    };
  }
  ['Iniciales en círculo', 'Monograma cuadrado', 'Emblema hexagonal', 'Insignia redonda', 'Texto lineal', 'Estrella creativa'].forEach(function (n, i) { def('logo-' + i, n, 'logo', 1000, 1000, logo(i)); });

  /* ---------- construccion ---------- */
  function ajustar(capas) {
    Doc.recorrer(capas, function (c) { if (c.tipo === 'texto') { IM.Render.ajustarTexto(c); if (c.x === undefined) c.x = 0; } });
    return capas;
  }
  P.construir = function (tpl, pal, args) {
    var r = tpl.build(tpl.w, tpl.h, pal, args || {}), pags = r.paginas || [r];
    return pags.map(function (pg) {
      var pa = Doc.pagina(tpl.w, tpl.h, pg.fondo); pa.capas = ajustar(pg.capas.filter(Boolean)); return pa;
    });
  };
  P.aplicar = function (tpl, pal, args) {
    var E = IM.E; E.cambioDoc('Plantilla ' + tpl.nombre, function () { E.proy.paginas = P.construir(tpl, pal, args); E.pi = 0; if (E.proy.nombre === 'Sin título') E.proy.nombre = tpl.nombre; });
    E.emit('ajustar'); E.emit('proyecto');
  };
  /* ---------- stickers (grupos vectoriales) ---------- */
  function grupo(nombre, capas, w, h) { return Doc.capa('grupo', { nombre: nombre, hijos: capas, w: w, h: h }); }
  var c0 = function (f, w, h, rel, o) { return F(f, -w / 2, -h / 2, w, h, rel, o); };
  var t0 = function (t, w, tam, o) { return T(t, -w / 2, 0, w, tam, Object.assign({ _arriba: false }, o || {})); };
  function txtC(t, w, tam, o, dy) { var c = Doc.capa('texto', Object.assign({ texto: t, w: w, tam: tam, nombre: 'Texto' }, o)); c.x = 0; c.y = dy || 0; IM.Render.ajustarTexto(c); return c; }
  P.stickers = [
    ['Sello NUEVO', function () { return grupo('Sello NUEVO', [c0('estrella', 300, 300, '#ef4444', { puntas: 16, interior: 0.82 }), txtC('NUEVO', 220, 60, { fuente: IMP, color: '#ffffff', alin: 'center', contorno: S('#7f1d1d', 3) })], 300, 300); }],
    ['-50%', function () { return grupo('Descuento', [c0('elipse', 280, 280, '#fde047', { trazo: { color: '#ef4444', ancho: 12 } }), txtC('-50%', 240, 100, { fuente: IMP, color: '#dc2626', alin: 'center' })], 280, 280); }],
    ['Cinta OFERTA', function () { return grupo('Cinta OFERTA', [c0('rect', 420, 90, '#ef4444', { sombra: SOM(0.4) }), txtC('OFERTA', 380, 60, { fuente: ARI, peso: 900, color: '#fff', alin: 'center', espaciado: 8 })], 420, 90); }],
    ['GRATIS', function () { return grupo('GRATIS', [c0('burbuja', 380, 240, '#22c55e', { cola: -0.5, trazo: { color: '#14532d', ancho: 8 } }), txtC('¡GRATIS!', 320, 70, { fuente: IMP, color: '#fff', alin: 'center', contorno: S('#14532d', 3) }, -22)], 380, 240); }],
    ['TOP 1', function () { return grupo('TOP 1', [c0('elipse', 260, 260, '#fbbf24', { trazo: { color: '#92400e', ancho: 10 } }), F('icono', -50, -110, 100, 100, '#92400e', { icono: 'corona' }), txtC('TOP 1', 200, 70, { fuente: IMP, color: '#78350f', alin: 'center' }, 20)], 260, 260); }],
    ['Verificado', function () { return grupo('Verificado', [F('icono', -120, -120, 240, 240, '#2563eb', { icono: 'verificado', sombra: SOM(0.3) })], 240, 240); }],
    ['¡WOW!', function () { return grupo('WOW', [c0('estrella', 340, 300, '#facc15', { puntas: 12, interior: 0.6, trazo: { color: '#000', ancho: 8 } }), txtC('¡WOW!', 240, 80, { fuente: IMP, color: '#e11d48', alin: 'center', contorno: S('#000', 4) })], 340, 300); }],
    ['Círculo marcador', function () { return grupo('Círculo marcador', [c0('elipse', 320, 220, null, { trazo: { color: '#ef4444', ancho: 12 }, rot: -6 })], 320, 220); }],
    ['Flecha roja', function () { return grupo('Flecha roja', [c0('flecha', 360, 160, '#ef4444', { sombra: SOM(0.4), rot: -20 })], 360, 160); }],
    ['Subrayado', function () { return grupo('Subrayado', [c0('linea', 420, 14, null, { trazo: { color: '#facc15', ancho: 14 } })], 420, 14); }],
    ['Botón PLAY', function () { return grupo('Botón PLAY', [c0('rect', 300, 200, '#ef4444', { radio: 60, sombra: SOM(0.4) }), F('icono', -50, -50, 100, 100, '#ffffff', { icono: 'play' })], 300, 200); }],
    ['Prohibido', function () { return grupo('Prohibido', [c0('elipse', 240, 240, null, { trazo: { color: '#ef4444', ancho: 22 } }), c0('linea', 190, 22, null, { trazo: { color: '#ef4444', ancho: 22 }, rot: -45 })], 240, 240); }]
  ];
  P.memeTexto = function () {
    var p = IM.E.pagina(), o = { fuente: IMP, color: '#ffffff', contorno: S('#000000', Math.round(p.w / 120)), mayus: true, alin: 'center', interlineado: 1, tam: Math.round(p.w / 9) };
    var a = Doc.capa('texto', Object.assign({ texto: 'Texto superior', w: p.w * 0.94, nombre: 'Meme arriba' }, o)), b = Doc.capa('texto', Object.assign({ texto: 'Texto inferior', w: p.w * 0.94, nombre: 'Meme abajo' }, o));
    IM.Render.ajustarTexto(a); IM.Render.ajustarTexto(b); a.x = b.x = p.w / 2; a.y = a.h / 2 + p.h * 0.02; b.y = p.h - b.h / 2 - p.h * 0.02;
    IM.E.agregar(a, { centrar: false, nombre: 'Meme: texto superior' }); IM.E.agregar(b, { centrar: false, nombre: 'Meme: texto inferior' });
  };
  P.combinaciones = [
    ['Impact + Arial', IMP, ARI], ['Georgia + Verdana', GEO, VER], ['Trebuchet + Palatino', TRE, PAL], ['Arial negrita + Georgia', ARI, GEO], ['Courier + Arial', COU, ARI], ['Palatino + Trebuchet', PAL, TRE],
    ['Verdana + Georgia', VER, GEO], ['Impact + Georgia', IMP, GEO], ['Georgia cursiva + Arial', GEO, ARI], ['Tahoma + Times', 'Tahoma, Geneva, sans-serif', '"Times New Roman", Times, serif'], ['Helvetica + Courier', 'Helvetica, Arial, sans-serif', COU], ['Garamond + Verdana', 'Garamond, "Times New Roman", serif', VER]
  ];
})(window.IM);
