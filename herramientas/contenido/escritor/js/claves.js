/* Claves de API solo en este dispositivo (localStorage), opcionalmente cifradas. Nunca se envian a otro servidor que no sea el del proveedor. */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else g.Claves = m; })(typeof self !== 'undefined' ? self : globalThis, function (g) {
  var CLAVE = 'contenido_escritor_claves_dispositivo';
  function crear(storage, cifrado) {
    var mem = {};
    cifrado = cifrado || g.Cifrado || require('./cifrado.js');
    function leer() { try { return JSON.parse(storage.getItem(CLAVE) || '{}') || {}; } catch (e) { return {}; } }
    function escribir(o) { storage.setItem(CLAVE, JSON.stringify(o)); }
    return {
      CLAVE: CLAVE,
      proveedores: function () { return Object.keys(leer()); },
      tiene: function (p) { return !!leer()[p]; },
      cifrada: function (p) { var e = leer()[p]; return !!(e && e.cifrada); },
      desbloqueada: function (p) { return !!mem[p] || (!!leer()[p] && !leer()[p].cifrada); },
      guardar: async function (p, clave, pass) {
        var o = leer();
        o[p] = pass ? { cifrada: await cifrado.cifrar(clave, pass) } : { texto: clave };
        escribir(o); mem[p] = clave;
      },
      obtener: async function (p, pass) {
        if (mem[p]) return mem[p];
        var e = leer()[p]; if (!e) return null;
        if (e.texto) return e.texto;
        if (!pass) throw new Error('La clave está cifrada: introduce la contraseña');
        mem[p] = await cifrado.descifrar(e.cifrada, pass); return mem[p];
      },
      bloquear: function () { mem = {}; },
      borrar: function (p) { var o = leer(); delete o[p]; delete mem[p]; escribir(o); },
      borrarTodo: function () { mem = {}; storage.removeItem(CLAVE); }
    };
  }
  return { crear: crear, CLAVE: CLAVE };
});
