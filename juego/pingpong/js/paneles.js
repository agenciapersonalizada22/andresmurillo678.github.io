// Paneles de contenido para modales: Ajustes (con pestanas), Tienda, Logros, Estadisticas, Ayuda. Todo navegable con raton, tactil y mando (data-f).
import { h } from './dom.js';
import { PRESETS, aplicarPreset, porDefecto, TECLAS_DEF, NOMBRES_TECLA, exportar } from './ajustes.js';
import { CATALOGO, TIPOS, tiene, comprar, equipar } from './economia.js';
import { LOGROS } from './progreso.js';
import { bloqueNube } from './cuenta-pp.js';

export const seg = (ops, val, fn) => {
  const g = h('div', { cls: 'seg', role: 'group' });
  ops.forEach(([v, t]) => g.appendChild(h('button', { type: 'button', cls: 'seg-o', 'data-f': 1, txt: t, 'aria-pressed': String(val === v), on: { click: () => { Array.from(g.children).forEach((x, i) => x.setAttribute('aria-pressed', String(ops[i][0] === v))); fn(v); } } })));
  return g;
};
export const rango = (min, max, step, val, fn, fmt = (v) => v) => {
  const o = h('output', { txt: fmt(val) }), i = h('input', { type: 'range', min, max, step, value: val, 'data-f': 1, 'data-rango': 1 });
  i.addEventListener('input', () => { o.textContent = fmt(+i.value); fn(+i.value, false); }); i.addEventListener('change', () => fn(+i.value, true));
  return h('div', { cls: 'rango' }, [i, o]);
};
export const interruptor = (val, fn) => { const b = h('button', { type: 'button', cls: 'inter', 'data-f': 1, role: 'switch', 'aria-checked': String(!!val), on: { click: () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', String(v)); fn(v); } } }, [h('i')]); return b; };
export const fila = (etq, ctrl, desc) => h('div', { cls: 'fila-aj' }, [h('div', { cls: 'etq' }, [h('span', { txt: etq }), desc ? h('small', { txt: desc }) : null]), ctrl]);

/* ---------- Ajustes ---------- */
export function panelAjustes(cont, App, api) {
  const aj = App.aj; let tab = App.ultimaTabAjustes || 'gr';
  const cuerpo = h('div', { cls: 'aj-cuerpo' }), tabs = h('div', { cls: 'tabs', role: 'tablist' });
  const T = [['gr', 'Gráficos'], ['au', 'Audio'], ['ct', 'Controles'], ['ac', 'Accesibilidad'], ['da', 'Datos']];
  const cam = (cl, fn) => (v, fin) => { fn(v); App.aplicarAjustes(fin !== false); };
  const pintar = () => {
    App.ultimaTabAjustes = tab; cuerpo.textContent = '';
    Array.from(tabs.children).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.t === tab)));
    ({ gr, au, ct, ac, da })[tab]();
  };
  const gr = () => {
    const g = aj.gr, mod = (c, v) => { g[c] = v; g.preset = 'personal'; App.aplicarAjustes(true); };
    cuerpo.appendChild(fila('Calidad', seg([['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra']], g.preset, (v) => { aplicarPreset(aj, v); App.aplicarAjustes(true); pintar(); }), g.preset === 'personal' ? 'Personalizada' : 'Ultra usa toda la GPU: sombras suaves y alta resolución.'));
    cuerpo.appendChild(fila('Sombras', seg([[0, 'No'], [1, 'Básicas'], [2, 'Suaves'], [3, 'Máx.']], g.sombras, (v) => { g.sombras = v; g.preset = 'personal'; App.aplicarAjustes(true); })));
    cuerpo.appendChild(fila('Antialias', interruptor(g.antialias, (v) => mod('antialias', v)), 'Bordes suaves (reconstruye el render).'));
    cuerpo.appendChild(fila('Resolución', rango(0.5, 2, 0.05, g.res, (v, f) => { g.res = v; g.preset = 'personal'; if (f) App.aplicarAjustes(true); }, (v) => Math.round(v * 100) + '%')));
    cuerpo.appendChild(fila('Detalle de la sala', seg([[0, 'Mínimo'], [1, 'Bajo'], [2, 'Alto'], [3, 'Máx.']], g.detalle, (v) => mod('detalle', v)), 'Público, luces y geometría.'));
    cuerpo.appendChild(fila('Límite de FPS', seg([[30, '30'], [60, '60'], [120, '120'], [0, 'Sin límite']], g.fps, (v) => mod('fps', v))));
    cuerpo.appendChild(fila('Estela de la pelota', interruptor(g.estela, (v) => mod('estela', v))));
    cuerpo.appendChild(fila('Marcador de bote', interruptor(g.guia, (v) => { g.guia = v; App.aplicarAjustes(true); }), 'Aro donde botará la pelota.'));
    cuerpo.appendChild(fila('Mostrar FPS', interruptor(g.mostrarFps, (v) => { g.mostrarFps = v; App.aplicarAjustes(true); })));
    cuerpo.appendChild(fila('Bajar calidad si hay pocos FPS', interruptor(g.auto, (v) => { g.auto = v; App.aplicarAjustes(true); }), 'Baja un nivel de calidad si el rendimiento es bajo.'));
  };
  const au = () => {
    const a = aj.au, c = (k) => (v, f) => { a[k] = v; App.aplicarAjustes(f !== false); };
    cuerpo.appendChild(fila('Volumen general', rango(0, 1, 0.05, a.maestro, c('maestro'), (v) => Math.round(v * 100) + '%')));
    cuerpo.appendChild(fila('Música', rango(0, 1, 0.05, a.musica, c('musica'), (v) => Math.round(v * 100) + '%')));
    cuerpo.appendChild(fila('Efectos', rango(0, 1, 0.05, a.efectos, c('efectos'), (v) => Math.round(v * 100) + '%')));
    cuerpo.appendChild(fila('Silenciar todo', interruptor(a.mudo, (v) => { a.mudo = v; App.aplicarAjustes(true); })));
    cuerpo.appendChild(h('p', { cls: 'nota', txt: 'El audio se pausa solo al ocultar la pestaña.' }));
  };
  const ct = () => {
    const c = aj.ct, k = (n) => (v, f) => { c[n] = v; App.aplicarAjustes(f !== false); };
    cuerpo.appendChild(fila('Efecto de los gestos', seg([['auto', 'Auto'], ['top', 'Topspin'], ['plano', 'Plano'], ['corte', 'Corte']], c.efecto, (v) => { c.efecto = v; App.aplicarAjustes(true); }), 'Auto: lento = corte, rápido = topspin; curvar el gesto da efecto lateral.'));
    cuerpo.appendChild(fila('Sensibilidad de dirección', rango(0.5, 2, 0.05, c.sens, k('sens'), (v) => v.toFixed(2))));
    cuerpo.appendChild(fila('Ayuda de golpe', rango(0.8, 1.5, 0.05, c.ayuda, k('ayuda'), (v) => v.toFixed(2)), 'Más ayuda = zona de golpeo y alcance mayores.'));
    cuerpo.appendChild(fila('Zona muerta del mando', rango(0, 0.5, 0.02, c.zona, k('zona'), (v) => v.toFixed(2))));
    cuerpo.appendChild(fila('Vibración del mando', interruptor(c.vibracion, (v) => { c.vibracion = v; App.aplicarAjustes(true); })));
    cuerpo.appendChild(fila('Intensidad de vibración', rango(0, 1, 0.05, c.vibInt, k('vibInt'), (v) => Math.round(v * 100) + '%')));
    cuerpo.appendChild(fila('Tamaño de botones táctiles', rango(0.7, 1.5, 0.05, c.tam, k('tam'), (v) => Math.round(v * 100) + '%')));
    cuerpo.appendChild(fila('Opacidad de botones táctiles', rango(0.3, 1, 0.05, c.opacidad, k('opacidad'), (v) => Math.round(v * 100) + '%')));
    cuerpo.appendChild(fila('Modo zurdo', interruptor(c.zurdo, (v) => { c.zurdo = v; App.aplicarAjustes(true); }), 'Mueve los botones al lado izquierdo.'));
    cuerpo.appendChild(h('div', { cls: 'aj-sub', txt: 'Teclas' }));
    Object.keys(NOMBRES_TECLA).forEach((n) => {
      const txt = () => (c.teclas[n] || []).map((t) => t.replace('Key', '').replace('Arrow', '↔').replace('Arrow', '')).join(' / ') || '—';
      const b = h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, txt: txt() });
      b.addEventListener('click', () => {
        b.textContent = 'Pulsa una tecla…';
        const f = (e) => { e.preventDefault(); e.stopPropagation(); removeEventListener('keydown', f, true); if (e.code !== 'Escape' || n === 'pausa') { if (e.code !== 'Escape') c.teclas[n] = [e.code, ...(c.teclas[n] || []).filter((x) => x !== e.code).slice(0, 1)]; App.aplicarAjustes(true); } b.textContent = txt(); };
        addEventListener('keydown', f, true);
      });
      cuerpo.appendChild(fila(NOMBRES_TECLA[n], b));
    });
    cuerpo.appendChild(h('button', { type: 'button', cls: 'btn sec peq', 'data-f': 1, txt: 'Restablecer teclas', on: { click: () => { c.teclas = JSON.parse(JSON.stringify(TECLAS_DEF)); App.aplicarAjustes(true); pintar(); } } }));
    cuerpo.appendChild(h('p', { cls: 'nota', txt: 'Mando: stick izquierdo apunta, A golpe plano, X topspin, B corte, Y smash, LB/RB efecto lateral, gatillo derecho más fuerza, Menú pausa.' }));
  };
  const ac = () => {
    const a = aj.ac;
    cuerpo.appendChild(fila('Texto grande', interruptor(a.textoGrande, (v) => { a.textoGrande = v; App.aplicarAjustes(true); })));
    cuerpo.appendChild(fila('Modo daltónico', seg([['no', 'No'], ['azul_naranja', 'Azul/naranja'], ['alto_contraste', 'Alto contraste']], a.daltonismo, (v) => { a.daltonismo = v; App.aplicarAjustes(true); }), 'Cambia colores de mesa y pelota.'));
    cuerpo.appendChild(fila('Reducir movimiento y efectos', interruptor(a.reducir, (v) => { a.reducir = v; App.aplicarAjustes(true); }), 'Sin estela ni destellos; cámara fija.'));
    cuerpo.appendChild(fila('Velocidad de juego', rango(0.6, 1.2, 0.05, a.velocidad, (v, f) => { a.velocidad = v; App.aplicarAjustes(f !== false); }, (v) => Math.round(v * 100) + '%'), 'Más lento da más tiempo de reacción.'));
  };
  const da = () => {
    cuerpo.appendChild(bloqueNube());
    const t = h('textarea', { cls: 'campo', rows: 4, 'data-f': 1, 'aria-label': 'Guardado como texto', spellcheck: 'false' }), msg = h('p', { cls: 'nota', 'aria-live': 'polite' });
    cuerpo.appendChild(h('div', { cls: 'aj-sub', txt: 'Guardado' }));
    cuerpo.appendChild(t);
    cuerpo.appendChild(h('div', { cls: 'fila' }, [
      h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, txt: 'Exportar', on: { click: () => { t.value = exportar(aj, App.prog); t.select(); msg.textContent = 'Copia este texto para guardarlo.'; try { navigator.clipboard && navigator.clipboard.writeText(t.value); } catch (e) { /* sin portapapeles */ } } } }),
      h('button', { type: 'button', cls: 'btn peq sec', 'data-f': 1, txt: 'Importar', on: { click: () => { try { const o = JSON.parse(t.value); if (!o.pingpong) throw new Error('x'); App.importar(o); msg.textContent = 'Importado.'; } catch (e) { msg.textContent = 'Texto no válido.'; } } } })]));
    cuerpo.appendChild(msg);
    cuerpo.appendChild(h('button', { type: 'button', cls: 'btn peligro', 'data-f': 1, txt: 'Borrar todos los datos', on: { click: () => { if (confirm('¿Borrar progreso, monedas y ajustes de este dispositivo?')) App.borrarTodo(); } } }));
    cuerpo.appendChild(h('button', { type: 'button', cls: 'btn sec peq', 'data-f': 1, txt: 'Restablecer ajustes', on: { click: () => { Object.assign(aj, porDefecto()); App.aplicarAjustes(true); pintar(); } } }));
  };
  T.forEach(([id, n]) => tabs.appendChild(h('button', { type: 'button', cls: 'tab', role: 'tab', 'data-f': 1, 'data-t': id, txt: n, on: { click: () => { tab = id; pintar(); } } })));
  cont.appendChild(tabs); cont.appendChild(cuerpo); pintar();
}

