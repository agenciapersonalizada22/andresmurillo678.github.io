# Turismo Mundial

Juego de mesa de viaje por el mundo (original) para 1-6 jugadores: humanos P2P (hasta 4, via `comun/red.js`) + bots (3 niveles). Sin build ni backend. Tablero circular 3D ligero con Three.js (`lib/`). Moneda y apuestas 100% virtuales.

## Reglas en una mirada
- 40 casillas en anillo: 24 destinos reales (6 continentes x 4), 6 transportes (2 aeropuertos, 2 trenes, 2 puertos), cartas Viaje / Aduana / Suerte, Salida, Tasa turistica, Retencion aduanera y Zona franca (bote).
- Comprar destinos, subastas, hipotecas. Con `dominio` (3 de 4 por defecto) del continente se construye: museo, parque tematico, estadio y hotel resort (parejo).
- Rutas: en un transporte se paga pasaje para volar a cualquier destino/estacion, avanzar hasta 12 casillas en tren o cruzar al otro puerto. Un pase de viaje cubre el pasaje o libera de la retencion.
- Pasaporte: cada destino visitado por primera vez da un sello (+bono); 4 sellos de un continente dan bono y visa (-25% de renta alli).
- Eventos mundiales cada N rondas: temporada alta/baja (rentas x2 / x0.5 en un continente), huelga (vuelos y trenes cerrados), tormenta (cruceros cancelados), ofertón de vuelos, festival.
- Modos: Completo (ultimo en pie), Rapido (meta de 10 sellos), Por tiempo (gana patrimonio + sellos al acabar la ultima ronda).

## Estructura (`js/`)
- `datos.js` tablero, continentes, cartas, eventos, modos y reglas por defecto. `reglas.js` motor puro y serializable (sin DOM; `rng` dentro del estado). `bots.js` heuristicas (incluye eleccion de ruta).
- `sesion.js` anfitrion autoritativo / partida local / cliente, bots, temporizador, guardado y red. `vista.js` cola de animaciones. `tablero3d.js`, `textura.js` (tablero polar y globo en canvas), `piezas.js`, `geometria.js` escena 3D.
- `hud.js`, `hojas.js`, `menu.js` (incluye tutorial por pasos), `panel_ajustes.js` interfaz; `entrada.js` teclado y mando; `sonido.js` audio procedural; `almacen.js` unico acceso a localStorage; `ajustes.js`; `logros.js`; `nube.js` (Cuenta).

## Red, guardado y reconexion
- El anfitrion (asiento 0) es el unico que ejecuta `reglas.aplicar` (dados incluidos). Los clientes envian `accion` y reciben `estado` (instantanea completa + eventos). Lo invalido se responde con `rechazo`.
- Guardado automatico en `turismo_partida` tras cada accion, al ocultar la pagina y cada 15 s. Al recargar el menu ofrece Continuar; en linea ofrece abrir una sala nueva (los demas se reconectan con su token `turismo_asiento`) o seguir con piloto automatico. Un asiento desconectado lo juega un piloto automatico tras 6 s.
- Claves: `turismo_ajustes`, `turismo_ajustes_dispositivo` (graficos/controles, no sincronizable), `turismo_progreso`, `turismo_partida`, `turismo_asiento`, `turismo_setup`.

## Cuenta (plataforma)
`arranque.js` exige sesion (`Cuenta.requerir`) y sincroniza `turismo_progreso` y `turismo_setup`. `nube.js`: puntajes `patrimonio_final` (tope 30000), `sellos_partida` (tope 24), `victorias` (tope 2000), solo al ganar y con >= 2 rivales; XP 10/35; logros con los ids de `logros.js`; ranking Global/Amigos. Registro pendiente en `plataforma/juegos.js` + `firestore.rules` (id `turismo`).

## Pruebas
`node pruebas/reglas.mjs` (18 pruebas de reglas + 120 partidas entre bots con invariantes). `node pruebas/sim.mjs [partidas] [semilla]` estadisticas. E2E Playwright en `pruebas/e2e/` (servir `juego/` con `python3 -m http.server 8765`, `NODE_PATH` con playwright): `partida.mjs`, `escenas.mjs`, `cuenta.mjs`, `multijugador.mjs`, `mando_teclado.mjs`.
