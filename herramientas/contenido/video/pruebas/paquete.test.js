const { prueba, igual, cierto, fin } = require('./ayuda.js');
const P = require('../js/paquete.js'), M = require('../js/modelo.js');
(async () => {
  const p = M.nuevo({ nombre: 'Prueba áéí' }); p.medios.a = { id: 'a', tipo: 'audio', dur: 1 };
  const blobs = { a: new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: 'audio/wav' }), b: new Blob([new Uint8Array(1000).fill(7)], { type: 'video/webm' }) };
  const paq = P.empaquetar(p, blobs), r = await P.leer(paq);
  prueba('paquete: proyecto y medios intactos', () => { igual(r.proyecto.nombre, 'Prueba áéí'); igual(Object.keys(r.medios), ['a', 'b']); igual(r.medios.a.type, 'audio/wav'); });
  const a = new Uint8Array(await r.medios.a.arrayBuffer()), b2 = new Uint8Array(await r.medios.b.arrayBuffer());
  prueba('paquete: contenido binario exacto', () => { igual(Array.from(a), [1, 2, 3, 4, 5]); cierto(b2.length === 1000 && b2[999] === 7); });
  let err = null; try { await P.leer(new Blob([new Uint8Array(20)])); } catch (e) { err = e; }
  prueba('paquete: rechaza archivos no validos', () => cierto(err && /no válido/.test(err.message)));
  fin('paquete');
})();
