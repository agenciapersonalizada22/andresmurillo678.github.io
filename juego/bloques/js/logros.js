// =============================================================
//  🏆  LOGROS Y ESTADÍSTICAS (se guardan en el navegador, para todos los mundos)
// =============================================================
const CLAVE = 'bloques_logros_v1';

export const LOGROS = [
  { id: 'romper', nombre: 'Manos a la obra', desc: 'Rompe un bloque', cond: (s) => s.bloquesRotos >= 1 },
  { id: 'madera', nombre: 'Leñador', desc: 'Consigue madera de un árbol', cond: (s) => s.tiene.tronco },
  { id: 'mesa', nombre: 'Taller', desc: 'Fabrica una mesa de trabajo', cond: (s) => s.fabricado.mesa_trabajo },
  { id: 'pico', nombre: 'A picar', desc: 'Fabrica un pico', cond: (s) => s.fabricado.pico },
  { id: 'horno', nombre: 'Fundición', desc: 'Funde algo en un horno', cond: (s) => s.fundidos >= 1 },
  { id: 'hierro', nombre: 'Edad del hierro', desc: 'Consigue un lingote de hierro', cond: (s) => s.tiene.hierro },
  { id: 'diamante', nombre: '¡Diamantes!', desc: 'Consigue un diamante', cond: (s) => s.tiene.diamante },
  { id: 'armadura', nombre: 'Cubierto de hierro', desc: 'Ponte una pieza de armadura', cond: (s) => s.armaduraPuesta },
  { id: 'cazador', nombre: 'Cazador de monstruos', desc: 'Derrota a un monstruo', cond: (s) => s.malosMatados >= 1 },
  { id: 'carne', nombre: 'A comer', desc: 'Come algo', cond: (s) => s.comidas >= 1 },
  { id: 'cama', nombre: 'Dulces sueños', desc: 'Duerme en una cama', cond: (s) => s.dormidas >= 1 },
  { id: 'trato', nombre: 'Buen negocio', desc: 'Comercia con un aldeano', cond: (s) => s.tratos >= 1 },
  { id: 'creeper', nombre: 'Ssssss…', desc: 'Sobrevive a la explosión de un creeper', cond: (s) => s.explosiones >= 1 },
  { id: 'arco', nombre: 'Francotirador', desc: 'Acierta una flecha a un bicho', cond: (s) => s.flechasAcertadas >= 1 },
  { id: 'dias', nombre: 'Superviviente', desc: 'Sobrevive 3 días', cond: (s) => s.diasMax >= 3 },
  { id: 'explorador', nombre: 'Explorador', desc: 'Camina 1 000 bloques', cond: (s) => s.distancia >= 1000 },
  { id: 'foto', nombre: 'Fotógrafo', desc: 'Toma una foto', cond: (s) => s.fotos >= 1 },
  { id: 'amigos', nombre: 'Mejor con amigos', desc: 'Juega con otra persona', cond: (s) => s.multi >= 1 },
  // ---- espacio y dimensiones
  { id: 'aeroauto_despega', nombre: 'Despegue vertical', desc: 'Vuela unos segundos en un aeroauto', cond: (s) => s.vuelosAuto >= 1 },
  { id: 'centro_de_mando', nombre: 'Centro de mando', desc: 'Usa un panel de control del centro espacial', cond: (s) => s.centroMando >= 1 },
  { id: 'ingeniero_espacial', nombre: 'Ingeniero espacial', desc: 'Ensambla un cohete completo', cond: (s) => s.cohetes >= 1 },
  { id: 'llegada_orbita', nombre: 'Llegué al espacio', desc: 'Llega a la órbita en un cohete', cond: (s) => s.orbitas >= 1 },
  { id: 'paso_lunar', nombre: 'Un pequeño paso', desc: 'Pisa la Luna', cond: (s) => s.visitaLuna >= 1 },
  { id: 'ida_y_vuelta', nombre: 'Ida y vuelta', desc: 'Regresa a la Superficie desde el espacio', cond: (s) => s.idaVuelta >= 1 },
  { id: 'portal_abismo', nombre: 'Constructor de portales', desc: 'Enciende un portal con un marco de obsidiana', cond: (s) => s.portales >= 1 },
  { id: 'al_abismo', nombre: 'Al otro lado', desc: 'Entra en el Abismo', cond: (s) => s.visitaAbismo >= 1 },
  { id: 'eclipse_total', nombre: 'Sombra en pleno día', desc: 'Mira un eclipse solar total', cond: (s) => s.eclipses >= 1 },
];

