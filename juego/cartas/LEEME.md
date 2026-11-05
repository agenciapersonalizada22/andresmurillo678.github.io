# Cartas: plataforma de juegos de baraja

Juego `cartas` (id propuesto). Marco reutilizable + Póker Texas Hold'em, Veintiuno (blackjack), Siete y medio, Dompe, Conquián y Ve a pescar. Solo **fichas virtuales**, nunca dinero real. Sin build: módulos ES (`js/`), HTML estático. Usa `../comun/` (mando.js, red.js, lobby.js).

```
js/marco/   rng barajas dibujo sonido economia mesa sesion almacen cartera progreso   (sin lógica de ningún juego)
js/ui/      dom mesaUI acciones entrada paneles ajustes creador entrar red-util          (UI genérica)
js/juegos/  registro.js + <juego>/{reglas,bot,ui,index}.js
pruebas/    *.test.mjs (Node, sin DOM):  poker | veintiuno | mesa | dompe_combos | dompe | conquian_melds | conquian | pescar | nuevos_mesa
```

## Arquitectura (anfitrión autoritativo)
- `mesa.js` (JSON puro, sin DOM, todo recibe `ahora` en ms): asientos, bots, plazos de turno, entradas/salidas de fichas, recompra, expulsar/silenciar, chat, historial, torneo, `serializar/restaurar`, `vistaMesa(m,J,asiento)`. Se simula en Node con `tick(m,J,ahora)`.
- `sesion.js`: bucle del anfitrión (tick cada 100 ms, difusión por `Red`, guardado en localStorage tras cada cambio y en `pagehide`) y cliente.
- Protocolo (cliente→anfitrión): `hola{tok,nombre,color,avatar}`, `sentar{compra,espectador}`, `acc{a}`, `chat{x}`, `rec{monto}`, `sal`. Anfitrión→cliente: `oferta`, `bienvenida`, `v` (vista propia), `err`, `rec`, `cobro`, `expulsado`, `fin`. Mensajes < 16 KB.
- **Privacidad**: cada cliente solo recibe `J.vista(estado, suAsiento)`; nunca mazo, rng, ni manos ajenas ocultas (probado en `mesa.test.mjs` y en Playwright).
- Barajado: `rng.js` (sfc32, estado serializable `{s:[4]}`; semilla de 128 bits con `crypto.getRandomValues`; `reentropia` mezcla entropía del sistema en cada mano cuando `cfg.entropia`, desactivado en pruebas para ser determinista).

## Persistencia y reconexión
- Anfitrión: `cartas_mesa_<id>` (estado completo, también mid-mano) + índice `cartas_mesas`. Al recargar, la pantalla «Entrar a sesión» ofrece **Continuar**; los remotos aparecen «sin conexión» (su asiento y fichas se conservan).
- Cliente: guarda `cartas_asiento_<mesa>` = `{tok,...}`. Tras caerse/recargar, el anfitrión pulsa 👥 → «Reconectar» (un clic: genera el enlace nuevo `?sala=…&m=<mesa>`), el jugador lo abre (o lo pega en «Unirme con enlace»), devuelve el código de respuesta (flujo manual de `Red`) y recupera asiento, fichas y mano **sin nueva entrada ni descuento del monedero**. Un asiento sin conexión se retira/pasa automáticamente.
- Límite de `Red`: host + 3 conexiones (jugadores o espectadores).
- Monedero: `cartas_monedero` (saldo, regalo diario configurable, historial). Entrada se descuenta al sentarse; se acredita al levantarse/cerrar (`cobro`).
- Claves: `cartas_ajustes` (sincronizable), `cartas_ajustes_dispositivo` (gráficos/controles, NO sincronizar), `cartas_stats`, `cartas_logros`, `cartas_historial`. Todo vía `almacen.js`.

## Cómo añadir un juego
1. Crea `js/juegos/<id>/reglas.js` (reglas puras), `bot.js`, `ui.js`, `index.js`.
2. Regístralo en `js/juegos/registro.js` (`CATALOGO[id] = {id,J,emoji,corto,desc}`). El formulario de creación, el lobby, la red, los bots, el guardado y los temporizadores funcionan solos.
3. Pruebas en `pruebas/` (reglas, conservación de fichas con `mesa.tick`, serialización, privacidad).

