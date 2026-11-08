// Pantallas: menu, partida libre, ligas, desafios, reto diario, tienda, logros, ranking, ayuda y fin de partida.
import { h } from './dom.js';
import { abrirCapa, aviso, tablaPuntos, actualizarMonedas, cerrarTodas } from './ui.js';
import * as Pr from './progreso.js';
import * as Cu from './cuenta-bolos.js';
import * as Jg from './juego.js';
import { BOLAS, PISTAS, LIGAS, DESAFIOS, PINOS, LOGROS, NIVELES_BOT, nombreBot, colorBot, fechaHoy, rondasDiarias } from './catalogo.js';
import { diarioHecho } from './progreso.js';
import { Sonido } from './sonido.js';
import { posPino } from './fisica.js';

const Red = () => window.Red;
export const ctx = { ajustes: () => {}, ayuda: () => {}, online: () => {}, cuenta: () => {}, tutorial: () => {} };
const btn = (txt, fn, cls, extra) => h('button', { type: 'button', cls: 'btn ' + (cls || ''), 'data-f': 1, txt, on: { click: fn }, ...(extra || {}) });
const nombreYo = () => { const u = Cu.usuario(); return (u && (u.nombre || u.usuario)) || (Red() && Red().perfil.obtener().nombre) || 'Jugador'; };
const colorYo = () => { const u = Cu.usuario(); return (u && u.color) || (Red() && Red().perfil.obtener().color) || '#3df5ff'; };

/* ---------- menu ---------- */
export function pintarMenu() {
  const m = document.getElementById('listaMenu'); m.textContent = '';
  const g = Jg.guardado(), sala = Jg.salaGuardada();
  if (g && g.jug && !Jg.J.activo) m.appendChild(btn('Continuar partida' + (g.modo === 'liga' ? ' de liga' : g.modo === 'desafio' ? ' de desafío' : g.modo === 'diario' ? ' del reto diario' : ''), () => Jg.reanudar(g), 'grande'));
  if (sala && sala.jug) m.appendChild(btn('Continuar sala online anterior', () => ctx.online(sala), 'sec'));
  m.appendChild(btn('Partida libre', verLibre, g ? '' : 'grande'));
  m.appendChild(btn('Torneo por ligas', verLigas));
  m.appendChild(btn('Desafío de pinos especiales', verDesafios));
  m.appendChild(btn(diarioHecho() ? 'Reto diario (hecho hoy)' : 'Reto diario', verDiario));
  m.appendChild(btn('Jugar online con amigos', () => ctx.online(null)));
  m.appendChild(btn('Tienda de bolas y pistas', () => verTienda('bola'), 'sec'));
  m.appendChild(btn('Logros y estadísticas', verLogros, 'sec'));
  m.appendChild(btn('Ranking', () => verRanking(), 'sec'));
  Cu.pintarChip(document.getElementById('cuentaLinea'), verCuenta);
  actualizarMonedas();
}
export function verCuenta() {
  abrirCapa('Cuenta', (c, api) => Cu.panelCuenta(c, api, { ranking: () => verRanking(), antesDeSalir: () => Pr.guardarYa() }));
}
export function verRanking(modo) {
  abrirCapa('Ranking', (c) => Cu.panelRanking(c, { modo }));
}

