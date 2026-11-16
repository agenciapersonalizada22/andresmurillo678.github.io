/* IA OPCIONAL y EXPERIMENTAL: quitar fondo con un proveedor de imagen configurable y la clave del propio usuario.
   La foto se envia a ese tercero. La clave vive solo en este dispositivo (stickers_claves_dispositivo) y no se sincroniza. window.StIA */
(function (g) {
  'use strict';
  const Dt = g.StDatos, IA = g.StIA = {};
  IA.PROVEEDORES = [
    { id: 'removebg', nombre: 'remove.bg', url: 'https://api.remove.bg/v1.0/removebg', cabecera: 'X-Api-Key', campo: 'image_file', extra: { size: 'auto', format: 'png' } },
    { id: 'personalizado', nombre: 'Personalizado (URL propia)', url: '', cabecera: 'Authorization', campo: 'image', extra: {} }
  ];
  IA.config = () => Object.assign({ proveedor: 'removebg', url: '', cabecera: '', campo: '', clave: '', prefijo: '' }, (Dt.claves().ia) || {});
  IA.guardar = (c) => { const k = Dt.claves(); k.ia = c; Dt.ponerClaves(k); };
  IA.borrar = () => { const k = Dt.claves(); delete k.ia; Dt.ponerClaves(k); };
  IA.listo = () => { const c = IA.config(); return !!(c.clave && (c.url || c.proveedor === 'removebg')); };
  function buscarImagen(o) {   // en una respuesta JSON, busca una cadena base64 o data URL de imagen
    if (typeof o === 'string') return /^data:image\//.test(o) ? o : (o.length > 200 && /^[A-Za-z0-9+/=\r\n]+$/.test(o) ? 'data:image/png;base64,' + o : null);
    if (o && typeof o === 'object') for (const k in o) { const r = buscarImagen(o[k]); if (r) return r; } return null;
  }
  IA.quitarFondo = async function (canvas) {
    const c = IA.config(), p = IA.PROVEEDORES.find((x) => x.id === c.proveedor) || IA.PROVEEDORES[1], url = c.url || p.url, cab = c.cabecera || p.cabecera, campo = c.campo || p.campo;
    if (!url || !c.clave) throw new Error('Configura la URL y tu clave en Recorte > IA experimental.');
    const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png')), fd = new FormData(); fd.append(campo, blob, 'imagen.png'); Object.keys(p.extra || {}).forEach((k) => fd.append(k, p.extra[k]));
    const headers = {}; headers[cab] = (c.prefijo ? c.prefijo + ' ' : (cab.toLowerCase() === 'authorization' ? 'Bearer ' : '')) + c.clave;
    let r; try { r = await fetch(url, { method: 'POST', headers, body: fd }); } catch (e) { throw new Error('No se pudo contactar con el proveedor (red o CORS bloqueado por el navegador).'); }
    if (!r.ok) throw new Error('El proveedor respondió ' + r.status + '. Revisa la clave y el saldo.');
    const tipo = r.headers.get('content-type') || ''; let res;
    if (/^image\//.test(tipo)) res = await r.blob(); else { const j = await r.json(); const u = buscarImagen(j); if (!u) throw new Error('Respuesta sin imagen reconocible.'); res = Dt.dataURLaBlob(u); }
    const img = await Dt.blobAImagen(res), out = document.createElement('canvas'); out.width = canvas.width; out.height = canvas.height; out.getContext('2d').drawImage(img, 0, 0, out.width, out.height); return out;
  };
})(window);
