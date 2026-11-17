// =============================================================
//  🖥️  PANELES DEL SISTEMA SOLAR (dentro de la ventana de contenedor)
//  Pestañas: MAPA (2D/3D, destinos, ventana de lanzamiento, lanzar),
//  NAVE (combustible, casco, escudo, traje) y DIARIO (cuerpos y
//  minerales catalogados, Gran Tour).
// =============================================================
import * as SS from './sistemaSolar.js';
import * as N from './naves.js';
import * as V from './supervivencia.js';
import { dibujar, elegir } from './mapaSolar.js';
import { datosDim } from './cuerpos.js';
import { NOMBRE_ATERRIZAJE } from './cuerposSolares.js';

const el = (tag, cls, texto) => { const e = document.createElement(tag); if (cls) e.className = cls; if (texto !== undefined) e.textContent = texto; return e; };
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const nombre = (id) => (id === 'sol' ? 'Sol' : (SS.FISICA[id] || { nombre: id }).nombre);
const DESTINOS = [...SS.CUERPOS_MAPA, 'sol'];

export function abrirPanel(S, tab) {
  const c = S.c;
  const st = S.ui = S.ui || { tab: 'mapa', sel: null, modo3d: !!c.Aj.get('mapaSolar3d'), zoom: 'interior', rot: 0.6 };
  if (tab) st.tab = tab;
  if (c.estado === 'contenedor') c.cerrarContenedor(true);
  c.abrirContenedor({ tipo: 'espacio', titulo: 'SISTEMA SOLAR', pintar: (cuerpo, repintar) => pintar(S, cuerpo, repintar) });
}

function pintar(S, cuerpo, repintar) {
  const st = S.ui;
  cuerpo.textContent = '';
  const tabs = el('div', 'solTabs');
  for (const [id, t] of [['mapa', 'MAPA'], ['nave', 'NAVE Y TRAJE'], ['diario', 'DIARIO']]) {
    const b = el('button', st.tab === id ? 'on' : '', t); b.type = 'button';
    b.addEventListener('click', () => { st.tab = id; repintar(); });
    tabs.appendChild(b);
  }
  cuerpo.appendChild(tabs);
  if (st.tab === 'mapa') pintarMapa(S, cuerpo, repintar);
  else if (st.tab === 'nave') pintarNave(S, cuerpo, repintar);
  else pintarDiario(S, cuerpo);
}