/* ---------- partida libre ---------- */
function verLibre() {
  const S = Pr.D.setup;
  abrirCapa('Partida libre', (c, api) => {
    const lista = h('div', { cls: 'jug-lista' });
    const pintar = () => {
      lista.textContent = '';
      for (let i = 0; i < S.n; i++) {
        const esYo = i === 0, bot = S.tipos[i] === 'bot';
        const f = h('div', { cls: 'jug-fila', style: '--c:' + (esYo ? colorYo() : colorBot(i)) }, [h('i')]);
        if (esYo) f.appendChild(h('b', { txt: nombreYo() + ' (tú)' }));
        else {
          f.appendChild(bot ? h('b', { txt: nombreBot(i + S.niveles[i] * 3) + ' (bot)' }) : h('input', { type: 'text', maxlength: 14, value: S.nombres[i] || 'Jugador ' + (i + 1), 'data-f': 1, 'aria-label': 'Nombre del jugador ' + (i + 1), on: { input: (e) => { S.nombres[i] = e.target.value; Pr.guardar(); } } }));
          const tipo = h('div', { cls: 'aj-opc' }, ['humano', 'bot'].map((t) => btn(t === 'bot' ? 'Bot' : 'Humano', () => { S.tipos[i] = t; Pr.guardar(); pintar(); }, 'peq aj-o', { 'aria-pressed': String(S.tipos[i] === t) })));
          f.appendChild(tipo);
          if (bot) f.appendChild(h('div', { cls: 'aj-opc' }, NIVELES_BOT.map((n) => btn(n.nombre, () => { S.niveles[i] = n.id; Pr.guardar(); pintar(); }, 'peq aj-o', { 'aria-pressed': String(S.niveles[i] === n.id) }))));
        }
        lista.appendChild(f);
      }
    };
    c.appendChild(h('div', { cls: 'aj-fila' }, [h('label', { cls: 'aj-etq', txt: 'Jugadores (1 a 4)' }), h('div', { cls: 'aj-opc' }, [1, 2, 3, 4].map((n) => btn(String(n), () => { S.n = n; Pr.guardar(); pintar(); botonesN.forEach((b, k) => b.setAttribute('aria-pressed', String(k + 1 === n))); }, 'peq aj-o', { 'aria-pressed': String(S.n === n) })))]));
    const botonesN = Array.from(c.querySelectorAll('.aj-opc .aj-o'));
    c.appendChild(lista); pintar();
    c.appendChild(selectorEquipo());
    c.appendChild(h('p', { cls: 'nota', txt: 'Varios jugadores humanos comparten el dispositivo por turnos. Para jugar con amigos en sus propios dispositivos usa «Jugar online».' }));
    c.appendChild(btn('¡A jugar!', () => {
      api.cerrar();
      const jug = [];
      for (let i = 0; i < S.n; i++) {
        const bot = i > 0 && S.tipos[i] === 'bot', niv = NIVELES_BOT[S.niveles[i] || 0];
        jug.push(i === 0 ? { nombre: nombreYo(), color: colorYo(), tipo: 'humano', bola: Pr.D.sel.bola } : bot
          ? { nombre: nombreBot(i + niv.id * 3) + ' (bot)', color: colorBot(i), tipo: 'bot', hab: niv.hab + (Math.random() - 0.5) * 0.1, bola: BOLAS[Math.min(BOLAS.length - 1, niv.id * 2 + (i % 2))].id }
          : { nombre: (S.nombres[i] || 'Jugador ' + (i + 1)).slice(0, 14), color: colorBot(i + 2), tipo: 'humano', bola: Pr.D.sel.bola });
      }
      empezar({ modo: 'libre', jug, cfg: { pista: Pr.D.sel.pista } });
    }, 'grande'));
  });
}
export function empezar(setup) {
  ctx.antesDeJugar && ctx.antesDeJugar(setup);
  cerrarTodas();
  Jg.nueva(setup);
  ctx.tutorial();
}
function selectorEquipo() {
  const caja = h('div', { cls: 'equipo' });
  const pintar = () => {
    caja.textContent = '';
    const b = Pr.bolaSel(), p = Pr.pistaSel();
    caja.appendChild(h('div', { cls: 'eq-it' }, [bolaVista(b, 34), h('div', {}, [h('b', { txt: b.nombre }), h('small', { txt: 'Tu bola' })]), btn('Cambiar', () => { const ix = Pr.D.bolas.map((id) => BOLAS.find((x) => x.id === id)).filter(Boolean); const k = ix.findIndex((x) => x.id === b.id); Pr.equipar('bola', ix[(k + 1) % ix.length].id); pintar(); }, 'peq sec')]));
    caja.appendChild(h('div', { cls: 'eq-it' }, [h('span', { cls: 'pista-v', style: `background:linear-gradient(90deg,${p.tabla1},${p.tabla2});border-color:${p.neon}` }), h('div', {}, [h('b', { txt: p.nombre }), h('small', { txt: 'Tu pista' })]), btn('Cambiar', () => { const ix = Pr.D.pistas.map((id) => PISTAS.find((x) => x.id === id)).filter(Boolean); const k = ix.findIndex((x) => x.id === p.id); Pr.equipar('pista', ix[(k + 1) % ix.length].id); pintar(); }, 'peq sec')]));
  };
  pintar();
  return caja;
}
export const estrellasEl = (n, cls) => h('span', { cls: cls || 'estr' }, [0, 1, 2].map((i) => h('i', { cls: i < n ? 'on' : '', txt: '★' })));
export const bolaVista = (b, px) => h('span', { cls: 'bola-v', style: `width:${px}px;height:${px}px;background:radial-gradient(circle at 32% 30%,#fff9,transparent 32%),linear-gradient(135deg,${b.c1},${b.c2})` });

