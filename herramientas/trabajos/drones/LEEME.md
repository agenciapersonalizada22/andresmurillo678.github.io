# Drones y cámaras (Trabajos)

Planificador de misiones, seguridad, equipo de cámara, tomas y telemetría. Sin librerías ni CDN: el mapa es un canvas con rejilla en metros (opcional: imagen de plano propia). Honestidad: la web NO controla drones DJI; exporta planes y, con un puente local, lee telemetría de Tello/MAVLink.

## Estructura
Puro (Node + navegador, probado): `geo.js`, `calculos.js` (FOV, GSD, solape, ND, hiperfocal, monturas, viento/batería), `patrones.js` (órbita, espiral, cuadrícula, lineal, revelación), `mision.js` (estadísticas, línea de tiempo), `exportar.js` (KML, GPX, JSON, CSV, QGC .plan), `telemetria.js` (parseo de tramas y logs), `catalogo.js` (equipo/normas/checklist/tomas base), `hojas.js` (páginas SVG en mm para `comun/impresion.js`).
UI: `datos.js` (IndexedDB `trabajos_drones`; sincroniza proyectos, equipo, normas y bitácora; los planos se quedan en el dispositivo), `app.js`, `mapa.js`, `vista-*.js`, `arranque.js`. Pruebas: `node pruebas/drones.test.js`.

## Misión
Coordenadas locales (este/norte en metros desde el despegue «H»); lat/lon solo al exportar. Cuadrícula de mapeo: líneas y disparo por distancia (`fotoCada`) calculados con cámara y solapes. Consumo: P(v)=P_hover·(1+0,004·v²) + energía de subida (estimación; calibra con tu bitácora).
`.plan` (QGroundControl, PX4=12 / ArduPilot=3): despegue 22, waypoint 16, velocidad 178, gimbal 1000, foto 2000/2001, video 2500/2501, RTL 20.

## Telemetría en vivo (JSON)
Una trama por mensaje WebSocket (o por línea en serie): `{"t":ms,"lat":4.711,"lon":-74.07,"alt":35.2,"vel":6.1,"rumbo":92,"bat":78,"volt":15.2,"sats":14,"pitch":-2,"roll":1,"modo":"AUTO"}`. Alias: latitude, longitude, speed, groundspeed, heading, battery… (lat/lon ×1e7 también). El estado texto del Tello (`bat:87;h:30;yaw:10;…`, h en cm) se entiende. Usa `TrabajosDispositivos` (`puente` y `serial`) del módulo dispositivos. Un puente debe traducir UDP/MAVLink a JSON (no incluido; el puente mínimo de dispositivos solo reenvía). Sin hardware, «Probar con tramas simuladas» alimenta la interfaz desde el plan.
Logs: CSV/JSON/NDJSON; unidades entre paréntesis (feet, mph, km/h, millisecond) se convierten.

## Límites
Normativa: perfiles orientativos editables; hay que verificar la ley local. Sin teselas de mapa reales (solo rejilla y plano propio). Telemetría en vivo no probada con hardware real.
Logros sugeridos (ids): drones_primer_waypoint, drones_patron_*, drones_exporto_*, drones_checklist_completo, drones_bitacora, drones_simulo_mision, drones_telemetria_en_vivo, drones_log_cargado, drones_shot_list, drones_hoja_impresa.