### Interfaz de reglas `J` (módulo o objeto)
```js
// metadatos
id, nombre, min, max, torneo:boolean, retardoPaso:ms
barajas: [['fr52','Francesa 52'], ['es40','Española 40'], ['es48',...]]     // para el selector
opciones: [{id,etiqueta,tipo:'num'|'sel'|'bool',def,min,max,paso,opciones:[[v,txt]],grupo}]  // aparecen solos en «Crear mesa»
preset?: {...}          // opciones fijas (p. ej. variante)
normalizar?(op)         // opciones de formulario -> cfg del motor
// estado: JSON puro; incluye mazo, descarte, rng ({s:[...]}) y cartas ocultas
crear(cfg, nAsientos, semilla) -> estado        // cfg = {...op, baraja, tope, entropia, banca}
nuevaMano(estado, ahora) -> boolean             // false si no hay jugadores con fichas; reparte con estado.rng
quien(estado) -> [asientos que deben actuar]    // vacío = nadie (la mesa llama paso)
aplicar(estado, asiento, accion) -> {ok, error?}// valida y muta; accion = objeto JSON libre {t:'...', ...}
automatica(estado, asiento) -> accion           // acción por defecto al vencer el tiempo / jugador caído
paso(estado) -> boolean                         // avance automático sin jugador (banca, repartos); true si cambió
fase(estado) -> 'mano' | 'entre'                // 'entre' = mano terminada (la mesa aplica altas/salidas y arranca la siguiente)
vista(estado, asiento|-1) -> objeto             // SOLO lo visible para ese asiento (-1 espectador). Cartas ocultas = null
bot(vista, asiento, nivel, rng) -> accion       // nivel 'novato'|'medio'|'experto'; recibe SOLO la vista (no puede hacer trampa)
fichas(estado) -> [pila por asiento]; agregarFichas(estado,i,n); quitarFichas(estado,i)->n
enBote(estado) -> fichas apostadas en curso; casa(estado) -> comisión/ganancia acumulada de la casa
resumen(estado) -> {total, ganadores:[i], delta:[±fichas por asiento], texto} | null   // fin de mano
ui: {layout(vm), panel(vm), alCarta?(vm,idx,codigo), alPila?(vm,id), texto:{nombre,ayuda:[...]}}
```
**Invariante obligatoria** (la prueba de conservación la comprueba): `Σ fichas + enBote + casa == entradas − salidas`.
Las cartas son textos `"<valor><palo>"` (`"7S"`, `"12o"`, comodín `"0J"`); `barajas.js` ofrece `crearBaraja(tipo,{comodines:0-2,mazos:n})`, `parse`, `etiqueta`, `nombreCarta`.

### UI del juego
- `layout(vm)` (vm = `vistaMesa`: `vm.j` es tu `vista`, `vm.asientos`, `vm.yo`, `vm.plazo`, …) devuelve:
```js
{ disposicion:'elipse'|'arco', fin:boolean, cabecera:'texto', info:'texto',
  asientos:[{ manos:[{cartas:[codigo|null], etiqueta, apuesta, activa, cls, clic:boolean, sel:[indices]}],
              badges:[{txt,cls}], apuesta:n, fichas:n, estado:'fold'|'allin'|'', turno:boolean, gana:boolean, fuera:boolean, delta:n|null }],
  centro:{ cartas:[...], huecos:n, bote:n, subtitulo, extra,
           grupos:[{cartas,etiqueta}],                       // p. ej. la banca
           pilas:[{id:'mazo'|'descarte',cartas:[codigo|null],etiqueta,clic:boolean}] } }
```
  La mesa anima solas las cartas nuevas (reparto desde el mazo), el volteo (`null`→código) y el movimiento de fichas.
- `panel(vm)` devuelve `{espera:true}` o `{titulo, info, botones:[{id,txt,cls:'prim|sec|peligro|allin',accion:{...},tecla,b:boolean,cantidad?:{min,max,paso,def,rapidos:[{txt,v}]},fijo?}]}`. `{v}` en `txt` se sustituye por la cantidad del deslizador; `b:true` = botón de la tecla B del mando (retirar/pasar). El botón envía `accion` (+`a:cantidad`).
- `alCarta(vm,idx,codigo)` / `alPila(vm,id)`: al tocar una carta marcada `clic` o una pila, devuelven la `accion` a enviar (o `null`). Teclado y mando también pueden activarlas (foco + Enter/A).