/* ---------- ligas ---------- */
export function verLigas() {
  abrirCapa('Torneo por ligas', (c, api) => {
    const L = Pr.D.liga;
    c.appendChild(h('p', { cls: 'nota', txt: 'Cada liga es una serie al mejor de 3 partidas contra rivales cada vez más duros. Gana 2 para ser campeón, premio en monedas y pista nueva.' }));
    LIGAS.forEach((lg, i) => {
      const bloq = i > L.nivel, hecha = L.campeon.includes(lg.id), actual = i === L.nivel;
      const m = Math.min(2, L.v + L.d), rival = lg.rivales[actual ? m : 2];
      const caja = h('div', { cls: 'liga' + (bloq ? ' bloq' : '') + (actual ? ' act' : ''), style: '--c:' + lg.color }, [
        h('div', { cls: 'lg-cab' }, [h('b', { txt: lg.nombre }), h('span', { txt: bloq ? '🔒 Bloqueada' : hecha ? '✔ Campeón' : actual ? `Serie ${L.v} - ${L.d}` : '' })]),
        h('small', { txt: 'Premio: ' + lg.premio + ' 🪙 · Rivales: ' + lg.rivales.map((r) => r.n).join(', ') })
      ]);
      if (!bloq) caja.appendChild(btn(actual ? `Jugar partida ${m + 1} contra ${rival.n}` : 'Practicar contra ' + rival.n, () => { api.cerrar(); empezar({ modo: 'liga', jug: [{ nombre: nombreYo(), color: colorYo(), tipo: 'humano', bola: Pr.D.sel.bola }, { nombre: rival.n + ' (bot)', color: colorBot(i), tipo: 'bot', hab: rival.hab, bola: rival.bola }], cfg: { liga: i, pista: lg.pista, rival: rival.n } }); }, actual ? '' : 'sec peq'));
      c.appendChild(caja);
    });
  });
}

/* ---------- desafios ---------- */
export function miniPinos(pinos, px) {
  const ns = 'http://www.w3.org/2000/svg', w = 100, s = px || 100;
  const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '-60 -4 120 62'); svg.setAttribute('width', s); svg.setAttribute('height', s * 0.52);
  const en = new Set(pinos.map((p) => p.i));
  for (let i = 0; i < 10; i++) {
    const p = posPino(i), cx = p.x * 100, cy = (p.z - 18.29) * -100 + 54 - 0 + 0;
    const c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', cx); c.setAttribute('cy', 54 - (p.z - 18.29) / 0.264 * 16 - 0); c.setAttribute('r', 6.2);
    const l = pinos.find((q) => q.i === i);
    c.setAttribute('fill', l ? (PINOS[l.tipo] || PINOS.normal).color : 'transparent'); c.setAttribute('stroke', l ? (PINOS[l.tipo] || PINOS.normal).franja : '#fff3'); c.setAttribute('stroke-width', l ? 2.5 : 1);
    if (!en.has(i)) c.setAttribute('stroke-dasharray', '2 2');
    svg.appendChild(c); void cy; void w;
  }
  return svg;
}
export function verDesafios() {
  abrirCapa('Desafío de pinos especiales', (c, api) => {
    c.appendChild(h('p', { cls: 'nota', txt: 'Derriba todos los pinos en máximo 3 bolas: 3 estrellas con 1 bola, 2 con 2, 1 con 3. Pesado = dorado, ligero = celeste, explosivo = rojo.' }));
    c.appendChild(h('div', { cls: 'estrellas-tot', txt: `★ ${Pr.estrellasTotal()} / ${DESAFIOS.length * 3}` }));
    const rej = h('div', { cls: 'rejilla2' });
    DESAFIOS.forEach((d) => {
      const e = Pr.D.desafios[d.id] | 0;
      rej.appendChild(h('button', { type: 'button', cls: 'tarjeta', 'data-f': 1, on: { click: () => { api.cerrar(); empezar({ modo: 'desafio', jug: [{ nombre: nombreYo(), color: colorYo(), tipo: 'humano', bola: Pr.D.sel.bola }], cfg: { desafio: d.id, pista: Pr.D.sel.pista } }); } } }, [
        miniPinos(d.pinos, 110), h('b', { txt: d.nombre }), h('small', { txt: d.desc }), estrellasEl(e)]));
    });
    c.appendChild(rej);
  });
}

