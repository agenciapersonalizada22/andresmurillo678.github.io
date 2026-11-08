// Estado compartido entre modulos (un unico objeto) y utilidades de red.
export const G = {
  aj: null, prog: null, I: null, escena: null, camara: null, render: null, luz: null, W: { mundo: null, constr: null }, botin: null, ef: null, balas: null, pers: null, hud: null,
  ents: [], porId: {}, yo: null, P: null, alTerminar: null, cuenta: null
};
export const enRed = () => !!(window.Red && window.Red.conectado);
export const esAnfitrion = () => !enRed() || window.Red.esAnfitrion;
export const miIdRed = () => (enRed() ? window.Red.miId : 0);
export function difundir(tipo, datos, fiable = true) { if (enRed()) window.Red.difundir(tipo, datos, { fiable }); }
