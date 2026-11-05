# Terminal de Mercados (`herramientas/mercados/`)

Pagina estatica sin build. Abrir `index.html`. Informacion educativa, no asesoria financiera.

- **Datos**: `Datos.cargar` (contrato de la rama `datos`) -> respaldo directo desde el navegador (CoinGecko cripto, Frankfurter divisas) -> modo demo (`js/fixtures.js`, datos inventados y deterministas, siempre etiquetados). `?demo=1` fuerza demo; `?datos=<url/>` cambia la base.
- **Logica pura (UMD, probada en Node)**: `indicadores.js`, `riesgo.js`, `patrones.js`, `backtest.js`, `cartera.js`, `alertas.js`, `calculadoras.js`, `screener.js`, `sentimiento.js`, `treemap.js`, `divisas.js`, `almacen.js`, `fmt.js`.
- **Worker**: `worker.js` + `ops.js` (indicadores del grafico, backtests, metricas del screener, correlaciones); `calc.js` cae al hilo principal si no hay Worker.
- **UI**: `app.js` (ruteo, tema, busqueda Ctrl+K, alertas, mando), `grafica.js` (canvas), `tabla.js` (tabla virtualizada), `v-*.js` (vistas).
- **Persistencia**: `Almacen` (IndexedDB, respaldo localStorage/memoria), claves `mercados_*`, registros `{v, t}`; `claves_dispositivo*` nunca se exporta.
- **Pruebas**: `node herramientas/mercados/pruebas/ejecutar.js`. Las referencias de indicadores (`pruebas/referencias.json`) las genera `pruebas/generar_referencias.py` (Python/pandas, calculo independiente).
- **Limite sin servidor**: alertas y ordenes simuladas pendientes solo se evaluan con la pagina abierta.
