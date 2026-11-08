# Billar

Bola 8, bola 9 (2-4 jugadores por turnos) y carambola (libre / 3 bandas). Vista 3D y cenital (Three.js r160 local en `lib/`), móvil primero, mando Xbox, bots de 3 niveles, online P2P (anfitrión autoritativo) y Cuenta integrada.

## Estructura (`js/`, módulos ES, sin build)
- `fisica.js` motor determinista sin DOM: paso fijo 1/480 s, bolas con giro (deslizamiento → rodadura), choque elástico bola-bola con fricción y transferencia de giro, banda con efecto (rozamiento tangencial), troneras por cruce de la línea de banda, rayo de guía.
- `reglas.js` rack, `nuevaPartida`, `analizar` (eventos → resumen) y `resolver` por modo (faltas, mano, grupos, 3 faltas en bola 9, 3 bandas...). Estado serializable.
- `nucleo.js` un tiro completo sin DOM; `bots.js` candidatos por bola fantasma / barrido, simulados con la misma física y puntuados con las reglas.
- `partida.js` controlador (fases, turnos, bots, estadísticas, guardado); `sesion.js` red; `vista.js` + `mesa3d.js` escena; `entrada.js` ratón/táctil/teclado/mando; `ui.js` HUD; `principal.js` menús y bucle; `ajustes.js`, `progreso.js` (monedas, tienda, logros), `cuenta-billar.js`, `almacen.js`, `sonido.js`.
- Pruebas: `node juego/billar/pruebas/pruebas.mjs [rapido]` (física, determinismo, troneras, reglas de los 4 modos, bots, controlador y guardado).

## Almacenamiento (prefijo `billar_`)
`billar_progreso` (monedas, tienda, equipo, estadísticas, logros; **sincroniza con la nube**), `billar_ajustes` (sonido/accesibilidad/juego), `billar_ajustes_dispositivo` (gráficos y controles; nunca se sincroniza), `billar_partida` (partida en curso), `billar_asiento` (token de asiento online), `billar_tutorial`.

## Online: flujo de reconexión
1. El anfitrión crea la sala (Lobby), inicia y es el único que resuelve reglas y bots; difunde `res` (estado oficial + instantánea de bolas) tras cada tiro. Cada jugador difunde su `tiro` (fiable) y `apunta` (~10 Hz, no fiable) y todos simulan igual para verlo fluido; al llegar `res` se corrigen las posiciones.
2. Cada asiento humano tiene un `token`; el invitado lo guarda en `billar_asiento` al recibir `inicio`.
3. Si un invitado se cae, su asiento queda «desconectado» y la partida espera su turno. Vuelve con un enlace nuevo (Pausa > «Invitar / reconectar amigos» del anfitrión): envía `hola` con su token y recupera asiento y estado. El anfitrión también puede «Sustituir por un bot».
4. Si el anfitrión recarga, «Continuar sala online» restaura el estado guardado y abre el Lobby para reinvitar; los invitados recuperan su asiento por token.

## Modos de puntaje y logros (para `plataforma/juegos.js` y `firestore.rules`)
Modos: `victorias` (tope 100000, «victorias») y `racha` (tope 500, «seguidas»), ambos mayor es mejor. Solo cuentan victorias online o contra bots Aficionado/Profesional; las del bot Principiante dan monedas pero no ranking.
Logros: ver `LOGROS` en `js/progreso.js` (20 ids `[a-z0-9_]`).
