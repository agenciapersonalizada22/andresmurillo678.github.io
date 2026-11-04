// =============================================================
//  📱  TELÉFONO: menú rápido (misiones, mapa, radio, garaje, banco,
//  logros, estadísticas, foto y ajustes). Tecla T, botón TEL o cruceta arriba.
// =============================================================
const Telefono = (() => {
  const COL = '#c86bff';
  const reabrir = () => abrir();

  function cerrarYHacer(fn) { Panel.cerrar(true); fn(); }

  function appMisiones() {
    const h = Historia.datos().hechas;
    const f = [{ t: 'titulo', texto: 'HISTORIA (' + h.length + '/' + Historia.S.length + ')' }];
    const sig = Historia.siguiente();
    if (Historia.activa) f.push({ t: 'boton', texto: 'Abandonar misión actual', peligro: true, accion: () => { Historia.abandonar(); reabrir(); } });
    if (sig) {
      f.push({ t: 'info', texto: `Siguiente: ${sig.t}`, valor: sig.de });
      f.push({ t: 'boton', texto: 'Marcar contacto en el mapa', accion: () => { Historia.marcarContacto(); J.pista('Destino marcado'); Panel.cerrar(); } });
    } else f.push({ t: 'info', texto: '¡Historia completada!', valor: '✓' });
    f.push({ t: 'titulo', texto: 'TRABAJOS (empiezan al instante)' });
    for (const id of Object.keys(Historia.SEC)) {
      const s = Historia.SEC[id];
      f.push({ t: 'boton', texto: s.nombre, nota: s.desc, precio: Util.dinero(s.pago), color: s.color, accion: () => cerrarYHacer(() => Historia.iniciarSec(id)) });
    }
    f.push({ t: 'titulo', texto: 'EN LA CIUDAD' });
    f.push({ t: 'info', texto: 'T Taxi · E Entregas · C Carrera en el mapa', valor: '' });
    const l = [];
    Historia.S.forEach((m, i) => l.push({ t: 'info', texto: `${i + 1}. ${m.t}`, valor: h.includes(m.id) ? '✓' : '' }));
    return f.concat([{ t: 'titulo', texto: 'LISTA' }], l);
  }

  function appRadio() {
    const f = [{ t: 'boton', texto: 'Apagar radio', accion: () => { Radio.elegir(-1); Panel.refrescar(); }, nota: Radio.indice < 0 ? 'puesto' : '' }];
    Radio.estaciones.forEach((e, i) => f.push({
      t: 'boton', texto: e.nombre, nota: e.frecuencia + (Radio.indice === i ? ' · sonando' : ''), color: e.color,
      accion: () => { Radio.elegir(i); if (!J.jugador.carro) J.pista('La radio suena dentro del carro'); Panel.refrescar(); },
    }));
    return f;
  }

  function appGaraje() {
    const E = Economia.datos;
    const f = [{ t: 'info', texto: 'Plazas', valor: `${E.coches.length} / ${Economia.plazas()}` }];
    if (!E.coches.length) f.push({ t: 'info', texto: 'No tienes carros guardados. Compra una casa y guarda uno.', valor: '' });
    for (const d of E.coches) {
      f.push({
        t: 'boton', texto: 'Llamar: ' + CONFIG.carros[d.tipo].nombre, nota: d.fuera ? 'afuera' : 'en el garaje', precio: Util.dinero(100), color: d.color,
        deshabilitado: !d.fuera || J.dinero < 100, accion: () => cerrarYHacer(() => Economia.llamarCarro(d.id)),
      });
    }
    return f;
  }

  function appLogros() {
    const f = [{ t: 'info', texto: 'Desbloqueados', valor: Logros.cuantos() + ' / ' + Logros.total() }];
    for (const [id, n, d] of Logros.LISTA) f.push({ t: 'info', texto: (Logros.hechos[id] ? '★ ' : '☆ ') + n + ' — ' + d, valor: Logros.hechos[id] ? '✓' : '' });
    return f;
  }

  function appStats() {
    const s = J.stats;
    const fila = (a, b) => ({ t: 'info', texto: a, valor: b });
    return [
      fila('Dinero', Util.dinero(J.dinero)), fila('En el banco', Util.dinero(Economia.banco)), fila('Patrimonio', Util.dinero(Economia.patrimonio())),
      fila('Misiones completadas', s.misiones || 0), fila('Historia', (s.historia || 0) + ' / 22'), fila('Trabajos', s.trabajos || 0),
      fila('Viajes de taxi', s.viajesTaxi || 0), fila('Mejor carrera', s.mejorCarrera ? s.mejorCarrera + ' s' : '—'),
      fila('Kilómetros', (s.km || 0).toFixed(1)), fila('Km en lancha', (s.kmAgua || 0).toFixed(1)),
      fila('Carros tomados', s.carrosTomados || 0), fila('Disparos', s.disparos || 0), fila('Sustos a peatones', s.sustos || 0),
      fila('Veces atrapado', s.atrapado || 0), fila('Máximo de estrellas', s.maxEstrellas || 0), fila('Fotos', s.fotos || 0),
      fila('Ranura de guardado', Util.ranura), fila('Jugador', J.perfil.nombre),
    ];
  }

  function appBanco() {
    return [
      { t: 'info', texto: 'En el banco', valor: Util.dinero(Economia.banco) }, { t: 'info', texto: 'En tu bolsillo', valor: Util.dinero(J.dinero) },
      { t: 'info', texto: 'Deposita en un cajero ($) para proteger tu dinero de las multas.', valor: '' },
    ];
  }

  function abrir() {
    const rej = [
      { t: 'boton', texto: '📋 MISIONES', accion: () => Panel.abrir({ titulo: 'MISIONES', pestanas: [{ id: 'm', nombre: 'MISIONES', filas: appMisiones }], alCerrar: reabrir }) },
      { t: 'boton', texto: '🗺 MAPA', accion: () => cerrarYHacer(() => CIUDAD.abrirMapa()) },
      { t: 'boton', texto: '📻 RADIO', accion: () => Panel.abrir({ titulo: 'RADIO', pestanas: [{ id: 'r', nombre: 'ESTACIONES', filas: appRadio }], alCerrar: reabrir }) },
      { t: 'boton', texto: '🚗 GARAJE', accion: () => Panel.abrir({ titulo: 'MIS CARROS', pestanas: [{ id: 'g', nombre: 'GARAJE', filas: appGaraje }], alCerrar: reabrir }) },
      { t: 'boton', texto: '🏦 BANCO', accion: () => Panel.abrir({ titulo: 'BANCO', pestanas: [{ id: 'b', nombre: 'CUENTA', filas: appBanco }], alCerrar: reabrir }) },
      { t: 'boton', texto: '🏆 LOGROS', accion: () => Panel.abrir({ titulo: 'LOGROS', pestanas: [{ id: 'l', nombre: 'LOGROS', filas: appLogros }], alCerrar: reabrir }) },
      { t: 'boton', texto: '📊 ESTADÍSTICAS', accion: () => Panel.abrir({ titulo: 'ESTADÍSTICAS', pestanas: [{ id: 's', nombre: 'DATOS', filas: appStats }], alCerrar: reabrir }) },
      { t: 'boton', texto: '📷 FOTO', accion: () => cerrarYHacer(() => Foto.entrar()), deshabilitado: J.modo === 'pausa' || Panel.previo === 'pausa' },
      { t: 'boton', texto: Multi.activo ? '🌐 EN LÍNEA' : '🌐 MULTIJUGADOR', accion: () => { if (Multi.activo) Multi.abrirPanel(); else { Panel.cerrar(true); Multi.abrirLobby(); } } },
      { t: 'boton', texto: '⚙ AJUSTES', accion: () => Ajustes.abrir() },
      { t: 'boton', texto: '💾 GUARDAR', accion: () => { J.guardarPartida(); J.pista('Partida guardada'); Panel.cerrar(); } },
    ];
    Panel.abrir({
      titulo: J.perfil.nombre.toUpperCase() + ' · ' + Util.dinero(J.dinero), transparente: true,
      pestanas: [{ id: 't', nombre: 'TELÉFONO', rejilla: true, filas: () => rej }],
      pie: Entrada.hayMando ? 'Cruceta: mover · A: abrir · B: cerrar' : 'Flechas: mover · Enter: abrir · Esc: cerrar',
    });
  }

  return { abrir };
})();