### Ejemplo mínimo (Dompe / juegos de «robar y descartar»)
Mano de N cartas, comodines, robar del mazo o del descarte, luego descartar:
```js
// reglas.js (esqueleto)
export const id = 'dompe';
export function crear(cfg, n, semilla) {
  return { j: id, cfg, rng: nuevoRng(semilla), mazo: [], descarte: [], turno: -1, fase: 'entre', sub: 'robar', manos: 0, res: null,
           jug: Array.from({ length: n }, () => ({ f: 0, c: [], ap: 0, activo: false })) };
}
export function nuevaMano(e) {
  const vivos = e.jug.filter((p) => p.f >= e.cfg.apuesta); if (vivos.length < 2) return false;
  e.mazo = mezclar(crearBaraja(e.cfg.baraja, { comodines: 2 }), e.rng);   // comodines '0J'
  e.jug.forEach((p) => { p.activo = p.f >= e.cfg.apuesta; p.c = []; p.ap = 0; if (p.activo) { p.f -= e.cfg.apuesta; p.ap = e.cfg.apuesta; } });
  for (let k = 0; k < e.cfg.nCartas; k++) e.jug.forEach((p) => { if (p.activo) p.c.push(e.mazo.pop()); });
  e.descarte = [e.mazo.pop()]; e.fase = 'mano'; e.sub = 'robar'; e.turno = primerActivo(e); return true;
}
export const quien = (e) => (e.fase === 'mano' ? [e.turno] : []);
export function aplicar(e, i, a) {
  if (e.turno !== i) return { ok: false, error: 'No es tu turno' };
  if (e.sub === 'robar') {                                   // 1) robar del mazo o del descarte
    if (a.t !== 'robar') return { ok: false, error: 'Debes robar' };
    const carta = a.de === 'descarte' ? e.descarte.pop() : e.mazo.pop();
    e.jug[i].c.push(carta); e.sub = 'descartar'; return { ok: true };
  }
  if (a.t !== 'descartar' || !e.jug[i].c.includes(a.c)) return { ok: false, error: 'Descarta una de tus cartas' };
  e.jug[i].c.splice(e.jug[i].c.indexOf(a.c), 1); e.descarte.push(a.c);
  if (cierra(e, i)) terminar(e); else { e.turno = siguiente(e, i); e.sub = 'robar'; }   // mano completa (p. ej. N cartas válidas) -> terminar
  return { ok: true };
}
export const automatica = (e, i) => (e.sub === 'robar' ? { t: 'robar', de: 'mazo' } : { t: 'descartar', c: e.jug[i].c[e.jug[i].c.length - 1] });
export const paso = () => false;
export const fase = (e) => (e.fase === 'mano' ? 'mano' : 'entre');
export function vista(e, i) {
  return { j: id, fase: e.fase, turno: e.turno, sub: e.sub, mazo: e.mazo.length, descarte: e.descarte.slice(-1), res: e.res, yo: i, legal: i >= 0 && e.turno === i,
    jug: e.jug.map((p, k) => ({ f: p.f, activo: p.activo, c: k === i || e.fase === 'entre' && e.res ? p.c.slice() : p.c.map(() => null) })) };
}
// terminar(e): reparte el bote (Σ ap) entre ganadores, e.res = {gan:[delta], total, ...}, e.fase='entre', e.manos++
// resto de la interfaz: fichas, agregarFichas, quitarFichas, enBote, casa, resumen, bot
// ui.js: layout -> manos[yo] = {cartas: vm.j.jug[yo].c, clic: vm.j.legal && vm.j.sub==='descartar'};
//                   centro.pilas = [{id:'mazo',cartas:[null],clic:legal&&sub==='robar'},{id:'descarte',cartas:vm.j.descarte,clic:...}]
//        alPila(vm,id)   -> {t:'robar', de:id};      alCarta(vm,idx,c) -> {t:'descartar', c};
//        panel(vm)       -> botones opcionales (p. ej. «Cortar»), o {espera:true} si no es tu turno.
```
Para varios turnos simultáneos devuelve varios asientos en `quien`; la mesa da un plazo por asiento. Los bots reciben solo la `vista`. Registra en `registro.js`: `dompe: { id:'dompe', J:Dompe, emoji:'🂡', corto:'Dompe', desc:'…' }`.

## Economía
Fichas iniciales (de los bots), entrada mín/máx/def, recompra, tope de mesa, ana, ciegas con escalado por manos o minutos, límite (sin límite / pot-limit / fijo), comisión opcional (0 por defecto), tabla de resultados de sesión, monedero con regalo diario, historial. Torneo (póker): inscripción, fichas iguales, ciegas crecientes, eliminación, el ganador cobra el bote de inscripciones.

