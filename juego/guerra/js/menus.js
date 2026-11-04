// Pantallas del menú: selección de mapa y modo, misiones, logros y estadísticas.
import { MAPAS, ORDEN_MAPAS, AVIONES } from './config.js';
import { TANQUES, CAMPANAS, LOGROS, NIVELES_BOT } from './catalogo.js';
import { Progreso } from './progreso.js';
import { cargarRecords, claveRecord, cargarOpciones, guardarOpciones } from './guardado.js';
import { el, pintarPerfil } from './hangar.js';
import { abrirCuenta, usuario } from './cuentaJuego.js';

const $ = (id) => document.getElementById(id);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export const MODOS = [
  { id: 'arcade', nombre: 'BATALLA ARCADE', desc: 'Equipos con bots, tickets, reaparición y zonas de captura en tierra.', unidades: true, color: '#3df5ff' },
  { id: 'combinado', nombre: 'COMBATE COMBINADO', desc: 'Aviones y tanques de los dos bandos en el mismo mapa. Puedes cambiar al reaparecer.', unidades: false, color: '#ff9d3d' },
  { id: 'duelo', nombre: 'DUELO LIBRE', desc: 'Dogfight todos contra todos contra 7 pilotos. Gana quien llegue a 12 bajas.', unidades: false, color: '#ff4d6d' },
  { id: 'simulacro', nombre: 'SIMULACRO', desc: 'Práctica sin riesgo: blancos, munición infinita y sin daño.', unidades: true, color: '#3df58a' },
  { id: 'clasico_avion', nombre: 'SUPERVIVENCIA AÉREA', desc: 'Oleadas de cazas y blancos terrestres. Récord por mapa.', unidades: false, color: '#9a8cff' },
  { id: 'clasico_tanque', nombre: 'SUPERVIVENCIA DE TANQUES', desc: 'Tu tanque contra oleadas de blindados. Récord por mapa.', unidades: false, color: '#ffe066' },
];

export class Menus {
  // cb = { cargarMapa(id), vistas, abrirHangar(tipo), combatir(cfg), jugarMision(m) }
  constructor(cb) {
    this.cb = cb;
    const o = cargarOpciones();
    this.sel = { mapa: o.mapa, modo: o.modoSel || 'arcade', unidad: o.unidadSel || 'avion', nivel: o.nivelBot || 2, tam: o.tamBot || 8 };
    this.botonesMapa = {};
    this._mapas();
  }

  guardar() {
    guardarOpciones({ ...cargarOpciones(), mapa: this.sel.mapa, modoSel: this.sel.modo, unidadSel: this.sel.unidad, nivelBot: this.sel.nivel, tamBot: this.sel.tam });
  }

  _mapas() {
    const cont = $('selMapas');
    for (const id of ORDEN_MAPAS) {
      const d = MAPAS[id];
      const b = el('button', 'chip');
      b.type = 'button';
      const c = d.cielo, p = d.paleta;
      const sw = el('i');
      sw.style.background = `linear-gradient(${hex(c.cenit)}, ${hex(c.horizonte)} 55%, ${hex(p.pasto1)} 56%, ${hex(p.pasto2)})`;
      b.append(sw, el('span', '', d.nombre));
      b.addEventListener('click', () => { this.sel.mapa = id; this.cb.cargarMapa(id); this.guardar(); this.dibujarJugar(); });
      cont.appendChild(b);
      this.botonesMapa[id] = b;
    }
  }

  ciclarMapa(dir) {
    const n = ORDEN_MAPAS.length;
    const id = ORDEN_MAPAS[(ORDEN_MAPAS.indexOf(this.sel.mapa) + dir + n) % n];
    this.sel.mapa = id;
    this.cb.cargarMapa(id);
    this.guardar();
    this.dibujarJugar();
    return this.botonesMapa[id];
  }

  // ---------------------------------------------------------- Pantalla de combate
  dibujarJugar() {
    for (const id of ORDEN_MAPAS) this.botonesMapa[id].classList.toggle('sel', id === this.sel.mapa);
    $('infoMapa').textContent = MAPAS[this.sel.mapa].desc;
    const lm = $('listaModos');
    lm.textContent = '';
    const r = cargarRecords();
    for (const m of MODOS) {
      const b = el('button', 'modoCard' + (this.sel.modo === m.id ? ' sel' : ''));
      b.type = 'button';
      b.style.borderColor = this.sel.modo === m.id ? '' : m.color;
      b.append(el('b', '', m.nombre), el('span', '', m.desc));
      if (m.id.startsWith('clasico')) {
        const x = r[claveRecord(m.id === 'clasico_avion' ? 'avion' : 'tanque', this.sel.mapa)];
        b.appendChild(el('em', '', x ? `Récord: ${x.puntaje} (oleada ${x.oleada})` : 'Récord: 0'));
      }
      b.addEventListener('click', () => { this.sel.modo = m.id; this.guardar(); this.dibujarJugar(); });
      lm.appendChild(b);
    }
    const mo = MODOS.find((m) => m.id === this.sel.modo);
    const op = $('opcionesJugar');
    op.textContent = '';
    const ciclo = (txt, valores, actual, fn) => {
      const b = el('button');
      b.type = 'button';
      const v = valores.find((x) => x[0] === actual) || valores[0];
      b.textContent = `${txt}: ${v[1]}`;
      b.addEventListener('click', () => { fn(valores[(valores.findIndex((x) => x[0] === actual) + 1) % valores.length][0]); this.guardar(); this.dibujarJugar(); });
      op.appendChild(b);
    };
    const equipos = ['arcade', 'combinado', 'duelo', 'simulacro'].includes(this.sel.modo);
    if (mo.unidades) ciclo('VEHÍCULO', [['avion', 'AVIÓN'], ['tanque', 'TANQUE']], this.sel.unidad, (v) => { this.sel.unidad = v; });
    if (equipos && this.sel.modo !== 'simulacro') ciclo('NIVEL DE BOTS', NIVELES_BOT.map((n) => [n.id, n.nombre]), this.sel.nivel, (v) => { this.sel.nivel = v; });
    if (this.sel.modo === 'arcade' || this.sel.modo === 'combinado') ciclo('TAMAÑO', [[4, '4 CONTRA 4'], [8, '8 CONTRA 8']], this.sel.tam, (v) => { this.sel.tam = v; });
    // vehículos elegidos
    const rv = $('resumenVeh');
    rv.textContent = '';
    for (const tipo of ['avion', 'tanque']) {
      const id = Progreso.elegido(tipo);
      const d = (tipo === 'avion' ? AVIONES : TANQUES)[id];
      const c = el('div', 'vehMini');
      const img = el('img');
      const p = Progreso.pintura(tipo, id);
      const camo = p.camo !== 'base' ? null : null;
      void camo;
      img.src = this.cb.imagen(tipo, id);
      c.append(img, el('b', '', d.nombre), el('small', '', d.clase));
      const b = el('button', '', 'CAMBIAR EN EL HANGAR');
      b.type = 'button';
      b.addEventListener('click', () => this.cb.abrirHangar(tipo));
      c.appendChild(b);
      rv.appendChild(c);
    }
  }

