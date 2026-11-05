# Notas y Tareas

Plataforma offline-first de notas y pendientes (tipo Notion simplificado + Google Keep + Todoist). Sitio estatico, sin build, sin servidor ni cuenta. Abrir `index.html` (necesita http(s) para IndexedDB, service worker y WebRTC).

## Estructura
- `js/util, fechas, repeticion, nl, cripto, migraciones, almacen, modelo, md, busqueda, zip, io` son modulos **puros** (UMD): funcionan en el navegador y en Node, y estan cubiertos por `pruebas/pruebas.js`.
- `js/config, ui, graficos, app, tareas, adjuntos, vista-*, editor, captura, paleta, recordatorios, colab, ejemplos, navmando, atajos, inicio` son la interfaz.
- Dependencias compartidas del repo: `../../juego/comun/mando.js`, `red.js`, `lobby.js`, `lobby.css`. **No se carga `cuenta.js`** (fase posterior).
- `sw.js`: service worker (red primero, cache de respaldo) para uso sin conexion y notificaciones.

## Pruebas
```
node herramientas/notas/pruebas/pruebas.js          # 128 pruebas en Node (opcional: TZ=America/New_York)
python3 -m http.server 8123                          # desde la raiz del repo
node herramientas/notas/pruebas/e2e.cjs [seccion]    # Playwright; PW, CHROME, BASE y SHOTS configurables
```
Node: parser en lenguaje natural (70+ frases), repeticiones (meses cortos, 29 feb, limite, cuenta, DST/zonas con `Intl`), cifrado (ida y vuelta, contrasena incorrecta, datos alterados), migraciones v1 a v3, almacen (persistencia, LWW por campo, borrados, copias), Markdown, busqueda con operadores, exportar/importar JSON, ZIP (propio y deflate), Markdown y .ics, rachas de habitos y rendimiento.
Playwright: escritorio, 500 notas + 300 tareas con busqueda < 50 ms, tablero/calendario/Gantt/habitos/enfoque/estadisticas, movil 390x780 tactil (gestos), mando simulado, nota bloqueada, **dos contextos compartiendo una lista por enlace P2P**, importacion/exportacion, recordatorios y repeticion.

## Datos y persistencia
- Todo vive en `js/almacen.js`: `get / lista / set / borrar / suscribir / cambios(desde) / aplicarRemoto / volcado / cargarVolcado / vaciar / copias`. Los datos estan en memoria y se escriben a **IndexedDB** (`notas_db`) de forma diferida (120 ms) y de inmediato al ocultar/cerrar la pagina. El editor ademas guarda un borrador sincrono en `notas_borrador` (se recupera al abrir).
- Cada registro lleva `_m: {campo: [lamport, ms, sitio]}`; `cambios()` es un registro de cambios con marca de tiempo. Una fase posterior puede sincronizar con la nube leyendo `cambios(desde)` y aplicando `aplicarRemoto(coleccion, id, registro)` (ultimo-escribe-gana por campo, desempate por ms y sitio). Los tombstones (`_del`) permiten propagar borrados.
- Colecciones: `notas, tareas, listas, libretas, habitos, checks, sesiones, hechos, filtros, versiones, adjuntos`.
- Esquema versionado (`Migraciones.ESQUEMA = 3`): al abrir un almacen antiguo se guarda una copia y se migra. Los JSON importados tambien se migran.
- localStorage: `notas_ajustes_dispositivo` (apariencia, controles; **nunca se sincroniza**), `notas_ajustes` (preferencias), `notas_progreso`, `notas_ui`, `notas_enfoque` (pomodoro en curso), `notas_crono`, `notas_avisados`, `notas_colab`.
- Copia de seguridad automatica local: al abrir (max. una cada 20 h, se conservan 7) y antes de importar/restaurar/borrar. Restaurar desde Ajustes > Datos.
- Si IndexedDB no esta disponible (p. ej. modo privado) se avisa y se usa memoria.

## Formatos
- **JSON**: copia completa y fiel (incluye marcas `_m`, adjuntos y notas bloqueadas cifradas). Importar: *Fusionar* (conserva lo mas reciente por campo y recupera lo borrado) o *Reemplazar*.
- **Markdown**: ZIP con `Notas/<libretas>/<titulo>.md` (cabecera YAML simple), `Tareas/<lista>.md` (casillas `- [ ] titulo 2026-11-06 18:00 #etiqueta !alta ~30m cada lunes`, que se reimporta con el mismo parser de lenguaje natural), `adjuntos/` y `LEEME.txt`. Tambien se importa una carpeta/zip externo de `.md`.
- **.ics**: exporta tareas con fecha como VEVENT (o VTODO) con RRULE, prioridad, categorias y alarma; importa VEVENT/VTODO (UTC, todo el dia, escapes, plegado, RRULE).

