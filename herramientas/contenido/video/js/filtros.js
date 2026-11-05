/* Looks (filtros) predefinidos: combinan parametros de color. VE.filtros */
(function (g) {
  var L = {
    ninguno: { nombre: 'Ninguno', aj: {} },
    vivido: { nombre: 'Vívido', aj: { contraste: 0.15, sat: 0.4 } },
    calido: { nombre: 'Cálido', aj: { temp: 0.45, sat: 0.1, brillo: 0.03 } },
    frio: { nombre: 'Frío', aj: { temp: -0.5, contraste: 0.05 } },
    bn: { nombre: 'Blanco y negro', aj: { bn: 1, contraste: 0.15 } },
    sepia: { nombre: 'Sepia', aj: { sepia: 1, contraste: 0.05 } },
    vintage: { nombre: 'Vintage', aj: { sepia: 0.35, sat: -0.2, contraste: -0.1, vineta: 0.5, temp: 0.2 } },
    cine: { nombre: 'Cine', aj: { contraste: 0.25, sat: -0.12, temp: -0.15, vineta: 0.45 } },
    drama: { nombre: 'Dramático', aj: { contraste: 0.45, sat: -0.25, vineta: 0.6, brillo: -0.05 } },
    vhs: { nombre: 'Retro VHS', aj: { vhs: 1, sat: 0.25, contraste: 0.1 } },
    neon: { nombre: 'Neón', aj: { contraste: 0.35, sat: 0.9, brillo: -0.03 } },
    lavado: { nombre: 'Lavado', aj: { brillo: 0.1, sat: -0.45, contraste: -0.2 } },
    noche: { nombre: 'Noche', aj: { brillo: -0.12, temp: -0.35, contraste: 0.2, vineta: 0.5 } }
  };
  var CLAVES = ['brillo', 'contraste', 'sat', 'temp', 'vineta', 'bn', 'sepia', 'vhs'];
  /* parametros efectivos = filtro + ajustes manuales del clip */
  function efectivos(c) {
    var f = (L[c.filtro] || L.ninguno).aj, a = c.aj || {}, r = {};
    CLAVES.forEach(function (k) { r[k] = (f[k] || 0) + (a[k] || 0); });
    ['bn', 'sepia', 'vineta', 'vhs'].forEach(function (k) { r[k] = Math.max(0, Math.min(1, r[k])); });
    ['brillo', 'contraste', 'sat', 'temp'].forEach(function (k) { r[k] = Math.max(-1, Math.min(1.5, r[k])); });
    return r;
  }
  function hayEfectos(c) {
    var r = efectivos(c);
    return CLAVES.some(function (k) { return Math.abs(r[k]) > 0.001; }) || !!(c.croma && c.croma.on);
  }
  g.VE = g.VE || {}; g.VE.filtros = { LISTA: L, efectivos: efectivos, hayEfectos: hayEfectos };
  if (typeof module !== 'undefined') module.exports = g.VE.filtros;
})(typeof window !== 'undefined' ? window : globalThis);
