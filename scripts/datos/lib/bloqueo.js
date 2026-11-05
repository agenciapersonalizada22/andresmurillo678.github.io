'use strict';
const { dominio } = require('./util');

function esBloqueado(urlOHost, lista) {
  const h = urlOHost.includes('/') ? dominio(urlOHost) : urlOHost.toLowerCase().replace(/^www\./, '');
  if (!h) return true;
  return (lista || []).some((e) => {
    e = e.toLowerCase();
    if (e.endsWith('.*')) {
      const raiz = e.slice(0, -2).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|\\.)${raiz}\\.[a-z.]{2,}$`).test(h);
    }
    return h === e || h.endsWith('.' + e);
  });
}
module.exports = { esBloqueado };
