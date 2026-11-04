// =============================================================
//  🧩  MENÚ DE AJUSTES
//  Pestañas con filas de botones (se manejan con ratón, dedo y mando).
//  Cada fila lee y escribe en Ajustes; no hace nada más: quien
//  quiera enterarse de un cambio escucha Aj.bus ('cambio').
// =============================================================
import { Aj, ACCIONES_TECLA, nombreTecla, perfil, guardarPerfil } from './ajustes.js';
import { Cta } from './cuentaJuego.js';
import { textoEstado, mundosSoloLocal, NOTA_CONFLICTO } from './nube.js';

const SI_NO = [[true, 'SÍ'], [false, 'NO']];
const el = (tag, cls, texto) => { const e = document.createElement(tag); if (cls) e.className = cls; if (texto !== undefined) e.textContent = texto; return e; };

const SECCIONES = [
  { id: 'graficos', nombre: 'GRÁFICOS', filas: [
    { t: 'op', k: 'calidad', n: 'Calidad', v: [['auto', 'AUTO'], ['baja', 'BAJA'], ['media', 'MEDIA'], ['alta', 'ALTA'], ['ultra', 'ULTRA']] },
    { t: 'num', k: 'distancia', n: 'Distancia de dibujo', min: 0, max: 16, paso: 1, fmt: (v) => (v ? v + ' chunks' : 'AUTO') },
    { t: 'op', k: 'sombras', n: 'Sombras', v: [['auto', 'AUTO'], ['no', 'NO'], ['suave', 'SUAVES'], ['alta', 'ALTAS']] },
    { t: 'op', k: 'resolucion', n: 'Resolución', v: [['auto', 'AUTO'], ['0.5', '50%'], ['0.75', '75%'], ['1', '100%'], ['1.5', '150%'], ['2', '200%']] },
    { t: 'op', k: 'limiteFps', n: 'Límite de FPS', v: [[0, 'SIN LÍMITE'], [30, '30'], [45, '45'], [60, '60'], [90, '90'], [120, '120']] },
    { t: 'num', k: 'fov', n: 'Campo de visión', min: 60, max: 110, paso: 5, fmt: (v) => v + '°' },
    { t: 'bool', k: 'mostrarFps', n: 'Mostrar FPS' },
    { t: 'bool', k: 'autoCalidad', n: 'Bajar calidad si va lento' },
    { t: 'bool', k: 'antialias', n: 'Suavizado de bordes (recarga la página)' },
    { t: 'bool', k: 'particulas', n: 'Partículas y ambiente' },
    { t: 'bool', k: 'minimapa', n: 'Minimapa' },
    { t: 'op', k: 'minimapaZoom', n: 'Zoom del minimapa', v: [[1, 'CERCA'], [2, 'NORMAL'], [4, 'LEJOS']] },
  ] },
  { id: 'audio', nombre: 'AUDIO', filas: [
    { t: 'num', k: 'volMaestro', n: 'Volumen general', min: 0, max: 100, paso: 10, fmt: (v) => v + '%' },
    { t: 'num', k: 'volMusica', n: 'Música', min: 0, max: 100, paso: 10, fmt: (v) => v + '%' },
    { t: 'num', k: 'volEfectos', n: 'Efectos', min: 0, max: 100, paso: 10, fmt: (v) => v + '%' },
    { t: 'bool', k: 'silencio', n: 'Silencio total' },
    { t: 'bool', k: 'pausaOculto', n: 'Pausar el audio al cambiar de pestaña' },
  ] },
  { id: 'controles', nombre: 'CONTROLES', filas: [
    { t: 'num', k: 'sensRaton', n: 'Sensibilidad del ratón', min: 1, max: 10, paso: 1 },
    { t: 'num', k: 'sensTactil', n: 'Sensibilidad táctil', min: 1, max: 10, paso: 1 },
    { t: 'num', k: 'sensMando', n: 'Sensibilidad del mando', min: 1, max: 10, paso: 1 },
    { t: 'bool', k: 'invertirY', n: 'Invertir eje Y' },
    { t: 'num', k: 'zonaMuerta', n: 'Zona muerta extra del mando', min: 0, max: 30, paso: 5, mult: 0.01, fmt: (v) => v + '%' },
    { t: 'bool', k: 'vibrar', n: 'Vibración del mando' },
    { t: 'num', k: 'vibracion', n: 'Intensidad de vibración', min: 10, max: 100, paso: 10, fmt: (v) => v + '%' },
    { t: 'num', k: 'tamTactil', n: 'Tamaño de botones táctiles', min: 70, max: 140, paso: 10, fmt: (v) => v + '%' },
    { t: 'num', k: 'opTactil', n: 'Opacidad de botones táctiles', min: 30, max: 100, paso: 10, fmt: (v) => v + '%' },
    { t: 'bool', k: 'zurdo', n: 'Modo zurdo (táctil)' },
    { t: 'bool', k: 'saltoAuto', n: 'Salto automático (táctil)' },
    { t: 'titulo', n: 'Teclas (toca una y pulsa la nueva; Retroceso la restablece)' },
    ...ACCIONES_TECLA.map((a) => ({ t: 'tecla', a: a[0], n: a[1] })),
    { t: 'boton', id: 'teclasReset', n: 'Restablecer todas las teclas', b: 'RESTABLECER' },
  ] },
  { id: 'acceso', nombre: 'ACCESIBILIDAD', filas: [
    { t: 'bool', k: 'textoGrande', n: 'Texto grande' },
    { t: 'op', k: 'daltonismo', n: 'Modo daltónico', v: [['no', 'NO'], ['protan', 'PROTANOPIA'], ['deutan', 'DEUTERANOPIA'], ['tritan', 'TRITANOPIA']] },
    { t: 'bool', k: 'reducirMov', n: 'Reducir movimiento y efectos' },
    { t: 'bool', k: 'flashDano', n: 'Destello rojo al recibir daño' },
  ] },
  { id: 'juego', nombre: 'JUEGO', filas: [
    { t: 'op', k: 'dificultad', n: 'Dificultad (mundos nuevos)', v: [['pacifico', 'PACÍFICO'], ['facil', 'FÁCIL'], ['normal', 'NORMAL'], ['dificil', 'DIFÍCIL']] },
    { t: 'bool', k: 'conservarInv', n: 'Conservar inventario al morir' },
    { t: 'num', k: 'autoguardado', n: 'Autoguardado', min: 5, max: 60, paso: 5, fmt: (v) => 'cada ' + v + ' s' },
    { t: 'bool', k: 'ayudaControles', n: 'Mostrar ayuda de controles' },
    { t: 'perfil', n: 'Tu nombre (el de tu cuenta, lo ven tus amigos)' },
  ] },
  { id: 'datos', nombre: 'DATOS', filas: [
    { t: 'titulo', n: 'Cuenta y nube' },
    { t: 'cuenta', n: 'Cuenta' },
    { t: 'nube', n: 'Sincronización' },
    { t: 'boton', id: 'sincronizar', n: 'Subir y bajar tu progreso ahora', b: 'SINCRONIZAR AHORA' },
    { t: 'titulo', n: NOTA_CONFLICTO },
    { t: 'locales' },
    { t: 'titulo', n: 'Datos de este dispositivo' },
    { t: 'boton', id: 'mundos', n: 'Mundos guardados (crear, borrar, importar)', b: 'ABRIR' },
    { t: 'boton', id: 'exportarMundo', n: 'Exportar el mundo actual', b: 'EXPORTAR' },
    { t: 'boton', id: 'exportarAjustes', n: 'Copiar los ajustes como texto', b: 'COPIAR' },
    { t: 'boton', id: 'importarAjustes', n: 'Pegar ajustes copiados', b: 'PEGAR' },
    { t: 'boton', id: 'borrarLogros', n: 'Borrar logros y estadísticas', b: 'BORRAR', peligro: true },
    { t: 'boton', id: 'borrarTodo', n: 'Borrar TODOS los mundos y ajustes', b: 'BORRAR TODO', peligro: true },
  ] },
];

