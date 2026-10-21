// =============================================================
//  ✨  EFECTOS: humo, chispas, polvo, marcas de llantas, textos
//  flotantes ("¡Ay!") y las luces de la noche (faros y faroles).
// =============================================================
const Efectos = (() => {
  const particulas = [];
  const marcas = new Float32Array(700 * 4);   // buffer circular de segmentos
  let marcaIni = 0, marcaN = 0;
  const textos = [];
  const trazas = [];
  const MAX_PARTICULAS = 350;
  const MAX_MARCAS = 700;

  function agregar(p) {
    if (particulas.length >= MAX_PARTICULAS) particulas.shift();
    particulas.push(p);
  }

  // ----------------------------------------------------------- Partículas
  function humo(x, y, oscuro, tam) {
    const gris = Math.round(Util.mezclar(200, 50, oscuro || 0.5));
    agregar({
      tipo: 'humo', x, y,
      vx: Util.azar(-12, 12) + 10, vy: Util.azar(-30, -14),
      vida: 0, max: Util.azar(1.2, 2.1),
      tam: Util.azar(6, 10) * (tam || 1), crece: 16 * (tam || 1),
      color: `rgb(${gris},${gris},${gris})`,
    });
  }

  function chispas(x, y, n) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = Util.azar(80, 260);
      agregar({
        tipo: 'chispa', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        vida: 0, max: Util.azar(0.2, 0.45), tam: Util.azar(1.5, 3),
        color: Math.random() < 0.5 ? '#ffd23d' : '#ffffff',
      });
    }
  }

  function polvo(x, y) {
    agregar({
      tipo: 'humo', x, y, vx: Util.azar(-10, 10), vy: Util.azar(-10, 10),
      vida: 0, max: Util.azar(0.5, 0.9), tam: Util.azar(5, 8), crece: 20,
      color: 'rgb(210,210,215)',
    });
  }

  function confeti(x, y, n) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = Util.azar(60, 220);
      agregar({
        tipo: 'chispa', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        vida: 0, max: Util.azar(0.6, 1.1), tam: Util.azar(2.5, 4),
        color: Util.elegir(CONFIG.colores.neon),
      });
    }
  }

  function explosion(x, y, tam) {
    const k = Util.limitar((tam || 54) / 54, 0.7, 1.8);
    chispas(x, y, 16);
    for (let n = 0; n < 7; n++) {
      const a = Math.random() * Math.PI * 2, v = Util.azar(20, 90) * k;
      agregar({
        tipo: 'humo', x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        vida: 0, max: Util.azar(0.35, 0.7), tam: Util.azar(7, 12) * k, crece: 45 * k,
        color: n % 2 ? 'rgb(255,170,50)' : 'rgb(255,100,30)',
      });
    }
    for (let n = 0; n < 5; n++) humo(x + Util.azar(-10, 10), y + Util.azar(-10, 10), 0.9, 1.5 * k);
    J.sacudir(9 * k);
    Sonido.choque(1);
  }

  // Línea de un disparo (se apaga en un instante) y destello en la boca del arma
  function traza(x1, y1, x2, y2) {
    if (trazas.length > 24) trazas.shift();
    trazas.push({ x1, y1, x2, y2, vida: 0 });
    agregar({ tipo: 'chispa', x: x1, y: y1, vx: 0, vy: 0, vida: 0, max: 0.08, tam: 7, color: '#fff2a0' });
  }

  function marca(x1, y1, x2, y2) {
    const k = ((marcaIni + marcaN) % MAX_MARCAS) * 4;
    marcas[k] = x1; marcas[k + 1] = y1; marcas[k + 2] = x2; marcas[k + 3] = y2;
    if (marcaN < MAX_MARCAS) marcaN++;
    else marcaIni = (marcaIni + 1) % MAX_MARCAS;
  }

  function texto(x, y, txt, color, tam) {
    if (textos.length > 30) textos.shift();
    textos.push({ x, y, txt, color: color || '#fff', tam: tam || 14, vida: 0, max: 1.3 });
  }

  function actualizar(dt) {
    for (let k = particulas.length - 1; k >= 0; k--) {
      const p = particulas[k];
      p.vida += dt;
      if (p.vida >= p.max) { particulas.splice(k, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.tipo === 'humo') {
        p.tam += p.crece * dt;
        p.vx *= 0.98; p.vy *= 0.98;
      } else {
        p.vx *= 0.9; p.vy *= 0.9;
      }
    }
    for (let k = trazas.length - 1; k >= 0; k--) {
      trazas[k].vida += dt;
      if (trazas[k].vida > 0.09) trazas.splice(k, 1);
    }
    for (let k = textos.length - 1; k >= 0; k--) {
      const t = textos[k];
      t.vida += dt;
      t.y -= 26 * dt;
      if (t.vida >= t.max) textos.splice(k, 1);
    }
  }

  function dibujarMarcas(g, vista) {
    if (!marcaN) return;
    g.strokeStyle = 'rgba(15,15,18,0.38)';
    g.lineWidth = 5;
    g.lineCap = 'round';
    g.beginPath();
    for (let n = 0; n < marcaN; n++) {
      const k = ((marcaIni + n) % MAX_MARCAS) * 4;
      const x = marcas[k], y = marcas[k + 1];
      if (x < vista.x0 || x > vista.x1 || y < vista.y0 || y > vista.y1) continue;
      g.moveTo(x, y);
      g.lineTo(marcas[k + 2], marcas[k + 3]);
    }
    g.stroke();
    g.lineCap = 'butt';
  }

  function dibujarParticulas(g) {
    for (const p of particulas) {
      const t = p.vida / p.max;
      if (p.tipo === 'humo') {
        g.globalAlpha = (1 - t) * 0.55;
        g.fillStyle = p.color;
        g.beginPath(); g.arc(p.x, p.y, p.tam, 0, Math.PI * 2); g.fill();
      } else {
        g.globalAlpha = 1 - t;
        g.fillStyle = p.color;
        g.fillRect(p.x - p.tam / 2, p.y - p.tam / 2, p.tam, p.tam);
      }
    }
    g.globalAlpha = 1;
    if (trazas.length) {
      g.strokeStyle = '#fff2a0';
      g.lineWidth = 1.6;
      g.beginPath();
      for (const t of trazas) { g.moveTo(t.x1, t.y1); g.lineTo(t.x2, t.y2); }
      g.stroke();
    }
  }

  // Lluvia en coordenadas de pantalla (CSS px). Las gotas son fijas y solo se desplazan.
  const GOTAS = 230;
  const gotaX = new Float32Array(GOTAS), gotaY = new Float32Array(GOTAS), gotaV = new Float32Array(GOTAS);
  for (let k = 0; k < GOTAS; k++) { gotaX[k] = Math.random(); gotaY[k] = Math.random(); gotaV[k] = 1.1 + Math.random() * 0.9; }
  function dibujarLluvia(g, W, H, lluvia, t) {
    if (lluvia <= 0.02) return;
    g.fillStyle = `rgba(12,22,42,${0.3 * lluvia})`;
    g.fillRect(0, 0, W, H);
    const n = Math.round(GOTAS * Math.min(1, lluvia));
    const largo = 14 + lluvia * 10;
    g.strokeStyle = 'rgba(200,220,255,0.55)';
    g.lineWidth = 1.2;
    g.beginPath();
    for (let k = 0; k < n; k++) {
      const y = ((gotaY[k] + t * gotaV[k]) % 1) * (H + largo) - largo;
      const x = gotaX[k] * (W + 60) + y * 0.18 - 30;
      g.moveTo(x, y);
      g.lineTo(x - largo * 0.18, y + largo);
    }
    g.stroke();
  }

  function dibujarTextos(g, escala) {
    const s = 1 / Math.max(0.6, escala);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const t of textos) {
      const a = 1 - Math.max(0, (t.vida - t.max * 0.6) / (t.max * 0.4));
      g.globalAlpha = a;
      g.font = `800 ${Math.round(t.tam * s)}px ${FUENTE_TEXTO}`;
      g.lineWidth = 4 * s;
      g.strokeStyle = 'rgba(0,0,0,0.7)';
      g.strokeText(t.txt, t.x, t.y);
      g.fillStyle = t.color;
      g.fillText(t.txt, t.x, t.y);
    }
    g.globalAlpha = 1;
  }

  // ----------------------------------------------------------- Luces de noche
  // La oscuridad se pinta en un lienzo a media resolución y luego se le
  // "recortan" las luces (faros y faroles). Es barato y se ve bien.
  let mapaLuz = null;
  let gl = null;
  const cono = (() => {
    const c = Util.lienzo(256, 128);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(0, 64, 0, 0, 64, 256);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.6, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, 52); g.lineTo(256, 0); g.lineTo(256, 128); g.lineTo(0, 76);
    g.closePath();
    g.fill();
    return c;
  })();
  const brillo = (() => {
    const c = Util.lienzo(128, 128);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return c;
  })();
  function brilloDeColor(color) {
    const c = Util.lienzo(64, 64);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, color);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return c;
  }
  const brilloRojo = brilloDeColor('rgba(255,40,50,0.9)');
  const brilloAzul = brilloDeColor('rgba(50,110,255,0.95)');
  const brilloCalido = brilloDeColor('rgba(255,220,150,0.6)');

  // cam = { x, y, s, W, H } (W y H en pixeles reales del lienzo)
  function dibujarNoche(g, cam, noche, vista, tiempo) {
    if (noche <= 0.01) return;
    const W = Math.ceil(cam.W / 2), H = Math.ceil(cam.H / 2);
    if (!mapaLuz) { mapaLuz = Util.lienzo(W, H); gl = mapaLuz.getContext('2d'); }
    if (mapaLuz.width !== W || mapaLuz.height !== H) { mapaLuz.width = W; mapaLuz.height = H; }
    gl.setTransform(1, 0, 0, 1, 0, 0);
    gl.globalCompositeOperation = 'source-over';
    gl.globalAlpha = 1;
    gl.clearRect(0, 0, W, H);
    gl.fillStyle = `rgba(10,10,42,${CONFIG.dia.oscuridad * noche})`;
    gl.fillRect(0, 0, W, H);
    gl.globalCompositeOperation = 'destination-out';
    const s = cam.s / 2;
    gl.setTransform(s, 0, 0, s, -cam.x * s + W / 2, -cam.y * s + H / 2);
    gl.globalAlpha = 0.72;
    for (const l of Mundo.lamparas) {
      if (l.x < vista.x0 - 100 || l.x > vista.x1 + 100 || l.y < vista.y0 - 100 || l.y > vista.y1 + 100) continue;
      gl.drawImage(brillo, l.x - 90, l.y - 90, 180, 180);
    }
    for (const c of J.carros) {
      if (!c.lucesPrendidas) continue;
      if (c.x < vista.x0 - 300 || c.x > vista.x1 + 300 || c.y < vista.y0 - 300 || c.y > vista.y1 + 300) continue;
      gl.save();
      gl.translate(c.x, c.y);
      gl.rotate(c.ang);
      gl.globalAlpha = 0.95;
      gl.drawImage(cono, c.largo / 2 - 6, -62, 250, 124);
      gl.globalAlpha = 0.5;
      gl.drawImage(brillo, -c.largo, -c.largo, c.largo * 2, c.largo * 2);
      gl.restore();
    }
    const j = J.jugador;
    if (j && !j.carro && J.modo !== 'titulo') {
      gl.globalAlpha = 0.45;
      gl.drawImage(brillo, j.x - 70, j.y - 70, 140, 140);
    }
    gl.globalAlpha = 1;
    gl.globalCompositeOperation = 'source-over';

    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(mapaLuz, 0, 0, cam.W, cam.H);
    g.restore();

    Mundo.dibujarEmision(g, cam, noche);

    // Brillos de colores: calaveras, faros y torretas
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const c of J.carros) {
      if (c.x < vista.x0 - 100 || c.x > vista.x1 + 100 || c.y < vista.y0 - 100 || c.y > vista.y1 + 100) continue;
      const fx = Math.cos(c.ang), fy = Math.sin(c.ang);
      const px = -fy, py = fx;
      if (c.lucesPrendidas) {
        g.globalAlpha = noche * (c.frenando ? 0.9 : 0.5);
        for (const lado of [-1, 1]) {
          const x = c.x - fx * c.largo / 2 + px * lado * c.ancho * 0.32;
          const y = c.y - fy * c.largo / 2 + py * lado * c.ancho * 0.32;
          g.drawImage(brilloRojo, x - 14, y - 14, 28, 28);
        }
        g.globalAlpha = noche * 0.55;
        for (const lado of [-1, 1]) {
          const x = c.x + fx * c.largo / 2 + px * lado * c.ancho * 0.3;
          const y = c.y + fy * c.largo / 2 + py * lado * c.ancho * 0.3;
          g.drawImage(brilloCalido, x - 16, y - 16, 32, 32);
        }
      }
      if (c.emergencia && c.sirena) {
        const fase = Math.floor(tiempo * 8) % 2;
        g.globalAlpha = Math.max(0.35, noche);
        g.drawImage(fase ? (c.esPolicia ? brilloAzul : brilloCalido) : brilloRojo, c.x - 45, c.y - 45, 90, 90);
      }
    }
    g.restore();
  }

  return {
    humo, chispas, polvo, confeti, marca, texto, actualizar, explosion, traza, dibujarLluvia,
    dibujarMarcas, dibujarParticulas, dibujarTextos, dibujarNoche,
    limpiar() { particulas.length = 0; textos.length = 0; trazas.length = 0; marcaIni = 0; marcaN = 0; },
  };
})();
