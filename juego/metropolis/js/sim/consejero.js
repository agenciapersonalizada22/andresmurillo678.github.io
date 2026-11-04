// Consejero: sugiere qué le falta a la ciudad según sus estadísticas.
import { ITEM } from './datos.js';

export function consejos(c) {
  const s = c.s, out = [], add = (nivel, txt, ir) => out.push({ nivel, txt, ir });
  if (!s) return out;
  const n = (id) => s.cuenta[id] || 0;
  if (c.dinero < 0) add('mal', 'Estás en números rojos. Sube impuestos o desactiva ordenanzas costosas.', 'politicas');
  else if (c.neto < 0 && c.t.dia > 3) add('aviso', 'Pierdes dinero cada día (' + Math.round(c.neto) + '). Revisa gastos o sube impuestos.', 'economia');
  if (s.ratioE < 0.98) add('mal', 'Falta electricidad: la red cubre el ' + Math.round(s.ratioE * 100) + '%. Construye más energía' + (c.tech.comext ? ' o importa.' : '.'), 'servicios');
  if (s.ratioA < 0.98) add('mal', 'Falta agua: red al ' + Math.round(s.ratioA * 100) + '%. Añade bombas o torres.', 'servicios');
  if (s.viasConectadas === 0 && s.edificios > 1) add('mal', 'Tus calles no tocan el Ayuntamiento, nada funciona sin conexión.');
  if (s.pop > 50 && s.empleoRatio < 0.8) add('aviso', 'Hay desempleo (' + Math.round((1 - s.empleoRatio) * 100) + '%). Crea zonas comerciales e industriales.');
  if (s.pop > 50 && s.empleos > s.trab * 1.5) add('idea', 'Sobran empleos: crea zonas residenciales para traer trabajadores.');
  if (s.cong > 0.7) add('aviso', 'Tráfico denso en ' + s.viasCong + ' calles. Prueba avenidas, paradas de bus o metro, o el transporte gratuito.', 'politicas');
  if (s.pop >= 80 && s.cob.bomb < 0.5) add('aviso', 'Pocos barrios con bomberos (' + Math.round(s.cob.bomb * 100) + '%). Construye una estación.');
  if (s.pop >= 80 && s.cob.poli < 0.5) add('aviso', 'Poca cobertura policial. El crimen sube con el desempleo.');
  if (s.crimen > 30) add('aviso', 'Crimen alto (' + Math.round(s.crimen) + '). Más comisarías, empleo y la ordenanza de patrullas lo reducen.', 'politicas');
  if (s.pop >= 120 && s.cob.salud < 0.5) add('aviso', 'Falta salud: construye una clínica u hospital.');
  if (s.pop >= 150 && s.cob.edu < 0.4) add('idea', 'Más escuelas permiten edificios más altos y más impuestos.');
  if (s.contamRes > 20) add('aviso', 'Contaminación alta (' + Math.round(s.contamRes) + '). Aleja la industria, planta parques o activa el reciclaje.', 'politicas');
  if (s.ruidoRes > 35) add('aviso', 'Mucho ruido en barrios residenciales. Aleja industria y estadios, o usa árboles y parques.');
  if (s.salud < 50) add('aviso', 'Salud ciudadana baja (' + s.salud + '). Riesgo de epidemias.');
  if (s.felicidad < 40) add('mal', 'Felicidad baja (' + s.felicidad + '). Mira parques, servicios, impuestos y empleo.');
  if (c.tech.comext && !c.com.impE && s.ratioE < 0.98) add('idea', 'Puedes importar energía para tapar el déficit (Ciudad > Comercio).', 'comercio');
  if (c.tech.comext && s.bienes > 20 && n('puerto') === 0 && s.exporta >= s.expCap * 0.95) add('idea', 'Tu exportación está al límite. Un puerto la triplica.');
  if (s.empI > 60 && c.espec === 'ninguna') add('idea', 'Especializa tu industria (Ciudad > Economía) para vender más caro.', 'economia');
  if (c.tier >= 1 && !c.tech.ingenieria && c.terr.some((t) => t === 1)) add('idea', 'Investiga Ingeniería civil para tender puentes sobre el agua.');
  if (s.pop > 300 && !n('refugio')) add('idea', 'Una Defensa civil reduce los daños de terremotos y tornados.');
  if (s.pop > 300 && !n('dique') && c.clima.lluvia > 6) add('aviso', 'Mucha lluvia: construye diques junto a la costa para evitar inundaciones.');
  if (s.danados > 0) add('mal', s.danados + ' edificios dañados. Repáralos desde Ciudad > Resumen.', 'resumen');
  if (c.puntos >= 3) add('idea', 'Tienes ' + c.puntos + ' puntos de mejora sin gastar. Abre Mejoras.');
  if (s.pop > 400 && n('hotel') === 0 && c.tier >= 1) add('idea', 'Un hotel atrae turistas y suma ingresos.');
  if (s.dem && c.dem.R > 0.5) add('idea', 'Hay mucha demanda residencial: zonifica más casas.');
  if (c.dem.C > 0.5) add('idea', 'Hay demanda comercial: abre tiendas.');
  if (c.dem.I > 0.5) add('idea', 'Hay demanda industrial: la industria da empleo.');
  if (!out.length) add('ok', 'Todo en orden. Sigue creciendo y fíjate nuevas metas en Objetivos.');
  const peso = { mal: 0, aviso: 1, idea: 2, ok: 3 };
  out.sort((a, b) => peso[a.nivel] - peso[b.nivel]);
  return out.slice(0, 8);
}
export { ITEM };
