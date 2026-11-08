# Conquista Mundial (juego/conquista)

Juego de conquista del mundo por turnos, original (mapa y reglas propios), con 2-6 jugadores: hasta 4 personas por Red/Lobby (WebRTC P2P) y el resto bots de tres niveles (Recluta, Estratega, Maestro). Sin dependencias externas.

## Modos
- **Dominación**: elimina a todos. **Misiones secretas**: cumple tu objetivo (dos continentes, eliminar a un jugador, 24 territorios, 18 con 2+ ejércitos). **Rápido**: despliegue automático, gana quien controle 29 de 48 territorios. **Equipos**: 4 o 6 jugadores en 2 bandos (no se ataca a aliados).
- Opciones: misiones secretas opcionales en cualquier modo (salvo equipos), tiempo por turno (si se agota, un bot termina el turno), límite de rondas (gana quien tenga más territorios).

## Módulos (`js/`)
- `mapa.js` (sin DOM): 48 territorios y 6 continentes. Las tierras son polígonos lon/lat dibujados a mano; cada territorio es la unión de celdas de Voronoi (semillas) recortadas a la costa, así las fronteras coinciden exactamente. Vecindad terrestre automática (aristas compartidas) + rutas marítimas (`RUTAS`).
- `reglas.js` (sin DOM): estado serializable, órdenes validadas (`orden(est, j, cmd)`), dados con PRNG sembrado, probabilidades exactas (`distRonda`, `probConquista`), cartas, objetivos, victoria, `vista()` filtrada por jugador.
- `bots.js`: IA (probabilidad de conquista, bonos de continente, misión, fortificación). `partida.js`: árbitro del anfitrión (bots, ausentes, temporizador de turno, paquetes por asiento).
- `sesion.js`: une Partida con Red/Lobby (`cq_ini`, `cq_p`, `cq_cmd`, `cq_hola`, `cq_no`, `cq_err`), guardado y restauración.
- `mapaui.js` (SVG, zoom/arrastre/pellizco/rueda, resaltes, efectos), `ui.js` (chips, reproducción de eventos, hojas de ataque/movimiento, cartas, misión, mundo, fin, pistas), `entrada.js` (teclado/mando), `ajustes.js`, `sonido.js`, `progreso.js`, `cuenta-conquista.js`, `almacen.js`, `principal.js`, `arranque.js`.

## Privacidad y reconexión
- El anfitrión es autoritativo: cada cliente recibe solo su mano y su misión; de los demás únicamente conteos.
- Cada asiento humano tiene un token que el cliente guarda en `conquista_asiento`. Si cae, un bot juega por él; el anfitrión abre Menú > «Invitar / reconectar amigos», el cliente abre el enlace nuevo y envía `cq_hola` con su token para recuperar asiento y vista.
- El anfitrión guarda la partida en `conquista_partida_host` tras cada cambio y al ocultar la página. Al recargar el menú ofrece «Continuar»; en multijugador abre la sala, los clientes recuperan su asiento y al pulsar Iniciar se restaura.

## Claves de localStorage
`conquista_progreso` (sincroniza con la nube), `conquista_ajustes` (última configuración de partida), `conquista_ajustes_dispositivo` (gráficos, audio, controles, accesibilidad: nunca a la nube), `conquista_partida_host`, `conquista_asiento`, `conquista_tutorial`.

## Cuenta
`arranque.js` exige sesión (`Cuenta.requerir()`); `cuenta-conquista.js` aplica perfil, nube (`autoSincronizar('conquista', ['conquista_progreso'])`), puntajes (`victorias`, `territorios`), logros, XP (50 por victoria, 12 por partida), ranking Global/Amigos y panel de cuenta.

## Pruebas
`node juego/conquista/pruebas/pruebas.mjs [rapido]`: mapa, distribuciones exactas de dados (1v1…3v2), Monte Carlo del motor, reparto, refuerzos, ataque, conquista, cartas, misiones, equipos, serialización, simulaciones completas por modo y comparación de bots.
