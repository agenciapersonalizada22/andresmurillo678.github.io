// Hangar: elegir, comprar y mejorar aviones y tanques; pintura e insignias.
import { AVIONES, ORDEN_AVIONES } from './config.js';
import { TANQUES, ORDEN_TANQUES, MEJORAS, ORDEN_MEJORAS, CAMUFLAJES, ORDEN_CAMUFLAJES, MARCAS, ORDEN_MARCAS, ROLES } from './catalogo.js';
import { Progreso, nivelDeXp, xpDeNivel, perfil } from './progreso.js';

const $ = (id) => document.getElementById(id);
export const el = (tag, clase, texto) => {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto !== undefined) e.textContent = texto;
  return e;
};
const VACIA = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const BARRAS = [['VELOCIDAD', 'vel'], ['AGILIDAD', 'agil'], ['RESISTENCIA', 'vida'], ['POTENCIA', 'fuego']];

// Barra de perfil: nombre, nivel, experiencia y créditos
export function pintarPerfil(cont) {
  const p = perfil(), xp = Progreso.xp(), n = nivelDeXp(xp);
  const a = xpDeNivel(n), b = xpDeNivel(n + 1);
  cont.textContent = '';
  const nom = el('span');
  const dot = el('i', 'pDot');
  dot.style.background = p.color;
  nom.append(dot, el('b', '', p.nombre));
  const niv = el('span', '', 'NIVEL ');
  niv.appendChild(el('b', '', String(n)));
  const barra = el('div', 'xp');
  const i = el('i');
  i.style.width = Math.round(((xp - a) / (b - a)) * 100) + '%';
  barra.appendChild(i);
  const cr = el('span', 'cr', Progreso.creditos() + ' cr');
  cont.append(nom, niv, barra, cr);
}

export class Hangar {
  // cb = { vistas, alCambiar() }
  constructor(cb) {
    this.cb = cb;
    this.tipo = 'avion';
    this.vista = { avion: Progreso.elegido('avion'), tanque: Progreso.elegido('tanque') };
    this.filtro = 'todos';
    this.msg = '';
    this.pend = [];
    this.tabs = $('hangarTabs');
    for (const [id, n] of [['avion', 'AVIONES'], ['tanque', 'TANQUES']]) {
      const b = el('button', '', n);
      b.type = 'button';
      b.dataset.t = id;
      b.addEventListener('click', () => { this.tipo = id; this.dibujar(); });
      this.tabs.appendChild(b);
    }
  }

  abrir(tipo) {
    if (tipo) this.tipo = tipo;
    this.vista.avion = Progreso.elegido('avion');
    this.vista.tanque = Progreso.elegido('tanque');
    this.msg = '';
    this.dibujar();
  }

  ciclarTab(dir) {
    this.tipo = this.tipo === 'avion' ? 'tanque' : 'avion';
    void dir;
    this.dibujar();
  }

  _tabla() { return this.tipo === 'avion' ? AVIONES : TANQUES; }
  _orden() { return this.tipo === 'avion' ? ORDEN_AVIONES : ORDEN_TANQUES; }

  _imagen(tipo, id) {
    const p = Progreso.pintura(tipo, id);
    const camo = CAMUFLAJES[p.camo];
    return this.cb.vistas.obtener(tipo, id, camo && camo.c ? camo.c : null, p.marca, perfil().color);
  }