/* ---------- reto diario ---------- */
function verDiario() {
  abrirCapa('Reto diario', (c, api) => {
    const f = fechaHoy(), d = Pr.D.diario, rondas = rondasDiarias(f), hecho = diarioHecho();
    c.appendChild(h('p', { txt: `Reto del ${f}: 5 rondas con pinos al azar (iguales para todos), 2 bolas por ronda. 10 puntos por pino, +20 por limpiar la ronda (+30 si es con la primera bola).` }));
    c.appendChild(h('div', { cls: 'diario-fila' }, rondas.map((r) => miniPinos(r.pinos, 62))));
    c.appendChild(h('table', { cls: 'tabla' }, [
      h('tr', {}, [h('td', { txt: 'Racha de días' }), h('td', { txt: String(d.racha | 0) })]),
      h('tr', {}, [h('td', { txt: 'Mejor reto' }), h('td', { txt: String(d.mejor | 0) })]),
      h('tr', {}, [h('td', { txt: 'Hoy' }), h('td', { txt: hecho ? 'Completado (' + (d.puntos | 0) + ')' : 'Pendiente' })])
    ]));
    c.appendChild(btn(hecho ? 'Jugar de nuevo (sin premio)' : 'Jugar el reto de hoy', () => { api.cerrar(); empezar({ modo: 'diario', jug: [{ nombre: nombreYo(), color: colorYo(), tipo: 'humano', bola: Pr.D.sel.bola }], cfg: { pista: Pr.D.sel.pista } }); }, 'grande'));
    c.appendChild(btn('Ranking diario', () => { api.cerrar(); verRanking('diario'); }, 'sec'));
  });
}

