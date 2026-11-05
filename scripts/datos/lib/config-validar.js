'use strict';
// Validacion de scripts/datos/config.json con mensajes claros.
const { S, validar } = require('./schema');

const ESTRICTO = { extra: false, sugerir: true };
const idRe = /^[a-z0-9][a-z0-9_-]{0,40}$/;
const monedas3 = S.arr(S.cad({ patron: /^[A-Z]{3}$/, ayuda: 'codigo de 3 letras mayusculas, p. ej. EUR' }), { min: 1 });
const base = () => S.url();
const baseObj = (extra = {}) => S.obj({ base: base() }, extra, ESTRICTO);
const simboloItem = S.obj({ simbolo: S.cad({ patron: /^[A-Z0-9.\-^=]{1,12}$/, ayuda: 'MAYUSCULAS, p. ej. AAPL' }), nombre: S.cad({ min: 1 }) }, { bolsa: S.cad() }, ESTRICTO);

const esquema = S.obj({ version: S.num({ min: 1, entero: true }) }, {
  http: S.obj({}, {
    userAgent: S.cad({ min: 10 }), timeoutMs: S.num({ min: 1000, max: 120000 }), reintentos: S.num({ min: 0, max: 6, entero: true }),
    backoffMs: S.num({ min: 100, max: 30000 }), msPorDominio: S.num({ min: 0, max: 60000 }), retrasosPorDominio: S.mapa(S.num({ min: 0, max: 120000 }))
  }, ESTRICTO),
  tiempoMaximoPorFuenteMs: S.num({ min: 10000, max: 1800000 }),
  cripto: S.obj({}, {
    activo: S.bool(), top: S.num({ min: 1, max: 250, entero: true }), sparklinePuntos: S.num({ min: 2, max: 168, entero: true }),
    proveedores: S.arr(S.cad({ enum: ['coingecko', 'binance', 'coincap'] }), { min: 1 }),
    coingecko: S.obj({}, { base: base(), cabeceraClave: S.cad({ min: 1 }) }, ESTRICTO), binance: baseObj(), coincap: baseObj(),
    hist: S.obj({}, {
      activo: S.bool(), top: S.num({ min: 0, max: 250, entero: true }), dias: S.num({ min: 7, max: 1000, entero: true }),
      cadaHoras: S.num({ min: 1, max: 720 }), maxPorEjecucion: S.num({ min: 1, max: 100, entero: true }), maxCoingecko: S.num({ min: 0, max: 50, entero: true })
    }, ESTRICTO)
  }, ESTRICTO),
  divisas: S.obj({}, {
    activo: S.bool(), monedas: monedas3, histDias: S.num({ min: 7, max: 730, entero: true }),
    frankfurter: baseObj(), erapi: baseObj()
  }, ESTRICTO),
  acciones: S.obj({}, {
    activo: S.bool(), proveedor: S.cad({ enum: ['auto', 'finnhub', 'twelvedata', 'alphavantage'] }), moneda: S.cad({ patron: /^[A-Z]{3}$/ }),
    simbolos: S.arr(simboloItem, { unico: 'simbolo' }), indices: S.arr(simboloItem, { unico: 'simbolo' }),
    proveedores: S.obj({}, {
      finnhub: S.obj({}, { base: base(), porEjecucion: S.num({ min: 1, max: 500, entero: true }) }, ESTRICTO),
      twelvedata: S.obj({}, { base: base(), porEjecucion: S.num({ min: 1, max: 120, entero: true }) }, ESTRICTO),
      alphavantage: S.obj({}, { base: base(), porEjecucion: S.num({ min: 1, max: 25, entero: true }) }, ESTRICTO)
    }, ESTRICTO),
    hist: S.obj({}, {
      activo: S.bool(), proveedor: S.cad({ enum: ['auto', 'finnhub', 'twelvedata', 'alphavantage'] }), dias: S.num({ min: 7, max: 1000, entero: true }),
      cadaHoras: S.num({ min: 1, max: 720 }), maxPorEjecucion: S.num({ min: 1, max: 50, entero: true }),
      simbolos: S.arr(S.cad({ patron: /^[A-Z0-9.\-^=]{1,12}$/ }))
    }, ESTRICTO)
  }, ESTRICTO),
  nft: S.obj({}, {
    activo: S.bool(), proveedor: S.cad({ enum: ['auto', 'reservoir', 'coingecko'] }), maxColecciones: S.num({ min: 1, max: 100, entero: true }),
    reservoir: S.obj({}, { cadenas: S.arr(S.obj({ nombre: S.cad({ min: 1 }), base: base() }, {}, ESTRICTO), { min: 1 }) }, ESTRICTO),
    coingecko: S.obj({}, { base: base(), colecciones: S.arr(S.cad({ patron: /^[a-z0-9-]+$/, ayuda: 'id de CoinGecko NFT, p. ej. cryptopunks' })) }, ESTRICTO)
  }, ESTRICTO),
  cuotas: S.obj({}, {
    activo: S.bool(), base: base(), regiones: S.arr(S.cad({ enum: ['us', 'us2', 'uk', 'au', 'eu'] }), { min: 1 }),
    mercados: S.arr(S.cad({ enum: ['h2h', 'totals', 'spreads'] }), { min: 1 }),
    deportes: S.arr(S.cad({ patron: /^[a-z0-9_]+$/, ayuda: 'clave de The Odds API, p. ej. soccer_epl' })),
    maxDeportesPorEjecucion: S.num({ min: 1, max: 20, entero: true }), minMinutosEntreActualizaciones: S.num({ min: 5, max: 10080 }),
    maxCasas: S.num({ min: 1, max: 30, entero: true }), reservaCreditos: S.num({ min: 0, max: 100000 }), diasAdelante: S.num({ min: 1, max: 30, entero: true })
  }, ESTRICTO),
  noticias: S.obj({}, {
    activo: S.bool(), maxItems: S.num({ min: 10, max: 2000, entero: true }), maxDias: S.num({ min: 1, max: 60 }), porFuente: S.num({ min: 1, max: 100, entero: true }),
    resumenMax: S.num({ min: 40, max: 400, entero: true }), tickersExtra: S.mapa(S.arr(S.cad({ min: 2 }))),
    fuentes: S.arr(S.obj(
      { id: S.cad({ patron: idRe, ayuda: 'minusculas, numeros, - o _' }), nombre: S.cad({ min: 1 }), url: S.url(), categoria: S.cad({ enum: ['cripto', 'bolsa', 'divisas', 'nft', 'deportes', 'economia', 'general'] }), idioma: S.cad({ enum: ['es', 'en'] }) },
      { activo: S.bool() }, ESTRICTO), { unico: 'id' })
  }, ESTRICTO),
  ofertas: S.obj({}, {
    activo: S.bool(), moneda: S.cad({ patron: /^[A-Z]{3}$/ }), minDescuentoPct: S.num({ min: 0, max: 95 }), maxItems: S.num({ min: 10, max: 2000, entero: true }),
    maxDias: S.num({ min: 1, max: 90 }), historialDias: S.num({ min: 1, max: 365 }), maxPuntosHistorial: S.num({ min: 2, max: 500, entero: true }), respetarRobots: S.bool(),
    bloqueados: S.arr(S.cad({ patron: /^[a-z0-9.*-]+$/, ayuda: 'dominio en minusculas, p. ej. amazon.* o tienda.com' })),
    maxPaginasPorEjecucion: S.num({ min: 0, max: 200, entero: true }),
    fuentes: S.arr(S.obj(
      { id: S.cad({ patron: idRe }), tipo: S.cad({ enum: ['feed', 'jsonld', 'sitemap'] }), nombre: S.cad({ min: 1 }) },
      {
        url: S.url(), urls: S.arr(S.url(), { min: 1 }), moneda: S.cad({ patron: /^[A-Z]{3}$/ }), idioma: S.cad({ enum: ['es', 'en'] }), categoria: S.cad({ min: 1 }),
        tienda: S.cad({ min: 1 }), activo: S.bool(), incluye: S.cad({ min: 1 }), maxUrls: S.num({ min: 1, max: 500, entero: true })
      }, ESTRICTO), { unico: 'id' }),
    busqueda: S.obj({}, {
      activo: S.bool(), proveedor: S.cad({ enum: ['auto', 'brave'] }), palabras: S.arr(S.cad({ min: 2, max: 100 })),
      resultadosPorPalabra: S.num({ min: 1, max: 20, entero: true }), maxPaginas: S.num({ min: 0, max: 100, entero: true }), pais: S.cad({ patron: /^[A-Z]{2}$/ })
    }, ESTRICTO)
  }, ESTRICTO)
}, ESTRICTO);

