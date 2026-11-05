/* Constructor de fuentes: parseo tolerante de RSS/Atom/JSON-LD, validacion y generacion de config para scripts/datos/config.json. UMD. */
(function (g, fab) {
  if (typeof module === 'object' && module.exports) module.exports = fab();
  else { g.Of = g.Of || {}; g.Of.fuentes = fab(); }
})(typeof self !== 'undefined' ? self : this, function () {
  /* Claves de la config del proceso programado. Si el recolector usa otros nombres, se cambian solo aqui. */
  var ESQUEMA = { raiz: 'ofertas', fuentes: 'fuentes', palabras: 'busqueda' };

  function decodificar(s) {
    return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, function (m, e) {
      var t = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[e.toLowerCase()];
      if (t) return t;
      var c = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(c); } catch (x) { return m; }
    });
  }
  function limpiarHtml(s) { return decodificar(decodificar(s)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
  function numero(s) {
    s = String(s).replace(/[^\d.,]/g, '');
    if (!s) return NaN;
    var c = s.lastIndexOf(','), p = s.lastIndexOf('.');
    if (c >= 0 && p >= 0) s = c > p ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (c >= 0) s = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
    else if (p >= 0 && /\.\d{3}$/.test(s) && s.indexOf('.') === p) s = s.replace('.', '');
    return parseFloat(s);
  }
  var MON = { '€': 'EUR', '$': 'USD', '£': 'GBP', 'us$': 'USD', 'usd': 'USD', 'eur': 'EUR', 'gbp': 'GBP', 'mxn': 'MXN', 'cop': 'COP', 'ars': 'ARS', 'brl': 'BRL', 'clp': 'CLP', 'pen': 'PEN', 'dop': 'DOP' };
  function precioDeTexto(t) {
    var m = String(t || '').match(/(US\$|USD|EUR|GBP|MXN|COP|ARS|BRL|CLP|PEN|DOP|€|\$|£)\s?(\d[\d.,]*)/i) || String(t || '').match(/(\d[\d.,]*)\s?(US\$|USD|EUR|GBP|MXN|COP|ARS|BRL|CLP|PEN|DOP|€|£)/i);
    if (!m) return null;
    var simb = /^\d/.test(m[1]) ? m[2] : m[1], val = numero(/^\d/.test(m[1]) ? m[1] : m[2]);
    return isFinite(val) ? { precio: val, moneda: MON[simb.toLowerCase()] || null } : null;
  }
  function tag(bloque, nombre) {
    var m = bloque.match(new RegExp('<' + nombre + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + nombre + '>', 'i'));
    return m ? m[1] : '';
  }
  function attr(bloque, nombre, a, filtro) {
    var re = new RegExp('<' + nombre + '\\b([^>]*)>', 'gi'), m;
    while ((m = re.exec(bloque))) {
      if (filtro && !filtro.test(m[1])) continue;
      var x = m[1].match(new RegExp('\\b' + a + '\\s*=\\s*["\']([^"\']*)["\']', 'i'));
      if (x) return decodificar(x[1]);
    }
    return '';
  }
  function parsearXml(texto, tipo) {
    var re = tipo === 'atom' ? /<entry\b[\s\S]*?<\/entry>/gi : /<item\b[\s\S]*?<\/item>/gi, items = [], m;
    while ((m = re.exec(texto)) && items.length < 200) {
      var b = m[0], titulo = limpiarHtml(tag(b, 'title'));
      var enlace = tipo === 'atom' ? (attr(b, 'link', 'href', /rel\s*=\s*["']alternate["']/i) || attr(b, 'link', 'href')) : decodificar(tag(b, 'link')).trim() || attr(b, 'link', 'href');
      var fecha = decodificar(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date')).trim();
      var desc = tag(b, 'description') || tag(b, 'summary') || tag(b, 'content') || tag(b, 'content:encoded');
      var gp = decodificar(tag(b, 'g:price') || tag(b, 'price')).trim(), pr = gp ? precioDeTexto(gp) || (isFinite(numero(gp)) ? { precio: numero(gp), moneda: null } : null) : null;
      if (gp && pr && !pr.moneda) { var cm = gp.match(/[A-Z]{3}/); if (cm) pr.moneda = cm[0]; }
      if (!pr) pr = precioDeTexto(titulo) || precioDeTexto(limpiarHtml(desc));
      var img = attr(b, 'enclosure', 'url') || attr(b, 'media:content', 'url') || attr(b, 'media:thumbnail', 'url') || decodificar(tag(b, 'g:image_link')).trim() || ((decodificar(desc).match(/<img[^>]+src=["']([^"']+)/i) || [])[1] || '');
      items.push({ titulo: titulo, enlace: (enlace || '').trim(), fecha: fecha, precio: pr ? pr.precio : null, moneda: pr ? pr.moneda : null, imagen: img, descripcion: limpiarHtml(desc).slice(0, 160) });
    }
    return items;
  }
  function jsonld(texto) {
    var re = /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, m, out = [], malos = 0;
    function visitar(n, prof) {
      if (!n || typeof n !== 'object' || prof > 8) return;
      if (Array.isArray(n)) { n.forEach(function (x) { visitar(x, prof + 1); }); return; }
      var t = [].concat(n['@type'] || []).join(',');
      if (/Product/i.test(t)) {
        var of = [].concat(n.offers || [])[0] || {}, img = [].concat(n.image || [])[0];
        out.push({ titulo: String(n.name || ''), enlace: of.url || n.url || '', fecha: of.priceValidUntil || '', precio: numero(of.price != null ? of.price : of.lowPrice != null ? of.lowPrice : ''),
          moneda: of.priceCurrency || null, imagen: img && typeof img === 'object' ? img.url || '' : img || '', descripcion: String(n.description || '').slice(0, 160) });
      } else if (/ItemList/i.test(t) && n.itemListElement) visitar(n.itemListElement.map(function (e) { return e && e.item ? e.item : e; }), prof + 1);
      if (n['@graph']) visitar(n['@graph'], prof + 1);
    }
    while ((m = re.exec(texto))) { try { visitar(JSON.parse(decodificar(m[1]).trim()), 0); } catch (e) { malos++; } }
    return { items: out, malos: malos };
  }
  function parsearFeed(texto) {
    texto = String(texto || '');
    var cab = texto.slice(0, 2000), tipo = 'desconocido', items = [], avisos = [];
    if (/<rss\b|<rdf:RDF\b|<channel\b/i.test(cab)) { tipo = 'rss'; items = parsearXml(texto, 'rss'); }
    else if (/<feed\b/i.test(cab)) { tipo = 'atom'; items = parsearXml(texto, 'atom'); }
    else {
      var j = jsonld(texto);
      if (j.items.length) { tipo = 'jsonld'; items = j.items; }
      else if (/<html|<!doctype/i.test(cab)) avisos.push('Es una pagina HTML sin datos JSON-LD de productos (Product/Offer). Prueba con el feed RSS de la tienda o con la URL de una ficha de producto.');
      else avisos.push('No parece RSS, Atom ni una pagina con JSON-LD.');
      if (j.malos) avisos.push(j.malos + ' bloque(s) JSON-LD no se pudieron leer.');
    }
    var campos = { titulo: 0, enlace: 0, precio: 0, imagen: 0, fecha: 0 };
    items.forEach(function (i) { Object.keys(campos).forEach(function (k) { if (i[k] != null && i[k] !== '' && !(typeof i[k] === 'number' && isNaN(i[k]))) campos[k]++; }); });
    if (tipo !== 'desconocido') {
      if (!items.length) avisos.push('El feed no contiene elementos.');
      else {
        if (!campos.precio) avisos.push('Ningun elemento trae precio: el recolector solo podra usarlos si el titulo o la descripcion incluyen el precio.');
        else if (campos.precio <= items.length / 2) avisos.push('La mitad o menos de los elementos trae precio (' + campos.precio + '/' + items.length + ').');
        if (!campos.enlace) avisos.push('Faltan enlaces.');
      }
    }
    return { tipo: tipo, items: items, total: items.length, campos: campos, avisos: avisos };
  }
  function validarUrl(u) {
    u = String(u || '').trim();
    if (!u) return { ok: false, error: 'Escribe una URL.' };
    var x; try { x = new URL(u); } catch (e) { return { ok: false, error: 'La URL no es valida (incluye https://).' }; }
    if (!/^https?:$/.test(x.protocol)) return { ok: false, error: 'Solo se admiten URL http o https.' };
    if (/^(localhost|127\.|10\.|192\.168\.|0\.0\.0\.0)/.test(x.hostname) || /\.(local|internal)$/.test(x.hostname)) return { ok: false, error: 'La URL apunta a una red privada: el proceso programado no podra llegar a ella.' };
    var av = x.protocol === 'http:' ? ['Usa https si la tienda lo permite.'] : [];
    return { ok: true, url: x.href, host: x.hostname.replace(/^www\./, ''), avisos: av };
  }
  function adivinarTipo(url, ct) {
    var s = (String(url) + ' ' + (ct || '')).toLowerCase();
    if (/atom/.test(s)) return 'atom';
    if (/rss|\/feed|\.xml|xml/.test(s)) return 'rss';
    return 'jsonld';
  }
  function slug(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'fuente'; }
  var TIPO = { rss: 'feed', atom: 'feed', feed: 'feed', jsonld: 'jsonld', sitemap: 'sitemap' };
  function bloqueFuente(d) {
    var v = validarUrl(d.url), o = {};
    var tienda = d.tienda || (v.ok ? v.host : '');
    o.id = slug(d.id || d.tienda || (v.ok ? v.host : 'fuente'));
    o.tipo = TIPO[d.tipo && d.tipo !== 'auto' ? d.tipo : 'rss'] || 'feed';
    o.nombre = d.nombre || tienda || o.id;
    o.url = v.ok ? v.url : String(d.url || '');
    if (tienda) o.tienda = tienda;
    if (d.moneda) o.moneda = String(d.moneda).toUpperCase();
    var pais = String(d.pais || '').toUpperCase();
    if (d.idioma === 'es' || d.idioma === 'en') o.idioma = d.idioma;
    else if (pais) o.idioma = /^(ES|MX|AR|CO|CL|PE|DO|VE|UY|EC|BO|PY|CR|PA|GT|HN|NI|SV|CU)$/.test(pais) ? 'es' : 'en';
    if (d.categoria) o.categoria = d.categoria;
    o.activo = d.activa !== false && d.activo !== false;
    return o;
  }
  /* Formato del proceso programado (scripts/datos/config.json): ofertas.fuentes[] y ofertas.busqueda.palabras[] (texto).
     Los umbrales de precio/descuento de las alertas NO existen en el proceso: se evaluan solo en esta app. */
  function config(fuentes, palabras) {
    var r = {}, c = r[ESQUEMA.raiz] = {};
    if (fuentes && fuentes.length) c[ESQUEMA.fuentes] = fuentes;
    if (palabras && palabras.length) c[ESQUEMA.palabras] = { activo: true, palabras: palabras.map(function (p) { return p.texto || String(p); }) };
    return r;
  }
  function palabrasDeAlertas(alertas) {
    return alertas.filter(function (a) { return a.tipo === 'palabra' && a.activa && a.consulta; }).map(function (a) {
      var o = { texto: a.consulta };
      if (a.precioMax) { o.precioMax = a.precioMax; o.moneda = a.moneda; }
      if (a.descMin) o.descuentoMin = a.descMin;
      return o;
    });
  }
  function texto(obj) { return JSON.stringify(obj, null, 2); }
  var INSTRUCCIONES = [
    'Abre scripts/datos/config.json en la rama principal del repositorio (en GitHub: Editar este archivo).',
    'Dentro del objeto "ofertas" anade el bloque de la fuente a la lista "fuentes" (si ya existe, separa con una coma). Las palabras clave van en "busqueda" (campo "palabras"; la busqueda por palabras requiere la clave BRAVE_SEARCH_KEY como secreto del repositorio).',
    'Guarda (commit). El proceso programado de GitHub Actions lo leera en su siguiente ejecucion; las ofertas aparecen aqui unos minutos despues.',
    'Comprueba la pestana Fuentes: la nueva fuente debe figurar con estado correcto. Si falla, el error aparece junto a su nombre.'
  ];
  return { ESQUEMA: ESQUEMA, parsearFeed: parsearFeed, validarUrl: validarUrl, adivinarTipo: adivinarTipo, bloqueFuente: bloqueFuente, config: config,
    palabrasDeAlertas: palabrasDeAlertas, texto: texto, INSTRUCCIONES: INSTRUCCIONES, precioDeTexto: precioDeTexto, numero: numero, slug: slug };
});
