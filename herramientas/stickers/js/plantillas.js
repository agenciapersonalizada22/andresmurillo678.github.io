/* Plantillas de memes, etiquetas e insignias (capas editables). window.StPlantillas */
(function (g) {
  'use strict';
  const D = g.StDoc, R = g.StRender, P = g.StPlantillas = {};
  const F = R.FUENTES[0][0], F2 = R.FUENTES[1][0];
  const txt = (t, p) => D.capaNueva('texto', Object.assign({ nombre: 'Texto', texto: t, fuente: F, tam: 64, color: '#ffffff', cContorno: '#000000', contorno: 6, degradado: false, color2: '#ff3b6b', negrita: false, cursiva: false, curva: 0 }, p));
  const forma = (f, p) => D.capaNueva('forma', Object.assign({ nombre: 'Forma', forma: f, tam: 300, asp: 1, relleno: '#ff5c8a', trazo: '#ffffff', grosor: 8 }, p));
  P.lista = [
    { id: 'meme', nombre: 'Meme clásico', desc: 'Texto arriba y abajo en Impact con contorno.', crear: () => [txt('ARRIBA', { y: 70, nombre: 'Texto arriba' }), txt('ABAJO', { y: 442, nombre: 'Texto abajo' })] },
    { id: 'hola', nombre: 'Etiqueta «Hola, soy…»', desc: 'Etiqueta roja para presentarte.', crear: () => [forma('redondeado', { nombre: 'Etiqueta', tam: 400, asp: 1.4, relleno: '#e03131', trazo: '#ffffff', grosor: 8 }), txt('HOLA', { y: 215, tam: 80, contorno: 0, nombre: 'Hola' }), D.capaNueva('forma', { nombre: 'Banda', forma: 'redondeado', tam: 340, asp: 3.4, relleno: '#ffffff', trazo: '#ffffff', grosor: 0, y: 300 }), txt('soy ______', { y: 300, tam: 44, color: '#222222', contorno: 0, fuente: F2, nombre: 'Nombre' })] },
    { id: 'insignia', nombre: 'Insignia', desc: 'Medalla dorada con emoji y texto curvo.', crear: () => [forma('insignia', { nombre: 'Medalla', tam: 380, relleno: '#fab005', trazo: '#e67700', grosor: 10 }), forma('circulo', { nombre: 'Anillo', tam: 290, relleno: '#fff3bf', trazo: '#e67700', grosor: 6 }), D.capaNueva('emoji', { nombre: 'Emoji', texto: '🏆', tam: 150 }), txt('CAMPEÓN', { y: 256, tam: 46, color: '#7c2d12', contorno: 0, curva: 55, fuente: F2, nombre: 'Texto curvo' })] },
    { id: 'globo', nombre: 'Globo de diálogo', desc: 'Burbuja de cómic con texto.', crear: () => [forma('burbuja', { nombre: 'Globo', tam: 400, asp: 1.3, relleno: '#ffffff', trazo: '#212529', grosor: 10 }), txt('¡HOLA!', { tam: 72, color: '#e03131', cContorno: '#ffffff', contorno: 0, fuente: R.FUENTES[2][0], nombre: 'Texto', y: 240 })] },
    { id: 'reaccion', nombre: 'Reacción', desc: 'Emoji grande con frase.', crear: () => [D.capaNueva('emoji', { nombre: 'Emoji', texto: '😎', tam: 280, y: 220 }), txt('¡GENIAL!', { y: 420, tam: 80, nombre: 'Frase' })] },
    { id: 'holo', nombre: 'Texto holográfico', desc: 'Frase con degradado arcoíris curva.', crear: () => [txt('BRILLA', { tam: 110, degradado: true, color: '#ff6bd6', color2: '#4dabf7', curva: 40, contorno: 8, cContorno: '#ffffff', nombre: 'Texto holo' })] },
    { id: 'banner', nombre: 'Banner / cinta', desc: 'Cinta con texto centrado.', crear: () => [forma('redondeado', { nombre: 'Cinta', tam: 440, asp: 4, relleno: '#7048e8', trazo: '#ffffff', grosor: 8 }), txt('TU TEXTO', { tam: 62, contorno: 0, fuente: F2, nombre: 'Texto' })] },
    { id: 'estrellas', nombre: 'Marco de brillos', desc: 'Pegatinas decorativas alrededor.', crear: () => [D.capaNueva('pegatina', { nombre: 'Brillos', forma: 'brillos', tam: 480, relleno: '#ffd43b', semilla: 5 }), D.capaNueva('pegatina', { nombre: 'Corazones', forma: 'corazones', tam: 400, relleno: '#ff6b9d', semilla: 9 })] }
  ];
  P.aplicar = function (id) {
    const t = P.lista.find((x) => x.id === id); if (!t) return;
    D.cambio('Plantilla: ' + t.nombre, () => { const cs = t.crear(); cs.forEach((c) => D.capas.push(c)); D.sel = cs[cs.length - 1].id; });
  };
})(window);