/* ---------- Tienda ---------- */
export function panelTienda(cont, App) {
  let tipo = 'mesas'; const cab = h('div', { cls: 'tienda-cab' }), cuerpo = h('div', { cls: 'tienda-grid' }), saldo = h('b', { cls: 'saldo' });
  const nombres = { mesas: 'Mesas', paletas: 'Paletas', salas: 'Salas' };
  const pintar = () => {
    saldo.textContent = App.prog.monedas + ' monedas'; cuerpo.textContent = '';
    Array.from(cab.querySelectorAll('.tab')).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.t === tipo)));
    CATALOGO[tipo].forEach((it) => {
      const mia = tiene(App.prog, tipo, it.id), uno = { mesas: 'mesa', paletas: 'paleta', salas: 'sala' }[tipo], eq = App.prog.equipo[uno] === it.id;
      const vista = h('div', { cls: 'vista', style: tipo === 'mesas' ? `background:${it.color};border-color:${it.borde}` : tipo === 'paletas' ? `background:linear-gradient(90deg,${it.caras[0]} 50%,${it.caras[1]} 50%)` : `background:${{ gimnasio: '#b98a52', club: '#2a1450', azotea: '#86b7e8', espacio: '#0c1a2e', estadio: '#2a2d36' }[it.id]}` });
      const acc = mia ? h('button', { type: 'button', cls: 'btn peq' + (eq ? ' sec' : ''), 'data-f': 1, txt: eq ? 'Equipado' : 'Equipar', disabled: eq, on: { click: () => { equipar(App.prog, tipo, it.id); App.guardarProg(); App.alEquipar(); pintar(); } } })
        : h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, txt: it.precio + ' monedas', on: { click: () => { const r = comprar(App.prog, tipo, it.id); if (!r.ok) { App.toast(r.motivo); return; } equipar(App.prog, tipo, it.id); App.alComprar(it); pintar(); } } });
      const st = tipo === 'paletas' && it.id !== 'clasica' ? `Control ${it.control} · Efecto ${it.efecto} · Potencia ${it.potencia}` : (it.desc || '');
      cuerpo.appendChild(h('div', { cls: 'tarjeta' + (eq ? ' eq' : '') }, [vista, h('b', { txt: it.nombre }), h('small', { txt: st }), acc]));
    });
  };
  TIPOS.forEach((t) => cab.appendChild(h('button', { type: 'button', cls: 'tab', 'data-f': 1, 'data-t': t, txt: nombres[t], on: { click: () => { tipo = t; pintar(); } } })));
  cab.appendChild(saldo); cont.appendChild(cab); cont.appendChild(cuerpo);
  cont.appendChild(h('p', { cls: 'nota', txt: 'Las monedas son virtuales: se ganan jugando y no tienen valor real. Las paletas dan pequeñas ventajas; mesas y salas son estéticas.' }));
  pintar();
}

