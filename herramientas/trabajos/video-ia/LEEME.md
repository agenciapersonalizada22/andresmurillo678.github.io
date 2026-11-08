# Video inteligente con IA (`trabajos_video_ia`)
100 % en el navegador, sin CDN ni modelos. Analítica clásica en Worker (`js/trabajador.js` + OffscreenCanvas) y IA opcional con la clave del usuario.
- Puro (Node/Worker): `analisis.js`, `tuberia.js`, `reglas.js` (reglas + pre-roll), `ia.js`, `graficas.js`. Pruebas: `node pruebas/analisis.test.js`, `node pruebas/reglas-ia.test.js`.
- Almacén: IndexedDB `trabajos_video_ia` (proyectos, reglas; sincronizados con Cuenta). Clave de IA solo en `trabajos_video_ia_claves_dispositivo`.
- Reutiliza: `comun/*`, `dispositivos/js` (cámara y puente vía `TrabajosDispositivos`), `qr/js` (QRLector), `comun/impresion.js` (informe).
## Canal para Automatizaciones
La acción «Disparar flujo» publica en `BroadcastChannel('trabajos_video_evento')`:
`{tipo:'video_evento', evento, valor, texto, t, ts, regla, flujo, proyecto, datos:{linea,dir,x,y}}`.
Los eventos QR además van a `trabajos_qr_leido` (`{texto}`), que ya escucha el disparador «QR leído». Para un disparador propio, añadir en `automatizaciones/js/catalogo.js` un nodo `video_evento` y en `ejecutor.js` un `BroadcastChannel` que llame a `V.ejecutar` (no hecho aquí).
## Límites
Diferencia de luminancia (objetos de igual luminancia que el fondo no se ven), blobs ≠ personas, fundidos no detectados, exportación en tiempo real, estabilización solo traslación.