  // Configuración lista para empezar la partida elegida
  configuracion() {
    const s = this.sel;
    switch (s.modo) {
      case 'clasico_avion': return { clasico: 'avion' };
      case 'clasico_tanque': return { clasico: 'tanque' };
      case 'duelo': return { modo: 'duelo', unidad: 'avion', nivel: s.nivel, tam: 8 };
      case 'simulacro': return { modo: 'simulacro', unidad: s.unidad, nivel: 1, tam: 4 };
      case 'combinado': return { modo: 'arcade', unidad: 'avion', combinado: true, nivel: s.nivel, tam: s.tam };
      default: return { modo: 'arcade', unidad: s.unidad, nivel: s.nivel, tam: s.tam };
    }
  }

  // ---------------------------------------------------------- Misiones
  dibujarMisiones() {
    const cont = $('listaMisiones');
    cont.textContent = '';
    for (const c of CAMPANAS) {
      const d = el('div', 'campana');
      d.appendChild(el('h3', '', c.nombre));
      d.appendChild(el('p', 'info', c.desc));
      c.misiones.forEach((m, i) => {
        const hecha = Progreso.misionHecha(m.id);
        const libre = i === 0 || Progreso.misionHecha(c.misiones[i - 1].id);
        const b = el('button', 'mision' + (hecha ? ' hecha' : '') + (libre ? '' : ' bloq'));
        b.type = 'button';
        b.append(el('b', '', `${hecha ? '✔ ' : ''}${m.nombre} · ${m.unidad === 'avion' ? 'AVIÓN' : 'TANQUE'} · ${MAPAS[m.mapa].nombre}`));
        b.appendChild(el('span', '', `${m.desc}  Recompensa: ${m.cr} cr · ${m.xp} xp${libre ? '' : '  (completa la anterior)'}`));
        b.addEventListener('click', () => { if (libre) this.cb.jugarMision(m); });
        d.appendChild(b);
      });
      cont.appendChild(d);
    }
  }

  // ---------------------------------------------------------- Logros y estadísticas
  dibujarLogros() {
    const cont = $('contLogros');
    cont.textContent = '';
    const s = Progreso.stats();
    const g = el('div', 'statsGrid');
    const dato = (t, v) => { const d = el('div', '', t); d.appendChild(el('b', '', String(v))); g.appendChild(d); };
    dato('Partidas', s.partidas); dato('Victorias', s.victorias); dato('Bajas', s.bajas); dato('Muertes', s.muertes);
    dato('Aviones derribados', s.bajasAire); dato('Tanques destruidos', s.bajasTanque); dato('Blancos de tierra', s.bajasTierra);
    dato('Mejor racha', s.mejorRacha); dato('Zonas capturadas', s.capturas); dato('Misiones', s.misiones);
    dato('Bombas lanzadas', s.bombas); dato('Misiles y cohetes', s.misiles);
    dato('Precisión', s.disparos ? Math.round((s.aciertos / s.disparos) * 100) + ' %' : '—');
    dato('Tiempo jugado', Math.floor(s.tiempo / 60) + ' min');
    cont.appendChild(g);
    cont.appendChild(el('h3', 'selTitulo', 'LOGROS'));
    const log = Progreso.datos().logros;
    for (const l of LOGROS) {
      const d = el('div', 'logro' + (log[l.id] ? ' ok' : ''));
      d.appendChild(el('i', '', log[l.id] ? '★' : '☆'));
      const t = el('div');
      t.append(document.createTextNode(l.nombre), el('small', '', l.desc));
      d.appendChild(t);
      cont.appendChild(d);
    }
  }

  pintarTitulo() {
    const b = $('perfilBarra');
    pintarPerfil(b);
    if (usuario()) {
      const c = el('button', 'chipCuenta', 'CUENTA');
      c.type = 'button';
      c.setAttribute('aria-label', 'Cuenta: volver al portal o cerrar sesión');
      c.addEventListener('click', abrirCuenta);
      b.appendChild(c);
    }
  }
}