  dibujar() {
    pintarPerfil($('hangarCab'));
    for (const b of this.tabs.children) b.classList.toggle('sel', b.dataset.t === this.tipo);
    const grid = $('hangarGrid');
    grid.textContent = '';
    const tabla = this._tabla();
    const sel = this.vista[this.tipo];
    let ids = this._orden();
    if (this.tipo === 'avion' && this.filtro !== 'todos') ids = ids.filter((k) => tabla[k].rol === this.filtro);
    if (this.tipo === 'avion') {
      const f = el('button', 'carta filtro');
      f.type = 'button';
      f.append(el('b', '', 'FILTRO'), el('small', '', this.filtro === 'todos' ? 'TODOS LOS ROLES' : ROLES[this.filtro]));
      f.addEventListener('click', () => {
        const roles = ['todos', ...Object.keys(ROLES).filter((r) => ORDEN_AVIONES.some((k) => AVIONES[k].rol === r))];
        this.filtro = roles[(roles.indexOf(this.filtro) + 1) % roles.length];
        this.dibujar();
      });
      grid.appendChild(f);
    }
    for (const id of ids) {
      const d = tabla[id];
      const b = el('button', 'carta');
      b.type = 'button';
      const img = el('img');
      img.alt = d.nombre; img.draggable = false;
      this._cargarImg(img, this.tipo, id);
      const tengo = Progreso.poseido(this.tipo, id);
      const nivelOk = Progreso.nivel() >= (d.rango || 1);
      b.append(img, el('b', '', d.nombre), el('small', '', d.clase));
      const pr = el('span', 'precio', tengo ? (Progreso.elegido(this.tipo) === id ? 'EN USO' : 'COMPRADO') : `NIV ${d.rango} · ${d.costo} cr`);
      b.appendChild(pr);
      b.classList.toggle('sel', sel === id);
      b.classList.toggle('poseido', tengo);
      b.classList.toggle('bloqueado', !tengo && !nivelOk);
      b.addEventListener('click', () => { this.vista[this.tipo] = id; this.msg = ''; this.dibujar(); });
      grid.appendChild(b);
    }
    this._ficha();
  }

  _cargarImg(img, tipo, id) {
    img.src = VACIA;
    this.pend.push(() => { if (img.isConnected) img.src = this._imagen(tipo, id); });
    if (!this.corriendo) {
      this.corriendo = true;
      const paso = () => {
        const f = this.pend.shift();
        if (f) { f(); setTimeout(paso, 16); } else this.corriendo = false;
      };
      setTimeout(paso, 0);
    }
  }

