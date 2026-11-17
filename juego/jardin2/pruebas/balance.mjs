import { jugar } from './bot.mjs'; import { nivelAventura } from '../js/niveles.js';
const mundos = +process.argv[2] || 3; let tot = 0, vic = 0;
for (let m = 0; m < mundos; m++) { let l = ''; for (let n = 1; n <= 12; n++) { const hechos = m * 12 + n - 1; const r = jugar(nivelAventura(m, n), { hechos, slots: 6 + (m > 0 ? 1 : 0) }); tot++; if (r.fin === 'victoria') vic++; l += (r.fin === 'victoria' ? 'V' : 'x') + r.perdidas + ' '; } console.log('mundo', m + 1, l); }
console.log(vic + '/' + tot);
