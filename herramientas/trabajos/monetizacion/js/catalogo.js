/* Catalogo: fuentes de ingreso (modelo mensual con escenarios), categorias, paquetes y terminos de plantilla. window.MonCatalogo */
(function (g) {
  'use strict';
  var K = g.MonCatalogo = {};
  function P(id, nombre, pes, base, opt, unidad, paso) { return { id: id, nombre: nombre, v: [pes, base, opt], unidad: unidad || '', paso: paso || 'any' }; }
  /* calc(v) -> {ing, costo}: ingreso mensual y costo variable mensual con los valores v (objeto id -> numero) */
  K.FUENTES = [
    { id: 'anuncios', nombre: 'Anuncios de plataforma', icono: '▶', desc: 'Parte de los anuncios que la plataforma muestra en tus vídeos o publicaciones (RPM).',
      plantilla: 'Requisitos de monetización y reparto cambian por plataforma: revisa sus políticas vigentes. El RPM varía por nicho, país y temporada.',
      params: [P('vistas', 'Vistas al mes', 20000, 60000, 150000), P('rpm', 'RPM (por 1000 vistas)', 1.5, 3, 6, 'USD')],
      calc: function (v) { return { ing: v.vistas / 1000 * v.rpm, costo: 0 }; } },
    { id: 'patrocinios', nombre: 'Patrocinios y marcas', icono: '★', desc: 'Menciones o integraciones pagadas por marcas.',
      plantilla: 'Propuesta tipo: audiencia, formato, entregables, derechos de uso, exclusividad, pago y plazo. Declara siempre el patrocinio según las reglas de cada plataforma.',
      params: [P('propuestas', 'Propuestas enviadas al mes', 4, 8, 15), P('cierre', 'Tasa de cierre (%)', 5, 12, 25, '%'), P('tarifa', 'Tarifa por patrocinio', 150, 400, 900, 'USD')],
      calc: function (v) { return { ing: v.propuestas * v.cierre / 100 * v.tarifa, costo: 0 }; } },
    { id: 'afiliados', nombre: 'Afiliados', icono: '⇄', desc: 'Comisión por ventas que llegan desde tus enlaces.',
      plantilla: 'Divulga los enlaces de afiliado de forma clara y respeta las condiciones de cada programa.',
      params: [P('clics', 'Clics al mes', 500, 2000, 6000), P('conv', 'Conversión (%)', 1, 2.5, 4, '%'), P('ticket', 'Compra promedio', 25, 45, 70, 'USD'), P('com', 'Comisión (%)', 3, 6, 10, '%')],
      calc: function (v) { return { ing: v.clics * v.conv / 100 * v.ticket * v.com / 100, costo: 0 }; } },
    { id: 'membresias', nombre: 'Membresías y suscripciones', icono: '♥', desc: 'Pagos recurrentes de tu comunidad.',
      plantilla: 'Define beneficios por nivel (acceso anticipado, comunidad, descargas). La retención importa más que el volumen: mide la baja mensual.',
      params: [P('miembros', 'Miembros activos', 20, 80, 250), P('precio', 'Precio mensual', 3, 5, 8, 'USD'), P('plat', 'Comisión de la plataforma (%)', 15, 12, 8, '%')],
      calc: function (v) { return { ing: v.miembros * v.precio, costo: v.miembros * v.precio * v.plat / 100 }; } },
    { id: 'digitales', nombre: 'Productos digitales', icono: '▤', desc: 'Presets, plantillas, LUTs, mapas, guías y descargas.',
      plantilla: 'Prueba con un producto pequeño y útil. Revisa licencias de todo lo que incluyas.',
      params: [P('visitas', 'Visitas a la tienda al mes', 800, 3000, 9000), P('conv', 'Conversión (%)', 0.8, 2, 4, '%'), P('precio', 'Precio', 9, 19, 29, 'USD'), P('plat', 'Comisión de la plataforma (%)', 10, 8, 5, '%')],
      calc: function (v) { var ing = v.visitas * v.conv / 100 * v.precio; return { ing: ing, costo: ing * v.plat / 100 }; } },
    { id: 'cursos', nombre: 'Cursos y talleres', icono: '✎', desc: 'Formación grabada o en vivo.',
      plantilla: 'Valida con una preventa o un taller piloto antes de grabar todo. Considera reembolsos y soporte.',
      params: [P('alumnos', 'Alumnos nuevos al mes', 3, 12, 40), P('precio', 'Precio', 39, 79, 149, 'USD'), P('plat', 'Comisión de la plataforma (%)', 15, 10, 5, '%'), P('reemb', 'Reembolsos (%)', 10, 6, 3, '%')],
      calc: function (v) { var ing = v.alumnos * v.precio * (1 - v.reemb / 100); return { ing: ing, costo: ing * v.plat / 100 }; } },
    { id: 'servicios', nombre: 'Servicios de dron, foto y vídeo', icono: '✈', desc: 'Trabajos por encargo: inmuebles, eventos, inspección, bodas, corporativo.',
      plantilla: 'Cotiza con el Tarificador (equipo, desplazamiento, postproducción). Verifica permisos de vuelo, seguros y derechos de imagen de cada trabajo.',
      params: [P('proyectos', 'Proyectos al mes', 1, 4, 8), P('precio', 'Precio medio por proyecto', 150, 300, 600, 'USD'), P('costo', 'Costo directo por proyecto', 50, 60, 80, 'USD')],
      calc: function (v) { return { ing: v.proyectos * v.precio, costo: v.proyectos * v.costo }; } },
    { id: 'stock', nombre: 'Licencias de stock', icono: '▣', desc: 'Fotos, vídeos y tomas aéreas en bancos de contenido.',
      plantilla: 'Necesitas permisos de modelo/propiedad cuando aplique. Los ingresos crecen despacio y se acumulan.',
      params: [P('archivos', 'Archivos publicados', 100, 400, 1200), P('desc', 'Descargas por archivo al mes', 0.02, 0.05, 0.1), P('regalia', 'Regalía por descarga', 0.3, 0.6, 1.2, 'USD')],
      calc: function (v) { return { ing: v.archivos * v.desc * v.regalia, costo: 0 }; } },
    { id: 'consultoria', nombre: 'Consultoría y asesoría creativa', icono: '☰', desc: 'Horas de estrategia, auditorías o capacitación a equipos.',
      plantilla: 'Define alcance, entregables y límite de revisiones por escrito.',
      params: [P('horas', 'Horas facturadas al mes', 4, 12, 30), P('tarifa', 'Tarifa por hora', 25, 45, 80, 'USD')],
      calc: function (v) { return { ing: v.horas * v.tarifa, costo: 0 }; } },
    { id: 'merch', nombre: 'Merch y productos físicos', icono: '◈', desc: 'Camisetas, impresiones, etiquetas, láminas.',
      plantilla: 'Calcula el costo completo (producto, envío, comisiones, devoluciones) antes de fijar el precio.',
      params: [P('pedidos', 'Pedidos al mes', 5, 20, 60), P('precio', 'Precio medio', 15, 25, 35, 'USD'), P('costo', 'Costo por pedido', 10, 12, 14, 'USD')],
      calc: function (v) { return { ing: v.pedidos * v.precio, costo: v.pedidos * v.costo }; } }
  ];
  K.fuente = function (id) { return K.FUENTES.filter(function (f) { return f.id === id; })[0]; };
  K.FUENTES_IDS = K.FUENTES.map(function (f) { return f.id; });
  K.OTRA_FUENTE = 'otro';

  K.CAT_INGRESO = ['Servicios', 'Anuncios', 'Patrocinios', 'Afiliados', 'Membresías', 'Productos digitales', 'Cursos', 'Licencias', 'Consultoría', 'Merch', 'Otros ingresos'];
  K.CAT_GASTO = ['Equipo', 'Software y suscripciones', 'Seguros', 'Desplazamiento', 'Baterías y consumibles', 'Publicidad', 'Subcontratos', 'Comisiones', 'Impuestos y tasas', 'Formación', 'Oficina', 'Otros gastos'];
  K.FREC = [['semanal', 'Semanal'], ['quincenal', 'Cada 2 semanas'], ['mensual', 'Mensual'], ['trimestral', 'Trimestral'], ['anual', 'Anual']];

  K.TERMINOS = 'Pago en el plazo indicado mediante el medio acordado. Los entregables se liberan al confirmarse el pago, salvo acuerdo distinto. Se incluyen las revisiones pactadas; cambios adicionales se cotizan aparte. Los derechos de uso se definen en la propuesta. Esta cotización/factura es un documento comercial: valida los requisitos fiscales de tu país con tu contador.';

  /* paquetes de servicios de ejemplo: lineas {desc,cant,precio}. Los precios son marcadores: se reemplazan con tu tarifa. */
  K.PAQUETES = [
    { nombre: 'Vuelo de dron inmobiliario', lineas: [{ desc: 'Sesión de captura aérea (hasta 1 h)', cant: 1, precio: 120 }, { desc: 'Edición y corrección de color (fotos)', cant: 15, precio: 4 }, { desc: 'Vídeo corto editado (30-60 s)', cant: 1, precio: 90 }] },
    { nombre: 'Vídeo de evento (media jornada)', lineas: [{ desc: 'Cobertura en sitio (4 h)', cant: 1, precio: 280 }, { desc: 'Postproducción y resumen (3 min)', cant: 1, precio: 220 }, { desc: 'Desplazamiento', cant: 1, precio: 30 }] },
    { nombre: 'Inspección aérea', lineas: [{ desc: 'Vuelo de inspección y registro', cant: 1, precio: 200 }, { desc: 'Informe con imágenes', cant: 1, precio: 120 }] },
    { nombre: 'Etiquetas y códigos QR personalizados', lineas: [{ desc: 'Diseño de etiqueta', cant: 1, precio: 25 }, { desc: 'Lote de códigos QR únicos', cant: 100, precio: 0.4 }] },
    { nombre: 'Gestión de canal (mensual)', lineas: [{ desc: 'Planificación y calendario', cant: 1, precio: 150 }, { desc: 'Edición de piezas', cant: 8, precio: 35 }, { desc: 'Informe mensual de métricas', cant: 1, precio: 60 }] }
  ];
})(window);
