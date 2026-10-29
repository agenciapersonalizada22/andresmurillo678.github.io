// =============================================================
//  🔫  ARMAS Y TIENDA: pistola y escopeta para ir a pie, con
//  munición. Los peatones huyen al verte armado. Disparar frente
//  a la policía sube las estrellas. (Estilo caricatura, sin sangre.)
//  Tecla F dispara, Q cambia de arma. Todo se guarda en el navegador.
// =============================================================
const Armas = (() => {
  const A = CONFIG.armas;
  const ROPAS = ['#13d6e8', '#ff3d81', '#ffd23d', '#7dff6b', '#c86bff', '#f2f2f2', '#ff8a3d'];
  const NOMBRES = ['pistola', 'escopeta'];

  // Partidas viejas no tienen estos datos: se rellenan con valores por defecto
  function cargar() {
    const v = Util.cargar('armas', null) || {};
    const d = { tiene: { pistola: false, escopeta: false }, balas: { pistola: 0, escopeta: 0 }, actual: null, ropa: 0 };
    if (v.tiene && typeof v.tiene === 'object') for (const n of NOMBRES) d.tiene[n] = v.tiene[n] === true;
    if (v.balas && typeof v.balas === 'object') {
      for (const n of NOMBRES) {
        const b = Number(v.balas[n]);
        d.balas[n] = isFinite(b) ? Util.limitar(Math.round(b), 0, A[n].municionMax) : 0;
      }
    }
    if (NOMBRES.includes(v.actual) && d.tiene[v.actual]) d.actual = v.actual;
    const r = Number(v.ropa);
    d.ropa = isFinite(r) ? Util.limitar(Math.round(r), 0, ROPAS.length - 1) : 0;
    return d;
  }
  const datos = cargar();
  const guardar = () => Util.guardar('armas', datos);

  let enfriar = 0;
  let destello = 0;
  let relojMiedo = 0;

  function aplicarRopa() {
    if (J.jugador) J.jugador.colores.ropa = ROPAS[datos.ropa];
  }

  // ----------------------------------------------------------- Disparo
  // Primer obstáculo a lo largo del rayo: pared, peatón o carro
  function rayo(x, y, ang, alcance) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let maxD = alcance;
    for (let d = 20; d <= alcance; d += 18) {
      if (Mundo.solidoCasilla(Math.floor((x + dx * d) / Mundo.T), Math.floor((y + dy * d) / Mundo.T))) { maxD = d; break; }
    }
    let mejor = { t: maxD, tipo: maxD < alcance ? 'pared' : null, obj: null };
    for (const p of J.peatones) {
      if (p.estado === 'caido') continue;
      const ox = p.x - x, oy = p.y - y;
      const t = ox * dx + oy * dy;
      if (t < 0 || t >= mejor.t) continue;
      if (Math.abs(-ox * dy + oy * dx) < p.radio + 4) mejor = { t, tipo: 'peaton', obj: p };
    }
    for (const c of J.carros) {
      if (c.conductor === 'jugador') continue;
      const ox = c.x - x, oy = c.y - y;
      if (Math.abs(ox) > alcance + c.largo || Math.abs(oy) > alcance + c.largo) continue;
      const fx = Math.cos(c.ang), fy = Math.sin(c.ang);
      const r = c.ancho / 2, off = c.largo / 2 - r;
      for (let k = -1; k <= 1; k++) {
        const qx = ox + fx * off * k, qy = oy + fy * off * k;
        const t = qx * dx + qy * dy;
        if (t < 0 || t >= mejor.t) continue;
        if (Math.abs(-qx * dy + qy * dx) < r) mejor = { t, tipo: 'carro', obj: c };
      }
    }
    return mejor;
  }

  // Si hay algo frente a ti dentro de un cono, apunta hacia allá (ayuda en pantalla táctil)
  function apuntar(j, alcance) {
    let mejor = null, ms = Infinity;
    const probar = (o, extra) => {
      const dx = o.x - j.x, dy = o.y - j.y;
      const d = Math.hypot(dx, dy);
      if (d > alcance || d < 8) return;
      const dif = Math.abs(Util.difAngulo(Math.atan2(dy, dx), j.ang));
      if (dif > 0.38) return;
      const puntos = dif + d * 0.0006 + extra;
      if (puntos < ms) { ms = puntos; mejor = Math.atan2(dy, dx); }
    };
    for (const p of J.peatones) if (p.estado !== 'caido' && !p.mision) probar(p, 0);
    for (const c of J.carros) if (c.conductor !== 'jugador') probar(c, 0.05);
    return mejor === null ? j.ang : mejor;
  }

  function impacto(r, ang, fuerte, x, y) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const hx = x + dx * r.t, hy = y + dy * r.t;
    Efectos.traza(x + dx * 12, y + dy * 12, hx, hy);
    if (r.tipo === 'peaton') {
      const p = r.obj;
      if (p.tumbar(dx * 170, dy * 170)) {
        J.stats.sustos = (J.stats.sustos || 0) + 1;
        J.delito('atropello', p.x, p.y);
      }
    } else if (r.tipo === 'carro') {
      const c = r.obj;
      Efectos.chispas(hx, hy, 3);
      c.danar(fuerte ? 3.5 : 5);
      if (c.emergencia && c.conductor === 'ia' && J.tiempo - (J.ultimoChoquePolicia || -9) > 1.5) {
        J.ultimoChoquePolicia = J.tiempo;
        J.delito('chocarPolicia', c.x, c.y);
        if (c.esPolicia) {
          if (!(c.ia instanceof IAPolicia)) c.ia = new IAPolicia(c);
          else if (J.buscado.estrellas > 0) c.ia.reanudar();
        }
      } else if (c.conductor === 'ia' && Math.random() < 0.3) {
        Efectos.texto(c.x, c.y - 30, Util.elegir(['¡Oiga!', '¡Auxilio!', '¡Ay!']), '#ffffff', 14);
      }
    } else if (r.tipo === 'pared') {
      Efectos.chispas(hx, hy, 2);
    }
  }

  function disparar() {
    const j = J.jugador;
    const n = datos.actual;
    if (!n || j.carro || j.caido > 0 || enfriar > 0) return;
    const a = A[n];
    if (datos.balas[n] <= 0) {
      enfriar = 0.3;
      Sonido.vacia();
      J.pista(`Sin munición. Compra más en la Armería (${Util.dinero(a.precioPaquete)})`);
      return;
    }
    datos.balas[n]--;
    enfriar = a.cadencia;
    destello = 0.07;
    const fuerte = n === 'escopeta';
    const ang = apuntar(j, a.alcance);
    j.ang = ang;
    for (let k = 0; k < a.perdigones; k++) {
      const an = ang + Util.azar(-a.dispersion, a.dispersion);
      impacto(rayo(j.x, j.y, an, a.alcance), an, fuerte, j.x, j.y);
    }
    Sonido.disparo(fuerte);
    Entrada.vibrar(fuerte ? 0.8 : 0.35, fuerte ? 0.6 : 0.5, fuerte ? 140 : 80);
    J.sacudir(fuerte ? 3 : 1.2);
    J.stats.disparos = (J.stats.disparos || 0) + 1;
    J.delito('disparo', j.x, j.y);
    // Todos los que escuchan el disparo salen corriendo
    for (const p of J.peatones) {
      if (p.mision || p.estado === 'caido') continue;
      if (Math.hypot(p.x - j.x, p.y - j.y) < 420 && Math.random() < 0.9) {
        p.asustar(j.x, j.y);
        if (!p.gritado && Math.random() < 0.3) { p.gritado = true; Efectos.texto(p.x, p.y - 22, Util.elegir(['¡Disparos!', '¡Corran!', '¡Ahh!']), '#ffffff', 14); }
      }
    }
    if (datos.balas[n] === 0) J.pista('¡Última bala gastada!');
  }

  function ciclar() {
    const j = J.jugador;
    if (j.carro) return;
    const lista = [null, ...NOMBRES.filter((n) => datos.tiene[n])];
    if (lista.length === 1) { J.pista('No tienes armas. Visita la Armería (A) en el mapa'); return; }
    datos.actual = lista[(lista.indexOf(datos.actual) + 1) % lista.length];
    guardar();
    Sonido.puerta();
    J.pista(datos.actual ? `${A[datos.actual].nombre} lista` : 'Guardaste el arma');
  }

  // Cada cuadro, a pie
  function actualizar(dt) {
    const j = J.jugador;
    enfriar = Math.max(0, enfriar - dt);
    destello = Math.max(0, destello - dt);
    if (j.carro) return;
    if (Entrada.pulso('KeyQ')) ciclar();
    // Stick derecho: apunta hacia donde empujas
    if (Entrada.mando.rfuerza > 0.4) j.ang = Math.atan2(Entrada.mando.ry, Entrada.mando.rx);
    if (datos.actual && Entrada.mantenida('KeyF')) disparar();
    // Con el arma en la mano, los peatones cercanos se asustan
    relojMiedo -= dt;
    if (datos.actual && relojMiedo <= 0) {
      relojMiedo = 0.4;
      for (const p of J.peatones) {
        if (p.mision || p.estado === 'caido' || p.estado === 'huir') continue;
        if (Math.hypot(p.x - j.x, p.y - j.y) < 110 && Math.random() < 0.35) {
          p.asustar(j.x, j.y);
          if (Math.random() < 0.4) Efectos.texto(p.x, p.y - 22, Util.elegir(['¡Tiene un arma!', '¡Ay no!', '¡Auxilio!']), '#ffffff', 13);
        }
      }
    }
  }

  // ----------------------------------------------------------- Tienda
  const capa = document.getElementById('tienda');
  const lista = document.getElementById('tiendaLista');
  const textoDinero = document.getElementById('tiendaDinero');

  function filas() {
    const f = [];
    for (const n of NOMBRES) {
      const a = A[n];
      if (!datos.tiene[n]) f.push({ id: 'arma:' + n, texto: a.nombre, precio: a.precio, nota: 'comprar' });
      else {
        const lleno = datos.balas[n] >= a.municionMax;
        f.push({ id: 'balas:' + n, texto: `Munición ${a.nombre.toLowerCase()} +${a.paquete}`, precio: a.precioPaquete, nota: `${datos.balas[n]}/${a.municionMax}`, bloqueado: lleno });
      }
    }
    f.push({ id: 'ropa', texto: 'Cambiar de ropa', precio: A.ropa.precio, nota: '' });
    return f;
  }

  function pintar() {
    if (!lista) return;
    textoDinero.textContent = Util.dinero(J.dinero);
    lista.innerHTML = '';
    for (const f of filas()) {
      const b = document.createElement('button');
      b.type = 'button';
      b.disabled = !!f.bloqueado || J.dinero < f.precio;
      b.innerHTML = `<span>${f.texto}</span><small>${f.nota}</small><b>${Util.dinero(f.precio)}</b>`;
      b.addEventListener('click', () => comprar(f.id));
      lista.appendChild(b);
    }
  }

  function comprar(id) {
    const [tipo, n] = id.split(':');
    let precio = 0;
    if (tipo === 'arma') {
      precio = A[n].precio;
      if (datos.tiene[n] || J.dinero < precio) return;
      datos.tiene[n] = true;
      datos.balas[n] = Math.min(A[n].municionMax, A[n].paquete);
      datos.actual = n;
    } else if (tipo === 'balas') {
      precio = A[n].precioPaquete;
      if (!datos.tiene[n] || datos.balas[n] >= A[n].municionMax || J.dinero < precio) return;
      datos.balas[n] = Math.min(A[n].municionMax, datos.balas[n] + A[n].paquete);
    } else if (tipo === 'ropa') {
      precio = A.ropa.precio;
      if (J.dinero < precio) return;
      datos.ropa = (datos.ropa + 1) % ROPAS.length;
      aplicarRopa();
    } else return;
    J.gastar(precio);
    guardar();
    Sonido.comprar();
    pintar();
  }

  function abrirTienda() {
    if (!capa || J.modo !== 'jugando') return;
    J.modo = 'tienda';
    Entrada.soltarTodo();
    Sonido.callarContinuos();
    pintar();
    capa.classList.remove('oculto');
  }

  function cerrarTienda() {
    if (J.modo !== 'tienda') return;
    J.modo = 'jugando';
    capa.classList.add('oculto');
  }

  if (document.getElementById('bTiendaCerrar')) document.getElementById('bTiendaCerrar').addEventListener('click', cerrarTienda);

  return {
    actualizar, ciclar, disparar, abrirTienda, cerrarTienda, aplicarRopa,
    get actual() { return datos.actual; },
    get destello() { return destello; },
    get alguna() { return datos.tiene.pistola || datos.tiene.escopeta; },
    // Para el HUD
    info() {
      const n = datos.actual;
      return n ? { nombre: A[n].nombre, balas: datos.balas[n], max: A[n].municionMax } : null;
    },
    // Para pruebas
    dar(n, balas) {
      datos.tiene[n] = true;
      datos.balas[n] = Util.limitar(balas === undefined ? A[n].municionMax : balas, 0, A[n].municionMax);
      datos.actual = n;
      guardar();
    },
  };
})();
