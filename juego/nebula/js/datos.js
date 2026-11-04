// =============================================================
//  DATOS: ajustes, partida guardada (3 ranuras), récords y perfil.
//  Claves antiguas que siguen valiendo: nebula_record, nebula_musica,
//  nebula_silencio. Todo lo demás es nuevo y compatible hacia atrás.
// =============================================================
const Datos = (() => {
  const K_AJ = 'nebula_ajustes', K_SLOT = 'nebula_slot';
  const claveSave = (s) => (s ? 'nebula_save_' + s : 'nebula_save');

  const leer = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };

  const tactil = (() => { try { return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window; } catch (e) { return false; } })();

  // Presets de calidad gráfica
  const PRESETS = {
    baja:  { particulas: 0.35, brillo: false, resolucion: 1,   estrellas: 40,  capas: 1, estela: false, suavizado: false },
    media: { particulas: 0.7,  brillo: true,  resolucion: 1.25, estrellas: 70,  capas: 2, estela: false, suavizado: true },
    alta:  { particulas: 1,    brillo: true,  resolucion: 2,   estrellas: 110, capas: 3, estela: true,  suavizado: true },
    ultra: { particulas: 1.6,  brillo: true,  resolucion: 3,   estrellas: 170, capas: 3, estela: true,  suavizado: true },
  };
  const ORDEN_CAL = ['baja', 'media', 'alta', 'ultra'];

  const TECLAS_DEF = {
    izq: ['ArrowLeft', 'KeyA'], der: ['ArrowRight', 'KeyD'], arriba: ['ArrowUp', 'KeyW'], abajo: ['ArrowDown', 'KeyS'],
    fuego: ['Space', 'KeyJ'], hab: ['KeyX', 'ShiftLeft'], pausa: ['KeyP', 'Escape'],
  };

  function defecto() {
    return Object.assign({
      calidad: tactil ? 'media' : 'alta', autoCalidad: true, fpsLimite: 0, mostrarFps: false, sacudida: 1,
      volMaestro: 1, volMusica: 0.8, volEfectos: 0.9, pausaOculta: true,
      sens: 1, invertirY: false, autoDisparo: true, zona: 0.18, vibracion: true, vibInt: 1,
      tactilEscala: 1, tactilOp: 0.55, tactilY: 0.5, zurdo: false,
      textoGrande: false, daltonico: 'ninguno', reducirMov: false,
      dificultad: 'normal', ayudas: true,
      teclas: JSON.parse(JSON.stringify(TECLAS_DEF)),
    }, PRESETS[tactil ? 'media' : 'alta']);
  }

  let aj = defecto();
  const guardado = leer(K_AJ);
  if (guardado && typeof guardado === 'object') {
    for (const k in guardado) if (k in aj) aj[k] = guardado[k];
    for (const a in TECLAS_DEF) if (!aj.teclas[a] || !aj.teclas[a].length) aj.teclas[a] = TECLAS_DEF[a].slice();
  }

  function guardarAj() { escribir(K_AJ, aj); }
  function aplicarPreset(nombre) {
    const p = PRESETS[nombre]; if (!p) return;
    Object.assign(aj, p); aj.calidad = nombre; guardarAj();
  }
  function personalizar() { if (aj.calidad !== 'personalizada') aj.calidad = 'personalizada'; }

  // ------------------------------------------------ Partida
  let slot = parseInt(localStorage.getItem(K_SLOT), 10) || 0;
  if (slot < 0 || slot > 2) slot = 0;

  const MEJ0 = { casco: 0, motor: 0, canon: 0, cadencia: 0, reactor: 0, iman: 0, botin: 0, blindaje: 0 };
  const STATS0 = { partidas: 0, tiempo: 0, kills: 0, jefes: 0, creditosTotal: 0, maxCombo: 0, maxMult: 1, rozes: 0, habilidades: 0,
    muertes: 0, mejorOleada: 0, mejorPuntos: 0, disparos: 0, monedas: 0, sinDano: 0, diarios: 0, armasMax: 0 };

  function nuevoSave() {
    return { v: 2, creditos: 0, naveSel: 'centella', naves: { centella: 1 }, mej: Object.assign({}, MEJ0), record: 0,
      camp: { mundo: 1, mejor: [0, 0, 0, 0, 0, 0], completa: false }, jefes: {}, stats: Object.assign({}, STATS0),
      logros: {}, records: [], diario: {}, tutorial: false, ultimo: { modo: 'campana', mundo: 0, jefe: 0 } };
  }
  function normalizar(s) {
    const n = nuevoSave();
    if (!s || typeof s !== 'object') return n;
    for (const k in n) if (s[k] !== undefined && typeof s[k] === typeof n[k]) n[k] = s[k];
    n.mej = Object.assign({}, MEJ0, s.mej || {});
    n.stats = Object.assign({}, STATS0, s.stats || {});
    n.camp = Object.assign(nuevoSave().camp, s.camp || {});
    n.naves = Object.assign({ centella: 1 }, s.naves || {});
    if (!Array.isArray(n.records)) n.records = [];
    return n;
  }

  let save = cargarSlot(slot);
  function cargarSlot(i) {
    let s = leer(claveSave(i));
    if (!s && i === 0) { // migración: sólo había un récord suelto
      s = nuevoSave();
      try { s.record = parseInt(localStorage.getItem('nebula_record'), 10) || 0; } catch (e) { /* nada */ }
      s.stats.mejorPuntos = s.record;
    }
    return normalizar(s);
  }
  function guardarSave() {
    escribir(claveSave(slot), save);
    if (slot === 0) { try { localStorage.setItem('nebula_record', String(save.record)); } catch (e) { /* nada */ } }
  }
  function cambiarSlot(i) {
    slot = i; try { localStorage.setItem(K_SLOT, String(i)); } catch (e) { /* nada */ }
    save = cargarSlot(i); D.save = save;
  }

  // ------------------------------------------------ Perfil compartido
  function perfil() {
    const u = window.Cuenta && Cuenta.usuario; // la cuenta manda: nombre y color de la plataforma
    if (u && typeof u.nombre === 'string' && u.nombre) return { nombre: u.nombre.slice(0, 14), color: /^#[0-9a-f]{6}$/i.test(u.color) ? u.color : '#3df5ff' };
    const p = leer('juego_perfil');
    return { nombre: (p && typeof p.nombre === 'string' && p.nombre.trim().slice(0, 14)) || 'Jugador',
      color: (p && /^#[0-9a-f]{6}$/i.test(p.color)) ? p.color : '#3df5ff' };
  }

  // ------------------------------------------------ Récords
  const hoy = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  function entraEnTabla(modo, puntos) {
    const l = save.records.filter((r) => r.m === modo);
    return puntos > 0 && (l.length < 10 || puntos > l[l.length - 1].p);
  }
  function anotarRecord(modo, puntos, nombre, nave) {
    save.records.push({ n: nombre, p: puntos, m: modo, s: nave, f: hoy() });
    const resto = save.records.filter((r) => r.m !== modo);
    const l = save.records.filter((r) => r.m === modo).sort((a, b) => b.p - a.p).slice(0, 10);
    save.records = resto.concat(l);
    guardarSave();
  }
  function tabla(modo) { return save.records.filter((r) => r.m === modo).sort((a, b) => b.p - a.p); }

  // ------------------------------------------------ Exportar / importar / borrar
  function exportar() {
    return 'NEB1.' + btoa(unescape(encodeURIComponent(JSON.stringify({ save, aj, slot }))));
  }
  function importar(txt) {
    try {
      const t = String(txt).trim().replace(/^NEB1\./, '');
      const o = JSON.parse(decodeURIComponent(escape(atob(t))));
      if (!o || !o.save) return false;
      save = normalizar(o.save); D.save = save; guardarSave();
      if (o.aj) { for (const k in o.aj) if (k in aj) aj[k] = o.aj[k]; guardarAj(); }
      return true;
    } catch (e) { return false; }
  }
  function borrar() {
    save = nuevoSave(); D.save = save; guardarSave();
    try { localStorage.removeItem('nebula_record'); } catch (e) { /* nada */ }
  }

  // Vuelve a leer ajustes y partida desde localStorage (tras bajar el progreso de la nube) sin recargar la página.
  function recargar() {
    const g = leer(K_AJ);
    if (g && typeof g === 'object') {
      for (const k in g) if (k in aj) aj[k] = g[k];
      for (const a in TECLAS_DEF) if (!aj.teclas[a] || !aj.teclas[a].length) aj.teclas[a] = TECLAS_DEF[a].slice();
    }
    save = cargarSlot(slot); D.save = save;
  }

  const D = { recargar, aj, save, PRESETS, ORDEN_CAL, TECLAS_DEF, tactil, guardarAj, aplicarPreset, personalizar, guardarSave, cambiarSlot,
    get slot() { return slot; }, perfil, hoy, entraEnTabla, anotarRecord, tabla, exportar, importar, borrar, defecto,
    restaurarAjustes() { const d = defecto(); for (const k in d) aj[k] = d[k]; guardarAj(); } };
  return D;
})();