  _ficha() {
    const f = $('hangarFicha');
    f.textContent = '';
    const tipo = this.tipo, id = this.vista[tipo], d = this._tabla()[id];
    if (!d) return;
    const tengo = Progreso.poseido(tipo, id);
    f.appendChild(el('h4', '', `${d.nombre} · ${d.clase}`));
    f.appendChild(el('p', '', d.desc));
    for (const [nombre, k] of BARRAS) {
      const fila = el('div', 'fila-barra');
      const barra = el('div', 'bar');
      const i = el('span');
      i.style.width = Math.round((d.ficha[k] || 0) * 100) + '%';
      barra.appendChild(i);
      fila.append(el('em', '', nombre), barra);
      f.appendChild(fila);
    }
    if (tipo === 'avion') {
      const armas = ['AMETRALLADORAS'];
      if (d.sec.n) armas.push(`${d.sec.n} ${d.sec.nombre}`);
      if (d.bombas) armas.push(`${d.bombas} BOMBAS ${d.bombaTipo === 'L' ? 'LIGERAS' : d.bombaTipo === 'P' ? 'PESADAS' : 'MEDIANAS'}`);
      armas.push(`${d.bengalas} BENGALAS`);
      f.appendChild(el('p', 'armas', armas.join(' · ')));
    } else {
      f.appendChild(el('p', 'armas', (d.auto ? 'CAÑÓN AUTOMÁTICO' : 'OBÚS PERFORANTE / EXPLOSIVO') + ' · AMETRALLADORA COAXIAL'));
    }
    if (!tengo) {
      const nivelOk = Progreso.nivel() >= d.rango;
      const b = el('button', 'principal', nivelOk ? `COMPRAR · ${d.costo} cr` : `NIVEL ${d.rango} NECESARIO`);
      b.type = 'button';
      b.addEventListener('click', () => {
        if (Progreso.comprar(tipo, id)) { Progreso.elegir(tipo, id); this.msg = '¡Comprado y elegido!'; this.cb.alCambiar(); }
        else this.msg = nivelOk ? 'No tienes créditos suficientes.' : `Necesitas nivel ${d.rango}.`;
        this.dibujar();
      });
      f.appendChild(b);
    } else {
      const sel = Progreso.elegido(tipo) === id;
      const b = el('button', sel ? '' : 'principal', sel ? 'EN USO' : 'ELEGIR PARA JUGAR');
      b.type = 'button';
      b.addEventListener('click', () => { Progreso.elegir(tipo, id); this.msg = ''; this.cb.alCambiar(); this.dibujar(); });
      f.appendChild(b);
      // mejoras
      f.appendChild(el('h4', '', 'MEJORAS DE MÓDULOS'));
      for (const m of ORDEN_MEJORAS) {
        const n = Progreso.nivelMejora(tipo, id, m);
        const fila = el('div', 'mod');
        const t = el('span', '', `${MEJORAS[m].nombre} `);
        t.appendChild(el('b', 'pips', '■'.repeat(n) + '□'.repeat(3 - n)));
        const bt = el('button', '', n >= 3 ? 'MÁXIMO' : `+ ${Progreso.costoMejora(tipo, id, m)} cr`);
        bt.type = 'button';
        bt.title = MEJORAS[m].desc;
        bt.addEventListener('click', () => { this.msg = Progreso.mejorar(tipo, id, m) ? 'Mejora aplicada.' : n >= 3 ? 'Ya está al máximo.' : 'Créditos insuficientes.'; this.cb.alCambiar(); this.dibujar(); });
        fila.append(t, bt);
        f.appendChild(fila);
      }
      f.appendChild(el('p', '', MEJORAS.motor.desc + ' · ' + MEJORAS.armas.desc + ' · ' + MEJORAS.blindaje.desc));
      // pintura
      const pint = Progreso.pintura(tipo, id);
      f.appendChild(el('h4', '', 'CAMUFLAJE'));
      const sw = el('div', 'swatches');
      for (const k of ORDEN_CAMUFLAJES) {
        const c = CAMUFLAJES[k];
        const b2 = el('button', pint.camo === k ? 'sel' : '');
        b2.type = 'button';
        const i = el('i');
        i.style.background = c.c ? '#' + c.c[0].toString(16).padStart(6, '0') : d.colores ? '#' + (d.colores[0] || d.color).toString(16).padStart(6, '0') : '#888';
        if (!c.c && tipo === 'tanque') i.style.background = '#' + d.color.toString(16).padStart(6, '0');
        b2.append(i, document.createTextNode(c.nombre + (pint.camos[k] || !c.costo ? '' : ` ${c.costo}`)));
        b2.addEventListener('click', () => { this.msg = Progreso.elegirPintura(tipo, id, 'camo', k) ? '' : 'Créditos insuficientes.'; this.cb.alCambiar(); this.dibujar(); });
        sw.appendChild(b2);
      }
      f.appendChild(sw);
      f.appendChild(el('h4', '', 'INSIGNIA'));
      const sm = el('div', 'swatches');
      for (const k of ORDEN_MARCAS) {
        const mk = MARCAS[k];
        const b2 = el('button', pint.marca === k ? 'sel' : '', mk.nombre + (pint.marcas[k] || !mk.costo ? '' : ` ${mk.costo}`));
        b2.type = 'button';
        b2.addEventListener('click', () => { this.msg = Progreso.elegirPintura(tipo, id, 'marca', k) ? '' : 'Créditos insuficientes.'; this.cb.alCambiar(); this.dibujar(); });
        sm.appendChild(b2);
      }
      f.appendChild(sm);
    }
    if (this.msg) f.appendChild(el('p', 'aviso-ok', this.msg));
  }
}
