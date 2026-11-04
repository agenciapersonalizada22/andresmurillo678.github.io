# juego/comun: multijugador

Scripts clasicos (sin build): `mando.js`, `red.js` (`window.Red`), `lobby.js` + `lobby.css` (`window.Lobby`). API completa en la cabecera de `red.js` y `lobby.js`.

Topologia estrella por WebRTC DataChannel (anfitrion <-> amigos, hasta 4). Sin servidor: el anfitrion pulsa "Invitar amigo" y envia un enlace `?sala=...` (~150 caracteres); el amigo lo abre, la pagina genera un codigo de respuesta (~100 caracteres) que el amigo devuelve y el anfitrion pega. STUN publico en `Red.config.iceServers`; sin TURN, NAT estrictos pueden fallar.

## Integracion minima
```html
<link rel="stylesheet" href="../comun/lobby.css">
<script src="../comun/mando.js"></script><script src="../comun/red.js"></script><script src="../comun/lobby.js"></script>
```
```js
var OPTS = { juego: 'Mi juego', maxJugadores: 4, modos: [{id:'coop',nombre:'Cooperativo'},{id:'vs',nombre:'Versus'}],
  alIniciar: function (config, jugadores) { /* en TODOS los equipos; config.modo, config.semilla igual para todos */ empezar(config, jugadores); } };
botonMultijugador.onclick = function () { Lobby.abrir(OPTS); };
if (Lobby.hayEnlace()) Lobby.abrir(OPTS);              // el amigo llego con ?sala=: abre en modo "unirse"

// en partida: cada jugador difunde su estado ~15-20 Hz por el canal rapido y se interpola
var remotos = {};                                       // id -> Red.Interpolador
Red.on('mensaje', function (tipo, d, de) {
  if (tipo === 'pos') (remotos[de] = remotos[de] || new Red.Interpolador({ angulos: ['ry'] })).agregar(d.t, d.p);
  if (tipo === 'disparo') crearBala(d);                 // eventos importantes: fiables (por defecto)
});
setInterval(function () { Red.difundir('pos', { t: Red.reloj(), p: Red.compactar({ x: x, y: y, ry: ry }) }, { fiable: false }); }, 50);
// al pintar: var s = remotos[id].obtener(); // {x,y,ry} o null
Red.on('jugadorSalio', function (id) { delete remotos[id]; });
Red.on('cerrado', function () { /* volver a un solo jugador */ });
```
Notas: mientras `Lobby.abierto` pausa tu entrada y no llames `Mando.leer()` en paralelo. Los tipos de mensaje que empiezan por `_` son internos. El anfitrion es la referencia de `Red.reloj()` y debe ser autoritativo sobre enemigos/mundo. Perfil: `Red.perfil.obtener()` (`localStorage` `juego_perfil`).
