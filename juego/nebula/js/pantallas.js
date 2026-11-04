// =============================================================
//  PANTALLAS: definición de todos los menús (usa UI y Juego).
// =============================================================
const Pantallas = (() => {
  const W = CONFIG.ancho, H = CONFIG.alto, TAU = Math.PI * 2;
  const save = () => Datos.save, aj = () => Datos.aj;
  const P = {};
  const btn = (txt, fn, o) => Object.assign({ t: 'btn', txt, fn }, o);
  const tog = (txt, get, set, o) => Object.assign({ t: 'tog', txt, get, set }, o);
  const sli = (txt, get, set, min, max, paso, fmt) => ({ t: 'sli', txt, get, set, min, max, paso, fmt });
  const sel = (txt, opts, idx, set, o) => Object.assign({ t: 'sel', txt, opts, idx, set }, o);
  const txtf = (txt, o) => Object.assign({ t: 'txt', txt }, o);
  const pct = (v) => Math.round(v * 100) + '%';
  const NC = () => window.NebulaCuenta, usr = () => (window.Cuenta && Cuenta.usuario) || null;
  const titulo = (g, t) => {};

  function fondoMenu(g, t) { Dibujo.fondoMundo(0); Dibujo.fondo(g, t, 1 / 60, 1); }
  function iconos() {
    const vol = (g, x, y, on) => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 8, y - 3); g.lineTo(x - 3, y - 3); g.lineTo(x + 3, y - 8); g.lineTo(x + 3, y + 8); g.lineTo(x - 3, y + 3); g.lineTo(x - 8, y + 3); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; if (on) { g.beginPath(); g.arc(x + 4, y, 6, -0.9, 0.9); g.stroke(); } else { g.beginPath(); g.moveTo(x + 6, y - 5); g.lineTo(x + 12, y + 5); g.moveTo(x + 12, y - 5); g.lineTo(x + 6, y + 5); g.stroke(); } };
    return [
      { x: W - 118, y: 30, fn: () => Musica.alternar(), on: Musica.activa, dib: (g, x, y) => { g.fillStyle = Musica.activa ? '#fff' : '#6a6090'; g.beginPath(); g.ellipse(x - 3, y + 5, 5, 3.5, -0.3, 0, TAU); g.fill(); g.fillRect(x + 1, y - 8, 2, 14); g.fillRect(x + 1, y - 8, 7, 3); } },
      { x: W - 74, y: 30, fn: () => Sonido.alternar(), dib: (g, x, y) => vol(g, x, y, !Sonido.silenciado) },
      { x: W - 30, y: 30, fn: () => Juego.pantallaCompleta(), dib: (g, x, y) => { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 8, y - 3); g.lineTo(x - 8, y - 8); g.lineTo(x - 3, y - 8); g.moveTo(x + 3, y - 8); g.lineTo(x + 8, y - 8); g.lineTo(x + 8, y - 3); g.moveTo(x + 8, y + 3); g.lineTo(x + 8, y + 8); g.lineTo(x + 3, y + 8); g.moveTo(x - 3, y + 8); g.lineTo(x - 8, y + 8); g.lineTo(x - 8, y + 3); g.stroke(); } },
    ];
  }

  // ------------------------------------------------ Principal
  P.principal = () => ({
    titulo: '', sinCabecera: true, noraiz: true, fondo: fondoMenu, panel: false, icos: iconos(),
    filas: () => [
      txtf('', { h: 126 }),
      btn('JUGAR', () => UI.empujar(P.modos()), { tam: 22, alto: 54 }),
      btn('MULTIJUGADOR', () => Juego.abrirLobby(), { sub: 'Cooperativo online · 2-4 jugadores', alto: 50 }),
      btn('HANGAR', () => UI.empujar(P.hangar()), { sub: Util.fmt(save().creditos) + ' créditos', alto: 50 }),
      btn('RÉCORDS', () => UI.empujar(P.records()), { alto: 44 }),
      btn('LOGROS', () => UI.empujar(P.logros()), { sub: Object.keys(save().logros).length + ' / ' + LOGROS.length, alto: 50 }),
      btn('ESTADÍSTICAS', () => UI.empujar(P.stats()), { alto: 40 }),
      btn('AJUSTES', () => UI.empujar(P.ajustes()), { alto: 40 }),
      btn('AYUDA', () => UI.empujar(P.ayuda()), { alto: 40 }),
      ...(usr() ? [btn('CUENTA', () => UI.empujar(P.cuenta()), { alto: 40, sub: usr().nombre + ' · Nivel ' + usr().nivel, color: '#3a5a9a' })] : []),
    ],
    dibujar: (g, t) => {
      const y = 96 + Math.sin(t * 1.5) * 4;
      g.save(); g.translate(W / 2, y); Dibujo.halo(g, 0, 0, 200, 'rgba(120,80,255,.3)');
      UI.txt(g, 'NEBULA', 0, 0, 58, '#ffffff', 'center', 800);
      g.globalAlpha = 0.5; UI.txt(g, 'NEBULA', 3, 3, 58, '#3df5ff', 'center', 800); g.globalAlpha = 1; g.restore();
      UI.txt(g, 'SHOOTER ESPACIAL ARCADE', W / 2, 142, 12, '#9a8cff', 'center', 500);
      for (let i = 0; i < 3; i++) { const sp = Dibujo.sprNave(NAVES[(i * 2) % 5].id); if (sp) g.drawImage(sp, W / 2 - 40 + (i - 1) * 170 + Math.sin(t + i) * 8, 168 + Math.cos(t * 1.2 + i) * 6, 80, 80); }
      const p = Datos.perfil();
      const av = NC() && usr() ? NC().avatar(24) : null;
      if (av) g.drawImage(av, 16, H - 52, 24, 24);
      UI.txt(g, p.nombre + ' · Ranura ' + (Datos.slot + 1), av ? 46 : 16, H - 40, 11, p.color, 'left');
    },
  });

  // ------------------------------------------------ Modos y preparación
  P.modos = () => ({
    titulo: 'JUGAR', fondo: fondoMenu,
    filas: () => {
      const d = Juego.diario();
      return [
        btn('CAMPAÑA', () => UI.empujar(P.preparar('campana')), { sub: 'Mundo ' + save().camp.mundo + ' de 6 desbloqueado' }),
        btn('INFINITO', () => UI.empujar(P.preparar('infinito')), { sub: 'Récord: ' + Util.fmt(Math.max(0, ...Datos.tabla('infinito').map((r) => r.p), 0)) }),
        btn('DUELO DE JEFES', () => UI.empujar(P.preparar('jefes')), { sub: 'Vence a los jefes seguidos o uno a uno' }),
        btn('DESAFÍO DIARIO', () => UI.empujar(P.preparar('diario')), { sub: d.mod.nombre + (save().diario[d.fecha] ? ' · Hoy: ' + Util.fmt(save().diario[d.fecha]) : '') }),
      ];
    },
  });

  function vistaNave(def) {
    return (g, x, y, w, h) => {
      const sp = Dibujo.sprNave(def().id); if (sp) g.drawImage(sp, x + w - 96, y + h / 2 - 40, 80, 80);
      const n = def(); UI.txt(g, n.desc, x + 16, y + 44, 11, '#9a8cff', 'left', 500);
      const barra = (k, v, c, yy) => { UI.txt(g, k, x + 16, yy, 10, '#c9c2ff', 'left', 500); g.fillStyle = '#2a2250'; g.fillRect(x + 90, yy - 4, 110, 8); g.fillStyle = c; g.fillRect(x + 90, yy - 4, 110 * Math.min(1, v), 8); };
      barra('VELOCIDAD', n.vel / 460, '#3df5ff', y + 64); barra('RESISTENCIA', n.vida / 5, '#ff5c8a', y + 80); barra('POTENCIA', n.dmg / 1.4 * (0.15 / n.cad) * 0.8, '#ffd23d', y + 96);
      UI.txt(g, n.habNombre + ': ' + n.habDesc, x + 16, y + 114, 10, '#7dffb3', 'left', 500);
    };
  }

  P.preparar = (modo) => {
    const cfg = { modo, nave: Math.max(0, NAVES.findIndex((n) => n.id === save().naveSel)), mundo: 0, jefe: -1, dif: aj().dificultad };
    const u = save().ultimo; if (u && u.modo === modo) { cfg.mundo = Math.min(u.mundo, save().camp.mundo - 1); }
    const propias = () => NAVES.map((n, i) => i).filter((i) => save().naves[NAVES[i].id]);
    const dia = Juego.diario();
    return {
      titulo: MODOS.find((m) => m.id === modo).nombre.toUpperCase(), sub: () => MODOS.find((m) => m.id === modo).desc, fondo: fondoMenu,
      filas: () => {
        const f = [];
        if (modo === 'diario') {
          f.push(txtf('Misma semilla para todos hoy (' + dia.fecha + ')', { centro: true }));
          f.push(txtf('Modificador: ' + dia.mod.nombre, { centro: true, color: '#ffd23d', peso: 800, tam: 15 }));
          f.push(txtf(dia.mod.desc, { centro: true }));
          f.push(txtf('Nave del día: ' + dia.nave.nombre + ' (sin mejoras)', { centro: true, color: '#7dffb3' }));
          f.push(txtf('Mundo inicial: ' + MUNDOS[dia.mundo].nombre, { centro: true }));
          f.push(txtf('10 oleadas con jefes en la 5 y la 10', { centro: true }));
        } else {
          const own = propias();
          f.push(sel('Nave', own.map((i) => NAVES[i].nombre), () => Math.max(0, own.indexOf(cfg.nave)), (k) => { cfg.nave = own[k]; }, { alto: 132, dib: (g, x, y, w, h) => vistaNave(() => NAVES[cfg.nave])(g, x, y + 8, w, h) }));
          if (modo === 'campana') { const n = save().camp.mundo; f.push(sel('Mundo inicial', MUNDOS.slice(0, n).map((m, i) => (i + 1) + '. ' + m.nombre), () => Math.min(cfg.mundo, n - 1), (k) => { cfg.mundo = k; })); }
          if (modo === 'jefes') { const ids = [-1]; for (let i = 0; i < 6; i++) if (i === 0 || save().camp.mundo > i || save().jefes[JEFES[i].id]) ids.push(i); f.push(sel('Jefe', ids.map((i) => (i < 0 ? 'Todos seguidos' : JEFES[i].nombre)), () => Math.max(0, ids.indexOf(cfg.jefe)), (k) => { cfg.jefe = ids[k]; })); }
          f.push(sel('Dificultad', ['Fácil', 'Normal', 'Difícil'], () => ['facil', 'normal', 'dificil'].indexOf(cfg.dif), (k) => { cfg.dif = ['facil', 'normal', 'dificil'][k]; }));
        }
        f.push(btn('COMENZAR', () => Juego.comenzar(cfg), { color: '#2ad48a', tam: 20 }));
        return f;
      },
    };
  };

  // ------------------------------------------------ Hangar
  P.hangar = () => ({
    titulo: 'HANGAR', tabs: ['Naves', 'Mejoras'], fondo: fondoMenu, sub: () => 'Créditos: ' + Util.fmt(save().creditos),
    filas: (tab) => {
      const s = save();
      if (tab === 0) return NAVES.map((n) => {
        const tiene = !!s.naves[n.id], sel_ = s.naveSel === n.id;
        return btn(n.nombre.toUpperCase() + (sel_ ? '  (EQUIPADA)' : ''), () => {
          if (tiene) { s.naveSel = n.id; Datos.guardarSave(); Sonido.clic(); }
          else if (s.creditos >= n.precio) { s.creditos -= n.precio; s.naves[n.id] = 1; s.naveSel = n.id; Datos.guardarSave(); Sonido.compra(); Juego.logro('comprador'); if (NAVES.every((q) => s.naves[q.id])) Juego.logro('flota'); }
          else Hud.toast('Créditos insuficientes', '#ff6b6b');
        }, { alto: 140, color: sel_ ? '#3df5ff' : '#5b3fd1', dib: (g, x, y, w, h) => {
          vistaNave(() => n)(g, x, y + 10, w, h);
          UI.txt(g, tiene ? (sel_ ? '' : 'Pulsa para equipar') : Util.fmt(n.precio) + ' créditos', x + w - 16, y + 18, 11, tiene ? '#9a8cff' : (s.creditos >= n.precio ? '#ffd23d' : '#ff6b6b'), 'right');
        } });
      });
      return MEJORAS.map((m) => {
        const nv = s.mej[m.id], max = nv >= m.max, c = costoMejora(m, nv);
        return btn(m.nombre, () => {
          if (max) return;
          if (s.creditos >= c) { s.creditos -= c; s.mej[m.id]++; Datos.guardarSave(); Sonido.compra(); Juego.logro('comprador'); if (s.mej[m.id] >= m.max) Juego.logro('maxmej'); }
          else Hud.toast('Créditos insuficientes', '#ff6b6b');
        }, { alto: 70, sub: m.desc, dib: (g, x, y, w, h) => {
          for (let i = 0; i < m.max; i++) { g.fillStyle = i < nv ? '#3df5ff' : '#2a2250'; g.fillRect(x + w - 16 - (m.max - i) * 16, y + 14, 12, 8); }
          UI.txt(g, max ? 'MÁXIMO' : Util.fmt(c) + ' cr.', x + w - 16, y + 46, 11, max ? '#7dffb3' : s.creditos >= c ? '#ffd23d' : '#ff6b6b', 'right');
        } });
      });
    },
  });

  // ------------------------------------------------ Ajustes
  const NOM_ACC = { izq: 'Izquierda', der: 'Derecha', arriba: 'Arriba', abajo: 'Abajo', fuego: 'Disparar', hab: 'Habilidad', pausa: 'Pausa' };
  P.ajustes = () => {
    const A = aj(), ap = () => Juego.aplicarAjustes(), pers = (set) => (v) => { set(v); Datos.personalizar(); ap(); };
    const p = { tab: 0 };
    let confirmar = 0;
    const o = {
      titulo: 'AJUSTES', tabs: ['Gráf.', 'Audio', 'Control', 'Accesib.', 'Juego', 'Datos'], fondo: Juego.estado() === 'menu' ? fondoMenu : null,
      atras: () => { Datos.guardarAj(); UI.volver(); },
      filas: (tab) => {
        const f = [];
        if (tab === 0) {
          f.push(sel('Calidad', ['Baja', 'Media', 'Alta', 'Ultra', 'Personalizada'], () => { const i = Datos.ORDEN_CAL.indexOf(A.calidad); return i < 0 ? 4 : i; }, (k) => { if (k < 4) { Datos.aplicarPreset(Datos.ORDEN_CAL[k]); ap(); } }));
          f.push(sli('Partículas', () => A.particulas, pers((v) => { A.particulas = v; }), 0, 2, 0.1, pct));
          f.push(tog('Brillo y resplandor', () => A.brillo, pers((v) => { A.brillo = v; })));
          f.push(sel('Resolución', ['x0.75', 'x1', 'x1.25', 'x1.5', 'x2', 'x3'], () => [0.75, 1, 1.25, 1.5, 2, 3].indexOf(A.resolucion), (k) => { A.resolucion = [0.75, 1, 1.25, 1.5, 2, 3][k]; Datos.personalizar(); ap(); }));
          f.push(sli('Estrellas de fondo', () => A.estrellas, pers((v) => { A.estrellas = v; }), 20, 220, 10, String));
          f.push(sel('Capas de fondo', ['1', '2', '3'], () => A.capas - 1, (k) => { A.capas = k + 1; Datos.personalizar(); ap(); }));
          f.push(tog('Estela del motor', () => A.estela, pers((v) => { A.estela = v; })));
          f.push(tog('Suavizado de imagen', () => A.suavizado, pers((v) => { A.suavizado = v; })));
          f.push(sli('Sacudida de pantalla', () => A.sacudida, (v) => { A.sacudida = v; }, 0, 1.5, 0.1, pct));
          f.push(sel('Límite de FPS', ['Sin límite', '30', '60', '120'], () => [0, 30, 60, 120].indexOf(A.fpsLimite), (k) => { A.fpsLimite = [0, 30, 60, 120][k]; }));
          f.push(tog('Mostrar FPS', () => A.mostrarFps, (v) => { A.mostrarFps = v; }));
          f.push(tog('Bajar calidad si va lento', () => A.autoCalidad, (v) => { A.autoCalidad = v; }));
          f.push(btn('Pantalla completa', () => Juego.pantallaCompleta()));
        } else if (tab === 1) {
          f.push(sli('Volumen maestro', () => A.volMaestro, (v) => { A.volMaestro = v; Sonido.aplicarVolumenes(); }, 0, 1, 0.05, pct));
          f.push(sli('Música', () => A.volMusica, (v) => { A.volMusica = v; Sonido.aplicarVolumenes(); }, 0, 1, 0.05, pct));
          f.push(sli('Efectos', () => A.volEfectos, (v) => { A.volEfectos = v; Sonido.aplicarVolumenes(); Sonido.powerup(); }, 0, 1, 0.05, pct));
          f.push(tog('Silenciar todo', () => Sonido.silenciado, () => Sonido.alternar()));
          f.push(tog('Música activada', () => Musica.activa, () => Musica.alternar()));
          f.push(tog('Pausar audio al ocultar la pestaña', () => A.pausaOculta, (v) => { A.pausaOculta = v; }));
        } else if (tab === 2) {
          f.push(sli('Sensibilidad', () => A.sens, (v) => { A.sens = v; }, 0.5, 2, 0.05, (v) => v.toFixed(2)));
          f.push(tog('Invertir eje Y', () => A.invertirY, (v) => { A.invertirY = v; }));
          f.push(tog('Disparo automático', () => A.autoDisparo, (v) => { A.autoDisparo = v; }, {}));
          f.push(sli('Zona muerta del mando', () => A.zona, (v) => { A.zona = v; }, 0.05, 0.4, 0.01, pct));
          f.push(tog('Vibración', () => A.vibracion, (v) => { A.vibracion = v; }));
          f.push(sli('Intensidad de vibración', () => A.vibInt, (v) => { A.vibInt = v; Mando.vibrar(v, v, 200); }, 0.2, 1, 0.1, pct));
          f.push(txtf('TECLAS (pulsa para cambiar)', { peso: 800, color: '#3df5ff' }));
          for (const k in NOM_ACC) f.push(btn(NOM_ACC[k], () => {
            o.capturando = true; Hud.toast('Pulsa una tecla para "' + NOM_ACC[k] + '"', '#3df5ff');
            Entrada.capturarTecla((c) => { o.capturando = false; if (c !== 'Escape') { A.teclas[k][0] = c; } U2(); });
          }, { alto: 46, dib: (g, x, y, w, h) => UI.txt(g, A.teclas[k].map(Entrada.codigoNombre).join(' / '), x + w - 16, y + h / 2, 13, '#3df5ff', 'right') }));
          f.push(btn('Restablecer teclas', () => { A.teclas = JSON.parse(JSON.stringify(Datos.TECLAS_DEF)); }));
          f.push(txtf('TÁCTIL', { peso: 800, color: '#3df5ff' }));
          f.push(sli('Tamaño de botones', () => A.tactilEscala, (v) => { A.tactilEscala = v; }, 0.7, 1.5, 0.05, pct));
          f.push(sli('Opacidad de botones', () => A.tactilOp, (v) => { A.tactilOp = v; }, 0.15, 1, 0.05, pct));
          f.push(sli('Altura de botones', () => A.tactilY, (v) => { A.tactilY = v; }, 0, 1, 0.05, pct));
          f.push(tog('Modo zurdo', () => A.zurdo, (v) => { A.zurdo = v; }));
        } else if (tab === 3) {
          f.push(tog('Texto grande', () => A.textoGrande, (v) => { A.textoGrande = v; }));
          f.push(sel('Modo daltónico', ['Ninguno', 'Protanopia', 'Deuteranopia', 'Tritanopia'], () => ['ninguno', 'protanopia', 'deuteranopia', 'tritanopia'].indexOf(A.daltonico), (k) => { A.daltonico = ['ninguno', 'protanopia', 'deuteranopia', 'tritanopia'][k]; ap(); }));
          f.push(tog('Reducir movimiento y destellos', () => A.reducirMov, (v) => { A.reducirMov = v; ap(); }));
          f.push(txtf('Las balas enemigas tienen núcleo blanco y forma propia para distinguirse sin color.', { h: 44, tam: 11 }));
        } else if (tab === 4) {
          f.push(sel('Dificultad por defecto', ['Fácil', 'Normal', 'Difícil'], () => ['facil', 'normal', 'dificil'].indexOf(A.dificultad), (k) => { A.dificultad = ['facil', 'normal', 'dificil'][k]; }));
          f.push(tog('Pistas en partida', () => A.ayudas, (v) => { A.ayudas = v; }));
          f.push(btn('Repetir tutorial', () => { save().tutorial = false; Datos.guardarSave(); Hud.toast('Tutorial reiniciado', '#3df5ff'); }));
        } else {
          f.push(txtf('CUENTA Y NUBE', { peso: 800, color: '#3df5ff' }));
          f.push({ t: 'txt', h: 26, draw: (g, x, y, w, h) => { const u = usr(); UI.txt(g, u ? 'Usuario: ' + u.nombre + ' · Nivel ' + u.nivel + (window.Cuenta && Cuenta.demo ? ' · modo demo' : '') : 'Sin sesión', x + 6, y + h / 2, 12, '#c9c2ff', 'left', 700); } });
          f.push({ t: 'txt', h: 26, draw: (g, x, y, w, h) => { const e = NC() ? NC().estadoSync() : { txt: 'Nube no disponible', color: '#ffd23d' }; UI.txt(g, e.txt, x + 6, y + h / 2, 12, e.color, 'left', 700); } });
          f.push(btn('Sincronizar ahora', () => {
            if (!NC() || !usr()) { Hud.toast('Inicia sesión para sincronizar', '#ffd23d'); return; }
            Hud.toast('Sincronizando…', '#3df5ff');
            NC().sincronizar().then((r) => {
              const m = { igual: ['Todo está al día', '#7dffb3'], subido: ['Progreso enviado a la nube', '#7dffb3'], bajado: ['Progreso descargado de la nube', '#7dffb3'], sinRed: ['Sin conexión: se reintentará solo', '#ffd23d'], cancelado: ['Conflicto sin resolver', '#ffd23d'], sinSesion: ['Inicia sesión para sincronizar', '#ffd23d'] }[r.estado] || ['Sincronizado', '#7dffb3'];
              Hud.toast(m[0], m[1]); if (r.estado === 'bajado') Juego.aplicarNube();
            });
          }, { sub: 'Sube o baja tu progreso ahora', alto: 50 }));
          f.push(btn('Cuenta: portal y cerrar sesión', () => UI.empujar(P.cuenta()), { alto: 44 }));
          f.push(txtf('Si tu progreso difiere del de la nube, se resuelve con el diálogo', { h: 20, tam: 10, color: '#9a8cff' }));
          f.push(txtf('de la plataforma (usar nube, este dispositivo o conservar ambos).', { h: 24, tam: 10, color: '#9a8cff' }));
          f.push(txtf('PARTIDA', { peso: 800, color: '#3df5ff' }));
          f.push(sel('Ranura de guardado', ['Ranura 1', 'Ranura 2', 'Ranura 3'], () => Datos.slot, (k) => { Datos.cambiarSlot(k); if (NC()) NC().repasarLogros(); Hud.toast('Ranura ' + (k + 1), '#3df5ff'); }));
          f.push(btn('Exportar guardado', () => UI.dialogo({ titulo: 'Copia este texto para guardar tu progreso', valor: Datos.exportar(), multi: true, ro: true, copiar: true, soloCerrar: true, cancelarTxt: 'Cerrar' })));
          f.push(btn('Importar guardado', () => UI.dialogo({ titulo: 'Pega tu texto de guardado', valor: '', multi: true, boton: 'Importar', alAceptar: (v) => { if (Datos.importar(v)) { Juego.aplicarAjustes(); if (NC()) NC().repasarLogros(); Hud.toast('Guardado importado', '#7dffb3'); } else Hud.toast('Texto no válido', '#ff6b6b'); } })));
          f.push(btn('Restaurar ajustes', () => { Datos.restaurarAjustes(); ap(); Hud.toast('Ajustes restaurados', '#3df5ff'); }));
          f.push(btn(confirmar ? '¿SEGURO? Pulsa otra vez' : 'Borrar progreso de esta ranura', () => { if (confirmar) { Datos.borrar(); confirmar = 0; Hud.toast('Progreso borrado', '#ff6b6b'); } else { confirmar = 1; setTimeout(() => { confirmar = 0; }, 4000); } }, { color: '#ff6b6b' }));
        }
        return f;
      },
    };
    const U2 = () => UI.reconstruir();
    return o;
  };

  // ------------------------------------------------ Cuenta
  P.cuenta = () => {
    let conf = 0;
    return {
      titulo: 'CUENTA', fondo: Juego.estado() === 'menu' ? fondoMenu : null,
      filas: () => [
        { t: 'txt', h: 96, draw: (g, x, y, w, h) => {
          const u = usr(); if (!u) { UI.txt(g, 'Sin sesión', W / 2, y + h / 2, 16, '#ff6b6b', 'center'); return; }
          const av = NC() ? NC().avatar(56) : null;
          g.fillStyle = u.color; g.fillRect(x, y + 12, 5, 64);
          if (av) g.drawImage(av, x + 16, y + 16, 56, 56);
          UI.txt(g, u.nombre, x + 86, y + 30, 20, '#fff', 'left', 800);
          UI.txt(g, 'Nivel ' + u.nivel + ' · ' + Util.fmt(u.xp || 0) + ' XP', x + 86, y + 54, 12, '#c9c2ff', 'left', 500);
          if (window.Cuenta && Cuenta.demo) UI.txt(g, 'Modo demo: cuenta sólo en este dispositivo', x + 86, y + 74, 10, '#ffd23d', 'left', 500);
          else UI.txt(g, 'Cuenta en la nube', x + 86, y + 74, 10, '#7dffb3', 'left', 500);
        } },
        { t: 'txt', h: 26, draw: (g, x, y, w, h) => { const e = NC() ? NC().estadoSync() : { txt: '', color: '#fff' }; UI.txt(g, e.txt, W / 2, y + h / 2, 12, e.color, 'center', 700); } },
        btn('VOLVER AL PORTAL', () => { if (NC()) NC().sincronizar().then(() => NC().volverAlPortal(), () => NC().volverAlPortal()); }, { sub: 'Sincroniza y sale del juego', alto: 54 }),
        btn(conf ? '¿SEGURO? Pulsa otra vez' : 'CERRAR SESIÓN', () => {
          if (conf) { conf = 0; Hud.toast('Cerrando sesión…', '#ffd23d'); if (NC()) NC().cerrarSesion(); }
          else { conf = 1; setTimeout(() => { conf = 0; UI.reconstruir(); }, 4000); }
        }, { color: '#ff6b6b', sub: 'Tu progreso queda guardado en la cuenta', alto: 54 }),
      ],
    };
  };

  // ------------------------------------------------ Logros / estadísticas / récords / ayuda
  P.logros = () => ({
    titulo: 'LOGROS', fondo: fondoMenu, sub: () => Object.keys(save().logros).length + ' de ' + LOGROS.length,
    filas: () => LOGROS.map((l) => {
      const ok = !!save().logros[l.id], v = l.st ? Math.min(l.meta, save().stats[l.st] || 0) : 0;
      return { t: 'cus', nofoco: false, alto: 60, dib: (g, x, y, w, h) => {
        g.fillStyle = ok ? '#ffd23d' : '#3a3260'; g.beginPath(); g.arc(x + 28, y + h / 2, 14, 0, TAU); g.fill(); if (ok) { g.strokeStyle = '#000'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 21, y + h / 2); g.lineTo(x + 26, y + h / 2 + 6); g.lineTo(x + 36, y + h / 2 - 6); g.stroke(); }
        UI.txt(g, l.nom, x + 54, y + 20, 14, ok ? '#fff' : '#9a8cff'); UI.txt(g, l.desc, x + 54, y + 40, 10, '#9a8cff', 'left', 500);
        if (l.st && !ok) UI.txt(g, Util.fmt(v) + '/' + Util.fmt(l.meta), x + w - 14, y + 20, 11, '#6a5ac0', 'right');
      } };
    }),
  });
  P.stats = () => {
    const s = () => save().stats;
    const L = [['Partidas jugadas', 'partidas'], ['Tiempo jugado', 'tiempo'], ['Enemigos destruidos', 'kills'], ['Jefes derrotados', 'jefes'], ['Mejor puntuación', 'mejorPuntos'], ['Mejor oleada', 'mejorOleada'],
      ['Mejor racha', 'maxCombo'], ['Multiplicador máximo', 'maxMult'], ['Balas rozadas', 'rozes'], ['Habilidades usadas', 'habilidades'], ['Monedas recogidas', 'monedas'], ['Créditos ganados', 'creditosTotal'], ['Derrotas', 'muertes'], ['Desafíos diarios', 'diarios']];
    return { titulo: 'ESTADÍSTICAS', fondo: fondoMenu, filas: () => L.map(([n, k]) => ({ t: 'txt', h: 36, draw: (g, x, y, w, h) => { UI.txt(g, n, x + 10, y + h / 2, 14, '#c9c2ff', 'left', 500); const v = s()[k] || 0; UI.txt(g, k === 'tiempo' ? Math.floor(v / 60) + ' min' : Util.fmt(v), x + w - 10, y + h / 2, 15, '#fff', 'right'); } })) };
  };
  P.records = (tab0) => {
    const modos = ['campana', 'infinito', 'jefes', 'diario'], MR = ['puntos', 'oleada'];
    let modoR = 0;
    const o = { titulo: 'RÉCORDS', tabs: ['Campaña', 'Infinito', 'Jefes', 'Diario', 'Global', 'Amigos'], fondo: fondoMenu, tab: tab0 || 0,
      filas: (tab) => {
        if (tab >= 4) {
          const amigos = tab === 5, f = [sel('Clasificación', ['Puntos', 'Oleada alcanzada'], () => modoR, (k) => { modoR = k; })];
          const N = NC(), R = N && usr() ? N.ranking(MR[modoR], amigos, () => { if (UI.actual() === o) UI.reconstruir(); }) : { estado: 'sinSesion' };
          const nota = (s, c) => f.push(txtf(s, { centro: true, h: 60, color: c || '#c9c2ff' }));
          if (R.estado === 'sinSesion') nota('Inicia sesión para ver los rankings');
          else if (R.estado === 'cargando') nota('Cargando clasificación…');
          else if (R.estado === 'error') { nota('No se pudo cargar (¿sin conexión?)', '#ffd23d'); f.push(btn('Reintentar', () => { N.olvidarRankings(); }, { alto: 46 })); }
          else if (R.estado === 'vacio') nota(amigos ? 'Ningún amigo (ni tú) ha jugado todavía' : 'Aún no hay puntajes. ¡Sé el primero!');
          else {
            if (R.mi && R.mi.posicion) f.push({ t: 'txt', h: 28, draw: (g, x, y, w, h) => UI.txt(g, 'Tu posición: #' + R.mi.posicion + ' de ' + R.mi.total + ' · ' + Util.fmt(R.mi.valor), W / 2, y + h / 2, 12, '#7dffb3', 'center', 700) });
            R.lista.slice(0, 10).forEach((e, i) => f.push({ t: 'txt', h: 44, draw: (g, x, y, w, h) => {
              if (e.yo) { g.fillStyle = 'rgba(61,245,255,.12)'; g.fillRect(x, y + 2, w, h - 4); }
              UI.txt(g, String(e.pos || i + 1), x + 14, y + h / 2, 16, (e.pos || i + 1) === 1 ? '#ffd23d' : '#9a8cff', 'center');
              g.fillStyle = e.color || '#9a8cff'; g.fillRect(x + 32, y + 12, 4, h - 24);
              UI.txt(g, e.nombre + (e.yo ? ' (tú)' : ''), x + 46, y + h / 2, 14, '#fff');
              UI.txt(g, Util.fmt(e.valor), x + w - 10, y + h / 2, 17, '#3df5ff', 'right'); } }));
          }
          return f;
        }
        const l = Datos.tabla(modos[tab]);
        if (!l.length) return [txtf('Aún no hay récords. ¡A jugar!', { centro: true, h: 60 })];
        return l.map((r, i) => ({ t: 'txt', h: 44, draw: (g, x, y, w, h) => {
          UI.txt(g, String(i + 1), x + 14, y + h / 2, 16, i === 0 ? '#ffd23d' : '#9a8cff', 'center'); UI.txt(g, r.n, x + 40, y + h / 2 - 6, 14, '#fff');
          const nv = NAVES.find((q) => q.id === r.s); UI.txt(g, (nv ? nv.nombre : '') + ' · ' + String(r.f).replace(/(\d{4})(\d\d)(\d\d)/, '$3/$2/$1'), x + 40, y + h / 2 + 12, 9, '#6a5ac0', 'left', 500);
          UI.txt(g, Util.fmt(r.p), x + w - 10, y + h / 2, 17, '#3df5ff', 'right'); } }));
      } };
    return o;
  };
  P.ayuda = () => ({
    titulo: 'AYUDA', tabs: ['Controles', 'Cómo jugar'], fondo: fondoMenu,
    filas: (tab) => {
      const T = (s, o) => txtf(s, Object.assign({ h: 26, tam: 12 }, o || {})), Hh = (s) => T(s, { color: '#3df5ff', peso: 800, tam: 13, h: 34 });
      const k = aj().teclas, n = Entrada.codigoNombre;
      if (tab === 0) return [Hh('TECLADO'), T('Mover: ' + k.arriba.map(n).join('/') + ' ' + k.izq.map(n).join('/') + ' ' + k.abajo.map(n).join('/') + ' ' + k.der.map(n).join('/')), T('Disparar (si es manual): ' + k.fuego.map(n).join(' / ')), T('Habilidad: ' + k.hab.map(n).join(' / ')), T('Pausa: ' + k.pausa.map(n).join(' / ')), T('M silencio · N música · F pantalla completa'),
        Hh('MANDO XBOX'), T('Stick izq. o cruceta: mover'), T('A / RT: disparar (modo manual)'), T('X / LB / RB: habilidad especial'), T('MENÚ: pausa · B: atrás en menús'),
        Hh('TÁCTIL'), T('Arrastra el dedo para mover la nave'), T('Botón grande: habilidad especial'), T('Botón FUEGO: sólo en disparo manual'), T('Botones ajustables en Ajustes > Control')];
      return [Hh('OBJETIVO'), T('Destruye oleadas y derrota al jefe de cada mundo.'), T('Tu caja de choque es el punto blanco: ¡es pequeña!'), Hh('POWER-UPS'), T('▲ sube el nivel del arma (hasta 5)'), T('D dispersión · L láser · N misiles'), T('» disparo rápido · E escudo · + vida'), T('M imán · H recarga habilidad · T tiempo lento'), T('$ monedas: se cambian por mejoras'),
        Hh('PUNTOS'), T('Encadena destrucciones para subir el multiplicador.'), T('Rozar balas enemigas da puntos extra.'), T('Perder vida baja el nivel de arma y el combo.'), Hh('PROGRESO'), T('Gana créditos y compra naves y mejoras en el Hangar.')];
    },
  });

  // ------------------------------------------------ Pausa / fin
  P.pausa = () => ({
    titulo: 'PAUSA', panel: true, dim: 0.82, noraiz: true, atras: () => Juego.reanudar(),
    filas: () => [
      btn('CONTINUAR', () => Juego.reanudar(), { color: '#2ad48a' }),
      btn('AJUSTES', () => UI.empujar(P.ajustes())),
      btn('AYUDA', () => UI.empujar(P.ayuda())),
      btn('PANTALLA COMPLETA', () => Juego.pantallaCompleta()),
      btn(Juego.esMP() ? 'ABANDONAR PARTIDA' : 'REINICIAR', () => (Juego.esMP() ? Juego.salirAlMenu() : Juego.reiniciar())),
      ...(Juego.esMP() ? [] : [btn('SALIR AL MENÚ', () => Juego.salirAlMenu())]),
    ],
    dibujar: (g) => { UI.txt(g, Juego.esMP() ? 'La partida sigue en marcha' : 'Partida en pausa', W / 2, 100, 11, '#9a8cff', 'center', 500); },
  });

  P.fin = (res, extra) => ({
    titulo: res.victoria ? '¡VICTORIA!' : 'FIN DE LA PARTIDA', panel: true, noraiz: true, atras: () => Juego.salirAlMenu(), sub: () => extra.modoNombre,
    filas: () => {
      const f = [{ t: 'txt', h: 185 + (extra.jugadores ? extra.jugadores.length * 30 + 20 : 0), draw: (g, x, y, w) => {
        let yy = y + 14; const l = (a, b, c) => { UI.txt(g, a, x + 20, yy, 14, '#c9c2ff', 'left', 500); UI.txt(g, b, x + w - 20, yy, 16, c || '#fff', 'right'); yy += 30; };
        l('Puntuación', Util.fmt(res.puntos), '#3df5ff'); l('Oleada alcanzada', String(res.oleada)); l('Enemigos destruidos', Util.fmt(res.kills)); l('Jefes derrotados', String(res.jefes));
        l('Créditos ganados', '+' + Util.fmt(res.creditos), '#ffd23d');
        if (extra.nuevoRecord) UI.txt(g, '¡NUEVO RÉCORD!', W / 2, yy + 6, 18, '#ffd23d', 'center', 800);
        if (extra.jugadores) { yy += 22; for (const j of extra.jugadores) { g.fillStyle = j.color; g.fillRect(x + 20, yy - 8, 8, 16); UI.txt(g, j.nombre, x + 36, yy, 13, '#fff'); UI.txt(g, Util.fmt(j.puntos) + '  ·  ' + j.kills + ' bajas', x + w - 20, yy, 12, '#c9c2ff', 'right'); yy += 30; } }
      } }];
      f.push({ t: 'txt', h: 26, draw: (g, x, y, w, h) => {
        const r = extra.rank; if (!r || r.estado === 'sinSesion') return;
        const m = { cargando: ['Ranking: calculando tu posición…', '#9a8cff'], coop: ['Cooperativo: la puntuación es del equipo y no entra al ranking', '#9a8cff'], vacio: ['Ranking no disponible ahora', '#ffd23d'], error: ['Ranking no disponible (sin conexión)', '#ffd23d'],
          ok: [r.pendiente ? 'Puntaje pendiente de enviar (sin conexión)' : 'Ranking global: #' + r.posicion + ' de ' + r.total + (r.mejoro ? ' · ¡nuevo mejor!' : ''), r.pendiente ? '#ffd23d' : '#7dffb3'] }[r.estado];
        if (m) UI.txt(g, m[0], W / 2, y + h / 2, 12, m[1], 'center', 700);
      } });
      if (!Juego.esMP()) f.push(btn('JUGAR DE NUEVO', () => Juego.reiniciar(), { color: '#2ad48a' }), btn('HANGAR', () => { Juego.salirAlMenu(); UI.empujar(P.hangar()); }));
      if (!Juego.esMP() && usr()) f.push(btn('VER RANKING', () => { if (NC()) NC().olvidarRankings(); UI.empujar(P.records(4)); }, { alto: 48 }));
      if (Juego.esMP()) f.push(btn('VOLVER AL LOBBY', () => { Juego.salirAlMenu(); Juego.abrirLobby(); }, { color: '#2ad48a' }));
      f.push(btn('MENÚ PRINCIPAL', () => Juego.salirAlMenu()));
      return f;
    },
  });
  return P;
})();