// ----------------------------------------------------------------- MAPA
function pintarMapa(S, cuerpo, repintar) {
  const c = S.c, st = S.ui, n = S.nave;
  const origen = S.origenActual();
  const caja = el('div', 'solMapa');
  const cv = el('canvas'); cv.width = 520; cv.height = 340; cv.className = 'solCanvas';
  caja.appendChild(cv);
  const barra = el('div', 'solBarra');
  const bModo = el('button', '', st.modo3d ? 'VISTA 3D' : 'VISTA 2D'); bModo.type = 'button';
  bModo.addEventListener('click', () => { st.modo3d = !st.modo3d; try { c.Aj.set('mapaSolar3d', st.modo3d); } catch (e) { /* nada */ } repintar(); });
  const bZoom = el('button', '', st.zoom === 'interior' ? 'SISTEMA INTERIOR' : 'TODO EL SISTEMA'); bZoom.type = 'button';
  bZoom.addEventListener('click', () => { st.zoom = st.zoom === 'interior' ? 'todo' : 'interior'; repintar(); });
  barra.append(bModo, bZoom);
  caja.appendChild(barra);
  cuerpo.appendChild(caja);
  const info = el('div', 'espInfo');
  cuerpo.appendChild(info);
  const acciones = el('div', 'solAcc');
  cuerpo.appendChild(acciones);

  // en órbita (en la cabina): descender
  if (S.dim === 'transito' && n && !S.viaje && n.cuerpo) {
    const caja2 = el('div', 'espInfo');
    caja2.appendChild(el('b', '', 'EN ÓRBITA: ' + nombre(n.cuerpo).toUpperCase()));
    const ls = S.aterrizajes(n.cuerpo);
    if (!ls.length) caja2.appendChild(el('div', '', n.cuerpo === 'sol' ? 'Zona letal: no hay superficie. Elige un destino para alejarte.' : 'No hay lugar de aterrizaje'));
    for (const d of ls) {
      const r = S.puedeDescender(d), D = datosDim(d);
      const b = el('button', r.ok ? 'principal' : '', `DESCENDER: ${(NOMBRE_ATERRIZAJE[d] || D.nombre).toUpperCase()} (${D.gravedad.toFixed(2)} g${D.entrada ? ', entrada nivel ' + D.entrada : ''})`); b.type = 'button';
      b.addEventListener('click', () => S.descender(d));
      caja2.appendChild(b);
      if (!r.ok) caja2.appendChild(el('small', 'solAviso', r.razon));
      if (D.amb) caja2.appendChild(el('small', '', `${D.amb.nota} · requiere traje: térmico ${D.amb.req.t}, radiación ${D.amb.req.r}, presión ${D.amb.req.p}`));
    }
    cuerpo.insertBefore(caja2, info);
  }
  if (S.viaje) {
    const v = S.viaje;
    info.appendChild(el('div', '', `EN RUTA a ${nombre(v.destino)}: ${Math.round(v.prog * 100)}% · velocidad del tiempo x${S.aceleracion()} (cámbiala en el panel superior de la pantalla o aquí)`));
    const fila = el('div', 'solAcc');
    for (const a of [1, 2, 5, 10, 25, 50]) { const b = el('button', a === S.aceleracion() ? 'principal' : '', 'x' + a); b.type = 'button'; b.addEventListener('click', () => { S.setAceleracion(a); repintar(); }); fila.appendChild(b); }
    info.appendChild(fila);
  }

  let cuerpos = [];
  const redibujar = () => {
    cuerpos = dibujar(cv, { diaAbs: c.dias + c.hora, modo3d: st.modo3d, rot: st.rot, zoom: st.zoom, sel: st.sel, origen: origen || (S.viaje && S.viaje.origen), destino: st.sel || (S.viaje && S.viaje.destino), nave: S.viaje && S.pos ? S.pos : null });
  };
  redibujar();
  cv.addEventListener('click', (e) => { const r = cv.getBoundingClientRect(); const id = elegir(cuerpos, (e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height); if (id) { st.sel = id; repintar(); } });
  if (st.modo3d) {
    const t0 = performance.now();
    const anim = () => { if (!cv.isConnected) return; st.rot = 0.6 + (performance.now() - t0) / 9000; redibujar(); requestAnimationFrame(anim); };
    if (!c.Aj.get('reducirMov')) requestAnimationFrame(anim);
  }
  // chips de destinos
  const chips = el('div', 'solChips');
  for (const id of DESTINOS) {
    if (id === origen) continue;
    const b = el('button', st.sel === id ? 'on' : '', nombre(id)); b.type = 'button';
    b.addEventListener('click', () => { st.sel = id; repintar(); });
    chips.appendChild(b);
  }
  cuerpo.insertBefore(chips, info);

  // detalles del destino
  const sel = st.sel;
  if (!sel) { info.appendChild(el('div', '', origen ? 'Elige un destino (toca el mapa o un nombre). Origen: ' + nombre(origen) : (S.viaje ? '' : 'Aquí no puedes iniciar un viaje.'))); return; }
  if (!n) { info.appendChild(el('div', '', 'Destino: ' + nombre(sel) + ' · necesitas una nave (kits de lanzadera, nave interplanetaria o nave de salto) para viajar.')); }
  const dia = c.dias + c.hora;
  const o = origen || (S.viaje && S.viaje.origen);
  if (o && o !== sel) {
    const nv = n || N.nuevaNave('nave_ionica');
    const p = S.nave ? S.plan(sel) : N.planViaje({ ...nv, comb: 1e9 }, o, sel, dia, 0);
    const ven = SS.proximaVentana(o, sel, dia);
    const abierta = sel !== 'sol' && o !== 'sol' && !SS.mismoSistema(o, sel) ? SS.ventanaAbierta(o, sel, dia) : true;
    const L = [
      ['Distancia', `${p.dist.toFixed(0)} uj (escala comprimida)`],
      ['Tiempo estimado (x1)', `${mmss(p.seg)} · con x${S.aceleracion()}: ${mmss(p.seg / S.aceleracion())} · ${p.dias.toFixed(1)} días de juego`],
      ['Combustible', `${p.comb}${n ? ' de ' + Math.round(n.comb) : ''}${p.mult > 1.05 ? ' (incluye +' + Math.round((p.mult - 1) * 100) + '% por ventana)' : ''}`],
      ['Ventana de lanzamiento', sel === 'sol' || o === 'sol' ? 'No aplica' : SS.mismoSistema(o, sel) ? 'Salto local: siempre abierta' : abierta ? `ABIERTA (error de fase ${p.err.toFixed(0)}°, ideal ${SS.faseIdeal(o, sel).toFixed(0)}°)` : ven ? `cerrada · próxima en ${Math.max(0, ven.dia - dia).toFixed(1)} días (mejor en ${Math.max(0, ven.mejor - dia).toFixed(1)})` : 'sin ventana próxima'],
    ];
    for (const [k, v] of L) { const f = el('div', 'espFila'); f.append(el('b', '', k), el('span', '', v)); info.appendChild(f); }
    if (S.nave) info.appendChild(el('div', p.posible ? '' : 'solAviso', p.posible ? 'Todo listo para el lanzamiento.' : p.razon));
    const bL = el('button', p.posible && S.nave ? 'principal' : '', S.dim === 'transito' && !S.viaje ? 'CAMBIAR RUMBO A ' + nombre(sel).toUpperCase() : 'LANZAR A ' + nombre(sel).toUpperCase()); bL.type = 'button'; bL.disabled = !(p.posible && S.nave) || !!S.viaje;
    bL.addEventListener('click', () => S.despegar(sel));
    acciones.appendChild(bL);
    if (sel !== 'sol' && o !== 'sol' && !abierta && ven && !S.viaje) {
      const bE = el('button', '', 'ESPERAR HASTA LA VENTANA (' + Math.max(0, Math.ceil(ven.mejor - dia)) + ' días)'); bE.type = 'button';
      bE.addEventListener('click', () => { if (S.esperarVentana(sel)) repintar(); });
      acciones.appendChild(bE);
    }
  }
  const F = SS.FISICA[sel];
  if (F && sel !== 'sol') {
    const lista = S.aterrizajes(sel).map((d) => NOMBRE_ATERRIZAJE[d] || datosDim(d).nombre);
    info.appendChild(el('div', '', `${F.nombre}: ${lista.length ? 'se puede descender a ' + lista.join(' / ') : 'sin aterrizaje'}`));
  } else if (sel === 'sol') info.appendChild(el('div', 'solAviso', 'SOL: zona de peligro letal. Solo aproximación en una nave de salto con escudo térmico mejorado; no se puede aterrizar.'));
}

// ----------------------------------------------------------------- NAVE
function barra(txt, pct, cls = '') { const f = el('div', 'solMed ' + cls); f.innerHTML = '<i></i><span></span>'; f.firstChild.style.width = Math.max(0, Math.min(100, pct)) + '%'; f.lastChild.textContent = txt; return f; }
function pintarNave(S, cuerpo, repintar) {
  const c = S.c, n = S.nave, tr = S.traje;
  const bloque = el('div', 'espInfo');
  if (!n) bloque.appendChild(el('div', '', 'No tienes nave. Fabrica un kit (lanzadera, nave interplanetaria o nave de salto) en la fábrica de vehículos y colócalo con clic derecho en una zona despejada.'));
  else {
    const T = N.TIERS[n.tipo];
    bloque.appendChild(el('b', '', T.nombre.toUpperCase() + ' · tier ' + T.tier + (n.enVuelo ? ' · en vuelo' : '')));
    bloque.appendChild(barra(`Combustible ${Math.round(n.comb)} / ${T.tanque}`, n.comb / T.tanque * 100));
    bloque.appendChild(barra(`Casco ${Math.round(n.casco)}%`, n.casco, n.casco < N.CASCO_MIN ? 'mal' : ''));
    bloque.appendChild(el('div', '', `Escudo térmico nivel ${N.nivelEscudo(n)}${n.mejoras.escudo ? ' (mejorado)' : ''} · gravedad máx. de despegue ${T.gMax} g · bodega: 4 cofres en la cabina`));
    const fila = el('div', 'solAcc');
    const mk = (t, fn, ok = true) => { const b = el('button', '', t); b.type = 'button'; b.disabled = !ok; b.addEventListener('click', () => { fn(); repintar(); }); fila.appendChild(b); };
    mk(`+${N.COMB_BIDON} BIDÓN (${c.inv.cuenta('bidon')})`, () => S.repostarNave('bidon'), !n.enVuelo);
    mk(`+${N.COMB_XENON} CELDA DE XENÓN (${c.inv.cuenta('celda_xenon')})`, () => S.repostarNave('celda_xenon'), !n.enVuelo);
    mk('REPARAR CASCO (2 hierro)', () => S.repararNave());
    mk(n.mejoras.escudo ? 'ESCUDO INSTALADO' : `INSTALAR ESCUDO TÉRMICO (${c.inv.cuenta('escudo_termico')})`, () => S.instalarEscudo(), !n.mejoras.escudo);
    mk('DESGUAZAR NAVE', () => { if (S.desguazar()) S.ui.tab = 'nave'; }, !n.enVuelo);
    bloque.appendChild(fila);
  }
  cuerpo.appendChild(bloque);
  const t = el('div', 'espInfo');
  t.appendChild(el('b', '', 'TRAJE ESPACIAL' + (c.inv.cuenta('traje_espacial') ? '' : ' (no lo llevas en la mochila)')));
  t.appendChild(barra(`Energía ${Math.round(S.en.e)}%`, S.en.e));
  const fila = el('div', 'solAcc');
  for (const [k, nom, item] of [['t', 'TÉRMICA', 'mejora_termica'], ['r', 'ANTI-RADIACIÓN', 'mejora_radiacion'], ['p', 'ANTI-PRESIÓN', 'mejora_presion']]) {
    const m = V.mejorar(tr, k);
    const b = el('button', '', `${nom} ${tr[k]}/3` + (m.ok ? ` → instalar (${m.costo}${m.nuevo === 3 ? ' + 1 mineral' : ''}; tienes ${c.inv.cuenta(item)})` : ' (máx.)')); b.type = 'button'; b.disabled = !m.ok;
    b.addEventListener('click', () => { S.instalarMejora(item); repintar(); });
    fila.appendChild(b);
  }
  const br = el('button', '', `RECARGAR ENERGÍA (batería ${c.inv.cuenta('bateria')})`); br.type = 'button'; br.addEventListener('click', () => { S.recargarTraje(); repintar(); });
  fila.appendChild(br);
  t.appendChild(fila);
  t.appendChild(el('small', '', 'Nivel 3 pide un mineral exclusivo: térmica = mercurio líquido (Mercurio), radiación = hematita (Marte), presión = platino (cinturón). La energía se recarga cerca de un generador de oxígeno.'));
  cuerpo.appendChild(t);
}

// ----------------------------------------------------------------- DIARIO
function pintarDiario(S, cuerpo) {
  const p = S.prog, c = S.c;
  const vis = SS.CUERPOS_MAPA.filter((id) => p.dims[id] || p.dims['orbita_' + id] || (id === 'tierra' && p.dims.orbita));
  const top = el('div', 'espInfo');
  top.appendChild(el('b', '', 'DIARIO DE EXPLORACIÓN'));
  const tour = ['mercurio', 'venus', 'luna', 'marte', 'cinturon', 'jupiter', 'saturno', 'urano', 'neptuno', 'pluton'];
  top.appendChild(el('div', '', `Gran Tour: ${tour.filter((k) => p.dims[k]).length} de ${tour.length} · viajes en nave: ${p.viajes || 0} · minerales: ${Object.keys(p.minerales).length} de ${S.constructor.MINERALES.length}`));
  top.appendChild(el('small', '', 'Escala de distancias al Sol (comprimida, uj = 100·r^0.45 con r en UA): ' + SS.TABLA_DIST.map((t) => nombre(t.id) + ' ' + Math.round(t.uj)).join(' · ')));
  cuerpo.appendChild(top);
  const lista = el('div', 'solDiario');
  for (const id of ['mercurio', 'venus', 'luna', 'marte', 'fobos', 'deimos', 'cinturon', 'jupiter', 'io', 'europa', 'ganimedes', 'calisto', 'saturno', 'titan', 'urano', 'neptuno', 'pluton', 'kuiper']) {
    const visto = !!p.dims[id]; const D = datosDim(id);
    const f = el('div', 'solTarj' + (visto ? ' ok' : ''));
    f.append(el('b', '', (visto ? '★ ' : '☆ ') + nombre(id)), el('span', '', visto ? `${D.gravedad.toFixed(2)} g · ${D.amb && D.amb.nota ? D.amb.nota : 'visitada'}` : 'sin explorar'));
    lista.appendChild(f);
  }
  cuerpo.appendChild(lista);
  cuerpo.appendChild(el('b', 'solSub', 'MINERALES Y RECURSOS'));
  const mi = el('div', 'solDiario');
  for (const m of S.constructor.MINERALES) {
    const n = p.minerales[m.clave];
    const f = el('div', 'solTarj' + (n !== undefined ? ' ok' : ''));
    const sw = el('i'); sw.style.background = m.color;
    f.append(sw, el('b', '', n !== undefined ? m.nombre : '???'), el('span', '', n !== undefined ? `${n} recogidos · ${nombre(m.cuerpo)}` : 'Se encuentra en ' + nombre(m.cuerpo)));
    mi.appendChild(f);
  }
  cuerpo.appendChild(mi);
  void vis; void c;
}
