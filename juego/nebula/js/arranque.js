// =============================================================
//  ARRANQUE + CUENTA: exige sesión, sincroniza el guardado con la nube
//  y SÓLO DESPUÉS carga los scripts del juego (así Datos lee ya los
//  datos sincronizados). Expone window.NebulaCuenta para el resto del juego.
//  Todo es tolerante a fallos: sin red / sin Cuenta el juego arranca igual.
// =============================================================
(function () {
  'use strict';
  const ID = 'nebula';
  // Progreso real: 3 ranuras + ajustes. (nebula_record es un derivado de la ranura 1; nebula_slot,
  // nebula_musica y nebula_silencio son preferencias del dispositivo: no se sincronizan.)
  const CLAVES = ['nebula_save', 'nebula_save_1', 'nebula_save_2', 'nebula_ajustes'];
  const SCRIPTS = ['js/config.js', 'js/datos.js', 'js/sonido.js', 'js/musica.js', 'js/contenido.js', 'js/entrada.js', 'js/sim.js',
    'js/dibujo.js', 'js/hud.js', 'js/ui.js', 'js/pantallas.js', 'js/juego.js', 'js/mp.js'];
  const C = () => window.Cuenta;
  const N = window.NebulaCuenta = { id: ID, claves: CLAVES, sync: null, sincronizando: false, ultimo: '', ultimaT: 0, bajadaPendiente: false, alBajar: null };
  const seguro = (f) => { try { return f(); } catch (e) { return undefined; } };
  const hayCuenta = () => !!(C() && C().usuario);

  // ------------------------------------------------ Nube
  N.sincronizar = async function () {
    if (!hayCuenta() || !N.sync) return { estado: 'sinSesion' };
    N.sincronizando = true;
    try { const r = await N.sync.ahora(); return r || { estado: 'igual' }; }
    catch (e) { return { estado: 'sinRed' }; }
    finally { N.sincronizando = false; }
  };
  N.estadoSync = function () {
    const c = C();
    if (!c || !c.usuario) return { txt: 'Sin sesión: el progreso sólo se guarda aquí', color: '#ff6b6b' };
    if (N.sincronizando) return { txt: 'Sincronizando…', color: '#3df5ff' };
    if (navigator.onLine === false || N.ultimo === 'sinRed') return { txt: 'Sin conexión: se enviará al volver la red', color: '#ffd23d' };
    const p = seguro(() => c.pendientes()) | 0;
    if (p > 0) return { txt: 'Pendiente: ' + p + (p === 1 ? ' cambio' : ' cambios') + ' por enviar', color: '#ffd23d' };
    if (N.ultimo === 'cancelado') return { txt: 'Conflicto sin resolver (decide en el siguiente aviso)', color: '#ffd23d' };
    if (!N.ultimaT) return { txt: 'Aún sin sincronizar en esta sesión', color: '#9a8cff' };
    const s = Math.max(0, Math.round((Date.now() - N.ultimaT) / 1000));
    return { txt: 'Sincronizado ' + (s < 10 ? 'ahora mismo' : s < 90 ? 'hace ' + s + ' s' : 'hace ' + Math.round(s / 60) + ' min'), color: '#7dffb3' };
  };

  // ------------------------------------------------ Perfil
  const imgs = {};
  N.avatar = function (px) {
    const u = seguro(() => C().usuario); if (!u) return null;
    const k = (u.avatar || '') + '|' + u.color;
    if (!imgs[k]) {
      const im = new Image(); im.ready = false;
      try {
        let svg = C().ui.avatarSvg(u.avatar, u.color, 64);
        if (svg.indexOf('xmlns') < 0) svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
        im.onload = () => { im.ready = true; };
        im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      } catch (e) { /* sin avatar */ }
      imgs[k] = im;
    }
    return imgs[k].ready ? imgs[k] : null;
  };
  N.volverAlPortal = function () { seguro(() => { location.href = C().portalUrl(); }); };
  N.cerrarSesion = async function () {
    try { await Promise.race([N.sincronizar(), new Promise((r) => setTimeout(r, 4000))]); } catch (e) { /* seguimos */ }
    try { if (N.sync) N.sync.parar(); await C().salir(); } catch (e) { /* seguimos */ }
    location.reload(); // requerir() mandará al portal
  };

  // ------------------------------------------------ Logros, XP y puntajes (nunca bloquean el juego)
  N.logro = function (id) { if (hayCuenta()) seguro(() => C().logro(ID, id).catch(() => {})); };
  N.xp = function (n) { if (hayCuenta() && n > 0) seguro(() => { const p = C().xp(ID, Math.min(50, Math.max(1, Math.round(n)))); if (p && p.catch) p.catch(() => {}); }); };
  // Repasa los logros locales (guardados antiguos / otro dispositivo): idempotente, la cuenta ignora los ya reportados.
  N.repasarLogros = function () {
    if (!hayCuenta() || !window.Datos) return;
    Object.keys(Datos.save.logros || {}).forEach((id) => N.logro(id));
  };
  const TOPE = { puntos: 100000000, oleada: 10000 };
  N.puntaje = async function (modo, valor) {
    valor = Math.floor(+valor || 0);
    if (!hayCuenta() || valor <= 0 || valor > TOPE[modo]) return null;
    try { return await C().puntaje(ID, modo, valor); } catch (e) { return null; }
  };
  // Al terminar una partida: envía puntajes, XP moderado y calcula la posición. Escribe en extra.rank.
  N.partidaTerminada = async function (res, modo, coop, extra) {
    if (!hayCuenta()) { extra.rank = { estado: 'sinSesion' }; return; }
    // XP por hito (oleadas, jefes y victoria), nunca por tiempo jugado: de 5 a 50.
    const xp = Math.min(50, 5 + Math.min(20, res.oleada | 0) + (res.jefes | 0) * 5 + (res.victoria ? 15 : 0));
    N.xp(xp);
    if (coop) { extra.rank = { estado: 'coop' }; return; } // la puntuación cooperativa es del equipo: no entra al ranking
    extra.rank = { estado: 'cargando' };
    try {
      const env = await N.puntaje('puntos', res.puntos);
      if (modo === 'infinito') await N.puntaje('oleada', res.oleada);
      const p = await C().miPosicion(ID, 'puntos');
      extra.rank = p ? { estado: 'ok', posicion: p.posicion, total: p.total, valor: p.valor, mejoro: env && env.mejoro, pendiente: env && env.pendiente } : { estado: 'vacio' };
    } catch (e) { extra.rank = { estado: 'error' }; }
    N.sincronizar();
  };

  // ------------------------------------------------ Rankings (Global / Amigos)
  const cacheRank = {};
  N.ranking = function (modo, amigos, alCargar) {
    const k = modo + (amigos ? ':a' : ':g'), c = cacheRank[k];
    if (c && (c.estado === 'cargando' || (c.estado !== 'error' && Date.now() - c.t < 20000))) return c;
    const nuevo = cacheRank[k] = { estado: 'cargando', t: Date.now(), lista: [], mi: null };
    if (!hayCuenta()) { nuevo.estado = 'sinSesion'; return nuevo; }
    (async () => {
      try {
        const l = await C().top(ID, modo, 10, { soloAmigos: !!amigos });
        nuevo.lista = l; nuevo.estado = l.length ? 'ok' : 'vacio';
        if (!amigos) { try { nuevo.mi = await C().miPosicion(ID, modo); } catch (e) { /* sin posición */ } }
      } catch (e) { nuevo.estado = 'error'; nuevo.t = 0; }
      nuevo.t = nuevo.estado === 'error' ? 0 : Date.now();
      if (alCargar) alCargar();
    })();
    return nuevo;
  };
  N.olvidarRankings = () => { for (const k in cacheRank) delete cacheRank[k]; };

  // ------------------------------------------------ Carga
  function cargarScript(src) {
    return new Promise((ok) => {
      const s = document.createElement('script'); s.src = src; s.async = false;
      s.onload = () => ok(true); s.onerror = () => { console.error('No se pudo cargar ' + src); ok(false); };
      document.body.appendChild(s);
    });
  }
  async function cargarJuego() {
    for (const s of SCRIPTS) await cargarScript(s);
    const t = document.getElementById('cargando'); if (t) t.remove();
  }
  async function iniciar() {
    let u = null;
    try {
      if (C()) {
        // El mando de la plataforma (avisos, conflicto de guardado) vale también aquí; el juego cede el mando mientras haya un aviso modal.
        seguro(() => { C().ui.mandoPropio = true; });
        u = await C().requerir();
      }
    } catch (e) { u = null; }
    if (u) {
      try {
        C().on('sincronizado', (juego, r) => {
          if (juego !== ID || !r) return;
          N.ultimo = r.estado;
          if (r.estado === 'igual' || r.estado === 'subido' || r.estado === 'bajado') N.ultimaT = Date.now();
          if (r.estado === 'bajado') { N.bajadaPendiente = true; if (N.alBajar) N.alBajar(); }
        });
        N.sync = C().nube.autoSincronizar(ID, CLAVES, { preguntar: true });
        // Esperamos la primera sincronización (con límite) para que Datos lea el progreso ya actualizado.
        await Promise.race([N.sync.primera.catch(() => {}), new Promise((r) => setTimeout(r, 5000))]);
        N.bajadaPendiente = false; // lo bajado antes de arrancar ya está en localStorage
      } catch (e) { /* el juego sigue sin nube */ }
    }
    await cargarJuego();
    N.listo = true;
    N.repasarLogros();
  }
  iniciar();
})();
