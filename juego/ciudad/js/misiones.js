// =============================================================
//  🎯  MISIONES: marcadores brillantes en el mapa.
//   T = Taxi (recoge pasajeros y llévalos a tiempo)
//   E = Entrega (lleva un paquete; si es frágil, ¡no choques!)
//   C = Carrera (pasa por los puntos antes de que acabe el tiempo)
//   R = Taller (repara y pinta tu carro; la policía te pierde)
//   A = Armería (a pie: compra armas, munición y ropa)
// =============================================================
const Misiones = (() => {
  const M = CONFIG.misiones;
  const INFO = {
    taxi: { nombre: 'TAXI', color: '#ffd23d', letra: 'T', etiqueta: 'TAXI' },
    entrega: { nombre: 'ENTREGA', color: '#c86bff', letra: 'E', etiqueta: 'ENTREGAS' },
    carrera: { nombre: 'CARRERA', color: '#ff3d81', letra: 'C', etiqueta: 'CARRERA' },
    taller: { nombre: 'TALLER', color: '#7dff6b', letra: 'R', etiqueta: 'TALLER $' + M.taller.precio },
    tienda: { nombre: 'ARMERÍA', color: '#ff8a3d', letra: 'A', etiqueta: 'ARMERÍA' },
  };
  const sinMision = (tipo) => tipo === 'taller' || tipo === 'tienda'; // se usan aunque haya una misión activa

  // La armería queda en una banqueta cerca del inicio
  function lugarTienda() {
    let mejor = null, md = Infinity;
    for (const q of Mundo.paradas) {
      const d = Math.hypot(q.x - L.inicio.x, q.y - L.inicio.y);
      if (d < 380 || d > 1100) continue;
      if (Math.hypot(q.x - L.taller.x, q.y - L.taller.y) < 300) continue;
      if (d < md) { md = d; mejor = q; }
    }
    return mejor ? { x: mejor.x, y: mejor.y } : { x: L.inicio.x + 220, y: L.inicio.y };
  }
  const L = Mundo.lugares;
  const marcadores = [
    { tipo: 'taxi', x: L.taxi.x, y: L.taxi.y, armado: true },
    { tipo: 'entrega', x: L.almacen.x, y: L.almacen.y, armado: true },
    { tipo: 'carrera', x: L.carrera.x, y: L.carrera.y, armado: true },
    { tipo: 'taller', x: L.taller.x, y: L.taller.y, armado: true },
    Object.assign({ tipo: 'tienda', armado: true }, lugarTienda()),
  ];
  let activa = null;
  let relojPista = 0;

  const pos = () => J.jugador.carro || J.jugador;
  const cerca = (a, b, r) => Math.hypot(a.x - b.x, a.y - b.y) < (r || b.r);
  const metros = (d) => Math.round(d / 16);

  function pista(texto) {
    if (relojPista > 0) return;
    relojPista = 3;
    J.pista(texto);
  }

  function elegirParada(rMin, rMax) {
    const p = pos();
    const lista = Mundo.paradas;
    let mejor = null;
    for (let k = 0; k < 200; k++) {
      const c = lista[Math.floor(Math.random() * lista.length)];
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d >= rMin && d <= rMax) return c;
      if (!mejor || Math.abs(d - (rMin + rMax) / 2) < Math.abs(Math.hypot(mejor.x - p.x, mejor.y - p.y) - (rMin + rMax) / 2)) mejor = c;
    }
    return mejor;
  }

  // ----------------------------------------------------------- Inicio
  function activar(m) {
    const carro = J.jugador.carro;
    if (m.tipo === 'tienda') {
      if (!carro) Armas.abrirTienda();
      return;
    }
    if (m.tipo === 'taller') {
      if (!carro) return pista('Trae un carro al taller para repararlo');
      const precio = M.taller.precio;
      if (J.dinero < precio) return pista(`Necesitas ${Util.dinero(precio)} para el taller`);
      J.gastar(precio);
      carro.reparar();
      if (!carro.emergencia && carro.tipo !== 'taxi') {
        const otros = carro.t.colores.filter((c) => c !== carro.color);
        if (otros.length) carro.pintar(Util.elegir(otros));
      }
      J.limpiarBuscado();
      J.avisar('¡COMO NUEVO!', 'Reparado, pintado y la policía te perdió', INFO.taller.color);
      Sonido.reparar();
      Efectos.confeti(carro.x, carro.y, 30);
      return;
    }
    if (activa) return;
    if (!carro) return pista(`Necesitas un carro para la misión de ${INFO[m.tipo].nombre.toLowerCase()}`);
    if (carro.averiado) return pista('Tu carro está averiado: consigue otro');
    Sonido.mision();
    J.stats.misionesIniciadas = (J.stats.misionesIniciadas || 0) + 1;
    if (m.tipo === 'taxi') iniciarTaxi();
    else if (m.tipo === 'entrega') iniciarEntrega();
    else if (m.tipo === 'carrera') iniciarCarrera(m);
  }

  function iniciarTaxi() {
    activa = { tipo: 'taxi', viaje: 0, ganado: 0 };
    J.avisar('MISIÓN: TAXI', `Lleva ${M.taxi.viajes} pasajeros a su destino`, INFO.taxi.color);
    nuevoViaje();
  }

  function nuevoViaje() {
    const a = activa;
    a.viaje++;
    const p = elegirParada(450, 1300);
    const T = Mundo.T;
    const pas = new Peaton(Math.floor(p.x / T), Math.floor(p.y / T), { estado: 'esperando', mision: true });
    pas.x = p.x;
    pas.y = p.y;
    J.peatones.push(pas);
    a.pasajero = pas;
    a.fase = 'recoger';
    a.objetivo = { x: p.px, y: p.py, r: 105 };
    a.tiempo = 80;
    a.tiempoMax = 80;
  }

  function iniciarEntrega() {
    const d = elegirParada(1500, 3200);
    const p = pos();
    const dist = Math.hypot(d.px - p.x, d.py - p.y);
    const fragil = Math.random() < 0.5;
    const tiempo = Math.round(dist * 1.35 / M.entrega.velocidadRef + 15);
    activa = { tipo: 'entrega', fragil, dano: 0, objetivo: { x: d.px, y: d.py, r: 105 }, distancia: dist, tiempo, tiempoMax: tiempo };
    J.avisar(fragil ? 'ENTREGA FRÁGIL' : 'MISIÓN: ENTREGA', fragil ? '¡Cuidado! Si chocas mucho se rompe' : 'Lleva el paquete antes de que acabe el tiempo', INFO.entrega.color);
  }

  function iniciarCarrera(m) {
    let n = Mundo.nodoCercano(m.x, m.y);
    const clave = (q) => q.i + ',' + q.j;
    const visitados = new Set([clave(n)]);
    const puntos = [];
    let dirPrev = -1;
    let total = 0;
    let ant = { x: J.jugador.carro.x, y: J.jugador.carro.y };
    for (let k = 0; k < M.carrera.puntos; k++) {
      const pasos = Math.random() < 0.5 ? 1 : 2;
      for (let s = 0; s < pasos; s++) {
        const todas = Mundo.salidas(n.i, n.j).filter((d) => dirPrev < 0 || d !== (dirPrev + 2) % 4);
        let opciones = todas.filter((d) => !visitados.has(clave({ i: n.i + DIRS[d][0], j: n.j + DIRS[d][1] })));
        if (!opciones.length) opciones = todas.length ? todas : Mundo.salidas(n.i, n.j);
        const d = Util.elegir(opciones);
        n = { i: n.i + DIRS[d][0], j: n.j + DIRS[d][1] };
        visitados.add(clave(n));
        dirPrev = d;
        const c = Mundo.centroNodo(n.i, n.j);
        total += Math.abs(c.x - ant.x) + Math.abs(c.y - ant.y);
        ant = c;
      }
      const c = Mundo.centroNodo(n.i, n.j);
      puntos.push({ x: c.x, y: c.y });
    }
    const tiempo = Math.round(total / M.carrera.velocidadRef + M.carrera.tiempoExtra);
    activa = { tipo: 'carrera', puntos, k: 0, tiempo, tiempoMax: tiempo, cuenta: 3.99, transcurrido: 0, ultimaCuenta: 4 };
    activa.objetivo = { x: puntos[0].x, y: puntos[0].y, r: 115 };
    J.avisar('MISIÓN: CARRERA', `${puntos.length} puntos · ${tiempo} segundos`, INFO.carrera.color);
  }

  // ----------------------------------------------------------- Fin
  function completar(pago, texto) {
    const tipo = activa.tipo;
    limpiar();
    J.ganar(pago);
    J.stats.misiones = (J.stats.misiones || 0) + 1;
    J.avisar('¡MISIÓN COMPLETADA!', `+${Util.dinero(pago)}${texto ? ' · ' + texto : ''}`, INFO[tipo].color);
    Sonido.exito();
    const p = pos();
    Efectos.confeti(p.x, p.y, 40);
    J.guardarPartida();
  }

  function fallar(texto) {
    if (!activa) return;
    limpiar();
    J.avisar('MISIÓN FALLIDA', texto, '#ff5a5a');
    Sonido.fallo();
  }

  function limpiar() {
    if (activa && activa.pasajero) {
      const k = J.peatones.indexOf(activa.pasajero);
      if (k >= 0 && activa.fase === 'recoger') {
        activa.pasajero.mision = false;
        activa.pasajero.estado = 'caminar';
        activa.pasajero.elegirSiguiente();
      }
    }
    activa = null;
    // Que no se vuelva a activar el marcador si estás encima
    const p = pos();
    for (const m of marcadores) if (cerca(p, m, 90)) m.armado = false;
  }

  // ----------------------------------------------------------- Cada cuadro
  function actualizar(dt) {
    relojPista = Math.max(0, relojPista - dt);
    const p = pos();
    for (const m of marcadores) {
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      if (m.tipo === 'tienda' && J.jugador.carro) { if (d > 100) m.armado = true; continue; }
      if (d < 55) {
        if (m.armado && (!activa || sinMision(m.tipo))) { m.armado = false; activar(m); }
      } else if (d > 100) {
        m.armado = true;
      }
    }
    if (!activa) return;
    const a = activa;
    const carro = J.jugador.carro;

    if (a.tipo === 'taxi') {
      a.tiempo -= dt;
      if (a.fase === 'recoger') {
        if (a.pasajero.estado === 'caido' || a.pasajero.estado === 'huir') return fallar('¡Asustaste a tu pasajero!');
        if (a.tiempo <= 0) return fallar('El pasajero se cansó de esperar');
        if (carro && cerca(carro, a.objetivo) && carro.velocidad < 75) {
          const k = J.peatones.indexOf(a.pasajero);
          if (k >= 0) J.peatones.splice(k, 1);
          Sonido.puerta();
          Efectos.texto(carro.x, carro.y - 30, '¡Gracias por parar!', '#ffd23d', 14);
          const d = elegirParada(1000, 2600);
          const dist = Math.hypot(d.px - carro.x, d.py - carro.y);
          a.fase = 'llevar';
          a.destino = d;
          a.distancia = dist;
          a.objetivo = { x: d.px, y: d.py, r: 105 };
          a.tiempo = Math.round(dist * 1.35 / M.taxi.velocidadRef + 12);
          a.tiempoMax = a.tiempo;
          J.avisar('¡AL DESTINO!', `${metros(dist)} m · ${a.tiempo} segundos`, INFO.taxi.color);
        } else if (!carro && cerca(J.jugador, a.objetivo, 180)) {
          pista('Necesitas un carro para recoger al pasajero');
        }
      } else {
        if (!carro) return fallar('El pasajero se bajó del carro');
        if (carro.averiado) return fallar('¡El carro se descompuso!');
        if (a.tiempo <= 0) return fallar('¡Muy lento! El pasajero se fue');
        if (cerca(carro, a.objetivo) && carro.velocidad < 75) {
          let pago = M.taxi.pagoBase + metros(a.distancia) * M.taxi.pagoPorMetro + a.tiempo * 3;
          if (carro.tipo === 'taxi') pago *= M.taxi.propinaTaxi;
          pago = Math.round(pago / 5) * 5;
          a.ganado += pago;
          Sonido.puerta();
          const T = Mundo.T;
          const ped = new Peaton(Math.floor(a.destino.x / T), Math.floor(a.destino.y / T));
          ped.x = a.destino.x; ped.y = a.destino.y;
          J.peatones.push(ped);
          Efectos.texto(ped.x, ped.y - 24, '¡Gracias!', '#ffd23d', 15);
          if (a.viaje >= M.taxi.viajes) {
            const total = pago + M.taxi.bonoFinal;
            J.stats.viajesTaxi = (J.stats.viajesTaxi || 0) + 1;
            return completar(total, `${a.viaje} viajes`);
          }
          J.ganar(pago);
          J.stats.viajesTaxi = (J.stats.viajesTaxi || 0) + 1;
          J.avisar(`VIAJE ${a.viaje}/${M.taxi.viajes} ✓`, `+${Util.dinero(pago)} · sigue el siguiente`, INFO.taxi.color);
          nuevoViaje();
        }
      }
    } else if (a.tipo === 'entrega') {
      a.tiempo -= dt;
      if (a.tiempo <= 0) return fallar('Se acabó el tiempo de entrega');
      if (a.fragil && a.dano >= M.entrega.danoMaxFragil) return fallar('¡Se rompió el paquete frágil!');
      const v = carro ? carro.velocidad : 0;
      if (cerca(p, a.objetivo) && v < 85) {
        let pago = M.entrega.pagoBase + metros(a.distancia) * 0.25 + a.tiempo * 4;
        if (a.fragil) pago += M.entrega.bonoFragil * Math.max(0, 1 - a.dano / M.entrega.danoMaxFragil);
        pago = Math.round(pago / 5) * 5;
        return completar(pago, a.fragil ? `paquete al ${estadoPaquete()}%` : 'a tiempo');
      }
    } else if (a.tipo === 'carrera') {
      if (a.cuenta > 0) {
        a.cuenta -= dt;
        const n = Math.ceil(a.cuenta);
        if (n !== a.ultimaCuenta) {
          a.ultimaCuenta = n;
          if (n > 0) { J.avisar(String(n), 'Prepárate...', INFO.carrera.color, 0.9); Sonido.cuenta(false); }
          else { J.avisar('¡YA!', '', INFO.carrera.color, 0.9); Sonido.cuenta(true); }
        }
        return;
      }
      a.tiempo -= dt;
      a.transcurrido += dt;
      if (cerca(p, a.objetivo)) {
        a.k++;
        Sonido.checkpoint();
        Efectos.confeti(a.objetivo.x, a.objetivo.y, 14);
        if (a.k >= a.puntos.length) {
          const t = a.transcurrido;
          const mejor = J.stats.mejorCarrera;
          if (!mejor || t < mejor) J.stats.mejorCarrera = Math.round(t * 10) / 10;
          return completar(Math.round(M.carrera.pagoBase + Math.max(0, a.tiempo) * M.carrera.pagoPorSegundo), `${t.toFixed(1)} s`);
        }
        const q = a.puntos[a.k];
        a.objetivo = { x: q.x, y: q.y, r: 115 };
      }
      if (a.tiempo <= 0) return fallar('¡Se acabó el tiempo!');
    }
  }

  function estadoPaquete() {
    if (!activa || activa.tipo !== 'entrega') return 100;
    return Math.max(0, Math.round(100 - activa.dano / M.entrega.danoMaxFragil * 100));
  }

  // ----------------------------------------------------------- Dibujo en el piso
  function dibujarMarcador(g, x, y, color, letra, t, etiqueta, apagado) {
    const pulso = 1 + Math.sin(t * 4) * 0.07;
    g.save();
    g.globalAlpha = apagado ? 0.35 : 1;
    g.fillStyle = color;
    g.globalAlpha *= 0.22;
    g.beginPath(); g.arc(x, y, 48 * pulso, 0, Math.PI * 2); g.fill();
    g.globalAlpha = apagado ? 0.35 : 1;
    g.strokeStyle = color;
    g.lineWidth = 4;
    g.beginPath(); g.arc(x, y, 34 * pulso, 0, Math.PI * 2); g.stroke();
    g.setLineDash([10, 9]);
    g.lineDashOffset = -t * 30;
    g.lineWidth = 3;
    g.beginPath(); g.arc(x, y, 45 * pulso, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(10,8,25,0.88)';
    g.beginPath(); g.arc(x, y, 21, 0, Math.PI * 2); g.fill();
    g.fillStyle = color;
    g.font = `800 22px ${FUENTE}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(letra, x, y + 1);
    if (etiqueta) {
      g.font = `800 12px ${FUENTE}`;
      const w = g.measureText(etiqueta).width + 14;
      g.fillStyle = 'rgba(10,8,25,0.75)';
      Util.rectRedondo(g, x - w / 2, y - 76, w, 20, 10); g.fill();
      g.fillStyle = color;
      g.fillText(etiqueta, x, y - 65);
    }
    g.restore();
  }

  function dibujarObjetivo(g, x, y, color, t, texto, r) {
    const pulso = 1 + Math.sin(t * 5) * 0.08;
    const rr = (r || 60) * pulso;
    g.save();
    g.fillStyle = color;
    g.globalAlpha = 0.2;
    g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = color;
    g.lineWidth = 5;
    g.setLineDash([16, 10]);
    g.lineDashOffset = t * 40;
    g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    // Flecha que rebota
    const by = y - 34 - Math.abs(Math.sin(t * 4)) * 12;
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x - 14, by - 16); g.lineTo(x + 14, by - 16); g.lineTo(x, by + 4);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.6)';
    g.lineWidth = 2;
    g.stroke();
    if (texto) {
      g.font = `800 20px ${FUENTE}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 5;
      g.strokeStyle = 'rgba(0,0,0,0.7)';
      g.strokeText(texto, x, y);
      g.fillStyle = '#ffffff';
      g.fillText(texto, x, y);
    }
    g.restore();
  }

  function dibujarSuelo(g, t, vista) {
    const visible = (x, y, m) => x > vista.x0 - m && x < vista.x1 + m && y > vista.y0 - m && y < vista.y1 + m;
    for (const m of marcadores) {
      if (!visible(m.x, m.y, 100)) continue;
      const info = INFO[m.tipo];
      const apagado = activa && !sinMision(m.tipo);
      dibujarMarcador(g, m.x, m.y, info.color, info.letra, t, info.etiqueta, apagado);
    }
    if (!activa) return;
    const color = INFO[activa.tipo].color;
    if (activa.tipo === 'carrera') {
      for (let k = activa.puntos.length - 1; k >= activa.k; k--) {
        const q = activa.puntos[k];
        if (!visible(q.x, q.y, 140)) continue;
        if (k === activa.k) dibujarObjetivo(g, q.x, q.y, color, t, String(k + 1), 100);
        else if (k === activa.k + 1) {
          g.save();
          g.globalAlpha = 0.45;
          g.strokeStyle = color;
          g.lineWidth = 4;
          g.beginPath(); g.arc(q.x, q.y, 90, 0, Math.PI * 2); g.stroke();
          g.restore();
        }
      }
    } else if (activa.objetivo && visible(activa.objetivo.x, activa.objetivo.y, 120)) {
      dibujarObjetivo(g, activa.objetivo.x, activa.objetivo.y, color, t, '', 70);
    }
  }

  return {
    INFO,
    marcadores,
    get activa() { return activa; },
    actualizar,
    dibujarSuelo,
    // A dónde apunta la flecha
    objetivo() {
      if (!activa || !activa.objetivo) return null;
      if (activa.tipo === 'carrera' && activa.cuenta > 0) return null;
      return { x: activa.objetivo.x, y: activa.objetivo.y, color: INFO[activa.tipo].color };
    },
    // Lo que se muestra arriba en la pantalla
    info() {
      if (!activa) return null;
      const a = activa;
      const color = INFO[a.tipo].color;
      if (a.tipo === 'taxi') {
        return {
          titulo: `TAXI · VIAJE ${a.viaje}/${M.taxi.viajes}`, color,
          linea: a.fase === 'recoger' ? 'Recoge al pasajero que grita ¡TAXI!' : 'Lleva al pasajero y frena en el destino',
          tiempo: a.tiempo, tiempoMax: a.tiempoMax,
        };
      }
      if (a.tipo === 'entrega') {
        return {
          titulo: a.fragil ? 'ENTREGA FRÁGIL' : 'ENTREGA', color,
          linea: a.fragil ? `Paquete: ${estadoPaquete()}% · ¡no choques!` : 'Lleva el paquete al punto marcado',
          tiempo: a.tiempo, tiempoMax: a.tiempoMax,
        };
      }
      return {
        titulo: `CARRERA · PUNTO ${Math.min(a.k + 1, a.puntos.length)}/${a.puntos.length}`, color,
        linea: a.cuenta > 0 ? 'Prepárate...' : 'Pasa por los aros antes de que acabe el tiempo',
        tiempo: a.tiempo, tiempoMax: a.tiempoMax,
      };
    },
    // El carro no se mueve durante la cuenta regresiva de la carrera
    get retener() { return !!(activa && activa.tipo === 'carrera' && activa.cuenta > 0); },
    alDanarCarro(dano) {
      if (!activa || activa.tipo !== 'entrega') return;
      activa.dano += dano;
      if (activa.fragil && dano > 3) {
        const c = J.jugador.carro;
        if (c) Efectos.texto(c.x, c.y - 34, '¡Cuidado con el paquete!', '#c86bff', 14);
      }
    },
    alSerAtrapado() { if (activa) fallar('Te atrapó la policía'); },
    abandonar() { if (activa) fallar('Abandonaste la misión'); },
    // Para pruebas: empieza una misión sin ir al marcador
    iniciar(tipo) {
      const m = marcadores.find((q) => q.tipo === tipo);
      if (m) activar(m);
    },
  };
})();