## Juegos incluidos
- **Póker Texas Hold'em** 2-6 (bots novato/medio/experto con Monte Carlo ligero), heads-up con reglas de botón, botes laterales, empates, ficha sobrante a la izquierda del botón. Barajas 52, española de 48 y española de 40 («póker español»: el color gana al full, A-2-3-4-5 válida; no hay comodines en póker).
- **Veintiuno** 1-7: doblar, dividir (hasta 4 manos, ases una carta), seguro, rendición, BJ 3:2 / 6:5, S17/H17, 1-8 mazos con carta de corte (75 %), conteo Hi-Lo opcional, banca humana opcional (asiento elegido; paga limitada a su pila).
- **Siete y medio** (baraja de 40; figuras 0,5; empate gana la banca; real 7,5 paga como BJ).

## Controles
Táctil (botones, deslizador, ½ ¾ Pot All-in), teclado (F/C/R/A, ↑↓ cantidad, T chat, Esc menú; remapeables), mando Xbox (cruceta/stick foco, A confirma, B retira/pasa, LB/RB cantidad, X chat, MENU pausa).

## Registro en la plataforma
id `cartas`. Puntajes: `monedero` (Monedero máximo, mayorEsMejor, tope 1e9, fichas), `bote` (Mayor bote ganado, mayorEsMejor, tope 1e9, fichas). Logros: `primera_mano, diez_ganadas, cien_manos, poker_full, poker_escalera_color, poker_bote_grande, poker_torneo, bj_blackjack, bj_doblar, bj_racha_5, sm_real, sesion_positiva, monedero_10k` (ver `js/marco/progreso.js`).

## Pruebas
`node pruebas/poker.test.mjs` (evaluador vs. fuerza bruta en 100 000 manos, side pots, conservación), `veintiuno.test.mjs`, `mesa.test.mjs` (miles de manos con bots, torneo, reconexión, serialización a mitad de mano, privacidad de mensajes).

## Dompe, Conquián y Ve a pescar (añadidos)
Extensiones genéricas del marco (retrocompatibles): `layout` puede devolver `bandeja` (mano propia ancha, `{cartas,clic,sel,etiqueta,turno}`), `barra` (chips de estado `[{txt,cls}]`) y `centro.tapete` (combinaciones `[{id,cartas,etiqueta,color,clic,destacada}]`); `panel` admite `local:()=>…` en un botón (acción solo de interfaz) y `cls:'chico'`; la UI del juego puede definir `alCarta(vm,idx,code,seat,mano)`, `alMeld(vm,id)`, `ayudaExtra(vm)`, `texto.controles` y `mandoCartas:true` (el mando navega también por las cartas). Opciones del formulario: `tipo:'orden'` (lista reordenable). El juego puede declarar `nDef`, `pausaMs`, `turnoSeg`. Estadísticas/logros: `info.meta` = `res.meta` de cada juego.

### Dompe (`dompe`)
Mano de 6 cartas; en tu turno robas (mazo o última del descarte) y descartas. **Victoria inmediata** al descartar si la mano cumple una combinación ganadora (por defecto: escalera de color, cuarteto+par, escalera de 6, dos tercias, tres pares; configurables una a una). **Dompe**: desde la vuelta 2 (configurable 2-4) quien acaba de descartar puede decir dompe; los demás juegan una última vuelta (un turno cada uno; quien forme una combinación ganadora gana al instante); si nadie gana, gana la mejor mano según el **orden de fuerza** (configurable en «Crear mesa»; propuesto: escalera de color, cuarteto+par, escalera, dos tercias, tres pares, cuarteto, tercia+par, color, tercia, dos pares, par, carta alta; desempate por cartas altas; empate exacto: se reparte, o gana el otro si se elige). Cuarteto+par cuenta también como «tres pares». Comodines: 2 de oros (baraja española 40/48) o los 2 jokers (americana 52+2); valen cualquier carta sin repetir una carta real ni pasar de 4 iguales. As bajo/alto/ambos; baraja de 40: 7 seguido de sota (opcional). Apuestas: ana por ronda (0 = ninguna), bote al ganador, penalización por dompear sin ganar (0 por defecto).
`combos.js` (evaluador con comodines, distancia a cada combinación y salidas), `reglas.js`, `bot.js` (novato voraz; medio compara descarte/mazo; experto estima por simulación la probabilidad de ganar tras dompear), `ui.js` (chips de progreso «faltan N / 1 carta (salidas)», aviso «¿Dompear? sí/no» y «ÚLTIMA VUELTA», diálogo Combinaciones con el orden y tu progreso). Pruebas: `dompe_combos.test.mjs` (casos a mano, desempates, ~50 000 manos contra una implementación de fuerza bruta con y sin comodines, distancia/salidas contra fuerza bruta) y `dompe.test.mjs` (reglas, privacidad, miles de manos con bots sin errores).

