// =============================================================
//  🏙️  EL MUNDO: inventa la ciudad (calles, manzanas, edificios,
//  parques, río con puentes y playa) y la dibuja por pedazos
//  ("chunks") que se guardan ya pintados para que todo vaya rápido.
// =============================================================
const TIPO = { CALLE: 0, ACERA: 1, EDIFICIO: 2, PASTO: 3, AGUA: 4, ARENA: 5, PUENTE: 6, PLAZA: 7, PARKING: 8, BORDE: 9 };
const DECO = { NADA: 0, ARBOL: 1, PALMERA: 2, FUENTE: 3, BANCA: 4 };

const Mundo = (() => {
  const C = CONFIG.mundo;
  const COL = CONFIG.colores;
  const T = C.casilla;
  const N = C.tamano;
  const TAM = N * T;
  const rng = Util.crearAleatorio(CONFIG.semilla);
  const rInt = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const rElegir = (l) => l[Math.floor(rng() * l.length)];

  const suelo = new Uint8Array(N * N);
  const deco = new Uint8Array(N * N);
  // via: 1 = calle vertical, 2 = horizontal (3 = cruce), 4 = paso de cebra, 16 = cajón de estacionamiento
  const via = new Uint8Array(N * N);
  const idEdificio = new Int16Array(N * N).fill(-1);
  const colVia = new Int16Array(N).fill(-1);
  const filaVia = new Int16Array(N).fill(-1);
  let xs = [];
  let ys = [];
  let rioJ = -1;
  let filaRio0 = -1;
  let filaRio1 = -1;
  let xCosta = 0;
  const puente = [];
  const edificios = [];
  const lamparas = [];
  const paradas = [];
  const espacios = [];
  const lugares = {};
  const manzanas = [];

  const idx = (x, y) => y * N + x;
  const dentro = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
  function poner(x, y, tipo) { if (dentro(x, y)) suelo[idx(x, y)] = tipo; }
  function tipoEn(x, y) { return dentro(x, y) ? suelo[idx(x, y)] : TIPO.BORDE; }
  function decoEn(x, y) { return dentro(x, y) ? deco[idx(x, y)] : 0; }
  function viaEn(x, y) { return dentro(x, y) ? via[idx(x, y)] : 0; }

  // ----------------------------------------------------------- Generación
  // Reparte calles (de 2 casillas) entre "inicio" y "fin" dejando manzanas en medio
  function repartir(inicio, fin, min, max) {
    const pos = [inicio];
    let p = inicio;
    for (;;) {
      const resto = fin - p - 2;
      if (resto < 2 * min + 2) break;
      let s = rInt(min, max);
      if (resto - s - 2 < min) s = resto - 2 - min;
      p += 2 + s;
      pos.push(p);
    }
    pos.push(fin);
    return pos;
  }

  function generar() {
    xCosta = N - 13;
    xs = repartir(2, xCosta, C.manzanaMin, C.manzanaMax);
    ys = repartir(2, N - 4, C.manzanaMin, C.manzanaMax);
    xs.forEach((x, i) => { colVia[x] = i; colVia[x + 1] = i; });
    ys.forEach((y, j) => { filaVia[y] = j; filaVia[y + 1] = j; });

    // Fondo, bordes y playa
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let t = TIPO.PASTO;
        if (x === 0 || y === 0 || y === N - 1) t = TIPO.BORDE;
        else if (x === 1 || y === 1 || y === N - 2) t = TIPO.ACERA;
        if (x === xCosta + 2) t = TIPO.ACERA;
        else if (x > xCosta + 2) t = x >= N - 6 ? TIPO.AGUA : TIPO.ARENA;
        suelo[idx(x, y)] = t;
      }
    }

    // Calles
    const yUlt = ys[ys.length - 1];
    const xUlt = xs[xs.length - 1];
    for (const x0 of xs) {
      for (let y = ys[0]; y <= yUlt + 1; y++) {
        for (const x of [x0, x0 + 1]) { poner(x, y, TIPO.CALLE); via[idx(x, y)] |= 1; }
      }
    }
    for (const y0 of ys) {
      for (let x = xs[0]; x <= xUlt + 1; x++) {
        for (const y of [y0, y0 + 1]) { poner(x, y, TIPO.CALLE); via[idx(x, y)] |= 2; }
      }
    }

    // El río va en una fila de manzanas a media ciudad
    rioJ = Math.floor((ys.length - 1) / 2);
    filaRio0 = ys[rioJ] + 2;
    filaRio1 = ys[rioJ + 1] - 1;
    let total = 0;
    for (let i = 0; i < xs.length; i++) {
      puente[i] = rng() < C.puentes;
      if (i === xs.length - 1 || i === Math.floor(xs.length / 2)) puente[i] = true;
      if (puente[i]) total++;
    }
    if (total < 2) puente[0] = true;

    // Manzanas
    const lista = [];
    for (let j = 0; j < ys.length - 1; j++) {
      if (j === rioJ) continue;
      for (let i = 0; i < xs.length - 1; i++) {
        lista.push({ i, j, x0: xs[i] + 2, x1: xs[i + 1] - 1, y0: ys[j] + 2, y1: ys[j + 1] - 1, tipo: 'edificios' });
      }
    }
    elegirEspeciales(lista);
    for (const m of lista) llenarManzana(m);
    manzanas.push(...lista);

    // Río (va encima de todo lo demás)
    for (let y = filaRio0; y <= filaRio1; y++) {
      const orilla = y === filaRio0 || y === filaRio1;
      for (let x = 0; x < N; x++) {
        const k = idx(x, y);
        deco[k] = 0;
        idEdificio[k] = -1;
        via[k] = 0;
        suelo[k] = orilla && x >= 1 && x <= xCosta + 2 ? TIPO.ACERA : TIPO.AGUA;
      }
      for (let i = 0; i < xs.length; i++) {
        if (!puente[i]) continue;
        for (const x of [xs[i], xs[i] + 1]) {
          suelo[idx(x, y)] = orilla ? TIPO.CALLE : TIPO.PUENTE;
          via[idx(x, y)] = 1;
        }
      }
    }

    // Pasos de cebra junto a los cruces
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const k = idx(x, y);
        const v = via[k] & 3;
        if (suelo[k] !== TIPO.CALLE || (v !== 1 && v !== 2)) continue;
        for (const [dx, dy] of DIRS) {
          if ((viaEn(x + dx, y + dy) & 3) === 3) { via[k] |= 4; break; }
        }
      }
    }

    // Palmeras en la playa
    for (let y = 2; y < N - 2; y++) {
      for (let x = xCosta + 4; x < N - 7; x++) {
        if (tipoEn(x, y) === TIPO.ARENA && rng() < 0.08) deco[idx(x, y)] = DECO.PALMERA;
      }
    }

    colocarLamparas();
    buscarParadas();
    // Por si la ciudad es tan chica que no cupieron todos los lugares especiales
    const respaldo = paradas.length ? { x: paradas[0].x, y: paradas[0].y } : { x: 1.5 * T, y: 1.5 * T };
    for (const k of ['inicio', 'comisaria', 'taxi', 'almacen', 'taller', 'carrera']) {
      if (!lugares[k]) lugares[k] = { x: respaldo.x, y: respaldo.y };
    }
  }

  function elegirEspeciales(lista) {
    const cx = N / 2;
    const cy = N / 2;
    const centro = (m) => Math.hypot((m.x0 + m.x1) / 2 - cx, (m.y0 + m.y1) / 2 - cy);
    const libres = lista.slice().sort((a, b) => centro(a) - centro(b));
    const tomados = [];
    function tomar(filtro) {
      for (let k = 0; k < libres.length; k++) {
        const m = libres[k];
        if (!filtro(m)) continue;
        if (tomados.some((o) => Math.hypot(o.x0 - m.x0, o.y0 - m.y0) < 9)) continue;
        libres.splice(k, 1);
        tomados.push(m);
        return m;
      }
      if (!libres.length) return null;
      const m = libres.shift();
      tomados.push(m);
      return m;
    }
    const asignar = (tipo) => { const m = tomar(() => true); if (m) m.tipo = tipo; };
    asignar('comisaria');
    asignar('hogar');
    // Puerto (frente al río, lo más cerca del mar) y aeropuerto (lo más lejos del centro)
    const puertoM = libres.filter((m) => m.j === rioJ - 1 || m.j === rioJ + 1).sort((a, b) => b.i - a.i)[0];
    if (puertoM) { puertoM.tipo = 'puerto'; libres.splice(libres.indexOf(puertoM), 1); tomados.push(puertoM); }
    const aeroM = libres.slice().sort((a, b) => centro(b) - centro(a)).find((m) => !tomados.some((o) => Math.hypot(o.x0 - m.x0, o.y0 - m.y0) < 9));
    if (aeroM) { aeroM.tipo = 'aeropuerto'; libres.splice(libres.indexOf(aeroM), 1); tomados.push(aeroM); }
    // Los demás lugares especiales, revueltos por la ciudad
    for (let k = libres.length - 1; k > 0; k--) {
      const r = Math.floor(rng() * (k + 1));
      [libres[k], libres[r]] = [libres[r], libres[k]];
    }
    for (const t of ['taxis', 'almacen', 'taller', 'carrera']) asignar(t);
    for (const m of libres) {
      const r = rng();
      if (r < C.probParque) m.tipo = 'parque';
      else if (r < C.probParque + C.probEstacionamiento) m.tipo = 'estacionamiento';
      else if (r < C.probParque + C.probEstacionamiento + C.probPlaza) m.tipo = 'plaza';
    }
  }

  function dividir(x, y, w, h, out) {
    const area = w * h;
    if ((w <= 3 && h <= 3) || (area <= 9 && rng() < 0.6) || (area <= 16 && rng() < 0.3)) {
      out.push({ x, y, w, h });
      return;
    }
    if (w >= h && w >= 4) {
      const s = rInt(2, w - 2);
      dividir(x, y, s, h, out);
      dividir(x + s, y, w - s, h, out);
    } else if (h >= 4) {
      const s = rInt(2, h - 2);
      dividir(x, y, w, s, out);
      dividir(x, y + s, w, h - s, out);
    } else {
      out.push({ x, y, w, h });
    }
  }

  const TEXTOS_NEON = ['BAR', 'PIZZA', 'CINE', 'HOTEL', 'DISCO', 'TACOS', 'ARCADE', 'SUSHI', 'CAFÉ',
    'GYM', 'RADIO', 'JUGOS', 'HELADOS', 'LIBROS', 'MODA', 'KARAOKE', 'PAN', 'MANGO'];

  function crearEdificio(x, y, w, h, op) {
    op = op || {};
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        poner(xx, yy, TIPO.EDIFICIO);
        idEdificio[idx(xx, yy)] = edificios.length;
      }
    }
    let techo = op.techo;
    if (!techo) {
      const opciones = ['plano', 'plano', 'plano', 'plano', 'jardin', 'solar', 'piscina', 'tragaluz'];
      if (w >= 3 && h >= 3) opciones.push('helipuerto');
      techo = rElegir(opciones);
    }
    const b = {
      x, y, w, h,
      color: op.color || rElegir(COL.edificios),
      pisos: op.pisos || rInt(1, 6),
      techo,
      letrero: op.letrero || null,
      neon: null,
      semilla: rInt(1, 1e9),
    };
    if (!b.letrero && rng() < 0.32) b.neon = { texto: rElegir(TEXTOS_NEON), color: rElegir(COL.neon) };
    edificios.push(b);
    return b;
  }

  function filasEstacionamiento(ix0, iy0, ix1, iy1, tipoCarro) {
    for (let y = iy0; y <= iy1; y++) {
      const r = (y - iy0) % 3;
      for (let x = ix0; x <= ix1; x++) {
        poner(x, y, TIPO.PARKING);
        if (r === 1) continue; // pasillo
        via[idx(x, y)] |= 16;
        espacios.push({
          x: x * T + T / 2, y: y * T + T / 2,
          ang: r === 0 ? Math.PI / 2 : -Math.PI / 2,
          tipo: tipoCarro || null,
          carro: null,
          espera: 0,
        });
      }
    }
  }

  function llenarManzana(m) {
    const { x0, y0, x1, y1 } = m;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) poner(x, y, TIPO.ACERA);
    const ix0 = x0 + 1, iy0 = y0 + 1, ix1 = x1 - 1, iy1 = y1 - 1;
    const iw = ix1 - ix0 + 1, ih = iy1 - iy0 + 1;
    const mx = ix0 + Math.floor(iw / 2);
    const my = iy0 + Math.floor(ih / 2);
    const frente = { x: (Math.floor((x0 + x1) / 2) + 0.5) * T, y: (y1 + 0.5) * T };

    switch (m.tipo) {
      case 'parque': {
        for (let y = iy0; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) poner(x, y, TIPO.PASTO);
        const cruzV = iw >= 5, cruzH = ih >= 5;
        if (cruzV) for (let y = iy0; y <= iy1; y++) poner(mx, y, TIPO.PLAZA);
        if (cruzH) for (let x = ix0; x <= ix1; x++) poner(x, my, TIPO.PLAZA);
        if (cruzV && cruzH) deco[idx(mx, my)] = DECO.FUENTE;
        else if (iw >= 4 && ih >= 4 && rng() < 0.6) {
          // Estanque
          const px = rng() < 0.5 ? ix0 + 1 : ix1 - 2;
          const py = rng() < 0.5 ? iy0 + 1 : iy1 - 2;
          for (let y = py; y < py + 2; y++) for (let x = px; x < px + 2; x++) poner(x, y, TIPO.AGUA);
        }
        for (let y = iy0; y <= iy1; y++) {
          for (let x = ix0; x <= ix1; x++) {
            const k = idx(x, y);
            if (suelo[k] === TIPO.PASTO && rng() < C.probArbol) deco[k] = DECO.ARBOL;
            else if (suelo[k] === TIPO.PLAZA && !deco[k] && rng() < 0.18) deco[k] = DECO.BANCA;
          }
        }
        break;
      }
      case 'plaza': {
        for (let y = iy0; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) poner(x, y, TIPO.PLAZA);
        deco[idx(mx, my)] = DECO.FUENTE;
        for (const [x, y] of [[ix0, iy0], [ix1, iy0], [ix0, iy1], [ix1, iy1]]) deco[idx(x, y)] = DECO.ARBOL;
        for (let k = 0; k < 4; k++) {
          const x = ix0 + 1 + Math.floor(rng() * Math.max(1, iw - 2));
          const y = iy0 + 1 + Math.floor(rng() * Math.max(1, ih - 2));
          if (!deco[idx(x, y)]) deco[idx(x, y)] = DECO.BANCA;
        }
        break;
      }
      case 'estacionamiento':
      case 'hogar':
        filasEstacionamiento(ix0, iy0, ix1, iy1, null);
        if (m.tipo === 'hogar') {
          lugares.inicio = frente;
          // El espacio más cercano a la entrada tiene un deportivo esperándote
          let mejor = null, dm = Infinity;
          for (const e of espacios) {
            const d = Math.hypot(e.x - frente.x, e.y - frente.y);
            if (d < dm) { dm = d; mejor = e; }
          }
          if (mejor) mejor.tipo = 'deportivo';
        }
        break;
      case 'comisaria': {
        const hb = Math.max(2, Math.floor(ih / 2));
        crearEdificio(ix0, iy0, iw, hb, { color: '#2d4f9e', letrero: 'POLICÍA', techo: 'helipuerto', pisos: 4 });
        filasEstacionamiento(ix0, iy0 + hb, ix1, iy1, 'policia');
        lugares.comisaria = frente;
        break;
      }
      case 'almacen': {
        const hb = Math.max(2, ih - 2);
        crearEdificio(ix0, iy0, iw, hb, { color: '#b0703a', letrero: 'ALMACÉN', techo: 'tragaluz', pisos: 2 });
        for (let y = iy0 + hb; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) poner(x, y, TIPO.PLAZA);
        lugares.almacen = frente;
        break;
      }
      case 'taxis': {
        const desde = espacios.length;
        filasEstacionamiento(ix0, iy0, ix1, iy1, 'taxi');
        // Oficina de taxis en una esquina
        for (let k = espacios.length - 1; k >= desde; k--) {
          const e = espacios[k];
          const tx = Math.floor(e.x / T), ty = Math.floor(e.y / T);
          if (tx <= ix0 + 1 && ty <= iy0 + 1) espacios.splice(k, 1);
        }
        for (let y = iy0; y <= iy0 + 1; y++) for (let x = ix0; x <= ix0 + 1; x++) via[idx(x, y)] &= ~16;
        crearEdificio(ix0, iy0, 2, 2, { color: '#e8b400', letrero: 'TAXIS', techo: 'plano', pisos: 2 });
        lugares.taxi = frente;
        break;
      }
      case 'taller': {
        const hb = Math.max(2, Math.ceil(ih / 2));
        crearEdificio(ix0, iy0, iw, hb, { color: '#3e8e5a', letrero: 'TALLER', techo: 'plano', pisos: 2 });
        for (let y = iy0 + hb; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) poner(x, y, TIPO.PLAZA);
        lugares.taller = { x: (mx + 0.5) * T, y: (iy0 + hb + Math.floor((ih - hb) / 2) + 0.5) * T };
        break;
      }
      case 'puerto': {
        for (let y = iy0; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) poner(x, y, TIPO.PLAZA);
        const alRio = m.j === rioJ - 1 ? 1 : -1;       // 1 = el río queda al sur
        const cols = ['#c0392b', '#2980b9', '#e67e22', '#27ae60', '#8e44ad', '#d4ac0d'];
        const lejos = alRio === 1 ? iy0 : iy1;
        for (let k = 0; k < Math.max(1, Math.floor(ih / 2)); k++) {
          const yy = lejos + (alRio === 1 ? 1 : -1) * k * 2;
          if (yy < iy0 || yy > iy1 || k > 1) continue;
          for (let xx = ix0; xx + 1 <= ix1; xx += 3) crearEdificio(xx, yy, 2, 1, { color: cols[Math.floor(rng() * cols.length)], techo: 'plano', pisos: 1 });
        }
        lugares.puerto = { x: (mx + 0.5) * T, y: (my + 0.5) * T, x0: ix0 * T, y0: iy0 * T, x1: (ix1 + 1) * T, y1: (iy1 + 1) * T, alRio };
        break;
      }
      case 'aeropuerto': {
        for (let y = iy0; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) poner(x, y, TIPO.PLAZA);
        crearEdificio(ix0, iy0, Math.max(2, Math.min(4, iw - 1)), 2, { color: '#8d99ae', letrero: 'HANGAR', techo: 'plano', pisos: 2 });
        lugares.aeropuerto = { x: (mx + 0.5) * T, y: (my + 0.5) * T, x0: ix0 * T, y0: iy0 * T, x1: (ix1 + 1) * T, y1: (iy1 + 1) * T };
        break;
      }
      default: {
        const hojas = [];
        dividir(ix0, iy0, iw, ih, hojas);
        for (const h of hojas) {
          if (h.w * h.h <= 6 && rng() < 0.18) {
            for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) poner(x, y, TIPO.PLAZA);
            deco[idx(h.x, h.y)] = DECO.ARBOL;
          } else {
            crearEdificio(h.x, h.y, h.w, h.h);
          }
        }
        if (m.tipo === 'carrera') lugares.carrera = frente;
      }
    }
  }

  function colocarLamparas() {
    const d = 22;
    for (const m of manzanas) {
      const { x0, y0, x1, y1 } = m;
      const centro = (x, y) => [x * T + T / 2, y * T + T / 2];
      const agregar = (x, y, ox, oy) => {
        const [cx, cy] = centro(x, y);
        lamparas.push({ x: cx + ox, y: cy + oy });
      };
      agregar(x0, y0, -d * 0.8, -d * 0.8);
      agregar(x1, y0, d * 0.8, -d * 0.8);
      agregar(x0, y1, -d * 0.8, d * 0.8);
      agregar(x1, y1, d * 0.8, d * 0.8);
      for (let x = x0 + 4; x <= x1 - 3; x += 4) { agregar(x, y0, 0, -d); agregar(x, y1, 0, d); }
      for (let y = y0 + 4; y <= y1 - 3; y += 4) { agregar(x0, y, -d, 0); agregar(x1, y, d, 0); }
    }
    for (let x = 2; x <= xCosta + 2; x += 4) {
      if (tipoEn(x, filaRio0) === TIPO.ACERA) lamparas.push({ x: x * T + T / 2, y: filaRio0 * T + T / 2 + d });
      if (tipoEn(x, filaRio1) === TIPO.ACERA) lamparas.push({ x: x * T + T / 2, y: filaRio1 * T + T / 2 - d });
    }
    for (let y = 3; y < N - 2; y += 4) {
      if (tipoEn(xCosta + 2, y) === TIPO.ACERA) lamparas.push({ x: (xCosta + 2) * T + T / 2 - d, y: y * T + T / 2 });
    }
  }

  function buscarParadas() {
    for (let y = 1; y < N - 1; y++) {
      for (let x = 1; x < N - 1; x++) {
        if (suelo[idx(x, y)] !== TIPO.ACERA) continue;
        for (const [dx, dy] of DIRS) {
          const k = idx(x + dx, y + dy);
          const v = via[k];
          if (suelo[k] === TIPO.CALLE && (v & 3) !== 3 && !(v & 4)) {
            paradas.push({
              x: x * T + T / 2, y: y * T + T / 2,
              px: x * T + T / 2 + dx * T * 0.8, py: y * T + T / 2 + dy * T * 0.8,
            });
            break;
          }
        }
      }
    }
  }

  // ----------------------------------------------------------- Consultas
  function solidoCasilla(tx, ty) {
    if (!dentro(tx, ty)) return true;
    const s = suelo[idx(tx, ty)];
    return s === TIPO.EDIFICIO || s === TIPO.AGUA || s === TIPO.BORDE;
  }

  function radioDeco(tx, ty) {
    const d = decoEn(tx, ty);
    if (d === DECO.ARBOL) return 20;
    if (d === DECO.PALMERA) return 11;
    if (d === DECO.FUENTE) return 29;
    return 0;
  }

  // Empuja un círculo fuera de paredes, agua y árboles.
  // Devuelve en "res": nueva posición, si chocó y la dirección del empujón.
  function resolverCirculo(x, y, r, res) {
    let hit = false, sx = 0, sy = 0;
    const tx0 = Math.floor((x - r) / T), tx1 = Math.floor((x + r) / T);
    const ty0 = Math.floor((y - r) / T), ty1 = Math.floor((y + r) / T);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (solidoCasilla(tx, ty)) {
          const bx = tx * T, by = ty * T;
          const cx = Util.limitar(x, bx, bx + T), cy = Util.limitar(y, by, by + T);
          const dx = x - cx, dy = y - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 >= r * r) continue;
          let nx, ny, pen;
          if (d2 > 1e-6) {
            const d = Math.sqrt(d2);
            nx = dx / d; ny = dy / d; pen = r - d;
          } else {
            const op = [[x - bx, -1, 0], [bx + T - x, 1, 0], [y - by, 0, -1], [by + T - y, 0, 1]];
            op.sort((a, b) => a[0] - b[0]);
            pen = op[0][0] + r; nx = op[0][1]; ny = op[0][2];
          }
          x += nx * pen; y += ny * pen;
          sx += nx * pen; sy += ny * pen;
          hit = true;
        } else {
          const dr = radioDeco(tx, ty);
          if (!dr) continue;
          const cx = tx * T + T / 2, cy = ty * T + T / 2;
          const dx = x - cx, dy = y - cy;
          const d2 = dx * dx + dy * dy;
          const rr = r + dr;
          if (d2 >= rr * rr) continue;
          const d = Math.sqrt(d2) || 0.01;
          const pen = rr - d;
          const nx = d2 > 0 ? dx / d : 1, ny = d2 > 0 ? dy / d : 0;
          x += nx * pen; y += ny * pen;
          sx += nx * pen; sy += ny * pen;
          hit = true;
        }
      }
    }
    res.x = x; res.y = y; res.hit = hit;
    const l = Math.hypot(sx, sy) || 1;
    res.nx = sx / l; res.ny = sy / l;
    res.pen = Math.hypot(sx, sy);
    return res;
  }

  // ¿Se puede ver (o manejar en línea recta) de un punto a otro?
  function lineaLibre(x0, y0, x1, y1, ancho) {
    const dx = x1 - x0, dy = y1 - y0;
    const d = Math.hypot(dx, dy);
    if (d < 1) return true;
    const n = Math.ceil(d / 26);
    const px = -dy / d * (ancho || 0), py = dx / d * (ancho || 0);
    for (let k = 1; k < n; k++) {
      const x = x0 + dx * k / n, y = y0 + dy * k / n;
      if (solidoCasilla(Math.floor(x / T), Math.floor(y / T))) return false;
      if (ancho) {
        if (solidoCasilla(Math.floor((x + px) / T), Math.floor((y + py) / T))) return false;
        if (solidoCasilla(Math.floor((x - px) / T), Math.floor((y - py) / T))) return false;
      }
    }
    return true;
  }

  function caminable(tx, ty) {
    if (!dentro(tx, ty)) return false;
    const s = suelo[idx(tx, ty)];
    if (s !== TIPO.ACERA && s !== TIPO.PLAZA) return false;
    const d = deco[idx(tx, ty)];
    return d !== DECO.ARBOL && d !== DECO.FUENTE && d !== DECO.PALMERA;
  }

  function esCalle(tx, ty) {
    const s = tipoEn(tx, ty);
    return s === TIPO.CALLE || s === TIPO.PUENTE;
  }

  function superficie(x, y) {
    return tipoEn(Math.floor(x / T), Math.floor(y / T));
  }

  // Carril en una casilla de calle (no cruce): posición, dirección y el siguiente cruce
  function carrilEn(tx, ty) {
    if (!esCalle(tx, ty)) return null;
    const v = via[idx(tx, ty)] & 3;
    if (v === 1) {
      const i = colVia[tx];
      if (i < 0) return null;
      const izq = xs[i] === tx;
      const dir = izq ? 1 : 3;
      let j = -1;
      if (dir === 1) j = ys.findIndex((yy) => yy > ty);
      else for (let k = ys.length - 1; k >= 0; k--) if (ys[k] + 1 < ty) { j = k; break; }
      if (j < 0) return null;
      return { x: (xs[i] + 1) * T + (izq ? -T / 2 : T / 2), y: ty * T + T / 2, dir, i, j };
    }
    if (v === 2) {
      const j = filaVia[ty];
      if (j < 0) return null;
      const arriba = ys[j] === ty;
      const dir = arriba ? 2 : 0;
      let i = -1;
      if (dir === 0) i = xs.findIndex((xx) => xx > tx);
      else for (let k = xs.length - 1; k >= 0; k--) if (xs[k] + 1 < tx) { i = k; break; }
      if (i < 0) return null;
      return { x: tx * T + T / 2, y: (ys[j] + 1) * T + (arriba ? -T / 2 : T / 2), dir, i, j };
    }
    return null;
  }

  // Busca un carril al azar a cierta distancia de un punto
  function carrilAzar(cx, cy, rMin, rMax, filtro) {
    for (let k = 0; k < 40; k++) {
      const a = Math.random() * Math.PI * 2;
      const d = Util.azar(rMin, rMax);
      const tx = Math.floor((cx + Math.cos(a) * d) / T);
      const ty = Math.floor((cy + Math.sin(a) * d) / T);
      const c = carrilEn(tx, ty);
      if (c && (!filtro || filtro(c))) return c;
    }
    return null;
  }

  function aceraAzar(cx, cy, rMin, rMax, filtro) {
    for (let k = 0; k < 40; k++) {
      const a = Math.random() * Math.PI * 2;
      const d = Util.azar(rMin, rMax);
      const tx = Math.floor((cx + Math.cos(a) * d) / T);
      const ty = Math.floor((cy + Math.sin(a) * d) / T);
      if (!caminable(tx, ty)) continue;
      const p = { tx, ty, x: tx * T + T / 2, y: ty * T + T / 2 };
      if (!filtro || filtro(p)) return p;
    }
    return null;
  }

  // ----------------------------------------------------------- Cruces (para que la IA se ubique)
  function centroNodo(i, j) { return { x: (xs[i] + 1) * T, y: (ys[j] + 1) * T }; }

  function existeArista(i, j, d) {
    const i2 = i + DIRS[d][0], j2 = j + DIRS[d][1];
    if (i2 < 0 || j2 < 0 || i2 >= xs.length || j2 >= ys.length) return false;
    if (DIRS[d][1] !== 0 && Math.min(j, j2) === rioJ && !puente[i]) return false;
    return true;
  }

  function salidas(i, j) {
    const s = [];
    for (let d = 0; d < 4; d++) if (existeArista(i, j, d)) s.push(d);
    return s;
  }

  function nodoCercano(x, y) {
    let bi = 0, bj = 0, di = Infinity, dj = Infinity;
    for (let i = 0; i < xs.length; i++) {
      const d = Math.abs((xs[i] + 1) * T - x);
      if (d < di) { di = d; bi = i; }
    }
    for (let j = 0; j < ys.length; j++) {
      const d = Math.abs((ys[j] + 1) * T - y);
      if (d < dj) { dj = d; bj = j; }
    }
    return { i: bi, j: bj };
  }

  // Camino más corto entre dos cruces (búsqueda a lo ancho)
  function rutaNodos(a, b) {
    const nx = xs.length;
    const total = nx * ys.length;
    const prev = new Int16Array(total).fill(-1);
    const visto = new Uint8Array(total);
    const ka = a.i + a.j * nx, kb = b.i + b.j * nx;
    const cola = [ka];
    visto[ka] = 1;
    let cab = 0;
    while (cab < cola.length) {
      const k = cola[cab++];
      if (k === kb) break;
      const i = k % nx, j = (k / nx) | 0;
      for (let d = 0; d < 4; d++) {
        if (!existeArista(i, j, d)) continue;
        const k2 = (i + DIRS[d][0]) + (j + DIRS[d][1]) * nx;
        if (visto[k2]) continue;
        visto[k2] = 1;
        prev[k2] = k;
        cola.push(k2);
      }
    }
    if (!visto[kb]) return null;
    const ruta = [];
    for (let k = kb; k !== -1; k = prev[k]) {
      ruta.push({ i: k % nx, j: (k / nx) | 0 });
      if (k === ka) break;
    }
    return ruta.reverse();
  }

  // ----------------------------------------------------------- Dibujo de casillas
  function pintarSuelo(g, x, y) {
    const k = idx(x, y);
    const t = suelo[k];
    const px = x * T, py = y * T;
    const h = (n) => Util.hash(x, y, n);
    switch (t) {
      case TIPO.CALLE:
      case TIPO.PUENTE: {
        const v = via[k];
        g.fillStyle = t === TIPO.PUENTE ? '#4f535c' : ((v & 3) === 3 ? COL.cruce : COL.asfalto);
        g.fillRect(px, py, T, T);
        g.fillStyle = 'rgba(0,0,0,0.13)';
        for (let n = 0; n < 3; n++) {
          if (h(n) < 0.55) g.fillRect(px + h(n + 10) * (T - 10), py + h(n + 20) * (T - 6), 4 + h(n + 30) * 8, 2 + h(n + 40) * 3);
        }
        if ((v & 3) === 3 && h(5) < 0.25) {
          // Tapa de alcantarilla
          g.fillStyle = '#2c2e34';
          g.beginPath(); g.arc(px + 20 + h(6) * 24, py + 20 + h(7) * 24, 7, 0, Math.PI * 2); g.fill();
        }
        pintarMarcas(g, x, y, v, t === TIPO.PUENTE);
        break;
      }
      case TIPO.ACERA: {
        g.fillStyle = COL.acera;
        g.fillRect(px, py, T, T);
        g.fillStyle = 'rgba(0,0,0,0.07)';
        for (let n = 16; n < T; n += 16) {
          g.fillRect(px + n, py, 1, T);
          g.fillRect(px, py + n, T, 1);
        }
        if (h(3) < 0.1) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(px + 16 * Math.floor(h(4) * 4), py + 16 * Math.floor(h(5) * 4), 16, 16); }
        // Bordillo hacia la calle y barandal hacia el agua
        for (let d = 0; d < 4; d++) {
          const [dx, dy] = DIRS[d];
          const vecino = tipoEn(x + dx, y + dy);
          if (vecino === TIPO.CALLE || vecino === TIPO.PUENTE) {
            g.fillStyle = COL.bordillo;
            borde(g, px, py, d, 4);
            g.fillStyle = 'rgba(255,255,255,0.25)';
            borde(g, px, py, d, 1, 4);
          } else if (vecino === TIPO.AGUA) {
            barandal(g, px, py, d);
          }
        }
        break;
      }
      case TIPO.PASTO: {
        g.fillStyle = COL.pasto;
        g.fillRect(px, py, T, T);
        for (let n = 0; n < 4; n++) {
          g.fillStyle = h(n + 50) < 0.5 ? 'rgba(0,40,0,0.12)' : 'rgba(255,255,160,0.07)';
          g.beginPath();
          g.arc(px + h(n) * T, py + h(n + 8) * T, 6 + h(n + 16) * 10, 0, Math.PI * 2);
          g.fill();
        }
        if (h(60) < 0.18) {
          const colores = ['#ffd23d', '#ff7aa8', '#ffffff', '#b98cff'];
          for (let n = 0; n < 4; n++) {
            g.fillStyle = colores[Math.floor(h(70 + n) * 4)];
            g.fillRect(px + 8 + h(80 + n) * (T - 16), py + 8 + h(90 + n) * (T - 16), 3, 3);
          }
        }
        break;
      }
      case TIPO.AGUA: {
        g.fillStyle = COL.agua;
        g.fillRect(px, py, T, T);
        g.strokeStyle = 'rgba(160,215,255,0.35)';
        g.lineWidth = 2;
        for (let n = 0; n < 2; n++) {
          const wx = px + 8 + h(n) * (T - 28), wy = py + 10 + h(n + 5) * (T - 20);
          g.beginPath();
          g.moveTo(wx, wy);
          g.quadraticCurveTo(wx + 6, wy - 4, wx + 12, wy);
          g.quadraticCurveTo(wx + 18, wy + 4, wx + 24, wy);
          g.stroke();
        }
        for (let d = 0; d < 4; d++) {
          const [dx, dy] = DIRS[d];
          const vecino = tipoEn(x + dx, y + dy);
          if (dentro(x + dx, y + dy) && vecino !== TIPO.AGUA && vecino !== TIPO.PUENTE) {
            g.fillStyle = 'rgba(220,240,255,0.45)';
            borde(g, px, py, d, 4);
          }
        }
        break;
      }
      case TIPO.ARENA: {
        g.fillStyle = COL.arena;
        g.fillRect(px, py, T, T);
        g.fillStyle = 'rgba(150,110,40,0.18)';
        for (let n = 0; n < 7; n++) g.fillRect(px + h(n) * T, py + h(n + 9) * T, 2, 2);
        if (tipoEn(x + 1, y) === TIPO.AGUA) {
          g.fillStyle = 'rgba(120,90,40,0.22)';
          g.fillRect(px + T - 18, py, 18, T);
        }
        break;
      }
      case TIPO.PLAZA: {
        g.fillStyle = COL.plaza;
        g.fillRect(px, py, T, T);
        g.fillStyle = 'rgba(80,60,30,0.12)';
        for (let n = 0; n < T; n += 32) {
          g.fillRect(px + n, py, 1, T);
          g.fillRect(px, py + n + ((x & 1) ? 16 : 0), T, 1);
        }
        break;
      }
      case TIPO.PARKING: {
        g.fillStyle = COL.estacionamiento;
        g.fillRect(px, py, T, T);
        if (via[k] & 16) {
          g.fillStyle = 'rgba(255,255,255,0.75)';
          g.fillRect(px, py + 4, 3, T - 8);
          g.fillRect(px + T - 3, py + 4, 3, T - 8);
        }
        break;
      }
      case TIPO.BORDE: {
        g.fillStyle = '#24502c';
        g.fillRect(px, py, T, T);
        for (let n = 0; n < 5; n++) {
          g.fillStyle = n % 2 ? '#2f6b39' : '#1c4224';
          g.beginPath();
          g.arc(px + h(n) * T, py + h(n + 7) * T, 12 + h(n + 3) * 12, 0, Math.PI * 2);
          g.fill();
        }
        break;
      }
      case TIPO.EDIFICIO:
      default:
        g.fillStyle = COL.callejon;
        g.fillRect(px, py, T, T);
    }
  }

  // Rectángulo pegado a un lado de la casilla (d = dirección del lado)
  function borde(g, px, py, d, grosor, desde) {
    const o = desde || 0;
    if (d === 0) g.fillRect(px + T - grosor - o, py, grosor, T);
    else if (d === 2) g.fillRect(px + o, py, grosor, T);
    else if (d === 1) g.fillRect(px, py + T - grosor - o, T, grosor);
    else g.fillRect(px, py + o, T, grosor);
  }

  function barandal(g, px, py, d) {
    g.fillStyle = '#d5d8de';
    borde(g, px, py, d, 5);
    g.fillStyle = '#7b8089';
    for (let n = 4; n < T; n += 16) {
      if (d === 0 || d === 2) g.fillRect(d === 0 ? px + T - 7 : px, py + n, 7, 4);
      else g.fillRect(px + n, d === 1 ? py + T - 7 : py, 4, 7);
    }
  }

  function pintarMarcas(g, x, y, v, esPuente) {
    const px = x * T, py = y * T;
    const tipo = v & 3;
    if (tipo === 1) {
      const i = colVia[x];
      const izq = i >= 0 && xs[i] === x;
      if (esPuente) {
        const lado = izq ? 2 : 0;
        if (tipoEn(x + (izq ? -1 : 1), y) === TIPO.AGUA) barandal(g, px, py, lado);
      }
      if (v & 4) {
        g.fillStyle = 'rgba(240,240,240,0.85)';
        for (let n = 6; n < T - 4; n += 14) g.fillRect(px + n, py + 10, 7, T - 20);
      } else {
        if (izq) {
          g.fillStyle = COL.linea;
          for (let n = 0; n < T; n += 32) g.fillRect(px + T - 2, py + n + 7, 4, 18);
        }
        g.fillStyle = 'rgba(255,255,255,0.3)';
        g.fillRect(izq ? px + (esPuente ? 9 : 5) : px + T - (esPuente ? 11 : 7), py, 2, T);
      }
    } else if (tipo === 2) {
      const j = filaVia[y];
      const arriba = j >= 0 && ys[j] === y;
      if (v & 4) {
        g.fillStyle = 'rgba(240,240,240,0.85)';
        for (let n = 6; n < T - 4; n += 14) g.fillRect(px + 10, py + n, T - 20, 7);
      } else {
        if (arriba) {
          g.fillStyle = COL.linea;
          for (let n = 0; n < T; n += 32) g.fillRect(px + n + 7, py + T - 2, 18, 4);
        }
        g.fillStyle = 'rgba(255,255,255,0.3)';
        g.fillRect(px, arriba ? py + 5 : py + T - 7, T, 2);
      }
    }
  }

  // ----------------------------------------------------------- Edificios
  function pintarSombraEdificio(g, b) {
    const s = 5 + b.pisos * 3.5;
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(b.x * T + 3 + s, b.y * T + 3 + s, b.w * T - 6, b.h * T - 6);
  }

  function pintarEdificio(g, b) {
    const r = Util.crearAleatorio(b.semilla);
    const bx = b.x * T + 3, by = b.y * T + 3, bw = b.w * T - 6, bh = b.h * T - 6;
    g.fillStyle = Util.tono(b.color, 0.22);
    g.fillRect(bx, by, bw, bh);
    g.fillStyle = b.color;
    g.fillRect(bx + 6, by + 6, bw - 12, bh - 12);
    g.strokeStyle = 'rgba(0,0,0,0.22)';
    g.lineWidth = 2;
    g.strokeRect(bx + 7, by + 7, bw - 14, bh - 14);
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);

    const ix = bx + 12, iy = by + 12, iw = bw - 24, ih = bh - 24;
    const enAzar = (w, h) => [ix + r() * Math.max(0, iw - w), iy + r() * Math.max(0, ih - h)];

    switch (b.techo) {
      case 'jardin': {
        g.fillStyle = '#5aa45e';
        g.fillRect(ix - 2, iy - 2, iw + 4, ih + 4);
        for (let n = 0; n < 6; n++) {
          const [cx, cy] = enAzar(0, 0);
          g.fillStyle = n % 2 ? '#3f8a45' : '#77c06f';
          g.beginPath(); g.arc(cx, cy, 5 + r() * 6, 0, Math.PI * 2); g.fill();
        }
        break;
      }
      case 'solar': {
        g.fillStyle = '#1f3b73';
        for (let y = iy; y + 12 <= iy + ih; y += 16) {
          for (let x = ix; x + 18 <= ix + iw; x += 22) {
            g.fillRect(x, y, 18, 12);
          }
        }
        g.fillStyle = 'rgba(160,200,255,0.35)';
        for (let y = iy; y + 12 <= iy + ih; y += 16) g.fillRect(ix, y + 6, iw, 1);
        break;
      }
      case 'piscina': {
        const w = Math.min(iw * 0.7, 70), h = Math.min(ih * 0.6, 44);
        const [x, y] = enAzar(w, h);
        g.fillStyle = '#ffffff';
        Util.rectRedondo(g, x - 3, y - 3, w + 6, h + 6, 8); g.fill();
        g.fillStyle = '#4fd1e8';
        Util.rectRedondo(g, x, y, w, h, 6); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.4)';
        g.fillRect(x + 5, y + h * 0.3, w - 10, 2);
        break;
      }
      case 'tragaluz': {
        g.fillStyle = 'rgba(170,220,255,0.75)';
        for (let y = iy + 2; y + 12 <= iy + ih; y += 22) {
          for (let x = ix + 2; x + 14 <= ix + iw; x += 22) g.fillRect(x, y, 14, 12);
        }
        break;
      }
      case 'helipuerto': {
        const cx = bx + bw / 2, cy = by + bh / 2;
        const rr = Math.min(bw, bh) * 0.3;
        g.fillStyle = '#3b3f47';
        g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#ffd23d';
        g.lineWidth = 3;
        g.beginPath(); g.arc(cx, cy, rr - 4, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#ffffff';
        g.font = `800 ${Math.round(rr)}px ${FUENTE_TEXTO}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('H', cx, cy + 1);
        break;
      }
      default: {
        // Aires acondicionados, tinacos y la casita de la escalera
        const n = 1 + Math.floor(r() * 3);
        for (let k = 0; k < n; k++) {
          const [x, y] = enAzar(18, 14);
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.fillRect(x + 3, y + 3, 18, 14);
          g.fillStyle = '#c9ccd2';
          g.fillRect(x, y, 18, 14);
          g.fillStyle = '#868b95';
          g.beginPath(); g.arc(x + 9, y + 7, 5, 0, Math.PI * 2); g.fill();
        }
        if (r() < 0.55) {
          const [x, y] = enAzar(20, 20);
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.beginPath(); g.arc(x + 13, y + 13, 10, 0, Math.PI * 2); g.fill();
          g.fillStyle = r() < 0.5 ? '#4a4f5a' : '#8b6b4a';
          g.beginPath(); g.arc(x + 10, y + 10, 10, 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.3)';
          g.lineWidth = 2;
          g.beginPath(); g.arc(x + 10, y + 10, 6, 0, Math.PI * 2); g.stroke();
        }
        if (r() < 0.6) {
          const [x, y] = enAzar(22, 18);
          g.fillStyle = 'rgba(0,0,0,0.3)';
          g.fillRect(x + 4, y + 4, 22, 18);
          g.fillStyle = Util.tono(b.color, -0.25);
          g.fillRect(x, y, 22, 18);
        }
      }
    }

    if (b.letrero) {
      const tam = Math.min(24, (bw - 16) / (b.letrero.length * 0.72));
      g.font = `800 ${Math.round(tam)}px ${FUENTE_TEXTO}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const ty = b.techo === 'helipuerto' ? by + 18 : by + bh / 2;
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(0,0,0,0.55)';
      g.strokeText(b.letrero, bx + bw / 2, ty);
      g.fillStyle = '#ffffff';
      g.fillText(b.letrero, bx + bw / 2, ty);
    } else if (b.neon) {
      pintarNeon(g, b, false);
    }
  }

  function pintarNeon(g, b, brillando) {
    const bx = b.x * T + 3, by = b.y * T + 3, bw = b.w * T - 6;
    const tam = Math.min(18, (bw - 14) / (b.neon.texto.length * 0.75));
    g.font = `800 ${Math.round(tam)}px ${FUENTE_TEXTO}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const tx = bx + bw / 2, ty = by + 14;
    if (brillando) {
      // Halo de color detrás del letrero
      const ancho = b.neon.texto.length * tam * 0.8 + 16;
      const gr = g.createRadialGradient(tx, ty, 0, tx, ty, ancho * 0.7);
      gr.addColorStop(0, b.neon.color);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 0.45;
      g.fillStyle = gr;
      g.fillRect(tx - ancho * 0.7, ty - ancho * 0.7, ancho * 1.4, ancho * 1.4);
      g.globalAlpha = 1;
      g.shadowColor = b.neon.color;
      g.shadowBlur = 16;
      g.fillStyle = b.neon.color;
      g.fillText(b.neon.texto, tx, ty);
      g.fillText(b.neon.texto, tx, ty);
      g.fillRect(bx + 4, by + 3, bw - 8, 3);
      g.fillRect(bx + 4, by + 3, bw - 8, 3);
      g.shadowBlur = 0;
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.fillText(b.neon.texto, tx, ty);
    } else {
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(tx - b.neon.texto.length * tam * 0.4 - 4, ty - tam * 0.65, b.neon.texto.length * tam * 0.8 + 8, tam * 1.3);
      g.fillStyle = b.neon.color;
      g.fillText(b.neon.texto, tx, ty);
      g.fillRect(bx + 4, by + 3, bw - 8, 3);
    }
  }

  // ----------------------------------------------------------- Decoración
  function pintarSombraDeco(g, x, y) {
    const d = deco[idx(x, y)];
    const cx = x * T + T / 2, cy = y * T + T / 2;
    if (d === DECO.ARBOL || d === DECO.PALMERA) {
      const r = d === DECO.ARBOL ? 22 + Util.hash(x, y, 1) * 6 : 18;
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath(); g.arc(cx + 8, cy + 8, r, 0, Math.PI * 2); g.fill();
    }
  }

  function pintarDeco(g, x, y) {
    const k = idx(x, y);
    const d = deco[k];
    if (!d) return;
    const cx = x * T + T / 2, cy = y * T + T / 2;
    const h = (n) => Util.hash(x, y, n);
    if (d === DECO.ARBOL) {
      if (suelo[k] === TIPO.PLAZA) {
        g.fillStyle = '#7a5a3a';
        g.fillRect(cx - 16, cy - 16, 32, 32);
        g.fillStyle = '#5b3f25';
        g.fillRect(cx - 13, cy - 13, 26, 26);
      }
      const r = 22 + h(1) * 6;
      const verdes = ['#2f7d3a', '#3a8f3f', '#2a6e44', '#4d9a3a'];
      const v = verdes[Math.floor(h(2) * verdes.length)];
      g.fillStyle = Util.tono(v, -0.25);
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = v;
      g.beginPath(); g.arc(cx - 2, cy - 2, r - 3, 0, Math.PI * 2); g.fill();
      for (let n = 0; n < 4; n++) {
        const a = h(n + 3) * Math.PI * 2;
        g.beginPath(); g.arc(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, r * 0.4, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = 'rgba(255,255,200,0.18)';
      g.beginPath(); g.arc(cx - r * 0.3, cy - r * 0.35, r * 0.5, 0, Math.PI * 2); g.fill();
    } else if (d === DECO.PALMERA) {
      g.save();
      g.translate(cx, cy);
      g.rotate(h(1) * Math.PI);
      g.fillStyle = '#3e9a48';
      for (let n = 0; n < 7; n++) {
        g.rotate(Math.PI * 2 / 7);
        g.beginPath();
        g.ellipse(12, 0, 13, 4.5, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#7d5a32';
      g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill();
      g.restore();
    } else if (d === DECO.FUENTE) {
      g.fillStyle = '#d9d4c7';
      g.beginPath(); g.arc(cx, cy, 30, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5ab8ee';
      g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.55)';
      g.lineWidth = 2;
      g.beginPath(); g.arc(cx, cy, 15, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#d9d4c7';
      g.beginPath(); g.arc(cx, cy, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(cx, cy, 3.5, 0, Math.PI * 2); g.fill();
    } else if (d === DECO.BANCA) {
      const vertical = h(1) < 0.5;
      const w = vertical ? 9 : 26, hh = vertical ? 26 : 9;
      g.fillStyle = 'rgba(0,0,0,0.2)';
      g.fillRect(cx - w / 2 + 3, cy - hh / 2 + 3, w, hh);
      g.fillStyle = '#8b5a2b';
      g.fillRect(cx - w / 2, cy - hh / 2, w, hh);
      g.fillStyle = '#6b4220';
      if (vertical) g.fillRect(cx - 1, cy - hh / 2, 2, hh);
      else g.fillRect(cx - w / 2, cy - 1, w, 2);
    }
  }

  function pintarLampara(g, l) {
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath(); g.arc(l.x + 4, l.y + 4, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2c2f36';
    g.beginPath(); g.arc(l.x, l.y, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff1c2';
    g.beginPath(); g.arc(l.x, l.y, 2.5, 0, Math.PI * 2); g.fill();
  }

  // ----------------------------------------------------------- Chunks
  const CH = 512;                   // tamaño de cada pedazo (8 casillas)
  const CT = CH / T;
  const NCH = Math.ceil(TAM / CH);
  const MAX_CACHE = 42;
  const cache = new Map();
  let cuadroActual = 0;
  let pintadosEsteCuadro = 0;

  function enRango(x0, y0, x1, y1, rx0, ry0, rx1, ry1) {
    return x1 > rx0 && x0 < rx1 && y1 > ry0 && y0 < ry1;
  }

  function pintarChunk(cx, cy) {
    const lienzo = Util.lienzo(CH, CH);
    const g = lienzo.getContext('2d');
    const ox = cx * CH, oy = cy * CH;
    g.translate(-ox, -oy);
    const tx0 = Math.max(0, cx * CT - 1), ty0 = Math.max(0, cy * CT - 1);
    const tx1 = Math.min(N - 1, cx * CT + CT), ty1 = Math.min(N - 1, cy * CT + CT);
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) pintarSuelo(g, x, y);
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) pintarSombraDeco(g, x, y);
    const visibles = edificios.filter((b) => enRango(b.x * T, b.y * T, (b.x + b.w) * T + 30, (b.y + b.h) * T + 30, ox, oy, ox + CH, oy + CH));
    for (const b of visibles) pintarSombraEdificio(g, b);
    for (const b of visibles) pintarEdificio(g, b);
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) pintarDeco(g, x, y);
    for (const l of lamparas) {
      if (l.x > ox - 10 && l.x < ox + CH + 10 && l.y > oy - 10 && l.y < oy + CH + 10) pintarLampara(g, l);
    }

    // Capa de luces de noche (a media resolución)
    let emision = null;
    const neones = visibles.filter((b) => b.neon);
    const luces = lamparas.filter((l) => l.x > ox - 100 && l.x < ox + CH + 100 && l.y > oy - 100 && l.y < oy + CH + 100);
    if (neones.length || luces.length) {
      emision = Util.lienzo(CH / 2, CH / 2);
      const e = emision.getContext('2d');
      e.scale(0.5, 0.5);
      e.translate(-ox, -oy);
      for (const l of luces) {
        const gr = e.createRadialGradient(l.x, l.y, 0, l.x, l.y, 78);
        gr.addColorStop(0, 'rgba(255,190,110,0.3)');
        gr.addColorStop(1, 'rgba(255,160,80,0)');
        e.fillStyle = gr;
        e.fillRect(l.x - 78, l.y - 78, 156, 156);
      }
      for (const b of neones) pintarNeon(e, b, true);
    }
    return { lienzo, emision, uso: cuadroActual };
  }

  function obtenerChunk(cx, cy, urgente) {
    const clave = cx + cy * NCH;
    let c = cache.get(clave);
    if (!c) {
      if (!urgente && pintadosEsteCuadro >= 1) return null;
      c = pintarChunk(cx, cy);
      pintadosEsteCuadro++;
      cache.set(clave, c);
      if (cache.size > MAX_CACHE) {
        let viejo = null, vu = Infinity;
        for (const [k, v] of cache) if (v.uso < vu) { vu = v.uso; viejo = k; }
        if (viejo !== null && vu < cuadroActual) cache.delete(viejo);
      }
    }
    c.uso = cuadroActual;
    return c;
  }

  function rangoChunks(cam) {
    const mw = cam.W / 2 / cam.s, mh = cam.H / 2 / cam.s;
    return {
      cx0: Math.max(0, Math.floor((cam.x - mw) / CH)),
      cx1: Math.min(NCH - 1, Math.floor((cam.x + mw) / CH)),
      cy0: Math.max(0, Math.floor((cam.y - mh) / CH)),
      cy1: Math.min(NCH - 1, Math.floor((cam.y + mh) / CH)),
    };
  }

  // cam = { x, y (centro en el mundo), s (pixeles de pantalla por pixel de mundo), W, H (pantalla) }
  function dibujar(g, cam) {
    cuadroActual++;
    pintadosEsteCuadro = 0;
    const r = rangoChunks(cam);
    for (let cy = r.cy0; cy <= r.cy1; cy++) {
      for (let cx = r.cx0; cx <= r.cx1; cx++) {
        const c = obtenerChunk(cx, cy, true);
        const sx0 = Math.round((cx * CH - cam.x) * cam.s + cam.W / 2);
        const sy0 = Math.round((cy * CH - cam.y) * cam.s + cam.H / 2);
        const sx1 = Math.round(((cx + 1) * CH - cam.x) * cam.s + cam.W / 2);
        const sy1 = Math.round(((cy + 1) * CH - cam.y) * cam.s + cam.H / 2);
        g.drawImage(c.lienzo, sx0, sy0, sx1 - sx0, sy1 - sy0);
      }
    }
    // Prepara de a poquito los pedazos de alrededor
    for (let cy = r.cy0 - 1; cy <= r.cy1 + 1; cy++) {
      for (let cx = r.cx0 - 1; cx <= r.cx1 + 1; cx++) {
        if (cx < 0 || cy < 0 || cx >= NCH || cy >= NCH) continue;
        if (!cache.has(cx + cy * NCH)) { obtenerChunk(cx, cy, false); }
      }
    }
  }

  function dibujarEmision(g, cam, alfa) {
    const r = rangoChunks(cam);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = alfa;
    for (let cy = r.cy0; cy <= r.cy1; cy++) {
      for (let cx = r.cx0; cx <= r.cx1; cx++) {
        const c = cache.get(cx + cy * NCH);
        if (!c || !c.emision) continue;
        const sx0 = Math.round((cx * CH - cam.x) * cam.s + cam.W / 2);
        const sy0 = Math.round((cy * CH - cam.y) * cam.s + cam.H / 2);
        const sx1 = Math.round(((cx + 1) * CH - cam.x) * cam.s + cam.W / 2);
        const sy1 = Math.round(((cy + 1) * CH - cam.y) * cam.s + cam.H / 2);
        g.drawImage(c.emision, sx0, sy0, sx1 - sx0, sy1 - sy0);
      }
    }
    g.restore();
  }

  // ----------------------------------------------------------- Mapa chiquito
  const PX_MAPA = 4;
  let mapa = null;
  function crearMapa() {
    mapa = Util.lienzo(N * PX_MAPA, N * PX_MAPA);
    const g = mapa.getContext('2d');
    const colores = {
      [TIPO.CALLE]: '#a3a8b3', [TIPO.PUENTE]: '#c2c6cf', [TIPO.ACERA]: '#5d626b', [TIPO.PASTO]: '#2f7a3d',
      [TIPO.AGUA]: '#1d63a3', [TIPO.ARENA]: '#c9b77f', [TIPO.PLAZA]: '#7a725f', [TIPO.PARKING]: '#4c4f58',
      [TIPO.BORDE]: '#1f4528',
    };
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const k = idx(x, y);
        const t = suelo[k];
        if (t === TIPO.EDIFICIO) g.fillStyle = Util.tono(edificios[idEdificio[k]].color, -0.45);
        else if (deco[k] === DECO.ARBOL) g.fillStyle = '#245e30';
        else g.fillStyle = colores[t] || '#333';
        g.fillRect(x * PX_MAPA, y * PX_MAPA, PX_MAPA, PX_MAPA);
      }
    }
  }

  generar();
  crearMapa();

  return {
    T, N, TAM, CH,
    get xs() { return xs; },
    get ys() { return ys; },
    edificios, lamparas, paradas, espacios, lugares, manzanas,
    get filaRio0() { return filaRio0; }, get filaRio1() { return filaRio1; }, get rioJ() { return rioJ; }, get xCosta() { return xCosta; },
    idEdificio: (tx, ty) => (dentro(tx, ty) ? idEdificio[idx(tx, ty)] : -1),
    get mapa() { return mapa; },
    PX_MAPA,
    tipoEn, decoEn, viaEn, superficie, solidoCasilla, caminable, esCalle,
    resolverCirculo, lineaLibre, carrilEn, carrilAzar, aceraAzar,
    centroNodo, salidas, existeArista, nodoCercano, rutaNodos,
    dibujar, dibujarEmision,
    // Prepara de una vez los pedazos que rodean un punto (para que no "aparezcan")
    precargar(x, y, radio) {
      const cx0 = Math.max(0, Math.floor((x - radio) / CH)), cx1 = Math.min(NCH - 1, Math.floor((x + radio) / CH));
      const cy0 = Math.max(0, Math.floor((y - radio) / CH)), cy1 = Math.min(NCH - 1, Math.floor((y + radio) / CH));
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) obtenerChunk(cx, cy, true);
    },
  };
})();
