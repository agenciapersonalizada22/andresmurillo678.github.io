/* Estado y utilidades comunes del modulo Drones. window.DronApp */
(function (g) {
  'use strict';
  const T = g.Tr, Cal = g.DronCalc, D = g.DronDatos, M = g.DronMision;
  const A = g.DronApp = { est: { proy: null, equipo: [], normas: [], plano: null }, vistas: {} }, subs = {};
  A.on = (e, f) => { (subs[e] = subs[e] || []).push(f); };
  A.emit = (e, a) => (subs[e] || []).slice().forEach(f => { try { f(a); } catch (x) { console.error(x); } });
  A.aviso = T.aviso; A.h = T.h;
  A.f1 = (v, d) => isFinite(v) ? (Math.round(v * Math.pow(10, d == null ? 1 : d)) / Math.pow(10, d == null ? 1 : d)).toLocaleString('es', { maximumFractionDigits: d == null ? 1 : d }) : '—';
  A.min = s => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  A.logro = id => { try { g.CuentaTrabajos && g.CuentaTrabajos.logro('drones_' + id); } catch (e) {} };
  /* campo numerico enlazado: devuelve {el, wrap}; alCambiar(valor) se llama con numeros validos */
  A.campo = (etq, valor, alCambiar, o) => {
    o = o || {}; const id = 'dr-' + Math.random().toString(36).slice(2, 8);
    const el = T.h('input', { type: o.tipo || 'number', id, step: o.step || 'any', min: o.min, max: o.max, inputmode: o.tipo ? null : 'decimal', value: valor == null ? '' : valor, autocomplete: 'off', maxlength: o.maxlength, readonly: o.solo });
    el.addEventListener('input', () => { if (o.tipo === 'text') return alCambiar(el.value); const v = Cal.num(el.value, NaN); if (isFinite(v)) alCambiar(v, el); });
    return { el, wrap: T.h('div', { cls: o.cls }, [T.h('label', { for: id, txt: etq }), el, o.ayuda ? T.h('p', { cls: 'tr-ayuda', txt: o.ayuda }) : null]) };
  };
  A.selector = (etq, ops, valor, alCambiar, o) => {
    o = o || {}; const id = 'dr-' + Math.random().toString(36).slice(2, 8), el = T.h('select', { id }, ops.map(p => T.h('option', { value: p[0], txt: p[1] })));
    el.value = valor; el.addEventListener('change', () => alCambiar(el.value));
    return { el, wrap: T.h('div', { cls: o.cls }, [T.h('label', { for: id, txt: etq }), el]) };
  };
  A.boton = (txt, fn, cls, o) => T.h('button', Object.assign({ type: 'button', cls: 'tr-btn ' + (cls || ''), txt, on: { click: fn } }, o || {}));
  A.sub = (raiz, defs, pref) => {         // sub-pestañas accesibles; defs [[id,titulo,construir(panel)]]
    const lista = T.h('div', { cls: 'tr-pestanas dr-sub', role: 'tablist', 'aria-label': 'Secciones' }); raiz.appendChild(lista);
    defs.forEach((d, i) => {
      lista.appendChild(T.h('button', { role: 'tab', type: 'button', id: pref + '-t-' + d[0], 'data-vista': d[0], 'aria-controls': pref + '-p-' + d[0], 'aria-selected': i === 0 ? 'true' : 'false', tabindex: i === 0 ? '0' : '-1', txt: d[1] }));
      const p = T.h('div', { role: 'tabpanel', id: pref + '-p-' + d[0], 'aria-labelledby': pref + '-t-' + d[0], hidden: i !== 0 }); raiz.appendChild(p); d[2](p);
    });
    return T.tabs(lista, v => A.emit('sub:' + pref, v));
  };
  A.descargar = (txt, nombre, mime) => T.descargar(new Blob([txt], { type: mime || 'text/plain;charset=utf-8' }), nombre);
  /* ---- proyecto ---- */
  let deb = 0;
  A.guardar = () => { clearTimeout(deb); deb = setTimeout(() => { if (A.est.proy) D.guardarProyecto(A.est.proy).catch(e => console.warn(e)); }, 700); };
  A.cambio = (que) => { A.guardar(); A.emit(que || 'mision'); };
  A.proyectoNuevo = nombre => ({ id: T.uid(), nombre: nombre || 'Proyecto de vuelo', mision: M.nueva(), checks: {}, extrasCheck: [], tomas: [], guion: { cliente: '', notas: '' }, camSel: { cam: 'cam_p4p', len: '', factor: 1 }, normaId: 'gen' });
  A.completar = p => { const b = A.proyectoNuevo(); p.mision = Object.assign(b.mision, p.mision || {}); ['dron', 'foto', 'viento', 'plano'].forEach(k => { p.mision[k] = Object.assign({}, b.mision[k], p.mision[k]); }); p.mision.wps = p.mision.wps || []; ['checks', 'guion', 'camSel'].forEach(k => { p[k] = Object.assign({}, b[k], p[k]); }); p.extrasCheck = p.extrasCheck || []; p.tomas = p.tomas || []; p.normaId = p.normaId || 'gen'; return p; };
  A.abrir = async id => {
    const l = await D.proyectos(); let p = l.filter(x => x.id === id)[0] || l[0];
    if (!p) { p = A.proyectoNuevo('Mi primer proyecto'); await D.guardarProyecto(p); }
    A.est.proy = A.completar(p); T.ls('trabajos_drones_proyecto_dispositivo', p.id);
    A.est.plano = await D.plano(p.id).catch(() => null) || null;
    A.emit('proyecto');
  };
  A.perfil = () => A.est.normas.filter(n => n.id === A.est.proy.normaId)[0] || A.est.normas[0] || null;
  A.cargarCatalogos = async () => { A.est.equipo = await D.equipo(); A.est.normas = await D.normas(); };
  A.item = id => A.est.equipo.filter(x => x.id === id)[0] || null;
  /* camara+lente actuales -> {nombre,sw,sh,pw,ph,f,apertura,intervaloMin,fps,cam,len,mont} */
  A.camara = () => {
    const s = A.est.proy.camSel, c = A.item(s.cam) || A.item('cam_p4p'), l = A.item(s.len), fac = Cal.num(s.factor, 1) || 1; if (!c) return null;
    const fija = !c.mont || c.mont === 'fija', f = fija ? Cal.num(c.focal, 0) : l ? l.focal * fac : 0, ap = fija ? Cal.num(c.apertura, 2.8) : l ? l.apertura * fac : 0;
    return { nombre: c.nombre + (!fija && l ? ' + ' + l.nombre : ''), sw: c.sw, sh: c.sh, pw: c.pw, ph: c.ph, f, apertura: ap, intervaloMin: c.intervaloMin || 2, fps: c.fps || 30, cam: c, len: l, fija, factor: fac };
  };
  A.fotogrametria = () => {
    const cam = A.camara(), m = A.est.proy.mision; if (!cam || !cam.f) return null;
    const conF = m.wps.filter(w => w.fotoCada > 0 || w.accion === 'foto'), arr = conF.length ? conF : m.wps, alt = arr.length ? arr.reduce((a, w) => a + w.alt, 0) / arr.length : m.altDef;
    return Object.assign({ alt, nombre: cam.nombre, cam, vel: m.vel }, Cal.fotogrametria(cam, alt, m.foto.frontal, m.foto.lateral, m.vel));
  };
  A.estadisticas = () => { const m = A.est.proy.mision, f = A.fotogrametria(); return M.estadisticas(m, A.perfil(), f); };
})(window);
