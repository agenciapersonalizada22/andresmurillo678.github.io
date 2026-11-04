// Arranque final: aplica ajustes guardados y deja todo listo.
(() => {
  Object.assign(window, { Ajustes, Panel, Sonido, Efectos, Lugares, Clima, Policia2, Economia, Historia, Logros, Telefono, Foto, Multi, Misiones, Armas, Radio, Entrada, HUD, Mundo, Util, CONFIG, J });
  Ajustes.aplicar();
  if (window.CIUDAD) { CIUDAD.Panel = Panel; CIUDAD.Ajustes = Ajustes; CIUDAD.Lugares = Lugares; CIUDAD.Clima = Clima; CIUDAD.Historia = Historia; CIUDAD.Economia = Economia; CIUDAD.Logros = Logros; CIUDAD.Foto = Foto; CIUDAD.Multi = Multi; }
})();