## Lenguaje natural (`js/nl.js`)
`pagar luz mañana 6pm #hogar !alta ~30m @Personal`: fechas (hoy, mañana, pasado mañana, lunes, «el próximo martes», 15 de marzo, 15/03, ISO, «en 3 días», «fin de mes», «la próxima semana»...), horas (6pm, 18:30, «a las 3», «a las 8 y media de la noche», «mediodía»), partes del dia, repeticion (diario, cada 2 semanas, «todos los lunes», «lunes a viernes», «el día 1 de cada mes», «hasta el 20 de diciembre»), `#etiqueta` (con `/` para jerarquia), `!baja|media|alta|urgente` (o `p1`-`p4`), `~45m`/`~1h30`, `recordar 15 min antes`, `@lista`. «a las N» sin marcador asume tarde para 1-6. No soporta repeticion por horas.

## Busqueda (`Ctrl+K`, `/`)
`tag:trabajo/proyectos`, `prioridad:alta` (o `>=media`), `antes:viernes`, `despues:2026-12-01`, `en:notas|tareas|hoy|bandeja|<lista o libreta>`, `es:hecha|pendiente|fijada|archivada|vencida|bloqueada|repetida`, `sin:fecha|etiqueta|prioridad`, `"frase exacta"`, `-excluir`. Indice en memoria: < 2 ms con 800 registros.

## Notas bloqueadas
AES-GCM de 256 bits; clave derivada con PBKDF2-SHA256 (210 000 iteraciones, sal aleatoria de 16 bytes, IV nuevo por guardado), Web Crypto. La contrasena no se guarda y **no existe recuperacion**: si se pierde, el contenido es irrecuperable. Titulo y etiquetas no se cifran; las notas bloqueadas no tienen historial ni se incluyen en busqueda de contenido ni en la colaboracion. Se vuelve a pedir la contrasena cada vez que se abre la nota.

## Recordatorios (limitaciones de una app web sin servidor)
Se comprueban cada 15 s **mientras la pestana este abierta** (tambien en segundo plano, aunque el navegador puede pausar pestanas inactivas, sobre todo en movil) y al volver a la pestana. Aviso dentro de la app (Hecha / +10 min / Ver) y Notification API si el usuario da permiso (via service worker cuando esta activo). Con la app cerrada no puede avisar: al abrir se resumen los recordatorios perdidos y el resumen diario. Para avisos fiables con la app cerrada: exportar a `.ics` e importar en un calendario con alarmas. Las horas son «de pared» locales (la serie mantiene la hora a traves del DST).

## Colaboracion en tiempo real (P2P)
Menu de una lista o nota > *Compartir en tiempo real*: abre el Lobby (`Red`/`Lobby`, hasta 4 personas, enlace `?sala=` + codigo de respuesta). Al pulsar *Iniciar* el anfitrion envia una instantanea (mensajes troceados < 12 KB) y despues cada cambio local viaja como parche de campos con sus marcas de Lamport; el receptor fusiona con `aplicarRemoto` (ultimo-escribe-gana por campo). Edicion simultanea del mismo campo converge al mismo valor en ambos lados. Un cuerpo de nota es un campo: dos personas escribiendo a la vez en la misma nota se pisan (gana la ultima). No se envian imagenes adjuntas ni notas bloqueadas. Al recargar hay que reconectar con un enlace nuevo; lo ya compartido queda en la copia local y se vuelve a fusionar al reconectar. Tambien: *Copiar como texto* para compartir fuera de la app.

## Interfaz y accesibilidad
- Escritorio: 3 paneles (menu, lista, detalle). Movil (<= 860 px): pestanas inferiores, detalle a pantalla completa, boton `+` flotante y gestos (deslizar a la derecha completa, a la izquierda aplaza a manana; mantener pulsado y arrastrar en tablero/calendario).
- Tema claro/oscuro/auto, texto grande y escala, reducir movimiento, alto contraste, paleta para daltonismo, modo zurdo, foco visible, roles/aria, region viva para avisos, dialogos con trampa de foco.
- Teclado: `Ctrl+K` paleta, `N` nota, `T` tarea, `/` buscar, `g` + `h/i/p/n/c/k/l/e/s/b` ir a, `j/k` mover, `x` completar, `Supr` eliminar, `[` menu, `Ctrl+S`, `Ctrl+B/I`, `Ctrl+Mayus+H/K`. Listado completo en Ajustes > Teclado y mando.
- Mando Xbox: cruceta/stick mueven el foco espacialmente, `A` abre/marca, `B` atras (cierra menu, dialogo, edicion o detalle), `X` nueva tarea, `Y` nueva nota, `LB/RB` cambian de vista, `MENU` paleta, `VISTA` menu lateral, stick derecho desplaza.
- El editor es un `contenteditable` con atajos Markdown (`# `, `- `, `1. `, `[] `, `> `, ```` ``` ````, `---`, `**x**`, `*x*`, `~~x~~`, `==x==`, `` `x` ``) y tres modos: visual, Markdown (con vista previa en pantallas anchas) y vista. El contenido se guarda como Markdown. Voz: Web Speech (`es-ES`) si el navegador la ofrece (en Chromium envia el audio a un servicio del navegador).
