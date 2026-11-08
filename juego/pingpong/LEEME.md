# Ping Pong 3D (juego/pingpong)

Tenis de mesa 3D (Three.js local en `lib/`) sin build ni backend. Entrada: `index.html` -> `js/arranque.js` (exige sesion con `Cuenta.requerir()`) -> `js/principal.js`.

## Modulos (`js/`)
- Puros (se prueban en Node): `fisica.js` (gravedad, arrastre, Magnus, rebote con friccion y giro, red, resolutor de golpes y saques), `reglas.js` (`Rally` = un punto; `Partido` = 11 puntos, diferencia de 2, saque cada 2 puntos / cada punto desde 10-10, mejor de 1/3/5, dobles con saque diagonal y orden de golpeo, let), `bots.js` (4 dificultades x 5 estilos), `torneo.js`, `economia.js` (monedas virtuales y catalogo), `progreso.js` (logros, stats, topes de ranking), `motor.js` (fisica + reglas + bots + paletas, sin DOM), `entrada.js#trazoACmd` (gesto -> golpe).
- Con DOM: `escena.js` (Three.js, calidad Baja/Media/Alta/Ultra), `entrada.js` (gesto tactil/raton, teclado remapeable, mando), `ui.js` + `paneles.js` (menus, ajustes, tienda...), `sonido.js` (WebAudio), `almacen.js`, `ajustes.js`, `cuenta-pp.js` (Cuenta), `red-pp.js` (online), `principal.js`.

## Golpes
Desliza hacia arriba: la direccion apunta, la velocidad da fuerza (lento = corte/backspin, rapido = topspin) y una curva da efecto lateral. Toque/clic = golpe automatico hacia donde tocas (clic derecho corte, central topspin, Mayus mas fuerte, Ctrl suave). Teclado: flechas/AD apuntan, Espacio, E (top), Q (corte), Mayus fuerza, Esc pausa. Mando: stick apunta, A/X/B/Y, LB/RB efecto lateral, RT fuerza, Menu pausa. La calidad del golpe depende de cuando lo das (zona sobre la pelota ya botada) y del alcance de la paleta.

## Online (1 vs 1)
Anfitrion autoritativo (fisica y reglas); el invitado envia golpes (`pp_g`) y recibe snapshots a ~30 Hz (`pp_s`, no fiable) que interpola con `Red.Interpolador`; eventos fiables `pp_e`. El invitado juega desde el lado lejano (camara girada). El golpe remoto se compensa con su retraso (`lag`).
Reconexion: el anfitrion guarda la partida en `pingpong_partida` (con `online:true`); si el rival se cae aparece "Invitar de nuevo" (o Continuar tras recargar): se abre el lobby, el nuevo enlace conecta al rival y la partida sigue con el marcador guardado. El invitado no guarda estado.

## Claves de localStorage
`pingpong_progreso` (sincroniza a la nube), `pingpong_ajustes_dispositivo` (nunca a la nube), `pingpong_partida` (efimera), `pingpong_tutorial`, `pingpong_cfg_libre`.

## Pruebas
`node juego/pingpong/pruebas/pruebas.mjs`
