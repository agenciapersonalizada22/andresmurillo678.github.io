/* Tamanos de redes sociales y zonas seguras (fracciones del lienzo). */
(function (r, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else r.Redes = f(); })(this, function () {
  var L = [
    { id: 'yt', nombre: 'YouTube miniatura', w: 1280, h: 720, seguro: [{ x: 0.82, y: 0.86, w: 0.17, h: 0.12, n: 'Duracion' }] },
    { id: 'yt-banner', nombre: 'Banner de canal', w: 2560, h: 1440, seguro: [{ x: 0.17, y: 0.38, w: 0.66, h: 0.24, n: 'Zona segura (todos los dispositivos)', inv: true }] },
    { id: 'ig-cuadrado', nombre: 'Instagram cuadrado', w: 1080, h: 1080 },
    { id: 'ig-vertical', nombre: 'Instagram vertical 4:5', w: 1080, h: 1350 },
    { id: 'ig-historia', nombre: 'Historia / Reel 9:16', w: 1080, h: 1920, seguro: [{ x: 0, y: 0, w: 1, h: 0.13, n: 'Barra superior' }, { x: 0, y: 0.87, w: 1, h: 0.13, n: 'Respuesta / botones' }] },
    { id: 'tiktok', nombre: 'TikTok 9:16', w: 1080, h: 1920, seguro: [{ x: 0, y: 0, w: 1, h: 0.1, n: 'Superior' }, { x: 0, y: 0.78, w: 1, h: 0.22, n: 'Descripcion' }, { x: 0.84, y: 0.45, w: 0.16, h: 0.33, n: 'Botones' }] },
    { id: 'x-post', nombre: 'X / Twitter publicacion', w: 1600, h: 900 },
    { id: 'x-cabecera', nombre: 'X / Twitter cabecera', w: 1500, h: 500 },
    { id: 'fb-post', nombre: 'Facebook publicacion', w: 1200, h: 630 },
    { id: 'fb-portada', nombre: 'Facebook portada', w: 1640, h: 624 },
    { id: 'in-post', nombre: 'LinkedIn publicacion', w: 1200, h: 627 },
    { id: 'in-banner', nombre: 'LinkedIn banner', w: 1584, h: 396 },
    { id: 'pin', nombre: 'Pinterest 2:3', w: 1000, h: 1500 },
    { id: 'podcast', nombre: 'Portada de podcast', w: 3000, h: 3000 },
    { id: 'favicon', nombre: 'Favicon', w: 512, h: 512 },
    { id: 'a4', nombre: 'Hoja A4 (150 ppp)', w: 1240, h: 1754 },
    { id: 'libre', nombre: 'Personalizado', w: 1000, h: 1000 }
  ];
  return { lista: L, buscar: function (id) { for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; } };
});
