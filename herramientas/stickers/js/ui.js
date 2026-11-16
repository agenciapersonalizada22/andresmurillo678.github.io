/* Constructores de controles reutilizables (sobre Tr.h). window.Ui */
(function (g) {
  'use strict';
  const h = g.Tr.h, Ui = g.Ui = {};
  let n = 0; const uid = () => 'u' + (n++);
  Ui.h = h;
  Ui.rango = function (etq, min, max, paso, valor, cb, fmt) {
    const id = uid(), out = h('output', { for: id, txt: (fmt || String)(valor) }), inp = h('input', { type: 'range', id, min, max, step: paso, value: valor, 'aria-label': etq });
    inp.addEventListener('input', () => { const v = parseFloat(inp.value); out.textContent = (fmt || String)(v); cb(v); });
    const fila = h('div', { cls: 'st-rango' }, [h('label', { for: id, txt: etq }), inp, out]);
    fila.poner = (v) => { inp.value = v; out.textContent = (fmt || String)(v); }; fila.input = inp; return fila;
  };
  Ui.select = function (etq, opciones, valor, cb) {
    const id = uid(), s = h('select', { id }); opciones.forEach((o) => { const op = h('option', { value: o[0], txt: o[1] }); if (String(o[0]) === String(valor)) op.selected = true; s.appendChild(op); });
    s.addEventListener('change', () => cb(s.value)); const d = h('div', {}, [h('label', { for: id, txt: etq }), s]); d.sel = s; return d;
  };
  Ui.check = function (etq, valor, cb) { const id = uid(), c = h('input', { type: 'checkbox', id }); c.checked = !!valor; c.addEventListener('change', () => cb(c.checked)); const l = h('label', { cls: 'tr-chk', for: id }, [c, etq]); l.input = c; return l; };
  Ui.color = function (etq, valor, cb) { const id = uid(), c = h('input', { type: 'color', id, value: valor }); c.addEventListener('input', () => cb(c.value)); const d = h('div', {}, [h('label', { for: id, txt: etq }), c]); d.input = c; return d; };
  Ui.texto = function (etq, valor, cb, o) { const id = uid(), t = h(o && o.multi ? 'textarea' : 'input', Object.assign({ id, type: 'text', value: valor }, (o && o.attrs) || {})); if (o && o.multi) t.value = valor; t.addEventListener('input', () => cb(t.value)); const d = h('div', {}, [h('label', { for: id, txt: etq }), t]); d.input = t; return d; };
  Ui.btn = (txt, cb, cls, o) => h('button', Object.assign({ type: 'button', cls: 'tr-btn ' + (cls || ''), txt, on: { click: cb } }, o || {}));
  Ui.det = (titulo, kids, abierto) => h('details', Object.assign({ cls: 'st-det' }, abierto ? { open: true } : {}), [h('summary', { txt: titulo })].concat(kids));
  Ui.filaBtn = (kids) => h('div', { cls: 'st-fila-btn' }, kids);
  Ui.nota = (txt, tipo) => h('div', { cls: 'tr-nota ' + (tipo || ''), txt });
  Ui.dialogo = function (titulo, cuerpo, botones) {
    const dlg = h('dialog', { cls: 'st-dlg', 'aria-label': titulo }, [h('h2', { txt: titulo })].concat(cuerpo));
    const fila = h('div', { cls: 'tr-acciones' }); (botones || [['Cerrar', null]]).forEach((b) => fila.appendChild(Ui.btn(b[0], () => { if (!b[1] || b[1](dlg) !== false) dlg.close(); }, b[2] || '')));
    dlg.appendChild(fila); document.body.appendChild(dlg); dlg.addEventListener('close', () => dlg.remove()); dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); return dlg;
  };
  Ui.icono = (d) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = d; return s; };
  Ui.EMOJIS = '😀 😂 🥹 😍 😎 🤩 😭 😡 🥳 😴 🤔 🙄 😱 🤯 🥰 😇 🤗 😏 🤪 😬 👍 👎 👏 🙌 🙏 💪 👀 🔥 ✨ 💥 💯 ❤️ 💔 💜 💙 🌈 ⭐ 🌟 🎉 🎂 🎁 🍕 🍔 🍩 🍺 ☕ 🐱 🐶 🐼 🦄 🐸 🐢 🦊 🐙 🌸 🌻 🌙 ☀️ ⚡ 💀 👻 🤖 🎮 ⚽ 🏆 🚀 💡 💰 📌 ✅ ❌ ❓ ❗'.split(' ');
  Ui.descargarBlob = (b, n) => g.Tr.descargar(b, n);
  Ui.confirmar = (txt) => g.confirm(txt);
  Ui.gris = () => {};
})(window);
