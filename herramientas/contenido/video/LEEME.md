# Editor de video (`contenido_video`)

Editor de video corto 100 % en el navegador (sin librerías externas, sin backend). Abre `index.html` servido por HTTP(S).

## Estructura
- `js/modelo.js`, `keyframes.js`, `subtitulos.js`, `mezcla.js`, `sonidos.js`, `muxer.js`, `paquete.js`, `filtros.js`: lógica pura (funciona en Node y en el navegador).
- `js/almacen.js` (IndexedDB, claves con prefijo `contenido_video_`, registros con marca de tiempo `mod`), `capacidades.js`, `fuentes.js`, `efectos.js` (WebGL + respaldo 2D), `compositor.js`, `motor.js`, `exportador.js`, `grabar.js`, `plantillas.js`.
- `js/util.js`, `linea.js`, `paneles.js`, `inspector.js`, `dialogos.js`, `app.js`: interfaz.

## Exportación
- WebCodecs + muxer propio: **MP4 (H.264 + AAC)** si el navegador puede codificarlo; si no **WebM (VP9/AV1/VP8 + Opus)**.
- Respaldo: MediaRecorder sobre `canvas.captureStream` + audio mezclado (tiempo real).
- iOS Safari: soporte limitado de WebCodecs/MediaRecorder; se usa el respaldo en tiempo real.
- Las opciones (formato, resolución hasta lo que acepte el codificador, fps, calidad/bitrate) se calculan con `isConfigSupported`.

## Pruebas
```
node pruebas/logica.test.js      # modelo, recorte/división/huecos, keyframes, SRT/VTT, mezcla de audio, sonidos
node pruebas/paquete.test.js     # archivo de proyecto
node pruebas/muxer.test.js       # MP4/WebM validados con ffprobe/ffmpeg y lectores independientes (pruebas/demux.js)
python3 -m http.server 8791 &    # desde la raíz del repo
node pruebas/e2e.mjs http://localhost:8791   # Playwright + Chromium (/opt/pw-browsers), genera medios con ffmpeg
```
Límites conocidos: sin Workers (la mezcla de audio y las miniaturas se procesan por tandas en el hilo principal); los "proxys" son fotogramas de vista previa reducidos e imágenes a menor resolución (no hay transcodificación de proxys de video); el video invertido en la vista previa se reproduce por saltos; el audio de un video se decodifica completo en memoria; los subtítulos automáticos usan la Web Speech API (micrófono, calidad variable, solo si existe).
