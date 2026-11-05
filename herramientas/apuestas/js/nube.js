/* Proveedor de sincronizacion de Apuestas: registro de apuestas (con lapidas) y la parte personal de los ajustes
   (banca inicial, unidad, Kelly, limites de perdida/tiempo, autoexclusion, reglas de alerta). Quedan fuera: tema, formato, moneda,
   modo demo, capturas de cuotas (datos de mercado) y cualquier `claves_dispositivo*`. */
(function (g) {
  if (!g.CuentaNube || !g.Apuestas) return;
  var A = g.Apuestas, PRE = 'apuestas:', CFG = 'cfg_personal';
  var CAMPOS = ['bancaInicial', 'unidad', 'bancaArbitraje', 'fraccionKelly', 'minEdge', 'referencia', 'metodo', 'limites', 'autoexclusion', 'edad', 'reglas', 'meta'];
  var aplicando = false, ultimoCfg = '';
  function subset(cfg) { var o = {}; CAMPOS.forEach(function (k) { if (cfg && cfg[k] !== undefined) o[k] = cfg[k]; }); return o; }
  function E() { return A.estado; }
  g.CuentaNube.proveedor = {
    id: 'apuestas',
    permitida: function (k) { return k === CFG || /^apuestas:.+/.test(k); },
    leer: function () {
      var st = E().almacen(), o = {};
      return st.lista('apuestas', { todo: true }).then(function (l) {
        l.forEach(function (v) {
          if (v._borrado) o[PRE + v.id] = { d: true, t: v._t };
          else { var c = {}; for (var k in v) if (k !== '_t' && k !== '_borrado') c[k] = v[k]; o[PRE + v.id] = { v: c, t: v._t }; }
        });
        return st.get('ajustes', 'cfg');
      }).then(function (cfg) { if (cfg) o[CFG] = { v: subset(cfg), t: cfg._t || 0 }; return o; });
    },
    aplicar: function (mapa) {
      var st = E().almacen(), regs = [];
      aplicando = true;
      Object.keys(mapa).forEach(function (k) {
        if (k === CFG) return; var r = mapa[k], id = k.slice(PRE.length);
        if (r.d) regs.push({ id: id, _t: r.t, _borrado: true }); else { var v = {}; for (var f in r.v) v[f] = r.v[f]; v.id = id; v._t = r.t; regs.push(v); }
      });
      return st.mezclar('apuestas', regs).then(function () {
        var p = mapa[CFG]; return p ? E().guardarCfg(p.v) : null;
      }).then(function () { return st.lista('apuestas'); }).then(function (l) {
        A.S.apuestas = l; E().avisar('apuestas'); E().avisar('cfg'); aplicando = false;
      }, function (e) { aplicando = false; throw e; });
    },
    suscribir: function (cb) {
      E().almacen().suscribir(function (col) {
        if (aplicando) return;
        if (col === 'ajustes') { var h = JSON.stringify(subset(A.S.cfg)); if (h === ultimoCfg) return; ultimoCfg = h; }
        if (col === 'apuestas' || col === 'ajustes') cb();
      });
      ultimoCfg = JSON.stringify(subset(A.S.cfg));
    },
    alAplicar: function (n) { if (A.ui && A.ui.toast) A.ui.toast('Datos sincronizados desde tu cuenta (' + n + ')'); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
