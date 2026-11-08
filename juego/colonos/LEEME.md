# Colonos de Isla

Juego de colonización por turnos con tablero hexagonal (original: recursos, arte, cartas y nombres propios). 2-4 jugadores (humanos online P2P + bots de 3 niveles). Sin build ni servidor: `index.html` + módulos ES en `js/`.

## Estructura
| Módulo | Función |
|---|---|
| `js/geometria.js` | Geometría hexagonal pura (vértices, aristas, costa); ids estables por radio |
| `js/reglas.js` | Estado serializable + `aplicar(est, j, orden)`: fundación en serpiente, dados, producción (banco limitado), 7/descarte/bandido, construcción, comercio con jugadores y banco/puertos, cartas, camino más largo, ejército mayor, meta de PV configurable. Sin DOM |
| `js/bots.js` | Bots Fácil / Normal / Difícil (solo ven su vista filtrada) |
| `js/mesa.js` | Árbitro del anfitrión: bots, temporizadores, piloto automático, paquetes filtrados por asiento, guardado/restauración |
| `js/sesion.js` | Mesa + Red/Lobby (reconexión por token de asiento) |
| `js/tablero.js`, `js/iconos.js` | Canvas 2D: mar animado, losetas procedurales, piezas, mapa de calor, zoom/arrastre/pellizco |
| `js/ui.js`, `js/entrada.js`, `js/principal.js` | HUD, hojas (construir/comerciar/cartas/descarte), teclado, mando Xbox, menús |
| `js/ajustes.js`, `js/progreso.js`, `js/almacen.js`, `js/cuenta-colonos.js` | Ajustes, logros/estadísticas, almacenamiento y Cuenta (nube, ranking, logros) |

## Claves de localStorage
`colonos_ajustes` y `colonos_progreso` (se sincronizan con la nube), `colonos_ajustes_dispositivo` (gráficos/controles, nunca se sincroniza), `colonos_mesa_host` (partida del anfitrión), `colonos_asiento` (token de asiento del cliente), `colonos_tutorial`.

## Multijugador y reconexión
El anfitrión arbitra (`col_p` paquetes por asiento, `col_cmd` órdenes saneadas con `sanear`). Cada asiento humano tiene un token; el cliente lo guarda en `colonos_asiento`. Si el anfitrión recarga, restaura `colonos_mesa_host`, abre la sala (Continuar → Abrir sala) y los clientes entran con el enlace nuevo recuperando su asiento. Un jugador ausente es sustituido por un bot nivel Normal.

## Pruebas
`node juego/colonos/pruebas/pruebas.mjs` (geometría, tablero/puertos, fundación, producción y escasez, 7/descarte/bandido, puertos 4:1/3:1/2:1, camino más largo con cortes y empates, ejército, cartas, comercio, victoria configurable, partidas completas de bots, guardar/restaurar determinista, mesa con piloto automático). `node juego/colonos/pruebas/sim.mjs 0,1,2,2 2 20` simula partidas entre niveles.

## Registro en la plataforma (id `colonos`)
Modos de puntaje: `puntos` (pts, tope 100000), `victorias` (tope 5000), `racha` (tope 100), todos mayor es mejor. Solo cuentan partidas con 3+ jugadores y meta >= 8 PV. Logros: ver `js/progreso.js` (`LOGROS`).