### Conquián (`conquian`, baraja española de 40, 2-4 jugadores)
9 cartas por jugador y 10 al repartidor, que empieza descartando. Combinaciones: tríos/cuartetos del mismo número y escaleras del mismo palo de 3 o más (1…7-sota-caballo-rey; 7→sota configurable; As tras el rey opcional); comodín opcional (0-2, 1 por combinación). En el turno: robar del mazo o **tomar el descarte solo si se usa al instante** (combinación nueva o añadido a una existente), bajar combinaciones, añadir cartas a las propias o ajenas (configurable: todas/propias/no) y descartar. Gana quien se queda sin cartas (bajando todo o descartando la última; «ganar con descarte» configurable: si no, con una sola carta se pasa el turno). Si el mazo se acaba se rebaraja el descarte (máx. 2 veces) y luego son tablas. Puntuación por rondas (puntos de las cartas de los rivales: figuras 10, comodín 15) con meta opcional; ana, bote y pago por carta restante. Interfaz: elegir varias cartas, Bajar/Descartar, tocar una combinación para añadir, **arrastrar** (a una combinación, al descarte o al centro), 💡 Sugerir. `melds.js` (validación + planificador), `bot.js`. Pruebas: `conquian_melds.test.mjs` (validez contra enumeración exhaustiva de todos los subconjuntos de 3-5 cartas y planificador contra fuerza bruta) y `conquian.test.mjs`. Con 4 jugadores el mazo es corto (muchas tablas).

### Ve a pescar (`pescar`, 2-6 jugadores)
Pide a un rival un número que ya tengas; si lo tiene, te da todas esas cartas y sigues; si no, «¡ve a pescar!» (robas y pasa el turno; si robas lo pedido juegas otra vez, configurable). Libros de 4 (o 3 con baraja de 40: la cuarta carta queda muerta) se bajan solos; los números que ya no pueden completar libro se retiran. 5 o 7 cartas (automático: 7 con 2-3 jugadores, 5 con más), mano vacía: robar o quedar fuera. Gana quien más libros junte (empate: se reparte). Barajas americana 52, española 40 y 48. **Versión familiar**: banners y animaciones grandes, vuelo de cartas, confeti y pistas. Los bots reconstruyen lo que se sabe de cada mano a partir del historial público de peticiones (`creencias`). Interfaz: botones de rival/número o tocar una carta; con mando/teclado todo es navegable. Pruebas: `pescar.test.mjs`.

### Registro en la plataforma (nuevos)
Mismo juego `cartas`; ids de motor: `dompe`, `conquian`, `pescar`. Modos de puntaje nuevos (`puntajes()` en `progreso.js` devuelve los valores): `dompe_racha` (mayorEsMejor, tope 1000, victorias), `conq_turnos` (menor es mejor, tope 200, turnos), `pesc_libros` (mayorEsMejor, tope 26, libros). Logros: ver `LOGROS` en `js/marco/progreso.js` (prefijos `dompe_`, `conq_`, `pesc_`).

## Cuenta de la plataforma
- `index.html` carga `comun/` (config, cuenta, amigos) y `plataforma/juegos.js`; `principal.js` llama `Cuenta.requerir()` antes de mostrar el juego y `marco/cuenta.js` es el unico puente con `window.Cuenta` (nunca lanza; sin cuenta/red todo sigue igual).
- Nube (`autoSincronizar('cartas', ...)`): `cartas_monedero`, `cartas_stats`, `cartas_logros`, `cartas_historial`. No viajan: ajustes, ajustes de dispositivo, mesas/asientos, cobros.
- Puntajes (ids de `juegos.js`): `monedero`, `bote`, `dompe_racha`, `conq_turnos` (menor es mejor), `pesc_libros`; se envian con retardo tras cada mano/sesion. Logros: mismos ids que `progreso.js`, reportados en `desbloquear()`. XP: 2/6/10 por mano, 50 por torneo ganado (tope 600 por carga).
- UI: `ui/cuentaUI.js` (cuenta, ranking Global/Amigos, bloque "Cuenta y nube" en Ajustes > Datos). Invitacion de amigos en linea: `paneles.js` (`invitarAmigoEnLinea`); `?invitar=<uid>` abre el creador de mesas y luego invita.