/* ---------- Logros y estadisticas ---------- */
export function panelLogros(cont, App) {
  const n = LOGROS.filter((l) => App.prog.logros[l.id]).length;
  cont.appendChild(h('p', { cls: 'nota', txt: `${n} de ${LOGROS.length} logros` }));
  const g = h('div', { cls: 'logros' });
  LOGROS.forEach((l) => { const ok = !!App.prog.logros[l.id]; g.appendChild(h('div', { cls: 'logro' + (ok ? ' ok' : '') }, [h('b', { txt: l.nombre }), h('small', { txt: l.desc }), h('i', { txt: ok ? '✓' : '·' })])); });
  cont.appendChild(g);
}
export function panelStats(cont, App) {
  const s = App.prog.stats, fil = [['Partidos', s.partidos], ['Victorias', s.victorias], ['Derrotas', s.derrotas], ['Mejor racha', s.mejorRacha], ['Puntos ganados', s.puntosGanados], ['Puntos perdidos', s.puntosPerdidos], ['Aces', s.aces], ['Rally máximo (partido)', s.rallyMax], ['Rally máximo (reto)', s.retoMax], ['Torneos ganados', s.torneos], ['Pelotas devueltas (entreno)', s.aciertosEntreno], ['Victorias online', s.onlineVictorias], ['Golpes dados', s.golpes], ['Monedas ganadas en total', App.prog.totalMonedas]];
  const t = h('table', { cls: 'tabla' }); fil.forEach(([a, b]) => t.appendChild(h('tr', {}, [h('td', { txt: a }), h('td', { txt: String(b | 0) })]))); cont.appendChild(t);
}

