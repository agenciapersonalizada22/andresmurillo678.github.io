/* Cuenta y nube para una herramienta (misma copia en mercados/, apuestas/ y ofertas/; la logica pura se prueba en Node).
   Sincroniza lo PERSONAL de la herramienta con Cuenta.nube mediante una instantanea JSON {v:1, reg:{clave:{v,t,d?}}}:
   cada registro lleva marca de tiempo `t` (ms) y `d:true` si es una lapida de borrado; al fusionar gana el registro mas reciente.
   Cuenta.nube.autoSincronizar solo lee/escribe claves de localStorage; estas herramientas guardan en IndexedDB, asi que se usa
   Cuenta.nube.cargar/guardar directamente (sin espejo). Las claves `*claves_dispositivo*` (claves de API del usuario) JAMAS se sincronizan.
   Proveedor: { id, nombre, permitida(k)->bool, leer()->Promise<{k:{v,t,d?}}>, aplicar(mapa)->Promise, suscribir(cb), alAplicar(n, primera) }. */
(function (g) {
  var LIMITE = 900 * 1024, LAPIDA_MS = 30 * 86400000;
  var P = {};

  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + ':' + s.length; }
  function esClaveDispositivo(k) { return /claves_dispositivo/.test(String(k)); }
  function limpiar(mapa, permitida) {
    var o = {}; Object.keys(mapa || {}).forEach(function (k) {
      var r = mapa[k]; if (esClaveDispositivo(k) || (permitida && !permitida(k)) || !r || typeof r.t !== 'number') return;
      o[k] = r.d ? { d: true, t: r.t } : { v: r.v, t: r.t };
    });
    return o;
  }
  /* local y nube: mapas {k:{v,t,d?}} -> { resultado, paraLocal, cambiaNube } (gana el t mayor; empate: se conserva lo local) */
  function fusionar(local, nube) {
    var res = {}, paraLocal = {}, cambiaNube = false, ks = {};
    Object.keys(local || {}).forEach(function (k) { ks[k] = 1; }); Object.keys(nube || {}).forEach(function (k) { ks[k] = 1; });
    Object.keys(ks).forEach(function (k) {
      var l = local && local[k], n = nube && nube[k];
      if (l && !n) { res[k] = l; cambiaNube = true; }
      else if (n && !l) { res[k] = n; if (!n.d) paraLocal[k] = n; }
      else if (n.t > l.t) { res[k] = n; paraLocal[k] = n; }
      else { res[k] = l; if (l.t > n.t) cambiaNube = true; }
    });
    return { resultado: res, paraLocal: paraLocal, cambiaNube: cambiaNube };
  }
  /* quita lapidas viejas y comprueba el tope (~900 KB por documento); devuelve {reg, bytes, ok} */
  function ajustar(reg, ahora) {
    ahora = ahora || Date.now(); var o = {};
    Object.keys(reg).forEach(function (k) { if (reg[k].d && ahora - reg[k].t > LAPIDA_MS) return; o[k] = reg[k]; });
    var bytes = JSON.stringify({ v: 1, reg: o }).length;
    return { reg: o, bytes: bytes, ok: bytes <= LIMITE };
  }
  /* t efectivo: si el contenido no cambio desde la ultima vez, se conserva su t original (los refrescos que reescriben lo mismo no cuentan) */
  function tEfectivo(meta, k, v, tAlmacen) {
    var h = hash(JSON.stringify(v === undefined ? null : v)), m = meta[k];
    if (m && m.h === h) return m.t;
    meta[k] = { h: h, t: tAlmacen }; return tAlmacen;
  }
  P.hash = hash; P.fusionar = fusionar; P.ajustar = ajustar; P.limpiar = limpiar; P.tEfectivo = tEfectivo; P.LIMITE = LIMITE; P.esClaveDispositivo = esClaveDispositivo;

  /* ---------- parte de navegador ---------- */
  var est = { estado: 'sinSesion', ultima: 0, mensaje: '', pendiente: false }, escuchas = [], prov = null, ocupado = false, repetir = false, primera = true, temporizador = null;
  function avisar() { escuchas.forEach(function (f) { try { f(est); } catch (e) {} }); }
  function poner(e, m) { est.estado = e; est.mensaje = m || ''; avisar(); }
  function C() { return g.Cuenta; }
  function sesion() { return C() && C().usuario; }
  function claveMeta() { return prov.id + '_nube_meta'; }
  function leerMeta() { try { return JSON.parse(localStorage.getItem(claveMeta()) || '{}'); } catch (e) { return {}; } }
  function guardarMeta(m) { try { localStorage.setItem(claveMeta(), JSON.stringify(m)); } catch (e) {} }

  async function sincronizar() {
    if (!prov || !sesion()) return null;
    if (ocupado) { repetir = true; return null; }
    ocupado = true; poner('sincronizando');
    try {
      if (navigator.onLine === false) { poner('sinRed', 'Sin conexión: los cambios se enviarán al volver la red.'); return null; }
      var meta = leerMeta(), crudo = await prov.leer(), local = {};
      Object.keys(crudo).forEach(function (k) {
        var r = crudo[k]; if (!r) return;
        local[k] = r.d ? { d: true, t: r.t } : { v: r.v, t: tEfectivo(meta, k, r.v, r.t) };
      });
      local = limpiar(local, prov.permitida);
      var nube = {};
      try {
        var d = await C().nube.cargar(prov.id);
        nube = limpiar(d && d.reg, prov.permitida);
      } catch (e) {
        if (e && e.codigo === 'sin_red') { poner('sinRed', 'Sin conexión con la nube.'); return null; }
        throw e;
      }
      var f = fusionar(local, nube), n = Object.keys(f.paraLocal).length;
      if (n) {
        await prov.aplicar(f.paraLocal);
        Object.keys(f.paraLocal).forEach(function (k) { var r = f.paraLocal[k]; if (r.d) delete meta[k]; else meta[k] = { h: hash(JSON.stringify(r.v === undefined ? null : r.v)), t: r.t }; });
      }
      guardarMeta(meta);
      var pend = false;
      if (f.cambiaNube) {
        var aj = ajustar(f.resultado);
        if (!aj.ok) { poner('error', 'Tus datos superan el límite de la nube (900 KB). Siguen guardados en este dispositivo.'); return null; }
        var r = await C().nube.guardar(prov.id, { v: 1, reg: aj.reg });
        pend = !!(r && r.pendiente);
      }
      est.ultima = Date.now(); est.pendiente = pend;
      poner(pend ? 'pendiente' : 'ok', pend ? 'Pendiente de enviar (sin conexión).' : '');
      if (n && prov.alAplicar) { try { prov.alAplicar(n, primera); } catch (e) { console.error(e); } }
      primera = false;
      return { aplicados: n, subido: f.cambiaNube };
    } catch (e) {
      poner('error', (C() && C().mensajeError ? C().mensajeError(e) : '') || 'No se pudo sincronizar.');
      return null;
    } finally {
      ocupado = false; if (repetir) { repetir = false; setTimeout(sincronizar, 800); }
    }
  }
  function sucio() { if (!prov || !sesion()) return; clearTimeout(temporizador); temporizador = setTimeout(sincronizar, 4000); }

  P.estado = est;
  P.alCambiar = function (f) { escuchas.push(f); try { f(est); } catch (e) {} return function () { escuchas = escuchas.filter(function (x) { return x !== f; }); }; };
  P.ahora = sincronizar;
  /* Arranca la sincronizacion (sin sesion o sin Cuenta no hace nada: la herramienta sigue funcionando local). */
  P.iniciar = function (proveedor) {
    prov = proveedor;
    if (!C()) { poner('sinSesion', 'Cuenta no disponible.'); return Promise.resolve(); }
    return C().iniciar().then(function () {
      if (!sesion()) { poner('sinSesion'); return; }
      if (prov.suscribir) prov.suscribir(sucio);
      setInterval(sincronizar, 60000);
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') sincronizar(); });
      addEventListener('pagehide', sincronizar); addEventListener('online', sincronizar);
      return sincronizar();
    }).catch(function () { poner('error', 'No se pudo iniciar la cuenta.'); });
  };

  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function cuando(t) { if (!t) return 'todavía no'; var s = Math.round((Date.now() - t) / 1000); return s < 10 ? 'ahora mismo' : s < 90 ? 'hace ' + s + ' s' : s < 5400 ? 'hace ' + Math.round(s / 60) + ' min' : new Date(t).toLocaleString('es'); }
  var TXT = { sinSesion: 'Sin sesión', sincronizando: 'Sincronizando…', ok: 'Sincronizado', pendiente: 'Pendiente de enviar', sinRed: 'Sin conexión', error: 'Error de sincronización' };

  /* Bloque "Cuenta y nube" para Ajustes. opciones: { claseBtn } */
  P.bloque = function (o) {
    o = o || {}; var cb = o.claseBtn || 'btn';
    var raiz = el('div', 'cnube'); raiz.setAttribute('data-cuenta-nube', '');
    var tit = el('h3', 'cnube-t', 'Cuenta y nube'), usr = el('div', 'cnube-u'), es = el('div', 'cnube-e'), nota = el('div', 'cnube-n');
    var fila = el('div', 'cnube-f');
    var bs = el('button', cb, 'Sincronizar ahora'); bs.type = 'button'; bs.setAttribute('data-sinc', '');
    var bp = el('a', cb, 'Volver al portal'); bp.href = C() && C().portalUrl ? C().portalUrl() : '../../juego/';
    var bo = el('button', cb, 'Cerrar sesión'); bo.type = 'button';
    bs.onclick = function () { if (!sesion()) return; sincronizar(); };
    bo.onclick = function () { if (C() && C().salir) C().salir().then(function () { location.reload(); }, function () { location.reload(); }); };
    fila.appendChild(bs); fila.appendChild(bp); fila.appendChild(bo);
    nota.textContent = 'Se sincronizan listas, alertas, registros y carteras (lo más reciente gana). Tus claves de API y los ajustes de pantalla nunca salen de este dispositivo.';
    raiz.appendChild(tit); raiz.appendChild(usr); raiz.appendChild(es); raiz.appendChild(fila); raiz.appendChild(nota);
    function pintar() {
      var u = sesion();
      usr.textContent = u ? 'Sesión: ' + u.nombre + (C().demo ? ' · modo demo (solo este dispositivo)' : '') : 'Sin sesión (modo local, sin nube).';
      es.textContent = (TXT[est.estado] || est.estado) + (est.ultima ? ' · última vez ' + cuando(est.ultima) : '') + (est.mensaje ? ' · ' + est.mensaje : '');
      bs.disabled = !u || est.estado === 'sincronizando'; bo.hidden = !u;
    }
    var baja = P.alCambiar(pintar), t = setInterval(function () { if (!document.body.contains(raiz)) { clearInterval(t); baja(); } else pintar(); }, 15000);
    return raiz;
  };
  /* Insignia con el nombre de la cuenta (para la cabecera). opciones: { clase, alClic } */
  P.chip = function (o) {
    o = o || {}; var b = el('button', o.clase || 'chip', ''); b.type = 'button'; b.hidden = true; b.setAttribute('data-cuenta-chip', '');
    b.title = 'Cuenta y nube'; if (o.alClic) b.onclick = o.alClic;
    function pintar() { var u = sesion(); b.hidden = !u; if (!u) return; b.textContent = u.nombre + (est.estado === 'sinRed' ? ' · sin red' : est.estado === 'pendiente' ? ' · pendiente' : ''); b.setAttribute('aria-label', 'Cuenta ' + u.nombre + '. ' + (TXT[est.estado] || '')); if (u.color) b.style.borderLeft = '4px solid ' + u.color; }
    P.alCambiar(pintar); if (C() && C().alCambiar) C().alCambiar(pintar); pintar(); return b;
  };
  (function () {
    if (typeof document === 'undefined' || document.getElementById('cnube-css')) return;
    var s = document.createElement('style'); s.id = 'cnube-css';
    s.textContent = '.cnube{border:1px solid rgba(128,128,128,.35);border-radius:10px;padding:12px;margin:12px 0}.cnube-t{margin:0 0 6px}.cnube-u{font-weight:600}.cnube-e,.cnube-n{opacity:.8;font-size:.9em;margin-top:4px}.cnube-f{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 4px}[data-cuenta-chip]{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:0 1 auto}.cnube-f a{text-decoration:none;display:inline-flex;align-items:center}';
    (document.head || document.documentElement).appendChild(s);
  })();

  if (typeof module !== 'undefined' && module.exports) module.exports = P; else g.CuentaNube = P;
})(typeof window !== 'undefined' ? window : globalThis);
