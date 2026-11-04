// =============================================================
//  ⚙️  AJUSTES: gráficos, audio, controles, accesibilidad y datos.
//  Se guardan en localStorage (clave ciudad_g_ajustes, común a las ranuras).
// =============================================================
const Ajustes = (() => {
  const PRESETS = {
    baja:  { resolucion: 0.75, sombras: false, detalle: 0.55, particulas: 0.35, luces: 0, reflejos: false, antialias: false, fpsMax: 30 },
    media: { resolucion: 1,    sombras: true,  detalle: 0.8,  particulas: 0.7,  luces: 1, reflejos: false, antialias: true,  fpsMax: 60 },
    alta:  { resolucion: 1.5,  sombras: true,  detalle: 1,    particulas: 1,    luces: 1, reflejos: true,  antialias: true,  fpsMax: 60 },
    ultra: { resolucion: 2,    sombras: true,  detalle: 1.35, particulas: 1.5,  luces: 2, reflejos: true,  antialias: true,  fpsMax: 0 },
  };
  const ORDEN = ['baja', 'media', 'alta', 'ultra'];

  // Acciones remapeables: [id, nombre, tecla por defecto]
  const ACCIONES = [
    ['arriba', 'Acelerar / Arriba', 'KeyW'], ['abajo', 'Frenar / Abajo', 'KeyS'], ['izq', 'Izquierda', 'KeyA'], ['der', 'Derecha', 'KeyD'],
    ['freno', 'Freno de mano', 'Space'], ['accion', 'Subir / bajar / usar', 'KeyE'], ['radio', 'Radio / Recargar', 'KeyR'],
    ['claxon', 'Claxon / Sirena', 'KeyH'], ['disparar', 'Disparar', 'KeyF'], ['arma', 'Cambiar arma', 'KeyQ'],
    ['mapa', 'Mapa', 'KeyM'], ['pausa', 'Pausa', 'KeyP'], ['correr', 'Correr', 'ShiftLeft'], ['telefono', 'Teléfono', 'KeyT'],
  ];

  function deteccion() {
    let base = 'alta';
    const movil = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    const nucleos = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;
    if (movil) base = (nucleos <= 4 || mem <= 3) ? 'baja' : 'media';
    else if (nucleos <= 2) base = 'media';
    return base;
  }

  const defecto = () => Object.assign({
    calidad: deteccion(), autoCalidad: true, mostrarFps: false,
    maestro: 0.8, musica: 0.8, efectos: 0.9, silencio: false,
    sensibilidad: 1, invertirY: false, zonaMuerta: 0.1, vibracion: true, vibIntensidad: 1,
    teclas: {}, tacTamano: 1, tacOpacidad: 1, tacPos: 0, zurdo: false,
    textoGrande: false, daltonismo: 'no', sinMovimiento: false, unidades: 'kmh',
  }, PRESETS[deteccion()]);

  let v = Object.assign(defecto(), Util.cargarG('ajustes', {}));
  if (typeof v.teclas !== 'object' || !v.teclas) v.teclas = {};
  const base = {
    trafico: CONFIG.trafico.cantidad, estacionados: CONFIG.trafico.estacionados, peatones: CONFIG.peatones.cantidad,
    sacudida: CONFIG.efectos.sacudida, humo: CONFIG.efectos.humo,
  };

  const guardar = () => Util.guardarG('ajustes', v);

  function aplicarPreset(nombre) {
    const p = PRESETS[nombre];
    if (!p) return;
    Object.assign(v, p);
    v.calidad = nombre;
  }

  // ----------------------------------------------------------- Daltonismo (filtro SVG)
  const MATRICES = {
    protan: '0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0',
    deutan: '0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0',
    tritan: '0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0',
  };
  function filtroDaltonico() {
    let f = document.getElementById('filtroDalt');
    if (!f) {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
      svg.innerHTML = '<filter id="filtroDalt" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter>';
      document.body.appendChild(svg);
      f = svg.firstChild;
    }
    return f.firstChild;
  }

  // ----------------------------------------------------------- Teclas
  const aFisico = {};
  const bloqueadas = new Set();
  function reconstruirTeclas() {
    for (const k in aFisico) delete aFisico[k];
    bloqueadas.clear();
    for (const [id, , def] of ACCIONES) {
      const t = v.teclas[id];
      if (t && t !== def) { aFisico[t] = def; bloqueadas.add(def); }
    }
    for (const k in aFisico) bloqueadas.delete(k);
  }
  const teclaDe = (id) => v.teclas[id] || ACCIONES.find((a) => a[0] === id)[2];

  // ----------------------------------------------------------- Aplicar todo
  function aplicar() {
    const b = document.body;
    b.classList.toggle('texto-grande', !!v.textoGrande);
    b.classList.toggle('sin-movimiento', !!v.sinMovimiento);
    b.classList.toggle('zurdo', !!v.zurdo);
    const r = document.documentElement.style;
    r.setProperty('--tac-escala', String(v.tacTamano));
    r.setProperty('--tac-op', String(v.tacOpacidad));
    r.setProperty('--tac-y', v.tacPos + 'px');
    const lienzo = document.getElementById('lienzo');
    if (lienzo) {
      if (v.daltonismo !== 'no') {
        filtroDaltonico().setAttribute('values', MATRICES[v.daltonismo]);
        lienzo.style.filter = 'url(#filtroDalt)';
      } else lienzo.style.filter = '';
    }
    CONFIG.trafico.cantidad = Math.max(4, Math.round(base.trafico * v.detalle));
    CONFIG.trafico.estacionados = Math.max(3, Math.round(base.estacionados * v.detalle));
    CONFIG.peatones.cantidad = Math.max(8, Math.round(base.peatones * v.detalle));
    CONFIG.efectos.sacudida = base.sacudida && !v.sinMovimiento;
    CONFIG.efectos.humo = base.humo * Math.max(0.3, v.particulas);
    CONFIG.pantalla.resolucionMax = v.resolucion;
    if (window.Efectos && Efectos.escala) Efectos.escala(v.sinMovimiento ? Math.min(0.4, v.particulas) : v.particulas);
    if (window.Sonido && Sonido.volumenes) Sonido.volumenes(v.silencio ? 0 : v.maestro * CONFIG.audio.volumen * 1.25, v.musica * CONFIG.audio.radio * 1.25, v.efectos);
    reconstruirTeclas();
    if (window.CIUDAD_REDIM) CIUDAD_REDIM();
    guardar();
  }

  // ----------------------------------------------------------- FPS
  let fps = 60, relojBaja = 0, enfriar = 20, ultimoDibujo = 0;
  let fpsEl = null;
  function muestra(dt) {
    if (dt <= 0) return;
    fps += (1 / dt - fps) * 0.05;
    if (v.mostrarFps) {
      if (!fpsEl) { fpsEl = document.createElement('div'); fpsEl.id = 'fps'; document.body.appendChild(fpsEl); }
      if ((J.tiempo * 4 | 0) !== muestra.u) { muestra.u = J.tiempo * 4 | 0; fpsEl.textContent = Math.round(fps) + ' FPS'; }
    } else if (fpsEl) { fpsEl.remove(); fpsEl = null; }
    enfriar -= dt;
    if (!v.autoCalidad || J.modo !== 'jugando' || enfriar > 0) { relojBaja = 0; return; }
    const objetivo = v.fpsMax ? Math.min(v.fpsMax, 60) : 60;
    if (fps < Math.min(24, objetivo * 0.6)) relojBaja += dt; else relojBaja = Math.max(0, relojBaja - dt);
    if (relojBaja > 5) {
      relojBaja = 0;
      enfriar = 25;
      const k = ORDEN.indexOf(v.calidad);
      if (k > 0) {
        aplicarPreset(ORDEN[k - 1]);
        aplicar();
        if (window.J && J.pista) J.pista('Rendimiento bajo: calidad ' + ORDEN[k - 1].toUpperCase());
      }
    }
  }

  // true = saltarse este cuadro (limite de FPS)
  function saltar(ahora) {
    if (!v.fpsMax) return false;
    const paso = 1000 / v.fpsMax;
    if (ahora - ultimoDibujo < paso - 3) return true;
    ultimoDibujo = ahora;
    return false;
  }

  // ----------------------------------------------------------- Datos (ranuras, exportar, importar)
  function clavesDeRanura(n) {
    const pre = Util.prefijo(n);
    const ks = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(pre)) continue;
        if (n === 1 && (/^ciudad_s[23]_/.test(k) || k.startsWith('ciudad_g_'))) continue;
        ks.push(k);
      }
    } catch (e) { /* sin almacenamiento */ }
    return ks;
  }

  function resumenRanura(n) {
    try {
      const pre = Util.prefijo(n);
      const d = JSON.parse(localStorage.getItem(pre + 'dinero'));
      const s = JSON.parse(localStorage.getItem(pre + 'stats')) || {};
      if (d === null && !s.misiones) return 'vacía';
      return `${Util.dinero(d || 0)} · ${s.misiones || 0} misiones · ${(s.km || 0).toFixed(1)} km`;
    } catch (e) { return 'vacía'; }
  }

  function exportar() {
    const datos = {};
    for (const k of clavesDeRanura(Util.ranura)) datos[k.slice(Util.prefijo().length)] = localStorage.getItem(k);
    const json = JSON.stringify({ juego: 'ciudad', v: 2, ranura: Util.ranura, datos });
    try { return 'CL2:' + btoa(unescape(encodeURIComponent(json))); } catch (e) { return json; }
  }

  function importar(texto) {
    try {
      texto = String(texto || '').trim();
      if (texto.startsWith('CL2:')) texto = decodeURIComponent(escape(atob(texto.slice(4))));
      const o = JSON.parse(texto);
      if (!o || o.juego !== 'ciudad' || typeof o.datos !== 'object') return false;
      for (const k of clavesDeRanura(Util.ranura)) localStorage.removeItem(k);
      for (const c in o.datos) localStorage.setItem(Util.prefijo() + c, o.datos[c]);
      return true;
    } catch (e) { return false; }
  }

  function borrarRanura(n) {
    for (const k of clavesDeRanura(n)) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } }
  }

  function cambiarRanura(n) {
    try { J.guardarPartida(); } catch (e) { /* nada */ }
    Util.guardarG('slot', n);
    location.reload();
  }

  // ----------------------------------------------------------- Menú
  const nada = () => 0;
  let borrando = 0;
  let textoExport = '';

  function filasGraficos() {
    const f = [];
    f.push({ t: 'selector', texto: 'Calidad', get: () => v.calidad, set: (x) => { if (x !== 'personal') { aplicarPreset(x); aplicar(); } else v.calidad = 'personal'; }, opciones: [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra'], ['personal', 'Personal']], alCambiar: () => Panel.refrescar() });
    const pers = (k) => (x) => { v[k] = x; v.calidad = 'personal'; };
    f.push({ t: 'selector', texto: 'Resolución', get: () => v.resolucion, set: pers('resolucion'), opciones: [[0.6, '60%'], [0.75, '75%'], [1, '100%'], [1.5, '150%'], [2, '200%']], alCambiar: aplicar });
    f.push({ t: 'interruptor', texto: 'Sombras de carros y edificios', get: () => v.sombras, set: pers('sombras'), alCambiar: aplicar });
    f.push({ t: 'deslizador', texto: 'Detalle (tráfico y gente)', min: 0.3, max: 1.6, paso: 0.05, get: () => v.detalle, set: pers('detalle'), fmt: (x) => Math.round(x * 100) + '%', alCambiar: aplicar });
    f.push({ t: 'deslizador', texto: 'Partículas y humo', min: 0.2, max: 2, paso: 0.1, get: () => v.particulas, set: pers('particulas'), fmt: (x) => Math.round(x * 100) + '%', alCambiar: aplicar });
    f.push({ t: 'selector', texto: 'Luces de noche', get: () => v.luces, set: pers('luces'), opciones: [[0, 'Básicas'], [1, 'Normales'], [2, 'Máximas']], alCambiar: aplicar });
    f.push({ t: 'interruptor', texto: 'Reflejos en mojado y neón', get: () => v.reflejos, set: pers('reflejos'), alCambiar: aplicar });
    f.push({ t: 'interruptor', texto: 'Suavizado (antialias)', get: () => v.antialias, set: pers('antialias'), alCambiar: aplicar });
    f.push({ t: 'selector', texto: 'Límite de FPS', get: () => v.fpsMax, set: pers('fpsMax'), opciones: [[30, '30'], [45, '45'], [60, '60'], [90, '90'], [120, '120'], [0, 'Sin límite']], alCambiar: aplicar });
    f.push({ t: 'interruptor', texto: 'Mostrar FPS', get: () => v.mostrarFps, set: (x) => { v.mostrarFps = x; }, alCambiar: aplicar });
    f.push({ t: 'interruptor', texto: 'Bajar calidad solo si va lento', get: () => v.autoCalidad, set: (x) => { v.autoCalidad = x; }, alCambiar: aplicar });
    f.push({ t: 'interruptor', texto: 'Pantalla completa', get: () => !!document.fullscreenElement, set: () => { if (window.CIUDAD_PANTALLA) CIUDAD_PANTALLA(); setTimeout(Panel.refrescar, 250); } });
    return f;
  }

  function filasAudio() {
    const pct = (x) => Math.round(x * 100) + '%';
    return [
      { t: 'deslizador', texto: 'Volumen general', min: 0, max: 1, paso: 0.05, get: () => v.maestro, set: (x) => { v.maestro = x; }, fmt: pct, alCambiar: aplicar },
      { t: 'deslizador', texto: 'Música (radio)', min: 0, max: 1, paso: 0.05, get: () => v.musica, set: (x) => { v.musica = x; }, fmt: pct, alCambiar: aplicar },
      { t: 'deslizador', texto: 'Efectos y motor', min: 0, max: 1, paso: 0.05, get: () => v.efectos, set: (x) => { v.efectos = x; }, fmt: pct, alCambiar: aplicar },
      { t: 'interruptor', texto: 'Silenciar todo', get: () => v.silencio, set: (x) => { v.silencio = x; }, alCambiar: aplicar },
      { t: 'info', texto: 'El audio se pausa solo cuando escondes la pestaña.', valor: '' },
    ];
  }

  function filasControles() {
    const f = [
      { t: 'deslizador', texto: 'Sensibilidad (giro y cámara)', min: 0.5, max: 1.6, paso: 0.05, get: () => v.sensibilidad, set: (x) => { v.sensibilidad = x; }, fmt: (x) => x.toFixed(2), alCambiar: aplicar },
      { t: 'interruptor', texto: 'Invertir eje Y de la cámara', get: () => v.invertirY, set: (x) => { v.invertirY = x; }, alCambiar: aplicar },
      { t: 'deslizador', texto: 'Zona muerta del mando', min: 0, max: 0.5, paso: 0.02, get: () => v.zonaMuerta, set: (x) => { v.zonaMuerta = x; }, fmt: (x) => Math.round(x * 100) + '%', alCambiar: aplicar },
      { t: 'interruptor', texto: 'Vibración del mando', get: () => v.vibracion, set: (x) => { v.vibracion = x; }, alCambiar: aplicar },
      { t: 'deslizador', texto: 'Intensidad de vibración', min: 0.1, max: 1, paso: 0.1, get: () => v.vibIntensidad, set: (x) => { v.vibIntensidad = x; }, fmt: (x) => Math.round(x * 100) + '%', alCambiar: aplicar },
      { t: 'titulo', texto: 'CONTROLES TÁCTILES' },
      { t: 'deslizador', texto: 'Tamaño de botones', min: 0.7, max: 1.4, paso: 0.05, get: () => v.tacTamano, set: (x) => { v.tacTamano = x; }, fmt: (x) => Math.round(x * 100) + '%', alCambiar: aplicar },
      { t: 'deslizador', texto: 'Opacidad', min: 0.3, max: 1, paso: 0.05, get: () => v.tacOpacidad, set: (x) => { v.tacOpacidad = x; }, fmt: (x) => Math.round(x * 100) + '%', alCambiar: aplicar },
      { t: 'deslizador', texto: 'Altura (subir los controles)', min: 0, max: 120, paso: 10, get: () => v.tacPos, set: (x) => { v.tacPos = x; }, fmt: (x) => x + ' px', alCambiar: aplicar },
      { t: 'interruptor', texto: 'Modo zurdo (joystick a la derecha)', get: () => v.zurdo, set: (x) => { v.zurdo = x; }, alCambiar: aplicar },
      { t: 'titulo', texto: 'TECLADO (pulsa una fila y luego la tecla; Esc cancela)' },
    ];
    for (const [id, nombre] of ACCIONES) {
      f.push({ t: 'tecla', texto: nombre, get: () => teclaDe(id), set: (c) => { v.teclas[id] = c; aplicar(); } });
    }
    f.push({ t: 'boton', texto: 'Restablecer teclas', accion: () => { v.teclas = {}; aplicar(); Panel.refrescar(); } });
    return f;
  }

  function filasAccesibilidad() {
    return [
      { t: 'interruptor', texto: 'Texto grande', get: () => v.textoGrande, set: (x) => { v.textoGrande = x; }, alCambiar: aplicar },
      { t: 'selector', texto: 'Modo daltónico', get: () => v.daltonismo, set: (x) => { v.daltonismo = x; }, opciones: [['no', 'Desactivado'], ['protan', 'Protanopía'], ['deutan', 'Deuteranopía'], ['tritan', 'Tritanopía']], alCambiar: aplicar },
      { t: 'interruptor', texto: 'Reducir movimiento y efectos', get: () => v.sinMovimiento, set: (x) => { v.sinMovimiento = x; }, alCambiar: aplicar },
      { t: 'selector', texto: 'Velocidad en', get: () => v.unidades, set: (x) => { v.unidades = x; }, opciones: [['kmh', 'km/h'], ['mph', 'mph']], alCambiar: aplicar },
    ];
  }

  function filasDatos() {
    const f = [{ t: 'titulo', texto: 'RANURAS DE GUARDADO' }];
    for (let n = 1; n <= 3; n++) {
      const act = n === Util.ranura;
      f.push({
        t: 'boton', texto: `Ranura ${n}${act ? ' (activa)' : ''}`, nota: resumenRanura(n), color: act ? '#7dff9a' : '#3df5ff',
        accion: () => { if (!act) cambiarRanura(n); },
      });
    }
    if (window.CuentaJuego) CuentaJuego.filasNube().forEach((x) => f.push(x));
    f.push({ t: 'titulo', texto: 'COPIA DE SEGURIDAD (ranura activa)' });
    f.push({ t: 'boton', texto: 'Exportar guardado como texto', accion: () => { textoExport = exportar(); Panel.refrescar(); } });
    f.push({ t: 'area', texto: 'Aquí aparece el texto exportado, o pega uno para importar', filas: 3, valor: textoExport, soloLectura: false });
    f.push({
      t: 'boton', texto: 'Importar el texto de arriba', accion: () => {
        const ta = document.querySelector('#panel textarea');
        const ok = importar(ta ? ta.value : textoExport);
        J.pista(ok ? 'Guardado importado. Recargando...' : 'Texto no válido');
        if (ok) setTimeout(() => location.reload(), 600);
      },
    });
    f.push({
      t: 'boton', texto: borrando ? '¿Seguro? Pulsa otra vez para borrar' : 'Borrar datos de esta ranura', peligro: true, accion: () => {
        if (!borrando) { borrando = 1; Panel.refrescar(); setTimeout(() => { borrando = 0; }, 4000); return; }
        borrarRanura(Util.ranura);
        J.pista('Datos borrados. Recargando...');
        setTimeout(() => location.reload(), 500);
      },
    });
    f.push({
      t: 'boton', texto: 'Restablecer ajustes', peligro: true, accion: () => { v = Object.assign(defecto(), {}); aplicar(); Panel.refrescar(); },
    });
    return f;
  }

  function abrir(pestana) {
    const tabs = [
      { id: 'gra', nombre: 'GRÁFICOS', filas: filasGraficos },
      { id: 'aud', nombre: 'AUDIO', filas: filasAudio },
      { id: 'ctl', nombre: 'CONTROLES', filas: filasControles },
      { id: 'acc', nombre: 'ACCESIBILIDAD', filas: filasAccesibilidad },
      { id: 'dat', nombre: 'DATOS', filas: filasDatos },
    ];
    Panel.abrir({ titulo: 'AJUSTES', pestanas: tabs, tab: Math.max(0, tabs.findIndex((t) => t.id === pestana)), alCerrar: () => { guardar(); } });
  }

  reconstruirTeclas();

  return {
    get v() { return v; },
    aplicar, abrir, muestra, saltar, aplicarPreset,
    teclaDe, ACCIONES, aFisico, bloqueadas,
    traducir(c) {
      if (aFisico[c]) return aFisico[c];
      if (bloqueadas.has(c)) return '__libre';
      return c;
    },
    get fps() { return fps; },
    exportar, importar, resumenRanura,
    get sombras() { return v.sombras; },
  };
})();
