export function reemplazarBot(m, i, nivel) { Object.assign(m.asientos[i], { tipo: 'bot', nivel, host: false }); }
