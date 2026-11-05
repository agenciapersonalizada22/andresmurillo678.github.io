/* Cifrado de claves: AES-GCM 256 con clave derivada por PBKDF2-SHA256. */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else g.Cifrado = m; })(typeof self !== 'undefined' ? self : globalThis, function (g) {
  var IT = 210000;
  function sub() { return (g.crypto || require('crypto').webcrypto).subtle; }
  function rnd(n) { return (g.crypto || require('crypto').webcrypto).getRandomValues(new Uint8Array(n)); }
  function aB64(u) { var s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function deB64(b) { var s = atob(b), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  async function derivar(pass, sal, it) {
    var base = await sub().importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return sub().deriveKey({ name: 'PBKDF2', salt: sal, iterations: it, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function cifrar(texto, pass) {
    if (!pass) throw new Error('Falta la contraseña');
    var sal = rnd(16), iv = rnd(12), k = await derivar(pass, sal, IT);
    var c = await sub().encrypt({ name: 'AES-GCM', iv: iv }, k, new TextEncoder().encode(texto));
    return { v: 1, it: IT, s: aB64(sal), i: aB64(iv), c: aB64(new Uint8Array(c)) };
  }
  async function descifrar(obj, pass) {
    try {
      var k = await derivar(pass, deB64(obj.s), obj.it || IT);
      var p = await sub().decrypt({ name: 'AES-GCM', iv: deB64(obj.i) }, k, deB64(obj.c));
      return new TextDecoder().decode(p);
    } catch (e) { throw new Error('Contraseña incorrecta o datos dañados'); }
  }
  return { cifrar: cifrar, descifrar: descifrar };
});
