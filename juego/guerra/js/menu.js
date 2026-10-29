// Selectores del menú: mapa y avión (miniatura 3D, barras de estadísticas y bloqueos)
import { MAPAS, ORDEN_MAPAS, AVIONES, ORDEN_AVIONES } from './config.js';
import { generarVistas } from './vistas.js';

const $ = (id) => document.getElementById(id);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const el = (tag, clase, texto) => {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto !== undefined) e.textContent = texto;
  return e;
};

const BARRAS = [['VELOCIDAD', 'vel'], ['AGILIDAD', 'agil'], ['RESISTENCIA', 'vida'], ['POTENCIA', 'fuego']];

export class Menu {
  // elegido = { mapa, avion }; cb = { mapa(id), avion(id), disponible(id), mejor() }
  constructor(renderer, elegido, cb) {
    this.cb = cb;
    this.mapa = elegido.mapa;
    this.avion = elegido.avion;
    this.vista = elegido.avion;
    this.imagenes = generarVistas(renderer);
    this.botonesMapa = {};
    this.botonesAvion = {};
    this._construirMapas();
    this._construirAviones();
    this.refrescar();
  }

  _construirMapas() {
    const cont = $('selMapas');
    for (const id of ORDEN_MAPAS) {
      const d = MAPAS[id];
      const b = el('button', 'chip');
      b.type = 'button';
      const c = d.cielo, p = d.paleta;
      const sw = el('i');
      sw.style.background = `linear-gradient(${hex(c.cenit)}, ${hex(c.horizonte)} 55%, ${hex(p.pasto1)} 56%, ${hex(p.pasto2)})`;
      b.append(sw, el('span', '', d.nombre));
      b.addEventListener('click', () => {
        this.mapa = id;
        this.cb.mapa(id);
        this.refrescar();
      });
      cont.appendChild(b);
      this.botonesMapa[id] = b;
    }
  }

  _construirAviones() {
    const cont = $('selAviones');
    for (const id of ORDEN_AVIONES) {
      const d = AVIONES[id];
      const b = el('button', 'carta');
      b.type = 'button';
      const img = el('img');
      img.alt = d.nombre;
      img.draggable = false;
      if (this.imagenes[id]) img.src = this.imagenes[id];
      b.append(img, el('b', '', d.nombre), el('small', '', d.clase));
      b.appendChild(el('u', 'cand'));
      b.addEventListener('click', () => {
        this.vista = id;
        if (this.cb.disponible(id)) {
          this.avion = id;
          this.cb.avion(id);
        }
        this.refrescar();
      });
      cont.appendChild(b);
      this.botonesAvion[id] = b;
    }
  }

  // Mando: LB/RB recorren los aviones (la ficha muestra el que ves; si está libre, queda elegido)
  ciclarAvion(dir) {
    const n = ORDEN_AVIONES.length;
    const i = ORDEN_AVIONES.indexOf(this.vista);
    const id = ORDEN_AVIONES[(i + dir + n) % n];
    this.vista = id;
    if (this.cb.disponible(id)) {
      this.avion = id;
      this.cb.avion(id);
    }
    this.refrescar();
    return this.botonesAvion[id];
  }

  // Mando: LT/RT recorren los mapas
  ciclarMapa(dir) {
    const n = ORDEN_MAPAS.length;
    const id = ORDEN_MAPAS[(ORDEN_MAPAS.indexOf(this.mapa) + dir + n) % n];
    this.mapa = id;
    this.cb.mapa(id);
    this.refrescar();
    return this.botonesMapa[id];
  }

  refrescar() {
    const mejor = this.cb.mejor();
    for (const id of ORDEN_MAPAS) this.botonesMapa[id].classList.toggle('sel', id === this.mapa);
    $('infoMapa').textContent = MAPAS[this.mapa].desc;
    for (const id of ORDEN_AVIONES) {
      const b = this.botonesAvion[id];
      const libre = this.cb.disponible(id);
      b.classList.toggle('sel', id === this.avion);
      b.classList.toggle('vista', id === this.vista);
      b.classList.toggle('bloqueado', !libre);
      b.querySelector('u').textContent = libre ? '' : 'BLOQUEADO';
    }
    const d = AVIONES[this.vista], libre = this.cb.disponible(this.vista);
    const ficha = $('fichaAvion');
    ficha.textContent = '';
    ficha.appendChild(el('h4', '', `${d.nombre} · ${d.clase}`));
    ficha.appendChild(el('p', '', d.desc));
    for (const [nombre, clave] of BARRAS) {
      const f = el('div', 'fila-barra');
      const barra = el('div', 'bar');
      const i = el('span');
      i.style.width = Math.round(d.ficha[clave] * 100) + '%';
      barra.appendChild(i);
      f.append(el('em', '', nombre), barra);
      ficha.appendChild(f);
    }
    const armas = ['AMETRALLADORA'];
    if (d.sec.n) armas.push(`${d.sec.n} ${d.sec.nombre}`);
    if (d.bombas) armas.push(`${d.bombas} BOMBAS`);
    ficha.appendChild(el('p', 'armas', armas.join(' · ')));
    if (!libre) ficha.appendChild(el('p', 'aviso-bloq', `Se desbloquea al llegar a ${d.desbloqueo} puntos en modo avión, en cualquier mapa (tu mejor: ${mejor}).`));
    else if (this.vista === this.avion) ficha.appendChild(el('p', 'aviso-ok', 'ELEGIDO PARA JUGAR'));
  }
}
