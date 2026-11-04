// =============================================================
//  💰  ECONOMÍA: banco y cajeros, propiedades con garaje, tuning,
//  boutique y armería. Todo se guarda en la clave ciudad_economia.
// =============================================================
const Economia = (() => {
  const T = Mundo.T;
  const L = Mundo.lugares;

  const PROPIEDADES = [
    { id: 'apto', nombre: 'Departamento', precio: 1800, plazas: 1, letra: 'H' },
    { id: 'casa', nombre: 'Casa con garaje', precio: 7500, plazas: 3, letra: 'H' },
    { id: 'mansion', nombre: 'Mansión de playa', precio: 24000, plazas: 6, letra: 'H' },
  ];
  const MEJORAS = [
    { id: 'motor', nombre: 'Motor', desc: 'más velocidad y aceleración', precios: [400, 900, 1800] },
    { id: 'frenos', nombre: 'Frenos', desc: 'frenan más fuerte', precios: [250, 600, 1200] },
    { id: 'llantas', nombre: 'Llantas', desc: 'más agarre y giro', precios: [300, 700, 1400] },
    { id: 'blindaje', nombre: 'Blindaje', desc: 'resiste más choques', precios: [500, 1100, 2200] },
  ];
  const COLORES = [['#e94b3c', 'Rojo'], ['#ff8a00', 'Naranja'], ['#ffd23d', 'Amarillo'], ['#49b35a', 'Verde'], ['#3df5ff', 'Cian'], ['#3c8de9', 'Azul'],
    ['#8a5ad6', 'Morado'], ['#ff3d81', 'Rosa'], ['#f2f2f2', 'Blanco'], ['#8d8d99', 'Gris'], ['#2e2e36', 'Negro'], ['#6b2f3c', 'Vino']];
  const NEONES = [['#ff3d81', 'Rosa'], ['#3df5ff', 'Cian'], ['#7dff6b', 'Verde'], ['#c86bff', 'Morado'], ['#ffd23d', 'Amarillo'], ['#ff2a2a', 'Rojo'], ['#ffffff', 'Blanco']];
  const PELOS = [['#1b120c', 'Negro'], ['#4a2c17', 'Castaño'], ['#a0522d', 'Cobrizo'], ['#d9b35f', 'Rubio'], ['#777777', 'Gris'], ['#c8344f', 'Rojo'], ['#3d7bff', 'Azul'], ['#7dff6b', 'Verde']];
  const NOMBRES_ROPA = ['Cian', 'Rosa', 'Amarillo', 'Verde', 'Morado', 'Blanco', 'Naranja', 'Grafito', 'Rojo', 'Azul', 'Violeta', 'Turquesa', 'Plata', 'Vino'];

  const defecto = () => ({ banco: 0, props: {}, coches: [], pelo: 0, sig: 1, ultimaHora: 16 });
  let E = Object.assign(defecto(), Util.cargar('economia', {}));
  if (typeof E.props !== 'object' || !E.props) E.props = {};
  if (!Array.isArray(E.coches)) E.coches = [];
  if (!isFinite(E.banco)) E.banco = 0;
  const guardar = () => Util.guardar('economia', E);

  const aplicarPelo = () => { J.jugador.colores.pelo = PELOS[E.pelo % PELOS.length][0]; };

  // ----------------------------------------------------------- Dónde ponerlo todo
  const usados = [];
  function lugarCerca(origen, dMin, dMax, sep, filtro) {
    let mejor = null, md = Infinity;
    const objetivo = (dMin + dMax) / 2;
    for (const q of Mundo.paradas) {
      const d = Math.hypot(q.x - origen.x, q.y - origen.y);
      if (d < dMin || d > dMax) continue;
      if (filtro && !filtro(q)) continue;
      if (usados.some((u) => Math.hypot(u.x - q.x, u.y - q.y) < (sep || 420))) continue;
      const e = Math.abs(d - objetivo);
      if (e < md) { md = e; mejor = q; }
    }
    if (!mejor) {
      for (const q of Mundo.paradas) {
        if (usados.some((u) => Math.hypot(u.x - q.x, u.y - q.y) < 200)) continue;
        const e = Math.abs(Math.hypot(q.x - origen.x, q.y - origen.y) - objetivo);
        if (e < md) { md = e; mejor = q; }
      }
    }
    if (!mejor) mejor = { x: origen.x + 200, y: origen.y };
    usados.push(mejor);
    return mejor;
  }
  for (const k of ['inicio', 'comisaria', 'taxi', 'almacen', 'taller', 'carrera']) if (L[k]) usados.push(L[k]);
  for (const m of Misiones.marcadores) usados.push(m);
  const inicio = L.inicio;
  const cerca = (q) => !(L.puerto && q.x > L.puerto.x0 - 100 && q.x < L.puerto.x1 + 100 && q.y > L.puerto.y0 - 100 && q.y < L.puerto.y1 + 100) &&
    !(L.aeropuerto && q.x > L.aeropuerto.x0 - 100 && q.x < L.aeropuerto.x1 + 100 && q.y > L.aeropuerto.y0 - 100 && q.y < L.aeropuerto.y1 + 100);
  const costa = (q) => cerca(q) && q.x > (Mundo.xCosta - 8) * T;

  // ----------------------------------------------------------- Tuning
  function etiquetaMod(m, k) { return (m && m[k]) || 0; }

  function abrirTuning() {
    const j = J.jugador;
    const car = j.carro;
    if (!car || car.aereo || car.acuatico) { J.pista('Trae un carro de calle al taller de tuning'); return; }
    const filas = {
      mej: () => {
        const f = [{ t: 'info', texto: car.t.nombre.toUpperCase(), valor: Util.dinero(J.dinero) }];
        for (const m of MEJORAS) {
          const n = etiquetaMod(car.mods, m.id);
          const lleno = n >= m.precios.length;
          f.push({
            t: 'boton', texto: `${m.nombre} ${'★'.repeat(n)}${'☆'.repeat(m.precios.length - n)}`, nota: lleno ? 'MÁXIMO' : m.desc,
            precio: lleno ? '' : Util.dinero(m.precios[n]), deshabilitado: lleno || J.dinero < m.precios[n],
            accion: () => {
              if (J.dinero < m.precios[n]) return;
              J.gastar(m.precios[n]);
              car.mods = Object.assign({}, car.mods, { [m.id]: n + 1 });
              car.aplicarMods();
              Sonido.comprar();
              J.stats.mejoras = (J.stats.mejoras || 0) + 1;
              J.llamar('alComprar', 'mejora');
              Panel.refrescar();
            },
          });
        }
        return f;
      },
      pin: () => COLORES.map(([c, n]) => ({
        t: 'boton', texto: n, nota: car.color === c ? 'puesto' : '', precio: Util.dinero(90), color: c, deshabilitado: car.color === c || J.dinero < 90,
        accion: () => { J.gastar(90); car.pintar(c); Sonido.reparar(); Panel.refrescar(); },
      })),
      neo: () => [{ t: 'boton', texto: 'Sin neón', nota: car.neon ? '' : 'puesto', deshabilitado: !car.neon, accion: () => { car.mods = Object.assign({}, car.mods, { neon: null }); car.aplicarMods(); Panel.refrescar(); } }]
        .concat(NEONES.map(([c, n]) => ({
          t: 'boton', texto: 'Neón ' + n, nota: car.neon === c ? 'puesto' : '', precio: Util.dinero(200), color: c, deshabilitado: car.neon === c || J.dinero < 200,
          accion: () => { J.gastar(200); car.mods = Object.assign({}, car.mods, { neon: c }); car.aplicarMods(); Sonido.reparar(); Panel.refrescar(); },
        }))),
      rep: () => {
        const falta = Math.round((1 - car.vida / car.t.vida) * 220);
        return [{
          t: 'boton', texto: 'Reparar carrocería', nota: falta ? '' : 'en perfecto estado', precio: Util.dinero(falta), deshabilitado: !falta || J.dinero < falta,
          accion: () => { J.gastar(falta); car.reparar(); Sonido.reparar(); Panel.refrescar(); },
        }];
      },
    };
    Panel.abrir({
      titulo: 'TUNING',
      pestanas: [{ id: 'mej', nombre: 'MEJORAS', filas: filas.mej }, { id: 'pin', nombre: 'PINTURA', filas: filas.pin }, { id: 'neo', nombre: 'NEÓN', filas: filas.neo }, { id: 'rep', nombre: 'REPARAR', filas: filas.rep }],
      alCerrar: () => J.guardarPartida(),
    });
  }

  // ----------------------------------------------------------- Boutique
  function abrirBoutique() {
    if (J.jugador.carro) { J.pista('Bájate del carro para entrar a la boutique'); return; }
    const A = Armas;
    const col = J.jugador.colores;
    const orig = { ropa: col.ropa, pelo: col.pelo };
    let ropa = A.datos.ropa, pelo = E.pelo;
    let comprado = false;
    const aplicar = () => { col.ropa = A.ROPAS[ropa]; col.pelo = PELOS[pelo][0]; };
    Panel.abrir({
      titulo: 'BOUTIQUE',
      pestanas: [{
        id: 'b', nombre: 'LOOK', filas: () => [
          { t: 'info', texto: 'Tu dinero', valor: Util.dinero(J.dinero) },
          { t: 'selector', texto: 'Ropa', get: () => ropa, set: (x) => { ropa = x; aplicar(); }, opciones: A.ROPAS.map((c, i) => [i, NOMBRES_ROPA[i] || 'Color ' + (i + 1)]), alCambiar: () => Panel.refrescar() },
          { t: 'selector', texto: 'Cabello', get: () => pelo, set: (x) => { pelo = x; aplicar(); }, opciones: PELOS.map((c, i) => [i, c[1]]), alCambiar: () => Panel.refrescar() },
          {
            t: 'boton', texto: 'Comprar este look', precio: Util.dinero(60), deshabilitado: J.dinero < 60 || (ropa === A.datos.ropa && pelo === E.pelo),
            accion: () => {
              J.gastar(60); A.datos.ropa = ropa; E.pelo = pelo; A.guardar(); guardar(); comprado = true;
              Sonido.comprar(); J.llamar('alComprar', 'ropa'); Panel.refrescar();
            },
          },
        ],
      }],
      alCerrar: () => { if (!comprado) { col.ropa = orig.ropa; col.pelo = orig.pelo; } else Armas.aplicarRopa(); aplicarPelo(); },
    });
  }

  // ----------------------------------------------------------- Cajero y banco
  function abrirCajero() {
    const cant = [100, 500, 1000, 5000];
    Panel.abrir({
      titulo: 'CAJERO AUTOMÁTICO',
      pestanas: [{
        id: 'c', nombre: 'BANCO', filas: () => {
          const f = [
            { t: 'info', texto: 'En el banco (protegido de multas)', valor: Util.dinero(E.banco) },
            { t: 'info', texto: 'En tu bolsillo', valor: Util.dinero(J.dinero) },
            { t: 'titulo', texto: 'DEPOSITAR' },
          ];
          for (const n of cant) f.push({ t: 'boton', texto: 'Depositar ' + Util.dinero(n), deshabilitado: J.dinero < n, accion: () => { mover(n); } });
          f.push({ t: 'boton', texto: 'Depositar todo', deshabilitado: J.dinero < 1, accion: () => mover(Math.floor(J.dinero)) });
          f.push({ t: 'titulo', texto: 'RETIRAR' });
          for (const n of cant) f.push({ t: 'boton', texto: 'Retirar ' + Util.dinero(n), color: '#ffd23d', deshabilitado: E.banco < n, accion: () => mover(-n) });
          f.push({ t: 'boton', texto: 'Retirar todo', color: '#ffd23d', deshabilitado: E.banco < 1, accion: () => mover(-Math.floor(E.banco)) });
          f.push({ t: 'info', texto: 'Interés: 2% por día de juego (máx. $500)', valor: '' });
          return f;
        },
      }],
      alCerrar: () => J.guardarPartida(),
    });
  }
  function mover(n) {
    if (n > 0) { if (J.dinero < n) return; J.dinero -= n; E.banco += n; }
    else { n = -n; if (E.banco < n) return; E.banco -= n; J.dinero += n; }
    guardar(); J.guardarPartida(); Sonido.dinero(); Panel.refrescar();
  }

  // ----------------------------------------------------------- Propiedades y garaje
  const plazasTotales = () => PROPIEDADES.reduce((s, p) => s + (E.props[p.id] ? p.plazas : 0), 0);
  const serializar = (c) => ({ tipo: c.tipo, color: c.color, mods: c.mods || {}, vida: c.vida / c.t.vida });

  function coche(id) { return E.coches.find((c) => c.id === id); }
  function carroEnMundo(id) { return J.carros.find((c) => c.propio === id); }

  function crearCarroPropio(d, x, y, ang) {
    const c = new Carro(d.tipo, x, y, ang, { color: d.color });
    c.mods = Object.assign({}, d.mods);
    c.aplicarMods();
    c.vida = Math.max(1, d.vida * c.t.vida);
    c.propio = d.id;
    J.carros.push(c);
    return c;
  }

  function guardarCochesFuera() {
    for (const d of E.coches) {
      const c = carroEnMundo(d.id);
      if (c) { d.color = c.color; d.mods = c.mods || {}; d.vida = c.vida / c.t.vida; }
    }
  }

  function registrarCarro(c) {
    if (c.aereo || c.acuatico || c.esPolicia || c.tipo === 'ambulancia') { J.pista('Ese vehículo no se puede guardar en un garaje'); return false; }
    if (c.propio) return true;
    if (E.coches.length >= plazasTotales()) { J.pista('Garaje lleno: compra otra propiedad o saca un carro'); return false; }
    const d = Object.assign({ id: E.sig++, fuera: true }, serializar(c));
    E.coches.push(d);
    c.propio = d.id;
    return true;
  }

  function guardarEnGaraje(prop) {
    const j = J.jugador, c = j.carro;
    if (!c) return;
    if (!registrarCarro(c)) return;
    const d = coche(c.propio);
    Object.assign(d, serializar(c), { fuera: false, vida: 1 });
    // Baja del carro y lo guarda (reparado)
    j.carro = null;
    c.conductor = null;
    const k = J.carros.indexOf(c);
    if (k >= 0) J.carros.splice(k, 1);
    j.x = prop.x + 30; j.y = prop.y + 40;
    Radio.apagar();
    Sonido.puerta();
    guardar(); J.guardarPartida();
    J.avisar('GUARDADO EN EL GARAJE', c.t.nombre + ' reparado y a salvo', '#ffb13d');
  }

  function sacarDelGaraje(id, prop) {
    const d = coche(id);
    if (!d) return;
    const x = prop.x + 60, y = prop.y + 30;
    const c = crearCarroPropio(d, x, y, 0);
    d.fuera = true;
    c.espacio = null;
    guardar();
    J.avisar('CARRO LISTO', c.t.nombre + ' te espera afuera', '#ffb13d');
  }

  function llamarCarro(id) {
    const d = coche(id);
    const j = J.jugador;
    if (!d || !d.fuera && !carroEnMundo(id)) { J.pista('Ese carro está guardado en el garaje'); return false; }
    if (J.dinero < 100) { J.pista('Llamar a tu carro cuesta ' + Util.dinero(100)); return false; }
    let c = carroEnMundo(id);
    const p = Mundo.carrilAzar(j.x, j.y, 160, 420, (q) => libreCerca(q.x, q.y)) || { x: j.x + 90, y: j.y, dir: 0 };
    J.gastar(100);
    if (c) { c.x = p.x; c.y = p.y; c.vx = c.vy = 0; c.ang = (p.dir || 0) * Math.PI / 2; }
    else c = crearCarroPropio(d, p.x, p.y, (p.dir || 0) * Math.PI / 2);
    c.mando.freno = true;
    J.avisar('TU CARRO LLEGÓ', c.t.nombre + ' está cerca', '#ffb13d');
    return true;
  }
  const libreCerca = (x, y) => !J.carros.some((c) => Math.abs(c.x - x) < 90 && Math.abs(c.y - y) < 90);

  function abrirPropiedad(def, marca) {
    const tiene = !!E.props[def.id];
    if (!tiene) {
      Panel.abrir({
        titulo: def.nombre.toUpperCase(),
        pestanas: [{
          id: 'v', nombre: 'EN VENTA', filas: () => [
            { t: 'info', texto: 'Plazas de garaje', valor: def.plazas },
            { t: 'info', texto: 'Guarda tu partida, duerme y guarda tus carros', valor: '' },
            { t: 'info', texto: 'Tu dinero', valor: Util.dinero(J.dinero) },
            {
              t: 'boton', texto: 'Comprar', precio: Util.dinero(def.precio), deshabilitado: J.dinero < def.precio, accion: () => {
                J.gastar(def.precio); E.props[def.id] = true; guardar(); J.guardarPartida();
                Sonido.exito(); Efectos.confeti(marca.x, marca.y, 40);
                J.avisar('¡ES TUYA!', def.nombre, '#ffb13d'); J.llamar('alComprar', 'propiedad');
                Panel.cerrar(true);
              },
            },
          ],
        }],
      });
      return;
    }
    const j = J.jugador;
    const filasCasa = () => {
      const f = [
        { t: 'boton', texto: 'Guardar partida', accion: () => { guardarCochesFuera(); guardar(); J.guardarPartida(); J.pista('Partida guardada'); Sonido.checkpoint(); } },
        {
          t: 'boton', texto: 'Dormir hasta la mañana', nota: 'recupera la hora de las 7:00', accion: () => {
            J.hora = 7; J.noche = 0; J.stats.noches = (J.stats.noches || 0) + 1;
            guardarCochesFuera(); guardar(); J.guardarPartida();
            Panel.cerrar(true); J.avisar('BUENOS DÍAS', 'Descansaste y guardaste la partida', '#ffd23d');
          },
        },
      ];
      if (j.carro) f.push({ t: 'boton', texto: 'Guardar este carro en el garaje', color: '#ffb13d', accion: () => { Panel.cerrar(true); guardarEnGaraje(marca); } });
      return f;
    };
    const filasGaraje = () => {
      const f = [{ t: 'info', texto: 'Plazas ocupadas', valor: `${E.coches.length} / ${plazasTotales()}` }];
      if (!E.coches.length) f.push({ t: 'info', texto: 'Aún no hay carros. Trae uno y guárdalo.', valor: '' });
      for (const d of E.coches) {
        const nombre = CONFIG.carros[d.tipo].nombre;
        const afuera = d.fuera;
        f.push({
          t: 'boton', texto: nombre + (d.mods && d.mods.neon ? ' ✦' : ''), nota: afuera ? 'afuera' : 'en el garaje', color: d.color,
          accion: () => { if (!afuera) { Panel.cerrar(true); sacarDelGaraje(d.id, marca); } else J.pista('Está afuera: llámalo desde el teléfono'); },
        });
      }
      return f;
    };
    Panel.abrir({
      titulo: def.nombre.toUpperCase(),
      pestanas: [{ id: 'c', nombre: 'CASA', filas: filasCasa }, { id: 'g', nombre: 'GARAJE', filas: filasGaraje }],
      alCerrar: () => J.guardarPartida(),
    });
  }

  // ----------------------------------------------------------- Creación de lugares
  function crear() {
    const pos = [
      lugarCerca(inicio, 260, 600, 300, cerca),
      lugarCerca(inicio, 1500, 2600, 600, cerca),
      lugarCerca({ x: (Mundo.xCosta - 3) * T, y: Mundo.TAM * 0.35 }, 0, 900, 600, costa),
    ];
    PROPIEDADES.forEach((def, i) => {
      const q = pos[i];
      const l = Lugares.agregar({
        id: 'prop_' + def.id, tipo: 'propiedad', nombre: def.nombre, x: q.x, y: q.y, color: '#ffb13d', letra: def.letra,
        etiqueta: E.props[def.id] ? 'MI CASA' : `SE VENDE ${Util.dinero(def.precio)}`, aPie: null,
        alEntrar: (m) => abrirPropiedad(def, m),
      });
      l.def = def;
      def.lugar = l;
    });
    const tun = lugarCerca(inicio, 900, 1700, 500, cerca);
    Lugares.agregar({ id: 'tuning', tipo: 'tuning', nombre: 'Tuning', x: tun.x, y: tun.y, color: '#ff3dd8', letra: 'N', etiqueta: 'TUNING', aPie: false, alEntrar: abrirTuning });
    const bou = lugarCerca(inicio, 600, 1300, 500, cerca);
    Lugares.agregar({ id: 'boutique', tipo: 'boutique', nombre: 'Boutique', x: bou.x, y: bou.y, color: '#ffd0e8', letra: 'B', etiqueta: 'BOUTIQUE', aPie: true, alEntrar: abrirBoutique });
    for (let k = 0; k < 6; k++) {
      const a = lugarCerca({ x: Mundo.TAM * (0.2 + 0.6 * ((k * 0.37) % 1)), y: Mundo.TAM * (0.15 + 0.7 * ((k * 0.61) % 1)) }, 0, 1500, 650, cerca);
      Lugares.agregar({ id: 'cajero' + k, tipo: 'cajero', nombre: 'Cajero', x: a.x, y: a.y, color: '#7dff9a', letra: '$', r: 44, aPie: true, alEntrar: abrirCajero });
    }
  }

  const mod = {
    actualizar(dt) {
      // Interés diario del banco (al cruzar la medianoche)
      const h = J.hora;
      if (E.ultimaHora > 20 && h < 4) {
        const interes = Math.min(500, Math.floor(E.banco * 0.02));
        if (interes > 0) { E.banco += interes; J.pista(`Interés del banco: +${Util.dinero(interes)}`); guardar(); }
      }
      E.ultimaHora = h;
      for (const l of Lugares.lista()) if (l.def) l.etiqueta = E.props[l.def.id] ? 'MI CASA' : `SE VENDE ${Util.dinero(l.def.precio)}`;
    },
    guardar() { guardarCochesFuera(); guardar(); },
  };
  J.registrar(mod);
  crear();
  aplicarPelo();

  return {
    get datos() { return E; }, PROPIEDADES, PELOS,
    abrirTuning, abrirCajero, abrirBoutique,
    llamarCarro,
    plazas: plazasTotales,
    coches: () => E.coches,
    tienePropiedad: (id) => !!E.props[id],
    get banco() { return E.banco; },
    patrimonio() { return J.dinero + E.banco + PROPIEDADES.reduce((s, p) => s + (E.props[p.id] ? p.precio : 0), 0); },
  };
})();
