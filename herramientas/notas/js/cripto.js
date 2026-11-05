/* Cifrado de notas: AES-GCM 256 con clave derivada por PBKDF2-SHA256 (Web Crypto). Sin recuperacion posible de la contrasena. */
(function (G) {
  'use strict';
  var U = G.Util || require('./util.js');
  var subtle = (G.crypto || require('crypto').webcrypto).subtle, rnd = (G.crypto || require('crypto').webcrypto);
  var C = { ITER: 210000 };
  C.derivar = function (pass, salt, it) {
    return subtle.importKey('raw', U.utf8(pass), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: it || C.ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  };
  C.nuevaSal = function () { return rnd.getRandomValues(new Uint8Array(16)); };
  C.cifrarCon = function (clave, sal, it, texto) {
    var iv = rnd.getRandomValues(new Uint8Array(12));
    return subtle.encrypt({ name: 'AES-GCM', iv: iv }, clave, U.utf8(texto)).then(function (ct) {
      return { v: 1, kdf: 'PBKDF2-SHA256', it: it || C.ITER, s: U.b64(sal), i: U.b64(iv), d: U.b64(new Uint8Array(ct)) };
    });
  };
  C.descifrarCon = function (clave, o) {
    return subtle.decrypt({ name: 'AES-GCM', iv: U.deB64(o.i) }, clave, U.deB64(o.d)).then(function (pt) { return U.deUtf8(pt); },
      function () { throw new Error('Contraseña incorrecta o datos dañados'); });
  };
  C.cifrar = function (texto, pass, it) {
    var sal = C.nuevaSal(); it = it || C.ITER;
    return C.derivar(pass, sal, it).then(function (k) { return C.cifrarCon(k, sal, it, texto); });
  };
  C.descifrar = function (o, pass) {
    if (!o || o.v !== 1) return Promise.reject(new Error('Formato no válido'));
    return C.derivar(pass, U.deB64(o.s), o.it).then(function (k) { return C.descifrarCon(k, o); });
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = C; else G.Cripto = C;
})(typeof window !== 'undefined' ? window : globalThis);
