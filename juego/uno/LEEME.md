# UNO (juego/uno)

Cartas tipo UNO con arte SVG propio, 2-6 asientos (hasta 4 personas por Red/Lobby + bots Novato/Medio/Estratega), reglas de la casa y sin dependencias externas.

## Modulos (`js/`)
- `reglas.js` motor puro (sin DOM): mazo de 108, jugadas, +4 con desafio, UNO/caza, puntuacion, `vista()` filtrada.
- `bots.js` IA por vista publica (el Estratega deduce colores que faltan a cada rival con los eventos publicos).
- `mesa.js` arbitro del anfitrion: temporizadores, bots, ausentes, guardado; reloj inyectable (`relojVirtual` para simular).
- `sesion.js` une Mesa con `Red`/`Lobby` (mensajes `uno_ini`, `uno_p`, `uno_cmd`, `uno_hola`, `uno_no`) y guarda/restaura la mesa.
- `ui.js`, `entrada.js`, `ajustes.js`, `principal.js`, `cartas.js`, `sonido.js`, `progreso.js`, `almacen.js`.

## Privacidad
El anfitrion reparte y arbitra. Cada cliente recibe solo su mano y el conteo de las demas; los eventos de robo ajenos no llevan ids de carta y el desafio revela solo un booleano. `pruebas/pruebas.mjs` lo verifica en miles de partidas.

## Reconexion y guardado (documentacion del flujo)
- Cada asiento humano tiene un token. El cliente lo guarda en `uno_asiento` al recibir `uno_ini`.
- Si un cliente se cae, el anfitrion marca el asiento ausente y un bot juega por el. Para volver: el anfitrion abre Menu > "Invitar / reconectar amigos", envia el enlace nuevo, el cliente lo abre (Lobby, conexion manual) y la pagina envia `uno_hola` con su token; el anfitrion lo reasigna a su asiento y le reenvia la vista. Sin token, se acepta un asiento vacante con el mismo nombre.
- El anfitrion guarda la mesa en `uno_mesa_host` (cada cambio y al ocultar la pagina). Al recargar, el menu ofrece "Continuar partida": en solitario reanuda; en multijugador abre la sala, invita de nuevo (los clientes recuperan asiento por token) y al pulsar Iniciar la mesa se restaura.
- Claves: `uno_ajustes` (sincronizable), `uno_progreso` (sincronizable), `uno_ajustes_dispositivo` (graficos/controles, nunca a la nube), `uno_mesa_host`, `uno_asiento`, `uno_tutorial`.

## Pruebas
`node juego/uno/pruebas/pruebas.mjs [rapido]`
