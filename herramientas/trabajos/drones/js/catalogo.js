/* Catalogo base editable (valores orientativos: contrasta con la ficha del fabricante). window.DronCatalogo */
(function (g, f) { const m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.DronCatalogo = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const K = {};
  K.AVISO_CAT = 'Valores orientativos (algunos aproximados). Edítalos o añade tu equipo; la ficha del fabricante manda.';
  K.TIPOS = [['camara', 'Cámaras'], ['lente', 'Lentes'], ['nd', 'Filtros'], ['gimbal', 'Gimbals'], ['montura', 'Monturas']];
  K.MONTURAS = [['EF', 44, 'FF'], ['EF-S', 44, 'APSC'], ['RF', 20, 'FF'], ['E', 18, 'FF'], ['A', 44.5, 'FF'], ['MFT', 19.25, 'MFT'], ['Z', 16, 'FF'], ['F', 46.5, 'FF'], ['L', 20, 'FF'], ['X', 17.7, 'APSC'], ['PL', 52, 'S35'], ['LPL', 44, 'FF'], ['C', 17.526, '1in'], ['M42', 45.46, 'FF'], ['Leica M', 27.8, 'FF'], ['PK', 45.46, 'APSC']]
    .map(m => ({ id: 'mont_' + m[0].toLowerCase().replace(/[^a-z0-9]+/g, ''), tipo: 'montura', nombre: m[0], ffd: m[1], cobertura: m[2], base: true }));
  const cam = (id, nombre, sw, sh, pw, ph, mont, extra) => Object.assign({ id: 'cam_' + id, tipo: 'camara', nombre, sw, sh, pw, ph, mont: mont || 'fija', focal: 0, fps: 60, intervaloMin: 2, isoBase: 100, base: true }, extra || {});
  K.CAMARAS = [
    cam('mini4', 'DJI Mini 4 Pro (aprox.)', 9.6, 7.2, 8064, 6048, 'fija', { focal: 6.7, apertura: 1.7, intervaloMin: 2, fps: 100, nota: 'Sensor 1/1,3". Cámara de dron con óptica fija.' }),
    cam('mini3', 'DJI Mini 2/3 (aprox.)', 6.17, 4.55, 4000, 3000, 'fija', { focal: 4.5, apertura: 2.8, intervaloMin: 2.5, fps: 60, nota: 'Sensor 1/2,3".' }),
    cam('mavic3', 'DJI Mavic 3 Classic (Hasselblad)', 17.3, 13, 5280, 3956, 'fija', { focal: 12.3, apertura: 2.8, intervaloMin: 0.7, fps: 60, nota: 'Sensor 4/3, obturador mecánico.' }),
    cam('p4p', 'DJI Phantom 4 Pro', 13.2, 8.8, 5472, 3648, 'fija', { focal: 8.8, apertura: 2.8, intervaloMin: 2, fps: 60, nota: 'Sensor de 1 pulgada, obturador mecánico (referencia de fotogrametría: 2,74 cm/px a 100 m).' }),
    cam('tello', 'Ryze/DJI Tello (aprox.)', 3.6, 2.7, 2592, 1936, 'fija', { focal: 2.6, apertura: 2.0, intervaloMin: 3, fps: 30, nota: 'Interior y práctica; cámara muy pequeña.' }),
    cam('a7s3', 'Sony A7S III', 35.6, 23.8, 4240, 2832, 'E', { fps: 120, isoBase: 640, nota: 'Full frame, ISO nativo dual 640/12800.' }),
    cam('a7iv', 'Sony A7 IV', 35.9, 23.9, 7008, 4672, 'E', { fps: 120, intervaloMin: 0.2 }),
    cam('a6700', 'Sony A6700', 23.5, 15.6, 6192, 4128, 'E', { fps: 120, intervaloMin: 0.2, nota: 'APS-C.' }),
    cam('r5', 'Canon EOS R5', 36, 24, 8192, 5464, 'RF', { fps: 120, intervaloMin: 0.2 }),
    cam('bmpcc6k', 'Blackmagic Pocket 6K', 23.1, 12.99, 6144, 3456, 'EF', { fps: 60, isoBase: 400, intervaloMin: 1 }),
    cam('bmpcc4k', 'Blackmagic Pocket 4K', 18.96, 10, 4096, 2160, 'MFT', { fps: 60, isoBase: 400, intervaloMin: 1 }),
    cam('gh5', 'Panasonic GH5', 17.3, 13, 5184, 3888, 'MFT', { fps: 180, intervaloMin: 0.2 })
  ];
  const len = (id, nombre, mont, focal, apertura, cobertura, nota) => ({ id: 'len_' + id, tipo: 'lente', nombre, mont, focal, apertura, cobertura, nota: nota || '', base: true });
  K.LENTES = [len('ef50', 'Canon EF 50 mm f/1.8', 'EF', 50, 1.8, 'FF'), len('ef24', 'Canon EF 24 mm f/2.8', 'EF', 24, 2.8, 'FF'), len('fe24', 'Sony FE 24 mm f/1.4 GM', 'E', 24, 1.4, 'FF'), len('e16', 'Sony E 16 mm f/2.8', 'E', 16, 2.8, 'APSC'),
    len('mft12', 'Olympus M.Zuiko 12 mm f/2', 'MFT', 12, 2, 'MFT'), len('mft25', 'Panasonic Leica 25 mm f/1.7', 'MFT', 25, 1.7, 'MFT'), len('rok35', 'Rokinon Cine 35 mm T1.5', 'EF', 35, 1.5, 'FF', 'Cine, aro de enfoque con engranaje.'),
    len('sig1835', 'Sigma 18-35 mm f/1.8 (a 18 mm)', 'EF', 18, 1.8, 'APSC'), len('cp50', 'Zeiss CP.3 50 mm T2.1', 'PL', 50, 2.1, 'FF', 'Pesada: comprueba la carga del gimbal.'), len('vm40', 'Voigtländer 40 mm f/1.2', 'Leica M', 40, 1.2, 'FF'), len('rf24', 'Canon RF 24 mm f/1.8 Macro', 'RF', 24, 1.8, 'FF')];
  const nd = (s, n, t) => ({ id: 'nd_' + n.toLowerCase().replace(/[^a-z0-9]+/g, ''), tipo: 'nd', nombre: n, stops: s, filtro: t || 'ND', base: true });
  K.ND = [nd(2, 'ND4', 'ND'), nd(3, 'ND8', 'ND'), nd(4, 'ND16', 'ND'), nd(5, 'ND32', 'ND'), nd(6, 'ND64', 'ND'), nd(7, 'ND128', 'ND'), nd(8, 'ND256', 'ND'), nd(10, 'ND1000', 'ND'), nd(1.5, 'CPL (polarizador)', 'CPL'), nd(4, 'ND/PL 16', 'ND/PL')];
  const gim = (id, nombre, carga, ejes, nota) => ({ id: 'gim_' + id, tipo: 'gimbal', nombre, carga, ejes, nota: nota || '', base: true });
  K.GIMBALS = [gim('rs3', 'DJI RS 3 (mano)', 3000, 3), gim('rs3m', 'DJI RS 3 Mini (mano)', 2000, 3), gim('rs4p', 'DJI RS 4 Pro (mano)', 4500, 3), gim('dron1k', 'Gimbal genérico de dron 3 ejes', 1000, 3, 'Para plataformas de carga media; revisa el peso total.'), gim('fpv', 'Cámara FPV con montura fija', 150, 0, 'Sin estabilizador mecánico.')];
  K.NORMAS = [
    { id: 'gen', nombre: 'Genérico conservador', alturaMax: 100, distMax: 400, vlos: true, noche: false, sobreGente: false, pesoMax: 250, notas: 'Punto de partida prudente.' },
    { id: 'ue', nombre: 'Unión Europea (EASA, categoría abierta)', alturaMax: 120, distMax: 500, vlos: true, noche: true, sobreGente: false, pesoMax: 25000, notas: 'Registro de operador y distintivo según categoría; no sobre concentraciones de personas en A3.' },
    { id: 'us', nombre: 'EE. UU. (FAA, Parte 107 / recreativo)', alturaMax: 121.9, distMax: 500, vlos: true, noche: true, sobreGente: false, pesoMax: 25000, notas: '400 ft sobre el suelo. Registro desde 250 g e identificación remota.' },
    { id: 'mx', nombre: 'México (AFAC)', alturaMax: 122, distMax: 500, vlos: true, noche: false, sobreGente: false, pesoMax: 25000, notas: 'Revisa la NOM aplicable y los registros necesarios.' },
    { id: 'co', nombre: 'Colombia (Aerocivil)', alturaMax: 152, distMax: 500, vlos: true, noche: false, sobreGente: false, pesoMax: 25000, notas: '500 ft sobre el suelo; registro y reglas por tipo de operación.' },
    { id: 'custom', nombre: 'Personalizado', alturaMax: 120, distMax: 500, vlos: true, noche: false, sobreGente: false, pesoMax: 250, notas: 'Escribe aquí las reglas que te apliquen.' }].map(n => Object.assign({ tipo: 'norma', base: true }, n));
  K.AVISO_LEY = 'Estos perfiles son orientativos y pueden estar desactualizados o incompletos. Debes verificar la normativa vigente de tu país y zona (altura, línea de vista, zonas restringidas, registro, seguros y permisos) con la autoridad aeronáutica antes de volar. La responsabilidad del vuelo es del piloto.';
  K.CHECKLIST = [
    ['Planificación', [['p1', 'Revisé la normativa local, zonas restringidas y permisos necesarios'], ['p2', 'Registro, licencia y seguro vigentes (si aplican)'], ['p3', 'Pronóstico de viento, lluvia y visibilidad aceptable'], ['p4', 'Plan de vuelo y ruta revisados; altura de retorno (RTH) sobre obstáculos'], ['p5', 'Baterías del dron, control y móvil cargadas'], ['p6', 'Tarjetas de memoria vacías o con espacio suficiente']]],
    ['En el sitio', [['s1', 'Zona de despegue despejada y plana; personas ajenas fuera del área'], ['s2', 'Hélices sin daños y bien sujetas'], ['s3', 'Cuerpo, motores y gimbal sin daños; protector del gimbal retirado'], ['s4', 'Observador visual designado (si se requiere)'], ['s5', 'Plan de emergencia: dónde aterrizar si falla algo']]],
    ['Antes de despegar', [['d1', 'Firmware y app sin alertas'], ['d2', 'GPS con 10 o más satélites y punto de origen registrado'], ['d3', 'Brújula e IMU sin avisos (calibrar si lo pide)'], ['d4', 'Batería al 90 % o más; nivel crítico y de retorno configurados'], ['d5', 'Límites de altura y distancia ajustados a la norma'], ['d6', 'Acción ante pérdida de señal: regresar al origen'], ['d7', 'Cámara: resolución, fps, obturador (regla de 180°), ND y enfoque'], ['d8', 'Cielo y entorno revisados; aviso verbal «despegando»']]],
    ['Después del vuelo', [['f1', 'Apagar y revisar hélices, motores y temperatura de batería'], ['f2', 'Respaldar el material grabado'], ['f3', 'Anotar el vuelo en la bitácora'], ['f4', 'Reportar incidencias y programar mantenimiento si hace falta']]]
  ];
  K.TOMAS = [
    { id: 'revelacion', nombre: 'Revelación', patron: 'revelacion', vel: 4, giro: -70, alt: 15, dur: 12, desc: 'Avanza y asciende mientras la cámara sube del suelo al horizonte, mostrando el paisaje tras un obstáculo.', consejo: 'Velocidad baja y constante; empieza con un elemento en primer plano.' },
    { id: 'orbita', nombre: 'Órbita al sujeto', patron: 'orbita', vel: 4, giro: -25, alt: 25, dur: 25, desc: 'Círculo alrededor del sujeto con la cámara siempre apuntándolo (POI).', consejo: 'Radio constante; comprueba obstáculos en todo el círculo.' },
    { id: 'dolly', nombre: 'Dolly zoom (vértigo)', patron: 'lineal', vel: 2, giro: -5, alt: 10, dur: 8, desc: 'Retrocede o avanza mientras cambia el zoom para mantener el tamaño del sujeto: el fondo se estira o se comprime.', consejo: 'Necesitas zoom (óptico o recorte); usa la calculadora de dolly zoom.' },
    { id: 'follow', nombre: 'Seguimiento (follow)', patron: 'lineal', vel: 6, giro: -20, alt: 6, dur: 20, desc: 'El dron sigue al sujeto desde atrás o de lado a su velocidad.', consejo: 'Mantén distancia segura; vigila el viento en contra al regresar.' },
    { id: 'topdown', nombre: 'Cenital (top-down)', patron: 'lineal', vel: 3, giro: -90, alt: 40, dur: 15, desc: 'Cámara a 90° hacia abajo, ideal para patrones, calles y composición gráfica.', consejo: 'Cuida la sombra del dron y la orientación del norte de la imagen.' },
    { id: 'lateral', nombre: 'Travelling lateral', patron: 'lineal', vel: 3, giro: -10, alt: 8, dur: 15, desc: 'Desplazamiento lateral paralelo al sujeto, generando paralaje con el fondo.', consejo: 'Altura constante y yaw fijo.' },
    { id: 'pedestal', nombre: 'Ascenso vertical (pedestal)', patron: 'lineal', vel: 2.5, giro: -45, alt: 2, dur: 14, desc: 'Sube en vertical mostrando cada vez más contexto.', consejo: 'Combínalo con una inclinación suave de cámara.' },
    { id: 'sobrevuelo', nombre: 'Sobrevuelo bajo', patron: 'lineal', vel: 7, giro: -15, alt: 12, dur: 10, desc: 'Pasada rápida y baja sobre el terreno o el agua.', consejo: 'Solo con visibilidad total y fuera de personas.' }
  ];
  K.fusionar = (base, usuario) => {   // usuario puede sobrescribir (mismo id) u ocultar ({oculto:true}) elementos base
    const m = new Map(); base.forEach(b => m.set(b.id, b)); (usuario || []).forEach(u => { if (u.oculto) m.delete(u.id); else m.set(u.id, Object.assign({}, m.get(u.id) || {}, u, { base: !!(m.get(u.id) && m.get(u.id).base), editado: !!m.get(u.id) })); });
    return Array.from(m.values());
  };
  return K;
});
