# Análisis (`trabajos_analisis`)
Lee (solo lectura, con permiso explícito) las 9 bases IndexedDB de Trabajos y calcula tablero, dominios, cruces, informes, metas y salud. Escribe en otras bases solo en limpieza/restauración confirmadas (con respaldo previo y marcas de borrado de sync).
Puro y probado: `js/agregar.js`, `cruces.js`, `integridad.js`, `respaldo.js`, `informe.js`, `ia.js`, `flujos.js` (`node pruebas/analisis.test.js`). E2E: `node pruebas/e2e.js <carpeta> [url_base]`.
Almacén propio: IndexedDB `trabajos_analisis` (metas, sincronizadas). Clave de IA solo en `trabajos_analisis_claves_dispositivo`.
Límites: Video IA no guarda eventos/capturas/clips (se infieren de ejecuciones de Automatizaciones con origen «video»); coste de IA solo ~7 días; las lecturas de QR no guardadas no se cuentan.
Logros sugeridos: analisis_exporto_tablero, analisis_informe, analisis_resumen_ia, analisis_flujo_sugerido, analisis_metas, analisis_limpieza, analisis_respaldo, analisis_restauro.
