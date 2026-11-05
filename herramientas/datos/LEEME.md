# Proceso de datos programado

Recolecta datos publicos (cripto, divisas, bolsa, NFT, cuotas, noticias, ofertas) cada pocos minutos con GitHub Actions, los valida contra el contrato y los publica en la rama huerfana `datos` de este repositorio. Las herramientas web los leen desde `raw.githubusercontent.com` mediante `window.Datos` (`herramientas/comun/datos.js`).

Para activarlo paso a paso: [CONFIGURAR-DATOS.md](CONFIGURAR-DATOS.md).

## Piezas

| Ruta | Funcion |
|---|---|
| `.github/workflows/datos-rapidos.yml` | cada 10 min: cripto, divisas, acciones, cuotas |
| `.github/workflows/datos-lentos.yml` | minutos 7 y 37 de cada hora: noticias, ofertas, NFT, historicos |
| `.github/workflows/datos-pruebas.yml` | pruebas y `--offline` en pull requests |
| `scripts/datos/config.json` | configuracion (fuentes, simbolos, umbrales) |
| `scripts/datos/ejecutar.js` | punto de entrada |
| `scripts/datos/lib/` | parsers XML/RSS/Atom/JSON-LD, robots.txt, HTTP, sentimiento, tickers, precios, validadores |
| `scripts/datos/recolectores/` | un modulo por tema |
| `scripts/datos/fixtures/` | respuestas simuladas para `--offline` y pruebas |
| `scripts/datos/bin/` | descarga y publicacion de la rama `datos` |

Ambos workflows comparten `concurrency: datos-publicacion` (sin cancelar): nunca publican a la vez. Cada ejecucion descarga la rama `datos`, actualiza solo lo suyo y la reemplaza con **un unico commit huerfano** (`git push --force` de la rama `datos` unicamente; la rama principal nunca se toca). Usa solo `GITHUB_TOKEN` con `permissions: contents: write`.

## Uso local

```
node scripts/datos/ejecutar.js rapidos|lentos|todos [--salida DIR] [--solo cripto,divisas] [--config ARCHIVO] [--offline] [--validar-config]
node --test scripts/datos/test/*.test.js        # pruebas (Node 20+, sin dependencias)
node scripts/datos/ejecutar.js todos --offline  # pipeline completo con fixtures, sin red
```

`--offline` usa `fixtures/config.offline.json`, un `fetch` simulado y una fecha fija, y valida todos los JSON de salida contra el contrato. Los secretos se leen de variables de entorno con el mismo nombre. En un equipo detras de proxy, Node 22 necesita `NODE_USE_ENV_PROXY=1`.

## Tolerancia a fallos

- Cada fuente (`cripto`, `cripto_hist`, `divisas`, `acciones`, `acciones_hist`, `nft`, `cuotas`, `noticias`, `ofertas`) se ejecuta aislada, con tiempo maximo (`tiempoMaximoPorFuenteMs`).
- HTTP: User-Agent identificable (`http.userAgent`, `{repo}` se sustituye por el repositorio), timeout, reintentos con backoff exponencial y `Retry-After`, y espacio minimo entre peticiones por dominio (`msPorDominio`, `retrasosPorDominio`).
- Si una fuente falla, **se conserva el ultimo archivo bueno**; `estado.json` marca `ok:false`, el `error` (sin claves) y `ultimo` (ultimo exito). Dentro de una fuente, un proveedor o feed caido no detiene a los demas (`detalle` lo lista).
- Antes de escribir, cada JSON se valida contra el contrato (`lib/contrato.js`); si no cumple, no se publica y se conserva el anterior.
- Las fuentes que fallan emiten `::warning::` visibles en el resumen de la ejecucion.

## Contrato (resumen de lo que publica)

Todos los objetos llevan `generado` (ISO-8601 UTC) y `fuente`. Ademas de lo acordado:

