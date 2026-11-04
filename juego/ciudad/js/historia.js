// =============================================================
//  📖  HISTORIA: 22 misiones encadenadas con personajes y diálogos,
//  más trabajos secundarios (repartidor, cazarrecompensas, robo).
//  Un contacto con "!" en el mapa te da la siguiente misión.
// =============================================================
const Historia = (() => {
  const T = Mundo.T;
  const L = Mundo.lugares;
  const COL = '#ff7a3d';
  let datos = Object.assign({ hechas: [], sec: 0 }, Util.cargar('historia', {}));
  if (!Array.isArray(datos.hechas)) datos.hechas = [];
  const guardar = () => Util.guardar('historia', datos);

  // ----------------------------------------------------------- Lugares por nombre
  const rnd = (k) => { const r = Util.crearAleatorio(CONFIG.semilla * 7 + k * 131); return () => r(); };
  function paradaFija(k, dMin, dMax) {
    const r = rnd(k);
    let mejor = null;
    for (let i = 0; i < 300; i++) {
      const q = Mundo.paradas[Math.floor(r() * Mundo.paradas.length)];
      const d = Math.hypot(q.x - L.inicio.x, q.y - L.inicio.y);
      mejor = q;
      if (d >= dMin && d <= dMax) break;
    }
    return { x: mejor.px, y: mejor.py };
  }
  function lugar(n) {
    if (typeof n === 'object') return n;
    if (n === 'puerto') return L.puerto ? { x: L.puerto.x, y: L.puerto.y } : paradaFija(50, 800, 2500);
    if (n === 'aeropuerto') return L.aeropuerto ? { x: L.aeropuerto.x, y: L.aeropuerto.y } : paradaFija(51, 1500, 3500);
    if (n === 'armeria') { const m = Misiones.marcadores.find((q) => q.tipo === 'tienda'); return { x: m.x, y: m.y }; }
    if (n === 'tuning' || n === 'boutique') { const l = Lugares.lista().find((q) => q.id === n); return l ? { x: l.x, y: l.y } : paradaFija(52, 500, 1500); }
    if (n && n.startsWith('r')) { const k = parseInt(n.slice(1), 10); return paradaFija(k, 600 + k * 70, 1400 + k * 150); }
    return L[n] ? { x: L[n].x, y: L[n].y } : paradaFija(1, 500, 1500);
  }
  const pos = () => J.jugador.carro || J.jugador;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // ----------------------------------------------------------- Pasos
  const P = {
    ir: (donde, texto, op) => () => {
      const o = lugar(donde); op = op || {};
      return {
        texto, obj: () => ({ x: o.x, y: o.y, r: op.r || 95 }),
        update() {
          if (op.aPie && J.jugador.carro) return;
          if (op.enCarro && !J.jugador.carro) return;
          if (dist(pos(), o) < (op.r || 95) && (!J.jugador.carro || J.jugador.carro.velocidad < 120)) return 'ok';
        },
      };
    },
    espera: (seg, texto) => () => { let t = seg; return { texto, update(dt) { t -= dt; if (t <= 0) return 'ok'; } }; },
    carro: (tipo, donde, texto) => () => {
      let o = lugar(donde), c = null;
      return {
        texto, obj: () => (c ? { x: c.x, y: c.y, r: 60 } : o),
        init() {
          if (tipo === 'lancha' || tipo === 'helicoptero') { const q = Lugares.puntos.find((p) => p.tipo === tipo); if (q) o = { x: q.x, y: q.y }; }
          c = tipo === 'lancha' ? new Lancha(o.x, o.y, 0, {}) : tipo === 'helicoptero' ? new Helicoptero(o.x, o.y, -Math.PI / 2, {}) : new Carro(tipo, o.x + 30, o.y, 0, {});
          c.mision = true;
          J.carros.push(c);
          this.carro = c;
        },
        update() {
          if (J.jugador.carro === c) return 'ok';
          if (!J.carros.includes(c)) return 'fail';
        },
      };
    },
    // Lleva el carro del paso anterior (o cualquier carro) a un lugar
    conducir: (donde, texto, op) => () => {
      const o = lugar(donde); op = op || {};
      return {
        texto, obj: () => ({ x: o.x, y: o.y, r: op.r || 100 }), tiempo: op.tiempo,
        update() {
          const c = J.jugador.carro;
          if (!c) { this.sin = (this.sin || 0) + 0.016; if (this.sin > 8) return 'fail:Dejaste el vehículo'; return; }
          this.sin = 0;
          if (c.averiado) return 'fail:El vehículo se averió';
          if (dist(c, o) < (op.r || 100) && c.velocidad < 120) return 'ok';
        },
      };
    },
    cazar: (tipo, texto, op) => () => {
      op = op || {};
      let c = null, t = 0;
      return {
        texto, obj: () => (c ? { x: c.x, y: c.y, r: 50 } : null), tiempo: 160,
        init() {
          const p = pos();
          const q = Mundo.carrilAzar(p.x, p.y, 450, 800, (z) => !J.carros.some((k) => Math.hypot(k.x - z.x, k.y - z.y) < 80)) || { x: p.x + 500, y: p.y, dir: 0 };
          c = new Carro(tipo, q.x, q.y, q.dir * Math.PI / 2, { conductor: 'ia' });
          c.mision = true;
          if (op.huye !== false) {
            c.ia = new IAPolicia(c);
            c.sirena = false;
            c.ia.estilo = 'x';
            c.ia.blanco = () => {
              const j = pos(); const a = Math.atan2(c.y - j.y, c.x - j.x);
              return { x: Util.limitar(c.x + Math.cos(a) * 900, 80, Mundo.TAM - 80), y: Util.limitar(c.y + Math.sin(a) * 900, 80, Mundo.TAM - 80), vx: 0, vy: 0 };
            };
            c.multVel = 1.02;
          } else { c.mando.freno = true; c.conductor = 'ia'; }
          J.carros.push(c);
        },
        update(dt) {
          t += dt;
          if (!J.carros.includes(c)) return 'fail:Perdiste al objetivo';
          if (c.averiado) return 'ok';
          if (dist(c, pos()) > 2300) return 'fail:Se escapó';
          if (c.ia && c.ia.modo === 'perseguir') c.ia.directo = c.ia.directo;
        },
        fin() { if (c) { c.mision = false; if (c.ia) c.ia.blanco = null; } },
      };
    },
    robo: (donde, texto, op) => () => {
      const o = lugar(donde); let h = 0; op = op || {};
      return {
        texto, obj: () => ({ x: o.x, y: o.y, r: 80 }), progreso: () => h / 4,
        update(dt) {
          if (J.jugador.carro) return;
          if (dist(J.jugador, o) < 80) {
            if (op.arma && !Armas.alguna) { this.aviso = (this.aviso || 0) - dt; if (this.aviso <= 0) { this.aviso = 4; J.pista('Necesitas un arma (Armería)'); } return; }
            if (h === 0) { J.buscado.calor = Math.max(J.buscado.calor, 2); J.delito('disparo', J.jugador.x, J.jugador.y); }
            h += dt;
            if (h >= 4) { J.buscado.calor = Math.max(J.buscado.calor, op.estrellas || 2.01); Sonido.dinero(); return 'ok'; }
          } else h = Math.max(0, h - dt);
        },
      };
    },
    escapar: (n, texto) => () => ({
      texto, init() { J.buscado.calor = Math.max(J.buscado.calor, n - 0.01); },
      update() { if (J.buscado.estrellas === 0 && J.buscado.calor === 0) return 'ok'; },
    }),
    carrera: (rivales, puntos, texto) => () => {
      let pts = [], k = 0, cuenta = 3.99, ult = 4, riv = [], tiempo = 0;
      const start = pos();
      return {
        texto, obj: () => (cuenta > 0 ? null : { x: pts[k].x, y: pts[k].y, r: 110 }), retener: () => cuenta > 0, puntos: () => pts.slice(k + 1),
        init() {
          let n = Mundo.nodoCercano(start.x, start.y), dirPrev = -1;
          for (let i = 0; i < puntos; i++) {
            for (let s = 0; s < 2; s++) {
              const todas = Mundo.salidas(n.i, n.j).filter((d) => dirPrev < 0 || d !== (dirPrev + 2) % 4);
              const d = Util.elegir(todas.length ? todas : Mundo.salidas(n.i, n.j));
              n = { i: n.i + DIRS[d][0], j: n.j + DIRS[d][1] }; dirPrev = d;
            }
            const c = Mundo.centroNodo(n.i, n.j); pts.push({ x: c.x, y: c.y });
          }
          for (let r = 0; r < rivales; r++) {
            const q = Mundo.carrilAzar(start.x, start.y, 70, 200, (z) => !J.carros.some((c) => Math.hypot(c.x - z.x, c.y - z.y) < 60)) || { x: start.x + 80 + r * 50, y: start.y, dir: 0 };
            const c = new Carro(Util.elegir(['deportivo', 'compacto', 'suv']), q.x, q.y, (J.jugador.carro ? J.jugador.carro.ang : 0), { conductor: 'ia' });
            c.mision = true; c.mando.freno = true;
            const R = { c, k: 0 };
            riv.push(R); J.carros.push(c);
          }
        },
        update(dt) {
          if (cuenta > 0) {
            cuenta -= dt; const n = Math.ceil(cuenta);
            if (n !== ult) { ult = n; if (n > 0) { J.avisar(String(n), 'Prepárate...', COL, 0.9); Sonido.cuenta(false); } else { J.avisar('¡YA!', '', COL, 0.9); Sonido.cuenta(true); for (const r of riv) { const c = r.c; c.ia = new IAPolicia(c); c.sirena = false; c.ia.estilo = 'x'; c.mando.freno = false; c.ia.blanco = () => { const q2 = pts[Math.min(r.k, pts.length - 1)]; return { x: q2.x, y: q2.y, vx: 0, vy: 0 }; }; } } }
            return;
          }
          tiempo += dt;
          for (const r of riv) {
            if (dist(r.c, pts[r.k]) < 120) r.k++;
            if (r.k >= pts.length) return 'fail:Un rival ganó la carrera';
          }
          if (dist(pos(), pts[k]) < 110) { k++; Sonido.checkpoint(); if (k >= pts.length) return 'ok'; }
        },
        fin() { for (const r of riv) { r.c.mision = false; if (r.c.ia) r.c.ia.blanco = null; } },
      };
    },
  };

  // ----------------------------------------------------------- Misiones de la historia
  // d: [personaje, texto]
  const S = [
    { id: 'h1', t: 'Bienvenido a Ciudad Libre', de: 'Marta', dar: 'taxi', pago: 200, d: [['Marta', 'Tú debes ser el nuevo. Soy Marta, dueña de TaxiMar.'], ['Marta', 'Esta ciudad se come a los novatos. Empecemos fácil: ven a la oficina de taxis.']], pasos: [P.ir('taxi', 'Ve a la oficina de TAXIS', { r: 110 })], fin: 'Marta: "Bien. Aquí hay trabajo para quien sepa manejar."' },
    { id: 'h2', t: 'Primer viaje', de: 'Marta', dar: 'taxi', pago: 250, d: [['Marta', 'Toma el taxi del frente. Un cliente espera en el cruce que te marco.'], ['Marta', 'Sin choques, ¿ok? Ese carro vale más que tú.']], pasos: [P.carro('taxi', 'taxi', 'Sube al taxi'), P.conducir('r3', 'Lleva el taxi al punto marcado')], fin: 'Marta: "Nada mal para un novato."' },
    { id: 'h3', t: 'El paquete de Marta', de: 'Marta', dar: 'almacen', pago: 320, d: [['Marta', 'Necesito que recojas un paquete en el almacén y lo traigas sin que se abra.'], ['Marta', 'No preguntes qué lleva.']], pasos: [P.carro('camioneta', 'almacen', 'Toma la camioneta del almacén'), P.conducir('r5', 'Entrega el paquete')], fin: 'Marta: "Gracias. Y no, no vuelvas a preguntar."' },
    { id: 'h4', t: 'Mecánico de confianza', de: 'El Tuerto', dar: 'taller', pago: 300, d: [['El Tuerto', 'Hey, tú. Dicen que manejas bien. Yo arreglo carros y a veces... los pierdo.'], ['El Tuerto', 'Un tipo en moto me robó una pieza. Alcánzalo.']], pasos: [P.cazar('moto', '¡Atrapa al ladrón en moto!')], fin: 'El Tuerto: "Sabía que servías."' },
    { id: 'h5', t: 'Armas para el trabajo', de: 'El Tuerto', dar: 'taller', pago: 150, d: [['El Tuerto', 'Las cosas se van a poner feas. Pásate por la armería a pie y compra algo.']], pasos: [P.ir('armeria', 'Visita la ARMERÍA a pie', { aPie: true, r: 70 })], fin: 'El Tuerto: "Mejor estar listo que muerto."' },
    { id: 'h6', t: 'Moto para el jefe', de: 'El Tuerto', dar: 'taller', pago: 400, d: [['El Tuerto', 'Don Aurelio quiere una moto nueva. Llévasela al almacén rápido.']], pasos: [P.carro('moto', 'taller', 'Toma la moto'), P.conducir('almacen', 'Llévala al almacén', { tiempo: 90 })], fin: 'Don Aurelio: "Eficiente. Me gusta."' },
    { id: 'h7', t: 'Carrera ilegal', de: 'Don Aurelio', dar: 'carrera', pago: 700, d: [['Don Aurelio', 'Soy Aurelio. Apuesto por ti en la carrera de esta noche.'], ['Don Aurelio', 'Si pierdes, perdemos los dos.']], pasos: [P.carro('deportivo', 'carrera', 'Sube al deportivo'), P.carrera(2, 6, 'Gana la carrera')], fin: 'Don Aurelio: "¡Ese es mi chico!"' },
    { id: 'h8', t: 'Un informante', de: 'Comisario Rivas', dar: 'comisaria', pago: 350, d: [['Rivas', 'Soy el comisario Rivas. Sé lo que haces para Aurelio. Puedo cerrar los ojos... si colaboras.'], ['Rivas', 'Pasa por la plaza a pie. Alguien te espera.']], pasos: [P.ir('r8', 'Ve a pie al punto del informante', { aPie: true })], fin: 'Rivas: "Buen comienzo, amigo."' },
    { id: 'h9', t: 'Escapa de la ley', de: 'Don Aurelio', dar: 'almacen', pago: 500, d: [['Don Aurelio', 'La policía ronda mis negocios. Haz ruido y pierde a unas patrullas.']], pasos: [P.escapar(2, 'Sube a 2 estrellas y escapa de la policía')], fin: 'Don Aurelio: "Se nota que eres de los buenos."' },
    { id: 'h10', t: 'Cobro de deudas', de: 'Don Aurelio', dar: 'almacen', pago: 650, d: [['Don Aurelio', 'Un SUV negro me debe plata. Destrúyelo para que aprenda.']], pasos: [P.cazar('suv', 'Destruye el SUV del deudor', { huye: false })], fin: 'Don Aurelio: "Mensaje enviado."' },
    { id: 'h11', t: 'Entrega en el puerto', de: 'Marta', dar: 'taxi', pago: 800, d: [['Marta', 'Un camión con mercancía debe llegar al puerto antes del amanecer.'], ['Marta', 'Cuidado: el camión es lento y pesa.']], pasos: [P.carro('camion', 'almacen', 'Toma el camión del almacén'), P.conducir('puerto', 'Entrégalo en el PUERTO', { r: 140 })], fin: 'Marta: "Ahora sí eres de confianza."' },
    { id: 'h12', t: 'Lancha de escape', de: 'Vera', dar: 'puerto', pago: 900, d: [['Vera', 'Soy Vera, periodista. Tengo fotos que comprometen a Aurelio.'], ['Vera', 'Llévame por el río hasta la costa, sin que me vean.']], pasos: [P.carro('lancha', 'puerto', 'Sube a la lancha del puerto'), P.conducir({ x: (Mundo.xCosta + 5) * T, y: ((Mundo.filaRio0 + Mundo.filaRio1) / 2 + 0.5) * T }, 'Navega hasta el mar', { r: 160 })], fin: 'Vera: "Gracias. El mundo sabrá la verdad."' },
    { id: 'h13', t: 'Vuelo nocturno', de: 'Vera', dar: 'puerto', pago: 1100, d: [['Vera', 'Necesito las pruebas en la comisaría. Hay un helicóptero en el aeropuerto.']], pasos: [P.carro('helicoptero', 'aeropuerto', 'Sube al helicóptero'), P.conducir('comisaria', 'Aterriza cerca de la comisaría', { r: 160 })], fin: 'Rivas: "Excelente trabajo desde las alturas."' },
    { id: 'h14', t: 'Traición', de: 'Comisario Rivas', dar: 'comisaria', pago: 900, d: [['Rivas', 'Aurelio sospecha. Va a mover su dinero esta noche.'], ['Rivas', 'Roba el cajero de su banco y que parezca un asalto.']], pasos: [P.robo('r12', 'Roba el cajero (mantente cerca 4 s)', { arma: true }), P.escapar(3, 'Escapa de la policía')], fin: 'Rivas: "Limpio. Casi."' },
    { id: 'h15', t: 'Superdeportivo robado', de: 'Don Aurelio', dar: 'almacen', pago: 1400, d: [['Don Aurelio', 'Alguien se llevó mi superdeportivo. Tráemelo o tráeme su cabeza... el carro, digo.']], pasos: [P.cazar('superdeportivo', 'Persigue al superdeportivo ladrón')], fin: 'Don Aurelio: "Jamás dudé de ti."' },
    { id: 'h16', t: 'La gran carrera', de: 'Don Aurelio', dar: 'carrera', pago: 2200, d: [['Don Aurelio', 'La gran carrera. Tres rivales. Mucho dinero.']], pasos: [P.carro('superdeportivo', 'carrera', 'Sube al superdeportivo'), P.carrera(3, 8, 'Gana la gran carrera')], fin: 'Don Aurelio: "Eres leyenda."' },
    { id: 'h17', t: 'Doble juego', de: 'Vera', dar: 'puerto', pago: 1000, d: [['Vera', 'Rivas me dijo que Aurelio te contrató. ¿De qué lado estás?'], ['Vera', 'Demuéstralo: lleva este sobre al puerto, a pie.']], pasos: [P.ir('puerto', 'Lleva el sobre al puerto a pie', { aPie: true, r: 120 })], fin: 'Vera: "Quiero creerte."' },
    { id: 'h18', t: 'Asalto al banco', de: 'Don Aurelio', dar: 'almacen', pago: 3000, d: [['Don Aurelio', 'El gran golpe. Banco central. Entra, toma todo y sal.'], ['Don Aurelio', 'La policía va a venir con todo.']], pasos: [P.robo('r15', 'Asalta el banco (4 s con arma)', { arma: true, estrellas: 4 }), P.escapar(4, 'Escapa de la policía y del helicóptero')], fin: 'Don Aurelio: "Retírate un tiempo."' },
    { id: 'h19', t: 'Zona caliente', de: 'Comisario Rivas', dar: 'comisaria', pago: 1500, d: [['Rivas', 'Tu amigo Aurelio habla de más. Hazlo callar: su limusina sale del puerto.']], pasos: [P.cazar('suv', 'Detén la limusina de Aurelio')], fin: 'Rivas: "Un paso más."' },
    { id: 'h20', t: 'Carga peligrosa', de: 'Marta', dar: 'taxi', pago: 1800, d: [['Marta', 'Me llegó una caja con el nombre de Aurelio. Llévala al aeropuerto, pero sin que te sigan.']], pasos: [P.carro('suv', 'taxi', 'Toma el SUV blindado'), P.conducir('aeropuerto', 'Llévalo al AEROPUERTO', { r: 160 }), P.escapar(2, 'Te siguen: pierde a la policía')], fin: 'Marta: "Gracias... por todo."' },
    { id: 'h21', t: 'Cara a cara', de: 'Vera', dar: 'puerto', pago: 3500, d: [['Vera', 'Aurelio huye en su Superdeportivo. Es ahora o nunca.']], pasos: [P.cazar('superdeportivo', 'Alcanza a Don Aurelio y detenlo')], fin: 'Vera: "Se acabó."' },
    { id: 'h22', t: 'Ciudad Libre', de: 'Todos', dar: 'comisaria', pago: 10000, d: [['Rivas', 'Aurelio cayó. Las calles respiran.'], ['Marta', 'Sin ti no se habría logrado.'], ['Vera', 'La ciudad es libre. Disfrútala.']], pasos: [P.escapar(3, 'Última prueba: sobrevive a 3 estrellas'), P.ir('inicio', 'Vuelve a casa', { r: 120 })], fin: '¡Completaste la historia de Ciudad Libre!' },
  ];

  // ----------------------------------------------------------- Secundarias
  const SEC = {
    repartidor: { nombre: 'Repartidor de pizzas', desc: '3 entregas rápidas (en moto, bonus)', color: '#ffb13d', pago: 520, pasos: () => [P.carro('moto', { x: pos().x + 60, y: pos().y }, 'Sube a la moto'), P.conducir('r' + (2 + datos.sec % 5), 'Entrega la pizza 1/3', { tiempo: 60 }), P.conducir('r' + (7 + datos.sec % 5), 'Entrega la pizza 2/3'), P.conducir('r' + (13 + datos.sec % 5), 'Entrega la pizza 3/3')] },
    recompensa: { nombre: 'Cazarrecompensas', desc: 'Atrapa a un fugitivo', color: '#ff3d81', pago: 700, pasos: () => [P.cazar(Util.elegir(['compacto', 'deportivo', 'suv', 'camioneta']), 'Detén al fugitivo (¡destruye su carro!)')] },
    robo: { nombre: 'Robo a tienda', desc: 'Necesitas un arma. Escapa después', color: '#ff6b4b', pago: 900, pasos: () => [P.robo('r' + (4 + datos.sec % 8), 'Asalta la tienda (mantente 4 s)', { arma: true }), P.escapar(2, 'Escapa de la policía')] },
  };

  // ----------------------------------------------------------- Motor
  let activa = null; // { def, paso, idx, inst, esHistoria, tiempo }
  const dialogo = (def, alAceptar) => {
    Panel.abrir({
      titulo: def.t.toUpperCase(),
      pestanas: [{
        id: 'd', nombre: 'MISIÓN', filas: () => [
          ...def.d.map(([n, tx]) => ({ t: 'info', texto: `${n}: ${tx}`, valor: '' })),
          { t: 'info', texto: 'Recompensa', valor: Util.dinero(def.pago) },
          { t: 'boton', texto: 'Aceptar misión', color: COL, accion: () => { Panel.cerrar(true); alAceptar(); } },
          { t: 'boton', texto: 'Ahora no', color: '#9a8cff', accion: () => Panel.cerrar() },
        ],
      }],
    });
  };

  function iniciar(def, esHistoria) {
    if (activa || Misiones.activa) { J.pista('Termina tu misión actual primero'); return; }
    activa = { def, idx: -1, inst: null, esHistoria, t0: J.tiempo };
    J.stats.misionesIniciadas = (J.stats.misionesIniciadas || 0) + 1;
    J.avisar(def.t.toUpperCase(), esHistoria ? 'Misión de la historia' : 'Trabajo', COL, 3);
    Sonido.mision();
    siguiente();
  }

  function siguiente() {
    const a = activa;
    if (a.inst && a.inst.fin) a.inst.fin();
    a.idx++;
    const pasos = a.pasos || (a.pasos = typeof a.def.pasos === 'function' ? a.def.pasos() : a.def.pasos);
    if (a.idx >= pasos.length) return completar();
    a.inst = pasos[a.idx]();
    if (a.inst.init) a.inst.init();
    a.tiempoRest = a.inst.tiempo || null;
    if (a.idx > 0) { Sonido.checkpoint(); }
    J.pista(a.inst.texto);
  }

  function limpiarTodo() {
    if (activa && activa.inst && activa.inst.fin) activa.inst.fin();
    for (const c of J.carros) if (c.mision) c.mision = false;
    activa = null;
  }

  function completar() {
    const def = activa.def, hist = activa.esHistoria;
    limpiarTodo();
    J.ganar(def.pago);
    J.stats.misiones = (J.stats.misiones || 0) + 1;
    if (hist) {
      datos.hechas.push(def.id); J.stats.historia = datos.hechas.length;
      J.avisar('¡MISIÓN COMPLETADA!', def.fin || '+' + Util.dinero(def.pago), COL, 4);
    } else { datos.sec++; J.stats.trabajos = (J.stats.trabajos || 0) + 1; J.avisar('¡TRABAJO TERMINADO!', '+' + Util.dinero(def.pago), def.color || COL); }
    Sonido.exito(); Efectos.confeti(pos().x, pos().y, 40);
    guardar(); J.guardarPartida();
    J.llamar('alCompletar', def.id);
    actualizarContacto();
  }

  function fallar(txt) {
    limpiarTodo();
    J.avisar('MISIÓN FALLIDA', txt || '', '#ff5a5a');
    Sonido.fallo();
    actualizarContacto();
  }

  const siguienteDef = () => S.find((m) => !datos.hechas.includes(m.id));

  // Contacto "!" en el mapa
  const contacto = Lugares.agregar({
    id: 'contacto', tipo: 'historia', nombre: 'Contacto', x: 0, y: 0, color: COL, letra: '!', r: 60, aPie: null, bloqueaMision: true,
    visible: () => !activa && !!siguienteDef(),
    alEntrar: () => { const d = siguienteDef(); if (d && !activa) dialogo(d, () => iniciar(d, true)); },
  });
  function actualizarContacto() {
    const d = siguienteDef();
    if (!d) return;
    const o = lugar(d.dar);
    contacto.x = o.x; contacto.y = o.y;
    contacto.etiqueta = d.de.toUpperCase() + ': ' + d.t;
  }
  actualizarContacto();

  const mod = {
    actualizar(dt) {
      if (!activa) return;
      const a = activa;
      if (a.tiempoRest !== null) { a.tiempoRest -= dt; if (a.tiempoRest <= 0) return fallar('Se acabó el tiempo'); }
      const r = a.inst.update ? a.inst.update(dt) : null;
      if (r === 'ok') { J.pista('¡Objetivo cumplido!'); siguiente(); }
      else if (r && r.startsWith('fail')) fallar(r.split(':')[1] || 'Fallaste');
    },
    alSerAtrapado() { if (activa) fallar('Te atrapó la policía'); },
    dibujarSuelo(g, t, v) {
      if (!activa) return;
      const o = activa.inst.obj && activa.inst.obj();
      if (o && o.x > v.x0 - 120 && o.x < v.x1 + 120 && o.y > v.y0 - 120 && o.y < v.y1 + 120) {
        const pul = 1 + Math.sin(t * 5) * 0.08, rr = (o.r || 80) * pul;
        g.save();
        g.fillStyle = COL; g.globalAlpha = 0.2;
        g.beginPath(); g.arc(o.x, o.y, rr, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1; g.strokeStyle = COL; g.lineWidth = 5; g.setLineDash([16, 10]); g.lineDashOffset = t * 40;
        g.beginPath(); g.arc(o.x, o.y, rr, 0, Math.PI * 2); g.stroke();
        g.restore();
      }
      const ps = activa.inst.puntos && activa.inst.puntos();
      if (ps) for (const q of ps) {
        g.save(); g.globalAlpha = 0.4; g.strokeStyle = COL; g.lineWidth = 4;
        g.beginPath(); g.arc(q.x, q.y, 90, 0, Math.PI * 2); g.stroke(); g.restore();
      }
    },
    guardar,
  };
  J.registrar(mod);

  return {
    get activa() { return activa; },
    get retener() { return !!(activa && activa.inst && activa.inst.retener && activa.inst.retener()); },
    S, SEC, datos: () => datos,
    siguiente: siguienteDef,
    hechas: () => datos.hechas.length,
    iniciarSec(id) { if (SEC[id]) iniciar(Object.assign({ id, t: SEC[id].nombre, d: [], fin: '' }, SEC[id], { pasos: SEC[id].pasos }), false); },
    iniciarHistoria(id) { const d = S.find((m) => m.id === id) || siguienteDef(); if (d) iniciar(d, true); },
    abandonar() { if (activa) fallar('Abandonaste la misión'); },
    marcarContacto() { const d = siguienteDef(); if (d) { const o = lugar(d.dar); J.waypoint = { x: o.x, y: o.y }; } },
    objetivo() {
      if (!activa || !activa.inst.obj) return null;
      const o = activa.inst.obj();
      return o ? { x: o.x, y: o.y, color: COL } : null;
    },
    info() {
      if (!activa) return null;
      const a = activa;
      return {
        titulo: (a.esHistoria ? 'HISTORIA · ' : 'TRABAJO · ') + a.def.t.toUpperCase() + `  ${a.idx + 1}/${(a.pasos || []).length}`, color: COL,
        linea: a.inst.texto, tiempo: a.tiempoRest !== null ? a.tiempoRest : undefined, tiempoMax: a.inst.tiempo,
      };
    },
  };
})();
