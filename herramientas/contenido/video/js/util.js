/* Utilidades de interfaz. VE.h (crear nodos), VE.descargar, VE.$ */
(function (g) {
  var U = g.VE;
  U.$ = function (id) { return document.getElementById(id); };
  U.h = function (tag, attrs) {
    var el = document.createElement(tag), kids = [].slice.call(arguments, 2);
    if (attrs) for (var k in attrs) {
      var v = attrs[k]; if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v; else if (k === 'texto') el.textContent = v; else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'estilo') el.style.cssText = v; else if (k === 'valor') el.value = v; else if (v === true) el.setAttribute(k, ''); else el.setAttribute(k, v);
    }
    kids.forEach(function add(c) { if (c === null || c === undefined || c === false) return; if (Array.isArray(c)) return c.forEach(add); el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c))); });
    return el;
  };
  U.descargar = function (blob, nombre) {
    var a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 4000);
  };
  U.nombreSeguro = function (s) { return String(s || 'video').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'video'; };
  U.clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  U.dur = function (s) { s = Math.round(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
  U.tam = function (b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB'; };
})(window);