- `estado.json`: `fuentes.<id> = {ok, ultimo, error?, items, detalle?}`. `detalle` es informativo (proveedor usado, fallos por feed, rotacion, creditos de cuotas).
- `mercados/cripto.json`: top 250 en USD; `sparkline7d` reducido a `cripto.sparklinePuntos` (84) puntos. Con proveedor de respaldo (Binance/CoinCap) `cambio1h`/`cambio7d`/`capitalizacion` pueden ser `null` o heredados de la ultima ejecucion buena.
- `mercados/cripto_hist/<id>.json`: velas diarias `[tMs,o,h,l,c,v]` (Binance con volumen en USDT; CoinGecko OHLC con `v:null`).
- `mercados/acciones.json`: los *indices* son ETFs proxy (SPY, QQQ, DIA, IWM) porque los planes gratuitos no dan indices. Con rotacion, cada simbolo trae su propia `hora`; los no refrescados conservan el dato anterior.
- `mercados/divisas.json`: `base:'USD'`, `tasas.EUR` = unidades de EUR por 1 USD. Serie del BCE (Frankfurter); las monedas que el BCE no publica (DOP, COP, ARS, CLP, PEN...) vienen de open.er-api.com y acumulan una muestra diaria en `hist`.
- `apuestas/cuotas.json`, por evento `casas:[{casa, mercados}]` (cuotas siempre **decimales**; el nombre de la casa se publica tal cual lo devuelve The Odds API, p. ej. `Pinnacle`, que se conserva aunque exceda `maxCasas`):
  - `h2h = {local, empate?, visitante}`
  - `totales = {linea, mas, menos}`
  - `spreads = {linea, local, visitante}` donde `linea` es la linea del equipo **local** (p. ej. `-1.5`) y `local`/`visitante` son las cuotas.
  - cada deporte lleva `actualizado` (ISO) para la rotacion.
- `mercados/noticias.json`: solo titular (≤200), resumen corto recortado (`resumenMax`) y enlace; `sentimiento` en -1..1; `tickers` conocidos.
- `ofertas/ofertas.json`: `id` estable = clave de producto (tienda + palabras del titulo); `ofertas/historial.json` esta indexado por ese mismo `id`. Extras opcionales: `precioUsd`, `clave`.

## Configuracion: `scripts/datos/config.json`

JSON no admite comentarios; cada campo esta aqui. Se valida al arrancar (`--validar-config`) con mensajes como `config.cripto.top: debe ser <= 250 (es 999)`; los campos desconocidos se rechazan (detecta erratas).

**`http`**: `userAgent` (texto con `{repo}`), `timeoutMs` (1000-120000), `reintentos` (0-6), `backoffMs`, `msPorDominio` (pausa minima entre peticiones al mismo host), `retrasosPorDominio` (`{"host": ms}`, sobreescribe el anterior; se ajusta a los limites de cada API). `tiempoMaximoPorFuenteMs`: tope por fuente.

**`cripto`**: `activo`; `top` (1-250); `sparklinePuntos`; `proveedores` (orden de preferencia entre `coingecko`, `binance`, `coincap`); `coingecko.base`/`cabeceraClave` (cambialo para una clave Pro); `binance.base`, `coincap.base`; `hist.{activo, top, dias, cadaHoras, maxPorEjecucion, maxCoingecko}` (historicos: cuantas monedas, cada cuanto se refrescan, y presupuesto de llamadas por ejecucion).

**`divisas`**: `activo`; `monedas` (codigos de 3 letras); `histDias`; `frankfurter.base`; `erapi.base`.

**`acciones`**: `activo`; `proveedor` (`auto` elige por la clave disponible: Finnhub, Twelve Data, Alpha Vantage); `moneda`; `simbolos` e `indices` (`{simbolo, nombre, bolsa?}`); `proveedores.<p>.{base, porEjecucion}` (simbolos refrescados por ejecucion: rotacion por antiguedad para respetar el plan gratuito); `hist.{activo, proveedor, dias, cadaHoras, maxPorEjecucion, simbolos}`.

**`nft`**: `activo`; `proveedor` (`auto`: Reservoir si hay `RESERVOIR_KEY`, si no CoinGecko NFT); `maxColecciones`; `reservoir.cadenas[{nombre, base}]`; `coingecko.{base, colecciones}` (ids de CoinGecko; sin clave se refrescan 8 por ejecucion y el resto conserva el ultimo dato).

**`cuotas`**: `activo`; `base`; `regiones` (`eu`, `uk`, `us`, `us2`, `au`); `mercados` (`h2h`, `totals`, `spreads`; cada region x mercado cuesta creditos); `deportes` (claves de The Odds API); `maxDeportesPorEjecucion`; `minMinutosEntreActualizaciones` (por deporte); `maxCasas`; `reservaCreditos` (deja de llamar si la cuota restante bajaria de aqui); `diasAdelante`. Solo se llama a deportes que la API marca *en temporada* (la lista de deportes no consume cuota).

