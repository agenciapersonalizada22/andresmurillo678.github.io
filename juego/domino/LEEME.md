# Dominó (juego/domino)

Dominó doble 6 / doble 9 / doble 12 con fichas dibujadas en canvas, modos **parejas (4)**, **todos contra todos (3-4)** y **duelo con pozo (2)**, hasta 4 personas por Red/Lobby + bots Novato/Medio/Experto. Sin dependencias externas.

## Reglas implementadas
Cadena lineal sin spinner; sale el doble más alto en la primera mano y después quien ganó la anterior; pase obligatorio sin jugada (duelo: se roba antes, las 2 últimas fichas del pozo no se roban); cierre por dominó o **tranque** (todos pasan seguidos: gana la menor suma, la pareja suma sus dos manos; empate = nadie anota); **capicúa** (cerrar con una ficha que cabe en los dos extremos: bono 0/25/50); puntos por mano = suma de todas las fichas restantes o solo de rivales; partida a meta configurable (50-300; por defecto 100/200/300 según variante).

## Módulos (`js/`)
- `reglas.js` motor puro y determinista (sin DOM): reparto, jugadas legales, cierre/puntos, `vista()` filtrada por asiento.
- `bots.js` IA por vista pública. Memoria (`observar`): fichas jugadas y números que cada rival no tiene (pases/robos). Experto: muestrea manos coherentes con esa deducción y simula manos completas (Monte Carlo, ≤100 ms por jugada).
- `cadena.js` disposición en serpiente de la cadena (pura): cada brazo gira al llegar al límite de fila (elegido según la forma del tablero para maximizar el zoom).
- `dibujo.js` fichas, dorsos, fantasmas de colocación y fieltros en canvas; `escena.js` mesa (animaciones de reparto/colocación, zoom, arrastre, pellizco, entrada táctil/ratón y API para teclado/mando); `ui.js` marcador, botones, chat y panel de fin; `entrada.js` teclado y mando.
- `mesa.js` árbitro del anfitrión (temporizadores, bots, ausentes, piloto automático; reloj inyectable), `sesion.js` Red/Lobby + guardado, `progreso.js` estadísticas/logros/fichas virtuales, `cuenta-domino.js` integración con Cuenta, `ajustes.js`, `sonido.js`, `tutorial.js`, `principal.js`, `almacen.js`.

## Mensajes de red
`dom_ini` (asiento + token), `dom_p` (paquete con vista filtrada y eventos), `dom_cmd` (jugar/robar/pasar/siguiente/chat), `dom_hola` (reconexión con token), `dom_no`. Los paquetes solo llevan tu mano y el conteo de las demás; el robo ajeno no revela la ficha; al cerrar la mano se muestran todas.

## Reconexión y guardado
El anfitrión guarda la mesa en `domino_mesa_host` (cada cambio y al ocultar la página; `est.log` permite reconstruir la memoria de los bots). Al recargar, el menú ofrece «Continuar»: solo → reanuda; multijugador → abre la sala, invita de nuevo y los clientes recuperan su asiento con el token guardado en `domino_asiento` (si no están, juega un bot). Claves: `domino_ajustes`, `domino_progreso` (única que va a la nube), `domino_ajustes_dispositivo` (gráficos/controles, nunca a la nube), `domino_mesa_host`, `domino_asiento`, `domino_apuesta`, `domino_tutorial`.

## Fichas virtuales
Apuesta opcional (10/50/100) con fichas del juego (empiezas con 1000; si bajas de 10 se te prestan 200). Cada humano apuesta al empezar la partida y el bote es para el ganador. No entran en ningún ranking.

## Cuenta
`arranque.js` exige sesión; ranking Global/Amigos de `victorias`, `puntos` y `capicuas`; logros con ids de `progreso.js`; XP 8 por mano ganada, +40/+10 por partida.

## Pruebas
`node juego/domino/pruebas/pruebas.mjs [rapido]`
