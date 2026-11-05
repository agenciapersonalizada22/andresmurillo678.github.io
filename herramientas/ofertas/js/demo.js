/* Generador determinista de ofertas de ejemplo (modo demo del navegador y fixtures de pruebas). Los datos son FICTICIOS. UMD. */
(function (g, fab) {
  if (typeof module === 'object' && module.exports) module.exports = fab();
  else { g.Of = g.Of || {}; g.Of.demo = fab(); }
})(typeof self !== 'undefined' ? self : this, function () {
  var TASAS = { EUR: 0.92, GBP: 0.79, MXN: 17.2, COP: 4100, ARS: 1000, BRL: 5.4, CLP: 940, PEN: 3.75, DOP: 59 };
  var TIENDAS = [
    ['Amazon ES', 'EUR', 'ES'], ['PcComponentes', 'EUR', 'ES'], ['MediaMarkt', 'EUR', 'ES'], ['Amazon US', 'USD', 'US'], ['Best Buy', 'USD', 'US'],
    ['Walmart MX', 'MXN', 'MX'], ['Liverpool', 'MXN', 'MX'], ['Mercado Libre AR', 'ARS', 'AR'], ['Falabella', 'CLP', 'CL'], ['Mercado Libre CO', 'COP', 'CO'], ['Magalu', 'BRL', 'BR']
  ];
  var FUENTES = ['rss-chollos', 'rss-ofertas-tech', 'jsonld-tiendas', 'rss-promos-latam', 'feed-cupones'];
  var CATS = { laptops: '💻', moviles: '📱', audio: '🎧', tv: '📺', hogar: '🏠', gaming: '🎮', moda: '👟', cocina: '☕', deporte: '🚴', fotografia: '📷', libros: '📚', viajes: '✈️' };
  var CATALOGO = [
    ['Lenovo IdeaPad Slim 5', 'laptops', 620, ['14" 16GB 512GB', '15" 8GB 256GB', '16" 16GB 1TB']], ['ASUS Vivobook 15', 'laptops', 480, ['i5 8GB 512GB', 'Ryzen 7 16GB 512GB']],
    ['HP Pavilion Aero 13', 'laptops', 760, ['Ryzen 5 16GB 512GB', 'Ryzen 7 16GB 1TB']], ['Apple MacBook Air M2', 'laptops', 1050, ['8GB 256GB', '16GB 512GB']],
    ['Acer Nitro 5 Gaming', 'laptops', 890, ['RTX 4050 16GB', 'RTX 4060 16GB']], ['Apple iPhone 15', 'moviles', 810, ['128GB', '256GB', '512GB']],
    ['Samsung Galaxy S24', 'moviles', 760, ['128GB', '256GB']], ['Xiaomi Redmi Note 13', 'moviles', 210, ['8GB 256GB', '6GB 128GB']], ['Google Pixel 8', 'moviles', 620, ['128GB', '256GB']],
    ['Sony WH-1000XM5', 'audio', 330, ['Negro', 'Plata']], ['Apple AirPods Pro 2', 'audio', 250, ['USB-C']], ['JBL Charge 5 altavoz', 'audio', 160, ['Bluetooth']], ['Bose QuietComfort Ultra auriculares', 'audio', 400, ['Negro']],
    ['Samsung QLED 55 pulgadas Q60C', 'tv', 620, ['4K']], ['LG OLED C3 65 pulgadas', 'tv', 1500, ['4K 120Hz']], ['Xiaomi Smart TV A 43 pulgadas', 'tv', 280, ['4K']],
    ['Dyson V12 Detect aspiradora', 'hogar', 520, ['Slim']], ['Roomba j7 robot aspirador', 'hogar', 440, ['WiFi']], ['Philips Airfryer XXL', 'cocina', 190, ['7.3L']], ['Nespresso Vertuo Pop cafetera', 'cocina', 99, ['Rojo']],
    ['Sony PlayStation 5 consola', 'gaming', 520, ['Slim 1TB', 'Digital 1TB']], ['Nintendo Switch OLED consola', 'gaming', 330, ['Blanca']], ['Xbox Series X consola', 'gaming', 480, ['1TB']], ['Logitech G502 raton gamer', 'gaming', 60, ['HERO']],
    ['Nike Air Zoom Pegasus 40 zapatillas', 'moda', 130, ['Hombre', 'Mujer']], ['Adidas Ultraboost Light zapatillas', 'moda', 160, ['Hombre']], ['Levis 501 vaqueros', 'moda', 90, ['Original']],
    ['Garmin Forerunner 265 reloj', 'deporte', 450, ['Negro']], ['Xiaomi Mi Electric Scooter 4', 'deporte', 380, ['Pro']], ['Canon EOS R50 camara', 'fotografia', 780, ['Kit 18-45']], ['GoPro HERO12 camara', 'fotografia', 360, ['Black']],
    ['Kindle Paperwhite libro electronico', 'libros', 150, ['16GB']], ['Vuelo Madrid - Lisboa ida y vuelta', 'viajes', 70, ['Marzo']], ['Hotel 3 noches Cancun todo incluido', 'viajes', 520, ['Marzo']]
  ];
  function rng(sem) { var a = sem >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var DECOR = ['', '', '', ' - Envío gratis', ' | Oferta', ' (nuevo)'];
  /* opciones: n, ahora, semilla, etiquetar (marca de demo) */
  function generar(o) {
    o = o || {};
    var n = o.n || 140, ahora = o.ahora || Date.now(), R = rng(o.semilla || 7), items = [], hist = {}, dia = 86400000, k;
    var cupones = ['AHORRA10', 'PRIMAVERA15', 'ENVIOGRATIS', 'TECH20', 'BIENVENIDA'];
    for (k = 0; k < n; k++) {
      var pr = CATALOGO[(R() * CATALOGO.length) | 0], vari = pr[3][(R() * pr[3].length) | 0], ti = TIENDAS[(R() * TIENDAS.length) | 0];
      var baseUsd = pr[2] * (0.9 + R() * 0.2), tasa = ti[1] === 'USD' ? 1 : TASAS[ti[1]];
      var tipo = R(), edadH = Math.pow(R(), 2) * 160;
      var typical = baseUsd * tasa * (0.95 + R() * 0.1), precio, antes, hs = [], t, p;
      var esInflado = tipo < 0.15, esBueno = tipo > 0.55 && tipo < 0.8, minHist = tipo >= 0.8;
      precio = typical * (esBueno ? 0.78 + R() * 0.17 : minHist ? 0.7 + R() * 0.05 : esInflado ? 0.88 + R() * 0.08 : 0.8 + R() * 0.2);
      antes = esInflado ? typical * (1.5 + R() * 0.4) : typical * (1.02 + R() * 0.12);
      if (!esInflado && antes <= precio) antes = precio * 1.2;
      var np = 24 + ((R() * 8) | 0);
      for (t = np; t >= 1; t--) {
        p = typical * (0.97 + R() * 0.06);
        if (R() < 0.08) p *= 0.9;
        if (minHist && t > 2) p = Math.max(p, precio * 1.12);
        hs.push([Math.round(ahora - t * 3 * dia), roundP(p, ti[1])]);
      }
      hs.push([Math.round(ahora - edadH * 3600000), roundP(precio, ti[1])]);
      precio = roundP(precio, ti[1]); antes = roundP(antes, ti[1]);
      var id = 'of' + (1000 + k), desc = Math.round((1 - precio / antes) * 100);
      var it = { id: id, titulo: pr[0] + ' ' + vari + DECOR[(R() * DECOR.length) | 0], tienda: ti[0], precio: precio, precioAntes: antes, descuentoPct: desc, moneda: ti[1],
        url: o.etiquetar ? 'https://example.invalid/demo/' + id : 'https://example.com/p/' + id, categoria: pr[1], fecha: new Date(ahora - edadH * 3600000).toISOString(),
        fuente: o.etiquetar ? 'demo-datos-de-ejemplo' : FUENTES[(R() * FUENTES.length) | 0], pais: ti[2] };
      if (R() < 0.3) it.cupon = cupones[(R() * cupones.length) | 0];
      if (R() < 0.45) it.vence = new Date(ahora + (R() < 0.15 ? -1 : 1) * (0.2 + R() * 6) * dia).toISOString();
      if (o.etiquetar) it.demo = true;
      items.push(it); hist[id] = hs;
    }
    var nf = {}; FUENTES.forEach(function (f, i) { nf[f] = { ok: i !== 3, ultimo: new Date(ahora - (i + 1) * 600000).toISOString(), items: Math.round(n / FUENTES.length) }; if (i === 3) nf[f].error = 'HTTP 503 al descargar el feed'; });
    return {
      ofertas: { generado: new Date(ahora - (o.edadMin || 12) * 60000).toISOString(), fuente: o.etiquetar ? 'demo' : 'agregador', items: items },
      historial: hist,
      divisas: { generado: new Date(ahora).toISOString(), fuente: 'demo', base: 'USD', tasas: Object.assign({ USD: 1 }, TASAS) },
      estado: { generado: new Date(ahora - 300000).toISOString(), fuentes: nf }
    };
  }
  function roundP(p, mon) { return mon === 'COP' || mon === 'CLP' || mon === 'ARS' ? Math.round(p / 100) * 100 : Math.round(p) - 0.01; }
  return { generar: generar, TIENDAS: TIENDAS, CATS: CATS, TASAS: TASAS };
});
