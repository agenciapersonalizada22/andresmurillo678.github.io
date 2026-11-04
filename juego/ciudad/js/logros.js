// =============================================================
//  🏆  LOGROS y estadísticas (se guardan en ciudad_logros)
// =============================================================
const Logros = (() => {
  const s = () => J.stats;
  const LISTA = [
    ['primer', 'Primer paso', 'Completa una misión', () => (s().misiones || 0) >= 1],
    ['diez', 'Profesional', 'Completa 10 misiones', () => (s().misiones || 0) >= 10],
    ['cuarenta', 'Leyenda urbana', 'Completa 40 misiones', () => (s().misiones || 0) >= 40],
    ['hist5', 'Se pone interesante', 'Avanza 5 misiones de la historia', () => (s().historia || 0) >= 5],
    ['hist22', 'Ciudad Libre', 'Termina la historia', () => (s().historia || 0) >= 22],
    ['km50', 'Kilómetros', 'Maneja 50 km', () => (s().km || 0) >= 50],
    ['km300', 'Trotamundos', 'Maneja 300 km', () => (s().km || 0) >= 300],
    ['est3', 'Persona de interés', 'Llega a 3 estrellas', () => (s().maxEstrellas || 0) >= 3],
    ['est5', 'Enemigo público', 'Llega a 5 estrellas', () => (s().maxEstrellas || 0) >= 5],
    ['escapar', 'Fantasma', 'Pierde a la policía estando a 3+ estrellas', () => (s().escapes3 || 0) >= 1],
    ['rico', 'Bolsillos llenos', 'Ten $5,000 en total', () => J.dinero + (window.Economia ? Economia.banco : 0) >= 5000],
    ['millon', 'Millonario', 'Ten $50,000 en total', () => J.dinero + (window.Economia ? Economia.banco : 0) >= 50000],
    ['casa', 'Propietario', 'Compra una propiedad', () => !!(window.Economia && Economia.PROPIEDADES.some((p) => Economia.tienePropiedad(p.id)))],
    ['tuning', 'Mecánico', 'Mejora un carro 5 veces', () => (s().mejoras || 0) >= 5],
    ['taxi', 'Taxista', 'Haz 10 viajes de taxi', () => (s().viajesTaxi || 0) >= 10],
    ['carrera', 'Piloto', 'Termina una carrera', () => !!s().mejorCarrera],
    ['lancha', 'Capitán', 'Navega 3 km en lancha', () => (s().kmAgua || 0) >= 3],
    ['heli', 'Piloto de helicóptero', 'Vuela en helicóptero', () => (s().horasVuelo || 0) > 0],
    ['disparos', 'Buena puntería', 'Dispara 100 veces', () => (s().disparos || 0) >= 100],
    ['carros', 'Coleccionista', 'Toma 15 carros', () => (s().carrosTomados || 0) >= 15],
    ['trabajos', 'Todoterreno', 'Completa 5 trabajos secundarios', () => (s().trabajos || 0) >= 5],
    ['noches', 'Buen descanso', 'Duerme 3 veces en casa', () => (s().noches || 0) >= 3],
    ['fotos', 'Fotógrafo', 'Toma 3 fotos', () => (s().fotos || 0) >= 3],
    ['atrapado', 'Con las manos en la masa', 'Que te atrape la policía', () => (s().atrapado || 0) >= 1],
  ];
  let ok = Util.cargar('logros', {});
  if (!ok || typeof ok !== 'object') ok = {};
  let reloj = 2, antes = 0;

  J.registrar({
    actualizar(dt) {
      // Escapes de 3+ estrellas
      const e = J.buscado.estrellas;
      if (e > 0) antes = Math.max(antes, e);
      else { if (antes >= 3 && J.modo === 'jugando') J.stats.escapes3 = (J.stats.escapes3 || 0) + 1; antes = 0; }
      reloj -= dt;
      if (reloj > 0) return;
      reloj = 1.5;
      for (const [id, n, d, f] of LISTA) {
        if (ok[id]) continue;
        let v = false;
        try { v = f(); } catch (err) { v = false; }
        if (v) {
          ok[id] = Date.now();
          Util.guardar('logros', ok);
          J.avisar('LOGRO DESBLOQUEADO', n, '#ffd23d', 3.2);
          Sonido.exito();
          J.ganar(100);
        }
      }
    },
    guardar() { Util.guardar('logros', ok); },
  });

  return {
    LISTA, get hechos() { return ok; },
    total: () => LISTA.length,
    cuantos: () => LISTA.filter((l) => ok[l[0]]).length,
  };
})();
