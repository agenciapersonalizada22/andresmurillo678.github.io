// =============================================================
//  🖥️  INTERFAZ (todo lo que se ve encima del mundo)
//  Barra de bloques, inventario, menús, mira, avisos y los datos
//  de F3. También dibuja los iconitos de cada bloque (cubitos en
//  3D falso) usando las mismas texturas del atlas.
// =============================================================
import { BLOQUES, EN_MENU, nombreBloque } from './bloques.js';
import { indiceTextura, origenTextura, TAM } from './texturas.js';
import { OBJETOS, LISTA_OBJETOS } from './botin.js';

const $ = (id) => document.getElementById(id);

// Dibuja un cubito isométrico de 64x64 y lo devuelve como imagen
function dibujarIcono(atlas, bloque) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  const origen = (nombre) => origenTextura(indiceTextura(nombre));
  if (bloque.dibujo === 'planta' || bloque.plano) {
    const [sx, sy] = origen(bloque.caras[1]);
    ctx.drawImage(atlas, sx, sy, TAM, TAM, 4, 4, 56, 56);
    return c.toDataURL();
  }
  const [arriba, lado] = bloque.caras;
  const k = 16 / TAM;
  const caras = [
    { tex: arriba, m: [29 / 16 * k, 14.5 / 16 * k, -29 / 16 * k, 14.5 / 16 * k, 32, 3], sombra: 0 },
    { tex: bloque.frenteTodos || lado, m: [29 / 16 * k, 14.5 / 16 * k, 0, 29 / 16 * k, 3, 17.5], sombra: 0.22 },
    { tex: lado, m: [29 / 16 * k, -14.5 / 16 * k, 0, 29 / 16 * k, 32, 32], sombra: 0.4 },
  ];
  for (const cara of caras) {
    const [sx, sy] = origen(cara.tex);
    ctx.setTransform(...cara.m);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(atlas, sx, sy, TAM, TAM, 0, 0, TAM, TAM);
    if (cara.sombra) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(0, 0, 0, ${cara.sombra})`;
      ctx.fillRect(0, 0, TAM, TAM);
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  return c.toDataURL();
}

// Iconos dibujados con el canvas para los objetos de la mochila
function iconoObjeto(obj) {
  const o = OBJETOS[obj];
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d');
  x.lineWidth = 2;
  x.strokeStyle = 'rgba(0,0,0,0.6)';
  x.fillStyle = o.color;
  if (o.forma === 'gema') {
    x.beginPath(); x.moveTo(16, 3); x.lineTo(28, 12); x.lineTo(16, 29); x.lineTo(4, 12); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.45)'; x.beginPath(); x.moveTo(16, 3); x.lineTo(10, 12); x.lineTo(16, 14); x.closePath(); x.fill();
  } else if (o.forma === 'lingote') {
    x.beginPath(); x.moveTo(8, 10); x.lineTo(26, 10); x.lineTo(30, 24); x.lineTo(4, 24); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.45)'; x.fillRect(10, 12, 12, 3);
  } else if (o.forma === 'bidon') {
    x.fillRect(7, 7, 18, 22); x.strokeRect(7, 7, 18, 22);
    x.fillStyle = '#222'; x.fillRect(19, 3, 6, 5); x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(10, 13, 12, 8);
    x.fillStyle = o.color; x.fillRect(12, 15, 8, 4);
  } else if (o.forma === 'pan') {
    x.beginPath(); x.ellipse(16, 18, 13, 8, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    x.strokeStyle = 'rgba(120,70,20,0.8)'; x.beginPath(); x.moveTo(9, 15); x.lineTo(13, 21); x.moveTo(15, 14); x.lineTo(19, 22); x.moveTo(21, 15); x.lineTo(25, 21); x.stroke();
  } else {
    x.beginPath(); x.arc(16, 19, 9, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = '#3a8a2a'; x.fillRect(16, 6, 3, 6); x.fillStyle = 'rgba(255,255,255,0.4)'; x.fillRect(11, 15, 3, 4);
  }
  return c.toDataURL();
}

// Iconos sencillos de los vehículos (vistas de lado)
function iconoVehiculo(tipo) {
  const c = document.createElement('canvas');
  c.width = 168; c.height = 112;
  const x = c.getContext('2d');
  x.lineJoin = 'round';
  x.lineWidth = 3;
  x.strokeStyle = 'rgba(0,0,0,0.65)';
  const rueda = (cx, cy, r) => { x.fillStyle = '#1b1b1d'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#b8bcc4'; x.beginPath(); x.arc(cx, cy, r * 0.55, 0, 7); x.fill(); };
  if (tipo === 'jeep') {
    x.fillStyle = '#4a7a3a';
    x.beginPath(); x.moveTo(14, 70); x.lineTo(14, 52); x.lineTo(44, 48); x.lineTo(60, 28); x.lineTo(108, 28); x.lineTo(112, 52); x.lineTo(154, 52); x.lineTo(154, 70); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = 'rgba(140,200,230,0.7)'; x.beginPath(); x.moveTo(64, 32); x.lineTo(104, 32); x.lineTo(106, 48); x.lineTo(54, 48); x.closePath(); x.fill();
    rueda(42, 78, 15); rueda(124, 78, 15);
  } else if (tipo === 'bote') {
    x.fillStyle = '#eef2f6';
    x.beginPath(); x.moveTo(10, 62); x.lineTo(156, 62); x.lineTo(138, 88); x.lineTo(40, 88); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#1f5fa8'; x.fillRect(30, 70, 100, 6);
    x.fillStyle = 'rgba(140,200,230,0.7)'; x.beginPath(); x.moveTo(60, 62); x.lineTo(72, 40); x.lineTo(100, 40); x.lineTo(104, 62); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#2c3037'; x.fillRect(146, 54, 12, 28);
    x.strokeStyle = 'rgba(120,190,255,0.8)'; x.beginPath(); x.moveTo(6, 96); x.quadraticCurveTo(30, 88, 54, 96); x.quadraticCurveTo(80, 104, 104, 96); x.quadraticCurveTo(130, 88, 160, 98); x.stroke();
  } else if (tipo === 'avioneta') {
    x.fillStyle = '#f2f2f0';
    x.beginPath(); x.ellipse(84, 62, 66, 15, 0, 0, 7); x.fill(); x.stroke();
    x.fillStyle = '#c8282b'; x.beginPath(); x.moveTo(140, 56); x.lineTo(152, 26); x.lineTo(160, 28); x.lineTo(154, 56); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#f2f2f0'; x.beginPath(); x.moveTo(70, 66); x.lineTo(100, 66); x.lineTo(112, 90); x.lineTo(84, 90); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = 'rgba(140,200,230,0.8)'; x.beginPath(); x.ellipse(72, 52, 18, 10, 0, Math.PI, 0); x.fill(); x.stroke();
    x.strokeStyle = '#2a2c30'; x.lineWidth = 5; x.beginPath(); x.moveTo(16, 42); x.lineTo(16, 84); x.stroke(); x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,0.65)';
    rueda(60, 88, 9); rueda(104, 88, 9);
  } else {
    x.fillStyle = '#6e7278';
    x.beginPath(); x.moveTo(30, 40); x.lineTo(138, 40); x.lineTo(126, 80); x.lineTo(42, 80); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#1c1c1e'; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(54 + i * 16, 38, 8, Math.PI, 0); x.fill(); }
    rueda(54, 92, 11); rueda(114, 92, 11);
    x.strokeStyle = '#aaa'; x.lineWidth = 4; x.beginPath(); x.moveTo(6, 104); x.lineTo(162, 104); x.stroke();
  }
  return c.toDataURL();
}

export class Interfaz {
  constructor(atlas, { alElegirRanura, alElegirBloque, alElegirVehiculo, alElegirObjeto }) {
    this.iconos = {};
    this.iconosObjeto = {};
    for (const o of LISTA_OBJETOS) this.iconosObjeto[o] = iconoObjeto(o);
    this.alElegirVehiculo = alElegirVehiculo;
    this.alElegirObjeto = alElegirObjeto;
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
      mochila: $('mochila'),
      tablero: $('tablero'),
      tabVel: $('tabVel'),
      tabComb: $('tabComb'),
      tabGas: $('tabGas'),
      tabGasCaja: $('tabGasCaja'),
      tabTexto: $('tabTexto'),
      rejillaVeh: $('rejillaVehiculos'),
      info: $('infoInventario'),
      pestBloques: $('pestBloques'),
      pestVehiculos: $('pestVehiculos'),
    };
    this.pestanaActual = 'bloques';
    $('pestBloques').addEventListener('click', () => this.pestana('bloques'));
    $('pestVehiculos').addEventListener('click', () => this.pestana('vehiculos'));

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

    // Vehículos y objetos (se llenan con crearTarjetasVehiculos)
    this.ultimaMochila = '';

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

  // Tarjetas del inventario de vehículos: [{ tipo, nombre, nota }]
  crearTarjetasVehiculos(lista) {
    const cont = this.el.rejillaVeh;
    cont.textContent = '';
    for (const v of lista) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tarjetaVeh';
      const img = document.createElement('img');
      img.src = iconoVehiculo(v.tipo);
      img.alt = '';
      const n = document.createElement('span');
      n.textContent = v.nombre;
      const nota = document.createElement('small');
      nota.textContent = v.nota;
      b.append(img, n, nota);
      b.addEventListener('click', () => this.alElegirVehiculo(v.tipo));
      cont.appendChild(b);
    }
    const bid = document.createElement('button');
    bid.type = 'button';
    bid.className = 'tarjetaVeh';
    const im = document.createElement('img');
    im.src = this.iconosObjeto.bidon;
    im.alt = '';
    im.style.cssText = 'width:56px;height:56px;image-rendering:pixelated';
    const n2 = document.createElement('span');
    n2.textContent = 'Bidón de combustible';
    const nota2 = document.createElement('small');
    nota2.textContent = 'Va a tu mochila. En un vehículo, T lo usa';
    bid.append(im, n2, nota2);
    bid.addEventListener('click', () => this.alElegirObjeto('bidon'));
    cont.appendChild(bid);
  }

  pestana(nombre) {
    this.pestanaActual = nombre;
    const v = nombre === 'vehiculos';
    this.el.rejilla.classList.toggle('oculto', v);
    this.el.rejillaVeh.classList.toggle('oculto', !v);
    this.el.pestBloques.classList.toggle('activa', !v);
    this.el.pestVehiculos.classList.toggle('activa', v);
    this.el.info.textContent = v ? 'Elige un vehículo: aparece frente a ti. Sube con E' : 'Elige un bloque para la ranura marcada de tu barra';
  }

  // Lista de lo que llevas (esquina de abajo a la izquierda)
  mochila(items) {
    const clave = JSON.stringify(items);
    if (clave === this.ultimaMochila) return;
    this.ultimaMochila = clave;
    const e = this.el.mochila;
    e.textContent = '';
    for (const k of LISTA_OBJETOS) {
      if (!items[k]) continue;
      const f = document.createElement('div');
      f.className = 'obj';
      const img = document.createElement('img');
      img.src = this.iconosObjeto[k];
      img.alt = '';
      const n = document.createElement('b');
      n.textContent = String(items[k]);
      const t = document.createElement('span');
      t.textContent = OBJETOS[k].nombre;
      f.append(img, n, t);
      e.appendChild(f);
    }
    e.classList.toggle('oculto', !e.childElementCount);
  }

  // Tablero del vehículo (null = se esconde)
  tablero(info) {
    const t = this.el.tablero;
    t.classList.toggle('oculto', !info);
    document.body.classList.toggle('enVehiculo', !!info);
    document.body.classList.toggle('vehAire', !!info && info.clase === 'aire');
    if (!info) return;
    this.el.tabVel.textContent = String(info.velocidad);
    this.el.tabComb.style.width = Math.round(Math.max(0, Math.min(1, info.combustible)) * 100) + '%';
    this.el.tabGasCaja.classList.toggle('oculto', info.clase !== 'aire');
    this.el.tabGas.style.width = Math.round(info.gas * 100) + '%';
    let texto = '';
    if (info.sinCombustible) texto = 'Sin combustible: T usa un bidón';
    else if (info.clase === 'aire') texto = 'Alt ' + info.altura + ' · W/S motor · ratón nariz y giro · C vista';
    else if (info.clase === 'riel') texto = 'W/S mover · A/D girar en cruces · E bajar';
    else texto = 'E bajar · C vista · L luces · Espacio freno';
    this.el.tabTexto.textContent = texto;
    this.el.tabTexto.classList.toggle('alerta', !!info.sinCombustible);
  }

  cercaVehiculo(si, texto = '') {
    document.body.classList.toggle('cercaVeh', si);
    const e = $('pistaVehiculo');
    if (!e) return;
    e.classList.toggle('visible', !!texto);
    if (texto && e.textContent !== texto) e.textContent = texto;
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