/* ---------- Ayuda ---------- */
export function panelAyuda(cont, App) {
  const tactil = matchMedia('(pointer: coarse)').matches, mando = window.Mando && window.Mando.conectado;
  const bloque = (t, l) => { cont.appendChild(h('div', { cls: 'aj-sub', txt: t })); const u = h('ul', { cls: 'ayuda' }); l.forEach((x) => u.appendChild(h('li', { txt: x }))); cont.appendChild(u); };
  bloque(tactil ? 'Pantalla táctil (tu dispositivo)' : 'Gestos con dedo o ratón', ['Desliza hacia ARRIBA para golpear y sacar: la dirección del dedo apunta la pelota (izquierda/derecha).', 'La velocidad del gesto da la fuerza: lento y corto = corte (backspin), rápido = topspin; un gesto curvo añade efecto lateral.', 'Toca (sin deslizar) para un golpe automático apuntando donde tocas.', 'Golpea cuando la pelota ya botó en tu lado y llega cerca de ti: demasiado pronto o tarde baja la calidad.', 'Los botones Auto / Top / Plano / Corte fijan el efecto.']);
  bloque('Ratón y teclado', ['Arrastrar con el ratón = gesto. Clic izquierdo: golpe hacia donde apuntas. Clic derecho: corte. Clic central: topspin. Mayús: más fuerza, Ctrl: suave.', 'Teclado: ←/→ (o A/D) apuntan, Espacio golpe plano, E topspin, Q corte, Mayús más fuerza, Esc pausa. Todo es remapeable en Ajustes.']);
  bloque('Mando Xbox' + (mando ? ' (conectado)' : ''), ['Stick izquierdo apunta; A plano, X topspin, B corte, Y smash; LB/RB efecto lateral; gatillo derecho más fuerza; Menú pausa.', 'En menús: cruceta/stick mueven, A acepta, B vuelve.']);
  bloque('Reglas', ['Se juega a 11 puntos con diferencia de 2. Cada jugador saca dos puntos seguidos y luego cambia el saque (a 10-10, cada punto).', 'El saque debe botar primero en tu campo y luego en el del rival; si toca la red y entra, se repite (let).', 'No puedes golpear antes del bote ni dejar botar dos veces. En dobles se alterna el golpeo y el saque es en diagonal.']);
  bloque('Modos', ['Partido libre, Torneo por rondas, Entrenamiento con máquina lanzapelotas, Reto de rallies (3 vidas), y 1 contra 1 online.', 'Gana monedas virtuales para desbloquear mesas, paletas y salas.']);
}
