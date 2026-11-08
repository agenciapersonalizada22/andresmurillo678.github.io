# Rey de los Bolos

Boliche 3D original (Three.js r160 en `lib/`, fisica propia en `js/fisica.js`). Sin build; abre `index.html` desde un servidor estatico.

- `js/puntuacion.js` puntuacion oficial de 10 frames (pura, probada en Node). `js/fisica.js` simulacion 2D determinista (solo +,-,*,/ y sqrt). `js/bots.js` los bots prueban lanzamientos con la propia fisica y aplican error segun habilidad.
- `js/juego.js` turnos, modos (libre, liga, desafio, diario, online), guardado y recompensas. `js/escena.js` dibujo. `js/entrada.js` gesto tactil/raton, teclado y mando. `js/ajustes.js`, `js/pantallas.js`, `js/ui.js`, `js/nav.js` (foco con mando), `js/cuenta-bolos.js` (Cuenta/nube/ranking).
- Claves: `bolos_progreso` (se sincroniza con la nube), `bolos_ajustes_dispositivo` (nunca), `bolos_partida` (partida en curso), `bolos_sala` (sala online del anfitrion), `bolos_asiento` (token de asiento del jugador), `bolos_tutorial`.
- Online (Red/Lobby, hasta 4): cada jugador simula su propio lanzamiento y difunde `{s: n.o de tiro, j: asiento, p: [x, ang, v, w], b: bola, m: mascara}`; los demas repiten la simulacion y fuerzan la mascara final. La puntuacion es determinista, asi que todos calculan lo mismo. El anfitrion simula los bots y, si un jugador se desconecta, un bot juega su turno tras unos segundos.
- Reconexion: el cliente guarda un token en `bolos_asiento`; si recarga, el anfitrion abre Pausa > «Invitar / reconectar amigos», el amigo entra con el enlace nuevo y recupera su asiento y el estado. Si recarga el anfitrion, el menu ofrece «Continuar sala online anterior» (estado en `bolos_sala`); los amigos se unen otra vez y se reasignan por token.
- Pruebas: `node juego/bolos/pruebas/pruebas.mjs`.
