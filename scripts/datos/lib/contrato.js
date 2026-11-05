'use strict';
// Contrato de datos (rama `datos`). Cada esquema valida el JSON antes de publicarlo.
const { S, validar } = require('./schema');

const n = S.num();
const nn = S.nulo(S.num());
const base = { generado: S.iso(), fuente: S.cad({ min: 1 }) };

const estado = S.obj({
  generado: S.iso(),
  fuentes: S.mapa(S.obj({ ok: S.bool(), ultimo: S.nulo(S.iso()), items: S.num({ min: 0 }) }, { error: S.cad(), detalle: S.cualquiera() }))
});

const cripto = S.obj({
  ...base,
  items: S.arr(S.obj({
    id: S.cad({ min: 1 }), simbolo: S.cad({ min: 1 }), nombre: S.cad({ min: 1 }), precio: n,
    cambio1h: nn, cambio24h: nn, cambio7d: nn, capitalizacion: nn, volumen24h: nn, sparkline7d: S.arr(n)
  }), { min: 1, max: 250, unico: 'id' })
});
const velas = S.arr(S.tupla([n, n, n, n, n, nn]));
const criptoHist = S.obj({ id: S.cad({ min: 1 }), velas, generado: S.iso() }, { fuente: S.cad() });

const itemAccion = S.obj(
  { simbolo: S.cad({ min: 1 }), nombre: S.cad(), precio: n, hora: S.cad() },
  { bolsa: S.nulo(S.cad()), cambio: nn, cambioPct: nn, apertura: nn, max: nn, min: nn, cierreAnt: nn, volumen: nn, capitalizacion: nn, pe: nn }
);
const acciones = S.obj({ ...base, moneda: S.cad({ min: 3, max: 3 }), items: S.arr(itemAccion, { unico: 'simbolo' }), indices: S.arr(itemAccion) });
const accionesHist = S.obj({ simbolo: S.cad({ min: 1 }), velas, generado: S.iso() }, { fuente: S.cad() });

const divisas = S.obj({
  ...base, base: S.cad({ enum: ['USD'] }),
  tasas: S.mapa(S.num({ min: 0 }), { clave: /^[A-Z]{3}$/ }),
  hist: S.mapa(S.arr(S.tupla([S.cad({ patron: /^\d{4}-\d{2}-\d{2}$/ }), n])), { clave: /^[A-Z]{3}$/ })
});

const nft = S.obj({
  ...base,
  colecciones: S.arr(S.obj(
    { id: S.cad({ min: 1 }), nombre: S.cad({ min: 1 }), cadena: S.cad(), piso: nn, moneda: S.cad(), volumen24h: nn, cambio24h: nn, ventas24h: nn, url: S.url() },
    { propietarios: nn, imagen: S.nulo(S.cad()) }
  ), { unico: 'id' })
});

const categoriasNoticia = ['cripto', 'bolsa', 'divisas', 'nft', 'deportes', 'economia', 'general'];
const noticias = S.obj({
  generado: S.iso(),
  items: S.arr(S.obj({
    id: S.cad({ min: 1 }), titulo: S.cad({ min: 1, max: 300 }), resumen: S.cad({ max: 400 }), enlace: S.url(), fuente: S.cad({ min: 1 }),
    fecha: S.iso(), categoria: S.cad({ enum: categoriasNoticia }), tickers: S.arr(S.cad()), sentimiento: S.num({ min: -1, max: 1 })
  }), { unico: 'id' })
}, { fuente: S.cad() });

const mercadosCuota = S.obj({}, {
  h2h: S.obj({ local: n, visitante: n }, { empate: nn }),
  totales: S.obj({ linea: n, mas: n, menos: n }),
  spreads: S.obj({ linea: n, local: n, visitante: n })
});
const cuotas = S.obj({
  ...base,
  deportes: S.arr(S.obj({
    clave: S.cad({ min: 1 }), nombre: S.cad({ min: 1 }),
    eventos: S.arr(S.obj({
      id: S.cad({ min: 1 }), inicio: S.iso(), local: S.cad({ min: 1 }), visitante: S.cad({ min: 1 }),
      casas: S.arr(S.obj({ casa: S.cad({ min: 1 }), mercados: mercadosCuota }))
    }), {})
  }, { actualizado: S.iso() }), { unico: 'clave' })
});

const ofertas = S.obj({
  generado: S.iso(),
  items: S.arr(S.obj(
    {
      id: S.cad({ min: 1 }), titulo: S.cad({ min: 1, max: 300 }), tienda: S.cad({ min: 1 }), precio: S.num({ min: 0 }), precioAntes: nn,
      descuentoPct: S.nulo(S.num({ min: 0, max: 100 })), moneda: S.cad({ min: 3, max: 3 }), url: S.url(), categoria: S.cad({ min: 1 }),
      fecha: S.iso(), fuente: S.cad({ min: 1 })
    },
    { imagen: S.nulo(S.cad()), cupon: S.nulo(S.cad()), vence: S.nulo(S.iso()), precioUsd: nn, clave: S.cad() }
  ), { unico: 'id' })
}, { fuente: S.cad() });
const historial = S.mapa(S.arr(S.tupla([n, n])));

const REGLAS = [
  [/^estado\.json$/, estado],
  [/^mercados\/cripto\.json$/, cripto],
  [/^mercados\/cripto_hist\/[a-z0-9._-]+\.json$/, criptoHist],
  [/^mercados\/acciones\.json$/, acciones],
  [/^mercados\/acciones_hist\/[A-Za-z0-9._-]+\.json$/, accionesHist],
  [/^mercados\/divisas\.json$/, divisas],
  [/^mercados\/nft\.json$/, nft],
  [/^mercados\/noticias\.json$/, noticias],
  [/^apuestas\/cuotas\.json$/, cuotas],
  [/^ofertas\/ofertas\.json$/, ofertas],
  [/^ofertas\/historial\.json$/, historial]
];

function validarArchivo(ruta, datos) {
  const r = REGLAS.find(([re]) => re.test(ruta));
  if (!r) return [`${ruta}: no existe un esquema del contrato para esta ruta`];
  return validar(datos, r[1], ruta.replace(/\.json$/, ''));
}

module.exports = { validarArchivo, REGLAS };
