# Isla Final

Battle royale 3D en tercera persona (Three.js local, sin build). Abrir `index.html`.

- Modos: solitario, dúos (compañero bot o amigo), creativo/práctica (materiales infinitos, maniquíes) y multijugador P2P hasta 4 con `Red`/`Lobby` (el anfitrión ejecuta los bots y es la referencia del reloj).
- Un jugador guarda la partida en `isla_partida` cada 4 s y al ocultar la página; el menú ofrece *Continuar*. En multijugador no se restaura la sala: si recargas, entras con un enlace nuevo y empiezas otra partida (el progreso, monedas y skins sí se conservan).
- Claves: `isla_ajustes_dispositivo` (gráficos/controles, no se sincroniza), `isla_progreso` (monedas, skins, logros, estadísticas; se sincroniza con la cuenta), `isla_partida`.
- Módulos: `terreno.js` (mundo puro y colisiones), `mundo.js` (render con instancing/LOD), `construccion.js` (baldosas editables), `partida.js` (balas, daños, red), `jugador.js`, `bots.js`, `tormenta.js`, `hud.js`, `menus.js`, `ajustes.js`, `principal.js`.
- Pruebas lógicas: `node pruebas/logica.test.mjs`.
