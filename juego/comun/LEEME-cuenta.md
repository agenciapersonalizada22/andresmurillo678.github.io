# Cuenta: plataforma de usuarios, nube, rankings y amigos

`window.Cuenta` (`comun/cuenta.js`) es la API unica para iniciar sesion, guardar en la nube, puntajes, logros, XP, amigos e invitaciones. Funciona con **Firebase** (Authentication + Firestore) o, sin configuracion, en **modo demo local** (localStorage, solo en ese dispositivo). Los juegos usan la misma API en los dos modos. Configuracion para el dueno del sitio: `plataforma/CONFIGURAR.md`.

## Archivos
| Archivo | Para que |
|---|---|
| `comun/firebase-config.js` | Config publica de Firebase (vacia = modo demo) y `CUENTA_OPCIONES` |
| `comun/cuenta.js` | API, logica pura, cola offline, UI comun (`Cuenta.ui`); carga sola el adaptador |
| `comun/cuenta-local.js` / `cuenta-firebase.js` + `comun/vendor/firebase-bundle.js` | Adaptadores (SDK 10.14.1 vendorizado, solo auth+firestore, ~485 KB, solo se descarga con config real) |
| `comun/amigos.js` + `comun/cuenta.css` | Notificaciones de invitaciones (sonido suave + vibracion), toasts, modales |
| `plataforma/juegos.js` | Tabla de juegos, modos de puntaje (`mayorEsMejor`, `tope`) y logros. **Debe coincidir con `firestore.rules`** |
| `plataforma/firestore.rules` | Reglas de seguridad |

## Integracion en un juego (fase siguiente)
```html
<link rel="stylesheet" href="../comun/lobby.css"><link rel="stylesheet" href="../comun/cuenta.css">
<script src="../comun/firebase-config.js"></script><script src="../comun/mando.js"></script>
<script src="../comun/red.js"></script><script src="../comun/lobby.js"></script>
<script src="../plataforma/juegos.js"></script><script src="../comun/cuenta.js"></script><script src="../comun/amigos.js"></script>
```
```js
Cuenta.requerir().then(function (u) {            // sin sesion redirige al portal (?volver=) y regresa tras entrar
  arrancarJuego();                                 // u = null solo si Cuenta.CONFIG.permitirInvitado = true
  Cuenta.nube.autoSincronizar('nebula', ['nebula_save', 'nebula_ajustes'], { recargar: true });
});
Cuenta.puntaje('nebula', 'puntos', puntos);        // al terminar la partida (solo guarda si mejora)
Cuenta.logro('nebula', 'jefe');                    // una vez por logro (toast + 25 XP)
Cuenta.xp('nebula', 40);                           // se agrupa y envia cada ~12 s
Lobby.registrar(OPTS); if (Lobby.hayEnlace()) Lobby.abrir(OPTS);   // ?sala= (enlace manual), ?inv= (invitacion directa) y ?invitar= (desde el portal)
```
Al cargar, la pagina del juego publica automaticamente la presencia `jugando` + id del juego (derivado de `/juego/<id>/`) y guarda el "ultimo juego". Ids validos: `nebula, ciudad, bloques, guerra, ajedrez, metropolis`. Para un modo de puntaje nuevo: anadelo en `juegos.js` **y** en `topes()` de `firestore.rules` y vuelve a publicar las reglas (`plataforma/pruebas/logica.test.mjs` comprueba que coincidan). Un modo desconocido se rechaza con `codigo: 'modo_desconocido'`.

## API
Todo devuelve promesas y **no revienta sin red** (las escrituras se encolan en `localStorage` y se reintentan al volver la conexion o cada 30 s). Los errores traen `e.codigo` y un `e.message` en espanol (`Cuenta.mensajeError(e)`).

**Sesion**: `Cuenta.iniciar()` (idempotente, nunca rechaza; resuelve el usuario o `null`), `Cuenta.usuario` (`{uid, usuario, nombre, color, avatar, xp, nivel, nivelInfo, correo}` o `null`), `Cuenta.modo` (`'firebase'|'local'`), `Cuenta.demo`, `Cuenta.registrar(usuario, clave, {recordar, color, avatar})`, `Cuenta.entrar(usuarioOCorreo, clave, {recordar})`, `Cuenta.salir()`, `Cuenta.cambiarContrasena(actual, nueva)`, `Cuenta.borrarCuenta(clave)`, `Cuenta.actualizarPerfil({nombre, color, avatar})`, `Cuenta.vincularCorreo(correo, clave)`, `Cuenta.restablecerContrasena(correo)`, `Cuenta.exportarDatos()`, `Cuenta.nombreDisponible(n)`, `Cuenta.alCambiar(fn)` (sesion; `fn(usuario|null)`), `Cuenta.on(evento, fn)` -> funcion para desuscribir. Eventos: `sesion, perfil, nivel, xp, logro, logros, puntaje, amigos, invitacion, invitaciones, cola, sincronizado`.
`Cuenta.requerir({redirigir=true})`: protege una pagina (ver "Proteccion"). `Cuenta.CONFIG.permitirInvitado` (por defecto `false`; ponlo a `true` antes de `requerir()` para dejar jugar sin cuenta: `usuario` queda `null` y las funciones de nube devuelven `sin_sesion`).

