// Multijugador cooperativo: el anfitrión simula; todos aplican la misma secuencia ordenada de comandos y pasos.
import * as THREE from '../../lib/three.module.min.js';
import * as C from '../sim/ciudad.js';
import { ITEM, ESCENARIOS } from '../sim/datos.js';
import { aTexto, deTexto } from '../sim/guardado.js';
import { dinero } from '../sim/util.js';
import { modelo } from '../vista/modelos.js';
import * as Almacen from './almacen.js';
import * as Audio from './audio.js';
import { esc } from './hud.js';

const FRASES = ['¡Buen trabajo!', 'Necesito dinero', 'Ayuda aquí', 'Construyo energía', '¡Incendio!', 'Un momento', 'Voy a demoler', '¡Gracias!'];
const CHUNK = 9000;
const MODOS = [{ id: 'coop', nombre: 'Cooperativo (ciudad compartida)' }, { id: 'vs', nombre: 'Competitivo por distritos' }, { id: 'desafio', nombre: 'Desafío cooperativo' }];
const COSTOSOS = ['via', 'zona', 'construir', 'parcela', 'mejorar', 'impulsar', 'reparar', 'investigar'];
const VS_DIAS = 30;

export function crearMulti(J) {
  const R = () => window.Red, L = () => window.Lobby;
  const M = {
    activo: false, esAnfitrion: false, miId: 0, seq: 0, modo: 'coop', sinc: false, cola: [], chat: [], registro: [], remotos: new Map(),
    ultCur: 0, ultHash: 0, ultSync: 0, votos: null, finVS: false, resyncs: 0, desync: 0,
  };
  const OPTS = { juego: 'Metrópolis', maxJugadores: 4, modos: MODOS, alIniciar: (cfg, jug) => alIniciar(cfg, jug) };
  const vivo = () => document.dispatchEvent(new Event('metro-vivo'));

  M.hayEnlace = () => !!(L() && L().hayEnlace && L().hayEnlace());
  M.abrirLobby = () => { if (!R() || !L()) { J.aviso('Multijugador no disponible', 'mal'); return; } L().abrir(OPTS); };

  // ---------------------------------------------------------------- estado compartido de la sala
  const mp = () => J.c && J.c.mp;
  function hash(c) {
    let h = 2166136261 >>> 0;
    const mez = (v) => { h ^= (v | 0) >>> 0; h = Math.imul(h, 16777619) >>> 0; };
    mez(Math.round(c.dinero)); mez(c.t.dia * 24 + c.t.hora); mez(c.rs); mez(c.edif.size); mez(c.sigId);
    let a = 0; for (const b of c.edif.values()) a = (a + b.id * 31 + b.n * 7 + b.x * 3 + b.y + (b.dan ? 5 : 0) + b.pop) | 0;
    mez(a); let v = 0; for (let i = 0; i < c.via.length; i++) if (c.via[i]) v = (v + i * c.via[i]) | 0; mez(v);
    let p = 0; for (let i = 0; i < c.parc.length; i++) p = (p + c.parc[i] * (i + 1)) | 0; mez(p);
    return h.toString(16);
  }
  M.hash = () => hash(J.c);

  function jugadorStats(id, c = J.c) {
    const m = c && c.mp; if (!m) return null;
    const pj = R().jugadores[id];
    const s = m.stats[id] || (m.stats[id] = { nombre: 'Jugador', color: '#3df5ff', edif: 0, gasto: 0 });
    if (pj) { s.nombre = pj.nombre; s.color = pj.color; }
    if (!m.perm[id]) m.perm[id] = { demoler: true, gastar: true, presu: null };
    return s;
  }

  // ---------------------------------------------------------------- inicio de partida
  function alIniciar(cfg, jugadores) {
    M.modo = cfg.modo || 'coop'; M.esAnfitrion = R().esAnfitrion; M.miId = R().miId; M.cfg = cfg;
    J.paneles.cerrarTodos();
    if (M.esAnfitrion) iniciarHost(cfg);
    else espera('Esperando al anfitrión…');
  }
  function espera(txt) {
    let e = document.getElementById('esperaMulti');
    if (!e) { e = document.createElement('div'); e.id = 'esperaMulti'; document.body.appendChild(e); }
    e.innerHTML = '<div><b>METRÓPOLIS</b><span></span></div>'; e.querySelector('span').textContent = txt; e.classList.toggle('oculto', !txt);
  }
  function iniciarHost(cfg) {
    const guardada = Almacen.meta('m'), t = guardada && Almacen.leerRanura('m');
    const nueva = (escId, mapa) => crearCiudadHost(cfg, escId, mapa);
    const elegirNueva = () => {
      if (M.modo === 'desafio') {
        const lista = ESCENARIOS.filter((e) => e.prog);
        J.paneles.modal({ titulo: 'Elige el desafío', pausa: false, cerrable: false, html: '<div class="lista">' + lista.map((e) => `<button type="button" class="btn foco" data-acc="e" data-id="${e.id}"><span><b>${e.nombre}</b><br><small style="text-transform:none;font-weight:500">${e.desc}</small></span></button>`).join('') + '</div>', acc: { e: (b, a) => { a.cerrar(true); nueva(b.dataset.id, null); } } });
      } else nueva('libre', M.modo === 'vs' ? 'llanura' : 'isla');
    };
    if (t && guardada) {
      J.paneles.modal({
        titulo: 'Sala guardada', cerrable: false, inicial: '[data-acc="cont"]',
        html: `<p>Tienes una ciudad compartida guardada: <b>${esc(guardada.nombre)}</b> (${guardada.pop} hab., día ${guardada.dia}). ¿Continuar o empezar otra?</p>`,
        pie: '<button type="button" class="btn foco" data-acc="nueva">Nueva ciudad</button><button type="button" class="btn primario foco" data-acc="cont">Continuar</button>',
        acc: {
          cont: (b, a) => { a.cerrar(true); cargarGuardada(t); },
          nueva: (b, a) => { a.cerrar(true); elegirNueva(); },
        },
      });
    } else elegirNueva();
  }
  function cargarGuardada(t) {
    let c;
    try { c = J.deserializarTexto(t); } catch (e) { J.aviso('Guardado dañado, empezando nuevo', 'mal'); crearCiudadHost(M.cfg, 'libre', 'isla'); return; }
    if (!c.mp) c.mp = nuevoMp(M.modo);
    M.modo = c.mp.modo; c.ult = 0;
    for (const id of Object.keys(R().jugadores)) { jugadorStats(+id, c); }
    comenzar(c);
  }
  function nuevoMp(modo) { return { modo, stats: {}, perm: {}, vsDias: VS_DIAS, fin: false }; }
  function crearCiudadHost(cfg, escId, mapa) {
    const nombre = 'Sala de ' + R().perfil.obtener().nombre;
    const c = C.nuevaCiudad((cfg.semilla >>> 0) || (Date.now() >>> 0), nombre, { escenario: escId, mapa });
    c.mp = nuevoMp(M.modo); c.ult = 0;
    if (M.modo === 'vs') {
      c.vs = true; c.parc.fill(0);
      const orden = [[4, 4], [3, 3], [4, 3], [3, 4]];
      R().lista().forEach((j, i) => { if (orden[i]) c.parc[orden[i][1] * C.NP + orden[i][0]] = i + 1; });
      c.dinero = 9000;
    }
    for (const j of R().lista()) jugadorStats(j.id, c);
    comenzar(c);
  }
  function comenzar(c) {
    M.activo = true; M.seq = 0; M.sinc = false; M.cola.length = 0; M.finVS = !!c.mp.fin;
    c.actor = 0;
    J.empezarMulti(c, M.esAnfitrion ? 'm' : 0);
    espera('');
    for (const j of R().lista()) if (j.id !== M.miId) enviarSync(j.id);
    J.aviso('Sala abierta: ' + R().lista().length + ' alcaldes', 'ok');
    vivo(); crearChip();
  }

  // ---------------------------------------------------------------- sincronización completa (fragmentada)
  let idSync = 0;
  function enviarSync(a) {
    const txt = aTexto(J.c), n = Math.ceil(txt.length / CHUNK), id = ++idSync;
    for (let i = 0; i < n; i++) R().enviar('m_sync', { id, i, n, s: M.seq, d: txt.slice(i * CHUNK, (i + 1) * CHUNK) }, { a, fiable: true });
  }
  const recibiendo = {};
  function recibirSync(d) {
    const r = recibiendo[d.id] || (recibiendo[d.id] = { partes: [], n: d.n, s: d.s, cuenta: 0 });
    if (!r.partes[d.i]) { r.partes[d.i] = d.d; r.cuenta++; }
    if (!M.activo) espera('Recibiendo la ciudad… ' + Math.round(100 * r.cuenta / r.n) + '%');
    if (r.cuenta < r.n) return;
    delete recibiendo[d.id];
    try {
      const c = deTexto(r.partes.join('')); c.ult = 0; if (!c.mp) c.mp = nuevoMp(M.modo);
      M.modo = c.mp.modo; M.esAnfitrion = false; M.miId = R().miId;
      const nuevo = !M.activo;
      M.activo = true; M.seq = r.s; M.sinc = false;
      if (nuevo) { if (L() && L().abierto) L().cerrar(true); J.paneles.cerrarTodos(); J.empezarMulti(c, 0); crearChip(); }
      else { J.cargarCiudad(c); }
      espera('');
      const pend = M.cola.splice(0).filter((e) => e.s > M.seq).sort((a, b) => a.s - b.s);
      for (const e of pend) aplicar(e);
      vivo();
      if (!nuevo) J.aviso('Ciudad resincronizada', 'info');
    } catch (e) { console.error(e); J.aviso('No se pudo sincronizar la ciudad', 'mal'); }
  }
  function pedirSync(motivo) {
    const t = performance.now();
    if (M.esAnfitrion || t - M.ultSync < 3000) return;
    M.ultSync = t; M.sinc = true; M.resyncs++;
    R().enviar('m_pideSync', { motivo }, { fiable: true });
  }

  // ---------------------------------------------------------------- secuencia de eventos
  function difundirEv(ev) { R().difundir('m_e', ev, { fiable: true }); }
  function aplicar(ev) {
    if (ev.s <= M.seq) return;
    if (ev.s !== M.seq + 1) { pedirSync('hueco'); return; }
    M.seq = ev.s;
    if (ev.k === 'c') {
      const r = J.ejecutarLocal(ev.cmd, ev.de);
      if (!r.ok) { pedirSync('rechazo'); return; }
      J.cambioFuerte();
      document.dispatchEvent(new Event('metro-vivo'));
    } else if (ev.k === 'p') J.pasosRed(ev.n);
    else if (ev.k === 'd') { J.c.parc[ev.py * C.NP + ev.px] = ev.dueno; J.c.sucio = true; J.cambioFuerte(); J.terreno.colorear(J.c, J.capa); J.terreno.bordesDe(J.c); }
    else if (ev.k === 'v') { J.vel = ev.v; }
  }
  // el anfitrión llama a esto tras aplicar un comando (local o de un cliente) y al avanzar la simulación
  J.alComando = (cmd, r, de) => {
    if (!M.activo) return;
    const quien = de == null ? M.miId : de;
    registrar(cmd, r, quien);
    if (M.esAnfitrion) difundirEv({ s: ++M.seq, k: 'c', cmd, de: quien });
  };
  M.pasosHechos = (n) => { if (M.activo && M.esAnfitrion) difundirEv({ s: ++M.seq, k: 'p', n }); };

  function validar(cmd, de) {
    const m = mp(), p = m.perm[de] || { demoler: true, gastar: true };
    if (cmd.k === 'demoler' && !p.demoler) return 'El anfitrión no te permite demoler';
    if (COSTOSOS.includes(cmd.k)) {
      if (!p.gastar) return 'El anfitrión no te permite gastar';
      const st = m.stats[de];
      if (p.presu != null && st && st.gasto >= p.presu) return 'Superaste tu presupuesto (' + dinero(p.presu) + ')';
    }
    if (J.c.vs) {
      const dueno = (x, y) => J.c.parc[Math.floor(y / C.P) * C.NP + Math.floor(x / C.P)];
      let celdas = [];
      if (cmd.celdas) celdas = cmd.celdas;
      else if (cmd.k === 'construir') { const it = ITEM[cmd.item]; if (it) for (let j = 0; j < it.h; j++) for (let i = 0; i < it.w; i++) celdas.push([cmd.x + i, cmd.y + j]); }
      else if (cmd.k === 'mejorar' || cmd.k === 'impulsar') { const b = J.c.edif.get(cmd.id); if (b) celdas = [[b.x, b.y]]; }
      for (const [x, y] of celdas) if (C.dentro(x, y) && dueno(x, y) !== de + 1) return 'Solo puedes construir en tu distrito';
      if (cmd.k === 'parcela') {
        const v = (a, b) => a >= 0 && b >= 0 && a < C.NP && b < C.NP && J.c.parc[b * C.NP + a] === de + 1;
        if (!(v(cmd.px - 1, cmd.py) || v(cmd.px + 1, cmd.py) || v(cmd.px, cmd.py - 1) || v(cmd.px, cmd.py + 1))) return 'La parcela debe tocar tu distrito';
      }
    }
    return '';
  }
  M.enviarComando = (cmd) => { if (!M.activo) return { ok: false, razon: 'Sin conexión' }; R().enviar('m_cmd', cmd, { fiable: true }); return { ok: true, pendiente: true }; };
  function recibirCmd(cmd, de) {
    if (!M.activo || !M.esAnfitrion || !cmd || typeof cmd.k !== 'string') return;
    const err = validar(cmd, de);
    if (err) { R().enviar('m_no', { razon: err }, { a: de, fiable: true }); return; }
    const d0 = J.c.dinero;
    const r = J.ejecutarLocal(cmd, de);
    if (!r.ok) { R().enviar('m_no', { razon: r.razon || 'No se pudo' }, { a: de, fiable: true }); return; }
    const st = jugadorStats(de); if (st && d0 > J.c.dinero) st.gasto += d0 - J.c.dinero;
    J.cambioFuerte(); vivo();
  }
  function registrar(cmd, r, de) {
    const m = mp(), st = m && jugadorStats(de); if (!st) return;
    let txt = '';
    if (cmd.k === 'construir') { st.edif++; txt = 'construyó ' + (ITEM[cmd.item] ? ITEM[cmd.item].nombre : cmd.item); }
    else if (cmd.k === 'zona') { st.edif += 0; txt = 'zonificó ' + (r.n || '') + ' casillas'; }
    else if (cmd.k === 'via') txt = 'trazó ' + (r.n || '') + ' casillas de vía';
    else if (cmd.k === 'demoler') txt = 'demolió ' + (r.n || '') + ' elementos';
    else if (cmd.k === 'parcela') txt = 'compró una parcela';
    else if (cmd.k === 'mejorar') txt = 'mejoró un edificio';
    else if (cmd.k === 'investigar') txt = 'investigó ' + cmd.id;
    else if (cmd.k === 'ordenanza') txt = (cmd.on ? 'activó' : 'quitó') + ' la ordenanza ' + cmd.id;
    else if (cmd.k === 'impuesto') txt = 'cambió impuestos (' + cmd.zona + ') a ' + cmd.v + '%';
    else if (cmd.k === 'espec' || cmd.k === 'comercio' || cmd.k === 'reparar' || cmd.k === 'evento') txt = 'usó ' + cmd.k;
    if (!txt || cmd.k === 'deshacer') return;
    M.registro.push({ t: Date.now(), id: de, txt }); if (M.registro.length > 60) M.registro.shift();
    if (de !== M.miId && cmd.k !== 'via' && cmd.k !== 'zona') J.aviso(st.nombre + ' ' + txt, 'info');
  }

  // ---------------------------------------------------------------- velocidad (anfitrión o votación)
  M.pedirVel = (v) => {
    if (M.esAnfitrion) { if (v === J.vel) return; if (J.vel > 0) J.velPrev = J.vel; J.vel = v; difundirEv({ s: ++M.seq, k: 'v', v }); return; }
    R().enviar('m_vel', { v }, { fiable: true }); J.aviso('Propuesta enviada al anfitrión', 'info');
  };
  function votoVel(v, de) {
    const nom = (jugadorStats(de) || {}).nombre || 'Jugador';
    let b = document.getElementById('votoVel');
    if (!b) { b = document.createElement('div'); b.id = 'votoVel'; document.body.appendChild(b); }
    b.innerHTML = `<span></span><button type="button" class="btn mini foco" data-v="1">Aceptar</button><button type="button" class="btn mini foco" data-v="0">No</button>`;
    b.querySelector('span').textContent = nom + ' propone ' + (v === 0 ? 'pausa' : v + 'x');
    b.classList.remove('oculto');
    const t = setTimeout(() => b.classList.add('oculto'), 9000);
    b.onclick = (e) => { const x = e.target.closest('[data-v]'); if (!x) return; clearTimeout(t); b.classList.add('oculto'); if (x.dataset.v === '1') M.pedirVel(v); };
  }

  // ---------------------------------------------------------------- mensajes
  function iniciarRed() {
    const Rd = R(); if (!Rd || M.red) return; M.red = true;
    Rd.on('mensaje', (t, d, de) => {
      if (t === 'm_cmd') recibirCmd(d, de);
      else if (t === 'm_e') { if (M.sinc || !M.activo) M.cola.push(d); else aplicar(d); }
      else if (t === 'm_sync') recibirSync(d);
      else if (t === 'm_pideSync') { if (M.esAnfitrion && M.activo) enviarSync(de); }
      else if (t === 'm_no') { J.aviso(d.razon, 'mal'); Audio.tocar('error'); }
      else if (t === 'm_vel') { if (M.esAnfitrion) votoVel(d.v, de); }
      else if (t === 'm_h') {
        if (M.activo && !M.esAnfitrion && !M.sinc && d.s === M.seq && d.h !== hash(J.c)) { M.desync++; J.aviso('Desincronización detectada: corrigiendo…', 'mal'); pedirSync('hash'); }
      } else if (t === 'm_cur') cursorRemoto(de, d);
      else if (t === 'm_perm') { if (mp()) { mp().perm[d.id] = d.p; vivo(); } }
      else if (t === 'm_fin') { /* el fin de VS lo calcula cada cliente */ }
    });
    Rd.on('jugadorUnido', (id) => {
      if (!M.activo || !Rd.esAnfitrion) return;
      jugadorStats(id);
      if (J.c.vs) { const libres = [[4, 4], [3, 3], [4, 3], [3, 4]].filter(([x, y]) => !J.c.parc[y * C.NP + x]); if (libres[0]) { const [px, py] = libres[0]; J.c.parc[py * C.NP + px] = id + 1; difundirEv({ s: ++M.seq, k: 'd', px, py, dueno: id + 1 }); J.terreno.bordesDe(J.c); J.terreno.colorear(J.c, J.capa); } }
      enviarSync(id); J.aviso('Se unió un alcalde', 'ok'); vivo();
    });
    Rd.on('jugadorSalio', (id) => { quitarRemoto(id); J.aviso('Un alcalde salió de la sala', 'info'); vivo(); });
    Rd.on('chat', (de, texto, j) => { M.chat.push({ de, nombre: j ? j.nombre : 'Jugador', color: j ? j.color : '#fff', texto, t: Date.now() }); if (M.chat.length > 80) M.chat.shift(); if (de !== M.miId) { J.aviso((j ? j.nombre : 'Jugador') + ': ' + texto, 'info'); Audio.tocar('tecla'); } document.dispatchEvent(new Event('metro-chat')); });
    Rd.on('cerrado', (motivo) => alCerrar(motivo));
  }
  iniciarRed();
  if (!M.red) { const t = setInterval(() => { if (R()) { clearInterval(t); iniciarRed(); } }, 500); }

  function alCerrar(motivo) {
    if (!M.activo) return;
    const eraHost = M.esAnfitrion;
    M.activo = false; document.getElementById('multiChip') && document.getElementById('multiChip').classList.add('oculto');
    for (const id of [...M.remotos.keys()]) quitarRemoto(id);
    if (eraHost) { J.aviso('Sala cerrada', 'info'); return; }
    J.paneles.modal({
      titulo: 'Sala cerrada', pausa: true, cerrable: false, inicial: '[data-acc="copia"]',
      html: '<p>El anfitrión cerró la sala o se perdió la conexión. Puedes guardar una copia de la ciudad compartida en una ranura local y seguir jugando solo.</p>',
      pie: '<button type="button" class="btn foco" data-acc="salir">Salir</button><button type="button" class="btn primario foco" data-acc="copia">Guardar copia y seguir</button>',
      acc: {
        copia: (b, a) => {
          let n = 1; while (n <= Almacen.RANURAS && Almacen.meta(n)) n++;
          if (n > Almacen.RANURAS) n = Almacen.RANURAS;
          const c = J.c; c.mp = null; c.vs = false; c.ult = Date.now();
          J.slot = n; J.guardar(); a.cerrar(true); J.aviso('Copia guardada en la ranura ' + n, 'ok');
        },
        salir: (b, a) => { a.cerrar(true); J.volverATitulo(); },
      },
    });
  }
  M.salir = () => { if (M.activo) { M.activo = false; try { R().salir(); } catch (e) { /* nada */ } } const ch = document.getElementById('multiChip'); if (ch) ch.classList.add('oculto'); for (const id of [...M.remotos.keys()]) quitarRemoto(id); };

  // ---------------------------------------------------------------- cursores y fantasmas remotos
  const capaCur = document.createElement('div'); capaCur.id = 'cursoresRemotos'; document.body.appendChild(capaCur);
  const fantMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false });
  function cursorRemoto(id, d) {
    let r = M.remotos.get(id);
    if (!r) {
      const el = document.createElement('div'); el.className = 'curRemoto'; el.innerHTML = '<i></i><span></span>'; capaCur.appendChild(el);
      r = { el, interp: new (R().Interpolador)({ retardo: 90 }), mesh: null, clave: '', ghost: null }; M.remotos.set(id, r);
    }
    r.interp.agregar(d.t, { x: d.x, z: d.z }); r.ghost = d.g || null;
  }
  function quitarRemoto(id) {
    const r = M.remotos.get(id); if (!r) return;
    r.el.remove(); if (r.mesh) { J.escena.scene.remove(r.mesh); }
    M.remotos.delete(id);
  }
  function pintarRemotos() {
    for (const [id, r] of M.remotos) {
      const pj = R().jugadores[id]; if (!pj) { quitarRemoto(id); continue; }
      const p = r.interp.obtener(); if (!p) { r.el.style.display = 'none'; continue; }
      const [sx, sy] = J.aPantalla(p.x, 0.1, p.z);
      r.el.style.display = ''; r.el.style.transform = `translate(${sx}px,${sy}px)`; r.el.style.setProperty('--c', pj.color);
      const sp = r.el.querySelector('span'), tx = pj.nombre + (r.ghost ? ' · ' + (ITEM[r.ghost.i] ? ITEM[r.ghost.i].nombre : '') : '');
      if (sp.textContent !== tx) sp.textContent = tx;
      const g = r.ghost && ITEM[r.ghost.i];
      if (g && g.tipo !== 'via' && g.tipo !== 'zona' && g.tipo !== 'comprar') {
        const clave = g.id;
        if (r.clave !== clave) {
          if (r.mesh) J.escena.scene.remove(r.mesh);
          r.mesh = new THREE.Mesh(modelo(g.id, 1, 0).geos().cuerpo, fantMat); r.clave = clave; J.escena.scene.add(r.mesh);
        }
        r.mesh.visible = true; r.mesh.position.set(r.ghost.x + g.w / 2, 0, r.ghost.y + g.h / 2);
      } else if (r.mesh) r.mesh.visible = false;
    }
  }

  // ---------------------------------------------------------------- bucle
  M.actualizar = (dt, ahora) => {
    if (!M.activo) return;
    const H = J.herr;
    if (ahora - M.ultCur > 100 && !J.enTitulo && H.mundo) {
      M.ultCur = ahora;
      const g = H.tipoPint === 'edificio' && H.fant && H.item ? { i: H.item.id, x: H.fant.x, y: H.fant.y } : null;
      R().difundir('m_cur', { t: R().reloj(), x: +H.mundo.x.toFixed(2), z: +H.mundo.z.toFixed(2), g }, { fiable: false });
    }
    if (M.esAnfitrion && ahora - M.ultHash > 4000) { M.ultHash = ahora; R().difundir('m_h', { s: M.seq, h: hash(J.c) }, { fiable: true }); }
    pintarRemotos();
    if (ahora - (M.ultChip || 0) > 500) { M.ultChip = ahora; chip(); comprobarVS(); }
  };

  // ---------------------------------------------------------------- modo competitivo
  M.marcador = () => {
    const c = J.c, out = {};
    for (const id of Object.keys(c.mp ? c.mp.stats : {})) out[id] = { pop: 0, edif: 0 };
    for (const b of c.edif.values()) {
      const d = c.parc[Math.floor(b.y / C.P) * C.NP + Math.floor(b.x / C.P)];
      const o = out[d - 1]; if (!o) continue;
      o.edif++; if (b.t === 'zonaR') o.pop += b.pop;
    }
    return out;
  };
  function comprobarVS() {
    const c = J.c; if (!c.vs || !c.mp || M.finVS) return;
    if (c.t.dia < c.mp.vsDias) return;
    M.finVS = true; c.mp.fin = true;
    const mk = M.marcador(), ids = Object.keys(mk).sort((a, b) => mk[b].pop - mk[a].pop || mk[b].edif - mk[a].edif);
    J.paneles.confeti();
    J.paneles.modal({ titulo: 'Fin de la competición', pausa: false, html: '<div class="lista">' + ids.map((id, i) => `<div class="item ${i === 0 ? 'hecho' : ''}"><div class="tit"><span>${i === 0 ? '★ ' : ''}${esc(c.mp.stats[id].nombre)}</span><em>${Math.round(mk[id].pop)} hab.</em></div><div class="txt">${mk[id].edif} edificios</div></div>`).join('') + '</div><p>Puedes seguir jugando en la misma sala.</p>', pie: '<button type="button" class="btn dorado foco" data-acc="ok">Continuar</button>', acc: { ok: (b, a) => a.cerrar() } });
  }

  // ---------------------------------------------------------------- interfaz: chip, jugadores, chat
  function crearChip() {
    let e = document.getElementById('multiChip');
    if (!e) {
      e = document.createElement('button'); e.type = 'button'; e.id = 'multiChip'; e.className = 'foco';
      e.innerHTML = '<span class="puntos"></span><b></b>'; e.addEventListener('click', () => { Audio.tocar('click'); panelJugadores(); });
      document.body.appendChild(e);
      const ch = document.createElement('button'); ch.type = 'button'; ch.id = 'chatBtn'; ch.className = 'ib foco'; ch.setAttribute('aria-label', 'Chat');
      ch.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>'; ch.addEventListener('click', () => { Audio.tocar('click'); panelChat(); });
      document.body.appendChild(ch);
    }
    e.classList.remove('oculto'); document.getElementById('chatBtn').classList.remove('oculto'); chip();
  }
  function chip() {
    const e = document.getElementById('multiChip'); if (!e) return;
    const on = M.activo && !J.enTitulo; e.classList.toggle('oculto', !on); document.getElementById('chatBtn').classList.toggle('oculto', !on);
    if (!on) return;
    const l = R().lista(), ping = M.esAnfitrion ? Math.max(0, ...l.filter((j) => j.id !== M.miId).map((j) => j.ping || 0)) : R().rtt || 0;
    e.querySelector('.puntos').innerHTML = l.map((j) => `<i style="background:${j.color}"></i>`).join('');
    const b = e.querySelector('b'); const t = l.length + ' · ' + Math.round(ping) + ' ms'; if (b.textContent !== t) b.textContent = t;
    e.className = 'foco ' + (ping < 80 ? 'b' : ping < 160 ? 'm' : 'a');
  }
  const hh = (t) => new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  function panelJugadores() {
    const html = (tab) => {
      const m = mp(), l = R().lista(); if (!m) return '';
      if (tab === 'registro') return '<div class="lista">' + (M.registro.length ? M.registro.slice().reverse().map((q) => { const s = m.stats[q.id] || {}; return `<div class="item"><div class="txt" style="color:var(--texto)"><b style="color:${s.color || '#fff'}">${esc(s.nombre || '?')}</b> ${esc(q.txt)} <small>${hh(q.t)}</small></div></div>`; }).join('') : '<p>Aún no hay acciones.</p>') + '</div>';
      const mk = J.c.vs ? M.marcador() : null;
      let h = '<div class="lista">' + l.map((j) => {
        const s = jugadorStats(j.id), p = m.perm[j.id], yo = j.id === M.miId;
        return `<div class="item"><div class="tit"><span style="color:${j.color}">● ${esc(j.nombre)}${j.id === 0 ? ' (anfitrión)' : ''}${yo ? ' (tú)' : ''}</span><em>${yo ? '' : Math.round(j.ping || 0) + ' ms'}</em></div>
          <div class="txt">${s.edif} edificios · ${dinero(s.gasto)} invertidos${mk && mk[j.id] ? ' · ' + Math.round(mk[j.id].pop) + ' hab.' : ''}</div>
          ${M.esAnfitrion && !yo ? `<div class="seg" style="margin-top:6px"><button type="button" class="btn mini foco ${p.demoler ? 'act' : ''}" data-acc="perm" data-id="${j.id}" data-k="demoler">Demoler: ${p.demoler ? 'sí' : 'no'}</button><button type="button" class="btn mini foco ${p.gastar ? 'act' : ''}" data-acc="perm" data-id="${j.id}" data-k="gastar">Gastar: ${p.gastar ? 'sí' : 'no'}</button><button type="button" class="btn mini foco" data-acc="presu" data-id="${j.id}">Tope: ${p.presu == null ? '∞' : dinero(p.presu)}</button></div>` : ''}</div>`;
      }).join('') + '</div>';
      if (J.c.vs) h += `<p>Gana quien tenga más habitantes en su distrito al llegar al día ${m.vsDias}. Ahora: día ${J.c.t.dia}.</p>`;
      h += `<div class="acciones"><button type="button" class="btn foco" data-acc="invitar">Invitar a otro alcalde</button></div>`;
      return h;
    };
    const api = J.paneles.modal({
      titulo: 'Alcaldes', ancho: true, tabs: [{ id: 'jug', nombre: 'Jugadores' }, { id: 'registro', nombre: 'Registro' }], tab: 'jug', html: html('jug'),
      alTab: (id, a) => a.rehacer(html(id)), vivo: (a) => a.rehacer(html(a.o.tab)),
      acc: {
        perm: (b, a) => { const id = +b.dataset.id, p = mp().perm[id]; p[b.dataset.k] = !p[b.dataset.k]; R().difundir('m_perm', { id, p }, { fiable: true }); a.rehacer(html('jug')); },
        presu: (b, a) => { const id = +b.dataset.id, p = mp().perm[id], o = [null, 2000, 5000, 20000]; p.presu = o[(o.indexOf(p.presu) + 1) % o.length]; R().difundir('m_perm', { id, p }, { fiable: true }); a.rehacer(html('jug')); },
        invitar: () => M.abrirLobby(),
      },
    });
    return api;
  }
  function panelChat() {
    const lista = () => M.chat.length ? M.chat.slice(-30).map((q) => `<div class="msg"><b style="color:${q.color}">${esc(q.nombre)}</b> ${esc(q.texto)}</div>`).join('') : '<p>Sin mensajes. Usa una frase rápida o escribe.</p>';
    const api = J.paneles.modal({
      titulo: 'Chat', hoja: true, inicial: '[data-acc="frase"]',
      html: `<div class="chatLog" id="chatLog">${lista()}</div><div class="frases">${FRASES.map((f, i) => `<button type="button" class="btn mini foco" data-acc="frase" data-i="${i}">${f}</button>`).join('')}</div><div class="campo fila" style="display:flex;gap:6px"><input id="chatIn" maxlength="120" placeholder="Escribe un mensaje" autocomplete="off" style="flex:1"><button type="button" class="btn mini primario foco" data-acc="enviar">Enviar</button></div>`,
      acc: {
        frase: (b) => R().chat(FRASES[+b.dataset.i]),
        enviar: (b, a) => { const i = a.el.querySelector('#chatIn'); if (i.value.trim()) { R().chat(i.value.trim()); i.value = ''; } },
      },
    });
    const log = api.el.querySelector('#chatLog'); log.scrollTop = 1e6;
    const h = () => { if (api.cerrado) { document.removeEventListener('metro-chat', h); return; } log.innerHTML = lista(); log.scrollTop = 1e6; };
    document.addEventListener('metro-chat', h);
    api.el.querySelector('#chatIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') api.el.querySelector('[data-acc="enviar"]').click(); });
    return api;
  }
  M.panelChat = panelChat; M.panelJugadores = panelJugadores;
  return M;
}
