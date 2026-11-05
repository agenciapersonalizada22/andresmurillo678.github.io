window.U = (function () {
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg, ms) {
    var c = $('#toasts'); if (!c) return;
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; c.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 3500);
  }
  function fmtFecha(ts) { var d = new Date(ts); return d.toLocaleDateString('es', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); }
  function usd(n) { return n == null ? '—' : '$' + (n < 0.01 ? n.toFixed(5) : n.toFixed(4)); }
  function copiar(t) {
    return (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).catch(function () {
      var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove();
    });
  }
  function abrirDialogo(d) { if (!d.open) d.showModal ? d.showModal() : d.setAttribute('open', ''); }
  function cerrarDialogo(d) { if (d.open) d.close ? d.close() : d.removeAttribute('open'); }
  function sano(f) { try { return f(); } catch (e) { return null; } }
  return { $: $, $$: $$, esc: esc, toast: toast, fmtFecha: fmtFecha, usd: usd, copiar: copiar, abrirDialogo: abrirDialogo, cerrarDialogo: cerrarDialogo, sano: sano };
})();
