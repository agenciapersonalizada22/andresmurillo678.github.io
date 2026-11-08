# Panel de dispositivos (Trabajos)

Detecta lo que permite el navegador y conecta/prueba: Web Serial, Web Bluetooth (BLE), WebUSB, WebHID, cámaras y micrófonos, mandos (reutiliza `juego/comun/mando.js`), sensores del móvil, y un puente WebSocket para lo que la web no alcanza (drones Tello por UDP, impresoras de red, domótica). Sin librerías ni backend.

Limites reales (ver pestaña Panel): DJI no tiene API web directa; el Tello usa UDP y requiere puente; Safari/Firefox no tienen Serial/BT/USB/HID; Bluetooth clásico no es accesible; los navegadores no abren sockets TCP/UDP. Todo requiere HTTPS o localhost y un gesto del usuario.

## Estructura
`js/puro.js` (parsers/formateadores, sin DOM) · `js/capacidades.js` (matriz y diagnóstico) · `js/nucleo.js` (API) · `js/drv-*.js` (drivers) · `js/datos.js` (perfiles e historial, IndexedDB `trabajos_dispositivos`, sincronizado con la cuenta salvo claves) · `js/vista-*.js` (interfaz) · `puente/puente-minimo.js` (puente Node de 22 líneas, requiere `npm i ws`). Pruebas: `node pruebas/dispositivos.test.js`.

## API `window.TrabajosDispositivos`
Cargar: `puro.js`, `capacidades.js`, `nucleo.js`, los `drv-*.js` que necesites y (opcional) `almacen.js` + `datos.js`.

- `conectar(tipo, opciones)` -> `Promise<Conexion>`. Llamar desde un gesto del usuario. Tipos: `serial`, `bluetooth`, `usb`, `hid`, `camara`, `microfono`, `mando`, `sensores`, `puente`.
- `escuchar(filtro, fn)` -> función para cancelar. `filtro`: `'datos'|'estado'|'error'|'conectado'|'desconectado'|'*'` o `{evento, tipo, id}`.
- `enviar(id, datos, opts)`, `desconectar(id)`, `listar([tipo])`, `obtener(id)`, `cerrarTodo()`, `tipos()`, `soportado(tipo)`, `capacidades()`, `errores` (últimos errores explicados), `registrarError(tipo, err)`.
- Con `datos.js`: `perfiles.{lista,guardar,borrar,obtener}`, `sesiones()`, `conectarPerfil(id)`.
- `Conexion`: `{id, tipo, nombre, estado, rx, tx, bytesRx, bytesTx, nativo, h, enviar(), escuchar(fn, evento), cerrar()}`. `h` expone métodos del driver (p. ej. cámara: `capturar()`, `grabar()/parar()`, `linterna()`, `zoom()`, `medirFps()`, y `video` para insertar en el DOM; bluetooth: `servicios()`, `leer()`, `escribir()`, `notificar()`; usb: `reclamar()`, `leer()`, `escribir()`; puente: `ping()`).
- Evento `datos`: `{evento, id, tipo, dir:'rx'|'tx', datos, meta, t}`. Serie/BT/USB/HID entregan `Uint8Array`; puente entrega JSON ya parseado (o texto/binario); mando y sensores entregan objetos. Lo emitido mientras conecta se entrega justo tras `conectado`.
- `desconectado` incluye `motivo`, `voluntario`, `resumen`.

Opciones por tipo: serial `{baudRate,dataBits,stopBits,parity,flowControl,dtr,rts,filtros}`; bluetooth `{todos,nombrePrefijo,servicios:[uuid]}`; usb/hid `{filtros:[{vendorId,productId}]}`; camara `{deviceId,ancho,alto,fps,facing,audio}`; mando `{indice}`; sensores `{movimiento,orientacion,gps,bateria}`; puente `{url,reconectar}`.

Nuevos drivers: `TrabajosDispositivos.registrarDriver(tipo, {nombre, soportado(), conectar(opts, ctx)})`; `conectar` devuelve `{nombre, enviar(d), cerrar(), nativo?, extra?}` y usa `ctx.rx(datos,meta)`, `ctx.estado(s)`, `ctx.error(e)`, `ctx.cerrado(motivo)`.

## Puente
`node puente-minimo.js [puerto]` escucha en 127.0.0.1 y solo acepta los orígenes de `ORIGENES`. Acciones JSON: `eco`, `udp {host,puerto,datos}`, `tcp {host,puerto,datos}`, `difundir`; `{tipo:'ping',t}` responde `pong`. Desde una página HTTPS solo se permite `ws://localhost` o `wss://`.

## Privacidad
Nunca se guardan ni sincronizan claves: `limpiarParametros`/`limpiarUrl` eliminan campos tipo clave/token/contraseña y parámetros sensibles de URLs. El historial guarda solo contadores, no el contenido.