function validarConfig(cfg) {
  const errs = validar(cfg, esquema, 'config');
  if (errs.length) return errs;
  const out = [];
  const of = (cfg.ofertas && cfg.ofertas.fuentes) || [];
  of.forEach((f, i) => {
    const r = `config.ofertas.fuentes[${i}] (${f.id})`;
    if (f.tipo === 'feed' && !f.url) out.push(`${r}: el tipo "feed" requiere el campo "url"`);
    if (f.tipo === 'sitemap' && !f.url) out.push(`${r}: el tipo "sitemap" requiere el campo "url" (direccion del sitemap.xml)`);
    if (f.tipo === 'jsonld' && !f.urls && !f.url) out.push(`${r}: el tipo "jsonld" requiere "urls" (lista de paginas) o "url"`);
    if (f.incluye) { try { new RegExp(f.incluye); } catch (e) { out.push(`${r}.incluye: expresion regular invalida (${e.message})`); } }
  });
  const hist = cfg.cripto && cfg.cripto.hist;
  if (hist && hist.top !== undefined && cfg.cripto.top !== undefined && hist.top > cfg.cripto.top) out.push('config.cripto.hist.top no puede ser mayor que config.cripto.top');
  const ac = cfg.acciones;
  if (ac && ac.hist && ac.hist.simbolos && ac.simbolos) {
    const conocidos = new Set(ac.simbolos.concat(ac.indices || []).map((s) => s.simbolo));
    ac.hist.simbolos.forEach((s, i) => { if (!conocidos.has(s)) out.push(`config.acciones.hist.simbolos[${i}]: "${s}" no esta en acciones.simbolos ni acciones.indices`); });
  }
  return out;
}

module.exports = { validarConfig, esquema };
