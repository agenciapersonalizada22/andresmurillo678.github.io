# Gatos Explosivos

Juego de cartas original estilo «explosivos» (arte, nombres y textos propios, todo SVG/CSS en línea). 2-5 asientos: hasta 4 personas online (WebRTC, `Red`/`Lobby`) + bots. Sin dinero ni apuestas.

## Reglas implementadas
- Mazo de 57 cartas (para n jugadores: n-1 **Gatos Bomba**, un **Ovillo** (desactivar) por mano y 1-2 de reserva). Tipos: bomba, ovillo, **Zarpazo** (ataque: el siguiente suma un turno), **Siesta** (saltar), **Súplica** (favor: el rival elige qué dar), **Torbellino** (barajar), **Vidente** (ver 3 cartas), **¡Miau No!** (nope, encadenable: impar = anulada) y 5 gatos de combo.
- Combos: par (carta al azar), trío (pedir carta por nombre), 5 distintos (rescatar del descarte). Un Ovillo no se anula ni se combina.
- Ovillo: tras desactivar, el jugador elige en secreto la posición de la bomba en el mazo.
- Modos: **clásico**, **rápido** (mazo mitad, 3 cartas, turno 15 s, nope 2,5 s), **equipos 2v2** (siempre 4 asientos; no se apunta al compañero; gana el último equipo con alguien vivo) y **torneo** (primero en llegar a 2/3/5 rondas). Reglas de la casa: tiempo por turno, ventana de nope, combos on/off.
- Bots: Gatito / Callejero / Maestro (cuenta bombas restantes = vivos-1, usa Vidente, esconde la bomba hacia un rival, anula según daño/beneficio).

## Arquitectura (`js/`)
`reglas.js` motor puro (cima del mazo = último elemento) · `bots.js` IA · `mesa.js` árbitro del anfitrión (temporizadores, nope, bots, paquetes filtrados por asiento, guardado) · `sesion.js` red + restauración · `ui.js` tablero y animaciones · `cartas.js` arte SVG · `sonido.js` WebAudio (incluye maullidos sintéticos) · `ajustes.js` / `almacen.js` / `progreso.js` / `cuenta-gatos.js` (Cuenta: nube, ranking, logros) · `entrada.js` teclado+mando · `principal.js` menús y bucle.

## Persistencia y multijugador
- Claves `gatos_*` (`gatos_ajustes_dispositivo` = gráficos/controles, NO se sincroniza; la nube solo sube `gatos_progreso`).
- `gatos_mesa_host`: el anfitrión guarda la mesa tras cada cambio (500 ms) y al ocultar la página; «Continuar» la restaura (local: sigue; multi: abre la sala, los amigos entran con un enlace nuevo y recuperan su asiento por el token que guardaron en `gatos_asiento`; mientras tanto juega un bot).
- Un humano desconectado se vuelve bot automáticamente (`ausente`) y se reintegra al volver. Los clientes nunca reciben el mazo ni las manos ajenas (solo conteos); la posición de la bomba reinsertada, el «futuro» y las cartas robadas solo viajan a quien corresponde.

## Pruebas
`node juego/gatos/pruebas/pruebas.mjs` (motor, partidas completas de los 4 modos con reloj virtual, filtrado de información, guardado/restauración).
