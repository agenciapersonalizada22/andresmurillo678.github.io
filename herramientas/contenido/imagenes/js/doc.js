/* Modelo del documento: capas, paginas, instantaneas para deshacer, almacen de pixeles. */
(function (IM) {
  var Matriz = window.Matriz, D = {};
  /* ---- almacen de pixeles: id -> {canvas, proxy, sucio} ---- */
  var Pix = {}, mapa = {};
  Pix.nuevo = function (canvas, id) { id = id || IM.uid(); mapa[id] = { canvas: canvas, proxy: null, sucio: true }; return id; };
  Pix.get = function (id) { return mapa[id] ? mapa[id].canvas : null; };
  Pix.reg = function (id) { return mapa[id]; };
  Pix.tiene = function (id) { return !!mapa[id]; };
  Pix.invalidar = function (id) { if (mapa[id]) { mapa[id].proxy = null; mapa[id].sucio = true; } };
  Pix.proxy = function (id) {
    var r = mapa[id]; if (!r) return null;
    var c = r.canvas, m = Math.max(c.width, c.height);
    if (m <= 1024) return c;
    if (!r.proxy) { var k = 1024 / m, p = IM.lienzo(c.width * k, c.height * k), x = p.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, p.width, p.height); r.proxy = p; }
    return r.proxy;
  };
  Pix.clonar = function (id) {
    var c = Pix.get(id); if (!c) return null; var n = IM.lienzo(c.width, c.height); n.getContext('2d').drawImage(c, 0, 0); return Pix.nuevo(n);
  };
  Pix.todos = function () { return Object.keys(mapa); };
  Pix.borrar = function (id) { delete mapa[id]; };
  Pix.vaciar = function () { mapa = {}; };
  D.Pix = Pix;

  /* ---- fabricas ---- */
  var NOMBRES = { imagen: 'Imagen', texto: 'Texto', forma: 'Forma', grupo: 'Grupo', ajuste: 'Ajuste', qr: 'Código QR' };
  D.capa = function (tipo, p) {
    var c = { id: IM.uid(), tipo: tipo, nombre: NOMBRES[tipo] || tipo, visible: true, bloqueada: false, opacidad: 1, mezcla: 'normal',
      x: 0, y: 0, w: 100, h: 100, rot: 0, flipX: false, flipY: false, sombra: null, mascara: null, recorte: null };
    if (tipo === 'texto') Object.assign(c, { texto: 'Texto', fuente: 'Arial, Helvetica, sans-serif', tam: 64, peso: 700, cursiva: false, color: '#111111', relleno: null,
      alin: 'center', interlineado: 1.15, espaciado: 0, contorno: null, curva: 0, trazo: 'arco', mayus: false, subrayado: false, w: 400, h: 80 });
    if (tipo === 'forma') Object.assign(c, { forma: 'rect', lados: 5, puntas: 5, interior: 0.45, radio: 0, relleno: { tipo: 'solido', c1: '#4f46e5' }, trazo: null, icono: 'estrella', cola: -0.5, punta: false });
    if (tipo === 'ajuste') Object.assign(c, { ops: [['brillo', { v: 0 }]], w: 100, h: 100 });
    if (tipo === 'grupo') c.hijos = [];
    if (tipo === 'qr') Object.assign(c, { m: [], borde: 2, fg: '#000000', bg: '#ffffff', texto: '' });
    if (p) Object.assign(c, p);
    return c;
  };
  D.pagina = function (w, h, fondo) { return { id: IM.uid(), w: w, h: h, fondo: fondo === undefined ? { tipo: 'solido', c1: '#ffffff' } : fondo, capas: [], guias: [] }; };
  D.proyecto = function (w, h, nombre) {
    return { id: IM.uid(), nombre: nombre || 'Sin título', creado: Date.now(), paginas: [D.pagina(w, h)], ajustes: { cuadricula: false, ajuste: true, paso: 20, reglas: true, seguro: null } };
  };
  D.matriz = function (c) { return Matriz.componer(c.x, c.y, c.rot, c.flipX ? -1 : 1, c.flipY ? -1 : 1); };
  D.caja = function (c) { return Matriz.caja(Matriz.esquinas(D.matriz(c), c.w, c.h)); };
  D.buscar = function (lista, id, padre) {
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === id) return { capa: lista[i], lista: lista, indice: i, padre: padre || null };
      if (lista[i].hijos) { var r = D.buscar(lista[i].hijos, id, lista[i]); if (r) return r; }
    }
    return null;
  };
  D.recorrer = function (lista, f) { lista.forEach(function (c) { f(c); if (c.hijos) D.recorrer(c.hijos, f); }); };
  D.nuevoId = function (c) {
    c.id = IM.uid();
    if (c.hijos) c.hijos.forEach(D.nuevoId);
  };
  D.clonar = function (c) {
    var n = JSON.parse(JSON.stringify(c));
    D.nuevoId(n);
    D.recorrer([n], function (q) {
      if (q.tipo === 'imagen' && q.px) q.px = Pix.clonar(q.px);
      if (q.mascara) q.mascara = Pix.clonar(q.mascara);
    });
    return n;
  };
  D.pixUsados = function (proy) {
    var s = {};
    proy.paginas.forEach(function (p) { D.recorrer(p.capas, function (c) { if (c.px) s[c.px] = 1; if (c.mascara) s[c.mascara] = 1; }); });
    return s;
  };
  /* escala una capa respecto de (ox,oy) por k (para redimensionar lienzos) */
  D.escalar = function (c, k, ox, oy) {
    c.x = (c.x - ox) * k + ox; c.y = (c.y - oy) * k + oy; c.w *= k; c.h *= k;
    if (c.tam) c.tam *= k; if (c.espaciado) c.espaciado *= k; if (c.radio) c.radio *= k;
    if (c.trazo && c.trazo.ancho) c.trazo.ancho *= k; if (c.contorno && c.contorno.ancho) c.contorno.ancho *= k;
    if (c.sombra) { c.sombra.blur *= k; c.sombra.dx *= k; c.sombra.dy *= k; }
    if (c.hijos) c.hijos.forEach(function (h) { D.escalar(h, k, 0, 0); });
  };
  D.mover = function (c, dx, dy) { c.x += dx; c.y += dy; };

  /* ---- instantaneas para historial ---- */
  D.instantanea = function (p) {
    var capas = {}; p.capas.forEach(function (c) { capas[c.id] = JSON.stringify(c); });
    return { orden: p.capas.map(function (c) { return c.id; }), capas: capas, p: JSON.stringify({ w: p.w, h: p.h, fondo: p.fondo, guias: p.guias }) };
  };
  D.aplicar = function (p, inst) {
    var q = JSON.parse(inst.p); p.w = q.w; p.h = q.h; p.fondo = q.fondo; p.guias = q.guias;
    p.capas = inst.orden.map(function (id) { return JSON.parse(inst.capas[id]); });
  };
  D.diff = function (a, b) {
    var cambios = {}, n = 0, id;
    for (id in b.capas) if (a.capas[id] !== b.capas[id]) { cambios[id] = [a.capas[id] || null, b.capas[id]]; n++; }
    for (id in a.capas) if (!(id in b.capas)) { cambios[id] = [a.capas[id], null]; n++; }
    var ordenCambia = a.orden.join() !== b.orden.join(), pc = a.p !== b.p;
    if (!n && !ordenCambia && !pc) return null;
    return { capas: cambios, orden: [a.orden, b.orden], p: [a.p, b.p] };
  };
  D.parche = function (inst, d, dir) {
    var capas = Object.assign({}, inst.capas);
    for (var id in d.capas) { var v = d.capas[id][dir]; if (v === null) delete capas[id]; else capas[id] = v; }
    return { orden: d.orden[dir], capas: capas, p: d.p[dir] };
  };
  D.fusionarDiff = function (d1, d2) {
    var capas = {}, id;
    for (id in d1.capas) capas[id] = [d1.capas[id][0], d1.capas[id][1]];
    for (id in d2.capas) capas[id] = capas[id] ? [capas[id][0], d2.capas[id][1]] : [d2.capas[id][0], d2.capas[id][1]];
    return { capas: capas, orden: [d1.orden[0], d2.orden[1]], p: [d1.p[0], d2.p[1]] };
  };

  /* ---- ayudas para plantillas (esquina superior izquierda) ---- */
  D.texto = function (t, x, y, w, tam, o) {
    var c = D.capa('texto', Object.assign({ texto: t, tam: tam, w: w, h: 0 }, o || {}));
    c.x = x + w / 2; c.y = y; c.nombre = 'Texto'; c._arriba = true; return c;
  };
  D.rect = function (x, y, w, h, rel, o) {
    var c = D.capa('forma', Object.assign({ forma: 'rect', w: w, h: h, x: x + w / 2, y: y + h / 2, relleno: typeof rel === 'string' ? { tipo: 'solido', c1: rel } : rel, nombre: 'Forma' }, o || {}));
    return c;
  };
  D.forma = function (f, x, y, w, h, rel, o) { var c = D.rect(x, y, w, h, rel, o); c.forma = f; return c; };
  IM.Doc = D;
})(window.IM);