/* ---------- tienda ---------- */
export function verTienda(tipo0) {
  abrirCapa('Tienda', (c) => {
    let tipo = tipo0 || 'bola';
    const cab = h('div', { cls: 'aj-tabs' }), cuerpo = h('div', { cls: 'tienda' });
    const mon = h('div', { cls: 'estrellas-tot' });
    const bt = {};
    [['bola', 'Bolas'], ['pista', 'Pistas']].forEach(([id, n]) => { bt[id] = btn(n, () => { tipo = id; pintar(); }, 'aj-tab'); cab.appendChild(bt[id]); });
    c.appendChild(cab); c.appendChild(mon); c.appendChild(cuerpo);
    function pintar() {
      for (const k in bt) bt[k].classList.toggle('on', k === tipo);
      mon.textContent = '🪙 ' + Pr.D.monedas + ' monedas virtuales';
      cuerpo.textContent = '';
      (tipo === 'bola' ? BOLAS : PISTAS).forEach((it) => {
        const tiene = Pr.tiene(tipo, it.id), puesta = Pr.D.sel[tipo] === it.id;
        const vista = tipo === 'bola' ? bolaVista(it, 54) : h('span', { cls: 'pista-v', style: `background:linear-gradient(90deg,${it.tabla1},${it.tabla2});border-color:${it.neon}` });
        const info = h('div', { cls: 'tn-info' }, [h('b', { txt: it.nombre }), h('small', { txt: tipo === 'bola' ? it.desc : 'Cambia el ambiente de la pista.' })]);
        if (tipo === 'bola') info.appendChild(h('div', { cls: 'barras' }, [barra('Efecto', it.hook / 1.3), barra('Peso', (it.m - 6) / 1.5 + 0.1)]));
        const accion = tiene ? btn(puesta ? 'Equipada' : 'Equipar', () => { Pr.equipar(tipo, it.id); Sonido.fx('ok'); pintar(); }, 'peq' + (puesta ? ' sec' : ''), puesta ? { disabled: '' } : {})
          : btn('🪙 ' + it.precio, () => { if (Pr.comprar(tipo, it.id)) { Sonido.fx('moneda'); Pr.equipar(tipo, it.id); aviso(it.nombre + ' desbloqueada', '#6dff6d'); } else { Sonido.fx('mal'); aviso('Te faltan monedas', '#ff6b4a'); } actualizarMonedas(); pintar(); }, 'peq' + (Pr.D.monedas < it.precio ? ' sec' : ''));
        cuerpo.appendChild(h('div', { cls: 'tn' + (puesta ? ' puesta' : '') }, [vista, info, accion]));
      });
    }
    pintar();
  });
}
const barra = (n, v) => h('span', { cls: 'barra-l' }, [h('em', { txt: n }), h('i', { style: '--p:' + Math.round(Math.max(0.05, Math.min(1, v)) * 100) + '%' })]);

/* ---------- logros y estadisticas ---------- */
export function verLogros() {
  abrirCapa('Logros y estadísticas', (c) => {
    const s = Pr.D.stats;
    c.appendChild(h('h3', { txt: 'Estadísticas' }));
    const filas = [['Partidas empezadas', s.partidas], ['Partidas terminadas', s.terminadas], ['Victorias', s.victorias], ['Mejor puntaje', s.mejor], ['Strikes', s.strikes], ['Spares', s.spares], ['Pinos derribados', s.pinos], ['Lanzamientos', s.tiros], ['Bolas al canal', s.canales], ['Partidas perfectas', s.perfectas], ['Partidas online', s.online], ['Estrellas de desafíos', Pr.estrellasTotal()], ['Racha diaria', Pr.D.diario.racha | 0]];
    c.appendChild(h('table', { cls: 'tabla' }, filas.map(([n, v]) => h('tr', {}, [h('td', { txt: n }), h('td', { txt: String(v | 0) })]))));
    const hechos = LOGROS.filter((l) => Pr.D.logros[l.id]).length;
    c.appendChild(h('h3', { txt: `Logros ${hechos}/${LOGROS.length}` }));
    c.appendChild(h('ul', { cls: 'logros' }, LOGROS.map((l) => h('li', { cls: Pr.D.logros[l.id] ? 'ok' : '' }, [h('b', { txt: (Pr.D.logros[l.id] ? '🏆 ' : '🔒 ') + l.nombre }), h('span', { txt: l.desc })]))));
  });
}

/* ---------- ayuda ---------- */
export function verAyuda() {
  abrirCapa('Ayuda', (c) => {
    const bloque = (t, items) => { c.appendChild(h('h3', { txt: t })); c.appendChild(h('ul', { cls: 'ayuda' }, items.map((x) => h('li', { txt: x })))); };
    bloque('Táctil', ['Arrastra la bola a los lados para colocarla.', 'Desliza hacia arriba para lanzar: la velocidad del dedo es la fuerza; el rumbo del trazo, la dirección.', 'Termina el trazo curvando hacia un lado para dar efecto (la bola gira y entra en curva al final).', 'También puedes usar los botones de abajo: mantén LANZAR y suelta.']);
    bloque('Ratón y teclado', ['Arrastra con el ratón igual que con el dedo.', 'Flechas ←/→: posición · Q/E: dirección · Z/C: efecto · Espacio: mantén para cargar fuerza y suelta para lanzar (teclas reasignables en Ajustes).', 'T: tabla de puntos · Esc: pausa.']);
    bloque('Mando Xbox', ['Stick izquierdo: posición · stick derecho: dirección · gatillos LT/RT: efecto.', 'Mantén A para cargar la fuerza y suelta para lanzar.', 'MENÚ: pausa · Y: tabla de puntos · en menús: cruceta + A / B.']);
    bloque('Puntuación', ['10 frames de 2 bolas. Strike (X): 10 + las dos bolas siguientes. Spare (/): 10 + la bola siguiente.', 'En el 10.º frame un strike o spare da bolas extra. Máximo: 300.']);
    bloque('Monedas', ['Ganas monedas virtuales por pinos, strikes, spares, victorias, ligas y desafíos. Sirven para comprar bolas y pistas. No hay dinero real.']);
  });
}