**`noticias`**: `activo`; `maxItems`; `maxDias`; `porFuente`; `resumenMax`; `tickersExtra` (`{"SIMB":["Alias"]}`); `fuentes[{id, nombre, url, categoria, idioma, activo?}]` (43 feeds RSS/Atom/RDF de cripto, bolsa, economia, divisas, NFT, deportes y general, en es/en). Las URLs de feeds cambian con el tiempo: un feed roto aparece en `estado.json > noticias.detalle.fallos` y no afecta a los demas.

**`ofertas`**: `activo`; `moneda` (por defecto); `minDescuentoPct` (solo para paginas JSON-LD); `maxItems`; `maxDias` (antiguedad maxima); `historialDias`, `maxPuntosHistorial`; `respetarRobots`; `bloqueados` (dominios que **nunca** se descargan; `amazon.*` = cualquier TLD); `maxPaginasPorEjecucion` (tope global de paginas HTML); `fuentes[]`; `busqueda`.
  - Fuente `feed`: `{id, tipo:"feed", nombre, url, moneda, idioma, categoria}` (RSS/Atom de comunidades y tiendas; `categoria:"otros"` se infiere por palabras clave).
  - Fuente `jsonld`: `{id, tipo:"jsonld", nombre, urls:[...], tienda?, moneda?}` lee `<script type="application/ld+json">` con `Product`/`Offer`/`AggregateOffer`/`ItemList`.
  - Fuente `sitemap`: `{id, tipo:"sitemap", nombre, url, incluye?(regex), maxUrls?, tienda?}` toma URLs del sitemap (o indice) y lee cada pagina como `jsonld`.
  - `busqueda`: `{activo, proveedor:"auto"|"brave", palabras[], resultadosPorPalabra, maxPaginas, pais}`; requiere `BRAVE_SEARCH_KEY`. Cada resultado pasa por la lista de bloqueo y robots.txt antes de leerse.

Ejemplo de fuentes de pagina (no incluidas por defecto; usalas solo en sitios que lo permitan):

```json
{ "id": "mi-tienda", "tipo": "sitemap", "nombre": "Mi tienda", "url": "https://tienda.ejemplo/sitemap.xml", "incluye": "/producto/", "moneda": "EUR", "tienda": "Mi tienda", "maxUrls": 15 }
```

## Ofertas: limitaciones y responsabilidad

- **robots.txt** (RFC 9309): se descarga por origen y se respeta para toda pagina HTML o sitemap (regla mas larga, `*`, `$`, grupo del agente, `Crawl-delay`). 404/403 en robots = permitido; 5xx o red caida = no se lee. Los feeds RSS/Atom y las APIs son endpoints de sindicacion y no pasan por robots, pero si por la lista de bloqueo y el limite de tasa.
- **Dominios bloqueados** por defecto: Amazon, eBay, Walmart, AliExpress, Temu, Shein, MercadoLibre, Target, Best Buy, Costco, Alibaba y Wish. Sus terminos prohiben el scraping; solo pueden aparecer como *enlace* dentro de un titular de un feed de comunidad (no se descargan).
- Solo se guarda titulo, precio, tienda, imagen/enlace y metadatos; nunca articulos o fichas completas. Los enlaces llevan a sitios de terceros; precios y disponibilidad cambian y pueden ser erroneos (se extraen con heuristicas de texto).
- Sobre el sitio, la herramienta y su uso: revisa los terminos de cada fuente y de cada API (incluida la politica de almacenamiento/redistribucion de resultados de buscadores) antes de añadirla. Quien configura nuevas fuentes es el responsable de que su uso sea legitimo. Muchas APIs gratuitas limitan o prohiben el uso comercial.
- Mercados y apuestas: informacion educativa, no es asesoria financiera; la inversion y las apuestas implican riesgo de perdida; verifica edad y legalidad local.

## Pruebas

`node --test scripts/datos/test/*.test.js` cubre: XML/RSS/Atom/RDF/sitemap, JSON-LD, robots.txt, HTTP (reintentos, backoff, tasa por dominio, tope de tamano), sentimiento, tickers, normalizador de precios/monedas/fechas/cupones, bloqueo de dominios, validador de esquemas y de config, el parser de cada API (CoinGecko, Binance, CoinCap, Frankfurter, open.er-api, Finnhub, Twelve Data, Alpha Vantage, Reservoir, CoinGecko NFT, The Odds API), y el pipeline completo con fixtures (fallbacks, rotacion, conservacion de datos, contrato, robots y bloqueo).

Las respuestas de `fixtures/api/` reproducen la forma documentada de cada API; si un proveedor cambia su formato, la salida deja de cumplir el contrato y se conserva el dato anterior (visible en `estado.json`).