const NUMEROS = ['bloquesRotos', 'bloquesPuestos', 'distancia', 'segundos', 'malosMatados', 'animalesMatados', 'muertes', 'fundidos',
  'comidas', 'dormidas', 'tratos', 'explosiones', 'flechasAcertadas', 'diasMax', 'fotos', 'multi', 'crafteos',
  'vuelosAuto', 'centroMando', 'cohetes', 'orbitas', 'visitaLuna', 'idaVuelta', 'portales', 'visitaAbismo', 'eclipses', 'lanzamientos'];

export class Logros {
  constructor() {
    this.s = { tiene: {}, fabricado: {}, armaduraPuesta: false };
    for (const k of NUMEROS) this.s[k] = 0;
    this.hechos = {};
    this.alLograr = null;
    this.sucio = false;
    try {
      const o = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      if (o) {
        for (const k of NUMEROS) if (Number.isFinite(o[k])) this.s[k] = o[k];
        Object.assign(this.s.tiene, o.tiene || {});
        Object.assign(this.s.fabricado, o.fabricado || {});
        this.s.armaduraPuesta = !!o.armaduraPuesta;
        this.hechos = o.hechos || {};
      }
    } catch (e) { /* empezamos de cero */ }
  }

  sumar(k, n = 1) { this.s[k] += n; this.sucio = true; }
  maximo(k, v) { if (v > this.s[k]) { this.s[k] = v; this.sucio = true; } }
  tuvo(clave) { if (!this.s.tiene[clave]) { this.s.tiene[clave] = true; this.sucio = true; } }
  fabrico(clave) { this.s.fabricado[clave] = true; this.s.crafteos++; this.sucio = true; }
  puso() { this.s.armaduraPuesta = true; this.sucio = true; }

  revisar() {
    if (!this.sucio) return;
    this.sucio = false;
    for (const l of LOGROS) {
      if (!this.hechos[l.id] && l.cond(this.s)) {
        this.hechos[l.id] = Date.now();
        if (this.alLograr) this.alLograr(l);
      }
    }
    this.guardar();
  }

  guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify({ ...this.s, hechos: this.hechos })); } catch (e) { /* nada */ }
  }

  borrar() {
    for (const k of NUMEROS) this.s[k] = 0;
    this.s.tiene = {}; this.s.fabricado = {}; this.s.armaduraPuesta = false; this.hechos = {};
    this.guardar();
  }

  // Rellena la pantalla de logros
  pintar(cuerpo) {
    cuerpo.textContent = '';
    const hechos = LOGROS.filter((l) => this.hechos[l.id]).length;
    const t = document.createElement('p');
    t.className = 'info';
    t.textContent = `${hechos} de ${LOGROS.length} logros`;
    cuerpo.appendChild(t);
    const lista = document.createElement('div');
    lista.className = 'listaLogros';
    for (const l of LOGROS) {
      const f = document.createElement('div');
      f.className = 'logro' + (this.hechos[l.id] ? ' hecho' : '');
      const b = document.createElement('b'); b.textContent = (this.hechos[l.id] ? '★ ' : '☆ ') + l.nombre;
      const d = document.createElement('span'); d.textContent = l.desc;
      f.append(b, d);
      lista.appendChild(f);
    }
    cuerpo.appendChild(lista);
    const h = Math.floor(this.s.segundos / 3600), m = Math.floor((this.s.segundos % 3600) / 60);
    const est = [
      ['Tiempo jugado', `${h} h ${m} min`], ['Bloques rotos', this.s.bloquesRotos], ['Bloques puestos', this.s.bloquesPuestos],
      ['Distancia caminada', Math.round(this.s.distancia) + ' bloques'], ['Monstruos derrotados', this.s.malosMatados], ['Animales cazados', this.s.animalesMatados],
      ['Muertes', this.s.muertes], ['Objetos fabricados', this.s.crafteos], ['Intercambios', this.s.tratos],
    ];
    const g = document.createElement('div');
    g.className = 'estadisticas';
    for (const [k, v] of est) { const e = document.createElement('div'); e.innerHTML = '<span></span><b></b>'; e.firstChild.textContent = k; e.lastChild.textContent = String(v); g.appendChild(e); }
    cuerpo.appendChild(g);
  }
}
