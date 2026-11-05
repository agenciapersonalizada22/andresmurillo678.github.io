# Configurar el proceso de datos (paso a paso)

Todo es gratuito y funciona **sin claves** para cripto (CoinGecko), divisas (Frankfurter) y noticias. Las claves opcionales anaden acciones, cuotas deportivas, NFT con Reservoir y busqueda de ofertas. Los limites de los planes cambian: **verifica siempre en la pagina oficial** de cada proveedor.

## 1. Habilitar GitHub Actions

1. Entra en el repositorio > **Settings > Actions > General**.
2. En *Actions permissions* elige **Allow all actions and reusable workflows** (o permite `actions/checkout` y `actions/setup-node`).
3. En *Workflow permissions* elige **Read and write permissions** y guarda (el proceso publica la rama `datos` con `GITHUB_TOKEN`).
4. Los workflows programados solo corren desde la **rama por defecto**: fusiona (merge) a ella los cambios que anaden `.github/workflows/`.

## 2. Crear las claves gratuitas (todas opcionales)

Registrate en cada sitio con tu correo, copia la clave y guardala en un lugar privado. Nunca la pegues en el codigo ni en un issue.

| Secreto | Para que sirve | Donde sacarla |
|---|---|---|
| `FINNHUB_KEY` | Acciones (recomendado) | finnhub.io > Register > Dashboard > API key |
| `TWELVEDATA_KEY` | Acciones y historicos | twelvedata.com > Sign up > API Keys |
| `ALPHAVANTAGE_KEY` | Acciones (alternativa) | alphavantage.co > Get free API key |
| `ODDS_API_KEY` | Cuotas deportivas | the-odds-api.com > Get API key |
| `RESERVOIR_KEY` | NFT (opcional; sin ella se usa CoinGecko NFT) | docs.reservoir.tools > API keys. Comprueba en su pagina que el servicio sigue activo |
| `BRAVE_SEARCH_KEY` | Busqueda de ofertas por palabra clave (opcional) | brave.com/search/api > plan gratuito > API key |
| `COINGECKO_KEY` | Cripto: clave *Demo* para mas margen (opcional) | coingecko.com/en/api > Create Demo Account |

Basta **una** clave de acciones. Si hay varias, `acciones.proveedor: "auto"` prefiere Finnhub, luego Twelve Data, luego Alpha Vantage; los historicos prefieren Twelve Data (el endpoint de velas de Finnhub suele ser de pago).

Limites de los planes gratuitos (creditos por minuto/dia/mes, historico incluido, uso comercial): **verifica en la pagina oficial**. El proceso los respeta con ajustes en `config.json`: `acciones.proveedores.<p>.porEjecucion` (cuantos simbolos por ejecucion; se rotan), `cuotas.maxDeportesPorEjecucion`, `cuotas.minMinutosEntreActualizaciones` y `cuotas.reservaCreditos`. Si tu plan es mas restrictivo, baja esos numeros; si es mas generoso, subelos.

## 3. Guardar las claves como secretos del repositorio

1. Repositorio > **Settings > Secrets and variables > Actions**.
2. Pulsa **New repository secret**.
3. *Name*: el nombre exacto de la tabla (p. ej. `FINNHUB_KEY`); *Secret*: la clave. **Add secret**.
4. Repite para cada clave. Un secreto ausente o vacio simplemente desactiva esa fuente (queda como `sin_clave` en `estado.json`).

## 4. Primera ejecucion manual

1. Pestana **Actions** > workflow **Datos rapidos** > **Run workflow** (rama por defecto) > **Run workflow**.
2. Repite con **Datos lentos**. La primera ejecucion crea la rama `datos`; los historicos y ofertas se completan en ejecuciones sucesivas (rotacion).
3. Abre cada ejecucion para ver el resumen: las fuentes con problema aparecen como advertencias (`Fuente de datos ...`).
4. Despues corren solas: rapidos cada ~10 min, lentos cada ~30 min (GitHub puede retrasar los cron unos minutos).

## 5. Comprobar `estado.json`

Abre `https://raw.githubusercontent.com/<usuario>/<repositorio>/datos/estado.json`. Debe verse algo asi:

```json
{ "fuentes": { "cripto": { "ok": true, "ultimo": "2026-...", "items": 250 },
               "acciones": { "ok": false, "ultimo": null, "error": "sin_clave: ...", "items": 0 } } }
```

- `ok:true` y `ultimo` reciente = funciona. `ok:false` + `error` = causa (clave ausente, limite del plan, fuente caida); mientras tanto se siguen sirviendo los ultimos datos buenos.
- `detalle` indica el proveedor usado, feeds rotos, paginas omitidas por robots.txt/bloqueo y los creditos restantes de The Odds API.

## 6. Cambiar la URL base en la web

Por defecto la web lee `https://raw.githubusercontent.com/agenciapersonalizada22/andresmurillo678.github.io/datos/`. Si el repositorio tiene otro dueno o nombre, define antes de cargar `herramientas/comun/datos.js`:

```html
<script>window.DATOS_CONFIG = { baseUrl: 'https://raw.githubusercontent.com/<usuario>/<repo>/datos/' };</script>
```

o prueba temporalmente con `?datos=<url-base-con-barra-final>`. Si el repositorio es privado, `raw.githubusercontent.com` no sera accesible desde la web publica.

## 7. Personalizar

Edita `scripts/datos/config.json` (campos documentados en [LEEME.md](LEEME.md)): simbolos de bolsa, monedas, deportes, feeds, fuentes de ofertas, palabras de busqueda. Antes de subir el cambio, validalo:

```
node scripts/datos/ejecutar.js --validar-config
```

Si hay errores, el mensaje indica la ruta exacta (`config.noticias.fuentes[3].url: no es una URL valida ...`). Tambien se valida al abrir un pull request (workflow *Datos - pruebas*).

## 8. Problemas frecuentes

- **No aparece la rama `datos`**: revisa el paso 1.3 (permisos de escritura) y que el workflow se ejecuto en la rama por defecto.
- **Los workflows dejaron de ejecutarse**: GitHub desactiva los programados tras un periodo largo sin actividad en repositorios publicos (verifica el plazo en su documentacion). Reactivalos en la pestana Actions.
- **`sin_clave` en acciones o cuotas**: falta el secreto o su nombre no coincide exactamente.
- **Limite del plan alcanzado** (p. ej. Alpha Vantage): baja `porEjecucion` o pasa a otro proveedor.
- **Feeds rotos**: normal con el tiempo; sustituye la URL en `noticias.fuentes` o ponle `"activo": false`.
- **Una fuente de ofertas no devuelve nada**: mira `ofertas.detalle.omitidas` (robots.txt o dominio bloqueado). No se debe saltar: respeta lo que el sitio prohibe.

## 9. Aviso

Los datos son informativos, pueden tener retraso o errores y no constituyen asesoria financiera ni garantia de resultados. La inversion y las apuestas implican riesgo de perdida; verifica edad y legalidad local. Los enlaces de ofertas llevan a sitios de terceros. Revisa los terminos de uso de cada proveedor, sobre todo para uso comercial.