**Nube** (`Cuenta.nube`): `guardar(juego, datos, {ranura})` (JSON comprimido gzip+base64, trozos de 700 KB, maximo 8), `cargar(juego, {ranura, meta})`, `ranuras(juego)`, `borrar(juego, {ranura})`, `sincronizar(juego, claves[], {preguntar, recargar, alConflicto})` y `autoSincronizar(juego, claves[], {cadaMs})` -> `{parar, primera, ahora}`. Ranuras: `principal` o `[a-z0-9]{1,12}`.
`sincronizar` compara hashes: solo cambio local -> sube; solo cambio en la nube -> baja; ninguno -> `igual`; **ambos cambiaron o primera vez en un dispositivo con datos distintos -> dialogo** "Usar nube / Usar este dispositivo / Conservar ambos" (ambos = lo local queda principal y lo anterior de la nube pasa a la ranura `respaldo`). Resultado `{estado: 'igual'|'subido'|'bajado'|'sinRed'|'cancelado'|'sinSesion', conflicto?}`. Tras `bajado` el juego debe volver a leer sus claves (o usa `recargar:true`).

**Puntajes**: `puntaje(juego, modo, valor)` -> `{mejoro, valor, pendiente}`, `top(juego, modo, n=10, {soloAmigos})` -> `[{pos, uid, nombre, color, valor, yo}]`, `miPosicion(juego, modo)` -> `{posicion, valor, total}`, `miMejor(juego, modo)`.
**Logros/XP**: `logro(juego, id)` (id `[a-z0-9_]{1,40}`, max 100 por juego), `logros(juego?)`, `xp(juego, n)` (1..1000 por llamada), `xpJuego(juego)`, `ultimoJuego()`. Nivel global: nivel N empieza en `100*N*(N-1)/2` XP (100, 300, 600...), tope 100 (`nivelInfo` = base, siguiente, fraccion).
**Amigos**: `Cuenta.amigos.lista` (`{uid, nombre, color, avatar, nivel, estado: 'en_linea'|'jugando'|'ausente'|'desconectado', juego}`), `.solicitudes`, `.enviadas`, `.enviar(nombreExacto)`, `.aceptar(uid)`, `.rechazar(uid)`, `.quitar(uid)`, `.buscar(nombre)`, `.alCambiar(fn)`. `Cuenta.presencia(estado, {juego})` (latido cada 60 s, `ausente` al ocultar la pestana, se borra al salir; un amigo se ve `desconectado` si pasan 150 s sin latido).
**Invitaciones**: `Cuenta.invitar(uidAmigo, juegoId, oferta)` -> `{id, uid, expira}` (`oferta` = `codigo` de `Red.invitar()`), `Cuenta.escucharRespuesta(uid, id, fn)` (`fn({estado, respuesta})`), `Cuenta.alInvitacion(fn)`, `Cuenta.invitaciones`, `Cuenta.responderInvitacion(inv|id, aceptar, respuestaRed)`, `Cuenta.cancelarInvitacion`, `Cuenta.borrarInvitacion`. Caducan a los 5 minutos y se responden una sola vez (lo hacen cumplir las reglas).

## Invitacion directa (sin copiar ni pegar)
`Lobby` (ya integrado) muestra **Invitar amigo en linea** al anfitrion con sesion: elige un amigo conectado -> `Red.invitar()` -> `Cuenta.invitar` -> el amigo recibe un aviso (`amigos.js`, en portal o en cualquier juego) -> Aceptar: si ya esta en ese juego `Lobby.unirseInvitacion(inv)`; si no, abre el juego con `?sala=<codigo>&inv=<id>` -> `Red.unirse` genera su respuesta, la escribe en la invitacion y el anfitrion la aplica con `Red.aceptarRespuesta`. El flujo manual (enlace + codigo) sigue disponible. Desde el portal, "Invitar" en un amigo abre el juego con `?invitar=<uid>` (el lobby crea la sala y le envia la invitacion). Los juegos solo deben llamar `Lobby.registrar(OPTS)` al cargar y `if (Lobby.hayEnlace()) Lobby.abrir(OPTS)` (ahora tambien cubre `?invitar=`).

## Proteccion (honestidad)
`requerir()` es una **proteccion de cortesia**: en un sitio estatico cualquiera puede abrir la URL de un juego saltandose el portal (un juego sin `requerir()` o con JavaScript alterado se abre igual). Lo que **si** esta protegido son los datos en la nube, por las reglas de Firestore: nadie escribe lo ajeno, amistades con doble confirmacion, invitaciones solo a amigos, presencia solo de amigos. Los **puntajes los envia el navegador**: Firestore no puede comprobar que la partida fue real; las reglas solo acotan (tope por modo, solo se acepta mejorar, un documento por jugador, tipos y tamanos). Alguien con la consola del navegador puede enviar un puntaje alto dentro del tope. Si importa, baja los topes en `juegos.js`/reglas o agrega validacion en servidor (Cloud Functions, requiere plan Blaze).

## Modo demo y pruebas
Sin config (o `CUENTA_OPCIONES.modo = 'local'`) todo vive en `localStorage` (`cuenta_local_v1`): las "cuentas" existen solo en ese dispositivo, las contrasenas usan PBKDF2 pero **no es seguridad real**. Se muestra el aviso "Modo demo". Para probar con emuladores: `FIREBASE_CONFIG.emuladores = {auth:'http://127.0.0.1:9199', firestore:['127.0.0.1', 8181]}` (solo desarrollo). Pruebas: `node plataforma/pruebas/logica.test.mjs` (sin dependencias) y `plataforma/pruebas/reglas.test.cjs` (requiere Java + emulador, ver cabecera).
