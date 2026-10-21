// =============================================================
//  🖥️  INTERFAZ (todo lo que se ve encima del mundo)
//  Barra de bloques, inventario, menús, mira, avisos y los datos
//  de F3. También dibuja los iconitos de cada bloque (cubitos en
//  3D falso) usando las mismas texturas del atlas.
// =============================================================
import { BLOQUES, EN_MENU, nombreBloque } from './bloques.js';
import { indiceTextura, origenTextura } from './texturas.js';

const $ = (id) => document.getElementById(id);

// Dibuja un cubito isométrico de 64x64 y lo devuelve como imagen
function dibujarIcono(atlas, bloque) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  const origen = (nombre) => origenTextura(indiceTextura(nombre));
  if (bloque.dibujo === 'planta') {
    const [sx, sy] = origen(bloque.caras[1]);
    ctx.drawImage(atlas, sx, sy, 16, 16, 8, 8, 48, 48);
    return c.toDataURL();
  }
  const [arriba, lado] = bloque.caras;
  const caras = [
    { tex: arriba, m: [29 / 16, 14.5 / 16, -29 / 16, 14.5 / 16, 32, 3], sombra: 0 },
    { tex: lado, m: [29 / 16, 14.5 / 16, 0, 29 / 16, 3, 17.5], sombra: 0.22 },
    { tex: lado, m: [29 / 16, -14.5 / 16, 0, 29 / 16, 32, 32], sombra: 0.4 },
  ];
  for (const cara of caras) {
    const [sx, sy] = origen(cara.tex);
    ctx.setTransform(...cara.m);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(atlas, sx, sy, 16, 16, 0, 0, 16, 16);
    if (cara.sombra) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(0, 0, 0, ${cara.sombra})`;
      ctx.fillRect(0, 0, 16, 16);
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  return c.toDataURL();
}

export class Interfaz {
  constructor(atlas, { alElegirRanura, alElegirBloque }) {
    this.iconos = {};
    for (const b of BLOQUES) if (b.caras) this.iconos[b.id] = dibujarIcono(atlas, b);
    this.alElegirRanura = alElegirRanura;
    this.alElegirBloque = alElegirBloque;

    this.el = {
      hud: $('hud'),
      barra: $('barra'),
      nombre: $('nombreBloque'),
      aviso: $('aviso'),
      clic: $('clicContinuar'),
      avisoPausa: $('avisoPausa'),
      ayuda: $('ayuda'),
      depuracion: $('depuracion'),
      agua: $('bajoAgua'),
      carga: $('pantallaCarga'),
      cargaBarra: $('barraCarga'),
      titulo: $('pantallaTitulo'),
      pausa: $('pantallaPausa'),
      inventario: $('pantallaInventario'),
      rejilla: $('rejillaInventario'),
      tactil: $('tactil'),
      btnBajar: $('btnBajar'),
      btnVolar: $('btnVolar'),
    };

    // Barra de 9 ranuras
    this.ranuras = [];
    for (let i = 0; i < 9; i++) {
      const r = document.createElement('button');
      r.className = 'ranura';
      r.type = 'button';
      r.setAttribute('aria-label', 'Ranura ' + (i + 1));
      const img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = String(i + 1);
      r.append(img, num);
      const elegir = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.alElegirRanura(i);
      };
      r.addEventListener('touchstart', elegir, { passive: false });
      r.addEventListener('mousedown', elegir);
      this.el.barra.appendChild(r);
      this.ranuras.push({ boton: r, img });
    }

    // Inventario con todos los bloques
    for (const id of EN_MENU) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bloqueMenu';
      b.title = nombreBloque(id);
      const img = document.createElement('img');
      img.src = this.iconos[id];
      img.alt = '';
      img.draggable = false;
      const nom = document.createElement('span');
      nom.textContent = nombreBloque(id);
      b.append(img, nom);
      b.addEventListener('click', () => this.alElegirBloque(id));
      this.el.rejilla.appendChild(b);
    }

    // Brújula: 8 letras que se deslizan según hacia dónde miras
    this.letrasBrujula = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'].map((t, i) => {
      const s = document.createElement('span');
      s.textContent = t;
      if (i === 0) s.className = 'norte';
      $('brujula').appendChild(s);
      return s;
    });
    this.rumboBrujula = -1;

    this.tiempoNombre = null;
    this.tiempoAviso = null;
    this.tiempoAyuda = null;
    this.ultimaDepuracion = '';
  }

  actualizarBarra(barra, seleccion) {
    this.ranuras.forEach((r, i) => {
      const src = this.iconos[barra[i]] || '';
      if (r.img.getAttribute('src') !== src) r.img.src = src;
      r.boton.classList.toggle('elegida', i === seleccion);
      r.boton.title = nombreBloque(barra[i]);
    });
  }

  mostrarNombre(texto) {
    const e = this.el.nombre;
    e.textContent = texto;
    e.classList.add('visible');
    clearTimeout(this.tiempoNombre);
    this.tiempoNombre = setTimeout(() => e.classList.remove('visible'), 1400);
  }

  aviso(texto, segundos = 1.8) {
    // en pausa el aviso de arriba queda tapado por el menú: se escribe dentro del menú
    const enPausa = !this.el.pausa.classList.contains('oculto');
    const e = enPausa ? this.el.avisoPausa : this.el.aviso;
    const otro = enPausa ? this.el.aviso : this.el.avisoPausa;
    otro.classList.remove('visible');
    if (enPausa) segundos = Math.max(segundos, 2.5);
    e.textContent = texto;
    e.classList.add('visible');
    clearTimeout(this.tiempoAviso);
    this.tiempoAviso = setTimeout(() => e.classList.remove('visible'), segundos * 1000);
  }

  // rumbo en grados: 0 = norte, 90 = este
  brujula(rumbo) {
    if (Math.abs(rumbo - this.rumboBrujula) < 0.4) return;
    this.rumboBrujula = rumbo;
    const ancho = $('brujula').clientWidth || 200;
    this.letrasBrujula.forEach((s, i) => {
      const d = ((i * 45 - rumbo + 540) % 360) - 180;   // -180..180 respecto a donde miras
      s.style.left = (ancho / 2 + (d / 90) * (ancho / 2)) + 'px';
      s.style.visibility = Math.abs(d) < 100 ? 'visible' : 'hidden';
    });
  }

  clicContinuar(si) {
    this.el.clic.classList.toggle('visible', si);
  }

  ayuda(html, segundos) {
    const e = this.el.ayuda;
    e.innerHTML = html;
    e.classList.add('visible');
    clearTimeout(this.tiempoAyuda);
    this.tiempoAyuda = setTimeout(() => e.classList.remove('visible'), segundos * 1000);
  }

  ocultarAyuda() {
    clearTimeout(this.tiempoAyuda);
    this.el.ayuda.classList.remove('visible');
  }

  depuracion(visible, texto) {
    this.el.depuracion.classList.toggle('oculto', !visible);
    if (visible && texto !== this.ultimaDepuracion) {
      this.el.depuracion.textContent = texto;
      this.ultimaDepuracion = texto;
    }
  }

  bajoAgua(si) {
    this.el.agua.classList.toggle('visible', si);
  }

  carga(visible, progreso = 0) {
    this.el.carga.classList.toggle('oculto', !visible);
    if (visible) this.el.cargaBarra.style.width = Math.round(progreso * 100) + '%';
  }

  // Muestra una pantalla: 'titulo', 'pausa', 'inventario' o null (jugando)
  pantalla(nombre) {
    this.el.titulo.classList.toggle('oculto', nombre !== 'titulo');
    this.el.pausa.classList.toggle('oculto', nombre !== 'pausa');
    this.el.inventario.classList.toggle('oculto', nombre !== 'inventario');
    this.el.hud.classList.toggle('oculto', nombre === 'titulo');
    document.body.classList.toggle('enTitulo', nombre === 'titulo');
  }

  modoTactil(si) {
    document.body.classList.toggle('tactil', si);
  }

  volando(si) {
    document.body.classList.toggle('volando', si);
  }
}
