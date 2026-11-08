import { lanzar } from './lib.mjs';
const b = await lanzar(); const p = await b.newPage({ viewport: { width: 500, height: 200 } });
await p.setContent('<body style="font-size:34px;background:#fff">🛂 📕 🗺 🧳 🎫 ✈ 🚆 🚢 ☀ 🌧 ✊ ⛈ 🏷 🎉 🛃 🏨 🏛 📘 🔖 🌍</body>');
await p.screenshot({ path: process.argv[2] + '/em.png' }); await b.close();
