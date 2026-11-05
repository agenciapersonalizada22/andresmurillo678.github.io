# Magnate

Juego de mesa de bienes raices (original) para 2-6 jugadores: humanos P2P (hasta 4, via `comun/red.js`) + bots (3 niveles). Sin build ni backend. Tablero 3D ligero con Three.js (`lib/`).

## Estructura (`js/`)
- `datos.js` tablero de 40 casillas, 8 barrios, cartas y reglas por defecto. `reglas.js` motor puro y serializable (sin DOM). `bots.js` heuristicas. `rng` va dentro del estado (`e.rng`).
- `sesion.js` anfitrion autoritativo / partida local / cliente, bots, temporizador, guardado y red. `vista.js` cola de animaciones. `tablero3d.js`, `textura.js`, `piezas.js`, `geometria.js` escena 3D.
- `hud.js`, `hojas.js`, `menu.js`, `panel_ajustes.js` interfaz; `entrada.js` teclado y mando; `sonido.js` audio procedural; `almacen.js` unico acceso a localStorage; `ajustes.js`; `logros.js`.

## Red, guardado y reconexion
- El anfitrion (asiento 0) es el unico que ejecuta `reglas.aplicar` (dados incluidos). Los clientes envian `accion` y reciben `estado` (instantanea completa + eventos para animar). Cada accion se valida en el motor; lo invalido se responde con `rechazo`.
- Guardado automatico del anfitrion/solo en `magnate_partida` tras cada accion, al ocultar la pagina y cada 15 s. Al recargar el menu ofrece Continuar. Si era una partida en linea: dialogo para abrir una sala nueva (los demas se reconectan) o continuar con piloto automatico.
- Cada humano recibe un token de asiento (`magnate_asiento` en su navegador). Tras una caida o recarga abre el enlace nuevo del anfitrion (menu ☰ > Invitar / reconectar); al conectar envia `reclamar` con su token y recupera asiento y estado. Un asiento desconectado lo juega un piloto automatico tras 6 s.
- Claves: `magnate_ajustes`, `magnate_ajustes_dispositivo` (graficos/controles, no sincronizable), `magnate_progreso`, `magnate_partida`, `magnate_asiento`, `magnate_setup`.

## Pruebas
`node pruebas/reglas.mjs` (reglas, serializacion y 2500 partidas entre bots con invariantes: banco+bote+jugadores = 0, casas/hoteles, cartas, construccion pareja). `node pruebas/sim.mjs [partidas] [semilla]` estadisticas.

## Cuenta (plataforma)
`js/arranque.js` exige sesion (`Cuenta.requerir`), hace la primera sincronizacion y carga `principal.js`. `js/nube.js` concentra todo lo de `Cuenta`: nube (`magnate_progreso` y `magnate_setup`; ajustes y partida en curso son locales), puntajes (`patrimonio_final`, `turnos_victoria`, `victorias`, solo al ganar), logros (mismos ids que `juegos.js`), XP (10 al jugar, 35 al ganar), ranking Global/Amigos (menu, fin de partida) y hoja de cuenta. Las pruebas e2e antiguas necesitan sesion (o `Cuenta.CONFIG.permitirInvitado = true`).
