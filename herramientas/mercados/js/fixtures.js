/* Datos de ejemplo DETERMINISTAS (modo demo y pruebas). No son datos reales: precios inventados con movimiento browniano sembrado. UMD. */
(function (root, factory) { var m = factory(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.Fixtures = m; })(typeof self !== 'undefined' ? self : this, function () {
  var DIA = 86400000;
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(sem) { var a = sem >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function normal(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function dia0(ahora) { return Math.floor(ahora / DIA) * DIA; }
  function iso(t) { return new Date(t).toISOString(); }

  var CRIPTO = [
    ['bitcoin', 'BTC', 'Bitcoin', 67000, 1320, 0.028], ['ethereum', 'ETH', 'Ethereum', 3400, 410, 0.036], ['tether', 'USDT', 'Tether', 1, 110, 0.0008], ['binancecoin', 'BNB', 'BNB', 590, 87, 0.03],
    ['solana', 'SOL', 'Solana', 165, 76, 0.05], ['usd-coin', 'USDC', 'USDC', 1, 34, 0.0008], ['ripple', 'XRP', 'XRP', 0.52, 29, 0.04], ['dogecoin', 'DOGE', 'Dogecoin', 0.15, 22, 0.055],
    ['cardano', 'ADA', 'Cardano', 0.45, 16, 0.045], ['avalanche-2', 'AVAX', 'Avalanche', 35, 14, 0.055], ['tron', 'TRX', 'TRON', 0.12, 10.5, 0.03], ['chainlink', 'LINK', 'Chainlink', 14.5, 8.5, 0.05],
    ['polkadot', 'DOT', 'Polkadot', 7, 9.5, 0.05], ['matic-network', 'MATIC', 'Polygon', 0.7, 6.5, 0.05], ['litecoin', 'LTC', 'Litecoin', 84, 6.2, 0.04], ['uniswap', 'UNI', 'Uniswap', 9.5, 5.7, 0.055],
    ['cosmos', 'ATOM', 'Cosmos', 8.4, 3.3, 0.05], ['stellar', 'XLM', 'Stellar', 0.11, 3.2, 0.045], ['monero', 'XMR', 'Monero', 160, 2.9, 0.035], ['near', 'NEAR', 'NEAR Protocol', 6.5, 6.9, 0.06],
    ['aptos', 'APT', 'Aptos', 9, 3.5, 0.06], ['filecoin', 'FIL', 'Filecoin', 5.8, 3.2, 0.055], ['arbitrum', 'ARB', 'Arbitrum', 1.05, 3.4, 0.06], ['optimism', 'OP', 'Optimism', 2.4, 2.6, 0.06],
    ['aave', 'AAVE', 'Aave', 98, 1.5, 0.055], ['maker', 'MKR', 'Maker', 2800, 2.6, 0.045], ['the-graph', 'GRT', 'The Graph', 0.27, 2.5, 0.06], ['algorand', 'ALGO', 'Algorand', 0.17, 1.4, 0.05],
    ['vechain', 'VET', 'VeChain', 0.032, 2.3, 0.055], ['fantom', 'FTM', 'Fantom', 0.7, 2, 0.065], ['eos', 'EOS', 'EOS', 0.8, 1.2, 0.05], ['tezos', 'XTZ', 'Tezos', 1, 1, 0.05],
    ['sandbox', 'SAND', 'The Sandbox', 0.45, 1, 0.065], ['decentraland', 'MANA', 'Decentraland', 0.43, 0.8, 0.065], ['axie-infinity', 'AXS', 'Axie Infinity', 7, 1, 0.065], ['flow', 'FLOW', 'Flow', 0.75, 1.1, 0.06],
    ['theta-token', 'THETA', 'Theta Network', 1.3, 1.3, 0.06], ['neo', 'NEO', 'Neo', 13, 0.9, 0.055], ['kava', 'KAVA', 'Kava', 0.6, 0.65, 0.06], ['zcash', 'ZEC', 'Zcash', 28, 0.45, 0.05],
    ['dash', 'DASH', 'Dash', 28, 0.32, 0.05], ['compound', 'COMP', 'Compound', 52, 0.4, 0.06], ['curve-dao-token', 'CRV', 'Curve DAO', 0.45, 0.55, 0.07], ['1inch', '1INCH', '1inch', 0.4, 0.5, 0.065],
    ['enjincoin', 'ENJ', 'Enjin Coin', 0.28, 0.45, 0.06], ['basic-attention-token', 'BAT', 'Basic Attention', 0.22, 0.33, 0.055], ['chiliz', 'CHZ', 'Chiliz', 0.085, 0.75, 0.06], ['pepe', 'PEPE', 'Pepe', 0.0000115, 4.8, 0.08],
    ['shiba-inu', 'SHIB', 'Shiba Inu', 0.0000235, 13.8, 0.06], ['injective-protocol', 'INJ', 'Injective', 24, 2.3, 0.07], ['render-token', 'RNDR', 'Render', 8.5, 3.3, 0.07], ['stacks', 'STX', 'Stacks', 1.9, 2.8, 0.065],
    ['immutable-x', 'IMX', 'Immutable', 1.8, 2.6, 0.065], ['lido-dao', 'LDO', 'Lido DAO', 2, 1.8, 0.06], ['quant-network', 'QNT', 'Quant', 95, 1.15, 0.045], ['gala', 'GALA', 'Gala', 0.032, 1.2, 0.07],
    ['pancakeswap-token', 'CAKE', 'PancakeSwap', 2.4, 0.7, 0.06], ['zilliqa', 'ZIL', 'Zilliqa', 0.017, 0.3, 0.06], ['iota', 'MIOTA', 'IOTA', 0.17, 0.55, 0.05], ['bitcoin-cash', 'BCH', 'Bitcoin Cash', 460, 9, 0.04]
  ];
  var ACCIONES = [
    ['AAPL', 'Apple Inc.', 'NASDAQ', 192, 2950, 28, 0.017], ['MSFT', 'Microsoft Corp.', 'NASDAQ', 415, 3080, 35, 0.016], ['NVDA', 'NVIDIA Corp.', 'NASDAQ', 118, 2900, 62, 0.034], ['GOOGL', 'Alphabet Inc.', 'NASDAQ', 172, 2130, 24, 0.019],
    ['AMZN', 'Amazon.com Inc.', 'NASDAQ', 186, 1940, 52, 0.02], ['META', 'Meta Platforms', 'NASDAQ', 500, 1270, 27, 0.024], ['TSLA', 'Tesla Inc.', 'NASDAQ', 245, 780, 70, 0.04], ['BRK.B', 'Berkshire Hathaway', 'NYSE', 410, 890, 9, 0.011],
    ['JPM', 'JPMorgan Chase', 'NYSE', 198, 570, 12, 0.014], ['V', 'Visa Inc.', 'NYSE', 275, 560, 30, 0.013], ['JNJ', 'Johnson & Johnson', 'NYSE', 156, 375, 15, 0.01], ['WMT', 'Walmart Inc.', 'NYSE', 68, 550, 30, 0.011],
    ['XOM', 'Exxon Mobil', 'NYSE', 112, 450, 13, 0.016], ['PG', 'Procter & Gamble', 'NYSE', 165, 390, 26, 0.009], ['MA', 'Mastercard', 'NYSE', 460, 430, 36, 0.014], ['HD', 'Home Depot', 'NYSE', 345, 340, 22, 0.015],
    ['KO', 'Coca-Cola', 'NYSE', 63, 272, 25, 0.009], ['PEP', 'PepsiCo', 'NASDAQ', 170, 235, 24, 0.009], ['DIS', 'Walt Disney', 'NYSE', 98, 180, 35, 0.019], ['NFLX', 'Netflix Inc.', 'NASDAQ', 640, 275, 45, 0.024],
    ['AMD', 'Advanced Micro Devices', 'NASDAQ', 160, 260, 220, 0.032], ['INTC', 'Intel Corp.', 'NASDAQ', 31, 132, 40, 0.026], ['BA', 'Boeing Co.', 'NYSE', 180, 110, 0, 0.024], ['NKE', 'Nike Inc.', 'NYSE', 94, 140, 28, 0.017],
    ['MCD', 'McDonalds', 'NYSE', 268, 195, 24, 0.01], ['COST', 'Costco', 'NASDAQ', 840, 372, 50, 0.013], ['ORCL', 'Oracle Corp.', 'NYSE', 140, 385, 33, 0.018], ['ADBE', 'Adobe Inc.', 'NASDAQ', 510, 230, 42, 0.022],
    ['CRM', 'Salesforce', 'NYSE', 255, 247, 45, 0.021], ['PYPL', 'PayPal', 'NASDAQ', 62, 65, 17, 0.025], ['UBER', 'Uber Tech.', 'NYSE', 66, 138, 0, 0.026], ['COIN', 'Coinbase Global', 'NASDAQ', 240, 60, 40, 0.055],
    ['SAN.MC', 'Banco Santander', 'BME', 4.4, 70, 6, 0.016], ['ITX.MC', 'Inditex', 'BME', 47, 146, 23, 0.014], ['IBE.MC', 'Iberdrola', 'BME', 12.3, 78, 16, 0.01], ['TEF.MC', 'Telefonica', 'BME', 4, 23, 12, 0.012],
    ['BBVA.MC', 'BBVA', 'BME', 9.6, 57, 7, 0.017], ['AMXL.MX', 'America Movil', 'BMV', 17, 55, 12, 0.014], ['WALMEX.MX', 'Walmart de Mexico', 'BMV', 56, 49, 24, 0.013], ['VALE', 'Vale S.A.', 'NYSE', 12.5, 56, 6, 0.022],
    ['MELI', 'MercadoLibre', 'NASDAQ', 1650, 83, 60, 0.025], ['SPY', 'SPDR S&P 500 ETF', 'NYSE', 540, 500, 0, 0.0095], ['QQQ', 'Invesco QQQ ETF', 'NASDAQ', 470, 270, 0, 0.012]
  ];
  var INDICES = [['^GSPC', 'S&P 500', 5400, 0.0095], ['^IXIC', 'Nasdaq Composite', 17100, 0.012], ['^DJI', 'Dow Jones', 39800, 0.008], ['^IBEX', 'IBEX 35', 11200, 0.0095], ['^MXX', 'S&P/BMV IPC', 54000, 0.0095], ['^GDAXI', 'DAX', 18400, 0.01]];
  var FX = [['EUR', 0.92, 0.0035], ['GBP', 0.79, 0.004], ['JPY', 157, 0.0055], ['CHF', 0.9, 0.004], ['CAD', 1.37, 0.0035], ['AUD', 1.5, 0.0055], ['CNY', 7.25, 0.0015], ['MXN', 17.8, 0.008],
    ['DOP', 59.2, 0.002], ['COP', 4050, 0.007], ['ARS', 910, 0.004], ['BRL', 5.4, 0.007], ['CLP', 930, 0.007], ['PEN', 3.75, 0.0025]];
  var NFTS = [['cryptopunks', 'CryptoPunks', 'ethereum', 42, 'ETH', 210, 3300], ['bored-ape', 'Bored Ape Yacht Club', 'ethereum', 11.8, 'ETH', 180, 10000], ['azuki', 'Azuki', 'ethereum', 5.2, 'ETH', 95, 10000],
    ['pudgy', 'Pudgy Penguins', 'ethereum', 10.4, 'ETH', 140, 8800], ['mayc', 'Mutant Ape Yacht Club', 'ethereum', 2.1, 'ETH', 70, 19000], ['doodles', 'Doodles', 'ethereum', 1.4, 'ETH', 22, 10000],
    ['moonbirds', 'Moonbirds', 'ethereum', 1.6, 'ETH', 30, 10000], ['clonex', 'CloneX', 'ethereum', 1.3, 'ETH', 18, 20000], ['degods', 'DeGods', 'solana', 14, 'SOL', 120, 9800],
    ['madlads', 'Mad Lads', 'solana', 98, 'SOL', 410, 10000], ['okaybears', 'Okay Bears', 'solana', 18, 'SOL', 60, 10000], ['sproto', 'Sproto Gremlins', 'ethereum', 0.45, 'ETH', 12, 10000],
    ['milady', 'Milady Maker', 'ethereum', 3.3, 'ETH', 55, 10000], ['chromie', 'Chromie Squiggle', 'ethereum', 3.9, 'ETH', 9, 9700], ['ens', 'ENS Dominios .eth', 'ethereum', 0.004, 'ETH', 70, 3000000], ['rarible-demo', 'Cool Cats', 'ethereum', 0.6, 'ETH', 8, 9900]];
  var TITULARES = {
    cripto: [['{s} se mueve con fuerza mientras el mercado cripto digiere nuevos datos de flujos', 0.2], ['Analistas vigilan soporte clave de {s} tras la volatilidad semanal', -0.3], ['{s} acumula ganancias con aumento del volumen institucional', 0.6], ['Preocupacion regulatoria presiona a {s} y altcoins', -0.6], ['Desarrolladores de {s} anuncian actualizacion de red para el proximo trimestre', 0.4]],
    bolsa: [['{s} supera previsiones de beneficios en el trimestre', 0.7], ['{s} cae tras recortar su guia de ingresos', -0.65], ['Wall Street cierra mixto con {s} entre los mas negociados', 0], ['Inversores rotan hacia {s} ante expectativas de tipos de interes', 0.3], ['{s} anuncia recompra de acciones y dividendo mayor', 0.55]],
    divisas: [['El {s} se debilita frente al dolar tras datos de empleo en EE. UU.', -0.4], ['El {s} gana terreno ante expectativas de politica monetaria restrictiva', 0.35], ['Bancos centrales mantienen tipos: el {s} se estabiliza', 0.05]],
    nft: [['Volumen de {s} repunta tras nueva coleccion derivada', 0.45], ['El piso de {s} retrocede mientras los coleccionistas venden', -0.5]],
    economia: [['La inflacion se modera mas de lo previsto en la ultima lectura', 0.5], ['El crecimiento del PIB sorprende a la baja y eleva temores de recesion', -0.6], ['La Fed mantiene un tono prudente: los mercados reaccionan con calma', 0.1]],
    general: [['Los mercados globales inician la semana pendientes de resultados empresariales', 0]]
  };

  function betaDe(id, max) { return +(0.3 + (hash('b' + id) % 100) / 100 * (max - 0.3)).toFixed(2); }
  var FACTORES = {};
  function factor(nombre) { if (!FACTORES[nombre]) { var r = rng(hash('factor' + nombre)), a = []; for (var i = 0; i < 400; i++) a.push(normal(r)); FACTORES[nombre] = a; } return FACTORES[nombre]; }
  function serie(clave, n, precioFin, vol, ahora, opts) {
    opts = opts || {}; var r = rng(hash(clave)), logp = [0], reg = 0, drift = (r() - 0.45) * vol * 0.12, fa = opts.factor ? factor(opts.factor) : null, b = opts.beta || 0, ri = Math.sqrt(Math.max(0, 1 - b * b));
    for (var i = 1; i < n; i++) {
      if (r() < 0.02) reg = (r() - 0.5) * vol * 0.35;
      var e = normal(r), sh = fa ? b * fa[400 - n + i] + ri * e : e;
      logp.push(logp[i - 1] + drift + reg * 0.5 + sh * vol);
    }
    var esc = precioFin / Math.exp(logp[n - 1]), t0 = dia0(ahora) - (n - 1) * DIA, v = [], prev = null;
    for (var j = 0; j < n; j++) {
      var c = Math.exp(logp[j]) * esc, o = prev == null ? c / (1 + normal(r) * vol * 0.4) : prev * (1 + normal(r) * vol * 0.15);
      var hi = Math.max(o, c) * (1 + Math.abs(normal(r)) * vol * 0.5), lo = Math.min(o, c) * (1 - Math.abs(normal(r)) * vol * 0.5);
      var vol0 = (opts.vol0 || 1e6) * Math.exp(normal(r) * 0.4 + Math.abs(Math.log(c / o)) / vol * 0.3);
      v.push([t0 + j * DIA, +o.toPrecision(7), +hi.toPrecision(7), +lo.toPrecision(7), +c.toPrecision(7), Math.round(vol0)]); prev = c;
    }
    return v;
  }
  function hora(clave, n, precioFin, vol, base) {
    var r = rng(hash(clave + 'h')), x = [0];
    for (var i = 1; i < n; i++) x.push(x[i - 1] + normal(r) * vol / Math.sqrt(24));
    var esc = precioFin / Math.exp(x[n - 1]); return x.map(function (q) { return +(Math.exp(q) * esc).toPrecision(7); });
  }
  function cripto(ahora) {
    var items = CRIPTO.map(function (a) {
      var sp = hora(a[0], 168, a[3], a[5]), n = sp.length, p = sp[n - 1];
      return { id: a[0], simbolo: a[1], nombre: a[2], precio: p, cambio1h: +((p / sp[n - 2] - 1) * 100).toFixed(2), cambio24h: +((p / sp[n - 25] - 1) * 100).toFixed(2), cambio7d: +((p / sp[0] - 1) * 100).toFixed(2),
        capitalizacion: Math.round(a[4] * 1e9), volumen24h: Math.round(a[4] * 1e9 * (a[1].match(/USD/) ? 0.6 : 0.045) * (0.6 + rng(hash(a[0] + 'v'))())), sparkline7d: sp };
    });
    return { generado: iso(ahora), fuente: 'DEMO (datos de ejemplo)', items: items };
  }
  function acciones(ahora) {
    var items = ACCIONES.map(function (a) {
      var v = serie('a' + a[0], 260, a[3], a[6], ahora, { vol0: a[4] * 2e5 / a[3], factor: 'bolsa', beta: betaDe(a[0], 0.8) }), u = v[v.length - 1], p = v[v.length - 2][4];
      return { simbolo: a[0], nombre: a[1], bolsa: a[2], precio: u[4], cambio: +(u[4] - p).toFixed(4), cambioPct: +((u[4] / p - 1) * 100).toFixed(2), apertura: u[1], max: u[2], min: u[3], cierreAnt: p, volumen: u[5], capitalizacion: Math.round(a[4] * 1e9), pe: a[5] || undefined, hora: iso(ahora) };
    });
    var idx = INDICES.map(function (a) {
      var v = serie('i' + a[0], 260, a[2], a[3], ahora, { factor: 'bolsa', beta: 0.9 }), u = v[v.length - 1], p = v[v.length - 2][4];
      return { simbolo: a[0], nombre: a[1], bolsa: 'INDICE', precio: u[4], cambio: +(u[4] - p).toFixed(2), cambioPct: +((u[4] / p - 1) * 100).toFixed(2), apertura: u[1], max: u[2], min: u[3], cierreAnt: p, volumen: u[5], hora: iso(ahora) };
    });
    return { generado: iso(ahora), fuente: 'DEMO (datos de ejemplo)', moneda: 'USD', items: items, indices: idx };
  }
  function divisas(ahora) {
    var tasas = {}, hist = {}, d0 = dia0(ahora);
    FX.forEach(function (f) {
      var v = serie('fx' + f[0], 120, f[1], f[2], ahora), h = [];
      v.forEach(function (b) { var d = new Date(b[0]); if (d.getUTCDay() % 6) h.push([d.toISOString().slice(0, 10), +b[4].toPrecision(6)]); });
      tasas[f[0]] = h[h.length - 1][1]; hist[f[0]] = h;
    });
    return { generado: iso(ahora), fuente: 'DEMO (datos de ejemplo)', base: 'USD', tasas: tasas, hist: hist };
  }
  function nft(ahora) {
    return { generado: iso(ahora), fuente: 'DEMO (datos de ejemplo)', colecciones: NFTS.map(function (a) {
      var r = rng(hash('n' + a[0]));
      return { id: a[0], nombre: a[1], cadena: a[2], piso: a[3], moneda: a[4], volumen24h: +(a[5] * (0.6 + r() * 0.8)).toFixed(1), cambio24h: +((r() - 0.5) * 24).toFixed(1), ventas24h: Math.round(a[5] / a[3] * (0.5 + r())), propietarios: Math.round(a[6] * (0.4 + r() * 0.3)), url: 'https://example.org/demo/' + a[0] };
    }) };
  }
  function noticias(ahora) {
    var r = rng(77), cat = ['cripto', 'cripto', 'cripto', 'bolsa', 'bolsa', 'bolsa', 'divisas', 'nft', 'economia', 'general'], items = [];
    for (var i = 0; i < 48; i++) {
      var c = cat[Math.floor(r() * cat.length)], pl = TITULARES[c], tpl = pl[Math.floor(r() * pl.length)], sym, tk = [];
      if (c === 'cripto') { var a = CRIPTO[Math.floor(Math.pow(r(), 2) * 25)]; sym = a[2]; tk = [a[1]]; }
      else if (c === 'bolsa') { var b = ACCIONES[Math.floor(r() * 30)]; sym = b[1].split(' ')[0]; tk = [b[0]]; }
      else if (c === 'divisas') { var f = FX[Math.floor(r() * FX.length)]; sym = f[0]; tk = ['USD' + f[0]]; }
      else if (c === 'nft') { var n = NFTS[Math.floor(r() * 8)]; sym = n[1]; tk = [n[0]]; }
      else sym = '';
      var s = Math.max(-1, Math.min(1, tpl[1] + (r() - 0.5) * 0.3));
      items.push({ id: 'demo' + i, titulo: tpl[0].replace('{s}', sym), resumen: '[Ejemplo ficticio] Texto de relleno para ilustrar el resumen de una noticia de ' + c + '. No corresponde a un hecho real.', enlace: 'https://example.org/demo/noticia/' + i, fuente: ['Demo Wire', 'Demo Finanzas', 'Demo Cripto'][i % 3], fecha: iso(ahora - Math.floor(r() * 46) * 3600000 - i * 60000), categoria: c, tickers: tk, sentimiento: +s.toFixed(2) });
    }
    items.sort(function (a, b) { return b.fecha < a.fecha ? -1 : 1; });
    return { generado: iso(ahora), items: items };
  }
  function histCripto(id, ahora) {
    var a = CRIPTO.filter(function (x) { return x[0] === id; })[0]; if (!a) return null;
    var sp = hora(a[0], 168, a[3], a[5]);
    return { id: id, velas: serie('c' + id, 365, sp[sp.length - 1], a[5], ahora, { vol0: a[4] * 1e9 * 0.04 / a[3], factor: a[5] < 0.01 ? null : 'cripto', beta: betaDe(id, 0.85) }) };
  }
  function histAccion(sim, ahora) {
    var a = ACCIONES.filter(function (x) { return x[0] === sim; })[0], i, ix;
    if (a) return { simbolo: sim, velas: serie('a' + sim, 260, a[3], a[6], ahora, { vol0: a[4] * 2e5 / a[3], factor: 'bolsa', beta: betaDe(a[0], 0.8) }) };
    ix = INDICES.filter(function (x) { return x[0] === sim; })[0];
    return ix ? { simbolo: sim, velas: serie('i' + sim, 260, ix[2], ix[3], ahora, { factor: 'bolsa', beta: 0.9 }) } : null;
  }
  /* mapa ruta -> json para el interceptor de pruebas / modo demo */
  function generar(ahora) {
    ahora = ahora || Date.now(); var m = {}, c = cripto(ahora), a = acciones(ahora);
    m['mercados/cripto.json'] = c; m['mercados/acciones.json'] = a; m['mercados/divisas.json'] = divisas(ahora); m['mercados/nft.json'] = nft(ahora); m['mercados/noticias.json'] = noticias(ahora);
    c.items.slice(0, 50).forEach(function (x) { m['mercados/cripto_hist/' + x.id + '.json'] = histCripto(x.id, ahora); });
    a.items.concat(a.indices).forEach(function (x) { m['mercados/acciones_hist/' + x.simbolo + '.json'] = histAccion(x.simbolo, ahora); });
    m['estado.json'] = { generado: iso(ahora), fuentes: { cripto: { ok: true, ultimo: iso(ahora), items: 60 } } };
    return m;
  }
  return { generar: generar, cripto: cripto, acciones: acciones, divisas: divisas, nft: nft, noticias: noticias, histCripto: histCripto, histAccion: histAccion, serie: serie, hash: hash, rng: rng };
});