export class MenuAjustes {
  // acciones: función (id) para los botones de la pestaña DATOS
  constructor(contenedorPestanas, cuerpo, acciones) {
    this.pest = contenedorPestanas;
    this.cuerpo = cuerpo;
    this.acciones = acciones;
    this.actual = 'graficos';
    this.esperando = null;
    this.refrescos = [];
    this.pendiente = new Map();   // botones de borrado que piden confirmar
    window.addEventListener('keydown', (e) => this.alTecla(e), true);
    Aj.bus.en('cambio', () => this.refrescar());
  }

  indice() { return SECCIONES.findIndex((s) => s.id === this.actual); }

  cambiarPestana(delta) {
    const i = (this.indice() + delta + SECCIONES.length) % SECCIONES.length;
    this.pintar(SECCIONES[i].id);
  }

  pintar(id = this.actual) {
    this.actual = id;
    this.esperando = null;
    this.refrescos = [];
    this.pest.textContent = '';
    for (const s of SECCIONES) {
      const b = el('button', s.id === id ? 'activa' : '', s.nombre);
      b.type = 'button';
      b.addEventListener('click', () => this.pintar(s.id));
      this.pest.appendChild(b);
    }
    this.cuerpo.textContent = '';
    const sec = SECCIONES.find((s) => s.id === id);
    for (const f of sec.filas) this.cuerpo.appendChild(this.fila(f));
    this.refrescar();
  }

  refrescar() { for (const f of this.refrescos) f(); }

