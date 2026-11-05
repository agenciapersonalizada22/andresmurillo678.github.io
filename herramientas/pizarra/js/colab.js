// Colaboracion P2P en tiempo real sobre Red (WebRTC, estrella con el anfitrion como relevo):
// operaciones CRDT, sincronizacion inicial, cursores, trazos en vivo, laser, presentacion y permisos.
import { compactarOps } from './modelo.js';
import { MAX_MSG } from './config.js';
import { simplificarPlano } from './geom.js';

const lote = (ops, max = MAX_MSG) => {   // reparte operaciones en mensajes que caben en la red
  const res = []; let cur = [], tam = 2;
  for (const op of ops) {
    const t = JSON.stringify(op).length + 1;
    if (cur.length && tam + t > max) { res.push(cur); cur = []; tam = 2; }
    cur.push(op); tam += t;
  }
  if (cur.length) res.push(cur);
  return res;
};

const luz = c => { const m = /^#([0-9a-f]{6})$/i.exec(c || ''); if (!m) return 0; const n = parseInt(m[1], 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };

export function crearColab(app) {
  const doc = app.doc, vista = app.vista;
  const C = { activo: false, ro: {}, remotos: new Map(), presentador: null, siguiendo: true, cola: [], timerCola: 0, parciales: new Map(), pedidos: new Set(), recibiendo: null, terminados: [] };
  const R = () => window.Red;
  const yo = () => R().miId;
  const conectado = () => R() && R().conectado;
  const soyHost = () => R().esAnfitrion;
  const nombreDe = id => { const j = R().jugadores[id]; return j ? j.nombre : 'Alguien'; };
  const colorDe = id => { const j = R().jugadores[id]; return j ? j.color : '#3b82f6'; };
  const rem = id => { let r = C.remotos.get(id); if (!r) { r = { cur: null, vivo: new Map(), lasers: [] }; C.remotos.set(id, r); } return r; };
  C.nombreDe = nombreDe; C.colorDe = colorDe;
  C.soloLectura = () => conectado() && !soyHost() && !!C.ro[yo()];
  C.jugadores = () => (conectado() ? R().lista() : []);

  // ----- envio -----
  const difundir = (t, d, fiable = true) => { if (conectado()) R().difundir(t, d, { fiable }); };
  C.enviarOps = ops => {
    if (!C.activo || !conectado()) return;
    C.cola.push(...ops);
    if (!C.timerCola) C.timerCola = setTimeout(flush, 35);
  };
  function flush() {
    C.timerCola = 0;
    const ops = compactarOps(C.cola); C.cola = [];
    for (const l of lote(ops)) { if (soyHost()) R().difundir('ops', { o: l }); else R().enviar('ops', { o: l }); }
  }
  C.vivo = (s, fin) => {
    if (!C.activo || !conectado()) return;
    if (fin) { difundir('vivo', { v: s.id, fin: 1 }); return; }
    const nuevos = s.pts.slice(s.enviados || 0);
    const d = { v: s.id, i: s.enviados || 0, p: nuevos.map(n => Math.round(n * 10) / 10), c: s.color, g: s.grosor, r: s.res ? 1 : 0, pg: vista.pg, f: s.reconocida || null };
    s.enviados = s.pts.length;
    difundir('vivo', d, false);
  };
  C.laser = s => { if (!C.activo || !conectado()) return; const p = s.pts.slice(-4).map(q => [Math.round(q[0]), Math.round(q[1])]); difundir('las', { p, pg: vista.pg }, false); };
  let tCur = 0;
  C.cursor = (wx, wy) => {
    if (!C.activo || !conectado()) return;
    const t = performance.now(); if (t - tCur < 40 && wx != null) return; tCur = t;
    difundir('cur', wx == null ? { fuera: 1 } : { x: Math.round(wx), y: Math.round(wy), pg: vista.pg }, false);
  };
  C.lasers = () => { const out = []; for (const r of C.remotos.values()) for (const s of r.lasers) if (s.pg === vista.pg) out.push(s); return out; };

  // ----- assets (imagenes) en trozos -----
  const TROZO = 9000;
  C.enviarAsset = (id, data, a) => {
    if (!C.activo || !conectado()) return;
    const n = Math.ceil(data.length / TROZO);
    for (let i = 0; i < n; i++) {
      const d = { id, i, n, d: data.slice(i * TROZO, (i + 1) * TROZO) };
      if (a != null) R().enviar('asset', d, { a }); else R().difundir('asset', d);
    }
  };
  C.pedirAsset = id => { if (!C.activo || !conectado() || soyHost() || C.pedidos.has(id)) return; C.pedidos.add(id); R().enviar('pedirAsset', { id }); };

  // ----- sincronizacion inicial -----
  function enviarEstado(a) {
    const ops = doc.aOps(), lotes = lote(ops);
    R().enviar('tab', { id: app.tableroId, titulo: doc.meta('titulo') || 'Tablero', ro: C.ro, pres: C.presentador }, { a });
    let i = 0;
    const paso = () => {
      if (!conectado()) return;
      for (let k = 0; k < 6 && i < lotes.length; k++, i++) R().enviar('sync', { i, n: lotes.length, o: lotes[i] }, { a });
      if (i < lotes.length) setTimeout(paso, 12);
      else { R().enviar('syncFin', { assets: Object.keys(app.assets) }, { a }); }
    };
    if (!lotes.length) R().enviar('syncFin', { assets: [] }, { a }); else paso();
  }
  function enviarTodoAlHost() {
    for (const l of lote(doc.aOps())) R().enviar('ops', { o: l });
    for (const [id, d] of Object.entries(app.assets)) C.enviarAsset(id, d);
  }

  // ----- mensajes -----
  function alMensaje(tipo, d, de) {
    if (!C.activo && !['tab'].includes(tipo)) return;
    switch (tipo) {
      case 'tab': {
        if (window.Lobby && window.Lobby.abierto) window.Lobby.cerrar(true);
        C.activo = true; C.ro = d.ro || {}; C.presentador = d.pres == null ? null : d.pres;
        const p = app.abrirCompartido(d.id, d.titulo).then(tenia => { C.teniaLocal = tenia; app.ui.colabCambio(); });
        C.cargando = p; break;
      }
      case 'sync': case 'syncFin': case 'ops': case 'asset': {
        if (C.cargando) { C.cargando = C.cargando.then(() => procesar(tipo, d, de)); } else procesar(tipo, d, de);
        break;
      }
      case 'pedirAsset': if (soyHost() && app.assets[d.id]) C.enviarAsset(d.id, app.assets[d.id], de); break;
      case 'perm': C.ro = d.ro || {}; app.ui.colabCambio(); break;
      case 'cur': { const r = rem(de); r.cur = d.fuera ? null : { x: d.x, y: d.y, pg: d.pg, t: performance.now() }; vista.superior(); break; }
      case 'vivo': {
        const r = rem(de);
        if (d.fin) { r.vivo.delete(d.v); C.terminados.push(d.v); if (C.terminados.length > 300) C.terminados.shift(); vista.superior(); break; }
        if (C.terminados.includes(d.v)) break;
        let s = r.vivo.get(d.v);
        if (!s || d.i === 0) { s = { id: d.v, pts: [], color: d.c, grosor: d.g, res: !!d.r, pg: d.pg }; r.vivo.set(d.v, s); }
        if (d.i <= s.pts.length) s.pts.length = d.i, s.pts.push(...d.p);
        s.reconocida = d.f; s.t = performance.now(); s.pg = d.pg; vista.superior(); break;
      }
      case 'las': { const r = rem(de), t = performance.now(); let s = r.lasers[r.lasers.length - 1]; if (!s || t - s.ult > 400) { s = { pts: [], color: colorDe(de), pg: d.pg, ult: t }; r.lasers.push(s); if (r.lasers.length > 4) r.lasers.shift(); } s.pg = d.pg; s.ult = t; for (const q of d.p) s.pts.push([q[0], q[1], t]); vista.animar(30); break; }
      case 'pres': presentacion(d, de); break;
    }
  }
  function procesar(tipo, d, de) {
    if (tipo === 'ops') {
      if (soyHost() && C.ro[de]) return;
      const aplicadas = d.o.filter(op => op && op.k && op.p);
      const hechas = doc.aplicarVarias(aplicadas);
      app.persistir(aplicadas);
      if (soyHost()) for (const j of R().lista()) if (j.id !== 0 && j.id !== de) R().enviar('ops', { o: d.o }, { a: j.id });
      for (const op of aplicadas) if (op.k === 'o') for (const f of ['trazo']) { /* trazos vivos se limpian al llegar el objeto */ }
      limpiarVivos(aplicadas);
      app.ui.colabCambio(true);
    } else if (tipo === 'sync') {
      const hechas = doc.aplicarVarias(d.o); app.persistir(d.o); limpiarVivos(d.o);
    } else if (tipo === 'syncFin') {
      app.ui.refrescarTodo();
      if (C.teniaLocal) { enviarTodoAlHost(); C.teniaLocal = false; }
      for (const id of d.assets) if (!app.assets[id]) { /* se piden al necesitarlos */ }
    } else if (tipo === 'asset') {
      let p = C.parciales.get(d.id); if (!p) { p = { n: d.n, partes: [], c: 0 }; C.parciales.set(d.id, p); }
      if (p.partes[d.i] == null) { p.partes[d.i] = d.d; p.c++; }
      if (p.c === p.n) { C.parciales.delete(d.id); const data = p.partes.join(''); app.recibirAsset(d.id, data); if (soyHost() && de !== 0) for (const j of R().lista()) if (j.id !== 0 && j.id !== de) C.enviarAsset(d.id, data, j.id); }
    }
  }
  function limpiarVivos(ops) {
    for (const op of ops) if (op.k === 'o' && op.p.tipo) for (const r of C.remotos.values()) if (r.vivo.delete(op.id)) vista.superior();
  }

  // ----- presentacion -----
  C.presentar = on => {
    if (!conectado()) return;
    C.presentador = on ? yo() : null;
    difundir('pres', on ? { on: 1, ...vistaActual() } : { on: 0 });
    app.ui.colabCambio();
  };
  const vistaActual = () => { const c = vista.cam; return { pg: vista.pg, cx: Math.round(c.x + vista.W / c.z / 2), cy: Math.round(c.y + vista.H / c.z / 2), ww: Math.round(vista.W / c.z), wh: Math.round(vista.H / c.z) }; };
  let tPres = 0;
  C.vistaCambio = () => {
    if (!C.activo || C.presentador !== yo() || !conectado()) return;
    const t = performance.now(); if (t - tPres < 90) { clearTimeout(C._tp); C._tp = setTimeout(C.vistaCambio, 100); return; } tPres = t;
    difundir('pres', { on: 1, ...vistaActual() }, false);
  };
  function presentacion(d, de) {
    if (!d.on) { if (C.presentador === de) C.presentador = null; app.ui.colabCambio(); return; }
    const nuevo = C.presentador !== de; C.presentador = de;
    if (nuevo) app.ui.colabCambio();
    if (!C.siguiendo || de === yo()) return;
    if (d.pg && d.pg !== vista.pg && doc.ent.p.get(d.pg)) app.irPagina(d.pg, true);
    const z = Math.min(vista.W / d.ww, vista.H / d.wh), c = vista.cam;
    c.z = z; c.x = d.cx - vista.W / z / 2; c.y = d.cy - vista.H / z / 2; vista.camCambio();
  }

  // ----- permisos -----
  C.fijarSoloLectura = (id, b) => { if (!soyHost()) return; C.ro = { ...C.ro, [id]: !!b }; difundir('perm', { ro: C.ro }); app.ui.colabCambio(); };

  // ----- ciclo de vida -----
  C.iniciar = () => {
    const red = R(); if (!red || C.enlazado) return; C.enlazado = true;
    red.on('mensaje', alMensaje);
    red.on('jugadorUnido', id => {
      if (!soyHost()) return;
      C.activo = true;
      if (app.ajustes.invitadosLectura) C.ro[id] = true;
      app.ui.colabCambio();
      enviarEstado(id);
      difundir('perm', { ro: C.ro });
      if (C.presentador === 0) R().enviar('pres', { on: 1, ...vistaActual() }, { a: id });
    });
    red.on('jugadorSalio', id => { C.remotos.delete(id); if (C.presentador === id) C.presentador = null; delete C.ro[id]; app.ui.colabCambio(); vista.superior(); });
    red.on('jugadores', () => app.ui.colabCambio());
    red.on('cerrado', () => { C.activo = false; C.remotos.clear(); C.presentador = null; C.ro = {}; app.ui.colabCambio(); vista.superior(); app.aviso('Colaboración terminada'); });
    red.on('conectado', () => { C.activo = true; app.ui.colabCambio(); });
  };
  C.alIniciarLobby = () => { const ya = C.activo && C.iniciado; C.activo = C.iniciado = true; app.ui.colabCambio(); if (!ya) app.aviso('Colaboración activa'); };

  // limpieza de vivos obsoletos + capa de dibujo
  setInterval(() => {
    const t = performance.now(); let cambio = false;
    for (const r of C.remotos.values()) {
      for (const [k, s] of r.vivo) if (t - s.t > 6000) { r.vivo.delete(k); cambio = true; }
      if (r.cur && t - r.cur.t > 8000) { r.cur = null; cambio = true; }
      r.lasers = r.lasers.filter(s => t - s.ult < 1500);
    }
    if (cambio) vista.superior();
  }, 1500);
  vista.capasSup.push((ctx, v) => {
    if (!C.activo) return;
    ctx.save(); v.aplicar(ctx);
    for (const r of C.remotos.values()) for (const s of r.vivo.values()) if (s.pg === v.pg) { ctx.save(); app.herr.dibujarVivo(ctx, s); ctx.restore(); }
    ctx.restore();
    for (const [id, r] of C.remotos) {
      const c = r.cur; if (!c || c.pg !== v.pg) continue;
      const [x, y] = v.pantalla(c.x, c.y), col = colorDe(id), n = nombreDe(id);
      ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y + 17); ctx.lineTo(x + 8, y + 12); ctx.lineTo(x + 15, y + 11); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.font = '600 12px system-ui, sans-serif'; const w = ctx.measureText(n).width + 12;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 14, y + 16, w, 20, 10) : ctx.rect(x + 14, y + 16, w, 20); ctx.fill();
      ctx.fillStyle = luz(col) > 0.62 ? '#111' : '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(n, x + 20, y + 26);
    }
  });
  return C;
}
