/* Los lienzos de trabajo leen pixeles con frecuencia: se crean con willReadFrequently (el lienzo visible .st-cv queda en GPU). */
(function () {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, o) { if (t === '2d' && !(this.classList && this.classList.contains('st-cv'))) o = Object.assign({ willReadFrequently: true }, o || {}); return orig.call(this, t, o); };
})();