  fila(f) {
    if (f.t === 'titulo') return el('p', 'info', f.n);
    if (f.t === 'locales') {
      const p = el('p', 'info', '');
      this.refrescos.push(() => {
        const l = mundosSoloLocal();
        p.style.display = l.length ? '' : 'none';
        p.textContent = l.length ? 'Solo en este dispositivo (demasiado grandes para la nube): ' + l.map((m) => m.nombre).join(', ') + '. Usa «Exportar» para tener una copia.' : '';
      });
      return p;
    }
    const fila = el('div', 'filaAj');
    fila.appendChild(el('span', '', f.n));
    const ctl = el('div', 'ctl');
    fila.appendChild(ctl);
    const boton = (txt, fn, cls) => { const b = el('button', cls || '', txt); b.type = 'button'; b.addEventListener('click', (e) => { e.preventDefault(); fn(); }); return b; };
    if (f.t === 'bool') {
      const b = boton('', () => Aj.set(f.k, !Aj.get(f.k)));
      ctl.appendChild(b);
      this.refrescos.push(() => { b.textContent = Aj.get(f.k) ? 'SÍ' : 'NO'; b.classList.toggle('on', !!Aj.get(f.k)); });
    } else if (f.t === 'op') {
      const b = boton('', () => {
        const i = f.v.findIndex((x) => String(x[0]) === String(Aj.get(f.k)));
        Aj.set(f.k, f.v[(i + 1) % f.v.length][0]);
      });
      ctl.appendChild(b);
      this.refrescos.push(() => { const x = f.v.find((y) => String(y[0]) === String(Aj.get(f.k))); b.textContent = x ? x[1] : String(Aj.get(f.k)); });
    } else if (f.t === 'num') {
      const m = f.mult || 1;
      const val = el('b', '', '');
      const cambiar = (d) => { const v = Math.round(Aj.get(f.k) / m); Aj.set(f.k, Math.max(f.min, Math.min(f.max, v + d * f.paso)) * m); };
      ctl.append(boton('−', () => cambiar(-1), 'mas'), val, boton('+', () => cambiar(1), 'mas'));
      this.refrescos.push(() => { const v = Math.round(Aj.get(f.k) / m); val.textContent = f.fmt ? f.fmt(v) : String(v); });
    } else if (f.t === 'tecla') {
      const b = boton('', () => { this.esperando = f.a; this.refrescar(); });
      ctl.appendChild(b);
      this.refrescos.push(() => { b.textContent = this.esperando === f.a ? 'PULSA UNA TECLA…' : nombreTecla(Aj.teclaDe(f.a)); b.classList.toggle('on', this.esperando === f.a); });
    } else if (f.t === 'boton') {
      const b = boton(f.b, () => {
        if (f.peligro && !this.pendiente.get(f.id)) { this.pendiente.set(f.id, true); b.textContent = '¿SEGURO?'; setTimeout(() => { this.pendiente.delete(f.id); b.textContent = f.b; }, 3500); return; }
        this.pendiente.delete(f.id);
        b.textContent = f.b;
        if (f.id === 'teclasReset') { Aj.v.teclas = {}; Aj.guardar(); Aj.bus.emitir('cambio', { clave: 'teclas', valor: {} }); } else this.acciones(f.id);
      }, f.peligro ? 'peligro' : '');
      ctl.appendChild(b);
    } else if (f.t === 'cuenta') {
      const u = Cta.usuario;
      const b = el('b', '', u ? (u.nombre || u.usuario) : 'Sin sesión');
      const sw = el('i', 'muestraColor'); sw.style.background = u ? u.color : '#666';
      ctl.append(b, sw);
    } else if (f.t === 'nube') {
      ctl.className = 'ctl estadoNube';
      this.refrescos.push(() => { ctl.textContent = textoEstado(); });
    } else if (f.t === 'perfil') {
      const inp = el('input'); inp.type = 'text'; inp.maxLength = 20; inp.value = perfil().nombre; inp.setAttribute('autocomplete', 'off');
      inp.addEventListener('change', () => {
        if (!Cta.activa) { guardarPerfil(inp.value); return; }
        // con cuenta, el nombre es el de la cuenta (también lo ven tus amigos y los jugadores de la sala)
        const nuevo = inp.value.trim().slice(0, 20);
        const C = window.Cuenta;
        if (!nuevo || nuevo === Cta.usuario.nombre) { inp.value = Cta.usuario.nombre; return; }
        C.actualizarPerfil({ nombre: nuevo }).catch((e) => { inp.value = Cta.usuario.nombre; if (C.ui && C.ui.aviso) C.ui.aviso(C.mensajeError ? C.mensajeError(e) : 'No se pudo cambiar el nombre', { color: '#ff6b6b' }); });
      });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
      const sw = el('i', 'muestraColor'); sw.style.background = perfil().color;
      ctl.append(inp, sw);
    }
    return fila;
  }

  alTecla(e) {
    if (!this.esperando) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const a = this.esperando;
    this.esperando = null;
    if (e.code === 'Escape') { this.refrescar(); return; }
    if (e.code === 'Backspace' || e.code === 'Delete') Aj.ponerTecla(a, '');
    else Aj.ponerTecla(a, e.code);
    this.refrescar();
  }
}