/* ---------- fin de partida ---------- */
export function mostrarFin(res, acc) {
  actualizarMonedas();
  const titulo = res.modo === 'desafio' ? (res.estrellas ? '¡Desafío superado!' : 'Desafío fallido') : res.modo === 'diario' ? 'Reto diario terminado' : res.gano ? '¡Ganaste!' : res.empate ? 'Empate' : res.filas.length === 1 ? 'Partida terminada' : res.ganadores.includes(res.yo) ? '¡Ganaste!' : 'Fin de la partida';
  let salir = true;
  abrirCapa(titulo, (c, api) => {
    if (res.modo === 'desafio') {
      c.appendChild(estrellasEl(res.estrellas, 'fin-estrellas'));
      c.appendChild(h('p', { cls: 'sub', txt: res.nuevas ? `+${res.nuevas} estrella(s) nueva(s)` : res.estrellas ? 'Sin estrellas nuevas.' : 'Prueba otra estrategia.' }));
    } else if (res.modo === 'diario') {
      c.appendChild(h('div', { cls: 'fin-estrellas', txt: res.puntos + ' pts' }));
      c.appendChild(h('p', { cls: 'sub', txt: res.primera ? `Racha: ${res.racha} día(s)` : 'Ya habías completado el reto hoy (sin premio extra).' }));
    } else {
      c.appendChild(tablaPuntos(Jg.J.tiros, Jg.J.jug, -1));
      if (res.liga) c.appendChild(h('p', { cls: 'sub', txt: { campeon: '¡Campeón de la liga! +' + res.premio + ' 🪙' + (res.final ? ' · ¡Eres el Rey de los Bolos!' : ' · Liga siguiente desbloqueada'), eliminado: 'Serie perdida: vuelve a intentarlo.', empate: 'Empate: la partida se repite.', sigue: 'Serie: ' + Pr.D.liga.v + ' - ' + Pr.D.liga.d, practica: 'Partida de práctica.' }[res.liga.estado] || '' }));
    }
    if (res.monedas) c.appendChild(h('p', { cls: 'sub', txt: '🪙 +' + res.monedas + ' monedas' }));
    const bs = h('div', { cls: 'botones' });
    if (res.modo === 'desafio' && res.hay) bs.appendChild(btn('Siguiente desafío', () => { salir = false; api.cerrar(); const d = DESAFIOS[res.idx + 1]; empezar({ modo: 'desafio', jug: [{ nombre: nombreYo(), color: colorYo(), tipo: 'humano', bola: Pr.D.sel.bola }], cfg: { desafio: d.id, pista: Pr.D.sel.pista } }); }));
    if (acc && acc.revancha) bs.appendChild(btn(res.modo === 'liga' && res.liga && res.liga.estado === 'sigue' ? 'Siguiente partida' : 'Revancha', () => { salir = false; api.cerrar(); acc.revancha(res); }, res.modo === 'desafio' ? 'sec' : ''));
    bs.appendChild(btn('Ranking', () => { salir = false; api.cerrar(); if (acc && acc.fondo) acc.fondo(); verRanking(res.modo === 'diario' ? 'diario' : res.modo === 'desafio' ? 'estrellas' : 'puntos'); }, 'sec'));
    bs.appendChild(btn('Menú', () => api.cerrar(), 'sec'));
    c.appendChild(bs);
  }, { cls: 'fin', alCerrar: () => { if (salir && acc && acc.menu) acc.menu(); } });
}
