/* Ajustes: perfil del emisor, monedas y tasas, documentos, cifrado opcional con Cuenta y copias. window.MonAjustes */
(function (g) {
  'use strict';
  var T = g.Tr, C = g.MonCalc, U = g.MonUI, D = g.MonDatos, h = U.h, A = g.MonAjustes = {};
  var tg, tasasEl, segEl, logoEl;
  function guardar() { clearTimeout(tg); tg = setTimeout(function () { D.guardarCfg(); }, 500); }
  function enlazar(f, objeto, claves) { claves.forEach(function (k) { f.refs[k].addEventListener('input', function () { objeto()[k] = f.refs[k].value; guardar(); }); }); }

  function perfil() {
    var e = function () { return D.cfg.emisor; };
    var f = U.form([{ id: 'nombre', etq: 'Nombre o negocio', tipo: 'text', maxlength: 80, valor: e().nombre }, { id: 'idFiscal', etq: 'ID fiscal (opcional)', tipo: 'text', maxlength: 40, valor: e().idFiscal }, { id: 'direccion', etq: 'Dirección', tipo: 'text', maxlength: 140, valor: e().direccion, cls: 'ancho' }, { id: 'contacto', etq: 'Contacto (correo, teléfono, web)', tipo: 'text', maxlength: 140, valor: e().contacto, cls: 'ancho' }, { id: 'pago', etq: 'Datos de pago que aparecerán en tus documentos', tipo: 'textarea', rows: 2, valor: e().pago, cls: 'ancho', ayuda: 'Solo texto informativo (por ejemplo, tu cuenta o enlace). Esta herramienta no procesa pagos.' }]);
    enlazar(f, e, ['nombre', 'idFiscal', 'direccion', 'contacto', 'pago']);
    logoEl = h('div', { cls: 'tr-fila', style: 'align-items:center' });
    function pintaLogo() { logoEl.textContent = ''; if (e().logo) logoEl.appendChild(h('img', { src: e().logo, alt: 'Tu logo', style: 'max-height:56px;max-width:140px;background:#fff;border:1px solid var(--borde);border-radius:8px;padding:4px' })); logoEl.appendChild(U.btn(e().logo ? 'Cambiar logo' : 'Subir logo', subirLogo)); if (e().logo) logoEl.appendChild(U.btn('Quitar logo', function () { e().logo = ''; guardar(); pintaLogo(); })); }
    function subirLogo() {
      var i = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/svg+xml,image/webp', hidden: true }); document.body.appendChild(i);
      i.addEventListener('change', function () {
        var fl = i.files[0]; i.remove(); if (!fl) return; var url = URL.createObjectURL(fl), im = new Image();
        im.onload = function () { var s = Math.min(1, 320 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * s)); c.height = Math.max(1, Math.round(im.height * s)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); e().logo = c.toDataURL('image/png'); guardar(); pintaLogo(); T.aviso('Logo guardado (reducido para ocupar poco).'); };
        im.onerror = function () { URL.revokeObjectURL(url); T.aviso('No se pudo leer la imagen.', 'error'); }; im.src = url;
      }); i.click();
    }
    pintaLogo(); return [f.el, logoEl];
  }
  function monedas() {
    var f = U.campo('Moneda base (código, p. ej. USD, EUR, MXN)', { tipo: 'text', maxlength: 4, valor: D.cfg.moneda, alCambiar: function (v) { v = v.toUpperCase().trim(); if (v.length >= 3) { D.cfg.moneda = v; guardar(); pintaTasas(); } } });
    tasasEl = h('div');
    var nuevo = U.form([{ id: 'c', etq: 'Moneda nueva', tipo: 'text', maxlength: 4 }, { id: 't', etq: 'Unidades por 1 USD', tipo: 'numero', min: 0 }]);
    var live = U.btn('Importar tasas de la herramienta de divisas', async function () {
      try { var d = await g.Datos.cargar('mercados/divisas.json'), n = 0; Object.keys(d.tasas || {}).forEach(function (k) { D.cfg.tasas[k] = d.tasas[k]; n++; }); D.cfg.tasas.USD = 1; D.cfg.tasasFecha = d.generado || ''; await D.guardarCfg(); pintaTasas(); T.aviso(n + ' tasas importadas' + (d._obsoleto ? ' (datos guardados, pueden estar desactualizados)' : '') + '.'); }
      catch (e) { T.aviso('No se pudieron cargar las divisas (' + e.message + '). Escribe tus tasas a mano.', 'error'); }
    });
    function pintaTasas() {
      tasasEl.textContent = ''; var cods = D.monedas().filter(function (c) { return c !== 'USD'; }); if (D.cfg.moneda !== 'USD' && cods.indexOf(D.cfg.moneda) < 0) cods.unshift(D.cfg.moneda);
      var tb = h('tbody', {}); [['USD', 1]].concat(cods.map(function (c) { return [c, D.cfg.tasas[c]]; })).forEach(function (x) {
        var i = h('input', { type: 'number', inputmode: 'decimal', step: 'any', min: 0, value: x[1] == null ? '' : x[1], placeholder: 'sin tasa', 'aria-label': 'Unidades de ' + x[0] + ' por 1 USD', disabled: x[0] === 'USD' }); i.addEventListener('change', function () { var v = C.n(i.value); if (v > 0) D.cfg.tasas[x[0]] = v; else delete D.cfg.tasas[x[0]]; D.guardarCfg(); });
        tb.appendChild(h('tr', {}, [h('th', { scope: 'row', txt: x[0] + (x[0] === D.cfg.moneda ? ' (base)' : '') }), h('td', {}, [i])]));
      });
      tasasEl.appendChild(h('div', { cls: 'mon-tabla-cont', tabindex: 0, role: 'region', 'aria-label': 'Tasas de cambio' }, [h('table', { cls: 'mon-esc' }, [h('thead', {}, [h('tr', {}, [h('th', { scope: 'col', txt: 'Moneda' }), h('th', { scope: 'col', txt: 'Unidades por 1 USD' })])]), tb])]));
      if (D.cfg.tasasFecha) tasasEl.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Tasas importadas de la herramienta de divisas (generadas ' + D.cfg.tasasFecha.slice(0, 16).replace('T', ' ') + ' UTC). Puedes editarlas.' }));
    }
    pintaTasas();
    return [f.el, U.nota('Las tasas son tuyas: pon las que uses en tu operación real (la de tu banco o plataforma). Si falta una tasa, esa moneda se cuenta 1:1.'), tasasEl, nuevo.el, h('div', { cls: 'tr-acciones' }, [U.btn('Añadir moneda', function () { var v = nuevo.val(), c = (v.c || '').toUpperCase(); if (c.length < 3 || !(v.t > 0)) { T.aviso('Escribe el código y la tasa.', 'error'); return; } D.cfg.tasas[c] = v.t; D.guardarCfg(); pintaTasas(); nuevo.refs.c.value = ''; nuevo.refs.t.value = ''; }), live])];
  }
  function documentos() {
    var n = D.cfg.numeracion, cfg = function () { return D.cfg; }, out = [];
    ['factura', 'cotizacion'].forEach(function (t) {
      var f = U.form([{ id: 'patron', etq: 'Patrón de ' + t, tipo: 'text', maxlength: 30, valor: n[t].patron, ayuda: 'Usa {AAAA}, {AA}, {MM} y {NNNN} (los dígitos del contador).' }, { id: 'sig', etq: 'Próximo número', tipo: 'numero', min: 1, valor: n[t].sig }, { id: 'reiniciar', etq: 'Reiniciar cada año', tipo: 'select', op: [['1', 'Sí'], ['0', 'No']], valor: n[t].reiniciar ? '1' : '0' }]);
      var ej = h('p', { cls: 'tr-ayuda' }); function eje() { ej.textContent = 'Ejemplo: ' + C.numerar(n[t].patron, n[t].sig); } eje();
      Object.keys(f.refs).forEach(function (k) { f.refs[k].addEventListener('input', function () { n[t].patron = f.refs.patron.value || 'DOC-{NNNN}'; n[t].sig = Math.max(1, Math.floor(C.n(f.refs.sig.value, 1))); n[t].reiniciar = f.refs.reiniciar.value === '1'; guardar(); eje(); }); });
      out.push(f.el, ej);
    });
    var imp = h('div'); function pintaImp() {
      imp.textContent = ''; cfg().impuestosDoc.forEach(function (im, i) {
        var f = U.form([{ id: 'nombre', etq: 'Impuesto por defecto', tipo: 'text', maxlength: 30, valor: im.nombre }, { id: 'pct', etq: '%', tipo: 'numero', min: 0, max: 100, valor: im.pct }, { id: 'ret', etq: 'Tipo', tipo: 'select', op: [['0', 'Se suma'], ['1', 'Se resta (retención)']], valor: im.retencion ? '1' : '0' }]);
        Object.keys(f.refs).forEach(function (k) { f.refs[k].addEventListener('input', function () { im.nombre = f.refs.nombre.value; im.pct = C.n(f.refs.pct.value); im.retencion = f.refs.ret.value === '1'; guardar(); }); });
        imp.appendChild(h('div', { cls: 'tr-fila', style: 'align-items:end' }, [f.el, U.btn('Quitar', function () { cfg().impuestosDoc.splice(i, 1); guardar(); pintaImp(); }, 'mon-btn-s', { 'aria-label': 'Quitar impuesto por defecto ' + (i + 1) })]));
      }); imp.appendChild(U.btn('+ Añadir impuesto', function () { cfg().impuestosDoc.push({ nombre: 'Impuesto', pct: 0 }); guardar(); pintaImp(); }));
    } pintaImp();
    var extra = U.form([{ id: 'diasVence', etq: 'Días para vencer una factura', tipo: 'numero', min: 0, valor: D.cfg.diasVence }, { id: 'terminos', etq: 'Términos por defecto', tipo: 'textarea', rows: 4, valor: D.cfg.terminos, cls: 'ancho', ayuda: 'Vacío: se usa un texto base.' }]);
    extra.refs.diasVence.addEventListener('input', function () { D.cfg.diasVence = C.n(extra.refs.diasVence.value, 15); guardar(); }); extra.refs.terminos.addEventListener('input', function () { D.cfg.terminos = extra.refs.terminos.value; guardar(); });
    var cats = U.form([{ id: 'ing', etq: 'Categorías de ingreso extra (separadas por coma)', tipo: 'text', valor: (D.cfg.categorias.ingreso || []).join(', '), cls: 'ancho' }, { id: 'gas', etq: 'Categorías de gasto extra (separadas por coma)', tipo: 'text', valor: (D.cfg.categorias.gasto || []).join(', '), cls: 'ancho' }]);
    function cs(v) { return v.split(',').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 20); }
    cats.refs.ing.addEventListener('input', function () { D.cfg.categorias.ingreso = cs(cats.refs.ing.value); guardar(); }); cats.refs.gas.addEventListener('input', function () { D.cfg.categorias.gasto = cs(cats.refs.gas.value); guardar(); });
    return out.concat([imp, extra.el, cats.el]);
  }
  /* ---- seguridad y nube ---- */
  function pintaSeg() {
    segEl.textContent = ''; var cc = g.Cuenta && g.Cuenta.usuario, sesion = !!cc, act = D.cifradoActivo;
    segEl.appendChild(U.nota(act ? (D.frase ? 'Cifrado activo y desbloqueado en esta sesión: tus cambios se cifran en este dispositivo antes de sincronizar con tu Cuenta.' : 'Cifrado activo, pero la frase no está en memoria (por seguridad nunca se guarda). Introdúcela para volver a cifrar y sincronizar.') : 'Cifrado desactivado: tus datos financieros están solo en este dispositivo y NO se sincronizan con tu Cuenta.', !act));
    segEl.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Cómo funciona: con una frase que solo tú conoces se deriva una clave (PBKDF2-SHA-256) y se cifra una copia de tus datos con AES-GCM de 256 bits en tu navegador. Solo esa copia cifrada viaja a tu Cuenta; la frase y la clave nunca salen del dispositivo. Si olvidas la frase, nadie puede recuperar los datos de la nube (tu copia local seguirá aquí).' }));
    var acc = h('div', { cls: 'tr-acciones' });
    if (!act) acc.appendChild(h('button', { type: 'button', id: 'seg-activar', cls: 'tr-btn mon-primario', txt: 'Activar cifrado y sincronización', on: { click: async function () { if (!sesion) { T.aviso('Inicia sesión en tu Cuenta (botón superior) para sincronizar. Puedes activar el cifrado igualmente.', 'error'); } var fr = await U.pedirFrase('Elige una frase de cifrado. No se guarda en ningún sitio: si la olvidas no se puede recuperar la copia de la nube.', true); if (!fr) return; try { await D.activarCifrado(fr); T.aviso('Cifrado activado.'); pintaSeg(); } catch (e) { T.aviso(e.message, 'error'); } } } }));
    else {
      if (!D.frase) acc.appendChild(U.btn('Introducir frase', async function () { var fr = await U.pedirFrase('Introduce tu frase para esta sesión.', false); if (!fr) return; try { await D.fusionarDesdeNube(fr).catch(function (e) { if (/no hay datos/i.test(e.message)) { D.desbloquear(fr); return 0; } throw e; }); D.desbloquear(fr); await D.subirCifrado(); T.aviso('Desbloqueado y sincronizado.'); pintaSeg(); } catch (e) { T.aviso(e.message, 'error'); } }));
      else acc.appendChild(U.btn('Cifrar y subir ahora', function () { D.subirCifrado().then(function () { T.aviso('Copia cifrada guardada. Se sincronizará con tu Cuenta.'); }).catch(function (e) { T.aviso(e.message, 'error'); }); }));
      acc.appendChild(U.btn('Traer y fusionar datos cifrados de la nube', async function () { var fr = D.frase || await U.pedirFrase('Introduce tu frase para descifrar la copia de la nube.', false); if (!fr) return; try { var n = await D.fusionarDesdeNube(fr); T.aviso(n + ' registro(s) fusionado(s) (gana el más reciente).'); pintaSeg(); } catch (e) { T.aviso(e.message, 'error'); } }));
      acc.appendChild(U.btn('Desactivar cifrado', function () { if (g.confirm('Se desactiva el cifrado y se borra la copia cifrada de la nube (no tus datos locales). ¿Continuar?')) D.desactivarCifrado(true).then(pintaSeg); }, 'mon-peligro'));
    }
    segEl.appendChild(acc);
    segEl.appendChild(h('p', { cls: 'tr-ayuda', txt: (sesion ? 'Sesión iniciada: ' + (g.Cuenta.usuario.nombre || g.Cuenta.usuario.usuario) + '.' : 'Sin sesión: la sincronización necesita tu Cuenta.') + (D.ultimoCifrado ? ' Última copia cifrada: ' + new Date(D.ultimoCifrado).toLocaleTimeString('es') + '.' : '') + ' Límite de la nube ≈ 900 KB por copia; tus datos pesan ≈ ' + Math.round(D.tamanoCifrado() / 1024) + ' KB.' }));
  }
  function copias() {
    return [h('div', { cls: 'tr-acciones' }, [U.btn('Exportar copia JSON (sin cifrar)', function () { U.descargarTexto(JSON.stringify(D.instantanea()), 'monetizacion-' + C.hoy() + '.json', 'application/json'); T.aviso('Copia descargada. Contiene tus finanzas sin cifrar: guárdala en un lugar seguro.'); }),
      U.btn('Importar copia JSON', function () { U.leerArchivo('.json,application/json', function (t) { try { var s = JSON.parse(t); if (!s.cols) throw new Error('No es una copia de Monetización.'); D.restaurarInstantanea(s, true).then(function (n) { T.aviso(n + ' registro(s) importado(s).'); }); } catch (e) { T.aviso(e.message, 'error'); } }); }),
      U.btn('Borrar todos mis datos', async function () { if (!g.confirm('Se borrarán TODOS tus datos financieros de este dispositivo. ¿Seguro?') || !g.confirm('Esta acción no se puede deshacer. ¿Borrar todo?')) return; for (var i = 0; i < D.COLS.length; i++) { var l = D.lista(D.COLS[i]).slice(); for (var j = 0; j < l.length; j++) await D.alm.borrar(D.COLS[i], l[j].id); } await D.cargar0(); await D.guardarCfg(); T.aviso('Datos borrados.'); }, 'mon-peligro')]),
      h('p', { cls: 'tr-ayuda', txt: 'Limitación: al fusionar desde la nube no se propagan borrados hechos en otro dispositivo; gana siempre el registro más reciente.' })];
  }
  A.iniciar = function (raiz) {
    segEl = h('div'); raiz.appendChild(U.panel('Seguridad y nube', [segEl], { sub: 'Tus datos financieros se guardan solo en este dispositivo salvo que actives el cifrado con tu propia frase.' }));
    raiz.appendChild(U.panel('Perfil para documentos', perfil())); raiz.appendChild(U.panel('Monedas y tasas', monedas())); raiz.appendChild(U.panel('Documentos, numeración e impuestos por defecto', documentos(), { sub: 'Las tasas son valores tuyos; nada está codificado por país.' })); raiz.appendChild(U.panel('Copias de seguridad', copias()));
    pintaSeg(); D.on(function (c) { if (c === 'cifrado' || c === null) pintaSeg(); });
  };
  A.repintar = pintaSeg;
})(window);
