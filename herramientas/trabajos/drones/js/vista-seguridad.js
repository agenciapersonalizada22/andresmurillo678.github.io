/* Vista Seguridad: normativa, checklist, viento y bateria, bitacora y hojas imprimibles. */
(function (g) {
  'use strict';
  const T = g.Tr, h = T.h, A = g.DronApp, Cal = g.DronCalc, D = g.DronDatos, Cat = g.DronCatalogo, X = g.DronExport, Hj = g.DronHojas, I = g.Impresion;
  const ui = {};
  let debN = 0;
  /* ---- normativa ---- */
  function guardarNorma(n) { clearTimeout(debN); debN = setTimeout(() => D.guardarNorma(Object.assign({}, n)).catch(e => console.warn(e)), 600); }
  function pintarNorma() {
    const c = ui.norma; c.textContent = ''; const n = A.perfil(); if (!n) return;
    const sel = A.selector('Perfil de normativa', A.est.normas.map(x => [x.id, x.nombre + (x.editado ? ' (editado)' : '')]), n.id, v => { A.est.proy.normaId = v; A.cambio('norma'); pintarNorma(); });
    c.appendChild(h('div', { cls: 'tr-nota tr-av', role: 'note' }, [h('b', { txt: 'Verifica la ley local. ' }), Cat.AVISO_LEY]));
    c.appendChild(sel.wrap);
    const ed = (k, etq, o) => A.campo(etq, n[k], v => { n[k] = v; guardarNorma(n); A.cambio('norma'); pintarCumple(); }, o).wrap, chk = (k, etq) => { const i = h('input', { type: 'checkbox', id: 'dr-n-' + k }); i.checked = !!n[k]; i.addEventListener('change', () => { n[k] = i.checked; guardarNorma(n); A.cambio('norma'); pintarCumple(); }); return h('label', { cls: 'tr-chk', for: 'dr-n-' + k }, [i, etq]); };
    c.appendChild(h('details', { cls: 'dr-det', open: '' }, [h('summary', { txt: 'Editar este perfil' }),
      A.campo('Nombre', n.nombre, v => { n.nombre = v; guardarNorma(n); }, { tipo: 'text', maxlength: 60 }).wrap,
      h('div', { cls: 'tr-fila' }, [ed('alturaMax', 'Altura máxima (m)', { min: 0 }), ed('distMax', 'Distancia máxima al piloto (m)', { min: 0 }), ed('pesoMax', 'Peso máx. aeronave (g)', { min: 0 })]),
      chk('vlos', 'Exige línea de vista directa (VLOS)'), chk('noche', 'Permite vuelo nocturno (con condiciones)'), chk('sobreGente', 'Permite volar sobre personas (con condiciones)'),
      A.campo('Notas y zonas', n.notas || '', v => { n.notas = v; guardarNorma(n); }, { tipo: 'text', maxlength: 300 }).wrap,
      h('div', { cls: 'tr-acciones' }, [A.boton('Nuevo perfil', async () => { const nn = { id: T.uid(), tipo: 'norma', nombre: 'Mi perfil', alturaMax: 100, distMax: 400, vlos: true, noche: false, sobreGente: false, pesoMax: 250, notas: '' }; await D.guardarNorma(nn); await A.cargarCatalogos(); A.est.proy.normaId = nn.id; A.cambio('norma'); pintarNorma(); }, 'tr-chico'),
        n.base ? (n.editado ? A.boton('Restablecer valores', async () => { await D.restablecerNorma(n.id); await A.cargarCatalogos(); A.cambio('norma'); pintarNorma(); }, 'tr-chico') : null) : null,
        A.boton('Eliminar perfil', async () => { if (!confirm('¿Eliminar el perfil «' + n.nombre + '»?')) return; await D.borrarNorma(n); await A.cargarCatalogos(); A.est.proy.normaId = (A.est.normas[0] || {}).id; A.cambio('norma'); pintarNorma(); }, 'tr-chico tr-peli')])]));
    ui.cumple = h('div', { 'aria-live': 'polite' }); c.appendChild(h('h3', { txt: 'Tu plan frente a este perfil' })); c.appendChild(ui.cumple); pintarCumple();
  }
  function pintarCumple() {
    if (!ui.cumple) return; const n = A.perfil(), s = A.estadisticas(); ui.cumple.textContent = ''; if (!n) return;
    const fila = (a, lim, val, ok) => h('tr', {}, [h('th', { scope: 'row', txt: a }), h('td', { txt: lim }), h('td', { txt: val }), h('td', { cls: ok === true ? 'dr-ok' : ok === false ? 'dr-no' : '', txt: ok === true ? 'Dentro' : ok === false ? 'Excede' : '—' })]);
    ui.cumple.appendChild(h('div', { cls: 'dr-tabla-caja' }, [h('table', { cls: 'dr-tabla' }, [h('thead', {}, [h('tr', {}, ['Concepto', 'Límite', 'Plan', 'Estado'].map(t => h('th', { scope: 'col', txt: t })))]), h('tbody', {}, [
      fila('Altura máxima', n.alturaMax + ' m', Math.round(s.altMax) + ' m', s.altMax <= n.alturaMax), fila('Distancia al despegue', n.distMax + ' m', Math.round(s.distMaxHome) + ' m', s.distMaxHome <= n.distMax),
      fila('Línea de vista (VLOS)', n.vlos ? 'Obligatoria' : 'No exigida', s.distMaxHome > 400 ? 'Comprueba que ves el dron' : 'Probable', null), fila('Batería', '≤ 80 % de la útil', Math.round(s.bateriaPct) + ' %', s.bateriaPct <= 80)])])]));
    ui.cumple.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Notas del perfil: ' + (n.notas || '—') }));
  }
  /* ---- checklist ---- */
  function pintarChecklist() {
    const c = ui.check; c.textContent = ''; const p = A.est.proy; let tot = 0, hechos = 0;
    const grupos = Cat.CHECKLIST.map(([nom, its]) => [nom, its.map(([id, t]) => ({ id, texto: t }))]).concat(p.extrasCheck.length ? [['Puntos propios', p.extrasCheck]] : []);
    grupos.forEach(([nom, its]) => { const fs = h('fieldset', { cls: 'dr-grupo' }, [h('legend', { txt: nom })]); its.forEach(it => { tot++; if (p.checks[it.id]) hechos++; const i = h('input', { type: 'checkbox', id: 'dr-c-' + it.id }); i.checked = !!p.checks[it.id]; i.addEventListener('change', () => { p.checks[it.id] = i.checked; A.guardar(); pintarChecklist(); const nf = document.getElementById('dr-c-' + it.id); if (nf) nf.focus(); }); fs.appendChild(h('div', { cls: 'dr-ck' }, [h('label', { cls: 'tr-chk', for: 'dr-c-' + it.id }, [i, it.texto]), nom === 'Puntos propios' ? A.boton('×', () => { p.extrasCheck = p.extrasCheck.filter(x => x.id !== it.id); delete p.checks[it.id]; A.guardar(); pintarChecklist(); }, 'tr-chico', { 'aria-label': 'Quitar punto: ' + it.texto }) : null])); }); c.appendChild(fs); });
    c.insertBefore(h('div', { cls: 'tr-nota ' + (hechos === tot ? 'tr-ok' : ''), role: 'status', txt: hechos + ' de ' + tot + ' puntos completados' + (hechos === tot ? ': listo para volar (si la ley y el tiempo lo permiten).' : '.') }), c.firstChild);
    const nuevo = h('input', { type: 'text', id: 'dr-c-nuevo', maxlength: 120, placeholder: 'Ej.: Avisar al vigilante del parque' });
    c.appendChild(h('div', {}, [h('label', { for: 'dr-c-nuevo', txt: 'Añadir punto propio' }), nuevo, h('div', { cls: 'tr-acciones' }, [A.boton('Añadir', () => { const t = nuevo.value.trim(); if (!t) return; p.extrasCheck.push({ id: 'x' + T.uid(), texto: t }); A.guardar(); pintarChecklist(); document.getElementById('dr-c-nuevo').focus(); }, 'tr-chico'), A.boton('Reiniciar marcas', () => { p.checks = {}; A.guardar(); pintarChecklist(); }, 'tr-chico'), A.boton('Imprimir checklist', () => { irHoja('checklist'); }, 'tr-chico')])]));
    if (hechos === tot && tot) A.logro('checklist_completo');
  }
  /* ---- viento y bateria ---- */
  function calcViento(c) {
    const d = A.est.proy.mision.dron, v = { capWh: d.capWh, pHover: d.pHover, vAire: A.est.proy.mision.vel, viento: A.est.proy.mision.viento.vel, temp: 20, usable: d.usable };
    const out = h('div', { 'aria-live': 'polite' });
    const f = (k, e, o) => A.campo(e, v[k], x => { v[k] = x; res(); }, o).wrap;
    function res() {
      const a = Cal.autonomia(v), li = (e, t) => h('li', {}, [h('b', { txt: e + ': ' }), t]); out.textContent = '';
      out.appendChild(h('ul', { cls: 'dr-res' }, [li('Energía utilizable', A.f1(a.whUtil, 1) + ' Wh' + (a.factorTemp < 1 ? ' (con factor de frío ' + a.factorTemp + ')' : '')), li('Autonomía en hover', A.f1(a.hoverMin, 1) + ' min'), li('Autonomía en crucero a ' + v.vAire + ' m/s', A.f1(a.cruceroMin, 1) + ' min (' + A.f1(a.rangoSinViento / 1000, 2) + ' km sin viento)'),
        li('Velocidad sobre el suelo', 'contra el viento ' + A.f1(Math.max(0, a.velContra), 1) + ' m/s · a favor ' + A.f1(a.velFavor || v.vAire, 1) + ' m/s'), li('Radio máximo ida y vuelta con ese viento', Math.round(a.radioConViento) + ' m (recomendado ≤ ' + Math.round(a.radioRecomendado) + ' m)')]));
      out.appendChild(h('div', { cls: 'tr-nota ' + (v.viento >= 8 || a.advertencia ? 'tr-mal' : v.viento >= 5 ? 'tr-av' : 'tr-ok'), txt: a.advertencia || Cal.rafagas(v.viento) }));
      out.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Modelo simple: sin ráfagas, altitud ni envejecimiento de la batería. Vuela con margen y regresa con viento a favor solo si hay batería de sobra.' }));
    }
    c.appendChild(h('div', { cls: 'tr-fila' }, [f('capWh', 'Capacidad (Wh)', { min: 1 }), f('pHover', 'Potencia en hover (W)', { min: 1 }), f('usable', 'Fracción utilizable (0-1)', { min: 0.3, max: 1 })]));
    c.appendChild(h('div', { cls: 'tr-fila' }, [f('vAire', 'Velocidad respecto al aire (m/s)', { min: 0.5 }), f('viento', 'Viento (m/s)', { min: 0 }), f('temp', 'Temperatura (°C)')]));
    c.appendChild(out); res();
  }
  /* ---- bitacora ---- */
  function bitacora(c) {
    const f = {}, hoy = new Date().toISOString().slice(0, 10), ent = (k, etq, tipo, o) => { f[k] = h('input', Object.assign({ type: tipo || 'text', id: 'dr-b-' + k, autocomplete: 'off', maxlength: tipo ? null : 120 }, o || {})); return h('div', {}, [h('label', { for: 'dr-b-' + k, txt: etq }), f[k]]); };
    ui.bitLista = h('div'); ui.bitRes = h('p', { cls: 'tr-ayuda', role: 'status' });
    const mins = () => { const a = f.despegue.value, b = f.aterrizaje.value; if (a && b) { let d = (+b.slice(0, 2) * 60 + +b.slice(3, 5)) - (+a.slice(0, 2) * 60 + +a.slice(3, 5)); if (d < 0) d += 1440; f.minutos.value = d; } };
    c.appendChild(h('div', { cls: 'tr-fila' }, [ent('fecha', 'Fecha', 'date', { value: hoy }), ent('piloto', 'Piloto'), ent('dron', 'Dron / equipo')]));
    c.appendChild(h('div', { cls: 'tr-fila' }, [ent('lugar', 'Lugar'), ent('despegue', 'Despegue', 'time'), ent('aterrizaje', 'Aterrizaje', 'time'), ent('minutos', 'Minutos de vuelo', 'number', { min: 0, step: 'any', inputmode: 'decimal' })]));
    c.appendChild(h('div', { cls: 'tr-fila' }, [ent('baterias', 'Baterías usadas', 'number', { min: 0, step: '1', inputmode: 'numeric' }), ent('viento', 'Viento (m/s)', 'number', { min: 0, step: 'any', inputmode: 'decimal' }), ent('incidencias', 'Incidencias'), ent('notas', 'Notas')]));
    f.despegue.addEventListener('input', mins); f.aterrizaje.addEventListener('input', mins);
    c.appendChild(h('div', { cls: 'tr-acciones' }, [A.boton('Rellenar con el plan', () => { const s = A.estadisticas(), mi = A.est.proy.mision; f.lugar.value = A.est.proy.nombre; f.minutos.value = Math.round(s.duracion / 60 * 10) / 10; f.viento.value = mi.viento.vel; f.baterias.value = Math.max(1, Math.ceil(s.bateriaPct / 80)); const c1 = A.camara(); if (c1 && !f.dron.value) f.dron.value = ''; A.aviso('Datos del plan copiados; completa piloto y horas reales.'); }, 'tr-chico'),
      A.boton('Guardar vuelo', async () => { const e = { fecha: f.fecha.value || hoy, piloto: f.piloto.value, dron: f.dron.value, lugar: f.lugar.value, despegue: f.despegue.value, aterrizaje: f.aterrizaje.value, minutos: Cal.num(f.minutos.value, 0), baterias: Cal.num(f.baterias.value, 0), viento: Cal.num(f.viento.value, 0), incidencias: f.incidencias.value, notas: f.notas.value, proyecto: A.est.proy.id }; await D.guardarVuelo(e); A.aviso('Vuelo guardado en la bitácora.'); A.logro('bitacora'); if (g.CuentaTrabajos) g.CuentaTrabajos.xp(3); pintarBit(); }, 'tr-pri'),
      A.boton('Exportar CSV', async () => { const l = await D.bitacora(); if (!l.length) return A.aviso('La bitácora está vacía.', 'error'); A.descargar(X.csvBitacora(l), 'bitacora_vuelos.csv', 'text/csv;charset=utf-8'); }, 'tr-chico'), A.boton('Imprimir bitácora', () => irHoja('bitacora'), 'tr-chico')]));
    c.appendChild(ui.bitRes); c.appendChild(ui.bitLista); pintarBit();
  }
  async function pintarBit() {
    const l = await D.bitacora(), c = ui.bitLista; c.textContent = ''; const tot = l.reduce((a, e) => a + (e.minutos || 0), 0);
    ui.bitRes.textContent = l.length ? l.length + ' vuelo(s) · ' + A.f1(tot, 1) + ' min en total (' + A.f1(tot / 60, 2) + ' h)' : 'Aún no hay vuelos registrados.';
    if (!l.length) return;
    const ul = h('ul', { cls: 'dr-bit' }); l.slice(0, 50).forEach(e => ul.appendChild(h('li', {}, [h('div', {}, [h('b', { txt: e.fecha + ' · ' + (e.lugar || 'sin lugar') }), h('div', { cls: 'tr-ayuda', txt: [e.piloto, e.dron, A.f1(e.minutos) + ' min', e.viento ? e.viento + ' m/s' : '', e.incidencias].filter(Boolean).join(' · ') })]), A.boton('Borrar', async () => { await D.borrarVuelo(e.id); pintarBit(); }, 'tr-chico tr-peli', { 'aria-label': 'Borrar vuelo del ' + e.fecha })]))); c.appendChild(ul);
  }
  /* ---- hojas ---- */
  const HOJAS = [['plan', 'Plan de vuelo'], ['checklist', 'Checklist de vuelo'], ['bitacora', 'Bitácora de vuelo'], ['limites', 'Hoja de límites'], ['guion', 'Guion técnico']];
  async function paginas() {
    const t = ui.hojaTipo.el.value, p = A.est.proy;
    if (t === 'plan') return Hj.plan(p, p.mision, A.estadisticas(), A.fotogrametria(), A.perfil());
    if (t === 'checklist') return Hj.checklist(p, p.checks, p.extrasCheck);
    if (t === 'bitacora') return Hj.bitacora(p, ui.hojaLlena.checked ? await D.bitacora() : [], Cal.num(ui.hojaFilas.el.value, 12));
    if (t === 'limites') return Hj.limites(p, A.perfil(), A.estadisticas(), p.mision);
    return Hj.guion(p, A.tomasTecnicas ? A.tomasTecnicas() : []);
  }
  let pag = [];
  const dib = (i, ce) => '<g transform="scale(' + Math.min(ce.w / Hj.AREA.w, ce.h / Hj.AREA.h) + ')">' + (pag[i] || '') + '</g>';
  async function pintarHoja() {
    pag = await paginas(); const papel = ui.hojaPapel.el.value, L = I.calcular({ papel, orient: 'vertical', modo: 'cuadricula', cols: 1, filas: 1, mt: 10, md: 10, mb: 10, mi: 10, total: pag.length });
    ui.hojaVista.textContent = ''; I.vistaPrevia(ui.hojaVista, L, dib, { zoom: 'ajustar', maxPaginas: 6 }); ui.hojaRes.textContent = pag.length + ' página(s) · ' + papel; ui.hojaL = L;
    ui.hojaBit.hidden = ui.hojaTipo.el.value !== 'bitacora';
  }
  function irHoja(t) { A.irSeguridad('hojas'); ui.hojaTipo.el.value = t; pintarHoja(); ui.hojaVista.scrollIntoView({ block: 'nearest' }); }
  function hojas(c) {
    ui.hojaTipo = A.selector('Hoja', HOJAS, 'plan', pintarHoja); ui.hojaPapel = A.selector('Papel', [['A4', 'A4'], ['Carta', 'Carta']], 'A4', pintarHoja);
    ui.hojaFilas = A.campo('Filas vacías', 12, pintarHoja, { min: 0, max: 60 }); ui.hojaLlenaChk = h('input', { type: 'checkbox', id: 'dr-hj-llena' }); ui.hojaLlena = ui.hojaLlenaChk; ui.hojaLlena.checked = true; ui.hojaLlena.addEventListener('change', pintarHoja);
    ui.hojaBit = h('div', { hidden: true }, [ui.hojaFilas.wrap, h('label', { cls: 'tr-chk', for: 'dr-hj-llena' }, [ui.hojaLlenaChk, 'Incluir los vuelos guardados'])]);
    ui.hojaRes = h('p', { cls: 'tr-ayuda', role: 'status' }); ui.hojaVista = h('div', { id: 'dr-hoja-vista' });
    const png = A.boton('Descargar PNG', async () => { try { const L = ui.hojaL, arch = []; for (let k = 0; k < Math.min(L.paginas, 20); k++) { const b = await I.aPNG(L, k, dib, { dpi: 200 }); arch.push({ nombre: 'hoja_' + (k + 1) + '.png', datos: new Uint8Array(await b.arrayBuffer()) }); } if (arch.length === 1) T.descargar(new Blob([arch[0].datos], { type: 'image/png' }), 'hoja_' + ui.hojaTipo.el.value + '.png'); else T.descargar(T.zip(arch), 'hoja_' + ui.hojaTipo.el.value + '.zip'); } catch (e) { A.aviso(e.message, 'error'); } }, 'tr-chico');
    c.appendChild(h('div', { cls: 'tr-dos' }, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Hojas imprimibles' }), ui.hojaTipo.wrap, ui.hojaPapel.wrap, ui.hojaBit, h('div', { cls: 'tr-acciones' }, [A.boton('Imprimir…', async () => { await pintarHoja(); I.imprimir(ui.hojaL, dib, {}); A.logro('hoja_impresa'); }, 'tr-pri'), png]), ui.hojaRes, h('div', { cls: 'tr-nota', txt: 'Para imprimir a tamaño real elige escala 100 % y desactiva encabezados y pies en el diálogo de impresión.' })]), h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Vista previa' }), ui.hojaVista])]));
        ui.pintarHoja = pintarHoja;
  }
  A.iniciarSeguridad = function () {
    const raiz = document.getElementById('v-seguridad');
    ui.norma = h('div'); ui.check = h('div');
    const st = A.sub(raiz, [['norma', 'Límites', c => c.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Límites y normativa' }), ui.norma]))], ['check', 'Checklist', c => c.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Checklist prevuelo' }), ui.check]))],
      ['viento', 'Viento y batería', c => { ui.vientoCaja = h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Viento, batería y autonomía' })]); c.appendChild(ui.vientoCaja); }], ['bitacora', 'Bitácora', c => { const p = h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Bitácora de vuelo' })]); c.appendChild(p); bitacora(p); }], ['hojas', 'Hojas', hojas]], 'seg');
    A.irSeguridad = v => st.ir(v); A.irHoja = irHoja;
    A.on('sub:seg', v => { if (v === 'hojas') pintarHoja(); if (v === 'viento') { ui.vientoCaja.textContent = ''; ui.vientoCaja.appendChild(h('h2', { txt: 'Viento, batería y autonomía' })); calcViento(ui.vientoCaja); } if (v === 'bitacora') pintarBit(); });
    const refrescar = () => { pintarNorma(); pintarChecklist(); };
    A.on('proyecto', refrescar); A.on('mision', pintarCumple); A.on('catalogos', pintarNorma); refrescar();
  };
})(window);
