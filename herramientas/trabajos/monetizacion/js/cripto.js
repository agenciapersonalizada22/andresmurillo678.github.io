/* Cifrado local de datos financieros: PBKDF2-SHA256 -> AES-GCM 256 (WebCrypto). La frase nunca se guarda ni se envia. window.MonCripto */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else g.MonCripto = m; })(typeof self !== 'undefined' ? self : this, function (g) {
  'use strict';
  var W = (g.crypto && g.crypto.subtle) ? g.crypto : (typeof require === 'function' ? require('node:crypto').webcrypto : null);
  var IT = 250000, enc = new TextEncoder(), dec = new TextDecoder();
  function b64(u) { var s = ''; for (var i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return (g.btoa || function (x) { return Buffer.from(x, 'binary').toString('base64'); })(s); }
  function deb64(s) { var b = (g.atob || function (x) { return Buffer.from(x, 'base64').toString('binary'); })(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  async function clave(frase, sal, it) {
    var base = await W.subtle.importKey('raw', enc.encode(frase), 'PBKDF2', false, ['deriveKey']);
    return W.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: it, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  var M = { disponible: !!W, IT: IT };
  M.cifrar = async function (obj, frase, it) {
    if (!W) throw new Error('Este navegador no tiene WebCrypto.');
    if (!frase || frase.length < 8) throw new Error('La frase debe tener al menos 8 caracteres.');
    it = it || IT;
    var sal = W.getRandomValues(new Uint8Array(16)), iv = W.getRandomValues(new Uint8Array(12)), k = await clave(frase, sal, it);
    var ct = new Uint8Array(await W.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, enc.encode(JSON.stringify(obj))));
    return { v: 1, alg: 'AES-GCM-256', kdf: 'PBKDF2-SHA256', it: it, salt: b64(sal), iv: b64(iv), ct: b64(ct) };
  };
  M.descifrar = async function (paq, frase) {
    if (!W) throw new Error('Este navegador no tiene WebCrypto.');
    if (!paq || paq.alg !== 'AES-GCM-256') throw new Error('Formato de cifrado desconocido.');
    var k = await clave(frase, deb64(paq.salt), paq.it || IT);
    try { return JSON.parse(dec.decode(await W.subtle.decrypt({ name: 'AES-GCM', iv: deb64(paq.iv) }, k, deb64(paq.ct)))); }
    catch (e) { throw new Error('Frase incorrecta o datos dañados.'); }
  };
  return M;
});
